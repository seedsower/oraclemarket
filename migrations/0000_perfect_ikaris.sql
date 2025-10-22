CREATE TABLE "markets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer,
	"question" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"market_type" text DEFAULT 'binary' NOT NULL,
	"outcomes" jsonb NOT NULL,
	"creator_address" text NOT NULL,
	"yes_probability" numeric(10, 4) DEFAULT '0.5' NOT NULL,
	"yes_price" numeric(10, 4) DEFAULT '0.5' NOT NULL,
	"no_price" numeric(10, 4) DEFAULT '0.5' NOT NULL,
	"volume_24h" numeric(20, 2) DEFAULT '0' NOT NULL,
	"total_volume" numeric(20, 2) DEFAULT '0' NOT NULL,
	"liquidity" numeric(20, 2) DEFAULT '0' NOT NULL,
	"traders_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closing_time" timestamp NOT NULL,
	"resolution_time" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"resolution_source" text DEFAULT 'chainlink' NOT NULL,
	"resolved_outcome" integer,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_live" boolean DEFAULT true NOT NULL,
	CONSTRAINT "markets_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"market_id" varchar NOT NULL,
	"order_type" text NOT NULL,
	"side" text NOT NULL,
	"outcome" text NOT NULL,
	"price" numeric(10, 4) NOT NULL,
	"amount" numeric(20, 4) NOT NULL,
	"filled" numeric(20, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"executed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"market_id" varchar NOT NULL,
	"outcome" text NOT NULL,
	"shares" numeric(20, 4) NOT NULL,
	"average_price" numeric(10, 4) NOT NULL,
	"total_cost" numeric(20, 2) NOT NULL,
	"unrealized_pnl" numeric(20, 2) DEFAULT '0' NOT NULL,
	"realized_pnl" numeric(20, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposer_address" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"for_votes" numeric(20, 2) DEFAULT '0' NOT NULL,
	"against_votes" numeric(20, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp NOT NULL,
	"executed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stakes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"tier" text NOT NULL,
	"reward_debt" numeric(20, 2) DEFAULT '0' NOT NULL,
	"pending_rewards" numeric(20, 2) DEFAULT '0' NOT NULL,
	"claimed_rewards" numeric(20, 2) DEFAULT '0' NOT NULL,
	"staked_at" timestamp DEFAULT now() NOT NULL,
	"last_claim_at" timestamp,
	CONSTRAINT "stakes_user_address_unique" UNIQUE("user_address")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" varchar NOT NULL,
	"buyer_address" text NOT NULL,
	"seller_address" text,
	"outcome" text NOT NULL,
	"price" numeric(10, 4) NOT NULL,
	"shares" numeric(20, 4) NOT NULL,
	"volume" numeric(20, 2) NOT NULL,
	"fee" numeric(20, 2) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_address" text NOT NULL,
	"total_pnl" numeric(20, 2) DEFAULT '0' NOT NULL,
	"pnl_24h" numeric(20, 2) DEFAULT '0' NOT NULL,
	"pnl_7d" numeric(20, 2) DEFAULT '0' NOT NULL,
	"pnl_30d" numeric(20, 2) DEFAULT '0' NOT NULL,
	"total_volume" numeric(20, 2) DEFAULT '0' NOT NULL,
	"markets_traded" integer DEFAULT 0 NOT NULL,
	"win_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"roi" numeric(10, 2) DEFAULT '0' NOT NULL,
	"rank" integer,
	"badges" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_address_unique" UNIQUE("user_address")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;