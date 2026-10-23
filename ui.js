// ui.js — de schermen van de app: startscherm, samen spelen, tegen de
// computer (ook de mini-partijen na een les), uitslag.
// De lessen staan in lessons-ui.js, de puzzels in puzzles-ui.js.
// De computer denkt in ai.js; computer.js laat dat op de achtergrond gebeuren.

import { createGame, play, gameStatus, isKing, getGeometry, captureMoves } from './rules.js';
import { createBoardView } from './board.js';
import {
  el,
  dammieBubble,
  DAMMIE_SVG,
  colorName,
  colorNameLower,
  turnText,
  feedbackText,
  piecesText,
  wait,
} from './shared.js';
import { showLessonMap } from './lessons-ui.js';
import { showPuzzleMap } from './puzzles-ui.js';
import { LEVELS, adaptLevel, giveaway, clampLevel, MAX_LEVEL } from './ai.js';
import { askComputer } from './computer.js';
import { loadComputer, saveComputer, saveMiniGamePlayed } from './storage.js';

const MIN_CELL_PX = 40; // kleinere vakjes zijn te priegelig voor kleine vingers

const SIZES = [
  { size: 6, name: 'Klein', note: '6 × 6' },
  { size: 8, name: 'Middel', note: '8 × 8' },
  { size: 10, name: 'Groot', note: '10 × 10' },
];

// Tegen de computer: het kind speelt wit (onderaan) en begint.
const HUMAN = 'w';
const THINK_MIN_MS = 700; // zo lang "denkt" de computer minstens, anders gaat het te snel

const LEVEL_NOTES = {
  1: 'Slaapt half',
  2: 'Speelt voor de grap',
  3: 'Denkt een beetje na',
  4: 'Denkt goed na',
  5: 'Heel sterk!',
};
const levelInfo = (n) => LEVELS[clampLevel(n) - 1];

const app = document.getElementById('app');

// Huidige partij (alleen in het geheugen; opslaan komt in fase 6).
//   config   { size, options, fen, vs: { level } of null, mini, intro }
//   history  [game, ...]
//   counted  uitslag al meegeteld voor het niveau (tegen de computer)
let current = null;
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
// Startscherm
// ---------------------------------------------------------------------------

// Waar de lessen en puzzels naartoe kunnen (terug naar het begin, naar de
// lessen, een mini-partij).
const nav = {
  home: () => showStart(),
  lessons: () => showLessonMap(app, nav),
  doneForToday: () => showStart('Goed gedaan vandaag! Tot een andere keer.'),
  miniGame: (mini) => startMiniGame(mini),
};

function showStart(greeting = 'Hoi! Ik ben Dammie. Wat gaan we doen?') {
  const { box } = dammieBubble(greeting);
  const card = (icon, title, note, onclick) =>
    el('button', { class: 'choice-card', type: 'button', onclick }, [
      el('span', { class: 'choice-icon', text: icon }),
      el('strong', { text: title }),
      el('span', { class: 'note', text: note }),
    ]);
  const cards = el('div', { class: 'choices' }, [
    card('📚', 'Lessen', 'Leer dammen met Dammie', nav.lessons),
    card('🧩', 'Puzzels', 'Zoek de slag!', () => showPuzzleMap(app, nav)),
    card('🤖', 'Tegen de computer', 'Jij speelt met wit', () => showSizes('computer')),
    card('👫', 'Samen spelen', 'Wit tegen zwart op dit apparaat', () => showSizes('together')),
  ]);
  const children = [box, cards];
  if (current && !gameStatus(last()).over) {
    children.push(el('button', { class: 'big-btn', type: 'button', onclick: () => showGame() }, ['▶ Verder spelen']));
  }
  children.push(el('p', { class: 'small', text: 'Deze app verzamelt niets. Alles blijft op dit apparaat.' }));
  app.replaceChildren(el('main', { class: 'screen start' }, children));
}

// ---------------------------------------------------------------------------
// Kies een bord (samen spelen of tegen de computer)
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

// mode: 'together' (samen spelen) of 'computer' (tegen de computer).
function showSizes(mode = 'together') {
  const vs = mode === 'computer';
  const { box } = dammieBubble(vs ? 'Op welk bord speel je tegen de computer?' : 'Op welk bord gaan we samen spelen?');
  const buttons = SIZES.map(({ size, name, note }) => {
    const ok = fitsScreen(size);
    return el(
      'button',
      {
        class: 'size-card',
        type: 'button',
        disabled: !ok,
        'aria-label': `${name} bord, ${note}${ok ? '' : ', scherm te klein'}`,
        onclick: () => (vs ? showLevels(size) : startGame({ size })),
      },
      [miniBoard(size), el('strong', { text: name }), el('span', { class: 'note', text: ok ? note : 'groter scherm nodig' })],
    );
  });
  app.replaceChildren(
    el('main', { class: 'screen start sizes-screen', 'data-mode': mode }, [
      el('div', { class: 'top-left' }, [homeButton(() => showStart())]),
      box,
      el('div', { class: 'sizes' }, buttons),
      el('p', {
        class: 'small',
        text: vs ? 'Jij speelt met wit, de computer met zwart.' : 'Wit en zwart spelen om de beurt op dit apparaat.',
      }),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Tegen de computer: kies hoe sterk
// ---------------------------------------------------------------------------

function showLevels(size) {
  const { level } = loadComputer();
  const advice = levelInfo(level);
  const { box } = dammieBubble(`Hoe sterk mag de computer zijn? Ik denk ${advice.icon} ${advice.name}.`);
  const cards = LEVELS.map((l) =>
    el(
      'button',
      {
        class: `level-card${l.level === advice.level ? ' next' : ''}`,
        type: 'button',
        'aria-label': `Niveau ${l.level}: ${l.name}, ${LEVEL_NOTES[l.level]}`,
        onclick: () => {
          chooseLevel(l.level);
          startGame({ size, vs: { level: l.level } });
        },
      },
      [
        el('span', { class: 'level-icon', text: l.icon }),
        el('strong', { text: l.name }),
        el('span', { class: 'note', text: LEVEL_NOTES[l.level] }),
      ],
    ),
  );
  app.replaceChildren(
    el('main', { class: 'screen start levels-screen' }, [
      el('div', { class: 'top-left' }, [homeButton(() => showStart())]),
      box,
      el('div', { class: 'levels' }, cards),
    ]),
  );
}

// Zelf een ander niveau kiezen: de reeks winst/verlies begint opnieuw.
function chooseLevel(level) {
  if (loadComputer().level !== level) saveComputer({ level, wins: 0, losses: 0 });
}

// ---------------------------------------------------------------------------
// Spelscherm
// ---------------------------------------------------------------------------

function startGame(config) {
  const { size, options = {}, fen = null } = config;
  current = { config, history: [createGame({ size, options, fen })], counted: false };
  const intro = config.intro
    || (config.vs ? 'Jij speelt met wit en mag beginnen. Tik op een witte schijf.' : 'Wit begint. Tik op een witte schijf.');
  showGame(intro);
}

// Mini-partij na een les (zie minigames.js): tegen de computer, met alleen
// de regels die het kind al kent.
function startMiniGame(mini) {
  startGame({
    size: mini.size,
    options: mini.options || {},
    fen: mini.fen || null,
    vs: { level: loadComputer().level },
    mini,
    intro: mini.intro,
  });
}

const meerslagNote = (config) => (config.mini?.explainMeerslag ? ' Dat heet een meerslag. Die leer je in les 9.' : '');

// Wat zegt Dammie na een zet van het kind (of van wit/zwart bij samen spelen)?
function praiseText(move, mover, before, config) {
  const n = move.captures.length;
  if (move.promotes) return config.vs ? 'Hoera, een dam! 👑' : `Hoera, een dam voor ${colorNameLower(before.turn)}! 👑`;
  if (n > 1) return `Wauw, ${n} ${piecesWord(n)} in één keer!${meerslagNote(config)}`;
  if (n === 1 && !isKing(mover)) return 'Goed geslagen!';
  return '';
}

function showGame(firstMessage) {
  const { config } = current;
  const vs = config.vs;
  const opp = vs ? levelInfo(vs.level) : null;
  let game = last();
  const homeBtn = homeButton(() => showStart());
  const undoBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zet terugnemen', text: '↶' });
  const turnDot = el('span', { class: 'turn-dot' });
  const turnLabel = el('span', { class: 'turn-label' });
  const turnBox = el('div', { class: 'turn' }, [turnDot, turnLabel]);
  const boardWrap = el('div', { class: 'board-wrap' });
  const { box: dammie, say } = dammieBubble('');
  const actions = el('div', { class: 'actions' });
  const bar = el('header', { class: 'bar' }, [homeBtn, turnBox, undoBtn]);
  const side = el('div', { class: 'side' }, [bar, dammie, actions]);
  const screen = el('main', { class: `screen game size-${game.size}` }, [side, boardWrap]);
  app.replaceChildren(screen);

  let thinking = false; // de computer is aan het nadenken

  const view = createBoardView(boardWrap, {
    onMove: handleMove,
    onFeedback: (result, g) => {
      const t = feedbackText(result, g);
      if (t) say(vs ? t.replace(/^Wit, je moet/, 'Je moet') : t);
    },
  });

  const humanTurn = (g) => !vs || g.turn === HUMAN;
  const yourTurn = (g) => turnText(g, { you: !!vs });

  function showTurn(g) {
    turnDot.className = `turn-dot ${g.turn === 'w' ? 'white' : 'black'}`;
    if (!vs) turnLabel.textContent = `${colorName(g.turn)} is aan zet`;
    else turnLabel.textContent = g.turn === HUMAN ? 'Jij bent aan zet' : `${opp.icon} ${opp.name} is aan zet`;
  }

  // Toont de laatste stand. `text` = wat Dammie zegt. Is de computer aan
  // zet, dan zegt Dammie eerst `text` en gaat de computer nadenken.
  function refresh(text) {
    game = last();
    view.setGame(game);
    view.setDecorations({});
    actions.replaceChildren();
    showTurn(game);
    undoBtn.disabled = thinking || current.history.length < 2;
    const status = gameStatus(game);
    if (status.over) {
      finish(status);
    } else if (humanTurn(game)) {
      view.setInteractive(true);
      say(text || yourTurn(game));
    } else {
      computerTurn(text);
    }
  }

  async function handleMove(move) {
    const before = game;
    const mover = before.board[move.from];
    undoBtn.disabled = true;
    await view.animateMove(move);
    current.history.push(play(before, move));
    const after = last();
    const praise = praiseText(move, mover, before, config);
    if (!vs) return refresh(praise ? `${praise} ${turnText(after)}` : null);

    // Tegen de computer: gaf het kind net iets weg? Dan eerst even vragen.
    const gift = !gameStatus(after).over && giveaway(before, move);
    if (gift) return offerRetry(gift, praise);
    return refresh(praise);
  }

  // "Oei! Nu kan Slaapkop 2 stukken slaan. Zullen we het nog eens proberen?"
  // De zwarte stukken die kunnen slaan lichten op.
  function offerRetry(gift, praise) {
    game = last();
    view.setGame(game);
    view.setInteractive(false);
    showTurn(game);
    undoBtn.disabled = false;
    const attackers = captureMoves(game.board, game.size, game.turn, game.options).map((m) => m.from);
    view.setDecorations({ glow: [...new Set(attackers)] });
    say(`Oei! Nu kan ${opp.name} ${piecesText(gift.take)} slaan. Zullen we het nog eens proberen?`);
    actions.replaceChildren(
      el('div', { class: 'choice-buttons' }, [
        el('button', { class: 'big-btn', type: 'button', onclick: undo }, ['↶ Nog eens']),
        el('button', { class: 'big-btn soft', type: 'button', onclick: () => refresh(praise) }, ['▶ Speel door']),
      ]),
    );
  }

  async function computerTurn(text) {
    thinking = true;
    undoBtn.disabled = true;
    view.setInteractive(false);
    say(`${text ? `${text} ` : ''}${opp.icon} ${opp.name} denkt na…`);
    const before = last();
    const [move] = await Promise.all([askComputer(before, vs.level), wait(THINK_MIN_MS)]);
    // Ben je intussen naar een ander scherm gegaan? Dan telt deze zet niet.
    if (!screen.isConnected || last() !== before) return;
    if (move) await view.animateMove(move);
    if (!screen.isConnected || last() !== before) return;
    thinking = false;
    if (!move) return refresh(); // kan niet (dan was de partij al uit), maar voor de zekerheid
    current.history.push(play(before, move));
    return refresh(computerText(move));
  }

  // Wat zegt Dammie na een zet van de computer?
  function computerText(move) {
    const n = move.captures.length;
    const after = last();
    let t = '';
    if (move.promotes) t = `${opp.name} heeft een dam! 👑`;
    else if (n > 1) t = `${opp.name} sloeg ${n} stukken in één keer.${meerslagNote(config)}`;
    else if (n === 1) t = `${opp.name} sloeg 1 stuk.`;
    if (gameStatus(after).over) return t;
    return t ? `${t} ${yourTurn(after)}` : yourTurn(after);
  }

  function undo() {
    if (thinking || current.history.length < 2) return;
    current.history.pop();
    // Tegen de computer: terug tot het kind weer aan zet is.
    if (vs) while (current.history.length > 1 && last().turn !== HUMAN) current.history.pop();
    closeResult();
    refresh(`Zet teruggenomen. ${yourTurn(last())}`);
  }
  undoBtn.addEventListener('click', undo);

  function finish(status) {
    const { title, why } = resultText(status, opp);
    turnDot.className = 'turn-dot';
    if (!status.winner) turnLabel.textContent = 'Gelijkspel';
    else if (!vs) turnLabel.textContent = `${colorName(status.winner)} wint`;
    else turnLabel.textContent = status.winner === HUMAN ? 'Jij wint' : `${opp.name} wint`;
    say(`${title} ${why}`);
    view.setInteractive(false);

    // Tegen de computer: één keer per partij meetellen voor het niveau.
    let suggestUp = false;
    if (vs && !current.counted) {
      current.counted = true;
      const result = !status.winner ? 'draw' : status.winner === HUMAN ? 'win' : 'loss';
      const saved = loadComputer();
      const base = saved.level === vs.level ? saved : { level: vs.level, wins: 0, losses: 0 };
      const out = adaptLevel(base, result);
      saveComputer(out.state);
      suggestUp = out.suggestUp;
      if (config.mini) saveMiniGamePlayed(config.mini.id);
    }
    showResult({ title, why }, { onUndo: undo, config, suggestUp });
  }

  refresh(firstMessage);
}

// ---------------------------------------------------------------------------
// Uitslag
// ---------------------------------------------------------------------------

const DRAW_WHY = {
  herhaling: 'Drie keer dezelfde stand. Niemand kan nog winnen.',
  '25-zetten': '25 zetten alleen met dammen geschoven.',
  '16-zetten': 'Het eindspel duurde te lang: niemand kan nog winnen.',
  '5-zetten': 'Dam tegen dam: niemand kan nog winnen.',
};

// `opp` = het niveau van de computer, of null bij samen spelen.
function resultText(status, opp = null) {
  if (!status.winner) return { title: 'Gelijkspel! 🤝', why: DRAW_WHY[status.reason] };
  if (opp) return resultTextVs(status, opp);
  const winner = colorName(status.winner);
  const loser = colorName(status.winner === 'w' ? 'b' : 'w');
  const why = {
    'geen-stukken': `${loser} heeft geen stukken meer.`,
    'geen-zetten': `${loser} kan niet meer zetten. Vastgezet!`,
    'eerste-dam': `${winner} had als eerste een dam! 👑`,
  }[status.reason];
  return { title: `${winner} wint! 🏆`, why };
}

// Tegen de computer. Nooit "verloren!": de computer wint "deze keer".
function resultTextVs(status, opp) {
  if (status.winner === HUMAN) {
    const why = {
      'geen-stukken': `${opp.name} heeft geen stukken meer.`,
      'geen-zetten': `${opp.name} kan niet meer zetten. Vastgezet!`,
      'eerste-dam': 'Jij had als eerste een dam! 👑',
    }[status.reason];
    return { title: 'Jij wint! 🏆', why };
  }
  const why = {
    'geen-stukken': 'Je hebt geen stukken meer.',
    'geen-zetten': 'Je kunt niet meer zetten.',
    'eerste-dam': `${opp.name} had als eerste een dam.`,
  }[status.reason];
  return { title: `${opp.icon} ${opp.name} wint deze keer.`, why: `${why} Goed geprobeerd!` };
}

function closeResult() {
  document.querySelector('.result')?.remove();
}

// Nog een keer: zelfde bord en regels. Tegen de computer met het niveau dat
// nu bewaard is (dat kan net stilletjes een stapje lager zijn).
function playAgain(config, newLevel = null) {
  closeResult();
  if (!config.vs) return startGame(config);
  if (newLevel) saveComputer({ level: newLevel, wins: 0, losses: 0 });
  return startGame({ ...config, vs: { level: loadComputer().level } });
}

function showResult({ title, why }, { onUndo, config, suggestUp }) {
  closeResult();
  const leave = (go) => () => {
    closeResult();
    current = null;
    go();
  };
  const buttons = [];
  let question = null;
  if (suggestUp) {
    const up = levelInfo(Math.min(MAX_LEVEL, config.vs.level + 1));
    question = el('p', { class: 'result-question', text: 'Je hebt 3 keer achter elkaar gewonnen! Zullen we het iets moeilijker maken?' });
    buttons.push(
      el('button', { class: 'big-btn', type: 'button', onclick: () => playAgain(config, up.level) }, [`⬆ Ja, tegen ${up.icon} ${up.name}`]),
      el('button', { class: 'big-btn soft', type: 'button', onclick: () => playAgain(config) }, ['↻ Nee, zo is het fijn']),
    );
  } else {
    buttons.push(el('button', { class: 'big-btn', type: 'button', onclick: () => playAgain(config) }, ['↻ Nog een keer']));
  }
  if (config.mini) {
    buttons.push(el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar de lessen', onclick: leave(nav.lessons) }, ['🗺️']));
  }
  buttons.push(
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Laatste zet terugnemen', onclick: onUndo }, ['↶']),
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: leave(() => showStart()) }, ['🏠']),
  );
  const dialog = el('div', { class: 'result', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('div', { class: 'result-card' }, [
      el('div', { class: 'dammie-face big', html: DAMMIE_SVG }),
      el('h2', { text: title }),
      el('p', { text: why }),
      ...(question ? [question] : []),
      el('div', { class: 'result-buttons' }, buttons),
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
    const sizes = app.querySelector('.sizes-screen');
    if (sizes) showSizes(sizes.dataset.mode);
  }, 200);
});

showStart();
