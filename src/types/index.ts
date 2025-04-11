export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface WebviewMessage {
    command: string;
    text?: string;
}
