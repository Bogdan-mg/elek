// Meetkundige hulpfuncties. Alle coördinaten in meter.

export const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function snap(waarde, raster) {
  if (!raster) return waarde;
  return Math.round(waarde / raster) * raster;
}

export function snapPunt(p, raster) {
  return { x: snap(p.x, raster), y: snap(p.y, raster) };
}

export function puntInPolygoon(p, punten) {
  let binnen = false;
  for (let i = 0, j = punten.length - 1; i < punten.length; j = i++) {
    const a = punten[i], b = punten[j];
    const snijdt = (a.y > p.y) !== (b.y > p.y) &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-9) + a.x;
    if (snijdt) binnen = !binnen;
  }
  return binnen;
}

export function oppervlakte(punten) {
  let s = 0;
  for (let i = 0, j = punten.length - 1; i < punten.length; j = i++) {
    s += (punten[j].x + punten[i].x) * (punten[j].y - punten[i].y);
  }
  return Math.abs(s / 2);
}

export function zwaartepunt(punten) {
  if (!punten.length) return { x: 0, y: 0 };
  const s = punten.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / punten.length, y: s.y / punten.length };
}

export function omhullende(punten) {
  if (!punten || !punten.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of punten) {
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y);
  }
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

/** Dichtstbijzijnde punt op lijnstuk a-b, met afstand en richtingshoek. */
export function projecteerOpSegment(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const punt = { x: a.x + t * vx, y: a.y + t * vy };
  return { punt, afstand: afstand(p, punt), hoek: (Math.atan2(vy, vx) * 180) / Math.PI, t };
}

/** Segmenten van een polygoon (gesloten). */
export function segmenten(punten) {
  const uit = [];
  for (let i = 0; i < punten.length; i++) {
    uit.push([punten[i], punten[(i + 1) % punten.length]]);
  }
  return uit;
}

export function rechthoek(a, b) {
  return [
    { x: a.x, y: a.y },
    { x: b.x, y: a.y },
    { x: b.x, y: b.y },
    { x: a.x, y: b.y },
  ];
}

/** Beperkt een lijn tot horizontaal/verticaal/45° (shift-toets). */
export function orthogonaal(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy) * 2) return { x: b.x, y: a.y };
  if (Math.abs(dy) > Math.abs(dx) * 2) return { x: a.x, y: b.y };
  const m = (Math.abs(dx) + Math.abs(dy)) / 2;
  return { x: a.x + Math.sign(dx) * m, y: a.y + Math.sign(dy) * m };
}

export const graden = (rad) => (rad * 180) / Math.PI;
export const radialen = (deg) => (deg * Math.PI) / 180;
