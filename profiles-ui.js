// profiles-ui.js — "Wie speelt er?", een dier (en naam) kiezen, en de hoek
// voor ouders: reservekopie bewaren/laden, kinderen wijzigen of verwijderen.
//
// De gegevens zelf staan in storage.js.

import {
  ANIMALS,
  MAX_PROFILES,
  NAME_MAX,
  animalById,
  listProfiles,
  currentProfile,
  addProfile,
  updateProfile,
  switchProfile,
  removeProfile,
  freeAnimals,
  profileLabel,
  exportBackup,
  backupFileName,
  readBackup,
  importBackup,
  askPersist,
} from './storage.js';
import { el, dammieBubble } from './shared.js';
import { speak, playSound, dutchVoice } from './speech.js';
import { showDialog, closeDialog, bigButton } from './lessons-ui.js';

const animalIcon = (p) => animalById(p.animal)?.icon || '❔';

// ---------------------------------------------------------------------------
// Wie speelt er?
// ---------------------------------------------------------------------------

export function showWhoPlays(app, nav) {
  closeDialog();
  const profiles = listProfiles();
  const { box } = dammieBubble('Wie speelt er? Tik op jouw dier.');
  const cards = profiles.map((p) =>
    el(
      'button',
      {
        class: `profile-card${p.id === currentProfile()?.id ? ' current' : ''}`,
        type: 'button',
        'aria-label': profileLabel(p),
        onclick: () => {
          switchProfile(p.id);
          nav.profileChanged();
          // Nog geen dier (oude voortgang): dat kiest het kind eerst.
          if (!p.animal) showProfileEditor(app, nav, { id: p.id });
          else nav.home();
        },
      },
      [el('span', { class: 'profile-icon', text: animalIcon(p) }), el('strong', { text: p.name || animalById(p.animal)?.name || 'Kies een dier' })],
    ),
  );
  if (profiles.length < MAX_PROFILES) {
    cards.push(
      el(
        'button',
        {
          class: 'profile-card add',
          type: 'button',
          'aria-label': 'Nieuw kind',
          onclick: () => showProfileEditor(app, nav, { onBack: () => showWhoPlays(app, nav) }),
        },
        [el('span', { class: 'profile-icon', text: '➕' }), el('strong', { text: 'Nieuw kind' })],
      ),
    );
  }
  const canGoHome = !!currentProfile()?.animal;
  app.replaceChildren(
    el('main', { class: 'screen start who-plays' }, [
      canGoHome
        ? el('div', { class: 'top-left' }, [
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: nav.home }, ['🏠']),
        ])
        : null,
      box,
      el('div', { class: 'profile-grid' }, cards),
    ]),
  );
  window.scrollTo?.(0, 0);
}

// ---------------------------------------------------------------------------
// Dier en naam kiezen (nieuw kind, of een bestaand profiel wijzigen)
//   id       bestaand profiel (leeg = nieuw kind)
//   onBack   terugknop (leeg = geen terugknop, bijv. bij het allereerste kind)
//   onDone   na "Klaar" (standaard: naar het startscherm met dit kind)
// ---------------------------------------------------------------------------

export function showProfileEditor(app, nav, { id = null, onBack = null, onDone = null } = {}) {
  closeDialog();
  const editing = id ? listProfiles().find((p) => p.id === id) : null;
  const first = !editing && listProfiles().length === 0;
  const free = new Set(freeAnimals(id).map((a) => a.id));
  let chosen = editing?.animal || null;

  let intro = 'Welk dier ben jij? Tik erop.';
  if (first) intro = 'Hoi! Ik ben Dammie. Welk dier ben jij? Tik erop.';
  else if (editing && !editing.animal) intro = 'Hoi! Kies eerst welk dier jij bent. Je sterren blijven gewoon bewaard.';
  else if (editing) intro = 'Kies een ander dier, of verander de naam.';
  const { box, say } = dammieBubble(intro);

  const nameInput = el('input', {
    class: 'name-input',
    type: 'text',
    id: 'profile-name',
    maxlength: String(NAME_MAX),
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    enterkeyhint: 'done',
    placeholder: 'Bijvoorbeeld Noor',
    value: editing?.name || '',
  });
  const doneBtn = bigButton('▶ Klaar', done);
  const nameRow = el('div', { class: 'name-row' }, [
    el('label', { for: 'profile-name', text: 'Naam (mag leeg blijven)' }),
    nameInput,
    doneBtn,
  ]);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') done();
  });

  const buttons = ANIMALS.map((a) =>
    el(
      'button',
      {
        class: `animal-btn${a.id === chosen ? ' chosen' : ''}`,
        type: 'button',
        disabled: !free.has(a.id),
        'aria-label': free.has(a.id) ? a.name : `${a.name}, al gekozen door een ander kind`,
        'aria-pressed': a.id === chosen ? 'true' : 'false',
        'data-animal': a.id,
        onclick: () => choose(a),
      },
      [el('span', { text: a.icon })],
    ),
  );

  function choose(a) {
    chosen = a.id;
    for (const b of buttons) {
      const on = b.dataset.animal === a.id;
      b.classList.toggle('chosen', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    nameRow.hidden = false;
    nameRow.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    say(`Een ${a.name.toLowerCase()}! Wil je ook je naam typen? Dat mag, maar het hoeft niet. Tik dan op Klaar.`);
  }

  function done() {
    if (!chosen) return say('Tik eerst op een dier.');
    const name = nameInput.value;
    const saved = editing ? updateProfile(editing.id, { animal: chosen, name }) : addProfile({ animal: chosen, name });
    if (!saved) return say('Dat lukte niet. Kies een ander dier.');
    if (onDone) return onDone(saved);
    nav.profileChanged();
    return nav.home();
  }

  nameRow.hidden = !chosen;
  app.replaceChildren(
    el('main', { class: 'screen start profile-editor' }, [
      onBack ? el('div', { class: 'top-left' }, [el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Terug', onclick: onBack }, ['↩'])]) : null,
      box,
      el('div', { class: 'animal-grid' }, buttons),
      nameRow,
    ]),
  );
  window.scrollTo?.(0, 0);
}

// ---------------------------------------------------------------------------
// Voor ouders: eerst een rekensom, zodat een kind er niet per ongeluk komt.
// (Dit is geen echte beveiliging, alleen een drempel.)
// ---------------------------------------------------------------------------

export function openParents(app, nav, random = Math.random) {
  const a = 21 + Math.floor(random() * 29);
  const b = 21 + Math.floor(random() * 29);
  const input = el('input', {
    class: 'gate-input',
    type: 'text',
    inputmode: 'numeric',
    pattern: '[0-9]*',
    autocomplete: 'off',
    'aria-label': `Hoeveel is ${a} plus ${b}?`,
  });
  const note = el('p', { class: 'gate-note', 'aria-live': 'polite' });
  const check = () => {
    if (Number(input.value.trim()) === a + b) {
      closeDialog();
      showParents(app, nav);
    } else {
      note.textContent = 'Dat klopt niet. Probeer het nog eens.';
      input.select();
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });
  showDialog({
    spoken: false, // voor ouders, niet voor het kind
    title: 'Voor ouders',
    text: `Hoeveel is ${a} + ${b}?`,
    extra: el('div', { class: 'gate' }, [input, note]),
    buttons: [
      bigButton('OK', check),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Terug', onclick: closeDialog }, ['✕']),
    ],
  });
  input.focus();
}

const LOAD_ERRORS = {
  'geen-bestand': 'Dit bestand kan Dammie niet lezen. Kies een bestand dat begint met "damvoortgang".',
  'ander-bestand': 'Dit is geen reservekopie van Dammie. Kies een bestand dat begint met "damvoortgang".',
  leeg: 'In dit bestand staan geen kinderen. Er is niets veranderd.',
};

export function showParents(app, nav, message = '') {
  closeDialog();
  const profiles = listProfiles();
  const status = el('p', { class: 'parents-status', 'aria-live': 'polite', text: message });
  const again = (msg) => showParents(app, nav, msg);

  // Bewaren: een bestandje downloaden (op de iPad komt het in Bestanden).
  function save() {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: backupFileName() });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = `✅ Bewaard als ${backupFileName()}. Zet het bestand op een veilige plek, bijvoorbeeld in iCloud.`;
    askPersist();
  }

  // Laden: eerst lezen en laten zien wat erin staat, dan pas vervangen.
  const fileInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const text = await file.text();
    const read = readBackup(text);
    if (!read.ok) {
      status.textContent = LOAD_ERRORS[read.reason];
      return;
    }
    const names = read.state.profiles.map(profileLabel).join(', ');
    showDialog({
      spoken: false,
      title: 'Voortgang laden?',
      text: `In dit bestand: ${names}. Alles wat nu op dit apparaat staat, wordt vervangen.`,
      buttons: [
        bigButton('📂 Ja, laden', () => {
          importBackup(text);
          nav.profileChanged();
          again('✅ De voortgang is geladen.');
        }),
        el('button', { class: 'big-btn soft', type: 'button', onclick: closeDialog }, ['Nee, toch niet']),
      ],
    });
  });

  function remove(p) {
    showDialog({
      spoken: false,
      title: 'Weet je het zeker?',
      text: `Dan zijn de sterren en badges van ${profileLabel(p)} weg. Twijfel je? Bewaar dan eerst de voortgang.`,
      buttons: [
        bigButton('🗑 Ja, verwijder', () => {
          removeProfile(p.id);
          nav.profileChanged();
          again(`${profileLabel(p)} is verwijderd.`);
        }),
        el('button', { class: 'big-btn soft', type: 'button', onclick: closeDialog }, ['Nee, toch niet']),
      ],
    });
  }

  const backToParents = () => showParents(app, nav);
  const kidRows = profiles.map((p) =>
    el('li', { class: 'kid-row' }, [
      el('span', { class: 'kid-name', text: `${animalIcon(p)} ${p.name || animalById(p.animal)?.name || 'nog geen dier'}` }),
      el('button', {
        class: 'small-btn',
        type: 'button',
        onclick: () => showProfileEditor(app, nav, { id: p.id, onBack: backToParents, onDone: () => again('✅ Gewijzigd.') }),
      }, ['✏️ Wijzig']),
      el('button', { class: 'small-btn', type: 'button', onclick: () => remove(p) }, ['🗑 Verwijder']),
    ]),
  );
  if (profiles.length < MAX_PROFILES) {
    kidRows.push(
      el('li', { class: 'kid-row' }, [
        el('button', {
          class: 'small-btn',
          type: 'button',
          onclick: () => showProfileEditor(app, nav, { onBack: backToParents, onDone: () => again('✅ Kind toegevoegd.') }),
        }, ['➕ Kind toevoegen']),
      ]),
    );
  }

  const storageNote = el('p', { text: 'Even kijken of deze browser de voortgang goed bewaart…' });
  askPersist().then((ok) => {
    storageNote.textContent = ok === true
      ? '✅ Deze browser bewaart de voortgang extra goed.'
      : 'ℹ️ Deze browser kan de voortgang opruimen, bijvoorbeeld als er weinig ruimte is of als Dammie lang niet gebruikt wordt. Bewaar daarom af en toe de voortgang.';
  });

  app.replaceChildren(
    el('main', { class: 'screen map parents' }, [
      el('header', { class: 'map-head' }, [
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Naar het begin', onclick: nav.home }, ['🏠']),
        el('h1', { text: 'Voor ouders' }),
      ]),
      status,
      el('section', { class: 'parents-card' }, [
        el('h2', { text: 'Voortgang bewaren' }),
        el('p', {
          text: 'Alle voortgang staat alleen op dit apparaat. Bewaar af en toe een reservekopie: een klein bestandje met alle kinderen. Daarmee kun je ook overstappen naar een ander apparaat.',
        }),
        el('div', { class: 'parents-buttons' }, [
          bigButton('💾 Bewaar voortgang', save),
          el('button', { class: 'big-btn soft', type: 'button', onclick: () => fileInput.click() }, ['📂 Laad voortgang']),
          fileInput,
        ]),
        storageNote,
      ]),
      el('section', { class: 'parents-card' }, [
        el('h2', { text: 'Kinderen' }),
        el('ul', { class: 'kid-list' }, kidRows),
      ]),
      speechSection(listProfiles()),
      el('section', { class: 'parents-card' }, [
        el('h2', { text: 'Privacy' }),
        el('p', {
          text: 'Deze app verzamelt niets. Er gaat niets naar internet: geen account, geen reclame, geen tracking. Alles blijft op dit apparaat.',
        }),
      ]),
    ]),
  );
  window.scrollTo?.(0, 0);
}

// ---------------------------------------------------------------------------
// Voor ouders: spraak en geluid (per kind), en welke stem Dammie gebruikt
// ---------------------------------------------------------------------------

const VOICE_TIP = 'Op de iPad: Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen → Nederlands.';

function voiceText() {
  if (!globalThis.speechSynthesis) return 'ℹ️ Deze browser kan niet praten. Dammie laat alles als tekst zien.';
  const v = dutchVoice();
  if (!v) {
    return `ℹ️ Er is geen Nederlandse stem op dit apparaat gevonden. Dammie laat alles als tekst zien. Een stem toevoegen kan zo: ${VOICE_TIP}`;
  }
  return `🗣️ Dammie praat met de stem ${v.name} (${v.lang}). Klinkt die wat robotachtig? Daar kun je vaak een betere versie van downloaden. ${VOICE_TIP}`;
}

function speechSection(profiles) {
  const note = el('p', { class: 'voice-note', text: voiceText() });
  // Sommige browsers laden de stemmen pas na een tijdje.
  globalThis.speechSynthesis?.addEventListener?.('voiceschanged', () => (note.textContent = voiceText()), { once: true });

  const toggle = (p, key, icon, label) => {
    const btn = el('button', { class: 'small-btn toggle-btn', type: 'button' });
    const show = (on) => {
      btn.textContent = `${icon} ${label}: ${on ? 'aan' : 'uit'}`;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };
    show(p.settings[key]);
    btn.addEventListener('click', () => {
      const now = listProfiles().find((q) => q.id === p.id);
      if (!now) return;
      const saved = updateProfile(p.id, { settings: { [key]: !now.settings[key] } });
      show(saved.settings[key]);
    });
    return btn;
  };

  const rows = profiles.map((p) =>
    el('li', { class: 'kid-row' }, [
      el('span', { class: 'kid-name', text: `${animalIcon(p)} ${p.name || animalById(p.animal)?.name || 'nog geen dier'}` }),
      toggle(p, 'speech', '🗣️', 'Spraak'),
      toggle(p, 'sound', '🔔', 'Geluid'),
    ]),
  );

  return el('section', { class: 'parents-card' }, [
    el('h2', { text: 'Spraak en geluid' }),
    el('p', { text: 'Dammie zegt alles ook hardop, en er zijn zachte geluidjes bij een zet. Per kind kun je ze uitzetten. Alles blijft ook gewoon op het scherm staan.' }),
    note,
    el('div', { class: 'parents-buttons' }, [
      el('button', {
        class: 'big-btn soft',
        type: 'button',
        onclick: () => {
          speak('Hoi! Ik ben Dammie. Zo klink ik.', { force: true, always: true });
          playSound('success');
        },
      }, ['🗣️ Probeer de stem']),
    ]),
    el('ul', { class: 'kid-list' }, rows),
  ]);
}
