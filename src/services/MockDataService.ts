import * as vscode from 'vscode';
import { AmpFileAnalysis, GitFileChange, GitChangeStatus } from '../types/scm';

export interface MockScenario {
    name: string;
    description: string;
    files: MockFileData[];
}

export interface MockFileData {
    relativePath: string;
    status: GitChangeStatus;
    riskLevel: 'low' | 'medium' | 'high';
    category: 'feature' | 'bugfix' | 'refactor' | 'test' | 'documentation' | 'config';
    confidence: number;
    rationale: string;
    coverageImpact?: {
        before: number;
        after: number;
        delta: number;
    };
}

export class MockDataService {
    private static instance: MockDataService;
    private scenarios: MockScenario[] = [];

    public static getInstance(): MockDataService {
        if (!MockDataService.instance) {
            MockDataService.instance = new MockDataService();
        }
        return MockDataService.instance;
    }

    private constructor() {
        this.initializeScenarios();
    }

    private initializeScenarios(): void {
        this.scenarios = [
            {
                name: 'Feature Development',
                description: 'New user authentication feature with tests and documentation',
                files: [
                    {
                        relativePath: 'src/auth/AuthService.ts',
                        status: GitChangeStatus.Added,
                        riskLevel: 'high',
                        category: 'feature',
                        confidence: 0.85,
                        rationale: 'New authentication service with JWT handling and session management. Requires careful security review.',
                        coverageImpact: { before: 0, after: 78.5, delta: 78.5 }
                    },
                    {
                        relativePath: 'src/auth/types.ts',
                        status: GitChangeStatus.Added,
                        riskLevel: 'low',
                        category: 'feature',
                        confidence: 0.95,
                        rationale: 'Type definitions for authentication module. Well-structured and follows existing patterns.',
                        coverageImpact: { before: 0, after: 95.0, delta: 95.0 }
                    },
                    {
                        relativePath: 'src/auth/AuthService.test.ts',
                        status: GitChangeStatus.Added,
                        riskLevel: 'low',
                        category: 'test',
                        confidence: 0.92,
                        rationale: 'Comprehensive test suite for authentication service with edge cases and security scenarios.',
                        coverageImpact: { before: 0, after: 88.2, delta: 88.2 }
                    },
                    {
                        relativePath: 'docs/authentication.md',
                        status: GitChangeStatus.Added,
                        riskLevel: 'low',
                        category: 'documentation',
                        confidence: 0.98,
                        rationale: 'Clear documentation with examples and security considerations.',
                    },
                    {
                        relativePath: 'src/config/security.json',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'high',
                        category: 'config',
                        confidence: 0.75,
                        rationale: 'Security configuration changes for JWT settings. Requires environment-specific review.',
                    }
                ]
            },
            {
                name: 'Bug Fix Sprint',
                description: 'Critical bug fixes with performance improvements',
                files: [
                    {
                        relativePath: 'src/utils/database.ts',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'high',
                        category: 'bugfix',
                        confidence: 0.78,
                        rationale: 'Fixed memory leak in database connection pooling. Critical performance impact.',
                        coverageImpact: { before: 65.2, after: 72.8, delta: 7.6 }
                    },
                    {
                        relativePath: 'src/api/userController.ts',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'medium',
                        category: 'bugfix',
                        confidence: 0.88,
                        rationale: 'Resolved race condition in user data validation. Added proper error handling.',
                        coverageImpact: { before: 82.1, after: 85.3, delta: 3.2 }
                    },
                    {
                        relativePath: 'src/utils/database.test.ts',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'low',
                        category: 'test',
                        confidence: 0.93,
                        rationale: 'Updated tests to verify memory leak fix and connection pooling behavior.',
                        coverageImpact: { before: 78.9, after: 84.1, delta: 5.2 }
                    }
                ]
            },
            {
                name: 'Code Refactoring',
                description: 'Large-scale refactoring for maintainability',
                files: [
                    {
                        relativePath: 'src/components/UserProfile.tsx',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'medium',
                        category: 'refactor',
                        confidence: 0.82,
                        rationale: 'Extracted custom hooks and simplified component logic. Maintains existing API.',
                        coverageImpact: { before: 76.4, after: 79.1, delta: 2.7 }
                    },
                    {
                        relativePath: 'src/hooks/useUserData.ts',
                        status: GitChangeStatus.Added,
                        riskLevel: 'medium',
                        category: 'refactor',
                        confidence: 0.89,
                        rationale: 'New custom hook for user data management. Centralizes data fetching logic.',
                        coverageImpact: { before: 0, after: 81.5, delta: 81.5 }
                    },
                    {
                        relativePath: 'src/utils/helpers.ts',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'low',
                        category: 'refactor',
                        confidence: 0.95,
                        rationale: 'Extracted common utility functions. Improves code reusability.',
                        coverageImpact: { before: 92.3, after: 94.1, delta: 1.8 }
                    }
                ]
            },
            {
                name: 'Configuration Update',
                description: 'Deployment and environment configuration changes',
                files: [
                    {
                        relativePath: 'package.json',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'high',
                        category: 'config',
                        confidence: 0.70,
                        rationale: 'Updated dependencies with security patches. Requires thorough testing.',
                    },
                    {
                        relativePath: 'tsconfig.json',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'medium',
                        category: 'config',
                        confidence: 0.85,
                        rationale: 'Enhanced TypeScript configuration for stricter type checking.',
                    },
                    {
                        relativePath: '.env.example',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'low',
                        category: 'config',
                        confidence: 0.98,
                        rationale: 'Updated environment variable examples with new authentication settings.',
                    },
                    {
                        relativePath: 'docker-compose.yml',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'high',
                        category: 'config',
                        confidence: 0.72,
                        rationale: 'Modified container configuration for production deployment. Requires infrastructure review.',
                    }
                ]
            },
            {
                name: 'Documentation Sprint',
                description: 'Comprehensive documentation and README updates',
                files: [
                    {
                        relativePath: 'README.md',
                        status: GitChangeStatus.Modified,
                        riskLevel: 'low',
                        category: 'documentation',
                        confidence: 0.97,
                        rationale: 'Updated installation instructions and added troubleshooting section.',
                    },
                    {
                        relativePath: 'docs/api-reference.md',
                        status: GitChangeStatus.Added,
                        riskLevel: 'low',
                        category: 'documentation',
                        confidence: 0.94,
                        rationale: 'Comprehensive API documentation with examples and response schemas.',
                    },
                    {
                        relativePath: 'docs/deployment-guide.md',
                        status: GitChangeStatus.Added,
                        riskLevel: 'low',
                        category: 'documentation',
                        confidence: 0.91,
                        rationale: 'Step-by-step deployment guide for different environments.',
                    },
                    {
                        relativePath: 'CONTRIBUTING.md',
                        status: GitChangeStatus.Added,
                        riskLevel: 'low',
                        category: 'documentation',
                        confidence: 0.96,
                        rationale: 'Clear contribution guidelines with code style and review process.',
                    }
                ]
            }
        ];
    }

    public getRandomScenario(): MockScenario {
        return this.scenarios[Math.floor(Math.random() * this.scenarios.length)];
    }

    public getScenarioByName(name: string): MockScenario | undefined {
        return this.scenarios.find(scenario => scenario.name === name);
    }

    public getAllScenarios(): MockScenario[] {
        return [...this.scenarios];
    }

    public generateMockAnalysis(workspaceUri: vscode.Uri): AmpFileAnalysis[] {
        const scenario = this.getRandomScenario();
        return scenario.files.map(fileData => this.createAnalysisFromMockData(fileData, workspaceUri));
    }

    public generateMockAnalysisForScenario(scenarioName: string, workspaceUri: vscode.Uri): AmpFileAnalysis[] {
        const scenario = this.getScenarioByName(scenarioName);
        if (!scenario) {
            return this.generateMockAnalysis(workspaceUri);
        }
        return scenario.files.map(fileData => this.createAnalysisFromMockData(fileData, workspaceUri));
    }

    private createAnalysisFromMockData(fileData: MockFileData, workspaceUri: vscode.Uri): AmpFileAnalysis {
        const fileUri = vscode.Uri.joinPath(workspaceUri, fileData.relativePath);
        
        const gitChange: GitFileChange = {
            uri: fileUri,
            status: fileData.status,
            relativePath: fileData.relativePath
        };

        return {
            change: gitChange,
            riskLevel: fileData.riskLevel,
            category: fileData.category,
            confidence: fileData.confidence,
            rationale: fileData.rationale,
            coverageImpact: fileData.coverageImpact
        };
    }

    public createRealisticVariation(baseAnalysis: AmpFileAnalysis): AmpFileAnalysis {
        // Add some realistic variation to the analysis
        const confidenceVariation = (Math.random() - 0.5) * 0.1; // ±5%
        const newConfidence = Math.max(0.1, Math.min(1.0, baseAnalysis.confidence + confidenceVariation));

        // Occasionally change risk level based on confidence
        let newRiskLevel = baseAnalysis.riskLevel;
        if (newConfidence < 0.6 && baseAnalysis.riskLevel === 'low') {
            newRiskLevel = 'medium';
        } else if (newConfidence > 0.9 && baseAnalysis.riskLevel === 'high') {
            newRiskLevel = 'medium';
        }

        return {
            ...baseAnalysis,
            confidence: newConfidence,
            riskLevel: newRiskLevel,
            coverageImpact: baseAnalysis.coverageImpact ? {
                ...baseAnalysis.coverageImpact,
                delta: baseAnalysis.coverageImpact.delta + (Math.random() - 0.5) * 2 // ±1%
            } : undefined
        };
    }

    public getScenarioSummary(scenarioName: string): string {
        const scenario = this.getScenarioByName(scenarioName);
        if (!scenario) {
            return 'Unknown scenario';
        }

        const riskCounts = { high: 0, medium: 0, low: 0 };
        const categoryCounts: Record<string, number> = {};

        for (const file of scenario.files) {
            riskCounts[file.riskLevel]++;
            categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;
        }

        const avgConfidence = scenario.files.reduce((sum, file) => sum + file.confidence, 0) / scenario.files.length;
        
        return `${scenario.description}\n` +
               `Files: ${scenario.files.length} | ` +
               `Risk: 🔴${riskCounts.high} 🟡${riskCounts.medium} 🟢${riskCounts.low} | ` +
               `Avg Confidence: ${Math.round(avgConfidence * 100)}%`;
    }

    public getDemoCommands(): Array<{ command: string; description: string }> {
        return [
            {
                command: 'amp-scm.loadDemoScenario',
                description: 'Load a demo scenario with realistic file changes'
            },
            {
                command: 'amp-scm.showScenarioInfo',
                description: 'Show information about available demo scenarios'
            },
            {
                command: 'amp-scm.generateRandomChanges',
                description: 'Generate random file changes for testing'
            },
            {
                command: 'amp-scm.resetMockData',
                description: 'Reset to fresh mock data'
            }
        ];
    }

    public createDemoFiles(workspaceUri: vscode.Uri, scenario: MockScenario): Promise<void[]> {
        // In a real implementation, this would create actual demo files
        // For now, we'll just simulate the file structure
        return Promise.all(
            scenario.files.map(async (fileData) => {
                console.log(`Demo file: ${fileData.relativePath} (${fileData.category}, ${fileData.riskLevel} risk)`);
            })
        );
    }

    public getInteractiveDemo(): { 
        title: string; 
        steps: Array<{ action: string; description: string; command?: string }> 
    } {
        return {
            title: 'Amp SCM Integration Demo',
            steps: [
                {
                    action: 'Open Source Control',
                    description: 'Click the Source Control icon or press Ctrl+Shift+G',
                },
                {
                    action: 'Review with Amp',
                    description: 'Click the sparkle "Review with Amp" button in the toolbar',
                    command: 'amp-scm.reviewWithAmp'
                },
                {
                    action: 'Explore Tree View',
                    description: 'Expand groups in the "Amp Review" tree to see categorized files'
                },
                {
                    action: 'Check File Decorations',
                    description: 'Open a changed file to see gutter icons and hover for analysis'
                },
                {
                    action: 'Use Context Menus',
                    description: 'Right-click on files for analysis options'
                },
                {
                    action: 'Generate Report',
                    description: 'Click the report button to generate analysis summary',
                    command: 'amp-scm.generateAnalysisReport'
                }
            ]
        };
    }
}
