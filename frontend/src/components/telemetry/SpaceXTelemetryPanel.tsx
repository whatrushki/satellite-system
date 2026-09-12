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
} from 'lucide-react'
import { groundPosition } from '@/core/geometryEngine'

export const SpaceXTelemetryPanel: React.FC = () => {
  const {
    currentTime_s,
    selectedClientId,
    selectedSatelliteId,
    setSelectedSatellite,
    simulationResult,
    recalculate,
  } = useSimulationStore()

  const {
    activeScenario,
    killSatelliteNow,
    restoreSatelliteNow,
    clearAllSatelliteFailures,
    exportSandboxScenario,
  } = useScenarioStore()

  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap = useMemo(() => {
    if (!simulationResult?.snapshots || simulationResult.snapshots.length === 0) return null
    return simulationResult.snapshots[Math.min(idx, simulationResult.snapshots.length - 1)]
  }, [simulationResult, idx])

  // Client path & status
  const clientData = useMemo(() => {
    return simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  }, [simulationResult, selectedClientId])

  const currentTimeline = useMemo(() => {
    return clientData?.timeline.find((t) => t.t_s === idx * step)
  }, [clientData, idx, step])

  const isConnected = currentTimeline?.status === 'connected'

  // Selected Satellite
  const satId = selectedSatelliteId || 'S01'
  const satObj = useMemo(() => {
    return currentSnap?.satellites.find((s) => s.id === satId)
  }, [currentSnap, satId])

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
    if (!currentSnap || !selectedClientId) return null
    const elevMap = currentSnap.elevation_deg[selectedClientId] || {}
    return elevMap[satId] ?? null
  }, [currentSnap, selectedClientId, satId])

  // Elevation to gateway
  const gatewayElevation = useMemo(() => {
    if (!currentSnap || !gatewaySite) return null
    const elevMap = currentSnap.elevation_deg[gatewaySite.id] || {}
    return elevMap[satId] ?? null
  }, [currentSnap, gatewaySite, satId])

  // Active ISL connections for this satellite
  const activeISLs = useMemo(() => {
    if (!currentSnap) return []
    const links: Array<{ peerId: string; distanceKm: number }> = []
    for (const [u, v, dist] of currentSnap.edges) {
      if (u === satId && !u.startsWith('C') && !u.startsWith('G') && !v.startsWith('C') && !v.startsWith('G')) {
        links.push({ peerId: v, distanceKm: Math.round(dist) })
      } else if (v === satId && !u.startsWith('C') && !u.startsWith('G') && !v.startsWith('C') && !v.startsWith('G')) {
        links.push({ peerId: u, distanceKm: Math.round(dist) })
      }
    }
    return links
  }, [currentSnap, satId])

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
    if (!isConnected || !currentTimeline?.path) return 'STANDBY'
    const path = currentTimeline.path
    if (!path.includes(satId)) return 'STANDBY'
    if (path[1] === satId) return 'CLIENT_ACCESS'
    if (path[path.length - 2] === satId) return 'GATEWAY_LINK'
    return 'TRANSIT_RELAY'
  }, [isConnected, currentTimeline, satId])

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
              {isConnected ? `${currentTimeline?.hops} ХОПА` : 'НЕТ ПУТИ'}
            </span>
          </div>

          {isConnected && currentTimeline?.path ? (
            <>
              {/* Hop chain */}
              <div className="flex items-center flex-wrap gap-1 bg-black/60 p-2 rounded-xl border border-white/5 text-[11px] font-mono">
                {currentTimeline.path.map((node, i) => (
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
                    {i < currentTimeline.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                  <span>Длина пути:</span>
                  <b className="text-white font-mono">{currentTimeline.distance_km} км</b>
                </div>
                <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
                  <span>Задержка (RTT):</span>
                  <b className="text-white font-mono">
                    {((currentTimeline.distance_km / 299.792) * 2).toFixed(1)} мс
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
                {currentTimeline?.reason === 'NO_VISIBLE_SATELLITE' &&
                  'Нет активных спутников в зоне радиовидимости терминала (угол возвышения < 10°).'}
                {currentTimeline?.reason === 'ISL_MESH_PARTITION' &&
                  'Спутник виден над терминалом и над шлюзом, но межспутниковая сеть (ISL) фрагментирована.'}
                {currentTimeline?.reason === 'GATEWAY_NO_SATELLITE' &&
                  'В зоне радиовидимости наземного шлюза Мурманск отсутствуют активные космические аппараты.'}
                {currentTimeline?.reason === 'GATEWAY_OUTAGE' &&
                  'Опорный шлюз Мурманск недоступен из-за заданного регламентного отказа наземного узла.'}
                {(!currentTimeline?.reason || currentTimeline.reason === 'NONE') &&
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

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleSimulateOutage}
              disabled={isSatFailed}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold font-sans cursor-pointer transition-all border flex items-center justify-center gap-1 ${
                isSatFailed
                  ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                  : 'bg-rose-950/50 hover:bg-rose-900/70 border-rose-500/40 text-rose-200 shadow-sm'
              }`}
              title="Вывести аппарат из строя начиная с текущей секунды"
            >
              <ZapOff className="w-3 h-3" />
              <span>Вывести из строя</span>
            </button>

            <button
              onClick={handleRestoreSatellite}
              disabled={!isSatFailed && totalSatFailures.length === 0}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold font-sans cursor-pointer transition-all border flex items-center justify-center gap-1 ${
                !isSatFailed && totalSatFailures.length === 0
                  ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                  : 'bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200 shadow-sm'
              }`}
              title="Ввести аппарат в эксплуатацию в текущую секунду"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Ввести в строй</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-zinc-400">
            {totalSatFailures.length > 0 ? (
              <button
                onClick={handleClearAllFailures}
                className="text-zinc-400 hover:text-white underline cursor-pointer transition-colors"
                title="Сбросить все регламентные и смоделированные отказы данного спутника"
              >
                Снять все аварии ({totalSatFailures.length})
              </button>
            ) : (
              <span className="text-zinc-500">Отказов нет</span>
            )}

            <button
              onClick={exportSandboxScenario}
              className="flex items-center gap-1 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 cursor-pointer transition-colors"
              title="Скачать сценарий со всеми авариями песочницы в формате cosmo-A-1.0"
            >
              <Download className="w-3 h-3" />
              <span>Экспорт JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
