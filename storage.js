// storage.js — voortgang bewaren op dit apparaat (localStorage).
//
// Sterren per les en per puzzel. Profielen en een back-upknop komen in fase 6.
// Opslag kan ontbreken (privévenster, iOS ruimt op): dan werkt de app gewoon,
// alleen zonder geheugen.

const KEY = 'dammie.v1';

function read() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && typeof data === 'object' && data.lessons) return { puzzles: {}, ...data };
  } catch {
    // geen opslag beschikbaar of kapotte data: begin leeg
  }
  return { lessons: {}, puzzles: {} };
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // opslaan lukt niet: niet erg, de app werkt verder
  }
}

export function loadProgress() {
  return read();
}

// Bewaart de sterren van een les; de beste score blijft staan.
export function saveLessonStars(lessonId, stars) {
  const data = withBestStars(read(), 'lessons', lessonId, stars);
  write(data);
  return data;
}

export function savePuzzleStars(puzzleId, stars) {
  const data = withBestStars(read(), 'puzzles', puzzleId, stars);
  write(data);
  return data;
}

// Nieuwe voortgang met de beste score voor dit onderdeel (de oude blijft heel).
export function withBestStars(data, kind, id, stars) {
  const list = { ...(data[kind] || {}) };
  list[id] = { stars: Math.max(list[id]?.stars || 0, stars) };
  return { lessons: {}, puzzles: {}, ...data, [kind]: list };
}
