// Radio for Vesper City: Ember Isle.
// Seven procedural stations (plus EMBER on the island): each one has a
// tempo, a root note and a scale, played as synth plucks, and a DJ who
// talks between songs. The station's own melody walk is the same fixed
// walk every station uses, so each station always sounds like itself.
// The audio engine plays the notes; this file owns the stations, the
// DJs, the lines and the schedule — the script the island listens to.

import { RADIO_STATIONS } from './config.js';

export function stationById(id) {
  return RADIO_STATIONS.find((s) => s.id === id) || RADIO_STATIONS[0];
}

export function stationIndex(id) {
  const i = RADIO_STATIONS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

export function nextStation(id) {
  return RADIO_STATIONS[(stationIndex(id) + 1) % RADIO_STATIONS.length];
}

export function prevStation(id) {
  return RADIO_STATIONS[(stationIndex(id) - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length];
}

// The DJ lines, by station: morning, afternoon, night and storm.
export const DJ_LINES = {
  'sunset-fm': {
    morning: ['DJ Mara: "Good morning, Vesper. The sun is up and so are we."', 'DJ Mara: "Traffic report: the boulevard is gold and the cars are slow."'],
    afternoon: ['DJ Mara: "Afternoon drive on Sunset Mile. Windows down, volume up."', 'DJ Mara: "To the driver in the gold GT: your car is beautiful and your parking is a crime."'],
    night: ['DJ Mara: "Night shift on Sunset FM. The city is neon and so am I."', 'DJ Mara: "Last call for the beach. The tide is coming in."'],
    storm: ['DJ Mara: "Storm front on the city. The radio stays on. So do you."'],
  },
  'harbor-am': {
    morning: ['Old Tomas: "Morning, docks. The catch is in and the gulls are loud."', 'Old Tomas: "Fishing report: the nets are full, the sea is calm."'],
    afternoon: ['Old Tomas: "The ferry is on time. The ferry is always on time."', 'Old Tomas: "To the kid on the pier: the fish are not impressed."'],
    night: ['Old Tomas: "Night on the water. The lighthouse is sweeping and the boats are home."'],
    storm: ['Old Tomas: "Tie your boats down twice. The storm does not joke."'],
  },
  'neon-nights': {
    morning: ['DJ Lena: "Neon Nights does not do mornings. This is a recording."'],
    afternoon: ['DJ Lena: "The night starts at noon if you want it to."'],
    night: ['DJ Lena: "Neon Nights. The city after dark is ours."', 'DJ Lena: "To the couple on the roof: the view is free, the song is not."'],
    storm: ['DJ Lena: "Even the storm cannot turn the neon off."'],
  },
  'glass-classical': {
    morning: ['Maestro Rook: "Good morning. The towers are tuning up."'],
    afternoon: ['Maestro Rook: "Strings for the downtown crowd. All day long."'],
    night: ['Maestro Rook: "The Spire at night, in four movements."'],
    storm: ['Maestro Rook: "The storm is a percussion section. Listen."'],
  },
  'tide-reggae': {
    morning: ['DJ Kai: "Morning, beach. The riddim is warm already."'],
    afternoon: ['DJ Kai: "Beach riddim all afternoon. The sand is dancing."'],
    night: ['DJ Kai: "Night on the sand. The tide keeps the beat."'],
    storm: ['DJ Kai: "The storm is just the sea remixing itself."'],
  },
  'storm-rock': {
    morning: ['DJ Dario: "Hurricane Rock does not sleep. Neither do I."'],
    afternoon: ['DJ Dario: "Loud guitars for a loud city."'],
    night: ['DJ Dario: "Night shift. Turn it up until the windows shake."'],
    storm: ['DJ Dario: "THE STORM IS HERE. THE MUSIC IS LOUDER."'],
  },
  'vesper-jazz': {
    morning: ['DJ Sable: "Blue hour jazz for the early risers."'],
    afternoon: ['DJ Sable: "A slow afternoon, a slower saxophone."'],
    night: ['DJ Sable: "Blue Hour Jazz. The city exhales."'],
    storm: ['DJ Sable: "Rain on the roof, jazz on the radio. Perfect."'],
  },
};

// A DJ line for a station and a part of the day.
export function djLine(stationId, partOfDay, index) {
  const lines = (DJ_LINES[stationId] && DJ_LINES[stationId][partOfDay]) || DJ_LINES['sunset-fm'].afternoon;
  return lines[(index || 0) % lines.length];
}

// Which part of the day it is, from the weather clock.
export function radioPartOfDay(dayT, storm) {
  if (storm > 0.6) return 'storm';
  if (dayT < 0.3) return 'morning';
  if (dayT < 0.7) return 'afternoon';
  return 'night';
}

// The station's own melody walk: up two, down one, up three, repeat.
export const MELODY_WALK = [0, 2, 1, 3, 2, 4, 3, 5, 4, 2, 1, 0];

// The next note of a station, from a step index: the frequency the
// audio engine plays as a synth pluck, and the beat length it lasts.
export function stationNextNote(station, stepIndex) {
  const degree = MELODY_WALK[stepIndex % MELODY_WALK.length];
  const semitones = station.scale[degree % station.scale.length]
    + 12 * Math.floor(degree / station.scale.length);
  const freq = station.root * Math.pow(2, semitones / 12);
  return { freq, dur: (60 / station.tempo) * 0.9, station: station.id };
}

// The station's label for the HUD: name, show and DJ.
export function stationLabel(station) {
  return `${station.name} · ${station.show} · ${station.dj}`;
}

// The top songs per station, for the hourly countdown.
export function stationTopSongs(station) {
  return [
    { rank: 1, title: `${station.show} Theme`, artist: station.dj },
    { rank: 2, title: 'Golden Hour Drive', artist: 'The Sunset Tones' },
    { rank: 3, title: 'Boulevard Lights', artist: 'Vesper Choir' },
    { rank: 4, title: 'Tide and Chrome', artist: 'The Dockside Band' },
    { rank: 5, title: 'King of the Sunset', artist: 'Mara Voss' },
  ];
}

export function radioSummary(stationId) {
  const s = stationById(stationId);
  return {
    id: s.id, name: s.name, show: s.show, dj: s.dj, tempo: s.tempo,
    stations: RADIO_STATIONS.length,
  };
}
