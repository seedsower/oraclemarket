import express, { type Express } from "express";
import serverless from "serverless-http";
import { storage } from "../../server/storage";
import { insertMarketSchema } from "../../shared/schema";

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Initialize services
let isInitialized = false;

async function registerApiRoutes(app: Express) {
  // Markets
  app.get("/api/markets", async (req, res) => {
    try {
      const { category, status, search, limit, offset } = req.query;
      const markets = await storage.getMarkets({
        category: category as string,
        status: status as any,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(markets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    try {
      const market = await storage.getMarket(req.params.id);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      res.json(market);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/markets", async (req, res) => {
    try {
      const data = insertMarketSchema.parse(req.body);
      const market = await storage.createMarket(data);
      res.status(201).json(market);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User stats
  app.get("/api/user-stats/:address", async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.address);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Positions
  app.get("/api/positions/user/:address", async (req, res) => {
    try {
      const positions = await storage.getPositionsByUser(req.params.address);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add other essential routes as needed
  console.log("✅ API routes registered");
}

async function initializeServer() {
  if (!isInitialized) {
    // Register all routes
    await registerApiRoutes(app);

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
