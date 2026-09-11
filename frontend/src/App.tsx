import React, { useEffect, useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { AppHeader } from '@/components/header/AppHeader'
import { MapContainer } from '@/components/map/MapContainer'
import { FleetSidebar } from '@/components/fleet/FleetSidebar'
import { SpaceXTelemetryPanel } from '@/components/telemetry/SpaceXTelemetryPanel'
import { ComparisonView } from '@/components/comparison/ComparisonView'
import { ExportDialog } from '@/components/export/ExportDialog'
import { ImportDialog } from '@/components/export/ImportDialog'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export const App: React.FC = () => {
  const { loadDefaultScenario } = useScenarioStore()
  const { activeTab, recalculate } = useSimulationStore()

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
          {/* 2. Floating Top Navigation (Framed buttons in weightlessness) */}
          <ErrorBoundary fallbackTitle="Навигация">
            <AppHeader
              onOpenImport={() => setIsImportOpen(true)}
              onOpenExport={() => setIsExportOpen(true)}
            />
          </ErrorBoundary>

          {/* 3. Floating Left Sidebar: Satellite Fleet in weightlessness */}
          <div className="absolute left-4 top-16 bottom-6 w-[280px] z-20 pointer-events-auto">
            <ErrorBoundary fallbackTitle="Флот аппаратов">
              <FleetSidebar />
            </ErrorBoundary>
          </div>

          {/* 4. Floating Right Sidebar: Telemetry in weightlessness */}
          <div className="absolute right-4 top-16 bottom-6 w-[300px] z-20 pointer-events-auto">
            <ErrorBoundary fallbackTitle="Телеметрия SpaceX">
              <SpaceXTelemetryPanel />
            </ErrorBoundary>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 z-40 bg-[#06080d]/90 backdrop-blur-xl p-4 overflow-auto">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-sm font-black tracking-widest text-white uppercase font-sans">
                Сравнение и аналитика группировки
              </h1>
              <button
                onClick={() => recalculate()}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg border border-white/20 cursor-pointer"
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
      )}

      {/* Modals */}
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  )
}

export default App

