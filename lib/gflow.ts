import path from 'path';
import fs from 'fs';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

export const execFileAsync = promisify(execFile);

export function getBraveBinary(): string | null {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getGflowProfileDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'ffroliva', 'gflow-cli', 'profile_default');
  }
  const xdgData = process.env.XDG_DATA_HOME || path.join(process.env.HOME || '/root', '.local', 'share');
  return path.join(xdgData, 'ffroliva', 'gflow-cli', 'profile_default');
}

export function getGflowLocksDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'ffroliva', 'gflow-cli', 'locks');
  }
  const xdgData = process.env.XDG_DATA_HOME || path.join(process.env.HOME || '/root', '.local', 'share');
  return path.join(xdgData, 'ffroliva', 'gflow-cli', 'locks');
}

export function fixBraveProfileVersion(): void {
  try {
    const profileDir = getGflowProfileDir();
    const lastVersionFile = path.join(profileDir, 'Last Version');
    if (fs.existsSync(profileDir)) {
      // Prevents ProfileEngineDowngradeError when browser version is compared to Playwright's bundled Chromium
      fs.writeFileSync(lastVersionFile, '149.0.7827.55', 'utf-8');
    }
  } catch {
    // Ignore any filesystem permission blips
  }
}

export function cleanStaleGflowLocks(): void {
  try {
    const locksDir = getGflowLocksDir();
    if (fs.existsSync(locksDir)) {
      const lockFiles = fs.readdirSync(locksDir);
      for (const file of lockFiles) {
        if (file.endsWith('.lock')) {
          const lockFilePath = path.join(locksDir, file);
          try {
            const raw = fs.readFileSync(lockFilePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.pid === 'number') {
              try {
                process.kill(parsed.pid, 0);
              } catch {
                fs.unlinkSync(lockFilePath);
              }
            }
          } catch {
            try {
              fs.unlinkSync(lockFilePath);
            } catch {}
          }
        }
      }
    }
  } catch {
    // Ignore blips
  }
}

export function getGflowBinary(): string {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userProfile = process.env.USERPROFILE || '';

  const candidates = [
    path.join(localAppData, 'Python', 'pythoncore-3.14-64', 'Scripts', 'gflow.exe'),
    path.join(userProfile, 'AppData', 'Local', 'Python', 'pythoncore-3.14-64', 'Scripts', 'gflow.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python314', 'Scripts', 'gflow.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python312', 'Scripts', 'gflow.exe'),
    path.join(localAppData, 'Programs', 'Python', 'Python311', 'Scripts', 'gflow.exe'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'gflow';
}

export function launchInteractiveLogin(browser = 'chrome'): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    try {
      fixBraveProfileVersion();
      const gflowBin = getGflowBinary();
      const braveBin = getBraveBinary() || 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
      const isWin = process.platform === 'win32';
      
      if (isWin) {
        const cmdScript = `
@echo off
title Autenticacion Google Flow (Brave) - FlowStudio Pro
cls
echo ======================================================================
echo    INICIANDO SESION EN GOOGLE FLOW (Veo 3.1 ^& Nano)
echo ======================================================================
echo.
echo Se esta abriendo tu navegador Brave.
echo 1. Inicia sesion con tu cuenta de Google en Brave.
echo 2. Espera a que la pagina de Google Flow cargue completamente.
echo 3. Cierra la ventana de Brave cuando hayas ingresado.
echo.
echo Esperando autorizacion del navegador...
echo.
set "CHROME_BINARY=${braveBin}"
"${gflowBin}" auth login --browser ${browser}
echo.
if exist "%LOCALAPPDATA%\\ffroliva\\gflow-cli\\profile_default" (
  <nul set /p "=149.0.7827.55" > "%LOCALAPPDATA%\\ffroliva\\gflow-cli\\profile_default\\Last Version"
)
echo ======================================================================
echo [OK] Sesion capturada correctamente en Brave.
echo Esta ventana se cerrara en 4 segundos...
timeout /t 4 /nobreak >nul
exit
`;
        const tempBat = path.join(process.cwd(), '.next', 'run-auth.bat');
        const nextDir = path.dirname(tempBat);
        if (!fs.existsSync(nextDir)) {
          fs.mkdirSync(nextDir, { recursive: true });
        }
        fs.writeFileSync(tempBat, cmdScript, 'utf-8');

        const child = spawn('cmd.exe', ['/c', 'start', '""', tempBat], {
          detached: true,
          stdio: 'ignore',
          windowsHide: false,
        });
        child.unref();

        resolve({
          success: true,
          message: 'Se abrió tu navegador Brave para iniciar sesión.',
        });
      } else {
        const child = spawn(gflowBin, ['auth', 'login', '--browser', browser], {
          detached: true,
          stdio: 'ignore',
          env: {
            ...process.env,
            ...(braveBin ? { CHROME_BINARY: braveBin } : {}),
          },
        });
        child.unref();

        resolve({
          success: true,
          message: 'Proceso de inicio de sesión con Brave iniciado.',
        });
      }
    } catch (err: any) {
      reject(err);
    }
  });
}
