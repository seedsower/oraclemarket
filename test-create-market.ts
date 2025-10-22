import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, 'server', '.env') });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found');
  process.exit(1);
}

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
};

async function testCreateMarket() {
  console.log('Testing market creation...\n');
  console.log('Account:', account.address);

  // Check token balance
  const tokenAbi = parseAbi(['function balanceOf(address) view returns (uint256)']);
  const balance = await publicClient.readContract({
    address: addresses.OracleToken as `0x${string}`,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [account.address],
  });

  console.log('ORACLE balance:', (Number(balance) / 1e18).toFixed(2));

  // Check allowance
  const allowanceAbi = parseAbi(['function allowance(address,address) view returns (uint256)']);
  const allowance = await publicClient.readContract({
    address: addresses.OracleToken as `0x${string}`,
    abi: allowanceAbi,
    functionName: 'allowance',
    args: [account.address, addresses.MarketFactory as `0x${string}`],
  });

  console.log('Allowance:', (Number(allowance) / 1e18).toFixed(2));

  if (Number(allowance) < 110e18) {
    console.log('\n⚠️  Need to approve tokens first!');
    console.log('Approving 1000 ORACLE...');

    const approveAbi = parseAbi(['function approve(address,uint256) returns (bool)']);
    const hash = await walletClient.writeContract({
      address: addresses.OracleToken as `0x${string}`,
      abi: approveAbi,
      functionName: 'approve',
      args: [addresses.MarketFactory as `0x${string}`, parseEther('1000')],
    });

    console.log('Approval tx:', hash);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ Approved!\n');
  }

  // Try to create market
  console.log('Creating test market...');

  const marketAbi = parseAbi([
    'function createMarket(string,string,string,uint256,uint256) returns (uint256)',
  ]);

  const futureTime = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60); // 1 week from now
  const initialLiquidity = parseEther('100');

  try {
    const hash = await walletClient.writeContract({
      address: addresses.MarketFactory as `0x${string}`,
      abi: marketAbi,
      functionName: 'createMarket',
      args: [
        'Will this test work?',
        'Testing market creation',
        'Politics',
        futureTime,
        initialLiquidity,
      ],
    });

    console.log('✅ Transaction submitted!');
    console.log('Hash:', hash);
    console.log('\nWaiting for confirmation...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log('🎉 Market created successfully!');
      console.log('Block:', receipt.blockNumber.toString());
    } else {
      console.log('❌ Transaction failed');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.shortMessage || error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.shortMessage || error.cause.message);
    }
  }
}

testCreateMarket();
