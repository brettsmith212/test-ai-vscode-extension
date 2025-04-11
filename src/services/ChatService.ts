import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../types';

export class ChatService {
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

    public async createMessageStream(messages: Message[]) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API key not found. Please set ANTHROPIC_API_KEY environment variable or configure it in VSCode settings.');
        }

        if (!this.anthropic) {
            this.initializeClient();
        }

        return await this.anthropic!.messages.create({
            messages,
            model: 'claude-3-opus-20240229',
            max_tokens: 4096,
            stream: true
        });
    }
}
