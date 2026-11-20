'use client';

import React, { useState } from 'react';
import { RoomEstimate } from '@/lib/estimator';
import { Currency, Language } from '@/store/usePreferencesStore';
import { formatPrice } from '@/lib/currency';
import { getTranslation, materialNames, furnitureNames } from '@/lib/i18n';
import {
  Maximize2,
  Layers,
  Sparkles,
  Armchair,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RoomBreakdownCardProps {
  room: RoomEstimate;
  currency: Currency;
  language: Language;
  usdToUzsRate: number;
}

export const RoomBreakdownCard: React.FC<RoomBreakdownCardProps> = ({
  room,
  currency,
  language,
  usdToUzsRate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const unitRollStr = getTranslation(language, 'unitRoll');
  const unitLiterStr = getTranslation(language, 'unitLiter');

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-base shadow-xs">
            {room.roomName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {room.roomName}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium">
                {room.floorArea.toFixed(1)} m²
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
              <span>{getTranslation(language, 'roomGrossWall')}: {room.grossWallArea.toFixed(1)} m²</span>
              <span>•</span>
              <span>{getTranslation(language, 'roomOpenings')}: -{room.openingsArea.toFixed(1)} m²</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {getTranslation(language, 'roomNetWall')}: {room.netWallArea.toFixed(1)} m²
              </span>
            </p>
          </div>
        </div>

        {/* Room Financial Subtotals & Collapse Trigger */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
              {getTranslation(language, 'roomTotalCost')}
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPrice(room.subtotal, currency, language, usdToUzsRate)}
            </span>
          </div>

          <button
            type="button"
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
            aria-label="Toggle details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mini KPI Pill Bar */}
      <div className="grid grid-cols-2 border-t border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/20 px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span className="text-slate-400">{getTranslation(language, 'roomMaterialsCost')}:</span>
          <span className="font-semibold font-mono">
            {formatPrice(room.materialsSubtotal, currency, language, usdToUzsRate)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Armchair className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-slate-400">{getTranslation(language, 'roomFurnitureCost')}:</span>
          <span className="font-semibold font-mono">
            {formatPrice(room.furnitureSubtotal, currency, language, usdToUzsRate)}
          </span>
        </div>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* 1. Wall Finishes Table */}
          {room.wallFinishItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                <span>{getTranslation(language, 'table1Title')}</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">{getTranslation(language, 'colMaterial')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colNetArea')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colWithReserve')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colRequiredUnits')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colUnitPrice')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colSubtotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {room.wallFinishItems.map((item, idx) => {
                      const name = materialNames[item.materialId]?.[language] || item.materialName;
                      const unitStr = item.unit === 'roll' ? unitRollStr : unitLiterStr;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-slate-300 dark:border-slate-700 inline-block shrink-0"
                              style={{ backgroundColor: item.swatchColor }}
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {name}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.netArea.toFixed(1)} m²
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.reserveArea.toFixed(1)} m²
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {item.requiredUnits} {unitStr}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatPrice(item.totalPrice, currency, language, usdToUzsRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Surface Finishes (Floor & Ceiling) Table */}
          {room.surfaceFinishItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{getTranslation(language, 'table2Title')}</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">{getTranslation(language, 'colSurface')}</th>
                      <th className="py-2 px-3">{getTranslation(language, 'colMaterial')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colNetArea')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colWithReserve')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colUnitPrice')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colSubtotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {room.surfaceFinishItems.map((item, idx) => {
                      const name = materialNames[item.materialId]?.[language] || item.materialName;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                            {item.type === 'flooring'
                              ? language === 'uz' ? 'Pol' : 'Пол'
                              : language === 'uz' ? 'Shift' : 'Потолок'}
                          </td>
                          <td className="py-2 px-3 flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-slate-300 dark:border-slate-700 inline-block shrink-0"
                              style={{ backgroundColor: item.swatchColor }}
                            />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {name}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.netArea.toFixed(1)} m²
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.reserveArea.toFixed(1)} m²
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}/m²
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatPrice(item.totalPrice, currency, language, usdToUzsRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Furniture in this Room */}
          {room.furnitureItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Armchair className="w-3.5 h-3.5 text-amber-500" />
                <span>{getTranslation(language, 'table3Title')}</span>
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">{getTranslation(language, 'colItemName')}</th>
                      <th className="py-2 px-3">{getTranslation(language, 'colCategory')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colQuantity')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colUnitPrice')}</th>
                      <th className="py-2 px-3 text-right">{getTranslation(language, 'colSubtotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {room.furnitureItems.map((item, idx) => {
                      const name = furnitureNames[item.catalogId]?.[language] || item.name;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {name}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px] capitalize">
                            {item.category}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {item.quantity} {getTranslation(language, 'unitPcs')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatPrice(item.totalPrice, currency, language, usdToUzsRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
