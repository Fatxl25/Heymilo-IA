import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { sanitizeUser } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error verificando usuario' }, { status: 500 });
  }
}
