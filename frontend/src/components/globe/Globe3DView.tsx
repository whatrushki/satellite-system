import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useScenarioStore } from '@/stores/scenarioStore'
import { useSimulationStore } from '@/stores/simulationStore'
import { groundPosition } from '@/core/geometryEngine'
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

export const Globe3DView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeScenario = useScenarioStore((state) => state.activeScenario)
  const {
    currentTime_s,
    selectedClientId,
    selectedSatelliteId,
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

    const sunLight = new THREE.DirectionalLight(0xfffaee, 2.4)
    sunLight.position.set(26, 16, 22)
    scene.add(sunLight)

    const spaceFill = new THREE.DirectionalLight(0x38bdf8, 0.20)
    spaceFill.position.set(-20, -10, -20)
    scene.add(spaceFill)

    // Texture Loader
    const textureLoader = new THREE.TextureLoader()
    const earthMap = textureLoader.load('/earth_atmos_2048.jpg')
    const specularMap = textureLoader.load('/earth_specular_2048.jpg')
    const normalMap = textureLoader.load('/earth_normal_2048.jpg')
    const cloudsMap = textureLoader.load('/earth_clouds_1024.png')

    // 1. Photorealistic Earth Globe
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
      opacity: 0.82,
      blending: THREE.NormalBlending,
      depthWrite: false,
    })
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat)
    cloudsMesh.rotation.y = -Math.PI / 2
    scene.add(cloudsMesh)
    cloudsMeshRef.current = cloudsMesh

    // 3. Atmospheric Rim Glow (Rayleigh scattering)
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

    // 4. THE SPACEX ARCTIC COVERAGE DOME (CRITICAL HERO VISUAL)
    // Geometry: Spherical cap covering latitudes from 66.5°N to 90.0°N (capAngle = ((90 - 66.5) * Math.PI) / 180)
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
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const arcticDome = new THREE.Mesh(domeGeo, domeMat)
    scene.add(arcticDome)

    // Phased-Array Beam Matrix (Starlink Cells): A THREE.Points lattice of 180 luminous dots randomly distributed across the cap sphere surface
    const dotCount = 180
    const dotPositions = new Float32Array(dotCount * 3)
    for (let d = 0; d < dotCount; d++) {
      const u = Math.random()
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(1 - u * (1 - Math.cos(capAngle)))
      const r = EARTH_RADIUS * 1.014
      dotPositions[d * 3] = r * Math.sin(phi) * Math.cos(theta)
      dotPositions[d * 3 + 1] = r * Math.cos(phi) // +Y is North Pole
      dotPositions[d * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const dotsGeo = new THREE.BufferGeometry()
    dotsGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3))
    const dotsMat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: false,
    })
    scene.add(new THREE.Points(dotsGeo, dotsMat))

    // Arctic Boundary Contour Ring: A smooth 3D circular line around the perimeter of the 66.5°N circle (color: 0x38bdf8, linewidth: 1.5, opacity: 0.65)
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
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
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

    // Mouse Controls (Euler Orbit)
    let isDragging = false
    let prevMousePos = { x: 0, y: 0 }
    let spherical = new THREE.Spherical(26, Math.PI / 3, Math.PI / 4)

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - prevMousePos.x
      const dy = e.clientY - prevMousePos.y
      prevMousePos = { x: e.clientX, y: e.clientY }

      spherical.theta -= dx * 0.007
      spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi - dy * 0.007))
      camera.position.setFromSpherical(spherical)
      camera.lookAt(0, 0, 0)
    }

    const onMouseUp = () => {
      isDragging = false
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
      let ringColor = 0x38bdf8
      if (plane.id === 'P2') ringColor = 0x818cf8
      else if (plane.id === 'P3') ringColor = 0x34d399

      const ringMat = new THREE.LineBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.35,
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

    // 1. Ground Stations on Earth Surface
    for (const g of activeScenario.ground_sites) {
      const [gx, gy, gz] = groundPosition(g.lat_deg, g.lon_deg)
      const pos = ecefToThree(gx, gy, gz)
      const isClient = g.role === 'client'
      const isSelected = g.id === selectedClientId

      const pinGeo = new THREE.CylinderGeometry(0.02, 0.05, 0.15, 8)
      const pinMat = new THREE.MeshBasicMaterial({
        color: isClient ? (isSelected ? 0xf59e0b : 0xd97706) : 0x818cf8,
      })
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      pinMesh.position.copy(pos)
      pinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
      satGroup.add(pinMesh)

      const dotGeo = new THREE.SphereGeometry(isClient ? 0.08 : 0.11, 10, 10)
      const dotMat = new THREE.MeshBasicMaterial({
        color: isClient ? (isSelected ? 0xfcd34d : 0xf59e0b) : 0xa5b4fc,
      })
      const dotMesh = new THREE.Mesh(dotGeo, dotMat)
      dotMesh.position.copy(pos.clone().add(pos.clone().normalize().multiplyScalar(0.12)))
      satGroup.add(dotMesh)
    }

    if (!currentSnap) return

    const satPosMap = new Map<string, THREE.Vector3>()

    // 2. Satellites (48 Active Satellites rendered as matte geometric sphere nodes)
    const satGeo = new THREE.SphereGeometry(0.12, 16, 16)
    for (const sat of currentSnap.satellites) {
      const pos = ecefToThree(sat.x_km, sat.y_km, sat.z_km)
      satPosMap.set(sat.id, pos)

      let color = 0x38bdf8
      if (sat.plane_id === 'P2') color = 0x818cf8
      else if (sat.plane_id === 'P3') color = 0x34d399

      if (!sat.active) color = 0xef4444
      if (activeRoutePath.includes(sat.id)) color = 0x22c55e

      const isSelected = sat.id === selectedSatelliteId
      const satMat = new THREE.MeshBasicMaterial({ color })
      const mesh = new THREE.Mesh(satGeo, satMat)
      mesh.position.copy(pos)
      satGroup.add(mesh)

      // Concentric double halo ring for selected satellite: THREE.RingGeometry(0.2, 0.25, 24)
      if (isSelected) {
        // Inner Halo Ring
        const innerRingGeo = new THREE.RingGeometry(0.2, 0.25, 24)
        const innerRingMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        })
        const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat)
        innerRingMesh.position.copy(pos)
        innerRingMesh.lookAt(pos.clone().multiplyScalar(2))
        satGroup.add(innerRingMesh)

        // Outer Halo Ring
        const outerRingGeo = new THREE.RingGeometry(0.3, 0.34, 24)
        const outerRingMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        })
        const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat)
        outerRingMesh.position.copy(pos)
        outerRingMesh.lookAt(pos.clone().multiplyScalar(2))
        satGroup.add(outerRingMesh)
      }
    }

    // 3. Inter-Satellite Links (ISL Mesh)
    const linkPositions: number[] = []
    for (const [u, v] of currentSnap.edges) {
      const posU = satPosMap.get(u)
      const posV = satPosMap.get(v)
      if (posU && posV) {
        linkPositions.push(posU.x, posU.y, posU.z, posV.x, posV.y, posV.z)
      }
    }
    if (linkPositions.length > 0) {
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3))
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.35,
      })
      linksGroup.add(new THREE.LineSegments(lineGeo, lineMat))
    }

    // 4. Active Route (Ground -> Sat ... -> Gateway)
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

      if (routePoints.length >= 2) {
        const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints)
        const routeMat = new THREE.LineBasicMaterial({
          color: 0x22c55e,
          linewidth: 2.5,
        })
        routeGroup.add(new THREE.Line(routeGeo, routeMat))
      }
    }
  }, [currentSnap, activeScenario, activeRoutePath, selectedClientId, selectedSatelliteId])

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#06080d]">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  )
}
