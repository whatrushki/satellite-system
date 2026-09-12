import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { OrbitConfigurator } from '@/components/sidebar/OrbitConfigurator'
import { OutageManager } from '@/components/sidebar/OutageManager'
import { Radio, Network, CheckCircle2, XCircle, MapPin, Server, Signal } from 'lucide-react'
import { computeRealtimeCoverage } from '@/core/coverageEngine'

export const FleetSidebar: React.FC = () => {
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    selectedSatelliteId,
    setSelectedSatellite,
    selectedTarget,
    setSelectedStation,
    clearSelection,
    simulationResult,
    selectedClientId,
    coverageElevation,
  } = useSimulationStore()

  const [planeFilter, setPlaneFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3'>('ALL')
  const [activeTab, setActiveTab] = useState<'fleet' | 'stations' | 'orbits' | 'outages'>('fleet')

  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap = useMemo(() => {
    if (!simulationResult?.snapshots || simulationResult.snapshots.length === 0) return null
    return simulationResult.snapshots[Math.min(idx, simulationResult.snapshots.length - 1)]
  }, [simulationResult, idx])

  const clientData = useMemo(() => {
    return simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  }, [simulationResult, selectedClientId])

  const activeRoutePath = useMemo(() => {
    const currentTimelineItem = clientData?.timeline.find((item) => item.t_s === idx * step)
    return currentTimelineItem?.path || []
  }, [clientData, idx, step])

  const satsList = useMemo(() => {
    if (!currentSnap) return []
    return currentSnap.satellites.filter((s) => {
      if (planeFilter !== 'ALL' && s.plane_id !== planeFilter) return false
      return true
    })
  }, [currentSnap, planeFilter])

  const activeSatsCount = useMemo(() => {
    return currentSnap?.satellites.filter((s) => s.active).length ?? 0
  }, [currentSnap])

  const totalSatsCount = activeScenario?.design.satellites.length ?? 48

  // Pre-calculate ISL counts per sat
  const islCounts = useMemo(() => {
    const counts = new Map<string, number>()
    if (!currentSnap) return counts
    for (const [u, v] of currentSnap.edges) {
      if (!u.startsWith('C') && !u.startsWith('G') && !v.startsWith('C') && !v.startsWith('G')) {
        counts.set(u, (counts.get(u) || 0) + 1)
        counts.set(v, (counts.get(v) || 0) + 1)
      }
    }
    return counts
  }, [currentSnap])

  const satConfigMap = useMemo(() => {
    const map = new Map<string, { plane_id: string; slot_deg: number; launch_batch: number }>()
    if (!activeScenario) return map
    for (const s of activeScenario.design.satellites) {
      map.set(s.id, s)
    }
    return map
  }, [activeScenario])

  const coverageMetrics = useMemo(() => {
    if (!activeScenario || !currentSnap) return null
    return computeRealtimeCoverage(
      activeScenario,
      currentSnap.satellites.map((s) => ({
        id: s.id,
        plane_id: s.plane_id || '',
        active: s.active,
        x_km: s.x_km,
        y_km: s.y_km,
        z_km: s.z_km,
      })),
      coverageElevation || 10.0,
      activeRoutePath
    )
  }, [activeScenario, currentSnap, coverageElevation, activeRoutePath])

  const singleSatAreaMkm2 = coverageMetrics?.singleFootprintAreaMkm2 ?? 8.7
  const singleSatRadiusKm = coverageMetrics?.footprintRadiusKm ?? 1665

  if (!activeScenario || !simulationResult) {
    return (
      <div
        style={{
          width: '280px',
          height: '100%',
          borderRadius: '20px',
          background: 'rgba(15, 18, 24, 0.40)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
        }}
        className="p-4 flex items-center justify-center text-xs font-mono text-zinc-500"
      >
        <span>Загрузка группировки...</span>
      </div>
    )
  }

  const minEl = activeScenario.environment.min_elevation_deg

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        borderRadius: '20px',
        background: 'rgba(15, 18, 24, 0.70)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
      }}
      className="select-none font-mono shadow-2xl shrink-0 flex flex-col overflow-hidden text-zinc-200"
    >
      {/* Header Section */}
      <div className="p-3.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Subtab switcher */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-xl border border-white/10 text-[9.5px] font-sans">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                activeTab === 'fleet' ? 'bg-white/20 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Флот
            </button>
            <button
              onClick={() => setActiveTab('stations')}
              className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                activeTab === 'stations' ? 'bg-white/20 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Станции
            </button>
            <button
              onClick={() => setActiveTab('orbits')}
              className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                activeTab === 'orbits' ? 'bg-white/20 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Орбиты
            </button>
            <button
              onClick={() => setActiveTab('outages')}
              className={`px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors ${
                activeTab === 'outages' ? 'bg-white/20 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Отказы
            </button>
          </div>

          <span className="text-[10px] font-mono text-zinc-200 font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/10 shrink-0 ml-1.5">
            {activeSatsCount}/{totalSatsCount}
          </span>
        </div>

        {activeTab === 'fleet' && (
          <div className="flex items-center gap-1 mt-2.5">
            {(['ALL', 'P1', 'P2', 'P3'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlaneFilter(p)}
                className={`flex-1 py-0.5 rounded-lg text-[10px] font-sans font-semibold transition-colors cursor-pointer border ${
                  planeFilter === p
                    ? 'bg-white text-zinc-950 font-bold border-white'
                    : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
        {activeTab === 'orbits' && <OrbitConfigurator />}
        {activeTab === 'outages' && <OutageManager />}
        {activeTab === 'stations' && (
          <div className="flex flex-col gap-2.5">
            {/* 1. Gateways section */}
            <div className="text-[10px] uppercase font-bold text-zinc-400 px-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Server className="w-3 h-3 text-zinc-300" />
                <span>Шлюзы опорной сети</span>
              </span>
              <span className="font-mono text-zinc-500">
                {activeScenario.ground_sites.filter((g) => g.role === 'gateway').length}
              </span>
            </div>

            <div className="space-y-1.5">
              {activeScenario.ground_sites
                .filter((g) => g.role === 'gateway')
                .map((gw) => {
                  const isOffline = (activeScenario.gateway_outages || []).some(
                    (f) => f.gateway_id === gw.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
                  )
                  const isSelected = selectedTarget?.type === 'ground' && selectedTarget.id === gw.id
                  const elevMap = currentSnap?.elevation_deg[gw.id] || {}
                  const visibleSats = Object.entries(elevMap).filter(
                    ([sid, el]) => el >= minEl && currentSnap?.satellites.find((s) => s.id === sid)?.active
                  )

                  return (
                    <div
                      key={gw.id}
                      onClick={() => {
                        if (isSelected) {
                          clearSelection()
                        } else {
                          setSelectedStation(gw.id)
                        }
                      }}
                      className={`p-2 rounded-xl transition-all cursor-pointer border text-xs ${
                        isSelected
                          ? 'bg-white/15 border-white/40 shadow-sm'
                          : isOffline
                          ? 'bg-rose-950/25 border-rose-500/30 hover:border-rose-500/50'
                          : 'bg-black/35 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono text-[11px]">{gw.id}</span>
                          <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">{gw.name}</span>
                        </div>
                        <span
                          className={`text-[8px] px-1.5 py-0.2 rounded font-sans font-bold uppercase border ${
                            isOffline
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse'
                              : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isOffline ? 'Отказ' : 'В сети'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400 font-mono pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{gw.lat_deg.toFixed(1)}°N, {gw.lon_deg.toFixed(1)}°E</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Radio className="w-3 h-3 text-zinc-500" />
                          <span>КА: </span>
                          <b className={visibleSats.length > 0 ? 'text-white' : 'text-zinc-500'}>
                            {visibleSats.length}
                          </b>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* 2. Clients section */}
            <div className="text-[10px] uppercase font-bold text-zinc-400 px-1 pt-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Signal className="w-3 h-3 text-zinc-300" />
                <span>Терминалы абонентов (СМП)</span>
              </span>
              <span className="font-mono text-zinc-500">
                {activeScenario.ground_sites.filter((g) => g.role === 'client').length}
              </span>
            </div>

            <div className="space-y-1.5">
              {activeScenario.ground_sites
                .filter((g) => g.role === 'client')
                .map((cl) => {
                  const isSelected =
                    (selectedTarget?.type === 'ground' && selectedTarget.id === cl.id) ||
                    (!selectedTarget && selectedClientId === cl.id)
                  const clientSummary = simulationResult?.clients.find((c) => c.client_id === cl.id)
                  const curItem = clientSummary?.timeline.find((t) => t.t_s === idx * step)
                  const isConn = curItem?.status === 'connected'
                  const elevMap = currentSnap?.elevation_deg[cl.id] || {}
                  const hasVis = Object.values(elevMap).some((el) => el >= minEl)

                  return (
                    <div
                      key={cl.id}
                      onClick={() => {
                        if (selectedTarget?.type === 'ground' && selectedTarget.id === cl.id) {
                          clearSelection()
                        } else {
                          setSelectedStation(cl.id)
                        }
                      }}
                      className={`p-2 rounded-xl transition-all cursor-pointer border text-xs ${
                        isSelected
                          ? 'bg-white/15 border-white/40 shadow-sm'
                          : 'bg-black/35 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-mono text-[11px]">{cl.id}</span>
                          <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">{cl.name}</span>
                        </div>
                        <span
                          className={`text-[8px] px-1.5 py-0.2 rounded font-sans font-bold uppercase border ${
                            isConn
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : hasVis
                              ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                              : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {isConn ? 'Маршрут OK' : hasVis ? 'Разрыв МИС' : 'Вне зоны'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400 font-mono pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{cl.lat_deg.toFixed(1)}°N</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Готовность: </span>
                          <b className="text-white">
                            {clientSummary?.path_availability_pct.toFixed(0)}%
                          </b>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
        {activeTab === 'fleet' && (
          <div className="flex flex-col gap-1.5">
            {/* Live Constellation Coverage Header Banner */}
            {coverageMetrics && (
              <div className="bg-black/50 border border-white/10 rounded-xl p-2 font-mono text-[10px] space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1.5 font-bold tracking-wider text-[9.5px] uppercase text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" />
                    <span>Радиопокрытие сети</span>
                  </span>
                  <span className="text-[8.5px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans font-bold uppercase">
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                    <div className="text-[8.5px] text-zinc-400 uppercase tracking-wide">Земной шар</div>
                    <div className="text-xs font-black text-white mt-0.5 tabular-nums">
                      {coverageMetrics.totalCoveredAreaMkm2}{' '}
                      <span className="text-[8.5px] text-zinc-400 font-normal">млн км²</span>
                    </div>
                    <div className="text-[8.5px] text-zinc-400 mt-0.5">
                      {coverageMetrics.globalCoveragePct}% Земли
                    </div>
                  </div>

                  <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                    <div className="text-[8.5px] text-zinc-400 uppercase tracking-wide">Арктика (≥65°)</div>
                    <div className="text-xs font-black text-emerald-400 mt-0.5 tabular-nums flex items-center gap-1">
                      <span>{coverageMetrics.arcticCoveragePct}%</span>
                    </div>
                    <div className="text-[8.5px] text-zinc-400 mt-0.5">
                      {coverageMetrics.activeSatsInArctic} КА над регионом
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List of satellite cards with per-satellite coverage telemetry */}
            {satsList.map((sat) => {
              const isSelected = sat.id === selectedSatelliteId
              const isInRoute = activeRoutePath.includes(sat.id)
              const cfg = satConfigMap.get(sat.id)
              const elev = currentSnap?.elevation_deg[selectedClientId]?.[sat.id] ?? null
              const isVisible = elev != null && elev >= minEl && sat.active
              const linksCount = islCounts.get(sat.id) || 0

              // Sub-satellite nadir point latitude & Arctic status
              const len = Math.hypot(sat.x_km, sat.y_km, sat.z_km)
              const latDeg = len > 0 ? (Math.asin(Math.max(-1, Math.min(1, sat.z_km / len))) * 180) / Math.PI : 0
              const isArctic = latDeg >= 60.0
              const latStr = `${Math.abs(latDeg).toFixed(0)}°${latDeg >= 0 ? 'N' : 'S'}`

              return (
                <div
                  key={sat.id}
                  onClick={() => {
                    if (isSelected) {
                      clearSelection()
                    } else {
                      setSelectedSatellite(sat.id)
                    }
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer border text-xs ${
                    isSelected
                      ? 'bg-white/15 border-white/40 shadow-sm'
                      : isInRoute
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-black/35 border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Top line: Satellite ID + Plane + Slot + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white font-mono text-[11px]">
                        КА {sat.id}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono bg-white/5 px-1 rounded border border-white/5">
                        {sat.plane_id}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {cfg?.slot_deg.toFixed(0)}°
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isInRoute && (
                        <span className="text-[8px] bg-emerald-400 text-zinc-950 font-bold font-sans px-1.5 py-0.2 rounded uppercase">
                          Маршрут
                        </span>
                      )}
                      <span
                        className={`text-[8px] px-1.5 py-0.2 rounded font-sans font-bold uppercase border ${
                          sat.active
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {sat.active ? 'Активен' : 'Отказ'}
                      </span>
                    </div>
                  </div>

                  {/* Second line: Footprint Area + Nadir Position */}
                  <div className="flex items-center justify-between mt-1 text-[9.5px] text-zinc-400 font-mono pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Зона:</span>
                      <span className={sat.active ? 'text-zinc-200 font-semibold' : 'text-zinc-600'}>
                        {sat.active ? `${singleSatAreaMkm2} млн км²` : '0'}
                      </span>
                      <span className="text-[8.5px] text-zinc-500 hidden sm:inline">
                        (R={singleSatRadiusKm}км)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Надир:</span>
                      <span className="font-semibold text-zinc-300">
                        {latStr}
                      </span>
                    </div>
                  </div>

                  {/* Third line: Radio Elevation to selected client & ISL links */}
                  <div className="flex items-center justify-between mt-1 text-[9.5px] text-zinc-400 font-mono">
                    <div className="flex items-center gap-1">
                      <Radio className="w-3 h-3 text-zinc-500" />
                      <span>{selectedClientId}:</span>
                      <b
                        className={
                          isVisible
                            ? 'text-emerald-300 font-bold'
                            : elev != null
                            ? 'text-zinc-400'
                            : 'text-zinc-600'
                        }
                      >
                        {elev != null ? `${elev.toFixed(0)}°` : '—'}
                      </b>
                      {isVisible && (
                        <span className="text-[7.5px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-1 rounded uppercase">
                          В зоне
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Network className="w-3 h-3 text-zinc-500" />
                      <span>ISL:</span>
                      <b className={linksCount > 0 ? 'text-zinc-200' : 'text-zinc-500'}>
                        {linksCount}
                      </b>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
