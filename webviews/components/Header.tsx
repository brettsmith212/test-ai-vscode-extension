import React from 'react';

interface HeaderProps {
    onNewThread: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewThread }) => (
    <div className="flex justify-end p-2 border-b border-gray-200">
        <button onClick={onNewThread} className="bg-transparent text-gray-700 cursor-pointer p-3 flex items-center opacity-70 hover:opacity-100">
            New Thread
        </button>
    </div>
);

export default Header;