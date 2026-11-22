'use client';

import React, { useState, useRef } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SunMoon,
  FileImage,
  Upload,
  X,
} from 'lucide-react';

interface BlueprintReferencePaneProps {
  onClose?: () => void;
}

export const BlueprintReferencePane: React.FC<BlueprintReferencePaneProps> = ({ onClose }) => {
  const { backgroundImage, setBackgroundImage, setView2DMode } = useFloorplanStore();
  const { language } = usePreferencesStore();

  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isInverted, setIsInverted] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(5.0, Math.max(0.3, Number((prev * zoomFactor).toFixed(2)))));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(5.0, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.3, Number((prev - 0.25).toFixed(2))));
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setBackgroundImage({
          url: dataUrl,
          opacity: 0.5,
          visible: true,
          width: img.width,
          height: img.height,
          x: 0,
          y: 0,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-slate-950 flex flex-col select-none overflow-hidden border-r border-slate-800"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Floating Glass Header */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-lg text-slate-200 text-xs font-semibold">
          <FileImage className="w-3.5 h-3.5 text-cyan-400" />
          <span>{getTranslation(language, 'blueprintReferenceTitle')}</span>
          <span className="text-[10px] font-mono text-slate-400 ml-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-lg text-slate-200">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Kattalashtirish (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Kichiklashtirish (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Asl holatga qaytarish (Fit)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsInverted((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors ${
              isInverted ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Invert Kontrast (Oq/Qora)"
          >
            <SunMoon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                setView2DMode('clean');
              }
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors ml-1"
            title="Split ko‘rinishini yopish"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Reference Canvas / Image Display */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {backgroundImage?.url ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            }}
            className="pointer-events-none select-none max-w-full max-h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backgroundImage.url}
              alt="Blueprint Reference"
              className={`max-w-none rounded-md shadow-2xl object-contain ${
                isInverted ? 'invert hue-rotate-180 contrast-125' : ''
              }`}
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm pointer-events-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
              <FileImage className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">
              {getTranslation(language, 'noBlueprintPrompt')}
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              {getTranslation(language, 'blueprintSubtitle')}
            </p>
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'browseFile')}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 pointer-events-none">
        {getTranslation(language, 'blueprintPaneHint')}
      </div>
    </div>
  );
};
