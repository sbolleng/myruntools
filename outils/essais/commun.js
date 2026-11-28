// Banc d'essai : outils communs aux contrôles (base simulée, ouverture des pages, comparaisons).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RACINE = 'file://' + path.resolve(__dirname, '../..') + '/';
const PROJET = 'https://gifrpodrwesuhtgkxbuc.supabase.co';
const AUJOURDHUI = new Date('2026-10-20T10:00:00');
const LIB = fs.readFileSync(require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
const CAPTURES = process.argv.includes('--captures');
// Tuile de carte fictive : un pixel gris.
const TUILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
// Tracé fictif : une boucle de quatre points, de 500 à 620 m.
const GPX = '<?xml version="1.0"?><gpx version="1.1" creator="essai"><trk><trkseg>' +
  [[45.0, 4.0, 500], [45.01, 4.0, 580], [45.01, 4.02, 620], [45.0, 4.02, 540], [45.0, 4.0, 500]].map(p => '<trkpt lat="' + p[0] + '" lon="' + p[1] + '"><ele>' + p[2] + '</ele></trkpt>').join('') +
  '</trkseg></trk></gpx>';
// Deux tracés (« Le petit », la boucle de 5,4 km ; « Le grand », la même deux fois plus large) ; un tracé en deux segments éloignés.
const boucle = (k, d) => [[45.0, 4.0, 500], [45.01, 4.0, 580], [45.01, 4.02, 620], [45.0, 4.02, 540], [45.0, 4.0, 500]]
  .map(p => '<trkpt lat="' + (p[0] + (p[0] - 45) * (k - 1) + d) + '" lon="' + (p[1] + (p[1] - 4) * (k - 1)) + '"><ele>' + p[2] + '</ele></trkpt>').join('');
const GPX_DEUX = '<?xml version="1.0"?><gpx version="1.1" creator="essai"><trk><name>Le petit</name><trkseg>' + boucle(1, 0) + '</trkseg></trk>' +
  '<trk><name>Le grand</name><trkseg>' + boucle(2, 0) + '</trkseg></trk></gpx>';
const GPX_SEGMENTS = '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>' + boucle(1, 0).split('</trkpt>').slice(0, 3).join('</trkpt>') + '</trkpt></trkseg><trkseg>' +
  boucle(1, 1).split('</trkpt>').slice(2).join('</trkpt>') + '</trkseg></trk></gpx>';
const SEULS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const LARGEURS = { ordinateur: 1200, tablette: 768, telephone: 390 };

// Base simulée : lecture filtrée par les « eq. » de l'adresse ; fonctions lues
// dans db.rpc ; les préférences enregistrées (upsert) sont gardées dans db,
// les suppressions par id sont appliquées, les autres écritures acceptées sans rien changer ; db.panne : écritures en échec ;
// db.ecritures (liste, si elle existe) : les écritures reçues, pour les relire ;
// db.auth : connexion par mot de passe simulée (voir plus bas), db.auth.appels : les appels reçus.
// Réglages du site (donnees/supabase.js) remplacés au chargement : sans anti-robot, plus ce que le contrôle demande.
const reglagesSite = r => `(() => { let v; Object.defineProperty(window, 'MRT_SUPABASE', { configurable: true, get: () => v, set: x => { v = Object.assign(x, { captcha: '' }, ${JSON.stringify(r || {})}); } }); })()`;
const SANS_CAPTCHA = reglagesSite();
function simulerBase(ctx, db) {
  return ctx.route(PROJET + '/**', async route => {
    const req = route.request(), u = new URL(req.url());
    // db.latence (ms) : chaque réponse attend ; db.depart : instant où chaque table est demandée (requêtes en parallèle).
    if (db.depart) db.depart.push([u.pathname.split('/').pop(), Date.now()]);
    if (db.latence) await new Promise(r => setTimeout(r, db.latence));
    // Connexion (db.auth : { mdp: { adresse: mot de passe }, appels: [], maintenant }) : mots de passe fictifs, réponses de Supabase Auth.
    if (db.auth && u.pathname.startsWith('/auth/v1/')) {
      const chemin = u.pathname.slice('/auth/v1/'.length), corps = req.postData() ? req.postDataJSON() : {};
      const adresse = db.auth.adresse || 'essai@exemple.fr';
      const utilisateur = { id: db.profils[0].id, aud: 'authenticated', role: 'authenticated', email: adresse, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
      db.auth.appels.push({ chemin, methode: req.method(), requete: u.search, corps });
      const json = (statut, o) => route.fulfill({ status: statut, contentType: 'application/json', body: JSON.stringify(o) });
      if (db.auth.captchaRefuse && ['recover', 'token', 'signup'].includes(chemin) && u.searchParams.get('grant_type') !== 'refresh_token') return json(400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed (invalid-input-response)' });
      if (chemin === 'token') {
        const t0 = Math.floor((db.auth.maintenant || new Date()).getTime() / 1000);
        if (u.searchParams.get('grant_type') === 'refresh_token') return json(200, { access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t0 + 3600, refresh_token: 'essai', user: utilisateur });
        if (db.auth.mdp[corps.email] !== undefined && db.auth.mdp[corps.email] === corps.password) {
          const t = Math.floor((db.auth.maintenant || new Date()).getTime() / 1000);
          return json(200, { access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai', user: Object.assign({}, utilisateur, { email: corps.email }) });
        }
        return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      if (chemin === 'recover') return json(200, {});
      // Inscription : db.auth.fermee, inscriptions désactivées ; sinon un compte à confirmer, sans session (même réponse pour une adresse déjà inscrite).
      if (chemin === 'signup') {
        if (db.auth.fermee) return json(422, { code: 422, error_code: 'signup_disabled', msg: 'Signups not allowed for this instance' });
        return json(200, Object.assign({}, utilisateur, { email: corps.email, user_metadata: corps.data || {}, confirmation_sent_at: '2026-10-20T08:00:00Z' }));
      }
      if (chemin === 'logout') return route.fulfill({ status: 204, body: '' });
      if (chemin === 'user' && req.method() === 'PUT') {
        if (corps.password === db.auth.mdp[adresse]) return json(422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
        db.auth.mdp[adresse] = corps.password;
        return json(200, utilisateur);
      }
      if (chemin === 'user') return json(200, utilisateur);
      return json(404, { msg: 'inconnu' });
    }
    // Stockage (tracés GPX) : db.fichiers = { 'traces/<utilisateur>/<course>.gpx': texte }.
    if (u.pathname.startsWith('/storage/v1/object/')) {
      if (!db.fichiers) db.fichiers = {};
      const cle = decodeURIComponent(u.pathname.slice('/storage/v1/object/'.length));
      if (db.ecritures && req.method() !== 'GET') db.ecritures.push({ methode: req.method(), table: 'stockage', filtres: cle, corps: null });
      if (req.method() === 'GET') {
        const t = db.fichiers[cle];
        return t == null ? route.fulfill({ status: 400, contentType: 'application/json', body: '{"statusCode":"404","error":"not_found","message":"Object not found"}' })
          : route.fulfill({ contentType: 'application/gpx+xml', body: t });
      }
      if (req.method() === 'DELETE') {
        (JSON.parse(req.postData() || '{}').prefixes || []).forEach(x => { delete db.fichiers[cle + '/' + x]; });
        return route.fulfill({ contentType: 'application/json', body: '[]' });
      }
      const brut = req.postDataBuffer() ? req.postDataBuffer().toString('utf8') : '';
      const m = brut.match(/<\?xml[\s\S]*<\/gpx>|<gpx[\s\S]*<\/gpx>/);
      db.fichiers[cle] = m ? m[0] : brut;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Key: cle, Id: 'essai' }) });
    }
    // Fonctions Supabase (relais de recherche d'aliments) : db.relais(corps) rend { status, body } ; sans relais : absent (404).
    if (u.pathname.startsWith('/functions/v1/')) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' });
      const r = db.relais ? db.relais(req.postDataJSON()) : { status: 404, body: { message: 'Function not found' } };
      return route.fulfill({ status: r.status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.body) });
    }
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const r = (db.rpc || {})[u.pathname.split('/').pop()] || [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r) });
    }
    if (req.method() !== 'GET') {
      if (db.ecritures) db.ecritures.push({ methode: req.method(), table: u.pathname.split('/').pop(), filtres: u.search, corps: req.postData() ? req.postDataJSON() : null });
      if (db.panne) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"panne"}' });
      // Calendrier : séances et phases modifiées s'écrivent vraiment dans la base simulée ; la durée de prépa d'une course aussi.
      const tab = u.pathname.split('/').pop();
      const filtresEq = [...u.searchParams].filter(([k, v]) => /^eq\./.test(v) && k !== 'select');
      const filtresIn = [...u.searchParams].filter(([k, v]) => /^in\.\(/.test(v));
      const correspond = x => filtresEq.every(([k, v]) => String(x[k]) === v.slice(3)) && filtresIn.every(([k, v]) => v.slice(4, -1).split(',').includes(String(x[k])));
      if (['seances', 'plan_semaines', 'aliments', 'repas_lignes', 'sport_jour', 'propositions', 'activites', 'analyses_stats', 'logements', 'trajets', 'materiel_catalogue', 'course_materiel', 'equipements'].includes(tab) || (tab === 'courses' && req.method() === 'PATCH' && Object.keys(req.postDataJSON()).every(k => ['prepa_semaines', 'statut', 'role', 'groupe_options'].includes(k)))) {
        if (!db[tab]) db[tab] = [];
        if (req.method() === 'POST') [].concat(req.postDataJSON()).forEach((l, i) => db[tab].push(Object.assign({ id: 'nouveau-' + db[tab].length + '-' + i, utilisateur: db.profils[0].id }, l)));
        else if (req.method() === 'PATCH') db[tab].filter(correspond).forEach(x => Object.assign(x, req.postDataJSON()));
        else if (req.method() === 'DELETE') db[tab] = db[tab].filter(x => !correspond(x));
        return route.fulfill({ contentType: 'application/json', body: '[]' });
      }
      // Profil d'entraînement (Préparation) : une ligne par utilisateur, remplacée à chaque enregistrement (upsert).
      if (tab === 'profil_entrainement' && req.method() === 'POST') {
        db.profil_entrainement = (db.profil_entrainement || []).filter(x => x.utilisateur !== db.profils[0].id).concat([Object.assign({ utilisateur: db.profils[0].id }, req.postDataJSON())]);
        return route.fulfill({ contentType: 'application/json', body: '[]' });
      }
      // Profil (Nutrition) : les champs modifiés s'écrivent dans la base simulée.
      // Comme Supabase avec select() : la réponse rend les lignes modifiées (aucune si le profil n'existe pas).
      if (tab === 'profils' && req.method() === 'PATCH') {
        const touchees = db.profilAbsent ? [] : db.profils.filter(correspond); // db.profilAbsent : la ligne manque dans la base
        touchees.forEach(x => Object.assign(x, req.postDataJSON()));
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(touchees.map(x => ({ id: x.id }))) });
      }
      // Fiche v2 : les courses ajoutées ou modifiées s'écrivent dans la base simulée (db.persister).
      if (tab === 'courses' && db.persister && req.method() !== 'DELETE') {
        if (req.method() === 'POST') [].concat(req.postDataJSON()).forEach(l => db.courses.push(Object.assign({ utilisateur: db.profils[0].id }, l)));
        else db.courses.filter(correspond).forEach(x => Object.assign(x, req.postDataJSON()));
        return route.fulfill({ contentType: 'application/json', body: '[]' });
      }
      if (req.method() === 'DELETE' && db[u.pathname.split('/').pop()]) { // ligne effacée, relue sans elle
        const t = u.pathname.split('/').pop(), cible = u.searchParams.get('id');
        db[t] = db[t].filter(x => 'eq.' + x.id !== cible);
      }
      if (u.pathname.endsWith('/preferences') && req.method() === 'POST') {
        [].concat(req.postDataJSON()).forEach(l => {
          const x = db.preferences.find(y => y.utilisateur === l.utilisateur);
          if (x) Object.assign(x, l); else db.preferences.push(l);
        });
      }
      return route.fulfill({ contentType: 'application/json', body: '[]' });
    }
    const table = u.pathname.split('/').pop();
    const filtres = [...u.searchParams].filter(([k]) => !['select', 'order', 'limit', 'offset'].includes(k));
    const lignes = (db[table] || []).filter(x => filtres.every(([k, v]) => String(x[k]) === v.replace(/^eq\./, '')));
    const une = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(une ? lignes[0] || null : lignes) });
  });
}

// Ouvre une page du site, connecté, à la largeur demandée.
// stockage : valeurs posées dans localStorage avant d'ouvrir la page.
// opts : { fuseau, maintenant } pour un jeu d'essai daté à une heure précise ; { hauteur } pour un téléphone tenu en largeur.
async function ouvrir(navigateur, page, largeur, db, stockage = {}, opts = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: opts.hauteur || 900 }, deviceScaleFactor: 2, timezoneId: opts.fuseau,
    isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
  // Sans réseau, polices comprises : sinon leur arrivée, plus ou moins tardive, décale la page d'une fraction de pixel.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  // Carte du tracé : Leaflet du banc d'essai (même version), tuiles vides (pas de réseau).
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/leaflet/**', r => {
    const f = /\.css$/.test(r.request().url()) ? 'leaflet.css' : 'leaflet.js';
    r.fulfill({ body: fs.readFileSync(path.join(path.dirname(require.resolve('leaflet/package.json')), 'dist', f), 'utf8'), contentType: f.endsWith('css') ? 'text/css' : 'application/javascript' });
  });
  await ctx.route(/tile\.opentopomap\.org/, r => r.fulfill({ body: TUILE, contentType: 'image/png' }));
  // Réglages du site remplacés (donnees/supabase.js), le temps d'un essai : db.reglages (ex. { plafondIA: 4 }).
  if (db && db.reglages) await ctx.addInitScript(`(() => { let v; Object.defineProperty(window, 'MRT_SUPABASE', { configurable: true, get: () => v, set: x => { v = Object.assign(x, ${JSON.stringify(db.reglages)}); } }); })()`);
  await simulerBase(ctx, db);
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  // État de la page au moment où elle devient visible (classe mrt-attente retirée).
  await p.addInitScript(() => {
    let masquee = false;
    new MutationObserver(() => {
      const att = document.documentElement.classList.contains('mrt-attente');
      if (att) masquee = true;
      else if (masquee && !window.__revelee) {
        const m = document.querySelector('main');
        window.__revelee = { entete: !!document.querySelector('.mrt-nav'), haut: m ? Math.round(m.getBoundingClientRect().top) : null, contenu: m ? m.textContent.trim().length : 0 };
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });
  const maintenant = opts.maintenant || AUJOURDHUI;
  await p.clock.install({ time: maintenant });
  // Page de départ sans script, seulement pour poser le stockage : connexion.html se redirige vers l'accueil dès qu'elle voit
  // la session, et cette redirection, si elle tombe pendant la navigation suivante, l'abandonne (ERR_ABORTED).
  await p.goto(RACINE + 'robots.txt');
  const t = Math.floor(maintenant / 1000);
  // Palmarès sans regroupement, comme dans son jeu d'essai.
  await p.evaluate(() => localStorage.setItem('mrt-palmares-groupe', '0'));
  await p.evaluate(st => Object.entries(st).forEach(([k, v]) => localStorage.setItem(k, v)), stockage);
  await p.evaluate(s => localStorage.setItem('sb-gifrpodrwesuhtgkxbuc-auth-token', s), JSON.stringify({
    access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai',
    user: { id: db.profils[0].id, email: 'essai@exemple.fr' } }));
  await p.goto(RACINE + page);
  await p.waitForSelector('html[data-mrt-donnees]');
  // Adresse d'une course : la feuille de route, et la course ouverte par-dessus (modale).
  if (/^course\.html/.test(page)) await p.waitForSelector('.mc-panneau .pc-barre');
  await p.clock.runFor(1500);
  return { p, ctx, erreurs };
}

// Réglages du plan (Mon plan, design § 11) : rangés dans le menu « Réglages du plan ▾ » ; l'ouvrir s'il est fermé, puis toucher le réglage.
async function reglage(p, sel) {
  await p.waitForSelector('[data-reglages]');
  // « Mon profil » n'est pas au menu quand le bandeau invite à le compléter (un seul accès) : le lien du bandeau.
  if (!(await p.locator('#ps-reglages-menu ' + sel).count()) && (await p.locator('.ps-ia-aide ' + sel).count())) return p.click('.ps-ia-aide ' + sel);
  if (await p.locator('#ps-reglages-menu').isHidden()) await p.click('[data-reglages]');
  await p.click('#ps-reglages-menu ' + sel);
}

// Aucun saut au chargement : à l'instant où la page devient visible, le menu (et l'en-tête,
// sur l'Accueil et la feuille de route) est déjà en place et le contenu de la page n'a plus à bouger.
async function sansSaut(nav, db, page, w, nom, opts) {
  const { p, ctx, erreurs } = await ouvrir(nav, page, w, db, {}, opts);
  const r = await p.evaluate(() => ({ revelee: window.__revelee, hautFinal: Math.round(document.querySelector('main').getBoundingClientRect().top),
    contenuFinal: document.querySelector('main').textContent.trim().length, masquee: document.documentElement.classList.contains('mrt-attente') }));
  await ctx.close();
  return [
    egal(false, r.masquee, nom + ', page encore masquée'),
    egal(true, !!r.revelee && r.revelee.entete, nom + ', menu présent à l\'affichage'),
    egal(r.hautFinal, r.revelee && r.revelee.haut, nom + ', contenu déjà à sa place à l\'affichage'),
    // Préférences charge ses listes de partage plus bas dans la page : seul le haut compte.
    ...(page === 'preferences.html' ? [] : [egal(r.contenuFinal, r.revelee && r.revelee.contenu, nom + ', contenu complet à l\'affichage')]),
    egal([], erreurs, nom + ', erreurs JavaScript')];
}

// Jeu d'essai de la page Objectif (module-objectif-specification.md, § 10) :
// les courses courues des données fictives, et ces courses à la place des autres.
const PARIS = { fuseau: 'Europe/Paris', maintenant: new Date('2026-10-20T10:00:00+02:00') };
// Date en trois champs (mrtDateTrois) : remplit Jour, Mois et Année d'une date ISO.
async function dateTrois(p, zone, nom, iso) {
  const [a, m, j] = iso.split('-').map(Number);
  await p.fill(zone + ' [name="' + nom + '_j"]', String(j));
  await p.selectOption(zone + ' [name="' + nom + '_m"]', String(m));
  await p.fill(zone + ' [name="' + nom + '_a"]', String(a));
}

function jeuObjectif(db0) {
  const db = JSON.parse(JSON.stringify(db0));
  const moi = db.profils[0].id;
  const id = n => '00000000-0000-0000-0002-0000000000' + String(n).padStart(2, '0');
  const web = n => 'https://example.org/' + n;
  const base = { utilisateur: moi, parcours: null, heure: null, date_approx: false, dmoins: null, statut: 'confirmee', role: 'preparatoire', etat: 'a_venir',
    groupe_options: null, objectif: null, inscrit: false, dossard: null, prix: null, ouverture_inscriptions: null, lien: null, inscription: null, lien_resultats: null,
    pourquoi: null, strategie: null, logistique: null, description: null, lieu: null };
  const jeu = [
    { id: id(1), course: 'Trail du Lac', parcours: 'Le Tour du Lac', date: '2026-11-15', heure: '09:00:00', lieu: 'Mont-Clair', format: 'trail_court', distance: 24, dplus: 650,
      objectif: '02:45:00', inscrit: true, dossard: '412', prix: 32, lien: web('trail-du-lac') },
    { id: id(2), course: 'Corrida de Noël', date: '2026-12-13', heure: '18:30:00', lieu: 'Ville-Haute', format: 'route_10km', distance: 10, dplus: 40, role: 'plaisir',
      objectif: 'Sub 45 min', ouverture_inscriptions: '2026-11-01', lien: web('corrida') },
    { id: id(3), course: 'Trail des Gorges', date: '2027-03-07', heure: '07:30:00', lieu: 'Mont-Clair', format: 'trail_long', distance: 45, dplus: 2100, dmoins: 2100,
      role: 'objectif_intermediaire', objectif: '06:30:00', objectif_precisions: 'Sous 6 h 45 dans tous les cas.', inscrit: true, dossard: '1287', prix: 58, lien: web('gorges'), inscription: web('gorges/inscription'),
      lien_resultats: web('gorges/resultats'), pourquoi: 'Répétition générale du matériel et de la nutrition.', strategie: 'Partir prudemment jusqu\'au premier ravitaillement.',
      logistique: 'Navette depuis le stade à 6 h 30.', description: 'Boucle par les crêtes et les gorges.' },
    { id: id(4), course: 'Trail des Cimes', date: '2027-05-30', lieu: 'Haut-Val', format: 'trail_long', distance: 42, dplus: 2500, statut: 'option',
      groupe_options: 'Printemps 2027', ouverture_inscriptions: '2027-01-10', lien: web('cimes') },
    { id: id(5), course: 'Ultra du Plateau', parcours: 'Le 55', date: '2027-06-26', lieu: 'Plaine-Neuve', format: 'trail_long', distance: 55, dplus: 2800, statut: 'option',
      groupe_options: 'Printemps 2027', ouverture_inscriptions: '2026-09-01', lien: web('plateau'), inscription: web('plateau/inscription') },
    { id: id(6), course: 'Trail de la Forêt', date: '2027-07-01', date_approx: true, lieu: 'Bois-Joli', format: 'trail_court', distance: 30, dplus: 1200, statut: 'option' },
    { id: id(7), course: 'Trail des Crêtes', date: '2027-08-28', heure: '05:00:00', lieu: 'Mont-Clair', format: 'trail_ultra', distance: 60, dplus: 3500, role: 'objectif',
      objectif: 'Finisher', inscrit: true, dossard: '88' },
    { id: id(8), course: 'Cross des Collines', date: '2026-12-06', lieu: 'Ville-Haute', format: 'trail_decouverte', distance: 12, dplus: 300, etat: 'abandonnee' },
    { id: id(9), course: 'Trail des Sommets', date: '2028-09-10', lieu: 'Haut-Val', format: 'trail_ultra', distance: 80, dplus: 5000, statut: 'a_surveiller' }
  ].map(c => Object.assign({}, base, c));
  db.courses = db.courses.filter(c => c.etat === 'courue').concat(jeu);
  // Une course d'un autre utilisateur : introuvable pour l'utilisateur connecté.
  db.courses.push(Object.assign({}, base, { id: id(99), utilisateur: '00000000-0000-0000-0000-00000000000b', course: 'Course d\'un autre', date: '2027-01-01' }));
  return { db, id };
}

// Bloc de la fiche replié (seuls Course et Place dans le plan, ou Résultat, s'ouvrent d'office) : l'ouvrir.
async function ouvrirBloc(p, b) {
  const t = p.locator('.fc-bloc-titre[data-bloc="' + b + '"]');
  if (await t.getAttribute('aria-expanded') === 'false') await t.click();
}
// Confirmation du site : attendre l'encadré, choisir (vrai : l'action ; faux : « Annuler ») ; rend la question.
async function repondre(p, oui) {
  await p.waitForSelector('.mrt-dialogue');
  const q = await p.textContent('.mrt-dialogue p');
  await p.click('.mrt-dialogue [data-r="' + (oui ? 'oui' : 'non') + '"]');
  return q;
}

// Confirmations du site (mrtConfirmer) au fil de la page : rappel(question) rend vrai (l'action) ou faux (« Annuler »).
async function surDialogue(p, rappel) {
  await p.exposeFunction('__mrtQuestion', q => rappel(q));
  const brancher = () => new MutationObserver(async () => {
    const d = document.querySelector('.mrt-dialogue');
    if (!d || d.__vu) return;
    d.__vu = true;
    const oui = await window.__mrtQuestion(d.querySelector('p').textContent);
    d.querySelector('[data-r="' + (oui ? 'oui' : 'non') + '"]').click();
  }).observe(document, { childList: true, subtree: true });
  await p.addInitScript(brancher);
  await p.evaluate(brancher);
}

// Toucher un point d'un élément, quel que soit l'élément au-dessus (lien qui couvre une carte).
async function toucher(p, sel) {
  await p.locator(sel).first().evaluate(e => e.scrollIntoView({ block: 'center' }));
  const b = await p.locator(sel).first().boundingBox();
  await p.mouse.click(b.x + 5, b.y + b.height / 2);
}

// Session Claude Code dans le nuage : Chromium y est déjà installé, à cet endroit ; ailleurs, celui de Playwright.
function navigateur() {
  const local = '/opt/pw-browsers/chromium';
  return fs.existsSync(local) ? { executablePath: local } : {};
}

// Attente réelle (la base simulée répond hors de l'horloge de la page).
const pause = () => new Promise(r => setTimeout(r, 400));
// Une espace insécable (posée à l'affichage devant « ? : ; ! », design § 3) compte comme une espace.
const sansInsecable = x => JSON.stringify(x).replace(/[\u00a0\u202f]/g, ' ');
const egal = (attendu, obtenu, quoi) => (sansInsecable(attendu) === sansInsecable(obtenu) ? null : quoi + ' : attendu ' + JSON.stringify(attendu) + ', obtenu ' + JSON.stringify(obtenu));
const DOSSIER = __dirname; // dossier du banc : captures/ s'y range

module.exports = { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER };
