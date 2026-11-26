'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProgressEventData } from '@/lib/progress';
import { Activity, Cpu, Gauge, Radio, Zap } from 'lucide-react';

interface MatrixVisualizerProps {
  progress?: ProgressEventData | null;
  isDownloading: boolean;
  selectedFormat?: string;
}

const COLS = 36;
const ROWS = 10;
const TOTAL_CELLS = COLS * ROWS;

export const MatrixVisualizer: React.FC<MatrixVisualizerProps> = ({
  progress,
  isDownloading,
  selectedFormat,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [idleTick, setIdleTick] = useState(0);

  // Idle scan animation tick
  useEffect(() => {
    if (isDownloading) return;
    const interval = setInterval(() => {
      setIdleTick((prev) => (prev + 1) % COLS);
    }, 110);
    return () => clearInterval(interval);
  }, [isDownloading]);

  const activePercent = progress?.percent || 0;
  const activeCellsCount = Math.round((activePercent / 100) * TOTAL_CELLS);

  const cells = useMemo(() => {
    return Array.from({ length: TOTAL_CELLS }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return { index: i, col, row };
    });
  }, []);

  return (
    <div className="w-full bg-[#13161A] border-2 border-[#272C35] rounded-[3px] p-4 sm:p-5 font-mono shadow-[5px_5px_0px_#000000]">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#272C35] pb-3 mb-3 text-xs gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="inline-block w-2.5 h-2.5 bg-[#FFE600] border border-black shadow-[1px_1px_0px_#000000]" />
          <span className="inline-block w-2.5 h-2.5 bg-[#F59E0B] border border-black" />
          <span className="inline-block w-2.5 h-2.5 bg-[#272C35] border border-black" />
          <span className="text-white font-bold tracking-wider text-[11px] sm:text-xs">
            TELEMETRY // DOT_MATRIX_STREAM_DECODER
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          {isDownloading ? (
            <span className="flex items-center space-x-1.5 text-[#FFE600] font-bold animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-[#FFE600]" />
              <span>ACTIVE PIPELINE // {progress?.status?.toUpperCase() || 'BUSY'}</span>
            </span>
          ) : (
            <span className="text-[#94A3B8] flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-[#FFE600]/70" />
              <span>STANDBY // AWAITING STREAM BUFFER</span>
            </span>
          )}
          <span className="bg-[#0B0D0F] px-2 py-0.5 border border-[#272C35] text-[10px] text-[#FFE600] font-bold">
            MATRIX {COLS}×{ROWS}
          </span>
        </div>
      </div>

      {/* Dot Matrix Canvas / Grid */}
      <div
        className="grid gap-[3px] py-2.5 px-1 select-none overflow-x-auto"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {cells.map(({ index, col, row }) => {
          let cellColor = '#1E232B'; // Inactive dot color
          let glowStyle = '';

          if (isDownloading) {
            if (index < activeCellsCount) {
              const ratio = index / Math.max(1, activeCellsCount);
              if (ratio > 0.88) {
                cellColor = '#FFFFFF'; // Bright white head
                glowStyle = '0 0 8px #FFFFFF, 0 0 12px #FFE600';
              } else if (ratio > 0.5) {
                cellColor = '#FFE600'; // Electric Cyber Yellow
                glowStyle = '0 0 5px #FFE600';
              } else {
                cellColor = '#F59E0B'; // Warm Gold
                glowStyle = '0 0 3px #F59E0B';
              }
            } else if (index === activeCellsCount && activePercent < 100) {
              cellColor = '#FFE600';
              glowStyle = '0 0 10px #FFE600';
            }
          } else {
            // Idle state: dual sine-wave audio frequency simulation
            const waveHeight = Math.sin((col + idleTick) * 0.4) * 3 + 4.5;
            const distFromWave = Math.abs(row - waveHeight);

            if (distFromWave < 1.0) {
              cellColor = '#FFE600';
              glowStyle = '0 0 4px #FFE600';
            } else if (distFromWave < 2.0) {
              cellColor = '#3F4756';
            } else if (distFromWave < 3.0) {
              cellColor = '#272C35';
            }
          }

          // Hover interaction
          const isHovered = hoveredIndex === index;
          if (isHovered) {
            cellColor = '#FFFFFF';
            glowStyle = '0 0 12px #FFE600';
          }

          return (
            <div
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              className="aspect-square rounded-[1px] transition-all duration-100 cursor-crosshair relative group"
              style={{
                backgroundColor: cellColor,
                boxShadow: glowStyle || 'none',
              }}
            >
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#000000] text-[#FFE600] text-[9px] px-1.5 py-0.5 border border-[#FFE600] whitespace-nowrap z-30 pointer-events-none font-bold">
                  CELL [{col},{row}] // 0x{index.toString(16).toUpperCase().padStart(2, '0')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-Time Telemetry & Status Logs */}
      <div className="mt-3 pt-3 border-t border-[#272C35] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-[#000000] px-2 py-1 text-[#FFE600] border border-[#272C35] font-bold flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-[#FFE600]" />
            <span>[{progress?.phase?.toUpperCase() || (isDownloading ? 'ENCODING' : 'IDLE')}]</span>
          </span>
          <span className="text-[#94A3B8] text-[11px] sm:text-xs">
            {progress?.message ||
              (isDownloading
                ? `Transcoding ${selectedFormat || 'stream'} bitstream...`
                : 'Awaiting YouTube audio/video stream input to analyze bitrates.')}
          </span>
        </div>

        <div className="flex flex-wrap items-center space-x-3 self-end sm:self-auto text-[11px]">
          {progress?.timemark && (
            <span className="text-[#94A3B8]">
              TIMEMARK: <span className="text-white font-bold">{progress.timemark}</span>
            </span>
          )}
          {progress?.bytesDownloaded ? (
            <span className="text-[#94A3B8]">
              BUFFERED:{' '}
              <span className="text-[#FFE600] font-bold">
                {(progress.bytesDownloaded / 1024 / 1024).toFixed(1)} MB
              </span>
            </span>
          ) : null}
          <div className="flex items-center space-x-1">
            <span className="text-[#94A3B8]">STATUS:</span>
            <span
              className={`font-bold px-2 py-0.5 text-[10px] border ${
                progress?.status === 'completed'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500'
                  : progress?.status === 'error'
                  ? 'bg-rose-950/80 text-rose-400 border-rose-500'
                  : isDownloading
                  ? 'bg-[#FFE600] text-black border-black font-extrabold'
                  : 'bg-[#0B0D0F] text-[#94A3B8] border-[#272C35]'
              }`}
            >
              {progress?.percent ? `${progress.percent}%` : isDownloading ? 'BUFFERING' : 'READY'}
            </span>
          </div>
        </div>
      </div>

      {/* Cyber Yellow Progress Bar */}
      {isDownloading && (
        <div className="mt-3 w-full bg-[#0B0D0F] h-2.5 border border-[#272C35] overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#F59E0B] via-[#FFE600] to-[#FFFFFF] transition-all duration-200 shadow-[0_0_8px_#FFE600]"
            style={{ width: `${Math.max(4, activePercent)}%` }}
          />
        </div>
      )}
    </div>
  );
};
