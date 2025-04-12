import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card, CardContent } from '../components/ui/card';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    messageId?: number;
}

interface ChatContainerProps {
    messages: Message[];
    messageInProgress: Message | null;
    errorMessages: string[];
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, messageInProgress, errorMessages }) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);

    // Check if scroll is at bottom
    const checkScrollPosition = () => {
        const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
            const { scrollTop, scrollHeight, clientHeight } = scrollArea;
            isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 10;
        }
    };

    // Scroll to bottom if already at bottom
    const scrollToBottom = () => {
        if (isAtBottomRef.current) {
            const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollArea) {
                scrollArea.scrollTop = scrollArea.scrollHeight;
            }
        }
    };

    // Initialize scroll listener and scroll to bottom on mount
    useEffect(() => {
        const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
            scrollArea.addEventListener('scroll', checkScrollPosition);
            scrollArea.scrollTop = scrollArea.scrollHeight;
            isAtBottomRef.current = true;
        }

        return () => {
            if (scrollArea) {
                scrollArea.removeEventListener('scroll', checkScrollPosition);
            }
        };
    }, []);

    // Scroll to bottom when messages change, if at bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages, messageInProgress, errorMessages]);

    return (
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="flex flex-col gap-4 p-4">
                {messages.map((msg, index) => (
                    <Card 
                        key={msg.messageId ?? index} 
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
                        key={messageInProgress.messageId}
                    >
                        <CardContent className="p-4">
                            <div className="text-sm whitespace-pre-wrap">{messageInProgress.content}</div>
                        </CardContent>
                    </Card>
                )}
                {errorMessages.map((error, index) => (
                    <Card 
                        key={`error-${index}`} 
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
};

export default ChatContainer;