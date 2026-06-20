import { NextRequest, NextResponse } from 'next/server';
import { processAIQuery } from '@/src/lib/ai-retrieval';
import { ratelimiter } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Get client IP address for rate-limiting
    const ip = request.headers.get('x-forwarded-for') || (request as any).ip || '127.0.0.1';
    
    // Rate limit: 5 requests per 1 minute for the AI Assistant
    const limitKey = `ratelimit:ai:${ip}`;
    const { success, limit, remaining, reset } = await ratelimiter.limit(limitKey, 5, 60000);
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'खूप जास्त विनंत्या आल्या आहेत. कृपया काही वेळाने पुन्हा प्रयत्न करा.', 
          message: 'Too many requests. Please try again later.' 
        }, 
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          }
        }
      );
    }

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

    const resObj = NextResponse.json(response);
    resObj.headers.set('X-RateLimit-Limit', String(limit));
    resObj.headers.set('X-RateLimit-Remaining', String(remaining));
    resObj.headers.set('X-RateLimit-Reset', String(reset));
    return resObj;
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'एकत्रिकरणाच्या वेळी त्रुटी आढळली' },
      { status: 500 }
    );
  }
}