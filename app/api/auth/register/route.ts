import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';
import { hashPassword } from '@/src/lib/auth';
import { validatePasswordComplexity } from '@/src/lib/auth-rate-limit';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'नाव, ईमेल आणि पासवर्ड आवश्यक आहेत.' },
        { status: 400 }
      );
    }

    // Validate password complexity (OWASP-compliant)
    const complexity = validatePasswordComplexity(password);
    if (!complexity.valid) {
      return NextResponse.json(
        { error: complexity.errors.join(' ') },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'हा ईमेल आधीच नोंदणीकृत आहे.' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user with default USER role
    const user = await db.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: 'USER',
        reputationScore: 10, // Starting score for registration
      },
    });

    // Generate Verification Token (OTP)
    const token = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Logging token for local development / testing verification
    console.log(`\n==========================================`);
    console.log(`✉️ [EMAIL LOG] User Registration Verification`);
    console.log(`To: ${email}`);
    console.log(`Verification OTP: ${token}`);
    console.log(`==========================================\n`);

    return NextResponse.json(
      {
        message: 'नोंदणी यशस्वी झाली. कृपया तुमचा ईमेल तपासा.',
        userId: user.id,
        email: user.email,
        // Expose token in dev mode for easy testing/QA automation
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: token } : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'नोंदणी करताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.' },
      { status: 500 }
    );
  }
}
