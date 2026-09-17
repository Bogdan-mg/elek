// Datamodel, catalogi en normtabellen voor Elek.
// Alle maten in het project zijn in meter, hoeken in graden.

export const PROJECT_VERSION = 1;

export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

/* ------------------------------------------------------------------ *
 * Componentcatalogus
 * kringtype: verlichting | stopcontact | vast | bediening | zwakstroom | verdeling
 * wand   : component hoort tegen een muur (wordt op de dichtstbijzijnde wand geklikt)
 * eigen  : toestel hoort op een eigen kring (AREI: eigen kring per vast toestel)
 * telt   : telt mee voor de regel "max. 8 punten per kring"
 * ------------------------------------------------------------------ */
export const CATALOG = [
  // --- Verlichting ---------------------------------------------------
  { key: 'lichtpunt',     naam: 'Lichtpunt plafond',   groep: 'Verlichting',      kringtype: 'verlichting', wand: false, telt: true,  hoogte: null, watt: 60 },
  { key: 'wandlicht',     naam: 'Wandlichtpunt',       groep: 'Verlichting',      kringtype: 'verlichting', wand: true,  telt: true,  hoogte: 200, watt: 40 },
  { key: 'spot',          naam: 'Inbouwspot',          groep: 'Verlichting',      kringtype: 'verlichting', wand: false, telt: true,  hoogte: null, watt: 8 },
  { key: 'tl',            naam: 'TL / lichtbalk',      groep: 'Verlichting',      kringtype: 'verlichting', wand: false, telt: true,  hoogte: null, watt: 36 },
  { key: 'buitenlicht',   naam: 'Buitenverlichting',   groep: 'Verlichting',      kringtype: 'verlichting', wand: true,  telt: true,  hoogte: 220, watt: 20, nat: true },
  { key: 'noodlicht',     naam: 'Noodverlichting',     groep: 'Verlichting',      kringtype: 'verlichting', wand: true,  telt: true,  hoogte: 220, watt: 8 },
  { key: 'ledstrip',      naam: 'Led-strip / voeding', groep: 'Verlichting',      kringtype: 'verlichting', wand: false, telt: true,  hoogte: null, watt: 30 },
  { key: 'tl3',           naam: 'Armatuur 3 TL-buizen', groep: 'Verlichting',     kringtype: 'verlichting', wand: false, telt: true,  hoogte: null, watt: 108 },
  { key: 'lichtpuntSchakelaar', naam: 'Lichtpunt met schakelaar', groep: 'Verlichting', kringtype: 'verlichting', wand: false, telt: true, hoogte: null, watt: 60 },
  { key: 'noodlichtAutonoom', naam: 'Autonome noodverlichting', groep: 'Verlichting', kringtype: 'verlichting', wand: true, telt: true, hoogte: 220, watt: 8 },

  // --- Bediening -----------------------------------------------------
  { key: 'schak1',        naam: 'Enkelpolige schakelaar', groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'schak2',        naam: 'Dubbele schakelaar',     groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'schak2p',       naam: 'Tweepolige schakelaar',  groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'wissel',        naam: 'Wisselschakelaar',       groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'kruis',         naam: 'Kruisschakelaar',        groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'dimmer',        naam: 'Dimmer',                 groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'drukknop',      naam: 'Drukknop',               groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'bewegingsmelder', naam: 'Bewegingsmelder',      groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 230 },
  { key: 'trekschak',     naam: 'Trekschakelaar',         groep: 'Bediening',     kringtype: 'bediening',   wand: false, telt: false, hoogte: null },
  { key: 'tijdschak',     naam: 'Tijdschakelaar',         groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'schak3p',       naam: 'Driepolige schakelaar',  groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 110 },
  { key: 'wissel2p',      naam: 'Tweepolige wisselschakelaar', groep: 'Bediening', kringtype: 'bediening',  wand: true,  telt: false, hoogte: 110 },
  { key: 'schakVerklikker', naam: 'Schakelaar met verklikkerlamp', groep: 'Bediening', kringtype: 'bediening', wand: true, telt: false, hoogte: 110 },
  { key: 'schakSignalisatie', naam: 'Schakelaar met signalisatielamp', groep: 'Bediening', kringtype: 'bediening', wand: true, telt: false, hoogte: 110 },
  { key: 'drukknopLamp',  naam: 'Drukknop met verklikkerlamp', groep: 'Bediening', kringtype: 'bediening',  wand: true,  telt: false, hoogte: 110 },
  { key: 'impulsschakelaar', naam: 'Impulsschakelaar (teleruptor)', groep: 'Bediening', kringtype: 'bediening', wand: true, telt: false, hoogte: 150 },
  { key: 'schakelklok',   naam: 'Schakelklok',            groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 150 },
  { key: 'deurslot',      naam: 'Elektrisch deurslot',    groep: 'Bediening',     kringtype: 'bediening',   wand: true,  telt: false, hoogte: 100 },

  // --- Stopcontacten -------------------------------------------------
  { key: 'sc1',           naam: 'Stopcontact enkel',      groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 30 },
  { key: 'sc2',           naam: 'Stopcontact dubbel',     groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 30, punten: 2 },
  { key: 'sc3',           naam: 'Stopcontact drievoudig', groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 30, punten: 3 },
  { key: 'scwd',          naam: 'Stopcontact waterdicht', groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 110, nat: true },
  { key: 'scbuiten',      naam: 'Stopcontact buiten',     groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 60, nat: true },
  { key: 'scvloer',       naam: 'Vloercontactdoos',       groep: 'Stopcontacten', kringtype: 'stopcontact', wand: false, telt: true,  hoogte: 0 },
  { key: 'scgeschakeld',  naam: 'Geschakeld stopcontact', groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 30 },
  { key: 'scwerkblad',    naam: 'Stopcontact werkblad',   groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true,  telt: true,  hoogte: 110, punten: 2 },
  { key: 'sckind',        naam: 'Stopcontact kinderbeveiliging', groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true, telt: true, hoogte: 30 },
  { key: 'sckracht',      naam: 'Krachtstopcontact 3F',   groep: 'Stopcontacten', kringtype: 'vast',        wand: true,  telt: false, eigen: true, amp: 25, mm2: 4, watt: 5000, hoogte: 110 },
  { key: 'scscheer',      naam: 'Scheerapparaat (transfo)', groep: 'Stopcontacten', kringtype: 'stopcontact', wand: true, telt: true, hoogte: 130, nat: true },

  // --- Vaste toestellen ----------------------------------------------
  { key: 'kookplaat',     naam: 'Kookplaat',            groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 32, mm2: 6,   watt: 7400, hoogte: 60 },
  { key: 'oven',          naam: 'Oven',                 groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 20, mm2: 2.5, watt: 3500, hoogte: 60 },
  { key: 'vaatwas',       naam: 'Vaatwasser',           groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 2200, hoogte: 60, nat: true },
  { key: 'wasmachine',    naam: 'Wasmachine',           groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 2200, hoogte: 110, nat: true },
  { key: 'droogkast',     naam: 'Droogkast',            groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 2700, hoogte: 110, nat: true },
  { key: 'boiler',        naam: 'Boiler / warmwater',   groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 2400, hoogte: 180, nat: true },
  { key: 'koelkast',      naam: 'Koelkast',             groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 150, hoogte: 110 },
  { key: 'diepvries',     naam: 'Diepvriezer',          groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 200, hoogte: 110 },
  { key: 'dampkap',       naam: 'Dampkap',              groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 250, hoogte: 200 },
  { key: 'ventilatie',    naam: 'Ventilatie-unit',      groep: 'Vaste toestellen', kringtype: 'vast', wand: false, telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 300 },
  { key: 'airco',         naam: 'Airco',                groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 20, mm2: 2.5, watt: 3000, hoogte: 220 },
  { key: 'warmtepomp',    naam: 'Warmtepomp',           groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 25, mm2: 4,   watt: 5000, hoogte: 60, nat: true },
  { key: 'laadpaal',      naam: 'Laadpaal EV',          groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 32, mm2: 6,   watt: 7400, hoogte: 120, nat: true },
  { key: 'convector',     naam: 'Elektrische verwarming', groep: 'Vaste toestellen', kringtype: 'vast', wand: true, telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 2000, hoogte: 30 },
  { key: 'handdoekdroger', naam: 'Handdoekdroger',      groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 750, hoogte: 150, nat: true },
  { key: 'poort',         naam: 'Poort / rolluikmotor', groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 500, hoogte: 120 },
  { key: 'pomp',          naam: 'Pomp',                 groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 750, hoogte: 60, nat: true },
  { key: 'aansluitdoos',  naam: 'Vast aansluitpunt',    groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 500, hoogte: 30 },
  { key: 'aftakdoos',     naam: 'Aftak- of verbindingsdoos', groep: 'Vaste toestellen', kringtype: 'vast', wand: false, telt: false, amp: 16, mm2: 2.5, watt: 0 },
  { key: 'toestel',       naam: 'Vast huishoudtoestel', groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 800, hoogte: 60 },
  { key: 'microgolf',     naam: 'Microgolfoven',        groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 1200, hoogte: 110 },
  { key: 'motor',         naam: 'Motor',                groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: false, eigen: true, amp: 16, mm2: 2.5, watt: 750, hoogte: 60 },
  { key: 'horloge',       naam: 'Klok',                 groep: 'Vaste toestellen', kringtype: 'vast', wand: true,  telt: true,  amp: 16, mm2: 2.5, watt: 10, hoogte: 200 },

  // --- Zwakstroom / data ---------------------------------------------
  { key: 'utp',           naam: 'Datapunt UTP',         groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 30 },
  { key: 'coax',          naam: 'TV / coax',            groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 30 },
  { key: 'telefoon',      naam: 'Telefoon',             groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 30 },
  { key: 'videofoon',     naam: 'Videofoon',            groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 150 },
  { key: 'bel',           naam: 'Belinstallatie',       groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 220 },
  { key: 'rookmelder',    naam: 'Rookmelder',           groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: false, telt: false },
  { key: 'thermostaat',   naam: 'Thermostaat',          groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 150 },
  { key: 'wifi',          naam: 'Wifi access point',    groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: false, telt: false },
  { key: 'alarm',         naam: 'Alarm / detector',     groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 230 },
  { key: 'luidspreker',   naam: 'Luidspreker',          groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: false, telt: false },
  { key: 'data',          naam: 'Datacontactdoos',      groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 30 },
  { key: 'camera',        naam: 'Camera',               groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 250 },
  { key: 'intercom',      naam: 'Intercom / parlofoon', groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 150 },
  { key: 'domotica',      naam: 'Domoticasturing',      groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 110 },
  { key: 'zoemer',        naam: 'Zoemer',               groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 220 },
  { key: 'sirene',        naam: 'Sirene',               groep: 'Zwakstroom',     kringtype: 'zwakstroom', wand: true,  telt: false, hoogte: 250 },

  // --- Bouwkundig (openingen in de muur) -------------------------------
  { key: 'deur',          naam: 'Deur',                 groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 0.9 },
  { key: 'deurDubbel',    naam: 'Dubbele deur',         groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 1.6 },
  { key: 'schuifdeur',    naam: 'Schuifdeur',           groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 0.9 },
  { key: 'doorgang',      naam: 'Doorgang',             groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 1.0 },
  { key: 'raam',          naam: 'Raam',                 groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 1.2 },
  { key: 'terrasdeur',    naam: 'Raam- of terrasdeur',  groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 2.0 },
  { key: 'garagepoort',   naam: 'Garagepoort',          groep: 'Bouwkundig', kringtype: 'bouw', wand: true, opDeMuur: true, telt: false, breedte: 2.5 },
  { key: 'trap',          naam: 'Trap',                 groep: 'Bouwkundig', kringtype: 'bouw', wand: false, telt: false, breedte: 1.0, diepte: 2.6 },

  // --- Verdeling ------------------------------------------------------
  { key: 'verdeelbord',   naam: 'Verdeelbord',          groep: 'Verdeling',      kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 150 },
  { key: 'teller',        naam: 'Meter / teller',       groep: 'Verdeling',      kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 150 },
  { key: 'aarding',       naam: 'Aardingsklem',         groep: 'Verdeling',      kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 30 },
  { key: 'omvormer',      naam: 'Omvormer PV',          groep: 'Verdeling',      kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 180 },
  { key: 'noodstop',      naam: 'Noodstop',             groep: 'Verdeling',      kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 150 },
  { key: 'transformator', naam: 'Transformator',        groep: 'Verdeling',      kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 150 },
  { key: 'zonnepaneel',   naam: 'Fotovoltaïsch paneel', groep: 'Verdeling',      kringtype: 'verdeling',  wand: false, telt: false },
  { key: 'aardingsonderbreker', naam: 'Aardingsonderbreker', groep: 'Verdeling', kringtype: 'verdeling',  wand: true,  telt: false, hoogte: 60 },
];

export const CATALOG_BY_KEY = Object.fromEntries(CATALOG.map((c) => [c.key, c]));
export const GROEPEN = [...new Set(CATALOG.map((c) => c.groep))];

export function def(key) {
  return CATALOG_BY_KEY[key] || CATALOG_BY_KEY.lichtpunt;
}

/** Aantal "punten" dat een component inbrengt in de max-8-regel. */
export function puntenVan(comp) {
  const d = def(comp.type);
  if (!d.telt) return 0;
  return d.punten || 1;
}

/* ------------------------------------------------------------------ *
 * Kabel- en beveiligingstabel (AREI, huishoudelijk)
 * ------------------------------------------------------------------ */
export const KABELTABEL = [
  { mm2: 1.5, maxAmp: 16 },
  { mm2: 2.5, maxAmp: 20 },
  { mm2: 4,   maxAmp: 25 },
  { mm2: 6,   maxAmp: 32 },
  { mm2: 10,  maxAmp: 40 },
  { mm2: 16,  maxAmp: 63 },
];

export const AMPERES = [2, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63];
export const SECTIES = KABELTABEL.map((k) => k.mm2);

export function maxAmpVoor(mm2) {
  const rij = KABELTABEL.find((k) => k.mm2 === Number(mm2));
  return rij ? rij.maxAmp : 0;
}

export function minSectieVoor(amp) {
  const rij = KABELTABEL.find((k) => k.maxAmp >= Number(amp));
  return rij ? rij.mm2 : 16;
}

/** Standaardinstellingen per kringtype. */
export const KRINGSJABLOON = {
  verlichting: { amp: 16, mm2: 1.5, maxPunten: 8, kleur: '#f59e0b', naam: 'Verlichting' },
  stopcontact: { amp: 20, mm2: 2.5, maxPunten: 8, kleur: '#3b82f6', naam: 'Stopcontacten' },
  vast:        { amp: 16, mm2: 2.5, maxPunten: 0, kleur: '#10b981', naam: 'Vast toestel' },
  gemengd:     { amp: 16, mm2: 2.5, maxPunten: 8, kleur: '#a855f7', naam: 'Gemengde kring' },
};

export const KRINGKLEUREN = [
  '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#06b6d4',
  '#84cc16', '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#eab308',
];

/* ------------------------------------------------------------------ *
 * Ruimtes
 * ------------------------------------------------------------------ */
export const RUIMTETYPES = [
  { key: 'living',    naam: 'Living / woonkamer', kleur: '#e0f2fe' },
  { key: 'keuken',    naam: 'Keuken',             kleur: '#fef3c7', nat: true },
  { key: 'slaapkamer', naam: 'Slaapkamer',        kleur: '#ede9fe' },
  { key: 'badkamer',  naam: 'Badkamer',           kleur: '#cffafe', nat: true, vochtig: true },
  { key: 'toilet',    naam: 'Toilet',             kleur: '#cffafe', nat: true },
  { key: 'hal',       naam: 'Hal / gang',         kleur: '#f1f5f9' },
  { key: 'bureau',    naam: 'Bureau',             kleur: '#dcfce7' },
  { key: 'berging',   naam: 'Berging',            kleur: '#f5f5f4', vochtig: true },
  { key: 'wasplaats', naam: 'Wasplaats',          kleur: '#cffafe', nat: true, vochtig: true },
  { key: 'garage',    naam: 'Garage',             kleur: '#e7e5e4', vochtig: true },
  { key: 'zolder',    naam: 'Zolder',             kleur: '#faf5ff' },
  { key: 'kelder',    naam: 'Kelder',             kleur: '#e2e8f0', vochtig: true },
  { key: 'terras',    naam: 'Terras / buiten',    kleur: '#dcfce7', nat: true, vochtig: true, buiten: true },
  { key: 'technisch', naam: 'Technische ruimte',  kleur: '#fee2e2', vochtig: true },
  { key: 'overig',    naam: 'Overige ruimte',     kleur: '#f8fafc' },
];

export const RUIMTE_BY_KEY = Object.fromEntries(RUIMTETYPES.map((r) => [r.key, r]));

export function ruimteDef(key) {
  return RUIMTE_BY_KEY[key] || RUIMTE_BY_KEY.overig;
}

/* ------------------------------------------------------------------ *
 * Projectfabriek
 * ------------------------------------------------------------------ */
export function nieuwProject(naam = 'Nieuw project') {
  const nu = new Date().toISOString();
  const diffAlgemeen = { id: uid('dif'), naam: 'Algemeen', gevoeligheid: 300, amp: 40, type: 'A' };
  const diffBad = { id: uid('dif'), naam: 'Vochtige ruimtes', gevoeligheid: 30, amp: 40, type: 'A' };
  return {
    version: PROJECT_VERSION,
    id: uid('prj'),
    naam,
    klant: '',
    adres: '',
    aangemaakt: nu,
    gewijzigd: nu,
    net: { fasen: 1, spanning: 230, hoofdzekering: 40 },
    plan: {
      schaal: 1,           // meters per planeenheid (altijd 1, ruimte voor toekomstig gebruik)
      raster: 0.25,        // rasterafstand in meter
      niveaus: [{ id: uid('niv'), naam: 'Gelijkvloers' }],
      onderlaag: null,     // ingescand grondplan om over te tekenen
      ruimtes: [],
      muren: [],
    },
    componenten: [],
    differentiëlen: [diffAlgemeen, diffBad],
    kringen: [],
    verbindingen: [],      // { id, van: schakelaar-id, naar: verbruiker-id }
  };
}

/** Zet oudere projectbestanden om naar het huidige formaat. */
export function migreer(p) {
  if (!p || typeof p !== 'object') return nieuwProject();
  p.version = p.version || 1;
  p.plan = p.plan || { raster: 0.25, ruimtes: [], muren: [], niveaus: [] };
  p.plan.onderlaag = p.plan.onderlaag || null;
  p.plan.ruimtes = p.plan.ruimtes || [];
  p.plan.muren = p.plan.muren || [];
  p.plan.niveaus = p.plan.niveaus && p.plan.niveaus.length ? p.plan.niveaus : [{ id: uid('niv'), naam: 'Gelijkvloers' }];
  p.componenten = p.componenten || [];
  p.kringen = p.kringen || [];
  p.differentiëlen = p.differentiëlen || p.differentielen || [];
  p.verbindingen = p.verbindingen || [];
  p.net = p.net || { fasen: 1, spanning: 230, hoofdzekering: 40 };
  return p;
}
