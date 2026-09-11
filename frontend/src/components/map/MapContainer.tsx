import React from 'react'
import { PolarMapCanvas } from './PolarMapCanvas'
import { Globe3DView } from './Globe3DView'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { RotateCcw, ChevronLeft, ChevronRight, Radio, ShieldCheck, AlertTriangle } from 'lucide-react'

export const MapContainer: React.FC = () => {
  const {
    viewMode,
    setViewMode,
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
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden border border-white/10 rounded-xl shadow-2xl">
      {/* Center 3D/2D Viewport */}
      <div className="w-full h-full relative">
        {viewMode === '2d' ? <PolarMapCanvas /> : <Globe3DView />}
      </div>

      {/* Floating Bottom Separate Buttons (Matches Image 3: NOT a single plate, but discrete buttons) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 select-none font-mono pointer-events-auto">
        {/* Button: 2D */}
        <button
          onClick={() => setViewMode('2d')}
          style={
            viewMode === '2d'
              ? {
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.10) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  boxShadow:
                    '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                }
              : {
                  background: 'rgba(18, 24, 38, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                }
          }
          className="px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold cursor-pointer backdrop-blur-md transition-all hover:text-white"
        >
          2D
        </button>

        {/* Button: 3D */}
        <button
          onClick={() => setViewMode('3d')}
          style={
            viewMode === '3d'
              ? {
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.10) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.45)',
                  boxShadow:
                    '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                  color: '#ffffff',
                }
              : {
                  background: 'rgba(18, 24, 38, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                }
          }
          className="px-4 py-1.5 rounded-lg text-xs font-sans font-bold cursor-pointer backdrop-blur-md transition-all hover:text-white"
        >
          3D
        </button>

        {/* Button: Ground */}
        <button
          onClick={() => {
            alert('Наземный комплекс: G_MUR (Шлюз Мурманска), C65, C70, C72 (Абоненты СМП)')
          }}
          style={{
            background: 'rgba(18, 24, 38, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#94a3b8',
          }}
          className="px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium cursor-pointer backdrop-blur-md transition-all hover:text-white"
        >
          Ground
        </button>

        {/* Playback Controls (Discrete micro-buttons) */}
        <button
          onClick={() => stepTime(-1)}
          style={{
            background: 'rgba(18, 24, 38, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer backdrop-blur-md transition-colors"
          title="Шаг назад (-120с)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Button: ((•)) Live (Crimson glass styling from Image 3) */}
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying
              ? 'rgba(40, 20, 25, 0.85)'
              : 'rgba(65, 25, 25, 0.80)',
            border: '1px solid rgba(244, 63, 94, 0.45)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          className="px-4 py-1.5 rounded-lg text-xs font-sans font-bold text-rose-200 cursor-pointer backdrop-blur-md flex items-center gap-1.5 transition-all hover:brightness-110"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span>{isPlaying ? 'PAUSE' : '((•)) Live'}</span>
        </button>

        <button
          onClick={() => stepTime(1)}
          style={{
            background: 'rgba(18, 24, 38, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer backdrop-blur-md transition-colors"
          title="Шаг вперед (+120с)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setTime(0)}
          style={{
            background: 'rgba(18, 24, 38, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer backdrop-blur-md transition-colors"
          title="В начало (Reset)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Button: 20:52:31 UTC (Separate dark rounded capsule from Image 3) */}
        <div
          style={{
            background: 'rgba(18, 24, 38, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          className="px-4 py-1.5 rounded-lg text-xs font-mono tabular-nums text-slate-200 font-semibold tracking-wider backdrop-blur-md"
        >
          {formatUTC(currentTime_s)}
        </div>
      </div>
    </div>
  )
}
