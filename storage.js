// storage.js — voortgang bewaren op dit apparaat (localStorage).
//
// Elk kind heeft een eigen profiel: een dier, en als je wilt een voornaam.
// Per profiel: sterren per les en puzzel, het niveau van de computer, van
// welke niveaus het kind al eens won, welke mini-partijen gespeeld zijn en
// het gekozen bord. Badges worden NIET bewaard: die rekent badges.js steeds
// uit deze voortgang uit (dan kunnen ze ook nooit kwijtraken).
//
// Alles staat in één sleutel, `dammie.v2`:
//   { version: 2, current: 'p1', profiles: [profiel, ...] }
//   profiel   = { id, animal, name, board, settings, progress }
//   settings  = { speech: true/false, sound: true/false, voice: '' }
//               (spraak, geluid en de gekozen stem: '' = vanzelf de beste)
//   progress  = { lessons: { lesId: { stars } }, puzzles: { puzzelId: { stars } },
//                 minigames: { id: { played } }, computer: { level, wins, losses },
//                 beaten: { niveau: true } }
//
// De oude sleutel `dammie.v1` (van vóór de profielen) wordt vanzelf het eerste
// profiel. Hij blijft staan als reservekopie; de app schrijft er niet meer in.
//
// Opslag kan ontbreken (privévenster, iOS ruimt op): dan werkt de app gewoon,
// alleen onthoudt hij niets nadat hij gesloten is.

import { clampLevel } from './ai.js';

const KEY = 'dammie.v2';
const OLD_KEY = 'dammie.v1';
export const MAX_PROFILES = 6;
export const NAME_MAX = 12;

// De dieren waaruit een kind kiest. Id's nooit veranderen (staan in de opslag).
export const ANIMALS = [
  { id: 'vos', icon: '🦊', name: 'Vos' },
  { id: 'beer', icon: '🐻', name: 'Beer' },
  { id: 'kikker', icon: '🐸', name: 'Kikker' },
  { id: 'panda', icon: '🐼', name: 'Panda' },
  { id: 'leeuw', icon: '🦁', name: 'Leeuw' },
  { id: 'konijn', icon: '🐰', name: 'Konijn' },
  { id: 'tijger', icon: '🐯', name: 'Tijger' },
  { id: 'koala', icon: '🐨', name: 'Koala' },
  { id: 'pinguin', icon: '🐧', name: 'Pinguïn' },
  { id: 'uil', icon: '🦉', name: 'Uil' },
  { id: 'schildpad', icon: '🐢', name: 'Schildpad' },
  { id: 'eenhoorn', icon: '🦄', name: 'Eenhoorn' },
];

export const animalById = (id) => ANIMALS.find((a) => a.id === id) || null;

// ---------------------------------------------------------------------------
// Lezen en schrijven
// ---------------------------------------------------------------------------

let backend = null; // null = de localStorage van de browser
let memory = null; // laatste stand, voor als opslaan niet lukt
let broken = false; // schrijven mislukte: werk verder vanuit het geheugen

// Voor de tests: een nep-opslag ({ getItem, setItem }). null = de echte.
export function useStorage(store) {
  backend = store;
  memory = null;
  broken = false;
}

const store = () => backend || globalThis.localStorage;
const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));

const emptyState = () => ({ version: 2, current: null, profiles: [] });
export const emptyProgress = () => ({ lessons: {}, puzzles: {}, minigames: {}, beaten: {} });

function read() {
  if (broken && memory) return clone(memory);
  try {
    const raw = store().getItem(KEY);
    const state = raw ? normalizeState(JSON.parse(raw)) : null;
    if (state) return clone((memory = state));
    const old = store().getItem(OLD_KEY);
    const migrated = old ? fromV1(JSON.parse(old)) : null;
    if (migrated) return clone((memory = migrated));
  } catch {
    // geen opslag beschikbaar of kapotte data: verder met wat we nog weten
  }
  return clone(memory || (memory = emptyState()));
}

function write(state) {
  memory = clone(state);
  try {
    store().setItem(KEY, JSON.stringify(state));
    broken = false;
  } catch {
    broken = true; // niet erg: de app werkt verder, alleen zonder geheugen
  }
}

// De voortgang van vóór de profielen wordt profiel 1 (nog zonder dier: dat
// kiest het kind de volgende keer zelf, de sterren blijven gewoon staan).
function fromV1(data) {
  if (!isObject(data) || !isObject(data.lessons)) return null;
  return normalizeState({ current: 'p1', profiles: [{ id: 'p1', animal: null, name: '', progress: data }] });
}

// ---------------------------------------------------------------------------
// Opschonen: alles wat binnenkomt (uit de opslag of een bestand) wordt
// gecontroleerd. Rare waarden vallen weg, de rest blijft heel.
// ---------------------------------------------------------------------------

function cleanStars(list) {
  const out = {};
  for (const [id, v] of Object.entries(isObject(list) ? list : {})) {
    const s = Math.round(Number(v?.stars));
    if (s >= 1) out[id] = { stars: Math.min(3, s) };
  }
  return out;
}

function cleanFlags(list, key) {
  const out = {};
  for (const [id, v] of Object.entries(isObject(list) ? list : {})) if (v?.[key] === true) out[id] = { [key]: true };
  return out;
}

export function normalizeProgress(p) {
  const src = isObject(p) ? p : {};
  const out = {
    ...emptyProgress(),
    lessons: cleanStars(src.lessons),
    puzzles: cleanStars(src.puzzles),
    minigames: cleanFlags(src.minigames, 'played'),
  };
  if (isObject(src.computer)) {
    const count = (n) => Math.max(0, Math.floor(Number(n) || 0));
    out.computer = { level: clampLevel(src.computer.level), wins: count(src.computer.wins), losses: count(src.computer.losses) };
  }
  for (const [level, v] of Object.entries(isObject(src.beaten) ? src.beaten : {})) {
    if (v === true && String(clampLevel(level)) === level) out.beaten[level] = true;
  }
  return out;
}

function normalizeProfile(p) {
  if (!isObject(p) || typeof p.id !== 'string' || !p.id) return null;
  return {
    id: p.id.slice(0, 20),
    animal: animalById(p.animal) ? p.animal : null,
    name: typeof p.name === 'string' ? p.name.trim().slice(0, NAME_MAX) : '',
    board: typeof p.board === 'string' && p.board ? p.board : 'hout',
    settings: normalizeSettings(p.settings),
    progress: normalizeProgress(p.progress),
  };
}

// Spraak en geluid: standaard aan. Alleen een echte `false` zet iets uit.
// `voice` = de stem die een ouder koos (voiceURI); '' = vanzelf de beste.
// Staat die stem niet op dit apparaat, dan kiest speech.js zelf.
export const DEFAULT_SETTINGS = Object.freeze({ speech: true, sound: true, voice: '' });

function normalizeSettings(v) {
  const src = isObject(v) ? v : {};
  const voice = typeof src.voice === 'string' && src.voice.length <= 200 ? src.voice : '';
  return { speech: src.speech !== false, sound: src.sound !== false, voice };
}

function normalizeState(s) {
  if (!isObject(s) || !Array.isArray(s.profiles)) return null;
  const profiles = [];
  for (const raw of s.profiles) {
    const p = normalizeProfile(raw);
    if (!p || profiles.length >= MAX_PROFILES || profiles.some((q) => q.id === p.id)) continue;
    // Twee keer hetzelfde dier zou verwarrend zijn: de tweede kiest opnieuw.
    if (p.animal && profiles.some((q) => q.animal === p.animal)) p.animal = null;
    profiles.push(p);
  }
  const current = profiles.some((p) => p.id === s.current) ? s.current : profiles[0]?.id || null;
  return { version: 2, current, profiles };
}

// ---------------------------------------------------------------------------
// Profielen
// ---------------------------------------------------------------------------

export function listProfiles() {
  return read().profiles;
}

export function currentProfile() {
  const s = read();
  return s.profiles.find((p) => p.id === s.current) || null;
}

// "🦊 Noor", of "🦊 Vos" als er geen naam is.
export function profileLabel(p) {
  const a = animalById(p?.animal);
  if (!a) return p?.name ? p.name : 'Nog geen dier';
  return `${a.icon} ${p.name || a.name}`;
}

// Hoe Dammie het kind aanspreekt: de naam, anders het dier.
export const profileName = (p) => p?.name || animalById(p?.animal)?.name || '';

// Dieren die nog vrij zijn (het dier van `exceptId` telt als vrij).
export function freeAnimals(exceptId = null) {
  const taken = new Set(listProfiles().filter((p) => p.id !== exceptId).map((p) => p.animal));
  return ANIMALS.filter((a) => !taken.has(a.id));
}

// Nieuw profiel, wordt meteen het huidige. Geeft null als het niet kan
// (al 6 profielen, of dit dier is al van een ander kind).
export function addProfile({ animal, name = '' }) {
  const s = read();
  if (s.profiles.length >= MAX_PROFILES || !animalById(animal) || s.profiles.some((p) => p.animal === animal)) return null;
  let n = s.profiles.length + 1;
  while (s.profiles.some((p) => p.id === `p${n}`)) n++;
  const profile = normalizeProfile({ id: `p${n}`, animal, name });
  s.profiles.push(profile);
  s.current = profile.id;
  write(s);
  return profile;
}

// Dier, naam of bord veranderen. Een dier van een ander kind kan niet.
export function updateProfile(id, changes) {
  const s = read();
  const p = s.profiles.find((q) => q.id === id);
  if (!p) return null;
  if ('animal' in changes) {
    if (!animalById(changes.animal) || s.profiles.some((q) => q.id !== id && q.animal === changes.animal)) return null;
    p.animal = changes.animal;
  }
  if ('name' in changes) p.name = String(changes.name || '').trim().slice(0, NAME_MAX);
  if ('board' in changes && typeof changes.board === 'string') p.board = changes.board;
  if ('settings' in changes) p.settings = normalizeSettings({ ...p.settings, ...changes.settings });
  write(s);
  return p;
}

// Spraak en geluid van het kind dat nu speelt (geen kind: alles aan).
export function loadSettings() {
  return currentProfile()?.settings || { ...DEFAULT_SETTINGS };
}

export function switchProfile(id) {
  const s = read();
  if (!s.profiles.some((p) => p.id === id)) return false;
  s.current = id;
  write(s);
  return true;
}

export function removeProfile(id) {
  const s = read();
  s.profiles = s.profiles.filter((p) => p.id !== id);
  if (s.current === id) s.current = s.profiles[0]?.id || null;
  write(s);
}

// ---------------------------------------------------------------------------
// Voortgang van het huidige profiel
// ---------------------------------------------------------------------------

export function loadProgress() {
  return currentProfile()?.progress || emptyProgress();
}

// Past de voortgang van het huidige profiel aan. Is er (nog) geen profiel,
// dan komt er een zonder dier; dat kiest het kind later.
function updateProgress(fn) {
  const s = read();
  let p = s.profiles.find((q) => q.id === s.current);
  if (!p) {
    p = normalizeProfile({ id: 'p1', animal: null });
    s.profiles = [p];
    s.current = p.id;
  }
  p.progress = normalizeProgress(fn(p.progress));
  write(s);
  return clone(p.progress);
}

// Bewaart de sterren van een les; de beste score blijft staan.
export function saveLessonStars(lessonId, stars) {
  return updateProgress((data) => withBestStars(data, 'lessons', lessonId, stars));
}

export function savePuzzleStars(puzzleId, stars) {
  return updateProgress((data) => withBestStars(data, 'puzzles', puzzleId, stars));
}

// Nieuwe voortgang met de beste score voor dit onderdeel (de oude blijft heel).
export function withBestStars(data, kind, id, stars) {
  const list = { ...(data[kind] || {}) };
  list[id] = { stars: Math.max(list[id]?.stars || 0, stars) };
  return { lessons: {}, puzzles: {}, ...data, [kind]: list };
}

// Computer: { level, wins, losses } (wins/losses = hoeveel keer achter elkaar).
// Nieuw kind: begint bij niveau 1 (Slaapkop).
export const DEFAULT_COMPUTER = Object.freeze({ level: 1, wins: 0, losses: 0 });

export function loadComputer() {
  return { ...DEFAULT_COMPUTER, ...(loadProgress().computer || {}) };
}

export function saveComputer(state) {
  const { level, wins, losses } = { ...DEFAULT_COMPUTER, ...state };
  updateProgress((data) => ({ ...data, computer: { level, wins, losses } }));
}

// Het kind won een gewone partij van dit niveau (voor de badges).
export function saveComputerWin(level) {
  return updateProgress((data) => ({ ...data, beaten: { ...data.beaten, [clampLevel(level)]: true } }));
}

// Mini-partij gespeeld (uitslag maakt niet uit: meedoen is genoeg).
export function saveMiniGamePlayed(id) {
  return updateProgress((data) => ({ ...data, minigames: { ...data.minigames, [id]: { played: true } } }));
}

// ---------------------------------------------------------------------------
// Reservekopie: een bestandje met alle profielen (voor ouders)
// ---------------------------------------------------------------------------

export function exportBackup(now = new Date()) {
  const s = read();
  return JSON.stringify({ app: 'dammie', version: 2, saved: now.toISOString(), current: s.current, profiles: s.profiles }, null, 2);
}

// "damvoortgang-2026-10-23.json" (datum van vandaag).
export function backupFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `damvoortgang-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// Leest een reservekopie, zonder iets te veranderen.
//   { ok: true, state }  of  { ok: false, reason: 'geen-bestand' | 'ander-bestand' | 'leeg' }
export function readBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'geen-bestand' };
  }
  if (!isObject(data) || data.app !== 'dammie') return { ok: false, reason: 'ander-bestand' };
  const state = normalizeState(data);
  if (!state || state.profiles.length === 0) return { ok: false, reason: 'leeg' };
  return { ok: true, state };
}

// Vervangt ALLE voortgang op dit apparaat door die uit het bestand.
// Lukt het lezen niet, dan blijft alles zoals het was.
export function importBackup(text) {
  const result = readBackup(text);
  if (result.ok) write(result.state);
  return result;
}

// Vraagt de browser om de gegevens niet zomaar op te ruimen.
// true = beschermd, false = niet, null = deze browser kent het niet.
export async function askPersist() {
  try {
    const s = globalThis.navigator?.storage;
    if (!s?.persist) return null;
    if (await s.persisted()) return true;
    return await s.persist();
  } catch {
    return null;
  }
}
