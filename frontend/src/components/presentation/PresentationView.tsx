import React, { useState, useEffect, useCallback } from 'react'
import { PRESENTATION_SLIDES, SlideData } from './slidesData'
import { SlideMediaBlock } from './SlideMediaBlock'
import {
  Maximize2,
  Minimize2,
  Award,
  Satellite,
  ChevronRight,
  ChevronLeft,
  X,
  Radio,
} from 'lucide-react'

export interface PresentationViewProps {
  onExit?: () => void
}

export const PresentationView: React.FC<PresentationViewProps> = ({ onExit }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Return back to main platform
  const handleExitToMain = useCallback(() => {
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
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : '') + url.hash)
    }
    if (window.location.pathname.includes('presentation')) {
      window.history.pushState({}, '', window.location.pathname.replace(/\/presentation\/?$/, '') || '/')
    }
    window.location.href = '/'
  }, [onExit])

  // Keyboard navigation handler (Arrows, Space, F, Esc, numbers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'Escape':
          e.preventDefault()
          handleExitToMain()
          break
        default:
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
  }, [goToNext, goToPrev, goToSlide, totalSlides, handleExitToMain])

  const isTitleSlide = currentSlideIndex === 0

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#06080d] text-slate-100 flex flex-col select-none overflow-hidden font-sans z-50">
      {/* 1. Ultra-thin Top Progress Bar */}
      <div className="relative w-full h-[2px] bg-white/5 shrink-0 z-30">
        <div
          className="h-full bg-white/70 transition-all duration-300"
          style={{ width: `${((currentSlideIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* 2. Top Header: Team Branding & Slide Counter (No Button Clutter) */}
      <header className="relative z-30 px-6 py-3.5 flex items-center justify-between pointer-events-auto">
        {/* Left: Team Logo Pill in exact platform style */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl px-3.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            <span className="text-[12px] font-black tracking-[0.2em] text-white uppercase font-sans">
              COSMO-NET
            </span>
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest border-l border-white/15 pl-2">
              2026
            </span>
          </div>

          {!isTitleSlide && (
            <span className="hidden sm:inline text-xs font-mono text-zinc-400">
              {currentSlide.badge}
            </span>
          )}
        </div>

        {/* Right: Slide Counter + Fullscreen + Close */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/12 text-xs font-mono font-bold text-zinc-300 shadow-sm">
            <span>{String(currentSlideIndex + 1).padStart(2, '0')}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-500">{String(totalSlides).padStart(2, '0')}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md hover:bg-white/10 text-zinc-400 hover:text-white border border-white/12 cursor-pointer transition-colors"
            title="На весь экран (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExitToMain}
            className="px-2.5 py-1 rounded-xl bg-[#10131a]/85 backdrop-blur-md hover:bg-white/15 text-zinc-400 hover:text-white border border-white/12 text-xs font-mono cursor-pointer transition-colors flex items-center gap-1.5"
            title="Вернуться к 3D платформе (Esc)"
          >
            <span>В систему</span>
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      </header>

      {/* 3. Main Slide Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden px-6 md:px-12 py-4 flex flex-col justify-center z-20">
        {isTitleSlide ? (
          /* ==================== TITLE SLIDE WITH TEAM LOGO ==================== */
          <div className="max-w-7xl w-full mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Brand & Pitch Header (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              {/* Team Logo Badge */}
              <div className="flex items-center gap-3 bg-[#10131a]/90 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] w-fit">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                  <Satellite className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-base font-black tracking-[0.25em] text-white uppercase font-sans">
                    COSMO-NET
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 tracking-wider uppercase">
                    Инженерная группа // CosmoHack 2026
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.15] font-sans">
                  {currentSlide.title}
                </h1>
                <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans max-w-2xl">
                  {currentSlide.subtitle}
                </p>
              </div>

              {/* 4 Core Pillars Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {currentSlide.points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/10 space-y-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white">{pt.title}</span>
                      {pt.metric && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-200 border border-white/10 shrink-0">
                          {pt.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{pt.desc}</p>
                  </div>
                ))}
              </div>

              {/* Action hint */}
              <div className="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Используйте клавиши [→] или [Пробел] для перехода к слайдам</span>
              </div>
            </div>

            {/* Right: Intro Video Block (5 cols) */}
            <div className="lg:col-span-5 h-[420px] flex flex-col justify-center">
              <SlideMediaBlock
                videoSrc={currentSlide.videoSrc}
                title={currentSlide.title}
                category={currentSlide.category}
              />
            </div>
          </div>
        ) : (
          /* ==================== CONTENT SLIDES (2 TO 12) ==================== */
          <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
            {/* Header: Badge + Title */}
            <div className="space-y-1.5 shrink-0 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
                  {currentSlide.badge}
                </span>
                {currentSlide.criteriaScore && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 text-zinc-300 border border-white/10 flex items-center gap-1.5">
                    <Award className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">{currentSlide.criteriaScore}</span>
                    {currentSlide.criteriaName && (
                      <span className="text-zinc-400 font-normal">({currentSlide.criteriaName})</span>
                    )}
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight font-sans">
                {currentSlide.title}
              </h2>
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-sans max-w-4xl">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* Two-column layout: Points (5 cols) & Video Block (7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
              {/* Left Column: Points list */}
              <div className="lg:col-span-5 flex flex-col justify-center gap-2.5 overflow-y-auto pr-1">
                {currentSlide.points.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        <span>{pt.title}</span>
                      </h3>
                      {pt.metric && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-zinc-200 border border-white/10 shrink-0">
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

              {/* Right Column: Video Media Block */}
              <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
                <SlideMediaBlock
                  videoSrc={currentSlide.videoSrc}
                  title={currentSlide.title}
                  category={currentSlide.category}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Minimalist Bottom Bar: Subtle Key Navigation Hints */}
      <footer className="relative z-30 px-6 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-500 bg-[#06080d]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">→</kbd>
            <span className="text-zinc-400 ml-1">Листать слайды</span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">Space</kbd>
            <span className="text-zinc-400 ml-1">Вперед</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">F</kbd>
            <span className="text-zinc-400 ml-1">На весь экран</span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">Esc</kbd>
            <span className="text-zinc-400 ml-1">Выход</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
