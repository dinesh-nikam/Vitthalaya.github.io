import { preprocessImage, runOcr } from '../src/lib/ocr';
import { submitToModeration, submitPeerVote } from '../src/lib/moderation-workflow';
import { db } from '../src/db/client';
import { hashPassword } from '../src/lib/auth';

async function runAcquisitionTests() {
  console.log('🧪 Starting Content Acquisition Pipeline Verification...\n');

  // --- Step 1: Image Preprocessing ---
  console.log('Step 1: Sharp Image Preprocessing & Grayscale/Binarization');
  // Generate a mock 1x1 pixel red GIF buffer
  const mockImageBuffer = Buffer.from(
    'R0lGODlhAQABAIAAAAD/AP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  try {
    const preprocessed = await preprocessImage(mockImageBuffer);
    console.log(`  - Original buffer size: ${mockImageBuffer.length} bytes`);
    console.log(`  - Preprocessed buffer size: ${preprocessed.length} bytes`);
    console.log('✅ Image preprocessing tests passed!\n');
  } catch (err) {
    console.error('❌ Image preprocessing failed:', err, '\n');
  }

  // --- Step 2: OCR Extractor ---
  console.log('Step 2: Devanagari OCR Text Extraction');
  try {
    const text = await runOcr(mockImageBuffer, 'paddleocr');
    console.log('  - Extracted Marathi text snippet:');
    console.log(`    "${text.split('\n')[1] || text}"`);
    const isMarathi = /[\u0900-\u097F]/.test(text); // Check if contains Devanagari characters
    console.log(`  - Contains Devanagari script: [${isMarathi ? '✓' : '✗'}]`);
    if (isMarathi) {
      console.log('✅ OCR extraction tests passed!\n');
    } else {
      console.error('❌ OCR extraction tests failed (No Devanagari matched)!\n');
    }
  } catch (err) {
    console.error('❌ OCR extraction crashed:', err, '\n');
  }

  // --- Step 3: State Machine & Consensus Verification ---
  console.log('Step 3: 3-Tier Moderation State Machine Transitions');
  try {
    // 1. Prepare/fetch mock users
    let volunteer = await db.user.findFirst({ where: { email: 'volunteer@warkari.org' } });
    if (!volunteer) {
      volunteer = await db.user.create({
        data: {
          email: 'volunteer@warkari.org',
          name: 'स्वयंसेवक वारकरी',
          password: hashPassword('volunteer123'),
          role: 'USER',
          reputationScore: 50,
        },
      });
    }

    let reviewer1 = await db.user.findFirst({ where: { email: 'reviewer1@warkari.org' } });
    if (!reviewer1) {
      reviewer1 = await db.user.create({
        data: {
          email: 'reviewer1@warkari.org',
          name: 'समीक्षक १',
          password: hashPassword('reviewer123'),
          role: 'USER',
          reputationScore: 150,
        },
      });
    }

    let reviewer2 = await db.user.findFirst({ where: { email: 'reviewer2@warkari.org' } });
    if (!reviewer2) {
      reviewer2 = await db.user.create({
        data: {
          email: 'reviewer2@warkari.org',
          name: 'समीक्षक २',
          password: hashPassword('reviewer123'),
          role: 'USER',
          reputationScore: 200,
        },
      });
    }

    let reviewer3 = await db.user.findFirst({ where: { email: 'reviewer3@warkari.org' } });
    if (!reviewer3) {
      reviewer3 = await db.user.create({
        data: {
          email: 'reviewer3@warkari.org',
          name: 'समीक्षक ३',
          password: hashPassword('reviewer123'),
          role: 'USER',
          reputationScore: 250,
        },
      });
    }

    // 2. Submit manuscript to moderation queue
    const draftTitle = `OCR Test Abhang ${Date.now()}`;
    const draftText = `।। विठ्ठल अभंग ।।
    हाचि योग आमुचा विठोबा चरणी,
    अखंड जपो तुझे नाम देवा रात्रदिनी।`;
    
    const upload = await db.manuscriptUpload.create({
      data: {
        volunteerId: volunteer.id,
        imageUrl: '/uploads/mock-test.png',
        status: 'pending',
      },
    });

    const queueId = await submitToModeration(
      'ocr',
      upload.id,
      draftTitle,
      draftText,
      'Meaning of the abhang.'
    );
    console.log(`  - Upload submitted to Moderation Queue. Queue ID: ${queueId}`);

    // Wait briefly for Tier 1 AI classification check
    await new Promise((resolve) => setTimeout(resolve, 1000));

    let queueItem = await db.moderationQueue.findUnique({ where: { id: queueId } });
    console.log(`  - After Tier 1 check: Tier = ${queueItem?.tier}, Status = ${queueItem?.status}`);

    // Verify it promoted to Tier 2
    if (queueItem?.tier !== 2) {
      throw new Error(`AI checking did not promote queue item to Tier 2. Current tier: ${queueItem?.tier}`);
    }

    // 3. Submit reviews to trigger peer consensus (+3 approvals)
    console.log('  - Submitting peer reviews...');
    await submitPeerVote(reviewer1.id, queueId, 'approve', 'Looking good.');
    await submitPeerVote(reviewer2.id, queueId, 'approve', 'Spelling is correct.');
    await submitPeerVote(reviewer3.id, queueId, 'approve', 'Verified matching print edition.');

    // Check status after consensus
    queueItem = await db.moderationQueue.findUnique({ where: { id: queueId } });
    console.log(`  - After Peer Consensus: Tier = ${queueItem?.tier}, Status = ${queueItem?.status}`);

    if (queueItem?.status !== 'approved') {
      throw new Error(`State machine did not approve queue item after 3 votes. Status: ${queueItem?.status}`);
    }

    // 4. Verify record successfully created in the Composition table
    const createdComp = await db.composition.findFirst({
      where: { titleMarathi: draftTitle },
    });

    if (createdComp) {
      console.log(`  - Promoted Composition: "${createdComp.titleMarathi}" (Slug: ${createdComp.slug}) [✓]`);
      console.log('✅ 3-Tier Moderation state transitions passed!\n');
    } else {
      throw new Error('Approved composition was not created in the database.');
    }

    // Cleanup test data
    await db.moderationReview.deleteMany({ where: { queueId } });
    await db.moderationQueue.delete({ where: { id: queueId } });
    await db.manuscriptUpload.delete({ where: { id: upload.id } });
    if (createdComp) {
      await db.composition.delete({ where: { id: createdComp.id } });
    }
  } catch (err) {
    console.error('❌ Moderation state transitions failed:', err, '\n');
  }

  console.log('🏁 Content Acquisition pipeline tests finished.');
}

runAcquisitionTests().catch((err) => {
  console.error('Fatal test execution crashed:', err);
  process.exit(1);
});
