import * as THREE from 'three';
import { MaterialItem, getMaterialById } from '@/data/materials';

// Cache for base textures keyed by materialId
const baseTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generate a procedural seamless texture canvas for a MaterialItem
 */
export function generateProceduralCanvas(material: MaterialItem): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const baseCol = material.color;
  const secCol = material.secondaryColor || '#334155';

  // Base fill
  ctx.fillStyle = baseCol;
  ctx.fillRect(0, 0, size, size);

  switch (material.pattern) {
    case 'stripes': {
      const stripeCount = 16;
      const stripeW = size / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        if (i % 2 === 1) {
          ctx.fillStyle = secCol;
          ctx.fillRect(i * stripeW, 0, stripeW, size);
        } else {
          // Fine pinstripe down the center
          ctx.fillStyle = secCol + '44';
          ctx.fillRect(i * stripeW + stripeW / 2 - 1, 0, 2, size);
        }
      }
      break;
    }

    case 'wood_planks': {
      const plankCount = 8;
      const plankH = size / plankCount;
      for (let i = 0; i < plankCount; i++) {
        const y = i * plankH;
        // Subtle plank tone variation
        const alpha = ((i % 3) * 0.05).toFixed(2);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, y, size, plankH);

        // Woodgrain lines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 6; g++) {
          ctx.beginPath();
          const gy = y + 8 + g * (plankH / 7);
          ctx.moveTo(0, gy);
          ctx.bezierCurveTo(size * 0.3, gy + 3, size * 0.7, gy - 3, size, gy);
          ctx.stroke();
        }

        // Dark bevel seam between planks
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, y + plankH - 2, size, 2);
        // Highlight bevel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(0, y, size, 1);
      }
      break;
    }

    case 'herringbone': {
      const blockW = 64;
      const blockH = 32;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;

      for (let y = 0; y < size + blockH; y += blockH) {
        for (let x = 0; x < size + blockW; x += blockW) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 4);

          // Tile body
          ctx.fillStyle = (x / blockW + y / blockH) % 2 === 0 ? baseCol : secCol;
          ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
          ctx.strokeRect(-blockW / 2, -blockH / 2, blockW, blockH);

          ctx.restore();
        }
      }
      break;
    }

    case 'brick': {
      const rowCount = 16;
      const rowH = size / rowCount;
      const colW = size / 4;

      // Mortar background
      ctx.fillStyle = secCol;
      ctx.fillRect(0, 0, size, size);

      for (let r = 0; r < rowCount; r++) {
        const y = r * rowH;
        const offsetX = (r % 2) * (colW / 2);
        for (let x = -colW; x < size + colW; x += colW) {
          // Brick body with 3px mortar margin
          ctx.fillStyle = baseCol;
          ctx.fillRect(x + offsetX + 2, y + 2, colW - 4, rowH - 4);

          // Subtle noise inside brick
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.fillRect(x + offsetX + 2, y + rowH / 2, colW - 4, rowH / 2 - 4);
        }
      }
      break;
    }

    case 'marble_tile': {
      // Soft marble veins using quadratic curves
      ctx.strokeStyle = secCol + '88';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const startX = (i * 90) % size;
        ctx.moveTo(startX, 0);
        ctx.bezierCurveTo(
          startX + 80,
          size * 0.4,
          startX - 60,
          size * 0.7,
          (startX + 120) % size,
          size
        );
        ctx.stroke();

        // Branching vein
        ctx.beginPath();
        ctx.strokeStyle = secCol + '44';
        ctx.lineWidth = 1;
        ctx.moveTo(startX + 40, size * 0.4);
        ctx.lineTo(startX + 120, size * 0.6);
        ctx.stroke();
      }

      // Outer tile perimeter grout border
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, size - 4, size - 4);
      break;
    }

    case 'ceramic_tile': {
      const tileCount = 4;
      const tileW = size / tileCount;
      // Grout
      ctx.fillStyle = secCol;
      ctx.fillRect(0, 0, size, size);

      for (let r = 0; r < tileCount; r++) {
        for (let c = 0; c < tileCount; c++) {
          const x = c * tileW;
          const y = r * tileW;
          const pad = 4;
          ctx.fillStyle = baseCol;
          ctx.fillRect(x + pad, y + pad, tileW - pad * 2, tileW - pad * 2);

          // Highlight top-left
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(x + pad, y + pad, tileW - pad * 2, 2);
          ctx.fillRect(x + pad, y + pad, 2, tileW - pad * 2);
        }
      }
      break;
    }

    case 'acoustic_slats': {
      const slatCount = 12;
      const slatW = size / slatCount;
      // Dark felt backing
      ctx.fillStyle = secCol;
      ctx.fillRect(0, 0, size, size);

      // Wood slats
      for (let i = 0; i < slatCount; i++) {
        const x = i * slatW;
        const pad = 6;
        ctx.fillStyle = baseCol;
        ctx.fillRect(x + pad, 0, slatW - pad * 2, size);

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x + pad, 0, 2, size);
      }
      break;
    }

    case 'damask': {
      // Botanical floral diamond motif
      ctx.fillStyle = secCol + '55';
      const step = 64;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          ctx.beginPath();
          ctx.arc(x + step / 2, y + step / 2, 14, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x + step / 2, y + step / 2, 8, 0, Math.PI * 2);
          ctx.fillStyle = baseCol;
          ctx.fill();
          ctx.fillStyle = secCol + '55';
        }
      }
      break;
    }

    case 'plaster':
    default: {
      // Fine organic noise
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 16;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imgData, 0, 0);
      break;
    }
  }

  return canvas;
}

/**
 * Get or create cached CanvasTexture for a material
 */
export function getBaseTexture(materialId: string): THREE.CanvasTexture {
  if (baseTextureCache.has(materialId)) {
    return baseTextureCache.get(materialId)!;
  }

  const mat = getMaterialById(materialId);
  const canvas = generateProceduralCanvas(mat);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  baseTextureCache.set(materialId, texture);
  return texture;
}

/**
 * Return an instantiated texture with world-space tiling (repeating)
 * so textures NEVER stretch regardless of geometry size!
 */
export function getScaledTexture(
  materialId: string,
  widthMeters: number,
  heightMeters: number
): THREE.CanvasTexture {
  const base = getBaseTexture(materialId);
  const mat = getMaterialById(materialId);
  const tileSize = Math.max(0.2, mat.tileSizeMeters || 1.0);

  const cloned = base.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.wrapT = THREE.RepeatWrapping;
  cloned.repeat.set(
    Math.max(0.1, widthMeters / tileSize),
    Math.max(0.1, heightMeters / tileSize)
  );
  cloned.needsUpdate = true;
  return cloned;
}
