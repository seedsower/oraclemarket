import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const HYBRID_AMM = '0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F';

const ABI = [
  {
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "initialLiquidity", type: "uint256" },
    ],
    name: "createMarketPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function checkHybridAMM() {
  console.log('Checking HybridAMM at:', HYBRID_AMM);
  console.log('');

  try {
    // Try to get contract code
    const code = await publicClient.getBytecode({ address: HYBRID_AMM as `0x${string}` });

    if (!code || code === '0x') {
      console.log('❌ HybridAMM contract not deployed at this address!');
      console.log('   This is why market creation is failing.');
      console.log('');
      console.log('   The MarketFactory is trying to call HybridAMM.createMarketPool()');
      console.log('   but there is no contract at', HYBRID_AMM);
    } else {
      console.log('✅ HybridAMM contract exists');
      console.log('   Bytecode length:', code.length);
    }
  } catch (error) {
    console.error('❌ Error checking HybridAMM:', error);
  }
}

checkHybridAMM();
