import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const abi = [
  {
    inputs: [],
    name: 'isInitialized',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketCounter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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

async function main() {
  // Check if contract is initialized
  const isInitialized = await client.readContract({
    address: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40',
    abi,
    functionName: 'isInitialized',
  });

  console.log('Contract initialized:', isInitialized);

  if (!isInitialized) {
    console.log('❌ Contract is not initialized! No markets can exist.');
    return;
  }

  // Get market counter
  const marketCounter = await client.readContract({
    address: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40',
    abi,
    functionName: 'marketCounter',
  });

  console.log('Market counter:', marketCounter.toString());

  // Get all market IDs
  const marketIds = await client.readContract({
    address: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40',
    abi,
    functionName: 'getAllMarketIds',
  });

  console.log('Total markets on-chain:', marketIds.length);

  for (let i = 0; i < marketIds.length; i++) {
    const marketId = marketIds[i];
    try {
      const market = await client.readContract({
        address: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40',
        abi,
        functionName: 'getMarket',
        args: [marketId],
      });
      console.log(`\nMarket ID ${marketId}:`);
      console.log('  Title:', market.title);
      console.log('  Category:', market.category);
      console.log('  Status:', market.status);
      console.log('  Liquidity:', market.liquidity.toString());
    } catch (error) {
      console.log(`Market ${marketId}: Error fetching -`, error instanceof Error ? error.message : 'unknown');
    }
  }
}

main().catch(console.error);
