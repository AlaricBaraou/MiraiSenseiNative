import * as React from "react";
import { useFrame } from "@react-three/fiber/native";
import * as THREE from "three";

export function Ring({
  count,
  color,
  radius,
  speedFactor,
  rotX,
  rotY,
  ...props
}) {
  const group = React.useRef();
  const mesh = React.useRef();
  //save
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  // console.log("test log in Ring");

  useFrame((state) => {
    group.current.rotation.y += rotY;
    group.current.rotation.x += rotX;

    const swirlFactor = 3;
    for (let i = 0; i < count; i++) {
      const iPer1 = (i / count) * 2 * Math.PI;
      const iPer2 = (i / count) * swirlFactor * Math.PI;

      dummy.position.set(
        Math.cos(state.clock.elapsedTime / speedFactor + iPer1) * radius,
        Math.sin(state.clock.elapsedTime / speedFactor + iPer1) * radius,
        0
      );
      dummy.rotation.set(iPer2, 0, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={group} {...props}>
      <instancedMesh ref={mesh} args={[null, null, count]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshPhongMaterial color={color} />
      </instancedMesh>
    </group>
  );
}
