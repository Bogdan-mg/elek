// Opstart, werkbalk, sneltoetsen en samenspel tussen plan, panelen en bord.

import store from './store.js';
import { PlanCanvas } from './canvas.js';
import { tekenLinks, tekenRechts, bindPanelen, koppelCanvas, verwijderSelectie, dupliceerSelectie } from './panels.js';
import { bouwBordSVG, bouwBordTabel } from './board.js';
import {
  exporteerProject, importeerProject, exporteerPNG, exporteerSVG,
  exporteerBordPNG, exporteerBordSVG, drukAf, drukAfLegende, importeerOnderlaag,
} from './exporters.js';
import { nieuwProject, uid, def, CATALOG, GROEPEN } from './model.js';
import { symboolIcoon } from './symbols.js';
import { autoVerdeel } from './circuits.js';

const $ = (sel) => document.querySelector(sel);
let canvas;

function start() {
  canvas = new PlanCanvas($('#plan'));
  koppelCanvas(canvas);
  bindPanelen();
  bindWerkbalk();
  bindToetsen();

  canvas.onAanwijzer = werkHudBij;

  store.on((reden) => {
    canvas.plan();
    werkHudBij();
    if (reden === 'project-licht') return;
    tekenLinks();
    tekenRechts();
    tekenNiveaus();
    if (store.ui.weergave === 'bord') tekenBord();
    werkbalkBij();
  });

  document.addEventListener('elek:bewerk', () => {
    document.body.classList.add('rechts-open');
  });

  tekenLinks();
  tekenRechts();
  tekenNiveaus();
  werkbalkBij();
  canvas.zoomNaarAlles();
  document.title = (store.project.naam || 'Elek') + ' — Elek';
  if (!store.project.plan.ruimtes.length && !store.project.componenten.length) toonWelkom();
  registreerServiceWorker();
}

/* ------------------------------------------------------------------ *
 * Werkbalk
 * ------------------------------------------------------------------ */
function bindWerkbalk() {
  document.body.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-app]');
    if (!knop) return;
    const actie = knop.dataset.app;
    switch (actie) {
      case 'stap':
        zetStap(Number(knop.dataset.stap));
        break;
      case 'weergave':
        zetWeergave(knop.dataset.weergave);
        break;
      case 'undo': store.undo(); break;
      case 'redo': store.redo(); break;
      case 'zoom-in': canvas.zoomNaar(1.25); break;
      case 'zoom-uit': canvas.zoomNaar(0.8); break;
      case 'zoom-alles': canvas.zoomNaarAlles(); break;
      case 'nieuw':
        if (confirm('Nieuw project starten? Het huidige project wordt uit dit venster gewist (exporteer het eerst als je het wil bewaren).')) {
          store.vervangProject(nieuwProject('Nieuw project'), 'nieuw project');
          canvas.zoomNaarAlles();
        }
        break;
      case 'open': $('#bestand-invoer').click(); break;
      case 'bewaar': exporteerProject(); break;
      case 'png': exporteerPNG(canvas); break;
      case 'svg': exporteerSVG(canvas); break;
      case 'bord-png': exporteerBordPNG(); break;
      case 'bord-svg': exporteerBordSVG(); break;
      case 'print': drukAf(canvas); break;
      case 'menu': document.body.classList.toggle('menu-open'); break;
      case 'links': document.body.classList.toggle('links-open'); break;
      case 'rechts': document.body.classList.toggle('rechts-open'); break;
      case 'sluit-paneel':
        document.body.classList.remove('links-open', 'rechts-open', 'menu-open');
        break;
      case 'niveau':
        store.zetNiveau(knop.dataset.id);
        canvas.zoomNaarAlles();
        break;
      case 'niveau-nieuw': nieuwNiveau(); break;
      case 'onderlaag': $('#onderlaag-invoer').click(); break;
      case 'voorbeeld': laadVoorbeeld(); break;
      case 'bord-passend':
        $('#bord-schema').classList.add('passend');
        try { localStorage.setItem('elek.bordPassend', '1'); } catch (e) { /* geen opslag */ }
        break;
      case 'bord-100':
        $('#bord-schema').classList.remove('passend');
        try { localStorage.setItem('elek.bordPassend', '0'); } catch (e) { /* geen opslag */ }
        break;
      case 'legende':
        $('#legende-inhoud').innerHTML = bouwLegende();
        $('#legende').showModal();
        break;
      case 'sluit-legende': $('#legende').close(); break;
      case 'print-legende': drukAfLegende(); break;
      case 'sluit-welkom': $('#welkom').close(); break;
      case 'help': $('#help').showModal(); break;
      case 'sluit-help': $('#help').close(); break;
      default: break;
    }
    if (knop.dataset.app !== 'menu') document.body.classList.remove('menu-open');
  });

  $('#onderlaag-invoer').addEventListener('change', async (e) => {
    const bestand = e.target.files[0];
    if (!bestand) return;
    try {
      await importeerOnderlaag(bestand);
      zetStap(1);
      canvas.zoomNaarAlles();
    } catch (err) {
      alert('Deze afbeelding kon niet geladen worden: ' + err.message);
    }
    e.target.value = '';
  });

  $('#bestand-invoer').addEventListener('change', async (e) => {
    const bestand = e.target.files[0];
    if (!bestand) return;
    try {
      await importeerProject(bestand);
      canvas.zoomNaarAlles();
    } catch (err) {
      alert('Dit bestand kon niet gelezen worden: ' + err.message);
    }
    e.target.value = '';
  });
}

function zetStap(stap) {
  const patch = { stap, tool: 'select', bezigPolygoon: null, verbindBron: null };
  if (stap !== 3) patch.actieveKring = null;
  if (stap === 1) patch.tool = 'select';
  store.setUI(patch);
  if (store.ui.weergave === 'bord' && stap !== 3) zetWeergave('plan');
  tekenLinks();
  tekenRechts();
  werkbalkBij();
  canvas.render();
}

/** Voegt een verdieping toe, eventueel met de ruimtes van het huidige niveau. */
function nieuwNiveau() {
  const niveaus = store.project.plan.niveaus;
  const voorstel = niveaus.length === 1 ? '1e verdieping' : `${niveaus.length}e verdieping`;
  const naam = prompt('Naam van de verdieping:', voorstel);
  if (naam === null) return;
  const kopieer = store.ruimtesVanNiveau().length > 0 &&
    confirm('De ruimtes van dit niveau meenemen als vertrekpunt?\n(De componenten komen niet mee.)');
  let nieuwId = null;
  store.commit('verdieping toegevoegd', (p) => {
    const niveau = { id: uid('niv'), naam: naam.trim() || voorstel, onderlaag: null };
    p.plan.niveaus.push(niveau);
    nieuwId = niveau.id;
    if (kopieer) {
      const bron = store.niveau;
      for (const r of p.plan.ruimtes.filter((x) => x.niveauId === bron.id)) {
        p.plan.ruimtes.push({ ...r, id: uid('rmt'), niveauId: niveau.id, punten: r.punten.map((pt) => ({ ...pt })) });
      }
      for (const m of p.plan.muren.filter((x) => x.niveauId === bron.id)) {
        p.plan.muren.push({ ...m, id: uid('mur'), niveauId: niveau.id, a: { ...m.a }, b: { ...m.b } });
      }
      for (const c of p.componenten.filter((x) => x.niveauId === bron.id && def(x.type).kringtype === 'bouw')) {
        p.componenten.push({ ...c, id: uid('cmp'), niveauId: niveau.id, ruimteId: null, kringId: null });
      }
    }
  });
  if (nieuwId) {
    store.zetNiveau(nieuwId);
    if (kopieer) canvas.herberekenRuimtes();
    canvas.zoomNaarAlles();
  }
}

function zetWeergave(weergave) {
  store.ui.weergave = weergave;
  $('#werkvlak').classList.toggle('toon-bord', weergave === 'bord');
  $('#niveaubalk').hidden = weergave === 'bord';
  if (weergave === 'bord') tekenBord();
  werkbalkBij();
  canvas.render();
}

function werkbalkBij() {
  for (const knop of document.querySelectorAll('[data-app="stap"]')) {
    knop.classList.toggle('actief', Number(knop.dataset.stap) === store.ui.stap);
  }
  for (const knop of document.querySelectorAll('[data-app="weergave"]')) {
    knop.classList.toggle('actief', knop.dataset.weergave === store.ui.weergave);
  }
  $('[data-app="undo"]').disabled = !store.kanUndo();
  $('[data-app="redo"]').disabled = !store.kanRedo();
  $('#projectnaam').textContent = store.project.naam || 'Zonder naam';
}

/** Toont lengte, hoek en de ingetypte maat tijdens het tekenen. */
function werkHudBij() {
  const hud = $('#teken-hud');
  if (!hud) return;
  const ui = store.ui;
  const punt = canvas.aanwijzer;
  const invoer = ui.lengteInvoer || '';
  let vorig = null;
  let soort = null;
  if (ui.tool === 'polygoon' && ui.bezigPolygoon && ui.bezigPolygoon.length) {
    vorig = ui.bezigPolygoon[ui.bezigPolygoon.length - 1];
    soort = 'vorm';
  } else if (ui.tool === 'muur' && ui.bezigMuur) {
    vorig = ui.bezigMuur;
    soort = 'muur';
  } else if (ui.tool === 'rechthoek' && ui.bezigRechthoek) {
    vorig = ui.bezigRechthoek;
    soort = 'rechthoek';
  }
  if (!soort) {
    if (['polygoon', 'muur', 'rechthoek'].includes(ui.tool)) {
      hud.hidden = false;
      hud.innerHTML = '<span class="hud-tip">Klik het eerste punt. Richtingen springen op 45°, houd Alt voor vrij tekenen.</span>';
    } else {
      hud.hidden = true;
    }
    return;
  }
  hud.hidden = false;
  let maat = '—';
  if (punt) {
    if (soort === 'rechthoek') {
      maat = `${Math.abs(punt.x - vorig.x).toFixed(2)} × ${Math.abs(punt.y - vorig.y).toFixed(2)} m`;
    } else {
      maat = `${canvas.maatVan(vorig, punt).toFixed(2)} m · ${canvas.hoekVan(vorig, punt)}°`;
    }
  }
  const tip = soort === 'vorm'
    ? 'Enter sluit de vorm · Backspace neemt een punt terug'
    : 'Klik het tweede punt · Backspace annuleert';
  hud.innerHTML = `<b>${maat}</b>` +
    (invoer ? `<span class="hud-invoer">${invoer} m → Enter</span>` : '<span class="hud-tip">typ een lengte + Enter</span>') +
    `<span class="hud-tip">${tip}</span>`;
}

/** Balkje met de verdiepingen boven het plan. */
function tekenNiveaus() {
  const balk = $('#niveaubalk');
  if (!balk) return;
  const niveaus = store.project.plan.niveaus;
  const actief = store.niveau;
  balk.innerHTML = niveaus
    .map((n) => `<button data-app="niveau" data-id="${n.id}" class="${n.id === (actief && actief.id) ? 'actief' : ''}">${n.naam}</button>`)
    .join('') + '<button class="toevoegen" data-app="niveau-nieuw" title="Verdieping toevoegen">+</button>';
  balk.hidden = store.ui.weergave === 'bord';
}

function tekenBord() {
  const vlak = $('#bord-schema');
  vlak.innerHTML = bouwBordSVG(store.project);
  let passend = true;
  try { passend = localStorage.getItem('elek.bordPassend') !== '0'; } catch (e) { /* geen opslag */ }
  vlak.classList.toggle('passend', passend);
  $('#bord-lijst').innerHTML = bouwBordTabel(store.project);
}

/* ------------------------------------------------------------------ *
 * Sneltoetsen
 * ------------------------------------------------------------------ */
function bindToetsen() {
  window.addEventListener('keydown', (e) => {
    const inVeld = e.target.matches('input, textarea, select');
    const meta = e.ctrlKey || e.metaKey;

    if (meta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? store.redo() : store.undo();
      return;
    }
    if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); exporteerProject(); return; }
    if (meta && e.key.toLowerCase() === 'p') { e.preventDefault(); drukAf(canvas); return; }
    if (meta && e.key.toLowerCase() === 'd') { e.preventDefault(); dupliceerSelectie(); return; }
    if (inVeld) return;

    // Tijdens het tekenen: exacte lengte intypen
    const bezig = store.ui.bezigPolygoon || store.ui.bezigMuur || store.ui.bezigRechthoek;
    if (bezig) {
      if (/^[0-9]$/.test(e.key) || e.key === '.' || e.key === ',') {
        e.preventDefault();
        store.setUI({ lengteInvoer: (store.ui.lengteInvoer || '') + e.key.replace(',', '.') });
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (store.ui.lengteInvoer) store.setUI({ lengteInvoer: store.ui.lengteInvoer.slice(0, -1) });
        else canvas.verwijderLaatstePunt();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const lengte = parseFloat(store.ui.lengteInvoer);
        if (lengte > 0) canvas.plaatsOpLengte(lengte);
        else if (store.ui.bezigPolygoon) canvas.sluitPolygoon();
        return;
      }
    }

    switch (e.key) {
      case 'Escape':
        canvas.stopTekenen();
        store.setUI({ tool: 'select', verbindBron: null, actieveKring: null });
        store.selecteer([]);
        document.body.classList.remove('links-open', 'rechts-open', 'menu-open');
        break;
      case 'Delete': case 'Backspace':
        e.preventDefault(); verwijderSelectie(); break;
      case 'Enter':
        if (store.ui.bezigPolygoon) canvas.sluitPolygoon();
        break;
      case '1': zetStap(1); break;
      case '2': zetStap(2); break;
      case '3': zetStap(3); break;
      case 'r': case 'R': draaiSelectie(e.shiftKey ? -45 : 45); break;
      case '+': case '=': canvas.zoomNaar(1.25); break;
      case '-': canvas.zoomNaar(0.8); break;
      case '0': canvas.zoomNaarAlles(); break;
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
        const comps = store.ui.selectie.map((id) => store.component(id)).filter(Boolean);
        if (!comps.length) return;
        e.preventDefault();
        const stap = e.shiftKey ? store.project.plan.raster * 4 : store.project.plan.raster;
        const dx = e.key === 'ArrowLeft' ? -stap : e.key === 'ArrowRight' ? stap : 0;
        const dy = e.key === 'ArrowUp' ? -stap : e.key === 'ArrowDown' ? stap : 0;
        store.commit('verplaatst', () => {
          for (const c of comps) { c.x = +(c.x + dx).toFixed(3); c.y = +(c.y + dy).toFixed(3); }
          canvas.herberekenRuimtes();
        });
        break;
      }
      default: break;
    }
  });
}

function draaiSelectie(hoek) {
  const comps = store.ui.selectie.map((id) => store.component(id)).filter(Boolean);
  if (!comps.length) return;
  store.commit('gedraaid', () => {
    for (const c of comps) c.rot = ((c.rot || 0) + hoek + 360) % 360;
  });
}

/* ------------------------------------------------------------------ *
 * Voorbeeldproject
 * ------------------------------------------------------------------ */
function toonWelkom() {
  const dlg = $('#welkom');
  if (dlg && !dlg.open) dlg.showModal();
}

const VOORBEELD_RUIMTES = [
  { naam: 'Living', type: 'living', box: [0, 0, 5, 4.5] },
  { naam: 'Keuken', type: 'keuken', box: [5, 0, 9, 4.5] },
  { naam: 'Hal', type: 'hal', box: [0, 4.5, 3, 7] },
  { naam: 'Badkamer', type: 'badkamer', box: [3, 4.5, 5.5, 7] },
  { naam: 'Slaapkamer', type: 'slaapkamer', box: [5.5, 4.5, 9, 7] },
];

const VOORBEELD_COMPONENTEN = [
  ['lichtpunt', 2.5, 2.2], ['lichtpunt', 7, 2.2], ['lichtpunt', 1.5, 5.7],
  ['lichtpunt', 4.2, 5.7], ['lichtpunt', 7.2, 5.7],
  ['schak2', 0.2, 4.2], ['wissel', 4.8, 4.2], ['schak1', 5.2, 4.2],
  ['schak1', 3.2, 4.7], ['schak1', 5.7, 4.7],
  ['sc2', 1.2, 0.05], ['sc2', 3.6, 0.05], ['sc2', 0.05, 2.5], ['sc2', 4.95, 1.4],
  ['scwerkblad', 6.2, 0.05], ['scwerkblad', 7.6, 0.05],
  ['sc2', 6.2, 4.45], ['sc2', 8.4, 5.2], ['sc2', 5.6, 6.5],
  ['scwd', 3.2, 6.9], ['sc2', 0.05, 6],
  ['kookplaat', 6.8, 0.05], ['oven', 8.6, 0.6], ['vaatwas', 5.4, 0.05],
  ['wasmachine', 5.05, 6.4], ['boiler', 4.2, 6.9],
  ['koelkast', 8.95, 2.2], ['dampkap', 6.8, 0.4],
  ['utp', 4.2, 0.05], ['coax', 4.6, 0.05], ['rookmelder', 1.2, 5.2],
  ['verdeelbord', 0.05, 5.4], ['teller', 0.05, 4.9],
];

// Deuren, ramen en trap van de voorbeeldwoning
const VOORBEELD_BOUW = [
  ['deur', 1.5, 7], ['deur', 1.2, 4.5], ['deur', 3, 5.8], ['deur', 7.5, 4.5],
  ['doorgang', 5, 2.2],
  ['raam', 2.4, 0], ['raam', 8.3, 0], ['raam', 7.2, 7], ['raam', 4.8, 7],
  ['terrasdeur', 0, 3.4],
  ['trap', 2.45, 5.75],
];

function laadVoorbeeld() {
  const p = nieuwProject('Voorbeeldwoning');
  for (const r of VOORBEELD_RUIMTES) {
    const [x1, y1, x2, y2] = r.box;
    p.plan.ruimtes.push({
      id: uid('rmt'), naam: r.naam, type: r.type,
      punten: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
      kleur: null, muurdikte: 0.09, niveauId: p.plan.niveaus[0].id,
    });
  }
  store.vervangProject(p, 'voorbeeld geladen');

  // Componenten plaatsen met muur-snap en ruimtetoewijzing
  store.commit('voorbeeld ingevuld', (prj) => {
    for (const [type, x, y] of [...VOORBEELD_BOUW, ...VOORBEELD_COMPONENTEN]) {
      const d = def(type);
      const pos = canvas.plaatsPositie({ x, y }, type);
      const ruimte = canvas.ruimteOp({ x: pos.x, y: pos.y }) || canvas.dichtstbijzijndeRuimte({ x: pos.x, y: pos.y });
      prj.componenten.push({
        id: uid('cmp'), type, x: pos.x, y: pos.y, rot: pos.rot, label: '',
        ruimteId: ruimte ? ruimte.id : null, kringId: null,
        niveauId: prj.plan.niveaus[0].id,
        hoogte: d.hoogte ?? null, watt: d.watt ?? null,
        breedte: type === 'trap' ? 0.85 : (d.breedte ?? null), diepte: type === 'trap' ? 2.2 : (d.diepte ?? null),
        opmerking: '',
      });
    }
    autoVerdeel(prj);
  });

  const dlg = $('#welkom');
  if (dlg && dlg.open) dlg.close();
  zetStap(1);
  canvas.zoomNaarAlles();
}

/* ------------------------------------------------------------------ *
 * Symbolenlegende
 * ------------------------------------------------------------------ */
export function bouwLegende() {
  let h = '';
  for (const groep of GROEPEN) {
    const items = CATALOG.filter((c) => c.groep === groep);
    if (!items.length) continue;
    h += `<h3>${groep}</h3><div class="legende-groep">`;
    for (const c of items) {
      h += `<div class="legende-item"><span class="sym">${symboolIcoon(c.key, 40)}</span><span>${c.naam}</span></div>`;
    }
    h += '</div>';
  }
  return h;
}

/* ------------------------------------------------------------------ *
 * PWA
 * ------------------------------------------------------------------ */
function registreerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker:', e));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
