import React from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Radio,
  Network,
  Cpu,
  TrendingUp,
  MapPin,
  ArrowRight,
} from 'lucide-react'

export const RecommendationsView: React.FC = () => {
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const { simulationResult, setActiveTab } = useSimulationStore()

  const criticalSats = simulationResult?.critical_satellites || []

  return (
    <div className="w-full h-full overflow-y-auto p-4 space-y-5 font-mono text-zinc-200 select-none">
      {/* Header card */}
      <div className="bg-[#10131a]/90 backdrop-blur-xl p-5 rounded-2xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase text-white font-sans tracking-wide">
                Инженерные рекомендации и анализ устойчивости
              </h2>
              <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-zinc-300 border border-white/15">
                CosmoHack 2026
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-1 max-w-3xl leading-relaxed">
              Комплексное аналитическое обоснование проектных решений для группировки из 48 КА (550 км, 87° наклонение).
              Оценка устойчивости к отказам, преодоление сетевого парадокса при малом радиусе ISL и обеспечение целевого уровня доступности ≥ 90%.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('compare')}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl border border-white/20 cursor-pointer transition-all flex items-center gap-1.5 shrink-0"
        >
          <span>В модуль сравнения</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Pillars of Engineering Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Сетевой парадокс сценария 04 (2000 км) */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-rose-300 font-bold font-sans text-xs uppercase">
              <Network className="w-4 h-4 text-rose-400" />
              <span>1. Сетевой парадокс: дальность ISL = 2000 км</span>
            </div>
            <span className="text-[10px] font-mono bg-rose-950/40 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
              Критический разрыв
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5 font-mono">
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                <span>Математика внутриплоскостного разрыва:</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Радиус орбиты r = 6371 + 550 = 6921 км. При 16 аппаратах в одной плоскости хордовое расстояние между соседними КА равно:
              </p>
              <div className="bg-black/60 p-1.5 rounded text-center text-white font-mono font-bold text-xs border border-white/10">
                d_хорда = 2 · r · sin(π / 16) = 2 · 6921 · sin(11.25°) ≈ 2699.2 км
              </div>
            </div>

            <p>
              <b className="text-white">Обнаруженная аномалия:</b> При пределе ISL в 2000 км связь <b className="text-rose-300">внутри орбитальной плоскости разорвана всегда</b> (2699 км {'>'} 2000 км).
              Над терминалом <b className="text-white font-mono">C72</b> радиовидимость спутников составляет <b className="text-emerald-400 font-mono">100.0%</b>, однако доступность маршрута до шлюза падает до <b className="text-rose-400 font-mono">65.14%</b>!
            </p>
            <p className="text-zinc-400 text-[11px]">
              Маршрут возникает лишь кратковременно (на 2–4 минуты), когда над приполярной областью плоскости пересекаются и сближаются. В течение суток абонент переносит 176 микроперерывов.
            </p>
            <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px]">
              <b className="text-white">Рекомендация:</b> Минимально допустимая проектная дальность ISL для непрерывности кольца плоскости составляет <b className="text-white">2750–2800 км</b>.
            </div>
          </div>
        </div>

        {/* Card 2: Анализ этапов развёртывания (1, 2, 3 очереди) */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-amber-300 font-bold font-sans text-xs uppercase">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>2. Динамика развёртывания по очередям</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-950/40 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
              3 этапа запуска
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-zinc-400">1 очередь (16 КА)</div>
                <div className="text-sm font-bold text-rose-400 mt-1">12.6% – 27.2%</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">Перерыв до 13.3 ч</div>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-zinc-400">2 очередь (32 КА)</div>
                <div className="text-sm font-bold text-amber-300 mt-1">~65% – 78%</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">Перерыв ~45 мин</div>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[10px] text-zinc-400">3 очередь (48 КА)</div>
                <div className="text-sm font-bold text-emerald-400 mt-1">96.7% – 98.9%</div>
                <div className="text-[9px] text-zinc-500 mt-0.5">Перерыв 2–8 мин</div>
              </div>
            </div>

            <p>
              <b className="text-white">Вывод по первой очереди:</b> Одиночная орбитальная плоскость из 16 аппаратов неспособна предоставить непрерывный коммерческий канал связи. Связь появляется только при орбитальном прохождении плоскости над Евразийской Арктикой (2–3 раза в сутки).
            </p>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-[11px]">
              <b className="text-white">Рекомендация по фазированию запуска:</b> Если требуется обеспечить ранний ввод в эксплуатацию, 16 аппаратов первой очереди выгоднее запускать в две плоскости по 8 аппаратов (сдвиг RAAN 90°), что сократит максимальные перерывы с 13.3 до 4.5 часов.
            </div>
          </div>
        </div>

        {/* Card 3: Анализ устойчивости к отказам и ключевые узлы */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold font-sans text-xs uppercase">
              <ShieldAlert className="w-4 h-4 text-zinc-300" />
              <span>3. Анализ устойчивости к отказам (Cut-Vertices)</span>
            </div>
            <span className="text-[10px] font-mono bg-white/10 text-white border border-white/15 px-2 py-0.5 rounded">
              Рейтинг нагрузки
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <p>
              В симуляции отслеживается транзитная нагрузка каждого спутника. Ниже представлены аппараты, несущие максимальное число сквозных маршрутов:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono">
              {criticalSats.slice(0, 5).map((sat, i) => (
                <div key={sat.id} className="bg-black/50 p-2 rounded-xl border border-white/10 text-center">
                  <div className="text-[10px] text-zinc-400">#{i + 1} КА</div>
                  <div className="text-xs font-bold text-white mt-0.5">{sat.id}</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">{sat.routes_carried} маршр.</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-zinc-400">
              При выходе из строя спутников, обслуживающих сектор Мурманска (<b className="text-white font-mono">G_MUR</b>), весь трафик вынужден перестраиваться на параллельные плоскости, что увеличивает число хопов с 2 до 4–5.
            </p>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-[11px]">
              <b className="text-white">Рекомендация по надежности:</b> Резервирование узлов в плоскости P1 (проходящей непосредственно над шлюзом) критично для недопущения эффекта «бутылочного горлышка».
            </div>
          </div>
        </div>

        {/* Card 4: Инфраструктурные предложения (Наземный сегмент) */}
        <div className="bg-[#10131a]/85 border border-white/12 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold font-sans text-xs uppercase">
              <MapPin className="w-4 h-4 text-zinc-300" />
              <span>4. Предложения по наземному сегменту</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              Доступность 99.5%+
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans text-zinc-300 leading-relaxed">
            <p>
              В базовой модели используется единственный опорный шлюз выхода в наземную сеть — <b className="text-white">Мурманск (G_MUR, 68.97° с.ш.)</b>.
              Любая авария шлюза приводит к <b className="text-rose-300">100% отключению связи во всем арктическом регионе</b> независимо от исправности всех 48 аппаратов!
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-start gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <b className="text-white">Развертывание восточного шлюза (Тикси / Певек):</b>
                  <span className="text-zinc-400 block mt-0.5">
                    Устраняет единую точку отказа и сокращает максимальное плечо передачи данных с 5 хопов до 2 хопов для терминалов C70 и C72.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <b className="text-white">Интеграция адаптивной маршрутизации (QoS / Handover):</b>
                  <span className="text-zinc-400 block mt-0.5">
                    Учет времени жизни контакта с КА позволяет переключать абонентов за 30–60 секунд до захода аппарата за горизонт без потери сессии.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Action Banner */}
      <div className="p-4 rounded-2xl bg-[#10131a]/90 border border-white/12 shadow-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-white font-sans">
            Итоговое заключение проектной группы COSMO-NET:
          </div>
          <div className="text-[11px] text-zinc-400 font-sans">
            Полная группировка 01_full_constellation (48 КА, ISL 3000 км) полностью выполняет и превосходит требования ТЗ (доступность 96.7% – 98.9% при норме ≥ 90%).
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-3 py-1.5 bg-white text-zinc-950 font-bold text-xs rounded-xl hover:bg-zinc-200 cursor-pointer transition-colors shadow-sm font-sans"
          >
            К 3D карте созвездия
          </button>
        </div>
      </div>
    </div>
  )
}
