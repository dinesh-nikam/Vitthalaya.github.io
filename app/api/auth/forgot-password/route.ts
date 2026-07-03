import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'ईमेल पत्ता आवश्यक आहे.' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    // Security practice: Return success even if user doesn't exist
    if (!user) {
      return NextResponse.json(
        { message: 'जर हा ईमेल आमच्याकडे नोंदणीकृत असेल, तर आम्ही पासवर्ड रिसेट लिंक पाठवली आहे.' },
        { status: 200 }
      );
    }

    // Generate token (OTP/uuid)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Save to VerificationToken table
    // Delete any existing tokens for this email first to prevent clutter
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    console.log(`\n==========================================`);
    console.log(`🔑 [EMAIL LOG] Password Recovery Link`);
    console.log(`To: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`==========================================\n`);

    return NextResponse.json(
      {
        message: 'पासवर्ड रिसेट लिंक पाठवली आहे. कृपया ईमेल तपासा.',
        ...(process.env.NODE_ENV !== 'production' ? { devToken: token, devLink: resetLink } : {}),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'पासवर्ड रिसेट विनंती पूर्ण करताना तांत्रिक अडचण आली.' },
      { status: 500 }
    );
  }
}
