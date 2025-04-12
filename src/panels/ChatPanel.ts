import * as vscode from 'vscode';
import { ChatService } from '../services/ChatService';
import { getWebviewContent } from '../views/webview-content';
import { Message, WebviewMessage } from '../types';

export class ChatPanel {
    public static readonly viewType = 'claudeChat';
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _conversationHistory: Message[] = [];
    private _chatService: ChatService;

    private static _instance: ChatPanel | undefined;

    public static getInstance(extensionUri: vscode.Uri): ChatPanel {
        if (!ChatPanel._instance) {
            ChatPanel._instance = new ChatPanel(extensionUri);
        }
        return ChatPanel._instance;
    }

    private constructor(private readonly _extensionUri: vscode.Uri) {
        this._chatService = new ChatService();

        this._panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            'Claude Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(_extensionUri, 'media', 'build')
                ]
            }
        );

        this._panel.webview.html = getWebviewContent(this._panel.webview, this._extensionUri);

        this._panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.command) {
                    case 'sendMessage':
                        if (message.text) {
                            await this._handleSendMessage(message.text);
                        }
                        break;
                    case 'newThread':
                        this._startNewThread();
                        break;
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(
            () => {
                ChatPanel._instance = undefined;
                this.dispose();
            },
            null,
            this._disposables
        );
    }

    private async _handleSendMessage(text: string) {
        try {
            // Add user message to history
            this._conversationHistory.push({ role: 'user', content: text });

            // Post initial user message to UI
            this._panel.webview.postMessage({
                command: 'addUserMessage',
                text: text
            });

            // Initialize assistant response container
            this._panel.webview.postMessage({
                command: 'startAssistantResponse'
            });

            let assistantResponse = '';

            try {
                // Create message stream
                const stream = await this._chatService.createMessageStream(this._conversationHistory);

                // Process the stream
                for await (const chunk of stream) {
                    if (chunk.type === 'content_block_delta' &&
                        'text' in chunk.delta &&
                        typeof chunk.delta.text === 'string') {
                        assistantResponse += chunk.delta.text;
                        this._panel.webview.postMessage({
                            command: 'appendAssistantResponse',
                            text: chunk.delta.text
                        });
                    }
                }

                // Add assistant response to history
                this._conversationHistory.push({ role: 'assistant', content: assistantResponse });

            } catch (error) {
                throw error;
            }

            // Mark the response as complete
            this._panel.webview.postMessage({
                command: 'completeAssistantResponse'
            });

        } catch (error) {
            console.error('Error:', error);
            this._panel.webview.postMessage({
                command: 'error',
                text: error instanceof Error ? error.message : 'An error occurred while processing your request.'
            });
        }
    }

    private _startNewThread() {
        this._conversationHistory = [];
        this._panel.webview.postMessage({
            command: 'clearChat'
        });
    }

    public reveal() {
        this._panel.reveal();
    }

    public dispose() {
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}