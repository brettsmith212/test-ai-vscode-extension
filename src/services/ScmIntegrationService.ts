import * as vscode from 'vscode';
import { GitService } from './GitService';
import { ScmState, AmpFileAnalysis, GitFileChange, GitRepository } from '../types/scm';

export class ScmIntegrationService {
    private static instance: ScmIntegrationService;
    private gitService: GitService;
    private state: ScmState;
    private disposables: vscode.Disposable[] = [];
    private onDidChangeStateEmitter = new vscode.EventEmitter<ScmState>();
    public readonly onDidChangeState = this.onDidChangeStateEmitter.event;

    private constructor() {
        this.gitService = new GitService();
        this.state = {
            repositories: [],
            analyzedFiles: new Map(),
            isAnalyzing: false
        };
        this.initialize();
    }

    public static getInstance(): ScmIntegrationService {
        if (!ScmIntegrationService.instance) {
            ScmIntegrationService.instance = new ScmIntegrationService();
        }
        return ScmIntegrationService.instance;
    }

    private async initialize(): Promise<void> {
        // Load initial repositories
        await this.refreshRepositories();

        // Listen for repository changes
        this.disposables.push(
            this.gitService.onRepositoryChanged(async (repos) => {
                this.state.repositories = repos;
                await this.analyzeChangedFiles();
                this.onDidChangeStateEmitter.fire(this.state);
            })
        );

        // Listen for file system changes to trigger re-analysis
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(async (document) => {
                // Re-analyze if a tracked file was saved
                const uri = document.uri;
                const isTracked = Array.from(this.state.analyzedFiles.keys()).some(key => 
                    key === uri.fsPath
                );
                
                if (isTracked) {
                    await this.analyzeChangedFiles();
                    this.onDidChangeStateEmitter.fire(this.state);
                }
            })
        );
    }

    private async refreshRepositories(): Promise<void> {
        try {
            this.state.repositories = await this.gitService.getRepositories();
            await this.analyzeChangedFiles();
            this.onDidChangeStateEmitter.fire(this.state);
        } catch (error) {
            console.error('Failed to refresh repositories:', error);
        }
    }

    private async analyzeChangedFiles(): Promise<void> {
        this.state.isAnalyzing = true;
        this.state.analyzedFiles.clear();

        try {
            for (const repo of this.state.repositories) {
                const changedFiles = await repo.getChangedFiles();
                
                for (const change of changedFiles) {
                    const analysis = await this.analyzeFile(change);
                    this.state.analyzedFiles.set(change.uri.fsPath, analysis);
                }
            }
        } catch (error) {
            console.error('Failed to analyze changed files:', error);
        } finally {
            this.state.isAnalyzing = false;
        }
    }

    private async analyzeFile(change: GitFileChange): Promise<AmpFileAnalysis> {
        // TODO: Replace with actual AI analysis in future phases
        // For now, create mock analysis based on file patterns
        const analysis: AmpFileAnalysis = {
            change,
            riskLevel: this.assessRiskLevel(change),
            category: this.categorizeChange(change),
            confidence: 0.85,
            rationale: this.generateMockRationale(change)
        };

        // Add mock coverage impact for certain file types
        if (change.relativePath.includes('test')) {
            analysis.coverageImpact = {
                before: 78.5,
                after: 82.1,
                delta: 3.6
            };
        }

        return analysis;
    }

    private assessRiskLevel(change: GitFileChange): 'low' | 'medium' | 'high' {
        const path = change.relativePath.toLowerCase();
        
        // High risk patterns
        if (path.includes('config') || path.includes('package.json') || 
            path.includes('tsconfig') || path.includes('webpack') ||
            path.includes('database') || path.includes('migration')) {
            return 'high';
        }
        
        // Low risk patterns
        if (path.includes('test') || path.includes('spec') || 
            path.includes('readme') || path.includes('.md') ||
            path.includes('doc') || path.includes('comment')) {
            return 'low';
        }
        
        // Default to medium risk
        return 'medium';
    }

    private categorizeChange(change: GitFileChange): 'feature' | 'bugfix' | 'refactor' | 'test' | 'documentation' | 'config' {
        const path = change.relativePath.toLowerCase();
        
        if (path.includes('test') || path.includes('spec')) {
            return 'test';
        }
        
        if (path.includes('readme') || path.includes('.md') || path.includes('doc')) {
            return 'documentation';
        }
        
        if (path.includes('config') || path.includes('package.json') || 
            path.includes('tsconfig') || path.includes('webpack')) {
            return 'config';
        }
        
        // TODO: In future phases, use AI to better categorize based on file content
        return 'feature';
    }

    private generateMockRationale(change: GitFileChange): string {
        const category = this.categorizeChange(change);
        const riskLevel = this.assessRiskLevel(change);
        
        const rationales = {
            test: [
                "Added comprehensive test coverage for new functionality",
                "Updated test assertions to match API changes",
                "Refactored test setup to improve maintainability"
            ],
            documentation: [
                "Updated documentation to reflect API changes",
                "Added usage examples for new features",
                "Clarified installation instructions"
            ],
            config: [
                "Updated configuration to support new deployment target",
                "Modified build settings for performance optimization",
                "Added environment-specific configuration"
            ],
            feature: [
                "Implemented new user authentication flow",
                "Added data validation for user inputs",
                "Created new API endpoint for file processing"
            ],
            bugfix: [
                "Fixed memory leak in file processing",
                "Resolved race condition in async operations",
                "Corrected edge case in validation logic"
            ],
            refactor: [
                "Extracted common logic into reusable utility",
                "Improved code organization and readability",
                "Simplified complex conditional logic"
            ]
        };
        
        const categoryRationales = rationales[category] || rationales.feature;
        const baseRationale = categoryRationales[Math.floor(Math.random() * categoryRationales.length)];
        
        const riskSuffix = riskLevel === 'high' ? ' (requires careful review)' : 
                          riskLevel === 'medium' ? ' (standard review needed)' : '';
        
        return baseRationale + riskSuffix;
    }

    // Public API methods
    public getState(): ScmState {
        return { ...this.state };
    }

    public getAnalyzedFiles(): Map<string, AmpFileAnalysis> {
        return new Map(this.state.analyzedFiles);
    }

    public getFileAnalysis(uri: vscode.Uri): AmpFileAnalysis | undefined {
        return this.state.analyzedFiles.get(uri.fsPath);
    }

    public async refreshAnalysis(): Promise<void> {
        await this.refreshRepositories();
    }

    public getFilesByCategory(category: string): AmpFileAnalysis[] {
        const files: AmpFileAnalysis[] = [];
        for (const analysis of this.state.analyzedFiles.values()) {
            if (analysis.category === category) {
                files.push(analysis);
            }
        }
        return files;
    }

    public getFilesByRiskLevel(riskLevel: 'low' | 'medium' | 'high'): AmpFileAnalysis[] {
        const files: AmpFileAnalysis[] = [];
        for (const analysis of this.state.analyzedFiles.values()) {
            if (analysis.riskLevel === riskLevel) {
                files.push(analysis);
            }
        }
        return files;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.onDidChangeStateEmitter.dispose();
        this.gitService.dispose();
    }
}
