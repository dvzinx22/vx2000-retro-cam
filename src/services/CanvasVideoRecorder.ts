import { CameraConfig, RecordedMedia } from '../types/camera';
import { retroAudioProcessor } from './RetroAudioProcessor';

export class CanvasVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private recordingStartTime = 0;

  async startRecording(
    canvas: HTMLCanvasElement,
    config: CameraConfig
  ): Promise<void> {
    if (this.isRecording) return;
    this.recordedChunks = [];

    // Capture processed video stream at user-configured FPS (15, 24, 30, 60)
    const targetFps = config.recordingFps || 30;
    const canvasStream = canvas.captureStream(targetFps);

    // Merge in the processed 2000s band-passed & saturated microphone audio
    const processedAudioTrack = retroAudioProcessor.getProcessedAudioTrack();
    if (processedAudioTrack) {
      canvasStream.addTrack(processedAudioTrack);
    }

    // Determine supported vintage codec format
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 2500000, // 2.5 Mbps vintage MiniDV compressed bitrate
    });

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    recorder.start(100); // 100ms chunk slices
    this.mediaRecorder = recorder;
    this.isRecording = true;
    this.recordingStartTime = Date.now();
  }

  stopRecording(config: CameraConfig): Promise<RecordedMedia> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Recorder is not active'));
        return;
      }

      const durationSeconds = Math.max(1, Math.round((Date.now() - this.recordingStartTime) / 1000));
      const targetFps = config.recordingFps || 30;

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        const record: RecordedMedia = {
          id: `tape_${Date.now()}`,
          blob,
          url,
          type: 'video',
          durationSeconds,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          lensMode: config.lensMode,
          nightShot: config.nightShot,
          recordingFps: targetFps,
        };

        this.isRecording = false;
        this.mediaRecorder = null;
        resolve(record);
      };

      this.mediaRecorder.stop();
    });
  }

  takeSnapshot(canvas: HTMLCanvasElement, config: CameraConfig): Promise<RecordedMedia> {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const photo: RecordedMedia = {
            id: `snap_${Date.now()}`,
            blob,
            url,
            type: 'photo',
            durationSeconds: 0,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            lensMode: config.lensMode,
            nightShot: config.nightShot,
          };
          resolve(photo);
        },
        'image/jpeg',
        0.92
      );
    });
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const canvasVideoRecorder = new CanvasVideoRecorder();
