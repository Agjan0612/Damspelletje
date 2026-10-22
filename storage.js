// storage.js — voortgang bewaren op dit apparaat (localStorage).
//
// Nu alleen de sterren per les. Profielen en een back-upknop komen in fase 6.
// Opslag kan ontbreken (privévenster, iOS ruimt op): dan werkt de app gewoon,
// alleen zonder geheugen.

const KEY = 'dammie.v1';

function read() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && typeof data === 'object' && data.lessons) return data;
  } catch {
    // geen opslag beschikbaar of kapotte data: begin leeg
  }
  return { lessons: {} };
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
  const data = read();
  const prev = data.lessons[lessonId]?.stars || 0;
  data.lessons[lessonId] = { stars: Math.max(prev, stars) };
  write(data);
  return data;
}
