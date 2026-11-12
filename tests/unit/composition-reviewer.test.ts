import { describe, it, expect } from 'bun:test';
import {
  extractCanonicalOpeningLine,
  isProseStory,
  extractEmbeddedMeaning,
  detectMudrikaSaint,
  transliterateDevanagariToLatin,
  analyzeComposition,
  generateCompositionFixPlan,
  analyzeDailyFeature,
  type CompositionCandidate,
  type DailyFeatureCandidate,
} from '@/src/services/composition-reviewer.service';

describe('Composition Reviewer Service', () => {
  describe('extractCanonicalOpeningLine', () => {
    it('extracts the canonical first line from an abhang with dandas', () => {
      const text =
        'थुरकात थुरकत चालतु । राधिकेचे गळां मिठी घालितु ।तयेसी चुंबन आवडी देतु । पाहतां यशोदेसी मग रडतु ॥१॥';
      const firstLine = extractCanonicalOpeningLine(text);
      expect(firstLine).toBe('थुरकात थुरकत चालतु');
    });

    it('cleans off standard invocation headers before finding the first line', () => {
      const text =
        '॥ श्रीसद्गुरुरामचंद्राय नमः ॥\nकौसल्येचे डोहाळे : पूर्वकथेचे अनुसंधान । कौसल्यें उघडिले नयन ॥ १ ॥';
      const firstLine = extractCanonicalOpeningLine(text);
      expect(firstLine).toBe('पूर्वकथेचे अनुसंधान');
    });

    it('strips leading numbers or bullet markers', () => {
      const text = '१. नामपाठें संदेह सर्व हा जाईल । चित्त स्थिर राहील ॥ १ ॥';
      const firstLine = extractCanonicalOpeningLine(text);
      expect(firstLine).toBe('नामपाठें संदेह सर्व हा जाईल');
    });

    it('returns null for empty or non-Devanagari text', () => {
      expect(extractCanonicalOpeningLine('')).toBeNull();
      expect(extractCanonicalOpeningLine('1234567890')).toBeNull();
    });
  });

  describe('isProseStory', () => {
    it('identifies narrative Marathi prose story phrasing as story', () => {
      const storyText =
        'भगवान श्रीकृष्ण मोठ्या डाम डौलाने चालत असतां, राधेच्या गळ्याला मिठी घालून, मोठ्या आवडीने तिला चुंबन देत असता, यशोदेस पाहिल्या बरोबर रडू लागले.';
      expect(isProseStory(storyText)).toBe(true);
    });

    it('identifies dialogue prose markers', () => {
      const storyText = 'राधा यशोदेस म्हणाली सासूबाई ऐका याचा चेंडू माझ्याजवळ नाही.';
      expect(isProseStory(storyText)).toBe(true);
    });

    it('does not classify sacred poetic verse as story', () => {
      const verse =
        'थुरकात थुरकत चालतु । राधिकेचे गळां मिठी घालितु ।\nतयेसी चुंबन आवडी देतु । पाहतां यशोदेसी मग रडतु ॥१॥';
      expect(isProseStory(verse)).toBe(false);
    });
  });

  describe('extractEmbeddedMeaning', () => {
    it('extracts verse and meaning when separated by अर्थ:', () => {
      const text =
        'स्वभावें कीर्तन करितां । एवढा लाभु होये तत्वतां । या तुझिये मुखींच्या कथा गातां । आपणियां देता तूं होशी\nअर्थ: स्वभावाने कीर्तन करताना एवढा लाभ होतो.';
      const res = extractEmbeddedMeaning(text);
      expect(res.verse).toBe(
        'स्वभावें कीर्तन करितां । एवढा लाभु होये तत्वतां । या तुझिये मुखींच्या कथा गातां । आपणियां देता तूं होशी',
      );
      expect(res.meaning).toBe('स्वभावाने कीर्तन करताना एवढा लाभ होतो.');
    });

    it('extracts verse and meaning when separated by भावार्थ:', () => {
      const text =
        'जे का रंजले गांजले । त्यांसी म्हणे जो आपुले ॥\nभावार्थ: जो दुःखी-कष्टी लोकांना आपले मानतो तोच खरा साधू.';
      const res = extractEmbeddedMeaning(text);
      expect(res.verse).toBe('जे का रंजले गांजले । त्यांसी म्हणे जो आपुले ॥');
      expect(res.meaning).toBe('जो दुःखी-कष्टी लोकांना आपले मानतो तोच खरा साधू.');
    });

    it('returns original text if no meaning separator is present', () => {
      const pureVerse = 'तुज रूप चिती राहो । तुज चरण रमाठी राहो ॥';
      const res = extractEmbeddedMeaning(pureVerse);
      expect(res.verse).toBe(pureVerse);
      expect(res.meaning).toBeNull();
    });
  });

  describe('detectMudrikaSaint', () => {
    it('detects Sant Eknath from "एका जनार्दनीं"', () => {
      const text = 'एका जनार्दनीं भाव न कळे निर्धारीं । लाजोनी ती राधा आली आपुले घरीं ॥५॥';
      const mudrika = detectMudrikaSaint(text);
      expect(mudrika?.saintSlug).toBe('eknath-maharaj');
      expect(mudrika?.saintNameMarathi).toBe('एकनाथ महाराज');
    });

    it('detects Sant Tukaram from "तुका म्हणे"', () => {
      const text = 'तुका म्हणे आतां । मज ठाव द्यावा संतां ॥';
      const mudrika = detectMudrikaSaint(text);
      expect(mudrika?.saintSlug).toBe('sant-tukaram');
      expect(mudrika?.saintNameMarathi).toBe('संत तुकाराम');
    });

    it('detects Sant Dnyaneshwar from "बापरखुमादेविवरू"', () => {
      const text = 'ज्ञानदेव म्हणे बापरखुमादेविवरू । विठ्ठल सुखाचा आगरू ॥';
      const mudrika = detectMudrikaSaint(text);
      expect(mudrika?.saintSlug).toBe('sant-dnyaneshwar');
    });
  });

  describe('transliterateDevanagariToLatin', () => {
    it('transliterates Marathi words into readable Latin title', () => {
      const translit = transliterateDevanagariToLatin('थुरकात थुरकत चालतु');
      expect(translit).toBe('Thurakat Thurakat Chalatu');
    });
  });

  describe('analyzeComposition', () => {
    it('flags generic scraper title and embedded meaning', () => {
      const comp: CompositionCandidate = {
        id: 'test-1',
        titleMarathi: 'संत एकनाथ गाथा अभंग क्रमांक ८२',
        fullText:
          'थुरकात थुरकत चालतु । राधिकेचे गळां मिठी घालितु ॥१॥\nअर्थ: श्रीकृष्ण राधेचा चेंडू घेऊन पळू लागले.',
        meaning: null,
        saintNameMarathi: 'एकनाथ महाराज',
      };

      const issues = analyzeComposition(comp);
      expect(issues.some((i) => i.type === 'GENERIC_SCRAPER_TITLE')).toBe(true);
      expect(issues.some((i) => i.type === 'EMBEDDED_MEANING')).toBe(true);

      const plan = generateCompositionFixPlan(comp, issues);
      expect(plan).not.toBeNull();
      expect(plan?.newTitleMarathi).toBe('थुरकात थुरकत चालतु');
      expect(plan?.newFullText).toBe('थुरकात थुरकत चालतु । राधिकेचे गळां मिठी घालितु ॥१॥');
      expect(plan?.newMeaning).toBe('श्रीकृष्ण राधेचा चेंडू घेऊन पळू लागले.');
      expect(plan?.newAlternateTitles).toContain('संत एकनाथ गाथा अभंग क्रमांक ८२');
    });
  });

  describe('analyzeDailyFeature', () => {
    it('flags daily abhang feature when body holds story/meaning instead of verse', () => {
      const feature: DailyFeatureCandidate = {
        id: 'daily-abhang-18',
        slot: 'ABHANG',
        titleMarathi: 'संत एकनाथ गाथा अभंग क्रमांक ८२',
        bodyMarathi:
          'भगवान श्रीकृष्ण मोठ्या डाम डौलाने चालत असतां, राधेच्या गळ्याला मिठी घालून, मोठ्या आवडीने तिला चुंबन देत असता, यशोदेस पाहिल्या बरोबर रडू लागले.',
        compositionId: 'comp-82',
        composition: {
          id: 'comp-82',
          titleMarathi: 'संत एकनाथ गाथा अभंग क्रमांक ८२',
          fullText: 'थुरकात थुरकत चालतु । राधिकेचे गळां मिठी घालितु ॥१॥',
          meaning:
            'भगवान श्रीकृष्ण मोठ्या डाम डौलाने चालत असतां, राधेच्या गळ्याला मिठी घालून, मोठ्या आवडीने तिला चुंबन देत असता, यशोदेस पाहिल्या बरोबर रडू लागले.',
          saint: { nameMarathi: 'एकनाथ महाराज' },
        },
      };

      const issues = analyzeDailyFeature(feature);
      expect(issues.some((i) => i.type === 'STORY_IN_ABHANG')).toBe(true);
      expect(issues.some((i) => i.type === 'GENERIC_SCRAPER_TITLE')).toBe(true);
    });
  });
});
