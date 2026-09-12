import React, { useState, useRef, useEffect } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import {
  Download,
  Upload,
  RotateCcw,
  Layers,
  BarChart2,
  Lightbulb,
  ChevronDown,
  Check,
  Trash2,
  FileText,
} from 'lucide-react'

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
    removeScenario,
  } = useScenarioStore()
  const { activeTab, setActiveTab, recalculate } = useSimulationStore()

  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsScenarioDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectScenario = async (id: string) => {
    await loadDefaultScenario(id)
    setIsScenarioDropdownOpen(false)
    recalculate()
  }

  const handleDeleteScenario = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await removeScenario(id)
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
  const currentScenarioItem = availableScenarios.find((s) => s.id === activeScenarioId)

  return (
    <header className="absolute top-3 left-4 right-4 z-30 pointer-events-none flex items-center justify-between select-none font-sans gap-3">
      {/* 1. Left branding + Navigation tabs */}
      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
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
      <div className="pointer-events-auto flex items-center gap-2 bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl px-2 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.5)] shrink-0">
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
      <div className="pointer-events-auto flex items-center gap-1.5 text-xs font-mono shrink-0">
        {/* Custom Scenario Dropdown with Deletion */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setIsScenarioDropdownOpen((prev) => !prev)}
            className="bg-[#10131a]/85 hover:bg-[#151922] backdrop-blur-md border border-white/12 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer transition-all text-left"
          >
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-400 leading-tight">Сценарий:</span>
              <span className="text-[11px] font-bold text-white max-w-[140px] truncate leading-tight">
                {currentScenarioItem?.label || activeScenario?.meta.title || 'Сценарий'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {isScenarioDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 rounded-2xl bg-[#0e121a]/95 backdrop-blur-2xl border border-white/15 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-50 font-sans space-y-1">
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/10 flex items-center justify-between">
                <span>Список сценариев</span>
                <span className="font-mono text-zinc-500">{availableScenarios.length}</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                {availableScenarios.map((sc) => {
                  const isSelected = sc.id === activeScenarioId
                  const isDeletable =
                    sc.isCustom ||
                    sc.id.startsWith('opt_') ||
                    sc.id.startsWith('imported_') ||
                    sc.id.startsWith('variant_') ||
                    sc.id.startsWith('05_') ||
                    sc.id.startsWith('06_')

                  return (
                    <div
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc.id)}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-all text-xs ${
                        isSelected
                          ? 'bg-white/20 text-white font-bold'
                          : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                        )}
                        <span className="truncate">{sc.label}</span>
                      </div>

                      {isDeletable && (
                        <button
                          onClick={(e) => handleDeleteScenario(e, sc.id)}
                          className="opacity-60 hover:opacity-100 hover:bg-rose-500/20 text-rose-400 p-1 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Удалить этот сценарий"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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

        {/* Report PDF Button: opens PDF directly in another page/tab */}
        <a
          href="./report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-[11px] font-sans font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          title="Открыть подробный научно-технический отчёт в формате PDF в новой вкладке"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Отчёт PDF</span>
        </a>
      </div>
    </header>
  )
}
