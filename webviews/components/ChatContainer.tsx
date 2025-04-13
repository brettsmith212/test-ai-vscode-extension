import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css'; // Use a dark theme compatible with VS Code

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

    // Highlight code blocks after rendering
    useEffect(() => {
        document.querySelectorAll('.code-block code').forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
        });
    }, [messages, messageInProgress]);

    // Custom CodeBlock component with copy button
    const CodeBlock: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
        const [isCopied, setIsCopied] = useState(false);

        const handleCopy = () => {
            const text = String(children).trim();
            navigator.clipboard.writeText(text).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        };

        return (
            <div className="code-block group">
                <code className={className}>
                    {children}
                </code>
                <div className="copy-button-container">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        className="h-6 w-6 text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]"
                        title="Copy code"
                    >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-background text-foreground box-sizing-border-box">
            <ScrollArea className="flex-1 w-full max-w-full overflow-x-hidden overflow-y-auto" ref={scrollAreaRef}>
                <div className="flex flex-col gap-4 p-4 w-full max-w-full min-w-0 box-sizing-border-box">
                    {messages.map((msg, index) => (
                        <div
                            key={msg.messageId ?? index}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`w-fit max-w-[80%] min-w-0 border ${
                                    msg.role === 'user'
                                        ? 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]'
                                        : 'bg-[var(--vscode-editorWidget-background)] text-[var(--vscode-editor-foreground)]'
                                } box-sizing-border-box`}
                            >
                                <CardContent className="p-3 overflow-hidden box-sizing-border-box">
                                    {msg.role === 'user' ? (
                                        <div className="text-sm whitespace-pre-wrap break-all overflow-hidden">{msg.content}</div>
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                code({ node, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return match ? (
                                                        <CodeBlock className={className}>
                                                            {children}
                                                        </CodeBlock>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                div: ({ node, ...props }) => <div className="text-sm break-all overflow-hidden" {...props} />
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    )}
                                </CardContent>
                            </div>
                        </div>
                    ))}
                    {messageInProgress && (
                        <div
                            className={`flex w-full max-w-full justify-${messageInProgress.role === 'user' ? 'end' : 'start'} box-sizing-border-box`}
                        >
                            <Card
                                className={`w-fit max-w-[80%] min-w-0 border-[var(--vscode-panel-border)] ${
                                    messageInProgress.role === 'user'
                                        ? 'bg-[var(--vscode-chat-userMessageBackground)] text-[var(--vscode-editor-foreground)]'
                                        : 'bg-[var(--vscode-chat-assistantMessageBackground)] text-[var(--vscode-editor-foreground)]'
                                } box-sizing-border-box`}
                            >
                                <CardContent className="p-3 overflow-hidden box-sizing-border-box">
                                    {messageInProgress.role === 'user' ? (
                                        <div className="text-sm whitespace-pre-wrap break-all overflow-hidden">{messageInProgress.content}</div>
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                code({ node, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return match ? (
                                                        <CodeBlock className={className}>
                                                            {children}
                                                        </CodeBlock>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                div: ({ node, ...props }) => <div className="text-sm break-all overflow-hidden" {...props} />
                                            }}
                                        >
                                            {messageInProgress.content}
                                        </ReactMarkdown>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    {errorMessages.map((error, index) => (
                        <div key={`error-${index}`} className="flex w-full max-w-full justify-start box-sizing-border-box">
                            <Card
                                className="w-fit max-w-full min-w-0 border-[var(--vscode-inputValidation-errorBorder)] bg-[var(--vscode-inputValidation-errorBackground)] text-[var(--vscode-inputValidation-errorForeground)] break-words box-sizing-border-box"
                            >
                                <CardContent className="p-3 overflow-hidden box-sizing-border-box">
                                    <div className="text-sm break-all overflow-hidden">{error}</div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default ChatContainer;