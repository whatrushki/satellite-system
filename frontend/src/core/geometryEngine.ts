import { Scenario, SnapshotData, SatelliteSnapshot } from './types'

export const R = 6371.0
export const MU = 398600.435507
export const OMEGA = (2 * Math.PI) / 86164.09054

export interface SatPosition {
  id: string
  plane_id: string
  active: boolean
  // ECEF coordinates [km]
  x_km: number
  y_km: number
  z_km: number
}

export function computePositions(s: Scenario, t_s: number): SatPosition[] {
  const e = s.environment
  const d = s.design

  const pmap = new Map<string, { raan_deg: number; phase_deg: number }>()
  for (const p of d.planes) {
    pmap.set(p.id, p)
  }

  const r = R + e.altitude_km
  const n = Math.sqrt(MU / (r * r * r))
  const inc = (e.inclination_deg * Math.PI) / 180

  const th = (e.earth_angle0_deg * Math.PI) / 180 + OMEGA * t_s
  const c_th = Math.cos(th)
  const s_th = Math.sin(th)

  const failedSats = new Set<string>()
  for (const f of s.failures || []) {
    if (f.start_s <= t_s && t_s < f.end_s) {
      failedSats.add(f.satellite_id)
    }
  }

  const results: SatPosition[] = []

  for (const sat of d.satellites) {
    const plane = pmap.get(sat.plane_id)
    if (!plane) continue

    const active = sat.launch_batch <= d.launch_stage && !failedSats.has(sat.id)

    const u = ((sat.slot_deg + plane.phase_deg) * Math.PI) / 180 + n * t_s
    const om = (plane.raan_deg * Math.PI) / 180

    const cu = Math.cos(u)
    const su = Math.sin(u)
    const co = Math.cos(om)
    const so = Math.sin(om)
    const cos_inc = Math.cos(inc)
    const sin_inc = Math.sin(inc)

    const x_eci = r * (co * cu - so * su * cos_inc)
    const y_eci = r * (so * cu + co * su * cos_inc)
    const z_eci = r * su * sin_inc

    // Earth-fixed ECEF rotation
    const x_ecef = c_th * x_eci + s_th * y_eci
    const y_ecef = -s_th * x_eci + c_th * y_eci
    const z_ecef = z_eci

    results.push({
      id: sat.id,
      plane_id: sat.plane_id,
      active,
      x_km: x_ecef,
      y_km: y_ecef,
      z_km: z_ecef,
    })
  }

  return results
}

export function groundPosition(lat_deg: number, lon_deg: number): [number, number, number] {
  const lat = (lat_deg * Math.PI) / 180
  const lon = (lon_deg * Math.PI) / 180
  return [
    R * Math.cos(lat) * Math.cos(lon),
    R * Math.cos(lat) * Math.sin(lon),
    R * Math.sin(lat),
  ]
}

export function computeSnapshot(s: Scenario, t_s: number): SnapshotData {
  const e = s.environment
  const sats = computePositions(s, t_s)
  const numSats = sats.length

  const edges: [string, string, number][] = []

  // 1. Inter-Satellite Links (ISL) between active satellites
  for (let i = 0; i < numSats; i++) {
    const satI = sats[i]
    if (!satI.active) continue

    for (let j = i + 1; j < numSats; j++) {
      const satJ = sats[j]
      if (!satJ.active) continue

      const dx = satJ.x_km - satI.x_km
      const dy = satJ.y_km - satI.y_km
      const dz = satJ.z_km - satI.z_km
      const dist = Math.hypot(dx, dy, dz)

      if (dist < e.isl_range_km) {
        const denom = dx * dx + dy * dy + dz * dz
        const dot = satI.x_km * dx + satI.y_km * dy + satI.z_km * dz
        const lam = Math.max(0, Math.min(1, -dot / Math.max(denom, 1e-12)))

        const cx = satI.x_km + lam * dx
        const cy = satI.y_km + lam * dy
        const cz = satI.z_km + lam * dz
        const closestDist = Math.hypot(cx, cy, cz)

        if (closestDist > R) {
          edges.push([satI.id, satJ.id, dist])
        }
      }
    }
  }

  // 2. Ground site contacts & elevations
  const elevations: Record<string, Record<string, number>> = {}

  for (const g of s.ground_sites) {
    const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)
    const gpNormX = gx / R
    const gpNormY = gy / R
    const gpNormZ = gz / R

    elevations[g.id] = {}

    const isGatewayOffline =
      g.role === 'gateway' &&
      (s.gateway_outages || []).some(
        (f) => f.gateway_id === g.id && f.start_s <= t_s && t_s < f.end_s
      )

    for (let k = 0; k < numSats; k++) {
      const sat = sats[k]
      if (!sat.active) continue

      const difX = sat.x_km - gx
      const difY = sat.y_km - gy
      const difZ = sat.z_km - gz
      const dl = Math.hypot(difX, difY, difZ)

      const dot = difX * gpNormX + difY * gpNormY + difZ * gpNormZ
      const ratio = Math.max(-1, Math.min(1, dot / dl))
      const el = (Math.asin(ratio) * 180) / Math.PI

      elevations[g.id][sat.id] = el

      if (el >= e.min_elevation_deg && !isGatewayOffline) {
        edges.push([g.id, sat.id, dl])
      }
    }
  }

  const satSnapshots: SatelliteSnapshot[] = sats.map((sat) => ({
    id: sat.id,
    x_km: sat.x_km,
    y_km: sat.y_km,
    z_km: sat.z_km,
    active: sat.active,
    plane_id: sat.plane_id,
  }))

  return {
    t_s,
    satellites: satSnapshots,
    edges,
    elevation_deg: elevations,
  }
}
