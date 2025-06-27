import * as vscode from 'vscode';

export interface GitFileChange {
    /** The file URI */
    uri: vscode.Uri;
    /** The type of change (added, modified, deleted, renamed) */
    status: GitChangeStatus;
    /** The original URI if the file was renamed */
    originalUri?: vscode.Uri;
    /** The relative path from the workspace root */
    relativePath: string;
}

export enum GitChangeStatus {
    Added = 'added',
    Modified = 'modified',
    Deleted = 'deleted',
    Renamed = 'renamed',
    Untracked = 'untracked'
}

export interface GitRepository {
    /** The workspace folder this repository belongs to */
    workspaceFolder: vscode.WorkspaceFolder;
    /** The root path of the git repository */
    rootPath: string;
    /** Get the current branch name */
    getCurrentBranch(): Promise<string>;
    /** Get all changed files */
    getChangedFiles(): Promise<GitFileChange[]>;
}

export interface AmpFileAnalysis {
    /** The file change information */
    change: GitFileChange;
    /** Risk level assessment */
    riskLevel: 'low' | 'medium' | 'high';
    /** Category of the change */
    category: 'feature' | 'bugfix' | 'refactor' | 'test' | 'documentation' | 'config';
    /** AI-generated rationale for the change */
    rationale?: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Test coverage impact */
    coverageImpact?: {
        before: number;
        after: number;
        delta: number;
    };
}

export interface ScmState {
    /** All repositories in the workspace */
    repositories: GitRepository[];
    /** Currently analyzed files */
    analyzedFiles: Map<string, AmpFileAnalysis>;
    /** Whether analysis is in progress */
    isAnalyzing: boolean;
}
