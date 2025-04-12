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
                <Card key={index} className={`${msg.role === 'user' ? 'ml-auto bg-primary/10' : 'mr-auto bg-muted'} max-w-[80%]`}>
                    <CardContent className="p-4">
                        <div className="text-sm">{msg.content}</div>
                    </CardContent>
                </Card>
            ))}
            {messageInProgress && (
                <Card className="mr-auto bg-muted max-w-[80%]">
                    <CardContent className="p-4">
                        <div className="text-sm">{messageInProgress.content}</div>
                    </CardContent>
                </Card>
            )}
            {errorMessages.map((error, index) => (
                <Card key={index} className="bg-destructive/10 text-destructive max-w-[80%] mx-auto">
                    <CardContent className="p-4">
                        <div className="text-sm">{error}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </ScrollArea>
);

export default ChatContainer;