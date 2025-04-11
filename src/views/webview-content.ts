import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview): string {
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
            }
            .new-thread-button:hover {
                opacity: 1;
            }
            #chat-container {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }
            .message {
                margin-bottom: 1rem;
                padding: 0.5rem;
                border-radius: 4px;
            }
            .user-message {
                background-color: var(--vscode-editor-inactiveSelectionBackground);
            }
            .assistant-message {
                background-color: var(--vscode-editor-selectionBackground);
            }
            .input-container {
                padding: 1rem;
                border-top: 1px solid var(--vscode-panel-border);
                display: flex;
                gap: 0.5rem;
            }
            #message-input {
                flex: 1;
                padding: 0.5rem;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
            }
            #send-button {
                padding: 0.5rem 1rem;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            #send-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .error {
                color: var(--vscode-errorForeground);
                padding: 0.5rem;
                margin: 0.5rem;
                border: 1px solid var(--vscode-errorForeground);
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <button class="new-thread-button" id="new-thread-button">New Thread</button>
        </div>
        <div id="chat-container"></div>
        <div class="input-container">
            <textarea id="message-input" placeholder="Type your message..." rows="3"></textarea>
            <button id="send-button">Send</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const messageInput = document.getElementById('message-input');
            const sendButton = document.getElementById('send-button');
            const chatContainer = document.getElementById('chat-container');
            const newThreadButton = document.getElementById('new-thread-button');
            let isProcessing = false;

            function appendMessage(text, isUser) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${isUser ? 'user-message' : 'assistant-message'}\`;
                messageDiv.textContent = text;
                chatContainer.appendChild(messageDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            let currentAssistantMessage = null;

            function startAssistantMessage() {
                currentAssistantMessage = document.createElement('div');
                currentAssistantMessage.className = 'message assistant-message';
                chatContainer.appendChild(currentAssistantMessage);
            }

            function appendToAssistantMessage(text) {
                if (currentAssistantMessage) {
                    currentAssistantMessage.textContent += text;
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }

            function showError(text) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error';
                errorDiv.textContent = text;
                chatContainer.appendChild(errorDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
                    e.preventDefault();
                    sendButton.click();
                }
            });

            sendButton.addEventListener('click', () => {
                const text = messageInput.value.trim();
                if (text && !isProcessing) {
                    isProcessing = true;
                    sendButton.disabled = true;
                    messageInput.value = '';
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: text
                    });
                }
            });

            newThreadButton.addEventListener('click', () => {
                if (!isProcessing) {
                    vscode.postMessage({
                        command: 'newThread'
                    });
                }
            });

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'addUserMessage':
                        appendMessage(message.text, true);
                        break;
                    case 'startAssistantResponse':
                        startAssistantMessage();
                        break;
                    case 'appendAssistantResponse':
                        appendToAssistantMessage(message.text);
                        break;
                    case 'completeAssistantResponse':
                        isProcessing = false;
                        sendButton.disabled = false;
                        messageInput.focus();
                        break;
                    case 'error':
                        showError(message.text);
                        isProcessing = false;
                        sendButton.disabled = false;
                        break;
                    case 'clearChat':
                        chatContainer.innerHTML = '';
                        break;
                }
            });

            // Focus input on load
            messageInput.focus();
        </script>
    </body>
    </html>`;
}
