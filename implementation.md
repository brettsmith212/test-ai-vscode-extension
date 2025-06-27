# Implementation Plan - Phase 1: Basic SCM Integration

## Foundation Setup

- [x] Step 1: Create SCM provider infrastructure

  - **Task**: Set up the basic SCM integration infrastructure with git change detection
  - **Description**: Create the foundational classes and services needed to detect git changes and integrate with VS Code's SCM API. This establishes the core infrastructure that all other features will build upon.
  - **Files**:
    - `src/services/GitService.ts`: Service to interact with git and detect file changes
    - `src/services/ScmIntegrationService.ts`: Main service orchestrating SCM features
    - `src/types/scm.ts`: Type definitions for SCM-related data structures
  - **Step Dependencies**: None
  - **Agent Instructions**: Create services that can detect git changes using VS Code's built-in git extension API. Focus on getting a list of modified files and their change types (added, modified, deleted).

- [x] Step 2: Register SCM commands and activation events
  - **Task**: Update package.json and extension.ts to register SCM-related commands and activation events
  - **Description**: Configure the extension to activate when SCM events occur and register commands that will be used for the Amp Review functionality.
  - **Files**:
    - `package.json`: Add SCM-related activation events, commands, and contribution points
    - `src/extension.ts`: Register new SCM-related commands and services
  - **Step Dependencies**: Step 1
  - **Agent Instructions**: Add activation events for git repository changes, register commands for "Review with Amp" functionality, and ensure the extension activates when users interact with source control.

## File Decorations

- [x] Step 3: Implement text editor decorations for changed files

  - **Task**: Create decoration provider to add gutter icons and highlights to modified files
  - **Description**: Add visual indicators (icons, highlights) to changed lines in the editor using VS Code's TextEditorDecorationType API. This provides the first visual layer of the Amp experience.
  - **Files**:
    - `src/providers/DecorationProvider.ts`: Main decoration logic and styling
    - `src/services/DecorationManager.ts`: Manages decoration lifecycle and updates
    - `media/icons/`: Icon files for different change types (info.svg, warning.svg, etc.)
  - **Step Dependencies**: Step 1, Step 2
  - **Agent Instructions**: Create different decoration types for different kinds of changes (risky, safe, documentation). Use gutter decorations with custom icons and subtle highlighting. Make decorations update automatically when files change.

- [x] Step 4: Add hover providers for decoration rationale
  - **Task**: Implement hover cards that show AI-generated rationale for why lines changed
  - **Description**: When users hover over decorated lines, show contextual information explaining the change. This is the core "why did this change" feature from the PRD.
  - **Files**:
    - `src/providers/HoverProvider.ts`: Hover card implementation with markdown content
    - `src/services/RationaleService.ts`: Service to generate mock rationale data
  - **Step Dependencies**: Step 3
  - **Agent Instructions**: Create hover cards using VS Code's HoverProvider API. Show mock rationale data with rich markdown formatting. Include confidence indicators and change categorization in the hover content.

## Tree View Integration

- [x] Step 5: Create Amp Review tree view provider

  - **Task**: Implement custom tree view that appears under Source Control with grouped file changes
  - **Description**: Add a new tree view pane called "Amp Review" that groups changed files by risk level, change type, or affected features. This provides the higher-level overview mentioned in the PRD.
  - **Files**:
    - `src/providers/AmpReviewTreeProvider.ts`: Tree view data provider and item definitions
    - `src/types/treeView.ts`: Type definitions for tree view items and groups
  - **Step Dependencies**: Step 1, Step 2
  - **Agent Instructions**: Create tree view using VS Code's TreeDataProvider API. Group files into categories like "High Risk", "Documentation", "Tests", etc. Add icons and context menus for each item. Ensure clicking items opens the files.

- [x] Step 6: Add tree view commands and context menus
  - **Task**: Implement commands for tree view interactions (open diff, review file, etc.)
  - **Description**: Add interactive commands to the tree view items so users can perform actions like opening diffs, marking files as reviewed, or jumping to specific changes.
  - **Files**:
    - `src/commands/TreeViewCommands.ts`: Command implementations for tree view actions
    - `package.json`: Register tree view commands and context menu contributions
  - **Step Dependencies**: Step 5
  - **Agent Instructions**: Add context menu commands for tree view items. Implement "Open Diff", "Mark as Reviewed", "Show Details" commands. Update package.json to register commands and context menu contributions.

## Polish and Integration

- [ ] Step 7: Add source control resource decorations

  - **Task**: Enhance the built-in source control file list with Amp-specific decorations
  - **Description**: Add badges, icons, and tooltips to files in the standard VS Code source control view to show Amp analysis results without requiring users to switch to the custom tree view.
  - **Files**:
    - `src/providers/SourceControlDecorationProvider.ts`: Decorations for SCM resource list
    - `src/services/FileAnalysisService.ts`: Service to analyze and categorize file changes
  - **Step Dependencies**: Step 1
  - **Agent Instructions**: Use SourceControlResourceDecorations API to add badges and tooltips to files in the standard SCM list. Show risk indicators, change summaries, and test coverage impact.

- [ ] Step 8: Create mock data service and polish UI
  - **Task**: Implement comprehensive mock data service and refine the user experience
  - **Description**: Create realistic mock data that demonstrates all features working together. Polish the visual design, interactions, and ensure smooth integration with VS Code's existing SCM workflow.
  - **Files**:
    - `src/services/MockDataService.ts`: Comprehensive mock data for all features
    - `src/styles/scm-decorations.css`: Custom styling for decorations
    - `src/utils/ScmHelpers.ts`: Utility functions for SCM operations
  - **Step Dependencies**: All previous steps
  - **Agent Instructions**: Create varied, realistic mock data that showcases different scenarios (risky changes, test files, documentation, etc.). Ensure all UI elements are polished and consistent with VS Code's design language. Test the complete user workflow from file changes to review.
