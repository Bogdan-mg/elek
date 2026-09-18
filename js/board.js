// Eendraadschema in de Belgische opmaak (AREI tabel 2.23), zoals een
// dossier van Trikker of Tricity: onderaan de hoofdleiding met teller en
// hoofddifferentieel, daarboven per differentieel een rail, en vanaf die
// rail vertrekt elke kring naar boven met genummerde aftakkingen waaraan
// de toestellen hangen.

import store from './store.js';
import { def, ruimteDef } from './model.js';
import { componentenVanKring, puntenInKring, vermogenVanKring } from './circuits.js';
import { bordIndeling, banden } from './indeling.js';
import { symbool, symboolOpLeiding } from './symbols.js';
import { escape } from './canvas.js';

/* ------------------------------------------------------------------ *
 * Maatvoering
 * ------------------------------------------------------------------ */
const MARGE = 24;
const LINKS = 52;            // linkermarge van een blad
const RIJ_H = 34;            // hoogte van een genummerde aftakking
const SYM_STAP = 38;         // afstand tussen twee symbolen op een aftakking
const KOL_MIN = 128;         // minimale kolombreedte van een kring
const DIF_RUIMTE = 74;       // ruimte links van de eerste kring van een differentieel
const VOEDING_B = 250;       // breedte van de voeding op het eerste blad
const MAX_BREEDTE = 2100;    // daarna begint een nieuw blad
const NAAM_H = 118;          // ruimte voor de gedraaide kringnaam
const TAK_BASIS = 132;       // van de rail tot de eerste aftakking
const DIF_H = 116;           // van de hoofdleiding tot de rail
const TITEL = 92;

const LIJN = 'var(--symbool)';

/* ------------------------------------------------------------------ *
 * Bouwstenen
 * ------------------------------------------------------------------ */

/** Automaat of differentieel: hefboom op de leiding (AREI D). */
function hefboom(x, y, kleur = LIJN, dik = 2) {
  return `<path d="M ${x} ${y + 9} q -1 -12 -11 -20" fill="none" stroke="${kleur}" stroke-width="${dik}" stroke-linecap="round"/>`;
}

/** Kortsluitvermogen in een kadertje, zoals op een Belgisch schema. */
function kortsluitvak(x, y, waarde) {
  const b = 30, h = 13;
  return `<rect x="${x}" y="${y - h / 2}" width="${b}" height="${h}" fill="var(--sym-fill)" stroke="${LIJN}" stroke-width="1"/>` +
    `<text x="${x + b / 2}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="var(--tekst)">${waarde}</text>`;
}

/** Aanduiding "leiding in een wand" (AREI C). */
function buisMerk(x, y) {
  return `<path d="M ${x - 11} ${y - 7} L ${x - 3} ${y - 7} L ${x - 3} ${y + 7} L ${x - 11} ${y + 7}" ` +
    `fill="none" stroke="${LIJN}" stroke-width="1.4"/>`;
}

/** Aardelektrode. */
function aarde(x, y) {
  return `<line x1="${x - 15}" y1="${y}" x2="${x + 15}" y2="${y}" stroke="${LIJN}" stroke-width="2"/>` +
    `<line x1="${x - 9}" y1="${y + 6}" x2="${x + 9}" y2="${y + 6}" stroke="${LIJN}" stroke-width="2"/>` +
    `<line x1="${x - 4}" y1="${y + 12}" x2="${x + 4}" y2="${y + 12}" stroke="${LIJN}" stroke-width="2"/>`;
}

function gedraaid(x, y, tekst, opties = {}) {
  const { grootte = 10, vet = false, kleur = 'var(--tekst)' } = opties;
  return `<text x="${x}" y="${y}" font-size="${grootte}" fill="${kleur}"${vet ? ' font-weight="700"' : ''} ` +
    `transform="rotate(-90 ${x} ${y})" text-anchor="start">${tekst}</text>`;
}

function kort(tekst, max) {
  const t = String(tekst || '');
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export function kabelTekst(kring, fasen = 1) {
  const n = fasen === 3 && kring.amp >= 32 ? 5 : 3;
  return `${kring.kabel || 'VOB'} ${n}G${String(kring.mm2).replace('.', ',')}`;
}

function polen(kring, fasen = 1) {
  return fasen === 3 && kring.amp >= 32 ? '4P' : '2P';
}

/* ------------------------------------------------------------------ *
 * Aftakkingen van een kring bepalen
 * ------------------------------------------------------------------ */

/** Naam van de ruimte van een component. */
function ruimteVan(project, comp) {
  const r = comp.ruimteId && project.plan.ruimtes.find((x) => x.id === comp.ruimteId);
  return r ? (r.naam || ruimteDef(r.type).naam) : '';
}

/* ------------------------------------------------------------------ *
 * Het schema
 * ------------------------------------------------------------------ */
export function bouwBordSVG(project = store.project, { blad = 1, bladen: totaalBladen = 1 } = {}) {
  const fasen = project.net.fasen || 1;

  // 1. kringen per differentieel, met de letters van het bord
  const indeling = bordIndeling(project);
  const bandenLijst = banden(project);

  // 2. kolommen met hun eigen breedte en aftakkingen
  const kolommen = [];
  for (const band of bandenLijst) {
    band.kringen.forEach((k, i) => {
      const rijen = indeling.rijenVan.get(k.id) || [];
      const breedste = Math.max(1, ...rijen.map((r) => Math.min(r.length, 12)));
      kolommen.push({
        dif: band.dif,
        eersteVanDif: i === 0,
        kring: k,
        rijen,
        breedte: Math.max(KOL_MIN, 34 + breedste * SYM_STAP + 92),
      });
    });
  }
  if (!kolommen.length) {
    kolommen.push({ dif: bandenLijst[0] ? bandenLijst[0].dif : project.differentiëlen[0] || null, eersteVanDif: true, kring: null, rijen: [], breedte: KOL_MIN });
  }

  // 3. kolommen over bladen verdelen; een differentieel blijft samen
  //    zolang het op één blad past.
  const bladen = [];
  let huidig = null;
  const groepBreedte = (vanaf) => {
    const dif = kolommen[vanaf].dif;
    let b = DIF_RUIMTE;
    for (let i = vanaf; i < kolommen.length && kolommen[i].dif === dif; i++) b += kolommen[i].breedte;
    return b;
  };
  for (let i = 0; i < kolommen.length; i++) {
    const kol = kolommen[i];
    const start = LINKS + (bladen.length === 0 ? VOEDING_B : 40);
    const extra = kol.eersteVanDif ? DIF_RUIMTE : 0;
    let nieuwBlad = !huidig;
    if (huidig) {
      if (huidig.x + extra + kol.breedte > MAX_BREEDTE) nieuwBlad = true;
      // een nieuw differentieel liever in zijn geheel op het volgende blad
      else if (kol.eersteVanDif && huidig.kolommen.length &&
        huidig.x + groepBreedte(i) > MAX_BREEDTE && groepBreedte(i) + start <= MAX_BREEDTE) nieuwBlad = true;
    }
    if (nieuwBlad) {
      huidig = { kolommen: [], x: LINKS + (bladen.length === 0 ? VOEDING_B : 40), eerste: bladen.length === 0 };
      bladen.push(huidig);
      huidig.x += DIF_RUIMTE;
    } else if (kol.eersteVanDif) {
      huidig.x += extra;
    }
    kol.x = huidig.x + kol.breedte / 2;
    kol.nieuwRail = kol.eersteVanDif || huidig.kolommen.length === 0;
    huidig.x += kol.breedte;
    huidig.kolommen.push(kol);
  }

  // 4. hoogtes
  for (const blad of bladen) {
    const maxRijen = Math.max(1, ...blad.kolommen.map((k) => k.rijen.length));
    blad.takHoogte = TAK_BASIS + maxRijen * RIJ_H + NAAM_H;
    blad.hoogte = blad.takHoogte + DIF_H;
    blad.breedte = Math.max(...blad.kolommen.map((k) => k.x + k.breedte / 2)) + 40;
  }

  const breedte = Math.max(900, ...bladen.map((b) => b.breedte));
  const hoogte = MARGE * 2 + bladen.reduce((s, b) => s + b.hoogte + 26, 0) + TITEL + 10;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breedte} ${hoogte}" width="${breedte}" ` +
    `height="${hoogte}" class="bord-svg" font-family="system-ui, sans-serif">`;
  s += `<rect x="0" y="0" width="${breedte}" height="${hoogte}" fill="var(--vlak)"/>`;
  s += `<rect x="${MARGE / 2}" y="${MARGE / 2}" width="${breedte - MARGE}" height="${hoogte - MARGE}" ` +
    `fill="none" stroke="var(--rand)" stroke-width="1.5"/>`;

  // 5. bladen tekenen
  let y = MARGE + 8;
  bladen.forEach((blad, bi) => {
    const hoofdY = y + blad.hoogte;          // hoofdleiding onderaan het blad
    const railY = hoofdY - DIF_H;            // rail van de differentiëlen
    const eindX = blad.breedte - 30;

    // hoofdleiding
    s += `<line x1="${LINKS}" y1="${hoofdY}" x2="${eindX}" y2="${hoofdY}" stroke="${LIJN}" stroke-width="3"/>`;

    if (bi === 0) {
      // aardelektrode, teller en hoofddifferentieel
      const ax = LINKS + 14;
      s += `<line x1="${ax}" y1="${hoofdY}" x2="${ax}" y2="${hoofdY + 26}" stroke="${LIJN}" stroke-width="2"/>`;
      s += aarde(ax, hoofdY + 26);
      s += `<text x="${ax}" y="${hoofdY + 54}" text-anchor="middle" font-size="9" fill="var(--tekst-zacht)">aarding</text>`;

      const tx = LINKS + 76;
      s += `<rect x="${tx - 26}" y="${hoofdY + 14}" width="52" height="30" fill="var(--sym-fill)" stroke="${LIJN}" stroke-width="1.6"/>`;
      s += `<text x="${tx}" y="${hoofdY + 29}" text-anchor="middle" dominant-baseline="central" font-size="10.5" font-weight="600" fill="var(--tekst)">kWh</text>`;
      s += `<line x1="${tx}" y1="${hoofdY}" x2="${tx}" y2="${hoofdY + 14}" stroke="${LIJN}" stroke-width="2"/>`;
      s += `<text x="${tx + 34}" y="${hoofdY + 24}" font-size="9.5" fill="var(--tekst-zacht)">${fasen === 3 ? 'XVB 4x10' : 'XVB 2x10'}</text>`;

      const hx = LINKS + 186;
      s += hefboom(hx, hoofdY - 9, LIJN, 2.2);
      s += `<text x="${hx - 34}" y="${hoofdY - 6}" font-size="11" font-weight="700" fill="var(--tekst)">A</text>`;
      s += kortsluitvak(hx + 6, hoofdY + 16, project.net.kortsluit || 3000);
      s += `<text x="${hx + 6}" y="${hoofdY + 34}" font-size="9.5" fill="var(--tekst)">` +
        `${fasen === 3 ? '4P' : '2P'} - ${project.net.hoofdzekering} A</text>`;
      s += `<text x="${hx + 6}" y="${hoofdY - 18}" font-size="9.5" font-weight="700" fill="var(--tekst)">diff 300 mA</text>`;
      s += `<text x="${hx + 6}" y="${hoofdY - 6}" font-size="9" fill="var(--tekst-zacht)">type A</text>`;
    } else {
      s += `<text x="${LINKS}" y="${hoofdY + 20}" font-size="9.5" fill="var(--tekst-zacht)">vervolg van de hoofdleiding</text>`;
    }

    // differentiëlen en rails
    let lopendeDif = null;
    let railStart = null;
    const sluitRail = (tot) => {
      if (railStart !== null) {
        s += `<line x1="${railStart}" y1="${railY}" x2="${tot}" y2="${railY}" stroke="${LIJN}" stroke-width="3"/>`;
      }
    };

    blad.kolommen.forEach((kol, ki) => {
      if (kol.nieuwRail || ki === 0) {
        if (ki > 0) sluitRail(blad.kolommen[ki - 1].x + blad.kolommen[ki - 1].breedte / 2 - 10);
        lopendeDif = kol.dif;
        const dx = kol.x - kol.breedte / 2 - DIF_RUIMTE / 2;
        railStart = dx;
        // verticale verbinding met de hoofdleiding, met het differentieel erin
        s += `<line x1="${dx}" y1="${hoofdY}" x2="${dx}" y2="${railY}" stroke="${LIJN}" stroke-width="2"/>`;
        if (kol.dif) {
          const kleur = store.ui.kleurPerKring && kol.dif.gevoeligheid <= 30 ? 'var(--accent)' : LIJN;
          s += hefboom(dx, hoofdY - 40, kleur, 2.2);
          s += `<text x="${dx - 30}" y="${hoofdY - 46}" text-anchor="end" font-size="12" font-weight="700" ` +
            `fill="var(--tekst)">${indeling.difLetter.get(kol.dif.id) || ''}</text>`;
          s += kortsluitvak(dx + 8, hoofdY - 20, kol.dif.kortsluit || 3000);
          s += gedraaid(dx - 12, hoofdY - 6, escape(kort(kol.dif.naam, 14)), { vet: true, grootte: 10 });
          s += gedraaid(dx + 46, hoofdY - 6, `Δ${kol.dif.gevoeligheid} mA · type ${kol.dif.type || 'A'}`, { grootte: 9, kleur: kleur });
          s += gedraaid(dx + 58, hoofdY - 6, `${fasen === 3 ? '4P' : '2P'} - ${kol.dif.amp} A`, { grootte: 9, kleur: 'var(--tekst-zacht)' });
          s += gedraaid(dx + 70, hoofdY - 6, kol.dif.kabel || (fasen === 3 ? 'XVB 4G10' : 'XVB 2G10'),
            { grootte: 9, kleur: 'var(--tekst-zacht)' });
        } else {
          s += gedraaid(dx - 8, hoofdY - 8, 'zonder differentieel', { vet: true, grootte: 10, kleur: 'var(--fout)' });
        }
      }
      if (ki === blad.kolommen.length - 1) sluitRail(kol.x + kol.breedte / 2 - 10);
    });

    // kringen
    for (const kol of blad.kolommen) {
      const k = kol.kring;
      if (!k) continue;
      const x = kol.x - kol.breedte / 2 + 34;        // de takleiding staat links in de kolom
      const rijen = kol.rijen;
      const bovenste = railY - TAK_BASIS - Math.max(0, rijen.length - 1) * RIJ_H;
      const top = bovenste - 16;

      // takleiding van de rail naar boven
      s += `<line x1="${x}" y1="${railY}" x2="${x}" y2="${top}" stroke="${LIJN}" stroke-width="1.6"/>`;

      // automaat met kringletter, kortsluitvermogen en aanduiding
      s += hefboom(x, railY - 16, LIJN, 2);
      const letter = indeling.kringLetter.get(k.id) || String(k.nummer);
      const kleurKring = store.ui.kleurPerKring ? k.kleur : LIJN;
      if (store.ui.kleurPerKring) {
        s += `<circle cx="${x - 26}" cy="${railY - 14}" r="10" fill="${k.kleur}"/>`;
        s += `<text x="${x - 26}" y="${railY - 14}" text-anchor="middle" dominant-baseline="central" ` +
          `font-size="11" font-weight="700" fill="#fff">${letter}</text>`;
      } else {
        s += `<text x="${x - 24}" y="${railY - 10}" text-anchor="middle" font-size="13" font-weight="700" ` +
          `fill="var(--tekst)">${letter}</text>`;
      }
      void kleurKring;
      s += kortsluitvak(x + 6, railY - 24, k.kortsluit || 3000);
      s += gedraaid(x + 42, railY - 6, `${polen(k, fasen)} - ${k.curve || 'C'} ${k.amp}A`, { grootte: 9.5 });

      // leiding: twee wandmerken en de kabelaanduiding
      s += buisMerk(x, railY - 62);
      s += buisMerk(x, railY - 92);
      s += gedraaid(x + 8, railY - 50, kabelTekst(k, fasen), { grootte: 9.5, kleur: 'var(--tekst-zacht)' });

      // genummerde aftakkingen
      rijen.forEach((rij, ri) => {
        const ry = railY - TAK_BASIS - ri * RIJ_H;
        const zichtbaar = rij.slice(0, 12);
        const eindeX = x + 26 + Math.max(0, zichtbaar.length - 1) * SYM_STAP + 12;
        s += `<line x1="${x}" y1="${ry}" x2="${eindeX}" y2="${ry}" stroke="${LIJN}" stroke-width="1.4"/>`;
        s += `<text x="${x - 9}" y="${ry + 3}" text-anchor="end" font-size="9.5" fill="var(--tekst)">${letter}${ri + 1}</text>`;
        zichtbaar.forEach((c, ci) => {
          s += symboolOpLeiding(c.type, x + 26 + ci * SYM_STAP, ry, 0.26, LIJN, 6);
        });
        if (rij.length > zichtbaar.length) {
          s += `<text x="${eindeX + 4}" y="${ry + 3}" font-size="9" fill="var(--tekst-zacht)">+${rij.length - zichtbaar.length}</text>`;
        }
        const eerste = rij[0];
        const bijschrift = [eerste.label, ruimteVan(project, eerste)].filter(Boolean).join(' · ');
        if (bijschrift) {
          s += `<text x="${eindeX + (rij.length > zichtbaar.length ? 24 : 10)}" y="${ry + 3}" font-size="8.5" ` +
            `fill="var(--tekst-zacht)">${escape(kort(bijschrift, 16))}</text>`;
        }
      });

      if (!rijen.length) {
        s += `<text x="${x + 10}" y="${railY - TAK_BASIS}" font-size="9.5" fill="var(--tekst-zacht)">geen toestellen</text>`;
      }

      // kringnaam bovenaan, gedraaid
      s += gedraaid(x - 6, top - 8, escape(kort(k.naam, 26)), { vet: true, grootte: 10.5 });
      s += gedraaid(x + 8, top - 8, `${puntenInKring(project, k.id)} pt · ${(vermogenVanKring(project, k.id) / 1000).toFixed(1)} kW`,
        { grootte: 8.5, kleur: 'var(--tekst-zacht)' });
    }

    y += blad.hoogte + 26;
  });

  // 6. titelhoek
  const tx = MARGE / 2;
  const ty = hoogte - MARGE / 2 - TITEL;
  const tb = breedte - MARGE;
  const kol1 = tb * 0.5, kol2 = tb * 0.78;
  s += `<rect x="${tx}" y="${ty}" width="${tb}" height="${TITEL}" fill="none" stroke="var(--rand)" stroke-width="1.5"/>`;
  s += `<line x1="${tx + kol1}" y1="${ty}" x2="${tx + kol1}" y2="${ty + TITEL}" stroke="var(--rand)" stroke-width="1.5"/>`;
  s += `<line x1="${tx + kol2}" y1="${ty}" x2="${tx + kol2}" y2="${ty + TITEL}" stroke="var(--rand)" stroke-width="1.5"/>`;
  s += `<text x="${tx + 14}" y="${ty + 20}" font-size="10.5" font-weight="700" fill="var(--tekst)">Plaats van de elektrische installatie</text>`;
  s += `<text x="${tx + 22}" y="${ty + 40}" font-size="10.5" fill="var(--tekst)">${escape(project.klant || '')}</text>`;
  s += `<text x="${tx + 22}" y="${ty + 56}" font-size="10.5" fill="var(--tekst)">${escape(project.adres || '')}</text>`;
  s += `<text x="${tx + 14}" y="${ty + 80}" font-size="9" fill="var(--tekst-zacht)">` +
    `Opgemaakt met Elek · controle op basis van gangbare AREI-vuistregels, geen keuringsverslag.</text>`;
  const inst = project.installateur || {};
  s += `<text x="${tx + kol1 + 14}" y="${ty + 20}" font-size="10.5" font-weight="700" fill="var(--tekst)">Installateur</text>`;
  s += `<text x="${tx + kol1 + 22}" y="${ty + 40}" font-size="10.5" fill="var(--tekst)">${escape(inst.naam || '')}</text>`;
  s += `<text x="${tx + kol1 + 22}" y="${ty + 56}" font-size="10.5" fill="var(--tekst-zacht)">` +
    `${[inst.btw, inst.telefoon].filter(Boolean).map(escape).join(' · ')}</text>`;
  const datum = new Date(project.gewijzigd || Date.now()).toLocaleDateString('nl-BE');
  s += `<text x="${tx + kol2 + 14}" y="${ty + 20}" font-size="10.5" font-weight="700" fill="var(--tekst)">p. ${blad}/${totaalBladen}</text>`;
  s += `<text x="${tx + kol2 + 14}" y="${ty + 38}" font-size="10.5" font-weight="700" fill="var(--tekst)">Eendraadschema</text>`;
  s += `<text x="${tx + kol2 + 14}" y="${ty + 56}" font-size="10.5" fill="var(--tekst)">` +
    `${fasen === 3 ? '3 x 400V + N ~ 50Hz' : '2 x 230V ~ 50Hz'}</text>`;
  s += `<text x="${tx + kol2 + 14}" y="${ty + 74}" font-size="10.5" fill="var(--tekst-zacht)">${datum}</text>`;

  s += '</svg>';
  return s;
}

/** Overzichtstabel: welke component hoort op welke zekering. */
export function bouwBordTabel(project = store.project) {
  if (!project.kringen.length) {
    return '<p class="leeg">Nog geen kringen. Ga naar stap 3 en maak kringen aan of gebruik “Automatisch verdelen”.</p>';
  }
  const indeling = bordIndeling(project);
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
          const code = indeling.puntcode.get(comp.id);
          h += `<li><span class="mini-sym"><svg viewBox="-56 -56 112 112" width="18" height="18" fill="none" stroke="currentColor" stroke-width="7">${symbool(comp.type)}</svg></span>` +
            `${code ? `<b class="puntcode">${code}</b> ` : ''}${aantal > 1 ? aantal + '× ' : ''}${escape(d.naam)}` +
            `${comp.label ? ' — ' + escape(comp.label) : ''}</li>`;
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
