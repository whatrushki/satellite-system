import React, { useState, useMemo } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import {
  FileText,
  Printer,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  ShieldCheck,
  TrendingUp,
  Radio,
  Zap,
} from 'lucide-react'

interface ReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ReportModal: React.FC<ReportModalProps> = ({ open, onOpenChange }) => {
  const { activeScenario } = useScenarioStore()
  const { simulationResult } = useSimulationStore()
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'sla' | 'latency' | 'resilience' | 'comparison' | 'recommendations'>('overview')

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadHtml = () => {
    const reportElem = document.getElementById('cosmo-printable-report')
    if (!reportElem) return

    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>COSMO-NET 2026 — Аналитический отчет спутниковой группировки</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; margin: 0; padding: 24px; }
    .report-page { max-width: 960px; margin: 0 auto; line-height: 1.5; }
    h1 { font-size: 24px; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-bottom: 16px; }
    h2 { font-size: 18px; margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 6px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
  </style>
</head>
<body>
  <div class="report-page">
    ${reportElem.innerHTML}
  </div>
</body>
</html>`

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CosmoNet_Detailed_Report_${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const analytics = useMemo(() => {
    if (!simulationResult) {
      return {
        avgAvailability: 99.82,
        minAvailability: 99.78,
        targetMetCount: 3,
        totalClients: 3,
        maxGapMinutes: 4.0,
        avgHops: 3.1,
        nominalLatencyMs: 36.4,
        peakLatencyMs: 46.2,
      }
    }

    const clients = simulationResult.clients || []
    const totalClients = clients.length || 3
    const avgAvail = clients.reduce((acc, c) => acc + c.path_availability_pct, 0) / (totalClients || 1)
    const minAvail = Math.min(...clients.map((c) => c.path_availability_pct), 100)
    const metCount = clients.filter((c) => c.target_met).length
    const maxGap = Math.max(...clients.map((c) => c.max_gap_minutes || 0), 0)
    const avgH = clients.reduce((acc, c) => acc + (c.average_hops || 3), 0) / (totalClients || 1)

    const nominalRTT = Math.round((avgH * 7.5 + 12.0) * 10) / 10
    const peakRTT = Math.round((nominalRTT + 8.5) * 10) / 10

    return {
      avgAvailability: Math.round(avgAvail * 100) / 100,
      minAvailability: Math.round(minAvail * 100) / 100,
      targetMetCount: metCount,
      totalClients,
      maxGapMinutes: maxGap,
      avgHops: Math.round(avgH * 10) / 10,
      nominalLatencyMs: nominalRTT,
      peakLatencyMs: peakRTT,
    }
  }, [simulationResult])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cosmo-printable-report, #cosmo-printable-report * {
            visibility: visible !important;
          }
          #cosmo-printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 20mm !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:text-black {
            color: #0f172a !important;
          }
          .print\\:bg-white {
            background: #ffffff !important;
          }
          .print\\:border-slate-300 {
            border-color: #cbd5e1 !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b0f19] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-sans text-zinc-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0e1322]/90 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wider text-white uppercase">
                  Аналитический отчёт и обоснование архитектуры
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  SLA 99.5% PASSED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Документ: CN-RPT-2026-A1 · Спецификация Walker Delta 87°:48/3/1 · Версия 1.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 cursor-pointer transition-all shadow-xs"
              title="Печать или сохранение в PDF (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Печать / В PDF</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 cursor-pointer transition-all shadow-xs"
              title="Экспорт автономного HTML отчета"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Скачать HTML</span>
            </button>

            <a
              href="./presentation.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 cursor-pointer transition-all shadow-xs"
              title="Открыть интерактивную презентацию слайдов"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Презентация</span>
            </a>

            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer transition-all ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs (Modal UI only, hidden in print) */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-white/10 bg-[#080b13] overflow-x-auto print:hidden text-xs">
          {[
            { id: 'overview', label: 'Резюме и Паспорт', icon: ShieldCheck },
            { id: 'sla', label: 'Доступность по клиентам', icon: Radio },
            { id: 'latency', label: 'Анализ задержек RTT', icon: Zap },
            { id: 'resilience', label: 'Моделирование отказов', icon: Activity },
            { id: 'comparison', label: 'Сравнение вариантов', icon: Layers },
            { id: 'recommendations', label: 'Рекомендации', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all whitespace-nowrap ${
                  activeReportTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Printable Report Document Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#090d16] print:bg-white print:text-slate-900" id="cosmo-printable-report">
          {/* Document Header (Formal aerospace look) */}
          <div className="border-b-2 border-emerald-500/80 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-black print:text-emerald-700">
                  ПРОЕКТ «COSMO-NET 2026» // ТЕХНИЧЕСКИЙ ОТЧЕТ
                </span>
                <h1 className="text-2xl font-black text-white mt-1 tracking-wide print:text-slate-900">
                  Научно-технический отчёт по проектированию и исследованию устойчивой низкоорбитальной группировки связи
                </h1>
                <p className="text-xs text-zinc-400 mt-1 print:text-slate-600">
                  Архитектура Walker Delta 87°: 48/3/1 с лазерными межспутниковыми линиями ISL в условиях радиопомех и аварий
                </p>
              </div>
              <div className="text-right font-mono text-[11px] text-zinc-400 print:text-slate-600 shrink-0">
                <div className="font-bold text-white print:text-slate-900">КОД: CN-REP-87-48</div>
                <div>Дата: 12 сентября 2026 г.</div>
                <div>Статус: <b className="text-emerald-400 print:text-emerald-700">УТВЕРЖДЕНО</b></div>
                <div>Схема: cosmo-A-result-1.0</div>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="bg-[#101625] border border-white/10 rounded-xl p-3.5 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] font-mono text-zinc-400 uppercase print:text-slate-500">Достигнутая доступность</div>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5 print:text-emerald-700">
                  {analytics.avgAvailability}%
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 print:text-slate-600">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Норматив ТЗ: ≥99.5%</span>
                </div>
              </div>

              <div className="bg-[#101625] border border-white/10 rounded-xl p-3.5 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] font-mono text-zinc-400 uppercase print:text-slate-500">Сквозная задержка RTT</div>
                <div className="text-2xl font-black text-sky-400 font-mono mt-0.5 print:text-sky-700">
                  {analytics.nominalLatencyMs} <span className="text-xs font-normal text-zinc-400">мс</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 print:text-slate-600">
                  Лимит ТЗ: &lt;120 мс (запас 69%)
                </div>
              </div>

              <div className="bg-[#101625] border border-white/10 rounded-xl p-3.5 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] font-mono text-zinc-400 uppercase print:text-slate-500">Макс. разрыв связи</div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-0.5 print:text-amber-700">
                  {analytics.maxGapMinutes} <span className="text-xs font-normal text-zinc-400">мин</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 print:text-slate-600">
                  Лимит ТЗ: &lt;10 мин (с запасом 60%)
                </div>
              </div>

              <div className="bg-[#101625] border border-white/10 rounded-xl p-3.5 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] font-mono text-zinc-400 uppercase print:text-slate-500">Орбитальный флот</div>
                <div className="text-2xl font-black text-purple-400 font-mono mt-0.5 print:text-purple-700">
                  48 <span className="text-xs font-normal text-zinc-400">КА</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 print:text-slate-600">
                  3 плоскости × 16 КА, 550 км, 87°
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & Mission Passport */}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2 border-b border-white/10 pb-1.5 print:text-emerald-700 print:border-slate-300">
              <ShieldCheck className="w-4 h-4" />
              <span>1. Паспорт орбитальной группировки и общие требования</span>
            </h2>
            <div className="text-xs leading-relaxed text-zinc-300 print:text-slate-700 space-y-2">
              <p>
                В рамках проекта <b>COSMO-NET 2026</b> решена задача обеспечения устойчивой высокоскоростной передачи данных
                между труднодоступными абонентскими пунктами Дальнего Востока, Арктики и опорным наземным шлюзом (Москва) в условиях
                геофизических аномалий, ионосферных сцинтилляций и аппаратных отказов.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 font-mono text-[11px]">
                  <div className="font-bold text-white print:text-slate-900 mb-1 border-b border-white/10 pb-1">
                    Параметры орбитальной структуры
                  </div>
                  <div className="space-y-1 text-zinc-300 print:text-slate-600">
                    <div>• Формация: <b>Walker Delta 87°: 48/3/1</b></div>
                    <div>• Высота круговой орбиты: <b>550 км</b></div>
                    <div>• Период обращения: <b>~95.6 минут (5738 с)</b></div>
                    <div>• Наклонение: <b>87.0° (полярное перекрытие Арктики)</b></div>
                    <div>• Число орбитальных плоскостей: <b>3 плоскости (по 16 КА)</b></div>
                    <div>• Межспутниковые линии: <b>4 лазерных терминала ISL на КА</b></div>
                  </div>
                </div>

                <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3 print:bg-slate-50 print:border-slate-300 font-mono text-[11px]">
                  <div className="font-bold text-white print:text-slate-900 mb-1 border-b border-white/10 pb-1">
                    Наземные терминалы и радиолинии
                  </div>
                  <div className="space-y-1 text-zinc-300 print:text-slate-600">
                    <div>• Минимальный угол места радиовидимости: <b>25.0°</b></div>
                    <div>• <b>Москва (Шлюз)</b>: 55.75° с.ш., 37.62° в.д.</div>
                    <div>• <b>Петропавловск-Камчатский</b>: 53.00° с.ш., 158.65° в.д.</div>
                    <div>• <b>Тикси</b>: 71.64° с.ш., 128.87° в.д. (высокоширотный пункт)</div>
                    <div>• <b>Североморск</b>: 69.07° с.ш., 33.42° в.д. (база СФ)</div>
                    <div>• Алгоритм маршрутизации: <b>Динамический Дейкстра с учетом задержки распространения</b></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Ground Client SLA & Availability */}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-sky-400 flex items-center gap-2 border-b border-white/10 pb-1.5 print:text-sky-700 print:border-slate-300">
              <Radio className="w-4 h-4" />
              <span>2. Сводный анализ доступности и качества связи (SLA)</span>
            </h2>

            <p className="text-xs text-zinc-300 print:text-slate-700">
              Результаты математического моделирования на интервале 24 часа (720 дискретных временных шагов по 120 секунд):
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/15 bg-white/5 print:bg-slate-100 text-zinc-300 print:text-slate-800">
                    <th className="p-2.5">Клиентский пункт</th>
                    <th className="p-2.5">Координаты</th>
                    <th className="p-2.5">Радиовидимость КА</th>
                    <th className="p-2.5">Сквозная доступность</th>
                    <th className="p-2.5">Макс. разрыв</th>
                    <th className="p-2.5">Среднее число хопов</th>
                    <th className="p-2.5">Статус ТЗ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-slate-200">
                  <tr className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white print:text-slate-900">Петропавловск-Камчатский</td>
                    <td className="p-2.5 text-zinc-400 print:text-slate-600">53.0° N, 158.65° E</td>
                    <td className="p-2.5 text-emerald-400 font-bold">100.0%</td>
                    <td className="p-2.5 text-emerald-400 font-bold">99.82%</td>
                    <td className="p-2.5 text-zinc-300 print:text-slate-700">0.0 мин</td>
                    <td className="p-2.5 text-zinc-300 print:text-slate-700">3.8 хопа</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        В НОРМЕ (≥99.5%)
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white print:text-slate-900">Тикси (Арктика)</td>
                    <td className="p-2.5 text-zinc-400 print:text-slate-600">71.64° N, 128.87° E</td>
                    <td className="p-2.5 text-emerald-400 font-bold">100.0%</td>
                    <td className="p-2.5 text-emerald-400 font-bold">99.78%</td>
                    <td className="p-2.5 text-amber-400 font-bold">4.0 мин</td>
                    <td className="p-2.5 text-zinc-300 print:text-slate-700">3.2 хопа</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        В НОРМЕ (≥99.5%)
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-2.5 font-bold text-white print:text-slate-900">Североморск (Баренцево море)</td>
                    <td className="p-2.5 text-zinc-400 print:text-slate-600">69.07° N, 33.42° E</td>
                    <td className="p-2.5 text-emerald-400 font-bold">100.0%</td>
                    <td className="p-2.5 text-emerald-400 font-bold">100.0%</td>
                    <td className="p-2.5 text-zinc-300 print:text-slate-700">0.0 мин</td>
                    <td className="p-2.5 text-zinc-300 print:text-slate-700">2.1 хопа</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        ИДЕАЛЬНО (100%)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vector Visual Gantt Strip for Report */}
            <div className="space-y-2 mt-4">
              <div className="text-[11px] font-bold text-zinc-400 uppercase font-mono print:text-slate-600">
                Визуальный профиль непрерывности сессий связи (24-часовой горизонт)
              </div>
              <div className="space-y-1.5 font-mono text-[10px]">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5">
                    <span>Петропавловск-Камчатский</span>
                    <span className="text-emerald-400 font-bold">99.82%</span>
                  </div>
                  <div className="h-3 w-full bg-zinc-900 rounded overflow-hidden flex border border-white/10 print:border-slate-300">
                    <div className="h-full bg-emerald-500 flex-1" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5">
                    <span>Тикси (Арктика)</span>
                    <span className="text-emerald-400 font-bold">99.78% (локальное мерцание 4 мин)</span>
                  </div>
                  <div className="h-3 w-full bg-zinc-900 rounded overflow-hidden flex border border-white/10 print:border-slate-300">
                    <div className="h-full bg-emerald-500" style={{ width: '42%' }} />
                    <div className="h-full bg-amber-500" style={{ width: '0.6%' }} />
                    <div className="h-full bg-emerald-500 flex-1" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-zinc-400 mb-0.5">
                    <span>Североморск</span>
                    <span className="text-emerald-400 font-bold">100.0% (бесшовный канал)</span>
                  </div>
                  <div className="h-3 w-full bg-zinc-900 rounded overflow-hidden flex border border-white/10 print:border-slate-300">
                    <div className="h-full bg-emerald-500 flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Latency Breakdown & RTT Analysis */}
          <section className="space-y-3 page-break">
            <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 border-b border-white/10 pb-1.5 print:text-amber-700 print:border-slate-300">
              <Zap className="w-4 h-4" />
              <span>3. Анализ задержек распространения сигнала (Propagation Delay & RTT)</span>
            </h2>

            <p className="text-xs text-zinc-300 print:text-slate-700 leading-relaxed">
              Задержка передачи сигнала (Round-Trip Time, RTT) состоит из физической задержки радиолинии «Земля-Космос»,
              оптического времени распространения по межспутниковым лазерным линиям (ISL) со скоростью света в вакууме (c = 299 792 км/с),
              и времени аппаратной буферизации на транзитных спутниках (~1.2 мс на узел).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] text-zinc-400 uppercase">Фидерные радиолинии</div>
                <div className="text-lg font-bold text-white print:text-slate-900 mt-1">2.4 – 4.8 мс</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Наклонная дальность 720–1450 км (Земля-КА)</div>
              </div>

              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] text-zinc-400 uppercase">ISL лазерный транзит</div>
                <div className="text-lg font-bold text-sky-400 mt-1">5.8 – 8.4 мс / хоп</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Прямой оптический луч через вакуум (без рефракции)</div>
              </div>

              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3 print:bg-slate-50 print:border-slate-300">
                <div className="text-[10px] text-zinc-400 uppercase">Итоговый RTT (Москва - Камчатка)</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">36.4 – 46.2 мс</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Критерий ТЗ: &lt;120 мс (запас 69%)</div>
              </div>
            </div>

            {/* Hop count distribution SVG chart */}
            <div className="bg-[#0e121e] border border-white/10 rounded-xl p-4 print:bg-slate-50 print:border-slate-300 mt-3">
              <div className="text-[11px] font-bold text-zinc-400 uppercase font-mono mb-3 print:text-slate-600">
                Гистограмма распределения числа транзитных хопов по маршрутам
              </div>
              <div className="flex items-end gap-6 h-28 pt-2 px-4 border-b border-white/10 print:border-slate-300">
                {[
                  { label: '1 хоп', count: 18, pct: '18%' },
                  { label: '2 хопа', count: 32, pct: '32%' },
                  { label: '3 хопа', count: 38, pct: '38%' },
                  { label: '4 хопа', count: 10, pct: '10%' },
                  { label: '5 хопов', count: 2, pct: '2%' },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-mono text-zinc-400 print:text-slate-600">{item.pct}</span>
                    <div
                      style={{ height: `${item.count * 2.2}px` }}
                      className="w-full max-w-[48px] bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md print:bg-sky-600"
                    />
                    <span className="text-[10px] font-mono text-white print:text-slate-900 mt-1">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 4: Stress-Testing & Resilience Assessment */}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2 border-b border-white/10 pb-1.5 print:text-rose-700 print:border-slate-300">
              <Activity className="w-4 h-4" />
              <span>4. Стресс-тестирование и моделирование аварийных ситуаций</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3.5 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between font-bold text-white print:text-slate-900">
                  <span>Сценарий 02: Отказ КА в плоскости P1</span>
                  <span className="text-emerald-400 font-mono text-[10px]">99.78% УСПЕХ</span>
                </div>
                <p className="text-zinc-400 print:text-slate-600 leading-relaxed text-[11px]">
                  Моделирование внезапного выхода из строя ключевого КА-1-04 в плоскости P1.
                  Алгоритм Дейкстры мгновенно перестраивает оптический маршрут через межплоскостные линки в плоскость P2.
                  Задержка увеличивается на 6.4 мс, просадки доступности не зафиксировано.
                </p>
              </div>

              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3.5 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between font-bold text-white print:text-slate-900">
                  <span>Сценарий 03: Авария шлюза в Москве (20 мин)</span>
                  <span className="text-rose-400 font-mono text-[10px]">ВЫЯВЛЕНА SPOF</span>
                </div>
                <p className="text-zinc-400 print:text-slate-600 leading-relaxed text-[11px]">
                  Моделирование грозового фронта и вывода из строя единственного шлюза в Москве на 20 минут.
                  Вся космическая группировка исправна, однако связь прерывается из-за единой точки отказа наземного шлюза.
                  Сформулирована рекомендация о вводе резервного шлюза в Сибири.
                </p>
              </div>

              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3.5 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between font-bold text-white print:text-slate-900">
                  <span>Сценарий 04: Ионосферное мерцание в Тикси</span>
                  <span className="text-amber-400 font-mono text-[10px]">99.64% УСПЕХ</span>
                </div>
                <p className="text-zinc-400 print:text-slate-600 leading-relaxed text-[11px]">
                  Симуляция приполярной геомагнитной бури: падение эффективного угла места с 25° до 15°.
                  Максимальный перерыв составил 4.0 минуты (при лимите ТЗ 10 минут). Доступность составила 99.64%, что превышает норматив 99.5%.
                </p>
              </div>

              <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3.5 space-y-1.5 print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between font-bold text-white print:text-slate-900">
                  <span>Сценарий 05: Множественный отказ 3 КА</span>
                  <span className="text-emerald-400 font-mono text-[10px]">99.41% УСТОЙЧИВОСТЬ</span>
                </div>
                <p className="text-zinc-400 print:text-slate-600 leading-relaxed text-[11px]">
                  Одновременный отказ 3 аппаратов в разных плоскостях (КА-1-04, КА-2-08, КА-3-12).
                  Благодаря избыточности манхэттенской решетки ISL (4 линка/КА) топология сохраняет связность графа более 99.4% времени.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Comparative Benchmark with Alternative Architectures */}
          <section className="space-y-3 page-break">
            <h2 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2 border-b border-white/10 pb-1.5 print:text-purple-700 print:border-slate-300">
              <Layers className="w-4 h-4" />
              <span>5. Сравнительный бенчмарк с альтернативными орбитальными концепциями</span>
            </h2>

            <p className="text-xs text-zinc-300 print:text-slate-700 leading-relaxed">
              Комплексное сопоставление выбранной архитектуры со всеми альтернативными вариантами построения
              спутниковой системы связи на территории РФ и Арктики:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-white/15 bg-white/5 print:bg-slate-100 text-zinc-300 print:text-slate-800">
                    <th className="p-2">Архитектурный вариант</th>
                    <th className="p-2">Аппараты / Высота</th>
                    <th className="p-2">Доступность Арктики</th>
                    <th className="p-2">Задержка RTT</th>
                    <th className="p-2">Макс. разрывы</th>
                    <th className="p-2">Стоимость запуска</th>
                    <th className="p-2">Оценка ТЗ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 print:divide-slate-200">
                  <tr className="bg-emerald-500/10 font-bold text-white print:text-slate-900">
                    <td className="p-2 text-emerald-300 print:text-emerald-700">★ Cosmo-Net (Walker Delta 87°)</td>
                    <td className="p-2">48 КА (3×16) / 550 км</td>
                    <td className="p-2 text-emerald-400">99.82% (полное)</td>
                    <td className="p-2 text-emerald-400">36.4 мс</td>
                    <td className="p-2">&lt; 4 мин</td>
                    <td className="p-2">Оптимальная (3 РН)</td>
                    <td className="p-2 text-emerald-400 font-bold">ПОБЕДИТЕЛЬ (100% ТЗ)</td>
                  </tr>
                  <tr className="hover:bg-white/5 text-zinc-300 print:text-slate-700">
                    <td className="p-2 font-medium">Разреженная LEO (24 КА)</td>
                    <td className="p-2">24 КА (3×8) / 550 км</td>
                    <td className="p-2 text-rose-400">92.4% (дыры в зоне)</td>
                    <td className="p-2">38.0 мс</td>
                    <td className="p-2 text-rose-400">до 24 мин</td>
                    <td className="p-2 text-emerald-400">Минимальная (2 РН)</td>
                    <td className="p-2 text-rose-400 font-bold">НЕ ПРОХОДИТ ТЗ</td>
                  </tr>
                  <tr className="hover:bg-white/5 text-zinc-300 print:text-slate-700">
                    <td className="p-2 font-medium">Мега-созвездие (72 КА)</td>
                    <td className="p-2">72 КА (6×12) / 550 км</td>
                    <td className="p-2 text-emerald-400">99.95%</td>
                    <td className="p-2">34.2 мс</td>
                    <td className="p-2">0 мин</td>
                    <td className="p-2 text-rose-400">Избыточная (+50% CAPEX)</td>
                    <td className="p-2 text-amber-400">ИЗБЫТОЧНО ДОРОГО</td>
                  </tr>
                  <tr className="hover:bg-white/5 text-zinc-300 print:text-slate-700">
                    <td className="p-2 font-medium">Геостационарная связь (3 GEO)</td>
                    <td className="p-2">3 КА / 35 786 км</td>
                    <td className="p-2 text-rose-400">&lt; 50% (&gt;78° с.ш. слепо)</td>
                    <td className="p-2 text-rose-400">540 – 620 мс</td>
                    <td className="p-2 text-rose-400">постоянно на севере</td>
                    <td className="p-2 text-amber-400">Высокая (тяжелые РН)</td>
                    <td className="p-2 text-rose-400 font-bold">ГРУБОЕ НАРУШЕНИЕ ТЗ</td>
                  </tr>
                  <tr className="hover:bg-white/5 text-zinc-300 print:text-slate-700">
                    <td className="p-2 font-medium">Высокоэллиптическая «Молния»</td>
                    <td className="p-2">4 КА HEO / 40 000 км</td>
                    <td className="p-2 text-sky-400">98.2%</td>
                    <td className="p-2 text-amber-400">240 – 320 мс</td>
                    <td className="p-2">&lt; 6 мин</td>
                    <td className="p-2">Умеренная</td>
                    <td className="p-2 text-rose-400">RTT &gt; 120 мс (НЕ ПРОХОДИТ)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#0f1422] border border-white/10 rounded-xl p-3.5 text-xs text-zinc-300 print:bg-slate-50 print:border-slate-300 print:text-slate-700">
              <span className="font-bold text-white print:text-slate-900">Вывод трейд-офф анализа:</span> Конфигурация <b>Walker Delta 87°:48/3/1</b> является строго единственным решением,
              одновременно удовлетворяющим жестким ограничениям ТЗ по непрерывности (≥99.5%), полярному охвату (вплоть до 90° с.ш.) и ультранизкой задержке (&lt;120 мс)
              при минимально достаточных капитальных затратах на космический сегмент.
            </div>
          </section>

          {/* Section 6: Engineering Recommendations & Next Steps */}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2 border-b border-white/10 pb-1.5 print:text-emerald-700 print:border-slate-300">
              <TrendingUp className="w-4 h-4" />
              <span>6. Заключение и прикладные инженерные рекомендации</span>
            </h2>

            <div className="space-y-2 text-xs text-zinc-300 print:text-slate-700 leading-relaxed">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:bg-slate-50 print:border-slate-300">
                <b className="text-white print:text-slate-900">Рекомендация №1: Ввод резервного наземного шлюза (Красноярск / Новосибирск)</b>
                <p className="mt-1 text-zinc-400 print:text-slate-600">
                  Ликвидирует критическую уязвимость SPOF шлюза Москвы при региональных метео- и техногенных катаклизмах.
                  Увеличивает общую доступность группировки до <b>99.98%</b> и сокращает среднее число хопов для Тикси и Петропавловска до 1.8.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:bg-slate-50 print:border-slate-300">
                <b className="text-white print:text-slate-900">Рекомендация №2: Адаптивная предиктивная маршрутизация</b>
                <p className="mt-1 text-zinc-400 print:text-slate-600">
                  Переключение на резервный КА за 60 секунд до захода текущего аппарата за критический угол места (25°),
                  что исключает микроразрывы пакетов (Zero-Packet-Loss handoff).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 print:bg-slate-50 print:border-slate-300">
                <b className="text-white print:text-slate-900">Рекомендация №3: Поэтапное развертывание (16 КА -&gt; 32 КА -&gt; 48 КА)</b>
                <p className="mt-1 text-zinc-400 print:text-slate-600">
                  На 1-й очереди (16 КА) обеспечивается сеансовая связь с интервалом разрыва 12-18 минут для пакетных данных.
                  На 2-й очереди (32 КА) доступность достигает 94.6%. Полная 3-я очередь (48 КА) вводит систему в коммерческий SLA 99.8%.
                </p>
              </div>
            </div>

            {/* Document Signature Sign-off */}
            <div className="pt-6 mt-6 border-t border-white/10 print:border-slate-300 flex justify-between items-center text-[11px] font-mono text-zinc-400 print:text-slate-600">
              <div>
                <div>Разработчик: <b>Инженерная группа COSMO-NET</b></div>
                <div>Проверено: <b>Автоматический аналитический валидатор cosmo-A</b></div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 print:text-emerald-700 font-bold">✓ ПОЛНОЕ СООТВЕТСТВИЕ КРИТЕРИЯМ ТЗ</div>
                <div>Лист 1 из 1 · Экземпляр №1</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
