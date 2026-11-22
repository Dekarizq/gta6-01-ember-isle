// Island side jobs — work on Ember Isle.
// Three ways to earn on the island: fishing at the dock, guiding
// tourists around the volcano, and the smuggling run nobody talks
// about. Same shape as the city jobs (offered -> active -> done), but
// the targets are island places and the pay is better — the volcano
// is good for tourism and better for secrets.

import { ISLAND, islandRoadPoints } from './island.js';
import { clamp } from './random.js';

export const ISLAND_JOB_TYPES = [
  { id: 'fishing', name: 'Fishing Charter', pay: 160, respect: 20, timeLimit: 100, blurb: 'Take the boat out, catch the morning haul, bring it to the dock.' },
  { id: 'tour', name: 'Volcano Tour Guide', pay: 220, respect: 30, timeLimit: 110, blurb: 'Drive tourists to the crater road and back before the lava report.' },
  { id: 'smuggling', name: 'Smuggling Run', pay: 400, respect: 40, timeLimit: 80, blurb: 'No lights, no questions, one cove to the next. The patrol is watching.' },
];

export function createIslandJobs() {
  return {
    active: null,
    completed: 0,
    earned: 0,
    failed: 0,
    offered: null,
  };
}

export function offerIslandJob(jobs, rng) {
  const type = rng.pick(ISLAND_JOB_TYPES);
  jobs.offered = { ...type };
  return jobs.offered;
}

export function startIslandJob(jobs, rng) {
  if (!jobs.offered) return null;
  const type = jobs.offered;
  const roads = islandRoadPoints();
  const spots = [roads.dock, roads.village, roads.resort, roads.lighthouse, roads.market, roads.craterRoad];
  const target = rng.pick(spots);
  const checkpoints = [];
  if (type.id === 'tour') {
    checkpoints.push(roads.craterRoad, roads.market);
  }
  if (type.id === 'smuggling') {
    checkpoints.push({ x: ISLAND.x - 200, z: ISLAND.z + 180 });
  }
  jobs.active = {
    type,
    target,
    checkpoints,
    checkpointIndex: 0,
    timeLeft: type.timeLimit,
  };
  jobs.offered = null;
  return jobs.active;
}

export function stepIslandJob(jobs, dt, px, pz) {
  const job = jobs.active;
  if (!job) return null;
  job.timeLeft -= dt;
  if (job.timeLeft <= 0) {
    jobs.active = null;
    jobs.failed += 1;
    return { event: 'failed', reason: 'time', job: job.type };
  }
  const dest = job.checkpoints.length > 0 && job.checkpointIndex < job.checkpoints.length
    ? job.checkpoints[job.checkpointIndex]
    : job.target;
  const d = Math.sqrt((dest.x - px) * (dest.x - px) + (dest.z - pz) * (dest.z - pz));
  if (d < 10) {
    if (job.checkpoints.length > 0 && job.checkpointIndex < job.checkpoints.length - 1) {
      job.checkpointIndex += 1;
      return { event: 'checkpoint', index: job.checkpointIndex, job: job.type };
    }
    jobs.active = null;
    jobs.completed += 1;
    jobs.earned += job.type.pay;
    return { event: 'done', pay: job.type.pay, respect: job.type.respect, job: job.type };
  }
  return null;
}

export function islandJobLabel(jobs) {
  if (jobs.active) {
    const job = jobs.active;
    return `${job.type.name} — ${Math.ceil(job.timeLeft)}s left`;
  }
  if (jobs.offered) return `Island job: ${jobs.offered.name} — $${jobs.offered.pay} (press J to start)`;
  return 'No island job — press J for work.';
}

export function islandJobSummary(jobs) {
  return {
    active: jobs.active ? jobs.active.type.name : null,
    timeLeft: jobs.active ? Math.ceil(jobs.active.timeLeft) : 0,
    completed: jobs.completed,
    failed: jobs.failed,
    earned: jobs.earned,
    offered: jobs.offered ? jobs.offered.name : null,
  };
}

export function islandJobSave(jobs) {
  return { completed: jobs.completed, earned: jobs.earned, failed: jobs.failed };
}

export function islandJobLoad(data) {
  const j = createIslandJobs();
  if (!data) return j;
  if (Number.isInteger(data.completed)) j.completed = data.completed;
  if (Number.isFinite(data.earned)) j.earned = data.earned;
  if (Number.isInteger(data.failed)) j.failed = data.failed;
  return j;
}

export { clamp };
