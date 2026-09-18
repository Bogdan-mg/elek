// Indeling van het bord: letters voor differentiëlen en kringen, en de
// puntcode van elk toestel (bv. F5 = kring F, aftakking 5). Zo verwijzen
// het situatieschema en het eendraadschema naar dezelfde punten.

import { def, ruimteDef } from './model.js';

/** A, B, … Z, AA, AB, … */
export function letterVan(index) {
  let n = index, uit = '';
  do {
    uit = String.fromCharCode(65 + (n % 26)) + uit;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return uit;
}

/**
 * Verdeelt de componenten van een kring over genummerde aftakkingen:
 * een schakelaar staat samen met de verlichting die hij bedient, en
 * verder krijgt elke groep gelijke toestellen een eigen aftakking.
 */
export function bouwRijen(project, kring) {
  const comps = project.componenten.filter((c) => c.kringId === kring.id);
  const gebruikt = new Set();
  const rijen = [];

  for (const c of comps) {
    if (def(c.type).kringtype !== 'bediening' || gebruikt.has(c.id)) continue;
    const verbonden = project.verbindingen
      .filter((v) => v.van === c.id || v.naar === c.id)
      .map((v) => (v.van === c.id ? v.naar : v.van))
      .map((id) => comps.find((x) => x.id === id))
      .filter((x) => x && !gebruikt.has(x.id));
    gebruikt.add(c.id);
    for (const v of verbonden) gebruikt.add(v.id);
    rijen.push([c, ...verbonden]);
  }

  const groepen = new Map();
  for (const c of comps) {
    if (gebruikt.has(c.id)) continue;
    const r = c.ruimteId && project.plan.ruimtes.find((x) => x.id === c.ruimteId);
    const ruimte = r ? (r.naam || ruimteDef(r.type).naam) : '';
    const sleutel = `${c.type}|${c.label || ''}|${ruimte}`;
    if (!groepen.has(sleutel)) groepen.set(sleutel, []);
    groepen.get(sleutel).push(c);
  }
  const orde = { verlichting: 0, bediening: 1, stopcontact: 2, vast: 3, zwakstroom: 4, verdeling: 5 };
  const rest = [...groepen.values()].sort(
    (a, b) => (orde[def(a[0].type).kringtype] ?? 9) - (orde[def(b[0].type).kringtype] ?? 9)
  );
  return [...rijen, ...rest];
}

/** Kringen per differentieel, in de volgorde waarin ze op het bord staan. */
export function banden(project) {
  const gebruikt = project.differentiëlen.filter((d) => project.kringen.some((k) => k.differentieelId === d.id));
  const lijst = gebruikt.map((d) => ({ dif: d, kringen: project.kringen.filter((k) => k.differentieelId === d.id) }));
  const wees = project.kringen.filter((k) => !gebruikt.some((d) => d.id === k.differentieelId));
  if (wees.length) lijst.push({ dif: null, kringen: wees });
  return lijst;
}

/**
 * Volledige indeling: letter per differentieel en per kring, de
 * aftakkingen van elke kring en de puntcode van elk component.
 */
export function bordIndeling(project) {
  const difLetter = new Map();
  const kringLetter = new Map();
  const rijenVan = new Map();
  const puntcode = new Map();
  const puntnummer = new Map();

  let i = 1;                       // A is de hoofdautomaat met differentieel
  for (const band of banden(project)) {
    if (band.dif) difLetter.set(band.dif.id, letterVan(i++));
    for (const kring of band.kringen) {
      const letter = letterVan(i++);
      kringLetter.set(kring.id, letter);
      const rijen = bouwRijen(project, kring);
      rijenVan.set(kring.id, rijen);
      rijen.forEach((rij, ri) => {
        for (const comp of rij) {
          puntcode.set(comp.id, `${letter}${ri + 1}`);
          puntnummer.set(comp.id, ri + 1);
        }
      });
    }
  }
  return { hoofdletter: 'A', difLetter, kringLetter, rijenVan, puntcode, puntnummer };
}
