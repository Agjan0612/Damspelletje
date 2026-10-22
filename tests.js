// tests.js — testposities voor rules.js.
//
// Werkt in de browser (tests.html) én in Node (`npm test`).
// Velden: 10x10-nummering 1–50, linksboven naar rechtsonder.
//
//   rij 0:  .  1  .  2  .  3  .  4  .  5
//   rij 1:  6  .  7  .  8  .  9  . 10  .
//   rij 2:  . 11  . 12  . 13  . 14  . 15
//   rij 3: 16  . 17  . 18  . 19  . 20  .
//   rij 4:  . 21  . 22  . 23  . 24  . 25
//   rij 5: 26  . 27  . 28  . 29  . 30  .
//   rij 6:  . 31  . 32  . 33  . 34  . 35
//   rij 7: 36  . 37  . 38  . 39  . 40  .
//   rij 8:  . 41  . 42  . 43  . 44  . 45
//   rij 9: 46  . 47  . 48  . 49  . 50  .

import {
  createGame,
  legalMoves,
  captureMoves,
  play,
  gameStatus,
  getGeometry,
  toFen,
  parseFen,
  endgameLimit,
  findMoves,
  moveToString,
  moveToLongString,
  perft,
  isKing,
} from './rules.js';
import { tap, emptySelection, highlights } from './input.js';
import { LESSONS } from './lessons.js';
import {
  startExercise,
  onMove,
  onPick,
  nextHint,
  canHint,
  currentHint,
  solutionMove,
  pickTargets,
  solve,
  stars,
  lessonStars,
} from './lesson-engine.js';

// ---------------------------------------------------------------------------
// Mini-testraamwerk
// ---------------------------------------------------------------------------

const tests = [];
const info = [];

function test(group, name, fn) {
  tests.push({ group, name, fn });
}

class AssertionError extends Error {}

function assert(cond, message) {
  if (!cond) throw new AssertionError(message || 'Voorwaarde klopt niet');
}

function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new AssertionError(`${message ? message + ': ' : ''}verwacht ${e}, maar kreeg ${a}`);
  }
}

// ---------------------------------------------------------------------------
// Hulpjes
// ---------------------------------------------------------------------------

const game = (fen, size = 10, options = {}) => createGame({ fen, size, options });

const moveList = (g) => legalMoves(g).map(moveToString).sort();

const sortedCaptures = (m) => [...m.captures].sort((a, b) => a - b);

function playMove(g, notation) {
  const [from, to] = notation.split(/[-x]/).map(Number);
  const found = findMoves(g, from, to);
  assert(found.length === 1, `zet ${notation} niet (eenduidig) gevonden; legaal: ${moveList(g).join(' ')}`);
  return play(g, found[0]);
}

// Kiest een "stille" zet (geen slag) waarna de tegenstander niets kan slaan
// en die een nog niet eerder geziene stand oplevert. Voor de remise-tests.
function quietMove(g, filter = () => true) {
  for (const m of legalMoves(g)) {
    if (m.captures.length > 0 || !filter(m, g)) continue;
    const next = play(g, m);
    if (captureMoves(next.board, next.size, next.turn, next.options).length > 0) continue;
    const key = next.history[next.history.length - 1];
    if (next.history.filter((k) => k === key).length > 1) continue;
    return next;
  }
  throw new AssertionError('Geen veilige stille zet gevonden (testopzet klopt niet)');
}

const onlyKings = (m, g) => isKing(g.board[m.from]);

// ---------------------------------------------------------------------------
// 1. Bord en beginstand (FMJD art. 2)
// ---------------------------------------------------------------------------

test('Bord', '10x10: veld 1 linksboven op rij 0, veld 50 rechtsonder', () => {
  const geo = getGeometry(10);
  assertEqual(geo.count, 50);
  assertEqual(geo.coords[1], { row: 0, col: 1 });
  assertEqual(geo.coords[5], { row: 0, col: 9 });
  assertEqual(geo.coords[6], { row: 1, col: 0 });
  assertEqual(geo.coords[50], { row: 9, col: 8 });
});

test('Bord', 'Linksonder is een donker veld voor wit én voor zwart (6, 8 en 10)', () => {
  for (const size of [6, 8, 10]) {
    const geo = getGeometry(size);
    assert(geo.squareAt[size - 1][0] > 0, `${size}x${size}: linksonder (wit) is niet donker`);
    assert(geo.squareAt[0][size - 1] > 0, `${size}x${size}: linksonder voor zwart is niet donker`);
  }
});

test('Bord', 'Aantal donkere velden: 18 (6x6), 32 (8x8), 50 (10x10)', () => {
  assertEqual(getGeometry(6).count, 18);
  assertEqual(getGeometry(8).count, 32);
  assertEqual(getGeometry(10).count, 50);
});

test('Bord', 'Beginstand 10x10: zwart 1–20, wit 31–50, wit aan zet', () => {
  const g = createGame({ size: 10 });
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i).join(',');
  assertEqual(toFen(g), `W:W${range(31, 50)}:B${range(1, 20)}`);
});

test('Bord', 'Beginstand 8x8: 12 schijven per speler op 3 rijen', () => {
  const g = createGame({ size: 8 });
  assertEqual(g.board.filter((p) => p === 'w').length, 12);
  assertEqual(g.board.filter((p) => p === 'b').length, 12);
  assertEqual(g.board.slice(13, 21).every((p) => p === '.'), true, 'velden 13–20 leeg');
});

test('Bord', 'Beginstand 6x6: 6 schijven per speler op 2 rijen', () => {
  const g = createGame({ size: 6 });
  assertEqual(toFen(g), 'W:W13,14,15,16,17,18:B1,2,3,4,5,6');
});

test('Bord', 'Bordgrootte 7 wordt geweigerd', () => {
  let threw = false;
  try {
    getGeometry(7);
  } catch {
    threw = true;
  }
  assert(threw, 'verwachtte een foutmelding');
});

// ---------------------------------------------------------------------------
// 2. De schijf (art. 3.4)
// ---------------------------------------------------------------------------

test('Schijf', 'Beginstand 10x10: wit heeft precies 9 zetten', () => {
  assertEqual(moveList(createGame({ size: 10 })), [
    '31-26', '31-27', '32-27', '32-28', '33-28', '33-29', '34-29', '34-30', '35-30',
  ]);
});

test('Schijf', 'Beginstand 8x8: wit heeft 7 zetten', () => {
  assertEqual(legalMoves(createGame({ size: 8 })).length, 7);
});

test('Schijf', 'Beginstand 6x6: wit heeft 5 zetten', () => {
  assertEqual(moveList(createGame({ size: 6 })), ['13-10', '13-11', '14-11', '14-12', '15-12']);
});

test('Schijf', 'Witte schijf zet één veld schuin vooruit', () => {
  assertEqual(moveList(game('W:W28:B3')), ['28-22', '28-23']);
});

test('Schijf', 'Zwarte schijf zet één veld schuin vooruit (naar beneden)', () => {
  assertEqual(moveList(game('B:W48:B23')), ['23-28', '23-29']);
});

test('Schijf', 'Schijf zet niet achteruit', () => {
  assertEqual(moveList(game('W:W23:B1')), ['23-18', '23-19']);
});

test('Schijf', 'Schijf aan de rand heeft maar één zet', () => {
  assertEqual(moveList(game('W:W36:B1')), ['36-31']);
});

test('Schijf', 'Schijf kan niet naar een bezet veld', () => {
  assertEqual(moveList(game('W:W32,27:B1')), ['27-21', '27-22', '32-28']);
});

// ---------------------------------------------------------------------------
// 3. Dam halen (art. 3.5, 4.15)
// ---------------------------------------------------------------------------

test('Dam halen', 'Witte schijf op de overkant wordt dam', () => {
  const g = game('W:W7:B50');
  assert(legalMoves(g).every((m) => m.promotes), 'beide zetten moeten promoveren');
  const next = playMove(g, '7-1');
  assertEqual(next.board[1], 'W');
});

test('Dam halen', 'Zwarte schijf op rij 10 wordt dam', () => {
  const next = playMove(game('B:W6:B42'), '42-47');
  assertEqual(next.board[47], 'B');
});

test('Dam halen', 'Slag die op de damlijn EINDIGT maakt een dam', () => {
  const g = game('W:W12:B7');
  assertEqual(moveList(g), ['12x1']);
  assertEqual(play(g, legalMoves(g)[0]).board[1], 'W');
});

test('Dam halen', 'Schijf die tijdens de slag over de damlijn gaat maar elders eindigt, blijft schijf (4.15)', () => {
  // 13 slaat 8 (landt op 2, de damlijn) en slaat dan 7, eindigt op 11.
  const g = game('W:W13:B8,7');
  const moves = legalMoves(g);
  assertEqual(moves.map(moveToLongString), ['13x2x11']);
  assertEqual(moves[0].promotes, false);
  assertEqual(play(g, moves[0]).board[11], 'w');
});

test('Dam halen', 'Optie damHalen:false: schijf blijft schijf op de overkant', () => {
  const g = game('W:W7:B50', 10, { damHalen: false });
  assertEqual(playMove(g, '7-1').board[1], 'w');
});

// ---------------------------------------------------------------------------
// 4. De vliegende dam (art. 3.9)
// ---------------------------------------------------------------------------

test('Dam', 'Dam in de hoek beweegt over de hele lange diagonaal', () => {
  assertEqual(moveList(game('W:WK46:B15')).length, 9); // 41,37,32,28,23,19,14,10,5
});

test('Dam', 'Dam in het midden beweegt in alle vier richtingen', () => {
  // K28: linksboven 22,17,11,6 · rechtsboven 23,19,14,10,5 · linksonder 32,37,41,46 · rechtsonder 33,39,44,50
  assertEqual(legalMoves(game('W:WK28:B15')).length, 17);
});

test('Dam', 'Dam stopt voor een eigen stuk', () => {
  assertEqual(moveList(game('W:WK46,32:B5')).filter((m) => m.startsWith('46')), ['46-37', '46-41']);
});

// ---------------------------------------------------------------------------
// 5. Slaan en slagplicht (art. 4.1, 4.2)
// ---------------------------------------------------------------------------

test('Slaan', 'Slaan is verplicht: andere stukken mogen niet zetten', () => {
  assertEqual(moveList(game('W:W32,45:B27')), ['32x21']);
});

test('Slaan', 'Schijf slaat ook achteruit', () => {
  assertEqual(moveList(game('W:W23:B28')), ['23x32']);
});

test('Slaan', 'Optie schijfSlaatAchteruit:false: geen achterwaartse slag', () => {
  assertEqual(moveList(game('W:W23:B28', 10, { schijfSlaatAchteruit: false })), ['23-18', '23-19']);
});

test('Slaan', 'Geen slag als het veld achter het stuk bezet is', () => {
  assertEqual(moveList(game('W:W32:B27,21')), ['32-28']);
});

test('Slaan', 'Eigen stukken sla je niet', () => {
  assertEqual(legalMoves(game('W:W32,27:B1')).some((m) => m.captures.length > 0), false);
});

test('Slaan', 'Optie slagplicht:false: slaan en gewone zetten mogen allebei', () => {
  assertEqual(moveList(game('W:W32,45:B27', 10, { slagplicht: false })), ['32-28', '32x21', '45-40']);
});

test('Slaan', 'Zwart slaat ook (vooruit = omlaag)', () => {
  assertEqual(moveList(game('B:W28:B22')), ['22x33']);
});

// ---------------------------------------------------------------------------
// 6. Meerslag en meerderheidsregel (art. 4.5, 4.13, 4.14)
// ---------------------------------------------------------------------------

test('Meerslag', 'Schijf slaat door: 32x21x12', () => {
  const moves = legalMoves(game('W:W32:B27,17'));
  assertEqual(moves.map(moveToLongString), ['32x21x12']);
  assertEqual(moves[0].captures, [27, 17]);
});

test('Meerslag', 'Halverwege stoppen mag niet', () => {
  assertEqual(moveList(game('W:W32:B27,17')), ['32x12']); // niet 32x21
});

test('Meerslag', 'Meerslag gaat voor: 2 stukken slaan gaat voor 1', () => {
  assertEqual(moveList(game('W:W32,39:B27,17,33')), ['32x12']);
});

test('Meerslag', 'Dam telt NIET zwaarder: 2 schijven gaat voor 1 dam', () => {
  assertEqual(moveList(game('W:W32,39:B27,17,K33')), ['32x12']);
});

test('Meerslag', 'Gelijk aantal (1 schijf of 1 dam): vrije keus', () => {
  assertEqual(moveList(game('W:W32,39:B27,K33')), ['32x21', '39x28']);
});

test('Meerslag', 'Met een dam slaan geeft geen voorrang: alleen het aantal telt', () => {
  // Dam 46 kan 2 slaan (37 en 18), schijf 39 kan 1 slaan (33): de dam moet.
  assertEqual(moveList(game('W:WK46,39:B37,18,33')), ['46x1', '46x12', '46x7']);
});

test('Meerslag', 'Optie meerslagGaatVoor:false: ook de kleinere slag mag', () => {
  assertEqual(moveList(game('W:W32,39:B27,17,33', 10, { meerslagGaatVoor: false })), ['32x12', '39x28']);
});

test('Meerslag', 'Rondslag: leeg veld (ook het beginveld) mag je opnieuw passeren', () => {
  // 32 slaat 27, 17, 18, 28 en komt terug op 32. Twee routes, dezelfde zet.
  const moves = legalMoves(game('W:W32:B27,17,18,28'));
  assertEqual(moves.length, 1);
  assertEqual(moves[0].to, 32);
  assertEqual(sortedCaptures(moves[0]), [17, 18, 27, 28]);
});

test('Meerslag', 'Hetzelfde stuk mag niet twee keer geslagen worden (4.8)', () => {
  // Na de rondslag staat 32 weer naast 27, maar 27 is al geslagen.
  const moves = legalMoves(game('W:W32:B27,17,18,28'));
  assertEqual(moves[0].captures.length, 4);
});

// ---------------------------------------------------------------------------
// 7. Slaan met de dam (art. 4.3, 4.6, 4.7)
// ---------------------------------------------------------------------------

test('Damslag', 'Dam slaat op afstand en mag op elk vrij veld erachter landen', () => {
  assertEqual(moveList(game('W:WK46:B37')), ['46x10', '46x14', '46x19', '46x23', '46x28', '46x32', '46x5']);
});

test('Damslag', 'Dam moet landen op het veld van waaruit hij verder kan slaan (hoekje om)', () => {
  // Alleen landen op 23 geeft een tweede slag (over 18).
  const moves = legalMoves(game('W:WK46:B37,18'));
  assertEqual(moves.map(moveToString).sort(), ['46x1', '46x12', '46x7']);
  for (const m of moves) {
    assertEqual(m.path[1], 23, 'tussenlanding');
    assertEqual(m.captures, [37, 18]);
  }
});

test('Damslag', 'Dam springt niet over twee stukken tegelijk', () => {
  assertEqual(moveList(game('W:WK46:B37,32')), ['46-41']);
});

test('Damslag', 'Dam springt niet over een eigen stuk', () => {
  const g = game('W:WK46,37:B28');
  assertEqual(legalMoves(g).some((m) => m.captures.length > 0), false);
  assertEqual(moveList(g), ['37-31', '37-32', '46-41']);
});

test('Damslag', 'Damslag wordt nooit een dam-promotie', () => {
  assert(legalMoves(game('W:WK46:B37')).every((m) => !m.promotes));
});

// ---------------------------------------------------------------------------
// 8. Turkse slag (art. 4.11): geslagen stukken pas aan het eind weg
// ---------------------------------------------------------------------------

test('Turkse slag', 'Geslagen stuk blokkeert nog tijdens de slag', () => {
  // Dam 44 slaat 33, 12 en 19 en staat dan op 24. Vanaf 24 zou hij via 29
  // over 38 kunnen slaan, MAAR het al geslagen stuk op 33 staat nog in de weg.
  // Een programma dat stukken te vroeg weghaalt, vindt hier 4 stukken.
  const moves = legalMoves(game('W:WK44:B33,12,19,38'));
  assertEqual(moves.map(moveToString).sort(), ['44x24', '44x30', '44x35']);
  for (const m of moves) {
    assertEqual(sortedCaptures(m), [12, 19, 33]);
    assertEqual(m.path.slice(0, 3), [44, 17, 8], 'route via 17 en 8');
  }
});

test('Turkse slag', 'Geslagen stukken staan tijdens het zoeken nog op het bord, daarna niet meer', () => {
  const g = game('W:WK44:B33,12,19,38');
  const next = play(g, legalMoves(g)[0]);
  assertEqual(toFen(next), `B:WK${legalMoves(g)[0].to}:B38`);
});

// ---------------------------------------------------------------------------
// 9. Einde van de partij (art. 7.2)
// ---------------------------------------------------------------------------

test('Einde', 'Geen stukken meer = verloren', () => {
  assertEqual(gameStatus(game('W:W:B1')), { over: true, winner: 'b', reason: 'geen-stukken' });
});

test('Einde', 'Vaststaan (geen zet mogelijk) = verloren', () => {
  assertEqual(gameStatus(game('W:W46:B41,37')), { over: true, winner: 'b', reason: 'geen-zetten' });
});

test('Einde', 'Laatste stuk slaan wint de partij', () => {
  const next = playMove(game('W:W32:B27'), '32x21');
  assertEqual(gameStatus(next), { over: true, winner: 'w', reason: 'geen-stukken' });
});

test('Einde', 'Beginstand: partij is niet afgelopen', () => {
  assertEqual(gameStatus(createGame()).over, false);
});

// ---------------------------------------------------------------------------
// 10. Remise (art. 6)
// ---------------------------------------------------------------------------

test('Remise', 'Driemaal dezelfde stand met dezelfde speler aan zet', () => {
  let g = game('W:WK49,45:BK2,6');
  const cycle = ['49-44', '2-7', '44-49', '7-2'];
  const seq = [...cycle, ...cycle];
  seq.forEach((mv, i) => {
    assertEqual(gameStatus(g).over, false, `na ${i} halve zetten`);
    g = playMove(g, mv);
  });
  assertEqual(gameStatus(g), { over: true, winner: null, reason: 'herhaling' });
});

test('Remise', '25-zettenregel: 25 zetten per speler alleen met dammen', () => {
  let g = game('W:WK46,K50,36:BK1,K5,15');
  for (let i = 0; i < 49; i++) {
    g = quietMove(g, onlyKings);
    assertEqual(gameStatus(g).over, false, `na ${i + 1} halve zetten`);
  }
  g = quietMove(g, onlyKings);
  assertEqual(g.kingOnlyPlies, 50);
  assertEqual(gameStatus(g), { over: true, winner: null, reason: '25-zetten' });
});

test('Remise', '25-zettenregel: teller begint opnieuw na een schijfzet', () => {
  let g = game('W:WK46,K50,36:BK1,K5,15');
  g = quietMove(g, onlyKings);
  g = quietMove(g, onlyKings);
  assertEqual(g.kingOnlyPlies, 2);
  g = playMove(g, '36-31');
  assertEqual(g.kingOnlyPlies, 0);
});

test('Remise', '16-zettenregel: 3 dammen tegen 1 dam', () => {
  let g = game('W:WK47,K48,K49:BK3');
  assertEqual(g.endgame, { limit: 16, plies: 0 });
  for (let i = 0; i < 31; i++) {
    g = quietMove(g);
    assertEqual(gameStatus(g).over, false, `na ${i + 1} halve zetten`);
  }
  g = quietMove(g);
  assertEqual(gameStatus(g), { over: true, winner: null, reason: '16-zetten' });
});

test('Remise', '5-zettenregel: 1 dam tegen 1 dam', () => {
  let g = game('W:WK47:BK4');
  assertEqual(g.endgame, { limit: 5, plies: 0 });
  for (let i = 0; i < 9; i++) {
    g = quietMove(g);
    assertEqual(gameStatus(g).over, false, `na ${i + 1} halve zetten`);
  }
  g = quietMove(g);
  assertEqual(gameStatus(g), { over: true, winner: null, reason: '5-zetten' });
});

test('Remise', '16- en 5-zettenregel tellen niet op: na een slag begint de 5-teller bij 0', () => {
  let g = game('B:WK41,K1,K50:BK46');
  g = { ...g, endgame: { limit: 16, plies: 20 } }; // al 10 zetten per speler gespeeld
  const safe = legalMoves(g).find((m) => {
    const n = play(g, m);
    return captureMoves(n.board, n.size, n.turn, n.options).length === 0;
  });
  assert(safe, 'testopzet: geen veilige slag voor zwart');
  g = play(g, safe);
  assertEqual(g.endgame, { limit: 5, plies: 0 });
  for (let i = 0; i < 9; i++) {
    g = quietMove(g);
    assertEqual(gameStatus(g).over, false, `na ${i + 1} halve zetten`);
  }
  g = quietMove(g);
  assertEqual(gameStatus(g).reason, '5-zetten');
});

test('Remise', 'Welke eindspellen vallen onder de 16- of 5-zettenregel', () => {
  const lim = (fen) => endgameLimit(parseFen(fen).board);
  assertEqual(lim('W:WK1,K2,K3:BK50'), 16);
  assertEqual(lim('W:WK1,K2,30:BK50'), 16);
  assertEqual(lim('W:WK1,29,30:BK50'), 16);
  assertEqual(lim('B:WK50:BK1,K2,K3'), 16, 'ook voor zwart');
  assertEqual(lim('W:WK1,K2:BK50'), 5);
  assertEqual(lim('W:WK1,30:BK50'), 5);
  assertEqual(lim('W:WK1:BK50'), 5);
  assertEqual(lim('W:W28,29,30:BK50'), null, '3 schijven zonder dam');
  assertEqual(lim('W:WK1,K2,K3,K4:BK50'), null, '4 stukken');
  assertEqual(lim('W:WK1,K2,K3:BK50,10'), null, 'dam + schijf aan de andere kant');
});

// ---------------------------------------------------------------------------
// 11. Notatie, hulpjes en onveranderlijkheid
// ---------------------------------------------------------------------------

test('Hulpjes', 'FEN heen en terug', () => {
  const fen = 'B:WK10,31:B1,K45';
  assertEqual(toFen(game(fen)), fen);
});

test('Hulpjes', 'FEN met reeksen (31-35)', () => {
  assertEqual(toFen(game('W:W31-33:B1-2')), 'W:W31,32,33:B1,2');
});

test('Hulpjes', 'Een zet spelen verandert de oude stand niet (terugzetten kan altijd)', () => {
  const g = createGame();
  const before = toFen(g);
  play(g, legalMoves(g)[0]);
  assertEqual(toFen(g), before);
});

test('Hulpjes', 'Spelen wisselt de beurt', () => {
  assertEqual(playMove(createGame(), '32-28').turn, 'b');
});

test('Hulpjes', 'Perft vanaf de beginstand: 9 en 81 (met de hand na te rekenen)', () => {
  const g = createGame();
  assertEqual(perft(g, 1), 9);
  assertEqual(perft(g, 2), 81); // 9 x 9: na 1 zet kan nog niemand slaan
  for (const d of [3, 4, 5]) info.push(`perft 10x10 diepte ${d}: ${perft(g, d)}`);
  for (const d of [3, 4, 5]) info.push(`perft 8x8 diepte ${d}: ${perft(createGame({ size: 8 }), d)}`);
});

// ---------------------------------------------------------------------------
// 12. Tikken op het bord (input.js)
// ---------------------------------------------------------------------------

test('Tikken', 'Tik op eigen stuk selecteert, doelvelden lichten op', () => {
  const g = createGame();
  const { selection, result } = tap(g, emptySelection(), 32);
  assertEqual(result, { type: 'select', from: 32 });
  assertEqual(highlights(g, selection).targets.sort(), [27, 28]);
});

test('Tikken', 'Tik op doelveld speelt de zet', () => {
  const g = createGame();
  let { selection } = tap(g, emptySelection(), 32);
  const { result } = tap(g, selection, 28);
  assertEqual(result.type, 'play');
  assertEqual(moveToString(result.move), '32-28');
});

test('Tikken', 'Nog eens tikken op hetzelfde stuk heft de selectie op', () => {
  const g = createGame();
  const { selection } = tap(g, emptySelection(), 32);
  assertEqual(tap(g, selection, 32).result.type, 'deselect');
});

test('Tikken', 'Ander eigen stuk aantikken wisselt de selectie', () => {
  const g = createGame();
  const { selection } = tap(g, emptySelection(), 32);
  assertEqual(tap(g, selection, 33).result, { type: 'select', from: 33 });
});

test('Tikken', 'Stuk dat niet kan zetten: "geen-zet"', () => {
  assertEqual(tap(createGame(), emptySelection(), 45).result, { type: 'blocked', from: 45, reason: 'geen-zet' });
});

test('Tikken', 'Bij slagplicht: ander stuk geeft "moet-slaan"', () => {
  const g = game('W:W32,45:B27');
  assertEqual(tap(g, emptySelection(), 45).result.reason, 'moet-slaan');
  assertEqual(highlights(g, emptySelection()).mustCapture, [32]);
});

test('Tikken', 'Zonder slagplicht pulseert er niets', () => {
  assertEqual(highlights(createGame(), emptySelection()).mustCapture, []);
});

test('Tikken', 'Stuk van de tegenstander aantikken', () => {
  assertEqual(tap(createGame(), emptySelection(), 18).result.type, 'opponent');
});

test('Tikken', 'Verkeerd doelveld: selectie blijft staan', () => {
  const g = createGame();
  const { selection } = tap(g, emptySelection(), 32);
  const r = tap(g, selection, 26);
  assertEqual(r.result.type, 'invalid-target');
  assertEqual(r.selection.from, 32);
});

test('Tikken', 'Meerslag: tik meteen op het eindveld', () => {
  const g = game('W:W32:B27,17');
  const { selection } = tap(g, emptySelection(), 32);
  assertEqual(highlights(g, selection).targets, [12]);
  assertEqual(moveToLongString(tap(g, selection, 12).result.move), '32x21x12');
});

test('Tikken', 'Twee wegen naar hetzelfde veld: kies het tussenveld', () => {
  // Dam 2 kan op 31 eindigen via 24 en 42 (slaat 19, 33, 37)
  // of via 30 en 48 (slaat 19, 43, 37).
  const g = game('W:WK2:B19,43,37,33');
  let { selection } = tap(g, emptySelection(), 2);
  let r = tap(g, selection, 31);
  assertEqual(r.result.type, 'route');
  assertEqual(r.result.options.sort(), [24, 30]);
  r = tap(g, r.selection, 30);
  assertEqual(r.result.type, 'play');
  assertEqual(moveToLongString(r.result.move), '2x30x48x31');
  assertEqual(sortedCaptures(r.result.move), [19, 37, 43]);
});

test('Tikken', 'Route-modus: verkeerd tussenveld laat de keuze staan', () => {
  const g = game('W:WK2:B19,43,37,33');
  let { selection } = tap(g, emptySelection(), 2);
  const r1 = tap(g, selection, 31);
  const r2 = tap(g, r1.selection, 13);
  assertEqual(r2.result.type, 'invalid-target');
  assertEqual(highlights(g, r2.selection).targets.sort(), [24, 30]);
});

// ---------------------------------------------------------------------------
// 13. Lessen (lessons.js) — elke opdracht moet kloppen en oplosbaar zijn
// ---------------------------------------------------------------------------

const exMove = (state, notation) => {
  const [from, to] = notation.split(/[-x]/).map(Number);
  const m = legalMoves(state.game).find((x) => x.from === from && x.to === to);
  assert(m, `zet ${notation} is niet legaal`);
  return onMove(state, m);
};

// Alle zetreeksen tot `depth` diep (voor kleine standen).
function allLines(g, depth, visit) {
  if (depth === 0) return;
  for (const m of legalMoves(g)) {
    visit(m, g);
    allLines(play(g, m), depth - 1, visit);
  }
}

test('Lessen', 'Elke les heeft 3–6 opdrachten en eindigt met een eindopdracht', () => {
  const ids = new Set();
  for (const lesson of LESSONS) {
    assert(!ids.has(lesson.id), `dubbele les-id ${lesson.id}`);
    ids.add(lesson.id);
    const n = lesson.exercises.length;
    assert(n >= 3 && n <= 6, `${lesson.id}: ${n} opdrachten`);
    assert(lesson.exercises[n - 1].boss, `${lesson.id}: laatste opdracht is geen eindopdracht`);
    assertEqual(lesson.exercises.filter((e) => e.boss).length, 1, `${lesson.id}: aantal eindopdrachten`);
  }
});

test('Lessen', 'Elke opdracht heeft een geldige stand, tekst, tip en een oplosbaar doel', () => {
  LESSONS.forEach((lesson) => lesson.exercises.forEach((ex, i) => {
    const where = `${lesson.id} opdracht ${i + 1}`;
    assert(ex.text && ex.tip, `${where}: tekst of tip ontbreekt`);
    const st = startExercise(ex, i);
    if (ex.goal.type === 'pick') {
      const { set, count } = pickTargets(ex, st.game);
      const max = getGeometry(ex.size).count;
      assert(count > 0, `${where}: niets om aan te tikken`);
      assert(set.every((sq) => sq >= 1 && sq <= max), `${where}: veld bestaat niet`);
    } else if (ex.goal.type === 'turns') {
      assert(legalMoves(st.game).length > 0, `${where}: geen zet mogelijk`);
    } else {
      assert(solutionMove(st), `${where}: geen oplossing gevonden`);
    }
    if (ex.goal.type === 'reach') {
      assert(st.game.board[ex.goal.square] === '.', `${where}: de ster staat op een bezet veld`);
    }
    if (ex.demo) {
      assert(legalMoves(st.game).some((m) => moveToString(m) === ex.demo), `${where}: voorbeeldzet ${ex.demo} is niet legaal`);
    }
  }));
});

test('Lessen', 'Elke opdracht is echt helemaal op te lossen (zetten volgens de hint)', () => {
  LESSONS.forEach((lesson) => lesson.exercises.forEach((ex, i) => {
    const where = `${lesson.id} opdracht ${i + 1}`;
    let st = startExercise(ex, i);
    for (let step = 0; step < 20 && !st.done; step++) {
      if (ex.goal.type === 'pick') {
        const { set } = pickTargets(ex, st.game);
        const sq = set.find((x) => !st.picked.includes(x));
        st = onPick(st, { sq }).state;
      } else {
        const m = solutionMove(st);
        assert(m, `${where}: vastgelopen na ${step} zetten`);
        const out = onMove(st, m);
        assert(out.outcome.type === 'done' || out.outcome.type === 'continue', `${where}: hint-zet gaf "${out.outcome.type}"`);
        st = out.state;
      }
    }
    assert(st.done, `${where}: niet afgerond`);
  }));
});

test('Lessen', 'Vóór les "Slaan" kan er nergens geslagen worden', () => {
  const slaan = LESSONS.findIndex((l) => l.id === 'slaan');
  LESSONS.slice(0, slaan).forEach((lesson) => lesson.exercises.forEach((ex, i) => {
    const st = startExercise(ex, i);
    const depth = ex.goal.type === 'turns' ? ex.goal.count : 1;
    allLines(st.game, depth, (m) => {
      assert(m.captures.length === 0, `${lesson.id} opdracht ${i + 1}: slag ${moveToString(m)} mogelijk`);
    });
  }));
});

test('Lessen', 'In les 1–8 is er nog geen meerslag (die komt in les 9)', () => {
  LESSONS.forEach((lesson) => lesson.exercises.forEach((ex, i) => {
    const st = startExercise(ex, i);
    for (const m of legalMoves(st.game)) {
      assert(m.captures.length <= 1, `${lesson.id} opdracht ${i + 1}: meerslag ${moveToLongString(m)}`);
    }
  }));
});

test('Lessen', 'Slaan-opdrachten: er is precies één slag te vinden', () => {
  for (const id of ['slaan', 'verplicht', 'achteruit']) {
    const lesson = LESSONS.find((l) => l.id === id);
    lesson.exercises.forEach((ex, i) => {
      if (ex.goal.type !== 'capture') return;
      const caps = legalMoves(startExercise(ex, i).game).filter((m) => m.captures.length > 0);
      assertEqual(caps.length, 1, `${id} opdracht ${i + 1}`);
    });
  }
});

// ---------------------------------------------------------------------------
// 14. Lesmotor (lesson-engine.js)
// ---------------------------------------------------------------------------

const exercise = (id, n) => LESSONS.find((l) => l.id === id).exercises[n];

test('Lesmotor', 'Goede zet: opdracht gehaald met 3 sterren', () => {
  const out = exMove(startExercise(exercise('slaan', 0)), '14x7');
  assertEqual(out.outcome.type, 'done');
  assertEqual(stars(out.state), 3);
});

test('Lesmotor', 'Verkeerde zet: "Bijna!", stand blijft zoals hij was', () => {
  const ex = { size: 6, fen: 'W:W14:B', goal: { type: 'move', accept: ['14-11'] }, text: '', tip: '' };
  const st = startExercise(ex);
  const out = exMove(st, '14-12');
  assertEqual(out.outcome.type, 'retry');
  assert(out.outcome.message.startsWith('Bijna'), 'boodschap begint met Bijna');
  assertEqual(out.state.game, st.game);
  assertEqual(out.state.mistakes, 1);
});

test('Lesmotor', 'Naar de ster: verkeerde kant op = opnieuw beginnen', () => {
  let st = startExercise(exercise('schijf', 4)); // schijf 18 naar ster op 1
  let out = exMove(st, '18-15');
  assertEqual(out.outcome.type, 'continue');
  out = exMove(out.state, '15-12');
  assertEqual(out.outcome.type, 'continue');
  out = exMove(out.state, '12-9'); // vanaf 9 kom je nooit meer op 1
  assertEqual(out.outcome.type, 'reset');
  assertEqual(out.state.moveCount, 0);
  assertEqual(out.state.game, st.game);
});

test('Lesmotor', 'Bij "naar de ster" blijft wit aan zet (zwart doet niets)', () => {
  const out = exMove(startExercise(exercise('schijf', 3)), '17-14');
  assertEqual(out.state.game.turn, 'w');
});

test('Lesmotor', 'Dam halen in 2 zetten: verkeerde schijf = opnieuw', () => {
  const out = exMove(startExercise(exercise('dam', 2)), '14-11');
  assertEqual(out.outcome.type, 'reset');
});

test('Lesmotor', 'Dam halen: gehaald zodra de schijf dam wordt', () => {
  let out = exMove(startExercise(exercise('dam', 1)), '8-5');
  assertEqual(out.outcome.type, 'continue');
  out = exMove(out.state, '5-1');
  assertEqual(out.outcome.type, 'done');
  assertEqual(out.state.game.board[1], 'W');
});

test('Lesmotor', 'Om de beurt: na 2 zetten (wit en zwart) gehaald', () => {
  let out = exMove(startExercise(exercise('beurt', 2)), '14-11');
  assertEqual(out.outcome.type, 'continue');
  assertEqual(out.state.game.turn, 'b');
  out = exMove(out.state, '5-8');
  assertEqual(out.outcome.type, 'done');
});

test('Lesmotor', 'Aantikken: licht veld is "bijna", donker veld telt', () => {
  let st = startExercise(exercise('bord', 1)); // 3 donkere velden
  let out = onPick(st, { sq: null, row: 0, col: 0 });
  assertEqual(out.outcome.type, 'wrong');
  out = onPick(out.state, { sq: 4 });
  assertEqual(out.outcome, { type: 'picked', message: 'Goed zo! Nog 2.' });
  out = onPick(out.state, { sq: 4 });
  assertEqual(out.outcome.type, 'already');
  out = onPick(out.state, { sq: 5 });
  out = onPick(out.state, { sq: 6 });
  assertEqual(out.outcome.type, 'done');
});

test('Lesmotor', 'Aantikken: alle velden waar de dam heen mag (7 stuks)', () => {
  const ex = exercise('vliegen', 1);
  assertEqual(pickTargets(ex, startExercise(ex).game).set.sort((a, b) => a - b), [4, 8, 11, 15, 18, 22, 25]);
});

test('Lesmotor', 'Hints: tip, dan stuk oplichten, dan voordoen', () => {
  let st = startExercise(exercise('slaan', 1)); // 13x8
  st = nextHint(st).state;
  assertEqual(currentHint(st).glow, []);
  assert(currentHint(st).text, 'tip-tekst');
  st = nextHint(st).state;
  assertEqual(currentHint(st).glow, [13]);
  st = nextHint(st).state;
  assertEqual(currentHint(st), { text: currentHint(st).text, glow: [13], marks: [8] });
  assertEqual(canHint(st), false, 'na 3 hints is het op');
  assertEqual(stars(st), 1);
});

test('Lesmotor', 'Eindopdracht: hint pas na 2 keer "bijna"', () => {
  let st = startExercise(exercise('bord', 3));
  assertEqual(canHint(st), false);
  st = onPick(st, { sq: 1 }).state;
  st = onPick(st, { sq: 2 }).state;
  assertEqual(canHint(st), true);
});

test('Lesmotor', 'Sterren per les: gemiddelde, minstens 1', () => {
  assertEqual(lessonStars([3, 3, 3]), 3);
  assertEqual(lessonStars([3, 2, 2, 1]), 2);
  assertEqual(lessonStars([1, 1]), 1);
});

test('Lesmotor', 'Zoeken: kortste weg naar de ster in 2 zetten met een bocht', () => {
  const st = startExercise(exercise('vliegen', 4));
  assert(solve(st.game, { type: 'reach', square: 32 }, 2), 'in 2 zetten');
  assertEqual(solve(st.game, { type: 'reach', square: 32 }, 1), null, 'niet in 1 zet');
});

// ---------------------------------------------------------------------------
// Uitvoeren
// ---------------------------------------------------------------------------

export function runAllTests() {
  info.length = 0;
  const results = [];
  for (const t of tests) {
    try {
      t.fn();
      results.push({ group: t.group, name: t.name, ok: true });
    } catch (err) {
      results.push({ group: t.group, name: t.name, ok: false, error: err.message, stack: err.stack });
    }
  }
  return { results, info: info.slice() };
}
