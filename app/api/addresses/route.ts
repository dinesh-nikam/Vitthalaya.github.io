import { NextResponse } from 'next/server';
import { db } from '../../../src/db/client';

/**
 * GET /api/addresses
 * Returns all addresses for the current user (or empty list).
 */
export async function GET() {
  try {
    // Phase 2: Replace with authenticated user from session
    const userId = ''; // placeholder — requires auth integration

    if (!userId) {
      return NextResponse.json([]);
    }

    const addresses = await db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(addresses);
  } catch (err) {
    console.error('Failed to fetch addresses:', err);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

/**
 * POST /api/addresses
 * Creates a new address for the current user.
 *
 * Body: { fullName, phone, line1, line2?, city, state, postalCode, label?, isDefault? }
 */
export async function POST(request: Request) {
  try {
    // Phase 2: Replace with authenticated user
    const userId = ''; // placeholder

    const body = await request.json();

    if (!body.fullName || !body.phone || !body.line1 || !body.city || !body.state || !body.postalCode) {
      return NextResponse.json({ error: 'Required fields: fullName, phone, line1, city, state, postalCode' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (body.isDefault && userId) {
      await db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await db.address.create({
      data: {
        userId: userId || null,
        label: body.label,
        fullName: body.fullName,
        phone: body.phone,
        line1: body.line1,
        line2: body.line2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country ?? 'IN',
        isDefault: body.isDefault ?? false,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (err) {
    console.error('Failed to create address:', err);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

/**
 * DELETE /api/addresses?id=<id>
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address id required' }, { status: 400 });
    }

    await db.address.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete address:', err);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
