// lesson-engine.js — de "lesmotor": controleert opdrachten, geeft hints en sterren.
//
// Pure logica zonder scherm, zodat alles te testen is (zie tests.js).
// Een opdracht ("exercise") uit lessons.js heeft:
//   size, fen, options   de stand en welke regels gelden
//   text                 wat Dammie vertelt
//   tip                  hint stap 1 (gesproken/tekst)
//   goal                 wat het kind moet doen (zie hieronder)
//   wrong, success       eigen teksten bij "bijna" en "goed" (optioneel)
//   notBest              tekst als een slag mag, maar niet de slimste is
//   boss                 eindopdracht: hint pas na 2 keer "bijna"
//   showMust             oranje ring bij slagplicht tonen (standaard ja)
//   demo                 zet die Dammie eerst voordoet, bijv. '14x7'
//
// Doelen (goal.type):
//   'move'    één zet; goal.accept = lijst toegestane zetten ('32-28'), leeg = elke zet
//   'capture' één slag, eventueel met extra eisen:
//             goal.min  = minstens zoveel stukken slaan (meerslag)
//             goal.land = lijst velden waar de slag moet eindigen (de ster)
//             goal.best = 'king' (sla een dam mee) of 'safe' (de tegenstander
//                         kan daarna niet terugslaan). Andere slagen mogen
//                         wel, maar dan zegt Dammie "Bijna! ... slimmer".
//   'promote' dam halen, eventueel binnen goal.maxMoves zetten
//   'reach'   met een stuk op goal.square komen (de ster), eventueel binnen goal.maxMoves
//   'turns'   goal.count zetten om de beurt (wit en zwart)
//   'pick'    velden aantikken: goal.squares, of goal.of = 'dark' | 'color' |
//             'destinations' | 'mustCapture' | 'captured' (met goal.count / goal.color / goal.square)
//             'captured' = de stukken die geslagen worden
//
// Doelen waarbij de tegenstander terugzet (les 15–19). Na de zet van het kind
// doet de app de zet van zwart. De lesmotor rekent alle antwoorden van zwart
// door: een plan telt pas als goed als het werkt, wat zwart ook doet.
//   'safe'    een zet waarna zwart niets kan slaan (verdedigen)
//   'threat'  een zet waarna zwart niets kan slaan, maar jij de volgende beurt
//             wél kunt slaan (aanvallen)
//   'trade'   geef een stuk weg en sla terug; goal.net = hoeveel stukken je
//             meer slaat dan je kwijt bent (0 = ruil, 1 = twee voor één).
//             Daarna mag zwart niets meer kunnen slaan.
//   'block'   zet zwart vast: zwart kan geen enkele zet meer doen
//   goal.maxMoves = zoveel zetten van het kind (standaard 2 bij 'trade', anders 1)
//
//   'choice'  een vraag met knoppen; goal.ask = 'remise': het kind kiest
//             🤝 remise of 🏆 wit wint. Het antwoord volgt uit de regels (drawAnswer).

import {
  createGame,
  legalMoves,
  captureMoves,
  isKing,
  play,
  moveToString,
  getGeometry,
  colorOf,
  opponent,
  endgameLimit,
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

  if (isPlan(goal)) return onPlanMove(state, move, { done, retry });

  switch (goal.type) {
    case 'move':
      if (!goal.accept || goal.accept.includes(moveToString(move))) return done();
      return retry();
    case 'capture': {
      const check = captureCheck(goal, state.game, move);
      if (check === 'ok') return done();
      if (check === 'not-best') return retry(ex.notBest || 'Bijna! Die slag mag ook, maar er is een slimmere. Probeer het nog eens.');
      if (check === 'land') return retry('Bijna! Probeer op de ster te landen.');
      if (check === 'min') return retry('Bijna! Je kunt nog meer stukken slaan.');
      return retry('Bijna! Je moet slaan.');
    }
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

// ---------------------------------------------------------------------------
// Plannen: de tegenstander zet terug (les 15–19)
// ---------------------------------------------------------------------------

const PLAN_GOALS = ['safe', 'threat', 'trade', 'block'];
export const isPlan = (goal) => PLAN_GOALS.includes(goal.type);

const planMoves = (goal) => goal.maxMoves || (goal.type === 'trade' ? 2 : 1);

const countPieces = (board, color) => board.filter((p, sq) => sq > 0 && colorOf(p) === color).length;
const canCapture = (game, color) => captureMoves(game.board, game.size, color, game.options).length > 0;

// Is het doel gehaald, direct na een zet van het kind (`me`)? `start` = beginstand.
export function planReached(goal, start, game) {
  const me = start.turn;
  const opp = opponent(me);
  switch (goal.type) {
    case 'safe':
      return !canCapture(game, opp);
    case 'threat':
      return !canCapture(game, opp) && canCapture(game, me);
    case 'trade': {
      const lostMe = countPieces(start.board, me) - countPieces(game.board, me);
      const lostOpp = countPieces(start.board, opp) - countPieces(game.board, opp);
      return lostMe >= 1 && lostOpp - lostMe >= (goal.net || 0) && !canCapture(game, opp);
    }
    case 'block':
      return game.turn === opp && countPieces(game.board, opp) > 0 && legalMoves(game).length === 0;
    default:
      return false;
  }
}

// Werkt zet `move` (in stand `game`, met nog `left` zetten van het kind)?
// Dan is het doel meteen gehaald, of het lukt na ELK antwoord van zwart.
export function planWorks(goal, start, game, move, left) {
  const after = play(game, move);
  if (planReached(goal, start, after)) return true;
  if (left <= 1) return false;
  const replies = legalMoves(after);
  if (replies.length === 0) return false;
  return replies.every((r) => planSolve(goal, start, play(after, r), left - 1) !== null);
}

// Eerste zet van een plan dat werkt, of null.
export function planSolve(goal, start, game, left) {
  return legalMoves(game).find((m) => planWorks(goal, start, game, m, left)) || null;
}

const planLeft = (state) => planMoves(state.ex.goal) - state.moveCount;

// Het antwoord van zwart dat het kind laat zien wat er misgaat (het liefst een slag).
function refutation(goal, start, after, left) {
  const replies = legalMoves(after);
  const bad = replies.filter((r) => left <= 1 || planSolve(goal, start, play(after, r), left - 1) === null);
  return bad.sort((a, b) => b.captures.length - a.captures.length)[0] || null;
}

const piecesText = (n) => (n === 1 ? '1 stuk' : `${n} stukken`);

function onPlanMove(state, move, { done, retry }) {
  const { goal } = state.ex;
  const left = planLeft(state);
  const after = play(state.game, move);
  const next = { ...state, game: after, moveCount: state.moveCount + 1 };
  if (planReached(goal, state.start, after)) return done();

  if (!planWorks(goal, state.start, state.game, move, left)) {
    const reply = refutation(goal, state.start, after, left);
    let message = 'Bijna! Zo lukt het niet. Probeer het nog eens.';
    if (reply && reply.captures.length > 0) {
      message = `Bijna! Kijk: dan slaat zwart ${piecesText(reply.captures.length)}. Probeer het nog eens.`;
    } else if (goal.type === 'threat' && left <= 1) {
      message = 'Bijna! Dan kun je de volgende beurt niet slaan. Probeer het nog eens.';
    } else if (goal.type === 'block') {
      message = 'Bijna! Dan kan zwart nog zetten. Probeer het nog eens.';
    }
    const out = retry(message);
    if (reply) out.outcome = { ...out.outcome, reply, between: after };
    return out;
  }

  // Het plan werkt: zwart zet terug. Bij meer keuzes nemen we de grootste slag.
  const reply = legalMoves(after).sort((a, b) => b.captures.length - a.captures.length)[0];
  const game = play(after, reply);
  return {
    state: { ...next, game },
    outcome: {
      type: 'continue',
      message: reply.captures.length > 0 ? 'Zwart moet slaan!' : 'Zwart zet.',
      after: 'Nu jij weer!',
      reply,
      between: after,
    },
  };
}

// ---------------------------------------------------------------------------
// Keuzevraag: is het remise? (les 20)
// ---------------------------------------------------------------------------

export const CHOICES = {
  remise: [
    { value: 'remise', label: '🤝 Remise' },
    { value: 'wit', label: '🏆 Wit wint' },
  ],
};

// 'wit' als wit nu in één zet alle zwarte stukken slaat of zwart vastzet,
// 'remise' bij 1 dam tegen 1 dam (5-zettenregel) zonder zo'n zet, anders null.
export function drawAnswer(game) {
  const opp = opponent(game.turn);
  const wins = legalMoves(game).some((m) => {
    const after = play(game, m);
    return countPieces(after.board, opp) === 0 || legalMoves(after).length === 0;
  });
  if (wins) return 'wit';
  const kingsOnly = (color) => game.board.filter((p, sq) => sq > 0 && colorOf(p) === color).every(isKing);
  const oneEach = countPieces(game.board, 'w') === 1 && countPieces(game.board, 'b') === 1;
  if (oneEach && kingsOnly('w') && kingsOnly('b') && endgameLimit(game.board) === 5) return 'remise';
  return null;
}

// Het kind tikt op een knop. Uitkomst type 'done' of 'wrong'.
export function onChoice(state, value) {
  const { ex } = state;
  const answer = drawAnswer(state.game);
  if (value === answer) {
    return {
      state: { ...state, done: true },
      outcome: { type: 'done', message: ex.success || `${praise(state)} ${starText(stars(state))}` },
    };
  }
  const message = answer === 'wit'
    ? 'Bijna! Kijk goed: de witte dam kan de zwarte dam meteen slaan.'
    : 'Bijna! De witte dam kan de zwarte dam niet slaan. 1 dam tegen 1 dam is remise.';
  return { state: { ...state, mistakes: state.mistakes + 1 }, outcome: { type: 'wrong', message: ex.wrong || message } };
}

// Voldoet deze slag aan het doel? 'ok', of waarom niet:
//   'no-capture' | 'min' | 'land' | 'not-best'
export function captureCheck(goal, game, move) {
  if (move.captures.length === 0) return 'no-capture';
  if (goal.min && move.captures.length < goal.min) return 'min';
  if (goal.land && !goal.land.includes(move.to)) return 'land';
  if (goal.best === 'king' && !move.captures.some((sq) => isKing(game.board[sq]))) return 'not-best';
  if (goal.best === 'safe') {
    const after = play(game, move);
    if (captureMoves(after.board, after.size, after.turn, after.options).length > 0) return 'not-best';
  }
  return 'ok';
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
  } else if (g.of === 'captured') {
    set = [...new Set(captureMoves(game.board, game.size, game.turn, game.options).flatMap((m) => m.captures))];
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

  if (ex.goal.type === 'choice') {
    if (level === 1) return { ...empty, text: tip };
    const win = drawAnswer(state.game) === 'wit' ? solutionMove(state) : null;
    if (win) return { text: 'Kijk naar de blauwe dam en de blauwe ring.', glow: [win.from], marks: level >= 3 ? [win.to] : [] };
    return { ...empty, text: 'Kan de witte dam de zwarte dam slaan? Nee? Dan is het remise.' };
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
  if (isPlan(goal)) return planSolve(goal, state.start, state.game, planLeft(state));
  switch (goal.type) {
    case 'choice': {
      // Bij "wit wint": de winnende zet (voor de hint).
      const opp = opponent(state.game.turn);
      return moves.find((m) => {
        const after = play(state.game, m);
        return countPieces(after.board, opp) === 0 || legalMoves(after).length === 0;
      }) || null;
    }
    case 'move':
      return moves.find((m) => !goal.accept || goal.accept.includes(moveToString(m))) || null;
    case 'capture':
      return moves.find((m) => captureCheck(goal, state.game, m) === 'ok') || null;
    case 'turns':
      return moves[0] || null;
    case 'promote':
    case 'reach':
      return solve(state.game, goal, remainingMoves(state));
    default:
      return null;
  }
}

// Alle goede eerste zetten in de beginstand (voor de tests: "precies één oplossing").
export function goodFirstMoves(state) {
  const { goal } = state.ex;
  const moves = legalMoves(state.game);
  if (isPlan(goal)) return moves.filter((m) => planWorks(goal, state.start, state.game, m, planLeft(state)));
  if (goal.type === 'capture') return moves.filter((m) => captureCheck(goal, state.game, m) === 'ok');
  const m = solutionMove(state);
  return m ? [m] : [];
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
