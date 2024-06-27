import * as vscode from "vscode";
import { connectToPostgres } from "./databases/connection/connect";
import { checkDatabaseConnection } from "./databases/monitoring/monitoring";
import { insertinFile } from "./databases/operation/fileoperation/fileop";
import { checkComments } from "./commentuser/commentchecker";
import { Language_Constants } from "./constants/languageConstants";
import { GetLoggedInUserData } from "./getuserinfo";

export async function activate(context: vscode.ExtensionContext) {
  // Register the command to get user info
  let currentUserInfo = vscode.commands.registerCommand(
    "codeCommentReviewer.getUserInfo",
    async () => {
      await GetLoggedInUserData();
    }
  );
  context.subscriptions.push(currentUserInfo);

  // Register the comment checker command
  let reviewCommentsCommand = vscode.commands.registerCommand(
    "codeCommentReviewer.reviewComments",
    async () => {}
  );
  context.subscriptions.push(reviewCommentsCommand);

  // Register the command to save file info
  let saveinf = vscode.commands.registerCommand(
    "codeCommentReviewer.savefileinfo",
    async () => {}
  );
  context.subscriptions.push(saveinf);

  // Execute the registered commands
  vscode.commands.executeCommand("codeCommentReviewer.getUserInfo");
  vscode.commands.executeCommand("codeCommentReviewer.reviewComments");

  // Call the connectToPostgres function for database connectivity
  let client = await connectToPostgres();
  if (!client) {
    vscode.window.showErrorMessage("Failed to connect to PostgreSQL database.");
    return;
  }

  // Function to handle comment checking and saving file info
  const handleDocument = async (document: vscode.TextDocument) => {
    const fileName = document.fileName;
    const baseName = fileName.split("\\").pop()!;
    // Check if the file ends with '.cs' and ensure it's not part of a '.cshtml' file
    if (baseName.endsWith(".cs") && !containsCshtmlInName(baseName)) {
      // Further validate by languageId if necessary
      if (document.languageId === Language_Constants.C_SHARP) {
        vscode.commands.executeCommand("codeCommentReviewer.reviewComments");
        const content: string = document.getText();
        try {
          const result = await checkComments(content, baseName);
          // Update workspace state if needed
          context.workspaceState.update("content", content);
          context.workspaceState.update("filename", baseName);
          context.workspaceState.update("Main folder :", fileName);
        } catch (error) {
          console.error("Error occurred while checking comments:", error);
        }

        // Assuming insertinFile is a function that handles inserting content into a file
        await insertinFile(client, context, content, baseName, fileName);
      }
    }
  };

  // Process all currently opened text documents
  vscode.workspace.textDocuments.forEach(handleDocument);

  // Register the comment checker for newly opened documents
  let commentinfo = vscode.workspace.onDidOpenTextDocument(handleDocument);
  context.subscriptions.push(commentinfo);

  // Register the comment checker for document save
  let saveCommentInfo = vscode.workspace.onDidSaveTextDocument(handleDocument);
  context.subscriptions.push(saveCommentInfo);

  // Register the comment checker for document close
  let closeCommentInfo =
    vscode.workspace.onDidCloseTextDocument(handleDocument);
  context.subscriptions.push(closeCommentInfo);

  // Schedule checkDatabaseConnection to run every 30 seconds
  setInterval(async () => {
    await checkDatabaseConnection(client);
  }, 30 * 1000);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function containsCshtmlInName(fileName: string): boolean {
  // Check if the fileName matches the pattern '.cshtml_<anything>.cs'
  return /\.cshtml_[^\.]+\.cs$/.test(fileName);
}
