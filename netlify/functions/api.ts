import express, { Router } from "express";
import serverless from "serverless-http";
import { createStorage } from "../../server/storage";
import { registerRoutes } from "../../server/routes";
import { MarketSyncService } from "../../server/sync";

// Initialize Express app
const app = express();
app.use(express.json());

// CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize storage and routes
let storage: any;
let syncService: any;

async function initializeServer() {
  if (!storage) {
    storage = createStorage();

    // Initialize sync service (runs in serverless context)
    syncService = new MarketSyncService(storage);

    // Register all routes
    registerRoutes(app, storage);

    console.log("✅ Serverless API initialized");
  }
}

// Serverless handler
export const handler = async (event: any, context: any) => {
  // Initialize on first request
  await initializeServer();

  // Create serverless handler
  const serverlessHandler = serverless(app);
  return serverlessHandler(event, context);
};
