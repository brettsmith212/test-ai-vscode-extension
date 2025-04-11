import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// Initialize the ChatPanel as a global variable
let chatPanel: ChatPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Claude Chat extension is now active!');

	// Register the command to open the chat panel
	const openChatCommand = vscode.commands.registerCommand('claude-chat.openChat', () => {
		// If panel already exists, show it
		if (chatPanel) {
			chatPanel.reveal();
		} else {
			// Otherwise create a new panel
			chatPanel = new ChatPanel(context.extensionUri);
		}
	});

	context.subscriptions.push(openChatCommand);
}

class ChatPanel {
	public static readonly viewType = 'claudeChat';
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
	private _conversationHistory: { role: 'user' | 'assistant', content: string }[] = [];

	constructor(private readonly _extensionUri: vscode.Uri) {
		// Create a new webview panel
		this._panel = vscode.window.createWebviewPanel(
			ChatPanel.viewType,
			'Claude Chat',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(_extensionUri, 'media')
				]
			}
		);

		// Set the HTML content
		this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'sendMessage':
						await this._handleSendMessage(message.text);
						break;
					case 'newThread':
						this._conversationHistory = [];
						this._panel.webview.postMessage({
							command: 'clearChat'
						});
						break;
				}
			},
			null,
			this._disposables
		);

		// Handle panel disposal
		this._panel.onDidDispose(
			() => {
				chatPanel = undefined;
				this.dispose();
			},
			null,
			this._disposables
		);
	}

	public reveal() {
		this._panel.reveal();
	}

	public dispose() {
		// Clean up resources
		this._panel.dispose();
		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private async _handleSendMessage(text: string) {
		try {
			// Get API key from environment variable first, then fall back to settings
			const envApiKey = process.env.ANTHROPIC_API_KEY;
			const config = vscode.workspace.getConfiguration('claudeChat');
			const settingsApiKey = config.get<string>('apiKey');
			const apiKey = envApiKey || settingsApiKey;

			if (!apiKey) {
				this._panel.webview.postMessage({
					command: 'error',
					text: 'API key not found. Please set ANTHROPIC_API_KEY environment variable or configure it in VSCode settings.'
				});
				return;
			}

			// Add user message to history
			this._conversationHistory.push({ role: 'user', content: text });

			// Create Anthropic client
			const anthropic = new Anthropic({
				apiKey: apiKey
			});

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

			// Create message stream
			const stream = await anthropic.messages.create({
				messages: this._conversationHistory,
				model: 'claude-3-opus-20240229',
				max_tokens: 4096,
				stream: true
			});

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

			// Mark the response as complete
			this._panel.webview.postMessage({
				command: 'completeAssistantResponse'
			});

		} catch (error) {
			console.error('Error:', error);
			this._panel.webview.postMessage({
				command: 'error',
				text: 'An error occurred while processing your request.'
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Claude Chat</title>
			<style>
				body {
					font-family: var(--vscode-font-family);
					padding: 0;
					margin: 0;
					color: var(--vscode-editor-foreground);
					background-color: var(--vscode-editor-background);
					display: flex;
					flex-direction: column;
					height: 100vh;
				}
				.header {
					display: flex;
					justify-content: flex-end;
					padding: 0.5rem 1rem;
					border-bottom: 1px solid var(--vscode-panel-border);
				}
				.new-thread-button {
					background: none;
					border: none;
					color: var(--vscode-editor-foreground);
					cursor: pointer;
					padding: 0.75rem;
					display: flex;
					align-items: center;
					opacity: 0.7;
					transition: all 0.2s ease;
					border-radius: 4px;
				}
				.new-thread-button:hover {
					opacity: 1;
					background-color: var(--vscode-toolbar-hoverBackground);
					transform: scale(1.1);
				}
				.new-thread-button svg {
					width: 20px;
					height: 20px;
				}
				.chat-container {
					display: flex;
					flex-direction: column;
					flex: 1;
					overflow-y: auto;
					padding: 1rem;
				}
				.message {
					margin-bottom: 1rem;
					padding: 0.75rem;
					border-radius: 4px;
					max-width: 80%;
				}
				.user-message {
					align-self: flex-end;
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
				}
				.assistant-message {
					align-self: flex-start;
					background-color: var(--vscode-editor-inactiveSelectionBackground);
				}
				.input-container {
					display: flex;
					padding: 1rem;
					background-color: var(--vscode-editor-background);
					border-top: 1px solid var(--vscode-panel-border);
				}
				#message-input {
					flex: 1;
					padding: 0.5rem;
					border: 1px solid var(--vscode-input-border);
					background-color: var(--vscode-input-background);
					color: var(--vscode-input-foreground);
					border-radius: 4px;
					margin-right: 0.5rem;
				}
				#send-button {
					padding: 0.5rem 1rem;
					background-color: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					border-radius: 4px;
					cursor: pointer;
				}
				#send-button:hover {
					background-color: var(--vscode-button-hoverBackground);
				}
				.thinking {
					display: inline-block;
					animation: ellipsis 1.4s infinite;
				}
				@keyframes ellipsis {
					0% { content: '.'; }
					33% { content: '..'; }
					66% { content: '...'; }
				}
				pre {
					background-color: var(--vscode-textCodeBlock-background);
					padding: 1rem;
					border-radius: 4px;
					overflow-x: auto;
				}
				code {
					font-family: var(--vscode-editor-font-family);
					font-size: var(--vscode-editor-font-size);
				}
			</style>
		</head>
		<body>
			<div class="header">
				<button class="new-thread-button" title="Start new thread">
					<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M13.83 2.17l-1.42-1.42c-.39-.39-1.02-.39-1.41 0L3.83 7.92l-.82 2.87c-.09.34.22.65.56.56l2.87-.82L13.83 3.58c.39-.38.39-1.02 0-1.41zM6.87 9.64l-1.87.53.53-1.87 4.55-4.55 1.34 1.34-4.55 4.55z" fill="currentColor"/>
					</svg>
				</button>
			</div>
			<div class="chat-container" id="chat-container"></div>
			<div class="input-container">
				<textarea id="message-input" placeholder="Type your message here boss" rows="3"></textarea>
				<button id="send-button">Send</button>
			</div>

			<script>
				const vscode = acquireVsCodeApi();
				const chatContainer = document.getElementById('chat-container');
				const messageInput = document.getElementById('message-input');
				const sendButton = document.getElementById('send-button');
				const newThreadButton = document.querySelector('.new-thread-button');

				let currentAssistantMessage = null;

				// Handle new thread button click
				newThreadButton.addEventListener('click', () => {
					// Clear chat container
					chatContainer.innerHTML = '';
					// Send message to extension to clear history
					vscode.postMessage({
						command: 'newThread'
					});
				});

				// Add event listener to send button
				sendButton.addEventListener('click', sendMessage);
				// Add event listener for Enter key
				messageInput.addEventListener('keydown', (event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault();
						sendMessage();
					}
				});

				// Function to send a message
				function sendMessage() {
					const text = messageInput.value.trim();
					if (text) {
						vscode.postMessage({
							command: 'sendMessage',
							text: text
						});
						messageInput.value = '';
					}
				}

				// Handle messages from the extension
				window.addEventListener('message', (event) => {
					const message = event.data;

					switch (message.command) {
						case 'addUserMessage':
							addUserMessage(message.text);
							break;
						case 'startAssistantResponse':
							startAssistantResponse();
							break;
						case 'appendAssistantResponse':
							appendAssistantResponse(message.text);
							break;
						case 'completeAssistantResponse':
							completeAssistantResponse();
							break;
						case 'error':
							showError(message.text);
							break;
						case 'clearChat':
							clearChat();
							break;
					}
				});

				// Add a user message to the chat
				function addUserMessage(text) {
					const messageElement = document.createElement('div');
					messageElement.className = 'message user-message';
					messageElement.textContent = text;
					chatContainer.appendChild(messageElement);
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}

				// Start a new assistant response
				function startAssistantResponse() {
					currentAssistantMessage = document.createElement('div');
					currentAssistantMessage.className = 'message assistant-message';
					chatContainer.appendChild(currentAssistantMessage);
				}

				// Append to the assistant's response
				function appendAssistantResponse(text) {
					if (!currentAssistantMessage) return;

					// Handle markdown-style code blocks
					const formattedText = formatMarkdown(text);

					// Append the text (either as a node or as HTML)
					if (typeof formattedText === 'string') {
						// If the result is a string, treat it as HTML
						const span = document.createElement('span');
						span.innerHTML = formattedText;
						currentAssistantMessage.appendChild(span);
					} else {
						// If the result is a DOM node, append it directly
						currentAssistantMessage.appendChild(formattedText);
					}

					chatContainer.scrollTop = chatContainer.scrollHeight;
				}

				// Format markdown-style elements in text
				function formatMarkdown(text) {
					return text; // For now, return plain text. We can enhance this later.
				}

				// Complete the assistant's response
				function completeAssistantResponse() {
					currentAssistantMessage = null;
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}

				// Show an error message
				function showError(text) {
					const errorElement = document.createElement('div');
					errorElement.className = 'message assistant-message error';
					errorElement.textContent = text;
					chatContainer.appendChild(errorElement);
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}

				// Clear the chat
				function clearChat() {
					chatContainer.innerHTML = '';
				}
			</script>
		</body>
		</html>`;
	}
}

export function deactivate() {
	// Clean up any resources
	if (chatPanel) {
		chatPanel.dispose();
	}
}
