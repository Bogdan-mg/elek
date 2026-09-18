# Elek — situatieschema & zekeringen

Een app om het elektrisch dossier van een woning te maken, in de werkwijze van
Trikker en Tricity:

1. **Situatieschema** — teken de ruimtes van de woning.
2. **Componenten** — plaats lichtpunten, schakelaars, stopcontacten, toestellen
   en zwakstroompunten op dat schema.
3. **Kringen** — bepaal per component op welke zekering hij komt, en bekijk het
   verdeelbord met de lijst per kring.

De app draait volledig in de browser, werkt **offline** en is te installeren op
**Windows** en op **iPad**. Er is geen server, geen account en geen internet
nodig: je project blijft op het toestel staan.

## Openen en installeren

Er zijn twee manieren. De eerste is de snelste, de tweede geeft een echte
app met eigen icoon die offline werkt.

### 1. Eén bestand, zonder installatie

`elek-eenbestand.html` bevat de volledige app in één bestand. Download het
(op GitHub: het bestand openen → *Download raw file*) en open het:

* **Windows**: dubbelklik het bestand; het opent in je browser.
* **iPad**: bewaar het in *Bestanden* en tik erop (of *Deel → Openen in Safari*).

Geen server, geen installatie. Je project wordt bewaard in de browser waarin je
het bestand opent; met *Project opslaan* maak je er een `.json`-bestand van.

Dit bestand wordt gemaakt uit de gewone bronbestanden:

```bash
python3 tools/bouw-eenbestand.py
```

### 2. Als app op Windows en iPad (aanrader)

De app is een gewone statische website. Zet de map op een webserver (of gebruik
GitHub Pages) en open `index.html`.

**GitHub Pages inschakelen:** repository → *Settings* → *Pages* → *Source:
Deploy from a branch* → branch kiezen, map `/ (root)` → *Save*. Na een minuut
staat de app op `https://<gebruiker>.github.io/elek/`.

**Op Windows** (Edge of Chrome): open de pagina en klik in de adresbalk op het
installatie-icoon, of *Menu → Apps → Deze site als app installeren*. De app
krijgt een eigen venster en een snelkoppeling in het startmenu.

**Op iPad** (Safari): open de pagina, tik op *Deel* → *Zet op beginscherm*. De
app start dan schermvullend, met eigen icoon, en werkt zonder verbinding.

**Lokaal uitproberen** (met Node geïnstalleerd):

```bash
npx http-server -p 8080 .
# open daarna http://localhost:8080
```

Openen via `file://` werkt niet: de browser blokkeert dan de modules en de
service worker.

## Werken met de app

### Verdiepingen
Boven het plan staat een balkje met de verdiepingen. Met **+** voeg je er een
toe; je kan de ruimtes, deuren en ramen van het huidige niveau meteen meenemen
als vertrekpunt. Elke verdieping heeft haar eigen grondplan-onderlaag, en bij
het afdrukken krijgt elke verdieping een eigen blad. De kringen en het
eendraadschema gelden voor de hele installatie.

### Stap 1 — situatieschema
* **Ruimte**: klik twee hoeken (of sleep). **Vorm**: klik punt per punt,
  <kbd>Enter</kbd> of een klik op het eerste punt sluit de vorm. **Muur**: losse
  binnenmuur.
* Tijdens het tekenen zie je onderaan de **lengte en de hoek** van de lijn die je
  trekt, en staat de maat ook bij de lijn zelf. Richtingen springen vast op 45°,
  zodat lijnen recht blijven; houd <kbd>Alt</kbd> ingedrukt om vrij te tekenen.
* Typ een **lengte in meter** en druk <kbd>Enter</kbd> om een punt op een exacte
  maat te zetten. <kbd>Backspace</kbd> neemt het laatste punt terug.
* Hoekpunten van bestaande ruimtes trekken aan, zodat kamers exact op elkaar
  aansluiten.
* **Deuren, ramen, doorgangen, een garagepoort en een trap** klik je in de muur;
  ze snijden de muur open en worden op ware breedte getekend. Breedte en diepte
  pas je rechts aan.
* **Een bestaand plan overtekenen**: via *Menu → Grondplan importeren* laad je een
  foto of scan als onderlaag. Zet de breedte gelijk aan een maat die je op het
  plan kent, sleep de afbeelding op haar plaats, vergrendel ze en teken erover.
  De afbeelding wordt verkleind opgeslagen en gaat mee in het projectbestand.
* Sleep een geselecteerde ruimte om ze te verplaatsen (de componenten erin gaan
  mee); sleep de hoekpunten om ze te vervormen. Voor een rechthoekige ruimte kan
  je rechts de **exacte breedte en diepte** invullen.
* Het ruimtetype bepaalt mee of een kring achter een differentieel van 30 mA
  hoort (badkamer, wasplaats, buiten …).

### Stap 2 — componenten
* Kies een symbool uit het palet en klik op het plan; het gereedschap blijft
  actief zodat je er meerdere na elkaar kan plaatsen.
* Stopcontacten, schakelaars en wandtoestellen klikken automatisch tegen de
  dichtstbijzijnde muur en draaien mee met die muur.
* Met **Verbinden** koppel je een schakelaar aan het lichtpunt dat hij bedient;
  die schakelaar komt dan op dezelfde kring terecht.
* Per component stel je naam, hoogte, vermogen en draaiing in.

### Stap 3 — kringen en zekeringen
* **Automatisch verdelen** maakt een eerste indeling: een eigen kring per vast
  toestel, verlichting en stopcontacten per ruimte (max. 8 punten per kring), en
  een differentieel van 30 mA voor vochtige ruimtes.
* Zelf toewijzen: kies een kring (knop ◎) en klik of sleep over de componenten
  op het plan. Elke kring heeft een eigen kleur en nummer op het schema.
* Per kring stel je automaat (A), kabelsectie (mm²), curve, kabeltype (VOB,
  XVB …), kortsluitvermogen en differentieel in; die komen op het
  eendraadschema te staan zoals `2P - C 16A`, `VOB 3G2,5` en het kadertje met
  `3000`.
* De **controlelijst** waarschuwt voor te veel punten op een kring, een te
  zware automaat voor de gekozen kabel, een ontbrekend differentieel, een
  vochtige ruimte zonder 30 mA, en toestellen die een eigen kring horen te
  hebben.

### Eendraadschema
Het tabblad *Verdeelbord* toont het **eendraadschema** zoals het op een
Belgisch dossier hoort: onderaan de aardelektrode, de kWh-teller en de
hoofdautomaat, daarboven per differentieel een rail, en vanaf die rail vertrekt
elke kring naar boven met

* de automaat (`2P · C16 A`) volgens het AREI-symbool,
* de leiding met het aantal geleiders en de kabel (`XVB 3G2,5`),
* het kringnummer in dezelfde kleur als op het plan,
* de symbolen van álle aangesloten toestellen in de lijn, met naam, aantal en
  ruimte,
* de kringnaam verticaal bovenaan, met aantal punten en geschat vermogen.

Onderaan staat een titelhoek met klant, adres, spanning en datum. Met *Passend*
of *100 %* schakel je tussen het volledige schema in beeld en ware grootte.
Daaronder staat per zekering welke componenten erop zitten, gegroepeerd per
ruimte.

### Puntcodes
Net zoals in een Trikker-dossier krijgt elk punt een code: de letter van de
kring plus het nummer van de aftakking op het eendraadschema (`F5` = kring F,
aftakking 5). Die code staat onder het symbool op het situatieschema, links van
de aftakking op het eendraadschema en in de lijst per zekering, zodat beide
tekeningen naar hetzelfde punt verwijzen. De letters lopen zoals op het bord:
`A` is de hoofdautomaat met differentieel, daarna krijgt elk differentieel en
elke kring de volgende letter.

### Titelhoek en paginanummers
Bij export en afdruk krijgen beide tekeningen de titelhoek van een dossier:
*Plaats van de elektrische installatie* (klant en adres), *Installateur*
(firmanaam, btw-nummer en telefoon, in te vullen bij de projectgegevens) en
rechts `p. x/y`, het soort schema, de spanning en de datum. Rond het
situatieschema staan maatlijnen met de totale breedte en diepte, in Belgische
notatie (`9,00 m`).

### Zwart-wit
De tekeningen zijn standaard **zwart-wit**, zoals een dossier hoort af te
drukken: witte ruimtes, muren als grijze band, zwarte symbolen en zwarte
puntcodes. In de weergave-instellingen kan je *Kleur per kring* aanzetten (elk
symbool, de puntcode en de kringletter krijgen dan de kleur van hun kring) en
*Ruimtes inkleuren*. In stap 3 licht de kring waaraan je werkt op, en
componenten zonder kring krijgen een stippelring — ook zonder kleur zie je dus
waar je nog moet toewijzen.

### Symbolen
De symbolen volgen **AREI Boek 1, tabel 2.23** (grafische symbolen), dezelfde
norm die Trikker en Tricity gebruiken: lichtpunt als kruis in een cirkel,
schakelaars als cirkel met hefboom (streepjes = aantal polen), contactdozen als
boog met steel en aardingsstreep, vaste toestellen als rechthoek met het
pictogram van het toestel. Via *Menu → Symbolenlegende* zie je alle symbolen met
hun naam; die lijst kan je ook afdrukken.

### Bewaren en delen
* Het project wordt automatisch in de browser bewaard.
* *Project opslaan* geeft een `.json`-bestand dat je kan bewaren, doorsturen of
  op een ander toestel weer openen.
* *Situatieschema als PNG / SVG* en *Eendraadschema als PNG / SVG* exporteren
  de tekeningen apart.
* *Afdrukken / PDF* maakt drie pagina's: situatieschema, verdeelbord en de
  lijst met componenten per zekering.

## Sneltoetsen

| Toets | Actie |
| --- | --- |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> | stap kiezen |
| <kbd>Esc</kbd> | gereedschap loslaten / selectie wissen |
| <kbd>Del</kbd> | selectie verwijderen |
| <kbd>R</kbd> | draaien (met <kbd>Shift</kbd> de andere kant op) |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | ongedaan maken / opnieuw |
| <kbd>Ctrl</kbd>+<kbd>D</kbd> | dupliceren |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | project opslaan |
| <kbd>0</kbd> <kbd>+</kbd> <kbd>−</kbd> | alles in beeld / zoomen |
| pijltjes | selectie verplaatsen |
| cijfers tijdens tekenen | exacte lengte intypen, <kbd>Enter</kbd> plaatst het punt |
| <kbd>Alt</kbd> | vrij tekenen (geen hoek- of rastervastzetting) |

Op iPad: één vinger sleept het plan, twee vingers zoomen, tikken selecteert.

## Opbouw van de code

Geen bouwstap, geen dependencies — alleen ES-modules die de browser zelf laadt.

| Bestand | Rol |
| --- | --- |
| `index.html` | schermopbouw en dialogen |
| `css/app.css` | opmaak, licht/donker, smal scherm, afdrukstijl |
| `js/model.js` | datamodel, componentcatalogus, kabel- en kringtabellen |
| `js/store.js` | projecttoestand, selectie, undo/redo, opslag |
| `js/geometry.js` | meetkunde (snap, polygonen, projectie op muren) |
| `js/symbols.js` | symbolenbibliotheek (SVG) |
| `js/canvas.js` | tekenlaag en bediening van het situatieschema |
| `js/circuits.js` | kringen, automatische verdeling, controleregels |
| `js/panels.js` | zijpanelen en eigenschappen |
| `js/board.js` | verdeelbord en lijst per zekering |
| `js/exporters.js` | JSON, PNG, SVG en afdrukken |
| `sw.js` | service worker voor offline gebruik |
| `tools/bouw-eenbestand.py` | bouwt `elek-eenbestand.html` (alles in één bestand) |

## Voorbehoud

De controles zijn gangbare vuistregels uit het AREI voor huishoudelijke
installaties. Ze helpen bij het ontwerp, maar vervangen geen berekening door een
installateur en geen keuring door een erkend organisme.
