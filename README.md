# 📼 VX-2000 Retro Cam

<div align="center">

![GitHub Release](https://img.shields.io/github/v/release/dvzinx22/vx2000-retro-cam?style=for-the-badge&color=f59e0b)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue?style=for-the-badge&logo=android)
![WebGL2](https://img.shields.io/badge/Graphics-WebGL2%20%2F%20GLSL%203.00%20ES-22c55e?style=for-the-badge&logo=webgl)
![License](https://img.shields.io/github/license/dvzinx22/vx2000-retro-cam?style=for-the-badge&color=8b5cf6)
![Build](https://img.shields.io/github/actions/workflow/status/dvzinx22/vx2000-retro-cam/build-apk.yml?style=for-the-badge)

**Emulación matemática en tiempo real de la legendaria videocámara MiniDV Sony DCR-VX2000 / VX1000 y lentes ojo de pez de los años 90 y 2000.**

[📥 Descargar APK para Android](#-descarga-del-apk-android) • [✨ Características](#-características-principales) • [📐 Pipeline Matemático](#-pipeline-matemático-de-shaders-glsl) • [🚀 Instalación](#-instalación-y-desarrollo) • [📋 Especificación SDD](#-metodología-sdd)

</div>

---

## 📺 Visor On-Screen Display (OSD)

```text
┌─────────────────────────────────────────────────────────────┐
│ SP 30p  BATT [■■■■] 86%      [FISHEYE FULL]       ● REC     │
│ TAPE 58min                                        CH1/CH2 [|||| ]
│                                                             │
│                                                             │
│                          ┌       ┐                          │
│                              +                              │
│                          └       ┘                          │
│                                                   [T]       │
│                                                   [■] 1.0x  │
│                                                   [W]       │
│                                                             │
│ TC 00:01:24:18                                              │
│ 1/60 F2.4 30FPS AUTO                           OCT 18 2000  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Características Principales

### 🎥 1. Pipeline Óptico WebGL2 (GLSL 3.00 ES)
* **Cuantización Virtual SD 480p (4:3 NTSC):** Elimina la nitidez digital hiperrealista de los sensores móviles modernos mediante downsampling discreto en GPU a $640 \times 480$ manteniendo el aspecto clásico 4:3.
* **Lente Ojo de Pez Cuadro Completo (Full-Frame Fisheye):** Distorsión de barril esférica ($k=0.45$) con viñeteado suave en las esquinas, emulando lentes adaptadores Century Optics MK1.
* **Lente Ojo de Pez Circular Extremo 0.3x (Peephole):** Curvatura esférica ultra-agresiva ($k=1.15$) encapsulada en una máscara circular negra con atenuación `smoothstep`.
* **Modo CCD Clásico 4:3:** Sin distorsión esférica; aplica curva de contraste en "S" (`crushed blacks`), tonos medios cálidos y *bloom* suave en altas luces.
* **Visión Nocturna Infrarroja (NightShot):** Tinte monocromático verde esmeralda `(0.15, 0.96, 0.28)`, amplificación de luminancia en entornos de baja luz y grano aumentado un 50%.
* **Aberración Cromática Radial:** Separación de canales RGB en función del radio al cuadrado ($r^2$), proyectando desfase cromático hacia los bordes de la óptica.

---

### 🎙️ 2. Procesador Acústico MiniDV (Web Audio API)
* **Curva de Respuesta 2000s:** Filtro pasa-altos a $250\text{ Hz}$ y filtro pasa-bajos a $4200\text{ Hz}$ con resonancia en $1800\text{ Hz}$.
* **Compresión y Saturación Analógica:** `DynamicsCompressorNode` agresivo combinado con `WaveShaperNode` para reproducir el comportamiento de cápsulas de micrófono de camcorder saturando en conciertos o skateparks.
* **Efectos Mecánicos Auténticos:** Zumbido de arrastre de motor de cinta MiniDV (*tape hum*) y beeps de botones piezoeléctricos.

---

### 💾 3. Guardado en Memoria del Dispositivo y Galería
* **Integración Nativa con la Galería de Android:** Las fotos y videos capturados se envían directamente a la app de **Galería / Google Fotos / Samsung Galería** dentro del álbum **`VX2000`** mediante `MediaStore`.
* **Copia de Seguridad en Almacenamiento Interno:** Se almacena una copia permanente en **`Mis Archivos > Documentos > VX2000`** accesible desde cualquier explorador de archivos.
* **Guardado Automático o Manual:** Configurable desde el menú de ajustes (`SETUP`).
* **Deck de Cintas MiniDV:** Permite revisar todas las tomas grabadas en la sesión actual, previsualizarlas con sonido retro y guardarlas o eliminarlas de forma individual.

---

### ⏱️ 4. Selector de Cadencia de Grabación (FPS)
Personaliza la tasa de cuadros por segundo de los videos grabados directamente desde el menú de configuración:
* **15 FPS:** Estética stop-motion vintage, streaming 90s y cámaras web lo-fi.
* **24 FPS:** Cadencia cinematográfica de película analógica.
* **30 FPS (Por defecto):** Estándar de televisión NTSC y cintas MiniDV de principios de los 2000.
* **60 FPS:** Movimiento ultra fluido para acción deportiva y skate videos.

---

## 📐 Pipeline Matemático de Shaders (GLSL)

El procesamiento gráfico se ejecuta íntegramente en la GPU a través de un único pase de fragment shader en WebGL2:

1. **Cuantización de Coordenadas:**
   $$\text{targetRes} = \begin{pmatrix} 640.0 \\ 480.0 \end{pmatrix}, \quad uv = \frac{\lfloor vTexCoord \cdot \text{targetRes} \rfloor}{\text{targetRes}}$$

2. **Corrección de Relación de Aspecto (4:3):**
   $$p = uv - 0.5, \quad p_x = p_x \cdot \frac{4.0}{3.0}, \quad r^2 = p_x^2 + p_y^2, \quad r = \sqrt{r^2}$$

3. **Distorsión Óptica de Barril:**
   $$\text{distortedUV} = 0.5 + (uv - 0.5) \cdot (1.0 + k \cdot r^2)$$
   * *Full-Frame:* $k = 0.45, \quad \text{mask} = \text{smoothstep}(0.85, 0.55, r)$
   * *Peephole 0.3x:* $k = 1.15, \quad \text{mask} = 1.0 - \text{smoothstep}(0.46, 0.49, r)$

4. **Aberración Cromática Lateral:**
   $$\text{offset} = 0.006 \cdot r^2$$
   $$R = \text{texture}(uTex, \text{distortedUV} + (uv - 0.5) \cdot \text{offset}).r$$
   $$G = \text{texture}(uTex, \text{distortedUV}).g$$
   $$B = \text{texture}(uTex, \text{distortedUV} - (uv - 0.5) \cdot \text{offset}).b$$

---

## 📥 Descarga del APK Android

Puedes instalar la aplicación directamente en cualquier teléfono con Android 9+:

| Versión | Enlace de Descarga | Notas |
|:---|:---|:---|
| **v1.0.2 (Última)** | [**Descargar app-debug.apk**](https://github.com/dvzinx22/vx2000-retro-cam/releases/download/v1.0.2/app-debug.apk) | Selector de FPS (15, 24, 30, 60 FPS), guardado en Galería + Almacenamiento interno |
| **v1.0.1** | [Descargar app-debug.apk](https://github.com/dvzinx22/vx2000-retro-cam/releases/download/v1.0.1/app-debug.apk) | Guardado automático en Galería y álbum VX2000 |
| **v1.0.0** | [Descargar app-debug.apk](https://github.com/dvzinx22/vx2000-retro-cam/releases/download/v1.0.0/app-debug.apk) | Release inicial con shaders WebGL2 y DSP de audio |

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Propósito |
|:---|:---|:---|
| **Frontend Core** | React 19 + TypeScript | UI táctil, estado reactivo y modales MiniDV |
| **Build Tool** | Vite 6 | Servidor de desarrollo ultrarrápido y empaquetado optimizado |
| **Estilos** | TailwindCSS 3 | Diseño retro analógico, tipografía monospace y dark mode |
| **Motor de Renderizado** | WebGL 2.0 / GLSL 3.00 ES | Pipeline de shaders a 60 FPS sin sobrecarga de CPU |
| **Audio DSP** | Web Audio API | Filtros de audio MiniDV, distorsión y samples mecánicos |
| **Empaquetado Móvil** | Capacitor 7 | Puente híbrido a Android nativo con soporte de permisos de hardware |
| **Acceso a Galería** | `@capacitor-community/media` | Registro de fotos y videos en el MediaStore de Android |
| **Almacenamiento Local**| `@capacitor/filesystem` | Escritura en memoria interna (`Documents/VX2000`) |
| **CI / CD** | GitHub Actions | Compilación automatizada de APKs con JDK 21 y Gradle |

---

## 🚀 Instalación y Desarrollo

### Requisitos Previos
* [Node.js](https://nodejs.org/) v20 o superior
* [npm](https://www.npmjs.com/) v10 o superior
* [Android Studio](https://developer.android.com/studio) (opcional, solo para depuración nativa local)

### 1. Clonar el repositorio
```bash
git clone https://github.com/dvzinx22/vx2000-retro-cam.git
cd vx2000-retro-cam
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor local
```bash
npm run dev
```
Abre en tu navegador `http://localhost:5173` (o la dirección IP de tu red local en tu celular).

### 4. Compilar para producción y sincronizar Android
```bash
npm run build
npx cap sync android
```

### 5. Abrir en Android Studio o compilar APK local
```bash
npx cap open android
# O compilar directamente con Gradle:
cd android
./gradlew assembleDebug
```

---

## ⌨️ Atajos de Teclado (Modo Escritorio)

Si pruebas la aplicación desde una computadora:

| Tecla | Acción |
|:---:|:---|
| `ESPACIO` | Iniciar / Detener Grabación de Video |
| `P` | Tomar Foto CCD Instantánea |
| `N` | Activar / Desactivar Modo NightShot Infrarrojo |
| `L` | Alternar Modo de Lente (Normal $\rightarrow$ Fisheye Full $\rightarrow$ Peephole 0.3x) |

---

## 📋 Metodología SDD

Este proyecto fue concebido y desarrollado bajo la metodología **Spec-Driven Development (SDD)**:

* 📄 [**`SPEC.md`**](./SPEC.md): Especificación técnica exhaustiva con formulaciones matemáticas y restricciones de hardware.
* 📋 [**`TASKS.md`**](./TASKS.md): Plan de ejecución modular dividido en 5 fases de ingeniería.
* 📖 [**`SDD_RETRO_CAMCORDER.md`**](./SDD_RETRO_CAMCORDER.md): Documento de visión y contexto histórico del proyecto.

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo [`LICENSE`](./LICENSE) para más información.

<div align="center">
<sub>Desarrollado con pasión retro para los amantes de la cultura skate, estética MiniDV y gráficos por computadora.</sub>
</div>
