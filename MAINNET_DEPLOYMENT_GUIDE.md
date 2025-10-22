# OracleMarket V2 - Complete Mainnet Deployment Guide

## Overview

This guide covers all steps needed to deploy OracleMarket V2 to mainnet (Base Mainnet) with full automation, including smart contracts, backend services, frontend deployment, and monitoring.

---

## 📋 Pre-Deployment Checklist

### 1. **Environment Requirements**
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database (production instance)
- [ ] Base Mainnet RPC endpoint (Alchemy/Infura)
- [ ] Domain name for frontend
- [ ] SSL certificate for HTTPS
- [ ] Deployment wallet with sufficient ETH for gas

### 2. **Required Accounts & Services**
- [ ] Base Mainnet wallet with ETH (~0.5 ETH for deployments)
- [ ] PostgreSQL database (Supabase, Railway, or self-hosted)
- [ ] Frontend hosting (Vercel, Netlify, or self-hosted)
- [ ] Backend hosting (Railway, Render, or VPS)
- [ ] Block explorer API key (Basescan)
- [ ] Monitoring service (optional: Sentry, DataDog)

### 3. **Security Audit** (CRITICAL for Mainnet)
- [ ] Smart contracts audited by professional firm
- [ ] Penetration testing completed
- [ ] Bug bounty program set up
- [ ] Multi-sig wallet configured for admin functions
- [ ] Emergency pause mechanism tested

---

## 🔧 Part 1: Smart Contract Deployment

### Step 1.1: Prepare Contract Configuration

1. **Update Hardhat/Foundry Config for Base Mainnet**

Create `hardhat.config.ts`:
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    baseMainnet: {
      url: process.env.BASE_MAINNET_RPC || "https://mainnet.base.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
      chainId: 8453
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY!
    }
  }
};

export default config;
```

2. **Create `.env.production`**
```bash
# Network
BASE_MAINNET_RPC=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key

# Database
DATABASE_URL=postgresql://user:password@host:5432/oraclemarket_prod

# Contract Addresses (will be filled during deployment)
ORACLE_TOKEN_ADDRESS=
MARKET_FACTORY_ADDRESS=
HYBRID_AMM_ADDRESS=
STAKING_ADDRESS=
ORDERBOOK_ADDRESS=
TREASURY_ADDRESS=
GOVERNANCE_ADDRESS=
```

### Step 1.2: Deploy Contracts in Order

**Deployment Order:**
1. OracleToken (ERC20)
2. Treasury
3. HybridAMM
4. MarketFactory
5. Staking
6. OrderBook
7. Governance
8. OracleResolver

**Create deployment script: `scripts/deploy-mainnet.ts`**

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting Base Mainnet Deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy OracleToken
  console.log("📝 Deploying OracleToken...");
  const OracleToken = await ethers.getContractFactory("OracleToken");
  const oracleToken = await OracleToken.deploy(
    "Oracle Market Token",
    "ORACLE",
    ethers.parseEther("1000000000") // 1B tokens
  );
  await oracleToken.waitForDeployment();
  const oracleTokenAddress = await oracleToken.getAddress();
  console.log("✅ OracleToken deployed to:", oracleTokenAddress, "\n");

  // 2. Deploy Treasury
  console.log("📝 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(oracleTokenAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress, "\n");

  // 3. Deploy HybridAMM
  console.log("📝 Deploying HybridAMM...");
  const HybridAMM = await ethers.getContractFactory("HybridAMM");
  const hybridAMM = await HybridAMM.deploy(oracleTokenAddress);
  await hybridAMM.waitForDeployment();
  const hybridAMMAddress = await hybridAMM.getAddress();
  console.log("✅ HybridAMM deployed to:", hybridAMMAddress, "\n");

  // 4. Deploy OracleResolver
  console.log("📝 Deploying OracleResolver...");
  const OracleResolver = await ethers.getContractFactory("OracleResolver");
  const oracleResolver = await OracleResolver.deploy();
  await oracleResolver.waitForDeployment();
  const oracleResolverAddress = await oracleResolver.getAddress();
  console.log("✅ OracleResolver deployed to:", oracleResolverAddress, "\n");

  // 5. Deploy MarketFactory
  console.log("📝 Deploying MarketFactory...");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy();
  await marketFactory.waitForDeployment();
  const marketFactoryAddress = await marketFactory.getAddress();
  console.log("✅ MarketFactory deployed to:", marketFactoryAddress, "\n");

  // 6. Initialize MarketFactory
  console.log("📝 Initializing MarketFactory...");
  await marketFactory.initialize(
    oracleTokenAddress,
    hybridAMMAddress,
    oracleResolverAddress
  );
  console.log("✅ MarketFactory initialized\n");

  // 7. Set MarketFactory in HybridAMM
  console.log("📝 Setting MarketFactory in HybridAMM...");
  await hybridAMM.setMarketFactory(marketFactoryAddress);
  console.log("✅ MarketFactory set in HybridAMM\n");

  // 8. Deploy Staking
  console.log("📝 Deploying Staking...");
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(oracleTokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ Staking deployed to:", stakingAddress, "\n");

  // 9. Deploy OrderBook
  console.log("📝 Deploying OrderBook...");
  const OrderBook = await ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(oracleTokenAddress);
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("✅ OrderBook deployed to:", orderBookAddress, "\n");

  // 10. Deploy Governance
  console.log("📝 Deploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(oracleTokenAddress, stakingAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress, "\n");

  // Save deployment addresses
  const addresses = {
    OracleToken: oracleTokenAddress,
    Treasury: treasuryAddress,
    HybridAMM: hybridAMMAddress,
    OracleResolver: oracleResolverAddress,
    MarketFactory: marketFactoryAddress,
    Staking: stakingAddress,
    OrderBook: orderBookAddress,
    Governance: governanceAddress,
    deployer: deployer.address,
    network: "base-mainnet",
    chainId: 8453
  };

  console.log("\n📄 Deployment Summary:");
  console.log("═".repeat(60));
  console.log(JSON.stringify(addresses, null, 2));
  console.log("═".repeat(60));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    "./deployments/mainnet-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n✅ Addresses saved to: deployments/mainnet-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Run deployment:**
```bash
npx hardhat run scripts/deploy-mainnet.ts --network baseMainnet
```

### Step 1.3: Verify Contracts on Basescan

```bash
# Verify each contract
npx hardhat verify --network baseMainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Example for OracleToken
npx hardhat verify --network baseMainnet 0xYourTokenAddress "Oracle Market Token" "ORACLE" "1000000000000000000000000000"
```

---

## 🗄️ Part 2: Database Setup

### Step 2.1: Production Database Configuration

1. **Create PostgreSQL database** (Supabase/Railway recommended)

2. **Run migrations:**
```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/oraclemarket_prod"

# Run Drizzle migrations
npx drizzle-kit push
```

3. **Create database indexes for performance:**
```sql
-- Market indexes
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX idx_markets_chain_id ON markets(chain_id);

-- Position indexes
CREATE INDEX idx_positions_user ON positions(user_address);
CREATE INDEX idx_positions_market ON positions(market_id);
CREATE INDEX idx_positions_status ON positions(status);

-- Order indexes
CREATE INDEX idx_orders_user ON orders(user_address);
CREATE INDEX idx_orders_market ON orders(market_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Trade indexes
CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_user ON trades(buyer_address);
CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);

-- User stats indexes
CREATE INDEX idx_user_stats_total_pnl ON user_stats(total_pnl DESC);
CREATE INDEX idx_user_stats_volume ON user_stats(total_volume DESC);
```

4. **Set up database backups:**
```bash
# Configure automated backups (example for cron)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/oraclemarket_$(date +\%Y\%m\%d).sql.gz
```

---

## 🖥️ Part 3: Backend Deployment

### Step 3.1: Environment Configuration

Create `server/.env.production`:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/oraclemarket_prod

# Blockchain
BASE_MAINNET_RPC=https://mainnet.base.org
PRIVATE_KEY=your_backend_wallet_private_key

# Contract Addresses (from deployment)
ORACLE_TOKEN_ADDRESS=0x...
MARKET_FACTORY_ADDRESS=0x...
HYBRID_AMM_ADDRESS=0x...
STAKING_ADDRESS=0x...
ORDERBOOK_ADDRESS=0x...
TREASURY_ADDRESS=0x...
GOVERNANCE_ADDRESS=0x...

# Server
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
```

### Step 3.2: Deploy Backend (Railway/Render Example)

**Option A: Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Option B: Docker Deployment**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
```

Build and deploy:
```bash
docker build -t oraclemarket-backend .
docker run -d -p 5000:5000 --env-file .env.production oraclemarket-backend
```

### Step 3.3: Set Up Market Sync Service

The backend automatically syncs markets from the blockchain. Ensure the sync service is running:

```typescript
// In server/index.ts - already configured
const syncService = new MarketSyncService(storage);
syncService.startAutoSync(30000); // Sync every 30 seconds
syncService.watchMarketEvents(); // Watch for real-time events
```

### Step 3.4: Configure Health Checks

Add health check endpoint in `server/routes.ts`:
```typescript
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: storage ? "connected" : "disconnected",
    version: process.env.npm_package_version
  });
});
```

---

## 🌐 Part 4: Frontend Deployment

### Step 4.1: Update Frontend Configuration

Update `client/src/contracts/config.ts` with mainnet addresses:
```typescript
export const BASE_MAINNET_CHAIN_ID = 8453;

export const CONTRACTS = {
  OracleToken: "0xYourMainnetTokenAddress" as Address,
  MarketFactory: "0xYourMainnetFactoryAddress" as Address,
  HybridAMM: "0xYourMainnetAMMAddress" as Address,
  Staking: "0xYourMainnetStakingAddress" as Address,
  OrderBook: "0xYourMainnetOrderBookAddress" as Address,
  Treasury: "0xYourMainnetTreasuryAddress" as Address,
  Governance: "0xYourMainnetGovernanceAddress" as Address,
} as const;
```

Update `client/src/main.tsx` for Base Mainnet:
```typescript
import { base } from 'wagmi/chains';

const config = createConfig({
  chains: [base], // Base Mainnet
  transports: {
    [base.id]: http()
  },
  // ... rest of config
});
```

### Step 4.2: Build Production Frontend

```bash
# Build for production
npm run build

# Test production build locally
npm run preview
```

### Step 4.3: Deploy Frontend (Vercel Example)

**Option A: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Option B: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Option C: Self-hosted (Nginx)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/oraclemarket/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🤖 Part 5: Automation & Monitoring

### Step 5.1: Automated Market Resolution

Create `scripts/auto-resolver.ts`:
```typescript
import { ethers } from "ethers";
import { storage } from "./server/storage";

async function resolveExpiredMarkets() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC);
  const wallet = new ethers.Wallet(process.env.RESOLVER_PRIVATE_KEY!, provider);

  // Get markets that have ended
  const markets = await storage.getMarkets({ status: "active" });
  const now = Date.now();

  for (const market of markets) {
    if (new Date(market.closingTime).getTime() < now) {
      console.log(`Resolving market ${market.id}...`);

      // Fetch resolution from oracle/API
      const outcome = await fetchResolution(market);

      // Submit resolution on-chain
      const marketFactory = new ethers.Contract(
        CONTRACTS.MarketFactory,
        MarketFactoryABI,
        wallet
      );

      const tx = await marketFactory.resolveMarket(market.chainId, outcome);
      await tx.wait();

      // Update database
      await storage.updateMarket(market.id, {
        status: "resolved",
        resolvedOutcome: outcome,
        resolutionTime: new Date()
      });

      console.log(`✅ Market ${market.id} resolved with outcome: ${outcome}`);
    }
  }
}

// Run every hour
setInterval(resolveExpiredMarkets, 60 * 60 * 1000);
```

### Step 5.2: Event Monitoring

Create `scripts/event-monitor.ts`:
```typescript
import { ethers } from "ethers";
import { CONTRACTS, MarketFactoryABI, HybridAMMABI } from "./client/src/contracts/config";

async function monitorEvents() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC);

  const marketFactory = new ethers.Contract(
    CONTRACTS.MarketFactory,
    MarketFactoryABI,
    provider
  );

  const hybridAMM = new ethers.Contract(
    CONTRACTS.HybridAMM,
    HybridAMMABI,
    provider
  );

  // Listen for MarketCreated events
  marketFactory.on("MarketCreated", async (marketId, creator, title, category, endTime, liquidity, event) => {
    console.log(`🆕 New market created: ${title} (ID: ${marketId})`);
    // Index to database automatically handled by sync service
  });

  // Listen for SharesPurchased events
  hybridAMM.on("SharesPurchased", async (marketId, buyer, outcome, shares, cost, event) => {
    console.log(`📈 Trade: ${buyer} bought ${ethers.formatEther(shares)} shares for ${ethers.formatEther(cost)} ORACLE`);
    // Analytics/notifications here
  });

  console.log("👀 Event monitoring started...");
}

monitorEvents();
```

### Step 5.3: Monitoring & Alerts

**Sentry Integration** (Error Tracking):
```typescript
// In server/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Add Sentry middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Health Check Monitoring**:
```bash
# Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
# Monitor endpoints:
# - https://yourdomain.com/health (backend)
# - https://yourdomain.com (frontend)
```

### Step 5.4: Backup & Disaster Recovery

Create automated backup script:
```bash
#!/bin/bash
# backup.sh

# Database backup
pg_dump $DATABASE_URL | gzip > /backups/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Smart contract state backup (optional)
# Export key contract variables/states

# Upload to S3/cloud storage
aws s3 cp /backups/ s3://your-backup-bucket/ --recursive

# Keep only last 30 days
find /backups/ -mtime +30 -delete
```

---

## 📊 Part 6: Performance Optimization

### 6.1: Database Optimization

```sql
-- Add caching for frequently accessed data
CREATE MATERIALIZED VIEW market_stats AS
SELECT
  category,
  COUNT(*) as total_markets,
  SUM(total_volume::numeric) as total_volume,
  AVG(traders_count) as avg_traders
FROM markets
GROUP BY category;

-- Refresh periodically
REFRESH MATERIALIZED VIEW market_stats;
```

### 6.2: Frontend Optimization

```typescript
// Enable React Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### 6.3: CDN Setup

Configure CDN for static assets:
- Use Cloudflare or Vercel Edge Network
- Enable caching for JS/CSS bundles
- Optimize images with WebP format
- Enable Gzip/Brotli compression

---

## 🔐 Part 7: Security Best Practices

### 7.1: Smart Contract Security

- [ ] Multi-sig wallet for admin functions (Gnosis Safe)
- [ ] Timelock for governance actions
- [ ] Emergency pause mechanism
- [ ] Rate limiting on critical functions
- [ ] Access control properly configured

### 7.2: Backend Security

```typescript
// Rate limiting
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);

// Input validation
import { body, validationResult } from "express-validator";

app.post("/api/markets",
  body('question').isString().isLength({ min: 10, max: 500 }),
  body('category').isIn(['Politics', 'Sports', 'Crypto', 'Economy', 'Entertainment']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  }
);
```

### 7.3: Environment Variables Security

- Use secret management (AWS Secrets Manager, Vault)
- Never commit `.env` files
- Rotate keys regularly
- Use different keys for different environments

---

## 📈 Part 8: Post-Deployment

### 8.1: Launch Checklist

- [ ] All contracts deployed and verified on Basescan
- [ ] Database migrations completed
- [ ] Backend API is healthy and responding
- [ ] Frontend deployed and accessible
- [ ] Market sync service running
- [ ] Event monitoring active
- [ ] Backup systems configured
- [ ] Monitoring/alerts set up
- [ ] Documentation updated
- [ ] Team trained on emergency procedures

### 8.2: Initial Liquidity & Markets

1. **Seed initial markets** (manually or script):
```typescript
// Create 3-5 high-quality markets to start
await createMarket({
  question: "Will Bitcoin reach $150,000 by end of 2025?",
  category: "Crypto",
  initialLiquidity: ethers.parseEther("10000")
});
```

2. **Provide initial liquidity** to markets for trading

3. **Test all features**:
- Market creation
- Trading (buy/sell)
- Staking
- Governance proposals

### 8.3: Marketing & Growth

1. **Announce launch** on:
   - Twitter/X
   - Discord/Telegram
   - Reddit (r/defi, r/ethereum, r/base)
   - Product Hunt

2. **Launch incentives**:
   - Trading competitions
   - Liquidity mining rewards
   - Referral program

3. **Analytics tracking**:
   - User acquisition
   - Trading volume
   - Total Value Locked (TVL)
   - Active users

---

## 🛠️ Part 9: Maintenance & Updates

### 9.1: Regular Tasks

**Daily:**
- Monitor system health
- Check error logs
- Review trading activity
- Resolve any pending markets

**Weekly:**
- Database performance review
- Update documentation
- Community engagement
- Security scan

**Monthly:**
- Contract upgrade planning
- Feature releases
- Performance optimization
- Audit trail review

### 9.2: Upgrade Strategy

For smart contract upgrades:
1. Deploy new contracts
2. Test thoroughly on testnet
3. Migrate liquidity/state
4. Update frontend configuration
5. Announce to community with migration guide

---

## 📞 Support & Resources

- **Documentation**: https://docs.yourdomain.com
- **API Reference**: https://api.yourdomain.com/docs
- **Discord Community**: https://discord.gg/yourserver
- **GitHub**: https://github.com/yourorg/oraclemarket
- **Email Support**: support@yourdomain.com

---

## ✅ Deployment Complete!

Your OracleMarket V2 dApp is now fully deployed and automated on Base Mainnet. Remember to:

1. Monitor the system closely in the first few days
2. Be ready for rapid response to any issues
3. Engage with your community
4. Iterate based on feedback

Good luck with your launch! 🚀
