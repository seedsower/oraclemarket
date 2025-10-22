import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, setAIOracle, setAIMarketCreator } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedData } from "./seed";
import { MarketSyncService } from "./marketSync";
import { AIOracle } from "./aiOracle";
import { AIMarketCreator } from "./aiMarketCreator";
import { storage } from "./storage";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    await seedData();

    // Start market sync service
    const syncService = new MarketSyncService(storage);
    syncService.startAutoSync(30000); // Sync every 30 seconds
    syncService.watchMarketEvents(); // Watch for real-time events

    log('✅ Market sync service started');

    // Start AI Oracle service
    const aiOracle = new AIOracle(storage);
    setAIOracle(aiOracle); // Make available to API routes
    aiOracle.startAutoResolution(86400000); // Check every 24 hours (1 day)

    log('✅ AI Oracle service started');

    // Start AI Market Creator service
    const aiMarketCreator = new AIMarketCreator(storage);
    setAIMarketCreator(aiMarketCreator); // Make available to API routes
    aiMarketCreator.startAutoCreation(86400000); // Check every 24 hours (1 day)

    log('✅ AI Market Creator service started');
  });
})();
