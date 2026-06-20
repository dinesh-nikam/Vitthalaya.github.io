import sharp from 'sharp';

/**
 * Preprocesses manuscript images for OCR
 * - Auto-orients based on EXIF tag metadata
 * - Converts to grayscale to reduce color noise
 * - Applies a threshold-based binarization filter (pure black and white) to sharpen text strokes
 */
export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate() // auto-orient
      .greyscale() // grayscale conversion
      .threshold(130) // binarization
      .toBuffer();
  } catch (err) {
    console.error('Failed to preprocess image, returning original buffer:', err);
    return buffer;
  }
}

/**
 * Runs OCR on the image buffer
 * Connects to Google Cloud Vision API if credentials are provided.
 * In production, does NOT fall back to mock data to prevent fake devotional content.
 */
export async function runOcr(buffer: Buffer, engine = 'paddleocr'): Promise<string> {
  const gcvKey = process.env.GOOGLE_VISION_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!gcvKey && isProduction) {
    throw new Error('OCR_SERVICE_UNAVAILABLE: Google Vision API key required for production OCR processing');
  }

  if (gcvKey && engine === 'google_vision') {
    try {
      const base64Image = buffer.toString('base64');
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${gcvKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION' }],
              imageContext: { languageHints: ['mr', 'hi'] } // Hint Marathi and Hindi
            }
          ]
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Vision API returned status ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const textAnnotation = data.responses?.[0]?.fullTextAnnotation?.text;

      if (textAnnotation) {
        return textAnnotation;
      }

      throw new Error('Google Vision returned no text annotation');
    } catch (err: any) {
      // In production, propagate the error rather than falling back
      if (isProduction) {
        throw new Error(`OCR_PROCESSING_FAILED: ${err.message || String(err)}`);
      }
      console.warn('Google Vision OCR failed in development. Using placeholder:', err);
      return '[OCR_PENDING] - Development mode placeholder text';
    }
  }

  // Development-only: No mock Marathi text - return clear placeholder
  if (isProduction) {
    throw new Error('OCR_SERVICE_UNAVAILABLE: No OCR engine configured. Set GOOGLE_VISION_API_KEY in production.');
  }

  return '[OCR_PENDING] - विकास क्लष्म आधी OCR सक्षम करा';
}