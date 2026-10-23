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
  - `ui.js` start/samen spelen · `lessons-ui.js` lessenkaart en
    opdrachtscherm (ook voor puzzels) · `puzzles.js` puzzeldata ·
    `puzzles-ui.js` puzzelkaart en puzzelscherm
  - `shared.js` Dammie en teksten · `storage.js` voortgang (localStorage)
  - `style.css` · `tests.js` + `tests.html` (tests)
  - Later: `ai.js` (Web Worker), `speech.js`, `manifest.json`, `sw.js`.
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
  `meerslagGaatVoor`, `schijfSlaatAchteruit`.

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

Laatst bijgewerkt: 23 oktober 2026, na pull request #3 (lessen 15–20).

### Wat er klaar is
- Fase 0–4 + lessen 15–20. Zie README voor de tabel.
  - Regels (`rules.js`) met tests, speelbord voor 2 spelers, 2,5D-look.
  - 20 lessen met lessenkaart, hints (3 stappen) en sterren.
  - 54 puzzels in 9 thema's.
  - 135 tests, allemaal groen.
- Online via GitHub Pages: https://agjan0612.github.io/Damspelletje/
  (Pages publiceert vanaf `main`).

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
  localStorage (`storage.js`, sleutel `dammie.v1`).
- **Stopmoment:** na elke 4 opgeloste puzzels biedt Dammie rustig
  "klaar voor vandaag" aan (`offerBreak`).
- **Eén opdrachtscherm:** `createExerciseScreen` in `lessons-ui.js` wordt
  door lessen én puzzels gebruikt. Zwart zet daar terug met animatie, en het
  bord staat uit tot de volgende stand klaarstaat.

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

### Geleerde lessen bij het bouwen
- **Nieuwe standen:** laat een zoekhulpje (los script in de scratchpad, niet
  in de repo) standen voorstellen via `rules.js` en `lesson-engine.js`
  (`goodFirstMoves`, `solutionMove`). Kies er daarna zelf uit en zet ze vast
  in de data. Nooit standen "uit het hoofd" invullen.
- **Nieuwe tests:** controleer of ze alarm slaan. Maak tijdelijk een stand
  kapot, draai `npm test`, en zet de goede versie terug.
- **Zetten vergelijken:** op notatie (`moveToLongString`), niet als
  JS-object. `legalMoves` maakt steeds nieuwe objecten.
- **Browser testen:** `python3 -m http.server 8765` en Playwright. Playwright
  staat globaal: `NODE_PATH=$(npm root -g)`, Chromium via
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
  Klik bij de pulserende lestegel met `force: true`. Zet voortgang klaar met
  `localStorage.setItem('dammie.v1', …)`.
- **Bordmaat:** het bord rekent zijn grootte uit op het hele scherm. Meerdere
  kleine bordjes op één pagina werkt dus niet zomaar.

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
2. Draai `npm test`: er moeten 135 tests groen zijn.
3. Maak een eigen branch vanaf de nieuwste `main`.
4. Leg eerst een kort plan voor (in gewone taal, met een advies bij keuzes)
   en wacht op akkoord.

### Afgesproken volgende stap: fase 5, de computer-tegenstander
- **Bron:** `docs/briefing.md`, §2.4 "De computertegenstander per niveau" en
  het blok "COMPUTER".
- **Techniek:** `ai.js` als Web Worker, zodat het bord niet bevriest.
  - Minimax met alfa-bèta.
  - De evaluatie telt materiaal (dam ≈ 3 schijven), centrum en voortgang.
  - Gebruik `legalMoves`/`play` uit `rules.js`, dus geen eigen regels.
- **Niveaus:**
  1. "Slaapkop": willekeurig, laat zich graag slaan, slaat wel als het moet.
  2. Diepte 1, met 40% willekeur.
  3. Diepte 2–3, met 15% kleine fouten.
  4. Diepte 4–5.
  5. Diepte 6+, met een tijdslimiet van ongeveer 1 seconde.
- **Adaptief:**
  - na 3 keer winst: voorstel om een niveau omhoog te gaan;
  - na 3 keer verlies: stil een stapje omlaag.
- **Uitleg na een fout:** geeft het kind direct iets weg, dan zegt Dammie wat
  zwart nu kan slaan en biedt ↶ terugzetten aan.
- **Mini-partijen:** na les 4, 8, 13 en 19 een mini-partij tegen de computer,
  waarin alleen de geleerde regels gelden. Gebruik de opties uit `rules.js`
  (bijv. `damHalen`, `meerslagGaatVoor`).
- **Op het startscherm:** "Samen spelen" (`ui.js`) uitbreiden met
  "Tegen de computer".
- **Tests:**
  - de computer doet altijd een legale zet;
  - hij slaat als het moet;
  - een hoger niveau ziet een eenvoudige winnende slag;
  - de worker hangt niet.
  Geen verzonnen perft-getallen.
- **Daarna:** fase 6 beloningen, fase 7 spraak, fase 8 PWA. Eerst steeds een
  plan voorleggen.
