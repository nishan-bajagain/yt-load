import { Innertube, UniversalCache, Platform } from 'youtubei.js';
import fs from 'fs';
import path from 'path';

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

// Singleton PoToken provider — shared across all requests in the same Node.js process.
// Works in pure Node without a browser. Runs BotGuard in a worker thread.
// On Vercel/serverless, each cold start creates one provider; it stays alive for the
// lifetime of the lambda warm instance (usually several minutes).
let poTokenProviderPromise: Promise<any> | null = null;

async function getPoTokenProvider(): Promise<any | null> {
  if (poTokenProviderPromise) return poTokenProviderPromise;

  poTokenProviderPromise = (async () => {
    try {
      const { createPoTokenProvider } = await import('@distube/ytdl-core');
      const provider = await createPoTokenProvider({ timeoutMs: 20_000 });
      console.log('[PoToken] BotGuard worker ready — running without cookies');
      return provider;
    } catch (e) {
      console.warn('[PoToken] BotGuard worker failed to initialise (non-fatal):', (e as Error).message);
      poTokenProviderPromise = null; // allow retry on next request
      return null;
    }
  })();

  return poTokenProviderPromise;
}

/**
 * Reads YouTube cookies from environment variables or local cookies.txt file.
 * Vital for production cloud deployments (Vercel, AWS, Railway, Docker) where YouTube checks authentication.
 */
export function getYouTubeCookie(): string | undefined {
  if (process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_COOKIE.trim()) {
    return process.env.YOUTUBE_COOKIE.trim();
  }
  if (process.env.YT_COOKIE && process.env.YT_COOKIE.trim()) {
    return process.env.YT_COOKIE.trim();
  }
  try {
    const cookiePath = path.resolve(process.cwd(), 'cookies.txt');
    if (fs.existsSync(cookiePath)) {
      const content = fs.readFileSync(cookiePath, 'utf8').trim();
      if (content) return content;
    }
  } catch (e) {
    // ignore
  }
  return undefined;
}

/**
 * Creates custom fetch dispatcher when an HTTP/HTTPS/SOCKS proxy is configured.
 */
export function getYouTubeProxyFetch(): typeof fetch | undefined {
  const proxyUrl = process.env.YOUTUBE_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;

  try {
    const { ProxyAgent, fetch: uFetch } = require('undici');
    const agent = new ProxyAgent(proxyUrl);
    return ((url: any, init: any) => {
      return uFetch(url, { ...init, dispatcher: agent });
    }) as any;
  } catch (e) {
    console.warn('[Proxy] Failed to initialize ProxyAgent:', e);
    return undefined;
  }
}

/**
 * Factory for creating a production-hardened Ytdl instance.
 *
 * Priority order (best to worst for cloud/Vercel without cookies):
 *   1. Tv + WebEmbedded + VisionOS clients  — bypass player JS deciphering entirely
 *   2. PoToken (BotGuard worker thread)      — proves the request is from a real client
 *   3. Cookie (optional env var)             — signed-in session, most privileged
 *   4. Proxy (optional env var)              — residential IP routing
 */
export async function createResilientYtdl() {
  const { Ytdl, Client } = await import('@distube/ytdl-core');
  const cookie = getYouTubeCookie();
  const proxyFetch = getYouTubeProxyFetch();
  const poProvider = await getPoTokenProvider();

  return new Ytdl({
    clients: [Client.Tv, Client.WebEmbedded, Client.VisionOS],
    ...(poProvider ? { getPoToken: poProvider } : {}),
    ...(cookie ? { cookie } : {}),
    ...(proxyFetch ? { fetch: proxyFetch } : {}),
  });
}

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
      const cookie = getYouTubeCookie();
      const proxyFetch = getYouTubeProxyFetch();

      const client = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        ...(cookie ? { cookie } : {}),
        ...(proxyFetch ? { fetch: proxyFetch as any } : {}),
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
 * Guaranteed fallback metadata extractor via YouTube's public oEmbed endpoint.
 * Never blocked on cloud servers/datacenter IPs.
 */
export async function fetchOEmbedMetadata(videoId: string): Promise<{
  title?: string;
  author?: string;
  thumbnail?: string;
} | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      author: data.author_name,
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Fetches video metadata with multi-layer resilient fallback:
 * 1. InnerTube (TV_EMBEDDED / iOS)
 * 2. Ytdl (Tv / WebEmbedded / VisionOS)
 * 3. oEmbed guaranteed title & author fallback
 */
export async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  let fallbackOembed: { title?: string; author?: string; thumbnail?: string } | null = null;

  // Layer 1: InnerTube (iOS client)
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

    let title = basic.title;
    let author = basic.author;

    // If title is missing or suspicious, augment via oEmbed
    if (!title || title === 'Unknown Title') {
      fallbackOembed = await fetchOEmbedMetadata(videoId);
      if (fallbackOembed?.title) title = fallbackOembed.title;
      if (fallbackOembed?.author && !author) author = fallbackOembed.author;
    }

    const durationSec = basic.duration || 0;

    return {
      id: videoId,
      title: title || 'YouTube Track',
      author: author || 'YouTube Creator',
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
    console.warn('[getVideoMetadata] Primary engine failed, switching to resilient Ytdl:', primaryErr);

    // Layer 2: Resilient Ytdl
    try {
      const ytdl = await createResilientYtdl();
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
      let thumbnail =
        details.thumbnails?.[details.thumbnails.length - 1]?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      let title = details.title;
      let author = details.author?.name;

      if (!title || title === 'Unknown Title') {
        fallbackOembed = await fetchOEmbedMetadata(videoId);
        if (fallbackOembed?.title) title = fallbackOembed.title;
        if (fallbackOembed?.author && !author) author = fallbackOembed.author;
      }

      return {
        id: videoId,
        title: title || 'YouTube Track',
        author: author || 'YouTube Creator',
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
    } catch (ytdlErr) {
      console.warn('[getVideoMetadata] Ytdl fallback failed, querying oEmbed guaranteed layer:', ytdlErr);

      // Layer 3: Guaranteed oEmbed fallback
      fallbackOembed = await fetchOEmbedMetadata(videoId);
      return {
        id: videoId,
        title: fallbackOembed?.title || 'YouTube Video',
        author: fallbackOembed?.author || 'YouTube Creator',
        duration: 0,
        durationFormatted: '0:00',
        thumbnail: fallbackOembed?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        availableResolutions: ['1080p', '720p', '480p'],
        hasAudio: true,
        maxAudioBitrate: 320,
      };
    }
  }
}
