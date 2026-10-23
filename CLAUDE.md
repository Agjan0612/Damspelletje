# Dammie – damleerspel voor kinderen van 6–9 jaar

Een kind leert stap voor stap internationaal dammen (FMJD/KNDB-regels) en kan
spelen tegen een instelbare computer. Volledige achtergrond: `docs/briefing.md`.
Arnout is geen programmeur: leg keuzes kort en in gewone taal uit (Nederlands).

## Techniek (vaste afspraken)
- Gewone HTML/CSS/JavaScript (ES-modules). GEEN build-stap, frameworks, CDN's,
  externe lettertypes, server, analytics of cookies. Later een PWA op GitHub Pages.
- Bestanden in de hoofdmap:
  - `rules.js` regels · `input.js` wat een tik betekent · `board.js` het bord
  - `lessons.js` lesdata · `lesson-engine.js` lesmotor (controle, hints, sterren)
  - `ui.js` start, samen spelen en tegen de computer · `lessons-ui.js` lessenkaart en
    opdrachtscherm (ook voor puzzels) · `puzzles.js` puzzeldata ·
    `puzzles-ui.js` puzzelkaart en puzzelscherm
  - `ai.js` de computer (zoeken, niveaus, "weggegeven?", niveau aanpassen)
    · `ai-worker.js` laat ai.js op de achtergrond denken · `computer.js`
    vraagt de worker om een zet (met reserve) · `minigames.js` mini-partijen
  - `shared.js` Dammie en teksten · `storage.js` voortgang en profielen
    (localStorage) · `badges.js` badges en bordthema's · `rewards-ui.js`
    Prijzenkast en badgemelding · `profiles-ui.js` "Wie speelt er?", dier
    kiezen en de hoek voor ouders
  - `style.css` · `tests.js` + `tests.html` (tests)
  - Later: `speech.js`, `manifest.json`, `sw.js`.
- Code in het Engels, commentaar en teksten voor het kind in het Nederlands.

## Regels (`rules.js`)
- Eén regelmodule voor 6x6, 8x8 en 10x10. Nooit "10" of "50" hardcoderen.
- Velden genummerd 1..N linksboven→rechtsonder; linksonder donker; wit begint.
- Stukken: `w`/`W` wit (schijf/dam), `b`/`B` zwart, `.` leeg. Standen als FEN:
  `W:W31,32,K45:B1,2`.
- Lastige punten die door tests bewaakt worden: meerslag gaat voor (dam telt
  als 1), geslagen stukken pas na de slag weg (Turkse slag), schijf promoveert
  alleen als hij op de damlijn EINDIGT, vliegende dam landt op elk vrij veld,
  remise: 3x herhaling, 25-zetten, 16/5-zetten (niet gestapeld).
- Lessen zetten regels tijdelijk uit via opties: `damHalen`, `slagplicht`,
  `meerslagGaatVoor`, `schijfSlaatAchteruit`, `slaan` (false = niemand kan
  slaan) en `eersteDamWint` (de race na les 4).

## Lessen
- Elke opdracht: stand (FEN), tekst, tip, doel. Eindopdracht (`boss`) als laatste.
- De tests controleren elke opdracht: geldige stand, oplosbaar, geen slag vóór
  les "Slaan", geen meerslag vóór les 9, meerderheidsregel speelt pas vanaf
  les 11, elk soort opdracht pas na de les waarin het geleerd wordt.
  Nieuwe les = deze tests moeten groen.
- Hints in 3 stappen (tip, stuk licht op, voordoen). Sterren: 3/2/1 naar
  aantal hints; altijd "gehaald". Nooit "Fout!", altijd "Bijna!".

## Werkwijze
- Tests draaien: `npm test` (Node) of `tests.html` in de browser. Ze draaien
  ook automatisch op GitHub (Actions) bij elke push.
- Code is pas klaar als ALLE tests groen zijn. Bij een regelfout: eerst een
  test die faalt, dan de code repareren.
- Verzin geen "bekende" perft-getallen; alleen met de hand na te rekenen
  waarden mogen als test.
- Per fase: eerst een kort plan, wachten op akkoord, uitvoeren, tests draaien,
  commit. Daarna in 3–5 zinnen uitleggen wat Arnout op de iPad moet testen.

## Uiterlijk
- 2,5D plat (gekozen door Arnout): houten bord, dikke schijven met schaduw,
  dam = twee gestapelde schijven met kroontje, sprongetje per veld. Alles met
  CSS, geen 3D-bibliotheek. Een licht schuin bord mag later alleen als optie
  in het oudermenu, en alleen op een groot scherm.

## Kindvriendelijk ontwerp (voor latere fases)
- Vakjes/knoppen minimaal ca. 2x2 cm; tikken én slepen; legale zetten tonen;
  bij slagplicht pulseren de stukken die moeten slaan; onbeperkt terugzetten.
- Alles ook gesproken (nl-NL); tekst nooit noodzakelijk. Mascotte "Dammie"
  zegt nooit "Fout!" maar "Bijna! ...".
- VERBODEN: reclame, aankopen, timers, streaks, pushmeldingen, ranglijsten,
  "kom terug"-prikkels, gegevens naar buiten.

## Stand van zaken (bijwerken aan het eind van elke sessie)

Laatst bijgewerkt: 23 oktober 2026, fase 6 (beloningen) gebouwd. De pull
request daarvoor staat open; Arnout test hem op de iPad.

### Wat er klaar is
- Fase 0–5 samengevoegd in `main`; fase 6 in een pull request. Zie README.
  - Regels (`rules.js`) met tests, speelbord voor 2 spelers, 2,5D-look.
  - 20 lessen met lessenkaart, hints (3 stappen) en sterren.
  - 54 puzzels in 9 thema's.
  - Tegen de computer: 5 niveaus, uitleg na een fout, niveau past zich aan.
  - 4 mini-partijen op de lessenkaart (na les 4, 8, 13 en 19).
  - Profielen, 16 badges, Prijzenkast, 5 bordthema's, hoek voor ouders.
  - 174 tests in Node, allemaal groen. `tests.html` test in de browser
    ook de echte worker.
- Online via GitHub Pages: https://agjan0612.github.io/Damspelletje/
  (Pages publiceert vanaf `main`, een paar minuten na het samenvoegen).
- Arnout test fase 6 op de iPad (zie de pull request, "Testen op de iPad").
  Komen daar punten uit, los die dan eerst op, vóór fase 7.

### Hoe de lessen en puzzels werken (voor wie verder bouwt)
- **Les 1–8:** 6x6, één regel per les. **Les 9–20:** 8x8.
- **Lesdoelen** staan uitgelegd bovenin `lesson-engine.js`:
  - Gewone doelen: `move`, `capture` (met `min`, `land` = ster,
    `best: 'king' | 'safe'`), `promote`, `reach`, `turns`, `pick` (ook
    `of: 'captured'`).
  - Zwart zet terug (les 15–19): `safe` (verdedigen), `threat` (aanvallen),
    `trade` (`net` 0 = ruil, 1 = twee voor één), `block` (vastzetten,
    `maxMoves` 1 of 2). De lesmotor rekent ELK antwoord van zwart door
    (`planWorks`).
  - Keuzevraag (les 20): `choice` met `ask: 'remise'` (🤝 / 🏆). Het
    antwoord komt uit `drawAnswer()`, nooit met de hand.
- **Meerslag invoeren:** het kind mag stap voor stap tikken (eerst het veld na
  de eerste sprong) of meteen het eindveld (`input.js`, route-modus).
- **Puzzels (`puzzles.js`):** een thema gaat open als de les in `unlock`
  gehaald is. Thema-tekst, -tip en -doel gelden voor alle puzzels van dat
  thema. Puzzel-id's NOOIT veranderen: daaronder staan de sterren in
  localStorage (`storage.js`, sleutel `dammie.v2`).
- **Stopmoment:** na elke 4 opgeloste puzzels biedt Dammie rustig
  "klaar voor vandaag" aan (`offerBreak`).
- **Eén opdrachtscherm:** `createExerciseScreen` in `lessons-ui.js` wordt
  door lessen én puzzels gebruikt. Zwart zet daar terug met animatie, en het
  bord staat uit tot de volgende stand klaarstaat.

### Hoe de computer werkt (fase 5)
- **`ai.js`:** minimax met alfa-bèta. Bij een verplichte slag rekent hij
  altijd door, ook voorbij de gewone diepte. Anders ziet hij niet dat hij
  na zijn zet een stuk kwijtraakt.
  - De evaluatie telt materiaal (dam = 3 schijven), centrum, voortgang
    en de achterste rij.
  - Remiseregels tellen niet mee in het zoeken.
- **Niveaus** (`PROFILES` in `ai.js`):
  1. willekeurig, zet in 80% van de gevallen een schijf "in de slag";
  2. diepte 1, 40% willekeur, rekent slagen niet door;
  3. diepte 3, met 15% kans op een zet uit de onderste helft;
  4. diepte 5 (stopt na 2 s);
  5. steeds dieper tot 1 seconde om is.
- **Toeval en klok** kun je meegeven (`chooseMove(game, level, { random,
  now })`). De tests doen dat, zodat ze altijd hetzelfde uitkomen.
- **Op de achtergrond:** `computer.js` stuurt alleen board/size/turn/options
  naar `ai-worker.js`. Antwoordt die niet binnen 4 s, dan doet de app zelf een
  snelle zet (niveau 2) en start de worker opnieuw.
- **Uitleg na een fout** (`giveaway`): kan de computer na de zet van het kind
  meer slaan dan het kind terugslaat, én had een andere zet minder gekost?
  Dan zegt Dammie "Oei! Nu kan … slaan" en lichten de stukken op die dat
  kunnen. Het kind kiest "↶ Nog eens" of "▶ Speel door". Een bewust offer
  (twee voor één) telt niet als fout.
- **Niveau aanpassen** (`adaptLevel`, bewaard als `computer` in de
  voortgang van het kind):
  - 3x winst achter elkaar: de vraag "moeilijker?";
  - 3x verlies: stil een niveau lager (nooit onder 1);
  - remise telt niet mee;
  - zelf een niveau kiezen begint de reeks opnieuw;
  - een nieuw kind begint bij niveau 1.
- **Mini-partijen** (`minigames.js`): `after` = de les waarna hij opengaat.
  Regels die nog niet geleerd zijn, staan uit via opties.
  - Na les 4: race op 6x6 met 3 schijven elk (met 6 stonden ze te vaak
    vast).
  - Na les 8: meerslag mag al wel, en Dammie legt hij uit
    (`explainMeerslag`). Dat was Arnouts keuze.
  - Niet verplicht. "Gespeeld" staat als `minigames` in de voortgang.

### Hoe de beloningen werken (fase 6)
- **Opslag (`storage.js`):** één sleutel `dammie.v2` met
  `{ version, current, profiles: [{ id, animal, name, board, progress }] }`.
  - `progress` = `lessons`, `puzzles`, `minigames`, `computer` en `beaten`
    (van welke niveaus het kind een gewone partij won).
  - Oude voortgang (`dammie.v1`) wordt vanzelf profiel 1, nog zonder dier;
    het kind kiest dat bij het openen. `dammie.v1` blijft staan als
    reserve, de app schrijft er niet meer in.
  - Alles wat binnenkomt (opslag of bestand) wordt opgeschoond
    (`normalizeProgress`). Een kapot bestand verandert niets.
  - Hooguit 6 kinderen, elk dier maar één keer, naam hooguit 12 tekens.
  - Dier-, badge- en thema-id's NOOIT veranderen.
- **Badges (`badges.js`):** worden niet bewaard maar uitgerekend uit de
  voortgang (`earnedBadges`). Een badge is alleen voor `lessons`,
  `themes` (alle puzzels van een thema), `puzzles` (aantal) of `beaten`
  (niveau). Nieuwe badges = verschil vóór/na het opslaan (`newBadges`);
  ze verschijnen in het kaartje na een les, puzzel of partij.
  - Een mini-partij winnen telt niet als "niveau verslagen".
- **Bordthema's:** Hout, Zee, Bos, Snoep, Ruimte. Elk thema gaat open met
  één badge. De kleuren staan in `BOARD_THEMES` en worden CSS-variabelen
  (`--b-...`). De schijven blijven altijd wit/zwart; een test bewaakt dat
  ze op elk donker veld goed opvallen (maatstaf: het houten bord).
- **Voor ouders:** achter een rekensom (drempel, geen beveiliging).
  Bewaren = download van `damvoortgang-JJJJ-MM-DD.json` met alle
  kinderen; laden vervangt alles, na een controlevraag.
  `navigator.storage.persist()` wordt alleen hier gevraagd (Firefox kan
  er een vraag voor tonen, en die hoort niet bij het kind).
- **Tests met opslag:** gebruik `useStorage(nepOpslag)` (zie `withStore`
  in `tests.js`). Zo blijft de echte voortgang in de browser heel.

### Wat de tests bewaken (zie `tests.js`)
- Bij elke opdracht en puzzel:
  - de stand is geldig en de opdracht is met de hints op te lossen;
  - geen slag vóór les "Slaan", geen meerslag vóór les 9, de
    meerderheidsregel pas vanaf les 11;
  - elk soort opdracht komt pas na de les waarin het geleerd wordt.
- Bij elke puzzel ook:
  - precies één goede oplossing;
  - de puzzel past bij zijn thema;
  - de stand ziet eruit als een echte partij.
- Bij zwart-zet-terug: zwart heeft in de oplossing steeds maar één zet, en je
  wint wat er beloofd is.
- Computer:
  - altijd een legale zet (alle borden, ook met lesregels);
  - slaat als het moet, en dan de grootste slag;
  - niveau 3–5 vinden twee-voor-één, rekenen een slagenreeks helemaal door
    en geven niets weg als dat niet hoeft;
  - niveau 5 stopt op tijd;
  - "weggegeven" en het aanpassen van het niveau kloppen;
  - in de browser hangt de worker niet.
- Mini-partijen: alleen geleerde regels, geldige stand, de race eindigt.
- Profielen en opslag: oude voortgang komt goed over, kinderen hebben
  ieder hun eigen voortgang, zonder opslag werkt de app door.
- Reservekopie: bewaren en laden geeft hetzelfde terug; een kapot of
  vreemd bestand verandert niets; rare waarden worden opgeschoond.
- Badges: verwijzen naar lessen/thema's/niveaus die bestaan, alleen voor
  beheersing, komen op het juiste moment. Bordthema's: alle kleuren,
  schijven goed zichtbaar, dicht thema = Hout.

### Geleerde lessen bij het bouwen
- **Nieuwe standen:** laat een zoekhulpje (los script in de scratchpad, niet
  in de repo) standen voorstellen via `rules.js` en `lesson-engine.js`
  (`goodFirstMoves`, `solutionMove`). Kies er daarna zelf uit en zet ze vast
  in de data. Nooit standen "uit het hoofd" invullen.
- **Nieuwe tests:** controleer of ze alarm slaan. Maak tijdelijk een stand
  kapot, draai `npm test`, en zet de goede versie terug.
- **Zetten vergelijken:** op notatie (`moveToLongString`), niet als
  JS-object. `legalMoves` maakt steeds nieuwe objecten.
- **Computer testen:** gebruik geen lesdoelen als "juiste zet" voor de
  sterke niveaus. Bij "Slim verdedigen" offert niveau 4 soms terecht een
  schijf om een dam te halen. Gebruik standen die je met de hand kunt
  narekenen.
- **Snelle tests:** geef niveau 4/5 een nepklok (`fastClock` in
  `tests.js`). Anders denkt elke test een seconde.
- **Browser testen:** `python3 -m http.server 8765` en Playwright.
  - Playwright staat globaal: `NODE_PATH=$(npm root -g)`.
  - Chromium via `executablePath`: zoek het pad met `ls /opt/pw-browsers`.
    Het nummer verschilt per omgeving, laatst
    `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
  - Klik bij pulserende tegels (les, niveau) met `force: true`.
  - Zet voortgang klaar met `localStorage.setItem('dammie.v1', …)`.
  - `page.workers()` laat zien of de worker draait.
- **Bordmaat:** het bord rekent zijn grootte uit op het hele scherm. Meerdere
  kleine bordjes op één pagina werkt dus niet zomaar.
- **Smalle telefoon:** de bovenbalk mag niet breder worden dan het scherm.
  Lange teksten ("😴 Slaapkop is aan zet") lopen daarom door op een
  tweede regel.

### Werkwijze met git
- `main` is de echte versie. Werk in een eigen branch.
- Is de vorige pull request al samengevoegd, begin dan opnieuw vanaf de
  nieuwste `main`.
- Maak na afloop een pull request naar `main` met een korte uitleg in gewone
  taal.
- Arnout voegt hem samen, of vraagt Claude om dat te doen. Doe dat pas als de
  tests op GitHub groen zijn.
- Push nooit rechtstreeks naar `main`.

### Startlijstje voor een nieuwe sessie
1. Lees deze CLAUDE.md, de README en de delen van `docs/briefing.md` die bij
   de volgende stap horen.
2. Draai `npm test`: er moeten 174 tests groen zijn.
3. Maak een eigen branch vanaf de nieuwste `main`.
4. Leg eerst een kort plan voor (in gewone taal, met een advies bij keuzes)
   en wacht op akkoord.

### Afgesproken volgende stap: fase 7, spraak
- **Bron:** `docs/briefing.md`, §2.3 en het blok "SPRAAK EN GELUID".
- **Inhoud volgens de briefing:**
  - `speechSynthesis` met een nl-NL-stem (terugval nl-BE, anders alleen
    tekst); pas starten na een tik (iOS);
  - aparte schakelaars voor spraak en geluid (horen in de hoek voor
    ouders, en per kind bewaard);
  - alles wat Dammie zegt ook hardop; altijd ook iets te zien.
- **Daarna:** fase 8 PWA (`manifest.json`, `sw.js`). Dan ook in de hoek
  voor ouders de tip "zet Dammie op het beginscherm".
- Eerst steeds een plan voorleggen.
