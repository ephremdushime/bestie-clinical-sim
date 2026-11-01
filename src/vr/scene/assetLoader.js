import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Cache loaded GLTF models to avoid redundant downloads
const MODEL_CACHE = new Map();
const gltfLoader = new GLTFLoader();

/**
 * Loads a GLTF / GLB model and parses interaction metadata according to the
 * Bestie 3D Asset Production Specification.
 *
 * Automatically binds:
 * - INTERACT_* -> interactables list with pointer raycasting
 * - SCREEN_*   -> displays designated for dynamic canvas textures
 * - MOVE_*     -> articulated sub-components (backrests, levers)
 * - SOCKET_*   -> mounting points for accessories
 */
export async function loadHospitalAsset(url, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  interactables = [],
  fallbackBuilder = null,
} = {}) {
  try {
    let gltf;
    if (MODEL_CACHE.has(url)) {
      gltf = MODEL_CACHE.get(url).clone(true);
    } else {
      gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(url, resolve, undefined, reject);
      });
      MODEL_CACHE.set(url, gltf.scene);
      gltf = gltf.scene.clone(true);
    }

    gltf.position.set(...position);
    gltf.rotation.set(...rotation);
    gltf.scale.set(...scale);

    const screens = {};
    const sockets = {};
    const movingParts = {};

    gltf.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;

        const name = node.name || '';
        if (name.startsWith('INTERACT_')) {
          const actionKey = name.replace('INTERACT_', '').toLowerCase().replace(/_/g, ':');
          node.userData = { action: actionKey, label: node.name };
          interactables.push(node);
        } else if (name.startsWith('SCREEN_')) {
          const screenKey = name.replace('SCREEN_', '').toLowerCase();
          screens[screenKey] = node;
        } else if (name.startsWith('MOVE_')) {
          const moveKey = name.replace('MOVE_', '').toLowerCase();
          movingParts[moveKey] = node;
        }
      } else if (node.name && node.name.startsWith('SOCKET_')) {
        const socketKey = node.name.replace('SOCKET_', '').toLowerCase();
        sockets[socketKey] = node;
      }
    });

    return {
      group: gltf,
      isProcedural: false,
      screens,
      sockets,
      movingParts,
    };
  } catch (err) {
    console.warn(`[AssetLoader] Could not load GLB from ${url}. Falling back to procedural asset.`, err);
    if (typeof fallbackBuilder === 'function') {
      const fallback = fallbackBuilder();
      return {
        group: fallback.group || fallback,
        isProcedural: true,
        ...fallback,
      };
    }
    return null;
  }
}

