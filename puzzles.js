// puzzles.js — de puzzels: "Zoek de slag!" per thema.
//
// Een puzzel is een opdracht zoals in lessons.js (zie lesson-engine.js), maar
// zonder nieuwe uitleg: het kind gebruikt wat het in de lessen leerde. Tekst,
// tip en doel komen van het thema, tenzij de puzzel er zelf een heeft.
// Bij de thema's vanaf "Verdedigen" zet zwart terug (puzzels in twee zetten).
// De oranje ring ("dit stuk moet slaan") staat uit: zoeken is de puzzel.
//
// Een thema gaat open als de les in `unlock` gehaald is. De tests bewaken dat
// een puzzel niets vraagt wat op dat moment nog niet geleerd is.
// Puzzel-id's nooit veranderen: daaronder worden de sterren bewaard.
//
// De standen zijn met een zoekhulpje voorgesteld en daarna met de hand gekozen.
// Ze staan hier vast; er wordt tijdens het spelen niets willekeurig gemaakt.

export const THEMES = [
  {
    id: 'slaan',
    title: 'Slaan',
    icon: '🦘',
    unlock: 'achteruit',
    text: 'Zoek de slag!',
    tip: 'Kijk bij elke witte schijf: staat er een zwarte vlak naast, met een leeg veld erachter? Kijk ook achteruit!',
    puzzles: [
      { id: 'slaan-1', size: 6, fen: 'W:W7,13,16:B5,9,10' },
      { id: 'slaan-2', size: 6, fen: 'W:W8,14:B1,7,11' },
      { id: 'slaan-3', size: 8, fen: 'W:W17,24,25:B2,14,16,20' },
      { id: 'slaan-4', size: 8, fen: 'W:W13,18,22,29:B7,8,14,17' },
      { id: 'slaan-5', size: 8, fen: 'W:W13,14,23,27,28,32:B1,5,9,16,18' },
      { id: 'slaan-6', size: 8, fen: 'W:W14,15,18,21,23,24,27:B1,2,6,10,13,20' },
    ],
  },
  {
    id: 'meerslag',
    title: 'Meerslag',
    icon: '⛓️',
    unlock: 'meerslag',
    text: 'Zoek de meerslag! Sla zo veel stukken als je kunt.',
    tip: 'Kijk na de eerste sprong: kun je nóg een keer springen?',
    puzzles: [
      { id: 'meerslag-1', size: 8, fen: 'W:W16,27:B1,10,11' },
      { id: 'meerslag-2', size: 8, fen: 'W:W15,24,32:B8,9,10,19' },
      { id: 'meerslag-3', size: 8, fen: 'W:W14,27:B10,11,19' },
      { id: 'meerslag-4', size: 8, fen: 'W:W14,27,32:B4,10,11,15,19' },
      { id: 'meerslag-5', size: 8, fen: 'W:W15,18,20,22,24:B4,6,10,14,19' },
      { id: 'meerslag-6', size: 8, fen: 'W:W14,17,18,19,27:B1,5,9,10,11,12,15' },
    ],
  },
  {
    id: 'damslaan',
    title: 'Slaan met de dam',
    icon: '🏹',
    unlock: 'damslaan',
    text: 'Zoek de slag met de dam!',
    tip: 'Volg de schuine lijnen vanaf de dam. Achter de zwarte schijf moet een leeg veld zijn.',
    puzzles: [
      { id: 'damslaan-1', size: 8, fen: 'W:WK29,31:B15,20' },
      { id: 'damslaan-2', size: 8, fen: 'W:WK3,15:B5,13,14' },
      {
        id: 'damslaan-3',
        size: 8,
        fen: 'W:WK28,16:B5,10,17',
        text: 'Sla met de dam en land op de ster!',
        goal: { type: 'capture', land: [1] },
      },
      { id: 'damslaan-4', size: 8, fen: 'W:WK14,13,20,30:B6,9,11,12,19' },
      {
        id: 'damslaan-5',
        size: 8,
        fen: 'W:WK1,21,30:B13,14,17,19,20',
        text: 'Sla met de dam en land op de ster!',
        goal: { type: 'capture', land: [28] },
      },
      { id: 'damslaan-6', size: 8, fen: 'W:WK9,15,16,31:B3,4,6,8,10,20' },
    ],
  },
  {
    id: 'meerslag-voor',
    title: 'Meerslag gaat voor',
    icon: '🔢',
    unlock: 'meerslag-voor',
    text: 'Zoek de slag met de meeste stukken!',
    tip: 'Tel bij elke slag hoeveel stukken je slaat. De meeste gaat voor. Een dam telt als 1.',
    puzzles: [
      { id: 'voor-1', size: 8, fen: 'W:W18,25:B8,14,15' },
      { id: 'voor-2', size: 8, fen: 'W:W14,15,25:B3,8,10,11' },
      { id: 'voor-3', size: 8, fen: 'W:WK8,23,24:B1,4,11,13,19' },
      { id: 'voor-4', size: 8, fen: 'W:WK6,16,17:B1,10,14,19' },
      { id: 'voor-5', size: 8, fen: 'W:WK23,13,14,17,24:B7,9,10,18' },
      { id: 'voor-6', size: 8, fen: 'W:WK30,13,15,21,26,29:B5,8,16,17,18' },
    ],
  },
  {
    id: 'bocht',
    title: 'Damslag met bocht',
    icon: '↪️',
    unlock: 'dam-bocht',
    text: 'Zoek de damslag met een bocht!',
    tip: 'Land zo, dat de dam met een bocht verder kan slaan.',
    puzzles: [
      { id: 'bocht-1', size: 8, fen: 'W:WK14,17:B10,16,22' },
      { id: 'bocht-2', size: 8, fen: 'W:WK22,24:B13,16,18' },
      { id: 'bocht-3', size: 8, fen: 'W:WK13:B7,9,16' },
      { id: 'bocht-4', size: 8, fen: 'W:WK4,28:B7,8,9,24' },
      { id: 'bocht-5', size: 8, fen: 'W:WK8,14,24,25,31:B5,6,10,17,18,20' },
      { id: 'bocht-6', size: 8, fen: 'W:WK16,27:B9,14,17,23,24' },
    ],
  },
  {
    id: 'gemengd',
    title: 'Alles door elkaar',
    icon: '🎲',
    unlock: 'turkse-slag',
    text: 'Zoek de beste slag!',
    tip: 'Kijk bij al je stukken, ook bij de dam. Tel hoeveel je kunt slaan.',
    puzzles: [
      {
        id: 'gemengd-1',
        size: 8,
        fen: 'W:W17,23,26,31:B14,19,22',
        text: 'Twee slagen mogen. Kies de slimme: daarna kan zwart niet terugslaan.',
        tip: 'Kijk na elke slag: staat jouw schijf dan vlak voor een zwarte, met een leeg veld erachter?',
        notBest: 'Bijna! Die slag mag ook, maar dan kan zwart terugslaan. Probeer het nog eens.',
        goal: { type: 'capture', best: 'safe' },
      },
      {
        id: 'gemengd-2',
        size: 8,
        fen: 'W:W18,21,28:B2,7,8,15,17,20',
        text: 'Zoek de slag! Kun je er meteen een dam mee halen?',
        tip: 'Een slag die op de overkant eindigt, maakt een dam.',
        success: 'Super! De slag eindigde op de overkant: een dam!',
      },
      {
        id: 'gemengd-3',
        size: 8,
        fen: 'W:W21,23,25,32:B9,12,18,K17',
        text: 'Twee slagen van 2 mogen. Welke is het slimst?',
        tip: 'Een zwarte dam is gevaarlijk. Sla hem mee!',
        notBest: 'Bijna! Die slag mag ook, maar dan blijft de zwarte dam staan. Probeer het nog eens.',
        goal: { type: 'capture', best: 'king' },
      },
      {
        id: 'gemengd-4',
        size: 8,
        fen: 'W:WK27,21,24:B6,7,18,22',
        text: 'Sla zo veel als je kunt met de dam. Let op: geslagen stukken blijven staan tot de slag klaar is!',
        tip: 'Een geslagen stuk staat nog in de weg. Daar kan de dam niet overheen.',
      },
      {
        id: 'gemengd-5',
        size: 8,
        fen: 'W:W12,14,17,19,32:B1,7,10,13,21,22,24',
        text: 'Twee slagen mogen. Kies de slimme: daarna kan zwart niet terugslaan.',
        tip: 'Kijk na elke slag of zwart jouw schijf kan slaan.',
        notBest: 'Bijna! Die slag mag ook, maar dan kan zwart terugslaan. Probeer het nog eens.',
        goal: { type: 'capture', best: 'safe' },
      },
      { id: 'gemengd-6', size: 8, fen: 'W:WK20,13,23,25,31:B5,8,9,10,19,21,22,24' },
    ],
  },
  {
    id: 'verdedigen',
    title: 'Verdedigen',
    icon: '🛡️',
    unlock: 'verdedigen',
    text: 'Zoek de enige zet die niets weggeeft!',
    tip: 'Kijk na elke zet: staat een witte schijf vlak voor een zwarte, met een leeg veld erachter?',
    goal: { type: 'safe' },
    puzzles: [
      { id: 'verdedigen-1', size: 8, fen: 'W:W15,22,25,27:B6,10,20' },
      { id: 'verdedigen-2', size: 8, fen: 'W:W17,18,19,25:B3,4,12,16' },
      { id: 'verdedigen-3', size: 8, fen: 'W:W16,17,19,32:B3,4,7,20' },
      { id: 'verdedigen-4', size: 8, fen: 'W:W13,18,22,27:B6,10,11,19' },
      { id: 'verdedigen-5', size: 8, fen: 'W:W16,17,26,28:B3,4,8,20' },
      { id: 'verdedigen-6', size: 8, fen: 'W:W14,17,25,30:B1,5,8,13,15' },
    ],
  },
  {
    id: 'twee-voor-een',
    title: 'Twee voor één',
    icon: '🎁',
    unlock: 'twee-voor-een',
    text: 'Geef 1 schijf weg, en sla er daarna meer!',
    tip: 'Welke schijf kun je weggeven? Waar landt zwart dan, en kun jij dan doorslaan?',
    goal: { type: 'trade', net: 1 },
    puzzles: [
      { id: 'twee-1', size: 8, fen: 'W:W10,26,30:B4,8,17,19' },
      { id: 'twee-2', size: 8, fen: 'W:W26,27,32:B6,7,18,19' },
      { id: 'twee-3', size: 8, fen: 'W:W17,19,21,30:B4,6,10,14' },
      { id: 'twee-4', size: 8, fen: 'W:W15,16,18,20,26:B2,6,7,8' },
      { id: 'twee-5', size: 8, fen: 'W:W17,21,25,28,32:B8,9,10,18,19' },
      { id: 'twee-6', size: 8, fen: 'W:W13,23,24,26,28,31:B2,7,15,16' },
    ],
  },
  {
    id: 'vastzetten',
    title: 'Vastzetten',
    icon: '🧱',
    unlock: 'vastzetten',
    text: 'Zet zwart vast!',
    tip: 'Waar wil de zwarte schijf heen? Zet dat veld dicht, zonder dat zwart kan slaan.',
    goal: { type: 'block' },
    puzzles: [
      { id: 'vastzetten-1', size: 8, fen: 'W:W16,24:B12' },
      { id: 'vastzetten-2', size: 8, fen: 'W:W9,17:B5' },
      { id: 'vastzetten-3', size: 8, fen: 'W:W17,18,25:B13' },
      { id: 'vastzetten-4', size: 8, fen: 'W:W27,31,32:B20,24' },
      {
        id: 'vastzetten-5',
        size: 8,
        fen: 'W:W8,13,16:B4,5',
        text: 'Zet zwart vast in 2 zetten!',
        goal: { type: 'block', maxMoves: 2 },
      },
      {
        id: 'vastzetten-6',
        size: 8,
        fen: 'W:W22,24,25,31:B13,20',
        text: 'Zet zwart vast in 2 zetten!',
        goal: { type: 'block', maxMoves: 2 },
      },
    ],
  },
];

// Een puzzel als lesopdracht (voor de lesmotor en het scherm).
export function puzzleExercise(theme, puzzle) {
  return {
    showMust: false,
    text: theme.text,
    tip: theme.tip,
    goal: theme.goal || { type: 'capture' },
    ...puzzle,
  };
}

export const ALL_PUZZLES = THEMES.flatMap((theme) =>
  theme.puzzles.map((p) => ({ theme, puzzle: p, ex: puzzleExercise(theme, p) })),
);

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || null;
}

// Hoe staat een thema ervoor? `progress` komt uit storage.js.
//   { unlocked, done (aantal gehaalde puzzels), total, stars (som) }
export function themeStatus(theme, progress) {
  const lessons = progress.lessons || {};
  const puzzles = progress.puzzles || {};
  const got = theme.puzzles.map((p) => puzzles[p.id]?.stars || 0);
  return {
    unlocked: !!lessons[theme.unlock],
    done: got.filter((s) => s > 0).length,
    total: theme.puzzles.length,
    stars: got.reduce((a, b) => a + b, 0),
  };
}

// Na elke 4 opgeloste puzzels biedt Dammie rustig aan om te stoppen.
export const BREAK_EVERY = 4;
export function offerBreak(solvedThisVisit) {
  return solvedThisVisit > 0 && solvedThisVisit % BREAK_EVERY === 0;
}
