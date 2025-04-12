import React from 'react';
import { Button } from '../components/ui/button';
import { Pencil } from 'lucide-react';

interface HeaderProps {
    onNewThread: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewThread }) => (
    <div className="flex justify-end p-2 border-b border-border">
        <Button 
            onClick={onNewThread} 
            variant="ghost" 
            size="icon"
            className="text-foreground hover:text-foreground/80"
        >
            <Pencil className="h-4 w-4" />
        </Button>
    </div>
);

export default Header;