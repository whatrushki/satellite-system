import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { groundPosition, computePositions } from '@/core/geometryEngine'
import { AtmosphereGlowShader } from './AtmosphereShader'
import { createStarfield } from './Starfield'

// Codename map matching SpaceX mockup
const CODENAMES: Record<string, string> = {
  S01: 'Aurora-1',
  S02: 'Aurora-2',
  S03: 'Aurora-3',
  S04: 'Aurora-4',
  S05: 'Aurora-5',
  S09: 'Meridian-1',
  S10: 'Meridian-2',
  S13: 'Zenith-X',
  S14: 'Zenith-1',
  S17: 'Helios-A',
  S18: 'Helios-B',
  S19: 'Helios-R',
  S22: 'Vector-3',
}

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

// Reticle Geometries for Orbit Tracking Node
const reticleArcGeo = new THREE.RingGeometry(0.12, 0.15, 24, 1, 0, Math.PI * 1.5)
const reticleCoreGeo = new THREE.SphereGeometry(0.065, 12, 12)

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

  group.userData = { type: 'satellite', id: satId }
  return group
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
    simulationResult,
  } = useSimulationStore()

  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null)
  const satGroupRef = useRef<THREE.Group | null>(null)
  const linksGroupRef = useRef<THREE.Group | null>(null)
  const routeGroupRef = useRef<THREE.Group | null>(null)
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null)

  // Fast mesh node handles for continuous 60fps real-time orbit rendering
  const satNodesMapRef = useRef<Map<string, {
    trackerDot: THREE.Mesh
    arcMesh: THREE.Mesh
    satModel: THREE.Group
    linkLine: THREE.Line
    label: THREE.Sprite
    innerRingMesh?: THREE.Mesh
    outerRingMesh?: THREE.Mesh
  }>>(new Map())
  const islLineRef = useRef<THREE.LineSegments | null>(null)
  const routeLineRef = useRef<THREE.Line | null>(null)

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

    // Lighting (Sunlight + subtle deep space ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4)
    sunLight.position.set(26, 16, 22)
    scene.add(sunLight)

    const spaceFill = new THREE.DirectionalLight(0x71717a, 0.20)
    spaceFill.position.set(-20, -10, -20)
    scene.add(spaceFill)

    // Texture Loader
    const textureLoader = new THREE.TextureLoader()
    const earthMap = textureLoader.load('/earth_atmos_2048.jpg')
    const specularMap = textureLoader.load('/earth_specular_2048.jpg')
    const normalMap = textureLoader.load('/earth_normal_2048.jpg')
    const cloudsMap = textureLoader.load('/earth_clouds_1024.png')

    // 1. Photorealistic Earth Globe with High-Contrast B&W Monochrome Filter
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      specularMap: specularMap,
      specular: new THREE.Color(0x3f3f46),
      shininess: 25,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
    })

    // Custom Shader Hook: Balanced Muted Color Filter for Earth ("что то между цветным и ч/б")
    earthMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        #ifdef USE_MAP
          // Grayscale luminosity conversion (ITU-R BT.709)
          float earthLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 monoTone = vec3(pow(earthLum, 1.10) * 1.05);
          // Blended aerospace palette: 35% subtle natural color + 65% monochrome
          diffuseColor.rgb = mix(monoTone, diffuseColor.rgb * 0.90, 0.35);
        #endif
        `
      )
    }

    const earthMesh = new THREE.Mesh(earthGeo, earthMat)
    earthMesh.rotation.y = -Math.PI / 2
    scene.add(earthMesh)

    // 2. Realistic Cloud Layer Sphere
    const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.008, 64, 64)
    const cloudsMat = new THREE.MeshPhongMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.80,
      blending: THREE.NormalBlending,
      depthWrite: false,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat)
    cloudsMesh.rotation.y = -Math.PI / 2
    scene.add(cloudsMesh)
    cloudsMeshRef.current = cloudsMesh

    // 3. Atmospheric Rim Glow (Monochrome cool white / silver)
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 64, 64)
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereGlowShader.vertexShader,
      fragmentShader: AtmosphereGlowShader.fragmentShader,
      uniforms: {
        color: { value: new THREE.Color(0xdde5ed) },
        coefficient: { value: 0.52 },
        power: { value: 3.2 },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    scene.add(new THREE.Mesh(atmoGeo, atmoMat))

    // 4. THE SPACEX ARCTIC COVERAGE DOME (Monochrome silver cap)
    const capAngle = ((90 - 66.5) * Math.PI) / 180
    const domeGeo = new THREE.SphereGeometry(
      EARTH_RADIUS * 1.012,
      64,
      16,
      0,
      Math.PI * 2,
      0,
      capAngle
    )
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const arcticDome = new THREE.Mesh(domeGeo, domeMat)
    scene.add(arcticDome)

    // Phased-Array Beam Matrix (Starlink Cells): 180 subtle white luminous dots
    const dotCount = 180
    const dotPositions = new Float32Array(dotCount * 3)
    for (let d = 0; d < dotCount; d++) {
      const u = Math.random()
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(1 - u * (1 - Math.cos(capAngle)))
      const r = EARTH_RADIUS * 1.014
      dotPositions[d * 3] = r * Math.sin(phi) * Math.cos(theta)
      dotPositions[d * 3 + 1] = r * Math.cos(phi)
      dotPositions[d * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const dotsGeo = new THREE.BufferGeometry()
    dotsGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3))
    const dotsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.70,
      sizeAttenuation: false,
    })
    scene.add(new THREE.Points(dotsGeo, dotsMat))

    // Arctic Boundary Contour Ring (White/Silver)
    const circleRingGeo = new THREE.BufferGeometry()
    const ringPts: THREE.Vector3[] = []
    const ringR = EARTH_RADIUS * 1.014 * Math.sin(capAngle)
    const ringY = EARTH_RADIUS * 1.014 * Math.cos(capAngle)
    for (let a = 0; a <= 96; a++) {
      const rad = (a / 96) * Math.PI * 2
      ringPts.push(new THREE.Vector3(ringR * Math.cos(rad), ringY, ringR * Math.sin(rad)))
    }
    circleRingGeo.setFromPoints(ringPts)
    const circleRingMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.40,
      linewidth: 1.5,
    })
    scene.add(new THREE.LineLoop(circleRingGeo, circleRingMat))

    // Groups for dynamic aerospace entities
    const orbitRingsGroup = new THREE.Group()
    scene.add(orbitRingsGroup)
    orbitRingsGroupRef.current = orbitRingsGroup

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
      prevMousePos = { x: e.clientX, y: e.clientY }
      downPos = { x: e.clientX, y: e.clientY }
      downTime = performance.now()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevMousePos.x
        const dy = e.clientY - prevMousePos.y
        prevMousePos = { x: e.clientX, y: e.clientY }

        spherical.theta -= dx * 0.007
        spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - dy * 0.007))
        camera.position.setFromSpherical(spherical)
        camera.lookAt(0, 0, 0)
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
        if (satGroupRef.current) {
          const hits = raycaster.intersectObjects(satGroupRef.current.children, true)
          for (const hit of hits) {
            let o: THREE.Object3D | null = hit.object
            while (o && !o.userData?.type) o = o.parent
            if (o && o.userData?.type) {
              if (o.userData.type === 'ground') {
                useSimulationStore.getState().setSelectedClient(o.userData.id)
                return
              } else if (o.userData.type === 'satellite') {
                useSimulationStore.getState().setSelectedSatellite(o.userData.id)
                return
              }
            }
          }
        }
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      spherical.radius = Math.max(9, Math.min(60, spherical.radius + e.deltaY * 0.015))
      camera.position.setFromSpherical(spherical)
      camera.lookAt(0, 0, 0)
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

    // Animation Loop
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Subtle realistic clouds drifting
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.00012
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
    while (group.children.length > 0) group.remove(group.children[0])

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
    const linksGroup = linksGroupRef.current
    const routeGroup = routeGroupRef.current

    // Clear previous
    while (satGroup.children.length > 0) satGroup.remove(satGroup.children[0])
    while (linksGroup.children.length > 0) linksGroup.remove(linksGroup.children[0])
    while (routeGroup.children.length > 0) routeGroup.remove(routeGroup.children[0])

    // 1. Ground Stations on Earth Surface (Interactive, Click-to-Select)
    for (const g of activeScenario.ground_sites) {
      const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)
      const pos = ecefToThree(gx, gy, gz)
      const isClient = g.role === 'client'
      const isSelected = g.id === selectedClientId

      // Pin pedestal
      const pinGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.16, 8)
      const pinMat = new THREE.MeshBasicMaterial({
        color: isClient ? (isSelected ? 0xffffff : 0xa1a1aa) : 0x93c5fd,
      })
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      pinMesh.position.copy(pos)
      pinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      pinMesh.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
      satGroup.add(pinMesh)

      // Interactive Ground Marker Dot (generous hit target)
      const dotRadius = isSelected ? 0.14 : isClient ? 0.11 : 0.13
      const dotGeo = new THREE.SphereGeometry(dotRadius, 12, 12)
      const dotMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xffffff : isClient ? 0xd4d4d8 : 0x93c5fd,
      })
      const dotMesh = new THREE.Mesh(dotGeo, dotMat)
      dotMesh.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.12)))
      dotMesh.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
      satGroup.add(dotMesh)

      // Ground Target Ring if Selected
      if (isSelected) {
        const ringGeo = new THREE.RingGeometry(0.24, 0.30, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.90,
        })
        const ringMesh = new THREE.Mesh(ringGeo, ringMat)
        ringMesh.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.04)))
        ringMesh.lookAt(pos.clone().multiplyScalar(2))
        satGroup.add(ringMesh)
      }

      // Floating text label above ground station
      const groundLabel = createTextSprite(
        g.role === 'gateway' ? `[ШЛЮЗ] ${g.name}` : `[АБОНЕНТ] ${g.id}`,
        isSelected ? '#ffffff' : '#cbd5e1',
        0.75,
        0.18
      )
      groundLabel.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.36)))
      groundLabel.userData = { type: 'ground', id: g.id, name: g.name, role: g.role }
      satGroup.add(groundLabel)
    }

    // 2. Build Satellites (Orbit Tracker Point + Opposite 3D Spacecraft Model + Floating Codename Labels)
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
      const isSelected = sat.id === selectedSatelliteId
      const isInRoute = activeRoutePath.includes(sat.id)
      const codename = CODENAMES[sat.id] || `Sat-${sat.id}`

      // A. Orbital Tracker Node
      const dotColor = !sat.active ? 0xf87171 : isInRoute ? 0xffffff : isSelected ? 0xffffff : 0xe4e4e7
      const trackerDot = new THREE.Mesh(
        reticleCoreGeo,
        new THREE.MeshBasicMaterial({ color: dotColor })
      )
      trackerDot.userData = { type: 'satellite', id: sat.id }
      satGroup.add(trackerDot)

      // Reticle Arc Bracket around the tracker point
      const arcMat = new THREE.MeshBasicMaterial({
        color: !sat.active ? 0xf87171 : isSelected ? 0xffffff : 0x94a3b8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.65,
      })
      const arcMesh = new THREE.Mesh(reticleArcGeo, arcMat)
      arcMesh.userData = { type: 'satellite', id: sat.id }
      satGroup.add(arcMesh)

      // Thin guide link line connecting tracker point to 3D satellite model
      const linkGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
      const linkMat = new THREE.LineBasicMaterial({
        color: sat.active ? 0xd4d4d8 : 0xf87171,
        transparent: true,
        opacity: 0.35,
      })
      const linkLine = new THREE.Line(linkGeo, linkMat)
      satGroup.add(linkLine)

      // 3D Model with solar panels and antenna dish
      const satModel = createSatelliteModel(sat.id, sat.active, isSelected, isInRoute)
      satGroup.add(satModel)

      // Floating Text Label above the node
      const labelColor = !sat.active ? '#fca5a5' : isSelected ? '#ffffff' : '#cbd5e1'
      const label = createTextSprite(codename, labelColor, 0.70, 0.17)
      label.userData = { type: 'satellite', id: sat.id }
      satGroup.add(label)

      // Halo ring for selected satellite
      let innerRingMesh: THREE.Mesh | undefined
      let outerRingMesh: THREE.Mesh | undefined
      if (isSelected) {
        const innerRingGeo = new THREE.RingGeometry(0.22, 0.27, 24)
        const innerRingMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
        innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat)
        satGroup.add(innerRingMesh)

        const outerRingGeo = new THREE.RingGeometry(0.32, 0.36, 24)
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
        trackerDot,
        arcMesh,
        satModel,
        linkLine,
        label,
        innerRingMesh,
        outerRingMesh,
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
      color: 0xffffff,
      linewidth: 2.0,
    })
    const routeMesh = new THREE.Line(routeGeo, routeMat)
    routeGroup.add(routeMesh)
    routeLineRef.current = routeMesh
  }, [activeScenario, activeRoutePath, selectedClientId, selectedSatelliteId])

  // Continuous real-time position update function
  const updateRealtimePositions = useCallback(
    (t: number) => {
      if (!activeScenario || satNodesMapRef.current.size === 0) return

      const positions = computePositions(activeScenario, t)
      const satPosMap = new Map<string, THREE.Vector3>()

      for (const sat of positions) {
        const node = satNodesMapRef.current.get(sat.id)
        const pos = ecefToThree(sat.x_km, sat.y_km, sat.z_km)
        satPosMap.set(sat.id, pos)

        if (node) {
          const radial = pos.clone().normalize()
          node.trackerDot.position.copy(pos)
          node.arcMesh.position.copy(pos)
          node.arcMesh.lookAt(pos.clone().multiplyScalar(2))

          const tangent = new THREE.Vector3(-pos.z, 0, pos.x).normalize()
          const satModelPos = pos.clone().add(tangent.clone().multiplyScalar(0.35))
          node.satModel.position.copy(satModelPos)
          node.satModel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial)

          node.linkLine.geometry.setFromPoints([pos, satModelPos])
          node.label.position.copy(pos.clone().add(radial.clone().multiplyScalar(0.28)))

          if (node.innerRingMesh && node.outerRingMesh) {
            node.innerRingMesh.position.copy(pos)
            node.innerRingMesh.lookAt(pos.clone().multiplyScalar(2))
            node.outerRingMesh.position.copy(pos)
            node.outerRingMesh.lookAt(pos.clone().multiplyScalar(2))
          }
        }
      }

      // Update ISL links
      if (islLineRef.current && currentSnap) {
        const linkPositions: number[] = []
        for (const [u, v] of currentSnap.edges) {
          const posU = satPosMap.get(u)
          const posV = satPosMap.get(v)
          if (posU && posV) {
            linkPositions.push(posU.x, posU.y, posU.z, posV.x, posV.y, posV.z)
          }
        }
        islLineRef.current.geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(linkPositions, 3)
        )
      }

      // Update active route
      if (routeLineRef.current) {
        if (activeRoutePath.length >= 2) {
          const routePoints: THREE.Vector3[] = []
          for (const nodeId of activeRoutePath) {
            const gNode = activeScenario.ground_sites.find((g) => g.id === nodeId)
            if (gNode) {
              const [gx, gy, gz] = groundPosition(gNode.lat_deg, gNode.lon_deg)
              routePoints.push(ecefToThree(gx, gy, gz))
            } else {
              const sPos = satPosMap.get(nodeId)
              if (sPos) routePoints.push(sPos.clone())
            }
          }
          routeLineRef.current.geometry.setFromPoints(routePoints)
          routeLineRef.current.visible = true
        } else {
          routeLineRef.current.visible = false
        }
      }
    },
    [activeScenario, currentSnap, activeRoutePath]
  )

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
