// Centrale toestand: project, selectie, undo/redo en opslag in de browser.

import { nieuwProject, migreer } from './model.js';

const OPSLAG_SLEUTEL = 'elek.project';
const MAX_HISTORIEK = 60;

function laadUitOpslag() {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL);
    if (!ruw) return null;
    return migreer(JSON.parse(ruw));
  } catch (e) {
    console.warn('Project kon niet geladen worden:', e);
    return null;
  }
}

export const store = {
  project: laadUitOpslag() || nieuwProject('Mijn installatie'),

  // Interface-toestand (niet opgeslagen in het project, geen undo)
  ui: {
    stap: 1,                 // 1 = plattegrond, 2 = componenten, 3 = kringen
    weergave: 'plan',        // plan | bord
    tool: 'select',
    plaatsType: 'lichtpunt',
    selectie: [],
    actieveKring: null,
    bezigPolygoon: null,
    toonRaster: true,
    toonLabels: true,
    toonMaten: false,        // oppervlakte per ruimte, zoals Trikker standaard niet toont
    toonAlleMaten: false,
    bezigRechthoek: null,
    bezigMuur: null,
    lengteInvoer: '',
    kleurPerKring: false,      // tekeningen zijn standaard zwart-wit
    kleurRuimtes: false,
    toonKringnummers: true,
    filterGroep: 'alle',
    niveauId: null,
  },

  _luisteraars: new Set(),
  _undo: [],
  _redo: [],
  _bezigMetOpslaan: null,

  on(fn) {
    this._luisteraars.add(fn);
    return () => this._luisteraars.delete(fn);
  },

  emit(reden = 'wijziging') {
    for (const fn of this._luisteraars) {
      try { fn(reden); } catch (e) { console.error(e); }
    }
  },

  /** Wijzigt het project met undo-ondersteuning. */
  commit(label, fn) {
    const snapshot = JSON.stringify(this.project);
    const resultaat = fn(this.project);
    if (resultaat === false) return false;      // wijziging afgebroken
    this._undo.push({ label, data: snapshot });
    if (this._undo.length > MAX_HISTORIEK) this._undo.shift();
    this._redo.length = 0;
    this.project.gewijzigd = new Date().toISOString();
    this.bewaar();
    this.emit('project');
    return true;
  },

  /** Wijzigt alleen de interface-toestand. */
  setUI(patch, reden = 'ui') {
    Object.assign(this.ui, patch);
    this.emit(reden);
  },

  undo() {
    const vorige = this._undo.pop();
    if (!vorige) return false;
    this._redo.push({ label: vorige.label, data: JSON.stringify(this.project) });
    this.project = migreer(JSON.parse(vorige.data));
    this.ui.selectie = [];
    this.bewaar();
    this.emit('project');
    return true;
  },

  redo() {
    const volgende = this._redo.pop();
    if (!volgende) return false;
    this._undo.push({ label: volgende.label, data: JSON.stringify(this.project) });
    this.project = migreer(JSON.parse(volgende.data));
    this.ui.selectie = [];
    this.bewaar();
    this.emit('project');
    return true;
  },

  kanUndo() { return this._undo.length > 0; },
  kanRedo() { return this._redo.length > 0; },

  bewaar() {
    clearTimeout(this._bezigMetOpslaan);
    this._bezigMetOpslaan = setTimeout(() => {
      try {
        localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(this.project));
      } catch (e) {
        console.warn('Opslaan mislukt:', e);
      }
    }, 250);
  },

  vervangProject(p, label = 'project geladen') {
    this._undo.push({ label, data: JSON.stringify(this.project) });
    this._redo.length = 0;
    this.project = migreer(p);
    this.ui.selectie = [];
    this.ui.bezigPolygoon = null;
    this.bewaar();
    this.emit('project');
  },

  // --- Selectie -----------------------------------------------------
  selecteer(ids, toevoegen = false) {
    const lijst = Array.isArray(ids) ? ids : ids ? [ids] : [];
    if (toevoegen) {
      const set = new Set(this.ui.selectie);
      for (const id of lijst) set.has(id) ? set.delete(id) : set.add(id);
      this.ui.selectie = [...set];
    } else {
      this.ui.selectie = lijst;
    }
    this.emit('selectie');
  },

  isGeselecteerd(id) { return this.ui.selectie.includes(id); },

  // --- Niveaus ------------------------------------------------------
  get niveaus() { return this.project.plan.niveaus; },

  /** Het niveau waarop nu getekend wordt. */
  get niveau() {
    const lijst = this.project.plan.niveaus;
    return lijst.find((n) => n.id === this.ui.niveauId) || lijst[0];
  },

  zetNiveau(id) {
    this.ui.niveauId = id;
    this.ui.selectie = [];
    this.emit('niveau');
  },

  opNiveau(obj) {
    const n = this.niveau;
    if (!n) return true;
    const id = obj.niveauId || (this.project.plan.niveaus[0] && this.project.plan.niveaus[0].id);
    return id === n.id;
  },

  ruimtesVanNiveau() { return this.project.plan.ruimtes.filter((r) => this.opNiveau(r)); },
  murenVanNiveau() { return this.project.plan.muren.filter((m) => this.opNiveau(m)); },
  componentenVanNiveau() { return this.project.componenten.filter((c) => this.opNiveau(c)); },

  // --- Zoekfuncties -------------------------------------------------
  component(id) { return this.project.componenten.find((c) => c.id === id); },
  ruimte(id) { return this.project.plan.ruimtes.find((r) => r.id === id); },
  kring(id) { return this.project.kringen.find((k) => k.id === id); },
  differentieel(id) { return this.project.differentiëlen.find((d) => d.id === id); },
  geselecteerdeObjecten() {
    return this.ui.selectie
      .map((id) => this.component(id) || this.ruimte(id) || null)
      .filter(Boolean);
  },
};

export default store;
