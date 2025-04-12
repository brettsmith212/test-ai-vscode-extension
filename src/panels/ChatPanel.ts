import * as vscode from 'vscode';
import { ChatService } from '../services/ChatService';
import { getWebviewContent } from '../views/webview-content';
import { Message, ContentBlock, TextBlock, ToolUseBlock, ToolResultBlock, WebviewMessage } from '../types';
import { fileTools, executeTool } from '../tools/fileTools';

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

            let isProcessingTools = true;
            while (isProcessingTools) {
                // Create message stream with tools
                const stream = await this._chatService.createMessageStream(this._conversationHistory, fileTools);

                // Initialize assistant response container
                this._panel.webview.postMessage({
                    command: 'startAssistantResponse'
                });

                let assistantContent: ContentBlock[] = [];
                let currentBlock: Partial<TextBlock | ToolUseBlock> | null = null;
                let jsonAccumulator: string = '';

                for await (const chunk of stream) {
                    if (chunk.type === 'content_block_start') {
                        if (chunk.content_block.type === 'text' || chunk.content_block.type === 'tool_use') {
                            currentBlock = { type: chunk.content_block.type };

                            if (chunk.content_block.type === 'text') {
                                (currentBlock as Partial<TextBlock>).text = '';
                            } else if (chunk.content_block.type === 'tool_use') {
                                (currentBlock as Partial<ToolUseBlock>).id = chunk.content_block.id;
                                (currentBlock as Partial<ToolUseBlock>).name = chunk.content_block.name;
                                jsonAccumulator = '';
                            }
                        }
                        // Ignore other block types
                    } else if (chunk.type === 'content_block_delta' && currentBlock !== null) {
                        if (currentBlock.type === 'text' && chunk.delta.type === 'text_delta') {
                            (currentBlock as Partial<TextBlock>).text += chunk.delta.text;
                            // Stream text to UI
                            this._panel.webview.postMessage({
                                command: 'appendAssistantResponse',
                                text: chunk.delta.text
                            });
                        } else if (currentBlock.type === 'tool_use' && chunk.delta.type === 'input_json_delta') {
                            jsonAccumulator += chunk.delta.partial_json;
                        }
                    } else if (chunk.type === 'content_block_stop') {
                        if (currentBlock !== null) {
                            if (currentBlock.type === 'text') {
                                assistantContent.push(currentBlock as TextBlock);
                            } else if (currentBlock.type === 'tool_use') {
                                try {
                                    (currentBlock as Partial<ToolUseBlock>).input = jsonAccumulator ? JSON.parse(jsonAccumulator) : {};
                                    assistantContent.push(currentBlock as ToolUseBlock);
                                } catch (error) {
                                    const errorMessage = error instanceof Error ? error.message : String(error);
                                    assistantContent.push({
                                        type: 'text',
                                        text: `Error parsing tool input: ${errorMessage}`
                                    });
                                }
                            }
                            currentBlock = null;
                            jsonAccumulator = '';
                        }
                    } else if (chunk.type === 'message_stop') {
                        // Message is complete
                        break;
                    }
                }

                // Add assistant message to history
                this._conversationHistory.push({ role: 'assistant', content: assistantContent });

                // Complete the current assistant response in UI
                this._panel.webview.postMessage({
                    command: 'completeAssistantResponse'
                });

                // Check for tool use blocks
                const toolUseBlocks = assistantContent.filter(block => block.type === 'tool_use') as ToolUseBlock[];
                if (toolUseBlocks.length > 0) {
                    // Execute tools
                    const toolResults: ToolResultBlock[] = await Promise.all(toolUseBlocks.map(async (block) => {
                        try {
                            const result = await executeTool(block.name, block.input);
                            return { type: 'tool_result', tool_use_id: block.id, content: result };
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            return { type: 'tool_result', tool_use_id: block.id, content: `Error: ${errorMessage}` };
                        }
                    }));

                    // Add tool results to history
                    this._conversationHistory.push({ role: 'user', content: toolResults });
                } else {
                    isProcessingTools = false;
                }
            }

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