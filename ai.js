// ai.js — de computer-tegenstander.
//
// Eén zoekmethode (minimax met alfa-bèta) met een profiel per niveau.
// De zetten komen altijd uit rules.js (legalMoves), dus de computer speelt
// precies volgens dezelfde regels als het kind, ook in lessen met regels uit.
//
// Dit bestand doet geen schermwerk. In de app draait het in een Web Worker
// (ai-worker.js), zodat het bord niet bevriest terwijl de computer nadenkt.
// De tests roepen het rechtstreeks aan.

import { legalMoves, captureMoves, applyMoveToBoard, opponent, isKing, getGeometry } from './rules.js';

export const LEVELS = [
  { level: 1, name: 'Slaapkop', icon: '😴' },
  { level: 2, name: 'Speels', icon: '🙂' },
  { level: 3, name: 'Slim', icon: '🦊' },
  { level: 4, name: 'Slimmer', icon: '🦉' },
  { level: 5, name: 'Kampioen', icon: '🏆' },
];
export const MIN_LEVEL = 1;
export const MAX_LEVEL = LEVELS.length;

// Hoe elk niveau speelt (zie docs/briefing.md §2.4).
//   depth          hoe ver vooruit (halve zetten); slagen worden altijd uitgerekend
//   randomChance   kans op een willekeurige zet
//   mistakeChance  kans op een zet uit de onderste helft
//   timeMs         stop na zoveel tijd en gebruik de laatste hele berekening
const PROFILES = {
  1: { sleepy: true },
  2: { depth: 1, randomChance: 0.4, quiescence: false },
  3: { depth: 3, mistakeChance: 0.15 },
  4: { depth: 5, timeMs: 2000 },
  5: { depth: 40, timeMs: 1000 },
};

// Hoe vaak Slaapkop een schijf "in de slag" zet als dat kan.
const SLEEPY_HANG_CHANCE = 0.8;

// Waarde van de stukken en de stand (in "honderdsten van een schijf").
const MAN = 100;
const KING = 300;          // dam ≈ 3 schijven
const ADVANCE = 4;         // per rij vooruit
const ADVANCE_RACE = 20;   // per rij vooruit als de eerste dam wint
const BACK_ROW = 5;        // schijf op de eigen achterste rij houdt dammen tegen
const CENTER = 2;          // per kolom dichter bij het midden
const WIN = 1_000_000;

const ABORT = Symbol('tijd om');
const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ---------------------------------------------------------------------------
// De zet kiezen
// ---------------------------------------------------------------------------

// Kiest een zet voor de speler die aan zet is. Geeft altijd een zet uit
// legalMoves(game) terug, of null als er geen zet is.
//   random  getal 0..1 (in de tests vast, zodat ze steeds hetzelfde uitkomen)
//   now     klok in milliseconden (alleen voor de tijdslimiet)
export function chooseMove(game, level = 3, { random = Math.random, now = defaultNow } = {}) {
  const moves = legalMoves(game);
  if (moves.length <= 1) return moves[0] || null;
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  const profile = PROFILES[clampLevel(level)];

  if (profile.sleepy) return sleepyMove(game, moves, pick, random);
  if (profile.randomChance && random() < profile.randomChance) return pick(moves);

  const scored = scoreMoves(game, moves, profile, now);
  if (profile.mistakeChance && random() < profile.mistakeChance) {
    return pick(scored.slice(Math.ceil(scored.length / 2))).move;
  }
  const best = scored[0].score;
  return pick(scored.filter((s) => s.score === best)).move;
}

export function clampLevel(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return MIN_LEVEL;
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, n));
}

// Niveau 1: willekeurig, en het liefst een schijf neerzetten die geslagen kan
// worden. Slaan doet hij wel als het moet (dan zijn alle zetten slagen).
function sleepyMove(game, moves, pick, random) {
  if (moves[0].captures.length > 0) return pick(moves);
  const hanging = moves.filter((m) => {
    const board = applyMoveToBoard(game.board, m);
    return captureMoves(board, game.size, opponent(game.turn), game.options).length > 0;
  });
  if (hanging.length > 0 && random() < SLEEPY_HANG_CHANCE) return pick(hanging);
  return pick(moves);
}

// ---------------------------------------------------------------------------
// Zoeken: minimax (negamax-vorm) met alfa-bèta
// ---------------------------------------------------------------------------

// Rekent elke zet door en geeft [{ move, score }] terug, beste eerst.
// Met een tijdslimiet wordt steeds één halve zet dieper gezocht
// ("iterative deepening"); is de tijd op, dan telt de laatste hele ronde.
function scoreMoves(game, moves, profile, now) {
  const root = nodeOf(game);
  const ctx = {
    quiescence: profile.quiescence !== false,
    race: !!game.options.eersteDamWint,
    deadline: Infinity,
    now,
    nodes: 0,
  };
  const start = now();
  // Alle zetten precies uitrekenen is nodig om "een zet uit de onderste helft"
  // te kunnen kiezen; anders volstaat het om de beste (en gelijke) te kennen.
  const exact = !!profile.mistakeChance;
  let scored = moves.map((move) => ({ move, score: 0 }));
  for (let depth = 1; depth <= profile.depth; depth++) {
    // De eerste ronde maakt hij altijd af, zodat er steeds een zet is.
    ctx.deadline = depth > 1 && profile.timeMs ? start + profile.timeMs : Infinity;
    try {
      scored = searchRoot(ctx, root, scored.map((s) => s.move), depth, exact);
    } catch (err) {
      if (err !== ABORT) throw err;
      break;
    }
    if (Math.abs(scored[0].score) >= WIN - 1000) break; // winst of verlies gevonden
  }
  return scored;
}

function searchRoot(ctx, root, moves, depth, exact) {
  const out = [];
  let best = -Infinity;
  for (const move of moves) {
    // Met alpha = best - 1 blijft een zet die even goed is precies bekend,
    // zodat de computer tussen gelijke zetten kan wisselen.
    const alpha = exact ? -Infinity : best - 1;
    const score = moveScore(ctx, root, move, depth, alpha, Infinity, 0);
    out.push({ move, score });
    if (score > best) best = score;
  }
  // Stabiel sorteren: bij gelijke score blijft de volgorde van de vorige ronde.
  return out.sort((a, b) => b.score - a.score);
}

// Score van één zet voor de speler die hem doet.
function moveScore(ctx, node, move, depth, alpha, beta, ply) {
  if (ctx.race && move.promotes) return WIN - ply - 1;
  const child = {
    board: applyMoveToBoard(node.board, move),
    size: node.size,
    turn: opponent(node.turn),
    options: node.options,
  };
  return -search(ctx, child, depth - 1, -beta, -alpha, ply + 1);
}

function search(ctx, node, depth, alpha, beta, ply) {
  ctx.nodes++;
  if ((ctx.nodes & 1023) === 0 && ctx.now() > ctx.deadline) throw ABORT;

  const moves = legalMoves(node);
  if (moves.length === 0) return -(WIN - ply); // geen zet of geen stukken: verloren

  // Bij een verplichte slag rekenen we door, ook voorbij de gewone diepte.
  // Anders "ziet" de computer niet dat hij na zijn zet een stuk kwijtraakt.
  const mustCapture = moves[0].captures.length > 0 && node.options.slagplicht;
  if (depth <= 0 && !(ctx.quiescence && mustCapture)) return evaluate(node, ctx.race);

  if (!mustCapture) moves.sort((a, b) => (b.promotes ? 1 : 0) - (a.promotes ? 1 : 0));
  let best = -Infinity;
  for (const move of moves) {
    const score = moveScore(ctx, node, move, depth, alpha, beta, ply);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

function nodeOf(game) {
  return { board: game.board, size: game.size, turn: game.turn, options: game.options };
}

// ---------------------------------------------------------------------------
// Een stand beoordelen
// ---------------------------------------------------------------------------

// Hoe goed staat de speler die aan zet is? Telt materiaal (dam ≈ 3 schijven),
// het centrum en hoe ver de schijven al zijn.
export function evaluate(node, race = !!node.options?.eersteDamWint) {
  const { board, size } = node;
  const geo = getGeometry(size);
  const mid = (size - 1) / 2;
  const advance = race ? ADVANCE_RACE : ADVANCE;
  let white = 0;
  for (let sq = 1; sq <= geo.count; sq++) {
    const p = board[sq];
    if (p === '.') continue;
    const { row, col } = geo.coords[sq];
    const isWhite = p === 'w' || p === 'W';
    let v;
    if (isKing(p)) {
      v = KING;
    } else {
      const rowsDone = isWhite ? size - 1 - row : row;
      v = MAN + rowsDone * advance + (rowsDone === 0 ? BACK_ROW : 0);
    }
    v += Math.round((mid - Math.abs(col - mid)) * CENTER);
    white += isWhite ? v : -v;
  }
  return node.turn === 'w' ? white : -white;
}

// ---------------------------------------------------------------------------
// Uitleg na een fout: geeft deze zet direct iets weg?
// ---------------------------------------------------------------------------

// Wat kost deze zet als de ander meteen slaat en jij daarna zoveel mogelijk
// terugslaat? Geeft { take, net } terug:
//   take = hoeveel stukken de ander dan kan slaan
//   net  = wat je in totaal verliest (min wat je met deze zet zelf sloeg)
export function moveCost(game, move) {
  const { size, options } = game;
  const me = game.turn;
  const board = applyMoveToBoard(game.board, move);
  const replies = captureMoves(board, size, opponent(me), options);
  const gained = move.captures.length;
  if (replies.length === 0) return { take: 0, net: -gained };
  let worst = null;
  for (const reply of replies) {
    const back = captureMoves(applyMoveToBoard(board, reply), size, me, options);
    const retake = back.reduce((max, m) => Math.max(max, m.captures.length), 0);
    const net = reply.captures.length - retake - gained;
    if (!worst || net > worst.net || (net === worst.net && reply.captures.length > worst.take)) {
      worst = { take: reply.captures.length, net };
    }
  }
  return worst;
}

// Geeft { take } terug als deze zet stukken weggeeft terwijl een andere zet
// minder had gekost; anders null. Zo zegt Dammie niets als het kind niets
// beters kon doen.
export function giveaway(game, move) {
  const cost = moveCost(game, move);
  if (cost.net <= 0) return null;
  const bestOther = Math.min(...legalMoves(game).map((m) => moveCost(game, m).net));
  if (bestOther >= cost.net) return null;
  return { take: cost.take };
}

// ---------------------------------------------------------------------------
// Het niveau past zich aan
// ---------------------------------------------------------------------------

// state = { level, wins, losses } (wins/losses = hoeveel keer achter elkaar).
// result = 'win' | 'loss' | 'draw' (gezien vanaf het kind).
// Na 3x winst: voorstel om omhoog te gaan (suggestUp). Na 3x verlies: stil
// een niveau omlaag. Remise telt niet mee en breekt de reeks ook niet.
export function adaptLevel(state, result) {
  const s = { level: 1, wins: 0, losses: 0, ...state };
  s.level = clampLevel(s.level);
  let suggestUp = false;
  if (result === 'win') {
    s.wins += 1;
    s.losses = 0;
    if (s.wins >= 3) {
      s.wins = 0;
      suggestUp = s.level < MAX_LEVEL;
    }
  } else if (result === 'loss') {
    s.losses += 1;
    s.wins = 0;
    if (s.losses >= 3) {
      s.losses = 0;
      s.level = Math.max(MIN_LEVEL, s.level - 1);
    }
  }
  return { state: s, suggestUp };
}
