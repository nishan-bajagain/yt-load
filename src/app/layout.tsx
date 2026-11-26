import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YT-LOAD // Zero-Ad High-Fidelity YouTube & YT Music Transcoder',
  description:
    'Complete, production-ready, open-source web application for extracting YouTube and YouTube Music media in highest available quality (MP3 320kbps, FLAC, M4A, 4K MP4) with zero ads.',
  keywords: [
    'youtube downloader',
    'youtube music downloader',
    'mp3 320kbps',
    'flac lossless',
    '4k video downloader',
    'open source',
    'neo-brutalist',
    'cyber yellow',
    'innertube',
    'ffmpeg',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased selection:bg-[#FFE600] selection:text-[#000000]">
        {children}
      </body>
    </html>
  );
}
