import {
  BlendMode,
  Texture,
  TextureFilter,
  TextureWrap,
} from "@esotericsoftware/spine-core";
import * as THREE from "three";

export class ThreeJsTexture extends Texture {
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
