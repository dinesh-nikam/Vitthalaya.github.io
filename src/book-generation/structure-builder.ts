/**
 * Book Structure Builder — generates AI-driven contextual content
 * (preface, saint biographies, section intros) for a curated composition
 * selection.
 */

import type { BookContent, BookSection, CuratedSelection } from './types';

// ── Template Helpers ──────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('mr', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generatePreface(selection: CuratedSelection): string {
  const total = selection.stats.included;
  const saintCount = Object.keys(selection.stats.bySaint).length;
  const dateStr = formatDate(new Date());

  return `या संग्रहात एकूण ${total} रचनांचा समावेश आहे.
या रचना ${saintCount} संतांच्या वाणीतून निवडल्या गेल्या आहेत.
हा संग्रह ${dateStr} रोजी डिजिटल पंढरपूर मंचाद्वारे निर्माण करण्यात आला.

प्रत्येक रचनेची निवड त्याच्या आध्यात्मिक महत्त्वानुसार, ऐतिहासिक
मूल्यानुसार आणि वैविध्यपूर्ण संतपरंपरेच्या प्रतिनिधित्वासाठी करण्यात आली आहे.

— डिजिटल पंढरपूर`;
}

function generateSaintBioText(saintName: string): string {
  return `${saintName} यांची रचना वैष्णव संत परंपरेतील अमूल्य ठेवा आहे.
त्यांच्या अभंगातून वारकरी संप्रदायाचा आध्यात्मिक संदेश
लोकांपर्यंत पोहोचला आहे.`;
}

function generateSectionIntro(section: BookSection, counts: Record<string, number>): string {
  const count = counts[section.type] ?? 0;
  return `या विभागात ${count} रचना समाविष्ट आहेत. प्रत्येक रचना
या परंपरेतील भक्तिरसाचे दर्शन घडवते.`;
}

// ── Main Builder ──────────────────────────────────────────────────────────────

export function buildStructure(selection: CuratedSelection): BookContent {
  // 1. Build sections with descriptions
  const sections: BookSection[] = selection.sections.map((s) => ({
    ...s,
    description: generateSectionIntro(s, selection.stats.byType),
  }));

  // 2. Collect unique saint names for bios
  const saintBios = new Map<string, boolean>();
  for (const comp of selection.compositions) {
    if (comp.saintName && !saintBios.has(comp.saintName)) {
      saintBios.set(comp.saintName, true);
    }
  }

  // Generate saint biography text
  const saintBiography = Array.from(saintBios.keys())
    .map((name) => `${name}\n${"-".repeat(name.length)}\n${generateSaintBioText(name)}`)
    .join('\n\n');

  const preface = generatePreface(selection);

  return {
    preface,
    saintBiography: saintBiography || undefined,
    historicalContext: 'वारकरी संप्रदाय हा महाराष्ट्रातील भक्ती परंपरेचा महत्त्वाचा भाग आहे. संत ज्ञानेश्वर, तुकाराम, नामदेव, एकनाथ आणि इतर अनेक संतांनी या परंपरेची मशाल पेटवून ठेवली.',
    sections,
    afterword: 'हा संग्रह डिजिटल पंढरपूरच्या वतीने भाविकांसाठी तयार करण्यात आला आहे. यातील सर्व रचना मुक्त स्रोतांमधून संग्रहित केल्या गेल्या आहेत.',
  };
}
