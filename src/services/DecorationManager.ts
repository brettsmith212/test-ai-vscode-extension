import * as vscode from 'vscode';
import { DecorationProvider } from '../providers/DecorationProvider';
import { ScmIntegrationService } from './ScmIntegrationService';
import { AmpFileAnalysis } from '../types/scm';

export class DecorationManager {
    private decorationProvider: DecorationProvider;
    private scmService: ScmIntegrationService;
    private disposables: vscode.Disposable[] = [];
    private activeDecorations = new Map<string, AmpFileAnalysis>();

    constructor(extensionUri: vscode.Uri, scmService: ScmIntegrationService) {
        this.decorationProvider = new DecorationProvider(extensionUri);
        this.scmService = scmService;
        this.initialize();
    }

    private initialize(): void {
        // Listen for SCM state changes
        this.disposables.push(
            this.scmService.onDidChangeState((state) => {
                this.updateAllDecorations();
            })
        );

        // Listen for active editor changes
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    this.updateEditorDecorations(editor);
                }
            })
        );

        // Listen for visible editors changes
        this.disposables.push(
            vscode.window.onDidChangeVisibleTextEditors((editors) => {
                for (const editor of editors) {
                    this.updateEditorDecorations(editor);
                }
            })
        );

        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('ampScm.enableDecorations')) {
                    this.updateAllDecorations();
                }
            })
        );

        // Listen for document changes to refresh decorations
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                // Debounce decoration updates for the same document
                const uri = event.document.uri;
                this.debounceDecorationsUpdate(uri);
            })
        );

        // Initial decoration update for visible editors
        this.updateAllDecorations();
    }

    private debounceTimeouts = new Map<string, NodeJS.Timeout>();

    private debounceDecorationsUpdate(uri: vscode.Uri): void {
        const key = uri.toString();
        
        // Clear existing timeout
        const existingTimeout = this.debounceTimeouts.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === key);
            if (editor) {
                this.updateEditorDecorations(editor);
            }
            this.debounceTimeouts.delete(key);
        }, 500); // 500ms debounce

        this.debounceTimeouts.set(key, timeout);
    }

    private updateAllDecorations(): void {
        // Update decorations for all visible editors
        for (const editor of vscode.window.visibleTextEditors) {
            this.updateEditorDecorations(editor);
        }
    }

    private updateEditorDecorations(editor: vscode.TextEditor): void {
        const uri = editor.document.uri;
        const analysis = this.scmService.getFileAnalysis(uri);

        if (analysis && this.shouldShowDecorationsForFile(uri)) {
            // Apply decorations
            this.decorationProvider.applyDecorations(editor, analysis);
            this.activeDecorations.set(uri.toString(), analysis);
        } else {
            // Clear decorations if no analysis or decorations disabled
            this.decorationProvider.clearDecorations(editor);
            this.activeDecorations.delete(uri.toString());
        }
    }

    private shouldShowDecorationsForFile(uri: vscode.Uri): boolean {
        // Check if decorations are enabled
        const config = vscode.workspace.getConfiguration('ampScm');
        if (!config.get<boolean>('enableDecorations', true)) {
            return false;
        }

        // Only show decorations for files in workspace
        if (!vscode.workspace.getWorkspaceFolder(uri)) {
            return false;
        }

        // Skip certain file types
        const fileName = uri.fsPath.toLowerCase();
        const skipPatterns = [
            '.git/',
            'node_modules/',
            '.vscode/',
            'out/',
            'dist/',
            'build/',
            '.min.js',
            '.map'
        ];

        return !skipPatterns.some(pattern => fileName.includes(pattern));
    }

    public refreshDecorations(): void {
        this.updateAllDecorations();
    }

    public clearAllDecorations(): void {
        this.decorationProvider.clearAllDecorations();
        this.activeDecorations.clear();
    }

    public getActiveDecorations(): Map<string, AmpFileAnalysis> {
        return new Map(this.activeDecorations);
    }

    public toggleDecorations(): void {
        const config = vscode.workspace.getConfiguration('ampScm');
        const currentValue = config.get<boolean>('enableDecorations', true);
        config.update('enableDecorations', !currentValue, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
            `Amp decorations ${!currentValue ? 'enabled' : 'disabled'}`
        );
    }

    public showDecorationsStats(): void {
        const stats = {
            totalFiles: this.activeDecorations.size,
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0
        };

        for (const analysis of this.activeDecorations.values()) {
            switch (analysis.riskLevel) {
                case 'high':
                    stats.highRisk++;
                    break;
                case 'medium':
                    stats.mediumRisk++;
                    break;
                case 'low':
                    stats.lowRisk++;
                    break;
            }
        }

        const message = `Amp Decorations: ${stats.totalFiles} files analyzed ` +
                       `(🔴 ${stats.highRisk} high, 🟡 ${stats.mediumRisk} medium, 🟢 ${stats.lowRisk} low risk)`;
        
        vscode.window.showInformationMessage(message);
    }

    public dispose(): void {
        // Clear all timeouts
        for (const timeout of this.debounceTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.debounceTimeouts.clear();

        // Dispose of all subscriptions
        this.disposables.forEach(d => d.dispose());
        
        // Clear decorations and dispose provider
        this.decorationProvider.dispose();
        this.activeDecorations.clear();
    }
}
