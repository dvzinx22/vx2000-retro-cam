import React, { useEffect, useRef, useState } from 'react';
import { CameraConfig } from '../types/camera';
import { WebGLRetroRenderer } from '../services/WebGLRetroRenderer';
import { mediaStreamService } from '../services/MediaStreamService';
import { retroAudioProcessor } from '../services/RetroAudioProcessor';
import { OSDOverlay } from './OSDOverlay';

interface Props {
  config: CameraConfig;
  isRecording: boolean;
  recordingSeconds: number;
  batteryPercent: number;
  hudMessage?: string | null;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export const Viewfinder: React.FC<Props> = ({
  config,
  isRecording,
  recordingSeconds,
  batteryPercent,
  hudMessage,
  onCanvasReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<WebGLRetroRenderer | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Initialize Camera & WebGL2 Pipeline
  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const stream = await mediaStreamService.startStream(config.facingMode);

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Pipe audio through RetroAudioProcessor
        retroAudioProcessor.connectMicStream(stream);

        // Setup hidden video element
        let video = videoRef.current;
        if (!video) {
          video = document.createElement('video');
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          videoRef.current = video;
        }
        video.srcObject = stream;
        await video.play();

        // Setup WebGL2 Renderer
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (!rendererRef.current) {
          const renderer = new WebGLRetroRenderer(canvas);
          rendererRef.current = renderer;
          onCanvasReady(canvas);
        }

        rendererRef.current.startRenderLoop(video, () => configRef.current);
      } catch (err: unknown) {
        console.error('Camera initialization error:', err);
        setCameraError((err as Error)?.message || 'Error al conectar con la cámara.');
      }
    }

    initCamera();

    return () => {
      active = false;
      if (rendererRef.current) {
        rendererRef.current.stopRenderLoop();
      }
      mediaStreamService.stopStream();
    };
  }, [config.facingMode, onCanvasReady]);

  return (
    <div className="w-full max-w-[540px] aspect-[4/3] bg-black rounded-lg border-4 border-[#1f1f24] shadow-2xl relative overflow-hidden flex items-center justify-center">
      {/* 4:3 WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block bg-zinc-950"
      />

      {/* OSD Overlay */}
      <OSDOverlay
        config={config}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        batteryPercent={batteryPercent}
        hudMessage={hudMessage}
      />

      {/* CRT Glass Reflection Glare */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.07] border border-white/10" />

      {/* Camera permission error banner */}
      {cameraError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20">
          <span className="text-red-500 font-bold text-sm tracking-widest mb-2">[ERROR DE CÁMARA]</span>
          <p className="text-xs text-gray-300 mb-4 max-w-xs">{cameraError}</p>
          <span className="text-[10px] text-gray-500 font-mono">
            Verifica que has concedido permisos de cámara y micrófono al navegador.
          </span>
        </div>
      )}
    </div>
  );
};
