import React, { useState, useMemo } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useScenarioStore } from '@/stores/scenarioStore'
import { AlertTriangle, ArrowRight } from 'lucide-react'

// Satellite codenames mapping
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

export const SpaceXTelemetryPanel: React.FC = () => {
  // 1. TOP LEVEL HOOKS (React 19 Rule)
  const {
    currentTime_s,
    selectedClientId,
    selectedSatelliteId,
    setSelectedSatellite,
    simulationResult,
    recalculate,
  } = useSimulationStore()

  const { activeScenario, killSatelliteNow } = useScenarioStore()

  const [alertDismissed, setAlertDismissed] = useState(false)

  // Derived calculations (ALL AT TOP LEVEL)
  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap = useMemo(() => {
    if (!simulationResult?.snapshots || simulationResult.snapshots.length === 0) return null
    return simulationResult.snapshots[Math.min(idx, simulationResult.snapshots.length - 1)]
  }, [simulationResult, idx])

  // Client path & status
  const clientData = useMemo(() => {
    return simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  }, [simulationResult, selectedClientId])

  const currentTimeline = useMemo(() => {
    return clientData?.timeline.find((t) => t.t_s === idx * step)
  }, [clientData, idx, step])

  const isConnected = currentTimeline?.status === 'connected'

  // Selected Satellite
  const satId = selectedSatelliteId || 'S01'
  const satObj = useMemo(() => {
    return currentSnap?.satellites.find((s) => s.id === satId)
  }, [currentSnap, satId])

  const satName = CODENAMES[satId] || `КА ${satId}`
  const isSatFailed = satObj ? !satObj.active : false

  // 30 bars representing signal history over the last 30 minutes
  const barHeights = useMemo(() => {
    return [
      38, 44, 52, 50, 68, 74, 82, 78, 90, 92, 94, 89, 82, 86, 91, 94, 92, 88, 76, 82, 88, 92, 94,
      92, 90, 86, 91, 93, 94, 94,
    ]
  }, [])

  // Emergency Dijkstra failure response trigger
  const handleRespondAnomaly = () => {
    killSatelliteNow(satId, currentTime_s)
    recalculate()
  }

  // Graceful fallback render if data is loading
  if (!simulationResult || !activeScenario) {
    return (
      <div
        style={{
          width: '300px',
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
        <span>Telemetry initializing...</span>
      </div>
    )
  }

  const planeLabel = satObj?.plane_id ? `PLANE ${satObj.plane_id.replace('P', '')}` : 'PLANE 1'
  const altKm = activeScenario.environment.altitude_km || 550
  const routeHops = currentTimeline?.path || [selectedClientId, 'S01', 'S02', 'G_MUR']
  const routeDist = currentTimeline?.distance_km || 2480
  const routeLatency =
    currentTimeline?.distance_km != null
      ? ((currentTimeline.distance_km / 299.792) + (currentTimeline.hops || 1) * 2).toFixed(1)
      : '12.3'

  return (
    <div
      style={{
        width: '300px',
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
      {/* 2. Header */}
      <div className="p-3.5 pb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            {/* Subtitle: ACTIVE ASSET */}
            <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest font-sans block leading-none">
              ACTIVE ASSET
            </span>
            {/* Title: Aurora-1 (S01) */}
            <h2 className="text-[16px] font-black text-white font-sans mt-1 leading-tight">
              {satName} ({satId})
            </h2>
            {/* Metadata Line: PLANE 1 • 550 KM LEO • RELAY MODE */}
            <div className="text-[10px] font-mono text-zinc-400 mt-1">
              {planeLabel} • {altKm} KM LEO • RELAY MODE
            </div>
          </div>

          {/* Status Pill: [ Nominal ] */}
          {isSatFailed ? (
            <span className="bg-zinc-800 border border-white/20 text-zinc-300 text-xs px-2 py-0.5 rounded-full font-bold font-sans">
              Offline
            </span>
          ) : (
            <span className="bg-white/10 border border-white/20 text-zinc-200 text-xs px-2 py-0.5 rounded-full font-bold font-sans">
              Nominal
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 3. Card 1: Signal Strength Histogram (Monochrome) */}
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="text-[11px] font-bold text-zinc-300">Signal strength</span>
            <span className="text-zinc-400 font-mono text-[10px]">-1.23k • 11 dBm</span>
          </div>

          {/* Big Digit: 94% in pure white */}
          <div className="flex items-baseline justify-between">
            <span className="text-[18px] font-black text-white font-sans tracking-tight">
              {isSatFailed ? '0%' : '94%'}
            </span>
            <span className="text-[9px] text-zinc-400 uppercase font-mono">Carrier: 24.5 GHz</span>
          </div>

          {/* The 30-Bar Histogram (Monochrome bars) */}
          <div className="h-12 w-full flex items-end justify-between pt-1">
            {barHeights.map((val, i) => {
              const h = isSatFailed ? 4 : (val / 100) * 44
              const isRecent = i >= 24
              return (
                <div
                  key={i}
                  style={{
                    width: '5px',
                    margin: '0 1px',
                    borderRadius: '2px 2px 0 0',
                    height: `${h}px`,
                    backgroundColor: isSatFailed ? '#71717a' : isRecent ? '#ffffff' : '#52525b',
                  }}
                  className="transition-all duration-200"
                />
              )
            })}
          </div>

          <div className="flex justify-between text-[9px] text-zinc-400 font-mono pt-0.5">
            <span>-30 min</span>
            <span className="text-zinc-200 font-semibold">NOW</span>
          </div>
        </div>

        {/* 4. Card 2: Payload Diagnostics (Monochrome curves) */}
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 space-y-2 font-sans">
          <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
            Payload diagnostics
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
              <span className="text-[9px] text-zinc-400 uppercase font-semibold">
                Payload temp
              </span>
              <svg className="w-full h-6 my-1" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,16 Q20,6 40,12 T75,8 L100,14"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.75)"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-[12px] font-black text-white font-mono">+19.4°C</span>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-lg p-2 flex flex-col justify-between">
              <span className="text-[9px] text-zinc-400 uppercase font-semibold">Tx power</span>
              <svg className="w-full h-6 my-1" viewBox="0 0 100 24" preserveAspectRatio="none">
                <path
                  d="M0,10 Q25,18 50,6 T80,14 L100,8"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.50)"
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-[12px] font-black text-white font-mono">24.0 dBm</span>
            </div>
          </div>
        </div>

        {/* 5. Card 3: Anomaly Detected Box (Translucent dark grey with pale straw accent) */}
        {!alertDismissed && (
          <div
            style={{
              background: 'rgba(20, 22, 28, 0.65)',
              border: '1px solid rgba(200, 178, 118, 0.35)',
              borderRadius: '12px',
              padding: '12px',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(200, 178, 118, 0.08)',
            }}
            className="space-y-2.5 font-sans transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#c8b276]" />
                <span className="text-[12px] font-bold text-zinc-100">
                  {isSatFailed ? 'Critical Offline Alert' : 'Anomaly detected'}
                </span>
              </div>
              <button
                onClick={() => setAlertDismissed(true)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer px-1 transition-colors"
                title="Dismiss warning"
              >
                ✕
              </button>
            </div>

            {/* Progress Sliders */}
            <div className="space-y-2 text-[10px] font-mono">
              <div>
                <div className="flex justify-between text-zinc-300">
                  <span>Orbit deviation:</span>
                  <b className="text-zinc-200">
                    {isSatFailed ? '100%' : '12%'}
                  </b>
                </div>
                <div className="h-1.5 w-full bg-black/60 rounded-xs mt-1 overflow-hidden">
                  <div
                    style={{
                      width: isSatFailed ? '100%' : '12%',
                      backgroundColor: isSatFailed ? '#c8b276' : '#ffffff',
                    }}
                    className="h-full rounded-xs transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300">
                  <span>Thermal threshold:</span>
                  <b className="text-zinc-200">98%</b>
                </div>
                <div className="h-1.5 w-full bg-black/60 rounded-xs mt-1 overflow-hidden">
                  <div
                    style={{ width: '98%', backgroundColor: '#c8b276' }}
                    className="h-full rounded-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300">
                  <span>Power budget:</span>
                  <b className="text-zinc-300">44%</b>
                </div>
                <div className="h-1.5 w-full bg-black/60 rounded-xs mt-1 overflow-hidden">
                  <div
                    style={{ width: '44%', backgroundColor: '#71717a' }}
                    className="h-full rounded-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons: [ Dismiss ], [ Respond ] */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setAlertDismissed(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#d4d4d8',
                  fontSize: '11px',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-white/10 font-sans font-medium transition-colors"
              >
                Dismiss
              </button>

              <button
                onClick={handleRespondAnomaly}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.30)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-white/20 font-sans transition-all"
                title="Initiate emergency Dijkstra reroute failure test"
              >
                Respond
              </button>
            </div>
          </div>
        )}

        {/* 6. Card 4: Client Route Breakdown (Monochrome) */}
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-sans">
            <span className="text-zinc-300 font-bold">Client Route Breakdown</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                isConnected
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-zinc-800 text-zinc-400 border-white/15'
              }`}
            >
              {isConnected ? `${currentTimeline?.hops} HOPS` : currentTimeline?.reason || 'LINK OK'}
            </span>
          </div>

          {/* Hop sequence */}
          <div className="flex items-center flex-wrap gap-1 bg-black/60 p-2 rounded-lg border border-white/5 text-[11px] font-mono">
            {routeHops.map((node, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => {
                    if (node.startsWith('S')) setSelectedSatellite(node)
                  }}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors border ${
                    node === selectedClientId
                      ? 'text-white bg-white/20 border-white/35 shadow-sm'
                      : node === 'G_MUR'
                      ? 'text-zinc-200 bg-white/10 border-white/20'
                      : node === satId
                      ? 'text-white bg-white/25 border-white/50 shadow-sm'
                      : 'text-zinc-300 bg-white/5 border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {node}
                </button>
                {i < routeHops.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Distance & Latency metrics */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
            <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
              <span>Distance:</span>
              <b className="text-zinc-100 font-mono font-bold">{routeDist} km</b>
            </div>
            <div className="flex justify-between bg-black/40 p-2 rounded-lg border border-white/5">
              <span>Latency:</span>
              <b className="text-zinc-100 font-mono font-bold">{routeLatency} ms</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

