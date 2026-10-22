// lessons.js — de lessen. Volgorde volgt "De Eerste Zet" (KNDB-jeugdmateriaal).
//
// Elke les heeft 3–5 opdrachten die steeds iets moeilijker worden. De laatste
// is de eindopdracht ("boss"): daar komt de hint pas na 2 keer "bijna".
// Uitleg van de velden van een opdracht: zie lesson-engine.js.
//
// Bordjes ter herinnering (veldnummers):
//
//   6x6            8x8
//   .  1  .  2  .  3       .  1  .  2  .  3  .  4
//   4  .  5  .  6  .       5  .  6  .  7  .  8  .
//   .  7  .  8  .  9       .  9  . 10  . 11  . 12
//  10  . 11  . 12  .      13  . 14  . 15  . 16  .
//   . 13  . 14  . 15       . 17  . 18  . 19  . 20
//  16  . 17  . 18  .      21  . 22  . 23  . 24  .
//                          . 25  . 26  . 27  . 28
//                         29  . 30  . 31  . 32  .

export const LESSONS = [
  {
    id: 'bord',
    title: 'Het dambord',
    icon: '🟫',
    exercises: [
      {
        size: 6,
        fen: 'W:W:B',
        text: 'Dit is een dambord. Tik op het donkere veld linksonder, in de hoek.',
        tip: 'Linksonder is de hoek bij je linkerhand, helemaal onderaan.',
        goal: { type: 'pick', squares: [16] },
      },
      {
        size: 6,
        fen: 'W:W:B',
        text: 'Dammen doe je alleen op de donkere velden. Tik 3 donkere velden aan.',
        tip: 'De donkere velden zijn bruin. Tik er drie aan.',
        goal: { type: 'pick', of: 'dark', count: 3 },
      },
      {
        size: 6,
        fen: 'W:W13-18:B1-6',
        text: 'Zo begint een partij. Jij speelt met wit. Tik op een witte schijf.',
        tip: 'De witte schijven staan onderaan, bij jou.',
        goal: { type: 'pick', of: 'color', color: 'w', count: 1 },
      },
      {
        size: 6,
        fen: 'W:W:B',
        boss: true,
        text: 'Eindopdracht! Tik alle donkere velden van de onderste rij aan.',
        tip: 'Kijk naar de onderste rij. Daar zijn drie donkere velden.',
        goal: { type: 'pick', squares: [16, 17, 18] },
      },
    ],
  },
  {
    id: 'schijf',
    title: 'De schijf',
    icon: '⚪',
    exercises: [
      {
        size: 6,
        fen: 'W:W14:B',
        options: { damHalen: false },
        demo: '14-11',
        text: 'Een schijf zet één stapje schuin vooruit. Tik op de schijf en dan op een groene stip.',
        tip: 'Tik eerst op de witte schijf.',
        goal: { type: 'move' },
      },
      {
        size: 6,
        fen: 'W:W14:B',
        options: { damHalen: false },
        text: 'Op welke velden mag deze schijf komen? Tik ze allebei aan.',
        tip: 'Eén stapje schuin vooruit: naar links of naar rechts.',
        goal: { type: 'pick', of: 'destinations', square: 14 },
      },
      {
        size: 6,
        fen: 'W:W15:B',
        options: { damHalen: false },
        text: 'Deze schijf staat aan de rand. Waar mag hij heen? Tik het veld aan.',
        tip: 'Aan de rand is er maar één stapje schuin vooruit.',
        goal: { type: 'pick', of: 'destinations', square: 15 },
      },
      {
        size: 6,
        fen: 'W:W17:B',
        options: { damHalen: false },
        text: 'Breng de schijf naar de ster!',
        tip: 'Zet steeds een stapje schuin vooruit, in de richting van de ster.',
        goal: { type: 'reach', square: 2 },
      },
      {
        size: 6,
        fen: 'W:W18:B',
        options: { damHalen: false },
        boss: true,
        text: 'Eindopdracht! Breng de schijf naar de ster. Let op: een schijf mag niet terug!',
        tip: 'De ster staat links. Ga steeds naar links omhoog.',
        goal: { type: 'reach', square: 1 },
      },
    ],
  },
  {
    id: 'beurt',
    title: 'Om de beurt',
    icon: '🔁',
    exercises: [
      {
        size: 6,
        fen: 'W:W13-18:B1-6',
        options: { damHalen: false },
        text: 'Bij dammen speel je om de beurt. Wit begint altijd! Zet een witte schijf.',
        tip: 'Tik op een witte schijf in de bovenste witte rij.',
        goal: { type: 'move' },
      },
      {
        size: 6,
        fen: 'B:W11,13,15,16,17,18:B1-6',
        options: { damHalen: false },
        text: 'Nu is zwart aan de beurt. Zwart gaat naar beneden. Zet een zwarte schijf.',
        tip: 'Tik op een zwarte schijf in de onderste zwarte rij.',
        goal: { type: 'move' },
      },
      {
        size: 6,
        fen: 'W:W13-18:B1-6',
        options: { damHalen: false },
        text: 'Zet eerst een witte schijf en daarna een zwarte.',
        tip: 'Wit begint. Kijk bovenaan wie er aan de beurt is.',
        goal: { type: 'turns', count: 2 },
      },
      {
        size: 6,
        fen: 'W:W16,18:B1,3',
        options: { damHalen: false },
        boss: true,
        text: 'Eindopdracht! Speel om de beurt: wit, zwart, wit, zwart.',
        tip: 'Kijk bovenaan wie er aan de beurt is.',
        goal: { type: 'turns', count: 4 },
      },
    ],
  },
  {
    id: 'dam',
    title: 'Dam halen',
    icon: '👑',
    exercises: [
      {
        size: 6,
        fen: 'W:W5:B',
        text: 'Komt een schijf op de overkant, dan wordt hij een DAM. Hij krijgt een kroontje! Zet de schijf naar de bovenste rij.',
        tip: 'De bovenste rij is de overkant.',
        goal: { type: 'promote', maxMoves: 1 },
      },
      {
        size: 6,
        fen: 'W:W8:B',
        text: 'Haal een dam! Je hebt 2 zetten nodig.',
        tip: 'Zet de schijf twee keer schuin vooruit.',
        goal: { type: 'promote', maxMoves: 2 },
      },
      {
        size: 6,
        fen: 'W:W7,14:B',
        text: 'Welke schijf is het snelst aan de overkant? Haal een dam in 2 zetten.',
        tip: 'De schijf die het dichtst bij de overkant staat, is het snelst.',
        goal: { type: 'promote', maxMoves: 2 },
      },
      {
        size: 6,
        fen: 'B:W:B14',
        text: 'Zwart haalt een dam aan de onderkant. Zet de zwarte schijf naar de onderste rij.',
        tip: 'Zwart gaat naar beneden.',
        goal: { type: 'promote', maxMoves: 1 },
      },
      {
        size: 6,
        fen: 'W:W16:B',
        boss: true,
        text: 'Eindopdracht! Haal een dam met deze schijf.',
        tip: 'Zet steeds een stapje schuin vooruit, tot je bovenaan bent.',
        goal: { type: 'promote' },
      },
    ],
  },
  {
    id: 'vliegen',
    title: 'De vliegende dam',
    icon: '🦅',
    exercises: [
      {
        size: 8,
        fen: 'W:WK18:B',
        demo: '18-4',
        text: 'Een dam mag ver vliegen: zoveel velden als hij wil, schuin vooruit én achteruit. Zet de dam!',
        tip: 'Tik op de dam en dan op een groene stip.',
        goal: { type: 'move' },
      },
      {
        size: 8,
        fen: 'W:WK29:B',
        text: 'Tik alle velden aan waar deze dam heen mag.',
        tip: 'Volg de lange schuine lijn vanaf de dam, helemaal tot de rand.',
        goal: { type: 'pick', of: 'destinations', square: 29 },
      },
      {
        size: 8,
        fen: 'W:WK29:B',
        text: 'Vlieg in één keer naar de ster!',
        tip: 'De ster ligt op dezelfde schuine lijn als de dam.',
        goal: { type: 'reach', square: 4, maxMoves: 1 },
      },
      {
        size: 8,
        fen: 'W:WK4:B',
        text: 'Een dam mag ook achteruit. Vlieg naar de ster!',
        tip: 'Vlieg schuin naar beneden.',
        goal: { type: 'reach', square: 29, maxMoves: 1 },
      },
      {
        size: 8,
        fen: 'W:WK29:B',
        boss: true,
        text: 'Eindopdracht! Vlieg in 2 zetten naar de ster. Je mag een bocht maken.',
        tip: 'Vlieg eerst naar het midden, dan schuin naar beneden.',
        goal: { type: 'reach', square: 32, maxMoves: 2 },
      },
    ],
  },
  {
    id: 'slaan',
    title: 'Slaan',
    icon: '🦘',
    exercises: [
      {
        size: 6,
        fen: 'W:W14:B11',
        options: { schijfSlaatAchteruit: false },
        demo: '14x7',
        text: 'Staat er een zwarte schijf vlak voor je, met een leeg veld erachter? Dan spring je eroverheen en sla je hem! Sla de zwarte schijf.',
        tip: 'Tik op je schijf en spring over de zwarte schijf heen.',
        goal: { type: 'capture' },
      },
      {
        size: 6,
        fen: 'W:W13:B11',
        options: { schijfSlaatAchteruit: false },
        text: 'Sla de zwarte schijf!',
        tip: 'Spring schuin naar rechts over de zwarte schijf.',
        goal: { type: 'capture' },
      },
      {
        size: 6,
        fen: 'W:W14:B9,11,12',
        options: { schijfSlaatAchteruit: false },
        showMust: false,
        text: 'Welke zwarte schijf kun je slaan? Sla hem!',
        tip: 'Achter de zwarte schijf moet een leeg veld zijn, anders kun je niet springen.',
        goal: { type: 'capture' },
      },
      {
        size: 6,
        fen: 'W:W13,15:B4,10,12',
        options: { schijfSlaatAchteruit: false },
        showMust: false,
        boss: true,
        text: 'Eindopdracht! Een van je schijven kan slaan. Vind hem en sla!',
        tip: 'Achter de zwarte schijf moet een leeg veld zijn.',
        goal: { type: 'capture' },
      },
    ],
  },
  {
    id: 'verplicht',
    title: 'Slaan moet!',
    icon: '❗',
    exercises: [
      {
        size: 6,
        fen: 'W:W13,15,17:B4,10,12',
        options: { schijfSlaatAchteruit: false },
        showMust: false,
        text: 'Als je kunt slaan, dan MOET je slaan. Welke schijf moet slaan? Tik hem aan.',
        tip: 'Zoek een witte schijf met een zwarte schijf vlak voor zich en een leeg veld daarachter.',
        goal: { type: 'pick', of: 'mustCapture' },
      },
      {
        size: 6,
        fen: 'W:W13,15,17:B4,10,12',
        options: { schijfSlaatAchteruit: false },
        showMust: false,
        text: 'Je mag geen andere zet doen, want je moet slaan. Sla!',
        tip: 'Het is de schijf die je net hebt gevonden.',
        goal: { type: 'capture' },
      },
      {
        size: 8,
        fen: 'W:W21,22,24,30:B13,18,20',
        options: { schijfSlaatAchteruit: false },
        showMust: false,
        text: 'Een groter bord! Welke schijf moet slaan? Tik hem aan.',
        tip: 'Kijk bij elke witte schijf: staat er een zwarte vlak voor, met een leeg veld erachter?',
        goal: { type: 'pick', of: 'mustCapture' },
      },
      {
        size: 8,
        fen: 'W:W21,22,24,30:B13,18,20',
        options: { schijfSlaatAchteruit: false },
        showMust: false,
        boss: true,
        text: 'Eindopdracht! Doe de zet die moet.',
        tip: 'Slaan gaat voor alles.',
        goal: { type: 'capture' },
      },
    ],
  },
  {
    id: 'achteruit',
    title: 'Achteruit slaan',
    icon: '↩️',
    exercises: [
      {
        size: 6,
        fen: 'W:W8:B11',
        demo: '8x13',
        text: 'Een schijf mag niet achteruit zetten, maar wel achteruit SLAAN! Sla de zwarte schijf achter je.',
        tip: 'De zwarte schijf staat schuin achter je. Spring er achteruit overheen.',
        goal: { type: 'capture' },
      },
      {
        size: 6,
        fen: 'W:W8,13:B9,12',
        showMust: false,
        text: 'Welke witte schijf kan slaan? Tik hem aan.',
        tip: 'Vergeet niet achteruit te kijken!',
        goal: { type: 'pick', of: 'mustCapture' },
      },
      {
        size: 6,
        fen: 'W:W5,13:B8,9',
        showMust: false,
        text: 'Er kan maar één schijf slaan: vooruit of achteruit? Sla!',
        tip: 'Kijk ook schuin achter je schijven.',
        goal: { type: 'capture' },
      },
      {
        size: 6,
        fen: 'W:W8,13:B9,12',
        showMust: false,
        boss: true,
        text: 'Eindopdracht! Sla de zwarte schijf.',
        tip: 'Achteruit slaan mag ook.',
        goal: { type: 'capture' },
      },
    ],
  },
];

export function lessonById(id) {
  return LESSONS.find((l) => l.id === id) || null;
}
