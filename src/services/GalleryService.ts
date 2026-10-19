import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';
import { RecordedMedia } from '../types/camera';

export interface SaveResult {
  success: boolean;
  message: string;
  filePath?: string;
}

export class GalleryService {
  private albumIdentifier: string | null = null;
  private readonly ALBUM_NAME = 'VX2000';

  /**
   * Converts a Blob to a base64 Data URL and pure base64 string.
   */
  async blobToBase64(blob: Blob): Promise<{ dataUrl: string; base64: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ dataUrl, base64 });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Ensures the 'VX2000' album exists and retrieves its identifier.
   */
  private async getOrCreateAlbum(): Promise<string> {
    if (this.albumIdentifier) {
      return this.albumIdentifier;
    }

    try {
      // 1. Check existing albums
      const res = await Media.getAlbums();
      const existing = res.albums?.find(
        (a) => a.name.toLowerCase() === this.ALBUM_NAME.toLowerCase()
      );
      if (existing?.identifier) {
        this.albumIdentifier = existing.identifier;
        return existing.identifier;
      }

      // 2. Try creating the album
      try {
        await Media.createAlbum({ name: this.ALBUM_NAME });
      } catch (createErr) {
        console.warn('createAlbum warning:', createErr);
      }

      // 3. Re-check albums
      const updated = await Media.getAlbums();
      const created = updated.albums?.find(
        (a) => a.name.toLowerCase() === this.ALBUM_NAME.toLowerCase()
      );
      if (created?.identifier) {
        this.albumIdentifier = created.identifier;
        return created.identifier;
      }

      // 4. Fallback: get albums path directly
      try {
        const pathRes = await Media.getAlbumsPath();
        if (pathRes?.path) {
          this.albumIdentifier = `${pathRes.path}/${this.ALBUM_NAME}`;
          return this.albumIdentifier;
        }
      } catch (pathErr) {
        console.warn('getAlbumsPath error:', pathErr);
      }

      if (updated.albums && updated.albums.length > 0) {
        return updated.albums[0].identifier;
      }
    } catch (err) {
      console.warn('Error resolving album identifier:', err);
    }

    return '';
  }

  /**
   * Saves a recorded photo or video to the Android gallery / DCIM / MediaStore.
   */
  async saveMedia(media: RecordedMedia): Promise<SaveResult> {
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      // Web browser download fallback
      return this.downloadInBrowser(media);
    }

    try {
      const ext = media.type === 'photo'
        ? 'jpg'
        : media.blob.type.includes('mp4')
        ? 'mp4'
        : 'webm';

      const fileName = `VX2000_${media.id}`;
      const { dataUrl, base64 } = await this.blobToBase64(media.blob);
      const albumId = await this.getOrCreateAlbum();

      let gallerySaved = false;
      let finalFilePath = '';

      // Tier 1: Save directly to Android MediaStore/Gallery via Media plugin
      if (media.type === 'photo') {
        try {
          const photoRes = await Media.savePhoto({
            path: dataUrl,
            albumIdentifier: albumId || undefined,
            fileName,
          });
          gallerySaved = true;
          finalFilePath = photoRes.filePath || '';
        } catch (photoErr) {
          console.warn('Media.savePhoto direct error:', photoErr);
        }
      } else {
        // Video handling: Write to cache first to get a real file path with proper video extension
        const tempCachePath = `temp_${media.id}.${ext}`;
        try {
          const cacheFile = await Filesystem.writeFile({
            path: tempCachePath,
            data: base64,
            directory: Directory.Cache,
          });

          const videoRes = await Media.saveVideo({
            path: cacheFile.uri,
            albumIdentifier: albumId || undefined,
            fileName,
          });
          gallerySaved = true;
          finalFilePath = videoRes.filePath || '';

          // Clean up temporary cache file
          Filesystem.deleteFile({
            path: tempCachePath,
            directory: Directory.Cache,
          }).catch(() => {});
        } catch (videoErr) {
          console.warn('Media.saveVideo error:', videoErr);
        }
      }

      // Tier 2: Also write a persistent backup in Documents/VX2000
      try {
        await Filesystem.writeFile({
          path: `VX2000/${fileName}.${ext}`,
          data: base64,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (backupErr) {
        console.warn('Filesystem backup save notice:', backupErr);
      }

      if (gallerySaved) {
        return {
          success: true,
          message: media.type === 'photo' ? 'Foto guardada en tu Galería' : 'Video guardado en tu Galería',
          filePath: finalFilePath,
        };
      } else {
        return {
          success: true,
          message: 'Guardado en Mis Archivos > Documentos > VX2000',
        };
      }
    } catch (err: unknown) {
      console.error('saveMedia failed:', err);
      // As ultimate fallback, try web download
      this.downloadInBrowser(media);
      return {
        success: false,
        message: 'No se pudo guardar automáticamente. Se intentó descarga directa.',
      };
    }
  }

  private downloadInBrowser(media: RecordedMedia): SaveResult {
    try {
      const ext = media.type === 'photo' ? 'jpg' : 'webm';
      const a = document.createElement('a');
      a.href = media.url;
      a.download = `vx2000_${media.type}_${media.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return {
        success: true,
        message: 'Archivo descargado con éxito',
      };
    } catch (e) {
      return {
        success: false,
        message: 'Error al descargar archivo',
      };
    }
  }
}

export const galleryService = new GalleryService();
