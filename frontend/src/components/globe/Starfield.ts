import * as THREE from 'three'

/**
 * Creates a subtle, realistic starfield background with natural variation in star brightness and color.
 */
export function createStarfield(count = 2500, minDistance = 150, maxDistance = 400): THREE.Points {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const tempColor = new THREE.Color()

  for (let i = 0; i < count; i++) {
    // Generate spherical distribution
    const theta = 2 * Math.PI * Math.random()
    const phi = Math.acos(2 * Math.random() - 1)
    const distance = minDistance + Math.random() * (maxDistance - minDistance)

    const x = distance * Math.sin(phi) * Math.cos(theta)
    const y = distance * Math.sin(phi) * Math.sin(theta)
    const z = distance * Math.cos(phi)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Subtle star colors: cool white, soft pale blue, warm pale yellow
    const rand = Math.random()
    if (rand < 0.6) {
      tempColor.setRGB(0.9, 0.95, 1.0)
    } else if (rand < 0.85) {
      tempColor.setRGB(0.7, 0.82, 1.0)
    } else {
      tempColor.setRGB(1.0, 0.95, 0.8)
    }

    // Varied brightness
    const lum = 0.4 + Math.random() * 0.6
    colors[i * 3] = tempColor.r * lum
    colors[i * 3 + 1] = tempColor.g * lum
    colors[i * 3 + 2] = tempColor.b * lum
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: false,
  })

  return new THREE.Points(geometry, material)
}
