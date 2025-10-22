import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { AIOracle } from "./aiOracle";
import { insertMarketSchema, insertOrderSchema, insertTradeSchema, insertStakeSchema, insertProposalSchema } from "@shared/schema";

// Initialize AI Oracle instance (will be used by API routes)
let aiOracleInstance: AIOracle | null = null;
let aiMarketCreatorInstance: any | null = null;

export function setAIOracle(oracle: AIOracle) {
  aiOracleInstance = oracle;
}

export function setAIMarketCreator(creator: any) {
  aiMarketCreatorInstance = creator;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      console.log('Received:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast helper
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Markets
  app.get("/api/markets", async (req, res) => {
    const { category, status, search, limit, offset } = req.query;
    
    const markets = await storage.getMarkets({
      category: category as string,
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    
    res.json(markets);
  });

  app.get("/api/markets/:id", async (req, res) => {
    const market = await storage.getMarket(req.params.id);
    if (!market) {
      return res.status(404).json({ message: "Market not found" });
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(market);
  });

  app.post("/api/markets", async (req, res) => {
    console.log("📥 POST /api/markets - Request body chainId:", req.body.chainId);
    const parsed = insertMarketSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("❌ Validation failed:", parsed.error);
      return res.status(400).json({ message: "Invalid market data", errors: parsed.error });
    }

    console.log("✅ Validation passed. Parsed data chainId:", parsed.data.chainId);
    const market = await storage.createMarket(parsed.data);
    console.log("💾 Market created with chainId:", market.chainId);
    broadcast({ type: 'market_created', data: market });
    res.status(201).json(market);
  });

  app.patch("/api/markets/:id/trade", async (req, res) => {
    const { volume, traderAddress } = req.body;
    console.log("📊 PATCH /api/markets/:id/trade - Volume:", volume, "Trader:", traderAddress);

    const market = await storage.getMarket(req.params.id);

    if (!market) {
      return res.status(404).json({ message: "Market not found" });
    }

    console.log("📈 Current market stats - Total Volume:", market.totalVolume, "Traders:", market.tradersCount);

    const newVolume = Number(market.totalVolume) + Number(volume);
    const newTraderCount = (market.tradersCount || 0) + 1;

    console.log("📈 New market stats - Total Volume:", newVolume, "Traders:", newTraderCount);

    const updated = await storage.updateMarket(req.params.id, {
      totalVolume: newVolume.toString(),
      tradersCount: newTraderCount,
    });

    console.log("✅ Market updated:", { id: updated?.id, totalVolume: updated?.totalVolume, tradersCount: updated?.tradersCount });

    broadcast({ type: 'market_updated', data: updated });
    res.json(updated);
  });

  app.patch("/api/markets/:id/status", async (req, res) => {
    const { status, resolvedOutcome } = req.body;
    console.log("🔄 PATCH /api/markets/:id/status - Status:", status, "Outcome:", resolvedOutcome);

    const market = await storage.getMarket(req.params.id);

    if (!market) {
      return res.status(404).json({ message: "Market not found" });
    }

    const updates: Partial<typeof market> = {
      status: status,
    };

    if (resolvedOutcome !== undefined && resolvedOutcome !== null) {
      updates.resolvedOutcome = resolvedOutcome;
      updates.resolutionTime = new Date();
    }

    const updated = await storage.updateMarket(req.params.id, updates);

    console.log("✅ Market status updated:", { id: updated?.id, status: updated?.status, resolvedOutcome: updated?.resolvedOutcome });

    broadcast({ type: 'market_updated', data: updated });
    res.json(updated);
  });

  // Positions
  app.get("/api/positions/user/:address", async (req, res) => {
    const positions = await storage.getPositionsByUser(req.params.address);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(positions);
  });

  app.post("/api/positions", async (req, res) => {
    const { userAddress, marketId, outcome, shares, averagePrice, totalCost, status } = req.body;
    console.log("📍 POST /api/positions - Creating position:", { userAddress, marketId, outcome, shares, totalCost });

    // Check if position already exists for this user/market/outcome
    const existingPositions = await storage.getPositionsByUser(userAddress);
    const existingPosition = existingPositions.find(
      p => p.marketId === marketId && p.outcome === outcome && p.status === "open"
    );

    console.log("📍 Existing positions count:", existingPositions.length, "Found existing:", !!existingPosition);

    if (existingPosition) {
      // Update existing position (add shares, recalculate average price)
      const newShares = Number(existingPosition.shares) + Number(shares);
      const newTotalCost = Number(existingPosition.totalCost) + Number(totalCost);
      const newAvgPrice = newTotalCost / newShares;

      const updated = await storage.updatePosition(existingPosition.id, {
        shares: newShares.toString(),
        averagePrice: newAvgPrice.toString(),
        totalCost: newTotalCost.toString(),
      });

      console.log("✅ Position updated:", { id: updated?.id, shares: updated?.shares, totalCost: updated?.totalCost });
      return res.json(updated);
    }

    // Create new position
    const position = await storage.createPosition({
      userAddress,
      marketId,
      outcome,
      shares,
      averagePrice,
      totalCost,
      status: status || "open",
    });

    console.log("✅ Position created:", { id: position.id, shares: position.shares, totalCost: position.totalCost });

    // Create or update user stats
    try {
      const existingStats = await storage.getUserStats(userAddress);
      if (existingStats) {
        await storage.updateUserStats(userAddress, {
          totalVolume: (Number(existingStats.totalVolume) + Number(totalCost)).toString(),
          marketsTraded: existingStats.marketsTraded + 1,
        });
      } else {
        await storage.createUserStats({
          userAddress,
          totalVolume: totalCost,
          marketsTraded: 1,
        });
      }
    } catch (error) {
      console.error("Failed to update user stats:", error);
      // Don't fail the whole request if stats update fails
    }

    res.status(201).json(position);
  });

  // Orders
  app.get("/api/orders/user/:address", async (req, res) => {
    const orders = await storage.getOrdersByUser(req.params.address);
    res.json(orders);
  });

  app.get("/api/orders/market/:marketId", async (req, res) => {
    const orders = await storage.getOrdersByMarket(req.params.marketId);
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    const parsed = insertOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid order data", errors: parsed.error });
    }

    const order = await storage.createOrder(parsed.data);
    broadcast({ type: 'order_created', data: order });
    res.status(201).json(order);
  });

  app.patch("/api/orders/:id", async (req, res) => {
    const order = await storage.updateOrder(req.params.id, req.body);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    broadcast({ type: 'order_updated', data: order });
    res.json(order);
  });

  // Trades
  app.get("/api/trades/market/:marketId", async (req, res) => {
    const trades = await storage.getTradesByMarket(req.params.marketId);
    res.json(trades);
  });

  app.post("/api/trades", async (req, res) => {
    const parsed = insertTradeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid trade data", errors: parsed.error });
    }

    const trade = await storage.createTrade(parsed.data);
    
    // Update market metrics
    const market = await storage.getMarket(parsed.data.marketId);
    if (market) {
      const newVolume = Number(market.totalVolume) + Number(parsed.data.volume);
      await storage.updateMarket(parsed.data.marketId, {
        totalVolume: newVolume.toString(),
      });
    }

    broadcast({ type: 'trade_executed', data: trade });
    res.status(201).json(trade);
  });

  // Staking
  app.get("/api/stakes", async (req, res) => {
    const stakes = await storage.getAllStakes();
    res.json(stakes);
  });

  app.get("/api/stakes/:address", async (req, res) => {
    const stake = await storage.getStake(req.params.address);
    if (!stake) {
      return res.status(404).json({ message: "Stake not found" });
    }
    res.json(stake);
  });

  app.post("/api/stakes", async (req, res) => {
    const parsed = insertStakeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid stake data", errors: parsed.error });
    }

    const stake = await storage.createStake(parsed.data);
    res.status(201).json(stake);
  });

  app.patch("/api/stakes/:address", async (req, res) => {
    const stake = await storage.updateStake(req.params.address, req.body);
    if (!stake) {
      return res.status(404).json({ message: "Stake not found" });
    }
    res.json(stake);
  });

  // Governance
  app.get("/api/proposals", async (req, res) => {
    const { status } = req.query;
    const proposals = await storage.getProposals(status as string);
    res.json(proposals);
  });

  app.get("/api/proposals/:id", async (req, res) => {
    const proposal = await storage.getProposal(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    res.json(proposal);
  });

  app.post("/api/proposals", async (req, res) => {
    const parsed = insertProposalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid proposal data", errors: parsed.error });
    }

    const proposal = await storage.createProposal(parsed.data);
    broadcast({ type: 'proposal_created', data: proposal });
    res.status(201).json(proposal);
  });

  app.patch("/api/proposals/:id/vote", async (req, res) => {
    const { vote, amount } = req.body; // vote: 'for' | 'against', amount: string
    
    const proposal = await storage.getProposal(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const updated = await storage.updateProposal(req.params.id, {
      forVotes: vote === 'for' 
        ? (Number(proposal.forVotes) + Number(amount)).toString()
        : proposal.forVotes,
      againstVotes: vote === 'against'
        ? (Number(proposal.againstVotes) + Number(amount)).toString()
        : proposal.againstVotes,
    });

    broadcast({ type: 'proposal_voted', data: updated });
    res.json(updated);
  });

  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    const { limit } = req.query;
    const leaderboard = await storage.getLeaderboard(
      limit ? parseInt(limit as string) : 100
    );
    res.json(leaderboard);
  });

  app.get("/api/user-stats/:address", async (req, res) => {
    const stats = await storage.getUserStats(req.params.address);
    if (!stats) {
      // Return default empty stats instead of 404
      return res.json({
        userAddress: req.params.address,
        totalPnL: "0",
        pnL24h: "0",
        pnL7d: "0",
        pnL30d: "0",
        totalVolume: "0",
        marketsTraded: 0,
        winRate: "0",
        roi: "0",
        rank: null,
        badges: [],
      });
    }
    res.json(stats);
  });

  // AI Oracle endpoints
  app.post("/api/oracle/resolve/:marketId", async (req, res) => {
    if (!aiOracleInstance) {
      return res.status(503).json({ message: "AI Oracle not initialized" });
    }

    const market = await storage.getMarket(req.params.marketId);
    if (!market) {
      return res.status(404).json({ message: "Market not found" });
    }

    if (market.status !== 'active' && market.status !== 'closed') {
      return res.status(400).json({ message: "Market is not eligible for resolution" });
    }

    try {
      await aiOracleInstance.resolveMarket(market);
      const updatedMarket = await storage.getMarket(req.params.marketId);
      res.json({
        message: "Market resolution initiated",
        market: updatedMarket
      });
    } catch (error) {
      console.error("Manual resolution error:", error);
      res.status(500).json({
        message: "Failed to resolve market",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/oracle/status", async (req, res) => {
    const hasAIOracle = !!aiOracleInstance && !!process.env.ANTHROPIC_API_KEY;
    const hasWallet = !!process.env.PRIVATE_KEY;

    // Get markets eligible for resolution
    const markets = await storage.getMarkets({ status: 'active' });
    const now = new Date();
    const eligibleMarkets = markets.filter(m => {
      return m.closingTime && new Date(m.closingTime) < now;
    });

    res.json({
      enabled: hasAIOracle && hasWallet,
      hasAPIKey: !!process.env.ANTHROPIC_API_KEY,
      hasWallet: hasWallet,
      eligibleMarkets: eligibleMarkets.length,
      markets: eligibleMarkets.map(m => ({
        id: m.id,
        chainId: m.chainId,
        question: m.question,
        closingTime: m.closingTime,
      })),
    });
  });

  // AI Market Creator endpoints
  app.post("/api/creator/create", async (_req, res) => {
    if (!aiMarketCreatorInstance) {
      return res.status(503).json({ message: "AI Market Creator not initialized" });
    }

    try {
      // Trigger market creation in background
      aiMarketCreatorInstance.researchAndCreateMarkets();
      res.json({
        message: "AI Market Creator triggered successfully. Check logs for progress.",
      });
    } catch (error) {
      console.error("Manual market creation trigger error:", error);
      res.status(500).json({
        message: "Failed to trigger market creation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/creator/create-topic", async (req, res) => {
    if (!aiMarketCreatorInstance) {
      return res.status(503).json({ message: "AI Market Creator not initialized" });
    }

    const { topic } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ message: "Topic is required" });
    }

    try {
      await aiMarketCreatorInstance.createMarketForTopic(topic);
      res.json({
        message: `Market created for topic: ${topic}`,
      });
    } catch (error) {
      console.error("Topic-based market creation error:", error);
      res.status(500).json({
        message: "Failed to create market for topic",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/creator/status", async (_req, res) => {
    const hasCreator = !!aiMarketCreatorInstance && !!process.env.ANTHROPIC_API_KEY;
    const hasWallet = !!process.env.PRIVATE_KEY;

    res.json({
      enabled: hasCreator && hasWallet,
      hasAPIKey: !!process.env.ANTHROPIC_API_KEY,
      hasWallet: hasWallet,
    });
  });

  return httpServer;
}
