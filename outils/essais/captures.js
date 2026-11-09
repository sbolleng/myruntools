// ===== Captures pour les maquettes =====
//
// Photographie les pages du site, téléphone (390 px) et ordinateur (1200 px), avec les données
// fictives du banc d'essai et les vraies polices : une maquette en image coûte une capture,
// pas un dessin. Usage, depuis ce dossier :
//   node captures.js                          toutes les pages, du site de ce dossier, dans captures/pages
//   node captures.js course,palmares          quelques pages seulement
//   node captures.js course ../../../en-ligne captures/avant
//                                             une autre copie du site (ex. git archive origin/main), pour un avant/après
//   THEME=vert-rose node captures.js objectif ../.. captures/vert-rose
//                                             dans un autre thème que celui des données fictives (bleu-orange)
// Pages : accueil, connexion, objectif, course, candidat, modale (téléphone), fiche (téléphone, édition), palmares,
//         calendrier (vue Semaine, par défaut), calendrier-mois, calendrier-annee, et les mêmes bouton « Plan » enfoncé
//         (calendrier-phases, calendrier-mois-phases, calendrier-annee-phases), calendrier-menu (menu « Périodicité » ouvert), preparation (plan de saison), preparation-profil (fenêtre du profil), preparation-ia (proposition de l'IA en attente), filtres, preferences,
//         fiche-a-venir, palmares-paysage, fiche-courue. Chaque page : <nom>-<largeur>.png et <nom>-<largeur>-page.png (page entière).
const path = require('path');
const E = __dirname + '/';
const { chromium } = require('playwright');
const fs = require('fs');
const [filtre, racineArg, sortieArg] = process.argv.slice(2);
const racine = path.resolve(racineArg || path.join(__dirname, '../..')) + '/';
const sortie = path.resolve(sortieArg || path.join(__dirname, 'captures/pages'));
const LIB = fs.readFileSync(E + 'node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'utf8');
const src = fs.readFileSync(E + 'essais.js', 'utf8');
const a = src.indexOf('function jeuObjectif(db0) {'), b = src.indexOf('\n}\n', a) + 2;
const jeuObjectif = eval('(' + src.slice(a, b) + ')');
const { db: db0, id } = jeuObjectif(JSON.parse(fs.readFileSync(E + 'donnees-fictives.json', 'utf8')));
if (process.env.THEME) db0.preferences[0].theme = process.env.THEME;
let db = db0;
const PROJET = 'https://gifrpodrwesuhtgkxbuc.supabase.co';
// Fait défiler le formulaire jusqu'à un bloc, son titre juste sous le haut fixe du panneau.
const voir = (p, bloc) => p.evaluate(b => { const t = document.querySelector('[data-bloc="' + b + '"]'), pan = document.querySelector('.mc-panneau');
  pan.scrollTop += t.getBoundingClientRect().top - pan.getBoundingClientRect().top - document.querySelector('.fc-barre').offsetHeight - 16; }, bloc);
// Tracé fictif (le même que le banc d'essai) pour la capture « parcours ».
const GPX = eval('(' + src.slice(src.indexOf("const GPX = ") + 12, src.indexOf("'</trkseg></trk></gpx>';") + 23) + ')');
// Séances d'essai du Calendrier (spécification § 10) ; stockage : réglages posés sur l'appareil avant d'ouvrir la page (boutons d'essai).
const SEANCES = d => { const moi = d.profils[0].id; d.seances = [['se-1', '2026-10-19', 'renfo', 'Gainage 30 min', true], ['se-2', '2026-10-20', 'run', '8×400 m', false],
  ['se-3', '2026-10-22', 'run', 'Footing 45 min', false], ['se-4', '2026-10-24', 'run', 'Sortie 1 h 30', false]]
  .map(([id, date, type, libelle, faite]) => ({ id, utilisateur: moi, date, type, libelle, faite, course: null })); return d; };
const PAGES = {
  accueil: { url: 'index.html' },
  // Feuille de route : mini carte du tracé sur la carte d'étape (ordinateur).
  'objectif-mini': { url: 'objectif.html', donnees: d => { const c = d.courses.find(x => x.id === id(3)); c.gpx = c.utilisateur + '/' + c.id + '.gpx'; d.fichiers = { ['traces/' + c.gpx]: GPX }; return d; },
    action: async p => { await p.waitForSelector('.ob-mini svg', { timeout: 8000 }).catch(() => {}); } },
  // Page d'une course, Parcours ouvert : carte et profil du GPX.
  parcours: { url: 'course.html?id=' + id(3), donnees: d => { const c = d.courses.find(x => x.id === id(3)); c.gpx = c.utilisateur + '/' + c.id + '.gpx'; d.fichiers = { ['traces/' + c.gpx]: GPX }; return d; },
    action: async p => { await p.waitForSelector('.mc-panneau .pc-titre'); await p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); }); await p.waitForSelector('.tr-carte .leaflet-overlay-pane path'); await p.waitForTimeout(1500);
      await p.evaluate(() => document.querySelector('#parcours').scrollIntoView()); } },
  connexion: { url: 'connexion.html', anonyme: true },
  objectif: { url: 'objectif.html' },
  course: { url: 'course.html?id=' + id(3) },
  // Page d'une course, « À propos de la course » ouvert : le texte prend toute la largeur de la fiche.
  'course-apropos': { url: 'course.html?id=' + id(3), action: async p => { await p.waitForSelector('.mc-panneau .pc-titre'); await p.click('.pc-fiche-bas summary'); await p.waitForTimeout(400); } },
  candidat: { url: 'course.html?id=' + id(4) },
  fiche: { url: 'course.html?id=' + id(3), largeurs: { tel: [390, 844] }, action: async p => { await p.locator('[data-ob="modifier"]').click(); await p.waitForSelector('.fc-fiche'); } },
  modale: { url: 'objectif.html', largeurs: { tel: [390, 844] }, action: async p => { await p.locator('.ob-et:nth-child(3) .ob-nom a:not(.ob-ext)').click(); await p.waitForSelector('.mc-panneau .pc-titre'); } },
  // Courses à surveiller : deux courses de plus à surveiller (une avec heure d'ouverture, une sans date).
  courses: { url: 'courses-a-surveiller.html', donnees: d => { const b = d.courses.find(x => x.id === id(9));
    d.courses.push(Object.assign({}, b, { id: id(10), course: 'Marathon de la Baie', date: '2027-04-11', distance: 42.195, dplus: 120, format: 'route_marathon', lieu: 'La Baie', lien: 'https://example.org/baie', ouverture_inscriptions: '2026-11-03', ouverture_heure: '12:00:00' }),
      Object.assign({}, b, { id: id(11), course: 'Ultra des Lacs', date: null, distance: null, dplus: null, lieu: null, lien: null, ouverture_inscriptions: '2027-01-01', ouverture_approx: true })); return d; } },
  'courses-tout': { url: 'courses-a-surveiller.html?vue=tout' },
  'courses-tableau': { url: 'courses-a-surveiller.html?vue=tout', action: async p => { await p.click('[data-mode="tableau"]'); } },
  palmares: { url: 'palmares.html' },
  calendrier: { url: 'calendrier.html', donnees: SEANCES },
  'calendrier-mois': { url: 'calendrier.html#mois', donnees: SEANCES },
  'calendrier-annee': { url: 'calendrier.html#annee', donnees: SEANCES },
  'calendrier-phases': { url: 'calendrier.html', donnees: SEANCES, stockage: { 'mrt-calendrier-phases': '1' } },
  'calendrier-mois-phases': { url: 'calendrier.html#mois', donnees: SEANCES, stockage: { 'mrt-calendrier-phases': '1' } },
  'calendrier-annee-phases': { url: 'calendrier.html#annee', donnees: SEANCES, stockage: { 'mrt-calendrier-phases': '1' } },
  preparation: { url: 'preparation.html', donnees: SEANCES },
  // Une proposition de l'IA en attente (bloc du 19 octobre), le profil complet.
  'preparation-ia': { url: 'preparation.html', hauteur: { tel: 1900, ordi: 1300 }, donnees: d => {
    const moi = d.profils[0].id, lundis = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
    d.profil_entrainement = [{ utilisateur: moi, anciennete: '3-6', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 4, 6], jours_renfo: [2, 4], nb_sorties: 3, nb_renfo: 1, jour_long: 6, allure_type: '10km', temps_10km_s: 2730 }];
    d.propositions = [{ id: 'p1', utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: lundis[0], essai: 1, statut: 'brute', reponse: { semaines: lundis.map((l, i) => ({ lundi: l,
      explication: i === 3 ? 'Semaine allégée avant le Trail du Lac : séances courtes et faciles.' : 'Entretien : deux footings, une séance de seuil et une sortie longue.',
      seances: [[1, 'run', 'Footing', 45, 8, 'facile'], [3, 'run', i === 3 ? 'Footing léger' : '3 × 10 min au seuil', i === 3 ? 30 : 55, i === 3 ? 5 : 10, i === 3 ? 'facile' : 'intense'], [5, 'run', i === 3 ? 'Footing' : 'Sortie longue', i === 3 ? 30 : 95, i === 3 ? 5 : 16, 'facile']]
        .map(([k, type, libelle, duree_min, distance_km, intensite]) => { const x = new Date(l + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return { date: x.toISOString().slice(0, 10), type, libelle, duree_min, distance_km, intensite }; }) })) } }];
    return d; } },
  'preparation-profil': { url: 'preparation.html', hauteur: { tel: 1500, ordi: 1300 }, action: async p => { await p.waitForSelector('[data-profil]'); await p.click('[data-profil]'); await p.waitForSelector('.ps-profil'); } },
  'preparation-semaine': { url: 'preparation.html', hauteur: { tel: 1100, ordi: 900 }, donnees: d => { d.profil_entrainement = [{ utilisateur: d.profils[0].id, anciennete: '3-6', jours_course: [2, 4, 6], jours_renfo: [2, 4], nb_sorties: 3, nb_renfo: 1, jour_long: 6 }]; return d; },
    action: async p => { await p.waitForSelector('[data-profil]'); await p.click('[data-profil]'); await p.waitForSelector('.ps-profil .ps-ligne-q'); await p.click('.ps-profil [data-q="semaine"]'); } },
  'preparation-question': { url: 'preparation.html', hauteur: { tel: 844, ordi: 900 }, donnees: d => { d.profil_entrainement = [{ utilisateur: d.profils[0].id, anciennete: '3-6' }]; return d; },
    action: async p => { await p.waitForSelector('[data-profil]'); await p.click('[data-profil]'); await p.waitForSelector('.ps-profil .ps-ligne-q'); await p.click('.ps-profil [data-q="anciennete"]'); } },
  'calendrier-menu': { url: 'calendrier.html', donnees: SEANCES, action: async p => { await p.click('[data-menu]'); await p.waitForTimeout(200); } },
  // Consultation d'une course courue : le semi de San Sebastián, avec des valeurs fictives ajoutées.
  'consultation-courue': { url: 'palmares.html', hauteur: { ordi: 700 }, donnees: d => { Object.assign(d.courses.find(c => c.id === '00000000-0000-0000-0001-000000000007'),
    { place: 14, effectif: 174, place_categorie: 2, effectif_categorie: 8, place_sexe: 6, categorie: 'M2', dossard: '271', objectif: '01:50:00', objectif_precisions: 'Temps prévu par le plan, visée : environ 1 h 50.', dplus: 128, dmoins: 128,
      lieu: 'Saint-Sébastien', montre_temps: 6924, montre_distance: 21.28, montre_dplus: 200, montre_dmoins: 200, montre_allure: 330, fc_moyenne: 158, lien: 'https://example.org/semi', lien_resultats: 'https://example.org/resultats' }); return d; },
    action: async p => { await p.evaluate(() => document.querySelector('#palmares tbody tr[data-id] td').click()); await p.waitForSelector('.mc-panneau .pc-titre'); } },
  filtres: { url: 'palmares.html', action: async p => { await p.locator('.pv2-btn').first().click(); } },
  preferences: { url: 'preferences.html' },
  'fiche-a-venir': { url: 'objectif.html', hauteur: { tel: 1900, ordi: 1500 }, action: async p => { await p.locator('[data-ob="ajouter"]').click(); await p.waitForSelector('.fc-fiche'); } },
  'palmares-paysage': { url: 'palmares.html', largeurs: { paysage: [844, 390] } },
  'fiche-courue': { url: 'palmares.html', action: async p => { await p.locator('.pv2-add').click(); await p.waitForSelector('.fc-fiche'); } },
  'fiche-classements': { url: 'palmares.html', action: async p => { await p.locator('.pv2-add').click(); await p.waitForSelector('.fc-fiche'); await p.locator('[data-bloc="classements"]').click(); await voir(p, 'classements'); } },
  'fiche-prep': { url: 'course.html?id=' + id(3), action: async p => { await p.locator('[data-ob="modifier"]').first().click(); await p.waitForSelector('.fc-fiche'); await voir(p, 'preparation'); } },
  'fiche-prep-nouvelle': { url: 'objectif.html', action: async p => { await p.locator('[data-ob="ajouter"]').click(); await p.waitForSelector('.fc-fiche'); await p.locator('[data-bloc="preparation"]').click(); await voir(p, 'preparation'); } },
  'fiche-prep-parametrer': { url: 'course.html?id=' + id(3), action: async p => { await p.locator('[data-ob="modifier"]').first().click(); await p.waitForSelector('.fc-fiche'); await p.locator('[data-fc="preparer"]').click(); await p.waitForSelector('.cal-preparer'); } }
};
const LARG = { tel: [390, 844], ordi: [1200, 900] };
fs.mkdirSync(sortie, { recursive: true });
(async () => {
  const nav = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const [nom, cfg] of Object.entries(PAGES)) {
    if (filtre && filtre !== 'toutes' && !filtre.split(',').includes(nom)) continue;
    for (const [l, [w, h]] of Object.entries(cfg.largeurs || LARG)) {
      const ctx = await nav.newContext({ viewport: { width: w, height: (cfg.hauteur && cfg.hauteur[l]) || h }, deviceScaleFactor: 2, timezoneId: 'Europe/Paris' });
      await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
      await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/**', r => {
        const f = /\.css$/.test(r.request().url()) ? 'leaflet.css' : 'leaflet.js';
        r.fulfill({ body: fs.readFileSync(E + 'node_modules/leaflet/dist/' + f, 'utf8'), contentType: f.endsWith('css') ? 'text/css' : 'application/javascript' });
      });
      await ctx.route(PROJET + '/**', route => {
        const u = new URL(route.request().url());
        if (u.pathname.startsWith('/storage/v1/object/')) {
          const t = (db.fichiers || {})[decodeURIComponent(u.pathname.slice('/storage/v1/object/'.length))];
          return t == null ? route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"not found"}' }) : route.fulfill({ contentType: 'application/gpx+xml', body: t });
        }
        if (route.request().method() !== 'GET') return route.fulfill({ contentType: 'application/json', body: '[]' });
        if (u.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({ contentType: 'application/json', body: '[]' });
        const table = u.pathname.split('/').pop();
        const f = [...u.searchParams].filter(([k]) => !['select', 'order'].includes(k));
        const lignes = (db[table] || []).filter(x => f.every(([k, v]) => String(x[k]) === v.replace(/^eq\./, '')));
        const une = (route.request().headers()['accept'] || '').includes('vnd.pgrst.object');
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(une ? lignes[0] || null : lignes) });
      });
      db = cfg.donnees ? cfg.donnees(JSON.parse(JSON.stringify(db0))) : db0;
      const p = await ctx.newPage();
      p.on('pageerror', e => console.log(nom, l, 'erreur', e.message));
      const maintenant = new Date('2026-10-20T10:00:00+02:00');
      await p.clock.install({ time: maintenant });
      await p.goto('file://' + racine + 'robots.txt'); // sans script : connexion.html se redirige et abandonnerait la navigation suivante
      if (!cfg.anonyme) {
        const t = Math.floor(maintenant / 1000);
        await p.evaluate(() => localStorage.setItem('mrt-palmares-groupe', '0'));
        if (cfg.stockage) await p.evaluate(st => Object.entries(st).forEach(([k, v]) => localStorage.setItem(k, v)), cfg.stockage);
        await p.evaluate(s => localStorage.setItem('sb-gifrpodrwesuhtgkxbuc-auth-token', s), JSON.stringify({
          access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai', user: { id: db.profils[0].id, email: 'essai@exemple.fr' } }));
        await p.goto('file://' + racine + cfg.url);
        await p.waitForSelector('.mrt-nav');
      } else await p.goto('file://' + racine + cfg.url); // page publique (connexion) : ouverte sans session
      await p.clock.runFor(1500);
      if (cfg.action) await cfg.action(p);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(600);
      await p.screenshot({ path: sortie + '/' + nom + '-' + l + '.png' });
      await p.screenshot({ path: sortie + '/' + nom + '-' + l + '-page.png', fullPage: true });
      await ctx.close();
    }
  }
  await nav.close();
})();
