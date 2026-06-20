async function main() {
  console.log('Fetching suggestions from local dev server...');
  try {
    const res = await fetch('http://localhost:3000/api/search/suggest?q=vitthal');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Suggestions:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching suggestions:', err);
  }

  console.log('\nFetching search results from local dev server...');
  try {
    const res = await fetch('http://localhost:3000/api/search?q=vitthal');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Search Results count:', data.results?.length);
    console.log('First result:', JSON.stringify(data.results?.[0], null, 2));
  } catch (err) {
    console.error('Error fetching search:', err);
  }
}

main();
