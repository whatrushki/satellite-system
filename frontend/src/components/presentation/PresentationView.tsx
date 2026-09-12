import React, { useState, useEffect, useCallback } from 'react'
import { PRESENTATION_SLIDES, SlideData } from './slidesData'
import { SlideMediaBlock } from './SlideMediaBlock'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Clock,
  RotateCcw,
  Sparkles,
  Layers,
  Award,
  ArrowRight,
  Radio,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

export interface PresentationViewProps {
  onExit?: () => void
}

export const PresentationView: React.FC<PresentationViewProps> = ({ onExit }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)

  // Presentation Timer (Pitch stopwatch)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(true)

  useEffect(() => {
    let interval: any
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const formatTimer = (totalSec: number) => {
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const ss = String(totalSec % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  const currentSlide: SlideData = PRESENTATION_SLIDES[currentSlideIndex]
  const totalSlides = PRESENTATION_SLIDES.length

  const goToNext = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev))
  }, [totalSlides])

  const goToPrev = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlideIndex(Math.max(0, Math.min(totalSlides - 1, index)))
    setIsOverviewOpen(false)
  }, [totalSlides])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
        case 'Enter':
          e.preventDefault()
          goToNext()
          break
        case 'ArrowLeft':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault()
          goToPrev()
          break
        case 'Home':
          e.preventDefault()
          goToSlide(0)
          break
        case 'End':
          e.preventDefault()
          goToSlide(totalSlides - 1)
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'o':
        case 'O':
        case 'Tab':
          e.preventDefault()
          setIsOverviewOpen((prev) => !prev)
          break
        case 'Escape':
          if (isOverviewOpen) {
            e.preventDefault()
            setIsOverviewOpen(false)
          }
          break
        default:
          // Numeric keys 1..9
          if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key, 10) - 1
            if (num < totalSlides) {
              goToSlide(num)
            }
          }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNext, goToPrev, goToSlide, totalSlides, isOverviewOpen])

  // Return back to main platform
  const handleExitToMain = () => {
    if (onExit) {
      onExit()
      return
    }
    if (window.location.hash.includes('presentation')) {
      window.location.hash = ''
    }
    if (window.location.search.includes('presentation')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('presentation')
      window.history.pushState({}, '', url.pathname + url.search + url.hash)
    }
    if (window.location.pathname.includes('presentation')) {
      window.history.pushState({}, '', window.location.pathname.replace(/\/presentation\/?$/, '') || '/')
    }
    window.location.href = '/'
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#06080d] text-zinc-100 flex flex-col select-none overflow-hidden font-sans z-50">
      {/* Background Subtle Tech Grid & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),rgba(0,0,0,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top Progress Bar */}
      <div className="relative w-full h-1 bg-white/5 shrink-0 z-30">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 transition-all duration-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
          style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Top Control Bar */}
      <header className="relative z-30 px-6 py-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
        {/* Left: Project title & current slide indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase font-mono text-white">
              АРКТИКА-НЕТ // ПРЕЗЕНТАЦИЯ
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
              СЛАЙД {String(currentSlideIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 truncate max-w-xs">{currentSlide.category}</span>
          </div>
        </div>

        {/* Center: Pitch Timer */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white font-bold">{formatTimer(elapsedSeconds)}</span>
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
            title={isTimerRunning ? 'Пауза таймера' : 'Возобновить таймер'}
          >
            {isTimerRunning ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => setElapsedSeconds(0)}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer ml-1"
            title="Сбросить таймер"
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Slide Overview Toggle */}
          <button
            onClick={() => setIsOverviewOpen(!isOverviewOpen)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isOverviewOpen
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-200'
                : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Сетка всех слайдов (Tab / O)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Все слайды</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 cursor-pointer transition-colors"
            title={isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'На весь экран (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit to Main App */}
          <button
            onClick={handleExitToMain}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold font-sans text-white border border-white/20 cursor-pointer transition-colors flex items-center gap-1.5"
            title="Вернуться на 3D карту системы"
          >
            <span>В систему</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Slide Content Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden p-6 md:p-10 flex flex-col justify-center z-20">
        <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between">
          {/* Slide Header */}
          <div className="space-y-2 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                {currentSlide.badge}
              </span>
              {currentSlide.criteriaScore && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  <span>{currentSlide.criteriaScore}</span>
                  {currentSlide.criteriaName && (
                    <span className="text-zinc-400 font-normal">({currentSlide.criteriaName})</span>
                  )}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {currentSlide.title}
            </h1>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-4xl">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Two-column Layout: Content Points (Left) & Video/Demo (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
            {/* Left Column: Feature Points (5 of 12 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-3 overflow-y-auto pr-1">
              {currentSlide.points.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 transition-all space-y-1 shadow-sm group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{pt.title}</span>
                    </h3>
                    {pt.metric && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 shrink-0">
                        {pt.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] md:text-xs text-zinc-400 leading-relaxed font-sans pl-3.5">
                    {pt.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Right Column: Slide Media Block (7 of 12 cols) */}
            <div className="lg:col-span-7 h-full flex flex-col min-h-[320px]">
              <SlideMediaBlock
                demoType={currentSlide.demoType}
                videoSrc={currentSlide.videoSrc}
                title={currentSlide.title}
              />
            </div>
          </div>

          {/* Bottom Slide Footer: Navigation controls & Hotkeys guide */}
          <div className="mt-4 pt-3 border-t border-white/10 shrink-0 flex items-center justify-between">
            {/* Left: Keyboard hotkey hints */}
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">→</kbd>
                <span>Навигация</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">Space</kbd>
                <span>Вперед</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">F</kbd>
                <span>Полный экран</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">1..9</kbd>
                <span>Слайды</span>
              </span>
            </div>

            {/* Right: Next / Prev Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                onClick={goToPrev}
                disabled={currentSlideIndex === 0}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-bold text-white border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              {/* Slide indicators dots */}
              <div className="flex items-center gap-1.5 px-2">
                {PRESENTATION_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`transition-all rounded-full cursor-pointer ${
                      i === currentSlideIndex
                        ? 'w-6 h-2 bg-cyan-400'
                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                    }`}
                    title={`Перейти к слайду ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={goToNext}
                disabled={currentSlideIndex === totalSlides - 1}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-bold text-white border border-cyan-400/40 flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_16px_rgba(6,182,212,0.3)]"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Slide Overview Drawer (Modal overlay) */}
      {isOverviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col p-8 overflow-y-auto"
          onClick={() => setIsOverviewOpen(false)}
        >
          <div
            className="max-w-6xl w-full mx-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                  СОДЕРЖАНИЕ ПРЕЗЕНТАЦИИ (12 СЛАЙДОВ)
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Выберите слайд для быстрого перехода или нажмите Esc
                </p>
              </div>
              <button
                onClick={() => setIsOverviewOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white cursor-pointer"
              >
                Закрыть [Esc]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {PRESENTATION_SLIDES.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => goToSlide(idx)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all space-y-2 ${
                    idx === currentSlideIndex
                      ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="font-bold text-white">#{String(idx + 1).padStart(2, '0')}</span>
                    <span className="text-cyan-300 font-bold">{s.badge}</span>
                  </div>
                  <h3 className="text-xs font-bold text-white line-clamp-2">{s.title}</h3>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">{s.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
