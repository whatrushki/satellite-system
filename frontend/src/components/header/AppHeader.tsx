import React from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Download, Upload } from 'lucide-react'

interface AppHeaderProps {
  onOpenImport: () => void
  onOpenExport: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenImport, onOpenExport }) => {
  const { activeScenarioId, loadDefaultScenario } = useScenarioStore()
  const { recalculate } = useSimulationStore()

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await loadDefaultScenario(e.target.value)
    recalculate()
  }

  return (
    <header className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex items-center justify-between select-none font-sans">
      {/* 1. Left minimal branding aligned to left sidebar width (280px) */}
      <div className="pointer-events-auto flex items-center justify-between w-[280px] bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-xl px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5),-1px_0_8px_rgba(255,255,255,0.04),1px_0_8px_rgba(255,255,255,0.04)]">
        <span className="text-[12px] font-black tracking-[0.25em] text-white uppercase font-sans">
          COSMO WHAT
        </span>
        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
          HUD
        </span>
      </div>

      {/* 2. Right Controls aligned to right sidebar width (300px) */}
      <div className="pointer-events-auto flex items-center gap-1.5 w-[300px] text-xs font-mono">
        {/* Scenario selector */}
        <div className="flex-1 min-w-0 bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-xl px-2.5 py-1.5 flex items-center shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <select
            value={activeScenarioId}
            onChange={handleScenarioChange}
            className="w-full bg-transparent text-[11px] text-zinc-200 font-mono focus:outline-none cursor-pointer truncate"
          >
            <option value="01_full_constellation" className="bg-zinc-900 text-zinc-200">
              01: Полная (48 КА)
            </option>
            <option value="02_first_launch" className="bg-zinc-900 text-zinc-200">
              02: 1-я очер. (16 КА)
            </option>
            <option value="03_satellite_outages" className="bg-zinc-900 text-zinc-200">
              03: Отказы 10 КА
            </option>
            <option value="04_link_range" className="bg-zinc-900 text-zinc-200">
              04: ISL 2000 км
            </option>
            {activeScenarioId === 'custom' && (
              <option value="custom" className="bg-zinc-900 text-zinc-200">
                Пользовательский
              </option>
            )}
          </select>
        </div>

        {/* Combined Import & Export pill */}
        <div className="flex items-center bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-xl p-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)] shrink-0">
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
            title="Экспорт официального результата"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  )
}
