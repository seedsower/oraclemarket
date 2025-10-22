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

const MARKET_FACTORY = '0x04a93Cf6b5D573386A9d537B36117dBea56bD57c';
const ORACLE_TOKEN = '0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836';
const HYBRID_AMM = '0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F';
const ORACLE_RESOLVER = '0x5fa6b2bf6e0047914b520619726417a6cBB942E4';

const ABI = [
  {
    inputs: [
      { name: "_oracleToken", type: "address" },
      { name: "_hybridAMM", type: "address" },
      { name: "_oracleResolver", type: "address" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function initialize() {
  console.log('Initializing MarketFactory at:', MARKET_FACTORY);
  console.log('From account:', account.address);
  console.log('');
  console.log('Parameters:');
  console.log('  Oracle Token:', ORACLE_TOKEN);
  console.log('  Hybrid AMM:', HYBRID_AMM);
  console.log('  Oracle Resolver:', ORACLE_RESOLVER);
  console.log('');

  try {
    const hash = await walletClient.writeContract({
      address: MARKET_FACTORY as `0x${string}`,
      abi: ABI,
      functionName: 'initialize',
      args: [
        ORACLE_TOKEN as `0x${string}`,
        HYBRID_AMM as `0x${string}`,
        ORACLE_RESOLVER as `0x${string}`,
      ],
    });

    console.log('Transaction hash:', hash);
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ Contract initialized successfully!');
      console.log('Block:', receipt.blockNumber);
      console.log('Gas used:', receipt.gasUsed.toString());
    } else {
      console.log('❌ Transaction failed');
    }
  } catch (error) {
    console.error('❌ Error initializing contract:', error);
  }
}

initialize();
