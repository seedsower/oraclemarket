import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, 'server', '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY not found in server/.env');
}

const formattedKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(formattedKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// Contract addresses
const ORACLE_TOKEN = '0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836';
const HYBRID_AMM = '0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F';
const ORACLE_RESOLVER = '0x5fa6b2bf6e0047914b520619726417a6cBB942E4';

async function deployMarketFactory() {
  console.log('Deploying MarketFactory...');
  console.log('Deployer address:', account.address);

  // Read the compiled bytecode (you'll need to compile the contract first)
  // For now, using a placeholder - you need to compile with Hardhat or Foundry

  console.log('\n⚠️  DEPLOYMENT STEPS:');
  console.log('\n1. Compile the contract:');
  console.log('   Option A - Using Hardhat:');
  console.log('     npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox');
  console.log('     npx hardhat compile');
  console.log('\n   Option B - Using Foundry (recommended):');
  console.log('     curl -L https://foundry.paradigm.xyz | bash');
  console.log('     foundryup');
  console.log('     forge build');

  console.log('\n2. Deploy using Remix IDE (easiest):');
  console.log('   a. Go to https://remix.ethereum.org');
  console.log('   b. Create new file: MarketFactory.sol');
  console.log('   c. Copy contract from: contracts/MarketFactory.sol');
  console.log('   d. Compile with Solidity 0.8.20+');
  console.log('   e. Deploy tab -> Environment: Injected Provider - MetaMask');
  console.log('   f. Select Base Sepolia network');
  console.log('   g. Deploy (no constructor arguments)');
  console.log('   h. Copy deployed contract address');

  console.log('\n3. Initialize the deployed contract:');
  console.log('   a. Call initialize() with:');
  console.log(`      _oracleToken: ${ORACLE_TOKEN}`);
  console.log(`      _hybridAMM: ${HYBRID_AMM}`);
  console.log(`      _oracleResolver: ${ORACLE_RESOLVER}`);

  console.log('\n4. Update frontend config:');
  console.log('   Edit client/src/contracts/config.ts');
  console.log('   Update MarketFactory address to new deployed address');

  console.log('\n5. Update the ABI in config.ts with the new contract ABI');

  console.log('\n📝 Your deployer address:', account.address);
  console.log('Make sure you have ETH on Base Sepolia for gas fees');
}

deployMarketFactory().catch(console.error);
