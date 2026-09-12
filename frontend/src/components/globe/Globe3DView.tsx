import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { groundPosition, computePositions, computeSnapshot } from '@/core/geometryEngine'
import { computeFootprintAlpha } from '@/core/coverageEngine'
import { findRoute } from '@/core/router'
import { AtmosphereGlowShader } from './AtmosphereShader'
import { createStarfield } from './Starfield'
import earthAtmosUrl from '@/assets/earth_atmos_2048.jpg'
import earthSpecularUrl from '@/assets/earth_specular_2048.jpg'
import earthNormalUrl from '@/assets/earth_normal_2048.jpg'
import earthCloudsUrl from '@/assets/earth_clouds_1024.png'

// Satellite geometries and materials

// Reusable Geometries & Materials for 3D Satellite Models
const satBusGeo = new THREE.BoxGeometry(0.14, 0.08, 0.09)
const satWingGeo = new THREE.BoxGeometry(0.24, 0.005, 0.09)
const satBoomGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8)
satBoomGeo.rotateZ(Math.PI / 2)
const satDishGeo = new THREE.ConeGeometry(0.05, 0.025, 14, 1, true)
satDishGeo.rotateX(Math.PI)
const satBeaconGeo = new THREE.SphereGeometry(0.04, 10, 10)

const satWingMat = new THREE.MeshPhongMaterial({
  color: 0x141f30,
  specular: 0x60a5fa,
  shininess: 90,
})
const satBoomMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
const satDishMat = new THREE.MeshPhongMaterial({
  color: 0xe2e8f0,
  specular: 0xffffff,
  shininess: 100,
  side: THREE.DoubleSide,
})

// Reticle Geometries for Orbit Tracking Node and Ground Footprint
const reticleArcGeo = new THREE.RingGeometry(0.12, 0.15, 24, 1, 0, Math.PI * 1.5)
const reticleCoreGeo = new THREE.SphereGeometry(0.065, 12, 12)
const groundDotGeo = new THREE.SphereGeometry(0.065, 12, 12)
const groundFootprintGeo = new THREE.RingGeometry(0.12, 0.16, 24)

const labelCanvasCache = new Map<string, THREE.CanvasTexture>()

function getOrCreateTextTexture(text: string, color: string): THREE.CanvasTexture {
  const key = `${text}_${color}`
  if (labelCanvasCache.has(key)) return labelCanvasCache.get(key)!

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 64)
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
  ctx.shadowBlur = 8
  ctx.fillStyle = color
  ctx.fillText(text, 128, 32)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  labelCanvasCache.set(key, texture)
  return texture
}

function createTextSprite(text: string, color: string = '#ffffff', scaleX = 0.8, scaleY = 0.2): THREE.Sprite {
  const texture = getOrCreateTextTexture(text, color)
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(scaleX, scaleY, 1)
  return sprite
}

function createSatelliteModel(
  satId: string,
  isActive: boolean,
  isSelected: boolean,
  isInRoute: boolean
): THREE.Group {
  const group = new THREE.Group()

  // 1. Satellite Bus Chassis
  const busColor = !isActive
    ? 0xc86f78 // Pale red for outage
    : isSelected
    ? 0xffffff
    : isInRoute
    ? 0xf1f5f9
    : 0xa1a1aa
  const busMat = new THREE.MeshPhongMaterial({
    color: busColor,
    specular: 0xffffff,
    shininess: 50,
  })
  const bus = new THREE.Mesh(satBusGeo, busMat)
  bus.userData = { type: 'satellite', id: satId }
  group.add(bus)

  // 2. Solar Wings (Port & Starboard)
  const leftWing = new THREE.Mesh(satWingGeo, satWingMat)
  leftWing.position.set(-0.19, 0, 0)
  leftWing.userData = { type: 'satellite', id: satId }
  group.add(leftWing)

  const rightWing = new THREE.Mesh(satWingGeo, satWingMat)
  rightWing.position.set(0.19, 0, 0)
  rightWing.userData = { type: 'satellite', id: satId }
  group.add(rightWing)

  const leftBoom = new THREE.Mesh(satBoomGeo, satBoomMat)
  leftBoom.position.set(-0.095, 0, 0)
  group.add(leftBoom)

  const rightBoom = new THREE.Mesh(satBoomGeo, satBoomMat)
  rightBoom.position.set(0.095, 0, 0)
  group.add(rightBoom)

  // 3. Earth-Facing High Gain Antenna Dish (points Nadir towards Earth, -Y)
  const dish = new THREE.Mesh(satDishGeo, satDishMat)
  dish.position.set(0, -0.055, 0)
  dish.userData = { type: 'satellite', id: satId }
  group.add(dish)

  // 4. Optical Beacon Core (keeps satellite visible at any camera distance)
  const beaconColor = !isActive
    ? 0xc86f78 // Pale red for outage
    : isSelected
    ? 0xffffff
    : isInRoute
    ? 0xffffff
    : 0xd4d4d8
  const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor })
  const beacon = new THREE.Mesh(satBeaconGeo, beaconMat)
  beacon.userData = { type: 'satellite', id: satId }
  group.add(beacon)

  group.userData = { type: 'satellite', id: satId, bus }
  return group
}

function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite) {
      if (child.geometry) {
        child.geometry.dispose()
      }
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => {
          if (m.map) m.map.dispose()
          m.dispose()
        })
      } else if (child.material) {
        if (child.material.map) child.material.map.dispose()
        child.material.dispose()
      }
    }
  })
}

function clearGroup(group: THREE.Group) {
  disposeHierarchy(group)
  while (group.children.length > 0) {
    group.remove(group.children[0])
  }
}

export const Globe3DView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    selectedClientId,
    setSelectedClient,
    selectedSatelliteId,
    setSelectedSatellite,
    selectedTarget,
    setSelectedStation,
    clearSelection,
    simulationResult,
    coverageMode,
  } = useSimulationStore()

  const coverageModeRef = useRef(coverageMode)
  useEffect(() => {
    coverageModeRef.current = coverageMode
  }, [coverageMode])

  const selectedTargetRef = useRef(selectedTarget)
  const prevTargetRef = useRef(selectedTarget)
  const shouldResetToOverviewRef = useRef(false)
  useEffect(() => {
    if (prevTargetRef.current && !selectedTarget) {
      shouldResetToOverviewRef.current = true
    } else if (selectedTarget) {
      shouldResetToOverviewRef.current = false
    }
    prevTargetRef.current = selectedTarget
    selectedTargetRef.current = selectedTarget
  }, [selectedTarget])

  const activeScenarioRef = useRef(activeScenario)
  useEffect(() => {
    activeScenarioRef.current = activeScenario
  }, [activeScenario])

  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null)
  const satGroupRef = useRef<THREE.Group | null>(null)
  const coverageGroupRef = useRef<THREE.Group | null>(null)
  const linksGroupRef = useRef<THREE.Group | null>(null)
  const routeGroupRef = useRef<THREE.Group | null>(null)
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null)

  // Camera tracking refs
  const satPosMapRef = useRef<Map<string, THREE.Vector3>>(new Map())
  const controlsTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const isDraggingRef = useRef(false)

  // Fast mesh node handles for continuous 60fps real-time orbit rendering
  const satNodesMapRef = useRef<Map<string, {
    groundDot: THREE.Mesh
    groundRing: THREE.Mesh
    radialBeam: THREE.Line
    satModel: THREE.Group
    busMesh?: THREE.Mesh
    arcMesh: THREE.Mesh
    trackerDot: THREE.Mesh
    label: THREE.Sprite
    innerRingMesh?: THREE.Mesh
    outerRingMesh?: THREE.Mesh
    groundTargetRing?: THREE.Mesh
    footprintCap?: THREE.Mesh
    footprintRing?: THREE.LineLoop
  }>>(new Map())
  const groundNodesMapRef = useRef<Map<string, {
    pinMesh: THREE.Mesh
    dotMesh: THREE.Mesh
    ringMesh?: THREE.Mesh
    labelNormal?: THREE.Sprite
    labelOffline?: THREE.Sprite
    badgeOffline?: THREE.Sprite
    badgeReceiving?: THREE.Sprite
    badgeOnline?: THREE.Sprite
    badgeClientConnected?: THREE.Sprite
    badgeClientPartition?: THREE.Sprite
    badgeClientNoVis?: THREE.Sprite
    isGateway?: boolean
  }>>(new Map())
  const updateRealtimePositionsRef = useRef<((t: number) => void) | null>(null)
  const islLineRef = useRef<THREE.LineSegments | null>(null)
  const routeLineRef = useRef<THREE.Line | null>(null)
  const feederBadgeClientRef = useRef<THREE.Sprite | null>(null)
  const feederBadgeGatewayRef = useRef<THREE.Sprite | null>(null)
  const currentRoutePointsRef = useRef<THREE.Vector3[]>([])
  const packetMeshGroupRef = useRef<THREE.Group | null>(null)

  // Current snapshot
  const step = simulationResult?.step_s || 120
  const idx = Math.floor(currentTime_s / step)
  const currentSnap = useMemo(() => {
    if (!simulationResult?.snapshots || simulationResult.snapshots.length === 0) return null
    return simulationResult.snapshots[Math.min(idx, simulationResult.snapshots.length - 1)]
  }, [simulationResult, idx])

  // Active route
  const clientData = useMemo(() => {
    return simulationResult?.clients.find((c) => c.client_id === selectedClientId)
  }, [simulationResult, selectedClientId])

  const activeRoutePath = useMemo(() => {
    const currentTimelineItem = clientData?.timeline.find((item) => item.t_s === idx * step)
    return currentTimelineItem?.path || []
  }, [clientData, idx, step])

  // Scale: 1 unit = 1000 km. Earth radius R = 6.371
  const SCALE = 0.001
  const EARTH_RADIUS = 6.371

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x06080d) // Deep space matte obsidian
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(0, 15, 20)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // High performance WebGL renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Starfield Background
    const stars = createStarfield(2200, 130, 360)
    scene.add(stars)

    // Lighting (Sunlight + balanced space ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.70)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2)
    sunLight.position.set(26, 16, 22)
    scene.add(sunLight)

    const spaceFill = new THREE.DirectionalLight(0x93c5fd, 0.35)
    spaceFill.position.set(-20, -10, -20)
    scene.add(spaceFill)

    // Photorealistic Earth textures bundled via Vite static asset pipeline
    const textureLoader = new THREE.TextureLoader()
    const earthMap = textureLoader.load(earthAtmosUrl)
    const specularMap = textureLoader.load(earthSpecularUrl)
    const normalMap = textureLoader.load(earthNormalUrl)
    const cloudsMap = textureLoader.load(earthCloudsUrl)

    // 1. Photorealistic Earth Globe in full natural colors
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      specularMap: specularMap,
      specular: new THREE.Color(0x334455),
      shininess: 25,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
    })

    const earthMesh = new THREE.Mesh(earthGeo, earthMat)
    earthMesh.rotation.y = -Math.PI / 2
    scene.add(earthMesh)

    // 2. Realistic Cloud Layer Sphere
    const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.008, 64, 64)
    const cloudsMat = new THREE.MeshPhongMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat)
    cloudsMesh.rotation.y = -Math.PI / 2
    scene.add(cloudsMesh)
    cloudsMeshRef.current = cloudsMesh

    // 3. Atmospheric Rim Glow (Rayleigh scattering sky blue)
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 64, 64)
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereGlowShader.vertexShader,
      fragmentShader: AtmosphereGlowShader.fragmentShader,
      uniforms: {
        color: { value: new THREE.Color(0x38bdf8) },
        coefficient: { value: 0.52 },
        power: { value: 3.2 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    scene.add(new THREE.Mesh(atmoGeo, atmoMat))

    // 4. Arctic Circle Reference Line (66.5° N - North Polar Circle)
    const capAngle = ((90 - 66.5) * Math.PI) / 180
    const circleRingGeo = new THREE.BufferGeometry()
    const ringPts: THREE.Vector3[] = []
    const ringR = EARTH_RADIUS * 1.003 * Math.sin(capAngle)
    const ringY = EARTH_RADIUS * 1.003 * Math.cos(capAngle)
    for (let a = 0; a <= 96; a++) {
      const rad = (a / 96) * Math.PI * 2
      ringPts.push(new THREE.Vector3(ringR * Math.cos(rad), ringY, ringR * Math.sin(rad)))
    }
    circleRingGeo.setFromPoints(ringPts)
    const circleRingMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.35,
      dashSize: 0.12,
      gapSize: 0.08,
    })
    const arcticLine = new THREE.LineLoop(circleRingGeo, circleRingMat)
    arcticLine.computeLineDistances()
    scene.add(arcticLine)

    // Groups for dynamic aerospace entities
    const orbitRingsGroup = new THREE.Group()
    scene.add(orbitRingsGroup)
    orbitRingsGroupRef.current = orbitRingsGroup

    const coverageGroup = new THREE.Group()
    scene.add(coverageGroup)
    coverageGroupRef.current = coverageGroup

    const satGroup = new THREE.Group()
    scene.add(satGroup)
    satGroupRef.current = satGroup

    const linksGroup = new THREE.Group()
    scene.add(linksGroup)
    linksGroupRef.current = linksGroup

    const routeGroup = new THREE.Group()
    scene.add(routeGroup)
    routeGroupRef.current = routeGroup

    // Mouse Controls (Euler Orbit) + Interactive Raycast Selection
    let isDragging = false
    let prevMousePos = { x: 0, y: 0 }
    let downPos = { x: 0, y: 0 }
    let downTime = 0
    let spherical = new THREE.Spherical(26, Math.PI / 3, Math.PI / 4)
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 0.25
    raycaster.params.Line.threshold = 0.15

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      isDraggingRef.current = true
      shouldResetToOverviewRef.current = false
      prevMousePos = { x: e.clientX, y: e.clientY }
      downPos = { x: e.clientX, y: e.clientY }
      downTime = performance.now()

      const rel = camera.position.clone().sub(controlsTargetRef.current)
      spherical.setFromVector3(rel)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dragDist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
        const dx = e.clientX - prevMousePos.x
        const dy = e.clientY - prevMousePos.y
        prevMousePos = { x: e.clientX, y: e.clientY }

        if (dragDist > 6 && selectedTargetRef.current) {
          selectedTargetRef.current = null
          shouldResetToOverviewRef.current = false
          useSimulationStore.getState().clearSelection()
          spherical.setFromVector3(camera.position.clone().sub(controlsTargetRef.current))
        }

        spherical.theta -= dx * 0.007
        spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - dy * 0.007))
        camera.position.setFromSpherical(spherical).add(controlsTargetRef.current)
        camera.lookAt(controlsTargetRef.current)
      } else {
        // Hover raycast: show pointer cursor when hovering over ground sites or satellites
        if (satGroupRef.current) {
          const rect = dom.getBoundingClientRect()
          const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          )
          raycaster.setFromCamera(mouse, camera)
          const hits = raycaster.intersectObjects(satGroupRef.current.children, true)
          let hasTarget = false
          for (const hit of hits) {
            let o: THREE.Object3D | null = hit.object
            while (o && !o.userData?.type) o = o.parent
            if (o?.userData?.type) {
              hasTarget = true
              break
            }
          }
          dom.style.cursor = hasTarget ? 'pointer' : 'default'
        }
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false
      isDraggingRef.current = false
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
      const duration = performance.now() - downTime

      // Distinguish click from camera rotation drag (under 8px movement and 400ms)
      if (dist < 8 && duration < 400) {
        const rect = dom.getBoundingClientRect()
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        )
        raycaster.setFromCamera(mouse, camera)
        let clickedTarget = false
        if (satGroupRef.current) {
          const hits = raycaster.intersectObjects(satGroupRef.current.children, true)
          for (const hit of hits) {
            let o: THREE.Object3D | null = hit.object
            while (o && !o.userData?.type) o = o.parent
            if (o && o.userData?.type) {
              if (o.userData.type === 'ground') {
                useSimulationStore.getState().setSelectedStation(o.userData.id)
                clickedTarget = true
                return
              } else if (o.userData.type === 'satellite') {
                useSimulationStore.getState().setSelectedSatellite(o.userData.id)
                clickedTarget = true
                return
              }
            }
          }
        }
        if (!clickedTarget) {
          // Clicked in empty space -> smoothly return to global Arctic overview!
          useSimulationStore.getState().clearSelection()
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      // Zooming out while following an object smoothly breaks follow and returns to overview
      if (selectedTargetRef.current && e.deltaY > 0) {
        selectedTargetRef.current = null
        useSimulationStore.getState().clearSelection()
        shouldResetToOverviewRef.current = true
        return
      }

      shouldResetToOverviewRef.current = false
      const minR = selectedTargetRef.current ? 1.5 : 8.0
      spherical.radius = Math.max(minR, Math.min(60, spherical.radius + e.deltaY * 0.015))
      camera.position.setFromSpherical(spherical).add(controlsTargetRef.current)
      camera.lookAt(controlsTargetRef.current)
    }

    const dom = renderer.domElement
    dom.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    dom.addEventListener('wheel', onWheel)

    // Resize Handler
    const onResize = () => {
      if (!container || !camera || !renderer) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Smooth camera target vectors
    const targetLookAt = new THREE.Vector3(0, 0, 0)
    const targetCamPos = new THREE.Vector3(0, 15, 20)

    // Animation Loop
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Subtle realistic clouds drifting
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.00012
      }

      // Smooth real-time update in WebGL frame loop
      const curT = useSimulationStore.getState().currentTime_s
      updateRealtimePositionsRef.current?.(curT)

      // Smooth Camera Follow & Auto-Framing
      const currentTarget = selectedTargetRef.current
      if (currentTarget?.type === 'sat') {
        const satPos = satPosMapRef.current.get(currentTarget.id)
        if (satPos) {
          targetLookAt.copy(satPos)
          const radial = satPos.clone().normalize()
          // Oblique orbit chase view: placed at an angle with distance ~5.6, showing satellite and Earth underneath
          const obliqueOffset = radial.clone().multiplyScalar(4.0).add(new THREE.Vector3(2.4, 2.8, 2.4))
          targetCamPos.copy(satPos).add(obliqueOffset)
        }
      } else if (currentTarget?.type === 'ground') {
        const g = activeScenarioRef.current?.ground_sites.find((s) => s.id === currentTarget.id)
        if (g) {
          const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)
          const pos = ecefToThree(gx, gy, gz)
          targetLookAt.copy(pos)
          const normal = pos.clone().normalize()
          const obliqueOffset = normal.clone().multiplyScalar(4.5).add(new THREE.Vector3(2.0, 2.8, 2.0))
          targetCamPos.copy(pos).add(obliqueOffset)
        }
      }

      if (currentTarget) {
        if (!isDraggingRef.current) {
          controlsTargetRef.current.lerp(targetLookAt, 0.04)
          camera.position.lerp(targetCamPos, 0.04)
          camera.lookAt(controlsTargetRef.current)
          spherical.setFromVector3(camera.position.clone().sub(controlsTargetRef.current))
        } else {
          camera.lookAt(controlsTargetRef.current)
        }
      } else if (shouldResetToOverviewRef.current) {
        targetLookAt.set(0, 0, 0)
        targetCamPos.set(0, 15, 20)
        controlsTargetRef.current.lerp(targetLookAt, 0.035)
        camera.position.lerp(targetCamPos, 0.035)
        camera.lookAt(controlsTargetRef.current)
        spherical.setFromVector3(camera.position)
        if (camera.position.distanceTo(targetCamPos) < 0.15 && controlsTargetRef.current.lengthSq() < 0.01) {
          shouldResetToOverviewRef.current = false
        }
      } else {
        if (controlsTargetRef.current.lengthSq() > 0.0005) {
          controlsTargetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.035)
          if (!isDraggingRef.current) {
            camera.lookAt(controlsTargetRef.current)
          }
        }
      }

      // Animate flowing data packets along active route
      if (packetMeshGroupRef.current && currentRoutePointsRef.current.length >= 2) {
        const pts = currentRoutePointsRef.current
        const segLens: number[] = []
        let totalLen = 0
        for (let i = 0; i < pts.length - 1; i++) {
          const d = pts[i].distanceTo(pts[i + 1])
          segLens.push(d)
          totalLen += d
        }
        if (totalLen > 0.001) {
          const packets = packetMeshGroupRef.current.children
          const now = performance.now() * 0.00065
          for (let k = 0; k < packets.length; k++) {
            const pMesh = packets[k] as THREE.Mesh
            pMesh.visible = true
            const phase = (now + k / packets.length) % 1.0
            const targetDist = phase * totalLen

            let acc = 0
            let placed = false
            for (let i = 0; i < segLens.length; i++) {
              if (acc + segLens[i] >= targetDist) {
                const segT = (targetDist - acc) / segLens[i]
                pMesh.position.lerpVectors(pts[i], pts[i + 1], segT)
                placed = true
                break
              }
              acc += segLens[i]
            }
            if (!placed) pMesh.position.copy(pts[pts.length - 1])
          }
        }
      } else if (packetMeshGroupRef.current) {
        for (const p of packetMeshGroupRef.current.children) p.visible = false
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      dom.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      dom.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)

      // Fully dispose GPU textures, geometries, and materials
      earthGeo.dispose()
      earthMat.dispose()
      earthMap.dispose()
      specularMap.dispose()
      normalMap.dispose()
      cloudsGeo.dispose()
      cloudsMat.dispose()
      cloudsMap.dispose()
      stars.geometry.dispose()
      ;(stars.material as THREE.Material).dispose()

      if (satGroupRef.current) clearGroup(satGroupRef.current)
      if (coverageGroupRef.current) clearGroup(coverageGroupRef.current)
      if (linksGroupRef.current) clearGroup(linksGroupRef.current)
      if (routeGroupRef.current) clearGroup(routeGroupRef.current)
      if (orbitRingsGroupRef.current) clearGroup(orbitRingsGroupRef.current)

      renderer.dispose()
    }
  }, [])

  // Helper: Convert ECEF (km) to Three.js coordinates
  const ecefToThree = (x_km: number, y_km: number, z_km: number): THREE.Vector3 => {
    return new THREE.Vector3(x_km * SCALE, z_km * SCALE, -y_km * SCALE)
  }

  // Draw Orbital Planes & Satellites (3 Inclined Trajectory Rings, inclination = 87°, altitude = 550 km, radius = 6.921)
  useEffect(() => {
    if (!orbitRingsGroupRef.current || !activeScenario) return
    const group = orbitRingsGroupRef.current
    clearGroup(group)

    const rOrbit = 6.921 // (6371 + 550) * 0.001
    const incRad = (activeScenario.environment.inclination_deg * Math.PI) / 180

    for (const plane of activeScenario.design.planes) {
      const raanRad = (plane.raan_deg * Math.PI) / 180
      const ringPoints: THREE.Vector3[] = []
      const segments = 120

      for (let i = 0; i < segments; i++) {
        const u = (i / segments) * Math.PI * 2
        // Keplerian ECI coordinates
        const x_eci =
          rOrbit *
          (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.sin(u) * Math.cos(incRad))
        const y_eci =
          rOrbit *
          (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.sin(u) * Math.cos(incRad))
        const z_eci = rOrbit * Math.sin(u) * Math.sin(incRad)

        // Three.js coords: Y is North Pole
        ringPoints.push(new THREE.Vector3(x_eci, z_eci, -y_eci))
      }

      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints)
      const ringColor = plane.id === 'P2' ? 0xa1a1aa : plane.id === 'P3' ? 0x888888 : 0x71717a

      const ringMat = new THREE.LineBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.30,
      })
      group.add(new THREE.LineLoop(ringGeo, ringMat))
    }
  }, [activeScenario])

  // Update Satellites, Ground Stations, ISL Links, and Active Routes
  useEffect(() => {
    if (!satGroupRef.current || !linksGroupRef.current || !routeGroupRef.current || !activeScenario)
      return

    const satGroup = satGroupRef.current
    const coverageGroup = coverageGroupRef.current
    const linksGroup = linksGroupRef.current
    const routeGroup = routeGroupRef.current

    // Clear previous
    clearGroup(satGroup)
    if (coverageGroup) clearGroup(coverageGroup)
    clearGroup(linksGroup)
    clearGroup(routeGroup)
    satNodesMapRef.current.clear()
    groundNodesMapRef.current.clear()

    // Pre-calculate physical footprint geometry configured by Orbit tab
    const altitudeKm = activeScenario.environment.altitude_km || 550
    const minElevationDeg = activeScenario.environment.min_elevation_deg ?? 10.0
    const coverageTier = computeFootprintAlpha(altitudeKm, minElevationDeg)

    const footprintCapGeo = new THREE.SphereGeometry(
      EARTH_RADIUS * 1.0025,
      32,
      8,
      0,
      Math.PI * 2,
      0,
      coverageTier.alphaRad
    )
    const capRingPts: THREE.Vector3[] = []
    const capR = EARTH_RADIUS * 1.003 * Math.sin(coverageTier.alphaRad)
    const capY = EARTH_RADIUS * 1.003 * Math.cos(coverageTier.alphaRad)
    for (let a = 0; a <= 64; a++) {
      const rad = (a / 64) * Math.PI * 2
      capRingPts.push(new THREE.Vector3(capR * Math.cos(rad), capY, capR * Math.sin(rad)))
    }
    const footprintRingGeo = new THREE.BufferGeometry().setFromPoints(capRingPts)

    // 1. Ground Stations on Earth Surface (Interactive, Click-to-Select)
    const clientElev = currentSnap?.elevation_deg[selectedClientId] || {}
    const hasSatVis = Object.values(clientElev).some(
      (el) => el >= minElevationDeg
    )
    const isConnected = activeRoutePath.length >= 2

    for (const g of activeScenario.ground_sites) {
      const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)
      const pos = ecefToThree(gx, gy, gz)
      const isClient = g.role === 'client'
      const isSelected =
        selectedTarget?.type === 'ground'
          ? selectedTarget.id === g.id
          : isClient && g.id === selectedClientId
      const isReceiving =
        activeRoutePath.length >= 2 && activeRoutePath[activeRoutePath.length - 1] === g.id

      // Check for active gateway outage at current time
      const isGatewayOffline =
        g.role === 'gateway' &&
        (activeScenario.gateway_outages || []).some(
          (f) => f.gateway_id === g.id && f.start_s <= currentTime_s && currentTime_s < f.end_s
        )

      // Status-driven Color
      const statusColorHex = isGatewayOffline
        ? 0xef4444 // Red for gateway outage
        : isClient
        ? isSelected
          ? isConnected
            ? 0x10b981 // Emerald (Connected)
            : hasSatVis
            ? 0xf59e0b // Amber (ISL Broken)
            : 0xef4444 // Red (No satellite in view)
          : 0xa1a1aa
        : isReceiving
        ? 0x10b981
        : 0x60a5fa

      // Station Radio Horizon Field of View boundary according to Orbit min_elevation_deg
      const stationRingMat = new THREE.LineDashedMaterial({
        color: isClient ? (isSelected ? 0x10b981 : 0x38bdf8) : 0x60a5fa,
        transparent: true,
        opacity: isSelected ? 0.65 : 0.22,
        dashSize: 0.14,
        gapSize: 0.08,
      })
      const stationHorizonRing = new THREE.LineLoop(footprintRingGeo, stationRingMat)
      stationHorizonRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      stationHorizonRing.computeLineDistances()
      satGroup.add(stationHorizonRing)

      // Pin pedestal
      const pinGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.16, 8)
      const pinMat = new THREE.MeshBasicMaterial({ color: statusColorHex })
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      pinMesh.position.copy(pos)
      pinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      pinMesh.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
      satGroup.add(pinMesh)

      // Interactive Ground Marker Dot (generous hit target)
      const dotRadius = isSelected ? 0.15 : isClient ? 0.11 : 0.13
      const dotGeo = new THREE.SphereGeometry(dotRadius, 12, 12)
      const dotMat = new THREE.MeshBasicMaterial({ color: statusColorHex })
      const dotMesh = new THREE.Mesh(dotGeo, dotMat)
      dotMesh.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.12)))
      dotMesh.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
      satGroup.add(dotMesh)

      // Ground Target Ring if Outage, Selected or Receiving
      const ringGeo = new THREE.RingGeometry(0.24, 0.30, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: isGatewayOffline ? 0xef4444 : statusColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.90,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.04)))
      ringMesh.lookAt(pos.clone().multiplyScalar(2))
      ringMesh.visible = isGatewayOffline || isSelected || isReceiving
      satGroup.add(ringMesh)

      let labelNormal: THREE.Sprite | undefined
      let labelOffline: THREE.Sprite | undefined
      let badgeOffline: THREE.Sprite | undefined
      let badgeReceiving: THREE.Sprite | undefined
      let badgeOnline: THREE.Sprite | undefined
      let badgeClientConnected: THREE.Sprite | undefined
      let badgeClientPartition: THREE.Sprite | undefined
      let badgeClientNoVis: THREE.Sprite | undefined

      if (g.role === 'gateway') {
        // Normal gateway label
        labelNormal = createTextSprite(`[ШЛЮЗ] ${g.name}`, '#cbd5e1', 0.75, 0.18)
        labelNormal.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.36)))
        labelNormal.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
        labelNormal.visible = !isGatewayOffline
        satGroup.add(labelNormal)

        // Offline gateway label
        labelOffline = createTextSprite(`[🔴 ШЛЮЗ (ОТКАЗ)] ${g.name}`, '#ef4444', 0.95, 0.18)
        labelOffline.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.36)))
        labelOffline.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
        labelOffline.visible = isGatewayOffline
        satGroup.add(labelOffline)

        // Status badge: Offline
        badgeOffline = createTextSprite('[🔴 ШЛЮЗ НЕ РАБОТАЕТ (ОТКАЗ)]', '#ef4444', 0.95, 0.20)
        badgeOffline.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.54)))
        badgeOffline.visible = isGatewayOffline
        satGroup.add(badgeOffline)

        // Status badge: Receiving Traffic
        badgeReceiving = createTextSprite('[● ПРИЕМ ТРАФИКА]', '#10b981', 0.85, 0.19)
        badgeReceiving.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.54)))
        badgeReceiving.visible = !isGatewayOffline && isReceiving
        satGroup.add(badgeReceiving)

        // Status badge: Online Ready (Blue)
        badgeOnline = createTextSprite('[● ШЛЮЗ В СЕТИ]', '#60a5fa', 0.80, 0.18)
        badgeOnline.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.54)))
        badgeOnline.visible = !isGatewayOffline && !isReceiving
        satGroup.add(badgeOnline)
      } else {
        // Client ground station label
        const groundLabel = createTextSprite(
          `[АБОНЕНТ] ${g.id}`,
          isSelected ? '#ffffff' : '#cbd5e1',
          0.75,
          0.18
        )
        groundLabel.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.36)))
        groundLabel.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
        satGroup.add(groundLabel)

        // Dynamic badges for client connection state
        badgeClientConnected = createTextSprite('[● СВЯЗЬ: АКТИВНА]', '#10b981', 0.85, 0.19)
        badgeClientConnected.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.54)))
        badgeClientConnected.visible = false
        satGroup.add(badgeClientConnected)

        badgeClientPartition = createTextSprite('[● РАЗРЫВ МИС]', '#f59e0b', 0.85, 0.19)
        badgeClientPartition.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.54)))
        badgeClientPartition.visible = false
        satGroup.add(badgeClientPartition)

        badgeClientNoVis = createTextSprite('[● ВНЕ ЗОНЫ КА]', '#ef4444', 0.85, 0.19)
        badgeClientNoVis.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.54)))
        badgeClientNoVis.visible = false
        satGroup.add(badgeClientNoVis)
      }

      groundNodesMapRef.current.set(g.id, {
        pinMesh,
        dotMesh,
        ringMesh,
        labelNormal,
        labelOffline,
        badgeOffline,
        badgeReceiving,
        badgeOnline,
        badgeClientConnected,
        badgeClientPartition,
        badgeClientNoVis,
        isGateway: g.role === 'gateway',
      })
    }

    // 2. Build Satellites (Ground Track Point on the Globe + Perpendicular Radial Beam + 3D Spacecraft Model in Orbit)
    satNodesMapRef.current.clear()

    const initialPositions = computePositions(activeScenario, currentTime_s)
    const initialSatMap = new Map(initialPositions.map((s) => [s.id, s]))

    for (const satCfg of activeScenario.design.satellites) {
      const sat = initialSatMap.get(satCfg.id) || {
        id: satCfg.id,
        plane_id: satCfg.plane_id,
        active: satCfg.launch_batch <= activeScenario.design.launch_stage,
        x_km: 0,
        y_km: 0,
        z_km: 0,
      }
      const isSelected =
        selectedTarget?.type === 'sat'
          ? selectedTarget.id === sat.id
          : sat.id === selectedSatelliteId
      const isInRoute = activeRoutePath.includes(sat.id)
      const codename = `КА ${sat.id}`

      const colorHex = !sat.active ? 0xf87171 : isInRoute ? 0xffffff : isSelected ? 0xffffff : 0xe4e4e7

      // A. Ground-track Point on the Earth Sphere Surface ("точка на шаре")
      const groundDot = new THREE.Mesh(
        groundDotGeo,
        new THREE.MeshBasicMaterial({ color: colorHex })
      )
      groundDot.userData = { type: 'satellite', id: sat.id }
      satGroup.add(groundDot)

      // Real-time Footprint Cap & Contour on Earth Sphere configured by Orbit tab
      const capMat = new THREE.MeshBasicMaterial({
        color: isInRoute ? 0x10b981 : isSelected ? 0x38bdf8 : 0x0284c7,
        transparent: true,
        opacity: isInRoute ? 0.25 : isSelected ? 0.18 : 0.08,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const footprintCap = new THREE.Mesh(footprintCapGeo, capMat)
      footprintCap.userData = { type: 'satellite', id: sat.id }
      if (coverageGroup) coverageGroup.add(footprintCap)

      const ringMat = new THREE.LineBasicMaterial({
        color: isInRoute ? 0x34d399 : isSelected ? 0x38bdf8 : 0x0284c7,
        transparent: true,
        opacity: isInRoute ? 0.85 : isSelected ? 0.70 : 0.35,
        linewidth: isInRoute ? 2.0 : 1.0,
      })
      const footprintRing = new THREE.LineLoop(footprintRingGeo, ringMat)
      footprintRing.userData = { type: 'satellite', id: sat.id }
      if (coverageGroup) coverageGroup.add(footprintRing)

      // Footprint ring on the Earth surface
      const groundRing = new THREE.Mesh(
        groundFootprintGeo,
        new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.85 : 0.45,
        })
      )
      groundRing.userData = { type: 'satellite', id: sat.id }
      satGroup.add(groundRing)

      // Ground target highlight ring when selected
      let groundTargetRing: THREE.Mesh | undefined
      if (isSelected) {
        groundTargetRing = new THREE.Mesh(
          new THREE.RingGeometry(0.22, 0.28, 28),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.90,
          })
        )
        groundTargetRing.userData = { type: 'satellite', id: sat.id }
        satGroup.add(groundTargetRing)
      }

      // B. Perpendicular Radial Beam connecting Nadir ground point straight up to 3D satellite in orbit ("ровно")
      const beamGeo = new THREE.BufferGeometry()
      beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const beamMat = new THREE.LineBasicMaterial({
        color: !sat.active ? 0xf87171 : isSelected ? 0xffffff : 0x71717a,
        transparent: true,
        opacity: isSelected ? 0.75 : 0.25,
      })
      const radialBeam = new THREE.Line(beamGeo, beamMat)
      satGroup.add(radialBeam)

      // C. 3D Spacecraft Model in Orbit
      const satModel = createSatelliteModel(sat.id, sat.active, isSelected, isInRoute)
      satGroup.add(satModel)

      // D. Orbital Reticle Brackets and Beacon Core at the satellite
      const trackerDot = new THREE.Mesh(
        reticleCoreGeo,
        new THREE.MeshBasicMaterial({ color: colorHex })
      )
      trackerDot.userData = { type: 'satellite', id: sat.id }
      satGroup.add(trackerDot)

      const arcMat = new THREE.MeshBasicMaterial({
        color: !sat.active ? 0xf87171 : isSelected ? 0xffffff : 0x94a3b8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.65,
      })
      const arcMesh = new THREE.Mesh(reticleArcGeo, arcMat)
      arcMesh.userData = { type: 'satellite', id: sat.id }
      satGroup.add(arcMesh)

      // E. Floating Codename Label above the satellite
      const labelColor = !sat.active ? '#fca5a5' : isSelected ? '#ffffff' : '#cbd5e1'
      const label = createTextSprite(codename, labelColor, 0.70, 0.17)
      label.userData = { type: 'satellite', id: sat.id }
      satGroup.add(label)

      // F. Orbit Target Halo rings when selected
      let innerRingMesh: THREE.Mesh | undefined
      let outerRingMesh: THREE.Mesh | undefined
      if (isSelected) {
        const innerRingGeo = new THREE.RingGeometry(0.24, 0.28, 28)
        const innerRingMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
        innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat)
        satGroup.add(innerRingMesh)

        const outerRingGeo = new THREE.RingGeometry(0.34, 0.38, 28)
        const outerRingMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        })
        outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat)
        satGroup.add(outerRingMesh)
      }

      satNodesMapRef.current.set(sat.id, {
        groundDot,
        groundRing,
        radialBeam,
        satModel,
        busMesh: (satModel.userData as any).bus,
        arcMesh,
        trackerDot,
        label,
        innerRingMesh,
        outerRingMesh,
        groundTargetRing,
        footprintCap,
        footprintRing,
      })
    }

    // 3. Inter-Satellite Links (ISL Mesh)
    const islGeo = new THREE.BufferGeometry()
    const islMat = new THREE.LineBasicMaterial({
      color: 0x52525b,
      transparent: true,
      opacity: 0.35,
    })
    const islMesh = new THREE.LineSegments(islGeo, islMat)
    linksGroup.add(islMesh)
    islLineRef.current = islMesh

    // 4. Active Route (Ground -> Sat ... -> Gateway)
    const routeGeo = new THREE.BufferGeometry()
    const routeMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 3.0,
    })
    const routeMesh = new THREE.Line(routeGeo, routeMat)
    routeGroup.add(routeMesh)
    routeLineRef.current = routeMesh

    // Dynamic Feeder Link Elevation Badges & Hop Type Indicator
    const feederBadgeClient = createTextSprite('', '#10b981', 0.9, 0.22)
    feederBadgeClient.visible = false
    routeGroup.add(feederBadgeClient)
    feederBadgeClientRef.current = feederBadgeClient

    const feederBadgeGateway = createTextSprite('', '#10b981', 0.9, 0.22)
    feederBadgeGateway.visible = false
    routeGroup.add(feederBadgeGateway)
    feederBadgeGatewayRef.current = feederBadgeGateway

    // 5. Animated Data Packets along the active route ("бегущие квадратики")
    const packetMeshGroup = new THREE.Group()
    routeGroup.add(packetMeshGroup)
    packetMeshGroupRef.current = packetMeshGroup

    const packetGeo = new THREE.BoxGeometry(0.10, 0.10, 0.10)
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    for (let i = 0; i < 18; i++) {
      const pMesh = new THREE.Mesh(packetGeo, packetMat)
      pMesh.visible = false
      packetMeshGroup.add(pMesh)
    }
  }, [activeScenario, selectedClientId, selectedSatelliteId, selectedTarget])

  // Continuous real-time position and dynamic routing update function
  const updateRealtimePositions = useCallback(
    (t: number) => {
      if (!activeScenario || satNodesMapRef.current.size === 0) return

      const liveSnap = computeSnapshot(activeScenario, t)
      const positions = liveSnap.satellites
      const nextPositions = computePositions(activeScenario, t + 1.5)
      const nextPosMap = new Map(nextPositions.map((s) => [s.id, s]))
      const satPosMap = new Map<string, THREE.Vector3>()

      // Determine available gateways (excluding active outages)
      const liveGateways = new Set<string>()
      for (const g of activeScenario.ground_sites) {
        if (g.role === 'gateway') {
          const isOffline = (activeScenario.gateway_outages || []).some(
            (f) => f.gateway_id === g.id && f.start_s <= t && t < f.end_s
          )
          if (!isOffline) {
            liveGateways.add(g.id)
          }
        }
      }

      // Compute dynamic real-time route for seamless satellite handovers
      const liveRoute = selectedClientId
        ? findRoute(liveSnap, activeScenario, selectedClientId, liveGateways)
        : null
      const liveRoutePath = liveRoute?.path || []
      const isRouteActive = liveRoutePath.length >= 2

      const tempMatrix = new THREE.Matrix4()
      const tempUp = new THREE.Vector3()
      const tempForward = new THREE.Vector3()
      const tempRight = new THREE.Vector3()

      for (const sat of positions) {
        const node = satNodesMapRef.current.get(sat.id)
        const pos = ecefToThree(sat.x_km, sat.y_km, sat.z_km)
        satPosMap.set(sat.id, pos)

        if (node) {
          const radial = pos.clone().normalize()
          const nadirPos = radial.clone().multiplyScalar(EARTH_RADIUS + 0.015)

          // 1. Nadir Ground Point on the Globe Surface ("точка на шаре")
          node.groundDot.position.copy(nadirPos)
          node.groundRing.position.copy(nadirPos)
          node.groundRing.lookAt(nadirPos.clone().multiplyScalar(2))

          if (node.groundTargetRing) {
            node.groundTargetRing.position.copy(nadirPos)
            node.groundTargetRing.lookAt(nadirPos.clone().multiplyScalar(2))
          }

          // 2. Perpendicular Radial Beam straight between globe point and 3D satellite ("ровно")
          const beamAttr = node.radialBeam.geometry.getAttribute('position') as THREE.BufferAttribute
          if (beamAttr) {
            beamAttr.setXYZ(0, nadirPos.x, nadirPos.y, nadirPos.z)
            beamAttr.setXYZ(1, pos.x, pos.y, pos.z)
            beamAttr.needsUpdate = true
          }

          // 3. 3D Spacecraft Model in Orbit
          node.satModel.position.copy(pos)

          // Smoothly align satellite along orbital flight path
          const nextSat = nextPosMap.get(sat.id)
          if (nextSat) {
            const nextPos = ecefToThree(nextSat.x_km, nextSat.y_km, nextSat.z_km)
            tempForward.subVectors(nextPos, pos).normalize()
            tempUp.copy(radial)
            tempRight.crossVectors(tempForward, tempUp).normalize()
            tempForward.crossVectors(tempUp, tempRight).normalize()

            tempMatrix.makeBasis(tempRight, tempUp, tempForward)
            node.satModel.quaternion.setFromRotationMatrix(tempMatrix)
          }

          // 4. Tracker reticle and core at the satellite
          node.trackerDot.position.copy(pos)
          node.arcMesh.position.copy(pos)
          node.arcMesh.lookAt(pos.clone().multiplyScalar(2))

          // 5. Floating text label
          node.label.position.copy(pos.clone().add(radial.clone().multiplyScalar(0.32)))

          // 6. Selection halo rings
          if (node.innerRingMesh && node.outerRingMesh) {
            node.innerRingMesh.position.copy(pos)
            node.innerRingMesh.lookAt(pos.clone().multiplyScalar(2))
            node.outerRingMesh.position.copy(pos)
            node.outerRingMesh.lookAt(pos.clone().multiplyScalar(2))
          }

          // Dynamically update satellite bus and tracker colors without rebuilding scene
          const isFailed = !sat.active
          const isInRoute = liveRoutePath.includes(sat.id)
          const isSelected =
            selectedTargetRef.current?.type === 'sat' && selectedTargetRef.current.id === sat.id
          if (node.busMesh) {
            const busCol = isFailed ? 0xc86f78 : isSelected ? 0xffffff : isInRoute ? 0xf1f5f9 : 0xa1a1aa
            ;(node.busMesh.material as THREE.MeshPhongMaterial).color.setHex(busCol)
          }
          if (node.trackerDot) {
            const dotCol = isFailed ? 0xef4444 : isSelected ? 0xffffff : isInRoute ? 0xffffff : 0xd4d4d8
            ;(node.trackerDot.material as THREE.MeshBasicMaterial).color.setHex(dotCol)
          }

          // 7. Dynamic Real-time Footprint orientation and styling
          if (node.footprintCap && node.footprintRing) {
            const upVec = new THREE.Vector3(0, 1, 0)
            node.footprintCap.quaternion.setFromUnitVectors(upVec, radial)
            node.footprintRing.quaternion.setFromUnitVectors(upVec, radial)

            const curMode = coverageModeRef.current
            const isBaseVisible = !(curMode === 'off' || isFailed || (curMode === 'route' && !isInRoute))

            if (!isBaseVisible) {
              node.footprintCap.visible = false
              node.footprintRing.visible = false
            } else {
              node.footprintCap.visible = true
              node.footprintRing.visible = true

              const capMat = node.footprintCap.material as THREE.MeshBasicMaterial
              const ringMat = node.footprintRing.material as THREE.LineBasicMaterial

              if (isInRoute) {
                capMat.color.setHex(0x10b981)
                capMat.opacity = 0.28
                ringMat.color.setHex(0x34d399)
                ringMat.opacity = 0.95
              } else if (isSelected) {
                capMat.color.setHex(0x38bdf8)
                capMat.opacity = 0.22
                ringMat.color.setHex(0xffffff)
                ringMat.opacity = 0.85
              } else {
                capMat.color.setHex(0x0284c7)
                capMat.opacity = 0.08
                ringMat.color.setHex(0x0284c7)
                ringMat.opacity = 0.35
              }
            }
          }
        }
      }

      satPosMapRef.current = satPosMap

      // Dynamically update ground sites status, colors, and floating badges in real-time
      for (const g of activeScenario.ground_sites) {
        const gNode = groundNodesMapRef.current.get(g.id)
        if (!gNode) continue

        const isOffline =
          g.role === 'gateway' &&
          (activeScenario.gateway_outages || []).some(
            (f) => f.gateway_id === g.id && f.start_s <= t && t < f.end_s
          )
        const isReceiving =
          isRouteActive && liveRoutePath[liveRoutePath.length - 1] === g.id
        const isClient = g.role === 'client'
        const isSelected =
          selectedTargetRef.current?.type === 'ground'
            ? selectedTargetRef.current.id === g.id
            : isClient && g.id === selectedClientId

        const siteElevations = liveSnap.elevation_deg[g.id] || {}
        const siteHasSatVis = Object.entries(siteElevations).some(([sid, el]) => {
          const s = positions.find((sat) => sat.id === sid)
          return s?.active && el >= (activeScenario.environment.min_elevation_deg ?? 10.0)
        })

        const statusColorHex = isOffline
          ? 0xef4444
          : isClient
          ? isSelected
            ? isRouteActive
              ? 0x10b981
              : siteHasSatVis
              ? 0xf59e0b
              : 0xef4444
            : 0xa1a1aa
          : isReceiving
          ? 0x10b981
          : 0x60a5fa

        ;(gNode.pinMesh.material as THREE.MeshBasicMaterial).color.setHex(statusColorHex)
        ;(gNode.dotMesh.material as THREE.MeshBasicMaterial).color.setHex(statusColorHex)
        if (gNode.ringMesh) {
          gNode.ringMesh.visible = isOffline || isSelected || isReceiving
          ;(gNode.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(statusColorHex)
        }

        // Dynamically synchronize gateway floating label and status badge sprites
        if (gNode.isGateway) {
          if (isOffline) {
            if (gNode.badgeOffline) gNode.badgeOffline.visible = true
            if (gNode.badgeReceiving) gNode.badgeReceiving.visible = false
            if (gNode.badgeOnline) gNode.badgeOnline.visible = false
            if (gNode.labelOffline) gNode.labelOffline.visible = true
            if (gNode.labelNormal) gNode.labelNormal.visible = false
          } else if (isReceiving) {
            if (gNode.badgeOffline) gNode.badgeOffline.visible = false
            if (gNode.badgeReceiving) gNode.badgeReceiving.visible = true
            if (gNode.badgeOnline) gNode.badgeOnline.visible = false
            if (gNode.labelOffline) gNode.labelOffline.visible = false
            if (gNode.labelNormal) gNode.labelNormal.visible = true
          } else {
            if (gNode.badgeOffline) gNode.badgeOffline.visible = false
            if (gNode.badgeReceiving) gNode.badgeReceiving.visible = false
            if (gNode.badgeOnline) gNode.badgeOnline.visible = true
            if (gNode.labelOffline) gNode.labelOffline.visible = false
            if (gNode.labelNormal) gNode.labelNormal.visible = true
          }
        } else {
          // Dynamically synchronize client floating status badge sprites
          if (isSelected) {
            if (isRouteActive) {
              if (gNode.badgeClientConnected) gNode.badgeClientConnected.visible = true
              if (gNode.badgeClientPartition) gNode.badgeClientPartition.visible = false
              if (gNode.badgeClientNoVis) gNode.badgeClientNoVis.visible = false
            } else if (siteHasSatVis) {
              if (gNode.badgeClientConnected) gNode.badgeClientConnected.visible = false
              if (gNode.badgeClientPartition) gNode.badgeClientPartition.visible = true
              if (gNode.badgeClientNoVis) gNode.badgeClientNoVis.visible = false
            } else {
              if (gNode.badgeClientConnected) gNode.badgeClientConnected.visible = false
              if (gNode.badgeClientPartition) gNode.badgeClientPartition.visible = false
              if (gNode.badgeClientNoVis) gNode.badgeClientNoVis.visible = true
            }
          } else {
            if (gNode.badgeClientConnected) gNode.badgeClientConnected.visible = false
            if (gNode.badgeClientPartition) gNode.badgeClientPartition.visible = false
            if (gNode.badgeClientNoVis) gNode.badgeClientNoVis.visible = false
          }
        }
      }

      // Update ISL links with buffer reuse
      if (islLineRef.current) {
        const linkPositions: number[] = []
        for (const [u, v] of liveSnap.edges) {
          if (!u.startsWith('C') && !u.startsWith('G') && !v.startsWith('C') && !v.startsWith('G')) {
            const posU = satPosMap.get(u)
            const posV = satPosMap.get(v)
            if (posU && posV) {
              linkPositions.push(posU.x, posU.y, posU.z, posV.x, posV.y, posV.z)
            }
          }
        }
        const existingAttr = islLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
        if (!existingAttr || existingAttr.count !== linkPositions.length / 3) {
          if (existingAttr) islLineRef.current.geometry.deleteAttribute('position')
          islLineRef.current.geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(linkPositions, 3)
          )
        } else {
          existingAttr.copyArray(linkPositions)
          existingAttr.needsUpdate = true
        }
      }

      // Update active route and feeder link elevation badges
      if (routeLineRef.current) {
        if (isRouteActive) {
          const routePoints: THREE.Vector3[] = []
          for (const nodeId of liveRoutePath) {
            const gNode = activeScenario.ground_sites.find((g) => g.id === nodeId)
            if (gNode) {
              const [gx, gy, gz] = groundPosition(gNode.lat_deg, gNode.lon_deg)
              routePoints.push(ecefToThree(gx, gy, gz))
            } else {
              const sPos = satPosMap.get(nodeId)
              if (sPos) routePoints.push(sPos.clone())
            }
          }
          const coords: number[] = []
          for (const p of routePoints) {
            coords.push(p.x, p.y, p.z)
          }
          const existingAttr = routeLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
          if (!existingAttr || existingAttr.count !== routePoints.length) {
            if (existingAttr) routeLineRef.current.geometry.deleteAttribute('position')
            routeLineRef.current.geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3))
          } else {
            existingAttr.copyArray(coords)
            existingAttr.needsUpdate = true
          }
          routeLineRef.current.visible = true
          currentRoutePointsRef.current = routePoints

          // Dynamic elevation badges on feeder links:
          const firstSatId = liveRoutePath[1]
          const elevClient = liveSnap.elevation_deg[selectedClientId]?.[firstSatId] ?? 0
          const lastIndex = liveRoutePath.length - 1
          const lastGtwId = liveRoutePath[lastIndex]
          const lastSatId = liveRoutePath[lastIndex - 1]
          const elevGtw = liveSnap.elevation_deg[lastGtwId]?.[lastSatId] ?? 0

          // Leg 1: Client -> First Satellite
          if (feederBadgeClientRef.current && routePoints.length >= 2) {
            const midP = routePoints[0].clone().lerp(routePoints[1], 0.45)
            feederBadgeClientRef.current.position.copy(
              midP.add(routePoints[0].clone().normalize().multiplyScalar(0.22))
            )
            const clCol = elevClient >= 25 ? '#10b981' : '#38bdf8'
            const clText = `θ_кл = ${elevClient.toFixed(1)}°`
            const spriteTex = getOrCreateTextTexture(clText, clCol)
            feederBadgeClientRef.current.material.map = spriteTex
            feederBadgeClientRef.current.visible = true
          } else if (feederBadgeClientRef.current) {
            feederBadgeClientRef.current.visible = false
          }

          // Leg 2: Gateway <- Last Satellite
          if (feederBadgeGatewayRef.current && routePoints.length >= 2) {
            const midP = routePoints[lastIndex].clone().lerp(routePoints[lastIndex - 1], 0.45)
            feederBadgeGatewayRef.current.position.copy(
              midP.add(routePoints[lastIndex].clone().normalize().multiplyScalar(0.22))
            )
            const gtwCol = elevGtw >= 25 ? '#10b981' : '#38bdf8'
            const gtwText = `θ_шл = ${elevGtw.toFixed(1)}°`
            const spriteTex = getOrCreateTextTexture(gtwText, gtwCol)
            feederBadgeGatewayRef.current.material.map = spriteTex
            feederBadgeGatewayRef.current.visible = true
          } else if (feederBadgeGatewayRef.current) {
            feederBadgeGatewayRef.current.visible = false
          }
        } else {
          routeLineRef.current.visible = false
          currentRoutePointsRef.current = []
          if (feederBadgeClientRef.current) feederBadgeClientRef.current.visible = false
          if (feederBadgeGatewayRef.current) feederBadgeGatewayRef.current.visible = false
        }
      }
    },
    [activeScenario, selectedClientId]
  )

  // Keep ref up to date for animate loop
  useEffect(() => {
    updateRealtimePositionsRef.current = updateRealtimePositions
  }, [updateRealtimePositions])

  // Trigger continuous position update whenever currentTime_s changes
  useEffect(() => {
    updateRealtimePositions(currentTime_s)
  }, [currentTime_s, updateRealtimePositions])

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#06080d]">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
