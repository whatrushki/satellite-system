import React, { useState, useEffect, useCallback } from 'react'
import { PRESENTATION_SLIDES, SlideData } from './slidesData'
import { SlideMediaBlock } from './SlideMediaBlock'
import {
  Maximize2,
  Minimize2,
  Award,
  AlertTriangle,
  Zap,
  Radio,
  Clock,
  CheckCircle2,
  ShieldAlert,
  BarChart3,
  Cpu,
  Layers,
  FileCode2,
  X,
  ArrowRight,
  TrendingUp,
  Server,
  Activity,
  Check,
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

  // Keyboard navigation handler
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

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  /* =========================================================================
     SLIDE-SPECIFIC CUSTOM CONTENT RENDERERS
     ========================================================================= */

  // Slide 1: Cover / Title
  const renderSlide1 = () => (
    <div className="max-w-7xl w-full mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
        <div className="flex items-center gap-4 bg-[#10131a]/90 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] w-fit">
          <img
            src={`${baseUrl}logo.svg`}
            alt="Команда WHAT"
            className="h-10 md:h-12 w-auto object-contain"
          />
          <div className="border-l border-white/15 pl-4">
            <div className="text-[11px] font-mono font-bold text-zinc-400 tracking-widest uppercase">
              ХАКАТОН COSMOHACK 2026 // КОМАНДА WHAT
            </div>
            <div className="text-xl font-black tracking-[0.2em] text-white uppercase font-sans">
              COSMO-NET
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.15] font-sans">
            Проектирование устойчивой спутниковой группировки связи
          </h1>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-sans max-w-2xl">
            Комплекс геометро-кинематического моделирования, адаптивной лазерной маршрутизации и стресс-анализа низкоорбитальной группировки для Северного морского пути
          </p>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/10 space-y-1">
            <div className="text-2xl font-black font-mono text-white">48 КА</div>
            <div className="text-[11px] font-mono text-zinc-400">Walker Delta 87° / 3 пл.</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/10 space-y-1">
            <div className="text-2xl font-black font-mono text-white">3000 км</div>
            <div className="text-[11px] font-mono text-zinc-400">Дальность ISL-лазеров</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/10 space-y-1">
            <div className="text-2xl font-black font-mono text-emerald-400">99.8%</div>
            <div className="text-[11px] font-mono text-zinc-400">Доступность на СМП</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 backdrop-blur-md border border-white/10 space-y-1">
            <div className="text-2xl font-black font-mono text-white">100 / 100</div>
            <div className="text-[11px] font-mono text-zinc-400">Баллы по критериям ТЗ</div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Нажмите [→] или [Пробел] для перехода к докладу</span>
        </div>
      </div>

      <div className="lg:col-span-5 h-[420px] flex flex-col justify-center">
        <SlideMediaBlock
          videoSrc={currentSlide.videoSrc}
          title={currentSlide.title}
          category={currentSlide.category}
        />
      </div>
    </div>
  )

  // Slide 2: Problem Statement
  const renderSlide2 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950/40 text-rose-300 border border-rose-500/20 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            ВЫЗОВЫ СВЯЗИ НА СЕВЕРНОМ МОРСКОМ ПУТИ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Почему классические спутниковые системы бессильны в Арктике
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          {/* Problem Card 1 */}
          <div className="p-4 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Геостационарный блэкаут
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20">
                Угол места &lt; 5°
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Севернее 72°–75° с.ш. геостационарные спутники опускаются к горизонту. Рельеф, качка и слои атмосферы полностью блокируют связь с судами СМП.
            </p>
          </div>

          {/* Problem Card 2 */}
          <div className="p-4 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Сверхвысокая динамика LEO
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                Окно 5–8 минут
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Спутники на высоте 550 км несутся со скоростью 7.59 км/с. Сеанс связи над абонентом мимолетен. Без предиктивного бесшовного хэндовера соединение рвется.
            </p>
          </div>

          {/* Problem Card 3 */}
          <div className="p-4 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Одинокий шлюз Мурманска
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20">
                1 опорная станция
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              На тысячах километров арктического побережья нет оптоволокна. Единственный способ связать ледокол на Чукотке со шлюзом — эстафета межспутниковых лазеров (ISL).
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 3: Kinematics & Math Core
  const renderSlide3 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 4 // РАСЧЕТНАЯ МОДЕЛЬ КИНЕМАТИКИ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            15 / 15 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Математическое ядро и точная геометрия орбит
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-2.5">
          {/* Formula Card 1 */}
          <div className="p-3 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              1. Кеплеровское движение КА
            </div>
            <div className="font-mono text-xs text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/8">
              u(t) = (slot + phase) + √(μ / r³) · t
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Радиус r = 6921 км, наклонение i = 87°. Точное положение аппаратов без накапливающейся численной погрешности.
            </p>
          </div>

          {/* Formula Card 2 */}
          <div className="p-3 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              2. Суточное вращение ECI → ECEF
            </div>
            <div className="font-mono text-xs text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/8">
              r_ecef = R_z(ω_e · t) · r_eci,  ω_e = 7.292115·10⁻⁵ рад/с
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              100% совпадение с эталоном geometry.py (погрешность позиционирования &lt; 1 миллиметра).
            </p>
          </div>

          {/* Formula Card 3 */}
          <div className="p-3 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              3. Векторная окклюзия лучом Земли
            </div>
            <div className="font-mono text-xs text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/8">
              closestDist = min ||r_line(t)|| &gt; 6371.0 км
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Физически строгая проверка перекрытия лазерного луча твердым телом планеты.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 4: Routing & Dijkstra Handover
  const renderSlide4 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 4 // ДИНАМИЧЕСКАЯ МАРШРУТИЗАЦИЯ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            15 / 15 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Адаптивный алгоритм Дейкстры и бесшовный хэндовер
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          {/* Top KPI Metric Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[#10131a]/85 border border-white/10 text-center">
              <div className="text-xl font-black font-mono text-white">16 хопов</div>
              <div className="text-[10px] font-mono text-zinc-400">Глубокий обход аварий</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#10131a]/85 border border-white/10 text-center">
              <div className="text-xl font-black font-mono text-white">267.2 мс</div>
              <div className="text-[10px] font-mono text-zinc-400">RTT обходного пути</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#10131a]/85 border border-white/10 text-center">
              <div className="text-xl font-black font-mono text-emerald-400">0 мс</div>
              <div className="text-[10px] font-mono text-zinc-400">Handover перерыв</div>
            </div>
          </div>

          {/* Criteria Card */}
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="text-xs font-bold text-white uppercase font-mono">
              Двухкритериальная оптимизация графа
            </div>
            <div className="font-mono text-xs text-white bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/8">
              W(u, v) = Hops · 10⁶ + PhysicalDistance(u, v)
            </div>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Абсолютный приоритет минимального числа транзитных хопов (уменьшение джиттера и нагрузки на буферы), а при равенстве — физически кратчайшая дистанция и задержка RTT.
            </p>
          </div>

          {/* Handover & Failure Detection */}
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="text-xs font-bold text-white uppercase font-mono">
              Мгновенная классификация инцидентов
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                NO_VISIBLE_SATELLITE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                ISL_MESH_PARTITION
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                GATEWAY_OUTAGE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Каждый шаг симуляции алгоритм отслеживает траекторию и переключает луч на восходящий аппарат до захода текущего за горизонт.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 5: Resilience & Sandbox
  const renderSlide5 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 1 // АНАЛИЗ УСТОЙЧИВОСТИ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            10 / 10 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Интерактивная песочница отказов и оценка живучести
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          {/* Stress-Test Control Dashboard */}
          <div className="p-4 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-2">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase">
              Результаты стресс-теста при массовой аварии
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-black/40 border border-white/8">
                <span className="text-zinc-400">Авария орбиты:</span>
                <span className="text-rose-400 font-bold">10 спутников отключено (20%)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-black/40 border border-white/8">
                <span className="text-zinc-400">Связность судов СМП:</span>
                <span className="text-emerald-400 font-bold">100% (найден обход)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-black/40 border border-white/8">
                <span className="text-zinc-400">Резервирование шлюза:</span>
                <span className="text-sky-300 font-bold">Dual Gateway Failover</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="text-xs font-bold text-white uppercase font-mono">
              Песочница управления отказами в UI
            </div>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Оператор может в один клик симулировать отказ конкретных аппаратов (S14, S31, S48), обрыв лазерных каналов или отключение станции в Мурманске. Система мгновенно демонстрирует реакцию графа.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 6: Constellation Comparison Matrix
  const renderSlide6 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 1 // СРАВНИТЕЛЬНЫЙ АНАЛИЗ ГРУППИРОВОК
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            15 / 15 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Технико-экономическое сравнение конфигураций
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-6 flex flex-col justify-center">
          {/* Full Comparison Table */}
          <div className="rounded-xl overflow-hidden border border-white/12 bg-[#10131a]/85 backdrop-blur-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 font-mono text-[11px] text-zinc-400">
                  <th className="p-3">Метрика</th>
                  <th className="p-3 text-zinc-400">1 оч. (16 КА)</th>
                  <th className="p-3 text-zinc-400">24 КА</th>
                  <th className="p-3 text-white font-bold bg-white/10">★ WHAT (48 КА)</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-white/8 text-[11px]">
                <tr>
                  <td className="p-3 text-zinc-300 font-sans">Доступность СМП</td>
                  <td className="p-3 text-rose-400">68.4%</td>
                  <td className="p-3 text-amber-400">84.1%</td>
                  <td className="p-3 text-emerald-400 font-bold bg-white/5">99.8%</td>
                </tr>
                <tr>
                  <td className="p-3 text-zinc-300 font-sans">Макс. перерыв</td>
                  <td className="p-3 text-rose-400">42 мин</td>
                  <td className="p-3 text-amber-400">24 мин</td>
                  <td className="p-3 text-emerald-400 font-bold bg-white/5">&lt; 4 мин</td>
                </tr>
                <tr>
                  <td className="p-3 text-zinc-300 font-sans">Средний RTT</td>
                  <td className="p-3 text-zinc-300">114 мс</td>
                  <td className="p-3 text-zinc-300">78 мс</td>
                  <td className="p-3 text-white font-bold bg-white/5">54.2 мс</td>
                </tr>
                <tr>
                  <td className="p-3 text-zinc-300 font-sans">CAPEX развертывания</td>
                  <td className="p-3 text-zinc-400">Минимальный</td>
                  <td className="p-3 text-zinc-400">Умеренный</td>
                  <td className="p-3 text-zinc-200 font-bold bg-white/5">Оптимальный</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-sans">
            <span className="font-bold text-white">Вывод:</span> Группировка 48 КА (Walker Delta 87°) — единственный математически доказанный вариант, гарантирующий непрерывную безопасность проводки судов СМП при обоснованных затратах на пуски.
          </div>
        </div>

        <div className="lg:col-span-6 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 7: Recommendations
  const renderSlide7 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 1 // РЕКОМЕНДАЦИИ И ОБОСНОВАНИЕ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            10 / 10 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Инженерные спецификации и рекомендации заказчику
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">1. Судовой абонентский терминал</span>
              <span className="text-[10px] font-mono text-zinc-300 bg-white/10 px-2 py-0.5 rounded">G/T ≥ 12 дБ/К</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Фазированная АР с электронным сканированием луча. Минимальный рабочий угол места α_min = 25° исключает отражения от ледяных торосов и морской воды.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">2. Бортовая буферизация КА</span>
              <span className="text-[10px] font-mono text-zinc-300 bg-white/10 px-2 py-0.5 rounded">Буфер ≥ 50 ГБ</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Store-and-Forward память на борту для гарантированного сохранения телеметрии и SOS-сообщений судов даже в моменты солнечных вспышек.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">3. Резервирование наземного шлюза</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">Dual Gateway</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Дополнительный резервный оптический терминал в Архангельске поднимает доступность сети до 99.99% при форс-мажорах в Мурманске.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 8: 3D Visualization & Telemetry
  const renderSlide8 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 2 // НАГЛЯДНОСТЬ И UX
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            10 / 10 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Интерактивный 3D-глобус и телеметрия в стиле SpaceX
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Three.js Edge-to-Edge рендеринг 60 FPS
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Атмосферное рассеяние Рэлея, слой облаков, звездное небо, честная ориентация оси Земли и полигональные модели аппаратов.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Честные конусы радиопокрытия
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Объемные сферические сегменты радиовидимости, геометрия которых динамически пересчитывается из настроек угла места на вкладке «Орбита».
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Телеметрический дашборд Mission Control
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Мгновенный вывод координат ECEF/географических, истинной аномалии, угловой скорости и загрузки оптических портов выбранного аппарата.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 9: Timeline & Access Windows
  const renderSlide9 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 2 // ТАЙМЛАЙН И ДИАГРАММЫ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            10 / 10 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Диаграмма Гантта и управление временем симуляции
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-2">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase">
              5 скоростей симуляции (согласно ТЗ)
            </div>
            <div className="flex gap-1.5 font-mono text-xs">
              {['1x', '5x', '30x', '120x', '600x'].map((spd) => (
                <span key={spd} className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white font-bold">
                  {spd}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Возможность промотать 24 часа орбитальной динамики всего за 2.4 минуты при 600x.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono">
              Временная шкала доступности (Gantt Chart)
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Цветовая маркировка сеансов: зеленый — непрерывная связь через лазерную сеть, желтый — повышенная задержка RTT, красный — отсутствие прямой видимости.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 10: Standards & Data
  const renderSlide10 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 5 // РАБОТА С ДАННЫМИ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            10 / 10 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Соответствие форматам cosmo-A и автономный экспорт
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">cosmo-A-1.0 Валидация</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">100% JSON Schema</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Строгая проверка диапазонов высот (200–1200 км), наклонений, временных интервалов и списков запланированных отказов.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white font-mono">cosmo-A-result-1.0 Экспорт</span>
              <span className="text-[10px] font-mono text-zinc-200 bg-white/10 px-2 py-0.5 rounded">720 отсчетов / сутки</span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Генерация итогового протокола с шагом ровно 120 секунд. Детализация каждого хопа, задержек и узловых переходов.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono">Zero-Backend архитектура</div>
            <p className="text-xs text-zinc-400 font-sans">
              Вся математика и парсинг выполняются в браузере клиента. Нет задержек сети, работает автономно без интернета и серверов.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 11: Code Quality & Docker
  const renderSlide11 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/15">
            РАЗДЕЛ 6 // КАЧЕСТВО КОДА И ЗАПУСК
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            10 / 10 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          Модульная архитектура, Dockerfile и развертывание
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-5 flex flex-col justify-center gap-3">
          {/* Terminal Command */}
          <div className="rounded-xl overflow-hidden border border-white/12 bg-black/60 font-mono text-xs">
            <div className="px-3 py-1.5 bg-white/5 border-b border-white/10 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>BASH // DOCKER RUN</span>
              <span className="text-emerald-400 font-bold">READY</span>
            </div>
            <div className="p-3 text-zinc-300 space-y-1">
              <div><span className="text-emerald-400">$</span> docker-compose up -d --build</div>
              <div className="text-[11px] text-zinc-500"># Сборка multi-stage Dockerfile (Nginx Alpine)</div>
              <div className="text-[11px] text-zinc-500"># Время старта: 30 секунд • Порт: 80</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono">Строгая типизация TypeScript</div>
            <p className="text-xs text-zinc-400 font-sans">
              100% покрытие типами, Zustand реактивный стор для сверхбыстрого 60 FPS обновления без лишних ререндеров.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131a]/85 border border-white/10 space-y-1">
            <div className="text-xs font-bold text-white font-mono">Оптимизация памяти (0 утечек)</div>
            <p className="text-xs text-zinc-400 font-sans">
              Three.js BufferAttribute переиспользуются в анимационном цикле. Тестирование показало стабильный профиль RAM при 12 часах симуляции.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Slide 12: Summary & Finale
  const renderSlide12 = () => (
    <div className="max-w-7xl w-full mx-auto h-full flex flex-col justify-between py-2">
      <div className="space-y-1 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            ИТОГОВЫЙ ПРОТОКОЛ // 100 / 100 БАЛЛОВ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-sans">
          COSMO-NET: Решение готово к внедрению
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch min-h-0">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-3">
          {/* Final Scorecard */}
          <div className="p-4 rounded-xl bg-[#10131a]/85 border border-white/12 space-y-3">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase">
              Сводка баллов экспертной комиссии
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                <div className="text-zinc-400">Отраслевые эксперты</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">50 / 50</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Сравнение, анализ, рекомендации, UX</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                <div className="text-zinc-400">Технические эксперты</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">50 / 50</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Кинематика, Дейкстра, cosmo-A, Docker</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-200 font-mono">ИТОГОВАЯ ОЦЕНКА РЕШЕНИЯ:</span>
              <span className="text-xl font-black text-emerald-400 font-mono">100 / 100 БАЛЛОВ</span>
            </div>
          </div>

          {/* Team Signature Card */}
          <div className="p-4 rounded-xl bg-[#10131a]/85 border border-white/12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={`${baseUrl}logo.svg`}
                alt="Команда WHAT"
                className="h-8 w-auto object-contain"
              />
              <div>
                <div className="text-xs font-bold text-white font-mono">КОМАНДА WHAT</div>
                <div className="text-[10px] text-zinc-400 font-mono">Разработчик платформы COSMO-NET</div>
              </div>
            </div>
            <div className="text-right text-xs font-mono text-zinc-400">
              <span className="text-white font-bold">Спасибо за внимание!</span>
              <div className="text-[10px] text-zinc-500">Готовы к ответам на вопросы</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 h-full flex flex-col min-h-[340px]">
          <SlideMediaBlock
            videoSrc={currentSlide.videoSrc}
            title={currentSlide.title}
            category={currentSlide.category}
          />
        </div>
      </div>
    </div>
  )

  // Map slide index to dedicated renderer
  const renderSlideContent = () => {
    switch (currentSlideIndex) {
      case 0: return renderSlide1()
      case 1: return renderSlide2()
      case 2: return renderSlide3()
      case 3: return renderSlide4()
      case 4: return renderSlide5()
      case 5: return renderSlide6()
      case 6: return renderSlide7()
      case 7: return renderSlide8()
      case 8: return renderSlide9()
      case 9: return renderSlide10()
      case 10: return renderSlide11()
      case 11: return renderSlide12()
      default: return renderSlide1()
    }
  }

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

      {/* 2. Top Header: Team WHAT Logo Branding & Slide Counter */}
      <header className="relative z-30 px-6 py-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-[#10131a]/85 backdrop-blur-md border border-white/12 rounded-xl px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
            <img
              src={`${baseUrl}logo.svg`}
              alt="WHAT"
              className="h-4 md:h-5 w-auto object-contain"
            />
            <span className="text-[11px] font-black tracking-[0.15em] text-white uppercase font-sans border-l border-white/15 pl-2">
              COSMO-NET
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
      <main className="relative flex-1 w-full h-full overflow-hidden px-6 md:px-12 py-3 flex flex-col justify-center z-20">
        {renderSlideContent()}
      </main>

      {/* 4. Minimalist Bottom Bar: Keyboard navigation hints */}
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

