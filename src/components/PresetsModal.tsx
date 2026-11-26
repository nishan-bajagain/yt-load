'use client';

import React from 'react';
import { X, Sliders, Music, Film, Code2, Sparkles, CheckCircle2 } from 'lucide-react';
import { AUDIO_PRESETS, VIDEO_PRESETS } from '@/lib/presets';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#12141A] border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-[#0D0F14]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base font-['Space_Grotesk']">
                Format Presets Specification
              </h2>
              <p className="text-xs text-slate-400">
                Declarative presets configuration for open-source contributors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs leading-relaxed text-slate-300">
            <span className="text-amber-400 font-bold block mb-1">Declarative Architecture:</span>
            All presets in <code className="text-white bg-black/40 px-1.5 py-0.5 rounded font-mono">src/lib/presets.ts</code> are defined as simple objects. Anyone can add new formats, specialized sampling rates, or custom FFmpeg flags in less than 10 lines of code.
          </div>

          {/* Audio Presets */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Music className="w-4 h-4 text-amber-400" />
              <span>Audio Transcoding Profiles</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AUDIO_PRESETS.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-black/30 border border-white/5 hover:border-amber-400/30 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-sm">{p.name}</span>
                    <span className="text-amber-400 text-xs font-mono font-medium">
                      {p.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">{p.description}</p>
                  <div className="pt-1 text-[11px] text-slate-500 font-mono flex items-center space-x-2">
                    <span className="text-amber-400">Codec: {p.audioCodec?.toUpperCase()}</span>
                    <span>•</span>
                    <span>Bitrate: {p.bitrate} kbps</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Video Presets */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Film className="w-4 h-4 text-amber-400" />
              <span>Video Muxing Profiles</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {VIDEO_PRESETS.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-black/30 border border-white/5 hover:border-amber-400/30 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-sm">{p.name}</span>
                    <span className="text-amber-400 text-xs font-mono font-medium">
                      {p.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">{p.description}</p>
                  <div className="pt-1 text-[11px] text-slate-500 font-mono flex items-center space-x-2">
                    <span className="text-amber-400">Video: Stream Copy</span>
                    <span>•</span>
                    <span>Audio: 320k AAC</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PR Guide */}
          <div className="rounded-xl border border-white/10 p-4 bg-black/40 space-y-2.5">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
              <Code2 className="w-4 h-4" />
              <span>How to add a new preset in 10 lines:</span>
            </div>
            <p className="text-xs text-slate-400">
              Add your format object to <code className="text-white">src/lib/presets.ts</code>. The frontend UI detects and renders it automatically with live file size estimates.
            </p>
            <div className="p-3 bg-[#090A0E] rounded-lg border border-white/5 text-[11px] text-amber-300 font-mono overflow-x-auto">
              <code>{`{
  id: 'wav-master',
  name: 'WAV Studio Master',
  type: 'audio',
  format: 'wav',
  mimeType: 'audio/wav',
  bitrate: 1411,
  tag: '[ 1411 KBPS WAV ]',
  badge: 'PCM MASTER',
  description: 'Uncompressed audio for digital audio workstations.',
  audioCodec: 'pcm_s16le'
}`}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 bg-[#0D0F14] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
