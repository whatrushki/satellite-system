import React, { useEffect } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { AvailabilityGantt } from './AvailabilityGantt'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  FastForward,
} from 'lucide-react'

export const TimelineDock: React.FC = () => {
  const {
    currentTime_s,
    setTime,
    stepTime,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    simulationResult,
  } = useSimulationStore()

  const horizon = simulationResult?.horizon_s || 86400
  const step = simulationResult?.step_s || 120
  const maxTime = horizon - step

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`
  }

  // Playback timer effect
  useEffect(() => {
    if (!isPlaying) return

    let lastTime = performance.now()
    const interval = setInterval(() => {
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      const advanceSec = dt * playbackSpeed * 2
      const nextT = (currentTime_s + advanceSec) % horizon
      setTime(nextT)
    }, 40)

    return () => clearInterval(interval)
  }, [isPlaying, playbackSpeed, currentTime_s, horizon, setTime])

  const speeds = [1, 5, 30, 120, 600]

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800/90 p-3 flex flex-col gap-2.5 backdrop-blur-md shadow-2xl z-30 select-none">
      {/* Upper bar: Time Scrubber + Controls */}
      <div className="flex items-center gap-4">
        {/* Play / Pause / Step buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => setTime(0)}
            title="Перейти в начало (00:00:00)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => stepTime(-1)}
            title="Шаг назад (-120 сек)"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={isPlaying ? 'destructive' : 'default'}
            className="h-8 w-9"
            onClick={togglePlay}
            title={isPlaying ? 'Пауза' : 'Воспроизведение'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => stepTime(1)}
            title="Шаг вперед (+120 сек)"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Digital Time Readout */}
        <div className="bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800 font-mono flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-sm font-bold text-sky-300 tabular-nums">
            {formatTime(currentTime_s)}
          </span>
          <span className="text-slate-500 text-xs">/ {formatTime(horizon)}</span>
          <span className="text-[10px] text-slate-500 ml-1">
            [шаг {Math.floor(currentTime_s / step) + 1} / {Math.floor(horizon / step)}]
          </span>
        </div>

        {/* Main Timeline Slider */}
        <div className="flex-1 flex items-center px-2">
          <Slider
            value={[currentTime_s]}
            max={maxTime}
            step={step}
            onValueChange={(val) => setTime(val[0])}
            className="cursor-pointer"
          />
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
          <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                playbackSpeed === s
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Lower bar: 3-lane Gantt Availability Chart */}
      <AvailabilityGantt />
    </div>
  )
}
