import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'ईमेल आणि ओटीपी आवश्यक आहेत.' },
        { status: 400 }
      );
    }

    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'चुकीचा ओटीपी किंवा ईमेल.' },
        { status: 400 }
      );
    }

    if (new Date() > verificationToken.expires) {
      // Clean up expired token
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token,
          },
        },
      });

      return NextResponse.json(
        { error: 'ओटीपीची मुदत संपली आहे. कृपया नवीन ओटीपी मागवा.' },
        { status: 400 }
      );
    }

    // Update user to verified
    await db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Delete used verification token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    return NextResponse.json(
      { message: 'ईमेल पडताळणी यशस्वी झाली!' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'ईमेल पडताळणी करताना तांत्रिक अडचण आली.' },
      { status: 500 }
    );
  }
}
