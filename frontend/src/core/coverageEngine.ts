import { Scenario } from './types'
import { R, SatPosition, groundPosition } from './geometryEngine'

export interface ClientCoverageState {
  inFootprint10: boolean
  inFootprint25: boolean
  elevationDeg: number
  nearestSatId?: string
  servingSatId?: string
  linkQuality: 'optimal' | 'good' | 'horizon' | 'none'
  isDirectSingleHop: boolean // Can single satellite see both client and gateway directly?
}

export interface CoverageMetrics {
  // Total Earth surface covered by active satellites [million km^2]
  totalCoveredAreaMkm2: number
  // Percentage of Earth surface covered (0 - 100%)
  globalCoveragePct: number
  // Percentage of Arctic region (>= 65°N) covered (0 - 100%)
  arcticCoveragePct: number
  // Single satellite footprint area [million km^2]
  singleFootprintAreaMkm2: number
  // Single satellite footprint ground radius [km]
  footprintRadiusKm: number
  // Footprint Earth central half-angle [radians and degrees]
  alphaRad: number
  alphaDeg: number
  // Active satellites count in view of Arctic (lat >= 60°N)
  activeSatsInArctic: number
  // Number of active satellites producing coverage
  totalActiveSats: number
  // Multi-tier radii for display
  tier10: { radiusKm: number; alphaDeg: number; alphaRad: number; areaMkm2: number }
  tier25: { radiusKm: number; alphaDeg: number; alphaRad: number; areaMkm2: number }
  tier55: { radiusKm: number; alphaDeg: number; alphaRad: number; areaMkm2: number }
  // Detailed status for each ground client
  coveredClients: Record<string, ClientCoverageState>
  // Whether current active route uses single-hop or multi-hop ISL
  activeRouteHopType: 'direct_single_hop' | 'isl_multi_hop' | 'disconnected'
}

// Pre-computed quasi-uniform spherical Fibonacci points for instant, O(N) area integration
const FIBONACCI_SAMPLE_COUNT = 500
interface SphericalPoint {
  x: number
  y: number
  z: number
  isArctic: boolean // lat >= 65°N
}

const SPHERE_SAMPLES: SphericalPoint[] = (() => {
  const pts: SphericalPoint[] = []
  const phi = (1 + Math.sqrt(5)) / 2 // Golden ratio
  for (let i = 0; i < FIBONACCI_SAMPLE_COUNT; i++) {
    const y = 1 - (i / (FIBONACCI_SAMPLE_COUNT - 1)) * 2 // from 1 down to -1
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = (2 * Math.PI * i) / phi

    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius

    // y is sin(latitude) in unit sphere where Y is North Pole
    const latDeg = (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI
    pts.push({
      x,
      y,
      z,
      isArctic: latDeg >= 65.0,
    })
  }
  return pts
})()

const TOTAL_ARCTIC_SAMPLES = SPHERE_SAMPLES.filter((p) => p.isArctic).length

/**
 * Computes the exact elevation angle [degrees] between ground station and satellite.
 */
export function computeElevationDeg(
  gx: number, gy: number, gz: number,
  sx: number, sy: number, sz: number,
  rEarth: number = R
): number {
  const dx = sx - gx
  const dy = sy - gy
  const dz = sz - gz
  const dl = Math.hypot(dx, dy, dz)
  if (dl < 0.001) return 90

  const gLen = Math.hypot(gx, gy, gz) || rEarth
  const gnx = gx / gLen
  const gny = gy / gLen
  const gnz = gz / gLen

  const dot = dx * gnx + dy * gny + dz * gnz
  const sinEl = Math.max(-1, Math.min(1, dot / dl))
  return (Math.asin(sinEl) * 180) / Math.PI
}

/**
 * Computes Earth central half-angle alpha for a satellite at altitude h and minimum elevation angle theta_min.
 * alpha = pi/2 - theta_min - beta, where sin(beta) = (R / (R + h)) * cos(theta_min)
 */
export function computeFootprintAlpha(altitudeKm: number, minElevationDeg: number): {
  alphaRad: number
  alphaDeg: number
  radiusKm: number
  areaMkm2: number
} {
  const r = R + altitudeKm
  const elRad = (minElevationDeg * Math.PI) / 180
  const ratio = (R / r) * Math.cos(elRad)
  const clampedRatio = Math.max(-1, Math.min(1, ratio))
  const betaRad = Math.asin(clampedRatio)
  const alphaRad = Math.max(0, Math.PI / 2 - elRad - betaRad)
  const alphaDeg = (alphaRad * 180) / Math.PI
  const radiusKm = R * alphaRad

  // Spherical cap area: A = 2 * pi * R^2 * (1 - cos(alpha))
  const capAreaKm2 = 2 * Math.PI * R * R * (1 - Math.cos(alphaRad))
  const areaMkm2 = capAreaKm2 / 1e6

  return {
    alphaRad,
    alphaDeg,
    radiusKm,
    areaMkm2,
  }
}

/**
 * Computes real-time coverage statistics across the globe and high-latitude Arctic zone,
 * evaluating multi-tier elevations (10°, 25°, 55°) and physical link angles.
 */
export function computeRealtimeCoverage(
  scenario: Scenario,
  satPositions: SatPosition[],
  minElevationDeg?: number,
  activeRoutePath: string[] = []
): CoverageMetrics {
  const altitudeKm = scenario.environment.altitude_km || 550.0
  const primaryElDeg = minElevationDeg ?? scenario.environment.min_elevation_deg ?? 10.0

  const tier10 = computeFootprintAlpha(altitudeKm, 10.0)
  const tier25 = computeFootprintAlpha(altitudeKm, 25.0)
  const tier55 = computeFootprintAlpha(altitudeKm, 55.0)

  const primaryTier = computeFootprintAlpha(altitudeKm, primaryElDeg)

  const activeSats = satPositions.filter((s) => s.active)
  const totalActiveSats = activeSats.length

  // Pre-normalize active satellite directions in ECEF unit vectors
  const satNormals: Array<{
    id: string
    nx: number
    ny: number
    nz: number
    x_km: number
    y_km: number
    z_km: number
    isArctic: boolean
  }> = []
  let activeSatsInArctic = 0

  for (const s of activeSats) {
    const len = Math.hypot(s.x_km, s.y_km, s.z_km)
    if (len === 0) continue
    const nx = s.x_km / len
    const ny = s.y_km / len
    const nz = s.z_km / len

    const latDeg = (Math.asin(Math.max(-1, Math.min(1, nz))) * 180) / Math.PI
    const isArctic = latDeg >= 60.0
    if (isArctic) {
      activeSatsInArctic++
    }

    satNormals.push({
      id: s.id,
      nx,
      ny,
      nz,
      x_km: s.x_km,
      y_km: s.y_km,
      z_km: s.z_km,
      isArctic,
    })
  }

  // Threshold cosine for primary footprint
  const cosAlpha = Math.cos(primaryTier.alphaRad)

  let coveredGlobalCount = 0
  let coveredArcticCount = 0

  for (let i = 0; i < FIBONACCI_SAMPLE_COUNT; i++) {
    const pt = SPHERE_SAMPLES[i]
    const px = pt.x
    const py = pt.z
    const pz = pt.y

    let isCovered = false
    for (let j = 0; j < satNormals.length; j++) {
      const sat = satNormals[j]
      const dot = px * sat.nx + py * sat.ny + pz * sat.nz
      if (dot >= cosAlpha) {
        isCovered = true
        break
      }
    }

    if (isCovered) {
      coveredGlobalCount++
      if (pt.isArctic) {
        coveredArcticCount++
      }
    }
  }

  const globalCoverageRatio = FIBONACCI_SAMPLE_COUNT > 0 ? coveredGlobalCount / FIBONACCI_SAMPLE_COUNT : 0
  const arcticCoverageRatio = TOTAL_ARCTIC_SAMPLES > 0 ? coveredArcticCount / TOTAL_ARCTIC_SAMPLES : 0

  const TOTAL_EARTH_MKM2 = (4 * Math.PI * R * R) / 1e6
  const totalCoveredAreaMkm2 = globalCoverageRatio * TOTAL_EARTH_MKM2

  // Gateway positions for single-hop relay checks
  const gateways = scenario.ground_sites.filter((g) => g.role === 'gateway')

  // Check client visibility and link quality
  const coveredClients: Record<string, ClientCoverageState> = {}

  for (const g of scenario.ground_sites) {
    const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)

    let maxEl = -90
    let nearestSatId: string | undefined

    for (const sat of satNormals) {
      const el = computeElevationDeg(gx, gy, gz, sat.x_km, sat.y_km, sat.z_km)
      if (el > maxEl) {
        maxEl = el
        nearestSatId = sat.id
      }
    }

    // Check if there is a serving sat in active route for this client
    let servingSatId: string | undefined
    if (activeRoutePath.length >= 3 && activeRoutePath[0] === g.id) {
      servingSatId = activeRoutePath[1]
    }

    // Single-hop direct relay check: does any single active satellite see both this client AND a gateway?
    let isDirectSingleHop = false
    if (g.role === 'client') {
      for (const sat of satNormals) {
        const clientEl = computeElevationDeg(gx, gy, gz, sat.x_km, sat.y_km, sat.z_km)
        if (clientEl >= (scenario.environment.min_elevation_deg || 10.0)) {
          for (const gw of gateways) {
            const [gwx, gwy, gwz] = groundPosition(gw.lat_deg, gw.lon_deg)
            const gwEl = computeElevationDeg(gwx, gwy, gwz, sat.x_km, sat.y_km, sat.z_km)
            if (gwEl >= (scenario.environment.min_elevation_deg || 10.0)) {
              isDirectSingleHop = true
              break
            }
          }
        }
        if (isDirectSingleHop) break
      }
    }

    const inFootprint10 = maxEl >= 10.0
    const inFootprint25 = maxEl >= 25.0

    let linkQuality: ClientCoverageState['linkQuality'] = 'none'
    if (maxEl >= 50.0) linkQuality = 'optimal'
    else if (maxEl >= 25.0) linkQuality = 'good'
    else if (maxEl >= 10.0) linkQuality = 'horizon'

    coveredClients[g.id] = {
      inFootprint10,
      inFootprint25,
      elevationDeg: Math.round(maxEl * 10) / 10,
      nearestSatId,
      servingSatId,
      linkQuality,
      isDirectSingleHop,
    }
  }

  let activeRouteHopType: CoverageMetrics['activeRouteHopType'] = 'disconnected'
  if (activeRoutePath.length === 3) {
    // Client -> Sat -> Gateway (Single-hop relay through one satellite!)
    activeRouteHopType = 'direct_single_hop'
  } else if (activeRoutePath.length > 3) {
    // Client -> Sat1 -> ... -> SatN -> Gateway (Multi-hop transit via ISL laser grid)
    activeRouteHopType = 'isl_multi_hop'
  }

  return {
    totalCoveredAreaMkm2: Math.round(totalCoveredAreaMkm2 * 10) / 10,
    globalCoveragePct: Math.round(globalCoverageRatio * 1000) / 10,
    arcticCoveragePct: Math.round(arcticCoverageRatio * 1000) / 10,
    singleFootprintAreaMkm2: Math.round(primaryTier.areaMkm2 * 100) / 100,
    footprintRadiusKm: Math.round(primaryTier.radiusKm),
    alphaRad: primaryTier.alphaRad,
    alphaDeg: Math.round(primaryTier.alphaDeg * 10) / 10,
    activeSatsInArctic,
    totalActiveSats,
    tier10,
    tier25,
    tier55,
    coveredClients,
    activeRouteHopType,
  }
}
