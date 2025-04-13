import React, { useState, useEffect } from 'react';
import { VSCodeProvider, useVSCode } from './VSCodeContext';
import Header from './components/Header';
import ChatContainer from './components/ChatContainer';
import InputContainer from './components/InputContainer';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    messageId?: number;
}

interface WebviewState {
    messages: Message[];
    errorMessages: string[];
}

const ChatInner: React.FC = () => {
    const vscode = useVSCode();
    const [messages, setMessages] = useState<Message[]>(() => {
        const savedState = vscode.getState() as WebviewState | undefined;
        return savedState?.messages || [];
    });
    const [messageInProgress, setMessageInProgress] = useState<Message | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessages, setErrorMessages] = useState<string[]>(() => {
        const savedState = vscode.getState() as WebviewState | undefined;
        return savedState?.errorMessages || [];
    });

    // Persist state whenever messages or errorMessages change
    // This only persists state within the current VSCode session for tab switching
    useEffect(() => {
        vscode.setState({ messages, errorMessages });
    }, [messages, errorMessages, vscode]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'addUserMessage':
                    setMessages(prev => {
                        if (message.messageId && prev.some(msg => msg.messageId === message.messageId)) {
                            return prev;
                        }
                        return [...prev, { role: 'user', content: message.text, messageId: message.messageId }];
                    });
                    break;
                case 'addAssistantMessage':
                    setMessages(prev => {
                        if (message.messageId && prev.some(msg => msg.messageId === message.messageId)) {
                            return prev;
                        }
                        return [...prev, { role: 'assistant', content: message.text, messageId: message.messageId }];
                    });
                    setIsProcessing(false);
                    setMessageInProgress(null);
                    break;
                case 'startAssistantResponse':
                    setMessageInProgress({ role: 'assistant', content: '', messageId: message.messageId });
                    setIsProcessing(true);
                    break;
                case 'appendAssistantResponse':
                    setMessageInProgress(prev => prev && prev.messageId === message.messageId 
                        ? { ...prev, content: prev.content + message.text } 
                        : prev);
                    break;
                case 'error':
                    setErrorMessages(prev => [...prev, message.text]);
                    setIsProcessing(false);
                    setMessageInProgress(null);
                    break;
                case 'cancelSuccess':
                    setIsProcessing(false);
                    if (messageInProgress) {
                        setMessages(prev => [...prev, { ...messageInProgress, content: messageInProgress.content + "\n\n*Request cancelled by user*" }]);
                        setMessageInProgress(null);
                    }
                    break;
                case 'clearChat':
                    setMessages([]);
                    setMessageInProgress(null);
                    setErrorMessages([]);
                    vscode.setState({ messages: [], errorMessages: [] });
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [vscode]);

    const sendMessage = (text: string) => {
        setIsProcessing(true);
        vscode.postMessage({ command: 'sendMessage', text });
    };

    const cancelMessage = () => {
        vscode.postMessage({ command: 'cancelMessage' });
    };

    const startNewThread = () => {
        vscode.postMessage({ command: 'newThread' });
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header onNewThread={startNewThread} />
            <ChatContainer messages={messages} messageInProgress={messageInProgress} errorMessages={errorMessages} />
            <InputContainer onSend={sendMessage} onCancel={cancelMessage} isProcessing={isProcessing} />
        </div>
    );
};

const Chat: React.FC = () => (
    <VSCodeProvider>
        <div className="dark min-h-screen min-w-full">
            <ChatInner />
        </div>
    </VSCodeProvider>
);

export default Chat;