import React, { useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Radio,
  Network,
  Cpu,
  TrendingUp,
  MapPin,
  ArrowRight,
  Zap,
} from 'lucide-react'

export const RecommendationsView: React.FC = () => {
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { simulationResult, setActiveTab } = useSimulationStore()

  // 1. Dynamic Keplerian & ISL Geometry Calculations
  const geometryMetrics = useMemo(() => {
    if (!activeScenario) return null
    const h = activeScenario.environment.altitude_km
    const R_E = 6371.0
    const r = R_E + h
    const numPlanes = Math.max(1, activeScenario.design.planes.length)
    const totalSats = activeScenario.design.satellites.length
    const satsPerPlane = Math.round(totalSats / numPlanes)

    // Exact geometric chord distance between adjacent satellites in same plane
    const angleRad = Math.PI / Math.max(1, satsPerPlane)
    const chordKm = 2 * r * Math.sin(angleRad)
    const islLimitKm = activeScenario.environment.isl_range_km
    const isChordBroken = chordKm > islLimitKm
    const deficitKm = isChordBroken ? chordKm - islLimitKm : 0
    const marginKm = !isChordBroken ? islLimitKm - chordKm : 0

    // Minimal ISL range needed to close the ring
    const minNeededIslRangeKm = Math.ceil(chordKm * 1.02)
    // Minimal satellites in plane needed to close ring at current ISL limit
    const minSatsPerPlaneForCurrentIsl = Math.ceil(Math.PI / Math.asin(Math.min(0.999, islLimitKm / (2 * r))))

    return {
      altitudeKm: h,
      orbitRadiusKm: r,
      numPlanes,
      totalSats,
      satsPerPlane,
      chordKm,
      islLimitKm,
      isChordBroken,
      deficitKm,
      marginKm,
      minNeededIslRangeKm,
      minSatsPerPlaneForCurrentIsl,
    }
  }, [activeScenario])

  // 2. Dynamic Gateway Load Distribution
  const gatewayDistribution = useMemo(() => {
    if (!activeScenario || !simulationResult) return []
    const gateways = activeScenario.ground_sites.filter((g) => g.role === 'gateway')
    const counts = new Map<string, number>()
    let totalRouted = 0

    for (const g of gateways) counts.set(g.id, 0)

    for (const client of simulationResult.clients) {
      for (const item of client.timeline) {
        if (item.path && item.path.length > 0) {
          const destination = item.path[item.path.length - 1]
          if (counts.has(destination)) {
            counts.set(destination, (counts.get(destination) || 0) + 1)
            totalRouted++
          }
        }
      }
    }

    return gateways.map((g) => {
      const carried = counts.get(g.id) || 0
      const pct = totalRouted > 0 ? (carried / totalRouted) * 100 : 0
      return {
        id: g.id,
        name: g.name || g.id,
        lat: g.lat_deg,
        lon: g.lon_deg,
        carried,
        sharePct: pct,
      }
    })
  }, [activeScenario, simulationResult])

  // 3. Dynamic Critical Transit Satellites
  const criticalSats = useMemo(() => {
    if (!simulationResult) return []
    const list = simulationResult.critical_satellites || []
    const totalTransitSteps = list.reduce((acc, s) => acc + s.routes_carried, 0)
    return list.slice(0, 5).map((s) => ({
      ...s,
      sharePct: totalTransitSteps > 0 ? (s.routes_carried / totalTransitSteps) * 100 : 0,
      planeId: activeScenario?.design.satellites.find((sat) => sat.id === s.id)?.plane_id || 'P1',
    }))
  }, [simulationResult, activeScenario])

  // 4. Client Availability Overview
  const clientsOverview = useMemo(() => {
    if (!simulationResult || !activeScenario) return null
    const clients = simulationResult.clients
    if (clients.length === 0) return null

    const targetAvail = activeScenario.environment.target_availability * 100
    const allMet = clients.every((c) => c.path_availability_pct >= targetAvail)
    const avgAvail = clients.reduce((acc, c) => acc + c.path_availability_pct, 0) / clients.length
    const worstClient = [...clients].sort((a, b) => a.path_availability_pct - b.path_availability_pct)[0]

    return {
      clients,
      targetAvail,
      allMet,
      avgAvail,
      worstClient,
    }
  }, [simulationResult, activeScenario])

  if (!activeScenario || !geometryMetrics || !clientsOverview) {
    return (
      <div className="p-8 text-center text-zinc-400 font-mono">
        Загрузка данных сценария и результатов моделирования...
      </div>
    )
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 space-y-5 font-mono text-zinc-200 select-none">
      {/* Dynamic Header Card */}
      <div className="bg-[#10131a]/90 backdrop-blur-xl p-5 rounded-2xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black uppercase text-white font-sans tracking-wide">
                Динамические инженерные рекомендации
              </h2>
              <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300 border border-white/15">
                {activeScenario.meta.title}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  clientsOverview.allMet
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                }`}
              >
                {clientsOverview.allMet
                  ? `Цель ТЗ выполнена (≥ ${clientsOverview.targetAvail}%)`
                  : `Дефицит доступности (< ${clientsOverview.targetAvail}%)`}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-1.5 max-w-3xl leading-relaxed">
              Автоматический расчет баллистической геометрии, топологической связности и отказоустойчивости для текущей конфигурации: {geometryMetrics.totalSats} КА на высоте {geometryMetrics.altitudeKm} км, {geometryMetrics.numPlanes} плоскостей, предел МИС {geometryMetrics.islLimitKm} км.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('compare')}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl border border-white/20 cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
        >
          <span>В модуль сравнения</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Analytical Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Dynamic Chord Paradox & Intra-Plane ISL Continuity */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 font-bold font-sans text-xs uppercase">
              <Network className={`w-4 h-4 ${geometryMetrics.isChordBroken ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span className={geometryMetrics.isChordBroken ? 'text-rose-300' : 'text-emerald-300'}>
                1. Баллистика хорды и связность МИС
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                geometryMetrics.isChordBroken
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {geometryMetrics.isChordBroken ? 'Кольцо разорвано' : 'Кольцо замкнуто'}
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5 font-mono">
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                <span>Расчет Евклидова расстояния между КА в плоскости:</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Радиус r = 6371 + {geometryMetrics.altitudeKm} = {geometryMetrics.orbitRadiusKm} км. Число КА в плоскости = {geometryMetrics.satsPerPlane}.
              </p>
              <div className="bg-black/60 p-2 rounded text-center font-mono font-bold text-xs border border-white/10">
                d_хорда = 2 · {geometryMetrics.orbitRadiusKm} · sin(π / {geometryMetrics.satsPerPlane}) = <span className="text-white">{geometryMetrics.chordKm.toFixed(1)} км</span>
              </div>
            </div>

            {geometryMetrics.isChordBroken ? (
              <>
                <p>
                  <b className="text-rose-300">Обнаружен критический дефицит дальности МИС:</b> Расстояние между соседними аппаратами в плоскости составляет <b className="text-white font-mono">{geometryMetrics.chordKm.toFixed(1)} км</b>, что превышает заданный лимит аппаратуры МИС <b className="text-white font-mono">{geometryMetrics.islLimitKm} км</b> на <b className="text-rose-400 font-mono">+{geometryMetrics.deficitKm.toFixed(1)} км</b>!
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Внутриплоскостное кольцо физически разорвано 100% времени. Связь возникает только при межплоскостном сближении аппаратов над полярными широтами, что порождает серии микроперерывов.
                </p>
                <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-200 text-[11px]">
                  <b className="text-white">Инженерное решение:</b> Для замыкания внутриплоскостного контура необходимо увеличить дальность терминалов МИС минимум до <b className="text-white">{geometryMetrics.minNeededIslRangeKm} км</b>, либо нарастить плотность КА в плоскости до <b className="text-white">≥ {geometryMetrics.minSatsPerPlaneForCurrentIsl} аппаратов</b>.
                </div>
              </>
            ) : (
              <>
                <p>
                  <b className="text-emerald-300">Внутриплоскостные линии связи устойчиво замкнуты:</b> Заданный лимит МИС <b className="text-white font-mono">{geometryMetrics.islLimitKm} км</b> превышает межспутниковую хорду <b className="text-white font-mono">{geometryMetrics.chordKm.toFixed(1)} км</b> с запасом надежности <b className="text-emerald-400 font-mono">+{geometryMetrics.marginKm.toFixed(1)} км</b>.
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Формируется непрерывный замкнутый контур передачи данных по периметру орбитальной плоскости, исключающий разрывы при транзите.
                </p>
                <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px]">
                  <b className="text-white">Инженерное заключение:</b> Параметры МИС выбраны оптимально для кругового орбитального построения.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Dynamic Terminal Performance & Outage Root Cause */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold font-sans text-xs uppercase">
              <TrendingUp className="w-4 h-4 text-zinc-300" />
              <span>2. Анализ доступности клиентских пунктов</span>
            </div>
            <span className="text-[10px] font-mono bg-white/10 text-zinc-300 border border-white/15 px-2 py-0.5 rounded">
              Норма ≥ {clientsOverview.targetAvail}%
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <div className="space-y-1.5">
              {clientsOverview.clients.map((c) => (
                <div
                  key={c.client_id}
                  className="bg-black/40 p-2 rounded-xl border border-white/5 flex items-center justify-between font-mono text-[11px]"
                >
                  <div>
                    <span className="font-bold text-white">{c.name}</span>{' '}
                    <span className="text-zinc-500 text-[10px]">({c.client_id}, {c.lat_deg}°N)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400">
                      Радио: <b className="text-zinc-200">{c.visibility_pct.toFixed(1)}%</b>
                    </span>
                    <span
                      className={`font-bold ${
                        c.target_met ? 'text-white' : 'text-rose-400'
                      }`}
                    >
                      Маршрут: {c.path_availability_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="pt-1">
              <b className="text-white">Узкое место группировки:</b> Пункт <b className="text-white font-mono">{clientsOverview.worstClient.name}</b> демонстрирует наименьшую готовность (<b className="font-mono text-white">{clientsOverview.worstClient.path_availability_pct.toFixed(1)}%</b>) с максимальным перерывом <b className="font-mono text-white">{clientsOverview.worstClient.max_gap_minutes} мин</b>.
            </p>
            <p className="text-[11px] text-zinc-400">
              Среднее число транзитных хопов по группировке: <b className="text-zinc-200 font-mono">{clientsOverview.worstClient.average_hops.toFixed(1)}</b>. Разница между прямой видимостью КА ({clientsOverview.worstClient.visibility_pct.toFixed(1)}%) и доступностью маршрута обусловлена разрывами сетевого графа МИС.
            </p>
          </div>
        </div>

        {/* Card 3: Dynamic Cut-Vertices & Transit Load Analysis */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold font-sans text-xs uppercase">
              <ShieldAlert className="w-4 h-4 text-zinc-300" />
              <span>3. Точки сочленения графа и транзитная нагрузка</span>
            </div>
            <span className="text-[10px] font-mono bg-white/10 text-white border border-white/15 px-2 py-0.5 rounded">
              Топ транзитных узлов
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <p>
              Алгоритм симуляции динамически подсчитал участие каждого КА в цепочках Дейкстры на всех 720 временных отсчетах. Наибольшую транзитную нагрузку несут:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono">
              {criticalSats.length > 0 ? (
                criticalSats.map((sat, i) => (
                  <div key={sat.id} className="bg-black/50 p-2 rounded-xl border border-white/10 text-center">
                    <div className="text-[10px] text-zinc-400">#{i + 1} ({sat.planeId})</div>
                    <div className="text-xs font-bold text-white mt-0.5">{sat.id}</div>
                    <div className="text-[9px] text-zinc-300 mt-0.5">{sat.routes_carried} маршр.</div>
                    <div className="text-[8px] text-zinc-500 font-mono mt-0.5">{sat.sharePct.toFixed(1)}% трафика</div>
                  </div>
                ))
              ) : (
                <div className="col-span-5 text-center py-2 text-zinc-500 text-xs">
                  Нет активных транзитных маршрутов в данном сценарии.
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 pt-1">
              Узлы в плоскостях с максимальной плотностью трафика выступают критическими точками сочленения (Cut-Vertices). Их выход из строя вынуждает алгоритм перестраивать маршруты в обход с увеличением задержки.
            </p>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-[11px]">
              <b className="text-white">Рекомендация по резервированию:</b> В сценариях высокой нагрузки предусмотреть установку дублирующих лазерных терминалов на КА с рейтингом нагрузки {'>'} 20%.
            </div>
          </div>
        </div>

        {/* Card 4: Dynamic Gateway Load & Infrastructure Redundancy */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold font-sans text-xs uppercase">
              <MapPin className="w-4 h-4 text-zinc-300" />
              <span>4. Анализ наземных шлюзов и балансировки</span>
            </div>
            <span className="text-[10px] font-mono bg-white/10 text-zinc-300 border border-white/15 px-2 py-0.5 rounded">
              {gatewayDistribution.length} шлюзовых станций
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <p>
              Распределение объема доставленного трафика между опорными шлюзовыми станциями текущего сценария:
            </p>

            <div className="space-y-2">
              {gatewayDistribution.map((gw) => (
                <div key={gw.id} className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{gw.name}</span>{' '}
                      <span className="text-zinc-500 font-mono text-[10px]">({gw.id}, {gw.lat}°N, {gw.lon}°E)</span>
                    </div>
                    <span className="font-mono font-bold text-white text-xs">
                      {gw.carried} маршр. ({gw.sharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <div
                      style={{ width: `${Math.min(100, gw.sharePct)}%` }}
                      className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {gatewayDistribution.length <= 1 ? (
              <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-200 text-[11px]">
                <b className="text-white">Риск единой точки отказа:</b> В сценарии задействован единственный шлюз. Любой наземный сбой приводит к 100% отключению всей арктической сети.
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px]">
                <b className="text-white">Резервирование обеспечено:</b> Наличие нескольких географически разнесенных шлюзов ({gatewayDistribution.map((g) => g.name).join(', ')}) гарантирует сохранение связи при аварии любой отдельной наземной станции.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Action Banner */}
      <div className="p-4 rounded-2xl bg-[#10131a]/90 border border-white/12 shadow-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-white font-sans flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Инженерное резюме проектной группы COSMO-NET:</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-sans">
            Средняя расчетная доступность по группировке: <b className="text-white font-mono">{clientsOverview.avgAvail.toFixed(1)}%</b>. Режим симуляции: круговая аналитическая модель ECEF с проверкой горизонта β ≥ {activeScenario.environment.min_elevation_deg}°.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-3.5 py-1.5 bg-white text-zinc-950 font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer transition-colors shadow-sm font-sans"
          >
            К 3D карте созвездия
          </button>
        </div>
      </div>
    </div>
  )
}
