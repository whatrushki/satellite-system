import React, { useEffect, useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { AppHeader } from '@/components/header/AppHeader'
import { MapContainer } from '@/components/map/MapContainer'
import { FleetSidebar } from '@/components/fleet/FleetSidebar'
import { SpaceXTelemetryPanel } from '@/components/telemetry/SpaceXTelemetryPanel'
import { TimelineDock } from '@/components/timeline/TimelineDock'
import { ComparisonView } from '@/components/comparison/ComparisonView'
import { RecommendationsView } from '@/components/recommendations/RecommendationsView'
import { ExportDialog } from '@/components/export/ExportDialog'
import { ImportDialog } from '@/components/export/ImportDialog'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export const App: React.FC = () => {
  const { loadDefaultScenario } = useScenarioStore()
  const { activeTab, setActiveTab, recalculate } = useSimulationStore()

  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Initial load on mount
  useEffect(() => {
    const init = async () => {
      await loadDefaultScenario('01_full_constellation')
      setTimeout(() => {
        recalculate()
      }, 50)
    }
    init()
  }, [])

  return (
    <div className="relative w-screen h-screen bg-[#06080d] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Fullscreen 3D Globe / 2D Map (Edge-to-edge) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <ErrorBoundary fallbackTitle="3D Земля / Визуализатор">
          <MapContainer />
        </ErrorBoundary>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* 2. Floating Top Navigation (Header with Stage Switcher, Reset, Scenarios) */}
          <ErrorBoundary fallbackTitle="Навигация">
            <AppHeader
              onOpenImport={() => setIsImportOpen(true)}
              onOpenExport={() => setIsExportOpen(true)}
            />
          </ErrorBoundary>

          {/* 3. Floating Left Sidebar: Satellite Fleet */}
          <div className="absolute left-4 top-16 bottom-3 w-[280px] z-20 pointer-events-auto">
            <ErrorBoundary fallbackTitle="Флот аппаратов">
              <FleetSidebar />
            </ErrorBoundary>
          </div>

          {/* 4. Floating Right Sidebar: Telemetry */}
          <div className="absolute right-4 top-16 bottom-3 w-[300px] z-20 pointer-events-auto">
            <ErrorBoundary fallbackTitle="Телеметрия">
              <SpaceXTelemetryPanel />
            </ErrorBoundary>
          </div>

          {/* 5. Floating Bottom Center: Timeline Dock (stretches cleanly across available space between sidebars) */}
          <div className="absolute left-[296px] right-[316px] bottom-3 z-30 pointer-events-auto px-1">
            <ErrorBoundary fallbackTitle="Временная шкала и диаграмма доступности">
              <TimelineDock />
            </ErrorBoundary>
          </div>
        </>
      ) : activeTab === 'compare' ? (
        <div className="absolute inset-0 z-40 bg-[#06080d]/90 backdrop-blur-xl p-4 overflow-auto">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-sm font-black tracking-widest text-white uppercase font-sans">
                Сравнение и аналитика группировки
              </h1>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-100 hover:text-white rounded-xl border border-white/20 cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              >
                Вернуться к 3D обзору
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary fallbackTitle="Модуль сравнения">
                <ComparisonView />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-40 bg-[#06080d]/90 backdrop-blur-xl p-4 overflow-auto">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-sm font-black tracking-widest text-white uppercase font-sans">
                Инженерные рекомендации и обоснование
              </h1>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-zinc-100 hover:text-white rounded-xl border border-white/20 cursor-pointer transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              >
                Вернуться к 3D обзору
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary fallbackTitle="Рекомендации">
                <RecommendationsView />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}

export default App

