import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { runClientSimulation } from '@/core/simulator'
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sliders,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
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

// Pale yellow color token for desaturated, elegant aerospace warning display
const PALE_YELLOW = '#c8b276'
const PALE_YELLOW_BG = 'rgba(200, 178, 118, 0.15)'
const PALE_YELLOW_BORDER = 'rgba(200, 178, 118, 0.35)'

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

// Full-fledged Chart 1: Lieflat F6 Paired Grouped Rungs (Качественное парное сравнение доступности)
const PairedAvailabilityChart: React.FC<{
  clientsA: SimulationResult['clients']
  clientsB?: SimulationResult['clients']
  targetThreshold?: number
}> = ({ clientsA, clientsB, targetThreshold = 90 }) => {
  const categories = useMemo(() => {
    const items = clientsA.map((cA) => {
      const cB = clientsB?.find((c) => c.client_id === cA.client_id)
      return {
        label: cA.client_id,
        name: cA.name,
        valA: cA.path_availability_pct,
        valB: cB?.path_availability_pct || 0,
      }
    })

    // Add Average summary column
    const avgA = items.reduce((acc, it) => acc + it.valA, 0) / Math.max(1, items.length)
    const avgB = items.reduce((acc, it) => acc + it.valB, 0) / Math.max(1, items.length)
    items.push({
      label: 'СРЕДНЕЕ',
      name: 'Средняя доступность по группировке',
      valA: avgA,
      valB: avgB,
    })

    return items
  }, [clientsA, clientsB])

  const W = 460
  const H = 180
  const padLeft = 36
  const padRight = 16
  const padTop = 24
  const padBottom = 32
  const innerW = W - padLeft - padRight
  const innerH = H - padTop - padBottom

  const yTarget = padTop + innerH - (targetThreshold / 100) * innerH

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-white uppercase font-sans">
          <BarChart3 className="w-4 h-4 text-zinc-300" />
          <span>Сравнительный профиль доступности (Проект А vs Проект Б)</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-sans">
          <span className="flex items-center gap-1 text-zinc-200">
            <span className="w-2.5 h-2.5 rounded-xs bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
            Проект А
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-xs bg-zinc-500" />
            Проект Б
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-3 border-t border-dashed border-zinc-400" />
            ТЗ ({targetThreshold}%)
          </span>
        </div>
      </div>

      <div className="w-full bg-black/40 rounded-xl border border-white/10 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none font-mono">
          {/* Background grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padTop + innerH - (pct / 100) * innerH
            return (
              <g key={pct}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={W - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.8"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="8"
                  fontWeight="600"
                >
                  {pct}%
                </text>
              </g>
            )
          })}

          {/* Target 80% guideline */}
          <line
            x1={padLeft}
            y1={yTarget}
            x2={W - padRight}
            y2={yTarget}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={W - padRight - 4}
            y={yTarget - 4}
            textAnchor="end"
            fill="#a1a1aa"
            fontSize="8"
            fontWeight="700"
          >
            Цель ТЗ: {targetThreshold}%
          </text>

          {/* Bar Groups */}
          {categories.map((cat, i) => {
            const groupW = innerW / categories.length
            const groupCenterX = padLeft + i * groupW + groupW / 2
            const barW = 16
            const gap = 4

            const xA = groupCenterX - barW - gap / 2
            const xB = groupCenterX + gap / 2

            const hA = (Math.max(1, cat.valA) / 100) * innerH
            const hB = (Math.max(1, cat.valB) / 100) * innerH
            const yA = padTop + innerH - hA
            const yB = padTop + innerH - hB

            const delta = cat.valA - cat.valB

            return (
              <g key={cat.label}>
                {/* Bar A (Active - Luminous Solid White) */}
                <rect
                  x={xA}
                  y={yA}
                  width={barW}
                  height={hA}
                  rx="3"
                  fill="#ffffff"
                  className="transition-all hover:opacity-90"
                />
                {/* Bar B (Comparison - Muted Zinc) */}
                <rect
                  x={xB}
                  y={yB}
                  width={barW}
                  height={hB}
                  rx="3"
                  fill="#71717a"
                  className="transition-all hover:opacity-90"
                />

                {/* Values on top of bars */}
                <text
                  x={xA + barW / 2}
                  y={yA - 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="800"
                >
                  {cat.valA.toFixed(0)}%
                </text>
                <text
                  x={xB + barW / 2}
                  y={yB - 4}
                  textAnchor="middle"
                  fill="#a1a1aa"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  {cat.valB.toFixed(0)}%
                </text>

                {/* Category Label */}
                <text
                  x={groupCenterX}
                  y={H - 12}
                  textAnchor="middle"
                  fill={cat.label === 'СРЕДНЕЕ' ? '#ffffff' : '#d4d4d8'}
                  fontSize="8.5"
                  fontWeight={cat.label === 'СРЕДНЕЕ' ? '800' : '600'}
                >
                  {cat.label}
                </text>

                {/* Delta Badge */}
                <text
                  x={groupCenterX}
                  y={H - 2}
                  textAnchor="middle"
                  fill={delta >= 0 ? '#ffffff' : '#f87171'}
                  fontSize="7.5"
                  fontWeight="700"
                >
                  {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// Full-fledged Chart 2: Lieflat F2/F3 Hairline Area Chart (24-Hour Continuous Routing & Hourly Connection)
const HourlyContinuousLineChart: React.FC<{
  simResultA: SimulationResult
  simResultB?: SimulationResult | null
}> = ({ simResultA, simResultB }) => {
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL')

  // Calculate 24 hourly points
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => h)

    return hours.map((hour) => {
      const startS = hour * 3600
      const endS = (hour + 1) * 3600

      const clientsToAnalyzeA =
        selectedTerminal === 'ALL'
          ? simResultA.clients
          : simResultA.clients.filter((c) => c.client_id === selectedTerminal)

      const clientsToAnalyzeB =
        selectedTerminal === 'ALL'
          ? simResultB?.clients || []
          : (simResultB?.clients || []).filter((c) => c.client_id === selectedTerminal)

      // Compute connection percentage in this hour for Project A
      let connectedCountA = 0
      let totalStepsA = 0
      for (const client of clientsToAnalyzeA) {
        for (const step of client.timeline) {
          if (step.t_s >= startS && step.t_s < endS) {
            totalStepsA++
            if (step.status === 'connected') connectedCountA++
          }
        }
      }
      const pctA = totalStepsA > 0 ? (connectedCountA / totalStepsA) * 100 : 0

      // Compute connection percentage in this hour for Project B
      let connectedCountB = 0
      let totalStepsB = 0
      for (const client of clientsToAnalyzeB) {
        for (const step of client.timeline) {
          if (step.t_s >= startS && step.t_s < endS) {
            totalStepsB++
            if (step.status === 'connected') connectedCountB++
          }
        }
      }
      const pctB = totalStepsB > 0 ? (connectedCountB / totalStepsB) * 100 : 0

      return {
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        pctA,
        pctB,
      }
    })
  }, [simResultA, simResultB, selectedTerminal])

  const W = 460
  const H = 180
  const padLeft = 32
  const padRight = 16
  const padTop = 24
  const padBottom = 32
  const innerW = W - padLeft - padRight
  const innerH = H - padTop - padBottom

  // Coordinates mapping
  const getX = (hourIdx: number) => padLeft + (hourIdx / 23) * innerW
  const getY = (pct: number) => padTop + innerH - (pct / 100) * innerH

  // Path string for Project A
  const pathA = hourlyData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.pctA)}`)
    .join(' ')

  const areaA = `${pathA} L ${getX(23)} ${padTop + innerH} L ${getX(0)} ${padTop + innerH} Z`

  // Path string for Project B
  const pathB = hourlyData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.pctB)}`)
    .join(' ')

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-white uppercase font-sans">
          <Activity className="w-4 h-4 text-zinc-300" />
          <span>Суточный профиль связи (24 ч, 00:00 — 24:00 UTC)</span>
        </div>

        {/* Terminal Switcher */}
        <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 text-[10px] font-sans">
          <button
            onClick={() => setSelectedTerminal('ALL')}
            className={`px-2 py-0.5 rounded ${
              selectedTerminal === 'ALL'
                ? 'bg-white text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Все
          </button>
          {simResultA.clients.map((c) => (
            <button
              key={c.client_id}
              onClick={() => setSelectedTerminal(c.client_id)}
              className={`px-2 py-0.5 rounded ${
                selectedTerminal === c.client_id
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {c.client_id}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full bg-black/40 rounded-xl border border-white/10 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none font-mono">
          <defs>
            <linearGradient id="areaGradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 50, 100].map((pct) => {
            const y = getY(pct)
            return (
              <g key={pct}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={W - padRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.8"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="8"
                  fontWeight="600"
                >
                  {pct}%
                </text>
              </g>
            )
          })}

          {/* Area fill for Project A */}
          <path d={areaA} fill="url(#areaGradA)" />

          {/* Line for Project B (Zinc) */}
          <path
            d={pathB}
            fill="none"
            stroke="#71717a"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Line for Project A (Crisp White) */}
          <path
            d={pathA}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
          />

          {/* Points for Project A */}
          {hourlyData.map((d, i) => {
            if (i % 4 !== 0 && i !== 23) return null
            const x = getX(i)
            const yA = getY(d.pctA)
            return (
              <g key={i}>
                <circle cx={x} cy={yA} r="2.5" fill="#ffffff" />
                <text
                  x={x}
                  y={H - 12}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="7.5"
                  fontWeight="600"
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export const ComparisonView: React.FC = () => {
  const { activeScenario, activeScenarioId, availableScenarios, savedVariants } = useScenarioStore()
  const { simulationResult } = useSimulationStore()

  const [selectedAId, setSelectedAId] = useState<string>(activeScenarioId || '01_full_constellation')
  const [selectedBId, setSelectedBId] = useState<string>(
    activeScenarioId === '02_first_launch' ? '01_full_constellation' : '02_first_launch'
  )
  const [scenarioA, setScenarioA] = useState<Scenario | null>(activeScenario)
  const [scenarioB, setScenarioB] = useState<Scenario | null>(null)
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    x: number
    y: number
    block: IntervalBlock
    projectName: string
  } | null>(null)

  // Load Scenario A
  React.useEffect(() => {
    if (selectedAId === activeScenarioId && activeScenario) {
      setScenarioA(activeScenario)
      return
    }
    const found = availableScenarios.find((v) => v.id === selectedAId)
    if (found?.scenario) {
      setScenarioA(found.scenario)
      return
    }
    const saved = savedVariants.find((v) => v.id === selectedAId)
    if (saved) {
      setScenarioA(saved.scenario)
      return
    }

    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`
    fetch(`${baseUrl}data/${selectedAId}.json`)
      .then((res) => res.json())
      .then((data) => setScenarioA(data))
      .catch((err) => console.error('Failed to load scenario A:', err))
  }, [selectedAId, activeScenarioId, activeScenario, availableScenarios, savedVariants])

  // Load Scenario B
  React.useEffect(() => {
    if (selectedBId === activeScenarioId && activeScenario) {
      setScenarioB(activeScenario)
      return
    }
    const found = availableScenarios.find((v) => v.id === selectedBId)
    if (found?.scenario) {
      setScenarioB(found.scenario)
      return
    }
    const saved = savedVariants.find((v) => v.id === selectedBId)
    if (saved) {
      setScenarioB(saved.scenario)
      return
    }

    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`
    fetch(`${baseUrl}data/${selectedBId}.json`)
      .then((res) => res.json())
      .then((data) => setScenarioB(data))
      .catch((err) => console.error('Failed to load scenario B:', err))
  }, [selectedBId, activeScenarioId, activeScenario, availableScenarios, savedVariants])

  // Compute simulation for Scenario A
  const simResultA: SimulationResult | null = useMemo(() => {
    if (selectedAId === activeScenarioId && simulationResult) return simulationResult
    if (!scenarioA) return null
    try {
      return runClientSimulation(scenarioA)
    } catch (e) {
      console.error('Simulation A run error:', e)
      return null
    }
  }, [selectedAId, activeScenarioId, simulationResult, scenarioA])

  // Compute simulation for Scenario B
  const simResultB: SimulationResult | null = useMemo(() => {
    if (selectedBId === activeScenarioId && simulationResult) return simulationResult
    if (!scenarioB) return null
    try {
      return runClientSimulation(scenarioB)
    } catch (e) {
      console.error('Simulation B run error:', e)
      return null
    }
  }, [selectedBId, activeScenarioId, simulationResult, scenarioB])

  // Detect differences in parameters
  const paramDiffs = useMemo(() => {
    if (!scenarioA || !scenarioB) return []
    const diffs: Array<{ param: string; valA: string; valB: string }> = []

    if (scenarioA.design.launch_stage !== scenarioB.design.launch_stage) {
      diffs.push({
        param: 'Очередь запуска (launch_stage)',
        valA: `Этап ${scenarioA.design.launch_stage} (${scenarioA.design.launch_stage * 16} КА)`,
        valB: `Этап ${scenarioB.design.launch_stage} (${scenarioB.design.launch_stage * 16} КА)`,
      })
    }

    if (scenarioA.environment.isl_range_km !== scenarioB.environment.isl_range_km) {
      diffs.push({
        param: 'Дальность ISL (isl_range_km)',
        valA: `${scenarioA.environment.isl_range_km} км`,
        valB: `${scenarioB.environment.isl_range_km} км`,
      })
    }

    if (scenarioA.environment.min_elevation_deg !== scenarioB.environment.min_elevation_deg) {
      diffs.push({
        param: 'Мин. угол возвышения',
        valA: `${scenarioA.environment.min_elevation_deg}°`,
        valB: `${scenarioB.environment.min_elevation_deg}°`,
      })
    }

    const failCountA = (scenarioA.failures || []).length
    const failCountB = (scenarioB.failures || []).length
    if (failCountA !== failCountB) {
      diffs.push({
        param: 'Количество заданных отказов аппаратов',
        valA: `${failCountA} КА`,
        valB: `${failCountB} КА`,
      })
    }

    for (const pA of scenarioA.design.planes) {
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
  }, [scenarioA, scenarioB])

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

  if (!simResultA || !scenarioA) {
    return (
      <div className="p-8 text-center text-zinc-400 font-mono">
        Сначала выберите базовый сценарий А и дождитесь завершения расчета.
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
            Сопоставление любых двух вариантов группировки
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-sans">Проект А:</span>
            <select
              value={selectedAId}
              onChange={(e) => setSelectedAId(e.target.value)}
              className="bg-black/60 border border-white/15 text-zinc-200 rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-none hover:border-white/30 max-w-[190px] truncate"
            >
              <optgroup label="Доступные сценарии" className="bg-zinc-900 text-zinc-200">
                {availableScenarios.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.label}
                  </option>
                ))}
              </optgroup>
              {savedVariants.length > 0 && (
                <optgroup label="Пользовательские варианты" className="bg-zinc-900 text-zinc-200">
                  {savedVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-500" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-400 font-sans">Сравнить с Проектом Б:</span>
            <select
              value={selectedBId}
              onChange={(e) => setSelectedBId(e.target.value)}
              className="bg-black/60 border border-white/15 text-zinc-200 rounded-lg px-2.5 py-1 text-xs cursor-pointer focus:outline-none hover:border-white/30 max-w-[190px] truncate"
            >
              <optgroup label="Доступные сценарии" className="bg-zinc-900 text-zinc-200">
                {availableScenarios.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.label}
                  </option>
                ))}
              </optgroup>
              {savedVariants.length > 0 && (
                <optgroup label="Пользовательские варианты" className="bg-zinc-900 text-zinc-200">
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
                  Конфигурация <b className="text-white">Проекта А ({scenarioA?.meta.title || selectedAId})</b> обеспечивает
                  прирост средней доступности связи на{' '}
                  <b className="text-white font-mono">+{conclusion.avgDeltaAvail.toFixed(1)}%</b> и сокращает
                  максимальные перерывы связи в среднем на{' '}
                  <b className="text-white font-mono">{Math.abs(conclusion.avgDeltaGap).toFixed(1)} мин</b> по
                  сравнению с <b className="text-zinc-400">Проектом Б ({scenarioB?.meta.title || selectedBId})</b>.
                </>
              ) : (
                <>
                  Конфигурация <b className="text-zinc-200">Проекта Б ({scenarioB?.meta.title || selectedBId})</b> превосходит
                  Проект А по доступности на{' '}
                  <b className="text-amber-300 font-mono">+{Math.abs(conclusion.avgDeltaAvail).toFixed(1)}%</b>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 3. Terminal Metric Overview Cards (NO SLIDERS / Чистые данные с парными мини-шкалами) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {simResultA.clients.map((clientA) => {
          const clientB = simResultB?.clients.find((c) => c.client_id === clientA.client_id)
          const availA = clientA.path_availability_pct
          const availB = clientB?.path_availability_pct || 0
          const deltaAvail = availA - availB
          const isGain = deltaAvail >= 0
          const gapA = clientA.max_gap_minutes
          const gapB = clientB?.max_gap_minutes || 0
          const deltaGap = gapA - gapB
          const targetMet = clientA.target_met

          return (
            <div
              key={clientA.client_id}
              className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6),-1px_0_12px_rgba(255,255,255,0.03),1px_0_12px_rgba(255,255,255,0.03)] backdrop-blur-xl flex flex-col justify-between space-y-3"
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
                      : 'bg-[#c8b276]/15 text-[#d8c58f] border-[#c8b276]/30'
                  }`}
                >
                  {targetMet ? 'Цель выполнена' : 'Цель не выполнена'}
                </span>
              </div>

              {/* Main Numbers: Clean & Bold (NO SLIDER KNOBS) */}
              <div className="space-y-1.5 font-sans">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-mono">
                      {availA.toFixed(1)}%
                    </span>
                    <span className="text-xs font-bold text-zinc-400 font-mono">
                      vs {availB.toFixed(1)}% (Б)
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded border ${
                      isGain
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isGain ? `+${deltaAvail.toFixed(1)}%` : `${deltaAvail.toFixed(1)}%`}
                  </span>
                </div>

                {/* Clean Paired Micro-Bars (Lieflat solid comparative lines) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-400 w-4 font-mono">А:</span>
                    <div className="relative flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        style={{ width: `${Math.min(100, availA)}%` }}
                        className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-500 w-4 font-mono">Б:</span>
                    <div className="relative flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <div
                        style={{ width: `${Math.min(100, availB)}%` }}
                        className="h-full bg-zinc-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Max Gap Outage Comparison */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 space-y-1 font-sans">
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
                      deltaGap <= 0 ? 'text-white' : 'text-[#d8c58f]'
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
              <div className="flex justify-between text-[10px] text-zinc-400 pt-0.5 font-mono">
                <span>Прямая радиовидимость КА:</span>
                <span className="text-zinc-200">
                  {clientA.visibility_pct.toFixed(1)}% (А) vs {clientB?.visibility_pct.toFixed(1)}% (Б)
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 4. Full-Fledged Charts Grid (Полноценные аналитические графики Lieflat) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6),-1px_0_12px_rgba(255,255,255,0.03),1px_0_12px_rgba(255,255,255,0.03)] backdrop-blur-xl">
        {/* Chart 1: Paired Availability Chart (F6 Paired Rungs) */}
        <PairedAvailabilityChart
          clientsA={simResultA.clients}
          clientsB={simResultB?.clients}
          targetThreshold={
            scenarioA?.environment.target_availability
              ? Math.round(scenarioA.environment.target_availability * 100)
              : 90
          }
        />

        {/* Chart 2: Hourly Continuous 24h Line & Area Chart (F2/F3 Hairline Area) */}
        <HourlyContinuousLineChart
          simResultA={simResultA}
          simResultB={simResultB}
        />
      </div>

      {/* 5. Parameter Differences Table */}
      <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase font-sans">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span>Различия в параметрах конфигурации</span>
          </div>
          <span className="text-[11px] text-zinc-400">
            Изменений обнаружено:{' '}
            <b className={paramDiffs.length > 0 ? 'text-[#d8c58f] font-mono' : 'text-zinc-300 font-mono'}>
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
                  <th className="pb-2 font-medium text-white">Проект А ({scenarioA?.meta.title || selectedAId})</th>
                  <th className="pb-2 font-medium text-zinc-400">Проект Б ({scenarioB?.meta.title || selectedBId})</th>
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

      {/* 6. Synchronous 24h Continuous Gantt Tracks (With Pale Yellow Warning) */}
      <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.6),-1px_0_14px_rgba(255,255,255,0.04),1px_0_14px_rgba(255,255,255,0.04)] backdrop-blur-xl space-y-4">
        {/* Header & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-300" />
            <h3 className="text-xs font-bold text-white uppercase font-sans tracking-wide">
              Синхронное сопоставление временных шкал связи (24 часа, 00:00 — 24:00 UTC)
            </h3>
          </div>

          {/* Legend with pale desaturated yellow */}
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
              <div
                style={{ backgroundColor: PALE_YELLOW }}
                className="w-3 h-2 rounded-xs"
              />
              <span style={{ color: '#d8c58f' }}>Видимость без маршрута</span>
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
          {/* Grid marks */}
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
                              projectName: `Проект А (${scenarioA?.meta.title || selectedAId})`,
                            })
                          }}
                          onMouseLeave={() => setHoveredTooltip(null)}
                          style={{
                            width: `${b.widthPct}%`,
                            backgroundColor: isConn
                              ? '#ffffff'
                              : isNoRoute
                              ? PALE_YELLOW
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
                                projectName: `Проект Б (${scenarioB?.meta.title || selectedBId})`,
                              })
                            }}
                            onMouseLeave={() => setHoveredTooltip(null)}
                            style={{
                              width: `${b.widthPct}%`,
                              backgroundColor: isConn
                                ? '#a1a1aa'
                                : isNoRoute
                                ? PALE_YELLOW
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
                <AlertTriangle style={{ color: PALE_YELLOW }} className="w-3.5 h-3.5" />
                <span style={{ color: '#d8c58f' }}>
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
