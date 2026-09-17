// Opslaan, openen, afbeelding exporteren en afdrukken.

import store from './store.js';
import { omhullende } from './geometry.js';
import { bouwBordSVG, bouwBordTabel } from './board.js';
import { escape } from './canvas.js';
import { migreer } from './model.js';

// Vaste kleuren voor export en afdruk (altijd licht, ook in donkere modus).
const EXPORT_KLEUREN = {
  '--sym-fill': '#ffffff',
  '--muur': '#111827',
  '--symbool': '#111827',
  '--accent': '#2563eb',
  '--geen-kring': '#9ca3af',
  '--tekst-plan': '#374151',
  '--tekst-plan-zacht': '#6b7280',
  '--verbinding': '#9ca3af',
  '--raster-groot': '#e5e7eb',
  '--raster-fijn': '#f3f4f6',
  '--vlak': '#ffffff',
  '--tekst': '#111827',
  '--tekst-zacht': '#6b7280',
  '--fout': '#dc2626',
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

/** Losstaande SVG van het situatieschema. */
export function planSVG(canvas, { pxPerMeter = 80, titel = true } = {}) {
  const vb = planOmhullende();
  const bewaardeZoom = canvas.view.zoom;
  canvas.view.zoom = pxPerMeter;
  const inhoud = canvas.bouw({ vb, voorExport: true });
  canvas.view.zoom = bewaardeZoom;

  const p = store.project;
  const kopHoogte = titel ? 0.9 : 0;
  const w = vb.w * pxPerMeter;
  const h = (vb.h + kopHoogte) * pxPerMeter;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" ` +
    `viewBox="${vb.x} ${vb.y - kopHoogte} ${vb.w} ${vb.h + kopHoogte}" style="${kleurStijl()}">`;
  s += `<rect x="${vb.x}" y="${vb.y - kopHoogte}" width="${vb.w}" height="${vb.h + kopHoogte}" fill="#ffffff"/>`;
  if (titel) {
    s += `<text x="${vb.x + 0.2}" y="${vb.y - kopHoogte + 0.45}" font-size="0.36" font-weight="700" ` +
      `font-family="system-ui, sans-serif" fill="#111827">${escape(p.naam || 'Situatieschema')}</text>`;
    const onder = [p.klant, p.adres, new Date().toLocaleDateString('nl-BE')].filter(Boolean).join(' · ');
    s += `<text x="${vb.x + 0.2}" y="${vb.y - kopHoogte + 0.78}" font-size="0.22" ` +
      `font-family="system-ui, sans-serif" fill="#6b7280">${escape(onder)}</text>`;
  }
  s += inhoud;
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
  vlak.innerHTML = `
    <div class="print-blad">
      <h1>${escape(p.naam || 'Elektrisch dossier')}</h1>
      <p class="print-meta">${[p.klant, p.adres].filter(Boolean).map(escape).join(' · ')} ${p.klant || p.adres ? '·' : ''} ${datum}</p>
      <h2>Situatieschema</h2>
      <div class="print-plan">${planSVG(canvas, { pxPerMeter: 70, titel: false })}</div>
    </div>
    <div class="print-blad">
      <h2>Verdeelbord</h2>
      <div class="print-bord" style="${kleurStijl()}">${bouwBordSVG(p)}</div>
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
