'use client';

import React, { useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { View2DMode } from '@/types/floorplan';
import {
  Columns2,
  Layers,
  Square,
  Scissors,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export const ViewModeBar: React.FC = () => {
  const {
    view2DMode,
    setView2DMode,
    backgroundImage,
    updateBackgroundImage,
    splitAllWallsAtIntersections,
    walls,
  } = useFloorplanStore();

  const { language } = usePreferencesStore();
  const [splitFeedback, setSplitFeedback] = useState<string | null>(null);

  const handleSplitWalls = () => {
    const res = splitAllWallsAtIntersections();
    if (res.wallsSplit > 0 || res.junctionsSnapped > 0) {
      setSplitFeedback(
        language === 'uz'
          ? `${res.wallsSplit} ta devor ajratildi, ${res.junctionsSnapped} ta nuqta birlashtirildi`
          : `Разделено ${res.wallsSplit} стен, соединено ${res.junctionsSnapped} точек`
      );
    } else {
      setSplitFeedback(
        language === 'uz'
          ? 'Barcha devorlar mukammal ulangan'
          : 'Все стены уже правильно соединены'
      );
    }

    setTimeout(() => {
      setSplitFeedback(null);
    }, 3500);
  };

  const modes: Array<{
    id: View2DMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tooltip: string;
  }> = [
    {
      id: 'split',
      label: getTranslation(language, 'viewModeSplit'),
      icon: Columns2,
      tooltip: getTranslation(language, 'viewModeSplitDesc'),
    },
    {
      id: 'overlay',
      label: getTranslation(language, 'viewModeOverlay'),
      icon: Layers,
      tooltip: getTranslation(language, 'viewModeOverlayDesc'),
    },
    {
      id: 'clean',
      label: getTranslation(language, 'viewModeClean'),
      icon: Square,
      tooltip: getTranslation(language, 'viewModeCleanDesc'),
    },
  ];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
      {/* 3-Mode Segmented Pill */}
      <div className="flex items-center p-1 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-950/10">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = view2DMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setView2DMode(m.id)}
              title={m.tooltip}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overlay Opacity Slider (Only in overlay mode and when blueprint exists) */}
      {view2DMode === 'overlay' && backgroundImage?.url && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-xs font-medium text-slate-700 dark:text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span className="hidden md:inline text-[11px] text-slate-500">
            {getTranslation(language, 'blueprintOpacity')}:
          </span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={backgroundImage.opacity ?? 0.5}
            onChange={(e) =>
              updateBackgroundImage({ opacity: parseFloat(e.target.value) })
            }
            className="w-18 md:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 w-8 text-right">
            {Math.round((backgroundImage.opacity ?? 0.5) * 100)}%
          </span>
        </div>
      )}

      {/* Auto T-Junction Split Action Button */}
      {walls.length >= 2 && (
        <button
          type="button"
          onClick={handleSplitWalls}
          title={getTranslation(language, 'splitWallsTooltip')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs font-semibold transition-all group"
        >
          <Scissors className="w-3.5 h-3.5 text-cyan-500 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">
            {getTranslation(language, 'splitWallsBtn')}
          </span>
        </button>
      )}

      {/* Split Feedback Toast */}
      {splitFeedback && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{splitFeedback}</span>
        </div>
      )}
    </div>
  );
};
