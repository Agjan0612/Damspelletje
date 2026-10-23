# Dammie

Een damleerspel voor kinderen van 6–9 jaar. Werkt straks offline op iPad,
telefoon en laptop, zonder account, reclame of tracking.

## Stand van zaken

| Fase | Wat | Status |
|---|---|---|
| 0 | Projectstructuur, `CLAUDE.md`, testpagina | ✅ klaar |
| 1 | Spelregels (`rules.js`) + tests | ✅ klaar |
| 2 | Speelbord: tikken/slepen, twee spelers op één apparaat | ✅ klaar |
| 3 | Lessen 1–8 met lessenkaart, hints en sterren | ✅ klaar |
| 3b | Lessen 9–14: meerslag, slaan met de dam, meerslag gaat voor, vrije keus, damslag met bocht, Turkse slag; stap voor stap tikken bij een meerslag | ✅ klaar |
| 4 | Puzzels: 36 "Zoek de slag"-puzzels in 6 thema's, open na de les erbij, met sterren en een rustig stopmoment | ✅ klaar |
| 4b | Lessen 15–20 (verdedigen, aanvallen, ruilen, twee voor één, vastzetten, remise): zwart zet terug. Plus 18 puzzels in twee zetten (54 in totaal) | ✅ klaar |
| 5 | Computer-tegenstander: 5 niveaus (Slaapkop t/m Kampioen) die zich aanpassen, uitleg als je iets weggeeft, en mini-partijen na les 4, 8, 13 en 19 | ✅ klaar |
| 6 | Beloningen: profielen (dier + naam), 16 badges voor beheersing, Prijzenkast, 5 bordthema's, hoek voor ouders met "Bewaar/Laad voortgang" | ✅ klaar |
| 7–8 | Spraak, PWA | volgende stap |

Zie `docs/briefing.md` voor het volledige plan.

## Spelen

Open `index.html` via GitHub Pages (of lokaal met `python3 -m http.server`
en dan `http://localhost:8000`). Een los bestand dubbelklikken werkt niet.

## Tests draaien

De tests laten zien dat de spelregels kloppen (slagplicht, meerslag gaat voor,
vliegende dam, Turkse slag, remiseregels, enz.).

- **Op GitHub:** bij elke push draaien de tests automatisch. Een groen vinkje
  bij de commit betekent: alles goed.
- **In de browser:** open `tests.html` via GitHub Pages (een los bestand
  openen werkt niet, browsers blokkeren dat). Lokaal kan het ook:
  `python3 -m http.server` in deze map en dan naar
  `http://localhost:8000/tests.html`.
- **In de terminal:** `npm test` (Node 20 of nieuwer).

## Voortgang en privacy

Alles blijft op het apparaat (localStorage, sleutel `dammie.v2`). Er gaat niets
naar internet. Onder "⚙️ Voor ouders" (achter een rekensom) kun je een
reservekopie bewaren (`damvoortgang-JJJJ-MM-DD.json`) en weer laden, ook om
over te stappen naar een ander apparaat.
