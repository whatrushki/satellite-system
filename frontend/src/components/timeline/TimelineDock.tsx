import React, { useState } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { AvailabilityGantt } from './AvailabilityGantt'
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock,
  FastForward,
} from 'lucide-react'

export const TimelineDock: React.FC = () => {
  const [isGanttCollapsed, setIsGanttCollapsed] = useState(false)
  const {
    currentTime_s,
    setTime,
    stepTime,
    isPlaying,
    togglePlay,
    playbackSpeed,
    setPlaybackSpeed,
    simulationResult,
    viewMode,
    setViewMode,
  } = useSimulationStore()

  const horizon = simulationResult?.horizon_s || 86400
  const step = simulationResult?.step_s || 120
  const maxTime = horizon - step

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`
  }

  const speeds = [1, 5, 30, 120, 600]

  return (
    <div
      style={{
        background: 'rgba(11, 15, 23, 0.90)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.2)',
      }}
      className="w-full border border-white/12 p-3 rounded-2xl flex flex-col gap-2 select-none font-mono text-zinc-200 pointer-events-auto overflow-hidden"
    >
      {/* Upper bar: Controls and Speed settings */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* 2D / 3D Toggle */}
          <div className="flex items-center bg-black/50 p-0.5 rounded-xl border border-white/10 text-xs font-sans font-bold shrink-0">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                viewMode === '2d'
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                viewMode === '3d'
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              3D
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 shrink-0" />

          {/* Play / Pause / Step buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setTime(0)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/15 transition-all"
              title="Перейти в начало (00:00:00)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => stepTime(-1)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/15 transition-all"
              title="Шаг назад (-120 сек)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={togglePlay}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all flex items-center gap-1 border ${
                isPlaying
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-200 hover:bg-rose-900/60'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/60'
              }`}
              title={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              <span>{isPlaying ? 'ПАУЗА' : 'СТАРТ'}</span>
            </button>
            <button
              onClick={() => stepTime(1)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/15 transition-all"
              title="Шаг вперед (+120 сек)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Digital Time Readout */}
          <div className="bg-black/60 px-2.5 py-1 rounded-xl border border-white/10 font-mono flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-bold text-white tabular-nums">
              {formatTime(currentTime_s)}
            </span>
            <span className="text-zinc-500 text-[10px]">/ {formatTime(horizon)}</span>
            <span className="text-[10px] text-zinc-500 font-mono hidden xl:inline">
              [шаг {Math.floor(currentTime_s / step) + 1}/{Math.floor(horizon / step)}]
            </span>
          </div>
        </div>

        {/* Speed Selector + Gantt Toggle */}
        <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-xl border border-white/10 shrink-0">
          <FastForward className="w-3 h-3 text-zinc-400 ml-1" />
          {[1, 5, 30, 120, 600].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-1.5 py-0.5 text-[9.5px] font-mono rounded-lg cursor-pointer transition-colors ${
                playbackSpeed === s
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {s}x
            </button>
          ))}
          <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />
          <button
            onClick={() => setIsGanttCollapsed(!isGanttCollapsed)}
            className="px-2 py-0.5 text-[10px] text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer flex items-center gap-0.5 transition-colors"
            title={isGanttCollapsed ? 'Показать диаграмму доступности' : 'Свернуть диаграмму'}
          >
            {isGanttCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isGanttCollapsed ? 'Gantt' : 'Скрыть'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Full-width Timeline Scrubber Slider stretching 100% across the dock */}
      <div className="w-full flex flex-col gap-1 px-1 py-0.5">
        <div className="relative w-full flex items-center group">
          <input
            type="range"
            min={0}
            max={maxTime}
            step={step}
            value={currentTime_s}
            onChange={(e) => setTime(parseFloat(e.target.value))}
            className="timeline-slider-white w-full h-2 rounded-full appearance-none cursor-pointer border border-white/20 hover:border-white/50 transition-all shadow-inner focus:outline-none"
            style={{
              background: `linear-gradient(to right, #ffffff ${(currentTime_s / (maxTime || 1)) * 100}%, rgba(255, 255, 255, 0.16) ${(currentTime_s / (maxTime || 1)) * 100}%)`,
            }}
          />
        </div>
        {/* Time milestone ticks: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00, 24:00 */}
        <div className="flex justify-between items-center px-0.5 text-[9px] text-zinc-500 font-mono select-none">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>24:00</span>
        </div>
      </div>

      {/* Lower bar: 3-lane Gantt Availability Chart (Collapsible) */}
      {!isGanttCollapsed && <AvailabilityGantt />}
    </div>
  )
}
