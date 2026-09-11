import React, { useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertOctagon, Trash2, Plus, ZapOff, ServerOff } from 'lucide-react'

export const OutageManager: React.FC = () => {
  const { activeScenario, addFailure, removeFailure, killSatelliteNow, toggleGatewayOutage } =
    useScenarioStore()
  const { currentTime_s, simulationResult, selectedClientId, recalculate } = useSimulationStore()

  const [selectedSat, setSelectedSat] = useState('S01')
  const [startHour, setStartHour] = useState('6')
  const [endHour, setEndHour] = useState('24')

  if (!activeScenario) return null

  const failures = activeScenario.failures || []
  const gatewayOutages = activeScenario.gateway_outages || []

  // Current route
  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const clientData = simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  const currentTimeline = clientData?.timeline.find((t) => t.t_s === idx * step)
  const transitSatsInRoute = (currentTimeline?.path || []).filter(
    (id) => id !== selectedClientId && id !== 'G_MUR'
  )

  const handleAddOutage = () => {
    const s_sec = parseFloat(startHour) * 3600
    const e_sec = parseFloat(endHour) * 3600
    if (s_sec >= e_sec) {
      alert('Время начала должно быть строго меньше времени окончания!')
      return
    }
    addFailure({
      satellite_id: selectedSat,
      start_s: s_sec,
      end_s: e_sec,
    })
    recalculate()
  }

  const handleRemoveOutage = (i: number) => {
    removeFailure(i)
    recalculate()
  }

  const handleKillActiveTransitSat = () => {
    if (transitSatsInRoute.length === 0) {
      alert('В текущем маршруте нет активных спутников или маршрут отсутствует!')
      return
    }
    const victim = transitSatsInRoute[0]
    killSatelliteNow(victim, currentTime_s)
    recalculate()
  }

  const isGatewayOutageActive = gatewayOutages.some(
    (g) => g.gateway_id === 'G_MUR' && g.start_s <= currentTime_s && currentTime_s < g.end_s
  )

  const handleToggleGateway = () => {
    // Toggle outage for entire horizon or current time to horizon
    toggleGatewayOutage('G_MUR', 0, activeScenario.environment.horizon_s)
    recalculate()
  }

  return (
    <Card className="flex flex-col gap-2 font-mono">
      <CardHeader className="pb-2 border-b border-slate-800">
        <div className="flex items-center justify-between text-rose-400">
          <div className="flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            <CardTitle>ЦЕНТР МОДЕЛИРОВАНИЯ ОТКАЗОВ</CardTitle>
          </div>
          <span className="text-[10px] text-slate-400">
            Отказов: <b className="text-rose-400">{failures.length}</b>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-3 text-xs">
        {/* Instant Disruption Trigger (Killer Feature) */}
        <div className="bg-rose-950/40 border border-rose-800/80 p-2.5 rounded flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-rose-300 font-semibold">
            <span className="flex items-center gap-1">
              <ZapOff className="w-3.5 h-3.5 text-rose-400" />
              Экспресс-тест отказа в маршруте
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Мгновенно смоделировать аварию транзитного КА{' '}
            <b className="text-sky-300">
              {transitSatsInRoute.length > 0 ? transitSatsInRoute.join(', ') : '(нет в маршруте)'}
            </b>{' '}
            с текущего момента времени для проверки реакции сети:
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleKillActiveTransitSat}
            disabled={transitSatsInRoute.length === 0}
            className="w-full text-xs font-bold"
          >
            <ZapOff className="w-3.5 h-3.5 mr-1.5" />
            Вывести из строя спутник {transitSatsInRoute[0] || ''}
          </Button>
        </div>

        {/* Gateway Failure Toggle */}
        <div className="bg-purple-950/30 border border-purple-800/60 p-2.5 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ServerOff className="w-4 h-4 text-purple-400" />
            <div>
              <div className="font-semibold text-[11px] text-purple-200">
                Авария шлюза Мурманска (G_MUR)
              </div>
              <div className="text-[10px] text-slate-400">
                {isGatewayOutageActive ? 'Шлюз недоступен' : 'Шлюз в штатном режиме'}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={isGatewayOutageActive ? 'destructive' : 'outline'}
            onClick={handleToggleGateway}
            className="text-xs h-7"
          >
            {isGatewayOutageActive ? 'Восстановить' : 'Отключить'}
          </Button>
        </div>

        {/* Add Custom Outage Form */}
        <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Plus className="w-3 h-3 text-sky-400" />
            Задать регламентный отказ аппарата
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-400 block mb-0.5">Спутник:</label>
              <select
                value={selectedSat}
                onChange={(e) => setSelectedSat(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-sky-300 text-xs rounded p-1"
              >
                {activeScenario.design.satellites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} ({s.plane_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-slate-400 block mb-0.5">С часа:</label>
              <input
                type="number"
                min="0"
                max="23"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded p-1"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 block mb-0.5">По час:</label>
              <input
                type="number"
                min="1"
                max="24"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded p-1"
              />
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={handleAddOutage} className="w-full text-xs h-7">
            Добавить в сценарий
          </Button>
        </div>

        {/* Current Failures List */}
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {failures.length === 0 ? (
            <div className="text-[10px] text-slate-500 text-center py-2">
              Нет активных заданных отказов
            </div>
          ) : (
            failures.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px]"
              >
                <div>
                  <span className="text-rose-400 font-bold mr-1.5">{f.satellite_id}</span>
                  <span className="text-slate-400 text-[10px]">
                    {(f.start_s / 3600).toFixed(1)}ч – {(f.end_s / 3600).toFixed(1)}ч
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveOutage(i)}
                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                  title="Удалить отказ"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
