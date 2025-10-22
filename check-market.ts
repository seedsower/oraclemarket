import { apiRequest } from './client/src/lib/queryClient';

async function checkMarket() {
  try {
    const response = await fetch('http://localhost:5000/api/markets/60d0bdfa-5dc4-4939-b77d-9c48a2b03e6d');
    const market = await response.json();

    console.log('Market Details:');
    console.log('ID:', market.id);
    console.log('Chain ID:', market.chainId);
    console.log('Question:', market.question);
    console.log('Created At:', market.createdAt);
    console.log('');

    if (market.chainId === null || market.chainId === undefined) {
      console.log('❌ This is an OLD market created before chainId was added.');
      console.log('✅ Create a NEW market through the UI to test trading.');
    } else {
      console.log('✅ This market has chainId:', market.chainId);
      console.log('   You can trade on this market.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMarket();
