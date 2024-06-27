import * as vscode from "vscode";
import simpleGit, { SimpleGit } from "simple-git";
import { readdir, readFile } from "fs/promises";
import { resolve, join, relative } from "path";

interface RepositoryInfo {
  url: string;
  mainFolderName: string;
  currentBranch: string;
  status: any; // You might want to type this properly
  commits: any[]; // You might want to type this properly
  commitDiffs: any[]; // You might want to type this properly
  branchDetails: any[]; // You might want to type this properly
  directoryHierarchy: DirectoryInfo;
  configUrls: string[]; // Add configUrls to the interface
}

interface DirectoryInfo {
  name: string;
  path: string;
  subdirectories: DirectoryInfo[];
}

async function findGitRootInSubdirectories(
  currentPath: string
): Promise<string | null> {
  const items = await readdir(currentPath, { withFileTypes: true });
  for (const item of items) {
    const itemPath = join(currentPath, item.name);
    if (item.isDirectory()) {
      if (item.name === ".git") {
        return currentPath;
      } else {
        const gitRoot = await findGitRootInSubdirectories(itemPath);
        if (gitRoot) {
          return gitRoot;
        }
      }
    }
  }
  return null;
}

async function getDirectoryHierarchy(
  dirPath: string,
  basePath: string
): Promise<DirectoryInfo> {
  const dirInfo: DirectoryInfo = {
    name: relative(basePath, dirPath) || ".", // Use relative path
    path: dirPath,
    subdirectories: [],
  };

  const items = await readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = join(dirPath, item.name);
    if (item.isDirectory()) {
      const subDirInfo = await getDirectoryHierarchy(itemPath, basePath);
      dirInfo.subdirectories.push(subDirInfo);
    }
  }

  return dirInfo;
}

function extractUrlsFromConfig(configContent: string): string[] {
  const urlPattern = /url\s*=\s*(.+)/g;
  const urls: string[] = [];
  let match;
  while ((match = urlPattern.exec(configContent)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

export async function fetchRepositoryInfo(
  repoPath: string
): Promise<RepositoryInfo> {
  const gitRoot = await findGitRootInSubdirectories(repoPath);
  if (!gitRoot) {
    throw new Error(
      "No Git repository found in the current project hierarchy."
    );
  }

  const git: SimpleGit = simpleGit(gitRoot);

  let remoteUrl: string | null = null;
  try {
    remoteUrl = await git.listRemote(["--get-url"]);
  } catch (error) {
    remoteUrl = null;
  }

  const mainFolderName = resolve(gitRoot).split("/").pop()!;
  //vscode.window.showInformationMessage(mainFolderName, "from get project info");
  const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);

  const status = await git.status();
  const commits = await git.log();
  const commitDiffs = await git.diffSummary();
  const branchDetails = await Promise.all(
    status.tracking ? [await git.log([status.tracking])] : []
  );

  const directoryHierarchy = await getDirectoryHierarchy(gitRoot, gitRoot);

  // Read the .git/config file and extract URLs
  const configFilePath = join(gitRoot, ".git", "config");
  let configFileContent = "";
  let configUrls: string[] = [];
  try {
    configFileContent = await readFile(configFilePath, "utf-8");
    configUrls = extractUrlsFromConfig(configFileContent);
  } catch (error) {
    vscode.window.showErrorMessage(`Error reading config file: ${error}`);
  }

  return {
    url: remoteUrl ? remoteUrl.trim() : "",
    mainFolderName,
    currentBranch: currentBranch.trim(),
    status,
    commits: [...commits.all],
    commitDiffs: commitDiffs.files,
    branchDetails,
    directoryHierarchy,
    configUrls, // Include the extracted URLs in the returned object
  };
}

// Function to display repository information
export async function displayRepositoryInfo() {
  const repoPath = vscode.workspace.rootPath;
  if (repoPath) {
    try {
      const repoInfo = await fetchRepositoryInfo(repoPath);
      // Display the config URLs (you can adjust this as needed)
      // vscode.window.showInformationMessage(
      //   `Config URLs: ${repoInfo.configUrls.join(", ")}`
      // );
      return repoInfo;
    } catch (error: any) {
      vscode.window.showErrorMessage(
        `Error fetching repository info: ${error.message}`
      );
    }
  } else {
    vscode.window.showErrorMessage("No workspace opened.");
  }
  return null;
}

// import * as vscode from "vscode";
// import simpleGit, { SimpleGit } from "simple-git";
// import { readdir } from "fs/promises";
// import { resolve, join, relative } from "path";

// interface RepositoryInfo {
//   url: string | null;
//   mainFolderName: string;
//   currentBranch: string;
//   status: any; // You might want to type this properly
//   commits: any[]; // You might want to type this properly
//   commitDiffs: any[]; // You might want to type this properly
//   branchDetails: any[]; // You might want to type this properly
//   directoryHierarchy: DirectoryInfo;
// }

// interface DirectoryInfo {
//   name: string;
//   path: string;
//   subdirectories: DirectoryInfo[];
// }

// async function findGitRootInSubdirectories(
//   currentPath: string
// ): Promise<string | null> {
//   const items = await readdir(currentPath, { withFileTypes: true });
//   for (const item of items) {
//     const itemPath = join(currentPath, item.name);
//     if (item.isDirectory()) {
//       if (item.name === ".git") {
//         return currentPath;
//       } else {
//         const gitRoot = await findGitRootInSubdirectories(itemPath);
//         if (gitRoot) {
//           return gitRoot;
//         }
//       }
//     }
//   }
//   return null;
// }

// async function getDirectoryHierarchy(
//   dirPath: string,
//   basePath: string
// ): Promise<DirectoryInfo> {
//   const dirInfo: DirectoryInfo = {
//     name: relative(basePath, dirPath) || ".", // Use relative path
//     path: dirPath,
//     subdirectories: [],
//   };

//   const items = await readdir(dirPath, { withFileTypes: true });

//   for (const item of items) {
//     const itemPath = join(dirPath, item.name);
//     if (item.isDirectory()) {
//       const subDirInfo = await getDirectoryHierarchy(itemPath, basePath);
//       dirInfo.subdirectories.push(subDirInfo);
//     }
//   }

//   return dirInfo;
// }

// export async function fetchRepositoryInfo(
//   repoPath: string
// ): Promise<RepositoryInfo> {
//   const gitRoot = await findGitRootInSubdirectories(repoPath);
//   if (!gitRoot) {
//     throw new Error(
//       "No Git repository found in the current project hierarchy."
//     );
//   }

//   const git: SimpleGit = simpleGit(gitRoot);

//   let remoteUrl: string | null = null;
//   try {
//     remoteUrl = await git.listRemote(["--get-url"]);
//   } catch (error) {
//     remoteUrl = null;
//   }

//   const mainFolderName = resolve(gitRoot).split("/").pop()!;
//   vscode.window.showInformationMessage(mainFolderName, "from get project info");
//   const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);

//   const status = await git.status();
//   const commits = await git.log();
//   const commitDiffs = await git.diffSummary();
//   const branchDetails = await Promise.all(
//     status.tracking ? [await git.log([status.tracking])] : []
//   );

//   const directoryHierarchy = await getDirectoryHierarchy(gitRoot, gitRoot);

//   return {
//     url: remoteUrl ? remoteUrl.trim() : null,
//     mainFolderName,
//     currentBranch: currentBranch.trim(),
//     status,
//     commits: [...commits.all],
//     commitDiffs: commitDiffs.files,
//     branchDetails,
//     directoryHierarchy,
//   };
// }

// // function to display repository information
// export async function displayRepositoryInfo() {
//   const repoPath = vscode.workspace.rootPath;
//   if (repoPath) {
//     try {
//       const repoInfo = await fetchRepositoryInfo(repoPath);
//       return repoInfo;
//     } catch (error: any) {
//       vscode.window.showErrorMessage(
//         `Error fetching repository info: ${error.message}`
//       );
//     }
//   } else {
//     vscode.window.showErrorMessage("No workspace opened.");
//   }
//   return null;
// }
