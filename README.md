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

### Stap 1 — situatieschema
* **Ruimte**: sleep een rechthoek. **Vorm**: klik punt per punt, dubbelklik of
  <kbd>Enter</kbd> sluit de vorm. **Muur**: losse binnenmuur tekenen.
* Sleep een geselecteerde ruimte om ze te verplaatsen (de componenten erin gaan
  mee); sleep de hoekpunten om ze te vervormen.
* Rechts stel je naam, type en kleur in. Het ruimtetype bepaalt mee of een kring
  achter een differentieel van 30 mA hoort (badkamer, wasplaats, buiten …).

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
* Per kring stel je automaat (A), kabelsectie (mm²), curve en differentieel in.
* De **controlelijst** waarschuwt voor te veel punten op een kring, een te
  zware automaat voor de gekozen kabel, een ontbrekend differentieel, een
  vochtige ruimte zonder 30 mA, en toestellen die een eigen kring horen te
  hebben.

### Verdeelbord
Het tabblad *Verdeelbord* toont het eendraadschema van teller tot kring, en
daaronder per zekering welke componenten erop zitten, gegroepeerd per ruimte.

### Bewaren en delen
* Het project wordt automatisch in de browser bewaard.
* *Project opslaan* geeft een `.json`-bestand dat je kan bewaren, doorsturen of
  op een ander toestel weer openen.
* *Plan als PNG / SVG* exporteert het situatieschema.
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

## Voorbehoud

De controles zijn gangbare vuistregels uit het AREI voor huishoudelijke
installaties. Ze helpen bij het ontwerp, maar vervangen geen berekening door een
installateur en geen keuring door een erkend organisme.
