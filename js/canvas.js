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

    // Componenten
    s += '<g class="laag-componenten">';
    for (const c of p.componenten) s += this.componentSVG(c, symM, lijn, voorExport);
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
    let s = `<polygon data-kind="ruimte" data-id="${r.id}" points="${punten}" ` +
      `fill="${r.kleur || d.kleur}" fill-opacity="0.85" stroke="${gesel ? 'var(--accent)' : 'var(--muur)'}" ` +
      `stroke-width="${gesel ? lijn * 3 : (r.muurdikte || 0.09)}" stroke-linejoin="miter"/>`;
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

  componentSVG(c, symM, lijn, voorExport) {
    const d = def(c.type);
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
    const toonKring = (store.ui.stap === 3 || kleurPerKring) && kring;
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

    // Greeppunten van een geselecteerde ruimte
    const sel = ui.selectie.length === 1 ? store.ruimte(ui.selectie[0]) : null;
    if (sel && ui.tool === 'select') {
      const r = Math.max(0.08, 7 / this.view.zoom);
      sel.punten.forEach((p, i) => {
        s += `<circle data-kind="hoek" data-id="${sel.id}" data-index="${i}" cx="${p.x}" cy="${p.y}" r="${r}" ` +
          `fill="var(--vlak)" stroke="var(--accent)" stroke-width="${lijn}"/>`;
      });
      // Zijdematen
      const h = Math.max(0.16, 10 / this.view.zoom);
      for (const [a, b] of segmenten(sel.punten)) {
        const len = afstand(a, b);
        if (len < 0.3) continue;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        s += `<text x="${mx}" y="${my - h * 0.4}" text-anchor="middle" font-size="${h}" fill="var(--accent)" ` +
          `font-family="system-ui, sans-serif" style="pointer-events:none">${len.toFixed(2)} m</text>`;
      }
    }

    // Voorbeeld tijdens tekenen
    const a = this.actie;
    if (a && a.type === 'rect' && a.huidig) {
      const pts = rechthoek(a.start, a.huidig).map((p) => `${p.x},${p.y}`).join(' ');
      s += `<polygon points="${pts}" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" ` +
        `stroke-width="${lijn * 2}" stroke-dasharray="${lijn * 4} ${lijn * 3}"/>`;
      const b = omhullende(rechthoek(a.start, a.huidig));
      const h = Math.max(0.18, 12 / this.view.zoom);
      s += `<text x="${(b.x1 + b.x2) / 2}" y="${(b.y1 + b.y2) / 2}" text-anchor="middle" font-size="${h}" ` +
        `fill="var(--accent)" font-weight="600" font-family="system-ui, sans-serif">${b.w.toFixed(2)} × ${b.h.toFixed(2)} m</text>`;
    }
    if (a && a.type === 'muur' && a.huidig) {
      s += `<line x1="${a.start.x}" y1="${a.start.y}" x2="${a.huidig.x}" y2="${a.huidig.y}" ` +
        `stroke="var(--accent)" stroke-width="${a.dikte || 0.1}" stroke-linecap="square" opacity="0.7"/>`;
    }
    if (a && a.type === 'rubber' && a.huidig) {
      const b = omhullende([a.start, a.huidig]);
      s += `<rect x="${b.x1}" y="${b.y1}" width="${b.w}" height="${b.h}" fill="var(--accent)" fill-opacity="0.1" ` +
        `stroke="var(--accent)" stroke-width="${lijn}" stroke-dasharray="${lijn * 3} ${lijn * 3}"/>`;
    }

    // Polygoon in opbouw
    if (ui.bezigPolygoon && ui.bezigPolygoon.length) {
      const pts = ui.bezigPolygoon.map((p) => `${p.x},${p.y}`).join(' ');
      const laatste = ui.bezigPolygoon[ui.bezigPolygoon.length - 1];
      s += `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="${lijn * 2}"/>`;
      if (this.muisWereld) {
        s += `<line x1="${laatste.x}" y1="${laatste.y}" x2="${this.muisWereld.x}" y2="${this.muisWereld.y}" ` +
          `stroke="var(--accent)" stroke-width="${lijn * 2}" stroke-dasharray="${lijn * 4} ${lijn * 3}"/>`;
      }
      for (const p of ui.bezigPolygoon) {
        s += `<circle cx="${p.x}" cy="${p.y}" r="${Math.max(0.06, 5 / this.view.zoom)}" fill="var(--accent)"/>`;
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
    const offset = SYMBOOL_M * 0.55;
    const rot = (Math.atan2(nx, -ny) * 180) / Math.PI;
    return { x: +(wp.x + nx * offset).toFixed(3), y: +(wp.y + ny * offset).toFixed(3), rot: +rot.toFixed(1) };
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
      case 'rechthoek':
        this.actie = { type: 'rect', start: snapPunt(w, store.project.plan.raster), huidig: null };
        return;
      case 'polygoon': {
        const p = snapPunt(w, store.project.plan.raster);
        const bezig = ui.bezigPolygoon ? [...ui.bezigPolygoon] : [];
        if (bezig.length > 2 && afstand(p, bezig[0]) < 0.35) { this.sluitPolygoon(); return; }
        bezig.push(p);
        store.setUI({ bezigPolygoon: bezig });
        return;
      }
      case 'muur':
        this.actie = { type: 'muur', start: snapPunt(w, store.project.plan.raster), huidig: null, dikte: 0.1 };
        return;
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

  onMove(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.muisWereld = this.wereldPunt(e);

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
    if (!a) { if (store.ui.tool === 'plaats' || store.ui.bezigPolygoon) this.plan(); return; }
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
        a.huidig = snapPunt(e.shiftKey ? orthogonaal(a.start, w) : w, raster);
        this.plan();
        break;
      case 'muur':
        a.huidig = snapPunt(e.shiftKey ? orthogonaal(a.start, w) : w, raster);
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
      case 'rect': {
        if (!a.huidig) break;
        const b = omhullende(rechthoek(a.start, a.huidig));
        if (b.w < 0.3 || b.h < 0.3) break;
        this.maakRuimte(rechthoek(a.start, a.huidig));
        break;
      }
      case 'muur': {
        if (!a.huidig || afstand(a.start, a.huidig) < 0.2) break;
        store.commit('muur getekend', (p) => {
          p.plan.muren.push({ id: uid('mur'), a: a.start, b: a.huidig, dikte: a.dikte || 0.1 });
        });
        break;
      }
      case 'rubber': {
        if (!a.huidig) break;
        const b = omhullende([a.start, a.huidig]);
        const gevonden = store.project.componenten
          .filter((c) => c.x >= b.x1 && c.x <= b.x2 && c.y >= b.y1 && c.y <= b.y2)
          .map((c) => c.id);
        if (gevonden.length) store.selecteer(gevonden, e.shiftKey);
        break;
      }
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
