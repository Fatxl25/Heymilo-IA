import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const SPANISH_VOICES = [
  { id: 'es-CO-SalomeNeural', name: 'Salomé (Colombia - Femenina Emotiva)', gender: 'female', lang: 'es-CO' },
  { id: 'es-CO-GonzaloNeural', name: 'Gonzalo (Colombia - Masculino Expresivo)', gender: 'male', lang: 'es-CO' },
  { id: 'es-MX-DaliaNeural', name: 'Dalia (México - Femenina Clara)', gender: 'female', lang: 'es-MX' },
  { id: 'es-MX-JorgeNeural', name: 'Jorge (México - Masculino Profundo)', gender: 'male', lang: 'es-MX' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (España - Femenina Madura)', gender: 'female', lang: 'es-ES' },
  { id: 'es-ES-AlvaroNeural', name: 'Álvaro (España - Masculino Fuerte)', gender: 'male', lang: 'es-ES' },
];

export async function GET() {
  return NextResponse.json({
    voices: SPANISH_VOICES,
  });
}

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

    const { text, voice = 'es-CO-SalomeNeural', sceneId } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'El texto del diálogo es requerido' }, { status: 400 });
    }

    const cleanText = text
      .replace(/["“”«»]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    const outputDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const outputPath = path.join(outputDir, fileName);

    // Locate edge-tts binary or python
    const localAppData = process.env.LOCALAPPDATA || '';
    const edgeTtsCandidates = [
      path.join(localAppData, 'Python', 'pythoncore-3.14-64', 'Scripts', 'edge-tts.exe'),
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'edge-tts.exe'),
    ];

    let bin = 'edge-tts';
    for (const cand of edgeTtsCandidates) {
      if (fs.existsSync(cand)) {
        bin = cand;
        break;
      }
    }

    const args = [
      '--voice',
      voice,
      '--text',
      cleanText,
      '--write-media',
      outputPath,
    ];

    await execFileAsync(bin, args, {
      timeout: 30000,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('El archivo de audio de la voz no se generó en disco.');
    }

    return NextResponse.json({
      success: true,
      audioUrl: `/renders/${fileName}`,
      fileName,
      voice,
      sceneId,
      text: cleanText,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al generar la voz del personaje' },
      { status: 500 }
    );
  }
}
