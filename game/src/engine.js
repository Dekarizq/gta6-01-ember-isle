// Raw WebGL renderer for Vesper City: Ember Isle.
// No library: one shader, one dynamic vertex buffer, every box in the
// world drawn in a single call per frame. Boxes are coloured cuboids with
// per-face shading (bright tops, darker sides) and linear distance fog, so
// the golden hour reads as haze on the horizon and the volcano beacon
// stays visible through it. The camera is a plain perspective lookAt.

function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function mat4LookAt(eye, center, up) {
  const zx = eye[0] - center[0];
  const zy = eye[1] - center[1];
  const zz = eye[2] - center[2];
  let zl = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const z0 = zx / zl, z1 = zy / zl, z2 = zz / zl;
  let xx = up[1] * z2 - up[2] * z1;
  let xy = up[2] * z0 - up[0] * z2;
  let xz = up[0] * z1 - up[1] * z0;
  zl = Math.sqrt(xx * xx + xy * xy + xz * xz);
  xx /= zl; xy /= zl; xz /= zl;
  const y0 = z1 * xz - z2 * xy;
  const y1 = z2 * xx - z0 * xz;
  const y2 = z0 * xy - z1 * xx;
  const out = new Float32Array(16);
  out[0] = xx; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = xy; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = xz; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
  return out;
}

function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = s;
    }
  }
  return out;
}

const VERT_SRC = `
attribute vec3 aPos;
attribute vec3 aColor;
attribute float aFog;
uniform mat4 uProj;
uniform mat4 uView;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
varying vec3 vColor;
varying float vFog;
void main() {
  vec4 view = uView * vec4(aPos, 1.0);
  gl_Position = uProj * view;
  float d = clamp((-view.z - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
  vFog = d * aFog;
  vColor = aColor;
}
`;

const FRAG_SRC = `
precision mediump float;
uniform vec3 uFogColor;
varying vec3 vColor;
varying float vFog;
void main() {
  gl_FragColor = vec4(mix(vColor, uFogColor, vFog), 1.0);
}
`;

// One vertex = 7 floats: x y z r g b fogFlag.
const STRIDE = 7;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    this.verts = new Float32Array(7 * 36 * 4096);
    this.count = 0;
    const vs = this.compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('shader link failed');
    gl.useProgram(prog);
    this.prog = prog;
    this.uProj = gl.getUniformLocation(prog, 'uProj');
    this.uView = gl.getUniformLocation(prog, 'uView');
    this.uFogColor = gl.getUniformLocation(prog, 'uFogColor');
    this.uFogRange = gl.getUniformLocation(prog, 'uFogRange');
    this.buf = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.98, 0.66, 0.38, 1.0);
  }

  compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(`shader compile failed: ${gl.getShaderInfoLog(sh)}`);
    }
    return sh;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.aspect = w / h;
  }

  // Start a frame: eye and target are [x, y, z]; fog is [near, far].
  begin(eye, target, fogColor, fogNear, fogFar, clearColor) {
    const gl = this.gl;
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const proj = mat4Perspective((70 * Math.PI) / 180, this.aspect || 16 / 9, 0.5, 4000);
    const view = mat4LookAt(eye, target, [0, 1, 0]);
    this.vp = mat4Multiply(proj, view);
    gl.uniformMatrix4fv(this.uProj, false, proj);
    gl.uniformMatrix4fv(this.uView, false, view);
    gl.uniform3f(this.uFogColor, fogColor[0], fogColor[1], fogColor[2]);
    gl.uniform2f(this.uFogRange, fogNear, fogFar);
    this.count = 0;
  }

  // Push one triangle (three corners, each [x, y, z]) with a colour.
  tri(a, b, c, color, shade, noFog) {
    const v = this.verts;
    let o = this.count * STRIDE;
    const r = color[0] * shade;
    const g = color[1] * shade;
    const b2 = color[2] * shade;
    const f = noFog ? 0 : 1;
    for (const p of [a, b, c]) {
      v[o] = p[0]; v[o + 1] = p[1]; v[o + 2] = p[2];
      v[o + 3] = r; v[o + 4] = g; v[o + 5] = b2; v[o + 6] = f;
      o += STRIDE;
    }
    this.count += 3;
  }

  face(a, b, c, d, color, shade, noFog) {
    this.tri(a, b, c, color, shade, noFog);
    this.tri(a, c, d, color, shade, noFog);
  }

  // A cuboid centred at (x, y, z) with size (w, h, d), rotated yaw radians.
  // y is the CENTRE height; the box spans y-h/2 .. y+h/2.
  box(x, y, z, w, h, d, color, yaw, noFog) {
    if (this.count + 36 > this.verts.length / STRIDE) return;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const c = Math.cos(yaw || 0);
    const s = Math.sin(yaw || 0);
    const rot = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const corner = (lx, ly, lz) => {
      const p = rot(lx, lz);
      return [p[0], y + ly, p[1]];
    };
    const t0 = corner(-hw, hh, -hd), t1 = corner(hw, hh, -hd);
    const t2 = corner(hw, hh, hd), t3 = corner(-hw, hh, hd);
    const b0 = corner(-hw, -hh, -hd), b1 = corner(hw, -hh, -hd);
    const b2 = corner(hw, -hh, hd), b3 = corner(-hw, -hh, hd);
    this.face(t0, t1, t2, t3, color, 1.0, noFog); // top
    this.face(b3, b2, b1, b0, color, 0.45, noFog); // bottom
    this.face(t3, t2, b2, b3, color, 0.8, noFog); // +z
    this.face(t1, t0, b0, b1, color, 0.8, noFog); // -z
    this.face(t2, t1, b1, b2, color, 0.68, noFog); // +x
    this.face(t0, t3, b3, b0, color, 0.68, noFog); // -x
  }

  // A flat ground slab: a box whose top sits at y = topY.
  ground(x, z, w, d, topY, color) {
    this.box(x, topY - 0.1, z, w, 0.2, d, color, 0, false);
  }

  // A tall thin marker (used for the volcano beacon and the sun disc).
  pillar(x, y, z, w, h, d, color) {
    this.box(x, y, z, w, h, d, color, 0, true);
  }

  end() {
    const gl = this.gl;
    if (this.count === 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.subarray(0, this.count * STRIDE), gl.DYNAMIC_DRAW);
    const aPos = gl.getAttribLocation(this.prog, 'aPos');
    const aColor = gl.getAttribLocation(this.prog, 'aColor');
    const aFog = gl.getAttribLocation(this.prog, 'aFog');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, STRIDE * 4, 0);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, STRIDE * 4, 12);
    gl.enableVertexAttribArray(aFog);
    gl.vertexAttribPointer(aFog, 1, gl.FLOAT, false, STRIDE * 4, 24);
    gl.drawArrays(gl.TRIANGLES, 0, this.count);
  }
}

// Third-person camera: behind the player, looking slightly ahead.
export function thirdPersonCamera(px, pz, angle, dist, height) {
  const bx = px - Math.sin(angle) * dist;
  const bz = pz - Math.cos(angle) * dist;
  const eye = [bx, height, bz];
  const target = [px + Math.sin(angle) * 8, 2, pz + Math.cos(angle) * 8];
  return { eye, target };
}
