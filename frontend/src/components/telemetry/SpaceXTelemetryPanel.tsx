import React, { useMemo } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import {
  AlertTriangle,
  ArrowRight,
  Radio,
  Network,
  ZapOff,
  CheckCircle2,
  XCircle,
  Compass,
  Download,
  Server,
  Signal,
  MapPin,
  X,
  Activity,
  Layers,
} from 'lucide-react'
import { groundPosition, computeSnapshot } from '@/core/geometryEngine'
import { findRoute } from '@/core/router'
import { classifyFailureReason } from '@/core/diagnostics'

export const SpaceXTelemetryPanel: React.FC = () => {
  const {
    currentTime_s,
    selectedClientId,
    selectedSatelliteId,
    selectedTarget,
    setSelectedSatellite,
    setSelectedStation,
    clearSelection,
    simulationResult,
    recalculate,
  } = useSimulationStore()

  const {
    activeScenario,
    killSatelliteNow,
    restoreSatelliteNow,
    clearAllSatelliteFailures,
    killGatewayNow,
    restoreGatewayNow,
  } = useScenarioStore()

  // Real-time snapshot computed continuously for currentTime_s
  const liveSnap = useMemo(() => {
    if (!activeScenario) return null
    return computeSnapshot(activeScenario, currentTime_s)
  }, [activeScenario, currentTime_s])

  const liveGateways = useMemo(() => {
    const s = new Set<string>()
    if (!activeScenario) return s
    for (const g of activeScenario.ground_sites) {
      if (g.role === 'gateway') {
        const isOffline = (activeScenario.gateway_outages || []).some(
          (f) => f.gateway_id === g.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
        )
        if (!isOffline) s.add(g.id)
      }
    }
    return s
  }, [activeScenario, currentTime_s])

  const liveActiveSatIds = useMemo(() => {
    const s = new Set<string>()
    if (!liveSnap) return s
    for (const sat of liveSnap.satellites) {
      if (sat.active) s.add(sat.id)
    }
    return s
  }, [liveSnap])

  const liveRoute = useMemo(() => {
    if (!activeScenario || !liveSnap || !selectedClientId) return null
    return findRoute(liveSnap, activeScenario, selectedClientId, liveGateways)
  }, [activeScenario, liveSnap, selectedClientId, liveGateways])

  const isConnected = !!liveRoute && liveRoute.path.length >= 2

  const liveFailureReason = useMemo(() => {
    if (isConnected || !activeScenario || !liveSnap || !selectedClientId) return null
    const allGateways = new Set(
      activeScenario.ground_sites.filter((g) => g.role === 'gateway').map((g) => g.id)
    )
    return classifyFailureReason(
      activeScenario,
      liveSnap,
      selectedClientId,
      allGateways,
      liveActiveSatIds
    )
  }, [isConnected, activeScenario, liveSnap, selectedClientId, liveActiveSatIds])

  // Selected Satellite
  const satId = selectedSatelliteId || 'S01'
  const satObj = useMemo(() => {
    return liveSnap?.satellites.find((s) => s.id === satId)
  }, [liveSnap, satId])

  const isSatFailed = satObj ? !satObj.active : false

  // Selected client site
  const clientSite = useMemo(() => {
    return activeScenario?.ground_sites.find((g) => g.id === selectedClientId) || null
  }, [activeScenario, selectedClientId])

  // Murmansk gateway
  const gatewaySite = useMemo(() => {
    return activeScenario?.ground_sites.find((g) => g.role === 'gateway') || null
  }, [activeScenario])

  // Elevation to selected client
  const clientElevation = useMemo(() => {
    if (!liveSnap || !selectedClientId) return null
    const elevMap = liveSnap.elevation_deg[selectedClientId] || {}
    return elevMap[satId] ?? null
  }, [liveSnap, selectedClientId, satId])

  // Elevation to gateway
  const gatewayElevation = useMemo(() => {
    if (!liveSnap || !gatewaySite) return null
    const elevMap = liveSnap.elevation_deg[gatewaySite.id] || {}
    return elevMap[satId] ?? null
  }, [liveSnap, gatewaySite, satId])

  // Active ISL connections for this satellite
  const activeISLs = useMemo(() => {
    if (!liveSnap) return []
    const links: Array<{ peerId: string; distanceKm: number }> = []
    for (const [u, v, dist] of liveSnap.edges) {
      if (u === satId && !u.startsWith('C') && !u.startsWith('G') && !v.startsWith('C') && !v.startsWith('G')) {
        links.push({ peerId: v, distanceKm: Math.round(dist) })
      } else if (v === satId && !u.startsWith('C') && !u.startsWith('G') && !v.startsWith('C') && !v.startsWith('G')) {
        links.push({ peerId: u, distanceKm: Math.round(dist) })
      }
    }
    return links
  }, [liveSnap, satId])

  // Sub-satellite Nadir point (lat/lon)
  const nadirCoords = useMemo(() => {
    if (!satObj) return null
    const r = Math.hypot(satObj.x_km, satObj.y_km, satObj.z_km)
    const lat = Math.asin(satObj.z_km / r) * (180 / Math.PI)
    const lon = Math.atan2(satObj.y_km, satObj.x_km) * (180 / Math.PI)
    return { lat: lat.toFixed(1), lon: lon.toFixed(1) }
  }, [satObj])

  // Check role in current route
  const routeRole = useMemo(() => {
    if (!isConnected || !liveRoute?.path) return 'STANDBY'
    const path = liveRoute.path
    if (!path.includes(satId)) return 'STANDBY'
    if (path[1] === satId) return 'CLIENT_ACCESS'
    if (path[path.length - 2] === satId) return 'GATEWAY_LINK'
    return 'TRANSIT_RELAY'
  }, [isConnected, liveRoute, satId])

  const satFailure = useMemo(() => {
    return (activeScenario?.failures || []).find(
      (f) => f.satellite_id === satId && f.start_s <= currentTime_s && currentTime_s < f.end_s
    )
  }, [activeScenario, satId, currentTime_s])

  const totalSatFailures = useMemo(() => {
    return (activeScenario?.failures || []).filter((f) => f.satellite_id === satId)
  }, [activeScenario, satId])

  const formatSec = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`
  }

  const isGroundSelected = selectedTarget?.type === 'ground'
  const groundSite = useMemo(() => {
    if (!isGroundSelected || !activeScenario) return null
    return activeScenario.ground_sites.find((g) => g.id === selectedTarget.id) || null
  }, [isGroundSelected, activeScenario, selectedTarget])

  const isGateway = groundSite?.role === 'gateway'

  const isGatewayOffline = useMemo(() => {
    if (!groundSite || !isGateway || !activeScenario) return false
    return (activeScenario.gateway_outages || []).some(
      (f) => f.gateway_id === groundSite.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
    )
  }, [groundSite, isGateway, activeScenario, currentTime_s])

  const gatewayFailure = useMemo(() => {
    if (!groundSite || !isGateway || !activeScenario) return null
    return (activeScenario.gateway_outages || []).find(
      (f) => f.gateway_id === groundSite.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
    )
  }, [groundSite, isGateway, activeScenario, currentTime_s])

  const groundElevations = useMemo(() => {
    if (!groundSite || !liveSnap) return []
    const elevMap = liveSnap.elevation_deg[groundSite.id] || {}
    const list: Array<{ id: string; plane: string; elev: number; active: boolean }> = []
    for (const [sid, el] of Object.entries(elevMap)) {
      const sat = liveSnap.satellites.find((s) => s.id === sid)
      if (el >= (activeScenario?.environment.min_elevation_deg || 10)) {
        list.push({
          id: sid,
          plane: sat?.plane_id || 'P1',
          elev: Math.round(el),
          active: sat?.active ?? true,
        })
      }
    }
    return list.sort((a, b) => b.elev - a.elev)
  }, [groundSite, liveSnap, activeScenario])

  const handleToggleGatewaySim = () => {
    if (!groundSite) return
    if (isGatewayOffline) {
      restoreGatewayNow(groundSite.id, currentTime_s)
    } else {
      killGatewayNow(groundSite.id, currentTime_s)
    }
    recalculate()
  }

  const handleSimulateOutage = () => {
    killSatelliteNow(satId, currentTime_s)
    recalculate()
  }

  const handleRestoreSatellite = () => {
    restoreSatelliteNow(satId, currentTime_s)
    recalculate()
  }

  const handleClearAllFailures = () => {
    clearAllSatelliteFailures(satId)
    recalculate()
  }

  if (!simulationResult || !activeScenario) {
    return (
      <div className="w-[300px] h-full rounded-2xl bg-[#0f1218]/80 border border-white/12 p-4 flex items-center justify-center text-xs font-mono text-zinc-500 backdrop-blur-xl">
        <span>Инициализация телеметрии...</span>
      </div>
    )
  }

  const planeId = satObj?.plane_id || 'P1'
  const minEl = activeScenario.environment.min_elevation_deg

  return (
    <div
      style={{
        width: '300px',
        height: '100%',
        borderRadius: '20px',
        background: 'rgba(15, 18, 24, 0.70)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
      }}
      className="select-none font-mono shadow-2xl shrink-0 flex flex-col overflow-hidden text-zinc-200"
    >
      {isGroundSelected && groundSite ? (
        /* Ground Station Telemetry View */
        <>
          {/* Header */}
          <div className="p-3.5 pb-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-start justify-between">
              <div className="max-w-[210px]">
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-sans block leading-none">
                  {isGateway ? 'ОПОРНЫЙ ШЛЮЗ СЕТИ' : 'ТЕРМИНАЛ АБОНЕНТА (СМП)'}
                </span>
                <h2 className="text-sm font-black text-white font-sans mt-1 leading-tight truncate">
                  {groundSite.name}
                </h2>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  {groundSite.id} • {groundSite.lat_deg.toFixed(1)}°N, {groundSite.lon_deg.toFixed(1)}°E
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearSelection}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                  title="Снять фокус и вернуть общий обзор камеры"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Card 1: Live Connection & Incident Status */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2 font-sans">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Состояние узла</span>
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono uppercase border ${
                    isGateway
                      ? isGatewayOffline
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                      : isConnected
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                      : groundElevations.some((e) => e.active)
                      ? 'bg-amber-950/50 text-amber-300 border-amber-500/40'
                      : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {isGateway
                    ? isGatewayOffline
                      ? '● Авария шлюза'
                      : '● В эфире'
                    : isConnected
                    ? '● Маршрут OK'
                    : groundElevations.some((e) => e.active)
                    ? '● Разрыв МИС'
                    : '● Вне зоны КА'}
                </span>
              </div>

              {isGateway ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    {isGatewayOffline
                      ? 'Внимание: шлюзовая станция выведена из строя! Трафик с полярных спутников не принимается и перенаправляется на резервные узлы.'
                      : 'Шлюз функционирует в штатном режиме, обеспечивает приём трафика с КА и сброс в наземную магистраль.'}
                  </p>

                  {gatewayFailure && (
                    <div className="p-1.5 bg-rose-950/30 border border-rose-500/20 rounded-lg text-[10px] text-rose-200 font-mono flex justify-between items-center">
                      <span>Окно аварии:</span>
                      <span className="font-bold">
                        {formatSec(gatewayFailure.start_s)} —{' '}
                        {gatewayFailure.end_s >= (activeScenario?.environment.horizon_s || 86400)
                          ? 'конец суток'
                          : formatSec(gatewayFailure.end_s)}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleToggleGatewaySim}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all border flex items-center justify-center gap-1.5 ${
                      isGatewayOffline
                        ? 'bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200 shadow-sm'
                        : 'bg-rose-950/50 hover:bg-rose-900/70 border-rose-500/40 text-rose-200 shadow-sm'
                    }`}
                  >
                    {isGatewayOffline ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ввести шлюз в строй</span>
                      </>
                    ) : (
                      <>
                        <ZapOff className="w-3.5 h-3.5" />
                        <span>Смоделировать отказ шлюза</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-zinc-400 font-sans">Шлюз назначения:</span>
                    <b className="text-white font-mono">
                      {liveRoute?.path ? liveRoute.path[liveRoute.path.length - 1] : '—'}
                    </b>
                  </div>
                  <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-zinc-400 font-sans">Длина пути / Задержка:</span>
                    <b className="text-white font-mono">
                      {liveRoute
                        ? `${Math.round(liveRoute.distance_km)} км (${liveRoute.latency_ms.toFixed(1)} мс)`
                        : 'Маршрут прерван'}
                    </b>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Visible Satellites Table */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-sans">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-zinc-400" />
                  <span>КА в зоне видимости (β ≥ 10°)</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Всего: <b className="text-white">{groundElevations.length}</b>
                </span>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                {groundElevations.length > 0 ? (
                  groundElevations.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedSatellite(item.id)}
                      className="flex items-center justify-between p-1.5 px-2 bg-white/[0.04] hover:bg-white/10 border border-white/5 rounded-lg cursor-pointer transition-colors text-[11px] font-mono"
                      title="Выбрать этот КА и навести камеру"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{item.id}</span>
                        <span className="text-[9px] text-zinc-400 font-sans">({item.plane})</span>
                        {!item.active && (
                          <span className="text-[8px] px-1 py-0.2 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded font-sans">
                            ОТКАЗ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={item.active ? 'text-emerald-400 font-bold' : 'text-rose-400/80 font-bold line-through'}>
                          {item.elev}°
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-500" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-zinc-500 text-center py-2 font-mono">
                    Нет активных КА в зоне радиовидимости
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Satellite Telemetry View */
        <>
          {/* Header */}
          <div className="p-3.5 pb-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-sans block leading-none">
                  ТЕЛЕМЕТРИЯ АППАРАТА
                </span>
                <h2 className="text-base font-black text-white font-sans mt-1 leading-tight flex items-center gap-2">
                  <span>КА {satId}</span>
                  <span className="text-xs font-mono font-normal text-zinc-400">
                    ({planeId})
                  </span>
                </h2>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  550 км LEO • Наклонение 87°
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-sans border uppercase ${
                    !satObj?.active
                      ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                      : routeRole !== 'STANDBY'
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-white/10 border-white/20 text-zinc-300'
                  }`}
                >
                  {!satObj?.active
                    ? 'Отказ'
                    : routeRole === 'CLIENT_ACCESS'
                    ? 'Доступ'
                    : routeRole === 'GATEWAY_LINK'
                    ? 'Шлюз'
                    : routeRole === 'TRANSIT_RELAY'
                    ? 'Транзит'
                    : 'В резерве'}
                </span>

                {selectedSatelliteId && (
                  <button
                    onClick={clearSelection}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors ml-1"
                    title="Снять фокус и вернуть общий обзор камеры"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Card 1: Подспутниковая точка и радиовидимость */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>Положение и радиовидимость</span>
            </span>
            {nadirCoords && (
              <span className="text-[10px] font-mono text-zinc-400">
                {nadirCoords.lat}°N, {nadirCoords.lon}°E
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {/* Terminal elevation */}
            <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
              <span className="text-zinc-400 text-[11px] font-sans">
                Угол места над {selectedClientId}:
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-bold ${
                    clientElevation != null && clientElevation >= minEl
                      ? 'text-white'
                      : 'text-zinc-500'
                  }`}
                >
                  {clientElevation != null ? `${clientElevation.toFixed(1)}°` : '—'}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded border font-sans ${
                    clientElevation != null && clientElevation >= minEl
                      ? 'bg-white/10 text-white border-white/30'
                      : 'bg-zinc-900 text-zinc-500 border-white/5'
                  }`}
                >
                  {clientElevation != null && clientElevation >= minEl ? 'Видим (≥10°)' : 'Вне зоны'}
                </span>
              </div>
            </div>

            {/* Gateway elevation */}
            {gatewaySite && (
              <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                <span className="text-zinc-400 text-[11px] font-sans">
                  Угол места над Шлюзом ({gatewaySite.id}):
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      gatewayElevation != null && gatewayElevation >= minEl
                        ? 'text-white'
                        : 'text-zinc-500'
                    }`}
                  >
                    {gatewayElevation != null ? `${gatewayElevation.toFixed(1)}°` : '—'}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-sans ${
                      gatewayElevation != null && gatewayElevation >= minEl
                        ? 'bg-white/10 text-white border-white/30'
                        : 'bg-zinc-900 text-zinc-500 border-white/5'
                    }`}
                  >
                    {gatewayElevation != null && gatewayElevation >= minEl ? 'Видим' : 'Вне зоны'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Межспутниковые линии ISL */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-zinc-400" />
              <span>Межспутниковые связи (ISL)</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-300 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
              {activeISLs.length} линков
            </span>
          </div>

          {activeISLs.length === 0 ? (
            <div className="text-[11px] text-zinc-500 text-center py-2 font-mono">
              Нет активных лазерных линий (ISL)
            </div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {activeISLs.map((link) => (
                <div
                  key={link.peerId}
                  onClick={() => setSelectedSatellite(link.peerId)}
                  className="flex items-center justify-between bg-black/40 hover:bg-white/10 p-1.5 px-2.5 rounded-lg border border-white/5 text-[11px] cursor-pointer transition-colors"
                >
                  <span className="text-white font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    КА {link.peerId}
                  </span>
                  <span className="text-zinc-400 font-mono text-[10px]">
                    {link.distanceKm} км
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Текущий сквозной маршрут передачи данных */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-zinc-400" />
              <span>Маршрут: {selectedClientId} → {gatewaySite?.id || 'Шлюз'}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                isConnected
                  ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/40'
                  : 'bg-rose-950/60 text-rose-200 border-rose-500/40'
              }`}
            >
              {isConnected && liveRoute ? `${liveRoute.hops} ХОПА` : 'НЕТ ПУТИ'}
            </span>
          </div>

          {isConnected && liveRoute?.path ? (
            <>
              {/* Hop chain */}
              <div className="flex items-center flex-wrap gap-1 bg-black/60 p-2 rounded-xl border border-white/5 text-[11px] font-mono">
                {liveRoute.path.map((node, i) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={() => {
                        if (node.startsWith('S')) setSelectedSatellite(node)
                      }}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors border ${
                        node === selectedClientId
                          ? 'text-white bg-white/20 border-white/35'
                          : node === satId
                          ? 'text-zinc-950 bg-white border-white shadow-xs'
                          : node === gatewaySite?.id
                          ? 'text-zinc-200 bg-white/10 border-white/20'
                          : 'text-zinc-300 bg-white/5 border-transparent hover:bg-white/10'
                      }`}
                    >
                      {node}
                    </button>
                    {i < liveRoute.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                  <span>Длина пути:</span>
                  <b className="text-white font-mono">{Math.round(liveRoute.distance_km)} км</b>
                </div>
                <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                  <span>Задержка (RTT):</span>
                  <b className="text-white font-mono">
                    {liveRoute.latency_ms.toFixed(1)} мс
                  </b>
                </div>
              </div>
            </>
          ) : (
            /* Detailed Diagnostic Box */
            <div className="bg-black/50 p-2.5 rounded-xl border border-rose-500/30 space-y-1.5 text-xs font-sans">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Причина отсутствия маршрута:</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {liveFailureReason === 'NO_VISIBLE_SATELLITE' &&
                  'Нет активных спутников в зоне радиовидимости терминала (все КА ниже 10° над горизонтом).'}
                {liveFailureReason === 'ISL_MESH_PARTITION' &&
                  'Спутник виден над терминалом и над шлюзом, но межспутниковая сеть (ISL) фрагментирована из-за отказавших узлов.'}
                {liveFailureReason === 'GATEWAY_NO_SATELLITE' &&
                  'В зоне радиовидимости наземного шлюза Мурманск отсутствуют активные космические аппараты.'}
                {liveFailureReason === 'GATEWAY_OUTAGE' &&
                  'Опорный шлюз Мурманск недоступен из-за заданного регламентного отказа наземного узла.'}
                {(!liveFailureReason || liveFailureReason === 'NONE') &&
                  'Разрыв сквозного маршрута доставки данных.'}
              </p>
            </div>
          )}
        </div>

        {/* Card 4: Режим песочницы / Управление состоянием КА */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2.5 font-sans">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ZapOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Песочница: КА {satId}</span>
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono uppercase border ${
                isSatFailed
                  ? 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isSatFailed ? '● Вне строя' : '● В строю'}
            </span>
          </div>

          {satFailure && (
            <div className="p-1.5 bg-rose-950/30 border border-rose-500/20 rounded-lg text-[10px] text-rose-200 font-mono flex justify-between items-center">
              <span>Окно отказа:</span>
              <span className="font-bold">
                {formatSec(satFailure.start_s)} —{' '}
                {satFailure.end_s >= (activeScenario?.environment.horizon_s || 86400)
                  ? 'конец суток'
                  : formatSec(satFailure.end_s)}
              </span>
            </div>
          )}

          {isSatFailed ? (
            <button
              onClick={handleRestoreSatellite}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all border flex items-center justify-center gap-1.5 bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200 shadow-md"
              title="Ввести аппарат в эксплуатацию"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ввести в эксплуатацию</span>
            </button>
          ) : (
            <button
              onClick={handleSimulateOutage}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold font-sans cursor-pointer transition-all border flex items-center justify-center gap-1.5 bg-rose-950/50 hover:bg-rose-900/70 border-rose-500/40 text-rose-200 shadow-md"
              title="Вывести аппарат из строя начиная с текущей секунды"
            >
              <ZapOff className="w-3.5 h-3.5" />
              <span>Вывести из строя</span>
            </button>
          )}
        </div>
      </div>
    </>
  )}
</div>
)
}
