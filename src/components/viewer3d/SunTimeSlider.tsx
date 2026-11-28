'use client';

import React, { useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatTimeOfDay } from '@/lib/lightingEngine';
import { getTranslation } from '@/lib/i18n';
import {
  Sun,
  Sunset,
  Moon,
  Sunrise,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const SunTimeSlider: React.FC = () => {
  const { view3dSettings, setTimeOfDay } = useFloorplanStore();
  const { language } = usePreferencesStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentTime = view3dSettings.timeOfDay ?? 13.0;
  const formattedTime = formatTimeOfDay(currentTime);

  const presets = [
    {
      time: 6.5,
      label: getTranslation(language, 'timeMorning'),
      timeLabel: '06:30',
      icon: Sunrise,
      activeColor: 'text-amber-500 bg-amber-500/15 border-amber-500/30',
    },
    {
      time: 13.0,
      label: getTranslation(language, 'timeNoon'),
      timeLabel: '13:00',
      icon: Sun,
      activeColor: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
    },
    {
      time: 18.75,
      label: getTranslation(language, 'timeGoldenHour'),
      timeLabel: '18:45',
      icon: Sunset,
      activeColor: 'text-orange-500 bg-orange-500/15 border-orange-500/30',
    },
    {
      time: 22.0,
      label: getTranslation(language, 'timeNight'),
      timeLabel: '22:00',
      icon: Moon,
      activeColor: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
    },
  ];

  // Determine current active mood color
  let moodIcon = Sun;
  let moodBadge = getTranslation(language, 'timeNoon');
  let moodGradient = 'from-cyan-500 via-amber-400 to-blue-500';

  if (currentTime < 7.5) {
    moodIcon = Sunrise;
    moodBadge = getTranslation(language, 'timeMorning');
    moodGradient = 'from-rose-500 via-orange-400 to-amber-300';
  } else if (currentTime < 17.0) {
    moodIcon = Sun;
    moodBadge = getTranslation(language, 'timeNoon');
    moodGradient = 'from-sky-400 via-amber-300 to-cyan-500';
  } else if (currentTime < 19.8) {
    moodIcon = Sunset;
    moodBadge = getTranslation(language, 'timeGoldenHour');
    moodGradient = 'from-amber-500 via-orange-500 to-rose-600';
  } else {
    moodIcon = Moon;
    moodBadge = getTranslation(language, 'timeNight');
    moodGradient = 'from-indigo-600 via-purple-600 to-slate-900';
  }

  const MoodIconComponent = moodIcon;

  return (
    <div className="absolute top-4 inset-x-0 pointer-events-none z-30 flex justify-center px-4 select-none">
      <div className="pointer-events-auto bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 max-w-md w-full transition-all duration-300">
        {/* Top Header Bar: Clock + Mood Badge + Collapse Toggle */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${moodGradient} flex items-center justify-center text-white shadow-xs`}>
              <MoodIconComponent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white tracking-wider">
                  {formattedTime}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {moodBadge}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {currentTime >= 19.8 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                <Sparkles className="w-3 h-3" />
                <span>3000K</span>
              </span>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isCollapsed ? 'Kengaytirish' : 'Yashirish'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Controls: Quick Buttons + Continuous Slider */}
        {!isCollapsed && (
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {presets.map((p) => {
                const Icon = p.icon;
                const isSelected = Math.abs(currentTime - p.time) < 0.75;
                return (
                  <button
                    key={p.time}
                    onClick={() => setTimeOfDay(p.time)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold transition border flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? p.activeColor
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{p.label}</span>
                    <span className="text-[10px] font-mono opacity-80 sm:hidden">{p.timeLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Continuous Smooth Drag Slider */}
            <div className="relative flex items-center gap-2 pt-1 px-1">
              <Sunrise className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min="5.5"
                  max="23.5"
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-gradient-to-r from-amber-400 via-sky-300 to-indigo-900 shadow-inner"
                />
              </div>
              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
