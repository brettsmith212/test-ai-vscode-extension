import React from 'react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card, CardContent } from '../components/ui/card';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatContainerProps {
    messages: Message[];
    messageInProgress: Message | null;
    errorMessages: string[];
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, messageInProgress, errorMessages }) => (
    <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
            {messages.map((msg, index) => (
                <Card 
                    key={index} 
                    className={`${
                        msg.role === 'user' 
                            ? 'ml-auto bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]' 
                            : 'mr-auto bg-[var(--vscode-editorWidget-background)] text-[var(--vscode-editor-foreground)]'
                    } max-w-[80%] border-[var(--vscode-panel-border)]`}
                >
                    <CardContent className="p-4">
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </CardContent>
                </Card>
            ))}
            {messageInProgress && (
                <Card 
                    className="mr-auto bg-[var(--vscode-editorWidget-background)] text-[var(--vscode-editor-foreground)] max-w-[80%] border-[var(--vscode-panel-border)]"
                >
                    <CardContent className="p-4">
                        <div className="text-sm whitespace-pre-wrap">{messageInProgress.content}</div>
                    </CardContent>
                </Card>
            )}
            {errorMessages.map((error, index) => (
                <Card 
                    key={index} 
                    className="mr-auto bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-inputValidation-errorForeground)] max-w-[80%] border-[var(--vscode-inputValidation-errorBorder)]"
                >
                    <CardContent className="p-4">
                        <div className="text-sm">{error}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </ScrollArea>
);

export default ChatContainer;