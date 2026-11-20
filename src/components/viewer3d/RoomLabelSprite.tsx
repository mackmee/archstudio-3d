'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { usePreferencesStore } from '@/store/usePreferencesStore';

interface RoomLabelSpriteProps {
  name: string;
  position: [number, number, number];
}

/**
 * Pure-WebGL Room Label Sprite.
 * Eliminates React 19 / @react-three/drei `<Html>` DOM portal unmount crash:
 * - Renders high-DPI rounded glass pill badge directly onto an offscreen canvas
 * - Displays as Three.js billboard <sprite> with depthTest={false} and renderOrder={999}
 * - Disposes CanvasTexture cleanly on unmount with zero memory leaks
 */
export const RoomLabelSprite: React.FC<RoomLabelSpriteProps> = ({ name, position }) => {
  const { theme } = usePreferencesStore();
  const isLight = theme === 'light';

  // Generate crisp high-DPI canvas texture for the room label
  const { texture, aspect } = useMemo(() => {
    if (typeof document === 'undefined') {
      return { texture: null, aspect: 2 };
    }

    const dpr = 2; // High-DPI scale for razor-sharp text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { texture: null, aspect: 2 };

    const fontSize = 26;
    const font = `bold ${fontSize}px 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.font = font;

    const metrics = ctx.measureText(name);
    const textWidth = Math.ceil(metrics.width);
    const paddingX = 26;
    const pillHeight = 54;
    const pillWidth = Math.max(130, textWidth + paddingX * 2 + 20);

    canvas.width = Math.round(pillWidth * dpr);
    canvas.height = Math.round(pillHeight * dpr);

    ctx.scale(dpr, dpr);

    // Pill geometry
    const radius = 15;
    const x = 2;
    const y = 2;
    const w = pillWidth - 4;
    const h = pillHeight - 4;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);

    // Glass pill background
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)';
    ctx.fill();

    // Subtle border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.95)' : 'rgba(51, 65, 85, 0.85)';
    ctx.stroke();

    // Soft cyan dot indicator
    const dotX = x + 18;
    const dotY = y + h / 2;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();

    // Soft cyan glow ring around dot
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.fill();

    // Text rendering (Uzbek Latin and Russian Cyrillic support)
    ctx.font = font;
    ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, dotX + 14, dotY);

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
    canvasTexture.generateMipmaps = false;
    canvasTexture.needsUpdate = true;

    return {
      texture: canvasTexture,
      aspect: canvas.width / canvas.height,
    };
  }, [name, isLight]);

  // Clean GPU memory disposal on unmount or texture change
  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

  if (!texture) return null;

  // Visual size in Three.js world space (meters)
  const spriteHeight = 0.52;
  const spriteWidth = spriteHeight * aspect;

  return (
    <sprite position={position} scale={[spriteWidth, spriteHeight, 1]} renderOrder={999}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        sizeAttenuation
      />
    </sprite>
  );
};
