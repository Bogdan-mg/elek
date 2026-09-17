// Eendraadschema volgens de Belgische praktijk (AREI, tabel 2.23):
// onderaan de voeding met aardelektrode, kWh-teller en hoofdautomaat,
// daarboven per differentieel een rail waarop de kringen naar boven
// vertrekken, met de symbolen van de aangesloten toestellen in de lijn.

import store from './store.js';
import { def, ruimteDef } from './model.js';
import { componentenVanKring, puntenInKring, vermogenVanKring } from './circuits.js';
import { symbool } from './symbols.js';
import { escape } from './canvas.js';

/* ------------------------------------------------------------------ *
 * Maatvoering van het blad
 * ------------------------------------------------------------------ */
const MARGE = 26;          // rand van het blad
const HOOFD_X = 78;        // x van de verticale hoofdleiding
const KOL_X = 210;         // x van de eerste kring
const KOL = 212;           // breedte per kring
const STAP = 50;           // afstand tussen twee symbolen in een kring
const VOET = 128;          // hoogte van de voedingsrij onderaan
const TITEL = 96;          // hoogte van de titelhoek
const NAAM_RUIMTE = 132;   // ruimte voor de gedraaide kringnaam

const LIJN = 'var(--symbool)';

/* ------------------------------------------------------------------ *
 * Symbolen van het bord
 * ------------------------------------------------------------------ */

/** Automatische schakelaar (AREI D), hefboom naar boven geopend. */
function automaat(x, y, kleur = LIJN, dik = 2) {
  return `<circle cx="${x}" cy="${y}" r="3.2" fill="${kleur}"/>` +
    `<path d="M ${x} ${y} q -11 -11 -9 -24" fill="none" stroke="${kleur}" stroke-width="${dik}" stroke-linecap="round"/>`;
}

/** Differentieel: automaatsymbool met de ringkern erlangs. */
function differentieel(x, y, kleur = LIJN) {
  return automaat(x, y, kleur, 2.2) +
    `<ellipse cx="${x - 12}" cy="${y - 13}" rx="14" ry="6.5" fill="none" stroke="${kleur}" stroke-width="1.6" ` +
    `transform="rotate(-34 ${x - 12} ${y - 13})"/>`;
}

/** Aardelektrode (AREI D). */
function aardelektrode(x, y, kleur = LIJN) {
  return `<line x1="${x - 16}" y1="${y}" x2="${x + 16}" y2="${y}" stroke="${kleur}" stroke-width="2"/>` +
    `<line x1="${x - 10}" y1="${y + 6}" x2="${x + 10}" y2="${y + 6}" stroke="${kleur}" stroke-width="2"/>` +
    `<line x1="${x - 4}" y1="${y + 12}" x2="${x + 4}" y2="${y + 12}" stroke="${kleur}" stroke-width="2"/>`;
}

/** Leidingaanduiding: schuine streep met het aantal geleiders. */
function leiding(x, y, aantal, kleur = LIJN) {
  return `<line x1="${x - 8}" y1="${y + 7}" x2="${x + 8}" y2="${y - 7}" stroke="${kleur}" stroke-width="1.6"/>` +
    `<text x="${x + 10}" y="${y - 5}" font-size="9.5" fill="var(--tekst-zacht)">${aantal}</text>`;
}

/** Kabelaanduiding volgens AREI, bv. XVB 3G2,5. */
export function kabelTekst(kring, fasen = 1) {
  const geleiders = fasen === 3 && kring.amp >= 32 ? 5 : 3;
  return `${kring.kabel || 'XVB'} ${geleiders}G${String(kring.mm2).replace('.', ',')}`;
}

function geleiders(kring, fasen = 1) {
  return fasen === 3 && kring.amp >= 32 ? 5 : 3;
}

function polen(kring, fasen = 1) {
  return fasen === 3 && kring.amp >= 32 ? '4P' : '2P';
}

/* ------------------------------------------------------------------ *
 * Hulpjes
 * ------------------------------------------------------------------ */

/** Groepeert de componenten van een kring per type en opschrift. */
function groepeer(project, kringId) {
  const groepen = new Map();
  for (const c of componentenVanKring(project, kringId)) {
    const ruimte = c.ruimteId && project.plan.ruimtes.find((r) => r.id === c.ruimteId);
    const ruimteNaam = ruimte ? (ruimte.naam || ruimteDef(ruimte.type).naam) : '';
    const sleutel = `${c.type}|${c.label || ''}|${ruimteNaam}`;
    if (!groepen.has(sleutel)) {
      groepen.set(sleutel, { type: c.type, label: c.label || '', ruimte: ruimteNaam, aantal: 0 });
    }
    groepen.get(sleutel).aantal += 1;
  }
  const orde = { verlichting: 0, bediening: 1, stopcontact: 2, vast: 3, zwakstroom: 4, verdeling: 5 };
  return [...groepen.values()].sort(
    (a, b) => (orde[def(a.type).kringtype] ?? 9) - (orde[def(b.type).kringtype] ?? 9)
  );
}

function kort(tekst, max) {
  const t = String(tekst);
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

/* ------------------------------------------------------------------ *
 * Het schema
 * ------------------------------------------------------------------ */
export function bouwBordSVG(project = store.project) {
  const fasen = project.net.fasen || 1;

  // Kringen groeperen per differentieel; kringen zonder differentieel apart.
  const gebruikt = project.differentiëlen.filter((d) => project.kringen.some((k) => k.differentieelId === d.id));
  const banden = gebruikt.map((d) => ({ dif: d, kringen: project.kringen.filter((k) => k.differentieelId === d.id) }));
  const wees = project.kringen.filter((k) => !gebruikt.some((d) => d.id === k.differentieelId));
  if (wees.length) banden.push({ dif: null, kringen: wees });
  if (!banden.length) banden.push({ dif: project.differentiëlen[0] || null, kringen: [] });

  // Elke band krijgt de hoogte die haar langste kring nodig heeft.
  for (const band of banden) {
    band.groepen = band.kringen.map((k) => groepeer(project, k.id));
    const langste = Math.max(0, ...band.groepen.map((g) => g.length));
    band.hoogte = 118 + langste * STAP + NAAM_RUIMTE;
  }

  const maxKringen = Math.max(1, ...banden.map((b) => b.kringen.length));
  const breedte = Math.max(980, KOL_X + (maxKringen - 1) * KOL + 240);
  const bandenHoogte = banden.reduce((s, b) => s + b.hoogte, 0);
  const hoogte = MARGE * 2 + bandenHoogte + VOET + TITEL + 18;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breedte} ${hoogte}" width="${breedte}" ` +
    `height="${hoogte}" class="bord-svg" data-breedte="${breedte}" font-family="system-ui, sans-serif">`;
  s += `<rect x="0" y="0" width="${breedte}" height="${hoogte}" fill="var(--vlak)"/>`;
  s += `<rect x="${MARGE / 2}" y="${MARGE / 2}" width="${breedte - MARGE}" height="${hoogte - MARGE}" ` +
    `fill="none" stroke="var(--rand)" stroke-width="1.5"/>`;

  // --- Voedingsrij onderaan -----------------------------------------
  const voetY = hoogte - MARGE - TITEL - 46;
  const railOnder = voetY - 58;                       // rail van de onderste band

  s += aardelektrode(MARGE + 26, voetY + 16);
  s += `<line x1="${MARGE + 26}" y1="${voetY}" x2="${MARGE + 26}" y2="${voetY + 16}" stroke="${LIJN}" stroke-width="2"/>`;
  s += `<line x1="${MARGE + 26}" y1="${voetY}" x2="${MARGE + 96}" y2="${voetY}" stroke="${LIJN}" stroke-width="2"/>`;
  s += `<text x="${MARGE + 26}" y="${voetY + 46}" text-anchor="middle" font-size="9.5" fill="var(--tekst-zacht)">aardelektrode</text>`;

  // kWh-teller
  const tellerX = MARGE + 96;
  s += `<rect x="${tellerX}" y="${voetY - 17}" width="52" height="34" fill="var(--sym-fill)" stroke="${LIJN}" stroke-width="2"/>`;
  s += `<text x="${tellerX + 26}" y="${voetY}" text-anchor="middle" dominant-baseline="central" font-size="11.5" font-weight="600" fill="var(--tekst)">kWh</text>`;
  s += `<text x="${(MARGE + 26 + tellerX) / 2}" y="${voetY - 8}" text-anchor="middle" font-size="9.5" fill="var(--tekst-zacht)">${fasen === 3 ? 'EXVB 4x10' : 'EXVB 2x10'}</text>`;

  // hoofdautomaat
  const hoofdX = tellerX + 128;
  s += `<line x1="${tellerX + 52}" y1="${voetY}" x2="${hoofdX}" y2="${voetY}" stroke="${LIJN}" stroke-width="2"/>`;
  s += automaat(hoofdX, voetY, LIJN, 2.4);
  s += `<text x="${hoofdX - 26}" y="${voetY + 26}" font-size="11" font-weight="700" fill="var(--tekst)">${fasen === 3 ? '4P' : '2P'} ${project.net.hoofdzekering} A</text>`;
  s += `<text x="${tellerX + 62}" y="${voetY - 8}" font-size="10" fill="var(--tekst-zacht)">${fasen === 3 ? 'XVB 5G10' : 'XVB 3G10'}</text>`;

  // van de hoofdautomaat naar de verticale hoofdleiding
  s += `<line x1="${hoofdX}" y1="${voetY - 24}" x2="${hoofdX}" y2="${voetY - 40}" stroke="${LIJN}" stroke-width="2"/>`;
  s += `<line x1="${hoofdX}" y1="${voetY - 40}" x2="${HOOFD_X}" y2="${voetY - 40}" stroke="${LIJN}" stroke-width="2"/>`;

  // --- Banden (één rail per differentieel) ---------------------------
  const railYs = [];
  let onder = railOnder;
  for (let i = banden.length - 1; i >= 0; i--) {
    railYs[i] = onder;
    onder -= banden[i].hoogte;
  }
  const bovensteRail = railYs[0];
  s += `<line x1="${HOOFD_X}" y1="${voetY - 40}" x2="${HOOFD_X}" y2="${bovensteRail}" stroke="${LIJN}" stroke-width="2"/>`;

  banden.forEach((band, bi) => {
    const railY = railYs[bi];
    const laatste = KOL_X + Math.max(0, band.kringen.length - 1) * KOL;
    s += `<line x1="${HOOFD_X}" y1="${railY}" x2="${Math.max(laatste, KOL_X)}" y2="${railY}" stroke="${LIJN}" stroke-width="3.2"/>`;

    // differentieel tussen hoofdleiding en rail
    if (band.dif) {
      const kleur = band.dif.gevoeligheid <= 30 ? 'var(--accent)' : LIJN;
      s += differentieel(HOOFD_X, railY - 4, kleur);
      s += `<text x="${HOOFD_X + 16}" y="${railY - 44}" font-size="11" font-weight="700" fill="var(--tekst)">` +
        `${fasen === 3 ? '4P' : '2P'} ${band.dif.amp} A</text>`;
      s += `<text x="${HOOFD_X + 16}" y="${railY - 31}" font-size="11" font-weight="700" fill="${kleur}">Δ${band.dif.gevoeligheid} mA</text>`;
      s += `<text x="${HOOFD_X + 16}" y="${railY - 19}" font-size="9.5" fill="var(--tekst-zacht)">` +
        `type ${band.dif.type || 'A'} · ${escape(kort(band.dif.naam, 12))}</text>`;
    } else {
      s += `<text x="${HOOFD_X + 12}" y="${railY - 16}" font-size="11" font-weight="700" fill="var(--fout)">zonder differentieel</text>`;
    }

    // --- kringen, van de rail naar boven ---
    band.kringen.forEach((k, ki) => {
      const x = KOL_X + ki * KOL;
      const groepen = band.groepen[ki];
      const basis = railY - 118;                       // eerste symbool
      const top = basis - Math.max(0, groepen.length - 1) * STAP;
      const eind = top - 26;

      // takleiding
      s += `<line x1="${x}" y1="${railY}" x2="${x}" y2="${eind}" stroke="${LIJN}" stroke-width="1.8"/>`;

      // automaat vlak boven de rail
      s += automaat(x, railY - 12, LIJN, 2.2);
      s += `<text x="${x + 13}" y="${railY - 30}" font-size="11.5" font-weight="700" fill="var(--tekst)">` +
        `${polen(k, fasen)} · ${k.curve || 'C'}${k.amp} A</text>`;

      // leiding met aantal geleiders en kabeltype
      s += leiding(x, railY - 64, geleiders(k, fasen));
      s += `<text x="${x + 13}" y="${railY - 60}" font-size="10" fill="var(--tekst-zacht)">${kabelTekst(k, fasen)}</text>`;

      // kringnummer in de kleur van het plan
      s += `<circle cx="${x}" cy="${railY - 92}" r="10.5" fill="${k.kleur}"/>`;
      s += `<text x="${x}" y="${railY - 92}" text-anchor="middle" dominant-baseline="central" font-size="10.5" ` +
        `font-weight="700" fill="#fff">${k.nummer}</text>`;

      // symbolen van de aangesloten toestellen, in de lijn
      groepen.forEach((g, gi) => {
        const y = basis - gi * STAP;
        s += `<g transform="translate(${x} ${y}) scale(0.3)" fill="none" stroke="${LIJN}" stroke-width="5.5" ` +
          `stroke-linecap="round" stroke-linejoin="round">${symbool(g.type)}</g>`;
        const naam = def(g.type).naam;
        s += `<text x="${x + 20}" y="${y - 2}" font-size="10" fill="var(--tekst)">` +
          `${g.aantal > 1 ? `${g.aantal}× ` : ''}${escape(kort(naam, 24))}</text>`;
        const onderschrift = [g.label, g.ruimte].filter(Boolean).join(' · ');
        if (onderschrift) {
          s += `<text x="${x + 20}" y="${y + 10}" font-size="9" fill="var(--tekst-zacht)">${escape(kort(onderschrift, 26))}</text>`;
        }
      });

      if (!groepen.length) {
        s += `<text x="${x + 14}" y="${basis}" font-size="10" fill="var(--tekst-zacht)">geen toestellen</text>`;
      }

      // kringnaam verticaal bovenaan, zoals op een eendraadschema
      s += `<text x="${x - 5}" y="${eind - 8}" font-size="11.5" font-weight="700" fill="var(--tekst)" ` +
        `transform="rotate(-90 ${x - 5} ${eind - 8})" text-anchor="start">${escape(kort(k.naam, 24))}</text>`;
      const punten = puntenInKring(project, k.id);
      s += `<text x="${x + 12}" y="${eind - 8}" font-size="9" fill="var(--tekst-zacht)" ` +
        `transform="rotate(-90 ${x + 12} ${eind - 8})" text-anchor="start">` +
        `${punten} pt · ${(vermogenVanKring(project, k.id) / 1000).toFixed(1)} kW</text>`;
    });
  });

  // --- Titelhoek ------------------------------------------------------
  const tx = MARGE / 2;
  const ty = hoogte - MARGE / 2 - TITEL;
  const tb = breedte - MARGE;
  const kol1 = tb * 0.52, kol2 = tb * 0.78;
  s += `<rect x="${tx}" y="${ty}" width="${tb}" height="${TITEL}" fill="none" stroke="var(--rand)" stroke-width="1.5"/>`;
  s += `<line x1="${tx + kol1}" y1="${ty}" x2="${tx + kol1}" y2="${ty + TITEL}" stroke="var(--rand)" stroke-width="1.5"/>`;
  s += `<line x1="${tx + kol2}" y1="${ty}" x2="${tx + kol2}" y2="${ty + TITEL}" stroke="var(--rand)" stroke-width="1.5"/>`;

  s += `<text x="${tx + 14}" y="${ty + 22}" font-size="11" font-weight="700" fill="var(--tekst)">Plaats van de elektrische installatie</text>`;
  s += `<text x="${tx + 14}" y="${ty + 40}" font-size="11" fill="var(--tekst)">${escape(project.klant || '—')}</text>`;
  s += `<text x="${tx + 14}" y="${ty + 56}" font-size="11" fill="var(--tekst)">${escape(project.adres || '')}</text>`;
  s += `<text x="${tx + 14}" y="${ty + 78}" font-size="10" fill="var(--tekst-zacht)">` +
    `Controle op basis van gangbare AREI-vuistregels — geen keuringsverslag.</text>`;

  s += `<text x="${tx + kol1 + 14}" y="${ty + 22}" font-size="11" font-weight="700" fill="var(--tekst)">${escape(project.naam || 'Installatie')}</text>`;
  s += `<text x="${tx + kol1 + 14}" y="${ty + 40}" font-size="10.5" fill="var(--tekst-zacht)">Getekend met Elek</text>`;
  s += `<text x="${tx + kol1 + 14}" y="${ty + 58}" font-size="10.5" fill="var(--tekst-zacht)">` +
    `${project.kringen.length} kringen · ${project.componenten.filter((c) => def(c.type).kringtype !== 'bouw').length} componenten</text>`;

  const datum = new Date(project.gewijzigd || Date.now()).toLocaleDateString('nl-BE');
  s += `<text x="${tx + kol2 + 14}" y="${ty + 22}" font-size="11" font-weight="700" fill="var(--tekst)">Eendraadschema</text>`;
  s += `<text x="${tx + kol2 + 14}" y="${ty + 42}" font-size="10.5" fill="var(--tekst)">` +
    `${fasen === 3 ? '3 x 400 V + N ~ 50 Hz' : '230 V + N ~ 50 Hz'}</text>`;
  s += `<text x="${tx + kol2 + 14}" y="${ty + 60}" font-size="10.5" fill="var(--tekst-zacht)">${datum}</text>`;
  s += `<text x="${tx + kol2 + 14}" y="${ty + 78}" font-size="10.5" fill="var(--tekst-zacht)">blad 1/1</text>`;

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
