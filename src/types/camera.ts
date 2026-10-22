export type LensMode = 'NORMAL_4_3' | 'FISHEYE_FULL' | 'FISHEYE_CIRCLE';

export interface CameraConfig {
  lensMode: LensMode;
  nightShot: boolean;
  torchEnabled: boolean;
  facingMode: 'user' | 'environment';
  zoomLevel: number; // 1.0 a 4.0
  showOSD: boolean;  // Mostrar OSD en pantalla
  burnOSD: boolean;  // Grabar o no las letras retro directamente en el video
  bloomIntensity: number; // 0.0 a 1.0
  grainIntensity: number; // 0.0 a 1.0
  tapeFormat: 'SP' | 'LP';
  tapeMinutesLeft: number;
  vintageYear: number;
  vintageDate: string;
  autoSaveToGallery: boolean; // Guardar automáticamente fotos y videos en la galería y memoria
  recordingFps: 15 | 24 | 30 | 60; // Selector de fotogramas por segundo (FPS)
}

export interface RecordedMedia {
  id: string;
  blob: Blob;
  url: string;
  type: 'video' | 'photo';
  durationSeconds: number;
  timestamp: string;
  lensMode: LensMode;
  nightShot: boolean;
  recordingFps?: number;
}
