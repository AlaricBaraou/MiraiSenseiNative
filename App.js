import * as React from "react";
import { StyleSheet } from "react-native";
import { Canvas, useFrame, useLoader } from "@react-three/fiber/native";
import * as THREE from "three";
import * as spine from "@esotericsoftware/spine-threejs";
import { useAssets, Asset } from "expo-asset";
import { getDebugShader } from "./helpers/getDebugShader";
import { polyfills } from "./helpers/polyfills";
import { useloadLocalAsset } from "./helpers/useloadLocalAsset";
import { loadAndReadAsset } from "./helpers/loadAndReadAsset";

polyfills();

const SpineLoad = ({
  assetDebugPng,
  assetRaptorPng,
  assetRaptorJSON,
  assetRaptorAtlas,
}) => {
  const spineContRef = React.useRef();
  const spineSkeletonRef = React.useRef();

  const textures = useLoader(THREE.TextureLoader, assetDebugPng.localUri);

  const [skeletonMesh, setSkeletonMesh] = React.useState(null);
  const [debugSpineTexture, setDebugSpineTexture] = React.useState("");

  const raptorJSON = useloadLocalAsset(assetRaptorJSON.localUri);
  const raptorAtlas = useloadLocalAsset(assetRaptorAtlas.localUri);

  React.useEffect(() => {
    // load the assets required to display the Raptor model
    if (!raptorAtlas || !raptorJSON || !textures) return;

    const assetManager = new spine.AssetManager("");

    assetManager.assets["raptor-pro.json"] = raptorJSON;
    let atlasTexture = new spine.TextureAtlas(raptorAtlas);

    const textureLoader = new THREE.TextureLoader();
    async function loadPages() {
      for (let page of atlasTexture.pages) {
        const textureAsset = await loadAndReadAsset(page.name);
        const promise = new Promise((res) => {
          textureLoader.loadSpineTexture(textureAsset.localUri, (texture) => {
            setDebugSpineTexture(texture.texture);
            assetManager.assets[page.name] = texture;
            page.setTexture(texture);
            assetManager.assets["raptor.atlas"] = atlasTexture;

            // for (let region of page.regions) {
            //   console.log("region texture", region.texture);
            // }

            res();
          });
        });
        await promise;

        console.log("assetManager.assets", Object.keys(assetManager.assets));
      }

      // Load the texture atlas using name.atlas and name.png from the AssetManager.
      // The function passed to TextureAtlas is used to resolve relative paths.
      const atlas = assetManager.require("raptor.atlas");

      // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
      const atlasLoader = new spine.AtlasAttachmentLoader(atlas);

      // Create a SkeletonJson instance for parsing the .json file.
      const skeletonJson = new spine.SkeletonJson(atlasLoader);
      skeletonJson.scale = 0.4;

      let skeletonData = skeletonJson.readSkeletonData(
        assetManager.require("raptor-pro.json")
      );

      // Create a SkeletonMesh from the data and attach it to the scene
      const _skeletonMesh = new spine.SkeletonMesh(
        skeletonData,
        (parameters) => {
          parameters.depthTest = false;
          parameters.depthWrite = false;
          parameters.wireframe = true;
          // parameters.alphaTest = 0.001;

          setTimeout(() => {
            _skeletonMesh.batches[0].material[0] = getDebugShader();
            console.log("set blue");
          }, 2000);
        }
      );
      _skeletonMesh.state.setAnimation(0, "walk", true);

      setSkeletonMesh(_skeletonMesh);
      spineSkeletonRef.current = _skeletonMesh;
    }
    loadPages();
  }, [raptorAtlas, raptorJSON, textures]);

  useFrame(({ gl, scene, camera }, delta) => {
    if (spineSkeletonRef.current) {
      // update the animation
      spineSkeletonRef.current.update(delta);
    }
    camera.position.x = 0;
    camera.position.y = 100;
    camera.position.z = 600;
    camera.far = 3000;
    camera.updateProjectionMatrix();
    spineContRef.current.rotation.y += 1 * delta;
    scene.updateMatrixWorld(true);
    scene.updateWorldMatrix(true, true);
    // gl.render(scene, camera);
  });

  return (
    <>
      {skeletonMesh ? <primitive object={skeletonMesh} /> : null}
      {textures ? (
        <mesh position={[0, -300, 0]}>
          <boxGeometry args={[200, 200, 200]} />
          <meshBasicMaterial map={textures} />
        </mesh>
      ) : null}
      {debugSpineTexture ? (
        //display the texture raptor.png that we downloaded on a cube to confirm it's loaded correctly
        <mesh>
          <boxGeometry args={[200, 200, 200]} />
          <meshBasicMaterial map={debugSpineTexture} color={0x00ff00} />
        </mesh>
      ) : null}
      <mesh ref={spineContRef}>
        {
          //a container for the skeletonMesh
        }
        <boxGeometry args={[200, 200, 200]} />
        <meshBasicMaterial color={0xff0000} wireframe={true} />
      </mesh>
    </>
  );
};

const SpineTest = () => {
  const [assets, error] = useAssets([
    require("./assets/raptordebug.png"),
    require("./assets/raptor.png"),
    require("./assets/raptor-pro.jsonasset"),
    require("./assets/raptor.atlas"),
  ]);

  return assets ? (
    <SpineLoad
      assetDebugPng={assets[0]}
      assetRaptorPng={assets[1]}
      assetRaptorJSON={assets[2]}
      assetRaptorAtlas={assets[3]}
    />
  ) : null;
};

export default function App() {
  return (
    <Canvas
      onCreated={(state) => {
        //remove the warning EXGL: gl.pixelStorei() doesn't support this parameter yet!
        // from https://github.com/expo/expo/issues/11063#issuecomment-1334808263
        const _gl = state.gl.getContext();
        // const pixelStorei = _gl.pixelStorei.bind(_gl);
        // _gl.pixelStorei = function (...args) {
        //   const [parameter] = args;
        //   switch (parameter) {
        //     case _gl.UNPACK_FLIP_Y_WEBGL:
        //       return pixelStorei(...args);
        //   }
        // };
      }}
    >
      <React.Suspense fallback={null}>
        <SpineTest />
      </React.Suspense>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
