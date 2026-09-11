export interface EnvironmentConfig {
  altitude_km: number
  inclination_deg: number
  earth_angle0_deg: number
  horizon_s: number
  step_s: number
  min_elevation_deg: number
  isl_range_km: number
  target_availability: number
}

export interface PlaneConfig {
  id: string
  raan_deg: number
  phase_deg: number
}

export interface SatelliteConfig {
  id: string
  plane_id: string
  slot_deg: number
  launch_batch: number
}

export interface DesignConfig {
  launch_stage: number
  planes: PlaneConfig[]
  satellites: SatelliteConfig[]
}

export interface GroundSite {
  id: string
  name: string
  role: 'client' | 'gateway'
  lat_deg: number
  lon_deg: number
}

export interface FailureOutage {
  satellite_id: string
  start_s: number
  end_s: number
}

export interface GatewayOutage {
  gateway_id: string
  start_s: number
  end_s: number
}

export interface Scenario {
  schema_version: string
  meta: {
    id: string
    title: string
  }
  environment: EnvironmentConfig
  design: DesignConfig
  ground_sites: GroundSite[]
  failures: FailureOutage[]
  gateway_outages: GatewayOutage[]
}

export interface SatelliteSnapshot {
  id: string
  x_km: number
  y_km: number
  z_km: number
  active: boolean
  plane_id?: string
}

export interface SnapshotData {
  t_s: number
  satellites: SatelliteSnapshot[]
  edges: [string, string, number][]
  elevation_deg: Record<string, Record<string, number>>
}

export type FailureReason = 
  | 'NO_VISIBLE_SATELLITE'
  | 'ISL_MESH_PARTITION'
  | 'GATEWAY_NO_SATELLITE'
  | 'GATEWAY_OUTAGE'
  | 'NONE'

export interface ClientTimelineItem {
  t_s: number
  status: 'connected' | 'visible_no_route' | 'no_satellite' | 'gateway_outage'
  reason: FailureReason
  path: string[]
  hops: number
  distance_km: number
  visible_sats_count: number
}

export interface ClientSummary {
  client_id: string
  name: string
  lat_deg: number
  lon_deg: number
  path_availability_pct: number
  target_met: boolean
  visibility_pct: number
  max_gap_seconds: number
  max_gap_minutes: number
  average_hops: number
  timeline: ClientTimelineItem[]
}

export interface CriticalSatellite {
  id: string
  routes_carried: number
}

export interface SimulationResult {
  total_steps: number
  horizon_s: number
  step_s: number
  clients: ClientSummary[]
  critical_satellites: CriticalSatellite[]
  snapshots: SnapshotData[] // Cached for 60 FPS scrub!
  effective_scenario: Scenario
}

export interface ExportResultDoc {
  schema_version: 'cosmo-A-result-1.0'
  effective_scenario: Scenario
  routes: Array<{
    t_s: number
    client_id: string
    path: string[]
  }>
  analytics?: {
    target_availability: number
    clients_summary: Array<{
      client_id: string
      name: string
      path_availability_pct: number
      target_met: boolean
      visibility_pct: number
      max_gap_seconds: number
      max_gap_minutes: number
      average_hops: number
    }>
  }
}
