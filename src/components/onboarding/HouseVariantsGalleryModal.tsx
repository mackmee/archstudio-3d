'use client';

import React, { useState } from 'react';
import { GeneratedFloorplanVariant } from '@/lib/floorplanGenerator';
import { HouseVariantCard } from './HouseVariantCard';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { X, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

interface HouseVariantsGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: GeneratedFloorplanVariant[];
  selectedParams: {
    width: number;
    depth: number;
    bedrooms: number;
    bathrooms: number;
  };
}

export const HouseVariantsGalleryModal: React.FC<HouseVariantsGalleryModalProps> = ({
  isOpen,
  onClose,
  variants,
  selectedParams,
}) => {
  const { language } = usePreferencesStore();
  const { loadGeneratedVariant } = useFloorplanStore();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const isRu = language === 'ru';

  if (!isOpen) return null;

  const filterTabs = [
    { id: 'all', label: isRu ? `Все варианты (${variants.length})` : `Barcha variantlar (${variants.length})` },
    { id: 'classic', label: isRu ? 'Классика' : 'Klassik' },
    { id: 'modern', label: isRu ? 'Open-Space / Зал' : 'Open-Space / Zal' },
    { id: 'villa', label: isRu ? 'Вилла / Терраса' : 'Villa / Terassa' },
    { id: 'compact', label: isRu ? 'Компакт' : 'Kompakt' },
  ];

  const filteredVariants = variants.filter((v) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'classic') return v.styleKey === 'classic';
    if (activeFilter === 'modern') return v.styleKey === 'modern';
    if (activeFilter === 'villa') return v.styleKey === 'villa' || v.styleKey === 'premium';
    if (activeFilter === 'compact') return v.styleKey === 'compact' || v.styleKey === 'utility';
    return true;
  });

  const handleSelect = (variant: GeneratedFloorplanVariant) => {
    loadGeneratedVariant(variant);
    onClose();
  };

  const totalArea = Number((selectedParams.width * selectedParams.depth).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.8 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRu ? '10 Вариантов Планировки' : '10 ta Arxitekturaviy Loyiha'}</span>
              </span>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {selectedParams.width}m × {selectedParams.depth}m ({totalArea} m²)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isRu
                ? 'Выберите идеальный проект для вашего участка'
                : 'Uyingiz uchun eng maqbul arxitekturaviy loyihani tanlang'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-slate-400 mr-1 hidden sm:block" />
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition border whitespace-nowrap cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/50 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              {isRu
                ? 'Все варианты включают стены, двери, окна и 3D мебель'
                : 'Barcha rejalar devorlar, eshiklar, derazalar va 3D mebellar bilan jihozlangan'}
            </span>
          </div>
        </div>

        {/* Scrollable Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0a0e17]">
          {filteredVariants.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              {isRu ? 'В данной категории вариантов не найдено.' : 'Ushbu toifada loyiha topilmadi.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVariants.map((variant) => (
                <HouseVariantCard
                  key={variant.id}
                  variant={variant}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
