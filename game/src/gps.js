// GPS for Vesper City: Ember Isle.
// The route to the next objective: a simple Manhattan route along the
// road lines (east-west, then north-south), drawn on the minimap and
// as a floating arrow in the world. The GPS owns the route points and
// the next-turn hint ("Turn left in 215m — Sunset Beach"); the world
// loop asks it where to point the player, and the HUD draws it.

import { roadLines } from './city.js';
import { nearestLandmark } from './city.js';

// Build a route from (x,z) to (tx,tz): go along the nearest east-west
// road, then the nearest north-south road. Returns waypoints.
export function buildRoute(x, z, tx, tz) {
  const lines = roadLines();
  const nearest = (v) => {
    let best = lines[0];
    for (const c of lines) if (Math.abs(c - v) < Math.abs(best - v)) best = c;
    return best;
  };
  const midX = nearest(tx);
  const midZ = nearest(z);
  const points = [{ x, z }];
  if (Math.abs(midX - x) > 2) points.push({ x: midX, z });
  if (Math.abs(tz - midZ) > 2) points.push({ x: midX, z: tz });
  points.push({ x: tx, z: tz });
  return points;
}

// The next waypoint on the route (the first one further than 6m away).
export function nextWaypoint(route, x, z) {
  for (const p of route) {
    const d = Math.sqrt((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z));
    if (d > 6) return { ...p, dist: Math.round(d) };
  }
  const last = route[route.length - 1];
  return { ...last, dist: 0 };
}

// The turn hint: which way to turn and how far, for the HUD.
export function gpsHint(route, x, z, angle, landmarkName) {
  const next = nextWaypoint(route, x, z);
  const dx = next.x - x;
  const dz = next.z - z;
  const targetAngle = Math.atan2(dx, dz);
  let da = targetAngle - angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const dir = da > 0.5 ? 'Turn right' : da < -0.5 ? 'Turn left' : da > 0.15 ? 'Bear right' : da < -0.15 ? 'Bear left' : 'Straight ahead';
  const place = landmarkName ? ` · ${landmarkName}` : '';
  return `GPS ${next.dist}m · ${dir}${place}`;
}

// Distance along the route, for the HUD ("715m to Sunset Beach").
export function routeDistance(route, x, z) {
  let total = 0;
  let px = x;
  let pz = z;
  for (const p of route) {
    total += Math.sqrt((p.x - px) * (p.x - px) + (p.z - pz) * (p.z - pz));
    px = p.x;
    pz = p.z;
  }
  return Math.round(total);
}

// The nearest landmark to the target, for the hint line.
export function targetLandmark(tx, tz, landmarks) {
  const l = nearestLandmark(tx, tz, landmarks);
  return l ? l.name : null;
}
