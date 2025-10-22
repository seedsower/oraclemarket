/**
 * AI Oracle Service for Automated Market Resolution
 *
 * This service uses Claude (Anthropic) as an AI oracle to:
 * 1. Monitor markets that have passed their closing time
 * 2. Research and gather information about market outcomes
 * 3. Make informed decisions on market resolution
 * 4. Execute on-chain resolution transactions
 * 5. Update backend database with resolution results
 */

import Anthropic from '@anthropic-ai/sdk';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import type { IStorage } from './storage';
import type { Market } from '@shared/schema';

const CONTRACTS = {
  MarketFactory: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40' as const,
};

const MarketFactoryABI = [
  {
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'closeMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'uint256' },
    ],
    name: 'resolveMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface ResolutionDecision {
  outcome: 'yes' | 'no' | 'invalid';
  confidence: number;
  reasoning: string;
  sources: string[];
}

export class AIOracle {
  private anthropic: Anthropic | null = null;
  private storage: IStorage;
  private walletClient: any;
  private isProcessing = false;

  constructor(storage: IStorage) {
    this.storage = storage;

    // Initialize Anthropic client if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✅ AI Oracle initialized with Claude');
    } else {
      console.log('⚠️  AI Oracle running without ANTHROPIC_API_KEY - AI resolution disabled');
    }

    // Initialize wallet client for on-chain transactions
    if (process.env.PRIVATE_KEY) {
      const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http('https://sepolia.base.org'),
      });
      console.log('✅ Wallet initialized for on-chain resolution');
    } else {
      console.log('⚠️  No PRIVATE_KEY found - on-chain resolution disabled');
    }
  }

  /**
   * Main method to check and resolve markets
   */
  async checkAndResolveMarkets(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏭️  Resolution already in progress, skipping...');
      return;
    }

    if (!this.anthropic || !this.walletClient) {
      console.log('⏭️  AI Oracle or wallet not initialized, skipping resolution check');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('🔍 Checking for markets to resolve...');

      // Get all active markets that have passed their closing time
      const markets = await this.storage.getMarkets({ status: 'active' });
      const now = new Date();

      const expiredMarkets = markets.filter(m => {
        return m.closingTime && new Date(m.closingTime) < now;
      });

      if (expiredMarkets.length === 0) {
        console.log('✅ No markets need resolution at this time');
        return;
      }

      console.log(`📊 Found ${expiredMarkets.length} market(s) ready for resolution`);

      for (const market of expiredMarkets) {
        try {
          await this.resolveMarket(market);
          // Add delay between resolutions to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed to resolve market ${market.id}:`, error);
          // Continue with next market
        }
      }

    } catch (error) {
      console.error('❌ Error in checkAndResolveMarkets:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Resolve a specific market using AI oracle
   */
  async resolveMarket(market: Market): Promise<void> {
    console.log(`\n🤖 AI Oracle resolving market: "${market.question}"`);
    console.log(`   Market ID: ${market.id} | Chain ID: ${market.chainId}`);

    if (market.chainId === null || market.chainId === undefined) {
      console.log('⚠️  Market has no chain ID, skipping on-chain resolution');
      return;
    }

    // Step 1: Close the market (stop trading)
    await this.closeMarket(market);

    // Step 2: Get AI decision on the outcome
    const decision = await this.getAIDecision(market);

    if (!decision) {
      console.log('❌ Failed to get AI decision, skipping resolution');
      // Just close the market, don't resolve it
      await this.storage.updateMarket(market.id, { status: 'closed' });
      return;
    }

    // If AI says invalid, skip resolution
    if (decision.outcome === 'invalid') {
      console.log('⚠️  AI determined market is invalid, skipping resolution');
      console.log(`   Reasoning: ${decision.reasoning}`);
      await this.storage.updateMarket(market.id, { status: 'closed' });
      return;
    }

    console.log(`🎯 AI Decision: ${decision.outcome.toUpperCase()}`);
    console.log(`   Confidence: ${decision.confidence}%`);
    console.log(`   Reasoning: ${decision.reasoning}`);

    // Step 3: Execute resolution on-chain and update database
    await this.executeResolution(market, decision.outcome, decision.reasoning);
  }

  /**
   * Close market on-chain (stop trading)
   */
  private async closeMarket(market: Market): Promise<void> {
    try {
      console.log('🔒 Closing market on-chain...');

      const hash = await this.walletClient.writeContract({
        address: CONTRACTS.MarketFactory,
        abi: MarketFactoryABI,
        functionName: 'closeMarket',
        args: [BigInt(market.chainId!)],
      });

      console.log(`✅ Market closed on-chain. Tx: ${hash}`);

      // Update database
      await this.storage.updateMarket(market.id, { status: 'closed' });

      // Wait for transaction to be confirmed before proceeding
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error('❌ Failed to close market:', error);
      throw error;
    }
  }

  /**
   * Get AI decision on market outcome using Claude
   */
  private async getAIDecision(market: Market): Promise<ResolutionDecision | null> {
    if (!this.anthropic) return null;

    try {
      console.log('🧠 Consulting AI oracle for decision...');

      const prompt = this.buildResolutionPrompt(market);

      const message = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more deterministic results
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
      return this.parseAIResponse(response.text);

    } catch (error) {
      console.error('❌ Failed to get AI decision:', error);
      return null;
    }
  }

  /**
   * Build the prompt for AI oracle
   */
  private buildResolutionPrompt(market: Market): string {
    const currentDate = new Date().toISOString().split('T')[0];

    return `You are an AI oracle responsible for determining the outcome of prediction markets with maximum accuracy and objectivity.

MARKET INFORMATION:
- Question: "${market.question}"
- Description: ${market.description || 'No additional description provided'}
- Category: ${market.category}
- Closing Time: ${market.closingTime}
- Created: ${market.createdAt}
- Current Date: ${currentDate}

YOUR TASK:
Determine whether this market should resolve to YES, NO, or INVALID based on:
1. Whether the event described in the question has occurred
2. Publicly verifiable information available as of ${currentDate}
3. The exact wording of the question

RESOLUTION GUIDELINES:
- YES: The event described has definitively occurred
- NO: The event described has definitively NOT occurred OR the deadline has passed without the event occurring
- INVALID: The question is ambiguous, impossible to verify, or contains errors that make resolution impossible

RESPONSE FORMAT (JSON only):
{
  "outcome": "yes" | "no" | "invalid",
  "confidence": <number 0-100>,
  "reasoning": "<detailed explanation of your decision>",
  "sources": ["<source1>", "<source2>", ...]
}

IMPORTANT:
- Be extremely careful with the exact wording of the question
- Consider the timeframe specified in the question
- If information cannot be verified, lean towards INVALID
- Provide detailed reasoning for your decision
- List any sources or facts you used to make the decision

Now, determine the outcome of this market:`;
  }

  /**
   * Parse AI response into structured decision
   */
  private parseAIResponse(response: string): ResolutionDecision | null {
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

      // Validate the response structure
      if (!parsed.outcome || !['yes', 'no', 'invalid'].includes(parsed.outcome)) {
        throw new Error('Invalid outcome in AI response');
      }

      return {
        outcome: parsed.outcome,
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || 'No reasoning provided',
        sources: parsed.sources || [],
      };

    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      console.error('Response:', response);
      return null;
    }
  }

  /**
   * Execute resolution on-chain and update database
   */
  private async executeResolution(
    market: Market,
    outcome: 'yes' | 'no',
    reasoning: string
  ): Promise<void> {
    try {
      // Map outcome to uint256 (0=YES, 1=NO)
      const outcomeMap = {
        yes: 0,
        no: 1,
      };

      const outcomeValue = outcomeMap[outcome];

      console.log(`⚡ Resolving market on-chain with outcome: ${outcome} (${outcomeValue})...`);

      // Execute on-chain resolution
      const hash = await this.walletClient.writeContract({
        address: CONTRACTS.MarketFactory,
        abi: MarketFactoryABI,
        functionName: 'resolveMarket',
        args: [BigInt(market.chainId!), BigInt(outcomeValue)],
      });

      console.log(`✅ Market resolved on-chain. Tx: ${hash}`);

      // Update database
      await this.storage.updateMarket(market.id, {
        status: outcome === 'invalid' ? 'invalid' : 'resolved',
        resolvedOutcome: outcomeValue,
        resolutionTime: new Date(),
      });

      console.log(`✅ Market ${market.id} resolved: ${outcome.toUpperCase()}`);
      console.log(`   Reasoning: ${reasoning}`);

    } catch (error) {
      console.error('❌ Failed to execute resolution:', error);
      throw error;
    }
  }

  /**
   * Start automated resolution scheduler
   */
  startAutoResolution(intervalMs: number = 300000): void {
    console.log(`🤖 Starting AI Oracle auto-resolution (checking every ${intervalMs / 1000}s)...`);

    // Run initial check
    this.checkAndResolveMarkets();

    // Schedule periodic checks
    setInterval(() => {
      this.checkAndResolveMarkets();
    }, intervalMs);
  }
}
