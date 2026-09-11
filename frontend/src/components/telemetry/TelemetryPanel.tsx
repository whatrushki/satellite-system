import React from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { R } from '@/core/geometryEngine'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  ArrowRight,
  Radio,
  Zap,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Satellite,
  Compass,
  Link2,
} from 'lucide-react'

export const TelemetryPanel: React.FC = () => {
  const {
    currentTime_s,
    selectedClientId,
    setSelectedClient,
    selectedSatelliteId,
    setSelectedSatellite,
    simulationResult,
  } = useSimulationStore()
  const activeScenario = useScenarioStore((state) => state.activeScenario)

  if (!simulationResult || !activeScenario) return null

  const step = simulationResult.step_s
  const idx = Math.floor(currentTime_s / step)
  const currentSnap =
    simulationResult.snapshots[Math.min(idx, simulationResult.snapshots.length - 1)]

  const clientSummary = simulationResult.clients.find((c) => c.client_id === selectedClientId)
  const currentTimeline = clientSummary?.timeline.find((t) => t.t_s === idx * step)
  const isConnected = currentTimeline?.status === 'connected'

  const clientElevations = currentSnap?.elevation_deg[selectedClientId] || {}
  const minEl = activeScenario.environment.min_elevation_deg

  const visibleSats = Object.entries(clientElevations)
    .filter(([_, el]) => el >= minEl)
    .sort((a, b) => b[1] - a[1])

  // Selected Satellite details
  const satObj = currentSnap?.satellites.find((s) => s.id === selectedSatelliteId)
  const satPos = satObj
    ? {
        r: Math.hypot(satObj.x_km, satObj.y_km, satObj.z_km),
        lat: Math.asin(satObj.z_km / Math.hypot(satObj.x_km, satObj.y_km, satObj.z_km)) * (180 / Math.PI),
        lon: Math.atan2(satObj.y_km, satObj.x_km) * (180 / Math.PI),
      }
    : null

  // ISL peers for selected satellite
  const satEdges = currentSnap?.edges.filter(
    ([u, v]) => u === selectedSatelliteId || v === selectedSatelliteId
  ) || []

  return (
    <Card className="flex flex-col gap-2 font-mono bg-slate-900/90 border border-slate-800">
      <CardHeader className="pb-2 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <CardTitle>ТЕЛЕМЕТРИЯ И МАРШРУТЫ</CardTitle>
          </div>
          {/* Client Selector */}
          <div className="flex items-center gap-1">
            {simulationResult.clients.map((c) => (
              <button
                key={c.client_id}
                onClick={() => setSelectedClient(c.client_id)}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer font-bold transition-colors ${
                  c.client_id === selectedClientId
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {c.client_id}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2 text-xs">
        {/* Terminal Connection Status Banner */}
        <div
          className={`p-3 rounded-lg border ${
            isConnected
              ? 'bg-emerald-950/30 border-emerald-800/70 text-emerald-300'
              : 'bg-rose-950/30 border-rose-800/70 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-xs">
              {isConnected ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  КАНАЛ СВЯЗИ АКТИВЕН
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ПЕРЕРЫВ СВЯЗИ
                </>
              )}
            </span>
            <Badge variant={isConnected ? 'success' : 'destructive'} className="text-[9px]">
              {isConnected ? `${currentTimeline?.hops} хопа` : currentTimeline?.reason}
            </Badge>
          </div>

          {isConnected ? (
            <div className="space-y-2 mt-2">
              {/* Hop-by-hop visual flow */}
              <div className="flex items-center flex-wrap gap-1 bg-slate-950/80 p-2 rounded border border-slate-800 text-[11px]">
                {currentTimeline?.path.map((node, i) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={() => {
                        if (node.startsWith('S')) setSelectedSatellite(node)
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        node === selectedClientId
                          ? 'text-amber-300 bg-amber-500/10'
                          : node === 'G_MUR'
                          ? 'text-indigo-300 bg-indigo-500/10'
                          : node === selectedSatelliteId
                          ? 'text-white bg-sky-600'
                          : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20'
                      }`}
                    >
                      {node}
                    </button>
                    {i < (currentTimeline?.path.length || 0) - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Path metrics */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <Radio className="w-3 h-3 text-sky-400" />
                  <span>Дистанция:</span>
                  <b className="text-slate-200 ml-auto">{currentTimeline?.distance_km} км</b>
                </div>
                <div className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Задержка:</span>
                  <b className="text-slate-200 ml-auto">
                    {((currentTimeline?.distance_km || 0) / 299.792).toFixed(1)} мс
                  </b>
                </div>
              </div>
            </div>
          ) : (
            /* Disconnect Diagnostic Explanation */
            <div className="mt-2 text-[10px] leading-relaxed text-rose-200 bg-slate-950/80 p-2 rounded border border-rose-900/50">
              <div className="font-bold text-rose-400 mb-1">Диагностика:</div>
              {currentTimeline?.reason === 'NO_VISIBLE_SATELLITE' && (
                <p>
                  Над пунктом {selectedClientId} нет ни одного активного аппарата с углом места &ge; {minEl}°.
                </p>
              )}
              {currentTimeline?.reason === 'ISL_MESH_PARTITION' && (
                <p>
                  Разрыв межспутниковой сети (ISL Partition). Спутники над абонентом не связаны с шлюзом G_MUR.
                </p>
              )}
              {currentTimeline?.reason === 'GATEWAY_NO_SATELLITE' && (
                <p>Шлюз Мурманска (G_MUR) не имеет видимых спутников в текущий момент.</p>
              )}
              {currentTimeline?.reason === 'GATEWAY_OUTAGE' && (
                <p>Шлюз Мурманска находится в регламентном периоде аварии.</p>
              )}
            </div>
          )}
        </div>

        {/* Selected Satellite Telemetry Box */}
        {satObj && satPos && (
          <div className="p-2.5 rounded border border-slate-700/80 bg-slate-950/70 space-y-2">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                <Satellite className="w-3.5 h-3.5 text-sky-400" />
                КА {satObj.id} ({satObj.plane_id})
              </span>
              <Badge variant={satObj.active ? 'success' : 'destructive'} className="text-[9px]">
                {satObj.active ? 'В СТРОЮ' : 'ОТКАЗ'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>Широта:</span>
                <span className="text-slate-200 font-bold">{satPos.lat.toFixed(2)}° N</span>
              </div>
              <div className="flex justify-between">
                <span>Долгота:</span>
                <span className="text-slate-200 font-bold">{satPos.lon.toFixed(2)}° E</span>
              </div>
              <div className="flex justify-between">
                <span>Высота:</span>
                <span className="text-slate-200 font-bold">
                  {(satPos.r - R).toFixed(1)} км
                </span>
              </div>
              <div className="flex justify-between">
                <span>Скорость:</span>
                <span className="text-slate-200 font-bold">7.58 км/с</span>
              </div>
            </div>

            {/* Active ISL Links for this satellite */}
            <div className="text-[10px] pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-sky-400" />
                  Лазерные линии (ISL):
                </span>
                <span className="text-slate-300 font-bold">{satEdges.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {satEdges.length === 0 ? (
                  <span className="text-slate-500">Нет установленных линий</span>
                ) : (
                  satEdges.map(([u, v, dist], i) => {
                    const peer = u === satObj.id ? v : u
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedSatellite(peer)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-300 hover:border-slate-600 transition-colors"
                      >
                        {peer} ({dist.toFixed(0)} км)
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visible Satellites for Client */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-sky-400" />
              КА в радиовидимости {selectedClientId} (&ge;{minEl}°):
            </span>
            <span className="text-sky-300 font-bold">{visibleSats.length} КА</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
            {visibleSats.length === 0 ? (
              <div className="col-span-2 text-[10px] text-slate-500 py-1 text-center">
                Нет видимых аппаратов
              </div>
            ) : (
              visibleSats.map(([sid, el]) => (
                <button
                  key={sid}
                  onClick={() => setSelectedSatellite(sid)}
                  className={`p-1 rounded border text-[10px] flex items-center justify-between cursor-pointer transition-colors ${
                    sid === selectedSatelliteId
                      ? 'bg-sky-950/60 border-sky-600'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sky-300 font-bold">{sid}</span>
                  <span className="text-emerald-400 font-mono">el: {el.toFixed(1)}°</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Constellation Key Nodes */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-semibold">
              <Zap className="w-3 h-3 text-amber-400" />
              Ключевые транзитные узлы группировки:
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {simulationResult.critical_satellites.slice(0, 4).map((sat) => (
              <button
                key={sat.id}
                onClick={() => setSelectedSatellite(sat.id)}
                className="bg-slate-950 p-1.5 rounded border border-slate-800 flex items-center justify-between text-[10px] cursor-pointer hover:border-slate-700 transition-colors"
              >
                <span className="text-amber-400 font-bold">{sat.id}</span>
                <span className="text-slate-400">{sat.routes_carried} путей</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
