import { createPublicClient, http, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { IStorage } from './storage';

const CONTRACTS = {
  MarketFactory: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40' as const,
};

const MarketFactoryABI = [
  {
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
    ],
    name: 'MarketClosed',
    type: 'event',
  },
  {
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true },
      { name: 'outcome', type: 'uint256', indexed: false },
    ],
    name: 'MarketResolved',
    type: 'event',
  },
  {
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'getMarket',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'totalVolume', type: 'uint256' },
          { name: 'liquidity', type: 'uint256' },
          { name: 'resolvedOutcome', type: 'uint256' },
        ],
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const STATUS_MAP = {
  0: 'active',
  1: 'closed',
  2: 'resolved',
  3: 'invalid',
} as const;

export class MarketSyncService {
  private storage: IStorage;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async resolvePositions(marketId: string, outcome: number) {
    try {
      console.log(`💰 Resolving positions for market ${marketId}, outcome=${outcome}`);

      // Get all open positions for this market
      const allPositions = await this.storage.getPositions({});
      const marketPositions = allPositions.filter(p => p.marketId === marketId && p.status === 'open');

      for (const position of marketPositions) {
        // Determine if position won
        const outcomeString = outcome === 0 ? 'yes' : 'no';
        const won = position.outcome === outcomeString;

        // Calculate payout: winners get their shares as payout, losers get 0
        const shares = Number(position.shares);
        const payout = won ? shares : 0;
        const totalCost = Number(position.totalCost);
        const realizedPnL = payout - totalCost;

        await this.storage.updatePosition(position.id, {
          status: 'closed',
          realizedPnL: realizedPnL.toString(),
          closedAt: new Date(),
        });

        console.log(`✅ Position ${position.id} resolved: ${won ? 'WON' : 'LOST'}, payout=${payout}, PnL=${realizedPnL.toFixed(2)}`);

        // Update user stats
        const userStats = await this.storage.getUserStats(position.userAddress);
        if (userStats) {
          const currentPnL = Number(userStats.totalPnL || 0);
          await this.storage.updateUserStats(position.userAddress, {
            totalPnL: (currentPnL + realizedPnL).toString(),
          });
        }
      }

      console.log(`✅ Resolved ${marketPositions.length} positions for market ${marketId}`);
    } catch (error) {
      console.error(`❌ Failed to resolve positions for market ${marketId}:`, error);
    }
  }

  async syncMarketFromChain(marketId: string, chainId: number) {
    try {
      console.log(`🔄 Syncing market ${marketId} (chainId: ${chainId}) from blockchain...`);

      // Fetch market data from blockchain
      const onChainMarket = await publicClient.readContract({
        address: CONTRACTS.MarketFactory,
        abi: MarketFactoryABI,
        functionName: 'getMarket',
        args: [BigInt(chainId)],
      });

      const status = STATUS_MAP[onChainMarket.status as keyof typeof STATUS_MAP] || 'active';
      const resolvedOutcome = onChainMarket.status === 2 ? Number(onChainMarket.resolvedOutcome) : null;

      // Update backend database
      await this.storage.updateMarket(marketId, {
        status,
        resolvedOutcome,
        resolutionTime: status === 'resolved' ? new Date() : null,
      });

      // If market is now resolved, update all positions
      if (status === 'resolved' && resolvedOutcome !== null) {
        await this.resolvePositions(marketId, resolvedOutcome);
      }

      console.log(`✅ Market ${marketId} synced: status=${status}, outcome=${resolvedOutcome}`);

      return { status, resolvedOutcome };
    } catch (error) {
      console.error(`❌ Failed to sync market ${marketId}:`, error);
      throw error;
    }
  }

  async syncAllMarkets() {
    try {
      const markets = await this.storage.getMarkets({});

      for (const market of markets) {
        if (market.chainId !== null && market.chainId !== undefined) {
          // Only sync markets that might have changed (not already resolved)
          if (market.status !== 'resolved' && market.status !== 'invalid') {
            try {
              await this.syncMarketFromChain(market.id, market.chainId);
              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Failed to sync market ${market.id}:`, error);
              // Continue with other markets
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to sync all markets:', error);
    }
  }

  startAutoSync(intervalMs: number = 30000) {
    if (this.isRunning) {
      console.log('⚠️ Market sync already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting market auto-sync (every ${intervalMs / 1000}s)...`);

    // Initial sync
    this.syncAllMarkets();

    // Schedule periodic syncs
    this.syncInterval = setInterval(() => {
      this.syncAllMarkets();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      console.log('⏹️ Market auto-sync stopped');
    }
  }

  async watchMarketEvents(fromBlock: bigint = BigInt(0)) {
    console.log('👀 Watching for market events...');

    publicClient.watchEvent({
      address: CONTRACTS.MarketFactory,
      events: MarketFactoryABI,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: MarketFactoryABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'MarketClosed') {
              const chainId = Number(decoded.args.marketId);
              console.log(`🔒 MarketClosed event: chainId=${chainId}`);

              // Find market by chainId and update status
              const markets = await this.storage.getMarkets({});
              const market = markets.find(m => m.chainId === chainId);
              if (market) {
                await this.storage.updateMarket(market.id, { status: 'closed' });
                console.log(`✅ Updated market ${market.id} to closed`);
              }
            } else if (decoded.eventName === 'MarketResolved') {
              const chainId = Number(decoded.args.marketId);
              const outcome = Number(decoded.args.outcome);
              console.log(`✅ MarketResolved event: chainId=${chainId}, outcome=${outcome}`);

              // Find market by chainId and update
              const markets = await this.storage.getMarkets({});
              const market = markets.find(m => m.chainId === chainId);
              if (market) {
                await this.storage.updateMarket(market.id, {
                  status: 'resolved',
                  resolvedOutcome: outcome,
                  resolutionTime: new Date(),
                });
                console.log(`✅ Updated market ${market.id} to resolved with outcome ${outcome}`);
              }
            }
          } catch (error) {
            console.error('Error processing event:', error);
          }
        }
      },
    });
  }
}
