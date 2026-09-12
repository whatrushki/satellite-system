import React, { useMemo, useState } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { getConstellationCoverage } from '@/core/coverageEngine'
import {
  Globe,
  Radio,
  Wifi,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Compass,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

export const CoverageHUD: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    simulationResult,
    selectedClientId,
    coverageMode,
    setCoverageMode,
    coverageElevation,
    setCoverageElevation,
    setSelectedStation,
  } = useSimulationStore()

  // Get active route for the currently selected client
  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const clientData = simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  const currentTimelineItem = clientData?.timeline.find((item) => item.t_s === idx * step)
  const activeRoutePath = currentTimelineItem?.path || []
  const isRouteConnected = activeRoutePath.length >= 2

  // Compute realtime coverage metrics at current time - synchronized with FleetSidebar
  const coverageMetrics = useMemo(() => {
    if (!activeScenario) return null
    return getConstellationCoverage(activeScenario, currentTime_s, coverageElevation, activeRoutePath)
  }, [activeScenario, currentTime_s, coverageElevation, activeRoutePath])

  if (!coverageMetrics) return null

  const isArctic100 = coverageMetrics.arcticCoveragePct >= 95

  return (
    <div
      style={{
        background: 'rgba(10, 14, 22, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255, 255, 255, 0.2)',
      }}
      className="select-none font-sans rounded-2xl p-3 text-zinc-100 flex flex-col gap-2 max-w-[340px] pointer-events-auto transition-all"
    >
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          </div>
          <div>
            <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>Зоны радиопокрытия</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[9px] font-mono font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Охват поверхности Земли КА
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isCollapsed ? 'Развернуть' : 'Свернуть'}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Main KPI Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Total Covered Area */}
        <div className="bg-black/50 border border-white/10 rounded-xl p-2 flex flex-col justify-between">
          <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
            Площадь на шаре
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-white font-mono tabular-nums">
              {coverageMetrics.totalCoveredAreaMkm2.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">млн км²</span>
          </div>
          <div className="text-[9.5px] text-zinc-400 font-mono mt-0.5">
            {coverageMetrics.globalCoveragePct.toFixed(1)}% Земли
          </div>
        </div>

        {/* Metric 2: Arctic Coverage */}
        <div className="bg-black/50 border border-white/10 rounded-xl p-2 flex flex-col justify-between">
          <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
            Охват Арктики (≥65°)
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`text-lg font-black font-mono tabular-nums ${
                isArctic100 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {coverageMetrics.arcticCoveragePct.toFixed(1)}%
            </span>
            {isArctic100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="text-[9.5px] text-zinc-400 font-mono mt-0.5">
            {coverageMetrics.activeSatsInArctic} КА над регионом
          </div>
        </div>
      </div>

      {/* Detailed collapsible section */}
      {!isCollapsed && (
        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          {/* Ground terminals coverage status list */}
          <div className="flex flex-col gap-1 bg-black/40 p-2 rounded-xl border border-white/5">
            <div className="text-[10px] text-zinc-400 font-mono uppercase flex justify-between">
              <span>Статус связи абонентов</span>
              <span>{isRouteConnected ? 'МАРШРУТ АКТИВЕН' : 'РАЗРЫВ'}</span>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              {activeScenario?.ground_sites.map((g) => {
                const info = coverageMetrics.coveredClients[g.id]
                const inZone = info?.inFootprint10 ?? false
                const isCore = info?.inFootprint25 ?? false
                const elev = info?.elevationDeg ?? 0
                const isSelected = selectedClientId === g.id
                const isClient = g.role === 'client'

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedStation(g.id)}
                    className={`flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-black/30 border-transparent hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          inZone
                            ? isCore
                              ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                              : 'bg-sky-400 shadow-[0_0_4px_#38bdf8]'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span className="font-bold">{g.id}</span>
                      <span className="text-[9.5px] text-zinc-400 hidden sm:inline">
                        ({g.name || (isClient ? 'Абонент' : 'Шлюз')})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      {inZone ? (
                        <>
                          <span className={`font-semibold ${isCore ? 'text-emerald-400' : 'text-sky-300'}`}>
                            θ = {elev.toFixed(1)}°
                          </span>
                          <span className="text-zinc-400">
                            {info?.nearestSatId ? `[${info.nearestSatId}]` : ''}
                          </span>
                        </>
                      ) : (
                        <span className="text-rose-400 font-semibold">ВНЕ ЗОНЫ (θ &lt; {coverageElevation}°)</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Route Hop Type Info */}
            {isRouteConnected && (
              <div className="text-[10px] font-mono mt-1 pt-1 border-t border-white/5 flex items-center justify-between text-zinc-400">
                <span>Архитектура тракта:</span>
                <span className={`font-semibold ${
                  coverageMetrics.activeRouteHopType === 'direct_single_hop' ? 'text-emerald-400' : 'text-cyan-400'
                }`}>
                  {coverageMetrics.activeRouteHopType === 'direct_single_hop'
                    ? '1 КА (прямая радиолиния)'
                    : 'Многоскачковый (МИС / лазер)'}
                </span>
              </div>
            )}
          </div>

          {/* Footprint settings: Radius, Angle, Display Mode */}
          <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono">
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
              <span className="text-zinc-400 px-1">Режим:</span>
              <button
                onClick={() => setCoverageMode('all')}
                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                  coverageMode === 'all'
                    ? 'bg-white/25 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Показывать зоны всех активных спутников"
              >
                Все КА
              </button>
              <button
                onClick={() => setCoverageMode('route')}
                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                  coverageMode === 'route'
                    ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Показывать только зоны спутников в текущем маршруте связи"
              >
                В маршруте
              </button>
              <button
                onClick={() => setCoverageMode('off')}
                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                  coverageMode === 'off'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Скрыть зоны радиопокрытия"
              >
                Скрыть
              </button>
            </div>

            {/* Elevation Angle Switcher */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
              <span className="text-zinc-400 px-0.5">Угол:</span>
              <button
                onClick={() => setCoverageElevation(25)}
                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                  coverageElevation === 25
                    ? 'bg-emerald-500/25 text-emerald-200 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Минимальный угол места 25° по ТЗ (радиус зоны ~940 км)"
              >
                25° ТЗ
              </button>
              <button
                onClick={() => setCoverageElevation(10)}
                className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                  coverageElevation === 10
                    ? 'bg-sky-500/25 text-sky-200 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Радиогоризонт 10° (радиус зоны ~1665 км)"
              >
                10° Гор.
              </button>
            </div>
          </div>

          {/* Quick info footnote */}
          <div className="flex items-center justify-between text-[9.5px] text-zinc-400 font-mono px-1">
            <span>Радиус зоны КА: ~{coverageMetrics.footprintRadiusKm} км</span>
            <span>1 КА: {coverageMetrics.singleFootprintAreaMkm2} млн км²</span>
          </div>
        </div>
      )}
    </div>
  )
}
