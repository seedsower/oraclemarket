# OracleMarket - Prediction Markets Platform

## Overview

OracleMarket is a decentralized prediction markets platform that enables users to trade on real-world events with transparent resolution mechanisms. The platform features binary and categorical markets across multiple categories (Politics, Sports, Crypto, Economy, Entertainment), staking mechanisms for governance participation, and comprehensive portfolio management.

The application is built as a full-stack TypeScript application with a React frontend and Express backend, utilizing PostgreSQL for data persistence through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript for type-safe component development
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn UI component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Recharts for data visualization (price charts, analytics)

**Backend:**
- Express.js server with TypeScript
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL for scalable data storage
- WebSocket server (ws) for real-time market updates
- Session-based authentication using connect-pg-simple

**Build Tools:**
- Vite for fast frontend development and optimized production builds
- esbuild for efficient backend bundling
- tsx for TypeScript execution in development

### Architecture Patterns

**Monorepo Structure:**
The application uses a monorepo approach with shared schema definitions:
- `/client` - React frontend application
- `/server` - Express backend API
- `/shared` - Shared TypeScript types and Drizzle schemas
- Path aliases configured for clean imports (@/, @shared/, @assets/)

**API Design:**
RESTful API endpoints organized by resource:
- `/api/markets` - Market creation, retrieval, filtering
- `/api/positions` - User position tracking
- `/api/orders` - Order book management
- `/api/trades` - Trade execution and history
- `/api/stakes` - Staking operations
- `/api/proposals` - Governance proposals
- `/api/user-stats` - User performance metrics
- `/api/leaderboard` - Trader rankings

WebSocket connection at `/ws` for real-time market data broadcasts.

**State Management:**
- Server state managed through TanStack Query with aggressive caching (staleTime: Infinity)
- Client state uses Zustand for wallet connection state
- Form state handled by React Hook Form with Zod validation

**Database Schema:**
PostgreSQL database with the following core tables:
- `markets` - Prediction market definitions with outcomes, probabilities, and metrics
- `positions` - User holdings in specific markets
- `orders` - Limit orders in the order book
- `trades` - Executed trade history
- `stakes` - User staking balances and tiers
- `proposals` - Governance proposals with voting
- `user_stats` - Aggregated user performance data

All tables use UUID primary keys and timestamp tracking. Decimal precision for financial calculations (20,2 for volumes, 10,4 for probabilities).

**Resolution Mechanisms:**
Markets support multiple resolution sources:
- Chainlink oracles for automated price data
- UMA optimistic oracle for dispute resolution
- Manual resolution for subjective outcomes
- API-based resolution for external data sources

### Key Features

**Market Trading:**
- Binary (Yes/No) and categorical outcome markets
- Real-time price updates via WebSocket
- Order book with limit and market orders
- Automatic market maker (AMM) pricing based on probability
- Trading fee structure (2% default)
- Slippage protection for market orders

**Staking System:**
- Tiered staking with Bronze/Silver/Gold/Platinum levels
- APY rewards scaling with tier (8% to 25%)
- Fee discounts based on stake tier (5% to 30%)
- Voting power multipliers for governance (1x to 3x)
- Pending rewards tracking and claiming

**Governance:**
- Proposal creation and voting
- Vote weighting based on staked tokens
- Proposal lifecycle: Active → Passed/Rejected → Executed
- Quorum and threshold requirements

**Portfolio Management:**
- Real-time position tracking with P&L calculation
- Unrealized and realized profit/loss metrics
- Trade history and performance analytics
- Multi-timeframe statistics (24h, 7d, 30d, all-time)

**User Experience:**
- Dark mode optimized UI with glass morphism effects
- Responsive design with mobile breakpoints
- Toast notifications for user feedback
- Loading states and optimistic updates
- Mock wallet integration (production would integrate Web3 wallet)

## External Dependencies

**Database:**
- Neon serverless PostgreSQL (@neondatabase/serverless)
- Connection via DATABASE_URL environment variable
- Drizzle Kit for schema migrations

**UI Components:**
- Radix UI primitives for accessible component foundation
- 30+ shadcn/ui components pre-configured
- Lucide React for icon library
- Recharts for charting

**Development Tools:**
- Replit-specific plugins for development environment integration
- Runtime error modal overlay for debugging
- Cartographer for code navigation
- Development banner for environment indication

**Session Management:**
- connect-pg-simple for PostgreSQL-backed sessions
- Session storage in database for scalability

**Validation:**
- Zod for runtime schema validation
- drizzle-zod for automatic schema generation from database models
- @hookform/resolvers for form validation integration

**Date Handling:**
- date-fns for date formatting and manipulation
- Timezone-aware operations for market closings

**WebSocket:**
- ws library for WebSocket server implementation
- Real-time broadcasting to connected clients on market updates

**Note:** The application currently uses a mock wallet implementation. Production deployment would require integration with Web3 wallet providers (MetaMask, WalletConnect) and smart contract interaction for on-chain settlement.