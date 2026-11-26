export interface Preset {
  id: string;
  name: string;
  type: 'audio' | 'video';
  format: 'mp3' | 'flac' | 'm4a' | 'opus' | 'mp4';
  mimeType: string;
  bitrate?: number; // in kbps
  resolution?: string; // e.g. '2160p', '1080p'
  tag: string;
  badge?: string;
  description: string;
  audioCodec?: string;
  videoCodec?: string;
}

/**
 * Declarative array of download quality presets.
 * Easy entry point for open-source contributors to add new formats or codecs!
 */
export const AUDIO_PRESETS: Preset[] = [
  {
    id: 'mp3-320',
    name: 'MP3 High Quality',
    type: 'audio',
    format: 'mp3',
    mimeType: 'audio/mpeg',
    bitrate: 320,
    tag: '[ 320 KBPS MP3 ]',
    badge: 'POPULAR',
    description: 'Universal compatibility, constant 320kbps with ID3 metadata tags & album artwork.',
    audioCodec: 'libmp3lame',
  },
  {
    id: 'flac',
    name: 'FLAC Lossless',
    type: 'audio',
    format: 'flac',
    mimeType: 'audio/flac',
    bitrate: 850, // FLAC average estimation
    tag: '[ LOSSLESS FLAC ]',
    badge: 'STUDIO',
    description: 'Lossless audio container transcoded at 24-bit/48kHz studio depth with embedded artwork.',
    audioCodec: 'flac',
  },
  {
    id: 'm4a-aac',
    name: 'M4A High Quality',
    type: 'audio',
    format: 'm4a',
    mimeType: 'audio/mp4',
    bitrate: 256,
    tag: '[ 256 KBPS M4A ]',
    badge: 'APPLE ECOSYSTEM',
    description: 'Apple AAC container offering crystal-clear acoustic fidelity and native iTunes tagging.',
    audioCodec: 'aac',
  },
  {
    id: 'opus-raw',
    name: 'OPUS Original',
    type: 'audio',
    format: 'opus',
    mimeType: 'audio/opus',
    bitrate: 160,
    tag: '[ RAW OPUS 160K ]',
    badge: 'ORIGINAL STREAM',
    description: 'Direct stream passthrough of YouTube\'s highest-efficiency Opus master track.',
    audioCodec: 'copy',
  },
];

export const VIDEO_PRESETS: Preset[] = [
  {
    id: 'mp4-2160p',
    name: '4K Ultra HD',
    type: 'video',
    format: 'mp4',
    mimeType: 'video/mp4',
    resolution: '2160p',
    tag: '[ 2160P 4K MP4 ]',
    badge: '4K UHD',
    description: 'Maximum resolution 3840x2160 stream muxed with 320kbps AAC audio without re-encoding.',
    videoCodec: 'copy',
    audioCodec: 'aac',
  },
  {
    id: 'mp4-1440p',
    name: '1440p Quad HD',
    type: 'video',
    format: 'mp4',
    mimeType: 'video/mp4',
    resolution: '1440p',
    tag: '[ 1440P 2K MP4 ]',
    badge: '2K QHD',
    description: '2560x1440 2K stream muxed with high-bitrate audio.',
    videoCodec: 'copy',
    audioCodec: 'aac',
  },
  {
    id: 'mp4-1080p',
    name: '1080p Full HD',
    type: 'video',
    format: 'mp4',
    mimeType: 'video/mp4',
    resolution: '1080p',
    tag: '[ 1080P60 MP4 ]',
    badge: 'RECOMMENDED',
    description: '1920x1080 60FPS crisp stream muxed directly with 320kbps audio.',
    videoCodec: 'copy',
    audioCodec: 'aac',
  },
  {
    id: 'mp4-720p',
    name: '720p HD',
    type: 'video',
    format: 'mp4',
    mimeType: 'video/mp4',
    resolution: '720p',
    tag: '[ 720P HD MP4 ]',
    badge: 'FAST',
    description: '1280x720 balanced resolution for fast transfers and smaller storage.',
    videoCodec: 'copy',
    audioCodec: 'aac',
  },
  {
    id: 'mp4-480p',
    name: '480p SD',
    type: 'video',
    format: 'mp4',
    mimeType: 'video/mp4',
    resolution: '480p',
    tag: '[ 480P SD MP4 ]',
    badge: 'LIGHTWEIGHT',
    description: 'Standard definition 854x480 for mobile or low-bandwidth environments.',
    videoCodec: 'copy',
    audioCodec: 'aac',
  },
];

export const ALL_PRESETS: Preset[] = [...AUDIO_PRESETS, ...VIDEO_PRESETS];

/**
 * Finds a preset by ID.
 */
export function getPresetById(id: string): Preset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

/**
 * Estimates file size in MB or GB based on track duration and bitrate.
 */
export function estimateFileSize(preset: Preset, durationSeconds: number): string {
  if (!durationSeconds || durationSeconds <= 0) return '~MB';

  let totalBitrateKbps = 0;

  if (preset.type === 'audio') {
    totalBitrateKbps = preset.bitrate || 320;
  } else {
    // Video bitrate estimation table (in kbps)
    const videoBitrateMap: Record<string, number> = {
      '2160p': 18000,
      '1440p': 9000,
      '1080p': 4500,
      '720p': 2500,
      '480p': 1200,
    };
    const vBitrate = videoBitrateMap[preset.resolution || '1080p'] || 3000;
    const aBitrate = 192;
    totalBitrateKbps = vBitrate + aBitrate;
  }

  // (Kbps * 1000 / 8) * seconds = bytes
  const bytes = (totalBitrateKbps * 1000 / 8) * durationSeconds;
  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1000) {
    return `${(megabytes / 1024).toFixed(1)} GB`;
  }
  return `${megabytes.toFixed(1)} MB`;
}
