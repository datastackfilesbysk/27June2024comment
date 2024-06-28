import * as vscode from "vscode";
import { Client } from "pg";
import { createClient } from "../connection/connect"; // Ensure correct path to connect.ts

export async function checkDatabaseConnection(client: Client | null) {
  try {
    if (!client) {
      client = await createClient();
      if (!client) {
        throw new Error("Failed to create a new PostgreSQL client.");
      }
      await client.connect(); // Ensure the newly created client is connected
    }
    // This line checks if the connection is active by running a simple query
    await client.query("SELECT 1");
    //vscode.window.showInformationMessage("Connected to PostgreSQL database.");
  } catch (error: any) {
    // vscode.window.showErrorMessage(
    //   "PostgreSQL database connection error: " +
    //     (error instanceof Error ? error.message : String(error))
    // );
    try {
      // Attempt to create a new client and connect again
      client = await createClient();
      if (!client) {
        throw new Error("Failed to create a new PostgreSQL client.");
      }
      await client.connect(); // Ensure the newly created client is connected
      await client.query("SELECT 1");
      // vscode.window.showInformationMessage(
      //   "Reconnected to PostgreSQL database."
      // );
    } catch (retryError: any) {
      vscode.window.showErrorMessage(
        "Retry failed: PostgreSQL database connection error: " +
          (retryError instanceof Error
            ? retryError.message
            : String(retryError))
      );
    }
  }
}

// import * as vscode from "vscode";
// import { Client } from "pg";

// export async function checkDatabaseConnection(client: Client) {
//   try {
//     if (!client) {
//       throw new Error("PostgreSQL client is not available.");
//     }
//     await client.query("SELECT 1");
//     vscode.window.showInformationMessage("Connected to PostgreSQL database.");
//   } catch (error: any) {
//     vscode.window.showErrorMessage(
//       "PostgreSQL database connection error: " +
//         (error instanceof Error ? error.message : String(error))
//     );
//   }
// }
