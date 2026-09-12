import React, { useRef, useEffect, useState } from 'react'
import { Video, Sparkles, Play, Pause, RefreshCw, Upload } from 'lucide-react'

interface SlideMediaBlockProps {
  demoType: 'globe' | 'routing' | 'timeline' | 'sandbox' | 'comparison' | 'recommendations' | 'export' | 'architecture' | 'summary'
  videoSrc?: string
  title: string
}

export const SlideMediaBlock: React.FC<SlideMediaBlockProps> = ({
  demoType,
  videoSrc,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  // Reset video error on slide / video change
  useEffect(() => {
    setHasVideoError(false)
  }, [videoSrc, demoType])

  // Procedural Canvas Animation when video is not provided or fails to load
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let frame = 0

    const render = () => {
      frame++
      const w = (canvas.width = canvas.parentElement?.clientWidth || 600)
      const h = (canvas.height = canvas.parentElement?.clientHeight || 380)

      ctx.fillStyle = '#07090e'
      ctx.fillRect(0, 0, w, h)

      // Background subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.lineWidth = 1
      const gridSize = 32
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      const cx = w / 2
      const cy = h / 2

      if (demoType === 'globe') {
        // Rotating 3D Globe with Orbital Planes
        const globeR = Math.min(w, h) * 0.28

        // Atmospheric glow
        const glow = ctx.createRadialGradient(cx, cy, globeR * 0.8, cx, cy, globeR * 1.4)
        glow.addColorStop(0, 'rgba(56, 189, 248, 0.18)')
        glow.addColorStop(1, 'rgba(56, 189, 248, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(cx, cy, globeR * 1.4, 0, Math.PI * 2)
        ctx.fill()

        // Earth sphere
        ctx.fillStyle = '#0d1527'
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, globeR, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Latitude lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)'
        ctx.lineWidth = 1
        for (let lat = -60; lat <= 60; lat += 30) {
          const latRad = (lat * Math.PI) / 180
          const y = cy - Math.sin(latRad) * globeR
          const rx = Math.cos(latRad) * globeR
          ctx.beginPath()
          ctx.ellipse(cx, y, rx, rx * 0.25, 0, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Longitude lines rotating
        const rot = frame * 0.012
        for (let i = 0; i < 6; i++) {
          const angle = rot + (i * Math.PI) / 6
          ctx.beginPath()
          ctx.ellipse(cx, cy, Math.cos(angle) * globeR, globeR, 0, 0, Math.PI * 2)
          ctx.stroke()
        }

        // 3 Orbital Planes at 87° inclination
        const numPlanes = 3
        for (let p = 0; p < numPlanes; p++) {
          const pAngle = (p * Math.PI) / 3 + 0.3
          const pRad = globeR * 1.35
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.ellipse(cx, cy, pRad * Math.cos(pAngle), pRad, 0.2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])

          // Satellites on this plane
          const satCount = 6
          for (let s = 0; s < satCount; s++) {
            const satTheta = frame * 0.02 + (s * Math.PI * 2) / satCount
            const sx = cx + Math.cos(satTheta) * pRad * Math.cos(pAngle)
            const sy = cy + Math.sin(satTheta) * pRad

            // Satellite core
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(sx, sy, 3.5, 0, Math.PI * 2)
            ctx.fill()

            // Solar panel wings
            ctx.strokeStyle = '#38bdf8'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(sx - 7, sy)
            ctx.lineTo(sx + 7, sy)
            ctx.stroke()

            // Pulse laser beam between adjacent satellites
            if (s % 2 === 0) {
              const nextTheta = frame * 0.02 + ((s + 1) * Math.PI * 2) / satCount
              const nx = cx + Math.cos(nextTheta) * pRad * Math.cos(pAngle)
              const ny = cy + Math.sin(nextTheta) * pRad
              ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(sx, sy)
              ctx.lineTo(nx, ny)
              ctx.stroke()
            }
          }
        }
      } else if (demoType === 'routing') {
        // Multi-hop Dijkstra laser mesh
        const nodes = [
          { name: 'C72 (Судно)', x: cx - 220, y: cy + 40, col: '#38bdf8' },
          { name: 'S17 (Пл. 2)', x: cx - 140, y: cy - 60, col: '#ffffff' },
          { name: 'S18', x: cx - 60, y: cy - 100, col: '#ffffff' },
          { name: 'S23 (Мост)', x: cx + 20, y: cy - 80, col: '#a78bfa' },
          { name: 'S39 (Пл. 3)', x: cx + 100, y: cy - 40, col: '#ffffff' },
          { name: 'S46', x: cx + 160, y: cy + 20, col: '#ffffff' },
          { name: 'G_MUR (Шлюз)', x: cx + 220, y: cy + 80, col: '#10b981' },
        ]

        // Connect path
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 3
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 12
        ctx.beginPath()
        nodes.forEach((n, i) => {
          if (i === 0) ctx.moveTo(n.x, n.y)
          else ctx.lineTo(n.x, n.y)
        })
        ctx.stroke()
        ctx.shadowBlur = 0

        // Traveling data photon pulses
        const tProgress = (frame % 120) / 120
        const totalSegments = nodes.length - 1
        const curSeg = Math.min(totalSegments - 1, Math.floor(tProgress * totalSegments))
        const subT = (tProgress * totalSegments) - curSeg
        const p1 = nodes[curSeg]
        const p2 = nodes[curSeg + 1]
        const pulseX = p1.x + (p2.x - p1.x) * subT
        const pulseY = p1.y + (p2.y - p1.y) * subT

        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = 16
        ctx.beginPath()
        ctx.arc(pulseX, pulseY, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Draw nodes
        nodes.forEach((n) => {
          ctx.fillStyle = n.col
          ctx.beginPath()
          ctx.arc(n.x, n.y, 6, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#e2e8f0'
          ctx.font = '11px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(n.name, n.x, n.y + 18)
        })

        // HUD overlay badge
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(cx - 140, cy + 100, 280, 28, 8)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#34d399'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('DIJKSTRA: 16 ХОПОВ • RTT 267.2 мс • 40 054 км', cx, cy + 118)
      } else if (demoType === 'timeline') {
        // Gantt Chart simulation with sweeping cursor
        const barY = cy - 40
        const barH = 24
        const barW = w * 0.75
        const barX = cx - barW / 2

        ctx.fillStyle = '#18181b'
        ctx.fillRect(barX, barY, barW, barH)

        // Segments
        const segs = [
          { pct: 0.25, col: '#10b981' },
          { pct: 0.08, col: '#f59e0b' },
          { pct: 0.12, col: '#ef4444' },
          { pct: 0.35, col: '#10b981' },
          { pct: 0.20, col: '#10b981' },
        ]
        let curX = barX
        segs.forEach((s) => {
          const sw = barW * s.pct
          ctx.fillStyle = s.col
          ctx.fillRect(curX, barY, sw, barH)
          curX += sw
        })

        // Playhead cursor
        const curProgress = ((frame * 0.7) % 600) / 600
        const cursorX = barX + curProgress * barW

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.shadowColor = '#ffffff'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(cursorX, barY - 10)
        ctx.lineTo(cursorX, barY + barH + 10)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Time indicator
        const curSec = Math.floor(curProgress * 86400)
        const hh = String(Math.floor(curSec / 3600)).padStart(2, '0')
        const mm = String(Math.floor((curSec % 3600) / 60)).padStart(2, '0')
        const ss = String(curSec % 60).padStart(2, '0')

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`ВРЕМЯ: ${hh}:${mm}:${ss} (СКОРОСТЬ 120x)`, cx, barY + 60)
      } else if (demoType === 'sandbox') {
        // Radar pulse failure injector
        const radarR = Math.min(w, h) * 0.32
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx, cy, radarR, 0, Math.PI * 2)
        ctx.stroke()

        // Sweep line
        const sweepAngle = frame * 0.04
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(sweepAngle) * radarR, cy + Math.sin(sweepAngle) * radarR)
        ctx.stroke()

        // Satellites on radar
        const testSats = [
          { id: 'S14', failed: true, angle: 0.5, r: 0.6 },
          { id: 'S31', failed: true, angle: 1.8, r: 0.75 },
          { id: 'S48', failed: true, angle: 3.2, r: 0.5 },
          { id: 'S01', failed: false, angle: 4.5, r: 0.8 },
          { id: 'S02', failed: false, angle: 5.6, r: 0.65 },
        ]
        testSats.forEach((s) => {
          const sx = cx + Math.cos(s.angle) * radarR * s.r
          const sy = cy + Math.sin(s.angle) * radarR * s.r
          ctx.fillStyle = s.failed ? '#ef4444' : '#10b981'
          ctx.beginPath()
          ctx.arc(sx, sy, s.failed ? 6 : 4.5, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = s.failed ? '#fca5a5' : '#a7f3d0'
          ctx.font = '10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(s.failed ? `${s.id} [ОТКАЗ]` : s.id, sx, sy + 14)
        })
      } else if (demoType === 'comparison') {
        // Comparative bar chart
        const bars = [
          { label: '1-я очередь (16 КА)', avail: 68.4, gap: 42, col: '#f59e0b' },
          { label: 'Разреженная (24 КА)', avail: 84.1, gap: 24, col: '#38bdf8' },
          { label: 'Полная (48 КА)', avail: 98.7, gap: 4, col: '#10b981' },
        ]
        const chartY = cy - 50
        bars.forEach((b, idx) => {
          const by = chartY + idx * 45
          const bw = (b.avail / 100) * (w * 0.5)

          ctx.fillStyle = '#cbd5e1'
          ctx.font = '11px monospace'
          ctx.textAlign = 'right'
          ctx.fillText(b.label, cx - 40, by + 14)

          ctx.fillStyle = '#27272a'
          ctx.fillRect(cx - 30, by, w * 0.5, 20)

          ctx.fillStyle = b.col
          ctx.fillRect(cx - 30, by, bw, 20)

          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 11px monospace'
          ctx.textAlign = 'left'
          ctx.fillText(`${b.avail}% (макс. перерыв: ${b.gap} мин)`, cx - 20 + bw, by + 14)
        })
      } else {
        // High-tech holographic radar
        const r = Math.min(w, h) * 0.3
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)'
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2)
        ctx.stroke()

        // Rotating crosshair
        const angle = frame * 0.02
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r)
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
        ctx.moveTo(cx - Math.sin(angle) * r, cy + Math.cos(angle) * r)
        ctx.lineTo(cx + Math.sin(angle) * r, cy - Math.cos(angle) * r)
        ctx.stroke()

        ctx.fillStyle = '#38bdf8'
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('СИСТЕМА АКТИВНА • 100/100 БАЛЛОВ', cx, cy + 6)
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [demoType])

  const effectiveVideoUrl = customVideoUrl || videoSrc

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl flex flex-col group">
      {/* Header overlay */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-zinc-300">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>ДЕМОНСТРАЦИЯ: {title}</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {effectiveVideoUrl && !hasVideoError && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (isPlaying) videoRef.current.pause()
                  else videoRef.current.play()
                  setIsPlaying(!isPlaying)
                }
              }}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 cursor-pointer transition-colors"
              title={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}

          {/* Upload Custom Video Button */}
          <label
            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 cursor-pointer transition-colors"
            title="Загрузить собственное видео (.mp4, .webm)"
          >
            <Upload className="w-3 h-3" />
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const url = URL.createObjectURL(file)
                  setCustomVideoUrl(url)
                  setHasVideoError(false)
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Main Video or Canvas Fallback */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {effectiveVideoUrl && !hasVideoError ? (
          <video
            ref={videoRef}
            src={effectiveVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={() => {
              // Graceful fallback to procedural canvas animation
              setHasVideoError(true)
            }}
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas ref={canvasRef} className="w-full h-full block" />
        )}
      </div>

      {/* Bottom status badge */}
      <div className="absolute bottom-2.5 left-3 right-3 z-20 flex items-center justify-between text-[9px] font-mono text-zinc-500 pointer-events-none">
        <span>АРКТИКА-НЕТ // МОДЕЛИРОВАНИЕ</span>
        <span className="text-cyan-400">
          {effectiveVideoUrl && !hasVideoError ? '● MP4 ВИДЕОПОТОК (LOOP)' : '● ИНТЕРАКТИВНЫЙ WEBGL РЕНДЕР'}
        </span>
      </div>
    </div>
  )
}
