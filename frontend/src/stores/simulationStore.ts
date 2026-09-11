import { create } from 'zustand'
import { SimulationResult, SnapshotData } from '../core/types'
import { runClientSimulation } from '../core/simulator'
import { useScenarioStore } from './scenarioStore'

interface SimulationState {
  currentTime_s: number
  isPlaying: boolean
  playbackSpeed: number
  selectedClientId: string
  selectedSatelliteId: string | null
  viewMode: '2d' | '3d'
  activeTab: 'dashboard' | 'compare' | 'recommendations'
  simulationResult: SimulationResult | null
  isCalculating: boolean

  setTime: (t: number) => void
  stepTime: (delta: number) => void
  togglePlay: () => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setSelectedClient: (id: string) => void
  setSelectedSatellite: (id: string | null) => void
  setViewMode: (mode: '2d' | '3d') => void
  setActiveTab: (tab: 'dashboard' | 'compare' | 'recommendations') => void
  recalculate: () => void
  getCurrentSnapshot: () => SnapshotData | null
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentTime_s: 0,
  isPlaying: false,
  playbackSpeed: 60,
  selectedClientId: 'C65',
  selectedSatelliteId: null,
  viewMode: '3d',
  activeTab: 'dashboard',
  simulationResult: null,
  isCalculating: false,

  setTime: (t: number) => {
    const res = get().simulationResult
    if (!res) {
      set({ currentTime_s: t })
      return
    }
    const maxT = res.horizon_s - res.step_s
    const clamped = Math.max(0, Math.min(maxT, t))
    set({ currentTime_s: clamped })
  },

  stepTime: (delta: number) => {
    const res = get().simulationResult
    const step = res?.step_s || 120
    get().setTime(get().currentTime_s + delta * step)
  },

  togglePlay: () => {
    set({ isPlaying: !get().isPlaying })
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing })
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed })
  },

  setSelectedClient: (id: string) => {
    set({ selectedClientId: id })
  },

  setSelectedSatellite: (id: string | null) => {
    set({ selectedSatelliteId: id })
  },

  setViewMode: (mode: '2d' | '3d') => {
    set({ viewMode: mode })
  },

  setActiveTab: (tab: 'dashboard' | 'compare' | 'recommendations') => {
    set({ activeTab: tab })
  },

  recalculate: () => {
    const scenario = useScenarioStore.getState().activeScenario
    if (!scenario) return

    set({ isCalculating: true })
    // Run simulation synchronously or in microtask
    try {
      const result = runClientSimulation(scenario)
      set({ simulationResult: result, isCalculating: false })
    } catch (e) {
      console.error('Simulation error:', e)
      set({ isCalculating: false })
    }
  },

  getCurrentSnapshot: () => {
    const { simulationResult, currentTime_s } = get()
    if (!simulationResult || !simulationResult.snapshots.length) return null

    const step = simulationResult.step_s
    const idx = Math.floor(currentTime_s / step)
    const clampedIdx = Math.max(0, Math.min(simulationResult.snapshots.length - 1, idx))
    return simulationResult.snapshots[clampedIdx]
  },
}))
