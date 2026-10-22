# Dammie – damleerspel voor kinderen van 6–9 jaar

Een kind leert stap voor stap internationaal dammen (FMJD/KNDB-regels) en kan
spelen tegen een instelbare computer. Volledige achtergrond: `docs/briefing.md`.
Arnout is geen programmeur: leg keuzes kort en in gewone taal uit (Nederlands).

## Techniek (vaste afspraken)
- Gewone HTML/CSS/JavaScript (ES-modules). GEEN build-stap, frameworks, CDN's,
  externe lettertypes, server, analytics of cookies. Later een PWA op GitHub Pages.
- Bestanden in de hoofdmap: `rules.js` (regels), `input.js` (wat een tik
  betekent, zonder scherm, getest), `board.js` (het bord op het scherm, ook
  voor lessen), `ui.js` (schermen en Dammie-teksten), `style.css`,
  `tests.js` + `tests.html` (tests). Later `ai.js` (Web Worker), `lessons.js`,
  `speech.js`, `storage.js`, `manifest.json`, `sw.js`.
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

## Werkwijze
- Tests draaien: `npm test` (Node) of `tests.html` in de browser. Ze draaien
  ook automatisch op GitHub (Actions) bij elke push.
- Code is pas klaar als ALLE tests groen zijn. Bij een regelfout: eerst een
  test die faalt, dan de code repareren.
- Verzin geen "bekende" perft-getallen; alleen met de hand na te rekenen
  waarden mogen als test.
- Per fase: eerst een kort plan, wachten op akkoord, uitvoeren, tests draaien,
  commit. Daarna in 3–5 zinnen uitleggen wat Arnout op de iPad moet testen.

## Kindvriendelijk ontwerp (voor latere fases)
- Vakjes/knoppen minimaal ca. 2x2 cm; tikken én slepen; legale zetten tonen;
  bij slagplicht pulseren de stukken die moeten slaan; onbeperkt terugzetten.
- Alles ook gesproken (nl-NL); tekst nooit noodzakelijk. Mascotte "Dammie"
  zegt nooit "Fout!" maar "Bijna! ...".
- VERBODEN: reclame, aankopen, timers, streaks, pushmeldingen, ranglijsten,
  "kom terug"-prikkels, gegevens naar buiten.
