import * as vscode from 'vscode';
import * as path from 'path';
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

        // Initialize with empty conversation history (removed loading from globalState)
        this._conversationHistory = [];

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
                    case 'cancelMessage':
                        this._cancelCurrentMessage();
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
                                        if (block.type === 'tool_result') return block.content;
                                        return '';
                                    })
                                    .filter(Boolean)
                                    .join('\n');
                            }
                            if (text) {
                                this._panel.webview.postMessage({
                                    command: msg.role === 'user' ? 'addUserMessage' : 'addAssistantMessage',
                                    text,
                                    messageId: index
                                });
                            }
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
            // No need to update global state anymore

            // Post user message to UI
            this._panel.webview.postMessage({
                command: 'addUserMessage',
                text,
                messageId: this._conversationHistory.length - 1
            });

            let iterationCount = 0;
            const maxIterations = 10;
            let isProcessingTools = true;
            while (isProcessingTools && iterationCount < maxIterations) {
                iterationCount++;
                try {
                    const stream = await this._chatService.createMessageStream(this._conversationHistory, fileTools);

                    this._panel.webview.postMessage({
                        command: 'startAssistantResponse',
                        messageId: this._conversationHistory.length
                    });

                    let assistantContent: ContentBlock[] = [];
                    let currentBlock: Partial<TextBlock | ToolUseBlock> | null = null;
                    let jsonAccumulator: string = '';
                    let fileContents: { [toolUseId: string]: string } = {};

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

                    // Only add the assistant message to history if it has content
                    if (assistantContent.length > 0) {
                        this._conversationHistory.push({ role: 'assistant', content: assistantContent });
                    }

                    // Only send text content to webview, skip tool use narration
                    const assistantText = assistantContent
                        .filter(block => block.type === 'text')
                        .map(block => (block as TextBlock).text)
                        .filter(Boolean)
                        .join('\n');

                    if (assistantText) {
                        this._panel.webview.postMessage({
                            command: 'addAssistantMessage',
                            text: assistantText,
                            messageId: this._conversationHistory.length - 1
                        });
                    }

                    const toolUseBlocks = assistantContent.filter(block => block.type === 'tool_use') as ToolUseBlock[];
                    if (toolUseBlocks.length > 0) {
                        console.log(`Processing tool uses:`, toolUseBlocks.map(b => b.name));
                        const toolResults: ToolResultBlock[] = await Promise.all(toolUseBlocks.map(async (block) => {
                            try {
                                console.log(`Executing tool: ${block.name} with input:`, block.input);
                                const showContents = block.name === 'read_file' && text.toLowerCase().includes('show me the contents');
                                const result = await executeTool(block.name, block.input, showContents);
                                console.log(`Tool result for ${block.id}:`, result);
                                // Store file content for read_file if not showing contents
                                if (block.name === 'read_file' && !showContents) {
                                    try {
                                        const uri = vscode.Uri.file(path.join(
                                            vscode.workspace.workspaceFolders![0].uri.fsPath,
                                            block.input.path
                                        ));
                                        const fileData = await vscode.workspace.fs.readFile(uri);
                                        fileContents[block.id] = new TextDecoder().decode(fileData);
                                        console.log(`handleSendMessage: Stored content for ${block.input.path}, length: ${fileContents[block.id].length}`);
                                    } catch (readError) {
                                        console.error(`handleSendMessage: Failed to store content for ${block.input.path}:`, readError);
                                    }
                                }
                                return { type: 'tool_result', tool_use_id: block.id, content: result };
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                console.log(`handleSendMessage: Tool ${block.name} error for tool_use_id ${block.id}: ${errorMessage}`);
                                return { type: 'tool_result', tool_use_id: block.id, content: `Error: ${errorMessage}` };
                            }
                        }));

                        // Append file contents to history for Claude to analyze
                        if (Object.keys(fileContents).length > 0) {
                            const contentBlocks: ContentBlock[] = toolResults.map(result => ({
                                type: 'tool_result',
                                tool_use_id: result.tool_use_id,
                                content: result.content
                            }));
                            for (const result of toolResults) {
                                if (fileContents[result.tool_use_id]) {
                                    contentBlocks.push({
                                        type: 'text',
                                        text: `Internal file content for analysis (not displayed): ${fileContents[result.tool_use_id]}`
                                    });
                                }
                            }
                            this._conversationHistory.push({ role: 'user', content: contentBlocks });
                        } else {
                            this._conversationHistory.push({ role: 'user', content: toolResults });
                        }
                        // No need to update global state anymore

                        // Display only tool results (skip read_file unless requested)
                        const toolResultText = toolResults
                            .filter(result => result.content && (result.content !== 'Read successful' || result.content.startsWith('Error')))
                            .map(result => result.content)
                            .filter(Boolean)
                            .join('\n');

                        if (toolResultText) {
                            this._panel.webview.postMessage({
                                command: 'addAssistantMessage',
                                text: toolResultText,
                                messageId: this._conversationHistory.length - 1
                            });
                        }
                    } else {
                        isProcessingTools = false;
                    }
                } catch (error) {
                    console.error('handleSendMessage: Error:', error);
                    const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your request.';
                    const enhancedError = errorMessage.includes('cannot read') || errorMessage.includes('not found')
                        ? `${errorMessage}\nTry running VS Code as administrator, checking file permissions, or ensuring the workspace folder includes the file. Use 'list files' to verify file accessibility.`
                        : errorMessage;
                    this._panel.webview.postMessage({
                        command: 'error',
                        text: enhancedError
                    });
                }
            }
            if (iterationCount >= maxIterations) {
                const errorMessage = "Maximum tool use iterations reached. Please try rephrasing your request or breaking it into smaller tasks.";
                this._conversationHistory.push({ role: 'assistant', content: errorMessage });
                this._panel.webview.postMessage({
                    command: 'addAssistantMessage',
                    text: errorMessage,
                    messageId: this._conversationHistory.length - 1
                });
            }
        } catch (error) {
            console.error('handleSendMessage: Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your request.';
            const enhancedError = errorMessage.includes('cannot read') || errorMessage.includes('not found')
                ? `${errorMessage}\nTry running VS Code as administrator, checking file permissions, or ensuring the workspace folder includes the file. Use 'list files' to verify file accessibility.`
                : errorMessage;
            this._panel.webview.postMessage({
                command: 'error',
                text: enhancedError
            });
        }
    }

    private _cancelCurrentMessage() {
        try {
            const cancelSuccess = this._chatService.cancelCurrentStream();
            if (cancelSuccess) {
                // Check if the most recent message is an assistant message with empty content
                // This would happen if cancellation occurs before any content is generated
                const lastMessage = this._conversationHistory[this._conversationHistory.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                    // If the assistant message has no content (empty array or empty string), remove it
                    if (Array.isArray(lastMessage.content) && lastMessage.content.length === 0) {
                        this._conversationHistory.pop();
                    } else if (typeof lastMessage.content === 'string' && lastMessage.content.trim() === '') {
                        this._conversationHistory.pop();
                    }
                }
                
                this._panel.webview.postMessage({
                    command: 'cancelSuccess',
                    text: 'Request cancelled by user'
                });
            }
        } catch (error) {
            console.error('Error cancelling message:', error);
        }
    }

    private _startNewThread() {
        this._conversationHistory = [];
        // No need to update global state anymore
        this._panel.webview.postMessage({
            command: 'clearChat'
        });
    }

    private _updateGlobalState() {
        // Method kept for compatibility but doesn't save to globalState anymore
        // this._context.globalState.update('claudeChatHistory', this._conversationHistory);
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