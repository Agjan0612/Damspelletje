// lesson-engine.js — de "lesmotor": controleert opdrachten, geeft hints en sterren.
//
// Pure logica zonder scherm, zodat alles te testen is (zie tests.js).
// Een opdracht ("exercise") uit lessons.js heeft:
//   size, fen, options   de stand en welke regels gelden
//   text                 wat Dammie vertelt
//   tip                  hint stap 1 (gesproken/tekst)
//   goal                 wat het kind moet doen (zie hieronder)
//   wrong, success       eigen teksten bij "bijna" en "goed" (optioneel)
//   boss                 eindopdracht: hint pas na 2 keer "bijna"
//   showMust             oranje ring bij slagplicht tonen (standaard ja)
//   demo                 zet die Dammie eerst voordoet, bijv. '14x7'
//
// Doelen (goal.type):
//   'move'    één zet; goal.accept = lijst toegestane zetten ('32-28'), leeg = elke zet
//   'capture' één slag
//   'promote' dam halen, eventueel binnen goal.maxMoves zetten
//   'reach'   met een stuk op goal.square komen (de ster), eventueel binnen goal.maxMoves
//   'turns'   goal.count zetten om de beurt (wit en zwart)
//   'pick'    velden aantikken: goal.squares, of goal.of = 'dark' | 'color' |
//             'destinations' | 'mustCapture' (met goal.count / goal.color / goal.square)

import {
  createGame,
  legalMoves,
  captureMoves,
  play,
  moveToString,
  getGeometry,
  colorOf,
} from './rules.js';

const MAX_SEARCH_DEPTH = 10;
const PRAISE = ['Super!', 'Goed zo!', 'Knap gedaan!', 'Top!', 'Hoera!'];

// Bij "dam halen" en "naar de ster" zet alleen het kind: de tegenstander doet niets.
const isSolo = (goal) => goal.type === 'promote' || goal.type === 'reach';

export function startExercise(ex, index = 0) {
  const game = createGame({ size: ex.size, fen: ex.fen, options: ex.options || {} });
  return {
    ex,
    index,
    start: game,
    game,
    moveCount: 0,
    hintLevel: 0,
    mistakes: 0,
    picked: [],
    done: false,
  };
}

// ---------------------------------------------------------------------------
// Zetten van het kind
// ---------------------------------------------------------------------------

function soloPlay(game, move) {
  const next = play(game, move);
  return { ...next, turn: game.turn };
}

function playFor(state, move) {
  return isSolo(state.ex.goal) ? soloPlay(state.game, move) : play(state.game, move);
}

// Uitkomst: { state, outcome: { type, message } }
//   type 'done'     opdracht gehaald
//   type 'continue' goed bezig, volgende zet
//   type 'retry'    bijna: deze zet telt niet, stand gaat terug
//   type 'reset'    zo lukt het niet meer: opdracht begint opnieuw
export function onMove(state, move) {
  const { ex } = state;
  const goal = ex.goal;
  const next = { ...state, game: playFor(state, move), moveCount: state.moveCount + 1 };
  const done = (msg) => ({
    state: { ...next, done: true },
    outcome: { type: 'done', message: ex.success || `${praise(state)} ${starText(stars(state))}` },
  });
  const retry = (msg) => ({
    state: { ...state, mistakes: state.mistakes + 1 },
    outcome: { type: 'retry', message: ex.wrong || msg || 'Bijna! Probeer het nog eens.' },
  });
  const reset = (msg) => ({
    state: { ...state, game: state.start, moveCount: 0, mistakes: state.mistakes + 1 },
    outcome: { type: 'reset', message: msg },
  });

  switch (goal.type) {
    case 'move':
      if (!goal.accept || goal.accept.includes(moveToString(move))) return done();
      return retry();
    case 'capture':
      if (move.captures.length > 0) return done();
      return retry('Bijna! Je moet slaan.');
    case 'turns':
      if (next.moveCount >= goal.count) return done();
      return { state: next, outcome: { type: 'continue', message: `Goed! Nu is ${next.game.turn === 'w' ? 'wit' : 'zwart'} aan de beurt.` } };
    case 'promote':
    case 'reach': {
      if (achieves(goal, move)) return done();
      const left = remainingMoves(next);
      if (left <= 0 || !solve(next.game, goal, left)) {
        return reset(goal.type === 'reach'
          ? 'Oei, zo kom je niet meer bij de ster. We proberen het nog een keer!'
          : 'Oei, zo lukt het niet meer. We proberen het nog een keer!');
      }
      return { state: next, outcome: { type: 'continue', message: 'Goed zo, verder!' } };
    }
    default:
      return retry();
  }
}

function achieves(goal, move) {
  if (goal.type === 'promote') return move.promotes;
  if (goal.type === 'reach') return move.to === goal.square;
  return false;
}

function remainingMoves(state) {
  const max = state.ex.goal.maxMoves;
  return max ? max - state.moveCount : MAX_SEARCH_DEPTH;
}

// Zoekt de kortste weg naar het doel (alleen eigen zetten). Geeft de eerste
// zet van die weg terug, of null als het niet lukt binnen `depth` zetten.
export function solve(game, goal, depth = MAX_SEARCH_DEPTH) {
  const key = (g) => g.board.join('');
  const queue = [{ g: game, first: null, d: 0 }];
  const seen = new Set([key(game)]);
  while (queue.length) {
    const { g, first, d } = queue.shift();
    if (d >= depth) continue;
    for (const m of legalMoves(g)) {
      if (achieves(goal, m)) return first || m;
      const ng = soloPlay(g, m);
      const k = key(ng);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ g: ng, first: first || m, d: d + 1 });
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Velden aantikken
// ---------------------------------------------------------------------------

// Welke velden zijn goed, en hoeveel moet het kind er aantikken?
export function pickTargets(ex, game) {
  const g = ex.goal;
  const geo = getGeometry(ex.size);
  let set = [];
  if (g.squares) set = g.squares.slice();
  else if (g.of === 'dark') set = Array.from({ length: geo.count }, (_, i) => i + 1);
  else if (g.of === 'color') {
    for (let sq = 1; sq <= geo.count; sq++) if (colorOf(game.board[sq]) === g.color) set.push(sq);
  } else if (g.of === 'destinations') {
    set = [...new Set(legalMoves(game).filter((m) => m.from === g.square).map((m) => m.to))];
  } else if (g.of === 'mustCapture') {
    set = [...new Set(captureMoves(game.board, game.size, game.turn, game.options).map((m) => m.from))];
  }
  return { set, count: Math.min(g.count || set.length, set.length) };
}

// tap = { sq, row, col }; sq is null bij een licht veld.
// Uitkomst type: 'picked' | 'done' | 'wrong' | 'already'
export function onPick(state, tap) {
  const { ex } = state;
  const { set, count } = pickTargets(ex, state.game);
  const sq = tap.sq;
  if (sq && state.picked.includes(sq)) {
    return { state, outcome: { type: 'already', message: 'Die had je al. Zoek nog een ander veld!' } };
  }
  if (sq && set.includes(sq)) {
    const picked = state.picked.concat(sq);
    if (picked.length >= count) {
      return {
        state: { ...state, picked, done: true },
        outcome: { type: 'done', message: ex.success || `${praise(state)} ${starText(stars(state))}` },
      };
    }
    const left = count - picked.length;
    return { state: { ...state, picked }, outcome: { type: 'picked', message: `Goed zo! Nog ${left}.` } };
  }
  const message = !sq
    ? 'Bijna! Dat is een licht veld. Op de lichte velden komt nooit een schijf.'
    : ex.wrong || 'Bijna! Probeer een ander veld.';
  return { state: { ...state, mistakes: state.mistakes + 1 }, outcome: { type: 'wrong', message } };
}

// ---------------------------------------------------------------------------
// Hints in drie stappen: (1) tip, (2) het juiste stuk licht op, (3) voordoen
// ---------------------------------------------------------------------------

export function canHint(state) {
  if (state.done || state.hintLevel >= 3) return false;
  return !state.ex.boss || state.mistakes >= 2;
}

export function nextHint(state) {
  if (!canHint(state)) return { state, hint: currentHint(state) };
  const next = { ...state, hintLevel: state.hintLevel + 1 };
  return { state: next, hint: currentHint(next) };
}

// Wat moet het bord laten zien bij het huidige hintniveau?
//   { text, glow: [velden met stuk dat oplicht], marks: [velden met een ring] }
export function currentHint(state) {
  const level = state.hintLevel;
  const { ex } = state;
  const empty = { text: null, glow: [], marks: [] };
  if (level === 0) return empty;
  const tip = ex.tip || 'Kijk goed naar het bord. Je kunt het!';

  if (ex.goal.type === 'pick') {
    const { set } = pickTargets(ex, state.game);
    const left = set.filter((s) => !state.picked.includes(s));
    if (level === 1) return { ...empty, text: tip };
    if (level === 2) return { text: 'Kijk eens naar het veld met de blauwe ring.', glow: [], marks: left.slice(0, 1) };
    return { text: 'De blauwe ringen laten zien welke velden goed zijn.', glow: [], marks: left };
  }

  const move = solutionMove(state);
  if (level === 1 || !move) return { ...empty, text: tip };
  if (level === 2) return { text: 'Kijk naar het stuk dat blauw oplicht.', glow: [move.from], marks: [] };
  return { text: 'Zet het blauwe stuk naar het veld met de blauwe ring.', glow: [move.from], marks: [move.to] };
}

// Een goede zet voor de huidige stand (voor hints en voor de tests).
export function solutionMove(state) {
  const { goal } = state.ex;
  const moves = legalMoves(state.game);
  switch (goal.type) {
    case 'move':
      return moves.find((m) => !goal.accept || goal.accept.includes(moveToString(m))) || null;
    case 'capture':
      return moves.find((m) => m.captures.length > 0) || null;
    case 'turns':
      return moves[0] || null;
    case 'promote':
    case 'reach':
      return solve(state.game, goal, remainingMoves(state));
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Sterren: 3 zonder hint, 2 met één hint, 1 met meer hints. Altijd "gehaald".
// ---------------------------------------------------------------------------

export function stars(state) {
  if (state.hintLevel === 0) return 3;
  if (state.hintLevel === 1) return 2;
  return 1;
}

export function lessonStars(exerciseStars) {
  if (!exerciseStars.length) return 0;
  const avg = exerciseStars.reduce((a, b) => a + b, 0) / exerciseStars.length;
  return Math.max(1, Math.round(avg));
}

const starText = (n) => '⭐'.repeat(n);
const praise = (state) => PRAISE[state.index % PRAISE.length];
