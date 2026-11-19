'use client';

import React, { useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { Ruler, Check, X } from 'lucide-react';
import { formatMeters } from '@/lib/geometry';

interface InnerFormProps {
  initialLength: string;
  measuredDistanceMeters?: number;
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  onCancel: () => void;
  onApply: (val: number) => void;
}

const CalibrationForm: React.FC<InnerFormProps> = ({
  initialLength,
  measuredDistanceMeters,
  pointA,
  pointB,
  onCancel,
  onApply,
}) => {
  const { language } = usePreferencesStore();
  const [lengthInput, setLengthInput] = useState<string>(initialLength);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(lengthInput);
    if (isNaN(val) || val <= 0) {
      setError(language === 'uz' ? 'Iltimos, musbat raqam kiriting (metrda).' : 'Пожалуйста, введите корректное положительное число.');
      return;
    }
    setError(null);
    onApply(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-6 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {getTranslation(language, 'calibrationTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getTranslation(language, 'calibrationDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-100 dark:bg-slate-950/70 rounded-xl p-3 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">
                {language === 'uz' ? 'Chizmadagi o‘lchangan masofa:' : 'Измеренная линия на чертеже:'}
              </span>
              <span className="font-mono text-amber-600 dark:text-amber-300 font-bold">
                {measuredDistanceMeters ? formatMeters(measuredDistanceMeters) : '--'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              A: ({pointA.x.toFixed(2)}m, {pointA.y.toFixed(2)}m) → B: ({pointB.x.toFixed(2)}m, {pointB.y.toFixed(2)}m)
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {getTranslation(language, 'realWorldMeters')}
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="100"
                autoFocus
                value={lengthInput}
                onChange={(e) => {
                  setLengthInput(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. 4.5"
                className="w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-base font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 pr-12 shadow-xs"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                {language === 'uz' ? 'metr' : 'м'}
              </span>
            </div>
            {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> {getTranslation(language, 'cancel')}
              </span>
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20"
            >
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> {getTranslation(language, 'applyCalibration')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CalibrationModal: React.FC = () => {
  const { calibrationState, cancelCalibration, applyCalibration } = useFloorplanStore();

  const isBothPointsSet =
    calibrationState.isCalibrating &&
    calibrationState.pointA !== null &&
    calibrationState.pointB !== null;

  if (!isBothPointsSet || !calibrationState.pointA || !calibrationState.pointB) {
    return null;
  }

  const initialLength = calibrationState.measuredDistanceMeters
    ? calibrationState.measuredDistanceMeters.toFixed(2)
    : '4.00';

  return (
    <CalibrationForm
      initialLength={initialLength}
      measuredDistanceMeters={calibrationState.measuredDistanceMeters}
      pointA={calibrationState.pointA}
      pointB={calibrationState.pointB}
      onCancel={cancelCalibration}
      onApply={applyCalibration}
    />
  );
};
