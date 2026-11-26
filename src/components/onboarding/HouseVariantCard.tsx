'use client';

import React from 'react';
import { GeneratedFloorplanVariant } from '@/lib/floorplanGenerator';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { formatPrice } from '@/lib/currency';
import { ArrowRight, BedDouble, Bath, Sofa, Sparkles } from 'lucide-react';

interface HouseVariantCardProps {
  variant: GeneratedFloorplanVariant;
  isSelected?: boolean;
  onSelect: (variant: GeneratedFloorplanVariant) => void;
}

export const HouseVariantCard: React.FC<HouseVariantCardProps> = ({
  variant,
  isSelected = false,
  onSelect,
}) => {
  const { currency, language, usdToUzsRate } = usePreferencesStore();

  const isRu = language === 'ru';
  const margin = 0.8;
  const vbWidth = variant.width + margin * 2;
  const vbHeight = variant.depth + margin * 2;

  // Format budget range
  const minPriceStr = formatPrice(
    variant.estimatedCostMinUsd,
    currency,
    language,
    usdToUzsRate,
    { compact: true }
  );
  const maxPriceStr = formatPrice(
    variant.estimatedCostMaxUsd,
    currency,
    language,
    usdToUzsRate,
    { compact: true }
  );

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-xl ${
        isSelected
          ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/30 ring-2 ring-cyan-500/40'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-cyan-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
    >
      {/* Top Banner / Badges */}
      <div className="p-4.5 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.8 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
            {variant.badgeText}
          </span>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            {variant.width}m × {variant.depth}m · {variant.totalAreaSqm} m²
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition line-clamp-1">
          {variant.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {variant.description}
        </p>
      </div>

      {/* Live SVG Vector Floorplan Preview */}
      <div className="relative mx-4 my-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-950/70 aspect-[4/3] overflow-hidden flex items-center justify-center p-2">
        <svg
          viewBox={`${-margin} ${-margin} ${vbWidth} ${vbHeight}`}
          className="w-full h-full max-h-52 select-none"
        >
          {/* Subtle Grid dots */}
          <pattern id={`grid_${variant.id}`} width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.04" className="fill-slate-300 dark:fill-slate-700" />
          </pattern>
          <rect
            x={-margin}
            y={-margin}
            width={vbWidth}
            height={vbHeight}
            fill={`url(#grid_${variant.id})`}
          />

          {/* Rooms Underlay / Color Labels */}
          {variant.rooms.map((r) => (
            <g key={r.id}>
              <circle
                cx={r.x}
                cy={r.y}
                r={0.4}
                className="fill-cyan-500/15 stroke-cyan-500/30"
                strokeWidth={0.03}
              />
              <text
                x={r.x}
                y={r.y + 0.12}
                textAnchor="middle"
                className="fill-slate-700 dark:fill-slate-300 font-semibold"
                style={{ fontSize: '0.42px' }}
              >
                {r.name.length > 18 ? r.name.slice(0, 16) + '…' : r.name}
              </text>
            </g>
          ))}

          {/* Walls */}
          {variant.walls.map((w) => {
            const isExt = w.thickness > 0.2;
            return (
              <line
                key={w.id}
                x1={w.start.x}
                y1={w.start.y}
                x2={w.end.x}
                y2={w.end.y}
                strokeLinecap="round"
                strokeWidth={w.thickness}
                className={
                  isExt
                    ? 'stroke-slate-800 dark:stroke-cyan-500'
                    : 'stroke-slate-400 dark:stroke-slate-500'
                }
              />
            );
          })}

          {/* Openings (Doors & Windows) */}
          {variant.openings.map((op) => {
            const wall = variant.walls.find((w) => w.id === op.wallId);
            if (!wall) return null;

            const wx = wall.start.x + (wall.end.x - wall.start.x) * op.positionRatio;
            const wy = wall.start.y + (wall.end.y - wall.start.y) * op.positionRatio;

            if (op.type === 'window') {
              return (
                <circle
                  key={op.id}
                  cx={wx}
                  cy={wy}
                  r={op.width * 0.4}
                  className="fill-cyan-400/80 stroke-cyan-200"
                  strokeWidth={0.04}
                />
              );
            }

            // Door arc indicator
            return (
              <g key={op.id}>
                <circle
                  cx={wx}
                  cy={wy}
                  r={op.width * 0.45}
                  fill="none"
                  className="stroke-amber-500/70"
                  strokeWidth={0.05}
                  strokeDasharray="0.1 0.1"
                />
                <circle
                  cx={wx}
                  cy={wy}
                  r={0.12}
                  className="fill-amber-500"
                />
              </g>
            );
          })}
        </svg>

        {/* 2D/3D Indicator Pill */}
        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-700/60 shadow-xs flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
          <span>CAD + 3D Ready</span>
        </div>
      </div>

      {/* Bottom Metrics & Actions */}
      <div className="p-4.5 pt-2 space-y-3">
        {/* Room Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.8 rounded-md border border-slate-200 dark:border-slate-700/60 font-medium">
            <BedDouble className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {variant.roomCounts.bedrooms} {isRu ? 'спальни' : 'yotoqxona'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.8 rounded-md border border-slate-200 dark:border-slate-700/60 font-medium">
            <Bath className="w-3.5 h-3.5 text-cyan-500" />
            <span>
              {variant.roomCounts.bathrooms} {isRu ? 'санузел' : 'sanuzel'}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.8 rounded-md border border-slate-200 dark:border-slate-700/60 font-medium">
            <Sofa className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRu ? 'Гостиная' : 'Zal'}</span>
          </span>
        </div>

        {/* Estimated Budget Badge */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {isRu ? 'Ориент. смета:' : 'Mo‘ljallangan smeta:'}
          </span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">
            {minPriceStr} – {maxPriceStr}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onSelect(variant)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-indigo-500 transition shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 group-hover:scale-[1.01] cursor-pointer"
        >
          <span>{isRu ? 'Выбрать и открыть в 2D/3D' : 'Tanlash va 2D/3D-da ochish'}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
