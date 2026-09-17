// Symbolenbibliotheek volgens AREI Boek 1, tabel 2.23 (grafische symbolen),
// getekend zoals op een situatieschema. Elk symbool past in een vak van
// -50..50 rond de oorsprong; de onderkant (+y) is de kant van de muur,
// zodat wandsymbolen mee draaien met de muur waarop ze staan.

const A = 'stroke-linecap="round" stroke-linejoin="round"';

/** Opschrift dat rechtop blijft staan, ook als het symbool gedraaid is. */
function opschrift(tekst, fs, tegenRot = 0, x = 0, y = 1) {
  const draai = tegenRot ? ` transform="rotate(${tegenRot} ${x} ${y})"` : '';
  return `<g${draai}><text x="${x}" y="${y}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" ` +
    `stroke="none" fill="currentColor" font-family="system-ui, sans-serif" font-weight="600">${tekst}</text></g>`;
}

/* ------------------------------------------------------------------ *
 * Bouwstenen
 * ------------------------------------------------------------------ */

/**
 * Contactdoos (AREI F): een boog met de bolle kant naar de toevoerleiding,
 * met een steel naar de muur. Meerdere dozen worden als meerdere bogen
 * op dezelfde steel getekend.
 */
function contactdoos({ aantal = 1, aarding = true, kind = false, gevuld = false, extra = '' } = {}) {
  const r = aantal > 1 ? 21 : 26;
  const stap = r + 4;
  const voet = 46;
  const eerste = 22;                       // apex van de eerste boog
  const top = eerste - (aantal - 1) * stap;
  let s = `<line x1="0" y1="${voet}" x2="0" y2="${eerste}" ${A}/>`;
  for (let i = 0; i < aantal; i++) {
    const apex = eerste - i * stap;
    const cy = apex - r;
    s += `<path d="M ${-r} ${cy} A ${r} ${r} 0 0 0 ${r} ${cy}" fill="${gevuld ? 'currentColor' : 'none'}" ${A}/>`;
    if (i > 0) s += `<line x1="0" y1="${apex}" x2="0" y2="${apex + stap - 2 * r}" ${A}/>`;
    if (aarding) s += `<line x1="${-r * 0.62}" y1="${apex}" x2="${r * 0.62}" y2="${apex}" ${A}/>`;
    if (kind) {
      s += `<line x1="${-r}" y1="${cy}" x2="${-r - 9}" y2="${cy}" ${A}/>`;
      s += `<line x1="${r}" y1="${cy}" x2="${r + 9}" y2="${cy}" ${A}/>`;
    }
  }
  return s + extra;
}

/**
 * Schakelaar (AREI E): open cirkeltje met hefboom. Het aantal polen wordt
 * met korte dwarsstreepjes op de hefboom aangegeven.
 */
function schakelaar({ polen = 1, haak = true, hefbomen = [[1, 1]], extra = '', kern = 'open' } = {}) {
  const cx = 0, cy = 16, r = 11;
  let s = '';
  for (const [rx, ry] of hefbomen) {
    // hefboom vanaf de rand van de cirkel, onder ±60°
    const bx = cx + rx * 7, by = cy - ry * 8;
    const ex = cx + rx * 27, ey = cy - ry * 40;
    s += `<line x1="${bx}" y1="${by}" x2="${ex}" y2="${ey}" ${A}/>`;
    if (haak) s += `<line x1="${ex}" y1="${ey}" x2="${ex + rx * 17}" y2="${ey - ry * 5}" ${A}/>`;
    for (let i = 1; i < polen; i++) {
      // dwarsstreepje loodrecht op de hefboom
      const t = 0.62 + i * 0.16;
      const px = bx + (ex - bx) * t, py = by + (ey - by) * t;
      const dx = (ex - bx), dy = (ey - by);
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 11, ny = (dx / len) * 11;
      s += `<line x1="${(px - nx).toFixed(1)}" y1="${(py - ny).toFixed(1)}" x2="${(px + nx).toFixed(1)}" y2="${(py + ny).toFixed(1)}" ${A}/>`;
    }
  }
  if (kern === 'kruis') {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--sym-fill)" ${A}/>`;
    s += `<line x1="${cx - 8}" y1="${cy - 8}" x2="${cx + 8}" y2="${cy + 8}" ${A}/>`;
    s += `<line x1="${cx + 8}" y1="${cy - 8}" x2="${cx - 8}" y2="${cy + 8}" ${A}/>`;
  } else {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--sym-fill)" ${A}/>`;
  }
  return s + extra;
}

/** Vast huishoudtoestel (AREI G): rechthoek met toevoerlijn naar de muur. */
function toestel(inhoud = '', { w = 32, h = 28, lijn = true } = {}) {
  let s = `<rect x="${-w}" y="${-h - 4}" width="${w * 2}" height="${h * 2}" fill="var(--sym-fill)" ${A}/>`;
  if (lijn) s += `<line x1="0" y1="${h - 4}" x2="0" y2="46" ${A}/>`;
  return s + inhoud;
}

/** Lichtpunt (AREI G): cirkel met kruis, zoals op het situatieschema. */
function lichtpunt({ r = 24, vulling = 'var(--sym-fill)', extra = '' } = {}) {
  const d = r * 0.72;
  return `<circle cx="0" cy="0" r="${r}" fill="${vulling}" ${A}/>` +
    `<line x1="${-d}" y1="${-d}" x2="${d}" y2="${d}" ${A}/>` +
    `<line x1="${d}" y1="${-d}" x2="${-d}" y2="${d}" ${A}/>` + extra;
}

/** Datacontactdoos (AREI F): haakje met steel naar de muur. */
function datadoos(code = '', tegenRot = 0) {
  let s = `<line x1="0" y1="46" x2="0" y2="14" ${A}/>` +
    `<line x1="-24" y1="14" x2="24" y2="14" ${A}/>` +
    `<line x1="-24" y1="14" x2="-24" y2="-12" ${A}/>` +
    `<line x1="24" y1="14" x2="24" y2="-12" ${A}/>`;
  if (code) s += opschrift(code, code.length > 2 ? 17 : 21, tegenRot, 0, -2);
  return s;
}

/** Arcering: n verticale streepjes binnen een breedte. */
function arcering(x1, x2, y1, y2, n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x1 + ((x2 - x1) * (i + 0.5)) / n;
    s += `<line x1="${x.toFixed(1)}" y1="${y1}" x2="${x.toFixed(1)}" y2="${y2}" ${A}/>`;
  }
  return s;
}

const SNEEUW = (cx, cy, r) => {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const h = (i * Math.PI) / 3;
    const dx = Math.cos(h) * r, dy = Math.sin(h) * r;
    s += `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" ${A}/>`;
  }
  return s;
};

/* ------------------------------------------------------------------ *
 * Symbolen
 * ------------------------------------------------------------------ */
export const SYMBOLEN = {
  // --- G. Verlichting ---------------------------------------------
  lichtpunt: () => lichtpunt(),
  wandlicht: () => lichtpunt({ r: 20, extra: `<line x1="-34" y1="34" x2="34" y2="34" ${A}/>` }),
  spot: () => lichtpunt({ r: 19, extra: `<path d="M -30 -22 A 34 34 0 0 0 -30 22" fill="none" ${A}/>` }),
  tl: () => `<line x1="-44" y1="0" x2="44" y2="0" ${A}/><line x1="-44" y1="-13" x2="-44" y2="13" ${A}/>` +
    `<line x1="44" y1="-13" x2="44" y2="13" ${A}/>`,
  tl3: (t) => `<line x1="-44" y1="0" x2="44" y2="0" ${A}/><line x1="-44" y1="-13" x2="-44" y2="13" ${A}/>` +
    `<line x1="44" y1="-13" x2="44" y2="13" ${A}/><line x1="-6" y1="14" x2="10" y2="-14" ${A}/>` + opschrift('3', 18, t, 22, -20),
  buitenlicht: (t) => lichtpunt({ r: 21 }) + opschrift('h', 20, t, 34, -26),
  noodlicht: () => `<line x1="-26" y1="-26" x2="26" y2="26" ${A}/><line x1="26" y1="-26" x2="-26" y2="26" ${A}/>` +
    `<circle cx="0" cy="0" r="9" fill="currentColor" stroke="none"/>`,
  noodlichtAutonoom: () => `<rect x="-34" y="-34" width="68" height="68" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-22" y1="-22" x2="22" y2="22" ${A}/><line x1="22" y1="-22" x2="-22" y2="22" ${A}/>` +
    `<circle cx="0" cy="0" r="8" fill="currentColor" stroke="none"/>`,
  lichtpuntSchakelaar: () => `<line x1="-26" y1="-26" x2="26" y2="26" ${A}/>` +
    `<line x1="26" y1="-26" x2="-26" y2="26" ${A}/><line x1="26" y1="-26" x2="40" y2="-14" ${A}/>`,
  ledstrip: () => `<path d="M -44 0 q 11 -16 22 0 q 11 16 22 0 q 11 -16 22 0" fill="none" ${A}/>`,

  // --- E. Schakelaars ----------------------------------------------
  schak1: () => schakelaar({ polen: 1, haak: false }),
  schak2: () => schakelaar({ hefbomen: [[1, 1], [-1, 1]] }),
  schak2p: () => schakelaar({ polen: 2 }),
  schak3p: () => schakelaar({ polen: 3 }),
  wissel: () => schakelaar({ hefbomen: [[1, 1], [-1, -0.62]] }),
  wissel2p: () => schakelaar({ polen: 2, hefbomen: [[1, 1], [-1, -0.62]] }),
  kruis: () => schakelaar({ hefbomen: [[1, 1], [-1, 1], [1, -0.62], [-1, -0.62]] }),
  dimmer: () => schakelaar({
    haak: false,
    hefbomen: [[1, 0.72]],
    extra: `<path d="M 22 -16 L 46 -24 L 40 -4 Z" fill="var(--sym-fill)" ${A}/>`,
  }),
  trekschak: () => schakelaar({ extra: `<path d="M 30 -30 L 30 -8 M 26 -14 L 30 -6 L 34 -14" fill="none" ${A}/>` }),
  schakVerklikker: () => schakelaar({ kern: 'kruis' }),
  schakSignalisatie: () => schakelaar({
    extra: `<line x1="-11" y1="16" x2="-30" y2="16" ${A}/><circle cx="-41" cy="16" r="11" fill="var(--sym-fill)" ${A}/>` +
      `<line x1="-49" y1="8" x2="-33" y2="24" ${A}/><line x1="-33" y1="8" x2="-49" y2="24" ${A}/>`,
  }),
  drukknop: () => `<circle cx="0" cy="8" r="24" fill="var(--sym-fill)" ${A}/><circle cx="0" cy="8" r="10" fill="none" ${A}/>` +
    `<line x1="0" y1="32" x2="0" y2="46" ${A}/>`,
  drukknopLamp: () => `<circle cx="0" cy="8" r="24" fill="var(--sym-fill)" ${A}/><circle cx="0" cy="8" r="11" fill="none" ${A}/>` +
    `<line x1="-8" y1="0" x2="8" y2="16" ${A}/><line x1="8" y1="0" x2="-8" y2="16" ${A}/>` +
    `<line x1="0" y1="32" x2="0" y2="46" ${A}/>`,
  tijdschak: (t) => `<rect x="-30" y="-18" width="60" height="36" fill="var(--sym-fill)" ${A}/>` + opschrift('t', 22, t) +
    `<line x1="0" y1="18" x2="0" y2="46" ${A}/>`,
  schakelklok: () => `<rect x="-38" y="-18" width="76" height="36" fill="var(--sym-fill)" ${A}/>` +
    `<circle cx="-18" cy="0" r="12" fill="none" ${A}/><line x1="-18" y1="0" x2="-18" y2="-9" ${A}/><line x1="-18" y1="0" x2="-11" y2="4" ${A}/>` +
    `<path d="M 2 6 L 14 6 L 30 -6" fill="none" ${A}/><line x1="0" y1="18" x2="0" y2="46" ${A}/>`,
  impulsschakelaar: () => `<rect x="-34" y="-18" width="68" height="36" fill="var(--sym-fill)" ${A}/>` +
    `<path d="M -22 6 L -8 6 L -8 -8" fill="none" ${A}/><path d="M 8 -8 L 8 6 L 22 6" fill="none" ${A}/>` +
    `<line x1="0" y1="18" x2="0" y2="46" ${A}/>`,
  thermostaat: () => `<rect x="-32" y="-18" width="64" height="36" fill="var(--sym-fill)" ${A}/>` +
    `<circle cx="0" cy="0" r="12" fill="none" ${A}/><line x1="-8" y1="0" x2="8" y2="0" ${A}/>` +
    `<line x1="0" y1="18" x2="0" y2="46" ${A}/>`,
  bewegingsmelder: (t) => `<rect x="-26" y="-22" width="52" height="44" fill="var(--sym-fill)" ${A}/>` +
    `<path d="M -6 -10 A 14 14 0 0 1 -6 10 M 4 -14 A 19 19 0 0 1 4 14" fill="none" ${A}/>` +
    opschrift('*', 20, t, -14, 2) + `<line x1="0" y1="22" x2="0" y2="46" ${A}/>`,
  deurslot: () => `<rect x="-30" y="-20" width="60" height="40" fill="var(--sym-fill)" ${A}/>` +
    `<path d="M -18 6 q 6 -18 12 0 q 6 18 12 0 q 6 -18 12 0" fill="none" ${A}/>` +
    `<line x1="0" y1="20" x2="0" y2="46" ${A}/>`,

  // --- F. Contactdozen ----------------------------------------------
  sc1: () => contactdoos({ aantal: 1 }),
  sc2: () => contactdoos({ aantal: 2 }),
  sc3: () => contactdoos({ aantal: 3 }),
  sckind: () => contactdoos({ aantal: 1, kind: true }),
  scwd: (t) => contactdoos({ aantal: 1, extra: opschrift('h', 22, t, 38, -10) }),
  scbuiten: (t) => contactdoos({ aantal: 1, extra: opschrift('h', 22, t, 38, -10) }),
  scvloer: () => `<rect x="-42" y="-40" width="84" height="84" fill="var(--sym-fill)" ${A}/>` + contactdoos({ aantal: 1 }),
  scgeschakeld: () => contactdoos({
    aantal: 1,
    extra: `<line x1="4" y1="18" x2="30" y2="-18" ${A}/><line x1="30" y1="-18" x2="46" y2="-22" ${A}/>` +
      `<line x1="20" y1="-16" x2="32" y2="-8" ${A}/>`,
  }),
  scwerkblad: () => contactdoos({ aantal: 2 }),
  sckracht: (t) => contactdoos({ aantal: 1, extra: opschrift('3F', 18, t, 40, -12) }),
  scscheer: () => contactdoos({
    aantal: 1, aarding: false,
    extra: `<circle cx="0" cy="-8" r="22" fill="none" ${A}/>`,
  }),
  utp: (t) => datadoos('UTP', t),
  coax: (t) => datadoos('TV', t),
  telefoon: (t) => datadoos('T', t),
  videofoon: (t) => datadoos('VF', t),
  data: () => datadoos(''),

  // --- G. Gebruikstoestellen ----------------------------------------
  aansluitdoos: () => `<circle cx="0" cy="0" r="22" fill="var(--sym-fill)" ${A}/><line x1="0" y1="22" x2="0" y2="46" ${A}/>`,
  aftakdoos: () => `<circle cx="0" cy="0" r="22" fill="var(--sym-fill)" ${A}/>` +
    `<circle cx="0" cy="0" r="9" fill="currentColor" stroke="none"/><line x1="0" y1="22" x2="0" y2="46" ${A}/>`,
  toestel: () => toestel(''),
  kookplaat: () => toestel(
    `<circle cx="-14" cy="-14" r="5" fill="currentColor" stroke="none"/><circle cx="14" cy="-14" r="5" fill="currentColor" stroke="none"/>` +
    `<circle cx="-14" cy="8" r="5" fill="currentColor" stroke="none"/><circle cx="14" cy="8" r="5" fill="currentColor" stroke="none"/>`),
  oven: () => toestel(`<line x1="-32" y1="-14" x2="32" y2="-14" ${A}/><circle cx="0" cy="8" r="7" fill="currentColor" stroke="none"/>`),
  microgolf: () => toestel(`<path d="M -20 -10 q 7 -10 14 0 q 7 10 14 0" fill="none" ${A}/>` +
    `<path d="M -20 8 q 7 -10 14 0 q 7 10 14 0" fill="none" ${A}/>`),
  wasmachine: () => toestel(`<circle cx="0" cy="-3" r="17" fill="none" ${A}/><circle cx="0" cy="-3" r="7" fill="currentColor" stroke="none"/>`),
  droogkast: () => toestel(`<circle cx="-9" cy="-14" r="7" fill="none" ${A}/><circle cx="9" cy="-14" r="7" fill="none" ${A}/>` +
    `<circle cx="0" cy="8" r="7" fill="currentColor" stroke="none"/>`),
  vaatwas: () => toestel(`<line x1="-32" y1="-32" x2="32" y2="24" ${A}/><line x1="32" y1="-32" x2="-32" y2="24" ${A}/>`),
  koelkast: () => toestel(SNEEUW(0, -4, 20)),
  diepvries: () => toestel(SNEEUW(-19, -4, 11) + SNEEUW(0, -4, 11) + SNEEUW(19, -4, 11), { w: 38, h: 24 }),
  dampkap: () => `<path d="M -40 16 L -22 -18 L 22 -18 L 40 16 Z" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="0" y1="16" x2="0" y2="46" ${A}/>`,
  boiler: () => `<circle cx="0" cy="-2" r="30" fill="var(--sym-fill)" ${A}/>` + arcering(-20, 20, -26, 22, 6) +
    `<line x1="0" y1="28" x2="0" y2="46" ${A}/>`,
  convector: () => toestel(arcering(-26, 26, -26, 18, 7), { w: 32, h: 26 }),
  handdoekdroger: () => toestel(arcering(-18, 18, -26, 18, 4), { w: 24, h: 26 }),
  ventilatie: () => toestel(`<circle cx="-11" cy="-4" r="11" fill="none" ${A}/><circle cx="11" cy="-4" r="11" fill="none" ${A}/>`, { w: 32, h: 22 }),
  airco: () => toestel(`<circle cx="-13" cy="-6" r="10" fill="none" ${A}/><circle cx="13" cy="-6" r="10" fill="none" ${A}/>` +
    `<line x1="-24" y1="12" x2="24" y2="12" ${A}/>`, { w: 34, h: 24 }),
  warmtepomp: (t) => toestel(opschrift('WP', 20, t, 0, -6), { w: 32, h: 26 }),
  motor: (t) => `<circle cx="0" cy="0" r="26" fill="var(--sym-fill)" ${A}/>` + opschrift('M', 26, t) +
    `<line x1="0" y1="26" x2="0" y2="46" ${A}/>`,
  pomp: (t) => `<circle cx="0" cy="0" r="26" fill="var(--sym-fill)" ${A}/>` + opschrift('P', 24, t) +
    `<line x1="0" y1="26" x2="0" y2="46" ${A}/>`,
  poort: () => toestel(`<path d="M -22 10 L 0 -14 L 22 10" fill="none" ${A}/>`, { w: 30, h: 22 }),
  laadpaal: (t) => `<rect x="-24" y="-34" width="48" height="60" rx="3" fill="var(--sym-fill)" ${A}/>` +
    `<rect x="-16" y="-26" width="32" height="18" fill="none" ${A}/>` + opschrift('EV', 16, t, 0, 8) +
    `<line x1="24" y1="-20" x2="34" y2="-20" ${A}/><line x1="34" y1="-24" x2="34" y2="-6" ${A}/>` +
    `<line x1="0" y1="26" x2="0" y2="46" ${A}/>`,
  bel: () => `<path d="M 6 -24 A 24 24 0 0 1 6 24 Z" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-34" y1="0" x2="6" y2="0" ${A}/><line x1="0" y1="24" x2="0" y2="46" ${A}/>`,
  zoemer: () => `<path d="M 6 -22 A 22 22 0 0 1 6 22 Z" fill="var(--sym-fill)" ${A}/>` +
    `<path d="M 6 -22 L 6 22" fill="none" ${A}/><line x1="-34" y1="0" x2="6" y2="0" ${A}/>` +
    `<line x1="0" y1="22" x2="0" y2="46" ${A}/>`,
  sirene: () => `<path d="M -16 -24 L 30 0 L -16 24 Z" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-40" y1="0" x2="-16" y2="0" ${A}/><line x1="0" y1="24" x2="0" y2="46" ${A}/>`,
  rookmelder: (t) => `<rect x="-28" y="-24" width="56" height="48" fill="var(--sym-fill)" ${A}/>` +
    opschrift('RM', 19, t, 0, 0),
  alarm: (t) => `<rect x="-28" y="-24" width="56" height="48" fill="var(--sym-fill)" ${A}/>` + opschrift('AL', 19, t, 0, 0),
  camera: () => `<rect x="-26" y="-16" width="44" height="30" fill="var(--sym-fill)" ${A}/>` +
    `<path d="M 18 -8 L 34 -18 L 34 16 L 18 6 Z" fill="var(--sym-fill)" ${A}/><line x1="0" y1="14" x2="0" y2="46" ${A}/>`,
  intercom: (t) => `<rect x="-24" y="-26" width="48" height="52" rx="4" fill="var(--sym-fill)" ${A}/>` +
    opschrift('IC', 18, t, 0, -4) + `<line x1="0" y1="26" x2="0" y2="46" ${A}/>`,
  luidspreker: () => `<path d="M -22 -12 L -8 -12 L 10 -28 L 10 28 L -8 12 L -22 12 Z" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="0" y1="28" x2="0" y2="46" ${A}/>`,
  wifi: () => `<circle cx="0" cy="26" r="7" fill="currentColor" stroke="none"/>` +
    `<path d="M -20 8 A 28 28 0 0 1 20 8" fill="none" ${A}/><path d="M -34 -8 A 48 48 0 0 1 34 -8" fill="none" ${A}/>`,
  domotica: (t) => `<rect x="-28" y="-30" width="56" height="60" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-28" y1="0" x2="28" y2="0" ${A}/>` + opschrift('))', 18, t, 0, -15) +
    `<circle cx="0" cy="16" r="9" fill="none" ${A}/><line x1="6" y1="10" x2="20" y2="-2" ${A}/>`,
  horloge: () => `<circle cx="0" cy="0" r="26" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="0" y1="0" x2="0" y2="-16" ${A}/><line x1="0" y1="0" x2="12" y2="4" ${A}/>` +
    `<circle cx="0" cy="0" r="4" fill="currentColor" stroke="none"/><line x1="0" y1="26" x2="0" y2="46" ${A}/>`,

  // --- Bouwkundig (alleen als pictogram in het palet; op het plan worden
  //     deze op ware breedte in de muur getekend) ------------------------
  deur: () => `<line x1="-46" y1="30" x2="-30" y2="30" ${A}/><line x1="30" y1="30" x2="46" y2="30" ${A}/>` +
    `<line x1="-30" y1="30" x2="-30" y2="-26" ${A}/>` +
    `<path d="M -30 -26 A 56 56 0 0 1 26 30" fill="none" stroke-dasharray="7 6" ${A}/>`,
  deurDubbel: () => `<line x1="-48" y1="30" x2="-36" y2="30" ${A}/><line x1="36" y1="30" x2="48" y2="30" ${A}/>` +
    `<line x1="-36" y1="30" x2="-36" y2="-10" ${A}/><line x1="36" y1="30" x2="36" y2="-10" ${A}/>` +
    `<path d="M -36 -10 A 40 40 0 0 1 4 30" fill="none" stroke-dasharray="6 5" ${A}/>` +
    `<path d="M 36 -10 A 40 40 0 0 0 -4 30" fill="none" stroke-dasharray="6 5" ${A}/>`,
  schuifdeur: () => `<line x1="-46" y1="18" x2="-4" y2="18" stroke-width="9" ${A}/>` +
    `<line x1="4" y1="34" x2="46" y2="34" stroke-width="9" ${A}/>` +
    `<path d="M 6 -8 L 40 -8 M 30 -20 L 42 -8 L 30 4" fill="none" ${A}/>`,
  doorgang: () => `<line x1="-46" y1="22" x2="-24" y2="22" ${A}/><line x1="24" y1="22" x2="46" y2="22" ${A}/>` +
    `<line x1="-24" y1="4" x2="-24" y2="40" ${A}/><line x1="24" y1="4" x2="24" y2="40" ${A}/>`,
  raam: () => `<line x1="-46" y1="6" x2="46" y2="6" ${A}/><line x1="-46" y1="34" x2="46" y2="34" ${A}/>` +
    `<line x1="-46" y1="20" x2="46" y2="20" ${A}/><line x1="-46" y1="6" x2="-46" y2="34" ${A}/>` +
    `<line x1="46" y1="6" x2="46" y2="34" ${A}/>`,
  terrasdeur: () => `<line x1="-46" y1="6" x2="46" y2="6" ${A}/><line x1="-46" y1="34" x2="46" y2="34" ${A}/>` +
    `<line x1="-46" y1="20" x2="46" y2="20" ${A}/><line x1="0" y1="6" x2="0" y2="34" ${A}/>` +
    `<line x1="-46" y1="6" x2="-46" y2="34" ${A}/><line x1="46" y1="6" x2="46" y2="34" ${A}/>`,
  garagepoort: () => `<rect x="-46" y="4" width="92" height="32" fill="none" ${A}/>` +
    `<line x1="-24" y1="4" x2="-24" y2="36" ${A}/><line x1="0" y1="4" x2="0" y2="36" ${A}/>` +
    `<line x1="24" y1="4" x2="24" y2="36" ${A}/>`,
  trap: () => `<rect x="-26" y="-42" width="52" height="84" fill="none" ${A}/>` +
    `<line x1="-26" y1="-21" x2="26" y2="-21" ${A}/><line x1="-26" y1="0" x2="26" y2="0" ${A}/>` +
    `<line x1="-26" y1="21" x2="26" y2="21" ${A}/>` +
    `<path d="M 0 34 L 0 -30 M -8 -20 L 0 -32 L 8 -20" fill="none" ${A}/>`,

  // --- B/H. Bord, bronnen en aarding ---------------------------------
  verdeelbord: () => `<rect x="-46" y="-16" width="92" height="32" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-30" y1="-16" x2="-30" y2="-30" ${A}/><line x1="-14" y1="-16" x2="-14" y2="-30" ${A}/>` +
    `<line x1="2" y1="-16" x2="2" y2="-30" ${A}/><line x1="18" y1="-16" x2="18" y2="-30" ${A}/>` +
    `<line x1="34" y1="-16" x2="34" y2="-30" ${A}/>`,
  teller: (t) => `<rect x="-34" y="-22" width="68" height="44" fill="var(--sym-fill)" ${A}/>` +
    opschrift('kWh', 18, t, 0, 0) + `<line x1="-34" y1="0" x2="-48" y2="0" ${A}/>`,
  aarding: () => `<line x1="0" y1="-30" x2="0" y2="0" ${A}/><line x1="-30" y1="0" x2="30" y2="0" ${A}/>` +
    `<line x1="-19" y1="12" x2="19" y2="12" ${A}/><line x1="-9" y1="24" x2="9" y2="24" ${A}/>`,
  aardingsonderbreker: () => `<line x1="-40" y1="0" x2="-14" y2="0" ${A}/><line x1="14" y1="0" x2="40" y2="0" ${A}/>` +
    `<line x1="-14" y1="-14" x2="-14" y2="14" ${A}/><line x1="14" y1="-14" x2="14" y2="14" ${A}/>`,
  transformator: () => `<circle cx="-13" cy="0" r="20" fill="none" ${A}/><circle cx="13" cy="0" r="20" fill="none" ${A}/>` +
    `<line x1="0" y1="20" x2="0" y2="46" ${A}/>`,
  omvormer: (t) => `<rect x="-32" y="-26" width="64" height="52" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-26" y1="22" x2="26" y2="-22" ${A}/>` +
    `<line x1="-24" y1="-14" x2="-6" y2="-14" ${A}/><line x1="-24" y1="-6" x2="-6" y2="-6" ${A}/>` +
    `<path d="M 4 12 q 6 -12 12 0 q 6 12 12 0" fill="none" ${A}/><line x1="0" y1="26" x2="0" y2="46" ${A}/>`,
  zonnepaneel: () => `<rect x="-32" y="-24" width="64" height="48" fill="var(--sym-fill)" ${A}/>` +
    `<line x1="-32" y1="0" x2="32" y2="0" ${A}/><path d="M 4 -20 L -10 -6 M -4 -18 L -14 -8" fill="none" ${A}/>` +
    `<path d="M -14 -8 L -4 -8 M -14 -8 L -14 -18" fill="none" ${A}/><line x1="0" y1="24" x2="0" y2="46" ${A}/>`,
  noodstop: () => `<circle cx="0" cy="0" r="26" fill="var(--sym-fill)" ${A}/>` +
    `<circle cx="0" cy="0" r="13" fill="currentColor" stroke="none"/><line x1="0" y1="26" x2="0" y2="46" ${A}/>`,
};

/**
 * SVG-inhoud van een symbool binnen het vak -50..50.
 * tegenRot draait opschriften terug zodat ze leesbaar blijven.
 */
export function symbool(type, tegenRot = 0) {
  const fn = SYMBOLEN[type] || SYMBOLEN.aansluitdoos;
  return fn(tegenRot);
}

/** Losstaand symbool voor knoppen, lijsten en de legende. */
export function symboolIcoon(type, grootte = 28) {
  return `<svg viewBox="-58 -58 116 116" width="${grootte}" height="${grootte}" class="sym-icoon" ` +
    `fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbool(type)}</svg>`;
}
