/**
 * Create a test market that closes in 1 hour for testing AI Oracle resolution
 */
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

const CONTRACTS = {
  MarketFactory: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40' as const,
  OracleToken: '0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836' as const,
};

const MarketFactoryABI = [
  {
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'initialLiquidity', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const OracleTokenABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in environment');
  }

  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  console.log('🤖 Creating test market for AI Oracle resolution testing...');
  console.log(`   Wallet: ${account.address}`);

  // Market closes in 1 hour from now
  const closingTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const endTime = BigInt(Math.floor(closingTime.getTime() / 1000));

  const question = `Will Bitcoin price be above $95,000 at ${closingTime.toLocaleTimeString()}? (Test Market)`;
  const description = `This is a TEST market for AI Oracle resolution. Market closes at ${closingTime.toLocaleString()}. The AI Oracle will automatically resolve this market based on Bitcoin's price at close time.`;
  const category = 'Crypto';
  const initialLiquidity = parseEther('500'); // 500 ORACLE tokens

  console.log(`\n📊 Market Details:`);
  console.log(`   Question: ${question}`);
  console.log(`   Category: ${category}`);
  console.log(`   Closing: ${closingTime.toLocaleString()}`);
  console.log(`   Liquidity: 500 ORACLE`);

  // Step 1: Approve tokens
  console.log('\n✅ Approving token spend...');
  const requiredAmount = parseEther('510'); // 500 + 10 fee
  const approvalHash = await walletClient.writeContract({
    address: CONTRACTS.OracleToken,
    abi: OracleTokenABI,
    functionName: 'approve',
    args: [CONTRACTS.MarketFactory, requiredAmount],
  });
  console.log(`   Approval tx: ${approvalHash}`);

  // Wait for approval
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 2: Simulate to get market ID
  console.log('\n⚡ Creating market on-chain...');
  const { result: marketId } = await publicClient.simulateContract({
    account: walletClient.account,
    address: CONTRACTS.MarketFactory,
    abi: MarketFactoryABI,
    functionName: 'createMarket',
    args: [question, description, category, endTime, initialLiquidity],
  });

  // Step 3: Execute transaction
  const createHash = await walletClient.writeContract({
    address: CONTRACTS.MarketFactory,
    abi: MarketFactoryABI,
    functionName: 'createMarket',
    args: [question, description, category, endTime, initialLiquidity],
  });

  console.log(`\n✅ Market created on-chain!`);
  console.log(`   Transaction: ${createHash}`);
  console.log(`   Market ID: ${marketId}`);
  console.log(`   View on BaseScan: https://sepolia.basescan.org/tx/${createHash}`);

  console.log(`\n⏰ Market will close in 1 hour at: ${closingTime.toLocaleString()}`);
  console.log(`🤖 AI Oracle will automatically resolve this market after it closes.`);

  console.log(`\n💡 Next steps:`);
  console.log(`   1. Add this market to database via POST /api/markets with chainId: ${marketId}`);
  console.log(`   2. Users can trade on this market via the frontend`);
  console.log(`   3. After closing, run AI Oracle resolution to test payout`);
}

main().catch(console.error);
