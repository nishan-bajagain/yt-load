'use client';

import React from 'react';
import { X, Server, Terminal, ShieldCheck, Cpu } from 'lucide-react';

interface SelfHostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfHostModal: React.FC<SelfHostModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#12141A] border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-[#0D0F14]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base font-['Space_Grotesk']">
                Self-Hosting & Docker Guide
              </h2>
              <p className="text-xs text-slate-400">
                Run your own private, zero-tracking downloader instance anywhere
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
          {/* Quickstart via Docker */}
          <div className="rounded-xl border border-white/10 p-4 bg-black/30 space-y-2.5">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>One-Command Docker Deployment</span>
            </div>
            <p className="text-xs text-slate-400">
              Deploy in seconds without needing any system dependencies:
            </p>
            <div className="p-3 bg-[#090A0E] rounded-lg border border-white/5 text-[11px] text-amber-300 font-mono overflow-x-auto">
              <code>docker run -d --name yt-load -p 3000:3000 --restart always ghcr.io/nishan/yt-load:latest</code>
            </div>
          </div>

          {/* Docker Compose */}
          <div className="rounded-xl border border-white/10 p-4 bg-black/30 space-y-2.5">
            <div className="flex items-center space-x-2 text-white font-semibold text-xs">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Docker Compose Configuration</span>
            </div>
            <div className="p-3 bg-[#090A0E] rounded-lg border border-white/5 text-[11px] text-slate-300 font-mono overflow-x-auto">
              <code>{`version: '3.8'
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
      - /tmp:rw,noexec,nosuid,size=2G`}</code>
            </div>
          </div>

          {/* Bare Metal */}
          <div className="rounded-xl border border-white/10 p-4 bg-black/30 space-y-2.5">
            <div className="flex items-center space-x-2 text-white font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Runtime Specifications</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
              <li>Compatible with Node.js 18.x, 20.x, or 22+ LTS.</li>
              <li>
                <strong className="text-white">Zero FFmpeg installation needed:</strong> Packaged with
                <code className="text-amber-400 font-mono"> ffmpeg-static</code>, automatically detecting pre-compiled
                native binaries for Linux, macOS, and Windows.
              </li>
              <li>
                <strong className="text-white">Anti-403 Stream Resilience:</strong> Built-in dual stream routing guarantees smooth downloads across all regions.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 bg-[#0D0F14] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
