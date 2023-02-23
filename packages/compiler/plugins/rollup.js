import path from 'path';
import url, {URL} from 'url';
import mimeTypes from 'mime-types';
import {createHash} from 'crypto';
import postcss from 'postcss';
import cssModules from 'postcss-modules';
import {contractNames} from '../constants.js';

import cryptovoxels from '../contracts/cryptovoxels.js';
import moreloot from '../contracts/moreloot.js';
import loomlock from '../contracts/loomlock.js';

import jsx from '../types/jsx.js';
import metaversefile from '../types/metaversefile.js';
import glb from '../types/glb.js';
import vrm from '../types/vrm.js';
import vox from '../types/vox.js';
import image from '../types/image.js';
import gif from '../types/gif.js';
import glbb from '../types/glbb.js';
import gltj from '../types/gltj.js';
import html from '../types/html.js';
import scn from '../types/scn.js';
import light from '../types/light.js';
import text from '../types/text.js';
import video from '../types/video.js';
// import fog from '../types/fog.js';
// import background from '../types/background.js';
import rendersettings from '../types/rendersettings.js';
import spawnpoint from '../types/spawnpoint.js';
import wind from '../types/wind.js';
import lore from '../types/lore.js';
import quest from '../types/quest.js';
import npc from '../types/npc.js';
import mob from '../types/mob.js';
import react from '../types/react.js';
import group from '../types/group.js';
import vircadia from '../types/vircadia.js';
import directory from '../types/directory.js';
import zine from '../types/zine.js';
import item from '../types/item.js';

// import upath from 'unix-path';
import {getCwd, readFile} from '../util.js';

const contracts = {
  cryptovoxels,
  moreloot,
  loomlock,
};
const loaders = {
  js: jsx,
  jsx,
  metaversefile,
  glb,
  vrm,
  vox,
  png: image,
  jpg: image,
  jpeg: image,
  svg: image,
  mp4: video,
  mov: video,
  gif,
  glbb,
  gltj,
  html,
  scn,
  light,
  text,
  // fog,
  // background,
  rendersettings,
  spawnpoint,
  lore,
  quest,
  npc,
  mob,
  react,
  group,
  wind,
  vircadia,
  zine,
  item,
  '': directory,
};

const dataUrlRegex = /^data:([^;,]+)(?:;(charset=utf-8|base64))?,([\s\S]*?)\.data$/;
const dataUrlRegexNoSuffix = /^data:([^;,]+)(?:;(charset=utf-8|base64))?,([\s\S]*?)$/;
const _getType = id => {
  const o = url.parse(id, true);
  // console.log('get type', o, o.href.match(dataUrlRegex));
  let match;
  if (o.href && (match = o.href.match(dataUrlRegexNoSuffix))) {
    let type = match[1] || '';
    if (type === 'text/javascript') {
      type = 'application/javascript';
    }
    let extension;
    let match2;
    if (match2 = type.match(/^application\/(light|text|rendersettings|spawnpoint|lore|quest|npc|mob|react|group|wind|vircadia|item)$/)) {
      extension = match2[1];
    } else if (match2 = type.match(/^application\/(javascript)$/)) {
      extension = 'js';
    } else {
      extension = mimeTypes.extension(type);
    }
    // console.log('got data extension', {type, extension});
    return extension || '';
  } else if (o.hash && (match = o.hash.match(/^#type=(.+)$/))) {
    return match[1] || '';
  } else if (o.query && o.query.type) {
    return o.query.type;
  } else if (match = o.path.match(/\.([^\.\/]+)$/)) {
    return match[1].toLowerCase() || '';
  } else {
    return '';
  }
};

/* const _resolvePathName = (pathName , source) => {
  // This check is specifically added because of windows
  // as windows is converting constantly all forward slashes into
  // backward slash
  if (process.platform === 'win32') {
    pathName = pathName.replaceAll('\\','/').replaceAll('//','/');
    pathName = path.resolve(upath.parse(pathName).dir, source);
    // Whenever path.resolve returns the result in windows it add the drive letter as well
    // Slice the drive letter (c:/, e:/, d:/ ) from the path and change backward slash
    // back to forward slash.
    pathName = pathName.slice(3).replaceAll('\\','/');
  } else {
    pathName = path.resolve(path.dirname(pathName), source);
  }
  return pathName;
}; */

const _resolveLoaderId = loaderId => {
  /**
   * This check is specifically added because of windows 
   * as windows is converting constantly all forward slashes into
   * backward slash
   */
  // console.log(loaderId);
  // const cwd = getCwd();
  if(process.platform === 'win32'){
    // if(loaderId.startsWith(cwd) || loaderId.replaceAll('/','\\').startsWith(cwd)){
    //  loaderId = loaderId.slice(cwd.length);
    // }else if(loaderId.startsWith('http') || loaderId.startsWith('https')){
    //  loaderId = loaderId.replaceAll('\\','/');
    // }
    loaderId = loaderId.replaceAll('\\','/');

    // if(loaderId.startsWith('http') || loaderId.startsWith('https')){
    //   loaderId = loaderId.replaceAll('\\','/');
    // }
  }
  return loaderId;
}

const mappedModules = {
  'metaversefile': {
    resolveId(source, importer) {
      // return source;
      return `/@map/${source}`;
    },
    load(id) {
      // console.log('return mapped', id);
      return {
        code: `\
          const {metaversefile} = globalThis.Metaversefile.exports;
          export default metaversefile;
        `,
      };
    },
  },
  'three': {
    resolveId(source, importer) {
      // return source;
      return `/@map/${source}`;
    },
    load(id) {
      // console.log('return mapped', id);
      return {
        // code: `import * as THREE from '/public/three.module.js';`,
        code: `\
          const {THREE} = globalThis.Metaversefile.exports;
          const { ACESFilmicToneMapping, AddEquation, AddOperation, AdditiveAnimationBlendMode, AdditiveBlending, AlphaFormat, AlwaysDepth, AlwaysStencilFunc, AmbientLight, AmbientLightProbe, AnimationClip, AnimationLoader, AnimationMixer, AnimationObjectGroup, AnimationUtils, ArcCurve, ArrayCamera, ArrowHelper, Audio, AudioAnalyser, AudioContext, AudioListener, AudioLoader, AxesHelper, BackSide, BasicDepthPacking, BasicShadowMap, Bone, BooleanKeyframeTrack, Box2, Box3, Box3Helper, BoxBufferGeometry, BoxGeometry, BoxHelper, BufferAttribute, BufferGeometry, BufferGeometryLoader, ByteType, Cache, Camera, CameraHelper, CanvasTexture, CapsuleBufferGeometry, CapsuleGeometry, CatmullRomCurve3, CineonToneMapping, CircleBufferGeometry, CircleGeometry, ClampToEdgeWrapping, Clock, Color, ColorKeyframeTrack, ColorManagement, CompressedTexture, CompressedTextureLoader, ConeBufferGeometry, ConeGeometry, CubeCamera, CubeReflectionMapping, CubeRefractionMapping, CubeTexture, CubeTextureLoader, CubeUVReflectionMapping, CubicBezierCurve, CubicBezierCurve3, CubicInterpolant, CullFaceBack, CullFaceFront, CullFaceFrontBack, CullFaceNone, Curve, CurvePath, CustomBlending, CustomToneMapping, CylinderBufferGeometry, CylinderGeometry, Cylindrical, Data3DTexture, DataArrayTexture, DataTexture, DataTexture2DArray, DataTexture3D, DataTextureLoader, DataUtils, DecrementStencilOp, DecrementWrapStencilOp, DefaultLoadingManager, DepthFormat, DepthStencilFormat, DepthTexture, DirectionalLight, DirectionalLightHelper, DiscreteInterpolant, DodecahedronBufferGeometry, DodecahedronGeometry, DoubleSide, DstAlphaFactor, DstColorFactor, DynamicCopyUsage, DynamicDrawUsage, DynamicReadUsage, EdgesGeometry, EllipseCurve, EqualDepth, EqualStencilFunc, EquirectangularReflectionMapping, EquirectangularRefractionMapping, Euler, EventDispatcher, ExtrudeBufferGeometry, ExtrudeGeometry, FileLoader, FlatShading, Float16BufferAttribute, Float32BufferAttribute, Float64BufferAttribute, FloatType, Fog, FogExp2, Font, FontLoader, FramebufferTexture, FrontSide, Frustum, GLBufferAttribute, GLSL1, GLSL3, GreaterDepth, GreaterEqualDepth, GreaterEqualStencilFunc, GreaterStencilFunc, GridHelper, Group, HalfFloatType, HemisphereLight, HemisphereLightHelper, HemisphereLightProbe, IcosahedronBufferGeometry, IcosahedronGeometry, ImageBitmapLoader, ImageLoader, ImageUtils, ImmediateRenderObject, IncrementStencilOp, IncrementWrapStencilOp, InstancedBufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer, InstancedMesh, Int16BufferAttribute, Int32BufferAttribute, Int8BufferAttribute, IntType, InterleavedBuffer, InterleavedBufferAttribute, Interpolant, InterpolateDiscrete, InterpolateLinear, InterpolateSmooth, InvertStencilOp, KeepStencilOp, KeyframeTrack, LOD, LatheBufferGeometry, LatheGeometry, Layers, LessDepth, LessEqualDepth, LessEqualStencilFunc, LessStencilFunc, Light, LightProbe, Line, Line3, LineBasicMaterial, LineCurve, LineCurve3, LineDashedMaterial, LineLoop, LineSegments, LinearEncoding, LinearFilter, LinearInterpolant, LinearMipMapLinearFilter, LinearMipMapNearestFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, LinearToneMapping, Loader, LoaderUtils, LoadingManager, LoopOnce, LoopPingPong, LoopRepeat, LuminanceAlphaFormat, LuminanceFormat, MOUSE, Material, MaterialLoader, MathUtils, Matrix3, Matrix4, MaxEquation, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshDistanceMaterial, MeshLambertMaterial, MeshMatcapMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, MinEquation, MirroredRepeatWrapping, MixOperation, MultiplyBlending, MultiplyOperation, NearestFilter, NearestMipMapLinearFilter, NearestMipMapNearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, NeverDepth, NeverStencilFunc, NoBlending, NoColorSpace, NoToneMapping, NormalAnimationBlendMode, NormalBlending, NotEqualDepth, NotEqualStencilFunc, NumberKeyframeTrack, Object3D, ObjectLoader, ObjectSpaceNormalMap, OctahedronBufferGeometry, OctahedronGeometry, OneFactor, OneMinusDstAlphaFactor, OneMinusDstColorFactor, OneMinusSrcAlphaFactor, OneMinusSrcColorFactor, OrthographicCamera, PCFShadowMap, PCFSoftShadowMap, PMREMGenerator, ParametricGeometry, Path, PerspectiveCamera, Plane, PlaneBufferGeometry, PlaneGeometry, PlaneHelper, PointLight, PointLightHelper, Points, PointsMaterial, PolarGridHelper, PolyhedronBufferGeometry, PolyhedronGeometry, PositionalAudio, PropertyBinding, PropertyMixer, QuadraticBezierCurve, QuadraticBezierCurve3, Quaternion, QuaternionKeyframeTrack, QuaternionLinearInterpolant, REVISION, RGBADepthPacking, RGBAFormat, RGBAIntegerFormat, RGBA_ASTC_10x10_Format, RGBA_ASTC_10x5_Format, RGBA_ASTC_10x6_Format, RGBA_ASTC_10x8_Format, RGBA_ASTC_12x10_Format, RGBA_ASTC_12x12_Format, RGBA_ASTC_4x4_Format, RGBA_ASTC_5x4_Format, RGBA_ASTC_5x5_Format, RGBA_ASTC_6x5_Format, RGBA_ASTC_6x6_Format, RGBA_ASTC_8x5_Format, RGBA_ASTC_8x6_Format, RGBA_ASTC_8x8_Format, RGBA_BPTC_Format, RGBA_ETC2_EAC_Format, RGBA_PVRTC_2BPPV1_Format, RGBA_PVRTC_4BPPV1_Format, RGBA_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGBFormat, RGB_ETC1_Format, RGB_ETC2_Format, RGB_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGB_S3TC_DXT1_Format, RGFormat, RGIntegerFormat, RawShaderMaterial, Ray, Raycaster, RectAreaLight, RedFormat, RedIntegerFormat, ReinhardToneMapping, RepeatWrapping, ReplaceStencilOp, ReverseSubtractEquation, RingBufferGeometry, RingGeometry, SRGBColorSpace, Scene, ShaderChunk, ShaderLib, ShaderMaterial, ShadowMaterial, Shape, ShapeBufferGeometry, ShapeGeometry, ShapePath, ShapeUtils, ShortType, Skeleton, SkeletonHelper, SkinnedMesh, SmoothShading, Source, Sphere, SphereBufferGeometry, SphereGeometry, Spherical, SphericalHarmonics3, SplineCurve, SpotLight, SpotLightHelper, Sprite, SpriteMaterial, SrcAlphaFactor, SrcAlphaSaturateFactor, SrcColorFactor, StaticCopyUsage, StaticDrawUsage, StaticReadUsage, StereoCamera, StreamCopyUsage, StreamDrawUsage, StreamReadUsage, StringKeyframeTrack, SubtractEquation, SubtractiveBlending, TOUCH, TangentSpaceNormalMap, TetrahedronBufferGeometry, TetrahedronGeometry, TextGeometry, Texture, TextureLoader, TorusBufferGeometry, TorusGeometry, TorusKnotBufferGeometry, TorusKnotGeometry, Triangle, TriangleFanDrawMode, TriangleStripDrawMode, TrianglesDrawMode, TubeBufferGeometry, TubeGeometry, UVMapping, Uint16BufferAttribute, Uint32BufferAttribute, Uint8BufferAttribute, Uint8ClampedBufferAttribute, Uniform, UniformsGroup, UniformsLib, UniformsUtils, UnsignedByteType, UnsignedInt248Type, UnsignedIntType, UnsignedShort4444Type, UnsignedShort5551Type, UnsignedShortType, VSMShadowMap, Vector2, Vector3, Vector4, VectorKeyframeTrack, VideoTexture, WebGL1Renderer, WebGL3DRenderTarget, WebGLArrayRenderTarget, WebGLCubeRenderTarget, WebGLMultipleRenderTargets, WebGLMultisampleRenderTarget, WebGLRenderTarget, WebGLRenderer, WebGLUtils, WireframeGeometry, WrapAroundEnding, ZeroCurvatureEnding, ZeroFactor, ZeroSlopeEnding, ZeroStencilOp, _SRGBAFormat, sRGBEncoding } = THREE;
          export { ACESFilmicToneMapping, AddEquation, AddOperation, AdditiveAnimationBlendMode, AdditiveBlending, AlphaFormat, AlwaysDepth, AlwaysStencilFunc, AmbientLight, AmbientLightProbe, AnimationClip, AnimationLoader, AnimationMixer, AnimationObjectGroup, AnimationUtils, ArcCurve, ArrayCamera, ArrowHelper, Audio, AudioAnalyser, AudioContext, AudioListener, AudioLoader, AxesHelper, BackSide, BasicDepthPacking, BasicShadowMap, Bone, BooleanKeyframeTrack, Box2, Box3, Box3Helper, BoxBufferGeometry, BoxGeometry, BoxHelper, BufferAttribute, BufferGeometry, BufferGeometryLoader, ByteType, Cache, Camera, CameraHelper, CanvasTexture, CapsuleBufferGeometry, CapsuleGeometry, CatmullRomCurve3, CineonToneMapping, CircleBufferGeometry, CircleGeometry, ClampToEdgeWrapping, Clock, Color, ColorKeyframeTrack, ColorManagement, CompressedTexture, CompressedTextureLoader, ConeBufferGeometry, ConeGeometry, CubeCamera, CubeReflectionMapping, CubeRefractionMapping, CubeTexture, CubeTextureLoader, CubeUVReflectionMapping, CubicBezierCurve, CubicBezierCurve3, CubicInterpolant, CullFaceBack, CullFaceFront, CullFaceFrontBack, CullFaceNone, Curve, CurvePath, CustomBlending, CustomToneMapping, CylinderBufferGeometry, CylinderGeometry, Cylindrical, Data3DTexture, DataArrayTexture, DataTexture, DataTexture2DArray, DataTexture3D, DataTextureLoader, DataUtils, DecrementStencilOp, DecrementWrapStencilOp, DefaultLoadingManager, DepthFormat, DepthStencilFormat, DepthTexture, DirectionalLight, DirectionalLightHelper, DiscreteInterpolant, DodecahedronBufferGeometry, DodecahedronGeometry, DoubleSide, DstAlphaFactor, DstColorFactor, DynamicCopyUsage, DynamicDrawUsage, DynamicReadUsage, EdgesGeometry, EllipseCurve, EqualDepth, EqualStencilFunc, EquirectangularReflectionMapping, EquirectangularRefractionMapping, Euler, EventDispatcher, ExtrudeBufferGeometry, ExtrudeGeometry, FileLoader, FlatShading, Float16BufferAttribute, Float32BufferAttribute, Float64BufferAttribute, FloatType, Fog, FogExp2, Font, FontLoader, FramebufferTexture, FrontSide, Frustum, GLBufferAttribute, GLSL1, GLSL3, GreaterDepth, GreaterEqualDepth, GreaterEqualStencilFunc, GreaterStencilFunc, GridHelper, Group, HalfFloatType, HemisphereLight, HemisphereLightHelper, HemisphereLightProbe, IcosahedronBufferGeometry, IcosahedronGeometry, ImageBitmapLoader, ImageLoader, ImageUtils, ImmediateRenderObject, IncrementStencilOp, IncrementWrapStencilOp, InstancedBufferAttribute, InstancedBufferGeometry, InstancedInterleavedBuffer, InstancedMesh, Int16BufferAttribute, Int32BufferAttribute, Int8BufferAttribute, IntType, InterleavedBuffer, InterleavedBufferAttribute, Interpolant, InterpolateDiscrete, InterpolateLinear, InterpolateSmooth, InvertStencilOp, KeepStencilOp, KeyframeTrack, LOD, LatheBufferGeometry, LatheGeometry, Layers, LessDepth, LessEqualDepth, LessEqualStencilFunc, LessStencilFunc, Light, LightProbe, Line, Line3, LineBasicMaterial, LineCurve, LineCurve3, LineDashedMaterial, LineLoop, LineSegments, LinearEncoding, LinearFilter, LinearInterpolant, LinearMipMapLinearFilter, LinearMipMapNearestFilter, LinearMipmapLinearFilter, LinearMipmapNearestFilter, LinearSRGBColorSpace, LinearToneMapping, Loader, LoaderUtils, LoadingManager, LoopOnce, LoopPingPong, LoopRepeat, LuminanceAlphaFormat, LuminanceFormat, MOUSE, Material, MaterialLoader, MathUtils, Matrix3, Matrix4, MaxEquation, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshDistanceMaterial, MeshLambertMaterial, MeshMatcapMaterial, MeshNormalMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, MinEquation, MirroredRepeatWrapping, MixOperation, MultiplyBlending, MultiplyOperation, NearestFilter, NearestMipMapLinearFilter, NearestMipMapNearestFilter, NearestMipmapLinearFilter, NearestMipmapNearestFilter, NeverDepth, NeverStencilFunc, NoBlending, NoColorSpace, NoToneMapping, NormalAnimationBlendMode, NormalBlending, NotEqualDepth, NotEqualStencilFunc, NumberKeyframeTrack, Object3D, ObjectLoader, ObjectSpaceNormalMap, OctahedronBufferGeometry, OctahedronGeometry, OneFactor, OneMinusDstAlphaFactor, OneMinusDstColorFactor, OneMinusSrcAlphaFactor, OneMinusSrcColorFactor, OrthographicCamera, PCFShadowMap, PCFSoftShadowMap, PMREMGenerator, ParametricGeometry, Path, PerspectiveCamera, Plane, PlaneBufferGeometry, PlaneGeometry, PlaneHelper, PointLight, PointLightHelper, Points, PointsMaterial, PolarGridHelper, PolyhedronBufferGeometry, PolyhedronGeometry, PositionalAudio, PropertyBinding, PropertyMixer, QuadraticBezierCurve, QuadraticBezierCurve3, Quaternion, QuaternionKeyframeTrack, QuaternionLinearInterpolant, REVISION, RGBADepthPacking, RGBAFormat, RGBAIntegerFormat, RGBA_ASTC_10x10_Format, RGBA_ASTC_10x5_Format, RGBA_ASTC_10x6_Format, RGBA_ASTC_10x8_Format, RGBA_ASTC_12x10_Format, RGBA_ASTC_12x12_Format, RGBA_ASTC_4x4_Format, RGBA_ASTC_5x4_Format, RGBA_ASTC_5x5_Format, RGBA_ASTC_6x5_Format, RGBA_ASTC_6x6_Format, RGBA_ASTC_8x5_Format, RGBA_ASTC_8x6_Format, RGBA_ASTC_8x8_Format, RGBA_BPTC_Format, RGBA_ETC2_EAC_Format, RGBA_PVRTC_2BPPV1_Format, RGBA_PVRTC_4BPPV1_Format, RGBA_S3TC_DXT1_Format, RGBA_S3TC_DXT3_Format, RGBA_S3TC_DXT5_Format, RGBFormat, RGB_ETC1_Format, RGB_ETC2_Format, RGB_PVRTC_2BPPV1_Format, RGB_PVRTC_4BPPV1_Format, RGB_S3TC_DXT1_Format, RGFormat, RGIntegerFormat, RawShaderMaterial, Ray, Raycaster, RectAreaLight, RedFormat, RedIntegerFormat, ReinhardToneMapping, RepeatWrapping, ReplaceStencilOp, ReverseSubtractEquation, RingBufferGeometry, RingGeometry, SRGBColorSpace, Scene, ShaderChunk, ShaderLib, ShaderMaterial, ShadowMaterial, Shape, ShapeBufferGeometry, ShapeGeometry, ShapePath, ShapeUtils, ShortType, Skeleton, SkeletonHelper, SkinnedMesh, SmoothShading, Source, Sphere, SphereBufferGeometry, SphereGeometry, Spherical, SphericalHarmonics3, SplineCurve, SpotLight, SpotLightHelper, Sprite, SpriteMaterial, SrcAlphaFactor, SrcAlphaSaturateFactor, SrcColorFactor, StaticCopyUsage, StaticDrawUsage, StaticReadUsage, StereoCamera, StreamCopyUsage, StreamDrawUsage, StreamReadUsage, StringKeyframeTrack, SubtractEquation, SubtractiveBlending, TOUCH, TangentSpaceNormalMap, TetrahedronBufferGeometry, TetrahedronGeometry, TextGeometry, Texture, TextureLoader, TorusBufferGeometry, TorusGeometry, TorusKnotBufferGeometry, TorusKnotGeometry, Triangle, TriangleFanDrawMode, TriangleStripDrawMode, TrianglesDrawMode, TubeBufferGeometry, TubeGeometry, UVMapping, Uint16BufferAttribute, Uint32BufferAttribute, Uint8BufferAttribute, Uint8ClampedBufferAttribute, Uniform, UniformsGroup, UniformsLib, UniformsUtils, UnsignedByteType, UnsignedInt248Type, UnsignedIntType, UnsignedShort4444Type, UnsignedShort5551Type, UnsignedShortType, VSMShadowMap, Vector2, Vector3, Vector4, VectorKeyframeTrack, VideoTexture, WebGL1Renderer, WebGL3DRenderTarget, WebGLArrayRenderTarget, WebGLCubeRenderTarget, WebGLMultipleRenderTargets, WebGLMultisampleRenderTarget, WebGLRenderTarget, WebGLRenderer, WebGLUtils, WireframeGeometry, WrapAroundEnding, ZeroCurvatureEnding, ZeroFactor, ZeroSlopeEnding, ZeroStencilOp, _SRGBAFormat, sRGBEncoding };
          // export default THREE;
        `,
      };
    },
  },
  'react': {
    resolveId(source, importer) {
      // return source;
      return `/@map/${source}`;
    },
    load(id) {
      // console.log('return mapped', id);
      return {
        code: `\
          const {React} = globalThis.Metaversefile.exports;
          const {forwardRef, createContext, createElement, Fragment, Children, isValidElement, cloneElement, memo, Component, useEffect, useState, useRef, useLayoutEffect, useMemo, useCallback, useContext, useReducer, useImperativeHandle, useDebugValue} = React;
          export {forwardRef, createContext, createElement, Fragment, Children, isValidElement, cloneElement, memo, Component, React, useEffect, useState, useRef, useLayoutEffect, useMemo, useCallback, useContext, useReducer, useImperativeHandle, useDebugValue};
          export default React;
        `,
      };
    },
  },
};

const buildCssModulesJs = async (css, cssFullPath, options = {}) => {
  const {
    localsConvention = 'camelCaseOnly',
    inject = true,
    generateScopedName,
    cssModulesOption = {},
  } = options;

  // const css = await readFile(cssFullPath);

  let cssModulesJSON = {};
  const result = await postcss([
    cssModules({
      localsConvention,
      generateScopedName,
      getJSON(cssSourceFile, json) {
        cssModulesJSON = {...json};
        return cssModulesJSON;
      },
      ...cssModulesOption,
    }),
  ]).process(css, {
    from: cssFullPath,
    map: false,
  });

  const classNames = JSON.stringify(cssModulesJSON);
  const hash = createHash('sha256');
  hash.update(cssFullPath);
  const digest = hash.digest('hex');

  let injectedCode = '';
  if (inject === true) {
    injectedCode = `
(function() {
  if (typeof document === 'undefined') {
    return;
  }
  if (!document.getElementById(digest)) {
    var el = document.createElement('style');
    el.id = digest;
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
    `;
  } else if (typeof inject === 'function') {
    injectedCode = inject(result.css, digest);
  }

  const jsContent = `
const digest = '${digest}';
const css = \`${result.css}\`;
${injectedCode}
export default ${classNames};
export { css, digest };
  `;

  return jsContent;
};

export default function metaversefilePlugin() {
  return {
    name: 'metaversefile',
    enforce: 'pre',
    async resolveId(source, importer) {
      // console.log('resolve id', {source, importer});

      const mappedModule = mappedModules[source];
      if (mappedModule) {
        // console.log('resolve mapped', {source});
        return mappedModule.resolveId(source, importer);
      }

      /* // do not resolve node module subpaths
      if (/^((?:@[^\/]+\/)?[^\/:\.][^\/:]*)(\/[\s\S]*)$/.test(source)) {
        // console.log('resolve bail');
        return null;
      } */

      // scripts/compile.js: handle local compile case
      if (/^\.+\//.test(source)) {
        if (importer) {
          if (/^data:/.test(importer)) {
            const cwd = getCwd();
            // console.log('resolve data');
            return path.join(cwd, source);
          } else {
            const match = importer.match(/^(#[\s\S]*)$/);
            const hash = match ? match[1] : '';
            // const oldSource = source;
            if (/^\//.test(importer)) {
              const fakeBase = 'https://example.com';
              importer = `${fakeBase}${importer}`;
              // console.log('resolve source importer A 1', {source, importer});
              source = new URL(source, importer).href.slice(fakeBase.length) + hash;
              // console.log('resolve source importer A 2', {source, oldSource, importer});
            } else {
              // console.log('resolve source importer B 1', {source, importer});
              source = new URL(source, importer).href + hash;
              // console.log('resolve source importer B 2', {source, oldSource, importer});
            }
          }
        } else {
          source = source.replace(/^\.+/, '');
        }
      }

      let match;
      if (match = source.match(dataUrlRegex)) {
        // source = source.replace(/\.data$/, '');
        source = 'data:' + match[1] +
          (match[2] ? (';' + match[2]) : '') +
          ',' + decodeURIComponent(match[3]);
      }

      // console.log('rollup resolve id', {source, importer});
      if (/^ipfs:\/\//.test(source)) {
        source = source.replace(/^ipfs:\/\/(?:ipfs\/)?/, 'https://cloudflare-ipfs.com/ipfs/');
        
        const o = new url.parse(source, true);
        if (!o.query.type) {
          const res = await fetch(source, {
            method: 'HEAD',
          });
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            const typeTag = mimeTypes.extension(contentType);
            if (typeTag) {
              source += `#type=${typeTag}`;
            } else {
              console.warn('unknown IPFS content type:', contentType);
            }
          } else {
            throw new Error('IPFS content not found: ' + source);
          }
        }
      }

      if (match = source.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/)) {
        const address = match[1];
        const contractName = contractNames[address];
        const contract = contracts[contractName];
        const resolveId = contract?.resolveId;
        // console.log('check contract', resolveId);
        if (resolveId) {
          const source2 = await resolveId(source, importer);
          // console.log('resolve contract', {source, source2});
          return source2;
        }
      }
      /* if (/^weba:\/\//.test(source)) {
        const {resolveId} = protocols.weba;
        const source2 = await resolveId(source, importer);
        return source2;
      } */
      
      const type = _getType(source);
      const loader = loaders[type];
      const resolveId = loader?.resolveId;
      if (resolveId) {
        const source2 = await resolveId(source, importer);
        // console.log('resolve rewrite', {type, source, source2});
        if (source2) {
          // console.log('resolve loader', {source2});
          return source2;
        }
      }
      // console.log('resolve default', {source});
      if (source) {
        return source;
      } else {
        throw new Error(`could not resolve`);
      }
    },
    async load(id) {
      // console.log('got load id', {id});

      if (/\.css$/.test(id)) {
        const css = await readFile(id);
        const result = await buildCssModulesJs(css, id);
        return {
          code: result,
        };
      }

      let match;
      if (match = id.match(/^\/@map\/(.+)$/)) {
        const id2 = match[1];
        const mappedModule = mappedModules[id2];
        if (mappedModule) {
          const res = mappedModule.load(id2);
          // console.log('return result', res);
          return res;
        }
      }

      id = id
        .replace(/^(eth:\/(?!\/))/, '$1/')
        // .replace(/^(weba:\/(?!\/))/, '$1/');
      
      // console.log('contract load match', id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/));
      if (match = id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/)) {
        const address = match[1];
        const contractName = contractNames[address];
        const contract = contracts[contractName];
        const load = contract?.load;
        // console.log('load contract 1', load);
        if (load) {
          const src = await load(id);
          
          // console.log('load contract 2', src);
          if (src !== null && src !== undefined) {
            return src;
          }
        }
      }
      /* if (/^weba:\/\//.test(id)) {
        const {load} = protocols.weba;
        const src = await load(id);
        if (src !== null && src !== undefined) {
          return src;
        }
      } */
      
      // console.log('load 2');
      
      const type = _getType(id);
      const loader = loaders[type];
      const load = loader?.load;

      if (load) {
        id = _resolveLoaderId(id);
        const src = await load(id);
        if (src !== null && src !== undefined) {
          return src;
        }
      }
      
      // console.log('load 2', {id, type, loader: !!loader, load: !!load});
      
      if (/^https?:\/\//.test(id)) {
        const res = await fetch(id);
        if (res.ok) {
          const text = await res.text();
          return text;
        } else {
          throw new Error(`invalid status code: ${res.status} ${id}`);
        }
      } else if (match = id.match(dataUrlRegexNoSuffix)) {
        // console.log('load 3', match);
        // const type = match[1];
        const encoding = match[2];
        const src = match[3];
        // console.log('load data url!!!', id, match);
        if (encoding === 'base64') {
          return atob(src);
        } else {
          return decodeURIComponent(src);
        }
      } else {
        throw new Error(`could not load "${id}"`);
      }
    },
    /* async transform(src, id) {
      const type = _getType(id);
      const loader = loaders[type];
      const transform = loader?.transform;
      if (transform) {
        return await transform(src, id);
      }
      return null;
    }, */
  };
}