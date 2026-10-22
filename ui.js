// ui.js — de schermen van de app: kies een bord, speel samen, uitslag.
//
// Fase 2: twee spelers op één apparaat (ouder en kind). Lessen, computer,
// spraak en opslaan komen in latere fases.

import { createGame, play, gameStatus, legalMoves, isKing, getGeometry } from './rules.js';
import { createBoardView } from './board.js';

const MIN_CELL_PX = 40; // kleinere vakjes zijn te priegelig voor kleine vingers

const SIZES = [
  { size: 6, name: 'Klein', note: '6 × 6' },
  { size: 8, name: 'Middel', note: '8 × 8' },
  { size: 10, name: 'Groot', note: '10 × 10' },
];

const DAMMIE_SVG = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="34" r="27" fill="#7a4a24"/>
  <circle cx="32" cy="31" r="27" fill="#fff6e6" stroke="#7a4a24" stroke-width="2.5"/>
  <circle cx="32" cy="31" r="19" fill="none" stroke="#e7d3b3" stroke-width="2.5"/>
  <circle cx="24" cy="27" r="4.2" fill="#2b1d12"/><circle cx="40" cy="27" r="4.2" fill="#2b1d12"/>
  <circle cx="25.4" cy="25.6" r="1.4" fill="#fff"/><circle cx="41.4" cy="25.6" r="1.4" fill="#fff"/>
  <path d="M23 37 q9 8 18 0" fill="none" stroke="#2b1d12" stroke-width="3" stroke-linecap="round"/>
  <circle cx="18" cy="35" r="3" fill="#f6b8a8" opacity=".8"/><circle cx="46" cy="35" r="3" fill="#f6b8a8" opacity=".8"/>
</svg>`;

const app = document.getElementById('app');

// Huidige partij (alleen in het geheugen; opslaan komt in fase 6).
let current = null; // { history: [game, ...] }

// ---------------------------------------------------------------------------
// Hulpjes voor taal
// ---------------------------------------------------------------------------

const colorName = (c) => (c === 'w' ? 'Wit' : 'Zwart');
const colorNameLower = (c) => (c === 'w' ? 'wit' : 'zwart');
const pieceWord = (piece) => (isKing(piece) ? 'dam' : 'schijf');
const piecesWord = (n) => (n === 1 ? 'stuk' : 'stukken');

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.append(c);
  return e;
}

function dammieBubble(text, extraClass = '') {
  const textEl = el('p', { class: 'bubble-text', text, 'aria-live': 'polite' });
  const box = el('div', { class: `dammie ${extraClass}` }, [
    el('div', { class: 'dammie-face', html: DAMMIE_SVG }),
    el('div', { class: 'bubble' }, [textEl]),
  ]);
  return { box, say: (t) => (textEl.textContent = t) };
}

// Past een bord van deze grootte met grote genoeg vakjes op het scherm?
function fitsScreen(size) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Staand: knoppen boven, Dammie onder. Liggend: alles naast het bord.
  const portrait = Math.min(w - 24, h - 230);
  const landscape = Math.min(w - 300, h - 24);
  return Math.max(portrait, landscape) / size >= MIN_CELL_PX;
}

// ---------------------------------------------------------------------------
// Startscherm
// ---------------------------------------------------------------------------

function miniBoard(size) {
  const geo = getGeometry(size);
  const cells = [];
  const rows = size / 2 - 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dark = geo.squareAt[r][c] > 0;
      let dot = null;
      if (dark && r < rows) dot = el('i', { class: 'b' });
      if (dark && r >= size - rows) dot = el('i', { class: 'w' });
      cells.push(el('span', { class: dark ? 'd' : 'l' }, dot ? [dot] : []));
    }
  }
  return el('div', { class: 'mini', style: `--n:${size}` }, cells);
}

function showStart() {
  const { box } = dammieBubble('Hoi! Ik ben Dammie. Op welk bord gaan we samen spelen?');
  const buttons = SIZES.map(({ size, name, note }) => {
    const ok = fitsScreen(size);
    return el(
      'button',
      {
        class: 'size-card',
        type: 'button',
        disabled: !ok,
        'aria-label': `${name} bord, ${note}${ok ? '' : ', scherm te klein'}`,
        onclick: () => startGame(size),
      },
      [miniBoard(size), el('strong', { text: name }), el('span', { class: 'note', text: ok ? note : 'groter scherm nodig' })],
    );
  });

  const children = [box, el('div', { class: 'sizes' }, buttons)];
  if (current && !gameStatus(last()).over) {
    children.push(el('button', { class: 'big-btn', type: 'button', onclick: showGame }, ['▶ Verder spelen']));
  }
  children.push(
    el('p', { class: 'small', text: 'Wit en zwart spelen om de beurt op dit apparaat. Deze app verzamelt niets.' }),
  );
  app.replaceChildren(el('main', { class: 'screen start' }, children));
}

// ---------------------------------------------------------------------------
// Spelscherm
// ---------------------------------------------------------------------------

const last = () => current.history[current.history.length - 1];

function startGame(size) {
  current = { history: [createGame({ size })] };
  showGame('Wit begint. Tik op een witte schijf.');
}

function turnText(game) {
  const moves = legalMoves(game);
  const who = colorName(game.turn);
  if (moves.length && moves[0].captures.length > 0) {
    const max = moves[0].captures.length;
    return max > 1
      ? `${who}, je moet slaan! Je kunt ${max} stukken slaan. Kijk naar de oranje ring.`
      : `${who}, je moet slaan! Kijk naar de oranje ring.`;
  }
  return `${who} is aan zet.`;
}

function showGame(firstMessage) {
  let game = last();
  const homeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', text: '🏠' });
  const undoBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zet terugnemen', text: '↶' });
  const turnDot = el('span', { class: 'turn-dot' });
  const turnLabel = el('span', { class: 'turn-label' });
  const turnBox = el('div', { class: 'turn' }, [turnDot, turnLabel]);
  const boardWrap = el('div', { class: 'board-wrap' });
  const { box: dammie, say } = dammieBubble('');
  const bar = el('header', { class: 'bar' }, [homeBtn, turnBox, undoBtn]);
  const side = el('div', { class: 'side' }, [bar, dammie]);
  const screen = el('main', { class: `screen game size-${game.size}` }, [side, boardWrap]);
  app.replaceChildren(screen);

  const view = createBoardView(boardWrap, { onMove: handleMove, onFeedback: handleFeedback });

  function refresh(message) {
    game = last();
    view.setGame(game);
    turnDot.className = `turn-dot ${game.turn === 'w' ? 'white' : 'black'}`;
    turnLabel.textContent = `${colorName(game.turn)} is aan zet`;
    undoBtn.disabled = current.history.length < 2;
    say(message || turnText(game));
    const status = gameStatus(game);
    if (status.over) {
      const { title, why } = resultText(status);
      turnDot.className = 'turn-dot';
      turnLabel.textContent = status.winner ? `${colorName(status.winner)} wint` : 'Gelijkspel';
      say(`${title} ${why}`);
      view.setInteractive(false);
      showResult(status, game, undo);
    } else {
      view.setInteractive(true);
    }
  }

  async function handleMove(move) {
    const before = game;
    const mover = before.board[move.from];
    undoBtn.disabled = true;
    await view.animateMove(move);
    current.history.push(play(before, move));
    const after = last();

    let msg = turnText(after);
    const n = move.captures.length;
    if (move.promotes) msg = `Hoera, een dam voor ${colorNameLower(before.turn)}! 👑 ${msg}`;
    else if (n > 1) msg = `Wauw, ${n} ${piecesWord(n)} in één keer! ${msg}`;
    else if (n === 1 && !isKing(mover)) msg = `Goed geslagen! ${msg}`;
    refresh(msg);
  }

  function handleFeedback(result, g) {
    const who = colorNameLower(g.turn);
    const piece = result.from ? pieceWord(g.board[result.from]) : 'schijf';
    switch (result.type) {
      case 'select':
        say(isKing(g.board[result.from])
          ? 'Een dam mag ver vliegen! Tik op een groene stip.'
          : 'Tik op een groene stip.');
        break;
      case 'deselect':
        say(turnText(g));
        break;
      case 'blocked':
        say(result.reason === 'moet-slaan'
          ? `Deze ${piece} kan niet slaan. Kijk naar de oranje ring!`
          : `Deze ${piece} kan nu niet zetten. Probeer een andere.`);
        break;
      case 'opponent':
        say(`Dat is een stuk van ${colorNameLower(g.turn === 'w' ? 'b' : 'w')}. ${colorName(g.turn)} is aan zet.`);
        break;
      case 'empty':
        say(`Tik eerst op een ${who === 'wit' ? 'witte' : 'zwarte'} schijf.`);
        break;
      case 'invalid-target':
        say('Daar mag hij niet heen. Kies een groene stip.');
        break;
      case 'route':
        say('Er zijn meer wegen naar dit veld! Tik op het veld waar je stuk tussendoor landt.');
        break;
      default:
        break;
    }
  }

  homeBtn.addEventListener('click', showStart);
  function undo() {
    if (current.history.length < 2) return;
    current.history.pop();
    closeResult();
    refresh(`Zet teruggenomen. ${turnText(last())}`);
  }
  undoBtn.addEventListener('click', undo);

  refresh(firstMessage);
}

// ---------------------------------------------------------------------------
// Uitslag
// ---------------------------------------------------------------------------

function resultText(status) {
  if (status.winner) {
    const loser = colorName(status.winner === 'w' ? 'b' : 'w');
    const why = status.reason === 'geen-stukken'
      ? `${loser} heeft geen stukken meer.`
      : `${loser} kan niet meer zetten. Vastgezet!`;
    return { title: `${colorName(status.winner)} wint! 🏆`, why };
  }
  const why = {
    herhaling: 'Drie keer dezelfde stand. Niemand kan nog winnen.',
    '25-zetten': '25 zetten alleen met dammen geschoven.',
    '16-zetten': 'Het eindspel duurde te lang: niemand kan nog winnen.',
    '5-zetten': 'Dam tegen dam: niemand kan nog winnen.',
  }[status.reason];
  return { title: 'Gelijkspel! 🤝', why };
}

function closeResult() {
  document.querySelector('.result')?.remove();
}

function showResult(status, game, onUndo) {
  closeResult();
  const { title, why } = resultText(status);
  const dialog = el('div', { class: 'result', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('div', { class: 'result-card' }, [
      el('div', { class: 'dammie-face big', html: DAMMIE_SVG }),
      el('h2', { text: title }),
      el('p', { text: why }),
      el('div', { class: 'result-buttons' }, [
        el('button', { class: 'big-btn', type: 'button', onclick: () => { closeResult(); startGame(game.size); } }, ['↻ Nog een keer']),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Laatste zet terugnemen', onclick: onUndo }, ['↶']),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: () => { closeResult(); current = null; showStart(); } }, ['🏠']),
      ]),
    ]),
  ]);
  document.body.append(dialog);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (app.querySelector('.start')) showStart();
  }, 200);
});

showStart();
