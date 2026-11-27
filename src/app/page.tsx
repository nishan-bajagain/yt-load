'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Search,
  ClipboardPaste,
  Download,
  Music,
  Film,
  Zap,
  AlertTriangle,
  Sliders,
  Server,
  Check,
  Clock,
  Eye,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Headphones,
  HardDrive,
  FileAudio,
  FileVideo,
  Volume2,
  Layers,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { PresetsModal } from '@/components/PresetsModal';
import { SelfHostModal } from '@/components/SelfHostModal';
import { DonationModal } from '@/components/DonationModal';
import { FeaturesSection } from '@/components/FeaturesSection';
import { FAQSection } from '@/components/FAQSection';
import { VideoMetadata } from '@/lib/innertube';
import { Preset } from '@/lib/presets';
import { ProgressEventData } from '@/lib/progress';

interface PresetWithEstimate extends Preset {
  estimatedSize: string;
  isAvailable?: boolean;
}

interface FullMetadataResponse extends VideoMetadata {
  presets: {
    audio: PresetWithEstimate[];
    video: PresetWithEstimate[];
  };
}

async function readServerError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (contentType.includes('application/json')) {
    try {
      const payload = JSON.parse(raw);
      if (typeof payload.error === 'string') return payload.error;
      if (typeof payload.message === 'string') return payload.message;
    } catch {
      // Fall through to the safe status-based message.
    }
  }

  // Vercel/Next can return a complete HTML 500/504 document when the function
  // crashes or times out. Never render that implementation detail in the UI.
  if (/<(?:!doctype|html|head|body)\b/i.test(raw) || contentType.includes('text/html')) {
    if (response.status === 504 || response.status === 524) {
      return 'The hosting function timed out while processing this media. Try a shorter video or use a self-hosted deployment.';
    }
    if (response.status >= 500) {
      return 'The hosting function failed before returning a media error. Check the Vercel function logs, then try again with a public video.';
    }
  }

  const message = raw.replace(/^Download error:\s*/i, '').trim();
  return message.length > 0 && message.length < 500
    ? message
    : `Download failed with HTTP ${response.status}.`;
}

export default function Home() {
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FullMetadataResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'audio' | 'video'>('audio');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('mp3-320');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ProgressEventData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Modals state
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isSelfHostModalOpen, setIsSelfHostModalOpen] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

  const downloadAbortRef = useRef<AbortController | null>(null);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      downloadAbortRef.current?.abort();
    };
  }, []);

  // Fetch video metadata
  const handleFetchMetadata = async (targetUrl?: string) => {
    const rawUrl = targetUrl || urlInput;
    if (!rawUrl || !rawUrl.trim()) {
      setErrorMessage('Please enter or paste a valid YouTube or YouTube Music link.');
      return;
    }

    setIsLoadingInfo(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze video stream.');
      }

      setMetadata(data.data);

      if (activeTab === 'audio') {
        setSelectedPresetId(data.data.presets.audio[0]?.id || 'mp3-320');
      } else {
        const availableVideo = data.data.presets.video.find((v: PresetWithEstimate) => v.isAvailable);
        setSelectedPresetId(availableVideo?.id || 'mp4-1080p');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with YouTube extraction service.');
      setMetadata(null);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Instant clipboard paste
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 1500);
        handleFetchMetadata(text);
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  // Download through fetch so the browser can observe errors and bytes received.
  // This works on Vercel too: it does not depend on a second lambda sharing the
  // in-memory SSE progress manager with the download lambda.
  const handleStartDownload = async () => {
    if (!metadata) return;

    const currentPresets = activeTab === 'audio' ? metadata.presets.audio : metadata.presets.video;
    const selectedPreset = currentPresets.find((p) => p.id === selectedPresetId);
    if (!selectedPreset) return;

    const jobId = 'job_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

    downloadAbortRef.current?.abort();
    const abortController = new AbortController();
    downloadAbortRef.current = abortController;
    setIsDownloading(true);
    setErrorMessage(null);
    setDownloadProgress({
      jobId,
      status: 'initializing',
      percent: 5,
      phase: 'Routing Media Pipeline',
      message: 'Connecting to the cookie-free media engine...',
    });

    const downloadEndpoint = `/api/download?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${metadata.id}`
    )}&preset=${encodeURIComponent(selectedPreset.id)}&jobId=${encodeURIComponent(jobId)}`;

    try {
      const response = await fetch(downloadEndpoint, {
        signal: abortController.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const message = await readServerError(response);
        throw new Error(message || `Download failed with HTTP ${response.status}.`);
      }

      if (!response.body) throw new Error('The server returned an empty download stream.');

      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      const totalBytes = Number(
        response.headers.get('content-length') || response.headers.get('x-estimated-bytes') || 0
      );
      let receivedBytes = 0;
      let lastPercent = 5;
      let lastUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.byteLength;
          const now = Date.now();
          if (now - lastUpdate > 120 || receivedBytes === totalBytes) {
            lastUpdate = now;
            const percent = totalBytes
              ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100))
              : Math.min(95, Math.max(12, lastPercent + 1));
            lastPercent = percent;
            setDownloadProgress({
              jobId,
              status: 'downloading',
              percent,
              phase: activeTab === 'video' ? 'Downloading & Packaging Video' : 'Downloading & Encoding Audio',
              bytesDownloaded: receivedBytes,
              totalBytes: totalBytes || undefined,
              message: totalBytes
                ? `${(receivedBytes / 1024 / 1024).toFixed(1)} MB of ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
                : `${(receivedBytes / 1024 / 1024).toFixed(1)} MB received`,
            });
          }
        }
      }

      const contentType = response.headers.get('content-type') || selectedPreset.mimeType;
      const blob = new Blob(chunks, { type: contentType });
      const contentDisposition = response.headers.get('content-disposition') || '';
      const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
      const filename = encodedName ? decodeURIComponent(encodedName) : plainName || `yt-load.${selectedPreset.format}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadProgress({ jobId, status: 'completed', percent: 100, phase: 'Completed', message: 'Download ready!' });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setDownloadProgress({ jobId, status: 'error', percent: 0, phase: 'Download Failed', message: err?.message || 'The media server could not complete this download.' });
        setErrorMessage(err?.message || 'The media server could not complete this download.');
      }
    } finally {
      setIsDownloading(false);
      if (downloadAbortRef.current === abortController) downloadAbortRef.current = null;
    }
  };

  const currentPresetList = metadata?.presets?.[activeTab] || [];

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-[#090A0E]/90 backdrop-blur-xl sticky top-0 z-40 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold shadow-md shadow-amber-500/20 group-hover:bg-amber-300 transition-colors">
              <Zap className="w-4 h-4 fill-black" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white tracking-tight font-['Space_Grotesk']">
                YT-LOAD
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-400 font-semibold tracking-wider">
                PRO OSS
              </span>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm text-slate-300 font-medium">
            <a href="#features" className="hover:text-amber-400 transition-colors">
              Features
            </a>
            <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Presets
            </button>
            <a href="#how-it-works" className="hover:text-amber-400 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">
              FAQ
            </a>
            <button
              onClick={() => setIsSelfHostModalOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Self-Host
            </button>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setIsDonationModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm hover:border-amber-400"
            >
              <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Donate (BTC)</span>
            </button>

            <a
              href="https://github.com/nishan-bajagain/yt-load"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center space-x-2 transition-all hover:border-amber-400/40"
            >
              <svg className="w-4 h-4 fill-current text-amber-400" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-12 pb-20 space-y-16 relative z-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero Ads • 320 kbps MP3 & Lossless FLAC • 4K MP4</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-['Space_Grotesk'] leading-[1.15]">
            Download YouTube Media in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
              Studio Quality.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Extract pure 320kbps MP3s with embedded album artwork, studio 24-bit FLAC, and uncompressed 4K MP4 video streams. Fast, free forever, and zero tracking.
          </p>
        </div>

        {/* Hero Input Card */}
        <div className="bg-[#12141A]/90 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchMetadata();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            {/* Input Field */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-amber-400/80" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste YouTube or YouTube Music link (e.g. https://www.youtube.com/watch?v=...)"
                className="w-full pl-11 pr-24 py-3.5 bg-[#090A0E] border border-white/10 rounded-xl text-white text-sm placeholder-slate-400/50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-sans"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste from clipboard"
                className="absolute inset-y-2 right-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Pasted</span>
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                    <span>Paste</span>
                  </>
                )}
              </button>
            </div>

            {/* Fetch Button */}
            <button
              type="submit"
              disabled={isLoadingInfo}
              className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoadingInfo ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Download Media</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Sample Links */}
          <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">Try sample:</span>
            <button
              type="button"
              onClick={() => {
                setUrlInput('https://www.youtube.com/watch?v=jNQXAC9IVRw');
                handleFetchMetadata('https://www.youtube.com/watch?v=jNQXAC9IVRw');
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Me at the zoo
            </button>
            <button
              type="button"
              onClick={() => {
                setUrlInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                handleFetchMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Never Gonna Give You Up (4K)
            </button>
            <button
              type="button"
              onClick={() => {
                setUrlInput('https://www.youtube.com/watch?v=p0nzpK9QsP4');
                handleFetchMetadata('https://www.youtube.com/watch?v=p0nzpK9QsP4');
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Protected Movie Stream
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-sm text-rose-300 animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-200 block">Unable to Process Media</span>
              <p className="text-xs text-rose-300/80 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Media Preview & Format Selector Card */}
        {metadata && (
          <div className="bg-[#12141A]/90 border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6 animate-in fade-in duration-300">
            {/* Top Media Info Bar */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Thumbnail */}
              <div className="relative w-full md:w-64 aspect-video bg-black/40 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-lg group">
                <Image
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[11px] text-white font-medium flex items-center space-x-1 border border-white/10">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{metadata.durationFormatted}</span>
                </div>
              </div>

              {/* Title & Channel details */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
                    {metadata.maxAudioBitrate} kbps Audio Master
                  </span>
                  {metadata.viewCount && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs flex items-center space-x-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      <span>{Number(metadata.viewCount).toLocaleString()} views</span>
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-2xl font-bold text-white font-['Space_Grotesk'] leading-snug">
                  {metadata.title}
                </h2>

                <p className="text-sm text-slate-400 flex items-center space-x-2">
                  <span>Channel:</span>
                  <span className="text-amber-400 font-semibold">{metadata.author}</span>
                </p>

                {metadata.availableResolutions.length > 0 && (
                  <div className="text-xs text-slate-400 flex flex-wrap gap-1.5 items-center pt-1">
                    <span className="text-slate-400 font-medium">Resolutions:</span>
                    {metadata.availableResolutions.map((res, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 text-[11px]">
                        {res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quality Selector Tabs */}
            <div className="border-t border-white/10 pt-6 space-y-5">
              {/* Segmented Switcher */}
              <div className="flex items-center space-x-2 p-1 rounded-xl bg-black/40 border border-white/5 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('audio');
                    setSelectedPresetId(metadata.presets.audio[0]?.id || 'mp3-320');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                    activeTab === 'audio'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  <span>Audio Transcodes ({metadata.presets.audio.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('video');
                    const firstAvail = metadata.presets.video.find((v) => v.isAvailable);
                    setSelectedPresetId(firstAvail?.id || 'mp4-1080p');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                    activeTab === 'video'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  <span>Video & Muxing ({metadata.presets.video.length})</span>
                </button>
              </div>

              {/* Format Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentPresetList.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isAvailable = preset.isAvailable !== false;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (isAvailable) setSelectedPresetId(preset.id);
                      }}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative ${
                        !isAvailable
                          ? 'opacity-40 bg-white/5 border-white/5 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-400/10 border-amber-400 shadow-md shadow-amber-500/10'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400 text-black'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <span className="font-bold text-white text-sm">{preset.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-amber-400 text-xs font-semibold font-mono">
                            ~{preset.estimatedSize}
                          </span>
                          {preset.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                              {preset.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-amber-400/90 font-mono mb-1.5 font-medium">
                        {preset.tag}
                      </div>

                      <p className="text-xs text-slate-400 leading-normal">
                        {preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Progress Container (Active during download) */}
              {isDownloading && (
                <div className="p-4 rounded-xl bg-black/50 border border-amber-400/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-amber-400 flex items-center space-x-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>{downloadProgress?.phase || 'Processing Stream'}</span>
                    </span>
                    <span className="text-white font-mono">{downloadProgress?.percent || 0}%</span>
                  </div>

                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-200 rounded-full"
                      style={{ width: `${Math.max(5, downloadProgress?.percent || 0)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{downloadProgress?.message || 'Streaming bitstream directly to client...'}</span>
                    {downloadProgress?.timemark && (
                      <span className="font-mono text-white">Time: {downloadProgress.timemark}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Download Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleStartDownload}
                  className="w-full py-4 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
                >
                  {isDownloading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Transcoding in Progress...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>
                        Save {metadata.presets[activeTab].find((p) => p.id === selectedPresetId)?.tag || 'Media File'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works (3 Steps) */}
        <section id="how-it-works" className="w-full py-6 scroll-mt-20">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight font-['Space_Grotesk']">
              How It Works
            </h2>
            <p className="text-sm text-slate-400">
              Three effortless steps from URL to high-fidelity audio or 4K video.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-xl bg-[#12141A]/60 border border-white/5 space-y-2.5 text-center">
              <div className="w-9 h-9 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold mx-auto">
                1
              </div>
              <h3 className="font-bold text-white text-base">Paste Any YouTube Link</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Works with standard videos, YouTube Music tracks, and YouTube Shorts links.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#12141A]/60 border border-white/5 space-y-2.5 text-center">
              <div className="w-9 h-9 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold mx-auto">
                2
              </div>
              <h3 className="font-bold text-white text-base">Select Desired Format</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose MP3 320k, studio FLAC, Apple M4A, or 4K/1080p MP4 with exact size previews.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#12141A]/60 border border-white/5 space-y-2.5 text-center">
              <div className="w-9 h-9 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center font-bold mx-auto">
                3
              </div>
              <h3 className="font-bold text-white text-base">Instant Direct Stream</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                High-speed transcoding begins immediately without waiting queues or popup ads.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />

        {/* Support via Bitcoin Callout Banner */}
        <section className="w-full py-6">
          <div className="p-7 sm:p-8 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#12141A] to-amber-500/5 border border-amber-400/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-xs font-semibold">
                <Heart className="w-3.5 h-3.5 fill-amber-400" />
                <span>Support Zero-Ad Open Source</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                Help Us Keep YT-LOAD Free & Fast
              </h3>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                We refuse to inject banner ads or trackers. Your voluntary Bitcoin (Lightning or On-chain) contributions directly fund high-bandwidth transcoding infrastructure.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDonationModalOpen(true)}
              className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Donate via BTC / Lightning</span>
            </button>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#090A0E] text-slate-400 text-xs py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <span className="font-bold text-white text-sm">YT-LOAD</span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-amber-400 text-[10px] font-semibold">
                MIT License
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Zero-ad open-source YouTube & YouTube Music audio transcoder and video muxing engine.
            </p>
          </div>

          <div className="flex items-center space-x-6 text-slate-400 font-medium">
            <button
              onClick={() => setIsDonationModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Heart className="w-3.5 h-3.5 fill-amber-400" />
              <span>Donate (BTC)</span>
            </button>
            <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Presets
            </button>
            <button
              onClick={() => setIsSelfHostModalOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Self-Host
            </button>
            <a
              href="https://github.com/nishan-bajagain/yt-load"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
      />
      <SelfHostModal
        isOpen={isSelfHostModalOpen}
        onClose={() => setIsSelfHostModalOpen(false)}
      />
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
      />
    </div>
  );
}
