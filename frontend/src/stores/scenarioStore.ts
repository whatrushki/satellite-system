import { create } from 'zustand'
import { Scenario, EnvironmentConfig, FailureOutage } from '../core/types'

export interface SavedVariant {
  id: string
  title: string
  timestamp: string
  scenario: Scenario
}

interface ScenarioState {
  activeScenario: Scenario | null
  activeScenarioId: string
  savedVariants: SavedVariant[]
  isLoading: boolean
  error: string | null

  loadDefaultScenario: (id: string) => Promise<void>
  setScenario: (s: Scenario, id?: string) => void
  updateEnvironment: (partial: Partial<EnvironmentConfig>) => void
  setLaunchStage: (stage: number) => void
  updatePlane: (planeId: string, raan: number, phase: number) => void
  addFailure: (f: FailureOutage) => void
  removeFailure: (index: number) => void
  killSatelliteNow: (satId: string, currentTime_s: number) => void
  toggleGatewayOutage: (gatewayId: string, start_s: number, end_s: number) => void
  saveCurrentVariant: (customTitle?: string) => void
  deleteVariant: (id: string) => void
  resetToOriginal: () => Promise<void>
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  activeScenario: null,
  activeScenarioId: '01_full_constellation',
  savedVariants: [],
  isLoading: false,
  error: null,

  loadDefaultScenario: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`/data/${id}.json`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data: Scenario = await res.json()
      set({ activeScenario: data, activeScenarioId: id, isLoading: false })
    } catch (err: any) {
      set({ error: err.message || 'Ошибка загрузки сценария', isLoading: false })
    }
  },

  setScenario: (s: Scenario, id = 'custom') => {
    set({ activeScenario: s, activeScenarioId: id, error: null })
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

  killSatelliteNow: (satId: string, currentTime_s: number) => {
    const cur = get().activeScenario
    if (!cur) return
    // Outage from currentTime_s to horizon
    const horizon = cur.environment.horizon_s
    const f: FailureOutage = {
      satellite_id: satId,
      start_s: Math.floor(currentTime_s / cur.environment.step_s) * cur.environment.step_s,
      end_s: horizon,
    }
    get().addFailure(f)
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

  resetToOriginal: async () => {
    await get().loadDefaultScenario(get().activeScenarioId)
  },
}))
