import { Innertube, UniversalCache, Platform } from 'youtubei.js';

// Configure Platform.shim.eval so YouTube player deciphering functions execute cleanly in Node
Platform.shim.eval = (data: any, env: any) => {
  try {
    const fn = new Function(...Object.keys(env), data.output);
    return fn(...Object.values(env));
  } catch (e) {
    console.warn('[Platform.shim.eval] Fallback evaluator notice:', e);
    return env;
  }
};

let innertubeInstance: Innertube | null = null;
let innertubePromise: Promise<Innertube> | null = null;

/**
 * Returns a cached singleton Innertube client instance.
 * Avoids repeated session handshakes and cold starts across API requests.
 */
export async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) {
    return innertubeInstance;
  }

  if (innertubePromise) {
    return innertubePromise;
  }

  innertubePromise = (async () => {
    try {
      const client = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
      });
      innertubeInstance = client;
      return client;
    } catch (err) {
      innertubePromise = null;
      throw err;
    }
  })();

  return innertubePromise;
}

/**
 * Extracts and validates YouTube video ID from various YouTube & YouTube Music URLs.
 */
export function extractVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle standard, music, mobile, and short YouTube URLs
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|music\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|music\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|music\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|music\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export interface VideoMetadata {
  id: string;
  title: string;
  author: string;
  channelId?: string;
  duration: number; // in seconds
  durationFormatted: string;
  viewCount?: number;
  thumbnail: string;
  description?: string;
  availableResolutions: string[];
  hasAudio: boolean;
  maxAudioBitrate: number;
}

/**
 * Formats duration in seconds to standard HH:MM:SS or MM:SS format.
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const resolutionRank: Record<string, number> = {
  '4320p': 8000,
  '2160p': 4000,
  '1440p': 2000,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360,
  '240p': 240,
  '144p': 144,
};

/**
 * Fetches video metadata with dual-engine fallback (YouTube.js -> Ytdl).
 */
export async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId, { client: 'IOS' });

    const basic = info.basic_info;
    const adaptive = info.streaming_data?.adaptive_formats || [];

    const videoFormats = adaptive.filter((f) => f.has_video && f.quality_label);
    const resolutionsSet = new Set<string>();

    for (const f of videoFormats) {
      if (f.quality_label) {
        resolutionsSet.add(f.quality_label.replace(/60|50|hdr/gi, '').trim());
      }
    }

    const availableResolutions = Array.from(resolutionsSet).sort((a, b) => {
      const rankA = resolutionRank[a] || parseInt(a) || 0;
      const rankB = resolutionRank[b] || parseInt(b) || 0;
      return rankB - rankA;
    });

    const audioFormats = adaptive.filter((f) => f.has_audio);
    let maxAudioBitrate = 0;
    for (const f of audioFormats) {
      if (f.bitrate && f.bitrate > maxAudioBitrate) {
        maxAudioBitrate = f.bitrate;
      }
    }

    let thumbnail = '';
    if (basic.thumbnail && basic.thumbnail.length > 0) {
      const bestThumb = basic.thumbnail[basic.thumbnail.length - 1];
      thumbnail = bestThumb.url;
    }
    if (!thumbnail) {
      thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    const durationSec = basic.duration || 0;

    return {
      id: videoId,
      title: basic.title || 'Unknown Title',
      author: basic.author || 'YouTube Channel',
      channelId: basic.channel_id,
      duration: durationSec,
      durationFormatted: formatDuration(durationSec),
      viewCount: basic.view_count,
      thumbnail,
      description: basic.short_description,
      availableResolutions: availableResolutions.length > 0 ? availableResolutions : ['1080p', '720p', '480p', '360p'],
      hasAudio: true,
      maxAudioBitrate: maxAudioBitrate > 0 ? Math.round(maxAudioBitrate / 1000) : 320,
    };
  } catch (primaryErr) {
    console.warn('[getVideoMetadata] Primary engine failed, switching to Ytdl fallback:', primaryErr);

    // Fallback to Ytdl
    const { Ytdl } = await import('@distube/ytdl-core');
    const ytdl = new Ytdl();
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);

    const details = info.videoDetails;
    const resolutionsSet = new Set<string>();

    for (const f of info.formats) {
      if (f.hasVideo && f.qualityLabel) {
        resolutionsSet.add(f.qualityLabel.replace(/60|50|hdr/gi, '').trim());
      }
    }

    const availableResolutions = Array.from(resolutionsSet).sort((a, b) => {
      const rankA = resolutionRank[a] || parseInt(a) || 0;
      const rankB = resolutionRank[b] || parseInt(b) || 0;
      return rankB - rankA;
    });

    const durationSec = Number(details.lengthSeconds || 0);
    const thumbnail =
      details.thumbnails?.[details.thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: videoId,
      title: details.title || 'Unknown Title',
      author: details.author?.name || 'YouTube Channel',
      channelId: details.author?.id,
      duration: durationSec,
      durationFormatted: formatDuration(durationSec),
      viewCount: Number(details.viewCount || 0),
      thumbnail,
      description: details.description || '',
      availableResolutions: availableResolutions.length > 0 ? availableResolutions : ['1080p', '720p', '480p'],
      hasAudio: true,
      maxAudioBitrate: 320,
    };
  }
}
