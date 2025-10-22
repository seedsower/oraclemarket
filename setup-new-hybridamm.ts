import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, 'server', '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY not found in server/.env');
}

const formattedKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(formattedKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const NEW_HYBRID_AMM = '0xBb2e5a0CDd8c81fFF755Af3745455Afd50A48055';
const CURRENT_MARKET_FACTORY = '0x04a93Cf6b5D573386A9d537B36117dBea56bD57c';

const ABI = [
  {
    inputs: [{ name: "_marketFactory", type: "address" }],
    name: "setMarketFactory",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "marketFactory",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function setupHybridAMM() {
  console.log('Setting up HybridAMM at:', NEW_HYBRID_AMM);
  console.log('With MarketFactory:', CURRENT_MARKET_FACTORY);
  console.log('From account:', account.address);
  console.log('');

  try {
    // First check current marketFactory setting
    const currentFactory = await publicClient.readContract({
      address: NEW_HYBRID_AMM as `0x${string}`,
      abi: ABI,
      functionName: 'marketFactory',
    });

    console.log('Current marketFactory in HybridAMM:', currentFactory);

    if (currentFactory === CURRENT_MARKET_FACTORY) {
      console.log('✅ Already configured correctly!');
      return;
    }

    console.log('Setting marketFactory...');

    const hash = await walletClient.writeContract({
      address: NEW_HYBRID_AMM as `0x${string}`,
      abi: ABI,
      functionName: 'setMarketFactory',
      args: [CURRENT_MARKET_FACTORY as `0x${string}`],
    });

    console.log('Transaction hash:', hash);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ HybridAMM configured successfully!');
      console.log('Block:', receipt.blockNumber);

      // Verify
      const newFactory = await publicClient.readContract({
        address: NEW_HYBRID_AMM as `0x${string}`,
        abi: ABI,
        functionName: 'marketFactory',
      });

      console.log('');
      console.log('Verification:');
      console.log('  MarketFactory address:', newFactory);
      console.log('  Expected:', CURRENT_MARKET_FACTORY);
      console.log('  Match:', newFactory === CURRENT_MARKET_FACTORY ? '✅' : '❌');
    } else {
      console.log('❌ Transaction failed');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupHybridAMM();
