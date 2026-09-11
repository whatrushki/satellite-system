import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { runClientSimulation } from '@/core/simulator'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { Scenario } from '@/core/types'

export const ComparisonView: React.FC = () => {
  const { activeScenario, savedVariants } = useScenarioStore()
  const { simulationResult } = useSimulationStore()

  const [selectedBId, setSelectedBId] = useState<string>('02_first_launch')
  const [scenarioB, setScenarioB] = useState<Scenario | null>(null)

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
  const simResultB = useMemo(() => {
    if (!scenarioB) return null
    try {
      return runClientSimulation(scenarioB)
    } catch (e) {
      console.error(e)
      return null
    }
  }, [scenarioB])

  const simResultA = simulationResult

  // Detect differences in parameters between Scenario A and Scenario B
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

    // Plane differences
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

  // Compute dynamic analytical conclusion based on actual numbers
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

  if (!simResultA || !activeScenario) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono">
        Сначала загрузите базовый сценарий и выполните расчет.
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 space-y-4 font-mono text-slate-200">
      {/* Top Selector Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 text-sky-400">
          <GitCompare className="w-5 h-5" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            СОПОСТАВЛЕНИЕ ВАРИАНТОВ ГРУППИРОВКИ
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Проект А:</span>
            <Badge variant="default" className="text-xs">
              {activeScenario.meta.title}
            </Badge>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-500" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Сравнить с Проектом Б:</span>
            <select
              value={selectedBId}
              onChange={(e) => setSelectedBId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-purple-300 rounded px-2.5 py-1 text-xs cursor-pointer focus:outline-none"
            >
              <optgroup label="Предустановленные сценарии">
                <option value="01_full_constellation">01: Полная группировка (48 КА)</option>
                <option value="02_first_launch">02: Первая очередь (16 КА)</option>
                <option value="03_satellite_outages">03: Отказы 10 аппаратов</option>
                <option value="04_link_range">04: Дальность ISL 2000 км</option>
              </optgroup>
              {savedVariants.length > 0 && (
                <optgroup label="Сохраненные варианты пользователя">
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

      {/* Dynamic Analytical Summary Card */}
      {conclusion && (
        <div
          className={`p-3.5 rounded-lg border flex items-start gap-3 ${
            conclusion.isBetter
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
              : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
          }`}
        >
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <div className="font-bold text-slate-100 flex items-center gap-2">
              <span>Инженерное заключение по сопоставлению:</span>
              <Badge variant={conclusion.isBetter ? 'success' : 'destructive'} className="text-[10px]">
                {conclusion.isBetter
                  ? `Проект А эффективнее на +${conclusion.avgDeltaAvail.toFixed(1)}%`
                  : `Проект А уступает на ${conclusion.avgDeltaAvail.toFixed(1)}%`}
              </Badge>
            </div>
            <p className="text-slate-300">
              {conclusion.isBetter ? (
                <>
                  Конфигурация <b>Проекта А ({activeScenario.meta.title})</b> обеспечивает прирост средней
                  доступности связи на <b>+{conclusion.avgDeltaAvail.toFixed(1)}%</b> и сокращает среднюю
                  продолжительность перерывов на{' '}
                  <b>{Math.abs(conclusion.avgDeltaGap).toFixed(1)} мин</b> по сравнению с{' '}
                  <b>Проектом Б ({scenarioB?.meta.title})</b>.
                </>
              ) : (
                <>
                  Конфигурация <b>Проекта Б ({scenarioB?.meta.title})</b> превосходит Проект А по доступности
                  на <b>+{Math.abs(conclusion.avgDeltaAvail).toFixed(1)}%</b>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Parameter Differences Table */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sky-400">
            <Sliders className="w-4 h-4" />
            РАЗЛИЧИЯ В ПАРАМЕТРАХ КОНФИГУРАЦИИ
          </CardTitle>
          <span className="text-[10px] text-slate-500">
            Изменений обнаружено: <b>{paramDiffs.length}</b>
          </span>
        </CardHeader>
        <CardContent className="pt-3">
          {paramDiffs.length === 0 ? (
            <div className="text-center text-slate-500 py-3 text-xs">
              Параметры обоих проектов идентичны.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 bg-slate-950/60">
                  <tr>
                    <th className="p-2">Параметр проекта</th>
                    <th className="p-2 text-sky-300">Проект А ({activeScenario.meta.title})</th>
                    <th className="p-2 text-purple-300">Проект Б ({scenarioB?.meta.title})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paramDiffs.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-950/40">
                      <td className="p-2 font-medium text-slate-300">{d.param}</td>
                      <td className="p-2 text-sky-400 font-bold">{d.valA}</td>
                      <td className="p-2 text-purple-400 font-bold">{d.valB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Side-by-Side KPI Comparison Cards */}
      <div className="grid grid-cols-3 gap-4">
        {simResultA.clients.map((clientA) => {
          const clientB = simResultB?.clients.find((c) => c.client_id === clientA.client_id)
          const availA = clientA.path_availability_pct
          const availB = clientB?.path_availability_pct || 0
          const deltaAvail = availA - availB

          const gapA = clientA.max_gap_minutes
          const gapB = clientB?.max_gap_minutes || 0
          const deltaGap = gapA - gapB

          return (
            <Card key={clientA.client_id} className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-2 border-b border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-amber-400">{clientA.name}</CardTitle>
                  <span className="text-[10px] text-slate-500">
                    {clientA.client_id} ({clientA.lat_deg}°N, {clientA.lon_deg}°E)
                  </span>
                </div>
                <Badge variant={clientA.target_met ? 'success' : 'destructive'} className="text-[9px]">
                  {clientA.target_met ? 'Цель выполнена' : 'Цель не выполнена'}
                </Badge>
              </CardHeader>

              <CardContent className="pt-3 space-y-3 text-xs">
                {/* Availability Comparison */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Доступность связи:</span>
                    <span className="flex items-center gap-1 font-bold">
                      <span className="text-sky-300">{availA.toFixed(1)}% (А)</span>
                      <span className="text-slate-500">vs</span>
                      <span className="text-purple-300">{availB.toFixed(1)}% (Б)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500">Разница (Δ А - Б):</span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        deltaAvail >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {deltaAvail >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {deltaAvail >= 0 ? `+${deltaAvail.toFixed(1)}%` : `${deltaAvail.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {/* Max Gap Comparison */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Максимальный перерыв:</span>
                    <span className="flex items-center gap-1 font-bold">
                      <span className="text-sky-300">{gapA} мин</span>
                      <span className="text-slate-500">vs</span>
                      <span className="text-purple-300">{gapB} мин</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500">Сокращение перерыва:</span>
                    <span
                      className={`font-bold ${
                        deltaGap <= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {deltaGap <= 0
                        ? `${Math.abs(deltaGap).toFixed(1)} мин (лучше)`
                        : `+${deltaGap.toFixed(1)} мин (хуже)`}
                    </span>
                  </div>
                </div>

                {/* Visibility comparison */}
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>Видимость спутника:</span>
                  <span className="text-slate-200">
                    {clientA.visibility_pct.toFixed(1)}% vs {clientB?.visibility_pct.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Synchronous Dual Timeline Tracks */}
      <Card className="bg-slate-900/80 border-slate-800">
        <CardHeader className="pb-2 border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 text-sky-400">
            <Layers className="w-4 h-4" />
            СИНХРОННОЕ СОПОСТАВЛЕНИЕ ВРЕМЕННЫХ ШКАЛ СВЯЗИ (24 ЧАСА, ШАГ 120 СЕК)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
          {simResultA.clients.map((cA) => {
            const cB = simResultB?.clients.find((c) => c.client_id === cA.client_id)
            return (
              <div key={cA.client_id} className="space-y-1 bg-slate-950/60 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between text-xs font-bold text-amber-400 mb-1">
                  <span>
                    {cA.name} ({cA.client_id})
                  </span>
                </div>

                {/* Track A */}
                <div className="flex items-center gap-2">
                  <span className="w-24 text-[10px] text-sky-400 font-bold">Проект А:</span>
                  <div className="flex-1 h-3.5 bg-slate-900 rounded overflow-hidden flex">
                    {cA.timeline.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          width: `${100 / simResultA.total_steps}%`,
                          backgroundColor:
                            item.status === 'connected'
                              ? '#10b981'
                              : item.status === 'visible_no_route'
                              ? '#f59e0b'
                              : '#f43f5e',
                        }}
                      />
                    ))}
                  </div>
                  <span className="w-14 text-right text-[11px] font-bold text-sky-300">
                    {cA.path_availability_pct.toFixed(1)}%
                  </span>
                </div>

                {/* Track B */}
                {cB && (
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[10px] text-purple-400 font-bold">Проект Б:</span>
                    <div className="flex-1 h-3.5 bg-slate-900 rounded overflow-hidden flex">
                      {cB.timeline.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            width: `${100 / (simResultB?.total_steps || 1)}%`,
                            backgroundColor:
                              item.status === 'connected'
                                ? '#10b981'
                                : item.status === 'visible_no_route'
                                ? '#f59e0b'
                                : '#f43f5e',
                          }}
                        />
                      ))}
                    </div>
                    <span className="w-14 text-right text-[11px] font-bold text-purple-300">
                      {cB.path_availability_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
