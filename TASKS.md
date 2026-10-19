# TASKS.md — Plan de Implementación por Fases (SDD)

## Fase 1: Configuración del Proyecto y Estructura Base
- [x] Crear `SPEC.md` con las especificaciones del sistema.
- [x] Crear `TASKS.md` con el desglose en 5 fases.
- [x] Inicializar entorno **React + TypeScript + Vite + TailwindCSS + Lucide Icons + Capacitor**.
- [x] Definir modelos de datos y tipos en `src/types/camera.ts` (`LensMode`, `CameraConfig`, `RecordedMedia`).
- [x] Configurar tokens de diseño y estética retro en `tailwind.config.js` e `index.css`.

## Fase 2: Capa de Captura y Audio Retro (Hardware & Web Audio API)
- [x] Implementar `MediaStreamService` en `src/services/MediaStreamService.ts` (restricciones 4:3, switch frontal/trasera, torch/antorcha, zoom).
- [x] Implementar `RetroAudioProcessor` en `src/services/RetroAudioProcessor.ts` (Web Audio API con filtro pasa-altos 250Hz, pasa-bajos 4200Hz, compresor agresivo y saturación `WaveShaperNode`).
- [x] Implementar generador de efectos sonoros mecánicos de videocámara (beeps piezoeléctricos, tono doble REC, zumbido de arrastre de tambor de cinta).

## Fase 3: Motor Gráfico WebGL2 y Pipeline de Shaders
- [x] Implementar `WebGLRetroRenderer` en `src/services/WebGLRetroRenderer.ts` a resolución nativa 640x480.
- [x] Compilar y enlazar Vertex Shader y Fragment Shader GLSL 3.00 ES con:
  - Downsampling virtual SD 480p.
  - Modo 1: Normal CCD 4:3 con curva de contraste y aberración suave.
  - Modo 2: Fisheye Full-Frame ($k = 0.45$) con viñeta.
  - Modo 3: Fisheye Circular Peephole 0.3x ($k = 1.15$) con máscara circular suavizada.
  - Modo NightShot infrarrojo verde esmeralda con ganancia de luminancia y grano analógico.
  - Aberración cromática radial y líneas de escaneo entrelazadas de CRT/MiniDV.
- [x] Limitar el ciclo de renderizado a 30 FPS constantes para cadencia de video retro.

## Fase 4: Motor de Grabación y Exportación Multimedia
- [x] Implementar `CanvasVideoRecorder` en `src/services/CanvasVideoRecorder.ts`:
  - Captura del stream del canvas mediante `canvas.captureStream(30)`.
  - Mezcla sincronizada de la pista de video con la pista de audio procesada por el filtro paso banda.
  - Codificación `MediaRecorder` con bitrate de 2.5 Mbps para emular compresión MiniDV.
  - Soporte de fotografía instantánea en formato JPEG con efectos quemados.
- [x] Crear componente de reproducción de casete MiniDV (`CassetteDeckModal.tsx`) para rebobinar, reproducir, descargar y borrar clips.

## Fase 5: UI/UX Estilo Sony DCR-VX1000, Integración Capacitor y Publicación en GitHub
- [x] Construir componentes de interfaz de videocámara física:
  - Visor LCD 4:3 con bisel de videocámara y reflejo de cristal CRT.
  - OSD superpuesto: indicador `● REC`, código de tiempo `TC 00:00:00:00`, batería `BATT [■■■□]`, estampa `OCT 18 2000`, escala de zoom y cinta `SP 60m`.
  - Dial físico selector de lentes, interruptor retro NightShot con LED, rocker servoasistido `W <-> T` y botón disparador REC.
- [x] Configurar **Capacitor** (`capacitor.config.ts`, plataforma Android, permisos de cámara y micrófono en `AndroidManifest.xml`).
- [ ] Inicializar repositorio Git y subirlo a **GitHub** mediante GitHub CLI (`gh repo create`).
