'use client';

import React, { useMemo, useState } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { computeFloorplanEstimate } from '@/lib/estimator';
import { exportEstimateToCsv, printEstimateReport } from '@/lib/exportQuote';
import {
  FileSpreadsheet,
  Printer,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Layers,
  Box,
  Sparkles,
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
    setCustomMaterialPrice,
    setCustomFurniturePrice,
    resetPriceOverrides,
    setCurrentMode,
  } = useFloorplanStore();

  const [showWallAudit, setShowWallAudit] = useState(false);
  const [projectName, setProjectName] = useState('My Dream Residence');

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

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-y-auto print:bg-white print:text-black">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 print:static print:bg-transparent print:border-b-2 print:border-slate-300">
        <div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="text-lg font-bold bg-transparent border-b border-dashed border-slate-700 hover:border-cyan-500 focus:border-cyan-400 focus:outline-hidden text-white px-1 py-0.5 tracking-tight transition"
              title="Click to rename project quote"
            />
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live BOM
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
            Calculated from 1:1 metric parametric floorplan & 3D finishes ({walls.length} walls, {openings.length} openings, {furniture.length} interior items)
          </p>
        </div>

        {/* Global Controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {/* Waste / Reserve Factor */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Waste / Reserve:
            </span>
            <div className="flex items-center gap-1">
              {[0.05, 0.1, 0.15].map((factor) => (
                <button
                  key={factor}
                  onClick={() => setWasteFactor(factor)}
                  className={`text-xs px-2 py-0.5 rounded font-semibold transition ${
                    Math.abs(wasteFactor - factor) < 0.001
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {Math.round(factor * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Labor Toggle */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={includeLabor}
                onChange={(e) => setIncludeLabor(e.target.checked)}
                className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
              />
              <span>Labor</span>
            </label>
            {includeLabor && (
              <div className="flex items-center gap-1 text-xs border-l border-slate-800 pl-2">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={laborRatePerSqm}
                  onChange={(e) => setLaborRatePerSqm(Number(e.target.value) || 0)}
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-mono text-cyan-300 focus:outline-hidden focus:border-cyan-400"
                  title="Labor rate per square meter of floor"
                />
                <span className="text-slate-500 text-[10px]">/m²</span>
              </div>
            )}
          </div>

          {/* Return to 3D Design */}
          <button
            onClick={() => setCurrentMode('3d')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
            title="Return to Step 3: 3D Interior & Materials Studio"
          >
            <Box className="w-3.5 h-3.5" />
            <span>← 3D Studio</span>
          </button>

          {/* Reset Overrides */}
          {hasPriceOverrides && (
            <button
              onClick={resetPriceOverrides}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition"
              title="Reset all custom price edits to default catalog pricing"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Prices</span>
            </button>
          )}

          {/* Export CSV / Excel */}
          <button
            onClick={() => exportEstimateToCsv(estimate, projectName)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-700/20"
            title="Download Excel / Numbers compatible CSV with UTF-8 BOM"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={printEstimateReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm shadow-cyan-700/20"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Quote</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* Printable Letterhead Header (visible only on print) */}
        <div className="hidden print:block mb-6 border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">ARCHSTUDIO 3D</h1>
              <p className="text-sm font-semibold text-slate-600">Smart Construction & Interior Estimate (BOM)</p>
              <p className="text-xs text-slate-500 mt-1">Project: {projectName}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Reserve Factor: {Math.round(wasteFactor * 100)}%</p>
              <p>Ceiling Height: {ceilingHeight.toFixed(2)}m</p>
            </div>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Floor Area */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between text-slate-400 print:text-slate-600">
              <span className="text-xs font-medium">Floor Area</span>
              <Maximize2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-white print:text-black">
                {estimate.totalFloorArea.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 ml-1">m²</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Interior footprint</p>
          </div>

          {/* Card 2: Net Wall Area */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between text-slate-400 print:text-slate-600">
              <span className="text-xs font-medium">Net Wall Area</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-white print:text-black">
                {estimate.totalNetWallArea.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 ml-1">m²</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              -{estimate.totalOpeningsArea.toFixed(1)}m² cutouts removed
            </p>
          </div>

          {/* Card 3: Finishing Materials */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between text-slate-400 print:text-slate-600">
              <span className="text-xs font-medium">Finishes Cost</span>
              <Paintbrush className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-white print:text-black">
                ${estimate.finishingMaterialsSubtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Walls, floors & ceilings</p>
          </div>

          {/* Card 4: Furniture & Decor */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between print:border-slate-300 print:bg-slate-50">
            <div className="flex items-center justify-between text-slate-400 print:text-slate-600">
              <span className="text-xs font-medium">Furniture & Decor</span>
              <Armchair className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-white print:text-black">
                ${estimate.furnitureSubtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{furniture.length} placed pieces</p>
          </div>

          {/* Card 5: Grand Total */}
          <div className="col-span-2 md:col-span-1 bg-linear-to-br from-cyan-950/40 via-slate-900/80 to-blue-950/40 border border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-cyan-950/20 print:border-slate-400 print:bg-slate-100">
            <div className="flex items-center justify-between text-cyan-400">
              <span className="text-xs font-bold uppercase tracking-wider">Grand Total</span>
              <DollarSign className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black tracking-tight text-cyan-300 print:text-slate-900">
                ${estimate.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <p className="text-[11px] text-cyan-400/80 print:text-slate-600 mt-1">All materials + labor</p>
          </div>
        </div>

        {/* Empty state notice if no walls drafted */}
        {walls.length === 0 && (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30">
            <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-slate-200">No Walls Drafted Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Start by drawing walls in the 2D Floorplan editor or load our pre-built demo plan to explore the live estimator.
            </p>
            <button
              onClick={() => setCurrentMode('2d')}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
            >
              Switch to 2D Floorplan
            </button>
          </div>
        )}

        {/* SECTION 1: Wall Finishes Table */}
        {estimate.wallFinishItems.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden print:border-slate-300 print:bg-white">
            <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center gap-2.5">
                <Paintbrush className="w-4 h-4 text-cyan-400 print:text-slate-700" />
                <h2 className="text-sm font-bold text-white print:text-black">
                  1. Wall Finishes (Wallpapers & Paints)
                </h2>
                <span className="text-[11px] text-slate-400 print:text-slate-600">
                  Dual-sided wall surfaces with door/window cutouts subtracted
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-300 print:text-black">
                Subtotal: $
                {estimate.wallFinishItems
                  .reduce((sum, i) => sum + i.totalPrice, 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 print:border-slate-300 print:bg-slate-50 print:text-slate-700 font-semibold">
                    <th className="py-2.5 px-4">Finish Material</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Net Area</th>
                    <th className="py-2.5 px-3 text-right">With Reserve (+{Math.round(wasteFactor * 100)}%)</th>
                    <th className="py-2.5 px-3 text-right">Required Units</th>
                    <th className="py-2.5 px-3 text-right">Unit Price (USD)</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {estimate.wallFinishItems.map((item) => (
                    <tr key={item.materialId} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                      <td className="py-3 px-4 font-medium flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: item.swatchColor }}
                        />
                        <span className="text-slate-200 print:text-slate-900">{item.materialName}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            item.category === 'wallpaper'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300 print:text-slate-800">
                        {item.netArea.toFixed(1)} m²
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400 print:text-slate-700">
                        {item.reserveArea.toFixed(1)} m²
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-white print:text-slate-900">
                        <span className="font-mono text-cyan-300 print:text-slate-900">{item.requiredUnits}</span>{' '}
                        <span className="text-[11px] text-slate-400">{item.unit === 'roll' ? 'rolls' : 'L'}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-slate-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.unitPrice}
                            onChange={(e) =>
                              setCustomMaterialPrice(item.materialId, Number(e.target.value) || 0)
                            }
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-hidden focus:border-cyan-400 print:border-none print:bg-transparent print:text-slate-900"
                            title="Edit unit price (per roll or liter)"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white print:text-slate-900">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2 print:border-slate-300">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Standard European wallpaper rolls cover 10.6 m² (1.06m × 10m). Wall paint coverage calculated at 5.0 m²/L (standard 2-coat finish).
              </span>
            </div>
          </div>
        )}

        {/* SECTION 2: Flooring & Ceiling Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden print:border-slate-300 print:bg-white">
          <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 print:bg-slate-100 print:border-slate-300">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-blue-400 print:text-slate-700" />
              <h2 className="text-sm font-bold text-white print:text-black">
                2. Flooring & Ceiling Finishes
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-300 print:text-black">
              Subtotal: $
              {estimate.surfaceFinishItems
                .reduce((sum, i) => sum + i.totalPrice, 0)
                .toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 print:border-slate-300 print:bg-slate-50 print:text-slate-700 font-semibold">
                  <th className="py-2.5 px-4">Surface</th>
                  <th className="py-2.5 px-3">Selected Material</th>
                  <th className="py-2.5 px-3 text-right">Net Area</th>
                  <th className="py-2.5 px-3 text-right">With Reserve (+{Math.round(wasteFactor * 100)}%)</th>
                  <th className="py-2.5 px-3 text-right">Unit Price (USD/m²)</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {estimate.surfaceFinishItems.map((item) => (
                  <tr key={item.type} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                    <td className="py-3 px-4 font-medium">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 print:bg-slate-200 print:text-slate-800">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: item.swatchColor }}
                      />
                      <span className="text-slate-200 print:text-slate-900">{item.materialName}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300 print:text-slate-800">
                      {item.netArea.toFixed(1)} m²
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400 print:text-slate-700">
                      {item.reserveArea} m²
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-slate-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) =>
                            setCustomMaterialPrice(item.materialId, Number(e.target.value) || 0)
                          }
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-hidden focus:border-cyan-400 print:border-none print:bg-transparent print:text-slate-900"
                          title="Edit price per square meter"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white print:text-slate-900">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: Furniture & Curtains Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden print:border-slate-300 print:bg-white">
          <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80 print:bg-slate-100 print:border-slate-300">
            <div className="flex items-center gap-2.5">
              <Armchair className="w-4 h-4 text-indigo-400 print:text-slate-700" />
              <h2 className="text-sm font-bold text-white print:text-black">
                3. Furniture, Lighting & Curtains
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-300 print:text-black">
              Subtotal: ${estimate.furnitureSubtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          {estimate.furnitureItems.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No furniture placed yet. Switch to 3D View to place items from the catalog.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 print:border-slate-300 print:bg-slate-50 print:text-slate-700 font-semibold">
                    <th className="py-2.5 px-4">Item Name</th>
                    <th className="py-2.5 px-3">Room / Category</th>
                    <th className="py-2.5 px-3">Dimensions (W × H × D)</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price (USD)</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {estimate.furnitureItems.map((item) => (
                    <tr key={item.catalogId} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                      <td className="py-3 px-4 font-medium flex items-center gap-2.5">
                        {item.color && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <span className="text-slate-200 print:text-slate-900">{item.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 print:bg-slate-200 print:text-slate-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 print:text-slate-700">
                        {item.dimensions.width}m × {item.dimensions.height}m × {item.dimensions.depth}m
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-white print:text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-slate-500">$</span>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={item.unitPrice}
                            onChange={(e) =>
                              setCustomFurniturePrice(item.catalogId, Number(e.target.value) || 0)
                            }
                            className="w-20 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white focus:outline-hidden focus:border-cyan-400 print:border-none print:bg-transparent print:text-slate-900"
                            title="Edit unit price of furniture item"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white print:text-slate-900">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 4: Labor & Delivery Services */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 print:border-slate-300 print:bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Hammer className="w-4 h-4 text-emerald-400 print:text-slate-700" />
            <h2 className="text-sm font-bold text-white print:text-black">
              4. Labor, Installation & Delivery Services
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 print:bg-slate-50 print:border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 print:bg-slate-200 print:text-slate-700">
                  <Hammer className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 print:text-slate-900">
                    Finishing & Installation Labor
                  </h4>
                  <p className="text-[11px] text-slate-400 print:text-slate-600">
                    {includeLabor
                      ? `${estimate.totalFloorArea.toFixed(1)} m² @ $${laborRatePerSqm}/m²`
                      : 'Disabled by user'}
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-white print:text-slate-900">
                ${estimate.laborCost.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 print:bg-slate-50 print:border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 print:bg-slate-200 print:text-slate-700">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 print:text-slate-900">
                    Freight & White-Glove Delivery
                  </h4>
                  <p className="text-[11px] text-slate-400 print:text-slate-600">
                    {estimate.deliveryCost > 0
                      ? 'Consolidated delivery for placed furniture'
                      : 'No delivery fee required'}
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-white print:text-slate-900">
                ${estimate.deliveryCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: Collapsible Wall-by-Wall Cutout Audit Breakdown */}
        {estimate.wallAuditItems.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden print:hidden">
            <button
              onClick={() => setShowWallAudit((prev) => !prev)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/30 transition"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Wall-by-Wall Audit & Cutout Subtraction Breakdown ({estimate.wallAuditItems.length} walls)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>{showWallAudit ? 'Collapse' : 'Expand'}</span>
                {showWallAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showWallAudit && (
              <div className="p-4 border-t border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                      <th className="py-2 px-3">Wall ID</th>
                      <th className="py-2 px-3 text-right">Length (m)</th>
                      <th className="py-2 px-3 text-right">Gross Face Area</th>
                      <th className="py-2 px-3 text-right">Door/Window Cutouts</th>
                      <th className="py-2 px-3 text-right">Net Face Area</th>
                      <th className="py-2 px-3">Side A Finish (+Z)</th>
                      <th className="py-2 px-3">Side B Finish (-Z)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {estimate.wallAuditItems.map((wall) => (
                      <tr key={wall.wallId} className="hover:bg-slate-800/20">
                        <td className="py-2 px-3 text-slate-300">{wall.wallId}</td>
                        <td className="py-2 px-3 text-right text-slate-400">{wall.length.toFixed(2)}m</td>
                        <td className="py-2 px-3 text-right text-slate-400">{wall.grossArea.toFixed(2)} m²</td>
                        <td className="py-2 px-3 text-right text-rose-400">
                          {wall.openingsArea > 0 ? `-${wall.openingsArea.toFixed(2)} m²` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-white">{wall.netArea.toFixed(2)} m²</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{wall.materialLeftName}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{wall.materialRightName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Executive Grand Total Summary Footer */}
        <div className="p-6 rounded-xl bg-linear-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 print:border-slate-300 print:bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-white print:text-black">
              Official Material Quote & Estimate Summary
            </h3>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              Prices reflect current user overrides and configured {Math.round(wasteFactor * 100)}% construction reserve.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Estimated Project Total
              </span>
              <div className="text-3xl font-black text-cyan-400 print:text-slate-900 tracking-tight">
                ${estimate.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => exportEstimateToCsv(estimate, projectName)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={printEstimateReport}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-md shadow-cyan-700/20"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
