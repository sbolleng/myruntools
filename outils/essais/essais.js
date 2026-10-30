// ===== Banc d'essai =====
//
// Rejoue les jeux d'essai des spécifications dans Chromium, sans réseau :
// la base Supabase est simulée avec donnees-fictives.json (aucune donnée
// personnelle), l'utilisateur fictif est connecté d'office et la date du jour
// est figée au 20 octobre 2026, comme dans les jeux d'essai.
//
// Usage, depuis ce dossier : npm install (une fois), puis
//   node essais.js              tous les contrôles
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
const LARGEURS = { ordinateur: 1200, tablette: 768, telephone: 390 };

// Base simulée : lecture filtrée par les « eq. » de l'adresse ; fonctions lues
// dans db.rpc ; les préférences enregistrées (upsert) sont gardées dans db,
// les suppressions par id sont appliquées, les autres écritures acceptées sans rien changer ; db.panne : écritures en échec ;
// db.ecritures (liste, si elle existe) : les écritures reçues, pour les relire ;
// db.auth : connexion par mot de passe simulée (voir plus bas), db.auth.appels : les appels reçus.
function simulerBase(ctx, db) {
  return ctx.route(PROJET + '/**', route => {
    const req = route.request(), u = new URL(req.url());
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
      if (['seances', 'plan_semaines'].includes(tab) || (tab === 'courses' && req.method() === 'PATCH' && Object.keys(req.postDataJSON()).join() === 'prepa_semaines')) {
        if (!db[tab]) db[tab] = [];
        if (req.method() === 'POST') [].concat(req.postDataJSON()).forEach((l, i) => db[tab].push(Object.assign({ id: 'nouveau-' + db[tab].length + '-' + i, utilisateur: db.profils[0].id }, l)));
        else if (req.method() === 'PATCH') db[tab].filter(correspond).forEach(x => Object.assign(x, req.postDataJSON()));
        else if (req.method() === 'DELETE') db[tab] = db[tab].filter(x => !correspond(x));
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
const egal = (attendu, obtenu, quoi) => (JSON.stringify(attendu) === JSON.stringify(obtenu) ? null : quoi + ' : attendu ' + JSON.stringify(attendu) + ', obtenu ' + JSON.stringify(obtenu));

const CONTROLES = {
  // Spécification générale, en-tête : contenu et disposition.
  async enTete(nav, db) {
    const pb = [];
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
    pb.push(egal(['true', 'Date↓'], [await p.getAttribute('.pv2-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-tri[aria-pressed="true"]').textContent)], 'panneau ouvert ; tri en cours : Date, plus récente d\'abord'));
    await p.click('.pv2-panel label.pv2-check:has(input[value="Trail"])');
    pb.push(egal(['3 courses sur 7', '1', 'Filtres · 1 actif'], [await p.textContent('.pv2-count'), await p.textContent('.pv2-badge'), await p.getAttribute('.pv2-btn', 'aria-label')], 'pastille Trail : 3 courses, pastille « 1 » sur le bouton'));
    await p.click('[data-act="clear"]');
    await p.click('.pv2-panel label.pv2-check:has(input[data-part="year"][value="2025"])');
    const en2025 = await p.textContent('.pv2-count');
    await p.click('.pv2-panel label.pv2-check:has(input[data-part="year"][value=""])');
    pb.push(egal([true, true], [/sur 7$/.test(en2025) && !/^7 /.test(en2025), await p.evaluate(() => document.querySelector('.pv2-count').hidden)], 'année : pastille 2025 filtre, « Toutes » rétablit (compteur retiré)'));
    // Fermer un panneau : rond « × » en haut à droite ; plus de lien « Réduire les filtres ».
    pb.push(egal({ croix: '×', enHaut: true, aDroite: true, reduire: false }, await p.evaluate(() => { const pan = document.querySelector('.pv2-panel:not(.pv2-cols)'), x = pan.querySelector('.pv2-close'), r = pan.getBoundingClientRect(), b = x.getBoundingClientRect();
      return { croix: x.textContent, enHaut: b.top - r.top < 24, aDroite: r.right - b.right < 24, reduire: /Réduire/.test(pan.textContent) }; }), 'panneau des filtres : « × » en haut à droite, plus de « Réduire les filtres »'));
    await p.click('.pv2-panel:not(.pv2-cols) .pv2-close');
    pb.push(egal(['false', true], [await p.getAttribute('.pv2-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-panel:not(.pv2-cols)').hidden)], '« × » ferme le panneau des filtres'));
    await p.click('.pv2-cols-btn');
    pb.push(egal(['true', false], [await p.getAttribute('.pv2-cols-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-cols').hidden)], 'bouton Colonnes : ouvre le panneau des colonnes'));
    await p.click('.pv2-cols .pv2-close');
    pb.push(egal([true, 'false'], [await p.evaluate(() => document.querySelector('.pv2-cols').hidden), await p.getAttribute('.pv2-cols-btn', 'aria-expanded')], '« × » ferme le panneau des colonnes'));
    await p.click('.pv2-btn');
    await p.click('.pv2-tri[data-sort="time"]');
    pb.push(egal('Temps↑', await p.evaluate(() => document.querySelector('.pv2-tri[aria-pressed="true"]').textContent), 'pastille de tri : Temps, plus court d\'abord'));
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
    pb.push(egal(['prochaine', 'pensebete (bientôt)', 'nutrition (bientôt)', 'dicila'], await blocs(p), 'Accueil : blocs par défaut, Pense-bête et Nutrition grisés'));
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
    pb.push(egal(['Objectif'], await ouverture(), 'En un coup d\'œil décoché : Objectif s\'ouvre en arrivant'));
    await p.check('.pref-modules label:has-text("En un coup") input');
    await p.waitForSelector('#bloc-menu .pref-msg:has-text("Enregistré")');
    pb.push(egal(['Prochaine course', 'Pense-bête · bientôt', 'Bilan nutrition · bientôt', 'D\'ici là', 'Dernière course'], await p.evaluate(() => [...document.querySelectorAll('.pref-blocs label')].map(l => l.textContent.trim())), 'page d\'accueil : les cinq blocs'));
    await p.check('.pref-blocs label:has-text("Dernière course") input');
    await p.waitForSelector('#bloc-accueil .pref-msg:has-text("Enregistré")');
    pb.push(egal(['prochaine', 'pensebete', 'nutrition', 'dicila', 'derniere'], db.preferences[0].accueil_blocs, 'Dernière course cochée : enregistrée'));
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
    pb.push(egal(['Compte', 'Cap', 'Thème', 'Menu', 'En un coup d\'œil', 'Partage'], await p.evaluate(() => [...document.querySelectorAll('main h2')].map(h => h.textContent)), 'ordre des blocs'));
    pb.push(egal(['Bleu et orange', 'Vert et rose', 'Violet et turquoise'], await p.evaluate(() => [...document.querySelectorAll('.pref-theme')].map(l => l.textContent)), 'thèmes, sans mention'));

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
    const catalogue = ['En un coup d\'œil', 'Cette semaine', 'Objectif', 'Calendrier', 'Nutrition', 'Palmarès', 'Profil', 'Guide'];
    pb.push(egal(catalogue, await menu(), 'menu par défaut'));
    pb.push(egal(8, await p.locator('.pref-modules input[type="checkbox"]:checked').count(), 'tous les modules cochés, En un coup d\'œil compris'));
    pb.push(egal(4, await p.locator('.pref-modules .bientot').count(), 'modules non construits grisés'));
    await p.click('[aria-label="Monter Palmarès"]'); await attendre();
    const monte = ['En un coup d\'œil', 'Cette semaine', 'Objectif', 'Calendrier', 'Palmarès', 'Nutrition', 'Profil', 'Guide'];
    pb.push(egal(monte, await menu(), 'Palmarès monté, menu aussitôt'));
    await recharger();
    pb.push(egal(monte, await menu(), 'ordre conservé après rechargement'));
    await p.locator('.pref-modules label', { hasText: 'Guide' }).locator('input').uncheck(); await attendre();
    pb.push(egal(false, (await menu()).includes('Guide'), 'Guide décoché, absent du menu'));
    await p.click('#bloc-menu .pref-defaut'); await attendre();
    pb.push(egal(catalogue, await menu(), 'ordre par défaut rétabli'));
    for (const n of catalogue.slice(1)) { await p.locator('.pref-modules label', { hasText: n }).locator('input').uncheck(); await attendre(); }
    pb.push(egal(['En un coup d\'œil'], await menu(), 'un seul module affiché'));
    pb.push(egal(true, await q('.pref-modules input[data-i]:checked', 'x.disabled'), 'dernière case non décochable'));
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
    pb.push(egal(false, await p.evaluate(() => /Collines|Sommets|San Sebasti/.test(document.querySelector('main').textContent)), 'ni abandonnée, ni à surveiller, ni courue'));
    pb.push(egal(['Trail des Crêtes', "5 courses | D'ici là", 'prochaine course · Trail du Lac · J-26'], await p.evaluate(() => [document.querySelector('h1 em').textContent,
      [...document.querySelectorAll('.mrt-stat')].map(s => s.querySelector('.mrt-stat-val').textContent + ' | ' + s.querySelector('.mrt-stat-label').textContent)[3], document.querySelector('.mrt-next').textContent]), 'en-tête'));
    const [lac, corrida, gorges, groupe, foret, cretes] = k;
    pb.push(egal({ role: 'Préparatoire', compteur: '26j 00h 00min 00s', date: '15 nov. 2026', info: 'Mont-Clair · Trail court',
      lignes: ['Distance | 24 km · 650 m D+', 'Objectif | 02:45:00', 'Dossard | Inscrit · n° 412'] },
      { role: lac.role, compteur: lac.compteur, date: lac.date, info: lac.info, lignes: lac.lignes }, 'Trail du Lac'));
    pb.push(egal({ role: 'Plaisir', compteur: '54j 09h 30min 00s', lignes: ['Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Dossard | Ouvre le 01/11/2026'] },
      { role: corrida.role, compteur: corrida.compteur, lignes: corrida.lignes }, 'Corrida de Noël'));
    pb.push(egal({ role: 'Objectif intermédiaire', cle: true, compteur: '137j 22h 30min 00s', objectif: 'Objectif | 06:30:00' },
      { role: gorges.role, cle: /is-cle/.test(gorges.classes), compteur: gorges.compteur, objectif: gorges.lignes[1] }, 'Trail des Gorges'));
    pb.push(egal({ opt: true, role: 'Préparatoire • 2 candidats', cands: [
      { nom: 'Trail des Cimes', date: '30 mai 2027', lignes: ['Distance | 42 km · 2 500 m D+', 'Dossard | Ouvre le 10/01/2027'], compteur: false, role: false },
      { nom: 'Ultra du Plateau · Le 55', date: '26 juin 2027', lignes: ['Distance | 55 km · 2 800 m D+', 'Dossard | Inscription ouverte ↗'], compteur: false, role: false }] },
      { opt: /is-opt/.test(groupe.classes), role: groupe.role, cands: groupe.cands }, 'Printemps 2027'));
    pb.push(egal(true, await p.evaluate(() => { const a = document.querySelectorAll('.ob-cand .ob-ins')[1]; return a.tagName === 'A' && a.classList.contains('is-ouvert') && a.target === '_blank' && a.getAttribute('href') === 'https://example.org/plateau/inscription'; }), 'inscription ouverte : lien, en Alerte'));
    pb.push(egal({ opt: true, role: 'Préparatoire', date: 'juillet 2027', compteur: null, lignes: ['Distance | 30 km · 1 200 m D+', 'Dossard | Ouverture à venir'] },
      { opt: /is-opt/.test(foret.classes), role: foret.role, date: foret.date, compteur: foret.compteur, lignes: foret.lignes }, 'Trail de la Forêt'));
    pb.push(egal({ obj: true, role: 'Objectif principal', compteur: '311j 19h 00min 00s', objectif: 'Objectif | Finisher', dossard: 'Dossard | Inscrit · n° 88' },
      { obj: /is-obj/.test(cretes.classes), role: cretes.role, compteur: cretes.compteur, objectif: cretes.lignes[1], dossard: cretes.lignes[2] }, 'Trail des Crêtes'));
    pb.push(egal(['311', '19h 00m 00s'], await p.evaluate(() => [document.querySelector('.mrt-days').textContent, document.querySelector('.mrt-hms').textContent]), 'en-tête : compte à rebours jusqu\'à l\'heure de départ'));
    // Couleurs (thème bleu et orange) : nom en Texte, date en Texte discret, chiffres du compteur et objectif en Accent 2 ; libellés à 0,7 rem.
    pb.push(egal({ nom: 'rgb(238, 243, 250)', date: 'rgb(143, 168, 201)', compteur: 'rgb(255, 212, 0)', objectif: 'rgb(255, 212, 0)', libelle: '11.2px', indicateur: 'rgb(238, 243, 250)' },
      await p.evaluate(() => { const c = document.querySelector('.ob-carte'), st = s => getComputedStyle(c.querySelector(s));
        return { nom: st('.ob-nom').color, date: st('.ob-date').color, compteur: st('.ob-cpt-case b').color, objectif: st('.ob-cible').color, libelle: st('.ob-lib').fontSize,
          indicateur: getComputedStyle(document.querySelector('.mrt-stat-val')).color }; }), 'couleurs et libellés'));
    await figer(p, 1000);
    pb.push(egal('25j 23h 59min 59s', (await cartes(p))[0].compteur, 'une seconde plus tard'));
    // Liens : ↗ et inscription au-dessus du lien de la carte ; la carte ouvre la page de la course.
    pb.push(egal([true, true], await p.evaluate(() => ['.ob-carte .ob-ext', '.ob-ins.is-ouvert'].map(sel => {
      const a = document.querySelector(sel);
      a.scrollIntoView({ block: 'center' });
      const b = a.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2).closest('a') === a;
    })), '↗ et inscription cliquables à part'));
    pb.push(egal(['_blank', 'https://example.org/trail-du-lac'], await p.evaluate(() => { const a = document.querySelector('.ob-carte .ob-ext'); return [a.target, a.getAttribute('href')]; }), '↗ : site officiel, nouvel onglet'));
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
          liens: [...document.querySelectorAll('.pc-liens a')].map(t), nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.className + ' | ' + t(a.querySelector('b'))),
          vide: t(q('.ob-vide')), titreDoc: document.title
        };
      });
      await o.ctx.close();
      return [r, o.erreurs];
    };
    let [r, err] = await pageCourse(id(3));
    pb.push(egal({ modale: true, barre: ['modifier', 'fermer'], sur: 'Objectif intermédiaire · Étape 3 sur 6', titre: 'Trail des Gorges', info: 'Mont-Clair · Trail long · dim. 7 mars 2027, 7 h 30',
      compteur: '137j 22h 30min 00s', fiche: ['Distance | 45 km · 2 100 m D+', 'D− | 2 100 m', 'Objectif | 06:30:00', 'Précisions | Sous 6 h 45 dans tous les cas.', 'Dossard | Inscrit · n° 1287', 'Prix | 58 €'], dossards: 1 },
      { modale: r.modale, barre: r.barre, sur: r.sur, titre: r.titre, info: r.info, compteur: r.compteur, fiche: r.fiche, dossards: r.dossards }, 'page Trail des Gorges, haut et fiche'));
    pb.push(egal(['Préparation', 'Rôle dans la préparation', 'Stratégie ou enchaînement', 'Logistique', 'Description', 'Liens'], r.cellules, 'page Trail des Gorges, textes'));
    pb.push(egal(['Site officiel ↗', 'Inscription ↗', 'Résultats en direct ↗'], r.liens, 'page Trail des Gorges, liens'));
    pb.push(egal(['is-precedente | Corrida de Noël', 'is-suivante | Trail des Cimes'], r.nav, 'page Trail des Gorges, navigation'));
    pb.push(egal('Trail des Gorges · MyRunTools', r.titreDoc, 'page Trail des Gorges, titre de l\'onglet'));
    pb.push(egal([], err, 'page d\'une course, erreurs JavaScript'));
    [r] = await pageCourse(id(2));
    pb.push(egal({ cellules: ['Préparation', 'Liens'], fiche: ['Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Dossard | Ouvre le 01/11/2026'], liens: ['Site officiel ↗'] },
      { cellules: r.cellules, fiche: r.fiche, liens: r.liens }, 'page Corrida de Noël : ni D−, ni prix'));
    [r] = await pageCourse(id(4));
    pb.push(egal({ sur: 'Préparatoire · Étape 4 sur 6', groupe: 'Printemps 2027 · autre candidat : Ultra du Plateau · Le 55' }, { sur: r.sur, groupe: r.groupe }, 'page Trail des Cimes'));
    [r] = await pageCourse(id(1));
    pb.push(egal(['is-suivante | Corrida de Noël'], r.nav, 'page Trail du Lac, pas de course précédente'));
    [r] = await pageCourse(id(7));
    pb.push(egal(['is-precedente | Trail de la Forêt'], r.nav, 'page Trail des Crêtes, pas de course suivante'));
    // Ordinateur : la modale (marges de 2 rem et cadre de 1 px : 896 px de texte, comme les pages), la fiche encadrée, tous les textes ouverts, sans pouvoir les replier.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS));
    pb.push(egal({ largeur: 896, cadre: '1px', textes: 6, ouverts: 6, repliable: 'none' }, await p.evaluate(() => ({ largeur: Math.round(document.querySelector('.pc').getBoundingClientRect().width),
      cadre: getComputedStyle(document.querySelector('.pc-fiche')).borderTopWidth, textes: document.querySelectorAll('.pc-cellule').length,
      ouverts: document.querySelectorAll('.pc-cellule[open]').length, repliable: getComputedStyle(document.querySelector('.pc-cellule > summary')).pointerEvents })), 'ordinateur : modale, fiche encadrée, textes ouverts'));
    await ctx.close();
    // Téléphone : rien ne dépasse, compteur sur une ligne, fiche dans le premier écran, textes repliés sauf le premier.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 390, db, {}, PARIS));
    await figer(p);
    const tc = await p.evaluate(() => {
      const cases = [...document.querySelectorAll('.pc-fiche .ob-cpt-case')].map(c => c.getBoundingClientRect());
      return { debordement: document.documentElement.scrollWidth > innerWidth, compteurUneLigne: cases.every(c => Math.abs(c.top - cases[0].top) < 3),
        ouvertes: [...document.querySelectorAll('.pc-cellule')].map(d => d.open), haut: Math.round(document.querySelector('.pc-fiche').getBoundingClientRect().top) };
    });
    pb.push(egal({ debordement: false, compteurUneLigne: true, ouvertes: [true, false, false, false, false, false] },
      { debordement: tc.debordement, compteurUneLigne: tc.compteurUneLigne, ouvertes: tc.ouvertes }, 'téléphone : page d\'une course'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-course-telephone.png'), fullPage: false });
    pb.push(egal(true, tc.haut < 330, 'téléphone : la fiche commence dans le premier écran (' + tc.haut + ' px)'));
    await p.locator('.pc-cellule > summary').nth(1).click();
    pb.push(egal([true, true], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(0, 2).map(d => d.open)), 'téléphone : toucher le titre ouvre la cellule'));
    pb.push(egal([], erreurs, 'téléphone, page d\'une course, erreurs JavaScript'));
    await ctx.close();
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
    pb.push(egal('253j 14h 00min 00s', (await cartes(p)).find(x => x.nom === 'Trail de la Forêt').compteur, 'confirmée au mois seul : compteur jusqu\'au 1er du mois'));
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
    pb.push(egal([t0, t0, t0, t0, { debordement: false, roleDeuxLignes: true, titreOuLegende: false }], tel, 'téléphone'));
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
    pb.push(egal(['Trail des Gorges', 'Objectif intermédiaire · Étape 3 sur 6'], [r.titre, r.sur], 'lecture seule, page d\'une course'));
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
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, db, {}, PARIS));
    await p.click('[data-course="' + id(3) + '"]');
    await p.waitForSelector('.mc-panneau #preparation');
    pb.push(egal(true, await p.evaluate(() => !!document.querySelector('.cal-bloc') && !!document.querySelector('.mc-panneau')), 'Calendrier : modale au-dessus du calendrier'));
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
    pb.push(egal({ barre: ['Annuler', 'Enregistrer', 'Modifier la course'], croix: 0, couches: 0, feuilles: 1, blocs: ['Course', 'Place dans le plan', 'Préparation', 'Logistique', 'Dossard', 'Liens'], dossard: ['dossard', '1287'] },
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
    p.on('dialog', x => { questions.push(x.message()); x.dismiss(); });
    await p.click('.fc-barre [data-fc="annuler"]');
    await consultation(p);
    pb.push(egal([[], 0], [questions, await p.locator('.fc-fiche').count()], 'Annuler sans saisie : consultation, sans question'));
    // Après une saisie : « Abandonner les modifications ? » ; refusée, l'édition reste.
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-lieu', 'Ailleurs');
    await p.keyboard.press('Escape');
    pb.push(egal([['Abandonner les modifications ?'], 1], [questions, await p.locator('.fc-fiche').count()], 'Échap après une saisie : question, l\'édition reste'));
    // Enregistrer : la course est rangée, retour à la consultation mise à jour.
    await p.click('.fc-barre .fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' }); await consultation(p);
    await p.waitForFunction(() => /Ailleurs/.test(document.querySelector('.pc-info').textContent));
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
    pb.push(egal({ barre: ['Annuler', 'Enregistrer', 'Modifier la course'], blocs: ['Course', 'Place dans le plan', 'Préparation', 'Logistique', 'Dossard', 'Résultat', 'Montre', 'Liens'],
      ouverts: ['course', 'resultat'], approx: 0, statut: 0, classements: true },
      { barre: await barre(p), blocs: await titres(p), ouverts: await p.evaluate(() => [...document.querySelectorAll('.fc-fiche .fc-bloc-titre[aria-expanded="true"]')].map(b => b.dataset.bloc).filter(b => !['dossard', 'montre', 'liens'].includes(b))),
        approx: await p.locator('#fc-date_approx').count(), statut: await p.locator('#fc-statut').count(),
        classements: await p.evaluate(() => document.querySelector('#fc-place').closest('.fc-grille').previousElementSibling.dataset.bloc === 'resultat') }, 'Palmarès : fiche unique, course courue'));
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
    pb.push(egal([0, 0, 0], [await p.locator('.pc-cellule').count(), await p.locator('.pc-fiche').count(), await p.locator('.pc-lien-res').count()], 'consultation : ni bloc repliable, ni fiche encadrée, ni lien Résultats sans adresse'));
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
      dossard: '1287', prix: 58, objectif: '01:50:00', dplus: 40, dmoins: 38, montre_temps: 6950, montre_distance: 21.3, montre_dplus: 40, fc_moyenne: 151, categorie: 'M2', strategie: 'Partir prudemment.', pourquoi: 'Répétition.', logistique: 'Train.', description: 'Semi.', lien: 'https://example.org/semi', lien_resultats: 'https://example.org/resultats' });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, d, {}, PARIS));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal({ infos: ['dim. 4 oct. 2026', 'Semi-marathon · Dossard 1287', '21,1 km · 40 m D+'],
      Résultat: ['Temps | 01:56:05', 'Place | 112e / 640', 'Catégorie | 18e / 96 Master 2 Homme', 'Sexe | 95e / 510', 'Vitesse | 10,9 km/h', 'Allure | 5:30 /km'],
      Montre: ['Temps | 01:55:50', 'Distance | 21,3 km', 'D+ · D− | 40 · — m', 'FC moy. | 151 bpm'] },
      await fiche(p), 'consultation : dossard, distance et D+ sous le titre ; temps puis place ; catégorie en clair ; Montre seule en bas ; ni objectif, ni précisions, ni prix'));
    pb.push(egal([['Résultat', 'Montre'], 'https://example.org/resultats', 'Résultats', 0, 0], [await p.locator('.pc-intertitre > span').allTextContents(), await p.locator('.pc-lien-res').getAttribute('href'),
      (await p.locator('.pc-lien-res').textContent()).trim(), await p.locator('.pc-liens').count(), await p.locator('.pc-cellule').count()], 'consultation : deux sections, lien Résultats dans l\'intertitre, plus de bloc Liens'));
    pb.push(egal([1, ''], [await p.locator('.pc-titre .ob-ext svg').count(), (await p.locator('.pc-titre .ob-ext').textContent()).trim()], 'site officiel : flèche dessinée, pas de caractère ↗ (emoji sur iPhone)'));
    await ctx.close();
    // Téléphone : rien ne dépasse.
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 390, d, {}, Object.assign({ mobile: true }, PARIS)));
    await ligneSeb(p);
    await consultation(p);
    pb.push(egal(false, await p.evaluate(() => document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth), 'téléphone : Résultat et Montre ne dépassent pas'));
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
    pb.push(egal([0, 1], [await p.locator('[data-ob="modifier"]').count(), await p.locator('.pc-fermer').count()], 'lecture seule : la consultation s\'ouvre, sans crayon'));
    await ctx.close();

    // Téléphone : plein écran, rien ne dépasse, crayon visible au bout des lignes.
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 390, copie(), {}, Object.assign({ mobile: true }, PARIS)));
    pb.push(egal('1', await p.evaluate(() => getComputedStyle(document.querySelector('.pv2-edit')).opacity), 'écran tactile : crayon de ligne visible'));
    await ligneSeb(p);
    await consultation(p);
    await p.waitForFunction(() => !document.getAnimations().length);
    pb.push(egal({ haut: 0, debordement: false, cellules: 0 }, await p.evaluate(() => ({ haut: Math.round(document.querySelector('.mc-panneau').getBoundingClientRect().top),
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
    pb.push(egal(['Course', 'Place dans le plan', 'Préparation (replié)', 'Logistique (replié)', 'Dossard (replié)', 'Liens (replié)'], blocs, 'six blocs, quatre repliés (Logistique avant Dossard)'));
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
      distance: 28.5, dplus: 1200, dmoins: null, description: 'Boucle autour du lac.', statut: 'confirmee', role: 'preparatoire', groupe_options: null, objectif: 'Sub 6h', objectif_precisions: 'Partir prudemment.', pourquoi: null, strategie: null, logistique: null,
      ouverture_inscriptions: null, inscrit: true, inscription: null, dossard: '77', prix: 45.5, lien: 'https://example.org/lacs', lien_resultats: null, id: w.corps.id }, w.corps, 'enregistrement : champs écrits'));
    await ctx.close();

    // Nouvelle course : plan réglé avant d'enregistrer ; date approximative : pas de plan
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Trail des Lacs'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court');
    pb.push(egal(['Plan de 12 semaines · début : lun. 22 mars 2027 → jour J : sam. 12 juin 2027', false], await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelector('[data-fc="preparer"]').disabled]), 'nouvelle course : plan tiré de la date et du format saisis'));
    await p.check('#fc-date_approx');
    pb.push(egal(['Plan de 12 semaines · début : lun. 15 mars 2027 → jour J : mar. 1 juin 2027', 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.', false],
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
    pb.push(egal(true, (await p.textContent('#preparation')).includes('Date approximative : préparation prévue pour le début du mois'), 'page d\'une course à date approximative : mention dans la rubrique Préparation'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Plan de 12 semaines · début : lun. 12 avr. 2027 → jour J : jeu. 1 juil. 2027', await p.textContent('.fc-prep .cal-plan-dates'), 'formulaire, date approximative : plan au 1er du mois'));
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
    await p.fill('#fc-heure', '8h');
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
    pb.push(egal([], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')].filter(g => g.hidden).map(g => g.previousElementSibling.textContent)), 'modifier : aucun bloc replié'));
    // Bloc Préparation : résumé du plan, frise, « Paramétrer le plan » par-dessus le formulaire ; Échap ne ferme que la fenêtre du plan
    pb.push(egal(['Plan de 16 semaines · début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027', 1, 'Paramétrer le plan'], await p.evaluate(() => {
      const z = document.querySelector('.fc-prep');
      return [z.querySelector('.cal-plan-dates').textContent, z.querySelectorAll('.cal-frise').length, z.querySelector('[data-fc="preparer"]').textContent.trim()];
    }), 'modifier : plan de la course en tête du bloc Préparation'));
    await p.click('[data-fc="preparer"]'); await p.waitForSelector('.cal-preparer');
    pb.push(egal(true, await p.evaluate(() => { const r = document.querySelector('.cal-preparer').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + 10).closest('.cal-preparer') !== null; }), 'Paramétrer le plan : la fenêtre passe devant le formulaire'));
    await p.keyboard.press('Escape');
    pb.push(egal([0, 1], [await p.locator('.cal-voile').count(), await p.locator('.fc-fiche').count()], 'Échap : ferme la fenêtre du plan, le formulaire reste ouvert'));
    // « Valider » : rien n'est écrit ; le résumé suit ; durée et phases s'enregistrent avec la course
    await p.click('[data-fc="preparer"]'); await p.waitForSelector('.cal-preparer');
    pb.push(egal('Valider', await p.textContent('.cal-preparer [data-act="enregistrer"]'), 'fenêtre du plan depuis le formulaire : bouton « Valider »'));
    await p.fill('.cal-preparer [name="duree"]', '12'); await p.press('.cal-preparer [name="duree"]', 'Tab');
    await p.click('.cal-preparer [data-act="enregistrer"]');
    pb.push(egal(['Plan de 12 semaines · début : lun. 14 déc. 2026 → jour J : dim. 7 mars 2027', 0], [await p.textContent('.fc-prep .cal-plan-dates'), o.copie.ecritures.length], 'Valider : résumé à 12 semaines, rien d\'écrit avant « Enregistrer »'));
    const rempli = await p.evaluate(() => Object.fromEntries(['date', 'heure', 'course', 'lieu', 'format', 'dplus', 'dmoins', 'role', 'objectif', 'dossard', 'prix', 'logistique', 'lien', 'inscription', 'lien_resultats'].map(k => [k, document.getElementById('fc-' + k).value])));
    pb.push(egal({ date: '2027-03-07', heure: '07:30', course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'trail_long', dplus: '2100', dmoins: '2100', role: 'objectif_intermediaire', objectif: '06:30:00',
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
    pb.push(egal('Supprimer cette course ? Cette action est définitive.', await p.textContent('.fc-confirmer p'), 'suppression : confirmation'));
    await p.click('[data-fc="garder"]');
    pb.push(egal(0, o.copie.ecritures.length, 'suppression annulée : rien d\'écrit'));
    await p.click('.fc-supprimer');
    await p.click('[data-fc="confirmer"]');
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['DELETE', '?id=eq.' + id(2)], [o.copie.ecritures[0].methode, o.copie.ecritures[0].filtres], 'suppression : ligne effacée, retour à la feuille de route'));
    await ctx.close();

    // Retenir une course d'un groupe d'options
    o = await neuve(1200, COURSE(4)); ({ p, ctx } = o);
    p.once('dialog', d => d.accept());
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
    pb.push(egal(['Marquer comme courue', ['Course', 'Place dans le plan', 'Préparation', 'Logistique', 'Dossard', 'Résultat', 'Montre', 'Liens'], 0], [await p.textContent('#fc-titre'),
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
    pb.push(egal(['Course', 'Place dans le plan', 'Préparation', 'Logistique', 'Dossard', 'Résultat', 'Montre', 'Liens'], (await p.locator('.fc-bloc-titre').allTextContents()).map(x => x.trim()), 'Palmarès : blocs de la fiche unique'),
      egal(['Course', 'Parcours', 'Date', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Description'], await labels('[data-bloc="course"]'), 'Palmarès : bloc Course, dans l\'ordre'),
      egal([['Place au général', 2], ['Effectif du général', 2], ['Catégorie', 3], ['Place en catégorie', 3], ['Effectif catégorie', 3], ['Place par sexe', 2], ['Effectif par sexe', 2]],
        await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; g.hidden = false; const l = g.getBoundingClientRect().width;
          return [...g.children].slice(2).map(e => [e.querySelector(':scope > label').textContent.trim(), Math.round(l / e.getBoundingClientRect().width)]); }),
        'Palmarès : classements dans Résultat, général et sexe sur toute la largeur (deux champs), catégorie à gauche de la place en catégorie (trois champs)'),
      egal(['Temps', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Allure moyenne (par km)', 'FC moyenne (bpm)'], await labels('[data-bloc="montre"]'), 'Palmarès : Montre, temps et distance, D+ et D−, allure et FC'),
      egal(['M0', 'M10', 15], await p.evaluate(() => { const o = [...document.querySelectorAll('#fc-categorie option')].map(x => x.value).filter(Boolean); return [o[4], o[14], o.length]; }), 'Palmarès : catégories FFA (CA, JU, ES, SE, M0 à M10)'),
      egal(['Temps', 'Non terminée (DNF)', 'Allure moyenne (par km)', 'Place au général', 'Effectif du général', 'Catégorie', 'Place en catégorie', 'Effectif catégorie', 'Place par sexe', 'Effectif par sexe'],
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
    pb.push(egal(['Course', 'Parcours', 'Date', 'Date approximative (mois seulement)', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Description'], ordre.labels, 'Objectif : ordre du bloc Course'),
      egal([true, true, true, true], [ordre.distanceSeule, ordre.dplusDmoins, ordre.descriptionDessous, /^Texte libre/.test(ordre.exemple)], 'Objectif : distance seule, D+ et D− côte à côte, description dessous avec un exemple de texte libre'));
    await p.click('[data-bloc="dossard"]');
    const dos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { ligne1: Math.abs(r('fc-ouverture_inscriptions').bottom - r('fc-inscrit').bottom) < 30 && r('fc-inscrit').left > r('fc-ouverture_inscriptions').right,
        ligne2: Math.abs(r('fc-dossard').top - r('fc-prix').top) < 2 && r('fc-dossard').top > r('fc-ouverture_inscriptions').bottom,
        site: r('fc-inscription').top > r('fc-ouverture_inscriptions').bottom && r('fc-dossard').top > r('fc-inscription').bottom, grise: document.getElementById('fc-dossard').disabled }; });
    pb.push(egal({ ligne1: true, ligne2: true, site: true, grise: true }, dos, 'Objectif : Dossard (ouverture et Inscrit, puis site d\'inscription, puis numéro et prix) ; numéro grisé tant que non inscrit'));
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

  // Spécification du Calendrier, § 10 : vue Année (lot 1).
  async calendrier(nav, db0) {
    const pb = [];
    const { db } = jeuObjectif(db0);
    const lire = p => p.evaluate(() => {
      const jours = [...document.querySelectorAll('.cal-j')];
      const titre = j => j.getAttribute('title') || '';
      return {
        blocs: document.querySelectorAll('.cal-bloc').length,
        colonnes: [...document.querySelectorAll('.cal-bloc')].map(b => b.querySelectorAll('.cal-mois').length),
        mois: [...document.querySelectorAll('.cal-mois')].map(m => m.textContent.replace(/\s+/g, ' ').trim()),
        courses: jours.filter(j => j.querySelector('.cal-nom')).map(j => [j.querySelector('.cal-nom').textContent, [...j.classList].find(c => /^c-|^courue$/.test(c))]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
        corrida: jours.filter(j => /prépa : Corrida de Noël/.test(titre(j)) && j.querySelector('.cal-trait')).length,
        couloirs: Math.max(0, ...jours.map(j => j.querySelectorAll('.cal-trait').length)),
        traits: jours.filter(j => j.querySelector('.cal-trait.debut')).map(j => [titre(j).split(' · ')[0], (titre(j).match(/début de la prépa : ([^(]*) \(/) || [])[1]]).sort((a, b) => (a[1] < b[1] ? -1 : 1)),
        passes: document.querySelectorAll('.cal-j.passe').length,
        aujourdhui: document.querySelectorAll('.cal-j.auj').length,
        lacTitre: (jours.find(j => j.querySelector('.cal-trait') && titre(j).includes('début de la prépa : Trail du Lac')) || document.body).getAttribute('title'),
        texte: document.querySelector('main').textContent,
        menu: [...document.querySelectorAll('.mrt-nav a, .mrt-nav span')].map(e => e.textContent.trim()).filter(Boolean),
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    db.courses.push({ id: '00000000-0000-0000-0002-000000000098', utilisateur: db.profils[0].id, course: 'Option passée', date: '2026-10-10', format: 'trail_court',
      statut: 'option', etat: 'a_venir', role: 'preparatoire', date_approx: false });

    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html', w, db, {}, PARIS);
      const r = await lire(p);
      const tel = w < 600;
      pb.push(
        egal(tel ? 4 : 2, r.blocs, nom + ', nombre de blocs'),
        egal(tel ? [3, 3, 3, 3] : [6, 6], r.colonnes, nom + ', colonnes par bloc'),
        egal(['oct. 26', 'nov.', 'déc.', 'janv. 27', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.'], r.mois, nom + ', mois, d\'octobre 2026 à septembre 2027'),
        egal([['Corrida de Noël', 'c-route-v'], ['Semi de San Sebastián', 'courue'], ['Trail de la Forêt', 'c-trail-n'], ['Trail des Cimes', 'c-trail-n'],
          ['Trail des Crêtes', 'c-trail-v'], ['Trail des Gorges', 'c-trail-v'], ['Trail du Lac', 'c-trail-v'], ['Ultra du Plateau', 'c-trail-n']], r.courses, nom + ', courses et couleurs'),
        egal([['jeu. 1 oct. 2026', 'Trail du Lac'], ['lun. 19 oct. 2026', 'Corrida de Noël'], ['lun. 16 nov. 2026', 'Trail des Gorges'], ['lun. 8 févr. 2027', 'Trail des Cimes'],
          ['lun. 8 mars 2027', 'Ultra du Plateau'], ['lun. 12 avr. 2027', 'Trail de la Forêt'], ['lun. 10 mai 2027', 'Trail des Crêtes']].sort((a, b) => (a[1] < b[1] ? -1 : 1)),
          r.traits, nom + ', traits de début de prépa'),
        egal(19, r.passes, nom + ', 1er au 19 octobre atténués'),
        egal(55, r.corrida, nom + ', trait vertical de la Corrida de Noël du 19 octobre jusqu\'à la veille de la course (12 décembre), sans interruption'),
        egal(true, r.couloirs >= 2, nom + ', deux prépas qui se chevauchent : deux traits côte à côte'),
        egal(1, r.aujourdhui, nom + ', aujourd\'hui repéré'),
        egal(true, (r.lacTitre || '').includes('commencée le 24 août 2026'), nom + ', Trail du Lac : prépa commencée avant la fenêtre'),
        egal(false, /Cross des Collines|Trail des Sommets|Option passée/.test(r.texte), nom + ', abandonnée, à surveiller et option passée absentes'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      if (!tel) pb.push(egal(true, r.menu.includes('Calendrier'), 'menu : Calendrier présent'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-' + nom.replace('é', 'e') + '.png'), fullPage: true });
      await ctx.close();
    }
    // Durée de préparation : celle de la course l'emporte sur celle du format ; sans l'une ni l'autre, pas de trait.
    const durees = JSON.parse(JSON.stringify(db));
    durees.courses.find(c => c.course === 'Trail des Gorges').prepa_semaines = 20;
    durees.courses.find(c => c.course === 'Corrida de Noël').format = 'tri_s';
    let o = await ouvrir(nav, 'calendrier.html', 1200, durees, {}, PARIS);
    const rd = await lire(o.p);
    pb.push(egal('lun. 19 oct. 2026', (rd.traits.find(t => t[1] === 'Trail des Gorges') || [])[0], 'prépa de 20 semaines propre à la course : début le 19 octobre'),
      egal(undefined, rd.traits.find(t => t[1] === 'Corrida de Noël'), 'format sans durée : pas de trait'));
    await o.ctx.close();
    // Thème changé : seules les couleurs changent.
    const autre = JSON.parse(JSON.stringify(db));
    autre.preferences[0].theme = 'vert-rose';
    const { p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, autre, {}, PARIS);
    const r2 = await lire(p);
    pb.push(egal(8, r2.courses.length, 'vert et rose : mêmes courses'));
    await ctx.close();
    return pb;
  },

  // Spécification du Calendrier, § 10 : vues 4 semaines et plan d'une course, séances, « Préparer » (lot 3).
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
    const semaines = p => p.evaluate(() => [...document.querySelectorAll('.cal-sem')].map(s => [s.querySelector('.cal-sem-titre').textContent, s.querySelector('.cal-sem-phase').textContent,
      (s.querySelector('.cal-aussi') || {}).textContent || null]));
    const seances = p => p.evaluate(() => [...document.querySelectorAll('.cal-se')].map(e => [e.closest('.cal-jr').querySelector('.cal-jr-nom').textContent,
      e.querySelector('.cal-se-txt').textContent.trim().replace(/\s+/g, ' '), e.querySelector('input').checked]));

    // --- Vue 4 semaines, ordinateur
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'calendrier.html#semaines', 1200, d, {}, PARIS);
    pb.push(
      egal([['Sem. du 19 oct.', 'Développement', 'aussi : Corrida de Noël'], ['Sem. du 26 oct.', 'Développement', 'aussi : Corrida de Noël'],
        ['Sem. du 2 nov.', 'Affûtage', 'aussi : Corrida de Noël'], ['Sem. du 9 nov.', 'Affûtage', 'aussi : Corrida de Noël']], await semaines(p), '4 semaines : phases du plan le plus proche'),
      egal([['lun. 19', 'Renfo Gainage 30 min', true], ['mar. 20', 'Run 8×400 m', false], ['jeu. 22', 'Run Footing 45 min', false], ['sam. 24', 'Run Sortie 1 h 30', false]], await seances(p), '4 semaines : séances'),
      egal([['dim. 1', '◆ Ouverture des inscriptions · Corrida de Noël']], await p.evaluate(() => [...document.querySelectorAll('.cal-rdv')].map(e => [e.closest('.cal-jr').querySelector('.cal-jr-nom').textContent, e.textContent])), '4 semaines : rendez-vous clé'),
      egal([['dim. 15', 'Trail du Lac', true]], await p.evaluate(() => [...document.querySelectorAll('.cal-jr-course')].map(e => [e.closest('.cal-jr').querySelector('.cal-jr-nom').textContent, e.textContent, e.classList.contains('c-trail-v')])), '4 semaines : jour de course'),
      egal(true, await p.evaluate(() => document.querySelector('.cal-vue').value === 'semaines'), 'bandeau sur « 4 semaines »'),
      egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), '4 semaines : débordement horizontal'));
    // Case « faite »
    await p.locator('[data-fait="se-2"]').check();
    for (let i = 0; i < 20 && !d.ecritures.some(e => e.table === 'seances'); i++) await p.clock.runFor(100);
    pb.push(egal({ methode: 'PATCH', corps: { faite: true } }, (({ methode, corps }) => ({ methode, corps }))(d.ecritures.find(e => e.table === 'seances')), 'case « faite » : écriture'));
    // Ajout, validation, modification, suppression
    p.on('dialog', x => x.accept());
    await p.click('[data-ajout="2026-10-21"]');
    await p.click('.cal-seance button[type="submit"]');
    pb.push(egal('Écris le libellé de la séance.', await p.textContent('.cal-msg'), 'séance sans libellé : message'));
    await p.fill('.cal-seance [name="libelle"]', 'Footing 30 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal({ date: '2026-10-21', type: 'run', libelle: 'Footing 30 min' }, (({ date, type, libelle }) => ({ date, type, libelle }))(d.seances[d.seances.length - 1]), 'séance ajoutée : écriture'),
      egal(true, (await seances(p)).some(x => x[0] === 'mer. 21' && x[1] === 'Run Footing 30 min'), 'séance ajoutée : affichée au bon jour'));
    await p.click('[data-edit="se-3"]');
    await p.selectOption('.cal-seance [name="type"]', 'renfo'); await p.fill('.cal-seance [name="libelle"]', 'Gainage 20 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal(['Renfo Gainage 20 min'], (await seances(p)).filter(x => x[0] === 'jeu. 22').map(x => x[1]), 'séance modifiée'));
    await p.click('[data-edit="se-3"]');
    await p.click('[data-act="supprimer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([], (await seances(p)).filter(x => x[0] === 'jeu. 22'), 'séance supprimée'));
    // Navigation : 4 semaines plus tard
    await p.click('[aria-label="4 semaines plus tard"]'); await pause();
    pb.push(egal('Sem. du 16 nov.', (await semaines(p))[0][0], 'flèche : 4 semaines plus tard'));
    pb.push(egal([], erreurs, '4 semaines : erreurs JavaScript'));
    await ctx.close();

    // --- Année : toucher un jour, toucher une course, bandeau
    d = copie();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, d, {}, PARIS));
    await p.click('[data-jour="2026-10-22"]');
    pb.push(egal('#semaines=2026-10-19', await p.evaluate(() => location.hash), 'toucher le 22 octobre : 4 semaines depuis le lundi 19'));
    await p.goBack();
    pb.push(egal(true, await p.locator('.cal-bloc').count() > 0, 'bouton retour du navigateur : la vue Année'));
    await p.selectOption('.cal-vue', 'semaines');
    pb.push(egal('Sem. du 19 oct.', (await semaines(p))[0][0], 'bandeau : 4 semaines'));
    await p.selectOption('.cal-vue', 'annee');
    await p.locator('[data-course="' + GORGES + '"]').scrollIntoViewIfNeeded();
    await p.click('[data-course="' + GORGES + '"]');
    await p.waitForSelector('.mc-panneau #preparation');
    pb.push(egal([GORGES, true], await p.evaluate(() => [history.state && history.state.mrtCourse, document.querySelector('#preparation').open]), 'toucher une course : sa page en modale, à la rubrique Préparation'),
      egal(0, await p.locator('.pc-retour').count(), 'modale de la course : la croix seule, pas de lien de retour'));
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(true, await p.locator('.cal-bloc').count() > 0, 'fermer la modale : le Calendrier reste là'));
    await ctx.close();
    // Vue 4 semaines : le jour de course et le rendez-vous clé mènent à la page de la course
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines', 1200, copie(), {}, PARIS));
    pb.push(egal('course.html?id=' + id(2) + '#preparation', await p.getAttribute('.cal-rdv', 'href'), 'rendez-vous clé : lien vers la page de la course'));
    await p.click('.cal-jr-course');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(1), await p.evaluate(() => history.state && history.state.mrtCourse), 'jour de course : page de la course en modale'));
    await ctx.close();

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
    p.on('dialog', x => x.accept());
    pb.push(
      egal(true, await p.evaluate(() => { const e = document.querySelector('#preparation'); const r = e.getBoundingClientRect(); return e.open && r.top >= 0 && r.top < innerHeight; }), 'page de la course : rubrique ouverte et à l\'écran'),
      egal('Préparation', await p.evaluate(() => document.querySelector('#preparation summary').textContent.trim()), 'rubrique : titre'),
      egal('Plan de 16 semaines · début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027', await p.textContent('#preparation .cal-plan-dates'), 'rubrique : durée et dates'),
      egal(['Première semaine', 'Semaine 1 · Sem. du 16 nov.', B], await p.evaluate(() => [document.querySelector('.cal-prep-lib').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-titre').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-phase').textContent]), 'rubrique : première semaine mise en avant'),
      egal(attendu, await p.evaluate(() => [...document.querySelectorAll('.cal-toutes .cal-sem-phase')].map(e => e.textContent)), 'rubrique : phases des 16 semaines'),
      egal(['Base 3 sem.', 'Deload 1 sem.', 'Base 2 sem.', 'Développement 1 sem.', 'Deload 1 sem.', 'Développement 3 sem.', 'Deload 1 sem.', 'Développement 2 sem.', 'Affûtage 2 sem.'],
        await p.evaluate(() => [...document.querySelectorAll('#preparation > .pc-corps > .cal-lignes > .cal-frise .cal-seg')].map(e => e.textContent.replace(/\s+/g, ' ').replace(/(\D)(\d)/, '$1 $2').trim())), 'rubrique : frise'),
      egal(false, await p.evaluate(() => document.querySelector('.cal-toutes').open), 'rubrique : « Toutes les semaines » repliée'),
      egal([['dim. 13', 'Corrida de Noël'], ['dim. 7', 'Trail des Gorges']], await p.evaluate(() => [...document.querySelectorAll('.cal-toutes .cal-jr-course')].map(e => [e.closest('.cal-jr').querySelector('.cal-jr-nom').textContent, e.textContent])), 'rubrique : jours de course dans leurs semaines'));
    // Séance ajoutée depuis la rubrique : liée à la course
    await p.click('.cal-prep-lib + .cal-sem [data-ajout="2026-11-17"]');
    await p.fill('.cal-seance [name="libelle"]', 'Footing 40 min');
    await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal({ date: '2026-11-17', course: GORGES }, (({ date, course }) => ({ date, course }))(d.seances[d.seances.length - 1]), 'séance ajoutée depuis la rubrique : liée à la course'),
      egal(['Run Footing 40 min'], await p.evaluate(() => [...document.querySelectorAll('.cal-prep-lib + .cal-sem .cal-se')].map(e => e.textContent.trim().replace(/\s+/g, ' '))), 'séance affichée dans la semaine mise en avant'));
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
      egal(['Semaine en cours', 'Semaine 1 · Sem. du 19 oct.'], await p.evaluate(() => [document.querySelector('.cal-prep-lib').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-titre').textContent]), 'rubrique : la semaine en cours est mise en avant'),
      egal('Base · modifiée', await p.evaluate(() => document.querySelector('.cal-toutes .cal-sem[data-lundi="2026-12-07"] .cal-sem-phase').textContent), 'semaine modifiée repérée'));
    await p.click('#preparation [data-preparer]');
    await p.click('[data-act="recalculer"]');
    await p.click('[data-act="enregistrer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal([], d.plan_semaines, 'Recalculer : plus aucune semaine modifiée'),
      egal('Deload', await p.evaluate(() => document.querySelector('.cal-toutes .cal-sem[data-lundi="2026-12-07"] .cal-sem-phase').textContent), 'Recalculer : la semaine du 7 décembre est de nouveau en Deload'));
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
    pb.push(egal(['Semaine en cours', 'Semaine 9 · Sem. du 19 oct.', D, 4], await p.evaluate(() => [document.querySelector('.cal-prep-lib').textContent, document.querySelector('.cal-prep-lib + .cal-sem .cal-sem-titre').textContent,
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
    pb.push(egal(['Paramétrer le plan', true], await p.evaluate(() => { const b = document.querySelector('#preparation [data-preparer]'); return [b.textContent.trim(), b.classList.contains('is-principal')]; }), 'bouton « Paramétrer le plan » : bouton principal'));
    await p.click('#preparation [data-preparer]');
    await p.fill('.cal-prep [name="duree"]', '10'); await p.dispatchEvent('.cal-prep [name="duree"]', 'change');
    await p.click('[data-act="enregistrer"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile')); await pause();
    pb.push(egal(true, (await p.textContent('#preparation .cal-plan-dates')).startsWith('Plan de 10 semaines'), 'durée choisie pour un format sans durée'));
    await ctx.close();

    // « Sans objectif clair »
    d = copie();
    d.courses = d.courses.filter(c => c.id !== GORGES);
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines', 1200, d, {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-12-14T10:00:00+01:00') }));
    pb.push(egal([['Sem. du 14 déc.', 'Sans objectif clair', null], ['Sem. du 21 déc.', 'Sans objectif clair', null], ['Sem. du 28 déc.', 'Sans objectif clair', null], ['Sem. du 4 janv.', 'Sans objectif clair', null]],
      await semaines(p), 'semaines sans objectif clair'));
    await ctx.close();

    // Téléphone
    for (const [nom, page] of [['4 semaines', 'calendrier.html#semaines'], ['rubrique', 'course.html?id=' + GORGES + '#preparation']]) {
      ({ p, ctx } = await ouvrir(nav, page, 390, copie(), {}, PARIS));
      pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone ' + nom + ' : débordement horizontal'));
      if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-' + nom.replace(' ', '') + '-telephone.png'), fullPage: true });
      await ctx.close();
    }
    // Lecture seule
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie();
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.seances = partage.seances.map(x => Object.assign({}, x, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines', 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal(0, await p.locator('[data-ajout], [data-edit]').count(), 'lecture seule : ni « + » ni modification de séance'),
      egal(4, await p.locator('.cal-se input:disabled').count(), 'lecture seule : cases « faite » grisées'));
    await ctx.close();
    ({ p, ctx } = await ouvertePrep(partage, id(1), 1200, PARIS, { 'mrt-vue': autre }));
    pb.push(egal([1, 0, 0], [await p.locator('#preparation').count(), await p.locator('[data-preparer]').count(), await p.locator('#preparation [data-ajout], #preparation [data-edit]').count()], 'lecture seule : la rubrique s\'affiche, sans « Préparer » ni saisie'));
    await ctx.close();
    if (CAPTURES) {
      ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines', 1200, copie(), {}, PARIS));
      await p.screenshot({ path: path.join(__dirname, 'captures', 'calendrier-semaines.png'), fullPage: true });
      await ctx.close();
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
    for (const [page, sel] of [['index.html', '.ac-bloc'], ['calendrier.html', '.cal-cadre'], ['calendrier.html#semaines', '.cal-cadre'], ['palmares.html', '.pv2-card'], ['objectif.html', '.ob-carte']]) {
      const { p, ctx } = await ouvrir(nav, page, 1200, db, {}, PARIS);
      await p.waitForSelector(sel).catch(() => {});
      const r = await p.evaluate(s => {
        const e = document.querySelector(s);
        return { classe: document.documentElement.className.split(' ').filter(c => c.startsWith('t-')), fond: getComputedStyle(document.body).backgroundColor, cadre: e ? getComputedStyle(e).backgroundColor : null };
      }, sel);
      pb.push(egal({ classe: ['t-vert-rose'], fond: 'rgb(14, 29, 25)', cadre: 'rgb(24, 51, 46)' }, r, page + ' : thème Vert et rose'));
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

  // Spécification générale : la page s'affiche d'un seul coup, en-tête compris.
  async affichage(nav, db) {
    const pb = [];
    for (const [nom, w] of Object.entries(LARGEURS))
      for (const page of ['index.html', 'palmares.html', 'preferences.html', 'objectif.html', 'calendrier.html', 'course.html?id=00000000-0000-0000-0001-000000000020'])
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
    const pb = (await f(nav, db)).filter(Boolean);
    echecs += pb.length;
    console.log((pb.length ? 'ÉCHEC ' : 'OK    ') + nom + pb.map(x => '\n      - ' + x).join(''));
  }
  await nav.close();
  process.exit(echecs ? 1 : 0);
})();
