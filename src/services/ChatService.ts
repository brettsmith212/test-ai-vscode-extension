import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { Message, ContentBlock } from '../types';
import { searchFiles } from '../tools/fileTools';

export class ChatService {
  private _messages: Message[] = [];
  private anthropic: Anthropic | undefined;

  constructor() {
    // Initialize with a system message as the first user message
    this._messages.push({
      role: 'user',
      content: 'You are Claude, an AI assistant by Anthropic. You are helping with coding tasks in VSCode.'
    });

    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = this.getApiKey();
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  private getApiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY ||
           vscode.workspace.getConfiguration('claudeChat').get<string>('apiKey');
  }

  public async sendMessage(userMessage: string): Promise<Message> {
    // Add user message to history
    const message: Message = {
      role: 'user',
      content: userMessage
    };
    this._messages.push(message);

    // Make request to Claude API
    const response = await this._getChatResponse();
    this._messages.push(response);

    return response;
  }

  private async _getChatResponse(): Promise<Message> {
    // This would be replaced with actual API call to Claude
    // For now, just return a mock response

    // Check if the message involves file search
    const lastMessage = this._messages[this._messages.length - 1];
    const lastMessageContent = lastMessage.content;

    if (typeof lastMessageContent === 'string' && lastMessageContent.toLowerCase().includes('find files')) {
      // Extract search term (this is a simplistic approach)
      const searchTerm = this._extractSearchTerm(lastMessageContent);
      if (searchTerm) {
        try {
          const files = await searchFiles(searchTerm);
          return {
            role: 'assistant',
            content: `I found these files matching "${searchTerm}":\n\n${files.join('\n')}`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            role: 'assistant',
            content: `Sorry, I encountered an error while searching for files: ${errorMessage}`
          };
        }
      }
    }

    // Default response if no special handling
    return {
      role: 'assistant',
      content: 'I understand your request. How can I help further with your coding task?'
    };
  }

  private _extractSearchTerm(message: string): string | null {
    // Very basic extraction - would be better with NLP
    const match = message.match(/find files (?:with|containing) (.*)/i);
    return match ? match[1].trim() : null;
  }

  public getMessages(): Message[] {
    return this._messages;
  }

  public async createMessageStream(messages: Message[], tools: Anthropic.Tool[]) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API key not found. Please set ANTHROPIC_API_KEY environment variable or configure it in VSCode settings.');
    }

    if (!this.anthropic) {
      this.initializeClient();
    }

    return await this.anthropic!.messages.create({
      messages,
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      stream: true,
      tools,
    });
  }
}