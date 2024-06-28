import * as vscode from "vscode";
import { Client } from "pg";
import { displayRepositoryInfo } from "./getProjectinfo";
import * as path from "path";

// Your code using path module here

export async function checkProjectEntry(
  client: Client,
  filemainFolder: string
) {
  try {
    if (!client) {
      vscode.window.showErrorMessage("Database client is not connected.");
      return;
    }

    // Call the displayRepositoryInfo function and await its result
    const projectres = await displayRepositoryInfo();
    if (!projectres) {
      vscode.window.showErrorMessage("No project information returned.");
      return;
    }
    const projecturl = projectres.url;
    const mainFoldername = projectres.mainFolderName;

    //vscode.window.showInformationMessage("Main Folder Name:", mainFoldername);
    const query = `SELECT * FROM dotnet.projects WHERE git_repo_url = $1`;

    try {
      const res = await client.query(query, [projecturl]);
      if (res.rows.length > 0 && filemainFolder.includes(mainFoldername)) {
        const project = res.rows[0];
        // vscode.window.showInformationMessage(
        //   `Project Found: ${project.name}, Status: ${project.status}, Status Change Date: ${project.status_change_date}`
        // );
        return Number.parseInt(project.id);
      } else {
       // vscode.window.showInformationMessage("Project not found.");
        return null;
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error querying database: ${err.message}`);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Error fetching project information: ${error.message}`
    );
  }
}
