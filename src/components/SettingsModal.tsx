import React from 'react';
import { CameraConfig } from '../types/camera';
import { retroAudioProcessor } from '../services/RetroAudioProcessor';
import { Sliders, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  config: CameraConfig;
  onClose: () => void;
  onUpdateConfig: (partial: Partial<CameraConfig>) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  config,
  onClose,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  const years = [1998, 1999, 2000, 2002, 2004, new Date().getFullYear()];

  const handleYearSelect = (year: number) => {
    retroAudioProcessor.playBeep(2100, 0.04);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    const formatted = `${months[now.getMonth()]} ${String(now.getDate()).padStart(2, '0')} ${year}`;
    onUpdateConfig({ vintageYear: year, vintageDate: formatted });
  };

  const handleTapeFormatToggle = () => {
    retroAudioProcessor.playBeep(1900, 0.05);
    const nextFormat = config.tapeFormat === 'SP' ? 'LP' : 'SP';
    onUpdateConfig({
      tapeFormat: nextFormat,
      tapeMinutesLeft: nextFormat === 'SP' ? 60 : 90,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-[#141418] border-2 border-[#33333f] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#25252e]">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-cyan-400" />
            <span className="text-cyan-400 text-xs font-bold tracking-wider">
              CAMCORDER SETUP MENU
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Setting 1: Vintage Year */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-gray-400 tracking-wider">
            ESTAMPA DE FECHA RETRO (AÑO)
          </span>
          <div className="grid grid-cols-3 gap-2">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => handleYearSelect(y)}
                className={`py-1.5 rounded border text-[10.5px] font-bold transition-all ${
                  config.vintageYear === y
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                    : 'bg-[#1a1a22] border-[#2c2c38] text-gray-400 hover:text-gray-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Setting 2: Tape Mode (SP vs LP) */}
        <div className="flex items-center justify-between bg-[#191922] p-3 rounded-lg border border-[#2b2b3a]">
          <div>
            <span className="text-white text-xs font-bold block">
              FORMATO DE CINTA ({config.tapeFormat})
            </span>
            <span className="text-[8.5px] text-gray-400">
              {config.tapeFormat === 'SP'
                ? 'Standard Play (Mayor fidelidad, 60 min)'
                : 'Long Play (Mayor compresión, 90 min)'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleTapeFormatToggle}
            className="bg-[#242430] border border-amber-400 text-amber-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider"
          >
            {config.tapeFormat}
          </button>
        </div>

        {/* Setting 3: Grain Intensity */}
        <div className="flex flex-col gap-1 bg-[#191922] p-3 rounded-lg border border-[#2b2b3a]">
          <div className="flex justify-between text-xs">
            <span className="text-white font-bold">GRANO ANALÓGICO CCD</span>
            <span className="text-amber-400 font-bold">{Math.round(config.grainIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.grainIntensity}
            onChange={(e) => onUpdateConfig({ grainIntensity: parseFloat(e.target.value) })}
            className="accent-amber-500 w-full cursor-pointer mt-1"
          />
        </div>

        {/* Setting 4: Bloom Intensity */}
        <div className="flex flex-col gap-1 bg-[#191922] p-3 rounded-lg border border-[#2b2b3a]">
          <div className="flex justify-between text-xs">
            <span className="text-white font-bold">RESPLANDOR (BLOOM / HALATION)</span>
            <span className="text-cyan-400 font-bold">{Math.round(config.bloomIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.1"
            value={config.bloomIntensity}
            onChange={(e) => onUpdateConfig({ bloomIntensity: parseFloat(e.target.value) })}
            className="accent-cyan-400 w-full cursor-pointer mt-1"
          />
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-[#25252e] text-center">
          <span className="text-[8.5px] text-gray-500 font-bold block">
            SONY HANDYCAM / VX-1000 EMULATION SYSTEM
          </span>
          <span className="text-[7.5px] text-gray-600 block mt-0.5">
            GLSL 3.00 ES • Barrel Distortion • NightShot • 480p SD Quantization
          </span>
        </div>
      </div>
    </div>
  );
};
