import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { db } from '@/src/db/client';

/**
 * GET /api/addresses
 * Returns all addresses for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();

    if (!body.fullName || !body.phone || !body.line1 || !body.city || !body.state || !body.postalCode) {
      return NextResponse.json({ error: 'Required fields: fullName, phone, line1, city, state, postalCode' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await db.address.create({
      data: {
        userId,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Address id required' }, { status: 400 });
    }

    // Verify address ownership
    const address = await db.address.findUnique({ where: { id } });
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }
    if (address.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.address.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete address:', err);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}

