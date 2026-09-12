import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { computePositions, computeSnapshot } from '@/core/geometryEngine'
import { computeFootprintAlpha } from '@/core/coverageEngine'
import { findRoute } from '@/core/router'

export const PolarMapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    selectedClientId,
    setSelectedClient,
    selectedSatelliteId,
    setSelectedSatellite,
    selectedTarget,
    setSelectedStation,
    clearSelection,
    simulationResult,
    coverageMode,
  } = useSimulationStore()

  const [hoveredNode, setHoveredNode] = useState<{
    id: string
    type: 'sat' | 'ground'
    x: number
    y: number
    details: string
  } | null>(null)

  const minEl = activeScenario?.environment.min_elevation_deg ?? 10.0

  // Real-time snapshot computed dynamically for currentTime_s
  const liveSnap = useMemo(() => {
    if (!activeScenario) return null
    return computeSnapshot(activeScenario, currentTime_s)
  }, [activeScenario, currentTime_s])

  // Real-time dynamic route for selected client with seamless handovers
  const liveRoute = useMemo(() => {
    if (!activeScenario || !selectedClientId || !liveSnap) return null
    const gtwSet = new Set<string>()
    for (const g of activeScenario.ground_sites) {
      if (g.role === 'gateway') {
        const isOffline = (activeScenario.gateway_outages || []).some(
          (f) => f.gateway_id === g.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
        )
        if (!isOffline) gtwSet.add(g.id)
      }
    }
    return findRoute(liveSnap, activeScenario, selectedClientId, gtwSet)
  }, [activeScenario, currentTime_s, selectedClientId, liveSnap])

  const activeRoutePath = liveRoute?.path || []
  const isConnected = activeRoutePath.length >= 2

  // Direct line-of-sight check against live satellite positions and elevation
  const clientElev = liveSnap?.elevation_deg[selectedClientId] || {}
  const hasSatVis = Object.entries(clientElev).some(([sid, el]) => {
    const sat = liveSnap?.satellites.find((s) => s.id === sid)
    return sat?.active && el >= minEl
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      if (
        canvas.width !== Math.round(rect.width * window.devicePixelRatio) ||
        canvas.height !== Math.round(rect.height * window.devicePixelRatio)
      ) {
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
      }
      ctx.save()
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)

      const w = rect.width
      const h = rect.height
    const cx = w / 2
    const cy = h / 2
    const maxRadius = Math.min(w, h) * 0.44
    const minLat = 40.0 // Map covers 40°N to 90°N (Arctic & Northern latitudes)

    const latLonToXY = (lat_deg: number, lon_deg: number): [number, number] => {
      const clampedLat = Math.max(minLat, Math.min(90, lat_deg))
      const r = maxRadius * ((90 - clampedLat) / (90 - minLat))
      // Rotate by 90° so Murmansk / Eurasian Arctic is oriented naturally
      const angle = (lon_deg - 90) * (Math.PI / 180)
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
    }

    // 1. Clear background
    ctx.fillStyle = '#060911'
    ctx.fillRect(0, 0, w, h)

    // 2. Polar coordinate rings
    ctx.save()
    const rings = [80, 70, 66.5, 60, 50]
    for (const lat of rings) {
      const r = maxRadius * ((90 - lat) / (90 - minLat))
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, 2 * Math.PI)
      if (lat === 66.5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.setLineDash([4, 4])
        ctx.lineWidth = 1.0
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.setLineDash([])
        ctx.lineWidth = 0.75
      }
      ctx.stroke()

      // Lat label
      ctx.fillStyle = lat === 66.5 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(161, 161, 170, 0.45)'
      ctx.font = '9px monospace'
      ctx.fillText(lat === 66.5 ? '66.5°N (Полярный круг)' : `${lat}°N`, cx + 6, cy - r + 11)
    }

    // Longitude radials
    ctx.setLineDash([2, 4])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.lineWidth = 0.75
    for (let lon = 0; lon < 360; lon += 30) {
      const angle = (lon - 90) * (Math.PI / 180)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + maxRadius * Math.cos(angle), cy + maxRadius * Math.sin(angle))
      ctx.stroke()

      // Meridian label
      const lx = cx + (maxRadius + 14) * Math.cos(angle)
      const ly = cy + (maxRadius + 14) * Math.sin(angle)
      ctx.fillStyle = 'rgba(161, 161, 170, 0.4)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${lon}°`, lx, ly)
    }
    ctx.restore()

    // 3. Ground Stations (Terminals & Gateways)
    const elevRadiusDeg = 15 // Ground station elevation mask cone radius
    if (activeScenario?.ground_sites) {
      for (const g of activeScenario.ground_sites) {
        if (g.lat_deg < minLat) continue
        const [gx, gy] = latLonToXY(g.lat_deg, g.lon_deg)
        const isClient = g.role === 'client'
        const isSelected =
          selectedTarget?.type === 'ground'
            ? selectedTarget.id === g.id
            : isClient && g.id === selectedClientId
        const isReceiving =
          activeRoutePath.length >= 2 && activeRoutePath[activeRoutePath.length - 1] === g.id

        const isGatewayOffline =
          g.role === 'gateway' &&
          (activeScenario.gateway_outages || []).some(
            (f) => f.gateway_id === g.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
          )

        // Status-driven Color
        const statusColor = isGatewayOffline
          ? '#ef4444' // Red for outage
          : isClient
          ? isSelected
            ? isConnected
              ? '#10b981' // Emerald
              : hasSatVis
              ? '#f59e0b' // Amber
              : '#ef4444' // Red
            : '#a1a1aa'
          : isReceiving
          ? '#10b981'
          : '#93c5fd'

        // Compute pixel radius of the visibility cone
        const [edgeX] = latLonToXY(Math.max(minLat, g.lat_deg - elevRadiusDeg), g.lon_deg)
        const coneRadius = Math.abs(edgeX - gx)

        // Draw elevation cone circle
        ctx.save()
        ctx.beginPath()
        ctx.arc(gx, gy, coneRadius, 0, 2 * Math.PI)
        ctx.fillStyle = isGatewayOffline
          ? 'rgba(239, 68, 68, 0.06)'
          : isSelected || isReceiving
          ? 'rgba(255, 255, 255, 0.04)'
          : 'rgba(255, 255, 255, 0.02)'
        ctx.strokeStyle = statusColor
        ctx.lineWidth = isSelected || isReceiving || isGatewayOffline ? 1.5 : 0.75
        if (isGatewayOffline) {
          ctx.setLineDash([4, 4])
        }
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        // Draw station icon
        ctx.save()
        if (isClient) {
          ctx.beginPath()
          ctx.arc(gx, gy, isSelected ? 6 : 4.5, 0, 2 * Math.PI)
          ctx.fillStyle = statusColor
          ctx.fill()
          ctx.strokeStyle = '#060911'
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else {
          // Gateway diamond
          ctx.save()
          ctx.translate(gx, gy)
          ctx.rotate(Math.PI / 4)
          ctx.fillStyle = statusColor
          ctx.fillRect(-5.5, -5.5, 11, 11)
          ctx.strokeStyle = isGatewayOffline ? '#fca5a5' : '#060911'
          ctx.lineWidth = isGatewayOffline ? 2.0 : 1.5
          ctx.strokeRect(-5.5, -5.5, 11, 11)
          ctx.restore()
        }

        // Station ID Label
        ctx.font = isSelected || isGatewayOffline ? 'bold 11px monospace' : '10px monospace'
        ctx.fillStyle = isGatewayOffline ? '#ef4444' : isSelected ? '#ffffff' : '#a1a1aa'
        const roleLabel = isGatewayOffline ? 'ШЛЮЗ (ОТКАЗ)' : g.role === 'gateway' ? 'Шлюз' : 'Клиент'
        ctx.fillText(`${g.id} (${roleLabel})`, gx + 9, gy - 4)

        // Connection Status Badge Pill above node
        if (isGatewayOffline) {
          const badgeText = '● ШЛЮЗ НЕ РАБОТАЕТ (ОТКАЗ)'
          const badgeBg = 'rgba(239, 68, 68, 0.25)'
          const badgeBorder = '#ef4444'

          ctx.font = 'bold 9px monospace'
          const tw = ctx.measureText(badgeText).width
          ctx.fillStyle = badgeBg
          ctx.strokeStyle = badgeBorder
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(gx - tw / 2 - 5, gy - 23, tw + 10, 14, 4)
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = badgeBorder
          ctx.fillText(badgeText, gx - tw / 2, gy - 12)
        } else if (isClient && isSelected) {
          const badgeText = isConnected ? '● СВЯЗЬ: OK' : hasSatVis ? '● РАЗРЫВ МИС' : '● ВНЕ ЗОНЫ'
          const badgeBg = isConnected
            ? 'rgba(16, 185, 129, 0.25)'
            : hasSatVis
            ? 'rgba(245, 158, 11, 0.25)'
            : 'rgba(239, 68, 68, 0.25)'
          const badgeBorder = isConnected ? '#10b981' : hasSatVis ? '#f59e0b' : '#ef4444'

          ctx.font = 'bold 9px monospace'
          const tw = ctx.measureText(badgeText).width
          ctx.fillStyle = badgeBg
          ctx.strokeStyle = badgeBorder
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(gx - tw / 2 - 5, gy - 23, tw + 10, 14, 4)
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = badgeBorder
          ctx.fillText(badgeText, gx - tw / 2, gy - 12)
        } else if (!isClient) {
          const badgeText = isReceiving ? '● ПРИЕМ' : '● ШЛЮЗ'
          const badgeBg = isReceiving ? 'rgba(16, 185, 129, 0.25)' : 'rgba(96, 165, 250, 0.15)'
          const badgeBorder = isReceiving ? '#10b981' : '#60a5fa'

          ctx.font = 'bold 9px monospace'
          const tw = ctx.measureText(badgeText).width
          ctx.fillStyle = badgeBg
          ctx.strokeStyle = badgeBorder
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(gx - tw / 2 - 5, gy - 23, tw + 10, 14, 4)
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = badgeBorder
          ctx.fillText(badgeText, gx - tw / 2, gy - 12)
        }

        ctx.restore()
      }
    }

    // 4. Inter-Satellite Links (ISL Mesh) and Real-Time Satellites
    const liveSats = liveSnap?.satellites || (activeScenario ? computePositions(activeScenario, currentTime_s) : [])

    if (liveSnap && activeScenario) {
      const satMap = new Map(liveSats.map((s) => [s.id, s]))

      ctx.save()
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)'
      ctx.lineWidth = 0.75

      for (const [u, v] of liveSnap.edges) {
        const satU = satMap.get(u)
        const satV = satMap.get(v)

        if (satU && satV && satU.active && satV.active) {
          const rSatU = Math.hypot(satU.x_km, satU.y_km, satU.z_km)
          const latU = Math.asin(satU.z_km / rSatU) * (180 / Math.PI)
          const lonU = Math.atan2(satU.y_km, satU.x_km) * (180 / Math.PI)

          const rSatV = Math.hypot(satV.x_km, satV.y_km, satV.z_km)
          const latV = Math.asin(satV.z_km / rSatV) * (180 / Math.PI)
          const lonV = Math.atan2(satV.y_km, satV.x_km) * (180 / Math.PI)

          if (latU >= minLat - 5 && latV >= minLat - 5) {
            const [x1, y1] = latLonToXY(latU, lonU)
            const [x2, y2] = latLonToXY(latV, lonV)

            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        }
      }
      ctx.restore()

      // 5. Active Route Highlight & Animated Data Packets
      if (activeRoutePath.length >= 2) {
        const routeCoords: [number, number][] = []

        for (let i = 0; i < activeRoutePath.length; i++) {
          const nodeId = activeRoutePath[i]
          let px = 0,
            py = 0

          const gNode = activeScenario.ground_sites.find((g) => g.id === nodeId)
          if (gNode) {
            ;[px, py] = latLonToXY(gNode.lat_deg, gNode.lon_deg)
          } else {
            const sNode = satMap.get(nodeId)
            if (sNode) {
              const rSat = Math.hypot(sNode.x_km, sNode.y_km, sNode.z_km)
              const lat = Math.asin(sNode.z_km / rSat) * (180 / Math.PI)
              const lon = Math.atan2(sNode.y_km, sNode.x_km) * (180 / Math.PI)
              ;[px, py] = latLonToXY(lat, lon)
            }
          }
          routeCoords.push([px, py])
        }

        // Draw glowing Cyan Route vector line
        ctx.save()
        ctx.strokeStyle = '#00f0ff'
        ctx.lineWidth = 3.0
        ctx.shadowColor = '#00f0ff'
        ctx.shadowBlur = 8

        ctx.beginPath()
        for (let i = 0; i < routeCoords.length; i++) {
          if (i === 0) ctx.moveTo(routeCoords[i][0], routeCoords[i][1])
          else ctx.lineTo(routeCoords[i][0], routeCoords[i][1])
        }
        ctx.stroke()
        ctx.restore()

        // Draw animated data packets flowing along the route ("бегущие квадратики")
        if (routeCoords.length >= 2) {
          ctx.save()
          const segLens: number[] = []
          let totalLen = 0
          for (let i = 0; i < routeCoords.length - 1; i++) {
            const dx = routeCoords[i + 1][0] - routeCoords[i][0]
            const dy = routeCoords[i + 1][1] - routeCoords[i][1]
            const d = Math.hypot(dx, dy)
            segLens.push(d)
            totalLen += d
          }

          if (totalLen > 0) {
            const now = performance.now() * 0.00065
            const packetCount = 8
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = '#00f0ff'
            ctx.shadowBlur = 8

            for (let k = 0; k < packetCount; k++) {
              const phase = (now + k / packetCount) % 1.0
              const targetDist = phase * totalLen

              let acc = 0
              let px = routeCoords[routeCoords.length - 1][0]
              let py = routeCoords[routeCoords.length - 1][1]

              for (let i = 0; i < segLens.length; i++) {
                if (acc + segLens[i] >= targetDist) {
                  const segT = (targetDist - acc) / segLens[i]
                  px = routeCoords[i][0] + (routeCoords[i + 1][0] - routeCoords[i][0]) * segT
                  py = routeCoords[i][1] + (routeCoords[i + 1][1] - routeCoords[i][1]) * segT
                  break
                }
                acc += segLens[i]
              }

              // Glowing packet square
              ctx.fillRect(px - 3.5, py - 3.5, 7, 7)
            }
          }
          ctx.restore()
        }
      }

      // 6. Draw Satellites (Clean matte circles + Real-time Coverage Footprints)
      const altKm = activeScenario?.environment.altitude_km || 550
      const { alphaDeg } = computeFootprintAlpha(altKm, minEl)
      const fpPx = maxRadius * (alphaDeg / (90 - minLat))

      for (const sat of liveSats) {
        const rSat = Math.hypot(sat.x_km, sat.y_km, sat.z_km)
        const lat = Math.asin(sat.z_km / rSat) * (180 / Math.PI)
        const lon = Math.atan2(sat.y_km, sat.x_km) * (180 / Math.PI)

        if (lat < minLat - 5) continue

        const [sx, sy] = latLonToXY(lat, lon)
        const isInRoute = activeRoutePath.includes(sat.id)
        const isSelected =
          selectedTarget?.type === 'sat'
            ? selectedTarget.id === sat.id
            : sat.id === selectedSatelliteId
        const isHovered = hoveredNode?.id === sat.id

        ctx.save()
        if (sat.active) {
          // Draw coverage footprint on 2D polar map
          if (coverageMode !== 'off') {
            if (coverageMode === 'all' || (coverageMode === 'route' && isInRoute)) {
              ctx.save()
              ctx.beginPath()
              ctx.arc(sx, sy, fpPx, 0, 2 * Math.PI)
              ctx.fillStyle = isInRoute ? 'rgba(16, 185, 129, 0.16)' : 'rgba(56, 189, 248, 0.08)'
              ctx.fill()
              ctx.strokeStyle = isInRoute ? 'rgba(52, 211, 153, 0.75)' : 'rgba(56, 189, 248, 0.28)'
              ctx.lineWidth = isInRoute ? 1.5 : 0.75
              ctx.stroke()
              ctx.restore()
            }
          }

          let color = '#e4e4e7' // P1 (white-silver)
          if (sat.plane_id === 'P2') color = '#a1a1aa'
          if (sat.plane_id === 'P3') color = '#71717a'
          if (isInRoute) color = '#00f0ff' // In-route satellite highlighted in cyan
          if (isSelected) color = '#ffffff'

          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(sx, sy, isSelected ? 4.5 : isInRoute ? 4 : 3, 0, 2 * Math.PI)
          ctx.fill()

          if (isInRoute) {
            ctx.strokeStyle = '#00f0ff'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(sx, sy, 6, 0, 2 * Math.PI)
            ctx.stroke()
          }

          if (isSelected) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(sx, sy, 8, 0, 2 * Math.PI)
            ctx.stroke()
          }
        } else {
          // Outage satellite (Pale Red)
          ctx.fillStyle = '#f87171'
          ctx.beginPath()
          ctx.arc(sx, sy, 3, 0, 2 * Math.PI)
          ctx.fill()

          ctx.strokeStyle = '#fca5a5'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(sx - 3, sy - 3)
          ctx.lineTo(sx + 3, sy + 3)
          ctx.moveTo(sx + 3, sy - 3)
          ctx.lineTo(sx - 3, sy + 3)
          ctx.stroke()
        }

        // Hover or selected label
        if (isHovered || isSelected || isInRoute) {
          ctx.font = 'bold 9px monospace'
          ctx.fillStyle = isInRoute ? '#00f0ff' : isSelected ? '#ffffff' : '#a1a1aa'
          ctx.fillText(`КА ${sat.id}`, sx + 6, sy - 4)
        }
        ctx.restore()
      }
    }

    ctx.restore()

    // High performance 60fps packet stream without triggering React re-renders
    if (activeRoutePath.length >= 2) {
      animId = requestAnimationFrame(draw)
    }
  }

  draw()

  return () => {
    if (animId) cancelAnimationFrame(animId)
  }
  }, [
    activeScenario,
    currentTime_s,
    selectedClientId,
    selectedSatelliteId,
    selectedTarget,
    hoveredNode,
    liveSnap,
    activeRoutePath,
    coverageMode,
    minEl,
  ])

  // Mouse interaction: Hover & Click
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !activeScenario) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const w = rect.width
    const h = rect.height
    const cx = w / 2
    const cy = h / 2
    const maxRadius = Math.min(w, h) * 0.44
    const minLat = 40.0

    const latLonToXY = (lat_deg: number, lon_deg: number): [number, number] => {
      const clampedLat = Math.max(minLat, Math.min(90, lat_deg))
      const r = maxRadius * ((90 - clampedLat) / (90 - minLat))
      const angle = (lon_deg - 90) * (Math.PI / 180)
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
    }

    // Check ground sites
    for (const g of activeScenario.ground_sites) {
      if (g.lat_deg < minLat) continue
      const [gx, gy] = latLonToXY(g.lat_deg, g.lon_deg)
      if (Math.hypot(mx - gx, my - gy) < 12) {
        const isOffline =
          g.role === 'gateway' &&
          (activeScenario.gateway_outages || []).some(
            (f) => f.gateway_id === g.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
          )
        const roleLabel = isOffline ? '🔴 ШЛЮЗ - ОТКАЗ' : g.role === 'gateway' ? 'ШЛЮЗ' : 'АБОНЕНТ'
        setHoveredNode({
          id: g.id,
          type: 'ground',
          x: mx,
          y: my,
          details: `${g.name || g.id} [${roleLabel}] (${g.lat_deg}°N, ${g.lon_deg}°E)`,
        })
        return
      }
    }

    // Check satellites
    const liveSats = computePositions(activeScenario, currentTime_s)
    for (const sat of liveSats) {
      const rSat = Math.hypot(sat.x_km, sat.y_km, sat.z_km)
      const lat = Math.asin(sat.z_km / rSat) * (180 / Math.PI)
      const lon = Math.atan2(sat.y_km, sat.x_km) * (180 / Math.PI)
      if (lat >= minLat - 5) {
        const [sx, sy] = latLonToXY(lat, lon)
        if (Math.hypot(mx - sx, my - sy) < 9) {
          setHoveredNode({
            id: sat.id,
            type: 'sat',
            x: mx,
            y: my,
            details: `КА ${sat.id} | Плоскость ${sat.plane_id || '—'} | ${sat.active ? 'АКТИВЕН' : 'ОТКАЗ'} [${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E]`,
          })
          return
        }
      }
    }

    setHoveredNode(null)
  }

  const handleClick = () => {
    if (!hoveredNode) {
      clearSelection()
      return
    }
    if (hoveredNode.type === 'ground') {
      setSelectedStation(hoveredNode.id)
    } else if (hoveredNode.type === 'sat') {
      setSelectedSatellite(hoveredNode.id)
    }
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#060911] flex items-center justify-center">
      {/* HUD Transmission Status Banner (positioned at top-16 to avoid AppHeader collision) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 bg-[#10131a]/90 backdrop-blur-md border border-white/12 rounded-xl px-4 py-1.5 shadow-xl text-xs font-mono">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                : hasSatVis
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
            }`}
          />
          <span>
            {selectedClientId} (
            {activeScenario?.ground_sites.find((g) => g.id === selectedClientId)?.name || 'Абонент'})
          </span>
        </div>
        <span className="text-zinc-500">──</span>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={hasSatVis ? 'text-emerald-300 font-bold' : 'text-rose-400 font-bold'}>
            {hasSatVis ? '● Радио OK' : `✕ Нет КА (θ < ${minEl}°)`}
          </span>
        </div>
        <span className="text-zinc-500">──</span>
        <div className="flex items-center gap-1 text-[11px]">
          <span
            className={
              isConnected
                ? 'text-emerald-300 font-bold'
                : hasSatVis
                ? 'text-amber-400 font-bold'
                : 'text-zinc-500'
            }
          >
            {isConnected ? `● МИС (${activeRoutePath.length - 2} хопа)` : hasSatVis ? '✕ Разрыв МИС' : '— МИС'}
          </span>
        </div>
        <span className="text-zinc-500">──</span>
        <div className="flex items-center gap-1 text-[11px]">
          <span className={isConnected ? 'text-emerald-300 font-bold' : 'text-zinc-500'}>
            {isConnected ? `● Шлюз (${activeRoutePath[activeRoutePath.length - 1]})` : '— Шлюз'}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair"
      />

      {/* Interactive Tooltip */}
      {hoveredNode && (
        <div
          style={{ left: hoveredNode.x + 12, top: hoveredNode.y - 28 }}
          className="absolute z-30 pointer-events-none bg-zinc-900/95 border border-zinc-700 rounded px-2.5 py-1 text-[11px] font-mono text-zinc-100 shadow-md backdrop-blur-md"
        >
          {hoveredNode.details}
        </div>
      )}
    </div>
  )
}
