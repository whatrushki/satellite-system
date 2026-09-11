import React, { useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
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
    toggleGatewayOutage('G_MUR', 0, activeScenario.environment.horizon_s)
    recalculate()
  }

  return (
    <div className="flex flex-col gap-2.5 font-mono text-zinc-200">
      {/* Header */}
      <div className="pb-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white">
            <AlertOctagon className="w-3.5 h-3.5 text-zinc-300" />
            <h3 className="text-xs font-bold uppercase font-sans tracking-wide">
              Моделирование отказов
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Отказов: <b className="text-white">{failures.length}</b>
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-1 text-xs">
        {/* Instant Disruption Trigger */}
        <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-white font-semibold font-sans">
            <span className="flex items-center gap-1.5">
              <ZapOff className="w-3.5 h-3.5 text-zinc-300" />
              Экспресс-тест отказа в маршруте
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
            Мгновенно смоделировать аварию транзитного КА{' '}
            <b className="text-white font-mono">
              {transitSatsInRoute.length > 0 ? transitSatsInRoute.join(', ') : '(нет в маршруте)'}
            </b>{' '}
            для оперативной проверки перемаршрутизации:
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleKillActiveTransitSat}
            disabled={transitSatsInRoute.length === 0}
            className="w-full text-xs font-bold h-7"
          >
            <ZapOff className="w-3.5 h-3.5 mr-1.5" />
            Вывести из строя спутник {transitSatsInRoute[0] || ''}
          </Button>
        </div>

        {/* Gateway Failure Toggle */}
        <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 font-sans">
            <ServerOff className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="font-semibold text-[11px] text-white">
                Авария шлюза Мурманска (G_MUR)
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">
                {isGatewayOutageActive ? 'Шлюз недоступен' : 'Шлюз в штатном режиме'}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant={isGatewayOutageActive ? 'destructive' : 'outline'}
            onClick={handleToggleGateway}
            className="text-xs h-7 px-2.5"
          >
            {isGatewayOutageActive ? 'Восстановить' : 'Отключить'}
          </Button>
        </div>

        {/* Add Custom Outage Form */}
        <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-2">
          <div className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1 font-sans">
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            Задать регламентный отказ аппарата
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">Спутник:</label>
              <select
                value={selectedSat}
                onChange={(e) => setSelectedSat(e.target.value)}
                className="w-full bg-black/60 border border-white/15 text-white text-xs rounded-lg p-1 font-mono focus:outline-none"
              >
                {activeScenario.design.satellites.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-900 text-white">
                    {s.id} ({s.plane_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">С часа:</label>
              <input
                type="number"
                min="0"
                max="23"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full bg-black/60 border border-white/15 text-white text-xs rounded-lg p-1 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5 font-sans">По час:</label>
              <input
                type="number"
                min="1"
                max="24"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="w-full bg-black/60 border border-white/15 text-white text-xs rounded-lg p-1 font-mono focus:outline-none"
              />
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddOutage} className="w-full text-xs h-7">
            Добавить в сценарий
          </Button>
        </div>

        {/* Current Failures List */}
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {failures.length === 0 ? (
            <div className="text-[10px] text-zinc-500 text-center py-2 font-mono">
              Нет активных заданных отказов
            </div>
          ) : (
            failures.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-black/50 p-1.5 px-2.5 rounded-lg border border-white/10 text-[11px]"
              >
                <div>
                  <span className="text-white font-bold mr-1.5 font-mono">{f.satellite_id}</span>
                  <span className="text-zinc-400 text-[10px] font-mono">
                    {(f.start_s / 3600).toFixed(1)}ч – {(f.end_s / 3600).toFixed(1)}ч
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveOutage(i)}
                  className="text-zinc-500 hover:text-white p-1 cursor-pointer transition-colors"
                  title="Удалить отказ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
