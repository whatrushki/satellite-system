import React, { useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Sliders, Download, RotateCcw, CheckCircle2 } from 'lucide-react'

export const SandboxDock: React.FC = () => {
  const {
    activeScenario,
    clearAllFailures,
    exportSandboxScenario,
  } = useScenarioStore()
  const { currentTime_s, recalculate } = useSimulationStore()

  // Calculate active incidents
  const satFailures = activeScenario?.failures || []
  const gatewayFailures = activeScenario?.gateway_outages || []
  const totalIncidents = satFailures.length + gatewayFailures.length

  // Current real-time active outages at currentTime_s
  const activeNowSatCount = useMemo(() => {
    return satFailures.filter(
      (f) => f.start_s <= currentTime_s && currentTime_s < f.end_s
    ).length
  }, [satFailures, currentTime_s])

  const activeNowGwCount = useMemo(() => {
    return gatewayFailures.filter(
      (g) => g.start_s <= currentTime_s && currentTime_s < g.end_s
    ).length
  }, [gatewayFailures, currentTime_s])

  const handleResetAll = () => {
    clearAllFailures()
    recalculate()
  }

  return (
    <div
      style={{
        width: '280px',
        borderRadius: '20px',
        background: 'rgba(15, 18, 24, 0.78)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
      }}
      className="select-none font-sans p-3 shadow-2xl flex flex-col gap-2 text-zinc-200 shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-zinc-300" />
          <span className="text-[10px] uppercase font-black text-white tracking-wider">
            ПЕСОЧНИЦА ОТКАЗОВ
          </span>
        </div>

        {totalIncidents > 0 ? (
          <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            {totalIncidents} {totalIncidents === 1 ? 'инцидент' : 'инцид.'}
          </span>
        ) : (
          <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Штатно
          </span>
        )}
      </div>

      {/* Incident Status Overview */}
      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
        <div className="bg-black/40 border border-white/5 rounded-xl p-1.5 text-center">
          <div className="text-[9px] text-zinc-400 font-sans">Отказы КА:</div>
          <div className="font-bold text-white mt-0.5 flex items-center justify-center gap-1">
            <span className={satFailures.length > 0 ? 'text-rose-300' : 'text-zinc-400'}>
              {satFailures.length}
            </span>
            {activeNowSatCount > 0 && (
              <span className="text-[9px] text-rose-400 font-normal">
                ({activeNowSatCount} сейч.)
              </span>
            )}
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-xl p-1.5 text-center">
          <div className="text-[9px] text-zinc-400 font-sans">Шлюзы офлайн:</div>
          <div className="font-bold text-white mt-0.5 flex items-center justify-center gap-1">
            <span className={gatewayFailures.length > 0 ? 'text-amber-300' : 'text-zinc-400'}>
              {gatewayFailures.length}
            </span>
            {activeNowGwCount > 0 && (
              <span className="text-[9px] text-amber-400 font-normal">
                ({activeNowGwCount} сейч.)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Export JSON & Reset All */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          onClick={exportSandboxScenario}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-sans font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
          title="Экспортировать текущий сценарий со всеми заданными авариями в формате JSON"
        >
          <Download className="w-3.5 h-3.5 text-zinc-300" />
          <span>Экспорт JSON</span>
        </button>

        <button
          onClick={handleResetAll}
          disabled={totalIncidents === 0}
          className={`py-1.5 px-2.5 rounded-xl border text-xs font-sans font-bold cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-[0.98] ${
            totalIncidents > 0
              ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/40 text-rose-200'
              : 'bg-white/5 border-white/5 text-zinc-600 cursor-not-allowed'
          }`}
          title="Сбросить все смоделированные аварии и восстановить штатную группировку"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Сброс</span>
        </button>
      </div>
    </div>
  )
}
