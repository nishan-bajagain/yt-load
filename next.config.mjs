/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native Node.js modules (FFmpeg, worker threads, streams) out of the webpack bundle.
  // Required for ytdl-core's BotGuard worker thread and fluent-ffmpeg binary resolution.
  serverExternalPackages: [
    'fluent-ffmpeg',
    'ffmpeg-static',
    'youtubei.js',
    '@distube/ytdl-core',
    'meriyah',
    'undici',
  ],

  // Vercel: allow long-running download+mux operations (seconds).
  // Hobby plan: max 60s. Pro plan: max 300s. Set conservatively here.
  // Override per-route with `export const maxDuration = 300` in the route file.
  experimental: {},

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '*.ytimg.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
