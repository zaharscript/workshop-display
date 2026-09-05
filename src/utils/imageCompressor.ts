/**
 * Image compression utility to resize and compress photos using HTML Canvas
 * Optimizes storage fees and database bandwidth.
 *
 * Implements HTML Canvas JPEG compression with maxWidth (default 1200px) and quality (default 0.7)
 * with Firebase Cloud Storage upload capabilities.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import type { ChangeEvent } from 'react';

// Firebase Cloud Storage configuration
export const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || '',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || '',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || '',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || '',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '',
};

let appInstance: FirebaseApp | null = null;
let storageInstance: FirebaseStorage | null = null;

/**
 * Lazy-initializes Firebase Storage safely so app does not crash if config is omitted.
 */
export function getFirebaseStorage(customConfig?: Record<string, string>): FirebaseStorage | null {
  if (storageInstance) return storageInstance;

  const config = customConfig || firebaseConfig;
  const hasConfig = Boolean(config.storageBucket || config.projectId);

  if (hasConfig) {
    try {
      appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
      storageInstance = getStorage(appInstance);
      return storageInstance;
    } catch (err) {
      console.warn('Firebase initialization notice:', err);
      return null;
    }
  }

  return null;
}

export interface CompressionResult {
  dataUrl: string;
  blob?: Blob;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercent: number;
  format: 'webp' | 'jpeg';
  width: number;
  height: number;
}

/**
 * Helper to convert Blob to base64 DataURL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Resizes and compresses an image file using HTML Canvas
 * @param file - The original uploaded file or blob
 * @param maxWidth - Max pixel width (default 1200px)
 * @param quality - Compression quality between 0.0 and 1.0 (default 0.7)
 * @returns Compressed Image Blob ready for upload
 */
export function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  quality = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Draw image onto Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas to Blob conversion failed: 2D context unavailable'));
          return;
        }

        // Fill subtle dark background for transparent image compatibility
        ctx.fillStyle = '#10141d';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export compressed Blob as JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed'));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

export interface UploadResult {
  downloadURL: string;
  originalSizeMB: number;
  compressedSizeMB: number;
  compressedBlob: Blob;
  savingsPercent: number;
}

/**
 * Handles file input event or direct file, compresses with compressImage (max 1200px, 0.7 quality),
 * and uploads to Firebase Cloud Storage. Falls back to DataURL if cloud storage is unconfigured.
 *
 * @param fileOrEvent - HTML File input event or File object
 * @param folder - Cloud storage destination directory (default 'vehicle_photos')
 * @param maxWidth - Max pixel width (default 1200px)
 * @param quality - Compression quality (default 0.7)
 */
export async function handleFileUpload(
  fileOrEvent: File | ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } },
  folder = 'vehicle_photos',
  maxWidth = 1200,
  quality = 0.7
): Promise<UploadResult | null> {
  const file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
  if (!file) return null;

  try {
    const originalSizeMB = Number((file.size / (1024 * 1024)).toFixed(2));
    console.log(`Original size: ${originalSizeMB} MB`);

    // 1. Compress file (max 1200px wide, 70% JPEG quality)
    const compressedBlob = await compressImage(file, maxWidth, quality);
    const compressedSizeMB = Number((compressedBlob.size / (1024 * 1024)).toFixed(2));
    console.log(`Compressed size: ${compressedSizeMB} MB`);

    const originalKB = Math.round(file.size / 1024);
    const compressedKB = Math.round(compressedBlob.size / 1024);
    const savingsPercent = originalKB > 0
      ? Math.max(0, Math.round(((originalKB - compressedKB) / originalKB) * 100))
      : 0;

    let downloadURL = '';
    const storage = getFirebaseStorage();

    if (storage) {
      // 2. Create Storage Reference
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `${folder}/${Date.now()}_${cleanFileName}`);

      // 3. Upload Compressed Blob to Firebase Cloud Storage
      const snapshot = await uploadBytes(storageRef, compressedBlob, {
        contentType: 'image/jpeg',
      });

      // 4. Get Public Download URL
      downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Uploaded successfully! File URL:', downloadURL);
    } else {
      // Local fallback: convert compressed JPEG Blob to DataURL
      downloadURL = await blobToDataUrl(compressedBlob);
      console.log('Processed compressed image locally (~' + compressedKB + ' KB, saved ' + savingsPercent + '%)');
    }

    return {
      downloadURL,
      originalSizeMB,
      compressedSizeMB,
      compressedBlob,
      savingsPercent,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

/**
 * Backward-compatible helper that supports string DataURL or File source,
 * using the optimized 1200px width and 0.7 quality.
 */
export async function compressImageSource(
  source: File | string,
  maxWidth = 1200,
  maxHeight = 900,
  quality = 0.70
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    let originalSizeKB = 0;
    if (source instanceof File) {
      originalSizeKB = Math.round(source.size / 1024);
    }

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down proportionally
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const bestRatio = Math.min(widthRatio, heightRatio);
        width = Math.round(width * bestRatio);
        height = Math.round(height * bestRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d context for canvas compression'));
        return;
      }

      ctx.fillStyle = '#10141d';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const compressedDataUrl = reader.result as string;
            const compressedSizeKB = Math.round(blob.size / 1024);

            if (originalSizeKB === 0) {
              originalSizeKB = Math.round((typeof source === 'string' ? source.length * (3 / 4) : 0) / 1024);
              if (originalSizeKB < compressedSizeKB) originalSizeKB = compressedSizeKB * 2;
            }

            const savingsPercent = originalSizeKB > 0
              ? Math.max(0, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100))
              : 0;

            resolve({
              dataUrl: compressedDataUrl,
              blob,
              originalSizeKB,
              compressedSizeKB,
              savingsPercent,
              format: 'jpeg',
              width,
              height,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (err) => {
      reject(err);
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}
