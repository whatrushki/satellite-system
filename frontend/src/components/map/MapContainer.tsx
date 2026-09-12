import React, { useEffect } from 'react'
import { PolarMapCanvas } from './PolarMapCanvas'
import { Globe3DView } from './Globe3DView'
import { CoverageHUD } from '@/components/globe/CoverageHUD'
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

        {/* Real-time Coverage HUD Overlay */}
        <div className="absolute top-16 left-[304px] z-20 pointer-events-none">
          <CoverageHUD />
        </div>
      </div>
    </div>
  )
}
