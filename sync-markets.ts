import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { storage } from './server/storage';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const CONTRACTS = {
  MarketFactory: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40' as const,
};

const MarketFactoryABI = [
  {
    inputs: [],
    name: 'getAllMarketIds',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
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
  }
] as const;

const STATUS_MAP = {
  0: 'active',
  1: 'closed',
  2: 'resolved',
  3: 'invalid',
} as const;

async function syncAllMarkets() {
  try {
    console.log('🔄 Fetching all market IDs from blockchain...');

    const marketIds = await client.readContract({
      address: CONTRACTS.MarketFactory,
      abi: MarketFactoryABI,
      functionName: 'getAllMarketIds',
    });

    console.log(`📊 Found ${marketIds.length} markets on-chain`);

    for (const chainId of marketIds) {
      try {
        console.log(`\n🔍 Processing market with chain ID ${chainId}...`);

        // Check if already exists in database
        const existingMarkets = await storage.getMarkets({});
        const existingMarket = existingMarkets.find(m => m.chainId === Number(chainId));

        if (existingMarket) {
          console.log(`  ⏭️  Market ${existingMarket.id} already exists in database, skipping...`);
          continue;
        }

        // Fetch market data from blockchain
        const onChainMarket = await client.readContract({
          address: CONTRACTS.MarketFactory,
          abi: MarketFactoryABI,
          functionName: 'getMarket',
          args: [chainId],
        });

        const status = STATUS_MAP[onChainMarket.status as keyof typeof STATUS_MAP] || 'active';
        const closingTime = new Date(Number(onChainMarket.endTime) * 1000);
        const createdAt = new Date(Number(onChainMarket.createdAt) * 1000);

        // Create market in database
        const newMarket = await storage.createMarket({
          chainId: Number(chainId),
          question: onChainMarket.title,
          description: onChainMarket.description || null,
          category: onChainMarket.category as any,
          marketType: 'binary',
          outcomes: ['Yes', 'No'],
          creatorAddress: onChainMarket.creator,
          yesProbability: '0.5',
          yesPrice: '0.5',
          noPrice: '0.5',
          closingTime,
          status: status as any,
          resolutionSource: 'manual',
          resolvedOutcome: onChainMarket.status === 2 ? Number(onChainMarket.resolvedOutcome) : null,
          resolutionTime: onChainMarket.status === 2 ? new Date() : null,
          isLive: true,
        });

        console.log(`  ✅ Market synced to database: ${newMarket.id}`);
        console.log(`     Title: ${onChainMarket.title}`);
        console.log(`     Status: ${status}`);
        console.log(`     Chain ID: ${chainId}`);
      } catch (error) {
        console.error(`  ❌ Failed to sync market ${chainId}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n✅ Market sync complete!');
    const allMarkets = await storage.getMarkets({});
    console.log(`📊 Total markets in database: ${allMarkets.length}`);

  } catch (error) {
    console.error('❌ Failed to sync markets:', error);
    throw error;
  }
}

syncAllMarkets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
