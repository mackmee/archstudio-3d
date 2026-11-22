'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import {
  distance,
  snapToAngle,
  screenToWorld,
  projectPointOntoSegment,
  findNearbyEndpoint,
  formatMeters,
} from '@/lib/geometry';
import { estimateRoomArea } from '@/lib/wallGeometry';
import { getFurnitureCatalogItem } from '@/data/furniture';
import { Point2D, ViewportTransform, Wall } from '@/types/floorplan';

const SNAP_RADIUS_PIXELS = 18;

export const FloorplanCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasCenteredRef = useRef(false);

  // Store state & actions
  const {
    pixelsPerMeter,
    walls,
    openings,
    rooms,
    furniture,
    backgroundImage,
    view2DMode,
    activeTool,
    selectedId,
    isOrthoSnapEnabled,
    showGrid,
    calibrationState,
    setActiveTool,
    setSelectedId,
    addWall,
    updateWall,
    addOpening,
    updateOpening,
    addRoom,
    updateRoom,
    deleteSelected,
    setCalibrationPointA,
    setCalibrationPointB,
  } = useFloorplanStore();

  const { theme, language } = usePreferencesStore();
  const isLight = theme === 'light';

  // Viewport navigation state (Pan & Zoom)
  const [viewport, setViewport] = useState<ViewportTransform>({
    x: 350,
    y: 280,
    zoom: 1.0,
  });

  // Local interaction states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Wall drawing segment chaining state
  const [drawingWallStart, setDrawingWallStart] = useState<Point2D | null>(null);
  const [snappedMouseWorld, setSnappedMouseWorld] = useState<Point2D>({ x: 0, y: 0 });
  const [snappedEndpoint, setSnappedEndpoint] = useState<{
    point: Point2D;
    wallId: string;
    isStart: boolean;
  } | null>(null);

  // Dragging existing elements
  const [dragState, setDragState] = useState<{
    type: 'wall-start' | 'wall-end' | 'wall-body' | 'opening' | 'room' | null;
    id: string | null;
    startPoint: Point2D;
    initialWall?: Wall;
    initialOpeningRatio?: number;
    initialRoomPos?: Point2D;
  }>({ type: null, id: null, startPoint: { x: 0, y: 0 } });

  // Hover state for openings placement
  const [hoveredWallForOpening, setHoveredWallForOpening] = useState<{
    wall: Wall;
    ratio: number;
    snappedPoint: Point2D;
  } | null>(null);

  // Cached background image element
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Load background image when URL changes
  useEffect(() => {
    if (!backgroundImage?.url) {
      bgImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backgroundImage.url;
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, [backgroundImage?.url]);

  // Center camera once when walls are present
  useEffect(() => {
    if (walls.length > 0 && containerRef.current && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      walls.forEach((w) => {
        minX = Math.min(minX, w.start.x, w.end.x);
        maxX = Math.max(maxX, w.start.x, w.end.x);
        minY = Math.min(minY, w.start.y, w.end.y);
        maxY = Math.max(maxY, w.start.y, w.end.y);
      });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setViewport({
        x: rect.width / 2 - centerX * pixelsPerMeter,
        y: rect.height / 2 - centerY * pixelsPerMeter,
        zoom: 1.0,
      });
    }
  }, [walls, pixelsPerMeter]);

  // Handle keyboard shortcuts (Escape, Delete, Space, Ortho)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      } else if (e.key === 'Escape') {
        if (drawingWallStart) {
          setDrawingWallStart(null);
        } else if (calibrationState.isCalibrating) {
          useFloorplanStore.getState().cancelCalibration();
        } else {
          setSelectedId(null);
          setActiveTool('select');
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'w' || e.key === 'W') {
        setActiveTool('wall');
      } else if (e.key === 'd' || e.key === 'D') {
        setActiveTool('door');
      } else if (e.key === 'g' || e.key === 'G') {
        useFloorplanStore.getState().toggleShowGrid();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [drawingWallStart, calibrationState.isCalibrating, deleteSelected, setActiveTool, setSelectedId]);

  // Main Render Loop (HTML5 Canvas 2D) with Pixel-Exact DevicePixelRatio Scaling
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    // Canvas dimensions in CSS pixels
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    const bgColor = isLight ? '#f8fafc' : '#080c15';
    const minorGridColor = isLight ? '#e2e8f0' : '#151e2e';
    const majorGridColor = isLight ? '#cbd5e1' : '#223049';
    const axisXColor = isLight ? '#ef444466' : '#ef444444';
    const axisYColor = isLight ? '#16a34a66' : '#22c55e44';
    const badgeBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)';
    const badgeBorder = isLight ? '#cbd5e1' : '#475569';
    const badgeText = isLight ? '#0f172a' : '#f1f5f9';
    const roomBadgeBg = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.90)';
    const roomBadgeBorder = isLight ? '#cbd5e1' : '#475569';
    const roomBadgeText = isLight ? '#0f172a' : '#ffffff';

    // Apply DPR scale to ensure 100% pixel-exact alignment with clientX/clientY
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Architectural background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Apply viewport transform (Pan & Zoom) in CSS pixel space
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // World visible bounds for culling
    const topLeftWorld = screenToWorld(0, 0, viewport, pixelsPerMeter);
    const bottomRightWorld = screenToWorld(width, height, viewport, pixelsPerMeter);

    // 1. Draw Architectural Grid
    if (showGrid) {
      const minorStep = 0.5; // 0.5m minor grid
      const majorStep = 1.0; // 1.0m major grid
      const minX = Math.floor(topLeftWorld.x / minorStep) * minorStep;
      const maxX = Math.ceil(bottomRightWorld.x / minorStep) * minorStep;
      const minY = Math.floor(topLeftWorld.y / minorStep) * minorStep;
      const maxY = Math.ceil(bottomRightWorld.y / minorStep) * minorStep;

      // Minor grid lines
      ctx.beginPath();
      ctx.strokeStyle = minorGridColor;
      ctx.lineWidth = 1 / (viewport.zoom * pixelsPerMeter);
      for (let x = minX; x <= maxX; x += minorStep) {
        if (Math.abs(Math.round(x) - x) > 0.01) {
          ctx.moveTo(x * pixelsPerMeter, minY * pixelsPerMeter);
          ctx.lineTo(x * pixelsPerMeter, maxY * pixelsPerMeter);
        }
      }
      for (let y = minY; y <= maxY; y += minorStep) {
        if (Math.abs(Math.round(y) - y) > 0.01) {
          ctx.moveTo(minX * pixelsPerMeter, y * pixelsPerMeter);
          ctx.lineTo(maxX * pixelsPerMeter, y * pixelsPerMeter);
        }
      }
      ctx.stroke();

      // Major grid lines
      ctx.beginPath();
      ctx.strokeStyle = majorGridColor;
      ctx.lineWidth = 1.2 / (viewport.zoom * pixelsPerMeter);
      const minMajorX = Math.floor(topLeftWorld.x / majorStep) * majorStep;
      const maxMajorX = Math.ceil(bottomRightWorld.x / majorStep) * majorStep;
      const minMajorY = Math.floor(topLeftWorld.y / majorStep) * majorStep;
      const maxMajorY = Math.ceil(bottomRightWorld.y / majorStep) * majorStep;
      for (let x = minMajorX; x <= maxMajorX; x += majorStep) {
        ctx.moveTo(x * pixelsPerMeter, minY * pixelsPerMeter);
        ctx.lineTo(x * pixelsPerMeter, maxY * pixelsPerMeter);
      }
      for (let y = minMajorY; y <= maxMajorY; y += majorStep) {
        ctx.moveTo(minX * pixelsPerMeter, y * pixelsPerMeter);
        ctx.lineTo(maxX * pixelsPerMeter, y * pixelsPerMeter);
      }
      ctx.stroke();

      // World Origin Axes (X in red-slate, Y in green-slate)
      ctx.beginPath();
      ctx.strokeStyle = axisXColor;
      ctx.lineWidth = 2 / (viewport.zoom * pixelsPerMeter);
      ctx.moveTo(minX * pixelsPerMeter, 0);
      ctx.lineTo(maxX * pixelsPerMeter, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = axisYColor;
      ctx.moveTo(0, minY * pixelsPerMeter);
      ctx.lineTo(0, maxY * pixelsPerMeter);
      ctx.stroke();
    }

    // 2. Draw Blueprint Background Image (Only in 'overlay' mode, anchored 1:1 at 0,0)
    if (
      view2DMode === 'overlay' &&
      backgroundImage &&
      backgroundImage.visible &&
      bgImageRef.current
    ) {
      const img = bgImageRef.current;
      ctx.save();
      ctx.globalAlpha = backgroundImage.opacity ?? 0.5;

      const imgW =
        (backgroundImage.widthMeters ? backgroundImage.widthMeters * pixelsPerMeter : backgroundImage.width) ||
        img.width;
      const imgH =
        (backgroundImage.heightMeters ? backgroundImage.heightMeters * pixelsPerMeter : backgroundImage.height) ||
        img.height;
      const imgX = (backgroundImage.x ?? 0) * pixelsPerMeter;
      const imgY = (backgroundImage.y ?? 0) * pixelsPerMeter;

      ctx.drawImage(img, imgX, imgY, imgW, imgH);
      ctx.restore();
    }

    // 3. Draw Walls with Solid Architectural Core & Outer Line
    walls.forEach((wall) => {
      const isSelected = selectedId === wall.id;
      const x1 = wall.start.x * pixelsPerMeter;
      const y1 = wall.start.y * pixelsPerMeter;
      const x2 = wall.end.x * pixelsPerMeter;
      const y2 = wall.end.y * pixelsPerMeter;
      const wallThicknessPx = wall.thickness * pixelsPerMeter;

      // Draw Wall Body (Thick line with round caps for clean corner joins)
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = wallThicknessPx;
      ctx.strokeStyle = isSelected ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#334155' : '#1e293b');
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Wall Outer Border Outline
      ctx.beginPath();
      ctx.lineWidth = wallThicknessPx + (isSelected ? 3 : 1.5);
      ctx.strokeStyle = isSelected ? '#38bdf8' : (isLight ? '#64748b' : '#475569');
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Centerline
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isSelected ? '#38bdf899' : (isLight ? '#94a3b844' : '#47556944');
      ctx.setLineDash([4, 4]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // If Selected: Draw endpoint resize handles
      if (isSelected) {
        const handleRadius = 6 / viewport.zoom;
        // Start handle
        ctx.beginPath();
        ctx.arc(x1, y1, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.stroke();

        // End handle
        ctx.beginPath();
        ctx.arc(x2, y2, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.stroke();
      }

      // Professional Architectural Dimension Line with 45° Tick Marks (Adaptive LOD)
      const wallLen = distance(wall.start, wall.end);
      const minLenForDim = isSelected
        ? 0.3
        : viewport.zoom < 0.6
        ? 3.0
        : viewport.zoom < 0.85
        ? 2.0
        : viewport.zoom < 1.15
        ? 1.2
        : 0.5;

      if (wallLen >= minLenForDim) {
        const wallAngle = Math.atan2(y2 - y1, x2 - x1);
        const normalX = -Math.sin(wallAngle);
        const normalY = Math.cos(wallAngle);
        const dimOffset = 0.38 * pixelsPerMeter; // Offset 38cm away from wall

        const dimX1 = x1 + normalX * dimOffset;
        const dimY1 = y1 + normalY * dimOffset;
        const dimX2 = x2 + normalX * dimOffset;
        const dimY2 = y2 + normalY * dimOffset;

        ctx.save();
        ctx.strokeStyle = isSelected ? '#0284c7' : (isLight ? '#64748b' : '#94a3b8');
        ctx.lineWidth = 1;

        // Witness extension lines
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(dimX1 + normalX * 3, dimY1 + normalY * 3);
        ctx.moveTo(x2, y2);
        ctx.lineTo(dimX2 + normalX * 3, dimY2 + normalY * 3);
        ctx.stroke();

        // Main dimension line
        ctx.beginPath();
        ctx.moveTo(dimX1, dimY1);
        ctx.lineTo(dimX2, dimY2);
        ctx.stroke();

        // 45° Architectural Slash Tick Marks at ends
        const tickSize = Math.max(4, 5 / viewport.zoom);
        const tickAngle = wallAngle + Math.PI / 4;
        const tDx = Math.cos(tickAngle) * tickSize;
        const tDy = Math.sin(tickAngle) * tickSize;

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dimX1 - tDx, dimY1 - tDy);
        ctx.lineTo(dimX1 + tDx, dimY1 + tDy);
        ctx.moveTo(dimX2 - tDx, dimY2 - tDy);
        ctx.lineTo(dimX2 + tDx, dimY2 + tDy);
        ctx.stroke();

        // Upright Dimension Text Badge
        const midX = (dimX1 + dimX2) / 2;
        const midY = (dimY1 + dimY2) / 2;
        let textAngle = wallAngle;
        if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
          textAngle += Math.PI;
        }

        ctx.translate(midX, midY);
        ctx.rotate(textAngle);

        const labelText = formatMeters(wallLen);
        const fontSize = Math.max(9, Math.min(12, 11 / viewport.zoom));
        ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        const textMetrics = ctx.measureText(labelText);
        const padX = 5;
        const padY = 2;
        const badgeW = textMetrics.width + padX * 2;
        const badgeH = fontSize + padY * 2;

        ctx.fillStyle = isSelected ? (isLight ? '#0284c7' : '#38bdf8') : badgeBg;
        ctx.strokeStyle = isSelected ? '#0284c7' : badgeBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#ffffff' : badgeText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 0, 0);

        ctx.restore();
      }
    });

    // 4. Draw Openings (Architectural Doors & Windows)
    openings.forEach((opening) => {
      const hostWall = walls.find((w) => w.id === opening.wallId);
      if (!hostWall) return;

      const isSelected = selectedId === opening.id;
      const wallLen = distance(hostWall.start, hostWall.end);
      if (wallLen < 0.001) return;

      const wallAngle = Math.atan2(
        hostWall.end.y - hostWall.start.y,
        hostWall.end.x - hostWall.start.x
      );

      const centerWorld: Point2D = {
        x: hostWall.start.x + (hostWall.end.x - hostWall.start.x) * opening.positionRatio,
        y: hostWall.start.y + (hostWall.end.y - hostWall.start.y) * opening.positionRatio,
      };

      const centerPx = {
        x: centerWorld.x * pixelsPerMeter,
        y: centerWorld.y * pixelsPerMeter,
      };

      const openingWidthPx = opening.width * pixelsPerMeter;
      const wallThicknessPx = hostWall.thickness * pixelsPerMeter;

      ctx.save();
      ctx.translate(centerPx.x, centerPx.y);
      ctx.rotate(wallAngle);

      // Cutout mask over the wall
      ctx.fillStyle = bgColor;
      ctx.fillRect(
        -openingWidthPx / 2,
        -wallThicknessPx / 2 - 2,
        openingWidthPx,
        wallThicknessPx + 4
      );

      // Frame jamb ends
      ctx.strokeStyle = isSelected ? '#38bdf8' : (isLight ? '#475569' : '#94a3b8');
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Left jamb
      ctx.moveTo(-openingWidthPx / 2, -wallThicknessPx / 2);
      ctx.lineTo(-openingWidthPx / 2, wallThicknessPx / 2);
      // Right jamb
      ctx.moveTo(openingWidthPx / 2, -wallThicknessPx / 2);
      ctx.lineTo(openingWidthPx / 2, wallThicknessPx / 2);
      ctx.stroke();

      if (opening.type === 'door') {
        // Architectural Door Symbol (90° leaf + swing arc)
        const flipMultiplier = opening.flip ? -1 : 1;
        const hingeX = -openingWidthPx / 2;
        const hingeY = (wallThicknessPx / 2) * flipMultiplier;

        ctx.strokeStyle = isSelected ? '#0284c7' : '#f59e0b';
        ctx.lineWidth = 2;

        // Door leaf line
        ctx.beginPath();
        ctx.moveTo(hingeX, hingeY);
        ctx.lineTo(hingeX, hingeY + openingWidthPx * flipMultiplier);
        ctx.stroke();

        // 90-degree swing arc
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#38bdf8' : (isLight ? '#d97706bb' : '#fbbf2499');
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.arc(
          hingeX,
          hingeY,
          openingWidthPx,
          0,
          flipMultiplier > 0 ? Math.PI / 2 : -Math.PI / 2,
          flipMultiplier < 0
        );
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Architectural Window Symbol (Double parallel glass lines + sill)
        ctx.strokeStyle = isSelected ? '#0284c7' : '#0284c7';
        ctx.lineWidth = 1.5;

        // Outer line
        ctx.beginPath();
        ctx.moveTo(-openingWidthPx / 2 - 2, -wallThicknessPx / 2);
        ctx.lineTo(openingWidthPx / 2 + 2, -wallThicknessPx / 2);
        ctx.stroke();

        // Center glass lines
        ctx.beginPath();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = isSelected ? '#38bdf8' : (isLight ? '#0284c7' : '#38bdf8');
        ctx.moveTo(-openingWidthPx / 2, -wallThicknessPx / 6);
        ctx.lineTo(openingWidthPx / 2, -wallThicknessPx / 6);
        ctx.moveTo(-openingWidthPx / 2, wallThicknessPx / 6);
        ctx.lineTo(openingWidthPx / 2, wallThicknessPx / 6);
        ctx.stroke();

        // Inner line
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#0284c7' : '#0284c7';
        ctx.moveTo(-openingWidthPx / 2 - 2, wallThicknessPx / 2);
        ctx.lineTo(openingWidthPx / 2 + 2, wallThicknessPx / 2);
        ctx.stroke();
      }

      // Selection Halo
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          -openingWidthPx / 2 - 4,
          -wallThicknessPx / 2 - 4,
          openingWidthPx + 8,
          wallThicknessPx + 8
        );
      }

      ctx.restore();
    });

    // 5. Draw Room Label Markers with Calculated Area (m²)
    rooms.forEach((room) => {
      const isSelected = selectedId === room.id;
      const rx = room.x * pixelsPerMeter;
      const ry = room.y * pixelsPerMeter;

      const areaSqm = estimateRoomArea(room, walls);
      const displayText = `${room.name} · ${areaSqm} m²`;

      ctx.save();
      ctx.translate(rx, ry);

      const fontSize = Math.max(10, Math.min(13, 12 / viewport.zoom));
      ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      const textMetrics = ctx.measureText(displayText);
      const boxW = Math.max(80, textMetrics.width + 24);
      const boxH = fontSize + 16;

      // Badge Card
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
      ctx.fillStyle = isSelected
        ? isLight
          ? 'rgba(14, 165, 233, 0.2)'
          : 'rgba(56, 189, 248, 0.25)'
        : roomBadgeBg;
      ctx.fill();
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = isSelected ? '#0284c7' : roomBadgeBorder;
      ctx.stroke();

      // Icon Dot
      ctx.beginPath();
      ctx.arc(-boxW / 2 + 10, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#0284c7' : '#10b981';
      ctx.fill();

      // Text
      ctx.fillStyle = isSelected ? (isLight ? '#0369a1' : '#38bdf8') : roomBadgeText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(displayText, 5, 0);

      ctx.restore();
    });

    // 6. Draw Placed Furniture CAD Blocks
    furniture.forEach((item) => {
      const isSelected = selectedId === item.id;
      const catItem = getFurnitureCatalogItem(item.catalogId);
      const fx = item.position[0] * pixelsPerMeter;
      const fy = item.position[2] * pixelsPerMeter; // position[2] is 2D Y
      const wPx = (catItem.dimensions.width || 1.0) * (item.scale || 1.0) * pixelsPerMeter;
      const dPx = (catItem.dimensions.depth || 0.8) * (item.scale || 1.0) * pixelsPerMeter;

      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(-item.rotationY);

      // Block outline & fill
      ctx.beginPath();
      ctx.roundRect(-wPx / 2, -dPx / 2, wPx, dPx, 4);
      ctx.fillStyle = isSelected
        ? isLight
          ? 'rgba(16, 185, 129, 0.25)'
          : 'rgba(52, 211, 153, 0.3)'
        : isLight
        ? 'rgba(241, 245, 249, 0.9)'
        : 'rgba(30, 41, 59, 0.9)';
      ctx.fill();

      ctx.lineWidth = isSelected ? 2 : 1.2;
      ctx.strokeStyle = isSelected ? '#10b981' : isLight ? '#94a3b8' : '#475569';
      ctx.stroke();

      // Front orientation indicator
      ctx.beginPath();
      ctx.moveTo(-wPx / 2 + 3, -dPx / 2 + 3);
      ctx.lineTo(wPx / 2 - 3, -dPx / 2 + 3);
      ctx.strokeStyle = isSelected ? '#10b981' : isLight ? '#cbd5e1' : '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Furniture label
      if (wPx * viewport.zoom > 35 && dPx * viewport.zoom > 20) {
        const fontSize = Math.max(8, Math.min(10, 9 / viewport.zoom));
        ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = isSelected ? '#10b981' : isLight ? '#475569' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const shortName = item.name.length > 14 ? item.name.slice(0, 12) + '…' : item.name;
        ctx.fillText(shortName, 0, 0);
      }

      ctx.restore();
    });

    // 6. Draw Preview / Ghost while drawing a new wall
    if (activeTool === 'wall' && drawingWallStart) {
      const x1 = drawingWallStart.x * pixelsPerMeter;
      const y1 = drawingWallStart.y * pixelsPerMeter;
      const x2 = snappedMouseWorld.x * pixelsPerMeter;
      const y2 = snappedMouseWorld.y * pixelsPerMeter;
      const previewLen = distance(drawingWallStart, snappedMouseWorld);

      // Rubberband preview line
      ctx.beginPath();
      ctx.lineWidth = 0.15 * pixelsPerMeter;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineCap = 'round';
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([6, 4]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start circle
      ctx.beginPath();
      ctx.arc(x1, y1, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Dimension badge on preview
      if (previewLen > 0.1) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const labelText = formatMeters(previewLen);

        ctx.save();
        ctx.translate(midX, midY);
        ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
        const metrics = ctx.measureText(labelText);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.95)';
        ctx.beginPath();
        ctx.roundRect(-metrics.width / 2 - 8, -12, metrics.width + 16, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
      }
    }

    // 7. Door / Window Ghost Placement Preview
    if ((activeTool === 'door' || activeTool === 'window') && hoveredWallForOpening) {
      const { wall, ratio } = hoveredWallForOpening;
      const centerWorld: Point2D = {
        x: wall.start.x + (wall.end.x - wall.start.x) * ratio,
        y: wall.start.y + (wall.end.y - wall.start.y) * ratio,
      };
      const centerPx = {
        x: centerWorld.x * pixelsPerMeter,
        y: centerWorld.y * pixelsPerMeter,
      };
      const wallAngle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      const widthMeters = activeTool === 'door' ? 0.9 : 1.4;
      const openingWidthPx = widthMeters * pixelsPerMeter;

      ctx.save();
      ctx.translate(centerPx.x, centerPx.y);
      ctx.rotate(wallAngle);

      ctx.strokeStyle = activeTool === 'door' ? '#f59e0b' : '#38bdf8';
      ctx.fillStyle = activeTool === 'door' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(
        -openingWidthPx / 2,
        (-wall.thickness * pixelsPerMeter) / 2,
        openingWidthPx,
        wall.thickness * pixelsPerMeter,
        2
      );
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // 8. Calibration line drawing
    if (calibrationState.isCalibrating && calibrationState.pointA) {
      const pA = {
        x: calibrationState.pointA.x * pixelsPerMeter,
        y: calibrationState.pointA.y * pixelsPerMeter,
      };
      const pB = calibrationState.pointB
        ? {
            x: calibrationState.pointB.x * pixelsPerMeter,
            y: calibrationState.pointB.y * pixelsPerMeter,
          }
        : {
            x: snappedMouseWorld.x * pixelsPerMeter,
            y: snappedMouseWorld.y * pixelsPerMeter,
          };

      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point A marker
      ctx.beginPath();
      ctx.arc(pA.x, pA.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Point B marker
      ctx.beginPath();
      ctx.arc(pB.x, pB.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 9. Endpoint Snapping Highlight Ring (Cyan CAD Snap Indicator)
    if (snappedEndpoint) {
      const snapPx = {
        x: snappedEndpoint.point.x * pixelsPerMeter,
        y: snappedEndpoint.point.y * pixelsPerMeter,
      };
      ctx.beginPath();
      ctx.arc(snapPx.x, snapPx.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner snap dot
      ctx.beginPath();
      ctx.arc(snapPx.x, snapPx.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Snap Hint Pill
      ctx.save();
      const snapHintText = language === 'uz' ? 'Nuqta' : 'Точка';
      ctx.font = 'bold 10px ui-sans-serif, system-ui, sans-serif';
      const snapMetrics = ctx.measureText(snapHintText);
      const pillW = snapMetrics.width + 10;
      const pillH = 16;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
      ctx.beginPath();
      ctx.roundRect(snapPx.x + 10, snapPx.y - 8, pillW, pillH, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(snapHintText, snapPx.x + 10 + pillW / 2, snapPx.y);
      ctx.restore();
    }
  }, [
    viewport,
    pixelsPerMeter,
    walls,
    openings,
    rooms,
    furniture,
    backgroundImage,
    view2DMode,
    activeTool,
    selectedId,
    showGrid,
    drawingWallStart,
    snappedMouseWorld,
    snappedEndpoint,
    hoveredWallForOpening,
    calibrationState,
    isLight,
    language,
  ]);

  // Handle Resize and Animation Frame Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      drawScene();
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => ro.disconnect();
  }, [drawScene]);

  // Request Animation Frame on render dependency change
  useEffect(() => {
    let animId: number;
    const render = () => {
      drawScene();
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [drawScene]);

  // Mouse Move Event Handler (100% 1:1 with Screen CSS Pixels)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 1. Panning Handling
    if (isPanning) {
      const dx = screenX - panStart.x;
      const dy = screenY - panStart.y;
      setViewport((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setPanStart({ x: screenX, y: screenY });
      return;
    }

    const mouseWorld = screenToWorld(screenX, screenY, viewport, pixelsPerMeter);

    // 2. Dragging Existing Elements (Wall endpoints, walls, openings, rooms)
    if (dragState.type) {
      if (dragState.type === 'wall-start' && dragState.id) {
        const snapMeters = SNAP_RADIUS_PIXELS / (viewport.zoom * pixelsPerMeter);
        const snap = findNearbyEndpoint(mouseWorld, walls, snapMeters, dragState.id);
        const finalPt = snap
          ? snap.point
          : isOrthoSnapEnabled && dragState.initialWall
          ? snapToAngle(dragState.initialWall.end, mouseWorld)
          : mouseWorld;
        updateWall(dragState.id, { start: finalPt });
      } else if (dragState.type === 'wall-end' && dragState.id) {
        const snapMeters = SNAP_RADIUS_PIXELS / (viewport.zoom * pixelsPerMeter);
        const snap = findNearbyEndpoint(mouseWorld, walls, snapMeters, dragState.id);
        const finalPt = snap
          ? snap.point
          : isOrthoSnapEnabled && dragState.initialWall
          ? snapToAngle(dragState.initialWall.start, mouseWorld)
          : mouseWorld;
        updateWall(dragState.id, { end: finalPt });
      } else if (dragState.type === 'wall-body' && dragState.id && dragState.initialWall) {
        const dx = mouseWorld.x - dragState.startPoint.x;
        const dy = mouseWorld.y - dragState.startPoint.y;
        updateWall(dragState.id, {
          start: { x: dragState.initialWall.start.x + dx, y: dragState.initialWall.start.y + dy },
          end: { x: dragState.initialWall.end.x + dx, y: dragState.initialWall.end.y + dy },
        });
      } else if (dragState.type === 'opening' && dragState.id) {
        const opening = openings.find((o) => o.id === dragState.id);
        if (opening) {
          const wall = walls.find((w) => w.id === opening.wallId);
          if (wall) {
            const proj = projectPointOntoSegment(mouseWorld, wall.start, wall.end);
            const clampedRatio = Math.max(0.1, Math.min(0.9, proj.ratio));
            updateOpening(dragState.id, { positionRatio: clampedRatio });
          }
        }
      } else if (dragState.type === 'room' && dragState.id && dragState.initialRoomPos) {
        const dx = mouseWorld.x - dragState.startPoint.x;
        const dy = mouseWorld.y - dragState.startPoint.y;
        updateRoom(dragState.id, {
          x: dragState.initialRoomPos.x + dx,
          y: dragState.initialRoomPos.y + dy,
        });
      }
      return;
    }

    // 3. Endpoint Snapping Check for Drawing
    const snapRadiusMeters = SNAP_RADIUS_PIXELS / (viewport.zoom * pixelsPerMeter);
    const nearbySnap = findNearbyEndpoint(mouseWorld, walls, snapRadiusMeters);

    let calculatedPos = mouseWorld;
    if (nearbySnap) {
      calculatedPos = nearbySnap.point;
      setSnappedEndpoint(nearbySnap);
    } else {
      setSnappedEndpoint(null);
      // Angle Snapping if active wall chain is drawing
      if (activeTool === 'wall' && drawingWallStart && isOrthoSnapEnabled) {
        calculatedPos = snapToAngle(drawingWallStart, mouseWorld, 45);
      }
    }
    setSnappedMouseWorld(calculatedPos);

    // 4. Hover Wall check for Door / Window placement
    if (activeTool === 'door' || activeTool === 'window') {
      let closestWall: { wall: Wall; ratio: number; snappedPoint: Point2D; dist: number } | null = null;
      for (const w of walls) {
        const proj = projectPointOntoSegment(mouseWorld, w.start, w.end);
        if (proj.distance < w.thickness + 0.35) {
          if (!closestWall || proj.distance < closestWall.dist) {
            closestWall = {
              wall: w,
              ratio: Math.max(0.1, Math.min(0.9, proj.ratio)),
              snappedPoint: proj.point,
              dist: proj.distance,
            };
          }
        }
      }
      setHoveredWallForOpening(
        closestWall
          ? {
              wall: closestWall.wall,
              ratio: closestWall.ratio,
              snappedPoint: closestWall.snappedPoint,
            }
          : null
      );
    } else {
      if (hoveredWallForOpening) setHoveredWallForOpening(null);
    }
  };

  // Mouse Down Event Handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Middle Click or Space Key or Pan Tool
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: screenX, y: screenY });
      return;
    }

    if (e.button !== 0) return; // Only process left click below

    const mouseWorld = screenToWorld(screenX, screenY, viewport, pixelsPerMeter);
    const targetPoint = snappedEndpoint ? snappedEndpoint.point : snappedMouseWorld;

    // --- TOOL: CALIBRATE ---
    if (activeTool === 'calibrate') {
      if (!calibrationState.pointA) {
        setCalibrationPointA(targetPoint);
      } else if (!calibrationState.pointB) {
        setCalibrationPointB(targetPoint);
      }
      return;
    }

    // --- TOOL: WALL DRAWING ---
    if (activeTool === 'wall') {
      if (!drawingWallStart) {
        setDrawingWallStart(targetPoint);
      } else {
        const wallDist = distance(drawingWallStart, targetPoint);
        if (wallDist >= 0.1) {
          addWall({
            start: drawingWallStart,
            end: targetPoint,
            thickness: 0.15,
          });
          // Continuous wall drawing: current point becomes next start point
          setDrawingWallStart(targetPoint);
        }
      }
      return;
    }

    // --- TOOL: DOOR PLACEMENT ---
    if (activeTool === 'door' && hoveredWallForOpening) {
      addOpening({
        wallId: hoveredWallForOpening.wall.id,
        type: 'door',
        positionRatio: hoveredWallForOpening.ratio,
        width: 0.9,
        height: 2.1,
        sillHeight: 0,
        flip: false,
      });
      return;
    }

    // --- TOOL: WINDOW PLACEMENT ---
    if (activeTool === 'window' && hoveredWallForOpening) {
      addOpening({
        wallId: hoveredWallForOpening.wall.id,
        type: 'window',
        positionRatio: hoveredWallForOpening.ratio,
        width: 1.4,
        height: 1.4,
        sillHeight: 0.9,
      });
      return;
    }

    // --- TOOL: ROOM LABEL ---
    if (activeTool === 'room') {
      addRoom({
        name: language === 'uz' ? 'Yangi Xona' : 'Новая комната',
        x: Math.round(mouseWorld.x * 10) / 10,
        y: Math.round(mouseWorld.y * 10) / 10,
      });
      setActiveTool('select');
      return;
    }

    // --- TOOL: SELECT ---
    if (activeTool === 'select') {
      // 1. Check if clicking on an opening
      for (const op of openings) {
        const w = walls.find((wall) => wall.id === op.wallId);
        if (!w) continue;
        const opCenter: Point2D = {
          x: w.start.x + (w.end.x - w.start.x) * op.positionRatio,
          y: w.start.y + (w.end.y - w.start.y) * op.positionRatio,
        };
        if (distance(mouseWorld, opCenter) < op.width / 2 + 0.2) {
          setSelectedId(op.id);
          setDragState({
            type: 'opening',
            id: op.id,
            startPoint: mouseWorld,
            initialOpeningRatio: op.positionRatio,
          });
          return;
        }
      }

      // 2. Check if clicking on furniture
      for (const f of furniture) {
        if (Math.hypot(mouseWorld.x - f.position[0], mouseWorld.y - f.position[2]) < 0.8) {
          setSelectedId(f.id);
          return;
        }
      }

      // 3. Check if clicking on a room label
      for (const r of rooms) {
        if (distance(mouseWorld, { x: r.x, y: r.y }) < 1.0) {
          setSelectedId(r.id);
          setDragState({
            type: 'room',
            id: r.id,
            startPoint: mouseWorld,
            initialRoomPos: { x: r.x, y: r.y },
          });
          return;
        }
      }

      // 3. Check if clicking on an already selected wall's endpoints
      if (selectedId) {
        const selWall = walls.find((w) => w.id === selectedId);
        if (selWall) {
          const hitRadius = 12 / (viewport.zoom * pixelsPerMeter);
          if (distance(mouseWorld, selWall.start) <= hitRadius) {
            setDragState({
              type: 'wall-start',
              id: selWall.id,
              startPoint: mouseWorld,
              initialWall: { ...selWall },
            });
            return;
          }
          if (distance(mouseWorld, selWall.end) <= hitRadius) {
            setDragState({
              type: 'wall-end',
              id: selWall.id,
              startPoint: mouseWorld,
              initialWall: { ...selWall },
            });
            return;
          }
        }
      }

      // 4. Check if clicking any wall body
      let hitWall: Wall | null = null;
      let minDistance = Infinity;
      for (const w of walls) {
        const proj = projectPointOntoSegment(mouseWorld, w.start, w.end);
        if (proj.distance <= w.thickness / 2 + 0.15 && proj.distance < minDistance) {
          minDistance = proj.distance;
          hitWall = w;
        }
      }

      if (hitWall) {
        setSelectedId(hitWall.id);
        setDragState({
          type: 'wall-body',
          id: hitWall.id,
          startPoint: mouseWorld,
          initialWall: { ...hitWall },
        });
        return;
      }

      // Clicked on empty space: deselect
      setSelectedId(null);
    }
  };

  // Mouse Up Event Handler
  const handleMouseUp = () => {
    setIsPanning(false);
    if (dragState.type) {
      setDragState({ type: null, id: null, startPoint: { x: 0, y: 0 } });
    }
  };

  // Right Click / Context Menu: Cancel active wall chain
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (drawingWallStart) {
      setDrawingWallStart(null);
    } else if (calibrationState.isCalibrating) {
      useFloorplanStore.getState().cancelCalibration();
    }
  };

  // Zoom with Mouse Wheel (Smooth, centered at mouse pointer)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.max(0.15, Math.min(6.0, viewport.zoom * zoomFactor));

    // Keep world coordinate under cursor static while zooming
    const mouseWorld = screenToWorld(screenX, screenY, viewport, pixelsPerMeter);

    const newX = screenX - mouseWorld.x * newZoom * pixelsPerMeter;
    const newY = screenY - mouseWorld.y * newZoom * pixelsPerMeter;

    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom,
    });
  };

  // Cursor style calculation based on active tool & dragging
  const getCursorStyle = () => {
    if (isPanning || isSpacePressed) return 'cursor-grab active:cursor-grabbing';
    if (dragState.type === 'wall-start' || dragState.type === 'wall-end') return 'cursor-crosshair';
    if (dragState.type === 'wall-body' || dragState.type === 'room' || dragState.type === 'opening')
      return 'cursor-move';
    switch (activeTool) {
      case 'pan':
        return 'cursor-grab active:cursor-grabbing';
      case 'wall':
      case 'calibrate':
        return 'cursor-crosshair';
      case 'door':
      case 'window':
        return 'cursor-cell';
      case 'room':
        return 'cursor-text';
      default:
        return 'cursor-default';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden ${getCursorStyle()}`}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className="block w-full h-full outline-none"
      />
    </div>
  );
};
