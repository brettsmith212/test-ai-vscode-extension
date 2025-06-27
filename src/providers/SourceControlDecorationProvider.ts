import * as vscode from 'vscode';
import { ScmIntegrationService } from '../services/ScmIntegrationService';
import { FileAnalysisService } from '../services/FileAnalysisService';
import { AmpFileAnalysis } from '../types/scm';

export class SourceControlDecorationProvider {
    private scmService: ScmIntegrationService;
    private analysisService: FileAnalysisService;
    private disposables: vscode.Disposable[] = [];
    private decorationMap = new Map<string, vscode.SourceControlResourceDecorations>();

    constructor(scmService: ScmIntegrationService) {
        this.scmService = scmService;
        this.analysisService = FileAnalysisService.getInstance();
        this.initialize();
    }

    private initialize(): void {
        // Listen for SCM state changes to update decorations
        this.disposables.push(
            this.scmService.onDidChangeState(() => {
                this.updateDecorations();
            })
        );

        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('ampScm.showRiskIndicators')) {
                    this.updateDecorations();
                }
            })
        );

        // Initial decoration update
        this.updateDecorations();
    }

    private updateDecorations(): void {
        this.decorationMap.clear();

        if (!this.shouldShowDecorations()) {
            return;
        }

        const analyzedFiles = this.scmService.getAnalyzedFiles();
        for (const [uri, analysis] of analyzedFiles) {
            const decorations = this.createDecorations(analysis);
            this.decorationMap.set(uri, decorations);
        }
    }

    private shouldShowDecorations(): boolean {
        const config = vscode.workspace.getConfiguration('ampScm');
        return config.get<boolean>('showRiskIndicators', true);
    }

    private createDecorations(analysis: AmpFileAnalysis): vscode.SourceControlResourceDecorations {
        const summary = this.analysisService.getFileSummary(analysis);
        
        return {
            strikeThrough: false,
            faded: false,
            tooltip: summary.tooltip,
            light: this.createThemeDecorations(analysis, false),
            dark: this.createThemeDecorations(analysis, true)
        };
    }

    private createThemeDecorations(analysis: AmpFileAnalysis, isDark: boolean): vscode.SourceControlResourceThemableDecorations {
        const summary = this.analysisService.getFileSummary(analysis);
        const confidence = Math.round(analysis.confidence * 100);
        
        // Create badge text
        const badgeText = this.createBadgeText(analysis);
        
        // Get appropriate colors for theme
        const colors = this.getThemeColors(analysis.riskLevel, isDark);
        
        return {
            iconPath: this.getRiskIcon(analysis.riskLevel)
            // Note: VS Code's SourceControlResourceThemableDecorations has limited properties
            // We use the icon to convey risk information
        };
    }

    private createBadgeText(analysis: AmpFileAnalysis): string {
        const confidence = Math.round(analysis.confidence * 100);
        const riskEmoji = this.getRiskEmoji(analysis.riskLevel);
        const categoryEmoji = this.getCategoryEmoji(analysis.category);
        
        return `${riskEmoji}${categoryEmoji} ${confidence}%`;
    }

    private getThemeColors(riskLevel: string, isDark: boolean): { foreground: vscode.ThemeColor; background?: vscode.ThemeColor } {
        switch (riskLevel) {
            case 'high':
                return {
                    foreground: new vscode.ThemeColor('errorForeground')
                };
            case 'medium':
                return {
                    foreground: new vscode.ThemeColor('warningForeground')
                };
            case 'low':
                return {
                    foreground: new vscode.ThemeColor('foreground')
                };
            default:
                return {
                    foreground: new vscode.ThemeColor('foreground')
                };
        }
    }

    private getRiskIcon(riskLevel: string): vscode.ThemeIcon {
        switch (riskLevel) {
            case 'high':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
            case 'medium':
                return new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
            case 'low':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('foreground'));
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    private getRiskEmoji(riskLevel: string): string {
        switch (riskLevel) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    private getCategoryEmoji(category: string): string {
        switch (category) {
            case 'test': return '🧪';
            case 'documentation': return '📚';
            case 'config': return '⚙️';
            case 'feature': return '✨';
            case 'bugfix': return '🐛';
            case 'refactor': return '♻️';
            default: return '📄';
        }
    }

    public getDecorations(uri: vscode.Uri): vscode.SourceControlResourceDecorations | undefined {
        return this.decorationMap.get(uri.toString());
    }

    public provideSourceControlResourceDecorations(
        uri: vscode.Uri,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.SourceControlResourceDecorations> {
        return this.getDecorations(uri);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.decorationMap.clear();
    }
}

export class SourceControlManager {
    private scmService: ScmIntegrationService;
    private analysisService: FileAnalysisService;
    private decorationProvider: SourceControlDecorationProvider;
    private disposables: vscode.Disposable[] = [];

    constructor(scmService: ScmIntegrationService) {
        this.scmService = scmService;
        this.analysisService = FileAnalysisService.getInstance();
        this.decorationProvider = new SourceControlDecorationProvider(scmService);
        this.initialize();
    }

    private initialize(): void {
        // Register the decoration provider with the git extension
        this.registerWithGitExtension();
        
        // Add commands for SCM resource interactions
        this.registerCommands();
    }

    private async registerWithGitExtension(): Promise<void> {
        try {
            // Get the git extension
            const gitExtension = vscode.extensions.getExtension<any>('vscode.git');
            if (!gitExtension) {
                console.warn('Git extension not found for SCM decorations');
                return;
            }

            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }

            // Note: Direct SCM decoration registration is limited in VS Code
            // We'll implement this through the SCM API when possible
            console.log('SCM decoration provider initialized');
            
        } catch (error) {
            console.error('Failed to register SCM decoration provider:', error);
        }
    }

    private registerCommands(): void {
        // Command to show enhanced file details from SCM list
        const showEnhancedFileDetailsCommand = vscode.commands.registerCommand(
            'amp-scm.showEnhancedFileDetails',
            (resourceUri: vscode.Uri) => {
                this.showEnhancedFileDetails(resourceUri);
            }
        );

        // Command to open file with Amp analysis context
        const openFileWithAnalysisCommand = vscode.commands.registerCommand(
            'amp-scm.openFileWithAnalysis',
            (resourceUri: vscode.Uri) => {
                this.openFileWithAnalysis(resourceUri);
            }
        );

        // Command to show quick analysis picker
        const showAnalysisPickerCommand = vscode.commands.registerCommand(
            'amp-scm.showAnalysisPicker',
            () => {
                this.showAnalysisPicker();
            }
        );

        // Command to generate analysis report
        const generateAnalysisReportCommand = vscode.commands.registerCommand(
            'amp-scm.generateAnalysisReport',
            () => {
                this.generateAnalysisReport();
            }
        );

        this.disposables.push(
            showEnhancedFileDetailsCommand,
            openFileWithAnalysisCommand,
            showAnalysisPickerCommand,
            generateAnalysisReportCommand
        );
    }

    private async showEnhancedFileDetails(uri: vscode.Uri): Promise<void> {
        const analysis = this.scmService.getFileAnalysis(uri);
        if (!analysis) {
            vscode.window.showWarningMessage('No Amp analysis available for this file');
            return;
        }

        const summary = this.analysisService.getFileSummary(analysis);
        const fileName = vscode.workspace.asRelativePath(uri);
        
        // Show detailed information in a modal
        const message = `**Enhanced File Details**\n\n` +
                       `**File:** ${fileName}\n` +
                       `**Summary:** ${summary.summary}\n\n` +
                       `${summary.tooltip}`;

        const actions = ['Open File', 'Open Diff', 'Mark as Reviewed'];
        const selectedAction = await vscode.window.showInformationMessage(message, { modal: true }, ...actions);
        
        switch (selectedAction) {
            case 'Open File':
                vscode.commands.executeCommand('vscode.open', uri);
                break;
            case 'Open Diff':
                vscode.commands.executeCommand('amp-scm.openDiff', uri);
                break;
            case 'Mark as Reviewed':
                vscode.commands.executeCommand('amp-scm.markAsReviewed', uri);
                break;
        }
    }

    private openFileWithAnalysis(uri: vscode.Uri): void {
        // Open the file and show analysis information
        vscode.commands.executeCommand('vscode.open', uri).then(() => {
            const analysis = this.scmService.getFileAnalysis(uri);
            if (analysis) {
                const summary = this.analysisService.getFileSummary(analysis);
                vscode.window.showInformationMessage(
                    `📊 Amp Analysis: ${summary.summary}`,
                    'Show Details'
                ).then((action) => {
                    if (action === 'Show Details') {
                        this.showEnhancedFileDetails(uri);
                    }
                });
            }
        });
    }

    private async showAnalysisPicker(): Promise<void> {
        const analyzedFiles = this.scmService.getAnalyzedFiles();
        const analyses = Array.from(analyzedFiles.values());
        
        if (analyses.length === 0) {
            vscode.window.showInformationMessage('No files to analyze');
            return;
        }

        const quickPickItems = this.analysisService.getQuickPickItems(analyses);
        
        const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: 'Select a file to review',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selectedItem) {
            // Find the corresponding analysis
            const selectedAnalysis = analyses.find(analysis => {
                const relativePath = vscode.workspace.asRelativePath(analysis.change.uri);
                return (selectedItem as vscode.QuickPickItem).label.includes(relativePath);
            });

            if (selectedAnalysis) {
                vscode.commands.executeCommand('vscode.open', selectedAnalysis.change.uri);
            }
        }
    }

    private async generateAnalysisReport(): Promise<void> {
        const analyzedFiles = this.scmService.getAnalyzedFiles();
        const analyses = Array.from(analyzedFiles.values());
        
        if (analyses.length === 0) {
            vscode.window.showInformationMessage('No files to include in report');
            return;
        }

        const report = this.analysisService.createAnalysisReport(analyses);
        
        // Create a new untitled document with the report
        const document = await vscode.workspace.openTextDocument({
            content: report,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage('📊 Analysis report generated');
    }

    public getDecorationProvider(): SourceControlDecorationProvider {
        return this.decorationProvider;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.decorationProvider.dispose();
    }
}
