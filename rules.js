// rules.js — de spelregels van internationaal dammen (FMJD Annex 1).
//
// Eén regelmodule voor alle bordgroottes (6x6, 8x8, 10x10). Nergens staat
// "10" of "50" vast in de code: alles volgt uit `size`.
//
// Begrippen:
//  - veld:   een donker veld, genummerd 1..N (linksboven naar rechtsonder,
//            per rij), zoals in de officiële damnotatie.
//  - stuk:   'w' witte schijf, 'W' witte dam, 'b' zwarte schijf, 'B' zwarte dam,
//            '.' leeg veld.
//  - zet:    { from, to, path, captures, promotes }
//            path     = [from, landingsveld1, landingsveld2, ..., to]
//            captures = geslagen velden in volgorde van slaan (leeg = gewone zet)
//
// Opties (voor lessen, om regels tijdelijk uit te zetten):
//  - damHalen            (standaard true)  schijf op de overkant wordt dam
//  - slagplicht          (standaard true)  slaan is verplicht
//  - meerslagGaatVoor    (standaard true)  alleen de slag(en) met de meeste stukken
//  - schijfSlaatAchteruit(standaard true)  schijf mag ook achteruit slaan
//  - slaan               (standaard true)  false = niemand kan slaan (mini-partij
//                                          na les 4, voordat slaan geleerd is)
//  - eersteDamWint       (standaard false) true = wie het eerst een dam haalt, wint

export const EMPTY = '.';
export const WHITE = 'w';
export const BLACK = 'b';

export const DEFAULT_OPTIONS = Object.freeze({
  damHalen: true,
  slagplicht: true,
  meerslagGaatVoor: true,
  schijfSlaatAchteruit: true,
  slaan: true,
  eersteDamWint: false,
});

export const SUPPORTED_SIZES = [6, 8, 10];

// Remise-grenzen in halve zetten (ply). "25 zetten per speler" = 50 ply.
const KING_ONLY_DRAW_PLIES = 50; // art. 6.2
const ENDGAME_16_PLIES = 32;     // art. 6.3
const ENDGAME_5_PLIES = 10;      // art. 6.4

// ---------------------------------------------------------------------------
// Stukken
// ---------------------------------------------------------------------------

export function colorOf(piece) {
  if (piece === 'w' || piece === 'W') return WHITE;
  if (piece === 'b' || piece === 'B') return BLACK;
  return null;
}

export function isKing(piece) {
  return piece === 'W' || piece === 'B';
}

export function opponent(color) {
  return color === WHITE ? BLACK : WHITE;
}

function kingOf(color) {
  return color === WHITE ? 'W' : 'B';
}

function manOf(color) {
  return color === WHITE ? 'w' : 'b';
}

// ---------------------------------------------------------------------------
// Bordgeometrie (één keer per bordgrootte uitgerekend en bewaard)
// ---------------------------------------------------------------------------

// Richtingen als [rij-stap, kolom-stap]. Rij 0 is de bovenste rij (zwarte kant).
const DIRS = [
  [-1, -1], // linksboven
  [-1, 1],  // rechtsboven
  [1, -1],  // linksonder
  [1, 1],   // rechtsonder
];

const geometryCache = new Map();

// Donker veld: linksonder (rij N-1, kolom 0) is donker, voor beide spelers
// (FMJD 2.4). Bij een even bordgrootte is dat zo als (rij + kolom) oneven is.
export function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}

export function getGeometry(size) {
  if (!SUPPORTED_SIZES.includes(size)) {
    throw new Error(`Bordgrootte ${size} wordt niet ondersteund (kies 6, 8 of 10).`);
  }
  if (geometryCache.has(size)) return geometryCache.get(size);

  const perRow = size / 2;
  const count = size * perRow;
  const coords = [null]; // coords[veld] = { row, col }; index 0 ongebruikt
  const squareAt = Array.from({ length: size }, () => new Array(size).fill(0));

  let n = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isDarkSquare(row, col)) {
        n++;
        coords[n] = { row, col };
        squareAt[row][col] = n;
      }
    }
  }

  // rays[veld][richting] = lijst velden in die richting, dichtstbijzijnde eerst
  const rays = [null];
  for (let sq = 1; sq <= count; sq++) {
    const { row, col } = coords[sq];
    rays[sq] = DIRS.map(([dr, dc]) => {
      const ray = [];
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < size && c >= 0 && c < size) {
        ray.push(squareAt[r][c]);
        r += dr;
        c += dc;
      }
      return ray;
    });
  }

  const geo = { size, perRow, count, coords, squareAt, rays };
  geometryCache.set(size, geo);
  return geo;
}

// Rij waarop een schijf van deze kleur dam wordt.
function promotionRow(color, size) {
  return color === WHITE ? 0 : size - 1;
}

// Is richting `dirIndex` "vooruit" voor deze kleur? Wit gaat omhoog, zwart omlaag.
function isForward(color, dirIndex) {
  const dr = DIRS[dirIndex][0];
  return color === WHITE ? dr < 0 : dr > 0;
}

// ---------------------------------------------------------------------------
// Standen maken
// ---------------------------------------------------------------------------

export function emptyBoard(size) {
  const geo = getGeometry(size);
  const board = new Array(geo.count + 1).fill(EMPTY);
  board[0] = null; // index 0 wordt niet gebruikt
  return board;
}

// Beginstand: (N/2 - 1) rijen per speler. 10x10: 20 stukken, 8x8: 12, 6x6: 6.
export function initialBoard(size) {
  const geo = getGeometry(size);
  const board = emptyBoard(size);
  const rowsPerSide = size / 2 - 1;
  const perSide = rowsPerSide * geo.perRow;
  for (let sq = 1; sq <= perSide; sq++) board[sq] = 'b';
  for (let sq = geo.count - perSide + 1; sq <= geo.count; sq++) board[sq] = 'w';
  return board;
}

// Een nieuw spel. Met `fen` (bijv. "W:W31,32,K45:B1,2") start je vanaf een
// eigen stand; zonder `fen` vanaf de beginstand.
export function createGame({ size = 10, options = {}, fen = null } = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let board;
  let turn;
  if (fen) {
    ({ board, turn } = parseFen(fen, size));
  } else {
    board = initialBoard(size);
    turn = WHITE;
  }
  return newGameState(size, board, turn, opts);
}

function newGameState(size, board, turn, options) {
  const game = {
    size,
    board,
    turn,
    options,
    history: [],        // standen sinds de laatste onomkeerbare zet (voor herhaling)
    kingOnlyPlies: 0,   // halve zetten achter elkaar met alleen damzetten zonder slag
    endgame: null,      // { limit: 16 | 5, plies } als een 16/5-eindspel loopt
    plies: 0,           // totaal aantal gespeelde halve zetten
    lastMove: null,
  };
  game.history = [positionKey(game)];
  const type = endgameLimit(board);
  game.endgame = type ? { limit: type, plies: 0 } : null;
  return game;
}

// ---------------------------------------------------------------------------
// FEN-notatie (zoals in PDN): "W:W31,32,K45:B1,2,K3"
//   eerste letter = wie aan zet is, daarna witte en zwarte stukken; K = dam.
// ---------------------------------------------------------------------------

export function parseFen(fen, size = 10) {
  const geo = getGeometry(size);
  const board = emptyBoard(size);
  const parts = fen.trim().replace(/\.$/, '').split(':');
  const turnChar = parts[0].trim().toUpperCase();
  if (turnChar !== 'W' && turnChar !== 'B') {
    throw new Error(`FEN: onbekende speler aan zet "${parts[0]}"`);
  }
  const turn = turnChar === 'W' ? WHITE : BLACK;

  for (const part of parts.slice(1)) {
    const p = part.trim();
    if (!p) continue;
    const color = p[0].toUpperCase() === 'W' ? WHITE : BLACK;
    const list = p.slice(1).trim();
    if (!list) continue;
    for (const raw of list.split(',')) {
      let item = raw.trim();
      if (!item) continue;
      let king = false;
      if (item[0].toUpperCase() === 'K') {
        king = true;
        item = item.slice(1);
      }
      const range = item.split('-').map(Number);
      const [a, b] = range.length === 2 ? range : [range[0], range[0]];
      for (let sq = a; sq <= b; sq++) {
        if (!Number.isInteger(sq) || sq < 1 || sq > geo.count) {
          throw new Error(`FEN: veld ${item} bestaat niet op een ${size}x${size}-bord`);
        }
        if (board[sq] !== EMPTY) throw new Error(`FEN: veld ${sq} staat dubbel`);
        board[sq] = king ? kingOf(color) : manOf(color);
      }
    }
  }
  return { board, turn };
}

export function toFen(game) {
  const { board } = game;
  const list = (color) => {
    const items = [];
    for (let sq = 1; sq < board.length; sq++) {
      if (colorOf(board[sq]) === color) items.push((isKing(board[sq]) ? 'K' : '') + sq);
    }
    return items.join(',');
  };
  const t = game.turn === WHITE ? 'W' : 'B';
  return `${t}:W${list(WHITE)}:B${list(BLACK)}`;
}

// Unieke tekst voor een stand inclusief wie aan zet is (voor herhaling).
export function positionKey(game) {
  return game.turn + board_toString(game.board);
}

function board_toString(board) {
  return board.slice(1).join('');
}

// ---------------------------------------------------------------------------
// Zetten genereren
// ---------------------------------------------------------------------------

// Alle slagen voor één stuk. Geeft alleen VOLLEDIGE slagen terug: een slag
// stopt pas als er niets meer te slaan valt (doorslaan is verplicht).
//
// Belangrijk (FMJD 4.8 en 4.11, de "Turkse slag"): geslagen stukken blijven
// tijdens de slag op het bord staan. Ze blokkeren dus nog, en je mag niet
// twee keer over hetzelfde stuk springen. Het beginveld van het slaande stuk
// telt wél als leeg (het stuk is daar weggegaan).
function capturesForPiece(board, geo, from, opts) {
  const piece = board[from];
  const color = colorOf(piece);
  const king = isKing(piece);
  const results = [];
  const path = [from];
  const captured = [];
  const isCaptured = new Array(geo.count + 1).fill(false);

  const isEmptySq = (sq) => board[sq] === EMPTY || sq === from;
  const isEnemy = (sq) => colorOf(board[sq]) === opponent(color);

  function search(sq) {
    let foundAny = false;
    for (let d = 0; d < 4; d++) {
      if (!king && !opts.schijfSlaatAchteruit && !isForward(color, d)) continue;
      const ray = geo.rays[sq][d];
      let i = 0;
      if (king) {
        // Een (vliegende) dam glijdt eerst over lege velden.
        while (i < ray.length && isEmptySq(ray[i])) i++;
      }
      if (i >= ray.length) continue;
      const target = ray[i];
      if (!isEnemy(target) || isCaptured[target]) continue; // eigen stuk of al geslagen: blokkeert

      // Landingsvelden: direct erachter (schijf), of elk leeg veld erachter (dam).
      for (let j = i + 1; j < ray.length; j++) {
        const landing = ray[j];
        if (!isEmptySq(landing)) break; // ook een al geslagen stuk blokkeert
        foundAny = true;
        isCaptured[target] = true;
        captured.push(target);
        path.push(landing);
        search(landing);
        path.pop();
        captured.pop();
        isCaptured[target] = false;
        if (!king) break; // een schijf landt alleen direct achter het stuk
      }
    }
    if (!foundAny && captured.length > 0) {
      const to = path[path.length - 1];
      results.push({
        from,
        to,
        path: path.slice(),
        captures: captured.slice(),
        promotes: !king && opts.damHalen && geo.coords[to].row === promotionRow(color, geo.size),
      });
    }
  }

  search(from);
  return results;
}

function simpleMovesForPiece(board, geo, from, opts) {
  const piece = board[from];
  const color = colorOf(piece);
  const king = isKing(piece);
  const moves = [];
  for (let d = 0; d < 4; d++) {
    if (!king && !isForward(color, d)) continue; // een schijf zet alleen vooruit
    const ray = geo.rays[from][d];
    for (let i = 0; i < ray.length; i++) {
      const to = ray[i];
      if (board[to] !== EMPTY) break;
      moves.push({
        from,
        to,
        path: [from, to],
        captures: [],
        promotes: !king && opts.damHalen && geo.coords[to].row === promotionRow(color, geo.size),
      });
      if (!king) break; // een schijf zet maar één veld
    }
  }
  return moves;
}

// Zelfde begin, eind én dezelfde geslagen stukken = dezelfde zet (ook al was
// de route anders). Die houden we maar één keer.
function moveKey(m) {
  return `${m.from}-${m.to}:${[...m.captures].sort((a, b) => a - b).join(',')}`;
}

function dedupe(moves) {
  const seen = new Set();
  const out = [];
  for (const m of moves) {
    const k = moveKey(m);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(m);
    }
  }
  return out;
}

// Alle slagen (alle stukken samen), met de meerderheidsregel toegepast als die aan staat.
export function captureMoves(board, size, color, options = DEFAULT_OPTIONS) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!opts.slaan) return [];
  const geo = getGeometry(size);
  let all = [];
  for (let sq = 1; sq <= geo.count; sq++) {
    if (colorOf(board[sq]) === color) all = all.concat(capturesForPiece(board, geo, sq, opts));
  }
  all = dedupe(all);
  if (opts.meerslagGaatVoor && all.length > 0) {
    // Meerderheidsregel (FMJD 4.13): alleen het grootste aantal stukken telt.
    // Een dam telt als één stuk; bij gelijk aantal vrije keus (4.14).
    const max = Math.max(...all.map((m) => m.captures.length));
    all = all.filter((m) => m.captures.length === max);
  }
  return all;
}

export function simpleMoves(board, size, color, options = DEFAULT_OPTIONS) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const geo = getGeometry(size);
  let all = [];
  for (let sq = 1; sq <= geo.count; sq++) {
    if (colorOf(board[sq]) === color) all = all.concat(simpleMovesForPiece(board, geo, sq, opts));
  }
  return all;
}

// Alle legale zetten voor de speler die aan zet is.
export function legalMoves(game) {
  const { board, size, turn, options } = game;
  const caps = captureMoves(board, size, turn, options);
  if (options.slagplicht) {
    if (caps.length > 0) return caps;
    return simpleMoves(board, size, turn, options);
  }
  return caps.concat(simpleMoves(board, size, turn, options));
}

// ---------------------------------------------------------------------------
// Zetten uitvoeren
// ---------------------------------------------------------------------------

// Past een zet toe op een bord en geeft een NIEUW bord terug.
// Geslagen stukken verdwijnen pas hier, na de hele slag (FMJD 4.11).
export function applyMoveToBoard(board, move) {
  const next = board.slice();
  const piece = next[move.from];
  next[move.from] = EMPTY;
  for (const sq of move.captures) next[sq] = EMPTY;
  next[move.to] = move.promotes ? kingOf(colorOf(piece)) : piece;
  return next;
}

// 16/5-zettenregel: welke grens geldt er in deze stand?
// 16: drie stukken (minstens één dam) tegen één dam   (art. 6.3)
//  5: twee of één stuk(ken) (minstens één dam) tegen één dam (art. 6.4)
export function endgameLimit(board) {
  const count = { w: 0, W: 0, b: 0, B: 0 };
  for (let sq = 1; sq < board.length; sq++) {
    if (board[sq] !== EMPTY) count[board[sq]]++;
  }
  const check = (strongMen, strongKings, weakMen, weakKings) => {
    if (weakMen !== 0 || weakKings !== 1) return null;
    const total = strongMen + strongKings;
    if (strongKings < 1) return null;
    if (total === 3) return 16;
    if (total === 1 || total === 2) return 5;
    return null;
  };
  return check(count.w, count.W, count.b, count.B) || check(count.b, count.B, count.w, count.W);
}

// Speelt een zet en geeft een NIEUWE spelstand terug (de oude blijft bestaan,
// handig voor "terugzetten").
export function play(game, move) {
  const movedPiece = game.board[move.from];
  const board = applyMoveToBoard(game.board, move);
  const irreversible = move.captures.length > 0 || !isKing(movedPiece);

  const next = {
    ...game,
    board,
    turn: opponent(game.turn),
    plies: game.plies + 1,
    lastMove: move,
  };

  // 25-zettenregel: alleen damzetten zonder slag tellen door.
  next.kingOnlyPlies = irreversible ? 0 : game.kingOnlyPlies + 1;

  // Herhaling kan niet over een slag of schijfzet heen, dus daar beginnen we opnieuw.
  const key = positionKey(next);
  next.history = irreversible ? [key] : game.history.concat(key);

  // 16/5-zettenregel: teller start zodra de stukverhouding ontstaat, en begint
  // opnieuw als de verhouding naar een andere regel overgaat (niet "gestapeld").
  const limit = endgameLimit(board);
  if (!limit) next.endgame = null;
  else if (game.endgame && game.endgame.limit === limit) {
    next.endgame = { limit, plies: game.endgame.plies + 1 };
  } else next.endgame = { limit, plies: 0 };

  return next;
}

// ---------------------------------------------------------------------------
// Einde van de partij
// ---------------------------------------------------------------------------

// Geeft { over, winner, reason } terug.
//   reason: 'geen-stukken' | 'geen-zetten' | 'eerste-dam' | 'herhaling' | '25-zetten' | '16-zetten' | '5-zetten'
export function gameStatus(game) {
  if (game.options.eersteDamWint) {
    const king = game.board.find((p, sq) => sq > 0 && isKing(p));
    if (king) return { over: true, winner: colorOf(king), reason: 'eerste-dam' };
  }
  const hasPieces = game.board.some((p, sq) => sq > 0 && colorOf(p) === game.turn);
  if (!hasPieces) return { over: true, winner: opponent(game.turn), reason: 'geen-stukken' };
  if (legalMoves(game).length === 0) {
    return { over: true, winner: opponent(game.turn), reason: 'geen-zetten' };
  }

  const key = game.history[game.history.length - 1];
  const repeats = game.history.filter((k) => k === key).length;
  if (repeats >= 3) return { over: true, winner: null, reason: 'herhaling' };

  if (game.kingOnlyPlies >= KING_ONLY_DRAW_PLIES) {
    return { over: true, winner: null, reason: '25-zetten' };
  }

  if (game.endgame) {
    const max = game.endgame.limit === 16 ? ENDGAME_16_PLIES : ENDGAME_5_PLIES;
    if (game.endgame.plies >= max) {
      return { over: true, winner: null, reason: `${game.endgame.limit}-zetten` };
    }
  }

  return { over: false, winner: null, reason: null };
}

// ---------------------------------------------------------------------------
// Notatie en hulpjes voor de interface
// ---------------------------------------------------------------------------

// "32-28" voor een gewone zet, "32x12" voor een slag (kort: begin en eind).
export function moveToString(move) {
  return move.captures.length > 0 ? `${move.from}x${move.to}` : `${move.from}-${move.to}`;
}

// Lange notatie met alle landingsvelden: "32x21x12".
export function moveToLongString(move) {
  return move.captures.length > 0 ? move.path.join('x') : `${move.from}-${move.to}`;
}

// Zoek legale zetten bij een begin- en eindveld (handig bij tikken).
// Meer dan één resultaat = dubbelzinnig: vraag dan om tussenvelden.
export function findMoves(game, from, to) {
  return legalMoves(game).filter((m) => m.from === from && m.to === to);
}

// Telt het aantal mogelijke zetreeksen tot een bepaalde diepte ("perft").
// Wordt in de tests gebruikt om de zetgenerator te controleren.
export function perft(game, depth) {
  if (depth === 0) return 1;
  const moves = legalMoves(game);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const m of moves) {
    const board = applyMoveToBoard(game.board, m);
    total += perft({ ...game, board, turn: opponent(game.turn) }, depth - 1);
  }
  return total;
}
