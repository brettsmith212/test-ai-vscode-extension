import * as vscode from 'vscode';
import { AmpReviewTreeProvider } from '../providers/AmpReviewTreeProvider';
import { ScmIntegrationService } from '../services/ScmIntegrationService';
import { AmpReviewTreeItem } from '../types/treeView';
import { AmpFileAnalysis } from '../types/scm';

export class TreeViewCommands {
    private treeProvider: AmpReviewTreeProvider;
    private scmService: ScmIntegrationService;
    private disposables: vscode.Disposable[] = [];

    constructor(treeProvider: AmpReviewTreeProvider, scmService: ScmIntegrationService) {
        this.treeProvider = treeProvider;
        this.scmService = scmService;
    }

    public registerCommands(context: vscode.ExtensionContext): void {
        // Tree view management commands
        const refreshTreeCommand = vscode.commands.registerCommand('amp-scm.refreshTree', () => {
            this.refreshTree();
        });

        const showTreeStatsCommand = vscode.commands.registerCommand('amp-scm.showTreeStats', () => {
            this.showTreeStats();
        });

        const collapseAllGroupsCommand = vscode.commands.registerCommand('amp-scm.collapseAllGroups', () => {
            this.collapseAllGroups();
        });

        const expandAllGroupsCommand = vscode.commands.registerCommand('amp-scm.expandAllGroups', () => {
            this.expandAllGroups();
        });

        // File-specific commands
        const openFileCommand = vscode.commands.registerCommand('amp-scm.openFile', (item: AmpReviewTreeItem) => {
            this.openFile(item);
        });

        const openDiffCommand = vscode.commands.registerCommand('amp-scm.openFileDiff', (item: AmpReviewTreeItem) => {
            this.openFileDiff(item);
        });

        const markAsReviewedCommand = vscode.commands.registerCommand('amp-scm.markFileAsReviewed', (item: AmpReviewTreeItem) => {
            this.markFileAsReviewed(item);
        });

        const showFileDetailsCommand = vscode.commands.registerCommand('amp-scm.showFileDetails', (item: AmpReviewTreeItem) => {
            this.showFileDetails(item);
        });

        const copyFilePathCommand = vscode.commands.registerCommand('amp-scm.copyFilePath', (item: AmpReviewTreeItem) => {
            this.copyFilePath(item);
        });

        // Group-specific commands
        const openAllFilesInGroupCommand = vscode.commands.registerCommand('amp-scm.openAllFilesInGroup', (item: AmpReviewTreeItem) => {
            this.openAllFilesInGroup(item);
        });

        const markGroupAsReviewedCommand = vscode.commands.registerCommand('amp-scm.markGroupAsReviewed', (item: AmpReviewTreeItem) => {
            this.markGroupAsReviewed(item);
        });

        // Configuration commands
        const changeGroupingCommand = vscode.commands.registerCommand('amp-scm.changeGrouping', () => {
            this.changeGrouping();
        });

        const toggleFileCountCommand = vscode.commands.registerCommand('amp-scm.toggleFileCount', () => {
            this.toggleFileCount();
        });

        // Register all commands
        this.disposables.push(
            refreshTreeCommand,
            showTreeStatsCommand,
            collapseAllGroupsCommand,
            expandAllGroupsCommand,
            openFileCommand,
            openDiffCommand,
            markAsReviewedCommand,
            showFileDetailsCommand,
            copyFilePathCommand,
            openAllFilesInGroupCommand,
            markGroupAsReviewedCommand,
            changeGroupingCommand,
            toggleFileCountCommand
        );

        // Add to context subscriptions
        context.subscriptions.push(...this.disposables);
    }

    private refreshTree(): void {
        this.treeProvider.refresh();
        vscode.window.showInformationMessage('Amp Review tree refreshed');
    }

    private showTreeStats(): void {
        const stats = this.treeProvider.getStats();
        const riskStats = `🔴 ${stats.riskDistribution.high} high, 🟡 ${stats.riskDistribution.medium} medium, 🟢 ${stats.riskDistribution.low} low risk`;
        
        const categoryStats = Object.entries(stats.categoryDistribution)
            .map(([category, count]) => `${category}: ${count}`)
            .join(', ');

        const message = `**Amp Review Statistics**\n\n` +
                       `**Total Files:** ${stats.totalFiles}\n` +
                       `**Risk Distribution:** ${riskStats}\n` +
                       `**Categories:** ${categoryStats}`;

        vscode.window.showInformationMessage(message, { modal: false });
    }

    private async collapseAllGroups(): Promise<void> {
        // This would require access to the tree view instance
        vscode.window.showInformationMessage('All groups collapsed');
    }

    private async expandAllGroups(): Promise<void> {
        // This would require access to the tree view instance
        vscode.window.showInformationMessage('All groups expanded');
    }

    private openFile(item: AmpReviewTreeItem): void {
        if (item.type === 'file' && item.analysis) {
            vscode.commands.executeCommand('vscode.open', item.analysis.change.uri);
        }
    }

    private openFileDiff(item: AmpReviewTreeItem): void {
        if (item.type === 'file' && item.analysis) {
            const uri = item.analysis.change.uri;
            const title = `Amp Review: ${vscode.workspace.asRelativePath(uri)}`;
            
            // For now, open the file (in a real implementation, this would show git diff)
            vscode.commands.executeCommand('vscode.diff', uri, uri, title);
        }
    }

    private async markFileAsReviewed(item: AmpReviewTreeItem): Promise<void> {
        if (item.type === 'file' && item.analysis) {
            const fileName = vscode.workspace.asRelativePath(item.analysis.change.uri);
            
            // In a real implementation, this would track review status
            const result = await vscode.window.showInformationMessage(
                `Mark "${fileName}" as reviewed?`,
                { modal: true },
                'Yes', 'No'
            );

            if (result === 'Yes') {
                vscode.window.showInformationMessage(`✅ Marked "${fileName}" as reviewed`);
                // TODO: Update review status in analysis data
            }
        }
    }

    private async showFileDetails(item: AmpReviewTreeItem): Promise<void> {
        if (item.type === 'file' && item.analysis) {
            const analysis = item.analysis;
            const fileName = vscode.workspace.asRelativePath(analysis.change.uri);
            
            const details = `**File Details: ${fileName}**\n\n` +
                           `**Risk Level:** ${analysis.riskLevel}\n` +
                           `**Category:** ${analysis.category}\n` +
                           `**Status:** ${analysis.change.status}\n` +
                           `**Confidence:** ${Math.round(analysis.confidence * 100)}%\n\n` +
                           `**Rationale:** ${analysis.rationale || 'No rationale available'}\n\n` +
                           (analysis.coverageImpact ? 
                            `**Coverage Impact:** ${analysis.coverageImpact.delta > 0 ? '+' : ''}${analysis.coverageImpact.delta.toFixed(1)}%\n` : '');

            // Create a webview or use a markdown preview
            await vscode.env.openExternal(vscode.Uri.parse('command:markdown.showPreview'));
            
            // For now, show in information message
            vscode.window.showInformationMessage(details, { modal: true });
        }
    }

    private async copyFilePath(item: AmpReviewTreeItem): Promise<void> {
        if (item.type === 'file' && item.analysis) {
            const relativePath = vscode.workspace.asRelativePath(item.analysis.change.uri);
            await vscode.env.clipboard.writeText(relativePath);
            vscode.window.showInformationMessage(`📋 Copied path: ${relativePath}`);
        }
    }

    private async openAllFilesInGroup(item: AmpReviewTreeItem): Promise<void> {
        if (item.type === 'group') {
            const files = this.getFilesInGroup(item.groupId!);
            
            if (files.length === 0) {
                vscode.window.showInformationMessage('No files in this group');
                return;
            }

            const result = await vscode.window.showInformationMessage(
                `Open all ${files.length} files in ${item.label}?`,
                { modal: true },
                'Yes', 'No'
            );

            if (result === 'Yes') {
                for (const file of files.slice(0, 10)) { // Limit to 10 files
                    vscode.commands.executeCommand('vscode.open', file.change.uri);
                }
                
                if (files.length > 10) {
                    vscode.window.showWarningMessage(`Opened first 10 files out of ${files.length} total`);
                }
            }
        }
    }

    private async markGroupAsReviewed(item: AmpReviewTreeItem): Promise<void> {
        if (item.type === 'group') {
            const files = this.getFilesInGroup(item.groupId!);
            
            const result = await vscode.window.showInformationMessage(
                `Mark all ${files.length} files in ${item.label} as reviewed?`,
                { modal: true },
                'Yes', 'No'
            );

            if (result === 'Yes') {
                vscode.window.showInformationMessage(`✅ Marked ${files.length} files as reviewed`);
                // TODO: Update review status for all files in group
            }
        }
    }

    private async changeGrouping(): Promise<void> {
        const options = [
            { label: 'Risk Level', value: 'risk', description: 'Group by high, medium, low risk' },
            { label: 'Category', value: 'category', description: 'Group by feature, bugfix, test, etc.' },
            { label: 'File Type', value: 'fileType', description: 'Group by TypeScript, JavaScript, config, etc.' }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select grouping method for Amp Review tree',
            matchOnDescription: true
        });

        if (selected) {
            const config = vscode.workspace.getConfiguration('ampScm');
            await config.update('treeView.groupBy', selected.value, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Tree grouping changed to: ${selected.label}`);
        }
    }

    private async toggleFileCount(): Promise<void> {
        const config = vscode.workspace.getConfiguration('ampScm');
        const currentValue = config.get<boolean>('treeView.showFileCount', true);
        
        await config.update('treeView.showFileCount', !currentValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`File count display ${!currentValue ? 'enabled' : 'disabled'}`);
    }

    private getFilesInGroup(groupId: string): AmpFileAnalysis[] {
        const analyzedFiles = this.scmService.getAnalyzedFiles();
        return Array.from(analyzedFiles.values()).filter(file => {
            // This logic should match the grouping logic in AmpReviewTreeProvider
            const config = vscode.workspace.getConfiguration('ampScm');
            const groupBy = config.get<string>('treeView.groupBy', 'risk');
            
            switch (groupBy) {
                case 'risk':
                    return file.riskLevel === groupId;
                case 'category':
                    return file.category === groupId;
                case 'fileType':
                    return this.getFileTypeGroup(file.change.relativePath) === groupId;
                default:
                    return file.riskLevel === groupId;
            }
        });
    }

    private getFileTypeGroup(filePath: string): string {
        const path = filePath.toLowerCase();
        if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
        if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
        if (path.includes('config') || path.endsWith('.json') || path.includes('package.json')) return 'config';
        if (path.endsWith('.md') || path.includes('readme') || path.includes('doc')) return 'documentation';
        return 'other';
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
