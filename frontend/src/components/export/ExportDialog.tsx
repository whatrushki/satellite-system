import React, { useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileJson, Check, Copy } from 'lucide-react'
import { ExportResultDoc } from '@/core/types'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onOpenChange }) => {
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const simulationResult = useSimulationStore((state) => state.simulationResult)
  const [copied, setCopied] = useState(false)

  if (!activeScenario || !simulationResult) return null

  // Build official result document strictly according to "Описание данных"
  const routes: ExportResultDoc['routes'] = []
  for (const client of simulationResult.clients) {
    for (const item of client.timeline) {
      routes.push({
        t_s: item.t_s,
        client_id: client.client_id,
        path: item.path,
      })
    }
  }
  routes.sort((a, b) => a.t_s - b.t_s || a.client_id.localeCompare(b.client_id))

  const exportDoc: ExportResultDoc = {
    schema_version: 'cosmo-A-result-1.0',
    effective_scenario: activeScenario,
    routes,
    analytics: {
      target_availability: activeScenario.environment.target_availability,
      clients_summary: simulationResult.clients.map((c) => ({
        client_id: c.client_id,
        name: c.name,
        path_availability_pct: c.path_availability_pct,
        target_met: c.target_met,
        visibility_pct: c.visibility_pct,
        max_gap_seconds: c.max_gap_seconds,
        max_gap_minutes: c.max_gap_minutes,
        average_hops: c.average_hops,
      })),
    },
  }

  const jsonString = JSON.stringify(exportDoc, null, 2)
  const scenarioJsonString = JSON.stringify(activeScenario, null, 2)

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl font-mono text-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-400">
            <Download className="w-5 h-5" />
            <DialogTitle>ЭКСПОРТ РЕЗУЛЬТАТОВ РАСЧЕТА</DialogTitle>
          </div>
          <DialogDescription>
            Выгрузка результатов моделирования по официальному стандарту <code>cosmo-A-result-1.0</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-100">cosmo-A-result-1.0</div>
              <div className="text-[11px] text-slate-400">
                Записей маршрутов: <b className="text-emerald-400">{routes.length}</b> (720 отсчетов x 3 пункта)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Скопировано' : 'Буфер'}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => downloadFile(`${activeScenario.meta.id}_result.json`, jsonString)}
                className="h-7 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Скачать JSON результата
              </Button>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-100">Модифицированный сценарий (cosmo-A-1.0)</div>
              <div className="text-[11px] text-slate-400">
                Содержит все изменения параметров орбит, фазирования и добавленные отказы
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile(`${activeScenario.meta.id}_modified.json`, scenarioJsonString)}
              className="h-7 text-xs"
            >
              <FileJson className="w-3.5 h-3.5 mr-1 text-sky-400" />
              Скачать сценарий
            </Button>
          </div>

          {/* Preview of JSON snippet */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400">Фрагмент структуры выгружаемого JSON:</span>
            <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[10px] text-sky-300 overflow-x-auto max-h-48">
              {JSON.stringify(
                {
                  schema_version: exportDoc.schema_version,
                  effective_scenario_meta: exportDoc.effective_scenario.meta,
                  sample_route_0: exportDoc.routes[0],
                  sample_route_1: exportDoc.routes[1],
                  total_routes_count: exportDoc.routes.length,
                  analytics_summary: exportDoc.analytics?.clients_summary,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
