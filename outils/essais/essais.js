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
      const correspond = x => filtresEq.every(([k, v]) => String(x[k]) === v.slice(3));
      if (['seances', 'plan_semaines', 'aliments', 'repas_lignes', 'sport_jour', 'propositions'].includes(tab) || (tab === 'courses' && req.method() === 'PATCH' && Object.keys(req.postDataJSON()).join() === 'prepa_semaines')) {
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
      if (tab === 'profils' && req.method() === 'PATCH') {
        db.profils.filter(correspond).forEach(x => Object.assign(x, req.postDataJSON()));
        return route.fulfill({ contentType: 'application/json', body: '[]' });
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
    const filtres = [...u.searchParams].filter(([k]) => !['select', 'order'].includes(k));
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
  }).observe(document.documentElement, { childList: true, subtree: true });
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
  async accueil(nav, db0) {
    const { db } = jeuObjectif(db0);
    const pb = [];
    const blocs = p => p.evaluate(() => [...document.querySelectorAll('.ac-bloc')].map(b => b.dataset.bloc + (b.classList.contains('is-bientot') ? ' (bientôt)' : '')));
    // Par défaut : l'Accueil est la page de démarrage, avec le grand en-tête ; blocs par défaut.
    let { p, ctx, erreurs } = await ouvrir(nav, 'index.html', 1200, db, {}, PARIS);
    pb.push(egal([true, 'En un coup d\'œil'], [await p.evaluate(() => !!document.querySelector('.mrt-header')), await p.getAttribute('.mrt-tab.is-on', 'aria-label')], 'En un coup d\'œil : grand en-tête, onglet actif'));
    pb.push(egal(['prochaine', 'dicila', 'derniere'], await blocs(p), 'Accueil : blocs par défaut, Dernière course comprise, aucun bloc « bientôt » (vide)'));
    pb.push(egal('Trail du Lac · Le Tour du Lac', (await p.textContent('[data-bloc="prochaine"] .ob-nom a')).replace(/[  ]/g, ' ').trim(), 'prochaine course : la carte de la feuille de route'));
    const etapes = await p.evaluate(() => [...document.querySelectorAll('.ac-etape')].map(e => e.textContent + (e.classList.contains('is-cap') ? ' (cap)' : '')));
    pb.push(egal('Trail des Crêtes (cap)', etapes[etapes.length - 1], 'd\'ici là : jusqu\'au cap compris, en Accent'));
    pb.push(egal([], erreurs, 'Accueil : erreurs JavaScript'));
    await ctx.close();
    // Blocs choisis dans les Préférences : ordre et Dernière course.
    const choix = JSON.parse(JSON.stringify(db)); choix.preferences[0].accueil_blocs = ['derniere', 'prochaine'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, choix, {}, PARIS));
    pb.push(egal(['derniere', 'prochaine'], await blocs(p), 'blocs choisis, dans l\'ordre choisi'));
    pb.push(egal(true, /Course.+Date.+Temps\s*\d{2}:\d{2}:\d{2}/.test(await p.textContent('[data-bloc="derniere"]')), 'dernière course : nom, date, temps en hh:mm:ss'));
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
    pb.push(egal(['Objectif & plan'], await ouverture(), 'En un coup d\'œil décoché : Objectif & plan s\'ouvre en arrivant'));
    await p.check('.pref-modules label:has-text("En un coup") input');
    await p.waitForSelector('#bloc-menu .pref-msg:has-text("Enregistré")');
    pb.push(egal([['Prochaine course', 'Nutrition', 'D\'ici là', 'Dernière course'], 'Bientôt : Pense-bête.'], await p.evaluate(() => [[...document.querySelectorAll('.pref-blocs label')].map(l => l.textContent.trim()),
      document.querySelector('#bloc-accueil .pref-bientot').textContent]), 'page d\'accueil : les blocs construits, puis les blocs « bientôt » sur une ligne'));
    await p.uncheck('.pref-blocs label:has-text("Dernière course") input');
    await p.waitForSelector('#bloc-accueil .pref-msg:has-text("Enregistré")');
    pb.push(egal(['prochaine', 'nutrition', 'dicila', 'pensebete'], db.preferences[0].accueil_blocs, 'Dernière course décochée : enregistrée, les blocs « bientôt » gardés pour leur arrivée'));
    await ctx.close();
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
    pb.push(egal(['Thème', 'Cap', 'Menu', 'En un coup d\'œil', 'Partage', 'Compte'], await p.evaluate(() => [...document.querySelectorAll('main h2')].map(h => h.textContent)), 'ordre des blocs'));
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
    const construits = ['En un coup d\'œil', 'Objectif & plan', 'Calendrier', 'À surveiller', 'Palmarès'];
    pb.push(egal(construits, await menu(), 'menu par défaut : les modules construits seulement'));
    pb.push(egal(5, await p.locator('.pref-modules input[type="checkbox"]:checked').count(), 'les cinq modules construits cochés, En un coup d\'œil compris, sauf Nutrition (à cocher)'));
    pb.push(egal('Bientôt dans le menu : Cette semaine, Profil, Guide.', await p.textContent('#bloc-menu .pref-bientot'), 'modules non construits sur une ligne, sans case ni flèches'));
    await p.click('[aria-label="Monter Calendrier"]'); await attendre();
    const monte = ['En un coup d\'œil', 'Calendrier', 'Objectif & plan', 'À surveiller', 'Palmarès'];
    pb.push(egal(monte, await menu(), 'Calendrier monté, menu aussitôt'));
    await recharger();
    pb.push(egal(monte, await menu(), 'ordre conservé après rechargement'));
    await p.locator('.pref-modules label', { hasText: 'Calendrier' }).locator('input').uncheck(); await attendre();
    pb.push(egal(false, (await menu()).includes('Calendrier'), 'Calendrier décoché, absent du menu'));
    await p.click('#bloc-menu .pref-defaut'); await attendre();
    pb.push(egal(construits, await menu(), 'ordre par défaut rétabli'));
    for (const n of construits.slice(1)) { await p.locator('.pref-modules label', { hasText: n }).locator('input').uncheck(); await attendre(); }
    pb.push(egal(['En un coup d\'œil'], await menu(), 'un seul module affiché'));
    pb.push(egal(true, await q('.pref-modules input[data-i]:checked', 'x.disabled'), 'dernière case non décochable'));
    // Les modules « bientôt » restent dans la liste enregistrée, à la fin : ils entreront dans le menu une fois construits.
    pb.push(egal(['En un coup d\'œil', 'Cette semaine', 'Profil', 'Guide'], db.preferences[0].modules, 'modules « bientôt » gardés dans la liste enregistrée'));
    await p.click('#bloc-menu .pref-defaut'); await attendre();

    // Cap
    const options = await p.evaluate(() => [...document.querySelectorAll('#bloc-cap option')].map(o => o.textContent));
    pb.push(egal('Par défaut : la plus lointaine (Trail des Crêtes)', options[0], 'cap, premier choix'));
    pb.push(egal(['Trail du Lac', 'Course A', 'Trail des Crêtes'], options.slice(1).map(o => o.split(' · ')[0]), 'cap, courses proposées'));
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
    pb.push(egal(Array(3).fill('Reviens à ton site pour modifier tes réglages.'), corps, 'lecture seule'));
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
    pb.push(egal({ role: 'Préparatoire', compteur: '26j', date: '15 nov. 2026', info: 'Mont-Clair · Trail court',
      lignes: ['Distance | 24 km · 650 m D+', 'Objectif | 02:45:00', 'Dossard | Inscrit · n° 412'] },
      { role: lac.role, compteur: lac.compteur, date: lac.date, info: lac.info, lignes: lac.lignes }, 'Trail du Lac'));
    pb.push(egal({ role: 'Plaisir', compteur: '54j', lignes: ['Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Dossard | Ouvre le 1er nov. 2026'] },
      { role: corrida.role, compteur: corrida.compteur, lignes: corrida.lignes }, 'Corrida de Noël'));
    pb.push(egal({ role: 'Objectif', cle: true, compteur: '137j', objectif: 'Objectif | 06:30:00' },
      { role: gorges.role, cle: /is-obj/.test(gorges.classes), compteur: gorges.compteur, objectif: gorges.lignes[1] }, 'Trail des Gorges'));
    pb.push(egal({ opt: true, role: 'Préparatoire • 2 candidats', cands: [
      { nom: 'Trail des Cimes', date: '30 mai 2027', lignes: ['Distance | 42 km · 2 500 m D+', 'Dossard | Ouvre le 10 janv. 2027'], compteur: false, role: false },
      { nom: 'Ultra du Plateau · Le 55', date: '26 juin 2027', lignes: ['Distance | 55 km · 2 800 m D+', 'Dossard | Inscription ouverte'], compteur: false, role: false }] },
      { opt: /is-opt/.test(groupe.classes), role: groupe.role, cands: groupe.cands }, 'Printemps 2027'));
    pb.push(egal(true, await p.evaluate(() => { const a = document.querySelectorAll('.ob-cand .ob-ins')[1]; return a.tagName === 'A' && a.classList.contains('is-ouvert') && a.target === '_blank' && a.getAttribute('href') === 'https://example.org/plateau/inscription'; }), 'inscription ouverte : lien, en Alerte'));
    pb.push(egal({ opt: true, role: 'Préparatoire', date: 'juillet 2027', compteur: null, lignes: ['Distance | 30 km · 1 200 m D+', 'Dossard | Ouverture à venir'] },
      { opt: /is-opt/.test(foret.classes), role: foret.role, date: foret.date, compteur: foret.compteur, lignes: foret.lignes }, 'Trail de la Forêt'));
    pb.push(egal({ obj: true, role: 'Objectif', compteur: '311j', objectif: 'Objectif | Finisher', dossard: 'Dossard | Inscrit · n° 88' },
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
          descFiche: !!q('.pc-fiche .pc-fiche-bas > .pc-cellule'), prepa: q('#preparation') ? [t(q('#preparation .pc-role .pc-sous-titre')) + ' | ' + t(q('#preparation .pc-role > p:not(.pc-sous-titre)')), !!q('#preparation .pc-role + .cal-lignes .cal-parametrer')] : null,
          insLien: document.querySelectorAll('.pc-fiche a.ob-ins').length
        };
      });
      await o.ctx.close();
      return [r, o.erreurs];
    };
    let [r, err] = await pageCourse(id(3));
    pb.push(egal({ modale: true, barre: ['modifier', 'fermer'], sur: 'Objectif · Étape 3 sur 6', titre: 'Trail des Gorges', info: 'Trail long',
      compteur: '137j 22h 30min 00s', fiche: ['Lieu | Mont-Clair', 'Date / heure | dim. 7 mars 2027 · 7 h 30', 'Distance | 45 km · 2 100 m D+ · 2 100 m D−', 'Objectif | 06:30:00Sous 6 h 45 dans tous les cas.', 'Dossard | Inscrit · n° 1287'], dossards: 1 },
      { modale: r.modale, barre: r.barre, sur: r.sur, titre: r.titre, info: r.info, compteur: r.compteur, fiche: r.fiche, dossards: r.dossards }, 'page Trail des Gorges, haut et fiche'));
    pb.push(egal(['À propos de la course', 'Parcours', 'Préparation', 'Logistique'], r.cellules, 'page Trail des Gorges, textes : À propos de la course, Parcours, Préparation, Logistique en dernier'));
    pb.push(egal(true, r.descFiche, 'page Trail des Gorges, « À propos de la course » dans le cadre de la fiche'));
    pb.push(egal(['Rôle dans la préparation | Répétition générale du matériel et de la nutrition.', true], r.prepa, 'page Trail des Gorges, Préparation : le rôle, puis « Paramétrer le plan » et le plan'));
    pb.push(egal([['Site officiel'], true], [r.liens, r.officiel], 'page Trail des Gorges : site officiel en bas à droite de la fiche, sur la ligne d\'« À propos de la course », pas de « S\'inscrire » (inscrit)'));
    pb.push(egal([1, false, 0], [...r.fleches, r.titreLien], 'liens : flèche dessinée, plus de caractère ↗ (emoji sur iPhone), plus de flèche dans le titre'));
    pb.push(egal(['Mont-Clair', 'https://www.openstreetmap.org/search?query=Mont-Clair', '_blank'], r.lieu, 'lieu : lien vers OpenStreetMap, nouvel onglet'));
    pb.push(egal(['is-precedente | Corrida de Noël', 'is-suivante | Trail des Cimes'], r.nav, 'page Trail des Gorges, navigation'));
    pb.push(egal('Trail des Gorges · MyRunTools', r.titreDoc, 'page Trail des Gorges, titre de l\'onglet'));
    pb.push(egal([], err, 'page d\'une course, erreurs JavaScript'));
    [r] = await pageCourse(id(2));
    pb.push(egal({ cellules: ['Parcours', 'Préparation'], fiche: ['Lieu | Ville-Haute', 'Date / heure | dim. 13 déc. 2026 · 18 h 30', 'Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Dossard | Ouvre le 1er nov. 2026'], liens: ['Site officiel'] },
      { cellules: r.cellules, fiche: r.fiche, liens: r.liens }, 'page Corrida de Noël : ni D−, ni prix ; Parcours pour importer un GPX'));
    [r] = await pageCourse(id(5));
    pb.push(egal({ liens: ['S\'inscrire', 'Site officiel'], insLien: 0, fiche: ['Lieu | Plaine-Neuve', 'Date / heure | sam. 26 juin 2027', 'Distance | 55 km · 2 800 m D+', 'Dossard | Inscription ouverte'] }, { liens: r.liens, insLien: r.insLien, fiche: r.fiche },
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
    pb.push(egal({ sur: 'Préparatoire · Étape 4 sur 6', groupe: 'Printemps 2027 · autre candidat : Ultra du Plateau · Le 55' }, { sur: r.sur, groupe: r.groupe }, 'page Trail des Cimes'));
    [r] = await pageCourse(id(1));
    pb.push(egal(['is-suivante | Corrida de Noël'], r.nav, 'page Trail du Lac, pas de course précédente'));
    [r] = await pageCourse(id(7));
    pb.push(egal(['is-precedente | Trail de la Forêt'], r.nav, 'page Trail des Crêtes, pas de course suivante'));
    // Ordinateur : la modale (marges de 2 rem et cadre de 1 px : 896 px de texte, comme les pages), la fiche encadrée, tous les textes ouverts, sans pouvoir les replier.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS));
    pb.push(egal({ largeur: 896, cadre: '1px', textes: 4, ouverts: ['Parcours'], repliable: 'auto', cadres: 2 },
      await p.evaluate(() => {
        return { largeur: Math.round(document.querySelector('.pc').getBoundingClientRect().width),
          cadre: getComputedStyle(document.querySelector('.pc-fiche')).borderTopWidth, textes: document.querySelectorAll('.pc-cellule').length,
          ouverts: [...document.querySelectorAll('.pc-cellule[open] > summary')].map(x => x.textContent.trim()), repliable: getComputedStyle(document.querySelector('.pc-cellule > summary')).pointerEvents,
          cadres: document.querySelectorAll('.pc > .pc-fiche, .pc > .pc-textes').length
        }; }), 'ordinateur : une colonne, deux cadres (fiche et Description, puis Parcours, Préparation, Logistique), tout replié sauf Parcours, renseigné'));
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
    pb.push(egal({ debordement: false, compteurUneLigne: true, ouvertes: [false, true, false, false] },
      { debordement: tc.debordement, compteurUneLigne: tc.compteurUneLigne, ouvertes: tc.ouvertes }, 'téléphone : page d\'une course'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-course-telephone.png'), fullPage: false });
    pb.push(egal(true, tc.haut < 330, 'téléphone : la fiche commence dans le premier écran (' + tc.haut + ' px)'));
    await p.locator('.pc-cellule > summary').nth(1).click();
    await p.waitForTimeout(400);
    pb.push(egal([false, false], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(0, 2).map(d => d.open)), 'téléphone : toucher le titre ferme la cellule ouverte'));
    await p.locator('.pc-cellule > summary').nth(1).click();
    await p.waitForTimeout(400);
    pb.push(egal([false, true], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(0, 2).map(d => d.open)), 'téléphone : toucher le titre ouvre la cellule'));
    pb.push(egal([], erreurs, 'téléphone, page d\'une course, erreurs JavaScript'));
    await ctx.close();
    // ----- Tracé GPX (§ 3.4, n° 25 à 28 et 32) -----
    {
      const moi = db.profils[0].id, chemin = n => 'traces/' + moi + '/' + n + '.gpx';
      const avecTrace = JSON.parse(JSON.stringify(db));
      avecTrace.courses.find(c => c.id === id(3)).gpx = moi + '/' + id(3) + '.gpx';
      avecTrace.fichiers = { [chemin(id(3))]: GPX };
      let o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, avecTrace, {}, PARIS);
      pb.push(egal(true, await o.p.evaluate(() => document.querySelector('#parcours').open), 'Parcours renseigné (tracé GPX) : ouvert d\'emblée'));
      await o.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      pb.push(egal({ alt: ['620 m', '500 m'], km: ['0 km', '5,4 km'], bornes: 3, ordre: ['tr-zone', 'pc-strategie'], strategie: 'Stratégie de course', bouton: 'GPX', boutonClasse: true }, await o.p.evaluate(() => ({
        alt: [...document.querySelectorAll('.tr-alt span')].map(x => x.textContent), km: [...document.querySelectorAll('.tr-km span')].map(x => x.textContent.replace(/[  ]/g, ' ')),
        bornes: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length,
        ordre: [...document.querySelector('#parcours .pc-corps').children].map(x => x.className || x.tagName), strategie: document.querySelector('.pc-strategie .pc-sous-titre').textContent,
        bouton: document.querySelector('.tr-profil .tr-bas .tr-telecharger').textContent.trim(), boutonClasse: document.querySelector('.tr-telecharger').classList.contains('mrt-btn') })), 'GPX : carte (tracé, départ, arrivée), profil, bouton à contour « ↓ GPX » sous les distances, puis la stratégie'));
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
      pb.push(egal('Aucun tracé', (await o.p.textContent('.fc-gpx-etat')).trim(), 'formulaire : bloc Course, « Tracé GPX », aucun tracé'));
      await o.p.setInputFiles('.fc-gpx-fichier', { name: 'lac.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX) });
      await o.p.waitForFunction(() => /Nouveau tracé/.test(document.querySelector('.fc-gpx-etat').textContent));
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
    pb.push(egal(['Préparatoire • 1 candidat', "6 courses"], [k.find(x => x.nom === 'Printemps 2027').role, await p.evaluate(() => document.querySelectorAll('.mrt-stat-val')[3].textContent)], 'groupe d\'un seul candidat'));
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
    pb.push(egal(['Trail des Gorges', 'Objectif · Étape 3 sur 6'], [r.titre, r.sur], 'lecture seule, page d\'une course'));
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
    const barre = p => p.evaluate(() => [...document.querySelectorAll('.fc-barre > *')].map(b => b.textContent.trim()).concat(document.querySelector('#fc-titre').textContent.trim()));
    const consultation = p => p.waitForSelector('.mc-panneau .pc-titre');
    // Consultation, puis crayon : la même feuille passe en édition.
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS);
    await p.click('[data-ob="modifier"]');
    await p.waitForSelector('.mc-panneau .fc-fiche');
    pb.push(egal({ barre: ['Annuler', 'Enregistrer', 'Modifier la course'], croix: 0, couches: 0, feuilles: 1, blocs: ['Course', 'Place dans le plan', 'Dossard', 'Parcours', 'Préparation', 'Logistique', 'Liens'], dossard: ['dossard', '1287'] },
      { barre: await barre(p), croix: await p.locator('.pc-fermer').count(), couches: await p.locator('.cal-voile').count(), feuilles: await p.locator('.mc-voile').count(), blocs: await titres(p),
        dossard: await p.evaluate(() => { const e = document.querySelector('#fc-dossard'); return [e.closest('.fc-grille').previousElementSibling.dataset.bloc, e.value]; }) }, 'crayon : édition dans la même feuille'));
    // Libellé du mode en capitales discrètes ; « Supprimer la course » : bouton à contour rouge avec sa poubelle, seul en bas de la fiche.
    pb.push(egal({ auxBords: true, libelle: 'uppercase', texte: 'Supprimer la course', poubelle: true, rouge: true, enBas: true }, await p.evaluate(() => {
      const b = document.querySelector('.fc-supprimer'), st = getComputedStyle(b), blocs = document.querySelectorAll('.fc-fiche .fc-bloc');
      const an = document.querySelector('.fc-barre [data-fc="annuler"]').getBoundingClientRect(), en = document.querySelector('.fc-barre .fc-plein').getBoundingClientRect(), br = document.querySelector('.fc-barre').getBoundingClientRect();
      return { auxBords: an.left - br.left < 40 && br.right - en.right < 40, libelle: getComputedStyle(document.querySelector('#fc-titre')).textTransform, texte: b.textContent.trim(), poubelle: !!b.querySelector('svg'),
        rouge: st.borderTopColor === st.color && st.color === getComputedStyle(document.documentElement).getPropertyValue('--red').trim().replace(/^#(..)(..)(..)$/, (m, r, g, bl) => 'rgb(' + [r, g, bl].map(x => parseInt(x, 16)).join(', ') + ')'),
        enBas: b.getBoundingClientRect().top > blocs[blocs.length - 1].getBoundingClientRect().bottom };
    }), 'Annuler à gauche, Enregistrer à droite ; libellé du mode ; Supprimer la course, à contour rouge, en bas'));
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
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court');
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
    pb.push(egal({ barre: ['Annuler', 'Enregistrer', 'Modifier la course'], blocs: ['Course', 'Place dans le plan', 'Dossard', 'Parcours', 'Préparation', 'Logistique', 'Résultat', 'Montre', 'Liens'],
      ouverts: ['course', 'resultat'], approx: 0, statut: 0, classements: true },
      { barre: await barre(p), blocs: await titres(p), ouverts: await p.evaluate(() => [...document.querySelectorAll('.fc-fiche .fc-bloc-titre[aria-expanded="true"]')].map(b => b.dataset.bloc).filter(b => !['dossard', 'montre', 'liens'].includes(b))),
        approx: await p.locator('#fc-date_approx').count(), statut: await p.locator('#fc-statut').count(),
        classements: await p.evaluate(() => document.querySelector('#fc-place').closest('.fc-grille').previousElementSibling.dataset.bloc === 'resultat') }, 'Palmarès : fiche unique, course courue'));
    // Mêmes blocs qu'une course à venir ; seuls les champs sans objet pour une course passée sont retirés.
    const champsDe = b => p.evaluate(b => [...document.querySelector('.fc-bloc-titre[data-bloc="' + b + '"]').nextElementSibling.querySelectorAll('[data-k], .fc-gpx, .fc-prep')]
      .map(e => e.dataset.k || e.className), b);
    pb.push(egal({ plan: ['role'], dossard: ['dossard', 'prix'], parcours: ['fc-gpx', 'strategie'], preparation: ['pourquoi'] },
      { plan: await champsDe('plan'), dossard: await champsDe('dossard'), parcours: await champsDe('parcours'), preparation: await champsDe('preparation') },
      'Palmarès : Parcours comme une course à venir (tracé GPX, stratégie) ; Préparation sans plan ; ni statut ni inscription'));
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
    pb.push(egal([['Parcours'], 1, 0, 0], [await p.locator('.pc-cellule > summary').allTextContents(), await p.locator('[data-ob="importer"]').count(), await p.locator('.pc-fiche').count(), await p.locator('.pc-lien-res').count()],
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
    // Rien de saisi n'est caché : sous la Montre, les textes repliés, comme pour une course à venir ; Parcours renseigné, ouvert.
    pb.push(egal({ cellules: ['À propos de la course', 'Parcours', 'Préparation', 'Logistique'], ouvertes: ['Parcours'], textes: ['Semi.', 'STRATÉGIE DE COURSE Partir prudemment.', 'RÔLE DANS LA PRÉPARATION Répétition.', 'Train.'], sous: true, plan: 0 },
      await p.evaluate(() => { const cel = [...document.querySelectorAll('.pc-cellule')], t = e => e.innerText.trim().replace(/\s+/g, ' ');
        const ouv = cel.filter(d => d.open).map(d => d.querySelector('summary').textContent.trim());
        cel.forEach(d => { d.open = true; });
        return { cellules: cel.map(d => d.querySelector('summary').textContent.trim()), ouvertes: ouv, textes: cel.map(d => t(d.querySelector('.pc-corps')).replace(/^Importer un GPX ?/, '')),
          sous: document.querySelector('.pc-textes').getBoundingClientRect().top >= document.querySelector('.pc-resultats').getBoundingClientRect().bottom, plan: document.querySelectorAll('.pc-textes .cal-lignes').length }; }),
      'consultation : À propos, Parcours, Préparation (rôle, sans plan), Logistique, repliés sous la Montre ; Parcours renseigné ouvert'));
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
    pb.push(egal({ haut: 0, debordement: false, cellules: 1 }, await p.evaluate(() => ({ haut: Math.round(document.querySelector('.mc-panneau').getBoundingClientRect().top),
      debordement: document.documentElement.scrollWidth > innerWidth || document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth, cellules: document.querySelectorAll('.pc-cellule').length })), 'téléphone : consultation en plein écran, rien ne dépasse'));
    await ctx.close();

    // Marquer comme courue : bascule en édition, état Courue ; enregistrée, la feuille se ferme.
    d = copie();
    d.courses.find(c => c.id === id(1)).date = '2026-10-20';
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(1), 1200, d, {}, PARIS));
    await p.click('[data-ob="marquer"]');
    await p.waitForSelector('.fc-fiche');
    pb.push(egal([['Annuler', 'Enregistrer', 'Marquer comme courue'], 0, true], [await barre(p), await p.locator('.fc-supprimer').count(), (await titres(p)).includes('Résultat')], 'marquer : édition, état Courue, sans Supprimer'));
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
    pb.push(egal(['Course', 'Place dans le plan', 'Dossard (replié)', 'Parcours (replié)', 'Préparation (replié)', 'Logistique (replié)', 'Liens (replié)'], blocs, 'sept blocs, cinq repliés (ordre de lecture de la page : Dossard, Parcours, Préparation, Logistique)'));
    pb.push(egal(['Choisis d\'abord la date et le format.', true], await p.evaluate(() => [document.querySelector('.fc-prep-note').textContent, document.querySelector('[data-fc="preparer"]').disabled]), 'nouvelle course : « Paramétrer le plan » grisé, date et format d\'abord'));
    pb.push(egal(['Ajouter une course', 'confirmee', 'preparatoire', true], [await p.textContent('#fc-titre'), await lire(p, '#fc-statut'), await lire(p, '#fc-role'), await p.locator('[data-champ="groupe_options"]').isHidden()], 'ajout : titre, statut et rôle proposés, groupe caché'));
    pb.push(egal('ex. 07:30', await p.getAttribute('#fc-heure', 'placeholder'), 'exemple dans l\'heure'));
    // Enregistrer sans rien : champs obligatoires
    await p.click('.fc-plein');
    pb.push(egal({ course: 'Champ obligatoire.', date: 'Champ obligatoire.', type: 'Choisis un type.', format: 'Champ obligatoire.' }, await erreursChamps(p), 'obligatoires : date, course, type, format'));
    pb.push(egal(0, o.copie.ecritures.length, 'rien d\'écrit tant qu\'une erreur demeure'));
    // Ordre : course, parcours, date (avec « Date approximative »), heure
    pb.push(egal(['course', 'parcours', 'date', 'date_approx', 'heure', 'lieu'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')[0].querySelectorAll('[data-k]')].slice(0, 6).map(e => e.dataset.k)), 'ordre : course, parcours, date, jour inconnu, heure'));
    // Contrôles de saisie
    await p.fill('#fc-date', '2026-01-01');
    await p.fill('#fc-course', 'Trail des Lacs');
    await p.selectOption('#fc-type', 'trail');
    await p.fill('#fc-distance', '28,5');
    await p.fill('#fc-heure', '25h');
    await poser(p, 'objectif', 'rapide');
    await poser(p, 'lien', 'www.exemple.org');
    await poser(p, 'prix', '-3');
    await p.click('.fc-plein');
    const e1 = await erreursChamps(p);
    pb.push(egal({ date: 'La date d\'une course à venir ne peut pas être dans le passé.', heure: 'Heure illisible (ex. 07:30).', objectif: 'Format attendu : 02:45:00, Finisher ou Sub 3h',
      lien: 'Lien attendu : il commence par http:// ou https://.', prix: 'Le nombre doit être positif.' }, { date: e1.date, heure: e1.heure, objectif: e1.objectif, lien: e1.lien, prix: e1.prix }, 'contrôles : date passée, heure, objectif, lien, prix'));
    pb.push(egal([true, true, true], await p.evaluate(() => ['objectif', 'lien', 'prix'].map(k => !document.getElementById('fc-' + k).closest('.fc-grille').hidden)), 'un champ en erreur déplie son bloc'));
    pb.push(egal('trail_court', await lire(p, '#fc-format'), 'trail : format proposé d\'après la distance'));
    // Description : 1 000 caractères
    await p.fill('#fc-description', 'x'.repeat(1000));
    pb.push(egal('1000 / 1 000', (await p.textContent('[data-compte="description"]')).replace(/[  ]/g, ' ').replace(/^1 000/, '1000'), 'compteur de description'));
    // Précisions : 100 caractères au plus, compteur
    await deplier(p);
    await p.fill('#fc-objectif_precisions', 'y'.repeat(120));
    pb.push(egal([100, '100 / 100', 'Précisions'], [(await lire(p, '#fc-objectif_precisions')).length, await p.textContent('[data-compte="objectif_precisions"]'),
      await p.evaluate(() => document.getElementById('fc-objectif').closest('.fc-champ').nextElementSibling.querySelector('label').textContent)], 'précisions : sous Objectif, limitées à 100 caractères'));
    // Saisie valide
    await p.fill('#fc-objectif_precisions', 'Partir prudemment.');
    await p.fill('#fc-description', 'Boucle autour du lac.');
    await p.fill('#fc-date', '2027-06-12');
    await p.fill('#fc-heure', '730');
    await p.fill('#fc-parcours', 'La Grande Boucle');
    await p.fill('#fc-lieu', 'Mont-Clair');
    await p.fill('#fc-dplus', '1200');
    await p.fill('#fc-objectif', 'sub 6h');
    await p.fill('#fc-lien', 'https://example.org/lacs');
    await p.fill('#fc-prix', '45,5');
    await p.check('#fc-inscrit');
    await p.fill('#fc-dossard', '77');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w = o.copie.ecritures[0];
    pb.push(egal(['POST', 'courses'], [w.methode, w.table], 'enregistrement : une insertion'));
    pb.push(egal({ etat: 'a_venir', course: 'Trail des Lacs', parcours: 'La Grande Boucle', date: '2027-06-12', date_approx: false, heure: '07:30', lieu: 'Mont-Clair', format: 'trail_court',
      distance: 28.5, dplus: 1200, dmoins: null, objectif: 'Sub 6h', objectif_precisions: 'Partir prudemment.', description: 'Boucle autour du lac.', statut: 'confirmee', role: 'preparatoire', groupe_options: null,
      ouverture_inscriptions: null, ouverture_heure: null, ouverture_approx: false, inscrit: true, inscription: null, dossard: '77', prix: 45.5, strategie: null, pourquoi: null, logistique: null, lien: 'https://example.org/lacs', lien_resultats: null, id: w.corps.id }, w.corps, 'enregistrement : champs écrits'));
    await ctx.close();

    // Nouvelle course : plan réglé avant d'enregistrer ; date approximative : pas de plan
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Trail des Lacs'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court');
    pb.push(egal(['Plan de 12 semaines · début : lun. 22 mars 2027 → jour J : sam. 12 juin 2027', false], await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelector('[data-fc="preparer"]').disabled]), 'nouvelle course : plan tiré de la date et du format saisis'));
    await p.check('#fc-date_approx');
    pb.push(egal(['Plan de 12 semaines · début : lun. 15 mars 2027 → jour J : mar. 1er juin 2027', 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.', false],
      await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelector('.fc-prep-note').textContent, document.querySelector('[data-fc="preparer"]').disabled]), 'date approximative : plan prévu pour le début du mois, mentionné'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.click('[data-bloc="preparation"]'); await p.click('[data-fc="preparer"]'); await p.waitForSelector('.cal-preparer');
    await p.selectOption('.cal-preparer [data-sem="2027-03-22"]', 'developpement');
    await p.click('.cal-preparer [data-act="enregistrer"]');
    pb.push(egal(0, o.copie.ecritures.length, 'nouvelle course : rien d\'écrit avant « Enregistrer »'));
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    {
      const [cw, pw] = o.copie.ecritures;
      pb.push(egal([['POST', 'courses'], true, null, ['POST', 'plan_semaines'], [{ course: cw.corps.id, lundi: '2027-03-22', phase: 'developpement' }]],
        [[cw.methode, cw.table], /^[0-9a-f-]{36}$/.test(cw.corps.id), cw.corps.prepa_semaines, [pw.methode, pw.table], pw.corps], 'nouvelle course : course puis phase modifiée, liées par leur identifiant ; durée du format (rien à ranger)'));
    }
    await ctx.close();

    // Date approximative décochée : le plan se recalcule sur la date précise, phases remises aux règles
    o = await neuve(1200, COURSE(6)); ({ p, ctx } = o);
    pb.push(egal(true, (await p.textContent('#preparation')).replace(/\u00a0/g, ' ').includes('Date approximative : préparation prévue pour le début du mois'), 'page d\'une course à date approximative : mention dans la rubrique Préparation'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Plan de 12 semaines · début : lun. 12 avr. 2027 → jour J : jeu. 1er juil. 2027', await p.textContent('.fc-prep .cal-plan-dates'), 'formulaire, date approximative : plan au 1er du mois'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-07-04'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(['Plan de 12 semaines · début : lun. 12 avr. 2027 → jour J : dim. 4 juil. 2027', 0], [await p.textContent('.fc-prep .cal-plan-dates'), await p.locator('.fc-prep-note').count()], 'case décochée : plan recalculé sur la date précise, sans mention'));
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
      pb.push(egal('Plan de 16 semaines · début : lun. 23 nov. 2026 → jour J : dim. 14 mars 2027', await p.textContent('.fc-prep .cal-plan-dates'), 'date décalée d\'une semaine : plan décalé'));
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
    pb.push(egal(['Dossard', 'Parcours', 'Préparation', 'Logistique', 'Liens'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')].filter(g => g.hidden).map(g => g.previousElementSibling.textContent)), 'modifier : comme pour une nouvelle course, Course et Place dans le plan ouverts, les autres repliés'));
    // Bloc Préparation : résumé du plan, frise, « Paramétrer le plan » par-dessus le formulaire ; Échap ne ferme que la fenêtre du plan
    pb.push(egal(['Plan de 16 semaines · début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027', 1, 'Paramétrer le plan'], await p.evaluate(() => {
      const z = document.querySelector('.fc-prep');
      return [z.querySelector('.cal-plan-dates').textContent, z.querySelectorAll('.cal-frise').length, z.querySelector('[data-fc="preparer"]').textContent.trim()];
    }), 'modifier : plan de la course en tête du bloc Préparation'));
    await ouvrirBloc(p, 'preparation');
    await p.click('[data-fc="preparer"]'); await p.waitForSelector('.cal-preparer');
    pb.push(egal(true, await p.evaluate(() => { const r = document.querySelector('.cal-preparer').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + 10).closest('.cal-preparer') !== null; }), 'Paramétrer le plan : la fenêtre passe devant le formulaire'));
    await p.keyboard.press('Escape');
    pb.push(egal([0, 1], [await p.locator('.cal-voile').count(), await p.locator('.fc-fiche').count()], 'Échap : ferme la fenêtre du plan, le formulaire reste ouvert'));
    // « Valider » : rien n'est écrit ; le résumé suit ; durée et phases s'enregistrent avec la course
    await ouvrirBloc(p, 'preparation');
    await p.click('[data-fc="preparer"]'); await p.waitForSelector('.cal-preparer');
    pb.push(egal('Valider', await p.textContent('.cal-preparer [data-act="enregistrer"]'), 'fenêtre du plan depuis le formulaire : bouton « Valider »'));
    await p.fill('.cal-preparer [name="duree"]', '12'); await p.press('.cal-preparer [name="duree"]', 'Tab');
    await p.click('.cal-preparer [data-act="enregistrer"]');
    pb.push(egal(['Plan de 12 semaines · début : lun. 14 déc. 2026 → jour J : dim. 7 mars 2027', 0], [await p.textContent('.fc-prep .cal-plan-dates'), o.copie.ecritures.length], 'Valider : résumé à 12 semaines, rien d\'écrit avant « Enregistrer »'));
    const rempli = await p.evaluate(() => Object.fromEntries(['date', 'heure', 'course', 'lieu', 'format', 'dplus', 'dmoins', 'role', 'objectif', 'dossard', 'prix', 'logistique', 'lien', 'inscription', 'lien_resultats'].map(k => [k, document.getElementById('fc-' + k).value])));
    pb.push(egal({ date: '2027-03-07', heure: '07:30', course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'trail_long', dplus: '2100', dmoins: '2100', role: 'objectif', objectif: '06:30:00',
      dossard: '1287', prix: '58', logistique: 'Navette depuis le stade à 6 h 30.', lien: 'https://example.org/gorges', inscription: 'https://example.org/gorges/inscription', lien_resultats: 'https://example.org/gorges/resultats' }, rempli, 'modifier : valeurs de la course'));
    pb.push(egal(true, await p.locator('#fc-inscrit').isChecked(), 'modifier : inscrit coché'));
    await p.fill('#fc-objectif', 'Sub 6h30');
    await p.fill('#fc-date', '2027-03-08');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const m = o.copie.ecritures[0];
    pb.push(egal(['PATCH', '?id=eq.' + id(3), 'Sub 6h30', '2027-03-08'], [m.methode, m.filtres, m.corps.objectif, m.corps.date], 'modifier : mise à jour de la course'));
    pb.push(egal(true, !m.corps.etat, 'modifier : l\'état n\'est pas touché'));
    pb.push(egal([12, ['DELETE', 'plan_semaines']], [m.corps.prepa_semaines, o.copie.ecritures.slice(1).map(e => [e.methode, e.table])[0]], 'modifier : durée du plan avec la course, phases remises à plat (aucune modifiée)'));
    // Pas de bouton « Retenir » ni « Marquer » sur une confirmée à venir
    pb.push(egal(0, await p.locator('[data-ob="retenir"], [data-ob="marquer"]').count(), 'confirmée à venir : ni Retenir ni Marquer'));
    await ctx.close();

    // Supprimer
    o = await neuve(1200, COURSE(2)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await p.click('.fc-supprimer');
    pb.push(egal([true, 'Supprimer'], await p.evaluate(() => [document.querySelector('.mrt-dialogue-cadre').classList.contains('is-danger'), document.querySelector('.mrt-dialogue [data-r="oui"]').textContent]),
      'suppression : confirmation du site, encadré d\'Alerte, action « Supprimer »'));
    pb.push(egal('Supprimer cette course ? Cette action est définitive.', await repondre(p, false), 'suppression : confirmation'));
    pb.push(egal(0, o.copie.ecritures.length, 'suppression annulée : rien d\'écrit'));
    await p.click('.fc-supprimer');
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
    pb.push(egal(['Marquer comme courue', ['Course', 'Place dans le plan', 'Dossard', 'Parcours', 'Préparation', 'Logistique', 'Résultat', 'Montre', 'Liens'], 0], [await p.textContent('#fc-titre'),
      await p.locator('.fc-bloc-titre').allTextContents().then(t => t.map(x => x.trim())), await p.locator('.fc-supprimer').count()], 'marquer : fiche d\'une course courue, sans Supprimer'));
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
    await p.fill('#fc-course', 'X'); await p.fill('#fc-date', '2027-06-12'); await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', { index: 1 });
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-msg:has-text("Enregistrement impossible")');
    pb.push(egal(1, await p.locator('.fc-fiche').count(), 'panne : le formulaire reste ouvert'));
    await ctx.close();

    // Palmarès : la fiche unique (§ 3.8), blocs d'une course courue ; classements dans Résultat ; ni Vitesse, ni Statut ; DNF vide le temps et l'allure
    const pal = JSON.parse(JSON.stringify(db)); pal.ecritures = [];
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, pal));
    await p.click('[data-act="add"]');
    const labels = sel => p.evaluate(s => [...document.querySelector(s).nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()), sel);
    pb.push(egal(['Course', 'Place dans le plan', 'Dossard', 'Parcours', 'Préparation', 'Logistique', 'Résultat', 'Montre', 'Liens'], (await p.locator('.fc-bloc-titre').allTextContents()).map(x => x.trim()), 'Palmarès : blocs de la fiche unique'),
      egal(['Course', 'Parcours', 'Date', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions', 'Description'], await labels('[data-bloc="course"]'), 'Palmarès : bloc Course, dans l\'ordre'),
      egal([['Place au général', 2], ['Effectif du général', 2], ['Catégorie', 3], ['Place en catégorie', 3], ['Effectif de la catégorie', 3], ['Place par sexe', 2], ['Effectif par sexe', 2]],
        await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; g.hidden = false; const l = g.getBoundingClientRect().width;
          return [...g.children].slice(2).map(e => [e.querySelector(':scope > label').textContent.trim(), Math.round(l / e.getBoundingClientRect().width)]); }),
        'Palmarès : classements dans Résultat, général et sexe sur toute la largeur (deux champs), catégorie à gauche de la place en catégorie (trois champs)'),
      egal(['Temps', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Allure moyenne (par km)', 'FC moyenne (bpm)'], await labels('[data-bloc="montre"]'), 'Palmarès : Montre, temps et distance, D+ et D−, allure et FC'),
      egal(['M0', 'M10', 15], await p.evaluate(() => { const o = [...document.querySelectorAll('#fc-categorie option')].map(x => x.value).filter(Boolean); return [o[4], o[14], o.length]; }), 'Palmarès : catégories FFA (CA, JU, ES, SE, M0 à M10)'),
      egal(['Temps', 'Non terminée (DNF)', 'Allure moyenne (par km)', 'Place au général', 'Effectif du général', 'Catégorie', 'Place en catégorie', 'Effectif de la catégorie', 'Place par sexe', 'Effectif par sexe'],
        await labels('[data-bloc="resultat"]'), 'Palmarès : bloc Résultat (résultat puis classements), sans vitesse'),
      egal(0, await p.locator('#fc-vitesse, #fc-montre_vitesse, #fc-statut, #fc-date_approx, #fc-inscrit').count(), 'Palmarès : ni Vitesse, ni Statut, ni date approximative, ni Inscrit'),
      egal('fc-course', await p.evaluate(() => document.activeElement.id), 'Palmarès : curseur dans Course'));
    const pos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dossardDansDossard: document.getElementById('fc-dossard').closest('.fc-grille').previousElementSibling.dataset.bloc === 'dossard',
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2,
        description: r('fc-description').top > r('fc-dmoins').bottom }; });
    pb.push(egal({ dossardDansDossard: true, distanceSeule: true, dplusDmoins: true, description: true }, pos, 'Palmarès : dossard dans le bloc Dossard, distance seule, D+ et D− côte à côte, description dessous'));
    await p.fill('#fc-temps', '49:18'); await p.fill('#fc-allure', '4:56');
    await p.check('#fc-dnf');
    pb.push(egal(['', '', true, true], [await p.inputValue('#fc-temps'), await p.inputValue('#fc-allure'), await p.isDisabled('#fc-temps'), await p.isDisabled('#fc-allure')], 'DNF coché : temps et allure vidés et grisés'));
    await p.uncheck('#fc-dnf');
    await p.fill('#fc-course', 'Course d\'essai DNF'); await p.fill('#fc-date', '2026-10-11'); await p.selectOption('#fc-type', 'route'); await p.selectOption('#fc-format', 'route_10km');
    await p.fill('#fc-allure', '5:00'); await p.click('.fc-plein');
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
    pb.push(egal(['Course', 'Parcours', 'Date', 'Date approximative (mois seulement)', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions', 'Description'], ordre.labels, 'Objectif : ordre du bloc Course'),
      egal([true, true, true, true], [ordre.distanceSeule, ordre.dplusDmoins, ordre.descriptionDessous, /^Texte libre/.test(ordre.exemple)], 'Objectif : distance seule, D+ et D− côte à côte, description dessous avec un exemple de texte libre'));
    await p.click('[data-bloc="dossard"]');
    const dos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { ligne1: Math.abs(r('fc-ouverture_inscriptions').top - r('fc-ouverture_heure').top) < 2 && r('fc-ouverture_heure').left > r('fc-ouverture_inscriptions').right
          && Math.abs(r('fc-ouverture_approx').top - r('fc-inscrit').top) < 2 && r('fc-ouverture_approx').top > r('fc-ouverture_heure').bottom,
        ligne2: Math.abs(r('fc-dossard').top - r('fc-prix').top) < 2 && r('fc-dossard').top > r('fc-ouverture_inscriptions').bottom,
        site: r('fc-inscription').top > r('fc-ouverture_inscriptions').bottom && r('fc-dossard').top > r('fc-inscription').bottom, grise: document.getElementById('fc-dossard').disabled }; });
    pb.push(egal({ ligne1: true, ligne2: true, site: true, grise: true }, dos, 'Objectif : Dossard (ouverture et heure, puis Mois seulement et Inscrit, puis site d\'inscription, puis numéro et prix) ; numéro grisé tant que non inscrit'));
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
    pb.push(egal({ memeLigne: true, aDroite: true }, ligne, 'téléphone : « Date approximative » à droite de la date'));
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
    pb.push(egal(0, await p.locator('[data-ob]:not([data-ob="fermer"])').count(), 'lecture seule : ni Modifier ni Retenir'));
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
        seances: ['2026-10-19', '2026-10-20', '2026-10-21'].map(j => { const e = document.querySelector('.cal-a-j[data-jour="' + j + '"] .cal-a-se'); return e ? [e.textContent, e.classList.contains('faite')] : null; }),
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
    const LEGENDE = [['Route', 'Confirmée', 'Option'], ['Trail', 'Confirmée', 'Option'], 'Courue', 'Aujourd\'hui'];
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#annee', w, db, {}, PARIS);
      const r = await lire(p), tel = w < 600;
      pb.push(
        egal([['6 mois', ['Semaine', 'Mois', '3 mois', '6 mois *', 'Année']], 'Octobre 2026 – mars 2027', ['avr.–sept. 26', 'avr.–sept. 27'], null], [r.vue, r.titre, r.voisins, r.p20], nom + ', menu « Périodicité » sur 6 mois (par défaut), voisines ; Plan éteint : pas de fond de phase'),
        egal([tel ? [3, 3] : [6], ['oct. 26', 'nov.', 'déc.', 'janv. 27', 'févr.', 'mars']], [r.blocs, r.mois], nom + ', ' + (tel ? 'deux blocs de trois mois' : 'un bloc de six mois')),
        egal(COURSES, r.courses, nom + ', courses écrites dans leur case, à leur couleur'),
        egal([0, 0, false, LEGENDE], [r.nbPhases, r.barres, r.plan, r.legende], nom + ', bouton « Plan » éteint par défaut : ni fond de phase ni légende des phases'),
        egal([['Renforcement', true], ['Course à pied · Renforcement', false], null], r.seances, nom + ', séances du jour en toutes lettres (barrées quand elles sont faites), rien un jour sans séance'),
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
        egal([['3px', 'rgb(143, 168, 201)'], ['3px', 'rgb(230, 184, 77)'], ['3px', 'rgb(180, 142, 240)'], 'rgb(255, 122, 69)', true],
          [r.l12, r.l20, r.lGorges, r.gorges, r.titre20.endsWith('aujourd\'hui · Course à pied 8×400 m · Renforcement Gainage 20 min')], nom + ', liseré de 3 px de la couleur pleine de la phase (deload le 8 décembre, développement le 12 janvier, affûtage le 7 mars), une course garde sa couleur, infobulle : les séances (Entretien : pas de phase)'),
        egal(LEGENDE.concat([['Phases', 'Base', 'Développement', 'Affûtage', 'Deload', 'Récupération']]), r.legende, nom + ', légende des phases, Récupération comprise'),
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
    pb.push(egal([[6, 6], 'Octobre 2026 – septembre 2027', '12'], [r.blocs, r.titre, await p.evaluate(() => localStorage.getItem('mrt-calendrier-mois'))], '12 mois : deux blocs de six, retenu sur l\'appareil'));
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

  // Spécification du Calendrier, § 10 : vue Mois (la grille du mois, mois par mois).
  async calendrierMois(nav, db0) {
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
      const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const cases = [...document.querySelectorAll('.cal-m-case')], jourDe = e => e.closest('.cal-m-case').dataset.jour;
      return {
        vue: [document.querySelector('[data-menu]').textContent.trim(), [...document.querySelectorAll('.cal-menu a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))],
        titre: t('.cal-titre'), voisins: [...document.querySelectorAll('.cal-voisin-txt')].map(e => e.textContent),
        jours: [...document.querySelectorAll('.cal-m-jours span')].map(s => s.textContent),
        nb: cases.length, hors: cases.filter(c => c.classList.contains('hors')).map(c => c.dataset.jour),
        auj: [...document.querySelectorAll('.cal-m-num.auj')].map(jourDe),
        courses: [...document.querySelectorAll('.cal-m-case .cal-v-course')].map(a => [jourDe(a), a.textContent, [...a.classList].find(c => /^c-|^courue$/.test(c))]),
        rdv: [...document.querySelectorAll('.cal-m-case .cal-v-rdv')].map(a => [jourDe(a), a.textContent]),
        seances: [...document.querySelectorAll('.cal-m-case .cal-v-se')].map(e => [jourDe(e), e.querySelector('.cal-v-se-txt').textContent.replace(/\s+/g, ' ').trim(), e.querySelector('input').checked]),
        plus: document.querySelectorAll('.cal-m-case [data-ajout]').length,
        phases: cases.filter(c => /\bph-/.test(c.className)).map(c => [c.dataset.jour, [...c.classList].find(x => x.startsWith('ph-'))]),
        legende: [...document.querySelectorAll('.cal-legende .cal-groupe > span')].map(x => x.textContent),
        texteVisible: getComputedStyle(document.querySelector('.cal-m-txt')).display !== 'none', reperes: getComputedStyle(document.querySelector('.cal-m-points')).display !== 'none',
        // Un seul fond : jour voisin (28 sept.) et jour du mois (7 oct.), jour passé (19) et à venir (21) ; « + » à contour Accent.
        fonds: (f => [f('2026-09-28') === f('2026-10-07'), f('2026-10-19') === f('2026-10-21')])(j => (e => e && getComputedStyle(e).backgroundColor)(document.querySelector('.cal-m-case[data-jour="' + j + '"]'))),
        plusAccent: (b => { const i = document.createElement('i'); i.style.color = 'var(--accent)'; document.body.append(i); const a = getComputedStyle(i).color; i.remove();
          return !!b && getComputedStyle(b).borderTopColor === a && getComputedStyle(b).color === a; })(document.querySelector('.cal-m-case [data-ajout]')),
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    const SEANCES = [['2026-10-19', 'Renforcement Gainage 30 min', true], ['2026-10-20', 'Course à pied 8×400 m', false], ['2026-10-22', 'Course à pied Footing 45 min', false], ['2026-10-24', 'Course à pied Sortie 1 h 30', false]];
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', w, copie(), {}, PARIS);
      const r = await lire(p), tel = w < 600;
      pb.push(
        egal([['Mois', ['Semaine', 'Mois *', '3 mois', '6 mois', 'Année']], 'Octobre 2026', ['sept.', 'nov.'], ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']], [r.vue, r.titre, r.voisins, r.jours], nom + ', menu « Périodicité » sur Mois, mois en cours et ses voisins, jours de la semaine'),
        egal([35, ['2026-09-28', '2026-09-29', '2026-09-30', '2026-11-01'], ['2026-10-20']], [r.nb, r.hors, r.auj], nom + ', cinq semaines, jours des mois voisins atténués, aujourd\'hui'),
        egal([[['2026-10-04', 'Semi de San Sebastián', 'courue']], [['2026-11-01', '◆ Inscriptions · Corrida de Noël']]], [r.courses, r.rdv], nom + ', course courue et rendez-vous clé'),
        egal([SEANCES, 35, [], [], [true, true]], [r.seances, r.plus, r.phases, r.legende, r.fonds], nom + ', séances à cocher, un « + » par case, ni phases ni légende ; un seul fond pour toutes les cases'),
        ...(tel ? [] : [egal(true, r.plusAccent, nom + ', « + » à contour Accent')]),
        egal([!tel, tel], [r.texteVisible, r.reperes], nom + ', ' + (tel ? 'des repères à la place du texte' : 'le texte des cases')),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-mois-' + nom.replace('é', 'e') + '.png'), fullPage: true });
      await ctx.close();
    }
    // Plan : le fond de chaque jour à la couleur de la phase de sa semaine, le même pour tous ses jours, et la légende.
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', 1200, d, { 'mrt-calendrier-phases': '1' }, PARIS);
    let r = await lire(p);
    pb.push(egal([0, ['Base', 'Développement', 'Affûtage', 'Deload', 'Récupération']], [r.phases.length, r.legende], 'Plan, octobre : Entretien (pas encore de saison), aucun fond de phase ; légende avec Récupération'));
    await p.goto(RACINE + 'calendrier.html#mois=2026-12'); await p.waitForSelector('.cal-m-grille');
    r = await lire(p);
    const fondM = j => p.evaluate(x => getComputedStyle(document.querySelector('.cal-m-case[data-jour="' + x + '"]')).backgroundColor, j);
    pb.push(egal([35, 'ph-base', 'ph-deload', 'ph-developpement', true, true],
      [r.phases.length, (r.phases.find(x => x[0] === '2026-12-01') || [])[1], (r.phases.find(x => x[0] === '2026-12-07') || [])[1], (r.phases.find(x => x[0] === '2027-01-01') || [])[1],
        await fondM('2026-12-01') === await fondM('2026-12-06'), await fondM('2026-12-29') === await fondM('2027-01-02')],
      'Plan, décembre : fond de phase de la saison du Trail des Gorges (base, deload la semaine du 7, développement le 1er janvier), le même pour toute la semaine, jours voisins compris'));
    await ctx.close();
    // Navigation, case « faite », « + », séance touchée, jour touché, course et rendez-vous touchés.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#mois', 1200, d, {}, PARIS));
    await surDialogue(p, () => true);
    await p.click('[aria-label="Mois suivant"]'); await pause();
    r = await lire(p);
    pb.push(egal(['#mois=2026-11', 'Novembre 2026', ['oct.', 'déc.'], true], [await p.evaluate(() => location.hash), r.titre, r.voisins, r.courses.some(c => c[0] === '2026-11-15' && c[1] === 'Trail du Lac' && c[2] === 'c-trail-v')],
      'mois suivant : novembre, le Trail du Lac le 15'));
    await p.click('[aria-label="Mois suivant"]'); await pause(); await p.click('[aria-label="Mois suivant"]'); await pause();
    r = await lire(p);
    pb.push(egal(['Janvier 2027', ['déc. 26', 'févr.']], [r.titre, r.voisins], 'janvier 2027 : l\'année du mois voisin quand elle change'));
    await p.click('.cal-auj'); await pause();
    pb.push(egal(['#mois', 'Octobre 2026'], [await p.evaluate(() => location.hash), (await lire(p)).titre], '« Aujourd\'hui » : le mois en cours'));
    await p.locator('[data-fait="se-2"]').check();
    for (let i = 0; i < 20 && !d.ecritures.some(e => e.table === 'seances'); i++) await p.clock.runFor(100);
    pb.push(egal({ methode: 'PATCH', corps: { faite: true } }, (({ methode, corps }) => ({ methode, corps }))(d.ecritures.find(e => e.table === 'seances')), 'case « faite » cochée dans une case : écriture'));
    await p.click('[data-ajout="2026-10-21"]');
    await p.fill('.cal-seance [name="libelle"]', 'Footing 30 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([{ date: '2026-10-21', type: 'run', libelle: 'Footing 30 min' }, true], [(({ date, type, libelle }) => ({ date, type, libelle }))(d.seances[d.seances.length - 1]),
      (await lire(p)).seances.some(x => x[0] === '2026-10-21' && x[1] === 'Course à pied Footing 30 min')], '« + » d\'une case : séance ajoutée à ce jour'));
    await p.click('[data-edit="se-3"]');
    pb.push(egal('Footing 45 min', await p.inputValue('.cal-seance [name="libelle"]'), 'séance touchée : sa fenêtre'));
    await p.click('.cal-seance [data-act="annuler"]');
    await p.click('.cal-m-case[data-jour="2026-10-23"] .cal-m-num');
    pb.push(egal('#semaines=2026-10-19', await p.evaluate(() => location.hash), 'jour touché : la vue Semaine, depuis le lundi 19'));
    await p.goto(RACINE + 'calendrier.html#mois=2026-11'); await p.waitForSelector('.cal-m-grille');
    pb.push(egal('course.html?id=' + id(2) + '#preparation', await p.getAttribute('.cal-v-rdv', 'href'), 'rendez-vous clé : lien vers la page de la course'));
    await p.click('.cal-v-course');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(1), await p.evaluate(() => history.state && history.state.mrtCourse), 'course touchée : sa page en modale'));
    pb.push(egal([], erreurs, 'Mois : erreurs JavaScript'));
    await ctx.close();
    // Lecture seule
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.seances = partage.seances.map(x => Object.assign({}, x, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#mois', 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal([0, 4], [await p.locator('[data-ajout], [data-edit]').count(), await p.locator('.cal-v-se input:disabled').count()], 'lecture seule : ni « + » ni modification, cases « faite » grisées'));
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
        courante: (document.querySelector('.cal-s-semaine.is-courante .cal-s-titre') || {}).textContent || null,
        dates: [...document.querySelectorAll('.cal-s-semaine:first-of-type .cal-s-date')].map(e => e.textContent),
        auj: [...document.querySelectorAll('.cal-s-ligne.auj')].map(e => e.dataset.jourLigne),
        seances: [...document.querySelectorAll('.cal-s-ligne .cal-v-se')].map(e => [ligne(e), e.querySelector('.cal-v-se-txt').textContent.replace(/\s+/g, ' ').trim(), e.querySelector('input').checked]),
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
        egal([['Semaine', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], true, '↑ Afficher les semaines passées'], [r.vue, r.uneLigne, r.passees], nom + ', vue Semaine par défaut (menu « Périodicité »), barre du haut sur une ligne, lien vers les semaines passées'),
        egal([SEMAINES, 'Semaine du 19 au 25 oct.'], [r.semaines.slice(0, 3), r.courante], nom + ', la semaine en cours d\'abord, puis les suivantes'),
        egal([['19lun.', '20mar.', '21mer.', '22jeu.', '23ven.', '24sam.', '25dim.'], ['2026-10-20']], [r.dates, r.auj], nom + ', numéro et nom de chaque jour, aujourd\'hui mis en avant'),
        egal([[['2026-10-19', 'Renforcement Gainage 30 min', true], ['2026-10-20', 'Course à pied 8×400 m', false], ['2026-10-22', 'Course à pied Footing 45 min', false], ['2026-10-24', 'Course à pied Sortie 1 h 30', false]],
          [['2026-11-01', '◆ Ouverture des inscriptions · Corrida de Noël']]], [r.seances, r.rdv], nom + ', séances à cocher, rendez-vous clé'),
        egal([r.semaines.length * 7, false, false], [r.plus, /Faites/.test(r.texte), /Développement/.test(r.texte)], nom + ', un « + » par jour ; ni « Faites », ni nom de phase'),
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
    await p.click('[data-ajout="2026-10-21"]');
    await p.click('.cal-seance button[type="submit"]');
    pb.push(egal('Écris le libellé de la séance.', await p.textContent('.cal-msg'), 'séance sans libellé : message'));
    await p.fill('.cal-seance [name="libelle"]', 'Footing 30 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([{ date: '2026-10-21', type: 'run', libelle: 'Footing 30 min' }, true], [(({ date, type, libelle }) => ({ date, type, libelle }))(d.seances[d.seances.length - 1]),
      (await lire(p)).seances.some(x => x[0] === '2026-10-21' && x[1] === 'Course à pied Footing 30 min')], 'séance ajoutée : écriture, affichée au bon jour'));
    await p.click('[data-edit="se-3"]');
    await p.selectOption('.cal-seance [name="type"]', 'renfo'); await p.fill('.cal-seance [name="libelle"]', 'Gainage 20 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal(['Renforcement Gainage 20 min'], (await lire(p)).seances.filter(x => x[0] === '2026-10-22').map(x => x[1]), 'séance modifiée'));
    await p.click('[data-edit="se-3"]');
    await p.click('[data-act="supprimer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([], (await lire(p)).seances.filter(x => x[0] === '2026-10-22'), 'séance supprimée'));
    pb.push(egal([], erreurs, 'Semaine : erreurs JavaScript'));
    await ctx.close();
    // Plan : le fond des jours à la couleur de la phase de la semaine (le même pour tous ses jours), et la légende ; pas de nom de phase.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS));
    let r = await lire(p);
    pb.push(egal([0, ['Base', 'Développement', 'Affûtage', 'Deload', 'Récupération']], [r.phases.filter(x => x[0] >= '2026-10-19' && x[0] <= '2026-10-25').length, r.legende],
      'Plan, semaine du 19 octobre : Entretien, pas de fond ; légende avec Récupération'));
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
    pb.push(egal([0, 4], [await p.locator('[data-ajout], [data-edit]').count(), await p.locator('.cal-v-se input:disabled').count()], 'lecture seule : ni « + » ni modification, cases « faite » grisées'));
    await ctx.close();
    return pb;
  },

  // Spécification du Calendrier, § 10 : rubrique Préparation de la page d'une course (plan, frise, séances, « Paramétrer le plan »).
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

    // --- Rubrique Préparation de la page d'une course
    const B = 'Base', D = 'Développement', DL = 'Deload', A = 'Affûtage';
    const attendu = [B, B, B, DL, B, B, D, DL, D, D, D, DL, D, D, A, A];
    const ouvertePrep = async (d, idCourse, largeur = 1200, opts = PARIS, st = {}) => {
      const o = await ouvrir(nav, 'course.html?id=' + idCourse + '#preparation', largeur, d, st, opts);
      await o.p.waitForSelector('#preparation');
      return o;
    };
    d = copie();
    ({ p, ctx, erreurs } = await ouvertePrep(d, GORGES));
    await surDialogue(p, () => true);
    pb.push(
      egal(true, await p.evaluate(() => { const e = document.querySelector('#preparation'); const r = e.getBoundingClientRect(); return e.open && r.top >= 0 && r.top < innerHeight; }), 'page de la course : rubrique ouverte et à l\'écran'),
      egal('Préparation', await p.evaluate(() => document.querySelector('#preparation summary').textContent.trim()), 'rubrique : titre'),
      egal('Plan de 16 semaines · début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027', await p.textContent('#preparation .cal-plan-dates'), 'rubrique : durée et dates'),
      egal(['Première semaine', 'Semaine 1 · du 16 au 22 nov.', B], await p.evaluate(() => [document.querySelector('.cal-prep-lib').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-titre').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-phase').textContent]), 'rubrique : première semaine mise en avant'),
      egal(attendu, await p.evaluate(() => [...document.querySelectorAll('.cal-toutes .cal-sem-phase')].map(e => e.textContent)), 'rubrique : phases des 16 semaines'),
      egal(['Base 3 sem.', 'Deload 1 sem.', 'Base 2 sem.', 'Développement 1 sem.', 'Deload 1 sem.', 'Développement 3 sem.', 'Deload 1 sem.', 'Développement 2 sem.', 'Affûtage 2 sem.'],
        await p.evaluate(() => [...document.querySelectorAll('#preparation > .pc-corps > .cal-lignes > .cal-frise-defile > .cal-frise .cal-seg')].map(e => e.textContent.replace(/\s+/g, ' ').replace(/(\D)(\d)/, '$1 $2').trim())), 'rubrique : frise'),
      egal(false, await p.evaluate(() => document.querySelector('.cal-toutes').open), 'rubrique : « Toutes les semaines » repliée'),
      egal([['dim. 13', 'Corrida de Noël'], ['dim. 7', 'Trail des Gorges']], await p.evaluate(() => [...document.querySelectorAll('.cal-toutes .cal-jr-course')].map(e => [e.closest('.cal-jr').querySelector('.cal-jr-nom').textContent, e.textContent])), 'rubrique : jours de course dans leurs semaines'));
    // Séance ajoutée depuis la rubrique : liée à la course
    await p.click('.cal-prep-lib + .cal-sem [data-ajout="2026-11-17"]');
    await p.fill('.cal-seance [name="libelle"]', 'Footing 40 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal({ date: '2026-11-17', course: GORGES }, (({ date, course }) => ({ date, course }))(d.seances[d.seances.length - 1]), 'séance ajoutée depuis la rubrique : liée à la course'),
      egal(['Course à pied Footing 40 min'], await p.evaluate(() => [...document.querySelectorAll('.cal-prep-lib + .cal-sem .cal-se')].map(e => e.textContent.trim().replace(/\s+/g, ' '))), 'séance affichée dans la semaine mise en avant'));
    // Préparer : durée de 20 semaines, une semaine en Base, puis recalcul
    await p.click('#preparation [data-preparer]');
    await p.fill('.cal-prep [name="duree"]', '20'); await p.dispatchEvent('.cal-prep [name="duree"]', 'change');
    pb.push(egal('Début : lun. 19 oct. 2026 → jour J : dim. 7 mars 2027 · durée du format : 16 sem.', await p.textContent('.cal-prep .cal-plan-dates'), 'Préparer : 20 semaines, début le 19 octobre'));
    await p.selectOption('.cal-prep [data-sem="2026-12-07"]', 'base');
    await p.click('[data-act="enregistrer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal(20, d.courses.find(c => c.id === GORGES).prepa_semaines, 'Préparer : durée de la course écrite'),
      egal([{ course: GORGES, lundi: '2026-12-07', phase: 'base' }], d.plan_semaines.map(x => ({ course: x.course, lundi: x.lundi, phase: x.phase })), 'Préparer : seule la semaine modifiée est rangée'),
      egal('Plan de 20 semaines · début : lun. 19 oct. 2026 → jour J : dim. 7 mars 2027', await p.textContent('#preparation .cal-plan-dates'), 'rubrique : plan de 20 semaines affiché'),
      egal(['Semaine en cours', 'Semaine 1 · du 19 au 25 oct.'], await p.evaluate(() => [document.querySelector('.cal-prep-lib').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-titre').textContent]), 'rubrique : la semaine en cours est mise en avant'),
      egal('Base · modifiée', await p.evaluate(() => document.querySelector('.cal-toutes .cal-sem[data-lundi="2026-12-07"] .cal-sem-phase').textContent), 'semaine modifiée repérée'));
    await p.click('#preparation [data-preparer]');
    await p.click('[data-act="recalculer"]');
    await p.click('[data-act="enregistrer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([], d.plan_semaines, 'Recalculer : plus aucune semaine modifiée'),
      egal('Deload', await p.evaluate(() => document.querySelector('.cal-toutes .cal-sem[data-lundi="2026-12-07"] .cal-sem-phase').textContent), 'Recalculer : la semaine du 7 décembre est de nouveau en Deload'));
    // Téléphone : la frise des 16 semaines (2 rem par semaine) dépasse la largeur et défile de gauche à droite
    {
      const t = await ouvertePrep(copie(), GORGES, 390);
      const f = await t.p.evaluate(() => { const z = document.querySelector('#preparation .cal-frise-defile'); z.scrollLeft = 120;
        return { defile: z.scrollWidth > z.clientWidth, decale: z.scrollLeft > 0, page: document.documentElement.scrollWidth <= innerWidth }; });
      pb.push(egal({ defile: true, decale: true, page: true }, f, 'téléphone : frise de préparation plus large que l\'écran, qui défile de gauche à droite, sans élargir la page'));
      await t.ctx.close();
    }
    // Frise : glisser la première poignée d'une semaine vers la droite
    await p.click('#preparation [data-preparer]');
    const poignee = await p.locator('.cal-poignee').first().boundingBox(), frise = await p.locator('.cal-frise.is-edit').boundingBox();
    pb.push(egal(await p.locator('.cal-frise.is-edit .cal-seg').count() - 1, await p.locator('.cal-poignee').count(), 'Préparer : une poignée entre deux phases'));
    await p.mouse.move(poignee.x + poignee.width / 2, poignee.y + poignee.height / 2);
    await p.mouse.down();
    await p.mouse.move(frise.x + frise.width * 4 / 20 + 2, poignee.y + poignee.height / 2, { steps: 5 });
    await p.mouse.up();
    pb.push(egal('base', await p.inputValue('.cal-prep [data-sem="2026-11-09"]'), 'frise : la semaine 4 passe en Base en glissant la limite'));
    await p.click('[data-act="annuler"]');
    pb.push(egal([], d.plan_semaines, 'Annuler : rien n\'est rangé'), egal([], erreurs, 'rubrique : erreurs JavaScript'));
    await ctx.close();

    // Plan en cours (Trail du Lac), option, course sans durée, sans l'adresse #preparation
    ({ p, ctx } = await ouvertePrep(copie(), id(1)));
    pb.push(egal(['Semaine en cours', 'Semaine 9 · du 19 au 25 oct.', D, 4], await p.evaluate(() => [document.querySelector('.cal-prep-lib').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-titre').textContent,
      document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-phase').textContent, document.querySelectorAll('.cal-prep-lib + .cal-sem .cal-se').length]), 'Trail du Lac : semaine en cours, phase et séances'),
      egal(12, await p.locator('.cal-toutes .cal-sem').count(), 'Trail du Lac : douze semaines dans « Toutes les semaines »'));
    await p.click('.cal-toutes summary');
    pb.push(egal(true, await p.evaluate(() => document.querySelector('.cal-toutes').open), '« Toutes les semaines » se déplie'));
    await ctx.close();
    ({ p, ctx } = await ouvertePrep(copie(), id(4)));
    pb.push(egal(1, await p.locator('#preparation').count(), 'une option a sa rubrique Préparation'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + GORGES, 1200, copie(), {}, PARIS));
    pb.push(egal(0, await p.evaluate(() => window.scrollY), 'sans #preparation : pas de défilement'));
    await ctx.close();
    d = copie();
    d.courses.find(c => c.id === id(2)).format = 'tri_s';
    ({ p, ctx } = await ouvertePrep(d, id(2)));
    pb.push(egal(true, (await p.textContent('#preparation .cal-vide')).startsWith('Pas encore de plan'), 'format sans durée : pas de plan'));
    pb.push(egal(['Paramétrer le plan', false], await p.evaluate(() => { const b = document.querySelector('#preparation [data-preparer]'); return [b.textContent.trim(), b.classList.contains('is-principal')]; }), 'bouton « Paramétrer le plan » : à contour'));
    await p.click('#preparation [data-preparer]');
    await p.fill('.cal-prep [name="duree"]', '10'); await p.dispatchEvent('.cal-prep [name="duree"]', 'change');
    await p.click('[data-act="enregistrer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal(true, (await p.textContent('#preparation .cal-plan-dates')).startsWith('Plan de 10 semaines'), 'durée choisie pour un format sans durée'));
    await ctx.close();

    // Lecture seule : la rubrique s'affiche, sans « Paramétrer le plan » ni saisie.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.seances = partage.seances.map(x => Object.assign({}, x, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvertePrep(partage, id(1), 1200, PARIS, { 'mrt-vue': autre }));
    pb.push(egal([1, 0, 0], [await p.locator('#preparation').count(), await p.locator('[data-preparer]').count(), await p.locator('#preparation [data-ajout], #preparation [data-edit]').count()], 'lecture seule : la rubrique s\'affiche, sans « Préparer » ni saisie'));
    await ctx.close();
    if (CAPTURES) {
      ({ p, ctx } = await ouvertePrep(copie(), id(1)));
      await p.screenshot({ path: path.join(__dirname, 'captures', 'course-preparation.png'), fullPage: true });
      await p.click('#preparation [data-preparer]');
      await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-preparer.png') });
      await ctx.close();
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
    const lire = p => p.evaluate(() => {
      const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const ph = l => { const e = document.querySelector('.ps-sem[data-lundi="' + l + '"] .ps-ph'); return e ? [...e.classList].find(c => c.startsWith('ph-')) : null; };
      return {
        titre: t('.ps-titre'), etat: t('.ps-etat'), vide: t('.ps-vide'),
        semaines: [...document.querySelectorAll('.ps-sem')].map(e => e.dataset.lundi),
        phases: ['2026-11-09', '2026-11-16', '2026-11-30', '2027-03-08', '2027-04-12', '2027-04-19', '2027-05-03', '2027-05-10', '2027-08-16', '2027-08-30'].map(ph),
        marques: [...document.querySelectorAll('.ps-marque[href]')].map(a => a.title.split(' · ')[0] + ' ' + [...a.classList].filter(c => c !== 'ps-marque').join(' ')),
        alertes: [t('.ps-alertes .ps-libelle'), ...[...document.querySelectorAll('.ps-alerte')].map(e => e.dataset.alerte)],
        textesAlertes: [...document.querySelectorAll('.ps-alerte')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
        bloc: [...document.querySelectorAll('.ps-bloc .cal-sem')].map(e => e.dataset.lundi + ' ' + e.querySelector('.cal-sem-phase').textContent),
        reperes: [...document.querySelectorAll('.ps-reperes li')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
        plus: document.querySelectorAll('.ps-bloc [data-ajout]').length,
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    // Le jeu d'essai : Trail du Lac (Préparatoire), Corrida de Noël (Plaisir), Trail des Gorges (ancien objectif intermédiaire : un Objectif),
    // Trail des Cimes et Ultra du Plateau (options), Trail des Crêtes (Objectif).
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', w, copie(), {}, PARIS);
      await p.waitForSelector('.ps-cadre');
      const r = await lire(p);
      pb.push(
        egal(['Saison : vers « Trail des Gorges » · dim. 7 mars 2027 (dans 20 sem.)', '2026-10-19', '2027-10-25'], [r.titre, r.semaines[0], r.semaines[r.semaines.length - 1]],
          nom + ', saison visée ; frise de la semaine en cours à la fin de la récupération du dernier Objectif'),
        egal(['ph-entretien', 'ph-base', 'ph-base', 'ph-recuperation', 'ph-recuperation', 'ph-entretien', 'ph-entretien', 'ph-base', 'ph-affutage', 'ph-recuperation'], r.phases,
          nom + ', phases : Entretien avant la saison, saison du Trail des Gorges dès le 16 novembre, Récupération jusqu\'au 17 avril, Entretien, saison du Trail des Crêtes dès le 10 mai, affûtage dès le 16 août'),
        egal(['Trail du Lac r-preparatoire', 'Corrida de Noël r-plaisir', 'Trail des Gorges r-objectif', 'Trail des Cimes r-preparatoire is-option', 'Ultra du Plateau r-preparatoire is-option', 'Trail de la Forêt r-preparatoire is-option', 'Trail des Crêtes r-objectif'], r.marques,
          nom + ', courses sur la frise, repérées par leur rôle, options en pointillé'),
        egal(['Alertes (0)'], r.alertes, nom + ', pas d\'alerte (25 semaines entre les deux Objectifs, options sans règle)'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'preparation-' + nom.replace('é', 'e') + '.png'), fullPage: true });
      await ctx.close();
    }
    // État de la semaine, bloc en cours et repères.
    let { p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
    await p.waitForSelector('.ps-cadre');
    let r = await lire(p);
    pb.push(egal(['2026-10-19 Entretien', '2026-10-26 Entretien', '2026-11-02 Entretien', '2026-11-09 Entretien'], r.bloc, 'bloc en cours : 4 semaines à partir du 19 octobre, en Entretien'));
    pb.push(egal(true, /^Cette semaine : Entretien, jusqu'au .*15 nov.* ; la saison commence le .*16 nov/.test(r.etat), 'état de la semaine : Entretien jusqu\'au 15 novembre (' + r.etat + ')'));
    pb.push(egal([true, true, 28], [r.reperes.some(x => /^Allégé du .*12 nov.* au .*14 nov.* : avant Trail du Lac \(Préparatoire\)\.$/.test(x)), r.reperes.length === 1, r.plus],
      'repère de la semaine du 9 novembre : allégé du 12 au 14 avant le Trail du Lac ; un « + » par jour'));
    await ctx.close();
    // Récupération et repos de la veille : la semaine du 30 novembre (récupération du Trail du Lac jusqu'au 4 décembre).
    const plusTard = { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-30T10:00:00+01:00') };
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, plusTard));
    await p.waitForSelector('.ps-cadre');
    r = await lire(p);
    pb.push(egal([true, true, '2026-11-30 Base'], [r.reperes.some(x => /^Récupération de Trail du Lac jusqu'au .*4 déc.* : séances faciles seulement\.$/.test(x)),
      r.reperes.some(x => /^Repos le .*12 déc.* : veille de Corrida de Noël \(Plaisir\)\.$/.test(x)), r.bloc[0].replace(/^(\S+) Semaine \d+ · /, '$1 ')],
      'au 30 novembre : récupération du Trail du Lac jusqu\'au 4 décembre (19 jours), repos la veille de la Corrida de Noël, semaine 3 de la saison en base'));
    pb.push(egal(true, /^Cette semaine : Base, semaine 3 sur 16\./.test(r.etat), 'état : base, semaine 3 sur 16 (' + r.etat + ')'));
    await ctx.close();
    // Ultra du Plateau confirmé : sa récupération (83 km-effort, 52 jours) déborde sur l'affûtage du Trail des Crêtes.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 5).statut = 'confirmee'; }), {}, PARIS));
    await p.waitForSelector('.ps-cadre');
    r = await lire(p);
    pb.push(egal([['Alertes (1)', 'recup-affutage'], true], [r.alertes, /court jusqu'au .*17 août.* : elle déborde sur l'affûtage de Trail des Crêtes \(dès le .*16 août/.test(r.textesAlertes[0])],
      'Ultra du Plateau confirmé : récupération jusqu\'au 17 août, dans l\'affûtage du Trail des Crêtes ; pas d\'alerte de Préparatoire trop proche (9 semaines)'));
    await ctx.close();
    // Trail des Crêtes avancé au 2 mai : Objectifs trop proches (8 semaines) ; la seconde saison part le 8 mars, raccourcie.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 7).date = '2027-05-02'; }), {}, PARIS));
    await p.waitForSelector('.ps-cadre');
    r = await lire(p);
    pb.push(egal([['Alertes (1)', 'proches'], true, 'ph-developpement'], [r.alertes, /est à 8 semaines de Trail des Gorges .* passe l'un des deux en Préparatoire\./.test(r.textesAlertes[0]), r.phases[3]],
      'Trail des Crêtes au 2 mai : alerte Objectifs trop proches (8 semaines) ; saison raccourcie, le 8 mars en développement'));
    await ctx.close();
    // Trail des Cimes confirmé et avancé au 14 août : Préparatoire trop proche (14 jours avant un ultra-trail), et sa récupération dans l'affûtage.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 4).statut = 'confirmee'; course(d, 4).date = '2027-08-14'; }), {}, PARIS));
    await p.waitForSelector('.ps-cadre');
    r = await lire(p);
    pb.push(egal(['Alertes (2)', 'recup-affutage', 'prepa-proche'], r.alertes, 'Trail des Cimes au 14 août : Préparatoire trop proche et récupération dans l\'affûtage'));
    await ctx.close();
    // Sans Objectif : un message, pas de frise.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { d.courses.forEach(c => { if (c.role === 'objectif' || c.role === 'objectif_intermediaire') c.role = 'preparatoire'; }); }), {}, PARIS));
    await p.waitForSelector('.ps-cadre');
    r = await lire(p);
    pb.push(egal([true, []], [/^Aucun Objectif à venir/.test(r.vide || ''), r.semaines], 'sans Objectif : un message, pas de frise'));
    await ctx.close();
    // Calendrier : la récupération d'un Objectif en rose (semaine du 8 mars), l'Entretien sans fond.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#mois=2027-03', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS));
    await p.waitForSelector('.cal-m-grille');
    pb.push(egal(['ph-affutage', 'ph-recuperation', true], await p.evaluate(() => {
      const cl = j => [...document.querySelector('.cal-m-case[data-jour="' + j + '"]').classList].find(c => c.startsWith('ph-')) || null;
      return [cl('2027-03-02'), cl('2027-03-09'), getComputedStyle(document.querySelector('.cal-m-case[data-jour="2027-03-09"]')).backgroundColor !== getComputedStyle(document.querySelector('.cal-m-case[data-jour="2027-03-02"]')).backgroundColor];
    }), 'Calendrier, mars 2027 : affûtage puis Récupération du Trail des Gorges, d\'une autre couleur'));
    await ctx.close();
    // Lecture seule : le plan s'affiche, sans « + ».
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie(d => {
      d.courses = d.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
      d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
      d.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await p.waitForSelector('.ps-cadre');
    r = await lire(p);
    pb.push(egal([true, 0], [/Trail des Gorges/.test(r.titre || ''), r.plus], 'lecture seule : la saison s\'affiche, sans « + »'));
    await ctx.close();
    return pb;
  },

  // Spécification Préparation, § 5.2 et 7 (lot 2) : profil d'entraînement, séances enrichies (durée, distance, intensité).
  async preparationProfil(nav, db0) {
    const pb = [];
    const { db } = jeuObjectif(db0);
    const copie = f => { const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = d.seances || []; if (f) f(d); return d; };
    const etat = p => p.evaluate(() => (document.querySelector('.ps-profil-etat') || {}).textContent || null);
    // Profil vide : ce qui manque ; la fenêtre ; valeur refusée ; enregistrement.
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await p.waitForFunction(() => /Profil/.test((document.querySelector('.ps-profil-etat') || {}).textContent || ''));
    pb.push(egal('Profil à compléter : années de pratique, volume des 4 dernières semaines, plus longue sortie récente, jours possibles, VMA ou temps de référence.', await etat(p),
      'profil vide : les cinq champs obligatoires qui manquent'));
    await p.click('[data-profil]'); await p.waitForSelector('.ps-profil');
    pb.push(egal(['Niveau', 'Disponibilités', 'Allures', 'Renforcement et moyens', 'Points fragiles'], await p.evaluate(() => [...document.querySelectorAll('.ps-profil legend')].map(x => x.textContent)),
      'fenêtre du profil : cinq groupes'));
    await p.fill('.ps-profil [name="annees"]', '6'); await p.fill('.ps-profil [name="volume"]', '35,5'); await p.fill('.ps-profil [name="sortie_longue"]', '2');
    await p.selectOption('.ps-profil [name="sortie_longue_unite"]', 'h');
    for (const j of ['2', '4', '6']) await p.click('.ps-profil label:has([name="jours"][value="' + j + '"])');
    await p.selectOption('.ps-profil [name="jour_long"]', '6');
    await p.fill('.ps-profil [name="vma"]', '35');
    await p.click('.ps-profil [type="submit"]');
    pb.push(egal(['La VMA doit être comprise entre 8 et 30 km/h.', 0], [await p.textContent('.ps-profil .cal-msg'), d.ecritures.length], 'VMA à 35 refusée, rien d\'écrit'));
    await p.fill('.ps-profil [name="vma"]', ''); await p.fill('.ps-profil [name="temps_10km"]', '45:30');
    await p.click('.ps-profil label:has([name="moyens"][value="tapis"])');
    await p.click('.ps-profil [type="submit"]');
    await p.waitForSelector('.ps-profil', { state: 'detached' });
    const e = d.ecritures.find(x => x.table === 'profil_entrainement');
    pb.push(egal({ methode: 'POST', annees: 6, volume: 35.5, volume_unite: 'km', sortie_longue: 2, sortie_longue_unite: 'h', jours: [2, 4, 6], jour_long: 6, vma: null, temps_10km_s: 2730, moyens: ['tapis'], fragiles: null },
      e && { methode: e.methode, annees: e.corps.annees, volume: e.corps.volume, volume_unite: e.corps.volume_unite, sortie_longue: e.corps.sortie_longue, sortie_longue_unite: e.corps.sortie_longue_unite,
        jours: e.corps.jours, jour_long: e.corps.jour_long, vma: e.corps.vma, temps_10km_s: e.corps.temps_10km_s, moyens: e.corps.moyens, fragiles: e.corps.fragiles },
      'enregistrement : une ligne (virgule acceptée, 45:30 en secondes, jours et moyens cochés)'));
    pb.push(egal('Profil complet.', await etat(p), 'profil complet'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();
    // Profil relu : la fenêtre reprend les valeurs.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(x => { x.profil_entrainement = [{ utilisateur: x.profils[0].id, annees: 6, volume: 35.5, volume_unite: 'km', sortie_longue: 2, sortie_longue_unite: 'h',
      jours: [2, 4, 6], jour_long: 6, temps_10km_s: 2730, temps_semi_s: 6120, renfo: 2, moyens: ['tapis'] }]; }), {}, PARIS));
    await p.waitForFunction(() => /Profil complet/.test((document.querySelector('.ps-profil-etat') || {}).textContent || ''));
    await p.click('[data-profil]'); await p.waitForSelector('.ps-profil');
    pb.push(egal(['35,5', 'h', '45:30', '1:42:00', '2', true, true], await p.evaluate(() => { const f = document.querySelector('.ps-profil form');
      return [f.volume.value, f.sortie_longue_unite.value, f.temps_10km.value, f.temps_semi.value, f.renfo.value, f.querySelector('[name="jours"][value="4"]').checked, f.querySelector('[name="moyens"][value="tapis"]').checked]; }),
      'profil relu : les valeurs reprises dans la fenêtre'));
    await p.click('.ps-profil [data-act="annuler"]');
    await ctx.close();
    // Séance : durée, distance, intensité facultatives.
    d = copie();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, d, {}, PARIS));
    await p.click('[data-ajout="2026-10-21"]');
    await p.fill('.cal-seance [name="libelle"]', 'Footing');
    await p.fill('.cal-seance [name="distance"]', '0');
    await p.click('.cal-seance button[type="submit"]');
    pb.push(egal('La distance doit être comprise entre 0,1 et 999 km.', await p.textContent('.cal-msg'), 'séance : distance à 0 refusée'));
    await p.fill('.cal-seance [name="distance"]', '8,5'); await p.fill('.cal-seance [name="duree"]', '45'); await p.selectOption('.cal-seance [name="intensite"]', 'facile');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile'));
    const s = d.seances[d.seances.length - 1];
    pb.push(egal({ libelle: 'Footing', duree_min: 45, distance_km: 8.5, intensite: 'facile' }, s && { libelle: s.libelle, duree_min: s.duree_min, distance_km: s.distance_km, intensite: s.intensite },
      'séance : durée, distance (virgule acceptée) et intensité enregistrées'));
    await p.click('[data-edit="' + s.id + '"]');
    pb.push(egal(['45', '8,5', 'facile'], await p.evaluate(() => { const f = document.querySelector('.cal-seance form'); return [f.duree.value, f.distance.value, f.intensite.value]; }), 'séance relue : les trois champs repris'));
    await ctx.close();
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
    // Téléphone : la fenêtre tient dans l'écran.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 390, copie(), {}, PARIS));
    await p.waitForSelector('[data-profil]'); await p.click('[data-profil]'); await p.waitForSelector('.ps-profil');
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.querySelector('.ps-profil').scrollWidth > document.querySelector('.ps-profil').clientWidth), 'téléphone : la fenêtre du profil ne déborde pas'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'preparation-profil-telephone.png') });
    await ctx.close();
    return pb;
  },

  // Spécification Préparation, § 6 (lot 3) : séances proposées par l'IA ; l'appel est remplacé par des réponses fixes, sans coût.
  async preparationIA(nav, db0) {
    const pb = [];
    const { db } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const PROFIL = { utilisateur: moi, annees: 6, volume: 35, volume_unite: 'km', sortie_longue: 2, sortie_longue_unite: 'h', jours: [2, 4, 6], jour_long: 6, seance_max_min: 120, temps_10km_s: 2730, renfo: 1, moyens: [] };
    // Bloc du 19 octobre au 15 novembre : séances les mardis, jeudis et samedis (jours du profil).
    const LUNDIS = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
    const bonne = () => ({ semaines: LUNDIS.map(l => ({ lundi: l, explication: 'Entretien : deux footings et une sortie longue.', seances: [1, 3, 5].map(k => {
      const d = new Date(l + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); const j = d.toISOString().slice(0, 10);
      return { date: j, type: k === 3 ? 'renfo' : 'run', libelle: k === 5 ? 'Sortie longue' : k === 3 ? 'Gainage' : 'Footing', duree_min: k === 5 ? 90 : 45, distance_km: k === 3 ? 0 : k === 5 ? 15 : 8, intensite: 'facile' };
    }) })) });
    const mauvaise = () => { const r = bonne(); r.semaines[0].seances.push({ date: '2026-10-21', type: 'run', libelle: 'Fractionné', duree_min: 50, distance_km: 9, intensite: 'intense' }); return r; };
    // Base simulée : le relais range chaque appel dans « propositions », comme la fonction, et rend la réponse choisie.
    const copie = (reponses, f) => {
      const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = [Object.assign({}, PROFIL)];
      d.appels = [];
      d.relais = corps => {
        d.appels.push(corps);
        const r = reponses[Math.min(d.appels.length - 1, reponses.length - 1)];
        if (r.status) return r;
        const id = 'prop-' + d.appels.length;
        d.propositions.push({ id, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', reponse: r });
        return { status: 200, body: { id, reponse: r } };
      };
      if (f) f(d);
      return d;
    };
    const lire = p => p.evaluate(() => ({
      bouton: (document.querySelector('[data-ia="proposer"]') || {}).textContent || null, desactive: !!(document.querySelector('[data-ia="proposer"]') || {}).disabled,
      reste: (document.querySelector('.ps-ia-reste') || {}).textContent || null, mention: (document.querySelector('.ps-ia-mention') || {}).textContent || null,
      msg: (document.querySelector('.ps-ia-msg') || {}).textContent || null, aide: (document.querySelector('.ps-ia-aide') || {}).textContent || null,
      semaines: [...document.querySelectorAll('.ps-prop-sem')].map(e => e.dataset.lundi), lignes: document.querySelectorAll('.ps-prop-liste li').length,
      premiere: ((document.querySelector('.ps-prop-liste li') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      expl: (document.querySelector('.ps-prop-expl') || {}).textContent || null,
      actions: [...document.querySelectorAll('.ps-prop-actions button')].map(b => b.textContent)
    }));
    const pret = p => p.waitForFunction(() => document.querySelector('[data-ia], .ps-ia-aide'));
    const attendre = p => p.waitForFunction(() => !document.querySelector('[data-ia][disabled]') || document.querySelector('.ps-ia-msg'));

    // Profil complet, aucune proposition : le bouton, 4 restantes, la mention.
    let d = copie([bonne()]);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await pret(p);
    let r = await lire(p);
    pb.push(egal(['Proposer les séances', '4 restantes ce mois-ci', 'Séances proposées par une IA, à titre indicatif : ce n\'est pas un avis médical.'], [r.bouton, r.reste, r.mention], 'bouton, propositions restantes et mention'));
    await p.click('[data-ia="proposer"]');
    await p.waitForSelector('.ps-proposition');
    r = await lire(p);
    const envoi = d.appels[0];
    pb.push(egal([LUNDIS, 12, 'mar. 20 · Course à pied Footing · 45 min · 8 km · Facile', '« Entretien : deux footings et une sortie longue. »', ['Tout accepter', 'Choisir semaine par semaine', 'Refaire', 'Abandonner']],
      [r.semaines, r.lignes, r.premiere, r.expl, r.actions], 'proposition en attente : 4 semaines, 12 séances, explications, quatre boutons'));
    pb.push(egal([1, '2026-10-19', '2026-11-15', 'Entretien', false, false, ['mardi', 'jeudi', 'samedi'], ['allégé (avant une course Préparatoire)']],
      [envoi.essai, envoi.contexte.bloc.debut, envoi.contexte.bloc.fin, envoi.contexte.semaines[0].phase, /Trail du Lac|Trail des Gorges|Corrida/.test(JSON.stringify(envoi)), JSON.stringify(envoi).includes(db.profils[0].prenom || '§§'),
        envoi.contexte.profil.jours_disponibles, envoi.contexte.semaines[3].jours[3].reperes],
      'contexte envoyé : le bloc, ses phases et repères, le profil ; ni nom de course ni prénom'));
    await p.click('[data-ia="tout"]');
    await p.waitForFunction(() => !document.querySelector('.ps-proposition'));
    r = await lire(p);
    pb.push(egal([12, 'ia', 'acceptee', 'acceptee', '3 restantes ce mois-ci', null], [d.seances.length, d.seances[0].origine, d.seances[0].etat, d.propositions[0].statut, r.reste, d.seances.find(x => x.type === 'renfo').distance_km],
      'tout accepter : 12 séances écrites (origine IA), proposition acceptée, 3 restantes ; distance vide pour le renforcement'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Garde-fou : un jour non disponible ; la demande est refaite une fois, avec la correction.
    d = copie([mauvaise(), bonne()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pret(p); await p.click('[data-ia="proposer"]'); await p.waitForSelector('.ps-proposition');
    pb.push(egal([2, 2, true, 'invalide', 'brute', 12], [d.appels.length, d.appels[1].essai, (d.appels[1].corrections || []).some(x => /mer\. 21 oct.* : jour non disponible/.test(x)), d.propositions[0].statut, d.propositions[1].statut, (await lire(p)).lignes],
      'garde-fou : jour non disponible, proposition refaite (essai 2, avec la correction) ; la première marquée invalide'));
    // Choisir semaine par semaine : sans la semaine du 26 octobre, 9 séances.
    await p.click('[data-ia="choisir"]');
    await p.uncheck('[data-coche="2026-10-26"]');
    await p.click('[data-ia="selection"]');
    await p.waitForFunction(() => !document.querySelector('.ps-proposition'));
    pb.push(egal([9, false], [d.seances.length, d.seances.some(x => x.date >= '2026-10-26' && x.date <= '2026-11-01')], 'choisir semaine par semaine : seules les semaines cochées sont écrites'));
    await ctx.close();

    // Deux réponses fautives de suite : message, plafond inchangé.
    d = copie([mauvaise()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pret(p); await p.click('[data-ia="proposer"]'); await p.waitForSelector('.ps-ia-msg');
    r = await lire(p);
    pb.push(egal(['Proposition impossible à vérifier, réessaie plus tard.', ['echec', 'echec'], '4 restantes ce mois-ci', 0], [r.msg, d.propositions.map(x => x.statut), r.reste, d.seances.length],
      'deux échecs : message, les deux appels en échec, rien de décompté ni d\'écrit'));
    await ctx.close();

    // Abandonner : rien n'est écrit.
    d = copie([bonne()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pret(p); await p.click('[data-ia="proposer"]'); await p.waitForSelector('.ps-proposition');
    await p.click('[data-ia="abandonner"]'); await repondre(p, true);
    await p.waitForFunction(() => !document.querySelector('.ps-proposition'));
    pb.push(egal(['abandonnee', 0, '3 restantes ce mois-ci'], [d.propositions[0].statut, d.seances.length, (await lire(p)).reste], 'abandonner : rien d\'écrit, la proposition compte'));
    await ctx.close();

    // Plafond atteint : bouton grisé ; refus de la fonction (plafond, réservé aux pilotes) : son message.
    d = copie([bonne()], x => { for (let i = 0; i < 4; i++) x.propositions.push({ id: 'vieille-' + i, utilisateur: moi, cree: '2026-10-0' + (i + 1) + 'T10:00:00Z', bloc: '2026-09-28', essai: 1, statut: 'acceptee', reponse: null }); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pret(p);
    r = await lire(p);
    pb.push(egal([true, '0 restante ce mois-ci'], [r.desactive, r.reste], 'plafond atteint (4 ce mois-ci) : bouton grisé'));
    await ctx.close();
    for (const [rep, attendu, nom] of [[{ status: 429, body: { code: 'plafond', prochaine: '2026-11-01' } }, /^Plus de proposition ce mois-ci\s:\sla prochaine le .*1er\snov\.\s2026\.$/, 'plafond de la fonction'],
      [{ status: 403, body: { code: 'reserve' } }, /^Réservé aux comptes pilotes pour l'instant\.$/, 'compte non pilote']]) {
      d = copie([rep]);
      ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
      await pret(p); await p.click('[data-ia="proposer"]'); await p.waitForSelector('.ps-ia-msg');
      r = await lire(p);
      pb.push(egal(true, attendu.test(r.msg || ''), nom + ' : « ' + r.msg + ' »'));
      await ctx.close();
    }

    // Profil incomplet : pas de bouton, le lien vers le profil.
    d = copie([bonne()], x => { x.profil_entrainement = [Object.assign({}, PROFIL, { jours: [] })]; });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pret(p);
    r = await lire(p);
    pb.push(egal([null, true], [r.bouton, /Compléter mon profil/.test(r.aide || '')], 'profil incomplet : pas de bouton, « Compléter mon profil »'));
    await ctx.close();

    // Garde-fous au 17 novembre : récupération du Trail du Lac (séance facile seulement), repos la veille de la Corrida de Noël.
    d = copie([bonne()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-17T10:00:00+01:00') }));
    await pret(p);
    const gf = await p.evaluate(() => {
      const s = (date, intensite) => ({ date, type: 'run', libelle: 'Séance', duree_min: 50, distance_km: 9, intensite });
      return window.mrtSeancesIA.gardeFous({ semaines: [{ lundi: '2026-11-16', explication: '', seances: [s('2026-11-19', 'intense'), s('2026-12-08', 'intense'), s('2026-12-12', 'facile')] }] }, document.getElementById('saison').__ctx, '2026-11-16');
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
      const d = jeuObjectif(db0).db; // Trail du Lac le 15 novembre : le mois de novembre, case « Phases de prépa » cochée
      d.preferences[0].theme = theme;
      const { p, ctx } = await ouvrir(nav, 'calendrier.html#mois=2026-11', 1200, d, { 'mrt-calendrier-phases': '1' }, PARIS);
      pb.push(egal({ classe: ['t-' + theme], fond, cadre, schema, encre: 'rgb(11, 18, 32)', retenu: theme }, await p.evaluate(() => ({
        classe: document.documentElement.className.split(' ').filter(c => c.startsWith('t-')), fond: getComputedStyle(document.body).backgroundColor,
        cadre: getComputedStyle(document.querySelector('.cal-cadre')).backgroundColor, schema: getComputedStyle(document.documentElement).colorScheme,
        encre: getComputedStyle(document.querySelector('.cal-v-course.c-trail-v')).color, retenu: localStorage.getItem('mrt-theme') })), theme + ' : fond, cadre, contrôles, encre sur la couleur d\'une course, thème retenu'));
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

    // N3 : le menu, sans les modules « bientôt », tient dans l'écran d'un téléphone.
    for (const w of [375, 390]) for (const pg of ['index.html', 'palmares.html']) {
      ({ p, ctx } = await ouvrir(nav, pg, w, copie(), {}, PARIS));
      pb.push(egal({ onglets: ['En un coup d\'œil', 'Objectif & plan', 'Calendrier', 'À surveiller', 'Palmarès'], visibles: true }, await p.evaluate(() => {
        const bar = document.querySelector('.mrt-nav-inner'), t = [...document.querySelectorAll('.mrt-tab')];
        return { onglets: t.map(x => x.getAttribute('aria-label') || x.textContent),
          visibles: t.every(x => x.offsetLeft - bar.scrollLeft >= 0 && x.offsetLeft - bar.scrollLeft + x.offsetWidth <= bar.clientWidth) };
      }), 'menu à ' + w + ' px, ' + pg + ' : les modules construits, tous dans l\'écran'));
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

    // N5 : Calendrier, menu « Périodicité » (la vue Semaine par défaut), bouton « Plan », « Aujourd'hui » (Calendrier 0.17).
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, copie(), {}, PARIS));
    const vues = () => p.evaluate(() => { const b = document.querySelector('[data-menu]'), m = document.querySelector('.cal-menu');
      return [b.textContent.trim(), m.hidden, b.getAttribute('aria-expanded'), [...m.querySelectorAll('a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))]; });
    pb.push(egal(['Semaine', true, 'false', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], await vues(), 'Calendrier : menu « Périodicité » fermé, sur Semaine (vue par défaut)'));
    await p.click('[data-menu]');
    pb.push(egal(['Semaine', false, 'true', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], await vues(), 'un toucher sur son bouton : le menu s\'ouvre'));
    await p.keyboard.press('Escape');
    pb.push(egal([true, true], [(await vues())[1], await p.evaluate(() => document.activeElement === document.querySelector('[data-menu]'))], 'Échap : le menu se ferme, le bouton garde la main'));
    await p.keyboard.press('Enter');
    pb.push(egal([false, true], [(await vues())[1], await p.evaluate(() => document.activeElement === document.querySelector('.cal-menu a.is-on'))], 'ouvert au clavier : la main sur le choix en cours'));
    await p.locator('.cal-s-titre').nth(2).click();
    pb.push(egal(true, (await vues())[1], 'toucher ailleurs : le menu se ferme'));
    await p.click('[data-menu]'); await p.click('.cal-menu [data-periode="12"]'); await pause();
    pb.push(egal([['Année', true, 'false', ['Semaine', 'Mois', '3 mois', '6 mois', 'Année *']], 1, '#annee'], [await vues(), await p.locator('.cal-a-blocs').count(), await p.evaluate(() => location.hash)],
      'choisir « Année » : la vue Année, le menu refermé'));
    await p.click('[data-plan]'); await pause();
    pb.push(egal(['true', '1', true], [await p.getAttribute('[data-plan]', 'aria-pressed'), await p.evaluate(() => localStorage.getItem('mrt-calendrier-phases')), await p.locator('.cal-a-j[class*="ph-"]').count() > 0],
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
    // principal ; libellés à 0,7 rem en Space Mono ; astérisque discret ; une seule croix ; « Toutes les semaines » au chevron.
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
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, copie(), {}, PARIS));
    pb.push(egal({ libelles: ['11.2px'], chevron: true, croix: '18px' }, await p.evaluate(() => ({
      libelles: [...new Set([...document.querySelectorAll('#preparation .cal-sem-titre, #preparation .cal-prep-lib, #preparation .cal-jr-nom')].map(e => getComputedStyle(e).fontSize))],
      chevron: !!document.querySelector('.cal-toutes > summary .mrt-chev') && getComputedStyle(document.querySelector('.cal-toutes > summary')).display === 'flex',
      croix: getComputedStyle(document.querySelector('.pc-fermer .mrt-ico')).width })), 'rubrique Préparation : libellés à 0,7 rem, « Toutes les semaines » au chevron ; croix de la feuille'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(COMMUN, await champs(p), 'fiche d\'une course : champs communs'));
    pb.push(egal({ principaux: 1, parametrer: false, oblig: await role(p, '--muted') }, await p.evaluate(() => ({ principaux: document.querySelectorAll('.fc-fiche .mrt-btn.is-principal').length,
      parametrer: document.querySelector('[data-fc="preparer"]').classList.contains('is-principal'), oblig: getComputedStyle(document.querySelector('.fc-oblig')).color })), 'fiche : un seul bouton principal (Paramétrer à contour), astérisque discret'));
    await p.focus('#fc-lieu');
    pb.push(egal(await role(p, '--accent'), await style(p, '#fc-lieu', 'borderTopColor'), 'champ en cours de saisie : bordure en Accent'));
    await p.selectOption('#fc-statut', 'option');
    const nouveau = () => p.evaluate(() => document.querySelector('#fc-groupe_nouveau').getClientRects().length > 0);
    const avantChoix = await nouveau();
    await p.selectOption('#fc-groupe_options', '__nouveau__');
    pb.push(egal([false, true], [avantChoix, await nouveau()], 'Option : le champ « Nouveau groupe » n\'apparaît qu\'une fois choisi'));
    await p.selectOption('#fc-statut', 'confirmee');
    await ouvrirBloc(p, 'preparation');
    await p.click('[data-fc="preparer"]'); await p.waitForSelector('.cal-preparer');
    pb.push(egal(COMMUN, await champs(p), 'fenêtre « Paramétrer le plan » : champs communs'));
    pb.push(egal({ barre: ['Annuler', 'Valider *'], titre: 'uppercase Space Mono', voile: true, libelles: ['11.2px'] }, await fenetre(p), 'fenêtre « Paramétrer le plan » : comme la fiche'));
    await ctx.close();
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
      'Trail des Gorges, 66,0 km-effort | is-losange', 'Trail des Cimes, 67,0 km-effort | is-vide', 'Ultra du Plateau · Le 55, 83,0 km-effort | is-vide',
      'Trail de la Forêt, 42,0 km-effort | is-vide', 'Trail des Crêtes, 95,0 km-effort | is-losange'], g.points,
      'difficulté : km-effort sans D− ; d\'aujourd\'hui à la dernière course, sans courues ; trois signes (point plein, point à contour pour une option, losange)'));
    pb.push(egal({ graduations: ['0', '20', '40', '60', '80', '100'], etiquettes: [], ligne: 4, periode: 0, jour: false, tendance: false },
      { graduations: g.graduations, etiquettes: g.etiquettes, ligne: g.ligne, periode: g.periode, jour: g.jour, tendance: g.tendance }, 'difficulté : axe, étiquettes, ligne des confirmées, mois seul'));
    await p.hover('.mg-pt[aria-label^="Trail des Gorges"]');
    pb.push(egal(['66,0 km-effort', 'Trail des Gorges', '7 mars 2027 · 45 km · 2 100 m D+'], await bulle(p), 'difficulté : bulle au survol'));
    pb.push(egal({ chiffres: false, definition: true, italique: 'italic', apres: true, ligne: ['1px', true], diagonale: 0, bordure: '0px', legende: ['Course de préparation', 'Course en option', 'Objectif'] }, await p.evaluate(() => { const d = document.querySelector('.mg-definition'), l = document.querySelector('.mg-ligne'), lg = document.querySelector('.mg-legende');
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

  // Module Courses à surveiller (module-courses-a-surveiller-specification.md, § 8) : vues, cartes, tri, année, ouverture des inscriptions.
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
    const barre = p => p.evaluate(() => ({ vues: [...document.querySelectorAll('[data-vue]')].map(b => b.textContent.replace(/\s+/g, ' ').trim() + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      compte: document.querySelectorAll('.cs-carte, .cs-ligne').length + ' courses', groupes: [...document.querySelectorAll('[data-groupe]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')), tris: [...document.querySelectorAll('[data-tri]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      annees: [...document.querySelectorAll('[data-annee]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      reperes: [...document.querySelectorAll('.cs-mois')].map(x => x.textContent) }));

    // Ouverture : la vue À surveiller, avec les compteurs de chaque vue.
    let { p, ctx, erreurs } = await neuve(1200);
    let b = await barre(p), k = await cartes(p);
    pb.push(egal(['À surveiller 3 *', 'Inscriptions ouvertes 1', 'Déjà couru 7', 'À venir 7', 'Tout 17'], b.vues, 'vues et compteurs, À surveiller par défaut'));
    pb.push(egal([0, 0, [], ['avril 2027', 'septembre 2028', 'Date à définir']], [await p.locator('.cs-compte').count(), await p.locator('[data-groupe], [data-tri]').count(), b.annees, b.reperes], 'À surveiller : pas de texte « n courses », ni regroupement ni tri à choisir, titres de mois'));
    pb.push(egal(['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], k.map(x => x.nom), 'À surveiller : ordre chronologique, sans date à la fin'));
    pb.push(egal({ nom: 'Marathon de la Baie', statut: 'À surveiller', date: '11 avr. 2027', info: 'La Baie · Marathon', lignes: ['Distance | 42,195 km', 'Dossard | Ouvre le 3 nov. 2026 à 12 h'], lien: 'https://example.org/baie', cible: '_blank', grise: false, compteur: false, pt: 'is-opt' },
      k[0], 'carte : statut à la place du rôle, ni compteur ni objectif, dossard avec l\'heure, lien « Site officiel »'));
    pb.push(egal(['Ouverture : janvier 2027', 'Ouverture à venir'], [k[2].lignes[0].split(' | ')[1] || k[2].lignes[0], k[1].lignes[1].split(' | ')[1]].map(x => x.replace(/^Dossard \| /, '')), 'dossard : mois seul, puis ouverture inconnue'));
    pb.push(egal([null, true, 'À définir'], [k[2].lien, k[2].grise, k[2].date], 'sans site officiel : lien grisé, sans adresse ; sans date : « À définir »'));
    pb.push(egal([3, 0, 0, 3], await p.evaluate(() => [document.querySelectorAll('.cs-carte .cs-site').length, document.querySelectorAll('.cs-detail').length, document.querySelectorAll('.cs-carte .ob-cpt, .cs-carte .ob-cible').length,
      [...document.querySelectorAll('.cs-carte')].filter(c => getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)').length]), 'lien « Site officiel » sur chaque carte ; plus de bouton Détails ; aucun compteur ; un fond sur chaque carte'));

    // Inscriptions ouvertes : à venir, pas inscrit, ouverture atteinte.
    await p.click('[data-vue="ouvertes"]');
    k = await cartes(p);
    pb.push(egal([['Ultra du Plateau · Le 55'], 'Dossard | Inscription ouverte'], [k.map(x => x.nom), k[0].lignes.slice(-1)[0]], 'Inscriptions ouvertes : seulement les courses dont l\'ouverture est atteinte'));
    await p.click('[data-vue="venir"]');
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Trail des Cimes', 'Ultra du Plateau · Le 55', 'Trail de la Forêt', 'Trail des Crêtes'], (await cartes(p)).map(x => x.nom), 'À venir : la feuille de route'));

    // Déjà couru : du plus récent au plus ancien, sans dossard, avec l'année.
    await p.click('[data-vue="courue"]');
    k = await cartes(p); b = await barre(p);
    pb.push(egal(['Semi de San Sebastián', '10 km de Montauban'], k.slice(0, 2).map(x => x.nom), 'Déjà couru : les plus récentes d\'abord'));
    pb.push(egal([7, 'Courue', 0, 'is-courue'], [k.length, k[0].statut, k.filter(x => x.lignes.some(l => l.startsWith('Dossard'))).length, k[0].pt.split(' ')[0]], 'Déjà couru : statut, sans dossard, pastille atténuée'));
    pb.push(egal([['Toutes *', '2026', '2025'], '7 courses'], [b.annees, b.compte], 'Déjà couru : pastilles des années, 7 cartes'));
    await p.click('[data-annee="2025"]');
    pb.push(egal(4, (await cartes(p)).length, 'année 2025 : 4 courses'));

    // Tout : ce qui reste à faire, puis les courues.
    await p.click('[data-vue="tout"]');
    await p.click('[data-annee=""]');
    k = await cartes(p);
    pb.push(egal([17, 'Trail du Lac · Le Tour du Lac', 'Semi de San Sebastián'], [k.length, k[0].nom, k.find(x => x.statut === 'Courue').nom], 'Tout : 17 courses, à venir d\'abord puis les courues'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));

    // Tableau : les colonnes de la veille, une ligne par course, sans regroupement ; choix gardé sur l'appareil.
    await p.click('[data-vue="surveiller"]');
    const lignes = () => p.evaluate(() => ({ en: [...document.querySelectorAll('.cs-tableau thead th')].map(x => x.textContent),
      l: [...document.querySelectorAll('.cs-ligne')].map(r => [...r.children].map(x => x.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim())),
      lien: [...document.querySelectorAll('.cs-ligne .cs-lien-nom')].map(x => x.getAttribute('href')) }));
    pb.push(egal([0, 'Cartes *'], [await p.locator('.cs-tableau').count(), (await p.evaluate(() => [...document.querySelectorAll('[data-mode]')].map(b => b.getAttribute('aria-label') + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')))).shift()], 'affichage par défaut : les cartes'));
    await p.click('[data-mode="tableau"]');
    let tb = await lignes();
    pb.push(egal(['Événement', 'Course', 'Distance · D+', 'Date', 'Ouverture des inscriptions'], tb.en, 'tableau : les colonnes de la veille, sans UTMB Index'));
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
    pb.push(egal(['https://example.org/baie'], tb.lien, 'tableau : le nom mène au site officiel quand il est renseigné'));
    await p.click('[data-vue="venir"]');
    pb.push(egal('15 nov. 2026 9 h', (await lignes()).l[0][3], 'tableau : l\'heure de départ sous la date'));
    await p.click('[data-vue="courue"]');
    pb.push(egal([7, '—'], [(await lignes()).l.length, (await lignes()).l[0][4]], 'tableau, Déjà couru : une ligne par course, pas de dossard'));
    await p.click('[data-vue="surveiller"]');
    await p.click('.cs-lien-nom');
    pb.push(egal(0, await p.locator('.fc-fiche').count(), 'tableau : le lien du nom n\'ouvre pas la fiche'));
    await p.locator('.cs-ligne').nth(2).click(); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Ultra des Lacs', await p.locator('#fc-course').inputValue(), 'tableau : toucher une ligne ouvre sa fiche'));
    await p.click('[data-fc="annuler"]'); await pause();
    await p.reload(); await p.waitForSelector('.cs-barre');
    pb.push(egal(3, await p.locator('.cs-ligne').count(), 'tableau : l\'affichage choisi est gardé après rechargement'));
    await p.click('[data-mode="cartes"]');
    pb.push(egal([0, 3], [await p.locator('.cs-tableau').count(), await p.locator('.cs-carte').count()], 'retour aux cartes'));

    // Toucher une carte : la fiche de modification (course à venir, sans date, courue) ; le lien « Site officiel » ne l'ouvre pas.
    await p.click('[data-vue="surveiller"]');
    await p.click('.cs-site[href]');
    pb.push(egal(0, await p.locator('.fc-fiche').count(), 'le lien « Site officiel » n\'ouvre pas la fiche'));
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.fc-fiche');
    pb.push(egal(['Marathon de la Baie', 'Modifier la course'], [await p.locator('#fc-course').inputValue(), await t(p, '#fc-titre')], 'toucher la carte : la fiche de modification'));
    await p.click('[data-fc="annuler"]'); await pause();
    await p.locator('.cs-carte').nth(2).click(); await p.waitForSelector('.fc-fiche');
    pb.push(egal(['Ultra des Lacs', ''], [await p.locator('#fc-course').inputValue(), await p.locator('#fc-date').inputValue()], 'course sans date : sa fiche, date vide'));
    await p.click('[data-fc="annuler"]'); await pause();
    await p.click('[data-vue="courue"]');
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.fc-fiche');
    pb.push(egal([true, 'Semi de San Sebastián'], [await p.locator('#fc-temps').count() === 1, await p.locator('#fc-course').inputValue()], 'course courue : la fiche de résultat'));
    pb.push(egal([], erreurs, 'erreurs JavaScript (fiche)'));
    await ctx.close();

    // Ajouter : le statut À surveiller est préchoisi dans cette vue ; seulement là.
    let o = await neuve(1200);
    await o.p.click('[data-cs="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
    pb.push(egal('a_surveiller', await o.p.locator('#fc-statut').inputValue(), '+ Course (À surveiller) : statut préchoisi'));
    await o.p.click('[data-fc="annuler"]'); await pause();
    await o.p.click('[data-vue="venir"]');
    await o.p.click('[data-cs="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
    pb.push(egal('confirmee', await o.p.locator('#fc-statut').inputValue(), '+ Course (À venir) : statut Confirmée'));
    await o.ctx.close();

    // Fiche : heure d'ouverture et mois seul.
    o = await neuve(1200);
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.fc-fiche');
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
    o = await neuve(1200);
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.fc-fiche');
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
    pb.push(egal(['Dossard | Ouvre le 20 oct. 2026 à 14 h', 'Dossard | Inscription ouverte'], [k.find(x => x.nom === 'Marathon de la Baie').lignes.slice(-1)[0], k.find(x => x.nom === 'Ultra des Lacs').lignes.slice(-1)[0]], 'ouverture le jour même : avant l\'heure « Ouvre le… », après « Inscription ouverte »'));
    await o.p.click('[data-vue="ouvertes"]');
    pb.push(egal(['Ultra des Lacs', 'Ultra du Plateau · Le 55'], (await cartes(o.p)).map(x => x.nom), 'Inscriptions ouvertes : l\'heure d\'ouverture atteinte le jour même compte, pas avant ; par date de course'));
    await o.ctx.close();

    // Ordinateur : les cartes d'un même mois côte à côte, étroites ; toutes de la même hauteur (même téléphone).
    const memeMois = JSON.parse(JSON.stringify(db)); memeMois.courses.find(c => c.id === id(9)).date = '2027-04-20';
    o = await neuve(1200, PAGE, memeMois);
    pb.push(egal([true, true], await o.p.evaluate(() => { const [a, b] = [...document.querySelectorAll('.cs-carte')].map(c => c.getBoundingClientRect());
      return [Math.abs(a.top - b.top) < 2 && b.left >= a.right, a.width < 420]; }), 'ordinateur : deux cartes du même mois côte à côte, moins de 420 px de large'));
    await o.p.click('[data-vue="tout"]');
    pb.push(egal([1, 1], await o.p.evaluate(() => [new Set([...document.querySelectorAll('.cs-carte')].map(c => Math.round(c.getBoundingClientRect().height))).size, document.querySelectorAll('.cs-mois').length > 3 ? 1 : 0]), 'Tout : toutes les cartes de la même hauteur, regroupées par mois'));
    await o.ctx.close();

    // Téléphone : rien ne dépasse, les vues défilent, statut et date sur une ligne.
    o = await neuve(390, PAGE, db, {});
    pb.push(egal({ deborde: false, surLaPage: true }, await o.p.evaluate(() => ({ deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      surLaPage: document.querySelectorAll('.cs-pastille').length >= 4 })), 'téléphone : rien ne dépasse'));
    pb.push(egal([true, true], await o.p.evaluate(() => { const c = document.querySelector('.cs-carte'), r = x => c.querySelector(x).getBoundingClientRect();
      return [Math.abs(r('.ob-role').top - r('.ob-date').top) < 2, r('.ob-nom').top >= r('.ob-role').bottom - 1]; }), 'téléphone : statut et date sur la même ligne, le nom dessous'));
    pb.push(egal(1, await o.p.evaluate(() => new Set([...document.querySelectorAll('.cs-carte')].map(c => c.getBoundingClientRect().left)).size), 'téléphone : une seule colonne'));
    pb.push(egal(1, await o.p.evaluate(() => new Set([...document.querySelectorAll('.cs-carte')].map(c => Math.round(c.getBoundingClientRect().height))).size), 'téléphone : toutes les cartes de la même hauteur'));
    await o.p.click('[data-mode="tableau"]');
    pb.push(egal(false, await o.p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), 'téléphone, tableau : rien ne dépasse de la page (le tableau défile dans son cadre)'));
    pb.push(egal([], o.erreurs, 'téléphone : erreurs JavaScript'));
    await o.ctx.close();

    // Adresse : ?vue=courue ouvre la vue demandée ; site partagé : lecture seule, pas de bouton d'ajout.
    o = await neuve(1200, PAGE + '?vue=courue');
    pb.push(egal('Déjà couru 7 *', (await barre(o.p)).vues[2], '?vue=courue : la vue demandée'));
    await o.ctx.close();
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'vert-rose', course_cap: null, modules: null, palmares_groupe: false });
    o = await neuve(1200, PAGE, partage, { 'mrt-vue': autre });
    pb.push(egal([0, 3], [await o.p.locator('[data-cs="ajouter"]').count(), (await cartes(o.p)).length], 'site partagé : lecture seule, sans ajout'));
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
    // Visiteur sans connexion : la page s'ouvre (pas de renvoi), retour vers la connexion.
    let { p, ctx, erreurs } = await contexte(false);
    await p.goto(RACINE + 'mentions-legales.html');
    await p.waitForTimeout(800);
    const v = await lire(p);
    pb.push(egal(true, /mentions-legales\.html$/.test(p.url()), 'mentions, visiteur : la page reste ouverte'));
    pb.push(egal({ titre: 'Mentions légales', rubriques: ['Éditeur', 'Directeur de la publication', 'Contact', 'Hébergement du site', 'Hébergement des données', 'Propriété intellectuelle', 'Crédits', 'Données personnelles'],
      contact: ['contact@myruntools.fr', 'mailto:contact@myruntools.fr'], enClair: false, robots: 'noindex', retour: 'connexion.html', entete: 0, pied: 'Mentions légales', lienPied: 0, large: false },
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
    const pages = fs.readdirSync(path.resolve(__dirname, '../..')).filter(f => f.endsWith('.html') && f !== 'mentions-legales.html');
    const vus = [];
    for (const page of pages) {
      ({ p, ctx } = await contexte(!/connexion|mot-de-passe/.test(page)));
      await p.goto(RACINE + page);
      await p.waitForSelector('.mrt-pied', { timeout: 4000 }).catch(() => {});
      vus.push([page, await p.evaluate(() => [document.querySelectorAll('.mrt-pied').length, (document.querySelector('.mrt-pied a') || {}).href || ''])]);
      await ctx.close();
    }
    pb.push(egal(pages.map(f => [f, [1, RACINE + 'mentions-legales.html']]), vus, 'pied de page « Mentions légales » sur chaque page'));
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
      egal(r0(B.calculer(A, jour([], 'train')).kcal), r0(B.calculer(A, jour([{ type: 'inconnu', heures: 2 }, { type: 'm', heures: 0 }], 'train')).kcal), 'sport inconnu ou de durée nulle : ignoré'));
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
    pb.push(egal(['naissance', 'poids', 'taille', 'activite'], await p.evaluate(() => [...document.querySelectorAll('.pf-encart .pf-champ')].map(c => (c.querySelector('[name]') || {}).name)), 'encart : seuls les champs manquants'),
      egal(0, await p.locator('.nu-besoin').count(), 'encart : pas de besoin calculé'));
    // Valeurs refusées : rien n'est écrit.
    const remplir = async (v) => {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'activite') await p.selectOption('[name="activite"]', x); else await p.fill('[name="' + k + '"]', x);
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
      egal('Phase · Entretien', await txt(p, '.nu-phase'), 'hors saison (avant le premier Objectif) : Entretien'),
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

    // Profil complet : pas d'encart ; « Modifier mon profil » ouvre les cinq champs.
    d = copie(COMPLET);
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
    pb.push(egal(0, await p.locator('.pf-encart').count(), 'profil complet : pas d\'encart'), egal('2 117 kcal', await txt(p, '.nu-kcal'), 'profil complet : besoin du jour'));
    await p.click('.nu-editer');
    pb.push(egal(['sexe', 'naissance', 'poids', 'taille', 'activite'], await p.evaluate(() => [...document.querySelectorAll('.pf-panneau .pf-champ')].map(c => (c.querySelector('[name]') || {}).name)), 'fenêtre : les cinq champs'),
      egal(['homme', '1986-03-15', '70', '175', 'peu'], await p.evaluate(() => { const f = document.querySelector('.pf-panneau'); return [f.querySelector('input[name="sexe"]:checked').value, f.naissance.value, f.poids.value, f.taille.value, f.activite.value]; }), 'fenêtre : valeurs du profil'));
    await p.click('.pf-panneau [data-act="annuler"]');
    pb.push(egal([0, 0], [await p.locator('.pf-panneau').count(), d.ecritures.length], 'Annuler : fenêtre fermée, rien d\'écrit'));
    await p.click('.nu-editer');
    await p.fill('.pf-panneau [name="poids"]', '72,5');
    await p.selectOption('.pf-panneau [name="activite"]', 'actif');
    await p.click('.pf-panneau [type="submit"]');
    await p.waitForSelector('.pf-panneau', { state: 'detached' });
    pb.push(egal([['PATCH', 'profils', { ...COMPLET, poids: 72.5, activite: 'actif' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'fenêtre : les cinq champs rangés, virgule acceptée'),
      egal('2 401 kcal', await txt(p, '.nu-kcal'), 'besoin recalculé avec 72,5 kg et activité « actif »'));
    // Échec d'écriture : message, fenêtre ouverte.
    d.panne = true;
    await p.click('.nu-editer');
    await p.click('.pf-panneau [type="submit"]');
    await p.locator('.pf-msg:not(:empty)').waitFor();
    pb.push(egal('Enregistrement impossible pour l\'instant.', await txt(p, '.pf-msg'), 'panne : message d\'erreur'), egal(1, await p.locator('.pf-panneau').count(), 'panne : la fenêtre reste ouverte'));
    await ctx.close();

    // Phase d'après la course cap (choisie dans les préférences) : J-12, J-2, J-1, puis une course lointaine.
    // Phase : celle du plan de saison (spécification Préparation, § 4) ; Carbo-loading de J-3 à J-2 et Veille à J-1 avant la course confirmée la plus proche.
    for (const [date, attendu] of [['2026-11-01', 'Phase · Affûtage'], ['2026-10-22', 'Phase · Carbo-loading'], ['2026-10-21', 'Phase · Veille de course'], ['2026-12-20', 'Phase · Deload']]) {
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
    pb.push(egal(['En un coup d\'œil', 'Objectif & plan', 'Nutrition'], await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(x => x.getAttribute('aria-label') || x.textContent)), 'Nutrition cochée : onglet dans le menu'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 390, copie(COMPLET)));
    pb.push(egal(false, (await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(x => x.getAttribute('aria-label') || x.textContent))).includes('Nutrition'), 'menu par défaut : pas d\'onglet Nutrition'));
    await ctx.close();

    // Site partagé en lecture seule : aucune donnée de nutrition.
    const autre = '00000000-0000-0000-0000-00000000000b';
    d = copie(COMPLET); d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d, { 'mrt-vue': autre }));
    pb.push(egal([0, 0, 'Les données de nutrition ne sont pas partagées.'], [await p.locator('.nu-besoin').count(), await p.locator('.pf-encart').count(), await txt(p, '#nutrition')], 'site partagé : rien de nutrition'));
    await ctx.close();
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
    const groupes = p => p.evaluate(() => [...document.querySelectorAll('.nu-repas-t')].map(t => [...t.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' ')));
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
    pb.push(egal(['Homme · 40 ans · 70 kg · 175 cm · Peu actif', 'Phase · Développement', '2 117 kcal'], [norm(await p.locator('.nu-profil-l').textContent()), norm(await p.locator('.nu-phase').textContent()), await kcal(p)], 'carte du besoin : profil en lecture, phase du plan, besoin'),
      egal(['Mardi 20 octobre', true, 0], [norm(await p.locator('.nu-jour-t').textContent()), await p.locator('[data-act="lendemain"]').isDisabled(), await p.locator('[data-act="aujourdhui"]').count()], 'sélecteur : le jour, pas de jour suivant, pas de lien « Aujourd\'hui »'),
      egal(['kcal | sous | 350 | Reste 1 767 kcal | Besoin 2 117 kcal', 'p | sous | 6 g | Reste 92 g | Besoin 98–140 g', 'g | sous | 76 g | Reste 189 g | Besoin 265–318 g', 'l | sous | 1 g | Reste 58 g | Besoin 59–82 g'], await jauges(p), 'anneaux : nom, valeur, reste, besoin'),
      egal(['Petit-déj 90 kcal', 'Midi 260 kcal'], await groupes(p), 'journal : un bloc par repas'),
      egal(['Banane', 'Riz cuit · 200 g'], await lignes(p), 'journal : grammes pour un aliment donné pour 100 g'),
      egal(['Banane · 1 pièce | 90 kcal', 'Riz cuit | 130 kcal / 100 g'], await liste(p), 'Récents, sans l\'aliment jamais utilisé'),
      egal(0, await p.locator('.nu-mention, .nu-macros').count(), 'page épurée : ni mention ni fourchettes en texte'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'nutrition-telephone.png'), fullPage: true });
    await p.click('[data-source="favoris"]');
    pb.push(egal(['Banane · 1 pièce | 90 kcal'], await liste(p), 'Favoris'));
    await p.click('[data-source="recents"]');
    // Banane : deux portions, au repas de l'heure (10 h : midi).
    await p.click('.nu-aliment >> nth=0');
    const qte = async () => p.inputValue('.nu-qte');
    pb.push(egal(['1', 'midi'], [await qte(), await p.locator('.nu-repas-choix [aria-pressed="true"]').getAttribute('data-repas')], 'choix : une portion, repas d\'après l\'heure'));
    await p.click('[data-act="plus"]'); await p.click('[data-act="plus"]'); await p.click('[data-act="moins"]'); await p.click('[data-act="plus"]');
    pb.push(egal(['2', '2 portions'], [await qte(), norm(await p.locator('.nu-quantite .nu-unite').textContent()).replace(/^/, '2 ')], 'quantité par pas de 0,5'));
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal([['POST', 'repas_lignes', { date: '2026-10-20', repas: 'midi', aliment: ID(1), nom: 'Banane', quantite: 2, kcal: 180, proteines: 2, glucides: 40, lipides: 0.6 }], ['PATCH', 'aliments', ['dernier_usage'], '?id=eq.' + ID(1)]],
      d.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, sansId(e)] : [e.methode, e.table, Object.keys(e.corps), e.filtres]), 'Ajouter : la ligne figée et le dernier usage de l\'aliment'),
      egal('kcal | sous | 530 | Reste 1 587 kcal | Besoin 2 117 kcal', (await jauges(p))[0], 'anneau des calories après l\'ajout'),
      egal(['Petit-déj 90 kcal', 'Midi 440 kcal'], await groupes(p), 'journal après l\'ajout'));
    d.ecritures.length = 0;
    await p.locator('[data-act="supprimer"][aria-label="Supprimer Banane"]').last().click();
    await p.waitForFunction(() => document.querySelectorAll('.nu-lignes li').length === 2);
    pb.push(egal(['DELETE', 'repas_lignes'], [d.ecritures[0].methode, d.ecritures[0].table], '× : la ligne est supprimée'));
    // Riz cuit, en grammes : 100 g d'office, saisie de 200 g puis « − » : 190 g.
    d.ecritures.length = 0;
    await p.click('.nu-aliment:has-text("Riz cuit")');
    pb.push(egal(['100', 'g'], [await qte(), norm(await p.locator('.nu-quantite .nu-unite').textContent())], 'aliment pour 100 g : quantité en grammes'));
    await p.fill('.nu-qte', '0'); await p.click('[data-act="ajouter"]');
    pb.push(egal(['La quantité doit être comprise entre 1 et 5 000 g.', 0], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), d.ecritures.length], 'quantité nulle refusée'));
    await p.fill('.nu-qte', '200'); await p.click('[data-act="moins"]');
    pb.push(egal('190', await qte(), '« − » : 10 g de moins'));
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal({ date: '2026-10-20', repas: 'midi', aliment: ID(2), nom: 'Riz cuit', quantite: 1.9, kcal: 247, proteines: 5.1, glucides: 53.2, lipides: 0.6 }, sansId(d.ecritures[0]), '190 g de riz : 1,9 fois les valeurs pour 100 g'),
      egal(['Banane', 'Riz cuit · 200 g', 'Riz cuit · 190 g'], await lignes(p), 'journal : 190 g'));

    // Recherche dans Open Food Facts (réponses simulées : aucun appel réel pendant les essais).
    const demandes = [];
    let reponse = { status: 200, body: { products: [
      { code: '1', product_name: 'Riz basmati', brands: 'Marque A, Autre', serving_quantity: 60, nutriments: { 'energy-kcal_100g': 350, proteins_100g: 8, carbohydrates_100g: 78, fat_100g: 1 } },
      { code: '2', product_name: 'Sans calories', brands: 'Marque B', nutriments: {} },
      { code: '3', product_name: 'Applesauce', product_name_fr: 'Compote', brands: '', nutriments: { energy_100g: 300, carbohydrates_100g: 17 } }] } };
    await ctx.route('https://world.openfoodfacts.org/**', r => { demandes.push(r.request().url()); r.fulfill({ status: reponse.status, contentType: 'application/json', body: JSON.stringify(reponse.body) }); });
    await p.fill('.nu-recherche [name="q"]', 'riz'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForSelector('.nu-off .nu-aliment');
    pb.push(egal(['Riz cuit | 130 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-resultats .nu-liste:not(.nu-off) .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'recherche : mes aliments d\'abord'));
    pb.push(egal(['Riz basmati · Marque A | 350 kcal / 100 g', 'Compote | 72 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'résultats : pour 100 g, sans produit sans calories'),
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
      const mes = () => p2.evaluate(() => [...document.querySelectorAll('.nu-mes .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | ')));
      await p2.fill('.nu-recherche [name="q"]', 'oe');
      pb.push(egal([['Œuf · 1 pièce | 140 kcal'], 0, 0], [await mes(), appels.length, ancien.length], 'pendant la frappe : mes aliments, sans aucun appel'));
      await p2.fill('.nu-recherche [name="q"]', 'yaourt'); await p2.press('.nu-recherche [name="q"]', 'Enter');
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal([['Yaourt nature · Marque C | 53 kcal / 100 g'], [{ q: 'yaourt' }], 0], [await p2.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), appels, ancien.length], 'relais : les produits, sans l\'ancien moteur'));
      await p2.click('.nu-off .nu-aliment >> nth=0');
      pb.push(egal('125', await p2.inputValue('.nu-qte'), 'relais : la portion habituelle du produit'));
      await p2.fill('.nu-recherche [name="q"]', 'skyr'); await p2.fill('.nu-recherche [name="q"]', 'yaourt'); await p2.press('.nu-recherche [name="q"]', 'Enter');
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal(1, appels.length, 'recherche déjà faite : gardée, aucun nouvel appel'));
      await o2.ctx.close();
    }

    // Aliment libre : contrôles, puis création.
    d.ecritures.length = 0;
    await p.click('[data-source="libre"]');
    await p.click('.nu-libre [type="submit"]');
    pb.push(egal('Écris le nom de l\'aliment.', norm(await p.locator('.nu-ajout .nu-msg').textContent()), 'aliment libre : nom manquant'));
    await p.fill('.nu-libre [name="nom"]', 'Pain'); await p.fill('.nu-libre [name="portion"]', '1 tranche');
    await p.click('.nu-libre [type="submit"]');
    pb.push(egal(['Indique les calories pour une portion.', 'Pain', 0], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), await p.inputValue('.nu-libre [name="nom"]'), d.ecritures.length], 'aliment libre : calories manquantes, saisie gardée, rien d\'écrit'));
    await p.fill('.nu-libre [name="kcal"]', '80'); await p.fill('.nu-libre [name="proteines"]', '3,5'); await p.fill('.nu-libre [name="glucides"]', '15');
    await p.click('.nu-favori-case');
    await p.click('.nu-libre [type="submit"]');
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
    await p.click('.nu-aliment >> nth=0'); await p.click('[data-act="ajouter"]');
    await p.locator('.nu-ajout .nu-msg:not(:empty)').waitFor();
    pb.push(egal(['Enregistrement impossible pour l\'instant.', 2], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), await p.locator('.nu-lignes li').count()], 'panne : message, journal inchangé'));
    await ctx.close();

    // Repas d'après l'heure : 7 h petit-déj, 20 h soir.
    for (const [h, attendu] of [['07:00', 'petit_dej'], ['20:00', 'soir']]) {
      ({ p, ctx } = await ouvrirN(base(), 390, { maintenant: new Date('2026-10-20T' + h + ':00') }));
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
    pb.push(egal(['+ Aliment libre', 'Rien de noté.'], [norm(await p.locator('.nu-sources [aria-pressed="true"]').textContent()), norm(await p.locator('.nu-journal .nu-vide').textContent())], 'sans aliment : formulaire libre, journal vide'));
    await p.click('[data-source="favoris"]');
    pb.push(egal('Aucun favori.', norm(await p.locator('.nu-source .nu-vide').textContent()), 'sans favori'));
    await p.click('[data-source="recents"]');
    pb.push(egal('Aucun aliment récent.', norm(await p.locator('.nu-source .nu-vide').textContent()), 'sans récent'));
    await ctx.close();

    // Sport du jour : une ligne remplie en fait apparaître une autre ; besoin recalculé ; retenu sur l'appareil ; rien dans la base.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    const ligneS = i => p.locator('.nu-sport-l').nth(i);
    pb.push(egal(1, await p.locator('.nu-sport-l').count(), 'sport : une ligne vide au départ'));
    await ligneS(0).locator('[name="type"]').selectOption('j95');
    await ligneS(0).locator('[name="heures"]').fill('1');
    pb.push(egal([2, '2 817 kcal', 'kcal | sous | 350 | Reste 2 467 kcal | Besoin 2 817 kcal'], [await p.locator('.nu-sport-l').count(), await kcal(p), (await jauges(p))[0]], 'sport : 1 h de jogging, une 2e ligne, besoin et anneau recalculés'));
    await p.clock.runFor(1000); await ecrit(d, e => e.table === 'sport_jour' && e.methode === 'POST');
    pb.push(egal([['DELETE', 'sport_jour', '?utilisateur=eq.' + U + '&date=eq.2026-10-20'], ['POST', 'sport_jour', [{ date: '2026-10-20', type: 'j95', heures: 1 }]]], d.ecritures.slice(-2).map(e => e.methode === 'DELETE' ? [e.methode, e.table, e.filtres] : [e.methode, e.table, e.corps]), 'sport : rangé dans la base, jour par jour'));
    await ligneS(1).locator('[name="type"]').selectOption('m');
    await ligneS(1).locator('[name="heures"]').fill('30');
    pb.push(egal('2 817 kcal', await kcal(p), 'sport : 30 heures ignorées'));
    await ligneS(1).locator('[name="heures"]').fill('0,5');
    pb.push(egal([3, '2 922 kcal'], [await p.locator('.nu-sport-l').count(), await kcal(p)], 'sport : deux sports'));
    await p.clock.runFor(1000); await ecrit(d, e => e.table === 'sport_jour' && e.methode === 'POST' && e.corps.length === 2);
    await p.reload(); await p.waitForSelector('html[data-mrt-donnees]'); await p.clock.runFor(1500); await p.waitForSelector('.nu-jauge');
    pb.push(egal([3, '2 922 kcal'], [await p.locator('.nu-sport-l').count(), await kcal(p)], 'sport : relu dans la base après rechargement'));
    await ligneS(0).locator('[name="type"]').selectOption('');
    pb.push(egal('2 222 kcal', await kcal(p), 'sport : le jogging retiré'));
    await ctx.close();

    // Sélecteur de jour : la veille, un repas oublié, puis retour à aujourd'hui.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Lundi 19 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal([false, 1, 'Rien de noté.', 'kcal | sous | 0 | Reste 2 117 kcal | Besoin 2 117 kcal'], [await p.locator('[data-act="lendemain"]').isDisabled(), await p.locator('[data-act="aujourdhui"]').count(), norm(await p.locator('.nu-journal .nu-vide').textContent()), (await jauges(p))[0]], 'veille : son journal (vide), jour suivant et « Aujourd\'hui » proposés'));
    await p.click('.nu-aliment:has-text("Banane")'); await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal('2026-10-19', d.ecritures.filter(e => e.table === 'repas_lignes').pop().corps.date, 'veille : l\'aliment ajouté va dans ce jour'));
    await p.click('[data-act="aujourdhui"]');
    await p.waitForFunction(() => /Mardi 20 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal(['Banane', 'Riz cuit · 200 g'], await lignes(p), 'retour à aujourd\'hui : son journal'));
    // Recherche dans mes aliments : sans accent ni pluriel.
    await ctx.route('https://world.openfoodfacts.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"products":[]}' }));
    await p.fill('.nu-recherche [name="q"]', 'oeufs'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForFunction(() => !/Recherche…/.test(document.querySelector('.nu-resultats').textContent));
    pb.push(egal(['Œuf · 1 pièce | 140 kcal'], await p.evaluate(() => [...document.querySelectorAll('.nu-resultats .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'recherche « oeufs » : mon aliment « Œuf »'));
    await ctx.close();

    // Séances du Calendrier : « Reprendre » (Renfo : Musculation, durée du libellé ; Run : l'allure reste à choisir).
    d = base();
    d.seances = [{ id: ID(6), utilisateur: U, date: '2026-10-20', type: 'renfo', libelle: 'Gainage 30 min', faite: false, course: null },
      { id: ID(7), utilisateur: U, date: '2026-10-20', type: 'run', libelle: 'Footing 1 h 15', faite: false, course: null }];
    ({ p, ctx } = await ouvrirN(d));
    pb.push(egal('Au calendrier : Gainage 30 min · Footing 1 h 15 Reprendre', norm(await p.locator('.nu-seances').textContent()), 'séances du jour rappelées'));
    await p.click('[data-act="reprendre"]');
    pb.push(egal([[['muscu', '0,5'], ['', '1,25'], ['', '']], '2 222 kcal'], [await p.evaluate(() => [...document.querySelectorAll('.nu-sport-l')].map(l => [l.querySelector('[name="type"]').value, l.querySelector('[name="heures"]').value])), await kcal(p)], 'Reprendre : musculation 30 min comptée, footing à compléter'));
    await p.clock.runFor(1000); await ecrit(d, e => e.table === 'sport_jour' && e.methode === 'POST');
    pb.push(egal(['POST', 'sport_jour', [{ date: '2026-10-20', type: 'muscu', heures: 0.5 }]], (e => [e.methode, e.table, e.corps])(d.ecritures[d.ecritures.length - 1]), 'Reprendre : seule la séance complète est rangée'));
    await ctx.close();

    // Bloc d'En un coup d'œil : affiché quand Nutrition est dans le menu ; ajout en une touche, puis « Annuler ».
    d = base(); d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Nutrition'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    await p.waitForSelector('.nu-ac-bilan');
    const bilan = async () => norm(await p.locator('.nu-ac-bilan').textContent());
    pb.push(egal(['350 / 2 117 kcal', ['★ Banane', 'Riz cuit · 200 g']], [await bilan(), await p.locator('.nu-ac-choix .mrt-pastille').allTextContents().then(l => l.map(norm))], 'Accueil : bilan du jour, favoris puis récents avec leur dernière quantité'));
    d.ecritures.length = 0;
    await p.click('.nu-ac-choix .mrt-pastille:has-text("Riz cuit")');
    await p.waitForSelector('[data-annuler]');
    pb.push(egal([{ date: '2026-10-20', repas: 'midi', aliment: ID(2), nom: 'Riz cuit', quantite: 2, kcal: 260, proteines: 5.4, glucides: 56, lipides: 0.6 }, '610 / 2 117 kcal', 'Riz cuit ajouté · midi · Annuler'],
      [sansId(d.ecritures[0]), await bilan(), norm(await p.locator('.nu-ac-annonce').textContent())], 'Accueil : une touche ajoute au repas du moment'));
    await p.click('[data-annuler]');
    await p.waitForFunction(() => /retiré/.test(document.querySelector('.nu-ac-annonce').textContent));
    pb.push(egal(['DELETE', '350 / 2 117 kcal'], [d.ecritures[d.ecritures.length - 1].methode, await bilan()], 'Accueil : Annuler retire la ligne'));
    await p.clock.runFor(7000);
    pb.push(egal(0, await p.locator('.nu-ac-annonce').count() && (await p.locator('.nu-ac-annonce').textContent()).length, 'Accueil : l\'annonce s\'efface'));
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Accueil : pas de débordement horizontal'));
    await ctx.close();
    d = base();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    pb.push(egal(0, await p.locator('[data-bloc="nutrition"]').count(), 'Accueil : pas de bloc Nutrition quand le module n\'est pas au menu'));
    await ctx.close();
    d = base(); d.preferences[0].modules = ['En un coup d\'œil', 'Nutrition']; d.profils[0].poids = null;
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    pb.push(egal('Complète ton profil sur la page Nutrition.', norm(await p.locator('[data-bloc="nutrition"] .ac-vide').textContent()), 'Accueil : profil incomplet'));
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
        if (e.closest('.mrt-header, .pc-titre, .pc-grand, .nu-kcal-val, .connexion h1, .ml h1, .leaflet-container')) return;
        vu.add(getComputedStyle(e).fontSize);
      });
      return [...vu].sort();
    });
    for (const [page, quoi] of [['index.html', 'Accueil'], ['objectif.html', 'Objectif'], ['course.html?id=' + id(3), 'page d\'une course'], ['palmares.html', 'Palmarès'],
      ['calendrier.html', 'Calendrier'], ['calendrier.html#mois', 'Calendrier, Mois'], ['calendrier.html#annee', 'Calendrier, Année'], ['courses-a-surveiller.html?vue=tout', 'À surveiller'], ['preferences.html', 'Préférences'], ['nutrition.html', 'Nutrition']]) {
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
    pb.push(egal(true, await o.p.evaluate(() => { const l = document.querySelector('.pref-defaut'); l.scrollIntoView({ block: 'center' }); const r = l.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top - 5) === l && document.elementFromPoint(r.left + r.width / 2, r.bottom + 5) === l; }), 'lien d\'action : zone de toucher débordant de son texte'));
    await o.ctx.close();
    // « 1er » dans la préparation ; « + » d'une séance : le petit rond commun, dessiné ; aucune fenêtre du navigateur.
    o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    const natif = []; o.p.on('dialog', d => { natif.push(d.message()); d.dismiss(); });
    pb.push(egal([true, false, true], await o.p.evaluate(() => { const t = document.querySelector('#preparation').textContent;
      return [/\b1er\b/.test(t), /\b1 (janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)/.test(t), [...document.querySelectorAll('.cal-plus')].every(b => b.classList.contains('mrt-rond') && b.classList.contains('is-petit') && !!b.querySelector('svg'))]; }),
      'préparation : « 1er », jamais « 1 » ; « + » en petit rond commun dessiné'));
    pb.push(egal([true, true], await o.p.evaluate(() => [!!document.querySelector('.pc-fermer svg.mrt-ico'), document.querySelector('.pc-fermer').textContent.trim() === '']), 'croix dessinée, sans caractère tapé'));
    await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.fill('#fc-lieu', 'Ailleurs');
    await o.p.click('.fc-barre [data-fc="annuler"]');
    pb.push(egal(['Abandonner les modifications ?', []], [await repondre(o.p, false), natif], 'Annuler après une saisie : confirmation du site, aucune fenêtre du navigateur'));
    await o.ctx.close();
    // Espace insécable devant « ? » et « : » (posée à l'affichage), jamais dans un champ.
    o = await ouvrir(nav, 'course.html?id=' + id(3), 390, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal([true, true], await o.p.evaluate(() => [document.querySelector('.cal-plan-dates').textContent.includes('début\u00a0: '), !/\u00a0/.test(document.querySelector('.cal-plan-dates').textContent.replace(/début\u00a0: |jour J\u00a0: /g, ''))]),
      'préparation : « début : » insécable devant les deux-points, rien d\'autre de changé'));
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
  async affichage(nav, db) {
    const pb = [];
    for (const [nom, w] of Object.entries(LARGEURS))
      for (const page of ['index.html', 'palmares.html', 'preferences.html', 'objectif.html', 'calendrier.html', 'course.html?id=00000000-0000-0000-0001-000000000020', 'courses-a-surveiller.html', 'nutrition.html'])
        pb.push(...await sansSaut(nav, db, page, w, page.replace(/\.html.*/, '') + ' ' + nom));
    return pb;
  }
};
(async () => {
  if (CAPTURES) fs.mkdirSync(path.join(__dirname, 'captures'), { recursive: true });
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees-fictives.json'), 'utf8'));
  const nav = await chromium.launch(navigateur());
  let echecs = 0;
  for (const [nom, f] of Object.entries(CONTROLES)) {
    if (SEULS.length && !SEULS.includes(nom)) continue;
    const pb = (await f(nav, db)).filter(Boolean);
    echecs += pb.length;
    console.log((pb.length ? 'ÉCHEC ' : 'OK    ') + nom + pb.map(x => '\n      - ' + x).join(''));
  }
  await nav.close();
  process.exit(echecs ? 1 : 0);
})();
