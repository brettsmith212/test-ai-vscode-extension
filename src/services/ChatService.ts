import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { Message, ContentBlock } from '../types';
import { searchFiles } from '../tools/fileTools';

export class ChatService {
  private _messages: Message[] = [];
  private anthropic: Anthropic | undefined;

  constructor() {
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
    const message: Message = {
      role: 'user',
      content: userMessage
    };
    this._messages.push(message);

    const response = await this._getChatResponse(userMessage);
    this._messages.push(response);

    return response;
  }

  private async _getChatResponse(userMessage: string): Promise<Message> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized. Please check API key.');
    }

    const lowercaseMessage = userMessage.toLowerCase();

    // Handle file search explicitly
    if (lowercaseMessage.includes('find files') || lowercaseMessage.includes('search files')) {
      const searchTerm = this._extractSearchTerm(userMessage);
      if (searchTerm) {
        try {
          const files = await searchFiles(searchTerm);
          return {
            role: 'assistant',
            content: files.length > 0
              ? `Found these files matching "${searchTerm}":\n\n${files.join('\n')}`
              : `No files found matching "${searchTerm}".`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            role: 'assistant',
            content: `Error searching files: ${errorMessage}`
          };
        }
      }
    }

    // For general queries, use Claude's knowledge base
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: userMessage }],
      });

      const content = response.content
        .map(block => block.type === 'text' ? block.text : '')
        .filter(Boolean)
        .join('\n');

      return {
        role: 'assistant',
        content
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        role: 'assistant',
        content: `Error processing request: ${errorMessage}`
      };
    }
  }

  private _extractSearchTerm(message: string): string | null {
    const match = message.match(/(?:find|search)\s+files\s+(?:with|containing|for)\s+(.*?)(?:$|\s+and)/i);
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

    const systemPrompt = `
You are Claude, an AI assistant created by Anthropic, integrated into a VS Code extension. Your role is to:
1. Answer general knowledge questions concisely and accurately.
2. Assist with coding tasks by providing explanations, writing code, debugging, or answering programming questions.
3. Use available tools (e.g., file operations) only when explicitly requested (e.g., "create a file", "delete main.ts") or when a coding task clearly requires file manipulation.
4. When using tools, do not describe the process or mention the tool name unless asked. Simply perform the action and report the result (e.g., "File deleted." instead of "Using delete_file tool to delete main.ts").
5. When reading files to answer questions (e.g., "What does main.ts do?"), analyze the content silently and provide only the relevant answer without displaying the file contents unless explicitly requested (e.g., "Show me main.ts").
6. If a request is ambiguous, ask for clarification.

When responding:
- Focus on the result or answer, not the steps taken.
- For file operations, report only the outcome (e.g., "File main.ts updated.") unless the user asks for details.
- For general or coding questions, provide clear, concise, and accurate responses.
- Avoid unnecessary narration about tool usage or intermediate steps.

Current workspace context: You are in a VS Code environment with access to file tools.
`.trim();

    return await this.anthropic!.messages.create({
      messages,
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      stream: true,
      tools,
      system: systemPrompt
    });
  }
}