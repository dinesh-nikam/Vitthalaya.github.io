/**
 * Find unexplored Wikisource categories.
 */
const api = 'https://mr.wikisource.org/w/api.php';

async function getSubcategories(category: string): Promise<string[]> {
  const subs: string[] = [];
  let cmContinue: string | undefined;
  do {
    const params = new URLSearchParams({
      action: 'query', format: 'json', list: 'categorymembers',
      cmtitle: `Category:${category}`, cmlimit: '500', cmtype: 'subcat',
      ...(cmContinue ? { cmcontinue: cmContinue } : {}),
    });
    const url = `${api}?${params}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Vitthalaya/1.0' } });
    const data = await res.json() as any;
    for (const m of (data?.query?.categorymembers ?? [])) {
      subs.push(m.title.replace('Category:', ''));
    }
    cmContinue = data?.continue?.cmcontinue;
    await new Promise(r => setTimeout(r, 300));
  } while (cmContinue);
  return subs;
}

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

async function main() {
  console.log('=== धार्मिक साहित्य subcategories ===');
  const subs = await getSubcategories('धार्मिक साहित्य');
  for (const s of subs) {
    const count = await getCategoryPages(s);
    console.log(`  ${s}: ${count.length} pages`);
  }
  console.log();

  // Also check भूपाळी content
  console.log('=== भूपाळी pages ===');
  const bhupali = await getCategoryPages('भूपाळी');
  for (const p of bhupali) {
    console.log(`  ${p}`);
  }
}
main().catch(console.error);
