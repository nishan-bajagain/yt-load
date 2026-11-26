import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { extractVideoId } from '@/lib/innertube';
import { getPresetById } from '@/lib/presets';
import { processAudioDownload, processVideoMuxDownload } from '@/lib/downloader';
import { checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return new NextResponse(
        `Rate limit exceeded. Please wait ${rate.resetInSec} seconds before downloading again.`,
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const presetId = searchParams.get('preset') || 'mp3-320';
    const jobId = searchParams.get('jobId') || undefined;

    if (!url) {
      return new NextResponse('Missing required query parameter "url"', { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new NextResponse('Invalid YouTube video URL or ID', { status: 400 });
    }

    const preset = getPresetById(presetId);
    if (!preset) {
      return new NextResponse(`Unknown preset ID: ${presetId}`, { status: 400 });
    }

    // Process either audio transcode or video+audio muxing
    const result =
      preset.type === 'audio'
        ? await processAudioDownload(videoId, preset, jobId, req.signal)
        : await processVideoMuxDownload(videoId, preset, jobId, req.signal);

    // Convert Node stream to Web ReadableStream for App Router response
    const webStream = Readable.toWeb(result.stream);

    const safeAsciiFilename = result.filename.replace(/[^\x20-\x7E]/g, '_');
    const encodedFilename = encodeURIComponent(result.filename);

    const headers = new Headers();
    headers.set(
      'Content-Disposition',
      `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    headers.set('Content-Type', result.mimeType || 'application/octet-stream');
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(webStream as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('API /download error:', err);
    return new NextResponse(
      `Download error: ${err.message || 'An unexpected error occurred during processing.'}`,
      { status: 500 }
    );
  }
}
