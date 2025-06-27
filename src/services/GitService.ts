import * as vscode from 'vscode';
import { GitFileChange, GitChangeStatus, GitRepository } from '../types/scm';

interface GitExtension {
    readonly gitApi: GitApi;
}

interface GitApi {
    repositories: Repository[];
    onDidOpenRepository: vscode.Event<Repository>;
    onDidCloseRepository: vscode.Event<Repository>;
}

interface Repository {
    readonly rootUri: vscode.Uri;
    readonly state: RepositoryState;
    onDidChangeState: vscode.Event<RepositoryState>;
}

interface RepositoryState {
    readonly HEAD: Branch | undefined;
    readonly workingTreeChanges: Change[];
    readonly indexChanges: Change[];
    readonly untrackedChanges: Change[];
}

interface Branch {
    readonly name: string;
    readonly commit: string;
}

interface Change {
    readonly uri: vscode.Uri;
    readonly originalUri?: vscode.Uri;
    readonly status: Status;
}

enum Status {
    INDEX_MODIFIED = 0,
    INDEX_ADDED = 1,
    INDEX_DELETED = 2,
    INDEX_RENAMED = 3,
    INDEX_COPIED = 4,
    MODIFIED = 5,
    DELETED = 6,
    UNTRACKED = 7,
    IGNORED = 8,
    INTENT_TO_ADD = 9,
}

export class GitService {
    private gitApi: GitApi | undefined;
    private repositories: Map<string, Repository> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.initializeGitApi();
    }

    private async initializeGitApi(): Promise<void> {
        try {
            const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
            console.log('Git extension found:', !!gitExtension);
            
            if (gitExtension && !gitExtension.isActive) {
                console.log('Activating git extension...');
                await gitExtension.activate();
            }

            if (gitExtension) {
                console.log('Git extension exports:', Object.keys(gitExtension.exports || {}));
                
                // Try different ways to access the git API
                if (gitExtension.exports?.gitApi) {
                    this.gitApi = gitExtension.exports.gitApi;
                } else if (gitExtension.exports && 'getAPI' in gitExtension.exports) {
                    // Some versions use getAPI method
                    this.gitApi = (gitExtension.exports as any).getAPI(1);
                } else if (gitExtension.exports && 'repositories' in gitExtension.exports) {
                    // Fallback - some versions export the API directly
                    this.gitApi = gitExtension.exports as any;
                }
                
                console.log('Git API initialized:', !!this.gitApi);
                console.log('Git API keys:', this.gitApi ? Object.keys(this.gitApi) : 'none');
                console.log('Number of repositories:', this.gitApi?.repositories?.length || 0);
                
                if (this.gitApi) {
                    this.setupRepositoryListeners();
                    this.loadExistingRepositories();
                } else {
                    console.error('Could not access git API');
                }
            } else {
                console.error('Git extension not found');
            }
        } catch (error) {
            console.error('Failed to initialize Git API:', error);
        }
    }

    private setupRepositoryListeners(): void {
        if (!this.gitApi) {
            return;
        }

        this.disposables.push(
            this.gitApi.onDidOpenRepository(repo => {
                this.repositories.set(repo.rootUri.fsPath, repo);
            }),
            this.gitApi.onDidCloseRepository(repo => {
                this.repositories.delete(repo.rootUri.fsPath);
            })
        );
    }

    private loadExistingRepositories(): void {
        if (!this.gitApi) {
            console.log('No git API available');
            return;
        }

        console.log('Loading existing repositories...');
        for (const repo of this.gitApi.repositories) {
            console.log('Found repository:', repo.rootUri.fsPath);
            this.repositories.set(repo.rootUri.fsPath, repo);
        }
        console.log('Total repositories loaded:', this.repositories.size);
    }

    public async getRepositories(): Promise<GitRepository[]> {
        const gitRepos: GitRepository[] = [];

        for (const [rootPath, repo] of this.repositories) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(repo.rootUri);
            if (workspaceFolder) {
                gitRepos.push({
                    workspaceFolder,
                    rootPath,
                    getCurrentBranch: async () => {
                        return repo.state.HEAD?.name || 'unknown';
                    },
                    getChangedFiles: async () => {
                        return this.getChangedFilesForRepo(repo);
                    }
                });
            }
        }

        return gitRepos;
    }

    private async getChangedFilesForRepo(repo: Repository): Promise<GitFileChange[]> {
        const changes: GitFileChange[] = [];
        const workspaceRoot = vscode.workspace.getWorkspaceFolder(repo.rootUri)?.uri.fsPath || '';

        // Process working tree changes (unstaged)
        for (const change of repo.state.workingTreeChanges) {
            changes.push(this.convertChangeToGitFileChange(change, workspaceRoot));
        }

        // Process index changes (staged)
        for (const change of repo.state.indexChanges) {
            // Skip if we already have this file from working tree changes
            if (!changes.find(c => c.uri.fsPath === change.uri.fsPath)) {
                changes.push(this.convertChangeToGitFileChange(change, workspaceRoot));
            }
        }

        // Process untracked changes
        for (const change of repo.state.untrackedChanges) {
            changes.push(this.convertChangeToGitFileChange(change, workspaceRoot));
        }
        return changes;
    }

    private convertChangeToGitFileChange(change: Change, workspaceRoot: string): GitFileChange {
        const relativePath = vscode.workspace.asRelativePath(change.uri, false);
        
        return {
            uri: change.uri,
            status: this.convertStatusToGitChangeStatus(change.status),
            originalUri: change.originalUri,
            relativePath
        };
    }

    private convertStatusToGitChangeStatus(status: Status): GitChangeStatus {
        switch (status) {
            case Status.INDEX_ADDED:
            case Status.INTENT_TO_ADD:
                return GitChangeStatus.Added;
            case Status.INDEX_MODIFIED:
            case Status.MODIFIED:
                return GitChangeStatus.Modified;
            case Status.INDEX_DELETED:
            case Status.DELETED:
                return GitChangeStatus.Deleted;
            case Status.INDEX_RENAMED:
                return GitChangeStatus.Renamed;
            case Status.UNTRACKED:
                return GitChangeStatus.Untracked;
            default:
                return GitChangeStatus.Modified;
        }
    }

    public onRepositoryChanged(callback: (repos: GitRepository[]) => void): vscode.Disposable {
        const disposables: vscode.Disposable[] = [];

        // Listen for repository state changes
        for (const repo of this.repositories.values()) {
            try {
                // Try the standard onDidChangeState method
                if (repo.onDidChangeState && typeof repo.onDidChangeState === 'function') {
                    disposables.push(
                        repo.onDidChangeState(() => {
                            this.getRepositories().then(callback);
                        })
                    );
                } else {
                    // Note: Some git extension versions don't support change events
                    // This is fine - decorations will update when files are opened/saved
                }
            } catch (error) {
                console.warn('Failed to register repository change listener:', error);
            }
        }

        // Listen for new repositories
        if (this.gitApi) {
            disposables.push(
                this.gitApi.onDidOpenRepository(() => {
                    this.getRepositories().then(callback);
                }),
                this.gitApi.onDidCloseRepository(() => {
                    this.getRepositories().then(callback);
                })
            );
        }

        return vscode.Disposable.from(...disposables);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.repositories.clear();
    }
}
