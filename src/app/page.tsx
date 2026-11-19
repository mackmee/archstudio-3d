'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { TopHeader } from '@/components/layout/TopHeader';
import { LeftToolbar } from '@/components/layout/LeftToolbar';
import { PropertiesPanel } from '@/components/layout/PropertiesPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import { CalibrationModal } from '@/components/editor2d/CalibrationModal';
import { ProjectReadinessCard } from '@/components/editor2d/ProjectReadinessCard';

// Dynamically import Onboarding View with ssr: false
const ProjectSetupView = dynamic(
  () => import('@/components/onboarding/ProjectSetupView').then((mod) => mod.ProjectSetupView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Loading Project Setup Studio...</span>
        </div>
      </div>
    ),
  }
);

// Dynamically import 2D Canvas with ssr: false
const FloorplanCanvas = dynamic(
  () =>
    import('@/components/editor2d/FloorplanCanvas').then((mod) => mod.FloorplanCanvas),
  { ssr: false }
);

// Dynamically import 3D Scene Viewport with ssr: false
const Scene3D = dynamic(
  () => import('@/components/viewer3d/Scene3D').then((mod) => mod.Scene3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Initializing 3D Architectural Scene...</span>
        </div>
      </div>
    ),
  }
);

// Dynamically import Construction Estimator with ssr: false
const EstimatorView = dynamic(
  () => import('@/components/estimator/EstimatorView').then((mod) => mod.EstimatorView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Generating Construction Estimate & BOM...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const { currentMode } = useFloorplanStore();

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] font-sans text-slate-100">
      {/* Top Application Header with 4-Step Stepper */}
      <TopHeader />

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {currentMode === 'onboarding' ? (
          /* Step 1: Client Onboarding & Blueprint Setup */
          <ProjectSetupView />
        ) : currentMode === '2d' ? (
          /* Step 2: 2D Floorplan CAD Editor & Readiness Validation */
          <>
            {/* Left Vertical CAD Toolbar */}
            <LeftToolbar />

            {/* Center Workspace (Interactive 2D Canvas) */}
            <section className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#090d16]">
              <div className="flex-1 relative w-full h-full">
                <FloorplanCanvas />
                {/* Scale Calibration Dialog */}
                <CalibrationModal />
                {/* Live Completeness Checklist & 3D Gate */}
                <ProjectReadinessCard />
              </div>

              {/* Bottom Status Bar */}
              <StatusBar />
            </section>

            {/* Right Inspector & Global Properties Panel */}
            <PropertiesPanel />
          </>
        ) : currentMode === '3d' ? (
          /* Step 3: Interactive 3D Architectural Visualizer */
          <section className="flex-1 h-full w-full relative overflow-hidden">
            <Scene3D />
          </section>
        ) : (
          /* Step 4: Smart Construction Estimator & BOM Dashboard */
          <section className="flex-1 h-full w-full relative overflow-hidden flex flex-col">
            <EstimatorView />
          </section>
        )}
      </div>
    </main>
  );
}
