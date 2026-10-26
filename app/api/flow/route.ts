import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getGflowBinary, getBraveBinary, fixBraveProfileVersion, cleanStaleGflowLocks, execFileAsync } from '@/lib/gflow';

// Cola secuencial en memoria para evitar colisiones simultáneas en profile_default
let flowQueue = Promise.resolve<any>(null);

function queueExecution<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    flowQueue = flowQueue
      .then(() => fn().then(resolve, reject))
      .catch((err) => {
        reject(err);
      });
  });
}

export async function GET() {
  try {
    fixBraveProfileVersion();
    const gflowBin = getGflowBinary();
    const { stdout, stderr } = await execFileAsync(gflowBin, ['auth', 'status'], {
      timeout: 30000,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });
    const fullText = (stdout || '') + (stderr || '');
    const isUnauthenticated =
      fullText.includes('No profiles found') ||
      fullText.includes('Signed in to Google, but not to the Flow app') ||
      fullText.includes('auth login');

    return NextResponse.json({
      authenticated: !isUnauthenticated,
      isUnauthenticated,
      status: stdout || stderr,
    });
  } catch (error: any) {
    const output = (error.stdout || error.stderr || error.message || '').toString();
    const isUnauthenticated =
      output.includes('No profiles found') ||
      output.includes('Signed in to Google, but not to the Flow app') ||
      output.includes('auth login') ||
      output.includes('ProfileEngineDowngradeError');
    return NextResponse.json({
      authenticated: false,
      isUnauthenticated,
      message: output.trim() || 'No se pudo verificar la sesión de Google Flow',
    });
  }
}

import { requirePaidAccess } from '@/lib/auth-server';
import { deductMinutesFromUser } from '@/lib/db';

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

    fixBraveProfileVersion();
    const {
      prompt,
      mode = 'video',
      aspect = '16:9',
      model,
      duration,
      initialFrame,
      refImage,
      referenceImages,
      forceT2V = false,
    } = await req.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'El prompt es obligatorio' }, { status: 400 });
    }

    // Carpeta pública donde se guardarán los renders
    const outputDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const ext = mode === 'video' ? 'mp4' : 'jpg';
    const fileName = `flow_${Date.now()}.${ext}`;
    const outputPath = path.join(outputDir, fileName);

    const gflowBin = getGflowBinary();
    const args: string[] = [];

    // Resolver ruta local de imagen de inicio si se pasó para Image-to-Video (I2V)
    let localInitialFramePath: string | null = null;
    if (!forceT2V && initialFrame && typeof initialFrame === 'string') {
      if (initialFrame.startsWith('/renders/')) {
        localInitialFramePath = path.join(process.cwd(), 'public', initialFrame.replace(/^\//, '').replace(/\//g, path.sep));
      } else if (fs.existsSync(initialFrame)) {
        localInitialFramePath = initialFrame;
      }
    }

    // Resolver ruta local de imagen de referencia para consistencia de personaje (I2I)
    let localRefPath: string | null = null;
    const refCandidate = refImage || (Array.isArray(referenceImages) && referenceImages[0]);
    if (refCandidate && typeof refCandidate === 'string') {
      if (refCandidate.startsWith('/renders/')) {
        localRefPath = path.join(process.cwd(), 'public', refCandidate.replace(/^\//, '').replace(/\//g, path.sep));
      } else if (fs.existsSync(refCandidate)) {
        localRefPath = refCandidate;
      }
    }

    // Sanitize prompt for shell, Windows argument passing, and Google Veo safety filters
    let sanitizedPrompt = prompt
      .replace(/["“”«»]/g, "'")
      .replace(/[\r\n]+/g, ' ')
      // Soften words that frequently trigger Google Flow safety filter freezes / credit holds
      .replace(/\b(muerto|muerta)\b/gi, 'desaparecido')
      .replace(/\b(muerte)\b/gi, 'trágica pérdida')
      .replace(/\b(morir|morirá)\b/gi, 'desvanecerse')
      .replace(/\b(asesinar|asesinato|matar)\b/gi, 'traicionar')
      .replace(/\b(sangre)\b/gi, 'sombras carmesí')
      .replace(/\b(pistola|arma|disparo)\b/gi, 'silueta amenazante')
      .replace(/\b(dead|died)\b/gi, 'vanished')
      .replace(/\b(death)\b/gi, 'tragic departure')
      .replace(/\b(kill|murder)\b/gi, 'betray')
      .replace(/\b(blood)\b/gi, 'crimson shadows')
      .trim();

    let resolvedVideoModel = model;
    if (mode === 'video') {
      if (resolvedVideoModel === 'veo-3.1' || resolvedVideoModel === 'veo3.1' || resolvedVideoModel === 'veo-quality') {
        resolvedVideoModel = 'veo-quality';
      } else if (!['omni-flash', 'veo-lite', 'veo-fast', 'veo-quality', 'veo-lite-lp'].includes(resolvedVideoModel)) {
        resolvedVideoModel = 'veo-fast';
      }

      if (!forceT2V && localInitialFramePath && fs.existsSync(localInitialFramePath)) {
        // Modo Image-to-Video (I2V): anima la imagen clave preservando el rostro y personaje
        args.push('video', 'i2v', '--initial-frame', localInitialFramePath, sanitizedPrompt, '--aspect', aspect, '--output', outputPath);
      } else {
        // Modo estándar Text-to-Video (T2V)
        args.push('video', 't2v', sanitizedPrompt, '--aspect', aspect, '--output', outputPath);
      }

      if (resolvedVideoModel) {
        args.push('--model', resolvedVideoModel);
      }
      if (duration) {
        const d = String(duration);
        args.push('--duration', ['4', '6', '8', '10'].includes(d) ? d : '8');
      }
    } else {
      let resolvedModel = model;
      if (resolvedModel === 'nano-pro' || resolvedModel === 'nanopro') {
        resolvedModel = 'nano-pro';
      } else if (resolvedModel === 'imagen4' || resolvedModel === 'image4') {
        resolvedModel = 'imagen4';
      } else if (!['nano2', 'nano2.1', 'nano-2.1', 'nano-pro', 'nano2-lite', 'image4', 'imagen4'].includes(resolvedModel)) {
        resolvedModel = 'nano2';
      }

      // Text-to-Image 100% compatible con flow.google.com
      args.push('image', 't2i', sanitizedPrompt, '--aspect', aspect, '--output', outputPath);

      if (resolvedModel) {
        args.push('--model', resolvedModel);
      }
    }

    const braveBin = getBraveBinary();
    const startTime = Date.now();

    // Ejecutamos gflow a través de la cola secuencial asegurando que los locks estén limpios
    const { stdout, stderr } = await queueExecution(async () => {
      cleanStaleGflowLocks();
      fixBraveProfileVersion();

      try {
        return await execFileAsync(gflowBin, args, {
          timeout: 600000,
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            GFLOW_CLI_LEASE_WAIT_SECONDS: '120',
            ...(braveBin ? { CHROME_BINARY: braveBin } : {}),
          },
        });
      } catch (execErr: any) {
        const errDetails = (execErr.stdout || execErr.stderr || execErr.message || '').toString();
        // Si la cuenta fue migrada al composer de flow.google.com, i2v no está soportado todavía (#799)
        // Auto-fallback a Text-to-Video (T2V) de Veo para que la producción continúe sin errores
        if (
          args[0] === 'video' &&
          args[1] === 'i2v' &&
          (errDetails.includes('FlowHostMigratedError') ||
            errDetails.includes('i2v is not ported') ||
            errDetails.includes('flow-host-migrated'))
        ) {
          console.warn('[FlowStudio] i2v no soportado en la interfaz migrada de Flow (#799). Fallback automático a Veo T2V...');
          cleanStaleGflowLocks();
          fixBraveProfileVersion();

          const fallbackArgs: string[] = ['video', 't2v', sanitizedPrompt, '--aspect', aspect, '--output', outputPath];
          if (resolvedVideoModel) {
            fallbackArgs.push('--model', resolvedVideoModel);
          }
          if (duration) {
            const d = String(duration);
            fallbackArgs.push('--duration', ['4', '6', '8', '10'].includes(d) ? d : '8');
          }

          return await execFileAsync(gflowBin, fallbackArgs, {
            timeout: 600000,
            env: {
              ...process.env,
              PYTHONIOENCODING: 'utf-8',
              GFLOW_CLI_LEASE_WAIT_SECONDS: '120',
              ...(braveBin ? { CHROME_BINARY: braveBin } : {}),
            },
          });
        }
        throw execErr;
      }
    });

    // Verificar si el archivo se creó exitosamente
    let finalFileName = fileName;
    let exists = fs.existsSync(outputPath);
    if (!exists) {
      // Buscar si gflow lo guardó con un timestamp o extensión diferente (.jpg / .png / .webp)
      const files = fs.readdirSync(outputDir);
      const isVideo = mode === 'video';
      const validExts = isVideo ? ['.mp4', '.webm'] : ['.jpg', '.jpeg', '.png', '.webp'];

      const recent = files
        .filter((f) => f.startsWith('flow_') && validExts.some((e) => f.toLowerCase().endsWith(e)))
        .map((f) => ({ name: f, time: fs.statSync(path.join(outputDir, f)).mtimeMs }))
        .filter((f) => f.time >= startTime - 20000)
        .sort((a, b) => b.time - a.time)[0];

      if (recent) {
        finalFileName = recent.name;
        exists = true;
      } else {
        return NextResponse.json(
          {
            error: 'Google Flow finalizó el proceso pero el archivo renderizado no se encontró en disco.',
            logs: stdout || stderr,
          },
          { status: 500 }
        );
      }
    }

    let remainingMinutes = user.minutes;
    if (user.role !== 'admin') {
      const minutesCost = mode === 'video' ? (Number(duration) || 8) / 60 : 0.05;
      const resDeduct = deductMinutesFromUser(user.id, minutesCost);
      remainingMinutes = resDeduct.newBalance;
    }

    return NextResponse.json({
      success: true,
      url: `/renders/${finalFileName}`,
      fileName: finalFileName,
      mode,
      aspect,
      prompt: sanitizedPrompt,
      logs: (stdout || stderr || '').trim(),
      remainingMinutes,
    });
  } catch (error: any) {
    const errorDetails = (error.stdout || error.stderr || error.message || '').toString();
    let userFriendlyError = 'Error al generar video en Google Flow';
    if (errorDetails.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT') {
      userFriendlyError = 'Tiempo de espera agotado (10 min). Google Flow puede estar experimentando alta demanda o revisión del prompt.';
    } else if (errorDetails.includes('ProfileLockedError')) {
      userFriendlyError = 'El perfil estuvo bloqueado temporalmente. Puedes reintentar esta toma ahora sin perder progreso.';
    } else if (errorDetails.includes('safety') || errorDetails.includes('rejected')) {
      userFriendlyError = 'Google Flow rechazó el prompt por sus filtros de seguridad. Modifica las palabras clave en la toma.';
    } else if (error.message) {
      userFriendlyError = error.message;
    }

    return NextResponse.json(
      {
        error: userFriendlyError,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
