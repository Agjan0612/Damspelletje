# Damles-app voor kinderen van 6–9 jaar: onderzoek en bouwbriefing voor Claude Code

Bouw een offline PWA zonder server, zonder account en zonder tracking. Laat een kind van 6–9 jaar beginnen met losse mini-opdrachten op een klein bord (6x6, daarna 8x8 met de internationale regels, het zogeheten Braziliaans dammen) en ga pas daarna naar 10x10 met de volledige FMJD/KNDB-regels. Laat Claude Code een eigen, goed geteste regelmodule in JavaScript schrijven in plaats van een bestaande bibliotheek in te bouwen. De lastigste en belangrijkste onderdelen zijn de meerderheidsregel (meerslag gaat voor), de slag met de vliegende dam en de remiseregels. Die moeten met vaste testposities bewezen worden voordat er ook maar één les gebouwd wordt.

## TL;DR

- **Regels en opbouw:** speel uiteindelijk volgens FMJD Annex 1 (10x10, slagplicht, meerslag gaat voor, vliegende dam, remise na 3x dezelfde stand, de 25-zettenregel en de 16/5-zettenregels). Leer het via een stappenplan dat het KNDB-jeugdmateriaal "De Eerste Zet" volgt: bord → schijf → dam → slaan → achteruit slaan → slaan met dam → meerslag gaat voor → verdedigen/aanvallen → ruilen → vastzetten → remise. Begin op een klein bord.
- **Ontwerp voor het kind:** gesproken uitleg (Nederlandse systeemstem), heel grote vakjes (minimaal 2×2 cm, vier keer groter dan de 1×1 cm voor volwassenen, volgens Nielsen Norman Group), tikken én slepen toestaan, mogelijke zetten en slagplicht altijd zichtbaar, onbeperkt "terugzetten" in de oefenmodus, sterren en badges zonder tijdsdruk, reclame, aankopen of "kom terug!"-prikkels.
- **Techniek:** één statische webapp (HTML/CSS/JavaScript) als PWA, gratis gehost op GitHub Pages of Netlify, op iPad/iPhone via Safari → Delen → "Zet op beginscherm". Voortgang lokaal in de browser opslaan en een export-/importknop als back-up. Bouw in fases met Claude Code: eerst regels + tests, dan bord, lessen, puzzels, AI-niveaus, beloningen, spraak.

## Key Findings

1. **De officiële regels zijn eenduidig vastgelegd en goed te programmeren**, maar bevatten een paar uitzonderingen die vrijwel elke beginnende programmeur fout doet: de meerderheidsregel waarbij een dam niet zwaarder telt dan een schijf, het pas na afloop van de slag verwijderen van geslagen stukken (de "Turkse slag"), en een schijf die tijdens een slag over de damlijn gaat maar daar niet eindigt blijft een schijf.\[1\]
2. **Een kleiner bord is didactisch verstandig.** De Nederlandse damwereld gebruikt het zelf: Damclub IJmuiden laat jeugd op 64 velden met 12 schijven spelen, omdat "de ideeën uit de lessen veel sneller op het bord" komen,\[2\] en Braziliaans dammen is gewoon internationaal dammen op 8x8.\[3\]\[4\] De overstap naar 10x10 verandert dan alleen het bord, niet de regels.
3. **Het KNDB-jeugdmateriaal geeft een kant-en-klare leerlijn.** De werkboeken "De Eerste Zet" en "De Tweede Zet" zijn volgens Jeugddammen Noord bedoeld voor "jonge kinderen (6–8 jaar)" die de regels nog niet kennen.\[5\] Daarna volgen de KNDB-diploma's (Van der Wal, Wiersma, Sijbrands, Springer, Hoogland).\[6\]
4. **Onderzoek naar kinderapps waarschuwt vooral voor wat je níet moet doen.** Meyer, Zosh, Hirsh-Pasek, Radesky e.a. (2021, *Journal of Children and Media*) beoordeelden 124 apps (de 100 meest gedownloade educatieve apps plus 24 apps die kleuters het vaakst speelden) op de vier leerpijlers (actief, betrokken, betekenisvol, sociaal) en concludeerden: "Overall scores were low across all Pillars". Manipulatief ontwerp (spel rekken, aankoopdruk, reclame) is in kinderapps eerder regel dan uitzondering.
5. **Een PWA is de beste keuze voor dit doel**, met twee iOS-kanttekeningen: installeren gaat handmatig via Safari, en opgeslagen gegevens kunnen in Safari-tabbladen na een week niet gebruiken verdwijnen.\[7\] De app op het beginscherm heeft daar veel minder last van, maar een back-upknop blijft verstandig.\[8\]\[9\]
6. **Bestaande open-source dambibliotheken zijn bruikbaar als referentie, maar niet als fundament.** Ze zijn deels oud, ongetest of hebben licenties die je verplichten de hele app open te stellen (Lidraughts AGPL-3.0, de Scan-engine GPL-3.0).\[10\]\[11\] Een eigen regelmodule van een paar honderd regels met uitgebreide tests is voor dit project beter beheersbaar.

## Details

### 1. Spelregels en varianten

#### 1.1 De officiële regels (FMJD Annex 1, door de KNDB overgenomen)

De FMJD-regels (Annex 1, versie november 2015) vormen de basis.\[1\] De KNDB heeft een eigen Spel- en Wedstrijdreglement met dezelfde inhoud.\[12\] Voor de app zijn dit de regels die de "regelmodule" exact moet volgen:

| Onderwerp | Regel | Bron (FMJD Annex 1) |
|---|---|---|
| Bord | 10x10, alleen de 50 donkere velden doen mee; linksonder ligt voor elke speler een donker veld | art. 2.1–2.4 |
| Nummering | Velden 1–50, van linksboven naar rechtsonder per rij | art. 2.6 |
| Beginstand | Zwart op 1–20, wit op 31–50, 21–30 leeg; wit begint | art. 2.8, 3.3 |
| Schijf zetten | Eén veld schuin vooruit naar een leeg veld | art. 3.4 |
| Dam halen | Een schijf die op de overkant eindigt en daar stilstaat wordt dam | art. 3.5 |
| Vliegende dam | Beweegt vooruit en achteruit over willekeurig veel lege velden op een diagonaal | art. 3.9 |
| Slaan | Vooruit én achteruit, ook met een schijf; een slag is één zet | art. 4.1 |
| Slagplicht | Slaan is verplicht (een zet doen terwijl je kunt slaan is onreglementair) | art. 4.2, 5.4.6 |
| Damslag | Een dam slaat op afstand en mag na het geslagen stuk op elk vrij veld landen | art. 4.3 |
| Meerslag | Doorslaan zolang het kan; een dam mag daarbij een hoek om | art. 4.5, 4.6 |
| Niet twee keer hetzelfde stuk | Een leeg veld mag meermaals gepasseerd worden, hetzelfde vijandelijke stuk niet | art. 4.8 |
| Stukken pas na de slag weghalen | Geslagen stukken gaan pas van het bord als de hele meerslag klaar is | art. 4.11 |
| Meerderheidsregel | "The capture of the largest number of pieces has priority and is obligatory"; een dam telt als één stuk en heeft geen voorrang | art. 4.13 |
| Gelijke slagen | Bij gelijk aantal mag je vrij kiezen, met schijf of dam | art. 4.14 |
| Over de damlijn slaan | Een schijf die tijdens de slag de damlijn passeert maar elders eindigt, blijft schijf | art. 4.15 |
| Winst | Tegenstander heeft geen stukken meer of kan niet meer zetten (vaststaan = verlies) | art. 7.2 |
| Remise: herhaling | Dezelfde stand voor de 3e keer, met dezelfde speler aan zet | art. 6.1 |
| Remise: 25 zetten | 25 zetten per speler alleen met dammen, zonder schijfzet en zonder slag | art. 6.2 |
| Remise: 16 zetten | Drie stukken (3 dammen, 2 dammen + schijf, of dam + 2 schijven) tegen één dam: nog maximaal 16 zetten per speler | art. 6.3 |
| Remise: 5 zetten | Twee dammen, dam + schijf of dam tegen één dam: nog maximaal 5 zetten per speler | art. 6.4 |

Wat dit betekent voor de app: de remiseregels zijn voor een kind van 6–9 vooral een "stopknop" zodat een eindspel niet eindeloos duurt. Implementeer ze correct, maar leg ze pas in een late les uit ("1 dam tegen 1 dam = gelijkspel"). Het KNDB-wedstrijdreglement bevat ook regels voor wedstrijden (zoals dat remise afspreken pas mag na 40 zetten per speler, en "aanraken is zetten").\[12\]\[13\] Die horen niet in een leerspel. Aanraken-is-zetten zou in een app voor jonge kinderen zelfs schadelijk zijn.

#### 1.2 Kleiner bord en vereenvoudigde regels als opstap

**Advies: ja, maar verander het bord en niet de regels.** Er zijn drie redenen:

- **8x8 met internationale regels bestaat al officieus als "Braziliaans dammen":** 12 schijven per speler op 3 rijen, verder dezelfde regels (vliegende dam, achteruit slaan, meerslag gaat voor).\[4\]\[14\]\[15\] Een kind leert op 8x8 dus niets wat het op 10x10 weer moet afleren.
- **Damclubs doen het zelf.** Damclub IJmuiden zette in 2025 de jeugd aan het 64-veldenbord met twaalf schijven en zag dat "de ideeën uit de lessen veel sneller op het bord" komen.\[2\] De handleiding voor leerkrachten van Jeugddammen Noord (groep 3–8) noemt ook 8x8 Braziliaans dammen\[16\] en speelvormen zoals "Wie het eerst dam heeft".\[16\]
- **Vermijd de Engelse/Amerikaanse 8x8-regels (checkers).** Daar gaat meerslag niet voor, slaan schijven niet achteruit en is de dam "kort".\[4\]\[16\]\[17\]\[18\] Dat moet een Nederlands kind later weer afleren.

**Voorgestelde bordladder:**

| Fase | Bord | Stukken | Regels | Doel |
|---|---|---|---|---|
| A. Mini-opdrachten | 6x6 of 8x8 met slechts 1–5 stukken | vrij geplaatst | alleen de regel van de les | één concept tegelijk |
| B. Mini-partij | 6x6 (6 schijven p.p. op 2 rijen) | 6 | schijf zet, slaan verplicht; dam pas aan in les 3 | korte partijen van 3–5 minuten |
| C. Klein bord | 8x8 (Braziliaans) | 12 | volledige internationale regels | echte partijen, overzichtelijk |
| D. Groot bord | 10x10 | 20 | volledige FMJD-regels | "echt dammen zoals op de club" |

Let op: 6x6 is geen officiële variant. Het is een didactisch hulpmiddel en ik heb geen bron gevonden die het onderzoekt. Behandel het als ontwerpkeuze om met je kind te testen. De vaste regel voor de app: **de regelmodule is één en dezelfde voor alle bordgroottes** (bordgrootte als parameter), en lessen mogen alleen regels *aan- of uitzetten* die nog niet behandeld zijn (bijvoorbeeld "dam halen uit" in les 2).

#### 1.3 Hoe de KNDB en damclubs jeugd leren dammen

- **Werkboeken met examens en diploma's.** Jeugddammen Noord en Slimmezet geven de reeks De Eerste Zet → De Tweede Zet → Niveau 1 → Combineren 1 → Niveau 2 → Combineren 2 → Niveau 3–5 uit.\[19\]\[20\] De Eerste Zet en De Tweede Zet "zijn met name bedoeld voor jonge kinderen (6–8 jaar) die de damregels nog niet beheersen en de basis stap voor stap moeten aanleren". Bij elk werkboek hoort een examen.\[5\] Volgens Slimmezet kost een niveau op school "ca. 10-20 uur".\[21\]
- **Inhoud van De Eerste Zet (versie 2018):** 1 Het dambord · 2 De schijf · 3 De dam · 4 Slaan met de schijf · 5 Achteruit slaan · 6 Slaan met de dam · 7 Meerslag gaat voor · 8 Slim verdedigen · 9 Sterke aanval · 10 Een ruiltje · 11 Winnen door vastzetten · 12 1-1: remise · 13 Puzzelen in volle standen · 14 Oefentest · 15 Extra opgaven.\[22\] De opdrachtvormen zijn ideaal voor een app: "Zet een pijl bij de juiste slag", "Zoek de slag voor wit", "Kleur de velden in waar de witte dam mag komen", "Zoek de beste verdediging".\[22\]
- **De Tweede Zet** gaat verder met onder meer "meerslag gaat voor", "slaan is verplicht" en het "zetje van Weiss" (een klassieke combinatie). Een 9-jarige van de Monsterse Damvereniging haalde dat diploma met 30 van de 32 vragen goed.\[23\]
- **KNDB-diploma's daarboven:** Van der Wal-diploma (spelregels en eerste eenvoudige combinaties), daarna Wiersma, Sijbrands, Springer en Hoogland. De meeste diploma's kun je in twee stappen halen (wit en zwart).\[6\]
- **Digitaal:** de KNDB heeft DamMentor (via damz.nl), "een digitaal trainingsprogramma om het dammen te leren", met een "Damcursus voor beginners" waarin elke les begint met een korte video van grootmeester Jan Groenendijk en daarna opdrachten volgen ("maar liefst 32 damvideo's").\[24\] Daarnaast is er kndbdammen.nl, de gratis KNDB-damapp (sinds begin 2023) met een gratis cursus "Leren dammen", maar daarvoor maak je een account aan en speel je tegen echte, onbekende tegenstanders.\[25\]\[26\]

**Wat dit voor de app betekent:** gebruik de lesvolgorde van De Eerste Zet en De Tweede Zet als ruggengraat. Noem de app-niveaus bijvoorbeeld "Eerste Zet-sterren", maar beloof geen officieel diploma. Echte diploma's worden door de vereniging of school afgenomen.\[6\] Een mooie brug: als je kind de app "uit" heeft, kan het bij een damclub het examen De Eerste Zet of De Tweede Zet doen.

### 2. Didactiek en spelontwerp voor jonge kinderen

#### 2.1 Leren via een app: wat werkt

Het meest geciteerde kader is dat van Hirsh-Pasek e.a. (2015, *Psychological Science in the Public Interest*): apps zijn educatief als ze **actief** (zelf nadenken, niet alleen tikken), **betrokken** (niet afgeleid door franje), **betekenisvol** (aansluitend bij de leefwereld) en **sociaal interactief** zijn, binnen een duidelijk leerdoel.\[27\]\[28\]\[29\] Een latere analyse met dit kader (Meyer, Zosh, Hirsh-Pasek, Radesky e.a., 2021, *Journal of Children and Media*) beoordeelde 124 apps (de 100 meest gedownloade educatieve apps uit Google Play en de App Store plus 24 apps die kleuters het vaakst speelden) en concludeerde: "Overall scores were low across all Pillars." Gratis apps scoorden nog lager op betrokkenheid door reclame, losstaande beloningen en storende effecten.

Vertaald naar een damapp:

- **Actief:** het kind doet de zet zelf, de app voert nooit zomaar iets uit. Elke les eindigt met een opdracht die zonder hint opgelost moet worden.
- **Betrokken:** animaties en geluid alleen als feedback op de zet. Geen bewegende achtergronden of "flitsende" effecten die afleiden.
- **Betekenisvol:** verhaal en karakters (bijvoorbeeld "help de schijfjes naar de overkant zodat ze een kroontje krijgen"), en de link naar het echte bord thuis.
- **Sociaal:** een "samen-modus" (twee spelers op één iPad, ouder en kind) en tips voor de ouder ("vraag je kind: waarom koos je deze zet?"). Dit is het sterkste leermiddel en kost niets.

**Lesopbouw per les (3–5 minuten):**
1. Mascotte vertelt in 1–2 zinnen wat we gaan leren (gesproken).
2. Een korte animatie laat het zien (bijvoorbeeld de schijf die schuin vooruit glijdt).
3. "Doe het na": dezelfde zet met een pijl of glow als hulp.
4. 3–5 oefeningen die steeds een stukje moeilijker worden; hints worden langzaam afgebouwd.
5. Een "eindbaas"-opdracht zonder hint, met 1–3 sterren.
6. Daarna kan het kind de nieuwe regel meteen gebruiken in een mini-partij tegen de computer.

**Fouten mogen.** Bij een fout zegt de app niet "Fout!" maar bijvoorbeeld "Bijna! Kijk eens: deze schijf kan slaan", en de schijf gaat terug. Hints in drie stappen: (1) gesproken tip, (2) het juiste stuk licht op, (3) de zet wordt voorgedaan. Sterren tellen hoeveel hints er nodig waren, maar de opdracht is altijd "gehaald".

#### 2.2 Gamification: wel en niet

**Wel (passend bij 6–9 jaar):**
- 1–3 sterren per opdracht, een zichtbaar pad of "landkaart" met lessen (voortgang zichtbaar maken).
- Badges voor beheersing ("Slaankampioen", "Meerslag-meester", "Eerste dam!"), niet voor tijd in de app.
- Een vriendelijke mascotte (bijvoorbeeld een damschijf met ogen, "Dammie") die uitleg geeft, aanmoedigt en bij een dam een kroontje opzet.
- Verzamelbare, puur cosmetische beloningen: een ander bordthema of een andere schijfkleur.
- Een rustig "klaar voor vandaag"-moment na een les of 3–4 puzzels.

**Niet (bewezen problematisch):**
- Radesky e.a. (2022, *JAMA Network Open*) bekeken apps van 160 kinderen van 3–5 jaar. Bijna alle kinderen (158 van de 160, oftewel 98,8%) hadden minstens één manipulatief ontwerpkenmerk in hun meestgebruikte apps, en de trucs waren gericht op het rekken van speeltijd (65% van de apps), aankoopdruk (56%) en reclame kijken (32%). Voorbeelden zijn personages die zeggen "Don't just stand there, do something!" als een kind stilzit.
- Een eerdere inhoudsanalyse van dezelfde groep (Meyer e.a., 2019, *Journal of Developmental & Behavioral Pediatrics*) vond dat 129 van de 135 onderzochte apps (95%) voor kinderen van 5 jaar en jonger minstens één vorm van reclame bevatten.
- Dus: **geen** reclame, in-app aankopen, streaks die verloren gaan, tijdsdruk, aftellende klokken, loot boxes, pushmeldingen of "kom terug"-berichten, en geen ranglijsten met andere kinderen.

#### 2.3 Leesvaardigheid: spraak, iconen en animatie

- **Alle instructies gesproken.** Tekst mag erbij staan (ouders en oudere kinderen), maar mag nooit nodig zijn. Een grote "luidspreker"-knop herhaalt de uitleg.
- **Techniek:** de Web Speech API (`speechSynthesis`) werkt in alle moderne browsers en gebruikt de stemmen van het apparaat. Op iOS zijn dat de systeemstemmen (met een Nederlandse stem, bijvoorbeeld "Xander" voor nl-NL), en in Chrome op de desktop bijvoorbeeld "Google Nederlands".\[30\]\[31\]\[32\] Twee belangrijke iOS-beperkingen: (1) spraak start alleen vanuit een tik van de gebruiker (een "user gesture"), dus geen automatisch voorlezen bij het laden; laat de eerste uitleg starten met een grote "Start"-knop. (2) De stemmenlijst kan per apparaat verschillen; kies op taalcode `nl-NL`, met `nl-BE` of een andere Nederlandse stem als terugvaloptie, en toon tekst als er geen Nederlandse stem is.\[31\]\[32\]\[33\]
- **Alternatief met betere kwaliteit:** vooraf opgenomen MP3'tjes (zelf ingesproken door Arnout!) voor de vaste lesteksten, en `speechSynthesis` alleen voor dynamische zinnen. Dat klinkt warmer en werkt overal hetzelfde. Kost wel opslag (houd het per bestand klein).
- **Iconen in plaats van woorden:** ▶ spelen, ↶ terugzetten, 💡 hint, 🔊 opnieuw horen, 🏠 thuis. Kleuren hebben altijd ook een vorm (een ring of stip), voor kleurenblinde kinderen.
- **Animaties als uitleg:** slaan laat zien hoe de schijf over de andere heen springt; bij meerslag "springt" hij stap voor stap en pas aan het eind verdwijnen de geslagen stukken (zoals de regel voorschrijft).

#### 2.4 De computertegenstander per niveau

Gebruik één zoekalgoritme (minimax met alfa-bèta-snoei) met een **niveauprofiel** in plaats van aparte AI's:

| Niveau | Naam (voorbeeld) | Gedrag |
|---|---|---|
| 1 | "Slaapkop" | Kiest willekeurig uit legale zetten; zet bij voorkeur een schijf "in de slag" (laat zich slaan). Slaat wel als het moet, want dat is de regel. |
| 2 | "Speels" | Zoekdiepte 1 (kijkt alleen naar de eigen zet), 40% kans op een willekeurige zet. |
| 3 | "Slim" | Zoekdiepte 2–3, 15% kans op een "kleine fout" (een zet uit de onderste helft). |
| 4 | "Slimmer" | Zoekdiepte 4–5, geen bewuste fouten. |
| 5 | "Kampioen" | Zoekdiepte 6+ met tijdslimiet (bijvoorbeeld 1 seconde), betere evaluatie (materiaal, dam = ca. 3 schijven, centrum, voortgang). |

- **Aanpasbaar:** stel na 3 gewonnen partijen voor om een niveau hoger te gaan, en na 3 verloren partijen zakt de AI stilletjes een stapje. Een kind van 6 moet ongeveer de helft of meer winnen om gemotiveerd te blijven. Dat is een vuistregel, geen onderzoeksuitkomst; test het met je kind.
- **Uitleg waarom een zet goed of fout was:** laat na de zet van het kind de engine kort (diepte 2–3) kijken. Als de tegenstander daarna meteen meer kan slaan dan het kind, zegt de mascotte: "Oei, nu kan zwart twee schijven slaan. Zullen we het nog eens proberen?" met een ↶-knop. Houd uitleg concreet ("die schijf staat nu alleen") en geef alleen uitleg over regels en slagen die al in een les behandeld zijn.
- **Sterkte:** een JavaScript-minimax op 10x10 is voor een kind al snel onverslaanbaar. Sterker hoeft dus niet; Scan (een topengine) is voor dit doel overbodig.\[34\]

#### 2.5 Interface voor kleine handen

- **Grootte:** Nielsen Norman Group adviseert voor jonge kinderen "at least 2cm × 2cm touch targets" (4 keer groter dan de 1×1 cm voor volwassenen). Ze zagen dat kinderen van 6–8 jaar nog een beperkte fijne motoriek hebben.\[35\] Gevolg: een 10x10-bord op een telefoon (vakjes van ca. 7 mm in staande stand) is te klein voor 6-jarigen. **Bord 6x6/8x8 op de telefoon, 10x10 vooral op iPad en laptop**, of op de telefoon alleen in liggende stand met een groter "tikvlak" rond elk veld.
- **Tikken én slepen:** NN/g raadt aan beide toe te staan ("dragging the target to the destination or tapping the destination").\[35\] Standaard: tik op schijf → mogelijke doelvelden lichten op → tik op doelveld. Slepen werkt ook. Op laptop werkt klikken net zo.
- **Mogelijke zetten markeren:** groene stip op toegestane velden. Bij **slagplicht**: alleen de schijven die móeten slaan pulseren (bijvoorbeeld met een oranje ring), plus een gesproken "Je moet slaan!". Andere schijven reageren met een zacht "nee"-wiebeltje en de uitleg waarom.
- **Meerslag invoeren:** tik op het eindveld; als er meerdere routes naar hetzelfde eindveld lopen, tik dan veld voor veld. Laat bij het tikken de route zien. Dit is een bekend lastig punt; zie Valkuilen.
- **Ongedaan maken:** onbeperkt in lessen, puzzels en "oefenpartij"; optioneel uit in "echte partij" (instelbaar door de ouder).
- **Rust:** maximaal 3–4 knoppen per scherm, geen kleine kruisjes, en een oudermenu achter een simpele "houd 3 seconden ingedrukt"- of rekensomdrempel.

#### 2.6 Bestaande apps en sites: wat werkt en wat niet

| Voorbeeld | Wat werkt | Wat niet (voor 6–9 jaar) |
|---|---|---|
| **KNDB DamMentor (damz.nl)** | Nederlandstalig, volgt de officiële leerlijn, korte video + opdrachten, gratis | Leunt op lezen en kijken; ziet er gedateerd uit; weinig spel-element |
| **kndbdammen.nl (KNDB-damapp)** | Gratis, officieel, met beginnerscursus | Account nodig; online spelen tegen onbekenden vraagt toezicht |
| **Lidraughts** | Gratis, zonder reclame, open source; puzzels, computertegenstander (Scan 3.1), ook offline in de app | Gericht op volwassenen en ratingpartijen; de ingebouwde regelcursus op de "Practice"-pagina is alleen voor Fries dammen; 10x10-beginnersmateriaal is door gebruikers gemaakt; openbare chat en forum |
| **ChessKid (schaken)** | Gebouwd voor kinderen, reclamevrij, geen vrije chat (vaste woordenlijst), hints, robots van verschillende sterkte; leraren zijn positief | Na een paar niveaus betaalmuur; video's alleen in het Engels; app voelt volgens gebruikers "clunky" |

Les voor deze app: neem van ChessKid de veiligheid (geen contact met vreemden), robots per niveau en hints over, en van DamMentor de Nederlandse leerlijn. Voeg toe wat ontbreekt: gesproken uitleg voor niet-lezers, en alles gratis en offline.

### 3. Techniek, uitgelegd voor een niet-programmeur

#### 3.1 Webapp, PWA of native?

| Optie | Wat is het | Plus | Min | Advies |
|---|---|---|---|---|
| Webapp in één HTML-bestand | Eén bestand dat je in de browser opent | Supersimpel, geen installatie | Geen icoon op beginscherm, offline lastig, spraakbestanden passen slecht in één bestand | Prima voor de eerste prototypes |
| **PWA (Progressive Web App)** | Dezelfde webapp + een `manifest.json` (naam, icoon) + een "service worker" (zorgt dat het offline werkt) | Eén code voor laptop, iPad en telefoon; installeerbaar op beginscherm; werkt offline; geen app store | iOS-beperkingen (zie hieronder) | **Aanbevolen eindvorm** |
| Native/hybride (Swift, Kotlin, Flutter, React Native, Capacitor) | Echte app uit de App Store / Play Store | Volledige toegang tot het apparaat | Ontwikkelaarsaccounts, review, veel complexer voor een niet-programmeur | Niet nodig voor dit doel |

Voor een PWA zijn nodig: HTTPS (gratis hosting regelt dat), een manifest met naam, iconen (192×192 en 512×512), `start_url` en `display: "standalone"`, en een service worker die alle bestanden in de cache bewaart.\[36\]\[37\]\[38\] Vraag Claude Code om het zonder "build-stap" te maken: gewone `.html`, `.css`, `.js`-bestanden, zodat je ze zelf kunt openen en uploaden.

#### 3.2 Online zetten en op de iPad/telefoon krijgen

- **GitHub Pages** (gratis): repository aanmaken, bestanden uploaden, bij Settings → Pages publiceren. Je krijgt een adres als `arnout.github.io/damspel`. Claude Code kan je hierbij stap voor stap helpen.
- **Netlify** (gratis): de map met bestanden naar de website slepen ("Netlify Drop") en je hebt meteen een https-adres.
- **Installeren:** op iPad/iPhone open je het adres in **Safari** → Deel-knop → "Zet op beginscherm". Op Android: Chrome → menu → "App installeren". Op laptop: Chrome/Edge toont een installatie-icoon in de adresbalk.

**Bekende iOS/iPadOS-beperkingen:**
- Er is geen automatische "installeer deze app"-melding (`beforeinstallprompt` bestaat niet op iOS). Je moet het één keer zelf via het Deel-menu doen.\[39\]\[40\] Laat de app op iOS een plaatje met uitleg tonen voor de ouder.
- Op iOS gebruiken alle browsers (ook Chrome) de WebKit-motor van Safari. Installeren als echte web-app gaat via Safari.\[39\]\[41\]
- **Opslag kan verdwijnen.** WebKit (de motor van Safari) verwijdert via Intelligent Tracking Prevention alle door scripts opgeslagen gegevens van een site na zeven dagen Safari-gebruik zonder interactie met die site. Volgens de WebKit-blog "Full Third-Party Cookie Blocking and More" (maart 2020) zijn web-apps op het beginscherm "not part of Safari" en hebben ze een eigen teller van gebruiksdagen, die bij echt gebruik reset. Data kan ook verdwijnen bij weinig vrije opslag.\[40\] **Gevolg:** gebruik de app vanaf het beginscherm, vraag `navigator.storage.persist()` aan (volgens de WebKit-blog "Updates to Storage Policy" kent WebKit dat verzoek toe op basis van onder meer de vraag of de site als beginscherm-app draait), en bouw een "Bewaar voortgang"-knop die een klein bestand exporteert (en weer importeert).
- De opslag van de Safari-tab en de beginscherm-app zijn **gescheiden**: voortgang uit het tabblad zie je niet terug in de geïnstalleerde app.\[42\]\[43\] Laat het kind dus alleen de beginscherm-versie gebruiken.
- Diverse (niet-officiële) bronnen noemen een cache-limiet van ca. 50 MB voor PWA's op iOS. De WebKit-blog "Updates to Storage Policy" (2023, Safari 17/iOS 17) noemt echter per origin tot 60% van de schijfruimte en in totaal tot 80%, met dezelfde quota voor beginscherm-apps als in de browser. Voor deze app (enkele MB's, ook met spraakbestanden) maakt dat niet uit.
- Spraak start alleen na een tik (zie 2.3). Hetzelfde geldt voor geluidseffecten via Web Audio: "ontgrendel" audio bij de eerste tik op "Start".\[44\]

#### 3.3 Open-source bouwstenen en licenties

| Bouwsteen | Wat | Licentie | Opmerking |
|---|---|---|---|
| `draughts` (npm, shubhendusaurabh/draughts.js) | Zetgeneratie/validatie voor 10x10 (velden 1–50), geen AI; geïnspireerd op chess.js | MPL-2.0 | Oudere npm-pagina noemt het "in development and pending testing"; regelnauwkeurigheid niet geverifieerd |
| `@jortvl/draughts` | Afgeleide versie, ES-module, geen AI | MPL-2.0 | Laatst gepubliceerd ca. 3 jaar geleden |
| `dawikk-draughts` | Regelbibliotheek met varianten (o.a. internationaal, Russisch), FEN, remisedetectie | MIT | Recenter; meerderheidsregel/vliegende dam alleen indirect bevestigd |
| `rapid-draughts` | Snelle TypeScript-engine met AI | MIT | **Alleen Engels dammen (8x8 checkers)**, dus niet geschikt |
| Jocly | Bordspel-UI + AI, ook dammen | AGPL-3.0 | Zware licentie en groot |
| Lidraughts | Complete damserver + "draughtsground"-bord | AGPL-3.0 | Inspiratie voor bordweergave; overnemen verplicht je de hele app onder AGPL te publiceren |
| Scan 3.1 (Fabien Letouzey) | Een van de sterkste 10x10-engines, C++ | GPL-3.0 | Draait niet zomaar in de browser; veel te sterk en te complex voor dit doel |

**Advies:** laat Claude Code een eigen regelmodule schrijven (`rules.js`, ongeveer 300–600 regels) en een eigen minimax/alfa-bèta-AI (`ai.js`, ongeveer 200 regels). Gebruik de bovenstaande bibliotheken hooguit als vergelijking in tests. Publiceer je eigen code onder MIT als je hem wilt delen. Let op: MPL-2.0 is bruikbaar (alleen gewijzigde bestanden van de bibliotheek moeten open), maar AGPL/GPL-code mag je niet kopiëren tenzij je de hele app onder die licentie zet.

**Waarom alfa-bèta volstaat:** bij dammen zijn er gemiddeld weinig legale zetten (en door de slagplicht vaak maar één of twee). Een eenvoudige zoekboom van 4–6 halve zetten draait op een iPad in een fractie van een seconde. Laat de AI in een **Web Worker** draaien, zodat het bord niet "bevriest" terwijl de computer nadenkt.

#### 3.4 Voortgang lokaal opslaan en geluid

- **Opslag:** voor een paar kilobyte voortgang (welke lessen klaar, sterren, badges, AI-niveau, instellingen) is `localStorage` met één JSON-object genoeg. Voor robuustheid kun je IndexedDB gebruiken (de Storage-API van MDN laat zien dat die met `navigator.storage.persist()` als "persistent" gemarkeerd kan worden).\[45\]\[46\]\[47\] Meerdere kinderen = meerdere profielen met alleen een voornaam of dierfiguur, lokaal.
- **Back-up:** "Bewaar voortgang" downloadt `damvoortgang.json`; "Laad voortgang" leest het weer in. Daarmee kun je ook van iPad naar laptop overzetten, zonder server.
- **Geluid:** korte, zachte effecten (zet, slag, dam, ster) met een aparte schakelaar voor geluid en voor spraak. Ga uit van een iPad met de stilschakelaar aan: toon ook altijd visuele feedback.

#### 3.5 Privacy en veiligheid (AVG)

- Een app die **niets verzamelt en niets verstuurt** is de sterkste privacykeuze: geen account, geen analytics, geen externe lettertypes of CDN's (die kunnen IP-adressen loggen), geen reclame-SDK's. Alles staat lokaal; de hosting levert alleen statische bestanden.
- De Nederlandse **Code voor Kinderrechten** (Universiteit Leiden en Waag, in opdracht van BZK) geeft tien beginselen voor makers van apps en games, waaronder "Zet het belang van het kind voorop", "Zorg voor een kindvriendelijk privacyontwerp", "Voorkom het profileren van kinderen", "Voorkom te allen tijde economische exploitatie van kinderen" en "Voorkom te allen tijde voor kinderen schadelijk ontwerp".\[48\]\[49\]\[50\] Gebruik die lijst als checklist.
- De Autoriteit Persoonsgegevens benadrukt dat privacy "al bij het ontwerp" begint en dat diensten "geen manipulatietechnieken" moeten inbouwen.\[51\]
- Juridische kanttekening: voor puur privégebruik binnen het gezin speelt de AVG nauwelijks. Zet je de app openbaar online, dan geldt: verwerk je geen persoonsgegevens, dan heb je ook vrijwel geen AVG-verplichtingen. Een korte privacyverklaring ("deze app verzamelt niets; voortgang blijft op dit apparaat") is wel netjes. Hosting-providers kunnen technisch toegangslogs bijhouden; noem dat in de verklaring. Dit is geen juridisch advies.

### 4. Bouwen met Claude Code

#### 4.1 Fasering (MVP eerst)

| Fase | Inhoud | "Klaar" als… |
|---|---|---|
| 0. Fundament | Projectstructuur, `CLAUDE.md`, testpagina (`tests.html`) | Tests draaien in de browser met één klik |
| 1. Regels + tests | `rules.js`: bord van N×N, zetten, slagplicht, meerslag, meerderheidsregel, vliegende dam, dam halen, winst/verlies, remise | 40+ testposities groen (zie 4.3) |
| 2. Speelbord (MVP) | Bord tekenen, tikken/slepen, zetten markeren, slagplicht zichtbaar, terugzetten, twee spelers op één apparaat, 6x6/8x8/10x10 | Je kind kan met jou een hele partij spelen |
| 3. Lessen | Lesmotor (stand + opdracht + controle + hints) en de lessen 1–8 | Je kind doorloopt les 1–3 zonder jouw hulp |
| 4. Puzzels | "Zoek de slag"-puzzels per thema, met sterren | 30+ puzzels, oplossing automatisch gecontroleerd |
| 5. AI-niveaus | `ai.js` in Web Worker, niveaus 1–5, uitleg na fouten | Niveau 1 verliest bijna altijd, niveau 5 wint van jou |
| 6. Beloningen | Lessenkaart, sterren, badges, thema's, profielen, export/import | Voortgang blijft na herstart bewaard |
| 7. Spraak + geluid | `speechSynthesis` nl-NL, eventueel eigen opnames, geluidseffecten | Alle uitleg hoorbaar zonder te lezen |
| 8. PWA + publicatie | Manifest, iconen, service worker, GitHub Pages/Netlify | Werkt in vliegtuigmodus vanaf het iPad-beginscherm |

#### 4.2 Lessen en oefeningen in logische volgorde

Gebaseerd op De Eerste Zet en De Tweede Zet, aangevuld met app-specifieke stappen. Bord: K = 6x6, M = 8x8, G = 10x10.

| # | Les | Bord | Oefeningen (voorbeelden) |
|---|---|---|---|
| 1 | Het dambord: donkere velden, linksonder donker | K | Tik alle donkere velden aan; welk bord ligt goed? |
| 2 | De schijf zet schuin vooruit | K | Breng 1 schijf naar de overkant; welke velden mag deze schijf op? |
| 3 | Om de beurt; wit begint | K | Mini-partij "wie het eerst aan de overkant is" (zonder slaan) |
| 4 | Dam halen: kroontje op de overkant | K | Haal een dam; hoeveel zetten nodig? |
| 5 | De vliegende dam beweegt ver | M | Kleur alle velden waar de dam heen mag (zoals in het werkboek) |
| 6 | Slaan met de schijf (vooruit) | K | Zoek de slag; sla de rode schijf |
| 7 | Slaan is verplicht | K | "Welke schijf moet slaan?"; mini-partij met slagplicht |
| 8 | Achteruit slaan met een schijf | K | Sla achteruit; "wie kan slaan?" |
| 9 | Meerslag: doorslaan | M | Sla 2, dan 3 schijven in één beurt |
| 10 | Slaan met de dam (op afstand, landen naar keuze) | M | Sla met de dam; kies een slim landingsveld |
| 11 | Meerslag gaat voor (meerderheidsregel) | M | Kies de slag met de meeste stukken; "dam telt als één" |
| 12 | Gelijk aantal = vrije keus | M | Twee slagen van 2: welke is het slimst? |
| 13 | Meerslag met de dam (hoekje om) | M | Dam slaat 2–3 stukken via een bocht |
| 14 | Geslagen stukken pas aan het eind weg (Turkse slag) | M/G | Puzzel waarin dit het verschil maakt |
| 15 | Slim verdedigen: niet weggeven | M | "Welke zet geeft geen schijf weg?" |
| 16 | Sterke aanval / dreigen | M | Zet een schijf zo dat je volgende beurt kunt slaan |
| 17 | Een ruiltje (1 om 1) | M | Vind de ruil |
| 18 | Twee voor één: eenvoudige combinatie | M | "Offer 1, sla er 2" |
| 19 | Winnen door vastzetten | K/M | Zet zwart vast |
| 20 | 1 dam tegen 1 dam = remise | M | Herken remise; korte uitleg 5- en 16-zettenregel |
| 21 | Overstap naar het grote bord | G | Zelfde regels, meer stukken; eerste partij op 10x10 |
| 22 | Puzzelen in volle standen | G | Mix van alle thema's ("oefentest") |
| 23+ | De Tweede Zet-thema's | G | O.a. het zetje van Weiss, eenvoudige combinaties |

Leidraad: elke les bevat 3–6 opdrachten. Na les 4, 8, 13 en 19 volgt een mini-partij tegen de AI waarin alleen de geleerde regels gelden.

#### 4.3 Valkuilen bij het bouwen (en hoe je ze test)

1. **Meerderheidsregel verkeerd.** Fout: alleen per schijf de langste slag zoeken, of een dam "zwaarder" laten tellen. Goed: genereer *alle* slagroutes van *alle* stukken, tel het aantal geslagen stukken, en houd alleen de routes met het maximum over (FMJD 4.13). Een dam telt als één. Bij gelijke aantallen zijn alle maxima toegestaan (4.14).\[1\]
2. **Stukken tijdens de slag al weghalen.** Fout: tijdens het zoeken een geslagen stuk meteen verwijderen. Daardoor kan een schijf of dam door een "gat" verder, wat niet mag. Goed: markeer geslagen stukken als "geslagen maar nog aanwezig"; ze blokkeren nog en mogen niet nog eens gesprongen worden (4.8, 4.11).\[1\]
3. **Vliegende dam in meerslag.** De dam mag na elke sprong op elk vrij veld achter het geslagen stuk landen, en vanaf elk van die velden verder slaan, ook "een hoek om" (4.3, 4.6).\[1\] Je moet dus alle landingsvelden als vertakking doorzoeken. De dam mag niet over twee stukken tegelijk springen en niet over eigen stukken (4.7).\[1\]
4. **Dam halen tijdens een slag.** Een schijf die de overkant passeert maar elders eindigt, blijft schijf (4.15).\[1\] Alleen eindigen op de damlijn maakt een dam, en pas na de beurt.
5. **Schijf slaat ook achteruit**, maar zet niet achteruit.\[1\]
6. **Dubbele routes en invoer.** Twee verschillende routes kunnen op hetzelfde eindveld eindigen maar andere stukken slaan. De invoer moet dan om tussenvelden vragen. Test dit expliciet.
7. **Remise tellen.** Driemaal dezelfde stand *met dezelfde speler aan zet* (bewaar standen als tekst, inclusief wie aan zet is). De 25-zettenregel telt "zetten per speler", alleen damzetten zonder slag; reset bij elke schijfzet of slag.\[1\] Voor de 16- en 5-zettenregel begint de teller zodra de materiaalverhouding ontstaat; volgens de KNDB-arbitershandleiding werken de 16- en 5-zettenregel niet "gestapeld".\[13\] Tip: houd per partij een zettenteller voor wit én zwart bij.
8. **Bordgrootte als parameter.** Schrijf nergens "10" of "50" hard in de code; dan werken 6x6 en 8x8 vanzelf. De damlijn is de eerste/laatste rij van dat bord.
9. **Bord niet gespiegeld.** Linksonder hoort voor elke speler een donker veld (FMJD 2.4).\[1\] Dat gaat bij het draaien van het bord (zwart onderaan) snel fout.
10. **Testen:** laat Claude Code een testpagina maken met minstens deze testposities: elke regel uit de tabel in 1.1, de meerderheidsregel met schijf vs. dam, een Turkse slag, een damslag met meerdere landingsvelden, een schijf die over de damlijn slaat, vaststaan = verlies, en de vier remiseregels. Een extra controle is "perft": tel het aantal mogelijke zetten na 1, 2, 3 en 4 halve zetten vanaf de beginstand en vergelijk met een tweede implementatie (bijvoorbeeld een van de bibliotheken uit 3.3) of met gepubliceerde waarden. Ik heb zelf geen geverifieerde perft-getallen voor 10x10 gevonden; laat Claude Code die niet uit het hoofd "invullen".

#### 4.4 Werkwijze als niet-programmeur

- **Werk in kleine stappen.** De officiële Claude Code-documentatie adviseert: eerst verkennen, dan plannen, dan coderen ("Explore first, then plan, then code"), via de **plan mode** (Shift+Tab tot "plan mode on").\[52\] Laat Claude bij elke fase eerst een plan schrijven, lees het, en zeg dan pas "voer uit".
- **Geef Claude een vast geheugen:** een `CLAUDE.md` in de projectmap met de belangrijkste afspraken (zie de startprompt hieronder). Houd het kort; de documentatie waarschuwt dat Claude bij een te lange CLAUDE.md "half of it" negeert. Na elke fout: "Voeg aan CLAUDE.md toe hoe we dit voortaan voorkomen."\[52\]\[53\]\[54\]
- **Eis bewijs:** "Always provide verification (tests, scripts, screenshots)".\[52\] Vraag na elke wijziging: "Draai de tests en laat zien dat ze slagen."
- **Gebruik versiebeheer (git).** Vraag Claude om na elke werkende stap een commit te maken.\[55\]\[56\] Dan kun je altijd terug.
- **Testen met je kind:**
  1. Laat je kind de app zelf openen; jij kijkt alleen en zegt niets (5–10 minuten).
  2. Noteer waar het kind aarzelt, verkeerd tikt, vraagt "wat moet ik doen?", of afhaakt.
  3. Vraag na afloop: "Wat was leuk? Wat was moeilijk? Wat zou Dammie anders moeten zeggen?"
  4. Max. 1–2 testsessies per week; kinderen van 6–9 hebben snel "genoeg".
- **Feedback teruggeven aan Claude Code:** beschrijf *wat er gebeurde* en *wat je verwachtte*, met apparaat en stappen. Bijvoorbeeld: "Op de iPad, les 7: mijn dochter tikte op een schijf die niet kon slaan. Er gebeurde niets en ze dacht dat de app kapot was. Verwacht: de schijf wiebelt en Dammie zegt 'Deze schijf kan niet slaan, kijk naar de oranje schijf'." Voeg een screenshot toe. Eén probleem per bericht.
- **Regelfouten:** als je denkt dat een regel fout is, vraag dan: "Maak hiervan eerst een test die faalt, en repareer daarna de code."

#### 4.5 Startprompt / briefing voor Claude Code

Kopieer het volgende als eerste bericht (en laat Claude er een `CLAUDE.md` van maken):

```
PROJECT: "Dammie" – een damleerspel voor kinderen van 6–9 jaar (Nederlands).

DOEL
Een kind leert stap voor stap internationaal dammen (FMJD/KNDB-regels), van
"hoe beweegt een schijf" tot meerslag en de vliegende dam, en kan spelen tegen
een instelbare computer. Ik (Arnout) ben geen programmeur: leg keuzes kort en
in gewone taal uit, en werk in kleine, testbare stappen.

PLATFORM EN TECHNIEK
- Statische webapp, later PWA: gewone HTML/CSS/JavaScript (ES-modules), GEEN
  build-stap, GEEN frameworks, GEEN externe CDN's of lettertypes, GEEN server.
- Moet werken op laptop (Chrome/Edge/Safari), iPad en telefoon (Safari/Chrome).
- Bestanden: index.html, style.css, rules.js (regels), ai.js (computer, in een
  Web Worker), lessons.js (lesdata), ui.js, speech.js, storage.js,
  tests.html + tests.js, manifest.json, sw.js, iconen.
- Publicatie later via GitHub Pages; op iPad via Safari > Zet op beginscherm.

REGELS (rules.js) – exact volgens FMJD Annex 1
- Bordgrootte als parameter (6, 8, 10). Spel op donkere velden; linksonder is
  donker voor beide spelers. Beginstand 10x10: zwart 1–20, wit 31–50; 8x8: 12
  schijven op 3 rijen; 6x6: 6 schijven op 2 rijen. Wit begint.
- Schijf zet 1 veld schuin vooruit; slaat vooruit én achteruit.
- Dam (vliegend) zet en slaat over afstand; landt na het geslagen stuk op elk
  vrij veld; mag in meerslag van richting veranderen.
- Slaan is verplicht. Meerslag gaat voor: alleen routes met het MAXIMALE aantal
  geslagen stukken zijn legaal; een dam telt als 1 stuk; bij gelijk aantal vrije
  keus.
- Geslagen stukken pas na de volledige slag van het bord; tijdens de slag
  blokkeren ze en mogen ze niet twee keer gesprongen worden.
- Schijf wordt alleen dam als hij op de damlijn EINDIGT.
- Winst: tegenstander heeft geen stukken of geen legale zet.
- Remise: 3x zelfde stand met zelfde speler aan zet; 25 zetten per speler alleen
  met dammen zonder schijfzet/slag; 3 stukken (min. 1 dam) tegen 1 dam: 16 zetten
  per speler; 2 stukken (min. 1 dam) of 1 dam tegen 1 dam: 5 zetten per speler.
- Lessen mogen regels tijdelijk uitzetten via opties (bijv. damHalen:false).
- Schrijf EERST tests.html met testposities voor elke regel (incl.
  meerderheidsregel, Turkse slag, damslag met meerdere landingsvelden, schijf die
  over de damlijn slaat, vaststaan, alle remiseregels). Code is pas klaar als alle
  tests groen zijn. Verzin geen "bekende" perft-getallen.

INTERFACE (kindvriendelijk)
- Vakjes en knoppen minimaal ca. 2x2 cm op het apparaat; 10x10 alleen aanbieden
  als het scherm groot genoeg is.
- Tikken (stuk, dan doelveld) én slepen. Legale doelvelden tonen met stip.
  Bij slagplicht pulseren alleen de stukken die moeten slaan + gesproken uitleg.
  Meerslag: tik eindveld; bij dubbelzinnige routes tussenvelden vragen.
- Onbeperkt terugzetten in lessen/oefenpartijen. Max. 3–4 knoppen per scherm.
- Iconen + gesproken tekst; tekst nooit noodzakelijk.
- Mascotte "Dammie" geeft uitleg, hints (3 stappen) en vriendelijke feedback
  ("Bijna! ..."), nooit "Fout!".

LESSEN EN PUZZELS
- Lesmotor: stand + opdracht + verwachte zet(ten) + hints + gesproken tekst.
- Volgorde (zie lessenlijst): bord, schijf, om de beurt, dam halen, vliegende
  dam, slaan, slagplicht, achteruit slaan, meerslag, damslag, meerslag gaat voor,
  vrije keus, damslag met bocht, Turkse slag, verdedigen, aanvallen, ruilen,
  twee-voor-een, vastzetten, remise, overstap naar 10x10, gemengde puzzels.
- 1–3 sterren per opdracht op basis van gebruikte hints; altijd "gehaald".

COMPUTER (ai.js, Web Worker)
- Minimax met alfa-bèta. Niveaus 1–5: (1) willekeurig, laat zich slaan;
  (2) diepte 1 + 40% willekeur; (3) diepte 2–3 + 15% kleine fouten;
  (4) diepte 4–5; (5) diepte 6+ met tijdslimiet 1 s.
- Na een zet van het kind die direct materiaal weggeeft: Dammie legt uit wat de
  tegenstander nu kan slaan en biedt "terugzetten" aan.
- Adaptief: na 3x winst voorstel om niveau omhoog te gaan; na 3x verlies stil
  een stapje omlaag.

BELONINGEN
- Lessenkaart, sterren, badges voor beheersing, cosmetische bordthema's.
- VERBODEN: reclame, aankopen, timers/tijdsdruk, streaks, pushmeldingen,
  "kom terug"-prikkels, ranglijsten, gegevens naar buiten.

SPRAAK EN GELUID
- speechSynthesis met nl-NL-stem (terugval nl-BE, anders alleen tekst); alleen
  starten na een tik (iOS). Optioneel eigen mp3-opnames voor vaste teksten.
- Aparte schakelaars voor spraak en geluid; altijd ook visuele feedback.

OPSLAG EN PRIVACY
- Alles lokaal (localStorage of IndexedDB), profielen met alleen voornaam/dier.
- navigator.storage.persist() aanvragen; knop "Bewaar/Laad voortgang" (JSON).
- Geen analytics, geen cookies, geen externe verzoeken. Korte privacytekst:
  "Deze app verzamelt niets."

WERKWIJZE
- Begin met fase 0–1 (structuur + regels + tests). Maak per fase eerst een plan,
  wacht op mijn akkoord, voer dan uit, draai de tests, en maak een git-commit.
- Leg na elke fase in 3–5 zinnen uit wat ik op de iPad moet testen.
```

## Recommendations

1. **Begin klein en bewijs de regels eerst.** Fase 0–1 (regels + tests) is het fundament. Pas als alle testposities groen zijn, bouw je het bord. Dat voorkomt dat je kind regels fout aanleert.
2. **Gebruik 6x6/8x8 voor de eerste weken**, met dezelfde internationale regels, en schakel naar 10x10 na les 20 of zodra je kind op 8x8 af en toe van niveau 3 wint.
3. **Spreek de lesteksten eventueel zelf in.** Een vertrouwde stem werkt voor een 6-jarige beter dan een synthetische stem, en het omzeilt verschillen tussen apparaten.
4. **Houd de app "saai" op de goede manier:** geen timers, geen streaks, geen reclame. Beloon beheersing, niet tijd.
5. **Test elke week 10 minuten met je kind**, kijk zonder te helpen, en geef Claude Code per sessie maximaal 3 concrete verbeterpunten.
6. **Leg de link naar de echte wereld:** speel ook op een echt bord, en overweeg een damclub of het schooldammen om echt het diploma De Eerste Zet te halen.

## Caveats

- **6x6 is geen officiële variant** en niet wetenschappelijk onderzocht voor damles. Het is een redelijke didactische keuze om te testen. 8x8 met internationale regels (Braziliaans) wordt in de praktijk wel bij jeugd gebruikt.\[16\]
- **AI-niveaus, de "helft winnen"-vuistregel en lesduur van 3–5 minuten** zijn ontwerpadviezen, geen onderzoeksuitkomsten. Stem ze af op je eigen kind.
- **iOS-opslag:** Apple documenteert het opslaggedrag van PWA's beperkt. Bronnen spreken elkaar deels tegen (sommige stellen dat de zevendagenregel ook voor beginscherm-apps geldt, WebKit/Apple zeggen dat beginscherm-apps een eigen teller hebben).\[7\]\[41\]\[57\] Ga uit van "kan soms verdwijnen" en bouw de export-/importknop.
- **Dambibliotheken:** of `draughts`, `@jortvl/draughts` en `dawikk-draughts` de meerderheidsregel en de vliegende dam volledig correct implementeren, kon niet uit de eigen documentatie worden bevestigd. Daarom het advies om een eigen, geteste regelmodule te bouwen.
- **KNDB-materialen:** de exacte inhoud en het aantal lessen van DamMentor en de cursus in kndbdammen.nl konden niet volledig worden ingezien. Lesmateriaal van de KNDB en Jeugddammen Noord mag je als inspiratie gebruiken, maar kopieer geen diagrammen of teksten letterlijk zonder toestemming.
- **AVG:** dit rapport geeft geen juridisch advies. Voor een openbare publicatie aan andere gezinnen of scholen is een korte check door iemand met privacykennis verstandig.

## Sources

1. <https://www.fmjd.org/downloads/news/948/Annex%201%20official%20FMJD%20rules%20of%20international%20draughts.pdf>
2. [DCIJ-nieuws: Dammen op klein bord vergroot inzicht jeugd - Jutter](https://www.jutter.nl/dcij-nieuws-dammen-op-klein-bord-vergroot-inzicht-jeugd/)
3. [BrainKing - Spelregels (Braziliaans Dammen)](https://brainking.com/nl/GameRules?tp=120)
4. [Dammen regels: dambord, opstelling en damstenen](https://morphitoys.com/dammen-regels/)
5. [Werkboeken Bestellen](https://jeugddammennoord.nl/index.php/over-ons-2/werkboeken)
6. [Beginnerscursus](http://damclubzenderstad.nl/index.php/jeugd/beginnerscursus)
7. [IndexedDB Storage Limits & Eviction Rules: Chrome vs Safari vs Firefox (2026)](https://qnotepad.com/blog/indexeddb-storage-limits-safari-firefox-chrome)
8. [Private client-side-only PWAs are hard, but now Apple made them impossible](https://news.ycombinator.com/item?id=22686602)
9. [DeepClick Inventor of ReflowLink](https://deepclick.com/resources/blog/progressive-web-apps-on-ios/)
10. [GitHub - rhalbersma/scan: Mirror of Fabien Letouzey's international draughts engine Scan · GitHub](https://github.com/rhalbersma/scan)
11. [GitHub - RoepStoep/lidraughts: lidraughts.org: the forever free, adless and open source draughts server · GitHub](https://github.com/RoepStoep/lidraughts)
12. [KNDB handboek D1 - 1 Juni 2014 Spel- en Wedstrijdreglement (maart 2013)](https://www.kndb.nl/wp-content/uploads/d1swr.pdf)
13. [ARBITERS HANDLEIDING 2014](https://www.kndb.nl/wp-content/uploads/20142015arbitershandleiding.pdf)
14. [Varianten van het damspel](https://nl.wikipedia.org/wiki/Varianten_van_het_damspel)
15. [GitHub - miskibin/py-draughts: Fastest Python draughts/checkers library — bitboards, 8 variants, alpha-beta engine, web UI. \~200x faster than pydraughts. · GitHub](https://github.com/miskibin/py-draughts)
16. [0 Handleiding Leerkrachten Damlessen verzorgen op scholen](https://jeugddammennoord.nl/wp-content/uploads/2018/08/Handleiding-Leerkrachten.pdf)
17. [American Checkers vs. International Draughts: Key Differences (2026)](https://nextcheckersmove.com/blog/american-checkers-vs-international-draughts)
18. [International Draughts — 10×10 Checkers Rules](https://rarepike.com/checkers/international-draughts/)
19. [Bestel damwerkboeken voor de jeugd](https://jeugddammennoord.nl/index.php/informatie/bestel-damwerkboeken-voor-de-jeugd/)
20. [Werkboeken - Slimmezet](https://slimmezet.org/werkboeken/)
21. [Dam- en promotiepakketten - Slimmezet](https://slimmezet.org/dam-en-promotiepakketten/)
22. [LEREN DAMMEN DAMWERKBOEK De Eerste Zet Versie: 2018 DAMWERKBOEK VOOR KINDEREN](https://jeugddammennoord.nl/wp-content/uploads/2018/08/DE-EERSTE-ZET-Werkboek-2018.pdf)
23. [Monsterse damvereniging - KNDB competitie](http://www.monstersedamvereniging.nl/jeugd.php)
24. [Jan legt uit](https://www.kndb.nl/jan-legt-uit-dammentor-voorzien-van-leerzame-videos/)
25. [DamApp KNDB](https://www.kndb.nl/dam-app-kndb-en-promotievideo/)
26. [KNDB Dam App](https://www.kndbdammen.nl/)
27. [Putting Education in “Educational” Apps - Kathy Hirsh-Pasek, Jennifer M. Zosh, Roberta Michnick Golinkoff, James H. Gray, Michael B. Robb, Jordy Kaufman, 2015](https://journals.sagepub.com/doi/10.1177/1529100615569721)
28. [What Makes an App Educational? - Cognitive Neuroscience Society](https://www.cogneurosociety.org/ed_apps_kaufman_may15/)
29. [Looking for an educational life raft? Apps may not be the answer](https://www.brookings.edu/articles/looking-for-an-educational-life-raft-apps-may-not-be-the-answer/)
30. [Lessons Learned Using the javascript speechSynthesis API](https://talkrapp.com/speechSynthesis.html)
31. [Speech Synthesis API: Browser Support, Voices, Limitations](https://www.testmuai.com/learning-hub/speech-synthesis-api-browser-support/)
32. [Web Speech API Browser Support (2026): speechSynthesis & SpeechRecognition](https://textintoaudio.com/browser-support)
33. [Give Your Web App a Voice - Andrew Usher](https://andrewusher.dev/blog/give-your-web-app-a-voice)
34. [Scan Draughts 1.0 Free Download](https://scan-draughts-ios.soft112.com/)
35. [Design for Kids Based on Their Stage of Physical Development](https://www.nngroup.com/articles/children-ux-physical-development/)
36. [Meet PWA installability criteria](https://frontendchecklist.io/rules/html/pwa-installability)
37. [Progressive Web Apps 2026: PWA Performance Guide](https://www.digitalapplied.com/blog/progressive-web-apps-2026-pwa-performance-guide)
38. [Web App Manifest — Make Your Site an Installable PWA — W3Tweaks](https://www.w3tweaks.com/html/web-app-manifest-installable-pwa/)
39. [iOS PWA Limitations in 2026: What Still Doesn't Work on Safari](https://tappwa.com/blog/ios-pwa-limitations-2026)
40. [PWA on iOS: Limitations, Workarounds, and Safari Quirks](https://blog.hashhackers.com/blog/pwa-ios-limitations/)
41. [Safari PWA Limitations on iOS: Why Progressive Web Apps Struggle on Apple Devices](https://docs.bswen.com/blog/2026-03-12-safari-pwa-limitations-ios/)
42. [Current Progressive Web App Limitations To iOS Users - Tigren](https://www.tigren.com/blog/progressive-web-app-limitations/)
43. [Progressive web apps on iPhone in 2026: what is true and what is folklore — Synthetixis](https://synthetixis.com/writing/pwa-ios-2026)
44. [web-speech-cognitive-services - npm](https://www.npmjs.com/package/web-speech-cognitive-services)
45. [Store data on the device - Microsoft Edge Developer documentation](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline)
46. [Storage Quotas & Eviction Policies](https://www.browser-storage.com/browser-storage-fundamentals-quotas/storage-quotas-eviction-policies/)
47. [Storage API - MDN Web Docs - Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
48. [Veilig online met de Code voor Kinderrechten](https://www.kijkwijzer.nl/nieuws/veilig-online-met-de-code-voor-kinderrechten/)
49. [Code voor Kinderrechten](https://codevoorkinderrechten.waag.org/)
50. [Code helpt kindvriendelijk te ontwerpen - ECP](https://ecp.nl/code-helpt-kindvriendelijk-te-ontwerpen/)
51. [Aandacht voor digitale kinderrechten bij Global Privacy Assembly 2021](https://autoriteitpersoonsgegevens.nl/nl/nieuws/aandacht-voor-digitale-kinderrechten-bij-global-privacy-assembly-2021)
52. [Best practices for Claude Code - Claude Code Docs](https://code.claude.com/docs/en/best-practices)
53. [50 Claude Code Tips and Best Practices For Daily Use](https://www.builder.io/blog/claude-code-tips-best-practices)
54. [Deep Dive: Claude Code Best Practices You Should Be Using](https://shrutikapoor.substack.com/p/my-claude-code-setup-after-a-year)
55. [Claude Code Best Practices. Claude Code Best Practices](https://medium.com/@mjgmario/claude-code-best-practices-20b7e9d0ddf0)
56. [Claude Code Best Practices · Claude Code Best Practices](https://rosmur.github.io/claudecode-best-practices/)
57. [Safari iOS PWA Data Persistence Beyond 7 Days](https://developer.apple.com/forums/thread/710157)
