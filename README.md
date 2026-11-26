# YT-LOAD // Zero-Ad High-Fidelity YouTube & YouTube Music Transcoder

[![License: MIT](https://img.shields.io/badge/License-MIT-F27D72.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-F5B041.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16%2B%20App%20Router-4A635D.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-2E433E.svg)](https://www.typescriptlang.org/)
[![Theme: Cyber Yellow](https://img.shields.io/badge/Theme-Cyber%20Yellow%20Neo--Brutalist-FFE600.svg)](#visual-design-cyber-yellow-neo-brutalist)

A complete, production-ready, open-source, **zero-ad** web application in **100% Node.js / TypeScript** for extracting and downloading YouTube and YouTube Music tracks and videos in the highest available quality (**MP3 320kbps**, **FLAC Lossless**, **OPUS Original**, **M4A High Quality**, and **1080p / 4K Ultra HD MP4**).

---

## ⚡ Key Features

- **Zero Ads, Zero Popups, Zero Tracking:** Free forever, privacy-respecting, and fully self-hostable.
- **Pure 100% Node.js / TypeScript:** Unified Next.js App Router codebase for frontend, API routes, and media transcoding pipelines.
- **Dual-Engine Resilient Pipeline:** Integrates InnerTube session caching with `@distube/ytdl-core` stream routing to eliminate YouTube 403 Forbidden blocks and decipher throttles on long movies, age-gated, and region-restricted videos.
- **Embedded FFmpeg (`ffmpeg-static`):** Requires **zero** system-level FFmpeg installation on the host machine. Automatic precompiled binary detection across Linux, macOS, and Windows.
- **Highest Audio Quality:**
  - **MP3 320kbps (CBR):** Full-range LAME transcode with embedded ID3v2 metadata (track title, artist, album, and high-res front cover art).
  - **FLAC Lossless:** Studio 24-bit PCM container transcode.
  - **M4A (AAC 256kbps):** Native Apple ecosystem playback.
  - **OPUS (160kbps):** Raw YouTube Opus master bitstream passthrough.
- **Adaptive Video + Audio Muxing (1080p, 1440p, 4K):** Merges YouTube adaptive high-res video-only streams with 320kbps audio into a single MP4 container without video re-encoding (`-c:v copy`).
- **Real-Time Dot-Matrix Progress Visualizer:** Interactive retro pixel grid powered by **Server-Sent Events (SSE)** (`/api/progress`) streaming live download & transcode telemetry without polling.
- **Production Hardened:** Automatic temp file garbage collection (`os.tmpdir()`), client abort cancellation, and sliding-window rate limiting.

---

## 🎨 Visual Design (Cyber Yellow Neo-Brutalist)

The UI is built strictly around a high-contrast developer terminal aesthetic:
- **Primary Canvas Background:** Pitch Black / Charcoal (`#0B0D0F`) with subtle 28px engineering grid pattern.
- **Elevated Panels:** Dark Graphite (`#13161A`) with sharp `2px solid #272C35` borders and hard drop shadows (`#000000`).
- **Primary CTA Accent:** High-Voltage Electric Yellow (`#FFE600`) with high-contrast dark text (`#000000`) and tactile offset press interaction.
- **Telemetry Highlights:** Warm Amber (`#F59E0B`), Gold, and Pure White.
- **Dot-Matrix Stream Visualizer:** 36x10 interactive pixel grid featuring idle waveform scans and progressive dual-tone illumination in Electric Yellow and Amber during media processing.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18.x, 20.x, or 22+ LTS
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/nishan-bajagain/yt-load.git
cd yt-load
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm run start
```

---

## 🐳 Docker Deployment

### One-Command Run
```bash
docker run -d \
  --name yt-load \
  -p 3000:3000 \
  --restart always \
  ghcr.io/nishan-bajagain/yt-load:latest
```

### Docker Compose
Create a `docker-compose.yml`:
```yaml
version: '3.8'

services:
  yt-load:
    build: .
    container_name: yt-load
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=2G
```
Start the service:
```bash
docker compose up -d
```

---

## 📐 Architecture & Repository Structure

```
yt-load/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── download/
│   │   │   │   └── route.ts      # Streaming download & muxing response
│   │   │   ├── info/
│   │   │   │   └── route.ts      # POST endpoint returning track metadata & presets
│   │   │   └── progress/
│   │   │       └── route.ts      # Server-Sent Events (SSE) live telemetry feed
│   │   ├── globals.css           # Neo-Brutalist theme variables & scrollbars
│   │   ├── layout.tsx            # Space Grotesk & JetBrains Mono font loading
│   │   └── page.tsx              # Main UI with interactive format selector
│   ├── components/
│   │   ├── MatrixVisualizer.tsx  # 360-dot interactive pixel progress matrix
│   │   ├── PresetsModal.tsx      # Declarative preset documentation modal
│   │   └── SelfHostModal.tsx     # Docker & self-host guide modal
│   └── lib/
│       ├── downloader.ts         # Streaming audio transcode & MP4 muxing pipeline
│       ├── innertube.ts          # Singleton YouTube.js client & metadata parser
│       ├── presets.ts            # Declarative presets array (beginner PR friendly)
│       ├── progress.ts           # Global SSE event emitter bus
│       └── security.ts           # URL validation, filename sanitizer & rate limiting
├── Dockerfile                    # Multi-stage production container
├── CONTRIBUTING.md               # Guide for open-source contributors
└── README.md
```

---

## 🤝 Contributing & Adding New Format Presets

We welcome open-source contributions! Adding a new audio or video format preset takes just 10 lines of code in `src/lib/presets.ts`. See [CONTRIBUTING.md](./CONTRIBUTING.md) for full instructions.

---

## ⚡ Support & Donate via Bitcoin

YT-LOAD is 100% free, zero-ad, and self-funded. If this project saves you time or server costs, consider supporting development via Bitcoin:

- **⚡ Lightning Network (Instant / Zero Fee):** `trainedsled305@walletofsatoshi.com`
- **⛓️ Bitcoin On-Chain (SegWit / Taproot):** `bc1pzwkcx7g5vzw8f7027wlh0egtsx2w3tukwrpmmx607e63efusk0ms20kyny`

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE). Zero tracking, zero ads, free forever.
