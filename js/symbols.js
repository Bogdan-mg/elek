// Symbolenbibliotheek: elk symbool wordt getekend in een vak van -50..50
// rond de oorsprong. De tekenlaag schaalt dit naar de symboolgrootte in meter.

const A = 'stroke-linecap="round" stroke-linejoin="round"';

/** Tekst die rechtop blijft staan, ook als het symbool gedraaid is. */
function opschrift(tekst, fs, tegenRot = 0) {
  const draai = tegenRot ? ` transform="rotate(${tegenRot})"` : '';
  return `<g${draai}><text x="0" y="1" font-size="${fs}" text-anchor="middle" dominant-baseline="central" ` +
    `stroke="none" fill="currentColor" font-family="system-ui, sans-serif" font-weight="600">${tekst}</text></g>`;
}

/** Rechthoekig symbool met een korte code, voor toestellen en zwakstroom. */
function doos(code, opts = {}) {
  const w = opts.w ?? 46;
  const h = opts.h ?? 30;
  const rond = opts.rond ?? 6;
  const fs = code.length > 2 ? 20 : 26;
  return `<rect x="${-w}" y="${-h}" width="${w * 2}" height="${h * 2}" rx="${rond}" fill="var(--sym-fill)" ${A}/>` +
    opschrift(code, fs, opts.tegenRot || 0);
}

/** Contactdoos: halve cirkel met aardingsstreep (AREI). */
function contactdoos(stemmen = 1, gevuld = false) {
  const vul = gevuld ? 'currentColor' : 'var(--sym-fill)';
  let s = `<path d="M -32 6 A 32 32 0 0 1 32 6 Z" fill="${vul}" ${A}/>`;
  s += `<line x1="-32" y1="6" x2="32" y2="6" ${A}/>`;
  const offsets = stemmen === 1 ? [0] : stemmen === 2 ? [-14, 14] : [-20, 0, 20];
  for (const dx of offsets) s += `<line x1="${dx}" y1="6" x2="${dx}" y2="-40" ${A}/>`;
  return s;
}

/** Schakelaarbasis: scharnierpunt met hefboom. */
function schakelaar(extra = '') {
  return `<circle cx="-26" cy="20" r="7" fill="currentColor" stroke="none"/>` +
    `<line x1="-26" y1="20" x2="16" y2="-26" ${A}/>` + extra;
}

export const SYMBOLEN = {
  // --- Verlichting ---
  lichtpunt: () =>
    `<circle cx="0" cy="0" r="24" fill="var(--sym-fill)"/>` +
    `<line x1="-17" y1="-17" x2="17" y2="17" ${A}/><line x1="17" y1="-17" x2="-17" y2="17" ${A}/>`,
  wandlicht: () =>
    `<path d="M -26 26 A 26 26 0 0 1 26 26 Z" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-40" y1="26" x2="40" y2="26" ${A}/>` +
    `<line x1="-14" y1="12" x2="14" y2="12" ${A}/>`,
  spot: () => `<circle cx="0" cy="0" r="18" fill="var(--sym-fill)"/><circle cx="0" cy="0" r="7" fill="currentColor" stroke="none"/>`,
  tl: () =>
    `<rect x="-44" y="-11" width="88" height="22" rx="4" fill="var(--sym-fill)"/>` +
    `<line x1="-30" y1="0" x2="30" y2="0" ${A}/>`,
  buitenlicht: () =>
    `<circle cx="0" cy="0" r="24" fill="var(--sym-fill)"/>` +
    `<line x1="-17" y1="-17" x2="17" y2="17" ${A}/><line x1="17" y1="-17" x2="-17" y2="17" ${A}/>` +
    `<path d="M -34 34 A 48 48 0 0 0 34 34" fill="none" ${A}/>`,
  noodlicht: () =>
    `<rect x="-30" y="-24" width="60" height="48" rx="5" fill="var(--sym-fill)"/>` +
    `<line x1="-14" y1="-12" x2="14" y2="12" ${A}/><line x1="14" y1="-12" x2="-14" y2="12" ${A}/>`,
  ledstrip: () => `<path d="M -44 0 q 11 -18 22 0 q 11 18 22 0 q 11 -18 22 0" fill="none" ${A}/>`,

  // --- Bediening ---
  schak1: () => schakelaar(),
  schak2: () => schakelaar(`<line x1="-20" y1="12" x2="22" y2="-34" ${A}/>`),
  schak2p: () => schakelaar(`<line x1="-6" y1="-2" x2="6" y2="10" ${A}/><line x1="4" y1="-12" x2="16" y2="0" ${A}/>`),
  wissel: () => schakelaar(`<line x1="16" y1="-26" x2="36" y2="-10" ${A}/><line x1="16" y1="-26" x2="36" y2="-34" ${A}/>`),
  kruis: () => schakelaar(`<line x1="2" y1="-38" x2="30" y2="-10" ${A}/><line x1="30" y1="-38" x2="2" y2="-10" ${A}/>`),
  dimmer: () => schakelaar(`<path d="M -34 34 L 6 34 L -34 6 Z" fill="currentColor" stroke="none"/>`),
  drukknop: () =>
    `<circle cx="0" cy="4" r="20" fill="var(--sym-fill)"/><circle cx="0" cy="4" r="7" fill="currentColor" stroke="none"/>` +
    `<line x1="0" y1="-16" x2="0" y2="-34" ${A}/>`,
  bewegingsmelder: () =>
    `<path d="M -24 16 A 24 24 0 0 1 24 16 Z" fill="var(--sym-fill)" ${A}/><line x1="-30" y1="16" x2="30" y2="16" ${A}/>` +
    `<path d="M -30 -6 A 36 36 0 0 1 30 -6" fill="none" ${A}/>` +
    `<path d="M -40 -22 A 48 48 0 0 1 40 -22" fill="none" ${A}/>`,
  trekschak: () => schakelaar(`<line x1="16" y1="-26" x2="16" y2="-44" stroke-dasharray="6 6" ${A}/>`),
  tijdschak: () => schakelaar(`<circle cx="26" cy="-26" r="14" fill="var(--sym-fill)"/><line x1="26" y1="-26" x2="26" y2="-36" ${A}/><line x1="26" y1="-26" x2="34" y2="-22" ${A}/>`),

  // --- Stopcontacten ---
  sc1: () => contactdoos(1),
  sc2: () => contactdoos(2),
  sc3: () => contactdoos(3),
  scwd: () => contactdoos(1, true),
  scbuiten: () => contactdoos(1, true) + `<path d="M -40 20 A 48 48 0 0 0 40 20" fill="none" ${A}/>`,
  scvloer: () => `<rect x="-42" y="-42" width="84" height="66" rx="5" fill="var(--sym-fill)"/>` + contactdoos(1),
  scgeschakeld: () => contactdoos(1) + `<line x1="20" y1="6" x2="44" y2="-22" ${A}/>`,
  scwerkblad: () => contactdoos(2) + `<line x1="-40" y1="20" x2="40" y2="20" ${A}/>`,

  // --- Vaste toestellen ---
  kookplaat: () =>
    `<rect x="-38" y="-30" width="76" height="60" rx="6" fill="var(--sym-fill)"/>` +
    `<circle cx="-17" cy="-12" r="8" fill="none" ${A}/><circle cx="17" cy="-12" r="8" fill="none" ${A}/>` +
    `<circle cx="-17" cy="14" r="8" fill="none" ${A}/><circle cx="17" cy="14" r="8" fill="none" ${A}/>`,
  oven: () =>
    `<rect x="-36" y="-32" width="72" height="64" rx="6" fill="var(--sym-fill)"/>` +
    `<line x1="-36" y1="-12" x2="36" y2="-12" ${A}/><circle cx="0" cy="12" r="12" fill="none" ${A}/>`,
  vaatwas: (t) => doos('VW', { tegenRot: t }),
  wasmachine: () => `<rect x="-34" y="-34" width="68" height="68" rx="6" fill="var(--sym-fill)"/><circle cx="0" cy="4" r="18" fill="none" ${A}/><line x1="-34" y1="-18" x2="34" y2="-18" ${A}/>`,
  droogkast: () => `<rect x="-34" y="-34" width="68" height="68" rx="6" fill="var(--sym-fill)"/><circle cx="0" cy="4" r="18" fill="none" ${A}/><path d="M -22 -22 q 8 -8 16 0 q 8 8 16 0" fill="none" ${A}/>`,
  boiler: () => `<rect x="-26" y="-36" width="52" height="72" rx="24" fill="var(--sym-fill)"/><path d="M -10 14 q 10 -10 0 -20 M 10 14 q 10 -10 0 -20" fill="none" ${A}/>`,
  koelkast: () => `<rect x="-28" y="-38" width="56" height="76" rx="6" fill="var(--sym-fill)"/><line x1="-28" y1="0" x2="28" y2="0" ${A}/><line x1="-14" y1="-20" x2="-14" y2="-8" ${A}/><line x1="-14" y1="10" x2="-14" y2="22" ${A}/>`,
  diepvries: () => `<rect x="-28" y="-38" width="56" height="76" rx="6" fill="var(--sym-fill)"/><line x1="0" y1="-24" x2="0" y2="24" ${A}/><line x1="-16" y1="-8" x2="16" y2="8" ${A}/><line x1="16" y1="-8" x2="-16" y2="8" ${A}/>`,
  dampkap: () => `<path d="M -40 20 L -22 -20 L 22 -20 L 40 20 Z" fill="var(--sym-fill)" ${A}/><line x1="-14" y1="32" x2="14" y2="32" ${A}/>`,
  ventilatie: () => `<circle cx="0" cy="0" r="32" fill="var(--sym-fill)"/><path d="M 0 0 q -22 -14 -6 -26 q 20 -2 6 26 M 0 0 q 22 -14 26 6 q -8 18 -26 -6 M 0 0 q 0 26 -20 20 q -12 -16 20 -20" fill="none" ${A}/>`,
  airco: () => `<rect x="-42" y="-20" width="84" height="40" rx="8" fill="var(--sym-fill)"/><line x1="-28" y1="8" x2="28" y2="8" ${A}/><line x1="-20" y1="-6" x2="20" y2="-6" ${A}/>`,
  warmtepomp: (t) => doos('WP', { tegenRot: t }),
  laadpaal: () => `<rect x="-22" y="-38" width="44" height="76" rx="8" fill="var(--sym-fill)"/><path d="M 4 -22 L -8 2 L 4 2 L -4 22" fill="none" ${A}/>`,
  convector: () => `<rect x="-42" y="-22" width="84" height="44" rx="5" fill="var(--sym-fill)"/><line x1="-42" y1="-6" x2="42" y2="-6" ${A}/><line x1="-42" y1="8" x2="42" y2="8" ${A}/>`,
  handdoekdroger: () => `<rect x="-26" y="-34" width="52" height="68" rx="6" fill="var(--sym-fill)"/><line x1="-26" y1="-14" x2="26" y2="-14" ${A}/><line x1="-26" y1="4" x2="26" y2="4" ${A}/><line x1="-26" y1="22" x2="26" y2="22" ${A}/>`,
  poort: () => `<rect x="-42" y="-26" width="84" height="52" rx="5" fill="var(--sym-fill)"/><path d="M -24 12 L 0 -12 L 24 12" fill="none" ${A}/>`,
  pomp: () => `<circle cx="0" cy="0" r="30" fill="var(--sym-fill)"/><path d="M -14 14 L 14 -14 M 14 -14 L 4 -14 M 14 -14 L 14 -4" fill="none" ${A}/>`,
  aansluitdoos: () => `<circle cx="0" cy="0" r="26" fill="var(--sym-fill)"/><line x1="0" y1="-26" x2="0" y2="-44" ${A}/><line x1="-12" y1="0" x2="12" y2="0" ${A}/>`,

  // --- Zwakstroom ---
  utp: (t) => doos('UTP', { tegenRot: t }),
  coax: (t) => doos('TV', { tegenRot: t }),
  telefoon: (t) => doos('T', { tegenRot: t }),
  videofoon: (t) => doos('VF', { tegenRot: t }),
  bel: () => `<path d="M -26 18 A 26 30 0 0 1 26 18 Z" fill="var(--sym-fill)" ${A}/><line x1="-34" y1="18" x2="34" y2="18" ${A}/><line x1="0" y1="-14" x2="0" y2="-28" ${A}/>`,
  rookmelder: (t) => `<circle cx="0" cy="0" r="28" fill="var(--sym-fill)" stroke-dasharray="7 6"/>` + opschrift('RM', 22, t),
  thermostaat: (t) => `<circle cx="0" cy="0" r="28" fill="var(--sym-fill)"/>` + opschrift('T°', 24, t),
  wifi: () => `<circle cx="0" cy="26" r="7" fill="currentColor" stroke="none"/><path d="M -20 8 A 28 28 0 0 1 20 8" fill="none" ${A}/><path d="M -34 -8 A 48 48 0 0 1 34 -8" fill="none" ${A}/>`,
  alarm: (t) => doos('AL', { tegenRot: t }),
  luidspreker: () => `<path d="M -26 -14 L -10 -14 L 10 -30 L 10 30 L -10 14 L -26 14 Z" fill="var(--sym-fill)" ${A}/>`,

  // --- Verdeling ---
  verdeelbord: () =>
    `<rect x="-48" y="-30" width="96" height="60" rx="4" fill="var(--sym-fill)"/>` +
    `<line x1="-30" y1="-30" x2="-30" y2="30" ${A}/><line x1="-12" y1="-30" x2="-12" y2="30" ${A}/>` +
    `<line x1="6" y1="-30" x2="6" y2="30" ${A}/><line x1="24" y1="-30" x2="24" y2="30" ${A}/>`,
  teller: (t) => `<circle cx="0" cy="0" r="32" fill="var(--sym-fill)"/>` + opschrift('kWh', 20, t),
  aarding: () => `<line x1="0" y1="-34" x2="0" y2="2" ${A}/><line x1="-30" y1="2" x2="30" y2="2" ${A}/><line x1="-20" y1="16" x2="20" y2="16" ${A}/><line x1="-10" y1="30" x2="10" y2="30" ${A}/>`,
  omvormer: () => `<rect x="-38" y="-28" width="76" height="56" rx="5" fill="var(--sym-fill)"/><line x1="-24" y1="24" x2="24" y2="-24" ${A}/><path d="M -28 -6 q 7 -12 14 0 q 7 12 14 0" fill="none" ${A}/><line x1="4" y1="18" x2="28" y2="18" ${A}/>`,
  noodstop: () => `<circle cx="0" cy="0" r="30" fill="var(--sym-fill)"/><circle cx="0" cy="0" r="16" fill="currentColor" stroke="none"/>`,
};

/**
 * Geeft de SVG-inhoud van een symbool (binnen het -50..50 vak).
 * tegenRot draait het opschrift terug zodat het leesbaar blijft.
 */
export function symbool(type, tegenRot = 0) {
  const fn = SYMBOLEN[type] || SYMBOLEN.aansluitdoos;
  return fn(tegenRot);
}

/** Losstaande SVG voor gebruik in knoppen en lijsten. */
export function symboolIcoon(type, grootte = 28) {
  return `<svg viewBox="-56 -56 112 112" width="${grootte}" height="${grootte}" class="sym-icoon" ` +
    `fill="none" stroke="currentColor" stroke-width="6" aria-hidden="true">${symbool(type)}</svg>`;
}
