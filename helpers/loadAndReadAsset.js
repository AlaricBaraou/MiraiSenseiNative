import { Asset } from "expo-asset";

const ASSETS_MAP = {
  "raptor.png": require("../assets/raptor.png"),
};

export async function loadAndReadAsset(key) {
  const atlasAsset = Asset.fromModule(ASSETS_MAP[key]);
  await atlasAsset.downloadAsync(); // Ensure the asset is downloaded
  return atlasAsset;
}
