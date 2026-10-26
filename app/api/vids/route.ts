import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { getBraveBinary } from '@/lib/gflow';

export async function POST(req: Request) {
  try {
    const { title = 'Película FlowStudio', scenes, characters, fullScript } = await req.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No hay escenas disponibles en el Storyboard para exportar a Google Vids' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 30);
    const exportDirName = `vids_export_${safeTitle}_${timestamp}`;
    const exportsBaseDir = path.join(process.cwd(), 'public', 'exports');
    const exportFullPath = path.join(exportsBaseDir, exportDirName);

    if (!fs.existsSync(exportFullPath)) {
      fs.mkdirSync(exportFullPath, { recursive: true });
    }

    const rendersDir = path.join(process.cwd(), 'public', 'renders');

    // 1. Copy available scene video clips and audios into the export package
    const exportedClips: Array<{ sceneNumber: number; title: string; videoFile?: string; audioFile?: string; dialogue?: string }> = [];

    scenes.forEach((scene: any, idx: number) => {
      const sceneNum = String(idx + 1).padStart(2, '0');
      let videoTarget: string | undefined;
      let audioTarget: string | undefined;

      if (scene.videoUrl) {
        const sourceVideoName = path.basename(scene.videoUrl);
        const sourceVideoPath = path.join(rendersDir, sourceVideoName);
        if (fs.existsSync(sourceVideoPath)) {
          const targetName = `scene_${sceneNum}_veo.mp4`;
          fs.copyFileSync(sourceVideoPath, path.join(exportFullPath, targetName));
          videoTarget = targetName;
        }
      }

      if (scene.audioUrl) {
        const sourceAudioName = path.basename(scene.audioUrl);
        const sourceAudioPath = path.join(rendersDir, sourceAudioName);
        if (fs.existsSync(sourceAudioPath)) {
          const targetAudioName = `scene_${sceneNum}_voice.mp3`;
          fs.copyFileSync(sourceAudioPath, path.join(exportFullPath, targetAudioName));
          audioTarget = targetAudioName;
        }
      }

      exportedClips.push({
        sceneNumber: idx + 1,
        title: scene.title || `Toma ${idx + 1}`,
        videoFile: videoTarget,
        audioFile: audioTarget,
        dialogue: scene.dialogue,
      });
    });

    // 2. Generate Google Vids Prompt & Script Guide (Ready to paste into Vids AI assistant)
    const vidsPrompt = `
# PROYECTO PARA GOOGLE VIDS (vids.google.com)
Título: ${title}
Formato: Vertical 9:16 / Cinematográfico
Generado por: FlowStudio Pro + Google Veo 3.1

## INSTRUCCIONES PARA EL ASISTENTE IA DE GOOGLE VIDS:
Crea un video dinámico con las siguientes ${scenes.length} escenas en la línea de tiempo.
Añade música de fondo cinematográfica con volumen atenuado durante los diálogos.
Incluye subtítulos animados en español para las frases habladas.

## ESTRUCTURA DE ESCENAS Y METRAJE:
${scenes
  .map(
    (s: any, i: number) => `
--- ESCENA ${i + 1} (${s.shotType || 'Toma Cinemática'} - 8s) ---
- Descripción visual: ${s.prompt}
- Archivo de video Veo 3.1: scene_${String(i + 1).padStart(2, '0')}_veo.mp4
${s.dialogue ? `- Diálogo / Locución (${s.speaker || 'Personaje'}): "${s.dialogue}"` : '- Audio: Música de tensión y ambiente cinematográfico'}
${s.audioFile ? `- Pista de voz generada: scene_${String(i + 1).padStart(2, '0')}_voice.mp3` : ''}
`
  )
  .join('\n')}

## PERSONAJES Y CONSISTENCIA:
${
  characters && characters.length > 0
    ? characters
        .map(
          (c: any) =>
            `- ${c.name} (${c.role}): ${c.faceAnchor}. Vestuario: ${c.outfit}. Voz: ${c.voiceName || c.voice}`
        )
        .join('\n')
    : 'Personajes con continuidad de rostros de Google Veo.'
}
`.trim();

    fs.writeFileSync(path.join(exportFullPath, 'google_vids_prompt.txt'), vidsPrompt, 'utf-8');

    // 3. Generate JSON manifest
    const manifest = {
      title,
      createdAt: new Date().toISOString(),
      generator: 'FlowStudio Pro',
      engine: 'Google Veo 3.1 & Nano Pro',
      vidsUrl: 'https://vids.google.com/create',
      scenes: exportedClips,
      characters: characters || [],
      vidsPrompt,
    };
    fs.writeFileSync(path.join(exportFullPath, 'vids_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // 4. Optionally launch Brave directly to Google Vids
    const braveBin = getBraveBinary();
    const vidsUrl = 'https://vids.google.com/create';
    if (braveBin && process.platform === 'win32') {
      exec(`start "" "${braveBin}" "${vidsUrl}"`, (err) => {
        if (err) console.error('Could not auto-open Brave:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Paquete para Google Vids preparado con éxito y Brave abierto en vids.google.com',
      exportFolder: exportDirName,
      exportPath: `/exports/${exportDirName}`,
      vidsPrompt,
      exportedClipsCount: exportedClips.filter((c) => c.videoFile).length,
      vidsUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al exportar a Google Vids' },
      { status: 500 }
    );
  }
}
