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

    useEffect(() => {
        textareaRef.current?.focus();
    }, [isProcessing]);

    const handleSend = () => {
        if (input.trim()) {
            onSend(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="p-4 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
            <div className="flex gap-2">
                <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isProcessing}
                    className="min-h-[44px] max-h-[200px] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-[var(--vscode-input-border)] focus-visible:ring-[var(--vscode-focusBorder)] placeholder:text-[var(--vscode-input-placeholderForeground)]"
                    style={{ resize: 'none' }}
                />
                <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing}
                    size="icon"
                    className="bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)] disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default InputContainer;