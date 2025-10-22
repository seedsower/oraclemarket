import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const CONTRACTS = {
  MarketFactory: '0x05F36C4B28Ed7bA63465d8A1e3A42919106E3d40' as const,
  OracleToken: '0xE3f7bD9A5dEED21CbdDA5089a44De3938D81c836' as const,
};

const WALLET = '0x960496F21c55724b83F9cC55fB6eFCD87200C250' as const;

const OracleTokenABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const MarketFactoryABI = [
  {
    inputs: [],
    name: 'marketCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  console.log('🔍 Checking ORACLE token balance...');
  console.log(`   Wallet: ${WALLET}`);
  console.log(`   Token: ${CONTRACTS.OracleToken}`);

  try {
    const balance = await publicClient.readContract({
      address: CONTRACTS.OracleToken,
      abi: OracleTokenABI,
      functionName: 'balanceOf',
      args: [WALLET],
    });

    const balanceInTokens = Number(balance) / 1e18;
    console.log(`✅ Balance: ${balance.toString()} wei`);
    console.log(`✅ Balance: ${balanceInTokens} ORACLE tokens`);
  } catch (error) {
    console.error('❌ Failed to read balance:', error);
  }

  console.log('\n🔍 Checking MarketFactory marketCount...');
  console.log(`   Contract: ${CONTRACTS.MarketFactory}`);

  try {
    const marketCount = await publicClient.readContract({
      address: CONTRACTS.MarketFactory,
      abi: MarketFactoryABI,
      functionName: 'marketCount',
    });

    console.log(`✅ Market Count: ${marketCount.toString()}`);
  } catch (error) {
    console.error('❌ Failed to read marketCount:', error);
  }
}

main();
