import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { OrbitConfigurator } from '@/components/sidebar/OrbitConfigurator'
import { OutageManager } from '@/components/sidebar/OutageManager'

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

  const [missionMode, setMissionMode] = useState<'Relay' | 'Tracking' | 'Inspection' | 'Standby'>(
    'Relay'
  )
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

  // Format orbit timer
  const formatTimer = (satIdx: number) => {
    const totalSec = (currentTime_s + satIdx * 370) % 5700
    const m = Math.floor(totalSec / 60)
    const s = Math.floor(totalSec % 60)
    return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Graceful fallback render if data is loading, preserving container shell
  if (!activeScenario || !simulationResult) {
    return (
      <div
        style={{
          width: '280px',
          height: '100%',
          borderRadius: '20px',
          background: 'rgba(16, 19, 26, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            '0 12px 32px rgba(0, 0, 0, 0.7), -1px 0 14px rgba(255, 255, 255, 0.05), 1px 0 14px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="p-4 flex items-center justify-center text-xs font-mono text-zinc-500 backdrop-blur-xl"
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
        background: 'rgba(16, 19, 26, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow:
          '0 12px 32px rgba(0, 0, 0, 0.7), -1px 0 14px rgba(255, 255, 255, 0.05), 1px 0 14px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      className="backdrop-blur-xl select-none font-mono shadow-2xl shrink-0"
    >
      {/* 2. Header Section */}
      <div className="p-3.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            {/* Title: Satellite Fleet */}
            <h2 className="text-[14px] font-black tracking-wide text-white uppercase font-sans leading-none">
              Satellite Fleet
            </h2>
            {/* Segmented dash line directly underneath (monochrome with soft amber warning accent) */}
            <div className="flex items-center gap-1 mt-1.5">
              <div className="w-5 h-[2px] bg-white rounded-full"></div>
              <div className="w-5 h-[2px] bg-white/70 rounded-full"></div>
              <div className="w-5 h-[2px] bg-amber-400/80 rounded-full"></div>
              <div className="w-5 h-[2px] bg-zinc-500 rounded-full"></div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-zinc-300">
              {activeSatsCount}/{totalSatsCount}
            </span>

            {/* Subtab switcher for Orbits / Outages */}
            <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-md border border-white/5 text-[9px] font-sans">
              <button
                onClick={() => setActiveTab('fleet')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === 'fleet' ? 'bg-white/15 text-white font-bold' : 'text-zinc-400'
                }`}
              >
                Флот
              </button>
              <button
                onClick={() => setActiveTab('orbits')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === 'orbits' ? 'bg-white/15 text-white font-bold' : 'text-zinc-400'
                }`}
              >
                Орбиты
              </button>
              <button
                onClick={() => setActiveTab('outages')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === 'outages' ? 'bg-white/15 text-white font-bold' : 'text-zinc-400'
                }`}
              >
                Отказы
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'fleet' && (
          <>
            {/* 3. Mission mode header & 4-grid buttons */}
            <div className="mt-2.5">
              <div className="text-[11px] font-semibold text-zinc-300 font-sans mb-1.5">
                Mission mode
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Tracking', 'Inspection', 'Relay', 'Standby'] as const).map((mode) => {
                  const isActive = missionMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => setMissionMode(mode)}
                      style={
                        isActive
                          ? {
                              background:
                                'linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.40)',
                              boxShadow:
                                'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 2px 8px rgba(0, 0, 0, 0.4)',
                              color: '#ffffff',
                              fontWeight: 700,
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }
                          : {
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#a1a1aa',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }
                      }
                      className="font-sans transition-all text-center hover:text-white"
                    >
                      {mode}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Plane Filter Pills (Monochrome) */}
            <div className="flex items-center gap-1 mt-2">
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
              const signalPct = sat.active
                ? 90 + ((parseInt(sat.id.replace(/\D/g, '') || '1', 10) * 7) % 9)
                : 0
              const batteryPct = sat.active
                ? 82 + ((parseInt(sat.id.replace(/\D/g, '') || '1', 10) * 11) % 17)
                : 0

              return (
                <div
                  key={sat.id}
                  onClick={() => setSelectedSatellite(sat.id)}
                  style={
                    isSelected
                      ? {
                          borderRadius: '14px',
                          background: 'rgba(28, 33, 44, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          boxShadow:
                            '0 4px 16px rgba(0, 0, 0, 0.5), -1px 0 8px rgba(255, 255, 255, 0.04), 1px 0 8px rgba(255, 255, 255, 0.04)',
                        }
                      : {
                          borderRadius: '14px',
                          background: isInRoute
                            ? 'rgba(35, 40, 52, 0.75)'
                            : 'rgba(18, 22, 30, 0.65)',
                          border: isInRoute
                            ? '1px solid rgba(255, 255, 255, 0.25)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        }
                  }
                  className="p-2.5 transition-all relative overflow-hidden cursor-pointer hover:border-white/20"
                >
                  {/* Top Row: Icon + Name + Nominal Pill */}
                  <div className="flex items-start gap-2.5">
                    {/* 3D Satellite Icon Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center shrink-0 text-zinc-300">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <rect
                          x="9"
                          y="8"
                          width="6"
                          height="8"
                          rx="1"
                          fill="currentColor"
                          fillOpacity="0.2"
                        />
                        <line x1="2" y1="12" x2="9" y2="12" strokeWidth="1.5" />
                        <rect
                          x="2"
                          y="9.5"
                          width="5"
                          height="5"
                          rx="0.5"
                          fill="currentColor"
                          fillOpacity="0.3"
                        />
                        <line x1="15" y1="12" x2="22" y2="12" strokeWidth="1.5" />
                        <rect
                          x="17"
                          y="9.5"
                          width="5"
                          height="5"
                          rx="0.5"
                          fill="currentColor"
                          fillOpacity="0.3"
                        />
                        <circle cx="12" cy="5" r="1.5" />
                        <line x1="12" y1="5" x2="12" y2="8" strokeWidth="1.5" />
                      </svg>
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
                              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {sat.active ? 'Nominal' : 'Offline'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1">
                        <span>Alt: {satAlt} km</span>
                        <span>{formatTimer(i)}</span>
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
                                    : '#f59e0b'
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
                                    : '#f59e0b'
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

