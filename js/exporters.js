// Opslaan, openen, afbeelding exporteren en afdrukken.

import store from './store.js';
import { omhullende } from './geometry.js';
import { bouwBordSVG, bouwBordTabel } from './board.js';
import { escape } from './canvas.js';
import { migreer, def } from './model.js';

// Vaste kleuren voor export en afdruk (altijd licht, ook in donkere modus).
const EXPORT_KLEUREN = {
  '--sym-fill': '#ffffff',
  '--muur': '#111827',
  '--muur-vulling': '#c9ced6',
  '--symbool': '#111827',
  '--accent': '#2563eb',
  '--geen-kring': '#9ca3af',
  '--tekst-plan': '#374151',
  '--tekst-plan-zacht': '#6b7280',
  '--verbinding': '#9ca3af',
  '--raster-groot': '#e5e7eb',
  '--raster-fijn': '#f3f4f6',
  '--vlak': '#ffffff',
  '--vlak-2': '#fbfbfc',
  '--vlak-3': '#f3f4f6',
  '--tekst': '#111827',
  '--tekst-zacht': '#6b7280',
  '--fout': '#dc2626',
  '--rand': '#9ca3af',
  '--accent-zacht': '#dbeafe',
};

function kleurStijl() {
  return Object.entries(EXPORT_KLEUREN).map(([k, v]) => `${k}:${v}`).join(';');
}

/** Bounding box van alles wat op het plan staat, inclusief marge. */
export function planOmhullende(marge = 0.8) {
  const p = store.project;
  const punten = [];
  for (const r of p.plan.ruimtes) punten.push(...r.punten);
  for (const m of p.plan.muren) punten.push(m.a, m.b);
  for (const c of p.componenten) punten.push({ x: c.x, y: c.y });
  const box = omhullende(punten) || { x1: 0, y1: 0, x2: 10, y2: 8 };
  return {
    x: box.x1 - marge,
    y: box.y1 - marge,
    w: Math.max(1, (box.x2 - box.x1) + marge * 2),
    h: Math.max(1, (box.y2 - box.y1) + marge * 2),
  };
}

/** Losstaande SVG van het situatieschema, met titelhoek zoals op een dossier. */
export function planSVG(canvas, { pxPerMeter = 80, titel = true } = {}) {
  const vb = planOmhullende();
  const bewaardeZoom = canvas.view.zoom;
  canvas.view.zoom = pxPerMeter;
  const inhoud = canvas.bouw({ vb, voorExport: true });
  canvas.view.zoom = bewaardeZoom;

  const p = store.project;
  const niveau = store.niveau;
  const px = (n) => n / pxPerMeter;                          // beeldpunten naar meter
  const voet = titel ? px(78) : 0;                           // titelhoek onderaan
  const kop = titel ? px(30) : 0;                            // naam van de verdieping
  const totaalH = vb.h + voet + kop;
  const w = vb.w * pxPerMeter;
  const h = totaalH * pxPerMeter;
  const e = px(10);                                          // eenheid voor de titelhoek

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" ` +
    `viewBox="${vb.x} ${vb.y - kop} ${vb.w} ${totaalH}" style="${kleurStijl()}" font-family="system-ui, sans-serif">`;
  s += `<rect x="${vb.x}" y="${vb.y - kop}" width="${vb.w}" height="${totaalH}" fill="#ffffff"/>`;

  if (titel && niveau) {
    s += `<text x="${vb.x + px(6)}" y="${vb.y - kop + px(19)}" font-size="${px(16)}" font-weight="700" fill="#111827">` +
      `${escape(niveau.naam)}</text>`;
  }
  s += inhoud;

  if (titel) {
    const ty = vb.y + vb.h + px(10);
    const th = px(62);
    const tb = vb.w - px(12);
    const tx = vb.x + px(6);
    const k1 = tb * 0.5, k2 = tb * 0.78;
    const r = '#9ca3af';
    s += `<rect x="${tx}" y="${ty}" width="${tb}" height="${th}" fill="none" stroke="${r}" stroke-width="${px(1)}"/>`;
    s += `<line x1="${tx + k1}" y1="${ty}" x2="${tx + k1}" y2="${ty + th}" stroke="${r}" stroke-width="${px(1)}"/>`;
    s += `<line x1="${tx + k2}" y1="${ty}" x2="${tx + k2}" y2="${ty + th}" stroke="${r}" stroke-width="${px(1)}"/>`;
    const rg = (x, y, tekst, grootte, vet, kleur) =>
      `<text x="${x}" y="${y}" font-size="${px(grootte)}" ${vet ? 'font-weight="700" ' : ''}fill="${kleur}">${tekst}</text>`;
    s += rg(tx + px(8), ty + px(16), 'Plaats van de elektrische installatie', 10.5, true, '#111827');
    s += rg(tx + px(14), ty + px(33), escape(p.klant || ''), 10.5, false, '#111827');
    s += rg(tx + px(14), ty + px(48), escape(p.adres || ''), 10.5, false, '#111827');
    s += rg(tx + k1 + px(8), ty + px(16), 'Installatie', 10.5, true, '#111827');
    s += rg(tx + k1 + px(14), ty + px(33), escape(p.naam || ''), 10.5, false, '#111827');
    s += rg(tx + k1 + px(14), ty + px(48), `${store.project.kringen.length} kringen · ${store.project.componenten.filter((c) => def(c.type).kringtype !== 'bouw').length} punten`, 9.5, false, '#6b7280');
    s += rg(tx + k2 + px(8), ty + px(16), 'Situatieschema', 10.5, true, '#111827');
    s += rg(tx + k2 + px(8), ty + px(33), escape(niveau ? niveau.naam : ''), 10.5, false, '#111827');
    s += rg(tx + k2 + px(8), ty + px(48), new Date().toLocaleDateString('nl-BE'), 9.5, false, '#6b7280');
  }
  s += '</svg>';
  return s;
}

async function bewaarBlob(blob, bestandsnaam) {
  // Draait de app in een omgeving die zelf bestanden aflevert (de viewer op
  // claude.ai), dan verloopt het bewaren daarlangs; anders gewoon downloaden.
  if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) { await downloads.save({ filename: bestandsnaam, data: blob }); return; }
    } catch (e) {
      if (e && e.code === 'declined') return;
      console.warn('Bewaren via de viewer mislukte:', e);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  if ('download' in a) {
    a.href = url;
    a.download = bestandsnaam;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function veiligeNaam(naam) {
  return (naam || 'project').replace(/[^a-z0-9\- _]/gi, '').trim().replace(/\s+/g, '-') || 'project';
}

/* ------------------------------------------------------------------ *
 * Projectbestand
 * ------------------------------------------------------------------ */
export function exporteerProject() {
  const data = JSON.stringify(store.project, null, 2);
  bewaarBlob(new Blob([data], { type: 'application/json' }), `${veiligeNaam(store.project.naam)}.elek.json`);
}

export function importeerProject(bestand) {
  return new Promise((klaar, fout) => {
    const lezer = new FileReader();
    lezer.onload = () => {
      try {
        const data = migreer(JSON.parse(String(lezer.result)));
        store.vervangProject(data, 'project geopend');
        klaar(data);
      } catch (e) { fout(e); }
    };
    lezer.onerror = () => fout(lezer.error);
    lezer.readAsText(bestand);
  });
}

/* ------------------------------------------------------------------ *
 * Grondplan als onderlaag
 * ------------------------------------------------------------------ */

/** Leest een afbeelding in, verkleint ze en zet ze als onderlaag onder het plan. */
export function importeerOnderlaag(bestand, maxPx = 1800) {
  return new Promise((klaar, fout) => {
    const lezer = new FileReader();
    lezer.onload = () => {
      const img = new Image();
      img.onload = () => {
        const schaal = Math.min(1, maxPx / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * schaal);
        c.height = Math.round(img.height * schaal);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', 0.82);
        const breedte = 10;                                  // standaard 10 m breed
        const hoogte = +(breedte * (c.height / c.width)).toFixed(3);
        store.commit('grondplan geïmporteerd', () => {
          const niveau = store.niveau;
          const bestaand = niveau.onderlaag || {};
          niveau.onderlaag = {
            data,
            x: bestaand.x ?? 0,
            y: bestaand.y ?? 0,
            breedte,
            hoogte,
            dekking: bestaand.dekking ?? 0.55,
            vergrendeld: false,
            zichtbaar: true,
            naam: bestand.name || 'grondplan',
          };
        });
        klaar(store.niveau.onderlaag);
      };
      img.onerror = () => fout(new Error('De afbeelding kon niet gelezen worden.'));
      img.src = String(lezer.result);
    };
    lezer.onerror = () => fout(lezer.error);
    lezer.readAsDataURL(bestand);
  });
}

/* ------------------------------------------------------------------ *
 * Afbeeldingen
 * ------------------------------------------------------------------ */
export function exporteerSVG(canvas) {
  const s = planSVG(canvas);
  bewaarBlob(new Blob([s], { type: 'image/svg+xml' }), `${veiligeNaam(store.project.naam)}-situatieschema.svg`);
}

export function exporteerPNG(canvas, schaal = 2) {
  const svgTekst = planSVG(canvas);
  const blob = new Blob([svgTekst], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width * schaal;
    c.height = img.height * schaal;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((png) => {
      if (png) bewaarBlob(png, `${veiligeNaam(store.project.naam)}-situatieschema.png`);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert('De afbeelding kon niet gemaakt worden. Probeer de SVG-export.');
  };
  img.src = url;
}

/** Het eendraadschema als losstaande SVG, met vaste kleuren. */
export function bordSVGBestand(project = store.project) {
  const ruw = bouwBordSVG(project);
  return ruw.replace('<svg ', `<svg style="${kleurStijl()}" `);
}

export function exporteerBordSVG() {
  bewaarBlob(new Blob([bordSVGBestand()], { type: 'image/svg+xml' }),
    `${veiligeNaam(store.project.naam)}-eendraadschema.svg`);
}

export function exporteerBordPNG(schaal = 2) {
  const blob = new Blob([bordSVGBestand()], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width * schaal;
    c.height = img.height * schaal;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((png) => {
      if (png) bewaarBlob(png, `${veiligeNaam(store.project.naam)}-eendraadschema.png`);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert('De afbeelding kon niet gemaakt worden. Probeer de SVG-export.');
  };
  img.src = url;
}

/* ------------------------------------------------------------------ *
 * Afdrukken
 * ------------------------------------------------------------------ */
export function drukAfLegende() {
  const vlak = document.getElementById('print-vlak');
  const inhoud = document.getElementById('legende-inhoud');
  vlak.innerHTML = `<div class="print-blad print-legende" style="${kleurStijl()}">
      <h1>Symbolenlegende</h1>
      <p class="print-meta">Grafische symbolen volgens AREI Boek 1, tabel 2.23</p>
      ${inhoud ? inhoud.innerHTML : ''}
    </div>`;
  document.body.classList.add('afdrukken');
  const opruimen = () => {
    document.body.classList.remove('afdrukken');
    vlak.innerHTML = '';
    window.removeEventListener('afterprint', opruimen);
  };
  window.addEventListener('afterprint', opruimen);
  setTimeout(() => window.print(), 60);
}

export function drukAf(canvas) {
  const p = store.project;
  const vlak = document.getElementById('print-vlak');
  const datum = new Date().toLocaleDateString('nl-BE');
  const bewaardNiveau = store.ui.niveauId;

  // één blad per verdieping
  let bladen = '';
  p.plan.niveaus.forEach((niveau, i) => {
    store.ui.niveauId = niveau.id;
    bladen += `<div class="print-blad">
      ${i === 0 ? `<h1>${escape(p.naam || 'Elektrisch dossier')}</h1>
        <p class="print-meta">${[p.klant, p.adres].filter(Boolean).map(escape).join(' · ')} ${p.klant || p.adres ? '·' : ''} ${datum}</p>` : ''}
      <h2>Situatieschema — ${escape(niveau.naam)}</h2>
      <div class="print-plan">${planSVG(canvas, { pxPerMeter: 70, titel: false })}</div>
    </div>`;
  });
  store.ui.niveauId = bewaardNiveau;

  vlak.innerHTML = `
    ${bladen}
    <div class="print-blad">
      <h2>Verdeelbord</h2>
      <div class="print-bord">${bordSVGBestand(p)}</div>
    </div>
    <div class="print-blad">
      <h2>Componenten per zekering</h2>
      <div class="print-lijst">${bouwBordTabel(p)}</div>
      <p class="print-voet">Opgemaakt met Elek · ${datum} · controle op basis van gangbare AREI-vuistregels.</p>
    </div>`;
  document.body.classList.add('afdrukken');
  const opruimen = () => {
    document.body.classList.remove('afdrukken');
    vlak.innerHTML = '';
    window.removeEventListener('afterprint', opruimen);
  };
  window.addEventListener('afterprint', opruimen);
  setTimeout(() => window.print(), 60);
}
