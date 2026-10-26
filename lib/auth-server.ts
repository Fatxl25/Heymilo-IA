import { cookies } from 'next/headers';
import { getSession, getUserById, User } from './db';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('milo_session')?.value;
    if (!token) return null;

    const session = getSession(token);
    if (!session) return null;

    return getUserById(session.userId);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<{ user: User | null; error?: string; status?: number }> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: 'Debes iniciar sesión para acceder a Hey Milo AI.',
      status: 401,
    };
  }

  return { user };
}

export async function requirePaidAccess(): Promise<{ user: User | null; error?: string; status?: number }> {
  const { user, error, status } = await requireAuth();
  if (!user) {
    return { user: null, error, status };
  }

  // Admins siempre tienen acceso
  if (user.role === 'admin') {
    return { user };
  }

  if (!user.hasPaid) {
    return {
      user: null,
      error: 'Se requiere el Pase Creador de $3 USD para usar la generación de video e IA en Hey Milo.',
      status: 402, // Payment Required
    };
  }

  return { user };
}
