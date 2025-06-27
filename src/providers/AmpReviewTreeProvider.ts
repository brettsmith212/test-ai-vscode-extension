import * as vscode from 'vscode';
import { ScmIntegrationService } from '../services/ScmIntegrationService';
import { AmpFileAnalysis } from '../types/scm';
import { AmpReviewTreeItem, AmpReviewGroup, GroupType, TreeViewConfiguration, TreeViewStats } from '../types/treeView';

export class AmpReviewTreeProvider implements vscode.TreeDataProvider<AmpReviewTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AmpReviewTreeItem | undefined | null | void> = new vscode.EventEmitter<AmpReviewTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AmpReviewTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private scmService: ScmIntegrationService;
    private configuration: TreeViewConfiguration;
    private disposables: vscode.Disposable[] = [];

    constructor(scmService: ScmIntegrationService) {
        this.scmService = scmService;
        this.configuration = this.getDefaultConfiguration();
        this.initialize();
    }

    private initialize(): void {
        // Listen for SCM state changes
        this.disposables.push(
            this.scmService.onDidChangeState(() => {
                this.refresh();
            })
        );

        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('ampScm')) {
                    this.updateConfiguration();
                    this.refresh();
                }
            })
        );
    }

    private getDefaultConfiguration(): TreeViewConfiguration {
        const config = vscode.workspace.getConfiguration('ampScm');
        return {
            groupBy: config.get<'risk' | 'category' | 'fileType'>('treeView.groupBy', 'risk'),
            showFileCount: config.get<boolean>('treeView.showFileCount', true),
            expandGroups: config.get<boolean>('treeView.expandGroups', true),
            sortOrder: config.get<'alphabetical' | 'priority' | 'riskLevel'>('treeView.sortOrder', 'priority')
        };
    }

    private updateConfiguration(): void {
        this.configuration = this.getDefaultConfiguration();
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AmpReviewTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AmpReviewTreeItem): Thenable<AmpReviewTreeItem[]> {
        if (!element) {
            // Root level - return groups
            return Promise.resolve(this.getRootGroups());
        } else if (element.type === 'group') {
            // Group level - return files in group
            return Promise.resolve(this.getGroupFiles(element.groupId!));
        } else {
            // File level - no children
            return Promise.resolve([]);
        }
    }

    private getRootGroups(): AmpReviewTreeItem[] {
        const analyzedFiles = this.scmService.getAnalyzedFiles();
        if (analyzedFiles.size === 0) {
            return this.getEmptyStateItems();
        }

        const groups = this.createGroups(Array.from(analyzedFiles.values()));
        return groups.map(group => this.createGroupItem(group));
    }

    private getEmptyStateItems(): AmpReviewTreeItem[] {
        return [{
            type: 'group' as const,
            label: 'No changes to review',
            description: 'Make some file changes to see analysis',
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            iconPath: new vscode.ThemeIcon('info'),
            contextValue: 'empty-state'
        }];
    }

    private createGroups(files: AmpFileAnalysis[]): AmpReviewGroup[] {
        const groups: Map<string, AmpReviewGroup> = new Map();

        // Initialize groups based on configuration
        switch (this.configuration.groupBy) {
            case 'risk':
                this.initializeRiskGroups(groups);
                break;
            case 'category':
                this.initializeCategoryGroups(groups);
                break;
            case 'fileType':
                this.initializeFileTypeGroups(groups);
                break;
        }

        // Distribute files into groups
        for (const file of files) {
            const groupId = this.getGroupId(file);
            const group = groups.get(groupId);
            if (group) {
                group.files.push(file);
            }
        }

        // Filter out empty groups and sort
        const nonEmptyGroups = Array.from(groups.values())
            .filter(group => group.files.length > 0)
            .sort((a, b) => this.compareGroups(a, b));

        return nonEmptyGroups;
    }

    private initializeRiskGroups(groups: Map<string, AmpReviewGroup>): void {
        groups.set('high', {
            id: 'high',
            label: 'High Risk',
            description: 'Requires careful review',
            collapsibleState: this.configuration.expandGroups ? 
                vscode.TreeItemCollapsibleState.Expanded : 
                vscode.TreeItemCollapsibleState.Collapsed,
            icon: new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground')),
            files: [],
            priority: 1
        });

        groups.set('medium', {
            id: 'medium',
            label: 'Medium Risk',
            description: 'Standard review needed',
            collapsibleState: this.configuration.expandGroups ? 
                vscode.TreeItemCollapsibleState.Expanded : 
                vscode.TreeItemCollapsibleState.Collapsed,
            icon: new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground')),
            files: [],
            priority: 2
        });

        groups.set('low', {
            id: 'low',
            label: 'Low Risk',
            description: 'Safe changes',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            icon: new vscode.ThemeIcon('check', new vscode.ThemeColor('foreground')),
            files: [],
            priority: 3
        });
    }

    private initializeCategoryGroups(groups: Map<string, AmpReviewGroup>): void {
        const categoryConfigs = [
            { id: 'feature', label: 'Features', icon: 'symbol-method', priority: 1 },
            { id: 'bugfix', label: 'Bug Fixes', icon: 'bug', priority: 2 },
            { id: 'refactor', label: 'Refactoring', icon: 'symbol-class', priority: 3 },
            { id: 'test', label: 'Tests', icon: 'beaker', priority: 4 },
            { id: 'documentation', label: 'Documentation', icon: 'book', priority: 5 },
            { id: 'config', label: 'Configuration', icon: 'gear', priority: 6 }
        ];

        for (const config of categoryConfigs) {
            groups.set(config.id, {
                id: config.id,
                label: config.label,
                collapsibleState: this.configuration.expandGroups ? 
                    vscode.TreeItemCollapsibleState.Expanded : 
                    vscode.TreeItemCollapsibleState.Collapsed,
                icon: new vscode.ThemeIcon(config.icon),
                files: [],
                priority: config.priority
            });
        }
    }

    private initializeFileTypeGroups(groups: Map<string, AmpReviewGroup>): void {
        const typeConfigs = [
            { id: 'typescript', label: 'TypeScript', icon: 'symbol-class', priority: 1 },
            { id: 'javascript', label: 'JavaScript', icon: 'symbol-method', priority: 2 },
            { id: 'config', label: 'Configuration', icon: 'gear', priority: 3 },
            { id: 'documentation', label: 'Documentation', icon: 'book', priority: 4 },
            { id: 'other', label: 'Other Files', icon: 'file', priority: 5 }
        ];

        for (const config of typeConfigs) {
            groups.set(config.id, {
                id: config.id,
                label: config.label,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                icon: new vscode.ThemeIcon(config.icon),
                files: [],
                priority: config.priority
            });
        }
    }

    private getGroupId(file: AmpFileAnalysis): string {
        switch (this.configuration.groupBy) {
            case 'risk':
                return file.riskLevel;
            case 'category':
                return file.category;
            case 'fileType':
                return this.getFileTypeGroup(file.change.relativePath);
            default:
                return file.riskLevel;
        }
    }

    private getFileTypeGroup(filePath: string): string {
        const path = filePath.toLowerCase();
        if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
        if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
        if (path.includes('config') || path.endsWith('.json') || path.includes('package.json')) return 'config';
        if (path.endsWith('.md') || path.includes('readme') || path.includes('doc')) return 'documentation';
        return 'other';
    }

    private compareGroups(a: AmpReviewGroup, b: AmpReviewGroup): number {
        switch (this.configuration.sortOrder) {
            case 'alphabetical':
                return a.label.localeCompare(b.label);
            case 'priority':
                return a.priority - b.priority;
            case 'riskLevel':
                // Custom risk-based sorting
                const riskOrder = { 'high': 1, 'medium': 2, 'low': 3 };
                const aRisk = riskOrder[a.id as keyof typeof riskOrder] || 4;
                const bRisk = riskOrder[b.id as keyof typeof riskOrder] || 4;
                return aRisk - bRisk;
            default:
                return a.priority - b.priority;
        }
    }

    private createGroupItem(group: AmpReviewGroup): AmpReviewTreeItem {
        const fileCount = this.configuration.showFileCount ? ` (${group.files.length})` : '';
        
        return {
            type: 'group',
            label: `${group.label}${fileCount}`,
            description: group.description,
            collapsibleState: group.collapsibleState,
            iconPath: group.icon,
            contextValue: 'amp-review-group',
            groupId: group.id,
            tooltip: `${group.files.length} files in ${group.label.toLowerCase()}`
        };
    }

    private getGroupFiles(groupId: string): AmpReviewTreeItem[] {
        const analyzedFiles = this.scmService.getAnalyzedFiles();
        const files = Array.from(analyzedFiles.values())
            .filter(file => this.getGroupId(file) === groupId)
            .sort((a, b) => a.change.relativePath.localeCompare(b.change.relativePath));

        return files.map(file => this.createFileItem(file));
    }

    private createFileItem(analysis: AmpFileAnalysis): AmpReviewTreeItem {
        const fileName = analysis.change.relativePath.split('/').pop() || analysis.change.relativePath;
        const riskIcon = this.getRiskIcon(analysis.riskLevel);
        const confidence = Math.round(analysis.confidence * 100);
        
        return {
            type: 'file',
            label: fileName,
            description: `${analysis.riskLevel} risk • ${confidence}% confidence`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            iconPath: riskIcon,
            contextValue: 'amp-review-file',
            analysis,
            command: {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [analysis.change.uri]
            },
            tooltip: this.createFileTooltip(analysis),
            resourceUri: analysis.change.uri
        };
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

    private createFileTooltip(analysis: AmpFileAnalysis): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        
        tooltip.appendMarkdown(`**${analysis.change.relativePath}**\n\n`);
        tooltip.appendMarkdown(`**Risk Level:** ${analysis.riskLevel}\n`);
        tooltip.appendMarkdown(`**Category:** ${analysis.category}\n`);
        tooltip.appendMarkdown(`**Confidence:** ${Math.round(analysis.confidence * 100)}%\n\n`);
        
        if (analysis.rationale) {
            tooltip.appendMarkdown(`**Rationale:** ${analysis.rationale}\n\n`);
        }
        
        if (analysis.coverageImpact) {
            const delta = analysis.coverageImpact.delta;
            const deltaSymbol = delta > 0 ? '+' : '';
            tooltip.appendMarkdown(`**Coverage Impact:** ${deltaSymbol}${delta.toFixed(1)}%\n`);
        }
        
        return tooltip;
    }

    public getStats(): TreeViewStats {
        const analyzedFiles = this.scmService.getAnalyzedFiles();
        const files = Array.from(analyzedFiles.values());
        
        const stats: TreeViewStats = {
            totalFiles: files.length,
            groupCounts: {},
            riskDistribution: { high: 0, medium: 0, low: 0 },
            categoryDistribution: {}
        };

        for (const file of files) {
            // Risk distribution
            stats.riskDistribution[file.riskLevel as keyof typeof stats.riskDistribution]++;
            
            // Category distribution
            stats.categoryDistribution[file.category] = (stats.categoryDistribution[file.category] || 0) + 1;
            
            // Group counts
            const groupId = this.getGroupId(file);
            stats.groupCounts[groupId] = (stats.groupCounts[groupId] || 0) + 1;
        }

        return stats;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this._onDidChangeTreeData.dispose();
    }
}
