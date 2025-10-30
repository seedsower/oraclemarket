import type { Express } from "express";
import { storage } from "./storage";
import { insertMarketSchema, insertOrderSchema, insertTradeSchema, insertStakeSchema, insertProposalSchema } from "@shared/schema";

// Serverless-compatible route registration (no WebSockets)
export function registerServerlessRoutes(app: Express): void {
  // Markets
  app.get("/api/markets", async (req, res) => {
    try {
      const { category, status, search, limit, offset } = req.query;

      const markets = await storage.getMarkets({
        category: category as string,
        status: status as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(markets);
    } catch (error: any) {
      console.error("Error fetching markets:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    try {
      const market = await storage.getMarket(req.params.id);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(market);
    } catch (error: any) {
      console.error("Error fetching market:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/markets", async (req, res) => {
    try {
      const parsed = insertMarketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid market data", errors: parsed.error });
      }

      const market = await storage.createMarket(parsed.data);
      res.status(201).json(market);
    } catch (error: any) {
      console.error("Error creating market:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/markets/:id/trade", async (req, res) => {
    try {
      const { volume, traderAddress } = req.body;
      const market = await storage.getMarket(req.params.id);

      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      const newVolume = Number(market.totalVolume) + Number(volume);
      const newTraderCount = (market.tradersCount || 0) + 1;

      const updated = await storage.updateMarket(req.params.id, {
        totalVolume: newVolume.toString(),
        tradersCount: newTraderCount,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating market trade:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/markets/:id/status", async (req, res) => {
    try {
      const { status, resolvedOutcome } = req.body;
      const market = await storage.getMarket(req.params.id);

      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      const updates: any = { status };

      if (resolvedOutcome !== undefined && resolvedOutcome !== null) {
        updates.resolvedOutcome = resolvedOutcome;
        updates.resolutionTime = new Date();
      }

      const updated = await storage.updateMarket(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating market status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Positions
  app.get("/api/positions/user/:address", async (req, res) => {
    try {
      const positions = await storage.getPositionsByUser(req.params.address);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(positions);
    } catch (error: any) {
      console.error("Error fetching user positions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/positions", async (req, res) => {
    try {
      const { userAddress, marketId, outcome, shares, averagePrice, totalCost, status } = req.body;

      const existingPositions = await storage.getPositionsByUser(userAddress);
      const existingPosition = existingPositions.find(
        p => p.marketId === marketId && p.outcome === outcome && p.status === "open"
      );

      if (existingPosition) {
        const newShares = Number(existingPosition.shares) + Number(shares);
        const newTotalCost = Number(existingPosition.totalCost) + Number(totalCost);
        const newAvgPrice = newTotalCost / newShares;

        const updated = await storage.updatePosition(existingPosition.id, {
          shares: newShares.toString(),
          averagePrice: newAvgPrice.toString(),
          totalCost: newTotalCost.toString(),
        });

        return res.json(updated);
      }

      const position = await storage.createPosition({
        userAddress,
        marketId,
        outcome,
        shares,
        averagePrice,
        totalCost,
        status: status || "open",
      });

      // Update user stats
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
            totalProfit: "0",
            winRate: 0,
          });
        }
      } catch (statsError) {
        console.error("Error updating user stats:", statsError);
      }

      res.status(201).json(position);
    } catch (error: any) {
      console.error("Error creating position:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // User Stats
  app.get("/api/user-stats/:address", async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.address);
      if (!stats) {
        return res.json({
          userAddress: req.params.address,
          totalVolume: "0",
          marketsTraded: 0,
          totalProfit: "0",
          winRate: 0,
        });
      }
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const { marketId, userAddress, status } = req.query;
      const orders = await storage.getOrders({
        marketId: marketId as string,
        userAddress: userAddress as string,
        status: status as string,
      });
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/market/:marketId", async (req, res) => {
    try {
      const orders = await storage.getOrders({
        marketId: req.params.marketId,
      });
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching market orders:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = insertOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid order data", errors: parsed.error });
      }

      const order = await storage.createOrder(parsed.data);
      res.status(201).json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Trades
  app.get("/api/trades", async (req, res) => {
    try {
      const { marketId } = req.query;
      const trades = await storage.getTrades({ marketId: marketId as string });
      res.json(trades);
    } catch (error: any) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const parsed = insertTradeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid trade data", errors: parsed.error });
      }

      const trade = await storage.createTrade(parsed.data);
      res.status(201).json(trade);
    } catch (error: any) {
      console.error("Error creating trade:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stakes
  app.get("/api/stakes", async (req, res) => {
    try {
      // Return all stakes or empty array for now
      res.json([]);
    } catch (error: any) {
      console.error("Error fetching stakes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stakes/:address", async (req, res) => {
    try {
      const stakes = await storage.getUserStakes(req.params.address);
      res.json(stakes);
    } catch (error: any) {
      console.error("Error fetching user stakes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stakes/user/:address", async (req, res) => {
    try {
      const stakes = await storage.getUserStakes(req.params.address);
      res.json(stakes);
    } catch (error: any) {
      console.error("Error fetching user stakes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stakes", async (req, res) => {
    try {
      const parsed = insertStakeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid stake data", errors: parsed.error });
      }

      const stake = await storage.createStake(parsed.data);
      res.status(201).json(stake);
    } catch (error: any) {
      console.error("Error creating stake:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Proposals
  app.get("/api/proposals", async (req, res) => {
    try {
      const { status } = req.query;
      // NeonServerlessStorage uses filters object, others use string
      const proposals = (storage as any).getProposals
        ? await (storage as any).getProposals(status ? { status: status as string } : undefined)
        : [];
      res.json(proposals);
    } catch (error: any) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/proposals", async (req, res) => {
    try {
      const parsed = insertProposalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid proposal data", errors: parsed.error });
      }

      const proposal = await storage.createProposal(parsed.data);
      res.status(201).json(proposal);
    } catch (error: any) {
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      // For now, return empty leaderboard
      // In the future, this could aggregate user stats and rank them
      res.json([]);
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: error.message });
    }
  });

  console.log("✅ Serverless routes registered");
}
