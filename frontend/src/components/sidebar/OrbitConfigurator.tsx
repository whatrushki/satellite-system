import React from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
    <Card className="flex flex-col gap-2 font-mono">
      <CardHeader className="pb-2 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <CardTitle>КОНФИГУРАТОР ОРБИТ И ПЛОСКОСТЕЙ</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveVariant}
            className="h-6 text-[10px] px-2 text-slate-300 border-slate-700 hover:bg-slate-800"
            title="Сохранить текущую настройку для сопоставления"
          >
            <BookmarkPlus className="w-3 h-3 mr-1" />
            {savedFeedback ? 'Сохранено!' : 'Сохранить вариант'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-3 text-xs">
        {/* Environment Link & Elevation Settings */}
        <div className="space-y-3 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Предельная дальность ISL:</span>
              <span className="text-sky-400 font-bold">{env.isl_range_km} км</span>
            </div>
            <Slider
              value={[env.isl_range_km]}
              min={1500}
              max={5000}
              step={100}
              onValueChange={([val]) => handleEnvChange('isl_range_km', val)}
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>1500 км</span>
              <span>3000 км (база)</span>
              <span>5000 км</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Мин. угол возвышения:</span>
              <span className="text-amber-400 font-bold">{env.min_elevation_deg}°</span>
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
        <div className="space-y-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            Орбитальные плоскости (3x16 КА)
          </div>

          {planes.map((plane) => {
            let badgeColor = 'text-sky-400 border-sky-500/30'
            if (plane.id === 'P2') badgeColor = 'text-purple-400 border-purple-500/30'
            else if (plane.id === 'P3') badgeColor = 'text-emerald-400 border-emerald-500/30'

            return (
              <div
                key={plane.id}
                className="bg-slate-950/70 p-2.5 rounded border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold border px-1.5 py-0.5 rounded text-[11px] ${badgeColor}`}>
                    Плоскость {plane.id}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    RAAN: <b className="text-slate-200">{plane.raan_deg.toFixed(1)}°</b> | Фаза:{' '}
                    <b className="text-slate-200">{plane.phase_deg.toFixed(1)}°</b>
                  </span>
                </div>

                {/* RAAN Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Ориентация плоскости (RAAN):</span>
                    <span>{plane.raan_deg.toFixed(1)}°</span>
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
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Фазовый сдвиг аппаратов вдоль орбиты:</span>
                    <span>{plane.phase_deg.toFixed(1)}°</span>
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
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
