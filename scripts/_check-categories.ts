/**
 * Quick check of new Wikisource categories we haven't crawled.
 */
const api = 'https://mr.wikisource.org/w/api.php';

async function getCategoryPages(category: string): Promise<string[]> {
  const pages: string[] = [];
  let cmContinue: string | undefined;
  do {
    const params = new URLSearchParams({
      action: 'query', format: 'json', list: 'categorymembers',
      cmtitle: `Category:${category}`, cmlimit: '500', cmtype: 'page',
      ...(cmContinue ? { cmcontinue: cmContinue } : {}),
    });
    const url = `${api}?${params}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Vitthalaya/1.0' } });
    const data = await res.json() as any;
    for (const m of (data?.query?.categorymembers ?? [])) {
      if (m.ns === 0) pages.push(m.title);
    }
    cmContinue = data?.continue?.cmcontinue;
    await new Promise(r => setTimeout(r, 300));
  } while (cmContinue);
  return pages;
}

const categories = [
  'भूपाळी',
  'श्लोक',
  'पदे',     // already done in earlier session
  'भजन',
  'स्तोत्र',
  'अभंग',
];

for (const cat of categories) {
  try {
    const pages = await getCategoryPages(cat);
    console.log(`${cat}: ${pages.length} pages`);
  } catch {
    console.log(`${cat}: ERROR`);
  }
  await new Promise(r => setTimeout(r, 500));
}
