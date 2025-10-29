import { randomUUID } from "crypto";
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '@shared/schema';
import pg from 'pg';
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import type {
  Market, InsertMarket,
  Position, InsertPosition,
  Order, InsertOrder,
  Trade, InsertTrade,
  Stake, InsertStake,
  Proposal, InsertProposal,
  UserStats, InsertUserStats,
} from "@shared/schema";

const { Pool } = pg;

// Enable WebSocket for Neon in serverless environments
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
}

export interface IStorage {
  // Markets
  getMarket(id: string): Promise<Market | undefined>;
  getMarkets(filters?: {
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Market[]>;
  createMarket(market: InsertMarket): Promise<Market>;
  updateMarket(id: string, market: Partial<Market>): Promise<Market | undefined>;
  
  // Positions
  getPosition(id: string): Promise<Position | undefined>;
  getPositions(filters?: { marketId?: string; status?: string }): Promise<Position[]>;
  getPositionsByUser(userAddress: string): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, position: Partial<Position>): Promise<Position | undefined>;
  
  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUser(userAddress: string): Promise<Order[]>;
  getOrdersByMarket(marketId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<Order>): Promise<Order | undefined>;
  
  // Trades
  getTrade(id: string): Promise<Trade | undefined>;
  getTradesByMarket(marketId: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  
  // Staking
  getStake(userAddress: string): Promise<Stake | undefined>;
  getAllStakes(): Promise<Stake[]>;
  createStake(stake: InsertStake): Promise<Stake>;
  updateStake(userAddress: string, stake: Partial<Stake>): Promise<Stake | undefined>;
  
  // Governance
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposals(status?: string): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, proposal: Partial<Proposal>): Promise<Proposal | undefined>;
  
  // User Stats
  getUserStats(userAddress: string): Promise<UserStats | undefined>;
  getLeaderboard(limit?: number): Promise<UserStats[]>;
  createUserStats(stats: InsertUserStats): Promise<UserStats>;
  updateUserStats(userAddress: string, stats: Partial<UserStats>): Promise<UserStats | undefined>;
}

export class MemStorage implements IStorage {
  private markets: Map<string, Market> = new Map();
  private positions: Map<string, Position> = new Map();
  private orders: Map<string, Order> = new Map();
  private trades: Map<string, Trade> = new Map();
  private stakes: Map<string, Stake> = new Map();
  private proposals: Map<string, Proposal> = new Map();
  private userStats: Map<string, UserStats> = new Map();

  // Markets
  async getMarket(id: string): Promise<Market | undefined> {
    return this.markets.get(id);
  }

  async getMarkets(filters?: {
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Market[]> {
    let results = Array.from(this.markets.values());

    if (filters?.category) {
      results = results.filter(m => m.category === filters.category);
    }

    if (filters?.status) {
      results = results.filter(m => m.status === filters.status);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(m => 
        m.question.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
      );
    }

    // Sort by volume by default
    results.sort((a, b) => Number(b.totalVolume) - Number(a.totalVolume));

    const offset = filters?.offset || 0;
    const limit = filters?.limit || results.length;
    
    return results.slice(offset, offset + limit);
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const id = randomUUID();
    const market: Market = {
      id,
      chainId: insertMarket.chainId || null,
      question: insertMarket.question,
      description: insertMarket.description || null,
      category: insertMarket.category,
      marketType: insertMarket.marketType || "binary",
      outcomes: insertMarket.outcomes as string[],
      creatorAddress: insertMarket.creatorAddress,
      yesProbability: insertMarket.yesProbability || "0.5",
      yesPrice: insertMarket.yesPrice || "0.5",
      noPrice: insertMarket.noPrice || "0.5",
      volume24h: "0",
      totalVolume: "0",
      liquidity: "0",
      tradersCount: 0,
      createdAt: new Date(),
      closingTime: insertMarket.closingTime,
      resolutionTime: insertMarket.resolutionTime || null,
      status: insertMarket.status || "active",
      resolutionSource: insertMarket.resolutionSource || "chainlink",
      resolvedOutcome: insertMarket.resolvedOutcome || null,
      isFeatured: insertMarket.isFeatured || false,
      isLive: insertMarket.isLive !== undefined ? insertMarket.isLive : true,
    };
    this.markets.set(id, market);
    return market;
  }

  async updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined> {
    const market = this.markets.get(id);
    if (!market) return undefined;

    const updated = { ...market, ...updates };
    this.markets.set(id, updated);
    return updated;
  }

  // Positions
  async getPosition(id: string): Promise<Position | undefined> {
    return this.positions.get(id);
  }

  async getPositions(filters?: { marketId?: string; status?: string }): Promise<Position[]> {
    let results = Array.from(this.positions.values());

    if (filters?.marketId) {
      results = results.filter(p => p.marketId === filters.marketId);
    }

    if (filters?.status) {
      results = results.filter(p => p.status === filters.status);
    }

    return results;
  }

  async getPositionsByUser(userAddress: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(
      p => p.userAddress === userAddress
    );
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const position: Position = {
      id,
      ...insertPosition,
      unrealizedPnL: "0",
      realizedPnL: "0",
      status: insertPosition.status || "open",
      createdAt: new Date(),
      closedAt: insertPosition.closedAt || null,
    };
    this.positions.set(id, position);
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;

    const updated = { ...position, ...updates };
    this.positions.set(id, updated);
    return updated;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUser(userAddress: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      o => o.userAddress === userAddress
    );
  }

  async getOrdersByMarket(marketId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      o => o.marketId === marketId
    );
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      id,
      ...insertOrder,
      filled: "0",
      status: insertOrder.status || "open",
      createdAt: new Date(),
      executedAt: insertOrder.executedAt || null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updated = { ...order, ...updates };
    this.orders.set(id, updated);
    return updated;
  }

  // Trades
  async getTrade(id: string): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async getTradesByMarket(marketId: string): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .filter(t => t.marketId === marketId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = {
      id,
      ...insertTrade,
      sellerAddress: insertTrade.sellerAddress || null,
      timestamp: new Date(),
    };
    this.trades.set(id, trade);
    return trade;
  }

  // Staking
  async getStake(userAddress: string): Promise<Stake | undefined> {
    return this.stakes.get(userAddress);
  }

  async getAllStakes(): Promise<Stake[]> {
    return Array.from(this.stakes.values());
  }

  async createStake(insertStake: InsertStake): Promise<Stake> {
    const id = randomUUID();
    const stake: Stake = {
      id,
      ...insertStake,
      rewardDebt: "0",
      pendingRewards: "0",
      claimedRewards: "0",
      stakedAt: new Date(),
      lastClaimAt: null,
    };
    this.stakes.set(insertStake.userAddress, stake);
    return stake;
  }

  async updateStake(userAddress: string, updates: Partial<Stake>): Promise<Stake | undefined> {
    const stake = this.stakes.get(userAddress);
    if (!stake) return undefined;

    const updated = { ...stake, ...updates };
    this.stakes.set(userAddress, updated);
    return updated;
  }

  // Governance
  async getProposal(id: string): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async getProposals(status?: string): Promise<Proposal[]> {
    let results = Array.from(this.proposals.values());
    
    if (status) {
      results = results.filter(p => p.status === status);
    }

    return results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const id = randomUUID();
    const proposal: Proposal = {
      id,
      ...insertProposal,
      forVotes: "0",
      againstVotes: "0",
      status: insertProposal.status || "active",
      startTime: new Date(),
      executedAt: insertProposal.executedAt || null,
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal | undefined> {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;

    const updated = { ...proposal, ...updates };
    this.proposals.set(id, updated);
    return updated;
  }

  // User Stats
  async getUserStats(userAddress: string): Promise<UserStats | undefined> {
    return this.userStats.get(userAddress);
  }

  async getLeaderboard(limit: number = 100): Promise<UserStats[]> {
    return Array.from(this.userStats.values())
      .sort((a, b) => Number(b.totalPnL) - Number(a.totalPnL))
      .slice(0, limit)
      .map((stats, index) => ({ ...stats, rank: index + 1 }));
  }

  async createUserStats(insertStats: InsertUserStats): Promise<UserStats> {
    const id = randomUUID();
    const stats: UserStats = {
      id,
      ...insertStats,
      totalPnL: "0",
      pnL24h: "0",
      pnL7d: "0",
      pnL30d: "0",
      totalVolume: "0",
      marketsTraded: 0,
      winRate: "0",
      roi: "0",
      rank: null,
      badges: (insertStats.badges || []) as string[],
      updatedAt: new Date(),
    };
    this.userStats.set(insertStats.userAddress, stats);
    return stats;
  }

  async updateUserStats(userAddress: string, updates: Partial<UserStats>): Promise<UserStats | undefined> {
    const stats = this.userStats.get(userAddress);
    if (!stats) return undefined;

    const updated = { ...stats, ...updates, updatedAt: new Date() };
    this.userStats.set(userAddress, updated);
    return updated;
  }
}

// PostgreSQL storage for local development
export class PostgresStorage implements IStorage {
  private db;

  constructor(connectionString: string) {
    const pool = new Pool({ connectionString });
    this.db = drizzleNode(pool, { schema });
  }

  // Markets
  async getMarket(id: string): Promise<Market | undefined> {
    const [market] = await this.db.select().from(schema.markets).where(eq(schema.markets.id, id));
    return market;
  }

  async getMarkets(filters?: {
    category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Market[]> {
    let query = this.db.select().from(schema.markets);

    const conditions = [];
    if (filters?.category) conditions.push(eq(schema.markets.category, filters.category));
    if (filters?.status) conditions.push(eq(schema.markets.status, filters.status));
    if (filters?.search) {
      conditions.push(
        sql`${schema.markets.question} ILIKE ${`%${filters.search}%`} OR ${schema.markets.description} ILIKE ${`%${filters.search}%`}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(schema.markets.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const [market] = await this.db.insert(schema.markets).values(insertMarket).returning();
    return market;
  }

  async updateMarket(id: string, updates: Partial<Market>): Promise<Market | undefined> {
    const [market] = await this.db.update(schema.markets).set(updates).where(eq(schema.markets.id, id)).returning();
    return market;
  }

  // Positions
  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await this.db.select().from(schema.positions).where(eq(schema.positions.id, id));
    return position;
  }

  async getPositions(filters?: { marketId?: string; status?: string }): Promise<Position[]> {
    const conditions = [];
    if (filters?.marketId) conditions.push(eq(schema.positions.marketId, filters.marketId));
    if (filters?.status) conditions.push(eq(schema.positions.status, filters.status));

    if (conditions.length > 0) {
      return await this.db.select().from(schema.positions).where(and(...conditions));
    }
    return await this.db.select().from(schema.positions);
  }

  async getPositionsByUser(userAddress: string): Promise<Position[]> {
    return await this.db.select().from(schema.positions).where(eq(schema.positions.userAddress, userAddress));
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const [position] = await this.db.insert(schema.positions).values(insertPosition).returning();
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined> {
    const [position] = await this.db.update(schema.positions).set(updates).where(eq(schema.positions.id, id)).returning();
    return position;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id));
    return order;
  }

  async getOrdersByUser(userAddress: string): Promise<Order[]> {
    return await this.db.select().from(schema.orders).where(eq(schema.orders.userAddress, userAddress));
  }

  async getOrdersByMarket(marketId: string): Promise<Order[]> {
    return await this.db.select().from(schema.orders).where(eq(schema.orders.marketId, marketId));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await this.db.insert(schema.orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await this.db.update(schema.orders).set(updates).where(eq(schema.orders.id, id)).returning();
    return order;
  }

  // Trades
  async getTrade(id: string): Promise<Trade | undefined> {
    const [trade] = await this.db.select().from(schema.trades).where(eq(schema.trades.id, id));
    return trade;
  }

  async getTradesByMarket(marketId: string): Promise<Trade[]> {
    return await this.db.select().from(schema.trades).where(eq(schema.trades.marketId, marketId));
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await this.db.insert(schema.trades).values(insertTrade).returning();
    return trade;
  }

  // Staking
  async getStake(userAddress: string): Promise<Stake | undefined> {
    const [stake] = await this.db.select().from(schema.stakes).where(eq(schema.stakes.userAddress, userAddress));
    return stake;
  }

  async getAllStakes(): Promise<Stake[]> {
    return await this.db.select().from(schema.stakes);
  }

  async createStake(insertStake: InsertStake): Promise<Stake> {
    const [stake] = await this.db.insert(schema.stakes).values(insertStake).returning();
    return stake;
  }

  async updateStake(userAddress: string, updates: Partial<Stake>): Promise<Stake | undefined> {
    const [stake] = await this.db.update(schema.stakes).set(updates).where(eq(schema.stakes.userAddress, userAddress)).returning();
    return stake;
  }

  // Governance
  async getProposal(id: string): Promise<Proposal | undefined> {
    const [proposal] = await this.db.select().from(schema.proposals).where(eq(schema.proposals.id, id));
    return proposal;
  }

  async getProposals(status?: string): Promise<Proposal[]> {
    if (status) {
      return await this.db.select().from(schema.proposals).where(eq(schema.proposals.status, status));
    }
    return await this.db.select().from(schema.proposals);
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const [proposal] = await this.db.insert(schema.proposals).values(insertProposal).returning();
    return proposal;
  }

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal | undefined> {
    const [proposal] = await this.db.update(schema.proposals).set(updates).where(eq(schema.proposals.id, id)).returning();
    return proposal;
  }

  // User Stats
  async getUserStats(userAddress: string): Promise<UserStats | undefined> {
    const [stats] = await this.db.select().from(schema.userStats).where(eq(schema.userStats.userAddress, userAddress));
    return stats;
  }

  async getLeaderboard(limit: number = 10): Promise<UserStats[]> {
    return await this.db.select().from(schema.userStats).orderBy(desc(schema.userStats.totalPnL)).limit(limit);
  }

  async createUserStats(insertStats: InsertUserStats): Promise<UserStats> {
    const [stats] = await this.db.insert(schema.userStats).values(insertStats).returning();
    return stats;
  }

  async updateUserStats(userAddress: string, updates: Partial<UserStats>): Promise<UserStats | undefined> {
    const [stats] = await this.db.update(schema.userStats).set({ ...updates, updatedAt: new Date() }).where(eq(schema.userStats.userAddress, userAddress)).returning();
    return stats;
  }
}

// Neon serverless storage - same as PostgresStorage but uses Neon driver
export class NeonServerlessStorage extends PostgresStorage {
  constructor(connectionString: string) {
    // Call parent but we'll override the db
    super(connectionString);
    // Replace with Neon pool
    const pool = new NeonPool({ connectionString });
    (this as any).db = drizzleNeon(pool, { schema });
  }
}

// Detect if running in serverless environment (Netlify, Vercel, AWS Lambda, etc.)
const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Use appropriate storage based on environment
export const storage = process.env.DATABASE_URL
  ? (isServerless ? new NeonServerlessStorage(process.env.DATABASE_URL) : new PostgresStorage(process.env.DATABASE_URL))
  : new MemStorage();

console.log(`📦 Storage initialized: ${process.env.DATABASE_URL ? (isServerless ? 'Neon Serverless' : 'PostgreSQL') : 'In-Memory'}`);
