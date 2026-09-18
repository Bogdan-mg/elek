// Kringen (zekeringen), automatische verdeling en controle volgens
// de gangbare huishoudelijke regels (AREI-richtlijnen).

import {
  uid, def, puntenVan, KRINGSJABLOON, KRINGKLEUREN, maxAmpVoor,
  minSectieVoor, ruimteDef,
} from './model.js';

/* ------------------------------------------------------------------ *
 * Basisbewerkingen
 * ------------------------------------------------------------------ */
export function volgendeKringKleur(project) {
  const gebruikt = new Set(project.kringen.map((k) => k.kleur));
  return KRINGKLEUREN.find((k) => !gebruikt.has(k)) || KRINGKLEUREN[project.kringen.length % KRINGKLEUREN.length];
}

export function maakKring(project, opties = {}) {
  const type = opties.type || 'stopcontact';
  const sjabloon = KRINGSJABLOON[type] || KRINGSJABLOON.gemengd;
  const nr = project.kringen.length + 1;
  const kring = {
    id: uid('kr'),
    nummer: opties.nummer || nr,
    naam: opties.naam || `${sjabloon.naam} ${nr}`,
    type,
    amp: opties.amp ?? sjabloon.amp,
    mm2: opties.mm2 ?? sjabloon.mm2,
    curve: opties.curve || 'C',
    beveiliging: opties.beveiliging || 'automaat',
    differentieelId: opties.differentieelId || (project.differentiëlen[0] && project.differentiëlen[0].id) || null,
    kleur: opties.kleur || volgendeKringKleur(project),
    kortsluit: opties.kortsluit ?? (project.net && project.net.kortsluit) ?? 3000,
    kabel: opties.kabel || 'VOB',
    opmerking: opties.opmerking || '',
  };
  project.kringen.push(kring);
  return kring;
}

export function verwijderKring(project, id) {
  project.kringen = project.kringen.filter((k) => k.id !== id);
  for (const c of project.componenten) if (c.kringId === id) c.kringId = null;
  hernummer(project);
}

export function hernummer(project) {
  project.kringen.forEach((k, i) => { k.nummer = i + 1; });
}

export function componentenVanKring(project, kringId) {
  return project.componenten.filter((c) => c.kringId === kringId);
}

export function puntenInKring(project, kringId) {
  return componentenVanKring(project, kringId).reduce((s, c) => s + puntenVan(c), 0);
}

export function vermogenVanKring(project, kringId) {
  return componentenVanKring(project, kringId).reduce((s, c) => s + (c.watt ?? def(c.type).watt ?? 0), 0);
}

export function maxPuntenVan(kring) {
  const sjabloon = KRINGSJABLOON[kring.type] || KRINGSJABLOON.gemengd;
  return kring.maxPunten ?? sjabloon.maxPunten;
}

/** Componenten die een kring nodig hebben (zwakstroom en verdeling niet). */
export function heeftKringNodig(comp) {
  const d = def(comp.type);
  return d.kringtype === 'verlichting' || d.kringtype === 'stopcontact' ||
    d.kringtype === 'vast' || d.kringtype === 'bediening';
}

/* ------------------------------------------------------------------ *
 * Automatische verdeling
 * ------------------------------------------------------------------ */
function vochtig(project, comp) {
  const d = def(comp.type);
  if (d.nat) return true;
  const r = comp.ruimteId && project.plan.ruimtes.find((x) => x.id === comp.ruimteId);
  return !!(r && ruimteDef(r.type).vochtig);
}

function zorgVoorDifferentieel(project, gevoeligheid) {
  let dif = project.differentiëlen.find((d) => d.gevoeligheid === gevoeligheid);
  if (!dif) {
    dif = {
      id: uid('dif'),
      naam: gevoeligheid === 30 ? 'Vochtige ruimtes' : 'Algemeen',
      gevoeligheid,
      amp: 40,
      type: 'A',
      kortsluit: (project.net && project.net.kortsluit) || 3000,
    };
    project.differentiëlen.push(dif);
  }
  return dif;
}

function ruimteNaam(project, comp) {
  const r = comp.ruimteId && project.plan.ruimtes.find((x) => x.id === comp.ruimteId);
  return r ? (r.naam || ruimteDef(r.type).naam) : 'overige';
}

/**
 * Verdeelt alle componenten automatisch over kringen.
 * Bestaande kringen worden vervangen; handmatige aanpassingen gaan verloren.
 */
export function autoVerdeel(project) {
  project.kringen = [];
  for (const c of project.componenten) c.kringId = null;

  const alg = zorgVoorDifferentieel(project, 300);
  const dif30 = zorgVoorDifferentieel(project, 30);

  const nieuweKring = (type, naam, extra = {}) => {
    const k = maakKring(project, { type, naam, ...extra });
    return k;
  };

  // 1. Vaste toestellen met een eigen kring
  for (const c of project.componenten) {
    const d = def(c.type);
    if (d.kringtype !== 'vast' || !d.eigen) continue;
    const amp = c.amp ?? d.amp ?? 16;
    const k = nieuweKring('vast', `${d.naam}${c.label ? ' ' + c.label : ''}`, {
      amp,
      mm2: Math.max(c.mm2 ?? d.mm2 ?? 2.5, minSectieVoor(amp)),
      differentieelId: (vochtig(project, c) ? dif30 : alg).id,
    });
    c.kringId = k.id;
  }

  // 2. Verlichting en stopcontacten, gegroepeerd per ruimte
  const groepeer = (kringtype) => {
    const perRuimte = new Map();
    for (const c of project.componenten) {
      const d = def(c.type);
      if (d.kringtype !== kringtype || c.kringId) continue;
      const sleutel = ruimteNaam(project, c);
      if (!perRuimte.has(sleutel)) perRuimte.set(sleutel, []);
      perRuimte.get(sleutel).push(c);
    }
    return perRuimte;
  };

  for (const kringtype of ['verlichting', 'stopcontact']) {
    const sjabloon = KRINGSJABLOON[kringtype];
    for (const [naam, lijst] of groepeer(kringtype)) {
      const nat = lijst.some((c) => vochtig(project, c));
      let huidige = null;
      let punten = 0;
      let deel = 1;
      for (const c of lijst) {
        const p = puntenVan(c) || 1;
        if (!huidige || punten + p > sjabloon.maxPunten) {
          const achtervoegsel = deel > 1 ? ` ${deel}` : '';
          huidige = nieuweKring(kringtype, `${sjabloon.naam} ${naam}${achtervoegsel}`, {
            differentieelId: (nat ? dif30 : alg).id,
          });
          punten = 0;
          deel += 1;
        }
        c.kringId = huidige.id;
        punten += p;
      }
    }
  }

  // 3. Overige vaste toestellen (zonder eigen kring) bij de stopcontacten
  //    van hun ruimte, anders een eigen kring.
  for (const c of project.componenten) {
    const d = def(c.type);
    if (d.kringtype !== 'vast' || c.kringId) continue;
    const naam = ruimteNaam(project, c);
    const bestaande = project.kringen.find(
      (k) => k.type === 'stopcontact' && k.naam.endsWith(naam) && puntenInKring(project, k.id) < maxPuntenVan(k)
    );
    if (bestaande) {
      c.kringId = bestaande.id;
    } else {
      const amp = c.amp ?? d.amp ?? 16;
      const k = nieuweKring('vast', `${d.naam} ${naam}`, {
        amp,
        mm2: Math.max(c.mm2 ?? d.mm2 ?? 2.5, minSectieVoor(amp)),
        differentieelId: (vochtig(project, c) ? dif30 : alg).id,
      });
      c.kringId = k.id;
    }
  }

  // 4. Schakelaars volgen de verlichting die ze bedienen, anders de
  //    verlichtingskring van hun ruimte.
  for (const c of project.componenten) {
    const d = def(c.type);
    if (d.kringtype !== 'bediening') continue;
    const verbonden = project.verbindingen
      .filter((v) => v.van === c.id || v.naar === c.id)
      .map((v) => (v.van === c.id ? v.naar : v.van))
      .map((id) => project.componenten.find((x) => x.id === id))
      .filter(Boolean)
      .find((x) => x.kringId);
    if (verbonden) { c.kringId = verbonden.kringId; continue; }
    const naam = ruimteNaam(project, c);
    const kring = project.kringen.find((k) => k.type === 'verlichting' && k.naam.includes(naam)) ||
      project.kringen.find((k) => k.type === 'verlichting');
    if (kring) c.kringId = kring.id;
  }

  hernummer(project);
  return project.kringen.length;
}

/* ------------------------------------------------------------------ *
 * Controle
 * ------------------------------------------------------------------ */
export function controleer(project) {
  const meldingen = [];
  const voegToe = (niveau, tekst, ids = [], bron = '') =>
    meldingen.push({ niveau, tekst, ids, bron });

  // Componenten zonder kring
  const zonder = project.componenten.filter((c) => heeftKringNodig(c) && !c.kringId);
  if (zonder.length) {
    voegToe('waarschuwing',
      `${zonder.length} component${zonder.length > 1 ? 'en hebben' : ' heeft'} nog geen kring toegewezen.`,
      zonder.map((c) => c.id), 'kring');
  }

  for (const k of project.kringen) {
    const comps = componentenVanKring(project, k.id);
    const punten = comps.reduce((s, c) => s + puntenVan(c), 0);
    const max = maxPuntenVan(k);

    if (max && punten > max) {
      voegToe('waarschuwing',
        `Kring ${k.nummer} “${k.naam}”: ${punten} punten, maximaal ${max} toegelaten.`,
        comps.map((c) => c.id), 'punten');
    }

    const maxA = maxAmpVoor(k.mm2);
    if (k.amp > maxA) {
      voegToe('fout',
        `Kring ${k.nummer} “${k.naam}”: automaat ${k.amp} A is te zwaar voor ${k.mm2} mm² (max ${maxA} A).`,
        [], 'kabel');
    }

    if (!k.differentieelId || !project.differentiëlen.find((d) => d.id === k.differentieelId)) {
      voegToe('fout', `Kring ${k.nummer} “${k.naam}” hangt niet achter een differentieel.`, [], 'differentieel');
    }

    if (!comps.length) {
      voegToe('info', `Kring ${k.nummer} “${k.naam}” is leeg.`, [], 'leeg');
    }

    // Toestellen die een eigen kring horen te hebben
    const eigenToestellen = comps.filter((c) => def(c.type).eigen);
    if (eigenToestellen.length && comps.length > eigenToestellen.length) {
      voegToe('waarschuwing',
        `Kring ${k.nummer} “${k.naam}”: ${eigenToestellen.map((c) => def(c.type).naam).join(', ')} hoort op een eigen kring.`,
        eigenToestellen.map((c) => c.id), 'eigenkring');
    } else if (eigenToestellen.length > 1) {
      voegToe('waarschuwing',
        `Kring ${k.nummer} “${k.naam}” bevat meerdere toestellen die elk een eigen kring nodig hebben.`,
        eigenToestellen.map((c) => c.id), 'eigenkring');
    }

    // Belasting tegenover de automaat
    const watt = comps.reduce((s, c) => s + (c.watt ?? def(c.type).watt ?? 0), 0);
    const maxWatt = k.amp * (project.net.spanning || 230);
    if (watt > maxWatt) {
      voegToe('waarschuwing',
        `Kring ${k.nummer} “${k.naam}”: geschat vermogen ${Math.round(watt)} W boven ${Math.round(maxWatt)} W van een ${k.amp} A automaat.`,
        [], 'belasting');
    }

    // Vochtige ruimtes op 30 mA
    const dif = project.differentiëlen.find((d) => d.id === k.differentieelId);
    const natteComps = comps.filter((c) => vochtig(project, c));
    if (natteComps.length && (!dif || dif.gevoeligheid > 30)) {
      voegToe('waarschuwing',
        `Kring ${k.nummer} “${k.naam}” voedt een vochtige ruimte of nat toestel en hoort achter een differentieel van 30 mA.`,
        natteComps.map((c) => c.id), 'rcd30');
    }
  }

  // Differentiëlen
  for (const d of project.differentiëlen) {
    const kringen = project.kringen.filter((k) => k.differentieelId === d.id);
    const somAmp = kringen.reduce((s, k) => s + k.amp, 0);
    if (kringen.length && somAmp > d.amp * 2) {
      voegToe('info',
        `Differentieel “${d.naam}” (${d.amp} A) voedt kringen met samen ${somAmp} A; controleer de gelijktijdigheid.`,
        [], 'diffbelasting');
    }
  }

  if (project.componenten.length && !project.componenten.some((c) => c.type === 'verdeelbord')) {
    voegToe('info', 'Er staat nog geen verdeelbord op het situatieschema.', [], 'bord');
  }

  const orde = { fout: 0, waarschuwing: 1, info: 2 };
  meldingen.sort((a, b) => orde[a.niveau] - orde[b.niveau]);
  return meldingen;
}

export function totaalVermogen(project) {
  return project.componenten.reduce((s, c) => s + (c.watt ?? def(c.type).watt ?? 0), 0);
}
