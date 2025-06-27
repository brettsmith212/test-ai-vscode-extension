import * as vscode from 'vscode';
import { AmpFileAnalysis, GitFileChange } from '../types/scm';

export interface FileAnalysisSummary {
    riskLevel: 'low' | 'medium' | 'high';
    category: string;
    confidence: number;
    summary: string;
    badges: string[];
    tooltip: string;
    color?: vscode.ThemeColor;
}

export class FileAnalysisService {
    private static instance: FileAnalysisService;

    public static getInstance(): FileAnalysisService {
        if (!FileAnalysisService.instance) {
            FileAnalysisService.instance = new FileAnalysisService();
        }
        return FileAnalysisService.instance;
    }

    private constructor() {}

    public getFileSummary(analysis: AmpFileAnalysis): FileAnalysisSummary {
        const badges = this.generateBadges(analysis);
        const tooltip = this.generateTooltip(analysis);
        
        return {
            riskLevel: analysis.riskLevel,
            category: analysis.category,
            confidence: analysis.confidence,
            summary: this.generateSummary(analysis),
            badges,
            tooltip,
            color: this.getRiskColor(analysis.riskLevel)
        };
    }

    private generateBadges(analysis: AmpFileAnalysis): string[] {
        const badges: string[] = [];

        // Risk level badge
        switch (analysis.riskLevel) {
            case 'high':
                badges.push('🔴');
                break;
            case 'medium':
                badges.push('🟡');
                break;
            case 'low':
                badges.push('🟢');
                break;
        }

        // Category badge
        switch (analysis.category) {
            case 'test':
                badges.push('🧪');
                break;
            case 'documentation':
                badges.push('📚');
                break;
            case 'config':
                badges.push('⚙️');
                break;
            case 'feature':
                badges.push('✨');
                break;
            case 'bugfix':
                badges.push('🐛');
                break;
            case 'refactor':
                badges.push('♻️');
                break;
        }

        // Confidence indicator
        const confidence = Math.round(analysis.confidence * 100);
        if (confidence < 70) {
            badges.push('❓'); // Low confidence
        } else if (confidence > 90) {
            badges.push('✓'); // High confidence
        }

        // Coverage impact
        if (analysis.coverageImpact) {
            const delta = analysis.coverageImpact.delta;
            if (delta > 2) {
                badges.push('📈'); // Coverage increase
            } else if (delta < -2) {
                badges.push('📉'); // Coverage decrease
            }
        }

        return badges;
    }

    private generateTooltip(analysis: AmpFileAnalysis): string {
        const confidence = Math.round(analysis.confidence * 100);
        let tooltip = `🔍 Amp Analysis\n\n`;
        
        tooltip += `Risk: ${this.getRiskDisplayName(analysis.riskLevel)}\n`;
        tooltip += `Category: ${this.getCategoryDisplayName(analysis.category)}\n`;
        tooltip += `Confidence: ${confidence}%\n\n`;
        
        if (analysis.rationale) {
            tooltip += `💡 ${analysis.rationale}\n\n`;
        }
        
        if (analysis.coverageImpact) {
            const delta = analysis.coverageImpact.delta;
            const deltaSymbol = delta > 0 ? '+' : '';
            tooltip += `📊 Coverage: ${deltaSymbol}${delta.toFixed(1)}% (${analysis.coverageImpact.before}% → ${analysis.coverageImpact.after}%)\n\n`;
        }
        
        tooltip += `💡 Tip: Right-click for more options`;
        
        return tooltip;
    }

    private generateSummary(analysis: AmpFileAnalysis): string {
        const riskEmoji = this.getRiskEmoji(analysis.riskLevel);
        const categoryEmoji = this.getCategoryEmoji(analysis.category);
        const confidence = Math.round(analysis.confidence * 100);
        
        return `${riskEmoji} ${categoryEmoji} ${confidence}%`;
    }

    private getRiskDisplayName(riskLevel: string): string {
        switch (riskLevel) {
            case 'high': return 'High Risk 🔴';
            case 'medium': return 'Medium Risk 🟡';
            case 'low': return 'Low Risk 🟢';
            default: return 'Unknown Risk';
        }
    }

    private getCategoryDisplayName(category: string): string {
        switch (category) {
            case 'test': return 'Test 🧪';
            case 'documentation': return 'Documentation 📚';
            case 'config': return 'Configuration ⚙️';
            case 'feature': return 'Feature ✨';
            case 'bugfix': return 'Bug Fix 🐛';
            case 'refactor': return 'Refactor ♻️';
            default: return 'Other';
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

    private getRiskColor(riskLevel: string): vscode.ThemeColor | undefined {
        switch (riskLevel) {
            case 'high':
                return new vscode.ThemeColor('errorForeground');
            case 'medium':
                return new vscode.ThemeColor('warningForeground');
            case 'low':
                return new vscode.ThemeColor('foreground');
            default:
                return undefined;
        }
    }

    public getQuickPickItems(analyses: AmpFileAnalysis[]): vscode.QuickPickItem[] {
        return analyses.map(analysis => {
            const summary = this.getFileSummary(analysis);
            const relativePath = vscode.workspace.asRelativePath(analysis.change.uri);
            
            return {
                label: `${summary.badges.join(' ')} ${relativePath}`,
                description: summary.summary,
                detail: analysis.rationale || 'No detailed rationale available',
                buttons: [
                    {
                        iconPath: new vscode.ThemeIcon('go-to-file'),
                        tooltip: 'Open File'
                    },
                    {
                        iconPath: new vscode.ThemeIcon('diff'),
                        tooltip: 'Open Diff'
                    }
                ]
            };
        });
    }

    public filterByRisk(analyses: AmpFileAnalysis[], riskLevel: 'low' | 'medium' | 'high'): AmpFileAnalysis[] {
        return analyses.filter(analysis => analysis.riskLevel === riskLevel);
    }

    public filterByCategory(analyses: AmpFileAnalysis[], category: string): AmpFileAnalysis[] {
        return analyses.filter(analysis => analysis.category === category);
    }

    public sortByRisk(analyses: AmpFileAnalysis[]): AmpFileAnalysis[] {
        const riskOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return analyses.sort((a, b) => {
            return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        });
    }

    public sortByConfidence(analyses: AmpFileAnalysis[]): AmpFileAnalysis[] {
        return analyses.sort((a, b) => b.confidence - a.confidence);
    }

    public getStatistics(analyses: AmpFileAnalysis[]): {
        total: number;
        byRisk: Record<string, number>;
        byCategory: Record<string, number>;
        averageConfidence: number;
        coverageImpact: number;
    } {
        const stats = {
            total: analyses.length,
            byRisk: { high: 0, medium: 0, low: 0 },
            byCategory: {} as Record<string, number>,
            averageConfidence: 0,
            coverageImpact: 0
        };

        let totalConfidence = 0;
        let totalCoverageImpact = 0;
        let filesWithCoverage = 0;

        for (const analysis of analyses) {
            // Risk distribution
            stats.byRisk[analysis.riskLevel]++;
            
            // Category distribution
            stats.byCategory[analysis.category] = (stats.byCategory[analysis.category] || 0) + 1;
            
            // Confidence
            totalConfidence += analysis.confidence;
            
            // Coverage impact
            if (analysis.coverageImpact) {
                totalCoverageImpact += analysis.coverageImpact.delta;
                filesWithCoverage++;
            }
        }

        stats.averageConfidence = analyses.length > 0 ? totalConfidence / analyses.length : 0;
        stats.coverageImpact = filesWithCoverage > 0 ? totalCoverageImpact / filesWithCoverage : 0;

        return stats;
    }

    public createAnalysisReport(analyses: AmpFileAnalysis[]): string {
        const stats = this.getStatistics(analyses);
        
        let report = `# Amp Analysis Report\n\n`;
        report += `**Total Files Analyzed:** ${stats.total}\n\n`;
        
        report += `## Risk Distribution\n`;
        report += `- 🔴 High Risk: ${stats.byRisk.high} files\n`;
        report += `- 🟡 Medium Risk: ${stats.byRisk.medium} files\n`;
        report += `- 🟢 Low Risk: ${stats.byRisk.low} files\n\n`;
        
        report += `## Category Breakdown\n`;
        for (const [category, count] of Object.entries(stats.byCategory)) {
            const emoji = this.getCategoryEmoji(category);
            report += `- ${emoji} ${this.getCategoryDisplayName(category)}: ${count} files\n`;
        }
        
        report += `\n## Summary\n`;
        report += `- **Average Confidence:** ${Math.round(stats.averageConfidence * 100)}%\n`;
        if (stats.coverageImpact !== 0) {
            const impact = stats.coverageImpact > 0 ? `+${stats.coverageImpact.toFixed(1)}` : stats.coverageImpact.toFixed(1);
            report += `- **Coverage Impact:** ${impact}%\n`;
        }
        
        return report;
    }
}
