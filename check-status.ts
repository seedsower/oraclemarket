import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

const marketFactory = '0xEB5546fc9d78188a1d905F9fa54957a42f43ed8c';

async function checkStatus() {
  console.log('Checking MarketFactory status...\n');

  // Check owner
  try {
    const ownerAbi = parseAbi(['function owner() view returns (address)']);
    const owner = await client.readContract({
      address: marketFactory as `0x${string}`,
      abi: ownerAbi,
      functionName: 'owner',
    });
    console.log('Owner:', owner);
  } catch (e: any) {
    console.log('Owner check failed:', e.shortMessage);
  }

  // Check oracleToken
  try {
    const tokenAbi = parseAbi(['function oracleToken() view returns (address)']);
    const token = await client.readContract({
      address: marketFactory as `0x${string}`,
      abi: tokenAbi,
      functionName: 'oracleToken',
    });
    console.log('OracleToken:', token);
  } catch (e: any) {
    console.log('OracleToken check failed:', e.shortMessage);
  }

  // Check hybridAMM
  try {
    const ammAbi = parseAbi(['function hybridAMM() view returns (address)']);
    const amm = await client.readContract({
      address: marketFactory as `0x${string}`,
      abi: ammAbi,
      functionName: 'hybridAMM',
    });
    console.log('HybridAMM:', amm);
  } catch (e: any) {
    console.log('HybridAMM check failed:', e.shortMessage);
  }

  // Check oracleResolver
  try {
    const resolverAbi = parseAbi(['function oracleResolver() view returns (address)']);
    const resolver = await client.readContract({
      address: marketFactory as `0x${string}`,
      abi: resolverAbi,
      functionName: 'oracleResolver',
    });
    console.log('OracleResolver:', resolver);
  } catch (e: any) {
    console.log('OracleResolver check failed:', e.shortMessage);
  }
}

checkStatus();
