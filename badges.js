// badges.js — badges voor beheersing en bordthema's (alleen voor het uiterlijk).
//
// Badges worden niet bewaard, maar steeds uitgerekend uit de voortgang
// (storage.js). Een kind dat al ver is, heeft ze dus meteen, en ze kunnen
// nooit kwijtraken. Een badge is altijd voor iets wat het kind KAN: een les
// gehaald, puzzels opgelost, een niveau van de computer verslagen. Nooit voor
// tijd, dagen op rij of vaak terugkomen (de tests bewaken dat).
//
//   need.lessons  les-id's die gehaald moeten zijn ('all' = alle lessen)
//   need.themes   puzzelthema's waarvan alle puzzels opgelost moeten zijn
//   need.puzzles  zoveel puzzels opgelost ('all' = allemaal)
//   need.beaten   een gewone partij gewonnen van dit niveau
//
// Badge- en thema-id's nooit veranderen: het gekozen bord staat in de opslag.

import { LESSONS } from './lessons.js';
import { THEMES, ALL_PUZZLES } from './puzzles.js';
import { LEVELS } from './ai.js';

export const BADGES = [
  { id: 'eerste-stappen', icon: '🐣', title: 'Eerste stappen', need: { lessons: ['bord', 'schijf', 'beurt'] } },
  { id: 'eerste-dam', icon: '👑', title: 'Eerste dam!', need: { lessons: ['dam'] } },
  { id: 'slaankampioen', icon: '⚔️', title: 'Slaankampioen', need: { lessons: ['slaan', 'verplicht', 'achteruit'] } },
  {
    id: 'meerslag-meester',
    icon: '🔗',
    title: 'Meerslag-meester',
    need: { lessons: ['meerslag', 'meerslag-voor'], themes: ['meerslag', 'meerslag-voor'] },
  },
  { id: 'vliegende-dam', icon: '🦅', title: 'Vliegende dam', need: { lessons: ['vliegen', 'damslaan', 'dam-bocht'] } },
  { id: 'slimme-slagen', icon: '🧠', title: 'Slimme slagen', need: { lessons: ['vrije-keus', 'turkse-slag'] } },
  { id: 'verdediger', icon: '🛡️', title: 'Slimme verdediger', need: { lessons: ['verdedigen', 'aanvallen'], themes: ['verdedigen'] } },
  { id: 'ruilmeester', icon: '🤝', title: 'Ruilmeester', need: { lessons: ['ruil', 'twee-voor-een', 'vastzetten'] } },
  { id: 'damdiploma', icon: '🎓', title: 'Damdiploma', need: { lessons: 'all' } },
  { id: 'puzzelaar', icon: '🧩', title: 'Puzzelaar', need: { puzzles: 10 } },
  { id: 'puzzelkoning', icon: '💎', title: 'Puzzelkoning', need: { puzzles: 'all' } },
  ...LEVELS.map((l) => ({ id: `versla-${l.level}`, icon: l.icon, title: `${l.name} verslagen`, need: { beaten: l.level } })),
];

export const badgeById = (id) => BADGES.find((b) => b.id === id) || null;

const lessonDone = (progress, id) => !!progress.lessons?.[id];
const puzzleDone = (progress, id) => !!progress.puzzles?.[id];
const solvedCount = (progress) => ALL_PUZZLES.filter(({ puzzle }) => puzzleDone(progress, puzzle.id)).length;
const themeTitle = (id) => THEMES.find((t) => t.id === id)?.title || id;
const lessonNumber = (id) => LESSONS.findIndex((l) => l.id === id) + 1;

// Heeft het kind deze badge? `progress` komt uit storage.js.
export function hasBadge(badge, progress) {
  const { lessons = [], themes = [], puzzles = 0, beaten = null } = badge.need;
  const lessonIds = lessons === 'all' ? LESSONS.map((l) => l.id) : lessons;
  if (!lessonIds.every((id) => lessonDone(progress, id))) return false;
  for (const id of themes) {
    const theme = THEMES.find((t) => t.id === id);
    if (!theme || !theme.puzzles.every((p) => puzzleDone(progress, p.id))) return false;
  }
  const needPuzzles = puzzles === 'all' ? ALL_PUZZLES.length : puzzles;
  if (needPuzzles && solvedCount(progress) < needPuzzles) return false;
  if (beaten && !progress.beaten?.[beaten]) return false;
  return true;
}

export function earnedBadges(progress) {
  return BADGES.filter((b) => hasBadge(b, progress));
}

// Badges die er net bij gekomen zijn (voor: voortgang vóór het opslaan).
export function newBadges(before, after) {
  const had = new Set(earnedBadges(before).map((b) => b.id));
  return earnedBadges(after).filter((b) => !had.has(b.id));
}

// "6, 7 en 8"
function listText(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

// Wat moet je doen voor deze badge? (Voor de Prijzenkast.)
export function badgeHow(badge) {
  const { lessons = [], themes = [], puzzles = 0, beaten = null } = badge.need;
  if (beaten) {
    const l = LEVELS.find((x) => x.level === beaten);
    return `Win een partij van ${l.icon} ${l.name}.`;
  }
  if (puzzles === 'all') return `Los alle ${ALL_PUZZLES.length} puzzels op.`;
  if (puzzles) return `Los ${puzzles} puzzels op.`;
  if (lessons === 'all') return `Haal alle ${LESSONS.length} lessen.`;
  const parts = [`Haal les ${listText(lessons.map(lessonNumber))}`];
  if (themes.length) parts.push(`alle puzzels van ${listText(themes.map(themeTitle))}`);
  return `${parts.join(', en ')}.`;
}

// ---------------------------------------------------------------------------
// Bordthema's. Alleen het bord verandert: de schijven blijven altijd wit en
// zwart, zodat het kind ze goed uit elkaar houdt. Een thema gaat open met
// een badge (`unlock`); Hout heb je vanaf het begin.
//
// Kleuren (worden CSS-variabelen --b-...; zie style.css, "Het bord"):
//   light-a/b  lichte velden   dark-a/b  donkere velden (hier staan de stukken)
//   last-a/b   donker veld van de laatste zet
//   frame-a/b  de rand   frame-top  lichtrandje   frame-edge  donkere onderkant
//   pattern    tekening op de rand (nerf, sterretjes, ...)
// ---------------------------------------------------------------------------

export const BOARD_COLOR_KEYS = [
  'light-a', 'light-b', 'dark-a', 'dark-b', 'last-a', 'last-b',
  'frame-a', 'frame-b', 'frame-top', 'frame-edge', 'pattern',
];

const WOOD_GRAIN = 'repeating-linear-gradient(92deg, rgba(0, 0, 0, .05) 0 2px, transparent 2px 9px)';

export const BOARD_THEMES = [
  {
    id: 'hout',
    name: 'Hout',
    icon: '🪵',
    unlock: null,
    colors: {
      'light-a': '#f8e9cc', 'light-b': '#ecd5ab',
      'dark-a': '#a26a3c', 'dark-b': '#7c4b25',
      'last-a': '#c18a4f', 'last-b': '#9d6a36',
      'frame-a': '#8a5430', 'frame-b': '#5e3518', 'frame-top': '#9b6236', 'frame-edge': '#3f220e',
      pattern: WOOD_GRAIN,
    },
  },
  {
    id: 'zee',
    name: 'Zee',
    icon: '🌊',
    unlock: 'eerste-dam',
    colors: {
      'light-a': '#eaf6fb', 'light-b': '#cfe7f2',
      'dark-a': '#4a90bd', 'dark-b': '#2f6f99',
      'last-a': '#6aaed6', 'last-b': '#4b90bb',
      'frame-a': '#2d6a94', 'frame-b': '#173e5c', 'frame-top': '#3d7fab', 'frame-edge': '#0e2a40',
      pattern: 'repeating-radial-gradient(circle at 50% 120%, rgba(255, 255, 255, .07) 0 3px, transparent 3px 11px)',
    },
  },
  {
    id: 'bos',
    name: 'Bos',
    icon: '🌳',
    unlock: 'slaankampioen',
    colors: {
      'light-a': '#f0f6de', 'light-b': '#dbe8bf',
      'dark-a': '#6b9a4c', 'dark-b': '#4d7834',
      'last-a': '#86b566', 'last-b': '#679649',
      'frame-a': '#4f7230', 'frame-b': '#2f4719', 'frame-top': '#628a3d', 'frame-edge': '#1d2e0f',
      pattern: 'radial-gradient(circle, rgba(255, 255, 255, .08) 0 2px, transparent 3px) 0 0 / 14px 14px',
    },
  },
  {
    id: 'snoep',
    name: 'Snoep',
    icon: '🍭',
    unlock: 'puzzelaar',
    colors: {
      'light-a': '#fff2f7', 'light-b': '#fbdce8',
      'dark-a': '#c86b99', 'dark-b': '#a84d7b',
      'last-a': '#db86ae', 'last-b': '#c06a95',
      'frame-a': '#8fd3c2', 'frame-b': '#5bb09b', 'frame-top': '#aee3d6', 'frame-edge': '#357f6c',
      pattern: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, .22) 0 6px, transparent 6px 14px)',
    },
  },
  {
    id: 'ruimte',
    name: 'Ruimte',
    icon: '🚀',
    unlock: 'meerslag-meester',
    colors: {
      'light-a': '#e3e5f6', 'light-b': '#c9cdea',
      'dark-a': '#7173c4', 'dark-b': '#5456a6',
      'last-a': '#8f91d8', 'last-b': '#7072bd',
      'frame-a': '#252751', 'frame-b': '#11122b', 'frame-top': '#35386b', 'frame-edge': '#07081a',
      pattern:
        'radial-gradient(circle, rgba(255, 255, 255, .9) 0 1px, transparent 1.6px) 0 0 / 23px 19px,'
        + ' radial-gradient(circle, rgba(255, 240, 180, .7) 0 1px, transparent 1.6px) 9px 11px / 31px 27px',
    },
  },
];

export const boardThemeById = (id) => BOARD_THEMES.find((t) => t.id === id) || null;

export function themeUnlocked(theme, progress) {
  return !theme.unlock || hasBadge(badgeById(theme.unlock), progress);
}

// Het bord waarop het kind speelt: het gekozen thema, of Hout als dat
// (nog) niet open is of niet bestaat.
export function boardThemeFor(progress, chosenId) {
  const theme = boardThemeById(chosenId);
  return theme && themeUnlocked(theme, progress) ? theme : BOARD_THEMES[0];
}

// Thema's die met deze badges net opengaan.
export const themesUnlockedBy = (badges) => BOARD_THEMES.filter((t) => badges.some((b) => b.id === t.unlock));

// De kleuren als CSS-variabelen: "--b-light-a: #...; ..."
export function boardThemeStyle(theme) {
  return BOARD_COLOR_KEYS.map((k) => `--b-${k}: ${theme.colors[k]}`).join('; ');
}
