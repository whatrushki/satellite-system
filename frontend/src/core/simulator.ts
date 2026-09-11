import { Scenario, SimulationResult, ClientSummary, CriticalSatellite, SnapshotData } from './types'
import { computeSnapshot } from './geometryEngine'
import { findRoute } from './router'
import { classifyFailureReason } from './diagnostics'

export function runClientSimulation(scenario: Scenario): SimulationResult {
  const env = scenario.environment
  const horizon = env.horizon_s
  const step = env.step_s
  const steps: number[] = []
  for (let t = 0; t < horizon; t += step) {
    steps.push(t)
  }
  const totalSteps = steps.length

  const gateways = new Set<string>()
  for (const g of scenario.ground_sites) {
    if (g.role === 'gateway') {
      gateways.add(g.id)
    }
  }

  const clients = scenario.ground_sites.filter((g) => g.role === 'client')

  const clientResults = new Map<
    string,
    {
      client: typeof clients[0]
      pathCount: number
      visibleCount: number
      maxGapSteps: number
      curGapSteps: number
      totalHops: number
      timeline: SimulationResult['clients'][0]['timeline']
    }
  >()

  for (const c of clients) {
    clientResults.set(c.id, {
      client: c,
      pathCount: 0,
      visibleCount: 0,
      maxGapSteps: 0,
      curGapSteps: 0,
      totalHops: 0,
      timeline: [],
    })
  }

  const satTransitCount = new Map<string, number>()
  const snapshots: SnapshotData[] = []

  for (const t of steps) {
    const snap = computeSnapshot(scenario, t)
    snapshots.push(snap)

    const activeSatIds = new Set<string>()
    for (const sat of snap.satellites) {
      if (sat.active) activeSatIds.add(sat.id)
    }

    for (const c of clients) {
      const res = clientResults.get(c.id)!
      const cElev = snap.elevation_deg[c.id] || {}

      let isVisible = false
      let visibleCount = 0
      for (const sid of Object.keys(cElev)) {
        if (activeSatIds.has(sid) && cElev[sid] >= env.min_elevation_deg) {
          isVisible = true
          visibleCount++
        }
      }
      if (isVisible) {
        res.visibleCount++
      }

      const route = findRoute(snap, scenario, c.id, gateways)

      if (route && route.path.length > 0) {
        res.pathCount++
        res.maxGapSteps = Math.max(res.maxGapSteps, res.curGapSteps)
        res.curGapSteps = 0
        res.totalHops += route.hops

        res.timeline.push({
          t_s: t,
          status: 'connected',
          reason: 'NONE',
          path: route.path,
          hops: route.hops,
          distance_km: Math.round(route.distance_km * 10) / 10,
          visible_sats_count: visibleCount,
        })

        // Track transit satellite usage
        for (let idx = 1; idx < route.path.length - 1; idx++) {
          const satId = route.path[idx]
          satTransitCount.set(satId, (satTransitCount.get(satId) || 0) + 1)
        }
      } else {
        res.curGapSteps++
        const reason = classifyFailureReason(scenario, snap, c.id, gateways, activeSatIds)

        res.timeline.push({
          t_s: t,
          status: isVisible ? 'visible_no_route' : 'no_satellite',
          reason,
          path: [],
          hops: 0,
          distance_km: 0,
          visible_sats_count: visibleCount,
        })
      }
    }
  }

  const clientSummaries: ClientSummary[] = []
  for (const c of clients) {
    const res = clientResults.get(c.id)!
    res.maxGapSteps = Math.max(res.maxGapSteps, res.curGapSteps)

    const availPct = (res.pathCount / totalSteps) * 100
    const visPct = (res.visibleCount / totalSteps) * 100
    const maxGapSec = res.maxGapSteps * step
    const avgHops = res.pathCount > 0 ? res.totalHops / res.pathCount : 0

    clientSummaries.push({
      client_id: c.id,
      name: c.name || c.id,
      lat_deg: c.lat_deg,
      lon_deg: c.lon_deg,
      path_availability_pct: Math.round(availPct * 100) / 100,
      target_met: availPct >= env.target_availability * 100,
      visibility_pct: Math.round(visPct * 100) / 100,
      max_gap_seconds: maxGapSec,
      max_gap_minutes: Math.round((maxGapSec / 60) * 10) / 10,
      average_hops: Math.round(avgHops * 100) / 100,
      timeline: res.timeline,
    })
  }

  const criticalSatellites: CriticalSatellite[] = Array.from(satTransitCount.entries())
    .map(([id, count]) => ({ id, routes_carried: count }))
    .sort((a, b) => b.routes_carried - a.routes_carried)
    .slice(0, 10)

  return {
    total_steps: totalSteps,
    horizon_s: horizon,
    step_s: step,
    clients: clientSummaries,
    critical_satellites: criticalSatellites,
    snapshots,
    effective_scenario: scenario,
  }
}
