import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export function getFfmpegBinary(): string {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userProfile = process.env.USERPROFILE || '';

  const candidates = [
    path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
    path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'ffmpeg';
}

/**
 * Merges multiple video files into a single continuous MP4 file using FFmpeg concat demuxer.
 */
export async function mergeVideoClips(
  inputRelativePaths: string[],
  outputFileName?: string
): Promise<{ success: boolean; outputUrl: string; fileName: string; durationEstimate: number }> {
  const rendersDir = path.join(process.cwd(), 'public', 'renders');
  if (!fs.existsSync(rendersDir)) {
    fs.mkdirSync(rendersDir, { recursive: true });
  }

  const validFiles: string[] = [];
  for (const rel of inputRelativePaths) {
    const baseName = path.basename(rel);
    const fullPath = path.join(rendersDir, baseName);
    if (fs.existsSync(fullPath)) {
      validFiles.push(fullPath);
    }
  }

  if (validFiles.length === 0) {
    throw new Error('No se encontraron los clips de video para unir.');
  }

  if (validFiles.length === 1) {
    const singleName = path.basename(validFiles[0]);
    return {
      success: true,
      outputUrl: `/renders/${singleName}`,
      fileName: singleName,
      durationEstimate: 8,
    };
  }

  const outName = outputFileName || `movie_${Date.now()}.mp4`;
  const outFullPath = path.join(rendersDir, outName);

  // Create concat list file
  const concatListFile = path.join(rendersDir, `concat_${Date.now()}.txt`);
  const fileLines = validFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(concatListFile, fileLines, 'utf-8');

  const ffmpegBin = getFfmpegBinary();

  try {
    // Try stream copy first (fastest and lossless if clips share codecs)
    await execFileAsync(
      ffmpegBin,
      ['-y', '-f', 'concat', '-safe', '0', '-i', concatListFile, '-c', 'copy', outFullPath],
      { timeout: 600000 }
    );
  } catch (copyErr) {
    // Fallback: re-encode if timestamps or codecs differ slightly
    try {
      await execFileAsync(
        ffmpegBin,
        [
          '-y',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          concatListFile,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          outFullPath,
        ],
        { timeout: 600000 }
      );
    } catch (reencodeErr: any) {
      if (fs.existsSync(concatListFile)) fs.unlinkSync(concatListFile);
      throw new Error(`Error uniendo clips con FFmpeg: ${reencodeErr.message || copyErr}`);
    }
  } finally {
    if (fs.existsSync(concatListFile)) {
      try {
        fs.unlinkSync(concatListFile);
      } catch {
        // ignore
      }
    }
  }

  return {
    success: true,
    outputUrl: `/renders/${outName}`,
    fileName: outName,
    durationEstimate: validFiles.length * 8,
  };
}

/**
 * Attaches or mixes an MP3 voice audio track onto an MP4 video clip.
 */
export async function attachAudioToVideo(
  videoFileName: string,
  audioFileName: string,
  outputFileName?: string
): Promise<{ success: boolean; outputUrl: string; fileName: string }> {
  const rendersDir = path.join(process.cwd(), 'public', 'renders');
  const videoPath = path.join(rendersDir, path.basename(videoFileName));
  const audioPath = path.join(rendersDir, path.basename(audioFileName));

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video no encontrado: ${videoFileName}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio no encontrado: ${audioFileName}`);
  }

  const outName = outputFileName || `voiced_${path.basename(videoFileName)}`;
  const outFullPath = path.join(rendersDir, outName);
  const ffmpegBin = getFfmpegBinary();

  try {
    // Try simple map: replace/add audio to video, keeping video stream intact
    await execFileAsync(
      ffmpegBin,
      [
        '-y',
        '-i',
        videoPath,
        '-i',
        audioPath,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        outFullPath,
      ],
      { timeout: 60000 }
    );
  } catch (err: any) {
    // Fallback: re-encode audio & video if needed
    await execFileAsync(
      ffmpegBin,
      [
        '-y',
        '-i',
        videoPath,
        '-i',
        audioPath,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-shortest',
        outFullPath,
      ],
      { timeout: 120000 }
    );
  }

  return {
    success: true,
    outputUrl: `/renders/${outName}`,
    fileName: outName,
  };
}

