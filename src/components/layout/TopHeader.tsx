'use client';

import React from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
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
      label: 'Blueprint',
      icon: FileImage,
      isDone: Boolean(backgroundImage?.url) || walls.length > 0,
    },
    {
      mode: '2d',
      stepNum: 2,
      label: '2D Trace',
      icon: Layers,
      isDone: checklist.hasWalls,
    },
    {
      mode: '3d',
      stepNum: 3,
      label: '3D Design',
      icon: Box,
      isDone: furniture.length > 0 || walls.length >= 3,
    },
    {
      mode: 'estimator',
      stepNum: 4,
      label: 'Estimate',
      icon: Calculator,
      isDone: walls.length > 0,
    },
  ];

  return (
    <header className="h-14 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white font-bold text-xs tracking-wider">
            3D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">ArchStudio</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[140px] sm:max-w-[200px]">
              {projectName || 'Architectural Studio'}
            </p>
          </div>
        </div>
      </div>

      {/* 4-Step Guided Client Workflow Stepper */}
      <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-white/10 shadow-inner">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentMode === step.mode;

          return (
            <React.Fragment key={step.mode}>
              <button
                onClick={() => setCurrentMode(step.mode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-900/50'
                }`}
                title={`Switch to Step ${step.stepNum}: ${step.label}`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-cyan-400 text-slate-950'
                      : step.isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step.isDone && !isActive ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.stepNum}
                </div>
                <Icon className={`w-3.5 h-3.5 hidden sm:inline ${isActive ? 'text-cyan-300' : 'text-slate-500'}`} />
                <span>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 mx-0.5 shrink-0 hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Actions: Demo Plan, Undo, Redo, JSON, Clear */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={loadSamplePlan}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 transition shadow-xs"
          title="Load complete 2-bedroom sample plan"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Demo Plan</span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <button
          onClick={undo}
          disabled={historyPast.length === 0}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          disabled={historyFuture.length === 0}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <button
          onClick={handleExportJson}
          title="Export floorplan as JSON"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            if (confirm('Are you sure you want to clear the entire project? This action can be undone.')) {
              resetProject();
              setCurrentMode('onboarding');
            }
          }}
          title="Clear Project Canvas"
          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
