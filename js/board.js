// Verdeelbordweergave: eendraadschema van teller tot kring, plus de
// overzichtslijst "welke component op welke zekering".

import store from './store.js';
import { def, ruimteDef, puntenVan } from './model.js';
import { componentenVanKring, puntenInKring, vermogenVanKring } from './circuits.js';
import { symbool } from './symbols.js';
import { escape } from './canvas.js';

const KOL = 140;    // kolombreedte per kring
const KOP = 104;    // hoogte van het kopblok (teller + hoofdautomaat)
const RIJ = 336;   // hoogte van een differentieelblok

/** Kabelaanduiding volgens AREI: aantal geleiders + doorsnede, bv. 3G2,5. */
export function kabelTekst(kring, fasen = 1) {
  const geleiders = kring.type === 'vast' && kring.amp >= 32 && fasen === 3 ? 5 : 3;
  return `${geleiders}G${String(kring.mm2).replace('.', ',')}`;
}

/**
 * Automatische schakelaar (AREI D): inkomende lijn, scharnierpunt en
 * gebogen hefboom, met de uitgaande lijn eronder.
 */
function automaatGlyph(x, y, kleur, lijn = 2.2) {
  return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 9}" stroke="${kleur}" stroke-width="${lijn}"/>` +
    `<circle cx="${x}" cy="${y + 9}" r="3.4" fill="${kleur}"/>` +
    `<path d="M ${x} ${y + 9} q -11 10 -9 21" fill="none" stroke="${kleur}" stroke-width="${lijn}" stroke-linecap="round"/>` +
    `<line x1="${x}" y1="${y + 30}" x2="${x}" y2="${y + 42}" stroke="${kleur}" stroke-width="${lijn}"/>`;
}

/** Differentieel (AREI D): automaatsymbool met de ringkern. */
function differentieelGlyph(x, y, kleur) {
  return automaatGlyph(x, y, kleur, 2.4) +
    `<ellipse cx="${x + 13}" cy="${y + 22}" rx="15" ry="7" fill="none" stroke="${kleur}" stroke-width="2" ` +
    `transform="rotate(-18 ${x + 13} ${y + 22})"/>` +
    `<line x1="${x - 4}" y1="${y + 22}" x2="${x + 6}" y2="${y + 22}" stroke="${kleur}" stroke-width="1.6" stroke-dasharray="3 3"/>`;
}

/** Leiding met n geleiders (AREI C): schuine streep met het aantal. */
function leidingGlyph(x, y, aantal, kleur) {
  return `<line x1="${x - 9}" y1="${y + 8}" x2="${x + 9}" y2="${y - 8}" stroke="${kleur}" stroke-width="1.8"/>` +
    `<text x="${x + 12}" y="${y - 6}" font-size="10" fill="var(--tekst-zacht)">${aantal}</text>`;
}

function tekstRegels(tekst, max = 18) {
  const woorden = String(tekst).split(' ');
  const regels = [];
  let huidig = '';
  for (const w of woorden) {
    if ((huidig + ' ' + w).trim().length > max && huidig) { regels.push(huidig); huidig = w; }
    else huidig = (huidig + ' ' + w).trim();
  }
  if (huidig) regels.push(huidig);
  return regels.slice(0, 3);
}

/** Eendraadschema van het verdeelbord als SVG-string. */
export function bouwBordSVG(project = store.project) {
  const differentiëlen = project.differentiëlen.filter(
    (d) => project.kringen.some((k) => k.differentieelId === d.id)
  );
  const wees = project.kringen.filter((k) => !differentiëlen.some((d) => d.id === k.differentieelId));
  const blokken = differentiëlen.map((d) => ({
    dif: d,
    kringen: project.kringen.filter((k) => k.differentieelId === d.id),
  }));
  if (wees.length) blokken.push({ dif: null, kringen: wees });

  const maxKringen = Math.max(1, ...blokken.map((b) => b.kringen.length));
  const breedte = Math.max(680, 190 + maxKringen * KOL);
  const hoogte = KOP + blokken.length * RIJ + 40;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breedte} ${hoogte}" width="${breedte}" height="${hoogte}" class="bord-svg" font-family="system-ui, sans-serif">`;
  s += `<rect x="0" y="0" width="${breedte}" height="${hoogte}" fill="var(--vlak)"/>`;

  const xStart = 64;
  const kleurLijn = 'var(--symbool)';
  // Kopblok: kWh-teller en hoofdautomaat (AREI G en D)
  s += `<rect x="${xStart - 24}" y="12" width="48" height="32" fill="var(--sym-fill)" stroke="${kleurLijn}" stroke-width="2"/>`;
  s += `<text x="${xStart}" y="29" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="var(--tekst)">kWh</text>`;
  s += `<line x1="${xStart}" y1="44" x2="${xStart}" y2="52" stroke="${kleurLijn}" stroke-width="2"/>`;
  s += automaatGlyph(xStart, 52, kleurLijn);
  s += `<text x="${xStart + 16}" y="74" font-size="12" font-weight="700" fill="var(--tekst)">${project.net.hoofdzekering} A</text>`;
  s += `<text x="${xStart + 46}" y="24" font-size="12" fill="var(--tekst-zacht)">${project.net.fasen === 3 ? '3F+N 400 V ~ 50 Hz' : '1F+N 230 V ~ 50 Hz'}</text>`;
  s += `<text x="${xStart + 46}" y="41" font-size="12" font-weight="600" fill="var(--tekst)">${escape(project.naam || '')}</text>`;
  // aardelektrode
  s += `<line x1="${xStart - 46}" y1="28" x2="${xStart - 24}" y2="28" stroke="${kleurLijn}" stroke-width="2"/>`;
  s += `<line x1="${xStart - 46}" y1="28" x2="${xStart - 46}" y2="50" stroke="${kleurLijn}" stroke-width="2"/>`;
  s += `<line x1="${xStart - 58}" y1="50" x2="${xStart - 34}" y2="50" stroke="${kleurLijn}" stroke-width="2"/>`;
  s += `<line x1="${xStart - 53}" y1="56" x2="${xStart - 39}" y2="56" stroke="${kleurLijn}" stroke-width="2"/>`;
  s += `<line x1="${xStart - 49}" y1="62" x2="${xStart - 43}" y2="62" stroke="${kleurLijn}" stroke-width="2"/>`;

  let y = KOP + 30;
  for (const blok of blokken) {
    const barY = y + 58;
    // Verticale voeding naar het differentieel
    s += `<line x1="${xStart}" y1="${y - 14}" x2="${xStart}" y2="${y + 16}" stroke="var(--symbool)" stroke-width="2"/>`;
    // Differentieel (AREI D)
    if (blok.dif) {
      const g = blok.dif.gevoeligheid;
      const kleur = g <= 30 ? 'var(--accent)' : 'var(--symbool)';
      s += differentieelGlyph(xStart, y + 8, kleur);
      s += `<text x="${xStart + 42}" y="${y + 22}" font-size="12" font-weight="700" fill="var(--tekst)">${blok.dif.amp} A · Δ${g} mA</text>`;
      s += `<text x="${xStart + 42}" y="${y + 38}" font-size="11" fill="var(--tekst-zacht)">type ${blok.dif.type || 'A'} · ${escape(blok.dif.naam)}</text>`;
      s += `<line x1="${xStart}" y1="${y + 50}" x2="${xStart}" y2="${barY}" stroke="var(--symbool)" stroke-width="2"/>`;
    } else {
      s += `<text x="${xStart + 14}" y="${y + 34}" font-size="12" fill="var(--fout)">Zonder differentieel</text>`;
      s += `<line x1="${xStart}" y1="${y + 40}" x2="${xStart}" y2="${barY}" stroke="var(--fout)" stroke-width="2"/>`;
    }

    // Rail
    const laatsteX = xStart + 64 + (blok.kringen.length - 1) * KOL;
    s += `<line x1="${xStart}" y1="${barY}" x2="${Math.max(laatsteX, xStart + 40)}" y2="${barY}" stroke="var(--symbool)" stroke-width="3"/>`;

    blok.kringen.forEach((k, i) => {
      const x = xStart + 64 + i * KOL;
      const comps = componentenVanKring(project, k.id);
      s += `<line x1="${x}" y1="${barY}" x2="${x}" y2="${barY + 16}" stroke="${k.kleur}" stroke-width="2.5"/>`;
      // Automatische schakelaar volgens AREI, met curve en stroomsterkte
      s += automaatGlyph(x, barY + 16, k.kleur, 2.5);
      s += `<text x="${x + 14}" y="${barY + 38}" font-size="12" font-weight="700" fill="var(--tekst)">${k.curve || 'C'}${k.amp}</text>`;
      // Leiding met aantal geleiders en doorsnede
      s += `<line x1="${x}" y1="${barY + 58}" x2="${x}" y2="${barY + 92}" stroke="${k.kleur}" stroke-width="2.5"/>`;
      s += leidingGlyph(x, barY + 72, project.net.fasen === 3 && k.amp >= 32 ? 5 : 3, k.kleur);
      s += `<text x="${x + 12}" y="${barY + 88}" font-size="10" fill="var(--tekst-zacht)">${kabelTekst(k, project.net.fasen)}</text>`;
      // Kringnummer en naam
      s += `<circle cx="${x}" cy="${barY + 106}" r="11" fill="${k.kleur}"/>`;
      s += `<text x="${x}" y="${barY + 106}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#fff">${k.nummer}</text>`;
      tekstRegels(k.naam, 17).forEach((regel, ri) => {
        s += `<text x="${x}" y="${barY + 128 + ri * 13}" text-anchor="middle" font-size="11" fill="var(--tekst)">${escape(regel)}</text>`;
      });
      // Symbolen van de aangesloten componenten, met aantal
      const perType = new Map();
      for (const c of comps) perType.set(c.type, (perType.get(c.type) || 0) + 1);
      const types = [...perType.entries()].slice(0, 6);
      types.forEach(([type, aantal], ti) => {
        const rij = Math.floor(ti / 3);
        const kol = ti % 3;
        const inRij = Math.min(3, types.length - rij * 3);
        const sx = x - ((inRij - 1) * 32) / 2 + kol * 32;
        const sy = barY + 180 + rij * 30;
        s += `<g transform="translate(${sx} ${sy}) scale(0.17)" fill="none" stroke="${k.kleur}" stroke-width="7" ` +
          `stroke-linecap="round" stroke-linejoin="round">${symbool(type)}</g>`;
        if (aantal > 1) s += `<text x="${sx + 13}" y="${sy + 14}" font-size="10" font-weight="700" fill="var(--tekst)">${aantal}×</text>`;
      });
      const punten = puntenInKring(project, k.id);
      s += `<text x="${x}" y="${barY + 244}" text-anchor="middle" font-size="10" fill="var(--tekst-zacht)">${comps.length} comp. · ${punten} pt</text>`;
    });

    y += RIJ;
  }

  s += '</svg>';
  return s;
}

/** Overzichtstabel: welke component hoort op welke zekering. */
export function bouwBordTabel(project = store.project) {
  if (!project.kringen.length) {
    return '<p class="leeg">Nog geen kringen. Ga naar stap 3 en maak kringen aan of gebruik “Automatisch verdelen”.</p>';
  }
  let h = '';
  for (const k of project.kringen) {
    const dif = project.differentiëlen.find((d) => d.id === k.differentieelId);
    const comps = componentenVanKring(project, k.id);
    const perRuimte = new Map();
    for (const c of comps) {
      const r = c.ruimteId && project.plan.ruimtes.find((x) => x.id === c.ruimteId);
      const naam = r ? (r.naam || ruimteDef(r.type).naam) : 'Zonder ruimte';
      if (!perRuimte.has(naam)) perRuimte.set(naam, []);
      perRuimte.get(naam).push(c);
    }
    h += `<section class="kring-kaart" style="--kring:${k.kleur}">
      <header>
        <span class="kring-nr" style="background:${k.kleur}">${k.nummer}</span>
        <div>
          <h4>${escape(k.naam)}</h4>
          <p>${k.amp} A · ${k.mm2} mm² · curve ${k.curve || 'C'} · ${dif ? `Δ${dif.gevoeligheid} mA` : '<span class="fout-tekst">geen differentieel</span>'}</p>
        </div>
        <div class="kring-cijfers">
          <span>${puntenInKring(project, k.id)} ${puntenInKring(project, k.id) === 1 ? 'punt' : 'punten'}</span>
          <span>${Math.round(vermogenVanKring(project, k.id))} W</span>
        </div>
      </header>`;
    if (!comps.length) {
      h += '<p class="leeg">Geen componenten toegewezen.</p>';
    } else {
      for (const [ruimte, lijst] of perRuimte) {
        const samengevat = new Map();
        for (const c of lijst) {
          const sleutel = c.type + '|' + (c.label || '');
          if (!samengevat.has(sleutel)) samengevat.set(sleutel, { comp: c, aantal: 0 });
          samengevat.get(sleutel).aantal += 1;
        }
        h += `<div class="kring-ruimte"><strong>${escape(ruimte)}</strong><ul>`;
        for (const { comp, aantal } of samengevat.values()) {
          const d = def(comp.type);
          h += `<li><span class="mini-sym"><svg viewBox="-56 -56 112 112" width="18" height="18" fill="none" stroke="currentColor" stroke-width="7">${symbool(comp.type)}</svg></span>` +
            `${aantal > 1 ? aantal + '× ' : ''}${escape(d.naam)}${comp.label ? ' — ' + escape(comp.label) : ''}</li>`;
        }
        h += '</ul></div>';
      }
    }
    h += '</section>';
  }

  const zonder = project.componenten.filter((c) => {
    const d = def(c.type);
    return !c.kringId && (d.kringtype === 'verlichting' || d.kringtype === 'stopcontact' || d.kringtype === 'vast' || d.kringtype === 'bediening');
  });
  if (zonder.length) {
    h += `<section class="kring-kaart zonder"><header><span class="kring-nr">?</span><div><h4>Nog niet toegewezen</h4>
      <p>${zonder.length} component${zonder.length > 1 ? 'en' : ''} zonder kring</p></div></header><ul class="plat">`;
    for (const c of zonder) h += `<li>${escape(def(c.type).naam)}${c.label ? ' — ' + escape(c.label) : ''}</li>`;
    h += '</ul></section>';
  }
  return h;
}
