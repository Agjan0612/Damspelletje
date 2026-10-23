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
  onChoice,
  CHOICES,
  nextHint,
  canHint,
  currentHint,
  stars,
  lessonStars,
} from './lesson-engine.js';
import { loadProgress, saveLessonStars } from './storage.js';
import { el, dammieBubble, DAMMIE_SVG, wait, feedbackText } from './shared.js';

export const starRow = (n, max = 3) =>
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
// Opdrachtscherm: bord + Dammie + knoppen. Gebruikt door lessen én puzzels.
//
//   exercises   lijst opdrachten (zie lesson-engine.js)
//   backLabel   uitleg voor de terugknop, backIcon het plaatje (standaard 🗺️)
//   onBack()    terugknop
//   onSolved(index, stars, screen)  opdracht gehaald; vul de knoppen met
//               screen.setActions([...]) (bijv. "Verder")
//   isDone(i)   (optioneel) was opdracht i al eerder gehaald? (voor de stipjes)
// ---------------------------------------------------------------------------

export function createExerciseScreen(app, { exercises, backLabel, backIcon = '🗺️', onBack, onSolved, isDone = () => false }) {
  const backBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': backLabel, onclick: () => onBack() }, [backIcon]);
  const hintBtn = el('button', { class: 'icon-btn hint-btn', type: 'button', 'aria-label': 'Hint' }, ['💡']);
  const againBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Opdracht opnieuw' }, ['↺']);
  const dots = el('div', { class: 'progress', 'aria-label': 'Voortgang' });
  const bar = el('header', { class: 'bar' }, [backBtn, dots, el('div', { class: 'bar-right' }, [hintBtn, againBtn])]);
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
      ...exercises.map((ex, i) => {
        const now = i === index;
        const done = (now && state?.done) || (!now && (i < index || isDone(i)));
        const cls = done ? 'done' : now ? 'current' : '';
        return el('span', { class: `dot ${cls}${ex.boss ? ' boss' : ''}`, text: ex.boss ? '👑' : '' });
      }),
    );
  }

  function decorate() {
    const { goal } = state.ex;
    const hint = currentHint(state);
    view.setDecorations({
      stars: state.done ? [] : goal.type === 'reach' ? [goal.square] : goal.land || [],
      glow: hint.glow,
      marks: hint.marks,
      picked: state.picked,
    });
    hintBtn.disabled = busy || !canHint(state);
    againBtn.disabled = busy || state.done;
  }

  async function start(i) {
    index = i;
    const ex = exercises[i];
    state = startExercise(ex, i);
    actions.replaceChildren();
    view.setInteractive(true);
    view.setGame(state.game);
    view.setShowMustCapture(ex.showMust !== false);
    view.setPickHandler(ex.goal.type === 'pick' ? handlePick : null);
    renderDots();
    say(ex.text);
    decorate();
    if (ex.goal.type === 'choice') showChoices(ex);
    if (ex.demo) await playDemo(ex);
  }

  // Keuzevraag (bijv. "Is het remise?"): grote knoppen, het bord kijkt alleen.
  function showChoices(ex) {
    view.setInteractive(false);
    const buttons = CHOICES[ex.goal.ask].map((c) =>
      el('button', { class: 'big-btn choice-btn', type: 'button', onclick: () => handleChoice(c.value) }, [c.label]),
    );
    actions.replaceChildren(el('div', { class: 'choice-buttons' }, buttons));
  }

  function handleChoice(value) {
    if (busy || state.done) return;
    const out = onChoice(state, value);
    state = out.state;
    say(out.outcome.message);
    decorate();
    if (out.outcome.type === 'done') solved();
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
    view.setInteractive(false); // pas weer aan als de volgende stand klaarstaat
    const out = onMove(state, move);
    state = out.state;
    const { type, message, reply, between, after } = out.outcome;
    say(message);
    if (reply) {
      // Zwart zet terug (of laat zien wat er misgaat), met een sprongetje.
      // Het bord blijft uit tot de nieuwe stand klaarstaat.
      view.setGame(between);
      await wait(600);
      await view.animateMove(reply);
      await wait(type === 'retry' ? 1800 : 400);
      if (after && type === 'continue') say(`${message} ${after}`);
    } else if (type === 'retry' || type === 'reset') {
      await wait(type === 'reset' ? 1600 : 1200);
    }
    view.setGame(state.game);
    busy = false;
    if (type !== 'done') view.setInteractive(true);
    if (type === 'done') solved();
    else decorate();
  }

  function handlePick(tapInfo) {
    if (busy || state.done) return;
    const out = onPick(state, tapInfo);
    state = out.state;
    say(out.outcome.message);
    if (out.outcome.type === 'wrong') view.flash(tapInfo.row, tapInfo.col);
    decorate();
    if (out.outcome.type === 'done') solved();
  }

  const screen = {
    start,
    say,
    get index() { return index; },
    setActions(buttons) {
      actions.replaceChildren(...buttons);
      actions.querySelector('button')?.focus({ preventScroll: true });
    },
  };

  function solved() {
    view.setInteractive(false);
    view.setPickHandler(null);
    renderDots();
    decorate();
    onSolved(index, stars(state), screen);
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

  return screen;
}

export const bigButton = (label, onclick) => el('button', { class: 'big-btn', type: 'button', onclick }, [label]);

// Een kaartje midden op het scherm (les klaar, even pauze, ...).
export function showDialog({ title, text, label, starsCount = null, buttons }) {
  document.querySelector('.result')?.remove();
  const dialog = el('div', { class: 'result', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title }, [
    el('div', { class: 'result-card' }, [
      el('div', { class: 'dammie-face big', html: DAMMIE_SVG }),
      el('h2', { text: title }),
      el('p', { text }),
      starsCount != null ? el('div', { class: 'big-stars' }, [starRow(starsCount)]) : null,
      el('div', { class: 'result-buttons' }, buttons),
    ]),
  ]);
  document.body.append(dialog);
  return dialog;
}

export const closeDialog = () => document.querySelector('.result')?.remove();

// ---------------------------------------------------------------------------
// Lesscherm
// ---------------------------------------------------------------------------

export function showLesson(app, nav, lessonIndex) {
  const lesson = LESSONS[lessonIndex];
  const results = []; // sterren per opdracht
  const toMap = () => {
    closeDialog();
    showLessonMap(app, nav);
  };
  const again = (i) => () => {
    closeDialog();
    showLesson(app, nav, i);
  };

  function finishLesson() {
    const got = lessonStars(results);
    saveLessonStars(lesson.id, got);
    const next = LESSONS[lessonIndex + 1];
    const title = got === 3 ? 'Super goed!' : got === 2 ? 'Goed gedaan!' : 'Je hebt het gehaald!';
    showDialog({
      title,
      label: `Les klaar: ${title}`,
      text: `Les ${lessonIndex + 1}, ${lesson.title}, is klaar.`,
      starsCount: got,
      buttons: [
        next ? bigButton('▶ Volgende les', again(lessonIndex + 1)) : null,
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Les nog een keer', onclick: again(lessonIndex) }, ['↺']),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar de lessenkaart', onclick: toMap }, ['🗺️']),
      ],
    });
  }

  const screen = createExerciseScreen(app, {
    exercises: lesson.exercises,
    backLabel: 'Naar de lessenkaart',
    onBack: toMap,
    onSolved(i, got, scr) {
      results[i] = got;
      const last = i === lesson.exercises.length - 1;
      scr.setActions([last ? bigButton('🏁 Klaar!', finishLesson) : bigButton('▶ Verder', () => scr.start(i + 1))]);
    },
  });
  screen.start(0);
}
