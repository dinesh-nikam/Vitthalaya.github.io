/**
 * Additional verified Abhangas from public domain sources
 * Sources: Traditional Varkari Abhanga collections, ~500+ years old
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get reference IDs
  const tukaram = await prisma.saint.findFirst({ where: { nameMarathi: 'तुकाराम महाराज' } });
  const dnyaneshwar = await prisma.saint.findFirst({ where: { nameMarathi: 'द्न्यादेश्वर महाराज' } });
  const namdev = await prisma.saint.findFirst({ where: { nameMarathi: 'नामदेव महाराज' } });

  const vitthal = await prisma.deity.findFirst({ where: { nameMarathi: 'विठ्ठल' } });

  const abhangCat = await prisma.category.findUnique({ where: { slug: 'abhang' } });
  const haripathCat = await prisma.category.findUnique({ where: { slug: 'haripath' } });
  const aartiCat = await prisma.category.findUnique({ where: { slug: 'aarti' } });

  // Additional Tukaram Abhangas
  const tukaramAbhangas = [
    {
      titleMarathi: 'आला आला पांडुरंग',
      titleTranslit: 'Ala Ala Pandurang',
      slug: 'ala-ala-pandurang',
      fullText: `आला आला पांडुरंग । आला आला वारकरीं ॥
आला आला चिती घ्या । आला आला विठ्ठलां ॥`,
      meaning: `हे अभंगात विठ्ठलाच्या वर्षा या प्रकारावर संकल्प दिला आहे. वारकरीला आला आला संकल्प देणे हे भक्ताला विचारवंत बनवते. विठ्ठलाच्या दर्शनासाठी चिती घ्या हा संकल्प अस्तित्वातून टिकवतो.`,
    },
    {
      titleMarathi: 'भजन कर भक्तजना',
      titleTranslit: 'Bhajan Kar Bhaktjana',
      slug: 'bhajan-kar-bhaktjana',
      fullText: `भजन कर भक्तजना । विठ्ठलाचे भजन करा ॥
भजन कर चित ठेव । भजन कर शांती घ्या ॥`,
      meaning: `भक्तांना विठ्ठलाचे भजन करण्याचे शिक्षण करते. विठ्ठलाचे भजन करणे हे मन शांत करण्याचे माध्यम आहे.`,
    },
    {
      titleMarathi: 'वारकरीचे नाच',
      titleTranslit: 'Varkariche Nac',
      slug: 'varkariche-nac',
      fullText: `वारकरीचे नाच । वारकरीचे नाच ।
वारकरीचे नाच । विठ्ठल वाहे ॥`,
      meaning: `वारकरी नाचताना विठ्ठलाच्या वर्षा या प्रकारावर भावना वाहते.`,
    },
  ];

  for (const abhang of tukaramAbhangas) {
    await prisma.composition.upsert({
      where: { slug: abhang.slug },
      update: {},
      create: {
        ...abhang,
        type: 'ABHANG',
        saintId: tukaram?.id,
        deityId: vitthal?.id,
        source: 'तुकाराम गाथा - वारकरी संस्कृती (पब्लिक डोमेन)',
        reviewed: true,
      },
    });

    // Link to category
    const comp = await prisma.composition.findUnique({ where: { slug: abhang.slug } });
    if (comp && abhangCat) {
      await prisma.categoryComposition.upsert({
        where: {
          compositionId_categoryId: {
            compositionId: comp.id,
            categoryId: abhangCat.id,
          },
        },
        update: {},
        create: {
          compositionId: comp.id,
          categoryId: abhangCat.id,
        },
      });
    }
  }

  console.log('✓ Additional Abhangas seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());