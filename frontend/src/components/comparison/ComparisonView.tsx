import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { runClientSimulation } from '@/core/simulator'
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Radio,
  Sliders,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Scenario, SimulationResult } from '@/core/types'

// Format seconds into HH:MM UTC
const formatHHMM = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

// Format duration into readable Russian string
const formatDuration = (secs: number) => {
  const totalMin = Math.round(secs / 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0 && m > 0) return `${h} ч ${m} мин`
  if (h > 0) return `${h} ч`
  return `${m} мин`
}

interface IntervalBlock {
  status: 'connected' | 'visible_no_route' | 'disconnected'
  startSec: number
  endSec: number
  durationSec: number
  startPct: number
  widthPct: number
  hops?: number
  path?: string[]
}

// Compress timeline samples into contiguous, readable intervals
const extractIntervals = (
  timeline: Array<{ t_s: number; status: string; hops?: number; path?: string[] }>,
  totalSec: number
): IntervalBlock[] => {
  if (!timeline || timeline.length === 0) return []
  const step = timeline.length > 1 ? timeline[1].t_s - timeline[0].t_s : 120
  const blocks: IntervalBlock[] = []

  let cur: IntervalBlock = {
    status: timeline[0].status as any,
    startSec: timeline[0].t_s,
    endSec: timeline[0].t_s + step,
    durationSec: step,
    startPct: (timeline[0].t_s / totalSec) * 100,
    widthPct: (step / totalSec) * 100,
    hops: timeline[0].hops,
    path: timeline[0].path,
  }

  for (let i = 1; i < timeline.length; i++) {
    const item = timeline[i]
    if (item.status === cur.status) {
      cur.endSec = item.t_s + step
      cur.durationSec = cur.endSec - cur.startSec
      cur.widthPct = (cur.durationSec / totalSec) * 100
    } else {
      blocks.push(cur)
      cur = {
        status: item.status as any,
        startSec: item.t_s,
        endSec: item.t_s + step,
        durationSec: step,
        startPct: (item.t_s / totalSec) * 100,
        widthPct: (step / totalSec) * 100,
        hops: item.hops,
        path: item.path,
      }
    }
  }
  blocks.push(cur)
  return blocks
}

// F12 Dumbbell Queue: Paired visual comparison gauge for percentages (0-100%)
const DumbbellAvailabilityGauge: React.FC<{
  valA: number
  valB: number
  targetThreshold?: number
}> = ({ valA, valB, targetThreshold = 80 }) => {
  const minVal = Math.min(valA, valB)
  const maxVal = Math.max(valA, valB)
  const delta = valA - valB
  const isGain = delta >= 0

  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"></span>
            <span className="text-zinc-200 font-bold font-mono">{valA.toFixed(1)}% (А)</span>
          </span>
          <span className="text-zinc-500 font-mono">vs</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 border border-zinc-700"></span>
            <span className="text-zinc-400 font-mono">{valB.toFixed(1)}% (Б)</span>
          </span>
        </div>

        <span
          className={`font-mono text-xs font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded border ${
            isGain
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
          }`}
        >
          {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isGain ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
        </span>
      </div>

      {/* Track & Range Bar */}
      <div className="relative h-5 flex items-center">
        {/* Background Track with 0-100 scale */}
        <div className="absolute inset-x-0 h-1.5 bg-zinc-900 rounded-full border border-white/5 overflow-hidden">
          {/* Target zone fill (from target to 100) */}
          <div
            style={{ left: `${targetThreshold}%`, right: 0 }}
            className="absolute top-0 bottom-0 bg-white/[0.04]"
          />
        </div>

        {/* Target 80% guideline marker */}
        <div
          style={{ left: `${targetThreshold}%` }}
          className="absolute top-0 bottom-0 w-[1px] bg-zinc-600 z-10"
          title={`Целевой порог ТЗ: ${targetThreshold}%`}
        >
          <span className="absolute -top-3.5 -translate-x-1/2 text-[8px] font-mono text-zinc-500">
            {targetThreshold}%
          </span>
        </div>

        {/* Connector range bar between B and A */}
        <div
          style={{
            left: `${minVal}%`,
            width: `${Math.max(2, maxVal - minVal)}%`,
          }}
          className={`absolute h-1.5 rounded-full z-10 transition-all ${
            isGain
              ? 'bg-gradient-to-r from-zinc-600 via-zinc-400 to-white'
              : 'bg-gradient-to-r from-amber-500 to-zinc-600'
          }`}
        />

        {/* Dot B (Baseline / comparison) */}
        <div
          style={{ left: `${valB}%` }}
          className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-zinc-400 border-2 border-zinc-950 z-20 shadow-sm"
          title={`Проект Б: ${valB.toFixed(1)}%`}
        />

        {/* Dot A (Active project - glowing white capsule) */}
        <div
          style={{ left: `${valA}%` }}
          className="absolute -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-zinc-950 z-30 shadow-[0_0_10px_rgba(255,255,255,0.9)]"
          title={`Проект А: ${valA.toFixed(1)}%`}
        />
      </div>
    </div>
  )
}

export const ComparisonView: React.FC = () => {
  const { activeScenario, savedVariants } = useScenarioStore()
  const { simulationResult } = useSimulationStore()

  const [selectedBId, setSelectedBId] = useState<string>('02_first_launch')
  const [scenarioB, setScenarioB] = useState<Scenario | null>(null)
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    x: number
    y: number
    block: IntervalBlock
    projectName: string
  } | null>(null)

  // Load Scenario B
  React.useEffect(() => {
    const saved = savedVariants.find((v) => v.id === selectedBId)
    if (saved) {
      setScenarioB(saved.scenario)
      return
    }

    fetch(`/data/${selectedBId}.json`)
      .then((res) => res.json())
      .then((data) => {
        setScenarioB(data)
      })
      .catch((err) => {
        console.error('Failed to load scenario B:', err)
      })
  }, [selectedBId, savedVariants])

  // Compute simulation for Scenario B
  const simResultB: SimulationResult | null = useMemo(() => {
    if (!scenarioB) return null
    try {
      return runClientSimulation(scenarioB)
    } catch (e) {
      console.error('Simulation B run error:', e)
      return null
    }
  }, [scenarioB])

  const simResultA = simulationResult

  // Detect differences in parameters
  const paramDiffs = useMemo(() => {
    if (!activeScenario || !scenarioB) return []
    const diffs: Array<{ param: string; valA: string; valB: string }> = []

    if (activeScenario.design.launch_stage !== scenarioB.design.launch_stage) {
      diffs.push({
        param: 'Очередь запуска (launch_stage)',
        valA: `Этап ${activeScenario.design.launch_stage} (${activeScenario.design.launch_stage * 16} КА)`,
        valB: `Этап ${scenarioB.design.launch_stage} (${scenarioB.design.launch_stage * 16} КА)`,
      })
    }

    if (activeScenario.environment.isl_range_km !== scenarioB.environment.isl_range_km) {
      diffs.push({
        param: 'Дальность ISL (isl_range_km)',
        valA: `${activeScenario.environment.isl_range_km} км`,
        valB: `${scenarioB.environment.isl_range_km} км`,
      })
    }

    if (activeScenario.environment.min_elevation_deg !== scenarioB.environment.min_elevation_deg) {
      diffs.push({
        param: 'Мин. угол возвышения',
        valA: `${activeScenario.environment.min_elevation_deg}°`,
        valB: `${scenarioB.environment.min_elevation_deg}°`,
      })
    }

    const failCountA = (activeScenario.failures || []).length
    const failCountB = (scenarioB.failures || []).length
    if (failCountA !== failCountB) {
      diffs.push({
        param: 'Количество заданных отказов аппаратов',
        valA: `${failCountA} КА`,
        valB: `${failCountB} КА`,
      })
    }

    for (const pA of activeScenario.design.planes) {
      const pB = scenarioB.design.planes.find((p) => p.id === pA.id)
      if (pB) {
        if (pA.raan_deg !== pB.raan_deg || pA.phase_deg !== pB.phase_deg) {
          diffs.push({
            param: `Ориентация плоскости ${pA.id}`,
            valA: `RAAN: ${pA.raan_deg}°, Phase: ${pA.phase_deg}°`,
            valB: `RAAN: ${pB.raan_deg}°, Phase: ${pB.phase_deg}°`,
          })
        }
      }
    }

    return diffs
  }, [activeScenario, scenarioB])

  // Compute dynamic conclusion
  const conclusion = useMemo(() => {
    if (!simResultA || !simResultB) return null
    let totalDeltaAvail = 0
    let totalDeltaGap = 0
    let count = 0

    for (const cA of simResultA.clients) {
      const cB = simResultB.clients.find((c) => c.client_id === cA.client_id)
      if (cB) {
        totalDeltaAvail += cA.path_availability_pct - cB.path_availability_pct
        totalDeltaGap += cA.max_gap_minutes - cB.max_gap_minutes
        count++
      }
    }

    const avgDeltaAvail = count > 0 ? totalDeltaAvail / count : 0
    const avgDeltaGap = count > 0 ? totalDeltaGap / count : 0

    return {
      avgDeltaAvail,
      avgDeltaGap,
      isBetter: avgDeltaAvail >= 0,
    }
  }, [simResultA, simResultB])

  const horizonSec = simResultA?.horizon_s || 86400

  if (!simResultA || !activeScenario) {
    return (
      <div className="p-8 text-center text-zinc-400 font-mono">
        Сначала загрузите базовый сценарий и выполните расчет.
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 space-y-4 font-mono text-zinc-200 select-none">
      {/* 1. Top Selector Bar (Dark grey with soft side rim lighting) */}
      <div className="flex flex-wrap items-center justify-between bg-[#10131a]/85 backdrop-blur-xl p-3.5 rounded-2xl border border-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.6),-1px_0_12px_rgba(255,255,255,0.04),1px_0_12px_rgba(255,255,255,0.04)] gap-3">
        <div className="flex items-center gap-2 text-white">
          <GitCompare className="w-5 h-5 text-zinc-300" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans">
            Сопоставление вариантов группировки
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-sans">Проект А:</span>
            <span className="bg-white/10 border border-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
              {activeScenario.meta.title}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-500" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-sans">Сравнить с Проектом Б:</span>
            <select
              value={selectedBId}
              onChange={(e) => setSelectedBId(e.target.value)}
              className="bg-black/60 border border-white/15 text-zinc-200 rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-none hover:border-white/30"
            >
              <optgroup label="Предустановленные сценарии" className="bg-zinc-900 text-zinc-200">
                <option value="01_full_constellation">01: Полная группировка (48 КА)</option>
                <option value="02_first_launch">02: Первая очередь (16 КА)</option>
                <option value="03_satellite_outages">03: Отказы 10 аппаратов</option>
                <option value="04_link_range">04: Дальность ISL 2000 км</option>
              </optgroup>
              {savedVariants.length > 0 && (
                <optgroup label="Сохраненные варианты пользователя" className="bg-zinc-900 text-zinc-200">
                  {savedVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Analytical Summary Card (Lieflat Editorial Brief) */}
      {conclusion && (
        <div className="p-4 rounded-2xl bg-[#10131a]/85 border border-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-start gap-3.5 backdrop-blur-xl">
          <Sparkles className="w-5 h-5 text-zinc-200 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs leading-relaxed font-sans">
            <div className="font-bold text-white flex items-center gap-2 flex-wrap">
              <span className="text-sm">Инженерное заключение по сопоставлению:</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  conclusion.isBetter
                    ? 'bg-white/10 text-white border-white/25'
                    : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                }`}
              >
                {conclusion.isBetter
                  ? `Проект А эффективнее на +${conclusion.avgDeltaAvail.toFixed(1)}%`
                  : `Проект А уступает на ${conclusion.avgDeltaAvail.toFixed(1)}%`}
              </span>
            </div>
            <p className="text-zinc-300">
              {conclusion.isBetter ? (
                <>
                  Конфигурация <b className="text-white">Проекта А ({activeScenario.meta.title})</b> обеспечивает
                  прирост средней доступности связи на{' '}
                  <b className="text-white font-mono">+{conclusion.avgDeltaAvail.toFixed(1)}%</b> и сокращает
                  максимальные перерывы связи в среднем на{' '}
                  <b className="text-white font-mono">{Math.abs(conclusion.avgDeltaGap).toFixed(1)} мин</b> по
                  сравнению с <b className="text-zinc-400">Проектом Б ({scenarioB?.meta.title})</b>.
                </>
              ) : (
                <>
                  Конфигурация <b className="text-zinc-200">Проекта Б ({scenarioB?.meta.title})</b> превосходит
                  Проект А по доступности на{' '}
                  <b className="text-amber-300 font-mono">+{Math.abs(conclusion.avgDeltaAvail).toFixed(1)}%</b>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 3. Parameter Differences Table */}
      <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase font-sans">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span>Различия в параметрах конфигурации</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            Изменений обнаружено:{' '}
            <b className={paramDiffs.length > 0 ? 'text-amber-400 font-mono' : 'text-zinc-300 font-mono'}>
              {paramDiffs.length}
            </b>
          </span>
        </div>

        {paramDiffs.length === 0 ? (
          <div className="text-center text-zinc-500 py-3 text-xs">
            Параметры обоих проектов идентичны.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-zinc-500 border-b border-white/5 text-[10px] uppercase tracking-wider">
                  <th className="pb-2 font-medium">Параметр проекта</th>
                  <th className="pb-2 font-medium text-white">Проект А ({activeScenario.meta.title})</th>
                  <th className="pb-2 font-medium text-zinc-400">Проект Б ({scenarioB?.meta.title})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                {paramDiffs.map((d, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-2 text-zinc-300 font-sans">{d.param}</td>
                    <td className="py-2 text-white font-bold font-mono">{d.valA}</td>
                    <td className="py-2 text-zinc-400 font-mono">{d.valB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. The 3 Terminal Metric Cards with Dumbbell Gauges (F12 Dumbbell Queue) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {simResultA.clients.map((clientA) => {
          const clientB = simResultB?.clients.find((c) => c.client_id === clientA.client_id)
          const availA = clientA.path_availability_pct
          const availB = clientB?.path_availability_pct || 0
          const gapA = clientA.max_gap_minutes
          const gapB = clientB?.max_gap_minutes || 0
          const deltaGap = gapA - gapB
          const targetMet = clientA.target_met

          return (
            <div
              key={clientA.client_id}
              className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6),-1px_0_12px_rgba(255,255,255,0.03),1px_0_12px_rgba(255,255,255,0.03)] backdrop-blur-xl flex flex-col justify-between space-y-3.5"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-xs font-black text-white uppercase font-sans tracking-wide">
                    {clientA.name}
                  </h3>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {clientA.client_id} • {clientA.lat_deg}°N, {clientA.lon_deg}°E
                  </div>
                </div>

                <span
                  className={`text-[9px] font-sans font-bold uppercase px-2 py-0.5 rounded-full border ${
                    targetMet
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {targetMet ? 'Цель выполнена' : 'Цель не выполнена'}
                </span>
              </div>

              {/* Dumbbell Availability Gauge (0-100%) */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider block">
                  Доступность сквозного канала
                </span>
                <DumbbellAvailabilityGauge valA={availA} valB={availB} targetThreshold={80} />
              </div>

              {/* Max Gap Outage Comparison */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 space-y-1.5 font-sans">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Макс. непрерывный перерыв:</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span className="text-white">{gapA} мин (А)</span>
                    <span className="text-zinc-500">vs</span>
                    <span className="text-zinc-400">{gapB} мин (Б)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                  <span className="text-zinc-500 font-mono">Сокращение разрыва:</span>
                  <span
                    className={`font-mono font-bold ${
                      deltaGap <= 0 ? 'text-white' : 'text-amber-400'
                    }`}
                  >
                    {deltaGap <= 0
                      ? `-${Math.abs(deltaGap).toFixed(1)} мин (${(
                          (Math.abs(deltaGap) / Math.max(1, gapB)) *
                          100
                        ).toFixed(0)}% улучшение)`
                      : `+${deltaGap.toFixed(1)} мин (ухудшение)`}
                  </span>
                </div>
              </div>

              {/* Direct Sat Visibility Ratio */}
              <div className="flex justify-between text-[10px] text-zinc-400 pt-1 font-mono">
                <span>Прямая радиовидимость КА:</span>
                <span className="text-zinc-200">
                  {clientA.visibility_pct.toFixed(1)}% (А) vs {clientB?.visibility_pct.toFixed(1)}% (Б)
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 5. Synchronous 24h Continuous Gantt Tracks (Clean, legible, segmented) */}
      <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6),-1px_0_14px_rgba(255,255,255,0.04),1px_0_14px_rgba(255,255,255,0.04)] backdrop-blur-xl space-y-4">
        {/* Header & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-bold text-white uppercase font-sans tracking-wide">
              Синхронное сопоставление временных шкал связи (24 часа, 00:00 — 24:00 UTC)
            </h3>
          </div>

          {/* Clean Monochrome/Yellow Legend */}
          <div className="flex items-center gap-4 text-[10px] font-sans">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-xs bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"></div>
              <span className="text-zinc-200 font-bold">Проект А (Связь)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-xs bg-zinc-400"></div>
              <span className="text-zinc-400">Проект Б (Связь)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-xs bg-amber-400"></div>
              <span className="text-amber-300">Видимость без маршрута</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-xs bg-zinc-800 border border-white/10"></div>
              <span className="text-zinc-500">Перерыв связи</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Time Axis Ruler */}
        <div className="relative pt-2 pb-1 text-[9px] font-mono text-zinc-400 select-none">
          <div className="flex justify-between px-1">
            <span>00:00</span>
            <span>03:00</span>
            <span>06:00</span>
            <span>09:00</span>
            <span>12:00</span>
            <span>15:00</span>
            <span>18:00</span>
            <span>21:00</span>
            <span>24:00 UTC</span>
          </div>
          {/* Subtle Grid marks */}
          <div className="relative h-1 mt-1 flex justify-between px-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
              <div key={t} className="w-[1px] h-2 bg-zinc-700" />
            ))}
          </div>
        </div>

        {/* Terminal Tracks */}
        <div className="space-y-4">
          {simResultA.clients.map((cA) => {
            const cB = simResultB?.clients.find((c) => c.client_id === cA.client_id)
            const intervalsA = extractIntervals(cA.timeline, horizonSec)
            const intervalsB = cB ? extractIntervals(cB.timeline, horizonSec) : []

            return (
              <div
                key={cA.client_id}
                className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2.5"
              >
                {/* Track Title */}
                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="font-bold text-white">
                    {cA.name} ({cA.client_id})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Δ Доступность:{' '}
                    <b className="text-white">
                      {(cA.path_availability_pct - (cB?.path_availability_pct || 0)).toFixed(1)}%
                    </b>
                  </span>
                </div>

                {/* Track A: Continuous Segmented Gantt Bar */}
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-20 text-[10px] text-white font-bold font-sans">
                    Проект А:
                  </span>
                  <div className="relative flex-1 h-4 bg-zinc-900/90 rounded-md overflow-hidden flex border border-white/10">
                    {intervalsA.map((b, bi) => {
                      const isConn = b.status === 'connected'
                      const isNoRoute = b.status === 'visible_no_route'
                      return (
                        <div
                          key={bi}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setHoveredTooltip({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                              block: b,
                              projectName: `Проект А (${activeScenario.meta.title})`,
                            })
                          }}
                          onMouseLeave={() => setHoveredTooltip(null)}
                          style={{
                            width: `${b.widthPct}%`,
                            backgroundColor: isConn
                              ? '#ffffff'
                              : isNoRoute
                              ? '#f59e0b'
                              : '#1c1f28',
                          }}
                          className={`h-full cursor-pointer transition-opacity hover:opacity-85 ${
                            isConn
                              ? 'border-r border-zinc-950/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                              : isNoRoute
                              ? 'border-r border-black/20'
                              : ''
                          }`}
                        />
                      )
                    })}
                  </div>
                  <span className="w-14 text-right text-[11px] font-bold text-white">
                    {cA.path_availability_pct.toFixed(1)}%
                  </span>
                </div>

                {/* Track B: Continuous Segmented Gantt Bar */}
                {cB && (
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-20 text-[10px] text-zinc-400 font-sans">
                      Проект Б:
                    </span>
                    <div className="relative flex-1 h-4 bg-zinc-900/90 rounded-md overflow-hidden flex border border-white/5">
                      {intervalsB.map((b, bi) => {
                        const isConn = b.status === 'connected'
                        const isNoRoute = b.status === 'visible_no_route'
                        return (
                          <div
                            key={bi}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setHoveredTooltip({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8,
                                block: b,
                                projectName: `Проект Б (${scenarioB?.meta.title})`,
                              })
                            }}
                            onMouseLeave={() => setHoveredTooltip(null)}
                            style={{
                              width: `${b.widthPct}%`,
                              backgroundColor: isConn
                                ? '#a1a1aa'
                                : isNoRoute
                                ? '#f59e0b'
                                : '#1c1f28',
                            }}
                            className={`h-full cursor-pointer transition-opacity hover:opacity-85 ${
                              isConn ? 'border-r border-black/20' : ''
                            }`}
                          />
                        )
                      })}
                    </div>
                    <span className="w-14 text-right text-[11px] font-mono text-zinc-400">
                      {cB.path_availability_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive Tooltip for Gantt Hover */}
      {hoveredTooltip && (
        <div
          style={{
            left: `${hoveredTooltip.x}px`,
            top: `${hoveredTooltip.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="fixed z-50 pointer-events-none bg-zinc-900/95 border border-white/20 rounded-xl p-2.5 text-[11px] font-mono shadow-2xl backdrop-blur-md min-w-[220px] space-y-1"
        >
          <div className="flex items-center justify-between text-zinc-400 text-[10px] border-b border-white/10 pb-1">
            <span>{hoveredTooltip.projectName}</span>
            <span className="font-bold text-white">
              {formatDuration(hoveredTooltip.block.durationSec)}
            </span>
          </div>

          <div className="text-white font-bold">
            {formatHHMM(hoveredTooltip.block.startSec)} — {formatHHMM(hoveredTooltip.block.endSec)} UTC
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            {hoveredTooltip.block.status === 'connected' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span className="text-zinc-200">
                  Связь установлена (Хопов: {hoveredTooltip.block.hops ?? 1})
                </span>
              </>
            ) : hoveredTooltip.block.status === 'visible_no_route' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">
                  КА в поле зрения, но нет маршрута ISL к шлюзу
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-zinc-400">
                  Перерыв связи (нет радиовидимости КА)
                </span>
              </>
            )}
          </div>

          {hoveredTooltip.block.path && hoveredTooltip.block.path.length > 0 && (
            <div className="text-[9px] text-zinc-400 pt-0.5 border-t border-white/5 truncate">
              Путь: {hoveredTooltip.block.path.join(' → ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
