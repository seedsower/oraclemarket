# Integration Fixes: Database ↔ Blockchain

## Problem

The trading system was failing with the error:
```
Trade error: SyntaxError: Cannot convert 60d0bdfa-5dc4-4939-b77d-9c48a2b03e6d to a BigInt
```

**Root Cause**: The database uses UUID strings for market IDs (`id`), but the blockchain contracts use sequential `uint256` IDs (0, 1, 2, 3...). The TradingPanel was trying to convert UUID strings to BigInt for blockchain transactions, which is impossible.

## Solution

Added a `chainId` field to track the on-chain market ID separately from the database UUID.

### Architecture

```
Database (PostgreSQL)          Blockchain (Base Sepolia)
├── id: UUID                   ├── marketCounter: uint256
│   "60d0bdfa-..."            │   0, 1, 2, 3...
├── chainId: integer  ←────────┤
│   0, 1, 2, 3...             └── Market struct with uint256 id
├── question: string
├── category: string
└── ...other fields
```

## Changes Made

### 1. Schema Update ([shared/schema.ts](shared/schema.ts:9))

Added `chainId` field to markets table:

```typescript
export const markets = pgTable("markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chainId: integer("chain_id").unique(), // ← NEW: On-chain market ID
  question: text("question").notNull(),
  // ... rest of fields
});
```

**Why unique?** Each on-chain market ID can only correspond to one database record.

### 2. Storage Update ([server/storage.ts](server/storage.ts:114))

Updated `createMarket` to accept and store `chainId`:

```typescript
async createMarket(insertMarket: InsertMarket): Promise<Market> {
  const id = randomUUID();
  const market: Market = {
    id,
    chainId: insertMarket.chainId || null, // ← NEW
    question: insertMarket.question,
    // ... rest of fields
  };
  this.markets.set(id, market);
  return market;
}
```

### 3. Market Creation Flow ([client/src/pages/CreateMarketPage.tsx](client/src/pages/CreateMarketPage.tsx:106-170))

**Added transaction log parsing** to extract `chainId` from the `MarketCreated` event:

```typescript
import { usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { MarketFactoryABI } from "@/contracts/config";

// In component:
const publicClient = usePublicClient();

useEffect(() => {
  if (isSuccess && hash && publicClient) {
    const indexMarket = async () => {
      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({ hash });

      // Extract chainId from MarketCreated event
      let chainId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: MarketFactoryABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'MarketCreated') {
            chainId = Number(decoded.args.marketId);
            console.log("Extracted chainId from event:", chainId);
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      // Send to backend with chainId
      const payload = {
        ...formData,
        chainId,  // ← Include chain ID
        outcomes: trimmedOutcomes,
        closingTime: formData.closingTime,
        creatorAddress: address || "",
      };

      await apiRequest("POST", "/api/markets", payload);
    };

    indexMarket();
  }
}, [isSuccess, hash, publicClient]);
```

### 4. Trading Panel Fix ([client/src/components/trading/TradingPanel.tsx](client/src/components/trading/TradingPanel.tsx:79-114))

**Changed from `market.id` to `market.chainId`**:

```typescript
const handleTrade = () => {
  // Validation checks...

  if (market.chainId === null || market.chainId === undefined) {
    toast({
      title: "Market Not On-Chain",
      description: "This market has not been deployed to the blockchain yet.",
      variant: "destructive",
    });
    return;
  }

  try {
    const marketId = BigInt(market.chainId);  // ← Changed from market.id
    const outcomeIndex = BigInt(outcome === "yes" ? 0 : 1);
    const amountInWei = parseUnits(amount, 18);

    if (side === "buy") {
      buy(marketId, outcomeIndex, amountInWei);
    } else {
      sell(marketId, outcomeIndex, amountInWei);
    }
  } catch (error) {
    // Error handling...
  }
};
```

## Contract Configuration

### MarketFactory Contract

**Address**: `0x04a93Cf6b5D573386A9d537B36117dBea56bD57c` (Base Sepolia)

**Key Functions**:
```solidity
function createMarket(
    string memory title,
    string memory description,
    string memory category,
    uint256 endTime,
    uint256 initialLiquidity
) external returns (uint256 marketId);  // Returns sequential ID: 0, 1, 2...
```

**Event Emitted**:
```solidity
event MarketCreated(
    uint256 indexed marketId,  // ← This is what we capture as chainId
    address indexed creator,
    string title,
    string category,
    uint256 endTime,
    uint256 initialLiquidity
);
```

## Data Flow

### Market Creation

1. **User submits form** → Frontend validates
2. **Frontend calls contract** → `createMarket()` on MarketFactory
   - Contract assigns sequential `marketCounter` (0, 1, 2...)
   - Emits `MarketCreated(marketId, ...)`
3. **Transaction confirmed** → Frontend gets receipt
4. **Parse transaction logs** → Extract `marketId` from event
5. **Index to backend** → POST `/api/markets` with `chainId: marketId`
6. **Database stores**:
   - `id`: UUID (for database queries)
   - `chainId`: sequential number (for blockchain calls)

### Trading

1. **User clicks Buy/Sell** → TradingPanel validates
2. **Check `market.chainId` exists** → Error if null
3. **Call HybridAMM contract**:
   ```typescript
   buy(BigInt(market.chainId), outcome, amount)
   ```
4. **Transaction submitted** → User confirms in wallet
5. **Position updated** → On-chain state changes

## Testing Checklist

### ✅ Market Creation
- [x] Connect wallet
- [x] Approve 110 ORACLE tokens
- [x] Create market with valid details
- [x] Transaction confirmed
- [x] `chainId` extracted from logs
- [x] Market indexed to database
- [x] Market appears in UI

### 🔄 Trading (Ready to Test)
- [ ] Navigate to created market
- [ ] Buy shares with ORACLE tokens
- [ ] Sell shares
- [ ] Verify positions update on-chain
- [ ] Check HybridAMM pool updates

### Mock Markets
**Note**: The 12 seed markets have `chainId: null` because they're not deployed to blockchain. This is intentional - they're for UI demonstration only and trading will show "Market Not On-Chain" error.

## Future Improvements

### 1. Sync On-Chain Markets
Create a background job to sync existing on-chain markets:
```typescript
// Pseudo-code
const marketCounter = await marketFactory.marketCounter();
for (let i = 0; i < marketCounter; i++) {
  const onChainMarket = await marketFactory.getMarket(i);
  // Check if exists in DB by chainId
  // If not, create DB record
}
```

### 2. Event Listener
Set up real-time indexing:
```typescript
marketFactory.on('MarketCreated', async (marketId, creator, title, ...) => {
  await storage.createMarket({
    chainId: Number(marketId),
    creatorAddress: creator,
    question: title,
    // ... populate from event data
  });
});
```

### 3. Validate Chain State
Before allowing trades, verify market exists on-chain:
```typescript
const onChainMarket = await marketFactory.getMarket(market.chainId);
if (onChainMarket.creator === '0x0000...') {
  throw new Error('Market not found on-chain');
}
```

## Common Issues

### Issue: "Market Not On-Chain"
**Cause**: Trying to trade on a seed market (chainId is null)
**Solution**: Create a new market through the UI - it will have a chainId

### Issue: "Cannot convert ... to BigInt"
**Cause**: Code is using `market.id` instead of `market.chainId`
**Solution**: Check all contract calls use `market.chainId`

### Issue: Market indexed but chainId is null
**Cause**: Event parsing failed or transaction reverted
**Solution**:
- Check transaction was successful
- Verify MarketFactoryABI includes MarketCreated event
- Check console logs for "Extracted chainId from event"

## Files Modified

1. [`shared/schema.ts`](shared/schema.ts) - Added `chainId` field
2. [`server/storage.ts`](server/storage.ts) - Updated createMarket to accept chainId
3. [`client/src/pages/CreateMarketPage.tsx`](client/src/pages/CreateMarketPage.tsx) - Extract chainId from logs
4. [`client/src/components/trading/TradingPanel.tsx`](client/src/components/trading/TradingPanel.tsx) - Use chainId for trades

## Summary

**Before**: Database UUIDs couldn't be used for blockchain calls ❌
**After**: Separate `chainId` field tracks on-chain market ID ✅

The system now properly bridges database records with blockchain state, allowing users to:
- Create markets that are stored both on-chain and in database
- Trade using the correct on-chain market ID
- Query markets efficiently using database UUIDs for UI
- Maintain data integrity between both systems
