import { SnapshotData, Scenario } from './types'

export interface RouteResult {
  path: string[]
  hops: number
  distance_km: number
  latency_ms: number
}

const SPEED_OF_LIGHT_KM_S = 299792.458

export function findRoute(
  snap: SnapshotData,
  scenario: Scenario,
  clientId: string,
  targetGateways: Set<string>
): RouteResult | null {
  // Build adjacency list
  const adj = new Map<string, Array<[string, number]>>()

  for (const [u, v, d] of snap.edges) {
    let listU = adj.get(u)
    if (!listU) {
      listU = []
      adj.set(u, listU)
    }
    listU.push([v, d])

    let listV = adj.get(v)
    if (!listV) {
      listV = []
      adj.set(v, listV)
    }
    listV.push([u, d])
  }

  const groundRoles = new Map<string, 'client' | 'gateway'>()
  for (const g of scenario.ground_sites) {
    groundRoles.set(g.id, g.role)
  }

  // Priority queue / Dijkstra
  // State: [hops, distance, currentNode, path]
  interface QItem {
    hops: number
    dist: number
    node: string
    path: string[]
  }

  // Simple min-priority queue by (hops, dist)
  const queue: QItem[] = [{ hops: 0, dist: 0, node: clientId, path: [clientId] }]
  const visited = new Map<string, { hops: number; dist: number }>()

  let bestResult: RouteResult | null = null

  while (queue.length > 0) {
    // Pop minimum
    let minIdx = 0
    for (let i = 1; i < queue.length; i++) {
      if (
        queue[i].hops < queue[minIdx].hops ||
        (queue[i].hops === queue[minIdx].hops && queue[i].dist < queue[minIdx].dist)
      ) {
        minIdx = i
      }
    }
    const current = queue.splice(minIdx, 1)[0]

    const prevVisit = visited.get(current.node)
    if (
      prevVisit &&
      (prevVisit.hops < current.hops ||
        (prevVisit.hops === current.hops && prevVisit.dist <= current.dist))
    ) {
      continue
    }
    visited.set(current.node, { hops: current.hops, dist: current.dist })

    // Check if reached destination gateway
    if (current.node !== clientId && targetGateways.has(current.node)) {
      bestResult = {
        path: current.path,
        hops: current.hops,
        distance_km: current.dist,
        latency_ms: (current.dist / SPEED_OF_LIGHT_KM_S) * 1000,
      }
      break
    }

    // Ground nodes cannot relay traffic
    if (current.node !== clientId && groundRoles.has(current.node)) {
      continue
    }

    const neighbors = adj.get(current.node) || []
    for (const [nxt, d] of neighbors) {
      queue.push({
        hops: current.hops + 1,
        dist: current.dist + d,
        node: nxt,
        path: [...current.path, nxt],
      })
    }
  }

  return bestResult
}
