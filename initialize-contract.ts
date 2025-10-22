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
  OracleToken: '0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836',
  HybridAMM: '0xB9d59Eb5F16Cf8660fc8855cF64Dfb1c2dB76E7F',
  // For now, we'll use the MarketFactory address as a placeholder for OracleResolver
  // You can deploy a proper OracleResolver later and re-initialize if needed
  OracleResolver: '0x5fa6b2bf6e0047914b520619726417a6cBB942E4', // Using owner address as placeholder
};

async function initializeMarketFactory() {
  console.log('Initializing MarketFactory...\n');
  console.log('Account:', account.address);
  console.log('MarketFactory:', addresses.MarketFactory);
  console.log('');

  // Try to check if already initialized (may fail if not public)
  try {
    const checkAbi = parseAbi(['function hybridAMM() public view returns (address)']);
    const currentHybridAMM = await publicClient.readContract({
      address: addresses.MarketFactory as `0x${string}`,
      abi: checkAbi,
      functionName: 'hybridAMM',
    });

    if (currentHybridAMM && currentHybridAMM !== '0x0000000000000000000000000000000000000000') {
      console.log('✅ Contract is already initialized!');
      console.log('Current hybridAMM:', currentHybridAMM);
      return;
    }
  } catch (e) {
    console.log('Could not check initialization status, proceeding...');
  }

  console.log('\nCalling initialize() with:');
  console.log('  oracleToken:', addresses.OracleToken);
  console.log('  hybridAMM:', addresses.HybridAMM);
  console.log('  oracleResolver:', addresses.OracleResolver);
  console.log('');

  const abi = parseAbi([
    'function initialize(address _oracleToken, address _hybridAMM, address _oracleResolver) external',
  ]);

  try {
    const hash = await walletClient.writeContract({
      address: addresses.MarketFactory as `0x${string}`,
      abi,
      functionName: 'initialize',
      args: [
        addresses.OracleToken as `0x${string}`,
        addresses.HybridAMM as `0x${string}`,
        addresses.OracleResolver as `0x${string}`,
      ],
    });

    console.log('✅ Transaction submitted!');
    console.log('Hash:', hash);
    console.log('');
    console.log('Waiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('✅ Initialization successful!');
      console.log('Block:', receipt.blockNumber.toString());

      // Verify
      const newHybridAMM = await publicClient.readContract({
        address: addresses.MarketFactory as `0x${string}`,
        abi: checkAbi,
        functionName: 'hybridAMM',
      });

      console.log('');
      console.log('Verified hybridAMM:', newHybridAMM);
      console.log('');
      console.log('🎉 MarketFactory is now ready to create markets!');
    } else {
      console.log('❌ Transaction failed');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

initializeMarketFactory();
