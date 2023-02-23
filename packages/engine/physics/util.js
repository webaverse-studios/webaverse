import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {IdAllocator} from '../id-allocator.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();

//

const physicsIdAllcator = new IdAllocator();
export const getNextPhysicsId = physicsIdAllcator.alloc.bind(physicsIdAllcator);
export const freePhysicsId = physicsIdAllcator.free.bind(physicsIdAllcator);

//

export function convertMeshToPhysicsMesh(topMesh) {
  const oldParent = topMesh.parent;
  oldParent && oldParent.remove(topMesh);

  topMesh.updateMatrixWorld();

  const meshes = [];
  topMesh.traverse((o) => {
    if (o.isMesh) {
      meshes.push(o);
    }
  });
  const newGeometries = meshes.map((mesh) => {
    const {geometry} = mesh;
    const newGeometry = new THREE.BufferGeometry();
    if (mesh.isSkinnedMesh) {
      localMatrix2.identity();
    } else {
      localMatrix2.copy(mesh.matrixWorld);
    }

    if (geometry.attributes.position.isInterleavedBufferAttribute) {
      const positions = new Float32Array(
        geometry.attributes.position.count * 3
      );
      for (
        let i = 0, j = 0;
        i < positions.length;
        i += 3, j += geometry.attributes.position.data.stride
      ) {
        localVector
          .fromArray(geometry.attributes.position.data.array, j)
          .applyMatrix4(localMatrix2)
          .toArray(positions, i);
      }
      newGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
    } else {
      const positions = new Float32Array(
        geometry.attributes.position.array.length
      );
      for (let i = 0; i < positions.length; i += 3) {
        localVector
          .fromArray(geometry.attributes.position.array, i)
          .applyMatrix4(localMatrix2)
          .toArray(positions, i);
      }
      newGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
    }

    if (geometry.index) {
      newGeometry.setIndex(geometry.index);
    }

    return newGeometry;
  });
  
  if (oldParent) {
    oldParent.add(topMesh);
    topMesh.updateMatrixWorld();
  }

  let physicsMesh;
  if (newGeometries.length > 0) {
    const newGeometry =
      BufferGeometryUtils.mergeBufferGeometries(newGeometries);
    physicsMesh = new THREE.Mesh(newGeometry);
  } else {
    physicsMesh = new THREE.Mesh();
  }
  physicsMesh.visible = false;

  physicsMesh.matrixWorld.copy(topMesh.matrixWorld);
  physicsMesh.matrix.copy(topMesh.matrixWorld)
    .decompose(physicsMesh.position, physicsMesh.quaternion, physicsMesh.scale);

  return physicsMesh;
}

export function parseCoord(s) {
  if (s) {
    const split = s.match(/^\[(-?[0-9\.]+),(-?[0-9\.]+),(-?[0-9\.]+)\]$/);
    let x, y, z;
    if (
      split &&
      !isNaN((x = parseFloat(split[1]))) &&
      !isNaN((y = parseFloat(split[2]))) &&
      !isNaN((z = parseFloat(split[3])))
    ) {
      return new THREE.Vector3(x, y, z);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export function parseExtents(s) {
  if (s) {
    const split = s.match(
      /^\[\[(-?[0-9\.]+),(-?[0-9\.]+),(-?[0-9\.]+)\],\[(-?[0-9\.]+),(-?[0-9\.]+),(-?[0-9\.]+)\]\]$/
    );
    let x1, y1, z1, x2, y2, z2;
    if (
      split &&
      !isNaN((x1 = parseFloat(split[1]))) &&
      !isNaN((y1 = parseFloat(split[2]))) &&
      !isNaN((z1 = parseFloat(split[3]))) &&
      !isNaN((x2 = parseFloat(split[4]))) &&
      !isNaN((y2 = parseFloat(split[5]))) &&
      !isNaN((z2 = parseFloat(split[6])))
    ) {
      return new THREE.Box3(
        new THREE.Vector3(x1, y1, z1),
        new THREE.Vector3(x2, y2, z2)
      );
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export function isInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export async function contentIdToFile(contentId) {
  let token = null;
  if (typeof contentId === 'number') {
    const res = await fetch(`${tokensHost}/${contentId}`);
    token = await res.json();
    const {hash, name, ext} = token.properties;

    const res2 = await fetch(`${storageHost}/${hash}`);
    const file = await res2.blob();
    file.name = `${name}.${ext}`;
    file.token = token;
    return file;
  } else if (typeof contentId === 'string') {
    let url, name;
    if (/blob:/.test(contentId)) {
      const match = contentId.match(/^(.+)\/([^\/]+)$/);
      if (match) {
        url = match[1];
        name = match[2];
      } else {
        console.warn(
          'blob url not appended with /filename.ext and cannot be interpreted',
          contentId
        );
        return null;
      }
    } else {
      url = contentId;
      name = contentId;
    }
    return {
      url,
      name,
      token,
    };
  } else {
    console.warn('unknown content id type', contentId);
    return null;
  }
}

export const addDefaultLights = (scene/*, { shadowMap = false } = {} */) => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);
  scene.ambientLight = ambientLight;
  const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
  directionalLight.position.set(1, 2, 3);
  scene.add(directionalLight);
  scene.directionalLight = directionalLight;
  /* if (shadowMap) {
    const SHADOW_MAP_WIDTH = 1024;
    const SHADOW_MAP_HEIGHT = 1024;

    directionalLight.castShadow = true;

    directionalLight.shadow.camera = new THREE.PerspectiveCamera( 50, 1, 0.1, 50 );
    // directionalLight.shadow.bias = 0.0001;

    directionalLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    directionalLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
  } */
};

export const unFrustumCull = (o) => {
  o.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = false;
    }
  });
};

/* export const enableShadows = (o) => {
  o.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}; */

export const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

export const epochStartTime = Date.now();

export const flipGeomeryUvs = (geometry) => {
  for (let i = 0; i < geometry.attributes.uv.array.length; i += 2) {
    const j = i + 1;
    geometry.attributes.uv.array[j] = 1 - geometry.attributes.uv.array[j];
  }
};

export const updateRaycasterFromMouseEvent = (() => {
  return (renderer, camera, e, raycaster) => {
    const mouse = localVector2D;
    mouse.x =
      (e.clientX / renderer.domElement.width) * renderer.getPixelRatio() * 2 -
      1;
    mouse.y =
      -((e.clientY / renderer.domElement.height) * renderer.getPixelRatio()) *
        2 +
      1;
    raycaster.setFromCamera(mouse, camera);
  };
})();
export const getCameraUiPlane = (camera, distance, plane) => {
  plane.setFromNormalAndCoplanarPoint(
    localVector3.set(0, 0, 1).applyQuaternion(camera.quaternion),
    localVector4
      .copy(camera.position)
      .add(localVector5.set(0, 0, -distance).applyQuaternion(camera.quaternion))
  );
  return plane;
};
export const getUiForwardIntersection = (() => {
  const localRaycaster = new THREE.Raycaster();
  const localPlane = new THREE.Plane();
  return (renderer, camera, e, v) => {
    updateRaycasterFromMouseEvent(renderer, camera, e, localRaycaster);
    // project mesh outwards
    const cameraUiPlane = getCameraUiPlane(camera, 2, localPlane);
    const intersection = localRaycaster.ray.intersectPlane(cameraUiPlane, v);
    return intersection;
  };
})();

export function makeId(length) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function getLockChunkId(chunkPosition) {
  return `chunk:${chunkPosition.x}, ${chunkPosition.y}, ${chunkPosition.z}}`;
}

export function mod(a, n) {
  return ((a % n) + n) % n;
}

export const modUv = (uv) => {
  uv.x = mod(uv.x, 1);
  uv.y = mod(uv.y, 1);
  return uv;
};

export function angleDifference(angle1, angle2) {
  let a = angle2 - angle1;
  a = mod(a + Math.PI, Math.PI * 2) - Math.PI;
  return a;
}

export function getVelocityDampingFactor(dampingPer60Hz, timeDiff) {
  return Math.pow(dampingPer60Hz, timeDiff / 60);
}

export function getPlayerPrefix(playerId) {
  return playersMapName + '.' + playerId;
}

/* export function fitCameraToBox(camera, boundingBox, fitOffset = 1) {
  const center = boundingBox.getCenter(localVector);
  const size = boundingBox.getSize(localVector2);

  const maxSize = Math.max( size.x, size.y, size.z );
  const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * camera.fov / 360 ) );
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max( fitHeightDistance, fitWidthDistance );

  camera.position.z = distance;
  // camera.lookAt(center);
  camera.updateMatrixWorld();
} */

export function fitCameraToBoundingBox(camera, box, fitOffset = 1) {
  const size = box.getSize(localVector);
  const center = box.getCenter(localVector2);

  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance =
    maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

  const direction = center
    .clone()
    .sub(camera.position)
    .normalize()
    .multiplyScalar(distance);

  camera.near = Math.min(0.1, maxSize / 20.0);
  camera.updateProjectionMatrix();
  camera.position.copy(center).add(direction);
  camera.quaternion.setFromRotationMatrix(
    localMatrix.lookAt(camera.position, center, camera.up)
  );
}

export function applyVelocity(position, velocity, timeDiffS) {
  position.add(localVector.copy(velocity).multiplyScalar(timeDiffS));
}

export function copyPQS(dst, src) {
  dst.position.copy(src.position);
  dst.quaternion.copy(src.quaternion);
  dst.scale.copy(src.scale);
}

export async function loadJson(u) {
  const res = await fetch(u);
  return await res.json();
}
export async function loadImageBitmap(u) {
  const res = await fetch(u);
  const blob = await res.blob();
  const imageBitmap = await createImageBitmap(blob);
  return imageBitmap;
}
export async function loadAudio(u) {
  const audio = new Audio();
  const p = new Promise((accept, reject) => {
    const timeout = setTimeout(() => {
      console.warn('audio load seems hung', audio);
    }, audioTimeoutTime);
    const _cleanup = () => {
      clearTimeout(timeout);
    };
    audio.oncanplay = () => {
      _cleanup();
      accept();
    };
    audio.onerror = (err) => {
      _cleanup();
      reject(err);
    };
  });
  // console.log('got src', `../sounds/${soundType}/${fileName}`);
  audio.crossOrigin = 'Anonymous';
  audio.src = u;
  audio.load();
  await p;
  // document.body.appendChild(audio);
  return audio;
}
export async function loadAudioBuffer(audioContext, url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}
export const memoize = (fn) => {
  let loaded = false;
  let cache = null;
  return () => {
    if (!loaded) {
      cache = fn();
      loaded = true;
    }
    return cache;
  };
};
export function shuffle(array, rng = Math.random) {
  let currentIndex = array.length;
    let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(rng() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}
export const waitForFrame = () =>
  new Promise((accept) => {
    requestAnimationFrame(() => {
      accept();
    });
  });

const doUpload = async (u, f, {onProgress = null} = {}) => {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', u, true);
  // xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.responseType = 'json';
  xhr.upload.onprogress = (e) => {
    // const {lengthComputable, loaded, total} = e;
    // console.log();
    onProgress && onProgress(e);
  };
  const j = await new Promise((accept, reject) => {
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        accept(xhr.response);
      } else {
        const err = new Error('invalid status code: ' + xhr.status);
        reject(err);
      }
    };
    xhr.onerror = reject;
    xhr.send(f);
  });
  return j;
  /* const res = await fetch(u, {
    method: 'POST',
    body: f,
  });
  const hashes = await res.json();
  return hashes; */
};
export const proxifyUrl = (u) => {
  const match = u.match(/^([a-z0-9]+):\/\/([a-z0-9\-\.]+)(.+)$/i);
  if (match) {
    return (
      'https://' +
      match[1] +
      '-' +
      match[2].replace(/\-/g, '--').replace(/\./g, '-') +
      '.proxy.webaverse.com' +
      match[3]
    );
  } else {
    return u;
  }
};
export const createRelativeUrl = (u, baseUrl) => {
  if (/^(?:[\.\/]|([a-z0-9]+):\/\/)/i.test(u)) {
    return u;
  } else {
    if (!/([a-z0-9]+):\/\//i.test(baseUrl)) {
      baseUrl = new URL(baseUrl, window.location.href).href;
    }
    return new URL(u, baseUrl).href;
  }
};
export const getDropUrl = (o) => {
  let u = null;
  if (typeof o?.start_url === 'string') {
    u = o.start_url;
  }
  return u;
};
export const handleDropJsonItem = async (item) => {
  if (item?.kind === 'string') {
    const s = await new Promise((accept, reject) => {
      item.getAsString(accept);
    });
    const j = jsonParse(s);
    if (j) {
      const u = getDropUrl(j);
      return u;
    } /* else {
      console.warn('not uploading unknown json object', j);
      // return null;
    } */
  }
  return null;
};
export const handleUpload = async (item, {onProgress = null} = {}) => {
  console.log('uploading...', item);

  const _handleFileList = async (item) => {
    const formData = new FormData();

    formData.append(
      '',
      new Blob([], {
        type: 'application/x-directory',
      }),
      ''
    );

    const files = item;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      formData.append(file.name, file, file.name);
    }

    const hashes = await doUpload(`https://ipfs.webaverse.com/`, formData, {
      onProgress,
    });

    const rootDirectory = hashes.find((h) => h.name === '');
    const rootDirectoryHash = rootDirectory.hash;
    return `https://ipfs.webaverse.com/ipfs/${rootDirectoryHash}/`;
  };
  const _handleString = (item) => handleDropJsonItem(item);
  const _handleDirectory = async (entry) => {
    const formData = new FormData();

    const rootEntry = entry;
    const _recurse = async (entry) => {
      function getFullPath(entry) {
        return entry.fullPath.slice(rootEntry.fullPath.length);
      }
      const fullPath = getFullPath(entry);
      // console.log('directory full path', entry.fullPath, rootEntry.fullPath, fullPath);
      formData.append(
        fullPath,
        new Blob([], {
          type: 'application/x-directory',
        }),
        fullPath
      );

      const reader = entry.createReader();
      async function readEntries() {
        const entries = await new Promise((accept, reject) => {
          reader.readEntries((entries) => {
            if (entries.length > 0) {
              accept(entries);
            } else {
              accept(null);
            }
          }, reject);
        });
        return entries;
      }
      let entriesArray;
      while ((entriesArray = await readEntries())) {
        for (const entry of entriesArray) {
          if (entry.isFile) {
            const file = await new Promise((accept, reject) => {
              entry.file(accept, reject);
            });
            const fullPath = getFullPath(entry);

            formData.append(fullPath, file, fullPath);
          } else if (entry.isDirectory) {
            await _recurse(entry);
          }
        }
      }
    };
    await _recurse(rootEntry);

    const hashes = await doUpload(`https://ipfs.webaverse.com/`, formData, {
      onProgress,
    });

    const rootDirectory = hashes.find((h) => h.name === '');
    const rootDirectoryHash = rootDirectory.hash;
    return `https://ipfs.webaverse.com/ipfs/${rootDirectoryHash}/`;
  };
  const _handleFile = async (file) => {
    const j = await doUpload(`https://ipfs.webaverse.com/`, file, {
      onProgress,
    });
    const {hash} = j;
    const {name} = file;

    return `${storageHost}/${hash}/${name}`;
  };
  const _uploadObject = async (item) => {
    let u = null;

    if (item instanceof FileList) {
      u = _handleFileList(item);
    } else {
      if (item.kind === 'string') {
        u = await _handleString(item);
      } else {
        const entry = item.webkitGetAsEntry();
        if (entry.isDirectory) {
          u = await _handleDirectory(entry);
        } else {
          const file = item.getAsFile();
          u = await _handleFile(file);
        }
      }
    }
    return u;
  };
  const u = await _uploadObject(item);
  console.log('upload complete:', u);
  return u;
};

export const loadImage = (u) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    resolve(img);
  };
  img.onerror = reject;
  img.crossOrigin = 'Anonymous';
  img.src = u;
});
export const blob2img = async blob => {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};
export const img2canvas = img => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas;
};
export const canvas2blob = async (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(resolve, type, quality);
});
export const drawImageContain = (ctx, img) => {
  const imgWidth = img.width;
  const imgHeight = img.height;
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const imgAspect = imgWidth / imgHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  let x, y, width, height;
  if (imgAspect > canvasAspect) {
    // image is wider than canvas
    width = canvasWidth;
    height = width / imgAspect;
    x = 0;
    y = (canvasHeight - height) / 2;
  } else {
    // image is taller than canvas
    height = canvasHeight;
    width = height * imgAspect;
    x = (canvasWidth - width) / 2;
    y = 0;
  }
  ctx.drawImage(img, x, y, width, height);
};
export const canvasHasContent = canvas => {
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.some(n => n !== 0);
  } else {
    return true;
  }
};
export const makeSquareImage = img => {
  const newSize = img.width >= img.height ? img.width : img.height;

  const canvas = document.createElement('canvas');
  canvas.width = newSize;
  canvas.height = newSize;

  // get the top left color of the image
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
  const imageData = ctx.getImageData(0, 0, 1, 1);

  // fill the canvas with the top left color
  ctx.fillStyle = imageData.data[4] > 0 ?
    `rgb(${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]})`
  :
    '#fff';
  ctx.fillRect(0, 0, newSize, newSize);

  // draw the image in the center
  drawImageContain(ctx, img);
  
  return canvas;
};
export const imageToCanvas = (img, w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawImageContain(ctx, img);
  return canvas;
};

export function createCanvas(width, height) {
  if (isWorker) {
    return new OffscreenCanvas(width, height);
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
}

export const isTransferable = (o) => {
  const ctor = o?.constructor;
  return (
    ctor === MessagePort ||
    ctor === ImageBitmap ||
    ctor === ImageData ||
    // ctor === AudioData ||
    // ctor === OffscreenCanvas ||
    ctor === ArrayBuffer ||
    ctor === Uint8Array ||
    ctor === Int8Array ||
    ctor === Uint16Array ||
    ctor === Int16Array ||
    ctor === Uint32Array ||
    ctor === Int32Array ||
    ctor === Float32Array ||
    ctor === Float64Array
  );
};
export const getTransferables = (o) => {
  const result = [];
  const _recurse = (o) => {
    if (Array.isArray(o)) {
      for (const e of o) {
        _recurse(e);
      }
    } else if (o && typeof o === 'object') {
      if (isTransferable(o)) {
        result.push(o);
      } else {
        for (const k in o) {
          _recurse(o[k]);
        }
      }
    }
  };
  _recurse(o);
  return result;
};
export const selectVoice = (voicer) => {
  const weightedRandom = (weights) => {
    let totalWeight = 0;
    for (let i = 0; i < weights.length; i++) {
      totalWeight += weights[i];
    }

    let random = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      if (random < weights[i]) {
        return i;
      }
      random -= weights[i];
    }

    return -1;
  };
  // the weight of each voice is proportional to the inverse of the number of times it has been used
  const maxNonce = voicer.reduce((max, voice) => Math.max(max, voice.nonce), 0);
  const weights = voicer.map(({nonce}) => {
    return 1 - nonce / (maxNonce + 1);
  });
  const selectionIndex = weightedRandom(weights);
  const voiceSpec = voicer[selectionIndex];
  voiceSpec.nonce++;
  while (voicer.every((voice) => voice.nonce > 0)) {
    for (const voiceSpec of voicer) {
      voiceSpec.nonce--;
    }
  }
  return voiceSpec;
};
export const splitLinesToWidth = (() => {
  let tempCanvas = null;
  const _getTempCanvas = () => {
    if (tempCanvas === null) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = 0;
      tempCanvas.height = 0;
    }
    return tempCanvas;
  };

  return (text, font, maxWidth) => {
    const canvas = _getTempCanvas();
    const ctx = canvas.getContext('2d');
    ctx.font = font;

    let lines = [];
    const words = text.split(' ');

    // We'll be constantly removing words from our words array to build our lines. Once we're out of words, we can stop
    while (words.length > 0) {
      let tmp = words[0]; // Capture the current word, in case we need to re-add it to array
      let line = words.shift(); // Start our line with the first word available to us

      // Now we'll continue adding words to our line until we've exceeded our budget
      while (words.length && ctx.measureText(line).width < maxWidth) {
        tmp = words[0];
        line += ' ' + words.shift();
      }

      // If the line is too long, remove the last word and replace it in words array.
      // This will happen on all but the last line, as we anticipate exceeding the length to break out of our second while loop
      if (ctx.measureText(line).width > maxWidth) {
        const lastSpaceIndex = line.lastIndexOf(' ');
        if (lastSpaceIndex !== -1) {
          line = line.substring(0, lastSpaceIndex);
          words.unshift(tmp);
        } else {
          const part1 = line.substring(0, 12) + '-';
          const part2 = line.substring(12);
          line = part1;
          words.push(part2);
        }
      }

      // Push the finshed line into the array
      lines.push(line);
    }

    return lines;
  };
})();

export const getJsDataUrl = src => `data:application/javascript;charset=utf-8,${encodeURIComponent(src)}`

export const fetchArrayBuffer = async srcUrl => {
  const res = await fetch(srcUrl);
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    return arrayBuffer;
  } else {
    throw new Error('failed to load: ' + res.status + ' ' + srcUrl);
  }
};

export const align = (v, N) => {
  const r = v % N;
  return r === 0 ? v : v - r + N;
};
export const align4 = v => align(v, 4);

export const getClosestPowerOf2 = size => Math.ceil(Math.log2(size));

export const getBoundingSize = boundingType => {
  switch (boundingType) {
    case 'sphere': return 4;
    case 'box': return 6;
    default: return 0;
  }
};

export const lookAtQuaternion = (dirVec)=>{
  var mx = new THREE.Matrix4().lookAt(new THREE.Vector3(0,0,0), dirVec, new THREE.Vector3(0,1,0));
  return new THREE.Quaternion().setFromRotationMatrix(mx);
};

export function makePromise() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}