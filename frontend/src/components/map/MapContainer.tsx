import React from 'react'
import { PolarMapCanvas } from './PolarMapCanvas'
import { Globe3DView } from './Globe3DView'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { RotateCcw, ChevronLeft, ChevronRight, Radio, ShieldCheck, AlertTriangle, BarChart2 } from 'lucide-react'

export const MapContainer: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    setActiveTab,
    simulationResult,
    currentTime_s,
    setTime,
    stepTime,
    isPlaying,
    togglePlay,
    selectedClientId,
  } = useSimulationStore()

  const activeScenario = useScenarioStore((state) => state.activeScenario)

  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap =
    simulationResult?.snapshots[Math.min(idx, (simulationResult?.snapshots.length || 1) - 1)]

  const activeSatsCount = currentSnap?.satellites.filter((s) => s.active).length || 0
  const totalSatsCount = activeScenario?.design.satellites.length || 48
  const activeEdgesCount = currentSnap?.edges.length || 0

  const clientData = simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  const currentTimeline = clientData?.timeline.find((t) => t.t_s === idx * step)
  const isConnected = currentTimeline?.status === 'connected'

  // Format UTC Clock
  const formatUTC = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')} UTC`
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[#06080d] overflow-hidden">
      {/* Center 3D/2D Viewport */}
      <div className="w-full h-full relative">
        {viewMode === '2d' ? <PolarMapCanvas /> : <Globe3DView />}
      </div>

      {/* Floating Bottom Separate Buttons (Discrete floating dark grey buttons) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 select-none font-mono pointer-events-auto">
        {/* Segmented 2D / 3D Toggle */}
        <div
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow:
              '0 4px 14px rgba(0, 0, 0, 0.5), -1px 0 8px rgba(255, 255, 255, 0.04), 1px 0 8px rgba(255, 255, 255, 0.04)',
          }}
          className="flex items-center p-0.5 rounded-lg backdrop-blur-md"
        >
          <button
            onClick={() => setViewMode('2d')}
            style={
              viewMode === '2d'
                ? {
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.40)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                    color: '#ffffff',
                  }
                : {
                    color: '#a1a1aa',
                  }
            }
            className="px-3 py-1 rounded-md text-xs font-sans font-bold cursor-pointer transition-all hover:text-white"
          >
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            style={
              viewMode === '3d'
                ? {
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.40)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
                    color: '#ffffff',
                  }
                : {
                    color: '#a1a1aa',
                  }
            }
            className="px-3 py-1 rounded-md text-xs font-sans font-bold cursor-pointer transition-all hover:text-white"
          >
            3D
          </button>
        </div>

        {/* Playback Controls (Discrete micro-buttons) */}
        <button
          onClick={() => stepTime(-1)}
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer backdrop-blur-md transition-colors"
          title="Шаг назад (-120с)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Button: ((•)) Live (Pale red desaturated accent) */}
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying
              ? 'rgba(54, 26, 30, 0.70)'
              : 'rgba(38, 20, 24, 0.65)',
            border: '1px solid rgba(210, 130, 138, 0.38)',
            boxShadow: '0 0 10px rgba(210, 130, 138, 0.15), 0 4px 12px rgba(0, 0, 0, 0.5)',
            color: '#eed2d5',
          }}
          className="px-4 py-1.5 rounded-lg text-xs font-sans font-bold cursor-pointer backdrop-blur-md flex items-center gap-1.5 transition-all hover:brightness-110"
        >
          <span className="relative flex h-2 w-2">
            <span
              style={{ backgroundColor: '#d9828b' }}
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
            />
            <span
              style={{ backgroundColor: '#c86f78' }}
              className="relative inline-flex rounded-full h-2 w-2"
            />
          </span>
          <span>{isPlaying ? 'PAUSE' : '((•)) Live'}</span>
        </button>

        <button
          onClick={() => stepTime(1)}
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer backdrop-blur-md transition-colors"
          title="Шаг вперед (+120с)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setTime(0)}
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer backdrop-blur-md transition-colors"
          title="В начало (Reset)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Button: UTC Clock (Dark grey capsule with side rim lighting) */}
        <div
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), -1px 0 8px rgba(255, 255, 255, 0.04), 1px 0 8px rgba(255, 255, 255, 0.04)',
          }}
          className="px-4 py-1.5 rounded-lg text-xs font-mono tabular-nums text-zinc-200 font-semibold tracking-wider backdrop-blur-md"
        >
          {formatUTC(currentTime_s)}
        </div>

        {/* Button: Аналитика (Moved from top to bottom) */}
        <button
          onClick={() => setActiveTab('compare')}
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow:
              '0 4px 14px rgba(0, 0, 0, 0.5), -1px 0 8px rgba(255, 255, 255, 0.04), 1px 0 8px rgba(255, 255, 255, 0.04)',
          }}
          className="px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold text-zinc-300 hover:text-white cursor-pointer backdrop-blur-md transition-all flex items-center gap-1.5 hover:bg-white/10"
          title="Сравнение и аналитика группировки"
        >
          <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Аналитика</span>
        </button>
      </div>
    </div>
  )
}
