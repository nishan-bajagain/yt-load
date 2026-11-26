import { Readable, PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { getInnertube, createResilientYtdl, getVideoMetadata } from './innertube';
import { Preset } from './presets';
import { progressManager } from './progress';
import { sanitizeFilename } from './security';

// Configure FFmpeg binary path
const ffmpegBinary =
  typeof ffmpegStatic === 'string'
    ? ffmpegStatic
    : (ffmpegStatic as any)?.default || ffmpegStatic;

if (ffmpegBinary) {
  ffmpeg.setFfmpegPath(ffmpegBinary);
}

export interface DownloadResult {
  stream: Readable;
  filename: string;
  mimeType: string;
  cleanup?: () => Promise<void>;
}

/**
 * Downloads thumbnail from URL and writes to a temp file for FFmpeg ID3 artwork embedding.
 */
async function downloadThumbnailToTemp(url: string, id: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const tempPath = path.join(os.tmpdir(), `yt-load-cover-${id}.jpg`);
    await fs.promises.writeFile(tempPath, Buffer.from(arrayBuffer));
    return tempPath;
  } catch (err) {
    console.warn('[Downloader] Failed to fetch thumbnail for artwork embedding:', err);
    return null;
  }
}

/**
 * Robust audio stream resolver with high-fidelity bitstream pipeline.
 */
async function getResilientAudioStream(videoId: string, _info?: any): Promise<Readable> {
  const ytdl = await createResilientYtdl();
  return ytdl.download(`https://www.youtube.com/watch?v=${videoId}`, {
    quality: 'highestaudio',
  });
}

/**
 * Robust video stream resolver with high-definition resolution targeting.
 */
async function getResilientVideoStream(videoId: string, _info: any, targetResolution: string): Promise<Readable> {
  const ytdl = await createResilientYtdl();
  try {
    return await ytdl.download(`https://www.youtube.com/watch?v=${videoId}`, {
      filter: (f) =>
        f.hasVideo && !f.hasAudio && Boolean(f.qualityLabel && f.qualityLabel.includes(targetResolution)),
    });
  } catch (e) {
    return await ytdl.download(`https://www.youtube.com/watch?v=${videoId}`, {
      quality: 'highestvideo',
    });
  }
}

/**
 * Streams audio, transcodes to target format (MP3, FLAC, M4A) with metadata,
 * or passes through raw Opus bitstream.
 */
export async function processAudioDownload(
  videoId: string,
  preset: Preset,
  jobId?: string,
  abortSignal?: AbortSignal
): Promise<DownloadResult> {
  const sessionId = uuidv4();
  const currentJobId = jobId || sessionId;

  progressManager.emit({
    jobId: currentJobId,
    status: 'initializing',
    percent: 5,
    phase: 'Resolving Audio Stream',
    message: 'Connecting to high-fidelity audio engine...',
  });

  // Multi-tier resilient metadata acquisition
  const metadata = await getVideoMetadata(videoId);
  const title = metadata.title || 'audio';
  const author = metadata.author || 'YouTube';
  const duration = metadata.duration || 0;
  const thumbUrl = metadata.thumbnail;

  const safeTitle = sanitizeFilename(title, 'audio');
  const filename = `${safeTitle}.${preset.format}`;

  // Resilient stream resolution
  let nodeInStream: Readable;
  try {
    nodeInStream = await getResilientAudioStream(videoId);
  } catch (e) {
    const ytdl = await createResilientYtdl();
    nodeInStream = await ytdl.download(`https://www.youtube.com/watch?v=${videoId}`, {
      quality: 'highestaudio',
    });
  }

  // Direct OPUS passthrough
  if (preset.id === 'opus-raw') {
    progressManager.emit({
      jobId: currentJobId,
      status: 'downloading',
      percent: 50,
      phase: 'Direct Stream Passthrough',
      message: 'Streaming raw OPUS bitstream directly to client...',
    });

    let streamedBytes = 0;
    const pass = new PassThrough();

    nodeInStream.on('data', (chunk) => {
      streamedBytes += chunk.length;
      progressManager.emit({
        jobId: currentJobId,
        status: 'downloading',
        percent: 75,
        phase: 'Direct Streaming',
        bytesDownloaded: streamedBytes,
        message: `Transferred ${(streamedBytes / 1024 / 1024).toFixed(1)} MB`,
      });
    });

    nodeInStream.on('end', () => {
      progressManager.emit({
        jobId: currentJobId,
        status: 'completed',
        percent: 100,
        phase: 'Completed',
        message: 'Download ready!',
      });
    });

    nodeInStream.pipe(pass);

    return {
      stream: pass,
      filename,
      mimeType: preset.mimeType,
    };
  }

  // Artwork download
  let coverPath: string | null = null;
  if (thumbUrl) {
    coverPath = await downloadThumbnailToTemp(thumbUrl, sessionId);
  }

  progressManager.emit({
    jobId: currentJobId,
    status: 'transcoding',
    percent: 25,
    phase: 'Encoding & ID3 Tagging',
    message: `Encoding ${preset.name} with studio metadata...`,
  });

  const outStream = new PassThrough();
  const cmd = ffmpeg(nodeInStream);

  if (coverPath && preset.format === 'mp3') {
    cmd.input(coverPath)
      .outputOptions('-c:a', 'libmp3lame')
      .outputOptions('-b:a', '320k')
      .outputOptions('-map', '0:a')
      .outputOptions('-map', '1:v')
      .outputOptions('-c:v', 'copy')
      .outputOptions('-id3v2_version', '3')
      .outputOptions('-metadata', `title=${title}`)
      .outputOptions('-metadata', `artist=${author}`)
      .outputOptions('-metadata', `album=${author}`)
      .outputOptions('-metadata:s:v', 'title=Album cover')
      .outputOptions('-metadata:s:v', 'comment=Cover (front)')
      .format('mp3');
  } else if (preset.format === 'mp3') {
    cmd.audioCodec('libmp3lame')
      .audioBitrate(320)
      .outputOptions('-id3v2_version', '3')
      .outputOptions('-metadata', `title=${title}`)
      .outputOptions('-metadata', `artist=${author}`)
      .outputOptions('-metadata', `album=${author}`)
      .format('mp3');
  } else if (preset.format === 'flac') {
    cmd.audioCodec('flac')
      .outputOptions('-metadata', `title=${title}`)
      .outputOptions('-metadata', `artist=${author}`)
      .format('flac');
  } else if (preset.format === 'm4a') {
    cmd.audioCodec('aac')
      .audioBitrate(256)
      .outputOptions('-metadata', `title=${title}`)
      .outputOptions('-metadata', `artist=${author}`)
      .outputOptions('-movflags', 'frag_keyframe+empty_moov')
      .format('mp4');
  }

  // Handle FFmpeg progress
  cmd.on('progress', (p) => {
    let percent = p.percent || 0;
    if (!percent && p.timemark && duration > 0) {
      const parts = p.timemark.split(':');
      if (parts.length === 3) {
        const secs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        percent = Math.min(98, Math.round((secs / duration) * 100));
      }
    }
    progressManager.emit({
      jobId: currentJobId,
      status: 'transcoding',
      percent: Math.max(30, Math.min(95, Math.round(percent))),
      phase: 'DSP Transcode',
      timemark: p.timemark,
      message: `Processing audio bitstream at ${p.currentKbps || preset.bitrate || 320} kbps`,
    });
  });

  const cleanup = async () => {
    if (coverPath) {
      try {
        await fs.promises.rm(coverPath, { force: true });
      } catch (e) {
        // ignore
      }
    }
  };

  cmd.on('end', async () => {
    progressManager.emit({
      jobId: currentJobId,
      status: 'completed',
      percent: 100,
      phase: 'Completed',
      message: 'Audio transcode complete!',
    });
    await cleanup();
  });

  cmd.on('error', async (err) => {
    console.error('[FFmpeg Audio Error]:', err);
    progressManager.emit({
      jobId: currentJobId,
      status: 'error',
      percent: 0,
      phase: 'Error',
      message: `Audio encoding error: ${err.message}`,
    });
    await cleanup();
    outStream.destroy(err);
  });

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      try {
        cmd.kill('SIGKILL');
      } catch (e) {
        // ignore
      }
      cleanup();
    });
  }

  cmd.pipe(outStream, { end: true });

  return {
    stream: outStream,
    filename,
    mimeType: preset.mimeType,
    cleanup,
  };
}

/**
 * Downloads adaptive video and audio streams, muxes them into an MP4 container,
 * with automatic fallback to Ytdl if InnerTube encounters 403 or signature blocks.
 */
export async function processVideoMuxDownload(
  videoId: string,
  preset: Preset,
  jobId?: string,
  abortSignal?: AbortSignal
): Promise<DownloadResult> {
  const sessionId = uuidv4();
  const currentJobId = jobId || sessionId;

  const tempVideoPath = path.join(os.tmpdir(), `yt-load-v-${sessionId}.tmp`);
  const tempAudioPath = path.join(os.tmpdir(), `yt-load-a-${sessionId}.tmp`);
  const tempOutputPath = path.join(os.tmpdir(), `yt-load-out-${sessionId}.mp4`);

  const cleanup = async () => {
    const files = [tempVideoPath, tempAudioPath, tempOutputPath];
    for (const f of files) {
      try {
        await fs.promises.rm(f, { force: true });
      } catch (e) {
        // ignore
      }
    }
  };

  try {
    progressManager.emit({
      jobId: currentJobId,
      status: 'initializing',
      percent: 5,
      phase: 'Analyzing Video & Audio Streams',
      message: `Allocating pipeline for ${preset.resolution || 'HD'} stream...`,
    });

    const metadata = await getVideoMetadata(videoId);
    const title = metadata.title || 'video';
    const duration = metadata.duration || 0;

    const safeTitle = sanitizeFilename(title, 'video');
    const filename = `${safeTitle}.mp4`;
    const targetResolution = preset.resolution || '1080p';

    // Step 1: Download Video Stream
    progressManager.emit({
      jobId: currentJobId,
      status: 'downloading',
      percent: 15,
      phase: 'Buffering Video Stream',
      message: `Downloading ${targetResolution} video stream...`,
    });

    const nodeVideoStream = await getResilientVideoStream(videoId, undefined, targetResolution);
    const videoWriteStream = fs.createWriteStream(tempVideoPath);

    await new Promise<void>((resolve, reject) => {
      nodeVideoStream.pipe(videoWriteStream);
      nodeVideoStream.on('error', reject);
      videoWriteStream.on('finish', () => resolve());
      videoWriteStream.on('error', reject);
    });

    // Step 2: Download Audio Stream
    progressManager.emit({
      jobId: currentJobId,
      status: 'downloading',
      percent: 50,
      phase: 'Buffering Audio Track',
      message: 'Downloading studio master audio track...',
    });

    const nodeAudioStream = await getResilientAudioStream(videoId);
    const audioWriteStream = fs.createWriteStream(tempAudioPath);

    await new Promise<void>((resolve, reject) => {
      nodeAudioStream.pipe(audioWriteStream);
      nodeAudioStream.on('error', reject);
      audioWriteStream.on('finish', () => resolve());
      audioWriteStream.on('error', reject);
    });

    // Step 3: FFmpeg Muxing
    progressManager.emit({
      jobId: currentJobId,
      status: 'muxing',
      percent: 75,
      phase: 'Hardware-Assisted MP4 Muxing',
      message: 'Packaging MP4 container (-c:v copy -c:a aac -b:a 320k)...',
    });

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg()
        .input(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions('-c:v', 'copy')
        .outputOptions('-c:a', 'aac')
        .outputOptions('-b:a', '320k')
        .outputOptions('-movflags', '+faststart')
        .output(tempOutputPath);

      cmd.on('progress', (p) => {
        let percent = p.percent || 0;
        if (!percent && p.timemark && duration > 0) {
          const parts = p.timemark.split(':');
          if (parts.length === 3) {
            const secs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            percent = Math.min(99, Math.round((secs / duration) * 100));
          }
        }
        progressManager.emit({
          jobId: currentJobId,
          status: 'muxing',
          percent: Math.max(75, Math.min(98, Math.round(percent))),
          phase: 'Muxing MP4 Container',
          timemark: p.timemark,
          message: `Packaging media container (${p.timemark || ''})`,
        });
      });

      cmd.on('end', () => {
        progressManager.emit({
          jobId: currentJobId,
          status: 'completed',
          percent: 100,
          phase: 'Completed',
          message: 'Video muxing complete!',
        });
        resolve();
      });

      cmd.on('error', (err) => {
        console.error('[FFmpeg Mux Error]:', err);
        progressManager.emit({
          jobId: currentJobId,
          status: 'error',
          percent: 0,
          phase: 'Error',
          message: `Muxing failed: ${err.message}`,
        });
        reject(err);
      });

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          try {
            cmd.kill('SIGKILL');
          } catch (e) {
            // ignore
          }
          cleanup();
          reject(new Error('Muxing aborted by client'));
        });
      }

      cmd.run();
    });

    const fileReadStream = fs.createReadStream(tempOutputPath);
    fileReadStream.on('close', cleanup);
    fileReadStream.on('error', cleanup);

    return {
      stream: fileReadStream,
      filename,
      mimeType: preset.mimeType,
      cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
