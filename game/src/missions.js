// The city story — twelve missions for Vesper City.
// Mara Voss comes home to take the crown back from the Tide Kings.
// Every mission carries a giver, a reward, a respect payout, an intro,
// a brief, an outro, and a chain of steps. Every step sits on a road
// intersection, a coast point, a business spot or a district landmark,
// so the collision can never trap a target — nothing is ever placed
// inside a building or out in the sea.

import { roadCross } from './city.js';

function pt(x, z, text, kind) {
  return { x, z, text, kind: kind || 'goto' };
}

function cross(ix, iz, text, kind) {
  const p = roadCross(ix, iz);
  return pt(p.x, p.z, text, kind);
}

// The gate for the city finale (mission 12): a level-2 business and
// 2,000 respect. Returns {ok, missing} — missing names what Mara still
// needs, so the game can tell her instead of silently refusing.
export function cityFinaleGateMet(business, respectPoints) {
  const maxLevel = business ? maxBusinessLevelOf(business) : 0;
  const missing = [];
  if (maxLevel < 2) missing.push('a level-2 business (press B near a FOR SALE board)');
  if (respectPoints < 2000) missing.push(`2,000 respect (you have ${respectPoints})`);
  return { ok: missing.length === 0, missing };
}

function maxBusinessLevelOf(business) {
  let best = 0;
  const owned = (business && business.owned) || {};
  for (const id of Object.keys(owned)) {
    const lvl = owned[id] && owned[id].level;
    if (Number.isInteger(lvl)) best = Math.max(best, lvl);
  }
  return best;
}

export function buildCityMissions(city, coast) {
  const pier = coast ? coast.pierEnd : { x: -20, z: 305 };
  const dock = coast ? coast.boatDock : { x: 110, z: 280 };
  const boardwalk = coast ? coast.boardwalk : { x: 60, z: 245 };
  const marina = (city.landmarks || []).find((l) => l.id === 'marina') || { x: 180, z: 200 };
  const oldtown = (city.landmarks || []).find((l) => l.id === 'oldtown') || { x: 0, z: -200 };
  const garage = (city.landmarks || []).find((l) => l.id === 'garage') || { x: 160, z: 160 };
  return [
    {
      id: 1, title: 'Homecoming', giver: 'Rook', reward: 800, respect: 100, district: 'Sunset Beach',
      intro: 'Rook: "Mara Voss. The city forgot you. The garage did not. Come home."',
      brief: 'Mara is back in Vesper City after three years away. Drive to the Sunset Garage and see Rook — the city has changed, and the Tide Kings run it now.',
      outro: 'Rook opens the garage door: "Same Mara. Same temper. Good. We have work."',
      steps: [
        pt(-20, 300, 'Step out onto Sunset Beach — the city is waiting', 'goto'),
        pt(garage.x, garage.z, 'Reach the Sunset Garage', 'goto'),
        cross(5, 5, 'Meet Rook at the garage yard', 'pickup'),
      ],
    },
    {
      id: 2, title: 'First Wheels', giver: 'Rook', reward: 1200, respect: 120, district: 'Harbor Docks',
      intro: 'Rook: "You cannot take a city on foot. Steal a car. Any car. Bring it here."',
      brief: 'Mara needs wheels. Steal any car on the road (press E near one), then bring it back to the garage — the first car is always the hardest to take.',
      outro: 'Rook kicks the tyre: "It runs. It is ugly. It is yours. For now."',
      steps: [
        cross(6, 6, 'Find a car on the road — press E to steal it', 'pickup'),
        pt(garage.x, garage.z, 'Bring the car back to the Sunset Garage', 'deliver'),
      ],
    },
    {
      id: 3, title: 'The Tide Kings', giver: 'Lena Voss', reward: 1800, respect: 150, district: 'Marina District',
      intro: 'Lena: "The Tide Kings tax every boat in the Marina. Meet me there. We take it back."',
      brief: 'Lena is waiting at the Marina with a plan: pick up the package at the docks, carry it through the Glass Quarter, and deliver it to the Sunset Pier — without the Tide Kings noticing.',
      outro: 'Lena counts the cash: "The Marina remembers who pays. Tonight, it pays us."',
      steps: [
        pt(marina.x, marina.z, 'Meet Lena at the Marina', 'pickup'),
        cross(8, 8, 'Pick up the package at the Harbor Docks', 'pickup'),
        cross(5, 5, 'Carry it through the Glass Quarter', 'goto'),
        pt(pier.x, pier.z, 'Deliver the package at the Sunset Pier', 'deliver'),
      ],
    },
    {
      id: 4, title: 'Neon Mile', giver: 'Kai Sol', reward: 2000, respect: 160, district: 'Sunset Mile',
      intro: 'Kai: "The Mile is the fastest street in the city. Prove it. Three checkpoints, one clock."',
      brief: 'A sprint down Sunset Mile: three checkpoints, one clock, no excuses. The neon watches every driver — and it remembers the fast ones.',
      outro: 'Kai laughs: "The Mile likes you, Mara. It does not like many people."',
      steps: [
        cross(1, 1, 'Reach the first checkpoint on Sunset Mile', 'goto'),
        cross(2, 4, 'Second checkpoint — keep the speed', 'goto'),
        cross(1, 7, 'Final checkpoint at the end of the Mile', 'goto'),
        pt(boardwalk.x, boardwalk.z, 'Cool down at the boardwalk', 'deliver'),
      ],
    },
    {
      id: 5, title: 'Dockside Debt', giver: 'Dario Kess', reward: 2200, respect: 170, district: 'Harbor Docks',
      intro: 'Dario: "The docks owe me. Go and collect. Politely, if you can. Firmly, if you cannot."',
      brief: 'Three debts at the Harbor Docks: collect from the warehouse, the fish market and the boat dock, then bring the money to Dario at the Marina.',
      outro: 'Dario weighs the bag: "Every dollar. The docks learn fast when you teach them."',
      steps: [
        cross(2, 9, 'Collect the warehouse debt', 'pickup'),
        cross(9, 9, 'Collect the fish market debt', 'pickup'),
        pt(dock.x, dock.z, 'Collect the boat dock debt', 'pickup'),
        pt(marina.x, marina.z, 'Bring the money to Dario at the Marina', 'deliver'),
      ],
    },
    {
      id: 6, title: 'Old Town Ghost', giver: 'Lena Voss', reward: 2500, respect: 200, district: 'Old Town',
      intro: 'Lena: "The VCPD tail is on me. Take the wheel, lose them in the north lanes, and do not get caught."',
      brief: 'A VCPD tail is on Lena in Old Town. Take the wheel, lose the tail through the north lanes, and meet her at the church when the street is quiet.',
      outro: 'Lena slips out of the car: "Old Town keeps its own, Mara — and now it keeps yours too."',
      steps: [
        cross(3, 1, 'Meet Lena at the edge of Old Town', 'pickup'),
        cross(5, 1, 'Lose the tail in the north lanes', 'escape'),
        cross(7, 2, 'Cut through the Glass Quarter', 'escape'),
        pt(oldtown.x, oldtown.z, 'Meet Lena at the church when it is quiet', 'deliver'),
      ],
    },
    {
      id: 7, title: 'The Spire Job', giver: 'Dario Kess', reward: 3000, respect: 220, district: 'Glass Quarter',
      intro: 'Dario: "The Tide Kings keep their ledger in the Storm Spire. Get it. Do not get seen."',
      brief: 'The Tide Kings keep their ledger in the Storm Spire, the tallest tower downtown. Reach the Spire, take the ledger, and get out through the Glass Quarter before the guards wake up.',
      outro: 'Dario opens the ledger: "Names. Numbers. The whole city, in one book. Good work."',
      steps: [
        cross(4, 5, 'Reach the Storm Spire — the whole city is watching', 'goto'),
        pt(0, 0, 'Take the ledger from the Spire', 'pickup'),
        cross(6, 4, 'Slip out through the Glass Quarter', 'escape'),
        pt(marina.x, marina.z, 'Bring the ledger to Dario at the Marina', 'deliver'),
      ],
    },
    {
      id: 8, title: 'Beach Party', giver: 'Kai Sol', reward: 2400, respect: 180, district: 'Sunset Beach',
      intro: 'Kai: "The beach party needs supplies and the sun is going down. You are the fastest driver I know."',
      brief: 'The Sunset Beach party needs supplies before dark: pick up the speakers at the boardwalk, the food at the Marina, and the lights at the pier — then get to the party.',
      outro: 'The music starts as the sun goes down. Kai raises a glass: "To the fastest delivery in Vesper."',
      steps: [
        pt(boardwalk.x, boardwalk.z, 'Pick up the speakers at the boardwalk', 'pickup'),
        pt(marina.x, marina.z, 'Pick up the food at the Marina', 'pickup'),
        pt(pier.x, pier.z, 'Pick up the lights at the pier', 'pickup'),
        pt(0, 290, 'Deliver everything to the beach party', 'deliver'),
      ],
    },
    {
      id: 9, title: 'Storm Warning', giver: 'Dario Kess', reward: 2600, respect: 230, district: 'Marina District',
      intro: 'Dario: "The front is here, Mara. The surge comes with the tide — warn the lighthouse, tie the boats down, and get the word to the docks."',
      brief: 'The hurricane front is on the Marina. Before the surge, warn the lighthouse keeper, tie the boats down at the dock, and carry the warning to the Harbor Docks — the city cannot lose its harbour before the storm even lands.',
      outro: 'The Marina is warned and the boats are tied down. Dario nods: "The harbour holds — because you ran, Mara."',
      steps: [
        pt(marina.x, marina.z, 'Reach the Marina — the storm surge is coming', 'goto'),
        pt(238, 288, 'Warn the lighthouse keeper before the beam dies', 'pickup'),
        pt(dock.x, dock.z, 'Tie the boats down at the Boat Dock', 'deliver'),
        cross(8, 9, 'Carry the warning to the Harbor Docks', 'deliver'),
      ],
    },
    {
      id: 10, title: 'Night Market', giver: 'Lena Voss', reward: 2800, respect: 260, district: 'Old Town',
      intro: 'Lena: "The market takings are in Old Town and the VCPD tail is on me. Collect the money, hide it at the church, and lose them in the north lanes."',
      brief: 'Lena is carrying the night market takings through Old Town with a VCPD tail behind her. Meet her at the edge of the district, collect the money from the stalls, hide it at the church safe house, and lose the tail in the north lanes.',
      outro: 'The takings are safe behind the church door and the tail is gone. Lena laughs: "Old Town keeps its own, Mara — and now it keeps yours too."',
      steps: [
        cross(2, 1, 'Meet Lena at the edge of Old Town', 'pickup'),
        pt(-75, -198, 'Collect the night market takings from the stalls', 'pickup'),
        pt(0, -232, 'Hide the takings at the church safe house', 'deliver'),
        cross(5, 1, 'Lose the VCPD tail in the north lanes', 'escape'),
      ],
    },
    {
      id: 11, title: 'King of the Sunset', giver: 'Rook', reward: 4000, respect: 350, district: 'Sunset Beach',
      intro: 'Rook: "The Tide Kings are coming for the pier at sunset. Hold it. Hold the whole beach."',
      brief: 'The Tide Kings are coming for the Sunset Pier at sunset. Hold the pier, hold the boardwalk, and finish them on the beach — the crown of the Sunset is won here, not given.',
      outro: 'The sun goes down over a beach that is still yours. Rook grins: "King of the Sunset, Mara."',
      steps: [
        pt(pier.x, pier.z, 'Hold the Sunset Pier', 'eliminate'),
        pt(boardwalk.x, boardwalk.z, 'Hold the boardwalk', 'eliminate'),
        pt(0, 290, 'Finish them on the beach at sunset', 'eliminate'),
        pt(garage.x, garage.z, 'Bring the crown home to the Sunset Garage', 'deliver'),
      ],
    },
    {
      id: 12, title: 'King of Vesper', giver: 'Dario Kess', reward: 5000, respect: 400, district: 'Vesper City',
      intro: 'Dario: "The Tide Kings are back in the storm, Mara. Hold the Spire, hold the Marina, finish it on the pier — and the whole city is yours."',
      brief: 'The finale. The Tide Kings came back with the storm to take the city while it is drowning. Hold the Storm Spire, hold the Marina, finish them on the pier at sunset, and bring the crown home to the Sunset Garage.',
      outro: 'The storm breaks over a city that is still yours. Dario raises a glass: "Twelve jobs, one hurricane — and the crown stays in Vesper. King of Vesper, Mara."',
      steps: [
        cross(4, 5, 'Reach the Storm Spire — the whole city is watching', 'goto'),
        pt(marina.x, marina.z, 'Hold the Marina against the Tide Kings', 'eliminate'),
        pt(pier.x, pier.z, 'Finish it on the pier at sunset', 'eliminate'),
        cross(8, 8, 'Bring the crown home to the Sunset Garage', 'deliver'),
      ],
    },
  ];
}

export const CITY_MISSION_COUNT = 12;

// The mission by id, from the city list.
export function cityMissionById(id, city, coast) {
  return buildCityMissions(city, coast).find((m) => m.id === id) || null;
}

// The brief by id — the paragraph the title screen and the mission
// panel show before Mara starts.
export function cityMissionBrief(id, city, coast) {
  const m = cityMissionById(id, city, coast);
  return m ? m.brief : '';
}

// The outro by id — the line the game shows when the mission completes.
export function cityMissionOutro(id, city, coast) {
  const m = cityMissionById(id, city, coast);
  return m ? m.outro : '';
}
