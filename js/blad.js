// Bladen van het dossier: elk schema staat op een blad van A3-formaat met
// een kader en een titelhoek, zoals in een Trikker-dossier.

import { def } from './model.js';
import { escape } from './canvas.js';

// A3 liggend op ongeveer 96 dpi
export const BLAD = {
  breedte: 1587,
  hoogte: 1123,
  marge: 26,
  titel: 96,
  kop: 34,          // ruimte bovenaan voor de naam van het blad
};

/** Vak waarin de tekening past. */
export function bladVak() {
  return {
    x: BLAD.marge + 10,
    y: BLAD.marge + BLAD.kop,
    w: BLAD.breedte - (BLAD.marge + 10) * 2,
    h: BLAD.hoogte - BLAD.marge * 2 - BLAD.kop - BLAD.titel - 10,
  };
}

/** Kader en titelhoek van één blad, op positie (x, y) binnen een grotere SVG. */
export function bladKader({ x = 0, y = 0, project, soort = 'Eendraadschema', subtitel = '', blad = 1, bladen = 1 }) {
  const inst = project.installateur || {};
  const fasen = project.net.fasen || 1;
  const m = BLAD.marge / 2;
  const tb = BLAD.breedte - BLAD.marge;
  const th = BLAD.titel;
  const ty = BLAD.hoogte - m - th;
  const k1 = tb * 0.5, k2 = tb * 0.78;
  const rand = 'var(--rand)';
  const datum = new Date(project.gewijzigd || Date.now()).toLocaleDateString('nl-BE');

  let s = `<g transform="translate(${x} ${y})">`;
  s += `<rect x="0" y="0" width="${BLAD.breedte}" height="${BLAD.hoogte}" fill="var(--vlak)"/>`;
  s += `<rect x="${m}" y="${m}" width="${tb}" height="${BLAD.hoogte - BLAD.marge}" fill="none" stroke="${rand}" stroke-width="1.5"/>`;
  if (subtitel) {
    s += `<text x="${m + 14}" y="${m + 24}" font-size="15" font-weight="700" fill="var(--tekst)">${escape(subtitel)}</text>`;
  }
  // titelhoek
  s += `<rect x="${m}" y="${ty}" width="${tb}" height="${th}" fill="none" stroke="${rand}" stroke-width="1.5"/>`;
  s += `<line x1="${m + k1}" y1="${ty}" x2="${m + k1}" y2="${ty + th}" stroke="${rand}" stroke-width="1.5"/>`;
  s += `<line x1="${m + k2}" y1="${ty}" x2="${m + k2}" y2="${ty + th}" stroke="${rand}" stroke-width="1.5"/>`;
  const t = (tx2, ty2, tekst, grootte = 11, vet = false, kleur = 'var(--tekst)') =>
    `<text x="${tx2}" y="${ty2}" font-size="${grootte}" ${vet ? 'font-weight="700" ' : ''}fill="${kleur}">${tekst}</text>`;
  s += t(m + 14, ty + 22, 'Plaats van de elektrische installatie', 11, true);
  s += t(m + 24, ty + 42, escape(project.klant || ''));
  s += t(m + 24, ty + 60, escape(project.adres || ''));
  s += t(m + k1 + 14, ty + 22, 'Installateur', 11, true);
  s += t(m + k1 + 24, ty + 42, escape(inst.naam || ''));
  s += t(m + k1 + 24, ty + 60, [inst.btw, inst.telefoon].filter(Boolean).map(escape).join(' · '), 10, false, 'var(--tekst-zacht)');
  s += t(m + k2 + 14, ty + 22, `p. ${blad}/${bladen}`, 11, true);
  s += t(m + k2 + 14, ty + 40, escape(soort), 11, true);
  s += t(m + k2 + 14, ty + 58, fasen === 3 ? '3 x 400V + N ~ 50Hz' : '2 x 230V ~ 50Hz');
  s += t(m + k2 + 14, ty + 76, datum, 10, false, 'var(--tekst-zacht)');
  s += `<text x="${m + 14}" y="${ty + 82}" font-size="9" fill="var(--tekst-zacht)">` +
    `Opgemaakt met Elek · ${project.kringen.length} kringen · ` +
    `${project.componenten.filter((c) => def(c.type).kringtype !== 'bouw').length} punten · ` +
    `controle op basis van gangbare AREI-vuistregels, geen keuringsverslag.</text>`;
  s += '</g>';
  return s;
}

/**
 * Zet tekeninhoud geschaald in het vak van een blad.
 * `inhoud` is een SVG-groep in eigen eenheden met afmeting (bw, bh).
 */
export function bladInhoud({ x = 0, y = 0, inhoud, bw, bh, passend = true, links = false, verticaal = 'midden' }) {
  const vak = bladVak();
  const schaal = passend ? Math.min(1, vak.w / Math.max(bw, 1), vak.h / Math.max(bh, 1)) : 1;
  const dx = links ? vak.x : vak.x + (vak.w - bw * schaal) / 2;
  const ruimte = vak.h - bh * schaal;
  const dy = vak.y + (verticaal === 'onder' ? ruimte : verticaal === 'boven' ? 0 : ruimte / 2);
  return `<g transform="translate(${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}) scale(${schaal.toFixed(4)})">${inhoud}</g>`;
}
