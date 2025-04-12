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
    private readonly _context: vscode.ExtensionContext;

    private static _instance: ChatPanel | undefined;

    public static getInstance(extensionUri: vscode.Uri, context: vscode.ExtensionContext): ChatPanel {
        if (!ChatPanel._instance) {
            ChatPanel._instance = new ChatPanel(extensionUri, context);
        }
        return ChatPanel._instance;
    }

    private constructor(private readonly _extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._context = context;
        this._chatService = new ChatService();

        // Load conversation history from global state
        const savedHistory = this._context.globalState.get<Message[]>('claudeChatHistory', []);
        this._conversationHistory = savedHistory;

        this._panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            'Claude Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(_extensionUri, 'media', 'build')
                ],
                retainContextWhenHidden: true
            }
        );

        this._panel.webview.html = getWebviewContent(this._panel.webview, this._extensionUri);

        // Handle messages from webview
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
                    case 'restoreHistory':
                        // Send all messages in history to webview
                        this._conversationHistory.forEach((msg, index) => {
                            let text: string;
                            if (typeof msg.content === 'string') {
                                text = msg.content;
                            } else {
                                text = msg.content
                                    .map(block => {
                                        if (block.type === 'text') return block.text;
                                        if (block.type === 'tool_use') return `[Tool: ${block.name}]`;
                                        if (block.type === 'tool_result') return block.content;
                                        return '';
                                    })
                                    .filter(Boolean)
                                    .join('\n');
                            }
                            this._panel.webview.postMessage({
                                command: msg.role === 'user' ? 'addUserMessage' : 'addAssistantMessage',
                                text,
                                messageId: index // Unique ID to track messages
                            });
                        });
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
            this._updateGlobalState();

            // Post user message to UI
            this._panel.webview.postMessage({
                command: 'addUserMessage',
                text,
                messageId: this._conversationHistory.length - 1
            });

            let isProcessingTools = true;
            while (isProcessingTools) {
                const stream = await this._chatService.createMessageStream(this._conversationHistory, fileTools);

                this._panel.webview.postMessage({
                    command: 'startAssistantResponse',
                    messageId: this._conversationHistory.length
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
                    } else if (chunk.type === 'content_block_delta' && currentBlock !== null) {
                        if (currentBlock.type === 'text' && chunk.delta.type === 'text_delta') {
                            (currentBlock as Partial<TextBlock>).text += chunk.delta.text;
                            this._panel.webview.postMessage({
                                command: 'appendAssistantResponse',
                                text: chunk.delta.text,
                                messageId: this._conversationHistory.length
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
                        break;
                    }
                }

                // Add assistant message to history
                this._conversationHistory.push({ role: 'assistant', content: assistantContent });
                this._updateGlobalState();

                // Convert assistantContent to string for webview
                const assistantText = assistantContent
                    .map(block => {
                        if (block.type === 'text') return block.text;
                        if (block.type === 'tool_use') return `[Tool: ${block.name}]`;
                        return '';
                    })
                    .filter(Boolean)
                    .join('\n');

                this._panel.webview.postMessage({
                    command: 'addAssistantMessage',
                    text: assistantText,
                    messageId: this._conversationHistory.length - 1
                });

                const toolUseBlocks = assistantContent.filter(block => block.type === 'tool_use') as ToolUseBlock[];
                if (toolUseBlocks.length > 0) {
                    const toolResults: ToolResultBlock[] = await Promise.all(toolUseBlocks.map(async (block) => {
                        try {
                            const result = await executeTool(block.name, block.input);
                            return { type: 'tool_result', tool_use_id: block.id, content: result };
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            return { type: 'tool_result', tool_use_id: block.id, content: `Error: ${errorMessage}` };
                        }
                    }));

                    this._conversationHistory.push({ role: 'user', content: toolResults });
                    this._updateGlobalState();
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
        this._updateGlobalState();
        this._panel.webview.postMessage({
            command: 'clearChat'
        });
    }

    private _updateGlobalState() {
        this._context.globalState.update('claudeChatHistory', this._conversationHistory);
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