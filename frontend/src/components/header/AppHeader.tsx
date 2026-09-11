import React, { useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Download, Upload, RotateCcw } from 'lucide-react'

interface AppHeaderProps {
  onOpenImport: () => void
  onOpenExport: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenImport, onOpenExport }) => {
  const { activeScenario, activeScenarioId, loadDefaultScenario, setLaunchStage, resetToOriginal } =
    useScenarioStore()
  const { setActiveTab, recalculate, setViewMode } = useSimulationStore()

  const [activeNavPill, setActiveNavPill] = useState<
    'Overview' | 'Fleet' | 'Coverage' | 'Telemetry' | 'Control'
  >('Overview')

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

  const handleNavClick = (pill: 'Overview' | 'Fleet' | 'Coverage' | 'Telemetry' | 'Control') => {
    setActiveNavPill(pill)
    if (pill === 'Control') {
      setActiveTab('compare')
    } else {
      setActiveTab('dashboard')
      if (pill === 'Coverage') {
        setViewMode('2d')
      } else if (pill === 'Overview') {
        setViewMode('3d')
      }
    }
  }

  const currentStage = activeScenario?.design.launch_stage || 3

  return (
    <header className="absolute top-4 left-0 right-0 z-30 pointer-events-none flex items-center justify-between px-5 select-none font-sans">
      {/* Left minimal branding */}
      <div className="pointer-events-auto flex items-center gap-2 bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-full px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5),-1px_0_8px_rgba(255,255,255,0.04),1px_0_8px_rgba(255,255,255,0.04)]">
        <span className="text-[12px] font-black tracking-[0.25em] text-white uppercase font-sans">
          SPACEX
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[11px] font-bold tracking-[0.15em] text-zinc-300 uppercase font-sans">
          COSMO-NET
        </span>
      </div>

      {/* Center Sci-Fi Framed Buttons (Framed, no background, translucent on hover) */}
      <div className="pointer-events-auto flex items-center gap-2">
        {(['Overview', 'Fleet', 'Coverage', 'Telemetry', 'Control'] as const).map((item) => {
          const isActive = activeNavPill === item
          return (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className={`px-3.5 py-1 text-xs font-sans tracking-wider rounded-md border transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-sm ${
                isActive
                  ? 'bg-white/15 border-white/45 text-white font-semibold shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                  : 'bg-transparent border-white/20 text-zinc-300 hover:bg-white/10 hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="text-[9px] text-zinc-500 font-mono">·</span>
              <span>{item}</span>
              <span className="text-[9px] text-zinc-500 font-mono">·</span>
            </button>
          )
        })}
      </div>

      {/* Right Controls (Monochrome dark grey floating controls) */}
      <div className="pointer-events-auto flex items-center gap-2 text-xs font-mono">
        <div className="bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
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

        <div className="bg-[#10131a]/80 backdrop-blur-md border border-white/12 rounded-lg p-0.5 flex items-center text-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => handleStageChange(s)}
              className={`px-2 py-0.5 rounded cursor-pointer font-bold transition-colors ${
                currentStage === s
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Этап {s}
            </button>
          ))}
        </div>

        <button
          onClick={handleReset}
          className="bg-[#10131a]/80 backdrop-blur-md border border-white/12 hover:border-white/30 text-zinc-300 p-1.5 rounded-lg cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors"
          title="Сброс (Reset)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenImport}
          className="bg-[#10131a]/80 backdrop-blur-md border border-white/12 hover:border-white/30 text-zinc-300 p-1.5 rounded-lg cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-colors"
          title="Импорт JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenExport}
          className="bg-white/10 hover:bg-white/20 border border-white/25 text-white px-3 py-1 rounded-lg text-xs font-sans font-bold flex items-center gap-1 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all"
          title="Экспорт результата"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  )
}
