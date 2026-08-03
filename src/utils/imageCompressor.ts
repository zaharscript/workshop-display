/**
 * Image compression utility to convert camera & uploaded photos to WebP/JPEG format
 * and reduce resolution to cut database bandwidth and storage cost.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercent: number;
  format: 'webp' | 'jpeg';
  width: number;
  height: number;
}

export async function compressImageSource(
  source: File | string,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.70
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Calculate initial rough size in KB
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

      // Fill white background in case of transparent PNGs converting to JPEG/WebP
      ctx.fillStyle = '#10141d';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first for optimal compression
      let format: 'webp' | 'jpeg' = 'webp';
      let compressedDataUrl = canvas.toDataURL('image/webp', quality);

      // Fallback to JPEG if browser doesn't produce webp data URL
      if (!compressedDataUrl.startsWith('data:image/webp')) {
        format = 'jpeg';
        compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      const compressedSizeKB = Math.round((compressedDataUrl.length * (3 / 4)) / 1024);
      if (originalSizeKB === 0) {
        originalSizeKB = Math.round((typeof source === 'string' ? source.length * (3 / 4) : 0) / 1024);
        if (originalSizeKB < compressedSizeKB) originalSizeKB = compressedSizeKB * 2;
      }

      const savingsPercent = originalSizeKB > 0
        ? Math.max(0, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100))
        : 0;

      resolve({
        dataUrl: compressedDataUrl,
        originalSizeKB,
        compressedSizeKB,
        savingsPercent,
        format,
        width,
        height,
      });
    };

    img.onerror = (err) => {
      reject(err);
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}
