'use client';

import React, { useRef, useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { ToolType } from '@/types/floorplan';
import { AIScanPreviewModal, AIScanResultData } from '@/components/editor2d/AIScanPreviewModal';
import { compressBlueprintImage } from '@/lib/imageCompression';
import {
  MousePointer,
  Hand,
  Upload,
  Ruler,
  Square,
  DoorOpen,
  AppWindow,
  Tag,
  Magnet,
  Grid,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ToolItem {
  id: ToolType;
  labelKey: 'toolSelect' | 'toolPan' | 'toolCalibrate' | 'toolWall' | 'toolDoor' | 'toolWindow' | 'toolRoom';
  shortLabel: { uz: string; ru: string };
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const LeftToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    isOrthoSnapEnabled,
    toggleOrthoSnap,
    showGrid,
    toggleShowGrid,
    setBackgroundImage,
    backgroundImage,
    ceilingHeight,
    targetAreaSqm,
  } = useFloorplanStore();

  const { language } = usePreferencesStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Scanner state in 2D Editor
  const [isScanning, setIsScanning] = useState(false);
  const [scanData, setScanData] = useState<AIScanResultData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleAiScan = async () => {
    if (!backgroundImage?.url) {
      alert(getTranslation(language, 'aiNoBlueprintAlert'));
      fileInputRef.current?.click();
      return;
    }

    setIsScanning(true);
    try {
      const compressed = await compressBlueprintImage(backgroundImage.url, 1600, 0.88);

      const response = await fetch('/api/ai/scan-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressed.dataUrl,
          imageWidth: compressed.width,
          imageHeight: compressed.height,
          ceilingHeight: ceilingHeight || 2.8,
          targetAreaSqm: targetAreaSqm || 84,
          language,
        }),
      });

      let resJson: { success?: boolean; error?: string; data?: AIScanResultData };
      try {
        resJson = await response.json();
      } catch {
        resJson = { error: 'Serverdan javob o‘qishda xatolik yuz berdi.' };
      }

      if (!response.ok || !resJson?.success || !resJson?.data) {
        alert(resJson?.error || getTranslation(language, 'aiScanError'));
        return;
      }

      setScanData(resJson.data);
      setIsPreviewOpen(true);
    } catch (err: unknown) {
      console.error('AI Scan Error in 2D:', err);
      const msg = err instanceof Error ? err.message : getTranslation(language, 'aiScanError');
      alert(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const mainTools: ToolItem[] = [
    { id: 'select', labelKey: 'toolSelect', shortLabel: { uz: 'Tanlash', ru: 'Выбор' }, shortcut: 'V', icon: MousePointer },
    { id: 'pan', labelKey: 'toolPan', shortLabel: { uz: 'Ko‘chirish', ru: 'Сдвиг' }, shortcut: 'H / Space', icon: Hand },
    { id: 'calibrate', labelKey: 'toolCalibrate', shortLabel: { uz: 'Masshtab', ru: 'Масштаб' }, shortcut: 'C', icon: Ruler },
    { id: 'wall', labelKey: 'toolWall', shortLabel: { uz: 'Devor', ru: 'Стена' }, shortcut: 'W', icon: Square },
    { id: 'door', labelKey: 'toolDoor', shortLabel: { uz: 'Eshik', ru: 'Дверь' }, shortcut: 'D', icon: DoorOpen },
    { id: 'window', labelKey: 'toolWindow', shortLabel: { uz: 'Deraza', ru: 'Окно' }, shortcut: 'G', icon: AppWindow },
    { id: 'room', labelKey: 'toolRoom', shortLabel: { uz: 'Xona', ru: 'Комната' }, shortcut: 'R', icon: Tag },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressBlueprintImage(file, 1600, 0.88);
      setBackgroundImage({
        url: compressed.dataUrl,
        opacity: 0.5,
        visible: true,
        width: compressed.width,
        height: compressed.height,
        x: 0,
        y: 0,
      });
      setActiveTool('calibrate');
    } catch (err) {
      console.error('Failed to compress blueprint in LeftToolbar:', err);
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
          setActiveTool('calibrate');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <aside className="w-16 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md flex flex-col items-center py-3 z-20 gap-1 select-none transition-colors duration-200 shadow-xs">
      {/* Hidden File Input for Blueprint Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Main CAD Tools */}
      <div className="flex flex-col gap-1 w-full px-2">
        {mainTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const label = getTranslation(language, tool.labelKey);

          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${label} (${tool.shortcut})`}
              className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 font-medium leading-none truncate max-w-full">
                {tool.shortLabel[language]}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs text-slate-900 dark:text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                <span className="font-semibold">{label}</span>
                <span className="text-slate-400 ml-1.5 text-[10px]">[{tool.shortcut}]</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Blueprint Image Upload Button */}
      <div className="w-full px-2 mt-1">
        <button
          onClick={() => fileInputRef.current?.click()}
          title={getTranslation(language, 'blueprintTitle')}
          className="group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border border-transparent transition-all"
        >
          <Upload className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-medium leading-none">
            {language === 'uz' ? 'Yuklash' : 'Файл'}
          </span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs text-slate-900 dark:text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">{getTranslation(language, 'blueprintTitle')}</span>
            <span className="text-amber-500 block text-[10px]">JPG, PNG</span>
          </div>
        </button>
      </div>

      {/* AI Gemini Vision Scanner Quick Button */}
      <div className="w-full px-2 mt-1">
        <button
          onClick={handleAiScan}
          disabled={isScanning}
          title={getTranslation(language, 'aiScanTooltip')}
          className="group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isScanning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
          )}
          <span className="text-[9px] mt-0.5 font-bold leading-none">
            AI Scan
          </span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs text-slate-900 dark:text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">{getTranslation(language, 'aiScanBtn')}</span>
            <span className="text-cyan-500 block text-[10px]">Gemini 2.5 Flash</span>
          </div>
        </button>
      </div>

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />

      {/* Architectural Snapping & Display Toggles */}
      <div className="flex flex-col gap-1 w-full px-2 mt-auto">
        {/* Ortho Snap Toggle */}
        <button
          onClick={toggleOrthoSnap}
          title={`${getTranslation(language, 'orthoToggle')}: ${isOrthoSnapEnabled ? 'ON' : 'OFF'}`}
          className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition ${
            isOrthoSnapEnabled
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Magnet className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-medium leading-none">Ortho</span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs text-slate-900 dark:text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">{getTranslation(language, 'orthoToggle')} (0°/45°/90°)</span>
            <span className={`block text-[10px] ${isOrthoSnapEnabled ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isOrthoSnapEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </button>

        {/* Grid Toggle */}
        <button
          onClick={toggleShowGrid}
          title={`${getTranslation(language, 'gridToggle')}: ${showGrid ? 'ON' : 'OFF'} (G)`}
          className={`group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition ${
            showGrid
              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-medium leading-none">
            {language === 'uz' ? 'To‘r' : 'Сетка'}
          </span>

          <div className="absolute left-full ml-2 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs text-slate-900 dark:text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            <span className="font-semibold">{getTranslation(language, 'gridToggle')} (1m / 0.5m)</span>
            <span className="text-slate-400 ml-1.5 text-[10px]">[G]</span>
          </div>
        </button>
      </div>

      {/* Gemini Vision AI Scan Preview & Review Modal */}
      <AIScanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        scanData={scanData}
        blueprintUrl={backgroundImage?.url}
      />
    </aside>
  );
};
