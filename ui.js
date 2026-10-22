// ui.js — de schermen van de app: startscherm, samen spelen, uitslag.
// De lessen staan in lessons-ui.js, de puzzels in puzzles-ui.js.

import { createGame, play, gameStatus, isKing, getGeometry } from './rules.js';
import { createBoardView } from './board.js';
import { el, dammieBubble, DAMMIE_SVG, colorName, colorNameLower, turnText, feedbackText } from './shared.js';
import { showLessonMap } from './lessons-ui.js';
import { showPuzzleMap } from './puzzles-ui.js';

const MIN_CELL_PX = 40; // kleinere vakjes zijn te priegelig voor kleine vingers

const SIZES = [
  { size: 6, name: 'Klein', note: '6 × 6' },
  { size: 8, name: 'Middel', note: '8 × 8' },
  { size: 10, name: 'Groot', note: '10 × 10' },
];

const app = document.getElementById('app');

// Huidige partij (alleen in het geheugen; opslaan komt in fase 6).
let current = null; // { history: [game, ...] }
const last = () => current.history[current.history.length - 1];

const piecesWord = (n) => (n === 1 ? 'stuk' : 'stukken');

// Past een bord van deze grootte met grote genoeg vakjes op het scherm?
function fitsScreen(size) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Staand: knoppen boven, Dammie onder. Liggend: alles naast het bord.
  const portrait = Math.min(w - 24, h - 230);
  const landscape = Math.min(w - 300, h - 24);
  return Math.max(portrait, landscape) / size >= MIN_CELL_PX;
}

const homeButton = (onclick) =>
  el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick }, ['🏠']);

// ---------------------------------------------------------------------------
// Startscherm: lessen of samen spelen
// ---------------------------------------------------------------------------

// Waar de lessen en puzzels naartoe kunnen (terug naar het begin, naar de lessen).
const nav = {
  home: () => showStart(),
  lessons: () => showLessonMap(app, nav),
  doneForToday: () => showStart('Goed gedaan vandaag! Tot een andere keer.'),
};

function showStart(greeting = 'Hoi! Ik ben Dammie. Wat gaan we doen?') {
  const { box } = dammieBubble(greeting);
  const cards = el('div', { class: 'choices' }, [
    el('button', { class: 'choice-card', type: 'button', onclick: nav.lessons }, [
      el('span', { class: 'choice-icon', text: '📚' }),
      el('strong', { text: 'Lessen' }),
      el('span', { class: 'note', text: 'Leer dammen met Dammie' }),
    ]),
    el('button', { class: 'choice-card', type: 'button', onclick: () => showPuzzleMap(app, nav) }, [
      el('span', { class: 'choice-icon', text: '🧩' }),
      el('strong', { text: 'Puzzels' }),
      el('span', { class: 'note', text: 'Zoek de slag!' }),
    ]),
    el('button', { class: 'choice-card', type: 'button', onclick: showSizes }, [
      el('span', { class: 'choice-icon', text: '👫' }),
      el('strong', { text: 'Samen spelen' }),
      el('span', { class: 'note', text: 'Wit tegen zwart op dit apparaat' }),
    ]),
  ]);
  const children = [box, cards];
  if (current && !gameStatus(last()).over) {
    children.push(el('button', { class: 'big-btn', type: 'button', onclick: () => showGame() }, ['▶ Verder spelen']));
  }
  children.push(el('p', { class: 'small', text: 'Deze app verzamelt niets. Alles blijft op dit apparaat.' }));
  app.replaceChildren(el('main', { class: 'screen start' }, children));
}

// ---------------------------------------------------------------------------
// Samen spelen: kies een bord
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

function showSizes() {
  const { box } = dammieBubble('Op welk bord gaan we samen spelen?');
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
  app.replaceChildren(
    el('main', { class: 'screen start sizes-screen' }, [
      el('div', { class: 'top-left' }, [homeButton(() => showStart())]),
      box,
      el('div', { class: 'sizes' }, buttons),
      el('p', { class: 'small', text: 'Wit en zwart spelen om de beurt op dit apparaat.' }),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Spelscherm
// ---------------------------------------------------------------------------

function startGame(size) {
  current = { history: [createGame({ size })] };
  showGame('Wit begint. Tik op een witte schijf.');
}

function showGame(firstMessage) {
  let game = last();
  const homeBtn = homeButton(() => showStart());
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

  const view = createBoardView(boardWrap, {
    onMove: handleMove,
    onFeedback: (result, g) => {
      const t = feedbackText(result, g);
      if (t) say(t);
    },
  });

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
    if (app.querySelector('.sizes-screen')) showSizes();
  }, 200);
});

showStart();
