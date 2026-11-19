'use client';

import React from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore, Language, Currency } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { EditorMode } from '@/types/floorplan';
import {
  FileImage,
  Layers,
  Box,
  Calculator,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  Download,
  ChevronRight,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const {
    currentMode,
    setCurrentMode,
    projectName,
    historyPast,
    historyFuture,
    undo,
    redo,
    resetProject,
    loadSamplePlan,
    walls,
    openings,
    rooms,
    furniture,
    floorMaterialId,
    ceilingMaterialId,
    pixelsPerMeter,
    ceilingHeight,
    backgroundImage,
    getReadinessChecklist,
  } = useFloorplanStore();

  const {
    theme,
    toggleTheme,
    language,
    setLanguage,
    currency,
    setCurrency,
  } = usePreferencesStore();

  const checklist = getReadinessChecklist();

  const handleExportJson = () => {
    const data = {
      version: '6.0',
      exportedAt: new Date().toISOString(),
      projectName,
      pixelsPerMeter,
      ceilingHeight,
      floorMaterialId,
      ceilingMaterialId,
      walls,
      openings,
      rooms,
      furniture,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const steps: { mode: EditorMode; stepNum: number; label: string; icon: React.ElementType; isDone: boolean }[] = [
    {
      mode: 'onboarding',
      stepNum: 1,
      label: getTranslation(language, 'step1Short'),
      icon: FileImage,
      isDone: Boolean(backgroundImage?.url) || walls.length > 0,
    },
    {
      mode: '2d',
      stepNum: 2,
      label: getTranslation(language, 'step2Short'),
      icon: Layers,
      isDone: checklist.hasWalls,
    },
    {
      mode: '3d',
      stepNum: 3,
      label: getTranslation(language, 'step3Short'),
      icon: Box,
      isDone: furniture.length > 0 || walls.length >= 3,
    },
    {
      mode: 'estimator',
      stepNum: 4,
      label: getTranslation(language, 'step4Short'),
      icon: Calculator,
      isDone: walls.length > 0,
    },
  ];

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 select-none transition-colors duration-200">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white font-bold text-xs tracking-wider">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                ArchStudio
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[130px] sm:max-w-[180px]">
              {projectName || getTranslation(language, 'defaultProjectName')}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Step Guided Client Workflow Stepper */}
      <nav className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentMode === step.mode;

          return (
            <React.Fragment key={step.mode}>
              <button
                onClick={() => setCurrentMode(step.mode)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-900/50'
                }`}
                title={`Step ${step.stepNum}: ${step.label}`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-cyan-500 text-white dark:bg-cyan-400 dark:text-slate-950'
                      : step.isDone
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.isDone && !isActive ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.stepNum}
                </div>
                <Icon className={`w-3.5 h-3.5 hidden md:inline ${isActive ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-700 mx-0.5 shrink-0 hidden lg:block" />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right Controls: Preferences Cluster + Actions */}
      <div className="flex items-center gap-2">
        {/* Language Switcher Pill (UZ | RU) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold">
          {(['uz', 'ru'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 py-1 rounded-md uppercase tracking-wider transition ${
                language === lang
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Currency Switcher Pill (UZS | USD) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold">
          {(['UZS', 'USD'] as Currency[]).map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`px-2 py-1 rounded-md tracking-wider transition ${
                currency === curr
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {curr === 'USD' ? '$' : 'UZS'}
            </button>
          ))}
        </div>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition shadow-xs"
          title={theme === 'dark' ? 'Yorug‘ rejimga o‘tish (Light Mode)' : 'Qorong‘i rejimga o‘tish (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Demo Plan Button */}
        <button
          onClick={loadSamplePlan}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 transition shadow-xs"
          title={getTranslation(language, 'demoPlan')}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="hidden xl:inline">{getTranslation(language, 'demoPlan')}</span>
        </button>

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={historyPast.length === 0}
          title={getTranslation(language, 'undo')}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          disabled={historyFuture.length === 0}
          title={getTranslation(language, 'redo')}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleExportJson}
          title={getTranslation(language, 'exportJson')}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:inline-flex"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            if (confirm(getTranslation(language, 'clearConfirm'))) {
              resetProject();
              setCurrentMode('onboarding');
            }
          }}
          title={getTranslation(language, 'clearProject')}
          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
