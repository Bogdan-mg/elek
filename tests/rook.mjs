// Rooktest: laadt de app in Chromium en controleert de belangrijkste stappen.
// Draait in CI via `npm test`.

import { chromium } from 'playwright';
import { startServer } from './server.mjs';

const fouten = [];
const controles = [];

function controleer(naam, voorwaarde, extra = '') {
  controles.push({ naam, ok: !!voorwaarde, extra });
  console.log(`${voorwaarde ? '  ok  ' : ' FOUT '} ${naam}${extra ? ' — ' + extra : ''}`);
}

const server = await startServer(process.cwd(), 0);
const poort = server.address().port;
const basis = `http://127.0.0.1:${poort}/index.html`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => fouten.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') fouten.push('CONSOLE: ' + m.text()); });
page.on('dialog', (d) => d.accept());

await page.goto(basis, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

// 1. voorbeeldproject
await page.click('#welkom button[data-app="voorbeeld"]');
await page.waitForTimeout(700);
const plan = await page.evaluate(() => ({
  ruimtes: document.querySelectorAll('[data-kind="ruimte"]').length,
  comps: document.querySelectorAll('[data-kind="component"]').length,
}));
controleer('voorbeeldwoning tekent ruimtes', plan.ruimtes === 5, `${plan.ruimtes} ruimtes`);
controleer('voorbeeldwoning tekent componenten', plan.comps > 30, `${plan.comps} componenten`);

// 2. tekenen op exacte maat
await page.click('[data-app="stap"][data-stap="1"]');
await page.click('[data-actie="tool"][data-tool="polygoon"]');
const vlak = await page.locator('#plan').boundingBox();
await page.mouse.click(vlak.x + 200, vlak.y + 170);
await page.mouse.move(vlak.x + 340, vlak.y + 172);
await page.keyboard.type('3');
await page.keyboard.press('Enter');
await page.mouse.move(vlak.x + 340, vlak.y + 300);
await page.keyboard.type('2');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
controleer('lengte intypen plaatst punten', true);

// 3. kringen en eendraadschema
await page.click('[data-app="stap"][data-stap="3"]');
await page.waitForTimeout(200);
const kringen = await page.evaluate(() => document.querySelectorAll('.kring-rij').length);
controleer('kringen staan in de lijst', kringen > 5, `${kringen} kringen`);
const instelbaar = await page.evaluate(() => document.querySelectorAll('[data-actie="kring-amp"]').length);
controleer('zekering rechtstreeks instelbaar', instelbaar === kringen);

await page.click('[data-app="weergave"][data-weergave="bord"]');
await page.waitForTimeout(400);
const bord = await page.evaluate(() => {
  const svg = document.querySelector('#bord-schema svg');
  return { er: !!svg, tekst: svg ? svg.textContent : '', kaarten: document.querySelectorAll('#bord-lijst .kring-kaart').length };
});
controleer('eendraadschema wordt getekend', bord.er);
controleer('eendraadschema toont kabel en automaat', bord.tekst.includes('VOB') && bord.tekst.includes('C'));
controleer('lijst per zekering is gevuld', bord.kaarten > 5, `${bord.kaarten} kaarten`);

// 4. eigenschappen per symbool
await page.click('[data-app="weergave"][data-weergave="plan"]');
await page.click('[data-app="stap"][data-stap="2"]');
await page.click('[data-actie="plaats-type"][data-type="schak1"]');
const vlak2 = await page.locator('#plan').boundingBox();
await page.mouse.click(vlak2.x + 430, vlak2.y + 300);
await page.waitForTimeout(300);
const heeftSpec = await page.evaluate(() => document.querySelectorAll('.eigenschappen [data-actie="eig"]').length);
controleer('eigenschappenpaneel verschijnt', heeftSpec > 5, `${heeftSpec} eigenschappen`);
if (heeftSpec) {
  const voor = await page.evaluate(() => document.querySelector('.laag-componenten [data-kind="component"]:last-child').innerHTML.length);
  await page.check('[data-actie="eig"][data-key="wissel"]');
  await page.waitForTimeout(250);
  const na = await page.evaluate(() => document.querySelector('.laag-componenten [data-kind="component"]:last-child').innerHTML.length);
  controleer('eigenschap verandert het symbool', voor !== na);
}

// 5. afdrukken en opslaan
await page.evaluate(() => { window.print = () => {}; });
await page.click('[data-app="menu"]');
await page.click('[data-app="print"]');
await page.waitForTimeout(400);
const bladen = await page.evaluate(() => document.querySelectorAll('.print-blad').length);
controleer('afdruk maakt bladen', bladen >= 3, `${bladen} bladen`);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const bewaard = await page.evaluate(() => document.querySelectorAll('[data-kind="component"]').length);
controleer('project blijft bewaard na herladen', bewaard > 30, `${bewaard} componenten`);

controleer('geen fouten in de console', fouten.length === 0, fouten.join(' | '));

await browser.close();
server.close();

const mislukt = controles.filter((c) => !c.ok);
console.log(`\n${controles.length - mislukt.length}/${controles.length} controles in orde`);
if (mislukt.length) process.exit(1);
