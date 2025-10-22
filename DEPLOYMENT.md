# MarketFactory Deployment Guide

## Overview
This guide walks through deploying the production-ready MarketFactory contract to Base Sepolia.

## What's Fixed in the New Contract

### 1. **Simplified Interface**
- Matches frontend expectations exactly
- Parameters: `title`, `description`, `category`, `endTime`, `initialLiquidity`
- Returns `uint256` marketId (not `bytes32`)

### 2. **Proper Initialization**
- Uses `initialize()` pattern instead of constructor
- Prevents partial initialization issues
- Can verify initialization status with `isInitialized()`

### 3. **Correct Token Economics**
- 10 ORACLE tokens creation fee (was 100)
- 100 ORACLE minimum initial liquidity
- Burns creation fee, transfers liquidity to HybridAMM

### 4. **Better Market ID System**
- Uses sequential `uint256` IDs instead of `bytes32` hashes
- Easier to track and query markets
- Frontend-friendly

### 5. **Enhanced Access Control**
- Oracle resolver can resolve markets (not just owner)
- Proper checks for market existence
- Better error messages

## Deployment Steps

### Option 1: Deploy with Remix (Recommended - Easiest)

1. **Open Remix IDE**
   - Go to https://remix.ethereum.org

2. **Create Contract File**
   - In File Explorer, create new file: `MarketFactory.sol`
   - Copy contents from: `/home/seedslayer/Documents/OracleMarketV2/contracts/MarketFactory.sol`

3. **Install OpenZeppelin**
   - Click Plugin Manager
   - Activate "File Explorer" and "Solidity Compiler"
   - Remix will auto-fetch OpenZeppelin imports

4. **Compile**
   - Go to Solidity Compiler tab
   - Select compiler version: `0.8.20` or higher
   - Enable optimization (200 runs recommended)
   - Click "Compile MarketFactory.sol"

5. **Deploy**
   - Go to "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - Connect MetaMask to Base Sepolia network
   - Contract: Select "MarketFactory"
   - Constructor has NO arguments (leave empty)
   - Click "Deploy"
   - Confirm transaction in MetaMask

6. **Copy Contract Address**
   - After deployment, copy the contract address from Deployed Contracts section
   - Example: `0x...` (your new address)

7. **Initialize Contract**
   - In Deployed Contracts, expand your MarketFactory
   - Find `initialize` function
   - Enter parameters:
     ```
     _oracleToken: 0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836
     _hybridAMM: 0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F
     _oracleResolver: 0x5fa6b2bf6e0047914b520619726417a6cBB942E4
     ```
   - Click "transact"
   - Confirm in MetaMask

8. **Verify Initialization**
   - Call `isInitialized()` - should return `true`
   - Call `oracleToken()` - should return `0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836`
   - Call `hybridAMM()` - should return `0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F`

### Option 2: Deploy with Foundry

1. **Install Foundry**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Initialize Foundry Project**
   ```bash
   cd /home/seedslayer/Documents/OracleMarketV2
   forge init --no-git --force
   ```

3. **Install Dependencies**
   ```bash
   forge install OpenZeppelin/openzeppelin-contracts --no-commit
   ```

4. **Copy Contract**
   ```bash
   cp contracts/MarketFactory.sol src/
   ```

5. **Create Deploy Script**
   ```bash
   cat > script/Deploy.s.sol << 'EOF'
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.20;

   import "forge-std/Script.sol";
   import "../src/MarketFactory.sol";

   contract DeployScript is Script {
       function run() external {
           uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

           vm.startBroadcast(deployerPrivateKey);

           MarketFactory factory = new MarketFactory();
           console.log("MarketFactory deployed to:", address(factory));

           // Initialize
           factory.initialize(
               0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836, // oracleToken
               0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F, // hybridAMM
               0x5fa6b2bf6e0047914b520619726417a6cBB942E4  // oracleResolver
           );
           console.log("MarketFactory initialized");

           vm.stopBroadcast();
       }
   }
   EOF
   ```

6. **Deploy**
   ```bash
   source server/.env
   forge script script/Deploy.s.sol:DeployScript \
     --rpc-url https://sepolia.base.org \
     --broadcast \
     --verify \
     -vvvv
   ```

### Option 3: Deploy with Hardhat

1. **Install Hardhat**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   ```

2. **Initialize Hardhat**
   ```bash
   npx hardhat init
   # Select "Create a TypeScript project"
   ```

3. **Configure Hardhat**
   Edit `hardhat.config.ts`:
   ```typescript
   import { HardhatUserConfig } from "hardhat/config";
   import "@nomicfoundation/hardhat-toolbox";
   import * as dotenv from "dotenv";
   dotenv.config({ path: "./server/.env" });

   const config: HardhatUserConfig = {
     solidity: "0.8.20",
     networks: {
       baseSepolia: {
         url: "https://sepolia.base.org",
         accounts: [process.env.PRIVATE_KEY!],
         chainId: 84532,
       },
     },
   };

   export default config;
   ```

4. **Create Deploy Script**
   ```bash
   cat > scripts/deploy.ts << 'EOF'
   import { ethers } from "hardhat";

   async function main() {
     const MarketFactory = await ethers.getContractFactory("MarketFactory");
     const factory = await MarketFactory.deploy();
     await factory.waitForDeployment();

     const address = await factory.getAddress();
     console.log("MarketFactory deployed to:", address);

     // Initialize
     const tx = await factory.initialize(
       "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836",
       "0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F",
       "0x5fa6b2bf6e0047914b520619726417a6cBB942E4"
     );
     await tx.wait();
     console.log("MarketFactory initialized");
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   EOF
   ```

5. **Deploy**
   ```bash
   npx hardhat run scripts/deploy.ts --network baseSepolia
   ```

## Update Frontend Configuration

1. **Update Contract Address**
   Edit `client/src/contracts/config.ts`:
   ```typescript
   export const CONTRACTS = {
     OracleToken: "0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836" as Address,
     MarketFactory: "0xYOUR_NEW_CONTRACT_ADDRESS" as Address, // <-- UPDATE THIS
     HybridAMM: "0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F" as Address,
     OracleResolver: "0x5fa6b2bf6e0047914b520619726417a6cBB942E4" as Address,
   };
   ```

2. **Update ABI**
   Replace the `MarketFactoryABI` in `client/src/contracts/config.ts` with the ABI from `contracts/MarketFactoryABI.json`

   Or simply:
   ```bash
   # Copy the new ABI
   cat contracts/MarketFactoryABI.json
   # Then paste into config.ts as MarketFactoryABI
   ```

## Verify Deployment

1. **Run Test Script**
   ```bash
   npx tsx test-create-market.ts
   ```

2. **Check on Block Explorer**
   - Go to https://sepolia.basescan.org
   - Search for your contract address
   - Verify contract is deployed and initialized

3. **Test in Frontend**
   - Start dev server: `npm run dev`
   - Navigate to Create Market page
   - Ensure you have 110+ ORACLE tokens
   - Try creating a test market

## Contract Addresses Reference

- **OracleToken**: `0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836`
- **HybridAMM**: `0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F`
- **OracleResolver**: `0x5fa6b2bf6e0047914b520619726417a6cBB942E4`
- **OLD MarketFactory** (bricked): `0xEB5546fc9d78188a1d905F9fa54957a42f43ed8c`
- **NEW MarketFactory**: `0x04a93Cf6b5D573386A9d537B36117dBea56bD57c` ✅ **DEPLOYED & INITIALIZED**

## Deployer Account

- **Address**: `0x960496F21c55724b83F9cC55fB6eFCD87200C250`
- **Private Key**: Located in `server/.env`
- **Network**: Base Sepolia (Chain ID: 84532)

## Troubleshooting

### Issue: "Already initialized"
- You're calling `initialize()` on an already initialized contract
- Check with `isInitialized()` first
- This is intentional - prevents re-initialization attacks

### Issue: "Invalid oracle token" / "Invalid hybrid AMM"
- Make sure you're using the correct contract addresses
- Addresses must not be `0x0000...`

### Issue: Transaction fails when creating market
- Ensure you have approved enough ORACLE tokens (110 minimum)
- Check you have ETH for gas
- Verify contract is initialized with `isInitialized()`

### Issue: Market not showing in frontend
- Check that backend is indexing the new contract address
- Verify the MarketCreated event is being emitted
- Check browser console for errors

## Next Steps After Deployment

1. ✅ Deploy contract via Remix
2. ✅ Initialize with correct addresses
3. ✅ Update frontend config with new address and ABI
4. ✅ Test market creation
5. ✅ Verify markets appear in UI
6. Consider verifying contract on BaseScan for transparency

## Security Notes

- Contract uses OpenZeppelin's audited contracts
- ReentrancyGuard protects against reentrancy attacks
- Pausable allows emergency stops
- Ownable restricts admin functions
- One-time initialization prevents configuration attacks
