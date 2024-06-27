"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = void 0;
const vscode = __importStar(require("vscode"));
const connect_1 = require("../connection/connect"); // Ensure correct path to connect.ts
async function checkDatabaseConnection(client) {
    try {
        if (!client) {
            client = await (0, connect_1.createClient)();
            if (!client) {
                throw new Error("Failed to create a new PostgreSQL client.");
            }
            await client.connect(); // Ensure the newly created client is connected
        }
        // This line checks if the connection is active by running a simple query
        await client.query("SELECT 1");
        vscode.window.showInformationMessage("Connected to PostgreSQL database.");
    }
    catch (error) {
        // vscode.window.showErrorMessage(
        //   "PostgreSQL database connection error: " +
        //     (error instanceof Error ? error.message : String(error))
        // );
        try {
            // Attempt to create a new client and connect again
            client = await (0, connect_1.createClient)();
            if (!client) {
                throw new Error("Failed to create a new PostgreSQL client.");
            }
            await client.connect(); // Ensure the newly created client is connected
            await client.query("SELECT 1");
            vscode.window.showInformationMessage("Reconnected to PostgreSQL database.");
        }
        catch (retryError) {
            vscode.window.showErrorMessage("Retry failed: PostgreSQL database connection error: " +
                (retryError instanceof Error
                    ? retryError.message
                    : String(retryError)));
        }
    }
}
exports.checkDatabaseConnection = checkDatabaseConnection;
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
//# sourceMappingURL=monitoring.js.map