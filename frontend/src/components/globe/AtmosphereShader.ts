import * as THREE from 'three'

/**
 * Atmospheric glow vertex and fragment shaders.
 * Simulates Rayleigh scattering (thin blue haze at the horizon of the planet).
 */
export const AtmosphereGlowShader = {
  uniforms: {
    color: { value: new THREE.Color(0x38bdf8) },
    coefficient: { value: 0.55 },
    power: { value: 2.8 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float coefficient;
    uniform float power;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 viewDir = normalize(-vPosition);
      float intensity = pow(coefficient - dot(vNormal, viewDir), power);
      intensity = clamp(intensity, 0.0, 1.0);
      gl_FragColor = vec4(color, intensity * 0.8);
    }
  `,
}
