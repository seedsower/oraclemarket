import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Markets
export const markets = pgTable("markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chainId: integer("chain_id").unique(), // On-chain market ID from contract
  question: text("question").notNull(),
  description: text("description"),
  category: text("category").notNull(), // Politics, Sports, Crypto, Economy, Entertainment
  marketType: text("market_type").notNull().default("binary"), // binary, categorical, scalar
  outcomes: jsonb("outcomes").notNull().$type<string[]>(),
  creatorAddress: text("creator_address").notNull(),
  
  // Probabilities and pricing
  yesProbability: decimal("yes_probability", { precision: 10, scale: 4 }).notNull().default("0.5"),
  yesPrice: decimal("yes_price", { precision: 10, scale: 4 }).notNull().default("0.5"),
  noPrice: decimal("no_price", { precision: 10, scale: 4 }).notNull().default("0.5"),
  
  // Market metrics
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }).notNull().default("0"),
  totalVolume: decimal("total_volume", { precision: 20, scale: 2 }).notNull().default("0"),
  liquidity: decimal("liquidity", { precision: 20, scale: 2 }).notNull().default("0"),
  tradersCount: integer("traders_count").notNull().default(0),
  
  // Timing
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closingTime: timestamp("closing_time").notNull(),
  resolutionTime: timestamp("resolution_time"),
  
  // Status
  status: text("status").notNull().default("active"), // active, closed, resolved, invalid
  resolutionSource: text("resolution_source").notNull().default("chainlink"), // chainlink, uma, manual, api
  resolvedOutcome: integer("resolved_outcome"),
  
  // Featured
  isFeatured: boolean("is_featured").notNull().default(false),
  isLive: boolean("is_live").notNull().default(true),
});

export const insertMarketSchema = createInsertSchema(markets, {
  closingTime: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  resolutionTime: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  chainId: z.number().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  volume24h: true,
  totalVolume: true,
  liquidity: true,
  tradersCount: true,
});

export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof markets.$inferSelect;

// Positions
export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  marketId: varchar("market_id").notNull().references(() => markets.id),
  
  outcome: text("outcome").notNull(), // yes, no, or outcome index
  shares: decimal("shares", { precision: 20, scale: 4 }).notNull(),
  averagePrice: decimal("average_price", { precision: 10, scale: 4 }).notNull(),
  totalCost: decimal("total_cost", { precision: 20, scale: 2 }).notNull(),
  
  unrealizedPnL: decimal("unrealized_pnl", { precision: 20, scale: 2 }).notNull().default("0"),
  realizedPnL: decimal("realized_pnl", { precision: 20, scale: 2 }).notNull().default("0"),
  
  status: text("status").notNull().default("open"), // open, closed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
  unrealizedPnL: true,
  realizedPnL: true,
});

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull(),
  marketId: varchar("market_id").notNull().references(() => markets.id),
  
  orderType: text("order_type").notNull(), // market, limit, stop
  side: text("side").notNull(), // buy, sell
  outcome: text("outcome").notNull(),
  
  price: decimal("price", { precision: 10, scale: 4 }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 4 }).notNull(),
  filled: decimal("filled", { precision: 20, scale: 4 }).notNull().default("0"),
  
  status: text("status").notNull().default("open"), // open, partial, filled, cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
  executedAt: timestamp("executed_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  filled: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Trades
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull().references(() => markets.id),
  buyerAddress: text("buyer_address").notNull(),
  sellerAddress: text("seller_address"),
  
  outcome: text("outcome").notNull(),
  price: decimal("price", { precision: 10, scale: 4 }).notNull(),
  shares: decimal("shares", { precision: 20, scale: 4 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 2 }).notNull(),
  
  fee: decimal("fee", { precision: 20, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  timestamp: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

// Staking
export const stakes = pgTable("stakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull().unique(),
  
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  tier: text("tier").notNull(), // bronze, silver, gold, platinum
  
  rewardDebt: decimal("reward_debt", { precision: 20, scale: 2 }).notNull().default("0"),
  pendingRewards: decimal("pending_rewards", { precision: 20, scale: 2 }).notNull().default("0"),
  claimedRewards: decimal("claimed_rewards", { precision: 20, scale: 2 }).notNull().default("0"),
  
  stakedAt: timestamp("staked_at").notNull().defaultNow(),
  lastClaimAt: timestamp("last_claim_at"),
});

export const insertStakeSchema = createInsertSchema(stakes).omit({
  id: true,
  stakedAt: true,
  rewardDebt: true,
  pendingRewards: true,
  claimedRewards: true,
});

export type InsertStake = z.infer<typeof insertStakeSchema>;
export type Stake = typeof stakes.$inferSelect;

// Governance Proposals
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposerAddress: text("proposer_address").notNull(),
  
  title: text("title").notNull(),
  description: text("description").notNull(),
  
  forVotes: decimal("for_votes", { precision: 20, scale: 2 }).notNull().default("0"),
  againstVotes: decimal("against_votes", { precision: 20, scale: 2 }).notNull().default("0"),
  
  status: text("status").notNull().default("active"), // active, passed, rejected, executed
  
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time").notNull(),
  executedAt: timestamp("executed_at"),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  startTime: true,
  forVotes: true,
  againstVotes: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

// User Stats
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAddress: text("user_address").notNull().unique(),
  
  totalPnL: decimal("total_pnl", { precision: 20, scale: 2 }).notNull().default("0"),
  pnL24h: decimal("pnl_24h", { precision: 20, scale: 2 }).notNull().default("0"),
  pnL7d: decimal("pnl_7d", { precision: 20, scale: 2 }).notNull().default("0"),
  pnL30d: decimal("pnl_30d", { precision: 20, scale: 2 }).notNull().default("0"),
  
  totalVolume: decimal("total_volume", { precision: 20, scale: 2 }).notNull().default("0"),
  marketsTraded: integer("markets_traded").notNull().default(0),
  
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  roi: decimal("roi", { precision: 10, scale: 2 }).notNull().default("0"),
  
  rank: integer("rank"),
  badges: jsonb("badges").$type<string[]>().default([]),
  
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  updatedAt: true,
  rank: true,
});

export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;
