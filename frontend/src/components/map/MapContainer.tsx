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

      {/* Floating Bottom Toolbar: Unified Transparent Tablet (Одна прозрачная таблетка) */}
      <div
        style={{
          background: 'rgba(8, 11, 18, 0.30)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center p-1 px-3 gap-2.5 select-none font-mono pointer-events-auto rounded-full border border-transparent hover:border-white/20 transition-all duration-300"
      >
        {/* 1. Segmented 2D / 3D Toggle */}
        <div className="flex items-center h-7.5 p-0.5 rounded-full border border-transparent hover:border-white/20 transition-all">
          <button
            onClick={() => setViewMode('2d')}
            className={`h-full px-2.5 rounded-full text-[11px] font-sans font-bold cursor-pointer transition-all ${
              viewMode === '2d'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`h-full px-2.5 rounded-full text-[11px] font-sans font-bold cursor-pointer transition-all ${
              viewMode === '3d'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            3D
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-white/10" />

        {/* 2. Play/Pause: ((•)) Live in pale red */}
        <button
          onClick={togglePlay}
          style={{
            background: isPlaying
              ? 'rgba(60, 24, 28, 0.50)'
              : 'rgba(32, 16, 20, 0.35)',
            color: '#eed2d5',
          }}
          className="h-7.5 px-3.5 rounded-full text-xs font-sans font-bold cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-[#d9828b]/60 transition-all hover:brightness-110"
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

        {/* Divider */}
        <div className="h-4 w-[1px] bg-white/10" />

        {/* 3. Speed Multiplier: One Single Button with 1x, 2x, 5x, 10x, 15x, 20x, 30x, 50x, 100x */}
        <div className="relative group">
          <button
            onClick={() => {
              const SPEEDS = [1, 2, 5, 10, 15, 20, 30, 50, 100]
              const curIdx = SPEEDS.indexOf(playbackSpeed)
              const next = SPEEDS[(curIdx + 1) % SPEEDS.length]
              setPlaybackSpeed(next)
            }}
            className="h-7.5 px-2.5 rounded-full border border-transparent hover:border-white/20 text-zinc-200 hover:text-white text-[11px] font-sans font-bold cursor-pointer transition-all hover:bg-white/10 flex items-center gap-1"
            title="Ускорение: 1x, 2x, 5x, 10x, 15x, 20x, 30x, 50x, 100x (нажмите для смены)"
          >
            <span>{playbackSpeed}x</span>
            <span className="text-[8px] text-zinc-400">▾</span>
          </button>

          {/* Quick Dropdown on Hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-[#0b0e17]/95 border border-white/20 rounded-xl p-1 shadow-2xl backdrop-blur-xl z-50 min-w-[70px]">
            {[1, 2, 5, 10, 15, 20, 30, 50, 100].map((spd) => (
              <button
                key={spd}
                onClick={(e) => {
                  e.stopPropagation()
                  setPlaybackSpeed(spd)
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono text-left cursor-pointer transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-white/10" />

        {/* 4. Timeline Slider (Плавный ползунок времени) */}
        <div className="flex items-center h-7.5 gap-2 px-2 rounded-full border border-transparent hover:border-white/20 transition-all">
          <div className="relative flex items-center w-36 sm:w-52">
            <input
              type="range"
              min={0}
              max={maxHorizon}
              step={0.5}
              value={currentTime_s}
              onChange={(e) => setTime(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.85) ${progressPct}%, rgba(255, 255, 255, 0.15) ${progressPct}%, rgba(255, 255, 255, 0.15) 100%)`,
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-white transition-all hover:brightness-125"
            />
          </div>

          <span className="text-[11px] font-mono tabular-nums text-zinc-200 font-bold tracking-wider shrink-0 min-w-[75px]">
            {formatUTC(currentTime_s)}
          </span>

          <button
            onClick={() => setTime(0)}
            className="p-1 rounded-full text-zinc-400 hover:text-white border border-transparent hover:border-white/20 cursor-pointer transition-all hover:bg-white/10"
            title="В начало (Reset 00:00:00)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-white/10" />

        {/* 5. Button: Аналитика */}
        <button
          onClick={() => setActiveTab('compare')}
          className="h-7.5 px-3 rounded-full text-[11px] font-sans font-bold text-zinc-300 hover:text-white cursor-pointer border border-transparent hover:border-white/20 transition-all flex items-center gap-1.5 hover:bg-white/10"
          title="Сравнение и аналитика группировки"
        >
          <BarChart2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>Аналитика</span>
        </button>
      </div>
    </div>
  )
}
