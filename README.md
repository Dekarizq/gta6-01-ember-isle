# Vesper City: Ember Isle

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Dekarizq/gta6-01-ember-isle/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Dekarizq/gta6-01-ember-isle/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built from scratch in plain
HTML + ES modules + raw WebGL — no build step, no network requests, no
external libraries. Twenty story missions, wanted levels 0–6 with the VCPD
Air One helicopter, roadblocks and spike strips, respect & crew (Lena Voss,
Rook, Dario Kess), a GPS mission beacon, 6 street races, 10 businesses,
garage upgrades, a weapon wheel, 8 radio stations, a ferry to the volcanic
Ember Isle, 42 Sun Coins and 3 save slots.

**Setting:** Vesper City, a golden-hour coastal city of 9x9 tower blocks and
8 districts, plus Ember Isle across the strait — a volcanic island with a
glowing crater, black-sand beaches, a fishing village, a lighthouse, a resort
and a night market, reached by ferry from Sunset Pier.

**You are Mara Voss**, a driver returning home to take the throne from the
Tide Kings.

## Round 10 — a living golden hour

This round rewrites the world so it moves instead of posing:

- **Dynamic golden-hour light** — the low western sun throws long
  east-pointing shadows off every tower, car and pedestrian, window light
  warms as dusk falls, and rooftop beacons + neon signs switch on
- **Traffic AI** — cars brake for the car ahead, change lane to overtake,
  and turn at grid intersections; brake lights glow when they slow
- **Walking pedestrians** — legs and arms swing with a real stride phase
- **Living surf & coastal mist** — foam lines roll up Sunset Beach and the
  isle's black-sand shore, warm fog bands drift over the strait
- **Exhaust & dust** — fast cars trail puffs; handbrake slides kick up dust
- **Air One repainted** — bright rescue white with a red cheatline and a
  gold VCPD star, so the helicopter reads instantly against the sky
- **Detailed ferry** — portholes, waterline, window bands, funnel, lifeboat,
  deck rails, flag mast moved to the stern so the bow deck stays open
- **Layered volcano** — basalt foot, warm mid-rock, glowing lava bands at
  the rim, per-face grain instead of a flat brown cone
- **Beach dressing** — striped umbrellas, surfboards, ferry-route buoys,
  pier crates and benches; ferry horn on departure (H), seagulls, touch
  controls for phone play
- **Side jobs & wanted heat** — taxi, courier, vigilante and tour jobs
  (T), near-miss respect bonuses, and a heat meter that cools when Mara
  hides; ride the ferry across the strait on foot
- **Sky & harbour life** — drifting golden-hour clouds, circling seagulls,
  fishing-village huts, resort blocks, dock cranes, tower billboards and
  zebra crossings
- **Docks, kites & chases** — stacked shipping containers, bus stops,
  beach kites and a volleyball court, buoy foam rings, fallen coconuts;
  police PIT maneuvers and rams, pedestrians who flee a 3-star chase
- **Finishing touches** — isle ring road, street murals, a beach bonfire,
  tide pools, idle hints, businesses that grow with the story

## What is in the game

- 20 story missions (12 in the city, 8 on the isle), ending in "Queen of Ember"
- VCPD with named units and their own tactics, police helicopter Air One,
  roadblocks and spike strips; wanted levels 0–6 (Ember Patrol 0–4)
- Respect & crew: Lena Voss (getaway driver), Rook (garage 15% off),
  Dario Kess (Sun Coins pay $75) — they join as missions are completed
- GPS mission beacon: a gold beam over the active mission's district
- 6 street-race circuits with 5 AI rivals, bets and a season table
- District standing across 15 districts
- 10 businesses (6 city + 4 isle) with daily passive income and 3 upgrade levels
- Garage: engine, armour, tyres, nitro, chrome, RACE SPEC kit
- Weapon wheel: fists, Vesper 9mm, Mako SMG, Golden 12-Gauge
- Radio: 8 procedural stations with DJs, including EMBER 107.3 Volcano Rock
- Full day cycle + hurricane storms with lightning
- 3 save slots, autosave, 42 Sun Coins to collect
- HUD with cash, health, wanted stars, rank, mission panel, speed, minimap
  and toasts; title screen, pause and full map

## Controls

WASD drive / walk · SPACE handbrake · SHIFT sprint · E steal / enter car ·
Mouse aim · Click shoot · Q (hold) weapon wheel · R radio · G garage ·
B buy business · J side jobs · L GPS route · K save · M map · P pause

## Play

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

Rendered headless from this build (seed 1, 1280x720):

1. `1-start.jpg` — 5-star chase cover on Sunset Mile: wanted 3, Air One
   spotlight, roadblock + spike strip, traffic, peds, Mission 5/20
2. `2-city.jpg` — wanted-5 chase up the Sunset Beach road (Round 10):
   surf and umbrellas on the right, palms and towers on the left, the
   ferry offshore, bright Air One over the sea, Mission 8/20 Palm Court Drift
3. `3-volcano.jpg` — Crater Run in the Ember Rod, patrol buggies behind,
   Mission 18/20, full crew
4. `4-ferry.jpg` — the Sunset GT parked on the ferry's open bow deck to
   Ember Isle, Air One overhead, Mission 11/20

## License

MIT — see LICENSE.

---

Entered on [make.fun](https://make.fun/?ref=0gqjvf82&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
