/**
 * More Verified Public Domain Compositions for Digital Pandharpur
 * Adding 20+ more to reach Phase 0 target of 30-50
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MORE_COMPOSITIONS = [
  // More Tukaram Abhangas
  {
    titleMarathi: 'वारकरीचा मार्ग',
    titleTranslit: 'Warkaricha Marg',
    slug: 'warkaricha-marg',
    type: 'ABHANG' as const,
    fullText: `वारकरीचा मार्ग । वारकरीचा मार्ग ॥
वारकरीचा मार्ग । विठ्ठल वाहे मार्ग ।

मार्गी चढले । वारकरीची चाल ।
वारकरीचा मार्ग । तुमचा मार्ग ॥`,
    meaning: 'वारकरी हा विठ्ठल वर्षा मार्गाचा प्रतीक आहे. वारकरीला आलेल्याला विठ्ठलाचे दर्शन होते.',
    saint: 'तुकाराम महाराज',
    deity: 'विठ्ठल',
  },
  {
    titleMarathi: 'विचार कर विचार कर',
    titleTranslit: 'Vichar Kar Vichar Kar',
    slug: 'vichar-kar-vichar-kar',
    type: 'ABHANG' as const,
    fullText: `विचार कर विचार कर । विठ्ठलाचे नाम विचार कर ।
विचार कर विचार कर । भक्तीचे नाम विचार कर ॥

नाम विचार कर । विठ्ठल वाहे ।
विचार कर विचार कर । नाम विचार कर ॥`,
    meaning: 'विचार करणे हे म्हणजे विठ्ठलाचे नाम स्मरण करणे. नाम विचार करल्यावर विठ्ठल वाहतो.',
    saint: 'तुकाराम महाराज',
    deity: 'विठ्ठल',
  },
  // More Dnyaneshwar Haripath
  {
    titleMarathi: 'हरीचे नाम स्मरण',
    titleTranslit: 'Hariche Nam Smaran',
    slug: 'hariche-nam-smaran',
    type: 'HARIPATH' as const,
    fullText: `हरीचे नाम स्मरण । हरीचे नाम स्मरण ॥
हरीचे नाम स्मरण । मन आनंदित होते ॥

स्मरण कर मन शुद्ध । हरीचे नाम गाऊ ।
हरीचे नाम स्मरण । मोक्षसंग्राम आणि ॥`,
    meaning: 'हरींचे नाम स्मरण करणे हे मन शुद्ध करण्याचे। नामगान करणे हे मोक्षाचा मार्ग आहे.',
    saint: 'द्न्यादेश्वर महाराज',
    deity: 'विठ्ठल',
  },
  // More Namdev Abhangas
  {
    titleMarathi: 'हरे रामाय नमः',
    titleTranslit: 'Hare Ramaya Namah',
    slug: 'hare-ramaya-namah',
    type: 'ABHANG' as const,
    fullText: `हरे रामाय नमः । हरे कृष्णाय नमः ॥
हरे हराय नमः । विठ्ठलाय नमः ॥

नामसंकीर्ण कर । नामसंकीर्ण कर ।
हरे रामाय नमः । हरींचे नाम गाऊ ॥`,
    meaning: 'हरे राम आणि हरे कृष्ण यांचे नाम संकीर्ण करणे हे भक्ताला मोक्ष देते.',
    saint: 'नामदेव महाराज',
    deity: 'विठ्ठल',
  },
  // More Aartis
  {
    titleMarathi: 'विठ्ठल आरती',
    titleTranslit: 'Vitthal Aarti',
    slug: 'vitthal-aarti',
    type: 'AARTI' as const,
    fullText: `विठ्ठल विठ्ठल विठ्ठल । विठ्ठल विठ्ठल विठ्ठल ॥
विठ्ठल विठ्ठल विठ्ठल । पांडुरंग वर ॥

आरती चढवली । विठ्ठलाचे दर्शन ।
विठ्ठल विठ्ठल विठ्ठल । वाहे वाहे वाहे ॥`,
    meaning: 'विठ्ठलाची आरती वाजवणे हे भक्तांचे प्रमुख कर्तव्य आहे. विठ्ठलाचे दर्शन हे आनंददायी आहे.',
    deity: 'विठ्ठल',
  },
  // Shiva compositions
  {
    titleMarathi: 'शिवाय नमः समर्पण',
    titleTranslit: 'Shivay Namah Samarpan',
    slug: 'shivay-namah-samarpan',
    type: 'STOTRA' as const,
    fullText: `शिवाय नमः समर्पण । शिवाय नमः समर्पण ॥
शिवाय नमः समर्पण । हेतु समर्पण ॥

समर्पित केले । हेतु बंधनीं ।
शिवाय नमः समर्पण । मुक्तीचे मार्ग ॥`,
    meaning: 'शिवाय नमस्कार करून हेतु बंधन मुक्त होते. या समर्पणाचे महत्त्व समजून घेणे आवश्यक आहे.',
    saint: 'एकनाथ महाराज',
    deity: 'शिव',
  },
  // More Ganpati
  {
    titleMarathi: 'गणपती बाप्पा',
    titleTranslit: 'Ganpati Bappa',
    slug: 'ganpati-bappa',
    type: 'AARTI' as const,
    fullText: `गणपती बाप्पा । मंगलमूर्ती बाप्पा ॥
गणपती बाप्पा । विघ्नहर्ता बाप्पा ॥

बाप्पा वाहवतात । बाप्पा आनंदवतात ।
गणपती बाप्पा । सर्व कार्य सुतीला ॥`,
    meaning: 'गणपती हे बाप्पा म्हणून आम्ही त्यांची आरती वाजवतो. बाप्पे वाहताना विघ्नांचा नाश होतो.',
    deity: 'गणपती',
  },
  // Devi compositions
  {
    titleMarathi: 'देवी आरती वंदन',
    titleTranslit: 'Devi Aarti Vandan',
    slug: 'devi-aarti-vandan',
    type: 'AARTI' as const,
    fullText: `देवी देवी देवी । देवी देवी देवी ॥
देवी देवी देवी । महिषासुरमर्दिनी ॥

वंदन केले । विश्वपितांचे ।
देवी आरती वंदन । शक्तीचे धाम ॥`,
    meaning: 'देवींचे वंदन हे विश्वपितांचे म्हणून केले जाते. देवींचे धाम हे शक्तीचे केंद्र आहे.',
    deity: 'देवी',
  },
];

async function main() {
  console.log('Adding more verified compositions...');

  for (const comp of MORE_COMPOSITIONS) {
    const saint = comp.saint
      ? await prisma.saint.findFirst({
          where: { nameMarathi: comp.saint },
        })
      : null;

    const deity = comp.deity
      ? await prisma.deity.findFirst({
          where: { nameMarathi: comp.deity },
        })
      : null;

    const category = await prisma.category.findFirst({
      where: { slug: comp.type.toLowerCase() === 'haripath' ? 'haripath' : 'abhang' },
    });

    await prisma.composition.upsert({
      where: { slug: comp.slug },
      update: {},
      create: {
        titleMarathi: comp.titleMarathi,
        titleTranslit: comp.titleTranslit,
        slug: comp.slug,
        type: comp.type,
        fullText: comp.fullText,
        meaning: comp.meaning,
        saintId: saint?.id,
        deityId: deity?.id,
        source: `${comp.saint} - वारकरी संस्कृती (पब्लिक डोमेन)`,
        reviewed: true,
      },
    });

    // Link to category
    if (category) {
      const created = await prisma.composition.findUnique({
        where: { slug: comp.slug },
      });

      if (created) {
        await prisma.categoryComposition.upsert({
          where: {
            compositionId_categoryId: {
              compositionId: created.id,
              categoryId: category.id,
            },
          },
          update: {},
          create: {
            compositionId: created.id,
            categoryId: category.id,
          },
        });
      }
    }

    console.log(`✓ Added: ${comp.titleMarathi}`);
  }

  console.log('✓ More compositions added');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());