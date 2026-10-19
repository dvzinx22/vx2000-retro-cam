import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CameraConfig, RecordedMedia } from './types/camera';
import { Viewfinder } from './components/Viewfinder';
import { Controls } from './components/Controls';
import { CassetteDeckModal } from './components/CassetteDeckModal';
import { SettingsModal } from './components/SettingsModal';
import { retroAudioProcessor } from './services/RetroAudioProcessor';
import { canvasVideoRecorder } from './services/CanvasVideoRecorder';
import { galleryService } from './services/GalleryService';

export const App: React.FC = () => {
  const [config, setConfig] = useState<CameraConfig>({
    lensMode: 'FISHEYE_FULL',
    nightShot: false,
    torchEnabled: false,
    facingMode: 'environment',
    zoomLevel: 1.0,
    showOSD: true,
    burnOSD: false,
    bloomIntensity: 0.6,
    grainIntensity: 1.0,
    tapeFormat: 'SP',
    tapeMinutesLeft: 58,
    vintageYear: 2000,
    vintageDate: 'OCT 18 2000',
    autoSaveToGallery: true,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [batteryPercent] = useState(86);
  const [clips, setClips] = useState<RecordedMedia[]>([]);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hudMessage, setHudMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const showHudMessage = useCallback((msg: string) => {
    setHudMessage(msg);
    setTimeout(() => {
      setHudMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Recording second ticker
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const updateConfig = useCallback((partial: Partial<CameraConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleToggleRecord = useCallback(async () => {
    if (!canvasRef.current) return;

    if (!isRecording) {
      // Start REC
      retroAudioProcessor.playRecStart();
      retroAudioProcessor.startTapeHum();
      setRecordingSeconds(0);
      setIsRecording(true);
      setConfig((prev) => ({
        ...prev,
        tapeMinutesLeft: Math.max(1, prev.tapeMinutesLeft - 1),
      }));
      await canvasVideoRecorder.startRecording(canvasRef.current, config);
    } else {
      // Stop REC
      retroAudioProcessor.playRecStop();
      retroAudioProcessor.stopTapeHum();
      setIsRecording(false);
      try {
        const media = await canvasVideoRecorder.stopRecording(config);
        setClips((prev) => [media, ...prev]);

        if (config.autoSaveToGallery) {
          galleryService.saveMedia(media).then((res) => {
            showHudMessage(res.success ? 'VIDEO GUARDADO EN GALERÍA' : 'ERROR AL GUARDAR VIDEO');
          });
        }
      } catch (err) {
        console.error('Stop recording error:', err);
      }
    }
  }, [isRecording, config, showHudMessage]);

  const handleTakeSnapshot = useCallback(async () => {
    if (!canvasRef.current) return;
    retroAudioProcessor.playBeep(2600, 0.08, 'triangle');
    const photo = await canvasVideoRecorder.takeSnapshot(canvasRef.current, config);
    setClips((prev) => [photo, ...prev]);

    if (config.autoSaveToGallery) {
      galleryService.saveMedia(photo).then((res) => {
        showHudMessage(res.success ? 'FOTO GUARDADA EN GALERÍA' : 'ERROR AL GUARDAR FOTO');
      });
    }
  }, [config, showHudMessage]);

  const handleDeleteClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.key === 'p' || e.key === 'P') {
        handleTakeSnapshot();
      } else if (e.key === 'n' || e.key === 'N') {
        retroAudioProcessor.playBeep(1800, 0.05);
        setConfig((prev) => ({ ...prev, nightShot: !prev.nightShot }));
      } else if (e.key === 'l' || e.key === 'L') {
        retroAudioProcessor.playBeep(2100, 0.05);
        setConfig((prev) => {
          const modes: CameraConfig['lensMode'][] = ['NORMAL_4_3', 'FISHEYE_FULL', 'FISHEYE_CIRCLE'];
          const nextIdx = (modes.indexOf(prev.lensMode) + 1) % modes.length;
          return { ...prev, lensMode: modes[nextIdx] };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleRecord, handleTakeSnapshot]);

  return (
    <div className="min-h-full w-full bg-[#0a0a0d] flex flex-col items-center justify-between p-2 sm:p-4 text-gray-100 select-none overflow-y-auto">
      {/* Camcorder Brand Headplate */}
      <header className="w-full max-w-[540px] flex items-center justify-between bg-[#15151a] border border-[#262630] rounded-lg px-3 py-2 mb-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#b31414] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
            3CCD
          </div>
          <div>
            <h1 className="text-white text-xs font-black tracking-widest leading-tight">
              HARPER DCR-VX2000
            </h1>
            <span className="text-[7.5px] text-gray-400 tracking-wider">
              MINIDV DIGITAL CAMCORDER • FISHEYE 0.3x
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff66]" />
          <span className="text-gray-400 text-[9px] font-bold tracking-wider">NTSC 4:3</span>
        </div>
      </header>

      {/* Main 4:3 Viewfinder Container */}
      <main className="w-full flex justify-center items-center my-auto">
        <Viewfinder
          config={config}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          batteryPercent={batteryPercent}
          hudMessage={hudMessage}
          onCanvasReady={(c) => {
            canvasRef.current = c;
          }}
        />
      </main>

      {/* Tactile Hardware Controls Panel */}
      <footer className="w-full flex flex-col items-center mt-2">
        <Controls
          config={config}
          isRecording={isRecording}
          onUpdateConfig={updateConfig}
          onToggleRecord={handleToggleRecord}
          onTakeSnapshot={handleTakeSnapshot}
          onOpenDeck={() => setIsDeckOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Desktop Keyboard shortcuts hint */}
        <div className="hidden sm:flex items-center gap-2 text-[8.5px] text-gray-500 mt-2 font-mono">
          <span>⌨️ <strong className="text-amber-400">[ESPACIO]</strong> Grabar</span>
          <span>•</span>
          <span><strong className="text-amber-400">[P]</strong> Foto</span>
          <span>•</span>
          <span><strong className="text-emerald-400">[N]</strong> NightShot</span>
          <span>•</span>
          <span><strong className="text-cyan-400">[L]</strong> Alternar Lente</span>
        </div>
      </footer>

      {/* Cassette Tape Deck Modal */}
      <CassetteDeckModal
        isOpen={isDeckOpen}
        clips={clips}
        onClose={() => setIsDeckOpen(false)}
        onDeleteClip={handleDeleteClip}
      />

      {/* Settings / Config Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateConfig={updateConfig}
      />
    </div>
  );
};

export default App;
