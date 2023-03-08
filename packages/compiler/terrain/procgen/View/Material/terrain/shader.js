const terrainVertexShader = `\   
  attribute vec4 weight;

  uniform sampler2D uTexture;
  
  varying vec3 vWorldPosition;
  varying vec3 vPos;

  varying float vDepth;
  varying vec3 vNormal;

  varying vec3 vViewDirection;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  varying vec4 vWeight;

  #include <common>
  #include <shadowmap_pars_vertex>
  
  void main() {

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    vec4 terrainData = texture2D(uTexture, uv);
    vec3 transformedNormal = normalize(terrainData.rgb);
    vNormal = transformedNormal;
    vPos = position;
    vWeight = weight;

    vec3 transformed = position;
    vec4 worldPosition = modelPosition;
    #include <shadowmap_vertex>

    vWorldPosition = modelPosition.xyz;
    vec4 viewPosition = viewMatrix * modelPosition;
    vDepth = - viewPosition.z;
    vec4 projectionPosition = projectionMatrix * viewPosition;
    gl_Position = projectionPosition;
    
  }
`;
const terrainFragmentShader = `\
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vPos;
  
  varying vec4 vWeight;
  varying float vDepth;
  

  uniform sampler2D terrainRockTexture;
  uniform sampler2D terrainDirtTexture;
  uniform sampler2D terrainSandTexture;
  uniform sampler2D terrainGrassTexture;
  uniform sampler2D terrainBrickTexture;
  
  uniform sampler2D noiseTexture;

  vec4 blendTwoTextures(vec4 texture1, float a1, vec4 texture2, float a2) {
    float depth = 0.9;
    float ma = max(texture1.a + a1, texture2.a + a2) - depth;

    float b1 = max(texture1.a + a1 - ma, 0.);
    float b2 = max(texture2.a + a2 - ma, 0.);

    return (texture1 * b1 + texture2 * b2) / (b1 + b2);
  }

  vec4 blendThreeTextures(vec4 texture1, float a1, vec4 texture2, float a2, vec4 texture3, float a3) {
    vec4 textures[3];
    textures[0] = texture1;
    textures[1] = texture2;
    textures[2] = texture3;

    float alphas[3];
    alphas[0] = a1;
    alphas[1] = a2;
    alphas[2] = a3;
    

    float depth = 0.7;
    float max_alpha = 0.0;
    for (int i = 0; i < 3; i++) {
      max_alpha = max(max_alpha, textures[i].a + alphas[i]);
    }
    max_alpha -= depth;

    vec4 result = vec4(0.0);
    float total_weight = 0.0;
    for (int i = 0; i < 3; i++) {
      float weight = max(textures[i].a + alphas[i] - max_alpha, 0.0);
      result += textures[i] * weight;
      total_weight += weight;
    }
    if (total_weight > 0.0) {
      result /= total_weight;
    }
    return result;
  }

  vec4 blendFourTextures(vec4 texture1, float a1, vec4 texture2, float a2, vec4 texture3, float a3, vec4 texture4, float a4) {
    vec4 textures[4];
    textures[0] = texture1;
    textures[1] = texture2;
    textures[2] = texture3;
    textures[3] = texture4;

    float alphas[4];
    alphas[0] = a1;
    alphas[1] = a2;
    alphas[2] = a3;
    alphas[3] = a4;

    float depth = 0.7;
    float max_alpha = 0.0;
    for (int i = 0; i < 4; i++) {
        max_alpha = max(max_alpha, textures[i].a + alphas[i]);
    }
    max_alpha -= depth;

    vec4 result = vec4(0.0);
    float total_weight = 0.0;
    for (int i = 0; i < 4; i++) {
        float weight = max(textures[i].a + alphas[i] - max_alpha, 0.0);
        result += textures[i] * weight;
        total_weight += weight;
    }
    if (total_weight > 0.0) {
        result /= total_weight;
    }
    return result;
  }

  #include <common>
  #include <packing>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>
  

  void main() {

    //################################################## terrain color ################################################## 
    float noiseScale = 0.01;
    vec3 noisetexture = texture2D(noiseTexture, vWorldPosition.xz * noiseScale).rgb;

    float grassScale = 0.1;
    vec4 grassTexture = texture2D(terrainGrassTexture, vWorldPosition.xz * grassScale);
    grassTexture.rgb = vec3(smoothstep(0.1, 0.5, grassTexture.g)) * vec3(0.373, 0.630, 0.00630);
    
    float dirtScale = 0.3;
    vec4 dirtTexture = texture2D(terrainDirtTexture, vWorldPosition.xz * dirtScale);
    if (vWeight.z > vWeight.x || vWeight.z > vWeight.y || vWeight.z > vWeight.w) {
      vec4 brickTexture = texture2D(terrainBrickTexture, vWorldPosition.xz * 0.2);
      dirtTexture = blendTwoTextures(dirtTexture, 0.95, brickTexture, 0.05);
    }
    
    float rockScale = 0.1;
    vec4 rocktexture = texture2D(terrainRockTexture, vWorldPosition.xz * rockScale);

    float sandScale = 0.2;
    vec4 sandtexture = texture2D(terrainSandTexture, vWorldPosition.xz * sandScale);
    
    vec4 terrainColor = blendFourTextures(grassTexture, vWeight.x, rocktexture, vWeight.y, dirtTexture, vWeight.z, sandtexture, vWeight.w);

    gl_FragColor = vec4(terrainColor.rgb * vNormal.g, 1.0);

    
    vec3 finalColor = gl_FragColor.rgb;
    vec3 shadowColor = vec3(0, 0, 0);
    float shadowPower = 0.5;
    
    gl_FragColor = vec4( mix(finalColor, shadowColor, (1.0 - getShadowMask() ) * shadowPower), 1.0);
  }
`;
export {
  terrainVertexShader, terrainFragmentShader,
};