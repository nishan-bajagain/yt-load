'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Heart, Zap, QrCode, ExternalLink, ShieldCheck } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'lightning' | 'onchain'>('lightning');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const lightningAddress = 'trainedsled305@walletofsatoshi.com';
  const onchainAddress = 'bc1pzwkcx7g5vzw8f7027wlh0egtsx2w3tukwrpmmx607e63efusk0ms20kyny';

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.warn('Failed to copy address:', err);
    }
  };

  const currentAddress = activeTab === 'lightning' ? lightningAddress : onchainAddress;
  const qrData =
    activeTab === 'lightning'
      ? `lightning:${lightningAddress}`
      : `bitcoin:${onchainAddress}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    qrData
  )}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#12141A] border border-white/10 w-full max-w-lg flex flex-col shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-[#0D0F14]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Heart className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base font-['Space_Grotesk']">
                Support YT-LOAD
              </h2>
              <p className="text-xs text-slate-400">
                Help keep the application 100% free, zero-ad, and open-source
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
        <div className="p-6 space-y-5 text-sm">
          {/* Transparency note */}
          <p className="text-xs text-slate-300 leading-relaxed bg-amber-400/5 border border-amber-400/20 p-3.5 rounded-xl">
            <strong className="text-amber-400 font-semibold">Zero-Ad Guarantee:</strong> We do not run ads, sell user data, or gate features. Your voluntary Bitcoin contributions help cover server bandwidth, maintenance, and ongoing open-source development.
          </p>

          {/* Network Switcher */}
          <div className="flex p-1 rounded-xl bg-black/40 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('lightning')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'lightning'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Lightning (Instant / Zero Fee)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('onchain')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'onchain'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>BTC On-Chain</span>
            </button>
          </div>

          {/* QR Code and Address Display */}
          <div className="flex flex-col items-center justify-center space-y-4 p-5 rounded-xl bg-black/30 border border-white/5">
            {/* QR Code Container */}
            <div className="p-2.5 bg-white rounded-xl shadow-lg border border-white/20">
              <img
                src={qrCodeUrl}
                alt="Bitcoin Donation QR Code"
                width={180}
                height={180}
                className="w-44 h-44 rounded-lg block"
              />
            </div>

            {/* Address Box */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{activeTab === 'lightning' ? 'Lightning Address:' : 'Bitcoin Address:'}</span>
                <span className="text-amber-400 font-medium">Click copy or scan QR</span>
              </div>

              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#090A0E] border border-white/10">
                <span className="font-mono text-xs text-white break-all flex-1 select-all px-1">
                  {currentAddress}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentAddress, activeTab)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
                >
                  {copiedType === activeTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-black" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-black" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Open in Wallet Button */}
            <a
              href={qrData}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors pt-1"
            >
              <span>Open directly in your Bitcoin wallet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 bg-[#0D0F14] flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Thank you for supporting open source!</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all cursor-pointer border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
