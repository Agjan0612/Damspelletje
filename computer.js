// computer.js — vraagt de computer om een zet.
//
// Het denken gebeurt in een Web Worker (ai-worker.js), zodat het bord niet
// bevriest. Lukt dat niet (oude browser, fout, of het duurt te lang), dan
// doet de app zelf een snelle zet. Zo kan het spel nooit vastlopen.

import { chooseMove } from './ai.js';
import { legalMoves, moveToLongString } from './rules.js';

const TIMEOUT_MS = 4000; // niveau 5 denkt ongeveer 1 seconde; dit is ruim
const FALLBACK_LEVEL = 2;

let worker = null; // null = nog niet gestart, false = werkt niet in deze browser
let nextId = 1;
const pending = new Map();

function stopWorker() {
  if (worker) worker.terminate();
  worker = null;
  for (const [id, done] of pending) {
    pending.delete(id);
    done(null);
  }
}

function getWorker() {
  if (worker === false) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
  } catch {
    worker = false;
    return null;
  }
  worker.onmessage = (e) => {
    const done = pending.get(e.data.id);
    if (!done) return;
    pending.delete(e.data.id);
    done(e.data.move);
  };
  worker.onerror = () => {
    stopWorker();
    worker = false; // niet steeds opnieuw proberen
  };
  return worker;
}

// Geeft (via een Promise) een legale zet voor de speler aan zet, of null als
// er geen zet is.
export function askComputer(game, level) {
  const legal = legalMoves(game);
  if (legal.length === 0) return Promise.resolve(null);
  const match = (m) => (m ? legal.find((x) => moveToLongString(x) === moveToLongString(m)) : null);
  const quick = () => match(chooseMove(game, Math.min(level, FALLBACK_LEVEL))) || legal[0];

  const w = getWorker();
  if (!w) return Promise.resolve(quick());
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      stopWorker(); // hangt hij? Dan de volgende keer een nieuwe
      resolve(quick());
    }, TIMEOUT_MS);
    pending.set(id, (move) => {
      clearTimeout(timer);
      resolve(match(move) || quick());
    });
    // Alleen wat de computer nodig heeft (geen geschiedenis).
    const { board, size, turn, options } = game;
    w.postMessage({ id, game: { board, size, turn, options }, level });
  });
}
