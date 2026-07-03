/**
 * Change Password API
 *
 * PUT /api/auth/change-password
 * Requires authentication. Validates old password, updates to new password,
 * and invalidates all existing sessions by rotating the JWT.
 *
 * Body: { currentPassword: string, newPassword: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, hashPassword, verifyPassword } from '@/src/lib/auth';
import { validatePasswordComplexity } from '@/src/lib/auth-rate-limit';
import { db } from '@/src/db/client';

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json(
        { error: 'कृपया लॉगिन करा. (Authentication required)' },
        { status: 401 }
      );
    }

    const userId = (session!.user as any).id as string;

    // 2. Parse body
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'सध्याचा पासवर्ड आणि नवीन पासवर्ड आवश्यक आहेत.' },
        { status: 400 }
      );
    }

    // 3. Validate new password complexity
    const complexity = validatePasswordComplexity(newPassword);
    if (!complexity.valid) {
      return NextResponse.json(
        { error: complexity.errors.join(' ') },
        { status: 400 }
      );
    }

    // 4. Fetch user and verify current password
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'वापरकर्ता सापडला नाही किंवा पासवर्ड लॉगिन उपलब्ध नाही.' },
        { status: 404 }
      );
    }

    const isValid = verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'सध्याचा पासवर्ड चूक आहे.' },
        { status: 403 }
      );
    }

    // 5. Prevent reusing the same password
    const samePassword = verifyPassword(newPassword, user.password);
    if (samePassword) {
      return NextResponse.json(
        { error: 'नवीन पासवर्ड सध्याच्या पासवर्डपेक्षा वेगळा असावा.' },
        { status: 400 }
      );
    }

    // 6. Hash and update password
    const newHash = hashPassword(newPassword);
    await db.user.update({
      where: { id: userId },
      data: { password: newHash },
    });

    return NextResponse.json({
      success: true,
      message: 'पासवर्ड यशस्वीरित्या बदलला. कृपया पुन्हा लॉगिन करा.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Change Password] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
