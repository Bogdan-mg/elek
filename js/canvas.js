// Tekenlaag van het situatieschema: ruimtes, muren, componenten en
// alle muis-, pen- en touchbediening (pan, pinch-zoom, slepen, tekenen).

import store from './store.js';
import { def, uid, ruimteDef } from './model.js';
import { symbool } from './symbols.js';
import {
  snapPunt, puntInPolygoon, oppervlakte, zwaartepunt, omhullende,
  projecteerOpSegment, segmenten, rechthoek, orthogonaal, afstand,
} from './geometry.js';

const SYMBOOL_M = 0.36;     // tekengrootte van een symbool in meter
const WAND_SNAP = 0.5;      // afstand waarbinnen naar een muur wordt geklikt

export class PlanCanvas {
  constructor(svg) {
    this.svg = svg;
    this.view = { cx: 5, cy: 4, zoom: 60 };   // midden in meter, zoom in px/meter
    this.actie = null;
    this.aanwijzer = null;       // gemagnetiseerd punt onder de cursor
    this.onAanwijzer = null;     // terugroep voor de maatweergave
    this.pointers = new Map();
    this.pinch = null;
    this._rafId = 0;
    this._bind();
    new ResizeObserver(() => this.render()).observe(svg.parentElement);
  }

  /* ---------------------------------------------------------------- *
   * Coördinaten
   * ---------------------------------------------------------------- */
  get maat() { return { w: this.svg.clientWidth || 800, h: this.svg.clientHeight || 600 }; }

  get viewBox() {
    const { w, h } = this.maat;
    const vw = w / this.view.zoom;
    const vh = h / this.view.zoom;
    return { x: this.view.cx - vw / 2, y: this.view.cy - vh / 2, w: vw, h: vh };
  }

  wereldPunt(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  zoomNaar(factor, ankerScherm) {
    const voor = ankerScherm ? this.wereldPunt(ankerScherm) : { x: this.view.cx, y: this.view.cy };
    this.view.zoom = Math.max(6, Math.min(600, this.view.zoom * factor));
    this.render();
    if (ankerScherm) {
      const na = this.wereldPunt(ankerScherm);
      this.view.cx += voor.x - na.x;
      this.view.cy += voor.y - na.y;
      this.render();
    }
  }

  zoomNaarAlles() {
    const punten = [];
    for (const r of store.project.plan.ruimtes) punten.push(...r.punten);
    for (const m of store.project.plan.muren) punten.push(m.a, m.b);
    for (const c of store.project.componenten) punten.push({ x: c.x, y: c.y });
    const box = omhullende(punten);
    const { w, h } = this.maat;
    if (!box || (box.w < 0.01 && box.h < 0.01)) {
      this.view = { cx: 5, cy: 4, zoom: 60 };
    } else {
      const marge = 1.2;
      this.view.cx = (box.x1 + box.x2) / 2;
      this.view.cy = (box.y1 + box.y2) / 2;
      this.view.zoom = Math.min(w / (box.w + marge), h / (box.h + marge));
      this.view.zoom = Math.max(8, Math.min(200, this.view.zoom));
    }
    this.render();
  }

  /* ---------------------------------------------------------------- *
   * Tekenen
   * ---------------------------------------------------------------- */
  plan() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => { this._rafId = 0; this.render(); });
  }

  render() {
    const vb = this.viewBox;
    this.svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    this.svg.innerHTML = this.bouw({ vb });
  }

  /** Bouwt de volledige SVG-inhoud. */
  bouw({ vb, voorExport = false } = {}) {
    const p = store.project;
    const ui = store.ui;
    const z = this.view.zoom;
    const lijn = voorExport ? 0.018 : Math.max(0.012, 1.3 / z);
    const symM = voorExport ? SYMBOOL_M : Math.max(SYMBOOL_M, 13 / z);

    let s = this.defs(lijn, voorExport ? null : vb);
    if (!voorExport && ui.toonRaster) {
      s += `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#raster)"/>`;
    }

    // Ingescand grondplan als onderlaag
    const ol = p.plan.onderlaag;
    if (ol && ol.data && ol.zichtbaar !== false) {
      const gesel = !voorExport && store.isGeselecteerd('onderlaag');
      s += `<image href="${ol.data}" x="${ol.x}" y="${ol.y}" width="${ol.breedte}" height="${ol.hoogte}" ` +
        `opacity="${ol.dekking ?? 0.55}" preserveAspectRatio="none"${ol.vergrendeld ? '' : ' data-kind="onderlaag" data-id="onderlaag"'}/>`;
      if (gesel) {
        s += `<rect x="${ol.x}" y="${ol.y}" width="${ol.breedte}" height="${ol.hoogte}" fill="none" ` +
          `stroke="var(--accent)" stroke-width="${lijn * 2}" stroke-dasharray="${lijn * 5} ${lijn * 4}"/>`;
      }
    }

    // Ruimtes
    s += '<g class="laag-ruimtes">';
    for (const r of p.plan.ruimtes) s += this.ruimteSVG(r, lijn, voorExport);
    s += '</g>';

    // Losse muren
    s += '<g class="laag-muren">';
    for (const m of p.plan.muren) {
      const gesel = !voorExport && store.isGeselecteerd(m.id);
      s += `<line data-kind="muur" data-id="${m.id}" x1="${m.a.x}" y1="${m.a.y}" x2="${m.b.x}" y2="${m.b.y}" ` +
        `stroke="${gesel ? 'var(--accent)' : 'var(--muur)'}" stroke-width="${(m.dikte || 0.1)}" stroke-linecap="square"/>`;
    }
    s += '</g>';

    // Verbindingen schakelaar → verbruiker
    if (ui.stap >= 2 || voorExport) {
      s += '<g class="laag-verbindingen">';
      for (const v of p.verbindingen) {
        const a = p.componenten.find((c) => c.id === v.van);
        const b = p.componenten.find((c) => c.id === v.naar);
        if (!a || !b) continue;
        const mx = (a.x + b.x) / 2;
        const my = Math.min(a.y, b.y) - afstand(a, b) * 0.18;
        s += `<path d="M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}" fill="none" stroke="var(--verbinding)" ` +
          `stroke-width="${lijn}" stroke-dasharray="${lijn * 5} ${lijn * 4}"/>`;
      }
      s += '</g>';
    }

    // Bouwkundige elementen eerst (ze snijden de muur weg), dan de symbolen
    s += '<g class="laag-bouw">';
    for (const c of p.componenten) if (def(c.type).kringtype === 'bouw') s += this.componentSVG(c, symM, lijn, voorExport);
    s += '</g>';
    s += '<g class="laag-componenten">';
    for (const c of p.componenten) if (def(c.type).kringtype !== 'bouw') s += this.componentSVG(c, symM, lijn, voorExport);
    s += '</g>';

    if (!voorExport) s += this.overlay(lijn, symM);
    return s;
  }

  defs(lijn, vb) {
    const fijn = lijn * 0.6;
    return `<defs>
      <pattern id="raster" width="1" height="1" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill="none"/>
        <path d="M 1 0 L 0 0 0 1" fill="none" stroke="var(--raster-groot)" stroke-width="${fijn}"/>
        <path d="M 0.25 0 L 0.25 1 M 0.5 0 L 0.5 1 M 0.75 0 L 0.75 1 M 0 0.25 L 1 0.25 M 0 0.5 L 1 0.5 M 0 0.75 L 1 0.75"
              fill="none" stroke="var(--raster-fijn)" stroke-width="${fijn * 0.6}"/>
      </pattern>
    </defs>`;
  }

  ruimteSVG(r, lijn, voorExport) {
    const gesel = !voorExport && store.isGeselecteerd(r.id);
    const d = ruimteDef(r.type);
    const punten = r.punten.map((p) => `${p.x},${p.y}`).join(' ');
    const mid = zwaartepunt(r.punten);
    const box = omhullende(r.punten);
    const opp = oppervlakte(r.punten);
    // Naam iets onder het midden: het plafondlichtpunt staat meestal in het midden.
    const naamY = mid.y + Math.min(box.h * 0.22, 0.9);
    const dikte = r.muurdikte || 0.09;
    let s = `<polygon data-kind="ruimte" data-id="${r.id}" points="${punten}" ` +
      `fill="${r.kleur || d.kleur}" fill-opacity="0.85" stroke="${gesel ? 'var(--accent)' : 'var(--muur)'}" ` +
      `stroke-width="${gesel ? lijn * 3 : dikte}" stroke-linejoin="miter"/>`;
    if (!gesel && dikte > lijn * 3) {
      // binnenkant van de muur lichter, zodat de muur als band leest
      s += `<polygon points="${punten}" fill="none" stroke="var(--muur-vulling)" ` +
        `stroke-width="${dikte - lijn * 2}" stroke-linejoin="miter" style="pointer-events:none"/>`;
    }
    if (store.ui.toonAlleMaten && !gesel) {
      for (const [p1, p2] of segmenten(r.punten)) s += this.maatLabel(p1, p2, 'var(--tekst-plan-zacht)');
    }
    if (store.ui.toonLabels || voorExport) {
      const naam = r.naam || d.naam;
      const h = Math.max(0.22, 13 / this.view.zoom);
      s += `<text x="${mid.x}" y="${naamY}" text-anchor="middle" font-size="${h}" fill="var(--tekst-plan)" ` +
        `font-family="system-ui, sans-serif" font-weight="600" style="pointer-events:none">${escape(naam)}</text>`;
      if (store.ui.toonMaten || voorExport) {
        s += `<text x="${mid.x}" y="${naamY + h * 1.25}" text-anchor="middle" font-size="${h * 0.8}" ` +
          `fill="var(--tekst-plan-zacht)" font-family="system-ui, sans-serif" style="pointer-events:none">${opp.toFixed(1)} m²</text>`;
      }
    }
    return s;
  }

  /**
   * Deuren, ramen en doorgangen: die worden op ware breedte in de muur
   * getekend, niet als symbool op schaal.
   */
  bouwSVG(c, lijn, voorExport) {
    const d = def(c.type);
    const b = (c.breedte ?? d.breedte ?? 0.9);
    const ruimte = c.ruimteId && store.ruimte(c.ruimteId);
    const dikte = (ruimte && ruimte.muurdikte) || 0.09;
    const t = dikte + lijn * 2;
    const gesel = !voorExport && store.isGeselecteerd(c.id);
    const kleur = gesel ? 'var(--accent)' : 'var(--muur)';
    let s = `<g data-kind="component" data-id="${c.id}" class="comp bouw${gesel ? ' geselecteerd' : ''}" ` +
      `transform="translate(${c.x} ${c.y}) rotate(${c.rot || 0})">`;
    // opening: de muur wordt weggesneden
    s += `<rect x="${-b / 2}" y="${-t / 2}" width="${b}" height="${t}" fill="var(--vlak)" stroke="none"/>`;

    if (c.type === 'raam' || c.type === 'terrasdeur') {
      s += `<line x1="${-b / 2}" y1="${-t / 2}" x2="${b / 2}" y2="${-t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
      s += `<line x1="${-b / 2}" y1="${t / 2}" x2="${b / 2}" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
      s += `<line x1="${-b / 2}" y1="0" x2="${b / 2}" y2="0" stroke="${kleur}" stroke-width="${lijn}"/>`;
      if (c.type === 'terrasdeur') {
        s += `<line x1="0" y1="${-t / 2}" x2="0" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
      }
    } else if (c.type === 'doorgang') {
      s += `<line x1="${-b / 2}" y1="${-t / 2}" x2="${-b / 2}" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
      s += `<line x1="${b / 2}" y1="${-t / 2}" x2="${b / 2}" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
    } else if (c.type === 'schuifdeur') {
      s += `<line x1="${-b / 2}" y1="${-t * 0.2}" x2="${b / 2}" y2="${-t * 0.2}" stroke="${kleur}" stroke-width="${lijn * 2}"/>`;
      s += `<line x1="${-b / 2 + b * 0.15}" y1="${t * 0.35}" x2="${b / 2 + b * 0.15}" y2="${t * 0.35}" stroke="${kleur}" stroke-width="${lijn * 2}"/>`;
      s += `<path d="M ${b * 0.1} ${-t * 0.9} L ${b * 0.45} ${-t * 0.9} M ${b * 0.32} ${-t * 1.3} L ${b * 0.45} ${-t * 0.9} L ${b * 0.32} ${-t * 0.5}" ` +
        `fill="none" stroke="${kleur}" stroke-width="${lijn}"/>`;
    } else if (c.type === 'garagepoort') {
      s += `<line x1="${-b / 2}" y1="0" x2="${b / 2}" y2="0" stroke="${kleur}" stroke-width="${lijn * 2}"/>`;
      for (let i = 1; i < 5; i++) {
        const x = -b / 2 + (b * i) / 5;
        s += `<line x1="${x}" y1="${-t / 2}" x2="${x}" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn * 0.8}"/>`;
      }
    } else {
      // deur of dubbele deur: blad met draaicirkel
      const vleugels = c.type === 'deurDubbel' ? 2 : 1;
      const w = b / vleugels;
      for (let i = 0; i < vleugels; i++) {
        const x0 = vleugels === 1 ? -b / 2 : (i === 0 ? -b / 2 : b / 2);
        const richting = vleugels === 1 ? 1 : (i === 0 ? 1 : -1);
        s += `<line x1="${x0}" y1="0" x2="${x0}" y2="${-w}" stroke="${kleur}" stroke-width="${lijn * 1.6}"/>`;
        s += `<path d="M ${x0} ${-w} A ${w} ${w} 0 0 ${richting > 0 ? 1 : 0} ${x0 + richting * w} 0" ` +
          `fill="none" stroke="${kleur}" stroke-width="${lijn * 0.8}" stroke-dasharray="${lijn * 3} ${lijn * 2}"/>`;
      }
      s += `<line x1="${-b / 2}" y1="${-t / 2}" x2="${-b / 2}" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
      s += `<line x1="${b / 2}" y1="${-t / 2}" x2="${b / 2}" y2="${t / 2}" stroke="${kleur}" stroke-width="${lijn}"/>`;
    }
    if (!voorExport) {
      const raak = Math.max(t, 0.3, 20 / this.view.zoom);
      s += `<rect x="${-b / 2}" y="${-raak / 2}" width="${b}" height="${raak}" fill="transparent" class="hit"/>`;
    }
    s += '</g>';
    return s;
  }

  /** Trap: treden met looprichting. */
  trapSVG(c, lijn, voorExport) {
    const d = def(c.type);
    const b = c.breedte ?? d.breedte ?? 1.0;
    const diep = c.diepte ?? d.diepte ?? 2.6;
    const gesel = !voorExport && store.isGeselecteerd(c.id);
    const kleur = gesel ? 'var(--accent)' : 'var(--muur)';
    const treden = Math.max(3, Math.round(diep / 0.26));
    let s = `<g data-kind="component" data-id="${c.id}" class="comp bouw${gesel ? ' geselecteerd' : ''}" ` +
      `transform="translate(${c.x} ${c.y}) rotate(${c.rot || 0})">`;
    s += `<rect x="${-b / 2}" y="${-diep / 2}" width="${b}" height="${diep}" fill="var(--vlak)" stroke="${kleur}" stroke-width="${lijn}"/>`;
    for (let i = 1; i < treden; i++) {
      const y = -diep / 2 + (diep * i) / treden;
      s += `<line x1="${-b / 2}" y1="${y}" x2="${b / 2}" y2="${y}" stroke="${kleur}" stroke-width="${lijn * 0.7}"/>`;
    }
    s += `<line x1="0" y1="${diep / 2 - 0.15}" x2="0" y2="${-diep / 2 + 0.15}" stroke="${kleur}" stroke-width="${lijn}"/>`;
    s += `<path d="M ${-0.08} ${-diep / 2 + 0.3} L 0 ${-diep / 2 + 0.12} L 0.08 ${-diep / 2 + 0.3}" fill="none" stroke="${kleur}" stroke-width="${lijn}"/>`;
    if (!voorExport) s += `<rect x="${-b / 2}" y="${-diep / 2}" width="${b}" height="${diep}" fill="transparent" class="hit"/>`;
    s += '</g>';
    return s;
  }

  componentSVG(c, symM, lijn, voorExport) {
    const d = def(c.type);
    if (d.kringtype === 'bouw') return c.type === 'trap' ? this.trapSVG(c, lijn, voorExport) : this.bouwSVG(c, lijn, voorExport);
    const kring = c.kringId && store.project.kringen.find((k) => k.id === c.kringId);
    const gesel = !voorExport && store.isGeselecteerd(c.id);
    const kleurPerKring = store.ui.kleurPerKring || store.ui.stap === 3;
    let kleur = 'var(--symbool)';
    if (kleurPerKring) kleur = kring ? kring.kleur : 'var(--geen-kring)';
    const schaal = symM / 100;
    const hit = Math.max(symM * 0.85, 14 / this.view.zoom);

    let s = `<g data-kind="component" data-id="${c.id}" class="comp${gesel ? ' geselecteerd' : ''}" ` +
      `transform="translate(${c.x} ${c.y}) rotate(${c.rot || 0})">`;
    if (gesel) {
      s += `<circle cx="0" cy="0" r="${hit}" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)" stroke-width="${lijn}"/>`;
    }
    s += `<g transform="scale(${schaal})" fill="none" stroke="${kleur}" stroke-width="${(lijn / schaal) * 1.15}">${symbool(c.type, -(c.rot || 0))}</g>`;
    if (!voorExport) s += `<circle cx="0" cy="0" r="${hit}" fill="transparent" class="hit"/>`;
    s += '</g>';

    // Label / kringnummer los van de rotatie
    const toonKring = (store.ui.stap === 3 || kleurPerKring || store.ui.toonKringnummers) && kring;
    if ((store.ui.toonLabels || voorExport) && (c.label || toonKring)) {
      const h = Math.max(0.17, 11 / this.view.zoom);
      const tekst = toonKring ? `${kring.nummer}${c.label ? ' · ' + c.label : ''}` : c.label;
      s += `<text x="${c.x}" y="${c.y + symM * 0.95 + h}" text-anchor="middle" font-size="${h}" ` +
        `fill="${toonKring ? kring.kleur : 'var(--tekst-plan-zacht)'}" font-weight="600" ` +
        `font-family="system-ui, sans-serif" style="pointer-events:none">${escape(String(tekst))}</text>`;
    }
    return s;
  }

  /** Hulplijnen, greeppunten en voorbeelden tijdens het tekenen. */
  overlay(lijn, symM) {
    const ui = store.ui;
    let s = '<g class="laag-overlay">';

    // Maten en greeppunten van een geselecteerde ruimte
    const sel = ui.selectie.length === 1 ? store.ruimte(ui.selectie[0]) : null;
    if (sel) {
      for (const [p1, p2] of segmenten(sel.punten)) s += this.maatLabel(p1, p2);
      if (ui.tool === 'select') {
        const r = Math.max(0.08, 7 / this.view.zoom);
        sel.punten.forEach((p, i) => {
          s += `<circle data-kind="hoek" data-id="${sel.id}" data-index="${i}" cx="${p.x}" cy="${p.y}" r="${r}" ` +
            `fill="var(--vlak)" stroke="var(--accent)" stroke-width="${lijn}"/>`;
        });
      }
    }

    // Voorbeeld tijdens tekenen
    const a = this.actie;
    const punt = this.aanwijzer;

    if (ui.bezigRechthoek && punt) {
      const hoeken = rechthoek(ui.bezigRechthoek, punt);
      const pts = hoeken.map((p) => `${p.x},${p.y}`).join(' ');
      s += `<polygon points="${pts}" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" ` +
        `stroke-width="${lijn * 2}" stroke-dasharray="${lijn * 4} ${lijn * 3}"/>`;
      s += this.maatLabel(hoeken[0], hoeken[1]);
      s += this.maatLabel(hoeken[1], hoeken[2]);
      const b = omhullende(hoeken);
      const h = Math.max(0.17, 12 / this.view.zoom);
      s += `<text x="${(b.x1 + b.x2) / 2}" y="${(b.y1 + b.y2) / 2}" text-anchor="middle" font-size="${h}" ` +
        `fill="var(--accent)" font-weight="600" font-family="system-ui, sans-serif" style="pointer-events:none">` +
        `${(b.w * b.h).toFixed(1)} m²</text>`;
    }

    if (ui.bezigMuur && punt) {
      s += `<line x1="${ui.bezigMuur.x}" y1="${ui.bezigMuur.y}" x2="${punt.x}" y2="${punt.y}" ` +
        `stroke="var(--accent)" stroke-width="0.1" stroke-linecap="square" opacity="0.65"/>`;
      s += this.maatLabel(ui.bezigMuur, punt);
    }

    if (a && a.type === 'rubber' && a.huidig) {
      const b = omhullende([a.start, a.huidig]);
      s += `<rect x="${b.x1}" y="${b.y1}" width="${b.w}" height="${b.h}" fill="var(--accent)" fill-opacity="0.1" ` +
        `stroke="var(--accent)" stroke-width="${lijn}" stroke-dasharray="${lijn * 3} ${lijn * 3}"/>`;
    }

    // Polygoon in opbouw, met de maat van elke zijde
    if (ui.bezigPolygoon && ui.bezigPolygoon.length) {
      const bezig = ui.bezigPolygoon;
      const pts = bezig.map((p) => `${p.x},${p.y}`).join(' ');
      const laatste = bezig[bezig.length - 1];
      if (bezig.length > 2) {
        s += `<polygon points="${pts}" fill="var(--accent)" fill-opacity="0.08" stroke="none"/>`;
      }
      s += `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="${lijn * 2}"/>`;
      for (let i = 1; i < bezig.length; i++) s += this.maatLabel(bezig[i - 1], bezig[i], 'var(--tekst-plan)');
      if (punt) {
        s += `<line x1="${laatste.x}" y1="${laatste.y}" x2="${punt.x}" y2="${punt.y}" ` +
          `stroke="var(--accent)" stroke-width="${lijn * 2}" stroke-dasharray="${lijn * 4} ${lijn * 3}"/>`;
        s += this.maatLabel(laatste, punt);
      }
      const r = Math.max(0.06, 5 / this.view.zoom);
      for (const p of bezig) s += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="var(--accent)"/>`;
      if (bezig.length > 2) {
        s += `<circle cx="${bezig[0].x}" cy="${bezig[0].y}" r="${r * 2}" fill="var(--vlak)" ` +
          `stroke="var(--accent)" stroke-width="${lijn}"/>`;
      }
    }

    // Waar de cursor vastklikt
    if (punt && punt.magneet && ['polygoon', 'muur', 'rechthoek'].includes(ui.tool)) {
      const r = Math.max(0.08, 7 / this.view.zoom);
      if (punt.magneet === 'hoekpunt') {
        s += `<rect x="${punt.x - r}" y="${punt.y - r}" width="${r * 2}" height="${r * 2}" fill="none" ` +
          `stroke="var(--accent)" stroke-width="${lijn * 1.5}"/>`;
      } else {
        s += `<circle cx="${punt.x}" cy="${punt.y}" r="${r * 0.7}" fill="none" stroke="var(--accent)" stroke-width="${lijn}"/>`;
      }
    }

    // Plaatsingsvoorbeeld
    if (ui.tool === 'plaats' && this.muisWereld) {
      const pos = this.plaatsPositie(this.muisWereld, ui.plaatsType);
      const schaal = symM / 100;
      s += `<g transform="translate(${pos.x} ${pos.y}) rotate(${pos.rot})" opacity="0.55">` +
        `<g transform="scale(${schaal})" fill="none" stroke="var(--accent)" stroke-width="${(lijn / schaal) * 1.2}">${symbool(ui.plaatsType)}</g></g>`;
    }

    s += '</g>';
    return s;
  }

  /* ---------------------------------------------------------------- *
   * Plaatsing en muur-snap
   * ---------------------------------------------------------------- */
  alleSegmenten() {
    const lijst = [];
    for (const r of store.project.plan.ruimtes) {
      const mid = zwaartepunt(r.punten);
      for (const [a, b] of segmenten(r.punten)) lijst.push({ a, b, binnen: mid });
    }
    for (const m of store.project.plan.muren) lijst.push({ a: m.a, b: m.b, binnen: null });
    return lijst;
  }

  /** Bepaalt positie en hoek van een te plaatsen component. */
  plaatsPositie(punt, type) {
    const d = def(type);
    const raster = store.project.plan.raster;
    if (!d.wand) {
      const p = snapPunt(punt, raster);
      return { x: p.x, y: p.y, rot: 0 };
    }
    let beste = null;
    for (const seg of this.alleSegmenten()) {
      const pr = projecteerOpSegment(punt, seg.a, seg.b);
      if (pr.afstand < WAND_SNAP && (!beste || pr.afstand < beste.pr.afstand)) beste = { pr, seg };
    }
    if (!beste) {
      const p = snapPunt(punt, raster);
      return { x: p.x, y: p.y, rot: 0 };
    }
    const wp = beste.pr.punt;
    // Normaal loodrecht op de muur, gericht naar de binnenzijde van de ruimte.
    const ux = beste.seg.b.x - beste.seg.a.x;
    const uy = beste.seg.b.y - beste.seg.a.y;
    const lengte = Math.hypot(ux, uy) || 1;
    let nx = -uy / lengte, ny = ux / lengte;
    if (beste.seg.binnen) {
      const naarBinnen = (beste.seg.binnen.x - wp.x) * nx + (beste.seg.binnen.y - wp.y) * ny;
      if (naarBinnen < 0) { nx = -nx; ny = -ny; }
    } else if (ny > 0) {
      nx = -nx; ny = -ny;   // losse muur: standaard naar boven
    }
    const offset = d.opDeMuur ? 0 : SYMBOOL_M * 0.55;
    const rot = (Math.atan2(nx, -ny) * 180) / Math.PI;
    return { x: +(wp.x + nx * offset).toFixed(3), y: +(wp.y + ny * offset).toFixed(3), rot: +rot.toFixed(1) };
  }

  /** Dichtstbijzijnde bestaande hoekpunt (van een ruimte of muur). */
  dichtsteHoekpunt(punt, max = 0.35) {
    let beste = null;
    const kijk = (p) => {
      const d = afstand(punt, p);
      if (d < max && (!beste || d < beste.d)) beste = { d, p };
    };
    for (const r of store.project.plan.ruimtes) r.punten.forEach(kijk);
    for (const m of store.project.plan.muren) { kijk(m.a); kijk(m.b); }
    return beste ? { x: beste.p.x, y: beste.p.y } : null;
  }

  /**
   * Punt om mee te tekenen. Het klikt op bestaande hoekpunten, houdt de
   * richting op veelvouden van 45° (zodat lijnen recht blijven) en valt
   * anders terug op het raster. Met Alt teken je vrij.
   */
  tekenpunt(punt, vorig = null, vrij = false) {
    const raster = store.project.plan.raster;
    const hoekpunt = this.dichtsteHoekpunt(punt, Math.max(0.28, 14 / this.view.zoom));
    if (hoekpunt) return { ...hoekpunt, magneet: 'hoekpunt' };
    if (vorig && !vrij) {
      const dx = punt.x - vorig.x, dy = punt.y - vorig.y;
      const lengte = Math.hypot(dx, dy);
      if (lengte > 0.02) {
        const stap = Math.PI / 4;
        const hoek = Math.round(Math.atan2(dy, dx) / stap) * stap;
        const afgerond = Math.max(raster, Math.round(lengte / raster) * raster);
        return {
          x: +(vorig.x + Math.cos(hoek) * afgerond).toFixed(3),
          y: +(vorig.y + Math.sin(hoek) * afgerond).toFixed(3),
          magneet: 'richting',
        };
      }
    }
    const p = snapPunt(punt, raster);
    return { x: p.x, y: p.y, magneet: null };
  }

  /** Punt op een exacte afstand vanaf `vorig`, in de richting van de cursor. */
  puntOpLengte(vorig, richting, lengte) {
    const dx = richting.x - vorig.x, dy = richting.y - vorig.y;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: +(vorig.x + (dx / len) * lengte).toFixed(3),
      y: +(vorig.y + (dy / len) * lengte).toFixed(3),
    };
  }

  /** Maatlabel langs een lijnstuk, altijd leesbaar gedraaid. */
  maatLabel(a, b, kleur = 'var(--accent)') {
    const len = afstand(a, b);
    if (len < 0.08) return '';
    let hoek = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (hoek > 90 || hoek < -90) hoek += 180;
    const h = Math.max(0.15, 11 / this.view.zoom);
    return `<g transform="translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${hoek})" style="pointer-events:none">` +
      `<text x="0" y="${-h * 0.42}" text-anchor="middle" font-size="${h}" fill="${kleur}" font-weight="600" ` +
      `font-family="system-ui, sans-serif" paint-order="stroke" stroke="var(--vlak)" stroke-width="${h * 0.3}" ` +
      `stroke-linejoin="round">${len.toFixed(2)} m</text></g>`;
  }

  /** Lengte van een lijnstuk in meter. */
  maatVan(a, b) { return afstand(a, b); }

  /** Hoek van een lijnstuk in graden, 0 = horizontaal naar rechts. */
  hoekVan(a, b) {
    const g = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    return Math.round(((g % 360) + 360) % 360);
  }

  ruimteOp(punt) {
    const ruimtes = store.project.plan.ruimtes;
    for (let i = ruimtes.length - 1; i >= 0; i--) {
      if (puntInPolygoon(punt, ruimtes[i].punten)) return ruimtes[i];
    }
    return null;
  }

  plaatsComponent(punt, type) {
    const pos = this.plaatsPositie(punt, type);
    const d = def(type);
    const ruimte = this.ruimteOp({ x: pos.x, y: pos.y }) || this.ruimteOp(punt);
    let nieuwId = null;
    store.commit('component geplaatst', (p) => {
      const c = {
        id: uid('cmp'),
        type,
        x: pos.x,
        y: pos.y,
        rot: pos.rot,
        label: '',
        ruimteId: ruimte ? ruimte.id : null,
        kringId: store.ui.stap === 3 ? store.ui.actieveKring : null,
        hoogte: d.hoogte ?? null,
        watt: d.watt ?? null,
        breedte: d.breedte ?? null,
        diepte: d.diepte ?? null,
        opmerking: '',
      };
      p.componenten.push(c);
      nieuwId = c.id;
    });
    return nieuwId;
  }

  /* ---------------------------------------------------------------- *
   * Bediening
   * ---------------------------------------------------------------- */
  _bind() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', (e) => this.onDown(e));
    svg.addEventListener('pointermove', (e) => this.onMove(e));
    svg.addEventListener('pointerup', (e) => this.onUp(e));
    svg.addEventListener('pointercancel', (e) => this.onUp(e));
    svg.addEventListener('pointerleave', () => { this.muisWereld = null; this.plan(); });
    svg.addEventListener('dblclick', (e) => this.onDubbel(e));
    svg.addEventListener('contextmenu', (e) => e.preventDefault());
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      this.zoomNaar(factor, e);
    }, { passive: false });
  }

  onDown(e) {
    this.svg.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = {
        afstand: Math.hypot(a.x - b.x, a.y - b.y),
        midden: { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 },
      };
      this.actie = null;
      return;
    }
    if (this.pointers.size > 2) return;

    const ui = store.ui;
    const w = this.wereldPunt(e);
    const doel = e.target.closest('[data-kind]');
    const kind = doel && doel.dataset.kind;
    const id = doel && doel.dataset.id;
    const middenknop = e.button === 1 || e.button === 2 || e.altKey;

    if (middenknop) {
      this.actie = { type: 'pan', start: { x: e.clientX, y: e.clientY }, view: { ...this.view } };
      return;
    }

    switch (ui.tool) {
      case 'plaats': {
        const nieuwe = this.plaatsComponent(w, ui.plaatsType);
        if (nieuwe) store.selecteer(nieuwe);
        return;
      }
      case 'rechthoek': {
        const p = this.tekenpunt(w, null, e.altKey);
        if (!ui.bezigRechthoek) {
          store.setUI({ bezigRechthoek: { x: p.x, y: p.y }, lengteInvoer: '' });
          this.actie = { type: 'rect', start: p, gesleept: false };
        } else {
          this.voltooiRechthoek(p);
        }
        return;
      }
      case 'polygoon': {
        const bezig = ui.bezigPolygoon ? [...ui.bezigPolygoon] : [];
        const vorig = bezig.length ? bezig[bezig.length - 1] : null;
        const p = this.tekenpunt(w, vorig, e.altKey);
        if (bezig.length > 2 && afstand(p, bezig[0]) < Math.max(0.3, 16 / this.view.zoom)) {
          this.sluitPolygoon();
          return;
        }
        bezig.push({ x: p.x, y: p.y });
        store.setUI({ bezigPolygoon: bezig, lengteInvoer: '' });
        return;
      }
      case 'muur': {
        const p = this.tekenpunt(w, ui.bezigMuur || null, e.altKey);
        if (!ui.bezigMuur) {
          store.setUI({ bezigMuur: { x: p.x, y: p.y }, lengteInvoer: '' });
          this.actie = { type: 'muur', start: p, gesleept: false };
        } else {
          this.voltooiMuur(p);
        }
        return;
      }
      case 'verbind': {
        if (kind === 'component') this.verbindKlik(id);
        return;
      }
      case 'kringverf': {
        if (kind === 'component' && ui.actieveKring) {
          this.actie = { type: 'verf', gedaan: new Set() };
          this.verfComponent(id);
        }
        return;
      }
      case 'gum': {
        if (id) this.verwijderObject(id);
        return;
      }
      default: break;
    }

    // Selectiegereedschap
    if (kind === 'hoek') {
      this.actie = { type: 'hoek', ruimteId: id, index: Number(doel.dataset.index) };
      return;
    }
    if (kind === 'onderlaag') {
      if (!store.isGeselecteerd('onderlaag')) store.selecteer('onderlaag', e.shiftKey);
      this.actie = { type: 'onderlaag', start: w, verplaatst: false };
      return;
    }
    if (kind === 'component' || kind === 'ruimte' || kind === 'muur') {
      if (!store.isGeselecteerd(id)) store.selecteer(id, e.shiftKey);
      else if (e.shiftKey) { store.selecteer(id, true); return; }
      this.actie = {
        type: 'sleep',
        start: w,
        laatste: w,
        verplaatst: false,
        objecten: this.sleepbareObjecten(),
      };
      return;
    }

    // Lege ruimte: pannen (touch) of rubberband (muis)
    if (e.pointerType === 'touch') {
      this.actie = { type: 'pan', start: { x: e.clientX, y: e.clientY }, view: { ...this.view } };
    } else {
      if (!e.shiftKey) store.selecteer([]);
      this.actie = { type: 'rubber', start: w, huidig: null };
    }
  }

  sleepbareObjecten() {
    const p = store.project;
    const sel = new Set(store.ui.selectie);
    const comps = p.componenten.filter((c) => sel.has(c.id)).map((c) => ({ soort: 'comp', obj: c, x: c.x, y: c.y }));
    const ruimtes = p.plan.ruimtes.filter((r) => sel.has(r.id));
    const muren = p.plan.muren.filter((m) => sel.has(m.id));
    const meeComps = [];
    for (const r of ruimtes) {
      for (const c of p.componenten) {
        if (c.ruimteId === r.id && !sel.has(c.id)) meeComps.push({ soort: 'comp', obj: c, x: c.x, y: c.y });
      }
    }
    return {
      comps: [...comps, ...meeComps],
      ruimtes: ruimtes.map((r) => ({ obj: r, punten: r.punten.map((p2) => ({ ...p2 })) })),
      muren: muren.map((m) => ({ obj: m, a: { ...m.a }, b: { ...m.b } })),
    };
  }

  /** Berekent het gemagnetiseerde punt onder de cursor voor het actieve gereedschap. */
  berekenAanwijzer(vrij = false) {
    const ui = store.ui;
    const w = this.muisWereld;
    if (!w) return null;
    if (ui.tool === 'polygoon') {
      const bezig = ui.bezigPolygoon || [];
      return this.tekenpunt(w, bezig.length ? bezig[bezig.length - 1] : null, vrij);
    }
    if (ui.tool === 'muur') return this.tekenpunt(w, ui.bezigMuur || null, vrij);
    if (ui.tool === 'rechthoek') return this.tekenpunt(w, null, vrij);
    return null;
  }

  onMove(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.muisWereld = this.wereldPunt(e);
    this.aanwijzer = this.berekenAanwijzer(!!e.altKey);
    if (this.onAanwijzer) this.onAanwijzer();

    if (this.pointers.size === 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()];
      const nieuweAfstand = Math.hypot(a.x - b.x, a.y - b.y);
      const midden = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
      const factor = nieuweAfstand / (this.pinch.afstand || nieuweAfstand);
      // pan volgens de verplaatsing van het middelpunt
      const dx = (midden.clientX - this.pinch.midden.clientX) / this.view.zoom;
      const dy = (midden.clientY - this.pinch.midden.clientY) / this.view.zoom;
      this.view.cx -= dx; this.view.cy -= dy;
      this.pinch = { afstand: nieuweAfstand, midden };
      this.zoomNaar(factor, midden);
      return;
    }

    const a = this.actie;
    if (!a) {
      if (['plaats', 'polygoon', 'muur', 'rechthoek'].includes(store.ui.tool)) this.plan();
      return;
    }
    const w = this.muisWereld;
    const raster = store.project.plan.raster;

    switch (a.type) {
      case 'pan': {
        this.view.cx = a.view.cx - (e.clientX - a.start.x) / this.view.zoom;
        this.view.cy = a.view.cy - (e.clientY - a.start.y) / this.view.zoom;
        this.plan();
        break;
      }
      case 'rect':
      case 'muur':
        a.gesleept = afstand(a.start, w) > 0.4;
        this.plan();
        break;
      case 'rubber':
        a.huidig = w;
        this.plan();
        break;
      case 'sleep': {
        const dx = w.x - a.start.x, dy = w.y - a.start.y;
        if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) a.verplaatst = true;
        for (const c of a.objecten.comps) {
          const doel = { x: c.x + dx, y: c.y + dy };
          if (def(c.obj.type).wand) {
            const pos = this.plaatsPositie(doel, c.obj.type);
            c.obj.x = pos.x; c.obj.y = pos.y; c.obj.rot = pos.rot;
          } else {
            const p2 = snapPunt(doel, raster);
            c.obj.x = p2.x; c.obj.y = p2.y;
          }
        }
        for (const r of a.objecten.ruimtes) {
          r.obj.punten = r.punten.map((p2) => snapPunt({ x: p2.x + dx, y: p2.y + dy }, raster));
        }
        for (const m of a.objecten.muren) {
          m.obj.a = snapPunt({ x: m.a.x + dx, y: m.a.y + dy }, raster);
          m.obj.b = snapPunt({ x: m.b.x + dx, y: m.b.y + dy }, raster);
        }
        this.plan();
        break;
      }
      case 'onderlaag': {
        const ol = store.project.plan.onderlaag;
        if (ol) {
          ol.x = +(ol.x + (w.x - a.start.x)).toFixed(3);
          ol.y = +(ol.y + (w.y - a.start.y)).toFixed(3);
          a.start = w;
          a.verplaatst = true;
          this.plan();
        }
        break;
      }
      case 'hoek': {
        const r = store.ruimte(a.ruimteId);
        if (r) { r.punten[a.index] = snapPunt(w, raster); a.verplaatst = true; this.plan(); }
        break;
      }
      case 'verf': {
        const doel = e.target.closest('[data-kind="component"]');
        if (doel) this.verfComponent(doel.dataset.id);
        break;
      }
      default: break;
    }
  }

  onUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const a = this.actie;
    this.actie = null;
    if (!a) return;

    switch (a.type) {
      case 'rect':
        if (a.gesleept && this.aanwijzer) this.voltooiRechthoek(this.aanwijzer);
        break;
      case 'muur':
        if (a.gesleept && this.aanwijzer) this.voltooiMuur(this.aanwijzer);
        break;
      case 'rubber': {
        if (!a.huidig) break;
        const b = omhullende([a.start, a.huidig]);
        const gevonden = store.project.componenten
          .filter((c) => c.x >= b.x1 && c.x <= b.x2 && c.y >= b.y1 && c.y <= b.y2)
          .map((c) => c.id);
        if (gevonden.length) store.selecteer(gevonden, e.shiftKey);
        break;
      }
      case 'onderlaag':
        if (a.verplaatst) store.commit('onderlaag verplaatst', () => {});
        break;
      case 'sleep':
      case 'hoek': {
        if (a.verplaatst) {
          // De objecten zijn al aangepast; enkel vastleggen voor undo.
          this.herberekenRuimtes();
          store.commit('verplaatst', () => {});
        }
        break;
      }
      default: break;
    }
    this.plan();
  }

  onDubbel(e) {
    if (store.ui.tool === 'polygoon') { this.sluitPolygoon(); return; }
    const doel = e.target.closest('[data-kind]');
    if (doel) {
      store.selecteer(doel.dataset.id);
      document.dispatchEvent(new CustomEvent('elek:bewerk', { detail: { id: doel.dataset.id } }));
    }
  }

  /* ---------------------------------------------------------------- *
   * Acties
   * ---------------------------------------------------------------- */
  maakRuimte(punten) {
    const type = store.ui.nieuweRuimteType || 'overig';
    const d = ruimteDef(type);
    let id = null;
    store.commit('ruimte toegevoegd', (p) => {
      const nr = p.plan.ruimtes.length + 1;
      const r = {
        id: uid('rmt'),
        naam: d.naam === 'Overige ruimte' ? `Ruimte ${nr}` : d.naam,
        type,
        punten: punten.map((pt) => ({ x: +pt.x.toFixed(3), y: +pt.y.toFixed(3) })),
        kleur: d.kleur,
        muurdikte: 0.09,
        niveauId: p.plan.niveaus[0] && p.plan.niveaus[0].id,
      };
      p.plan.ruimtes.push(r);
      id = r.id;
    });
    store.selecteer(id);
    this.herberekenRuimtes();
    return id;
  }

  voltooiRechthoek(p) {
    const start = store.ui.bezigRechthoek;
    store.setUI({ bezigRechthoek: null, lengteInvoer: '' });
    if (!start) return;
    const hoeken = rechthoek(start, p);
    const box = omhullende(hoeken);
    if (box.w < 0.25 || box.h < 0.25) return;
    this.maakRuimte(hoeken);
  }

  voltooiMuur(p) {
    const start = store.ui.bezigMuur;
    store.setUI({ bezigMuur: null, lengteInvoer: '' });
    if (!start || afstand(start, p) < 0.15) return;
    store.commit('muur getekend', (prj) => {
      prj.plan.muren.push({ id: uid('mur'), a: { x: start.x, y: start.y }, b: { x: p.x, y: p.y }, dikte: 0.1 });
    });
  }

  /** Zet het volgende punt op een exact ingetypte lengte. */
  plaatsOpLengte(lengte) {
    const ui = store.ui;
    const richting = this.aanwijzer || this.muisWereld;
    if (!(lengte > 0) || !richting) return false;
    if (ui.tool === 'polygoon' && ui.bezigPolygoon && ui.bezigPolygoon.length) {
      const vorig = ui.bezigPolygoon[ui.bezigPolygoon.length - 1];
      store.setUI({ bezigPolygoon: [...ui.bezigPolygoon, this.puntOpLengte(vorig, richting, lengte)], lengteInvoer: '' });
      return true;
    }
    if (ui.tool === 'muur' && ui.bezigMuur) {
      this.voltooiMuur(this.puntOpLengte(ui.bezigMuur, richting, lengte));
      return true;
    }
    if (ui.tool === 'rechthoek' && ui.bezigRechthoek) {
      this.voltooiRechthoek(this.puntOpLengte(ui.bezigRechthoek, richting, lengte));
      return true;
    }
    return false;
  }

  /** Laatst geplaatste punt terugnemen tijdens het tekenen. */
  verwijderLaatstePunt() {
    const ui = store.ui;
    if (ui.bezigPolygoon && ui.bezigPolygoon.length) {
      const rest = ui.bezigPolygoon.slice(0, -1);
      store.setUI({ bezigPolygoon: rest.length ? rest : null });
      return true;
    }
    if (ui.bezigMuur) { store.setUI({ bezigMuur: null }); return true; }
    if (ui.bezigRechthoek) { store.setUI({ bezigRechthoek: null }); return true; }
    return false;
  }

  /** Alles wat half getekend is loslaten. */
  stopTekenen() {
    store.setUI({ bezigPolygoon: null, bezigMuur: null, bezigRechthoek: null, lengteInvoer: '' });
    this.actie = null;
  }

  sluitPolygoon() {
    const punten = store.ui.bezigPolygoon;
    store.setUI({ bezigPolygoon: null });
    if (!punten || punten.length < 3) return;
    this.maakRuimte(punten);
  }

  /** Koppelt elke component opnieuw aan de ruimte waarin hij ligt. */
  herberekenRuimtes() {
    let gewijzigd = false;
    for (const c of store.project.componenten) {
      const r = this.ruimteOp({ x: c.x, y: c.y }) ||
        this.dichtstbijzijndeRuimte({ x: c.x, y: c.y });
      const nieuw = r ? r.id : null;
      if (c.ruimteId !== nieuw) { c.ruimteId = nieuw; gewijzigd = true; }
    }
    return gewijzigd;
  }

  dichtstbijzijndeRuimte(punt) {
    let beste = null;
    for (const r of store.project.plan.ruimtes) {
      for (const [a, b] of segmenten(r.punten)) {
        const pr = projecteerOpSegment(punt, a, b);
        if (pr.afstand < 0.6 && (!beste || pr.afstand < beste.afstand)) beste = { afstand: pr.afstand, r };
      }
    }
    return beste ? beste.r : null;
  }

  verbindKlik(id) {
    const comp = store.component(id);
    if (!comp) return;
    const bron = store.ui.verbindBron;
    if (!bron) {
      store.setUI({ verbindBron: id });
      store.selecteer(id);
      return;
    }
    if (bron === id) { store.setUI({ verbindBron: null }); return; }
    store.commit('verbinding gemaakt', (p) => {
      const bestaat = p.verbindingen.find(
        (v) => (v.van === bron && v.naar === id) || (v.van === id && v.naar === bron)
      );
      if (bestaat) {
        p.verbindingen = p.verbindingen.filter((v) => v !== bestaat);
      } else {
        p.verbindingen.push({ id: uid('vbd'), van: bron, naar: id });
      }
    });
    store.setUI({ verbindBron: null });
  }

  verfComponent(id) {
    const kringId = store.ui.actieveKring;
    if (!kringId || !id) return;
    const comp = store.component(id);
    if (!comp || comp.kringId === kringId) return;
    store.commit('kring toegewezen', () => { comp.kringId = kringId; });
  }

  verwijderObject(id) {
    store.commit('verwijderd', (p) => {
      p.componenten = p.componenten.filter((c) => c.id !== id);
      p.plan.ruimtes = p.plan.ruimtes.filter((r) => r.id !== id);
      p.plan.muren = p.plan.muren.filter((m) => m.id !== id);
      p.verbindingen = p.verbindingen.filter((v) => v.van !== id && v.naar !== id);
    });
  }
}

export function escape(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
