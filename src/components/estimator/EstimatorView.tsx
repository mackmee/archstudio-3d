'use client';

import React, { useMemo, useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { computeFloorplanEstimate } from '@/lib/estimator';
import { exportEstimateToCsv, printEstimateReport } from '@/lib/exportQuote';
import { formatPrice } from '@/lib/currency';
import { getTranslation, materialNames, furnitureNames } from '@/lib/i18n';
import {
  FileSpreadsheet,
  Printer,
  RotateCcw,
  ShieldAlert,
  Layers,
  Box,
  Hammer,
  Truck,
  Armchair,
  Paintbrush,
  Maximize2,
  DollarSign,
  Info,
} from 'lucide-react';

export const EstimatorView: React.FC = () => {
  const {
    walls,
    openings,
    ceilingHeight,
    floorMaterialId,
    ceilingMaterialId,
    furniture,
    wasteFactor,
    includeLabor,
    laborRatePerSqm,
    customMaterialPrices,
    customFurniturePrices,
    setWasteFactor,
    setIncludeLabor,
    setLaborRatePerSqm,
    resetPriceOverrides,
    setCurrentMode,
  } = useFloorplanStore();

  const { language, currency, usdToUzsRate } = usePreferencesStore();

  const [projectName, setProjectName] = useState(getTranslation(language, 'defaultProjectName'));

  // Compute live estimate summary from store state
  const estimate = useMemo(() => {
    return computeFloorplanEstimate({
      walls,
      openings,
      ceilingHeight,
      floorMaterialId,
      ceilingMaterialId,
      furniture,
      wasteFactor,
      includeLabor,
      laborRatePerSqm,
      customMaterialPrices,
      customFurniturePrices,
    });
  }, [
    walls,
    openings,
    ceilingHeight,
    floorMaterialId,
    ceilingMaterialId,
    furniture,
    wasteFactor,
    includeLabor,
    laborRatePerSqm,
    customMaterialPrices,
    customFurniturePrices,
  ]);

  const hasPriceOverrides =
    Object.keys(customMaterialPrices).length > 0 ||
    Object.keys(customFurniturePrices).length > 0;

  const unitRollStr = getTranslation(language, 'unitRoll');
  const unitLiterStr = getTranslation(language, 'unitLiter');

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto print:bg-white print:text-black transition-colors duration-200">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 print:static print:bg-transparent print:border-b-2 print:border-slate-300">
        <div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-lg font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 focus:border-cyan-500 focus:outline-hidden text-slate-900 dark:text-white px-1 py-0.5 tracking-tight transition"
              title="Click to rename project quote"
            />
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {getTranslation(language, 'liveBomBadge')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 print:text-slate-600">
            {getTranslation(language, 'estimatorSubtitle')} ({walls.length} {language === 'uz' ? 'devor' : 'стен'}, {openings.length} {language === 'uz' ? 'o‘yma' : 'проемов'}, {furniture.length} {language === 'uz' ? 'jihoz' : 'предметов'})
          </p>
        </div>

        {/* Global Controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Waste / Reserve Factor */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              {getTranslation(language, 'wasteReserve')}
            </span>
            <div className="flex items-center gap-1">
              {[0.05, 0.1, 0.15].map((factor) => (
                <button
                  key={factor}
                  onClick={() => setWasteFactor(factor)}
                  className={`text-xs px-2 py-0.5 rounded font-semibold transition ${
                    Math.abs(wasteFactor - factor) < 0.001
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {Math.round(factor * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Labor Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeLabor}
                onChange={(e) => setIncludeLabor(e.target.checked)}
                className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
              />
              <span>{language === 'uz' ? 'Usta haqi' : 'Работа'}</span>
            </label>
            {includeLabor && (
              <div className="flex items-center gap-1 text-xs border-l border-slate-300 dark:border-slate-800 pl-2">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={laborRatePerSqm}
                  onChange={(e) => setLaborRatePerSqm(Number(e.target.value) || 0)}
                  className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-cyan-600 dark:text-cyan-300 focus:outline-hidden focus:border-cyan-500"
                  title="Labor rate per square meter"
                />
                <span className="text-slate-500 text-[10px]">/m²</span>
              </div>
            )}
          </div>

          {/* Return to 3D Design */}
          <button
            onClick={() => setCurrentMode('3d')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 transition shadow-xs"
            title="Step 3: 3D Studio"
          >
            <Box className="w-3.5 h-3.5" />
            <span>← {getTranslation(language, 'step3Short')}</span>
          </button>

          {/* Reset Overrides */}
          {hasPriceOverrides && (
            <button
              onClick={resetPriceOverrides}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition"
              title="Reset Prices"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'resetPriceOverrides')}</span>
            </button>
          )}

          {/* Export CSV / Excel */}
          <button
            onClick={() => exportEstimateToCsv(estimate, projectName, currency, language, usdToUzsRate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-700/20"
            title={getTranslation(language, 'exportCsv')}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{language === 'uz' ? 'CSV Yuklash' : 'Экспорт CSV'}</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={printEstimateReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm shadow-cyan-700/20"
            title={getTranslation(language, 'printQuote')}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'uz' ? 'Chop etish' : 'Печать'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* Printable Letterhead Header */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">ARCHSTUDIO 3D</h1>
              <p className="text-sm font-semibold text-slate-600">{getTranslation(language, 'officialQuoteSummary')}</p>
              <p className="text-xs text-slate-500 mt-1">{projectName}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{new Date().toLocaleDateString()}</p>
              <p>{getTranslation(language, 'wasteReserve')} {Math.round(wasteFactor * 100)}%</p>
              <p>{ceilingHeight.toFixed(2)}m</p>
            </div>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Floor Area */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">{getTranslation(language, 'kpiFloorArea')}</span>
              <Maximize2 className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {estimate.totalFloorArea.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 ml-1">m²</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{language === 'uz' ? 'Ichki pol sathi' : 'Площадь по полу'}</p>
          </div>

          {/* Card 2: Net Wall Area */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">{getTranslation(language, 'kpiNetWallArea')}</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {estimate.totalNetWallArea.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 ml-1">m²</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              -{estimate.totalOpeningsArea.toFixed(1)}m² {getTranslation(language, 'cutoutsDeducted')}
            </p>
          </div>

          {/* Card 3: Finishing Materials */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">{getTranslation(language, 'kpiFinishesCost')}</span>
              <Paintbrush className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {formatPrice(estimate.finishingMaterialsSubtotal, currency, language, usdToUzsRate)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{language === 'uz' ? 'Devor, pol va shift' : 'Стены, пол и потолок'}</p>
          </div>

          {/* Card 4: Furniture & Decor */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">{getTranslation(language, 'kpiFurnitureCost')}</span>
              <Armchair className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2">
              <span className="text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {formatPrice(estimate.furnitureSubtotal, currency, language, usdToUzsRate)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{furniture.length} {getTranslation(language, 'unitPcs')}</p>
          </div>

          {/* Card 5: Grand Total */}
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-cyan-500/10 via-white dark:via-slate-900/80 to-blue-500/10 border border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
              <span className="text-xs font-bold uppercase tracking-wider">{getTranslation(language, 'kpiGrandTotal')}</span>
              <DollarSign className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="mt-2">
              <span className="text-lg lg:text-xl font-black tracking-tight text-cyan-700 dark:text-cyan-300">
                {formatPrice(estimate.grandTotal, currency, language, usdToUzsRate)}
              </span>
            </div>
            <p className="text-[11px] text-cyan-600/80 dark:text-cyan-400/80 mt-1">{language === 'uz' ? 'Barcha xarajatlar' : 'Все материалы + работы'}</p>
          </div>
        </div>

        {/* SECTION 1: Wall Finishes Table */}
        {estimate.wallFinishItems.length > 0 && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <Paintbrush className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {getTranslation(language, 'table1Title')}
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                {language === 'uz' ? 'Jami' : 'Сумма'}:{' '}
                {formatPrice(
                  estimate.wallFinishItems.reduce((sum, i) => sum + i.totalPrice, 0),
                  currency,
                  language,
                  usdToUzsRate
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">{getTranslation(language, 'colMaterial')}</th>
                    <th className="py-2.5 px-3">{getTranslation(language, 'colCategory')}</th>
                    <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colNetArea')}</th>
                    <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colWithReserve')}</th>
                    <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colRequiredUnits')}</th>
                    <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colUnitPrice')}</th>
                    <th className="py-2.5 px-4 text-right">{getTranslation(language, 'colSubtotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {estimate.wallFinishItems.map((item) => {
                    const name = materialNames[item.materialId]?.[language] || item.materialName;
                    const unitStr = item.unit === 'roll' ? unitRollStr : unitLiterStr;

                    return (
                      <tr key={item.materialId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-medium flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/20 shrink-0"
                            style={{ backgroundColor: item.swatchColor }}
                          />
                          <span className="text-slate-900 dark:text-slate-200">{name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              item.category === 'wallpaper'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {item.category === 'wallpaper' ? (language === 'uz' ? 'Gulqog‘oz' : 'Обои') : (language === 'uz' ? 'Bo‘yoq' : 'Краска')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {item.netArea.toFixed(1)} m²
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                          {item.reserveArea.toFixed(1)} m²
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono text-cyan-600 dark:text-cyan-300">{item.requiredUnits}</span>{' '}
                          <span className="text-[11px] text-slate-500">{unitStr}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatPrice(item.totalPrice, currency, language, usdToUzsRate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {language === 'uz'
                  ? 'Yevropa standart gulqog‘oz ruloni: 10.6 m² (1.06m × 10m). Devor bo‘yog‘i: 5.0 m²/litr (2 qavat surtish hisobida).'
                  : 'Евро-рулон обоев: 10.6 м² (1.06м × 10м). Расход краски: 5.0 м²/литр (в 2 слоя).'}
              </span>
            </div>
          </div>
        )}

        {/* SECTION 2: Flooring & Ceiling Table */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {getTranslation(language, 'table2Title')}
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              {language === 'uz' ? 'Jami' : 'Сумма'}:{' '}
              {formatPrice(
                estimate.surfaceFinishItems.reduce((sum, i) => sum + i.totalPrice, 0),
                currency,
                language,
                usdToUzsRate
              )}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-4">{getTranslation(language, 'colSurface')}</th>
                  <th className="py-2.5 px-3">{getTranslation(language, 'colMaterial')}</th>
                  <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colNetArea')}</th>
                  <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colWithReserve')}</th>
                  <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colUnitPrice')}</th>
                  <th className="py-2.5 px-4 text-right">{getTranslation(language, 'colSubtotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {estimate.surfaceFinishItems.map((item) => {
                  const name = materialNames[item.materialId]?.[language] || item.materialName;

                  return (
                    <tr key={item.type} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-medium">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.type === 'flooring' ? (language === 'uz' ? 'Pol' : 'Пол') : (language === 'uz' ? 'Shift' : 'Потолок')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/20 shrink-0"
                          style={{ backgroundColor: item.swatchColor }}
                        />
                        <span className="text-slate-900 dark:text-slate-200">{name}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {item.netArea.toFixed(1)} m²
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {item.reserveArea} m²
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatPrice(item.unitPrice, currency, language, usdToUzsRate)} / m²
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatPrice(item.totalPrice, currency, language, usdToUzsRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: Furniture & Curtains Table */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <Armchair className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {getTranslation(language, 'table3Title')}
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              {language === 'uz' ? 'Jami' : 'Сумма'}:{' '}
              {formatPrice(estimate.furnitureSubtotal, currency, language, usdToUzsRate)}
            </span>
          </div>

          {estimate.furnitureItems.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              {language === 'uz' ? 'Hozircha mebel qo‘yilmagan. 3D ko‘rinishga o‘tib, katalogdan mebel qo‘shing.' : 'Мебель еще не установлена. Перейдите в 3D Режим для выбора.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">{getTranslation(language, 'colItemName')}</th>
                    <th className="py-2.5 px-3">{getTranslation(language, 'colCategory')}</th>
                    <th className="py-2.5 px-3">{getTranslation(language, 'colDimensions')}</th>
                    <th className="py-2.5 px-3 text-center">{getTranslation(language, 'colQuantity')}</th>
                    <th className="py-2.5 px-3 text-right">{getTranslation(language, 'colUnitPrice')}</th>
                    <th className="py-2.5 px-4 text-right">{getTranslation(language, 'colSubtotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {estimate.furnitureItems.map((item) => {
                    const name = furnitureNames[item.catalogId]?.[language] || item.name;

                    return (
                      <tr key={item.catalogId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-medium flex items-center gap-2.5">
                          {item.color && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/20 shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <span className="text-slate-900 dark:text-slate-200">{name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                          {item.dimensions.width}m × {item.dimensions.height}m × {item.dimensions.depth}m
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatPrice(item.totalPrice, currency, language, usdToUzsRate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 4: Labor & Delivery Services */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Hammer className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {getTranslation(language, 'table4Title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Hammer className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {getTranslation(language, 'laborServiceTitle')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {includeLabor
                      ? `${estimate.totalFloorArea.toFixed(1)} m² @ $${laborRatePerSqm}/m²`
                      : language === 'uz' ? 'O‘chirilgan' : 'Отключено'}
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {formatPrice(estimate.laborCost, currency, language, usdToUzsRate)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {getTranslation(language, 'deliveryServiceTitle')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {estimate.deliveryCost > 0
                      ? language === 'uz' ? 'Mebellar uchun yagona yetkazish' : 'Доставка всех позиций мебели'
                      : language === 'uz' ? 'Talab etilmaydi' : 'Не требуется'}
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {formatPrice(estimate.deliveryCost, currency, language, usdToUzsRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Grand Total Summary Footer */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {getTranslation(language, 'officialQuoteSummary')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {getTranslation(language, 'officialQuoteNote')}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                {getTranslation(language, 'kpiGrandTotal')}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight">
                {formatPrice(estimate.grandTotal, currency, language, usdToUzsRate)}
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => exportEstimateToCsv(estimate, projectName, currency, language, usdToUzsRate)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={printEstimateReport}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-700/20"
              >
                <Printer className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
