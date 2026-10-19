import React, { useRef } from 'react';
import { CameraConfig, LensMode } from '../types/camera';
import { retroAudioProcessor } from '../services/RetroAudioProcessor';
import { mediaStreamService } from '../services/MediaStreamService';
import {
  Camera,
  Film,
  Flashlight,
  RefreshCw,
  Sliders,
  Tv,
} from 'lucide-react';

interface Props {
  config: CameraConfig;
  isRecording: boolean;
  onUpdateConfig: (partial: Partial<CameraConfig>) => void;
  onToggleRecord: () => void;
  onTakeSnapshot: () => void;
  onOpenDeck: () => void;
  onOpenSettings: () => void;
}

export const Controls: React.FC<Props> = ({
  config,
  isRecording,
  onUpdateConfig,
  onToggleRecord,
  onTakeSnapshot,
  onOpenDeck,
  onOpenSettings,
}) => {
  const zoomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLensSelect = (mode: LensMode) => {
    retroAudioProcessor.playBeep(2100, 0.05);
    onUpdateConfig({ lensMode: mode });
  };

  const handleToggleNightShot = () => {
    const nextVal = !config.nightShot;
    retroAudioProcessor.playBeep(nextVal ? 1750 : 1350, 0.07, 'square');
    onUpdateConfig({ nightShot: nextVal });
  };

  const handleToggleTorch = async () => {
    retroAudioProcessor.playBeep(2200, 0.04);
    const nextState = !config.torchEnabled;
    const success = await mediaStreamService.setTorch(nextState);
    onUpdateConfig({ torchEnabled: success ? nextState : false });
  };

  const handleToggleFacing = () => {
    retroAudioProcessor.playBeep(2000, 0.05);
    const nextMode = config.facingMode === 'environment' ? 'user' : 'environment';
    onUpdateConfig({ facingMode: nextMode });
  };

  const handleToggleOSD = () => {
    retroAudioProcessor.playBeep(2300, 0.04);
    onUpdateConfig({ showOSD: !config.showOSD });
  };

  // Zoom Rocker Logic (Smooth holding & step click)
  const startZooming = (delta: number) => {
    retroAudioProcessor.playZoomWhir(delta > 0 ? 430 : 360);
    const newZoom = Math.min(4.0, Math.max(1.0, config.zoomLevel + delta));
    onUpdateConfig({ zoomLevel: newZoom });
    mediaStreamService.setHardwareZoom(newZoom);

    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
    zoomIntervalRef.current = setInterval(() => {
      onUpdateConfig({
        zoomLevel: Math.min(4.0, Math.max(1.0, config.zoomLevel + delta * 0.5)),
      });
    }, 120);
  };

  const stopZooming = () => {
    if (zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
      zoomIntervalRef.current = null;
    }
  };

  return (
    <div className="w-full max-w-[540px] bg-[#141418] border-t-2 border-[#2b2b35] p-3 rounded-b-xl shadow-2xl flex flex-col gap-2.5 font-mono select-none">
      {/* Top Deck: Lens Rotary Selector & NightShot Switch */}
      <div className="flex items-center justify-between gap-3">
        {/* Lens Mode Selector */}
        <div className="flex-1">
          <span className="text-[8px] font-bold text-gray-400 tracking-wider block mb-1">
            LENS SELECTOR
          </span>
          <div className="flex bg-[#0a0a0d] border border-[#26262e] rounded p-0.5">
            <button
              type="button"
              onClick={() => handleLensSelect('NORMAL_4_3')}
              className={`flex-1 py-1.5 text-[9.5px] font-bold tracking-wider rounded transition-all ${
                config.lensMode === 'NORMAL_4_3'
                  ? 'bg-[#2a2a32] text-amber-300 border border-amber-400/80 shadow-[0_0_6px_rgba(255,191,0,0.3)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              4:3 SD
            </button>
            <button
              type="button"
              onClick={() => handleLensSelect('FISHEYE_FULL')}
              className={`flex-1 py-1.5 text-[9.5px] font-bold tracking-wider rounded transition-all ${
                config.lensMode === 'FISHEYE_FULL'
                  ? 'bg-[#2a2a32] text-amber-300 border border-amber-400/80 shadow-[0_0_6px_rgba(255,191,0,0.3)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              FISHEYE
            </button>
            <button
              type="button"
              onClick={() => handleLensSelect('FISHEYE_CIRCLE')}
              className={`flex-1 py-1.5 text-[9.5px] font-bold tracking-wider rounded transition-all ${
                config.lensMode === 'FISHEYE_CIRCLE'
                  ? 'bg-[#2a2a32] text-amber-300 border border-amber-400/80 shadow-[0_0_6px_rgba(255,191,0,0.3)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              0.3x CIRCLE
            </button>
          </div>
        </div>

        {/* NightShot Mechanical Switch */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-bold text-gray-400 tracking-wider block mb-1">
            NIGHTSHOT
          </span>
          <button
            type="button"
            onClick={handleToggleNightShot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-all ${
              config.nightShot
                ? 'bg-[#002b0f] border-emerald-400 shadow-[0_0_10px_rgba(0,255,102,0.5)]'
                : 'bg-[#101411] border-[#203023]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                config.nightShot ? 'bg-emerald-400 shadow-[0_0_6px_#00ff66]' : 'bg-[#224422]'
              }`}
            />
            <span
              className={`text-[9.5px] font-extrabold tracking-widest ${
                config.nightShot ? 'text-emerald-300' : 'text-gray-400'
              }`}
            >
              {config.nightShot ? 'IR ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Middle Deck: Zoom Rocker & Aux Buttons */}
      <div className="flex items-center justify-between gap-3 bg-[#0d0d10] p-2 rounded-lg border border-[#1f1f26]">
        {/* Power Zoom Rocker */}
        <div className="flex-1">
          <span className="text-[8px] font-bold text-gray-400 tracking-wider block mb-1">
            POWER ZOOM
          </span>
          <div className="flex bg-[#1c1c22] border border-[#32323c] rounded overflow-hidden">
            <button
              type="button"
              onMouseDown={() => startZooming(-0.2)}
              onMouseUp={stopZooming}
              onTouchStart={() => startZooming(-0.2)}
              onTouchEnd={stopZooming}
              className="flex-1 py-1.5 flex flex-col items-center active:bg-amber-500/20"
            >
              <span className="text-white text-xs font-black">W</span>
              <span className="text-[7px] text-gray-400 font-bold">WIDE</span>
            </button>
            <div className="w-[1px] bg-black" />
            <button
              type="button"
              onMouseDown={() => startZooming(0.2)}
              onMouseUp={stopZooming}
              onTouchStart={() => startZooming(0.2)}
              onTouchEnd={stopZooming}
              className="flex-1 py-1.5 flex flex-col items-center active:bg-amber-500/20"
            >
              <span className="text-white text-xs font-black">T</span>
              <span className="text-[7px] text-gray-400 font-bold">TELE</span>
            </button>
          </div>
        </div>

        {/* Aux Quick Actions */}
        <div className="flex items-center gap-1.5 pt-3">
          <button
            type="button"
            onClick={handleToggleTorch}
            className={`flex flex-col items-center justify-center p-1.5 min-w-[42px] rounded border transition-all ${
              config.torchEnabled
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-[#181820] border-[#2c2c36] text-gray-300'
            }`}
          >
            <Flashlight size={14} />
            <span className="text-[7px] font-bold mt-0.5">LIGHT</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFacing}
            className="flex flex-col items-center justify-center p-1.5 min-w-[42px] rounded border bg-[#181820] border-[#2c2c36] text-gray-300 active:scale-95"
          >
            <RefreshCw size={14} />
            <span className="text-[7px] font-bold mt-0.5">FLIP</span>
          </button>

          <button
            type="button"
            onClick={handleToggleOSD}
            className={`flex flex-col items-center justify-center p-1.5 min-w-[42px] rounded border transition-all ${
              config.showOSD
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                : 'bg-[#181820] border-[#2c2c36] text-gray-500 opacity-60'
            }`}
          >
            <Tv size={14} />
            <span className="text-[7px] font-bold mt-0.5">OSD</span>
          </button>
        </div>
      </div>

      {/* Bottom Deck: Primary Trigger (REC + PHOTO + CASSETTE / SETUP) */}
      <div className="flex items-center justify-between pt-1">
        {/* Cassette Deck / Gallery */}
        <button
          type="button"
          onClick={onOpenDeck}
          className="flex flex-col items-center justify-center bg-[#181820] border border-[#2c2c38] px-2.5 py-1.5 rounded-lg active:scale-95 hover:border-amber-400"
        >
          <Film size={16} className="text-amber-400" />
          <span className="text-[8.5px] font-bold text-amber-400 mt-0.5">CASSETTE</span>
          <span className="text-[6.5px] text-gray-400">PLAY / REW</span>
        </button>

        {/* Snapshot Photo Button */}
        <button
          type="button"
          onClick={onTakeSnapshot}
          className="w-13 h-13 rounded-full bg-gradient-to-b from-gray-200 to-gray-400 border-2 border-gray-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-200 border border-gray-400 flex items-center justify-center">
            <Camera size={18} className="text-zinc-800" />
          </div>
        </button>

        {/* Big REC Start / Stop Button */}
        <button
          type="button"
          onClick={onToggleRecord}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-black text-xs tracking-wider transition-all shadow-lg active:scale-95 ${
            isRecording
              ? 'bg-red-600 border-white text-white shadow-[0_0_16px_rgba(255,0,0,0.8)]'
              : 'bg-[#800] border-red-500 text-white shadow-[0_0_8px_rgba(255,0,0,0.4)] hover:bg-red-700'
          }`}
        >
          <span
            className={`w-3 h-3 rounded-full border border-white ${
              isRecording ? 'bg-white' : 'bg-red-500'
            }`}
          />
          <span>{isRecording ? 'STOP' : 'START / STOP'}</span>
        </button>

        {/* Menu / Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center bg-[#181820] border border-[#2c2c38] px-2.5 py-1.5 rounded-lg active:scale-95 hover:border-cyan-400"
        >
          <Sliders size={16} className="text-cyan-400" />
          <span className="text-[8.5px] font-bold text-cyan-400 mt-0.5">MENU</span>
          <span className="text-[6.5px] text-gray-400">CONFIG</span>
        </button>
      </div>
    </div>
  );
};
