import * as vscode from 'vscode';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

export const fileTools: Anthropic.Tool[] = [
  {
    name: "create_file",
    description: "Creates a new file with the specified content at the given path. Use this when you need to create a new file in the project. The path should be relative to the workspace root.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The relative path to the file, e.g., 'src/newfile.ts'" },
        content: { type: "string", description: "The content to write to the file" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "update_file",
    description: "Updates the content of an existing file at the given path. Use this when you need to modify an existing file. The path should be relative to the workspace root.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The relative path to the file" },
        content: { type: "string", description: "The new content to write to the file" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "delete_file",
    description: "Deletes the file at the given path. Use this when you need to remove a file from the project. The path should be relative to the workspace root.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The relative path to the file" }
      },
      required: ["path"]
    }
  },
  {
    name: "read_file",
    description: "Reads the content of the file at the given path. Use this when you need to inspect the current state of a file to answer a question or perform an action. The path should be relative to the workspace root.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The relative path to the file" }
      },
      required: ["path"]
    }
  },
  {
    name: "search_files",
    description: "Searches for files in the workspace that match the given query. Returns a list of file paths.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query string" }
      },
      required: ["query"]
    }
  }
];

export async function executeTool(toolName: string, input: any, showContents: boolean = false): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    throw new Error("No workspace folder found.");
  }
  const rootPath = workspaceFolders[0].uri.fsPath;
  const filePath = path.join(rootPath, input.path);

  try {
    switch (toolName) {
      case "create_file":
      case "update_file":
        const uri = vscode.Uri.file(filePath);
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(input.content));
        return `File ${input.path} has been ${toolName === "create_file" ? "created" : "updated"}.`;
      case "delete_file":
        const deleteUri = vscode.Uri.file(filePath);
        await vscode.workspace.fs.delete(deleteUri);
        return `File ${input.path} has been deleted.`;
      case "read_file":
        const readUri = vscode.Uri.file(filePath);
        const fileData = await vscode.workspace.fs.readFile(readUri);
        const decoder = new TextDecoder();
        const content = decoder.decode(fileData);
        return showContents ? content : '';
      case "search_files":
        const pattern = `**/*${input.query}*`;
        const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);
        const files = uris.map(uri => {
          const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder =>
            uri.fsPath.startsWith(folder.uri.fsPath)
          );

          if (workspaceFolder) {
            return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
          } else {
            return uri.fsPath;
          }
        });

        return files.length > 0 ? files.join('\n') : 'No matching files found.';
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing tool ${toolName}: ${errorMessage}`);
  }
}

/**
 * Search for files in the workspace that match the given query
 */
export async function searchFiles(query: string): Promise<string[]> {
  const pattern = `**/*${query}*`;

  try {
    const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);
    const files = uris.map(uri => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder =>
        uri.fsPath.startsWith(folder.uri.fsPath)
      );

      if (workspaceFolder) {
        return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
      } else {
        return uri.fsPath;
      }
    });

    return files;
  } catch (error) {
    console.error('Error searching files:', error);
    throw new Error('Failed to search files');
  }
}