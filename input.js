// input.js — wat gebeurt er als het kind op een veld tikt?
//
// Pure logica zonder scherm, zodat we het kunnen testen (zie tests.js).
// Het bord (board.js) roept `tap()` aan en laat zien wat eruit komt.
//
// Werkwijze:
//  1. Tik op een eigen stuk dat kan zetten  -> geselecteerd, doelvelden lichten op.
//  2. Tik op een doelveld                   -> de zet wordt gespeeld.
//  3. Kunnen twee verschillende slagen op hetzelfde veld eindigen, dan vragen
//     we om de tussenvelden ("route-modus"), één voor één.
//  4. Stap voor stap: bij een meerslag mag het kind ook eerst op het veld tikken
//     waar het stuk na de eerste sprong landt. Dan komt de volgende stip, enz.,
//     tot de slag af is. Meteen op het eindveld tikken mag ook (ook halverwege).

import { colorOf, legalMoves, captureMoves } from './rules.js';

export function emptySelection() {
  return { from: null, route: null };
}

// Geeft { selection, result } terug. result.type is één van:
//   'select'         stuk geselecteerd                         { from }
//   'deselect'       selectie opgeheven
//   'blocked'        eigen stuk kan niet zetten                 { from, reason: 'moet-slaan' | 'geen-zet' }
//                    of kan wel slaan, maar minder dan een ander { from, reason: 'minder-slaan', count, best }
//   'opponent'       stuk van de tegenstander aangetikt
//   'empty'          leeg veld aangetikt zonder selectie
//   'invalid-target' geselecteerd stuk mag daar niet heen
//   'route'          meerdere wegen naar dit veld: kies tussenveld { target, options }
//                    of stap voor stap: kies de volgende sprong   { target: null, step: true, options }
//   'play'           zet uitvoeren                              { move }
export function tap(game, selection, sq, moves = legalMoves(game)) {
  const sel = selection || emptySelection();

  // In route-modus: het kind kiest de tussenvelden.
  if (sel.route) {
    const { target, typed, moves: routeMoves } = sel.route;
    const step = typed.length + 1;
    const narrowed = routeMoves.filter((m) => m.path[step] === sq);
    if (narrowed.length > 0) {
      // Klaar als er nog maar één weg over is (bij een bekend eindveld), of
      // als het kind stap voor stap op het eindveld is aangekomen.
      const finished = narrowed.filter((m) => m.path.length === step + 1);
      if (target != null && narrowed.length === 1) return play(narrowed[0]);
      if (target == null && finished.length > 0) return play(finished[0]);
      return toRoute(sel.from, { target, typed: typed.concat(sq), moves: narrowed });
    }
    // Stap voor stap, maar nu meteen op een (later) eindveld getikt.
    if (target == null) {
      const ending = routeMoves.filter((m) => m.to === sq && m.path.length - 1 > typed.length);
      if (ending.length === 1) return play(ending[0]);
      if (ending.length > 1) return toRoute(sel.from, { target: sq, typed, moves: ending });
    }
    // Ander eigen stuk aangetikt? Dan stoppen we de route en kiezen dat stuk.
    if (colorOf(game.board[sq]) === game.turn) return tap(game, emptySelection(), sq, moves);
    return {
      selection: sel,
      result: { type: 'invalid-target', options: routeOptions(sel.route) },
    };
  }

  const piece = game.board[sq];

  if (colorOf(piece) === game.turn) {
    if (sel.from === sq) return { selection: emptySelection(), result: { type: 'deselect' } };
    const own = moves.filter((m) => m.from === sq);
    if (own.length > 0) {
      return { selection: { from: sq, route: null }, result: { type: 'select', from: sq } };
    }
    return { selection: sel, result: { type: 'blocked', from: sq, ...blockedReason(game, sq, moves) } };
  }

  if (sel.from == null) {
    return {
      selection: sel,
      result: { type: piece && piece !== '.' ? 'opponent' : 'empty' },
    };
  }

  const ending = moves.filter((m) => m.from === sel.from && m.to === sq);
  if (ending.length === 1) return play(ending[0]);
  if (ending.length > 1) return toRoute(sel.from, { target: sq, typed: [], moves: ending });
  // Stap voor stap: het kind tikt het veld na de eerste sprong van een meerslag.
  const firstHop = moves.filter((m) => m.from === sel.from && m.path.length > 2 && m.path[1] === sq);
  if (firstHop.length > 0) return toRoute(sel.from, { target: null, typed: [sq], moves: firstHop });
  if (piece && piece !== '.') return { selection: sel, result: { type: 'opponent' } };
  return { selection: sel, result: { type: 'invalid-target' } };
}

function play(move) {
  return { selection: emptySelection(), result: { type: 'play', move } };
}

function toRoute(from, route) {
  const result = { type: 'route', target: route.target, options: routeOptions(route) };
  if (route.target == null) result.step = true;
  return { selection: { from, route }, result };
}

// Waarom mag dit eigen stuk niet? Bij "meerslag gaat voor" kan het stuk soms
// wél slaan, alleen minder stukken dan een ander. Dat zeggen we er dan bij.
function blockedReason(game, sq, moves) {
  if (moves.length === 0 || moves[0].captures.length === 0) return { reason: 'geen-zet' };
  const best = moves[0].captures.length;
  if (game.options.meerslagGaatVoor) {
    const own = captureMoves(game.board, game.size, game.turn, { ...game.options, meerslagGaatVoor: false })
      .filter((m) => m.from === sq);
    if (own.length > 0) {
      const count = Math.max(...own.map((m) => m.captures.length));
      return { reason: 'minder-slaan', count, best };
    }
  }
  return { reason: 'moet-slaan' };
}

// Welke velden kan het kind in route-modus als volgende tussenveld kiezen?
export function routeOptions(route) {
  const step = route.typed.length + 1;
  return [...new Set(route.moves.map((m) => m.path[step]))];
}

// Wat moet het bord laten oplichten?
//   movable:   stukken die mogen zetten
//   mustCapture: stukken die moeten slaan (leeg als er geen slagplicht is)
//   targets:   velden met een groene stip
//   route:     al gekozen tussenvelden (route-modus)
export function highlights(game, selection, moves = legalMoves(game)) {
  const sel = selection || emptySelection();
  const movable = [...new Set(moves.map((m) => m.from))];
  const capturing = moves.some((m) => m.captures.length > 0) && game.options.slagplicht;
  const mustCapture = capturing ? movable : [];
  let targets = [];
  let route = [];
  if (sel.route) {
    targets = routeOptions(sel.route);
    route = sel.route.typed.slice();
  } else if (sel.from != null) {
    targets = [...new Set(moves.filter((m) => m.from === sel.from).map((m) => m.to))];
  }
  return { movable, mustCapture, selected: sel.from, targets, route, routeTarget: sel.route ? sel.route.target : null };
}
