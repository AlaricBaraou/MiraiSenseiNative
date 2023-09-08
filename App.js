import * as React from "react";
import { Image, StyleSheet } from "react-native";
import { Canvas, useFrame, useLoader } from "@react-three/fiber/native";
import * as THREE from "three";
import * as spine from "@esotericsoftware/spine-threejs";
import { useAssets, Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import {
  BlendMode,
  Texture,
  TextureFilter,
  TextureWrap,
} from "@esotericsoftware/spine-core";

const ASSETS_MAP = {
  "raptor.png": require("./assets/raptor.png"),
};

async function loadAndReadAsset(key) {
  const atlasAsset = Asset.fromModule(ASSETS_MAP[key]);

  await atlasAsset.downloadAsync(); // Ensure the asset is downloaded

  return atlasAsset;
}

async function getAsset(input) {
  console.log("getAsset input", input);
  if (typeof input === "string") {
    // Point to storage if preceded with fs path
    if (input.startsWith("file:")) return { localUri: input };

    // Unpack Blobs from react-native BlobManager
    if (input.startsWith("blob:")) {
      const blob =
        (await new Promise()) <
        Blob >
        ((res, rej) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", input);
          xhr.responseType = "blob";
          xhr.onload = () => res(xhr.response);
          xhr.onerror = rej;
          xhr.send();
        });

      const data =
        (await new Promise()) <
        string >
        ((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsText(blob);
        });

      input = `data:${blob.type};base64,${data}`;
    }

    // Create safe URI for JSI
    if (input.startsWith("data:")) {
      const [header, data] = input.split(",");
      const [, type] = header.split("/");

      const localUri = FileSystem.cacheDirectory + uuidv4() + `.${type}`;
      await FileSystem.writeAsStringAsync(localUri, data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { localUri };
    }
  }

  // Download bundler module or external URL
  const asset = Asset.fromModule(input);

  // Unpack assets in Android Release Mode
  if (!asset.uri.includes(":")) {
    const localUri = `${FileSystem.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`;
    await FileSystem.copyAsync({ from: asset.uri, to: localUri });
    return { localUri };
  }

  // Otherwise, resolve from registry
  return asset.downloadAsync();
}

class ThreeJsTexture extends Texture {
  texture;

  constructor(image) {
    super(image);
    this.texture = new THREE.Texture(image);
    this.texture.flipY = false;
    this.texture.needsUpdate = true;
  }

  setFilters(minFilter, magFilter) {
    this.texture.minFilter = ThreeJsTexture.toThreeJsTextureFilter(minFilter);
    this.texture.magFilter = ThreeJsTexture.toThreeJsTextureFilter(magFilter);
  }

  setWraps(uWrap, vWrap) {
    this.texture.wrapS = ThreeJsTexture.toThreeJsTextureWrap(uWrap);
    this.texture.wrapT = ThreeJsTexture.toThreeJsTextureWrap(vWrap);
  }

  dispose() {
    this.texture.dispose();
  }

  static toThreeJsTextureFilter(filter) {
    if (filter === TextureFilter.Linear) return THREE.LinearFilter;
    else if (filter === TextureFilter.MipMap)
      return THREE.LinearMipMapLinearFilter; // also includes TextureFilter.MipMapLinearLinear
    else if (filter === TextureFilter.MipMapLinearNearest)
      return THREE.LinearMipMapNearestFilter;
    else if (filter === TextureFilter.MipMapNearestLinear)
      return THREE.NearestMipMapLinearFilter;
    else if (filter === TextureFilter.MipMapNearestNearest)
      return THREE.NearestMipMapNearestFilter;
    else if (filter === TextureFilter.Nearest) return THREE.NearestFilter;
    else throw new Error("Unknown texture filter: " + filter);
  }

  static toThreeJsTextureWrap(wrap) {
    if (wrap === TextureWrap.ClampToEdge) return THREE.ClampToEdgeWrapping;
    else if (wrap === TextureWrap.MirroredRepeat)
      return THREE.MirroredRepeatWrapping;
    else if (wrap === TextureWrap.Repeat) return THREE.RepeatWrapping;
    else throw new Error("Unknown texture wrap: " + wrap);
  }

  static toThreeJsBlending(blend) {
    if (blend === BlendMode.Normal) return THREE.NormalBlending;
    else if (blend === BlendMode.Additive) return THREE.AdditiveBlending;
    else if (blend === BlendMode.Multiply) return THREE.MultiplyBlending;
    else if (blend === BlendMode.Screen) return THREE.CustomBlending;
    else throw new Error("Unknown blendMode: " + blend);
  }
}

THREE.TextureLoader.prototype.loadSpineTexture = function load(
  url,
  onLoad,
  onProgress,
  onError
) {
  if (this.path) url = this.path + url;

  getAsset(url)
    .then(async (asset) => {
      const uri = asset.localUri || asset.uri;

      if (!asset.width || !asset.height) {
        const { width, height } = await new Promise((res, rej) =>
          Image.getSize(uri, (width, height) => res({ width, height }), rej)
        );
        asset.width = width;
        asset.height = height;
      }

      console.log("iciiiiiiiii", uri);
      const texture = new ThreeJsTexture({
        data: { localUri: uri },
        width: asset.width,
        height: asset.height,
      });

      console.log("laaaaaaaaaaaaaaaaaa", texture);

      // texture.texture.unpackAlignment = 1;
      texture.texture.needsUpdate = true;

      // Force non-DOM upload for EXGL fast paths
      // @ts-ignore
      texture.texture.isDataTexture = true;

      onLoad?.(texture);
    })
    .catch(onError);

  return null;
};

const SpineLoad = ({ asset }) => {
  const spineContRef = React.useRef();
  const spineSkeletonRef = React.useRef();
  // console.log("test log SpineLoad", asset);
  // const assettt = Asset.fromModule(asset.localUri);
  // console.log("assettt", assettt);

  // const jsonload = useLoader(THREE.FileLoader, asset.uri);
  const textures = useLoader(THREE.TextureLoader, asset.localUri);

  // console.log("jsonload", jsonload);

  // console.log("textures", textures);
  // console.log("jsonload", jsonload);

  const [isReady, setIsReady] = React.useState(false);
  const [fileContent, setFileContent] = React.useState("");
  const [fileContentJSON, setFileContentJSON] = React.useState("");
  const [skeletonMesh, setSkeletonMesh] = React.useState(null);
  const [debugSpineTexture, setDebugSpineTexture] = React.useState("");
  const [debugDynamicTexture, setDebugDynamicTexture] = React.useState("");

  React.useEffect(() => {
    async function loadAndReadAsset() {
      const atlasAsset = Asset.fromModule(require("./assets/raptor.atlas"));

      await atlasAsset.downloadAsync(); // Ensure the asset is downloaded

      try {
        const content = await FileSystem.readAsStringAsync(atlasAsset.localUri);
        setFileContent(content);
        setIsReady(true);
      } catch (error) {
        console.error("Error reading the file", error);
      }
    }

    loadAndReadAsset();
  }, []);

  React.useEffect(() => {
    async function loadAndReadAsset() {
      const atlasAsset = Asset.fromModule(
        require("./assets/raptor-pro.jsonasset")
      );

      await atlasAsset.downloadAsync(); // Ensure the asset is downloaded

      try {
        const content = await FileSystem.readAsStringAsync(atlasAsset.localUri);
        setFileContentJSON(content);
      } catch (error) {
        console.error("Error reading the file", error);
      }
    }

    loadAndReadAsset();
  }, []);

  React.useEffect(() => {
    // load the assets required to display the Raptor model

    if (!fileContent || !fileContentJSON || !textures) return;

    const assetManager = new spine.AssetManager("");
    // console.log("assetManager.loadText", assetManager.loadText);

    // assetManager.loadText(asset.uri);
    assetManager.assets["raptor-pro.json"] = fileContentJSON;

    console.log("fileContent", fileContent);
    let atlasTexture = new spine.TextureAtlas(fileContent);

    // console.log("assetManager", assetManager);

    const textureLoader = new THREE.TextureLoader();
    async function loadPages() {
      for (let page of atlasTexture.pages) {
        console.log("page.name", page.name);
        const textureAsset = await loadAndReadAsset(page.name);
        console.log("textureAsset", textureAsset);
        const promise = new Promise((res) => {
          textureLoader.loadSpineTexture(textureAsset.localUri, (texture) => {
            console.log("texture iciiiiiiiiiiiiiiiiiiiiii", texture);
            // const textureSpine = new ThreeJsTexture(image);
            // const textureThree = new THREE.Texture(texture.image);

            setDebugSpineTexture(texture.texture);
            // setDebugDynamicTexture(texture.texture);
            console.log("page.name", page.name, texture);
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

      var vertexShader = `
      void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
  `;

      // Fragment Shader
      var fragmentShader = `
      void main() {
          gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // RGBA for blue color
      }
  `;

      // Create the ShaderMaterial using the shaders above
      var blueShaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
          map: { value: null },
        },
        side: THREE.DoubleSide,
        name: "blue",
      });

      // Create a SkeletonMesh from the data and attach it to the scene
      const _skeletonMesh = new spine.SkeletonMesh(
        skeletonData,
        (parameters) => {
          parameters.depthTest = false;
          parameters.depthWrite = false;
          parameters.wireframe = true;
          // parameters.alphaTest = 0.001;

          setTimeout(() => {
            _skeletonMesh.batches[0].material[0] = blueShaderMaterial;
            console.log("set blue");
          }, 2000);
        }
      );
      // _skeletonMesh.state.setAnimation(0, "walk", true);

      // spineContRef.current.add(_skeletonMesh);
      _skeletonMesh.name = "debugSkeletonMesh";
      setSkeletonMesh(_skeletonMesh);
      spineSkeletonRef.current = _skeletonMesh;

      // console.log("_skeletonMesh.batches[0]", _skeletonMesh.batches[0]);

      // console.log(
      //   "assetManager.assets pages",
      //   assetManager.assets["raptor.atlas"].pages[0].texture
      // );
      // setDebugDynamicTexture(assetManager.assets["raptor.png"].texture);
      // console.log("leys assetManager.assets", Object.keys(assetManager.assets));
      // console.log("spineSkeletonRef.current", spineSkeletonRef.current.matrix);
    }
    loadPages();

    // console.log("atlas", atlas);
    // assetManager.loadTextureAtlas(atlasFile);
  }, [fileContent, fileContentJSON, textures]);

  var vertexShader = `
      void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
  `;

  // Fragment Shader
  var fragmentShader = `
      void main() {
          gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); // RGBA for blue color
      }
  `;

  // Create the ShaderMaterial using the shaders above
  var blueShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      map: { value: null },
    },
    side: THREE.DoubleSide,
    name: "blue",
  });

  useFrame(({ gl, scene, camera }, delta) => {
    if (spineSkeletonRef.current) {
      // update the animation
      spineSkeletonRef.current.update(delta);
      spineSkeletonRef.current.frustumCulled = false;
      if (Math.random() > 0.99) {
        console.log(
          "spineSkeletonRef.current"

          // spineSkeletonRef.current.batches[0].geometry.getAttribute("position")
          //   .array[0],
          // spineSkeletonRef.current.batches[0].geometry.getAttribute("position")
          //   .array[1],
          // spineSkeletonRef.current.batches[0].geometry.getAttribute("position")
          //   .array[2]
        );
      }
    }
    camera.position.x = 0;
    camera.position.y = 100;
    camera.position.z = 600;
    camera.far = 3000;
    camera.updateProjectionMatrix();
    spineContRef.current.rotation.y += 1 * delta;
    if (spineContRef.current.children[0]) {
      // console.log(spineContRef.current.children[0].children[0]);
      // console.log(spineContRef.current.children[0].children);
      // console.log(Object.keys(spineContRef.current.children[0]));
    }
    // console.log(Object.keys(spineContRef.current.children[0]));
    scene.updateMatrixWorld(true);
    scene.updateWorldMatrix(true, true);
    // gl.render(scene, camera);
  });
  // console.log("textures", textures && textures.image);
  // console.log(
  //   "debugSpineTexture",
  //   debugSpineTexture && debugSpineTexture.image
  // );
  // console.log(
  //   "debugDynamicTexture",
  //   debugDynamicTexture && debugDynamicTexture.image
  // );
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
        <mesh>
          <boxGeometry args={[200, 200, 200]} />
          <meshBasicMaterial map={debugSpineTexture} color={0x00ff00} />
        </mesh>
      ) : null}
      {debugDynamicTexture ? (
        <mesh position={[0, 300, 0]}>
          <boxGeometry args={[200, 200, 200]} />
          <meshBasicMaterial map={debugDynamicTexture} />
        </mesh>
      ) : null}
      <mesh ref={spineContRef}>
        <boxGeometry args={[200, 200, 200]} />
        <meshBasicMaterial color={0xff0000} wireframe={true} />
      </mesh>
    </>
  );
};

const SpineTest = () => {
  // console.log("test log in SpineTest");

  const [assets, error] = useAssets([require("./assets/raptordebug.png")]);
  // const [assets, error] = useAssets([require("./assets/raptor-pro.jsonasset")]);

  // console.log("assets[0]", assets && assets[0]);
  // console.log("assets[0]", assets && assets[0].localUri);
  // console.log("error", error);

  return assets && assets[0] ? <SpineLoad asset={assets[0]} /> : null;
};

export default function App() {
  // console.log("test log in App");
  const [assets, error] = useAssets([require("./assets/raptordebug.png")]);

  return (
    <>
      {/* <View style={styles.container}>
        <StatusBar style="auto" />
        {assets ? <Image source={assets[0]} /> : null}
        <Text>Test Mirai sensei!</Text>
      </View> */}
      <Canvas
        onCreated={(state) => {
          const _gl = state.gl.getContext();
          const pixelStorei = _gl.pixelStorei.bind(_gl);
          _gl.pixelStorei = function (...args) {
            const [parameter] = args;
            switch (parameter) {
              case _gl.UNPACK_FLIP_Y_WEBGL:
                return pixelStorei(...args);
            }
          };
        }}
      >
        <React.Suspense fallback={null}>
          <SpineTest />
        </React.Suspense>
        <mesh>
          <dodecahedronGeometry args={[0.1, 2]} />
          <meshBasicMaterial color={"#aaffff"} />
        </mesh>
      </Canvas>
    </>
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
