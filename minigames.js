// minigames.js — mini-partijen tegen de computer, na les 4, 8, 13 en 19.
//
// In een mini-partij gelden alleen de regels die het kind al kent. Wat nog
// niet geleerd is, staat uit via de opties van rules.js. De tests controleren
// dat (zie tests.js, groep "Mini-partij").
//
//   id        vast houden: hieronder staat in localStorage of hij gespeeld is
//   after     id van de les waarna de mini-partij opengaat
//   size      bordgrootte; fen = beginstand (leeg = gewone beginstand)
//   options   regels die (nog) uit staan
//   explainMeerslag  Dammie legt een meerslag uit (die komt pas in les 9)
//   intro     wat Dammie aan het begin zegt
//
// Een mini-partij is nooit verplicht: de volgende les gaat gewoon open.

export const MINI_GAMES = [
  {
    id: 'mini-race',
    after: 'dam',
    title: 'Race naar de overkant',
    icon: '🏁',
    size: 6,
    // 3 schijven elk: met meer schijven staan ze elkaar vaak vast.
    fen: 'W:W16,17,18:B1,2,3',
    options: { slaan: false, eersteDamWint: true },
    intro: 'Race naar de overkant! Wie het eerst een dam haalt, wint. Slaan kan nog niet.',
  },
  {
    id: 'mini-slaan',
    after: 'achteruit',
    title: 'Mini-partij: slaan',
    icon: '⚔️',
    size: 6,
    options: { meerslagGaatVoor: false },
    explainMeerslag: true,
    intro: 'Een echte partij op het kleine bord! Slaan moet, ook achteruit. Wie alle stukken van de ander slaat, wint.',
  },
  {
    id: 'mini-meerslag',
    after: 'dam-bocht',
    title: 'Mini-partij: meerslag',
    icon: '🎯',
    size: 8,
    options: {},
    intro: 'Een partij op het middelste bord, met alle regels. Kijk goed: wie het meeste kan slaan, moet dat doen!',
  },
  {
    id: 'mini-vastzetten',
    after: 'vastzetten',
    title: 'Mini-partij: vastzetten',
    icon: '🔒',
    size: 8,
    options: {},
    intro: 'Een hele partij! Je wint als zwart geen stukken meer heeft, of niet meer kan zetten.',
  },
];
