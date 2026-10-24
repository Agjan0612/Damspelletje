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
  DEFAULT_OPTIONS,
} from './rules.js';
import { tap, emptySelection, highlights } from './input.js';
import { feedbackText } from './shared.js';
import { THEMES, ALL_PUZZLES, themeStatus, offerBreak } from './puzzles.js';
import {
  withBestStars,
  useStorage,
  loadProgress,
  loadComputer,
  saveComputer,
  saveComputerWin,
  saveLessonStars,
  savePuzzleStars,
  saveMiniGamePlayed,
  listProfiles,
  currentProfile,
  addProfile,
  updateProfile,
  switchProfile,
  removeProfile,
  freeAnimals,
  profileLabel,
  exportBackup,
  importBackup,
  backupFileName,
  MAX_PROFILES,
  NAME_MAX,
  ANIMALS,
  loadSettings,
} from './storage.js';
import { cleanForSpeech, chooseVoice, isRepeat, REPEAT_MS, SOUNDS } from './speech.js';
import {
  BADGES,
  badgeById,
  hasBadge,
  earnedBadges,
  newBadges,
  badgeHow,
  BOARD_THEMES,
  BOARD_COLOR_KEYS,
  boardThemeFor,
  themeUnlocked,
  themesUnlockedBy,
  boardThemeStyle,
} from './badges.js';
import { chooseMove, giveaway, moveCost, adaptLevel, clampLevel, LEVELS } from './ai.js';
import { LESSONS } from './lessons.js';
import { MINI_GAMES } from './minigames.js';
import {
  startExercise,
  onMove,
  onPick,
  nextHint,
  canHint,
  currentHint,
  solutionMove,
  pickTargets,
  captureCheck,
  goodFirstMoves,
  planWorks,
  drawAnswer,
  onChoice,
  CHOICES,
  isPlan,
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

test('Tikken', 'Stap voor stap: tik eerst het veld na de eerste sprong', () => {
  // 32x21x12: eerst 21 aantikken, dan verschijnt 12 als volgende stip.
  const g = game('W:W32:B27,17');
  let { selection } = tap(g, emptySelection(), 32);
  let r = tap(g, selection, 21);
  assertEqual(r.result, { type: 'route', target: null, options: [12], step: true });
  assertEqual(highlights(g, r.selection).targets, [12]);
  assertEqual(highlights(g, r.selection).route, [21]);
  r = tap(g, r.selection, 12);
  assertEqual(r.result.type, 'play');
  assertEqual(moveToLongString(r.result.move), '32x21x12');
});

test('Tikken', 'Stap voor stap: halverwege meteen het eindveld tikken mag ook', () => {
  const g = game('W:W32:B11,19,27', 8);
  let { selection } = tap(g, emptySelection(), 32);
  let r = tap(g, selection, 23);
  assertEqual(r.result.options, [16]);
  r = tap(g, r.selection, 7);
  assertEqual(r.result.type, 'play');
  assertEqual(moveToLongString(r.result.move), '32x23x16x7');
});

test('Tikken', 'Stap voor stap: verkeerd veld laat de sprong staan', () => {
  const g = game('W:W32:B11,19,27', 8);
  let { selection } = tap(g, emptySelection(), 32);
  const r1 = tap(g, selection, 23);
  const r2 = tap(g, r1.selection, 15);
  assertEqual(r2.result.type, 'invalid-target');
  assertEqual(r2.selection.route.typed, [23]);
});

test('Tikken', 'Stap voor stap met de dam: na de bocht kiezen waar hij landt', () => {
  // Dam 29 slaat 22, landt op 18, en slaat dan 14 (landt op 9 of 5).
  const g = game('W:WK29:B14,22', 8);
  let { selection } = tap(g, emptySelection(), 29);
  let r = tap(g, selection, 18);
  assertEqual(r.result.type, 'route');
  assertEqual(r.result.options.sort((a, b) => a - b), [5, 9]);
  r = tap(g, r.selection, 9);
  assertEqual(moveToLongString(r.result.move), '29x18x9');
});

test('Tikken', 'Meerslag gaat voor: stuk dat minder kan slaan krijgt uitleg', () => {
  // Schijf 25 kan 1 stuk slaan, schijf 31 kan er 2 slaan.
  const g = game('W:W25,31:B19,22,27', 8);
  const r = tap(g, emptySelection(), 25);
  assertEqual(r.result, { type: 'blocked', from: 25, reason: 'minder-slaan', count: 1, best: 2 });
  const text = feedbackText(r.result, g);
  assert(text.startsWith('Bijna!'), text);
  assert(text.includes('1 stuk') && text.includes('2 stukken') && text.includes('Meerslag gaat voor'), text);
  // Zonder de meerderheidsregel mag schijf 25 gewoon slaan.
  const free = game('W:W25,31:B19,22,27', 8, { meerslagGaatVoor: false });
  assertEqual(tap(free, emptySelection(), 25).result.type, 'select');
});

test('Tikken', 'Stap voor stap: Dammie zegt "spring verder"', () => {
  const text = feedbackText({ type: 'route', target: null, options: [12], step: true }, game('W:W32:B27,17'));
  assert(text.includes('Spring verder'), text);
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
    } else if (ex.goal.type === 'choice') {
      assert(drawAnswer(st.game) !== null, `${where}: het antwoord volgt niet uit de regels`);
    } else {
      assert(solutionMove(st), `${where}: geen oplossing gevonden`);
    }
    if (ex.goal.type === 'reach') {
      assert(st.game.board[ex.goal.square] === '.', `${where}: de ster staat op een bezet veld`);
    }
    for (const sq of ex.goal.land || []) {
      assert(st.game.board[sq] === '.', `${where}: de ster staat op een bezet veld`);
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
      } else if (ex.goal.type === 'choice') {
        st = onChoice(st, drawAnswer(st.game)).state;
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

const lessonIndex = (id) => {
  const i = LESSONS.findIndex((l) => l.id === id);
  assert(i >= 0, `les ${id} bestaat niet`);
  return i;
};
const lessonEx = (id) => LESSONS[lessonIndex(id)].exercises;

test('Lessen', 'In les 1–8 is er nog geen meerslag (die komt in les 9)', () => {
  LESSONS.slice(0, lessonIndex('meerslag')).forEach((lesson) => lesson.exercises.forEach((ex, i) => {
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

// Hoe vaak verandert een slag van richting? (een "bocht")
function bends(move, size) {
  const { coords } = getGeometry(size);
  const dirs = [];
  for (let i = 1; i < move.path.length; i++) {
    const a = coords[move.path[i - 1]];
    const b = coords[move.path[i]];
    dirs.push(`${Math.sign(b.row - a.row)},${Math.sign(b.col - a.col)}`);
  }
  return dirs.filter((d, i) => i > 0 && d !== dirs[i - 1]).length;
}

// Zo zou een dam slaan als geslagen stukken METEEN verdwenen (dat is fout,
// de Turkse slag zegt: pas aan het eind). Geeft het grootste aantal terug.
function naiveKingMax(board, size, from) {
  const geo = getGeometry(size);
  let best = 0;
  (function search(b, sq, n) {
    let any = false;
    for (const ray of geo.rays[sq]) {
      let i = 0;
      while (i < ray.length && b[ray[i]] === '.') i++;
      if (i >= ray.length || !'bB'.includes(b[ray[i]])) continue;
      for (let j = i + 1; j < ray.length && b[ray[j]] === '.'; j++) {
        any = true;
        const nb = b.slice();
        nb[ray[i]] = '.';
        nb[sq] = '.';
        nb[ray[j]] = 'W';
        search(nb, ray[j], n + 1);
      }
    }
    if (!any) best = Math.max(best, n);
  })(board, from, 0);
  return best;
}

const startCaptures = (ex) => {
  const g = startExercise(ex).game;
  return { g, legal: legalMoves(g).filter((m) => m.captures.length > 0) };
};

test('Lessen', 'Vóór les "Meerslag gaat voor" maakt de meerderheidsregel nog niets uit', () => {
  LESSONS.slice(0, lessonIndex('meerslag-voor')).forEach((lesson) => lesson.exercises.forEach((ex, i) => {
    const g = startExercise(ex, i).game;
    const all = captureMoves(g.board, g.size, g.turn, { ...g.options, meerslagGaatVoor: false });
    const legal = captureMoves(g.board, g.size, g.turn, g.options);
    assertEqual(legal.length, all.length, `${lesson.id} opdracht ${i + 1}`);
  }));
});

test('Lessen', 'Les "Meerslag": slagen van 2 en van 3 stukken, één ervan met zwart', () => {
  const counts = lessonEx('meerslag').map((ex) => {
    const { legal } = startCaptures(ex);
    assert(legal.length > 0, 'geen slag');
    return legal[0].captures.length;
  });
  assert(counts.includes(2) && counts.includes(3), `aantallen ${counts}`);
  assert(counts.every((n) => n >= 2), 'elke opdracht is een meerslag');
  assert(lessonEx('meerslag').some((ex) => ex.fen.startsWith('B')), 'zwart slaat ook een keer');
});

test('Lessen', 'Les "Slaan met de dam": de dam slaat 1 stuk, met keuze uit landingsvelden', () => {
  lessonEx('damslaan').forEach((ex, i) => {
    const { g, legal } = startCaptures(ex);
    assert(legal.length > 0, `opdracht ${i + 1}: geen slag`);
    assert(legal.every((m) => isKing(g.board[m.from]) && m.captures.length === 1), `opdracht ${i + 1}`);
    if (ex.goal.land) assert(legal.some((m) => !ex.goal.land.includes(m.to)), `opdracht ${i + 1}: ster is de enige keus`);
  });
});

test('Lessen', 'Les "Meerslag gaat voor": er is steeds een kortere slag die niet mag', () => {
  let kingCounted = false;
  lessonEx('meerslag-voor').forEach((ex, i) => {
    const { g } = startCaptures(ex);
    const legal = captureMoves(g.board, g.size, g.turn, g.options);
    const all = captureMoves(g.board, g.size, g.turn, { ...g.options, meerslagGaatVoor: false });
    const shorter = all.filter((m) => m.captures.length < legal[0].captures.length);
    assert(shorter.length > 0, `opdracht ${i + 1}: geen kortere slag`);
    if (shorter.some((m) => m.captures.some((sq) => isKing(g.board[sq])))) kingCounted = true;
  });
  assert(kingCounted, 'een opdracht laat zien dat een dam als 1 stuk telt');
});

test('Lessen', 'Les "Vrije keus": evenveel stukken, en de slimme slag is echt de enige slimme', () => {
  lessonEx('vrije-keus').forEach((ex, i) => {
    const { g, legal } = startCaptures(ex);
    const froms = new Set(legal.map((m) => m.from));
    assert(froms.size >= 2, `opdracht ${i + 1}: geen keus tussen twee stukken`);
    assertEqual(new Set(legal.map((m) => m.captures.length)).size, 1, `opdracht ${i + 1}: niet evenveel`);
    if (ex.goal.best) {
      const ok = legal.filter((m) => captureCheck(ex.goal, g, m) === 'ok');
      assert(ok.length > 0, `opdracht ${i + 1}: geen slimme slag`);
      assert(ok.length < legal.length, `opdracht ${i + 1}: elke slag is slim`);
    }
  });
});

test('Lessen', 'Les "Damslag met bocht": de dam slaat meer stukken en maakt een bocht', () => {
  lessonEx('dam-bocht').forEach((ex, i) => {
    const { g, legal } = startCaptures(ex);
    assert(legal.length > 0, `opdracht ${i + 1}: geen slag`);
    for (const m of legal) {
      assert(isKing(g.board[m.from]), `opdracht ${i + 1}: geen dam`);
      assert(m.captures.length >= 2 && bends(m, g.size) >= 1, `opdracht ${i + 1}: ${moveToLongString(m)}`);
    }
  });
});

test('Lessen', 'Les "Pas aan het eind": Turkse slag en dam halen pas op het eindveld', () => {
  let turkish = false;
  let passesOver = false;
  let promotes = false;
  lessonEx('turkse-slag').forEach((ex) => {
    const { g, legal } = startCaptures(ex);
    for (const m of legal) {
      const piece = g.board[m.from];
      if (isKing(piece) && naiveKingMax(g.board, g.size, m.from) > m.captures.length) turkish = true;
      if (!isKing(piece)) {
        const topRow = m.path.slice(1, -1).some((sq) => getGeometry(g.size).coords[sq].row === 0);
        if (topRow && !m.promotes) passesOver = true;
        if (m.promotes) promotes = true;
      }
    }
  });
  assert(turkish, 'een opdracht waarin de Turkse slag uitmaakt');
  assert(passesOver, 'een schijf die over de overkant springt maar geen dam wordt');
  assert(promotes, 'een slag die op de overkant eindigt en dam wordt');
});

test('Lessen', 'Turkse slag: bij "tik de geslagen stukken aan" slaat elke slag dezelfde stukken', () => {
  LESSONS.forEach((lesson) => lesson.exercises.forEach((ex, i) => {
    if (ex.goal.of !== 'captured') return;
    const { legal } = startCaptures(ex);
    const sets = new Set(legal.map((m) => sortedCaptures(m).join(',')));
    assertEqual(sets.size, 1, `${lesson.id} opdracht ${i + 1}`);
  }));
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

const playLong = (state, long) => {
  const m = legalMoves(state.game).find((x) => moveToLongString(x) === long);
  assert(m, `zet ${long} is niet legaal`);
  return onMove(state, m);
};

test('Lesmotor', 'Sla en land op de ster: ander landingsveld is "bijna"', () => {
  const st = startExercise(exercise('damslaan', 2));
  let out = playLong(st, '4x15');
  assertEqual(out.outcome.type, 'retry');
  assert(out.outcome.message.includes('ster'), out.outcome.message);
  assertEqual(out.state.game, st.game);
  out = playLong(out.state, '4x22');
  assertEqual(out.outcome.type, 'done');
});

test('Lesmotor', 'Vrije keus: slag zonder de dam mag, maar Dammie zegt "Bijna! ... slimmer"', () => {
  const st = startExercise(exercise('vrije-keus', 2));
  const out = playLong(st, '25x18x9');
  assertEqual(out.outcome.type, 'retry');
  assert(out.outcome.message.startsWith('Bijna!'), out.outcome.message);
  assertEqual(playLong(out.state, '31x24x15').outcome.type, 'done');
  assertEqual(moveToLongString(solutionMove(st)), '31x24x15', 'hint wijst de slimme slag aan');
});

test('Lesmotor', 'Vrije keus: veilige slag (zwart kan niet terugslaan)', () => {
  const st = startExercise(exercise('vrije-keus', 3));
  assertEqual(playLong(st, '25x18').outcome.type, 'retry');
  assertEqual(playLong(st, '31x24').outcome.type, 'done');
});

test('Lesmotor', 'Aantikken: de stukken die de dam slaat (Turkse slag)', () => {
  const ex = exercise('turkse-slag', 3);
  const { set } = pickTargets(ex, startExercise(ex).game);
  assertEqual(set.sort((a, b) => a - b), [10, 11, 23]);
  // Schijf 19 wordt niet geslagen: tikken is "bijna".
  assertEqual(onPick(startExercise(ex), { sq: 19 }).outcome.type, 'wrong');
});

// ---------------------------------------------------------------------------
// 15. Puzzels (puzzles.js) — elke puzzel moet kloppen, passen en oplosbaar zijn
// ---------------------------------------------------------------------------

const puzzleWhere = (p) => `puzzel ${p.puzzle.id}`;
const capKey = (m) => `${m.from}:${sortedCaptures(m).join(',')}`;
// Alle slagen in de beginstand, ook de slagen die door "meerslag gaat voor" niet mogen.
const allCaptures = (g) => captureMoves(g.board, g.size, g.turn, { ...g.options, meerslagGaatVoor: false });

test('Puzzels', '9 thema\'s met elk 6 puzzels, alle id\'s uniek', () => {
  assertEqual(THEMES.length, 9, 'aantal thema\'s');
  for (const t of THEMES) assertEqual(t.puzzles.length, 6, `thema ${t.id}`);
  assertEqual(ALL_PUZZLES.length, 54, 'aantal puzzels');
  const ids = ALL_PUZZLES.map((p) => p.puzzle.id).concat(THEMES.map((t) => `thema:${t.id}`));
  assertEqual(new Set(ids).size, ids.length, 'dubbele id');
});

test('Puzzels', 'Elk thema gaat open na een bestaande les, in de volgorde van de lessen', () => {
  let prev = -1;
  for (const t of THEMES) {
    const i = lessonIndex(t.unlock);
    assert(i >= prev, `thema ${t.id} komt te vroeg`);
    prev = i;
    assert(t.title && t.icon && t.text && t.tip, `thema ${t.id}: titel, icoon, tekst of tip ontbreekt`);
  }
});

test('Puzzels', 'Elke puzzel: geldige stand zoals in een echte partij, wit aan zet', () => {
  for (const p of ALL_PUZZLES) {
    const g = startExercise(p.ex).game;
    const { coords } = getGeometry(g.size);
    assertEqual(g.turn, 'w', `${puzzleWhere(p)}: wit aan zet`);
    assertEqual(p.ex.showMust, false, `${puzzleWhere(p)}: oranje ring hoort uit`);
    for (let sq = 1; sq < g.board.length; sq++) {
      if (g.board[sq] === 'w') assert(coords[sq].row !== 0, `${puzzleWhere(p)}: witte schijf op de overkant (veld ${sq})`);
      if (g.board[sq] === 'b') assert(coords[sq].row !== g.size - 1, `${puzzleWhere(p)}: zwarte schijf op de onderste rij (veld ${sq})`);
    }
    for (const sq of p.ex.goal.land || []) assertEqual(g.board[sq], '.', `${puzzleWhere(p)}: ster op bezet veld`);
  }
});

test('Puzzels', 'Elke puzzel heeft precies één goede oplossing', () => {
  for (const p of ALL_PUZZLES) {
    const ok = goodFirstMoves(startExercise(p.ex));
    const key = isPlan(p.ex.goal) ? moveToLongString : capKey;
    assertEqual(new Set(ok.map(key)).size, 1, puzzleWhere(p));
  }
});

test('Puzzels', 'Elke puzzel is helemaal op te lossen met de hints', () => {
  for (const p of ALL_PUZZLES) {
    if (isPlan(p.ex.goal)) {
      playPlan(p.ex, puzzleWhere(p)); // zwart zet terug
      continue;
    }
    const st = startExercise(p.ex);
    const m = solutionMove(st);
    assert(m, `${puzzleWhere(p)}: geen oplossing`);
    assertEqual(onMove(st, m).outcome.type, 'done', puzzleWhere(p));
  }
});

test('Puzzels', 'Een puzzel vraagt niets wat bij het openen van het thema nog niet geleerd is', () => {
  const at = (id) => lessonIndex(id);
  for (const p of ALL_PUZZLES) {
    const where = puzzleWhere(p);
    const learned = at(p.theme.unlock);
    const g = startExercise(p.ex).game;
    const all = allCaptures(g);
    const legal = legalMoves(g).filter((m) => m.captures.length > 0);
    const byKing = (m) => isKing(g.board[m.from]);
    if (learned < at('meerslag')) assert(all.every((m) => m.captures.length <= 1), `${where}: meerslag`);
    if (learned < at('damslaan')) assert(!all.some(byKing), `${where}: slaan met de dam`);
    if (learned < at('meerslag-voor')) assertEqual(legal.length, all.length, `${where}: meerslag gaat voor`);
    if (learned < at('vrije-keus')) assert(!p.ex.goal.best, `${where}: slimme keus`);
    if (learned < at('dam-bocht')) assert(!all.some((m) => byKing(m) && bends(m, g.size) > 0), `${where}: bocht`);
    if (learned < at('turkse-slag')) {
      const top = (m) => m.path.slice(1, -1).some((sq) => getGeometry(g.size).coords[sq].row === 0);
      assert(!all.some((m) => !byKing(m) && top(m) && !m.promotes), `${where}: over de overkant springen`);
      // Vergelijk per dam het meeste dat hij echt kan slaan met het meeste als stukken meteen zouden verdwijnen.
      for (const k of new Set(all.filter(byKing).map((m) => m.from))) {
        const real = Math.max(...all.filter((m) => m.from === k).map((m) => m.captures.length));
        assert(naiveKingMax(g.board, g.size, k) === real, `${where}: Turkse slag`);
      }
    }
  }
});

test('Puzzels', 'Elke puzzel past bij zijn thema', () => {
  const rules = {
    slaan: (g, sol) => sol.captures.length === 1 && !isKing(g.board[sol.from]),
    meerslag: (g, sol) => sol.captures.length >= 2 && !isKing(g.board[sol.from]),
    damslaan: (g, sol) => isKing(g.board[sol.from]),
    'meerslag-voor': (g, sol) => allCaptures(g).some((m) => m.captures.length < sol.captures.length),
    bocht: (g, sol) => isKing(g.board[sol.from]) && sol.captures.length >= 2 && bends(sol, g.size) > 0,
    gemengd: () => true,
    verdedigen: (g, sol, ex) => ex.goal.type === 'safe',
    'twee-voor-een': (g, sol, ex) => ex.goal.type === 'trade' && ex.goal.net >= 1,
    vastzetten: (g, sol, ex) => ex.goal.type === 'block',
  };
  for (const t of THEMES) assert(rules[t.id], `geen controle voor thema ${t.id}`);
  for (const p of ALL_PUZZLES) {
    const st = startExercise(p.ex);
    assert(rules[p.theme.id](st.game, solutionMove(st), p.ex), puzzleWhere(p));
  }
});

test('Puzzels', 'Thema "Alles door elkaar" mengt: slimme keus, dam halen, Turkse slag, dam meeslaan', () => {
  const mixed = ALL_PUZZLES.filter((p) => p.theme.id === 'gemengd');
  const sols = mixed.map((p) => {
    const st = startExercise(p.ex);
    return { p, g: st.game, sol: solutionMove(st) };
  });
  assert(sols.some(({ p }) => p.ex.goal.best === 'safe'), 'veilige slag');
  assert(sols.some(({ p }) => p.ex.goal.best === 'king'), 'dam meeslaan');
  assert(sols.some(({ sol }) => sol.promotes), 'dam halen met een slag');
  assert(sols.some(({ g, sol }) => isKing(g.board[sol.from]) && naiveKingMax(g.board, g.size, sol.from) > sol.captures.length), 'Turkse slag');
});

test('Puzzels', 'Slimme keus: er is ook een slag die mag, maar niet slim is ("Bijna!")', () => {
  for (const p of ALL_PUZZLES.filter((x) => x.ex.goal.best)) {
    const st = startExercise(p.ex);
    const other = legalMoves(st.game).find((m) => captureCheck(p.ex.goal, st.game, m) === 'not-best');
    assert(other, `${puzzleWhere(p)}: geen andere slag`);
    const out = onMove(st, other);
    assertEqual(out.outcome.type, 'retry', puzzleWhere(p));
    assert(out.outcome.message.startsWith('Bijna!'), out.outcome.message);
  }
});

test('Puzzels', 'Binnen een thema eindigen we met een voller bord dan we begonnen', () => {
  const pieces = (p) => startExercise(p.ex).game.board.filter((x) => x && x !== '.').length;
  for (const t of THEMES) {
    const list = ALL_PUZZLES.filter((p) => p.theme === t);
    assert(pieces(list[list.length - 1]) > pieces(list[0]), `thema ${t.id}`);
  }
});

test('Puzzels', 'Thema open na de les; telt gehaalde puzzels en sterren', () => {
  const t = THEMES.find((x) => x.id === 'meerslag');
  assertEqual(themeStatus(t, { lessons: {} }).unlocked, false);
  let progress = { lessons: { meerslag: { stars: 2 } }, puzzles: {} };
  progress = withBestStars(progress, 'puzzles', 'meerslag-1', 3);
  progress = withBestStars(progress, 'puzzles', 'meerslag-2', 1);
  progress = withBestStars(progress, 'puzzles', 'meerslag-2', 2); // beste score telt
  progress = withBestStars(progress, 'puzzles', 'meerslag-1', 1);
  assertEqual(themeStatus(t, progress), { unlocked: true, done: 2, total: 6, stars: 5 });
  assertEqual(progress.lessons, { meerslag: { stars: 2 } }, 'lessensterren blijven staan');
});

test('Puzzels', 'Rustig stoppen: na elke 4 puzzels', () => {
  assertEqual([0, 1, 3, 4, 5, 8].map(offerBreak), [false, false, false, true, false, true]);
});

// Speelt de oplossing van een opdracht met zwart-terugzetten uit.
// Geeft de zetten terug, en controleert dat zwart steeds maar één zet had.
function playPlan(ex, where) {
  let st = startExercise(ex);
  const line = [];
  for (let step = 0; step < 6 && !st.done; step++) {
    const m = solutionMove(st);
    assert(m, `${where}: geen oplossing na ${step} zetten`);
    const out = onMove(st, m);
    assert(out.outcome.type === 'done' || out.outcome.type === 'continue', `${where}: hint-zet gaf "${out.outcome.type}"`);
    line.push({ move: m, before: st.game });
    if (out.outcome.reply) {
      assertEqual(legalMoves(out.outcome.between).length, 1, `${where}: zwart heeft meer dan één zet na ${moveToLongString(m)}`);
      line.push({ move: out.outcome.reply, before: out.outcome.between, black: true });
    }
    st = out.state;
  }
  assert(st.done, `${where}: niet afgerond`);
  return { line, end: st.game, start: startExercise(ex).game };
}

const count = (g, c) => g.board.filter((p, sq) => sq > 0 && p !== '.' && p !== null && (p.toLowerCase() === c)).length;

const planExercises = () => LESSONS.flatMap((l) => l.exercises.map((ex, i) => ({ ex, where: `${l.id} opdracht ${i + 1}` })))
  .concat(ALL_PUZZLES.map((p) => ({ ex: p.ex, where: puzzleWhere(p) })))
  .filter(({ ex }) => isPlan(ex.goal));

test('Lessen', 'Zwart zet terug: in de oplossing heeft zwart steeds maar één zet', () => {
  const list = planExercises();
  assert(list.length >= 20, `maar ${list.length} opdrachten met terugzetten`);
  for (const { ex, where } of list) playPlan(ex, where);
});

test('Lessen', 'Zwart zet terug: in de beginstand kan wit nog niet slaan', () => {
  for (const { ex, where } of planExercises()) {
    assert(legalMoves(startExercise(ex).game).every((m) => m.captures.length === 0), `${where}: er is al een slag`);
  }
});

test('Lessen', 'Verdedigen en aanvallen: er is ook een zet die wél iets weggeeft of niets dreigt', () => {
  for (const { ex, where } of planExercises().filter((x) => ['safe', 'threat'].includes(x.ex.goal.type))) {
    const st = startExercise(ex);
    const good = goodFirstMoves(st).map(moveToLongString);
    assert(good.length > 0 && good.length < legalMoves(st.game).length, where);
    const bad = legalMoves(st.game).find((m) => !good.includes(moveToLongString(m)));
    const out = onMove(st, bad);
    assertEqual(out.outcome.type, 'retry', where);
    assert(out.outcome.message.startsWith('Bijna!'), out.outcome.message);
  }
});

test('Lessen', 'Les "Verdedigen": een verkeerde zet laat zien hoe zwart slaat', () => {
  const st = startExercise(lessonEx('verdedigen')[0]);
  const good = goodFirstMoves(st).map(moveToLongString);
  const bad = legalMoves(st.game).find((m) => !good.includes(moveToLongString(m)));
  const out = onMove(st, bad);
  assert(out.outcome.reply && out.outcome.reply.captures.length > 0, 'zwart slaat');
  assert(out.outcome.message.includes('slaat zwart'), out.outcome.message);
  assertEqual(out.state.game, st.game, 'stand gaat terug');
});

test('Lessen', 'Aanvallen: na de goede zet kan wit echt slaan als het weer aan de beurt is', () => {
  for (const { ex, where } of planExercises().filter((x) => x.ex.goal.type === 'threat')) {
    const st = startExercise(ex);
    const after = play(st.game, solutionMove(st));
    assert(captureMoves(after.board, after.size, 'w', after.options).length > 0, where);
    assertEqual(captureMoves(after.board, after.size, 'b', after.options).length, 0, where);
  }
});

test('Lessen', 'Ruil en twee voor één: je geeft echt een schijf weg, en wint wat er beloofd is', () => {
  for (const { ex, where } of planExercises().filter((x) => x.ex.goal.type === 'trade')) {
    const { line, end, start } = playPlan(ex, where);
    assertEqual(line[0].move.captures.length, 0, `${where}: eerste zet is een gewone zet`);
    assert(line[1].black && line[1].move.captures.includes(line[0].move.to), `${where}: zwart slaat de weggegeven schijf`);
    const lostW = count(start, 'w') - count(end, 'w');
    const lostB = count(start, 'b') - count(end, 'b');
    if (ex.goal.net === 0) assertEqual(lostB, lostW, `${where}: 1 om 1`);
    else assert(lostB - lostW >= ex.goal.net, `${where}: wint ${lostB - lostW}`);
    assertEqual(captureMoves(end.board, end.size, 'b', end.options).length, 0, `${where}: zwart kan daarna niets meer slaan`);
  }
});

test('Lessen', 'Vastzetten: zwart heeft daarna echt geen zet, en ook geen slag', () => {
  for (const { ex, where } of planExercises().filter((x) => x.ex.goal.type === 'block')) {
    const { end } = playPlan(ex, where);
    assertEqual(end.turn, 'b', where);
    assert(count(end, 'b') > 0, `${where}: zwart heeft nog stukken`);
    assertEqual(legalMoves(end).length, 0, where);
    assertEqual(gameStatus(end), { over: true, winner: 'w', reason: 'geen-zetten' }, where);
  }
  assert(planExercises().some((x) => x.ex.goal.type === 'block' && x.ex.goal.maxMoves === 2), 'ook vastzetten in 2 zetten');
});

test('Lessen', 'Les "Remise": het antwoord volgt uit de regels, beide antwoorden komen voor', () => {
  const answers = lessonEx('remise').filter((ex) => ex.goal.type === 'choice').map((ex) => {
    const g = startExercise(ex).game;
    const a = drawAnswer(g);
    if (a === 'remise') {
      assertEqual(endgameLimit(g.board), 5, `${ex.fen}: 5-zettenregel`);
      assertEqual(captureMoves(g.board, g.size, 'w', g.options).length, 0, `${ex.fen}: wit kan niet slaan`);
    }
    if (a === 'wit') assert(legalMoves(g).some((m) => m.captures.length > 0), `${ex.fen}: wit slaat`);
    return a;
  });
  assert(answers.includes('remise') && answers.includes('wit'), `antwoorden ${answers}`);
  assertEqual(CHOICES.remise.map((c) => c.value).sort(), ['remise', 'wit']);
});

test('Lesmotor', 'Keuzevraag: verkeerd antwoord is "Bijna!", goed antwoord haalt de opdracht', () => {
  const st = startExercise(lessonEx('remise')[1]); // wit kan slaan
  const wrong = onChoice(st, 'remise');
  assertEqual(wrong.outcome.type, 'wrong');
  assert(wrong.outcome.message.startsWith('Bijna!'), wrong.outcome.message);
  assertEqual(onChoice(wrong.state, 'wit').outcome.type, 'done');
});

test('Lesmotor', 'Twee voor één: zwart slaat vanzelf terug, daarna slaat het kind er 2', () => {
  let st = startExercise(lessonEx('twee-voor-een')[0]);
  let out = onMove(st, legalMoves(st.game).find((m) => moveToLongString(m) === '26-23'));
  assertEqual(out.outcome.type, 'continue');
  assertEqual(moveToLongString(out.outcome.reply), '19x26');
  assertEqual(out.outcome.message, 'Zwart moet slaan!');
  st = out.state;
  assertEqual(st.game.turn, 'w');
  out = onMove(st, legalMoves(st.game).find((m) => moveToLongString(m) === '28x19x12'));
  assertEqual(out.outcome.type, 'done');
});

test('Lesmotor', 'Twee voor één: een zet die niet werkt is "Bijna!" en de stand gaat terug', () => {
  const st = startExercise(lessonEx('twee-voor-een')[0]);
  const bad = legalMoves(st.game).find((m) => !planWorks(st.ex.goal, st.start, st.game, m, 2));
  const out = onMove(st, bad);
  assertEqual(out.outcome.type, 'retry');
  assertEqual(out.state.game, st.game);
});

test('Lessen', 'Elk soort opdracht komt pas na de les waarin het geleerd wordt', () => {
  const introducedIn = { safe: 'verdedigen', threat: 'aanvallen', block: 'vastzetten', choice: 'remise' };
  const tradeLesson = (goal) => (goal.net > 0 ? 'twee-voor-een' : 'ruil');
  const check = (ex, learnedIndex, where) => {
    const t = ex.goal.type;
    const need = t === 'trade' ? tradeLesson(ex.goal) : introducedIn[t];
    if (need) assert(lessonIndex(need) <= learnedIndex, `${where}: ${t} vóór les ${need}`);
  };
  LESSONS.forEach((l, li) => l.exercises.forEach((ex, i) => check(ex, li, `${l.id} opdracht ${i + 1}`)));
  ALL_PUZZLES.forEach((p) => check(p.ex, lessonIndex(p.theme.unlock), puzzleWhere(p)));
});

// ---------------------------------------------------------------------------
// Regel-opties voor de mini-partij na les 4 (nog niet slaan, eerste dam wint)
// ---------------------------------------------------------------------------
// 6x6-nummering:
//   rij 0:  .  1  .  2  .  3
//   rij 1:  4  .  5  .  6  .
//   rij 2:  .  7  .  8  .  9
//   rij 3: 10  . 11  . 12  .
//   rij 4:  . 13  . 14  . 15
//   rij 5: 16  . 17  . 18  .

test('Mini-partij', 'Zonder slaan (slaan: false) zijn er alleen gewone zetten', () => {
  assertEqual(moveList(game('W:W14:B11', 6)), ['14x7'], 'met slaan: de slag');
  const g = game('W:W14:B11', 6, { slaan: false });
  assertEqual(moveList(g), ['14-12']);
  assertEqual(captureMoves(g.board, 6, 'b', g.options), [], 'zwart kan ook niet slaan');
});

test('Mini-partij', 'Eerste dam wint (eersteDamWint): wie een dam haalt, heeft gewonnen', () => {
  const race = playMove(game('W:W4:B9', 6, { slaan: false, eersteDamWint: true }), '4-1');
  assertEqual(gameStatus(race), { over: true, winner: 'w', reason: 'eerste-dam' });
  const normal = playMove(game('W:W4:B9', 6), '4-1');
  assertEqual(gameStatus(normal).over, false, 'gewone regels: spel gaat door');
});

test('Mini-partij', 'Na les 4, 8, 13 en 19 een mini-partij, met unieke id', () => {
  assertEqual(MINI_GAMES.map((m) => lessonIndex(m.after) + 1), [4, 8, 13, 19]);
  const ids = MINI_GAMES.map((m) => m.id);
  assertEqual(new Set(ids).size, ids.length, 'id\'s uniek');
});

test('Mini-partij', 'Elke mini-partij: geldige stand en regels, en wit kan beginnen', () => {
  for (const m of MINI_GAMES) {
    for (const key of Object.keys(m.options || {})) {
      assert(key in DEFAULT_OPTIONS, `${m.id}: onbekende regel-optie ${key}`);
    }
    assert([6, 8].includes(m.size), `${m.id}: groot bord pas na les 21`);
    const g = createGame({ size: m.size, fen: m.fen || null, options: m.options || {} });
    assertEqual(g.turn, 'w', `${m.id}: wit begint`);
    assert(legalMoves(g).length > 0, `${m.id}: wit kan zetten`);
    assertEqual(gameStatus(g).over, false, `${m.id}: partij is nog niet uit`);
    const kings = g.board.filter((p) => isKing(p)).length;
    assertEqual(kings, 0, `${m.id}: geen dammen bij de start`);
    assert(m.title && m.icon && m.intro, `${m.id}: titel, plaatje en uitleg`);
  }
});

test('Mini-partij', 'Alleen de regels die het kind al kent', () => {
  // Regel-optie -> de les waarin die regel geleerd wordt.
  const learnedIn = {
    slaan: 'slaan',
    slagplicht: 'verplicht',
    schijfSlaatAchteruit: 'achteruit',
    meerslagGaatVoor: 'meerslag-voor',
    damHalen: 'dam',
  };
  for (const m of MINI_GAMES) {
    const g = createGame({ size: m.size, fen: m.fen || null, options: m.options || {} });
    const at = lessonIndex(m.after);
    for (const [option, lesson] of Object.entries(learnedIn)) {
      // Kan niemand slaan, dan doen de slagregels niet mee.
      if (!g.options.slaan && option !== 'slaan' && option !== 'damHalen') continue;
      if (at < lessonIndex(lesson)) {
        assertEqual(g.options[option], false, `${m.id}: ${option} staat aan vóór les ${lessonIndex(lesson) + 1}`);
      }
    }
    // Meerslag is nog niet geleerd, maar kan wel gebeuren: dan legt Dammie het uit.
    if (g.options.slaan && at < lessonIndex('meerslag')) {
      assert(m.explainMeerslag, `${m.id}: meerslag kan, maar wordt niet uitgelegd`);
    }
  }
});

test('Mini-partij', 'Race naar de overkant eindigt altijd (computer tegen computer)', () => {
  const race = MINI_GAMES.find((m) => m.options?.eersteDamWint);
  const rnd = seededRandom(9);
  const reasons = {};
  for (let i = 0; i < 20; i++) {
    let g = createGame({ size: race.size, fen: race.fen, options: race.options });
    while (!gameStatus(g).over) {
      assert(g.plies < 60, 'de race duurt te lang');
      g = play(g, chooseMove(g, i % 2 ? 1 : 3, { random: rnd }));
    }
    const { reason } = gameStatus(g);
    reasons[reason] = (reasons[reason] || 0) + 1;
  }
  assert((reasons['eerste-dam'] || 0) >= 15, `meestal wint de eerste dam: ${JSON.stringify(reasons)}`);
});

// ---------------------------------------------------------------------------
// De computer (ai.js)
// ---------------------------------------------------------------------------

// Vast "toeval", zodat de tests elke keer hetzelfde uitkomen.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Een nepklok die bij elke blik `step` ms verder springt (de computer kijkt
// eens per 1024 standen). Zo is "de tijd om" na een vast aantal stappen:
// de test blijft snel en komt op elke computer hetzelfde uit.
function fastClock(step) {
  let t = 0;
  return () => (t += step);
}

const isLegal = (g, m) => !!m && legalMoves(g).some((x) => moveToLongString(x) === moveToLongString(m));

// Standen uit willekeurige partijtjes (vast toeval), per bordgrootte en regelset.
const RULE_SETS = [
  {},
  { damHalen: false },
  { schijfSlaatAchteruit: false },
  { meerslagGaatVoor: false },
  { slagplicht: false },
  { slaan: false, eersteDamWint: true },
];
let samplePositionsCache = null;
function samplePositions() {
  if (samplePositionsCache) return samplePositionsCache;
  const rnd = seededRandom(7);
  const out = [];
  for (const size of [6, 8, 10]) {
    RULE_SETS.forEach((options) => {
      for (let n = 0; n < 2; n++) {
        let g = createGame({ size, options });
        while (!gameStatus(g).over && g.plies < 60) {
          if (g.plies % 7 === n) out.push(g);
          const moves = legalMoves(g);
          g = play(g, moves[Math.floor(rnd() * moves.length)]);
        }
      }
    });
  }
  samplePositionsCache = out;
  return out;
}

test('Computer', 'Elk niveau doet altijd een legale zet (6x6, 8x8, 10x10, ook met lesregels)', () => {
  const positions = samplePositions();
  assert(positions.length > 100, `genoeg standen (${positions.length})`);
  const rnd = seededRandom(11);
  positions.forEach((g, i) => {
    for (const level of [1, 2, 3]) {
      const m = chooseMove(g, level, { random: rnd });
      assert(isLegal(g, m), `niveau ${level}, stand ${toFen(g)}: ${m && moveToLongString(m)}`);
    }
    // Niveau 4 en 5 met een snelle klok (de tijdslimiet slaat dan meteen toe).
    if (i % 6 === 0) {
      for (const level of [4, 5]) {
        const m = chooseMove(g, level, { random: rnd, now: fastClock(500) });
        assert(isLegal(g, m), `niveau ${level}, stand ${toFen(g)}: ${m && moveToLongString(m)}`);
      }
    }
  });
  info.push(`computer getest in ${positions.length} standen`);
});

test('Computer', 'Geen zet mogelijk: de computer geeft null terug', () => {
  assertEqual(chooseMove(game('B:W14:B', 6), 3), null, 'geen stukken');
  assertEqual(chooseMove(game('W:W4:B1', 6), 5), null, 'geen zetten (4 kan niet naar 1)');
});

test('Computer', 'Hij slaat als het moet, en dan de grootste slag', () => {
  const positions = samplePositions().filter((g) => g.options.slagplicht && legalMoves(g)[0]?.captures.length > 0);
  assert(positions.length > 20, `genoeg standen met een slag (${positions.length})`);
  const rnd = seededRandom(3);
  for (const g of positions) {
    const max = Math.max(...captureMoves(g.board, g.size, g.turn, { ...g.options, meerslagGaatVoor: false })
      .map((m) => m.captures.length));
    for (const level of [1, 2, 3]) {
      const m = chooseMove(g, level, { random: rnd });
      assert(m.captures.length > 0, `niveau ${level} slaat niet in ${toFen(g)}`);
      if (g.options.meerslagGaatVoor) assertEqual(m.captures.length, max, `niveau ${level}, ${toFen(g)}`);
    }
  }
  // Een vaste stand: wit moet slaan (14x7).
  for (const level of [1, 2, 3, 4, 5]) {
    assertEqual(moveToString(chooseMove(game('W:W14,15:B11', 6), level, { random: seededRandom(level) })), '14x7');
  }
});

// Niveau 3 met toeval 0,5: geen willekeur en geen "kleine fout" (die zitten onder 0,15 en 0,4).
const steady = () => 0.5;
// Niveau 5 krijgt in deze tests ongeveer 100.000 standen bedenktijd.
const think = (g, level) => chooseMove(g, level, { random: steady, now: fastClock(10) });

test('Computer', 'Niveau 3, 4 en 5 zien "twee voor één" (les Twee voor één)', () => {
  lessonEx('twee-voor-een').forEach((ex, i) => {
    const g = createGame({ size: ex.size, fen: ex.fen, options: ex.options || {} });
    for (const level of [3, 4, 5]) {
      const m = think(g, level);
      assert(planWorks(ex.goal, g, g, m, 2), `opdracht ${i + 1}, niveau ${level} kiest ${moveToLongString(m)}`);
    }
  });
});

test('Computer', 'Niveau 3, 4 en 5 geven geen schijf weg als dat niet hoeft', () => {
  // Zie de stand bij "Uitleg na een fout": alleen 14-12 geeft niets weg.
  // (Lesstanden uit "Slim verdedigen" gebruiken we hier niet: daar offert een
  // sterke computer soms terecht een schijf om een dam te halen.)
  const g = game('W:W14,15:B8', 6);
  for (const level of [3, 4, 5]) assertEqual(moveToString(think(g, level)), '14-12', `niveau ${level}`);
});

test('Computer', 'Niveau 3, 4 en 5 rekenen een reeks slagen helemaal door', () => {
  // 8x8. 15-10 lijkt een ruil: 7x14, 18x9. Maar dan slaat zwart nog eens: 5x14.
  // Wit raakt 2 schijven kwijt en slaat er maar 1. Wie na 3 halve zetten stopt
  // met rekenen, ziet die laatste slag niet.
  const g = game('W:W15,18,23:B5,7,20,28', 8);
  const line = ['15-10', '7x14', '18x9', '5x14'].reduce((x, n) => playMove(x, n), g);
  assertEqual(toFen(line), 'W:W23:B14,20,28', 'de reeks klopt');
  for (const level of [3, 4, 5]) {
    const m = think(g, level);
    assert(moveToString(m) !== '15-10', `niveau ${level} speelt 15-10`);
  }
});

test('Computer', 'Race naar de overkant: niveau 2–5 haalt meteen een dam als dat kan', () => {
  const g = game('W:W4,17:B9', 6, { slaan: false, eersteDamWint: true });
  for (const level of [2, 3, 4, 5]) assertEqual(moveToString(think(g, level)), '4-1', `niveau ${level}`);
});

test('Computer', 'Slaapkop (niveau 1) zet het liefst een schijf "in de slag"', () => {
  // Zie de stand bij "Uitleg na een fout": 14-11 en 15-12 geven een schijf weg, 14-12 niet.
  const g = game('W:W14,15:B8', 6);
  for (let seed = 1; seed <= 20; seed++) {
    const r = seededRandom(seed);
    // Toeval onder 0,8 = "laat je slaan"; daarna kiest hij er één.
    let first = true;
    const random = () => (first ? ((first = false), 0.1) : r());
    const m = chooseMove(g, 1, { random });
    assert(['14-11', '15-12'].includes(moveToString(m)), `kiest ${moveToString(m)}`);
  }
});

test('Computer', 'Niveau 5 stopt op tijd (ongeveer 1 seconde) op het grote bord', () => {
  const g = createGame({ size: 10 });
  const start = Date.now();
  const m = chooseMove(g, 5);
  const ms = Date.now() - start;
  assert(isLegal(g, m), 'legale zet');
  assert(ms < 2500, `duurde ${ms} ms`);
  info.push(`niveau 5 dacht ${ms} ms na over de beginstand op 10x10`);
});

test('Computer', 'Een hoger niveau wint van een lager (6x6, een paar partijen)', () => {
  const rnd = seededRandom(5);
  const playGame = (white, black) => {
    let g = createGame({ size: 6 });
    while (!gameStatus(g).over && g.plies < 200) {
      g = play(g, chooseMove(g, g.turn === 'w' ? white : black, { random: rnd }));
    }
    return gameStatus(g).winner;
  };
  let strongWins = 0;
  for (let i = 0; i < 4; i++) {
    if (playGame(3, 1) === 'w') strongWins++;
    if (playGame(1, 3) === 'b') strongWins++;
  }
  assert(strongWins >= 7, `niveau 3 won ${strongWins} van de 8 partijen van niveau 1`);
});

test('Computer', 'Uitleg na een fout: herkent een zet die een schijf weggeeft', () => {
  // 6x6, wit 14 en 15, zwart 8.
  //  14-11: zwart slaat 8x13, wit kan niet terugslaan  -> weggegeven
  //  14-12: zwart kan niet slaan (15 staat erachter)    -> veilig
  //  15-12: zwart slaat 8x15                             -> weggegeven
  const g = game('W:W14,15:B8', 6);
  const mv = (n) => legalMoves(g).find((m) => moveToString(m) === n);
  assertEqual(giveaway(g, mv('14-11')), { take: 1 });
  assertEqual(giveaway(g, mv('14-12')), null);
  assertEqual(giveaway(g, mv('15-12')), { take: 1 });
  assertEqual(moveCost(g, mv('14-12')), { take: 0, net: 0 });
});

test('Computer', 'Uitleg na een fout: niets zeggen als er geen betere zet was', () => {
  // Wit 14 alleen tegen zwart 8: beide zetten geven de schijf weg.
  const g = game('W:W14:B8', 6);
  for (const m of legalMoves(g)) assertEqual(giveaway(g, m), null, moveToString(m));
});

test('Computer', 'Uitleg na een fout: twee voor één is geen fout', () => {
  const ex = lessonEx('twee-voor-een')[0];
  const g = createGame({ size: ex.size, fen: ex.fen });
  const good = legalMoves(g).find((m) => planWorks(ex.goal, g, g, m, 2));
  assertEqual(giveaway(g, good), null);
});

test('Computer', 'Niveau past zich aan: 3x winst = voorstel, 3x verlies = stil omlaag', () => {
  let s = { level: 2, wins: 0, losses: 0 };
  let out = adaptLevel(s, 'win');
  out = adaptLevel(out.state, 'win');
  assertEqual(out.suggestUp, false);
  out = adaptLevel(out.state, 'win');
  assertEqual(out.suggestUp, true, 'na 3x winst');
  assertEqual(out.state, { level: 2, wins: 0, losses: 0 }, 'niveau gaat pas omhoog als het kind ja zegt');

  out = adaptLevel(out.state, 'loss');
  out = adaptLevel(out.state, 'draw');
  out = adaptLevel(out.state, 'loss');
  assertEqual(out.state.level, 2, 'remise breekt de reeks niet, maar telt ook niet');
  out = adaptLevel(out.state, 'loss');
  assertEqual(out.state, { level: 1, wins: 0, losses: 0 }, 'na 3x verlies een stapje omlaag');
  assertEqual(out.suggestUp, false);

  out = adaptLevel(adaptLevel(adaptLevel(out.state, 'loss').state, 'loss').state, 'loss');
  assertEqual(out.state.level, 1, 'nooit lager dan 1');

  s = { level: 5, wins: 2, losses: 0 };
  assertEqual(adaptLevel(s, 'win').suggestUp, false, 'boven 5 kan niet');

  out = adaptLevel(adaptLevel({ level: 3, wins: 2, losses: 0 }, 'loss').state, 'win');
  assertEqual(out.state.wins, 1, 'verlies breekt de winstreeks');
});

test('Computer', 'Niveaus: 1 t/m 5 met naam, en rare invoer wordt een geldig niveau', () => {
  assertEqual(LEVELS.map((l) => l.level), [1, 2, 3, 4, 5]);
  assert(LEVELS.every((l) => l.name && l.icon), 'naam en plaatje');
  assertEqual([clampLevel(0), clampLevel(9), clampLevel('3'), clampLevel(undefined)], [1, 5, 3, 1]);
});

// ---------------------------------------------------------------------------
// Profielen en opslag (met een nep-opslag: de echte voortgang blijft heel)
// ---------------------------------------------------------------------------

function fakeStore(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

function withStore(initial, fn) {
  const store = fakeStore(initial);
  useStorage(store);
  try {
    return fn(store);
  } finally {
    useStorage(null);
  }
}

const OLD_PROGRESS = {
  lessons: { bord: { stars: 3 }, schijf: { stars: 2 }, dam: { stars: 1 } },
  puzzles: { 'slaan-1': { stars: 2 } },
  computer: { level: 3, wins: 1, losses: 0 },
  minigames: { 'mini-race': { played: true } },
};

test('Profielen', 'Oude voortgang (dammie.v1) wordt profiel 1 en blijft precies hetzelfde', () => {
  const old = JSON.stringify(OLD_PROGRESS);
  withStore({ 'dammie.v1': old }, (store) => {
    const p = loadProgress();
    assertEqual(p.lessons, OLD_PROGRESS.lessons, 'lessen');
    assertEqual(p.puzzles, OLD_PROGRESS.puzzles, 'puzzels');
    assertEqual(p.minigames, OLD_PROGRESS.minigames, 'mini-partijen');
    assertEqual(loadComputer(), { level: 3, wins: 1, losses: 0 }, 'computer');
    const profiles = listProfiles();
    assertEqual(profiles.length, 1);
    assertEqual(profiles[0].animal, null, 'het kind kiest zelf nog een dier');
    // Opslaan gaat naar de nieuwe sleutel; de oude blijft als reservekopie.
    updateProfile(profiles[0].id, { animal: 'beer' });
    saveLessonStars('beurt', 2);
    assertEqual(store.data['dammie.v1'], old, 'oude sleutel onveranderd');
    assertEqual(loadProgress().lessons.bord, { stars: 3 }, 'oude sterren na opslaan nog daar');
    assertEqual(loadProgress().lessons.beurt, { stars: 2 }, 'nieuwe ster erbij');
    assertEqual(earnedBadges(loadProgress()).map((b) => b.id), ['eerste-stappen', 'eerste-dam'], 'badges meteen uitgerekend');
  });
});

test('Profielen', 'Nieuw apparaat: nog geen profiel, lege voortgang, computer op niveau 1', () => {
  withStore({}, () => {
    assertEqual(listProfiles(), []);
    assertEqual(currentProfile(), null);
    assertEqual(loadProgress().lessons, {});
    assertEqual(loadComputer(), { level: 1, wins: 0, losses: 0 });
  });
});

test('Profielen', 'Twee kinderen: ieder eigen sterren, computerniveau, borden en badges', () => {
  withStore({}, () => {
    const vos = addProfile({ animal: 'vos', name: 'Noor' });
    saveLessonStars('dam', 3);
    saveComputer({ level: 4, wins: 0, losses: 0 });
    updateProfile(vos.id, { board: 'zee' });
    const beer = addProfile({ animal: 'beer' });
    assertEqual(currentProfile().id, beer.id, 'nieuw profiel wordt het huidige');
    assertEqual(loadProgress().lessons, {}, 'beer begint leeg');
    assertEqual(loadComputer().level, 1, 'beer begint bij niveau 1');
    assertEqual(currentProfile().board, 'hout');
    savePuzzleStars('slaan-1', 2);
    switchProfile(vos.id);
    assertEqual(loadProgress().lessons, { dam: { stars: 3 } });
    assertEqual(loadProgress().puzzles, {}, 'puzzel van beer niet bij vos');
    assertEqual(loadComputer().level, 4);
    assertEqual(currentProfile().board, 'zee');
    assertEqual(earnedBadges(loadProgress()).map((b) => b.id), ['eerste-dam']);
  });
});

test('Profielen', 'Elk dier maar één keer, hooguit 6 profielen, naam hooguit 12 tekens', () => {
  withStore({}, () => {
    assert(addProfile({ animal: 'vos', name: '  Noor  ' }), 'eerste');
    assertEqual(currentProfile().name, 'Noor', 'spaties weg');
    assertEqual(addProfile({ animal: 'vos' }), null, 'vos is al bezet');
    assertEqual(addProfile({ animal: 'draak' }), null, 'onbekend dier');
    assertEqual(freeAnimals().some((a) => a.id === 'vos'), false, 'vos niet meer te kiezen');
    assertEqual(freeAnimals(currentProfile().id).some((a) => a.id === 'vos'), true, 'behalve voor jezelf');
    for (const animal of ['beer', 'kikker', 'panda', 'leeuw', 'konijn']) assert(addProfile({ animal }), animal);
    assertEqual(listProfiles().length, MAX_PROFILES);
    assertEqual(addProfile({ animal: 'uil' }), null, 'zevende kan niet');
    const p = updateProfile(currentProfile().id, { name: 'Maximiliaan-Alexander' });
    assertEqual(p.name.length, NAME_MAX);
    assertEqual(updateProfile(currentProfile().id, { animal: 'vos' }), null, 'dier van een ander kind');
    assertEqual(profileLabel(listProfiles()[0]), '🦊 Noor');
    assertEqual(profileLabel(listProfiles()[1]), '🐻 Beer', 'zonder naam: het dier');
  });
});

test('Profielen', 'Profiel verwijderen: een ander wordt het huidige, de rest blijft heel', () => {
  withStore({}, () => {
    const vos = addProfile({ animal: 'vos' });
    saveLessonStars('bord', 3);
    const beer = addProfile({ animal: 'beer' });
    removeProfile(beer.id);
    assertEqual(currentProfile().id, vos.id);
    assertEqual(loadProgress().lessons, { bord: { stars: 3 } });
    removeProfile(vos.id);
    assertEqual(currentProfile(), null);
    assert(addProfile({ animal: 'kikker' }), 'nieuw profiel kan weer');
    assertEqual(loadProgress().lessons, {}, 'nieuw kind begint leeg');
  });
});

test('Profielen', 'Geen opslag (privévenster): de app werkt gewoon door', () => {
  const broken = {
    getItem: () => {
      throw new Error('geen opslag');
    },
    setItem: () => {
      throw new Error('geen opslag');
    },
  };
  useStorage(broken);
  try {
    assertEqual(loadProgress().lessons, {});
    assert(addProfile({ animal: 'uil' }), 'profiel in het geheugen');
    saveLessonStars('bord', 2);
    assertEqual(loadProgress().lessons, { bord: { stars: 2 } }, 'onthouden zolang de app open is');
    assertEqual(profileLabel(currentProfile()), '🦉 Uil');
  } finally {
    useStorage(null);
  }
});

test('Profielen', 'Gewonnen van de computer: per niveau bewaard, de beste ster blijft staan', () => {
  withStore({}, () => {
    addProfile({ animal: 'vos' });
    saveComputerWin(2);
    saveComputerWin(2);
    saveComputerWin(5);
    assertEqual(loadProgress().beaten, { 2: true, 5: true });
    saveLessonStars('bord', 3);
    saveLessonStars('bord', 1);
    assertEqual(loadProgress().lessons.bord, { stars: 3 });
    saveMiniGamePlayed('mini-race');
    assertEqual(loadProgress().minigames, { 'mini-race': { played: true } });
  });
});

// ---------------------------------------------------------------------------
// Reservekopie (Bewaar / Laad voortgang)
// ---------------------------------------------------------------------------

test('Reservekopie', 'Bewaren en daarna laden geeft precies hetzelfde terug', () => {
  let file;
  let before;
  withStore({}, () => {
    addProfile({ animal: 'vos', name: 'Noor' });
    saveLessonStars('dam', 2);
    saveComputerWin(3);
    saveMiniGamePlayed('mini-slaan');
    updateProfile(currentProfile().id, { board: 'zee' });
    addProfile({ animal: 'panda' });
    savePuzzleStars('meerslag-1', 3);
    saveComputer({ level: 2, wins: 1, losses: 0 });
    before = listProfiles();
    file = exportBackup(new Date(2026, 9, 23));
    assertEqual(JSON.parse(file).app, 'dammie');
  });
  withStore({}, () => {
    const out = importBackup(file);
    assert(out.ok, 'laden lukt');
    assertEqual(listProfiles(), before, 'alle profielen terug');
    assertEqual(profileLabel(currentProfile()), '🐼 Panda', 'zelfde kind is aan de beurt');
    assertEqual(loadComputer(), { level: 2, wins: 1, losses: 0 });
  });
  assertEqual(backupFileName(new Date(2026, 9, 3)), 'damvoortgang-2026-10-03.json');
});

test('Reservekopie', 'Een kapot of vreemd bestand wordt geweigerd en er verandert niets', () => {
  withStore({}, (store) => {
    addProfile({ animal: 'vos' });
    saveLessonStars('dam', 3);
    const saved = store.data['dammie.v2'];
    const cases = {
      'geen-bestand': ['hallo', '', '{"app":"dammie",'],
      'ander-bestand': ['{}', '[]', '42', '{"app":"iets anders","profiles":[]}', JSON.stringify(OLD_PROGRESS)],
      leeg: ['{"app":"dammie","profiles":[]}', '{"app":"dammie"}', '{"app":"dammie","profiles":[1,"x",null]}'],
    };
    for (const [reason, texts] of Object.entries(cases)) {
      for (const text of texts) {
        const out = importBackup(text);
        assertEqual(out, { ok: false, reason }, `bestand: ${text}`);
        assertEqual(store.data['dammie.v2'], saved, `niets veranderd na: ${text}`);
      }
    }
  });
});

test('Reservekopie', 'Rare waarden in een bestand worden opgeschoond, de rest blijft heel', () => {
  const file = JSON.stringify({
    app: 'dammie',
    current: 'onbekend',
    profiles: [
      {
        id: 'p1',
        animal: 'draak',
        name: 42,
        progress: {
          lessons: { bord: { stars: 9 }, schijf: { stars: 0 }, beurt: 'x', dam: { stars: '2' } },
          puzzles: { 'slaan-1': { stars: 1 } },
          computer: { level: 17, wins: -3, losses: 'veel' },
          beaten: { 1: true, 9: true, x: true, 3: 'ja' },
          minigames: { 'mini-race': { played: true }, 'mini-slaan': { played: 'ja' } },
        },
      },
      { id: 'p1', animal: 'vos' },
      { id: 'p2', animal: 'vos' },
      { id: 'p3', animal: 'vos' },
    ],
  });
  withStore({}, () => {
    assert(importBackup(file).ok);
    const [a, b, c] = listProfiles();
    assertEqual(listProfiles().length, 3, 'dubbel id valt weg');
    assertEqual(currentProfile().id, 'p1', 'onbekend huidig profiel: het eerste');
    assertEqual([a.animal, a.name], [null, '']);
    assertEqual(a.progress.lessons, { bord: { stars: 3 }, dam: { stars: 2 } });
    assertEqual(a.progress.computer, { level: 5, wins: 0, losses: 0 });
    assertEqual(a.progress.beaten, { 1: true });
    assertEqual(a.progress.minigames, { 'mini-race': { played: true } });
    assertEqual([b.animal, c.animal], ['vos', null], 'tweede vos kiest opnieuw');
  });
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function fullProgress() {
  const p = { lessons: {}, puzzles: {}, minigames: {}, beaten: {} };
  for (const l of LESSONS) p.lessons[l.id] = { stars: 3 };
  for (const { puzzle } of ALL_PUZZLES) p.puzzles[puzzle.id] = { stars: 3 };
  for (const l of LEVELS) p.beaten[l.level] = true;
  return p;
}

test('Badges', 'Elke badge heeft een plaatje, naam en uitleg, en verwijst naar iets wat bestaat', () => {
  const ids = BADGES.map((b) => b.id);
  assertEqual(new Set(ids).size, ids.length, 'id\'s uniek');
  for (const b of BADGES) {
    assert(b.icon && b.title && badgeHow(b), `${b.id}: plaatje, naam, uitleg`);
    const { lessons = [], themes = [], beaten = null, puzzles = 0 } = b.need;
    if (lessons !== 'all') for (const id of lessons) assert(LESSONS.some((l) => l.id === id), `${b.id}: les ${id} bestaat niet`);
    for (const id of themes) assert(THEMES.some((t) => t.id === id), `${b.id}: thema ${id} bestaat niet`);
    if (beaten) assert(LEVELS.some((l) => l.level === beaten), `${b.id}: niveau ${beaten} bestaat niet`);
    if (puzzles !== 'all') assert(puzzles <= ALL_PUZZLES.length, `${b.id}: zoveel puzzels zijn er niet`);
  }
});

test('Badges', 'Alleen voor beheersing: niets met tijd, dagen op rij of vaak terugkomen', () => {
  const allowed = ['lessons', 'themes', 'puzzles', 'beaten'];
  for (const b of BADGES) {
    const keys = Object.keys(b.need);
    assert(keys.length > 0, `${b.id}: geen voorwaarde`);
    for (const k of keys) assert(allowed.includes(k), `${b.id}: voorwaarde "${k}" mag niet`);
  }
});

test('Badges', 'Nieuw kind: geen badges. Alles gehaald: alle badges', () => {
  assertEqual(earnedBadges({ lessons: {}, puzzles: {} }), []);
  assertEqual(earnedBadges(fullProgress()).length, BADGES.length);
});

test('Badges', 'Precies op het goede moment: Eerste dam! na les 4, Puzzelaar bij 10 puzzels', () => {
  const p = { lessons: {}, puzzles: {}, beaten: {} };
  for (const id of ['bord', 'schijf', 'beurt']) p.lessons[id] = { stars: 1 };
  const before = { ...p, lessons: { ...p.lessons } };
  assertEqual(earnedBadges(p).map((b) => b.id), ['eerste-stappen']);
  p.lessons.dam = { stars: 1 };
  assertEqual(newBadges(before, p).map((b) => b.id), ['eerste-dam'], 'nieuw na les 4');
  assertEqual(newBadges(p, p), [], 'niets nieuw als er niets verandert');

  const some = ALL_PUZZLES.slice(0, 9);
  for (const { puzzle } of some) p.puzzles[puzzle.id] = { stars: 1 };
  p.puzzles['bestaat-niet'] = { stars: 3 };
  assert(!hasBadge(badgeById('puzzelaar'), p), '9 puzzels (en een onbekende) is nog niet genoeg');
  p.puzzles[ALL_PUZZLES[9].puzzle.id] = { stars: 1 };
  assert(hasBadge(badgeById('puzzelaar'), p), '10 puzzels');

  const meerslag = { lessons: { meerslag: { stars: 1 }, 'meerslag-voor': { stars: 1 } }, puzzles: {} };
  assert(!hasBadge(badgeById('meerslag-meester'), meerslag), 'zonder de puzzels nog niet');
  assert(!hasBadge(badgeById('versla-3'), { lessons: {}, beaten: { 2: true } }), 'van niveau 2 winnen is niet niveau 3');
});

test('Badges', 'De uitleg in de Prijzenkast klopt', () => {
  assertEqual(badgeHow(badgeById('eerste-dam')), 'Haal les 4.');
  assertEqual(badgeHow(badgeById('slaankampioen')), 'Haal les 6, 7 en 8.');
  assertEqual(badgeHow(badgeById('meerslag-meester')), 'Haal les 9 en 11, en alle puzzels van Meerslag en Meerslag gaat voor.');
  assertEqual(badgeHow(badgeById('damdiploma')), `Haal alle ${LESSONS.length} lessen.`);
  assertEqual(badgeHow(badgeById('puzzelkoning')), `Los alle ${ALL_PUZZLES.length} puzzels op.`);
  assertEqual(badgeHow(badgeById('versla-1')), 'Win een partij van 😴 Slaapkop.');
});

// ---------------------------------------------------------------------------
// Bordthema's
// ---------------------------------------------------------------------------

// Hoe licht een kleur is (WCAG), en het verschil tussen twee kleuren.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('Bordthema\'s', 'Elk thema heeft al zijn kleuren en gaat open met een badge die bestaat', () => {
  const ids = BOARD_THEMES.map((t) => t.id);
  assertEqual(new Set(ids).size, ids.length, 'id\'s uniek');
  assertEqual(BOARD_THEMES[0].id, 'hout', 'Hout is het standaardbord');
  assertEqual(BOARD_THEMES.filter((t) => !t.unlock).map((t) => t.id), ['hout'], 'alleen Hout is meteen open');
  for (const t of BOARD_THEMES) {
    assert(t.name && t.icon, `${t.id}: naam en plaatje`);
    if (t.unlock) assert(badgeById(t.unlock), `${t.id}: badge ${t.unlock} bestaat niet`);
    assertEqual(Object.keys(t.colors).sort(), [...BOARD_COLOR_KEYS].sort(), `${t.id}: kleuren`);
    for (const k of BOARD_COLOR_KEYS) {
      if (k !== 'pattern') assert(/^#[0-9a-f]{6}$/.test(t.colors[k]), `${t.id}: ${k} is geen kleur`);
    }
    assert(!/[;{}]/.test(t.colors.pattern), `${t.id}: tekening mag de CSS niet breken`);
  }
  const unlocks = BOARD_THEMES.map((t) => t.unlock).filter(Boolean);
  assertEqual(new Set(unlocks).size, unlocks.length, 'elke badge opent hooguit één bord');
});

// Midden van een kleurverloop (de velden zijn een verloop van -a naar -b).
const mixColor = (a, b) =>
  `#${[1, 3, 5].map((i) => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('')}`;

test('Bordthema\'s', 'Schijven blijven goed zichtbaar: witte én zwarte schijven vallen op elk donker veld op', () => {
  // Maatstaf: het houten bord (wit 4,5 / zwart 2,5; laatste zet 3,0 / 3,9).
  const WHITE_PIECE = '#f1e5cd';
  const BLACK_PIECE = '#2a2a2a';
  for (const t of BOARD_THEMES) {
    const c = t.colors;
    for (const [kind, min] of [['dark', 2.4], ['last', 2.2]]) {
      const sq = mixColor(c[`${kind}-a`], c[`${kind}-b`]);
      const w = contrast(sq, WHITE_PIECE);
      const b = contrast(sq, BLACK_PIECE);
      assert(w >= min, `${t.id} ${kind}: witte schijf valt te weinig op (${w.toFixed(2)})`);
      assert(b >= min, `${t.id} ${kind}: zwarte schijf valt te weinig op (${b.toFixed(2)})`);
    }
    assert(contrast(c['light-a'], c['dark-a']) >= 2, `${t.id}: lichte en donkere velden lijken te veel op elkaar`);
  }
});

test('Bordthema\'s', 'Een bord dat (nog) niet open is of niet bestaat: dan Hout', () => {
  const empty = { lessons: {}, puzzles: {} };
  assertEqual(boardThemeFor(empty, 'zee').id, 'hout', 'zee nog dicht');
  assertEqual(boardThemeFor(empty, 'onbekend').id, 'hout');
  assertEqual(boardThemeFor({ lessons: { dam: { stars: 1 } } }, 'zee').id, 'zee', 'open na Eerste dam!');
  assertEqual(BOARD_THEMES.filter((t) => themeUnlocked(t, fullProgress())).length, BOARD_THEMES.length, 'alles gehaald: alle borden open');
  assertEqual(themesUnlockedBy([badgeById('eerste-dam')]).map((t) => t.id), ['zee']);
  assert(boardThemeStyle(BOARD_THEMES[0]).startsWith('--b-light-a: #f8e9cc'), 'CSS-variabelen');
});

// ---------------------------------------------------------------------------
// Spraak en geluid
// ---------------------------------------------------------------------------

test('Spraak', 'Zinnen worden opgeschoond: geen emoji of tekens voorlezen', () => {
  const cases = [
    ['Mooi! Nu speel je op het bord 🌳 Bos.', 'Mooi! Nu speel je op het bord Bos.'],
    ['Super! ★★★', 'Super!'],
    ['↶ Nog eens', 'Nog eens'],
    ['▶ Volgende les', 'Volgende les'],
    ['Hoe sterk mag de computer zijn? Ik denk 🦊 Slim.', 'Hoe sterk mag de computer zijn? Ik denk Slim.'],
    ['😴 Slaapkop denkt na…', 'Slaapkop denkt na.'],
    ['Hoeveel is 36 + 47?', 'Hoeveel is 36 plus 47?'],
    ['Klein bord, 6 × 6', 'Klein bord, 6 bij 6'],
    ['🏅 Nieuwe badge! ⚔️ Slaankampioen', 'Nieuwe badge! Slaankampioen'],
    ['Kies een bestand dat begint met "damvoortgang".', 'Kies een bestand dat begint met damvoortgang.'],
    ['👑', ''],
    [null, ''],
  ];
  for (const [input, want] of cases) assertEqual(cleanForSpeech(input), want, String(input));
});

// Alle vaste teksten die Dammie kan zeggen.
function allSpokenTexts() {
  const texts = [];
  for (const l of LESSONS) {
    texts.push(l.title);
    for (const ex of l.exercises) texts.push(ex.text, ex.tip, ex.success, ex.wrong, ex.notBest);
  }
  for (const t of THEMES) {
    texts.push(t.title, t.text, t.tip);
    for (const p of t.puzzles) texts.push(p.text, p.tip);
  }
  for (const b of BADGES) texts.push(b.title, badgeHow(b));
  for (const t of BOARD_THEMES) texts.push(t.name);
  for (const a of ANIMALS) texts.push(a.name);
  for (const l of LEVELS) texts.push(l.name);
  for (const m of MINI_GAMES) texts.push(m.title, m.intro);
  return texts.filter((t) => typeof t === 'string');
}

test('Spraak', 'Elke les-, puzzel- en badgetekst is na het opschonen goed uit te spreken', () => {
  const ok = /^[\p{L}\p{N}\s.,!?:;'()\-–]*$/u;
  const texts = allSpokenTexts();
  assert(texts.length > 200, `te weinig teksten gevonden (${texts.length})`);
  for (const t of texts) {
    const clean = cleanForSpeech(t);
    assert(clean.length > 0, `blijft niets over van: ${t}`);
    assert(ok.test(clean), `vreemd teken in: ${clean}`);
  }
});

test('Spraak', 'Stem: nl-NL gaat voor nl-BE, die voor een andere nl-stem; stemmen uit de cloud doen niet mee', () => {
  const v = (name, lang, extra = {}) => ({ name, lang, localService: true, ...extra });
  const xander = v('Xander', 'nl-NL');
  const ellen = v('Ellen', 'nl-BE');
  const other = v('Claire', 'nl');
  const google = v('Google Nederlands', 'nl-NL', { localService: false });
  const english = v('Samantha', 'en-US', { default: true });
  assertEqual(chooseVoice([english, ellen, xander]), xander);
  assertEqual(chooseVoice([english, other, ellen]), ellen);
  assertEqual(chooseVoice([english, other]), other);
  assertEqual(chooseVoice([english, google]), null, 'Google stuurt de tekst naar internet');
  assertEqual(chooseVoice([english]), null, 'geen Nederlandse stem: alleen tekst');
  assertEqual(chooseVoice([]), null);
  assertEqual(chooseVoice(undefined), null);
  const android = v('nl_NL-language', 'nl_NL');
  assertEqual(chooseVoice([english, android]), android, 'Android schrijft nl_NL');
  const better = v('Xander (verbeterd)', 'nl-NL');
  assertEqual(chooseVoice([xander, better, ellen]), better, 'de betere stem als die er is');
});

test('Spraak', 'Dezelfde zin vlak na elkaar klinkt maar één keer, ook om en om', () => {
  const recent = [{ text: 'Tik op een groene stip.', at: 1000 }, { text: 'Wit is aan zet.', at: 1500 }];
  assert(isRepeat('Tik op een groene stip.', recent, 1000 + REPEAT_MS - 1), 'binnen de tijd: niet nog eens');
  assert(isRepeat('Wit is aan zet.', recent, 2000), 'ook de zin daarvoor niet (aan- en uitklikken)');
  assert(!isRepeat('Tik op een groene stip.', recent, 1000 + REPEAT_MS), 'later wel');
  assert(!isRepeat('Goed zo!', recent, 1001), 'een andere zin wel');
  assert(!isRepeat('Goed zo!', [], 0), 'de eerste zin altijd');
  assert(!isRepeat('Goed zo!', null, 0));
});

test('Spraak', 'Geluidjes zijn kort en zacht, en er is geen fout-geluid', () => {
  assertEqual(Object.keys(SOUNDS).sort(), ['badge', 'capture', 'hop', 'king', 'success']);
  for (const [name, notes] of Object.entries(SOUNDS)) {
    assert(notes.length > 0, name);
    for (const n of notes) {
      assert(n.gain > 0 && n.gain <= 0.25, `${name}: te hard (${n.gain})`);
      assert(n.at + n.dur <= 1, `${name}: te lang`);
      assert(n.freq >= 100 && n.freq <= 2000, `${name}: rare toonhoogte`);
      assert(['sine', 'triangle'].includes(n.type), `${name}: alleen zachte klanken`);
    }
  }
});

test('Spraak', 'Spraak en geluid per kind: standaard aan, apart uit te zetten, mee in de reservekopie', () => {
  let file;
  withStore({ 'dammie.v1': JSON.stringify(OLD_PROGRESS) }, () => {
    assertEqual(loadSettings(), { speech: true, sound: true }, 'oude voortgang: alles aan');
    const vos = listProfiles()[0];
    updateProfile(vos.id, { animal: 'vos' });
    const beer = addProfile({ animal: 'beer' });
    assertEqual(loadSettings(), { speech: true, sound: true }, 'nieuw kind: alles aan');
    updateProfile(beer.id, { settings: { sound: false } });
    assertEqual(loadSettings(), { speech: true, sound: false }, 'alleen geluid uit');
    switchProfile(vos.id);
    assertEqual(loadSettings(), { speech: true, sound: true }, 'vos heeft er geen last van');
    updateProfile(vos.id, { settings: { speech: false } });
    file = exportBackup();
  });
  withStore({}, () => {
    assertEqual(loadSettings(), { speech: true, sound: true }, 'nog geen kind: alles aan');
    assert(importBackup(file).ok);
    assertEqual(listProfiles().map((p) => p.settings), [{ speech: false, sound: true }, { speech: true, sound: false }]);
  });
  withStore({}, () => {
    const odd = JSON.stringify({ app: 'dammie', profiles: [{ id: 'p1', animal: 'uil', settings: { speech: 'nee', sound: 0 } }] });
    assert(importBackup(odd).ok);
    assertEqual(loadSettings(), { speech: true, sound: true }, 'alleen een echte "uit" zet iets uit');
  });
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
