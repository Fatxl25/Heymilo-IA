import { NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword, createSession, sanitizeUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Debes proporcionar correo y contraseña.' }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas. Correo o contraseña incorrectos.' }, { status: 401 });
    }

    const isValid = verifyPassword(user, password);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas. Correo o contraseña incorrectos.' }, { status: 401 });
    }

    const session = createSession(user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
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
    return NextResponse.json({ error: err.message || 'Error al iniciar sesión' }, { status: 500 });
  }
}
