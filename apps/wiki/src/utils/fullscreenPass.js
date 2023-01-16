import * as three_1 from 'three';

const fullScreenTri = new three_1.BufferGeometry();
// prettier-ignore
const vertices = new Float32Array([
    -3.0, -1.0, 1.0,
    1.0, -1.0, 1.0,
    1.0, 3.0, 1.0,
]);
fullScreenTri.setAttribute("position", new three_1.BufferAttribute(vertices, 3));
const fullScreenCam = new three_1.OrthographicCamera(-1, 1, 1, -1, -1, 1);
/**
 * Render a full screen pass with the fragmentShader provided.
 * @param fragmentShader GLSL fragment shader, iResolution uniform is added to the top.
 * @param uniforms THREE.JS uniforms (iResolution vec2 should be provided)
 * @param materialProps Extra material props to set for the pass.
 * @returns A closure you call with the THREE.Renderer and new uniform values.
 */
export function fullScreenPass(fragmentShader, uniforms, materialProps) {
    const fullScreenMat = new three_1.ShaderMaterial(Object.assign({ vertexShader: `
  void main() {
    gl_Position = vec4( position, 1.0 );
  }
`, fragmentShader: `uniform vec2 iResolution; \n${fragmentShader}`, uniforms }, materialProps));
    const fullScreenMesh = new three_1.Mesh(fullScreenTri, fullScreenMat);
    const fullScreenScene = new three_1.Scene();
    fullScreenScene.add(fullScreenMesh);
    return (renderer, newUniformValues) => {
        for (const key in newUniformValues) {
            if (!fullScreenMat.uniforms[key]) {
                return;
            }
            fullScreenMat.uniforms[key].value = newUniformValues[key];
        }
        renderer.render(fullScreenScene, fullScreenCam);
    };
}