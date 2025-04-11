import React, { createContext, useContext } from 'react';

declare function acquireVsCodeApi(): {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

const VSCodeContext = createContext<any>(null);

export const VSCodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const vscode = acquireVsCodeApi();
    return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};

export const useVSCode = () => useContext(VSCodeContext);