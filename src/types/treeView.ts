import * as vscode from 'vscode';
import { AmpFileAnalysis } from './scm';

export interface AmpReviewTreeItem extends vscode.TreeItem {
    readonly type: 'group' | 'file';
    readonly analysis?: AmpFileAnalysis;
    readonly children?: AmpReviewTreeItem[];
    readonly groupId?: string;
}

export interface AmpReviewGroup {
    id: string;
    label: string;
    description?: string;
    collapsibleState: vscode.TreeItemCollapsibleState;
    icon?: vscode.ThemeIcon;
    files: AmpFileAnalysis[];
    priority: number; // For sorting groups
}

export enum GroupType {
    HighRisk = 'high-risk',
    MediumRisk = 'medium-risk',
    LowRisk = 'low-risk',
    Tests = 'tests',
    Documentation = 'documentation',
    Configuration = 'configuration',
    Features = 'features',
    Bugfixes = 'bugfixes',
    Refactoring = 'refactoring'
}

export interface TreeViewConfiguration {
    groupBy: 'risk' | 'category' | 'fileType';
    showFileCount: boolean;
    expandGroups: boolean;
    sortOrder: 'alphabetical' | 'priority' | 'riskLevel';
}

export interface TreeViewStats {
    totalFiles: number;
    groupCounts: Record<string, number>;
    riskDistribution: {
        high: number;
        medium: number;
        low: number;
    };
    categoryDistribution: Record<string, number>;
}
