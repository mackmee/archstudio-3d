/**
 * Client-side Blueprint Image Compressor using HTML5 Canvas.
 * Downscales multi-megapixel photos (e.g. 12-48MP smartphone blueprint captures)
 * to max 1600px dimension with 88% JPEG quality.
 * Reduces payload from 10-15MB down to ~350-450KB for rapid, high-fidelity AI scanning.
 */

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export function compressBlueprintImage(
  input: File | Blob | string,
  maxDimension = 1600,
  quality = 0.88
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve({
            dataUrl: src,
            width: 1000,
            height: 800,
            sizeBytes: Math.round(src.length * 0.75),
          });
          return;
        }

        // Calculate proportional scale down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: src,
            width,
            height,
            sizeBytes: Math.round(src.length * 0.75),
          });
          return;
        }

        // Fill crisp white background in case of transparent PNG/WebP blueprints
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw downscaled image with smooth interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Len = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const sizeBytes = Math.round(base64Len * 0.75);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
        });
      };

      img.onerror = (err) => {
        console.warn('Image load error during compression, using raw source:', err);
        resolve({
          dataUrl: src,
          width: 1000,
          height: 800,
          sizeBytes: Math.round(src.length * 0.75),
        });
      };

      img.src = src;
    };

    if (typeof input === 'string') {
      processImage(input);
    } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          processImage(result);
        } else {
          reject(new Error('Failed to read file as Data URL'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(input);
    } else {
      reject(new Error('Invalid image input provided'));
    }
  });
}
