// lessons-ui.js — de lessenkaart en het lesscherm.
//
// Het lesscherm gebruikt hetzelfde bord als "samen spelen" (board.js) en
// laat de lesmotor (lesson-engine.js) bepalen wat goed of "bijna" is.

import { legalMoves, moveToString } from './rules.js';
import { createBoardView } from './board.js';
import { LESSONS } from './lessons.js';
import {
  startExercise,
  onMove,
  onPick,
  nextHint,
  canHint,
  currentHint,
  stars,
  lessonStars,
} from './lesson-engine.js';
import { loadProgress, saveLessonStars } from './storage.js';
import { el, dammieBubble, DAMMIE_SVG, wait, feedbackText } from './shared.js';

const starRow = (n, max = 3) =>
  el('span', { class: 'stars', 'aria-label': `${n} van de ${max} sterren` }, [
    ...Array.from({ length: max }, (_, i) => el('i', { class: i < n ? 'on' : 'off', text: '★' })),
  ]);

// ---------------------------------------------------------------------------
// Lessenkaart
// ---------------------------------------------------------------------------

export function showLessonMap(app, nav) {
  const progress = loadProgress();
  const nextIndex = LESSONS.findIndex((l) => !progress.lessons[l.id]);
  const { box } = dammieBubble(
    nextIndex === -1
      ? 'Je hebt alle lessen gedaan! Wil je er nog een keer een doen?'
      : nextIndex === 0
        ? 'Welkom! We beginnen bij les 1. Tik op de les die licht geeft.'
        : `Goed bezig! Tik op les ${nextIndex + 1} om verder te gaan.`,
  );

  const tiles = LESSONS.map((lesson, i) => {
    const got = progress.lessons[lesson.id]?.stars || 0;
    return el(
      'button',
      {
        class: `lesson-tile${i === nextIndex ? ' next' : ''}${got ? ' done' : ''}`,
        type: 'button',
        'aria-label': `Les ${i + 1}: ${lesson.title}${got ? `, ${got} sterren` : ''}`,
        onclick: () => showLesson(app, nav, i),
      },
      [
        el('span', { class: 'lesson-num', text: String(i + 1) }),
        el('span', { class: 'lesson-icon', text: lesson.icon }),
        el('strong', { class: 'lesson-title', text: lesson.title }),
        starRow(got),
      ],
    );
  });

  app.replaceChildren(
    el('main', { class: 'screen map' }, [
      el('header', { class: 'map-head' }, [
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: nav.home }, ['🏠']),
        el('h1', { text: 'Lessen' }),
      ]),
      box,
      el('div', { class: 'lesson-grid' }, tiles),
    ]),
  );
  app.querySelector('.lesson-tile.next')?.scrollIntoView?.({ block: 'center' });
}

// ---------------------------------------------------------------------------
// Lesscherm
// ---------------------------------------------------------------------------

export function showLesson(app, nav, lessonIndex) {
  const lesson = LESSONS[lessonIndex];
  const results = []; // sterren per opdracht
  const toMap = () => {
    document.querySelector('.result')?.remove();
    showLessonMap(app, nav);
  };

  const homeBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar de lessenkaart', onclick: toMap }, ['🗺️']);
  const hintBtn = el('button', { class: 'icon-btn hint-btn', type: 'button', 'aria-label': 'Hint' }, ['💡']);
  const againBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Opdracht opnieuw' }, ['↺']);
  const dots = el('div', { class: 'progress', 'aria-label': 'Voortgang' });
  const bar = el('header', { class: 'bar' }, [homeBtn, dots, el('div', { class: 'bar-right' }, [hintBtn, againBtn])]);
  const { box: dammie, say } = dammieBubble('');
  const actions = el('div', { class: 'actions' });
  const side = el('div', { class: 'side' }, [bar, dammie, actions]);
  const boardWrap = el('div', { class: 'board-wrap' });
  app.replaceChildren(el('main', { class: 'screen game lesson' }, [side, boardWrap]));

  let state = null;
  let busy = false;
  let index = 0;

  const view = createBoardView(boardWrap, {
    onMove: handleMove,
    onFeedback: (result, g) => {
      const t = feedbackText(result, g, { showMust: state.ex.showMust !== false });
      if (t) say(t);
    },
  });

  function renderDots() {
    dots.replaceChildren(
      ...lesson.exercises.map((ex, i) => {
        const cls = i < index || (i === index && state?.done) ? 'done' : i === index ? 'current' : '';
        return el('span', { class: `dot ${cls}${ex.boss ? ' boss' : ''}`, text: ex.boss ? '👑' : '' });
      }),
    );
  }

  function decorate() {
    const { goal } = state.ex;
    const hint = currentHint(state);
    view.setDecorations({
      stars: goal.type === 'reach' && !state.done ? [goal.square] : [],
      glow: hint.glow,
      marks: hint.marks,
      picked: state.picked,
    });
    hintBtn.disabled = busy || !canHint(state);
    againBtn.disabled = busy || state.done;
  }

  async function startEx(i) {
    index = i;
    const ex = lesson.exercises[i];
    state = startExercise(ex, i);
    actions.replaceChildren();
    view.setInteractive(true);
    view.setGame(state.game);
    view.setShowMustCapture(ex.showMust !== false);
    view.setPickHandler(ex.goal.type === 'pick' ? handlePick : null);
    renderDots();
    say(ex.text);
    decorate();
    if (ex.demo) await playDemo(ex);
  }

  // Dammie doet de zet eerst even voor, daarna staat alles weer klaar.
  async function playDemo(ex) {
    const move = legalMoves(state.game).find((m) => moveToString(m) === ex.demo);
    if (!move) return;
    busy = true;
    view.setInteractive(false);
    decorate();
    await wait(900);
    await view.animateMove(move);
    await wait(900);
    view.setGame(state.game);
    busy = false;
    view.setInteractive(true);
    say(`Nu jij! ${ex.text}`);
    decorate();
  }

  async function handleMove(move) {
    if (busy) return;
    busy = true;
    decorate();
    await view.animateMove(move);
    const out = onMove(state, move);
    state = out.state;
    const { type, message } = out.outcome;
    say(message);
    if (type === 'retry' || type === 'reset') {
      await wait(type === 'reset' ? 1600 : 1200);
    }
    view.setGame(state.game);
    busy = false;
    if (type === 'done') finishExercise();
    else decorate();
  }

  function handlePick(tapInfo) {
    if (busy || state.done) return;
    const out = onPick(state, tapInfo);
    state = out.state;
    say(out.outcome.message);
    if (out.outcome.type === 'wrong') view.flash(tapInfo.row, tapInfo.col);
    decorate();
    if (out.outcome.type === 'done') finishExercise();
  }

  function finishExercise() {
    results[index] = stars(state);
    view.setInteractive(false);
    view.setPickHandler(null);
    renderDots();
    decorate();
    const last = index === lesson.exercises.length - 1;
    actions.replaceChildren(
      el('button', { class: 'big-btn', type: 'button', onclick: last ? finishLesson : () => startEx(index + 1) }, [
        last ? '🏁 Klaar!' : '▶ Verder',
      ]),
    );
    actions.querySelector('button').focus({ preventScroll: true });
  }

  function finishLesson() {
    const got = lessonStars(results);
    saveLessonStars(lesson.id, got);
    const next = LESSONS[lessonIndex + 1];
    const title = got === 3 ? 'Super goed!' : got === 2 ? 'Goed gedaan!' : 'Je hebt het gehaald!';
    const dialog = el('div', { class: 'result', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Les klaar: ${title}` }, [
      el('div', { class: 'result-card' }, [
        el('div', { class: 'dammie-face big', html: DAMMIE_SVG }),
        el('h2', { text: title }),
        el('p', { text: `Les ${lessonIndex + 1}, ${lesson.title}, is klaar.` }),
        el('div', { class: 'big-stars' }, [starRow(got)]),
        el('div', { class: 'result-buttons' }, [
          next
            ? el('button', { class: 'big-btn', type: 'button', onclick: () => { document.querySelector('.result')?.remove(); showLesson(app, nav, lessonIndex + 1); } }, ['▶ Volgende les'])
            : null,
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Les nog een keer', onclick: () => { document.querySelector('.result')?.remove(); showLesson(app, nav, lessonIndex); } }, ['↺']),
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar de lessenkaart', onclick: toMap }, ['🗺️']),
        ]),
      ]),
    ]);
    document.body.append(dialog);
  }

  hintBtn.addEventListener('click', () => {
    if (busy || !canHint(state)) return;
    const out = nextHint(state);
    state = out.state;
    if (out.hint.text) say(out.hint.text);
    view.clearSelection();
    decorate();
  });

  againBtn.addEventListener('click', () => {
    if (busy || state.done) return;
    // Opnieuw beginnen, maar gebruikte hints blijven meetellen.
    state = { ...state, game: state.start, moveCount: 0, picked: [] };
    view.setGame(state.game);
    say(state.ex.text);
    decorate();
  });

  startEx(0);
}
