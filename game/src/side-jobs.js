// Side jobs for Vesper City: Ember Isle.
// Honest work between the heists: drive a taxi fare across town,
// deliver a package before the timer runs out, or win a sprint race
// against the clock. Jobs pay cash and respect, repeat forever, and
// the world loop offers them with J. Each job is a small state machine:
// offered -> active -> done (or failed), with a timer and a target.

import { roadCross, roadPointNear } from './city.js';
import { clamp } from './random.js';

export const JOB_TYPES = [
  { id: 'taxi', name: 'Taxi Fare', pay: 120, respect: 15, timeLimit: 90, blurb: 'Drive a fare across town before they change their mind.' },
  { id: 'delivery', name: 'Delivery Run', pay: 180, respect: 20, timeLimit: 75, blurb: 'A package, a timer, and the whole city between them.' },
  { id: 'sprint', name: 'Sprint Race', pay: 250, respect: 30, timeLimit: 60, blurb: 'Beat the clock through three checkpoints.' },
];

export function createJobs() {
  return {
    active: null, // {type, target, timeLeft, checkpoints, checkpointIndex}
    completed: 0,
    earned: 0,
    failed: 0,
    offered: null,
  };
}

export function offerJob(jobs, rng) {
  const type = rng.pick(JOB_TYPES);
  jobs.offered = { ...type };
  return jobs.offered;
}

// Start the offered job: pick a target point on the roads.
export function startJob(jobs, rng) {
  if (!jobs.offered) return null;
  const type = jobs.offered;
  const target = roadPointNear(rng, 0, 0, 180);
  const checkpoints = [];
  if (type.id === 'sprint') {
    for (let i = 0; i < 3; i += 1) {
      checkpoints.push(roadPointNear(rng, target.x, target.z, 120));
    }
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

// Step the active job. Returns an event: null, 'checkpoint', 'done'
// or 'failed'. The player position decides checkpoints and delivery.
export function stepJob(jobs, dt, px, pz) {
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
  if (d < 8) {
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

export function jobLabel(jobs) {
  if (jobs.active) {
    const job = jobs.active;
    return `${job.type.name} — ${Math.ceil(job.timeLeft)}s left`;
  }
  if (jobs.offered) return `Job offered: ${jobs.offered.name} — $${jobs.offered.pay} (press J to start)`;
  return 'No active job — press J for work.';
}

export function jobSummary(jobs) {
  return {
    active: jobs.active ? jobs.active.type.name : null,
    timeLeft: jobs.active ? Math.ceil(jobs.active.timeLeft) : 0,
    completed: jobs.completed,
    failed: jobs.failed,
    earned: jobs.earned,
    offered: jobs.offered ? jobs.offered.name : null,
  };
}

export function jobSave(jobs) {
  return { completed: jobs.completed, earned: jobs.earned, failed: jobs.failed };
}

export function jobLoad(data) {
  const j = createJobs();
  if (!data) return j;
  if (Number.isInteger(data.completed)) j.completed = data.completed;
  if (Number.isFinite(data.earned)) j.earned = data.earned;
  if (Number.isInteger(data.failed)) j.failed = data.failed;
  return j;
}

export { roadCross, clamp };
