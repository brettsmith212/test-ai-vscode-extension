import React from 'react';

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
    <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                {msg.content}
            </div>
        ))}
        {messageInProgress && (
            <div className="message assistant-message">
                {messageInProgress.content}
            </div>
        )}
        {errorMessages.map((error, index) => (
            <div key={index} className="error">
                {error}
            </div>
        ))}
    </div>
);

export default ChatContainer;