import { NextResponse } from 'next/server';
import { createUser, createSession, sanitizeUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un correo electrónico válido.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const { user, error } = createUser(email, name || '', password);
    if (error || !user) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const session = createSession(user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Cuenta creada con éxito. Requiere activación de $3 USD para usar el creador.',
      user: sanitizeUser(user),
    });

    response.cookies.set('milo_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al registrar usuario' }, { status: 500 });
  }
}
