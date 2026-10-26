import { NextResponse } from 'next/server';
import { mergeVideoClips } from '@/lib/ffmpeg';
import { requirePaidAccess } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const { user, error: authError, status: authStatus } = await requirePaidAccess();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: authError || 'Acceso restringido. Debes iniciar sesión y activar el Pase Creador de $3 USD.',
          requiresPayment: authStatus === 402,
          requiresLogin: authStatus === 401,
        },
        { status: authStatus || 401 }
      );
    }
    const { clips, outputFileName } = await req.json();

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return NextResponse.json({ error: 'Debes proporcionar una lista de clips para unir' }, { status: 400 });
    }

    const result = await mergeVideoClips(clips, outputFileName);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al unir los clips con FFmpeg' },
      { status: 500 }
    );
  }
}
