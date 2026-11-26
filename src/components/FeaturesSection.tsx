'use client';

import React from 'react';
import { Music, Film, ShieldCheck, Zap, Layers, Sparkles, Cpu, Radio } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Music,
      title: 'Studio 320 kbps MP3 & FLAC',
      description:
        'Professional LAME CBR 320kbps encoding and studio 24-bit FLAC PCM with automatic ID3v2 metadata injection and embedded high-res cover art.',
      badge: 'AUDIO MASTER',
      gradient: 'from-amber-400/20 to-orange-500/5',
      iconColor: 'text-amber-400',
    },
    {
      icon: Film,
      title: 'Lossless 4K & 1080p Muxing',
      description:
        'Merge adaptive high-definition video-only streams with pristine 320kbps audio into a universal MP4 container without video re-compression (-c:v copy).',
      badge: 'ULTRA HD',
      gradient: 'from-amber-500/20 to-yellow-500/5',
      iconColor: 'text-amber-400',
    },
    {
      icon: Zap,
      title: 'Anti-403 Dual-Core Pipeline',
      description:
        'Bypasses YouTube CDN rate limits and bot-guard throttling on long movies, age-restricted videos, and music with automatic stream failover.',
      badge: 'HIGH RELIABILITY',
      gradient: 'from-yellow-400/20 to-amber-600/5',
      iconColor: 'text-yellow-400',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Ads & Zero Tracking',
      description:
        'No popups, no tracking cookies, and no third-party telemetry scripts. Media streams directly through your browser session with zero data harvesting.',
      badge: '100% PRIVATE',
      gradient: 'from-amber-400/20 to-emerald-500/5',
      iconColor: 'text-amber-300',
    },
  ];

  return (
    <section id="features" className="w-full py-10 scroll-mt-20">
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Core Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-['Space_Grotesk']">
          Engineered for Pure Audio & Video Fidelity
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          High-performance streaming engine built on modern Node.js, native FFmpeg, and dual-layer YouTube extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-5xl mx-auto">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl bg-gradient-to-br ${feat.gradient} bg-[#12141A] border border-white/10 hover:border-amber-400/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 group`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className={`w-5 h-5 ${feat.iconColor}`} />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-bold text-amber-400 tracking-wider">
                  {feat.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-['Space_Grotesk'] group-hover:text-amber-400 transition-colors">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feat.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
