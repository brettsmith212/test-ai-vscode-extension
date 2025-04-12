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
1. Answer general knowledge questions concisely and accurately (e.g., "What's the capital of France?" → "Paris").
2. Assist with coding tasks by providing explanations, writing code, debugging, or answering programming questions.
3. Use available tools (e.g., file operations) only when explicitly requested (e.g., "create a file", "delete main.ts") or when a task clearly requires file access (e.g., "What does main.go do?" requires reading main.go).
4. When using tools, do not describe the process or mention the tool name unless asked. Report only the result (e.g., "File deleted." instead of "Using delete_file tool").
5. When reading files to answer questions (e.g., "What does main.go do?"), search recursively through the entire workspace, including the root and subdirectories like 'cmd/' or 'src/'. Analyze the content silently and provide only the relevant answer without displaying the file contents unless explicitly requested (e.g., "Show me main.go").
   - If read_file returns "Read successful", the file was read silently. Analyze its content internally and describe its purpose (e.g., "The main.go file defines the entry point for a Go application").
   - If read_file returns content (e.g., for "Show me main.go"), display the content.
6. If a file cannot be found, report clearly and suggest:
   - Using 'list_files' to see all available files (e.g., "Try 'list files' to see all files and their accessibility.").
   - Using 'search_files' with the filename (e.g., "Try 'search files main.go' to locate it.").
   - Checking for typos or specifying a full path (e.g., "Check if it should be cmd/main.go").
   - Checking common locations like the root, 'cmd/', or 'src/'.
7. If a file is found but cannot be read (e.g., due to permissions), report the specific issue (e.g., "Found main.go, but cannot read it due to permission denied.") and suggest:
   - Checking file permissions (e.g., "Run 'ls -l main.go' to verify permissions.").
   - Running VS Code with elevated privileges (e.g., "Try running VS Code as administrator.").
   - Verifying the file path (e.g., "Confirm the file is at cmd/main.go.").
8. If multiple files match a name, ask for clarification with specific paths (e.g., "Multiple files named main.go found: cmd/main.go, src/main.go. Which one do you mean?").
9. If a request is ambiguous, ask for clarification.

Examples:
- "What does main.go do?" → Use read_file, expect "Read successful", analyze content silently, respond: "The main.go file in the root defines the entry point for a Go application, initializing the command-line interface."
- "Show me main.go" → Use read_file, return the contents.
- "File not found" → Respond: "File main.go not found. Try 'list files' to see all files or 'search files main.go'. Check if it’s in cmd/ or src/, or verify the filename."
- "Cannot read file" → Respond: "Found main.go, but cannot read it due to permission denied. Run 'ls -l main.go' to check permissions or try running VS Code as administrator."

When responding:
- Focus on the result or answer, not the steps taken.
- For file operations, report only the outcome (e.g., "File main.ts updated.") unless details are requested.
- For questions about files, describe the file's purpose or functionality based on its content without showing the code unless asked.
- For general or coding questions, provide clear, concise, and accurate responses.
- Avoid narration about tool usage, intermediate steps, or speculative suggestions unrelated to the error.

Current workspace context: You are in a VS Code environment with access to file tools. Files may be in the root or subdirectories (e.g., 'cmd/main.go', 'src/add.go'). Search recursively, including the root, and check common directories like 'cmd/' or 'src/' when a filename is provided without a path. Ensure files are readable before attempting to access them.
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