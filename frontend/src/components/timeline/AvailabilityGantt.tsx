import React, { useRef } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

export const AvailabilityGantt: React.FC = () => {
  const { simulationResult, currentTime_s, setTime, selectedClientId, setSelectedClient } =
    useSimulationStore()
  const trackRef = useRef<HTMLDivElement | null>(null)

  if (!simulationResult) return null

  const horizon = simulationResult.horizon_s
  const step = simulationResult.step_s
  const totalSteps = simulationResult.total_steps
  const progressRatio = currentTime_s / horizon

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    const clickedSec = Math.floor((ratio * horizon) / step) * step
    setTime(clickedSec)
  }

  return (
    <div className="w-full flex flex-col gap-1.5 font-mono text-xs select-none">
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>ДИАГРАММА ДОСТУПНОСТИ И ПЕРЕРЫВОВ СВЯЗИ (24 ЧАСА, ШАГ 120 СЕК)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Маршрут есть
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span> ISL Partition (разрыв сети)
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Нет спутника
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 bg-slate-950/80 p-2 border border-slate-800 rounded-lg">
        {simulationResult.clients.map((client) => {
          const isSelected = client.client_id === selectedClientId
          return (
            <div
              key={client.client_id}
              className={`flex items-center gap-3 p-1 rounded transition-colors ${
                isSelected ? 'bg-slate-900 border border-amber-500/40' : 'hover:bg-slate-900/50'
              }`}
            >
              {/* Terminal Label and Select Button */}
              <button
                onClick={() => setSelectedClient(client.client_id)}
                className="w-24 text-left flex items-center justify-between cursor-pointer"
              >
                <span className={`font-bold text-xs ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                  {client.client_id}
                </span>
                <span className="text-[10px] text-slate-500">{client.lat_deg}°N</span>
              </button>

              {/* Gantt Strip */}
              <div
                ref={trackRef}
                onClick={handleTrackClick}
                className="relative flex-1 h-5 bg-slate-900 rounded overflow-hidden cursor-pointer border border-slate-800/90"
              >
                <div className="absolute inset-0 flex">
                  {client.timeline.map((item, i) => {
                    let bg = '#10b981' // connected
                    if (item.status === 'visible_no_route') bg = '#f59e0b'
                    else if (item.status === 'no_satellite' || item.status === 'gateway_outage')
                      bg = '#f43f5e'

                    return (
                      <div
                        key={i}
                        style={{
                          width: `${100 / totalSteps}%`,
                          backgroundColor: bg,
                        }}
                        className="h-full"
                      />
                    )
                  })}
                </div>

                {/* Current Time Cursor */}
                <div
                  style={{ left: `${progressRatio * 100}%` }}
                  className="absolute top-0 bottom-0 w-[2px] bg-white z-10 pointer-events-none"
                />
              </div>

              {/* Stats badges */}
              <div className="w-56 flex items-center justify-end gap-2 text-right">
                <span className="text-[11px] text-slate-400">
                  Макс: <b className="text-slate-200">{client.max_gap_minutes}м</b>
                </span>
                <Badge variant={client.target_met ? 'success' : 'destructive'} className="h-5 px-1.5">
                  {client.path_availability_pct.toFixed(1)}%
                  {client.target_met ? (
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                  ) : (
                    <XCircle className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
