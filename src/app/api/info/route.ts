import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId, getVideoMetadata } from '@/lib/innertube';
import { AUDIO_PRESETS, VIDEO_PRESETS, estimateFileSize } from '@/lib/presets';
import { checkRateLimit } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Cookie-free client rotation can require several upstream attempts on a cold
// Vercel function. Keep enough budget for the resolver to finish cleanly.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please wait ${rate.resetInSec} seconds before requesting again.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid YouTube URL or video ID.' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid YouTube URL. Please enter a valid YouTube, YouTube Shorts, or YouTube Music link.',
        },
        { status: 400 }
      );
    }

    let metadata = await getVideoMetadata(videoId);
    // oEmbed can identify a video while YouTube temporarily withholds its
    // streaming metadata. Retry the full resolver twice before exposing a
    // metadata-only result to the download UI.
    for (let attempt = 0; attempt < 2 && !metadata.isPlayable; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      metadata = await getVideoMetadata(videoId);
    }

    // Map audio presets with estimated file sizes
    const audioPresets = AUDIO_PRESETS.map((p) => ({
      ...p,
      estimatedSize: estimateFileSize(p, metadata.duration),
    }));

    // Filter video presets to those available for this video
    const videoPresets = VIDEO_PRESETS.map((p) => {
      const isAvailable =
        !p.resolution ||
        metadata.availableResolutions.length === 0 ||
        metadata.availableResolutions.includes(p.resolution);

      return {
        ...p,
        isAvailable,
        estimatedSize: estimateFileSize(p, metadata.duration),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...metadata,
        presets: {
          audio: audioPresets,
          video: videoPresets,
        },
      },
    });
  } catch (err: any) {
    console.error('API /info error:', err);
    let errorMessage = 'Failed to extract video information.';
    
    if (err?.message?.includes('Sign in to confirm you’re not a bot') || err?.message?.includes('bot')) {
      errorMessage = 'YouTube flagged this request with bot detection. Please try again or try another video.';
    } else if (err?.message?.includes('Video unavailable') || err?.message?.includes('Private video')) {
      errorMessage = 'This video is private, unavailable, or deleted on YouTube.';
    } else if (err?.message?.includes('age-restricted') || err?.message?.includes('Sign in')) {
      errorMessage = 'This video is age-restricted and cannot be downloaded anonymously.';
    } else if (err?.message) {
      errorMessage = err.message;
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
