import React, { useState } from 'react';
import { RecordedMedia } from '../types/camera';
import { retroAudioProcessor } from '../services/RetroAudioProcessor';
import { galleryService } from '../services/GalleryService';
import { Check, Download, Loader2, Play, Trash2, Video, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  clips: RecordedMedia[];
  onClose: () => void;
  onDeleteClip: (id: string) => void;
}

export const CassetteDeckModal: React.FC<Props> = ({
  isOpen,
  clips,
  onClose,
  onDeleteClip,
}) => {
  const [selectedClip, setSelectedClip] = useState<RecordedMedia | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ id: string; text: string; success: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSelect = (clip: RecordedMedia) => {
    retroAudioProcessor.playBeep(2200, 0.05);
    setSelectedClip(clip);
  };

  const handleSaveToGallery = async (clip: RecordedMedia, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    retroAudioProcessor.playBeep(2500, 0.05);
    setSavingId(clip.id);

    try {
      const res = await galleryService.saveMedia(clip);
      setSaveStatus({ id: clip.id, text: res.message, success: res.success });
      if (res.success) {
        retroAudioProcessor.playBeep(3200, 0.08, 'triangle');
      }
    } catch (err) {
      setSaveStatus({ id: clip.id, text: 'Error al guardar', success: false });
    } finally {
      setSavingId(null);
      setTimeout(() => {
        setSaveStatus((prev) => (prev?.id === clip.id ? null : prev));
      }, 3500);
    }
  };

  const handleEject = () => {
    retroAudioProcessor.playBeep(1700, 0.08);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-[#141418] border-2 border-[#33333f] rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#25252e]">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-8 bg-amber-500 rounded-sm" />
            <div className="flex items-center gap-1.5 bg-[#1f1f28] border border-[#3f3f4e] px-2 py-1 rounded">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-white" />
              <div className="w-4 h-0.5 bg-zinc-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-white" />
            </div>
            <div>
              <span className="text-white text-xs font-bold tracking-wider block">
                MINIDV CASSETTE DECK
              </span>
              <span className="text-[8.5px] text-gray-400">DVM60 • 60 MIN DIGITAL TAPE</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEject}
            className="bg-[#24242e] border border-[#3b3b4a] hover:border-amber-400 text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded active:scale-95"
          >
            ⏏ EJECT
          </button>
        </div>

        {/* Preview Player if clip selected */}
        {selectedClip && (
          <div className="bg-black border border-[#2c2c36] rounded-lg p-2.5 mt-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-400 text-[10.5px] font-bold tracking-wider">
                {selectedClip.type === 'video' ? '▶ PLAYING MINIDV TRACK' : '📷 PHOTO VIEWER'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedClip(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="w-full aspect-[4/3] bg-zinc-950 rounded overflow-hidden flex items-center justify-center">
              {selectedClip.type === 'video' ? (
                <video
                  src={selectedClip.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedClip.url}
                  alt="Snapshot"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2.5">
              <button
                type="button"
                onClick={() => handleSaveToGallery(selectedClip)}
                disabled={savingId === selectedClip.id}
                className={`flex items-center gap-1.5 text-white text-[10px] font-bold px-3 py-1.5 rounded active:scale-95 transition-all ${
                  saveStatus?.id === selectedClip.id
                    ? saveStatus.success
                      ? 'bg-emerald-600 text-white shadow-[0_0_10px_#059669]'
                      : 'bg-red-700 text-white'
                    : 'bg-emerald-800 hover:bg-emerald-700'
                }`}
              >
                {savingId === selectedClip.id ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>GUARDANDO EN GALERÍA...</span>
                  </>
                ) : saveStatus?.id === selectedClip.id ? (
                  <>
                    {saveStatus.success ? <Check size={13} /> : <X size={13} />}
                    <span>{saveStatus.text}</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>GUARDAR EN GALERÍA</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClip(selectedClip.id);
                  setSelectedClip(null);
                }}
                className="flex items-center gap-1.5 bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-300 text-[10px] font-bold px-3 py-1.5 rounded active:scale-95"
              >
                <Trash2 size={13} />
                <span>ELIMINAR</span>
              </button>
            </div>
          </div>
        )}

        {/* Tape Index Header */}
        <div className="flex items-center justify-between mt-3 mb-2">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">
            PISTAS EN LA CINTA ({clips.length})
          </span>
          <span className="text-[8.5px] text-gray-500">SP 18.8mm/s • 480p 4:3</span>
        </div>

        {/* Clip List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[320px]">
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Video size={36} className="text-gray-600" />
              <span className="text-gray-400 text-xs font-bold">LA CINTA ESTÁ VACÍA</span>
              <p className="text-[9px] text-gray-500 max-w-[240px]">
                Presiona el botón REC en la cámara para grabar videos con ojo de pez y estética MiniDV.
              </p>
            </div>
          ) : (
            clips.map((clip, idx) => (
              <div
                key={clip.id}
                onClick={() => handleSelect(clip)}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedClip?.id === clip.id
                    ? 'bg-[#25231c] border-amber-400'
                    : 'bg-[#181820] border-[#292934] hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#252530] border border-[#3d3d4e] flex items-center justify-center text-amber-400 overflow-hidden">
                    {clip.type === 'photo' ? (
                      <img src={clip.url} alt="Thumb" className="w-full h-full object-cover" />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[11px] font-bold">
                        TRACK {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="bg-black/60 border border-amber-400/60 text-amber-300 text-[8px] font-bold px-1.5 py-0.5 rounded">
                        {clip.lensMode === 'FISHEYE_FULL'
                          ? 'FISHEYE'
                          : clip.lensMode === 'FISHEYE_CIRCLE'
                          ? '0.3x CIRCLE'
                          : '4:3 NORMAL'}
                      </span>
                      {clip.nightShot && (
                        <span className="border border-emerald-400 text-emerald-400 text-[8px] font-bold px-1 rounded">
                          NIGHTSHOT
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {clip.type === 'video' ? `VIDEO ${clip.recordingFps ? `${clip.recordingFps}FPS ` : ''}(${clip.durationSeconds}s)` : 'FOTO CCD'} • {clip.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Guardar en galería"
                    onClick={(e) => handleSaveToGallery(clip, e)}
                    disabled={savingId === clip.id}
                    className="p-1.5 rounded bg-[#20202c] border border-[#3b3b4f] hover:border-emerald-400 text-gray-300 hover:text-emerald-300 active:scale-90 transition-all"
                  >
                    {savingId === clip.id ? (
                      <Loader2 size={13} className="animate-spin text-amber-400" />
                    ) : saveStatus?.id === clip.id ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Download size={13} />
                    )}
                  </button>
                  <div className="text-amber-400 text-xs">▶</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
