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
  - `ui.js` start/samen spelen · `lessons-ui.js` lessenkaart en lesscherm
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
  les "Slaan", geen meerslag vóór les 9. Nieuwe les = deze tests moeten groen.
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
- Klaar: fase 0–3 (regels + tests, speelbord voor 2 spelers, 2,5D-look,
  lessen 1–8 met lessenkaart, hints en sterren). Zie README voor de tabel.
- Online via GitHub Pages: https://agjan0612.github.io/Damspelletje/
  Pages publiceert vanaf `main`.
- Werkwijze met git: `main` is de echte versie. Werk in een eigen branch,
  maak na afloop een pull request naar `main` met een korte uitleg in gewone
  taal. Arnout voegt hem samen (merge); pas dan staat het online.
  Push nooit rechtstreeks naar `main`.
- Afgesproken volgende stap: lessen 9–14 (meerslag, slaan met de dam,
  meerslag gaat voor, vrije keus, damslag met bocht, Turkse slag), daarna
  fase 4 puzzels. Eerst plan voorleggen, dan bouwen.
- Testen in de browser: `python3 -m http.server` en Playwright (Chromium
  staat klaar). Klik bij de pulserende lestegel met `force: true`.
