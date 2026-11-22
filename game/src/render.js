// Raw WebGL renderer for Vesper City: Ember Isle.
// One shader, vertex colours, golden-hour fog, sun disc, sea bands, volcano.
//
// Round 10 rewrite — the frame now carries the golden hour instead of
// just sitting in it: the low sun throws long east-pointing shadows off
// every tower, car and pedestrian; the sea has living surf and drifting
// mist; Air One is bright rescue white with a red cheatline; the ferry
// has portholes, a waterline and a proper cabin; the volcano is layered
// rock with glowing lava bands instead of a flat brown cone; pedestrians
// walk with swinging arms and legs; fast cars trail exhaust and dust.
import { FOG, SKY, SEA, CITY, ISLE, VOLCANO, FERRY, MISSIONS, DISTRICTS, LIGHT, HELI, SURF, BIRDS, CLOUDS, HARBOR, DOCKS, KITE_COLS, HINTS, TIDE_POOLS } from './config.js';
import { clamp, lerp, hash2, smoothstep } from './random.js';

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
    // Round 10 fix: accept a hex string as well as an [r, g, b] array.
    // Spreading a string into the colour array used to push its
    // characters in as colour values, corrupting every colour drawn
    // after it in the frame (green palm trunks, a yellow helicopter,
    // a white sea). Convert first, always.
    const cc = typeof color === 'string' ? hexRgb(color) : color;
    this.pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) this.col.push(...cc);
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

  // Round 10 — layered volcano cone. Each ring is a band of rock whose
  // colour comes from its height and its face: dark basalt low, warm
  // brown mid-slope, and glowing orange lava bands near the crater, with
  // per-face variation from a deterministic hash so the cone reads as
  // broken rock, never as a flat brown triangle. A crater rim of bright
  // lava and a glowing crater floor finish it.
  cone(cx, cz, baseR, height, color, steps = 9) {
    const base = typeof color === 'string' ? hexRgb(color) : color;
    const basalt = [0.24, 0.17, 0.14];
    const rockMid = [0.48, 0.31, 0.25];
    const lavaBand = [0.85, 0.32, 0.06];
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
        // Rock band by height: basalt foot, brown middle, lava-lit rim.
        let band;
        if (t0 > 0.78) band = lavaBand;
        else if (t0 > 0.35) band = rockMid;
        else band = basalt;
        // Sun-facing sides (+x, toward the east the camera sees) are
        // warmer; shaded sides cooler; hash breaks the banding into rock.
        const sunFace = 0.75 + 0.45 * Math.cos((i / sides) * Math.PI * 2);
        const grain = 0.82 + hash2(s, i) * 0.36;
        const mix = t0 > 0.78 ? 0.85 : 0.55;
        const c = [
          lerp(base[0], band[0], mix) * sunFace * grain,
          lerp(base[1], band[1], mix) * sunFace * grain,
          lerp(base[2], band[2], mix) * sunFace * grain,
        ];
        this.quad(p0, p1, q1, q0, c, false);
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

  // Round 10 — the low sun stretches the object's shadow east across
  // the ground. The shade is a soft grey, never a black hole: slightly
  // darker than the pale sand, close to the dark asphalt, so one colour
  // reads as shade on every surface instead of a void in the frame.
  longShadow(x, y, z, w, d, height, heading = 0) {
    const len = Math.min(18, height * 0.9);
    const dx = LIGHT.shadowDir[0], dz = LIGHT.shadowDir[1];
    const px = -dz, pz = dx; // perpendicular, for the shadow's width
    const hw = w / 2;
    this.quad(
      [x - px * hw, y + 0.06, z - pz * hw],
      [x + px * hw, y + 0.06, z + pz * hw],
      [x + px * hw + dx * len, y + 0.06, z + pz * hw + dz * len],
      [x - px * hw + dx * len, y + 0.06, z - pz * hw + dz * len],
      [0.13, 0.12, 0.14], false);
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
  // Dusk factor: 0 at golden hour, 1 once the city lights switch on.
  const dusk = smoothstep(LIGHT.duskStart, LIGHT.duskStart + 0.8, state.dayTime);

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

  // --- Round 10: golden-hour clouds and seagulls, so the sky above the
  // skyline and the sea has shape and movement. ---
  drawClouds(renderer, time);
  drawSeagulls(renderer, time);

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

  // --- Round 10: living surf — foam lines roll up the east beach and
  // the isle's black-sand shore, advancing and retreating with time, so
  // the shoreline is never a dead straight edge. ---
  drawSurf(renderer, time);

  // --- Round 10: coastal mist — warm fog bands drifting over the strait
  // between the city and the isle, catching the golden light. ---
  drawMist(renderer, time);

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
    for (let d = -220; d <= 220; d += 12) {
      renderer.quad([c - 0.3, 0.48, d - 1.5], [c + 0.3, 0.48, d - 1.5], [c + 0.3, 0.48, d + 1.5], [c - 0.3, 0.48, d + 1.5], [0.7, 0.65, 0.4], false);
      renderer.quad([d - 1.5, 0.48, c - 0.3], [d + 1.5, 0.48, c - 0.3], [d + 1.5, 0.48, c + 0.3], [d - 1.5, 0.48, c + 0.3], [0.7, 0.65, 0.4], false);
    }
  }
  // Round 10 — zebra crossings at the four central intersections, so the
  // grid reads as a walked city and the chase has something to jump.
  drawCrosswalks(renderer);

  // --- Round 10: long golden-hour shadows — every tower throws one
  // east across the ground before the building itself is drawn, so the
  // low sun reads in the street layout, not just on the rooftops. ---
  for (const b of world.buildings) {
    renderer.longShadow(b.x, 0.5, b.z, b.w, b.d, b.h);
  }

  // --- Buildings with lit gold window strips (noFog) ---
  const neonCols = ['#ff5c8a', '#2fd8ff', '#7aff8a', '#ffd23c'];
  world.buildings.forEach((b, bi) => {
    renderer.box(b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color, { topColor: '#ffd98a' });
    const rows = b.windows;
    for (let r = 0; r < rows; r++) {
      const wy = 3 + r * 4;
      if (wy > b.h - 2) break;
      // Window light warms and brightens as dusk falls.
      const warm = 0.75 + dusk * 0.25;
      const strip = [1.0 * warm, 0.78 * warm, 0.32 * warm];
      renderer.box(b.x, wy, b.z + b.d / 2 + 0.15, b.w * 0.8, 0.7, 0.3, strip, { nofog: true });
      renderer.box(b.x, wy, b.z - b.d / 2 - 0.15, b.w * 0.8, 0.7, 0.3, strip, { nofog: true });
    }
    if (b.roof) renderer.box(b.x, b.h + 1, b.z, b.w * 0.4, 2, b.d * 0.4, '#8a6a3a');
    // Tall towers carry a thin rooftop antenna so the skyline reads taller.
    if (b.h >= 40) {
      renderer.box(b.x, b.h + 3, b.z, 0.6, 6, 0.6, '#222222');
      // Round 10 — red aircraft-warning beacon blinking on the antenna
      // tip, bright once dusk falls.
      const blink = Math.sin(time * 2 + bi) > 0 ? 1 : 0.35;
      renderer.box(b.x, b.h + 6.4, b.z, 0.9, 0.9, 0.9, [1.0 * blink, 0.12 * blink, 0.1 * blink], { nofog: true });
    }
    // Round 10 — one building in five carries a neon shop sign on its
    // street face, so the ground floor is not just dark glass.
    if (bi % 5 === 0 && b.h >= 14) {
      renderer.box(b.x, 5.5, b.z + b.d / 2 + 0.3, Math.min(9, b.w * 0.6), 1.4, 0.3, neonCols[bi % neonCols.length], { nofog: true });
    }
  });

  // --- Palms (swaying fronds) ---
  for (const p of world.palms) {
    const sway = Math.sin(time * 0.9 + p.phase) * 0.06;
    // Round 10 — every palm throws its own long shadow east, so the
    // beach road and the ring road read the same low sun as the towers.
    renderer.longShadow(p.x, 0.5, p.z, 1, 1, p.h);
    renderer.cylinder(p.x, 0, p.z, 0.5, p.h, '#5a3a1e', 6);
    const top = p.h;
    const lean = p.lean + sway;
    const fx = p.x + lean * 6, fz = p.z;
    renderer.quad([fx - 5, top, fz - 0.4], [fx + 5, top, fz - 0.4], [fx + 5, top + 1.2, fz + 0.4], [fx - 5, top + 1.2, fz + 0.4], [0.12, 0.45, 0.18], false);
    renderer.quad([fx - 0.4, top, fz - 5], [fx + 0.4, top, fz - 5], [fx + 0.4, top + 1.2, fz + 5], [fx - 0.4, top + 1.2, fz + 5], [0.10, 0.40, 0.16], false);
    renderer.box(fx, top + 0.6, fz, 1.6, 1.2, 1.6, '#6a4a22');
    // Round 10 — fallen coconuts at the foot of the trunk, so the palms
    // read as fruiting trees instead of bare poles.
    renderer.box(p.x + 0.9, 0.4, p.z + 0.5, 0.6, 0.6, 0.6, '#5a3a1e');
    renderer.box(p.x - 0.7, 0.4, p.z - 0.8, 0.55, 0.55, 0.55, '#6a4a22');
  }

  // --- Street lamps (small glow, not a big cube: a lamp seen from 6 m
  // away must still read as a lamp, so the glow box stays under a metre) ---
  for (const l of world.lamps) {
    renderer.cylinder(l.x, 0, l.z, 0.25, 7, '#2a2a30', 5);
    renderer.box(l.x, 7.2, l.z, 0.9, 0.5, 0.9, [1.0, 0.85, 0.45], { nofog: true });
    // Round 10 — a warm pool of light on the ground under each lamp,
    // strongest at dusk, so the streets glow instead of going black.
    const pool = 0.35 + dusk * 0.5;
    renderer.quad([l.x - 2.4, 0.52, l.z - 2.4], [l.x + 2.4, 0.52, l.z - 2.4], [l.x + 2.4, 0.52, l.z + 2.4], [l.x - 2.4, 0.52, l.z + 2.4], [0.55 * pool, 0.42 * pool, 0.18 * pool], false);
  }

  // --- Round 10: beach dressing — umbrellas, surfboards, ferry-route
  // buoys and pier crates/benches, all seeded in the world. ---
  drawBeachProps(renderer, world, time);

  // --- Round 10: the lived-in isle and the working harbour — fishing
  // village huts, resort blocks, dock cranes and tower billboards. ---
  drawVillage(renderer, world);
  drawResort(renderer, world);
  drawCranes(renderer, world);
  drawBillboards(renderer, world);
  // Round 10 — dock containers, bus stops, beach kites and volleyball,
  // so the harbour, the sidewalks and the sand all have their own life.
  drawContainers(renderer, world);
  drawBusStops(renderer, world);
  drawKites(renderer, time);
  drawVolleyball(renderer, time);
  drawBuoyFoam(renderer, world, time);
  // Round 10 — the isle ring road, street murals, a beach bonfire and
  // tide pools: the last details that make the map feel walked-in.
  drawIsleRingRoad(renderer);
  drawStreetArt(renderer, world);
  drawBonfire(renderer, time);
  drawTidePools(renderer, time);

  // --- Volcano: layered cone, lava flows, crater ring, beacon, smoke, sparks ---
  const v = VOLCANO;
  // Round 10 — the cone itself is layered now (see Renderer.cone): dark
  // basalt foot, warm mid-rock, glowing lava bands at the rim, with
  // per-face grain so it never reads as a flat brown triangle.
  renderer.cone(v.x, v.z, v.base, v.height, '#6e4a3e', 9);
  // Bright orange crater rim ring, visible from the side. The rim boxes
  // stay small (4.5 m) so they read as a glowing rim, not as spikes.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rx = v.x + Math.cos(a) * (v.craterR + 2), rz = v.z + Math.sin(a) * (v.craterR + 2);
    renderer.box(rx, v.height - 2, rz, 4.5, 2, 4.5, [1.0, 0.42, 0.06], { nofog: true });
  }
  // Lava flows down three slopes, as glowing ribbons lying ON the cone
  // surface: each segment follows the slope (p.y at one end, q.y at the
  // other) instead of lying flat, so the ribbon hugs the rock instead
  // of sticking out of it as an orange shard.
  for (const flow of world.lavaFlows) {
    for (let i = 0; i < flow.length - 1; i++) {
      const p = flow[i], q = flow[i + 1];
      const dx = q.x - p.x, dz = q.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const px = -dz / len * (p.w / 2), pz = dx / len * (p.w / 2);
      renderer.quad(
        [p.x - px, p.y + 0.7, p.z - pz], [p.x + px, p.y + 0.7, p.z + pz],
        [q.x + px, q.y + 0.7, q.z + pz], [q.x - px, q.y + 0.7, q.z - pz],
        [1.0, 0.38, 0.04], true);
    }
  }
  // Wide beacon beam above the crater + two dim side pillars rooted at the rim.
  renderer.box(v.x, v.height + 40, v.z, 5, 80, 5, [1.0, 0.55, 0.15], { nofog: true });
  renderer.box(v.x - 40, v.height + 15, v.z + 20, 6, 30, 6, [0.9, 0.35, 0.1], { nofog: true });
  renderer.box(v.x + 42, v.height + 15, v.z - 18, 6, 30, 6, [0.9, 0.35, 0.1], { nofog: true });
  // Smoke puffs above the crater, drifting with time. Kept small and
  // pale so they read as smoke, not as dark blocks over the crater.
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.12 + i / 3) % 1;
    renderer.box(v.x + Math.sin(i * 2.4) * 6 + t * 18, v.height + 6 + t * 26, v.z + Math.cos(i * 1.7) * 6, 5 + t * 6, 4 + t * 5, 5 + t * 6, [0.42, 0.40, 0.38], { nofog: false });
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
  // Second crater, enlarged, south-east of the main cone (layered too).
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

  // --- Ferry: detailed hull, cabin, chimney, deck lights, flag, foam wake ---
  drawFerry(renderer, state.ferry, time);
  // Two other boats on the ferry route so the sea is not empty.
  drawBoat(renderer, -360, 90, time * 0.2, '#2fa8ff', 1);
  drawBoat(renderer, -520, -90, time * 0.15 + 2, '#ffd23c', 0.8);
  // Round 10 — two more boats out on the eastern sea, so the beach shot's
  // water has life on the horizon as well as the ferry offshore.
  drawBoat(renderer, 350, -110, time * 0.1 + 1, '#ff8ad8', 1.1);
  drawBoat(renderer, 410, 70, time * 0.08 + 3, '#7aff8a', 0.9);

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
  for (const car of state.cars) drawCar(renderer, car, time);
  for (const ped of state.peds) drawPedestrian(renderer, ped, time);
  for (const coin of state.coins) {
    if (coin.taken) continue;
    const spin = time * 2 + coin.x;
    renderer.box(coin.x, coin.y + Math.sin(time + coin.z) * 0.4, coin.z, 1.4, 1.4, 0.4, [1.0, 0.84, 0.1], { rotY: spin, nofog: true });
  }
  if (state.heli) drawHeli(renderer, state.heli, state.player, time);
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
  // Round 10 — exhaust and dust puffs spawned by the simulation.
  for (const pt of state.particles || []) {
    const fade = 1 - pt.age / pt.life;
    const base = pt.kind === 'dust' ? [0.72, 0.62, 0.45] : [0.38, 0.36, 0.34];
    const c = [lerp(SKY.fogColor[0], base[0], fade), lerp(SKY.fogColor[1], base[1], fade), lerp(SKY.fogColor[2], base[2], fade)];
    renderer.box(pt.x, pt.y, pt.z, pt.size, pt.size * 0.8, pt.size, c, { nofog: false });
  }

  renderer.flush(proj, view);
}

// Round 10 — living surf: foam lines that roll up the east beach and the
// isle's black-sand shore, advancing and retreating with time. The foam
// is brightest near the waterline and thins as it climbs the sand.
function drawSurf(renderer, time) {
  for (let i = 0; i < SURF.foamLines; i++) {
    const advance = Math.sin(time * SURF.foamSpeed + i * 1.3) * 3.5;
    const x = 247 - i * 2.2 + advance;
    const bright = 0.95 - i * 0.07;
    renderer.quad([x, 0.55, -235], [x + SURF.foamWidth, 0.55, -235], [x + SURF.foamWidth, 0.55, 235], [x, 0.55, 235], [bright, bright, bright * 0.98], true);
  }
  // Foam ring on the isle's east shore, where the strait meets the black sand.
  for (let i = 0; i < 3; i++) {
    const advance = Math.sin(time * 0.4 + i * 2.1) * 2.5;
    const x = ISLE.x + 196 - i * 2 + advance;
    renderer.quad([x, 0.55, ISLE.z - 120], [x + 2.6, 0.55, ISLE.z - 120], [x + 2.6, 0.55, ISLE.z + 120], [x, 0.55, ISLE.z + 120], [0.9, 0.9, 0.88], true);
  }
}

// Round 10 — coastal mist: warm fog bands drifting slowly over the far
// strait, west of the ferry route, low enough to catch the golden light
// but clear of every shot camera's sightline.
function drawMist(renderer, time) {
  for (let i = 0; i < SURF.mistBands; i++) {
    const drift = Math.sin(time * 0.04 + i * 1.7) * 20;
    const mx = -430 + i * 55 + drift;
    const mz = -130 + i * 28;
    const my = 3 + i * 1.6;
    renderer.box(mx, my, mz, 120, 1.6, 22, [0.96, 0.74, 0.52], { nofog: false });
  }
}

// Round 10 — beach dressing: striped umbrellas with poles on Sunset
// Beach, surfboards stuck in the sand, orange buoys bobbing on the ferry
// route, and crates + benches on Sunset Pier.
function drawBeachProps(renderer, world, time) {
  for (const u of world.umbrellas || []) {
    renderer.cylinder(u.x, 1.2, u.z, 0.12, 2.6, '#8a6a3a', 5);
    renderer.box(u.x, 4.1, u.z, 4.6, 0.5, 4.6, u.color, { rotY: u.tilt });
    renderer.box(u.x, 4.5, u.z, 2.2, 0.5, 2.2, '#ffffff');
    // Round 10 — a striped beach towel and a cooler under each umbrella,
    // so the umbrellas read as people spending the day, not props.
    renderer.quad([u.x - 1.6, 1.25, u.z + 2.6], [u.x + 1.6, 1.25, u.z + 2.6], [u.x + 1.6, 1.25, u.z + 4.6], [u.x - 1.6, 1.25, u.z + 4.6], u.color, false);
    renderer.box(u.x + 2.4, 1.6, u.z + 3.4, 1.1, 0.9, 1.1, '#ffffff');
    renderer.box(u.x + 2.4, 2.2, u.z + 3.4, 1.2, 0.3, 1.2, u.color);
  }
  for (const s of world.surfboards || []) {
    renderer.box(s.x, 2.2, s.z, 0.7, 4.4, 0.25, s.color, { rotY: s.lean });
    renderer.box(s.x, 2.2, s.z, 0.75, 0.8, 0.3, '#ffffff', { rotY: s.lean });
  }
  for (const b of world.buoys || []) {
    const bob = Math.sin(time * 0.8 + b.phase) * 0.35;
    renderer.box(b.x, 0.9 + bob, b.z, 1.8, 1.6, 1.8, '#ff7a1f', { nofog: true });
    renderer.box(b.x, 1.9 + bob, b.z, 0.7, 0.9, 0.7, '#ffd23c', { nofog: true });
  }
  for (const p of world.pierProps || []) {
    if (p.kind === 'crate') {
      renderer.box(p.x, 1, p.z, 2.4, 2, 2.4, '#7a5a26');
      renderer.box(p.x, 2.6, p.z, 1.8, 1.4, 1.8, '#8a6a30');
    } else {
      renderer.box(p.x, 1, p.z, 3.4, 0.5, 1.2, '#6a4a26');
      renderer.box(p.x, 0.4, p.z, 0.4, 0.9, 1.2, '#4a3418');
    }
  }
}

function drawCar(renderer, car, time) {
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
  // Round 10 — the low sun stretches the car's shadow east across the road.
  renderer.longShadow(car.x, base + 0.55, car.z, 2.2, 4.6, 1.4, car.heading);
  renderer.box(car.x, base + 1.0, car.z, 4.6, 1.1, 2.1, c, { rotY: car.heading });
  renderer.box(car.x, base + 1.9, car.z, 2.4, 0.9, 1.9, shade2(c), { rotY: car.heading });
  for (const [dx, dz] of [[-1.5, -1.05], [1.5, -1.05], [-1.5, 1.05], [1.5, 1.05]]) {
    const [wx, wz] = at(dx, dz);
    renderer.box(wx, base + 0.45, wz, 0.9, 0.9, 0.5, '#111111', { rotY: car.heading });
  }
  // Headlights: two small pale lamps on the front face; taillights red —
  // and bright when the car is braking (Round 10 traffic AI sets it).
  for (const dx of [-1.2, 1.2]) {
    const [hx, hz] = at(dx, 1.15);
    renderer.box(hx, base + 1.0, hz, 0.55, 0.45, 0.3, [1.0, 0.95, 0.75], { rotY: car.heading, nofog: true });
    const [tx, tz] = at(dx, -1.15);
    const tail = car.braking ? [1.0, 0.35, 0.25] : [0.55, 0.08, 0.06];
    renderer.box(tx, base + 1.0, tz, 0.55, 0.45, 0.3, tail, { rotY: car.heading, nofog: true });
  }
  if (car.isPlayer) {
    renderer.box(car.x, base + 2.6, car.z, 0.8, 0.5, 0.8, [1.0, 0.85, 0.2], { nofog: true });
  }
  if (car.isPolice) {
    renderer.box(car.x, base + 2.5, car.z, 1.2, 0.5, 1.2, car.lightPhase ? '#ff2222' : '#2266ff', { nofog: true });
  }
  // Round 10 — fast cars trail exhaust puffs from the tailpipe, placed
  // deterministically from time so the frozen shots keep them too.
  if (Math.abs(car.speed || 0) > 15) {
    for (let k = 0; k < 3; k++) {
      const back = 2.6 + k * 1.7 + Math.sin(time * 2 + k * 2.1) * 0.5;
      const [px, pz] = at(0, -back);
      const puff = 0.8 + k * 0.5;
      renderer.box(px, base + 0.7 + k * 0.5, pz, puff, puff * 0.8, puff, [0.42, 0.40, 0.38], { nofog: false });
    }
  }
}
function shade2(hex) {
  const c = hexRgb(hex);
  return [clamp(c[0] * 0.7, 0, 1), clamp(c[1] * 0.7, 0, 1), clamp(c[2] * 0.7, 0, 1)];
}

// Round 10 — walking pedestrians: torso, head, and legs and arms that
// swing with the stride phase, so people read as walking instead of
// sliding. Staged shots freeze a mid-stride phase per pedestrian.
function drawPedestrian(renderer, ped, time) {
  const py = ped.y || 0;
  const swing = Math.sin(ped.walkPhase || 0) * 0.45;
  const dirX = Math.sin(ped.dir || 0), dirZ = Math.cos(ped.dir || 0);
  const px = -dirZ, pz = dirX; // lateral axis
  // Long shadow east, like everything else at golden hour.
  renderer.longShadow(ped.x, py + 0.06, ped.z, 0.8, 0.8, 1.8);
  // Legs: two dark boxes stepping forward and back along the walk dir.
  renderer.box(ped.x + dirX * swing, py + 0.5, ped.z + dirZ * swing, 0.32, 1.0, 0.32, '#22222a');
  renderer.box(ped.x - dirX * swing, py + 0.5, ped.z - dirZ * swing, 0.32, 1.0, 0.32, '#2e2e36');
  // Torso and head.
  renderer.box(ped.x, py + 1.5, ped.z, 0.8, 1.1, 0.8, ped.shirt);
  renderer.box(ped.x, py + 2.4, ped.z, 0.7, 0.7, 0.7, ped.skin);
  // Arms swinging opposite to the legs.
  renderer.box(ped.x + px * 0.55 - dirX * swing, py + 1.6, ped.z + pz * 0.55 - dirZ * swing, 0.26, 0.9, 0.26, ped.shirt);
  renderer.box(ped.x - px * 0.55 + dirX * swing, py + 1.6, ped.z - pz * 0.55 + dirZ * swing, 0.26, 0.9, 0.26, ped.shirt);
}

// Round 10 — Air One repainted bright: white fuselage with a red
// cheatline and a gold VCPD star, dark blue belly, white tail with a red
// tip, and a spinning-rotor blur disc — so the helicopter reads instantly
// against the orange sky and is never a dark blob behind the HUD panel.
// The searchlight beam and the gold spotlight pool under the player stay.
function drawHeli(renderer, h, player, time) {
  const white = hexRgb(HELI.body), red = hexRgb(HELI.cheatline);
  // Main fuselage: bright white, with the red cheatline as a thin stripe
  // along the side and the dark blue belly underneath.
  renderer.box(h.x, h.y, h.z, 8, 3, 4, white);
  renderer.box(h.x, h.y - 0.4, h.z, 8.2, 0.7, 4.2, red);
  renderer.box(h.x, h.y - 1.5, h.z, 6.5, 0.6, 3.2, hexRgb(HELI.belly));
  // Cockpit glass up front and the gold VCPD star on the flank.
  renderer.box(h.x + 3.4, h.y + 0.4, h.z, 1.6, 1.6, 3.6, '#9fd8ef');
  renderer.box(h.x, h.y + 0.2, h.z + 2.05, 1.6, 1.6, 0.2, hexRgb(HELI.star), { nofog: true });
  renderer.box(h.x, h.y + 0.2, h.z - 2.05, 1.6, 1.6, 0.2, hexRgb(HELI.star), { nofog: true });
  // Tail boom, white with a red tip, and the tail fin.
  renderer.box(h.x - 6.5, h.y + 0.5, h.z, 6, 1.4, 1.2, white);
  renderer.box(h.x - 9.2, h.y + 0.5, h.z, 1.2, 1.4, 1.2, red);
  renderer.box(h.x - 9.4, h.y + 1.6, h.z, 0.5, 2.2, 1.6, red);
  // Skids, searchlight housing, and the main rotor + blur disc.
  renderer.box(h.x, h.y - 2.1, h.z, 6.5, 0.4, 3.4, '#333333');
  renderer.box(h.x + 4.4, h.y - 0.8, h.z, 1.2, 1, 1.2, [1.0, 0.9, 0.5], { nofog: true });
  const rotorA = time * 9;
  renderer.box(h.x, h.y + 2.2, h.z, 15, 0.25, 0.9, '#1a1a1a', { rotY: rotorA });
  renderer.box(h.x, h.y + 2.2, h.z, 15, 0.25, 0.9, '#1a1a1a', { rotY: rotorA + Math.PI / 2 });
  // Air One searchlight: a narrow pale shaft from the heli down to the
  // player plus a small gold spotlight pool on the ground under the
  // player. Kept narrow (1 m at the heli, 2 m at the player) so the beam
  // reads as light, not as a solid sail filling the frame.
  const p = player;
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

// Round 10 — the ferry rebuilt with real detail: a red hull with a white
// sheer stripe and a dark waterline, a row of gold portholes, a white
// cabin with a window band and a blue upper deck, a funnel with a red
// band, a lifeboat on the cabin side, deck rails, and the flag mast moved
// to the stern corner — so the open bow deck is clear for the two parked
// cars, which no longer crowd the mast or the cabin.
function drawFerry(renderer, ferry, time) {
  const f = ferry;
  const s = Math.sin(f.heading), co = Math.cos(f.heading);
  // put(lx, lz, w, h, d, color, baseY, opts): box with its base at baseY,
  // positioned relative to the ferry's centre and heading.
  const put = (lx, lz, w, h, d, color, baseY, opts) => {
    const wx = f.x + lx * co - lz * s, wz = f.z + lx * s + lz * co;
    renderer.box(wx, baseY + h / 2, wz, w, h, d, color, { rotY: f.heading, ...(opts || {}) });
  };
  // Hull: deep red, with a dark waterline band at the bottom and a white
  // sheer stripe along the top edge.
  put(0, 0, 34, 7, 12, '#b8202e', 0.5);
  put(0, 0, 34.4, 1.4, 12.4, '#1a1214', 0.5); // waterline
  put(0, 0, 34.2, 1.2, 12.2, '#f2ede0', 6.2); // sheer stripe
  put(0, 0, 32, 2.4, 13, '#f2ede0', 0.5, { topColor: '#ffffff' }); // deck
  // Portholes: a row of small gold circles (boxes) along both hull sides.
  for (let i = -4; i <= 4; i++) {
    put(i * 3.4, 6.05, 0.9, 0.9, 0.3, [1.0, 0.82, 0.35], 3.6, { nofog: true });
    put(i * 3.4, -6.05, 0.9, 0.9, 0.3, [1.0, 0.82, 0.35], 3.6, { nofog: true });
  }
  // Cabin: white, shorter than before so the bow deck stays open, with a
  // dark window band and a blue upper deck with its own windows.
  put(-2, 0, 16, 5, 9, '#f2ede0', 7.5);
  for (let i = -2; i <= 2; i++) {
    put(-2 + i * 3, 4.55, 1.6, 1.8, 0.3, '#274b63', 9.2);
    put(-2 + i * 3, -4.55, 1.6, 1.8, 0.3, '#274b63', 9.2);
  }
  put(-4, 0, 12, 3.5, 7, '#3a6a8a', 12.5);
  for (let i = -1; i <= 1; i++) {
    put(-4 + i * 3.4, 3.55, 1.5, 1.5, 0.3, '#cfe8ff', 13.6);
    put(-4 + i * 3.4, -3.55, 1.5, 1.5, 0.3, '#cfe8ff', 13.6);
  }
  // Funnel with a red band, and an orange lifeboat on the cabin side.
  put(12, 0, 3, 9, 3, '#222222', 7.5);
  put(12, 0, 3.2, 1.6, 3.2, '#c81e3a', 13.5);
  put(2, 4.8, 5, 1.6, 1.4, '#ff7a1f', 8.5);
  // Deck rails along both open-deck edges.
  put(-13, 5.8, 8, 0.5, 0.3, '#dddddd', 8.2);
  put(-13, -5.8, 8, 0.5, 0.3, '#dddddd', 8.2);
  put(13, 5.8, 8, 0.5, 0.3, '#dddddd', 8.2);
  put(13, -5.8, 8, 0.5, 0.3, '#dddddd', 8.2);
  // Two parked deck cars on the open bow, clear of the cabin and the mast.
  put(-13.5, -3.2, 4.4, 1.1, 2.0, '#2fa8ff', 8.0);
  put(-13.5, -3.2, 2.3, 0.9, 1.8, '#1d5a8a', 9.4);
  // Flag mast at the stern corner (moved off the bow), flag flying.
  put(15.5, -4.5, 0.6, 12, 0.6, '#dddddd', 7.5);
  const flagX = f.x + 15.5 * co - (-4.5) * s, flagZ = f.z + 15.5 * s + (-4.5) * co;
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

// Round 10 — golden-hour clouds: long warm bands high above the city,
// drifting slowly east with time, so the sky has shape above the skyline.
function drawClouds(renderer, time) {
  for (const cl of CLOUDS.bands) {
    const x = cl.x + time * cl.drift;
    const warm = [0.98, 0.72, 0.48];
    const cool = [0.85, 0.55, 0.38];
    // Each band is three overlapping slabs: a bright lit top, a warm
    // middle and a cooler shaded base, so it reads as a cloud, not a bar.
    renderer.quad([x - cl.len / 2, cl.y + 6, cl.z - cl.w / 2], [x + cl.len / 2, cl.y + 6, cl.z - cl.w / 2], [x + cl.len / 2, cl.y + 6, cl.z + cl.w / 2], [x - cl.len / 2, cl.y + 6, cl.z + cl.w / 2], warm, true);
    renderer.quad([x - cl.len / 2 * 0.9, cl.y, cl.z - cl.w / 2], [x + cl.len / 2 * 0.9, cl.y, cl.z - cl.w / 2], [x + cl.len / 2 * 0.9, cl.y, cl.z + cl.w / 2], [x - cl.len / 2 * 0.9, cl.y, cl.z + cl.w / 2], warm, true);
    renderer.quad([x - cl.len / 2 * 0.8, cl.y - 5, cl.z - cl.w / 2 * 0.8], [x + cl.len / 2 * 0.8, cl.y - 5, cl.z - cl.w / 2 * 0.8], [x + cl.len / 2 * 0.8, cl.y - 5, cl.z + cl.w / 2 * 0.8], [x - cl.len / 2 * 0.8, cl.y - 5, cl.z + cl.w / 2 * 0.8], cool, true);
  }
}

// Round 10 — seagulls: white birds circling the pier, the beach and the
// ferry route on fixed paths, wings as two angled quads that flap with
// time, so the sky above the water is never empty.
function drawSeagulls(renderer, time) {
  let gi = 0;
  for (const flock of BIRDS.flocks) {
    for (let i = 0; i < 3; i++) {
      const a = flock.phase + time * flock.speed + (i / 3) * Math.PI * 2;
      const gx = flock.cx + Math.cos(a) * flock.r;
      const gz = flock.cz + Math.sin(a) * flock.r;
      const gy = flock.y + Math.sin(time * 0.7 + gi) * 2;
      const flap = Math.sin(time * 6 + gi * 1.7) * 0.9;
      const heading = a + Math.PI / 2;
      const s = Math.sin(heading), co = Math.cos(heading);
      // Body + two wings, each wing a quad angled by the flap.
      renderer.box(gx, gy, gz, 1.1, 0.35, 0.5, '#ffffff', { rotY: heading, nofog: true });
      const wx = gx - co * 0.9, wz = gz + s * 0.9;
      renderer.quad([wx - s * 0.4, gy + flap, wz - co * 0.4], [wx + s * 0.4, gy + flap, wz + co * 0.4], [wx + s * 1.6, gy + flap * 0.4, wz + co * 1.6], [wx - s * 1.6, gy + flap * 0.4, wz - co * 1.6], '#f2f2f2', true);
      const vx = gx + co * 0.9, vz = gz - s * 0.9;
      renderer.quad([vx - s * 0.4, gy - flap, vz - co * 0.4], [vx + s * 0.4, gy - flap, vz + co * 0.4], [vx + s * 1.6, gy - flap * 0.4, vz + co * 1.6], [vx - s * 1.6, gy - flap * 0.4, vz - co * 1.6], '#e8e8e8', true);
      gi++;
    }
  }
}

// Round 10 — the fishing village: small huts with thatched roofs and
// warm walls on the isle's south shore, each with a lit doorway.
function drawVillage(renderer, world) {
  for (const hut of world.villageHuts || []) {
    renderer.box(hut.x, hut.h / 2, hut.z, hut.w, hut.h, hut.w * 0.9, hut.wall);
    renderer.box(hut.x, hut.h + 0.8, hut.z, hut.w + 1.2, 1.6, hut.w, hut.roof, { topColor: hut.roof });
    renderer.box(hut.x, 1.1, hut.z + hut.w * 0.45 + 0.1, 1.4, 2.2, 0.3, [1.0, 0.78, 0.35], { nofog: true });
    renderer.longShadow(hut.x, 0.4, hut.z, hut.w, hut.w, hut.h);
  }
}

// Round 10 — the Ember Resort: white and pale-blue blocks with lit
// window strips on the isle's north shore, for the resort raid mission.
function drawResort(renderer, world) {
  for (const b of world.resortBlocks || []) {
    renderer.box(b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color, { topColor: '#ffd98a' });
    for (let r = 0; r < 3; r++) {
      const wy = 3 + r * 3.6;
      if (wy > b.h - 2) break;
      renderer.box(b.x, wy, b.z + b.d / 2 + 0.15, b.w * 0.8, 0.8, 0.3, [1.0, 0.8, 0.4], { nofog: true });
    }
    renderer.box(b.x, b.h + 1, b.z, b.w * 0.5, 2, b.d * 0.5, '#c81e3a');
    renderer.longShadow(b.x, 0.4, b.z, b.w, b.d, b.h);
  }
}

// Round 10 — Harbor Docks cranes: tall yellow legs, a long jib reaching
// over the water, a hanging hook block and a counterweight, so the
// working harbour reads from the city as well as from the sea.
function drawCranes(renderer, world) {
  for (const cr of world.cranes || []) {
    renderer.box(cr.x, cr.h / 2, cr.z, 4, cr.h, 4, '#e8b81e');
    renderer.box(cr.x, cr.h - 2, cr.z, 4.5, 3, 4.5, '#c89a12');
    // Jib reaching east over the docks, with a hook block hanging below.
    renderer.box(cr.x + cr.reach / 2, cr.h + 1, cr.z, cr.reach, 1.6, 1.6, '#e8b81e');
    renderer.box(cr.x + cr.reach - 4, cr.h - 8, cr.z, 2, 2, 2, '#333333');
    renderer.box(cr.x - 8, cr.h + 1, cr.z, 5, 3, 3, '#8a6a10');
    // Red warning light on the crane top.
    renderer.box(cr.x, cr.h + 3.4, cr.z, 0.9, 0.9, 0.9, [1.0, 0.15, 0.1], { nofog: true });
    renderer.longShadow(cr.x, 0.4, cr.z, 4, 4, cr.h);
  }
}

// Round 10 — billboards on the tallest towers: big bright panels with a
// coloured frame, facing the roads so the skyline has advertising, not
// just glass.
function drawBillboards(renderer, world) {
  for (const b of world.billboards || []) {
    renderer.box(b.x, b.y, b.z, 12, 7, 0.6, b.color, { nofog: true });
    renderer.box(b.x, b.y, b.z + 0.4, 10, 5, 0.3, '#ffffff', { nofog: true });
    renderer.box(b.x, b.y, b.z + 0.6, 3, 3, 0.3, b.color, { nofog: true });
  }
}

// Round 10 — zebra crossings at the four central intersections: white
// stripes across both roads, so the grid reads as a walked city.
function drawCrosswalks(renderer) {
  for (const [cx, cz] of [[23, 23], [23, -23], [-23, 23], [-23, -23]]) {
    for (let i = -3; i <= 3; i++) {
      renderer.quad([cx + i * 2 - 0.7, 0.5, cz - 6.5], [cx + i * 2 + 0.7, 0.5, cz - 6.5], [cx + i * 2 + 0.7, 0.5, cz - 4.5], [cx + i * 2 - 0.7, 0.5, cz - 4.5], [0.85, 0.85, 0.82], false);
      renderer.quad([cx - 6.5, 0.5, cz + i * 2 - 0.7], [cx - 4.5, 0.5, cz + i * 2 - 0.7], [cx - 4.5, 0.5, cz + i * 2 + 0.7], [cx - 6.5, 0.5, cz + i * 2 + 0.7], [0.85, 0.85, 0.82], false);
    }
  }
}

// Round 10 — dock containers: rust-red, sea-blue, gold and green boxes
// stacked in rows at Harbor Docks, some two high, with corrugated
// stripe lines on their long faces.
function drawContainers(renderer, world) {
  for (const c of world.containers || []) {
    const y = c.level * 2.6;
    renderer.box(c.x, y + 1.3, c.z, 7, 2.6, 2.8, c.color);
    renderer.box(c.x, y + 1.3, c.z + 1.45, 6.6, 0.5, 0.2, '#ffffff');
    renderer.box(c.x, y + 1.3, c.z - 1.45, 6.6, 0.5, 0.2, '#ffffff');
    renderer.longShadow(c.x, 0.4, c.z, 7, 2.8, 2.6);
  }
}

// Round 10 — bus stops: a shelter roof on two posts, a bench, and a
// yellow route sign, on four of the city's main roads.
function drawBusStops(renderer, world) {
  for (const s of world.busStops || []) {
    renderer.box(s.x, 3.4, s.z, 4.4, 0.3, 2.2, '#2e5a78');
    renderer.box(s.x - 1.9, 1.7, s.z - 0.9, 0.3, 3.4, 0.3, '#333333');
    renderer.box(s.x + 1.9, 1.7, s.z - 0.9, 0.3, 3.4, 0.3, '#333333');
    renderer.box(s.x, 1.2, s.z, 3.6, 0.5, 1.4, '#6a4a26');
    renderer.box(s.x + 2.6, 2.6, s.z, 0.9, 1.6, 0.3, '#ffd23c', { nofog: true });
  }
}

// Round 10 — beach kites: three bright diamond kites dancing over
// Sunset Beach on long strings, bobbing and swaying with time.
function drawKites(renderer, time) {
  for (let i = 0; i < DOCKS.kites; i++) {
    const kx = 226 + i * 8;
    const kz = -40 + i * 55;
    const sway = Math.sin(time * 0.5 + i * 2.2) * 6;
    const bob = Math.sin(time * 0.9 + i * 1.4) * 3;
    const ky = 26 + i * 4 + bob;
    const col = KITE_COLS[i % KITE_COLS.length];
    // Diamond kite: two triangles as a rotated quad pair.
    renderer.quad([kx + sway - 2.2, ky, kz], [kx + sway, ky + 2.6, kz], [kx + sway + 2.2, ky, kz], [kx + sway, ky - 2.2, kz], col, true);
    renderer.box(kx + sway, ky - 3.2, kz, 0.5, 1.6, 0.2, col, { nofog: true });
    // The string runs down to the sand in segments, sagging with time.
    for (let s = 0; s < 6; s++) {
      const t = s / 6;
      const sx = kx + sway * (1 - t) + Math.sin(time + s) * 0.6;
      const sz = kz + t * 4;
      const sy = ky - 4 - t * (ky - 5);
      renderer.box(sx, sy, sz, 0.15, 0.15, 0.15, '#dddddd', { nofog: true });
    }
  }
}

// Round 10 — beach volleyball: a net strung between two poles on the
// sand near the umbrellas, with a white ball frozen mid-arc above it.
function drawVolleyball(renderer, time) {
  const nx = 232, nz = 60;
  renderer.box(nx - 4, 1.4, nz, 0.3, 2.8, 0.3, '#dddddd');
  renderer.box(nx + 4, 1.4, nz, 0.3, 2.8, 0.3, '#dddddd');
  renderer.box(nx, 2.5, nz, 8, 1.0, 0.2, '#ffffff');
  renderer.box(nx, 2.5, nz, 8, 0.3, 0.25, '#2fa8ff');
  // The ball arcs over the net, its height a fixed function of time so
  // the frozen shot catches it at the top of the arc.
  const arc = Math.sin(time * 1.1) * 0.5 + 0.5;
  renderer.box(nx + 1.5, 4.2 + arc * 2.4, nz + 0.8, 1.1, 1.1, 1.1, '#ffffff', { nofog: true });
  // Two towels and a cooler by the court, for the players.
  renderer.quad([nx - 6, 1.25, nz + 6], [nx - 3, 1.25, nz + 6], [nx - 3, 1.25, nz + 8], [nx - 6, 1.25, nz + 8], '#ff5c8a', false);
  renderer.box(nx + 5, 1.6, nz + 7, 1.1, 0.9, 1.1, '#2fa8ff');
}

// Round 10 — foam rings around the ferry-route buoys: white circles
// (as flat quads) that pulse with the swell, so the buoys sit IN the
// water instead of floating on a flat blue sheet.
function drawBuoyFoam(renderer, world, time) {
  for (const b of world.buoys || []) {
    const pulse = 1 + Math.sin(time * 0.8 + b.phase) * 0.25;
    const r = 2.6 * pulse;
    renderer.quad([b.x - r, 0.55, b.z - r], [b.x + r, 0.55, b.z - r], [b.x + r, 0.55, b.z + r], [b.x - r, 0.55, b.z + r], [0.92, 0.94, 0.96], true);
  }
}

// Round 10 — the isle ring road: a dark asphalt ring around Ember Isle
// at radius 150, so the island's palm ring has a road to drive, not
// just dirt. Built from 24 flat segments so it follows the circle.
function drawIsleRingRoad(renderer) {
  const segs = 24;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const r0 = 146, r1 = 154;
    const ax0 = ISLE.x + Math.cos(a0) * r0, az0 = ISLE.z + Math.sin(a0) * r0;
    const ax1 = ISLE.x + Math.cos(a0) * r1, az1 = ISLE.z + Math.sin(a0) * r1;
    const bx0 = ISLE.x + Math.cos(a1) * r0, bz0 = ISLE.z + Math.sin(a1) * r0;
    const bx1 = ISLE.x + Math.cos(a1) * r1, bz1 = ISLE.z + Math.sin(a1) * r1;
    renderer.quad([ax0, 0.45, az0], [ax1, 0.45, az1], [bx1, 0.45, bz1], [bx0, 0.45, bz0], [0.09, 0.09, 0.11], false);
    // Centre dashes on every other segment.
    if (i % 2 === 0) {
      const mx = ISLE.x + Math.cos((a0 + a1) / 2) * 150, mz = ISLE.z + Math.sin((a0 + a1) / 2) * 150;
      renderer.box(mx, 0.5, mz, 2.4, 0.1, 0.6, [0.7, 0.65, 0.4]);
    }
  }
}

// Round 10 — street murals: big flat colour panels on three tower
// faces — a sun, waves and a palm — so the concrete has art, not just
// glass and gold.
function drawStreetArt(renderer, world) {
  const murals = [
    { color: '#ff9a3c', shape: 'sun' },
    { color: '#2fa8ff', shape: 'wave' },
    { color: '#7aff8a', shape: 'palm' },
  ];
  const picks = [...world.buildings].filter((b) => b.h >= 20).slice(4, 7);
  picks.forEach((b, i) => {
    const m = murals[i % murals.length];
    const y = b.h * 0.45;
    // The mural panel itself, on the building's south face.
    renderer.box(b.x, y, b.z + b.d / 2 + 0.2, b.w * 0.7, b.h * 0.5, 0.3, m.color, { nofog: true });
    if (m.shape === 'sun') {
      renderer.box(b.x, y + 2, b.z + b.d / 2 + 0.4, 4, 4, 0.3, '#ffd23c', { nofog: true });
    } else if (m.shape === 'wave') {
      renderer.box(b.x - 2, y - 1, b.z + b.d / 2 + 0.4, 7, 1.2, 0.3, '#ffffff', { nofog: true });
      renderer.box(b.x + 1, y + 1.5, b.z + b.d / 2 + 0.4, 7, 1.2, 0.3, '#ffffff', { nofog: true });
    } else {
      renderer.box(b.x, y + 1, b.z + b.d / 2 + 0.4, 0.8, 5, 0.3, '#5a3a1e', { nofog: true });
      renderer.box(b.x, y + 4, b.z + b.d / 2 + 0.4, 5, 1, 0.3, '#2fa84a', { nofog: true });
    }
  });
}

// Round 10 — a beach bonfire on the sand south of the umbrellas: stacked
// logs, a flickering orange flame that dances with time, and a thin
// smoke column rising off it.
function drawBonfire(renderer, time) {
  const bx = 234, bz = -140;
  renderer.box(bx, 0.8, bz, 3.4, 0.5, 3.4, '#3a3a3a');
  renderer.box(bx - 0.8, 1.2, bz, 2.4, 0.5, 0.5, '#5a3a1e', { rotY: 0.5 });
  renderer.box(bx + 0.8, 1.2, bz, 2.4, 0.5, 0.5, '#6a4a22', { rotY: -0.5 });
  const flick = 1 + Math.sin(time * 7) * 0.18 + Math.sin(time * 13) * 0.1;
  renderer.box(bx, 2.2 * flick, bz, 1.4 * flick, 2.4 * flick, 1.4 * flick, [1.0, 0.55, 0.12], { nofog: true });
  renderer.box(bx, 3.4 * flick, bz, 0.8, 1.6, 0.8, [1.0, 0.85, 0.3], { nofog: true });
  // Warm light pool on the sand around the fire.
  renderer.quad([bx - 5, 0.5, bz - 5], [bx + 5, 0.5, bz - 5], [bx + 5, 0.5, bz + 5], [bx - 5, 0.5, bz + 5], [0.55, 0.35, 0.12], false);
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.1 + i / 3) % 1;
    renderer.box(bx + t * 6, 5 + t * 14, bz - t * 3, 2 + t * 3, 1.6 + t * 2, 2 + t * 3, [0.4, 0.38, 0.36], { nofog: false });
  }
}

// Round 10 — tide pools: small still mirrors of sky-blue on the sand,
// shimmering gently with time as the surf breathes.
function drawTidePools(renderer, time) {
  for (const pool of TIDE_POOLS) {
    const shimmer = 0.55 + Math.sin(time * 0.6 + pool.x) * 0.08;
    renderer.quad(
      [pool.x - pool.r, 0.5, pool.z - pool.r * 0.7],
      [pool.x + pool.r, 0.5, pool.z - pool.r * 0.7],
      [pool.x + pool.r, 0.5, pool.z + pool.r * 0.7],
      [pool.x - pool.r, 0.5, pool.z + pool.r * 0.7],
      [0.25 * shimmer + 0.15, 0.45 * shimmer + 0.1, 0.65 * shimmer + 0.15], true);
    renderer.quad(
      [pool.x - pool.r * 0.5, 0.55, pool.z - pool.r * 0.3],
      [pool.x + pool.r * 0.5, 0.55, pool.z - pool.r * 0.3],
      [pool.x + pool.r * 0.5, 0.55, pool.z + pool.r * 0.3],
      [pool.x - pool.r * 0.5, 0.55, pool.z + pool.r * 0.3],
      [0.9, 0.85, 0.6], true);
  }
}
