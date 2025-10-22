import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const NEW_MARKET_FACTORY = '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40';
const HYBRID_AMM = '0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055';

const MARKET_FACTORY_ABI = [
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

const HYBRID_AMM_ABI = [
  {
    inputs: [],
    name: "marketFactory",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function verifySetup() {
  console.log('🔍 Verifying Complete System Setup\n');
  console.log('='.repeat(60));

  try {
    // Check MarketFactory
    console.log('\n📝 MarketFactory:', NEW_MARKET_FACTORY);
    console.log('-'.repeat(60));

    const isInitialized = await publicClient.readContract({
      address: NEW_MARKET_FACTORY as `0x${string}`,
      abi: MARKET_FACTORY_ABI,
      functionName: 'isInitialized',
    });
    console.log('✓ Initialized:', isInitialized);

    if (isInitialized) {
      const oracleToken = await publicClient.readContract({
        address: NEW_MARKET_FACTORY as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: 'oracleToken',
      });
      console.log('✓ Oracle Token:', oracleToken);

      const hybridAMM = await publicClient.readContract({
        address: NEW_MARKET_FACTORY as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: 'hybridAMM',
      });
      console.log('✓ Hybrid AMM:', hybridAMM);

      const oracleResolver = await publicClient.readContract({
        address: NEW_MARKET_FACTORY as `0x${string}`,
        abi: MARKET_FACTORY_ABI,
        functionName: 'oracleResolver',
      });
      console.log('✓ Oracle Resolver:', oracleResolver);

      // Check if hybridAMM matches expected
      if (hybridAMM.toLowerCase() !== HYBRID_AMM.toLowerCase()) {
        console.log('\n⚠️  WARNING: HybridAMM mismatch!');
        console.log('   Expected:', HYBRID_AMM);
        console.log('   Got:', hybridAMM);
      }
    }

    const owner = await publicClient.readContract({
      address: NEW_MARKET_FACTORY as `0x${string}`,
      abi: MARKET_FACTORY_ABI,
      functionName: 'owner',
    });
    console.log('✓ Owner:', owner);

    const marketCounter = await publicClient.readContract({
      address: NEW_MARKET_FACTORY as `0x${string}`,
      abi: MARKET_FACTORY_ABI,
      functionName: 'marketCounter',
    });
    console.log('✓ Market Counter:', marketCounter.toString());

    const creationFee = await publicClient.readContract({
      address: NEW_MARKET_FACTORY as `0x${string}`,
      abi: MARKET_FACTORY_ABI,
      functionName: 'MARKET_CREATION_FEE',
    });
    console.log('✓ Creation Fee:', Number(creationFee) / 1e18, 'ORACLE');

    const minLiquidity = await publicClient.readContract({
      address: NEW_MARKET_FACTORY as `0x${string}`,
      abi: MARKET_FACTORY_ABI,
      functionName: 'MIN_INITIAL_LIQUIDITY',
    });
    console.log('✓ Min Liquidity:', Number(minLiquidity) / 1e18, 'ORACLE');

    // Check HybridAMM
    console.log('\n📊 HybridAMM:', HYBRID_AMM);
    console.log('-'.repeat(60));

    const ammMarketFactory = await publicClient.readContract({
      address: HYBRID_AMM as `0x${string}`,
      abi: HYBRID_AMM_ABI,
      functionName: 'marketFactory',
    });
    console.log('✓ Points to MarketFactory:', ammMarketFactory);

    if (ammMarketFactory.toLowerCase() === NEW_MARKET_FACTORY.toLowerCase()) {
      console.log('✅ HybridAMM correctly configured!');
    } else {
      console.log('⚠️  HybridAMM points to different MarketFactory!');
      console.log('   Expected:', NEW_MARKET_FACTORY);
      console.log('   Got:', ammMarketFactory);
      console.log('\n   Run: npx tsx update-hybridamm-factory.ts');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (isInitialized && ammMarketFactory.toLowerCase() === NEW_MARKET_FACTORY.toLowerCase()) {
      console.log('✅ SYSTEM READY! All contracts properly configured.');
      console.log('\n📋 Next Steps:');
      console.log('   1. Update frontend config.ts with new addresses');
      console.log('   2. Restart dev server');
      console.log('   3. Create a test market');
      console.log('   4. Try trading!');
    } else {
      console.log('⚠️  CONFIGURATION INCOMPLETE');
      if (!isInitialized) {
        console.log('   • MarketFactory needs initialization');
      }
      if (ammMarketFactory.toLowerCase() !== NEW_MARKET_FACTORY.toLowerCase()) {
        console.log('   • HybridAMM needs to be updated to point to new MarketFactory');
      }
    }

  } catch (error) {
    console.error('\n❌ Error verifying setup:', error);
  }
}

verifySetup();
