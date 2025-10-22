# Quick Fix - Deploy New MarketFactory

## Current Status

✅ **HybridAMM deployed**: `0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055`
✅ **HybridAMM configured**: Points to current MarketFactory
❌ **Problem**: Current MarketFactory (`0x04a93Cf6b5D573386A9d537B36117dBea56bD57c`) is initialized with OLD HybridAMM

## Solution: Deploy Fresh MarketFactory

You need to deploy a new MarketFactory with the correct HybridAMM address.

### Step 1: Deploy MarketFactory via Remix

1. Go to https://remix.ethereum.org
2. Create file `MarketFactory.sol` with contents from `/home/seedslayer/Documents/OracleMarketV2/contracts/MarketFactory.sol`
3. Compile with Solidity 0.8.20+
4. Deploy with **NO constructor parameters** (empty constructor)
5. **Save the new address!** Let's call it `NEW_MARKET_FACTORY`

### Step 2: Initialize MarketFactory

In Remix, after deployment:

1. Expand the deployed MarketFactory contract
2. Find `initialize` function
3. Enter these parameters:
   ```
   _oracleToken:     0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836
   _hybridAMM:       0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055
   _oracleResolver:  0x5fa6b2bf6e0047914b520619726417a6cBB942E4
   ```
4. Click "transact"
5. Confirm in MetaMask

### Step 3: Update HybridAMM

Point HybridAMM to the new MarketFactory:

1. In Remix, load HybridAMM at `0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055`
2. Use this ABI to interact:
   ```json
   [
     {
       "inputs": [{"name": "_marketFactory", "type": "address"}],
       "name": "setMarketFactory",
       "outputs": [],
       "stateMutability": "nonpayable",
       "type": "function"
     }
   ]
   ```
3. Call `setMarketFactory(NEW_MARKET_FACTORY)`
4. Confirm in MetaMask

### Step 4: Update Frontend

Edit `client/src/contracts/config.ts`:

```typescript
export const CONTRACTS = {
  OracleToken: "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836" as Address,
  MarketFactory: "NEW_MARKET_FACTORY" as Address,  // ← UPDATE THIS
  HybridAMM: "0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055" as Address,  // ← UPDATE THIS
  Staking: "0x58eD0a8B6F6972d052A405a6B398cDF480B2EA7D" as Address,
  OrderBook: "0x99aA3F52042586bA4E57D72aCc575057F4853A09" as Address,
  Treasury: "0xa8E97D3A2d64af4037A504835d7EB1788C945e77" as Address,
  Governance: "0xb8fE03037Bdf44497589D75DB3B4ed11C9458AAE" as Address,
  MockUSDC: "0x3fcF28B436f16d08dc1e64E90c93833edd1ba0A1" as Address,
} as const;
```

### Step 5: Test!

1. Restart dev server (already running on port 5000)
2. Create a new market
3. Transaction should succeed! ✅
4. Market should be indexed with chainId
5. Trading should work!

## Why Deploy New MarketFactory?

The `initialize()` function in MarketFactory has this check:
```solidity
require(!initialized, "Already initialized");
```

Once called, it can't be called again. The current MarketFactory was initialized with the old HybridAMM (`0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F`), so we can't update it.

**Options we had:**
1. ❌ Add `setHybridAMM()` function - requires modifying and redeploying anyway
2. ✅ Deploy fresh MarketFactory - cleanest solution, same contract code

## Contract Addresses After Fix

- **OracleToken**: `0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836` (unchanged)
- **HybridAMM**: `0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055` (NEW ✅)
- **MarketFactory**: `NEW_MARKET_FACTORY` (to deploy)
- **OracleResolver**: `0x5fa6b2bf6e0047914b520619726417a6cBB942E4` (unchanged)

## Verification After Deployment

Run this to verify everything is configured:

```bash
# Update the address in verify-new-contract.ts first, then:
npx tsx verify-new-contract.ts
```

Should show:
```
✓ Initialized: true
✓ Oracle Token: 0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836
✓ Hybrid AMM: 0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055
✓ Owner: 0x960496F21c55724b83F9cC55fB6eFCD87200C250
✓ Market Counter: 0
```

Then create a market and it should work perfectly! 🎉
