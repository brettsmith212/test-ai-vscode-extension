import * as vscode from 'vscode';
import { AmpFileAnalysis, GitFileChange } from '../types/scm';

export interface RationaleData {
    summary: string;
    detailedExplanation: string;
    riskFactors: string[];
    recommendations: string[];
    relatedFiles?: string[];
    testImpact?: {
        affectedTests: string[];
        newTestsNeeded: boolean;
        coverageChange: number;
    };
}

export class RationaleService {
    private static instance: RationaleService;

    public static getInstance(): RationaleService {
        if (!RationaleService.instance) {
            RationaleService.instance = new RationaleService();
        }
        return RationaleService.instance;
    }

    private constructor() {}

    public generateRationale(analysis: AmpFileAnalysis, lineNumber?: number): RationaleData {
        const change = analysis.change;
        const fileType = this.getFileType(change.relativePath);
        const changeContext = this.getChangeContext(change, lineNumber);

        return {
            summary: this.generateSummary(analysis, changeContext),
            detailedExplanation: this.generateDetailedExplanation(analysis, changeContext, fileType),
            riskFactors: this.generateRiskFactors(analysis, fileType),
            recommendations: this.generateRecommendations(analysis, fileType),
            relatedFiles: this.generateRelatedFiles(analysis),
            testImpact: this.generateTestImpact(analysis, fileType)
        };
    }

    private getFileType(relativePath: string): string {
        const path = relativePath.toLowerCase();
        
        if (path.includes('test') || path.includes('spec')) {
            return 'test';
        }
        if (path.endsWith('.md') || path.includes('readme') || path.includes('doc')) {
            return 'documentation';
        }
        if (path.includes('config') || path.includes('package.json') || path.includes('tsconfig')) {
            return 'config';
        }
        if (path.endsWith('.ts') || path.endsWith('.js')) {
            return 'code';
        }
        if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.less')) {
            return 'style';
        }
        if (path.endsWith('.json')) {
            return 'data';
        }
        
        return 'other';
    }

    private getChangeContext(change: GitFileChange, lineNumber?: number): string {
        // Mock context based on line number and file type
        const contexts = [
            'function definition',
            'class declaration',
            'import statement',
            'configuration setting',
            'error handling',
            'data validation',
            'API endpoint',
            'database query',
            'user interface',
            'business logic'
        ];
        
        const index = lineNumber ? lineNumber % contexts.length : 0;
        return contexts[index];
    }

    private generateSummary(analysis: AmpFileAnalysis, context: string): string {
        const summaries = {
            low: [
                `Minor ${context} adjustment with low impact`,
                `Safe ${context} modification`,
                `Low-risk ${context} update`
            ],
            medium: [
                `Moderate ${context} change requiring review`,
                `Standard ${context} modification with some complexity`,
                `Medium-risk ${context} update`
            ],
            high: [
                `Critical ${context} change requiring careful review`,
                `High-impact ${context} modification`,
                `Complex ${context} update with potential side effects`
            ]
        };

        const options = summaries[analysis.riskLevel];
        return options[Math.floor(Math.random() * options.length)];
    }

    private generateDetailedExplanation(analysis: AmpFileAnalysis, context: string, fileType: string): string {
        const explanations = {
            test: [
                `This test file modification updates assertions to match new API behavior. The changes ensure comprehensive coverage of edge cases and maintain test reliability.`,
                `Test suite enhancements include new test scenarios and improved mock data. These changes strengthen the validation of core functionality.`,
                `Updated test configuration and added performance benchmarks. This ensures consistent testing across different environments.`
            ],
            documentation: [
                `Documentation updates reflect recent API changes and provide clearer usage examples. These improvements help developers understand the intended functionality.`,
                `Added comprehensive guides and troubleshooting sections. The changes address common user questions and improve onboarding experience.`,
                `Updated configuration examples and added migration notes. These changes support users upgrading to the latest version.`
            ],
            config: [
                `Configuration changes modify build settings and environment variables. These updates optimize performance and ensure compatibility across deployment targets.`,
                `Updated dependency versions and security policies. The changes address known vulnerabilities and improve system stability.`,
                `Modified deployment configuration and added health check endpoints. These changes improve monitoring and reliability.`
            ],
            code: [
                `Code changes implement new business logic while maintaining backward compatibility. The modifications follow established patterns and include proper error handling.`,
                `Refactored existing functionality to improve performance and maintainability. The changes consolidate duplicate logic and simplify complex workflows.`,
                `Added new features with comprehensive input validation. The implementation includes proper logging and graceful error recovery.`
            ],
            style: [
                `Styling updates improve user interface consistency and accessibility. The changes follow design system guidelines and support responsive layouts.`,
                `CSS modifications optimize rendering performance and fix cross-browser compatibility issues. The updates maintain visual consistency.`,
                `Added new component styles and updated existing themes. These changes support the latest design requirements.`
            ]
        };

        const options = explanations[fileType as keyof typeof explanations] || explanations.code;
        return options[Math.floor(Math.random() * options.length)];
    }

    private generateRiskFactors(analysis: AmpFileAnalysis, fileType: string): string[] {
        const riskFactors = {
            low: [
                'Isolated change with minimal dependencies',
                'Well-tested functionality',
                'Backward compatible modification'
            ],
            medium: [
                'Affects multiple components',
                'Requires integration testing',
                'May impact existing workflows',
                'Complex business logic involved'
            ],
            high: [
                'Critical system component affected',
                'Potential breaking changes',
                'High complexity implementation',
                'Wide-reaching impact across modules',
                'Security-sensitive code modified'
            ]
        };

        const baseFactors = riskFactors[analysis.riskLevel];
        const fileSpecificFactors = this.getFileSpecificRiskFactors(fileType, analysis.riskLevel);
        
        return [...baseFactors.slice(0, 2), ...fileSpecificFactors];
    }

    private getFileSpecificRiskFactors(fileType: string, riskLevel: string): string[] {
        const factors = {
            test: ['Test coverage may be affected', 'CI/CD pipeline impacts'],
            config: ['Environment-specific behavior', 'Deployment dependencies'],
            code: ['Runtime behavior changes', 'Performance implications'],
            documentation: ['User experience impacts', 'Support implications']
        };

        return factors[fileType as keyof typeof factors] || factors.code;
    }

    private generateRecommendations(analysis: AmpFileAnalysis, fileType: string): string[] {
        const recommendations = {
            low: [
                'Standard code review sufficient',
                'Verify automated tests pass',
                'Quick manual testing recommended'
            ],
            medium: [
                'Thorough code review required',
                'Integration testing recommended',
                'Check for side effects in related components',
                'Update documentation if needed'
            ],
            high: [
                'Senior developer review mandatory',
                'Comprehensive testing across environments',
                'Performance impact assessment needed',
                'Security review if applicable',
                'Rollback plan should be prepared'
            ]
        };

        return recommendations[analysis.riskLevel];
    }

    private generateRelatedFiles(analysis: AmpFileAnalysis): string[] {
        const path = analysis.change.relativePath;
        const relatedFiles = [];

        // Generate mock related files based on the current file
        if (path.includes('test')) {
            relatedFiles.push(path.replace(/test|spec/g, '').replace(/\.(test|spec)/, ''));
        } else {
            relatedFiles.push(`${path.replace(/\.[^.]+$/, '')}.test.ts`);
        }

        if (path.includes('component') || path.includes('service')) {
            relatedFiles.push('index.ts', 'types.ts');
        }

        return relatedFiles.filter(f => f && f !== path).slice(0, 3);
    }

    private generateTestImpact(analysis: AmpFileAnalysis, fileType: string): RationaleData['testImpact'] {
        if (fileType === 'test') {
            return {
                affectedTests: ['unit tests', 'integration tests'],
                newTestsNeeded: false,
                coverageChange: analysis.coverageImpact?.delta || 0
            };
        }

        return {
            affectedTests: this.generateAffectedTests(analysis, fileType),
            newTestsNeeded: analysis.riskLevel === 'high',
            coverageChange: analysis.coverageImpact?.delta || this.estimateCoverageChange(analysis)
        };
    }

    private generateAffectedTests(analysis: AmpFileAnalysis, fileType: string): string[] {
        const testTypes = {
            code: ['unit tests', 'integration tests'],
            config: ['configuration tests', 'deployment tests'],
            style: ['visual regression tests', 'accessibility tests'],
            documentation: ['documentation tests']
        };

        return testTypes[fileType as keyof typeof testTypes] || testTypes.code;
    }

    private estimateCoverageChange(analysis: AmpFileAnalysis): number {
        // Estimate coverage change based on risk level
        const estimates = {
            low: () => Math.random() * 2 - 1, // -1 to +1
            medium: () => Math.random() * 4 - 2, // -2 to +2
            high: () => Math.random() * 6 - 3 // -3 to +3
        };

        return Number(estimates[analysis.riskLevel]().toFixed(1));
    }

    public getQuickRationale(analysis: AmpFileAnalysis): string {
        // Generate a concise rationale for quick display
        const rationale = this.generateRationale(analysis);
        return rationale.summary;
    }

    public getDetailedRationale(analysis: AmpFileAnalysis, lineNumber?: number): string {
        // Generate detailed markdown rationale
        const rationale = this.generateRationale(analysis, lineNumber);
        
        let markdown = `## ${rationale.summary}\n\n`;
        markdown += `${rationale.detailedExplanation}\n\n`;
        
        if (rationale.riskFactors.length > 0) {
            markdown += `### Risk Factors\n`;
            rationale.riskFactors.forEach(factor => {
                markdown += `- ${factor}\n`;
            });
            markdown += '\n';
        }
        
        if (rationale.recommendations.length > 0) {
            markdown += `### Recommendations\n`;
            rationale.recommendations.forEach(rec => {
                markdown += `- ${rec}\n`;
            });
            markdown += '\n';
        }
        
        if (rationale.testImpact) {
            markdown += `### Test Impact\n`;
            markdown += `- **Affected Tests:** ${rationale.testImpact.affectedTests.join(', ')}\n`;
            markdown += `- **New Tests Needed:** ${rationale.testImpact.newTestsNeeded ? 'Yes' : 'No'}\n`;
            markdown += `- **Coverage Change:** ${rationale.testImpact.coverageChange > 0 ? '+' : ''}${rationale.testImpact.coverageChange}%\n\n`;
        }
        
        return markdown;
    }
}
