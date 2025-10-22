# Complete System Deployment Guide

## Current Situation

Your new MarketFactory (`0x04a93Cf6b5D573386A9d537B36117dBea56bD57c`) is trying to call the old HybridAMM (`0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F`), but the old HybridAMM only accepts calls from the old MarketFactory (`0xEB5546fc9d78188a1d905F9fa54957a42f43ed8c`).

**Result**: Market creation transactions are failing.

## Solution: Deploy New HybridAMM

You need to deploy a new HybridAMM contract and update your MarketFactory initialization.

### Step 1: Deploy HybridAMM

**Using Remix IDE** (Easiest):

1. **Go to Remix**: https://remix.ethereum.org

2. **Create Contract File**:
   - New file: `HybridAMM.sol`
   - Copy contents from: `/home/seedslayer/Documents/OracleMarketV2/contracts/HybridAMM.sol`

3. **Compile**:
   - Solidity Compiler tab
   - Version: `0.8.20+`
   - Enable optimization (200 runs)
   - Click "Compile HybridAMM.sol"

4. **Deploy**:
   - Deploy & Run tab
   - Environment: "Injected Provider - MetaMask"
   - Network: Base Sepolia
   - Contract: "HybridAMM"
   - Constructor parameter: `0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836` (OracleToken)
   - Click "Deploy"
   - **SAVE THE ADDRESS!** (e.g., `0xNEW_HYBRID_AMM_ADDRESS`)

5. **Set MarketFactory** (in Remix after deployment):
   - Expand deployed HybridAMM contract
   - Find `setMarketFactory` function
   - Enter: `0x04a93Cf6b5D573386A9d537B36117dBea56bD57c` (new MarketFactory)
   - Click "transact"
   - Confirm in MetaMask

### Step 2: Re-initialize MarketFactory

Your MarketFactory is already initialized with the OLD HybridAMM. You have two options:

#### Option A: Deploy Fresh MarketFactory (Recommended)

1. **Deploy New MarketFactory** in Remix:
   - Use `/home/seedslayer/Documents/OracleMarketV2/contracts/MarketFactory.sol`
   - No constructor parameters
   - Deploy to Base Sepolia

2. **Initialize** with correct addresses:
   ```
   oracleToken: 0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836
   hybridAMM: 0xNEW_HYBRID_AMM_ADDRESS (from step 1)
   oracleResolver: 0x5fa6b2bf6e0047914b520619726417a6cBB942E4
   ```

3. **Update Frontend Config**:
   Edit `client/src/contracts/config.ts`:
   ```typescript
   export const CONTRACTS = {
     OracleToken: "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836" as Address,
     MarketFactory: "0xNEW_MARKET_FACTORY_ADDRESS" as Address, // NEW!
     HybridAMM: "0xNEW_HYBRID_AMM_ADDRESS" as Address, // NEW!
     // ... rest unchanged
   };
   ```

#### Option B: Modify Contract to Allow Re-initialization (Advanced)

This requires modifying the MarketFactory contract to add a `setHybridAMM` function and redeploying.

### Step 3: Test the System

After deployment and configuration:

1. **Create a test market**:
   - Go to Create Market page
   - Make sure you have 110 ORACLE tokens
   - Approve tokens
   - Create market
   - **Should succeed!** ✅

2. **Verify on BaseScan**:
   - Check transaction succeeded
   - Verify HybridAMM.createMarketPool was called

3. **Test trading**:
   - Navigate to your market
   - Try buying shares
   - Should work without "Market Not On-Chain" error

## Quick Deploy Script

Here's what you need to deploy in order:

```
1. HybridAMM
   Constructor: (oracleToken)
   Values: (0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836)

2. Call HybridAMM.setMarketFactory()
   Parameter: <MarketFactory address from next step>

3. MarketFactory
   Constructor: () // empty

4. Call MarketFactory.initialize()
   Parameters:
   - oracleToken: 0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836
   - hybridAMM: <HybridAMM address from step 1>
   - oracleResolver: 0x5fa6b2bf6e0047914b520619726417a6cBB942E4
```

## Addresses Checklist

After deployment, you should have:

- ✅ **OracleToken**: `0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836` (existing)
- ✅ **OracleResolver**: `0x5fa6b2bf6e0047914b520619726417a6cBB942E4` (existing)
- 🆕 **HybridAMM**: `0x...` (new - to deploy)
- 🆕 **MarketFactory**: `0x...` (new - to deploy)

## Configuration Files to Update

### 1. `client/src/contracts/config.ts`

```typescript
export const CONTRACTS = {
  OracleToken: "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836" as Address,
  MarketFactory: "0xNEW_MARKET_FACTORY" as Address, // UPDATE
  HybridAMM: "0xNEW_HYBRID_AMM" as Address, // UPDATE
  Staking: "0x58eD0a8B6F6972d052A405a6B398cDF480B2EA7D" as Address,
  OrderBook: "0x99aA3F52042586bA4E57D72aCc575057F4853A09" as Address,
  Treasury: "0xa8E97D3A2d64af4037A504835d7EB1788C945e77" as Address,
  Governance: "0xb8fE03037Bdf44497589D75DB3B4ed11C9458AAE" as Address,
  MockUSDC: "0x3fcF28B436f16d08dc1e64E90c93833edd1ba0A1" as Address,
} as const;
```

### 2. Update ABI if needed

The HybridAMM ABI in `config.ts` should match the new contract. Update if there are any differences.

## Troubleshooting

### Issue: HybridAMM deployment fails
- **Cause**: Insufficient gas or wrong network
- **Fix**: Make sure you're on Base Sepolia with enough ETH for gas

### Issue: setMarketFactory fails with "Only owner"
- **Cause**: You're not the owner of HybridAMM
- **Fix**: Make sure you're using the same wallet that deployed HybridAMM

### Issue: Market creation still fails
- **Cause**: Frontend still pointing to old contracts
- **Fix**:
  1. Clear browser cache
  2. Verify `config.ts` has new addresses
  3. Restart dev server: `npm run dev`

### Issue: "Not initialized" error
- **Cause**: Forgot to call `initialize()` on MarketFactory
- **Fix**: Call `initialize()` with all three required addresses

## Alternative: Simplified Approach

If you want to skip HybridAMM for now and just get markets working:

1. **Use MarketFactorySimple.sol** (already created in `contracts/` folder)
   - This version doesn't require HybridAMM
   - Markets still work, just without automated pricing
   - Trading happens through external systems

2. **Deploy MarketFactorySimple**:
   - Only needs `oracleToken` and `oracleResolver` in `initialize()`
   - Smaller, simpler, fewer dependencies

3. **Add HybridAMM later** when you're ready for full AMM functionality

## Next Steps After Deployment

1. ✅ Deploy HybridAMM
2. ✅ Deploy MarketFactory (or use existing if you can update it)
3. ✅ Initialize both contracts
4. ✅ Update frontend config
5. ✅ Test market creation
6. ✅ Test trading
7. ✅ Celebrate! 🎉

## Support

If you run into issues:
- Check transaction on BaseScan for specific error messages
- Verify all addresses are correct
- Make sure contracts are initialized
- Check you have enough ORACLE tokens (110 for creating + trading)
