import { create } from 'zustand'
import { Scenario, EnvironmentConfig, FailureOutage } from '../core/types'
import sc01 from '../../../Данные/01_full_constellation.json'
import sc02 from '../../../Данные/02_first_launch.json'
import sc03 from '../../../Данные/03_satellite_outages.json'
import sc04 from '../../../Данные/04_link_range.json'
import sc05 from '../../../Данные/05_sparse_planes.json'
import sc06 from '../../../Данные/06_dual_gateway_failover.json'

export interface SavedVariant {
  id: string
  title: string
  timestamp: string
  scenario: Scenario
}

export interface ScenarioRegistryItem {
  id: string
  label: string
  scenario?: Scenario
  isCustom?: boolean
}

const DEFAULT_SCENARIOS: ScenarioRegistryItem[] = [
  { id: '01_full_constellation', label: '01: Полная (48 КА)', scenario: sc01 as unknown as Scenario },
  { id: '02_first_launch', label: '02: 1-я очер. (16 КА)', scenario: sc02 as unknown as Scenario },
  { id: '03_satellite_outages', label: '03: Отказы 10 КА', scenario: sc03 as unknown as Scenario },
  { id: '04_link_range', label: '04: ISL 2000 км', scenario: sc04 as unknown as Scenario },
  { id: '05_sparse_planes', label: '05: Разреженная (24 КА)', scenario: sc05 as unknown as Scenario },
  { id: '06_dual_gateway_failover', label: '06: Мурманск + Тикси', scenario: sc06 as unknown as Scenario },
]

interface ScenarioState {
  activeScenario: Scenario | null
  activeScenarioId: string
  availableScenarios: ScenarioRegistryItem[]
  savedVariants: SavedVariant[]
  scenarioOriginalFailures: FailureOutage[]
  scenarioOriginalGateways: any[]
  isLoading: boolean
  error: string | null

  loadDefaultScenario: (id: string) => Promise<void>
  setScenario: (s: Scenario, id?: string) => void
  registerScenario: (id: string, label: string, scenario: Scenario) => void
  updateEnvironment: (partial: Partial<EnvironmentConfig>) => void
  setLaunchStage: (stage: number) => void
  updatePlane: (planeId: string, raan: number, phase: number) => void
  addFailure: (f: FailureOutage) => void
  removeFailure: (index: number) => void
  clearAllFailures: () => void
  resetSandboxManualFailures: () => void
  killSatelliteNow: (satId: string, currentTime_s: number) => void
  restoreSatelliteNow: (satId: string, currentTime_s: number) => void
  clearAllSatelliteFailures: (satId: string) => void
  killGatewayNow: (gatewayId: string, currentTime_s: number) => void
  restoreGatewayNow: (gatewayId: string, currentTime_s: number) => void
  exportSandboxScenario: () => void
  toggleGatewayOutage: (gatewayId: string, start_s: number, end_s: number) => void
  saveCurrentVariant: (customTitle?: string) => void
  deleteVariant: (id: string) => void
  removeScenario: (id: string) => Promise<void>
  resetToOriginal: () => Promise<void>
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  activeScenario: sc01 as unknown as Scenario,
  activeScenarioId: '01_full_constellation',
  availableScenarios: DEFAULT_SCENARIOS,
  savedVariants: [],
  scenarioOriginalFailures: JSON.parse(JSON.stringify((sc01 as any).failures || [])),
  scenarioOriginalGateways: JSON.parse(JSON.stringify((sc01 as any).gateway_outages || [])),
  isLoading: false,
  error: null,

  loadDefaultScenario: async (id: string) => {
    const existing = get().availableScenarios.find((s) => s.id === id)
    if (existing?.scenario) {
      set({
        activeScenario: existing.scenario,
        activeScenarioId: id,
        scenarioOriginalFailures: JSON.parse(JSON.stringify(existing.scenario.failures || [])),
        scenarioOriginalGateways: JSON.parse(JSON.stringify(existing.scenario.gateway_outages || [])),
        isLoading: false,
        error: null,
      })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      const candidateUrls = [
        `${baseUrl}Данные/${id}.json`,
        `${baseUrl}data/${id}.json`,
        `./Данные/${id}.json`,
        `./data/${id}.json`,
      ]
      let data: Scenario | null = null
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url)
          if (res.ok) {
            data = await res.json()
            break
          }
        } catch {
          // try next path
        }
      }
      if (!data) throw new Error(`Не удалось загрузить сценарий ${id}`)
      const updatedList = get().availableScenarios.map((item) =>
        item.id === id ? { ...item, scenario: data } : item
      )
      set({
        activeScenario: data,
        activeScenarioId: id,
        scenarioOriginalFailures: JSON.parse(JSON.stringify(data.failures || [])),
        scenarioOriginalGateways: JSON.parse(JSON.stringify(data.gateway_outages || [])),
        availableScenarios: updatedList,
        isLoading: false,
      })
    } catch (err: any) {
      set({ error: err.message || 'Ошибка загрузки сценария', isLoading: false })
    }
  },

  setScenario: (s: Scenario, id = 'custom') => {
    set({
      activeScenario: s,
      activeScenarioId: id,
      scenarioOriginalFailures: JSON.parse(JSON.stringify(s.failures || [])),
      scenarioOriginalGateways: JSON.parse(JSON.stringify(s.gateway_outages || [])),
      error: null,
    })
  },

  registerScenario: (id: string, label: string, scenario: Scenario) => {
    const prev = get().availableScenarios.filter((x) => x.id !== id)
    const newItem: ScenarioRegistryItem = { id, label, scenario, isCustom: true }
    set({
      availableScenarios: [...prev, newItem],
      activeScenario: scenario,
      activeScenarioId: id,
      scenarioOriginalFailures: JSON.parse(JSON.stringify(scenario.failures || [])),
      scenarioOriginalGateways: JSON.parse(JSON.stringify(scenario.gateway_outages || [])),
      error: null,
    })
  },

  updateEnvironment: (partial: Partial<EnvironmentConfig>) => {
    const cur = get().activeScenario
    if (!cur) return
    const updated: Scenario = {
      ...cur,
      environment: {
        ...cur.environment,
        ...partial,
      },
    }
    set({ activeScenario: updated })
  },

  setLaunchStage: (stage: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const updated: Scenario = {
      ...cur,
      design: {
        ...cur.design,
        launch_stage: stage,
      },
    }
    set({ activeScenario: updated })
  },

  updatePlane: (planeId: string, raan: number, phase: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const updatedPlanes = cur.design.planes.map((p) =>
      p.id === planeId ? { ...p, raan_deg: raan, phase_deg: phase } : p
    )
    const updated: Scenario = {
      ...cur,
      design: {
        ...cur.design,
        planes: updatedPlanes,
      },
    }
    set({ activeScenario: updated })
  },

  addFailure: (f: FailureOutage) => {
    const cur = get().activeScenario
    if (!cur) return
    const updated: Scenario = {
      ...cur,
      failures: [...(cur.failures || []), f],
    }
    set({ activeScenario: updated })
  },

  removeFailure: (index: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const updatedFailures = [...(cur.failures || [])]
    updatedFailures.splice(index, 1)
    const updated: Scenario = {
      ...cur,
      failures: updatedFailures,
    }
    set({ activeScenario: updated })
  },

  clearAllFailures: () => {
    const cur = get().activeScenario
    if (!cur) return
    set({
      activeScenario: {
        ...cur,
        failures: [],
        gateway_outages: [],
      },
    })
  },

  resetSandboxManualFailures: () => {
    const cur = get().activeScenario
    if (!cur) return
    const origFailures = get().scenarioOriginalFailures || []
    const origGateways = get().scenarioOriginalGateways || []
    set({
      activeScenario: {
        ...cur,
        failures: JSON.parse(JSON.stringify(origFailures)),
        gateway_outages: JSON.parse(JSON.stringify(origGateways)),
      },
    })
  },

  killSatelliteNow: (satId: string, currentTime_s: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const step = cur.environment.step_s
    const horizon = cur.environment.horizon_s
    const start_s = Math.floor(currentTime_s / step) * step

    // Check if this satellite is already failed at currentTime_s
    const exists = (cur.failures || []).some(
      (f) => f.satellite_id === satId && f.start_s <= currentTime_s && currentTime_s < f.end_s
    )
    if (exists) return

    const f: FailureOutage = {
      satellite_id: satId,
      start_s,
      end_s: horizon,
    }
    get().addFailure(f)
  },

  restoreSatelliteNow: (satId: string, currentTime_s: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const step = cur.environment.step_s
    const failures = [...(cur.failures || [])]
    const curQuantized = Math.floor(currentTime_s / step) * step

    // Find any failure for this satellite active at currentTime_s
    const activeFailIdx = failures.findIndex(
      (f) => f.satellite_id === satId && f.start_s <= currentTime_s && currentTime_s < f.end_s
    )

    if (activeFailIdx !== -1) {
      const f = failures[activeFailIdx]
      if (curQuantized > f.start_s) {
        // Cap the outage to end at currentTime_s (creating the sandbox incident window [start_s, curQuantized])
        failures[activeFailIdx] = {
          ...f,
          end_s: Math.max(f.start_s + step, curQuantized),
        }
      } else {
        // If restoring at or before start time, delete this failure completely
        failures.splice(activeFailIdx, 1)
      }
    } else {
      // If no failure actively covers currentTime_s, check if there is an outage starting at currentTime_s or in the future
      const futureFailIdx = failures.findIndex(
        (f) => f.satellite_id === satId && f.start_s >= curQuantized
      )
      if (futureFailIdx !== -1) {
        failures.splice(futureFailIdx, 1)
      } else {
        // Truncate or remove the latest outage for this satellite if any exists
        const lastIdx = failures
          .map((f, i) => (f.satellite_id === satId ? i : -1))
          .filter((i) => i !== -1)
          .pop()
        if (lastIdx !== undefined) {
          failures.splice(lastIdx, 1)
        }
      }
    }

    set({
      activeScenario: {
        ...cur,
        failures,
      },
    })
  },

  clearAllSatelliteFailures: (satId: string) => {
    const cur = get().activeScenario
    if (!cur) return
    set({
      activeScenario: {
        ...cur,
        failures: (cur.failures || []).filter((f) => f.satellite_id !== satId),
      },
    })
  },

  exportSandboxScenario: () => {
    const cur = get().activeScenario
    if (!cur) return
    const jsonString = JSON.stringify(cur, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${cur.meta.id}_sandbox.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  killGatewayNow: (gatewayId: string, currentTime_s: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const step = cur.environment.step_s
    const horizon = cur.environment.horizon_s
    const start_s = Math.floor(currentTime_s / step) * step

    const exists = (cur.gateway_outages || []).some(
      (g) => g.gateway_id === gatewayId && g.start_s <= currentTime_s && currentTime_s < g.end_s
    )
    if (exists) return

    set({
      activeScenario: {
        ...cur,
        gateway_outages: [
          ...(cur.gateway_outages || []),
          { gateway_id: gatewayId, start_s, end_s: horizon },
        ],
      },
    })
  },

  restoreGatewayNow: (gatewayId: string, currentTime_s: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const step = cur.environment.step_s
    const curQuantized = Math.floor(currentTime_s / step) * step
    const list = [...(cur.gateway_outages || [])]

    const idx = list.findIndex(
      (g) => g.gateway_id === gatewayId && g.start_s <= currentTime_s && currentTime_s < g.end_s
    )
    if (idx !== -1) {
      if (curQuantized > list[idx].start_s) {
        list[idx] = { ...list[idx], end_s: Math.max(list[idx].start_s + step, curQuantized) }
      } else {
        list.splice(idx, 1)
      }
    } else {
      const futureIdx = list.findIndex((g) => g.gateway_id === gatewayId && g.start_s >= curQuantized)
      if (futureIdx !== -1) {
        list.splice(futureIdx, 1)
      }
    }

    set({
      activeScenario: {
        ...cur,
        gateway_outages: list,
      },
    })
  },

  toggleGatewayOutage: (gatewayId: string, start_s: number, end_s: number) => {
    const cur = get().activeScenario
    if (!cur) return
    const exists = (cur.gateway_outages || []).some(
      (g) => g.gateway_id === gatewayId && g.start_s === start_s && g.end_s === end_s
    )
    let updatedGateways = [...(cur.gateway_outages || [])]
    if (exists) {
      updatedGateways = updatedGateways.filter(
        (g) => !(g.gateway_id === gatewayId && g.start_s === start_s && g.end_s === end_s)
      )
    } else {
      updatedGateways.push({ gateway_id: gatewayId, start_s, end_s })
    }
    const updated: Scenario = {
      ...cur,
      gateway_outages: updatedGateways,
    }
    set({ activeScenario: updated })
  },

  saveCurrentVariant: (customTitle?: string) => {
    const cur = get().activeScenario
    if (!cur) return
    const title = customTitle || `${cur.meta.title} (Вариант ${get().savedVariants.length + 1})`
    const newVariant: SavedVariant = {
      id: `variant_${Date.now()}`,
      title,
      timestamp: new Date().toLocaleTimeString(),
      scenario: JSON.parse(JSON.stringify(cur)),
    }
    set({ savedVariants: [...get().savedVariants, newVariant] })
  },

  deleteVariant: (id: string) => {
    set({ savedVariants: get().savedVariants.filter((v) => v.id !== id) })
  },

  removeScenario: async (id: string) => {
    const list = get().availableScenarios.filter((s) => s.id !== id)
    set({ availableScenarios: list })
    if (get().activeScenarioId === id) {
      const nextId = list[0]?.id || '01_full_constellation'
      await get().loadDefaultScenario(nextId)
    }
  },

  resetToOriginal: async () => {
    await get().loadDefaultScenario(get().activeScenarioId)
  },
}))
