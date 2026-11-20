'use client';

import React, { useMemo, useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { computeFloorplanEstimate } from '@/lib/estimator';
import { exportEstimateToCsv, printEstimateReport } from '@/lib/exportQuote';
import { formatPrice, convertToUsd } from '@/lib/currency';
import { getTranslation, materialNames, furnitureNames } from '@/lib/i18n';
import { RoomBreakdownCard } from './RoomBreakdownCard';
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
  Check,
  Sparkles,
  Grid,
  Building,
} from 'lucide-react';

export const EstimatorView: React.FC = () => {
  const {
    walls,
    openings,
    ceilingHeight,
    floorMaterialId,
    ceilingMaterialId,
    furniture,
    rooms,
    wasteFactor,
    includeLabor,
    laborRatePerSqm,
    includeDelivery,
    deliveryFee,
    customMaterialPrices,
    customFurniturePrices,
    setWasteFactor,
    setIncludeLabor,
    setLaborRatePerSqm,
    setIncludeDelivery,
    setDeliveryFee,
    setCustomMaterialPrice,
    setCustomFurniturePrice,
    applyUzbekistanMarketPreset,
    resetPriceOverrides,
    setCurrentMode,
  } = useFloorplanStore();

  const { language, currency, usdToUzsRate } = usePreferencesStore();

  const [projectName, setProjectName] = useState(getTranslation(language, 'defaultProjectName'));
  const [activeTab, setActiveTab] = useState<'summary' | 'rooms'>('summary');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [presetToast, setPresetToast] = useState<string | null>(null);

  // Inline editing state for prices
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  // Compute live estimate summary from store state
  const estimate = useMemo(() => {
    return computeFloorplanEstimate({
      walls,
      openings,
      ceilingHeight,
      floorMaterialId,
      ceilingMaterialId,
      furniture,
      rooms,
      wasteFactor,
      includeLabor,
      laborRatePerSqm,
      includeDelivery,
      deliveryFee,
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
    rooms,
    wasteFactor,
    includeLabor,
    laborRatePerSqm,
    includeDelivery,
    deliveryFee,
    customMaterialPrices,
    customFurniturePrices,
  ]);

  const hasPriceOverrides =
    Object.keys(customMaterialPrices).length > 0 ||
    Object.keys(customFurniturePrices).length > 0;

  const unitRollStr = getTranslation(language, 'unitRoll');
  const unitLiterStr = getTranslation(language, 'unitLiter');

  // Handle Preset Application
  const handleApplyPreset = (preset: 'standard' | 'premium') => {
    applyUzbekistanMarketPreset(preset);
    const msg = getTranslation(language, 'presetAppliedToast');
    setPresetToast(msg);
    setTimeout(() => setPresetToast(null), 3000);
  };

  // Handle Inline Price Save
  const handleSavePrice = (id: string, isFurniture = false) => {
    const num = parseFloat(editingPriceValue.replace(/\s+/g, ''));
    if (!isNaN(num) && num >= 0) {
      const storedUsd = convertToUsd(num, currency, usdToUzsRate);
      if (isFurniture) {
        setCustomFurniturePrice(id, storedUsd);
      } else {
        setCustomMaterialPrice(id, storedUsd);
      }
    }
    setEditingPriceKey(null);
  };

  // Filtered rooms for Room-by-Room tab
  const filteredRooms = useMemo(() => {
    if (selectedRoomFilter === 'all') return estimate.roomEstimates;
    return estimate.roomEstimates.filter((r) => r.roomId === selectedRoomFilter);
  }, [estimate.roomEstimates, selectedRoomFilter]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto print:bg-white print:text-black transition-colors duration-200">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 print:static print:bg-transparent print:border-b-2 print:border-slate-300">
        <div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-base sm:text-lg font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 focus:border-cyan-500 focus:outline-hidden text-slate-900 dark:text-white px-1 py-0.5 tracking-tight transition"
              title="Click to rename project quote"
            />
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {getTranslation(language, 'liveBomBadge')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 print:text-slate-600">
            {getTranslation(language, 'estimatorSubtitle')} ({walls.length} {language === 'uz' ? 'devor' : 'стен'}, {rooms.length} {language === 'uz' ? 'xona' : 'комнат'}, {furniture.length} {language === 'uz' ? 'jihoz' : 'предметов'})
          </p>
        </div>

        {/* Global Controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* Return to 3D Design */}
          <button
            onClick={() => setCurrentMode('3d')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 transition shadow-xs"
            title="Step 3: 3D Studio"
          >
            <Box className="w-3.5 h-3.5" />
            <span>← {getTranslation(language, 'step3Short')}</span>
          </button>

          {/* Reset Overrides */}
          {hasPriceOverrides && (
            <button
              onClick={resetPriceOverrides}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition"
              title="Reset Prices"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'resetPriceOverrides')}</span>
            </button>
          )}

          {/* Export CSV / Excel */}
          <button
            onClick={() => exportEstimateToCsv(estimate, projectName, currency, language, usdToUzsRate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-700/20"
            title={getTranslation(language, 'exportCsv')}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{language === 'uz' ? 'CSV Yuklash' : 'Экспорт CSV'}</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={printEstimateReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm shadow-cyan-700/20"
            title={getTranslation(language, 'printQuote')}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'uz' ? 'Chop etish (PDF)' : 'Печать (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Preset Toast Notification */}
      {presetToast && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{presetToast}</span>
        </div>
      )}

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
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
              <p>{getTranslation(language, 'wasteReserve')}: {Math.round(wasteFactor * 100)}%</p>
              <p>{ceilingHeight.toFixed(2)}m</p>
            </div>
          </div>
        </div>

        {/* TOP CONTROLS & MARKET PRESETS BAR */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
          {/* View Switcher Tabs: Summary BOM vs Room-by-Room */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'summary'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'tabSummaryBom')}</span>
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'rooms'
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>{getTranslation(language, 'tabRoomBreakdown')}</span>
              {estimate.roomEstimates.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 font-mono">
                  {estimate.roomEstimates.length}
                </span>
              )}
            </button>
          </div>

          {/* Uzbekistan Market Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {getTranslation(language, 'marketPresetsTitle')}:
            </span>
            <button
              onClick={() => handleApplyPreset('standard')}
              className="py-1 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
              title={getTranslation(language, 'presetStandardDesc')}
            >
              <span>{getTranslation(language, 'presetStandardBtn')}</span>
            </button>
            <button
              onClick={() => handleApplyPreset('premium')}
              className="py-1 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-medium transition flex items-center gap-1.5"
              title={getTranslation(language, 'presetPremiumDesc')}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{getTranslation(language, 'presetPremiumBtn')}</span>
            </button>
          </div>

          {/* Construction Settings: Waste Factor, Labor & Delivery */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Waste Factor Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                {getTranslation(language, 'wasteReserve')}:
              </span>
              {[0.05, 0.1, 0.15, 0.2].map((f) => (
                <button
                  key={f}
                  onClick={() => setWasteFactor(f)}
                  className={`px-1.5 py-0.5 rounded font-mono font-semibold transition ${
                    Math.abs(wasteFactor - f) < 0.001
                      ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {Math.round(f * 100)}%
                </button>
              ))}
            </div>

            {/* Labor Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeLabor}
                  onChange={(e) => setIncludeLabor(e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-500 rounded"
                />
                <span>{language === 'uz' ? 'Usta xaqi' : 'Мастера'}</span>
              </label>
              {includeLabor && (
                <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-800 pl-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      currency === 'UZS'
                        ? Math.round(laborRatePerSqm * usdToUzsRate)
                        : laborRatePerSqm
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setLaborRatePerSqm(convertToUsd(val, currency, usdToUzsRate));
                    }}
                    className="w-18 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 text-center text-xs font-mono text-cyan-600 dark:text-cyan-300 focus:outline-hidden"
                    title={getTranslation(language, 'laborRateLabel')}
                  />
                  <span className="text-[10px] text-slate-500">/m²</span>
                </div>
              )}
            </div>

            {/* Delivery Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeDelivery}
                  onChange={(e) => setIncludeDelivery(e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-500 rounded"
                />
                <span>{language === 'uz' ? 'Yetkazish' : 'Доставка'}</span>
              </label>
              {includeDelivery && (
                <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-800 pl-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      currency === 'UZS'
                        ? Math.round(deliveryFee * usdToUzsRate)
                        : deliveryFee
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDeliveryFee(convertToUsd(val, currency, usdToUzsRate));
                    }}
                    className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 text-center text-xs font-mono text-amber-600 dark:text-amber-300 focus:outline-hidden"
                    title={getTranslation(language, 'deliveryFeeLabel')}
                  />
                </div>
              )}
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

        {/* ============================================================ */}
        {/* VIEW TAB 1: ROOM-BY-ROOM BREAKDOWN */}
        {/* ============================================================ */}
        {activeTab === 'rooms' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Room Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                onClick={() => setSelectedRoomFilter('all')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition ${
                  selectedRoomFilter === 'all'
                    ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {getTranslation(language, 'allRoomsFilter')} ({estimate.roomEstimates.length})
              </button>

              {estimate.roomEstimates.map((re) => (
                <button
                  key={re.roomId}
                  onClick={() => setSelectedRoomFilter(re.roomId)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedRoomFilter === re.roomId
                      ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{re.roomName}</span>
                  <span className="text-[11px] opacity-80 font-mono">
                    ({formatPrice(re.subtotal, currency, language, usdToUzsRate)})
                  </span>
                </button>
              ))}
            </div>

            {/* Room Cards List */}
            {filteredRooms.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                {getTranslation(language, 'noRoomsPrompt')}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRooms.map((room) => (
                  <RoomBreakdownCard
                    key={room.roomId}
                    room={room}
                    currency={currency}
                    language={language}
                    usdToUzsRate={usdToUzsRate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW TAB 2: SUMMARY BILL OF MATERIALS (BOM) */}
        {/* ============================================================ */}
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* SECTION 1: Wall Finishes Table */}
            {estimate.wallFinishItems.length > 0 && (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
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
                        const isEditing = editingPriceKey === item.materialId;

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
                            <td className="py-3 px-3 text-right font-mono font-medium">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingPriceValue}
                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSavePrice(item.materialId);
                                      if (e.key === 'Escape') setEditingPriceKey(null);
                                    }}
                                    className="w-24 bg-white dark:bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-right font-mono text-xs text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={() => handleSavePrice(item.materialId)}
                                    className="px-1.5 py-0.5 rounded bg-cyan-500 text-white text-[10px]"
                                  >
                                    OK
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPriceKey(item.materialId);
                                    setEditingPriceValue(
                                      currency === 'UZS'
                                        ? Math.round(item.unitPrice * usdToUzsRate).toString()
                                        : item.unitPrice.toString()
                                    );
                                  }}
                                  className="text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                                  title={getTranslation(language, 'editPricePrompt')}
                                >
                                  {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}
                                </button>
                              )}
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
                      ? 'Yevropa standart gulqog‘oz ruloni: 10.6 m² (1.06m × 10m). Devor bo‘yog‘i: 5.0 m²/litr (2 qavat hisobida). Narx ustiga bosib tahrirlashingiz mumkin.'
                      : 'Евро-рулон обоев: 10.6 м² (1.06м × 10м). Расход краски: 5.0 м²/литр (в 2 слоя). Кликните по цене для изменения.'}
                  </span>
                </div>
              </div>
            )}

            {/* SECTION 2: Flooring & Ceiling Table */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
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
                      const isEditing = editingPriceKey === item.materialId;

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
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingPriceValue}
                                  onChange={(e) => setEditingPriceValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePrice(item.materialId);
                                    if (e.key === 'Escape') setEditingPriceKey(null);
                                  }}
                                  className="w-24 bg-white dark:bg-slate-955 border border-cyan-500 rounded px-1.5 py-0.5 text-right font-mono text-xs text-slate-900 dark:text-white"
                                />
                                <button
                                  onClick={() => handleSavePrice(item.materialId)}
                                  className="px-1.5 py-0.5 rounded bg-cyan-500 text-white text-[10px]"
                                >
                                  OK
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPriceKey(item.materialId);
                                  setEditingPriceValue(
                                    currency === 'UZS'
                                      ? Math.round(item.unitPrice * usdToUzsRate).toString()
                                      : item.unitPrice.toString()
                                  );
                                }}
                                className="text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                                title={getTranslation(language, 'editPricePrompt')}
                              >
                                {formatPrice(item.unitPrice, currency, language, usdToUzsRate)} / m²
                              </button>
                            )}
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
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
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
                        const isEditing = editingPriceKey === item.catalogId;

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
                            <td className="py-3 px-3 text-right font-mono font-medium">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editingPriceValue}
                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSavePrice(item.catalogId, true);
                                      if (e.key === 'Escape') setEditingPriceKey(null);
                                    }}
                                    className="w-24 bg-white dark:bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-right font-mono text-xs text-slate-900 dark:text-white"
                                  />
                                  <button
                                    onClick={() => handleSavePrice(item.catalogId, true)}
                                    className="px-1.5 py-0.5 rounded bg-cyan-500 text-white text-[10px]"
                                  >
                                    OK
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPriceKey(item.catalogId);
                                    setEditingPriceValue(
                                      currency === 'UZS'
                                        ? Math.round(item.unitPrice * usdToUzsRate).toString()
                                        : item.unitPrice.toString()
                                    );
                                  }}
                                  className="text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                                  title={getTranslation(language, 'editPricePrompt')}
                                >
                                  {formatPrice(item.unitPrice, currency, language, usdToUzsRate)}
                                </button>
                              )}
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
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
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
                          ? `${estimate.totalFloorArea.toFixed(1)} m² @ ${formatPrice(laborRatePerSqm, currency, language, usdToUzsRate)}/m²`
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
          </div>
        )}

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

        {/* Formal Signatures & Client Block */}
        <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              {getTranslation(language, 'signClient')}:
            </span>
            <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-1">
              <span className="text-slate-400 font-medium">{getTranslation(language, 'signSignature')}:</span>
              <span className="flex-1 text-slate-900 dark:text-white font-mono">____________________________</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">{getTranslation(language, 'signDate')}:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              {getTranslation(language, 'signContractor')}:
            </span>
            <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-1">
              <span className="text-slate-400 font-medium">{getTranslation(language, 'signSignature')}:</span>
              <span className="flex-1 text-slate-900 dark:text-white font-mono">____________________________</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">{getTranslation(language, 'signDate')}:</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
