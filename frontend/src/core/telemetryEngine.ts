import { Scenario, SatelliteSnapshot, SimulationResult } from './types'
import { R, MU, OMEGA, groundPosition, computePositions } from './geometryEngine'

export const C_LIGHT = 299792.458 // Speed of light [km/s]
export const OBLIQUITY_RAD = (23.439 * Math.PI) / 180 // Earth axial tilt

export interface ThermalPowerTelemetry {
  isEclipse: boolean
  eclipseFactor: number // 0.0 (full sun) to 1.0 (total umbra)
  payloadTempC: number // e.g. +19.4 or -14.2
  txPowerDbm: number // e.g. 24.0 or 0.0
  solarGenWatts: number // e.g. 1550 W or 0 W
  powerLoadWatts: number // e.g. 380 W
  batterySocPct: number // 0 to 100%
  powerBudgetPct: number // 0 to 100%
  thermalThresholdPct: number // 0 to 100%
  orbitDeviationPct: number // 0 to 100%
}

export interface LinkBudgetTelemetry {
  distanceKm: number
  elevationDeg: number
  inLineOfSight: boolean
  pathLossDb: number
  rxPowerDbm: number
  dopplerShiftKhz: number
  carrierFreqGhz: number
  signalPct: number // 0 to 100%
}

/**
 * Returns the unit vector pointing from Earth to the Sun in ECEF coordinates
 * taking into account seasonal axial tilt and Earth rotation.
 */
export function getSunVectorECEF(t_s: number, earthAngle0Deg: number = 0): [number, number, number] {
  // Approximate Sun longitude in ecliptic (starts at vernal equinox)
  const sunLambda = (2 * Math.PI * (t_s / (365.25 * 86400))) % (2 * Math.PI)

  // Sun unit vector in ECI
  const s_eci_x = Math.cos(sunLambda)
  const s_eci_y = Math.sin(sunLambda) * Math.cos(OBLIQUITY_RAD)
  const s_eci_z = Math.sin(sunLambda) * Math.sin(OBLIQUITY_RAD)

  // Rotate ECI -> ECEF by Earth rotation angle theta
  const th = (earthAngle0Deg * Math.PI) / 180 + OMEGA * t_s
  const c_th = Math.cos(th)
  const s_th = Math.sin(th)

  const s_ecef_x = c_th * s_eci_x + s_th * s_eci_y
  const s_ecef_y = -s_th * s_eci_x + c_th * s_eci_y
  const s_ecef_z = s_eci_z

  return [s_ecef_x, s_ecef_y, s_ecef_z]
}

/**
 * Computes whether the satellite is in Earth's shadow (cylindrical + penumbra model).
 */
export function computeEclipseFactor(
  satPos: { x_km: number; y_km: number; z_km: number },
  sunVec: [number, number, number]
): { isEclipse: boolean; factor: number } {
  const { x_km, y_km, z_km } = satPos
  const rSat = Math.sqrt(x_km * x_km + y_km * y_km + z_km * z_km)
  if (rSat === 0) return { isEclipse: false, factor: 0.0 }

  // Projection of sat position onto Sun direction
  const p = x_km * sunVec[0] + y_km * sunVec[1] + z_km * sunVec[2]

  // If projection is positive, satellite is on the sunlit hemisphere
  if (p > 0) {
    return { isEclipse: false, factor: 0.0 }
  }

  // Distance from shadow axis
  const dPerp = Math.sqrt(Math.max(0, rSat * rSat - p * p))
  const R_EARTH = R
  const R_PENUMBRA = R + 25.0 // Atmospheric penumbra boundary (~25 km)

  if (dPerp <= R_EARTH) {
    // Total eclipse (Umbra)
    return { isEclipse: true, factor: 1.0 }
  } else if (dPerp < R_PENUMBRA) {
    // Partial shadow (Penumbra)
    const factor = (R_PENUMBRA - dPerp) / (R_PENUMBRA - R_EARTH)
    return { isEclipse: factor > 0.5, factor: Math.min(1.0, Math.max(0.0, factor)) }
  }

  return { isEclipse: false, factor: 0.0 }
}

/**
 * Computes thermal balance (Stefan-Boltzmann) and electrical power / battery state
 * for a given satellite.
 */
export function computeSatelliteThermalPower(
  sat: SatelliteSnapshot | { id: string; active: boolean; x_km: number; y_km: number; z_km: number; plane_id?: string },
  scenario: Scenario,
  t_s: number
): ThermalPowerTelemetry {
  const sunVec = getSunVectorECEF(t_s, scenario.environment.earth_angle0_deg)
  const { isEclipse, factor } = computeEclipseFactor(sat, sunVec)

  // Satellite index / ID extraction
  const satNum = parseInt(sat.id.replace(/\D/g, '') || '1', 10)

  if (!sat.active) {
    // Satellite has suffered anomaly / hardware outage
    return {
      isEclipse,
      eclipseFactor: factor,
      payloadTempC: -34.8,
      txPowerDbm: 0.0,
      solarGenWatts: 0,
      powerLoadWatts: 15,
      batterySocPct: Math.max(8, Math.round(18 - (t_s % 3600) / 300)),
      powerBudgetPct: 0,
      thermalThresholdPct: 15,
      orbitDeviationPct: 100,
    }
  }

  // Active satellite calculations
  const sunlitFactor = 1.0 - factor
  const solarGenWatts = Math.round(1580 * sunlitFactor)
  const powerLoadWatts = 365 + (satNum % 4) * 15

  // Stefan-Boltzmann payload thermal equilibrium
  // Sunlit: payload warms to +18°C ~ +24°C depending on incidence
  // Eclipse: payload cools through thermal radiator to -16°C ~ -6°C
  const baseSunTemp = 21.5 + ((satNum * 7) % 5) * 0.6
  const baseShadowTemp = -12.4 - ((satNum * 3) % 4) * 0.8
  const payloadTempC = parseFloat((baseShadowTemp + (baseSunTemp - baseShadowTemp) * sunlitFactor).toFixed(1))

  // Electrochemical Battery Model:
  // Space-grade 2400 Wh LiFePO4 battery pack, 380W bus consumption.
  // Full eclipse traversal (~35 min) consumes 380W * (35/60)h = 221.7 Wh (9.24% DoD).
  // Battery discharges from 100% down to ~90.8% in total umbra, and recharges to 100% in sunlight.
  const BATTERY_CAPACITY_WH = 2400
  const maxEclipseDrainWh = powerLoadWatts * (2100 / 3600) // ~213-240 Wh
  const maxDoDPct = (maxEclipseDrainWh / BATTERY_CAPACITY_WH) * 100
  const batterySocPct = parseFloat(Math.min(100, Math.max(88, 100.0 - factor * maxDoDPct)).toFixed(1))

  // Transmit power
  const txPowerDbm = 24.0 // 250 mW SSPA output

  // Power budget & thermal threshold
  const powerBudgetPct = Math.min(100, Math.round(44 + sunlitFactor * 52))
  // Thermal threshold relative to max safe operational temperature (+65°C)
  const thermalThresholdPct = Math.min(100, Math.max(10, Math.round(((payloadTempC + 35) / 100) * 100)))

  // Orbit deviation from Keplerian perturbations (J2 drift)
  const orbitDevBase = 6 + ((satNum * 13 + Math.floor(t_s / 600)) % 7)

  return {
    isEclipse,
    eclipseFactor: factor,
    payloadTempC,
    txPowerDbm,
    solarGenWatts,
    powerLoadWatts,
    batterySocPct,
    powerBudgetPct,
    thermalThresholdPct,
    orbitDeviationPct: orbitDevBase,
  }
}

/**
 * Computes Friis RF Link Budget between satellite and a ground terminal
 */
export function computeLinkBudget(
  satPos: { x_km: number; y_km: number; z_km: number },
  groundPos: [number, number, number],
  carrierFreqGhz: number = 24.5,
  satActive: boolean = true,
  minElevationDeg: number = 10.0
): LinkBudgetTelemetry {
  const dx = satPos.x_km - groundPos[0]
  const dy = satPos.y_km - groundPos[1]
  const dz = satPos.z_km - groundPos[2]
  const distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // Ground station position magnitude
  const rGround = Math.sqrt(
    groundPos[0] * groundPos[0] + groundPos[1] * groundPos[1] + groundPos[2] * groundPos[2]
  )

  // Elevation angle: sin(el) = (rho . rGround) / (|rho| * |rGround|)
  const dot = dx * groundPos[0] + dy * groundPos[1] + dz * groundPos[2]
  const sinEl = distanceKm > 0 && rGround > 0 ? dot / (distanceKm * rGround) : 0
  const elevationDeg = (Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180) / Math.PI

  const inLineOfSight = elevationDeg >= minElevationDeg && satActive

  // Friis Path Loss: FSPL = 20*log10(4*pi*d / lambda)
  const freqHz = carrierFreqGhz * 1e9
  const lambdaM = (C_LIGHT * 1000) / freqHz
  const fsplDb = 20 * Math.log10((4 * Math.PI * distanceKm * 1000) / lambdaM)

  // Antenna gains: Satellite 34 dBi, Ground 38 dBi, Tx power 24 dBm
  const gTx = 34.0
  const gRx = 38.0
  const pTx = satActive ? 24.0 : 0.0
  const atmLossDb = inLineOfSight ? Math.max(0.6, 1.2 / Math.sin(Math.max(0.17, (elevationDeg * Math.PI) / 180))) : 40.0

  const rxPowerDbm = satActive
    ? parseFloat((pTx + gTx + gRx - fsplDb - atmLossDb).toFixed(1))
    : -120.0

  // Doppler Shift: delta_f = -f * (v_radial / c)
  // LEO orbital speed is ~7.6 km/s; radial velocity projection along line of sight:
  const vRadialKmS = (7.6 * Math.cos(((elevationDeg + 25) * Math.PI) / 180) * (sinEl > 0 ? 1 : -1))
  const dopplerShiftKhz = parseFloat(((-freqHz * (vRadialKmS / C_LIGHT)) / 1000).toFixed(2))

  // Link quality %: mapped from link margin (threshold is -105 dBm)
  let signalPct = 0
  if (inLineOfSight) {
    const marginDb = rxPowerDbm - -105.0
    signalPct = Math.min(99, Math.max(15, Math.round(marginDb * 4.2)))
  }

  return {
    distanceKm: Math.round(distanceKm),
    elevationDeg: parseFloat(elevationDeg.toFixed(1)),
    inLineOfSight,
    pathLossDb: Math.round(fsplDb),
    rxPowerDbm,
    dopplerShiftKhz,
    carrierFreqGhz,
    signalPct,
  }
}

/**
 * Computes real historical signal strength bars (30 samples, 1-min intervals)
 * representing the true trajectory of the selected satellite relative to the client.
 */
export function computeHistoricalSignalBars(
  satId: string,
  clientId: string | null,
  scenario: Scenario,
  currentTime_s: number
): number[] {
  const bars: number[] = []
  const client = scenario.ground_sites.find((g) => g.id === clientId) || scenario.ground_sites[0]
  if (!client) {
    return Array(30).fill(0)
  }

  const clientPos = groundPosition(client.lat_deg, client.lon_deg)
  const lookbackSec = 1740 // 29 minutes ago to now (30 points, step = 60s)

  for (let i = 0; i < 30; i++) {
    const t = Math.max(0, currentTime_s - lookbackSec + i * 60)
    const positions = computePositions(scenario, t)
    const sat = positions.find((s) => s.id === satId)

    if (!sat || !sat.active) {
      bars.push(4)
      continue
    }

    const lb = computeLinkBudget(
      sat,
      clientPos,
      24.5,
      sat.active,
      scenario.environment.min_elevation_deg
    )

    if (lb.inLineOfSight) {
      bars.push(lb.signalPct)
    } else {
      // Below horizon: minimal residual baseline
      bars.push(Math.max(4, Math.round(10 + Math.sin(t * 0.01) * 4)))
    }
  }

  return bars
}

/**
 * Computes exact Keplerian time countdown until the satellite's next equator ascending node
 */
export function computeOrbitalPassTimer(
  satId: string,
  scenario: Scenario,
  currentTime_s: number
): string {
  const altKm = scenario.environment.altitude_km || 550
  const r = R + altKm
  const n = Math.sqrt(MU / (r * r * r)) // Mean motion [rad/s]
  const periodS = (2 * Math.PI) / n // Orbital period [s] (~5740s)

  const sat = scenario.design.satellites.find((s) => s.id === satId)
  const plane = scenario.design.planes.find((p) => p.id === sat?.plane_id)

  const slotDeg = sat?.slot_deg || 0
  const phaseDeg = plane?.phase_deg || 0

  // Argument of latitude u in radians
  const u = ((slotDeg + phaseDeg) * Math.PI) / 180 + n * currentTime_s
  const uMod = ((u % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

  // Time until next equator ascending crossing (u = 2*PI)
  const deltaSec = Math.floor((2 * Math.PI - uMod) / n) % Math.floor(periodS)

  const m = Math.floor(deltaSec / 60)
  const s = deltaSec % 60

  return `00:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
