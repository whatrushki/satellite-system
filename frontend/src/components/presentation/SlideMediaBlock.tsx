import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause, Upload, Film, Radio } from 'lucide-react'

export interface SlideMediaBlockProps {
  demoType?: string
  videoSrc?: string
  title: string
  category?: string
}

export const SlideMediaBlock: React.FC<SlideMediaBlockProps> = ({
  videoSrc,
  title,
  category,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  // Reset error when videoSrc changes
  useEffect(() => {
    setHasVideoError(false)
  }, [videoSrc])

  const activeVideoUrl = customVideoUrl || videoSrc
  const showVideo = !!activeVideoUrl && !hasVideoError

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCustomVideoUrl(url)
      setHasVideoError(false)
      setIsPlaying(true)
    }
  }

  return (
    <div className="relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden bg-[#0c0f17] border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col group select-none">
      {/* Top Header Overlay: Minimalist status bar */}
      <div className="absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-[#10131a]/90 backdrop-blur-md border border-white/12 px-3 py-1 rounded-xl text-[10px] font-mono text-zinc-300 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="uppercase tracking-wider font-bold">
            {showVideo ? 'MP4 ВИДЕОПОТОК (LOOP)' : 'ДЕМОНСТРАЦИОННЫЙ СТЕНД'}
          </span>
          {category && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">{category}</span>
            </>
          )}
        </div>

        {/* Video controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {showVideo && (
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-[#10131a]/85 backdrop-blur-md hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 cursor-pointer transition-colors"
              title={isPlaying ? 'Пауза' : 'Воспроизведение'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}

          {/* Quick upload of local MP4 file */}
          <label
            className="p-1.5 rounded-lg bg-[#10131a]/85 backdrop-blur-md hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 cursor-pointer transition-colors"
            title="Загрузить локальное видео (.mp4 / .webm)"
          >
            <Upload className="w-3 h-3" />
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* Center Media Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {showVideo ? (
          <video
            key={activeVideoUrl}
            ref={videoRef}
            src={activeVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setHasVideoError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Aerospace Standby Telemetry Fallback (SVG + CSS, 100% crash proof) */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,rgba(16,19,26,0.95)_0%,#080a10_100%)] overflow-hidden">
            {/* Subtle background radar circles */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
              viewBox="0 0 600 400"
              preserveAspectRatio="xMidYMid slice"
            >
              <circle cx="300" cy="200" r="80" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <circle cx="300" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="300" cy="200" r="190" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              <line x1="100" y1="200" x2="500" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="300" y1="30" x2="300" y2="370" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              <ellipse cx="300" cy="200" rx="170" ry="60" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" transform="rotate(-25 300 200)" />
              <ellipse cx="300" cy="200" rx="170" ry="60" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" transform="rotate(35 300 200)" />

              <circle cx="210" cy="140" r="4" fill="#ffffff" />
              <circle cx="390" cy="260" r="4" fill="#ffffff" />
              <circle cx="360" cy="120" r="4" fill="#10b981" />
              <circle cx="240" cy="280" r="4" fill="#10b981" />
              <line x1="210" y1="140" x2="360" y2="120" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="360" y1="120" x2="390" y2="260" stroke="rgba(16,185,129,0.4)" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* Central Info Card */}
            <div className="relative z-10 max-w-sm w-full bg-[#10131a]/90 backdrop-blur-md border border-white/12 rounded-2xl p-5 text-center shadow-2xl flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
                <Film className="w-6 h-6 text-zinc-300" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white font-sans">
                  {title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 font-sans">
                  Блок демонстрационного видеоряда
                </p>
              </div>

              <div className="w-full bg-[#07090e] border border-white/8 rounded-xl px-3 py-2 text-[10px] font-mono text-zinc-400 text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Файл:</span>
                  <span className="text-zinc-200 font-bold truncate max-w-[200px]">{videoSrc || 'отсутствует'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Статус:</span>
                  <span className="text-amber-400">Ожидает видеофайл</span>
                </div>
              </div>

              <label className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono font-bold text-white cursor-pointer transition-colors flex items-center justify-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                <span>Выбрать видео для слайда</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="px-4 py-2 bg-[#0a0d14] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>COSMO-NET // СИСТЕМА ДЕМОНСТРАЦИИ</span>
        </div>
        <span className="text-zinc-500">1080p • 60 FPS • LOOP</span>
      </div>
    </div>
  )
}
