import React, { useState } from 'react';

interface InputContainerProps {
    onSend: (text: string) => void;
    isProcessing: boolean;
}

const InputContainer: React.FC<InputContainerProps> = ({ onSend, isProcessing }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim() && !isProcessing) {
            onSend(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 border-t border-gray-200 flex gap-2">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={3}
                className="flex-1 p-2 border border-gray-300 bg-white text-gray-900 rounded"
            />
            <button onClick={handleSend} disabled={isProcessing} className="p-2 bg-blue-500 text-white rounded disabled:opacity-50">
                Send
            </button>
        </div>
    );
};

export default InputContainer;