import { diffLines, diffWords } from '../src/lib/diff';

function runDiffTests() {
  console.log('🧪 Starting LCS Diff Engine Verification...\n');

  // --- Test 1: Line Diffing ---
  console.log('Test 1: Line-by-Line Difference Comparison');
  const oldLines = `विठ्ठल आवड प्रेमाचा ठेवा,
  सकळ देवांचा देवरावो।
  माउली ज्ञानेश्वर माउली।`;
  const newLines = `विठ्ठल आवड प्रेमाचा ठेवा,
  सकळ देवांचा देवरावो।
  माउली ज्ञानेश्वर माउली महाराज।
  अतिरिक्त ओळ।`;

  try {
    const lineDiffs = diffLines(oldLines, newLines);
    console.log('  - Line comparison output chunks:');
    lineDiffs.forEach((chunk) => {
      const typeChar = chunk.type === 'added' ? '+' : chunk.type === 'removed' ? '-' : ' ';
      console.log(`    [${typeChar}] "${chunk.value.trim()}"`);
    });

    const hasAddedLine = lineDiffs.some((c) => c.type === 'added' && c.value.includes('अतिरिक्त ओळ'));
    const hasUnchangedLine = lineDiffs.some((c) => c.type === 'unchanged' && c.value.includes('देवरावो'));
    const hasModifiedLine = lineDiffs.some((c) => c.type === 'added' && c.value.includes('महाराज'));

    console.log(`  - Detected added line: [${hasAddedLine ? '✓' : '✗'}]`);
    console.log(`  - Detected unchanged line: [${hasUnchangedLine ? '✓' : '✗'}]`);
    console.log(`  - Detected modified line changes: [${hasModifiedLine ? '✓' : '✗'}]`);

    if (hasAddedLine && hasUnchangedLine && hasModifiedLine) {
      console.log('✅ Line diffing tests passed!\n');
    } else {
      console.error('❌ Line diffing validation failed!\n');
    }
  } catch (err) {
    console.error('❌ Line diffing crashed:', err, '\n');
  }

  // --- Test 2: Word Diffing ---
  console.log('Test 2: Word-by-Word Difference Comparison');
  const oldWords = 'पांडुरंग विठ्ठल विठोबा';
  const newWords = 'पांडुरंग हरी विठ्ठल';

  try {
    const wordDiffs = diffWords(oldWords, newWords);
    console.log('  - Word comparison output chunks:');
    wordDiffs.forEach((chunk) => {
      const typeChar = chunk.type === 'added' ? '+' : chunk.type === 'removed' ? '-' : ' ';
      if (chunk.value.trim().length > 0) {
        console.log(`    [${typeChar}] "${chunk.value}"`);
      }
    });

    const hasAddedWord = wordDiffs.some((c) => c.type === 'added' && c.value === 'हरी');
    const hasRemovedWord = wordDiffs.some((c) => c.type === 'removed' && c.value === 'विठोबा');
    const hasUnchangedWord = wordDiffs.some((c) => c.type === 'unchanged' && c.value === 'पांडुरंग');

    console.log(`  - Detected added word: [${hasAddedWord ? '✓' : '✗'}]`);
    console.log(`  - Detected removed word: [${hasRemovedWord ? '✓' : '✗'}]`);
    console.log(`  - Detected unchanged word: [${hasUnchangedWord ? '✓' : '✗'}]`);

    if (hasAddedWord && hasRemovedWord && hasUnchangedWord) {
      console.log('✅ Word diffing tests passed!\n');
    } else {
      console.error('❌ Word diffing validation failed!\n');
    }
  } catch (err) {
    console.error('❌ Word diffing crashed:', err, '\n');
  }

  console.log('🏁 Verification process complete.');
}

runDiffTests();
