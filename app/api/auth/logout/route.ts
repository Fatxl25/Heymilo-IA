import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('milo_session')?.value;
    if (token) {
      deleteSession(token);
    }

    const response = NextResponse.json({ success: true, message: 'Sesión cerrada correctamente.' });
    response.cookies.delete('milo_session');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al cerrar sesión' }, { status: 500 });
  }
}
