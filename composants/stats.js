// ===== Mes stats : progression mois par mois et analyse de l'IA =====
//
// docs/module-stats-specification.md. Les séances de course faites (réalisé, sinon prévu), avec la pratique, la cadence et les
// meilleurs temps de leur activité importée (import-strava.js) ; Mon profil (VMA ou repère d'allure, FC max, FC de repos) ;
// la Saison (courses au rôle Objectif). Ni renforcement, ni FC de repos ou FC max affichées, ni appareil, ni provenance.
//   mrtStats.calculer(entree)   tous les chiffres de la page (banc d'essai) ; entree : { seances, activites, courses, mesures,
//                               entrainement, periode ('12mois' | 'annee' | 'tout'), aujourdhui (Date) }
//   mrtStats.page(el, ctx)      la page ; ctx : { id, courses, mesures, lectureSeule }
// Graphiques : graphique.js (barres et courbes) ; feuille d'import : import-strava.js.
(function () {
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const F = () => window.mrtFormat;
  const virgule = (n, dec) => Number(n).toFixed(dec).replace('.', ',');
  const nombre = n => F().nombre(Math.round(n));
  // Temps : « 25:14 », « 1:56:05 » ; allure : « 5:03 ».
  const temps = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); };
  const allure = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + pad(s % 60); };
  const PRATIQUES_COURSE = new Set(['course', 'trail', 'tapis']);
  const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const cleMois = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
  const moisSuivant = c => { const [a, m] = c.split('-').map(Number); return m === 12 ? (a + 1) + '-01' : a + '-' + pad(m + 1); };
  const indexMois = c => { const [a, m] = c.split('-').map(Number); return a * 12 + m - 1; };
  const milieu = c => { const [a, m] = c.split('-').map(Number); return new Date(a, m - 1, 15).getTime(); };
  const nomMois = c => { const [a, m] = c.split('-').map(Number); return F().MOIS[m - 1] + ' ' + a; };

  // Distances des meilleurs temps et des temps estimés.
  const MEILLEURS = [['1000', '1 km', 1], ['5000', '5 km', 5], ['10000', '10 km', 10], ['15000', '15 km', 15], ['20000', '20 km', 20], ['21097', 'Semi-marathon', 21.0975], ['30000', '30 km', 30], ['42195', 'Marathon', 42.195]];
  const ESTIMES = [['5 km', 5, 0.95], ['10 km', 10, 0.90], ['Semi-marathon', 21.0975, 0.85], ['Marathon', 42.195, 0.80]];
  const FORMATS = { route_5km: ['5 km', 5], route_10km: ['10 km', 10], route_semi: ['Semi', 21.0975], route_marathon: ['Marathon', 42.195] };
  const REPERES = { '10km': ['10 km', 10, 'temps_10km_s', 0.90], semi: ['Semi', 21.0975, 'temps_semi_s', 0.85], marathon: ['Marathon', 42.195, 'temps_marathon_s', 0.80] };
  const ALLURES = [['1', 'Endurance', null, 0.75], ['2', 'Marathon', 0.75, 0.85], ['3', 'Seuil', 0.85, 0.92], ['4', 'VMA', 0.95, 1.05], ['5', 'Sprint', 1.05, null]];
  const ZONES = [['Z1', 'Récupération', 0.5, 0.6], ['Z2', 'Endurance fondamentale', 0.6, 0.7], ['Z3', 'Tempo', 0.7, 0.8], ['Z4', 'Seuil', 0.8, 0.9], ['Z5', 'VMA', 0.9, 1]];
  const AIDES = {
    volume: 'Distance courue chaque mois, toutes pratiques.',
    dplus: 'Dénivelé positif cumulé chaque mois.',
    allure: 'Barre plus haute = plus rapide. 100 m de D+ comptent comme 1 km à plat.',
    cadence: 'Pas par minute, moyenne du mois. La zone efficiente se situe autour de 170 à 180.',
    efficience: 'Battements de cœur pour 1 km-effort. La courbe descend = tu progresses.',
    specificite: 'Mètres de D+ par km courus, comparés à ceux de tes Objectifs.'
  };

  // Valeurs d'une séance : réalisé, sinon prévu ; pratique, cadence et meilleurs temps de son activité.
  function valeurs(s, act) {
    const v = (r, p) => (s[r] != null ? Number(s[r]) : s[p] != null ? Number(s[p]) : null);
    return { date: s.date, duree: v('duree_reelle_min', 'duree_min'), dist: v('distance_reelle_km', 'distance_km'), dplus: v('denivele_reel_m', 'denivele_m') || 0,
      fc: s.fc_moyenne != null ? Number(s.fc_moyenne) : null, pratique: act ? act.pratique : 'course', cadence: act && act.cadence ? Number(act.cadence) : null,
      meilleurs: act && act.meilleurs, libelle: s.libelle };
  }

  function bornes(periode, aujourdhui, seances) {
    const fin = cleMois(aujourdhui);
    let debut;
    if (periode === 'annee') debut = aujourdhui.getFullYear() + '-01';
    else if (periode === 'tout') debut = seances.length ? seances.map(s => s.date.slice(0, 7)).sort()[0] : fin;
    else debut = cleMois(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 11, 1));
    if (debut > fin) debut = fin;
    const mois = [];
    for (let c = debut; c <= fin; c = moisSuivant(c)) mois.push(c);
    return { debut, fin, mois };
  }

  // Droite des moindres carrés (x : rang du mois) : pente par mois, et valeur à un rang donné.
  function tendance(pts) {
    if (pts.length < 3) return null;
    const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
    const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
    if (!sxx) return null;
    const pente = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx;
    return { pente, a: x => my + pente * (x - mx) };
  }

  function calculer(e) {
    const auj = e.aujourdhui || new Date(), aujIso = iso(auj);
    const parSeance = {};
    (e.activites || []).forEach(a => { if (a.seance) parSeance[a.seance] = a; });
    const faites = (e.seances || []).filter(s => s.type === 'run' && s.faite && s.date && s.date <= aujIso);
    const b = bornes(e.periode, auj, faites);
    const dans = faites.filter(s => s.date.slice(0, 7) >= b.debut).map(s => valeurs(s, parSeance[s.id]));

    // Mois par mois.
    const mois = b.mois.map(c => {
      const ss = dans.filter(v => v.date.slice(0, 7) === c), course = ss.filter(v => PRATIQUES_COURSE.has(v.pratique));
      const r = { mois: c, volume: null, dplus: null, allure: null, cadence: null, efficience: null, dkm: null };
      if (ss.length) {
        r.volume = Math.round(ss.reduce((s, v) => s + (v.dist || 0), 0) * 10) / 10;
        r.dplus = Math.round(ss.reduce((s, v) => s + v.dplus, 0));
        if (r.volume > 0) r.dkm = Math.round(r.dplus / r.volume * 10) / 10;
      }
      const al = course.filter(v => v.dist > 0 && v.duree > 0);
      const ke = al.reduce((s, v) => s + v.dist + v.dplus / 100, 0);
      if (ke > 0) r.allure = Math.round(al.reduce((s, v) => s + v.duree * 60, 0) / ke);
      const ca = course.filter(v => v.cadence && v.duree > 0), dca = ca.reduce((s, v) => s + v.duree, 0);
      if (dca > 0) r.cadence = Math.round(ca.reduce((s, v) => s + v.cadence * v.duree, 0) / dca);
      const ef = al.filter(v => v.fc > 0), kef = ef.reduce((s, v) => s + v.dist + v.dplus / 100, 0);
      if (kef > 0) r.efficience = Math.round(ef.reduce((s, v) => s + v.fc * v.duree, 0) / kef);
      return r;
    });
    const avecAllure = mois.filter(m => m.allure != null).map(m => [indexMois(m.mois), m.allure]);
    const tend = tendance(avecAllure);

    // Meilleurs temps (§ 3.1) : traces des séances de course et de trail de la période.
    const meilleurs = [];
    MEILLEURS.forEach(([cle, nom, km]) => {
      let mieux = null;
      dans.forEach(v => { if ((v.pratique === 'course' || v.pratique === 'trail') && v.meilleurs && v.meilleurs[cle] > 0 && (!mieux || v.meilleurs[cle] < mieux.s)) mieux = { s: v.meilleurs[cle], v }; });
      if (mieux) meilleurs.push({ nom, temps: mieux.s, allure: mieux.s / km, date: mieux.v.date, seance: mieux.v.libelle, dist: mieux.v.dist, dplus: mieux.v.dplus });
    });

    // Temps estimés (§ 3.2) : la dernière course sur route de moins de 12 mois, sinon le repère d'allure en temps, sinon la VMA.
    const en = e.entrainement || {}, il12 = iso(new Date(auj.getFullYear() - 1, auj.getMonth(), auj.getDate()));
    const course = (e.courses || []).filter(c => c.etat === 'courue' && !c.dnf && Number(c.temps) > 0 && FORMATS[c.format] && c.date && c.date >= il12 && c.date <= aujIso)
      .sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    let ref = null;
    if (course) ref = { km: FORMATS[course.format][1], s: Number(course.temps), texte: 'Estimés d\'après : ' + FORMATS[course.format][0] + ' en ' + temps(course.temps) + ', ' + F().date(course.date) + '.' };
    else if (REPERES[en.allure_type] && Number(en[REPERES[en.allure_type][2]]) > 0) {
      const r = REPERES[en.allure_type];
      ref = { km: r[1], s: Number(en[r[2]]), texte: 'Estimés d\'après ton repère d\'allure : ' + r[0] + ' en ' + temps(en[r[2]]) + '.' };
    }
    // VMA (§ 3.3) : celle de Mon profil, sinon celle du repère d'allure en temps.
    let vma = Number(en.vma) > 0 ? Number(en.vma) : null;
    if (!vma && REPERES[en.allure_type] && Number(en[REPERES[en.allure_type][2]]) > 0) { const r = REPERES[en.allure_type]; vma = r[1] / (Number(en[r[2]]) / 3600) / r[3]; }
    let estimes = null;
    if (ref) estimes = { texte: ref.texte, lignes: ESTIMES.map(([nom, km]) => { const s = ref.s * Math.pow(km / ref.km, 1.06); return { nom, temps: s, allure: s / km }; }) };
    else if (vma) estimes = { texte: 'Estimés d\'après ta VMA (' + virgule(vma, 1) + ' km/h).', lignes: ESTIMES.map(([nom, km, p]) => { const s = km / (vma * p) * 3600; return { nom, temps: s, allure: s / km }; }) };
    const allures = vma ? ALLURES.map(([n, type, a, z]) => ({ n, type, lente: a == null ? null : 3600 / (vma * a), rapide: z == null ? null : 3600 / (vma * z) })) : null;

    // Progression (§ 3.4).
    const avecCad = mois.filter(m => m.cadence != null);
    const progression = {
      volume: dans.length ? Math.round(dans.reduce((s, v) => s + (v.dist || 0), 0)) : null,
      dplus: dans.length ? Math.round(dans.reduce((s, v) => s + v.dplus, 0)) : null,
      cadence: avecCad.length ? avecCad[avecCad.length - 1].cadence - avecCad[0].cadence : null
    };

    // Zones cardiaques (§ 3.5).
    const fcMax = Number(en.fc_max) || null, fcRepos = Number((e.mesures || {}).fc_repos) || null;
    const zones = fcMax && fcRepos && fcMax > fcRepos ? ZONES.map(([z, nom, a, c]) => ({ z, nom, de: Math.round(fcRepos + a * (fcMax - fcRepos)), a: Math.round(fcRepos + c * (fcMax - fcRepos)) })) : null;

    // Écart de spécificité (§ 3.7) : cible en ligne droite, du premier mois réel jusqu'à chaque Objectif.
    const objectifs = (window.mrtObjectifsCap ? window.mrtObjectifsCap(e.courses || []) : []).filter(c => c.date > aujIso && Number(c.distance) > 0)
      .map(c => ({ nom: c.course, date: c.date, mois: c.date.slice(0, 7), dkm: Math.round((Number(c.dplus) || 0) / Number(c.distance) * 10) / 10 }));
    const premier = mois.find(m => m.dkm != null);
    const cible = [];
    if (premier && objectifs.some(o => o.dkm >= 10)) {
      let c0 = premier.mois, v0 = premier.dkm;
      cible.push({ mois: c0, dkm: v0 });
      objectifs.forEach(o => {
        const n = indexMois(o.mois) - indexMois(c0);
        if (n <= 0) return;
        for (let k = 1, c = moisSuivant(c0); k <= n; k++, c = moisSuivant(c)) cible.push({ mois: c, dkm: Math.round((v0 + (o.dkm - v0) * k / n) * 10) / 10 });
        c0 = o.mois; v0 = o.dkm;
      });
    }
    const specificite = { masque: !objectifs.some(o => o.dkm >= 10), objectifs, cible };

    return { debut: b.debut, fin: b.fin, mois, tendance: tend ? { pente: tend.pente, a: tend.a } : null, meilleurs, estimes, allures, progression, zones, specificite, vide: !faites.length };
  }

  // ----- Échelle d'un axe : un pas de 1, 2 ou 5 × 10^n, quatre graduations environ.
  function echelle(vals, o) {
    o = o || {};
    let min = Math.min(...vals), max = Math.max(...vals);
    if (o.zero) min = Math.min(0, min);
    if (o.repere != null) { min = Math.min(min, o.repere); max = Math.max(max, o.repere); }
    const pm = o.pasMin || 1;
    if (max - min < 2 * pm) { const c = (max + min) / 2; min = o.zero ? Math.min(0, c - pm) : c - pm; max = c + pm; }
    const brut = (max - min) / 4, p10 = Math.pow(10, Math.floor(Math.log10(brut))), pas = Math.max(pm, [1, 2, 5, 10].map(k => k * p10).find(x => x >= brut) || brut);
    return { min: Math.floor(min / pas) * pas, max: Math.ceil(max / pas) * pas, pas };
  }

  // ----- La page
  const PERIODES = [['12mois', '12 mois'], ['annee', 'Année'], ['tout', 'Depuis le début']];
  const CLE_PERIODE = 'mrt-stats-periode';
  const lire = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
  const MAX_ACTUALISER = 3;

  const carte = (cls, titre, corps) => '<section class="card st-carte ' + cls + '"><h2 class="mg-titre is-fixe st-titre">' + titre + '</h2>' + corps + '</section>';
  const tableau = (tete, lignes) => '<div class="table-scroll"><table class="st-table"><thead><tr>' + tete.map(t => '<th>' + t + '</th>').join('') + '</tr></thead><tbody>' +
    lignes.map(l => '<tr>' + l.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const lienProfil = t => '<p class="st-vide">' + t + ' <button type="button" class="mrt-lien" data-profil>Mon profil</button></p>';

  function htmlTableaux(r) {
    const meilleurs = carte('st-meilleurs', 'Meilleurs temps', r.meilleurs.length ? tableau(['Distance', 'Temps', 'Allure', 'Date', 'Séance'], r.meilleurs.map(m => [esc(m.nom), temps(m.temps), allure(m.allure) + ' /km',
      F().date(m.date), esc(m.seance) + (m.dist ? '<span class="st-sous">' + virgule(m.dist, 1) + ' km' + (m.dplus ? ' · ' + nombre(m.dplus) + ' m D+' : '') + '</span>' : '')]))
      : '<p class="st-vide">Pas encore de meilleur temps : importe tes activités.</p>');
    const estimes = carte('st-estimes', 'Temps estimés', r.estimes ? tableau(['Distance', 'Temps', 'Allure'], r.estimes.lignes.map(l => [l.nom, temps(l.temps), allure(l.allure) + ' /km'])) +
      '<p class="st-aide">' + esc(r.estimes.texte) + '</p>' : lienProfil('Renseigne ta VMA dans'));
    const allures = carte('st-allures', 'Allures d\'entraînement', r.allures ? tableau(['N°', 'Type', 'Allure'], r.allures.map(a => [a.n, a.type,
      a.lente == null ? 'plus lente que ' + allure(a.rapide) + ' /km' : a.rapide == null ? 'plus rapide que ' + allure(a.lente) + ' /km' : allure(a.lente) + ' à ' + allure(a.rapide) + ' /km']))
      : lienProfil('Renseigne ta VMA dans'));
    const p = r.progression, tuile = (lib, val) => '<div class="st-tuile"><span class="st-tuile-l">' + lib + '</span><span class="st-grand">' + val + '</span></div>';
    const progression = carte('st-progression', 'Progression', '<div class="st-tuiles">' +
      tuile('Volume total', p.volume == null ? '—' : nombre(p.volume) + ' km') + tuile('D+ cumulé', p.dplus == null ? '—' : nombre(p.dplus) + ' m') +
      tuile('Cadence', p.cadence == null ? '—' : (p.cadence > 0 ? '+' : p.cadence < 0 ? '−' : '') + Math.abs(p.cadence) + ' pas/min') + '</div>');
    const zones = carte('st-zones', 'Zones cardiaques', r.zones ? tableau(['Zone', 'Nom', 'Plage'], r.zones.map(z => [z.z, z.nom, z.de + ' – ' + z.a + ' bpm']))
      : lienProfil('Renseigne ta FC max et ta FC de repos dans'));
    return { meilleurs, estimes, allures, progression, zones };
  }

  // Un graphique mensuel : barres ou courbe, une valeur par mois.
  function graphique(el, r, o) {
    const ms = r.mois.filter(m => m[o.champ] != null);
    const debut = new Date(...r.debut.split('-').map((x, i) => Number(x) - i)).getTime();
    const finMois = o.finMois || r.fin, [fa, fm] = finMois.split('-').map(Number), fin = new Date(fa, fm, 0).getTime();
    const vals = ms.map(m => m[o.champ]).concat((o.cible || []).map(c => c.dkm));
    const cfg = { cle: 'mrt-stats-' + o.champ, titre: o.titre, fixe: true, debut, fin, bas: '<p class="st-aide">' + esc(o.aide) + '</p>' };
    if (!ms.length) return window.mrtGraphique(el, Object.assign(cfg, { vide: 'Pas encore de donnée sur la période.' }));
    const ech = echelle(vals, { zero: o.barres && !o.inverse, repere: o.repere, pasMin: o.pasMin });
    if (o.inverse) { ech.max += ech.pas; }
    const points = ms.map(m => ({ id: m.mois, t: milieu(m.mois), y: m[o.champ], forme: o.barres ? 'barre' : 'plein', aria: nomMois(m.mois) + ' : ' + o.fmt(m[o.champ]),
      bulle: { valeur: o.fmt(m[o.champ]), nom: MOIS_LONG[Number(m.mois.slice(5)) - 1] + ' ' + m.mois.slice(0, 4) } }));
    (o.cible || []).forEach(c => points.push({ id: 'c' + c.mois, t: milieu(c.mois), y: c.dkm, forme: 'cible', aria: 'Cible ' + nomMois(c.mois) + ' : ' + o.fmt(c.dkm),
      bulle: { valeur: o.fmt(c.dkm), nom: 'Cible · ' + MOIS_LONG[Number(c.mois.slice(5)) - 1] + ' ' + c.mois.slice(0, 4) } }));
    (o.etiquettes || []).forEach(x => points.push({ id: 'o' + x.mois + x.nom, t: milieu(x.mois), y: x.dkm, forme: 'losange', etiquette: x.nom + ' · ' + virgule(x.dkm, 0) + ' m/km', aria: x.nom + ' : ' + virgule(x.dkm, 1) + ' m/km',
      bulle: { valeur: virgule(x.dkm, 1) + ' m/km', nom: x.nom } }));
    const nMois = indexMois(finMois) - indexMois(r.debut) + 1;
    Object.assign(cfg, {
      axeY: { libelle: o.libelle, min: o.inverse ? ech.min : ech.min, max: ech.max, pas: ech.pas, fmt: o.fmtAxe || o.fmt, inverse: !!o.inverse }, points,
      barres: o.barres ? Math.min(6, 96 / nMois * 0.55) : 0, ligne: o.barres ? null : ms.map(m => m.mois), ligne2: (o.cible || []).map(c => 'c' + c.mois),
      tendance: o.tendance || null, aujourdhui: o.cible && o.cible.length ? Date.now() : null, etiquettesHautGauche: true
    });
    if (o.repere != null) cfg.tendance = { y0: o.repere, y1: o.repere }; // repère horizontal (cadence : 170)
    return window.mrtGraphique(el, cfg);
  }

  // Texte de l'IA, par sécurité : sans phrase qui cite un appareil, une provenance ou le renforcement, et 1 500 caractères au plus,
  // coupé à la dernière phrase entière.
  const INTERDITS = /\b(huawei|garmin|strava|coros|polar|suunto|apple|montres?|applications?|renforcement|renfo)\b/i;
  function nettoyer(t) {
    const paras = String(t || '').split(/\n\s*\n/).map(p => (p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []).filter(x => !INTERDITS.test(x)).join('').trim()).filter(Boolean);
    let x = paras.join('\n\n');
    if (x.length > 1500) {
      const c = x.slice(0, 1500), fin = Math.max(c.lastIndexOf('. '), c.lastIndexOf('.\n'), c.lastIndexOf('! '), c.lastIndexOf('? '), c.endsWith('.') ? 1499 : -1);
      x = fin > 750 ? c.slice(0, fin + 1) : c.slice(0, 1499).trimEnd() + '…';
    }
    return x;
  }

  async function lireTout(ctx) {
    const db = window.mrtSupabase;
    const [s, a, e, an] = await Promise.all([
      db.from('seances').select('*').eq('utilisateur', ctx.id).order('date'),
      db.from('activites').select('id, seance, pratique, cadence, meilleurs, date'),
      db.from('profil_entrainement').select('*'),
      db.from('analyses_stats').select('*').order('cree', { ascending: false }).limit(MAX_ACTUALISER + 1)
    ]);
    return { seances: s.data || [], activites: a.data || [], entrainement: (e.data && e.data[0]) || {}, analyses: an.error ? [] : (an.data || []) };
  }

  // Ce qui part à l'IA : les chiffres de la page, sans nom ni adresse.
  function contexteIA(r, entrainement, periode) {
    const m = r.mois.filter(x => x.volume != null || x.cadence != null);
    return {
      periode, mois: m.map(x => ({ mois: x.mois, volume_km: x.volume, dplus_m: x.dplus, allure_effort_s_par_km_effort: x.allure, cadence_pas_min: x.cadence, battements_par_km_effort: x.efficience, dplus_par_km: x.dkm })),
      tendance_allure_effort_s_par_mois: r.tendance ? Math.round(r.tendance.pente * 10) / 10 : null,
      meilleurs_temps: r.meilleurs.map(x => ({ distance: x.nom, temps: temps(x.temps), date: x.date })),
      temps_estimes: r.estimes ? r.estimes.lignes.map(l => ({ distance: l.nom, temps: temps(l.temps) })) : null,
      allures: r.allures ? r.allures.map(a => ({ type: a.type, de: a.lente ? allure(a.lente) : null, a: a.rapide ? allure(a.rapide) : null })) : null,
      zones: r.zones, progression: r.progression,
      objectifs: r.specificite.objectifs.map(o => ({ date: o.date, dplus_par_km: o.dkm })), cible_dplus_par_km: r.specificite.masque ? null : r.specificite.cible,
      niveau: entrainement.niveau || null
    };
  }

  async function page(el, ctx) {
    if (ctx.lectureSeule) { el.innerHTML = '<div class="card"><p class="st-vide">Les stats ne sont pas partagées.</p></div>'; return; }
    let donnees = await lireTout(ctx);
    let periode = PERIODES.some(p => p[0] === lire(CLE_PERIODE)) ? lire(CLE_PERIODE) : '12mois';
    let analyse = donnees.analyses[0] ? Object.assign({}, donnees.analyses[0], { texte: nettoyer(donnees.analyses[0].texte) }) : null, enCours = false, panne = false, reserve = false;
    const aujourdhui = () => new Date();
    const calc = () => calculer({ seances: donnees.seances, activites: donnees.activites, courses: ctx.courses, mesures: ctx.mesures, entrainement: donnees.entrainement, periode, aujourdhui: aujourdhui() });
    const actualisesAujourdhui = () => donnees.analyses.filter(a => a.motif === 'actualiser' && String(a.cree).slice(0, 10) === iso(aujourdhui())).length;

    const htmlAnalyse = () => {
      if (reserve || (!analyse && !enCours && !panne)) return '';
      const grise = actualisesAujourdhui() >= MAX_ACTUALISER;
      const date = analyse ? F().date(String(analyse.cree).slice(0, 10)) : F().date(iso(aujourdhui()));
      return '<section class="card st-analyse" aria-live="polite"><div class="st-analyse-haut"><h2 class="st-libelle">Analyse · au ' + date + '</h2>' +
        '<button type="button" class="mrt-btn" data-actualiser' + (grise || enCours ? ' disabled' : '') + '>Actualiser</button></div>' +
        (grise ? '<p class="st-aide st-demain">Reviens demain.</p>' : '') +
        (panne ? '<p class="st-msg">Analyse impossible pour l\'instant.</p>' : '') +
        (enCours ? '<p class="st-texte">Analyse en cours…</p>' : analyse ? '<div class="st-texte">' + esc(analyse.texte).split(/\n+/).map(x => '<p>' + x + '</p>').join('') + '</div>' : '') + '</section>';
    };

    const dessiner = message => {
      const r = calc(), t = htmlTableaux(r);
      el.__resultat = r; // banc d'essai
      el.innerHTML = '<div class="st-haut"><label class="st-periode"><span class="st-libelle">Période</span><select class="mrt-champ" data-periode>' +
        PERIODES.map(([v, l]) => '<option value="' + v + '"' + (v === periode ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
        '<button type="button" class="mrt-btn" data-importer>Importer</button></div>' +
        (message ? '<p class="st-info" role="status">' + esc(message) + '</p>' : '') +
        '<div class="st-zone-analyse">' + htmlAnalyse() + '</div>' +
        (r.vide ? '<div class="card"><p class="st-vide">Aucune séance faite pour l\'instant. Importe ton historique Strava ou note tes séances dans le Calendrier.</p>' +
          '<button type="button" class="mrt-btn is-principal" data-importer>Importer</button></div>' :
        '<div class="st-grille">' + t.meilleurs + t.estimes + t.allures + t.progression +
          '<div class="st-g" data-g="volume"></div><div class="st-g" data-g="dplus"></div><div class="st-g" data-g="allure"></div><div class="st-g" data-g="cadence"></div>' +
          '<div class="st-g" data-g="efficience"></div>' + (r.specificite.masque ? '' : '<div class="st-g" data-g="specificite"></div>') + '</div>' + t.zones);
      if (r.vide) return;
      const g = k => el.querySelector('[data-g="' + k + '"]');
      graphique(g('volume'), r, { champ: 'volume', titre: 'Volume mensuel', libelle: 'km', barres: true, fmt: v => virgule(v, 1) + ' km', fmtAxe: v => String(v), aide: AIDES.volume });
      graphique(g('dplus'), r, { champ: 'dplus', titre: 'D+ mensuel', libelle: 'm', barres: true, fmt: v => nombre(v) + ' m', fmtAxe: v => nombre(v), aide: AIDES.dplus });
      let tend = null, aideAllure = AIDES.allure;
      if (r.tendance) {
        const d0 = indexMois(r.debut), d1 = indexMois(r.fin) + 1;
        tend = { y0: r.tendance.a(d0 - 0.5), y1: r.tendance.a(d1 - 0.5) };
        aideAllure += ' Tendance : ' + (r.tendance.pente > 0 ? '+' : r.tendance.pente < 0 ? '−' : '') + virgule(Math.abs(r.tendance.pente), 1) + ' s par km-effort et par mois.';
      }
      graphique(g('allure'), r, { champ: 'allure', titre: 'Allure-effort', libelle: 'min:s par km-effort', barres: true, inverse: true, pasMin: 5, fmt: v => allure(v) + ' /km-effort', fmtAxe: v => allure(v), aide: aideAllure, tendance: tend });
      graphique(g('cadence'), r, { champ: 'cadence', titre: 'Cadence', libelle: 'pas/min', fmt: v => v + ' pas/min', fmtAxe: v => String(v), aide: AIDES.cadence, repere: 170 });
      graphique(g('efficience'), r, { champ: 'efficience', titre: 'Efficience cardiaque', libelle: 'battements par km-effort', fmt: v => nombre(v) + ' battements', fmtAxe: v => nombre(v), aide: AIDES.efficience });
      if (!r.specificite.masque) {
        const objs = r.specificite.objectifs.filter(o => o.dkm >= 10);
        graphique(g('specificite'), r, { champ: 'dkm', titre: 'Écart de spécificité', libelle: 'm de D+ par km', fmt: v => virgule(v, 1) + ' m/km', fmtAxe: v => String(v), pasMin: 1, aide: AIDES.specificite,
          cible: r.specificite.cible, etiquettes: objs, finMois: objs.length ? objs[objs.length - 1].mois > r.fin ? objs[objs.length - 1].mois : r.fin : r.fin });
      }
    };

    // Analyse de l'IA (§ 5) : réservée aux pilotes ; refaite après un import ou par « Actualiser ».
    // Première analyse (à l'arrivée) : rien ne s'affiche avant la réponse, et une panne reste silencieuse (la page ne bouge pas pour rien).
    const analyser = async motif => {
      if (reserve || enCours) return;
      const discret = motif === 'premiere';
      enCours = !discret; panne = false;
      majAnalyse();
      let res = null;
      try {
        const { data, error } = await window.mrtSupabase.functions.invoke('analyser-stats', { body: { motif, periode, contexte: contexteIA(calc(), donnees.entrainement, periode) } });
        let code = data && data.code;
        if (error && error.context && typeof error.context.json === 'function') { try { code = (await error.context.json()).code; } catch (x) { /* corps illisible */ } }
        if (code === 'reserve') reserve = true;
        else if (!error && data && data.texte) res = data;
        else panne = !discret;
      } catch (e) { panne = !discret; }
      enCours = false;
      if (res) { analyse = { texte: nettoyer(res.texte), cree: res.cree || new Date().toISOString(), motif }; donnees.analyses.unshift(analyse); }
      majAnalyse();
    };
    const majAnalyse = () => { const z = el.querySelector('.st-zone-analyse'); if (z) z.innerHTML = htmlAnalyse(); };

    el.addEventListener('change', ev => {
      if (ev.target.matches('[data-periode]')) { periode = ev.target.value; ecrire(CLE_PERIODE, periode); dessiner(); }
    });
    el.addEventListener('click', ev => {
      if (ev.target.closest('[data-importer]')) window.mrtImport.feuille({ id: ctx.id, surFin: async res => {
        donnees = await lireTout(ctx);
        dessiner(window.mrtImport.finTexte(res));
        analyser('import');
      } });
      else if (ev.target.closest('[data-actualiser]')) analyser('actualiser');
      else if (ev.target.closest('[data-profil]') && window.mrtProfil) window.mrtProfil.feuille({ etat: { id: ctx.id, mesures: ctx.mesures, courses: ctx.courses }, surFermer: async () => { donnees = await lireTout(ctx); dessiner(); } });
    });
    dessiner();
    // Première visite d'un pilote avec des séances : une première analyse ; un compte non pilote est refusé sans frais (le bloc reste absent).
    if (!analyse && donnees.seances.some(s => s.type === 'run' && s.faite)) analyser('premiere');
  }

  window.mrtStats = { calculer, page, contexteIA, nettoyer, temps, allure };
})();
