import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { hashPassword } from '@/src/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: 'ईमेल, टोकन आणि नवीन पासवर्ड आवश्यक आहेत.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'पासवर्ड किमान ६ अक्षरांचा असावा.' },
        { status: 400 }
      );
    }

    // Verify token exists and is valid
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'पासवर्ड रिसेट करण्याची विनंती अवैध आहे किंवा टोकन चुकीचे आहे.' },
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
        { error: 'पासवर्ड रिसेट टोकनची मुदत संपली आहे. कृपया नवीन रिसेट विनंती करा.' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = hashPassword(password);

    // Update user password and clear any lockout
    await db.user.update({
      where: { email },
      data: { password: newPasswordHash },
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
      { message: 'पासवर्ड यशस्वीरित्या बदलला गेला आहे!' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'पासवर्ड बदलताना तांत्रिक अडचण आली.' },
      { status: 500 }
    );
  }
}
