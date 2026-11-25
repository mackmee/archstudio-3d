'use client';

import React, { useRef, useEffect } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { Wall, Opening, Room, PlacedFurniture } from '@/types/floorplan';
import {
  Sparkles,
  X,
  CheckCircle2,
  Layers,
  DoorOpen,
  Tag,
  Maximize2,
  Armchair,
} from 'lucide-react';

export interface AIScanResultData {
  usedModel?: string;
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  furniture?: PlacedFurniture[];
  estimatedWidthMeters: number;
  estimatedHeightMeters: number;
  pixelsPerMeter: number;
  alignment?: {
    imageX: number;
    imageY: number;
    imageWidthMeters: number;
    imageHeightMeters: number;
  };
}

interface AIScanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanData: AIScanResultData | null;
  blueprintUrl?: string | null;
}

export const AIScanPreviewModal: React.FC<AIScanPreviewModalProps> = ({
  isOpen,
  onClose,
  scanData,
  blueprintUrl,
}) => {
  const { language } = usePreferencesStore();
  const {
    setPixelsPerMeter,
    setCurrentMode,
  } = useFloorplanStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render visual preview on canvas
  useEffect(() => {
    if (!isOpen || !scanData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      walls,
      openings,
      rooms,
      estimatedWidthMeters,
      estimatedHeightMeters,
    } = scanData;

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const render = () => {
      // Determine canvas display size
      const maxW = 680;
      const aspect =
        estimatedHeightMeters > 0 && estimatedWidthMeters > 0
          ? estimatedHeightMeters / estimatedWidthMeters
          : 0.75;
      const targetW = maxW;
      const targetH = Math.round(maxW * aspect);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.clearRect(0, 0, targetW, targetH);

      // Scale factors to map real-world meters to preview canvas pixels
      const scaleX = targetW / estimatedWidthMeters;
      const scaleY = targetH / estimatedHeightMeters;

      // 1. Draw Blueprint Background if available
      if (img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.55;
        if (scanData.alignment) {
          const imgX = scanData.alignment.imageX * scaleX;
          const imgY = scanData.alignment.imageY * scaleY;
          const imgW = scanData.alignment.imageWidthMeters * scaleX;
          const imgH = scanData.alignment.imageHeightMeters * scaleY;
          ctx.drawImage(img, imgX, imgY, imgW, imgH);
        } else {
          ctx.drawImage(img, 0, 0, targetW, targetH);
        }
        ctx.globalAlpha = 1.0;
      } else {
        // Subtle blueprint grid placeholder
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const step = 30;
        for (let x = 0; x < targetW; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, targetH);
          ctx.stroke();
        }
        for (let y = 0; y < targetH; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(targetW, y);
          ctx.stroke();
        }
      }

      // 2. Draw Detected Walls (Cyan)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      walls.forEach((wall) => {
        const x1 = wall.start.x * scaleX;
        const y1 = wall.start.y * scaleY;
        const x2 = wall.end.x * scaleX;
        const y2 = wall.end.y * scaleY;

        // Wall shadow/glow
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = Math.max(6, wall.thickness * scaleX * 1.5);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Solid Wall Core
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = Math.max(3, wall.thickness * scaleX);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Wall endpoints
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(x1, y1, 3.5, 0, Math.PI * 2);
        ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Detected Openings (Amber)
      openings.forEach((op) => {
        const wall = walls.find((w) => w.id === op.wallId);
        if (!wall) return;

        const x1 = wall.start.x * scaleX;
        const y1 = wall.start.y * scaleY;
        const x2 = wall.end.x * scaleX;
        const y2 = wall.end.y * scaleY;

        const opX = x1 + (x2 - x1) * op.positionRatio;
        const opY = y1 + (y2 - y1) * op.positionRatio;

        ctx.fillStyle = op.type === 'door' ? '#f59e0b' : '#38bdf8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(opX, opY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 4. Draw Detected Rooms (Indigo Badges)
      rooms.forEach((room) => {
        const rx = room.x * scaleX;
        const ry = room.y * scaleY;

        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        const textWidth = ctx.measureText(room.name).width;
        const badgeW = textWidth + 16;
        const badgeH = 22;

        ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
        ctx.beginPath();
        ctx.roundRect(rx - badgeW / 2, ry - badgeH / 2, badgeW, badgeH, 6);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, rx, ry);
      });

      // 5. Draw Detected Furniture (Emerald Badges)
      (scanData.furniture || []).forEach((item) => {
        const fx = item.position[0] * scaleX;
        const fy = item.position[2] * scaleY;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(-item.rotationY);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-12, -9, 24, 18, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    };

    if (blueprintUrl) {
      img.src = blueprintUrl;
      img.onload = render;
      img.onerror = render;
    } else {
      render();
    }
  }, [isOpen, scanData, blueprintUrl]);

  if (!isOpen || !scanData) return null;

  const handleApply = () => {
    // Apply detected geometry directly to store
    useFloorplanStore.setState((state) => ({
      walls: scanData.walls,
      openings: scanData.openings,
      rooms: scanData.rooms,
      furniture:
        scanData.furniture && scanData.furniture.length > 0
          ? scanData.furniture
          : state.furniture,
      pixelsPerMeter: scanData.pixelsPerMeter,
      isCalibrated: true,
      currentMode: '2d',
      view2DMode: 'split',
      backgroundImage: blueprintUrl
        ? {
            url: blueprintUrl,
            opacity: 0.5,
            visible: true,
            width: Math.round(
              (scanData.alignment?.imageWidthMeters || scanData.estimatedWidthMeters) *
                scanData.pixelsPerMeter
            ),
            height: Math.round(
              (scanData.alignment?.imageHeightMeters || scanData.estimatedHeightMeters) *
                scanData.pixelsPerMeter
            ),
            widthMeters:
              scanData.alignment?.imageWidthMeters || scanData.estimatedWidthMeters,
            heightMeters:
              scanData.alignment?.imageHeightMeters || scanData.estimatedHeightMeters,
            x: scanData.alignment?.imageX ?? 0,
            y: scanData.alignment?.imageY ?? 0,
          }
        : state.backgroundImage,
      historyPast: [
        ...state.historyPast,
        {
          projectName: state.projectName,
          targetAreaSqm: state.targetAreaSqm,
          numRooms: state.numRooms,
          isCalibrated: state.isCalibrated,
          pixelsPerMeter: state.pixelsPerMeter,
          ceilingHeight: state.ceilingHeight,
          backgroundImage: state.backgroundImage ? { ...state.backgroundImage } : null,
          walls: state.walls.map((w) => ({ ...w, start: { ...w.start }, end: { ...w.end } })),
          openings: state.openings.map((o) => ({ ...o })),
          rooms: state.rooms.map((r) => ({ ...r })),
          furniture: state.furniture.map((f) => ({ ...f, position: [...f.position] as [number, number, number] })),
          floorMaterialId: state.floorMaterialId,
          ceilingMaterialId: state.ceilingMaterialId,
          customMaterialPrices: { ...state.customMaterialPrices },
          customFurniturePrices: { ...state.customFurniturePrices },
          wasteFactor: state.wasteFactor,
          includeLabor: state.includeLabor,
          laborRatePerSqm: state.laborRatePerSqm,
          includeDelivery: state.includeDelivery,
          deliveryFee: state.deliveryFee,
        },
      ],
      historyFuture: [],
    }));

    setPixelsPerMeter(scanData.pixelsPerMeter);
    setCurrentMode('2d');
    onClose();
  };

  const doorCount = scanData.openings.filter((o) => o.type === 'door').length;
  const windowCount = scanData.openings.filter((o) => o.type === 'window').length;
  const totalArea = Math.round(
    scanData.estimatedWidthMeters * scanData.estimatedHeightMeters
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{getTranslation(language, 'aiPreviewTitle')}</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                  {scanData.usedModel || 'Gemini 2.5 Flash'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getTranslation(language, 'aiPreviewSub')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Chips */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-semibold">
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
            <span>
              {scanData.walls.length} {getTranslation(language, 'aiDetectedWalls')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold">
            <DoorOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {doorCount} eshik, {windowCount} deraza
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-semibold">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {scanData.rooms.length} {getTranslation(language, 'aiDetectedRooms')}
            </span>
          </div>

          {scanData.furniture && scanData.furniture.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
              <Armchair className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {scanData.furniture.length}{' '}
                {language === 'uz' ? 'ta mebel' : 'предм. мебели'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold ml-auto">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {scanData.estimatedWidthMeters}m × {scanData.estimatedHeightMeters}m (~{totalArea} m²)
            </span>
          </div>
        </div>

        {/* Canvas Visual Preview */}
        <div className="p-4 sm:p-6 bg-slate-950 flex items-center justify-center overflow-hidden">
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg max-h-[50vh] flex items-center justify-center">
            <canvas ref={canvasRef} className="block max-w-full h-auto object-contain" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {language === 'uz'
              ? 'Devorlar 2D tahrirlovchida erkin surilishi va o‘zgartirilishi mumkin'
              : 'Стены можно свободно редактировать и двигать в 2D редакторе'}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {getTranslation(language, 'aiCancel')}
            </button>

            <button
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{getTranslation(language, 'aiApplyAndEdit')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
