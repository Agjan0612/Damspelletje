# Dammie

Een damleerspel voor kinderen van 6–9 jaar. Werkt straks offline op iPad,
telefoon en laptop, zonder account, reclame of tracking.

## Stand van zaken

| Fase | Wat | Status |
|---|---|---|
| 0 | Projectstructuur, `CLAUDE.md`, testpagina | ✅ klaar |
| 1 | Spelregels (`rules.js`) + tests | ✅ klaar |
| 2 | Speelbord: tikken/slepen, twee spelers op één apparaat | volgende stap |
| 3–8 | Lessen, puzzels, computer, beloningen, spraak, PWA | later |

Zie `docs/briefing.md` voor het volledige plan.

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
