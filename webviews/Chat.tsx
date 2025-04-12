import React, { useState, useEffect } from 'react';
import { VSCodeProvider, useVSCode } from './VSCodeContext';
import Header from './components/Header';
import ChatContainer from './components/ChatContainer';
import InputContainer from './components/InputContainer';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const ChatInner: React.FC = () => {
    const vscode = useVSCode();
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInProgress, setMessageInProgress] = useState<Message | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessages, setErrorMessages] = useState<string[]>([]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'addUserMessage':
                    setMessages(prev => [...prev, { role: 'user', content: message.text }]);
                    break;
                case 'startAssistantResponse':
                    setMessageInProgress({ role: 'assistant', content: '' });
                    break;
                case 'appendAssistantResponse':
                    setMessageInProgress(prev => prev ? { ...prev, content: prev.content + message.text } : null);
                    break;
                case 'completeAssistantResponse':
                    if (messageInProgress) {
                        setMessages(prev => [...prev, messageInProgress]);
                        setMessageInProgress(null);
                    }
                    setIsProcessing(false);
                    break;
                case 'error':
                    setErrorMessages(prev => [...prev, message.text]);
                    setIsProcessing(false);
                    break;
                case 'clearChat':
                    setMessages([]);
                    setMessageInProgress(null);
                    setErrorMessages([]);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [messageInProgress, vscode]);

    const sendMessage = (text: string) => {
        setIsProcessing(true);
        vscode.postMessage({ command: 'sendMessage', text });
    };

    const startNewThread = () => {
        vscode.postMessage({ command: 'newThread' });
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header onNewThread={startNewThread} />
            <ChatContainer messages={messages} messageInProgress={messageInProgress} errorMessages={errorMessages} />
            <InputContainer onSend={sendMessage} isProcessing={isProcessing} />
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