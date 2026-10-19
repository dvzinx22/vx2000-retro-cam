export class MediaStreamService {
  private currentStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private facingMode: 'user' | 'environment' = 'environment';
  private torchActive = false;

  async startStream(facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
    this.stopStream();
    this.facingMode = facingMode;

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
        aspectRatio: { ideal: 4 / 3 },
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.videoTrack = stream.getVideoTracks()[0] || null;
      return stream;
    } catch (err) {
      console.warn('Initial camera constraints failed, attempting fallback...', err);
      // Fallback with minimal constraints
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      this.currentStream = fallbackStream;
      this.videoTrack = fallbackStream.getVideoTracks()[0] || null;
      return fallbackStream;
    }
  }

  async toggleFacingMode(): Promise<MediaStream> {
    const nextMode = this.facingMode === 'environment' ? 'user' : 'environment';
    return this.startStream(nextMode);
  }

  getFacingMode(): 'user' | 'environment' {
    return this.facingMode;
  }

  async setTorch(enabled: boolean): Promise<boolean> {
    if (!this.videoTrack) return false;

    try {
      const capabilities = this.videoTrack.getCapabilities?.() as { torch?: boolean };
      if (capabilities && capabilities.torch) {
        await this.videoTrack.applyConstraints({
          advanced: [{ torch: enabled } as MediaTrackConstraintSet],
        });
        this.torchActive = enabled;
        return true;
      }
    } catch (err) {
      console.warn('Torch constraint not supported or failed:', err);
    }
    return false;
  }

  isTorchActive(): boolean {
    return this.torchActive;
  }

  async setHardwareZoom(zoomLevel: number): Promise<void> {
    if (!this.videoTrack) return;
    try {
      const capabilities = this.videoTrack.getCapabilities?.() as { zoom?: { min: number; max: number } };
      if (capabilities && capabilities.zoom) {
        const min = capabilities.zoom.min || 1;
        const max = capabilities.zoom.max || 4;
        const targetZoom = Math.min(max, Math.max(min, zoomLevel));
        await this.videoTrack.applyConstraints({
          advanced: [{ zoom: targetZoom } as MediaTrackConstraintSet],
        });
      }
    } catch (err) {
      console.warn('Hardware zoom not supported or failed:', err);
    }
  }

  stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
      this.currentStream = null;
      this.videoTrack = null;
      this.torchActive = false;
    }
  }

  getStream(): MediaStream | null {
    return this.currentStream;
  }
}

export const mediaStreamService = new MediaStreamService();
