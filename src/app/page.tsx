'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFloorplanStore } from '@/store/useFloorplanStore';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthView } from '@/components/auth/AuthView';
import { TopHeader } from '@/components/layout/TopHeader';
import { LeftToolbar } from '@/components/layout/LeftToolbar';
import { PropertiesPanel } from '@/components/layout/PropertiesPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import { CalibrationModal } from '@/components/editor2d/CalibrationModal';
import { ProjectReadinessCard } from '@/components/editor2d/ProjectReadinessCard';
import { Loader2 } from 'lucide-react';

// Dynamically import Onboarding View with ssr: false
const ProjectSetupView = dynamic(
  () => import('@/components/onboarding/ProjectSetupView').then((mod) => mod.ProjectSetupView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
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

// Dynamically import Blueprint Reference Pane with ssr: false
const BlueprintReferencePane = dynamic(
  () =>
    import('@/components/editor2d/BlueprintReferencePane').then(
      (mod) => mod.BlueprintReferencePane
    ),
  { ssr: false }
);

import { ViewModeBar } from '@/components/editor2d/ViewModeBar';

// Dynamically import 3D Scene Viewport with ssr: false
const Scene3D = dynamic(
  () => import('@/components/viewer3d/Scene3D').then((mod) => mod.Scene3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#090d16] text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
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
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Generating Construction Estimate & BOM...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const { currentMode, view2DMode, backgroundImage } = useFloorplanStore();
  const { user, loading, initAuthListener } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => {
      unsubscribe();
    };
  }, [initAuthListener]);

  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#090d16] text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white font-bold text-base tracking-wider animate-pulse">
            3D
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>ArchStudio 3D Pro yuklanmoqda...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render the Glassmorphic Auth View
  if (!user) {
    return <AuthView />;
  }

  // Authenticated Studio Workspace
  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] dark:bg-[#090d16] font-sans text-slate-100">
      {/* Top Application Header with 4-Step Stepper & Cloud Actions */}
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
            <section className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-100 dark:bg-[#090d16]">
              {/* Floating 3-Mode & Split Action Switcher */}
              <ViewModeBar />

              <div className="flex-1 relative w-full h-full flex overflow-hidden">
                {view2DMode === 'split' && backgroundImage?.url && (
                  <div className="w-[45%] min-w-[320px] max-w-[650px] h-full relative z-10 shrink-0">
                    <BlueprintReferencePane key={backgroundImage.url} />
                  </div>
                )}
                <div className="flex-1 relative h-full w-full overflow-hidden">
                  <FloorplanCanvas />
                  {/* Scale Calibration Dialog */}
                  <CalibrationModal />
                  {/* Live Completeness Checklist & 3D Gate */}
                  <ProjectReadinessCard />
                </div>
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
