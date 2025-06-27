import * as vscode from 'vscode';
import { ChatPanel } from './panels/ChatPanel';
import { ScmIntegrationService } from './services/ScmIntegrationService';
import { DecorationManager } from './services/DecorationManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Chat extension is now active!');

    // Initialize SCM integration service
    const scmService = ScmIntegrationService.getInstance();
    
    // Initialize decoration manager
    const decorationManager = new DecorationManager(context.extensionUri, scmService);

    // Register existing chat command
    const openChatCommand = vscode.commands.registerCommand('claude-chat.openChat', () => {
        const panel = ChatPanel.getInstance(context.extensionUri, context);
        panel.reveal();
    });

    // Register SCM commands
    const reviewWithAmpCommand = vscode.commands.registerCommand('amp-scm.reviewWithAmp', async () => {
        await vscode.commands.executeCommand('workbench.view.scm');
        vscode.window.showInformationMessage('Amp Review: Analyzing changes...', {
            detail: 'Opening enhanced diff view with AI insights'
        });
        
        // TODO: In Step 5, this will open the custom webview
        const state = scmService.getState();
        const fileCount = state.analyzedFiles.size;
        vscode.window.showInformationMessage(`Found ${fileCount} changed files ready for review`);
    });

    const refreshAnalysisCommand = vscode.commands.registerCommand('amp-scm.refreshAnalysis', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Refreshing Amp analysis...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            await scmService.refreshAnalysis();
            progress.report({ increment: 100 });
            
            const state = scmService.getState();
            const fileCount = state.analyzedFiles.size;
            vscode.window.showInformationMessage(`Analysis complete: ${fileCount} files analyzed`);
        });
    });

    const openDiffCommand = vscode.commands.registerCommand('amp-scm.openDiff', (uri: vscode.Uri) => {
        if (uri) {
            vscode.commands.executeCommand('vscode.diff', uri, uri, `Amp Review: ${vscode.workspace.asRelativePath(uri)}`);
        }
    });

    const markAsReviewedCommand = vscode.commands.registerCommand('amp-scm.markAsReviewed', (uri: vscode.Uri) => {
        if (uri) {
            const relativePath = vscode.workspace.asRelativePath(uri);
            vscode.window.showInformationMessage(`Marked ${relativePath} as reviewed`);
            // TODO: In future phases, track review status
        }
    });

    // Additional decoration commands
    const toggleDecorationsCommand = vscode.commands.registerCommand('amp-scm.toggleDecorations', () => {
        decorationManager.toggleDecorations();
    });

    const showDecorationsStatsCommand = vscode.commands.registerCommand('amp-scm.showDecorationsStats', () => {
        decorationManager.showDecorationsStats();
    });

    // Register disposables
    context.subscriptions.push(
        openChatCommand,
        reviewWithAmpCommand,
        refreshAnalysisCommand,
        openDiffCommand,
        markAsReviewedCommand,
        toggleDecorationsCommand,
        showDecorationsStatsCommand,
        scmService,
        decorationManager
    );

    // Listen for SCM state changes
    context.subscriptions.push(
        scmService.onDidChangeState((state) => {
            console.log(`Amp SCM: State updated - ${state.analyzedFiles.size} files analyzed`);
            
            // Update status bar or other UI elements based on state
            if (state.isAnalyzing) {
                vscode.window.setStatusBarMessage('$(sync~spin) Amp: Analyzing changes...', 3000);
            }
        })
    );

    console.log('Amp SCM integration initialized');
}

export function deactivate() {}