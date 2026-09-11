import React from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { BookmarkPlus, Sliders, Radio } from 'lucide-react'

export const OrbitConfigurator: React.FC = () => {
  const { activeScenario, updatePlane, updateEnvironment, saveCurrentVariant } = useScenarioStore()
  const { recalculate } = useSimulationStore()
  const [savedFeedback, setSavedFeedback] = React.useState(false)

  if (!activeScenario) return null

  const env = activeScenario.environment
  const planes = activeScenario.design.planes

  const handlePlaneChange = (planeId: string, raan: number, phase: number) => {
    updatePlane(planeId, raan, phase)
    recalculate()
  }

  const handleEnvChange = (key: 'isl_range_km' | 'min_elevation_deg', val: number) => {
    updateEnvironment({ [key]: val })
    recalculate()
  }

  const handleSaveVariant = () => {
    saveCurrentVariant()
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2.5 font-mono text-zinc-200">
      {/* Header */}
      <div className="pb-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white">
            <Sliders className="w-3.5 h-3.5 text-zinc-300" />
            <h3 className="text-xs font-bold uppercase font-sans tracking-wide">
              Конфигуратор орбит
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveVariant}
            className="h-6 text-[10px] px-2 text-zinc-300 border-white/15 hover:bg-white/10"
            title="Сохранить текущую настройку для сопоставления"
          >
            <BookmarkPlus className="w-3 h-3 mr-1 text-zinc-400" />
            {savedFeedback ? 'Сохранено!' : 'Сохранить'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 pt-1 text-xs">
        {/* Environment Link & Elevation Settings */}
        <div className="space-y-3 bg-black/40 p-2.5 rounded-xl border border-white/10">
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-300">
              <span className="text-zinc-400 text-[11px]">Предельная дальность ISL:</span>
              <span className="text-white font-bold font-mono">{env.isl_range_km} км</span>
            </div>
            <Slider
              value={[env.isl_range_km]}
              min={1500}
              max={5000}
              step={100}
              onValueChange={([val]) => handleEnvChange('isl_range_km', val)}
            />
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
              <span>1500 км</span>
              <span>3000 км (база)</span>
              <span>5000 км</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex justify-between text-zinc-300">
              <span className="text-zinc-400 text-[11px]">Мин. угол возвышения:</span>
              <span className="text-white font-bold font-mono">{env.min_elevation_deg}°</span>
            </div>
            <Slider
              value={[env.min_elevation_deg]}
              min={5}
              max={30}
              step={1}
              onValueChange={([val]) => handleEnvChange('min_elevation_deg', val)}
            />
          </div>
        </div>

        {/* Planes RAAN & Phase Tuning */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Radio className="w-3 h-3 text-zinc-400" />
            Орбитальные плоскости (3x16 КА)
          </div>

          {planes.map((plane) => (
            <div
              key={plane.id}
              className="bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold border border-white/20 bg-white/5 px-2 py-0.5 rounded-md text-[11px] text-white">
                  Плоскость {plane.id}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  RAAN: <b className="text-white">{plane.raan_deg.toFixed(1)}°</b> | Фаза:{' '}
                  <b className="text-white">{plane.phase_deg.toFixed(1)}°</b>
                </span>
              </div>

              {/* RAAN Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Ориентация плоскости (RAAN):</span>
                  <span className="text-zinc-200 font-bold font-mono">{plane.raan_deg.toFixed(1)}°</span>
                </div>
                <Slider
                  value={[plane.raan_deg]}
                  min={0}
                  max={359}
                  step={1}
                  onValueChange={([val]) => handlePlaneChange(plane.id, val, plane.phase_deg)}
                />
              </div>

              {/* Phase Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Фазовый сдвиг аппаратов вдоль орбиты:</span>
                  <span className="text-zinc-200 font-bold font-mono">{plane.phase_deg.toFixed(1)}°</span>
                </div>
                <Slider
                  value={[plane.phase_deg]}
                  min={0}
                  max={359}
                  step={0.5}
                  onValueChange={([val]) => handlePlaneChange(plane.id, plane.raan_deg, val)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
