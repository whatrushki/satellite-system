import React, { useState } from 'react'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { validateScenario } from '@/core/scenarioValidator'
import { Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { Scenario } from '@/core/types'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onOpenChange }) => {
  const { setScenario } = useScenarioStore()
  const { recalculate } = useSimulationStore()

  const [parsedData, setParsedData] = useState<Scenario | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const json = JSON.parse(text)

        const { valid, errors } = validateScenario(json)
        if (!valid) {
          setValidationErrors(errors)
          setParsedData(null)
        } else {
          setValidationErrors([])
          setParsedData(json as Scenario)
        }
      } catch (err: any) {
        setValidationErrors([`Синтаксическая ошибка JSON: ${err.message}`])
        setParsedData(null)
      }
    }
    reader.readAsText(file)
  }

  const handleApply = () => {
    if (!parsedData) return
    setScenario(parsedData, 'custom')
    recalculate()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg font-mono text-zinc-200">
        <DialogHeader>
          <div className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5 text-zinc-300" />
            <DialogTitle>ЗАГРУЗКА И ВАЛИДАЦИЯ СЦЕНАРИЯ</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            Загрузка внешнего файла сценария в формате схемы <code className="text-zinc-200">cosmo-A-1.0</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-white/20 hover:border-white/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-black/40 relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <div className="text-zinc-200 font-bold">Выберите файл или перетащите сюда</div>
            <div className="text-[10px] text-zinc-500 mt-1">Поддерживается стандартный JSON cosmo-A-1.0</div>
            {fileName && <div className="mt-2 text-white font-bold text-xs">{fileName}</div>}
          </div>

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Ошибки валидации входных данных ({validationErrors.length}):
              </div>
              <ul className="list-disc list-inside text-[11px] text-rose-200/90 space-y-1 max-h-36 overflow-y-auto">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation Success Box */}
          {parsedData && (
            <div className="bg-white/5 border border-white/20 p-3 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <CheckCircle2 className="w-4 h-4 text-zinc-200" />
                Сценарий успешно проверен и готов к расчету:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
                <div>Название: <b className="text-white">{parsedData.meta.title}</b></div>
                <div>Спутников: <b className="text-white">{parsedData.design.satellites.length}</b></div>
                <div>Очередь: <b className="text-white">{parsedData.design.launch_stage}</b></div>
                <div>Дальность ISL: <b className="text-white">{parsedData.environment.isl_range_km} км</b></div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              variant="default"
              disabled={!parsedData}
              onClick={handleApply}
              className="font-bold"
            >
              Загрузить в модель
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
