// speech.js — Dammie praat (speechSynthesis) en zachte geluidjes (Web Audio).
//
// Spraak:
// - Alles wat in Dammie's tekstballon of in een kaartje komt, zegt hij ook
//   hardop (shared.js en lessons-ui.js roepen speak() aan).
// - Alleen een Nederlandse stem van het apparaat zelf. Liefst een
//   vrouwenstem (Claire, dan Ellen), daarna nl-NL, nl-BE, een andere nl-stem.
//   Robotstemmen (Eddy, Oma, Rocko, ... op de iPad) alleen als er niets
//   anders is. Een ouder kan per kind zelf een stem kiezen (settings.voice).
//   Stemmen "uit de cloud" (bijv. Google in Chrome) doen niet mee: daarbij
//   gaat de tekst naar internet, en dat willen we niet.
//   Geen Nederlandse stem: dan blijft alleen de tekst, zoals altijd.
// - Emoji en tekens (★, ↶, ▶, ...) eerst weg, anders leest de stem ze voor.
// - Iets nieuws onderbreekt de vorige zin. Dezelfde zin vlak na elkaar
//   klinkt maar één keer (een kind dat vaak tikt, hoort niet tien keer
//   hetzelfde). Tikken op Dammie herhaalt altijd.
// - iPad/iPhone: spraak en geluid mogen pas na een tik. De eerste tik op de
//   pagina maakt ze "wakker" (unlockAudio).
//
// Geluid: korte, zachte toontjes die de code zelf maakt (geen bestanden).
// Bij "Bijna!" klinkt niets. Wat je hoort, zie je ook altijd op het scherm.
//
// Spraak en geluid staan per kind aan of uit (storage.js, settings; de
// schakelaars zitten in de hoek voor ouders).

import { loadSettings } from './storage.js';

export const SPEECH_RATE = 0.9; // iets rustiger dan normaal
export const SPEECH_PITCH = 1.1; // een tikje hoger: klinkt vriendelijker
export const REPEAT_MS = 4000; // dezelfde zin binnen 4 s: niet nog eens

// ---------------------------------------------------------------------------
// Zinnen opschonen (los te testen)
// ---------------------------------------------------------------------------

// Tekens die niet voorgelezen moeten worden: emoji en symbolen.
const PICTURES = /[\p{Extended_Pictographic}\p{So}←-⇿⌀-⏿■-◿☀-➿️‍⃣]/gu;

export function cleanForSpeech(text) {
  return String(text ?? '')
    .replace(/(\d)\s*×\s*(\d)/g, '$1 bij $2') // "6 × 6" = "6 bij 6"
    .replace(/(\d)\s*\+\s*(\d)/g, '$1 plus $2')
    .replace(/…/g, '.')
    .replace(PICTURES, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s+([.,!?:;])/g, '$1') // geen spatie voor een leesteken
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?:;-]+/, '') // geen los leesteken aan het begin
    .trim();
}

// Mag deze zin nu klinken? Niet als hij net al gezegd is (binnen REPEAT_MS).
// `recent` = [{ text, at }]: de zinnen van de laatste paar seconden. Zo hoort
// een kind dat een schijf aan- en uitklikt niet steeds hetzelfde om en om.
export function isRepeat(clean, recent, now) {
  return (recent || []).some((r) => r.text === clean && now - r.at < REPEAT_MS);
}

// ---------------------------------------------------------------------------
// Stem kiezen (los te testen: `voices` is een lijst zoals getVoices() geeft)
// ---------------------------------------------------------------------------

const langOf = (v) => String(v.lang || '').replace('_', '-').toLowerCase();
const QUALITY = /premium|enhanced|verbeterd|natural/i;
// Vrouwenstemmen die we kennen (Apple: Claire, Ellen; Windows/Edge: Fenna,
// Colette, Dena). De kinderen wilden een lieve vrouwenstem.
const FEMALE = /\b(claire|ellen|fenna|colette|dena|lotte)\b/i;
// Robot- en grapstemmen. Apple zet sinds iOS 17 bij elke taal ook stemmen als
// Eddy, Oma, Opa, Rocko en Shelley ("Eloquence"). Die klinken als een robot.
const ROBOT_URI = /eloquence|novelty/i;
const ROBOT_NAME =
  /^(eddy|flo|grandma|grandpa|oma|opa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|kathy|fred)\b/i;

// Een stem herkennen we aan zijn voiceURI (of naam): die blijft hetzelfde.
export const voiceId = (v) => String(v?.voiceURI || v?.name || '');
export const isRobotVoice = (v) => ROBOT_URI.test(v.voiceURI || '') || ROBOT_NAME.test(String(v.name || '').trim());

// Hoe goed past een stem bij Dammie? -1 = niet Nederlands of uit de cloud.
//   taal: nl-NL 30, nl-BE 20, andere nl 10   vrouw +15   verbeterd +4
//   robotstem: alleen als er niets anders is
function rankVoice(v) {
  if (!v || v.localService === false) return -1;
  const lang = langOf(v);
  let score = lang === 'nl-nl' ? 30 : lang === 'nl-be' ? 20 : lang.startsWith('nl') ? 10 : -1;
  if (score < 0) return -1;
  if (isRobotVoice(v)) return 1;
  if (FEMALE.test(v.name || '')) score += 15;
  if (QUALITY.test(v.name || '')) score += 4;
  if (v.default) score += 1;
  return score;
}

// Alle Nederlandse stemmen van het apparaat zelf, de beste eerst (voor de
// keuzelijst in de hoek voor ouders).
export function dutchVoices(voices) {
  return (voices || [])
    .filter((v) => rankVoice(v) >= 0)
    .map((v, i) => ({ v, i, r: rankVoice(v) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map((x) => x.v);
}

// De stem voor Dammie, of null. Heeft een ouder zelf een stem gekozen
// (`preferred` = voiceId) en staat die op dit apparaat, dan die. Anders de
// beste: een Nederlandse vrouwenstem, nooit een robotstem als het anders kan.
export function chooseVoice(voices, preferred = '') {
  const list = dutchVoices(voices);
  if (preferred) {
    const own = list.find((v) => voiceId(v) === preferred);
    if (own) return own;
  }
  return list[0] || null;
}

// Naam voor in de keuzelijst: "Claire (Nederland, verbeterd)".
export function voiceLabel(v) {
  const lang = langOf(v);
  const where = lang === 'nl-nl' ? 'Nederland' : lang === 'nl-be' ? 'België' : 'Nederlands';
  const name = String(v.name || '').replace(/\s*\(.*\)\s*$/, '').trim() || 'stem';
  const extra = [where];
  if (QUALITY.test(v.name || '')) extra.push('verbeterd');
  if (isRobotVoice(v)) extra.push('robotstem');
  return `${name} (${extra.join(', ')})`;
}

// ---------------------------------------------------------------------------
// Spreken
// ---------------------------------------------------------------------------

const synth = () => globalThis.speechSynthesis || null;
let recent = []; // [{ text, at }]: wat Dammie de laatste seconden zei

// Alle Nederlandse stemmen van dit apparaat (beste eerst).
export function deviceVoices() {
  const s = synth();
  return s ? dutchVoices(s.getVoices?.() || []) : [];
}

// De stem van het kind dat nu speelt (of die van `preferred`).
export function dutchVoice(preferred = loadSettings().voice) {
  const s = synth();
  return s ? chooseVoice(s.getVoices?.() || [], preferred) : null;
}

// Kan Dammie praten? (Spraak staat aan, en er is een Nederlandse stem.)
export function canSpeak() {
  return !!synth() && loadSettings().speech && !!dutchVoice();
}

// Zegt `text` hardop.
//   force   ook als het net al gezegd is (tik op Dammie)
//   queue   na de vorige zin, in plaats van die te onderbreken (kaartjes)
//   always  ook als spraak voor dit kind uit staat ("Probeer de stem")
//   voice   deze stem (voiceId) in plaats van die van het kind (proberen)
export function speak(text, { force = false, queue = false, always = false, voice: tryVoice } = {}) {
  const s = synth();
  if (!s || typeof globalThis.SpeechSynthesisUtterance !== 'function') return false;
  if (!always && !loadSettings().speech) return false;
  const clean = cleanForSpeech(text);
  if (!clean) return false;
  const now = Date.now();
  if (!force && isRepeat(clean, recent, now)) return false;
  const voice = tryVoice === undefined ? dutchVoice() : dutchVoice(tryVoice);
  if (!voice) return false; // geen Nederlandse stem: alleen tekst
  recent = [...recent.filter((r) => r.text !== clean && now - r.at < REPEAT_MS), { text: clean, at: now }];
  const u = new globalThis.SpeechSynthesisUtterance(clean);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = SPEECH_RATE;
  u.pitch = SPEECH_PITCH;
  u.onstart = () => setTalking(true);
  u.onend = () => setTalking(false);
  u.onerror = () => setTalking(false);
  try {
    if (!queue) s.cancel(); // iets nieuws gaat voor
    s.speak(u);
  } catch {
    return false;
  }
  return true;
}

export function stopSpeaking() {
  try {
    synth()?.cancel();
  } catch {
    // niets aan de hand
  }
  setTalking(false);
}

// Dammie wiebelt zachtjes zolang hij praat (zie style.css, .talking).
function setTalking(on) {
  globalThis.document?.body?.classList.toggle('talking', on);
}

// ---------------------------------------------------------------------------
// Geluidjes. Elk geluid = een paar korte toontjes (zacht: hooguit 0,25).
//   at  start (s)   dur  duur (s)   freq  toonhoogte (Hz)   to  glijdt naar
//   type  'sine' | 'triangle'       gain  volume (0..1)
// ---------------------------------------------------------------------------

export const SOUNDS = {
  // Sprongetje van een schijf: een zacht houten tikje.
  hop: [{ at: 0, dur: 0.07, freq: 520, to: 380, type: 'triangle', gain: 0.12 }],
  // Geslagen stuk gaat van het bord: een plopje.
  capture: [{ at: 0, dur: 0.12, freq: 300, to: 160, type: 'sine', gain: 0.2 }],
  // Dam: een belletje.
  king: [
    { at: 0, dur: 0.5, freq: 988, type: 'sine', gain: 0.12 },
    { at: 0.09, dur: 0.6, freq: 1319, type: 'sine', gain: 0.1 },
  ],
  // Opdracht of partij klaar: een vrolijk loopje omhoog.
  success: [
    { at: 0, dur: 0.18, freq: 523, type: 'triangle', gain: 0.14 },
    { at: 0.12, dur: 0.18, freq: 659, type: 'triangle', gain: 0.14 },
    { at: 0.24, dur: 0.35, freq: 784, type: 'triangle', gain: 0.14 },
  ],
  // Nieuwe badge: een glinstertje.
  badge: [
    { at: 0, dur: 0.15, freq: 784, type: 'sine', gain: 0.1 },
    { at: 0.1, dur: 0.15, freq: 1047, type: 'sine', gain: 0.1 },
    { at: 0.2, dur: 0.15, freq: 1319, type: 'sine', gain: 0.1 },
    { at: 0.3, dur: 0.5, freq: 1568, type: 'sine', gain: 0.1 },
  ],
};

let audio = null; // AudioContext, pas na de eerste tik

function audioContext() {
  if (audio) return audio;
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return null;
  try {
    audio = new Ctx();
  } catch {
    audio = null;
  }
  return audio;
}

export function playSound(name) {
  const notes = SOUNDS[name];
  if (!notes || !loadSettings().sound) return false;
  const ctx = audio; // alleen als de eerste tik er al geweest is
  if (!ctx || ctx.state !== 'running') return false;
  try {
    const t0 = ctx.currentTime + 0.01;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, t0 + n.at);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.dur);
      // Zacht aan en zacht uit, zonder klikjes.
      env.gain.setValueAtTime(0.0001, t0 + n.at);
      env.gain.exponentialRampToValueAtTime(n.gain, t0 + n.at + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(env).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
  } catch {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// De eerste tik maakt spraak en geluid wakker (iPad/iPhone).
// ---------------------------------------------------------------------------

export function unlockAudio() {
  const ctx = audioContext();
  if (ctx && ctx.state !== 'running') ctx.resume?.().catch(() => {});
  const s = synth();
  if (s && typeof globalThis.SpeechSynthesisUtterance === 'function' && !recent.length) {
    try {
      const u = new globalThis.SpeechSynthesisUtterance(' ');
      u.volume = 0;
      s.speak(u);
    } catch {
      // geen spraak: niet erg
    }
  }
}

export function installAudioUnlock(target = globalThis.document) {
  if (!target) return;
  const once = () => {
    unlockAudio();
    target.removeEventListener('pointerdown', once, true);
    target.removeEventListener('keydown', once, true);
  };
  target.addEventListener('pointerdown', once, true);
  target.addEventListener('keydown', once, true);
  // Sommige browsers laden de stemmen pas later; vraag ze alvast op.
  synth()?.getVoices?.();
}
