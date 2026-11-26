'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Is YT-LOAD completely free and ad-free?',
    answer:
      'Yes, 100% free and open-source under the MIT license. There are zero banner ads, zero popups, zero sponsored redirects, and zero user tracking scripts. You can also self-host it on your own server or Docker container for complete privacy.',
    category: 'General',
  },
  {
    question: 'What is the maximum audio quality available?',
    answer:
      'YT-LOAD extracts the highest bitrate master stream from YouTube and transcodes it into MP3 at CBR 320 kbps using the industry-standard LAME encoder, or FLAC lossless studio depth (24-bit/48kHz PCM). You can also download native Apple M4A (256 kbps AAC) or raw OPUS bitstreams without any re-encoding.',
    category: 'Audio',
  },
  {
    question: 'Are ID3 metadata and album covers automatically embedded?',
    answer:
      'Yes. When you download audio formats (MP3, FLAC, M4A), YT-LOAD automatically downloads the highest-resolution official thumbnail and injects ID3v2 tags including Track Title, Artist, Album, and embedded Front Cover Artwork. The files will display album art immediately in Apple Music, Spotify, VLC, and car stereos.',
    category: 'Audio',
  },
  {
    question: 'Can I download 4K (2160p) and 1080p 60FPS videos?',
    answer:
      'Yes. YouTube stores high-resolution videos (1080p, 1440p, 4K) as separate video-only and audio-only streams. YT-LOAD downloads both streams and muxes them into a single, universal MP4 container using hardware-assisted stream copy (-c:v copy). The video stream is copied without quality degradation or lossy re-encoding.',
    category: 'Video',
  },
  {
    question: 'Why do other downloaders fail with "403 Forbidden" errors?',
    answer:
      'YouTube recently implemented Proof of Origin (po_token) requirements and CDN rate limits that block unauthenticated clients with HTTP 403 Forbidden on long movies or popular music tracks. YT-LOAD features a dual-core stream pipeline that automatically bypasses CDN throttling and resolves direct bitstreams without connection drops.',
    category: 'Reliability',
  },
  {
    question: 'Do you store or log my downloaded files?',
    answer:
      'Never. YT-LOAD operates in real-time streaming mode: media chunks flow directly from YouTube through our transcoding pipeline straight to your browser download manager. Temporary muxing files are stored with unique UUIDs in os.tmpdir() and deleted immediately upon completion or cancellation.',
    category: 'Privacy',
  },
  {
    question: 'Can I self-host YT-LOAD with Docker?',
    answer:
      'Absolutely! We provide a multi-stage Dockerfile and Docker Compose specification. Run "docker run -d -p 3000:3000 ghcr.io/nishan/yt-load:latest" to launch a personal instance on any Linux, macOS, or Windows host with zero system-level FFmpeg configuration required.',
    category: 'Self-Host',
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="w-full py-12 scroll-mt-20">
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-['Space_Grotesk']">
          Everything You Need to Know
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Clear answers about audio quality, video muxing, privacy guarantees, and open-source self-hosting.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-[#12141A] border-amber-400/40 shadow-lg shadow-amber-500/5'
                  : 'bg-[#0E1015]/80 border-white/5 hover:border-white/15'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleIndex(index)}
                className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors"
              >
                <span className="font-semibold text-white text-sm sm:text-base pr-4">
                  {item.question}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 bg-amber-400 text-black' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-white/5 animate-in fade-in duration-200">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
