import express from "express";
import serverless from "serverless-http";
import { storage } from "../../server/storage";
import { registerRoutes } from "../../server/routes";
import { MarketSyncService } from "../../server/marketSync";

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

// Initialize sync service
let isInitialized = false;
let syncService: MarketSyncService;

async function initializeServer() {
  if (!isInitialized) {
    // Initialize sync service (note: in serverless, auto-sync may not work as expected)
    syncService = new MarketSyncService(storage);

    // Register all routes
    await registerRoutes(app);

    console.log("✅ Serverless API initialized");
    isInitialized = true;
  }
}

// Initialize once on cold start
initializeServer();

// Serverless handler
export const handler = async (event: any, context: any) => {
  // Ensure initialization is complete
  await initializeServer();

  // Create serverless handler
  const serverlessHandler = serverless(app);
  return serverlessHandler(event, context);
};
