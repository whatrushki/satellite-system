import { SnapshotData, Scenario, FailureReason } from './types'

export function classifyFailureReason(
  scenario: Scenario,
  snap: SnapshotData,
  clientId: string,
  gateways: Set<string>,
  activeSatIds: Set<string>
): FailureReason {
  const minEl = scenario.environment.min_elevation_deg
  const clientElevations = snap.elevation_deg[clientId] || {}

  // 1. Check if client has any visible active satellite
  let clientHasVis = false
  for (const sid of Object.keys(clientElevations)) {
    if (activeSatIds.has(sid) && clientElevations[sid] >= minEl) {
      clientHasVis = true
      break
    }
  }
  if (!clientHasVis) {
    return 'NO_VISIBLE_SATELLITE'
  }

  // 2. Check gateway outages
  const t_s = snap.t_s
  const offlineGateways = new Set<string>()
  for (const f of scenario.gateway_outages || []) {
    if (f.start_s <= t_s && t_s < f.end_s) {
      offlineGateways.add(f.gateway_id)
    }
  }

  const onlineGateways = new Set<string>()
  for (const gid of gateways) {
    if (!offlineGateways.has(gid)) {
      onlineGateways.add(gid)
    }
  }

  if (onlineGateways.size === 0) {
    return 'GATEWAY_OUTAGE'
  }

  // 3. Check if any online gateway has visible satellites
  let gatewayHasVis = false
  for (const gid of onlineGateways) {
    const gwElevations = snap.elevation_deg[gid] || {}
    for (const sid of Object.keys(gwElevations)) {
      if (activeSatIds.has(sid) && gwElevations[sid] >= minEl) {
        gatewayHasVis = true
        break
      }
    }
    if (gatewayHasVis) break
  }

  if (!gatewayHasVis) {
    return 'GATEWAY_NO_SATELLITE'
  }

  // 4. Client sees satellite and gateway sees satellite, but no end-to-end path exists
  return 'ISL_MESH_PARTITION'
}
