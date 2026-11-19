'use client';

import React, { useState, useRef } from 'react';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  ArrowRight,
  Maximize2,
  Home,
  CheckCircle2,
  Trash2,
  Ruler,
  Layers,
  ShieldCheck,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localTitle, setLocalTitle] = useState(projectName || 'My 2-Bedroom Residence');
  const [localCeiling, setLocalCeiling] = useState(ceilingHeight || 2.8);
  const [localArea, setLocalArea] = useState(targetAreaSqm || 84);
  const [localRooms, setLocalRooms] = useState(numRooms || 2);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
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
    <div className="flex-1 flex flex-col bg-[#090d16] text-slate-100 overflow-y-auto px-6 py-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Onboarding Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 1 of 4 • Project & Blueprint Setup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-blue-500">ArchStudio 3D</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Upload your architectural floorplan blueprint or start with a sample apartment to trace walls, customize 3D interiors, and calculate automated construction quotes.
          </p>
        </div>

        {/* Studio Setup Grid: Left (Blueprint Uploader) | Right (Apartment Specs) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Blueprint Upload Card */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 flex flex-col justify-between border border-white/10 shadow-xl shadow-black/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                    <FileImage className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Apartment Floorplan Blueprint</h3>
                    <p className="text-xs text-slate-400">JPG, PNG, or WebP floorplan drawing</p>
                  </div>
                </div>

                {backgroundImage && (
                  <button
                    onClick={() => setBackgroundImage(null)}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition px-2 py-1 rounded hover:bg-rose-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
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
                      ? 'border-cyan-400 bg-cyan-950/20'
                      : 'border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/70'
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
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 group-hover:bg-cyan-500/20 transition">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Drag & Drop your floorplan image here
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Supports high-resolution blueprint photos, PDF scans, or architectural sketches.
                  </p>
                  <span className="text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition">
                    Browse File on Computer
                  </span>
                </div>
              ) : (
                /* Preview Loaded Image */
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950/80 p-2">
                  <div className="relative h-64 w-full flex items-center justify-center bg-black/40 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={backgroundImage.url}
                      alt="Floorplan Blueprint Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-cyan-300">
                      {backgroundImage.width} × {backgroundImage.height} px
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Blueprint attached successfully
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      Replace Blueprint
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
            </div>

            {/* Quick Demo Plan Alternative */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Don&apos;t have a blueprint image?</span>
                <span className="text-[11px] text-slate-400">Load our complete pre-built apartment project</span>
              </div>
              <button
                onClick={() => {
                  loadSamplePlan();
                  setCurrentMode('2d');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Try Sample 84 m² Apartment</span>
              </button>
            </div>
          </div>

          {/* Right Column: Apartment Specifications Form */}
          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-white/10 shadow-xl shadow-black/40 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Apartment Specifications</h3>
                <p className="text-xs text-slate-400">Dimensions & architectural baseline</p>
              </div>
            </div>

            {/* Field 1: Project Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project / Residence Name
              </label>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="e.g. Modern Minimalist Loft"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
            </div>

            {/* Field 2: Ceiling Height (with presets) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  Ceiling Height (meters)
                </label>
                <span className="text-xs font-mono font-bold text-cyan-300">{localCeiling.toFixed(2)} m</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[2.7, 2.8, 3.0, 3.2].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setLocalCeiling(h)}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition border ${
                      Math.abs(localCeiling - h) < 0.01
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
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
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Field 3: Target Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  Estimated Apartment Area (m²)
                </label>
                <span className="text-xs font-mono font-bold text-indigo-300">{localArea} m²</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[45, 65, 84, 120].map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setLocalArea(area)}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition border ${
                      localArea === area
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-xs'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {area} m²
                  </button>
                ))}
              </div>
            </div>

            {/* Field 4: Number of Rooms */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Number of Primary Rooms
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setLocalRooms(count)}
                    className={`text-xs py-1.5 rounded-lg font-semibold transition border ${
                      localRooms === count
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {count === 1 ? 'Studio' : `${count} Bed`}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Guarantees */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1:1 Metric Extrusion &amp; Parametric Cutouts</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Dual-sided wall finishes (Wallpapers &amp; Paints)</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleContinue}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition group"
            >
              <span>Continue to 2D Floorplan Tracing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
