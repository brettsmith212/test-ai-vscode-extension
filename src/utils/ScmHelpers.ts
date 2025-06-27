import * as vscode from 'vscode';
import { AmpFileAnalysis, GitFileChange, GitChangeStatus } from '../types/scm';

export class ScmHelpers {
    
    /**
     * Formats a file change status for display
     */
    public static formatChangeStatus(status: GitChangeStatus): string {
        switch (status) {
            case GitChangeStatus.Added:
                return 'Added';
            case GitChangeStatus.Modified:
                return 'Modified';
            case GitChangeStatus.Deleted:
                return 'Deleted';
            case GitChangeStatus.Renamed:
                return 'Renamed';
            case GitChangeStatus.Untracked:
                return 'Untracked';
            default:
                return 'Unknown';
        }
    }

    /**
     * Gets the appropriate icon for a change status
     */
    public static getChangeStatusIcon(status: GitChangeStatus): vscode.ThemeIcon {
        switch (status) {
            case GitChangeStatus.Added:
                return new vscode.ThemeIcon('add', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
            case GitChangeStatus.Modified:
                return new vscode.ThemeIcon('edit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
            case GitChangeStatus.Deleted:
                return new vscode.ThemeIcon('remove', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'));
            case GitChangeStatus.Renamed:
                return new vscode.ThemeIcon('arrow-right', new vscode.ThemeColor('gitDecoration.renamedResourceForeground'));
            case GitChangeStatus.Untracked:
                return new vscode.ThemeIcon('question', new vscode.ThemeColor('gitDecoration.untrackedResourceForeground'));
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    /**
     * Formats risk level for display with appropriate styling
     */
    public static formatRiskLevel(riskLevel: string): { text: string; color: vscode.ThemeColor; icon: string } {
        switch (riskLevel) {
            case 'high':
                return {
                    text: 'High Risk',
                    color: new vscode.ThemeColor('errorForeground'),
                    icon: '🔴'
                };
            case 'medium':
                return {
                    text: 'Medium Risk',
                    color: new vscode.ThemeColor('warningForeground'),
                    icon: '🟡'
                };
            case 'low':
                return {
                    text: 'Low Risk',
                    color: new vscode.ThemeColor('foreground'),
                    icon: '🟢'
                };
            default:
                return {
                    text: 'Unknown Risk',
                    color: new vscode.ThemeColor('foreground'),
                    icon: '⚪'
                };
        }
    }

    /**
     * Formats category for display with appropriate icon
     */
    public static formatCategory(category: string): { text: string; icon: string; description: string } {
        switch (category) {
            case 'test':
                return {
                    text: 'Test',
                    icon: '🧪',
                    description: 'Test files and testing utilities'
                };
            case 'documentation':
                return {
                    text: 'Documentation',
                    icon: '📚',
                    description: 'Documentation and README files'
                };
            case 'config':
                return {
                    text: 'Configuration',
                    icon: '⚙️',
                    description: 'Configuration and settings files'
                };
            case 'feature':
                return {
                    text: 'Feature',
                    icon: '✨',
                    description: 'New features and functionality'
                };
            case 'bugfix':
                return {
                    text: 'Bug Fix',
                    icon: '🐛',
                    description: 'Bug fixes and corrections'
                };
            case 'refactor':
                return {
                    text: 'Refactor',
                    icon: '♻️',
                    description: 'Code refactoring and restructuring'
                };
            default:
                return {
                    text: 'Other',
                    icon: '📄',
                    description: 'Other changes'
                };
        }
    }

    /**
     * Formats confidence as a percentage with appropriate styling
     */
    public static formatConfidence(confidence: number): { 
        percentage: string; 
        color: vscode.ThemeColor; 
        icon: string;
        description: string;
    } {
        const percentage = Math.round(confidence * 100);
        
        if (percentage >= 90) {
            return {
                percentage: `${percentage}%`,
                color: new vscode.ThemeColor('foreground'),
                icon: '✅',
                description: 'High confidence'
            };
        } else if (percentage >= 70) {
            return {
                percentage: `${percentage}%`,
                color: new vscode.ThemeColor('foreground'),
                icon: '✓',
                description: 'Good confidence'
            };
        } else if (percentage >= 50) {
            return {
                percentage: `${percentage}%`,
                color: new vscode.ThemeColor('warningForeground'),
                icon: '⚠️',
                description: 'Moderate confidence'
            };
        } else {
            return {
                percentage: `${percentage}%`,
                color: new vscode.ThemeColor('errorForeground'),
                icon: '❓',
                description: 'Low confidence'
            };
        }
    }

    /**
     * Formats coverage impact for display
     */
    public static formatCoverageImpact(coverageImpact?: { before: number; after: number; delta: number }): {
        text: string;
        color: vscode.ThemeColor;
        icon: string;
        description: string;
    } | null {
        if (!coverageImpact) {
            return null;
        }

        const delta = coverageImpact.delta;
        const deltaText = delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
        
        if (delta > 5) {
            return {
                text: deltaText,
                color: new vscode.ThemeColor('foreground'),
                icon: '📈',
                description: 'Significant coverage increase'
            };
        } else if (delta > 0) {
            return {
                text: deltaText,
                color: new vscode.ThemeColor('foreground'),
                icon: '↗️',
                description: 'Coverage increase'
            };
        } else if (delta < -5) {
            return {
                text: deltaText,
                color: new vscode.ThemeColor('errorForeground'),
                icon: '📉',
                description: 'Significant coverage decrease'
            };
        } else if (delta < 0) {
            return {
                text: deltaText,
                color: new vscode.ThemeColor('warningForeground'),
                icon: '↘️',
                description: 'Coverage decrease'
            };
        } else {
            return {
                text: 'No change',
                color: new vscode.ThemeColor('foreground'),
                icon: '➡️',
                description: 'No coverage change'
            };
        }
    }

    /**
     * Creates a compact summary string for an analysis
     */
    public static createCompactSummary(analysis: AmpFileAnalysis): string {
        const risk = this.formatRiskLevel(analysis.riskLevel);
        const category = this.formatCategory(analysis.category);
        const confidence = this.formatConfidence(analysis.confidence);
        
        return `${risk.icon} ${category.icon} ${confidence.percentage}`;
    }

    /**
     * Creates a detailed description for an analysis
     */
    public static createDetailedDescription(analysis: AmpFileAnalysis): string {
        const risk = this.formatRiskLevel(analysis.riskLevel);
        const category = this.formatCategory(analysis.category);
        const confidence = this.formatConfidence(analysis.confidence);
        const coverage = this.formatCoverageImpact(analysis.coverageImpact);
        
        let description = `${risk.text} • ${category.text} • ${confidence.description}`;
        
        if (coverage) {
            description += ` • Coverage: ${coverage.text}`;
        }
        
        return description;
    }

    /**
     * Sorts analyses by priority (risk level, then confidence)
     */
    public static sortByPriority(analyses: AmpFileAnalysis[]): AmpFileAnalysis[] {
        const riskOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        
        return analyses.sort((a, b) => {
            // First sort by risk level (high to low)
            const riskComparison = riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
            if (riskComparison !== 0) {
                return riskComparison;
            }
            
            // Then sort by confidence (low to high for same risk level)
            return a.confidence - b.confidence;
        });
    }

    /**
     * Filters analyses by various criteria
     */
    public static filterAnalyses(
        analyses: AmpFileAnalysis[], 
        filters: {
            riskLevels?: string[];
            categories?: string[];
            minConfidence?: number;
            maxConfidence?: number;
            hasRationale?: boolean;
            hasCoverageImpact?: boolean;
        }
    ): AmpFileAnalysis[] {
        return analyses.filter(analysis => {
            if (filters.riskLevels && !filters.riskLevels.includes(analysis.riskLevel)) {
                return false;
            }
            
            if (filters.categories && !filters.categories.includes(analysis.category)) {
                return false;
            }
            
            if (filters.minConfidence !== undefined && analysis.confidence < filters.minConfidence) {
                return false;
            }
            
            if (filters.maxConfidence !== undefined && analysis.confidence > filters.maxConfidence) {
                return false;
            }
            
            if (filters.hasRationale !== undefined) {
                const hasRationale = Boolean(analysis.rationale);
                if (filters.hasRationale !== hasRationale) {
                    return false;
                }
            }
            
            if (filters.hasCoverageImpact !== undefined) {
                const hasCoverageImpact = Boolean(analysis.coverageImpact);
                if (filters.hasCoverageImpact !== hasCoverageImpact) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Calculates statistics for a set of analyses
     */
    public static calculateStatistics(analyses: AmpFileAnalysis[]): {
        totalFiles: number;
        riskDistribution: Record<string, number>;
        categoryDistribution: Record<string, number>;
        averageConfidence: number;
        averageCoverageImpact: number;
        filesWithCoverage: number;
    } {
        const stats = {
            totalFiles: analyses.length,
            riskDistribution: { high: 0, medium: 0, low: 0 },
            categoryDistribution: {} as Record<string, number>,
            averageConfidence: 0,
            averageCoverageImpact: 0,
            filesWithCoverage: 0
        };

        let totalConfidence = 0;
        let totalCoverageImpact = 0;

        for (const analysis of analyses) {
            // Risk distribution
            stats.riskDistribution[analysis.riskLevel]++;
            
            // Category distribution
            stats.categoryDistribution[analysis.category] = 
                (stats.categoryDistribution[analysis.category] || 0) + 1;
            
            // Confidence
            totalConfidence += analysis.confidence;
            
            // Coverage impact
            if (analysis.coverageImpact) {
                totalCoverageImpact += analysis.coverageImpact.delta;
                stats.filesWithCoverage++;
            }
        }

        stats.averageConfidence = analyses.length > 0 ? totalConfidence / analyses.length : 0;
        stats.averageCoverageImpact = stats.filesWithCoverage > 0 ? 
            totalCoverageImpact / stats.filesWithCoverage : 0;

        return stats;
    }

    /**
     * Creates a readable file path from a URI
     */
    public static getReadableFilePath(uri: vscode.Uri): string {
        return vscode.workspace.asRelativePath(uri, false);
    }

    /**
     * Gets file extension from a URI
     */
    public static getFileExtension(uri: vscode.Uri): string {
        const path = uri.fsPath;
        const lastDot = path.lastIndexOf('.');
        return lastDot !== -1 ? path.substring(lastDot + 1).toLowerCase() : '';
    }

    /**
     * Determines if a file is likely a test file
     */
    public static isTestFile(uri: vscode.Uri): boolean {
        const path = uri.fsPath.toLowerCase();
        return path.includes('test') || 
               path.includes('spec') || 
               path.includes('__tests__') ||
               path.endsWith('.test.ts') ||
               path.endsWith('.test.js') ||
               path.endsWith('.spec.ts') ||
               path.endsWith('.spec.js');
    }

    /**
     * Determines if a file is likely a configuration file
     */
    public static isConfigFile(uri: vscode.Uri): boolean {
        const path = uri.fsPath.toLowerCase();
        const fileName = path.split('/').pop() || '';
        
        return path.includes('config') ||
               fileName.startsWith('.') ||
               fileName === 'package.json' ||
               fileName === 'tsconfig.json' ||
               fileName === 'webpack.config.js' ||
               fileName.includes('docker') ||
               path.includes('.env');
    }

    /**
     * Determines if a file is likely a documentation file
     */
    public static isDocumentationFile(uri: vscode.Uri): boolean {
        const path = uri.fsPath.toLowerCase();
        const extension = this.getFileExtension(uri);
        
        return extension === 'md' ||
               extension === 'txt' ||
               extension === 'rst' ||
               path.includes('readme') ||
               path.includes('docs') ||
               path.includes('documentation');
    }

    /**
     * Creates a VS Code command URI for executing commands with parameters
     */
    public static createCommandUri(command: string, args?: any[]): vscode.Uri {
        return vscode.Uri.parse(`command:${command}${args ? `?${encodeURIComponent(JSON.stringify(args))}` : ''}`);
    }

    /**
     * Debounces a function call
     */
    public static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * Creates a progress reporter for long-running operations
     */
    public static async withProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        }, task);
    }

    /**
     * Shows an error message with appropriate formatting
     */
    public static showError(message: string, ...actions: string[]): Thenable<string | undefined> {
        return vscode.window.showErrorMessage(`🚨 Amp SCM: ${message}`, ...actions);
    }

    /**
     * Shows a warning message with appropriate formatting
     */
    public static showWarning(message: string, ...actions: string[]): Thenable<string | undefined> {
        return vscode.window.showWarningMessage(`⚠️ Amp SCM: ${message}`, ...actions);
    }

    /**
     * Shows an info message with appropriate formatting
     */
    public static showInfo(message: string, ...actions: string[]): Thenable<string | undefined> {
        return vscode.window.showInformationMessage(`ℹ️ Amp SCM: ${message}`, ...actions);
    }
}
