// Zijpanelen: gereedschap per stap, symbolenpalet, kringbeheer en
// het eigenschappenpaneel van de selectie.

import store from './store.js';
import {
  CATALOG, GROEPEN, def, ruimteDef, RUIMTETYPES, AMPERES, SECTIES,
  KRINGSJABLOON, minSectieVoor, uid, puntenVan,
} from './model.js';
import { symboolIcoon } from './symbols.js';
import { escape } from './canvas.js';
import {
  maakKring, verwijderKring, componentenVanKring, puntenInKring,
  autoVerdeel, controleer, maxPuntenVan, totaalVermogen, heeftKringNodig,
} from './circuits.js';
import { oppervlakte, omhullende, afstand, segmenten } from './geometry.js';

/** Omtrek van een polygoon. */
function omtrek(punten) {
  return segmenten(punten).reduce((s, [a, b]) => s + afstand(a, b), 0);
}

let planvlak = null;
export function koppelCanvas(c) { planvlak = c; }

const links = () => document.getElementById('paneel-links');
const rechts = () => document.getElementById('paneel-rechts');

/* ------------------------------------------------------------------ *
 * Linkerpaneel
 * ------------------------------------------------------------------ */
export function tekenLinks() {
  const stap = store.ui.stap;
  let h = '';
  if (stap === 1) h = paneelPlattegrond();
  else if (stap === 2) h = paneelComponenten();
  else h = paneelKringen();
  links().innerHTML = h;
}

function gereedschapKnop(tool, label, icoon, actief) {
  return `<button class="tool${actief ? ' actief' : ''}" data-actie="tool" data-tool="${tool}" title="${label}">
    <span class="tool-icoon">${icoon}</span><span class="tool-label">${label}</span></button>`;
}

function paneelPlattegrond() {
  const p = store.project;
  const ui = store.ui;
  const t = ui.tool;
  let h = `<div class="paneel-kop"><h2>1 · Situatieschema</h2>
    <p>Teken de ruimtes van de woning. Klik twee hoeken voor een rechthoek, of klik een vorm punt per punt.</p></div>
    <div class="tool-rij">
      ${gereedschapKnop('select', 'Selecteren', '⬉', t === 'select')}
      ${gereedschapKnop('rechthoek', 'Ruimte', '▭', t === 'rechthoek')}
      ${gereedschapKnop('polygoon', 'Vorm', '⬠', t === 'polygoon')}
      ${gereedschapKnop('muur', 'Muur', '▬', t === 'muur')}
      ${gereedschapKnop('gum', 'Wissen', '⌫', t === 'gum')}
    </div>`;

  h += `<label class="veld"><span>Type voor nieuwe ruimte</span>
    <select data-actie="nieuwe-ruimte-type">
      ${RUIMTETYPES.map((r) => `<option value="${r.key}"${(ui.nieuweRuimteType || 'overig') === r.key ? ' selected' : ''}>${r.naam}</option>`).join('')}
    </select></label>`;

  if (['rechthoek', 'polygoon', 'muur'].includes(t)) {
    h += `<div class="hint">Tijdens het tekenen zie je de lengte en de hoek onderaan. Richtingen springen
      vast op 45°, zodat lijnen recht blijven; houd <kbd>Alt</kbd> ingedrukt om vrij te tekenen. Typ een
      lengte in meter en druk <kbd>Enter</kbd> voor een exacte maat. Hoekpunten van bestaande ruimtes
      trekken aan, zodat kamers netjes aansluiten.</div>`;
  }
  if (ui.bezigPolygoon && ui.bezigPolygoon.length) {
    h += `<div class="hint actief-hint">${ui.bezigPolygoon.length} punt(en) geplaatst ·
      <button class="mini" data-actie="sluit-polygoon">Vorm sluiten</button>
      <button class="mini" data-actie="stop-polygoon">Annuleren</button></div>`;
  }

  if (p.plan.onderlaag) {
    const ol = p.plan.onderlaag;
    h += `<div class="lijst-kop"><h3>Ingescand grondplan</h3></div>
      <li class="rij" data-actie="selecteer" data-id="onderlaag" style="list-style:none">
        <span class="rij-naam">${escape(ol.naam || 'grondplan')}</span>
        <span class="rij-meta">${ol.breedte.toFixed(1)} m</span></li>
      <label class="schakel"><input type="checkbox" data-actie="onderlaag-zichtbaar" ${ol.zichtbaar !== false ? 'checked' : ''}> Tonen</label>
      <label class="schakel"><input type="checkbox" data-actie="onderlaag-vergrendeld" ${ol.vergrendeld ? 'checked' : ''}> Vergrendelen</label>`;
  }

  h += `<div class="lijst-kop"><h3>Deuren, ramen en trap</h3></div><div class="palet">`;
  for (const c of CATALOG.filter((x) => x.groep === 'Bouwkundig')) {
    const actief = ui.tool === 'plaats' && ui.plaatsType === c.key;
    h += `<button class="palet-knop${actief ? ' actief' : ''}" data-actie="plaats-type" data-type="${c.key}" title="${escape(c.naam)}">
      ${symboolIcoon(c.key, 26)}<span>${escape(c.naam)}</span></button>`;
  }
  h += `</div><p class="voetnoot">Deuren en ramen klikken in de dichtstbijzijnde muur en snijden die open.</p>`;

  h += `<div class="lijst-kop"><h3>Ruimtes (${p.plan.ruimtes.length})</h3></div><ul class="lijst">`;
  if (!p.plan.ruimtes.length) h += '<li class="leeg">Nog geen ruimtes getekend.</li>';
  for (const r of p.plan.ruimtes) {
    const d = ruimteDef(r.type);
    const aantal = p.componenten.filter((c) => c.ruimteId === r.id).length;
    h += `<li class="rij${store.isGeselecteerd(r.id) ? ' geselecteerd' : ''}" data-actie="selecteer" data-id="${r.id}">
      <span class="kleurbol" style="background:${r.kleur || d.kleur}"></span>
      <span class="rij-naam">${escape(r.naam || d.naam)}</span>
      <span class="rij-meta">${oppervlakte(r.punten).toFixed(1)} m² · ${aantal}</span></li>`;
  }
  h += '</ul>';

  h += `<div class="lijst-kop"><h3>Weergave</h3></div>
    <label class="schakel"><input type="checkbox" data-actie="ui" data-veld="toonRaster" ${store.ui.toonRaster ? 'checked' : ''}> Raster tonen</label>
    <label class="schakel"><input type="checkbox" data-actie="ui" data-veld="toonLabels" ${store.ui.toonLabels ? 'checked' : ''}> Namen tonen</label>
    <label class="schakel"><input type="checkbox" data-actie="ui" data-veld="toonMaten" ${store.ui.toonMaten ? 'checked' : ''}> Oppervlakte tonen</label>
    <label class="schakel"><input type="checkbox" data-actie="ui" data-veld="toonAlleMaten" ${store.ui.toonAlleMaten ? 'checked' : ''}> Alle zijdematen tonen</label>
    <label class="veld"><span>Raster (m)</span>
      <select data-actie="raster">${[0.05, 0.1, 0.25, 0.5, 1].map((v) => `<option value="${v}"${p.plan.raster === v ? ' selected' : ''}>${v} m</option>`).join('')}</select></label>`;
  return h;
}

function paneelComponenten() {
  const ui = store.ui;
  const zoek = (ui.zoek || '').toLowerCase();
  let h = `<div class="paneel-kop"><h2>2 · Componenten</h2>
    <p>Kies een symbool en klik op het plan. Stopcontacten en schakelaars klikken vanzelf tegen de dichtstbijzijnde muur.</p></div>
    <div class="tool-rij">
      ${gereedschapKnop('select', 'Selecteren', '⬉', ui.tool === 'select')}
      ${gereedschapKnop('verbind', 'Verbinden', '⌇', ui.tool === 'verbind')}
      ${gereedschapKnop('gum', 'Wissen', '⌫', ui.tool === 'gum')}
    </div>`;
  if (ui.tool === 'verbind') {
    h += `<div class="hint actief-hint">Klik een schakelaar en daarna het lichtpunt dat hij bedient.
      ${ui.verbindBron ? ' <strong>Schakelaar gekozen…</strong>' : ''}</div>`;
  }
  h += `<input class="zoek" type="search" placeholder="Zoek symbool…" data-actie="zoek" value="${escape(ui.zoek || '')}">`;

  for (const groep of GROEPEN) {
    if (groep === 'Bouwkundig') continue;          // hoort bij stap 1
    const items = CATALOG.filter((c) => c.groep === groep &&
      (!zoek || c.naam.toLowerCase().includes(zoek) || c.key.includes(zoek)));
    if (!items.length) continue;
    h += `<div class="lijst-kop"><h3>${groep}</h3></div><div class="palet">`;
    for (const c of items) {
      const actief = ui.tool === 'plaats' && ui.plaatsType === c.key;
      h += `<button class="palet-knop${actief ? ' actief' : ''}" data-actie="plaats-type" data-type="${c.key}" title="${escape(c.naam)}">
        ${symboolIcoon(c.key, 26)}<span>${escape(c.naam)}</span></button>`;
    }
    h += '</div>';
  }

  const elektrisch = store.project.componenten.filter((c) => def(c.type).kringtype !== 'bouw');
  const geteld = new Map();
  for (const c of elektrisch) geteld.set(c.type, (geteld.get(c.type) || 0) + 1);
  if (geteld.size) {
    h += `<div class="lijst-kop"><h3>Geplaatst (${elektrisch.length})</h3></div><ul class="lijst compact">`;
    for (const [type, aantal] of [...geteld.entries()].sort((a, b) => b[1] - a[1])) {
      h += `<li class="rij" data-actie="selecteer-type" data-type="${type}">
        <span class="rij-icoon">${symboolIcoon(type, 18)}</span>
        <span class="rij-naam">${escape(def(type).naam)}</span><span class="rij-meta">${aantal}</span></li>`;
    }
    h += '</ul>';
  }
  return h;
}

function paneelKringen() {
  const p = store.project;
  const ui = store.ui;
  let h = `<div class="paneel-kop"><h2>3 · Kringen &amp; zekeringen</h2>
    <p>Maak kringen aan en klik componenten op het plan aan om ze op die zekering te zetten.</p></div>
    <div class="knop-rij">
      <button class="knop primair" data-actie="auto-verdeel">Automatisch verdelen</button>
      <button class="knop" data-actie="nieuwe-kring">Kring toevoegen</button>
    </div>`;

  if (ui.actieveKring) {
    const k = store.kring(ui.actieveKring);
    if (k) {
      h += `<div class="hint actief-hint" style="border-color:${k.kleur}">
        Klik of sleep over componenten om ze aan <strong>${escape(k.naam)}</strong> toe te wijzen.
        <button class="mini" data-actie="stop-toewijzen">Klaar</button></div>`;
    }
  }

  h += '<div class="lijst-kop"><h3>Differentiëlen</h3><button class="mini" data-actie="nieuw-differentieel">+</button></div><ul class="lijst">';
  for (const d of p.differentiëlen) {
    const aantal = p.kringen.filter((k) => k.differentieelId === d.id).length;
    h += `<li class="rij dif-rij">
      <input class="inline-invoer" value="${escape(d.naam)}" data-actie="dif-naam" data-id="${d.id}">
      <select class="mini-select" data-actie="dif-gevoelig" data-id="${d.id}">
        ${[10, 30, 100, 300, 500].map((g) => `<option value="${g}"${d.gevoeligheid === g ? ' selected' : ''}>${g} mA</option>`).join('')}
      </select>
      <select class="mini-select" data-actie="dif-amp" data-id="${d.id}">
        ${[25, 40, 63, 80].map((a) => `<option value="${a}"${d.amp === a ? ' selected' : ''}>${a} A</option>`).join('')}
      </select>
      <span class="rij-meta">${aantal}</span>
      <button class="mini gevaar" data-actie="verwijder-differentieel" data-id="${d.id}" title="Verwijderen">×</button></li>`;
  }
  h += '</ul>';

  h += `<div class="lijst-kop"><h3>Kringen (${p.kringen.length})</h3></div><ul class="lijst kringen">`;
  if (!p.kringen.length) h += '<li class="leeg">Nog geen kringen. Gebruik “Automatisch verdelen” voor een eerste voorstel.</li>';
  for (const k of p.kringen) {
    const comps = componentenVanKring(p, k.id);
    const punten = puntenInKring(p, k.id);
    const max = maxPuntenVan(k);
    const tevol = max && punten > max;
    h += `<li class="kring-rij${ui.actieveKring === k.id ? ' actief' : ''}" data-actie="kies-kring" data-id="${k.id}">
      <span class="kring-nr" style="background:${k.kleur}">${k.nummer}</span>
      <span class="kring-info">
        <input class="inline-invoer" value="${escape(k.naam)}" data-actie="kring-naam" data-id="${k.id}">
        <span class="rij-meta">${k.amp} A · ${k.mm2} mm² · ${comps.length} comp.${max ? ` · <span class="${tevol ? 'fout-tekst' : ''}">${punten}/${max} pt</span>` : ''}</span>
      </span>
      <button class="mini toewijs${ui.actieveKring === k.id ? ' aan' : ''}" data-actie="kies-kring" data-id="${k.id}" title="Componenten aan deze kring toewijzen">◎</button>
      <button class="mini gevaar" data-actie="verwijder-kring" data-id="${k.id}" title="Kring verwijderen">×</button></li>`;
  }
  h += '</ul>';

  // Detailinstellingen van de gekozen kring
  const actief = ui.actieveKring && store.kring(ui.actieveKring);
  if (actief) {
    const dif = actief.differentieelId && store.differentieel(actief.differentieelId);
    h += `<div class="kring-detail" style="--kring:${actief.kleur}">
      <div class="lijst-kop"><h3>Kring ${actief.nummer} instellen</h3></div>
      <div class="veld-rij">
        <label class="veld"><span>Automaat</span>
          <select data-actie="kring-amp" data-id="${actief.id}">${AMPERES.map((a) => `<option value="${a}"${actief.amp === a ? ' selected' : ''}>${a} A</option>`).join('')}</select></label>
        <label class="veld"><span>Kabel</span>
          <select data-actie="kring-mm2" data-id="${actief.id}">${SECTIES.map((m) => `<option value="${m}"${actief.mm2 === m ? ' selected' : ''}>${m} mm²</option>`).join('')}</select></label>
      </div>
      <div class="veld-rij">
        <label class="veld"><span>Type kring</span>
          <select data-actie="kring-type" data-id="${actief.id}">${Object.entries(KRINGSJABLOON).map(([k2, v]) => `<option value="${k2}"${actief.type === k2 ? ' selected' : ''}>${v.naam}</option>`).join('')}</select></label>
        <label class="veld"><span>Differentieel</span>
          <select data-actie="kring-dif" data-id="${actief.id}">
            <option value="">— geen —</option>
            ${p.differentiëlen.map((d) => `<option value="${d.id}"${actief.differentieelId === d.id ? ' selected' : ''}>${escape(d.naam)} (${d.gevoeligheid} mA)</option>`).join('')}
          </select></label>
      </div>
      ${dif && dif.gevoeligheid > 30 ? '<p class="hint">Voor badkamer, wasplaats, buiten en vaste toestellen met water hoort 30 mA.</p>' : ''}
    </div>`;
  }

  const meldingen = controleer(p);
  h += `<div class="lijst-kop"><h3>Controle</h3><span class="badge${meldingen.some((m) => m.niveau === 'fout') ? ' rood' : ''}">${meldingen.length}</span></div>`;
  if (!meldingen.length) {
    h += '<p class="ok-tekst">Geen opmerkingen gevonden.</p>';
  } else {
    h += '<ul class="meldingen">';
    for (const m of meldingen) {
      h += `<li class="melding ${m.niveau}"${m.ids.length ? ` data-actie="toon-melding" data-ids="${m.ids.join(',')}"` : ''}>${escape(m.tekst)}</li>`;
    }
    h += '</ul>';
  }
  h += '<p class="voetnoot">Controle op basis van gangbare AREI-vuistregels. Geen vervanging voor de keuring door een erkend organisme.</p>';
  return h;
}

/* ------------------------------------------------------------------ *
 * Rechterpaneel (eigenschappen)
 * ------------------------------------------------------------------ */
export function tekenRechts() {
  const sel = store.ui.selectie;
  let h = '';
  if (sel.length === 1 && sel[0] === 'onderlaag') h = paneelOnderlaag();
  else if (sel.length > 1) h = paneelMeervoudig(sel);
  else if (sel.length === 1) {
    const comp = store.component(sel[0]);
    const ruimte = store.ruimte(sel[0]);
    h = comp ? paneelComponent(comp) : ruimte ? paneelRuimte(ruimte) : paneelProject();
  } else h = paneelProject();
  rechts().innerHTML = h;
  document.getElementById('werkvlak').classList.toggle('met-selectie', sel.length > 0);
}

function kringKeuze(huidig, actie = 'comp-kring') {
  const opties = store.project.kringen
    .map((k) => `<option value="${k.id}"${huidig === k.id ? ' selected' : ''}>${k.nummer} · ${escape(k.naam)} (${k.amp}A)</option>`)
    .join('');
  return `<select data-actie="${actie}"><option value="">— geen kring —</option>${opties}</select>`;
}

function paneelComponent(c) {
  const d = def(c.type);
  const ruimte = c.ruimteId && store.ruimte(c.ruimteId);
  const kring = c.kringId && store.kring(c.kringId);
  const verbindingen = store.project.verbindingen.filter((v) => v.van === c.id || v.naar === c.id);
  let h = `<div class="paneel-kop"><h2>${escape(d.naam)}</h2>
    <p>${escape(d.groep)}${ruimte ? ' · ' + escape(ruimte.naam || ruimteDef(ruimte.type).naam) : ' · buiten een ruimte'}</p></div>
    <div class="groot-symbool" style="color:${kring ? kring.kleur : 'var(--symbool)'}">${symboolIcoon(c.type, 64)}</div>
    <label class="veld"><span>Naam / opschrift</span>
      <input type="text" value="${escape(c.label || '')}" placeholder="bv. bureau links" data-actie="comp-label"></label>
    ${d.kringtype === 'bouw' ? '' : `<label class="veld"><span>Kring / zekering</span>${kringKeuze(c.kringId)}</label>`}`;
  if (kring) {
    h += `<p class="kring-samenvatting" style="--kring:${kring.kleur}">
      Kring ${kring.nummer}: ${kring.amp} A · ${kring.mm2} mm²${kring.differentieelId && store.differentieel(kring.differentieelId) ? ` · Δ${store.differentieel(kring.differentieelId).gevoeligheid} mA` : ''}</p>`;
  }
  h += d.kringtype === 'bouw'
    ? `<div class="veld-rij">
        <label class="veld"><span>Breedte (m)</span><input type="number" step="0.05" min="0.3" value="${c.breedte ?? d.breedte ?? 0.9}" data-actie="comp-breedte"></label>
        ${c.type === 'trap' ? `<label class="veld"><span>Diepte (m)</span><input type="number" step="0.1" min="0.5" value="${c.diepte ?? d.diepte ?? 2.6}" data-actie="comp-diepte"></label>` : ''}
      </div>`
    : `<div class="veld-rij">
      <label class="veld"><span>Hoogte (cm)</span><input type="number" step="5" value="${c.hoogte ?? ''}" data-actie="comp-hoogte"></label>
      <label class="veld"><span>Vermogen (W)</span><input type="number" step="10" value="${c.watt ?? ''}" data-actie="comp-watt"></label>
    </div>`;
  h += `<label class="veld"><span>Draaiing (${Math.round(c.rot || 0)}°)</span>
      <input type="range" min="0" max="355" step="5" value="${Math.round(c.rot || 0)}" data-actie="comp-rot"></label>
    <label class="veld"><span>Type wijzigen</span>
      <select data-actie="comp-type">${CATALOG.filter((x) => (x.kringtype === 'bouw') === (d.kringtype === 'bouw'))
        .map((x) => `<option value="${x.key}"${x.key === c.type ? ' selected' : ''}>${x.groep} — ${x.naam}</option>`).join('')}</select></label>
    <label class="veld"><span>Opmerking</span><textarea rows="2" data-actie="comp-opmerking">${escape(c.opmerking || '')}</textarea></label>`;
  if (verbindingen.length) {
    h += `<div class="lijst-kop"><h3>Bediening</h3></div><ul class="lijst compact">`;
    for (const v of verbindingen) {
      const ander = store.component(v.van === c.id ? v.naar : v.van);
      if (!ander) continue;
      h += `<li class="rij"><span class="rij-icoon">${symboolIcoon(ander.type, 18)}</span>
        <span class="rij-naam">${escape(def(ander.type).naam)}</span>
        <button class="mini gevaar" data-actie="verwijder-verbinding" data-id="${v.id}">×</button></li>`;
    }
    h += '</ul>';
  }
  h += `<div class="knop-rij">
      <button class="knop" data-actie="dupliceer">Dupliceren</button>
      <button class="knop gevaar" data-actie="verwijder-selectie">Verwijderen</button>
    </div>`;
  return h;
}

/** Is de ruimte een rechthoek evenwijdig met de assen? */
function isRechthoek(r) {
  if (!r.punten || r.punten.length !== 4) return false;
  const [a, b, c, d] = r.punten;
  const gelijk = (x, y) => Math.abs(x - y) < 0.001;
  return gelijk(a.y, b.y) && gelijk(c.y, d.y) && gelijk(a.x, d.x) && gelijk(b.x, c.x);
}

function paneelRuimte(r) {
  const d = ruimteDef(r.type);
  const comps = store.project.componenten.filter((c) => c.ruimteId === r.id);
  const box = omhullende(r.punten);
  const maten = isRechthoek(r)
    ? `<div class="veld-rij">
        <label class="veld"><span>Breedte (m)</span><input type="number" step="0.05" min="0.3" value="${box.w.toFixed(2)}" data-actie="ruimte-breedte"></label>
        <label class="veld"><span>Diepte (m)</span><input type="number" step="0.05" min="0.3" value="${box.h.toFixed(2)}" data-actie="ruimte-diepte"></label>
      </div>`
    : `<p class="hint">Vrije vorm met ${r.punten.length} hoekpunten · omtrek ${omtrek(r.punten).toFixed(2)} m</p>`;
  return `<div class="paneel-kop"><h2>${escape(r.naam || d.naam)}</h2>
      <p>${oppervlakte(r.punten).toFixed(2)} m² · ${comps.length} componenten</p></div>
    ${maten}
    <label class="veld"><span>Naam</span><input type="text" value="${escape(r.naam || '')}" data-actie="ruimte-naam"></label>
    <label class="veld"><span>Type ruimte</span>
      <select data-actie="ruimte-type">${RUIMTETYPES.map((x) => `<option value="${x.key}"${x.key === r.type ? ' selected' : ''}>${x.naam}</option>`).join('')}</select></label>
    <div class="veld-rij">
      <label class="veld"><span>Kleur</span><input type="color" value="${r.kleur || d.kleur}" data-actie="ruimte-kleur"></label>
      <label class="veld"><span>Muurdikte (m)</span><input type="number" step="0.01" min="0.02" value="${r.muurdikte || 0.09}" data-actie="ruimte-muurdikte"></label>
    </div>
    ${d.vochtig ? '<p class="hint">Vochtige ruimte: kringen horen hier achter een differentieel van 30 mA.</p>' : ''}
    <div class="knop-rij">
      <button class="knop" data-actie="selecteer-inhoud">Componenten selecteren</button>
      <button class="knop gevaar" data-actie="verwijder-selectie">Ruimte verwijderen</button>
    </div>`;
}

function paneelOnderlaag() {
  const ol = store.project.plan.onderlaag;
  if (!ol) return paneelProject();
  return `<div class="paneel-kop"><h2>Grondplan</h2>
      <p>${escape(ol.naam || 'ingescand plan')} · ${ol.breedte.toFixed(2)} × ${ol.hoogte.toFixed(2)} m</p></div>
    <p class="hint">Zet de breedte gelijk aan een maat die je kent op het plan, dan klopt de schaal.
      Sleep de afbeelding om ze goed te leggen en vergrendel ze daarna.</p>
    <label class="veld"><span>Breedte (m)</span>
      <input type="number" step="0.1" min="0.5" value="${ol.breedte.toFixed(2)}" data-actie="onderlaag-breedte"></label>
    <label class="veld"><span>Doorzichtigheid (${Math.round((ol.dekking ?? 0.55) * 100)} %)</span>
      <input type="range" min="10" max="100" step="5" value="${Math.round((ol.dekking ?? 0.55) * 100)}" data-actie="onderlaag-dekking"></label>
    <label class="schakel"><input type="checkbox" data-actie="onderlaag-zichtbaar" ${ol.zichtbaar !== false ? 'checked' : ''}> Tonen</label>
    <label class="schakel"><input type="checkbox" data-actie="onderlaag-vergrendeld" ${ol.vergrendeld ? 'checked' : ''}> Vergrendelen (niet verslepen)</label>
    <div class="knop-rij"><button class="knop gevaar" data-actie="onderlaag-weg">Grondplan verwijderen</button></div>`;
}

function paneelMeervoudig(sel) {
  const comps = sel.map((id) => store.component(id)).filter(Boolean);
  return `<div class="paneel-kop"><h2>${sel.length} objecten</h2><p>${comps.length} componenten geselecteerd</p></div>
    ${comps.length ? `<label class="veld"><span>Alles op kring</span>${kringKeuze('', 'bulk-kring')}</label>` : ''}
    <div class="knop-rij">
      <button class="knop" data-actie="dupliceer">Dupliceren</button>
      <button class="knop gevaar" data-actie="verwijder-selectie">Verwijderen</button>
    </div>`;
}

function paneelProject() {
  const p = store.project;
  const meldingen = controleer(p);
  const fouten = meldingen.filter((m) => m.niveau === 'fout').length;
  return `<div class="paneel-kop"><h2>Project</h2><p>Niets geselecteerd — hier staan de algemene gegevens.</p></div>
    <label class="veld"><span>Projectnaam</span><input type="text" value="${escape(p.naam || '')}" data-actie="prj-naam"></label>
    <label class="veld"><span>Klant</span><input type="text" value="${escape(p.klant || '')}" data-actie="prj-klant"></label>
    <label class="veld"><span>Adres</span><input type="text" value="${escape(p.adres || '')}" data-actie="prj-adres"></label>
    <div class="veld-rij">
      <label class="veld"><span>Aansluiting</span>
        <select data-actie="prj-fasen"><option value="1"${p.net.fasen === 1 ? ' selected' : ''}>1 fase 230 V</option>
        <option value="3"${p.net.fasen === 3 ? ' selected' : ''}>3 fasen 400 V</option></select></label>
      <label class="veld"><span>Hoofdzekering</span>
        <select data-actie="prj-hoofd">${[25, 32, 40, 50, 63, 80].map((a) => `<option value="${a}"${p.net.hoofdzekering === a ? ' selected' : ''}>${a} A</option>`).join('')}</select></label>
    </div>
    <div class="cijfers">
      <div><strong>${p.plan.ruimtes.length}</strong><span>ruimtes</span></div>
      <div><strong>${p.componenten.filter((c) => def(c.type).kringtype !== 'bouw').length}</strong><span>componenten</span></div>
      <div><strong>${p.kringen.length}</strong><span>kringen</span></div>
      <div><strong>${(totaalVermogen(p) / 1000).toFixed(1)}</strong><span>kW geschat</span></div>
    </div>
    <label class="schakel"><input type="checkbox" data-actie="ui" data-veld="kleurPerKring" ${store.ui.kleurPerKring ? 'checked' : ''}> Kleur per kring tonen</label>
    <label class="schakel"><input type="checkbox" data-actie="ui" data-veld="toonKringnummers" ${store.ui.toonKringnummers ? 'checked' : ''}> Kringnummer bij elk symbool</label>
    ${fouten ? `<p class="melding fout">${fouten} fout(en) in de controle — zie stap 3.</p>` : ''}
    <div class="knop-rij"><button class="knop" data-actie="zoom-alles">Alles in beeld</button></div>`;
}

/* ------------------------------------------------------------------ *
 * Gebeurtenissen
 * ------------------------------------------------------------------ */
function eersteSelectieComponent() {
  return store.ui.selectie.map((id) => store.component(id)).filter(Boolean);
}

export function bindPanelen() {
  for (const paneel of [links(), rechts()]) {
    paneel.addEventListener('click', klik);
    paneel.addEventListener('change', wijzig);
    paneel.addEventListener('input', invoer);
  }
}

function klik(e) {
  const knop = e.target.closest('[data-actie]');
  if (!knop) return;
  const actie = knop.dataset.actie;
  const id = knop.dataset.id;

  switch (actie) {
    case 'tool':
      store.setUI({ tool: knop.dataset.tool, bezigPolygoon: null, verbindBron: null });
      break;
    case 'plaats-type':
      store.setUI({ tool: 'plaats', plaatsType: knop.dataset.type });
      break;
    case 'selecteer':
      store.selecteer(id);
      break;
    case 'selecteer-type': {
      const ids = store.project.componenten.filter((c) => c.type === knop.dataset.type).map((c) => c.id);
      store.selecteer(ids);
      break;
    }
    case 'selecteer-inhoud': {
      const r = store.ruimte(store.ui.selectie[0]);
      if (r) store.selecteer(store.project.componenten.filter((c) => c.ruimteId === r.id).map((c) => c.id));
      break;
    }
    case 'sluit-polygoon': planvlak && planvlak.sluitPolygoon(); break;
    case 'stop-polygoon': planvlak && planvlak.stopTekenen(); break;
    case 'nieuwe-kring':
      store.commit('kring toegevoegd', (p) => { const k = maakKring(p); store.ui.actieveKring = k.id; store.ui.tool = 'kringverf'; });
      break;
    case 'verwijder-kring':
      store.commit('kring verwijderd', (p) => verwijderKring(p, id));
      if (store.ui.actieveKring === id) store.setUI({ actieveKring: null, tool: 'select' });
      break;
    case 'kies-kring': {
      if (e.target.closest('select, button[data-actie="verwijder-kring"]')) return;
      const zelfde = store.ui.actieveKring === id;
      store.setUI({ actieveKring: zelfde ? null : id, tool: zelfde ? 'select' : 'kringverf' });
      break;
    }
    case 'stop-toewijzen': store.setUI({ actieveKring: null, tool: 'select' }); break;
    case 'auto-verdeel':
      if (!store.project.componenten.length) { alert('Plaats eerst componenten in stap 2.'); return; }
      if (store.project.kringen.length && !confirm('De bestaande kringindeling wordt vervangen. Doorgaan?')) return;
      store.commit('automatisch verdeeld', (p) => { autoVerdeel(p); });
      break;
    case 'nieuw-differentieel':
      store.commit('differentieel toegevoegd', (p) => {
        p.differentiëlen.push({ id: uid('dif'), naam: 'Differentieel', gevoeligheid: 30, amp: 40, type: 'A' });
      });
      break;
    case 'verwijder-differentieel':
      store.commit('differentieel verwijderd', (p) => {
        p.differentiëlen = p.differentiëlen.filter((d) => d.id !== id);
        for (const k of p.kringen) if (k.differentieelId === id) k.differentieelId = p.differentiëlen[0]?.id || null;
      });
      break;
    case 'toon-melding': {
      const ids = (knop.dataset.ids || '').split(',').filter(Boolean);
      store.selecteer(ids);
      break;
    }
    case 'onderlaag-weg':
      if (!confirm('Het ingescande grondplan verwijderen?')) return;
      store.commit('grondplan verwijderd', (p) => { p.plan.onderlaag = null; });
      store.selecteer([]);
      break;
    case 'verwijder-selectie': verwijderSelectie(); break;
    case 'dupliceer': dupliceerSelectie(); break;
    case 'verwijder-verbinding':
      store.commit('verbinding verwijderd', (p) => { p.verbindingen = p.verbindingen.filter((v) => v.id !== id); });
      break;
    case 'zoom-alles': planvlak && planvlak.zoomNaarAlles(); break;
    default: break;
  }
}

function invoer(e) {
  const veld = e.target.closest('[data-actie]');
  if (!veld) return;
  const actie = veld.dataset.actie;
  const waarde = veld.value;

  if (actie === 'zoek') { store.setUI({ zoek: waarde }); return; }
  if (actie === 'onderlaag-dekking') {
    const ol = store.project.plan.onderlaag;
    if (ol) { ol.dekking = Number(waarde) / 100; store.bewaar(); store.emit('project-licht'); }
    return;
  }
  if (actie === 'comp-rot') {
    const comps = eersteSelectieComponent();
    for (const c of comps) c.rot = Number(waarde);
    store.bewaar();
    store.emit('project-licht');
    return;
  }
  const tekstVelden = {
    'comp-label': (c) => { c.label = waarde; },
    'comp-opmerking': (c) => { c.opmerking = waarde; },
  };
  if (tekstVelden[actie]) {
    for (const c of eersteSelectieComponent()) tekstVelden[actie](c);
    store.bewaar();
    return;
  }
  if (actie === 'ruimte-naam') {
    const r = store.ruimte(store.ui.selectie[0]);
    if (r) { r.naam = waarde; store.bewaar(); store.emit('project-licht'); }
    return;
  }
  if (actie === 'kring-naam') {
    const k = store.kring(veld.dataset.id);
    if (k) { k.naam = waarde; store.bewaar(); }
    return;
  }
  if (actie === 'dif-naam') {
    const d = store.differentieel(veld.dataset.id);
    if (d) { d.naam = waarde; store.bewaar(); }
    return;
  }
  if (actie === 'prj-naam') { store.project.naam = waarde; store.bewaar(); document.title = waarde + ' — Elek'; return; }
  if (actie === 'prj-klant') { store.project.klant = waarde; store.bewaar(); return; }
  if (actie === 'prj-adres') { store.project.adres = waarde; store.bewaar(); return; }
}

function wijzig(e) {
  const veld = e.target.closest('[data-actie]');
  if (!veld) return;
  const actie = veld.dataset.actie;
  const waarde = veld.value;
  const id = veld.dataset.id;
  const comps = eersteSelectieComponent();

  switch (actie) {
    case 'ui':
      store.setUI({ [veld.dataset.veld]: veld.checked });
      break;
    case 'nieuwe-ruimte-type':
      store.setUI({ nieuweRuimteType: waarde });
      break;
    case 'raster':
      store.commit('raster gewijzigd', (p) => { p.plan.raster = Number(waarde); });
      break;
    case 'comp-kring':
      store.commit('kring toegewezen', () => { for (const c of comps) c.kringId = waarde || null; });
      break;
    case 'bulk-kring':
      store.commit('kringen toegewezen', () => { for (const c of comps) c.kringId = waarde || null; });
      break;
    case 'comp-type':
      store.commit('type gewijzigd', () => {
        for (const c of comps) {
          c.type = waarde;
          const d = def(waarde);
          c.hoogte = d.hoogte ?? null;
          c.watt = d.watt ?? null;
        }
      });
      break;
    case 'comp-breedte':
      store.commit('breedte gewijzigd', () => { for (const c of comps) c.breedte = Number(waarde); });
      break;
    case 'comp-diepte':
      store.commit('diepte gewijzigd', () => { for (const c of comps) c.diepte = Number(waarde); });
      break;
    case 'comp-hoogte':
      store.commit('hoogte gewijzigd', () => { for (const c of comps) c.hoogte = waarde === '' ? null : Number(waarde); });
      break;
    case 'comp-watt':
      store.commit('vermogen gewijzigd', () => { for (const c of comps) c.watt = waarde === '' ? null : Number(waarde); });
      break;
    case 'ruimte-type':
      store.commit('ruimtetype gewijzigd', () => {
        const r = store.ruimte(store.ui.selectie[0]);
        if (r) { r.type = waarde; r.kleur = ruimteDef(waarde).kleur; if (!r.naam) r.naam = ruimteDef(waarde).naam; }
      });
      break;
    case 'ruimte-breedte':
    case 'ruimte-diepte': {
      const nieuw = Number(waarde);
      if (!(nieuw > 0.2)) break;
      store.commit('afmeting gewijzigd', () => {
        const r = store.ruimte(store.ui.selectie[0]);
        if (!r) return;
        const box = omhullende(r.punten);
        const breed = actie === 'ruimte-breedte';
        const factor = breed ? (box.w ? nieuw / box.w : 1) : (box.h ? nieuw / box.h : 1);
        const comps = store.project.componenten.filter((c) => c.ruimteId === r.id);
        const schaal = (p) => (breed
          ? { x: +(box.x1 + (p.x - box.x1) * factor).toFixed(3), y: p.y }
          : { x: p.x, y: +(box.y1 + (p.y - box.y1) * factor).toFixed(3) });
        r.punten = r.punten.map(schaal);
        for (const c of comps) {
          const p = schaal({ x: c.x, y: c.y });
          c.x = p.x; c.y = p.y;
        }
      });
      break;
    }
    case 'onderlaag-breedte': {
      const nieuw = Number(waarde);
      if (!(nieuw > 0.2)) break;
      store.commit('schaal grondplan', (p) => {
        const ol = p.plan.onderlaag;
        if (!ol) return;
        const verhouding = ol.hoogte / ol.breedte;
        ol.breedte = nieuw;
        ol.hoogte = +(nieuw * verhouding).toFixed(3);
      });
      break;
    }
    case 'onderlaag-zichtbaar':
      store.commit('grondplan getoond', (p) => { if (p.plan.onderlaag) p.plan.onderlaag.zichtbaar = veld.checked; });
      break;
    case 'onderlaag-vergrendeld':
      store.commit('grondplan vergrendeld', (p) => { if (p.plan.onderlaag) p.plan.onderlaag.vergrendeld = veld.checked; });
      break;
    case 'ruimte-kleur':
      store.commit('kleur gewijzigd', () => { const r = store.ruimte(store.ui.selectie[0]); if (r) r.kleur = waarde; });
      break;
    case 'ruimte-muurdikte':
      store.commit('muurdikte gewijzigd', () => { const r = store.ruimte(store.ui.selectie[0]); if (r) r.muurdikte = Number(waarde); });
      break;
    case 'dif-gevoelig':
      store.commit('differentieel gewijzigd', () => { const d = store.differentieel(id); if (d) d.gevoeligheid = Number(waarde); });
      break;
    case 'dif-amp':
      store.commit('differentieel gewijzigd', () => { const d = store.differentieel(id); if (d) d.amp = Number(waarde); });
      break;
    case 'prj-fasen':
      store.commit('aansluiting gewijzigd', (p) => { p.net.fasen = Number(waarde); p.net.spanning = Number(waarde) === 3 ? 400 : 230; });
      break;
    case 'prj-hoofd':
      store.commit('hoofdzekering gewijzigd', (p) => { p.net.hoofdzekering = Number(waarde); });
      break;
    case 'kring-amp':
      store.commit('automaat gewijzigd', () => {
        const k = store.kring(id);
        if (k) { k.amp = Number(waarde); if (minSectieVoor(k.amp) > k.mm2) k.mm2 = minSectieVoor(k.amp); }
      });
      break;
    case 'kring-mm2':
      store.commit('sectie gewijzigd', () => { const k = store.kring(id); if (k) k.mm2 = Number(waarde); });
      break;
    case 'kring-type':
      store.commit('kringtype gewijzigd', () => {
        const k = store.kring(id);
        if (!k) return;
        k.type = waarde;
        const sj = KRINGSJABLOON[waarde];
        if (sj) { k.amp = sj.amp; k.mm2 = sj.mm2; }
      });
      break;
    case 'kring-dif':
      store.commit('differentieel gekozen', () => { const k = store.kring(id); if (k) k.differentieelId = waarde || null; });
      break;
    default: break;
  }
}

export function verwijderSelectie() {
  const ids = new Set(store.ui.selectie);
  if (!ids.size) return;
  store.commit('verwijderd', (p) => {
    p.componenten = p.componenten.filter((c) => !ids.has(c.id));
    p.plan.ruimtes = p.plan.ruimtes.filter((r) => !ids.has(r.id));
    p.plan.muren = p.plan.muren.filter((m) => !ids.has(m.id));
    p.verbindingen = p.verbindingen.filter((v) => !ids.has(v.van) && !ids.has(v.naar));
  });
  store.selecteer([]);
}

export function dupliceerSelectie() {
  const comps = eersteSelectieComponent();
  if (!comps.length) return;
  const nieuweIds = [];
  store.commit('gedupliceerd', (p) => {
    for (const c of comps) {
      const kopie = { ...c, id: uid('cmp'), x: c.x + 0.3, y: c.y + 0.3 };
      p.componenten.push(kopie);
      nieuweIds.push(kopie.id);
    }
  });
  store.selecteer(nieuweIds);
}
