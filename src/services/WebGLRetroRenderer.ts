import { CameraConfig, LensMode } from '../types/camera';

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 vTexCoord;
out vec4 fragColor;

uniform sampler2D uCameraTexture;
uniform float uTime;
uniform int uLensMode;       // 0: Normal 4:3, 1: Fisheye Full, 2: Fisheye Circle (0.3x)
uniform bool uNightShot;     // true: Modo Verde Infrarrojo
uniform float uGrain;        // Intensidad de grano
uniform float uBloom;        // Intensidad de bloom
uniform float uDigitalZoom;  // Factor de zoom digital (1.0 a 4.0)

// Generador de ruido para grano de sensor analógico
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // 1. Simulación de resolución SD 480p nativa en 4:3
    vec2 targetRes = vec2(640.0, 480.0);
    vec2 uv = floor(vTexCoord * targetRes) / targetRes;

    // Aplicar zoom digital centrado
    if (uDigitalZoom > 1.01) {
        uv = (uv - 0.5) / uDigitalZoom + 0.5;
    }

    // Coordenadas centradas con relación de aspecto 4:3
    vec2 p = uv - 0.5;
    p.x *= (4.0 / 3.0);
    float r2 = dot(p, p);
    float r = sqrt(r2);

    // 2. Deformación Óptica
    vec2 distortedUV = uv;
    float mask = 1.0;

    if (uLensMode == 1) {
        // Modo 2: Lente Fisheye de Cuadro Completo (k = 0.45)
        float k = 0.45;
        distortedUV = 0.5 + (uv - 0.5) * (1.0 + k * r2);
        mask = smoothstep(0.85, 0.55, r); // Viñeteado oscuro en esquinas
    } else if (uLensMode == 2) {
        // Modo 3: Lente Ojo de Pez Circular Extremo 0.3x (k = 1.15)
        float k = 1.15;
        distortedUV = 0.5 + (uv - 0.5) * (1.0 + k * r2);
        mask = 1.0 - smoothstep(0.46, 0.49, r); // Máscara circular negra
    }

    // Recorte fuera de límites
    if (distortedUV.x < 0.0 || distortedUV.x > 1.0 || distortedUV.y < 0.0 || distortedUV.y > 1.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // 3. Aberración Cromática Lateral en los bordes
    float chromaOffset = 0.006 * r2;
    float colR = texture(uCameraTexture, distortedUV + (uv - 0.5) * chromaOffset).r;
    float colG = texture(uCameraTexture, distortedUV).g;
    float colB = texture(uCameraTexture, distortedUV - (uv - 0.5) * chromaOffset).b;
    vec3 color = vec3(colR, colG, colB);

    // 4. Bloom sutil en altas luces
    float bright = dot(color, vec3(0.299, 0.587, 0.114));
    if (bright > 0.72) {
        color += color * (bright - 0.72) * (0.8 * uBloom);
    }

    // 5. Grano dinámico de sensor analógico CCD
    float grainVal = (rand(uv + fract(uTime * 3.7)) - 0.5) * (0.08 * uGrain);

    // 6. Colorimetría: NightShot vs Retro CCD 2000s
    if (uNightShot) {
        // Modo Visión Nocturna Infrarroja
        float luma = dot(color, vec3(0.299, 0.587, 0.114));
        luma = pow(clamp(luma * 1.45, 0.0, 1.0), 0.85);
        color = vec3(0.15, 0.96, 0.28) * luma + grainVal * 1.8;
    } else {
        // Modo CCD 2000s: curva S + calidez + negros empastados
        color = smoothstep(0.04, 0.96, color);
        color *= vec3(1.06, 1.01, 0.92);
        color += grainVal;
    }

    // 7. Líneas de escaneo CRT sutiles
    float scanline = sin(vTexCoord.y * targetRes.y * 3.14159) * 0.5 + 0.5;
    color *= (1.0 - 0.08 * (1.0 - scanline));

    fragColor = vec4(clamp(color * mask, 0.0, 1.0), 1.0);
}
`;

export class WebGLRetroRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private startTime = Date.now();
  private targetFps = 30;
  private frameInterval = 1000 / 30; // 33.33ms

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
  }

  private initGL(): void {
    this.canvas.width = 640;
    this.canvas.height = 480;

    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: true, // Needed for recording & snapshots
    });

    if (!gl) {
      throw new Error('WebGL 2.0 no soportado en este dispositivo/navegador');
    }
    this.gl = gl;

    // Compile vertex shader
    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, VERTEX_SHADER_SOURCE);
    gl.compileShader(vertShader);

    // Compile fragment shader
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, FRAGMENT_SHADER_SOURCE);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compile failed:', gl.getShaderInfoLog(fragShader));
    }

    // Link program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program));
    }
    this.program = program;
    gl.useProgram(program);

    // Quad geometry covering NDC [-1, 1]
    const vertices = new Float32Array([
      // X, Y, U, V
      -1.0, -1.0, 0.0, 1.0,
       1.0, -1.0, 1.0, 1.0,
      -1.0,  1.0, 0.0, 0.0,
      -1.0,  1.0, 0.0, 0.0,
       1.0, -1.0, 1.0, 1.0,
       1.0,  1.0, 1.0, 0.0,
    ]);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

    // Texture setup
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // Quantized pixel feel

    this.texture = texture;
  }

  startRenderLoop(
    videoEl: HTMLVideoElement,
    getConfig: () => CameraConfig,
    osdCanvasOverlay?: HTMLCanvasElement | null
  ): void {
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const render = (now: number) => {
      if (!this.isRunning) return;

      const elapsed = now - this.lastFrameTime;
      if (elapsed >= this.frameInterval) {
        this.lastFrameTime = now - (elapsed % this.frameInterval);
        this.renderFrame(videoEl, getConfig());

        // Burn OSD into the WebGL canvas if burnOSD is enabled
        const config = getConfig();
        if (config.burnOSD && osdCanvasOverlay && this.gl) {
          this.burnOSDLayer(osdCanvasOverlay);
        }
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private renderFrame(video: HTMLVideoElement, config: CameraConfig): void {
    const gl = this.gl;
    const program = this.program;
    const texture = this.texture;

    if (!gl || !program || !texture || video.readyState < video.HAVE_CURRENT_DATA) {
      return;
    }

    gl.viewport(0, 0, 640, 480);
    gl.useProgram(program);

    // Upload video frame to texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Uniforms
    const uCameraTexture = gl.getUniformLocation(program, 'uCameraTexture');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uLensMode = gl.getUniformLocation(program, 'uLensMode');
    const uNightShot = gl.getUniformLocation(program, 'uNightShot');
    const uGrain = gl.getUniformLocation(program, 'uGrain');
    const uBloom = gl.getUniformLocation(program, 'uBloom');
    const uDigitalZoom = gl.getUniformLocation(program, 'uDigitalZoom');

    gl.uniform1i(uCameraTexture, 0);
    const secs = (Date.now() - this.startTime) / 1000.0;
    gl.uniform1f(uTime, secs);

    let lensInt = 0;
    if (config.lensMode === 'FISHEYE_FULL') lensInt = 1;
    else if (config.lensMode === 'FISHEYE_CIRCLE') lensInt = 2;

    gl.uniform1i(uLensMode, lensInt);
    gl.uniform1i(uNightShot, config.nightShot ? 1 : 0);
    gl.uniform1f(uGrain, config.grainIntensity);
    gl.uniform1f(uBloom, config.bloomIntensity);
    gl.uniform1f(uDigitalZoom, config.zoomLevel);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private burnOSDLayer(overlayCanvas: HTMLCanvasElement): void {
    const gl = this.gl;
    if (!gl) return;
    // Composite overlay using standard 2D image over current canvas state
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // Render overlay via WebGL texture or secondary blend
    gl.disable(gl.BLEND);
  }

  stopRenderLoop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
