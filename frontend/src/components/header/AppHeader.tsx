import React from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Download, Upload, RotateCcw, Layers, BarChart2, Lightbulb } from 'lucide-react'

interface AppHeaderProps {
  onOpenImport: () => void
  onOpenExport: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenImport, onOpenExport }) => {
  const {
    activeScenario,
    activeScenarioId,
    availableScenarios,
    loadDefaultScenario,
    setLaunchStage,
    resetToOriginal,
  } = useScenarioStore()
  const { activeTab, setActiveTab, recalculate } = useSimulationStore()

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await loadDefaultScenario(e.target.value)
    recalculate()
  }

  const handleStageChange = (stage: number) => {
    setLaunchStage(stage)
    recalculate()
  }

  const handleReset = async () => {
    await resetToOriginal()
    recalculate()
  }

  const currentStage = activeScenario?.design.launch_stage || 3

  return (
    <header className="absolute top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between select-none font-sans gap-3">
      {/* 1. Left branding + Navigation tabs */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-2 bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <span className="text-[12px] font-black tracking-[0.2em] text-white uppercase font-sans">
            COSMO-NET
          </span>
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest border-l border-white/15 pl-2">
            2026
          </span>
        </div>

        {/* View switcher buttons */}
        <div className="flex items-center bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl p-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Мониторинг</span>
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Сравнение</span>
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'recommendations'
                ? 'bg-white/20 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
            <span>Рекомендации</span>
          </button>
        </div>
      </div>

      {/* 2. Center: Launch Stage Switcher (Базовый сценарий проверки №2) */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl px-2 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <span className="text-[10px] text-zinc-400 font-sans uppercase font-bold tracking-wider px-1">
          Очередь:
        </span>
        <div className="flex items-center gap-1">
          {[
            { stage: 1, label: '1 оч. (16 КА)' },
            { stage: 2, label: '2 оч. (32 КА)' },
            { stage: 3, label: '3 оч. (48 КА)' },
          ].map((item) => (
            <button
              key={item.stage}
              onClick={() => handleStageChange(item.stage)}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition-all border ${
                currentStage === item.stage
                  ? 'bg-white text-zinc-950 border-white shadow-xs'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title={`Переключить этап развёртывания на ${item.label}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Reset button */}
        <div className="w-[1px] h-4 bg-white/15 mx-0.5" />
        <button
          onClick={handleReset}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          title="Сбросить параметры сценария к исходным"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Right Controls: Scenario selector + Import + Export */}
      <div className="pointer-events-auto flex items-center gap-1.5 text-xs font-mono">
        {/* Scenario selector */}
        <div className="bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl px-2.5 py-1.5 flex items-center shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <select
            value={activeScenarioId}
            onChange={handleScenarioChange}
            className="bg-transparent text-[11px] text-zinc-200 font-mono focus:outline-none cursor-pointer truncate max-w-[170px]"
          >
            {availableScenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-zinc-900 text-zinc-200">
                {sc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Combined Import & Export pill */}
        <div className="flex items-center bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl p-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] shrink-0">
          <button
            onClick={onOpenImport}
            className="text-zinc-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-[11px] font-sans font-medium"
            title="Загрузить JSON сценария"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />
          <button
            onClick={onOpenExport}
            className="bg-white/15 hover:bg-white/25 text-white px-2 py-1 rounded-lg text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Экспорт официального результата cosmo-A-result-1.0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  )
}
