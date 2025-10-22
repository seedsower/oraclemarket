/**
 * Create AI-generated markets with short closing times (1-2 days) for testing
 */
import Anthropic from '@anthropic-ai/sdk';
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
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface MarketIdea {
  question: string;
  description: string;
  category: string;
  closingTime: Date;
  reasoning: string;
  confidence: number;
  sources: string[];
  initialLiquidity: number;
}

async function generateMarketIdeas(anthropic: Anthropic): Promise<MarketIdea[]> {
  const prompt = `You are an AI that generates prediction markets for current events.

Generate 3 prediction market ideas that:
1. Are about events happening in the NEXT 24-48 HOURS (very short term!)
2. Have objectively verifiable outcomes
3. Cover different categories (Crypto, Sports, Finance, Technology, etc.)
4. Are interesting and tradeable
5. Will have clear resolution data available within 1-2 days

Examples:
- "Will Bitcoin close above $95,000 tomorrow?"
- "Will the S&P 500 gain more than 1% today?"
- "Will it rain in New York City tomorrow?"

Current date: ${new Date().toISOString()}

Return ONLY a JSON array of exactly 3 market ideas with this structure:
[{
  "question": "Clear yes/no question",
  "description": "Detailed resolution criteria",
  "category": "Crypto|Sports|Finance|Technology|Science|Politics|Entertainment|Other",
  "hoursUntilClose": 24-48 (number of hours from now),
  "reasoning": "Why this is a good market",
  "confidence": 85,
  "sources": ["url1", "url2"],
  "initialLiquidity": 500-800 (in ORACLE tokens)
}]`;

  const message = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse JSON from response (handle code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in AI response');
  }

  const ideas = JSON.parse(jsonMatch[0]);

  return ideas.map((idea: any) => ({
    question: idea.question,
    description: idea.description,
    category: idea.category,
    closingTime: new Date(Date.now() + idea.hoursUntilClose * 60 * 60 * 1000),
    reasoning: idea.reasoning,
    confidence: idea.confidence,
    sources: idea.sources || [],
    initialLiquidity: idea.initialLiquidity || 500,
  }));
}

async function createMarket(
  idea: MarketIdea,
  walletClient: any,
  publicClient: any,
  storage: any
): Promise<void> {
  console.log(`\n🤖 Creating market: "${idea.question}"`);
  console.log(`   Category: ${idea.category}`);
  console.log(`   Closing: ${idea.closingTime.toLocaleString()}`);
  console.log(`   Liquidity: ${idea.initialLiquidity} ORACLE`);

  const requiredAmount = parseEther((idea.initialLiquidity + 10).toString());

  // Step 1: Approve tokens
  console.log('✅ Approving token spend...');
  const approvalHash = await walletClient.writeContract({
    address: CONTRACTS.OracleToken,
    abi: OracleTokenABI,
    functionName: 'approve',
    args: [CONTRACTS.MarketFactory, requiredAmount],
  });
  console.log(`   Approval tx: ${approvalHash}`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 2: Simulate to get market ID
  console.log('⚡ Creating market on-chain...');
  const endTime = BigInt(Math.floor(idea.closingTime.getTime() / 1000));
  const initialLiquidity = parseEther(idea.initialLiquidity.toString());

  const { result: marketId } = await publicClient.simulateContract({
    account: walletClient.account,
    address: CONTRACTS.MarketFactory,
    abi: MarketFactoryABI,
    functionName: 'createMarket',
    args: [idea.question, idea.description, idea.category, endTime, initialLiquidity],
  });

  // Step 3: Execute transaction
  const createHash = await walletClient.writeContract({
    address: CONTRACTS.MarketFactory,
    abi: MarketFactoryABI,
    functionName: 'createMarket',
    args: [idea.question, idea.description, idea.category, endTime, initialLiquidity],
  });

  console.log(`✅ Market created on-chain! Tx: ${createHash}`);
  console.log(`✅ Market ID: ${marketId}`);

  await new Promise(resolve => setTimeout(resolve, 8000));

  // Step 4: Add to database via API
  console.log('💾 Adding market to database...');

  const response = await fetch('http://localhost:5000/api/markets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId: Number(marketId),
      question: idea.question,
      description: idea.description,
      category: idea.category,
      closingTime: idea.closingTime.toISOString(),
      creatorAddress: walletClient.account.address,
      outcomes: ['Yes', 'No'],
      marketType: 'binary',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add market to database: ${await response.text()}`);
  }

  const dbMarket = await response.json();
  console.log(`✅ Market added to database with ID: ${dbMarket.id}`);
  console.log(`\n🎉 Successfully created market: "${idea.question}"`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not found');
  }
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found');
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

  console.log('🤖 Generating short-term market ideas with AI...');
  const ideas = await generateMarketIdeas(anthropic);
  console.log(`📊 Generated ${ideas.length} market idea(s)\n`);

  for (const idea of ideas) {
    try {
      await createMarket(idea, walletClient, publicClient, null);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`❌ Failed to create market:`, error);
    }
  }

  console.log('\n✅ All markets created!');
}

main().catch(console.error);
