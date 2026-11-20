'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import {
  FileImage,
  Layers,
  Box,
  Calculator,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({ isOpen, onClose }) => {
  const { language } = usePreferencesStore();
  const [activeStep, setActiveStep] = useState(0);

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('archstudio_has_seen_guide', 'true');
    }
    onClose();
  }, [onClose]);

  // Close with Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDismiss]);

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: getTranslation(language, 'guideStep1Title'),
      desc: getTranslation(language, 'guideStep1Desc'),
      icon: FileImage,
      color: 'from-blue-500 to-cyan-500',
      badge: language === 'uz' ? 'Reja & Chizma' : 'План & Чертёж',
    },
    {
      num: 2,
      title: getTranslation(language, 'guideStep2Title'),
      desc: getTranslation(language, 'guideStep2Desc'),
      icon: Layers,
      color: 'from-cyan-500 to-indigo-500',
      badge: language === 'uz' ? '2D CAD Editor' : '2D Редактор',
    },
    {
      num: 3,
      title: getTranslation(language, 'guideStep3Title'),
      desc: getTranslation(language, 'guideStep3Desc'),
      icon: Box,
      color: 'from-indigo-500 to-purple-500',
      badge: language === 'uz' ? '3D Studiya' : '3D Студия',
    },
    {
      num: 4,
      title: getTranslation(language, 'guideStep4Title'),
      desc: getTranslation(language, 'guideStep4Desc'),
      icon: Calculator,
      color: 'from-purple-500 to-emerald-500',
      badge: language === 'uz' ? 'Aqlli Smeta (BOM)' : 'Умная Смета',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {getTranslation(language, 'guideTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getTranslation(language, 'guideSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;

            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100/90 dark:bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/30'
                    : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-xs`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {step.badge}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer with Step Dots & Action Button */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  activeStep === idx
                    ? 'w-6 bg-cyan-500'
                    : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDismiss}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{getTranslation(language, 'guideGotIt')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
