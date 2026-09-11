import React, { useEffect } from 'react'
import { PolarMapCanvas } from './PolarMapCanvas'
import { Globe3DView } from './Globe3DView'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { RotateCcw, BarChart2 } from 'lucide-react'

export const MapContainer: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    setActiveTab,
    simulationResult,
    currentTime_s,
    setTime,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    selectedClientId,
  } = useSimulationStore()

  const activeScenario = useScenarioStore((state) => state.activeScenario)

  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap =
    simulationResult?.snapshots[Math.min(idx, (simulationResult?.snapshots.length || 1) - 1)]

  const maxHorizon = simulationResult?.horizon_s || activeScenario?.environment.horizon_s || 86400
  const progressPct = Math.min(100, Math.max(0, (currentTime_s / maxHorizon) * 100))

  // Real-time animation ticker for continuous, smooth orbital timeline
  useEffect(() => {
    if (!isPlaying) return

    let lastTime = performance.now()
    let frameId: number

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000 // real seconds elapsed
      lastTime = now

      const horizon = simulationResult?.horizon_s || activeScenario?.environment.horizon_s || 86400
      const current = useSimulationStore.getState().currentTime_s
      let next = current + dt * playbackSpeed
      if (next >= horizon) {
        next = 0 // loop
      }
      setTime(next)

      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, playbackSpeed, simulationResult, activeScenario, setTime])

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

      {/* Floating Bottom Toolbar with Timeline Slider and Speed Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 select-none font-mono pointer-events-auto">
        {/* 1. Segmented 2D / 3D Toggle */}
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

        {/* 2. Play/Pause: ((•)) Live in pale red */}
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying
              ? 'rgba(54, 26, 30, 0.75)'
              : 'rgba(38, 20, 24, 0.65)',
            border: '1px solid rgba(210, 130, 138, 0.38)',
            boxShadow: '0 0 10px rgba(210, 130, 138, 0.15), 0 4px 12px rgba(0, 0, 0, 0.5)',
            color: '#eed2d5',
          }}
          className="px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold cursor-pointer backdrop-blur-md flex items-center gap-1.5 transition-all hover:brightness-110"
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

        {/* 3. Speed Multiplier Switcher (1x, 2x, 5x, 10x) */}
        <div
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
          }}
          className="flex items-center p-0.5 rounded-lg backdrop-blur-md"
        >
          {([1, 2, 5, 10] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              style={
                playbackSpeed === spd
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
              className="px-2 py-0.5 rounded-md text-[11px] font-sans font-bold cursor-pointer transition-all hover:text-white"
              title={`Скорость воспроизведения ${spd}x`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* 4. Timeline Slider (Ползунок вместо кнопок < и >) */}
        <div
          style={{
            background: 'rgba(18, 21, 28, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow:
              '0 4px 14px rgba(0, 0, 0, 0.5), -1px 0 8px rgba(255, 255, 255, 0.04), 1px 0 8px rgba(255, 255, 255, 0.04)',
          }}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg backdrop-blur-md"
        >
          {/* Range Slider Track */}
          <div className="relative flex items-center w-36 sm:w-48">
            <input
              type="range"
              min={0}
              max={maxHorizon}
              step={1}
              value={currentTime_s}
              onChange={(e) => setTime(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) ${progressPct}%, rgba(255, 255, 255, 0.15) ${progressPct}%, rgba(255, 255, 255, 0.15) 100%)`,
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-white transition-all hover:brightness-125"
            />
          </div>

          {/* Real-time Clock */}
          <span className="text-[11px] font-mono tabular-nums text-zinc-200 font-bold tracking-wider shrink-0 min-w-[75px]">
            {formatUTC(currentTime_s)}
          </span>

          {/* Reset button */}
          <button
            onClick={() => setTime(0)}
            className="p-1 rounded-md text-zinc-400 hover:text-white cursor-pointer transition-colors"
            title="В начало (Reset 00:00)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* 5. Button: Аналитика */}
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
