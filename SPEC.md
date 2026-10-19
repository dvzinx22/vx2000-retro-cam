# SPEC.md — Especificación del Sistema: VX-2000 Retro Cam

## 1. Contexto Visual y Modos de Cámara Requeridos
La aplicación debe transformar el flujo de video moderno del teléfono en una señal de definición estándar (SD) con relación de aspecto **4:3** y texturas propias de cintas MiniDV:

* **Formato Nativo 4:3 y Downsampling SD:** El visor y la grabación final deben operar en proporción 4:3, cuantizando el muestreo a una resolución virtual de `640x480` (480p) para eliminar la nitidez artificial de los sensores modernos.
* **Modo 1 — Lente Normal CCD (4:3 Estándar):** Sin deformación esférica, conservando únicamente la degradación de resolución 480p, aberración cromática ligera, sombras empastadas (*crushed blacks*), tonos medios cálidos y *bloom* en las luces altas.
* **Modo 2 — Lente Fisheye de Cuadro Completo (Full-Frame Fisheye):** Aplica una distorsión óptica de barril moderada ($k = 0.45$) que curva las líneas rectas hacia los extremos manteniendo la imagen en todo el recuadro 4:3, acompañada de un viñeteado suave en las esquinas.
* **Modo 3 — Lente Ojo de Pez Circular Extremo (Peephole / 0.3x Adapter):** Aplica una distorsión esférica agresiva ($k = 1.15$) encerrada dentro de una máscara circular negra con bordes ligeramente difuminados (`smoothstep`), simulando un adaptador óptico gran angular extremo donde el barril físico del lente recorta el encuadre.
* **Modo Visión Nocturna Infrarroja (NightShot):** Interruptor independiente acumulable con cualquier lente que convierte la imagen en una señal monocromática verde esmeralda, amplifica la ganancia de luminancia en entornos oscuros e incrementa el grano digital un 50%.
* **Control de Flash Continuo (Antorcha) y Zoom Brusco:** Soporte para encender el LED del teléfono de forma continua durante la grabación nocturna (generando alto contraste en rostros cercanos y fondo oscuro) y un control de zoom digital escalonado (`W <-> T`) que replique el servo-zoom de una videocámara antigua.

---

## 2. Arquitectura del Pipeline Multimedia (Tiempo Real)

El procesamiento no debe realizarse en CPU para evitar caídas de fotogramas. Se debe implementar el siguiente flujo de datos:

1. **Capa de Captura (`MediaStreamService`):**
   * Solicita acceso a cámara (`facingMode: "environment"` o `"user"`) y micrófono mediante `navigator.mediaDevices.getUserMedia`.
   * Fuerza el constraint de video a relación `4:3` a `30 fps`.
   * Expone métodos para alternar el flash continuo (`track.applyConstraints({ advanced: [{ torch: true }] })`) y el zoom de hardware/digital.
2. **Capa de Renderizado GPU (`WebGLRetroRenderer`):**
   * Recibe el elemento `<video>` oculto como textura dinámica (`texImage2D`) en un contexto **WebGL2** de `640x480`.
   * Ejecuta el *Fragment Shader* en cada ciclo de `requestAnimationFrame` limitado a 30 FPS para mantener la cadencia clásica de video entrelazado/progresivo de los 2000s.
   * Dibuja opcionalmente el OSD (On-Screen Display: indicador `REC`, código de tiempo `TC`, fecha retro y modo de lente) en una capa superpuesta o dentro del mismo canvas.
3. **Capa de Procesamiento de Audio (`RetroAudioProcessor`):**
   * Conecta el micrófono a un `AudioContext`.
   * Pasa la señal por un filtro de paso alto (`BiquadFilterNode` `highpass` a 250 Hz), un filtro de paso bajo (`lowpass` a 4200 Hz) y un `DynamicsCompressorNode` agresivo con una ligera curva de saturación (`WaveShaperNode`) para emular la cápsula de micrófono saturada en conciertos y fiestas.
4. **Capa de Grabación (`CanvasVideoRecorder`):**
   * Captura el stream del `<canvas>` WebGL a 30 FPS usando `canvas.captureStream(30)`.
   * Combina la pista de video del canvas con la pista de audio procesada (`MediaStreamAudioDestinationNode`).
   * Codifica mediante `MediaRecorder` (`video/mp4` o `video/webm;codecs=vp9,opus`) con un bitrate de video fijado en `2.5 Mbps` para introducir artefactos sutiles de compresión auténticos de la época.

---

## 3. Especificación de Estado y Tipos (`src/types/camera.ts`)

```typescript
export type LensMode = 'NORMAL_4_3' | 'FISHEYE_FULL' | 'FISHEYE_CIRCLE';

export interface CameraConfig {
  lensMode: LensMode;
  nightShot: boolean;
  torchEnabled: boolean;
  facingMode: 'user' | 'environment';
  zoomLevel: number; // 1.0 a 4.0
  showOSD: boolean;  // Grabar o no las letras retro en el video
  bloomIntensity: number; // 0.0 a 1.0
  grainIntensity: number; // 0.0 a 1.0
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
}
```

---

## 4. Pipeline Matemático del Fragment Shader (GLSL 3.00 ES)

1. **Downsampling 480p:**
   $$\text{targetRes} = \text{vec2}(640.0, 480.0)$$
   $$uv = \frac{\lfloor vTexCoord \cdot \text{targetRes} \rfloor}{\text{targetRes}}$$
2. **Corrección de Aspecto 4:3 y Centro:**
   $$p = uv - 0.5$$
   $$p.x = p.x \cdot (4.0 / 3.0)$$
   $$r^2 = p.x^2 + p.y^2, \quad r = \sqrt{r^2}$$
3. **Deformación Óptica:**
   * **Modo 1 (Normal 4:3):** $\text{distortedUV} = uv, \quad \text{mask} = 1.0$
   * **Modo 2 (Fisheye Full):** $\text{distortedUV} = 0.5 + (uv - 0.5) \cdot (1.0 + 0.45 \cdot r^2), \quad \text{mask} = \text{smoothstep}(0.85, 0.55, r)$
   * **Modo 3 (Peephole 0.3x):** $\text{distortedUV} = 0.5 + (uv - 0.5) \cdot (1.0 + 1.15 \cdot r^2), \quad \text{mask} = 1.0 - \text{smoothstep}(0.46, 0.49, r)$
4. **Aberración Cromática Lateral:**
   $$\text{offset} = 0.006 \cdot r^2$$
   $$R = \text{texture}(uTex, \text{distortedUV} + (uv - 0.5) \cdot \text{offset}).r$$
   $$G = \text{texture}(uTex, \text{distortedUV}).g$$
   $$B = \text{texture}(uTex, \text{distortedUV} - (uv - 0.5) \cdot \text{offset}).b$$
5. **Gradación de Color y Grano:**
   * **NightShot:** $Y = 0.299R + 0.587G + 0.114B$, amplificado por $\text{pow}(Y \cdot 1.45, 0.85)$ con tinte verde esmeralda `(0.15, 0.96, 0.28)` y ruido amplificado.
   * **CCD Vintage:** Contraste con curva en "S" `smoothstep(0.04, 0.96, color)` multiplicado por tinte cálido `(1.06, 1.01, 0.92)` y grano sutil.
