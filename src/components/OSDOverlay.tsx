import React, { useEffect, useState } from 'react';
import { CameraConfig } from '../types/camera';

interface Props {
  config: CameraConfig;
  isRecording: boolean;
  recordingSeconds: number;
  batteryPercent: number;
  hudMessage?: string | null;
}

export const OSDOverlay: React.FC<Props> = ({
  config,
  isRecording,
  recordingSeconds,
  batteryPercent,
  hudMessage,
}) => {
  const [frameTick, setFrameTick] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const frameInterval = setInterval(() => {
      setFrameTick((prev) => (prev + 1) % 30);
    }, 1000 / 30);

    const blinkInterval = setInterval(() => {
      setBlink((prev) => !prev);
    }, 600);

    return () => {
      clearInterval(frameInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  if (!config.showOSD) return null;

  // Format Timecode TC 00:00:00:00
  const hours = Math.floor(recordingSeconds / 3600);
  const minutes = Math.floor((recordingSeconds % 3600) / 60);
  const seconds = recordingSeconds % 60;
  const frames = frameTick;
  const tcString = `TC ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;

  const getLensLabel = () => {
    switch (config.lensMode) {
      case 'FISHEYE_FULL':
        return 'FISHEYE FULL';
      case 'FISHEYE_CIRCLE':
        return '0.3x PEEPHOLE';
      default:
        return '4:3 NORMAL';
    }
  };

  const battBars = Math.ceil((batteryPercent / 100) * 4);
  const battString = '■'.repeat(battBars).padEnd(4, '□');

  return (
    <div className="absolute inset-0 pointer-events-none p-3.5 flex flex-col justify-between font-mono select-none z-10 text-shadow">
      {/* Top Bar */}
      <div className="flex items-start justify-between">
        {/* Left: Tape & Battery */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider">
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/70 px-1 py-0.5 text-[10px]">
              {config.tapeFormat}
            </span>
            <span className="text-gray-200">
              BATT [{battString}] {batteryPercent}%
            </span>
          </div>
          <span className="text-[10px] text-emerald-300 tracking-wider">
            TAPE {config.tapeMinutesLeft}min
          </span>
        </div>

        {/* Center: Lens Mode Badge */}
        <div className="flex flex-col items-center">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-widest border ${
              config.lensMode !== 'NORMAL_4_3'
                ? 'bg-black/70 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(255,215,0,0.4)]'
                : 'bg-black/60 border-white/30 text-gray-200'
            }`}
          >
            {getLensLabel()}
          </span>
        </div>

        {/* Right: REC / STBY & Audio meter */}
        <div className="flex flex-col items-end gap-0.5">
          {isRecording ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full bg-red-600 border border-white transition-opacity ${
                  blink ? 'opacity-100' : 'opacity-25'
                }`}
              />
              <span className="text-red-500 font-extrabold text-xs tracking-widest">REC</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-extrabold text-xs tracking-widest">STBY</span>
            </div>
          )}
          <span className="text-[9px] text-emerald-300 font-semibold tracking-wider">
            CH1/CH2 [||||  ]
          </span>
        </div>
      </div>

      {/* Center Reticle & NightShot Indicator */}
      <div className="flex flex-col items-center justify-center my-auto">
        {hudMessage && (
          <div className="bg-black/90 border-2 border-amber-400 px-4 py-2 rounded shadow-[0_0_15px_rgba(255,191,0,0.7)] mb-3 text-center animate-pulse">
            <span className="text-amber-300 text-xs font-black tracking-widest block">
              💾 {hudMessage}
            </span>
          </div>
        )}

        {config.nightShot && (
          <div className="bg-emerald-950/90 border border-emerald-400 px-3 py-1 rounded shadow-[0_0_12px_rgba(0,255,102,0.6)] mb-4 text-center">
            <span className="text-emerald-300 text-xs font-black tracking-widest block">
              ⚡ NIGHTSHOT ⚡
            </span>
            <span className="text-[8px] text-emerald-200 tracking-wider">INFRARED SENSOR ACTIVE</span>
          </div>
        )}

        {/* Focus brackets */}
        <div className="w-20 h-20 relative flex items-center justify-center opacity-40">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white" />
          <div className="text-white text-base leading-none font-light">+</div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white" />
        </div>
      </div>

      {/* Right Edge: Zoom Scale */}
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex flex-col items-center bg-black/60 border border-white/20 p-1 rounded text-[8px]">
        <span className="text-white font-bold">T</span>
        <div className="w-1 h-14 bg-white/30 my-1 relative rounded">
          <div
            className="absolute w-2.5 h-1.5 -left-[3px] bg-amber-400 rounded-sm transition-all"
            style={{
              top: `${Math.max(0, Math.min(88, ((4 - config.zoomLevel) / 3) * 88))}%`,
            }}
          />
        </div>
        <span className="text-white font-bold">W</span>
        <span className="text-amber-300 font-bold mt-1 text-[7px]">
          {config.zoomLevel.toFixed(1)}x
        </span>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-end justify-between">
        {/* Left: Timecode & Parameters */}
        <div className="flex flex-col">
          <span className="text-white text-sm font-extrabold tracking-widest">{tcString}</span>
          <span className="text-emerald-300 text-[9px] tracking-wider mt-0.5">
            1/60 F2.4 0dB AUTO
          </span>
        </div>

        {/* Right: Retro Date Stamp */}
        <div className="flex flex-col items-end text-right">
          <span className="text-amber-500 text-xs font-black tracking-widest text-shadow-orange">
            {config.vintageDate}
          </span>
          <span className="text-[7.5px] text-gray-400 tracking-wider">MINIDV 4:3 NTSC</span>
        </div>
      </div>
    </div>
  );
};
