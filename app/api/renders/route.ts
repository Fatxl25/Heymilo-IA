import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const outputDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ renders: [] });
    }

    const files = fs.readdirSync(outputDir);
    const renders = files
      .filter((file) => file.match(/\.(mp4|webm|png|jpg|webp)$/i))
      .map((file) => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          url: `/renders/${file}`,
          type: file.endsWith('.mp4') || file.endsWith('.webm') ? 'video' : 'image',
          createdAt: stats.mtimeMs,
          size: stats.size,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ renders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, renders: [] }, { status: 500 });
  }
}
