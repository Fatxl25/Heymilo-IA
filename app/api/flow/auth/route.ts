import { NextResponse } from 'next/server';
import { getGflowBinary, getBraveBinary, fixBraveProfileVersion, execFileAsync, launchInteractiveLogin } from '@/lib/gflow';

export async function GET() {
  try {
    fixBraveProfileVersion();
    const gflowBin = getGflowBinary();
    const braveBin = getBraveBinary();
    const { stdout, stderr } = await execFileAsync(gflowBin, ['auth', 'status'], {
      timeout: 35000,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        GFLOW_CLI_LEASE_WAIT_SECONDS: '60',
        ...(braveBin ? { CHROME_BINARY: braveBin } : {}),
      },
    });

    const fullOutput = (stdout || '') + (stderr || '');
    const isUnauthenticated =
      fullOutput.includes('No profiles found') ||
      fullOutput.includes('Signed in to Google, but not to the Flow app') ||
      fullOutput.includes('auth login');

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'login';
    const browser = body.browser || 'chrome';
    const gflowBin = getGflowBinary();

    if (action === 'login') {
      const result = await launchInteractiveLogin(browser);
      return NextResponse.json(result);
    }

    if (action === 'logout') {
      const { stdout, stderr } = await execFileAsync(gflowBin, ['auth', 'logout', '-y'], {
        timeout: 15000,
      });
      return NextResponse.json({
        success: true,
        message: 'Sesión eliminada correctamente.',
        output: stdout || stderr,
      });
    }

    if (action === 'renew') {
      const { stdout, stderr } = await execFileAsync(gflowBin, ['auth', 'renew'], {
        timeout: 45000,
      });
      return NextResponse.json({
        success: true,
        message: 'Sesión renovada con éxito.',
        output: stdout || stderr,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Error procesando la solicitud de autenticación',
        output: (error.stdout || error.stderr || '').toString(),
      },
      { status: 500 }
    );
  }
}
