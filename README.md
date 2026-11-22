# Vesper City: Ember Isle

An open-world crime game built by an AI agent for the **make.fun GTA 6 bounty**
([gta6-01](https://make.fun/bounty/gta6-01)) — a sun-soaked coastal city at
golden hour, and a volcanic island across the water, reachable by ferry.

You are Mara Voss, a driver with a fast car and a faster temper, coming home
to Vesper City to take the crown back from the Tide Kings. Steal cars, outrun
the VCPD, run twenty story missions, win street races, buy businesses, and
rule two maps: the city and Ember Isle.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request, no library: plain HTML, ES modules and
raw WebGL, all under `game/`. Node 22+ for the server and the dossier build.

## Controls

- **W A S D** — drive / walk, **Space** — handbrake, **Shift** — sprint
- **E** — steal a nearby car / get in and out
- **Mouse** — aim, **Click** — shoot, **Q (hold)** — weapon wheel
- **R** — change radio station, **G** — garage upgrades, **B** — buy business
- **J** — side jobs, **L** — GPS route, **K** — save, **M** — map, **P** — pause

## The world

- **Vesper City** — 9x9 blocks of golden towers, eight districts (Sunset Mile,
  Harbor Docks, Old Vesper, Glass Quarter, Sunset Shore, Sunset Beach, Marina
  District, Old Town), a sunset beach with palms and a pier.
- **Ember Isle** — a volcanic island across the Sunset Sea: a lava volcano
  with a glowing crater, a black-sand beach, a fishing village, a lighthouse,
  a resort and a night market. The ferry runs from Sunset Pier every 90
  in-game seconds ($50, free for business owners).
- **20 story missions** — 12 in the city, 8 on the island, from the first
  stolen car to the Queen of Ember finale.
- **VCPD** — named units with their own tactics, a police helicopter, roadblocks
  and spike strips, wanted levels 0–6. **Ember Patrol** — four named island
  units, wanted 0–4.
- **6 street-race circuits** with five AI rivals, bets and a season table.
- **District standing** — earn respect in each of the 15 districts to unlock
  shops, cars and missions.
- **Businesses** — 6 in the city, 4 on the island, passive income every day,
  upgrades to level 3.
- **Garage** — engine, armour, tyres, nitro, chrome and a RACE SPEC kit.
- **Weapon wheel** — fists, Vesper 9mm, Mako SMG, Golden 12-Gauge.
- **Radio** — 8 procedural stations with DJs, including EMBER 107.3 Volcano Rock.
- **Weather** — a full day cycle and a hurricane front with lightning.
- **Save** — 3 save slots, autosave, and 42 Sun Coins to collect.

## Built by

An AI agent, in one recorded session, from a blank repository — every line of
game code written by hand for this bounty. The starter plumbing (the dossier
builder in `vendor/`) is the competition kit's own library.
