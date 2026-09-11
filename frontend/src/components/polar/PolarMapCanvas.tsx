import React, { useRef, useEffect, useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { computePositions } from '@/core/geometryEngine'

export const PolarMapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    selectedClientId,
    setSelectedClient,
    selectedSatelliteId,
    setSelectedSatellite,
    simulationResult,
  } = useSimulationStore()

  const [hoveredNode, setHoveredNode] = useState<{
    id: string
    type: 'sat' | 'ground'
    x: number
    y: number
    details: string
  } | null>(null)

  // Current snapshot from simulation result
  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap =
    simulationResult?.snapshots[Math.min(idx, (simulationResult?.snapshots.length || 1) - 1)]

  // Current route for selected client
  const clientData = simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  const currentTimelineItem = clientData?.timeline.find((item) => item.t_s === idx * step)
  const activeRoutePath = currentTimelineItem?.path || []

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

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

    // 1. Clear background (neutral deep dark canvas)
    ctx.fillStyle = '#060911'
    ctx.fillRect(0, 0, w, h)

    // 2. Polar coordinate rings (neutral slate)
    ctx.save()
    const rings = [80, 70, 66.5, 60, 50]
    for (const lat of rings) {
      const r = maxRadius * ((90 - lat) / (90 - minLat))
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, 2 * Math.PI)
      if (lat === 66.5) {
        // Arctic Circle highlight (crisp dashed white line)
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

      // Longitude label
      const lx = cx + (maxRadius + 14) * Math.cos(angle)
      const ly = cy + (maxRadius + 14) * Math.sin(angle)
      ctx.fillStyle = 'rgba(161, 161, 170, 0.45)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labelLon = lon > 180 ? lon - 360 : lon
      ctx.fillText(`${labelLon}°`, lx, ly)
    }
    ctx.restore()

    // 3. Ground Stations & Real 15° Elevation Cones (Clean neutral monochrome outlines)
    if (activeScenario) {
      const elevRadiusDeg = 15.0 // Exact central Earth angle for 10° elevation at 550 km
      for (const g of activeScenario.ground_sites) {
        const [gx, gy] = latLonToXY(g.lat_deg, g.lon_deg)
        const isClient = g.role === 'client'
        const isSelected = g.id === selectedClientId

        // Compute pixel radius of the 15° visibility cone
        const [edgeX] = latLonToXY(Math.max(minLat, g.lat_deg - elevRadiusDeg), g.lon_deg)
        const coneRadius = Math.abs(edgeX - gx)

        // Draw elevation cone circle
        ctx.save()
        ctx.beginPath()
        ctx.arc(gx, gy, coneRadius, 0, 2 * Math.PI)
        if (isClient) {
          ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'
          ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.15)'
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        }
        ctx.lineWidth = isSelected ? 1.5 : 0.8
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        // Draw station icon (Crisp geometric shape, no shadow blur)
        ctx.save()
        if (isClient) {
          ctx.beginPath()
          ctx.arc(gx, gy, isSelected ? 5.5 : 4, 0, 2 * Math.PI)
          ctx.fillStyle = isSelected ? '#ffffff' : '#d4d4d8'
          ctx.fill()
          ctx.strokeStyle = '#090d16'
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else {
          // Gateway diamond
          ctx.save()
          ctx.translate(gx, gy)
          ctx.rotate(Math.PI / 4)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(-5, -5, 10, 10)
          ctx.strokeStyle = '#090d16'
          ctx.lineWidth = 1.5
          ctx.strokeRect(-5, -5, 10, 10)
          ctx.restore()
        }

        // Label
        ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace'
        ctx.fillStyle = isSelected ? '#ffffff' : '#a1a1aa'
        ctx.fillText(`${g.id} (${g.role === 'gateway' ? 'Шлюз' : 'Клиент'})`, gx + 9, gy - 5)
        ctx.restore()
      }
    }

    // 4. Inter-Satellite Links (ISL Mesh) and Real-Time Satellites
    const liveSats = activeScenario
      ? computePositions(activeScenario, currentTime_s)
      : currentSnap?.satellites || []

    if (currentSnap && activeScenario) {
      const satMap = new Map(liveSats.map((s) => [s.id, s]))

      ctx.save()
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)'
      ctx.lineWidth = 0.75

      for (const [u, v] of currentSnap.edges) {
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

      // 5. Active Route Highlight (Crisp Solid White Vector)
      if (activeRoutePath.length >= 2) {
        ctx.save()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2.0

        ctx.beginPath()
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

          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.restore()
      }

      // 6. Draw Satellites (Clean matte circles)
      for (const sat of liveSats) {
        const rSat = Math.hypot(sat.x_km, sat.y_km, sat.z_km)
        const lat = Math.asin(sat.z_km / rSat) * (180 / Math.PI)
        const lon = Math.atan2(sat.y_km, sat.x_km) * (180 / Math.PI)

        if (lat < minLat - 5) continue

        const [sx, sy] = latLonToXY(lat, lon)
        const isInRoute = activeRoutePath.includes(sat.id)
        const isSelected = sat.id === selectedSatelliteId
        const isHovered = hoveredNode?.id === sat.id

        ctx.save()
        if (sat.active) {
          let color = '#e4e4e7' // P1 (white-silver)
          if (sat.plane_id === 'P2') color = '#a1a1aa' // P2 (silver-zinc)
          else if (sat.plane_id === 'P3') color = '#71717a' // P3 (zinc)

          if (isInRoute) color = '#ffffff'

          ctx.beginPath()
          ctx.arc(sx, sy, isSelected || isHovered ? 5.0 : isInRoute ? 4.2 : 3.0, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
          ctx.strokeStyle = '#060911'
          ctx.lineWidth = 1.2
          ctx.stroke()

          if (isSelected || isHovered || isInRoute) {
            ctx.font = 'bold 9px monospace'
            ctx.fillStyle = '#ffffff'
            ctx.fillText(sat.id, sx + 6, sy - 4)
          }
        } else {
          // Outage / Offline (Clean Soft Red Cross)
          ctx.strokeStyle = '#f87171'
          ctx.lineWidth = 1.4
          const sz = 3.5
          ctx.beginPath()
          ctx.moveTo(sx - sz, sy - sz)
          ctx.lineTo(sx + sz, sy + sz)
          ctx.moveTo(sx + sz, sy - sz)
          ctx.lineTo(sx - sz, sy + sz)
          ctx.stroke()

          if (isSelected || isHovered) {
            ctx.font = '9px monospace'
            ctx.fillStyle = '#f87171'
            ctx.fillText(`${sat.id} [ОТКАЗ]`, sx + 6, sy - 4)
          }
        }
        ctx.restore()
      }
    }
  }, [
    currentSnap,
    activeScenario,
    currentTime_s,
    selectedClientId,
    selectedSatelliteId,
    hoveredNode,
    activeRoutePath,
  ])

  // Mouse interaction handler (Hover and Click selection)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !currentSnap || !activeScenario) return
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
      const [gx, gy] = latLonToXY(g.lat_deg, g.lon_deg)
      if (Math.hypot(mx - gx, my - gy) < 12) {
        setHoveredNode({
          id: g.id,
          type: 'ground',
          x: mx,
          y: my,
          details: `${g.name || g.id} (${g.role === 'gateway' ? 'Шлюз' : 'Терминал'}) [${g.lat_deg}°N, ${g.lon_deg}°E]`,
        })
        return
      }
    }

    // Check satellites
    for (const sat of currentSnap.satellites) {
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
    if (!hoveredNode) return
    if (hoveredNode.type === 'ground') {
      const g = activeScenario?.ground_sites.find((s) => s.id === hoveredNode.id)
      if (g && g.role === 'client') {
        setSelectedClient(g.id)
      }
    } else if (hoveredNode.type === 'sat') {
      setSelectedSatellite(hoveredNode.id)
    }
  }

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#060911] flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair"
      />

      {/* Interactive Tooltip (Clean neutral card, no neon) */}
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
