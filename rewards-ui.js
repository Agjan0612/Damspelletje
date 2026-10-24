// rewards-ui.js — de Prijzenkast (badges en bord kiezen), de melding bij een
// nieuwe badge, en het bordthema op het scherm zetten.
//
// Welke badges er zijn en wanneer je ze krijgt, staat in badges.js.

import {
  BADGES,
  BOARD_THEMES,
  BOARD_COLOR_KEYS,
  badgeById,
  badgeHow,
  hasBadge,
  earnedBadges,
  boardThemeFor,
  boardThemeStyle,
  themeUnlocked,
  themesUnlockedBy,
} from './badges.js';
import { currentProfile, loadProgress, updateProfile } from './storage.js';
import { el, dammieBubble, miniBoard, sentence } from './shared.js';

// Zet de kleuren van het bord van het huidige kind op de pagina.
export function applyBoardTheme() {
  const theme = boardThemeFor(loadProgress(), currentProfile()?.board);
  const root = document.documentElement;
  for (const k of BOARD_COLOR_KEYS) root.style.setProperty(`--b-${k}`, theme.colors[k]);
  return theme;
}

// Melding in een kaartje (les klaar, puzzel, uitslag): de nieuwe badges, en
// welk bord daarmee opengaat. Geen nieuwe badges: null.
export function badgeNote(badges, { heading = true } = {}) {
  if (!badges.length) return null;
  const rows = badges.map((b) =>
    el('div', { class: 'badge-new' }, [el('span', { class: 'badge-medal', text: b.icon }), el('strong', { text: b.title })]),
  );
  const boards = themesUnlockedBy(badges).map((t) =>
    el('p', { class: 'badge-board', text: `Nu kun je ook het bord ${t.icon} ${t.name} kiezen in de Prijzenkast.` }),
  );
  const headText = badges.length === 1 ? 'Nieuwe badge!' : 'Nieuwe badges!';
  const title = heading ? el('p', { class: 'badge-heading', text: `🏅 ${headText}` }) : null;
  const note = el('div', { class: 'badge-note' }, [title, ...rows, ...boards]);
  // Wat Dammie hardop zegt, en welk geluidje erbij hoort (zie showDialog).
  note.dataset.say = [heading ? headText : '', ...badges.map((b) => sentence(b.title)), ...boards.map((b) => b.textContent)]
    .filter(Boolean)
    .join(' ');
  note.dataset.sound = 'badge';
  return note;
}

// ---------------------------------------------------------------------------
// Prijzenkast
// ---------------------------------------------------------------------------

const exclaim = (t) => (/[!?.]$/.test(t) ? t : `${t}!`);

export function showTrophies(app, nav, message = null) {
  const progress = loadProgress();
  const profile = currentProfile();
  const got = earnedBadges(progress).length;
  const { box, say } = dammieBubble(
    message
      || (got === 0
        ? 'Hier komen jouw badges. Tik op een badge om te zien hoe je hem krijgt.'
        : `Je hebt ${got} van de ${BADGES.length} badges. Tik op een badge!`),
  );

  const badgeTiles = BADGES.map((b) => {
    const has = hasBadge(b, progress);
    return el(
      'button',
      {
        class: `badge-tile${has ? ' earned' : ''}`,
        type: 'button',
        'aria-label': has ? `Badge ${b.title}: gehaald` : `Badge ${b.title}: nog niet. ${badgeHow(b)}`,
        onclick: () => say(has ? `${b.icon} ${exclaim(b.title)} Die heb je al gehaald.` : `${b.title}: ${badgeHow(b)}`),
      },
      [
        el('span', { class: 'badge-icon', text: b.icon }),
        el('strong', { class: 'badge-title', text: b.title }),
        has ? null : el('span', { class: 'badge-how', text: badgeHow(b) }),
      ],
    );
  });

  const chosen = boardThemeFor(progress, profile?.board).id;
  const boardTiles = BOARD_THEMES.map((t) => {
    const open = themeUnlocked(t, progress);
    const badge = badgeById(t.unlock);
    const status = t.id === chosen ? '✓ Gekozen' : open ? 'Tik om te kiezen' : `🔒 Badge ${badge.icon} ${badge.title}`;
    return el(
      'button',
      {
        class: `board-tile${open ? '' : ' locked'}${t.id === chosen ? ' chosen' : ''}`,
        type: 'button',
        'aria-label': `Bord ${t.name}: ${status}`,
        'aria-pressed': t.id === chosen ? 'true' : 'false',
        onclick: () => {
          if (!open) return say(`Het bord ${t.name} gaat open met de badge ${badge.icon} ${badge.title}. ${badgeHow(badge)}`);
          if (profile) updateProfile(profile.id, { board: t.id });
          applyBoardTheme();
          const y = window.scrollY; // blijf op dezelfde plek
          showTrophies(app, nav, `Mooi! Nu speel je op het bord ${t.icon} ${t.name}.`);
          window.scrollTo?.(0, y);
        },
      },
      [
        el('div', { class: 'board-preview', style: boardThemeStyle(t) }, [miniBoard(6)]),
        el('strong', { text: `${t.icon} ${t.name}` }),
        el('span', { class: 'theme-count', text: status }),
      ],
    );
  });

  app.replaceChildren(
    el('main', { class: 'screen map trophies' }, [
      el('header', { class: 'map-head' }, [
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: nav.home }, ['🏠']),
        el('h1', { text: 'Prijzenkast' }),
      ]),
      box,
      el('h2', { class: 'section-title', text: 'Badges' }),
      el('div', { class: 'badge-grid' }, badgeTiles),
      el('h2', { class: 'section-title', text: 'Kies je bord' }),
      el('div', { class: 'board-grid' }, boardTiles),
    ]),
  );
  window.scrollTo?.(0, 0);
}
