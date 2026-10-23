// shared.js — gedeelde stukjes voor de schermen: Dammie, knoppen, teksten.

import { isKing, legalMoves } from './rules.js';

export const DAMMIE_SVG = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="34" r="27" fill="#7a4a24"/>
  <circle cx="32" cy="31" r="27" fill="#fff6e6" stroke="#7a4a24" stroke-width="2.5"/>
  <circle cx="32" cy="31" r="19" fill="none" stroke="#e7d3b3" stroke-width="2.5"/>
  <circle cx="24" cy="27" r="4.2" fill="#2b1d12"/><circle cx="40" cy="27" r="4.2" fill="#2b1d12"/>
  <circle cx="25.4" cy="25.6" r="1.4" fill="#fff"/><circle cx="41.4" cy="25.6" r="1.4" fill="#fff"/>
  <path d="M23 37 q9 8 18 0" fill="none" stroke="#2b1d12" stroke-width="3" stroke-linecap="round"/>
  <circle cx="18" cy="35" r="3" fill="#f6b8a8" opacity=".8"/><circle cx="46" cy="35" r="3" fill="#f6b8a8" opacity=".8"/>
</svg>`;

// Klein hulpje om HTML-elementen te maken.
export function el(tag, attrs = {}, children = []) {
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

// Dammie met een tekstballon. `say(tekst)` verandert wat hij zegt.
export function dammieBubble(text, extraClass = '') {
  const textEl = el('p', { class: 'bubble-text', text, 'aria-live': 'polite' });
  const box = el('div', { class: `dammie ${extraClass}` }, [
    el('div', { class: 'dammie-face', html: DAMMIE_SVG }),
    el('div', { class: 'bubble' }, [textEl]),
  ]);
  return { box, say: (t) => (textEl.textContent = t) };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const colorName = (c) => (c === 'w' ? 'Wit' : 'Zwart');
export const colorNameLower = (c) => (c === 'w' ? 'wit' : 'zwart');
const pieceWord = (piece) => (isKing(piece) ? 'dam' : 'schijf');
export const piecesText = (n) => (n === 1 ? '1 stuk' : `${n} stukken`);

// "Wit is aan zet" of "Wit, je moet slaan!". Met `you` (tegen de computer)
// praat Dammie tegen het kind: "Jij bent aan zet." / "Je moet slaan!".
export function turnText(game, { showMust = true, you = false } = {}) {
  const moves = legalMoves(game);
  const who = colorName(game.turn);
  if (moves.length && moves[0].captures.length > 0 && game.options.slagplicht) {
    const look = showMust ? ' Kijk naar de oranje ring.' : '';
    const max = moves[0].captures.length;
    const must = you ? 'Je moet slaan!' : `${who}, je moet slaan!`;
    return max > 1 ? `${must} Je kunt ${max} stukken slaan.${look}` : `${must}${look}`;
  }
  return you ? 'Jij bent aan zet.' : `${who} is aan zet.`;
}

// Wat zegt Dammie als het kind op het bord tikt (zie input.js voor de soorten)?
export function feedbackText(result, game, { showMust = true } = {}) {
  const piece = result.from ? pieceWord(game.board[result.from]) : 'schijf';
  switch (result.type) {
    case 'select':
      return isKing(game.board[result.from])
        ? 'Een dam mag ver vliegen! Tik op een groene stip.'
        : 'Tik op een groene stip.';
    case 'deselect':
      return turnText(game, { showMust });
    case 'blocked':
      if (result.reason === 'minder-slaan') {
        return `Bijna! Deze ${piece} kan ${piecesText(result.count)} slaan, maar er is een slag van ${piecesText(result.best)}. Meerslag gaat voor!`;
      }
      if (result.reason === 'moet-slaan') {
        return showMust
          ? `Deze ${piece} kan niet slaan. Kijk naar de oranje ring!`
          : `Deze ${piece} kan niet slaan. Er is een schijf die wél kan slaan. Zoek hem!`;
      }
      return `Deze ${piece} kan nu niet zetten. Probeer een andere.`;
    case 'opponent':
      return `Dat is een stuk van ${colorNameLower(game.turn === 'w' ? 'b' : 'w')}. ${colorName(game.turn)} is aan zet.`;
    case 'empty':
      return `Tik eerst op een ${game.turn === 'w' ? 'witte' : 'zwarte'} schijf.`;
    case 'invalid-target':
      return 'Daar mag hij niet heen. Kies een groene stip.';
    case 'route':
      if (result.step) return 'Goed zo! Spring verder: tik op de volgende groene stip.';
      return 'Er zijn meer wegen naar dit veld! Tik op het veld waar je stuk tussendoor landt.';
    default:
      return null;
  }
}
