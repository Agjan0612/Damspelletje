// board.js — het dambord op het scherm.
//
// Tekent een bord van elke grootte, laat stukken oplichten, en vertaalt
// tikken en slepen naar zetten (via input.js). Dit onderdeel weet niets van
// menu's of Dammie: het meldt alleen wat er gebeurt via `onMove` en `onFeedback`.
// Later gebruiken de lessen hetzelfde bord.

import { getGeometry, legalMoves, colorOf, isKing } from './rules.js';
import { tap, emptySelection, highlights } from './input.js';

const STEP_MS = 260;      // tijd per sprong bij een slag
const FADE_MS = 280;      // geslagen stukken verdwijnen
const DRAG_START_PX = 8;  // zoveel moet je schuiven voordat het "slepen" is

const CROWN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createBoardView(container, { onMove = () => {}, onFeedback = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'board';
  el.setAttribute('role', 'grid');
  el.setAttribute('aria-label', 'Dambord');
  container.replaceChildren(el);

  const squaresLayer = document.createElement('div');
  squaresLayer.className = 'squares';
  const piecesLayer = document.createElement('div');
  piecesLayer.className = 'pieces';
  el.append(squaresLayer, piecesLayer);

  let game = null;
  let moves = [];
  let selection = emptySelection();
  let interactive = true;
  let busy = false;
  let size = 0;
  let squareEls = [];  // squareEls[veld] = element
  let pieceEls = [];   // pieceEls[veld] = element

  // --- tekenen -------------------------------------------------------------

  function buildSquares() {
    const geo = getGeometry(size);
    el.style.setProperty('--n', size);
    squaresLayer.replaceChildren();
    squareEls = [null];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const sq = geo.squareAt[row][col];
        const d = document.createElement('div');
        d.className = sq ? 'sq dark' : 'sq light';
        if (sq) {
          d.dataset.sq = sq;
          d.setAttribute('role', 'gridcell');
          d.setAttribute('aria-label', `veld ${sq}`);
          squareEls[sq] = d;
        }
        squaresLayer.append(d);
      }
    }
  }

  function placePiece(p, sq) {
    const { row, col } = getGeometry(size).coords[sq];
    p.style.setProperty('--r', row);
    p.style.setProperty('--c', col);
  }

  function makePiece(piece, sq) {
    const p = document.createElement('div');
    p.className = `piece ${colorOf(piece) === 'w' ? 'white' : 'black'}${isKing(piece) ? ' king' : ''}`;
    p.innerHTML = `<div class="disc">${CROWN_SVG}</div>`;
    placePiece(p, sq);
    return p;
  }

  function renderPieces() {
    piecesLayer.replaceChildren();
    pieceEls = [null];
    for (let sq = 1; sq < game.board.length; sq++) {
      const piece = game.board[sq];
      if (piece === '.') continue;
      const p = makePiece(piece, sq);
      pieceEls[sq] = p;
      piecesLayer.append(p);
    }
  }

  function renderHighlights() {
    const h = interactive && !busy ? highlights(game, selection, moves) : null;
    const last = game.lastMove;
    for (let sq = 1; sq < squareEls.length; sq++) {
      const s = squareEls[sq];
      s.classList.toggle('target', !!h && h.targets.includes(sq));
      s.classList.toggle('route', !!h && h.route.includes(sq));
      s.classList.toggle('route-target', !!h && h.routeTarget === sq);
      s.classList.toggle('last', !!last && (last.from === sq || last.to === sq));
    }
    for (let sq = 1; sq < pieceEls.length; sq++) {
      const p = pieceEls[sq];
      if (!p) continue;
      p.classList.toggle('selected', !!h && h.selected === sq);
      p.classList.toggle('must', !!h && h.mustCapture.includes(sq) && h.selected !== sq);
    }
  }

  // --- invoer --------------------------------------------------------------

  function handleTap(sq) {
    if (!interactive || busy || !game || !sq) return;
    const before = selection;
    const out = tap(game, selection, sq, moves);
    selection = out.selection;
    const { result } = out;
    if (result.type === 'play') {
      renderHighlights();
      onMove(result.move);
      return;
    }
    if (result.type === 'blocked' || result.type === 'opponent') wiggle(sq);
    if (result.type === 'invalid-target' && before.from) wiggle(before.from);
    renderHighlights();
    onFeedback(result, game);
  }

  function wiggle(sq) {
    const p = pieceEls[sq];
    if (!p || reducedMotion()) return;
    p.classList.remove('wiggle');
    void p.offsetWidth; // animatie opnieuw starten
    p.classList.add('wiggle');
    setTimeout(() => p.classList.remove('wiggle'), 450);
  }

  const squareAtPoint = (x, y) => {
    const hit = document.elementFromPoint(x, y);
    const s = hit && hit.closest ? hit.closest('.sq.dark') : null;
    return s && el.contains(s) ? Number(s.dataset.sq) : null;
  };

  // Tikken en slepen met "pointer events": werkt voor vinger, muis en pen.
  let pointer = null;

  el.addEventListener('pointerdown', (e) => {
    if (!interactive || busy || !game || pointer) return;
    const sq = squareAtPoint(e.clientX, e.clientY);
    if (!sq) return;
    pointer = { id: e.pointerId, sq, x: e.clientX, y: e.clientY, dragging: false, handled: false };
    // Eigen stuk dat nog niet geselecteerd is: meteen selecteren, zodat de
    // groene stippen al tijdens het slepen zichtbaar zijn.
    if (colorOf(game.board[sq]) === game.turn && selection.from !== sq && !selection.route) {
      handleTap(sq);
      pointer.handled = true;
    }
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    if (!pointer.dragging && Math.hypot(dx, dy) > DRAG_START_PX && selection.from === pointer.sq) {
      pointer.dragging = true;
      pieceEls[pointer.sq]?.classList.add('dragging');
    }
    if (pointer.dragging) {
      const p = pieceEls[pointer.sq];
      if (p) p.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  });

  function endPointer(e, cancelled) {
    if (!pointer || e.pointerId !== pointer.id) return;
    const ptr = pointer;
    pointer = null;
    const p = pieceEls[ptr.sq];
    if (ptr.dragging && p) {
      p.classList.remove('dragging');
      p.style.transform = '';
    }
    if (cancelled) return;
    const sq = squareAtPoint(e.clientX, e.clientY);
    if (ptr.dragging) {
      if (sq && sq !== ptr.sq) {
        dropped = true;
        handleTap(sq);
        dropped = false;
      }
    } else if (!ptr.handled) {
      handleTap(sq ?? ptr.sq);
    }
  }
  let dropped = false;

  el.addEventListener('pointerup', (e) => endPointer(e, false));
  el.addEventListener('pointercancel', (e) => endPointer(e, true));

  // --- animatie ------------------------------------------------------------

  // Laat een zet zien: het stuk springt veld voor veld, en pas aan het eind
  // verdwijnen de geslagen stukken (zoals de regel het voorschrijft).
  async function animateMove(move) {
    const p = pieceEls[move.from];
    if (!p) return;
    busy = true;
    renderHighlights();
    const quick = reducedMotion() || (dropped && move.captures.length === 0);
    p.classList.add('moving');
    if (!quick) {
      for (const sq of move.path.slice(1)) {
        placePiece(p, sq);
        await wait(STEP_MS);
      }
    } else {
      placePiece(p, move.to);
    }
    if (move.promotes) p.classList.add('king');
    if (move.captures.length > 0) {
      for (const sq of move.captures) pieceEls[sq]?.classList.add('captured');
      if (!reducedMotion()) await wait(FADE_MS);
    }
    p.classList.remove('moving');
    busy = false;
  }

  // --- buitenkant ----------------------------------------------------------

  return {
    element: el,
    setGame(next) {
      game = next;
      moves = legalMoves(game);
      selection = emptySelection();
      if (game.size !== size) {
        size = game.size;
        buildSquares();
      }
      renderPieces();
      renderHighlights();
    },
    animateMove,
    setInteractive(on) {
      interactive = on;
      if (!on) selection = emptySelection();
      if (game) renderHighlights();
    },
    clearSelection() {
      selection = emptySelection();
      if (game) renderHighlights();
    },
  };
}
