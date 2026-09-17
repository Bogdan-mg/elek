// Verdeelbordweergave: eendraadschema van teller tot kring, plus de
// overzichtslijst "welke component op welke zekering".

import store from './store.js';
import { def, ruimteDef, puntenVan } from './model.js';
import { componentenVanKring, puntenInKring, vermogenVanKring } from './circuits.js';
import { symbool } from './symbols.js';
import { escape } from './canvas.js';

const KOL = 132;    // kolombreedte per kring
const KOP = 96;     // hoogte van het kopblok (teller + hoofdautomaat)
const RIJ = 232;    // hoogte van een differentieelblok

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

  const xStart = 60;
  // Kopblok: teller en hoofdautomaat
  s += `<g stroke="var(--symbool)" stroke-width="2" fill="none">`;
  s += `<circle cx="${xStart}" cy="30" r="20" fill="var(--sym-fill)"/>`;
  s += `<line x1="${xStart}" y1="50" x2="${xStart}" y2="${KOP - 10}"/>`;
  s += `<rect x="${xStart - 22}" y="${KOP - 10}" width="44" height="26" rx="4" fill="var(--sym-fill)"/>`;
  s += `</g>`;
  s += `<text x="${xStart}" y="31" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="var(--tekst)">kWh</text>`;
  s += `<text x="${xStart}" y="${KOP + 4}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="var(--tekst)">${project.net.hoofdzekering}A</text>`;
  s += `<text x="${xStart + 34}" y="20" font-size="12" fill="var(--tekst-zacht)">${project.net.fasen === 3 ? '3F+N 400 V' : '1F+N 230 V'} · hoofdzekering ${project.net.hoofdzekering} A</text>`;
  s += `<text x="${xStart + 34}" y="38" font-size="12" fill="var(--tekst-zacht)">${escape(project.naam || '')}</text>`;

  let y = KOP + 30;
  for (const blok of blokken) {
    const barY = y + 58;
    // Verticale voeding naar het differentieel
    s += `<line x1="${xStart}" y1="${y - 14}" x2="${xStart}" y2="${y + 16}" stroke="var(--symbool)" stroke-width="2"/>`;
    // Differentieelblok
    if (blok.dif) {
      const g = blok.dif.gevoeligheid;
      const kleur = g <= 30 ? 'var(--accent)' : 'var(--symbool)';
      s += `<rect x="${xStart - 16}" y="${y + 16}" width="168" height="30" rx="5" fill="var(--sym-fill)" stroke="${kleur}" stroke-width="2"/>`;
      s += `<text x="${xStart + 68}" y="${y + 31}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="var(--tekst)">` +
        `Δ ${g} mA · ${blok.dif.amp} A · type ${blok.dif.type || 'A'}</text>`;
      s += `<line x1="${xStart}" y1="${y + 46}" x2="${xStart}" y2="${barY}" stroke="var(--symbool)" stroke-width="2"/>`;
    } else {
      s += `<text x="${xStart + 14}" y="${y + 34}" font-size="12" fill="var(--fout)">Zonder differentieel</text>`;
      s += `<line x1="${xStart}" y1="${y + 40}" x2="${xStart}" y2="${barY}" stroke="var(--fout)" stroke-width="2"/>`;
    }

    // Rail
    const laatsteX = xStart + 60 + (blok.kringen.length - 1) * KOL;
    s += `<line x1="${xStart}" y1="${barY}" x2="${Math.max(laatsteX, xStart + 40)}" y2="${barY}" stroke="var(--symbool)" stroke-width="3"/>`;

    blok.kringen.forEach((k, i) => {
      const x = xStart + 60 + i * KOL;
      const comps = componentenVanKring(project, k.id);
      s += `<line x1="${x}" y1="${barY}" x2="${x}" y2="${barY + 24}" stroke="${k.kleur}" stroke-width="2.5"/>`;
      // Automaat
      s += `<rect x="${x - 26}" y="${barY + 24}" width="52" height="30" rx="5" fill="var(--sym-fill)" stroke="${k.kleur}" stroke-width="2.5"/>`;
      s += `<text x="${x}" y="${barY + 39}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="var(--tekst)">${k.amp} A</text>`;
      s += `<text x="${x + 32}" y="${barY + 32}" font-size="10" fill="var(--tekst-zacht)">${k.curve || 'C'}</text>`;
      // Kabel
      s += `<line x1="${x}" y1="${barY + 54}" x2="${x}" y2="${barY + 76}" stroke="${k.kleur}" stroke-width="2.5"/>`;
      s += `<text x="${x + 6}" y="${barY + 70}" font-size="10" fill="var(--tekst-zacht)">${k.mm2} mm²</text>`;
      // Kringnummer en naam
      s += `<circle cx="${x}" cy="${barY + 88}" r="11" fill="${k.kleur}"/>`;
      s += `<text x="${x}" y="${barY + 88}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#fff">${k.nummer}</text>`;
      tekstRegels(k.naam, 16).forEach((regel, ri) => {
        s += `<text x="${x}" y="${barY + 108 + ri * 13}" text-anchor="middle" font-size="11" fill="var(--tekst)">${escape(regel)}</text>`;
      });
      // Symbolen van de aangesloten componenten
      const perType = new Map();
      for (const c of comps) perType.set(c.type, (perType.get(c.type) || 0) + 1);
      const types = [...perType.entries()].slice(0, 4);
      types.forEach(([type, aantal], ti) => {
        const sx = x - ((types.length - 1) * 26) / 2 + ti * 26;
        const sy = barY + 152;
        s += `<g transform="translate(${sx} ${sy}) scale(0.16)" fill="none" stroke="${k.kleur}" stroke-width="8">${symbool(type)}</g>`;
        if (aantal > 1) s += `<text x="${sx + 11}" y="${sy + 13}" font-size="9" font-weight="700" fill="var(--tekst)">${aantal}</text>`;
      });
      const punten = puntenInKring(project, k.id);
      s += `<text x="${x}" y="${barY + 178}" text-anchor="middle" font-size="10" fill="var(--tekst-zacht)">${comps.length} comp. · ${punten} pt</text>`;
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
