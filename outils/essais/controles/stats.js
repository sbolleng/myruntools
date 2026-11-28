// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Mes stats (module-stats-specification.md, § 8) : import d'un export fictif, calculs, analyse de l'IA (réponses simulées).
  async stats(nav, db0) {
    const pb = [];
    const zlib = require('zlib');
    // Archive ZIP fictive : fichiers rangés tels quels (0) ou compressés (8).
    const zip = fichiers => {
      const locaux = [], centraux = []; let pos = 0;
      for (const [nom, contenu, comp] of fichiers) {
        const brut = Buffer.isBuffer(contenu) ? contenu : Buffer.from(contenu), data = comp ? zlib.deflateRawSync(brut) : brut, n = Buffer.from(nom);
        const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(comp ? 8 : 0, 8); l.writeUInt32LE(data.length, 18); l.writeUInt32LE(brut.length, 22); l.writeUInt16LE(n.length, 26);
        const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(comp ? 8 : 0, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(brut.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(pos, 42);
        locaux.push(l, n, data); centraux.push(c, n); pos += 30 + n.length + data.length;
      }
      const cd = Buffer.concat(centraux), e = Buffer.alloc(22);
      e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(fichiers.length, 8); e.writeUInt16LE(fichiers.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(pos, 16);
      return Buffer.concat([...locaux, cd, e]);
    };
    // Traces à allure régulière, un point tous les 100 m (vers le nord).
    const PAS = 100 / 6371000 * 180 / Math.PI, t0 = Date.UTC(2026, 0, 1);
    const points = (km, secKm) => Array.from({ length: km * 10 + 1 }, (_, i) => [45 + i * PAS, i * secKm / 10, i * 100]);
    const gpx = (km, secKm) => '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>' + points(km, secKm).map(([la, s]) => '<trkpt lat="' + la.toFixed(9) + '" lon="4"><time>' + new Date(t0 + s * 1000).toISOString() + '</time><extensions><gpxtpx:cad>84</gpxtpx:cad></extensions></trkpt>').join('') + '</trkseg></trk></gpx>';
    const tcx = (km, secKm) => '<TrainingCenterDatabase><Activities><Activity><Lap><Track>' + points(km, secKm).map(([, s, d]) => '<Trackpoint><Time>' + new Date(t0 + s * 1000).toISOString() + '</Time><DistanceMeters>' + d + '</DistanceMeters></Trackpoint>').join('') + '</Track></Lap></Activity></Activities></TrainingCenterDatabase>';
    const fit = (km, secKm) => { // définition (message 20 : temps, distance, FC, cadence), puis un enregistrement par point
      const def = Buffer.from([0x40, 0, 0, 20, 0, 4, 253, 4, 0x86, 5, 4, 0x86, 3, 1, 2, 4, 1, 2]);
      const recs = points(km, secKm).map(([, s, d]) => { const b = Buffer.alloc(11); b[0] = 0; b.writeUInt32LE(1e9 + s, 1); b.writeUInt32LE(d * 100, 5); b[9] = 152; b[10] = 85; return b; });
      const data = Buffer.concat([def, ...recs]), h = Buffer.alloc(14); h[0] = 14; h[1] = 0x20; h.writeUInt32LE(data.length, 4); h.write('.FIT', 8);
      return Buffer.concat([h, data, Buffer.alloc(2)]);
    };
    const CSV = 'Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Distance,Max Heart Rate,Filename,Moving Time,Distance,Elevation Gain,Average Cadence,Average Heart Rate\n' +
      '101,"Aug 15, 2026, 6:00:00 AM",Course du matin,Run,3300,10.00,170,activities/101.gpx,3300,10000.0,100,84,150\n' +
      '102,"Sep 12, 2026, 7:00:00 AM",Trail des bois,Trail Run,7800,20.00,175,activities/102.gpx.gz,7800,20000.0,600,82,145\n' +
      '103,"Sep 20, 2026, 6:00:00 PM",Tapis,Virtual Run,2400,8.00,160,,2400,8000.0,0,86,148\n' +
      '104,"Oct 3, 2026, 9:00:00 AM",Vélo,Ride,4800,40.00,150,activities/104.gpx,4800,40000.0,200,,130\n' +
      '105,"Oct 10, 2026, 8:00:00 AM","Rando, ""belle"" journée",Hike,9000,12.00,140,activities/105.tcx,9000,12000.0,800,,120\n' +
      '106,"Oct 15, 2026, 5:00:00 PM",Endurance du soir,Run,3600,12.00,168,activities/106.fit,3600,12000.0,60,85,152\n';
    const ZIP = zip([['activities.csv', CSV, true], ['activities/101.gpx', gpx(10, 330), true], ['activities/102.gpx.gz', zlib.gzipSync(gpx(20, 390)), false],
      ['activities/104.gpx', gpx(1, 120), true], ['activities/105.tcx', tcx(12, 750), true], ['activities/106.fit', fit(12, 300), false]]);
    const U = db0.profils[0].id;
    const jeu = maj => {
      const db = JSON.parse(JSON.stringify(db0));
      db.profils[0].fc_repos = 52;
      db.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Calendrier', 'Palmarès', 'Profil', 'Stats'];
      db.profil_entrainement = [{ utilisateur: U, vma: 15, fc_max: 186 }];
      db.courses = [
        { id: 'c-semi', utilisateur: U, course: 'Semi de San Sebastián', format: 'route_semi', date: '2026-10-04', distance: 21.1, dplus: 30, statut: 'confirmee', role: 'preparatoire', etat: 'courue', temps: 6965, dnf: false },
        { id: 'c-obj', utilisateur: U, course: 'Trail d\'essai', format: 'trail_long', date: '2027-04-18', distance: 40, dplus: 2000, statut: 'confirmee', role: 'objectif', etat: 'a_venir', temps: null, dnf: false }];
      db.seances = [
        { id: 's-plan', utilisateur: U, date: '2026-10-15', type: 'run', libelle: 'Endurance', faite: false, distance_km: 10, duree_min: 60, origine: 'ia' },
        { id: 's-saisie', utilisateur: U, date: '2026-10-18', type: 'run', libelle: 'Endurance', faite: true, distance_km: 8, duree_min: 45, distance_reelle_km: 8, duree_reelle_min: 45, denivele_reel_m: 40, fc_moyenne: 140, origine: 'saisie' }];
      db.activites = []; db.analyses_stats = []; db.ecritures = [];
      db.relais = () => ({ status: 403, body: { code: 'reserve' } }); // compte non pilote, sauf mention contraire
      if (maj) maj(db);
      return db;
    };
    const importer = async (p, buffer, nom) => {
      await p.click('.st-haut [data-importer]');
      await p.waitForSelector('.st-import');
      await p.setInputFiles('.st-import input[type=file]', { name: nom || 'export.zip', mimeType: 'application/zip', buffer });
      await p.waitForFunction(() => { const b = document.querySelector('.st-bilan'), m = document.querySelector('.st-import .st-msg'); return (b && /activit/.test(b.textContent)) || (m && m.textContent); });
      return p.evaluate(() => [document.querySelector('.st-bilan').textContent, document.querySelector('.st-import .st-msg').textContent, document.querySelector('[data-importer]:not(.st-haut *)').disabled]);
    };
    const resultat = p => p.evaluate(() => { const r = document.getElementById('stats').__resultat; return JSON.parse(JSON.stringify(Object.assign({}, r, { tendance: null }))); });
    const parMois = (r, k) => r.mois.filter(m => m[k] != null).map(m => [m.mois, m[k]]);

    // Import, puis tous les chiffres.
    let db = jeu();
    let o = await ouvrir(nav, 'stats.html', 1200, db, {}, PARIS);
    pb.push(egal('Mes stats', (await o.p.textContent('.mrt-tab.is-on')).trim(), 'onglet « Mes stats »'));
    pb.push(egal(['6 activités : 4 nouvelles, 1 rattachée à une séance du plan, 1 ignorée', '', false], await importer(o.p, ZIP), 'import : bilan avant enregistrement'));
    await o.p.click('.st-import [data-importer]');
    await o.p.waitForSelector('.st-info');
    pb.push(egal('4 séances ajoutées, 1 rattachée.', await o.p.textContent('.st-info'), 'import : message de fin'));
    const plan = db.seances.find(s => s.id === 's-plan');
    pb.push(egal([true, 12, 60, 60, 152], [plan.faite, plan.distance_reelle_km, plan.duree_reelle_min, plan.denivele_reel_m, plan.fc_moyenne], 'import : la séance du plan du 15 octobre remplie'));
    pb.push(egal([168, 164, 172, 170], db.activites.map(a => a.cadence).filter(Boolean), 'import : cadences doublées'));
    pb.push(egal(['course', 'trail', 'tapis', 'randonnee', 'course'], db.activites.map(a => a.pratique), 'import : pratiques (le vélo est ignoré)'));
    pb.push(egal(['Course du matin', 'Trail des bois', 'Tapis', 'Rando, "belle" journée'], db.seances.filter(s => s.origine === 'import').map(s => s.libelle), 'import : séances hors plan, au nom de l\'activité'));
    let r = await resultat(o.p);
    pb.push(egal([['2026-08', 10], ['2026-09', 28], ['2026-10', 32]], parMois(r, 'volume'), 'volume mensuel'));
    pb.push(egal([['2026-08', 100], ['2026-09', 600], ['2026-10', 900]], parMois(r, 'dplus'), 'D+ mensuel'));
    pb.push(egal([['2026-08', 300], ['2026-09', 300], ['2026-10', 300]], parMois(r, 'allure'), 'allure-effort (5:00, la randonnée n\'y entre pas)'));
    pb.push(egal([['2026-08', 168], ['2026-09', 166], ['2026-10', 170]], parMois(r, 'cadence'), 'cadence'));
    pb.push(egal([['2026-08', 750], ['2026-09', 729], ['2026-10', 734]], parMois(r, 'efficience'), 'efficience cardiaque'));
    pb.push(egal([['2026-08', 10], ['2026-09', 21.4], ['2026-10', 28.1]], parMois(r, 'dkm'), 'écart de spécificité, réel'));
    pb.push(egal([['2026-09', 15], ['2026-10', 20], ['2026-11', 25], ['2027-04', 50]], r.specificite.cible.filter(c => ['2026-09', '2026-10', '2026-11', '2027-04'].includes(c.mois)).map(c => [c.mois, c.dkm]), 'écart de spécificité, cible'));
    pb.push(egal({ volume: 70, dplus: 1600, cadence: 2 }, r.progression, 'progression'));
    pb.push(egal([['1 km', 300, '2026-10-15'], ['5 km', 1500, '2026-10-15'], ['10 km', 3000, '2026-10-15'], ['15 km', 5850, '2026-09-12'], ['20 km', 7800, '2026-09-12']],
      r.meilleurs.map(m => [m.nom, m.temps, m.date]), 'meilleurs temps (pas de semi, de 30 km ni de marathon ; ni le tapis)'));
    const texte = s => o.p.$$eval(s + ' tbody tr', l => l.map(x => [...x.children].map(c => c.textContent.trim()).join(' | ')));
    pb.push(egal(['5 km | 25:14 | 5:03 /km', '10 km | 52:37 | 5:16 /km', 'Semi-marathon | 1:56:05 | 5:30 /km', 'Marathon | 4:02:02 | 5:44 /km'], await texte('.st-estimes'), 'temps estimés d\'après le semi'));
    pb.push(egal(['1 | Endurance | plus lente que 5:20 /km', '2 | Marathon | 5:20 à 4:42 /km', '3 | Seuil | 4:42 à 4:21 /km', '4 | VMA | 4:13 à 3:49 /km', '5 | Sprint | plus rapide que 3:49 /km'], await texte('.st-allures'), 'allures d\'entraînement'));
    pb.push(egal(['Z1 | Récupération | 119 – 132 bpm', 'Z2 | Endurance fondamentale | 132 – 146 bpm', 'Z3 | Tempo | 146 – 159 bpm', 'Z4 | Seuil | 159 – 173 bpm', 'Z5 | VMA | 173 – 186 bpm'], await texte('.st-zones'), 'zones cardiaques'));
    pb.push(egal(['70 km', '1 600 m', '+2 pas/min'], await o.p.$$eval('.st-grand', l => l.map(x => x.textContent)), 'tuiles de progression'));
    pb.push(egal(6, await o.p.locator('.st-g .mg-titre').count(), 'six graphiques, écart de spécificité compris'));
    pb.push(egal(true, (await o.p.textContent('[data-g="specificite"]')).includes('Trail d\'essai · 50 m/km'), 'écart de spécificité : étiquette de l\'Objectif'));
    pb.push(egal(0, await o.p.locator('.st-analyse').count(), 'compte non pilote : pas de bloc d\'analyse, même après un import'));
    // Second import du même fichier : rien de nouveau, rien d'écrit ; un fichier texte refusé.
    const ecrites = db.ecritures.length;
    pb.push(egal(['6 activités : 0 nouvelle, 5 déjà importées, 1 ignorée', '', true], await importer(o.p, ZIP), 'second import : rien de nouveau, « Importer » grisé'));
    pb.push(egal(ecrites, db.ecritures.length, 'second import : rien d\'écrit'));
    await o.p.click('.st-import [data-fermer]');
    pb.push(egal(['', 'Ce fichier n\'est pas un export Strava.', true], await importer(o.p, Buffer.from('rien'), 'notes.txt'), 'fichier qui n\'est pas un export'));
    await o.p.click('.st-import [data-fermer]');
    // Période.
    await o.p.selectOption('[data-periode]', 'tout');
    r = await resultat(o.p);
    pb.push(egal(['2026-08', 3], [r.debut, r.mois.length], 'période « Depuis le début » : d\'août à octobre'));
    await o.p.selectOption('[data-periode]', 'annee');
    r = await resultat(o.p);
    pb.push(egal(['2026-01', [['2026-08', 10], ['2026-09', 28], ['2026-10', 32]]], [r.debut, parMois(r, 'volume')], 'période « Année »'));
    pb.push(egal([], o.erreurs, 'Mes stats : erreurs JavaScript'));
    if (CAPTURES) { await o.p.selectOption('[data-periode]', '12mois'); await o.p.screenshot({ path: path.join(DOSSIER, 'captures', 'stats.png'), fullPage: true }); }
    await o.ctx.close();

    // Rattachement sans écraser un réalisé saisi.
    db = jeu(d => Object.assign(d.seances[0], { faite: true, distance_reelle_km: 11 }));
    o = await ouvrir(nav, 'stats.html', 1200, db, {}, PARIS);
    await importer(o.p, ZIP);
    await o.p.click('.st-import [data-importer]');
    await o.p.waitForSelector('.st-info');
    pb.push(egal([11, null, 170], [db.seances[0].distance_reelle_km, db.seances[0].duree_reelle_min || null, (db.activites.find(a => a.seance === 's-plan') || {}).cadence], 'rattachement : le réalisé saisi est gardé, la cadence rattachée'));
    await o.ctx.close();

    // Sans le semi : temps estimés d'après la VMA ; sans FC de repos : le lien vers Mon profil ; sans Objectif : pas d'écart de spécificité.
    db = jeu(d => { d.courses = []; d.profils[0].fc_repos = null; });
    o = await ouvrir(nav, 'stats.html', 1200, db, {}, PARIS);
    pb.push(egal(['5 km | 21:03 | 4:13 /km', '10 km | 44:27 | 4:27 /km', 'Semi-marathon | 1:39:17 | 4:42 /km', 'Marathon | 3:30:59 | 5:00 /km'],
      await o.p.$$eval('.st-estimes tbody tr', l => l.map(x => [...x.children].map(c => c.textContent.trim()).join(' | '))), 'temps estimés d\'après la VMA'));
    pb.push(egal(['Estimés d\'après ta VMA (15,0 km/h).', 'Renseigne ta FC max et ta FC de repos dans Mon profil', 0],
      [await o.p.textContent('.st-estimes .st-aide'), (await o.p.textContent('.st-zones .st-vide')).trim(), await o.p.locator('[data-g="specificite"]').count()], 'sans FC de repos ni Objectif'));
    await o.p.click('.st-zones [data-profil]');
    pb.push(egal(1, await o.p.locator('.ps-profil').count(), 'lien vers la feuille Mon profil'));
    await o.ctx.close();

    // Analyse de l'IA (réponses simulées) : bornée, nettoyée ; pas de bouton « Actualiser » ; panne après un import ; compte non pilote.
    const long = 'Ton volume monte bien depuis août. '.repeat(40) + 'Ta montre Garmin le confirme. Fin.';
    db = jeu(d => { d.relais = c => ({ status: 200, body: { texte: long, cree: '2026-10-20T08:00:00Z' } }); });
    o = await ouvrir(nav, 'stats.html', 1200, db, {}, PARIS);
    await o.p.waitForSelector('.st-analyse .st-texte p');
    const aff = await o.p.textContent('.st-analyse .st-texte');
    pb.push(egal([true, true, false], [aff.length <= 1500, /\.$/.test(aff.trim()), /huawei|garmin|strava|montre|renforcement/i.test(aff)], 'analyse : 1 500 caractères au plus, phrase entière, sans appareil ni renforcement'));
    await o.ctx.close();
    db = jeu(d => { d.analyses_stats = [{ id: 'a1', utilisateur: U, cree: '2026-10-19T07:00:00Z', motif: 'import', texte: 'Analyse précédente.' }]; d.relais = () => ({ status: 502, body: { code: 'ia' } }); });
    o = await ouvrir(nav, 'stats.html', 1200, db, {}, PARIS);
    pb.push(egal([0, 'Analyse précédente.'], [await o.p.locator('.st-analyse button').count(), (await o.p.textContent('.st-texte')).trim()], 'bloc d\'analyse : le texte et sa date, sans bouton'));
    await importer(o.p, ZIP);
    await o.p.click('.st-import [data-importer]');
    await o.p.waitForSelector('.st-analyse .st-msg');
    pb.push(egal(['Analyse impossible pour l\'instant.', 'Analyse précédente.'], [(await o.p.textContent('.st-analyse .st-msg')).trim(), (await o.p.textContent('.st-texte')).trim()], 'panne de l\'IA : l\'analyse précédente reste'));
    await o.ctx.close();

    // Page vide ; menu par défaut sans Mes stats ; site partagé ; Mon profil, section Connexions.
    db = jeu(d => { d.seances = []; });
    o = await ouvrir(nav, 'stats.html', 390, db, {}, PARIS);
    pb.push(egal(['Aucune séance faite pour l\'instant. Importe ton historique Strava ou note tes séances dans le Calendrier.', 2],
      [(await o.p.textContent('main .st-vide')).trim(), await o.p.locator('[data-importer]').count()], 'page vide : le message et « Importer »'));
    pb.push(egal(false, await o.p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement'));
    await o.ctx.close();
    db = jeu(d => { d.preferences[0].modules = null; });
    o = await ouvrir(nav, 'stats.html', 1200, db, {}, PARIS);
    // Menu par défaut sans Mes stats : sur sa page, son onglet s'ajoute au bout, actif, le temps de la visite (repasse de cohérence).
    pb.push(egal(['Mes stats', true], await o.p.evaluate(() => { const t = [...document.querySelectorAll('.mrt-tab')], on = document.querySelector('.mrt-tab.is-on'); return [on && on.textContent.trim(), t[t.length - 1] === on]; }), 'menu par défaut sans Mes stats : onglet de la page, actif, au bout'));
    await o.ctx.close();
    const autre = '00000000-0000-0000-0000-00000000000b';
    db = jeu(d => { d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] }; d.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false }); });
    o = await ouvrir(nav, 'stats.html', 1200, db, { 'mrt-vue': autre }, PARIS);
    pb.push(egal('Les stats ne sont pas partagées.', (await o.p.textContent('#stats')).trim(), 'site partagé : les stats ne sont pas partagées'));
    await o.ctx.close();
    db = jeu();
    o = await ouvrir(nav, 'profil.html', 1200, db, {}, PARIS);
    pb.push(egal('StravaJamais importé', (await o.p.textContent('#connexions .st-connexion span')).trim(), 'Mon profil : Connexions, jamais importé'));
    await o.p.click('#connexions [data-import]');
    await o.p.setInputFiles('.st-import input[type=file]', { name: 'export.zip', mimeType: 'application/zip', buffer: ZIP });
    await o.p.waitForFunction(() => /activit/.test((document.querySelector('.st-bilan') || {}).textContent || ''));
    db.activites.forEach(a => { a.importe_le = '2026-10-20T08:00:00Z'; });
    await o.p.click('.st-import [data-importer]');
    await o.p.waitForFunction(() => /ajout/.test(document.querySelector('#connexions small').textContent));
    pb.push(egal(true, (await o.p.textContent('#connexions small')).includes('4 séances ajoutées, 1 rattachée.'), 'Mon profil : import depuis Connexions'));
    pb.push(egal([], o.erreurs, 'Mon profil : erreurs JavaScript'));
    await o.ctx.close();
    return pb;
  },
};
