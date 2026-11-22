// Vesper City: Ember Isle — entry program (Node 22, stdlib only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with the kit's buildDossier.
//
// Written from scratch for the gta6-01 bounty; the kit's vendor library
// is imported unchanged from vendor/makefun-game.ts.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
// Rev2 note: the caps above are the kit's hard limits — the four new
// screenshots must each stay under 262144 bytes (the verifier re-takes
// them at lower JPEG quality until they fit).

function copyDir(src, dst) {
  if (!existsSync(src)) throw new Error(`missing directory: ${src}`);
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const gameSrc = join(here, 'game');
  const shotsSrc = join(here, 'screenshots');
  const gameDst = join(outDir, 'game');
  const shotsDst = join(outDir, 'screenshots');
  rmSync(gameDst, { recursive: true, force: true });
  rmSync(shotsDst, { recursive: true, force: true });
  copyDir(gameSrc, gameDst);
  copyDir(shotsSrc, shotsDst);
  const shots = readdirSync(shotsDst).filter((f) => !f.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  // Round 10 — fail the build loudly if a screenshot breaks the kit's
  // 262144-byte cap, instead of shipping a dossier the grader rejects.
  for (const shot of shots) {
    const { size } = statSync(join(shotsDst, shot));
    if (size > caps.screenshots.max_bytes) {
      throw new Error(`screenshot ${shot} is ${size} bytes, over the ${caps.screenshots.max_bytes}-byte cap`);
    }
  }
  const dossier = buildDossier(outDir, caps);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  const gameFiles = readdirSync(gameDst, { recursive: true }).length;
  console.log(`Vesper City: Ember Isle — ${shots.length} screenshots, ${gameFiles} game entries, dossier ${dossier.length} bytes`);
}

main();
