import { searchCompositions } from '../src/lib/search-client';

async function main() {
  console.log('Searching for "vitthal"...');
  const results = await searchCompositions('vitthal');
  console.log('Results count:', results.length);
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.titleMarathi} (${r.titleTranslit})`);
  });
  
  console.log('\nSearching for "विठ्ठल"...');
  const resultsMarathi = await searchCompositions('विठ्ठल');
  console.log('Results count:', resultsMarathi.length);
  resultsMarathi.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.titleMarathi} (${r.titleTranslit})`);
  });
}

main().catch(console.error);
