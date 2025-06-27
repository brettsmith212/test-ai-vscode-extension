import * as vscode from 'vscode';
import { ScmIntegrationService } from '../services/ScmIntegrationService';
import { RationaleService } from '../services/RationaleService';
import { AmpFileAnalysis } from '../types/scm';

export class HoverProvider implements vscode.HoverProvider {
    private scmService: ScmIntegrationService;
    private rationaleService: RationaleService;

    constructor(scmService: ScmIntegrationService) {
        this.scmService = scmService;
        this.rationaleService = RationaleService.getInstance();
    }

    public async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        
        // Check if this file has analysis data
        const analysis = this.scmService.getFileAnalysis(document.uri);
        if (!analysis) {
            return undefined;
        }

        // Check if we should show hover for this position
        if (!this.shouldShowHover(document, position, analysis)) {
            return undefined;
        }

        // Create hover content
        const hoverContent = this.createHoverContent(analysis, position.line);
        const range = this.getHoverRange(document, position);

        return new vscode.Hover(hoverContent, range);
    }

    private shouldShowHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        analysis: AmpFileAnalysis
    ): boolean {
        // Check configuration
        const config = vscode.workspace.getConfiguration('ampScm');
        if (!config.get<boolean>('enableDecorations', true)) {
            return false;
        }

        // Only show hovers on lines that would have decorations
        // This is a simplified check - in a real implementation, 
        // this would coordinate with the decoration logic
        return this.isChangeRelatedLine(document, position.line, analysis);
    }

    private isChangeRelatedLine(
        document: vscode.TextDocument,
        lineNumber: number,
        analysis: AmpFileAnalysis
    ): boolean {
        // Mock implementation - would use git diff in real scenario
        const totalLines = document.lineCount;
        const changeCount = analysis.riskLevel === 'high' ? 3 : 
                           analysis.riskLevel === 'medium' ? 2 : 1;
        
        // Check if this line is one of the "changed" lines
        for (let i = 0; i < changeCount; i++) {
            const mockChangedLine = Math.floor((i + 1) * totalLines / (changeCount + 1));
            if (Math.abs(lineNumber - mockChangedLine) <= 1) {
                return true;
            }
        }
        
        return false;
    }

    private createHoverContent(analysis: AmpFileAnalysis, lineNumber: number): vscode.MarkdownString[] {
        const contents: vscode.MarkdownString[] = [];

        // Main hover content
        const mainContent = new vscode.MarkdownString();
        mainContent.isTrusted = true;
        mainContent.supportHtml = true;

        // Header with risk indicator
        const riskEmoji = this.getRiskEmoji(analysis.riskLevel);
        const riskColor = this.getRiskColor(analysis.riskLevel);
        
        mainContent.appendMarkdown(`# ${riskEmoji} Amp Analysis\n\n`);
        
        // Risk badge
        mainContent.appendMarkdown(
            `<span style="background-color: ${riskColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold;">${analysis.riskLevel.toUpperCase()}</span> `
        );
        
        // Category badge
        mainContent.appendMarkdown(
            `<span style="background-color: #666; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 4px;">${analysis.category.toUpperCase()}</span>\n\n`
        );

        // Quick rationale
        const quickRationale = this.rationaleService.getQuickRationale(analysis);
        mainContent.appendMarkdown(`**${quickRationale}**\n\n`);

        // Confidence indicator
        const confidence = Math.round(analysis.confidence * 100);
        const confidenceBar = this.createProgressBar(confidence);
        mainContent.appendMarkdown(`**Confidence:** ${confidence}% ${confidenceBar}\n\n`);

        // Coverage impact if available
        if (analysis.coverageImpact) {
            const delta = analysis.coverageImpact.delta;
            const deltaSymbol = delta > 0 ? '+' : '';
            const deltaColor = delta > 0 ? '#22c55e' : delta < 0 ? '#f14c4c' : '#666';
            mainContent.appendMarkdown(
                `**Coverage:** <span style="color: ${deltaColor}">${deltaSymbol}${delta.toFixed(1)}%</span> (${analysis.coverageImpact.before}% → ${analysis.coverageImpact.after}%)\n\n`
            );
        }

        contents.push(mainContent);

        // Detailed rationale (collapsible)
        const detailedContent = new vscode.MarkdownString();
        detailedContent.isTrusted = true;
        
        const detailedRationale = this.rationaleService.getDetailedRationale(analysis, lineNumber);
        detailedContent.appendMarkdown(`---\n\n${detailedRationale}`);
        
        contents.push(detailedContent);

        // Action buttons
        const actionsContent = new vscode.MarkdownString();
        actionsContent.isTrusted = true;
        
        actionsContent.appendMarkdown(`---\n\n`);
        actionsContent.appendMarkdown(
            `[📊 Open Diff](command:amp-scm.openDiff?${encodeURIComponent(JSON.stringify([analysis.change.uri]))}) | `
        );
        actionsContent.appendMarkdown(
            `[✅ Mark Reviewed](command:amp-scm.markAsReviewed?${encodeURIComponent(JSON.stringify([analysis.change.uri]))}) | `
        );
        actionsContent.appendMarkdown(
            `[🔄 Refresh Analysis](command:amp-scm.refreshAnalysis)`
        );

        contents.push(actionsContent);

        return contents;
    }

    private getHoverRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
        const line = document.lineAt(position.line);
        
        // If the line is empty or whitespace only, hover the entire line
        if (line.text.trim().length === 0) {
            return line.range;
        }

        // Find word boundaries around the cursor position
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange) {
            return wordRange;
        }

        // Fallback to entire line
        return line.range;
    }

    private getRiskEmoji(riskLevel: string): string {
        switch (riskLevel) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    private getRiskColor(riskLevel: string): string {
        switch (riskLevel) {
            case 'high': return '#f14c4c';
            case 'medium': return '#ff9500';
            case 'low': return '#007ACC';
            default: return '#666';
        }
    }

    private createProgressBar(percentage: number): string {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        
        const filledBlocks = '█'.repeat(filled);
        const emptyBlocks = '░'.repeat(empty);
        
        return `\`${filledBlocks}${emptyBlocks}\``;
    }

    public dispose(): void {
        // No cleanup needed for this provider
    }
}
