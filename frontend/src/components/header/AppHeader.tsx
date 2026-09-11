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
      <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 shadow-lg">
        <span className="text-[12px] font-black tracking-[0.25em] text-white uppercase font-sans">
          SPACEX
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[11px] font-bold tracking-[0.15em] text-sky-400 uppercase font-sans">
          COSMO-NET
        </span>
      </div>

      {/* Center Sci-Fi Framed Buttons (Matches Image 4: framed, no background, translucent on hover) */}
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
                  : 'bg-transparent border-white/20 text-slate-300 hover:bg-white/10 hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="text-[9px] text-slate-400 font-mono">·</span>
              <span>{item}</span>
              <span className="text-[9px] text-slate-400 font-mono">·</span>
            </button>
          )
        })}
      </div>

      {/* Right Controls (Minimal floating discrete buttons) */}
      <div className="pointer-events-auto flex items-center gap-2 text-xs font-mono">
        <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[11px] shadow-lg">
          <select
            value={activeScenarioId}
            onChange={handleScenarioChange}
            className="bg-transparent text-xs text-sky-300 font-mono focus:outline-none cursor-pointer"
          >
            <option value="01_full_constellation" className="bg-slate-900 text-slate-200">
              01: Полная группировка (48 КА)
            </option>
            <option value="02_first_launch" className="bg-slate-900 text-slate-200">
              02: Первая очередь (16 КА)
            </option>
            <option value="03_satellite_outages" className="bg-slate-900 text-slate-200">
              03: Отказы 10 КА
            </option>
            <option value="04_link_range" className="bg-slate-900 text-slate-200">
              04: Дальность ISL 2000 км
            </option>
            {activeScenarioId === 'custom' && (
              <option value="custom" className="bg-slate-900 text-slate-200">
                Пользовательский
              </option>
            )}
          </select>
        </div>

        <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-lg p-0.5 flex items-center text-[10px] shadow-lg">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => handleStageChange(s)}
              className={`px-2 py-0.5 rounded cursor-pointer font-bold transition-colors ${
                currentStage === s
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Этап {s}
            </button>
          ))}
        </div>

        <button
          onClick={handleReset}
          className="bg-slate-950/40 backdrop-blur-md border border-white/10 hover:border-white/30 text-slate-300 p-1.5 rounded-lg cursor-pointer shadow-lg transition-colors"
          title="Сброс (Reset)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenImport}
          className="bg-slate-950/40 backdrop-blur-md border border-white/10 hover:border-white/30 text-sky-300 p-1.5 rounded-lg cursor-pointer shadow-lg transition-colors"
          title="Импорт JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenExport}
          className="bg-[#0284c7]/90 hover:bg-[#0284c7] text-white px-3 py-1 rounded-lg text-xs font-sans font-bold flex items-center gap-1 cursor-pointer shadow-lg backdrop-blur-md transition-all hover:brightness-110"
          title="Экспорт результата"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  )
}
