/**
 * AI Market Creator Service for Event-Driven Market Generation
 *
 * This service uses Claude (Anthropic) to:
 * 1. Monitor and research current events and trending topics
 * 2. Generate prediction-worthy market questions
 * 3. Create markets on-chain automatically
 * 4. Sync created markets to the database
 *
 * Approach: Event-Driven Creation
 * - Monitor specific data sources (news, crypto events, etc.)
 * - Create markets when significant events occur
 * - Real-time market generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { createWalletClient, createPublicClient, http, parseEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import type { IStorage } from './storage';

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
  {
    inputs: [],
    name: 'MARKET_CREATION_FEE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_INITIAL_LIQUIDITY',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
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
  {
    inputs: [
      { name: 'account', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface MarketIdea {
  question: string;
  description: string;
  category: 'Politics' | 'Sports' | 'Crypto' | 'Technology' | 'Science' | 'Finance' | 'Entertainment' | 'Other';
  closingTime: Date;
  reasoning: string;
  confidence: number;
  sources: string[];
  initialLiquidity: number; // in ORACLE tokens
}

interface EventSource {
  name: string;
  type: 'news' | 'crypto' | 'sports' | 'general';
  enabled: boolean;
}

export class AIMarketCreator {
  private anthropic: Anthropic | null = null;
  private storage: IStorage;
  private walletClient: any;
  private publicClient: any;
  private isProcessing = false;
  private eventSources: EventSource[] = [
    { name: 'crypto_events', type: 'crypto', enabled: true },
    { name: 'political_events', type: 'news', enabled: true },
    { name: 'sports_events', type: 'sports', enabled: true },
    { name: 'tech_trends', type: 'general', enabled: true },
  ];

  constructor(storage: IStorage) {
    this.storage = storage;

    // Initialize Anthropic client if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✅ AI Market Creator initialized with Claude');
    } else {
      console.log('⚠️  AI Market Creator running without ANTHROPIC_API_KEY - market creation disabled');
    }

    // Initialize wallet client for on-chain transactions
    if (process.env.PRIVATE_KEY) {
      const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http('https://sepolia.base.org'),
      });

      // Create proper public client for reading contract state
      this.publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org'),
      });

      console.log('✅ Wallet initialized for AI market creation');
      console.log(`   Address: ${account.address}`);
    } else {
      console.log('⚠️  No PRIVATE_KEY found - on-chain market creation disabled');
    }
  }

  /**
   * Main method to research and create markets based on current events
   */
  async researchAndCreateMarkets(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏭️  Market creation already in progress, skipping...');
      return;
    }

    if (!this.anthropic || !this.walletClient) {
      console.log('⏭️  AI Market Creator or wallet not initialized, skipping market creation');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('\n🔍 AI Market Creator: Researching current events for market opportunities...');

      // Step 1: Get market ideas from AI
      const marketIdeas = await this.getMarketIdeasFromAI();

      if (marketIdeas.length === 0) {
        console.log('✅ No compelling market opportunities found at this time');
        return;
      }

      console.log(`📊 Generated ${marketIdeas.length} market idea(s)`);

      // Step 2: Create each market
      for (const idea of marketIdeas) {
        try {
          await this.createMarket(idea);
          // Add delay between creations to avoid rate limiting and gas issues
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`❌ Failed to create market for "${idea.question}":`, error);
          // Continue with next market
        }
      }

    } catch (error) {
      console.error('❌ Error in researchAndCreateMarkets:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get market ideas from AI based on current events
   */
  private async getMarketIdeasFromAI(): Promise<MarketIdea[]> {
    if (!this.anthropic) return [];

    try {
      console.log('🧠 Consulting AI for market opportunities...');

      const prompt = this.buildMarketResearchPrompt();

      const message = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        temperature: 0.7, // Higher temperature for creative market ideas
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse the response
      return this.parseMarketIdeas(response.text);

    } catch (error) {
      console.error('❌ Failed to get market ideas from AI:', error);
      return [];
    }
  }

  /**
   * Build the prompt for AI market research
   */
  private buildMarketResearchPrompt(): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    return `You are an AI oracle responsible for creating valuable and engaging prediction markets based on current events and upcoming milestones.

CURRENT DATE: ${currentDate}

YOUR TASK:
Research and identify 1-3 prediction-worthy events or questions that would make excellent prediction markets. Focus on:
1. Upcoming events with clear resolution criteria
2. Topics with public interest and engagement potential
3. Events that can be objectively verified
4. Questions with binary (YES/NO) outcomes

CATEGORIES TO CONSIDER:
- **Crypto**: Price predictions, protocol launches, network upgrades, major partnerships
- **Politics**: Elections, policy decisions, legislative outcomes
- **Sports**: Championship outcomes, player achievements, tournament results
- **Technology**: Product launches, company announcements, adoption milestones
- **Finance**: Economic indicators, corporate earnings, market milestones
- **Entertainment**: Award shows, box office records, streaming releases
- **Science**: Space missions, research breakthroughs, climate milestones

MARKET QUALITY CRITERIA:
✓ Clear resolution criteria (unambiguous YES/NO outcome)
✓ Verifiable through public information
✓ Closes within 1-90 days from today
✓ High public interest and engagement potential
✓ Objective and fair question wording
✗ Avoid: Ambiguous questions, unverifiable outcomes, controversial topics that could be offensive

RESPONSE FORMAT (JSON array only):
[
  {
    "question": "<Clear, concise question (60 chars max)>",
    "description": "<Detailed description with resolution criteria (200 chars max)>",
    "category": "Politics" | "Sports" | "Crypto" | "Technology" | "Science" | "Finance" | "Entertainment" | "Other",
    "closingTime": "<ISO 8601 date when market should close>",
    "reasoning": "<Why this is a good prediction market>",
    "confidence": <0-100, how confident you are this will be a good market>,
    "sources": ["<relevant data sources or context>"],
    "initialLiquidity": <100-1000, recommended initial liquidity in ORACLE tokens>
  }
]

IMPORTANT GUIDELINES:
1. Questions must be clear, specific, and time-bound
2. Closing time should be shortly after the event conclusion (within 1-7 days after event)
3. Each question must be answerable with a definitive YES or NO
4. Avoid questions that depend on subjective interpretation
5. Focus on upcoming events (not past events)
6. Ensure questions are balanced and fair to both outcomes
7. Provide detailed resolution criteria in the description
8. Only suggest markets for events within the next 90 days

EXAMPLES OF GOOD MARKETS:
- "Will Bitcoin reach $100,000 by end of Q1 2025?" (Crypto, specific date, verifiable)
- "Will the 2025 Super Bowl have over 60 total points?" (Sports, clear metric, verifiable)
- "Will Apple announce a new iPhone model in March 2025?" (Tech, specific event, verifiable)

EXAMPLES OF BAD MARKETS:
- "Will the world be better next year?" (Too subjective, not verifiable)
- "Is Elon Musk a good CEO?" (Opinion-based, not verifiable)
- "Will aliens be discovered?" (No timeframe, unlikely resolution)

Now, research current events and upcoming milestones to identify 1-3 compelling prediction markets:`;
  }

  /**
   * Parse AI response into market ideas
   */
  private parseMarketIdeas(response: string): MarketIdea[] {
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('Expected an array of market ideas');
      }

      // Validate and transform each idea
      const validIdeas: MarketIdea[] = [];

      for (const idea of parsed) {
        // Validate required fields
        if (!idea.question || !idea.description || !idea.category || !idea.closingTime) {
          console.warn('⚠️  Skipping invalid market idea:', idea);
          continue;
        }

        // Validate category
        const validCategories = ['Politics', 'Sports', 'Crypto', 'Technology', 'Science', 'Finance', 'Entertainment', 'Other'];
        if (!validCategories.includes(idea.category)) {
          console.warn(`⚠️  Invalid category "${idea.category}", skipping market`);
          continue;
        }

        // Parse and validate closing time
        const closingTime = new Date(idea.closingTime);
        if (isNaN(closingTime.getTime())) {
          console.warn('⚠️  Invalid closing time, skipping market:', idea.closingTime);
          continue;
        }

        // Ensure closing time is in the future
        if (closingTime < new Date()) {
          console.warn('⚠️  Closing time is in the past, skipping market:', idea.closingTime);
          continue;
        }

        // Validate liquidity
        const initialLiquidity = idea.initialLiquidity || 100;
        if (initialLiquidity < 100 || initialLiquidity > 10000) {
          console.warn('⚠️  Initial liquidity out of range, clamping to 100-10000:', initialLiquidity);
          idea.initialLiquidity = Math.max(100, Math.min(10000, initialLiquidity));
        }

        validIdeas.push({
          question: idea.question,
          description: idea.description,
          category: idea.category,
          closingTime,
          reasoning: idea.reasoning || 'Generated by AI Market Creator',
          confidence: idea.confidence || 50,
          sources: idea.sources || [],
          initialLiquidity: idea.initialLiquidity,
        });
      }

      return validIdeas;

    } catch (error) {
      console.error('❌ Failed to parse market ideas:', error);
      console.error('Response:', response);
      return [];
    }
  }

  /**
   * Create a market on-chain and sync to database
   */
  private async createMarket(idea: MarketIdea): Promise<void> {
    console.log(`\n🤖 AI creating market: "${idea.question}"`);
    console.log(`   Category: ${idea.category}`);
    console.log(`   Closing: ${idea.closingTime.toISOString()}`);
    console.log(`   Confidence: ${idea.confidence}%`);
    console.log(`   Reasoning: ${idea.reasoning}`);

    try {
      // Step 1: Check wallet balance
      const balance = await this.publicClient.readContract({
        address: CONTRACTS.OracleToken,
        abi: OracleTokenABI,
        functionName: 'balanceOf',
        args: [this.walletClient.account.address],
      });

      const requiredAmount = parseEther((idea.initialLiquidity + 10).toString()); // liquidity + 10 token fee

      if (balance < requiredAmount) {
        console.log('❌ Insufficient ORACLE token balance');
        console.log(`   Required: ${idea.initialLiquidity + 10} ORACLE`);
        console.log(`   Balance: ${Number(balance) / 1e18} ORACLE`);
        return;
      }

      // Step 2: Approve MarketFactory to spend tokens
      console.log('✅ Approving token spend...');
      const approvalHash = await this.walletClient.writeContract({
        address: CONTRACTS.OracleToken,
        abi: OracleTokenABI,
        functionName: 'approve',
        args: [CONTRACTS.MarketFactory, requiredAmount],
      });

      console.log(`   Approval tx: ${approvalHash}`);

      // Wait for approval confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 3: Create market on-chain
      console.log('⚡ Creating market on-chain...');

      const endTime = BigInt(Math.floor(idea.closingTime.getTime() / 1000));
      const initialLiquidity = parseEther(idea.initialLiquidity.toString());

      // First simulate to get the return value
      const { result: marketId } = await this.publicClient.simulateContract({
        account: this.walletClient.account,
        address: CONTRACTS.MarketFactory,
        abi: MarketFactoryABI,
        functionName: 'createMarket',
        args: [
          idea.question,
          idea.description,
          idea.category,
          endTime,
          initialLiquidity,
        ],
      });

      // Now execute the actual transaction
      const createHash = await this.walletClient.writeContract({
        address: CONTRACTS.MarketFactory,
        abi: MarketFactoryABI,
        functionName: 'createMarket',
        args: [
          idea.question,
          idea.description,
          idea.category,
          endTime,
          initialLiquidity,
        ],
      });

      console.log(`✅ Market created on-chain! Tx: ${createHash}`);
      console.log(`✅ Market ID: ${marketId}`);

      // Wait for transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Step 4: Add market to database
      console.log('💾 Adding market to database...');

      const newMarketChainId = Number(marketId);

      // Add market to database
      const dbMarket = await this.storage.createMarket({
        chainId: newMarketChainId,
        question: idea.question,
        description: idea.description,
        category: idea.category,
        closingTime: idea.closingTime,
        creatorAddress: this.walletClient.account.address,
        totalVolume: '0',
        tradersCount: 0,
        status: 'active',
        outcomes: ['Yes', 'No'], // Binary market outcomes
        marketType: 'binary',
      });

      console.log(`✅ Market added to database with ID: ${dbMarket.id}, chainId: ${newMarketChainId}`);

      console.log(`\n🎉 Successfully created market: "${idea.question}"`);
      console.log(`   Transaction: ${createHash}`);

    } catch (error) {
      console.error('❌ Failed to create market on-chain:', error);
      throw error;
    }
  }

  /**
   * Manually trigger market creation for a specific topic
   */
  async createMarketForTopic(topic: string): Promise<void> {
    if (!this.anthropic || !this.walletClient) {
      throw new Error('AI Market Creator not fully initialized');
    }

    console.log(`\n🎯 Creating market for specific topic: "${topic}"`);

    try {
      const prompt = `You are an AI oracle creating a prediction market about this specific topic:

TOPIC: "${topic}"
CURRENT DATE: ${new Date().toISOString().split('T')[0]}

Create exactly ONE high-quality prediction market based on this topic. The market must:
1. Have a clear YES/NO resolution criteria
2. Be verifiable through public information
3. Close within 1-90 days from today
4. Be engaging and valuable to traders

RESPONSE FORMAT (JSON object only):
{
  "question": "<Clear, concise question (60 chars max)>",
  "description": "<Detailed description with resolution criteria (200 chars max)>",
  "category": "Politics" | "Sports" | "Crypto" | "Technology" | "Science" | "Finance" | "Entertainment" | "Other",
  "closingTime": "<ISO 8601 date when market should close>",
  "reasoning": "<Why this is a good prediction market>",
  "confidence": <0-100>,
  "sources": ["<relevant sources>"],
  "initialLiquidity": <100-1000>
}

Create the market now:`;

      const message = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse as single market idea (wrapped in array for reuse)
      const ideas = this.parseMarketIdeas(`[${response.text}]`);

      if (ideas.length === 0) {
        throw new Error('Failed to generate a valid market idea for the topic');
      }

      await this.createMarket(ideas[0]);

    } catch (error) {
      console.error('❌ Failed to create market for topic:', error);
      throw error;
    }
  }

  /**
   * Start automated market creation scheduler
   */
  startAutoCreation(intervalMs: number = 3600000): void {
    console.log(`🤖 Starting AI Market Creator auto-generation (checking every ${intervalMs / 1000}s)...`);

    // Run initial check after a short delay
    setTimeout(() => {
      this.researchAndCreateMarkets();
    }, 10000); // 10 seconds after startup

    // Schedule periodic market creation
    setInterval(() => {
      this.researchAndCreateMarkets();
    }, intervalMs);
  }
}
