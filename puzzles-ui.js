// puzzles-ui.js — de puzzelkaart, een thema met zijn puzzels, en het puzzelscherm.
//
// Het puzzelscherm is hetzelfde opdrachtscherm als bij de lessen
// (createExerciseScreen in lessons-ui.js). Na elke 4 opgeloste puzzels biedt
// Dammie rustig aan om te stoppen ("klaar voor vandaag"), zonder druk.

import { LESSONS } from './lessons.js';
import { THEMES, puzzleExercise, themeStatus, offerBreak } from './puzzles.js';
import { loadProgress, savePuzzleStars } from './storage.js';
import { el, dammieBubble } from './shared.js';
import { newBadges } from './badges.js';
import { badgeNote } from './rewards-ui.js';
import { createExerciseScreen, starRow, bigButton, showDialog, closeDialog } from './lessons-ui.js';

// Zoveel puzzels zijn er opgelost sinds de app open is (voor het stopmoment).
let solvedThisVisit = 0;

const lessonNumber = (id) => LESSONS.findIndex((l) => l.id === id) + 1;
const lessonTitle = (id) => LESSONS.find((l) => l.id === id)?.title || '';
const puzzleStars = (progress, p) => progress.puzzles?.[p.id]?.stars || 0;

// ---------------------------------------------------------------------------
// Puzzelkaart: de thema's
// ---------------------------------------------------------------------------

export function showPuzzleMap(app, nav) {
  closeDialog();
  const progress = loadProgress();
  const anyOpen = THEMES.some((t) => themeStatus(t, progress).unlocked);
  const { box, say } = dammieBubble(
    anyOpen
      ? 'Puzzeltijd! Kies een thema.'
      : `De puzzels gaan open als je les ${lessonNumber(THEMES[0].unlock)} hebt gedaan. Kom maar mee naar de lessen!`,
  );

  const tiles = THEMES.map((theme) => {
    const st = themeStatus(theme, progress);
    const n = lessonNumber(theme.unlock);
    const status = st.unlocked
      ? el('span', { class: 'theme-count', text: `${st.done} van ${st.total}` })
      : el('span', { class: 'theme-count', text: `🔒 Eerst les ${n}` });
    return el(
      'button',
      {
        class: `lesson-tile theme-tile${st.unlocked ? '' : ' locked'}${st.done === st.total ? ' done' : ''}`,
        type: 'button',
        'aria-label': st.unlocked
          ? `${theme.title}: ${st.done} van ${st.total} puzzels gehaald`
          : `${theme.title}: gaat open na les ${n}`,
        onclick: () => {
          if (st.unlocked) showTheme(app, nav, theme);
          else say(`Dit thema gaat open na les ${n}: ${lessonTitle(theme.unlock)}.`);
        },
      },
      [
        el('span', { class: 'lesson-icon', text: theme.icon }),
        el('strong', { class: 'lesson-title', text: theme.title }),
        status,
      ],
    );
  });

  app.replaceChildren(
    el('main', { class: 'screen map' }, [
      el('header', { class: 'map-head' }, [
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: nav.home }, ['🏠']),
        el('h1', { text: 'Puzzels' }),
      ]),
      box,
      el('div', { class: 'lesson-grid' }, tiles),
      anyOpen ? null : bigButton('📚 Naar de lessen', nav.lessons),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Eén thema: kies een puzzel, of begin bij de eerste die nog niet gehaald is
// ---------------------------------------------------------------------------

function showTheme(app, nav, theme) {
  closeDialog();
  const progress = loadProgress();
  const st = themeStatus(theme, progress);
  const firstOpen = theme.puzzles.findIndex((p) => !puzzleStars(progress, p));
  const startAt = firstOpen === -1 ? 0 : firstOpen;
  const { box } = dammieBubble(
    st.done === st.total
      ? 'Alle puzzels gehaald! Wil je er nog een keer een doen?'
      : 'Tik op de groene knop om te beginnen, of kies zelf een puzzel.',
  );

  const tiles = theme.puzzles.map((p, i) => {
    const got = puzzleStars(progress, p);
    return el(
      'button',
      {
        class: `lesson-tile puzzle-tile${i === startAt && firstOpen !== -1 ? ' next' : ''}${got ? ' done' : ''}`,
        type: 'button',
        'aria-label': `Puzzel ${i + 1}${got ? `, ${got} sterren` : ''}`,
        onclick: () => showPuzzle(app, nav, theme, i),
      },
      [el('span', { class: 'lesson-num', text: String(i + 1) }), el('span', { class: 'lesson-icon', text: '🧩' }), starRow(got)],
    );
  });

  app.replaceChildren(
    el('main', { class: 'screen map' }, [
      el('header', { class: 'map-head' }, [
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar de puzzels', onclick: () => showPuzzleMap(app, nav) }, ['🧩']),
        el('h1', { text: `${theme.icon} ${theme.title}` }),
      ]),
      box,
      bigButton(firstOpen > 0 ? '▶ Verder' : '▶ Begin', () => showPuzzle(app, nav, theme, startAt)),
      el('div', { class: 'lesson-grid puzzle-grid' }, tiles),
    ]),
  );
}

// ---------------------------------------------------------------------------
// Puzzelscherm
// ---------------------------------------------------------------------------

function showPuzzle(app, nav, theme, index) {
  closeDialog();
  const exercises = theme.puzzles.map((p) => puzzleExercise(theme, p));
  const solvedBefore = new Set(theme.puzzles.filter((p) => puzzleStars(loadProgress(), p)).map((p) => p.id));
  const toTheme = () => showTheme(app, nav, theme);

  const screen = createExerciseScreen(app, {
    exercises,
    backLabel: 'Naar de puzzels',
    backIcon: '🧩',
    onBack: toTheme,
    isDone: (i) => solvedBefore.has(theme.puzzles[i].id),
    onSolved(i, got, scr) {
      const before = loadProgress();
      const fresh = newBadges(before, savePuzzleStars(theme.puzzles[i].id, got));
      solvedBefore.add(theme.puzzles[i].id);
      solvedThisVisit++;
      const last = i === exercises.length - 1;
      const next = () => (last ? toTheme() : scr.start(i + 1));
      scr.setActions([last ? bigButton('🏁 Klaar!', toTheme) : bigButton('▶ Volgende puzzel', next)]);
      if (offerBreak(solvedThisVisit)) {
        // Rustig stopmoment: twee even grote keuzes, geen druk.
        showDialog({
          title: 'Goed gewerkt!',
          text: `Je hebt al ${solvedThisVisit} puzzels opgelost. Nog een puzzel, of is het klaar voor vandaag?`,
          extra: badgeNote(fresh),
          buttons: [
            el('div', { class: 'break-buttons' }, [
              bigButton('🧩 Nog een puzzel', () => { closeDialog(); next(); }),
              bigButton('🏠 Klaar voor vandaag', () => { closeDialog(); nav.doneForToday(); }),
            ]),
          ],
        });
      } else if (fresh.length) {
        showDialog({
          title: fresh.length === 1 ? 'Nieuwe badge!' : 'Nieuwe badges!',
          extra: badgeNote(fresh, { heading: false }),
          buttons: [bigButton('▶ Verder', closeDialog)],
        });
      }
    },
  });
  screen.start(index);
}
