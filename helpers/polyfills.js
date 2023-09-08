import { Image } from "react-native";
import * as THREE from "three";
import { Asset } from "expo-asset";
import * as fs from "expo-file-system";
import { ThreeJsTexture } from "../spineOverwrite/ThreeJsTexture";

export function polyfills() {
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

        const localUri = fs.cacheDirectory + uuidv4() + `.${type}`;
        await fs.writeAsStringAsync(localUri, data, {
          encoding: fs.EncodingType.Base64,
        });

        return { localUri };
      }
    }

    // Download bundler module or external URL
    const asset = Asset.fromModule(input);

    // Unpack assets in Android Release Mode
    if (!asset.uri.includes(":")) {
      const localUri = `${fs.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`;
      await fs.copyAsync({ from: asset.uri, to: localUri });
      return { localUri };
    }

    // Otherwise, resolve from registry
    return asset.downloadAsync();
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
}
