// Raw WebGL box renderer: no libraries, no textures, no network.
// The world is axis-aligned boxes (a few yawed for cars), each face shaded by
// direction, distance-fogged toward the golden-hour fog colour — except boxes
// flagged noFog (sun, lit windows, lava glow, deck lights), which stay bright.
// One dynamic vertex buffer per frame; ~1,100 boxes is ~40k vertices, trivial.
import { FOG, SKY } from './config.js';

const VERT = `
attribute vec3 aPos;
attribute vec3 aCol;
attribute float aFog;
uniform mat4 uProj;
uniform mat4 uView;
varying vec3 vCol;
varying float vFog;
varying float vDepth;
void main() {
  vec4 p = uView * vec4(aPos, 1.0);
  vDepth = -p.z;
  vCol = aCol;
  vFog = aFog;
  gl_Position = uProj * p;
}`;

const FRAG = `
precision mediump float;
uniform vec3 uFogCol;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vCol;
varying float vFog;
varying float vDepth;
void main() {
  float f = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  vec3 c = mix(vCol, uFogCol, f * vFog);
  gl_FragColor = vec4(c, 1.0);
}`;

// Face table: corner offsets and shade per face of a unit box centred at origin.
const FACES = [
  { n: [0, 1, 0], shade: 1.0, idx: [4, 5, 6, 4, 6, 7] }, // top
  { n: [0, -1, 0], shade: 0.5, idx: [1, 0, 3, 1, 3, 2] }, // bottom
  { n: [0, 0, 1], shade: 0.82, idx: [0, 1, 5, 0, 5, 4] }, // +z
  { n: [0, 0, -1], shade: 0.7, idx: [3, 2, 6, 3, 6, 7] }, // -z
  { n: [1, 0, 0], shade: 0.62, idx: [1, 2, 6, 1, 6, 5] }, // +x
  { n: [-1, 0, 0], shade: 0.74, idx: [0, 4, 7, 0, 7, 3] }, // -x
];
const CORNERS = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5],
  [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
];

function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect; out[5] = f; out[10] = (far + near) / (near - far);
  out[11] = -1; out[14] = (2 * far * near) / (near - far);
  return out;
}

function mat4LookAt(eye, target, up) {
  const zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  const zl = Math.hypot(zx, zy, zz) || 1;
  const z = [zx / zl, zy / zl, zz / zl];
  const xx = up[1] * z[2] - up[2] * z[1];
  const xy = up[2] * z[0] - up[0] * z[2];
  const xz = up[0] * z[1] - up[1] * z[0];
  const xl = Math.hypot(xx, xy, xz) || 1;
  const x = [xx / xl, xy / xl, xz / xl];
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const out = new Float32Array(16);
  out[0] = x[0]; out[4] = x[1]; out[8] = x[2]; out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  out[1] = y[0]; out[5] = y[1]; out[9] = y[2]; out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  out[2] = z[0]; out[6] = z[1]; out[10] = z[2]; out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  out[3] = 0; out[7] = 0; out[11] = 0; out[15] = 1;
  return out;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL unavailable');
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aCol = gl.getAttribLocation(prog, 'aCol');
  const aFog = gl.getAttribLocation(prog, 'aFog');
  const uProj = gl.getUniformLocation(prog, 'uProj');
  const uView = gl.getUniformLocation(prog, 'uView');
  const uFogCol = gl.getUniformLocation(prog, 'uFogCol');
  const uFogNear = gl.getUniformLocation(prog, 'uFogNear');
  const uFogFar = gl.getUniformLocation(prog, 'uFogFar');
  const buf = gl.createBuffer();
  // 7 floats per vertex (pos 3 + col 3 + fog 1), 36 verts per box, room for 4096 boxes.
  const data = new Float32Array(4096 * 36 * 7);
  let verts = 0;
  let boxes = 0;
  let fogCol = SKY.fog;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // Add one box. Centre (x, y, z) is the box centre; w/h/d are full sizes.
  // yaw rotates around Y. noFog boxes never fade into the haze.
  function box(x, y, z, w, h, d, color, noFog, yaw) {
    if (verts + 36 > data.length / 7) return;
    const fog = noFog ? 0 : 1;
    const cos = yaw ? Math.cos(yaw) : 1;
    const sin = yaw ? Math.sin(yaw) : 0;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    for (let f = 0; f < 6; f += 1) {
      const face = FACES[f];
      const r = color[0] * face.shade, g = color[1] * face.shade, b = color[2] * face.shade;
      for (let k = 0; k < 6; k += 1) {
        const c = CORNERS[face.idx[k]];
        const lx = c[0] * w, ly = c[1] * h, lz = c[2] * d;
        const rx = lx * cos + lz * sin;
        const rz = -lx * sin + lz * cos;
        const o = verts * 7;
        data[o] = x + rx; data[o + 1] = y + ly; data[o + 2] = z + rz;
        data[o + 3] = r; data[o + 4] = g; data[o + 5] = b; data[o + 6] = fog;
        verts += 1;
      }
    }
    boxes += 1;
    void hw; void hh; void hd;
  }

  // A flat ground slab: a very short box, cheaper to read than a special case.
  function slab(x, y, z, w, d, color, noFog) {
    box(x, y, z, w, 0.6, d, color, noFog, 0);
  }

  function draw(camera, skyClear, fogOverride) {
    resize();
    gl.clearColor(skyClear[0], skyClear[1], skyClear[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    const aspect = canvas.width / Math.max(1, canvas.height);
    gl.uniformMatrix4fv(uProj, false, mat4Perspective((62 * Math.PI) / 180, aspect, 0.5, 4000));
    gl.uniformMatrix4fv(uView, false, mat4LookAt(camera.eye, camera.target, [0, 1, 0]));
    const fc = fogOverride || fogCol;
    gl.uniform3f(uFogCol, fc[0], fc[1], fc[2]);
    gl.uniform1f(uFogNear, FOG.near);
    gl.uniform1f(uFogFar, FOG.far);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, verts * 7), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(aFog);
    gl.vertexAttribPointer(aFog, 1, gl.FLOAT, false, 28, 24);
    gl.drawArrays(gl.TRIANGLES, 0, verts);
    const out = { boxes, verts };
    verts = 0;
    boxes = 0;
    return out;
  }

  function setFogColor(c) { fogCol = c; }

  return { box, slab, draw, setFogColor };
}
