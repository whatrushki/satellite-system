import { Scenario } from './types'
import { R, SatPosition, groundPosition } from './geometryEngine'

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
  // Clients currently inside at least one active satellite footprint
  coveredClients: Record<string, { inFootprint: boolean; nearestSatId?: string; elevationDeg: number }>
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
 * Computes real-time coverage statistics across the globe and high-latitude Arctic zone.
 */
export function computeRealtimeCoverage(
  scenario: Scenario,
  satPositions: SatPosition[],
  minElevationDeg: number = 25.0
): CoverageMetrics {
  const altitudeKm = scenario.environment.altitude_km || 550.0
  const { alphaRad, alphaDeg, radiusKm, areaMkm2 } = computeFootprintAlpha(
    altitudeKm,
    minElevationDeg
  )

  const activeSats = satPositions.filter((s) => s.active)
  const totalActiveSats = activeSats.length

  // Pre-normalize active satellite directions in ECEF unit vectors
  const satNormals: Array<{ id: string; nx: number; ny: number; nz: number; isArctic: boolean }> = []
  let activeSatsInArctic = 0

  for (const s of activeSats) {
    const len = Math.hypot(s.x_km, s.y_km, s.z_km)
    if (len === 0) continue
    const nx = s.x_km / len
    const ny = s.y_km / len
    const nz = s.z_km / len

    // Check latitude of satellite nadir
    const latDeg = (Math.asin(Math.max(-1, Math.min(1, nz))) * 180) / Math.PI
    const isArctic = latDeg >= 60.0
    if (isArctic) {
      activeSatsInArctic++
    }

    satNormals.push({ id: s.id, nx, ny, nz, isArctic })
  }

  // Threshold cosine for footprint: a point on sphere P is inside footprint if dot(P, SatNormal) >= cos(alpha)
  const cosAlpha = Math.cos(alphaRad)

  let coveredGlobalCount = 0
  let coveredArcticCount = 0

  for (let i = 0; i < FIBONACCI_SAMPLE_COUNT; i++) {
    const pt = SPHERE_SAMPLES[i]
    // In SPHERE_SAMPLES, Y is North Pole. But in ECEF, Z is North Pole.
    // Map sample (x, y, z) -> ECEF unit (x, z, y) where z is polar axis
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

  // Total Earth area: 4 * pi * R^2 = ~510.06 million km^2
  const TOTAL_EARTH_MKM2 = (4 * Math.PI * R * R) / 1e6
  const totalCoveredAreaMkm2 = globalCoverageRatio * TOTAL_EARTH_MKM2

  // Check client visibility
  const coveredClients: CoverageMetrics['coveredClients'] = {}
  for (const g of scenario.ground_sites) {
    const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)
    const glen = R
    const gnx = gx / glen
    const gny = gy / glen
    const gnz = gz / glen

    let bestDot = -1
    let nearestSatId: string | undefined
    let maxElevation = -90

    for (const sat of satNormals) {
      const dot = gnx * sat.nx + gny * sat.ny + gnz * sat.nz
      if (dot > bestDot) {
        bestDot = dot
        nearestSatId = sat.id
      }
    }

    // Convert dot product between ground station normal and satellite nadir to elevation angle
    // Elevation: el = arcsin((r * dot - R) / dl)
    if (bestDot > 0) {
      const r_sat = R + altitudeKm
      const dl = Math.sqrt(Math.max(0.1, r_sat * r_sat + R * R - 2 * r_sat * R * bestDot))
      const sinEl = Math.max(-1, Math.min(1, (r_sat * bestDot - R) / dl))
      maxElevation = (Math.asin(sinEl) * 180) / Math.PI
    }

    coveredClients[g.id] = {
      inFootprint: bestDot >= cosAlpha,
      nearestSatId,
      elevationDeg: Math.round(maxElevation * 10) / 10,
    }
  }

  return {
    totalCoveredAreaMkm2: Math.round(totalCoveredAreaMkm2 * 10) / 10,
    globalCoveragePct: Math.round(globalCoverageRatio * 1000) / 10,
    arcticCoveragePct: Math.round(arcticCoverageRatio * 1000) / 10,
    singleFootprintAreaMkm2: Math.round(areaMkm2 * 100) / 100,
    footprintRadiusKm: Math.round(radiusKm),
    alphaRad,
    alphaDeg: Math.round(alphaDeg * 10) / 10,
    activeSatsInArctic,
    totalActiveSats,
    coveredClients,
  }
}
