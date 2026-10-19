# Harper — MiniDV & CCD Retro Camcorder (Sony Handycam / VX1000)

Aplicación móvil y multiplataforma desarrollada en **React Native con Expo SDK 58** que recrea fielmente la estética de las videocámaras MiniDV y sensores CCD de finales de los 90 y principios de los 2000.

---

## 1. Arquitectura y Componentes Implementados

```
harper/
├── App.tsx                          # Chasis principal, atajos de teclado y estado central
├── app.json                         # Configuración de permisos de Cámara, Micrófono y Galería
├── src/
│   ├── types/
│   │   └── camcorder.ts             # Definición de tipos, LensMode, CamcorderState y RecordedClip
│   ├── shaders/
│   │   └── retroShader.ts           # Shaders GLSL (OpenGL ES 3.0 / WebGL2 y fallback ES2)
│   ├── services/
│   │   └── audioEffects.ts          # Síntesis de sonido retro (beeps, motor cinta) y filtro paso banda
│   └── components/
│       ├── CamcorderViewfinder.tsx  # Visor 4:3 con pipeline GPU en tiempo real y captura MP4/WebM
│       ├── CamcorderOSD.tsx         # On-Screen Display retro (Timecode, REC parpadeante, BATT, estampa)
│       ├── CamcorderControls.tsx    # Controles táctiles (dial de lentes, slider NightShot, rocker zoom)
│       ├── TapeGalleryModal.tsx     # Reproductor de cinta MiniDV y descarga de clips
│       └── SettingsModal.tsx        # Menú de configuración (año de estampa, SP/LP, balance de blancos)
```

---

## 2. Especificación Técnica de los Efectos Visuales

### A. Pipeline de Shaders (`src/shaders/retroShader.ts`)

1. **Downsampling a SD 4:3 (640×480):**
   Cuantización virtual del espacio $uv$:
   $$\text{uv} = \frac{\lfloor vTexCoord \cdot (640, 480) \rfloor}{(640, 480)}$$

2. **Lente Ojo de Pez (*Fisheye*) de Cuadro Completo (`LensMode.FISHEYE_FULL`):**
   Distorsión de barril continua con curvatura $k = 0.45$:
   $$p' = 0.5 + (uv - 0.5) \cdot (1.0 + k \cdot r^2)$$
   Acompañada de viñeteado gradual en las esquinas mediante `smoothstep(0.85, 0.55, r)`.

3. **Lente Ojo de Pez Circular (*Peephole 0.3x*) (`LensMode.FISHEYE_CIRCULAR`):**
   Distorsión extrema de $k = 1.15$ recortada por una máscara circular negra con borde suavizado:
   $$\text{mask} = 1.0 - \text{smoothstep}(0.46, 0.49, r)$$

4. **Aberración Cromática Lateral:**
   Separación física de canales RGB en proporción radial al borde del lente:
   $$\text{chromaOffset} = 0.006 \cdot r^2$$

5. **Modo Visión Nocturna Infrarroja (*Sony NightShot*):**
   * Cálculo de luminancia $Y = 0.299R + 0.587G + 0.114B$.
   * Amplificación gamma: $\text{luma}^{0.85} \cdot 1.45$.
   * Tinte verde esmeralda infrarrojo: $\text{vec3}(0.15, 0.96, 0.28) \cdot \text{luma}$.
   * Ruido analógico pseudoaleatorio de alta frecuencia.

6. **Colorimetría Vintage CCD (NightShot Desactivado):**
   Curva de contraste en "S", sombras empastadas y calidez en tonos medios multiplicada por $\text{vec3}(1.06, 1.01, 0.92)$.

---

## 3. Post-procesamiento y Síntesis de Audio (`src/services/audioEffects.ts`)

* **Filtro de Paso de Banda (Band-pass Filter):**
  * Corte pasa-altos en $320\text{ Hz}$ (elimina frecuencias sub-graves de teléfonos modernos).
  * Corte pasa-bajos en $4200\text{ Hz}$ (amortigua agudos cristalinos modernos).
  * Resonancia en $1800\text{ Hz}$ ($Q = 1.8$, $+4\text{ dB}$) para simular cápsulas de micrófonos electret de los 2000.
* **Efectos de Sonido Analógicos:**
  * Beep de menú y confirmación piezoeléctrico ($1900\text{ Hz}$).
  * Doble tono para inicio ($1550\text{ Hz} \to 2200\text{ Hz}$) y parada ($2200\text{ Hz} \to 1400\text{ Hz}$) de grabación `REC`.
  * Zumbido de arrastre de tambor de cinta MiniDV en bucle continuo durante `REC`.
  * Silbido del motor del zoom servoasistido (`W / T`).

---

## 4. Instrucciones para Ejecutar

### Pruebas Rápidas en el Navegador Web (Con Cámara Web y Filtros en Vivo):
```bash
npx expo start --web
```
> **Atajos de teclado en PC/Mac:**
> * `[ESPACIO]` — Iniciar / Detener grabación (REC)
> * `[P]` — Capturar foto instantánea CCD
> * `[N]` — Alternar modo infrarrojo NightShot
> * `[L]` — Alternar lente (4:3 Normal $\to$ Fisheye Full $\to$ Fisheye Circular)

### Ejecución en Dispositivo Android Físico o Emulador:
```bash
# Iniciar servidor de desarrollo de Expo para Android
npx expo start --android

# O generar prebuild nativo para desarrollo con binarios compilados
npx expo run:android
```

### Verificación de Calidad:
```bash
npx tsc --noEmit     # Typechecking estricto de TypeScript
npx expo lint        # Linter de Expo y ESLint 9
npx expo-doctor      # Diagnóstico completo de compatibilidad de dependencias
```
