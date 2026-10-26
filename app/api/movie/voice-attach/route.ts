import { NextResponse } from 'next/server';
import { attachAudioToVideo } from '@/lib/ffmpeg';

export async function POST(req: Request) {
  try {
    const { videoFileName, audioFileName, outputFileName } = await req.json();

    if (!videoFileName || !audioFileName) {
      return NextResponse.json(
        { error: 'videoFileName y audioFileName son requeridos' },
        { status: 400 }
      );
    }

    const result = await attachAudioToVideo(videoFileName, audioFileName, outputFileName);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al incorporar la voz al video' },
      { status: 500 }
    );
  }
}
