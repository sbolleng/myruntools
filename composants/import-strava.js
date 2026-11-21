// ===== Import de l'export Strava (Mes stats, § 6) =====
//
// docs/module-stats-specification.md. Tout se lit dans le navigateur : le fichier ZIP n'est jamais envoyé ; seules les valeurs
// d'une activité (et ses meilleurs temps, tirés de sa trace) s'enregistrent. Une activité remplit la séance de course du même
// jour, sinon elle devient une séance hors plan. Utilisé par Mes stats (stats.html) et Mon profil (section Connexions).
//   mrtImport.feuille({ id, surFin })   la feuille « Importer mes activités » ; surFin({ ajoutees, rattachees }) après un import
//   mrtImport.lireZip(blob), lireCsv(texte), activitesDuCsv(texte), trace(octets, nom), meilleurs(t, d)   (banc d'essai)
//   mrtImport.preparer(activites, existantes, seances) → { bilan, nouvelles, rattachees }
//   mrtImport.dernierImport()           date du dernier import (Mon profil), ou null
(function () {
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sb = () => window.mrtSupabase;
  const pad = n => String(n).padStart(2, '0');
  const isoLocal = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

  // ----- ZIP : répertoire central (ZIP64 compris), fichiers rangés tels quels ou compressés (deflate)
  const u16 = (v, o) => v.getUint16(o, true), u32 = (v, o) => v.getUint32(o, true), u64 = (v, o) => v.getUint32(o, true) + v.getUint32(o + 4, true) * 4294967296;
  const octets = async (blob, a, b) => new Uint8Array(await blob.slice(a, b).arrayBuffer());
  async function decompresser(data, format) {
    const flux = new Blob([data]).stream().pipeThrough(new DecompressionStream(format));
    return new Uint8Array(await new Response(flux).arrayBuffer());
  }
  async function lireZip(blob) {
    const n = blob.size, debutFin = Math.max(0, n - 65558), fin = await octets(blob, debutFin, n), vf = new DataView(fin.buffer);
    let e = -1;
    for (let i = fin.length - 22; i >= 0; i--) if (u32(vf, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('pas un zip');
    let nb = u16(vf, e + 10), taille = u32(vf, e + 12), debut = u32(vf, e + 16);
    if (debut === 0xffffffff || nb === 0xffff) { // ZIP64 : le localisateur juste avant
      const l = e - 20;
      if (l < 0 || u32(vf, l) !== 0x07064b50) throw new Error('zip64 illisible');
      const pos = u64(vf, l + 8), z = await octets(blob, pos, pos + 56), vz = new DataView(z.buffer);
      if (u32(vz, 0) !== 0x06064b50) throw new Error('zip64 illisible');
      nb = u64(vz, 32); taille = u64(vz, 40); debut = u64(vz, 48);
    }
    const cd = await octets(blob, debut, debut + taille), v = new DataView(cd.buffer), dec = new TextDecoder();
    const fichiers = new Map();
    for (let p = 0, k = 0; k < nb && p + 46 <= cd.length; k++) {
      if (u32(v, p) !== 0x02014b50) break;
      const methode = u16(v, p + 10), ln = u16(v, p + 28), le = u16(v, p + 30), lc = u16(v, p + 32);
      let comp = u32(v, p + 20), brut = u32(v, p + 24), local = u32(v, p + 42);
      const nom = dec.decode(cd.subarray(p + 46, p + 46 + ln));
      for (let x = p + 46 + ln; x + 4 <= p + 46 + ln + le;) { // champ ZIP64 (0x0001) : tailles et position quand elles débordent
        const id = u16(v, x), t = u16(v, x + 2);
        if (id === 1) { let q = x + 4; if (brut === 0xffffffff) { brut = u64(v, q); q += 8; } if (comp === 0xffffffff) { comp = u64(v, q); q += 8; } if (local === 0xffffffff) local = u64(v, q); }
        x += 4 + t;
      }
      fichiers.set(nom, { methode, comp, local });
      p += 46 + ln + le + lc;
    }
    const lire = async nom => {
      const f = fichiers.get(nom);
      if (!f) return null;
      const h = await octets(blob, f.local, f.local + 30), vh = new DataView(h.buffer);
      const data = await octets(blob, f.local + 30 + u16(vh, 26) + u16(vh, 28), f.local + 30 + u16(vh, 26) + u16(vh, 28) + f.comp);
      if (f.methode === 0) return data;
      if (f.methode === 8) return decompresser(data, 'deflate-raw');
      throw new Error('compression inconnue');
    };
    return { noms: [...fichiers.keys()], lire };
  }

  // ----- CSV (guillemets, retours à la ligne dans un champ)
  function lireCsv(t) {
    const lignes = []; let l = [], c = '', q = false;
    t = t.replace(/^﻿/, '');
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { l.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; l.push(c); lignes.push(l); l = []; c = ''; }
      else c += ch;
    }
    if (c || l.length) { l.push(c); lignes.push(l); }
    return lignes.filter(x => x.some(y => y.trim()));
  }
  const norme = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
  const nombre = s => { s = String(s == null ? '' : s).trim().replace(/[\s  ]/g, ''); if (!s) return null; if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.'); const n = Number(s); return isFinite(n) ? n : null; };
  // Colonnes, en anglais ou en français : le nom normalisé (sans accent ni apostrophe).
  const COLONNES = {
    id: /^(activity id|id de l ?activite|id d ?activite|identifiant de l ?activite)$/,
    date: /^(activity date|date de l ?activite|date d ?activite)$/,
    nom: /^(activity name|nom de l ?activite|nom d ?activite)$/,
    type: /^(activity type|type d ?activite|type de l ?activite)$/,
    deplacement: /^(moving time|temps de deplacement|duree de deplacement)$/,
    ecoule: /^(elapsed time|temps ecoule|duree totale)$/,
    distance: /^distance$/,
    dplus: /^(elevation gain|denivele positif|gain d ?altitude|gain d ?elevation)$/,
    fcMoy: /^(average heart rate|frequence cardiaque moyenne|fc moyenne)$/,
    fcMax: /^(max heart rate|frequence cardiaque max|frequence cardiaque maximale|fc max)$/,
    cadence: /^(average cadence|cadence moyenne)$/,
    fichier: /^(filename|nom du fichier|fichier)$/
  };
  // Pratiques gardées ; tout le reste (vélo, natation, renforcement…) est ignoré.
  const PRATIQUES = { 'run': 'course', 'course a pied': 'course', 'course': 'course', 'trail run': 'trail', 'trail': 'trail', 'virtual run': 'tapis', 'course virtuelle': 'tapis', 'tapis': 'tapis',
    'walk': 'marche', 'marche': 'marche', 'hike': 'randonnee', 'randonnee': 'randonnee' };
  const MOIS = { jan: 1, janv: 1, janvier: 1, feb: 2, fev: 2, fevr: 2, fevrier: 2, mar: 3, mars: 3, apr: 4, avr: 4, avril: 4, may: 5, mai: 5, jun: 6, juin: 6, jul: 7, juil: 7, juillet: 7,
    aug: 8, aou: 8, aout: 8, sep: 9, sept: 9, septembre: 9, oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12 };
  // Date de l'export (en temps universel) : « Oct 15, 2026, 7:30:12 AM », « 15 oct. 2026, 07:30:12 » ou « 2026-10-15 07:30:12 ».
  function lireDate(s) {
    const t = norme(s);
    let a, m, j, h = 0, mi = 0, se = 0, r;
    if ((r = t.match(/(\d{4})-(\d\d)-(\d\d)/))) { a = +r[1]; m = +r[2]; j = +r[3]; }
    else {
      const mot = t.match(/[a-z]{3,9}/), an = t.match(/\b(\d{4})\b/), jr = t.replace(/\b\d{4}\b/, '').match(/\b(\d{1,2})\b/);
      if (!mot || !an || !jr) return null;
      m = MOIS[mot[0]] || MOIS[mot[0].slice(0, 4)] || MOIS[mot[0].slice(0, 3)]; a = +an[1]; j = +jr[1];
    }
    if ((r = t.match(/(\d{1,2}):(\d\d)(?::(\d\d))?\s*(am|pm)?/))) { h = +r[1]; mi = +r[2]; se = +(r[3] || 0); if (r[4] === 'pm' && h < 12) h += 12; if (r[4] === 'am' && h === 12) h = 0; }
    if (!a || !m || !j) return null;
    return new Date(Date.UTC(a, m - 1, j, h, mi, se));
  }
  // Les activités de activities.csv ; une colonne en double (Distance en km puis en m, FC max…) : la dernière qui a une valeur.
  function activitesDuCsv(texte) {
    const lignes = lireCsv(texte);
    if (!lignes.length) return null;
    const tete = lignes[0].map(norme), pos = {};
    for (const [k, re] of Object.entries(COLONNES)) pos[k] = tete.map((h, i) => (re.test(h) ? i : -1)).filter(i => i >= 0);
    if (!pos.id.length || !pos.date.length || !pos.type.length) return null;
    const val = (l, k) => { const v = pos[k].map(i => l[i]).filter(x => x != null && String(x).trim() !== ''); return v.length ? v[v.length - 1] : null; };
    return lignes.slice(1).map(l => {
      const debut = lireDate(val(l, 'date'));
      let distance = null;
      if (pos.distance.length >= 2) distance = nombre(l[pos.distance[pos.distance.length - 1]]); // la seconde est en mètres
      if (distance == null && pos.distance.length) { const k = nombre(l[pos.distance[0]]); distance = k == null ? null : k > 500 ? k : k * 1000; }
      const duree = nombre(val(l, 'deplacement')) || nombre(val(l, 'ecoule'));
      return {
        strava_id: String(val(l, 'id') || '').trim(), debut, date: debut ? isoLocal(debut) : null, nom: String(val(l, 'nom') || '').trim(),
        pratique: PRATIQUES[norme(val(l, 'type'))] || null, duree_s: duree ? Math.round(duree) : null, distance_m: distance == null ? null : Math.round(distance),
        denivele_m: nombre(val(l, 'dplus')) == null ? null : Math.round(nombre(val(l, 'dplus'))), fc_moyenne: nombre(val(l, 'fcMoy')) ? Math.round(nombre(val(l, 'fcMoy'))) : null,
        fc_max: nombre(val(l, 'fcMax')) ? Math.round(nombre(val(l, 'fcMax'))) : null, cadence: nombre(val(l, 'cadence')) || null, fichier: String(val(l, 'fichier') || '').trim()
      };
    }).filter(a => a.strava_id && a.date);
  }

  // ----- Traces : temps (s), distance cumulée (m), cadence ; FIT, GPX ou TCX, compressées (.gz) ou non
  function fit(b) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength), hl = b[0], taille = u32(v, 4), defs = {}, t = [], d = [], cad = [];
    let p = hl, dernier = 0;
    const fin = Math.min(b.length, hl + taille);
    const lireVal = (o, s, gros) => (s === 1 ? v.getUint8(o) : s === 2 ? v.getUint16(o, !gros) : s === 4 ? v.getUint32(o, !gros) : null);
    while (p < fin) {
      const h = b[p++];
      if (h & 0x80) { // en-tête de temps compressé
        const def = defs[(h >> 5) & 3], dt = h & 0x1f;
        let ts = (dernier & ~0x1f) + dt; if (dt < (dernier & 0x1f)) ts += 0x20; dernier = ts;
        if (!def) break;
        const r = { 253: ts }; let o = p;
        for (const f of def.champs) { r[f.num] = lireVal(o, f.taille, def.gros); o += f.taille; }
        p = o + def.dev;
        if (def.global === 20) ajouter(r);
      } else if (h & 0x40) { // définition
        const gros = b[p + 1] === 1, global = gros ? v.getUint16(p + 2) : v.getUint16(p + 2, true), n = b[p + 4];
        const champs = []; let q = p + 5;
        for (let i = 0; i < n; i++) { champs.push({ num: b[q], taille: b[q + 1] }); q += 3; }
        let dev = 0;
        if (h & 0x20) { const nd = b[q++]; for (let i = 0; i < nd; i++) { dev += b[q + 1]; q += 3; } }
        defs[h & 0xf] = { gros, global, champs, dev };
        p = q;
      } else {
        const def = defs[h & 0xf];
        if (!def) break;
        const r = {}; let o = p;
        for (const f of def.champs) { r[f.num] = lireVal(o, f.taille, def.gros); o += f.taille; }
        p = o + def.dev;
        if (r[253] != null && r[253] !== 0xffffffff) dernier = r[253];
        if (def.global === 20) ajouter(r);
      }
    }
    function ajouter(r) {
      if (r[253] == null || r[5] == null || r[5] === 0xffffffff) return;
      t.push(r[253]); d.push(r[5] / 100); cad.push(r[4] != null && r[4] !== 0xff ? r[4] : null);
    }
    return { t, d, cad };
  }
  const RAYON = 6371000, rad = x => x * Math.PI / 180;
  const haversine = (a, b) => { const dl = rad(b[0] - a[0]), dg = rad(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dg / 2) ** 2; return 2 * RAYON * Math.asin(Math.sqrt(h)); };
  function gpx(x) {
    const t = [], d = [], cad = []; let prec = null, cumul = 0;
    for (const m of x.split(/<trkpt\b/).slice(1)) {
      const la = m.match(/lat="([-\d.]+)"/), lo = m.match(/lon="([-\d.]+)"/), tm = m.match(/<time>([^<]+)<\/time>/), cd = m.match(/<(?:\w+:)?cad>(\d+)</);
      if (!la || !lo || !tm) continue;
      const pt = [Number(la[1]), Number(lo[1])];
      if (prec) cumul += haversine(prec, pt);
      prec = pt; t.push(Date.parse(tm[1]) / 1000); d.push(cumul); cad.push(cd ? Number(cd[1]) : null);
    }
    return { t, d, cad };
  }
  function tcx(x) {
    const t = [], d = [], cad = [];
    for (const m of x.split(/<Trackpoint\b/).slice(1)) {
      const tm = m.match(/<Time>([^<]+)<\/Time>/), di = m.match(/<DistanceMeters>([\d.]+)<\/DistanceMeters>/), cd = m.match(/<(?:\w+:)?(?:RunCadence|Cadence)>(\d+)</);
      if (!tm || !di) continue;
      t.push(Date.parse(tm[1]) / 1000); d.push(Number(di[1])); cad.push(cd ? Number(cd[1]) : null);
    }
    return { t, d, cad };
  }
  async function trace(data, nom) {
    nom = String(nom || '').toLowerCase();
    if (nom.endsWith('.gz')) { data = await decompresser(data, 'gzip'); nom = nom.slice(0, -3); }
    if (nom.endsWith('.fit')) return fit(data);
    const x = new TextDecoder().decode(data);
    if (nom.endsWith('.gpx')) return gpx(x);
    if (nom.endsWith('.tcx')) return tcx(x.trim());
    return null;
  }

  // ----- Meilleurs temps : le tronçon continu le plus rapide de chaque distance (Mes stats, § 3.1)
  const DISTANCES = [[1000, '1000'], [5000, '5000'], [10000, '10000'], [15000, '15000'], [20000, '20000'], [21097.5, '21097'], [30000, '30000'], [42195, '42195']];
  function meilleurs(t, d) {
    const res = {};
    if (!t || t.length < 2) return res;
    for (const [D, cle] of DISTANCES) {
      const L = D - 0.5; // un demi-mètre de tolérance : les distances cumulées arrondies
      if (d[d.length - 1] - d[0] < L) continue;
      let mieux = Infinity, i = 0;
      for (let j = 1; j < d.length; j++) {
        const cible = Math.max(d[0], d[j] - D);
        if (d[j] - d[0] < L) continue;
        while (i + 1 < j && d[i + 1] <= cible) i++;
        const f = d[i + 1] === d[i] ? 0 : (cible - d[i]) / (d[i + 1] - d[i]);
        mieux = Math.min(mieux, t[j] - (t[i] + f * (t[i + 1] - t[i])));
      }
      if (isFinite(mieux)) res[cle] = Math.round(mieux);
    }
    return res;
  }
  // Cadence : sous 120, c'est celle d'une jambe ; elle est doublée (pas par minute, deux jambes).
  const cadenceDouble = c => (c == null || !(c > 0) ? null : Math.round(c < 120 ? c * 2 : c));

  // ----- Rattachement (Mes stats, § 6) : déjà importée (même identifiant), séance de course du même jour (la distance prévue
  // la plus proche, pas encore rattachée), sinon nouvelle séance hors plan.
  function preparer(activites, existantes, seances) {
    const dejaIds = new Set(existantes.map(a => String(a.strava_id))), prises = new Set(existantes.map(a => a.seance).filter(Boolean));
    const bilan = { total: activites.length, nouvelles: 0, rattachees: 0, deja: 0, ignorees: 0 }, nouvelles = [], rattachees = [];
    for (const a of activites) {
      if (!a.pratique) { bilan.ignorees++; continue; }
      if (dejaIds.has(a.strava_id)) { bilan.deja++; continue; }
      dejaIds.add(a.strava_id);
      const km = (a.distance_m || 0) / 1000;
      const s = seances.filter(x => x.type === 'run' && x.date === a.date && !prises.has(x.id))
        .sort((x, y) => Math.abs((x.distance_km == null ? 1e6 : Number(x.distance_km)) - km) - Math.abs((y.distance_km == null ? 1e6 : Number(y.distance_km)) - km))[0];
      if (s) { prises.add(s.id); bilan.rattachees++; rattachees.push({ activite: a, seance: s }); }
      else { bilan.nouvelles++; nouvelles.push(a); }
    }
    return { bilan, nouvelles, rattachees };
  }
  const pluriel = (n, un, plusieurs) => n + ' ' + (n > 1 ? plusieurs : un);
  const bilanTexte = b => pluriel(b.total, 'activité', 'activités') + ' : ' + [pluriel(b.nouvelles, 'nouvelle', 'nouvelles')]
    .concat(b.rattachees ? [pluriel(b.rattachees, 'rattachée', 'rattachées') + ' à une séance du plan'] : [], b.deja ? [pluriel(b.deja, 'déjà importée', 'déjà importées')] : [],
      b.ignorees ? [pluriel(b.ignorees, 'ignorée', 'ignorées')] : []).join(', ');

  // Réalisé d'une séance, tiré d'une activité (bornes de la table seances).
  const realise = a => {
    const km = a.distance_m ? Math.round(a.distance_m / 100) / 10 : null, min = a.duree_s ? Math.max(1, Math.round(a.duree_s / 60)) : null;
    return { duree_reelle_min: min && min <= 1440 ? min : null, distance_reelle_km: km > 0 && km < 1000 ? km : null, denivele_reel_m: a.denivele_m >= 1 && a.denivele_m < 10000 ? a.denivele_m : null,
      fc_moyenne: a.fc_moyenne >= 30 && a.fc_moyenne <= 250 ? a.fc_moyenne : null, fc_max: a.fc_max >= 30 && a.fc_max <= 250 ? a.fc_max : null };
  };
  const aUnRealise = s => ['duree_reelle_min', 'distance_reelle_km', 'denivele_reel_m', 'fc_moyenne', 'fc_max'].some(k => s[k] != null);
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const ligneActivite = (a, seance) => ({ id: uuid(), strava_id: a.strava_id.slice(0, 40), debut: a.debut ? a.debut.toISOString() : null, date: a.date, pratique: a.pratique,
    duree_s: a.duree_s, distance_m: a.distance_m, denivele_m: a.denivele_m, fc_moyenne: realise(a).fc_moyenne, fc_max: realise(a).fc_max,
    cadence: a.cadence >= 60 && a.cadence <= 260 ? a.cadence : null, meilleurs: a.meilleurs && Object.keys(a.meilleurs).length ? a.meilleurs : null, seance });

  // Enregistre : séances hors plan, réalisés des séances rattachées (sans écraser une saisie), puis les activités.
  // En cas de panne, les séances ajoutées sont retirées : rien ne reste à moitié.
  async function enregistrer(prep) {
    const seancesNeuves = prep.nouvelles.map(a => {
      const r = realise(a);
      return Object.assign({ id: uuid(), date: a.date, type: 'run', libelle: (a.nom || 'Course à pied').slice(0, 100), faite: true, origine: 'import',
        duree_min: r.duree_reelle_min, distance_km: r.distance_reelle_km, denivele_m: r.denivele_reel_m }, r);
    });
    const activites = prep.nouvelles.map((a, i) => ligneActivite(a, seancesNeuves[i].id)).concat(prep.rattachees.map(x => ligneActivite(x.activite, x.seance.id)));
    const ids = seancesNeuves.map(s => s.id);
    try {
      for (let i = 0; i < seancesNeuves.length; i += 200) { const { error } = await sb().from('seances').insert(seancesNeuves.slice(i, i + 200)); if (error) throw error; }
      for (const x of prep.rattachees) {
        if (aUnRealise(x.seance)) continue; // la saisie l'emporte
        const { error } = await sb().from('seances').update(Object.assign({ faite: true }, realise(x.activite))).eq('id', x.seance.id);
        if (error) throw error;
      }
      for (let i = 0; i < activites.length; i += 200) { const { error } = await sb().from('activites').insert(activites.slice(i, i + 200)); if (error) throw error; }
      return true;
    } catch (e) {
      console.warn('Import : enregistrement impossible', e);
      if (ids.length) try { await sb().from('seances').delete().in('id', ids); } catch (x) { /* panne */ }
      return false;
    }
  }

  // Lit l'archive : activities.csv, puis la trace de chaque activité à importer (meilleurs temps, cadence manquante).
  async function lireArchive(fichier, existantes, seances, avance) {
    let zip;
    try { zip = await lireZip(fichier); } catch (e) { return { erreur: true }; }
    const nomCsv = zip.noms.find(n => /(^|\/)activities\.csv$/i.test(n));
    if (!nomCsv) return { erreur: true };
    const acts = activitesDuCsv(new TextDecoder().decode(await zip.lire(nomCsv)));
    if (!acts) return { erreur: true };
    const prep = preparer(acts, existantes, seances);
    const aLire = prep.nouvelles.concat(prep.rattachees.map(x => x.activite));
    for (let k = 0; k < aLire.length; k++) {
      const a = aLire[k];
      if (avance) avance(k, aLire.length);
      const nom = a.fichier && (zip.noms.find(n => n === a.fichier) || zip.noms.find(n => n.endsWith('/' + a.fichier) || n.endsWith(a.fichier)));
      if (nom && (a.pratique !== 'marche' && a.pratique !== 'randonnee' || a.cadence == null)) {
        try {
          const tr = await trace(await zip.lire(nom), nom);
          if (tr && tr.t.length > 1) {
            if (a.pratique === 'course' || a.pratique === 'trail') a.meilleurs = meilleurs(tr.t, tr.d);
            if (a.cadence == null) { const c = tr.cad.filter(x => x > 0); if (c.length) a.cadence = c.reduce((s, x) => s + x, 0) / c.length; }
          }
        } catch (e) { /* trace illisible : l'activité garde ses valeurs */ }
      }
      a.cadence = cadenceDouble(a.cadence);
    }
    if (avance) avance(aLire.length, aLire.length);
    return { prep };
  }

  async function dernierImport() {
    try { const { data } = await sb().from('activites').select('importe_le').order('importe_le', { ascending: false }).limit(1); return data && data[0] ? data[0].importe_le : null; } catch (e) { return null; }
  }

  // ----- La feuille « Importer mes activités »
  function feuille(opts) {
    const voile = document.createElement('div');
    voile.className = 'mc-voile';
    voile.innerHTML = '<div class="mc-panneau mc-etroit mc-court st-import" role="dialog" aria-modal="true" aria-labelledby="st-import-t" tabindex="-1"><div class="mc-corps">' +
      '<div class="pc-barre"><span></span><button type="button" class="mrt-rond is-fermer" data-fermer aria-label="Fermer" title="Fermer">' + window.mrtIcone.fermer + '</button></div>' +
      '<p class="fc-libelle" id="st-import-t">Importer mes activités</p>' +
      '<p class="st-aide">Sur strava.com : Paramètres › Mon compte › Télécharger ou supprimer votre compte › Demander une archive ; Strava envoie un fichier ZIP.</p>' +
      '<label class="mrt-btn st-fichier">Choisir le fichier ZIP<input type="file" accept=".zip,application/zip" hidden></label>' +
      '<p class="st-bilan" role="status"></p><progress class="st-avance" max="1" value="0" hidden></progress><p class="st-msg" role="alert"></p>' +
      '<div class="st-boutons"><button type="button" class="mrt-btn" data-fermer>Annuler</button><button type="button" class="mrt-btn is-principal" data-importer disabled>Importer</button></div>' +
      '</div></div>';
    document.body.appendChild(voile);
    document.documentElement.classList.add('mc-ouvert');
    const $ = s => voile.querySelector(s);
    const fermer = () => { voile.remove(); document.documentElement.classList.remove('mc-ouvert'); document.removeEventListener('keydown', clavier); };
    const clavier = e => { if (e.key === 'Escape') fermer(); };
    document.addEventListener('keydown', clavier);
    voile.addEventListener('mousedown', e => { if (e.target === voile) fermer(); });
    voile.querySelectorAll('[data-fermer]').forEach(b => b.addEventListener('click', fermer));
    let prep = null;
    $('input[type=file]').addEventListener('change', async ev => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      prep = null; $('[data-importer]').disabled = true; $('.st-msg').textContent = ''; $('.st-bilan').textContent = 'Lecture du fichier…';
      const barre = $('.st-avance');
      let existantes = [], seances = [];
      try {
        const [a, s] = await Promise.all([sb().from('activites').select('strava_id, seance'), sb().from('seances').select('*').eq('utilisateur', opts.id)]);
        if (a.error || s.error) throw a.error || s.error;
        existantes = a.data || []; seances = s.data || [];
      } catch (e) { $('.st-bilan').textContent = ''; $('.st-msg').textContent = 'Import impossible pour l\'instant.'; return; }
      const r = await lireArchive(f, existantes, seances, (k, n) => { barre.hidden = n < 2; barre.max = Math.max(1, n); barre.value = k; });
      barre.hidden = true;
      if (r.erreur) { $('.st-bilan').textContent = ''; $('.st-msg').textContent = 'Ce fichier n\'est pas un export Strava.'; return; }
      prep = r.prep;
      $('.st-bilan').textContent = bilanTexte(prep.bilan);
      $('[data-importer]').disabled = !(prep.bilan.nouvelles + prep.bilan.rattachees);
    });
    $('[data-importer]').addEventListener('click', async () => {
      if (!prep) return;
      const b = $('[data-importer]'); b.disabled = true;
      if (!await enregistrer(prep)) { $('.st-msg').textContent = 'Import impossible pour l\'instant.'; b.disabled = false; return; }
      const res = { ajoutees: prep.bilan.nouvelles, rattachees: prep.bilan.rattachees };
      fermer();
      if (opts.surFin) opts.surFin(res);
    });
    $('.st-fichier').focus();
  }
  const finTexte = r => pluriel(r.ajoutees, 'séance ajoutée', 'séances ajoutées') + ', ' + pluriel(r.rattachees, 'rattachée', 'rattachées') + '.';

  window.mrtImport = { feuille, lireZip, lireCsv, activitesDuCsv, trace, meilleurs, preparer, bilanTexte, finTexte, dernierImport, cadenceDouble, DISTANCES };
})();
