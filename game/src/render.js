// Raw WebGL renderer for Vesper City: Ember Isle.
// One shader, vertex colours, golden-hour fog, sun disc, sea bands, volcano.
import { FOG, SKY, SEA, CITY, ISLE, VOLCANO, FERRY, MISSIONS, DISTRICTS } from './config.js';
import { clamp, lerp } from './random.js';

const VERT = `
attribute vec3 aPos; attribute vec3 aCol; attribute float aNoFog;
uniform mat4 uProj; uniform mat4 uView;
uniform float uFogNear; uniform float uFogFar; uniform vec3 uFogColor;
varying vec3 vCol; varying float vFog;
void main(){
  vec4 vp = uView * vec4(aPos, 1.0);
  gl_Position = uProj * vp;
  float d = -vp.z;
  float f = clamp((d - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  vFog = mix(f, 0.0, aNoFog);
  vCol = aCol;
}
`;
const FRAG = `
precision mediump float;
uniform vec3 uFogColor;
varying vec3 vCol; varying float vFog;
void main(){ gl_FragColor = vec4(mix(vCol, uFogColor, vFog), 1.0); }
`;

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}
function mat4LookAt(ex, ey, ez, tx, ty, tz) {
  const zx = ex - tx, zy = ey - ty, zz = ez - tz;
  const zl = Math.hypot(zx, zy, zz), z = [zx / zl, zy / zl, zz / zl];
  // x = normalize(cross(up=(0,1,0), z)) = (z[2], 0, -z[0])
  const xx = z[2], xz = -z[0];
  const xl = Math.hypot(xx, 0, xz) || 1, x = [xx / xl, 0, xz / xl];
  // y = cross(z, x)
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -(x[0] * ex + x[1] * ey + x[2] * ez), -(y[0] * ex + y[1] * ey + y[2] * ez), -(z[0] * ex + z[1] * ey + z[2] * ez), 1,
  ];
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VERT); gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, FRAG); gl.compileShader(fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);
    this.prog = prog;
    this.uProj = gl.getUniformLocation(prog, 'uProj');
    this.uView = gl.getUniformLocation(prog, 'uView');
    this.uFogNear = gl.getUniformLocation(prog, 'uFogNear');
    this.uFogFar = gl.getUniformLocation(prog, 'uFogFar');
    this.uFogColor = gl.getUniformLocation(prog, 'uFogColor');
    this.aPos = gl.getAttribLocation(prog, 'aPos');
    this.aCol = gl.getAttribLocation(prog, 'aCol');
    this.aNoFog = gl.getAttribLocation(prog, 'aNoFog');
    this.buf = gl.createBuffer();
    this.pos = []; this.col = []; this.nf = [];
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(SKY.horizon[0], SKY.horizon[1], SKY.horizon[2], 1);
  }

  resize(w, h) {
    this.canvas.width = w; this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  // ---- geometry builders (positions in world space) ----
  tri(a, b, c, color, nofog) {
    this.pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) this.col.push(...color);
    this.nf.push(nofog ? 1 : 0, nofog ? 1 : 0, nofog ? 1 : 0);
  }
  quad(a, b, c, d, color, nofog) { this.tri(a, b, c, color, nofog); this.tri(a, c, d, color, nofog); }

  box(cx, cy, cz, w, h, d, color, opts = {}) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const c = typeof color === 'string' ? hexRgb(color) : color;
    const nf = !!opts.nofog;
    const top = opts.topColor ? (typeof opts.topColor === 'string' ? hexRgb(opts.topColor) : opts.topColor) : shade(c, 1.25);
    const side = shade(c, 0.82), side2 = shade(c, 0.66), bot = shade(c, 0.5);
    const rot = opts.rotY || 0;
    const pts = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const P = pts.map(([x, y, z]) => {
      if (!rot) return [x, y, z];
      const dx = x - cx, dz = z - cz, s = Math.sin(rot), co = Math.cos(rot);
      return [cx + dx * co - dz * s, y, cz + dx * s + dz * co];
    });
    // top, bottom, +z, -z, +x, -x
    this.quad(P[4], P[5], P[6], P[7], top, nf);
    this.quad(P[3], P[2], P[1], P[0], bot, nf);
    this.quad(P[3], P[7], P[6], P[2], side, nf);
    this.quad(P[1], P[5], P[4], P[0], side2, nf);
    this.quad(P[2], P[6], P[5], P[1], side, nf);
    this.quad(P[0], P[4], P[7], P[3], side2, nf);
  }

  // Vertical cylinder (n-sided), used for trunks, lighthouse, beacon base.
  cylinder(cx, y0, cz, r, h, color, sides = 8, nofog = false) {
    const c = typeof color === 'string' ? hexRgb(color) : color;
    const y1 = y0 + h;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
      const q0 = [cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r];
      const q1 = [cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r];
      this.quad(p0, p1, q1, q0, shade(c, 0.85), nofog);
      this.tri([cx, y1, cz], q0, q1, shade(c, 1.2), nofog);
    }
  }

  // Stacked shrinking rings forming the volcano cone.
  cone(cx, cz, baseR, height, color, steps = 9) {
    const c = typeof color === 'string' ? hexRgb(color) : color;
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps;
      const r0 = baseR * (1 - t0 * 0.86), r1 = baseR * (1 - t1 * 0.86);
      const y0 = height * t0, y1 = height * t1;
      const sides = 14;
      for (let i = 0; i < sides; i++) {
        const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
        const p0 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0];
        const p1 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
        const q0 = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1];
        const q1 = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1];
        const sh = (0.55 + 0.35 * (1 - t0)) * (i % 2 === 0 ? 1.0 : 0.78);
        this.quad(p0, p1, q1, q0, shade(c, sh), false);
      }
    }
    // Flat crater floor, glowing.
    const cr = baseR * 0.14;
    this.quad([cx - cr, height, cz - cr], [cx + cr, height, cz - cr], [cx + cr, height, cz + cr], [cx - cr, height, cz + cr], [1.0, 0.45, 0.05], true);
  }

  // Sun disc + halo, vertical billboard facing the camera, noFog.
  sun(cx, cy, cz, r, dir) {
    const col = SKY.sunColor;
    const halo = [1.0, 0.62, 0.30];
    // Right vector perpendicular to the sun direction, horizontal.
    const d = dir || [-0.86, 0.10, -0.50];
    let rx = -d[2], rz = d[0];
    const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    const disc = (rad, color) => {
      const seg = 32;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        this.tri([cx, cy, cz],
          [cx + rx * Math.cos(a0) * rad, cy + Math.sin(a0) * rad, cz + rz * Math.cos(a0) * rad],
          [cx + rx * Math.cos(a1) * rad, cy + Math.sin(a1) * rad, cz + rz * Math.cos(a1) * rad], color, true);
      }
    };
    disc(r * 2.4, halo);
    disc(r, col);
  }

  flush(proj, view) {
    const gl = this.gl;
    const n = this.pos.length / 3;
    const data = new Float32Array(n * 7);
    for (let i = 0; i < n; i++) {
      data[i * 7] = this.pos[i * 3]; data[i * 7 + 1] = this.pos[i * 3 + 1]; data[i * 7 + 2] = this.pos[i * 3 + 2];
      data[i * 7 + 3] = this.col[i * 3]; data[i * 7 + 4] = this.col[i * 3 + 1]; data[i * 7 + 5] = this.col[i * 3 + 2];
      data[i * 7 + 6] = this.nf[i];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(this.uProj, false, proj);
    gl.uniformMatrix4fv(this.uView, false, view);
    gl.uniform1f(this.uFogNear, FOG.near);
    gl.uniform1f(this.uFogFar, FOG.far);
    gl.uniform3fv(this.uFogColor, SKY.fogColor);
    gl.enableVertexAttribArray(this.aPos);
    gl.enableVertexAttribArray(this.aCol);
    gl.enableVertexAttribArray(this.aNoFog);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 28, 0);
    gl.vertexAttribPointer(this.aCol, 3, gl.FLOAT, false, 28, 12);
    gl.vertexAttribPointer(this.aNoFog, 1, gl.FLOAT, false, 28, 24);
    gl.drawArrays(gl.TRIANGLES, 0, n);
    this.pos.length = 0; this.col.length = 0; this.nf.length = 0;
  }
}

export function computeCamera(state, time) {
  // Returns { eye, target } for the current mode.
  if (state.shot) return state.shotCamera;
  const p = state.player;
  const back = p.inCar ? 13 : 7;
  const h = p.inCar ? 5.2 : 3.4;
  const a = p.heading;
  return {
    eye: [p.x - Math.sin(a) * back, p.y + h, p.z - Math.cos(a) * back],
    target: [p.x + Math.sin(a) * 10, p.y + 1.6, p.z + Math.cos(a) * 10],
  };
}

export function renderFrame(renderer, world, state, time) {
  const gl = renderer.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const cam = computeCamera(state, time);
  const aspect = renderer.canvas.width / renderer.canvas.height;
  const proj = mat4Perspective(1.05, aspect, 0.5, 4000);
  const view = mat4LookAt(cam.eye[0], cam.eye[1], cam.eye[2], cam.target[0], cam.target[1], cam.target[2]);

  // --- Sky gradient around the camera (noFog), 12 segments so no corner
  // edges show, in three non-overlapping vertical bands ---
  const ex = cam.eye[0], ez = cam.eye[2];
  const top = SKY.top, mid = SKY.mid, hor = SKY.horizon;
  const R = 1500, Y0 = 0, Y1 = 420;
  const yMid0 = Y0 + (Y1 - Y0) * 0.45, yTop0 = Y0 + (Y1 - Y0) * 0.75;
  const SEG = 12;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const ax = ex + Math.cos(a0) * R, az = ez + Math.sin(a0) * R;
    const bx = ex + Math.cos(a1) * R, bz = ez + Math.sin(a1) * R;
    renderer.quad([ax, Y0, az], [bx, Y0, bz], [bx, yMid0, bz], [ax, yMid0, az], hor, true);
    renderer.quad([ax, yMid0, az], [bx, yMid0, bz], [bx, yTop0, bz], [ax, yTop0, az], mid, true);
    renderer.quad([ax, yTop0, az], [bx, yTop0, bz], [bx, Y1, bz], [ax, Y1, az], top, true);
  }
  // Sun disc low on the western horizon + halo (always in frame for volcano/ferry shots).
  const sd = SKY.sunDir;
  const sunX = ex + sd[0] * 1300, sunY = 200, sunZ = ez + sd[2] * 1300;
  renderer.sun(sunX, sunY, sunZ, 60, sd);

  // --- Sea: deep sunset blue everywhere (to the sky walls), with a warm
  // sun-reflection streak along the sun's azimuth and bright glints.
  // The sea is drawn only where there is no land (city, beach, isle holes).
  const seaY = 0.4;
  const seaBlue = [0.22, 0.40, 0.62];
  const seaHoles = [
    [-1500, -820, -1500, 1500],
    [-820, -420, -1500, -230], [-820, -420, 150, 1500],
    [-420, -254, -1500, 1500],
    [-254, 254, -1500, -254], [-254, 254, 254, 1500],
    [254, 1500, -1500, 1500],
  ];
  for (const [x0, x1, z0, z1] of seaHoles) {
    renderer.quad([x0, seaY, z0], [x1, seaY, z0], [x1, seaY, z1], [x0, seaY, z1], seaBlue, true);
  }
  // Warm reflection streak along the sun azimuth (from the western horizon
  // toward the city), skipping land.
  const streakA = [-1400, -650], streakB = [300, 150];
  const inLand = (x, z) =>
    (Math.abs(x) <= 254 && Math.abs(z) <= 254) ||
    (x >= -820 && x <= -420 && z >= -230 && z <= 150) ||
    (x >= 200 && x <= 254 && Math.abs(z) <= 240);
  for (let i = 0; i < 16; i++) {
    const t0 = i / 16, t1 = (i + 1) / 16;
    const ax = streakA[0] + (streakB[0] - streakA[0]) * t0, az = streakA[1] + (streakB[1] - streakA[1]) * t0;
    const bx = streakA[0] + (streakB[0] - streakA[0]) * t1, bz = streakA[1] + (streakB[1] - streakA[1]) * t1;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (inLand(mx, mz)) continue;
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
    const px = -dz / len * 26, pz = dx / len * 26;
    renderer.quad([ax - px, seaY + 0.1, az - pz], [ax + px, seaY + 0.1, az + pz],
      [bx + px, seaY + 0.1, bz + pz], [bx - px, seaY + 0.1, bz - pz], [0.85, 0.50, 0.22], true);
  }
  // Sun glint: small bright dashes on the streak, shimmering with time.
  for (let i = 0; i < 40; i++) {
    const t = (i / 40 + Math.sin(time * 0.3 + i) * 0.01) % 1;
    const gx = streakA[0] + (streakB[0] - streakA[0]) * t + Math.sin(i * 7.3) * 30;
    const gz = streakA[1] + (streakB[1] - streakA[1]) * t + Math.cos(i * 5.1) * 22;
    if (inLand(gx, gz)) continue;
    const s = 4 + (i % 3) * 3;
    renderer.quad([gx - s, seaY + 0.2, gz - 1.5], [gx + s, seaY + 0.2, gz - 1.5], [gx + s, seaY + 0.2, gz + 1.5], [gx - s, seaY + 0.2, gz + 1.5], SEA.glint, true);
  }

  // --- Ground: city slab, beach, island disc ---
  renderer.quad([-230, 0.2, -230], [230, 0.2, -230], [230, 0.2, 230], [-230, 0.2, 230], [0.16, 0.15, 0.18], false);
  renderer.quad([200, 0.3, -240], [250, 0.3, -240], [250, 0.3, 240], [200, 0.3, 240], [0.85, 0.72, 0.45], false); // beach sand
  renderer.quad([ISLE.x - 200, 0.3, ISLE.z - 190], [ISLE.x + 200, 0.3, ISLE.z - 190], [ISLE.x + 200, 0.3, ISLE.z + 190], [ISLE.x - 200, 0.3, ISLE.z + 190], [0.14, 0.12, 0.12], false);
  // Black sand beach ring on the isle.
  renderer.quad([ISLE.x - 190, 0.35, ISLE.z - 40], [ISLE.x - 150, 0.35, ISLE.z - 40], [ISLE.x - 150, 0.35, ISLE.z + 60], [ISLE.x - 190, 0.35, ISLE.z + 60], [0.05, 0.045, 0.05], false);

  // Roads run BETWEEN the blocks (half-pitch offsets), so the grid is drivable.
  for (let i = -5; i <= 4; i++) {
    const c = i * CITY.pitch + CITY.pitch / 2;
    renderer.quad([c - 7, 0.45, -230], [c + 7, 0.45, -230], [c + 7, 0.45, 230], [c - 7, 0.45, 230], [0.08, 0.08, 0.10], false);
    renderer.quad([-230, 0.45, c - 7], [230, 0.45, c - 7], [230, 0.45, c + 7], [-230, 0.45, c + 7], [0.08, 0.08, 0.10], false);
    // Centre-line dashes so the dark asphalt reads as a road, not a void.
    // Subtle warm grey, kept below the car shadows (y 0.48 vs 0.5).
    for (let d = -220; d <= 220; d += 12) {
      renderer.quad([c - 0.3, 0.48, d - 1.5], [c + 0.3, 0.48, d - 1.5], [c + 0.3, 0.48, d + 1.5], [c - 0.3, 0.48, d + 1.5], [0.7, 0.65, 0.4], false);
      renderer.quad([d - 1.5, 0.48, c - 0.3], [d + 1.5, 0.48, c - 0.3], [d + 1.5, 0.48, c + 0.3], [d - 1.5, 0.48, c + 0.3], [0.7, 0.65, 0.4], false);
    }
  }

  // --- Buildings with lit gold window strips (noFog) ---
  for (const b of world.buildings) {
    renderer.box(b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color, { topColor: '#ffd98a' });
    const rows = b.windows;
    for (let r = 0; r < rows; r++) {
      const wy = 3 + r * 4;
      if (wy > b.h - 2) break;
      const strip = [1.0, 0.78, 0.32];
      renderer.box(b.x, wy, b.z + b.d / 2 + 0.15, b.w * 0.8, 0.7, 0.3, strip, { nofog: true });
      renderer.box(b.x, wy, b.z - b.d / 2 - 0.15, b.w * 0.8, 0.7, 0.3, strip, { nofog: true });
    }
    if (b.roof) renderer.box(b.x, b.h + 1, b.z, b.w * 0.4, 2, b.d * 0.4, '#8a6a3a');
    // Tall towers carry a thin rooftop antenna so the skyline reads taller.
    if (b.h >= 40) renderer.box(b.x, b.h + 3, b.z, 0.6, 6, 0.6, '#222222');
  }

  // --- Palms (swaying fronds) ---
  for (const p of world.palms) {
    const sway = Math.sin(time * 0.9 + p.phase) * 0.06;
    renderer.cylinder(p.x, 0, p.z, 0.5, p.h, '#5a3a1e', 6);
    const top = p.h;
    const lean = p.lean + sway;
    const fx = p.x + lean * 6, fz = p.z;
    renderer.quad([fx - 5, top, fz - 0.4], [fx + 5, top, fz - 0.4], [fx + 5, top + 1.2, fz + 0.4], [fx - 5, top + 1.2, fz + 0.4], [0.12, 0.45, 0.18], false);
    renderer.quad([fx - 0.4, top, fz - 5], [fx + 0.4, top, fz - 5], [fx + 0.4, top + 1.2, fz + 5], [fx - 0.4, top + 1.2, fz + 5], [0.10, 0.40, 0.16], false);
    renderer.box(fx, top + 0.6, fz, 1.6, 1.2, 1.6, '#6a4a22');
  }

  // --- Street lamps (small glow, not a big cube: a lamp seen from 6 m
  // away must still read as a lamp, so the glow box stays under a metre) ---
  for (const l of world.lamps) {
    renderer.cylinder(l.x, 0, l.z, 0.25, 7, '#2a2a30', 5);
    renderer.box(l.x, 7.2, l.z, 0.9, 0.5, 0.9, [1.0, 0.85, 0.45], { nofog: true });
  }

  // --- Volcano: cone, lava flows, crater ring, beacon, smoke, sparks ---
  const v = VOLCANO;
  // Warmer, lighter cone base: the shadow side of the cone was reading as
  // a near-black mass in the volcano shot; a warmer base keeps the
  // backlit slope readable instead of flat black.
  renderer.cone(v.x, v.z, v.base, v.height, '#6e4a3e', 9);
  // Bright orange crater rim ring, visible from the side (stacked glowing boxes).
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rx = v.x + Math.cos(a) * (v.craterR + 2), rz = v.z + Math.sin(a) * (v.craterR + 2);
    renderer.box(rx, v.height - 2, rz, 6, 2.6, 6, [1.0, 0.42, 0.06], { nofog: true });
  }
  // Lava flows down three slopes, as glowing ribbons lying on the cone surface.
  for (const flow of world.lavaFlows) {
    for (let i = 0; i < flow.length - 1; i++) {
      const p = flow[i], q = flow[i + 1];
      const dx = q.x - p.x, dz = q.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len * (p.w / 2), pz = dx / len * (p.w / 2);
      const y = Math.max(p.y, q.y) + 0.7;
      renderer.quad(
        [p.x - px, y, p.z - pz], [p.x + px, y, p.z + pz],
        [q.x + px, y, q.z + pz], [q.x - px, y, q.z - pz],
        [1.0, 0.38, 0.04], true);
    }
  }
  // Wide beacon beam above the crater + two dim side pillars rooted at the rim.
  renderer.box(v.x, v.height + 40, v.z, 5, 80, 5, [1.0, 0.55, 0.15], { nofog: true });
  renderer.box(v.x - 40, v.height + 15, v.z + 20, 6, 30, 6, [0.9, 0.35, 0.1], { nofog: true });
  renderer.box(v.x + 42, v.height + 15, v.z - 18, 6, 30, 6, [0.9, 0.35, 0.1], { nofog: true });
  // Smoke puffs above the crater, drifting with time.
  for (let i = 0; i < 4; i++) {
    const t = (time * 0.12 + i / 4) % 1;
    renderer.box(v.x + Math.sin(i * 2.4) * 6 + t * 18, v.height + 6 + t * 26, v.z + Math.cos(i * 1.7) * 6, 6 + t * 8, 5 + t * 6, 6 + t * 8, [0.32, 0.30, 0.30], { nofog: false });
  }
  // Lava sparks during eruption pulses.
  const erupting = Math.sin(time * 0.5) > 0.2;
  if (erupting) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + time;
      const r = 8 + (i % 4) * 5;
      renderer.box(v.x + Math.cos(a) * r, v.height + 4 + Math.sin(time * 2 + i) * 8, v.z + Math.sin(a) * r, 1.6, 1.6, 1.6, [1.0, 0.75, 0.2], { nofog: true });
    }
  }
  // Second crater, enlarged, south-east of the main cone (warmed to match).
  renderer.cone(v.x + 92, v.z + 78, 46, 34, '#40291f', 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    renderer.box(v.x + 92 + Math.cos(a) * 9, 33, v.z + 78 + Math.sin(a) * 9, 4, 2.4, 4, [1.0, 0.45, 0.08], { nofog: true });
  }

  // --- Lighthouse on the isle's west point ---
  const lh = { x: ISLE.x - 185, z: ISLE.z - 10 };
  renderer.cylinder(lh.x, 0, lh.z, 5, 34, '#f2ede0', 10);
  renderer.cylinder(lh.x, 26, lh.z, 5.4, 3, '#c81e3a', 10);
  renderer.box(lh.x, 36, lh.z, 7, 4, 7, [1.0, 0.9, 0.5], { nofog: true });
  const beamA = time * 0.6;
  renderer.box(lh.x + Math.cos(beamA) * 60, 34, lh.z + Math.sin(beamA) * 60, 110, 2.4, 2.4, [1.0, 0.95, 0.6], { rotY: -beamA, nofog: true });

  // --- Night market stalls + glowing lanterns (volcano shot foreground) ---
  const market = { x: ISLE.x + 40, z: ISLE.z + 120 };
  for (let i = 0; i < 6; i++) {
    const sx = market.x + (i - 2.5) * 12, sz = market.z + (i % 2) * 8;
    renderer.box(sx, 2, sz, 7, 4, 5, '#7a3a1e');
    renderer.box(sx, 4.6, sz, 8, 1, 6, i % 2 ? '#ff5c3c' : '#ffd23c', { nofog: true });
    renderer.box(sx, 6.4, sz, 2.4, 2.4, 2.4, [1.0, 0.8, 0.35], { nofog: true });
  }

  // --- Ferry: big hull, cabin, chimney, deck lights, flag, foam wake ---
  drawFerry(renderer, state.ferry, time);
  // Two other boats on the ferry route so the sea is not empty.
  drawBoat(renderer, -360, 90, time * 0.2, '#2fa8ff', 1);
  drawBoat(renderer, -520, -90, time * 0.15 + 2, '#ffd23c', 0.8);

  // --- Pier at Sunset Pier ---
  const pier = FERRY.pier;
  for (let i = 0; i < 10; i++) {
    renderer.box(pier.x - i * 4, 1.2, pier.z, 4.4, 0.8, 8, '#6a4a26');
  }
  renderer.box(pier.x - 42, 2.4, pier.z, 3, 4.8, 3, [1.0, 0.85, 0.4], { nofog: true });

  // --- Mission beacon: a tall gold beam over the active mission's
  // district, so the goal is visible from anywhere in the city/isle.
  // Targets that are places, not districts, fall back to their map spot.
  const BEACON_SPOTS = {
    'Sunset Pier': FERRY.pier,
    'Ember Crater': { x: VOLCANO.x, z: VOLCANO.z },
    'Second Crater': { x: VOLCANO.x + 92, z: VOLCANO.z + 78 },
  };
  const curMission = MISSIONS[state.missionIndex];
  if (curMission) {
    const d = DISTRICTS.find(dd => dd.name === curMission.target) || BEACON_SPOTS[curMission.target];
    if (d) renderer.box(d.x, 30, d.z, 3, 60, 3, [1.0, 0.82, 0.25], { nofog: true });
  }

  // --- Vehicles, pedestrians, coins, police ---
  for (const car of state.cars) drawCar(renderer, car);
  for (const ped of state.peds) {
    const py = ped.y || 0; // peds staged on the ferry deck ride at y = 8
    renderer.box(ped.x, py + 1.1, ped.z, 0.8, 2.2, 0.8, ped.shirt);
    renderer.box(ped.x, py + 2.5, ped.z, 0.7, 0.7, 0.7, ped.skin);
  }
  for (const coin of state.coins) {
    if (coin.taken) continue;
    const spin = time * 2 + coin.x;
    renderer.box(coin.x, coin.y + Math.sin(time + coin.z) * 0.4, coin.z, 1.4, 1.4, 0.4, [1.0, 0.84, 0.1], { rotY: spin, nofog: true });
  }
  if (state.heli) {
    const h = state.heli;
    renderer.box(h.x, h.y, h.z, 8, 3, 4, '#1c2f4d');
    renderer.box(h.x, h.y + 2.4, h.z, 5, 1.6, 3, '#2e4a6e');
    renderer.box(h.x - 6, h.y + 1, h.z, 1.6, 1, 1.6, [1.0, 0.9, 0.5], { nofog: true });
    renderer.box(h.x, h.y + 3.6, h.z, 16, 0.3, 1, '#222');
    // Air One searchlight: a narrow pale shaft from the heli down to the
    // player plus a small gold spotlight pool on the ground under the
    // player. Kept narrow (1 m at the heli, 2 m at the player) so the beam
    // reads as light, not as a solid sail filling the frame.
    const p = state.player;
    const dx = p.x - h.x, dz = p.z - h.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len * 0.5, pz = dx / len * 0.5;
    const beamCol = [0.92, 0.88, 0.62];
    renderer.quad(
      [h.x - px, h.y - 1, h.z - pz], [h.x + px, h.y - 1, h.z + pz],
      [p.x + px * 2, (p.y || 0) + 0.7, p.z + pz * 2], [p.x - px * 2, (p.y || 0) + 0.7, p.z - pz * 2],
      beamCol, true);
    const gy = (p.y || 0) + 0.6, r = 4;
    renderer.quad([p.x - r, gy, p.z - r], [p.x + r, gy, p.z - r], [p.x + r, gy, p.z + r], [p.x - r, gy, p.z + r], [1.0, 0.85, 0.3], true);
  }
  for (const rb of state.roadblocks || []) {
    renderer.box(rb.x, 1, rb.z, 10, 2, 1.4, '#ff5c3c');
    renderer.box(rb.x, 1, rb.z, 10, 0.6, 1.5, '#ffffff', { nofog: true });
  }
  // Spike strips: a dark strip across the road with 5 bright steel spikes.
  for (const ss of state.spikeStrips || []) {
    const s = Math.sin(ss.heading || 0), co = Math.cos(ss.heading || 0);
    renderer.box(ss.x, 0.6, ss.z, 1.2, 0.5, 9, '#1a1a1a', { rotY: ss.heading || 0 });
    for (let i = -2; i <= 2; i++) {
      const sx = ss.x + co * i * 1.7, sz = ss.z - s * i * 1.7;
      renderer.box(sx, 1.0, sz, 0.5, 0.9, 0.5, [0.85, 0.9, 0.95], { nofog: true });
    }
  }

  renderer.flush(proj, view);
}

function drawCar(renderer, car) {
  const c = car.color;
  // Rev2: cars sit on their own ground height (car.y), so a car parked on
  // the ferry deck (y = 8) or the lava road stands on the deck/road, not at
  // sea level. Local +z is the front at the shot headings (heading PI).
  const base = car.y || 0;
  const s = Math.sin(car.heading), co = Math.cos(car.heading);
  const at = (dx, dz) => [car.x + dx * co - dz * s, car.z + dx * s + dz * co];
  // Long dark ground shadow, slightly larger than the car, just under it.
  const sh = 0.5;
  const [shAx, shAz] = at(-2.6, -1.4), [shBx, shBz] = at(2.6, -1.4);
  const [shCx, shCz] = at(2.6, 1.4), [shDx, shDz] = at(-2.6, 1.4);
  renderer.quad([shAx, base + sh, shAz], [shBx, base + sh, shBz], [shCx, base + sh, shCz], [shDx, base + sh, shDz], [0.02, 0.02, 0.03], false);
  renderer.box(car.x, base + 1.0, car.z, 4.6, 1.1, 2.1, c, { rotY: car.heading });
  renderer.box(car.x, base + 1.9, car.z, 2.4, 0.9, 1.9, shade2(c), { rotY: car.heading });
  for (const [dx, dz] of [[-1.5, -1.05], [1.5, -1.05], [-1.5, 1.05], [1.5, 1.05]]) {
    const [wx, wz] = at(dx, dz);
    renderer.box(wx, base + 0.45, wz, 0.9, 0.9, 0.5, '#111111', { rotY: car.heading });
  }
  // Headlights: two small pale lamps on the front face; taillights red.
  for (const dx of [-1.2, 1.2]) {
    const [hx, hz] = at(dx, 1.15);
    renderer.box(hx, base + 1.0, hz, 0.55, 0.45, 0.3, [1.0, 0.95, 0.75], { rotY: car.heading, nofog: true });
    const [tx, tz] = at(dx, -1.15);
    renderer.box(tx, base + 1.0, tz, 0.55, 0.45, 0.3, [1.0, 0.15, 0.1], { rotY: car.heading, nofog: true });
  }
  if (car.isPlayer) {
    renderer.box(car.x, base + 2.6, car.z, 0.8, 0.5, 0.8, [1.0, 0.85, 0.2], { nofog: true });
  }
  if (car.isPolice) {
    renderer.box(car.x, base + 2.5, car.z, 1.2, 0.5, 1.2, car.lightPhase ? '#ff2222' : '#2266ff', { nofog: true });
  }
}
function shade2(hex) {
  const c = hexRgb(hex);
  return [clamp(c[0] * 0.7, 0, 1), clamp(c[1] * 0.7, 0, 1), clamp(c[2] * 0.7, 0, 1)];
}

function drawFerry(renderer, ferry, time) {
  const f = ferry;
  const s = Math.sin(f.heading), co = Math.cos(f.heading);
  // put(lx, lz, w, h, d, color, baseY, opts): box with its base at baseY,
  // positioned relative to the ferry's centre and heading.
  const put = (lx, lz, w, h, d, color, baseY, opts) => {
    const wx = f.x + lx * co - lz * s, wz = f.z + lx * s + lz * co;
    renderer.box(wx, baseY + h / 2, wz, w, h, d, color, { rotY: f.heading, ...(opts || {}) });
  };
  // Big hull — fills ~40% of the ferry shot frame.
  put(0, 0, 34, 7, 12, '#b8202e', 0.5);
  put(0, 0, 32, 2.4, 13, '#f2ede0', 0.5, { topColor: '#ffffff' });
  // Cabin decks stacked on the hull.
  put(-2, 0, 22, 5, 9, '#f2ede0', 7.5);
  put(-4, 0, 16, 3.5, 7, '#3a6a8a', 12.5);
  // Chimney + flag mast.
  put(12, 0, 3, 9, 3, '#222222', 7.5);
  put(-15, 0, 0.6, 12, 0.6, '#dddddd', 7.5);
  const flagX = f.x + (-15) * co, flagZ = f.z + (-15) * s;
  renderer.box(flagX, 20.5, flagZ, 4, 2.4, 0.3, '#ff9a3c', { rotY: f.heading, nofog: true });
  // Deck lights along the hull top edge.
  for (let i = -3; i <= 3; i++) {
    put(i * 4, 5.2, 1, 1, 1, [1.0, 0.85, 0.4], 7.5, { nofog: true });
  }
  // Foam wake behind the ferry.
  const wx = f.x + Math.sin(f.heading) * 22, wz = f.z + Math.cos(f.heading) * 22;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    renderer.box(wx + Math.sin(f.heading) * i * 4, 0.6, wz + Math.cos(f.heading) * i * 4, 10 - t * 4, 0.5, 8 + t * 6, [0.92, 0.95, 0.98], { rotY: f.heading });
  }
}

function drawBoat(renderer, x, z, heading, color, scale) {
  renderer.box(x, 1.2, z, 12 * scale, 2.4, 4.5 * scale, color, { rotY: heading });
  renderer.box(x, 3, z, 5 * scale, 2, 3.4 * scale, '#f2ede0', { rotY: heading });
  renderer.box(x + 3 * scale, 0.7, z, 8 * scale, 0.5, 6 * scale, [0.92, 0.95, 0.98], { rotY: heading });
}
