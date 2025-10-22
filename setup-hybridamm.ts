import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
config({ path: resolve(__dirname, 'server', '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in server/.env file');
  process.exit(1);
}

// Add 0x prefix if missing
const formattedKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(formattedKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http()
});

const addresses = {
  MarketFactory: '0xEB5546fc9d78188a1d905F9fa54957a42f43ed8c',
  HybridAMM: '0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F',
};

async function setupHybridAMM() {
  console.log('Setting up HybridAMM...\n');
  console.log('Account:', account.address);
  console.log('HybridAMM:', addresses.HybridAMM);
  console.log('');

  // Check current marketFactory
  const checkAbi = parseAbi(['function marketFactory() view returns (address)']);
  const currentFactory = await publicClient.readContract({
    address: addresses.HybridAMM as `0x${string}`,
    abi: checkAbi,
    functionName: 'marketFactory',
  });

  console.log('Current marketFactory:', currentFactory);

  if (currentFactory !== '0x0000000000000000000000000000000000000000') {
    console.log('✅ HybridAMM already has marketFactory set!');
    return;
  }

  console.log('');
  console.log('Setting MarketFactory address...');

  const abi = parseAbi([
    'function setMarketFactory(address _factory) external',
  ]);

  try {
    const hash = await walletClient.writeContract({
      address: addresses.HybridAMM as `0x${string}`,
      abi,
      functionName: 'setMarketFactory',
      args: [addresses.MarketFactory as `0x${string}`],
    });

    console.log('✅ Transaction submitted!');
    console.log('Hash:', hash);
    console.log('');
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ HybridAMM setup successful!');
      console.log('Block:', receipt.blockNumber.toString());

      // Verify
      const newFactory = await publicClient.readContract({
        address: addresses.HybridAMM as `0x${string}`,
        abi: checkAbi,
        functionName: 'marketFactory',
      });

      console.log('');
      console.log('Verified marketFactory:', newFactory);
    } else {
      console.log('❌ Transaction failed');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

setupHybridAMM();
