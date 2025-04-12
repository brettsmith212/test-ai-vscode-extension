import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Send } from 'lucide-react';

interface InputContainerProps {
    onSend: (text: string) => void;
    isProcessing: boolean;
}

const InputContainer: React.FC<InputContainerProps> = ({ onSend, isProcessing }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Keep focus on textarea when isProcessing changes
    useEffect(() => {
        textareaRef.current?.focus();
    }, [isProcessing]);

    const handleSend = () => {
        if (input.trim()) {
            onSend(input);
            setInput('');
            // Focus will be handled by the useEffect
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 border-t border-border flex gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={3}
                className="flex-1 resize-none text-foreground placeholder:text-muted-foreground"
            />
            <Button 
                onClick={handleSend} 
                disabled={isProcessing} 
                size="icon"
                className="h-auto"
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
};

export default InputContainer;