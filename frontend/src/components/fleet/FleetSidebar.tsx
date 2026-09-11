import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { OrbitConfigurator } from '@/components/sidebar/OrbitConfigurator'
import { OutageManager } from '@/components/sidebar/OutageManager'
import {
  computeSatelliteThermalPower,
  computeLinkBudget,
  computeOrbitalPassTimer,
} from '@/core/telemetryEngine'
import { groundPosition } from '@/core/geometryEngine'

// Satellite codenames mapping for realistic mission feel
const CODENAMES: Record<string, string> = {
  S01: 'Aurora-1',
  S02: 'Aurora-2',
  S03: 'Aurora-3',
  S04: 'Aurora-4',
  S05: 'Aurora-5',
  S06: 'Aurora-6',
  S07: 'Aurora-7',
  S08: 'Aurora-8',
  S09: 'Meridian-1',
  S10: 'Meridian-2',
  S11: 'Meridian-3',
  S12: 'Meridian-4',
  S13: 'Zenith-X',
  S14: 'Zenith-1',
  S15: 'Zenith-2',
  S16: 'Zenith-3',
  S17: 'Helios-A',
  S18: 'Helios-B',
  S19: 'Helios-R',
  S20: 'Vector-1',
  S21: 'Vector-2',
  S22: 'Vector-3',
  S23: 'Polaris-1',
  S24: 'Polaris-2',
}

export const FleetSidebar: React.FC = () => {
  // 1. ALL HOOKS CALLED AT TOP LEVEL (React 19 Rule)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    selectedSatelliteId,
    setSelectedSatellite,
    simulationResult,
    selectedClientId,
  } = useSimulationStore()

  const [planeFilter, setPlaneFilter] = useState<'ALL' | 'P1' | 'P2' | 'P3'>('ALL')
  const [activeTab, setActiveTab] = useState<'fleet' | 'orbits' | 'outages'>('fleet')

  // Derived values & memos (ALL BEFORE ANY CONDITIONAL RETURN)
  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap = useMemo(() => {
    if (!simulationResult?.snapshots || simulationResult.snapshots.length === 0) return null
    return simulationResult.snapshots[Math.min(idx, simulationResult.snapshots.length - 1)]
  }, [simulationResult, idx])

  const clientData = useMemo(() => {
    return simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  }, [simulationResult, selectedClientId])

  const clientPos = useMemo(() => {
    const c = activeScenario?.ground_sites.find((g) => g.id === selectedClientId)
    if (!c) return null
    return groundPosition(c.lat_deg, c.lon_deg)
  }, [activeScenario, selectedClientId])

  const activeRoutePath = useMemo(() => {
    const currentTimelineItem = clientData?.timeline.find((item) => item.t_s === idx * step)
    return currentTimelineItem?.path || []
  }, [clientData, idx, step])

  const satsList = useMemo(() => {
    if (!currentSnap) return []
    return currentSnap.satellites.filter((s) => {
      if (planeFilter !== 'ALL' && s.plane_id !== planeFilter) return false
      return true
    })
  }, [currentSnap, planeFilter])

  const activeSatsCount = useMemo(() => {
    return currentSnap?.satellites.filter((s) => s.active).length ?? 0
  }, [currentSnap])

  const totalSatsCount = activeScenario?.design.satellites.length ?? 48

  // Format real orbit pass timer using Keplerian mean motion
  const formatTimer = (satId: string) => {
    if (!activeScenario) return '00:00:00'
    return computeOrbitalPassTimer(satId, activeScenario, currentTime_s)
  }

  // Graceful fallback render if data is loading, preserving container shell
  if (!activeScenario || !simulationResult) {
    return (
      <div
        style={{
          width: '280px',
          height: '100%',
          borderRadius: '20px',
          background: 'rgba(15, 18, 24, 0.40)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.45), -1px 0 10px rgba(255, 255, 255, 0.03), 1px 0 10px rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="p-4 flex items-center justify-center text-xs font-mono text-zinc-500 backdrop-blur-[4px]"
      >
        <span>Loading constellation...</span>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        borderRadius: '20px',
        background: 'rgba(15, 18, 24, 0.40)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.45), -1px 0 10px rgba(255, 255, 255, 0.03), 1px 0 10px rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="backdrop-blur-[4px] select-none font-mono shadow-2xl shrink-0"
    >
      {/* 2. Header Section */}
      <div className="p-3.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          {/* Subtab switcher for Fleet / Orbits / Outages */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/8 text-[10px] font-sans">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeTab === 'fleet' ? 'bg-white/15 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Флот
            </button>
            <button
              onClick={() => setActiveTab('orbits')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeTab === 'orbits' ? 'bg-white/15 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Орбиты
            </button>
            <button
              onClick={() => setActiveTab('outages')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                activeTab === 'outages' ? 'bg-white/15 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Отказы
            </button>
          </div>

          <span className="text-[10px] font-mono text-zinc-300 font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
            {activeSatsCount}/{totalSatsCount}
          </span>
        </div>

        {activeTab === 'fleet' && (
          <>
            {/* Plane Filter Pills (Monochrome) */}
            <div className="flex items-center gap-1 mt-2.5">
              {(['ALL', 'P1', 'P2', 'P3'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlaneFilter(p)}
                  className={`flex-1 py-0.5 rounded text-[9px] font-sans font-semibold transition-colors cursor-pointer border ${
                    planeFilter === p
                      ? 'bg-white/15 text-white border-white/30'
                      : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'orbits' && <OrbitConfigurator />}
        {activeTab === 'outages' && <OutageManager />}
        {activeTab === 'fleet' && (
          <div className="flex flex-col gap-2">
            {satsList.map((sat, i) => {
              const codename = CODENAMES[sat.id] || `Sat-${sat.id}`
              const isSelected = sat.id === selectedSatelliteId
              const isInRoute = activeRoutePath.includes(sat.id)

              const satAlt = activeScenario.environment.altitude_km || 550
              const thermalPower = computeSatelliteThermalPower(sat, activeScenario, currentTime_s)
              const batteryPct = sat.active ? thermalPower.batterySocPct : 0

              let signalPct = 0
              if (sat.active) {
                if (clientPos) {
                  const lb = computeLinkBudget(
                    sat,
                    clientPos,
                    24.5,
                    sat.active,
                    activeScenario.environment.min_elevation_deg
                  )
                  signalPct = lb.inLineOfSight
                    ? lb.signalPct
                    : Math.max(12, Math.round(18 + Math.sin(currentTime_s * 0.01 + i) * 6))
                } else {
                  signalPct = 92
                }
              }

              const satNum = parseInt(sat.id.replace(/\D/g, '') || '1', 10)
              const satPhotoUrl = `/satellites/sat_${((satNum - 1) % 3) + 1}.jpg`

              return (
                <div
                  key={sat.id}
                  onClick={() => setSelectedSatellite(sat.id)}
                  style={
                    isSelected
                      ? {
                          borderRadius: '14px',
                          background: 'rgba(255, 255, 255, 0.12)',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          boxShadow:
                            '0 4px 16px rgba(0, 0, 0, 0.4), -1px 0 8px rgba(255, 255, 255, 0.04), 1px 0 8px rgba(255, 255, 255, 0.04)',
                        }
                      : {
                          borderRadius: '14px',
                          background: isInRoute
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(0, 0, 0, 0.35)',
                          border: isInRoute
                            ? '1px solid rgba(255, 255, 255, 0.22)'
                            : '1px solid rgba(255, 255, 255, 0.07)',
                        }
                  }
                  className="p-2.5 transition-all relative overflow-hidden cursor-pointer hover:border-white/20"
                >
                  {/* Top Row: Icon + Name + Nominal Pill */}
                  <div className="flex items-start gap-2.5">
                    {/* Real Satellite Photograph Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-black/70 border border-white/15 overflow-hidden shrink-0 relative group shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                      <img
                        src={satPhotoUrl}
                        alt={codename}
                        className={`w-full h-full object-cover object-center transition-all duration-300 ${
                          !sat.active
                            ? 'grayscale brightness-50 contrast-125'
                            : 'contrast-110 group-hover:scale-110'
                        }`}
                      />
                      {!sat.active && (
                        <div className="absolute inset-0 bg-[#c86f78]/30 flex items-center justify-center">
                          <span className="text-[7px] font-mono font-bold text-rose-200">FAIL</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-sans truncate">
                          {codename}
                        </span>

                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase leading-none border ${
                            sat.active
                              ? 'bg-white/10 border-white/20 text-zinc-200'
                              : 'bg-zinc-850 border-white/20 text-zinc-400'
                          }`}
                        >
                          {sat.active ? 'Nominal' : 'Offline'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1">
                        <span>Alt: {satAlt} km</span>
                        <span>{formatTimer(sat.id)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Rows (Monochrome signal and battery segmented dashes) */}
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5 text-[9px]">
                    {/* Signal */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 uppercase font-sans text-[8px] w-12">
                        Signal
                      </span>
                      <div className="flex-1 flex items-center gap-[2px] px-1">
                        {Array.from({ length: 12 }).map((_, dotIdx) => {
                          const isLit = dotIdx < Math.round((signalPct / 100) * 12)
                          return (
                            <div
                              key={dotIdx}
                              style={{
                                height: '4px',
                                flex: '1',
                                borderRadius: '1px',
                                backgroundColor: isLit
                                  ? sat.active
                                    ? '#f4f4f5'
                                    : '#71717a'
                                  : '#27272a',
                              }}
                            />
                          )
                        })}
                      </div>
                      <span className="text-zinc-200 font-bold font-mono text-[9px] w-7 text-right">
                        {signalPct}%
                      </span>
                    </div>

                    {/* Battery */}
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 uppercase font-sans text-[8px] w-12">
                        Battery
                      </span>
                      <div className="flex-1 flex items-center gap-[2px] px-1">
                        {Array.from({ length: 12 }).map((_, dotIdx) => {
                          const isLit = dotIdx < Math.round((batteryPct / 100) * 12)
                          return (
                            <div
                              key={dotIdx}
                              style={{
                                height: '4px',
                                flex: '1',
                                borderRadius: '1px',
                                backgroundColor: isLit
                                  ? sat.active
                                    ? '#d4d4d8'
                                    : '#71717a'
                                  : '#27272a',
                              }}
                            />
                          )
                        })}
                      </div>
                      <span className="text-zinc-200 font-bold font-mono text-[9px] w-7 text-right">
                        {batteryPct}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

