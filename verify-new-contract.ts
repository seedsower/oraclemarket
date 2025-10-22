import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const MARKET_FACTORY = '0x04a93Cf6b5D573386A9d537B36117dBea56bD57c';

const ABI = [
  {
    inputs: [],
    name: "isInitialized",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "oracleToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "hybridAMM",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "oracleResolver",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "marketCounter",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MARKET_CREATION_FEE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_INITIAL_LIQUIDITY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function verifyContract() {
  console.log('Verifying MarketFactory at:', MARKET_FACTORY);
  console.log('');

  try {
    const isInitialized = await publicClient.readContract({
      address: MARKET_FACTORY as `0x${string}`,
      abi: ABI,
      functionName: 'isInitialized',
    });
    console.log('✓ Initialized:', isInitialized);

    if (isInitialized) {
      const oracleToken = await publicClient.readContract({
        address: MARKET_FACTORY as `0x${string}`,
        abi: ABI,
        functionName: 'oracleToken',
      });
      console.log('✓ Oracle Token:', oracleToken);

      const hybridAMM = await publicClient.readContract({
        address: MARKET_FACTORY as `0x${string}`,
        abi: ABI,
        functionName: 'hybridAMM',
      });
      console.log('✓ Hybrid AMM:', hybridAMM);

      const oracleResolver = await publicClient.readContract({
        address: MARKET_FACTORY as `0x${string}`,
        abi: ABI,
        functionName: 'oracleResolver',
      });
      console.log('✓ Oracle Resolver:', oracleResolver);
    }

    const owner = await publicClient.readContract({
      address: MARKET_FACTORY as `0x${string}`,
      abi: ABI,
      functionName: 'owner',
    });
    console.log('✓ Owner:', owner);

    const marketCounter = await publicClient.readContract({
      address: MARKET_FACTORY as `0x${string}`,
      abi: ABI,
      functionName: 'marketCounter',
    });
    console.log('✓ Market Counter:', marketCounter);

    const creationFee = await publicClient.readContract({
      address: MARKET_FACTORY as `0x${string}`,
      abi: ABI,
      functionName: 'MARKET_CREATION_FEE',
    });
    console.log('✓ Creation Fee:', Number(creationFee) / 1e18, 'ORACLE');

    const minLiquidity = await publicClient.readContract({
      address: MARKET_FACTORY as `0x${string}`,
      abi: ABI,
      functionName: 'MIN_INITIAL_LIQUIDITY',
    });
    console.log('✓ Min Liquidity:', Number(minLiquidity) / 1e18, 'ORACLE');

    console.log('\n✅ Contract verification complete!');

    if (!isInitialized) {
      console.log('\n⚠️  WARNING: Contract is NOT initialized!');
      console.log('   Run initialize() with:');
      console.log('   - oracleToken: 0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836');
      console.log('   - hybridAMM: 0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F');
      console.log('   - oracleResolver: 0x5fa6b2bf6e0047914b520619726417a6cBB942E4');
    }
  } catch (error) {
    console.error('❌ Error verifying contract:', error);
  }
}

verifyContract();
