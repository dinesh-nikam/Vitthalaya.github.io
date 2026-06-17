import { NextRequest, NextResponse } from 'next/server';
import { processAIQuery } from '@/src/lib/ai-retrieval';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'कृपया वैध प्रश्न द्या' },
        { status: 400 }
      );
    }

    // Process query using retrieval from existing corpus
    const response = await processAIQuery(query);

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'एकत्रिकरणाच्या वेळी त्रुटी आढळली' },
      { status: 500 }
    );
  }
}