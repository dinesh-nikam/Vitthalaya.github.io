import { NextRequest, NextResponse } from 'next/server';
import { getNityanemData, PROHAR_DEFINITIONS, ProharId } from '@/src/services/nityanem-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proharParam = searchParams.get('prohar');
    const limitParam = searchParams.get('limit');

    let proharId: ProharId | undefined;
    if (proharParam) {
      if (proharParam in PROHAR_DEFINITIONS) {
        proharId = proharParam as ProharId;
      } else {
        return NextResponse.json(
          {
            error: `Invalid prohar parameter. Valid values: ${Object.keys(PROHAR_DEFINITIONS).join(', ')}`,
            code: 'INVALID_PROHAR',
          },
          { status: 400 }
        );
      }
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 8, 1), 50) : 8;

    const data = await getNityanemData(proharId, limit);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to get nityanem data:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve Nityanem data',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
