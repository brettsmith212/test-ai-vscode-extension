import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';

export const terminalTools: Anthropic.Tool[] = [
  {
    name: "run_command",
    description: "Executes the specified terminal command in the VS Code integrated terminal. Use this to run git commands, build commands, or any other CLI commands that would normally be run in a terminal.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The command to execute in the terminal. Should be a valid shell command."
        },
        cwd: {
          type: "string",
          description: "Optional. The current working directory where the command should be executed. If not provided, the workspace root will be used."
        }
      },
      required: ["command"]
    }
  }
];

/**
 * Terminal instance used for executing commands
 */
let terminal: vscode.Terminal | undefined;

/**
 * Executes a command in the VS Code integrated terminal
 * @param command The command to execute
 * @param cwd Optional working directory
 * @returns A string indicating the command was executed
 */
export async function executeTerminalCommand(command: string, cwd?: string): Promise<string> {
  // Get the workspace root path
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    throw new Error("No workspace folder found. Please open a folder in VS Code.");
  }

  // Get or create terminal
  if (!terminal || terminal.exitStatus !== undefined) {
    // If terminal doesn't exist or has been closed
    terminal = vscode.window.createTerminal({
      name: "Claude Terminal",
      cwd: cwd || workspaceFolders[0].uri.fsPath
    });
  } else if (cwd) {
    // Change directory if specified and terminal already exists
    terminal.sendText(`cd "${cwd}"`, true);
  }

  // Show the terminal
  terminal.show();

  // Send the command
  terminal.sendText(command, true);

  // Return a message indicating the command was executed
  return `Command executed in terminal: ${command}`;
}

/**
 * Handles execution of terminal tools
 * @param toolName The name of the tool to execute
 * @param input The input parameters for the tool
 * @returns A string response from the tool execution
 */
export async function executeTerminalTool(toolName: string, input: any): Promise<string> {
  console.log(`executeTerminalTool: Tool: ${toolName}, Input:`, input);

  if (toolName === "run_command") {
    return await executeTerminalCommand(input.command, input.cwd);
  } else {
    throw new Error(`Unknown terminal tool: ${toolName}`);
  }
}
