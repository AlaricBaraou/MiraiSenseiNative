import * as THREE from "three";

export function getDebugShader() {
  const vertexShader = `
      void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
  `;

  // Fragment Shader
  const fragmentShader = `
      void main() {
          gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // RGBA for blue color
      }
  `;

  // Create the ShaderMaterial using the shaders above
  const blueShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      map: { value: null },
    },
    side: THREE.DoubleSide,
    name: "blue",
  });

  return blueShaderMaterial;
}
