import * as vscode from 'vscode';
import * as path from 'path';
import { AmpFileAnalysis } from '../types/scm';

export class DecorationProvider {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
        this.createDecorationTypes();
    }

    private createDecorationTypes(): void {
        // Low risk decoration (info icon)
        this.decorationTypes.set('low', vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.joinPath(this.extensionUri, 'src', 'assets', 'icons', 'info.svg'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#007ACC',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            isWholeLine: false
        }));

        // Medium risk decoration (warning icon)
        this.decorationTypes.set('medium', vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.joinPath(this.extensionUri, 'src', 'assets', 'icons', 'warning.svg'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#ff9500',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            backgroundColor: 'rgba(255, 149, 0, 0.1)',
            isWholeLine: false
        }));

        // High risk decoration (error icon)
        this.decorationTypes.set('high', vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.joinPath(this.extensionUri, 'src', 'assets', 'icons', 'error.svg'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#f14c4c',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            backgroundColor: 'rgba(241, 76, 76, 0.1)',
            isWholeLine: false,
            border: '1px solid rgba(241, 76, 76, 0.3)'
        }));

        // Success/reviewed decoration
        this.decorationTypes.set('reviewed', vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.joinPath(this.extensionUri, 'src', 'assets', 'icons', 'success.svg'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#22c55e',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            isWholeLine: false
        }));
    }

    public applyDecorations(editor: vscode.TextEditor, analysis: AmpFileAnalysis): void {
        if (!this.shouldApplyDecorations()) {
            return;
        }

        // Clear existing decorations for this file
        this.clearDecorations(editor);

        // Apply new decorations based on analysis
        const decorationType = this.decorationTypes.get(analysis.riskLevel);
        if (!decorationType) {
            return;
        }

        const decorations = this.calculateDecorationRanges(editor, analysis);
        editor.setDecorations(decorationType, decorations);
    }

    private calculateDecorationRanges(editor: vscode.TextEditor, analysis: AmpFileAnalysis): vscode.DecorationOptions[] {
        const decorations: vscode.DecorationOptions[] = [];
        const document = editor.document;

        // For now, add decorations to specific lines based on file type and content
        // In a real implementation, this would use git diff to find changed lines
        const linesToDecorate = this.getChangedLines(document, analysis);

        for (const lineNumber of linesToDecorate) {
            if (lineNumber < document.lineCount) {
                const line = document.lineAt(lineNumber);
                const range = new vscode.Range(lineNumber, 0, lineNumber, line.text.length);
                
                decorations.push({
                    range,
                    hoverMessage: this.createHoverMessage(analysis, lineNumber)
                });
            }
        }

        return decorations;
    }

    private getChangedLines(document: vscode.TextDocument, analysis: AmpFileAnalysis): number[] {
        // Mock implementation - in reality, would use git diff
        const lines: number[] = [];
        const totalLines = document.lineCount;
        
        // Add some mock changed lines based on file type and risk level
        const changeCount = analysis.riskLevel === 'high' ? 3 : 
                           analysis.riskLevel === 'medium' ? 2 : 1;
        
        for (let i = 0; i < changeCount && i < totalLines; i++) {
            // Spread decorations throughout the file
            const lineNumber = Math.floor((i + 1) * totalLines / (changeCount + 1));
            lines.push(Math.min(lineNumber, totalLines - 1));
        }

        return lines;
    }

    private createHoverMessage(analysis: AmpFileAnalysis, lineNumber: number): vscode.MarkdownString {
        const hover = new vscode.MarkdownString();
        hover.isTrusted = true;
        hover.supportHtml = true;

        // Risk level indicator
        const riskEmoji = analysis.riskLevel === 'high' ? '🔴' : 
                         analysis.riskLevel === 'medium' ? '🟡' : '🟢';
        
        hover.appendMarkdown(`### ${riskEmoji} Amp Analysis\n\n`);
        
        // Risk level and category
        hover.appendMarkdown(`**Risk Level:** ${analysis.riskLevel.toUpperCase()}\n\n`);
        hover.appendMarkdown(`**Category:** ${analysis.category}\n\n`);
        
        // Rationale
        if (analysis.rationale) {
            hover.appendMarkdown(`**Why this changed:**\n${analysis.rationale}\n\n`);
        }
        
        // Confidence
        hover.appendMarkdown(`**Confidence:** ${Math.round(analysis.confidence * 100)}%\n\n`);
        
        // Coverage impact if available
        if (analysis.coverageImpact) {
            const delta = analysis.coverageImpact.delta;
            const deltaSymbol = delta > 0 ? '+' : '';
            hover.appendMarkdown(`**Coverage Impact:** ${deltaSymbol}${delta.toFixed(1)}%\n\n`);
        }
        
        // Action buttons
        hover.appendMarkdown(`[Open Diff](command:amp-scm.openDiff?${encodeURIComponent(JSON.stringify([analysis.change.uri]))}) | `);
        hover.appendMarkdown(`[Mark as Reviewed](command:amp-scm.markAsReviewed?${encodeURIComponent(JSON.stringify([analysis.change.uri]))})`);

        return hover;
    }

    private shouldApplyDecorations(): boolean {
        const config = vscode.workspace.getConfiguration('ampScm');
        return config.get<boolean>('enableDecorations', true);
    }

    public clearDecorations(editor: vscode.TextEditor): void {
        for (const decorationType of this.decorationTypes.values()) {
            editor.setDecorations(decorationType, []);
        }
    }

    public clearAllDecorations(): void {
        for (const editor of vscode.window.visibleTextEditors) {
            this.clearDecorations(editor);
        }
    }

    public dispose(): void {
        for (const decorationType of this.decorationTypes.values()) {
            decorationType.dispose();
        }
        this.decorationTypes.clear();
    }
}
