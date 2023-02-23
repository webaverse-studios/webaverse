export const customshader = (material, uniforms) => {
  const healEffectMaterial = material.clone();

  healEffectMaterial.uniforms = uniforms;
  healEffectMaterial.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.eye = uniforms.eye;
    shader.uniforms.playerQuaternion = uniforms.playerQuaternion;
    shader.uniforms.isHealing = uniforms.isHealing;
    shader.uniforms.rimStrength = uniforms.rimStrength;
    
    shader.vertexShader = shader.vertexShader.replace(
      `#include <uv_pars_vertex>`,
      `
      #include <uv_pars_vertex>
      varying vec3 vSurfaceNormal;
      varying vec3 vWorldPosition;
      uniform vec4 playerQuaternion;
      
      `,
    );
    shader.vertexShader = shader.vertexShader.replace(
      `void main() {`,
      `
      vec3 rotate_vertex_position(vec3 position, vec4 q) { 
        return position + 2.0 * cross(q.xyz, cross(q.xyz, position) + q.w * position);
      }
      void main() {
        vSurfaceNormal = normalize(normal);
        vSurfaceNormal = rotate_vertex_position(vSurfaceNormal, playerQuaternion);
      `,
    );
    shader.vertexShader = shader.vertexShader.replace(
      `#include <worldpos_vertex>`,
      `
      #include <worldpos_vertex>
      vWorldPosition = transformed;
      `,
    );
    
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <uv_pars_fragment>`,
      `
      #include <uv_pars_fragment>
      varying vec3 vSurfaceNormal;
      varying vec3 vWorldPosition;
      
      uniform bool isHealing;
      uniform float uTime;
      uniform float rimStrength;
      uniform vec3 eye;
      `,
    );
    
    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <map_fragment>`,
      `
      #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vUv );
        #ifdef DECODE_VIDEO_TEXTURE
          // inline sRGB decode (TODO: Remove this code when https://crbug.com/1256340 is solved)
          sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
        #endif
        
        if (isHealing) {
          vec3 eyeDirection = normalize(eye - vWorldPosition);
          float EdotN = max(0.0, dot(eyeDirection, vSurfaceNormal));
          float rim = mix(0.0, 1.0, pow(1. - EdotN, rimStrength));
          vec3 rimColor = vec3(0.122, 0.940, 0.368);
          sampledDiffuseColor.rgb += rim * rimColor;
        }
       
        diffuseColor *= sampledDiffuseColor;
      #endif
      `,
    );
    // console.log(shader.fragmentShader);
  };
  return healEffectMaterial;
}