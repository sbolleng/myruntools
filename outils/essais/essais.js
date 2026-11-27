// ===== Banc d'essai =====
//
// Rejoue les jeux d'essai des spécifications dans Chromium, sans réseau :
// la base Supabase est simulée avec donnees-fictives.json (aucune donnée
// personnelle), l'utilisateur fictif est connecté d'office et la date du jour
// est figée au 20 octobre 2026, comme dans les jeux d'essai.
//
// Usage, depuis ce dossier : npm install (une fois), puis
//   node essais.js              tous les contrôles
//   node essais.js repasse      seulement ceux qu'on nomme (noms de CONTROLES, séparés par des espaces)
//   node essais.js --captures   et des captures dans captures/ (non versionnées)
// Ajouter un module : écrire une fonction dans CONTROLES.
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

const CONTROLES = {
  // Spécification générale, en-tête : contenu et disposition.
  async enTete(nav, db0) {
    const pb = [];
    // Accueil sans son bloc Prochaine course : la ligne « prochaine course » reste sous le compte à rebours (C2).
    const db = JSON.parse(JSON.stringify(db0)); db.preferences[0].accueil_blocs = ['dicila', 'derniere'];
    {
      const o = await ouvrir(nav, 'index.html', 1200, db0);
      pb.push(egal('', await o.p.evaluate(() => document.querySelector('.mrt-next').textContent), 'Accueil avec le bloc Prochaine course : pas de ligne « prochaine course » dans l\'en-tête'));
      await o.ctx.close();
    }
    for (const [nom, w] of Object.entries(LARGEURS)) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'index.html', w, db);
      const r = await p.evaluate(() => {
        const q = s => document.querySelector(s), box = s => q(s).getBoundingClientRect();
        return {
          titre: q('h1 em').textContent,
          stats: [...document.querySelectorAll('.mrt-stat')].map(s => s.querySelector('.mrt-stat-val').textContent.replace(/ /g, ' ') + ' | ' + s.querySelector('.mrt-stat-label').textContent),
          prochaine: q('.mrt-next').textContent,
          compteurEnBas: Math.round(box('.mrt-bas').bottom - box('.mrt-stats').bottom),
          gauche: Math.round(box('.mrt-count').left - box('.mrt-stats').left),
          marqueVsTitre: Math.round(box('.mrt-brand').top - box('h1').top),
          compteurSousTitre: box('.mrt-count').top >= box('h1').bottom && box('.mrt-count').bottom <= box('.mrt-stats').top,
          prochaineSousIndicateurs: box('.mrt-next').top >= box('.mrt-stats').bottom,
          droite: Math.round(box('.mrt-count').right - box('.mrt-brand').right),
          debordement: document.documentElement.scrollWidth > innerWidth
        };
      });
      const tel = w <= 600;
      pb.push(
        egal('Trail des Crêtes', r.titre, nom + ', titre'),
        egal(['60 km / 3 500 m D+ | Distance', 'août 2029 | Date', 'Finisher | Objectif', "12 courses | D'ici là"], r.stats, nom + ', indicateurs'),
        egal('prochaine course · Trail du Lac · J-26', r.prochaine, nom + ', prochaine course'),
        egal(0, r.marqueVsTitre, nom + ', MyRunTools à la hauteur de « Cap sur »'),
        ...(tel ? [egal(true, r.compteurSousTitre, nom + ', compteur sous le titre, au-dessus des indicateurs'),
                   egal(true, r.prochaineSousIndicateurs, nom + ', prochaine course à part, sous les indicateurs'),
                   egal(0, r.gauche, nom + ', compteur aligné à gauche')]
                : [egal(0, r.droite, nom + ', compteur aligné à droite'),
                   egal(0, r.compteurEnBas, nom + ', bas du compteur au niveau du bas des indicateurs')]),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'en-tete-' + nom + '.png'), clip: { x: 0, y: 0, width: w, height: await p.evaluate(() => document.querySelector('.mrt-nav').getBoundingClientRect().bottom + 10) } });
      await ctx.close();
    }
    // Sans D+ : la distance seule.
    const sansDplus = JSON.parse(JSON.stringify(db));
    sansDplus.courses.find(c => c.course === 'Trail des Crêtes').dplus = null;
    const { p, ctx } = await ouvrir(nav, 'index.html', 1200, sansDplus);
    pb.push(egal('60 km', await p.evaluate(() => document.querySelector('.mrt-stat-val').textContent), 'sans D+, Distance'));
    await ctx.close();
    // Le grand en-tête sur la page de démarrage (par défaut l'Accueil) ; ailleurs une barre fine : « Cap sur … » (vers l'Accueil) et l'engrenage.
    for (const [page, entete] of [['index.html', true], ['objectif.html', false], ['palmares.html', false], ['calendrier.html', false], ['preferences.html', false], ['course.html?id=00000000-0000-0000-0001-000000000020', false]]) {
      const o = await ouvrir(nav, page, 390, db);
      pb.push(egal({ entete, barre: entete ? null : 'Cap sur Trail des Crêtes', engrenage: true, actif: page === 'preferences.html', menuSansEngrenage: true }, await o.p.evaluate(() => {
        const g = document.querySelector('.mrt-gear'), b = document.querySelector('.mrt-barre-cap');
        return { entete: !!document.querySelector('.mrt-header'), barre: b ? b.textContent : null, engrenage: !!g && g.getAttribute('href').endsWith('preferences.html'),
          actif: g.classList.contains('is-on'), menuSansEngrenage: !document.querySelector('.mrt-nav .mrt-gear') };
      }), page.replace(/\?.*/, '') + ' : en-tête, barre fine et engrenage'));
      await o.ctx.close();
    }
    return pb;
  },

  // Palmarès : ouverture, tri, records, compteur (module-palmares-specification.md).
  async palmares(nav, db) {
    const { p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, db);
    const lignes = () => p.evaluate(() => [...document.querySelectorAll('#palmares tbody tr')].map(tr => tr.textContent));
    const l = await lignes();
    const pb = [
      egal(7, l.length, 'nombre de courses'),
      egal(true, /San Sebasti/.test(l[0]), 'San Sebastián en premier'),
      egal(true, /Montauban/.test(l[6]) && /00:51:46/.test(l[6]), 'Montauban 2025 en dernier : temps en hh:mm:ss'),
      egal(2, l.filter(x => x.includes('🥇')).length, 'records 🥇'),
      egal({ ajout: 'Ajouter une course', colonnes: { rond: true, texte: '', titre: 'Ajouter ou retirer des colonnes', apresGroupe: true }, enTete: 0 },
        await p.evaluate(() => { const c = document.querySelector('.pv2-cols-btn'), g = document.querySelector('.pv2-toggle');
          return { ajout: document.querySelector('.pv2-add').innerText.trim(), colonnes: { rond: c.classList.contains('mrt-rond'), texte: c.innerText.trim(), titre: c.title, apresGroupe: g.nextElementSibling === c },
            enTete: document.querySelectorAll('thead button:not(.pv2-sort)').length }; }), 'boutons : Ajouter une course ; Colonnes en rond après le regroupement, plus rien dans l\'en-tête du tableau'),
      egal(true, await p.evaluate(() => [...document.querySelectorAll('#palmares tbody td.pv2-n')].map(td => td.textContent).filter(x => /^\d+:\d\d:\d\d$|^\d+:\d\d \/km$|^—$|^\d/.test(x)).every(x => !/['h]/.test(x))), 'temps sans h ni apostrophe'),
      egal({ cache: true, texte: '' }, await p.evaluate(() => { const c = document.querySelector('.pv2-count'); return { cache: c.hidden && getComputedStyle(c).display === 'none', texte: c.textContent }; }), 'sans filtre : pas de compteur'),
      egal([], erreurs, 'erreurs JavaScript')
    ];
    // Filtres : bouton rond à trois traits ; panneau en pastilles (tri, choix, années) ; pastille du nombre de filtres actifs.
    pb.push(egal({ rond: true, texte: '', ouvert: 'false' }, await p.evaluate(() => { const b = document.querySelector('.pv2-btn');
      return { rond: b.classList.contains('mrt-rond'), texte: b.innerText.trim(), ouvert: b.getAttribute('aria-expanded') }; }), 'filtres : bouton rond, sans texte'));
    await p.click('.pv2-btn');
    pb.push(egal(['true', 'Date↓'], [await p.getAttribute('.pv2-btn', 'aria-expanded'), await p.evaluate(() => { const b = document.querySelector('.pv2-tri[aria-pressed="true"]'); return b.textContent + (b.querySelector('.pv2-sens .mrt-ico path').getAttribute('d').includes('12.5V') ? '↑' : '↓'); })], 'panneau ouvert ; tri en cours : Date, plus récente d\'abord'));
    await p.click('.pv2-panel label.pv2-check:has(input[value="Trail"])');
    pb.push(egal(['3 courses sur 7', '1', 'Filtres · 1 actif'], [await p.textContent('.pv2-count'), await p.textContent('.pv2-badge'), await p.getAttribute('.pv2-btn', 'aria-label')], 'pastille Trail : 3 courses, pastille « 1 » sur le bouton'));
    await p.click('[data-act="clear"]');
    await p.click('.pv2-panel label.pv2-check:has(input[data-part="year"][value="2025"])');
    const en2025 = await p.textContent('.pv2-count');
    await p.click('.pv2-panel label.pv2-check:has(input[data-part="year"][value=""])');
    pb.push(egal([true, true], [/sur 7$/.test(en2025) && !/^7 /.test(en2025), await p.evaluate(() => document.querySelector('.pv2-count').hidden)], 'année : pastille 2025 filtre, « Toutes » rétablit (compteur retiré)'));
    // Replier un panneau : rond « Réduire » (chevron vers le haut) en haut à droite, sans « × ».
    pb.push(egal({ croix: '', chevron: true, titre: 'Réduire', enHaut: true, aDroite: true }, await p.evaluate(() => { const pan = document.querySelector('.pv2-panel:not(.pv2-cols)'), x = pan.querySelector('.pv2-close'), r = pan.getBoundingClientRect(), b = x.getBoundingClientRect();
      return { croix: x.textContent.trim(), chevron: !!x.querySelector('svg path[d="M4 10l4-4 4 4"]'), titre: x.title, enHaut: b.top - r.top < 24, aDroite: r.right - b.right < 24 }; }), 'panneau des filtres : rond « Réduire » (chevron) en haut à droite'));
    await p.click('.pv2-panel:not(.pv2-cols) .pv2-close');
    // Déroulé commun (design § 1) : la fermeture est animée, puis le panneau est masqué.
    const anime = await p.evaluate(() => document.querySelector('.pv2-panel:not(.pv2-cols)').getAnimations().length > 0);
    await p.waitForFunction(() => document.querySelector('.pv2-panel:not(.pv2-cols)').hidden);
    pb.push(egal(['false', true, true], [await p.getAttribute('.pv2-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-panel:not(.pv2-cols)').hidden), anime], '« Réduire » replie le panneau des filtres, en déroulé'));
    await p.click('.pv2-cols-btn');
    pb.push(egal(['true', false], [await p.getAttribute('.pv2-cols-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-cols').hidden)], 'bouton Colonnes : ouvre le panneau des colonnes'));
    await p.click('.pv2-cols .pv2-close');
    await p.waitForFunction(() => document.querySelector('.pv2-cols').hidden);
    pb.push(egal([true, 'false'], [await p.evaluate(() => document.querySelector('.pv2-cols').hidden), await p.getAttribute('.pv2-cols-btn', 'aria-expanded')], '« Réduire » replie le panneau des colonnes'));
    await p.click('.pv2-btn');
    await p.click('.pv2-tri[data-sort="time"]');
    pb.push(egal('Temps↑', await p.evaluate(() => { const b = document.querySelector('.pv2-tri[aria-pressed="true"]'); return b.textContent + (b.querySelector('.pv2-sens .mrt-ico path').getAttribute('d').includes('12.5V') ? '↑' : '↓'); }), 'pastille de tri : Temps, plus court d\'abord'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'palmares-filtres.png'), fullPage: true });
    await p.click('.pv2-tri[data-sort="date"]'); await p.click('.pv2-btn');
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'palmares.png'), fullPage: true });
    await ctx.close();
    // Téléphone tenu en hauteur : invitation à le tourner ; en largeur : une ligne par course ; ordinateur : pas d'invitation.
    const paysage = async (w, h) => {
      const o = await ouvrir(nav, 'palmares.html', w, db, {}, { hauteur: h });
      const r = await o.p.evaluate(() => ({ invitation: getComputedStyle(document.querySelector('.pv2-paysage')).display !== 'none',
        uneLigne: [...document.querySelectorAll('.pv2-table tbody td')].every(td => getComputedStyle(td).whiteSpace === 'nowrap') }));
      if (CAPTURES && h < 500) await o.p.screenshot({ path: path.join(__dirname, 'captures', 'palmares-paysage.png') });
      await o.ctx.close();
      return r;
    };
    pb.push(egal(true, (await paysage(390, 844)).invitation, 'téléphone en hauteur : « Tourne ton téléphone… »'));
    pb.push(egal({ invitation: false, uneLigne: true }, await paysage(844, 390), 'téléphone en largeur : une ligne par course'));
    pb.push(egal(false, (await paysage(1200, 900)).invitation, 'ordinateur : pas d\'invitation'));
    // Largeur homogène : le contenu de chaque page (main) a la même largeur sur ordinateur.
    const largeurs = [];
    for (const pg of ['index.html', 'objectif.html', 'palmares.html', 'preferences.html', 'course.html?id=' + db.courses[0].id]) {
      const o = await ouvrir(nav, pg, 1200, db);
      largeurs.push(await o.p.evaluate(() => Math.round(document.querySelector('main').getBoundingClientRect().width)));
      await o.ctx.close();
    }
    pb.push(egal(true, largeurs.every(w => w === largeurs[0]), 'ordinateur : même largeur de contenu sur toutes les pages (' + largeurs.join(', ') + ')'));
    return pb;
  },
  // Préférences : thème, menu, cap, lecture seule (module-preferences-specification.md).
  // Accueil, page de démarrage et passage entre le grand en-tête et la barre fine (spécification générale, § 6).
  // Premiers pas d'un compte neuf (spécification générale, § 5 bis) : en-tête « Bienvenue », blocs sans course masqués,
  // profil express (une question après l'autre), fiche d'ajout d'une course ; le bloc disparaît quand les deux étapes sont faites.
  async premiers(nav, db0) {
    const pb = [];
    const neuf = () => {
      const d = JSON.parse(JSON.stringify(db0)), moi = d.profils[0];
      d.profils = [{ id: moi.id, prenom: 'Essai', nom: 'Fictif', sexe: null, naissance: null, poids: null, taille: null, activite: null }];
      d.preferences = [{ utilisateur: moi.id, theme: null, modules: null, course_cap: null, palmares_colonnes: null, palmares_groupe: true, page_demarrage: null, accueil_blocs: null }];
      d.courses = []; d.courses_circuits = []; d.profil_entrainement = []; d.ecritures = [];
      return d;
    };
    const blocs = p => p.evaluate(() => [...document.querySelectorAll('.ac-bloc')].map(b => b.dataset.bloc));
    const pas = p => p.evaluate(() => [...document.querySelectorAll('.ac-pas')].map(l => l.dataset.pas + (l.classList.contains('is-fait') ? ' fait' : ' ' + l.querySelector('button').textContent)));
    const titreFeuille = p => p.evaluate(() => document.getElementById('ps-titre').textContent);
    // Compte neuf : « Bienvenue, prénom », sans indicateurs ni compte à rebours ; Premiers pas en tête ; pas de bloc qui montre une course.
    let d = neuf();
    let { p, ctx, erreurs } = await ouvrir(nav, 'index.html', 390, d, {}, PARIS);
    await p.waitForSelector('.ac-premiers');
    pb.push(egal({ titre: 'Bienvenue,Essai', phrase: 'Ajoute une course pour fixer ton cap.', stats: 0, compte: 0, blocs: ['premiers'], pas: ['profil Compléter', 'course Ajouter une course'] },
      { titre: await p.textContent('.mrt-header h1'), phrase: await p.textContent('.mrt-bienvenue'), stats: await p.locator('.mrt-stats').count(), compte: await p.locator('.mrt-days').count(), blocs: await blocs(p), pas: await pas(p) },
      'compte neuf : « Bienvenue, prénom », les Premiers pas seuls'));
    // Profil express : quatre questions, l'une après l'autre ; enregistrées, la feuille se ferme et l'étape est cochée
    // (le repère d'allure se demande dans le parcours de Mon plan depuis le 17 nov. 2026).
    await p.click('[data-premier="profil"]');
    await p.waitForSelector('.ps-profil');
    const titres = [await titreFeuille(p)];
    await p.click('.ps-choix[data-val="femme"]');
    await p.waitForFunction(() => /2 sur 4/.test(document.getElementById('ps-titre').textContent)); titres.push(await titreFeuille(p));
    pb.push(egal([3, 0], await p.evaluate(() => [document.querySelectorAll('.ps-valeur .mrt-date3 .mrt-champ').length, document.querySelectorAll('.ps-valeur [type="date"]').length]), 'profil express : date de naissance en trois champs (Jour, Mois, Année), sans calendrier'));
    pb.push(egal(['Continuer', 'flex-end'], await p.evaluate(() => { const b = document.querySelector('.ps-valeur button[type="submit"]'); const r = b.getBoundingClientRect(), pr = b.parentElement.getBoundingClientRect(); return [b.textContent, Math.abs(pr.right - r.right) <= 1 ? 'flex-end' : 'ailleurs']; }), 'profil express : « Continuer » en bas à droite (pas « Enregistrer »)'));
    await dateTrois(p, '.ps-valeur', 'valeur', '1990-05-12'); await p.click('.ps-valeur button[type="submit"]');
    await p.waitForFunction(() => /3 sur 4/.test(document.getElementById('ps-titre').textContent)); titres.push(await titreFeuille(p));
    await p.fill('.ps-valeur [name="valeur"]', '62'); await p.click('.ps-valeur button[type="submit"]');
    await p.waitForFunction(() => /4 sur 4/.test(document.getElementById('ps-titre').textContent)); titres.push(await titreFeuille(p));
    const retour = await p.locator('.ps-profil [data-q="liste"]').count();
    await p.fill('.ps-valeur [name="valeur"]', '168'); await p.click('.ps-valeur button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.ps-profil'));
    pb.push(egal([['Sexe · 1 sur 4', 'Date de naissance · 2 sur 4', 'Poids · 3 sur 4', 'Taille · 4 sur 4'], 0, ['profil fait', 'course Ajouter une course']],
      [titres, retour, await pas(p)], 'profil express : quatre questions dans l\'ordre, sans retour à la liste ; la feuille se ferme, l\'étape est cochée'));
    const ecr = d.ecritures.filter(x => ['profils', 'profil_entrainement'].includes(x.table)).map(x => x.table + ' ' + Object.keys(x.corps || {}).filter(k => !['maj', 'utilisateur', 'id'].includes(k)).join(','));
    pb.push(egal(['profils sexe', 'profils naissance', 'profils poids', 'profils taille'], ecr, 'profil express : chaque réponse enregistrée à sa place'));
    // Ma première course : la fiche d'ajout s'ouvre.
    await p.click('[data-premier="course"]');
    await p.waitForSelector('.fc-barre');
    pb.push(egal(true, await p.locator('.fc-barre').isVisible(), 'ma première course : la fiche d\'ajout s\'ouvre'));
    pb.push(egal([], erreurs, 'Premiers pas, erreurs JavaScript'));
    await ctx.close();
    // Essai réel du 13 nov. : prénom vide, sexe seul connu ; « Compléter » s'ouvre, enchaîne, se rouvre après la croix.
    d = neuf(); Object.assign(d.profils[0], { prenom: '', nom: '', sexe: 'homme' });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'index.html', 1200, d, {}, PARIS));
    await p.click('[data-premier="profil"]'); await p.waitForSelector('.ps-profil');
    const reel1 = await titreFeuille(p);
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'premiers-naissance.png') });
    await dateTrois(p, '.ps-valeur', 'valeur', '1980-01-02'); await p.click('.ps-valeur button[type="submit"]');
    await p.waitForFunction(() => /3 sur 4/.test(document.getElementById('ps-titre').textContent));
    await p.click('.ps-profil [data-fermer]');
    await p.click('[data-premier="profil"]'); await p.waitForSelector('.ps-profil');
    pb.push(egal(['Date de naissance · 2 sur 4', 'Poids · 3 sur 4', []], [reel1, await titreFeuille(p), erreurs], 'prénom vide, sexe connu : naissance, puis poids ; la croix ferme, « Compléter » rouvre'));
    await ctx.close();
    // Découvrir MyRunTools (compte neuf, decouverte_vue faux) : sous les Premiers pas ; un module par ligne, dans l'ordre où il sert ;
    // « Au menu » ajoute ou retire le module ; « J'ai compris » range le bloc.
    d = neuf(); d.preferences[0].decouverte_vue = false;
    ({ p, ctx, erreurs } = await ouvrir(nav, 'index.html', 390, d, {}, PARIS));
    await p.waitForSelector('.ac-decouverte');
    const lignesDec = () => p.evaluate(() => [...document.querySelectorAll('.ac-decouverte li')].map(l => l.querySelector('b').textContent + (l.querySelector('input').checked ? ' ✓' : '')));
    pb.push(egal([['premiers', 'decouverte'], ['Les courses ✓', 'Ma saison ✓', 'Mon profil ✓', 'Mon plan', 'Calendrier ✓', 'Mon palmarès ✓', 'Mes stats', 'Ma nutrition'], 'Options'],
      [await blocs(p), await lignesDec(), await p.textContent('.ac-options')], 'découverte : sous les Premiers pas, sept modules dans l\'ordre, les options après, cases « Au menu »'));
    const onglets = () => p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(t => (t.getAttribute('aria-label') || t.textContent).trim()));
    await p.check('[data-menu="Nutrition"]');
    await p.waitForFunction(() => [...document.querySelectorAll('.mrt-tab')].some(t => t.textContent.trim() === 'Ma nutrition'));
    await p.uncheck('[data-menu="Palmarès"]');
    await p.waitForFunction(() => ![...document.querySelectorAll('.mrt-tab')].some(t => t.textContent.trim() === 'Mon palmarès'));
    pb.push(egal([['En un coup d\'œil', 'Les courses', 'Ma saison', 'Calendrier', 'Ma nutrition', 'Mon profil'], ['Les courses ✓', 'Ma saison ✓', 'Mon profil ✓', 'Mon plan', 'Calendrier ✓', 'Mon palmarès', 'Mes stats', 'Ma nutrition ✓']],
      [await onglets(), await lignesDec()], 'découverte : Nutrition ajoutée au menu à sa place, Palmarès retiré'));
    await p.click('[data-compris]');
    await p.waitForFunction(() => !document.querySelector('.ac-decouverte'));
    pb.push(egal([true, ['premiers']], [d.preferences[0].decouverte_vue, await blocs(p)], '« J\'ai compris » : enregistré, le bloc disparaît'));
    pb.push(egal([], erreurs, 'découverte, erreurs JavaScript'));
    // Préférences : « Revoir la découverte » le ramène.
    await p.goto(RACINE + 'preferences.html'); await p.waitForSelector('.pref-revoir');
    await p.click('.pref-revoir');
    await p.waitForFunction(() => /Enregistré/.test(document.querySelector('#bloc-accueil .pref-msg').textContent));
    pb.push(egal(false, d.preferences[0].decouverte_vue, 'Préférences : « Revoir la découverte » le ramène'));
    await ctx.close();
    // Profil commencé (sexe, naissance) : le profil express reprend à la première question qui manque ; la croix le ferme, l'étape reste à faire.
    d = neuf(); Object.assign(d.profils[0], { sexe: 'homme', naissance: '1985-03-15' });
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, d, {}, PARIS));
    await p.click('[data-premier="profil"]');
    await p.waitForSelector('.ps-profil');
    const debut = await titreFeuille(p);
    await p.click('.ps-profil [data-fermer]');
    pb.push(egal(['Poids · 3 sur 4', ['profil Compléter', 'course Ajouter une course']], [debut, await pas(p)], 'profil commencé : reprise à la première question qui manque ; la croix ferme, l\'étape reste à faire'));
    // Profil absent de la base (aucune ligne touchée) : l'échec se dit, la question reste ouverte.
    d.profilAbsent = true;
    await p.click('[data-premier="profil"]'); await p.waitForSelector('.ps-profil [name="valeur"]');
    await p.fill('.ps-profil [name="valeur"]', '70'); await p.click('.ps-profil .ps-valeur [type="submit"]');
    await p.waitForFunction(() => /impossible/.test((document.querySelector('.ps-profil .ps-msg') || {}).textContent || ''));
    pb.push(egal(['Enregistrement impossible pour l\'instant.', 'Poids · 3 sur 4'], [await p.textContent('.ps-profil .ps-msg'), await titreFeuille(p)], 'profil absent de la base : « Enregistrement impossible », la question reste'));
    await p.click('.ps-profil [data-fermer]');
    // Barre fine d'une autre page : « Bienvenue, prénom ».
    await p.goto(RACINE + 'palmares.html'); await p.waitForSelector('.mrt-barre-cap');
    pb.push(egal('Bienvenue, Essai', (await p.textContent('.mrt-barre-cap')).replace(/\s+/g, ' ').trim(), 'compte neuf, barre fine : « Bienvenue » et le prénom'));
    await ctx.close();
    // Une course, profil express rempli : plus de Premiers pas ; les blocs des courses reviennent ; « Cap sur » si la course est à venir.
    const { db } = jeuObjectif(db0);
    d = JSON.parse(JSON.stringify(db)); Object.assign(d.profils[0], { sexe: 'homme', naissance: '1985-03-15', poids: 70, taille: 175 });
    d.profil_entrainement = [{ utilisateur: d.profils[0].id, allure_type: 'inconnu' }];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, d, {}, PARIS));
    pb.push(egal([0, true, true], [await p.locator('.ac-premiers').count(), await p.locator('[data-bloc="prochaine"]').count() === 1, /^Cap sur/.test(await p.textContent('.mrt-header h1'))],
      'des courses et le profil express rempli : plus de Premiers pas, blocs des courses, « Cap sur »'));
    await ctx.close();
    // Des courses, profil incomplet : l'étape de la course est cochée, celle du profil reste.
    d = JSON.parse(JSON.stringify(db));
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ac-premiers');
    pb.push(egal(['profil Compléter', 'course fait'], await pas(p), 'des courses, profil incomplet : seule l\'étape du profil reste'));
    await ctx.close();
    return pb;
  },

  async accueil(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    // Premiers pas (profil express du compte fictif incomplet) : contrôlés à part, groupe « premiers ».
    const blocs = p => p.evaluate(() => [...document.querySelectorAll('.ac-bloc:not([data-bloc="premiers"])')].map(b => b.dataset.bloc + (b.classList.contains('is-bientot') ? ' (bientôt)' : '')));
    // Par défaut : l'Accueil est la page de démarrage, avec le grand en-tête ; blocs par défaut.
    let { p, ctx, erreurs } = await ouvrir(nav, 'index.html', 1200, db, {}, PARIS);
    pb.push(egal([true, 'En un coup d\'œil'], [await p.evaluate(() => !!document.querySelector('.mrt-header')), await p.getAttribute('.mrt-tab.is-on', 'aria-label')], 'En un coup d\'œil : grand en-tête, onglet actif'));
    pb.push(egal(['aujourdhui', 'prochaine', 'dicila', 'derniere', 'decouvrir'], await blocs(p), 'Accueil : « Aujourd\'hui » en tête, puis les blocs par défaut, Dernière course comprise, aucun bloc « bientôt » (vide), puis « Pour aller plus loin » tant que Préparation ou Nutrition manque au menu'));
    pb.push(egal([], await p.evaluate(() => [...document.querySelectorAll('.ac-aujourdhui [data-rapide]')].map(b => b.dataset.rapide)), 'Aujourd\'hui : sans Nutrition au menu, aucune saisie rapide'));
    pb.push(egal('Trail du Lac · Le Tour du Lac', (await p.textContent('[data-bloc="prochaine"] .ob-nom a')).replace(/[  ]/g, ' ').trim(), 'prochaine course : la carte de la feuille de route'));
    const etapes = await p.evaluate(() => [...document.querySelectorAll('.ac-etape')].map(e => e.textContent + (e.classList.contains('is-cap') ? ' (cap)' : '')));
    pb.push(egal('Trail des Crêtes (cap)', etapes[etapes.length - 1], 'd\'ici là : jusqu\'au cap compris, en Accent'));
    pb.push(egal([], erreurs, 'Accueil : erreurs JavaScript'));
    await ctx.close();
    // Blocs choisis dans les Préférences : ordre et Dernière course.
    const choix = JSON.parse(JSON.stringify(db)); choix.preferences[0].accueil_blocs = ['derniere', 'prochaine'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, choix, {}, PARIS));
    pb.push(egal(['aujourdhui', 'derniere', 'prochaine', 'decouvrir'], await blocs(p), 'blocs choisis, dans l\'ordre choisi (« Pour aller plus loin » toujours en dernier)'));
    pb.push(egal(true, /Course.+Date.+Temps\s*\d{2}:\d{2}:\d{2}/.test(await p.textContent('[data-bloc="derniere"]')), 'dernière course : nom, date, temps en hh:mm:ss'));
    await ctx.close();
    // Aujourd'hui : les séances du jour (20 octobre 2026), la case « faite », deux saisies rapides (repas, activité) avec Nutrition au menu.
    const jourJ = JSON.parse(JSON.stringify(db)); jourJ.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Nutrition'];
    jourJ.seances = [['se-a', '2026-10-20', 'run', '8×400 m', false], ['se-b', '2026-10-21', 'run', 'Footing 45 min', false]].map(([i, date, type, libelle, faite]) => ({ id: i, utilisateur: jourJ.profils[0].id, date, type, libelle, faite, course: null }));
    jourJ.ecritures = [];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, jourJ, {}, PARIS));
    await p.waitForSelector('.ac-jour-ligne');
    pb.push(egal([['Course à pied 8×400 m'], ['repas', 'activite'], 'aujourdhui'], [await p.evaluate(() => [...document.querySelectorAll('.ac-jour-ligne')].map(l => l.textContent.replace(/\s+/g, ' ').trim())),
      await p.evaluate(() => [...document.querySelectorAll('.ac-aujourdhui [data-rapide]')].map(b => b.dataset.rapide)), (await blocs(p))[0]], 'Aujourd\'hui : la séance du jour seulement, deux saisies rapides, bloc en tête'));
    await p.check('[data-faite="se-a"]'); await p.waitForTimeout(300);
    pb.push(egal(1, await p.locator('.cal-feuille-retour').count(), 'Aujourd\'hui : cocher « faite » ouvre la feuille « Effort et sensations »'));
    pb.push(egal(true, jourJ.ecritures.length > 0 && jourJ.ecritures[0].corps && jourJ.ecritures[0].corps.faite === true, 'Aujourd\'hui : la case « faite » est rangée'));
    await ctx.close();
    // Course passée non saisie : à faire dans « Aujourd'hui » tant que le résultat n'est pas enregistré ; plus « Prochaine course ».
    const retard = JSON.parse(JSON.stringify(db)); retard.courses.find(c => c.id === id(1)).date = '2026-10-10';
    retard.preferences[0].accueil_blocs = ['prochaine', 'dicila']; retard.ecritures = [];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, retard, {}, PARIS));
    await p.waitForSelector('.ac-jour-ligne');
    pb.push(egal(['COURSE Trail du Lac · Le Tour du Lac en retard · 10 oct. 2026 · saisis ton résultat'], await p.evaluate(() => [...document.querySelectorAll('.ac-jour-ligne')].map(l => l.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim())), 'Aujourd\'hui : la course passée à saisir, avec son retard'));
    pb.push(egal(['Corrida de Noël', 'Trail des Gorges'], [(await p.textContent('[data-bloc="prochaine"] .ob-nom')).replace(/[  ]/g, ' ').trim(), (await p.locator('[data-bloc="dicila"] .ac-etape').nth(1).textContent())].slice(0, 1).concat((await p.locator('[data-bloc="dicila"] .ac-etape').nth(1).textContent())), 'Prochaine course : la suivante ; D\'ici là : sans la course passée'));
    await p.click('[data-course-faite]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal([false, 'Marquer comme courue'], [await p.isChecked('[data-course-faite]'), (await p.textContent('#fc-titre')).trim()], 'cocher : la fiche du résultat s\'ouvre, la case reste vide'));
    await ctx.close();
    // Page de démarrage : la feuille de route. En arrivant sur l'Accueil, on y est renvoyé ; elle seule a le grand en-tête.
    const dem = JSON.parse(JSON.stringify(db)); dem.preferences[0].modules = ['Objectif', 'En un coup d\'œil', 'Calendrier', 'Palmarès'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, dem, {}, PARIS));
    await p.addInitScript(() => {
      window.__anims = []; document.addEventListener('animationstart', e => window.__anims.push(e.animationName), true);
      // État à la fin de la lecture du HTML, avant toute réponse de la base.
      document.addEventListener('DOMContentLoaded', () => { window.__debut = { masque: document.documentElement.classList.contains('mrt-attente'), menu: !!document.querySelector('.mrt-nav') }; });
    });
    pb.push(egal([true, true], [/objectif\.html$/.test(p.url()), await p.evaluate(() => !!document.querySelector('.mrt-header'))], 'arrivée : la page de démarrage, avec le grand en-tête'));
    await p.click('.mrt-tab[href$="palmares.html"]'); await p.waitForURL(/palmares/); await p.waitForSelector('.mrt-barre');
    pb.push(egal({ masque: false, menu: true }, await p.evaluate(() => window.__debut), 'page suivante : en-tête et menu dessinés aussitôt, sans page blanche'));
    pb.push(egal([true, ['mrt-retrecit', 'mrt-retrecit-cap']], [await p.evaluate(() => !document.querySelector('.mrt-header')), await p.evaluate(() => window.__anims.filter(a => /retrecit/.test(a)))], 'vers le Palmarès : barre fine, le grand en-tête se réduit'));
    await p.click('.mrt-tab[href$="index.html"]'); await p.waitForURL(/index/); await p.waitForSelector('html[data-mrt-donnees]');
    pb.push(egal([true, true], [/index\.html$/.test(p.url()), await p.evaluate(() => !!document.querySelector('.mrt-barre'))], 'onglet Accueil depuis le site : l\'Accueil, en barre fine'));
    await p.click('.mrt-tab[href$="objectif.html"]'); await p.waitForURL(/objectif/); await p.waitForSelector('.mrt-header');
    pb.push(egal(['mrt-deploie'], await p.evaluate(() => window.__anims.filter(a => /deploie/.test(a))), 'retour à la page de démarrage : l\'en-tête se déplie'));
    await ctx.close();
    // En un coup d'œil masqué : la page de démarrage par défaut devient le premier module construit du menu.
    const sansOeil = JSON.parse(JSON.stringify(db)); sansOeil.preferences[0].modules = ['Cette semaine', 'Objectif', 'Palmarès'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, sansOeil, {}, PARIS));
    pb.push(egal([true, true, false, true], [/objectif\.html$/.test(p.url()), await p.evaluate(() => !!document.querySelector('.mrt-header')),
      await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].some(t => /coup d/.test(t.getAttribute('aria-label') || ''))),
      await p.evaluate(() => document.querySelector('.mrt-brand a').getAttribute('href').endsWith('objectif.html'))], 'En un coup d\'œil masqué : on arrive sur Objectif, absent du menu'));
    await ctx.close();
    // Préférences : pas de choix de page de démarrage ; le premier module construit du menu est marqué « à l'ouverture ».
    ({ p, ctx } = await ouvrir(nav, 'preferences.html', 1200, db, {}, PARIS));
    const ouverture = () => p.evaluate(() => [...document.querySelectorAll('.pref-ouverture')].map(e => e.closest('label').textContent.replace(/\s*à l'ouverture$/, '').trim()));
    pb.push(egal([0, ['En un coup d\'œil']], [await p.locator('.pref-modules input[type="radio"]').count(), await ouverture()], 'menu : pas de choix de démarrage, le premier module marqué « à l\'ouverture »'));
    await p.uncheck('.pref-modules label:has-text("En un coup") input');
    await p.waitForSelector('#bloc-menu .pref-msg:has-text("Enregistré")');
    pb.push(egal(['Les courses'], await ouverture(), 'En un coup d\'œil décoché : Les courses s\'ouvre en arrivant'));
    await p.check('.pref-modules label:has-text("En un coup") input');
    await p.waitForSelector('#bloc-menu .pref-msg:has-text("Enregistré")');
    pb.push(egal([['Prochaine course', 'Nutrition', 'D\'ici là', 'Dernière course'], 'Bientôt : Pense-bête.'], await p.evaluate(() => [[...document.querySelectorAll('.pref-blocs label')].map(l => l.textContent.trim()),
      document.querySelector('#bloc-accueil .pref-bientot').textContent]), 'page d\'accueil : les blocs construits, puis les blocs « bientôt » sur une ligne'));
    await p.uncheck('.pref-blocs label:has-text("Dernière course") input');
    await p.waitForSelector('#bloc-accueil .pref-msg:has-text("Enregistré")');
    pb.push(egal(['prochaine', 'nutrition', 'dicila', 'pensebete'], db.preferences[0].accueil_blocs, 'Dernière course décochée : enregistrée, les blocs « bientôt » gardés pour leur arrivée'));
    await ctx.close();
    // Pour aller plus loin : Préparation et Nutrition, décochées par défaut, s'ajoutent au menu d'un toucher (design, § 12 ; E1)
    {
      const neuf = jeuObjectif(db0).db; neuf.ecritures = [];
      const o = await ouvrir(nav, 'index.html', 1200, neuf, {}, PARIS);
      pb.push(egal([['Mon plan', 'Ma nutrition', 'Mes stats', 'Guide'], ['Ajouter au menu', 'Ajouter au menu', 'Ajouter au menu', 'Ajouter au menu'], 'Pour aller plus loin', ['En un coup d\'œil', 'Les courses', 'Ma saison', 'Calendrier', 'Mon palmarès', 'Mon profil']],
        await o.p.evaluate(() => [[...document.querySelectorAll('.ac-decouvrir .ac-module b')].map(b => b.textContent), [...document.querySelectorAll('.ac-decouvrir button')].map(b => b.textContent),
          document.querySelector('.ac-decouvrir .ac-titre').textContent, [...document.querySelectorAll('.mrt-tab')].map(t => t.getAttribute('aria-label') || t.textContent)]),
        'Pour aller plus loin : une ligne et son bouton par module absent du menu'));
      pb.push(egal(0, await o.p.locator('[data-bloc="dicila"] .ac-titre a').count(), 'D\'ici là : pas de lien tant que Préparation n\'est pas au menu'));
      await o.p.click('.ac-decouvrir [data-module="Préparation"]');
      await o.p.waitForSelector('.mrt-tab:has-text("Mon plan")');
      const e = neuf.ecritures.filter(x => x.table === 'preferences')[0];
      pb.push(egal(['En un coup d\'œil', 'Courses à surveiller', 'Objectif', 'Préparation', 'Calendrier', 'Palmarès', 'Profil'], e && e.corps.modules, 'Ajouter Préparation : à sa place du menu, les modules « bientôt » gardés'));
      pb.push(egal([['Ma nutrition', 'Mes stats', 'Guide'], ['En un coup d\'œil', 'Les courses', 'Ma saison', 'Mon plan', 'Calendrier', 'Mon palmarès', 'Mon profil']],
        await o.p.evaluate(() => [[...document.querySelectorAll('.ac-decouvrir .ac-module b')].map(b => b.textContent), [...document.querySelectorAll('.mrt-tab')].map(t => t.getAttribute('aria-label') || t.textContent)]),
        'après l\'ajout : l\'onglet Mon plan apparaît, sa ligne disparaît'));
      pb.push(egal(['Mon plan', 'preparation.html'], await o.p.evaluate(() => { const l = document.querySelector('[data-bloc="dicila"] .ac-titre a'); return [l && l.textContent.trim(), l && l.getAttribute('href')]; }),
        'D\'ici là : lien vers Préparation une fois le module au menu'));
      await o.p.click('.ac-decouvrir [data-module="Nutrition"]');
      await o.p.waitForSelector('.mrt-tab:has-text("Nutrition")');
      await o.p.click('.ac-decouvrir [data-module="Stats"]');
      await o.p.waitForSelector('.mrt-tab:has-text("Mes stats")');
      await o.p.click('.ac-decouvrir [data-module="Guide"]');
      await o.p.waitForSelector('.ac-decouvrir', { state: 'detached' });
      pb.push(egal([], o.erreurs, 'Pour aller plus loin : erreurs JavaScript'));
      await o.ctx.close();
      // N2 : depuis la page Préparation, le nom d'une course s'ouvre en modale au-dessus ; l'onglet de la page reste actif
      {
        const d = jeuObjectif(db0).db;
        d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Préparation', 'Calendrier', 'Courses à surveiller', 'Palmarès'];
        const q = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
        await q.p.waitForSelector('.ps-objectif .ps-titre a'); await q.p.click('.ps-objectif .ps-titre a');
        await q.p.waitForSelector('.mc-panneau .pc-titre');
        pb.push(egal(['Mon plan', 1], await q.p.evaluate(() => [document.querySelector('.mrt-tab.is-on').textContent.trim(), document.querySelectorAll('.mc-panneau').length]), 'Mon plan : une course s\'ouvre en modale, l\'onglet reste Mon plan'));
        await q.p.click('.mc-panneau .pc-fermer');
        await q.p.waitForSelector('.mc-panneau', { state: 'detached' });
        pb.push(egal([0, 'Mon plan'], [await q.p.locator('.mc-panneau').count(), (await q.p.textContent('.mrt-tab.is-on')).trim()], 'fermer la course : retour à Mon plan, onglet inchangé'));
        await q.ctx.close();
      }
      // Site d'un autre : pas d'invitation
      const autre = '00000000-0000-0000-0000-00000000000b', partage = jeuObjectif(db0).db;
      partage.courses = partage.courses.map(c => Object.assign({}, c, { utilisateur: autre }));
      partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
      partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
      const l = await ouvrir(nav, 'index.html', 1200, partage, { 'mrt-vue': autre }, PARIS);
      pb.push(egal(0, await l.p.locator('.ac-decouvrir').count(), 'site d\'un autre : pas de « Pour aller plus loin »'));
      await l.ctx.close();
    }
    return pb;
  },
  async preferences(nav, db0) {
    // Jeu d'essai : Trail du Lac, Course A (option), Trail des Crêtes à venir ; Course B à surveiller ; les courues.
    const db = JSON.parse(JSON.stringify(db0));
    const renomme = { '21': ['Course A', 'option'], '23': ['Course B', 'a_surveiller'] };
    db.courses = db.courses.filter(c => c.etat !== 'a_venir' || /(20|21|23|40)$/.test(c.id));
    db.courses.forEach(c => { const r = renomme[c.id.slice(-2)]; if (r) [c.course, c.statut] = r; });
    const pb = [];
    let { p, ctx, erreurs } = await ouvrir(nav, 'preferences.html', 1200, db);
    const q = (sel, f) => p.evaluate(([s, fn]) => new Function('x', 'return ' + fn)(document.querySelector(s)), [sel, f]);
    // Les modules du menu, après l'Accueil (toujours en premier, contrôlé à part).
    const menu = () => p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(t => t.getAttribute('aria-label') || t.textContent));
    // Attend la réponse de la base (vraie attente : la date du jour est figée).
    const attendre = async () => {
      for (let i = 0; i < 80; i++) {
        await p.waitForTimeout(25);
        if (!(await p.evaluate(() => [...document.querySelectorAll('.pref-msg')].some(m => m.textContent === 'Enregistrement…')))) return;
      }
    };
    const recharger = async () => { await p.reload(); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500); };
    // Le cap se lit dans l'en-tête de l'Accueil (les Préférences n'ont pas d'en-tête).
    // L'en-tête s'affiche d'abord depuis la copie gardée de la visite : on lit après la lecture des données (data-mrt-donnees), sinon l'ancien cap.
    const capEnTete = async () => {
      await p.goto(RACINE + 'index.html'); await p.waitForSelector('.mrt-header'); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500);
      const cap = await q('h1 em', 'x.textContent');
      await p.goto(RACINE + 'preferences.html'); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500);
      return cap;
    };
    pb.push(egal([true, true, false, true], await p.evaluate(() => { const g = document.querySelector('.mrt-barre .mrt-gear');
      return [g.getAttribute('href').endsWith('preferences.html'), g.classList.contains('is-on'), !!document.querySelector('.mrt-header'), !!document.querySelector('.mrt-barre')]; }), 'engrenage dans la barre fine, page sans en-tête'));
    pb.push(egal(false, (await menu()).some(t => /Préférences/.test(t)), 'Préférences hors des modules du menu'));
    pb.push(egal(['Compte', 'Thème', 'Objectif principal', 'Menu', 'En un coup d\'œil', 'Partage'], await p.evaluate(() => [...document.querySelectorAll('main h2')].map(h => h.textContent)), 'ordre des blocs'));
    pb.push(egal(['Bleu et orange', 'Vert et rose', 'Violet et turquoise', 'Blanc et orange', 'Noir et orange', 'Automatique · blanc ou noir selon le réglage de l\'appareil'],
      await p.evaluate(() => [...document.querySelectorAll('.pref-theme')].map(l => l.textContent)), 'thèmes : trois en couleurs, blanc, noir, Automatique'));

    // Thème
    pb.push(egal('bleu-orange', await q('input[name=theme]:checked', 'x.value'), 'thème coché à l\'ouverture'));
    await p.click('input[value="vert-rose"]'); await attendre();
    pb.push(egal(true, await q('html', 'x.classList.contains("t-vert-rose")'), 'vert et rose appliqué aussitôt'));
    pb.push(egal('Enregistré.', await q('#bloc-theme .pref-msg', 'x.textContent'), 'thème, message'));
    await recharger();
    pb.push(egal('vert-rose', await q('input[name=theme]:checked', 'x.value'), 'thème après rechargement'));
    await p.goto(RACINE + 'index.html'); await p.waitForSelector('.mrt-header'); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500);
    pb.push(egal(true, await q('html', 'x.classList.contains("t-vert-rose")'), 'accueil en vert et rose'));
    await p.goto(RACINE + 'preferences.html?t=violet-turquoise'); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500);
    pb.push(egal(true, await q('html', 'x.classList.contains("t-vert-rose")'), '?t=… sans effet'));

    // Menu
    pb.push(egal(["En un coup d'", true], await p.evaluate(() => [document.querySelector('.mrt-tab').textContent, !!document.querySelector('.mrt-tab .mrt-picto')]), 'menu : En un coup d\'œil en premier, « œil » en picto'));
    // Le menu ne montre que les modules construits ; les autres sont sur une ligne, « bientôt ».
    const construits = ['En un coup d\'œil', 'Les courses', 'Ma saison', 'Calendrier', 'Mon palmarès', 'Mon profil'];
    pb.push(egal(construits, await menu(), 'menu par défaut : les modules construits seulement'));
    pb.push(egal(6, await p.locator('.pref-modules input[type="checkbox"]:checked').count(), 'les six modules par défaut cochés, En un coup d\'œil et Mon profil compris, sauf Mon plan et Nutrition (à cocher)'));
    pb.push(egal(0, await p.locator('#bloc-menu .pref-bientot').count(), 'plus aucun module « bientôt » dans le menu (Cette semaine est fondue dans En un coup d\'œil)'));
    // Réglage rare : les flèches n'apparaissent qu'après « Réorganiser » (Menu et En un coup d'œil), qui devient « Terminé ».
    pb.push(egal([0, 0, 'Réorganiser', 'Réorganiser', 0], await p.evaluate(() => [document.querySelectorAll('.pref-fleches').length, document.querySelectorAll('[data-monter]').length,
      document.querySelector('#bloc-menu .pref-reorg').textContent, document.querySelector('#bloc-accueil .pref-reorg').textContent, document.querySelectorAll('.pref-defaut').length]), 'Préférences : ni flèches ni « Réinitialiser l\'ordre » tant qu\'on ne réorganise pas'));
    await p.click('#bloc-menu .pref-reorg');
    pb.push(egal([true, 'Terminé', 'Réorganiser', 1], await p.evaluate(() => [document.querySelectorAll('#bloc-menu .pref-fleches').length === document.querySelectorAll('#bloc-menu .pref-liste li').length,
      document.querySelector('#bloc-menu .pref-reorg').textContent, document.querySelector('#bloc-accueil .pref-reorg').textContent, document.querySelectorAll('#bloc-menu .pref-defaut').length]), '« Réorganiser » : les flèches du Menu et « Réinitialiser l\'ordre » apparaissent, En un coup d\'œil reste calme'));
    // Préparation (non cochée) est entre Saison et Calendrier dans la liste : deux clics pour passer devant Saison.
    await p.click('[aria-label="Monter Calendrier"]'); await attendre();
    await p.click('[aria-label="Monter Calendrier"]'); await attendre();
    const monte = ['En un coup d\'œil', 'Les courses', 'Calendrier', 'Ma saison', 'Mon palmarès', 'Mon profil'];
    pb.push(egal(monte, await menu(), 'Calendrier monté, menu aussitôt'));
    await recharger();
    pb.push(egal(monte, await menu(), 'ordre conservé après rechargement'));
    await p.locator('.pref-modules label', { hasText: 'Calendrier' }).locator('input').uncheck(); await attendre();
    pb.push(egal(false, (await menu()).includes('Calendrier'), 'Calendrier décoché, absent du menu'));
    await p.click('#bloc-menu .pref-reorg'); // la page rechargée est repartie sans les flèches
    await p.click('#bloc-menu .pref-defaut'); await attendre();
    pb.push(egal(construits, await menu(), 'ordre par défaut rétabli'));
    for (const n of construits.slice(1)) { await p.locator('.pref-modules label', { hasText: n }).locator('input').uncheck(); await attendre(); }
    pb.push(egal(['En un coup d\'œil'], await menu(), 'un seul module affiché'));
    pb.push(egal(true, await q('.pref-modules input[data-i]:checked', 'x.disabled'), 'dernière case non décochable'));
    // Les modules « bientôt » restent dans la liste enregistrée, à la fin : ils entreront dans le menu une fois construits.
    pb.push(egal(['En un coup d\'œil'], db.preferences[0].modules, 'la liste enregistrée ne garde que le module affiché'));
    await p.click('#bloc-menu .pref-defaut'); await attendre();

    // Cap (Préparation, § 5.0) : seuls les Objectifs à venir se choisissent ; par défaut, le dernier. Le Trail du Lac devient un Objectif.
    db.courses.find(c => c.course === 'Trail du Lac').role = 'objectif';
    await recharger();
    const options = await p.evaluate(() => [...document.querySelectorAll('#bloc-cap option')].map(o => o.textContent));
    pb.push(egal('Par défaut : le dernier Objectif (Trail des Crêtes)', options[0], 'cap, premier choix'));
    pb.push(egal(['Trail du Lac', 'Course A', 'Trail des Crêtes'], options.slice(1).map(o => o.split(' · ')[0]), 'cap : toutes les courses à venir (Saison s\'utilise sans Mon plan) ; par défaut le dernier Objectif'));
    await p.selectOption('#bloc-cap select', { label: options[1] }); await attendre();
    pb.push(egal('Trail du Lac', await capEnTete(), 'cap Trail du Lac dans l\'en-tête'));
    pb.push(egal(options[1], await q('#bloc-cap select', 'x.selectedOptions[0].textContent'), 'cap après rechargement'));
    db.courses.find(c => c.course === 'Trail du Lac').etat = 'abandonnee';
    pb.push(egal('Trail des Crêtes', await capEnTete(), 'cap abandonné : retour au défaut'));
    pb.push(egal('', await q('#bloc-cap select', 'x.value'), 'cap abandonné : liste sur « Par défaut »'));
    db.courses.find(c => c.course === 'Trail du Lac').etat = 'a_venir';
    await recharger();
    await p.selectOption('#bloc-cap select', ''); await attendre();
    pb.push(egal('Trail des Crêtes', await capEnTete(), 'cap par défaut'));
    db.courses.find(c => c.course === 'Trail du Lac').role = 'preparatoire';

    // Échec d'enregistrement
    db.panne = true;
    await p.click('input[value="bleu-orange"]'); await attendre();
    pb.push(egal('Enregistrement impossible pour l\'instant.', await q('#bloc-theme .pref-msg', 'x.textContent'), 'panne, message'));
    pb.push(egal('vert-rose', await q('input[name=theme]:checked', 'x.value'), 'panne, thème inchangé'));
    db.panne = false;
    pb.push(egal([], erreurs, 'erreurs JavaScript'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'preferences.png'), fullPage: true });
    await ctx.close();

    // Site partagé en lecture seule
    const autre = '00000000-0000-0000-0000-00000000000b';
    db.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preferences.html', 1200, db, { 'mrt-vue': autre }));
    const corps = await p.evaluate(() => ['bloc-theme', 'bloc-menu', 'bloc-cap'].map(id => document.querySelector('#' + id + ' .pref-corps').textContent));
    pb.push(egal(Array(3).fill('Reviens à ton espace pour modifier tes réglages.'), corps, 'lecture seule'));
    pb.push(egal(true, await p.locator('#form-partage input').isEditable(), 'lecture seule, partage utilisable'));
    await ctx.close();

    // Téléphone
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preferences.html', 390, db));
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone, débordement horizontal'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'preferences-telephone.png'), fullPage: true });
    await ctx.close();
    return pb;
  },

  // Objectif : feuille de route et page d'une course (module-objectif-specification.md, § 10).
  async objectif(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    db.preferences[0].modules = ['Objectif', 'En un coup d\'œil', 'Calendrier', 'Palmarès']; // Objectif en tête : la feuille de route porte le grand en-tête
    const pb = [];
    // Changement de page : profil, préférences, courses et listes de référence demandés ensemble (une seule vague),
    // les listes de référence une seule fois par visite.
    {
      const lent = JSON.parse(JSON.stringify(db));
      lent.latence = 300; lent.depart = [];
      const o = await ouvrir(nav, 'objectif.html', 1200, lent, {}, PARIS);
      await o.p.waitForSelector('.ob-carte');
      const t = n => (lent.depart.find(x => x[0] === n) || [])[1];
      const ecart = Math.max(...['profils', 'preferences', 'courses', 'courses_circuits', 'formats', 'types_course'].map(t)) - Math.min(...['profils', 'preferences', 'courses'].map(t));
      pb.push(egal(true, ecart < 250, 'changement de page : profil, préférences, courses et formats demandés ensemble (écart ' + ecart + ' ms, une réponse = 300 ms)'));
      lent.depart = [];
      await o.p.goto(o.p.url().replace('objectif.html', 'palmares.html'));
      await o.p.waitForSelector('.mrt-nav');
      await o.p.waitForTimeout(1000);
      pb.push(egal([0, 0], [lent.depart.filter(x => x[0] === 'formats').length, lent.depart.filter(x => x[0] === 'types_course').length], 'page suivante : formats et types gardés pour la visite, pas relus'));
      await o.ctx.close();
    }
    // Une carte : ses éléments, tels qu'affichés (espaces insécables ramenés à des espaces).
    const cartes = p => p.evaluate(() => [...document.querySelectorAll('.ob-et')].map(et => {
      const t = x => (x ? x.textContent.replace(/[  ]/g, ' ').trim() : null);
      const c = et.querySelector('.ob-carte');
      return {
        classes: et.className, nom: t(c.querySelector(':scope > .ob-nom a') || c.querySelector(':scope > .ob-nom')), role: t(c.querySelector(':scope > .ob-role')),
        compteur: c.querySelector(':scope > .ob-cpt') ? [...c.querySelectorAll(':scope > .ob-cpt .ob-cpt-case')].map(t).join(' ') || t(c.querySelector(':scope > .ob-cpt')) : null,
        date: t(c.querySelector(':scope > .ob-date')), info: t(c.querySelector(':scope > .ob-info')),
        lignes: [...c.querySelectorAll(':scope > .ob-lignes .ob-ligne')].map(l => t(l.children[0]) + ' | ' + t(l.children[1])),
        cands: [...c.querySelectorAll('.ob-cand')].map(x => ({ nom: t(x.querySelector('.ob-nom a')), date: t(x.querySelector('.ob-date')),
          lignes: [...x.querySelectorAll('.ob-ligne')].map(l => t(l.children[0]) + ' | ' + t(l.children[1])), compteur: !!x.querySelector('.ob-cpt'), role: !!x.querySelector('.ob-role') }))
      };
    }));
    // Heure figée au 20 octobre 2026 à 10 h pile, le temps de lire les compteurs.
    const figer = async (p, ms = 0) => { await p.clock.setFixedTime(new Date(PARIS.maintenant.getTime() + ms)); await p.clock.runFor(1000); };
    let { p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 1200, db, {}, PARIS);
    await figer(p);
    let k = await cartes(p);
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Printemps 2027', 'Trail de la Forêt', 'Trail des Crêtes'], k.map(x => x.nom), 'étapes, dans l\'ordre'));
    pb.push(egal(false, await p.evaluate(() => /Collines|Sommets|San Sebasti/.test(document.querySelector('#feuille-de-route').textContent)), 'ni abandonnée, ni à surveiller, ni courue'));
    pb.push(egal(['Trail des Crêtes', "5 courses | D'ici là", ''], await p.evaluate(() => [document.querySelector('h1 em').textContent,
      [...document.querySelectorAll('.mrt-stat')].map(s => s.querySelector('.mrt-stat-val').textContent + ' | ' + s.querySelector('.mrt-stat-label').textContent)[3], document.querySelector('.mrt-next').textContent]), 'en-tête (feuille de route en page de démarrage : pas de ligne « prochaine course »)'));
    const [lac, corrida, gorges, groupe, foret, cretes] = k;
    pb.push(egal({ role: 'Confirmée · Préparatoire', compteur: '26j', date: '15 nov. 2026', info: 'Mont-Clair · Trail court',
      lignes: ['Distance | 24 km · 650 m D+', 'Objectif | 02:45:00', 'Inscription | Inscrit · n° 412'] },
      { role: lac.role, compteur: lac.compteur, date: lac.date, info: lac.info, lignes: lac.lignes }, 'Trail du Lac'));
    pb.push(egal({ role: 'Confirmée · Plaisir', compteur: '54j', lignes: ['Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Inscription | Ouvre le 1er nov. 2026'] },
      { role: corrida.role, compteur: corrida.compteur, lignes: corrida.lignes }, 'Corrida de Noël'));
    pb.push(egal({ role: 'Confirmée · Objectif', cle: false, compteur: '137j', objectif: 'Objectif | 06:30:00' },
      { role: gorges.role, cle: /is-obj/.test(gorges.classes), compteur: gorges.compteur, objectif: gorges.lignes[1] }, 'Trail des Gorges'));
    pb.push(egal({ opt: true, role: 'Préparatoire • 2 options', cands: [
      { nom: 'Trail des Cimes', date: '30 mai 2027', lignes: ['Distance | 42 km · 2 500 m D+', 'Inscription | Ouvre le 10 janv. 2027'], compteur: false, role: false },
      { nom: 'Ultra du Plateau · Le 55', date: '26 juin 2027', lignes: ['Distance | 55 km · 2 800 m D+', 'Inscription | Inscription ouverte'], compteur: false, role: false }] },
      { opt: /is-opt/.test(groupe.classes), role: groupe.role, cands: groupe.cands }, 'Printemps 2027'));
    pb.push(egal(true, await p.evaluate(() => { const a = document.querySelectorAll('.ob-cand .ob-ins')[1]; return a.tagName === 'A' && a.classList.contains('is-ouvert') && a.target === '_blank' && a.getAttribute('href') === 'https://example.org/plateau/inscription'; }), 'inscription ouverte : lien, en Alerte'));
    pb.push(egal({ opt: true, role: 'Option · Préparatoire', date: 'juillet 2027', compteur: null, lignes: ['Distance | 30 km · 1 200 m D+', 'Inscription | Ouverture à venir'] },
      { opt: /is-opt/.test(foret.classes), role: foret.role, date: foret.date, compteur: foret.compteur, lignes: foret.lignes }, 'Trail de la Forêt'));
    pb.push(egal({ obj: true, role: 'Confirmée · Objectif', compteur: '311j', objectif: 'Objectif | Finisher', dossard: 'Inscription | Inscrit · n° 88' },
      { obj: /is-obj/.test(cretes.classes), role: cretes.role, compteur: cretes.compteur, objectif: cretes.lignes[1], dossard: cretes.lignes[2] }, 'Trail des Crêtes'));
    pb.push(egal(['311', '19 h 00 min 00 s'], await p.evaluate(() => [document.querySelector('.mrt-days').textContent, document.querySelector('.mrt-hms').textContent]), 'en-tête : compte à rebours jusqu\'à l\'heure de départ'));
    // Couleurs (thème bleu et orange) : nom en Texte, date en Texte discret, chiffres du compteur et objectif en Accent (un seul accent) ; libellés à 0,7 rem.
    pb.push(egal({ nom: 'rgb(238, 243, 250)', date: 'rgb(143, 168, 201)', compteur: 'rgb(255, 183, 0)', objectif: 'rgb(255, 183, 0)', libelle: '11.2px', indicateur: 'rgb(238, 243, 250)' },
      await p.evaluate(() => { const c = document.querySelector('.ob-carte'), st = s => getComputedStyle(c.querySelector(s));
        return { nom: st('.ob-nom').color, date: st('.ob-date').color, compteur: st('.ob-cpt-case b').color, objectif: st('.ob-cible').color, libelle: st('.ob-lib').fontSize,
          indicateur: getComputedStyle(document.querySelector('.mrt-stat-val')).color }; }), 'couleurs et libellés'));
    await figer(p, 1000);
    pb.push(egal(['25j', '18 h 59 min 59 s'], [(await cartes(p))[0].compteur, await p.textContent('.mrt-hms')], 'une seconde plus tard : la carte garde ses jours, l\'en-tête compte les secondes'));
    // Liens : inscription au-dessus du lien de la carte ; pas de site officiel sur la carte ; la carte ouvre la page de la course.
    pb.push(egal([true], await p.evaluate(() => ['.ob-ins.is-ouvert'].map(sel => {
      const a = document.querySelector(sel);
      a.scrollIntoView({ block: 'center' });
      const b = a.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2).closest('a') === a;
    })), 'inscription cliquable à part'));
    pb.push(egal(0, await p.locator('.ob-carte .ob-ext').count(), 'pas de site officiel sur la feuille de route'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif.png'), fullPage: true });
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(1), await p.evaluate(() => history.state && history.state.mrtCourse), 'toucher la carte ouvre la course en modale'));
    await p.goBack(); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['objectif.html', true], [p.url().split('/').pop(), await p.evaluate(() => !!document.querySelector('.ob-carte'))], 'retour du navigateur : la modale se ferme, feuille de route dessous'));
    await toucher(p, '.ob-cand .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(4), await p.evaluate(() => history.state && history.state.mrtCourse), 'toucher un candidat ouvre sa course en modale'));
    pb.push(egal([], erreurs, 'feuille de route, erreurs JavaScript'));
    await ctx.close();

    // Page d'une course
    const pageCourse = async (n, opts = PARIS, base = db, stockage = {}) => {
      const o = await ouvrir(nav, 'course.html?id=' + n, 1200, base, stockage, opts);
      await figer(o.p);
      if (CAPTURES && n === id(3)) await o.p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-course.png'), fullPage: true });
      const r = await o.p.evaluate(() => {
        const t = x => (x ? x.textContent.replace(/[  ]/g, ' ').trim() : null), q = s => document.querySelector(s);
        return {
          barre: [...document.querySelectorAll('.pc-barre [data-ob]')].map(b => b.dataset.ob), sur: t(q('.pc-sur')), titre: q('.pc-titre') ? t(q('.pc-titre').firstChild) : null, info: t(q('.pc-info')), groupe: t(q('.pc-groupe')),
          fiche: [...document.querySelectorAll('.pc-fiche .ob-ligne')].filter(l => !l.querySelector('.ob-cpt')).map(l => t(l.children[0]) + ' | ' + t(l.children[1])),
          compteur: [...document.querySelectorAll('.pc-fiche .ob-cpt-case')].map(t).join(' '), dossards: document.querySelectorAll('.mc-panneau .ob-ins').length,
          cellules: [...document.querySelectorAll('.pc-cellule > summary')].map(t), modale: !!q('.mc-panneau .pc'),
          liens: [...document.querySelectorAll('.pc-liens-haut a, .pc-officiel')].map(t), officiel: !!q('.pc-fiche-bas > .pc-cellule + .pc-officiel'), nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.className + ' | ' + t(a.querySelector('b'))),
          vide: t(q('.ob-vide')), titreDoc: document.title,
          fleches: [document.querySelectorAll('.pc-liens-haut a .ob-fleche, .pc-officiel .ob-fleche').length, /↗/.test((q('.pc') || document.body).textContent)],
          lieu: q('.pc-fiche .pc-lieu') ? [t(q('.pc-lieu')), q('.pc-lieu').getAttribute('href'), q('.pc-lieu').target] : null, titreLien: document.querySelectorAll('.pc-titre a').length,
          descFiche: !!q('.pc-fiche .pc-fiche-bas > .pc-cellule'), prepa: q('#preparation') ? [t(q('#preparation .pc-role .pc-sous-titre')) + ' | ' + t(q('#preparation .pc-role > p:not(.pc-sous-titre)')), !!q('#preparation .cal-regler')] : null,
          insLien: document.querySelectorAll('.pc-fiche a.ob-ins').length
        };
      });
      await o.ctx.close();
      return [r, o.erreurs];
    };
    let [r, err] = await pageCourse(id(3));
    pb.push(egal({ modale: true, barre: ['modifier', 'fermer'], sur: 'Confirmée · Objectif · Étape 3 sur 6', titre: 'Trail des Gorges', info: 'Trail long',
      compteur: '137j 22h 30min 00s', fiche: ['Lieu | Mont-Clair', 'Date / heure | dim. 7 mars 2027 · 7 h 30', 'Distance | 45 km · 2 100 m D+ · 2 100 m D−', 'Objectif | 06:30:00Sous 6 h 45 dans tous les cas.', 'Inscription | Inscrit · n° 1287'], dossards: 1 },
      { modale: r.modale, barre: r.barre, sur: r.sur, titre: r.titre, info: r.info, compteur: r.compteur, fiche: r.fiche, dossards: r.dossards }, 'page Trail des Gorges, haut et fiche'));
    pb.push(egal(['À propos de la course', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], r.cellules, 'page Trail des Gorges, textes : À propos de la course, Inscription, Parcours, Préparation, Logistique en dernier'));
    pb.push(egal(true, r.descFiche, 'page Trail des Gorges, « À propos de la course » dans le cadre de la fiche'));
    pb.push(egal(['Pourquoi cette course | Répétition générale du matériel et de la nutrition.', true], r.prepa, 'page Trail des Gorges, Préparation : le rôle, puis le lien « Régler le plan dans Préparation » et le plan'));
    pb.push(egal([['Site officiel'], true], [r.liens, r.officiel], 'page Trail des Gorges : site officiel en bas à droite de la fiche, sur la ligne d\'« À propos de la course », pas de « S\'inscrire » (inscrit)'));
    pb.push(egal([1, false, 0], [...r.fleches, r.titreLien], 'liens : flèche dessinée, plus de caractère ↗ (emoji sur iPhone), plus de flèche dans le titre'));
    pb.push(egal(['Mont-Clair', 'https://www.openstreetmap.org/search?query=Mont-Clair', '_blank'], r.lieu, 'lieu : lien vers OpenStreetMap, nouvel onglet'));
    pb.push(egal(['is-precedente | Corrida de Noël', 'is-suivante | Trail des Cimes'], r.nav, 'page Trail des Gorges, navigation'));
    pb.push(egal('Trail des Gorges · MyRunTools', r.titreDoc, 'page Trail des Gorges, titre de l\'onglet'));
    pb.push(egal([], err, 'page d\'une course, erreurs JavaScript'));
    [r] = await pageCourse(id(2));
    pb.push(egal({ cellules: ['Inscription', 'Parcours', 'Préparation', 'Logistique'], fiche: ['Lieu | Ville-Haute', 'Date / heure | dim. 13 déc. 2026 · 18 h 30', 'Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Inscription | Ouvre le 1er nov. 2026'], liens: ['Site officiel'] },
      { cellules: r.cellules, fiche: r.fiche, liens: r.liens }, 'page Corrida de Noël : ni D−, ni prix ; Inscription toujours là ; Parcours pour importer un GPX'));
    [r] = await pageCourse(id(5));
    pb.push(egal({ liens: ['S\'inscrire', 'Site officiel'], insLien: 0, fiche: ['Lieu | Plaine-Neuve', 'Date / heure | sam. 26 juin 2027', 'Distance | 55 km · 2 800 m D+', 'Inscription | Inscription ouverte'] }, { liens: r.liens, insLien: r.insLien, fiche: r.fiche },
      'page Ultra du Plateau : « S\'inscrire » en tête, la ligne Dossard sans lien'));
    // Jour J : la ligne Résultats en direct ; la veille, rien.
    const jourJ = JSON.parse(JSON.stringify(db));
    Object.assign(jourJ.courses.find(c => c.id === id(1)), { date: '2026-10-20', heure: '18:00:00', lien_resultats: 'https://example.org/lac/resultats' });
    [r] = await pageCourse(id(1), PARIS, jourJ);
    pb.push(egal('Résultats | En direct', r.fiche[2], 'jour J : « Résultats · En direct » dans la fiche'));
    jourJ.courses.find(c => c.id === id(1)).date = '2026-10-21';
    [r] = await pageCourse(id(1), PARIS, jourJ);
    pb.push(egal(false, r.fiche.some(l => /^Résultats/.test(l)), 'veille du jour J : pas de ligne Résultats'));
    [r] = await pageCourse(id(4));
    pb.push(egal({ sur: 'Option · Préparatoire · Étape 4 sur 6', groupe: 'Printemps 2027 · autre option : Ultra du Plateau · Le 55' }, { sur: r.sur, groupe: r.groupe }, 'page Trail des Cimes'));
    [r] = await pageCourse(id(1));
    pb.push(egal(['is-suivante | Corrida de Noël'], r.nav, 'page Trail du Lac, pas de course précédente'));
    [r] = await pageCourse(id(7));
    pb.push(egal(['is-precedente | Trail de la Forêt'], r.nav, 'page Trail des Crêtes, pas de course suivante'));
    // Ordinateur : la modale (marges de 2 rem et cadre de 1 px : 896 px de texte, comme les pages), la fiche encadrée, tous les textes ouverts, sans pouvoir les replier.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS));
    pb.push(egal({ largeur: 896, cadre: '1px', textes: 5, ouverts: ['Parcours'], repliable: 'auto', cadres: 2 },
      await p.evaluate(() => {
        return { largeur: Math.round(document.querySelector('.pc').getBoundingClientRect().width),
          cadre: getComputedStyle(document.querySelector('.pc-fiche')).borderTopWidth, textes: document.querySelectorAll('.pc-cellule').length,
          ouverts: [...document.querySelectorAll('.pc-cellule[open] > summary')].map(x => x.textContent.trim()), repliable: getComputedStyle(document.querySelector('.pc-cellule > summary')).pointerEvents,
          cadres: document.querySelectorAll('.pc > .pc-fiche, .pc > .pc-textes').length
        }; }), 'ordinateur : une colonne, deux cadres (fiche et Description, puis Inscription, Parcours, Préparation, Logistique), tout replié sauf Parcours, renseigné'));
    await p.locator('#preparation > summary').click();
    await p.waitForTimeout(400);
    pb.push(egal(true, await p.evaluate(() => document.querySelector('#preparation').open), 'ordinateur : toucher Préparation l\'ouvre'));
    await ctx.close();
    // Téléphone : rien ne dépasse, compteur sur une ligne, fiche dans le premier écran, textes repliés sauf le premier.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 390, db, {}, PARIS));
    await figer(p);
    const tc = await p.evaluate(() => {
      const cases = [...document.querySelectorAll('.pc-fiche .ob-cpt-case')].map(c => c.getBoundingClientRect());
      return { debordement: document.documentElement.scrollWidth > innerWidth, compteurUneLigne: cases.every(c => Math.abs(c.top - cases[0].top) < 3),
        ouvertes: [...document.querySelectorAll('.pc-cellule')].map(d => d.open), haut: Math.round(document.querySelector('.pc-fiche').getBoundingClientRect().top) };
    });
    pb.push(egal({ debordement: false, compteurUneLigne: true, ouvertes: [false, false, true, false, false] },
      { debordement: tc.debordement, compteurUneLigne: tc.compteurUneLigne, ouvertes: tc.ouvertes }, 'téléphone : page d\'une course'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-course-telephone.png'), fullPage: false });
    pb.push(egal(true, tc.haut < 330, 'téléphone : la fiche commence dans le premier écran (' + tc.haut + ' px)'));
    await p.locator('.pc-cellule > summary').nth(2).click();
    await p.waitForTimeout(400);
    pb.push(egal([false, false], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(1, 3).map(d => d.open)), 'téléphone : toucher le titre ferme la cellule ouverte'));
    await p.locator('.pc-cellule > summary').nth(2).click();
    await p.waitForTimeout(400);
    pb.push(egal([false, true], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(1, 3).map(d => d.open)), 'téléphone : toucher le titre ouvre la cellule'));
    pb.push(egal([], erreurs, 'téléphone, page d\'une course, erreurs JavaScript'));
    await ctx.close();
    // ----- Tracé GPX (§ 3.4, n° 25 à 28 et 32) -----
    {
      const moi = db.profils[0].id, chemin = n => 'traces/' + moi + '/' + n + '.gpx';
      const avecTrace = JSON.parse(JSON.stringify(db));
      avecTrace.courses.find(c => c.id === id(3)).gpx = moi + '/' + id(3) + '.gpx';
      avecTrace.courses.find(c => c.id === id(3)).ravitaillements_km = [2, 4.5, 8];
      avecTrace.fichiers = { [chemin(id(3))]: GPX };
      let o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, avecTrace, {}, PARIS);
      pb.push(egal(true, await o.p.evaluate(() => document.querySelector('#parcours').open), 'Parcours renseigné (tracé GPX) : ouvert d\'emblée'));
      await o.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      // Ravitaillements sur le profil (§ 3.10, n° 56) : un trait par km du tracé (5,37 km) ; le km 8, au-delà, n'est pas dessiné.
      pb.push(egal([['2', '4,5'], ['37.25%', '83.82%']], await o.p.evaluate(() => { const r = [...document.querySelectorAll('.tr-trace .tr-ravito')]; return [r.map(x => x.textContent), r.map(x => x.style.left)]; }),
        'profil : les ravitaillements en traits pointillés, km en haut'));
      pb.push(egal({ alt: ['620 m', '500 m'], km: ['0 km', '5,4 km'], bornes: 3, ordre: ['tr-zone', 'pc-ravitos', 'pc-strategie', 'st-zone'], strategie: 'Stratégie de course', bouton: 'GPX', boutonClasse: true }, await o.p.evaluate(() => ({
        alt: [...document.querySelectorAll('.tr-alt span')].map(x => x.textContent), km: [...document.querySelectorAll('.tr-km span')].map(x => x.textContent.replace(/[  ]/g, ' ')),
        bornes: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length,
        ordre: [...document.querySelector('#parcours .pc-corps').children].map(x => x.className || x.tagName), strategie: document.querySelector('.pc-strategie .pc-sous-titre').textContent,
        bouton: document.querySelector('.tr-profil .tr-bas .tr-telecharger').textContent.trim(), boutonClasse: document.querySelector('.tr-telecharger').classList.contains('mrt-btn') })), 'GPX : carte (tracé, départ, arrivée), profil, bouton à contour « ↓ GPX » sous les distances, puis la stratégie et « Proposer une stratégie »'));
      // Lignes d'altitude (n° 48), pente au survol (n° 49), repère sur la carte (n° 50), plein écran (n° 47).
      pb.push(egal({ lignes: 2, etiquettes: ['550', '600'], pas: '1 trait = 50 m' }, await o.p.evaluate(() => ({
        lignes: document.querySelectorAll('.tr-profil .tr-ligne').length, etiquettes: [...document.querySelectorAll('.tr-alt i')].map(x => x.textContent),
        pas: document.querySelector('.tr-pas').textContent })), 'profil : lignes horizontales tous les 50 m (écart de 120 m), étiquettes, légende du pas'));
      pb.push(egal([7, 536], await o.p.evaluate(g => { const m = window.mrtTrace.pente(window.mrtTrace.lire(g), 0.5); return [Math.round(m.pente), Math.round(m.alt)]; }, GPX), 'pente : +7 % à 500 m du départ (80 m de montée sur 1,1 km), altitude 536 m'));
      await o.p.locator('.tr-trace').scrollIntoViewIfNeeded();
      const zr = await o.p.locator('.tr-trace').boundingBox();
      await o.p.mouse.move(zr.x + zr.width * (0.5 / 5.4), zr.y + zr.height / 2);
      pb.push(egal({ bulle: 'km 0,5 · 536 m · +7 %', repere: 4 }, await o.p.evaluate(() => ({ bulle: document.querySelector('.tr-bulle').textContent.replace(/[  ]/g, ' '),
        repere: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length })), 'profil : le survol montre le km, l\'altitude et la pente, et pose un repère sur la carte'));
      await o.p.mouse.move(5, 5);
      pb.push(egal({ cache: true, repere: 3 }, await o.p.evaluate(() => ({ cache: document.querySelector('.tr-reperes').hidden, repere: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length })), 'profil : la lecture et le repère disparaissent quand la souris sort'));
      const hautNormal = (await o.p.locator('.tr-carte').boundingBox()).height;
      await o.p.click('.tr-plein');
      await o.p.waitForTimeout(400);
      const pleine = await o.p.evaluate(() => ({ classe: document.querySelector('.tr-zone').classList.contains('tr-pleine'), titre: document.querySelector('.tr-plein').title }));
      const hautPlein = (await o.p.locator('.tr-carte').boundingBox()).height;
      pb.push(egal({ classe: true, titre: 'Quitter le plein écran', plusHaute: true }, { ...pleine, plusHaute: hautPlein > hautNormal }, 'carte : le bouton plein écran agrandit la carte'));
      await o.p.keyboard.press('Escape');
      await o.p.waitForTimeout(400);
      pb.push(egal({ classe: false, titre: 'Plein écran' }, await o.p.evaluate(() => ({ classe: document.querySelector('.tr-zone').classList.contains('tr-pleine'), titre: document.querySelector('.tr-plein').title })), 'carte : Échap quitte le plein écran'));
      const [dl] = await Promise.all([o.p.waitForEvent('download'), o.p.click('.tr-telecharger')]);
      pb.push(egal('Trail des Gorges.gpx', dl.suggestedFilename(), 'GPX : le bouton « ↓ GPX » télécharge le fichier, au nom de la course'));
      pb.push(egal([], o.erreurs, 'GPX, erreurs JavaScript'));
      await o.ctx.close();
      // Mini carte de l'étape (§ 3.1, n° 14) : seulement avec un tracé, sous la date et le compteur, sur ordinateur
      const mini = () => ({ cartes: document.querySelectorAll('.ob-carte .ob-mini').length, svg: document.querySelectorAll('.ob-mini svg .tr-mini-trace').length,
        pointsDepartArrivee: document.querySelectorAll('.ob-mini .tr-mini-depart, .ob-mini .tr-mini-arrivee').length,
        visible: !!document.querySelector('.ob-mini') && getComputedStyle(document.querySelector('.ob-mini')).display !== 'none' });
      o = await ouvrir(nav, 'objectif.html', 1200, avecTrace, {}, PARIS);
      await o.p.waitForSelector('.ob-carte .ob-mini svg', { timeout: 8000 });
      const pos = await o.p.evaluate(() => { const m = document.querySelector('.ob-mini').getBoundingClientRect(), c = m.top, d = document.querySelector('.ob-mini').closest('.ob-carte');
        const date = d.querySelector('.ob-date').getBoundingClientRect(), cr = d.getBoundingClientRect();
        return { sousDate: m.top > date.bottom, dansCarte: m.bottom <= cr.bottom && m.right <= cr.right, droite: m.right > cr.right - 40, sansDebord: document.documentElement.scrollWidth <= innerWidth }; });
      pb.push(egal({ cartes: 1, svg: 1, pointsDepartArrivee: 2, visible: true }, await o.p.evaluate(mini), 'mini carte : une seule étape a un tracé, tracé, départ et arrivée dessinés'),
        egal({ sousDate: true, dansCarte: true, droite: true, sansDebord: true }, pos, 'mini carte : à droite, sous la date, dans la carte d\'étape'),
        egal([], o.erreurs, 'mini carte, erreurs JavaScript'));
      await o.ctx.close();
      o = await ouvrir(nav, 'objectif.html', 390, avecTrace, {}, PARIS);
      await o.p.waitForSelector('.ob-carte');
      await o.p.waitForTimeout(600);
      pb.push(egal(false, (await o.p.evaluate(mini)).visible, 'mini carte : absente sur téléphone'));
      await o.ctx.close();
      // Import depuis la page : Corrida de Noël, sans tracé.
      const imp = JSON.parse(JSON.stringify(db));
      imp.persister = true; imp.ecritures = [];
      o = await ouvrir(nav, 'course.html?id=' + id(2), 1200, imp, {}, PARIS);
      await o.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o.p.setInputFiles('.tr-fichier', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('rien') });
      await o.p.waitForFunction(() => document.querySelector('.tr-erreur').textContent);
      pb.push(egal('Fichier .gpx attendu.', (await o.p.textContent('.tr-erreur')).trim(), 'import : un fichier qui n\'est pas un GPX est refusé'));
      await o.p.setInputFiles('.tr-fichier', { name: 'corrida.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX) });
      await o.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      pb.push(egal([true, moi + '/' + id(2) + '.gpx', true], [!!imp.fichiers[chemin(id(2))], imp.courses.find(c => c.id === id(2)).gpx, await o.p.evaluate(() => document.querySelector('#parcours').open)],
        'import depuis la page : fichier rangé dans le dossier de l\'utilisateur, chemin noté dans la course, Parcours rouvert avec la carte'));
      // Distance, D+ et D− remis à jour d'après le tracé (§ 3.4, n° 51) : boucle de 5,4 km, 500 → 620 → 500 m.
      const apres = imp.courses.find(c => c.id === id(2));
      pb.push(egal([5.4, 120, 120], [apres.distance, apres.dplus, apres.dmoins], 'import depuis la page : distance, D+ et D− mis à jour d\'après le tracé'));
      const GPX_BRUIT = '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>' + [100, 102, 100, 101, 110, 108, 111, 105].map((a, i) => '<trkpt lat="' + (45 + i * 0.001) + '" lon="4"><ele>' + a + '</ele></trkpt>').join('') + '</trkseg></trk></gpx>';
      pb.push(egal([11, 6], await o.p.evaluate(g => { const c = window.mrtTrace.chiffres(window.mrtTrace.lire(g)); return [c.dplus, c.dmoins]; }, GPX_BRUIT), 'D+ et D− : les variations de 3 m ou moins (bruit du GPS) ne comptent pas'));
      // Fichier à deux tracés : le choix, le plus proche des 10 km de la course en premier ; seul le tracé gardé est rangé.
      const deux = JSON.parse(JSON.stringify(db));
      deux.persister = true; deux.ecritures = [];
      const o2 = await ouvrir(nav, 'course.html?id=' + id(2), 1200, deux, {}, PARIS);
      await o2.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o2.p.setInputFiles('.tr-fichier', { name: 'epreuve.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX_DEUX) });
      await o2.p.waitForSelector('.tr-choix [data-piste]');
      pb.push(egal(['Le grand · 10,7 km', 'Le petit · 5,4 km', 'Annuler'], (await o2.p.$$eval('.tr-choix [data-piste]', bs => bs.map(b => b.textContent.replace(/[  ]/g, ' ')))),
        'deux tracés : un bouton par tracé, le plus proche de la distance de la course en premier'));
      await o2.p.click('.tr-choix [data-piste="0"]');
      await o2.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      const range = deux.fichiers[chemin(id(2))] || '';
      pb.push(egal([1, true, false], [(range.match(/<trk>/g) || []).length, /Le grand/.test(range), /Le petit/.test(range)], 'deux tracés : seul le tracé choisi est rangé'));
      // Tracé en deux segments éloignés : le saut ne compte pas dans la distance.
      pb.push(egal('5,3', await o2.p.evaluate(g => window.mrtTrace.lire(g).km.toFixed(1).replace('.', ','), GPX_SEGMENTS), 'segments : le saut d\'un segment au suivant ne compte pas'));
      pb.push(egal([], o2.erreurs, 'deux tracés, erreurs JavaScript'));
      await o2.ctx.close();
      pb.push(egal([], o.erreurs, 'import GPX, erreurs JavaScript'));
      await o.ctx.close();
      // Import depuis le formulaire : rangé à l'enregistrement ; puis suppression.
      const form = JSON.parse(JSON.stringify(db));
      form.persister = true; form.ecritures = [];
      o = await ouvrir(nav, 'course.html?id=' + id(1), 1200, form, {}, PARIS);
      await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
      pb.push(egal([['Importer un tracé'], 0], [await o.p.locator('.fc-gpx button').allTextContents(), await o.p.locator('.fc-gpx-etat').count()], 'formulaire : « Tracé GPX », sans tracé : « Importer un tracé » seul, sans ligne d\'état'));
      await o.p.setInputFiles('.fc-gpx-fichier', { name: 'lac.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX) });
      await o.p.waitForFunction(() => document.querySelector('[data-k="distance"]').value === '5,4');
      pb.push(egal(0, Object.keys(form.fichiers || {}).length, 'formulaire : rien n\'est rangé avant « Enregistrer »'));
      pb.push(egal(['5,4', '120', '120'], await o.p.evaluate(() => ['distance', 'dplus', 'dmoins'].map(k => document.querySelector('[data-k="' + k + '"]').value)), 'formulaire : distance, D+ et D− remplis d\'après le tracé'));
      await o.p.fill('[data-k="dplus"]', '125');

      await o.p.click('.fc-plein');
      await o.p.waitForSelector('.mc-panneau .pc-titre');
      pb.push(egal([true, moi + '/' + id(1) + '.gpx'], [!!form.fichiers[chemin(id(1))], form.courses.find(c => c.id === id(1)).gpx], 'formulaire : « Enregistrer » range le GPX avec la course'));
      pb.push(egal([5.4, 125, 120], (({ distance, dplus, dmoins }) => [distance, dplus, dmoins])(form.courses.find(c => c.id === id(1))), 'formulaire : « Enregistrer » garde les chiffres du tracé, y compris une correction à la main (D+ 125)'));
      await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
      await ouvrirBloc(o.p, 'parcours');
      await o.p.click('[data-fc="gpx-supprimer"]');
      await o.p.click('.fc-plein');
      await o.p.waitForSelector('.mc-panneau .pc-titre');
      pb.push(egal([false, null], [!!form.fichiers[chemin(id(1))], form.courses.find(c => c.id === id(1)).gpx], 'formulaire : « Supprimer », puis « Enregistrer », efface le tracé'));
      pb.push(egal([], o.erreurs, 'formulaire GPX, erreurs JavaScript'));
      await o.ctx.close();
    }
    for (const n of ['inconnue', id(99)]) {
      [r] = await pageCourse(n);
      pb.push(egal(['Course introuvable.', ['fermer']], [r.vide, r.barre], 'course introuvable (' + n + '), la croix seule'));
    }

    // Trail des Cimes sorti du groupe : « • 1 candidat », 6 courses d'ici là.
    const seul = JSON.parse(JSON.stringify(db));
    seul.courses.find(c => c.id === id(4)).groupe_options = null;
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, seul, {}, PARIS));
    k = await cartes(p);
    pb.push(egal(['Préparatoire • 1 option', "6 courses"], [k.find(x => x.nom === 'Printemps 2027').role, await p.evaluate(() => document.querySelectorAll('.mrt-stat-val')[3].textContent)], 'groupe d\'un seul candidat'));
    await ctx.close();

    // Course et parcours trop longs pour une ligne : le parcours passe à la ligne, sans le point.
    const long = JSON.parse(JSON.stringify(db));
    long.courses.find(c => c.id === id(1)).parcours = 'Le Grand Tour du Lac de Mont-Clair';
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 390, long, {}, PARIS));
    pb.push(egal([true, 'none', false], await p.evaluate(() => { const n = document.querySelector('.ob-carte .ob-nom');
      return [n.classList.contains('is-coupe'), getComputedStyle(n.querySelector('.ob-sep')).display, document.querySelectorAll('.ob-carte .ob-nom.is-coupe').length > 1]; }), 'parcours trop long : à la ligne, sans le point'));
    await ctx.close();

    // Course confirmée dont seul le mois est connu : compteur jusqu'au 1er du mois, à minuit.
    const moisSeul = JSON.parse(JSON.stringify(db));
    moisSeul.courses.find(c => c.id === id(6)).statut = 'confirmee';
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, moisSeul, {}, PARIS));
    await figer(p);
    pb.push(egal('253j', (await cartes(p)).find(x => x.nom === 'Trail de la Forêt').compteur, 'confirmée au mois seul : compteur jusqu\'au 1er du mois'));
    await ctx.close();

    // Au départ du Trail du Lac
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, db, {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-15T09:00:00+01:00') }));
    pb.push(egal('Course courue', (await cartes(p))[0].compteur, 'au départ : Course courue'));
    await ctx.close();

    // Téléphone : rôle à gauche, aligné sur le compteur ; date juste dessous, à droite, même si le rôle passe sur deux lignes ;
    // un interligne avant le nom ; rien ne dépasse ; ni titre ni légende.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 390, db, {}, PARIS));
    const tel = await p.evaluate(() => [...document.querySelectorAll('.ob-carte:not(.ob-groupe)')].filter(c => c.querySelector(':scope > .ob-cpt')).map(c => {
      const b = s => c.querySelector(':scope > ' + s).getBoundingClientRect(), carte = c.getBoundingClientRect();
      return { aligne: Math.abs(b('.ob-role').top - b('.ob-cpt').top) <= 2, dateDessous: b('.ob-date').top >= b('.ob-cpt').bottom && b('.ob-date').top - b('.ob-cpt').bottom <= 6,
        aDroite: Math.round(b('.ob-cpt').right) === Math.round(b('.ob-date').right),
        interligne: Math.round(b('.ob-nom').top - Math.max(b('.ob-date').bottom, b('.ob-role').bottom)) >= 15,
        dedans: b('.ob-role').right <= b('.ob-cpt').left && b('.ob-cpt').right <= carte.right };
    }).concat([{ debordement: document.documentElement.scrollWidth > innerWidth, roleDeuxLignes: [...document.querySelectorAll('.ob-carte > .ob-role')].some(r => r.getBoundingClientRect().height > 20),
      titreOuLegende: !!document.querySelector('#feuille-de-route h2, .ob-legende') }]));
    const t0 = { aligne: true, dateDessous: true, aDroite: true, interligne: true, dedans: true };
    pb.push(egal([t0, t0, t0, t0, { debordement: false, roleDeuxLignes: false, titreOuLegende: false }], tel, 'téléphone (compteur réduit aux jours : le rôle tient sur une ligne)'));
    // Sans compteur (Trail de la Forêt) : la date remonte, son haut aligné sur celui du rôle.
    const sansCpt = () => p.evaluate(() => { const c = [...document.querySelectorAll('.ob-carte')].find(x => /Forêt/.test(x.textContent)), b = s => c.querySelector(':scope > ' + s).getBoundingClientRect();
      return Math.abs(b('.ob-date').top - b('.ob-role').top) <= 1 && b('.ob-date').bottom <= b('.ob-nom').top; });
    pb.push(egal(true, await sansCpt(), 'téléphone, sans compteur : date en haut, face au rôle'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-telephone.png'), fullPage: true });
    pb.push(egal([], erreurs, 'téléphone, erreurs JavaScript'));
    await ctx.close();

    // Thème changé : seules les couleurs changent.
    const boites = async base => {
      const o = await ouvrir(nav, 'objectif.html', 1200, base, {}, PARIS);
      const r = await o.p.evaluate(() => [...document.querySelectorAll('.ob-carte > *')].map(e => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(','); }));
      const couleur = await o.p.evaluate(() => getComputedStyle(document.querySelector('.ob-nom')).color);
      await o.ctx.close();
      return [r, couleur];
    };
    const vert = JSON.parse(JSON.stringify(db)); vert.preferences[0].theme = 'vert-rose';
    const [b1, c1] = await boites(db), [b2, c2] = await boites(vert);
    pb.push(egal([true, true], [JSON.stringify(b1) === JSON.stringify(b2), c1 !== c2], 'thème : mêmes places, autres couleurs'));

    // Site partagé en lecture seule : la feuille de route et les pages du propriétaire, à l'identique.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    k = await cartes(p);
    pb.push(egal([true, 6], [await p.evaluate(() => !!document.querySelector('.mrt-bandeau')), k.length], 'lecture seule, feuille de route'));
    await ctx.close();
    [r] = await pageCourse(id(3), PARIS, partage, { 'mrt-vue': autre });
    pb.push(egal(['Trail des Gorges', 'Confirmée · Objectif · Étape 3 sur 6'], [r.titre, r.sur], 'lecture seule, page d\'une course'));
    return pb;
  },

  // Objectif : la page d'une course en modale (module-objectif-specification.md, § 3.4 et § 10).
  async modale(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const ouverte = p => p.evaluate(() => !!document.querySelector('.mc-voile'));
    // Ordinateur : ouverture depuis la feuille de route, la page reste dessous, la croix et Échap ferment, le défilement revient.
    let { p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 1200, db, {}, PARIS);
    await toucher(p, '.ob-et:nth-child(3) .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal({ titre: 'Trail des Gorges', barre: ['modifier', 'fermer'], retour: 0, cartes: 6, fond: true, defilement: 'hidden' }, await p.evaluate(() => ({
      titre: document.querySelector('.pc-titre').firstChild.textContent.trim(), barre: [...document.querySelectorAll('.pc-barre [data-ob]')].map(b => b.dataset.ob), retour: document.querySelectorAll('.pc-retour').length,
      cartes: document.querySelectorAll('.ob-et').length, fond: getComputedStyle(document.querySelector('.mc-voile')).backgroundColor !== 'rgba(0, 0, 0, 0)',
      defilement: getComputedStyle(document.documentElement).overflow })), 'ordinateur : modale ouverte, feuille de route dessous'));
    // Course suivante, puis précédente : la modale change de course sans se fermer ni ajouter d'entrée d'historique.
    const longueur = await p.evaluate(() => history.length);
    await p.click('.pc-nav .is-suivante');
    pb.push(egal(['Trail des Cimes', id(4), longueur], await p.evaluate(() => [document.querySelector('.pc-titre').firstChild.textContent.trim(), history.state.mrtCourse, history.length]),
      'course suivante : dans la modale, historique inchangé'));
    await p.click('.pc-nav .is-precedente');
    pb.push(egal('Trail des Gorges', await p.evaluate(() => document.querySelector('.pc-titre').firstChild.textContent.trim()), 'course précédente : dans la modale'));
    await p.keyboard.press('Escape');
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([false, 'objectif.html'], [await ouverte(p), p.url().split('/').pop()], 'Échap ferme la modale'));
    // La croix, le retour et la zone autour ferment aussi ; fermer par l'interface revient en arrière dans l'historique.
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.keyboard.press('Escape'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.mouse.click(10, 10); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([false, true], [await ouverte(p), await p.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden')], 'croix, Échap et clic autour : ferment la modale'));
    // Clic modifié (nouvel onglet) : le lien garde son comportement habituel.
    pb.push(egal('course.html?id=' + id(1), await p.evaluate(() => document.querySelector('.ob-et:first-child .ob-nom a').getAttribute('href')), 'le lien d\'une course garde son adresse'));
    pb.push(egal([], erreurs, 'modale, ordinateur, erreurs JavaScript'));
    await ctx.close();

    // Adresse d'une course ouverte directement : feuille de route dessous ; fermer y reste.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS));
    pb.push(egal([6, 'Trail des Gorges'], await p.evaluate(() => [document.querySelectorAll('.ob-et').length, document.title.split(' · ')[0]]), 'adresse d\'une course : feuille de route dessous, modale dessus'));
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([false, 6], [await ouverte(p), await p.locator('.ob-et').count()], 'adresse d\'une course : fermer laisse la feuille de route'));
    pb.push(egal([], erreurs, 'adresse d\'une course, erreurs JavaScript'));
    await ctx.close();

    // Téléphone : plein écran, qui monte du bas ; la croix ferme.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 390, db, {}, PARIS));
    await toucher(p, '.ob-et:nth-child(3) .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.waitForFunction(() => !document.getAnimations().length);
    const f = await p.evaluate(() => { const b = document.querySelector('.mc-panneau').getBoundingClientRect();
      return { haut: Math.round(b.top), gauche: Math.round(b.left), droite: Math.round(innerWidth - b.right), bas: Math.round(innerHeight - b.bottom), debordement: document.documentElement.scrollWidth > innerWidth }; });
    pb.push(egal({ haut: 0, gauche: 0, droite: 0, bas: 0, debordement: false }, f, 'téléphone : plein écran'));
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(false, await ouverte(p), 'téléphone : la croix ferme'));
    pb.push(egal([], erreurs, 'modale, téléphone, erreurs JavaScript'));
    await ctx.close();

    // Calendrier et Accueil : même modale, retour qui nomme la page d'origine.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#annee', 1200, db, {}, PARIS));
    await p.click('.cal-a-j[data-course="' + id(3) + '"]');
    await p.waitForSelector('.mc-panneau #preparation');
    pb.push(egal(true, await p.evaluate(() => !!document.querySelector('.cal-a-blocs') && !!document.querySelector('.mc-panneau')), 'Calendrier : modale au-dessus du calendrier'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, db, {}, PARIS));
    await p.click('a.ac-etape');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(true, await p.evaluate(() => !!document.querySelector('.ac-bloc') && !!document.querySelector('.mc-panneau')), 'Accueil : modale au-dessus de la page'));
    await ctx.close();
    return pb;
  },

  // Fiche d'une course : consultation et édition dans la même feuille (module-objectif-specification.md, § 3.8 et § 10).
  async fiche(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const copie = () => { const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.persister = true; return d; };
    const titres = p => p.evaluate(() => [...document.querySelectorAll('.fc-fiche .fc-bloc-titre')].map(b => b.textContent.trim()));
    // Barre du haut (« Annuler », « Enregistrer »), puis le libellé du mode.
    const barre = p => p.evaluate(() => [...document.querySelectorAll('.fc-barre button')].map(b => b.textContent.trim()).concat(document.querySelector('#fc-titre').textContent.trim()));
    const consultation = p => p.waitForSelector('.mc-panneau .pc-titre');
    // Consultation, puis crayon : la même feuille passe en édition.
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS);
    await p.click('[data-ob="modifier"]');
    await p.waitForSelector('.mc-panneau .fc-fiche');
    pb.push(egal({ barre: ['Annuler', 'Enregistrer', 'Modifier la course'], croix: 0, couches: 0, feuilles: 1, blocs: ['Course', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique', 'Résultat'], dossard: ['dossard', '1287'] },
      { barre: await barre(p), croix: await p.locator('.pc-fermer').count(), couches: await p.locator('.cal-voile').count(), feuilles: await p.locator('.mc-voile').count(), blocs: await titres(p),
        dossard: await p.evaluate(() => { const e = document.querySelector('#fc-dossard'); return [e.closest('.fc-grille').previousElementSibling.dataset.bloc, e.value]; }) }, 'crayon : édition dans la même feuille'));
    // Libellé du mode en capitales discrètes ; « Supprimer la course » : bouton danger (poubelle et texte), seul en bas de la fiche (design, § 11).
    pb.push(egal({ auxBords: true, libelle: 'uppercase', texte: ['Supprimer la course', null], poubelle: true, rouge: true, enBas: true }, await p.evaluate(() => {
      const b = document.querySelector('[data-fc="supprimer"]'), st = getComputedStyle(b), blocs = document.querySelectorAll('.fc-fiche .fc-bloc');
      const an = document.querySelector('.fc-barre [data-fc="annuler"]').getBoundingClientRect(), en = document.querySelector('.fc-barre .fc-plein').getBoundingClientRect(), br = document.querySelector('.fc-barre').getBoundingClientRect();
      return { auxBords: an.left - br.left < 40 && br.right - en.right < 40, libelle: getComputedStyle(document.querySelector('#fc-titre')).textTransform, texte: [b.textContent.trim(), b.getAttribute('aria-label')], poubelle: !!b.querySelector('svg'),
        rouge: st.borderTopColor === st.color && st.color === getComputedStyle(document.documentElement).getPropertyValue('--red').trim().replace(/^#(..)(..)(..)$/, (m, r, g, bl) => 'rgb(' + [r, g, bl].map(x => parseInt(x, 16)).join(', ') + ')'),
        enBas: !b.closest('.fc-barre') && b.getBoundingClientRect().top > blocs[blocs.length - 1].getBoundingClientRect().top };
    }), 'Annuler à gauche, Enregistrer à droite ; libellé du mode ; Supprimer la course, à contour rouge, avec son texte, seul en bas'));
    // Annuler sans saisie : retour à la consultation, sans question.
    let questions = [];
    await surDialogue(p, q => { questions.push(q); return false; });
    await p.click('.fc-barre [data-fc="annuler"]');
    await consultation(p);
    pb.push(egal([[], 0], [questions, await p.locator('.fc-fiche').count()], 'Annuler sans saisie : consultation, sans question'));
    // Après une saisie : « Abandonner les modifications ? » ; refusée, l'édition reste.
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-lieu', 'Ailleurs');
    await p.keyboard.press('Escape'); await pause();
    pb.push(egal([['Abandonner les modifications ?'], 1], [questions, await p.locator('.fc-fiche').count()], 'Échap après une saisie : question, l\'édition reste'));
    // Enregistrer : la course est rangée, retour à la consultation mise à jour.
    await p.click('.fc-barre .fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' }); await consultation(p);
    await p.waitForFunction(() => /Ailleurs/.test(document.querySelector('.pc-fiche .pc-lieu').textContent));
    pb.push(egal(['PATCH', 'Ailleurs', 1], [d.ecritures[0].methode, d.ecritures[0].corps.lieu, await p.locator('.mc-voile').count()], 'Enregistrer : rangée, consultation mise à jour'));
    pb.push(egal([], erreurs, 'fiche, édition, erreurs JavaScript'));
    await ctx.close();

    // « + Ajouter une course » : la feuille en édition ; enregistrée, la consultation de la nouvelle course.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 1200, d, {}, PARIS));
    await p.click('[data-ob="ajouter"]');
    await p.waitForSelector('.mc-panneau .fc-fiche');
    pb.push(egal(['Annuler', 'Enregistrer', 'Ajouter une course'], await barre(p), 'ajouter : feuille en édition'));
    await p.fill('#fc-course', 'Trail des Lacs'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court'); await p.fill('#fc-distance', '30');
    await p.click('.fc-barre .fc-plein');
    await p.waitForFunction(() => document.querySelector('.mc-panneau .pc-titre') && /Trail des Lacs/.test(document.querySelector('.pc-titre').textContent));
    pb.push(egal([1, 0], [await p.locator('.mc-voile').count(), await p.locator('.fc-fiche').count()], 'ajouter : enregistrée, sa consultation'));
    pb.push(egal([], erreurs, 'fiche, ajout, erreurs JavaScript'));
    await ctx.close();

    // Palmarès : la même feuille, ordre unique, blocs d'une course courue.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, d, {}, PARIS));
    await p.evaluate(() => document.querySelector('#palmares [data-edit]').click());
    await p.waitForSelector('.mc-panneau .fc-fiche');
    pb.push(egal({ barre: ['Annuler', 'Enregistrer', 'Modifier la course'], blocs: ['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'],
      ouverts: ['course', 'resultat'], approx: 0, statut: 0, classements: true },
      { barre: await barre(p), blocs: await titres(p), ouverts: await p.evaluate(() => [...document.querySelectorAll('.fc-fiche .fc-bloc-titre[aria-expanded="true"]')].map(b => b.dataset.bloc).filter(b => !['dossard', 'montre'].includes(b))),
        approx: await p.locator('#fc-date_approx').count(), statut: await p.locator('#fc-statut').count(),
        classements: await p.evaluate(() => document.querySelector('#fc-place').closest('.fc-grille').previousElementSibling.dataset.bloc === 'resultat') }, 'Palmarès : fiche unique, course courue'));
    // Mêmes blocs qu'une course à venir ; seuls les champs sans objet pour une course passée sont retirés.
    const champsDe = b => p.evaluate(b => [...document.querySelector('.fc-bloc-titre[data-bloc="' + b + '"]').nextElementSibling.querySelectorAll('[data-k], .fc-gpx, .fc-prep')]
      .map(e => e.dataset.k || e.className), b);
    pb.push(egal({ plan: ['role'], dossard: ['dossard', 'prix'], parcours: ['fc-gpx', 'ravitaillements_km', 'strategie'], preparation: ['pourquoi'] },
      { plan: await champsDe('plan'), dossard: await champsDe('dossard'), parcours: await champsDe('parcours'), preparation: await champsDe('preparation') },
      'Palmarès : Parcours comme une course à venir (tracé GPX, stratégie) ; Préparation sans plan ; ni statut ni inscription'));
    // Un champ toujours à la même place : sans « Date approximative », sa place reste vide ; l'heure reste sous la date, le lieu à sa droite.
    pb.push(egal([true, true], await p.evaluate(() => { const r = k => document.querySelector('#fc-' + k).getBoundingClientRect();
      return [Math.abs(r('heure').left - r('date').left) < 1 && r('heure').top > r('date').bottom, Math.abs(r('lieu').top - r('heure').top) < 1 && r('lieu').left > r('heure').right]; }),
      'Palmarès : place de « Date approximative » gardée vide ; heure sous la date, lieu à sa droite, comme pour une course à venir'));
    await p.keyboard.press('Escape');
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([], erreurs, 'fiche, Palmarès, erreurs JavaScript'));
    await ctx.close();

    // Consultation d'une course courue (§ 3.8) : toucher une ligne du Palmarès ouvre la feuille en consultation.
    const SEB = '00000000-0000-0000-0001-000000000007';
    const ligneSeb = p => p.evaluate(id => document.querySelector('#palmares tbody tr[data-id="' + id + '"] td').click(), SEB);
    // Consultation d'une course courue : lignes sous le titre, sections (intertitre → « Libellé | valeur » par ligne).
    const fiche = p => p.evaluate(() => {
      const t = e => e.innerText.trim().replace(/\s+/g, ' ');
      const r = { infos: [...document.querySelectorAll('.pc-info')].map(t) };
      document.querySelectorAll('details.pc-section').forEach(d => { d.open = true; }); // Montre repliée : ouverte pour la lire
      document.querySelectorAll('.pc-section').forEach(s => {
        const titre = s.querySelector('.pc-intertitre > span').textContent.trim();
        r[titre] = [...s.querySelectorAll('.pc-res-ligne')].map(l => l.firstChild.textContent.trim() + ' | ' + t(l.lastChild));
      });
      return r;
    });
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, d, {}, PARIS));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal({ titre: 'Semi de San Sebastián', libelle: 0, crayon: 1, croix: 1, actions: 0, compteur: 0, plan: 0, edition: 0 },
      { titre: await p.locator('.pc-titre').textContent(), libelle: await p.locator('.pc-sur').count(), crayon: await p.locator('[data-ob="modifier"]').count(), croix: await p.locator('.pc-fermer').count(),
        actions: await p.locator('.pc-actions').count(), compteur: await p.locator('.ob-cpt').count(), plan: await p.locator('#preparation').count(), edition: await p.locator('.fc-fiche').count() }, 'Palmarès : toucher une ligne ouvre la consultation d\'une course courue'));
    pb.push(egal({ infos: ['dim. 4 oct. 2026', 'Semi-marathon', '21,1 km'], Résultat: ['Temps | 01:56:05', 'Place | 1 951e', 'Vitesse | 10,9 km/h', 'Allure | 5:30 /km'] }, await fiche(p),
      'consultation : date sans heure, format, distance ; Résultat (temps, place, vitesse tirée de l\'allure, allure) ; pas de section Montre sans montre'));
    pb.push(egal([['Parcours', 'Logistique'], 1, 0, 0], [await p.locator('.pc-cellule > summary').allTextContents(), await p.locator('[data-ob="importer"]').count(), await p.locator('.pc-fiche').count(), await p.locator('.pc-lien-res').count()],
      'consultation : sans texte saisi, seul Parcours (« Importer un GPX ») ; ni fiche encadrée, ni lien Résultats sans adresse'));
    // Crayon : édition dans la même feuille ; Annuler sans saisie revient à la consultation, sans question.
    await p.click('[data-ob="modifier"]');
    await p.waitForSelector('.mc-panneau .fc-fiche');
    pb.push(egal(['Annuler', 'Enregistrer', 'Modifier la course'], await barre(p), 'consultation : le crayon bascule en édition'));
    await p.click('.fc-barre [data-fc="annuler"]');
    await consultation(p);
    pb.push(egal([1, 0], [await p.locator('.mc-voile').count(), await p.locator('.fc-fiche').count()], 'Annuler : retour à la consultation'));
    // Précédente et suivante suivent l'ordre du tableau.
    const ordre = await p.evaluate(() => [...document.querySelectorAll('#palmares tbody tr[data-id]')].map(tr => tr.querySelector('td').textContent.length && tr.dataset.id));
    const suivante = await p.evaluate(([ordre, id]) => document.querySelector('.pc-nav .is-suivante').getAttribute('href') === 'course.html?id=' + ordre[ordre.indexOf(id) + 1], [ordre, SEB]);
    pb.push(egal([0, true], [await p.locator('.pc-nav .is-precedente').count(), suivante], 'navigation : pas de précédente sur la première ligne, suivante = ligne suivante du tableau'));
    await p.click('.pc-nav .is-suivante');
    await p.waitForFunction(() => /Montauban/.test(document.querySelector('.pc-titre').textContent));
    pb.push(egal(1, await p.locator('.mc-voile').count(), 'suivante : la feuille reste, la course change'));
    await p.keyboard.press('Escape');
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    // Crayon de la ligne : ouvre directement l'édition.
    await p.evaluate(() => document.querySelector('#palmares [data-edit]').click());
    await p.waitForSelector('.mc-panneau .fc-fiche');
    pb.push(egal(['Annuler', 'Enregistrer', 'Modifier la course'], await barre(p), 'crayon de la ligne : édition directe'));
    pb.push(egal([], erreurs, 'consultation d\'une course courue, erreurs JavaScript'));
    await ctx.close();

    // Course renseignée (classements, dossard, prix, montre, textes) et course non terminée.
    d = copie();
    Object.assign(d.courses.find(c => c.id === SEB), { place: 112, effectif: 640, place_categorie: 18, effectif_categorie: 96, place_sexe: 95, effectif_sexe: 510,
      dossard: '1287', prix: 58, objectif: '01:50:00', objectif_precisions: 'Sous 1 h 55 dans tous les cas.', dplus: 40, dmoins: 38, montre_temps: 6950, montre_distance: 21.3, montre_dplus: 40, fc_moyenne: 151, categorie: 'M2', strategie: 'Partir prudemment.', pourquoi: 'Répétition.', logistique: 'Train.', description: 'Semi.', lien: 'https://example.org/semi', lien_resultats: 'https://example.org/resultats' });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, d, {}, PARIS));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal({ infos: ['dim. 4 oct. 2026', 'Semi-marathon · Dossard 1287', '21,1 km · 40 m D+'],
      Résultat: ['Temps | 01:56:05', 'Objectif | 01:50:00 Sous 1 h 55 dans tous les cas.', 'Place | 112e / 640', 'Catégorie | 18e / 96 Master 2 Homme', 'Sexe | 95e / 510', 'Vitesse | 10,9 km/h', 'Allure | 5:30 /km'],
      Montre: ['Temps | 01:55:50', 'Distance | 21,3 km', 'Dénivelé | 40 m D+', 'FC moyenne | 151 bpm'] },
      await fiche(p), 'consultation : dossard, distance et D+ sous le titre ; temps, objectif visé et ses précisions, puis place ; catégorie en clair ; Montre sous le Résultat ; ni prix'));
    pb.push(egal([['Résultat', 'Montre'], 'https://example.org/resultats', 'Classement complet', 0], [await p.locator('.pc-intertitre > span').allTextContents(), await p.locator('.pc-lien-res').getAttribute('href'),
      (await p.locator('.pc-lien-res').textContent()).trim(), await p.locator('.pc-liens').count()], 'consultation : deux sections, lien Résultats dans l\'intertitre, plus de bloc Liens'));
    // Rien de saisi n'est caché : sous la Montre, les textes repliés, comme pour une course à venir ; course courue sans tracé : Parcours replié, même avec une stratégie.
    pb.push(egal({ cellules: ['À propos de la course', 'Parcours', 'Préparation', 'Logistique'], ouvertes: [], textes: ['Semi.', 'STRATÉGIE DE COURSE Partir prudemment.', 'POURQUOI CETTE COURSE Répétition.', 'Total 58 € LOGEMENT Ajouter TRANSPORT Ajouter MATOS Modifier la liste Aucun article. NOTES Train.'], sous: true, plan: 0 },
      await p.evaluate(() => { const cel = [...document.querySelectorAll('.pc-cellule')], t = e => e.innerText.trim().replace(/\s+/g, ' ');
        const ouv = cel.filter(d => d.open).map(d => d.querySelector('summary').textContent.trim());
        cel.forEach(d => { d.open = true; });
        return { cellules: cel.map(d => d.querySelector('summary').textContent.trim()), ouvertes: ouv, textes: cel.map(d => t(d.querySelector('.pc-corps')).replace(/^Importer un GPX ?/, '')),
          sous: document.querySelector('.pc-textes').getBoundingClientRect().top >= document.querySelector('.pc-resultats').getBoundingClientRect().bottom, plan: document.querySelectorAll('.pc-textes .cal-lignes').length }; }),
      'consultation : À propos, Parcours, Préparation (rôle, sans plan), Logistique, repliés sous la Montre ; course courue sans tracé : Parcours replié même avec une stratégie'));
    // Course courue avec tracé GPX : Parcours ouvert d'emblée (seule la course sans tracé le garde replié)
    {
      const g = JSON.parse(JSON.stringify(d)), c = g.courses.find(x => x.id === SEB);
      c.gpx = c.utilisateur + '/' + c.id + '.gpx'; g.fichiers = { ['traces/' + c.gpx]: GPX };
      const o = await ouvrir(nav, 'palmares.html', 1200, g, {}, PARIS);
      await ligneSeb(o.p); await consultation(o.p);
      pb.push(egal(['Parcours'], await o.p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].filter(x => x.open).map(x => x.querySelector('summary').textContent.trim())), 'course courue avec tracé GPX : Parcours ouvert d\'emblée'));
      await o.ctx.close();
    }
    pb.push(egal([true, 'rgb', true], await p.evaluate(() => { const [r, m] = [...document.querySelectorAll('.pc-section')], coul = e => getComputedStyle(e).color;
      return [m.getBoundingClientRect().top >= r.getBoundingClientRect().bottom, coul(m.querySelector('.ob-val')).slice(0, 3), coul(m.querySelector('.ob-val')) !== coul(r.querySelector('.pc-res-ligne .ob-val'))]; }),
      'ordinateur : Montre sous Résultat, valeurs en Texte discret'));
    await ctx.close();
    // Montre repliée à l'ouverture ; un clic sur son titre l'ouvre ; la feuille tient sans défilement sur un écran d'ordinateur (1200 × 700).
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, d, {}, Object.assign({ hauteur: 700 }, PARIS)));
    await ligneSeb(p);
    await consultation(p);
    const replie = await p.evaluate(() => { const m = document.querySelector('details.pc-section.is-montre'), pan = document.querySelector('.mc-panneau');
      return [!!m && !m.open, document.querySelector('.pc-resultats').getBoundingClientRect().bottom <= pan.getBoundingClientRect().bottom]; });
    await p.click('details.is-montre > summary');
    pb.push(egal([[true, true], true], [replie, await p.evaluate(() => document.querySelector('details.is-montre').open)], 'Montre repliée à l\'ouverture, Résultat et Montre tiennent sans défilement ; un clic sur « Montre » l\'ouvre'));
    pb.push(egal([1, ''], [await p.locator('.pc-titre .ob-ext svg').count(), (await p.locator('.pc-titre .ob-ext').textContent()).trim()], 'site officiel : flèche dessinée, pas de caractère ↗ (emoji sur iPhone)'));
    await ctx.close();
    // Téléphone : rien ne dépasse.
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 390, d, {}, Object.assign({ mobile: true }, PARIS)));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal(false, await p.evaluate(() => document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth), 'téléphone : Résultat et Montre ne dépassent pas'));
    pb.push(egal(true, await p.evaluate(() => { const [r, m] = [...document.querySelectorAll('.pc-section')].map(x => x.getBoundingClientRect()); return m.top >= r.bottom; }), 'téléphone : Montre sous Résultat'));
    await ctx.close();
    d = copie();
    Object.assign(d.courses.find(c => c.id === SEB), { dnf: true, temps: null, allure: null });
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, d, {}, PARIS));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal(['Temps | DNF', 'Place | 1 951e'], (await fiche(p)).Résultat, 'course non terminée : DNF, ni vitesse ni allure'));
    await ctx.close();

    // Première place : « 1er », « 1re » pour une coureuse ; chaque valeur sur une ligne.
    for (const [sexe, attendu] of [['homme', 'Place | 1er / 640'], ['femme', 'Place | 1re / 640']]) {
      d = copie();
      d.profils[0].sexe = sexe;
      Object.assign(d.courses.find(c => c.id === SEB), { place: 1, effectif: 640 });
      ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, d, {}, PARIS));
      await ligneSeb(p);
      await consultation(p);
      const uneLigne = await p.evaluate(() => [...document.querySelectorAll('.pc-res-ligne')].every(l => l.getBoundingClientRect().height < 50));
      pb.push(egal([attendu, true], [(await fiche(p)).Résultat[1], uneLigne], 'première place ' + (sexe === 'femme' ? '« 1re »' : '« 1er »') + ' ; chaque valeur sur une ligne'));
      await ctx.close();
    }
    // Site partagé en lecture seule : la consultation s'ouvre, sans crayon.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal([0, 1, 0], [await p.locator('[data-ob="modifier"]').count(), await p.locator('.pc-fermer').count(), await p.locator('[data-ob="importer"]').count()], 'lecture seule : la consultation s\'ouvre, sans crayon ni « Importer un GPX »'));
    await ctx.close();

    // Téléphone : plein écran, rien ne dépasse, crayon visible au bout des lignes.
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 390, copie(), {}, Object.assign({ mobile: true }, PARIS)));
    pb.push(egal('1', await p.evaluate(() => getComputedStyle(document.querySelector('.pv2-edit')).opacity), 'écran tactile : crayon de ligne visible'));
    await ligneSeb(p);
    await consultation(p);
    await p.waitForFunction(() => !document.getAnimations().length);
    pb.push(egal({ haut: 0, debordement: false, cellules: 2 }, await p.evaluate(() => ({ haut: Math.round(document.querySelector('.mc-panneau').getBoundingClientRect().top),
      debordement: document.documentElement.scrollWidth > innerWidth || document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth, cellules: document.querySelectorAll('.pc-cellule').length })), 'téléphone : consultation en plein écran, rien ne dépasse'));
    await ctx.close();

    // Marquer comme courue : bascule en édition, état Courue ; enregistrée, la feuille se ferme.
    d = copie();
    d.courses.find(c => c.id === id(1)).date = '2026-10-20';
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(1), 1200, d, {}, PARIS));
    await p.click('[data-ob="marquer"]');
    await p.waitForSelector('.fc-fiche');
    pb.push(egal([['Annuler', 'Enregistrer', 'Marquer comme courue'], 0, true], [await barre(p), await p.locator('[data-fc="supprimer"]').count(), (await titres(p)).includes('Résultat')], 'marquer : édition, état Courue, sans Supprimer'));
    await p.fill('#fc-temps', '2:40:00');
    await p.click('.fc-barre .fc-plein');
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['courue', 9600], [d.ecritures[0].corps.etat, d.ecritures[0].corps.temps], 'marquer : rangée courue, la feuille se ferme'));
    await ctx.close();

    // Téléphone : édition dans la même feuille au bord transparent ; « Enregistrer » visible sans défiler ; rien ne dépasse.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 390, copie(), {}, PARIS));
    await p.click('[data-ob="modifier"]');
    await p.waitForSelector('.fc-fiche');
    await p.waitForFunction(() => !document.getAnimations().length);
    pb.push(egal({ haut: 0, visible: true, debordement: false }, await p.evaluate(() => {
      const b = document.querySelector('.fc-barre .fc-plein').getBoundingClientRect();
      return { haut: Math.round(document.querySelector('.mc-panneau').getBoundingClientRect().top), visible: b.top >= 0 && b.bottom <= innerHeight && b.right <= innerWidth,
        debordement: document.documentElement.scrollWidth > innerWidth || document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth };
    }), 'téléphone : édition en plein écran, Enregistrer visible'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'fiche-v2-telephone.png') });
    pb.push(egal([], erreurs, 'fiche, téléphone, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },

  // Objectif : saisie et édition d'une course à venir (module-objectif-specification.md, § 3.7 et § 10).
  // Objectif, § 3.10 : Proposer une stratégie ; la fonction est remplacée par une réponse fixe, sans coût.
  async strategie(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    db.courses.find(c => c.id === id(3)).ravitaillements_km = [12, 25, 38];
    db.courses.find(c => c.id === id(2)).format = null;
    db.aliments = [{ id: 'al-1', utilisateur: moi, nom: 'Gel coco', portion: '1 pièce', kcal: 90, proteines: 0, glucides: 22, lipides: 0, favori: true },
      { id: 'al-2', utilisateur: moi, nom: 'Pain', portion: '100 g', kcal: 250, proteines: 8, glucides: 50, lipides: 1, favori: false }];
    db.profil_entrainement = [{ utilisateur: moi, niveau: 'intermediaire', fc_max: 182, fragiles: 'genou' }];
    const REPONSE = { strategie: 'Partir à l\'économie jusqu\'au km 12.\n- Marcher dès 15 % de pente.', boire_manger: '- 60 g de glucides par heure.' };
    const copie = rep => { const d = JSON.parse(JSON.stringify(db)); d.persister = true; d.ecritures = []; d.appels = [];
      d.relais = corps => { d.appels.push(corps); return rep || { status: 200, body: REPONSE }; }; return d; };
    const etat = p => p.evaluate(() => {
      const t = x => (x ? x.textContent.replace(/\s+/g, ' ').trim() : null), q = s => document.querySelector(s);
      const b = q('[data-st="proposer"]');
      return { ravitos: t(q('.pc-ravitos')), strategie: t(q('.pc-strategie')), bouton: b ? [t(b), b.disabled, b.hidden] : null, msg: t(q('.st-msg')),
        proposition: q('.st-proposition') ? !q('.st-proposition').hidden : null, titres: [...document.querySelectorAll('.st-texte .pc-sous-titre')].map(t),
        parcours: !!(q('#parcours') && q('#parcours').open) };
    });

    // 1. Trail des Gorges : ravitaillements, bouton sous la stratégie ; la proposition, puis « OK ».
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS);
    await p.waitForSelector('.pc-titre');
    let e = await etat(p);
    pb.push(egal({ ravitos: 'Ravitaillements km 12 · 25 · 38', strategie: 'Stratégie de coursePartir prudemment jusqu\'au premier ravitaillement.', bouton: ['Proposer une stratégie', false, false], msg: '', proposition: false, parcours: true },
      { ravitos: e.ravitos, strategie: e.strategie, bouton: e.bouton, msg: e.msg, proposition: e.proposition, parcours: e.parcours }, 'Trail des Gorges : ravitaillements, stratégie, puis le bouton, Parcours ouvert'));
    const ordre = await p.evaluate(() => [...document.querySelector('#parcours .pc-corps').children].map(x => x.className).filter(c => !/^tr-/.test(c)));
    pb.push(egal(['pc-ravitos', 'pc-strategie', 'st-zone'], ordre, 'Parcours : sous le tracé, ravitaillements, stratégie, bouton, dans cet ordre'));
    await p.click('[data-st="proposer"]');
    await p.waitForSelector('.st-proposition:not([hidden])');
    e = await etat(p);
    pb.push(egal({ titres: ['Stratégie', 'Boire et manger'], bouton: true, msg: '' }, { titres: e.titres, bouton: e.bouton[2], msg: e.msg }, 'proposition : deux parties titrées, « OK » ; le bouton masqué'));
    const cx = d.appels[0] && d.appels[0].contexte, brut = JSON.stringify(cx || {});
    pb.push(egal([1, false, false, false], [d.appels.length, /Trail des Gorges/.test(brut), /Mont-Clair/.test(brut), /Essai|@/.test(JSON.stringify(cx.profil || {}))], 'contexte : un appel, ni nom de course, ni lieu, ni nom du coureur'));
    pb.push(egal({ format: 'Trail long', distance_km: 45, dplus_m: 2100, objectif: '06:30:00', ravitaillements_km: [12, 25, 38], heure_depart: '07:30' },
      (({ format, distance_km, dplus_m, objectif, ravitaillements_km, heure_depart }) => ({ format, distance_km, dplus_m, objectif, ravitaillements_km, heure_depart }))(cx.course), 'contexte : la course'));
    pb.push(egal([[{ nom: 'Gel coco', portion: '1 pièce', kcal: 90, glucides_g: 22 }], 182, 'genou'], [cx.aliments_favoris, cx.profil.fc_max, cx.profil.points_fragiles], 'contexte : favoris seulement, profil'));
    await p.click('[data-st="ok"]');
    await p.waitForFunction(() => /Partir à l'économie/.test((document.querySelector('.pc-strategie') || {}).textContent || ''));
    const texte = 'Stratégie\n' + REPONSE.strategie + '\n\nBoire et manger\n' + REPONSE.boire_manger;
    e = await etat(p);
    pb.push(egal([texte, false, false, true], [d.courses.find(c => c.id === id(3)).strategie, e.proposition, e.bouton[2], e.parcours], '« OK » : la stratégie remplacée et rangée ; la proposition fermée, le bouton revenu, Parcours ouvert'));
    pb.push(egal([], erreurs, 'proposer une stratégie, erreurs JavaScript'));
    await ctx.close();

    // 2. Compte non pilote, panne : message, stratégie inchangée.
    for (const [rep, msg] of [[{ status: 403, body: { code: 'reserve' } }, 'Réservé aux comptes pilotes pour l\'instant.'], [{ status: 502, body: { code: 'ia' } }, 'La proposition n\'a pas abouti. Réessaie dans un moment.']]) {
      d = copie(rep);
      ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS));
      await p.waitForSelector('[data-st="proposer"]');
      await p.click('[data-st="proposer"]');
      await p.waitForFunction(m => (document.querySelector('.st-msg') || {}).textContent === m, msg);
      e = await etat(p);
      pb.push(egal([msg, false, 'Partir prudemment jusqu\'au premier ravitaillement.'], [e.msg, e.proposition, d.courses.find(c => c.id === id(3)).strategie], 'réponse ' + rep.status + ' : message, stratégie inchangée'));
      await ctx.close();
    }

    // 3. Course courue : pas de bouton ; course sans format : bouton grisé et message.
    const courue = db.courses.find(c => c.etat === 'courue').id;
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + courue, 1200, copie(), {}, PARIS));
    await p.waitForSelector('.pc-titre');
    pb.push(egal(0, await p.locator('[data-st="proposer"]').count(), 'course courue : pas de bouton'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(2), 1200, copie(), {}, PARIS));
    await p.waitForSelector('.pc-titre');
    e = await etat(p);
    pb.push(egal([['Proposer une stratégie', true, false], 'Indique d\'abord la distance et le format de la course.', null], [e.bouton, e.msg, e.ravitos], 'Corrida de Noël sans format : bouton grisé, message ; pas de ravitaillements'));
    await ctx.close();

    // 4. Fiche d'édition : « Ravitaillements (km) » dans Parcours.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await ouvrirBloc(p, 'parcours');
    const lib = await p.evaluate(() => { const c = document.getElementById('fc-ravitaillements_km'); return [c.closest('.fc-champ').querySelector('label').textContent.trim(), c.value, c.getAttribute('placeholder')]; });
    pb.push(egal(['Ravitaillements (km)', '12, 25, 38', 'ex. 12, 25, 38'], lib, 'fiche : « Ravitaillements (km) », valeur et exemple'));
    for (const [saisie, msg] of [['12, 50', 'Des km dans l\'ordre, entre le départ et l\'arrivée.'], ['25, 12', 'Des km dans l\'ordre, entre le départ et l\'arrivée.'], ['douze', 'Indique les km séparés par des virgules.']]) {
      await p.fill('#fc-ravitaillements_km', saisie);
      await p.click('.fc-plein'); await pause();
      pb.push(egal(msg, await p.textContent('#fc-ravitaillements_km-err'), 'fiche : « ' + saisie + ' » refusé'));
    }
    await p.fill('#fc-ravitaillements_km', '10; 20,5, 30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([10, 20.5, 30], d.courses.find(c => c.id === id(3)).ravitaillements_km, 'fiche : « 10; 20,5, 30 » rangé'));
    await p.waitForSelector('.pc-ravitos');
    pb.push(egal('Ravitaillements km 10 · 20,5 · 30', (await p.textContent('.pc-ravitos')).replace(/\s+/g, ' ').trim(), 'page : les nouveaux ravitaillements'));
    pb.push(egal([], erreurs, 'fiche, ravitaillements, erreurs JavaScript'));
    await ctx.close();

    // 5. Tracé en tronçons : une montée de 200 m sur 2 km, puis la descente.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, copie(), {}, PARIS));
    await p.waitForSelector('.pc-titre');
    const tr = await p.evaluate(() => {
      const pts = [];
      for (let i = 0; i <= 400; i++) { const km = i / 100; pts.push([45, 4, km <= 2 ? 500 + km * 100 : 900 - km * 100, km, false]); }
      const r = window.mrtStrategie.troncons(pts);
      return [r.par_km.length, r.par_km[0].pente_pct, r.montees_descentes.map(x => x.sens + ' ' + x.du_km + '-' + x.au_km + ' ' + x.denivele_m)];
    });
    pb.push(egal([4, 9.9, ['montée 0-2 198', 'descente 2-4 198']], tr, 'tronçons : 4 km, pente de 10 % (altitude lissée sur 50 m), une montée et une descente de 200 m'));
    await ctx.close();

    // 6. Téléphone : la proposition sur toute la largeur, rien ne dépasse.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 390, copie(), {}, PARIS));
    await p.waitForSelector('[data-st="proposer"]');
    await p.click('[data-st="proposer"]');
    await p.waitForSelector('.st-proposition:not([hidden])');
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'strategie-telephone.png'), fullPage: true });
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), 'téléphone : rien ne dépasse'));
    pb.push(egal([], erreurs, 'téléphone, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },

  // Objectif, § 3.9 : Remplir depuis la page de la course ; la fonction « lire-page-course » est remplacée par une réponse fixe.
  async remplir(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const commun = { course: 'Trail des Hauts', lieu: 'Mont-Clair', type: 'trail', description: '', lien: 'https://example.org/hauts', ouverture_inscriptions: '2026-12-01', ouverture_heure: '', inscription: 'https://example.org/hauts/inscription', dmoins: '' };
    const DEUX = { parcours: [Object.assign({}, commun, { parcours: 'Le 25', date: '2027-06-13', heure: '09:00', format: '', distance: '25', dplus: '900', prix: '35' }),
      Object.assign({}, commun, { parcours: 'Le 50', date: '2027-06-12', heure: '06:00', format: '', distance: '50', dplus: '2400', prix: '60' })] };
    const copie = rep => { const d = JSON.parse(JSON.stringify(db)); d.persister = true; d.ecritures = []; d.appels = [];
      d.relais = corps => { d.appels.push(corps); return rep || { status: 200, body: DEUX }; }; return d; };
    const v = (p, k) => p.inputValue('#fc-' + k);
    const msg = p => p.evaluate(() => (document.querySelector('.fc-rp-msg') || {}).textContent || '');
    const remplis = p => p.evaluate(() => [...document.querySelectorAll('.fc-rempli [data-k]')].map(e => e.dataset.k));
    const vue = p => p.evaluate(() => ['.fc-rp-ferme', '.fc-rp-ouvert', '.fc-rp-choix'].filter(s => !document.querySelector(s).hidden).map(s => s.slice(7)));
    const ajouter = async (largeur, d) => {
      const o = await ouvrir(nav, 'objectif.html', largeur, d, {}, PARIS);
      await o.p.click('[data-ob="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
      return o;
    };
    const coller = async (p, texte) => {
      await p.click('[data-fc="rp-ouvrir"]');
      await p.fill('.fc-rp-texte', texte);
      await p.click('[data-fc="rp-remplir"]');
    };

    // 1. L'encart en tête de la fiche ; « Remplir » grisé tant que la zone est vide ; deux parcours : le choix.
    let d = copie();
    let { p, ctx, erreurs } = await ajouter(1200, d);
    pb.push(egal(['Tu as la page de la course (Finishers, site officiel…) ?', 'Remplir depuis la page de la course', ['ferme'], true],
      [await p.textContent('.fc-rp-phrase'), await p.textContent('[data-fc="rp-ouvrir"]'), await vue(p),
        await p.evaluate(() => { const r = document.querySelector('.fc-remplir'); return r.compareDocumentPosition(document.querySelector('.fc-bloc')) === Node.DOCUMENT_POSITION_FOLLOWING; })],
      'ajout : l\'encart avant le bloc Course, fermé'));
    await p.click('[data-fc="rp-ouvrir"]');
    pb.push(egal([['ouvert'], true, 'Colle ici le texte de la page'], [await vue(p), await p.isDisabled('[data-fc="rp-remplir"]'), await p.getAttribute('.fc-rp-texte', 'placeholder')], 'ouvert : consigne, zone de collage, « Remplir » grisé'));
    await p.fill('.fc-rp-texte', 'Trail des Hauts, édition 2027 : Le 25 et Le 50…');
    await p.click('[data-fc="rp-remplir"]');
    await p.waitForSelector('.fc-rp-choix:not([hidden])');
    pb.push(egal(['Plusieurs parcours trouvés : lequel ?', ['Le 25 · 25 km · 900 m D+', 'Le 50 · 50 km · 2 400 m D+']],
      [await p.textContent('.fc-rp-question'), await p.evaluate(() => [...document.querySelectorAll('[data-rp]')].map(b => b.textContent))], 'deux parcours : la question et un bouton par parcours'));
    const appel = d.appels[0] || {};
    pb.push(egal([1, 'Trail des Hauts, édition 2027 : Le 25 et Le 50…', '2026-10-20', true, true],
      [d.appels.length, appel.texte, appel.aujourdhui, (appel.types || []).some(t => t.id === 'trail'), (appel.formats || []).some(f => f.id === 'trail_long' && f.type === 'trail')], 'appel : le texte, la date du jour, les types et les formats'));
    await p.click('[data-rp="1"]');
    const champs = ['course', 'parcours', 'date', 'heure', 'lieu', 'type', 'format', 'distance', 'dplus', 'lien', 'ouverture_inscriptions', 'inscription', 'prix', 'statut', 'objectif_type', 'inscrit'];
    const lu = async () => { const o = {}; for (const k of champs) o[k] = k === 'inscrit' ? await p.isChecked('#fc-inscrit') : await v(p, k); return o; };
    pb.push(egal({ course: 'Trail des Hauts', parcours: 'Le 50', date: '2027-06-12', heure: '06:00', lieu: 'Mont-Clair', type: 'trail', format: 'trail_long', distance: '50', dplus: '2400',
      lien: 'https://example.org/hauts', ouverture_inscriptions: '2026-12-01', inscription: 'https://example.org/hauts/inscription', prix: '60', statut: 'confirmee', objectif_type: '', inscrit: false }, await lu(),
      '« Le 50 » : la fiche remplie ; statut, objectif et « Inscrit » inchangés'));
    pb.push(egal([['course', 'parcours', 'date', 'heure', 'lieu', 'type', 'distance', 'dplus', 'lien', 'ouverture_inscriptions', 'inscription', 'prix'], ['ferme'], '12 champs remplis : vérifie-les avant d\'enregistrer.'],
      [await remplis(p), await vue(p), await msg(p)],
      'liseré sur les champs remplis, encart replié, message'));
    pb.push(egal([false, false], await p.evaluate(() => ['course', 'dossard'].map(b => document.querySelector('.fc-bloc-titre[data-bloc="' + b + '"]').nextElementSibling.hidden)), 'blocs Course et Inscription ouverts'));
    pb.push(egal(true, await p.evaluate(() => getComputedStyle(document.getElementById('fc-distance')).borderTopColor === getComputedStyle(document.querySelector('.fc-oblig')).color), 'liseré en Accent'));
    await p.fill('#fc-distance', '51');
    pb.push(egal(false, (await remplis(p)).includes('distance'), 'distance changée à la main : plus de liseré'));
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const ins = (d.ecritures.find(e => e.methode === 'POST' && e.table === 'courses') || {}).corps || {};
    pb.push(egal({ course: 'Trail des Hauts', parcours: 'Le 50', date: '2027-06-12', heure: '06:00', lieu: 'Mont-Clair', format: 'trail_long', distance: 51, dplus: 2400, prix: 60, ouverture_inscriptions: '2026-12-01', statut: 'confirmee' },
      (({ course, parcours, date, heure, lieu, format, distance, dplus, prix, ouverture_inscriptions, statut }) => ({ course, parcours, date, heure, lieu, format, distance, dplus, prix, ouverture_inscriptions, statut }))(ins), '« Enregistrer » : la course rangée avec les valeurs affichées'));
    pb.push(egal([], erreurs, 'remplir, erreurs JavaScript'));
    await ctx.close();

    // 2. Un seul parcours ; un nom déjà saisi reste ; format hors liste et lien sans https:// laissés de côté, date passée aussi.
    const UN = { parcours: [Object.assign({}, commun, { parcours: '', date: '2026-06-13', heure: '9h', format: 'trail_inconnu', distance: '25,5', dplus: '900 ', prix: '', lien: 'example.org/hauts', inscription: 'ftp://x' })] };
    d = copie({ status: 200, body: UN });
    ({ p, ctx, erreurs } = await ajouter(1200, d));
    await p.fill('#fc-course', 'Trail des Hautes Terres');
    await coller(p, 'texte');
    await p.waitForFunction(() => /rempli/.test((document.querySelector('.fc-rp-msg') || {}).textContent || ''));
    pb.push(egal({ course: 'Trail des Hautes Terres', lieu: 'Mont-Clair', type: 'trail', format: 'trail_court', distance: '25,5', dplus: '900', date: '', heure: '', lien: '', inscription: '', msg: '5 champs remplis : vérifie-les avant d\'enregistrer.' },
      { course: await v(p, 'course'), lieu: await v(p, 'lieu'), type: await v(p, 'type'), format: await v(p, 'format'), distance: await v(p, 'distance'), dplus: await v(p, 'dplus'), date: await v(p, 'date'), heure: await v(p, 'heure'), lien: await v(p, 'lien'), inscription: await v(p, 'inscription'), msg: await msg(p) },
      'un parcours : rempli aussitôt (lieu, type, distance, D+, ouverture ; le format suit la distance) ; le nom saisi reste ; date passée, format hors liste et liens illisibles laissés de côté, sans message'));
    // Recommencer : seuls les champs encore vides sont remplis ; rien à ajouter.
    d.relais = () => ({ status: 200, body: { parcours: [Object.assign({}, commun, { parcours: '', date: '', heure: '', format: '', distance: '30', dplus: '', prix: '', lien: '', inscription: '', ouverture_inscriptions: '' , lieu: 'Ailleurs', course: 'Autre' })] } });
    await coller(p, 'autre texte');
    await p.waitForFunction(() => /Aucune/.test((document.querySelector('.fc-rp-msg') || {}).textContent || ''));
    pb.push(egal(['Aucune information à ajouter n\'a été trouvée dans ce texte.', '25,5', 'Mont-Clair'], [await msg(p), await v(p, 'distance'), await v(p, 'lieu')], 'tout déjà rempli : message, rien de changé'));
    await ctx.close();

    // 3. Mois seul, réponse vide, compte non pilote, panne ; « Fermer ».
    d = copie({ status: 200, body: { parcours: [Object.assign({}, commun, { parcours: '', date: '2027-07', heure: '08:00', format: '', distance: '', dplus: '', prix: '', ouverture_inscriptions: '2027-01' })] } });
    ({ p, ctx, erreurs } = await ajouter(1200, d));
    await coller(p, 'texte');
    await p.waitForFunction(() => /rempli/.test((document.querySelector('.fc-rp-msg') || {}).textContent || ''));
    pb.push(egal([true, '2027-07', '', true, '2027-01'], [await p.isChecked('#fc-date_approx'), await v(p, 'date'), await v(p, 'heure'), await p.isChecked('#fc-ouverture_approx'), await v(p, 'ouverture_inscriptions')],
      'mois seul : « Seul le mois est connu » coché, sans heure (date et ouverture)'));
    await ctx.close();
    for (const [rep, texte] of [[{ status: 200, body: { parcours: [] } }, 'Aucune information à ajouter n\'a été trouvée dans ce texte.'], [{ status: 403, body: { code: 'reserve' } }, 'Réservé aux comptes pilotes pour l\'instant.'],
      [{ status: 502, body: { code: 'ia' } }, 'La lecture n\'a pas abouti. Réessaie dans un moment, ou remplis la fiche à la main.']]) {
      d = copie(rep);
      ({ p, ctx, erreurs } = await ajouter(1200, d));
      await coller(p, 'texte');
      await p.waitForFunction(t => (document.querySelector('.fc-rp-msg') || {}).textContent === t, texte);
      pb.push(egal([texte, ''], [await msg(p), await v(p, 'course')], 'réponse ' + rep.status + (rep.body.code ? ' ' + rep.body.code : ' vide') + ' : message, fiche inchangée'));
      await ctx.close();
    }
    d = copie();
    ({ p, ctx } = await ajouter(1200, d));
    await p.click('[data-fc="rp-ouvrir"]'); await p.fill('.fc-rp-texte', 'texte');
    await p.click('.fc-rp-ouvert [data-fc="rp-fermer"]');
    pb.push(egal([['ferme'], '', '', 0], [await vue(p), await p.inputValue('.fc-rp-texte'), await v(p, 'course'), d.appels.length], '« Fermer » : l\'encart replié, la zone vidée, la fiche inchangée'));
    await ctx.close();

    // 4. Pas d'encart pour une course existante (crayon) ; téléphone : rien ne dépasse.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, copie(), {}, PARIS));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(0, await p.locator('.fc-remplir').count(), 'course existante : pas d\'encart'));
    await ctx.close();
    ({ p, ctx, erreurs } = await ajouter(390, copie()));
    await coller(p, 'texte');
    await p.waitForSelector('.fc-rp-choix:not([hidden])');
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'remplir-telephone.png') });
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || [...document.querySelectorAll('.fc-remplir, .fc-remplir *')].some(e => e.getBoundingClientRect().right > window.innerWidth + 0.5)), 'téléphone : rien ne dépasse'));
    pb.push(egal([], erreurs, 'téléphone, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },

  async saisie(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    db.preferences[0].modules = ['Objectif', 'En un coup d\'œil', 'Calendrier', 'Palmarès']; // Objectif en tête : la feuille de route porte le grand en-tête
    const pb = [];
    const PAGE = 'objectif.html', COURSE = n => 'course.html?id=' + id(n);
    const lire = async (p, sel) => p.locator(sel).inputValue();
    const poser = (p, k, v) => p.evaluate(([k, v]) => { document.getElementById('fc-' + k).value = v; }, [k, v]); // champ d'un bloc replié
    const deplier = p => p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(b => b.click()));
    const erreursChamps = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.fc-erreur')].filter(e => e.textContent).map(e => [e.id.replace(/^fc-|-err$/g, ''), e.textContent])));
    const neuve = async (largeur, page, base = db, stockage = {}) => {
      const copie = JSON.parse(JSON.stringify(base)); copie.ecritures = [];
      const o = await ouvrir(nav, page, largeur, copie, stockage, PARIS);
      o.copie = copie;
      return o;
    };

    // Lecture de l'objectif et de l'heure
    let { p, ctx } = await neuve(1200, PAGE);
    const lectures = await p.evaluate(() => {
      const f = window.mrtFicheCourse;
      return ['2:45:00', '2h45', '24500', 'finisher', 'FINISHER', 'sub 3h', 'Sub 1h30', 'sub1h5', 'SUB 45 min', 'sub 45', 'sub', 'rapide', '0', '1h70'].map(x => f.parseObjectif(x))
        .concat(['07:30', '7h30', '730', '0730', '7h', '7', '25:00', '7:75', 'tôt'].map(x => f.parseHeure(x)));
    });
    pb.push(egal(['02:45:00', '02:45:00', '02:45:00', 'Finisher', 'Finisher', 'Sub 3h', 'Sub 1h30', 'Sub 1h05', 'Sub 45 min', 'Sub 45 min', null, null, null, null,
      '07:30', '07:30', '07:30', '07:30', '07:00', '07:00', null, null, null],
      lectures.map(x => (x !== x ? null : x)), 'lecture de l\'objectif et de l\'heure'));
    await ctx.close();

    // Ajouter : formulaire vide
    let o = await neuve(1200, PAGE);
    ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="ajouter"]').count(), 'bouton « + Ajouter une course » sur la feuille de route'));
    pb.push(egal('Ajouter une course', await p.evaluate(() => document.querySelector('[data-ob="ajouter"]').innerText.trim()), 'même libellé que le Palmarès'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    const blocs = await p.evaluate(() => [...document.querySelectorAll('.fc-bloc')].map(b => b.querySelector('.fc-bloc-titre').textContent.trim() + (b.querySelector('.fc-grille').hidden ? ' (replié)' : '')));
    pb.push(egal(['Course', 'Place dans le plan', 'Inscription (replié)', 'Parcours (replié)', 'Préparation (replié)', 'Logistique (replié)', 'Résultat (replié)'], blocs, 'sept blocs, cinq repliés (ordre de lecture de la page : Dossard, Parcours, Préparation, Logistique, puis Résultat, qui ne porte que « Résultats en direct » avant la course)'));
    pb.push(egal([['Résultats en direct'], ['course', 'lien']], [await p.evaluate(() => [...document.querySelector('[data-bloc="resultat"]').nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.trim())),
      await p.evaluate(() => ['description', 'lien'].map(k => document.getElementById('fc-' + k)).map(e => e.closest('.fc-grille').previousElementSibling.dataset.bloc).slice(0, 1).concat('lien'))], 'à venir : « Résultats en direct » dans Résultat ; plus de bloc Liens'));
    pb.push(egal(true, await p.evaluate(() => document.getElementById('fc-lien').getBoundingClientRect().top >= document.getElementById('fc-description').getBoundingClientRect().bottom && document.getElementById('fc-lien').closest('.fc-grille').previousElementSibling.dataset.bloc === 'course'), '« Site officiel » dans Course, sous la description'));
    pb.push(egal(['Choisis d\'abord la date et le format.', 0], await p.evaluate(() => [document.querySelector('.fc-prep-note').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'nouvelle course : date et format d\'abord, aucun bouton de réglage du plan'));
    pb.push(egal(['Ajouter une course', 'confirmee', '', true], [await p.textContent('#fc-titre'), await lire(p, '#fc-statut'), await lire(p, '#fc-role'), await p.locator('[data-champ="groupe_options"]').isHidden()], 'ajout : titre, statut proposé, sans rôle (il se donne dans Mon plan), groupe caché'));
    pb.push(egal('ex. 07:30', await p.getAttribute('#fc-heure', 'placeholder'), 'exemple dans l\'heure'));
    // Enregistrer sans rien : champs obligatoires
    await p.click('.fc-plein');
    pb.push(egal({ course: 'Champ obligatoire.', date: 'Champ obligatoire.', type: 'Choisis un type.', format: 'Champ obligatoire.', distance: 'Champ obligatoire.' }, await erreursChamps(p), 'obligatoires : date, course, type, format, distance'));
    // Étoiles en Accent, légende ; une course à surveiller n'a besoin ni de date ni de distance (étoiles retirées)
    const etoiles = () => p.evaluate(() => ({ couleur: getComputedStyle(document.querySelector('.fc-oblig')).color !== getComputedStyle(document.querySelector('.fc-champ label')).color,
      legende: document.querySelectorAll('.fc-legende').length, enExposant: parseFloat(getComputedStyle(document.querySelector('.fc-oblig')).verticalAlign) > 0,
      visibles: ['course', 'date', 'type', 'format', 'distance'].map(k => !document.querySelector('label[for="fc-' + k + '"] .fc-oblig').hidden) }));
    pb.push(egal({ couleur: true, legende: 0, enExposant: true, visibles: [true, true, true, true, true] }, await etoiles(), 'étoile en Accent et en exposant, sans légende, sur les cinq champs obligatoires'));
    await p.selectOption('#fc-statut', 'a_surveiller');
    pb.push(egal([true, false, true, true, false], (await etoiles()).visibles, 'À surveiller : plus d\'étoile sur la date ni la distance'));
    await p.selectOption('#fc-statut', 'confirmee'); await p.click('.fc-plein');
    pb.push(egal(0, o.copie.ecritures.length, 'rien d\'écrit tant qu\'une erreur demeure'));
    // Ordre : course, parcours, date (avec « Date approximative »), heure
    pb.push(egal(['course', 'parcours', 'date', 'date_approx', 'heure', 'lieu'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')[0].querySelectorAll('[data-k]')].slice(0, 6).map(e => e.dataset.k)), 'ordre : course, parcours, date, jour inconnu, heure'));
    // Contrôles de saisie
    await p.fill('#fc-date', '2026-01-01');
    await p.fill('#fc-course', 'Trail des Lacs');
    await p.selectOption('#fc-type', 'trail');
    await p.fill('#fc-distance', '28,5');
    await p.fill('#fc-heure', '25h');
    await deplier(p); await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', 'rapide');
    await poser(p, 'lien', 'www.exemple.org');
    await poser(p, 'prix', '-3');
    await p.click('.fc-plein');
    const e1 = await erreursChamps(p);
    pb.push(egal({ date: 'La date d\'une course à venir ne peut pas être dans le passé.', heure: 'Heure illisible (ex. 07:30).', objectif: 'Durée illisible (ex. 3h, 1h30 ou 45 min).',
      lien: 'Lien attendu : il commence par http:// ou https://.', prix: 'Le nombre doit être positif.' }, { date: e1.date, heure: e1.heure, objectif: e1.objectif, lien: e1.lien, prix: e1.prix }, 'contrôles : date passée, heure, objectif, lien, prix'));
    pb.push(egal([true, true, true], await p.evaluate(() => ['objectif', 'lien', 'prix'].map(k => !document.getElementById('fc-' + k).closest('.fc-grille').hidden)), 'un champ en erreur déplie son bloc'));
    pb.push(egal('trail_court', await lire(p, '#fc-format'), 'trail : format proposé d\'après la distance'));
    // Description : 1 000 caractères
    await p.fill('#fc-description', 'x'.repeat(1000));
    pb.push(egal('1000 / 1 000', (await p.textContent('[data-compte="description"]')).replace(/[  ]/g, ' ').replace(/^1 000/, '1000'), 'compteur de description'));
    // Précisions : 100 caractères au plus, compteur
    await deplier(p);
    await p.fill('#fc-objectif_precisions', 'y'.repeat(120));
    pb.push(egal([100, '100 / 100', 'Précisions sur l\'objectif'], [(await lire(p, '#fc-objectif_precisions')).length, await p.textContent('[data-compte="objectif_precisions"]'),
      await p.evaluate(() => document.getElementById('fc-objectif').closest('.fc-champ').nextElementSibling.querySelector('label').textContent)], 'précisions : sous Objectif, limitées à 100 caractères'));
    // Saisie valide
    await p.fill('#fc-objectif_precisions', 'Partir prudemment.');
    await p.fill('#fc-description', 'Boucle autour du lac.');
    await p.fill('#fc-date', '2027-06-12');
    await p.fill('#fc-heure', '730');
    await p.fill('#fc-parcours', 'La Grande Boucle');
    await p.fill('#fc-lieu', 'Mont-Clair');
    await p.fill('#fc-dplus', '1200');
    await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', '6h');
    await p.fill('#fc-lien', 'https://example.org/lacs');
    await p.fill('#fc-prix', '45,5');
    await p.check('#fc-inscrit');
    await p.fill('#fc-dossard', '77');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w = o.copie.ecritures[0];
    pb.push(egal(['POST', 'courses'], [w.methode, w.table], 'enregistrement : une insertion'));
    pb.push(egal({ etat: 'a_venir', course: 'Trail des Lacs', parcours: 'La Grande Boucle', date: '2027-06-12', date_approx: false, heure: '07:30', lieu: 'Mont-Clair', format: 'trail_court',
      distance: 28.5, dplus: 1200, dmoins: null, objectif: 'Sub 6h', objectif_precisions: 'Partir prudemment.', description: 'Boucle autour du lac.', lien: 'https://example.org/lacs', statut: 'confirmee', role: null, groupe_options: null,
      ouverture_inscriptions: null, ouverture_heure: null, ouverture_approx: false, inscrit: true, inscription: null, dossard: '77', prix: 45.5, ravitaillements_km: null, strategie: null, pourquoi: null, logistique: null, lien_resultats: null, id: w.corps.id }, w.corps, 'enregistrement : champs écrits'));
    await ctx.close();

    // Nouvelle course : plan réglé avant d'enregistrer ; date approximative : pas de plan
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Trail des Lacs'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court');
    pb.push(egal(['Hors plan · semaine 5 sur 16 de la préparation de Trail des Crêtes', 0], await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'nouvelle course : place dans la saison tirée de la date, du format et du rôle saisis, sans bouton de réglage'));
    await p.check('#fc-date_approx');
    pb.push(egal(['Hors plan · semaine 4 sur 16 de la préparation de Trail des Crêtes', 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.', 0],
      await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelector('.fc-prep-note').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'date approximative : plan prévu pour le début du mois, mentionné'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(0, o.copie.ecritures.length, 'nouvelle course : rien d\'écrit avant « Enregistrer »'));
    await p.fill('#fc-distance', '30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    {
      const cw = o.copie.ecritures[0];
      pb.push(egal([1, ['POST', 'courses'], true, null], [o.copie.ecritures.length, [cw.methode, cw.table], /^[0-9a-f-]{36}$/.test(cw.corps.id), cw.corps.prepa_semaines],
        'nouvelle course : une seule écriture, la course ; durée du format (les phases se règlent ensuite dans Mon plan)'));
    }
    await ctx.close();

    // Date approximative décochée : le plan se recalcule sur la date précise, phases remises aux règles
    o = await neuve(1200, COURSE(6)); ({ p, ctx } = o);
    pb.push(egal(true, (await p.textContent('#preparation')).replace(/\u00a0/g, ' ').includes('Date approximative : préparation prévue pour le début du mois'), 'page d\'une course à date approximative : mention dans la rubrique Préparation'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Préparatoire (option) · semaine 8 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 26 jours de récupération', await p.textContent('.fc-prep .cal-plan-dates'), 'formulaire, date approximative : plan au 1er du mois'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-07-04'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(['Préparatoire (option) · semaine 8 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 26 jours de récupération', 0], [await p.textContent('.fc-prep .cal-plan-dates'), await p.locator('.fc-prep-note', { hasText: 'Date approximative' }).count()], 'case décochée : plan recalculé sur la date précise, sans mention'));
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([['PATCH', 'courses'], ['DELETE', 'plan_semaines', '?course=eq.' + id(6)]], o.copie.ecritures.slice(0, 2).map((e, i) => i ? [e.methode, e.table, e.filtres] : [e.methode, e.table]), 'enregistrement : date précise, phases du plan remises aux règles'));
    await ctx.close();

    // Date précise changée : les phases réglées à la main suivent la course (même numéro de semaine du plan)
    {
      const avecModif = JSON.parse(JSON.stringify(db));
      avecModif.plan_semaines = [{ id: 'ps1', utilisateur: db.profils[0].id, course: id(3), lundi: '2026-12-14', phase: 'deload' }]; // semaine 5 sur 16
      o = await neuve(1200, COURSE(3), avecModif); ({ p, ctx } = o);
      await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
      await p.fill('#fc-date', '2027-03-14'); await p.dispatchEvent('#fc-date', 'change');
      pb.push(egal('Objectif · préparation de 16 semaines, du lun. 23 nov. 2026 au dim. 14 mars 2027', await p.textContent('.fc-prep .cal-plan-dates'), 'date décalée d\'une semaine : saison décalée'));
      await p.click('.fc-plein');
      await p.waitForSelector('.fc-fiche', { state: 'detached' });
      pb.push(egal([['PATCH', 'courses'], ['DELETE', 'plan_semaines'], ['POST', 'plan_semaines', [{ course: id(3), lundi: '2026-12-21', phase: 'deload' }]]],
        o.copie.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, e.corps] : [e.methode, e.table]), 'enregistrement : la semaine 5 réglée à la main suit la course'));
      await ctx.close();
    }

    // Option : groupe d'options, existant ou nouveau ; jour inconnu
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.selectOption('#fc-statut', 'option');
    await deplier(p);
    pb.push(egal(['—', 'Printemps 2027', 'Nouveau groupe…'], await p.locator('#fc-groupe_options option').allTextContents(), 'groupes proposés'));
    pb.push(egal(true, await p.locator('[data-champ="groupe_options"]').isVisible(), 'groupe visible pour une Option'));
    await p.selectOption('#fc-groupe_options', '__nouveau__');
    pb.push(egal(true, await p.locator('#fc-groupe_nouveau').isVisible(), 'nouveau groupe : champ de nom'));
    await p.click('.fc-plein');
    pb.push(egal('Écris le nom du groupe.', (await erreursChamps(p)).groupe_options, 'nouveau groupe sans nom'));
    await p.fill('#fc-groupe_nouveau', 'Automne 2027');
    await p.fill('#fc-course', 'Trail des Vignes');
    await p.selectOption('#fc-type', 'route');
    await p.selectOption('#fc-format', { index: 1 });
    await p.check('#fc-date_approx');
    pb.push(egal('month', await p.getAttribute('#fc-date', 'type'), 'jour inconnu : la date devient un mois'));
    await p.fill('#fc-date', '2027-10');
    pb.push(egal(true, await p.isDisabled('#fc-heure'), 'mois seul : l\'heure de départ est grisée'));
    await p.fill('#fc-distance', '42');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w2 = o.copie.ecritures[0].corps;
    pb.push(egal(['2027-10-01', true, null, 'option', 'Automne 2027'], [w2.date, w2.date_approx, w2.heure, w2.statut, w2.groupe_options], 'mois seul, option, nouveau groupe'));
    await ctx.close();

    // À surveiller : date facultative
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.selectOption('#fc-statut', 'a_surveiller');
    await p.fill('#fc-course', 'Trail des Sommets bis');
    await p.selectOption('#fc-type', 'trail');
    await p.selectOption('#fc-format', { index: 1 });
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([null, 'a_surveiller'], [o.copie.ecritures[0].corps.date, o.copie.ecritures[0].corps.statut], 'à surveiller sans date'));
    await ctx.close();

    // Modifier : formulaire rempli, tous les blocs ouverts
    o = await neuve(1200, COURSE(3)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Modifier la course', await p.textContent('#fc-titre'), 'modifier : titre'));
    pb.push(egal(['Inscription', 'Parcours', 'Préparation', 'Logistique', 'Résultat'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')].filter(g => g.hidden).map(g => g.previousElementSibling.textContent)), 'modifier : comme pour une nouvelle course, Course et Place dans le plan ouverts, les autres repliés'));
    // Bloc Préparation : résumé du plan et frise, sans réglage (le plan se règle dans la page Préparation)
    pb.push(egal(['Objectif · préparation de 16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027', 1, 0], await p.evaluate(() => {
      const z = document.querySelector('.fc-prep');
      return [z.querySelector('.cal-plan-dates').textContent, z.querySelectorAll('.cal-frise').length, z.querySelectorAll('button').length];
    }), 'modifier : place dans la saison (Objectif : sa saison et sa frise) en tête du bloc Préparation, en lecture'));
    await ouvrirBloc(p, 'preparation');
    const rempli = await p.evaluate(() => Object.fromEntries(['date', 'heure', 'course', 'lieu', 'format', 'dplus', 'dmoins', 'role', 'objectif', 'dossard', 'prix', 'logistique', 'lien', 'inscription', 'lien_resultats'].map(k => [k, document.getElementById('fc-' + k).value])));
    pb.push(egal({ date: '2027-03-07', heure: '07:30', course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'trail_long', dplus: '2100', dmoins: '2100', role: 'objectif', objectif: '06:30:00',
      dossard: '1287', prix: '58', logistique: 'Navette depuis le stade à 6 h 30.', lien: 'https://example.org/gorges', inscription: 'https://example.org/gorges/inscription', lien_resultats: 'https://example.org/gorges/resultats' }, rempli, 'modifier : valeurs de la course'));
    pb.push(egal(true, await p.locator('#fc-inscrit').isChecked(), 'modifier : inscrit coché'));
    await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', '6h30');
    await p.fill('#fc-date', '2027-03-08');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const m = o.copie.ecritures[0];
    pb.push(egal(['PATCH', '?id=eq.' + id(3), 'Sub 6h30', '2027-03-08'], [m.methode, m.filtres, m.corps.objectif, m.corps.date], 'modifier : mise à jour de la course'));
    pb.push(egal(true, !m.corps.etat, 'modifier : l\'état n\'est pas touché'));
    pb.push(egal([false, 1], [m.corps.prepa_semaines !== undefined, o.copie.ecritures.length], 'modifier : une seule écriture, durée et phases du plan non touchées'));
    // Pas de bouton « Retenir » ni « Marquer » sur une confirmée à venir
    pb.push(egal(0, await p.locator('[data-ob="retenir"], [data-ob="marquer"]').count(), 'confirmée à venir : ni Retenir ni Marquer'));
    await ctx.close();

    // Supprimer
    o = await neuve(1200, COURSE(2)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await p.click('[data-fc="supprimer"]');
    pb.push(egal([true, 'Supprimer'], await p.evaluate(() => [document.querySelector('.mrt-dialogue-cadre').classList.contains('is-danger'), document.querySelector('.mrt-dialogue [data-r="oui"]').textContent]),
      'suppression : confirmation du site, encadré d\'Alerte, action « Supprimer »'));
    pb.push(egal('Supprimer cette course ? Cette action est définitive.', await repondre(p, false), 'suppression : confirmation'));
    pb.push(egal(0, o.copie.ecritures.length, 'suppression annulée : rien d\'écrit'));
    await p.click('[data-fc="supprimer"]');
    await repondre(p, true);
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['DELETE', '?id=eq.' + id(2)], [o.copie.ecritures[0].methode, o.copie.ecritures[0].filtres], 'suppression : ligne effacée, retour à la feuille de route'));
    await ctx.close();

    // Retenir une course d'un groupe d'options
    o = await neuve(1200, COURSE(4)); ({ p, ctx } = o);
    await surDialogue(p, () => true);
    await p.click('[data-ob="retenir"]');
    await p.waitForTimeout(300);
    const ecr = o.copie.ecritures.map(x => x.methode + ' ' + x.filtres + ' ' + JSON.stringify(x.corps));
    pb.push(egal(['PATCH ?groupe_options=eq.Printemps+2027&statut=eq.option&id=neq.' + id(4) + ' {"statut":"a_surveiller","groupe_options":null}',
      'PATCH ?id=eq.' + id(4) + ' {"statut":"confirmee","groupe_options":null}'], ecr, 'retenir : les autres à surveiller, le candidat confirmé'));
    await ctx.close();

    // Marquer comme courue : à partir du jour de la course
    const jour = JSON.parse(JSON.stringify(db));
    jour.courses.find(c => c.id === id(1)).date = '2026-10-20';
    o = await neuve(1200, COURSE(1), jour); ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="marquer"]').count(), 'jour de la course : Marquer comme courue'));
    await p.click('[data-ob="marquer"]');
    pb.push(egal(['Marquer comme courue', ['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], 0], [await p.textContent('#fc-titre'),
      await p.locator('.fc-bloc-titre').allTextContents().then(t => t.map(x => x.trim())), await p.locator('[data-fc="supprimer"]').count()], 'marquer : fiche d\'une course courue, sans Supprimer'));
    pb.push(egal(['2026-10-20', 'Trail du Lac'], [await lire(p, '#fc-date'), await lire(p, '#fc-course')], 'marquer : pré-rempli'));
    await p.fill('#fc-temps', '2:40:00');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal(['PATCH', 'courue', 9600], [o.copie.ecritures[0].methode, o.copie.ecritures[0].corps.etat, o.copie.ecritures[0].corps.temps], 'marquer : la course passe à l\'état Courue'));
    await ctx.close();

    // Course confirmée passée, pas encore courue : elle reste sur la feuille de route
    const passee = JSON.parse(JSON.stringify(db));
    passee.courses.find(c => c.id === id(1)).date = '2026-10-10';
    passee.courses.find(c => c.id === id(4)).date = '2026-10-11'; // option passée : absente du groupe
    o = await neuve(1200, PAGE, passee); ({ p, ctx } = o);
    const noms = await p.evaluate(() => [...document.querySelectorAll('.ob-et > .ob-carte > .ob-nom, .ob-et > .ob-carte > h3')].map(e => e.textContent.replace(/[  ]/g, ' ').replace(/\s*↗/, '').trim()));
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Printemps 2027', 'Trail de la Forêt', 'Trail des Crêtes'], noms, 'passée : en tête de la feuille de route'));
    pb.push(egal('Course courue', await p.locator('.ob-et').first().locator('.ob-cpt').textContent(), 'passée : compteur Course courue'));
    pb.push(egal('4 courses', (await p.locator('.mrt-stat-val').last().textContent()).trim(), 'passée : l\'en-tête ne la compte pas'));
    await ctx.close();
    o = await neuve(1200, COURSE(1), passee); ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="marquer"]').count(), 'passée : Marquer comme courue sur sa page'));
    await ctx.close();

    // Panne d'enregistrement
    const panne = JSON.parse(JSON.stringify(db)); panne.panne = true;
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, panne, {}, PARIS));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'X'); await p.fill('#fc-date', '2027-06-12'); await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', { index: 1 }); await p.fill('#fc-distance', '30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-msg:has-text("Enregistrement impossible")');
    pb.push(egal(1, await p.locator('.fc-fiche').count(), 'panne : le formulaire reste ouvert'));
    await ctx.close();

    // Palmarès : la fiche unique (§ 3.8), blocs d'une course courue ; classements dans Résultat ; ni Vitesse, ni Statut ; DNF vide le temps et l'allure
    const pal = JSON.parse(JSON.stringify(db)); pal.ecritures = [];
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, pal));
    await p.click('[data-act="add"]');
    const labels = sel => p.evaluate(s => [...document.querySelector(s).nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()), sel);
    pb.push(egal(['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], (await p.locator('.fc-bloc-titre').allTextContents()).map(x => x.trim()), 'Palmarès : blocs de la fiche unique'),
      egal(['Course', 'Parcours', 'Date', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions sur l\'objectif', 'Description', 'Site officiel'], await labels('[data-bloc="course"]'), 'Palmarès : bloc Course, dans l\'ordre'),
      egal([['Place au général', 2], ['Effectif du général', 2], ['Catégorie', 3], ['Place en catégorie', 3], ['Effectif de la catégorie', 3], ['Place par sexe', 2], ['Effectif par sexe', 2]],
        await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; g.hidden = false; const l = g.getBoundingClientRect().width;
          return [...g.children].slice(1, 8).map(e => [e.querySelector(':scope > label').textContent.trim(), Math.round(l / e.getBoundingClientRect().width)]); }),
        'Palmarès : classements dans Résultat, général et sexe sur toute la largeur (deux champs), catégorie à gauche de la place en catégorie (trois champs)'),
      egal(['Temps', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Allure moyenne (par km)', 'FC moyenne (bpm)'], await labels('[data-bloc="montre"]'), 'Palmarès : Montre, temps et distance, D+ et D−, allure et FC'),
      egal(['M0', 'M10', 15], await p.evaluate(() => { const o = [...document.querySelectorAll('#fc-categorie option')].map(x => x.value).filter(Boolean); return [o[4], o[14], o.length]; }), 'Palmarès : catégories FFA (CA, JU, ES, SE, M0 à M10)'),
      egal(['Temps', 'DNF', 'Allure moyenne (par km)', 'Place au général', 'Effectif du général', 'Catégorie', 'Place en catégorie', 'Effectif de la catégorie', 'Place par sexe', 'Effectif par sexe', 'Résultats en direct'],
        await labels('[data-bloc="resultat"]'), 'Palmarès : bloc Résultat (résultat puis classements), sans vitesse'),
      egal(0, await p.locator('#fc-vitesse, #fc-montre_vitesse, #fc-statut, #fc-date_approx, #fc-inscrit').count(), 'Palmarès : ni Vitesse, ni Statut, ni date approximative, ni Inscrit'),
      egal('fc-course', await p.evaluate(() => document.activeElement.id), 'Palmarès : curseur dans Course'));
    const pos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dossardDansDossard: document.getElementById('fc-dossard').closest('.fc-grille').previousElementSibling.dataset.bloc === 'dossard',
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2,
        description: r('fc-description').top > r('fc-dmoins').bottom }; });
    pb.push(egal({ dossardDansDossard: true, distanceSeule: true, dplusDmoins: true, description: true }, pos, 'Palmarès : dossard dans le bloc Dossard, distance seule, D+ et D− côte à côte, description dessous'));
    await p.fill('#fc-temps', '49:18'); await p.fill('#fc-allure', '4:56');
    pb.push(egal(true, await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return Math.abs(r('fc-temps').top - r('fc-allure').top) < 2 && r('fc-dnf').left > r('fc-temps').right && r('fc-allure').left > r('fc-dnf').right; }), 'Résultat : Temps, DNF et Allure moyenne sur la même ligne, dans cet ordre'));
    await p.check('#fc-dnf');
    pb.push(egal(['', '', true, true], [await p.inputValue('#fc-temps'), await p.inputValue('#fc-allure'), await p.isDisabled('#fc-temps'), await p.isDisabled('#fc-allure')], 'DNF coché : temps et allure vidés et grisés'));
    pb.push(egal(false, await p.evaluate(() => !document.querySelector('label[for="fc-temps"] .fc-oblig').hidden), 'DNF coché : l\'étoile du temps disparaît'));
    await p.uncheck('#fc-dnf');
    pb.push(egal(true, await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; return Math.abs(document.getElementById('fc-lien_resultats').getBoundingClientRect().width - g.getBoundingClientRect().width) < 2; }), '« Résultats en direct » : toute la largeur du bloc Résultat'));
    await p.fill('#fc-course', 'Course d\'essai DNF'); await p.fill('#fc-date', '2026-10-11'); await p.selectOption('#fc-type', 'route'); await p.selectOption('#fc-format', 'route_10km'); await p.fill('#fc-distance', '10');
    await p.fill('#fc-temps', '50:00'); await p.fill('#fc-allure', '5:00'); await p.click('.fc-plein');
    await p.waitForFunction(() => !document.querySelector('.fc-fiche'));
    const ins = pal.ecritures.find(e => e.methode === 'POST' && e.table === 'courses');
    pb.push(egal({ allure: 300, vitesse: 12, etat: 'courue', objectif: null }, ins && { allure: ins.corps.allure, vitesse: ins.corps.vitesse, etat: ins.corps.etat, objectif: ins.corps.objectif }, 'enregistrement : vitesse tirée de l\'allure moyenne (5:00 → 12 km/h), état Courue, objectif vide'));
    await ctx.close();

    // Objectif : la distance seule sur sa ligne, D+ et D− dessous côte à côte, puis la description avec son exemple
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    const ordre = await p.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      return { labels: [...document.querySelector('[data-bloc="course"]').nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()),
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2 && r('fc-dmoins').left > r('fc-dplus').right,
        descriptionDessous: r('fc-description').top > r('fc-dmoins').bottom, exemple: document.getElementById('fc-description').placeholder };
    });
    pb.push(egal(['Course', 'Parcours', 'Date', 'Seul le mois est connu', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions sur l\'objectif', 'Description', 'Site officiel'], ordre.labels, 'Objectif : ordre du bloc Course'),
      egal([true, true, true, true], [ordre.distanceSeule, ordre.dplusDmoins, ordre.descriptionDessous, /^Texte libre/.test(ordre.exemple)], 'Objectif : distance seule, D+ et D− côte à côte, description dessous avec un exemple de texte libre'));
    await p.click('[data-bloc="dossard"]');
    const dos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { ligne1: Math.abs(r('fc-ouverture_inscriptions').top - r('fc-ouverture_heure').top) < 6 && r('fc-ouverture_heure').left > r('fc-ouverture_inscriptions').right
          && r('fc-ouverture_approx').left > r('fc-ouverture_heure').right && Math.abs(r('fc-ouverture_approx').top - r('fc-ouverture_inscriptions').top) < r('fc-ouverture_inscriptions').height
          && r('fc-inscrit').top > r('fc-ouverture_inscriptions').bottom,
        ligne2: Math.abs(r('fc-dossard').top - r('fc-prix').top) < 2 && r('fc-dossard').top > r('fc-ouverture_inscriptions').bottom,
        site: r('fc-inscription').top > r('fc-ouverture_inscriptions').bottom && r('fc-dossard').top > r('fc-inscription').bottom, grise: document.getElementById('fc-dossard').disabled }; });
    pb.push(egal({ ligne1: true, ligne2: true, site: true, grise: true }, dos, 'Objectif : Dossard (ouverture, heure et « Seul le mois est connu » sur une ligne, puis Inscrit, site d\'inscription, numéro et prix) ; numéro grisé tant que non inscrit'));
    await ouvrirBloc(p, 'dossard');
    await p.check('#fc-inscrit');
    pb.push(egal(false, await p.isDisabled('#fc-dossard'), 'Inscrit coché : le numéro de dossard se saisit'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-formulaire.png') });
    await ctx.close();

    // Téléphone
    ({ p, ctx } = await ouvrir(nav, PAGE, 390, db, {}, { ...PARIS, mobile: true }));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(b => b.click()));
    // Écran tactile : champs à 16 px au moins, sinon l'iPhone zoome sur le champ touché et le formulaire est coupé.
    pb.push(egal([], await p.evaluate(() => [...document.querySelectorAll('.fc-fiche input:not([type="checkbox"]), .fc-fiche select, .fc-fiche textarea')]
      .filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id)), 'téléphone : aucun champ sous 16 px (pas de zoom de l\'iPhone)'));
    const ligne = await p.evaluate(() => { const d = document.getElementById('fc-date').getBoundingClientRect(), c = document.getElementById('fc-date_approx').getBoundingClientRect();
      return { memeLigne: Math.abs((d.top + d.bottom) / 2 - (c.top + c.bottom) / 2) < d.height, aDroite: c.left >= d.right }; });
    pb.push(egal({ memeLigne: true, aDroite: true }, ligne, 'téléphone : « Seul le mois est connu » à droite de la date'));
    // Téléphone : ouverture des inscriptions sur sa ligne, puis l'heure et la case ensemble dessous ; la liste de l'objectif au-dessus de sa durée
    await p.evaluate(() => { const g = document.getElementById('fc-ouverture_inscriptions').closest('.fc-grille'); if (g.hidden) document.querySelector('[data-bloc="dossard"]').click(); });
    const ouv = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dateSeule: r('fc-ouverture_heure').top > r('fc-ouverture_inscriptions').bottom, heureEtCase: r('fc-ouverture_approx').left > r('fc-ouverture_heure').right && Math.abs(r('fc-ouverture_approx').top - r('fc-ouverture_heure').top) < r('fc-ouverture_heure').height,
        rien: document.documentElement.scrollWidth <= innerWidth }; });
    pb.push(egal({ dateSeule: true, heureEtCase: true, rien: true }, ouv, 'téléphone : ouverture des inscriptions seule, puis l\'heure et « Seul le mois est connu » ensemble ; rien ne dépasse'));
    pb.push(egal(false, await p.evaluate(() => document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth), 'téléphone : le formulaire ne déborde pas'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-formulaire-telephone.png') });
    await ctx.close();

    // Ordinateur : capture
    if (CAPTURES) {
      ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
      await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
      await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-formulaire.png') });
      await ctx.close();
    }

    // Site partagé en lecture seule : ni « + », ni « Modifier »
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal(0, await p.locator('[data-ob]').count(), 'lecture seule : pas de « + »'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, COURSE(4), 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal(0, await p.locator('[data-ob]:not([data-ob="fermer"]):not([data-ob="agenda"])').count(), 'lecture seule : ni Modifier ni Retenir'));
    await ctx.close();
    return pb;
  },

  // Spécification du Calendrier, § 10 : vue Année (la grille ; bouton « Plan » : barres aux couleurs des phases).
  async calendrierAnnee(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const GORGES = id(3);
    const moi = db.profils[0].id;
    db.seances = [
      { id: 'se-1', utilisateur: moi, date: '2026-10-19', type: 'renfo', libelle: 'Gainage 30 min', faite: true, course: null },
      { id: 'se-2', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: '8×400 m', faite: false, course: null },
      { id: 'se-3', utilisateur: moi, date: '2026-10-20', type: 'renfo', libelle: 'Gainage 20 min', faite: false, course: null }];
    db.courses.push({ id: '00000000-0000-0000-0002-000000000098', utilisateur: db.profils[0].id, course: 'Option passée', date: '2026-10-10', format: 'trail_court',
      statut: 'option', etat: 'a_venir', role: 'preparatoire', date_approx: false });
    const lire = p => p.evaluate(() => {
      const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      // Phase d'un jour (classe ph-…) et liseré (pseudo-élément de la case) ; fond d'une case.
      const phase = j => ((document.querySelector('.cal-a-j[data-jour="' + j + '"]') || {}).className || '').split(' ').find(c => c.startsWith('ph-')) || null;
      const lisere = j => { const e = document.querySelector('.cal-a-j[data-jour="' + j + '"]'); return e ? [getComputedStyle(e, '::before').width, getComputedStyle(e, '::before').backgroundColor] : null; };
      return {
        vue: [document.querySelector('[data-menu]').textContent.trim(), [...document.querySelectorAll('.cal-menu a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))],
        titre: t('.cal-titre'), voisins: [...document.querySelectorAll('.cal-voisin-txt')].map(e => e.textContent), gorges: (e => e && getComputedStyle(e).backgroundColor)(document.querySelector('.cal-a-j[data-jour="2027-03-07"]')),
        blocs: [...document.querySelectorAll('.cal-a-bloc')].map(b => b.querySelectorAll('.cal-a-mois').length),
        mois: [...document.querySelectorAll('.cal-a-mois')].map(m => m.textContent.replace(/\s+/g, ' ').trim()),
        courses: [...document.querySelectorAll('.cal-a-j[data-course]')].map(j => [j.querySelector('.cal-a-nom').textContent, [...j.classList].find(c => /^c-|^courue$/.test(c))]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
        seances: ['2026-10-19', '2026-10-20', '2026-10-21'].map(j => { const e = document.querySelector('.cal-a-j[data-jour="' + j + '"] .cal-a-se'); return e ? [[...e.querySelectorAll('.n-long')].map(x => x.textContent).join(' · '), e.classList.contains('faite')] : null; }),
        nbPhases: document.querySelectorAll('.cal-a-j[class*="ph-"]').length, barres: document.querySelectorAll('.cal-a-barre').length,
        p1: phase('2026-10-01'), p12: phase('2026-10-12'), p20: phase('2026-10-20'), p0116: phase('2026-11-16'), p0208: phase('2027-02-08'), l12: lisere('2026-12-08'), l20: lisere('2027-01-12'), lGorges: lisere('2027-03-07'),
        titre20: (document.querySelector('.cal-a-j[data-jour="2026-10-20"]') || {}).title || '',
        legende: [...document.querySelectorAll('.cal-legende > span')].map(e => e.classList.contains('cal-groupe') ? [e.querySelector('b').textContent, ...[...e.querySelectorAll(':scope > span')].map(x => x.textContent)] : e.textContent),
        plan: document.querySelector('[data-plan]').getAttribute('aria-pressed') === 'true',
        auj: [...document.querySelectorAll('.cal-a-j.auj')].map(j => j.dataset.jour),
        // Jours d'octobre : initiale et numéro à gauche de la case, samedi et dimanche (we), filet sous le dimanche (dim).
        jours10: ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05'].map(j => { const c = document.querySelector('.cal-a-j[data-jour="' + j + '"]'); return c && [c.previousElementSibling.textContent, c.classList.contains('we'), c.classList.contains('dim')]; }),
        moisCourant: [...document.querySelectorAll('.cal-a-mois.is-courant')].map(m => m.textContent.replace(/\s+/g, ' ').trim()),
        aujN: (document.querySelector('.cal-a-n.auj') || {}).textContent || null,
        // Un jour passé garde le fond d'un jour à venir (jeudis 15 et 22) ; un samedi est plus foncé.
        fonds: (f => [f('2026-10-15') === f('2026-10-22'), f('2026-10-17') !== f('2026-10-15')])(j => (e => e && getComputedStyle(e).backgroundColor)(document.querySelector('.cal-a-j[data-jour="' + j + '"]'))),
        texte: document.querySelector('main').textContent,
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    const COURSES = [['Corrida de Noël', 'c-route-v'], ['Semi de San Sebastián', 'courue'], ['Trail des Gorges', 'c-trail-v'], ['Trail du Lac', 'c-trail-v']];
    const LEGENDE = []; // bouton « Légende » éteint par défaut : aucune légende
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#annee', w, db, {}, PARIS);
      const r = await lire(p), tel = w < 600;
      pb.push(
        egal([['6 mois', ['Semaine', 'Mois', '3 mois', '6 mois *', 'Année']], 'Octobre 2026 – mars 2027', ['avr.–sept. 26', 'avr.–sept. 27'], null], [r.vue, r.titre, r.voisins, r.p20], nom + ', menu « Vue » sur 6 mois (par défaut), voisines ; Plan éteint : pas de fond de phase'),
        egal([tel ? [3, 3] : [6], ['oct. 26', 'nov.', 'déc.', 'janv. 27', 'févr.', 'mars']], [r.blocs, r.mois], nom + ', ' + (tel ? 'deux blocs de trois mois' : 'un bloc de six mois')),
        egal(COURSES, r.courses, nom + ', courses écrites dans leur case, à leur couleur'),
        egal([0, 0, false, LEGENDE], [r.nbPhases, r.barres, r.plan, r.legende], nom + ', bouton « Plan » éteint par défaut : ni fond de phase ni légende des phases'),
        egal([['Gainage 30 min', true], ['8×400 m · Gainage 20 min', false], null], r.seances, nom + ', nom des séances du jour (et non leur type) (barrées quand elles sont faites), rien un jour sans séance'),
        egal([['2026-10-20'], 'M20'], [r.auj, r.aujN], nom + ', aujourd\'hui repéré : case cerclée, numéro dans un rond'),
        egal([[['J1', false, false], ['S3', true, false], ['D4', true, true], ['L5', false, false]], ['oct. 26'], [true, true]], [r.jours10, r.moisCourant, r.fonds],
          nom + ', chaque mois a ses jours (initiale, numéro), samedi et dimanche plus foncés, filet sous le dimanche, mois en cours repéré ; jour passé : même fond'),
        egal(false, /Cross des Collines|Trail des Sommets|Option passée/.test(r.texte), nom + ', abandonnée, à surveiller et option passée absentes'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      await ctx.close();
    }
    // Plan : le fond de chaque jour à la couleur de la phase de sa semaine, avec un liseré à gauche ; pas de barres.
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx } = await ouvrir(nav, 'calendrier.html#annee', w, db, { 'mrt-calendrier-phases': '1' }, PARIS);
      const r = await lire(p);
      pb.push(
        egal([true, 136, 0, [null, null, null, 'ph-base', 'ph-developpement']], [r.plan, r.nbPhases, r.barres, [r.p1, r.p12, r.p20, r.p0116, r.p0208]],
          nom + ', bouton « Plan » enfoncé (retenu sur l\'appareil) : le fond de phase du plan de saison (Entretien sans fond jusqu\'au 15 novembre, saison du Trail des Gorges dès le 16), pas de barres'),
        egal([['3px', 'rgb(143, 168, 201)'], ['3px', 'rgb(230, 184, 77)'], ['3px', 'rgb(180, 142, 240)'], 'rgb(217, 88, 42)', true],
          [r.l12, r.l20, r.lGorges, r.gorges, r.titre20.endsWith('aujourd\'hui · Course à pied 8×400 m · Renforcement Gainage 20 min')], nom + ', liseré de 3 px de la couleur pleine de la phase (deload le 8 décembre, développement le 12 janvier, affûtage le 7 mars), une course garde sa couleur, infobulle : les séances (Entretien : pas de phase)'),
        egal(LEGENDE.concat([['Phases', 'Base', 'Développement', 'Affûtage', 'Allègement', 'Récupération', 'Entretien']]), r.legende, nom + ', légende des phases, Récupération et Entretien comprises'),
        egal(false, r.debordement, nom + ', Plan, débordement horizontal'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-annee-' + nom.replace('é', 'e') + '.png'), fullPage: true });
      await ctx.close();
    }
    // Période, flèches, « Aujourd'hui », Plan, jour et course touchés.
    let { p, ctx } = await ouvrir(nav, 'calendrier.html#annee', 1200, db, {}, PARIS);
    await p.click('[aria-label="Période suivante"]'); await pause();
    let r = await lire(p);
    pb.push(egal(['#annee=2027-04', 'Avril – septembre 2027', [['Trail de la Forêt', 'c-trail-n'], ['Trail des Cimes', 'c-trail-n'], ['Trail des Crêtes', 'c-trail-v'], ['Ultra du Plateau', 'c-trail-n']], []],
      [await p.evaluate(() => location.hash), r.titre, r.courses, r.auj], 'période suivante : avril à septembre 2027, sans aujourd\'hui'));
    await p.click('.cal-auj'); await pause();
    pb.push(egal(['#annee', 'Octobre 2026 – mars 2027'], [await p.evaluate(() => location.hash), (await lire(p)).titre], '« Aujourd\'hui » : la période du mois en cours'));
    await p.click('[data-menu]'); await p.click('.cal-menu [data-periode="12"]'); await pause();
    r = await lire(p);
    pb.push(egal([12, 'Octobre 2026 – septembre 2027', '12'], [await p.locator('.cal-y-mois').count(), r.titre, await p.evaluate(() => localStorage.getItem('mrt-calendrier-mois'))], '12 mois : douze mini-grilles, retenu sur l\'appareil'));
    await p.click('[data-menu]'); await p.click('.cal-menu [data-periode="3"]'); await pause();
    r = await lire(p);
    pb.push(egal([[3], 'Octobre – décembre 2026'], [r.blocs, r.titre], '3 mois : un bloc de trois'));
    await p.click('[data-menu]'); await p.click('.cal-menu [data-periode="6"]'); await pause();
    await p.click('[data-plan]'); await pause();
    pb.push(egal([true, true, '1'], [(await lire(p)).plan, (await lire(p)).nbPhases > 0, await p.evaluate(() => localStorage.getItem('mrt-calendrier-phases'))], 'bouton « Plan » d\'un toucher : enfoncé, les fonds de phase, retenu sur l\'appareil'));
    await p.click('[data-plan]'); await pause();
    pb.push(egal([false, 0, '0'], [(await lire(p)).plan, (await lire(p)).nbPhases, await p.evaluate(() => localStorage.getItem('mrt-calendrier-phases'))], 'Plan éteint : plus de fonds de phase'));
    await p.click('.cal-a-j[data-jour="2026-10-22"]');
    pb.push(egal('#semaines=2026-10-19', await p.evaluate(() => location.hash), 'toucher le 22 octobre : la vue Semaine, depuis le lundi 19'));
    await p.goBack(); await p.waitForSelector('.cal-a-blocs');
    await p.click('.cal-a-j[data-course="' + GORGES + '"]');
    await p.waitForSelector('.mc-panneau #preparation');
    pb.push(egal([GORGES, true], [await p.evaluate(() => history.state && history.state.mrtCourse), await p.evaluate(() => document.querySelector('#preparation').open)], 'toucher une course : sa page en modale, à la rubrique Préparation'));
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(1, await p.locator('.cal-a-blocs').count(), 'fermer la modale : le Calendrier reste là'));
    await ctx.close();
    // Durée de prépa propre à la course (Trail des Gorges, 20 semaines : départ le 19 octobre) ; format sans durée (Corrida de Noël en Triathlon S) : plus de plan.
    const durees = JSON.parse(JSON.stringify(db));
    durees.courses.find(c => c.course === 'Trail des Gorges').prepa_semaines = 20;
    durees.courses.find(c => c.course === 'Corrida de Noël').format = 'tri_s';
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#annee', 1200, durees, { 'mrt-calendrier-phases': '1' }, PARIS));
    r = await lire(p);
    pb.push(egal(['ph-base', 'ph-base', 'ph-base', 'ph-deload'], await p.evaluate(() => ['2026-11-23', '2026-12-01', '2026-12-14', '2027-01-04'].map(j => (document.querySelector('.cal-a-j[data-jour="' + j + '"]').className.match(/ph-\w+/) || [null])[0])),
      'Trail des Gorges à 20 semaines (début le 19 octobre : base jusqu\'en décembre, deload semaine 12) ; Corrida de Noël sans durée : plus de plan, le 1er décembre n\'est plus en affûtage'));
    await ctx.close();
    return pb;
  },

  // Spécification du Calendrier, § 4.5 et 4.6 : vue Mois V2 (une ligne par semaine) et export (page à imprimer), Calendrier et Mon plan.
  async calendrierMois2(nav, db0) {
    const pb = [];
    const { db: base } = jeuObjectif(db0);
    const moi = base.profils[0].id;
    base.seances = [
      { id: 'se-1', utilisateur: moi, date: '2026-10-19', type: 'renfo', libelle: 'Renforcement : Gainage 30 min', faite: true, course: null },
      { id: 'se-2', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Fractionné : 8×400 m', intensite: 'intense', duree_min: 60, faite: false, course: null },
      { id: 'se-3', utilisateur: moi, date: '2026-10-22', type: 'run', libelle: 'Endurance', intensite: 'facile', distance_km: 7, faite: false, course: null },
      { id: 'se-4', utilisateur: moi, date: '2026-10-24', type: 'run', libelle: 'Sortie longue', intensite: 'moderee', distance_km: 12.5, faite: false, course: null }];
    base.plan_semaines = [];
    const copie = () => { const d = JSON.parse(JSON.stringify(base)); d.ecritures = []; return d; };
    const lire = (p, zone) => p.evaluate(z => {
      const r = document.querySelector(z), lignes = [...r.querySelectorAll('.cal-m2-ligne')];
      return {
        vue: (b => b && b.textContent.trim())(document.querySelector('[data-menu]')), menu: [...document.querySelectorAll('.cal-menu a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : '')),
        titre: (t => t && t.textContent)(document.querySelector('.cal-titre')),
        tete: [...r.querySelectorAll('.cal-m2-tete span')].map(s => s.textContent),
        lignes: lignes.map(l => l.dataset.semaine), libelles: lignes.map(l => l.querySelector('.cal-m2-sem').innerText.replace(/\s+/g, ' ').trim()),
        hors: [...r.querySelectorAll('.cal-m2-case.hors')].map(c => c.dataset.jour), nums: [...r.querySelectorAll('.cal-m2-case')].slice(0, 3).map(c => c.querySelector('.cal-m2-num').textContent),
        cartes: [...r.querySelectorAll('.cal-m2-se')].map(e => [e.closest('[data-jour]').dataset.jour, [...e.classList].find(c => c.startsWith('l-')), (m => m && (m.querySelector('.n-long') || m).textContent)(e.querySelector('.cal-m2-mes')), (e.querySelector('span.cal-m2-nom .n-long') || {}).textContent, (e.querySelector('.cal-m2-det') || {}).textContent || '', e.classList.contains('faite'), e.querySelectorAll('.cal-m2-mes .cal-int b.on').length]),
        repos: [...r.querySelectorAll('.cal-repos')].map(e => e.closest('[data-jour]').dataset.jour),
        courses: [...r.querySelectorAll('.cal-m2-course')].map(e => [e.closest('[data-jour]').dataset.jour, e.textContent, [...e.classList].find(c => /^c-|^courue$/.test(c))]),
        cases: r.querySelectorAll('input[type="checkbox"]').length, coches: [...r.querySelectorAll('.cal-m2-coche')].map(e => e.classList.contains('on')), plus: r.querySelectorAll('[data-ajout]').length,
        phases: lignes.filter(l => /\bph-/.test(l.className)).map(l => [l.dataset.semaine, [...l.classList].find(c => c.startsWith('ph-'))]),
        legende: [...document.querySelectorAll('.cal-legende .cal-groupe > span')].map(x => x.textContent),
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    }, zone);
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', w, copie(), {}, PARIS);
      const r = await lire(p, '.cal-cadre');
      pb.push(
        egal(['Mois', ['Semaine', 'Mois *', '3 mois', '6 mois', 'Année'], 'Octobre 2026'], [r.vue, r.menu, r.titre], nom + ', menu « Vue » : Mois V2 à côté de Mois, mois en cours'),
        egal([['', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'], ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'], ['2026-09-28', '2026-09-29', '2026-09-30', '2026-11-01'], ['28', '29', '30']],
          [r.tete, r.lignes, r.hors, r.nums], nom + ', une ligne par semaine (cinq), jours des mois voisins atténués, numéro du jour dans chaque case'),
        egal([['2026-10-19', 'l-renfo', 'Renforcement', undefined, 'Gainage 30 min', true, 0], ['2026-10-20', 'l-frac', '1 h', 'Fractionné', '8×400 m', false, 3],
          ['2026-10-22', 'l-neutre', '7 km', 'Endurance', '', false, 1], ['2026-10-24', 'l-sl', '12,5 km', 'Sortie longue', '', false, 2]], r.cartes,
          nom + ', cartes : liseré du type de séance (Renforcement, Fractionné, Endurance neutre, Sortie longue), traits de l\'intensité, mesure en gras (distance, sinon durée, sinon le nom), nom, détail'),
        egal([], r.repos, nom + ', plus de « Repos » : un jour vide reste vide'),
        egal([true, true], [r.libelles[3].includes('19 oct.'), r.libelles[3].includes('1/4 séances · 0/19,5 km')], nom + ', libellé de la semaine : date du lundi, total'),
        egal([w < 600 ? 0 : 4, w < 600 ? 0 : 35], [r.cases === 4 && w < 600 ? 0 : r.cases, w < 600 ? 0 : r.plus], nom + ', case « faite » et « + » (ordinateur ; masqués sur téléphone)'),
        egal([], r.legende, nom + ', pas de légende des liserés'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-mois2-' + nom.replace('é', 'e') + '.png'), fullPage: true });
      await ctx.close();
    }
    // Le même liseré dans le Mois et la Semaine (Calendrier § 4.5) : type de séance, Endurance neutre.
    for (const [vue, sel] of [['mois', '.cal-m2-se'], ['semaines=2026-10-19', '.cal-carte']]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#' + vue, 1200, copie(), {}, PARIS);
      const l = await p.evaluate(q => [...document.querySelectorAll(q)].filter(e => e.closest('[data-jour], [data-jour-ligne]')).map(e => (j => [j.dataset.jour || j.dataset.jourLigne, [...e.classList].find(c => c.startsWith('l-')), getComputedStyle(e).borderLeftWidth])(e.closest('[data-jour], [data-jour-ligne]'))), sel);
      const w = '4px'; // liseré de 4 px dans toutes les vues (harmonisation)
      pb.push(egal([['2026-10-19', 'l-renfo', w], ['2026-10-20', 'l-frac', w], ['2026-10-22', 'l-neutre', w], ['2026-10-24', 'l-sl', w]], l, vue + ' : liseré selon le type de séance'));
      pb.push(egal([], erreurs, vue + ' : erreurs JavaScript'));
      await ctx.close();
    }
    // Plan : décembre, semaines de la saison du Trail des Gorges (numéro, phase), fond de phase ; Trail du Lac en carte (novembre).
    {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois=2026-12', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS);
      let r = await lire(p, '.cal-cadre');
      pb.push(egal([true, true, 'ph-deload', true], [r.libelles.every(l => /^Sem\. \d+ /i.test(l)), r.libelles[1].includes('Allègement'), (r.phases.find(x => x[0] === '2026-12-07') || [])[1], r.legende.includes('Base')],
        'Plan, décembre : « Sem. n », la phase dans le libellé, fond de phase sur la ligne'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-mois2-phases.png'), fullPage: true });
      await p.click('[aria-label="Mois précédent"]'); await pause();
      r = await lire(p, '.cal-cadre');
      pb.push(egal(['#mois=2026-11', [['2026-11-15', '24 kmTrail du Lac', 'c-trail-v']]], [await p.evaluate(() => location.hash), r.courses], 'mois précédent : novembre, le Trail du Lac en carte (distance, nom, couleur)'));
      await p.click('.cal-m2-case[data-jour="2026-11-18"] .cal-m2-num');
      pb.push(egal('#semaines=2026-11-16', await p.evaluate(() => location.hash), 'jour touché : la vue Semaine'));
      pb.push(egal([], erreurs, 'Mois V2, Plan : erreurs JavaScript'));
      await ctx.close();
    }
    // Export depuis le Calendrier : la période affichée, page imprimable sur fond blanc, ni case ni « + ».
    {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', 1200, copie(), {}, PARIS);
      await p.evaluate(() => { window.__imprime = 0; window.print = () => { window.__imprime++; }; });
      await p.click('.cal-haut [data-exporter]');
      const r = await lire(p, '.xp-zone');
      const x = await p.evaluate(() => ({ n: window.__imprime, pages: document.querySelectorAll('.xp-page').length, titre: document.querySelector('.xp-titre').textContent,
        blanc: document.querySelector('.xp-zone').classList.contains('t-blanc-orange'), cache: getComputedStyle(document.querySelector('.xp-zone')).display, pied: document.querySelector('.xp-pied').textContent }));
      pb.push(egal([1, 1, 'Calendrier · Octobre 2026', true, 'none', 'MyRunToolsExporté le 20 oct. 2026'], [x.n, x.pages, x.titre, x.blanc, x.cache, x.pied], 'export du Calendrier : une page, titre, fond blanc, invisible à l\'écran, pied'));
      pb.push(egal([5, 0, 0, [true, false, false, false]], [r.lignes.length, r.cases, r.plus, r.coches], 'export : cinq semaines, ni case ni « + », la case « faite » dessinée'));
      await p.emulateMedia({ media: 'print' });
      await p.evaluate(() => document.documentElement.classList.add('xp-imprime'));
      pb.push(egal(['none', 'block'], await p.evaluate(() => [getComputedStyle(document.querySelector('main')).display, getComputedStyle(document.querySelector('.xp-zone')).display]), 'impression : seule la page exportée'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'export-calendrier.png'), fullPage: true });
      pb.push(egal([], erreurs, 'export du Calendrier : erreurs JavaScript'));
      await ctx.close();
    }
    // Export depuis Mon plan : de la semaine en cours à celle de l'Objectif, six semaines par page.
    {
      const { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
      await p.waitForSelector('[data-reglages]');
      await p.evaluate(() => { window.print = () => {}; });
      await reglage(p, '[data-exporter]');
      const x = await p.evaluate(() => ({ pages: document.querySelectorAll('.xp-page').length, titre: document.querySelector('.xp-titre').textContent,
        lignes: [...document.querySelectorAll('.xp-zone .cal-m2-ligne')].map(l => l.dataset.semaine), course: [...document.querySelectorAll('.xp-zone .cal-m2-course')].map(e => e.closest('[data-jour]').dataset.jour),
        phases: document.querySelectorAll('.xp-zone .cal-m2-ligne[class*="ph-"]').length }));
      pb.push(egal([4, 'Mon plan · Trail des Gorges', 20, '2026-10-19', '2027-03-01', true, true], [x.pages, x.titre, x.lignes.length, x.lignes[0], x.lignes[x.lignes.length - 1], x.course.includes('2027-03-07') || x.course.length > 0, x.phases > 0],
        'export de Mon plan : de la semaine en cours à l\'Objectif, six semaines par page, phases'));
      if (CAPTURES) { await p.emulateMedia({ media: 'print' }); await p.evaluate(() => document.documentElement.classList.add('xp-imprime')); await p.screenshot({ path: path.join(__dirname, 'captures', 'export-mon-plan.png'), fullPage: true }); }
      pb.push(egal([], erreurs, 'export de Mon plan : erreurs JavaScript'));
      await ctx.close();
    }
    return pb;
  },

  // Spécification du Calendrier, § 10 : vue Mois (la grille du mois, mois par mois).
  async calendrierMois(nav, db0) {
    const pb = [];
    const { db: base, id } = jeuObjectif(db0);
    const moi = base.profils[0].id;
    base.seances = [
      { id: 'se-1', utilisateur: moi, date: '2026-10-19', type: 'renfo', libelle: 'Renforcement : Gainage 30 min', faite: true, course: null },
      { id: 'se-2', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Fractionné : 8×400 m', intensite: 'intense', faite: false, course: null },
      { id: 'se-3', utilisateur: moi, date: '2026-10-22', type: 'run', libelle: 'Endurance', intensite: 'facile', distance_km: 7, faite: false, course: null },
      { id: 'se-4', utilisateur: moi, date: '2026-10-24', type: 'run', libelle: 'Sortie longue', intensite: 'facile', distance_km: 12, faite: false, course: null }];
    base.plan_semaines = [];
    const copie = () => { const d = JSON.parse(JSON.stringify(base)); d.ecritures = []; return d; };
    // Vue Mois (une ligne par semaine, ex-4 semaines) : navigation et interactions ; son rendu est contrôlé par calendrierMois2.
    const lire = p => p.evaluate(() => {
      const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const jourDe = e => e.closest('.cal-m2-case').dataset.jour;
      return {
        titre: t('.cal-titre'), voisins: [...document.querySelectorAll('.cal-voisin-txt')].map(e => e.textContent),
        courses: [...document.querySelectorAll('.cal-m2-case .cal-m2-course')].map(a => [jourDe(a), a.querySelector('b.cal-m2-nom, .cal-m2-nom').textContent, [...a.classList].find(c => /^c-|^courue$/.test(c))]),
        seances: [...document.querySelectorAll('.cal-m2-case .cal-m2-se')].map(e => jourDe(e))
      };
    });
    let d, p, ctx, erreurs, r;
    // L'ancienne adresse #mois2 ouvre le Mois.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', 1200, copie(), {}, PARIS));
    pb.push(egal(['Mois', ['Semaine', 'Mois *', '3 mois', '6 mois', 'Année'], 'Octobre 2026'], [await p.textContent('[data-menu]').then(x => x.trim()), await p.evaluate(() => [...document.querySelectorAll('.cal-menu a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))), (await lire(p)).titre],
      'ancienne adresse #mois2 : la vue Mois ; menu sans « 4 semaines »'));
    await ctx.close();
    // Navigation, « + », séance touchée, jour touché, course et rendez-vous touchés.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', 1200, d, {}, PARIS));
    await surDialogue(p, () => true);
    await p.click('[aria-label="Mois suivant"]'); await pause();
    r = await lire(p);
    pb.push(egal(['#mois=2026-11', 'Novembre 2026', ['oct.', 'déc.'], true], [await p.evaluate(() => location.hash), r.titre, r.voisins, r.courses.some(c => c[0] === '2026-11-15' && c[1].includes('Trail du Lac') && c[2] === 'c-trail-v')],
      'mois suivant : novembre, le Trail du Lac le 15'));
    await p.click('[aria-label="Mois suivant"]'); await pause(); await p.click('[aria-label="Mois suivant"]'); await pause();
    r = await lire(p);
    pb.push(egal(['Janvier 2027', ['déc. 26', 'févr.']], [r.titre, r.voisins], 'janvier 2027 : l\'année du mois voisin quand elle change'));
    await p.click('.cal-auj'); await pause();
    pb.push(egal(['#mois', 'Octobre 2026'], [await p.evaluate(() => location.hash), (await lire(p)).titre], '« Aujourd\'hui » : le mois en cours'));
    await p.click('[data-ajout="2026-10-21"]');
    await p.selectOption('.cal-seance [name="nom"]', 'Endurance');
    pb.push(egal('facile', await p.inputValue('.cal-seance [name="intensite"]'), 'nom choisi : son intensité proposée'));
    await p.fill('.cal-seance [name="detail"]', '30 min'); await p.fill('.cal-seance [name="description"]', 'Courir 30 min en endurance\nPuis 5 min de marche');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([{ date: '2026-10-21', type: 'run', libelle: 'Endurance : 30 min' }, true], [(({ date, type, libelle }) => ({ date, type, libelle }))(d.seances[d.seances.length - 1]),
      (await lire(p)).seances.includes('2026-10-21')], '« + » d\'une case : séance ajoutée à ce jour'));
    pb.push(egal('Courir 30 min en endurance\nPuis 5 min de marche', d.seances[d.seances.length - 1].description, 'séance saisie : description enregistrée'));
    await p.click('[data-edit="se-3"]');
    pb.push(egal(['Endurance', ''], [await p.inputValue('.cal-seance [name="nom"]'), await p.inputValue('.cal-seance [name="detail"]')], 'séance touchée : sa fenêtre, nom et détail'));
    await p.click('.cal-seance [data-act="annuler"]');
    await p.click('.cal-m2-case[data-jour="2026-10-23"] .cal-m2-num');
    pb.push(egal('#semaines=2026-10-19', await p.evaluate(() => location.hash), 'jour touché : la vue Semaine, depuis le lundi 19'));
    await p.goto(RACINE + 'calendrier.html#mois=2026-11'); await p.waitForSelector('.cal-m2');
    pb.push(egal('course.html?id=' + id(2) + '#preparation', await p.getAttribute('.cal-v-rdv', 'href'), 'rendez-vous clé : lien vers la page de la course'));
    await p.click('.cal-m2-course');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(1), await p.evaluate(() => history.state && history.state.mrtCourse), 'course touchée : sa page en modale'));
    pb.push(egal([], erreurs, 'Mois : erreurs JavaScript'));
    await ctx.close();
    // Séance de l'IA : prévu en lecture seule, sans « Modifier cette séance » (seule la date se change) ; séance faite : réalisé (durée, distance, D+, FC), allure calculée.
    {
      const dI = copie();
      dI.seances.push({ id: 'se-ia', utilisateur: moi, date: '2026-10-21', type: 'run', libelle: 'Seuil : 3 x 8 min', description: '20 min en endurance facile\n3 x 8 min à allure seuil, 3 min de récupération\n5 min de retour au calme', duree_min: 55, distance_km: 10, denivele_m: 120, intensite: 'moderee', origine: 'ia', etat: 'acceptee', faite: false, course: null });
      const o = await ouvrir(nav, 'calendrier.html#mois', 1200, dI, {}, PARIS);
      await o.p.click('[data-edit="se-ia"]'); await o.p.waitForSelector('.cal-seance');
      pb.push(egal([1, ['Seuil', '3 x 8 min'], ['Durée55min', 'Distance10km', 'D+120m', 'IntensitéModérée'], true, 0, 2],
        [await o.p.locator('.cal-prevu-lecture').count(), await o.p.evaluate(() => [document.querySelector('.cal-prevu-nom').textContent, document.querySelector('.cal-prevu-detail').textContent]),
          await o.p.evaluate(() => [...document.querySelectorAll('.cal-prevu-stats > div')].map(e => e.textContent.replace(/\s+/g, ''))),
          await o.p.evaluate(() => document.querySelector('.cal-prevu-champs').hidden), await o.p.locator('.cal-prevu-lecture input, .cal-prevu-lecture select').count(), await o.p.locator('.cal-prevu-stats .cal-int.i-moderee .on').count()],
        'séance de l\'IA : texte structuré (nom, précisions, durée, distance, D+, intensité en traits), aucun champ ; les champs restent cachés'));
      pb.push(egal([false, true, false], [await o.p.evaluate(() => document.querySelector('.cal-date-ia').hidden), await o.p.locator('.cal-prevu-etapes li').count() === 3 && await o.p.textContent('.cal-prevu-etapes li:first-child') === '20 min en endurance facile', await o.p.locator('.cal-seance .cal-panneau-titre').isVisible()],
        'séance de l\'IA : la date se voit (la séance se déplace), description en étapes numérotées, pas de titre « Modifier la séance » en haut'));
      pb.push(egal([0, 0], [await o.p.locator('.cal-prevu-lecture .fc-libelle').count(), await o.p.locator('[data-act="modifier"]').count()], 'séance de l\'IA : ni « Proposée par MyRunTools », ni « Modifier cette séance »'));
      await o.p.check('.cal-seance [name="faite"]');
      pb.push(egal([true, '55', '10'], [await o.p.isVisible('.cal-seance [name="duree_reelle"]'), await o.p.getAttribute('.cal-seance [name="duree_reelle"]', 'placeholder'), await o.p.getAttribute('.cal-seance [name="distance_reelle"]', 'placeholder')], 'séance faite : bloc « Réalisé », le prévu en repère'));
      await o.p.fill('.cal-seance [name="duree_reelle"]', '50'); await o.p.fill('.cal-seance [name="distance_reelle"]', '8,2'); await o.p.fill('.cal-seance [name="denivele_reel"]', '95');
      await o.p.fill('.cal-seance [name="fc_moyenne"]', '152'); await o.p.fill('.cal-seance [name="fc_max"]', '171');
      pb.push(egal('Allure moyenne : 6\'06"/km', await o.p.textContent('.cal-allure'), 'allure calculée du réalisé (50 min, 8,2 km)'));
      await o.p.fill('.cal-seance [name="fc_moyenne"]', '180');
      await o.p.click('.cal-seance button[type="submit"]');
      pb.push(egal('La FC moyenne ne peut pas dépasser la FC max.', await o.p.textContent('.cal-msg'), 'FC moyenne au-dessus de la FC max : refusée'));
      await o.p.fill('.cal-seance [name="fc_moyenne"]', '152');
      dI.ecritures = [];
      await o.p.click('.cal-seance button[type="submit"]');
      await o.p.waitForSelector('.cal-seance', { state: 'detached' }); await pause();
      const w = (dI.ecritures.find(e => e.table === 'seances' && e.methode === 'PATCH') || {}).corps || {};
      pb.push(egal([{ duree_reelle_min: 50, distance_reelle_km: 8.2, denivele_reel_m: 95, fc_moyenne: 152, fc_max: 171, duree_min: 55, distance_km: 10 }, true],
        [(({ duree_reelle_min, distance_reelle_km, denivele_reel_m, fc_moyenne, fc_max, duree_min, distance_km }) => ({ duree_reelle_min, distance_reelle_km, denivele_reel_m, fc_moyenne, fc_max, duree_min, distance_km }))(w), w.faite === true],
        'séance faite : réalisé enregistré à côté du prévu, la séance reste une séance de l\'IA'));
      pb.push(egal([8.2, 55, 10], await o.p.evaluate(() => { const r = window.mrtPreparation.reel; return [r({ faite: true, distance_km: 10, distance_reelle_km: 8.2 }).distance_km, r({ faite: true, duree_min: 55 }).duree_min, r({ faite: false, distance_km: 10, distance_reelle_km: 8.2 }).distance_km]; }), 'réalisé prioritaire quand il est saisi, sinon le prévu'));
      pb.push(egal([], o.erreurs, 'séance de l\'IA et réalisé : erreurs JavaScript'));
      await o.ctx.close();
    }
    // Lecture seule
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.seances = partage.seances.map(x => Object.assign({}, x, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#mois', 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal([0, 0], [await p.locator('[data-ajout], [data-edit]').count(), await p.locator('.cal-m2-case input:not([disabled])').count()], 'lecture seule : ni « + » ni modification (cases « faite » désactivées)'));
    await ctx.close();
    return pb;
  },

  // Spécification du Calendrier, § 10 : vue Semaine (vue par défaut ; un jour par ligne, les semaines suivantes au fil du défilement).
  async calendrierSemaine(nav, db0) {
    const pb = [];
    const { db: base, id } = jeuObjectif(db0);
    const moi = base.profils[0].id;
    base.seances = [
      { id: 'se-1', utilisateur: moi, date: '2026-10-19', type: 'renfo', libelle: 'Gainage 30 min', faite: true, course: null },
      { id: 'se-2', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: '8×400 m', faite: false, course: null },
      { id: 'se-3', utilisateur: moi, date: '2026-10-22', type: 'run', libelle: 'Footing 45 min', faite: false, course: null },
      { id: 'se-4', utilisateur: moi, date: '2026-10-24', type: 'run', libelle: 'Sortie 1 h 30', faite: false, course: null }];
    base.plan_semaines = [];
    const copie = () => { const d = JSON.parse(JSON.stringify(base)); d.ecritures = []; return d; };
    const lire = p => p.evaluate(() => {
      const ligne = e => e.closest('.cal-s-ligne').dataset.jourLigne;
      return {
        vue: [document.querySelector('[data-menu]').textContent.trim(), [...document.querySelectorAll('.cal-menu a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))],
        passees: (document.querySelector('[data-passees]') || {}).textContent || null,
        semaines: [...document.querySelectorAll('.cal-s-titre')].map(e => e.textContent),
        totaux: [...document.querySelectorAll('.cal-s-semaine')].slice(0, 2).map(e => (e.querySelector('.cal-total') || {}).textContent || ''),
        moisTotaux: [...document.querySelectorAll('.cal-m-total')].map(e => e.textContent),
        courante: (document.querySelector('.cal-s-semaine.is-courante .cal-s-titre') || {}).textContent || null,
        dates: [...document.querySelectorAll('.cal-s-semaine:first-of-type .cal-s-date')].map(e => e.textContent),
        auj: [...document.querySelectorAll('.cal-s-ligne.auj')].map(e => e.dataset.jourLigne),
        seances: [...document.querySelectorAll('.cal-s-ligne .cal-carte')].map(e => [ligne(e), (e.querySelector('.cal-carte-det').textContent + ' ' + e.querySelector('.cal-carte-nom').textContent).replace(/\s+/g, ' ').trim(), e.querySelector('input').checked]),
        rdv: [...document.querySelectorAll('.cal-s-ligne .cal-v-rdv')].map(e => [ligne(e), e.textContent]),
        courses: [...document.querySelectorAll('.cal-s-ligne .cal-v-course')].map(e => [ligne(e), e.textContent, [...e.classList].find(c => /^c-|^courue$/.test(c))]),
        plus: document.querySelectorAll('.cal-s-ligne [data-ajout]').length,
        phases: [...document.querySelectorAll('.cal-s-ligne')].filter(e => /\bph-/.test(e.className)).map(e => [e.dataset.jourLigne, [...e.classList].find(x => x.startsWith('ph-'))]),
        legende: [...document.querySelectorAll('.cal-legende .cal-groupe > span')].map(x => x.textContent),
        texte: document.querySelector('main').textContent,
        // Barre du haut sur une seule ligne (téléphone compris) ; Plan : jour passé (19) et à venir (21) sur le même fond.
        uneLigne: Math.abs(document.querySelector('[data-menu]').getBoundingClientRect().top - document.querySelector('[data-auj]').getBoundingClientRect().top) < 2,
        fonds: (f => f('2026-10-19') === f('2026-10-21'))(j => (e => e && getComputedStyle(e).backgroundColor)(document.querySelector('.cal-s-ligne[data-jour-ligne="' + j + '"]'))),
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    const SEMAINES = ['Semaine du 19 au 25 oct.', 'Semaine du 26 oct. au 1er nov.', 'Semaine du 2 au 8 nov.'];
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html', w, copie(), {}, PARIS);
      const r = await lire(p);
      pb.push(
        egal([['Semaine', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], true, 'Afficher les semaines passées'], [r.vue, r.uneLigne, r.passees], nom + ', vue Semaine par défaut (menu « Vue »), barre du haut sur une ligne, lien vers les semaines passées'),
        egal([SEMAINES, 'Semaine du 19 au 25 oct.'], [r.semaines.slice(0, 3), r.courante], nom + ', la semaine en cours d\'abord, puis les suivantes'),
        egal([['19lun.', '20mar.', '21mer.', '22jeu.', '23ven.', '24sam.', '25dim.'], ['2026-10-20']], [r.dates, r.auj], nom + ', numéro et nom de chaque jour, aujourd\'hui mis en avant'),
        egal([[['2026-10-19', 'Renforcement Gainage 30 min', true], ['2026-10-20', 'Course à pied 8×400 m', false], ['2026-10-22', 'Course à pied Footing 45 min', false], ['2026-10-24', 'Course à pied Sortie 1 h 30', false]],
          [['2026-11-01', '◆ Ouverture des inscriptions · Corrida de Noël']]], [r.seances, r.rdv], nom + ', séances à cocher, rendez-vous clé'),
        egal([r.semaines.length * 7, false, false], [r.plus, /Faites/.test(r.texte), /Développement/.test(r.texte)], nom + ', un « + » par jour ; ni « Faites », ni nom de phase'),
        egal(['1/4 séances', ''], r.totaux, nom + ', total de la semaine en cours (fait sur prévu), rien sans séance'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-semaine-' + nom.replace('é', 'e') + '.png'), fullPage: true });
      await ctx.close();
    }
    // Défilement : les semaines suivantes arrivent ; semaines passées : quatre de plus au-dessus, sans que l'écran ne saute ; « Aujourd'hui ».
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html', 1200, d, {}, PARIS);
    const nb0 = (await lire(p)).semaines.length;
    for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 3000); await pause(); }
    pb.push(egal(true, (await lire(p)).semaines.length > nb0, 'défilement : les semaines suivantes arrivent'));
    await p.evaluate(() => window.scrollTo(0, 0)); await pause();
    const avant = await p.evaluate(() => document.querySelector('[data-semaine="2026-10-19"]').getBoundingClientRect().top);
    await p.click('[data-passees]'); await pause();
    const apres = await p.evaluate(() => document.querySelector('[data-semaine="2026-10-19"]').getBoundingClientRect().top);
    pb.push(egal(['Semaine du 21 au 27 sept.', true], [(await lire(p)).semaines[0], Math.abs(apres - avant) < 2], 'semaines passées : quatre de plus au-dessus, la semaine regardée reste en place'));
    await p.click('.cal-auj'); await pause();
    pb.push(egal([SEMAINES[0], 3], [(await lire(p)).semaines[0], (await lire(p)).semaines.length], '« Aujourd\'hui » : de nouveau la semaine en cours et les deux suivantes'));
    // Séances : case « faite », ajout (libellé vide refusé), modification, suppression.
    await surDialogue(p, () => true);
    await p.locator('[data-fait="se-2"]').check();
    for (let i = 0; i < 20 && !d.ecritures.some(e => e.table === 'seances'); i++) await p.clock.runFor(100);
    pb.push(egal({ methode: 'PATCH', corps: { faite: true } }, (({ methode, corps }) => ({ methode, corps }))(d.ecritures.find(e => e.table === 'seances')), 'case « faite » : écriture'));
    for (let i = 0; i < 20 && !(await p.locator('.cal-feuille-retour').count()); i++) await p.clock.runFor(100);
    if (await p.locator('.cal-feuille-retour').count()) { await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); }
    await p.click('[data-ajout="2026-10-21"]');
    await p.selectOption('.cal-seance [name="nom"]', 'Endurance'); await p.fill('.cal-seance [name="detail"]', '30 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([{ date: '2026-10-21', type: 'run', libelle: 'Endurance : 30 min' }, true], [(({ date, type, libelle }) => ({ date, type, libelle }))(d.seances[d.seances.length - 1]),
      (await lire(p)).seances.some(x => x[0] === '2026-10-21' && x[1] === 'Course à pied Endurance')], 'séance ajoutée : écriture, affichée au bon jour'));
    await p.click('[data-edit="se-3"]');
    await p.selectOption('.cal-seance [name="nom"]', 'Renforcement'); await p.fill('.cal-seance [name="detail"]', 'Gainage 20 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal(['Renforcement Renforcement'], (await lire(p)).seances.filter(x => x[0] === '2026-10-22').map(x => x[1]), 'séance modifiée'));
    await p.click('[data-edit="se-3"]');
    await p.click('[data-act="supprimer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([], (await lire(p)).seances.filter(x => x[0] === '2026-10-22'), 'séance supprimée'));
    pb.push(egal([], erreurs, 'Semaine : erreurs JavaScript'));
    await ctx.close();
    // Plan : le fond des jours à la couleur de la phase de la semaine (le même pour tous ses jours), et la légende ; pas de nom de phase.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS));
    let r = await lire(p);
    pb.push(egal([0, ['Base', 'Développement', 'Affûtage', 'Allègement', 'Récupération', 'Entretien']], [r.phases.filter(x => x[0] >= '2026-10-19' && x[0] <= '2026-10-25').length, r.legende],
      'Plan, semaine du 19 octobre : Entretien, pas de fond ; légende avec Récupération et Entretien'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines=2026-11-30', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS));
    r = await lire(p);
    const fondS = j => p.evaluate(x => getComputedStyle(document.querySelector('.cal-s-ligne[data-jour-ligne="' + x + '"]')).backgroundColor, j);
    pb.push(egal([7, 'ph-base', false, true],
      [r.phases.filter(x => x[0] >= '2026-11-30' && x[0] <= '2026-12-06').length, (r.phases.find(x => x[0] === '2026-12-01') || [])[1], /Développement/.test(r.texte.replace(/Phases\s*Base\s*Développement/, '')),
        await fondS('2026-11-30') === await fondS('2026-12-02')],
      'Plan, semaine du 30 novembre : base (saison du Trail des Gorges), le même fond pour ses sept jours, sans nom de phase'));
    await ctx.close();
    // Une semaine choisie (depuis le Mois ou l'Année) : le jour de course et le rendez-vous clé mènent à la page de la course.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines=2026-11-09', 1200, copie(), {}, PARIS));
    r = await lire(p);
    pb.push(egal(['Semaine du 9 au 15 nov.', ['2026-11-15', 'Trail du Lac', 'c-trail-v']], [r.semaines[0], r.courses[0]], 'semaine choisie : la première affichée, avec le jour de course'));
    await p.click('.cal-v-course');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(1), await p.evaluate(() => history.state && history.state.mrtCourse), 'jour de course : page de la course en modale'));
    await ctx.close();
    // Sans plan en cours (14 décembre, sans le Trail des Gorges), Plan enfoncé : pas de fond de phase.
    d = copie();
    d.courses = d.courses.filter(c => c.id !== id(3));
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, d, { 'mrt-calendrier-phases': '1' }, { fuseau: 'Europe/Paris', maintenant: new Date('2026-12-14T10:00:00+01:00') }));
    r = await lire(p);
    pb.push(egal(['Semaine du 14 au 20 déc.', []], [r.semaines[0], r.phases.filter(x => x[0] >= '2026-12-14' && x[0] <= '2026-12-20')], 'semaine sans prépa en cours : pas de fond de phase'));
    await ctx.close();
    // Lecture seule
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.seances = partage.seances.map(x => Object.assign({}, x, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal([0, 4], [await p.locator('[data-ajout], [data-edit]').count(), await p.locator('.cal-v-se input:disabled, .cal-carte input:disabled').count()], 'lecture seule : ni « + » ni modification, cases « faite » grisées'));
    await ctx.close();
    return pb;
  },

  // Spécification Préparation, § 5.4 et § 10 : rubrique Préparation de la page d'une course (sa place dans la saison) ; les phases se règlent dans Mon plan.
  async calendrierPlan(nav, db0) {
    const pb = [];
    const { db: base, id } = jeuObjectif(db0);
    const moi = base.profils[0].id;
    base.seances = [
      { id: 'se-1', utilisateur: moi, date: '2026-10-19', type: 'renfo', libelle: 'Gainage 30 min', faite: true, course: null },
      { id: 'se-2', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: '8×400 m', faite: false, course: null },
      { id: 'se-3', utilisateur: moi, date: '2026-10-22', type: 'run', libelle: 'Footing 45 min', faite: false, course: null },
      { id: 'se-4', utilisateur: moi, date: '2026-10-24', type: 'run', libelle: 'Sortie 1 h 30', faite: false, course: null }];
    base.plan_semaines = [];
    const copie = () => { const d = JSON.parse(JSON.stringify(base)); d.ecritures = []; return d; };
    const GORGES = id(3);
    let p, ctx, erreurs, d;

    // --- Rubrique Préparation de la page d'une course : sa place dans la saison (spécification Préparation, § 5.4)
    const ouvertePrep = async (d, idCourse, largeur = 1200, opts = PARIS, st = {}) => {
      const o = await ouvrir(nav, 'course.html?id=' + idCourse + '#preparation', largeur, d, st, opts);
      await o.p.waitForSelector('#preparation');
      return o;
    };
    const place = q => q.evaluate(() => { const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      return { ligne: t('#preparation .cal-plan-dates'), avis: t('#preparation .pr-avis-n'), raison: t('#preparation .pr-avis-r'), sources: t('#preparation .pr-sources'),
        lien: [...document.querySelectorAll('#preparation .cal-regler')].map(a => a.textContent.trim() + ' ' + a.getAttribute('href')), reglage: document.querySelectorAll('#preparation [data-preparer]').length,
        semaines: document.querySelectorAll('#preparation .cal-sem').length }; });
    d = copie();
    ({ p, ctx, erreurs } = await ouvertePrep(d, GORGES));
    await surDialogue(p, () => true);
    pb.push(
      egal(true, await p.evaluate(() => { const e = document.querySelector('#preparation'); const r = e.getBoundingClientRect(); return e.open && r.top >= 0 && r.top < innerHeight; }), 'page de la course : rubrique ouverte et à l\'écran'),
      egal('Préparation', await p.evaluate(() => document.querySelector('#preparation summary').textContent.trim()), 'rubrique : titre'),
      egal({ ligne: 'Objectif · préparation de 16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027', avis: null, raison: null, sources: null, lien: ['Voir dans Mon plan preparation.html'], reglage: 0, semaines: 0 }, await place(p),
        'Objectif : sa saison, le lien « Voir dans Mon plan », ni réglage ni semaines'),
      egal(['Base 3 sem.', 'Allègement 1 sem.', 'Base 2 sem.', 'Développement 1 sem.', 'Allègement 1 sem.', 'Développement 3 sem.', 'Allègement 1 sem.', 'Développement 2 sem.', 'Affûtage 2 sem.'],
        await p.evaluate(() => [...document.querySelectorAll('#preparation .cal-frise .cal-seg')].map(e => e.textContent.replace(/\s+/g, ' ').replace(/(\D)(\d)/, '$1 $2').trim())), 'Objectif : frise de sa saison'));
    await ctx.close();
    // Une Préparatoire avant la saison, une Plaisir dans la saison, une option (jugée comme si elle était confirmée).
    ({ p, ctx } = await ouvertePrep(copie(), id(1)));
    pb.push(egal({ ligne: 'Préparatoire · en Entretien, avant la préparation de Trail des Gorges · 3 jours allégés avant, 19 jours de récupération', avis: 'Possible', raison: '16 semaines avant Trail des Gorges (conseillé : 4 à 6 semaines)',
      sources: 'Sources : Marathon Handbook, Laura Norris', lien: ['Voir dans Mon plan preparation.html'], reglage: 0, semaines: 0 }, await place(p), 'Trail du Lac : Préparatoire hors fenêtre, Possible, avec ses sources'));
    await ctx.close();
    ({ p, ctx } = await ouvertePrep(copie(), id(2)));
    pb.push(egal(['Plaisir · semaine 4 sur 16 de la préparation de Trail des Gorges · repos la veille, 6 jours de récupération', 'Possible', 'Sans affûtage ; récupération finie avant l\'affûtage de Trail des Gorges'],
      Object.values(await place(p)).slice(0, 3), 'Corrida de Noël : Plaisir dans la saison, Possible'));
    await ctx.close();
    ({ p, ctx } = await ouvertePrep(copie(), id(4)));
    pb.push(egal(['Préparatoire (option) · semaine 3 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 42 jours de récupération', 'Possible', '12 semaines avant Trail des Crêtes (conseillé : 4 à 8 semaines)'],
      Object.values(await place(p)).slice(0, 3), 'Trail des Cimes (option) : jugée comme si elle était confirmée'));
    await ctx.close();
    ({ p, ctx } = await ouvertePrep(copie(), id(5)));
    pb.push(egal(['Déconseillée', 'Ultra du Plateau : récupération jusqu\'au mar. 17 août 2027, sur l\'affûtage de Trail des Crêtes', 'Sources : Trainingplan.dev, Bosquet, 2007'],
      Object.values(await place(p)).slice(1, 4), 'Ultra du Plateau (option) : Déconseillée, l\'alerte et ses sources'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + GORGES, 1200, copie(), {}, PARIS));
    pb.push(egal(0, await p.evaluate(() => window.scrollY), 'sans #preparation : pas de défilement'));
    await ctx.close();

    // Régler les phases, depuis Mon plan (rond de la frise, ou de l'Objectif dans « Courses du plan ») : durée de 20 semaines, une semaine en Base, puis recalcul
    const plans = async (largeur = 1200) => { const o = await ouvrir(nav, 'preparation.html', largeur, d, {}, PARIS); await o.p.waitForSelector('[data-reglages]'); await surDialogue(o.p, () => true); return o; };
    const regler = async (q, idCourse) => { await reglage(q.p, '[data-preparer="' + idCourse + '"]'); await q.p.waitForSelector('.cal-preparer'); };
    const fini = async q => { await q.p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause(); };
    d = copie();
    let q = await plans();
    pb.push(egal([[GORGES], 'Personnaliser'], await q.p.evaluate(() => [[...document.querySelectorAll('[data-preparer]')].map(b => b.dataset.preparer), document.querySelector('.ps-reglages [data-preparer]').textContent.trim()]),
      'Mon plan : « Personnaliser » (Régler les phases) dans la carte de l\'Objectif visé, seul réglage des phases de la page'));
    await reglage(q.p, '[data-preparer]'); await q.p.waitForSelector('.cal-preparer');
    await q.p.fill('.cal-prep [name="duree"]', '20'); await q.p.dispatchEvent('.cal-prep [name="duree"]', 'change');
    pb.push(egal('Début : lun. 19 oct. 2026 ; jour J : dim. 7 mars 2027 · durée du format : 16 sem.', await q.p.textContent('.cal-prep .cal-plan-dates'), 'Régler les phases : 20 semaines, début le 19 octobre'));
    await q.p.selectOption('.cal-prep [data-sem="2026-12-07"]', 'base');
    await q.p.click('[data-act="enregistrer"]');
    await fini(q);
    await q.ctx.close();
    ({ p, ctx, erreurs } = await ouvertePrep(d, GORGES));
    pb.push(egal(20, d.courses.find(c => c.id === GORGES).prepa_semaines, 'Régler les phases : durée de la saison écrite sur l\'Objectif'),
      egal([{ course: GORGES, lundi: '2026-12-07', phase: 'base' }], d.plan_semaines.map(x => ({ course: x.course, lundi: x.lundi, phase: x.phase })), 'Régler les phases : seule la semaine modifiée est rangée'),
      egal('Objectif · préparation de 20 semaines, du lun. 19 oct. 2026 au dim. 7 mars 2027', (await place(p)).ligne, 'rubrique : saison de 20 semaines'));
    q = await plans();
    await regler(q, GORGES);
    await q.p.click('[data-act="recalculer"]');
    await q.p.click('[data-act="enregistrer"]');
    await fini(q);
    await q.ctx.close();
    pb.push(egal([], d.plan_semaines, 'Recalculer : plus aucune semaine modifiée'));
    // Téléphone : la frise de la saison (2 rem par semaine) dépasse la largeur et défile de gauche à droite
    {
      const t = await ouvertePrep(copie(), GORGES, 390);
      const f = await t.p.evaluate(() => { const z = document.querySelector('#preparation .cal-frise-defile'); z.scrollLeft = 120;
        return { defile: z.scrollWidth > z.clientWidth, decale: z.scrollLeft > 0, page: document.documentElement.scrollWidth <= innerWidth }; });
      pb.push(egal({ defile: true, decale: true, page: true }, f, 'téléphone : frise de la saison plus large que l\'écran, qui défile de gauche à droite, sans élargir la page'));
      await t.ctx.close();
    }
    // Frise : glisser la première poignée d'une semaine vers la droite
    q = await plans(); await regler(q, GORGES);
    {
      const qp = q.p;
      await qp.fill('.cal-prep [name="duree"]', '20'); await qp.dispatchEvent('.cal-prep [name="duree"]', 'change');
      const poignee = await qp.locator('.cal-poignee').first().boundingBox(), frise = await qp.locator('.cal-frise.is-edit').boundingBox();
      pb.push(egal(await qp.locator('.cal-frise.is-edit .cal-seg').count() - 1, await qp.locator('.cal-poignee').count(), 'Régler les phases : une poignée entre deux phases'));
      await qp.mouse.move(poignee.x + poignee.width / 2, poignee.y + poignee.height / 2);
      await qp.mouse.down();
      await qp.mouse.move(frise.x + frise.width * 4 / 20 + 2, poignee.y + poignee.height / 2, { steps: 5 });
      await qp.mouse.up();
      pb.push(egal('base', await qp.inputValue('.cal-prep [data-sem="2026-11-09"]'), 'frise : la semaine 4 passe en Base en glissant la limite'));
      await qp.click('[data-act="annuler"]');
      pb.push(egal([], d.plan_semaines, 'Annuler : rien n\'est rangé'), egal([], erreurs, 'rubrique : erreurs JavaScript'), egal([], q.erreurs, 'page Mon plan : erreurs JavaScript'));
    }
    await q.ctx.close();
    await ctx.close();

    // Un Objectif dont le format n'a pas de durée : pas de plan ; une durée choisie dans Mon plan lui donne sa saison.
    d = copie();
    d.courses.find(c => c.id === GORGES).format = 'tri_s';
    ({ p, ctx } = await ouvertePrep(d, GORGES));
    pb.push(egal('Objectif · pas encore de plan : ce format n\'a pas de durée de préparation par défaut.', (await place(p)).ligne, 'Objectif sans durée de format : pas de plan'));
    await ctx.close();
    // Mon plan : sans durée, pas de saison ; l'écran Début du parcours en donne une (§ 5.0).
    q = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await q.p.waitForSelector('.ps-objectif');
    pb.push(egal('Trail des Crêtes', (await q.p.textContent('.ps-objectif .ps-titre')).trim(), 'Mon plan, Objectif sans durée de format : pas de saison, la carte montre l\'Objectif suivant (la durée se choisit à l\'écran Début du parcours)'));
    await q.ctx.close();

    // Lecture seule : la rubrique s'affiche, sans lien ni réglage.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.seances = partage.seances.map(x => Object.assign({}, x, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvertePrep(partage, id(1), 1200, PARIS, { 'mrt-vue': autre }));
    pb.push(egal([1, 0, 0], [await p.locator('#preparation').count(), await p.locator('[data-preparer], .cal-regler').count(), await p.locator('#preparation [data-ajout], #preparation [data-edit]').count()], 'lecture seule : la rubrique s\'affiche, sans lien ni réglage'));
    await ctx.close();
    if (CAPTURES) {
      ({ p, ctx } = await ouvertePrep(copie(), id(1)));
      await p.screenshot({ path: path.join(__dirname, 'captures', 'course-preparation.png'), fullPage: true });
      await ctx.close();
      const o = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
      await o.p.waitForSelector('[data-reglages]'); await reglage(o.p, '[data-preparer]');
      await o.p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-preparer.png') });
      await o.ctx.close();
    }
    return pb;
  },

  // Spécification générale, thèmes : chaque page prend le thème de l'utilisateur, cadres compris.
  // Connexion par adresse e-mail et mot de passe (specification-generale.md, § 3 ; module-preferences-specification.md, § 6).
  // Spécification Préparation, § 10 : plan de saison (saisons, phases hors saison, repères, alertes) et page Préparation.
  async preparationSaison(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const copie = f => { const d = JSON.parse(JSON.stringify(db)); if (f) f(d); return d; };
    const course = (d, n) => d.courses.find(c => c.id === id(n));
    // La vue d'ensemble (§ 5.1) : carte de l'Objectif, frise en cases semaine, bandeau, Cette semaine.
    const lire = p => p.evaluate(() => {
      const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const sem = [...document.querySelectorAll('.ps-sem')];
      const ph = l => { const e = sem.find(x => x.dataset.lundi === l); return e ? [...e.classList].find(c => c.startsWith('ph-')) : null; };
      return {
        titre: t('.ps-objectif .ps-titre'), sous: t('.ps-objectif .ps-sous'), j: t('.ps-objectif .ps-j'), court: t('.ps-court'),
        reglages: [...document.querySelectorAll('#ps-reglages-menu .mrt-menu-l')].map(b => b.textContent.trim()), menuBas: !!document.querySelector('.ps-semaine + .ps-reglages [data-reglages]'),
        semaines: sem.length ? [sem[0].dataset.lundi, sem[sem.length - 1].dataset.lundi] : [], courante: (document.querySelector('.ps-sem.is-courante') || {}).dataset ? document.querySelector('.ps-sem.is-courante').dataset.lundi : null,
        phases: ['2026-11-09', '2026-11-16', '2026-11-30', '2027-03-08', '2027-04-12', '2027-04-19', '2027-05-03', '2027-05-10', '2027-08-16', '2027-08-30'].map(ph),
        marques: [...document.querySelectorAll('.ps-sem-c')].map(e => e.closest('.ps-sem').dataset.lundi + ' ' + e.textContent + ' ' + [...e.classList].filter(c => c !== 'ps-sem-c').join(' ')),
        alertes: ['Alertes (' + document.querySelectorAll('.ps-alerte').length + ')', ...[...document.querySelectorAll('.ps-alerte')].map(e => e.dataset.alerte)],
        textesAlertes: [...document.querySelectorAll('.ps-alerte')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
        retires: document.querySelectorAll('.ps-courses, .ps-suggestion, .ps-historique, [data-frise], .mrt-plein, .ps-place, .ps-profil-etat, .ps-prop-repli, [data-ia="proposer"]').length,
        bloc: [...document.querySelectorAll('.ps-semaine .cal-s-ligne')].map(e => e.dataset.jourLigne),
        reperes: [...document.querySelectorAll('.ps-semaine .cal-v-rep')].map(e => e.closest('.cal-s-ligne').dataset.jourLigne + ' ' + e.textContent),
        repos: [...document.querySelectorAll('.ps-semaine .cal-repos')].map(e => e.closest('.cal-s-ligne').dataset.jourLigne),
        lien: (document.querySelector('.ps-semaine-tete a.ps-vers-cal') || { getAttribute: () => null }).getAttribute('href'),
        texteLien: t('.ps-semaine-tete a.ps-vers-cal'), guideBas: document.querySelectorAll('.mrt-guide').length,
        info: [...document.querySelectorAll('.ps-objectif .ps-droite > *, .ps-saison-droite > a')].map(e => (e.getAttribute('href') || e.textContent.trim()) + '|' + (e.getAttribute('aria-label') || '')),
        libelleObjectif: document.querySelectorAll('.ps-objectif .ob-role, .ps-saison .ob-lib').length,
        plus: document.querySelectorAll('.ps-semaine [data-ajout]').length,
        ordre: [...document.querySelectorAll('.ps-vue > *')].map(e => e.className.split(' ').find(c => c.startsWith('ps-'))),
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    const fleches = p => p.evaluate(() => [...document.querySelectorAll('.ps-fl')].map(b => !b.hidden));
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', w, copie(), {}, PARIS);
      await p.waitForSelector('.ps-objectif');
      const r = await lire(p);
      pb.push(
        egal(['Trail des Gorges', 'dim. 7 mars 2027 · 45 km · 2 100 m D+', '138 j', null, ['Changer d\'Objectif', 'Personnaliser', 'Exporter']], [r.titre, r.sous, r.j, r.court, r.reglages],
          nom + ', carte de l\'Objectif : nom, date complète, distance et D+, J-138 ; les trois réglages du plan'),
        egal(['2026-10-19', '2027-10-25', '2026-10-19'], [r.semaines[0], r.semaines[1], r.courante], nom + ', frise : tout le plan, de la semaine en cours à la fin de la dernière récupération ; la semaine en cours repérée'),
        egal(['ph-entretien', 'ph-base', 'ph-base', 'ph-recuperation', 'ph-recuperation', 'ph-entretien', 'ph-entretien', 'ph-base', 'ph-affutage', 'ph-recuperation'], r.phases,
          nom + ', phases : Entretien avant la saison, saison du Trail des Gorges dès le 16 novembre, Récupération jusqu\'au 17 avril, Entretien, saison du Trail des Crêtes dès le 10 mai, affûtage dès le 16 août'),
        egal(['2026-11-09 Trail du Lac r-preparatoire', '2026-12-07 Corrida de Noël r-plaisir', '2027-03-01 Trail des Gorges r-objectif', '2027-05-24 Trail des Cimes r-preparatoire is-option', '2027-06-21 Ultra du Plateau r-preparatoire is-option', '2027-06-28 Trail de la Forêt r-preparatoire is-option', '2027-08-23 Trail des Crêtes r-objectif'], r.marques,
          nom + ', courses dans leur semaine, repérées par leur rôle, options à part'),
        egal([['Alertes (0)'], 0, ['ps-objectif', 'ps-frise-z', 'ps-bandeau', 'ps-semaine']], [r.alertes, r.retires, r.ordre], nom + ', pas d\'alerte ; plus de frise « En cours », de courses du plan, d\'historique ni de « Proposer » ; l\'ordre de la page'),
        egal([false, true], await fleches(p), nom + ', flèches : seule « suivantes » au départ (la frise ne tient pas)'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      await p.click('.ps-fl[data-fl="1"]'); await pause();
      pb.push(egal([true, true], await fleches(p), nom + ', flèche « suivantes » : la frise défile, « précédentes » apparaît'));
      pb.push(egal('calendrier.html#semaines=2026-11-16', await p.getAttribute('.ps-sem[data-lundi="2026-11-16"]', 'href'), nom + ', une semaine de la frise mène au Calendrier, sur elle'));
      if (CAPTURES) { await p.evaluate(() => { document.querySelector('.ps-frise-defile').scrollLeft = 0; }); await p.screenshot({ path: path.join(__dirname, 'captures', 'preparation-' + nom.replace('é', 'e') + '.png'), fullPage: true }); }
      await ctx.close();
    }
    // Cette semaine et ses repères.
    let { p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
    await p.waitForSelector('.ps-objectif');
    let r = await lire(p);
    pb.push(egal([7, '2026-10-19', '2026-10-25', 7, 'calendrier.html'], [r.bloc.length, r.bloc[0], r.bloc[6], r.plus, r.lien], 'cette semaine : une ligne par jour, du 19 au 25 octobre, un « + » par jour ; lien vers le Calendrier à côté du titre'),
        egal(['Calendrier', 0, 0, ['138 j|', 'guide.html#saison|Comment MyRunTools construit ton plan']], [r.texteLien, r.guideBas, r.libelleObjectif, r.info], 'carte : plus de libellé « Objectif » ni de titre des courses ; « 138 j » sur la ligne du nom, le rond « i » vers le Guide à droite de la ligne des courses ; plus de lien du Guide en bas ; « Calendrier › »'));
    pb.push(egal([], r.repos, 'jour sans séance : plus de « Repos », la ligne reste vide'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-09T10:00:00+01:00') }));
    await p.waitForSelector('.ps-objectif');
    pb.push(egal(['2026-11-12 Allégé', '2026-11-13 Allégé', '2026-11-14 Allégé'], (await lire(p)).reperes, 'repères dans les lignes : allégé du 12 au 14 novembre avant le Trail du Lac'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-30T10:00:00+01:00') }));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([true, false, '2026-11-30', '2026-11-16'], [r.reperes.includes('2026-12-04 Récupération'), r.reperes.includes('2026-12-05 Récupération'), r.courante, r.semaines[0]],
      'au 30 novembre : récupération du Trail du Lac jusqu\'au 4 décembre ; la frise part du début de la saison, la semaine en cours repérée'));
    await ctx.close();
    // Alertes, dans le bandeau de MyRunTools.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 5).statut = 'confirmee'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([['Alertes (1)', 'recup-affutage'], true, 1], [r.alertes, /^Ultra du Plateau : récupération jusqu'au .*17 août.*, sur l'affûtage de Trail des Crêtes$/.test(r.textesAlertes[0]), await p.locator('.ps-bandeau .ps-alerte').count()],
      'Ultra du Plateau confirmé : récupération dans l\'affûtage du Trail des Crêtes, l\'alerte dans le bandeau'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 7).date = '2027-05-02'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([['Alertes (1)', 'proches'], true, 'ph-developpement'], [r.alertes, r.textesAlertes[0] === 'Trail des Gorges et Trail des Crêtes : 8 semaines d\'écart (12 conseillées)', r.phases[3]],
      'données d\'avant le parcours, Trail des Crêtes au 2 mai : alerte Objectifs trop proches ; saison raccourcie, le 8 mars en développement'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 4).statut = 'confirmee'; course(d, 4).date = '2027-08-14'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([['Alertes (2)', 'recup-affutage', 'prepa-proche'], 'Trail des Cimes : à 14 jours de Trail des Crêtes (3 semaines conseillées)'], [r.alertes, r.textesAlertes[1]], 'Trail des Cimes au 14 août : Préparatoire trop proche et récupération dans l\'affûtage, en une ligne chacune'));
    await ctx.close();
    // Plan plus court que le minimum du format (trail long : 12 semaines) : dit dans la carte.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 3).prepa_semaines = 8; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    pb.push(egal('Plan court : 8 semaines (12 au minimum)', (await lire(p)).court, 'plan de 8 semaines pour un trail long : « Plan court » dans la carte'));
    await ctx.close();
    // L'Objectif a un parcours : le titre se coupe sans erreur et l'IA propose (une erreur dans le dessin empêchait la proposition).
    let erreursP;
    ({ p, ctx, erreurs: erreursP } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 3).parcours = 'Le grand'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif .ob-p');
    await p.waitForFunction(() => document.querySelector('.ps-bandeau'));
    pb.push(egal([[], true], [erreursP, (await p.textContent('.ps-titre')).includes('Le grand')], 'Objectif avec un parcours : aucune erreur JavaScript, le bandeau s\'affiche'));
    await ctx.close();
    // Sans Objectif : le parcours « Construire mon plan » (§ 5.0) à la place de la page.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { d.courses.forEach(c => { if (c.role === 'objectif' || c.role === 'objectif_intermediaire') c.role = 'preparatoire'; }); }), {}, PARIS));
    await p.waitForSelector('.pp[data-ecran="plan"]');
    pb.push(egal([0, 'Ton plan'], [await p.locator('.ps-sem').count(), await p.textContent('.pp .fc-libelle')], 'sans Objectif : le parcours, pas de frise'));
    await ctx.close();
    // Calendrier : la récupération d'un Objectif en rose (semaine du 8 mars), l'Entretien sans fond.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#mois=2027-03', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS));
    await p.waitForSelector('.cal-m2');
    pb.push(egal(['ph-affutage', 'ph-recuperation', true], await p.evaluate(() => {
      const c = j => document.querySelector('.cal-m2-case[data-jour="' + j + '"]'), cl = j => [...c(j).closest('.cal-m2-ligne').classList].find(x => x.startsWith('ph-')) || null;
      return [cl('2027-03-02'), cl('2027-03-09'), getComputedStyle(c('2027-03-09')).backgroundColor !== getComputedStyle(c('2027-03-02')).backgroundColor];
    }), 'Calendrier, mars 2027 : affûtage puis Récupération du Trail des Gorges, d\'une autre couleur'));
    await ctx.close();
    // Lecture seule : la vue s'affiche, sans réglages ni « + ».
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie(d => {
      d.courses = d.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
      d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
      d.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([true, 0, ['Exporter']], [/Trail des Gorges/.test(r.titre || ''), r.plus, r.reglages], 'lecture seule : la vue s\'affiche, seul « Exporter » dans les réglages, pas de « + »'));
    await ctx.close();
    return pb;
  },

  // Spécification Préparation, § 5.2 et 7 : profil d'entraînement (une liste, une question par écran, enregistrée à chaque choix),
  // séances enrichies (durée, distance, intensité).
  async preparationProfil(nav, db0) {
    const pb = [];
    const { db } = jeuObjectif(db0);
    const copie = f => { const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = d.seances || []; if (f) f(d); return d; };
    const etat = p => p.evaluate(() => (document.querySelector('.ps-profil-etat') || {}).textContent || null);
    const liste = p => p.evaluate(() => ({
      sections: [...document.querySelectorAll('.ps-profil .ps-section-t')].map(e => e.childNodes[0].textContent.trim()),
      feuille: !!document.querySelector('.mc-voile > .mc-panneau.ps-profil') && !!document.querySelector('.ps-profil .mrt-rond.is-fermer[data-fermer]') && !/Fermer/.test([...document.querySelectorAll('.ps-profil button')].map(b => b.textContent).join(' ')),
      compte: (document.querySelector('.ps-profil .ps-compte') || {}).textContent || null,
      lignes: [...document.querySelectorAll('.ps-profil .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent),
      aFaire: document.querySelectorAll('.ps-profil .ps-rep.is-a-faire').length,
      texte: document.querySelector('.ps-profil').textContent
    }));
    const derniere = d => { const e = d.ecritures.filter(x => x.table === 'profil_entrainement').pop(); return e && e.corps; };
    const sections = p => p.evaluate(() => [...document.querySelectorAll('.ps-profil .ps-section-t, .mp-cadre .ps-section-t')].map(e => e.childNodes[0].textContent.trim() + (e.querySelector('.ps-compte') ? ' ' + e.querySelector('.ps-compte').textContent : '')));
    const ligne = (r, debut) => r.lignes.find(l => l.startsWith(debut + ' |'));
    const mesures = d => Object.assign({}, ...d.ecritures.filter(x => x.table === 'profils' && x.methode === 'PATCH').map(x => x.corps));
    // Profil vide (seul le sexe est connu) : la feuille « Mon profil » depuis Mon plan, quatre sections, ce qui manque.
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await p.waitForSelector('.ps-ia-aide');
    pb.push(egal(['Pour que MyRunTools propose tes séances : Compléter mon profil', 0], [(await p.textContent('.ps-ia-aide')).trim(), await p.locator('.ps-reglages [data-profil]').count()], 'Mon plan : les cinq questions indispensables à l\'IA ; un seul accès au profil (le lien, pas le bouton « Mon profil »)'));
    await p.click('.ps-ia-aide [data-profil]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    let r = await liste(p);
    pb.push(egal([true, ['Moi 3 sur 7', 'Mon niveau 0 sur 4', 'Ma semaine 0 sur 1', 'Santé'], 'Mon profil', 9, 20, false],
      [r.feuille, await sections(p), await p.textContent('.ps-profil .fc-libelle'), r.aFaire, r.lignes.length, /\*/.test(r.texte)], 'feuille Mon profil : feuille d\'une course (croix ronde), quatre sections et leur compte, neuf lignes à renseigner, 20 lignes, ni astérisque'));
    pb.push(egal(['Sexe | Homme', 'Pointure | —', 'Course | À renseigner', 'FC de repos | —'], [ligne(r, 'Sexe'), ligne(r, 'Pointure'), ligne(r, 'Course'), ligne(r, 'FC de repos')], 'feuille : mesures lues dans le profil, facultatifs en « — »'));
    pb.push(egal('Dans ton Palmarès : Semi en 1:56:05 · Semi de San Sebastián, dim. 4 oct. 2026Reprendre', await p.evaluate(() => document.querySelector('.ps-profil .mp-palmares').textContent),
      'repère du Palmarès : la dernière course de 10 km ou semi de moins de 12 mois, avec « Reprendre »'));
    // Même taille pour la liste et chaque question ; le contenu glisse (par la droite à l'ouverture, par la gauche au retour).
    const largeur = () => p.evaluate(() => (r => Math.round(r.width) + 'x' + Math.round(r.height))(document.querySelector('.ps-profil').getBoundingClientRect()));
    const l0 = await largeur(), largeurs = [], glisses = [];
    for (const q of ['sexe', 'naissance', 'poids', 'activite', 'niveau', 'semaine', 'allure', 'terrain', 'fc_max', 'fragiles']) {
      await p.click('.ps-profil [data-q="' + q + '"]');
      glisses.push(await p.evaluate(() => document.querySelector('.ps-profil .mc-corps').className.includes('mc-glisse-avant')));
      largeurs.push(await largeur());
      await p.click('.ps-profil [data-q="liste"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    }
    pb.push(egal([true, true, true], [largeurs.every(x => x === l0), glisses.every(Boolean), await p.evaluate(() => document.querySelector('.ps-profil .mc-corps').className.includes('mc-glisse-retour'))],
      'profil sur ordinateur : même taille pour la liste et les questions, glissement vers la droite à l\'ouverture, vers la gauche au retour'));
    // Une question à choix : un toucher enregistre et revient à la liste.
    await p.click('.ps-profil [data-q="niveau"]');
    pb.push(egal(['Débutant · Tu cours depuis peu, jusqu\'à 10 km.', 'Intermédiaire · Tu cours chaque semaine, jusqu\'au semi ou à un trail court.', 'Confirmé · Marathon ou trails de plus de 40 km, entraînement suivi.', 'Expert · Entraînement structuré depuis des années, tu vises la performance.'],
      await p.evaluate(() => [...document.querySelectorAll('.ps-profil .ps-choix')].map(b => b.querySelector('.ps-choix-t').childNodes[0].textContent + ' · ' + b.querySelector('small').textContent)), 'Niveau : quatre choix, chacun avec sa ligne'));
    await p.click('.ps-profil [data-val="intermediaire"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal([{ niveau: 'intermediaire' }, 'Niveau | Intermédiaire', 'Mon niveau 1 sur 4'], [(c => c && { niveau: c.niveau })(derniere(d)), ligne(await liste(p), 'Niveau'), (await sections(p))[1]], 'choix enregistré aussitôt, retour à la liste'));
    await p.click('.ps-profil [data-q="volume_tranche"]'); await p.click('.ps-profil [data-val="inconnu"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.click('.ps-profil [data-q="sortie_tranche"]'); await p.click('.ps-profil [data-val="1h30-2h"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    // Ma semaine : jours pour courir (mardi, jeudi, samedi, dimanche), 3 séances, sortie longue le dimanche puis le dimanche retiré
    // (sortie longue : peu importe) ; renforcement mardi et jeudi (cumul avec la course), 1 par semaine.
    await p.click('.ps-profil [data-q="semaine"]');
    const tap = async sel => { await p.click('.ps-profil ' + sel); await pause(); };
    for (const j of [2, 4, 6, 7]) await tap('[data-jc="' + j + '"]');
    const chiffre = async (nom, v) => { await p.fill('.ps-profil [name="' + nom + '"]', v); await pause(); };
    const avant = JSON.stringify(derniere(d));
    await chiffre('nb_sorties', '8'); await p.click('.ps-profil [data-enregistrer]'); await pause();
    pb.push(egal(['Un chiffre de 0 à 7.', avant], [await p.textContent('.ps-profil .ps-msg'), JSON.stringify(derniere(d))], 'nombre de séances : 8 refusé, rien d\'enregistré'));
    await chiffre('nb_sorties', '3'); await tap('[data-long="7"]');
    await tap('[data-jc="7"]');
    pb.push(egal([avant, 'Ma semaine'], [JSON.stringify(derniere(d)), await p.textContent('.ps-profil .fc-libelle')], 'ma semaine : rien d\'enregistré avant « Enregistrer »'));
    await tap('[data-long="6"]'); await tap('[data-jr="2"]'); await tap('[data-jr="4"]'); await chiffre('nb_renfo', '7');
    await chiffre('nb_renfo', '1');
    await p.click('.ps-profil [data-enregistrer]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    const sem = derniere(d) || {};
    pb.push(egal([[2, 4, 6], [2, 4], 3, 1, 6], [sem.jours_course, sem.jours_renfo, sem.nb_sorties, sem.nb_renfo, sem.jour_long], 'ma semaine enregistrée d\'un coup par « Enregistrer », retour à la liste ; sortie longue ramenée à « peu importe » si son jour est retiré ; course et renforcement le même jour possibles'));
    // Repère d'allure : VMA refusée hors bornes, puis un temps sur 10 km ; puis « Reprendre » le semi du Palmarès.
    await p.click('.ps-profil [data-q="allure"]'); await p.click('.ps-profil [data-type="vma"]');
    await p.fill('.ps-profil [name="valeur"]', '35'); await p.click('.ps-profil .ps-valeur [type="submit"]');
    pb.push(egal('La VMA doit être comprise entre 8 et 30 km/h.', await p.textContent('.ps-profil .ps-msg'), 'VMA à 35 refusée'));
    await p.click('.ps-profil [data-type="10km"]'); await p.fill('.ps-profil [name="valeur"]', '45:30'); await p.click('.ps-profil .ps-valeur [type="submit"]');
    await p.waitForSelector('.ps-profil .ps-ligne-q');
    r = await liste(p);
    pb.push(egal(['Mon niveau 4 sur 4', 'Ma semaine 1 sur 1', 'Repère d\'allure | 10 km en 45:30', 'Course | mar., jeu., sam. · 3 séances, longue le samedi', 'Renforcement | mar., jeu. · 1 séance', 'Distance moyenne par semaine | Aucune idée'],
      [(await sections(p))[1], (await sections(p))[2], ligne(r, 'Repère d\'allure'), ligne(r, 'Course'), ligne(r, 'Renforcement'), ligne(r, 'Distance moyenne par semaine')], 'niveau et semaine complets, résumés à droite'));
    pb.push(egal({ allure_type: '10km', temps_10km_s: 2730 }, (c => c && { allure_type: c.allure_type, temps_10km_s: c.temps_10km_s })(derniere(d)), 'repère d\'allure : 10 km en 2 730 secondes'));
    await p.click('.ps-profil [data-reprendre]'); await p.waitForFunction(() => !document.querySelector('.ps-profil .mp-palmares'));
    pb.push(egal([{ allure_type: 'semi', temps_semi_s: 6965 }, 'Repère d\'allure | Semi en 1:56:05'], [(c => c && { allure_type: c.allure_type, temps_semi_s: c.temps_semi_s })(derniere(d)), ligne(await liste(p), 'Repère d\'allure')], '« Reprendre » : le temps du semi du Palmarès devient le repère d\'allure ; la suggestion disparaît'));
    // Facultatif : terrains ; Santé : FC max, FC de repos, points fragiles.
    await p.click('.ps-profil [data-q="terrain"]'); await p.click('.ps-profil [data-val="vallonne"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    const valeur = async (q, v, attendre = true) => { await p.click('.ps-profil [data-q="' + q + '"]'); await p.fill('.ps-profil [name="valeur"]', v); await p.click('.ps-profil .ps-valeur [type="submit"]'); if (attendre) await p.waitForSelector('.ps-profil .ps-ligne-q'); else await pause(); };
    await valeur('fc_max', '250', false);
    pb.push(egal('La FC max doit être comprise entre 100 et 230.', await p.textContent('.ps-profil .ps-msg'), 'FC max à 250 refusée'));
    await p.fill('.ps-profil [name="valeur"]', '186'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await valeur('fc_repos', '52');
    await valeur('fragiles', 'tendon d\'Achille gauche');
    // Blessure en cours : texte et date de début (pas dans le futur) ; « Plus de blessure » l'efface.
    await p.click('.ps-profil [data-q="blessure"]'); await p.fill('.ps-profil [name="blessure"]', 'entorse de la cheville droite'); await p.fill('.ps-profil [name="debut"]', '2026-12-01'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await pause();
    pb.push(egal('La date de début ne peut pas être dans le futur.', await p.textContent('.ps-profil .ps-msg'), 'blessure : début dans le futur refusé'));
    await p.fill('.ps-profil [name="debut"]', '2026-10-12'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal(['Blessure en cours | entorse de la cheville droite, depuis le 12 oct.', { blessure: 'entorse de la cheville droite', blessure_debut: '2026-10-12' }], [ligne(await liste(p), 'Blessure en cours'), (c => c && { blessure: c.blessure, blessure_debut: c.blessure_debut })(derniere(d))], 'blessure en cours enregistrée avec le niveau'));
    await p.click('.ps-profil [data-q="blessure"]'); await p.click('.ps-profil [data-guerie]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal(['Blessure en cours | —', null], [ligne(await liste(p), 'Blessure en cours'), (derniere(d) || {}).blessure], '« Plus de blessure » : effacée'));
    // Moi : naissance, poids (virgule), taille, activité ; pointure en demi-pointures.
    await p.click('.ps-profil [data-q="naissance"]'); await dateTrois(p, '.ps-profil', 'valeur', '2031-01-01'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await pause();
    pb.push(egal('Cette date de naissance n\'est pas possible.', await p.textContent('.ps-profil .ps-msg'), 'naissance impossible refusée'));
    await p.fill('.ps-profil [name="valeur_j"]', '31'); await p.selectOption('.ps-profil [name="valeur_m"]', '2'); await p.fill('.ps-profil [name="valeur_a"]', '1985');
    await p.click('.ps-profil .ps-valeur [type="submit"]'); await pause();
    pb.push(egal('Cette date de naissance n\'est pas possible.', await p.textContent('.ps-profil .ps-msg'), 'naissance : 31 février refusé'));
    await dateTrois(p, '.ps-profil', 'valeur', '1985-03-12'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await valeur('poids', '72,4'); await valeur('taille', '178');
    await valeur('pointure', '42,3', false);
    pb.push(egal('La pointure doit être comprise entre 30 et 55 (demi-pointures acceptées).', await p.textContent('.ps-profil .ps-msg'), 'pointure 42,3 refusée'));
    await p.fill('.ps-profil [name="valeur"]', '42,5'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.click('.ps-profil [data-q="activite"]'); await p.click('.ps-profil [data-val="peu"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    r = await liste(p);
    pb.push(egal([['Moi 7 sur 7', 'Mon niveau 4 sur 4', 'Ma semaine 1 sur 1', 'Santé'], 0, ['Date de naissance | 12 mars 1985', 'Poids | 72,4 kg', 'Taille | 178 cm', 'Activité hors sport | Peu actif', 'Pointure | 42,5', 'FC max | 186 bpm', 'FC de repos | 52 bpm', 'Points fragiles et blessures passées | tendon d\'Achille gauche', 'Terrains d\'entraînement | Vallonné']],
      [await sections(p), r.aFaire, ['Date de naissance', 'Poids', 'Taille', 'Activité hors sport', 'Pointure', 'FC max', 'FC de repos', 'Points fragiles et blessures passées', 'Terrains d\'entraînement'].map(x => ligne(r, x))], 'profil complet : résumés de toutes les sections'));
    pb.push(egal({ fc_repos: 52, naissance: '1985-03-12', poids: 72.4, taille: 178, pointure: 42.5, activite: 'peu' }, mesures(d), 'mesures rangées dans le profil (naissance, poids, taille, pointure, FC de repos, activité)'),
      egal([186, 'tendon d\'Achille gauche'], (c => c && [c.fc_max, c.fragiles])(derniere(d)), 'FC max et points fragiles rangés avec le niveau'));
    await p.click('.ps-profil [data-fermer]');
    pb.push(egal(0, await p.locator('.ps-ia-aide').count(), 'profil complet : plus de « Compléter mon profil » sur la page Mon plan'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();
    // Page Mon profil : l'état de tout le profil, les quatre sections ; une ligne ouvre sa question seule (sans « ‹ »), l'enregistrement ferme la feuille.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'profil.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.mp-cadre .ps-ligne-q');
    pb.push(egal([0, ['Moi 3 sur 7', 'Mon niveau 0 sur 4', 'Ma semaine 0 sur 1', 'Santé', 'Mon matériel', 'Connexions'], 'Mon profil', 'Mon profil', 1],
      [await p.locator('.mp-etat, .ps-profil-etat, .mp-msg').count(), await sections(p), (await p.textContent('.mrt-tab.is-on')).trim(), await p.evaluate(() => document.title.split(' · ')[0]), await p.locator('.mp-cadre .mp-palmares').count()], 'page Mon profil : pas de ligne d\'état, sections, onglet et titre, repère du Palmarès'));
    await p.click('.mp-cadre [data-q="taille"]'); await p.waitForSelector('.ps-profil [name="valeur"]');
    pb.push(egal([0, 1, 'Taille'], [await p.locator('.ps-profil [data-q="liste"]').count(), await p.locator('.ps-profil [data-fermer]').count(), await p.textContent('.ps-profil .fc-libelle')], 'page : une question seule dans la feuille, croix sans « ‹ »'));
    // Petite feuille (comme Nutrition) : 30 rem de large au plus, hauteur selon le contenu.
    pb.push(egal([true, true], await p.evaluate(() => { const r = document.querySelector('.ps-profil').getBoundingClientRect(); return [r.width <= 482, r.height < 400]; }), 'page : question seule dans une petite feuille (30 rem au plus, hauteur du contenu)'));
    await p.fill('.ps-profil [name="valeur"]', '181'); await p.click('.ps-profil .ps-valeur [type="submit"]');
    await p.waitForSelector('.ps-profil', { state: 'detached' });
    pb.push(egal(['Taille | 181 cm', 'Moi 4 sur 7', { taille: 181 }], [await p.evaluate(() => [...document.querySelectorAll('.mp-cadre .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent).find(l => l.startsWith('Taille'))), (await sections(p))[0], mesures(d)], 'page : enregistrer ferme la feuille, la page se met à jour'));
    await p.waitForTimeout(450);
    // Clic qui traverse : la croix ferme la feuille ; un second clic aussitôt au même endroit (sur la ligne dessous) n'ouvre rien.
    await p.click('.mp-cadre [data-q="prenom"]'); await p.waitForSelector('.ps-profil [data-fermer]'); await p.waitForTimeout(400);
    const rx = await p.locator('.ps-profil [data-fermer]').boundingBox();
    await p.mouse.click(rx.x + rx.width / 2, rx.y + rx.height / 2);
    const dessous = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const q = e && e.closest('[data-q]'); return q ? q.dataset.q : null; }, [rx.x + rx.width / 2, rx.y + rx.height / 2]);
    await p.mouse.click(rx.x + rx.width / 2, rx.y + rx.height / 2); await p.waitForTimeout(300);
    pb.push(egal([true, 0], [!!dessous, await p.locator('.ps-profil').count()], 'croix puis clic aussitôt : la croix est au-dessus d\'une ligne de la liste, aucune question ne s\'ouvre dessous'));
    if (await p.locator('.ps-profil').count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(200); }
    await p.waitForTimeout(450);
    // Prénom (compte créé à la main sans prénom) : vide refusé, enregistré dans `profils` (après une pause : juste après une fermeture, la page ignore les clics).
    await p.waitForTimeout(450); await p.click('.mp-cadre [data-q="prenom"]'); await p.waitForSelector('.ps-profil [name="valeur"]');
    await p.fill('.ps-profil [name="valeur"]', '  '); await p.click('.ps-profil .ps-valeur [type="submit"]');
    const videPrenom = await p.textContent('.ps-profil .ps-msg');
    await p.fill('.ps-profil [name="valeur"]', ' Camille '); await p.click('.ps-profil .ps-valeur [type="submit"]');
    await p.waitForSelector('.ps-profil', { state: 'detached' });
    pb.push(egal(['Le prénom ne peut pas être vide.', 'Prénom | Camille'], [videPrenom, await p.evaluate(() => [...document.querySelectorAll('.mp-cadre .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent)[0])],
      'page : prénom vide refusé, « Camille » enregistré'));
    await p.click('.mp-cadre [data-reprendre]'); await p.waitForFunction(() => !document.querySelector('.mp-cadre .mp-palmares'));
    pb.push(egal({ allure_type: 'semi', temps_semi_s: 6965 }, (c => c && { allure_type: c.allure_type, temps_semi_s: c.temps_semi_s })(derniere(d)), 'page : « Reprendre » range le repère du Palmarès'));
    pb.push(egal([], erreurs, 'page Mon profil : erreurs JavaScript'));
    await ctx.close();
    // Mon profil au menu par défaut : sixième onglet ; téléphone sans débordement.
    ({ p, ctx } = await ouvrir(nav, 'profil.html', 390, copie(), {}, PARIS));
    await p.waitForSelector('.mp-cadre .ps-ligne-q');
    pb.push(egal([true, false], [await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].some(t => (t.getAttribute('aria-label') || t.textContent).trim() === 'Mon profil')), await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)], 'téléphone : onglet Mon profil, page sans débordement'));
    // Téléphone : la question monte du bas, à la hauteur de son contenu.
    await p.click('.mp-cadre [data-q="sexe"]'); await p.waitForSelector('.ps-profil .ps-choix'); await p.waitForTimeout(400);
    pb.push(egal([true, true], await p.evaluate(() => { const r = document.querySelector('.ps-profil').getBoundingClientRect(); return [Math.abs(r.bottom - innerHeight) < 2, r.height < innerHeight * 0.6]; }), 'téléphone : question en feuille du bas, à la hauteur du contenu'));
    await ctx.close();
    // Séance : durée, distance, intensité facultatives.
    d = copie();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, d, {}, PARIS));
    await p.click('[data-ajout="2026-10-21"]');
    await p.fill('.cal-seance [name="distance"]', '0');
    await p.click('.cal-seance button[type="submit"]');
    pb.push(egal('La distance doit être comprise entre 0,1 et 999 km.', await p.textContent('.cal-msg'), 'séance : distance à 0 refusée'));
    await p.fill('.cal-seance [name="distance"]', '8,5'); await p.fill('.cal-seance [name="duree"]', '45'); await p.selectOption('.cal-seance [name="intensite"]', 'facile');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile'));
    const s = d.seances[d.seances.length - 1];
    pb.push(egal({ libelle: 'Endurance', duree_min: 45, distance_km: 8.5, intensite: 'facile' }, s && { libelle: s.libelle, duree_min: s.duree_min, distance_km: s.distance_km, intensite: s.intensite },
      'séance : durée, distance (virgule acceptée) et intensité enregistrées'));
    await ctx.close();
    // Ajout d'une séance (27 nov. 2026) : bascule Faite / À faire d'après la date ; faite = le réalisé saisi une fois, sans prévu.
    d = copie();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, d, {}, PARIS));
    await p.click('[data-ajout="2026-10-21"]'); await p.waitForSelector('.cal-seance [data-quand]');
    const etatAjout = () => p.evaluate(() => ({ choix: document.querySelector('.cal-quand [aria-pressed="true"]').textContent, prevu: !document.querySelector('.cal-prevu-bloc').hidden, retour: !document.querySelector('.cal-seance .cal-retour').hidden, case: !!document.querySelector('.cal-faite') }));
    pb.push(egal({ choix: 'À faire', prevu: true, retour: false, case: false }, await etatAjout(), 'ajout un jour à venir : « À faire », le prévu seul, ni ressenti ni case « Faite »'));
    await p.fill('.cal-seance [name="date"]', '2026-10-15');
    pb.push(egal({ choix: 'Faite', prevu: false, retour: true, case: false }, await etatAjout(), 'ajout : la date passée bascule sur « Faite » (le réalisé seul)'));
    await p.click('.cal-quand [data-quand="avenir"]'); await p.fill('.cal-seance [name="date"]', '2026-10-14');
    pb.push(egal('À faire', (await etatAjout()).choix, 'ajout : un choix fait à la main n\'est plus changé par la date'));
    await p.click('.cal-quand [data-quand="passee"]');
    await p.selectOption('.cal-seance [name="nom"]', 'Vélo');
    await p.fill('.cal-seance [name="duree_reelle"]', '90'); await p.fill('.cal-seance [name="distance_reelle"]', '31,5'); await p.fill('.cal-seance [name="fc_moyenne"]', '130');
    pb.push(egal('Vitesse moyenne : 21 km/h', await p.textContent('.cal-allure'), 'vélo : vitesse moyenne du réalisé'));
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile'));
    const sv = d.seances[d.seances.length - 1];
    pb.push(egal({ type: 'velo', libelle: 'Vélo', faite: true, duree_min: 90, duree_reelle_min: 90, distance_km: 31.5, distance_reelle_km: 31.5, intensite: null, fc_moyenne: 130 },
      sv && { type: sv.type, libelle: sv.libelle, faite: sv.faite, duree_min: sv.duree_min, duree_reelle_min: sv.duree_reelle_min, distance_km: sv.distance_km, distance_reelle_km: sv.distance_reelle_km, intensite: sv.intensite, fc_moyenne: sv.fc_moyenne },
      'séance passée de vélo : le réalisé saisi une fois (faite, sans intensité prévue)'));
    await p.click('[data-ajout="2026-10-22"]'); await p.waitForSelector('.cal-seance [data-quand]');
    await p.selectOption('.cal-seance [name="nom"]', 'Danse');
    pb.push(egal([0, true], [await p.locator('.cal-seance .cal-seul-course:visible').count(), await p.locator('.cal-seance [name="duree"]').isVisible()], 'danse : durée seulement, ni distance ni D+'));
    await p.fill('.cal-seance [name="duree"]', '60');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile'));
    const sd = d.seances[d.seances.length - 1];
    pb.push(egal({ type: 'danse', libelle: 'Danse', faite: false, duree_min: 60, distance_km: null }, sd && { type: sd.type, libelle: sd.libelle, faite: sd.faite, duree_min: sd.duree_min, distance_km: sd.distance_km }, 'séance de danse à venir : type danse, 60 min'));
    await ctx.close();
    // Retour sur une séance (lot 6a) : faite, ressenti, douleur (et où), fatigue, commentaire ; durée et distance dans la vue, picto du commentaire.
    d = copie(x => { x.seances = [{ id: 'se-r', utilisateur: x.profils[0].id, date: '2026-10-21', type: 'run', libelle: 'Seuil', faite: false, course: null, duree_min: 60, distance_km: 11, intensite: 'intense', origine: 'saisie', etat: 'acceptee' },
      { id: 'se-f', utilisateur: x.profils[0].id, date: '2026-10-28', type: 'run', libelle: 'Endurance', faite: false, course: null, duree_min: 45, distance_km: 8, intensite: 'facile', origine: 'saisie', etat: 'acceptee' }]; });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html', 1200, d, {}, PARIS));
    await p.waitForSelector('[data-drag="se-r"]');
    pb.push(egal([1, 0], [await p.locator('[data-carte="se-f"]').count(), await p.locator('[data-drag="se-f"]').count()], 'séance d\'une semaine suivante : toute la tuile cliquable, sans glisser'));
    pb.push(egal(['SeuilCourse à pied · 1 h · 11 km', 1, 0], await p.evaluate(() => { const e = document.querySelector('[data-drag="se-r"]'); return [e.textContent.replace(/\s+/g, ' ').trim(), e.querySelectorAll('.cal-int.i-intense .on').length === 3 ? 1 : 0, e.querySelectorAll('.cal-v-com').length]; }),
      'vue en carte : le nom, dessous le type, la durée et la distance ; trois traits d\'intensité (intense), pas de picto sans commentaire'));
    await p.click('[data-edit="se-r"]'); await p.waitForSelector('.cal-seance .cal-retour');
    pb.push(egal([true, 'Ressenti'], [await p.evaluate(() => document.querySelector('.cal-si-faite').hidden), await p.textContent('.cal-retour .mrt-section-titre')], 'fenêtre : « Retour sur la séance », ressenti caché tant qu\'elle n\'est pas faite'));
    await p.check('.cal-seance [name="faite"]');
    await p.fill('.cal-seance .cal-curseur', '7'); await p.click('.cal-seance [data-groupe="sensations"] [data-val="2"]'); await p.click('.cal-seance [data-groupe="douleur"] [data-val="legere"]');
    pb.push(egal('7 · Seuil, allure semi-marathon ou 10 km : effort soutenu et inconfortable ; quelques mots isolés. Charge : 420 UA.', (await p.textContent('.cal-ressenti-lib')).replace(/\u00a0/g, ' '), 'ressenti 7 : libellé du niveau et charge (7 × 60 min)'));
    await p.fill('.cal-seance [name="douleur_ou"]', 'genou droit');
    await p.fill('.cal-seance [name="commentaire"]', 'Dur sur la fin');
    pb.push(egal([false, false, '14/300'], [await p.evaluate(() => document.querySelector('.cal-si-faite').hidden), await p.evaluate(() => document.querySelector('.cal-douleur-ou').hidden), await p.textContent('.cal-compteur')], 'faite : ressenti affiché ; douleur légère : « Où » ; compteur du commentaire'));
    // L'effort noté ouvre l'analyse de l'IA ; puis le conseil d'un déplacement, refusé.
    let question = null, reponse = true;
    await surDialogue(p, q => { question = q; return reponse; });
    d.ecritures = [];
    await p.click('.cal-seance button[type="submit"]'); await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    // L'effort est noté : la feuille d'analyse s'ouvre ; sans réponse de l'IA (fonction absente dans l'essai), son message, puis la croix la ferme.
    await p.waitForSelector('.cal-feuille-retour .cal-msg');
    pb.push(egal('Analyse impossible pour l\'instant, réessaie plus tard.', await p.textContent('.cal-feuille-retour .cal-msg'), 'effort noté : feuille d\'analyse, message quand l\'IA ne répond pas'));
    await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' });
    const ecrit = () => d.ecritures.filter(x => x.table === 'seances' && x.methode === 'PATCH').map(x => x.corps);
    pb.push(egal({ faite: true, ressenti: 7, sensations: 2, douleur: 'legere', douleur_ou: 'genou droit', fatigue: undefined, commentaire: 'Dur sur la fin', date_prevue: null },
      (c => c && { faite: c.faite, ressenti: c.ressenti, sensations: c.sensations, douleur: c.douleur, douleur_ou: c.douleur_ou, fatigue: c.fatigue, commentaire: c.commentaire, date_prevue: c.date_prevue })(ecrit()[0]), 'retour enregistré avec la séance'));
    await p.waitForSelector('[data-drag="se-r"] .cal-v-com');
    pb.push(egal(1, await p.locator('[data-drag="se-r"] .cal-v-com').count(), 'vue : picto du commentaire'));
    // Déplacer par la fenêtre vers la veille d'une Plaisir (sam. 12 déc.) : le conseil ; « Revenir au jour d'avant » remet la séance.
    question = null; reponse = false;
    d.ecritures = [];
    await p.click('[data-edit="se-r"]'); await p.waitForSelector('.cal-seance');
    await p.fill('.cal-seance [name="date"]', '2026-12-12'); await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause(); await pause();
    pb.push(egal(['Conseil : c\'est la veille d\'une course Plaisir : repos conseillé.', [{ date: '2026-12-12', date_prevue: '2026-10-21' }, { date: '2026-10-21', date_prevue: null }]],
      [question, ecrit().map(c => ({ date: c.date, date_prevue: c.date_prevue }))], 'déplacement contraire à une règle : conseil, puis « Revenir au jour d\'avant »'));
    // Glisser la séance au vendredi 23 (aucune règle enfreinte) : déplacée, jour d'origine gardé, pas de conseil.
    question = null; d.ecritures = [];
    await p.dragAndDrop('[data-drag="se-r"]', '[data-jour-ligne="2026-10-23"]'); await pause(); await pause();
    pb.push(egal([null, [{ date: '2026-10-23', date_prevue: '2026-10-21' }]], [question, ecrit().map(c => ({ date: c.date, date_prevue: c.date_prevue }))], 'glisser : séance déplacée, jour d\'origine gardé, pas de conseil'));
    // Glisser vers la semaine suivante : refusé (on ne déplace que dans la semaine en cours, du lundi au dimanche).
    d.ecritures = [];
    await p.dragAndDrop('[data-drag="se-r"]', '[data-jour-ligne="2026-10-27"]'); await pause();
    pb.push(egal(0, ecrit().length, 'glisser hors de la semaine en cours : refusé, aucune écriture'));
    // Cocher « faite » dans la vue : la feuille « Effort et sensations » ; « Plus tard » la ferme sans rien ranger ; puis effort et sensations enregistrés.
    await p.evaluate(() => { const c = document.querySelector('[data-fait="se-r"]'); if (c.checked) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); } }); await pause();
    d.ecritures = [];
    await p.check('[data-fait="se-r"]'); await p.waitForSelector('.cal-feuille-retour');
    pb.push(egal(['Course à pied · ven. 23 oct.', '7 · Seuil, allure semi-marathon ou 10 km : effort soutenu et inconfortable ; quelques mots isolés. Charge : 420 UA.', 5, 1], [(await p.textContent('.cal-feuille-retour .fc-libelle')).replace(/\u00a0/g, ' '), await p.textContent('.cal-feuille-retour .cal-ressenti-lib'),
      await p.locator('.cal-feuille-retour .cal-visage-b').count(), await p.locator('.cal-feuille-retour .mc-pied .is-principal').count()], 'cocher « faite » : la feuille, l\'effort déjà noté repris, cinq visages, « Enregistrer » collé en bas'));
    pb.push(egal([0, 0, 5, 1], [await p.locator('.cal-feuille-retour .cal-plus-tard, .cal-feuille-retour .cal-sans-note').count(), await p.locator('.cal-feuille-retour [data-groupe="fatigue"]').count(),
      await p.locator('.cal-feuille-retour [name="duree_reelle"], .cal-feuille-retour [name="distance_reelle"], .cal-feuille-retour [name="denivele_reel"], .cal-feuille-retour [name="fc_moyenne"], .cal-feuille-retour [name="fc_max"]').count(), await p.evaluate(() => [...document.querySelectorAll('.cal-feuille-retour [data-groupe="douleur"] [aria-pressed="true"]')].map(b => b.textContent).join() === 'Légère' && !document.querySelector('.cal-feuille-retour .cal-douleur-ou').hidden ? 1 : 0)], 'feuille : ni « Plus tard », ni « Ne pas noter », ni fatigue ; le bloc « Réalisé » (durée, distance, D+, FC moyenne et max) comme dans la fenêtre de la séance ; douleur déjà notée reprise, avec « Où »'));
    await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); await pause();
    pb.push(egal([{ faite: true }], ecrit(), 'la croix : seule la case « faite » est rangée'));
    await p.evaluate(() => { const c = document.querySelector('[data-fait="se-r"]'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); await pause();
    d.ecritures = [];
    await p.check('[data-fait="se-r"]'); await p.waitForSelector('.cal-feuille-retour');
    await p.fill('.cal-feuille-retour .cal-curseur', '4'); await p.click('.cal-feuille-retour [data-groupe="sensations"] [data-val="1"]');
    pb.push(egal('4 · Endurance fondamentale : allure confortable, conversation complète sans essoufflement. Charge : 240 UA.', (await p.textContent('.cal-feuille-retour .cal-ressenti-lib')).replace(/ /g, ' '), 'feuille : libellé et charge au glissement'));
    question = null; reponse = true;
    await p.click('.cal-feuille-retour [data-info="sensations"]');
    for (let k = 0; k < 10 && !question; k++) await pause();
    pb.push(egal(true, (question || '').includes('indépendantes de l\'effort'), 'rond « i » : l\'explication des sensations'));
    await p.waitForFunction(() => !document.querySelector('.mrt-dialogue'));
    await p.click('.cal-feuille-retour .mc-pied .is-principal'); await p.waitForSelector('.cal-feuille-retour .cal-analyse'); // la feuille passe à l'analyse de l'IA
    await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); await pause();
    pb.push(egal({ ressenti: 4, sensations: 1 }, (c => c && { ressenti: c.ressenti, sensations: c.sensations })(ecrit()[1]), 'feuille : effort et sensations enregistrés'));
    // En tête de la feuille : le type et le jour, puis le nom de la séance (avant « : ») et son détail (après).
    await p.evaluate(() => window.mrtPreparation.feuilleRetour({}, { id: 'x', type: 'run', libelle: 'Côtes : échauffement, 8 x 1 min en côte, retour au trot', date: '2026-11-13' }));
    pb.push(egal(['Course à pied · ven. 13 nov.', 'Côtes', 'Échauffement, 8 x 1 min en côte, retour au trot'], [(await p.textContent('.cal-feuille-retour .fc-libelle')).replace(/\u00a0/g, ' '), await p.textContent('.cal-retour-nom'), await p.textContent('.cal-retour-detail')],
      'feuille : type et jour en libellé, nom de la séance, détail dessous'));
    await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' });
    pb.push(egal([], erreurs, 'retour sur une séance : erreurs JavaScript'));
    await ctx.close();
    // Faite sans effort noté : « à noter » dans la vue (pas sur une séance notée ni non faite) ; le toucher rouvre la feuille.
    {
      const dn = copie(x => { x.seances = [
        { id: 'se-n', utilisateur: x.profils[0].id, date: '2026-10-21', type: 'run', libelle: 'Footing', faite: true, ressenti: null, course: null, origine: 'saisie', etat: 'acceptee' },
        { id: 'se-o', utilisateur: x.profils[0].id, date: '2026-10-22', type: 'run', libelle: 'Seuil', faite: true, ressenti: 6, course: null, origine: 'saisie', etat: 'acceptee' },
        { id: 'se-p', utilisateur: x.profils[0].id, date: '2026-10-23', type: 'run', libelle: 'Côtes', faite: false, course: null, origine: 'saisie', etat: 'acceptee' }]; });
      const q = await ouvrir(nav, 'calendrier.html', 1200, dn, {}, PARIS);
      await q.p.waitForSelector('[data-drag="se-n"]');
      pb.push(egal(['se-n'], await q.p.evaluate(() => [...document.querySelectorAll('[data-noter]')].map(b => b.dataset.noter)), '« à noter » : seulement sur la séance faite sans effort noté'));
      await q.p.click('[data-noter="se-n"]'); await q.p.waitForSelector('.cal-feuille-retour');
      pb.push(egal(['Footing', 'Aucune', true], [await q.p.textContent('.cal-retour-nom'), await q.p.evaluate(() => document.querySelector('.cal-feuille-retour [data-groupe="douleur"] [aria-pressed="true"]').textContent), await q.p.evaluate(() => document.querySelector('.cal-feuille-retour .cal-douleur-ou').hidden)],
      '« à noter » rouvre la feuille de la séance ; douleur « Aucune » d\'office, sans « Où »'));
      pb.push(egal([], q.erreurs, '« à noter » : erreurs JavaScript'));
      await q.ctx.close();
    }
    // Site partagé : ni bouton ni état du profil.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie(x => {
      x.courses = x.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
      x.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
      x.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await p.waitForSelector('.ps-cadre');
    pb.push(egal(0, await p.locator('[data-profil], .ps-profil-etat').count(), 'lecture seule : pas de profil'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'profil.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await p.waitForSelector('.mp-cadre');
    pb.push(egal(['Le profil n\'est pas partagé.', 0], [await p.textContent('.mp-vide'), await p.locator('.ps-ligne-q').count()], 'lecture seule : la page Mon profil ne montre rien'));
    await ctx.close();
    // Téléphone : la liste et la semaine type tiennent dans l'écran.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 390, copie(), {}, PARIS));
    await reglage(p, '[data-profil]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    const deborde = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.querySelector('.ps-profil').scrollWidth > document.querySelector('.ps-profil').clientWidth);
    const l1 = await deborde();
    await p.click('.ps-profil [data-q="semaine"]');
    pb.push(egal([false, false], [l1, await deborde()], 'téléphone : liste et semaine type sans débordement'));
    await ctx.close();
    return pb;
  },

  // Spécification Préparation, § 6 (lot 3) : séances proposées par l'IA ; l'appel est remplacé par des réponses fixes, sans coût.
  // Construire mon plan (spécification Préparation, § 5.0) : le parcours, écran par écran ; le chevauchement de deux Objectifs ;
  // la préparatoire pertinente (règles fixes) ; les questions déjà répondues sautées.
  async preparationParcours(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const COMPLET = { utilisateur: moi, niveau: 'intermediaire', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 4, 6], nb_sorties: 3, jour_long: 6, allure_type: '10km', temps_10km_s: 2730 };
    const copie = f => {
      const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = []; d.reglages = { plafondIA: 4 }; d.appels = [];
      d.relais = corps => { d.appels.push(corps); return { status: 200, body: { id: 'prop-1', reponse: { recommandation: 'Entretien.', seances: [] } } }; };
      if (f) f(d);
      return d;
    };
    const sansObjectif = d => d.courses.forEach(c => { if (c.role === 'objectif' || c.role === 'objectif_intermediaire') c.role = 'preparatoire'; });
    const ecran = p => p.evaluate(() => { const e = document.querySelector('.pp'); return e ? e.dataset.ecran : null; });
    const vers = async (p, k) => { await p.waitForFunction(k => (document.querySelector('.pp') || {}).dataset && document.querySelector('.pp').dataset.ecran === k, k); };
    const choix = p => p.evaluate(() => [...document.querySelectorAll('.pp .ps-choix')].map(b => b.textContent.replace('✓', '').replace(/\s+/g, ' ').trim() + (b.disabled ? ' [inactif]' : '')));
    const msg = p => p.evaluate(() => document.querySelector('.pp .ps-msg').textContent);
    const prog = p => p.evaluate(() => Number(document.querySelector('.pp-prog').getAttribute('aria-valuenow')));
    // 1. Sans Objectif : la page est le parcours ; ni retour ni croix au premier écran.
    let d = copie(sansObjectif);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await vers(p, 'plan');
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-plan.png') });
    pb.push(egal([['Une course ou un trail', 'Me maintenir en formeBientôt [inactif]'], 0, 0, 0],
      [await choix(p), await p.locator('.pp [data-pp="retour"]').count(), await p.locator('.pp [data-pp="fermer"]').count(), await prog(p)], 'écran 1 : deux plans, « Me maintenir en forme » inactif ; ni retour ni croix'));
    pb.push(egal('Quel est ton objectif ?', (await p.textContent('.pp .pp-invite')).trim(), 'écran 1 : la phrase d\'invite sous le titre'));
    await p.click('[data-plan="course"]'); await vers(p, 'course');
    const confirmees = await choix(p);
    await p.click('[data-filtre="toutes"]'); await pause();
    const toutes = await choix(p);
    pb.push(egal([['Trail du Lacdim. 15 nov. 2026 · 24 km · 650 m D+', 'Corrida de Noëldim. 13 déc. 2026 · 10 km · 40 m D+', 'Trail des Gorgesdim. 7 mars 2027 · 45 km · 2 100 m D+', 'Trail des Crêtessam. 28 août 2027 · 60 km · 3 500 m D+'],
      ['Trail du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Trail des Cimes', 'Ultra du Plateau', 'Trail de la Forêtdate à préciser', 'Trail des Crêtes', 'Trail des Sommets'], 1],
      [confirmees, toutes.map(t => t.replace(/(dim|sam)\. .*?(?= \[|$)/, '').replace(/ · .*?(?= \[|$)/, '')), await p.locator('.pp [data-pp="ajouter"]').count()],
      'écran 2 : les confirmées à venir par défaut (date, distance, D+), « Toutes » ajoute options et Repérées ; mois seul : « date à préciser » ; « Ajouter une course » en tête'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-course.png') });
    await p.click('[data-filtre="confirmees"]'); await pause();
    await p.click('[data-course="' + id(3) + '"]'); await vers(p, 'niveau');
    pb.push(egal([['DébutantTu cours depuis peu, jusqu\'à 10 km.', 'IntermédiaireTu cours chaque semaine, jusqu\'au semi ou à un trail court.', 'ConfirméMarathon ou trails de plus de 40 km, entraînement suivi.', 'ExpertEntraînement structuré depuis des années, tu vises la performance.'], 1, 25],
      [await choix(p), await p.locator('.pp [data-pp="retour"]').count(), await prog(p)], 'écran 3 : quatre niveaux décrits ; retour présent ; progression'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-niveau.png') });
    await p.click('.pp [data-val="intermediaire"]'); await vers(p, 'blessures');
    await p.waitForSelector('.pp-form [name="fragiles"]');
    const champs4 = await p.evaluate(() => [...document.querySelectorAll('.pp-form .cal-champ > span')].map(e => e.textContent).concat([document.querySelector('[data-blesse][aria-pressed="true"]').textContent, document.querySelectorAll('.pp-form [name="blessure"], .pp-form [type="date"]').length]));
    await p.fill('.pp-form [name="fragiles"]', 'genou droit'); await p.click('.pp [data-blesse="oui"]'); await pause();
    await p.click('.pp [data-pp="continuer"]'); await pause();
    const m1 = await msg(p);
    const garde = await p.inputValue('.pp-form [name="fragiles"]');
    await p.fill('.pp-form [name="blessure"]', 'entorse de la cheville droite'); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'volume');
    pb.push(egal([['Points fragiles et blessures passées', 'Blessé en ce moment ?', 'Non', 0], 'Décris la blessure, ou réponds « Non ».', 'genou droit'], [champs4, m1, garde],
      'écran 4 : points fragiles, « Blessé en ce moment ? » Non d\'office, sans date ; Oui sans texte refusé, le texte tapé gardé'));
    await p.click('.pp [data-vol="volume_tranche|20-40"]'); await pause();
    const resteVolume = await ecran(p);
    const contGrise = await p.locator('.pp [data-pp="continuer"]').isDisabled();
    await p.click('.pp [data-vol="sortie_tranche|1h30-2h"]'); await pause();
    const contActif = !(await p.locator('.pp [data-pp="continuer"]').isDisabled());
    await p.click('.pp [data-pp="continuer"]'); await vers(p, 'allure');
    pb.push(egal([true, true], [contGrise, contActif], 'écran 5 : « Continuer » grisé tant qu\'une des deux n\'est pas choisie, actif ensuite ; aucun passage automatique'));
    const allure0 = await p.evaluate(() => [document.querySelector('.pp [data-allure][aria-pressed="true"]').textContent, document.querySelector('.pp-form [name="valeur"]').value, document.querySelector('.pp-form .pp-note').textContent]);
    pb.push(egal(['volume', ['Semi', '1:56:05', 'Palmarès · 4 oct. 2026']], [resteVolume, allure0], 'écran 5 : « Continuer » ; écran 6 : le semi du Palmarès prérempli'));
    await p.click('.pp [data-allure="marathon"]'); await pause();
    await p.fill('.pp-form [name="valeur"]', '1:40:00'); await p.click('.pp [data-pp="continuer"]'); await pause();
    const m2 = await msg(p);
    await p.fill('.pp-form [name="valeur"]', '3:45:00'); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'semaine');
    pb.push(egal('Le temps sur marathon s\'écrit 3:45:00 (entre 1:50:00 et 8:00:00).', m2, 'repère sur marathon : 1:40:00 refusé'));
    pb.push(egal([0, 'Course'], [await p.locator('.pp [name="nb_renfo"]').count(), await p.textContent('.pp .mrt-section-titre')], 'écran 7 : Ma semaine, section Course seulement'));
    await p.click('.pp [data-jc="2"]'); await p.click('.pp [data-jc="4"]'); await p.fill('.pp [name="nb_sorties"]', '3');
    await p.click('.pp [data-pp="continuer"]'); await pause();
    const m3 = await msg(p);
    await p.click('.pp [data-jc="7"]'); await p.click('.pp [data-long="7"]'); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'debut');
    pb.push(egal('Choisis au moins 3 jours.', m3, 'ma semaine : moins de jours que de séances refusé'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-semaine.png') });
    const debuts = await choix(p);
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-debut.png') });
    await p.click('.pp [data-debut="0"]'); await vers(p, 'recap');
    const recap = await p.evaluate(() => [document.querySelector('.pp .ps-titre').textContent, document.querySelector('.pp .ps-sous').textContent,
      [...document.querySelectorAll('.pp-recap .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent)]);
    pb.push(egal([['Plan de 16 semaines Recommandéeà partir du lun. 16 nov. 2026', 'Plan de 19 semainesà partir du lun. 26 oct. 2026', 'PersonnaliserRégler les phases semaine par semaine'],
      ['Trail des Gorges', 'dim. 7 mars 2027 · 16 semaines · 45 km', ['Niveau | Intermédiaire', 'Blessures | En ce moment : entorse de la cheville droite', 'Volume | 20 à 40 km · 1 h 30 à 2 h', 'Repère d\'allure | Marathon en 3:45:00', 'Ma semaine | mar., jeu., dim. · 3 séances, longue le dimanche', 'Début | lun. 16 nov. 2026 · 16 semaines']]],
      [debuts, recap], 'écran 8 : « Plan de 16 semaines » (recommandé), « Plan de 19 semaines » (dès lundi), personnaliser, la date seule dessous ; écran 9 : le récapitulatif'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-recap.png') });
    // Le récapitulatif ramène à une question, puis revient.
    await p.click('[data-recap="volume"]'); await vers(p, 'volume');
    const contVol = await p.locator('.pp [data-pp="continuer"]').count();
    await p.click('.pp [data-vol="volume_tranche|40-60"]'); await pause(); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'recap');
    pb.push(egal([1, '40 à 60 km · 1 h 30 à 2 h', 'Mon volume actuel'], [contVol, await p.evaluate(() => document.querySelector('[data-recap="volume"] .ps-rep').textContent), 'Mon volume actuel'],
      'récapitulatif, volume : « Continuer » (deux questions), il range et ramène au récapitulatif'));
    await p.click('[data-recap="niveau"]'); await vers(p, 'niveau');
    await p.click('.pp [data-val="confirme"]'); await vers(p, 'recap');
    const niveau2 = await p.evaluate(() => document.querySelector('[data-recap="niveau"] .ps-rep').textContent);
    pb.push(egal('Confirmé', niveau2, 'récapitulatif : une ligne ramène à sa question, puis au récapitulatif'));
    d.ecritures = [];
    await p.click('.pp [data-pp="construire"]');
    await p.waitForSelector('.ps-objectif .ps-titre');
    await p.waitForFunction(() => document.querySelector('.ps-bandeau .ps-ia-msg, .ps-bandeau .ps-reco'));
    const maj = d.ecritures.filter(x => x.table === 'courses').map(x => x.filtres + ' ' + JSON.stringify(x.corps));
    const pr = d.profil_entrainement[0] || {};
    pb.push(egal([['?id=eq.' + id(3) + ' {"role":"objectif","statut":"confirmee","groupe_options":null,"prepa_semaines":null}'], 'Trail des Gorges', 1],
      [maj, (await p.textContent('.ps-objectif .ps-titre')).trim(), Math.min(d.appels.length, 1)], '« Construire mon plan » : Objectif confirmé, durée conseillée ; la page du plan ; l\'IA propose aussitôt le premier bloc'));
    pb.push(egal(['entorse de la cheville droite', '2026-10-20'], [pr.blessure, pr.blessure_debut], 'blessure en cours : datée du jour'));
    pb.push(egal({ niveau: 'confirme', fragiles: 'genou droit', volume_tranche: '40-60', sortie_tranche: '1h30-2h', allure_type: 'marathon', temps_marathon_s: 13500, jours_course: [2, 4, 7], nb_sorties: 3, jour_long: 7 },
      (({ niveau, fragiles, volume_tranche, sortie_tranche, allure_type, temps_marathon_s, jours_course, nb_sorties, jour_long }) => ({ niveau, fragiles, volume_tranche, sortie_tranche, allure_type, temps_marathon_s, jours_course, nb_sorties, jour_long }))(pr),
      'les réponses rangées dans Mon profil'));
    pb.push(egal([], erreurs, 'parcours, erreurs JavaScript'));
    await ctx.close();

    // 2. Deux Objectifs : le Trail des Crêtes avancé au 2 mai chevauche le Trail des Gorges (récupération jusqu'au 17 avril). Profil complet : sauté.
    d = copie(x => { x.courses.find(c => c.id === id(7)).date = '2027-05-02'; x.profil_entrainement = [Object.assign({}, COMPLET)]; });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 390, d, {}, PARIS));
    await p.waitForSelector('[data-reglages]'); await pause();
    await reglage(p, '[data-parcours]'); await vers(p, 'plan');
    pb.push(egal(1, await p.locator('.pp [data-pp="fermer"]').count(), '« + Objectif » : le parcours, avec la croix'));
    await p.click('[data-plan="course"]'); await vers(p, 'course');
    await p.click('[data-course="' + id(7) + '"]'); await vers(p, 'conflit');
    const conflit = await p.evaluate(() => [document.querySelector('.pp-alerte').textContent, document.querySelector('.pp .fc-libelle') ? 'libellé' : 'sans libellé',
      ...[...document.querySelectorAll('.pp-c-col')].map(c => [...c.querySelectorAll('.ob-role, .ob-date, .ob-nom, .ob-info, .ob-val, .mrt-btn.is-actif, .pp-note')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '))]);
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'parcours-conflit-tel.png') });
    await p.click('[data-conflit="prendre"]'); await vers(p, 'debut');
    const sautes = await ecran(p);
    await p.click('.pp [data-pp="retour"]'); await vers(p, 'conflit');
    await p.click('[data-conflit="garder"]');
    await p.waitForFunction(() => !document.querySelector('.pp'));
    pb.push(egal([['Attention : deux Objectifs se chevauchent', 'sans libellé',
      'Objectif en cours | dim. 7 mars 2027 | Trail des Gorges | Mont-Clair · Trail long | 45 km · 2 100 m D+ | Garder l\'Objectif en cours | Trail des Crêtes devient Plaisir',
      'Nouvel Objectif | dim. 2 mai 2027 | Trail des Crêtes | Mont-Clair · Ultra-trail | 60 km · 3 500 m D+ | Remplacer l\'Objectif en cours | Trail des Gorges devient Plaisir'], 'debut', ['?id=eq.' + id(7) + ' {"role":"plaisir"}']],
      [conflit, sautes, d.ecritures.filter(x => x.table === 'courses').map(x => x.filtres + ' ' + JSON.stringify(x.corps))],
      'chevauchement : choisir ; l\'autre devient Plaisir (pas de règle de préparatoire avant un ultra) ; profil complet : du conflit au début ; « Garder » range le rôle et ramène au plan'));
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement'));
    pb.push(egal([], erreurs, 'chevauchement, erreurs JavaScript'));
    // 3. Préparatoire pertinente (règles fixes) : avant le Trail des Gorges (trail de 42 à 59 km : 21 à 30 km, 4 à 6 semaines).
    const role = (date, distance, format) => p.evaluate(([date, distance, format, idg]) => {
      const c = document.getElementById('saison').__ctx, w = c.courses.find(x => x.id === idg);
      return window.mrtParcours.rolePerdant(c, Object.assign({}, w, { id: 'essai', course: 'Essai', date, distance, dplus: 500, format, type: format.split('_')[0], role: 'objectif' }), w);
    }, [date, distance, format, id(3)]);
    pb.push(egal(['preparatoire', 'plaisir', 'plaisir', 'plaisir', 'plaisir'],
      [await role('2027-01-31', 25, 'trail_court'), await role('2026-12-20', 25, 'trail_court'), await role('2027-01-31', 35, 'trail_court'), await role('2027-01-31', 25, 'route_semi'), await role('2027-04-04', 25, 'trail_court')],
      'préparatoire pertinente : 25 km de trail 5 semaines avant ; sinon Plaisir (11 semaines, 35 km, route, après l\'Objectif)'));
    await ctx.close();
    // Le plan entier est déjà proposé après le premier bloc (blocs du 16 novembre au 8 février) : seule la mise à jour est à voir.
    const couvrirPlan = x => { ['2026-11-16', '2026-12-14', '2027-01-11', '2027-02-08'].forEach((b, i) => x.propositions.push({ id: 'plan-' + i, utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: b, essai: 1, statut: 'acceptee', motif: 'readaptation', reponse: { recommandation: 'Suite.', seances: [] } })); };
    // 4. Mon profil changé après la dernière proposition : le plan est mis à jour d'office à l'arrivée (rien avant) ; dans Mon profil, la ligne d'information.
    const relaisOk = d0 => { d0.appels = []; d0.relais = corps => { d0.appels.push(corps); const id = 'prop-' + d0.appels.length, r = { recommandation: 'Mise à jour.', seances: [] };
      d0.propositions.push({ id, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', motif: corps.motif, reponse: r }); return { status: 200, body: { id, reponse: r } }; }; return d0; };
    const avecProp = maj => relaisOk(copie(x => {
      x.profil_entrainement = [Object.assign({}, COMPLET, { maj })];
      x.propositions = [{ id: 'p1', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Entretien.', seances: [] } }];
      couvrirPlan(x);
    }));
    let dAvant = avecProp('2026-10-18T10:00:00Z');
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, dAvant, {}, PARIS));
    await p.waitForSelector('.ps-bandeau .ps-reco'); await pause();
    const avant = dAvant.appels.length;
    await ctx.close();
    d = avecProp('2026-10-19T12:00:00Z');
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    for (let k = 0; k < 60 && !d.appels.length; k++) await pause();
    await p.waitForSelector('.ps-bandeau .ps-reco');
    const miseAJour = [d.appels.length > 0, (d.appels[0] || {}).motif, (d.appels[0] || {}).bloc];
    await reglage(p, '[data-profil]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    const infoAvant = await p.locator('.ps-profil .ps-info').count();
    await p.click('.ps-profil [data-q="niveau"]'); await p.click('.ps-profil [data-val="expert"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal([0, [true, 'readaptation', '2026-10-19'], 0, 0],
      [avant, miseAJour, infoAvant, await p.locator('.ps-profil .ps-info').count()],
      'profil changé après la dernière proposition : aucun appel avant ; à l\'arrivée, le plan est mis à jour d\'office (réadaptation, de la semaine en cours) ; dans Mon profil, aucune ligne d\'information'));
    pb.push(egal([], erreurs, 'profil changé, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },
  // Ajouter une course préparatoire (Préparation, § 5.1, n° 16, 26 à 28) : courses de la saison, ajout et son avis, feuille d'une course.
  async preparationPrepa(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const copie = f => { const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = []; if (f) f(d); return d; };
    const hiver = x => x.courses.push(Object.assign({}, x.courses.find(k => k.id === id(1)), { id: id(40), course: 'Trail de l\'Hiver', parcours: null, date: '2027-01-31', statut: 'a_surveiller', inscrit: false, dossard: null, role: null }));
    const puces = p => p.evaluate(() => [...document.querySelectorAll('.ps-sc, .ps-sc-plus')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    const majCourses = d => d.ecritures.filter(x => x.table === 'courses').map(x => x.filtres + ' ' + JSON.stringify(x.corps));
    const planMaj = d => d.ecritures.some(x => x.table === 'preferences' && x.corps && x.corps.plan_maj);
    // Le plan entier est déjà proposé après le premier bloc : seule la mise à jour d'office est à voir ; le relais note les appels.
    const couvrirPlan = x => { ['2026-11-16', '2026-12-14', '2027-01-11', '2027-02-08'].forEach((b, i) => x.propositions.push({ id: 'plan-' + i, utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: b, essai: 1, statut: 'acceptee', motif: 'readaptation', reponse: { recommandation: 'Suite.', seances: [] } })); };
    const relaisOk = d0 => { d0.appels = []; d0.relais = corps => { d0.appels.push(corps); const id2 = 'prop-' + d0.appels.length, r = { recommandation: 'Mise à jour.', seances: [] };
      d0.propositions.push({ id: id2, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', motif: corps.motif, reponse: r }); return { status: 200, body: { id: id2, reponse: r } }; }; return d0; };
    // La carte : les courses de la saison ; le bandeau : la préparatoire conseillée.
    let d = copie(hiver);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await p.waitForSelector('.ps-saison');
    pb.push(egal([['Trail du Lac', 'Corrida de Noël', 'Préparatoire'], 1,
      'Préparatoire conseillée : un trail de 21 à 30 km, sur un terrain proche, du dim. 24 janv. 2027 au dim. 7 févr. 2027. Ajouter une course'],
      [await puces(p), await p.locator('.ps-saison [data-prepa]').count(), (await p.textContent('.ps-sg-ligne')).replace(/\s+/g, ' ').trim()],
      'carte : « Avant : » les Préparatoires et les Plaisirs avant l\'Objectif (sans lui), et « + Préparatoire » ; bandeau : la préparatoire conseillée'));
    // « Ajouter » : la fenêtre d'abord ; la course repérée, Conseillée, devient Préparatoire et Confirmée ; la saison a changé.
    await p.click('[data-prepa="fenetre"]'); await p.waitForSelector('.pp[data-ecran="prepa"]');
    await p.click('[data-filtre="toutes"]'); await pause();
    const liste = await p.evaluate(() => [...document.querySelectorAll('.pp [data-prepa-c]')].map(b => b.querySelector('b').textContent + ' ' + ((b.querySelector('.pp-avis') || {}).textContent || '')));
    await p.click('[data-prepa-c="' + id(40) + '"]');
    await p.waitForSelector('.ps-sc[data-sc="' + id(40) + '"]');
    pb.push(egal(['Trail de l\'Hiver Conseillée', ['?id=eq.' + id(40) + ' {"role":"preparatoire","statut":"confirmee"}'], true, true],
      [liste[0], majCourses(d), planMaj(d), (await puces(p)).includes('Trail de l\'Hiver')],
      'ajout : la course de la fenêtre en tête, Conseillée ; un toucher l\'ajoute en Préparatoire (Confirmée), la saison a changé'));
    pb.push(egal([], erreurs, 'ajout, erreurs JavaScript'));
    await ctx.close();
    // Déconseillée en Préparatoire : l'écran de l'avis ; « Ajouter en Plaisir ».
    d = copie(x => { Object.assign(x.courses.find(k => k.id === id(2)), { date: '2027-02-15', role: null }); });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ps-saison [data-prepa]'); await p.click('.ps-saison [data-prepa]'); await p.waitForSelector('.pp[data-ecran="prepa"]');
    await p.click('[data-prepa-c="' + id(2) + '"]'); await p.waitForSelector('.pp[data-ecran="avis"]');
    const avis = await p.evaluate(() => [document.querySelector('.pp-alerte').textContent.trim(), [...document.querySelectorAll('.pp [data-avis]')].map(b => b.textContent + (b.classList.contains('is-principal') ? ' *' : ''))]);
    await p.click('[data-avis="plaisir"]'); await p.waitForSelector('.ps-saison');
    pb.push(egal([['Corrida de Noël : à 20 jours de Trail des Gorges (3 semaines conseillées)', ['Ajouter quand même en Préparatoire', 'Ajouter en Plaisir *']], ['?id=eq.' + id(2) + ' {"role":"plaisir","statut":"confirmee"}']],
      [avis, majCourses(d)], 'Déconseillée : la raison, « Ajouter en Plaisir » conseillé ; la course ajoutée en Plaisir'));
    await ctx.close();
    // La feuille d'une course : son rôle, son avis, « Passer en Plaisir », « Retirer du plan » (confirmé : rôle vide).
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ps-sc'); await p.click('[data-sc="' + id(1) + '"]'); await p.waitForSelector('.ps-feuille-c');
    const feuille = await p.evaluate(() => [document.querySelector('.ps-feuille-c .fc-libelle').textContent, document.querySelector('.ps-feuille-c .ps-fc-nom').textContent, !!document.querySelector('.ps-feuille-c .pr-avis'),
      [...document.querySelectorAll('.ps-fc-actions > *')].map(b => b.textContent.trim())]);
    const pourquoi = await p.evaluate(() => (document.querySelector('.ps-feuille-c .pr-avis-c') || {}).textContent || '');
    pb.push(egal([true, true, ['mrt-btn', 'mrt-btn', 'mrt-btn is-danger']], [pourquoi.length >= 40 && pourquoi.length <= 200, /semaines avant|Course plaisir|Trop proche|Plus longue|récupération/.test(pourquoi),
      await p.evaluate(() => [...document.querySelectorAll('.ps-fc-actions > *')].map(b => b.className))], 'feuille d\'une course : le pourquoi de l\'avis en 200 caractères au plus ; trois boutons de même forme, « Retirer du plan » en danger'));
    await surDialogue(p, () => true);
    await p.click('.ps-feuille-c [data-role="retirer"]');
    await p.waitForSelector('.ps-feuille-c', { state: 'detached' }); await pause();
    pb.push(egal([['Préparatoire', 'Trail du Lac', true, ['Passer en Plaisir', 'Voir la course', 'Retirer du plan']], ['?id=eq.' + id(1) + ' {"role":null}'], true, false],
      [feuille, majCourses(d), planMaj(d), (await puces(p)).includes('Trail du Lac')],
      'feuille : Préparatoire, son avis, ses actions ; « Retirer du plan » : rôle vide, la saison a changé, la course quitte la carte'));
    pb.push(egal([], erreurs, 'feuille d\'une course, erreurs JavaScript'));
    await ctx.close();
    // La saison a changé après la dernière proposition : le plan est mis à jour d'office à l'arrivée.
    d = relaisOk(copie(x => {
      x.profil_entrainement = [{ utilisateur: moi, niveau: 'intermediaire', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 4, 6], nb_sorties: 3, jour_long: 6, allure_type: '10km', temps_10km_s: 2730, maj: '2026-10-18T10:00:00Z' }];
      x.propositions = [{ id: 'p1', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Entretien.', seances: [] } }];
      x.preferences[0].plan_maj = '2026-10-19T12:00:00Z';
      couvrirPlan(x);
    }));
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    for (let k = 0; k < 60 && !d.appels.length; k++) await pause();
    await p.waitForSelector('.ps-bandeau .ps-reco');
    pb.push(egal([true, 'readaptation', 0], [d.appels.length > 0, (d.appels[0] || {}).motif, await p.locator('.ps-profil-change, [data-ia="refaire"]').count()], 'saison changée après la dernière proposition : le plan est mis à jour d\'office, sans « Refaire » ni ligne d\'avertissement'));
    await ctx.close();
    // Fiche d'une course : le rôle en lecture seule (« réglé dans Mon plan ») ; une course sans rôle : « Hors plan ».
    d = copie(x => { x.courses.find(k => k.id === id(2)).role = null; });
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ob-carte');
    const roles = await p.evaluate(() => [...document.querySelectorAll('.ob-carte .ob-role')].slice(0, 3).map(e => e.textContent));
    await ctx.close();
    pb.push(egal(['Confirmée · Préparatoire', 'Confirmée', 'Confirmée · Objectif'], roles, 'page Saison : le statut, puis le rôle de Mon plan s\'il y en a un (Préparation, § 5.1)'));
    return pb;
  },
  async preparationIA(nav, db0) {
    const pb = [];
    const { db } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const PROFIL = { utilisateur: moi, niveau: 'intermediaire', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 6], jours_renfo: [4], nb_sorties: 2, nb_renfo: 1, jour_long: 6, allure_type: '10km', temps_10km_s: 2730 };
    // Bloc du 19 octobre au 15 novembre : séances les mardis, jeudis et samedis (jours du profil).
    const LUNDIS = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
    const bonne = () => ({ recommandation: 'Entretien : deux footings et une sortie longue par semaine.', seances: LUNDIS.flatMap(l => [1, 3, 5].map(k => {
      const d = new Date(l + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); const j = d.toISOString().slice(0, 10);
      return { date: j, type: k === 3 ? 'renfo' : 'run', libelle: k === 5 ? 'Sortie longue' : k === 3 ? 'Renforcement : Gainage' : 'Endurance', duree_min: k === 5 ? 90 : 45, distance_km: k === 3 ? 0 : k === 5 ? 15 : 8, intensite: 'facile' };
    })) });
    // Le plan entier est déjà proposé (les 4 blocs après le premier) : seul le premier bloc reste à voir.
    const couvrir = x => { ['2026-11-16', '2026-12-14', '2027-01-11', '2027-02-08'].forEach((b, i) => x.propositions.push({ id: 'plan-' + i, utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: b, essai: 1, statut: 'acceptee', motif: 'readaptation', reponse: { recommandation: 'Suite.', seances: [] } })); return x; };
    const aPart = d => d.propositions.filter(x => !String(x.id).startsWith('plan-'));
    const mauvaise = () => { const r = bonne(); r.seances.push({ date: '2026-10-21', type: 'run', libelle: 'Fractionné', duree_min: 50, distance_km: 9, intensite: 'intense' }); return r; };
    // Base simulée : le relais range chaque appel dans « propositions », comme la fonction, et rend la réponse choisie.
    const copie = (reponses, f) => {
      const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = [Object.assign({}, PROFIL)];
      d.reglages = { plafondIA: 4 }; // le plafond se vérifie avec sa valeur d'ouverture ; le site est aujourd'hui sans limite (essais)
      d.appels = []; d.analyses = [];
      d.relais = corps => {
        // Analyse d'une séance faite : rangée à part, hors des appels de proposition.
        if (corps.mode === 'analyse') { d.analyses.push(corps); if (d.analyseReponse) return d.analyseReponse; return { status: 200, body: { analyse: 'Séance bien menée.', adapter: true } }; }
        d.appels.push(corps);
        let r = reponses[Math.min(d.appels.length - 1, reponses.length - 1)];
        if (r.status) return r;
        // Un autre bloc que le premier (2026-10-19) : les séances de la réponse sont décalées d'autant de jours.
        const decal = Math.round((Date.parse(corps.bloc) - Date.parse('2026-10-19')) / 864e5);
        if (decal && Array.isArray(r.seances)) {
          // Comme la vraie fonction : rien un jour de course, la veille d'une Plaisir ni un jour sans possibilité (le contexte les désigne).
          const interdits = new Set(((corps.contexte && corps.contexte.semaines) || []).flatMap(w => w.jours).filter(j => j.course || (j.reperes || []).some(x => /repos/.test(x))).map(j => j.date));
          // Semaines d'affûtage : durées réduites (le garde-fou veut 40 à 59 % des 3 semaines d'avant).
          const affutage = new Set(((corps.contexte && corps.contexte.semaines) || []).filter(w => w.phase === 'Affûtage').flatMap(w => w.jours.map(j => j.date)));
          r = Object.assign({}, r, { seances: r.seances.map(x => { const date = new Date(Date.parse(x.date) + decal * 864e5).toISOString().slice(0, 10); return Object.assign({}, x, { date }, affutage.has(date) ? { duree_min: Math.max(1, Math.round(x.duree_min * 0.45)) } : {}); }).filter(x => !interdits.has(x.date)) });
        }
        const id = 'prop-' + d.appels.length;
        d.propositions.push({ id, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', motif: corps.motif || 'proposer', reponse: r });
        return { status: 200, body: { id, reponse: r } };
      };
      if (f) f(d);
      return d;
    };
    const lire = p => p.evaluate(() => ({
      reste: (document.querySelector('.ps-ia-reste') || {}).textContent || null, msg: (document.querySelector('.ps-ia-msg') || {}).textContent || null,
      aide: (document.querySelector('.ps-ia-aide') || {}).textContent || null, reco: ((document.querySelector('.ps-reco') || {}).textContent || '').replace(/\s+/g, ' ').trim() || null,
      refaire: document.querySelectorAll('[data-ia="refaire"]').length, desactive: !!(document.querySelector('[data-ia="refaire"]') || {}).disabled,
      anciens: document.querySelectorAll('[data-ia="proposer"], [data-ia="tout"], [data-ia="choisir"], [data-ia="abandonner"], .ps-prop-repli, .cal-v-prop').length,
      semaine: [...document.querySelectorAll('.ps-semaine .cal-s-ligne[data-jour-ligne="2026-10-20"] .cal-v-lib, .ps-semaine .cal-s-ligne[data-jour-ligne="2026-10-20"] .cal-v-nom')].map(e => e.textContent.trim()).join(' ')
    }));
    // La page a fini : la recommandation et « Refaire », un message, ou le lien vers le profil.
    const fini = p => p.waitForFunction(() => document.querySelector('.ps-ia-msg, .ps-ia-aide, .ps-reco b'));

    // Profil complet, aucune proposition : l'IA propose d'office, les séances s'écrivent (§ 6) ; rien à accepter.
    let d = copie([Object.assign(bonne(), { recommandation: 'Entretien : deux footings et une sortie longue par semaine. Garde une allure facile. Hydrate-toi bien.' })]);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await fini(p);
    let r = await lire(p);
    const envoi = d.appels[0];
    pb.push(egal([5, 59, 'ia', 'acceptee', 'acceptee', null, null, 0],
      [d.appels.length, d.seances.length, d.seances[0].origine, d.seances[0].etat, d.propositions[0].statut, d.seances.find(x => x.type === 'renfo').distance_km, r.reste, r.anciens],
      'à l\'arrivée : l\'IA propose d\'office tout le plan, bloc après bloc (5 blocs jusqu\'à l\'Objectif), 59 séances écrites (origine IA), propositions acceptées ; plus rien à accepter'));
    pb.push(egal('MyRunTools : Entretien : deux footings et une sortie longue par semaine. Garde une allure facile.', r.reco, 'bandeau : la recommandation en deux phrases au plus, sans « Refaire » ni compteur'));
    pb.push(egal([1, '2026-10-19', '2026-11-15', 'Entretien', false, false, [['mardi', 'samedi'], ['jeudi']], ['allégé (avant une course Préparatoire)']],
      [envoi.essai, envoi.contexte.bloc.debut, envoi.contexte.bloc.fin, envoi.contexte.semaines[0].phase, /Trail du Lac|Trail des Gorges|Corrida/.test(JSON.stringify(envoi)), JSON.stringify(envoi).includes(db.profils[0].prenom || '§§'),
        [envoi.contexte.profil.jours_possibles_course, envoi.contexte.profil.jours_possibles_renforcement], envoi.contexte.semaines[3].jours[3].reperes],
      'contexte envoyé : le bloc, ses phases et repères, le profil ; ni nom de course ni prénom'));
    await p.reload(); await fini(p);
    pb.push(egal(5, d.appels.length, 'retour sur la page : le plan est couvert, pas de nouvel appel'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Mise à jour d'office (la saison a changé) : remplace les séances de l'IA non faites, sans toucher aux séances saisies ni aux faites.
    d = copie([bonne()], x => {
      x.propositions.push({ id: 'p0', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } });
      couvrir(x);
      x.preferences[0].plan_maj = '2026-10-19T12:00:00Z';
      x.seances.push(
        { id: 'ia-a', utilisateur: moi, date: '2026-10-21', type: 'run', libelle: 'Ancien footing', duree_min: 30, origine: 'ia', etat: 'acceptee', faite: false },
        { id: 'ia-b', utilisateur: moi, date: '2026-10-22', type: 'run', libelle: 'Footing fait', duree_min: 30, origine: 'ia', etat: 'acceptee', faite: true },
        { id: 'main-c', utilisateur: moi, date: '2026-10-23', type: 'run', libelle: 'Ma séance', duree_min: 30, origine: 'saisie', etat: 'acceptee', faite: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    for (let k = 0; k < 60 && d.appels.length < 5; k++) await pause();
    await p.waitForFunction(() => document.querySelector('.ps-reco b') && /deux footings/.test(document.querySelector('.ps-reco').textContent));
    pb.push(egal([5, 'readaptation', ['ia-b', 'main-c'], 0, 0], [d.appels.length, d.appels[0].motif, d.seances.filter(x => !String(x.id).startsWith('nouveau')).map(x => x.id), d.seances.filter(x => x.libelle === 'Ancien footing').length, await p.locator('[data-ia="refaire"]').count()],
      'saison changée : le plan est refait d\'office (5 blocs, hors plafond) ; la séance de l\'IA non faite est remplacée ; la saisie et la faite restent ; plus de « Refaire »'));
    await ctx.close();

    // Garde-fou : un jour non disponible ; la demande est refaite une fois, avec la correction, puis écrite.
    d = copie([mauvaise(), bonne()], couvrir);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    pb.push(egal([2, 2, true, 'invalide', 'acceptee', 12], [d.appels.length, d.appels[1].essai, (d.appels[1].corrections || []).some(x => /mer\. 21 oct.* : jour non prévu pour courir/.test(x)), aPart(d)[0].statut, aPart(d)[1].statut, d.seances.length],
      'garde-fou : jour non prévu pour courir, proposition refaite (essai 2, avec la correction) ; la première marquée invalide, la seconde écrite'));
    await ctx.close();

    // Deux réponses fautives de suite : message, plafond inchangé, rien d'écrit, pas de nouvel essai dans la visite.
    d = copie([mauvaise()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p); await pause();
    r = await lire(p);
    pb.push(egal(['Proposition impossible à vérifier, réessaie plus tard.', ['echec', 'echec'], null, 0, 2], [r.msg, d.propositions.map(x => x.statut), r.reste, d.seances.length, d.appels.length],
      'deux échecs : message, les deux appels en échec, rien de décompté ni d\'écrit, pas de nouvel essai'));
    await ctx.close();

    // Une proposition restée en attente (d'avant) pour la semaine : écrite à l'arrivée, sans appel.
    d = copie([bonne()], x => { x.propositions.push({ id: 'p-att', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'brute', motif: 'proposer', reponse: bonne() }); couvrir(x); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await p.waitForFunction(() => document.querySelector('.ps-reco b') && /Entretien/.test(document.querySelector('.ps-reco').textContent));
    for (let k = 0; k < 40 && d.propositions[0].statut !== 'acceptee'; k++) await pause(); // l'écriture du statut suit celle des séances
    pb.push(egal([0, 12, 'acceptee'], [d.appels.length, d.seances.length, d.propositions[0].statut], 'proposition en attente d\'avant : écrite à l\'arrivée, sans appel'));
    await ctx.close();

    // Page quittée en route : la proposition du bloc du 16 novembre est restée en attente ; à l'arrivée elle est écrite sans appel (les autres blocs sont couverts).
    d = copie([bonne()], x => {
      x.propositions.push({ id: 'p0', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } });
      couvrir(x);
      const nov = x.propositions.find(y => y.id === 'plan-0'); nov.id = 'att-nov'; nov.statut = 'brute';
      nov.reponse = { recommandation: 'Suite.', seances: bonne().seances.map(z => Object.assign({}, z, { date: new Date(Date.parse(z.date) + 28 * 864e5).toISOString().slice(0, 10) })) };
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    for (let k = 0; k < 40 && d.propositions.find(y => y.id === 'att-nov').statut !== 'acceptee'; k++) await pause();
    pb.push(egal([0, 'acceptee', 12], [d.appels.length, d.propositions.find(y => y.id === 'att-nov').statut, d.seances.length], 'bloc resté en attente (page quittée en route) : écrit à l\'arrivée, sans appel'));
    await ctx.close();

    // Revue : la proposition qui couvre la semaine date de plus de 4 semaines (15 septembre) : les 4 prochaines semaines sont refaites (hors plafond), à l'arrivée.
    d = copie([bonne()], x => { x.propositions.push({ id: 'p-vieille', utilisateur: moi, cree: '2026-09-15T10:00:00Z', bloc: '2026-09-28', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } }); couvrir(x); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    for (let k = 0; k < 40 && !d.appels.length; k++) await pause();
    await p.waitForFunction(() => document.querySelector('.ps-reco b'));
    pb.push(egal([1, 'readaptation', '2026-10-19'], [d.appels.length, d.appels[0] && d.appels[0].motif, d.appels[0] && d.appels[0].bloc], 'revue : une proposition de plus de 4 semaines est revue à l\'arrivée (un appel, hors plafond, bloc de la semaine en cours)'));
    await ctx.close();

    // Plafond atteint : rien d'office, « Refaire » grisé ; refus de la fonction (plafond, réservé aux pilotes) : son message.
    d = copie([bonne()], x => { for (let i = 0; i < 4; i++) x.propositions.push({ id: 'vieille-' + i, utilisateur: moi, cree: '2026-10-0' + (i + 1) + 'T10:00:00Z', bloc: '2026-09-28', essai: 1, statut: 'acceptee', reponse: null }); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pause(); await pause(); await pause();
    r = await lire(p);
    pb.push(egal([0, 0], [d.appels.length, r.refaire], 'plafond atteint (4 ce mois-ci) : rien d\'office, « Refaire » grisé'));
    await ctx.close();
    for (const [rep, attendu, nom] of [[{ status: 429, body: { code: 'plafond', prochaine: '2026-11-01' } }, /^Plus de proposition ce mois-ci\s:\sla prochaine le .*1er\snov\.\s2026\.$/, 'plafond de la fonction'],
      [{ status: 403, body: { code: 'reserve' } }, /^Réservé aux comptes pilotes pour l'instant\.$/, 'compte non pilote']]) {
      d = copie([rep]);
      ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
      await p.waitForSelector('.ps-ia-msg');
      r = await lire(p);
      pb.push(egal(true, attendu.test(r.msg || ''), nom + ' : « ' + r.msg + ' »'));
      await ctx.close();
    }

    // Profil incomplet : rien d'office, le lien vers le profil.
    d = copie([bonne()], x => { x.profil_entrainement = [Object.assign({}, PROFIL, { jours_course: [] })]; });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    r = await lire(p);
    pb.push(egal([0, true], [d.appels.length, /Compléter mon profil/.test(r.aide || '')], 'profil incomplet : rien d\'office, « Compléter mon profil »'));
    await ctx.close();

    // Garde-fous au 17 novembre : récupération du Trail du Lac (séance facile seulement), repos la veille de la Corrida de Noël.
    d = copie([bonne()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-17T10:00:00+01:00') }));
    await fini(p);
    const gf = await p.evaluate(() => {
      const s = (date, intensite) => ({ date, type: 'run', libelle: 'Endurance', duree_min: 50, distance_km: 9, intensite });
      return window.mrtSeancesIA.gardeFous({ recommandation: '', seances: [s('2026-11-19', 'intense'), s('2026-12-08', 'intense'), s('2026-12-12', 'facile')] }, document.getElementById('saison').__ctx, '2026-11-16');
    });
    pb.push(egal([true, false, true], [gf.some(x => /19 nov.* : jour de récupération/.test(x)), gf.some(x => /8 déc/.test(x)), gf.some(x => /12 déc.* : jour de repos/.test(x))],
      'garde-fous : fractionné le 19 novembre (récupération du Trail du Lac) refusé, le 8 décembre accepté, séance la veille de la Corrida refusée'));
    await ctx.close();

    // Site partagé : rien de l'IA.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie([bonne()], x => {
      x.courses = x.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
      x.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
      x.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await p.waitForSelector('.ps-cadre');
    pb.push(egal(0, await p.locator('[data-ia], .ps-ia-aide, .ps-proposition').count(), 'lecture seule : rien de l\'IA'));
    await ctx.close();
    // Lot 6b : un commentaire sur une séance relance aussitôt une réadaptation (hors plafond), avec les retours et la blessure en cours.
    {
      const d6 = copie([bonne()], x => {
        x.seances = [
          { id: 'se-p', utilisateur: moi, date: '2026-10-13', date_prevue: '2026-10-12', type: 'run', libelle: 'Seuil', faite: true, ressenti: 8, douleur: 'legere', douleur_ou: 'mollet', fatigue: 4, commentaire: 'Dur', duree_min: 50, distance_km: 9, intensite: 'intense', origine: 'saisie', etat: 'acceptee', course: null },
          { id: 'se-a', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Footing', faite: false, duree_min: 45, distance_km: 8, intensite: 'facile', origine: 'saisie', etat: 'acceptee', course: null }];
        x.profil_entrainement[0].blessure = 'tendinite'; x.profil_entrainement[0].blessure_debut = '2026-10-10';
        x.propositions.push({ id: 'p0', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } });
        couvrir(x);
      });
      const q = await ouvrir(nav, 'preparation.html', 1200, d6, {}, PARIS);
      await fini(q.p);
      await q.p.click('[data-edit="se-a"]'); await q.p.waitForSelector('.cal-seance');
      // Séance à venir : le commentaire est là, mais l'IA n'intervient pas (elle n'agit que sur une séance faite).
      const avant = d6.appels.length;
      pb.push(egal([false, true], [await q.p.locator('.cal-seance [name="commentaire"]').isVisible(), await (async () => { await q.p.check('.cal-seance [name="faite"]'); return q.p.locator('.cal-seance [name="commentaire"]').isVisible(); })()],
        'séance à venir : champ « Commentaire » caché, il apparaît avec « Faite »'));
      // « Faite » cochée puis « Annuler » : « Abandonner les modifications ? », comme la fiche d'une course ; on abandonne.
      await q.p.click('.cal-seance [data-act="annuler"]'); await q.p.waitForSelector('.mrt-dialogue');
      pb.push(egal(['Continuer', 'Abandonner'], await q.p.locator('.mrt-dialogue-boutons button').allTextContents(), 'séance modifiée puis « Annuler » : la confirmation d\'abandon'));
      await q.p.click('.mrt-dialogue-boutons button:last-child'); await q.p.waitForSelector('.cal-seance', { state: 'detached' }); await pause();
      pb.push(egal(avant, d6.appels.length, 'fenêtre fermée sans enregistrer : aucun appel à l\'IA'));
      // Séance faite, effort noté : l'IA l'analyse (animation puis texte, dans la feuille) ; adapter le plan ne se fait que sur demande.
      await q.p.click('[data-edit="se-a"]'); await q.p.waitForSelector('.cal-seance');
      await q.p.check('.cal-seance [name="faite"]');
      await q.p.evaluate(() => { const c = document.querySelector('.cal-seance [name="ressenti"]'); c.value = '6'; c.dispatchEvent(new Event('input', { bubbles: true })); });
      await q.p.fill('.cal-seance [name="commentaire"]', 'Jambes lourdes');
      await q.p.click('.cal-seance button[type="submit"]');
      await q.p.waitForSelector('.cal-analyse-texte');
      const an = d6.analyses[0] || {}, fiche = (an.contexte || {}).seance || {};
      pb.push(egal([1, 'Séance bien menée.', 'Jambes lourdes', 6, 'tendinite', 'Séance bien menée.', 0, 1],
        [d6.analyses.length, await q.p.textContent('.cal-analyse-texte'), fiche.commentaire, fiche.ressenti_sur_10, ((an.contexte || {}).blessure_en_cours || {}).description, (d6.seances.find(x => x.id === 'se-a') || {}).analyse_ia, d6.appels.length - avant, await q.p.locator('[data-adapter]').count()],
        'séance faite, effort noté : analyse demandée (fiche, commentaire, blessure), texte affiché et rangé sur la séance, aucune réadaptation sans accord ; « Adapter mon plan » proposé'));
      // « Adapter mon plan » : la réadaptation (hors plafond) s'écrit, sur l'accord de l'utilisateur.
      await q.p.click('[data-adapter]');
      for (let k = 0; k < 40 && !aPart(d6).some(x => x.motif === 'readaptation' && x.statut === 'acceptee'); k++) await pause();
      await fini(q.p);
      const ap = d6.appels[d6.appels.length - 1] || {}, cx = ap.contexte || {};
      pb.push(egal(['readaptation', '2026-10-19', [], { description: 'tendinite', depuis: '2026-10-10' }],
        [ap.motif, ap.bloc, cx.commentaires_a_venir, cx.blessure_en_cours], 'adaptation acceptée : réadaptation relancée, blessure envoyée, plus de commentaire à venir'));
      pb.push(egal({ ressenti_sur_10: 8, ressenti: 'Seuil, allure semi-marathon ou 10 km', charge_ua: 400, douleur: 'légère (mollet)', fatigue_sur_5: 4, commentaire: 'Dur', deplacee_du: '2026-10-12' }, (h => h && { ressenti_sur_10: h.ressenti_sur_10, ressenti: h.ressenti, charge_ua: h.charge_ua, douleur: h.douleur, fatigue_sur_5: h.fatigue_sur_5, commentaire: h.commentaire, deplacee_du: h.deplacee_du })((cx.historique || []).find(x => x.date === '2026-10-13')),
        'séances passées : ressenti, douleur, fatigue, commentaire et jour d\'origine envoyés'));
      pb.push(egal([3, 'acceptee', 14], [await q.p.evaluate(() => window.mrtSeancesIA.restantes(document.getElementById('saison').__ctx)), (aPart(d6).find(x => x.motif === 'readaptation') || {}).statut, d6.seances.length],
        'réadaptation hors plafond (seule la proposition du 19 octobre compte : 3 restantes), ses 12 séances écrites d\'office ; la séance saisie et la passée restent'));
      pb.push(egal([], q.erreurs, 'réadaptation : erreurs JavaScript'));
      await q.ctx.close();
      // Calendrier : la même analyse ; « Adapter mon plan » écrit la réadaptation et le dit dans la feuille.
      const d7 = copie([bonne()], x => { x.seances = [{ id: 'se-a', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Footing', faite: false, origine: 'saisie', etat: 'acceptee', course: null }]; });
      const c = await ouvrir(nav, 'calendrier.html', 1200, d7, {}, PARIS);
      await c.p.click('[data-edit="se-a"]'); await c.p.waitForSelector('.cal-seance');
      await c.p.check('.cal-seance [name="faite"]');
      await c.p.evaluate(() => { const r = document.querySelector('.cal-seance [name="ressenti"]'); r.value = '5'; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await c.p.fill('.cal-seance [name="commentaire"]', 'Genou sensible');
      await c.p.click('.cal-seance button[type="submit"]');
      await c.p.waitForSelector('[data-adapter]'); await c.p.click('[data-adapter]'); await c.p.waitForSelector('.cal-analyse-ok');
      pb.push(egal([1, 'readaptation', 'Plan adapté : les séances à venir sont à jour dans Mon plan.'], [d7.analyses.length, (d7.appels[0] || {}).motif, await c.p.textContent('.cal-analyse-ok')], 'Calendrier : analyse, puis adaptation sur demande'));
      // Rouvrir la séance : l'analyse est relue ; enregistrer sans rien changer ne relance pas l'IA.
      await c.p.click('[data-fermer]'); await c.p.waitForSelector('.cal-feuille-retour', { state: 'detached' });
      await c.p.click('[data-edit="se-a"]'); await c.p.waitForSelector('.cal-seance');
      const relue = await c.p.textContent('.cal-analyse-lue .cal-analyse-texte');
      await c.p.click('.cal-seance button[type="submit"]'); await c.p.waitForSelector('.cal-seance', { state: 'detached' }); await pause();
      pb.push(egal(['Séance bien menée.', 1, 0], [relue, d7.analyses.length, await c.p.locator('.cal-analyse-texte').count()], 'séance rouverte : analyse relue ; rien de changé, pas de nouvelle analyse'));
      await c.ctx.close();
      // Compte non pilote : l'IA répond « réservé » ; la feuille se referme sans rien dire.
      const d8 = copie([bonne()], x => { x.seances = [{ id: 'se-a', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Endurance', faite: false, origine: 'saisie', etat: 'acceptee', course: null }]; });
      d8.analyseReponse = { status: 403, body: { code: 'reserve' } };
      const c8 = await ouvrir(nav, 'calendrier.html', 1200, d8, {}, PARIS);
      await c8.p.click('[data-edit="se-a"]'); await c8.p.waitForSelector('.cal-seance');
      await c8.p.check('.cal-seance [name="faite"]');
      await c8.p.evaluate(() => { const r = document.querySelector('.cal-seance [name="ressenti"]'); r.value = '4'; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await c8.p.click('.cal-seance button[type="submit"]');
      await c8.p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); await pause();
      pb.push(egal([1, 0, []], [d8.analyses.length, await c8.p.locator('.cal-analyse-texte, .cal-msg:not(:empty)').count(), c8.erreurs], 'compte non pilote : analyse refusée, feuille refermée sans message'));
      await c8.ctx.close();
    }
    return pb;
  },

  async connexion(nav, db0) {
    const pb = [];
    const ADRESSE = 'essai@exemple.fr', MDP = 'phrase-de-passe-essai', NEUF = 'une-autre-phrase-de-passe';
    const neuve = (extra = {}) => { const d = JSON.parse(JSON.stringify(db0)); d.ecritures = []; d.auth = Object.assign({ mdp: { [ADRESSE]: MDP }, appels: [], maintenant: AUJOURDHUI }, extra); return d; };
    // Visiteur sans session : la page est ouverte directement, sans le jeton posé par ouvrir().
    const visiteur = async (page, d, largeur = 1200) => {
      const ctx = await nav.newContext({ viewport: { width: largeur, height: 900 }, timezoneId: PARIS.fuseau });
      await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
      await simulerBase(ctx, d);
      const p = await ctx.newPage();
      const erreurs = [];
      p.on('pageerror', e => erreurs.push(e.message));
      await p.goto(RACINE + page);
      return { p, ctx, erreurs };
    };
    const message = p => p.locator('#message').textContent();
    const qui = d => d.auth.appels.map(a => a.methode + ' ' + a.chemin);

    // Sans connexion : renvoi vers la page de connexion ; page sans en-tête ni menu.
    let d = neuve({ maintenant: null });
    let { p, ctx, erreurs } = await visiteur('index.html', d);
    await p.waitForURL(/connexion\.html/);
    pb.push(egal({ champs: ['email', 'password'], bouton: 'Se connecter', oubli: 'Mot de passe oublié ?', entete: 0, menu: 0, captcha: 0, ancien: false },
      { champs: await p.evaluate(() => [document.getElementById('email').type, document.getElementById('mdp').type]), bouton: await p.locator('button[type="submit"]').textContent(),
        oubli: await p.locator('#oubli').textContent(), entete: await p.locator('.mrt-header').count(), menu: await p.locator('.mrt-nav').count(),
        captcha: await p.locator('#captcha > *').count(), ancien: /lien de connexion|Pas de mot de passe/.test(await p.locator('main').textContent()) }, 'connexion : adresse, mot de passe, bouton, sans en-tête ni menu ni lien magique'));
    // Œil : affiche puis masque.
    await p.fill('#mdp', 'secret');
    await p.click('.mrt-oeil');
    const vu = await p.evaluate(() => [document.getElementById('mdp').type, document.querySelector('.mrt-oeil').getAttribute('aria-pressed')]);
    await p.click('.mrt-oeil');
    pb.push(egal([['text', 'true'], 'password'], [vu, await p.evaluate(() => document.getElementById('mdp').type)], 'œil : affiche puis masque le mot de passe'));
    // Mauvais mot de passe et adresse inconnue : exactement le même message.
    await p.fill('#email', ADRESSE); await p.fill('#mdp', 'mauvais-mot-de-passe');
    await p.click('button[type="submit"]');
    await p.waitForFunction(() => /incorrect/.test(document.getElementById('message').textContent));
    const mauvais = await message(p);
    await p.fill('#email', 'inconnu@exemple.fr');
    await p.click('button[type="submit"]');
    await p.waitForFunction(() => /incorrect/.test(document.getElementById('message').textContent) && !document.querySelector('button[type="submit"]').disabled);
    pb.push(egal(['Adresse ou mot de passe incorrect.', 'Adresse ou mot de passe incorrect.'], [mauvais, await message(p)], 'mauvais mot de passe et adresse inconnue : même message'));
    // Mot mal retiré par le navigateur ? Non : le champ garde sa saisie, le bon mot de passe connecte et mène à l'accueil.
    await p.fill('#email', ADRESSE); await p.fill('#mdp', MDP);
    await p.click('button[type="submit"]');
    await p.waitForURL(/index\.html/);
    await p.waitForSelector('html[data-mrt-donnees]');
    pb.push(egal([true, 'password token'], [/index\.html/.test(p.url()), qui(d).filter(x => /token/.test(x)).length === 3 ? 'password token' : qui(d).join()], 'bon mot de passe : connecté, direction l\'accueil'));
    pb.push(egal([], erreurs, 'connexion, erreurs JavaScript'));
    await ctx.close();

    // Mot de passe oublié : champ vide refusé ; même réponse pour une adresse connue ou inconnue ; lien de retour sur la page « nouveau mot de passe ».
    d = neuve({ maintenant: null });
    ({ p, ctx, erreurs } = await visiteur('connexion.html', d));
    await p.click('#oubli');
    pb.push(egal('Saisis ton adresse e-mail.', await message(p), 'mot de passe oublié : adresse vide refusée'));
    const envoi = async adresse => { await p.fill('#email', adresse); await p.click('#oubli'); await p.waitForFunction(() => /e-mail vient/.test(document.getElementById('message').textContent)); return message(p); };
    const connu = await envoi(ADRESSE), inconnu = await envoi('inconnu@exemple.fr');
    pb.push(egal(['Si un compte existe pour cette adresse, un e-mail vient d\'être envoyé.', true], [connu, connu === inconnu], 'mot de passe oublié : même réponse pour une adresse connue ou inconnue'));
    const recup = d.auth.appels.filter(a => a.chemin === 'recover');
    pb.push(egal([2, true], [recup.length, recup.every(a => /redirect_to=[^&]*nouveau-mot-de-passe\.html/.test(a.requete))], 'mot de passe oublié : deux demandes, lien de retour vers la page du nouveau mot de passe'));
    pb.push(egal([], erreurs, 'mot de passe oublié, erreurs JavaScript'));
    await ctx.close();

    // Contrôle anti-robot refusé par Supabase : dit tel quel, à la connexion comme pour « Mot de passe oublié ? ».
    d = neuve({ maintenant: null, captchaRefuse: true });
    ({ p, ctx } = await visiteur('connexion.html', d));
    await p.fill('#email', ADRESSE); await p.click('#oubli');
    await p.waitForFunction(() => /anti-robot/.test(document.getElementById('message').textContent));
    const refusOubli = await message(p);
    await p.fill('#mdp', MDP); await p.click('button[type="submit"]');
    await p.waitForFunction(() => /anti-robot/.test(document.getElementById('message').textContent) && !document.querySelector('button[type="submit"]').disabled);
    pb.push(egal(['Contrôle anti-robot non validé : réessaie.', 'Contrôle anti-robot non validé : réessaie.'], [refusOubli, await message(p)], 'anti-robot refusé : dit pour « Mot de passe oublié ? » et pour la connexion'));
    await ctx.close();

    // Lien reçu : nouveau mot de passe (14 caractères au moins, deux saisies identiques) ; autres appareils déconnectés ; accueil.
    d = neuve({ maintenant: null });
    const lien = '#access_token=essai&refresh_token=essai&expires_in=3600&token_type=bearer&type=recovery';
    ({ p, ctx, erreurs } = await visiteur('nouveau-mot-de-passe.html' + lien, d));
    await p.waitForSelector('#form-mdp:not([hidden])');
    await p.fill('#mdp', 'treize-caract'); await p.fill('#mdp2', 'treize-caract');
    await p.click('button[type="submit"]');
    pb.push(egal('Au moins 14 caractères.', await message(p), 'nouveau mot de passe : 13 caractères refusés'));
    await p.fill('#mdp', NEUF); await p.fill('#mdp2', NEUF + 'x');
    await p.click('button[type="submit"]');
    pb.push(egal('Les deux saisies sont différentes.', await message(p), 'nouveau mot de passe : confirmation différente refusée'));
    pb.push(egal(false, qui(d).includes('PUT user'), 'nouveau mot de passe : rien d\'enregistré tant qu\'une erreur demeure'));
    await p.fill('#mdp2', NEUF);
    await p.click('button[type="submit"]');
    await p.waitForURL(/index\.html/);
    pb.push(egal([NEUF, true, true], [d.auth.mdp[ADRESSE], d.auth.appels.some(a => a.chemin === 'logout' && /scope=others/.test(a.requete)), /index\.html/.test(p.url())],
      'nouveau mot de passe : enregistré, autres appareils déconnectés, direction l\'accueil'));
    pb.push(egal([], erreurs, 'nouveau mot de passe, erreurs JavaScript'));
    await ctx.close();
    // Lien périmé ou déjà utilisé.
    d = neuve({ maintenant: null });
    ({ p, ctx } = await visiteur('nouveau-mot-de-passe.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', d));
    await p.waitForFunction(() => /expiré/.test(document.getElementById('message').textContent));
    pb.push(egal([ 'Lien expiré : demande-en un nouveau.', true], [await message(p), await p.locator('#form-mdp').isHidden()], 'lien périmé : « Lien expiré », pas de formulaire'));
    await ctx.close();

    // Créer un compte (spécification générale, § 3, C1 à C15). Réglages du site remplacés au chargement : inscription ouverte ou non, politique de confidentialité.
    const reglages = reglagesSite;
    const inscrit = async (page, d, r) => {
      const ctx = await nav.newContext({ viewport: { width: 390, height: 900 }, timezoneId: PARIS.fuseau });
      await ctx.route('https://cdn.jsdelivr.net/**', x => x.fulfill({ body: LIB, contentType: 'application/javascript' }));
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, x => x.fulfill({ body: '', contentType: 'text/css' }));
      await ctx.addInitScript(reglages(r));
      await simulerBase(ctx, d);
      const p = await ctx.newPage();
      const erreurs = [];
      p.on('pageerror', e => erreurs.push(e.message));
      await p.goto(RACINE + page);
      return { p, ctx, erreurs };
    };
    // Inscription fermée (réglage du site) : pas de lien sur la connexion ; la page dit que ce n'est pas ouvert, sans formulaire.
    d = neuve({ maintenant: null });
    ({ p, ctx } = await inscrit('connexion.html', d, { inscription: false }));
    pb.push(egal(false, await p.locator('#inscription').isVisible(), 'inscription fermée : pas de « Créer un compte » sur la connexion'));
    await p.goto(RACINE + 'creer-compte.html');
    await p.waitForFunction(() => /pas encore ouvertes/.test(document.getElementById('message').textContent));
    pb.push(egal(['Les inscriptions ne sont pas encore ouvertes.', true], [await message(p), await p.locator('#form-compte').isHidden()], 'inscription fermée : message, pas de formulaire'));
    await ctx.close();
    // Inscription ouverte : lien sur la connexion ; champs, étoiles, case de confidentialité absente sans politique.
    d = neuve({ maintenant: null });
    ({ p, ctx, erreurs } = await inscrit('connexion.html', d, { inscription: true, confidentialite: '' }));
    pb.push(egal([true, 'creer-compte.html'], [await p.locator('#inscription').isVisible(), await p.getAttribute('#inscription', 'href')], 'inscription ouverte : « Créer un compte » sur la connexion'));
    await p.click('#inscription');
    await p.waitForSelector('#form-compte:not([hidden])');
    pb.push(egal({ libelles: ['Prénom*', 'Nom*', 'Adresse e-mail*', 'Mot de passe*', 'Confirmation*'], cote: true, oeils: 2, accord: false, bouton: 'Créer mon compte', retour: 'Déjà un compte ? Se connecter', entete: 0 },
      await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return {
        libelles: [...document.querySelectorAll('#form-compte > label:not(.cc-accord), .cc-ligne label')].map(l => l.textContent).sort((a, b) => ['Prénom*', 'Nom*', 'Adresse e-mail*', 'Mot de passe*', 'Confirmation*'].indexOf(a) - ['Prénom*', 'Nom*', 'Adresse e-mail*', 'Mot de passe*', 'Confirmation*'].indexOf(b)),
        cote: Math.abs(r('prenom').top - r('nom').top) < 1 && r('prenom').right < r('nom').left, oeils: document.querySelectorAll('#form-compte .mrt-oeil').length,
        accord: !document.getElementById('accord').hidden, bouton: document.querySelector('#form-compte button[type="submit"]').textContent,
        retour: document.getElementById('retour').textContent, entete: document.querySelectorAll('.mrt-header').length }; }),
      'créer un compte : cinq champs obligatoires, prénom et nom côte à côte à 390 px, deux yeux, pas de case sans politique'));
    const creer = async (v) => { for (const [k, x] of Object.entries(v)) await p.fill('#' + k, x); await p.click('#form-compte button[type="submit"]'); return message(p); };
    const base = { prenom: 'Camille', nom: 'Essai', email: 'nouveau@exemple.fr', mdp: NEUF, mdp2: NEUF };
    pb.push(egal(['Remplis les champs obligatoires.', 'Au moins 14 caractères.', 'Les deux saisies sont différentes.', 'Différent de l\'adresse e-mail.', false],
      [await creer(Object.assign({}, base, { nom: ' ' })), await creer(Object.assign({}, base, { mdp: 'treize-caract', mdp2: 'treize-caract' })),
        await creer(Object.assign({}, base, { mdp2: NEUF + 'x' })), await creer(Object.assign({}, base, { email: 'adresse-longue@exemple.fr', mdp: 'adresse-longue@exemple.fr', mdp2: 'adresse-longue@exemple.fr' })),
        qui(d).includes('POST signup')],
      'créer un compte : champ vide, 13 caractères, saisies différentes, mot de passe égal à l\'adresse refusés ; rien d\'envoyé'));
    await creer(base);
    await p.waitForFunction(() => /confirmation vient/.test(document.getElementById('message').textContent));
    const insc = d.auth.appels.filter(a => a.chemin === 'signup');
    pb.push(egal([1, { prenom: 'Camille', nom: 'Essai' }, 'nouveau@exemple.fr', true, 'Si l\'adresse est valide, un e-mail de confirmation vient d\'être envoyé. Ouvre le lien pour accéder à ton espace.', true],
      [insc.length, insc[0] && insc[0].corps.data, insc[0] && insc[0].corps.email, !!insc[0] && /redirect_to=[^&]*connexion\.html%3Fconfirme%3D1/.test(insc[0].requete), await message(p), await p.locator('#form-compte').isHidden()],
      'créer un compte : prénom et nom envoyés, retour vers la connexion, message neutre, formulaire masqué'));
    pb.push(egal([], erreurs, 'créer un compte, erreurs JavaScript'));
    await ctx.close();
    // Politique de confidentialité renseignée : la case s'affiche et doit être cochée.
    d = neuve({ maintenant: null });
    ({ p, ctx } = await inscrit('creer-compte.html', d, { inscription: true, confidentialite: 'confidentialite.html' }));
    await p.waitForSelector('#form-compte:not([hidden])');
    const refus = await creer(base);
    await p.check('#accepte');
    await p.click('#form-compte button[type="submit"]');
    const refusSante = await message(p);
    await p.check('#accepte-sante');
    await p.click('#form-compte button[type="submit"]');
    await p.waitForFunction(() => /confirmation vient/.test(document.getElementById('message').textContent));
    const envoiAccords = d.auth.appels.filter(a => a.chemin === 'signup');
    pb.push(egal([[true, true], 'confidentialite.html', 'Accepte la politique de confidentialité.', 'Accepte l\'enregistrement de tes données de santé : le plan et la nutrition en dépendent.', 1, true],
      [await p.evaluate(() => [!document.getElementById('accord').hidden, !document.getElementById('accord-sante').hidden]), await p.getAttribute('#lien-confidentialite', 'href'), refus, refusSante, envoiAccords.length,
        !!envoiAccords[0] && !!envoiAccords[0].corps.data.accord_confidentialite && !!envoiAccords[0].corps.data.accord_sante],
      'créer un compte : politique et données de santé, deux cases, refus tant que l\'une manque ; dates des accords gardées avec le compte'));
    await ctx.close();
    // Inscriptions désactivées dans Supabase alors que le site les ouvre : message clair, pas de plantage.
    d = neuve({ maintenant: null, fermee: true });
    ({ p, ctx } = await inscrit('creer-compte.html', d, { inscription: true, confidentialite: '' }));
    await p.waitForSelector('#form-compte:not([hidden])');
    await creer(base);
    await p.waitForFunction(() => /pas encore ouvertes/.test(document.getElementById('message').textContent));
    pb.push(egal(['Les inscriptions ne sont pas encore ouvertes.', false], [await message(p), await p.locator('button[type="submit"]').isDisabled()], 'créer un compte : refusé par Supabase, « pas encore ouvertes »'));
    await ctx.close();
    // Lien de confirmation : la session ouverte par Supabase est refermée ; adresse préremplie, message, on reste sur la connexion.
    d = neuve({ maintenant: null });
    ({ p, ctx, erreurs } = await visiteur('connexion.html?confirme=1#access_token=essai&refresh_token=essai&expires_in=3600&token_type=bearer&type=signup', d));
    await p.waitForFunction(() => /Adresse confirmée/.test(document.getElementById('message').textContent));
    await p.waitForTimeout(300);
    pb.push(egal(['Adresse confirmée, tu peux te connecter.', 'essai@exemple.fr', true, true], [await message(p), await p.inputValue('#email'), qui(d).includes('POST logout'), /connexion\.html$/.test(p.url())],
      'lien de confirmation : déconnecté, adresse préremplie, « Adresse confirmée », on reste sur la connexion'));
    pb.push(egal([], erreurs, 'lien de confirmation, erreurs JavaScript'));
    await ctx.close();
    d = neuve({ maintenant: null });
    ({ p, ctx } = await visiteur('connexion.html?confirme=1#error=access_denied&error_code=otp_expired', d));
    await p.waitForFunction(() => /expiré/.test(document.getElementById('message').textContent));
    pb.push(egal('Lien expiré : crée de nouveau ton compte avec la même adresse pour en recevoir un autre.', await message(p), 'lien de confirmation périmé : message'));
    await ctx.close();

    // Préférences : changer le mot de passe.
    d = neuve();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preferences.html', 1200, d, {}, PARIS));
    const msgPref = () => p.locator('#mdp-msg').textContent();
    const saisir = async (actuel, nouveau, confirmation) => { await p.fill('#mdp-actuel', actuel); await p.fill('#mdp-nouveau', nouveau); await p.fill('#mdp-confirmation', confirmation); await p.click('#form-mdp button[type="submit"]'); };
    pb.push(egal([true, true], [await p.locator('#mdp-ouvrir').isVisible(), await p.locator('#form-mdp').isHidden()], 'Préférences : « Changer le mot de passe », formulaire replié'));
    await p.click('#mdp-ouvrir');
    pb.push(egal(['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmation'], await p.evaluate(() => [...document.querySelectorAll('#form-mdp label')].map(l => l.textContent)), 'Préférences : trois champs'));
    await saisir(MDP, 'treize-caract', 'treize-caract');
    pb.push(egal('Au moins 14 caractères.', await msgPref(), 'Préférences : 13 caractères refusés'));
    await saisir(MDP, NEUF, NEUF + 'x');
    pb.push(egal('Les deux saisies sont différentes.', await msgPref(), 'Préférences : confirmation différente refusée'));
    await saisir('pas-le-bon-mot-de-passe', NEUF, NEUF);
    await p.waitForFunction(() => /actuel incorrect/.test(document.getElementById('mdp-msg').textContent));
    pb.push(egal([MDP, false], [d.auth.mdp[ADRESSE], qui(d).includes('PUT user')], 'Préférences : mot de passe actuel incorrect, rien de modifié'));
    await saisir(MDP, MDP, MDP);
    await p.waitForFunction(() => /différent de l'actuel/.test(document.getElementById('mdp-msg').textContent));
    pb.push(egal('Choisis un mot de passe différent de l\'actuel.', await msgPref(), 'Préférences : nouveau identique à l\'actuel refusé'));
    await saisir(MDP, NEUF, NEUF);
    await p.waitForFunction(() => /Mot de passe modifié/.test(document.getElementById('mdp-msg').textContent));
    pb.push(egal([NEUF, true, true, 'Mot de passe modifié.'], [d.auth.mdp[ADRESSE], await p.locator('#form-mdp').isHidden(), d.auth.appels.some(a => a.chemin === 'logout' && /scope=others/.test(a.requete)), await msgPref()],
      'Préférences : mot de passe modifié, formulaire replié, autres appareils déconnectés'));
    pb.push(egal([], erreurs, 'Préférences, mot de passe, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },

  async themes(nav, db0) {
    const pb = [];
    const db = JSON.parse(JSON.stringify(db0));
    db.preferences[0].theme = 'vert-rose';
    for (const [page, sel] of [['index.html', '.ac-bloc'], ['calendrier.html#annee', '.cal-cadre'], ['calendrier.html', '.cal-cadre'], ['palmares.html', '.pv2-card'], ['objectif.html', '.ob-carte']]) {
      const { p, ctx } = await ouvrir(nav, page, 1200, db, {}, PARIS);
      await p.waitForSelector(sel).catch(() => {});
      const r = await p.evaluate(s => {
        const e = document.querySelector(s);
        return { classe: document.documentElement.className.split(' ').filter(c => c.startsWith('t-')), fond: getComputedStyle(document.body).backgroundColor, cadre: e ? getComputedStyle(e).backgroundColor : null };
      }, sel);
      pb.push(egal({ classe: ['t-vert-rose'], fond: 'rgb(14, 29, 25)', cadre: 'rgb(24, 51, 46)' }, r, page + ' : thème Vert et rose'));
      await ctx.close();
    }
    // Fond blanc et fond noir (lecture claire ou sombre) : fond, cadres, contrôles du navigateur ; encre fixe sur la couleur
    // d'une course ; phases plus foncées sur fond blanc.
    for (const [theme, fond, cadre, schema] of [['blanc-orange', 'rgb(255, 255, 255)', 'rgb(243, 245, 248)', 'light'], ['noir-orange', 'rgb(0, 0, 0)', 'rgb(18, 18, 18)', 'dark']]) {
      const d = jeuObjectif(db0).db; // Trail du Lac le 15 novembre : le mois de novembre, case « Phases » cochée
      d.preferences[0].theme = theme;
      const { p, ctx } = await ouvrir(nav, 'calendrier.html#mois=2026-11', 1200, d, { 'mrt-calendrier-phases': '1' }, PARIS);
      pb.push(egal({ classe: ['t-' + theme], fond, cadre, schema, encre: 'rgb(11, 18, 32)', retenu: theme }, await p.evaluate(() => ({
        classe: document.documentElement.className.split(' ').filter(c => c.startsWith('t-')), fond: getComputedStyle(document.body).backgroundColor,
        cadre: getComputedStyle(document.querySelector('.cal-cadre')).backgroundColor, schema: getComputedStyle(document.documentElement).colorScheme,
        encre: getComputedStyle(document.querySelector('.cal-m2-course.c-trail-v')).color, retenu: localStorage.getItem('mrt-theme') })), theme + ' : fond, cadre, contrôles, encre sur la couleur d\'une course, thème retenu'));
      if (theme === 'blanc-orange') pb.push(egal('rgb(148, 98, 0)', await p.evaluate(() => getComputedStyle(document.querySelector('.cal-legende .cal-k.ph-developpement')).backgroundColor),
        'fond blanc : Développement plus foncé (légende des phases)'));
      await ctx.close();
    }
    // Automatique : noir-orange quand l'appareil est en mode sombre, blanc-orange en mode clair, et il suit le changement sans recharger.
    {
      const d = JSON.parse(JSON.stringify(db0));
      d.preferences[0].theme = 'auto';
      const { p, ctx } = await ouvrir(nav, 'index.html', 1200, d, {}, PARIS);
      const classe = () => p.evaluate(() => document.documentElement.className.split(' ').filter(c => c.startsWith('t-')));
      await p.emulateMedia({ colorScheme: 'dark' }); await pause();
      const nuit = await classe();
      await p.emulateMedia({ colorScheme: 'light' }); await pause();
      pb.push(egal([['t-noir-orange'], ['t-blanc-orange']], [nuit, await classe()], 'Automatique : noir en mode sombre, blanc en mode clair, sans recharger'));
      // Page suivante : le thème retenu est posé dès le chargement, avant la lecture des préférences (pas d'éclair d'un autre fond).
      await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__theme = document.documentElement.className.split(' ').filter(c => c.startsWith('t-')); }));
      await p.emulateMedia({ colorScheme: 'dark' });
      await p.goto(RACINE + 'objectif.html'); await p.waitForSelector('html[data-mrt-donnees]');
      pb.push(egal(['t-noir-orange'], await p.evaluate(() => window.__theme), 'page suivante : le thème (Automatique, appareil sombre) posé dès le chargement'));
      await ctx.close();
    }
    // Site partagé : le thème du propriétaire (Vert et rose), pas celui du visiteur (Bleu et orange), même en passant
    // d'une page à l'autre (en-tête gardé pour la visite) ; pas d'engrenage vers les Préférences.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db0));
    partage.preferences[0].theme = 'bleu-orange';
    partage.courses = partage.courses.map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'vert-rose', course_cap: null, modules: null, palmares_groupe: false });
    const { p, ctx } = await ouvrir(nav, 'objectif.html', 1200, partage, { 'mrt-vue': autre }, PARIS);
    for (const page of ['objectif.html', 'index.html', 'calendrier.html', 'objectif.html']) {
      await p.goto(RACINE + page); await p.waitForSelector('.mrt-nav'); await pause();
      pb.push(egal({ classe: ['t-vert-rose'], engrenage: 0 }, await p.evaluate(() => ({ classe: document.documentElement.className.split(' ').filter(c => c.startsWith('t-')),
        engrenage: document.querySelectorAll('.mrt-gear').length })), 'site partagé, ' + page + ' : thème du propriétaire, sans engrenage'));
    }
    await ctx.close();
    return pb;
  },

  // Repasse de navigation et de design (30 oct. 2026) : croix de « Course introuvable », course courue ouverte de partout,
  // menu sans modules « bientôt », retour = Annuler pour la fiche seule, pastilles et « Aujourd'hui » du Calendrier,
  // engrenage dessiné ; plus d'Accent 2 ; champs, fenêtres, boutons, croix et libellés communs (design.md, § 1).
  async repasse(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const copie = () => JSON.parse(JSON.stringify(db));
    const SEMI = '00000000-0000-0000-0001-000000000007';
    const style = (p, sel, prop = 'color') => p.evaluate(([s, pr]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[pr] : null; }, [sel, prop]);
    const role = (p, nom) => p.evaluate(n => { const d = document.createElement('i'); d.style.color = 'var(' + n + ')'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, nom);
    const ouverte = p => p.evaluate(() => !!document.querySelector('.mc-voile'));
    const page = p => p.url().split('/').pop();

    // N1 : course introuvable, la croix ferme la feuille (plein écran sur téléphone).
    let { p, ctx } = await ouvrir(nav, 'course.html?id=' + id(99), 390, copie(), {}, PARIS);
    await p.click('.pc-fermer'); await pause();
    // (En file://, le navigateur refuse de changer l'adresse : on regarde la page laissée dessous.)
    const route = q => q.evaluate(() => !!document.querySelector('.ob-carte'));
    pb.push(egal([false, true], [await ouverte(p), await route(p)], 'course introuvable : la croix ferme la feuille, la feuille de route dessous'));
    await ctx.close();

    // N2 : une course courue s'ouvre avec son résultat, d'où qu'elle vienne.
    const resultat = q => q.evaluate(() => ({ sur: (document.querySelector('.pc-section .pc-intertitre span') || {}).textContent || null,
      temps: [...document.querySelectorAll('.pc-res-ligne .ob-lib')].some(l => l.textContent === 'Temps'), voisines: document.querySelectorAll('.pc-nav a').length }));
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + SEMI, 1200, copie(), {}, PARIS));
    pb.push(egal({ sur: 'Résultat', temps: true, voisines: 1 }, await resultat(p), 'adresse d\'une course courue : son résultat ; la plus récente, une seule voisine (par date)'));
    await p.click('.pc-fermer'); await pause();
    pb.push(egal([false, true], [await ouverte(p), await route(p)], 'course courue ouverte par son adresse : fermer laisse la feuille de route'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#annee', 1200, copie(), {}, PARIS));
    await p.locator('[data-course="' + SEMI + '"]').scrollIntoViewIfNeeded();
    await p.click('[data-course="' + SEMI + '"]'); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal([SEMI, 'Résultat'], [await p.evaluate(() => history.state && history.state.mrtCourse), (await resultat(p)).sur], 'Calendrier, vue Année : une course courue ouvre son résultat'));
    await ctx.close();
    const accueil = copie(); accueil.preferences[0].accueil_blocs = ['derniere'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, accueil, {}, PARIS));
    await p.click('[data-bloc="derniere"] .ob-ligne a'); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Semi de San Sebastián', 'Résultat'], [(await p.textContent('.pc-titre')).trim(), (await resultat(p)).sur], 'En un coup d\'œil, Dernière course : son nom ouvre son résultat'));
    await ctx.close();

    // N3 : sur téléphone, le menu défile et l'onglet de la page ouverte est ramené dans l'écran (23 nov. 2026).
    for (const w of [375, 390]) for (const pg of ['index.html', 'palmares.html']) {
      ({ p, ctx } = await ouvrir(nav, pg, w, copie(), {}, PARIS));
      pb.push(egal({ onglets: ['En un coup d\'œil', 'Les courses', 'Ma saison', 'Calendrier', 'Mon palmarès', 'Mon profil'], visibles: true }, await p.evaluate(async () => {
        await new Promise(r => setTimeout(r, 300));
        const bar = document.querySelector('.mrt-nav-inner'), t = [...document.querySelectorAll('.mrt-tab')], on = t.filter(x => x.classList.contains('is-on'));
        return { onglets: t.map(x => x.getAttribute('aria-label') || x.textContent),
          visibles: on.length === 1 && on.every(x => x.offsetLeft - bar.scrollLeft >= 0 && x.offsetLeft - bar.scrollLeft + x.offsetWidth <= bar.clientWidth) };
      }), 'menu à ' + w + ' px, ' + pg + ' : les modules construits, l\'onglet ouvert est dans l\'écran'));
      await ctx.close();
    }

    // N4 : fiche à elle seule (« Ajouter une course », crayon du Palmarès) : le retour du navigateur fait « Annuler ».
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, copie(), {}, PARIS));
    const questions = [];
    let reponse = 'dismiss';
    await surDialogue(p, q => { questions.push(q); return reponse === 'accept'; });
    const fiche = q => q.evaluate(() => !!document.querySelector('.fc-fiche'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.goBack(); await pause();
    pb.push(egal([false, 'objectif.html', []], [await fiche(p), page(p), questions.slice()], 'Ajouter une course, retour sans saisie : la fiche se ferme, la page reste'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Essai');
    await p.goBack(); await pause();
    pb.push(egal([true, ['Abandonner les modifications ?']], [await fiche(p), questions.slice()], 'retour après une saisie : « Abandonner les modifications ? » ; refusé, la fiche reste'));
    reponse = 'accept';
    await p.goBack(); await pause();
    pb.push(egal([false, 'objectif.html'], [await fiche(p), page(p)], 'abandon accepté : la fiche se ferme, la page reste'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.click('.fc-barre [data-fc="annuler"]'); await pause();
    pb.push(egal([false, null], [await fiche(p), await p.evaluate(() => history.state)], '« Annuler » : la fiche se ferme et retire son entrée d\'historique'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, copie(), {}, PARIS));
    await p.evaluate(() => document.querySelector('.pv2-edit').click()); await p.waitForSelector('.fc-fiche');
    await p.goBack(); await pause();
    pb.push(egal([false, 'palmares.html'], [await fiche(p), page(p)], 'crayon du Palmarès, retour : la fiche se ferme, le Palmarès reste'));
    await ctx.close();

    // N5 : Calendrier, menu « Vue » (la vue Semaine par défaut), bouton « Plan », « Aujourd'hui » (Calendrier 0.17).
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, copie(), {}, PARIS));
    const vues = () => p.evaluate(() => { const b = document.querySelector('[data-menu]'), m = document.querySelector('.cal-menu');
      return [b.textContent.trim(), m.hidden, b.getAttribute('aria-expanded'), [...m.querySelectorAll('a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))]; });
    pb.push(egal(['Semaine', true, 'false', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], await vues(), 'Calendrier : menu « Vue » fermé, sur Semaine (vue par défaut)'));
    await p.click('[data-menu]');
    pb.push(egal(['Semaine', false, 'true', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], await vues(), 'un toucher sur son bouton : le menu s\'ouvre'));
    await p.keyboard.press('Escape');
    pb.push(egal([true, true], [(await vues())[1], await p.evaluate(() => document.activeElement === document.querySelector('[data-menu]'))], 'Échap : le menu se ferme, le bouton garde la main'));
    await p.keyboard.press('Enter');
    pb.push(egal([false, true], [(await vues())[1], await p.evaluate(() => document.activeElement === document.querySelector('.cal-menu a.is-on'))], 'ouvert au clavier : la main sur le choix en cours'));
    await p.locator('.cal-s-titre').nth(2).click();
    pb.push(egal(true, (await vues())[1], 'toucher ailleurs : le menu se ferme'));
    await p.click('[data-menu]'); await p.click('.cal-menu [data-periode="12"]'); await pause();
    pb.push(egal([['Année', true, 'false', ['Semaine', 'Mois', '3 mois', '6 mois', 'Année *']], 1, '#annee'], [await vues(), await p.locator('.cal-y').count(), await p.evaluate(() => location.hash)],
      'choisir « Année » : la vue Année, le menu refermé'));
    await p.click('[data-plan]'); await pause();
    pb.push(egal(['true', '1', true], [await p.getAttribute('[data-plan]', 'aria-pressed'), await p.evaluate(() => localStorage.getItem('mrt-calendrier-phases')), await p.locator('.cal-y-j[class*="ph-"]').count() > 0],
      'bouton « Plan » : enfoncé, les fonds de phase, retenu sur l\'appareil'));
    await p.click('[data-plan]'); await pause();
    await p.click('[data-menu]'); await p.click('.cal-menu [data-vue="mois"]'); await pause();
    await p.click('[aria-label="Mois suivant"]'); await pause(); await p.click('[aria-label="Mois suivant"]'); await pause();
    const loin = await p.textContent('.cal-titre');
    await p.click('.cal-auj'); await pause();
    pb.push(egal(['Décembre 2026', 'Octobre 2026', 'Mois', 'false'], [loin, await p.textContent('.cal-titre'), (await vues())[0], await p.getAttribute('[data-plan]', 'aria-pressed')],
      '« Aujourd\'hui » ramène au mois en cours'));
    await ctx.close();

    // N6 : engrenage dessiné, en Accent sur les Préférences seulement.
    for (const [pg, attendu] of [['objectif.html', '--muted'], ['preferences.html', '--accent']]) {
      ({ p, ctx } = await ouvrir(nav, pg, 1200, copie(), {}, PARIS));
      pb.push(egal([true, '', await role(p, attendu)], [await p.evaluate(() => !!document.querySelector('.mrt-gear svg')), (await p.textContent('.mrt-gear')).trim(), await style(p, '.mrt-gear')],
        pg + ' : engrenage dessiné, ' + (attendu === '--accent' ? 'en Accent' : 'discret')));
      await ctx.close();
    }

    // D1 : plus d'Accent 2 ; les repères en Accent (option B) ; le bouton principal s'éclaircit au survol.
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, copie(), {}, PARIS));
    pb.push(egal(['', '', ''], await p.evaluate(() => ['bleu-orange', 'vert-rose', 'violet-turquoise'].map(t => { window.appliquerTheme(t); return getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim(); })), 'plus d\'Accent 2 dans les trois thèmes'));
    await p.evaluate(() => window.appliquerTheme('bleu-orange'));
    const accent = await role(p, '--accent');
    pb.push(egal({ role: accent, pastille: accent, inscrit: accent, bientot: accent }, await p.evaluate(() => {
      const st = (s, pr) => getComputedStyle(document.querySelector(s))[pr];
      return { role: st('.ob-role.is-obj', 'color'), pastille: st('.ob-et.is-obj .ob-pt', 'backgroundColor'), inscrit: st('.ob-ins.is-inscrit i', 'backgroundColor'), bientot: st('.ob-ins.is-bientot i', 'borderTopColor') };
    }), 'Objectif (rôle, pastille) et points du dossard en Accent'));
    await p.hover('.ob-ajout');
    const survol = await style(p, '.ob-ajout', 'backgroundColor');
    pb.push(egal([false, false], [survol === 'rgb(255, 212, 0)', survol === await role(p, '--accent')], 'bouton principal au survol : Accent éclairci (' + survol + ')'));
    await ctx.close();

    // D2 à D6 : champs communs (fond Champ, entre Fond et Surface ; coins de 6 px ; Accent au focus) ; fenêtres comme la fiche ; un seul bouton
    // principal ; libellés à 0,7 rem en Space Mono ; astérisque en Accent ; une seule croix ; « Toutes les semaines » au chevron.
    const champs = q => q.evaluate(() => {
      const t = document.createElement('i'); t.style.backgroundColor = 'var(--champ)'; document.body.append(t);
      const fond = getComputedStyle(t).backgroundColor, page = getComputedStyle(document.body).backgroundColor; t.remove();
      return [...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea')]
        .filter(e => e.getClientRects().length).map(e => { const st = getComputedStyle(e);
          return (e.classList.contains('mrt-champ') ? '' : 'sans mrt-champ : ') + (st.backgroundColor === fond && fond !== page && fond !== 'rgba(0, 0, 0, 0)' ? 'fond Champ' : st.backgroundColor) + ' ' + st.borderTopLeftRadius; })
        .filter((x, i, l) => l.indexOf(x) === i);
    });
    const COMMUN = ['fond Champ 6px'];
    const fenetre = q => q.evaluate(() => { const v = document.querySelector('.cal-panneau'), t = v.querySelector('.cal-panneau-titre'), d = document.createElement('div');
      d.className = 'mc-voile'; d.style.display = 'none'; document.body.append(d); const voile = getComputedStyle(d).backgroundColor; d.remove();
      return { barre: [...v.querySelectorAll('.cal-barre .mrt-btn')].map(x => x.textContent.trim() + (x.classList.contains('is-principal') ? ' *' : '')),
        titre: getComputedStyle(t).textTransform + ' ' + getComputedStyle(t).fontFamily.split(',')[0].replace(/"/g, ''), voile: getComputedStyle(document.querySelector('.cal-voile')).backgroundColor === voile,
        libelles: [...new Set([...v.querySelectorAll('.cal-champ span')].map(s => getComputedStyle(s).fontSize))] }; });
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(1), 1200, copie(), {}, PARIS));
    pb.push(egal({ textes: ['12.8px'], sources: '12px', picto: 15, lien: true, croix: '18px' }, await p.evaluate(() => ({
      textes: [...new Set([...document.querySelectorAll('#preparation .cal-plan-dates, #preparation .pr-avis-n, #preparation .pr-avis-r')].map(e => getComputedStyle(e).fontSize))],
      sources: getComputedStyle(document.querySelector('#preparation .pr-sources')).fontSize, picto: Math.round(parseFloat(getComputedStyle(document.querySelector('#preparation .pr-avis-n .mrt-ico')).width)),
      lien: document.querySelector('#preparation .cal-regler').classList.contains('mrt-lien'),
      croix: getComputedStyle(document.querySelector('.pc-fermer .mrt-ico')).width })), 'rubrique Préparation : textes en 0,8 rem, sources en 0,75 rem, picto commun, lien d\'action ; croix de la feuille'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(COMMUN, await champs(p), 'fiche d\'une course : champs communs'));
    pb.push(egal({ principaux: 1, parametrer: false, oblig: await role(p, '--accent') }, await p.evaluate(() => ({ principaux: document.querySelectorAll('.fc-fiche .mrt-btn.is-principal').length,
      parametrer: !!document.querySelector('[data-fc="preparer"]'), oblig: getComputedStyle(document.querySelector('.fc-oblig')).color })), 'fiche : un seul bouton principal, aucun bouton de réglage du plan, astérisque en Accent'));
    await p.focus('#fc-lieu');
    pb.push(egal(await role(p, '--accent'), await style(p, '#fc-lieu', 'borderTopColor'), 'champ en cours de saisie : bordure en Accent'));
    await p.selectOption('#fc-statut', 'option');
    const nouveau = () => p.evaluate(() => document.querySelector('#fc-groupe_nouveau').getClientRects().length > 0);
    const avantChoix = await nouveau();
    await p.selectOption('#fc-groupe_options', '__nouveau__');
    pb.push(egal([false, true], [avantChoix, await nouveau()], 'Option : le champ « Nouveau groupe » n\'apparaît qu\'une fois choisi'));
    await p.selectOption('#fc-statut', 'confirmee');
    await ctx.close();
    {
      const q = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
      await q.p.waitForSelector('[data-reglages]'); await reglage(q.p, '[data-preparer]'); await q.p.waitForSelector('.cal-preparer');
      pb.push(egal(COMMUN, await champs(q.p), 'fenêtre « Régler les phases » : champs communs'));
      pb.push(egal({ barre: ['Annuler', 'Enregistrer *'], titre: 'uppercase Space Mono', voile: true, libelles: ['11.2px'] }, await fenetre(q.p), 'fenêtre « Régler les phases » : comme la fiche'));
      await q.ctx.close();
    }
    const seances = copie();
    seances.seances = [{ id: 'se-1', utilisateur: seances.profils[0].id, date: '2026-10-21', type: 'run', libelle: 'Footing 45 min', faite: false, course: null }];
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines', 1200, seances, {}, PARIS));
    await p.click('[data-edit="se-1"]'); await p.waitForSelector('.cal-seance');
    pb.push(egal(COMMUN, await champs(p), 'fenêtre d\'une séance : champs communs'));
    pb.push(egal({ barre: ['Annuler', 'Enregistrer *'], titre: 'uppercase Space Mono', voile: true, libelles: ['11.2px'] }, await fenetre(p), 'fenêtre d\'une séance : comme la fiche'));
    pb.push(egal(['Supprimer la séance', true, true], await p.evaluate(() => { const b = document.querySelector('.cal-bas .mrt-btn.is-danger'); return b ? [b.textContent.trim(), !!b.querySelector('svg'), b.getBoundingClientRect().top > document.querySelector('.cal-champ:last-of-type').getBoundingClientRect().bottom] : null; }),
      'séance : « Supprimer la séance » à contour Alerte, seul en bas'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, copie(), {}, PARIS));
    await p.click('.pv2-btn');
    pb.push(egal(COMMUN, await champs(p), 'filtres du Palmarès : champs communs'));
    pb.push(egal(['Réduire les filtres', true], await p.evaluate(() => { const b = document.querySelector('.pv2-panel:not(.pv2-cols) .pv2-close'); return [b.getAttribute('aria-label'), b.classList.contains('mrt-rond')]; }), 'panneau des filtres : rond commun « Réduire »'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preferences.html', 1200, copie(), {}, PARIS));
    pb.push(egal(COMMUN, await champs(p), 'Préférences : champs communs'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, copie(), {}, PARIS));
    pb.push(egal(['Space Mono', 'Space Mono'], await p.evaluate(() => ['.mrt-stat-label', '.mrt-days-label'].map(s => getComputedStyle(document.querySelector(s)).fontFamily.split(',')[0].replace(/"/g, ''))), 'en-tête : libellés en Space Mono'));
    await ctx.close();
    const anonyme = await nav.newContext({ viewport: { width: 1200, height: 900 } });
    await anonyme.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
    await anonyme.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    p = await anonyme.newPage();
    await p.goto(RACINE + 'connexion.html'); await p.waitForSelector('#email');
    pb.push(egal(COMMUN, await champs(p), 'connexion : le champ commun'));
    await anonyme.close();
    return pb;
  },

  // Graphiques : difficulté (Objectif, § 5.2) et progression (Palmarès, § 12), mesures normées (spécification générale, § 12 bis).
  async graphiques(nav, db0) {
    const pb = [];
    const t = x => (x ? x.textContent.replace(/[\u00a0\u202f]/g, ' ').trim() : null);
    const lire = p => p.evaluate(tx => { const t = eval(tx); const g = document.querySelector('.mg');
      return g && {
        titre: t(g.querySelector('.mg-titre > span')), droite: t(g.querySelector('.mg-droite')), ouvert: (g.querySelector('details.mg-cadre') || {}).open,
        points: [...g.querySelectorAll('.mg-pt')].map(b => b.getAttribute('aria-label') + ' | ' + b.className.replace('mg-pt ', '')),
        graduations: [...g.querySelectorAll('.mg-gy')].map(t), etiquettes: [...g.querySelectorAll('.mg-etiq')].map(t),
        marques: g.querySelectorAll('.mg-marque').length, ligne: g.querySelector('.mg-ligne') ? g.querySelector('.mg-ligne').getAttribute('points').split(' ').length : 0,
        tendance: !!g.querySelector('.mg-tendance'), periode: g.querySelectorAll('.mg-periode').length, jour: !!g.querySelector('.mg-jour'),
        vide: t(g.querySelector('.mg-vide')), bilan: t(g.querySelector('.mg-bilan')) }; }, t.toString());
    // Replier le cadre (sans animation) et attendre que l'état soit retenu sur l'appareil.
    const replier = async (p, cle) => { await p.emulateMedia({ reducedMotion: 'reduce' }); await p.click('.mg-titre');
      for (let k = 0; k < 20 && await p.evaluate(c => localStorage.getItem(c), cle) !== '0'; k++) await p.clock.runFor(100); };
    const bulle = p => p.evaluate(tx => { const t = eval(tx); const b = document.querySelector('.mg-bulle'); return b.hidden ? null : [t(b.querySelector('strong')), t(b.querySelector('.mg-nom')), t(b.querySelector('.mg-sub'))]; }, t.toString());

    // ----- Difficulté : jeu d'essai d'Objectif, avec les courses courues de la même base -----
    const { db } = jeuObjectif(db0);
    let { p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 1200, db, {}, PARIS);
    let g = await lire(p);
    pb.push(egal({ titre: 'Évolution de l\'effort', ouvert: false, avant: true }, { titre: g.titre, ouvert: g.ouvert,
      avant: await p.evaluate(() => !!(document.querySelector('#difficulte').compareDocumentPosition(document.querySelector('#feuille-de-route')) & 4)) }, 'effort : cadre fermé par défaut, au-dessus de la feuille de route'));
    // Ouvrir le cadre : rien n'est retenu, il se referme à chaque chargement.
    await p.emulateMedia({ reducedMotion: 'reduce' }); await p.click('.mg-titre');
    await p.clock.runFor(300);
    pb.push(egal([null, true], await p.evaluate(() => [localStorage.getItem('mrt-graphe-difficulte'), document.querySelector('details.mg-cadre').open]), 'effort : ouvert d\'un toucher, état non retenu'));
    // Titre repliable commun du site : comme les textes d'une course (Texte, 600, 0,85 rem).
    pb.push(egal(['600', '13.6px', true], await p.evaluate(() => { const t = getComputedStyle(document.querySelector('.mg-titre'));
      return [t.fontWeight, t.fontSize, t.color === getComputedStyle(document.body).color]; }), 'difficulté : titre repliable commun'));
    pb.push(egal(['Trail du Lac · Le Tour du Lac, 30,5 km-effort | is-plein', 'Corrida de Noël, 10,4 km-effort | is-plein',
      'Trail des Gorges, 66,0 km-effort | is-plein', 'Trail des Cimes, 67,0 km-effort | is-vide', 'Ultra du Plateau · Le 55, 83,0 km-effort | is-vide',
      'Trail de la Forêt, 42,0 km-effort | is-vide', 'Trail des Crêtes, 95,0 km-effort | is-losange'], g.points,
      'difficulté : km-effort sans D− ; d\'aujourd\'hui à la dernière course, sans courues ; trois signes (point plein, point à contour pour une option, losange)'));
    pb.push(egal({ graduations: ['0', '20', '40', '60', '80', '100'], etiquettes: [], ligne: 4, periode: 0, jour: false, tendance: false },
      { graduations: g.graduations, etiquettes: g.etiquettes, ligne: g.ligne, periode: g.periode, jour: g.jour, tendance: g.tendance }, 'difficulté : axe, étiquettes, ligne des confirmées, mois seul'));
    await p.hover('.mg-pt[aria-label^="Trail des Gorges"]');
    pb.push(egal(['66,0 km-effort', 'Trail des Gorges', '7 mars 2027 · 45 km · 2 100 m D+'], await bulle(p), 'difficulté : bulle au survol'));
    pb.push(egal({ chiffres: false, definition: true, italique: 'italic', apres: true, ligne: ['1px', true], diagonale: 0, bordure: '0px', legende: ['Course', 'Option', 'Objectif'] }, await p.evaluate(() => { const d = document.querySelector('.mg-definition'), l = document.querySelector('.mg-ligne'), lg = document.querySelector('.mg-legende');
      return { chiffres: !!document.querySelector('.mg-chiffres'), definition: !!d && /^L'effort d'une course se mesure ici en km-effort, la mesure normée de l'ITRA/.test(d.textContent) && /100 m de dénivelé positif comptant pour 1 km de plus/.test(d.textContent) && /40 km avec 2 000 m de D\+ pèse donc comme une course de 60 km à plat/.test(d.textContent),
        italique: getComputedStyle(d).fontStyle, apres: !!(lg.compareDocumentPosition(d) & 4),
        ligne: [getComputedStyle(l).strokeWidth, l.classList.contains('is-discrete')], diagonale: document.querySelectorAll('.mg-etiq').length, bordure: getComputedStyle(d).borderTopWidth,
        legende: [...lg.querySelectorAll('li')].map(x => x.textContent.trim()) }; }),
      'difficulté : définition en italique sous la légende (trois signes), sans filet ; ni étiquettes ni traits de période'));
    pb.push(egal([], erreurs, 'difficulté : erreurs JavaScript'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, db, { 'mrt-graphe-difficulte': '1' }, PARIS));
    pb.push(egal(false, (await lire(p)).ouvert, 'effort : toujours fermé à l\'ouverture de la page, même si un ancien état « ouvert » est retenu'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 390, db, {}, PARIS));
    await p.emulateMedia({ reducedMotion: 'reduce' }); await p.click('.mg-titre'); await p.clock.runFor(300);
    pb.push(egal({ etiquettes: false, deborde: false }, await p.evaluate(() => ({ etiquettes: [...document.querySelectorAll('.mg-etiq')].some(e => getComputedStyle(e).display !== 'none'),
      deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth })), 'difficulté, téléphone : pas d\'étiquettes, rien ne dépasse'));
    await ctx.close();

    // ----- Progression : jeu d'essai du Palmarès -----
    const filtre = async (p, sel) => { if (await p.getAttribute('.pv2-btn', 'aria-expanded') !== 'true') await p.click('.pv2-btn'); await p.click(sel); };
    const mesure = async (p, m) => { await p.click('.pv2-graphe [data-mesure="' + m + '"]'); };
    ({ p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, db0));
    g = await lire(p);
    pb.push(egal({ titre: 'Progression', droite: '', bilan: null, ligne: 7, graduations: ['4:30', '5:00', '5:30', '6:00', '6:30', '7:00', '7:30'], marques: 2, tendance: false,
      etiquettes: ['00:51:46', '01:04:24', '01:53:12', '02:02:30', '03:00:23', '00:49:18', '01:56:05'],
      points: ['10 km de Montauban, 5:08 par km | is-plein', 'Épicurienne Trail, 6:00 par km | is-plein', 'Semi-marathon de Sète, 5:24 par km | is-plein',
        'Biscatrail, 6:35 par km | is-plein', 'Forez Trail · L\'Olmetoise, 7:18 par km | is-plein', '10 km de Montauban, 4:55 par km | is-plein',
        'Semi de San Sebastián, 5:30 par km | is-plein'] },
      { titre: g.titre, droite: g.droite, bilan: g.bilan, ligne: g.ligne, graduations: g.graduations, marques: g.marques, tendance: g.tendance, etiquettes: g.etiquettes, points: g.points },
      'progression : allure moyenne par défaut, records, étiquettes, ligne ; pas de tendance (plusieurs formats)'));
    pb.push(egal({ axe: 'min / km', fixe: [false, false], pastilles: ['Allure moyenne*', 'Temps', 'Allure-effort'], titre: [true, '600', '13.6px'] }, await p.evaluate(() => { const t = getComputedStyle(document.querySelector('.pv2-graphe .mg-titre'));
      return { axe: document.querySelector('.mg-axe-y').textContent, fixe: [!!document.querySelector('.pv2-graphe details'), !!document.querySelector('.pv2-graphe .mg-chev')],
        pastilles: [...document.querySelectorAll('.pv2-graphe [data-mesure]')].map(b => b.textContent + (b.classList.contains('is-on') ? '*' : '')),
        titre: [t.color === getComputedStyle(document.body).color, t.fontWeight, t.fontSize] }; }), 'progression : bloc fixe (rien à replier), sélecteur de mesure, axe MIN / KM'));
    pb.push(egal(true, await p.evaluate(() => { const a = document.querySelector('.pv2-graphe'), b = document.querySelector('.pv2-card'); return !!(b.compareDocumentPosition(a) & 4); }), 'progression : sous le tableau'));
    // Tableau : titre « Résultats » au style de « Progression », mêmes marges ; en-têtes calés en haut.
    pb.push(egal({ titre: 'Résultats', style: true, marge: true, date: true }, await p.evaluate(() => {
      const t = document.querySelector('.pv2-card > .mg-titre'), g = document.querySelector('.pv2-graphe .mg-titre'), st = x => { const c = getComputedStyle(x); return [c.fontSize, c.fontWeight, c.color].join(); };
      const haut = (x, cadre) => Math.round(x.getBoundingClientRect().top - cadre.getBoundingClientRect().top);
      const th = [...document.querySelectorAll('.pv2-table thead .pv2-sort')], date = th[0].getBoundingClientRect().top, allure = th.find(b => /Allure/.test(b.textContent)).getBoundingClientRect().top;
      return { titre: t && t.textContent, style: !!t && st(t) === st(g), marge: !!t && haut(t, document.querySelector('.pv2-card')) === haut(g, document.querySelector('.pv2-graphe')), date: Math.abs(date - allure) < 1 }; }),
      'tableau : titre « Résultats » comme « Progression », mêmes marges ; « DATE » à la hauteur de « ALLURE »'));
    pb.push(egal(true, await p.evaluate(() => document.querySelector('.mg-axe-y').getBoundingClientRect().top - document.querySelector('.mg-haut').getBoundingClientRect().bottom >= 24),
      'progression : de l\'air entre le sélecteur et l\'axe'));
    await p.hover('.mg-pt[aria-label^="Semi-marathon de Sète"]');
    pb.push(egal(['5:24 /km', 'Semi-marathon de Sète', '5 oct. 2025 · 01:53:12 · 20,8 km · 56 m D+'], await bulle(p), 'progression : bulle de Sète'));
    await p.hover('.mg-pt[aria-label^="Semi de San Sebastián"]');
    pb.push(egal('4 oct. 2026 · 01:56:05 · 21,1 km · D+ non renseigné', (await bulle(p))[2], 'progression : D+ non renseigné'));
    await mesure(p, 'temps');
    g = await lire(p);
    pb.push(egal({ graduations: ['0:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30'], memo: 'temps' }, { graduations: g.graduations, memo: await p.evaluate(() => localStorage.getItem('mrt-progression-mesure')) }, 'pastille Temps : graduations en h:mm, retenue'));
    pb.push(egal('temps', await p.evaluate(() => document.querySelector('.mg-axe-y').textContent), 'pastille Temps : axe'));
    await p.hover('.mg-pt[aria-label^="Semi-marathon de Sète"]');
    pb.push(egal('01:53:12', (await bulle(p))[0], 'pastille Temps : bulle de Sète'));
    await mesure(p, 'effort');
    g = await lire(p);
    pb.push(egal({ axe: 'min / km-effort', graduations: ['4:30', '5:00', '5:30', '6:00'], points: ['10 km de Montauban, 5:00 par km-effort', 'Épicurienne Trail, 5:04 par km-effort', 'Semi-marathon de Sète, 5:18 par km-effort',
      'Biscatrail, 5:39 par km-effort', 'Forez Trail · L\'Olmetoise, 5:24 par km-effort', '10 km de Montauban, 4:49 par km-effort', 'Semi de San Sebastián, 5:30 par km-effort'] },
      { axe: await p.evaluate(() => document.querySelector('.mg-axe-y').textContent), graduations: g.graduations, points: g.points.map(x => x.split(' | ')[0]) }, 'pastille Allure-effort'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, db0, { 'mrt-progression-mesure': 'effort' }));
    pb.push(egal('min / km-effort', await p.evaluate(() => document.querySelector('.mg-axe-y').textContent), 'page rechargée : la mesure choisie l\'est toujours'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, db0));
    await filtre(p, '.pv2-panel label.pv2-check:has(input[value="Trail"])');
    g = await lire(p);
    pb.push(egal([3, '', false], [g.points.length, g.droite, g.tendance], 'progression, filtre Trail : 3 points, pas de tendance (deux formats)'));
    await p.click('[data-act="clear"]');
    await filtre(p, '.pv2-panel label.pv2-check:has(input[value="10 km"])');
    g = await lire(p);
    pb.push(egal([['10 km de Montauban, 5:08 par km | is-plein', '10 km de Montauban, 4:55 par km | is-plein'], false], [g.points, g.tendance], 'progression, filtre 10 km : 2 points, pas de tendance'));
    await p.click('[data-act="clear"]');
    await p.fill('.pv2-panel input[data-f="course"]', 'sete');
    g = await lire(p);
    pb.push(egal('Pas assez de courses pour un graphique', g.vide, 'progression, « sete » : pas assez de courses'));
    await p.click('[data-act="clear"]');
    pb.push(egal({ coches: 19, dates: ['mai 25', 'juil.', 'sept.', 'nov.', 'janv. 26', 'mars', 'mai', 'juil.', 'sept.'] }, await p.evaluate(() => ({ coches: document.querySelectorAll('.pv2-graphe .mg-coche').length,
      dates: [...document.querySelectorAll('.pv2-graphe .mg-gx span')].map(x => x.textContent) })), 'progression, ordinateur : une coche par mois, une date tous les 2 mois'));
    pb.push(egal([], erreurs, 'progression : erreurs JavaScript'));
    await ctx.close();
    // Une course de plus au 10 km (00:45:00, sans D+) et une non terminée.
    const db2 = JSON.parse(JSON.stringify(db0));
    const modele = db2.courses.find(c => c.date === '2026-03-29');
    db2.courses.push(Object.assign({}, modele, { id: '00000000-0000-0000-0001-0000000000a1', course: 'Test', date: '2026-10-01', distance: 10, dplus: null, temps: 2700, allure: 270 }));
    db2.courses.push(Object.assign({}, modele, { id: '00000000-0000-0000-0001-0000000000a2', course: 'Test DNF', date: '2026-09-01', temps: null, allure: null, dnf: true }));
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, db2));
    pb.push(egal(8, (await lire(p)).points.length, 'progression : une DNF sans point'));
    await filtre(p, '.pv2-panel label.pv2-check:has(input[value="10 km"])');
    g = await lire(p);
    pb.push(egal({ n: 3, droite: '↗ 24 s /km plus rapide par an', mieux: true, tendance: true },
      { n: g.points.length, droite: g.droite, mieux: await p.evaluate(() => !!document.querySelector('.mg-droite .is-mieux')), tendance: g.tendance }, 'progression, 10 km, 3 points : tendance en Accent'));
    await mesure(p, 'temps');
    pb.push(egal('↗ 4 min 13 s plus rapide par an', (await lire(p)).droite, 'progression, 10 km, Temps : tendance'));
    await mesure(p, 'effort');
    pb.push(egal('↗ 19 s /km-effort plus rapide par an', (await lire(p)).droite, 'progression, 10 km, Allure-effort : tendance'));
    pb.push(egal({ ligne: ['1px', true], pointilles: true }, await p.evaluate(() => { const l = document.querySelector('.mg-ligne'), t = document.querySelector('.mg-tendance');
      return { ligne: [getComputedStyle(l).strokeWidth, l.classList.contains('is-discrete')], pointilles: getComputedStyle(t).strokeDasharray !== 'none' }; }), 'progression : ligne fine et discrète, tendance en pointillé'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 390, db0));
    pb.push(egal({ etiquettes: false, deborde: false }, await p.evaluate(() => ({ etiquettes: [...document.querySelectorAll('.mg-etiq')].some(e => getComputedStyle(e).display !== 'none'),
      deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth })), 'progression, téléphone : pas d\'étiquettes, rien ne dépasse'));
    pb.push(egal(true, await p.evaluate(() => Math.abs(document.querySelector('.pv2-card > .mg-titre').getBoundingClientRect().left - document.querySelector('.pv2-graphe .mg-titre').getBoundingClientRect().left) < 1),
      'téléphone : « Résultats » aligné sur « Progression »'));
    pb.push(egal(['juil. 25', 'janv. 26', 'juil.'], await p.evaluate(() => [...document.querySelectorAll('.pv2-graphe .mg-gx span')].map(x => x.textContent)), 'progression, téléphone : une date tous les 6 mois'));
    await ctx.close();
    return pb;
  },

  // Module Courses (module-courses-a-surveiller-specification.md, § 8) : filtres, cartes, tableau, année, ouverture des inscriptions.
  async courses(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const base = db.courses.find(c => c.id === id(9));
    const ajout = (n, o) => db.courses.push(Object.assign({}, base, { id: id(n), lien: null, lieu: null, format: 'route_10km', distance: null, dplus: null }, o));
    ajout(10, { course: 'Marathon de la Baie', date: '2027-04-11', distance: 42.195, format: 'route_marathon', ouverture_inscriptions: '2026-11-03', ouverture_heure: '12:00:00', lien: 'https://example.org/baie', lieu: 'La Baie' });
    ajout(11, { course: 'Ultra des Lacs', date: null, ouverture_inscriptions: '2027-01-01', ouverture_approx: true });
    const pb = [];
    const PAGE = 'courses-a-surveiller.html';
    const neuve = async (largeur, page = PAGE, d = db, stockage = {}) => {
      const copie = JSON.parse(JSON.stringify(d)); copie.ecritures = [];
      const o = await ouvrir(nav, page, largeur, copie, stockage, PARIS);
      await o.p.waitForSelector('.cs-barre');
      o.copie = copie;
      return o;
    };
    const t = async (p, sel) => ((await p.textContent(sel)) || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
    const cartes = p => p.evaluate(() => [...document.querySelectorAll('.cs-liste .cs-carte')].map(c => {
      const tx = x => (x ? x.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null), a = c.querySelector('.cs-site[href]');
      return { nom: tx(c.querySelector('.ob-nom')), statut: tx(c.querySelector('.ob-role')), date: tx(c.querySelector('.ob-date')), info: tx(c.querySelector('.ob-info')),
        lignes: [...c.querySelectorAll('.ob-ligne')].map(l => tx(l.children[0]) + ' | ' + tx(l.children[1])), lien: a ? a.getAttribute('href') : null, cible: a ? a.target : null,
        grise: !!c.querySelector('.cs-site.is-off'), compteur: !!c.querySelector('.ob-cpt'), pt: c.className.replace('ob-carte cs-carte', '').trim() };
    }));
    // Filtres : le panneau s'ouvre au premier choix ; « vue » reproduit les anciennes vues (aucun filtre, ou un choix de statuts, ou Ouvertes).
    const vue = async (p, v) => {
      if (await p.locator('[data-cs="raz"]').count()) await p.click('[data-cs="raz"]');
      if (v === 'tout') return;
      if (await p.locator('#cs-filtres[hidden]').count()) await p.click('[data-cs="filtres"]');
      if (v === 'ouvertes') await p.click('[data-ouvertes]');
      else for (const k of { surveiller: ['a_surveiller'], venir: ['confirmee', 'option'], courue: ['courue'] }[v]) await p.click('[data-cat="' + k + '"]');
    };
    const affiche = async (p, m) => { await p.click('[data-cs="menu"]'); await p.click('#cs-menu [data-mode="' + m + '"]'); };
    const barre = p => p.evaluate(() => ({ vues: [...document.querySelectorAll('[data-cat], [data-ouvertes]')].map(b => b.textContent.replace(/\s+/g, ' ').trim() + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      compte: document.querySelectorAll('.cs-carte, .cs-ligne').length + ' courses', groupes: [...document.querySelectorAll('[data-groupe]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')), tris: [...document.querySelectorAll('[data-tri]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      annees: [...document.querySelectorAll('[data-annee]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      reperes: [...document.querySelectorAll('.cs-mois')].map(x => x.textContent) }));

    // Ouverture : toutes les courses, sans filtre, panneau replié ; le bouton Filtres ouvre les statuts avec leurs compteurs.
    let { p, ctx, erreurs } = await neuve(1200);
    let b = await barre(p), k = await cartes(p);
    pb.push(egal([17, 0, 0, 0, 'false', 'Filtres'], [k.length, await p.locator('.cs-compte').count(), await p.locator('.cs-badge').count(), await p.locator('[data-vue], .cs-vues').count(), await p.getAttribute('[data-cs="filtres"]', 'aria-expanded'), await p.getAttribute('[data-cs="filtres"]', 'aria-label')],
      'ouverture : les 17 courses, aucun filtre, ni compteur ni pastilles de vue, panneau replié'));
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Semi de San Sebastián'], [k[0].nom, k.find(x => x.statut === 'Courue').nom], 'ouverture : à venir d\'abord, puis les courues'));
    pb.push(egal(true, await p.locator('#cs-filtres').isHidden(), 'ouverture : panneau de filtres caché'));
    await p.click('[data-cs="filtres"]');
    b = await barre(p);
    pb.push(egal(['Repérée 3', 'Courue 7', 'Ouvertes 1'], b.vues.filter(x => /^(Repérée|Courue|Ouvertes) /.test(x)), 'panneau : statuts et Ouvertes avec leurs compteurs'));
    pb.push(egal(4, b.vues.filter(x => /^(Confirmée|Option|Repérée|Courue) \d/.test(x)).length, 'panneau : quatre statuts'));
    await p.click('[data-cs="fermer"]');
    pb.push(egal(true, await p.evaluate(() => { const h = document.querySelector('#cs-filtres'); return h.hidden || !!h.__deroule; }), 'la flèche replie le panneau en déroulé'));
    await p.waitForFunction(() => document.querySelector('#cs-filtres').hidden);
    pb.push(egal([[32, 32], [15]], await p.evaluate(() => { const r = document.querySelector('[data-cs="filtres"]').getBoundingClientRect(), i = document.querySelector('[data-cs="filtres"] svg').getBoundingClientRect(); return [[Math.round(r.width), Math.round(r.height)], [Math.round(i.width)]]; }), 'rond Filtres : 32 px, picto 15 px (comme le Palmarès)'));
    // Affichage : une liste à choix unique (Cartes ou Tableau), le bouton Filtres à sa droite.
    pb.push(egal([true, 'Cartes', true], await p.evaluate(() => { const m = document.querySelector('[data-cs="menu"]').getBoundingClientRect(), f = document.querySelector('[data-cs="filtres"]').getBoundingClientRect();
      return [f.left >= m.right, document.querySelector('[data-cs="menu"]').textContent.trim(), Math.abs((m.top + m.height / 2) - (f.top + f.height / 2)) < 2]; }), 'affichage : liste « Cartes » à gauche, bouton Filtres à sa droite, alignés'));
    pb.push(egal([true, 'false'], [await p.locator('#cs-menu').isHidden(), await p.getAttribute('[data-cs="menu"]', 'aria-expanded')], 'liste d\'affichage fermée à l\'ouverture'));
    await p.click('[data-cs="menu"]');
    pb.push(egal([['Cartes *', 'Tableau'], 'true'], [await p.evaluate(() => [...document.querySelectorAll('#cs-menu [data-mode]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : ''))), await p.getAttribute('[data-cs="menu"]', 'aria-expanded')], 'liste d\'affichage : Cartes (choisi) et Tableau'));
    pb.push(egal([true, 'Vue'], await p.evaluate(() => [document.querySelector('#cs-menu').getBoundingClientRect().width >= 190, document.querySelector('#cs-menu .cs-lib').textContent]), 'liste d\'affichage : 12 rem au moins, en-tête « Vue », comme le Calendrier'));
    await p.keyboard.press('Escape');
    pb.push(egal(true, await p.locator('#cs-menu').isHidden(), 'Échap ferme la liste'));
    await p.click('[data-cs="menu"]'); await p.click('h1, body', { position: { x: 5, y: 600 } });
    pb.push(egal(true, await p.locator('#cs-menu').isHidden(), 'un toucher ailleurs ferme la liste'));
    pb.push(egal(0, await p.locator('.cs-barre > .cs-lib, .cs-barre > .cs-reglage').count(), 'pas de libellé « Vue » dans la barre (seulement en tête de la liste)'));
    await vue(p, 'surveiller');
    b = await barre(p); k = await cartes(p);
    pb.push(egal([0, ['avril 2027', 'septembre 2028', 'Date à définir'], 'Filtres · 1 actif', '3 sur 17 courses'], [await p.locator('[data-groupe], [data-tri]').count(), b.reperes, await p.getAttribute('[data-cs="filtres"]', 'aria-label'), await t(p, '.cs-compte')], 'Repérée : titres de mois, un filtre actif, compte « 3 sur 17 courses »'));
    pb.push(egal(['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], k.map(x => x.nom), 'Repérée : ordre chronologique, sans date à la fin'));
    pb.push(egal({ nom: 'Marathon de la Baie', statut: 'Repérée', date: '11 avr. 2027', info: 'La Baie · Marathon', lignes: ['Distance | 42,195 km', 'Inscription | Ouvre le 3 nov. 2026 à 12 h'], lien: 'https://example.org/baie', cible: '_blank', grise: false, compteur: false, pt: 'is-opt' },
      k[0], 'carte : statut à la place du rôle, ni compteur ni objectif, dossard avec l\'heure, lien « Site officiel »'));
    pb.push(egal(['Ouverture : janvier 2027', 'Ouverture à venir'], [k[2].lignes[0].split(' | ')[1] || k[2].lignes[0], k[1].lignes[1].split(' | ')[1]].map(x => x.replace(/^Inscription \| /, '')), 'dossard : mois seul, puis ouverture inconnue'));
    pb.push(egal([null, true, 'À définir'], [k[2].lien, k[2].grise, k[2].date], 'sans site officiel : lien grisé, sans adresse ; sans date : « À définir »'));
    pb.push(egal([3, 0, 0, 3], await p.evaluate(() => [document.querySelectorAll('.cs-carte .cs-site').length, document.querySelectorAll('.cs-detail').length, document.querySelectorAll('.cs-carte .ob-cpt, .cs-carte .ob-cible').length,
      [...document.querySelectorAll('.cs-carte')].filter(c => getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)').length]), 'lien « Site officiel » sur chaque carte ; plus de bouton Détails ; aucun compteur ; un fond sur chaque carte'));

    // Inscriptions ouvertes : à venir, pas inscrit, ouverture atteinte.
    await vue(p, 'ouvertes');
    k = await cartes(p);
    pb.push(egal([['Ultra du Plateau · Le 55'], 'Inscription | Inscription ouverte'], [k.map(x => x.nom), k[0].lignes.slice(-1)[0]], 'Inscriptions ouvertes : seulement les courses dont l\'ouverture est atteinte'));
    await vue(p, 'venir');
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Trail des Cimes', 'Ultra du Plateau · Le 55', 'Trail de la Forêt', 'Trail des Crêtes'], (await cartes(p)).map(x => x.nom), 'À venir : la feuille de route'));

    // Courues : du plus récent au plus ancien, sans dossard, avec l'année.
    await vue(p, 'courue');
    k = await cartes(p); b = await barre(p);
    pb.push(egal(['Semi de San Sebastián', '10 km de Montauban'], k.slice(0, 2).map(x => x.nom), 'Courues : les plus récentes d\'abord'));
    pb.push(egal([7, 'Courue', 0, 'is-courue'], [k.length, k[0].statut, k.filter(x => x.lignes.some(l => l.startsWith('Inscription'))).length, k[0].pt.split(' ')[0]], 'Courues : statut, sans dossard, pastille atténuée'));
    pb.push(egal([['Toutes *', '2028', '2027', '2026', '2025'], '7 courses'], [b.annees, b.compte], 'Courue : année dans le panneau, 7 cartes'));
    await p.click('[data-annee="2025"]');
    pb.push(egal(4, (await cartes(p)).length, 'année 2025 : 4 courses'));

    // Tout : ce qui reste à faire, puis les courues.
    await vue(p, 'tout');
    await p.click('[data-annee=""]');
    k = await cartes(p);
    pb.push(egal([17, 'Trail du Lac · Le Tour du Lac', 'Semi de San Sebastián'], [k.length, k[0].nom, k.find(x => x.statut === 'Courue').nom], 'Tout : 17 courses, à venir d\'abord puis les courues'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));

    // Tableau : les colonnes de la veille, une ligne par course, sans regroupement ; choix gardé sur l'appareil.
    await vue(p, 'surveiller');
    const lignes = () => p.evaluate(() => ({ en: [...document.querySelectorAll('.cs-tableau thead th')].map(x => x.textContent),
      l: [...document.querySelectorAll('.cs-ligne')].map(r => [...r.children].map(x => x.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim())),
      lien: [...document.querySelectorAll('.cs-ligne .cs-lien-nom')].map(x => x.getAttribute('href')) }));
    pb.push(egal([0, 'Cartes *'], [await p.locator('.cs-tableau').count(), (await p.evaluate(() => [...document.querySelectorAll('[data-mode]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')))).shift()], 'affichage par défaut : les cartes'));
    await affiche(p, 'tableau');
    let tb = await lignes();
    pb.push(egal(['Événement', 'Course', 'Distance · D+', 'Date', 'Ouverture des inscriptions'], tb.en, 'tableau : les colonnes par défaut'));
    pb.push(egal([0, 0], [await p.locator('.cs-ligne-mois').count(), await p.locator('[data-groupe]').count()], 'tableau : pas de regroupement par mois, pas de choix de regroupement'));
    pb.push(egal([['Marathon de la Baie La Baie', '—', '42,195 km', '11 avr. 2027', 'Ouvre le 3 nov. 2026 à 12 h'], ['Trail des Sommets Haut-Val', '—', '80 km · 5 000 m D+', '10 sept. 2028', 'Ouverture à venir'],
      ['Ultra des Lacs', '—', '—', 'À définir', 'Ouverture : janvier 2027']], tb.l, 'tableau : une ligne par course'));
    // Colonnes triables : toucher une colonne trie (croissant, décroissant, puis retour à l'ordre d'origine) ; plus de choix « Tri ».
    const ordre = () => p.evaluate(() => ({ noms: [...document.querySelectorAll('.cs-ligne td:first-child strong')].map(x => x.textContent), mois: document.querySelectorAll('.cs-ligne-mois').length,
      sens: [...document.querySelectorAll('.cs-tableau thead th')].map(t => t.getAttribute('aria-sort')[0]).join('') }));
    pb.push(egal(0, await p.locator('[data-tri]').count(), 'tableau : pas de choix Tri'));
    pb.push(egal(['nnnan', 0], [(await ordre()).sens, (await ordre()).mois], 'tableau : par défaut Date croissante, sans titres de mois'));
    await p.click('[data-col="distance"]');
    let o2 = await ordre();
    pb.push(egal([['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], 'nnann'], [o2.noms, o2.sens], 'colonne Distance : croissante, sans distance en dernier'));
    await p.click('[data-col="distance"]');
    o2 = await ordre();
    pb.push(egal(['Trail des Sommets', 'Marathon de la Baie', 'Ultra des Lacs'], o2.noms, 'colonne Distance : décroissante'));
    await p.click('[data-col="ouverture"]');
    pb.push(egal(['Marathon de la Baie', 'Ultra des Lacs', 'Trail des Sommets'], (await ordre()).noms, 'colonne Ouverture : les plus proches d\'abord, date inconnue en dernier'));
    await p.click('[data-col="evenement"]');
    pb.push(egal(['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], (await ordre()).noms, 'colonne Événement : alphabétique'));
    await p.click('[data-col="evenement"]'); await p.click('[data-col="evenement"]');
    o2 = await ordre();
    pb.push(egal(['nnnan', 0], [o2.sens, o2.mois], 'troisième toucher : retour à l\'ordre d\'origine'));
    // Colonnes au choix : rond « Colonnes » (tableau seulement), toutes les rubriques d'une page de course, choix gardé sur l'appareil.
    pb.push(egal([1, 1], [await p.locator('[data-cs="colonnes"]').count(), await p.locator('#cs-colonnes[hidden]').count()], 'tableau : rond « Colonnes », panneau replié'));
    await p.click('[data-cs="colonnes"]');
    pb.push(egal([true, true, true, true], [await p.locator('[data-colonne="statut"]').count() === 1, await p.locator('[data-colonne="lieu"]').count() === 1, await p.locator('[data-colonne="strategie"]').count() === 1, await p.locator('[data-colonne="fc_moyenne"]').count() === 1], 'colonnes proposées : statut, lieu, stratégie, FC moyenne…'));
    pb.push(egal(0, await p.locator('[data-colonne="evenement"]').count(), 'Événement : toujours là, sans case'));
    await p.click('[data-colonne="lieu"]'); await p.click('[data-colonne="statut"]');
    tb = await lignes();
    pb.push(egal(['Événement', 'Course', 'Statut', 'Distance · D+', 'Date', 'Lieu', 'Ouverture des inscriptions'], tb.en, 'colonnes ajoutées : à leur place dans l\'ordre de la page de course'));
    pb.push(egal(['Repérée', 'Haut-Val'], [tb.l[1][2], tb.l[1][5]], 'colonnes Statut et Lieu : valeurs'));
    await p.click('[data-col="lieu"]');
    pb.push(egal('Haut-Val', (await lignes()).l[0][5], 'colonne ajoutée : triable (Haut-Val avant La Baie)'));
    await p.reload(); await p.waitForSelector('.cs-barre'); await vue(p, 'surveiller');
    pb.push(egal(['Statut', 'Lieu'], (await lignes()).en.filter(x => ['Statut', 'Lieu'].includes(x)), 'colonnes choisies : gardées après rechargement'));
    await p.click('[data-cs="colonnes"]'); await p.waitForSelector('#cs-colonnes:not([hidden])');
    await p.click('[data-colonne="lieu"]'); await p.click('[data-colonne="statut"]');
    pb.push(egal(['Événement', 'Course', 'Distance · D+', 'Date', 'Ouverture des inscriptions'], (await lignes()).en, 'colonnes retirées : retour aux colonnes par défaut'));
    await vue(p, 'venir');
    pb.push(egal('15 nov. 2026 9 h', (await lignes()).l[0][3], 'tableau : l\'heure de départ sous la date'));
    await vue(p, 'courue');
    pb.push(egal([7, '—'], [(await lignes()).l.length, (await lignes()).l[0][4]], 'tableau, Courues : une ligne par course, pas de dossard'));
    await vue(p, 'surveiller');
    await p.locator('.cs-ligne').nth(2).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Ultra des Lacs', 0], [await t(p, '.pc-titre'), await p.locator('.fc-fiche').count()], 'tableau : toucher une ligne ouvre la page de la course'));
    await p.click('[data-ob="fermer"]'); await pause();
    await p.reload(); await p.waitForSelector('.cs-barre');
    pb.push(egal(17, await p.locator('.cs-ligne').count(), 'tableau : l\'affichage choisi est gardé après rechargement (les filtres, eux, repartent à zéro)'));
    await affiche(p, 'cartes');
    pb.push(egal([0, 17], [await p.locator('.cs-tableau').count(), await p.locator('.cs-carte').count()], 'retour aux cartes'));

    // Toucher une carte : la fiche de modification (course à venir, sans date, courue) ; le lien « Site officiel » ne l'ouvre pas.
    await vue(p, 'surveiller');
    await p.click('.cs-site[href]');
    pb.push(egal(0, await p.locator('.fc-fiche').count(), 'le lien « Site officiel » n\'ouvre pas la fiche'));
    const ouverts = () => p.evaluate(() => ({ ferme: document.querySelectorAll('.mc-panneau details.pc-cellule:not([open]):not(.is-vide), .mc-panneau details.is-montre:not([open]):not(.is-vide)').length,
      vides: [...document.querySelectorAll('.mc-panneau details.is-vide')].filter(d => !d.open && /Non renseigné/.test(d.textContent)).length, total: document.querySelectorAll('.mc-panneau details.pc-cellule, .mc-panneau details.is-montre').length }));
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Marathon de la Baie', 0], [await t(p, '.pc-titre'), await p.locator('.fc-fiche').count()], 'toucher la carte : la page de la course, pas la fiche'));
    let ov = await ouverts();
    pb.push(egal([0, true, true], [ov.ferme, ov.total > 0, ov.vides > 0], 'page ouverte depuis Courses : blocs renseignés ouverts, blocs vides affichés fermés (« Non renseigné »)'));
    // Rond « Ajouter à l'agenda » à droite de la date : un fichier .ics.
    const [tel] = await Promise.all([p.waitForEvent('download'), p.click('[data-ob="agenda"]')]);
    const ics = require('fs').readFileSync(await tel.path(), 'utf8');
    pb.push(egal([true, true, true], [/SUMMARY:Marathon de la Baie/.test(ics), /DTSTART;VALUE=DATE:20270411/.test(ics), /DTEND;VALUE=DATE:20270412/.test(ics)], 'agenda : un événement d\'une journée à la date de la course'));
    await p.click('[data-ob="fermer"]'); await pause();
    await p.locator('.cs-carte').nth(2).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal('Ultra des Lacs', await t(p, '.pc-titre'), 'course sans date : sa page'));
    await p.click('[data-ob="fermer"]'); await pause();
    await vue(p, 'courue');
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    ov = await ouverts();
    pb.push(egal(['Semi de San Sebastián', 0], [await t(p, '.pc-titre'), ov.ferme], 'course courue : sa page, Résultat, Montre et blocs renseignés ouverts'));
    await p.click('[data-ob="fermer"]'); await pause();
    // Le crayon de la page ouvre la fiche de modification.
    await vue(p, 'surveiller');
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(['Marathon de la Baie', 'Modifier la course'], [await p.locator('#fc-course').inputValue(), await t(p, '#fc-titre')], 'crayon : la fiche de modification'));
    await p.click('[data-fc="annuler"]'); await pause();
    await p.click('[data-ob="fermer"]'); await pause();
    pb.push(egal([], erreurs, 'erreurs JavaScript (fiche)'));
    await ctx.close();

    // Ajouter : le statut Repérée est préchoisi quand ce statut est seul filtré ; sinon Confirmée.
    let o = await neuve(1200);
    await vue(o.p, 'surveiller');
    await o.p.click('[data-cs="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
    pb.push(egal('a_surveiller', await o.p.locator('#fc-statut').inputValue(), '+ Course (Repérée seule) : statut préchoisi'));
    await o.p.click('[data-fc="annuler"]'); await pause();
    await vue(o.p, 'venir');
    await o.p.click('[data-cs="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
    pb.push(egal('confirmee', await o.p.locator('#fc-statut').inputValue(), '+ Course (autres filtres) : statut Confirmée'));
    await o.ctx.close();

    // Fiche : heure d'ouverture et mois seul.
    o = await neuve(1200); await vue(o.p, 'surveiller');
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.mc-panneau .pc-titre'); await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(x => x.click()));
    pb.push(egal(['2026-11-03', '12:00', false, false], [await o.p.locator('#fc-ouverture_inscriptions').inputValue(), await o.p.locator('#fc-ouverture_heure').inputValue(),
      await o.p.locator('#fc-ouverture_approx').isChecked(), await o.p.locator('#fc-ouverture_heure').isDisabled()], 'fiche : date et heure d\'ouverture relues'));
    await ouvrirBloc(o.p, 'dossard');
    await o.p.check('#fc-ouverture_approx');
    pb.push(egal(['month', '2026-11', '', true], [await o.p.locator('#fc-ouverture_inscriptions').getAttribute('type'), await o.p.locator('#fc-ouverture_inscriptions').inputValue(),
      await o.p.locator('#fc-ouverture_heure').inputValue(), await o.p.locator('#fc-ouverture_heure').isDisabled()], 'mois seul : la date devient un mois, l\'heure se vide'));
    await o.p.fill('#fc-ouverture_inscriptions', '2027-02');
    await o.p.click('.fc-plein'); await o.p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w = o.copie.ecritures[0].corps;
    pb.push(egal(['PATCH', '2027-02-01', true, null], [o.copie.ecritures[0].methode, w.ouverture_inscriptions, w.ouverture_approx, w.ouverture_heure], 'enregistrement : mois seul rangé au 1er, sans heure'));
    await o.ctx.close();
    o = await neuve(1200); await vue(o.p, 'surveiller');
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.mc-panneau .pc-titre'); await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(x => x.click()));
    await o.p.fill('#fc-ouverture_inscriptions', ''); 
    await o.p.fill('#fc-ouverture_heure', '9h');
    await o.p.click('.fc-plein'); await o.p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w2 = o.copie.ecritures[0].corps;
    pb.push(egal([null, false, null], [w2.ouverture_inscriptions, w2.ouverture_approx, w2.ouverture_heure], 'sans date d\'ouverture : ni mois seul ni heure rangés'));
    await o.ctx.close();

    // Dossard le jour même : l'heure décide (20 octobre 2026, 10 h).
    const jour = JSON.parse(JSON.stringify(db));
    jour.courses.find(c => c.id === id(10)).ouverture_inscriptions = '2026-10-20'; jour.courses.find(c => c.id === id(10)).ouverture_heure = '14:00:00';
    jour.courses.find(c => c.id === id(11)).date = '2027-05-01'; jour.courses.find(c => c.id === id(11)).ouverture_inscriptions = '2026-10-20'; jour.courses.find(c => c.id === id(11)).ouverture_approx = false; jour.courses.find(c => c.id === id(11)).ouverture_heure = '08:00:00';
    o = await neuve(1200, PAGE, jour);
    k = await cartes(o.p);
    pb.push(egal(['Inscription | Ouvre le 20 oct. 2026 à 14 h', 'Inscription | Inscription ouverte'], [k.find(x => x.nom === 'Marathon de la Baie').lignes.slice(-1)[0], k.find(x => x.nom === 'Ultra des Lacs').lignes.slice(-1)[0]], 'ouverture le jour même : avant l\'heure « Ouvre le… », après « Inscription ouverte »'));
    await vue(o.p, 'ouvertes');
    pb.push(egal(['Ultra des Lacs', 'Ultra du Plateau · Le 55'], (await cartes(o.p)).map(x => x.nom), 'Inscriptions ouvertes : l\'heure d\'ouverture atteinte le jour même compte, pas avant ; par date de course'));
    await o.ctx.close();

    // Ordinateur : les cartes d'un même mois côte à côte, étroites ; toutes de la même hauteur (même téléphone).
    const memeMois = JSON.parse(JSON.stringify(db)); memeMois.courses.find(c => c.id === id(9)).date = '2027-04-20';
    o = await neuve(1200, PAGE, memeMois); await vue(o.p, 'surveiller');
    pb.push(egal([true, true], await o.p.evaluate(() => { const [a, b] = [...document.querySelectorAll('.cs-carte')].map(c => c.getBoundingClientRect());
      return [Math.abs(a.top - b.top) < 2 && b.left >= a.right, a.width < 420]; }), 'ordinateur : deux cartes du même mois côte à côte, moins de 420 px de large'));
    await vue(o.p, 'tout');
    pb.push(egal([1, 1], await o.p.evaluate(() => [new Set([...document.querySelectorAll('.cs-carte')].map(c => Math.round(c.getBoundingClientRect().height))).size, document.querySelectorAll('.cs-mois').length > 3 ? 1 : 0]), 'Tout : toutes les cartes de la même hauteur, regroupées par mois'));
    await o.ctx.close();

    // Téléphone : rien ne dépasse, les vues défilent, statut et date sur une ligne.
    o = await neuve(390, PAGE, db, {});
    pb.push(egal({ deborde: false, surLaPage: true }, await o.p.evaluate(() => ({ deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      surLaPage: !!document.querySelector('[data-cs="filtres"]') })), 'téléphone : rien ne dépasse, bouton Filtres présent'));
    pb.push(egal([true, true], await o.p.evaluate(() => { const c = document.querySelector('.cs-carte'), r = x => c.querySelector(x).getBoundingClientRect();
      return [Math.abs(r('.ob-role').top - r('.ob-date').top) < 2, r('.ob-nom').top >= r('.ob-role').bottom - 1]; }), 'téléphone : statut et date sur la même ligne, le nom dessous'));
    pb.push(egal(1, await o.p.evaluate(() => new Set([...document.querySelectorAll('.cs-carte')].map(c => c.getBoundingClientRect().left)).size), 'téléphone : une seule colonne'));
    pb.push(egal(1, await o.p.evaluate(() => new Set([...document.querySelectorAll('.cs-carte')].map(c => Math.round(c.getBoundingClientRect().height))).size), 'téléphone : toutes les cartes de la même hauteur'));
    await affiche(o.p, 'tableau');
    pb.push(egal(false, await o.p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), 'téléphone, tableau : rien ne dépasse de la page (le tableau défile dans son cadre)'));
    pb.push(egal([], o.erreurs, 'téléphone : erreurs JavaScript'));
    await o.ctx.close();

    // Adresse : ?vue=courue ouvre la vue demandée ; site partagé : lecture seule, pas de bouton d'ajout.
    o = await neuve(1200, PAGE + '?vue=courue');
    pb.push(egal([7, 'Filtres · 1 actif'], [(await cartes(o.p)).length, await o.p.getAttribute('[data-cs="filtres"]', 'aria-label')], '?vue=courue : préfiltre sur Courue (7 courses)'));
    await o.ctx.close();
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'vert-rose', course_cap: null, modules: null, palmares_groupe: false });
    o = await neuve(1200, PAGE, partage, { 'mrt-vue': autre });
    pb.push(egal([0, 18], [await o.p.locator('[data-cs="ajouter"]').count(), (await cartes(o.p)).length], 'site partagé : lecture seule, sans ajout'));
    await vue(o.p, 'surveiller');
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Marathon de la Baie', 0], [await t(o.p, '.pc-titre'), await o.p.locator('.fc-fiche').count()], 'site partagé : toucher une carte ouvre la page de la course, pas la fiche'));
    await o.ctx.close();
    return pb;
  },

  // Spécification générale : la page s'affiche d'un seul coup, en-tête compris.
  // Mentions légales (spécification générale § 11 bis) : page publique, contact, retour, pied de page partout.
  async mentions(nav, db0) {
    const pb = [];
    const contexte = async (connecte, largeur = 1200) => {
      const ctx = await nav.newContext({ viewport: { width: largeur, height: 900 } });
      await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
      await simulerBase(ctx, JSON.parse(JSON.stringify(db0)));
      const p = await ctx.newPage();
      const erreurs = [];
      p.on('pageerror', e => erreurs.push(e.message));
      if (connecte) {
        await p.goto(RACINE + 'robots.txt');
        const t = Math.floor(Date.now() / 1000);
        await p.evaluate(s => localStorage.setItem('sb-gifrpodrwesuhtgkxbuc-auth-token', s), JSON.stringify({
          access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai', user: { id: db0.profils[0].id, email: 'essai@exemple.fr' } }));
      }
      return { p, ctx, erreurs };
    };
    const lire = p => p.evaluate(() => ({
      titre: document.querySelector('h1').textContent,
      rubriques: [...document.querySelectorAll('.mrt-section-titre')].map(h => h.textContent),
      contact: [document.getElementById('contact').textContent, document.getElementById('contact').getAttribute('href')],
      enClair: /contact@myruntools/.test(document.documentElement.innerHTML.replace(document.getElementById('contact').outerHTML, '')),
      robots: document.querySelector('meta[name="robots"]').content,
      retour: document.getElementById('m11').getAttribute('href'),
      entete: document.querySelectorAll('.mrt-header, .mrt-nav').length,
      pied: document.querySelector('.mrt-pied') && document.querySelector('.mrt-pied').textContent,
      lienPied: document.querySelectorAll('.mrt-pied a').length,
      large: document.documentElement.scrollWidth > window.innerWidth }));
    // Thème : sans session, celui de la page de connexion même si un thème est retenu sur l'appareil ; connecté, celui de l'utilisateur.
    const themes = [];
    for (const [connecte, page] of [[false, 'mentions-legales.html'], [false, 'confidentialite.html'], [true, 'mentions-legales.html'], [true, 'confidentialite.html']]) {
      const c = await contexte(connecte);
      if (!connecte) await c.p.goto(RACINE + 'robots.txt');
      await c.p.evaluate(() => localStorage.setItem('mrt-theme', 'blanc-orange'));
      await c.p.goto(RACINE + page); await c.p.waitForTimeout(600);
      themes.push(await c.p.evaluate(() => [...document.documentElement.classList].filter(x => x.startsWith('t-')).join(' ')));
      await c.ctx.close();
    }
    const pref = 't-' + db0.preferences[0].theme;
    pb.push(egal(['', '', pref, pref], themes, 'mentions et confidentialité : sans session, le thème de la page de connexion (même avec un thème retenu sur l\'appareil) ; connecté, le thème des préférences de l\'utilisateur'));
    // Visiteur sans connexion : la page s'ouvre (pas de renvoi), retour vers la connexion.
    let { p, ctx, erreurs } = await contexte(false);
    await p.goto(RACINE + 'mentions-legales.html');
    await p.waitForTimeout(800);
    const v = await lire(p);
    pb.push(egal(true, /mentions-legales\.html$/.test(p.url()), 'mentions, visiteur : la page reste ouverte'));
    pb.push(egal({ titre: 'Mentions légales', rubriques: ['Éditeur', 'Directeur de la publication', 'Contact', 'Hébergement du site', 'Hébergement des données', 'Propriété intellectuelle', 'Crédits', 'Données personnelles'],
      contact: ['contact@myruntools.fr', 'mailto:contact@myruntools.fr'], enClair: false, robots: 'noindex', retour: 'connexion.html', entete: 0, pied: 'Mentions légales · Confidentialité', lienPied: 1, large: false },
      v, 'mentions, visiteur : rubriques M2 à M9, contact assemblé par le script, noindex, retour vers la connexion, sans en-tête'));
    pb.push(egal([], erreurs, 'mentions : aucune erreur'));
    await ctx.close();
    // Téléphone : rien ne déborde.
    ({ p, ctx } = await contexte(false, 390));
    await p.goto(RACINE + 'mentions-legales.html');
    await p.waitForTimeout(500);
    pb.push(egal(false, (await lire(p)).large, 'mentions, téléphone : pas de défilement en largeur'));
    await ctx.close();
    // Connecté : retour vers l'accueil.
    ({ p, ctx } = await contexte(true));
    await p.goto(RACINE + 'mentions-legales.html');
    await p.waitForFunction(() => document.getElementById('m11').getAttribute('href') === 'index.html', null, { timeout: 4000 }).catch(() => {});
    pb.push(egal('index.html', (await lire(p)).retour, 'mentions, connecté : retour vers l\'accueil'));
    await ctx.close();
    // Pied de page : sur toutes les pages, page de connexion comprise, un seul, avec le lien vers les mentions.
    const pages = fs.readdirSync(path.resolve(__dirname, '../..')).filter(f => f.endsWith('.html') && !['mentions-legales.html', 'confidentialite.html'].includes(f));
    const vus = [];
    for (const page of pages) {
      ({ p, ctx } = await contexte(!/connexion|creer-compte|mot-de-passe|confidentialite/.test(page)));
      await p.goto(RACINE + page);
      await p.waitForSelector('.mrt-pied', { timeout: 4000 }).catch(() => {});
      vus.push([page, await p.evaluate(() => [document.querySelectorAll('.mrt-pied').length, [...document.querySelectorAll('.mrt-pied a')].map(a => a.href).join(' ')])]);
      await ctx.close();
    }
    pb.push(egal(pages.map(f => [f, [1, RACINE + 'mentions-legales.html ' + RACINE + 'confidentialite.html']]), vus, 'pied de page « Mentions légales · Confidentialité » sur chaque page'));
    // Confidentialité (§ 11 ter) : page publique, rubriques P2 à P10, contact assemblé par le script, prestataires, retour ; lien depuis les mentions.
    ({ p, ctx } = await contexte(false));
    await p.goto(RACINE + 'confidentialite.html'); await p.waitForSelector('.mrt-pied');
    pb.push(egal({ titre: 'Confidentialité', rubriques: ['En bref', 'Responsable', 'Données recueillies', 'Pourquoi', 'Qui y accède', 'Prestataires', 'Durée de conservation', 'Tes droits', 'Sur ton appareil'],
      contact: 'contact@myruntools.fr', enClair: false, prestataires: 7, pied: 'Mentions légales · Confidentialité', retour: 'connexion.html', entete: 0 },
      await p.evaluate(() => ({ titre: document.querySelector('h1').textContent, rubriques: [...document.querySelectorAll('.mrt-section-titre')].map(h => h.textContent),
        contact: document.querySelector('.contact').textContent, enClair: document.documentElement.outerHTML.split('<script')[0].includes('contact@myruntools.fr'),
        prestataires: document.querySelectorAll('#p7 tbody tr').length, pied: document.querySelector('.mrt-pied').textContent, retour: document.getElementById('p12').getAttribute('href'),
        entete: document.querySelectorAll('.mrt-header').length })), 'confidentialité, visiteur : rubriques P2 à P10, contact assemblé, sept prestataires, pied, retour vers la connexion'));
    await p.goto(RACINE + 'mentions-legales.html'); await p.waitForSelector('#m9');
    pb.push(egal('confidentialite.html', await p.getAttribute('#m9 a', 'href'), 'mentions : M9 mène à la politique de confidentialité'));
    await ctx.close();
    // Chaque page porte noindex.
    const sans = fs.readdirSync(path.resolve(__dirname, '../..')).filter(f => f.endsWith('.html'))
      .filter(f => !/<meta name="robots" content="noindex">/.test(fs.readFileSync(path.resolve(__dirname, '../..', f), 'utf8')));
    pb.push(egal([], sans, 'chaque page porte noindex'));
    return pb;
  },
  // Nutrition : calculatrice du besoin du jour (module-nutrition-specification.md, § 3 et 10). Fonctions pures, sans navigateur.
  async besoin() {
    const B = require('../../composants/besoin.js');
    const pb = [];
    const A = { sexe: 'homme', naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' };
    const F = { sexe: 'femme', naissance: '1990-08-02', poids: 58, taille: 165, activite: 'peu' };
    const r0 = x => Math.round(x);
    const resume = r => r && { mb: r0(r.mb), kcal: r0(r.kcal), p: r.proteines.map(r0), g: r.glucides.map(r0), l: r.lipides.map(r0), phase: r.phase };
    const jour = (sports, phase) => ({ date: '2026-10-20', sports, phase });
    pb.push(
      egal({ mb: 1628, kcal: 2117, p: [98, 140], g: [265, 318], l: [59, 82], phase: 'train' }, resume(B.calculer(A, jour([], 'train'))), 'A, repos, entraînement'),
      egal({ mb: 1628, kcal: 2817, p: [98, 140], g: [352, 423], l: [78, 110], phase: 'train' }, resume(B.calculer(A, jour([{ type: 'j95', heures: 1 }], 'train'))), 'A, 1 h de jogging à 9,5 km/h'),
      egal({ mb: 1628, kcal: 2117, p: [98, 140], g: [344, 397], l: [35, 59], phase: 'carbo' }, resume(B.calculer(A, jour([], 'carbo'))), 'A, repos, carbo-loading'),
      egal({ mb: 1302, kcal: 2563, p: [81, 116], g: [320, 384], l: [71, 100], phase: 'train' }, resume(B.calculer(F, jour([{ type: 'j95', heures: 1.5 }], 'train'))), 'B, 1 h 30 de jogging'),
      egal(40, B.calculer(A, jour([], 'train')).age, 'âge de A au 20 octobre 2026'),
      egal(36, B.calculer(F, jour([], 'train')).age, 'âge de B au 20 octobre 2026'),
      egal(['poids'], B.manquants({ ...A, poids: null }, '2026-10-20'), 'profil sans poids : seul le poids manque'),
      egal(null, B.calculer({ ...A, poids: null }, jour([], 'train')), 'profil sans poids : pas de calcul'),
      egal(['sexe', 'naissance', 'poids', 'taille', 'activite'], B.manquants({}, '2026-10-20'), 'profil vide : tout manque'),
      egal(['sexe'], B.manquants({ ...A, sexe: 'non_precise' }, '2026-10-20'), 'sexe non précisé : à compléter'),
      egal([], B.manquants(A, '2026-10-20'), 'profil complet'),
      egal(['train', 'prep', 'prep', 'prep', 'carbo', 'carbo', 'veille', 'train', 'train'], [null, 14, 12, 4, 3, 2, 1, 0, 15].map(B.phaseDuJour), 'phase d\'après le nombre de jours avant la course'),
      egal('Avant-course', B.PHASES[B.phaseDuJour(12)].libelle, 'J-12 : Avant-course'),
      egal('Carbo-loading', B.PHASES[B.phaseDuJour(2)].libelle, 'J-2 : Carbo-loading'),
      egal('Veille de course', B.PHASES[B.phaseDuJour(1)].libelle, 'J-1 : Veille de course'),
      egal(r0(B.calculer(A, jour([], 'train')).kcal), r0(B.calculer(A, jour([{ type: 'inconnu', heures: 2 }, { type: 'm', heures: 0 }], 'train')).kcal), 'sport inconnu ou de durée nulle : ignoré'),
      // Séances du Calendrier : équation de course de l'ACSM, la même pour tous.
      egal(['10.52', '12.43'], [B.metCourse(10).toFixed(2), B.metCourse(12).toFixed(2)], 'ACSM : 10,5 MET à 10 km/h, 12,4 à 12 km/h'),
      egal([10, 9.75, 9.5], [B.vitesseSeance({ duree_min: 60, distance_km: 10 }, 15), B.vitesseSeance({ duree_min: 45, intensite: 'facile' }, 15), B.vitesseSeance({ duree_min: 45, intensite: 'facile' }, null)], 'vitesse : distance ÷ durée ; sinon 65 % de la VMA (facile) ; sinon 9,5 km/h'),
      egal([{ met: 3, heures: 0.5 }, null], [B.activiteSeance({ type: 'renfo', duree_min: 30 }), B.activiteSeance({ type: 'run', distance_km: 10 })], 'renforcement : 3 MET ; séance sans durée : rien'),
      // Vélo et danse (27 nov. 2026) : vélo par palier de vitesse (5 / 7 / 10 MET) ou, sans distance, par l'intensité (7 sans rien) ; danse 5 MET.
      egal([5, 7, 10, 5, 10, 7, 5], [B.activiteSeance({ type: 'velo', duree_min: 60, distance_km: 15 }), B.activiteSeance({ type: 'velo', duree_min: 60, distance_km: 20 }), B.activiteSeance({ type: 'velo', duree_min: 60, distance_km: 25 }),
        B.activiteSeance({ type: 'velo', duree_min: 60, intensite: 'facile' }), B.activiteSeance({ type: 'velo', duree_min: 60, intensite: 'intense' }), B.activiteSeance({ type: 'velo', duree_min: 60 }), B.activiteSeance({ type: 'danse', duree_min: 60 })].map(x => x.met), 'vélo : MET selon la vitesse, sinon l\'intensité ; danse : 5 MET'),
      egal(['a', 'c'], B.seancesQuiComptent([{ id: 'a', date: '2026-10-20', faite: false, etat: 'acceptee' }, { id: 'b', date: '2026-10-20', etat: 'proposee' }, { id: 'c', date: '2026-10-19', faite: true }, { id: 'd', date: '2026-10-19', faite: false }], '2026-10-20', '2026-10-20').map(x => x.id).concat(B.seancesQuiComptent([{ id: 'c', date: '2026-10-19', faite: true }, { id: 'd', date: '2026-10-19', faite: false }], '2026-10-19', '2026-10-20').map(x => x.id)), 'qui compte : aujourd\'hui, faite ou non, sans les propositions de l\'IA ; un jour passé, faite seulement'));
    return pb;
  },
  // Nutrition : profil minimal et besoin du jour (module-nutrition-specification.md, § 4.5 et 10).
  async profilNutrition(nav, db) {
    const pb = [];
    const copie = (profil, ecritures = true) => { const d = JSON.parse(JSON.stringify(db)); Object.assign(d.profils[0], profil); if (ecritures) d.ecritures = []; return d; };
    const txt = async (p, sel) => (await p.locator(sel).first().textContent()).replace(/\s+/g, ' ').trim();
    const COMPLET = { sexe: 'homme', naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' };

    // Profil incomplet (sexe seul) : l'encart ne demande que les champs qui manquent.
    let d = copie({});
    let { p, ctx, erreurs } = await ouvrir(nav, 'nutrition.html', 390, d);
    pb.push(egal(['naissance_j', 'poids', 'taille', 'activite'], await p.evaluate(() => [...document.querySelectorAll('.pf-encart .pf-champ')].map(c => (c.querySelector('[name]') || {}).name)), 'encart : seuls les champs manquants (naissance en trois champs)'),
      egal(0, await p.locator('.nu-besoin').count(), 'encart : pas de besoin calculé'));
    // Valeurs refusées : rien n'est écrit.
    const remplir = async (v) => {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'activite') await p.selectOption('[name="activite"]', x); else if (k === 'naissance') await dateTrois(p, '.pf-encart', 'naissance', x); else await p.fill('[name="' + k + '"]', x);
      }
      await p.click('.pf-encart [type="submit"]');
    };
    await remplir({ naissance: '1986-03-15', poids: '0', taille: '175', activite: 'peu' });
    pb.push(egal('Le poids doit être compris entre 20 et 300 kg.', await txt(p, '.pf-msg'), 'poids à 0 refusé'), egal(0, d.ecritures.length, 'poids refusé : rien d\'écrit'));
    await remplir({ poids: '70', taille: '17' });
    pb.push(egal('La taille doit être comprise entre 100 et 250 cm.', await txt(p, '.pf-msg'), 'taille trop petite refusée'), egal(0, d.ecritures.length, 'taille refusée : rien d\'écrit'));
    await remplir({ taille: '175' });
    await p.waitForSelector('.nu-besoin');
    pb.push(egal([['PATCH', 'profils', { naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'enregistrement : seuls les champs de l\'encart'),
      egal(0, await p.locator('.pf-encart').count(), 'encart disparu une fois le profil complet'),
      egal('2 117 kcal', await txt(p, '.nu-kcal'), 'profil A : besoin du jour'),
      egal('Phase · Entraînement', await txt(p, '.nu-phase'), 'hors saison : Entraînement (la phase du plan n\'est pas affichée)'),
      egal(['Besoin 2 117 kcal', 'Besoin 98–140 g', 'Besoin 265–318 g', 'Besoin 59–82 g'], await p.locator('.nu-jauge-besoin').allTextContents().then(l => l.map(x => x.replace(/\s+/g, ' ').trim())), 'besoin du jour sous chaque jauge'),
      egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement horizontal'),
      egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Sexe non précisé : l'encart demande le sexe.
    d = copie({ ...COMPLET, sexe: 'non_precise' });
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
    pb.push(egal(['sexe'], await p.evaluate(() => [...document.querySelectorAll('.pf-encart .pf-champ')].map(c => (c.querySelector('[name]') || {}).name)), 'sexe non précisé : l\'encart demande le sexe'));
    await p.click('.pf-encart [type="submit"]');
    pb.push(egal('Choisis ton sexe (femme ou homme) : il sert à la formule du calcul.', await txt(p, '.pf-msg'), 'sexe non choisi : message'), egal(0, d.ecritures.length, 'sexe non choisi : rien d\'écrit'));
    await p.click('.mrt-pastille:has(input[value="femme"])');
    await p.click('.pf-encart [type="submit"]');
    await p.waitForSelector('.nu-besoin');
    pb.push(egal([['PATCH', 'profils', { sexe: 'femme' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'sexe enregistré'));
    await ctx.close();

    // Profil complet : pas d'encart ; « Calculé pour … » ouvre la feuille Mon profil (composants/profil.js), mesures en tête.
    d = copie(COMPLET);
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
    pb.push(egal(0, await p.locator('.pf-encart').count(), 'profil complet : pas d\'encart'), egal('2 117 kcal', await txt(p, '.nu-kcal'), 'profil complet : besoin du jour'));
    const lignesMoi = () => p.evaluate(() => [...document.querySelectorAll('.ps-profil #moi .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent));
    await p.click('.nu-profil-l'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal(['Mon profil', ['Prénom | Essai', 'Nom | Fictif', 'Sexe | Homme', 'Date de naissance | 15 mars 1986', 'Poids | 70 kg', 'Taille | 175 cm', 'Activité hors sport | Peu actif', 'Pointure | —']], [await txt(p, '.ps-profil .fc-libelle'), await lignesMoi()], 'feuille Mon profil : les mesures du calcul, en tête'));
    await p.click('.ps-profil [data-fermer]');
    pb.push(egal([0, 0], [await p.locator('.ps-profil').count(), d.ecritures.length], 'croix : feuille fermée, rien d\'écrit'));
    await p.click('.nu-profil-l'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.click('.ps-profil [data-q="poids"]'); await p.fill('.ps-profil [name="valeur"]', '72,5'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.click('.ps-profil [data-q="activite"]'); await p.click('.ps-profil [data-val="actif"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.waitForFunction(() => /2 401/.test((document.querySelector('.nu-kcal') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    pb.push(egal([['PATCH', 'profils', { poids: 72.5 }], ['PATCH', 'profils', { activite: 'actif' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'feuille : chaque mesure rangée, virgule acceptée'),
      egal('2 401 kcal', await txt(p, '.nu-kcal'), 'besoin recalculé avec 72,5 kg et activité « actif »'));
    // Échec d'écriture : message, la question reste ouverte.
    d.panne = true;
    await p.click('.ps-profil [data-q="taille"]'); await p.click('.ps-profil .ps-valeur [type="submit"]');
    await p.locator('.ps-profil .ps-msg:not(:empty)').waitFor();
    pb.push(egal('Enregistrement impossible pour l\'instant.', await txt(p, '.ps-profil .ps-msg'), 'panne : message d\'erreur'), egal(1, await p.locator('.ps-profil .ps-valeur').count(), 'panne : la question reste ouverte'));
    await ctx.close();

    // Phase d'après la course cap (choisie dans les préférences) : J-12, J-2, J-1, puis une course lointaine.
    // Phase : celle du plan de saison (spécification Préparation, § 4) ; Carbo-loading de J-3 à J-2 et Veille à J-1 avant la course confirmée la plus proche.
    for (const [date, attendu] of [['2026-11-01', 'Phase · Entraînement'], ['2026-10-22', 'Phase · Carbo-loading'], ['2026-10-21', 'Phase · Veille de course'], ['2026-12-20', 'Phase · Entraînement']]) {
      d = copie(COMPLET);
      const lac = d.courses.find(c => c.course === 'Trail du Lac');
      lac.date = date; lac.prepa_semaines = 12; lac.role = 'objectif'; d.preferences[0].course_cap = lac.id; // un Objectif : sa saison donne la phase
      ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
      pb.push(egal(attendu, await txt(p, '.nu-phase'), 'cap au ' + date + ' : phase'));
      await ctx.close();
    }

    // Nutrition n'est pas dans le menu par défaut ; une fois cochée dans les Préférences, elle a son onglet.
    d = copie(COMPLET); d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Nutrition'];
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 390, d));
    pb.push(egal(['En un coup d\'œil', 'Ma saison', 'Ma nutrition'], await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(x => x.getAttribute('aria-label') || x.textContent)), 'Nutrition cochée : onglet dans le menu'));
    await ctx.close();
    // Menu par défaut : pas d'onglet Nutrition ailleurs ; sur la page Nutrition, son onglet s'ajoute au bout, actif, le temps de la visite.
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, copie(COMPLET)));
    pb.push(egal(false, (await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(x => x.getAttribute('aria-label') || x.textContent))).includes('Ma nutrition'), 'menu par défaut : pas d\'onglet Nutrition'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 390, copie(COMPLET)));
    pb.push(egal(['Ma nutrition', true], await p.evaluate(() => { const t = [...document.querySelectorAll('.mrt-tab')], on = document.querySelector('.mrt-tab.is-on'); return [on && on.textContent, t[t.length - 1] === on]; }), 'page Nutrition hors du menu : son onglet, actif, au bout'));
    await ctx.close();

    // Site partagé en lecture seule : aucune donnée de nutrition.
    const autre = '00000000-0000-0000-0000-00000000000b';
    d = copie(COMPLET); d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d, { 'mrt-vue': autre }));
    pb.push(egal([0, 0, 'Les données de nutrition ne sont pas partagées.'], [await p.locator('.nu-besoin').count(), await p.locator('.pf-encart').count(), await txt(p, '#nutrition')], 'site partagé : rien de nutrition'));
    await ctx.close();
    return pb;
  },
  // Relais de recherche d'aliments (supabase/functions/recherche-aliments) : rejoué dans Node, moteur simulé.
  async relais() {
    const pb = [];
    const m = await import(path.resolve(__dirname, '../../supabase/functions/recherche-aliments/index.ts'));
    const hit = (nom, marque, kcal) => ({ product_name: nom, brands: [marque], nutriments: { 'energy-kcal_100g': kcal, proteins_100g: 4, carbohydrates_100g: 5, fat_100g: 1.5 } });
    const appels = [];
    // Moteur simulé : « yaourt na » ramène des marques « NA » ; « yaourt » ramène des yaourts.
    const moteur = async url => {
      const u = new URL(url); appels.push(u.hostname + ' ' + (u.searchParams.get('q') || u.searchParams.get('search_terms')));
      if (u.hostname === 'world.openfoodfacts.org') return new Response('saturé', { status: 503 });
      const q = u.searchParams.get('q');
      const hits = q === 'yaourt na' ? [hit('NA', 'Borges', 900), hit('Swiss cheese', 'Na', 90)] : q === 'yaourt' ? [hit('Yaourt nature', 'Marque C', 53), hit('Yaourt fraise', 'Marque D', 90), hit('Yaourt nature', 'Marque C', 53), hit('Yaourt au lait entier nature', 'Marque E', 60)] : [];
      return new Response(JSON.stringify({ hits }), { status: 200 });
    };
    const demander = async (corps, f = moteur, methode = 'POST') => { const r = await m.repondre(new Request('https://x/', methode === 'POST' ? { method: 'POST', body: JSON.stringify(corps) } : { method: methode }), f); return [r.status, await r.json().catch(() => null)]; };
    let [st, d] = await demander({ q: 'yaourt na' });
    pb.push(egal([200, 'search', ['Yaourt nature · Marque C', 'Yaourt au lait entier nature · Marque E']], [st, d.source, d.produits.map(p => p.nom + ' · ' + p.marque)], '« yaourt na » : les marques « NA » écartées, puis sans le dernier mot, filtré sur « na »'),
      egal(['search.openfoodfacts.org yaourt na', 'search.openfoodfacts.org yaourt'], appels, 'deux demandes : ce qui est tapé, puis sans le mot commencé'));
    pb.push(egal({ nom: 'Yaourt nature', marque: 'Marque C', kcal: 53, proteines: 4, glucides: 5, lipides: 1.5, portionG: 100 }, d.produits[0], 'produit : valeurs pour 100 g, portion de 100 g sans portion habituelle'));
    pb.push(egal(true, m.correspond({ nom: 'Œufs au plat', marque: '' }, 'oeuf au pl'), 'sans accent ni pluriel, mot commencé'));
    const panne = async () => new Response('saturé', { status: 503 });
    [st, d] = await demander({ q: 'skyr' }, panne);
    pb.push(egal([503, 'Open Food Facts indisponible'], [st, d.erreur], 'les deux moteurs en panne : 503'));
    [st, d] = await demander({ q: 'a' });
    pb.push(egal(400, st, 'recherche trop courte : refusée'));
    const o = await m.repondre(new Request('https://x/', { method: 'OPTIONS' }), moteur);
    pb.push(egal([200, '*'], [o.status, o.headers.get('access-control-allow-origin')], 'pré-demande du navigateur acceptée'));
    return pb;
  },
  // Nutrition : besoin, sport en lignes, anneaux, recherche, ajout, journal (module-nutrition-specification.md, § 4 et 10).
  async nutritionJournal(nav, db) {
    const pb = [];
    const U = db.profils[0].id, norm = t => t.replace(/\s+/g, ' ').trim();
    const COMPLET = { sexe: 'homme', naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' };
    const ID = n => '00000000-0000-0000-0002-00000000000' + n;
    const ALIMENTS = () => [
      { id: ID(1), utilisateur: U, nom: 'Banane', portion: '1 pièce', kcal: 90, proteines: 1, glucides: 20, lipides: 0.3, favori: true, dernier_usage: '2026-10-19T08:00:00Z' },
      { id: ID(2), utilisateur: U, nom: 'Riz cuit', portion: '100 g', kcal: 130, proteines: 2.7, glucides: 28, lipides: 0.3, favori: false, dernier_usage: '2026-10-18T12:00:00Z' },
      { id: ID(3), utilisateur: U, nom: 'Œuf', portion: '1 pièce', kcal: 140, proteines: 12, glucides: 1, lipides: 10, favori: false, dernier_usage: null }];
    const LIGNES = () => [
      { id: ID(4), utilisateur: U, date: '2026-10-20', repas: 'midi', aliment: ID(2), nom: 'Riz cuit', quantite: 2, kcal: 260, proteines: 5.4, glucides: 56, lipides: 0.6 },
      { id: ID(5), utilisateur: U, date: '2026-10-20', repas: 'petit_dej', aliment: ID(1), nom: 'Banane', quantite: 1, kcal: 90, proteines: 1, glucides: 20, lipides: 0.3 }];
    const base = (extra = {}) => { const d = JSON.parse(JSON.stringify(db)); Object.assign(d.profils[0], COMPLET); Object.assign(d.courses.find(c => c.course === 'Trail du Lac'), { prepa_semaines: 12, role: 'objectif' }); d.aliments = ALIMENTS(); d.repas_lignes = LIGNES(); d.ecritures = []; return Object.assign(d, extra); };
    const jauges = p => p.evaluate(() => [...document.querySelectorAll('.nu-jauge')].map(j => [j.dataset.jauge, j.dataset.etat, j.querySelector('.nu-anneau-v').textContent, j.querySelector('.nu-jauge-reste').textContent, j.querySelector('.nu-jauge-besoin').textContent].join(' | ').replace(/\s+/g, ' ')));
    const groupes = p => p.evaluate(() => [...document.querySelectorAll('.nu-repas')].filter(r => r.querySelector('li')).map(r => r.querySelector('.nu-repas-t').textContent.replace(/\s+/g, ' ').trim().replace(/^(Petit-déj|Midi|Encas|Soir)/, '$1 ')).map(x => x.replace(/\s+/g, ' ')));
    // Feuilles « Repas » et « Activité » : ouvertes par les cases (ou le « + » d'un repas), fermées par la croix.
    const ouvrirRepas = async (p, repas) => { await p.click(repas ? '.nu-journal [data-act="ajout-repas"][data-repas="' + repas + '"]' : '.nu-tuile[data-act="ajout-repas"]'); await p.waitForSelector('.nu-feuille .nu-sources'); };
    const ouvrirActivite = async p => { await p.click('.nu-tuile[data-act="activite"]'); await p.waitForSelector('.nu-feuille .nu-sport-l'); };
    const fermerF = async p => { await p.click('.nu-feuille [data-act="fermer"]'); await p.waitForSelector('.nu-feuille', { state: 'detached' }); };
    const lignes = p => p.evaluate(() => [...document.querySelectorAll('.nu-ligne-nom')].map(x => x.textContent.replace(/\s+/g, ' ')));
    const liste = p => p.evaluate(() => [...document.querySelectorAll('.nu-source .nu-aliment, .nu-resultats .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | ')));
    const sansId = e => { const c = { ...e.corps }; delete c.id; return c; };
    const ouvrirN = async (d, w = 390, opts = {}) => { const o = await ouvrir(nav, 'nutrition.html', w, d, {}, opts); await o.p.waitForSelector('.nu-jauge'); return o; };
    const kcal = async p => norm(await p.locator('.nu-kcal').textContent());
    // Attend qu'une écriture soit arrivée dans la base simulée (enregistrement différé du sport).
    const ecrit = async (d, f) => { for (let i = 0; i < 60 && !d.ecritures.some(f); i++) await new Promise(r => setTimeout(r, 50)); };

    // Carte 1 et jauges au départ.
    let d = base();
    let { p, ctx, erreurs } = await ouvrirN(d);
    pb.push(egal(['Calculé pour H · 70 kg · 175 cm · peu actif ›', 'Phase · Entraînement', '2 117 kcal'], [norm(await p.locator('.nu-profil-l').textContent()), norm(await p.locator('.nu-phase').textContent()), await kcal(p)], 'carte du besoin : profil en lecture, phase de Nutrition, besoin'),
      egal(['Mardi 20 octobre', true, 0], [norm(await p.locator('.nu-jour-t').textContent()), await p.locator('[data-act="lendemain"]').isDisabled(), await p.locator('[data-act="aujourdhui"]').count()], 'sélecteur : le jour, pas de jour suivant, pas de rond « » »'),
      egal(['kcal | sous | 350 | Reste 1 767 kcal | Besoin 2 117 kcal', 'p | sous | 6 g | Reste 92 g | Besoin 98–140 g', 'g | sous | 76 g | Reste 189 g | Besoin 265–318 g', 'l | sous | 1 g | Reste 58 g | Besoin 59–82 g'], await jauges(p), 'anneaux : nom, valeur, reste, besoin'),
      egal(['Petit-déj 90 kcal', 'Midi 260 kcal'], await groupes(p), 'journal : un bloc par repas'),
      egal(['Banane', 'Riz cuit · 200 g'], await lignes(p), 'journal : grammes pour un aliment donné pour 100 g'),
      egal(['Séance', 'Repas', 0], [norm(await p.locator('.nu-tuile[data-act="activite"]').textContent()), norm(await p.locator('.nu-tuile[data-act="ajout-repas"]').textContent()), await p.locator('.nu-sources, .nu-sport-l').count()], 'boutons Activité et Repas ; ajout et sport dans leurs feuilles'),
      egal([true, true, true, 'ajout-repas'], await p.evaluate(() => { const style = cl => { const ref = document.createElement('button'); ref.className = cl; document.body.append(ref); const r0 = getComputedStyle(ref), v = [r0.backgroundColor, r0.color, r0.borderRadius]; ref.remove(); return v; }; return [...document.querySelectorAll('.nu-tuile')].map(t => { const att = style(t.classList.contains('is-principal') ? 'mrt-btn is-principal' : 'mrt-btn'); const c = getComputedStyle(t), ico = t.querySelectorAll('svg'), l = t.querySelector('.nu-tuile-l').getBoundingClientRect(); return [c.backgroundColor, c.color, c.borderRadius].join() === att.join() && ico.length === 2 && ico[0].getBoundingClientRect().right <= l.left && ico[1].getBoundingClientRect().left >= l.right; }).concat([document.querySelectorAll('.nu-tuile').length === 2, (document.querySelector('.nu-tuile.is-principal') || {}).dataset.act]); }), 'boutons Repas et Séance : Repas seul principal (design, § 11), Séance en secondaire, « + » à gauche, picto à droite du libellé'),
      egal(0, await p.locator('.nu-mention, .nu-macros, .nu-editer').count(), 'page épurée : ni mention, ni fourchettes en texte, ni bouton « Modifier »'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-telephone.png'), fullPage: true });
    await ouvrirRepas(p);
    if (CAPTURES) { await p.waitForTimeout(600); await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-feuille.png') }); }
    pb.push(egal(['Ajouter un aliment', ['Banane · 1 pièce | 90 kcal', 'Riz cuit | 130 kcal / 100 g']], [norm(await p.locator('.nu-feuille .fc-libelle').textContent()), await liste(p)], 'feuille Repas : titre, Récents sans l\'aliment jamais utilisé'));
    await p.click('[data-source="favoris"]');
    pb.push(egal(['Banane · 1 pièce | 90 kcal'], await liste(p), 'Favoris'));
    pb.push(egal(true, await p.evaluate(() => document.querySelector('.nu-feuille .nu-recherche').getBoundingClientRect().height < 80), 'Favoris : la recherche garde sa hauteur (liste courte)'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-favoris.png') });
    await p.click('[data-source="recents"]');
    // Banane : deux portions, au repas de l'heure (10 h : midi).
    pb.push(egal(['Récents', 'Favoris', '+ Aliment libre'], (await p.locator('.nu-sources button').allTextContents()).map(norm), 'sources : Récents, Favoris, Aliment libre'));
    await p.click('.nu-aliment >> nth=0');
    const qte = async () => p.inputValue('.nu-qte');
    pb.push(egal([0, 0, true, 'Banane · 1 pièce'], [await p.locator('.nu-feuille .nu-sources').count(), await p.locator('.nu-feuille .nu-recherche').count(), await p.locator('.nu-retour').isVisible(), norm(await p.locator('.nu-choix-nom').textContent())],
      'étape 2 : l\'aliment seul, sans la recherche ni les listes ; « ‹ » proposé'));
    await p.click('[data-act="retour"]');
    pb.push(egal([1, 0, false], [await p.locator('.nu-feuille .nu-sources').count(), await p.locator('.nu-choix').count(), await p.locator('.nu-retour').isVisible()], '« ‹ » : retour à la recherche et aux listes'));
    await p.click('.nu-aliment >> nth=0');
    pb.push(egal(['1', 'midi'], [await qte(), await p.locator('.nu-repas-choix [aria-pressed="true"]').getAttribute('data-repas')], 'choix : une portion, repas d\'après l\'heure'));
    await p.click('[data-act="plus"]'); await p.click('[data-act="plus"]'); await p.click('[data-act="moins"]'); await p.click('[data-act="plus"]');
    pb.push(egal(['2', '2 portions'], [await qte(), norm(await p.locator('.nu-quantite .nu-unite').textContent()).replace(/^/, '2 ')], 'quantité par pas de 0,5'));
    pb.push(egal(['180 kcal · P 2 g · G 40 g · L 1 g', 'Ajouter · 180 kcal', ['Quantité', 'Repas'], 1], [norm(await p.locator('.nu-apercu').textContent()), norm(await p.locator('.nu-ajouter').textContent()), (await p.locator('.nu-choix-l').allTextContents()).map(norm), await p.locator('.nu-choix-tete .nu-fav').count()],
      'étape 2 : aperçu de la quantité, total dans le bouton, libellés Quantité et Repas, Favori à côté du nom'));
    if (CAPTURES) { const vp = p.viewportSize(); await p.setViewportSize({ width: 390, height: 844 }); await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-ajout-etape2.png') }); await p.setViewportSize(vp); }
    {
      const vp = p.viewportSize();
      await p.setViewportSize({ width: 1280, height: 800 });
      const mesure = () => p.evaluate(() => { const f = document.querySelector('.nu-feuille').getBoundingClientRect(), b = document.querySelector('.nu-feuille .mc-pied'); return [Math.round(f.width), Math.round(f.height), !!b && Math.abs(b.getBoundingClientRect().bottom - f.bottom) < 2]; });
      const e2 = await mesure();
      if (CAPTURES) { await p.waitForTimeout(400); await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-ajout-ordinateur.png') }); }
      await p.click('[data-act="retour"]');
      const e1 = await mesure();
      pb.push(egal([[480, 640, true], [480, 640, false]], [e2, e1], 'ordinateur : feuille de 30 rem sur 40 rem aux deux étapes ; « Ajouter » collé en bas de l\'étape 2'));
      await p.click('.nu-aliment >> nth=0'); await p.fill('.nu-qte', '2');
      await p.setViewportSize(vp);
    }
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal([['POST', 'repas_lignes', { date: '2026-10-20', repas: 'midi', aliment: ID(1), nom: 'Banane', quantite: 2, kcal: 180, proteines: 2, glucides: 40, lipides: 0.6 }], ['PATCH', 'aliments', ['dernier_usage'], '?id=eq.' + ID(1)]],
      d.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, sansId(e)] : [e.methode, e.table, Object.keys(e.corps), e.filtres]), 'Ajouter : la ligne figée et le dernier usage de l\'aliment'),
      egal('kcal | sous | 530 | Reste 1 587 kcal | Besoin 2 117 kcal', (await jauges(p))[0], 'anneau des calories après l\'ajout'),
      egal(['Petit-déj 90 kcal', 'Midi 440 kcal'], await groupes(p), 'journal après l\'ajout'),
      egal([0, 1], [await p.locator('.nu-ok').count(), await p.locator('.nu-feuille').count()], 'feuille : plus de message « ajouté », la feuille reste ouverte'));
    d.ecritures.length = 0;
    await fermerF(p);
    pb.push(egal(0, await p.locator('.nu-journal li .mrt-rond').count(), 'journal : aucun rond au bout des lignes'));
    await p.locator('.nu-ligne:has-text("Banane")').last().click();
    await p.waitForSelector('.nu-modifier');
    await p.click('.nu-modifier [data-act="supprimer"]');
    pb.push(egal(['Supprimer cette ligne ?', 0], [norm(await p.locator('.mrt-dialogue p').textContent()), d.ecritures.length], 'Supprimer : la question du site, rien d\'écrit avant la réponse'));
    await p.click('.mrt-dialogue [data-r="oui"]');
    await p.waitForFunction(() => document.querySelectorAll('.nu-lignes li').length === 2);
    pb.push(egal([['DELETE', 'repas_lignes'], 0], [[d.ecritures[0].methode, d.ecritures[0].table], await p.locator('.nu-modifier').count()], 'toucher la ligne, Supprimer, Supprimer : la ligne est supprimée, la fenêtre fermée'));
    // Riz cuit, en grammes : 100 g d'office, saisie de 200 g puis « − » : 190 g.
    d.ecritures.length = 0;
    await ouvrirRepas(p);
    await p.click('.nu-aliment:has-text("Riz cuit")');
    pb.push(egal(['100', 'g'], [await qte(), norm(await p.locator('.nu-quantite .nu-unite').textContent())], 'aliment pour 100 g : quantité en grammes'));
    await p.fill('.nu-qte', '0'); await p.click('[data-act="ajouter"]');
    pb.push(egal(['La quantité doit être comprise entre 1 et 5 000 g.', 0], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), d.ecritures.length], 'quantité nulle refusée'));
    await p.fill('.nu-qte', '200'); await p.click('[data-act="moins"]');
    pb.push(egal('190', await qte(), '« − » : 10 g de moins'));
    pb.push(egal('247 kcal · P 5 g · G 53 g · L 1 g', norm(await p.locator('.nu-apercu').textContent()), 'aperçu de 190 g de riz'));
    await p.fill('.nu-qte', '200');
    pb.push(egal(['260 kcal · P 5 g · G 56 g · L 1 g', 'Ajouter · 260 kcal'], [norm(await p.locator('.nu-apercu').textContent()), norm(await p.locator('.nu-ajouter').textContent())], 'aperçu à la frappe, sans redessiner'));
    await p.fill('.nu-qte', '190');
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal({ date: '2026-10-20', repas: 'midi', aliment: ID(2), nom: 'Riz cuit', quantite: 1.9, kcal: 247, proteines: 5.1, glucides: 53.2, lipides: 0.6 }, sansId(d.ecritures[0]), '190 g de riz : 1,9 fois les valeurs pour 100 g'),
      egal(['Banane', 'Riz cuit · 200 g', 'Riz cuit · 190 g'], await lignes(p), 'journal : 190 g'));

    // Recherche dans Open Food Facts (réponses simulées : aucun appel réel pendant les essais).
    const demandes = [];
    let reponse = { status: 200, body: { products: [
      { code: '1', product_name: 'Riz basmati', brands: 'Marque A, Autre', serving_quantity: 60, nutriments: { 'energy-kcal_100g': 350, proteins_100g: 8, carbohydrates_100g: 78, fat_100g: 1 } },
      { code: '2', product_name: 'Sans calories', brands: 'Marque B', nutriments: {} },
      { code: '3', product_name: 'Rice pudding', product_name_fr: 'Riz au lait', brands: '', nutriments: { energy_100g: 300, carbohydrates_100g: 17 } },
      { code: '4', product_name: 'Compote', brands: '', nutriments: { 'energy-kcal_100g': 70 } }] } };
    await ctx.route('https://world.openfoodfacts.org/**', r => { demandes.push(r.request().url()); r.fulfill({ status: reponse.status, contentType: 'application/json', body: JSON.stringify(reponse.body) }); });
    await p.fill('.nu-recherche [name="q"]', 'riz');
    await p.clock.runFor(600); await p.waitForTimeout(300);
    pb.push(egal([0, ''], [demandes.length, norm(await p.locator('.nu-produits').textContent())], 'sans relais, pendant la frappe : l\'ancien moteur n\'est pas interrogé, rien d\'affiché'));
    await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForSelector('.nu-off .nu-aliment');
    pb.push(egal(['Riz cuit | 130 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-resultats .nu-liste:not(.nu-off) .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'recherche : mes aliments d\'abord'));
    pb.push(egal(['Riz basmati · Marque A | 350 kcal / 100 g', 'Riz au lait | 72 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'résultats : pour 100 g (kJ convertis), sans produit sans calories ni produit sans le mot « riz »'),
      egal(['riz', 'unique_scans_n'], [new URL(demandes[0]).searchParams.get('search_terms'), new URL(demandes[0]).searchParams.get('sort_by')], 'recherche : le texte saisi, les produits les plus courants d\'abord'));
    d.ecritures.length = 0;
    await p.click('.nu-off .nu-aliment >> nth=0');
    pb.push(egal(['Riz basmati · Marque A', '60'], [norm(await p.locator('.nu-choix-nom').textContent()), await qte()], 'produit choisi : sa portion habituelle en grammes'));
    await p.click('[data-act="favori"]');
    pb.push(egal(0, d.ecritures.length, 'favori d\'un produit pas encore ajouté : rien d\'écrit'));
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal([['POST', 'aliments', { nom: 'Riz basmati · Marque A', portion: '100 g', kcal: 350, proteines: 8, glucides: 78, lipides: 1, favori: true, dernier_usage: null }],
      ['POST', 'repas_lignes', { date: '2026-10-20', repas: 'midi', aliment: d.ecritures[0] && d.ecritures[0].corps.id, nom: 'Riz basmati · Marque A', quantite: 0.6, kcal: 210, proteines: 4.8, glucides: 46.8, lipides: 0.6 }], ['PATCH', 'aliments']],
      d.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, sansId(e)] : [e.methode, e.table]), 'produit ajouté : il devient un aliment (favori), puis une ligne de 60 g'));
    await p.click('[data-source="recents"]');
    pb.push(egal('Riz basmati · Marque A | 350 kcal / 100 g', (await p.evaluate(() => [...document.querySelectorAll('.nu-source .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))))[0], 'le produit revient en tête des Récents'));
    reponse = { status: 200, body: { products: [
      { product_name: 'NA', brands: 'Borges', nutriments: { 'energy-kcal_100g': 900 } },
      { product_name: 'Yaourt nature', brands: 'Marque F', nutriments: { 'energy-kcal_100g': 50, proteins_100g: 4 } }] } };
    await p.fill('.nu-recherche [name="q"]', 'yaourt na'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForSelector('.nu-off .nu-aliment');
    pb.push(egal(['Yaourt nature · Marque F | 50 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'moteur de secours : « yaourt na » écarte la marque « NA »'));
    reponse = { status: 200, body: { products: [] } };
    await p.fill('.nu-recherche [name="q"]', 'introuvable'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForFunction(() => /Aucun résultat/.test(document.querySelector('.nu-resultats').textContent));
    pb.push(egal('Aucun résultat.', norm(await p.locator('.nu-resultats').textContent()), 'recherche sans résultat'));
    reponse = { status: 503, body: {} };
    const avant = demandes.length;
    await p.fill('.nu-recherche [name="q"]', 'pain'); await p.press('.nu-recherche [name="q"]', 'Enter');
    for (let i = 0; i < 20 && !/saturé/.test(await p.locator('.nu-resultats').textContent()); i++) await p.clock.runFor(500);
    pb.push(egal(['Open Food Facts est saturé, réessaie dans un instant.', 2], [norm(await p.locator('.nu-resultats').textContent()), demandes.length - avant], 'sans relais, ancien moteur saturé : un nouvel essai, puis le message'));

    // Relais Supabase « recherche-aliments » : la voie normale ; l'ancien moteur n'est pas appelé ; recherche gardée.
    {
      const d2 = base(), appels = [];
      d2.relais = c => { appels.push(c); return { status: 200, body: { source: 'search', produits: [{ nom: 'Yaourt nature', marque: 'Marque C', kcal: 53, proteines: 4, glucides: 5, lipides: 1.5, portionG: 125 }] } }; };
      const o2 = await ouvrirN(d2), p2 = o2.p, ancien = [];
      await o2.ctx.route('https://world.openfoodfacts.org/**', r => { ancien.push(1); r.fulfill({ status: 503, body: '' }); });
      await ouvrirRepas(p2);
      const mes = () => p2.evaluate(() => [...document.querySelectorAll('.nu-mes .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | ')));
      await p2.fill('.nu-recherche [name="q"]', 'oe');
      pb.push(egal([['Œuf · 1 pièce | 140 kcal'], 0, 0], [await mes(), appels.length, ancien.length], 'pendant la frappe : mes aliments, sans aucun appel'));
      await p2.fill('.nu-recherche [name="q"]', 'yaourt');
      await p2.clock.runFor(600);
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal([[{ q: 'yaourt' }], 'yaourt'], [appels.slice(), await p2.inputValue('.nu-recherche [name="q"]')], 'pendant la frappe, dès l\'arrivée sur la page : les produits par le relais, sans Entrée'));
      await p2.press('.nu-recherche [name="q"]', 'Enter');
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal([['Yaourt nature · Marque C | 53 kcal / 100 g'], [{ q: 'yaourt' }], 0], [await p2.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), appels, ancien.length], 'relais : les produits, sans l\'ancien moteur'));
      await p2.click('.nu-off .nu-aliment >> nth=0');
      pb.push(egal('125', await p2.inputValue('.nu-qte'), 'relais : la portion habituelle du produit'));
      await p2.click('[data-act="retour"]');
      pb.push(egal(['yaourt', 1], [await p2.inputValue('.nu-recherche [name="q"]'), await p2.locator('.nu-off .nu-aliment').count()], '« ‹ » : la recherche et ses résultats retrouvés'));
      await p2.fill('.nu-recherche [name="q"]', 'skyr'); await p2.fill('.nu-recherche [name="q"]', 'yaourt'); await p2.press('.nu-recherche [name="q"]', 'Enter');
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal(1, appels.length, 'recherche déjà faite : gardée, aucun nouvel appel'));
      // Une recherche gardée par une version précédente du site n'est pas resservie.
      pb.push(egal(true, await p2.evaluate(() => { sessionStorage.setItem('mrt-nutri-recherches-ancienne', '{"yaourt":[]}'); return Object.keys(sessionStorage).some(k => /^mrt-nutri-recherches-/.test(k)); }), 'mémoire des recherches : sous la version du site'));
      // Le relais a répondu : les produits arrivent aussi pendant la frappe, une demi-seconde après la dernière lettre.
      await p2.fill('.nu-recherche [name="q"]', 'yaourt fr');
      pb.push(egal(1, appels.length, 'pendant la frappe : rien avant la pause'));
      await p2.clock.runFor(600);
      await p2.waitForFunction(() => document.querySelector('.nu-off .nu-aliment'));
      pb.push(egal([[{ q: 'yaourt' }, { q: 'yaourt fr' }], 'yaourt fr'], [appels, await p2.inputValue('.nu-recherche [name="q"]')], 'pendant la frappe : la recherche part après la pause, le champ reste en place'));
      await o2.ctx.close();
    }

    // Aliment libre : contrôles, puis création.
    d.ecritures.length = 0;
    await p.click('[data-source="libre"]');
    await p.click('.nu-feuille [form="nu-libre"]');
    pb.push(egal('Écris le nom de l\'aliment.', norm(await p.locator('.nu-ajout .nu-msg').textContent()), 'aliment libre : nom manquant'));
    await p.fill('.nu-libre [name="nom"]', 'Pain'); await p.fill('.nu-libre [name="portion"]', '1 tranche');
    await p.click('.nu-feuille [form="nu-libre"]');
    pb.push(egal(['Indique les calories pour une portion.', 'Pain', 0], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), await p.inputValue('.nu-libre [name="nom"]'), d.ecritures.length], 'aliment libre : calories manquantes, saisie gardée, rien d\'écrit'));
    await p.fill('.nu-libre [name="kcal"]', '80'); await p.fill('.nu-libre [name="proteines"]', '3,5'); await p.fill('.nu-libre [name="glucides"]', '15');
    pb.push(egal(true, await p.evaluate(() => { const n = document.querySelector('.nu-libre [name="nom"]').getBoundingClientRect(), f = document.querySelector('.nu-favori-case').getBoundingClientRect(); return f.left >= n.right && Math.abs((f.top + f.bottom) / 2 - (n.top + n.bottom) / 2) < 3; }), 'aliment libre : l\'étoile Favori à droite du nom'));
    await p.click('.nu-favori-case');
    pb.push(egal(['★', true], [norm(await p.locator('.nu-favori-case').innerText()), await p.isChecked('.nu-libre [name="favori"]')], 'étoile touchée : pleine, cochée'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-libre.png') });
    await p.click('.nu-feuille [form="nu-libre"]');
    await p.waitForFunction(() => /Pain/.test((document.querySelector('.nu-choix-nom') || {}).textContent || ''));
    pb.push(egal([['POST', 'aliments', { nom: 'Pain', portion: '1 tranche', favori: true, dernier_usage: null, kcal: 80, proteines: 3.5, glucides: 15, lipides: 0 }]], d.ecritures.map(e => [e.methode, e.table, sansId(e)]), 'aliment libre : créé avec ses valeurs'),
      egal('Pain · 1 tranche', norm(await p.locator('.nu-choix-nom').textContent()), 'aliment libre : prêt à ajouter'));
    d.ecritures.length = 0;
    await p.click('[data-act="favori"]');
    await p.waitForFunction(() => document.querySelector('[data-act="favori"]').getAttribute('aria-pressed') === 'false');
    pb.push(egal([['PATCH', 'aliments', { favori: false }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'Favori retiré'));
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement horizontal'), egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Panne d'écriture : message, aucune ligne ajoutée.
    d = base({ panne: true });
    ({ p, ctx } = await ouvrirN(d));
    await ouvrirRepas(p);
    await p.click('.nu-aliment >> nth=0'); await p.click('[data-act="ajouter"]');
    await p.locator('.nu-ajout .nu-msg:not(:empty)').waitFor();
    pb.push(egal(['Enregistrement impossible pour l\'instant.', 2], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), await p.locator('.nu-lignes li').count()], 'panne : message, journal inchangé'));
    await ctx.close();

    // Repas d'après l'heure : 7 h petit-déj, 20 h soir.
    for (const [h, attendu] of [['07:00', 'petit_dej'], ['20:00', 'soir']]) {
      ({ p, ctx } = await ouvrirN(base(), 390, { maintenant: new Date('2026-10-20T' + h + ':00') }));
      await ouvrirRepas(p);
      await p.click('.nu-aliment >> nth=0');
      pb.push(egal(attendu, await p.locator('.nu-repas-choix [aria-pressed="true"]').getAttribute('data-repas'), 'repas proposé à ' + h));
      await ctx.close();
    }

    // Jauges : cible et alerte.
    for (const [ligne, attendu, quoi] of [[{ kcal: 2200, proteines: 100, glucides: 300, lipides: 90 }, ['kcal cible Dans la cible', 'p cible Dans la cible', 'g cible Dans la cible', 'l alerte Dépassé de 8 g'], 'cible, puis lipides au-delà du maximum'],
      [{ kcal: 3000, proteines: 150, glucides: 400, lipides: 60 }, ['kcal alerte Dépassé de 671 kcal', 'p alerte Dépassé de 10 g', 'g alerte Dépassé de 82 g', 'l cible Dans la cible'], 'tout au-delà sauf les lipides']]) {
      d = base(); d.repas_lignes = [{ ...LIGNES()[0], ...ligne }];
      ({ p, ctx } = await ouvrirN(d));
      pb.push(egal(attendu, (await jauges(p)).map(x => { const c = x.split(' | '); return c[0] + ' ' + c[1] + ' ' + c[3]; }), 'jauges : ' + quoi));
      await ctx.close();
    }

    // Rien de saisi.
    d = base(); d.aliments = []; d.repas_lignes = [];
    ({ p, ctx } = await ouvrirN(d));
    pb.push(egal([['Petit-déj', 'Midi', 'Encas', 'Soir', 'Séances'], 0], [await p.locator('.nu-journal .nu-repas-t > span:first-child').allTextContents(), await p.locator('.nu-journal li').count()], 'journal vide : les quatre repas puis l\'activité, chacun avec son « + »'));
    await ouvrirRepas(p, 'soir');
    pb.push(egal('soir', await p.evaluate(() => document.querySelector('.nu-feuille .nu-sources') && 'soir'), '« + » du soir : la feuille s\'ouvre'));
    pb.push(egal(['+ Aliment libre', ''], [norm(await p.locator('.nu-sources [aria-pressed="true"]').textContent()), ''], 'sans aliment : formulaire libre, journal vide'));
    await p.click('[data-source="favoris"]');
    pb.push(egal('Aucun favori.', norm(await p.locator('.nu-source .nu-vide').textContent()), 'sans favori'));
    await p.click('[data-source="recents"]');
    pb.push(egal('Aucun aliment récent.', norm(await p.locator('.nu-source .nu-vide').textContent()), 'sans récent'));
    await ctx.close();

    // Sport du jour : une ligne remplie en fait apparaître une autre ; besoin recalculé ; retenu sur l'appareil ; rien dans la base.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    const ligneS = i => p.locator('.nu-sport-l').nth(i);
    await ouvrirActivite(p);
    pb.push(egal(['Ajouter une séance', 1], [norm(await p.locator('.nu-feuille .fc-libelle').textContent()), await p.locator('.nu-sport-l').count()], 'feuille Activité : une ligne vide au départ'));
    pb.push(egal([false, false, false], await p.evaluate(() => { const o = [...document.querySelectorAll('.nu-feuille .nu-sport-l [name="type"] option')].map(x => x.value); return [o.includes('j95'), o.includes('muscu'), o.includes('v2')]; }), 'autres sports : ni course, ni renforcement, ni vélo (ils viennent du Calendrier)'));
    await ligneS(0).locator('[name="type"]').selectOption('n1');
    await ligneS(0).locator('[name="heures"]').fill('1');
    pb.push(egal([2, '2 537 kcal', 'kcal | sous | 350 | Reste 2 187 kcal | Besoin 2 537 kcal'], [await p.locator('.nu-sport-l').count(), await kcal(p), (await jauges(p))[0]], 'sport : 1 h de natation, une 2e ligne, besoin et anneau recalculés'));
    await p.clock.runFor(1000); await ecrit(d, e => e.table === 'sport_jour' && e.methode === 'POST');
    pb.push(egal([['DELETE', 'sport_jour', '?utilisateur=eq.' + U + '&date=eq.2026-10-20'], ['POST', 'sport_jour', [{ date: '2026-10-20', type: 'n1', heures: 1 }]]], d.ecritures.slice(-2).map(e => e.methode === 'DELETE' ? [e.methode, e.table, e.filtres] : [e.methode, e.table, e.corps]), 'sport : rangé dans la base, jour par jour'));
    await ligneS(1).locator('[name="type"]').selectOption('m');
    await ligneS(1).locator('[name="heures"]').fill('30');
    pb.push(egal('2 537 kcal', await kcal(p), 'sport : 30 heures ignorées'));
    await ligneS(1).locator('[name="heures"]').fill('0,5');
    pb.push(egal([3, '2 642 kcal'], [await p.locator('.nu-sport-l').count(), await kcal(p)], 'sport : deux sports'));
    await p.clock.runFor(1000); await ecrit(d, e => e.table === 'sport_jour' && e.methode === 'POST' && e.corps.length === 2);
    await fermerF(p);
    pb.push(egal(['Natation récréative · 1 h', 'Marche · 30 min'], await p.locator('.nu-activites .nu-ligne-nom').allTextContents().then(l => l.map(norm)), 'journal : l\'activité en fin, sport et durée'));
    await p.reload(); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500); await p.waitForSelector('.nu-jauge');
    await ouvrirActivite(p);
    pb.push(egal([3, '2 642 kcal'], [await p.locator('.nu-sport-l').count(), await kcal(p)], 'sport : relu dans la base après rechargement'));
    await ligneS(0).locator('[name="type"]').selectOption('');
    pb.push(egal('2 222 kcal', await kcal(p), 'sport : la natation retirée'));
    await ctx.close();

    // Toucher une ligne : Modifier (quantité, repas) ; Annuler ne range rien.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    await p.click('.nu-ligne:has-text("Riz cuit")');
    await p.waitForSelector('.nu-modifier');
    pb.push(egal(['Riz cuit', '200', 'midi', true, true, 0], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.inputValue('.nu-modifier .nu-qte'), await p.inputValue('.nu-modifier select[name="repas"]'),
      await p.evaluate(() => !!document.querySelector('.mc-panneau.mc-etroit.nu-feuille .nu-modifier .mc-pied [type="submit"]')), await p.evaluate(() => !!document.querySelector('.nu-modifier .cal-bas [data-act="supprimer"]')), await p.locator('.cal-voile').count()],
      'Modifier : la feuille de saisie rapide (titre = la ligne, « Enregistrer » collé en bas), repas en liste'));
    await p.click('.nu-feuille [data-act="fermer"]');
    pb.push(egal([0, 0], [await p.locator('.nu-modifier').count(), d.ecritures.length], 'croix : feuille fermée, rien d\'écrit'));
    await p.click('.nu-ligne:has-text("Riz cuit")');
    await p.fill('.nu-modifier .nu-qte', '100'); await p.selectOption('.nu-modifier select[name="repas"]', 'soir');
    await p.click('.nu-modifier .mc-pied [type="submit"]');
    await p.waitForSelector('.nu-modifier', { state: 'detached' });
    pb.push(egal([['PATCH', 'repas_lignes', { repas: 'soir', quantite: 1, kcal: 130, proteines: 2.7, glucides: 28, lipides: 0.3 }, '?id=eq.' + ID(4)]], d.ecritures.map(e => [e.methode, e.table, e.corps, e.filtres]), 'Enregistrer : 100 g au soir, valeurs figées à la nouvelle quantité'),
      egal(['Petit-déj 90 kcal', 'Soir 130 kcal'], await groupes(p), 'journal : la ligne passée au soir'));
    await ctx.close();
    // Une activité du journal : Modifier, Supprimer.
    d = base(); d.sport_jour = [{ id: ID(8), utilisateur: U, date: '2026-10-20', type: 'v2', heures: 1 }, { id: ID(9), utilisateur: U, date: '2026-10-20', type: 'm', heures: 0.5 }];
    ({ p, ctx } = await ouvrirN(d));
    pb.push(egal('2 712 kcal', await kcal(p), 'activités lues dans la base'));
    await p.click('.nu-activites .nu-ligne:has-text("Marche")');
    await p.click('.nu-modifier [data-act="supprimer"]');
    pb.push(egal('Supprimer cette séance ?', norm(await p.locator('.mrt-dialogue p').textContent()), 'Supprimer une activité : la question du site'));
    await p.click('.mrt-dialogue [data-r="oui"]');
    await p.waitForSelector('.nu-modifier', { state: 'detached' });
    await ecrit(d, e => e.table === 'sport_jour' && e.methode === 'POST');
    pb.push(egal(['2 607 kcal', ['Vélo (19 à 22 km/h) · 1 h'], [{ date: '2026-10-20', type: 'v2', heures: 1 }]], [await kcal(p), await p.locator('.nu-activites .nu-ligne-nom').allTextContents().then(l => l.map(norm)), d.ecritures.filter(e => e.table === 'sport_jour' && e.methode === 'POST').pop().corps], 'activité supprimée : besoin et journal à jour, rangé dans la base'));
    await ctx.close();

    // Sélecteur de jour : la veille, un repas oublié, puis retour à aujourd'hui.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Lundi 19 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal([false, 1, 0, 'kcal | sous | 0 | Reste 2 117 kcal | Besoin 2 117 kcal'], [await p.locator('[data-act="lendemain"]').isDisabled(), await p.locator('[data-act="aujourdhui"]').count(), await p.locator('.nu-journal li').count(), (await jauges(p))[0]], 'veille : son journal (vide), jour suivant et « Aujourd\'hui » proposés'));
    pb.push(egal([true, true, 0], await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), j = r('.nu-jour'), t = r('.nu-jour-t'), d = r('[data-act="lendemain"]'), a = r('[data-act="aujourdhui"]');
      return [a.left >= d.right && Math.abs(a.top - d.top) < 2, Math.abs((t.left + t.right) / 2 - (j.left + j.right) / 2) < 2, document.querySelectorAll('.nu-auj, .mrt-lien[data-act="aujourdhui"]').length]; }), '« » » rond à droite de « › », jour centré, plus de lien « Aujourd\'hui »'));
    await ouvrirRepas(p);
    await p.click('.nu-aliment:has-text("Banane")'); await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal('2026-10-19', d.ecritures.filter(e => e.table === 'repas_lignes').pop().corps.date, 'veille : l\'aliment ajouté va dans ce jour'));
    await fermerF(p);
    await p.click('[data-act="aujourdhui"]');
    await p.waitForFunction(() => /Mardi 20 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal(['Banane', 'Riz cuit · 200 g'], await lignes(p), 'retour à aujourd\'hui : son journal'));
    // Recherche dans mes aliments : sans accent ni pluriel.
    await ctx.route('https://world.openfoodfacts.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"products":[]}' }));
    await ouvrirRepas(p);
    await p.fill('.nu-recherche [name="q"]', 'oeufs'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForFunction(() => !/Recherche…/.test(document.querySelector('.nu-resultats').textContent));
    pb.push(egal(['Œuf · 1 pièce | 140 kcal'], await p.evaluate(() => [...document.querySelectorAll('.nu-resultats .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'recherche « oeufs » : mon aliment « Œuf »'));
    await ctx.close();

    // Séances du Calendrier : elles font l'activité (course à pied, renforcement) ; la fenêtre de séance du Calendrier pour les ajouter ou les modifier.
    const SEANCES = () => [
      { id: ID(6), utilisateur: U, date: '2026-10-20', type: 'run', libelle: 'Footing', duree_min: 60, distance_km: 10, intensite: null, faite: false, etat: 'acceptee', origine: 'saisie', course: null },
      { id: ID(7), utilisateur: U, date: '2026-10-20', type: 'renfo', libelle: 'Gainage', duree_min: 30, distance_km: null, intensite: null, faite: false, etat: 'acceptee', origine: 'saisie', course: null },
      { id: 'seance-ia', utilisateur: U, date: '2026-10-20', type: 'run', libelle: 'Proposition', duree_min: 60, distance_km: 12, intensite: null, faite: false, etat: 'proposee', origine: 'ia', course: null },
      { id: 'seance-19', utilisateur: U, date: '2026-10-19', type: 'run', libelle: 'Sortie oubliée', duree_min: 60, distance_km: 10, intensite: null, faite: false, etat: 'acceptee', origine: 'saisie', course: null },
      { id: 'seance-18', utilisateur: U, date: '2026-10-18', type: 'run', libelle: 'Footing de dimanche', duree_min: 45, distance_km: null, intensite: 'facile', faite: true, etat: 'acceptee', origine: 'saisie', course: null }];
    d = base(); d.seances = SEANCES();
    ({ p, ctx } = await ouvrirN(d));
    const activites = () => p.locator('.nu-activites .nu-ligne-nom').allTextContents().then(l => l.map(norm));
    pb.push(egal(['2 959 kcal', ['Footing · Course à pied · 1 h · 10 km', 'Gainage · Renforcement · 30 min']], [await kcal(p), await activites()], 'séances du jour : comptées (ACSM : 10 km en 1 h ; renforcement 3 MET), sans la proposition de l\'IA'));
    await ouvrirActivite(p);
    pb.push(egal([['Footing · Course à pied · 1 h · 10 km', 'Gainage · Renforcement · 30 min'], 1], [await p.locator('.nu-feuille .nu-seances-f .nu-ligne-nom').allTextContents().then(l => l.map(norm)), await p.locator('.nu-feuille [data-act="ajout-seance"]').count()], 'feuille Activité : les séances, « Ajouter une séance », puis les autres sports'));
    // Ajouter une séance : un écran de la feuille Activité (champs de la fenêtre du Calendrier), au jour de la page.
    d.ecritures.length = 0;
    await p.click('.nu-feuille [data-act="ajout-seance"]');
    await p.waitForSelector('.nu-feuille .cal-seance');
    pb.push(egal(['Ajouter une séance', true, '2026-10-20', 'Endurance', 0, 1], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.locator('.nu-feuille .nu-retour').isVisible(), await p.inputValue('.nu-feuille [name="date"]'), await p.inputValue('.nu-feuille [name="nom"]'), await p.locator('.cal-voile').count(), await p.locator('.mc-voile').count()],
      'Ajouter une séance : un écran de la feuille (« ‹ » pour revenir), au jour de la page, sans fenêtre par-dessus'));
    // Même largeur et même hauteur d'un écran à l'autre ; le bouton qui valide en bas de la feuille.
    const cadre = () => p.evaluate(() => { const r = document.querySelector('.nu-feuille').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    const pied = () => p.evaluate(() => { const f = document.querySelector('.nu-feuille').getBoundingClientRect(), b = document.querySelector('.nu-feuille .mc-pied'); return !!b && Math.abs(b.getBoundingClientRect().bottom - f.bottom) < 2; });
    const vp0 = p.viewportSize();
    await p.setViewportSize({ width: 1280, height: 800 });
    const tailleSeance = await cadre();
    pb.push(egal([480, 640, true], [tailleSeance[0], tailleSeance[1], await pied()], 'ordinateur : feuille de 30 rem sur 40 rem, « Enregistrer » collé en bas'));
    await p.click('[data-act="retour"]');
    pb.push(egal([tailleSeance, 'Ajouter une séance', false], [await cadre(), norm(await p.locator('#nu-feuille-titre').textContent()), await p.locator('.nu-feuille .nu-retour').isVisible()], '« ‹ » : retour à la liste, feuille de la même taille'));
    await p.setViewportSize(vp0);
    await p.click('.nu-feuille [data-act="ajout-seance"]');
    {
      const vp = p.viewportSize();
      await p.setViewportSize({ width: 390, height: 844 });
      pb.push(egal([false, true, true, true], await p.evaluate(() => {
        const pan = document.querySelector('.nu-feuille').getBoundingClientRect(), champs = [...document.querySelector('.nu-feuille .cal-champs3').querySelectorAll('.mrt-champ')].map(c => Math.round(c.getBoundingClientRect().top));
        const b = document.querySelector('.nu-feuille .mc-pied').getBoundingClientRect();
        return [/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName), pan.width === innerWidth && pan.height === innerHeight, champs.length === 3 && champs.every(t => t === champs[0]), Math.abs(b.bottom - innerHeight) < 2];
      }), 'téléphone : aucun champ pris (pas de clavier), feuille plein écran, durée, distance et dénivelé alignés, « Enregistrer » en bas de l\'écran'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'seance-telephone.png') });
      await p.setViewportSize(vp);
    }
    await p.selectOption('.nu-feuille [name="nom"]', 'Fractionné'); await p.fill('.nu-feuille [name="duree"]', '40'); await p.fill('.nu-feuille [name="distance"]', '8');
    await p.click('.nu-feuille .mc-pied [type="submit"]');
    await p.waitForSelector('.nu-feuille .cal-seance', { state: 'detached' });
    await p.waitForFunction(() => /3\s539/.test(document.querySelector('.nu-kcal').textContent));
    await p.waitForFunction(() => /Fractionné/.test(document.querySelector('.nu-feuille .nu-seances-f').textContent));
    pb.push(egal([['POST', 'seances', { course: null, date: '2026-10-20', type: 'run', libelle: 'Fractionné', duree_min: 40, distance_km: 8, intensite: 'intense', faite: false, ressenti: null, sensations: null, douleur: null, douleur_ou: null, commentaire: null }], '3 539 kcal', 'Ajouter une séance'],
      [[d.ecritures[0].methode, d.ecritures[0].table, d.ecritures[0].corps], await kcal(p), norm(await p.locator('#nu-feuille-titre').textContent())], 'séance ajoutée : rangée dans le Calendrier, besoin recalculé (8 km en 40 min), retour à la liste de la feuille'));
    await fermerF(p);
    // Toucher une séance du journal : la feuille Activité s'ouvre sur cette séance ; Supprimer avec la question du site.
    d.ecritures.length = 0;
    await p.click('.nu-activites .nu-ligne:has-text("Gainage")');
    await p.waitForSelector('.nu-feuille .cal-seance');
    pb.push(egal(['Modifier la séance', 'Gainage'], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.inputValue('.nu-feuille [name="nom"]')], 'toucher une séance : « Modifier la séance », dans la feuille'));
    await p.click('.nu-feuille [data-act="supprimer"]');
    await p.click('.mrt-dialogue [data-r="oui"]');
    await p.waitForSelector('.nu-feuille .cal-seance', { state: 'detached' });
    await p.waitForFunction(() => !/Gainage/.test(document.querySelector('.nu-activites').textContent));
    pb.push(egal(['DELETE', 'seances', '?id=eq.' + ID(7)], [d.ecritures[0].methode, d.ecritures[0].table, d.ecritures[0].filtres], 'séance supprimée dans le Calendrier depuis Nutrition'));
    await fermerF(p);
    // La veille : une séance non faite ne compte pas ; cochée « faite », elle compte.
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Lundi 19 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal(['2 117 kcal', ['Sortie oubliée · Course à pied · 1 h · 10 km'], 'non faite'], [await kcal(p), await activites(), norm(await p.locator('.nu-activites .nu-ligne-k').textContent())], 'la veille : la séance non faite ne compte pas'));
    d.ecritures.length = 0;
    await p.click('.nu-activites .nu-faite');
    await p.waitForSelector('.cal-feuille-retour'); await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' });
    await p.waitForFunction(() => /2\s854/.test(document.querySelector('.nu-kcal').textContent));
    pb.push(egal([['PATCH', 'seances', { faite: true }, '?id=eq.seance-19'], '2 854 kcal'], [[d.ecritures[0].methode, d.ecritures[0].table, d.ecritures[0].corps, d.ecritures[0].filtres], await kcal(p)], 'cochée « faite » : rangée dans le Calendrier, elle compte'));
    // Sans distance : la vitesse vient de l'intensité et de la VMA ; sans VMA, 9,5 km/h.
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Dimanche 18 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal('2 645 kcal', await kcal(p), 'sans distance ni VMA : 9,5 km/h'));
    await ctx.close();
    d = base(); d.seances = SEANCES(); d.profil_entrainement = [{ utilisateur: d.profils[0].id, vma: 15 }]; // la VMA de Mon profil
    ({ p, ctx } = await ouvrirN(d));
    await p.click('[data-act="veille"]'); await p.waitForFunction(() => /Lundi/.test(document.querySelector('.nu-jour-t').textContent));
    await p.click('[data-act="veille"]'); await p.waitForFunction(() => /Dimanche 18 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal('2 657 kcal', await kcal(p), 'sans distance, VMA 15 : facile, 65 % de la VMA'));
    await ctx.close();

    // Bloc d'En un coup d'œil : deuxième, quand Nutrition est dans le menu ; bilan, trois jauges simplifiées sur une ligne, lien « Détail → ».
    d = base(); d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Nutrition'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    await p.waitForSelector('.nu-ac-bilan');
    if (CAPTURES) await p.locator('[data-bloc="nutrition"]').screenshot({ path: path.join(__dirname, 'captures', 'accueil-nutrition.png') });
    pb.push(egal('nutrition', await p.evaluate(() => document.querySelectorAll('[data-bloc]:not([data-bloc="premiers"])')[2].dataset.bloc), 'Accueil : le bloc Nutrition en deuxième position (après « Aujourd\'hui » et la prochaine course)'),
      egal(['350 / 2 117 kcal', ['p|sous|6 g|Reste 92 g', 'g|sous|76 g|Reste 189 g', 'l|sous|1 g|Reste 58 g']],
        [norm(await p.locator('.nu-ac-bilan').textContent()), await p.evaluate(() => [...document.querySelectorAll('.nu-ac-anneaux .nu-jauge')].map(j => [j.dataset.jauge, j.dataset.etat, j.querySelector('.nu-anneau-v').textContent, j.querySelector('.nu-jauge-reste').textContent].join('|').replace(/\s+/g, ' ')))], 'Accueil : bilan du jour, puis protéines, glucides, lipides en anneaux avec « Reste »'),
      egal([0, 1], await p.evaluate(() => { const t = [...document.querySelectorAll('.nu-ac-anneaux .nu-jauge')].map(j => Math.round(j.getBoundingClientRect().top)); return [t[2] - t[0], new Set(t).size]; }), 'Accueil : les trois anneaux sur une ligne, téléphone compris'),
      egal(0, await p.locator('[data-bloc="nutrition"] .mrt-pastille').count(), 'Accueil : plus d\'aliments en pastilles'),
      egal(['Détail', 'nutrition.html', false], await p.evaluate(() => { const a = document.querySelector('[data-bloc="nutrition"] .ac-titre a'); return [a.textContent, a.getAttribute('href'), a.classList.contains('mrt-btn')]; }), 'Accueil : « Détail → », lien de titre comme « Feuille de route → »'),
      egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Accueil : pas de débordement horizontal'));
    await ctx.close();
    d = base();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    pb.push(egal(0, await p.locator('[data-bloc="nutrition"]').count(), 'Accueil : pas de bloc Nutrition quand le module n\'est pas au menu'));
    await ctx.close();
    d = base(); d.preferences[0].modules = ['En un coup d\'œil', 'Nutrition']; d.profils[0].poids = null;
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    pb.push(egal('Complète ton profil sur la page Nutrition.', norm(await p.locator('[data-bloc="nutrition"] .ac-vide').textContent()), 'Accueil : profil incomplet'));
    await ctx.close();
    // Saisies rapides d'En un coup d'œil : ?ajout=repas ou ?ajout=activite ouvre la feuille d'emblée, l'adresse est nettoyée.
    for (const [q, sel] of [['repas', '.nu-feuille .nu-source, .nu-feuille .nu-recherche'], ['activite', '.nu-feuille .nu-sport-l']]) {
      const o = await ouvrir(nav, 'nutrition.html?ajout=' + q, 1200, base(), {}, {});
      await o.p.waitForSelector('.nu-feuille ' + (q === 'repas' ? '.nu-ajout' : '.nu-sport-l'));
      pb.push(egal([1, false], [await o.p.locator('.nu-feuille').count(), /ajout=/.test(o.p.url())], '?ajout=' + q + ' : la feuille s\'ouvre aussitôt, adresse nettoyée'));
      await o.ctx.close();
    }
    return pb;
  },
  // Guide (module-guide-specification.md, § 4) : l'article de lecture, module facultatif en toute fin du menu, connexion requise.
  async guide(nav, db0) {
    const pb = [];
    // Coché (menu enregistré) : le dernier onglet, actif sur sa page.
    const db = JSON.parse(JSON.stringify(db0)); db.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Calendrier', 'Palmarès', 'Guide'];
    for (const w of [1200, 375]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'guide.html', w, db, {}, PARIS);
      const r = await p.evaluate(() => {
        const h1 = [...document.querySelectorAll('h1')];
        return {
          masquee: document.documentElement.classList.contains('mrt-attente'),
          titre: document.title, robots: (document.querySelector('meta[name="robots"]') || {}).content,
          h1: h1.map(h => h.textContent.trim()), h1Invisible: h1.every(h => h.classList.contains('mrt-sr') && h.getBoundingClientRect().width <= 1),
          visible: (document.querySelector('.gd-titre') || {}).textContent,
          parties: [...document.querySelectorAll('.gd-partie-titre')].map(h => h.textContent.trim()),
          menu: !!document.querySelector('.mrt-nav'), onglet: [...document.querySelectorAll('.mrt-tab')].filter(t => /guide/i.test(t.textContent + (t.getAttribute('href') || ''))).length,
          ongletActif: document.querySelectorAll('.mrt-tab.is-on').length, dernier: ([...document.querySelectorAll('.mrt-tab')].pop() || {}).textContent,
          frises: [...document.querySelectorAll('.gd-frise')].map(f => f.children.length), jours: [...document.querySelectorAll('.gd-jours')].map(f => f.children.length),
          deroules: document.querySelectorAll('.gd-partie details.mrt-deroule').length, ouverts: document.querySelectorAll('.gd-partie details[open]').length,
          tuVous: /(?<![\p{L}-])(tu|toi|ton|ta|tes|vous|votre|vos)(?![\p{L}-])/iu.test(document.querySelector('main').textContent),
          sources: [...document.querySelectorAll('#sources a[href^="http"]')].every(a => a.target === '_blank' && /noopener/.test(a.rel)),
          debordement: document.documentElement.scrollWidth > innerWidth
        };
      });
      pb.push(egal({ masquee: false, titre: 'Guide · MyRunTools', robots: 'noindex', h1: ['Guide'], h1Invisible: true, visible: 'Du plan à l\'assiette',
        parties: ['Construire le plan', 'Bien manger pour courir', 'Nos sources et leurs limites'], menu: true, onglet: 1, ongletActif: 1, dernier: 'Guide',
        frises: [27, 16], jours: [6, 41], deroules: 3, ouverts: 0, tuVous: false, sources: true, debordement: false }, r, 'guide (' + w + ' px)'));
      pb.push(egal([], erreurs, 'guide (' + w + ' px) : erreurs JavaScript'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'guide-' + w + '.png'), fullPage: true });
      if (w === 375) {
        // Un déroulé ouvert (tableau de la Préparatoire conseillée) : rien ne dépasse non plus.
        await p.locator('.gd-partie details.mrt-deroule > summary').nth(1).click();
        await p.clock.runFor(600);
        pb.push(egal([true, false], await p.evaluate(() => [document.querySelectorAll('.gd-partie details.mrt-deroule')[1].open, document.documentElement.scrollWidth > innerWidth]),
          'guide (375 px) : déroulé ouvert, sans débordement'));
      }
      await ctx.close();
    }
    // Menu par défaut (rien d'enregistré) : facultatif, pas d'onglet ; « Pour aller plus loin » le propose.
    {
      const o = await ouvrir(nav, 'calendrier.html', 1200, db0, {}, PARIS);
      pb.push(egal(0, await o.p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].filter(t => /guide/i.test(t.getAttribute('href') || '')).length), 'guide : facultatif, absent du menu par défaut'));
      await o.ctx.close();
    }
    // Sans session : renvoi vers la connexion.
    const ctx = await nav.newContext();
    await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    await simulerBase(ctx, db0);
    const p = await ctx.newPage();
    await p.goto(RACINE + 'guide.html');
    pb.push(egal(true, await p.waitForURL(/connexion\.html/, { timeout: 5000 }).then(() => true, () => false), 'guide sans session : renvoi vers la connexion'));
    await ctx.close();
    return pb;
  },
  // Repasse d'uniformité (design, § 1 et 3) : tailles de l'échelle, libellés en graisse normale, « 1er », confirmations du site,
  // zones de toucher, contrastes de l'Alerte et du Texte discret, espaces insécables.
  async uniformite(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const ECHELLE = ['10.4px', '11.2px', '12px', '12.8px', '13.6px', '16px'];
    // Hors échelle permis : l'en-tête, le titre d'une page (1,4 à 2 rem) et les grands chiffres d'un résultat.
    const tailles = p => p.evaluate(() => {
      const vu = new Set();
      document.querySelectorAll('main *, .mc-panneau *, .mrt-barre *, .mrt-nav *').forEach(e => {
        if (!e.getClientRects().length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        if (e.closest('.mrt-header, .pc-titre, .pc-grand, .st-grand, .nu-kcal-val, .gd-titre, .connexion h1, .ml h1, .leaflet-container')) return;
        vu.add(getComputedStyle(e).fontSize);
      });
      return [...vu].sort();
    });
    for (const [page, quoi] of [['index.html', 'Accueil'], ['objectif.html', 'Objectif'], ['course.html?id=' + id(3), 'page d\'une course'], ['palmares.html', 'Palmarès'],
      ['calendrier.html', 'Calendrier'], ['calendrier.html#mois', 'Calendrier, Mois'], ['calendrier.html#annee', 'Calendrier, Année'], ['courses-a-surveiller.html?vue=tout', 'Courses'], ['preferences.html', 'Préférences'], ['nutrition.html', 'Ma nutrition'], ['guide.html', 'Guide'], ['stats.html', 'Mes stats']]) {
      for (const w of [1200, 390]) {
        const o = await ouvrir(nav, page, w, db, {}, PARIS);
        if (page.startsWith('course.html')) await o.p.waitForSelector('.mc-panneau .pc-titre');
        const hors = (await tailles(o.p)).filter(t => !ECHELLE.includes(t));
        pb.push(egal([], hors, quoi + ' (' + w + ' px) : tailles de texte hors de l\'échelle'));
        pb.push(egal([], o.erreurs, quoi + ' (' + w + ' px) : erreurs JavaScript'));
        await o.ctx.close();
      }
    }
    // Libellés et en-têtes de colonnes : Space Mono, graisse normale.
    let o = await ouvrir(nav, 'palmares.html', 1200, db, {}, PARIS);
    pb.push(egal(['400'], await o.p.evaluate(() => [...new Set([...document.querySelectorAll('th, .ob-lib')].map(e => getComputedStyle(e).fontWeight))]), 'en-têtes de colonnes en graisse normale'));
    // Lien d'action et crayon : zone de toucher de 2 rem au moins (marge invisible).
    await o.ctx.close();
    o = await ouvrir(nav, 'preferences.html', 390, db, {}, PARIS, { mobile: true });
    await o.p.click('#bloc-menu .pref-reorg');
    pb.push(egal(true, await o.p.evaluate(() => { const l = document.querySelector('.pref-defaut'); l.scrollIntoView({ block: 'center' }); const r = l.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top - 5) === l && document.elementFromPoint(r.left + r.width / 2, r.bottom + 5) === l; }), 'lien d\'action : zone de toucher débordant de son texte'));
    await o.ctx.close();
    // « 1er » dans Mon plan (Trail de la Forêt, 1er juillet) ; « + » d'une séance : le petit rond commun, dessiné ; aucune fenêtre du navigateur.
    o = await ouvrir(nav, 'preparation.html', 1200, db, {}, PARIS);
    await o.p.waitForSelector('.ps-frise-defile');
    const natif = []; o.p.on('dialog', d => { natif.push(d.message()); d.dismiss(); });
    pb.push(egal([true, true], await o.p.evaluate(() => { const t = [...document.querySelectorAll('.ps-sem-d')].map(e => e.textContent);
      return [t.length > 0 && t.every(x => /^\d\d\/\d\d$/.test(x)), [...document.querySelectorAll('.cal-plus')].every(b => b.classList.contains('mrt-rond') && b.classList.contains('is-petit') && !!b.querySelector('svg'))]; }),
      'Mon plan, frise : la date de chaque semaine en JJ/MM ; « + » en petit rond commun dessiné'));
    await o.ctx.close();
    o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    o.p.on('dialog', d => { natif.push(d.message()); d.dismiss(); });
    pb.push(egal([true, true], await o.p.evaluate(() => [!!document.querySelector('.pc-fermer svg.mrt-ico'), document.querySelector('.pc-fermer').textContent.trim() === '']), 'croix dessinée, sans caractère tapé'));
    await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.fill('#fc-lieu', 'Ailleurs');
    await o.p.click('.fc-barre [data-fc="annuler"]');
    pb.push(egal(['Abandonner les modifications ?', []], [await repondre(o.p, false), natif], 'Annuler après une saisie : confirmation du site, aucune fenêtre du navigateur'));
    await o.ctx.close();
    // Espace insécable devant « ? » et « : » (posée à l'affichage), jamais dans un champ.
    o = await ouvrir(nav, 'course.html?id=' + id(1), 390, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal([true, true], await o.p.evaluate(() => [document.querySelector('.pr-avis-r').textContent.includes('conseillé\u00a0: '), !/\u00a0/.test(document.querySelector('.pr-avis-r').textContent.replace(/conseillé\u00a0: /g, ''))]),
      'préparation : « conseillé : » insécable devant les deux-points, rien d\'autre de changé'));
    await o.ctx.close();
    // Contrastes (WCAG, petit texte 4,5) : Alerte et Texte discret sur le fond des cadres, Texte discret sur une case du Calendrier, dans chaque thème.
    o = await ouvrir(nav, 'calendrier.html', 1200, db, {}, PARIS);
    const contrastes = await o.p.evaluate(() => {
      const lum = c => { const k = /^color\(/.test(c) ? 1 : 255; const m = c.replace(/^color\(srgb/, '').match(/[\d.]+/g).map(Number).slice(0, 3).map(x => { x /= k; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const i = document.createElement('i'); document.body.appendChild(i);
      const c = v => { i.style.color = v; return getComputedStyle(i).color; };
      const out = {};
      for (const t of ['bleu-orange', 'vert-rose', 'violet-turquoise', 'blanc-orange', 'noir-orange']) {
        window.appliquerTheme(t);
        const v = n => c('var(--' + n + ')');
        out[t] = [cr(v('red'), v('surface')) >= 4.5, cr(v('muted'), v('surface')) >= 4.5, cr(v('muted'), v('case')) >= 4.5, cr(v('bord-champ'), v('surface')) >= 2.3];
      }
      return out;
    });
    const tous = [true, true, true, true];
    pb.push(egal({ 'bleu-orange': tous, 'vert-rose': tous, 'violet-turquoise': tous, 'blanc-orange': tous, 'noir-orange': tous }, contrastes,
      'contrastes : Alerte, Texte discret (cadre et case du Calendrier), contour des champs, dans les cinq thèmes'));
    await o.ctx.close();
    return pb;
  },
  // Outils et services (docs/outils-et-services.md, § 5) : chaque adresse externe appelée par le code est listée dans le document,
  // et aucune clé secrète n'est versionnée. Contrôle sans navigateur ; les liens d'articles cités comme sources (Guide, avis des courses) sont exclus.
  async outilsServices() {
    const pb = [], { execSync } = require('child_process');
    const racine = path.resolve(__dirname, '../..');
    const doc = fs.readFileSync(path.join(racine, 'docs/outils-et-services.md'), 'utf8');
    // Domaine « racine » d'une adresse : ses deux derniers éléments (tuile.opentopomap.org → opentopomap.org).
    const domaine = h => h.replace(/^\*\./, '').split('.').slice(-2).join('.');
    const documentes = new Set([...doc.matchAll(/`([^`\s]+)`/g)].map(m => m[1].replace(/^https?:\/\//, '').split(/[\/ ]/)[0]).filter(h => /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(h)).map(domaine));
    const fichiers = execSync('git ls-files', { cwd: racine, encoding: 'utf8' }).split('\n').filter(Boolean);
    const code = f => (/^(composants\/[^/]+\.js|donnees\/supabase\.js|supabase\/functions\/.+\.ts|[^/]+\.html)$/.test(f)) && f !== 'guide.html' && f !== 'composants/preparation.js';
    const absents = new Set();
    for (const f of fichiers.filter(code)) {
      for (const m of fs.readFileSync(path.join(racine, f), 'utf8').matchAll(/https?:\/\/(\{s\}\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi)) {
        const d = domaine(m[2].toLowerCase());
        if (d === 'example.org' || d === 'w3.org' || d === 'myruntools.fr') continue;
        if (!documentes.has(d)) absents.add(d + ' (' + f + ')');
      }
    }
    pb.push(egal([], [...absents].sort(), 'adresses externes du code : toutes listées dans outils-et-services.md'));
    pb.push(egal(true, ['supabase.co', 'cloudflare.com', 'openfoodfacts.org', 'opentopomap.org', 'github.com', 'ovh.com', 'resend.com', 'platform.claude.com'].every(d => documentes.has(domaine(d))),
      'le document nomme GitHub, OVH, Supabase, Resend, Cloudflare, Anthropic, Open Food Facts et OpenTopoMap'));
    // Aucune clé secrète dans les fichiers versionnés.
    const SECRETS = [/sk-ant-[A-Za-z0-9_-]{20,}/, /sb_secret_[A-Za-z0-9_-]{10,}/, /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\./];
    const fuites = [];
    for (const f of fichiers) {
      if (/\.(png|jpe?g|gif|ico|woff2?|pdf)$/i.test(f) || f.startsWith('outils/essais/package-lock')) continue;
      let t; try { t = fs.readFileSync(path.join(racine, f), 'utf8'); } catch (e) { continue; }
      if (SECRETS.some(r => r.test(t))) fuites.push(f);
    }
    pb.push(egal([], fuites, 'aucune clé secrète (Anthropic, Supabase) dans les fichiers versionnés'));
    return pb;
  },
  // Repasse de vocabulaire (design, § 12 « Glossaire ») : une notion = un mot. Les anciens mots n'apparaissent plus dans aucun texte
  // affiché (libellés, boutons, infobulles, champs) ; le nom de l'onglet ouvert est celui du titre de la page.
  async vocabulaire(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const INTERDITS = [/(Objectif (&|&amp;) plan|Plan (&|&amp;) objectifs)/, /Feuille de route/, /Périodicité/, /Déjà couru/, /Musculation/, /Effacer/, /Rétablir/, /Recalculer/, /Créer/,
      /[Cc]andidat/, /\bprépa\b/i, /[Pp]lan de saison/, /Saison :/, /\b(mon|ton|son|ta|sa) site\b/i, /\bsite (de|partagé)\b/, /Sauvegarder/, /Éditer/, /Sorties par/, /Renforcements par/,
      /^Dossard$/i, /^Cap$/, /Mes mesures/, /Mon profil de coureur/, /^Modifier$/, /Fermer la fiche/, /Plans des courses/, /dans Préparation/,
      // Courses (glossaire) : le statut s'appelle « Repérée », les vues « À surveiller » et « À venir » n'existent plus.
      /À surveiller/, /Courses à surveiller/, /^À venir( \d+)?$/,
      // Menu de parcours (23 nov. 2026) : Les courses, Ma saison, Ma nutrition, Mon palmarès.
      /Mes courses/, /\b(dans|de|vers|à|sur) (la )?Saison\b/,
      // Repasse de cohérence (21 nov. 2026) : la période vers un Objectif s'appelle « préparation » (Saison reste le nom de la page) ;
      // Allègement, Décrassage, Ressenti, Pourquoi cette course, Régler les phases, Séance (Nutrition), Espaces partagés, Préférences.
      /\bsaisons? de \d/, /Courses de la saison/, /\bhors saison\b/, /inter-saison/, /Préparer une saison/, /Deload/, /Paramétrer le plan/, /Rôle dans la préparation/,
      /Course de préparation/, /Course en option/, /Retour sur la séance/, /Préférences utilisateur/, /\bSites? partagés?\b/, /\bJ-\d{2,}/, /plus longue sortie/i,
      /Ajouter une activité/, /Supprimer cette activité/, /^Activité$/, // « activité » : seulement pour l'import (Mes stats) et « Activité hors sport » /^Renfo$/, /^Réc\.$/, /^à noter$/, /course principale/, /^Ajouter$/,
      // Flèches : dessinées (mrtIcone), jamais tapées.
      /[→←↑▲↻]/];
    const textes = p => p.evaluate(() => {
      const out = new Set();
      document.querySelectorAll('h1,h2,h3,h4,summary,button,a,label,legend,option,th,[aria-label],[title],[placeholder]').forEach(e => {
        if (e.closest('.leaflet-container')) return;
        [e.childElementCount ? '' : e.textContent, e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].forEach(t => { t = (t || '').replace(/\s+/g, ' ').trim(); if (t) out.add(t); });
        if (e.childElementCount && /^(H[1-4]|SUMMARY|BUTTON|A|LABEL|LEGEND|TH)$/.test(e.tagName)) out.add(e.textContent.replace(/\s+/g, ' ').trim());
      });
      // Et tout texte visible de la page (paragraphes, cartes, encarts), hors carte du tracé.
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const el = n.parentElement, t = n.textContent.replace(/\s+/g, ' ').trim();
        if (t && el && !el.closest('script, style, .leaflet-container') && el.getClientRects().length) out.add('§' + t); } // § : texte courant (pas un libellé ni un bouton)
      return [...out];
    });
    const interdits = async (p, quoi) => {
      // Dossard, Cap, Modifier : interdits seulement comme libellé de bloc ou bouton, permis dans le texte courant (« Dossard » devant son numéro).
      const SEULS_LIBELLES = [/^Dossard$/i, /^Cap$/, /^Modifier$/].map(String);
      const trouves = (await textes(p)).filter(t => INTERDITS.some(r => (t[0] === '§' ? !SEULS_LIBELLES.includes(String(r)) && r.test(t.slice(1)) : r.test(t))));
      pb.push(egal([], trouves, quoi + ' : aucun ancien mot dans les textes affichés'));
    };
    const PAGES = [['index.html', 'En un coup d\'œil'], ['objectif.html', 'Ma saison'], ['calendrier.html', 'Calendrier'], ['calendrier.html#mois', 'Calendrier, Mois'],
      ['courses-a-surveiller.html?vue=tout', 'Les courses'], ['palmares.html', 'Mon palmarès'], ['preferences.html', 'Préférences'], ['preparation.html', 'Mon plan'], ['profil.html', 'Mon profil'],
      ['nutrition.html', 'Ma nutrition'], ['guide.html', 'Guide'], ['stats.html', 'Mes stats'], ['course.html?id=' + id(3), 'page d\'une course']];
    for (const [page, quoi] of PAGES) {
      for (const w of [1200, 390]) {
        const o = await ouvrir(nav, page, w, db, {}, PARIS);
        if (page.startsWith('course.html')) await o.p.waitForSelector('.mc-panneau .pc-titre');
        await interdits(o.p, quoi + ' (' + w + ' px)');
        if (w === 1200) {
          // L'onglet de la page ouverte porte le nom du titre de la page.
          const [onglet, titre] = await o.p.evaluate(() => [(document.querySelector('.mrt-tab.is-on') || {}).textContent, document.title.split(' · ')[0]]);
          // Page hors du menu (Mon plan et Nutrition ne sont pas cochés dans les données fictives) : son onglet, actif, au bout de la barre.
          if (/^(preparation|nutrition)\.html/.test(page)) pb.push(egal([quoi, true], await o.p.evaluate(() => { const t = [...document.querySelectorAll('.mrt-tab')]; const on = document.querySelector('.mrt-tab.is-on');
            return [on && on.textContent.trim(), t[t.length - 1] === on]; }), quoi + ' : hors du menu, son onglet actif s\'ajoute au bout'));
          if (onglet && !page.startsWith('course.html') && !page.startsWith('index')) pb.push(egal(titre, onglet.trim(), quoi + ' : onglet et titre de page identiques'));
          // Un seul titre de page (h1) : celui de l'onglet, invisible sauf pour les lecteurs d'écran (design, § 3).
          const h1 = await o.p.evaluate(() => [...document.querySelectorAll('h1')].map(h => h.textContent.trim()));
          pb.push(egal(1, h1.length, quoi + ' : un seul titre de page (h1)'));
          if (onglet && !page.startsWith('course.html') && !page.startsWith('index')) pb.push(egal(titre, h1[0], quoi + ' : titre de page et onglet identiques'));
        }
        await o.ctx.close();
      }
    }
    // Libellés des boutons communs, identiques partout : relevés sur chaque page et dans les feuilles (séance, phases, fiche).
    const boutons = p => p.evaluate(() => [...document.querySelectorAll('.mrt-btn, .mrt-rond, .mrt-lien')].filter(b => b.getClientRects().length)
      .map(b => ({ cls: b.className, t: b.textContent.replace(/\s+/g, ' ').trim(), a: b.getAttribute('aria-label') || '' })));
    const releves = [];
    for (const [page, action] of [['calendrier.html', p => p.click('[data-edit="se-v"]')], ['calendrier.html', p => p.click('[data-ajout]')],
      ['preparation.html', p => reglage(p, '[data-preparer]')], ['objectif.html', p => p.click('[data-ob="ajouter"]')], ['palmares.html', null], ['preferences.html', null], ['index.html', null]]) {
      const d = JSON.parse(JSON.stringify(db)); d.seances = [{ id: 'se-v', utilisateur: d.profils[0].id, date: '2026-10-20', type: 'run', libelle: 'Endurance', faite: false, course: null }];
      const q = await ouvrir(nav, page, 1200, d, {}, PARIS);
      if (action) { await action(q.p); await q.p.waitForTimeout(300); await interdits(q.p, page + ', feuille ouverte'); }
      releves.push(...(await boutons(q.p)).map(b => Object.assign(b, { page })));
      await q.ctx.close();
    }
    const FIXES = { Annuler: /^annul/i, Enregistrer: /^(enregistr|sauvegard|valider$)/i, Fermer: /^fermer$/i, Exporter: /^export/i };
    const ecarts = releves.filter(b => Object.entries(FIXES).some(([mot, r]) => (r.test(b.t) && b.t !== mot) || (r.test(b.a) && b.a !== mot && b.a !== mot + ' :')));
    pb.push(egal([], ecarts.map(b => b.page + ' « ' + (b.t || b.a) + ' »'), 'boutons communs : « Annuler », « Enregistrer », « Fermer », « Exporter » écrits pareil partout'));
    pb.push(egal([], releves.filter(b => /is-danger/.test(b.cls) && !/^Supprimer\b/.test(b.t)).map(b => b.page + ' « ' + b.t + ' »'), 'bouton danger : toujours « Supprimer … »'));
    pb.push(egal([], releves.filter(b => /is-fermer/.test(b.cls) && b.a !== 'Fermer').map(b => b.page + ' « ' + b.a + ' »'), 'croix : toujours « Fermer »'));
    pb.push(egal([], releves.filter(b => /is-principal/.test(b.cls) && /\s[…:]$|\.$/.test(b.t)).map(b => b.page + ' « ' + b.t + ' »'), 'bouton principal : sans « … », « : » ni point final'));
    // La fiche d'une course (modification) et sa confirmation d'abandon.
    const o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await interdits(o.p, 'fiche d\'une course');
    await o.p.fill('#fc-lieu', 'Ailleurs');
    await o.p.click('.fc-barre [data-fc="annuler"]');
    await o.p.waitForSelector('.mrt-dialogue');
    pb.push(egal(['Continuer', 'Abandonner'], await o.p.locator('.mrt-dialogue-boutons button').allTextContents(), 'abandon d\'une saisie : « Continuer » / « Abandonner », jamais deux « Annuler »'));
    await o.ctx.close();
    return pb;
  },
  // Panneau des boutons (design, § 11) : sept boutons, un sens chacun. Sur chaque page et ses feuilles : aucun bouton hors des classes
  // communes (ou des éléments qui ne sont pas des boutons : cartes, cases, tuiles, titres repliables) ; un seul principal visible ;
  // « Supprimer … » en danger, seul en bas de sa fenêtre ; une pastille ne mène nulle part ; le petit rond n'ajoute qu'une séance.
  async boutons(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const COMMUNS = /\bmrt-(btn|rond|lien|pastille|choix|tri|gear|barre-cap|tab|menu-l)\b/;
    const AUTRES = /\b(mg-titre|mg-pt|fc-bloc-titre|cal-carte-txt|cal-se-txt|cal-m2-txt|cal-m2-course|cal-v-course|cal-v-rdv|cal-voisin|ob-carte|ps-sem|ps-choix|ps-ligne-q|is-precedente|is-suivante|ob-ins|pc-lieu|nu-ligne|nu-aliment|cal-info|cal-a-j|cal-y-j)\b/;
    const releve = p => p.evaluate(([c, a]) => {
      const COM = new RegExp(c), AUT = new RegExp(a);
      const vis = e => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.opacity !== '0'; };
      const dessus = e => { const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight) return true; const t = document.elementFromPoint(x, y); return !t || e.contains(t) || t.contains(e); };
      const nom = e => (e.textContent.replace(/\s+/g, ' ').trim() || e.getAttribute('aria-label') || '').slice(0, 40);
      const tous = [...document.querySelectorAll('button, a[class], [role=button]')].filter(e => vis(e) && !e.closest('.mrt-nav, .leaflet-container, [role=menu], .mrt-dialogue, header'));
      const horsClasse = tous.filter(e => !COM.test(e.className) && !AUT.test(e.className) && !(e.tagName === 'A' && !e.className.trim())).map(e => e.tagName.toLowerCase() + '.' + e.className.trim().split(/\s+/).join('.') + ' « ' + nom(e) + ' »');
      const principaux = tous.filter(e => /\bis-principal\b/.test(e.className) && dessus(e)).map(nom);
      const dangers = tous.filter(e => /\bis-danger\b/.test(e.className) && /\bmrt-btn\b/.test(e.className)).map(e => {
        const zone = e.closest('.mc-panneau, .cal-fenetre, .mrt-fenetre, form') || document.body, bas = e.getBoundingClientRect().top;
        const apres = [...zone.querySelectorAll('button, a')].filter(x => x !== e && vis(x) && x.getBoundingClientRect().top > bas + 2 && !x.closest('.fc-bloc')).length;
        return [nom(e), /^Supprimer\b/.test(nom(e)), apres === 0];
      });
      const pastillesLiens = tous.filter(e => e.tagName === 'A' && /\bmrt-pastille\b/.test(e.className)).map(nom);
      const petits = tous.filter(e => /\bis-petit\b/.test(e.className) && !e.hasAttribute('data-ajout')).map(e => nom(e));
      return { horsClasse: [...new Set(horsClasse)], principaux, dangers, pastillesLiens, petits };
    }, [COMMUNS.source, AUTRES.source]);
    const avec = d => { d = JSON.parse(JSON.stringify(d)); const moi = d.profils[0].id;
      d.seances = [{ id: 'se-b', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Endurance', faite: false, course: null }];
      d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Préparation', 'Calendrier', 'Nutrition', 'Courses à surveiller', 'Palmarès', 'Profil']; return d; };
    // Mes stats avec des séances faites : tableaux, tuiles et graphiques ; une analyse enregistrée.
    const statsPleine = d => { const moi = d.profils[0].id; d.profils[0].fc_repos = 52; d.profil_entrainement = [{ utilisateur: moi, vma: 15, fc_max: 186 }];
      d.seances.push({ id: 'se-f1', utilisateur: moi, date: '2026-09-12', type: 'run', libelle: 'Sortie longue', faite: true, distance_reelle_km: 20, duree_reelle_min: 130, denivele_reel_m: 600, fc_moyenne: 145 },
        { id: 'se-f2', utilisateur: moi, date: '2026-10-15', type: 'run', libelle: 'Endurance', faite: true, distance_reelle_km: 12, duree_reelle_min: 60, denivele_reel_m: 60, fc_moyenne: 152 });
      d.activites = [{ id: 'ac-1', utilisateur: moi, seance: 'se-f2', pratique: 'course', cadence: 170, meilleurs: { 1000: 300, 5000: 1500, 10000: 3000 }, date: '2026-10-15' }];
      d.analyses_stats = [{ id: 'an-1', utilisateur: moi, cree: '2026-10-19T08:00:00Z', motif: 'import', texte: 'Analyse enregistrée.' }];
      d.preferences[0].modules = d.preferences[0].modules.concat(['Stats']); return d; };
    const ECRANS = [['index.html'], ['objectif.html'], ['objectif.html', p => p.click('[data-ob="ajouter"]'), 'fiche, ajout'], ['course.html?id=' + id(3)],
      ['course.html?id=' + id(3), p => p.click('[data-ob="modifier"]'), 'fiche, modification'], ['calendrier.html'], ['calendrier.html#mois'], ['calendrier.html#annee'],
      ['calendrier.html', p => p.click('[data-edit="se-b"]'), 'séance'], ['courses-a-surveiller.html'], ['palmares.html'], ['preferences.html'], ['preparation.html'],
      ['preparation.html', p => reglage(p, '[data-preparer]'), 'phases'], ['profil.html'], ['nutrition.html'], ['guide.html'],
      ['stats.html', null, 'vide'], ['stats.html', null, 'avec séances', statsPleine], ['stats.html', p => p.click('.st-haut [data-importer]'), 'import', statsPleine]];
    for (const [page, action, quoi, prep] of ECRANS) for (const w of [1200, 390]) {
      const o = await ouvrir(nav, page, w, prep ? prep(avec(db)) : avec(db), {}, Object.assign({}, PARIS, { mobile: w < 500 }));
      if (/^course\.html/.test(page)) await o.p.waitForSelector('.mc-panneau .pc-titre');
      if (action) { await action(o.p); await o.p.waitForTimeout(400); }
      const r = await releve(o.p), nom = page + (quoi ? ' · ' + quoi : '') + ' (' + w + ' px)';
      pb.push(egal([], r.horsClasse, nom + ' : aucun bouton hors du panneau'));
      pb.push(egal(true, r.principaux.length <= 1, nom + ' : un seul bouton principal visible (' + r.principaux.join(', ') + ')'));
      pb.push(egal([], r.dangers.filter(d => !d[1] || !d[2]).map(d => d[0]), nom + ' : « Supprimer … », seul en bas'));
      pb.push(egal([], r.pastillesLiens, nom + ' : une pastille ne mène nulle part'));
      pb.push(egal([], r.petits, nom + ' : le petit rond n\'ajoute qu\'une séance'));
      pb.push(egal([], o.erreurs, nom + ' : erreurs JavaScript'));
      await o.ctx.close();
    }
    return pb;
  },
  async affichage(nav, db) {
    const pb = [];
    for (const [nom, w] of Object.entries(LARGEURS))
      for (const page of ['index.html', 'palmares.html', 'preferences.html', 'objectif.html', 'calendrier.html', 'course.html?id=00000000-0000-0000-0001-000000000020', 'courses-a-surveiller.html', 'nutrition.html', 'profil.html', 'guide.html', 'stats.html'])
        pb.push(...await sansSaut(nav, db, page, w, page.replace(/\.html.*/, '') + ' ' + nom));
    return pb;
  },
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
    if (CAPTURES) { await o.p.selectOption('[data-periode]', '12mois'); await o.p.screenshot({ path: path.join(__dirname, 'captures', 'stats.png'), fullPage: true }); }
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
  // Logistique d'une course (module-logistique-specification.md, § 6) : logement, transport, total, matos, jour J, Mon matériel, partage.
  async logistique(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id, GORGES = id(3);
    // Catalogue de départ (en base fictive) et deux équipements.
    const art = (n, nom, categorie) => ({ id: 'art-' + n, utilisateur: moi, nom, categorie, ordre: n });
    db.materiel_catalogue = [art(1, 'Frontale', 'Sécurité'), art(2, 'Sifflet', 'Sécurité'), art(3, 'Veste pluie', 'Vêtements'), art(4, 'Chaussures', 'Porté'), art(5, 'Save bank', 'Électronique')];
    db.equipements = [{ id: 'eq-ch', utilisateur: moi, type: 'chaussures', marque: 'Salomon', modele: 'Speedcross', surnom: 'les rouges', km_depart: 120, km_limite: 800, actif: true },
      { id: 'eq-fr', utilisateur: moi, type: 'frontale', marque: 'Petzl', modele: 'Actik', surnom: null, km_depart: 0, km_limite: null, actif: true }];
    db.logements = []; db.trajets = []; db.course_materiel = [];
    const attr = p => p.evaluate(() => document.querySelector('#logistique').getAttribute('data-total'));
    const texte = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.replace(/\s+/g, ' ').trim()), sel);
    const attendre = async p => { await pause(); };

    let o = await ouvrir(nav, 'course.html?id=' + GORGES, 1200, db, {}, PARIS);
    await o.p.click('#logistique > summary');
    pb.push(egal(['Logement Ajouter', 'Transport Ajouter'], (await texte(o.p, '#logistique .lg-titre')).slice(0, 2), 'bloc Logistique : rubriques Logement et Transport'));
    pb.push(egal('58 €', await attr(o.p), 'sans logement ni trajet : le total est le prix du dossard'));
    pb.push(egal('Navette depuis le stade à 6 h 30.', (await texte(o.p, '#logistique .lg-rubrique:last-child p:not(.pc-sous-titre)'))[0], 'le texte libre devient les Notes'));

    // 1. Logement.
    // Recherche d'adresse (OpenStreetMap simulé) : proposée au bouton ou à « Entrée », mise en forme, choisie d'un toucher.
    const demandes = [];
    await o.ctx.route(/nominatim\.openstreetmap\.org/, rt => { demandes.push(new URL(rt.request().url()).searchParams.get('q'));
      rt.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([{ display_name: 'x', address: { house_number: '12', road: 'rue des Crêtes', postcode: '42000', city: 'Saint-Étienne' } }, { display_name: 'Autre lieu, France', address: {} }]) }); });
    await o.p.click('[data-lg-act="ajouter-logement"]');
    await o.p.fill('.lg-form [name="nom"]', 'Gîte des Crêtes');
    await o.p.fill('.lg-form [name="adresse"]', 'rue des Crêtes Saint-Étienne'); await o.p.press('.lg-form [name="adresse"]', 'Enter'); await o.p.waitForSelector('.lg-suggestions:not([hidden])');
    pb.push(egal([['rue des Crêtes Saint-Étienne'], ['12 rue des Crêtes, 42000 Saint-Étienne', 'Autre lieu, France']], [demandes, await o.p.$$eval('.lg-suggestions .mrt-menu-l', l => l.map(x => x.textContent))], 'adresse : recherche à « Entrée », propositions mises en forme'));
    await o.p.click('.lg-suggestions .mrt-menu-l >> nth=0');
    pb.push(egal(['12 rue des Crêtes, 42000 Saint-Étienne', true], [await o.p.inputValue('.lg-form [name="adresse"]'), await o.p.evaluate(() => document.querySelector('.lg-suggestions').hidden)], 'adresse : la proposition choisie remplit le champ'));
    await o.p.fill('.lg-form [name="prix"]', '180');
    await o.p.fill('.lg-form [name="url"]', 'https://example.org/gite');
    await o.p.fill('.lg-form [name="arrivee"]', '2027-03-05T17:00');
    await o.p.fill('.lg-form [name="depart"]', '2027-03-07T10:00');
    await o.p.click('.lg-form [type="submit"]'); await attendre(o.p);
    const ligneTxt = (i, sel) => o.p.evaluate(([n, q]) => [...document.querySelectorAll('.lg-ligne')[n].querySelectorAll(q)].map(e => e.textContent.replace(/\s+/g, ' ').trim()), [i, sel]);
    pb.push(egal(['Gîte des Crêtes180 €', ['12 rue des Crêtes, 42000 Saint-Étienne', 'Google Maps Waze', 'Arrivée : ven. 5 mars · 17 h', 'Départ : dim. 7 mars · 10 h']], [(await ligneTxt(0, '.lg-haut'))[0], await ligneTxt(0, '.lg-bas')], 'logement : adresse, itinéraires, « Arrivée : » puis « Départ : » l\'un sous l\'autre'));
    pb.push(egal([['https://www.google.com/maps/search/?api=1&query=12%20rue%20des%20Cr%C3%AAtes%2C%2042000%20Saint-%C3%89tienne', 'https://waze.com/ul?q=12%20rue%20des%20Cr%C3%AAtes%2C%2042000%20Saint-%C3%89tienne&navigate=yes'], 'https://example.org/gite', 0], [await o.p.$$eval('.lg-plans a', l => l.map(a => a.href)), await o.p.getAttribute('.lg-nom .lg-lien-nom', 'href'), await o.p.locator('.lg-ligne', { hasText: 'Annonce' }).count()],
      'logement : liens Google Maps et Waze ; la flèche à côté du nom ouvre le lien, plus de « Annonce »'));
    pb.push(egal('238 €', await attr(o.p), 'logement à 180 € : total 238 €'));

    // 2. Trajet.
    await o.p.click('[data-lg-act="ajouter-trajet"]');
    pb.push(egal(['Type', 'Sens'], await o.p.$$eval('.lg-form .lg-champ label', l => l.map(x => x.textContent).slice(0, 2)), 'trajet : le type d\'abord, puis le sens'));
    await o.p.selectOption('.lg-form [name="type"]', 'train');
    await o.p.fill('.lg-form [name="lieu_depart"]', 'Lyon'); await o.p.fill('.lg-form [name="depart"]', '2027-03-06T08:12');
    await o.p.fill('.lg-form [name="lieu_arrivee"]', 'Saint-Étienne'); await o.p.fill('.lg-form [name="arrivee"]', '2027-03-06T10:05');
    await o.p.fill('.lg-form [name="prix"]', '62');
    await o.p.click('.lg-form [type="submit"]'); await attendre(o.p);
    pb.push(egal(['Train · Aller62 €', ['Lyon sam. 6 mars · 8 h 12 Saint-Étienne sam. 6 mars · 10 h 05']], [(await ligneTxt(1, '.lg-haut'))[0], await ligneTxt(1, '.lg-bas')], 'trajet : la ligne (type puis sens) et ses horaires'));
    pb.push(egal('300 €', await attr(o.p), 'trajet à 62 € : total 300 €'));

    // 3. Détail du total, un clic l'ouvre, un second le ferme.
    await o.p.click('[data-lg-act="detail"]');
    pb.push(egal('Dossard 58 €Logement 180 €Transport 62 €', (await texte(o.p, '.lg-detail'))[0], 'détail du total'));
    pb.push(egal([3, true], await o.p.evaluate(() => { const l = [...document.querySelectorAll('.lg-detail span')], t = l.map(x => Math.round(x.getBoundingClientRect().top)); return [l.length, t[0] < t[1] && t[1] < t[2]]; }), 'détail du total : une ligne sous l\'autre'));
    await o.p.click('[data-lg-act="detail"]');
    pb.push(egal(0, await o.p.locator('.lg-detail').count(), 'second clic : le détail se referme'));

    // 4. Sans prix : le total ne change pas, aucun « 0 € ».
    await o.p.click('[data-lg-act="ajouter-logement"]');
    await o.p.fill('.lg-form [name="nom"]', 'Chez des amis');
    await o.p.click('.lg-form [type="submit"]'); await attendre(o.p);
    pb.push(egal(['300 €', false], [await attr(o.p), /(^|\D)0\s€/.test((await texte(o.p, '#logistique .lg-corps'))[0])], 'logement sans prix : total inchangé, pas de « 0 € »'));

    // 5. Modifier un logement puis le supprimer (confirmation).
    await o.p.click('[data-lg-act="modifier-logement"] >> nth=1');
    await o.p.click('[data-lg-act="supprimer"]');
    await o.p.click('.mrt-dialogue [data-r="oui"]'); await attendre(o.p);
    pb.push(egal(1, db.logements.length, 'supprimer un logement demande confirmation puis le retire'));

    // 5 bis. Aller-retour : un seul prix, retour présaisi à l'envers, deux lignes enregistrées.
    await o.p.click('[data-lg-act="ajouter-trajet"]');
    await o.p.selectOption('.lg-form [name="type"]', 'avion'); await o.p.selectOption('.lg-form [name="sens"]', 'aller_retour');
    await o.p.fill('.lg-form [name="lieu_depart"]', 'Aéroport de Lyon'); await o.p.fill('.lg-form [name="lieu_arrivee"]', 'Aéroport de Nice');
    pb.push(egal(['Aéroport de Nice', 'Aéroport de Lyon', 'Prix de l\'aller-retour (€)'], [await o.p.inputValue('.lg-form [name="r_lieu_depart"]'), await o.p.inputValue('.lg-form [name="r_lieu_arrivee"]'), (await o.p.textContent('.lg-form [name="prix"] >> xpath=ancestor::div[contains(@class,"lg-champ")]/label')).trim()], 'aller-retour : lieux du retour présaisis, un seul prix'));
    await o.p.fill('.lg-form [name="r_depart"]', '2027-03-08T18:00'); await o.p.fill('.lg-form [name="prix"]', '100');
    await o.p.click('.lg-form [type="submit"]'); await attendre(o.p);
    pb.push(egal([['aller', 100, true, 'avion'], ['retour', null, undefined, 'avion']], db.trajets.slice(-2).map(t => [t.sens, t.prix, t.prix_aller_retour, t.type]), 'aller-retour : deux lignes, le prix sur l\'aller seulement'));
    pb.push(egal(['Avion · Aller100 € aller-retour', 'Avion · Retour', '400 €'], [(await texte(o.p, '.lg-ligne .lg-haut'))[2], (await texte(o.p, '.lg-ligne .lg-haut'))[3], await attr(o.p)], 'aller-retour : affichage et total (prix compté une fois)'));

    // 6. Matos : le catalogue est proposé, rien n'est dupliqué.
    await o.p.click('[data-lg-act="liste"]');
    pb.push(egal(['Frontale', 'Sifflet', 'Veste pluie', 'Chaussures', 'Save bank'], await o.p.$$eval('#lg-catalogue option', l => l.map(x => x.value)), 'liste d\'ajout : les articles du catalogue'));
    await o.p.fill('[name="article"]', 'Sifflet'); await o.p.click('[data-lg-act="ajouter-article"]'); await attendre(o.p);
    await o.p.fill('[name="article"]', 'Frontale'); await o.p.click('[data-lg-act="ajouter-article"]'); await attendre(o.p);
    await o.p.fill('[name="article"]', 'frontale'); await o.p.click('[data-lg-act="ajouter-article"]'); await attendre(o.p);
    pb.push(egal([2, 5], [db.course_materiel.length, db.materiel_catalogue.length], 'article déjà au catalogue : ajouté une fois, catalogue inchangé'));
    // 7. Article inconnu : créé, rangé, mémorisé.
    await o.p.fill('[name="article"]', 'Gants'); await o.p.selectOption('[name="categorie"]', 'Vêtements'); await o.p.click('[data-lg-act="ajouter-article"]'); await attendre(o.p);
    pb.push(egal(['Vêtements', 6], [(db.materiel_catalogue.find(a => a.nom === 'Gants') || {}).categorie, db.materiel_catalogue.length], 'article inconnu : créé au catalogue dans sa catégorie'));
    pb.push(egal(['Gants'], await o.p.$$eval('.lg-cat', l => l.filter(x => x.textContent === 'Vêtements').map(x => x.nextElementSibling.textContent.replace(/Imposé|Retirer/g, '').trim())), 'article inconnu : rangé sous sa catégorie'));

    // 8. Imposé : la pastille, et l'ordre (imposés d'abord).
    await o.p.check('[data-champ="impose"][data-article="art-1"]'); await attendre(o.p);
    pb.push(egal([true, 'Imposé'], [db.course_materiel.find(m => m.article === 'art-1').impose, (await texte(o.p, '.lg-impose'))[0]], 'bascule « Imposé » : enregistrée, pastille affichée'));
    pb.push(egal(['Frontale', 'Sifflet'], await o.p.$$eval('.lg-art-nom', l => l.map(x => x.textContent).slice(0, 2)), 'imposé en tête de sa catégorie'));

    // 9. Équipement choisi pour la course.
    await o.p.selectOption('select[data-article="art-1"]', 'eq-fr'); await attendre(o.p);
    pb.push(egal('eq-fr', db.course_materiel.find(m => m.article === 'art-1').equipement, 'équipement lié enregistré'));
    await o.p.click('[data-lg-act="liste"]');
    pb.push(egal(['Petzl Actik'], await texte(o.p, '.lg-equip'), 'équipement affiché sur la ligne de l\'article'));

    // 10. Mode jour J : les cases s'enregistrent, le compteur suit.
    await o.p.click('[data-lg-act="jour-j"]');
    pb.push(egal(['Frontale', 'Sifflet', 'Gants'], await o.p.$$eval('.lg-jourj .lg-art-nom', l => l.map(x => x.textContent)), 'jour J : la liste seule, imposé en tête'));
    pb.push(egal(true, await o.p.evaluate(() => document.querySelector('.lg-jourj .lg-art').getBoundingClientRect().height >= 44), 'jour J : lignes assez hautes pour le doigt'));
    await o.p.check('.lg-jourj [data-article="art-1"]'); await o.p.check('.lg-jourj [data-article="art-2"]'); await pause();
    pb.push(egal('2 / 3 pris', (await texte(o.p, '.lg-jourj .lg-compte'))[0], 'jour J : compteur'));
    await o.p.click('.lg-jourj [data-jj="fermer"]');
    pb.push(egal(['2 / 3 pris', [true, true, false]], [(await texte(o.p, '#logistique .lg-compte'))[0], db.course_materiel.map(m => m.pris)], 'cocher est enregistré, le compteur du bloc suit'));
    await o.ctx.close();
    // Recharger : les cases restent cochées.
    o = await ouvrir(nav, 'course.html?id=' + GORGES, 1200, db, {}, PARIS);
    await o.p.click('#logistique > summary'); await pause();
    pb.push(egal([2, '2 / 3 pris'], [await o.p.locator('#logistique .lg-art input[data-champ="pris"]:checked').count(), (await texte(o.p, '#logistique .lg-compte'))[0]], 'page rechargée : les cases cochées restent cochées'));
    // 11. Retirer : sorti de la course, resté au catalogue.
    await o.p.click('[data-lg-act="liste"]'); await o.p.click('[data-lg-act="retirer"][data-id="art-2"]'); await pause();
    pb.push(egal([2, true], [db.course_materiel.length, db.materiel_catalogue.some(a => a.id === 'art-2')], 'retirer : sorti de la course, gardé au catalogue'));
    pb.push(egal([], o.erreurs, 'Logistique : erreurs JavaScript'));
    await o.ctx.close();

    // Téléphone : pas de débordement ; bloc ouvert.
    o = await ouvrir(nav, 'course.html?id=' + GORGES, 390, db, {}, PARIS);
    await o.p.click('#logistique > summary'); await o.p.click('[data-lg-act="ajouter-trajet"]');
    pb.push(egal(false, await o.p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement'));
    await o.ctx.close();

    // Mon matériel (Mon profil) : kilomètres seulement pour les chaussures ; ajout.
    o = await ouvrir(nav, 'profil.html', 1200, db, {}, PARIS);
    await o.p.waitForSelector('#materiel .st-connexion'); await pause();
    pb.push(egal(['Salomon Speedcross (les rouges)Chaussures · départ 120 km · limite 800 km', 'Petzl ActikFrontale'], (await texte(o.p, '#materiel .st-connexion span')).filter(Boolean).slice(0, 2), 'Mon matériel : kilomètres sur les chaussures seulement'));
    await o.p.click('[data-mm-act="ajouter"]');
    await o.p.selectOption('#materiel [name="type"]', 'batons');
    pb.push(egal(true, await o.p.evaluate(() => [...document.querySelectorAll('#materiel .lg-km')].every(x => x.hidden)), 'Mon matériel : pas de kilomètres pour des bâtons'));
    await o.p.fill('#materiel [name="marque"]', 'Leki'); await o.p.fill('#materiel [name="modele"]', 'Micro Vario');
    await o.p.click('#materiel [type="submit"]'); await pause();
    pb.push(egal(['batons', 'Leki', 0], (({ type, marque, km_depart }) => [type, marque, km_depart])(db.equipements[2] || {}), 'Mon matériel : un équipement ajouté'));
    pb.push(egal([], o.erreurs, 'Mon matériel : erreurs JavaScript'));
    await o.ctx.close();

    // Partage en lecture seule : jamais de Logistique.
    const autre = '00000000-0000-0000-0000-00000000000b', COURSE_AUTRE = id(98);
    const d2 = JSON.parse(JSON.stringify(db));
    d2.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    d2.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    d2.courses.push(Object.assign({}, d2.courses.find(c => c.id === GORGES), { id: COURSE_AUTRE, utilisateur: autre, course: 'Course partagée' }));
    o = await ouvrir(nav, 'course.html?id=' + COURSE_AUTRE, 1200, d2, { 'mrt-vue': autre }, PARIS);
    pb.push(egal([1, 0], [await o.p.locator('.pc-titre').count(), await o.p.locator('#logistique').count()], 'site partagé : la course s\'affiche sans Logistique'));
    await o.ctx.close();
    return pb;
  }

};
(async () => {
  if (CAPTURES) fs.mkdirSync(path.join(__dirname, 'captures'), { recursive: true });
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees-fictives.json'), 'utf8'));
  const nav = await chromium.launch(navigateur());
  // Anti-robot (Turnstile) : jamais dans le banc (pas de réseau) ; la clé du site est vidée au chargement de chaque page.
  const contexte0 = nav.newContext.bind(nav);
  nav.newContext = async (...a) => { const c = await contexte0(...a); await c.addInitScript(SANS_CAPTCHA); return c; };
  // Sortie courte (économie de jetons) : seuls les groupes en échec sont détaillés, les autres comptés ; DETAIL=1 pour une ligne par groupe.
  let echecs = 0; const ok = [];
  for (const [nom, f] of Object.entries(CONTROLES)) {
    if (SEULS.length && !SEULS.includes(nom)) continue;
    const pb = (await f(nav, db)).filter(Boolean);
    echecs += pb.length;
    if (pb.length) console.log('ÉCHEC ' + nom + pb.map(x => '\n      - ' + x).join(''));
    else if (process.env.DETAIL) console.log('OK    ' + nom);
    else ok.push(nom);
  }
  if (ok.length) console.log('OK    ' + ok.length + ' groupe' + (ok.length > 1 ? 's' : '') + (ok.length <= 3 ? ' (' + ok.join(', ') + ')' : ''));
  await nav.close();
  process.exit(echecs ? 1 : 0);
})();
