'use client';

import React, { useState, useRef } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { getTranslation } from '@/lib/i18n';
import { AIScanPreviewModal, AIScanResultData } from '@/components/editor2d/AIScanPreviewModal';
import { compressBlueprintImage } from '@/lib/imageCompression';
import { generateHouseVariants, GeneratedFloorplanVariant } from '@/lib/floorplanGenerator';
import { HouseVariantsGalleryModal } from './HouseVariantsGalleryModal';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  ArrowRight,
  Home,
  CheckCircle2,
  Trash2,
  Ruler,
  Layers,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Building2,
  BedDouble,
  Bath,
  Utensils,
  Check,
} from 'lucide-react';

export const ProjectSetupView: React.FC = () => {
  const {
    projectName,
    targetAreaSqm,
    numRooms,
    ceilingHeight,
    backgroundImage,
    setProjectMetadata,
    setCeilingHeight,
    setBackgroundImage,
    loadSamplePlan,
    setCurrentMode,
  } = useFloorplanStore();

  const { language } = usePreferencesStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localTitle, setLocalTitle] = useState(projectName || getTranslation(language, 'defaultProjectName'));
  const [localCeiling, setLocalCeiling] = useState(ceilingHeight || 2.8);
  const [localArea, setLocalArea] = useState(targetAreaSqm || 84);
  const [localRooms, setLocalRooms] = useState(numRooms || 2);

  // Tab mode in left column: 'blueprint' (AI scan/upload) vs 'generator' (10 variants from scratch)
  const [activeTab, setActiveTab] = useState<'blueprint' | 'generator'>('blueprint');

  // Parametric House Generator state
  const [genWidth, setGenWidth] = useState(14);
  const [genDepth, setGenDepth] = useState(11);
  const [genBedrooms, setGenBedrooms] = useState(3);
  const [genBathrooms, setGenBathrooms] = useState(2);
  const [genKitchenType, setGenKitchenType] = useState<'separate' | 'studio'>('separate');

  // Optional spaces toggle chips
  const [genIncludeLiving, setGenIncludeLiving] = useState(true);
  const [genIncludeHallway, setGenIncludeHallway] = useState(true);
  const [genIncludeTerrace, setGenIncludeTerrace] = useState(false);
  const [genIncludeGarage, setGenIncludeGarage] = useState(false);
  const [genIncludeSummerKitchen, setGenIncludeSummerKitchen] = useState(false);
  const [genIncludeStorage, setGenIncludeStorage] = useState(false);
  const [genIncludeOffice, setGenIncludeOffice] = useState(false);

  // Variants modal state
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedFloorplanVariant[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // AI Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<AIScanResultData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Feasibility check
  const currentGenArea = Number((genWidth * genDepth).toFixed(1));
  const minRecommendedArea =
    (genIncludeLiving ? 24 : 0) +
    genBedrooms * 14 +
    genBathrooms * 5 +
    (genKitchenType === 'separate' ? 12 : 8) +
    (genIncludeHallway ? 8 : 0) +
    (genIncludeTerrace ? 12 : 0) +
    (genIncludeGarage ? 20 : 0);
  const isAreaTight = currentGenArea < minRecommendedArea * 0.88;

  const handleGenerateHouseVariants = () => {
    const variants = generateHouseVariants({
      width: genWidth,
      depth: genDepth,
      bedrooms: genBedrooms,
      bathrooms: genBathrooms,
      kitchenType: genKitchenType,
      includeLivingRoom: genIncludeLiving,
      includeHallway: genIncludeHallway,
      includeTerrace: genIncludeTerrace,
      includeGarage: genIncludeGarage,
      includeSummerKitchen: genIncludeSummerKitchen,
      includeStorage: genIncludeStorage,
      includeOffice: genIncludeOffice,
      language,
    });
    setGeneratedVariants(variants);
    setIsGalleryOpen(true);
  };

  const handleTriggerAiScan = async () => {
    if (!backgroundImage?.url) return;
    setIsScanning(true);
    setScanError(null);

    try {
      // Compress blueprint image to max 1600px to guarantee fast upload and preserve CAD line fidelity
      const compressed = await compressBlueprintImage(backgroundImage.url, 1600, 0.88);

      const response = await fetch('/api/ai/scan-floorplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressed.dataUrl,
          imageWidth: compressed.width,
          imageHeight: compressed.height,
          ceilingHeight: localCeiling,
          targetAreaSqm: localArea,
          language,
        }),
      });

      let resJson: { success?: boolean; error?: string; data?: AIScanResultData };
      try {
        resJson = await response.json();
      } catch {
        resJson = { error: 'Serverdan javob o‘qishda xatolik yuz berdi.' };
      }

      if (!response.ok || !resJson?.success || !resJson?.data) {
        setScanError(resJson?.error || getTranslation(language, 'aiScanError'));
        return;
      }

      setScanData(resJson.data);
      setIsPreviewOpen(true);
    } catch (err: unknown) {
      console.error('AI Scan Client Error:', err);
      const msg = err instanceof Error ? err.message : getTranslation(language, 'aiScanError');
      setScanError(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    try {
      const compressed = await compressBlueprintImage(file, 1600, 0.88);
      setBackgroundImage({
        url: compressed.dataUrl,
        opacity: 0.7,
        visible: true,
        width: compressed.width,
        height: compressed.height,
        x: 0,
        y: 0,
      });
    } catch (err) {
      console.error('Failed to process image file:', err);
      // Fallback to standard reader if canvas compression fails
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setBackgroundImage({
            url,
            opacity: 0.7,
            visible: true,
            width: img.width,
            height: img.height,
            x: 0,
            y: 0,
          });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleContinue = () => {
    setProjectMetadata({
      projectName: localTitle,
      targetAreaSqm: localArea,
      numRooms: localRooms,
    });
    setCeilingHeight(localCeiling);
    setCurrentMode('2d');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto px-6 py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Onboarding Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'step1Badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {getTranslation(language, 'welcomeTitle')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600">
              ArchStudio 3D
            </span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {getTranslation(language, 'welcomeSubtitle')}
          </p>
        </div>

        {/* Studio Setup Grid: Left (Blueprint Uploader / House Generator) | Right (Apartment Specs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Blueprint Upload or Parametric Generator */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              {/* Segmented Mode Selector Bar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('blueprint')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'blueprint'
                      ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>{getTranslation(language, 'tabUploadBlueprint')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('generator')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'generator'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{getTranslation(language, 'tabGenerateHouse')}</span>
                </button>
              </div>

              {/* TAB 1: BLUEPRINT UPLOAD & AI SCAN */}
              {activeTab === 'blueprint' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        <FileImage className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {getTranslation(language, 'blueprintTitle')}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {getTranslation(language, 'blueprintSubtitle')}
                        </p>
                      </div>
                    </div>

                    {backgroundImage && (
                      <button
                        onClick={() => setBackgroundImage(null)}
                        className="flex items-center gap-1 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{getTranslation(language, 'removeBlueprint')}</span>
                      </button>
                    )}
                  </div>

                  {/* Upload Dropzone */}
                  {!backgroundImage ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition duration-200 group ${
                        isDragging
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20'
                          : 'border-slate-300 dark:border-slate-700/80 hover:border-cyan-500/60 bg-white/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/70 shadow-xs'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 group-hover:bg-cyan-500/20 transition">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                        {getTranslation(language, 'dragDropText')}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                        {getTranslation(language, 'dragDropHint')}
                      </p>
                      <span className="text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition">
                        {getTranslation(language, 'browseFile')}
                      </span>
                    </div>
                  ) : (
                    /* Preview Loaded Image */
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/80 p-2 shadow-xs">
                      <div className="relative h-64 w-full flex items-center justify-center bg-slate-100 dark:bg-black/40 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={backgroundImage.url}
                          alt="Floorplan Blueprint Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 shadow-xs">
                          {backgroundImage.width} × {backgroundImage.height} px
                        </div>

                        {/* Animated Laser Grid Scan Overlay */}
                        {isScanning && (
                          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center overflow-hidden">
                            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan-laser" />
                            <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:20px_20px] opacity-25" />

                            <div className="relative z-10 flex flex-col items-center gap-2.5 p-4 text-center">
                              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/30 animate-pulse">
                                <Sparkles className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white tracking-wide">
                                  {getTranslation(language, 'aiScanning')}
                                </p>
                                <p className="text-[11px] text-cyan-300 mt-0.5">
                                  {getTranslation(language, 'aiScanningSub')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          {getTranslation(language, 'blueprintAttached')}
                        </span>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                        >
                          {getTranslation(language, 'replaceBlueprint')}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI Gemini Vision Scanner Card */}
                  {backgroundImage && (
                    <div className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-blue-500/10 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {getTranslation(language, 'aiScanBtn')}
                            </h4>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                              Gemini Vision AI
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {getTranslation(language, 'aiScanTooltip')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleTriggerAiScan}
                        disabled={isScanning}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-indigo-600 to-blue-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{getTranslation(language, 'aiScanning')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>{getTranslation(language, 'aiScanBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {scanError && (
                    <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{scanError}</span>
                    </div>
                  )}
                </>
              ) : (
                /* TAB 2: PARAMETRIC HOUSE GENERATOR ("NOLDAN 10 TA LOYIHA") */
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {getTranslation(language, 'generatorTitle')}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {getTranslation(language, 'generatorSubtitle')}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                      {currentGenArea} m²
                    </span>
                  </div>

                  {/* Footprint Sliders (Width & Depth) */}
                  <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                    {/* Width */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {getTranslation(language, 'houseWidthLabel')}
                        </span>
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {genWidth.toFixed(1)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        step="0.5"
                        value={genWidth}
                        onChange={(e) => setGenWidth(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    {/* Depth */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {getTranslation(language, 'houseDepthLabel')}
                        </span>
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {genDepth.toFixed(1)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="20"
                        step="0.5"
                        value={genDepth}
                        onChange={(e) => setGenDepth(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Core Rooms: Bedrooms, Bathrooms, Kitchen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Bedrooms */}
                    <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <BedDouble className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{getTranslation(language, 'bedroomsCountLabel')}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setGenBedrooms(n)}
                            className={`py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
                              genBedrooms === n
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bathrooms */}
                    <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <Bath className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{getTranslation(language, 'bathroomsCountLabel')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setGenBathrooms(n)}
                            className={`py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
                              genBathrooms === n
                                ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Kitchen Style */}
                  <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{getTranslation(language, 'kitchenStyleLabel')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setGenKitchenType('separate')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
                          genKitchenType === 'separate'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {getTranslation(language, 'kitchenSeparate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenKitchenType('studio')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition border cursor-pointer ${
                          genKitchenType === 'studio'
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {getTranslation(language, 'kitchenStudio')}
                      </button>
                    </div>
                  </div>

                  {/* Optional Spaces Toggle Chips */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {getTranslation(language, 'optionalSpacesLabel')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'liv', label: getTranslation(language, 'optLiving'), state: genIncludeLiving, setter: setGenIncludeLiving },
                        { id: 'hal', label: getTranslation(language, 'optHallway'), state: genIncludeHallway, setter: setGenIncludeHallway },
                        { id: 'ter', label: getTranslation(language, 'optTerrace'), state: genIncludeTerrace, setter: setGenIncludeTerrace },
                        { id: 'gar', label: getTranslation(language, 'optGarage'), state: genIncludeGarage, setter: setGenIncludeGarage },
                        { id: 'sum', label: getTranslation(language, 'optSummerKitchen'), state: genIncludeSummerKitchen, setter: setGenIncludeSummerKitchen },
                        { id: 'sto', label: getTranslation(language, 'optStorage'), state: genIncludeStorage, setter: setGenIncludeStorage },
                        { id: 'off', label: getTranslation(language, 'optOffice'), state: genIncludeOffice, setter: setGenIncludeOffice },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => item.setter(!item.state)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition border flex items-center gap-1.5 cursor-pointer ${
                            item.state
                              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/50 shadow-xs'
                              : 'bg-white dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {item.state && <Check className="w-3 h-3 text-cyan-500" />}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feasibility Alert Banner */}
                  {isAreaTight && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{getTranslation(language, 'tightAreaWarning')}</span>
                    </div>
                  )}

                  {/* Generate 10 Variants Button */}
                  <button
                    type="button"
                    onClick={handleGenerateHouseVariants}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-indigo-500 transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                    <span>{getTranslation(language, 'generate10VariantsBtn')}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo Plan Alternative */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 block">
                  {getTranslation(language, 'noBlueprintPrompt')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {getTranslation(language, 'noBlueprintSub')}
                </span>
              </div>
              <button
                onClick={() => {
                  loadSamplePlan();
                  setCurrentMode('2d');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/40 transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{getTranslation(language, 'loadSampleApartment')}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Apartment Specifications Form */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {getTranslation(language, 'specsTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getTranslation(language, 'specsSubtitle')}
                </p>
              </div>
            </div>

            {/* Field 1: Project Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {getTranslation(language, 'residenceNameLabel')}
              </label>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder={getTranslation(language, 'residenceNamePlaceholder')}
                className="w-full bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-xs"
              />
            </div>

            {/* Field 2: Ceiling Height (with presets) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  {getTranslation(language, 'ceilingHeightLabel')}
                </label>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-300">
                  {localCeiling.toFixed(2)} m
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[2.7, 2.8, 3.0, 3.2].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setLocalCeiling(h)}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition border cursor-pointer ${
                      Math.abs(localCeiling - h) < 0.01
                        ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {h.toFixed(1)}m
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="2.0"
                max="4.5"
                step="0.05"
                value={localCeiling}
                onChange={(e) => setLocalCeiling(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Field 3: Estimated Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {getTranslation(language, 'estimatedAreaLabel')}
                </label>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-300">
                  {localArea} m²
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[54, 75, 84, 120].map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setLocalArea(area)}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition border cursor-pointer ${
                      localArea === area
                        ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {area} m²
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="30"
                max="350"
                step="2"
                value={localArea}
                onChange={(e) => setLocalArea(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Field 4: Room Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {getTranslation(language, 'roomCountLabel')}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setLocalRooms(count)}
                    className={`py-2 text-xs font-bold rounded-xl transition border flex flex-col items-center justify-center cursor-pointer ${
                      localRooms === count
                        ? 'bg-gradient-to-b from-indigo-500/20 to-indigo-600/30 text-indigo-700 dark:text-indigo-300 border-indigo-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{count}</span>
                    <span className="text-[10px] opacity-80">
                      {count === 1
                        ? getTranslation(language, 'studio')
                        : language === 'ru'
                        ? `${count}-комн.`
                        : `${count} xonali`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Guarantees */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{getTranslation(language, 'guarantee1')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>{getTranslation(language, 'guarantee2')}</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition group cursor-pointer"
            >
              <span>{getTranslation(language, 'continueTo2D')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      </div>

      {/* Gemini Vision AI Scan Preview & Review Modal */}
      <AIScanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        scanData={scanData}
        blueprintUrl={backgroundImage?.url}
      />

      {/* 10-Variant Architectural House Generator Gallery Modal */}
      <HouseVariantsGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        variants={generatedVariants}
        selectedParams={{
          width: genWidth,
          depth: genDepth,
          bedrooms: genBedrooms,
          bathrooms: genBathrooms,
        }}
      />
    </div>
  );
};
