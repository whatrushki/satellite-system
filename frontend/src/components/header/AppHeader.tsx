import React from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Download, Upload, RotateCcw } from 'lucide-react'

interface AppHeaderProps {
  onOpenImport: () => void
  onOpenExport: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenImport, onOpenExport }) => {
  const { activeScenarioId, loadDefaultScenario, resetToOriginal } = useScenarioStore()
  const { activeTab, setActiveTab, recalculate, setViewMode } = useSimulationStore()

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await loadDefaultScenario(e.target.value)
    recalculate()
  }

  const handleReset = async () => {
    await resetToOriginal()
    recalculate()
  }

  return (
    <header className="absolute top-4 left-0 right-0 z-30 pointer-events-none flex items-center justify-between px-5 select-none font-sans">
      {/* 1. Left minimal branding */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-full px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5),-1px_0_8px_rgba(255,255,255,0.04),1px_0_8px_rgba(255,255,255,0.04)]">
        <span className="text-[12px] font-black tracking-[0.25em] text-white uppercase font-sans">
          SPACEX
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[11px] font-bold tracking-[0.15em] text-zinc-300 uppercase font-sans">
          COSMO WHAT
        </span>
      </div>

      {/* 2. Center Mode Switch: 3D Orbit View vs Analytics & Comparison (Clean segmented toggle) */}
      <div className="pointer-events-auto flex items-center bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-full p-1 shadow-[0_4px_16px_rgba(0,0,0,0.5),-1px_0_8px_rgba(255,255,255,0.04),1px_0_8px_rgba(255,255,255,0.04)] gap-1">
        <button
          onClick={() => {
            setActiveTab('dashboard')
            setViewMode('3d')
          }}
          className={`px-4 py-1 text-xs font-sans rounded-full transition-all cursor-pointer font-bold ${
            activeTab === 'dashboard'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          3D Орбиты
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-1 text-xs font-sans rounded-full transition-all cursor-pointer font-bold ${
            activeTab === 'compare'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Аналитика и сопоставление
        </button>
      </div>

      {/* 3. Right Controls (Minimalist scenario selector and export) */}
      <div className="pointer-events-auto flex items-center gap-2 text-xs font-mono">
        {/* Scenario selector */}
        <div className="bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-xl px-2.5 py-1.5 flex items-center text-[11px] shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <select
            value={activeScenarioId}
            onChange={handleScenarioChange}
            className="bg-transparent text-xs text-zinc-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="01_full_constellation" className="bg-zinc-900 text-zinc-200">
              01: Полная группировка (48 КА)
            </option>
            <option value="02_first_launch" className="bg-zinc-900 text-zinc-200">
              02: Первая очередь (16 КА)
            </option>
            <option value="03_satellite_outages" className="bg-zinc-900 text-zinc-200">
              03: Отказы 10 КА
            </option>
            <option value="04_link_range" className="bg-zinc-900 text-zinc-200">
              04: Дальность ISL 2000 км
            </option>
            {activeScenarioId === 'custom' && (
              <option value="custom" className="bg-zinc-900 text-zinc-200">
                Пользовательский
              </option>
            )}
          </select>
        </div>

        {/* Action utility icons (Reset & Import) */}
        <div className="flex items-center gap-1 bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-xl p-0.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <button
            onClick={handleReset}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors"
            title="Сброс к исходному состоянию"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenImport}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors"
            title="Загрузить JSON сценария"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Export Button */}
        <button
          onClick={onOpenExport}
          className="bg-white text-zinc-950 hover:bg-zinc-200 px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all"
          title="Экспорт официального результата (cosmo-A-result-1.0)"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  )
}
