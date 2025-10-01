import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMarketSchema, insertOrderSchema, insertTradeSchema, insertStakeSchema, insertProposalSchema } from "@shared/schema";

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
    res.json(market);
  });

  app.post("/api/markets", async (req, res) => {
    const parsed = insertMarketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid market data", errors: parsed.error });
    }

    const market = await storage.createMarket(parsed.data);
    broadcast({ type: 'market_created', data: market });
    res.status(201).json(market);
  });

  // Positions
  app.get("/api/positions/user/:address", async (req, res) => {
    const positions = await storage.getPositionsByUser(req.params.address);
    res.json(positions);
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
      return res.status(404).json({ message: "User stats not found" });
    }
    res.json(stats);
  });

  return httpServer;
}
