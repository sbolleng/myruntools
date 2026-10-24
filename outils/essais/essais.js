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
// db.ecritures (liste, si elle existe) : les écritures reçues, pour les relire.
function simulerBase(ctx, db) {
  return ctx.route(PROJET + '/**', route => {
    const req = route.request(), u = new URL(req.url());
    if (u.pathname.startsWith('/rest/v1/rpc/')) {
      const r = (db.rpc || {})[u.pathname.split('/').pop()] || [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(r) });
    }
    if (req.method() !== 'GET') {
      if (db.ecritures) db.ecritures.push({ methode: req.method(), table: u.pathname.split('/').pop(), filtres: u.search, corps: req.postData() ? req.postDataJSON() : null });
      if (db.panne) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"panne"}' });
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
// opts : { fuseau, maintenant } pour un jeu d'essai daté à une heure précise.
async function ouvrir(navigateur, page, largeur, db, stockage = {}, opts = {}) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, deviceScaleFactor: 2, timezoneId: opts.fuseau });
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
        window.__revelee = { entete: !!document.querySelector('.mrt-header'), haut: m ? Math.round(m.getBoundingClientRect().top) : null, contenu: m ? m.textContent.trim().length : 0 };
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });
  const maintenant = opts.maintenant || AUJOURDHUI;
  await p.clock.install({ time: maintenant });
  await p.goto(RACINE + 'connexion.html');
  const t = Math.floor(maintenant / 1000);
  // Palmarès sans regroupement, comme dans son jeu d'essai.
  await p.evaluate(() => localStorage.setItem('mrt-palmares-groupe', '0'));
  await p.evaluate(st => Object.entries(st).forEach(([k, v]) => localStorage.setItem(k, v)), stockage);
  await p.evaluate(s => localStorage.setItem('sb-gifrpodrwesuhtgkxbuc-auth-token', s), JSON.stringify({
    access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai',
    user: { id: db.profils[0].id, email: 'essai@exemple.fr' } }));
  await p.goto(RACINE + page);
  await p.waitForSelector('.mrt-header');
  await p.clock.runFor(1500);
  return { p, ctx, erreurs };
}

// Aucun saut au chargement : à l'instant où la page devient visible, l'en-tête
// est déjà en place et le contenu de la page n'a plus à bouger.
async function sansSaut(nav, db, page, w, nom, opts) {
  const { p, ctx, erreurs } = await ouvrir(nav, page, w, db, {}, opts);
  const r = await p.evaluate(() => ({ revelee: window.__revelee, hautFinal: Math.round(document.querySelector('main').getBoundingClientRect().top),
    contenuFinal: document.querySelector('main').textContent.trim().length, masquee: document.documentElement.classList.contains('mrt-attente') }));
  await ctx.close();
  return [
    egal(false, r.masquee, nom + ', page encore masquée'),
    egal(true, !!r.revelee && r.revelee.entete, nom + ', en-tête présent à l\'affichage'),
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
      role: 'objectif_intermediaire', objectif: '06:30:00', inscrit: true, dossard: '1287', prix: 58, lien: web('gorges'), inscription: web('gorges/inscription'),
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

const egal = (attendu, obtenu, quoi) => (JSON.stringify(attendu) === JSON.stringify(obtenu) ? null : quoi + ' : attendu ' + JSON.stringify(attendu) + ', obtenu ' + JSON.stringify(obtenu));

const CONTROLES = {
  // Spécification générale, en-tête : contenu et disposition.
  async enTete(nav, db) {
    const pb = [];
    for (const [nom, w] of Object.entries(LARGEURS)) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', w, db);
      const r = await p.evaluate(() => {
        const q = s => document.querySelector(s), box = s => q(s).getBoundingClientRect();
        return {
          titre: q('h1 em').textContent,
          stats: [...document.querySelectorAll('.mrt-stat')].map(s => s.querySelector('.mrt-stat-val').textContent.replace(/ /g, ' ') + ' | ' + s.querySelector('.mrt-stat-label').textContent),
          prochaine: q('.mrt-next').textContent,
          compteurEnBas: Math.round(box('.mrt-count').bottom - box('.mrt-stats').bottom),
          gauche: Math.round(box('.mrt-count').left - box('.mrt-stats').left),
          marqueVsTitre: Math.round(box('.mrt-brand').top - box('h1').top),
          compteurSousIndicateurs: box('.mrt-count').top >= box('.mrt-stats').bottom,
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
        ...(tel ? [egal(true, r.compteurSousIndicateurs, nom + ', compteur sous les indicateurs'),
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
    const { p, ctx } = await ouvrir(nav, 'palmares.html', 1200, sansDplus);
    pb.push(egal('60 km', await p.evaluate(() => document.querySelector('.mrt-stat-val').textContent), 'sans D+, Distance'));
    await ctx.close();
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
      egal(true, /Montauban/.test(l[6]) && /51'46|0:51:46/.test(l[6]), 'Montauban 2025 en dernier'),
      egal(2, l.filter(x => x.includes('🥇')).length, 'records 🥇'),
      egal('7 courses sur 7', await p.evaluate(() => document.querySelector('.pv2-count').textContent), 'compteur'),
      egal([], erreurs, 'erreurs JavaScript')
    ];
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'palmares.png'), fullPage: true });
    await ctx.close();
    return pb;
  },
  // Préférences : thème, menu, cap, lecture seule (module-preferences-specification.md).
  async preferences(nav, db0) {
    // Jeu d'essai : Trail du Lac, Course A (option), Trail des Crêtes à venir ; Course B à surveiller ; les courues.
    const db = JSON.parse(JSON.stringify(db0));
    const renomme = { '21': ['Course A', 'option'], '23': ['Course B', 'a_surveiller'] };
    db.courses = db.courses.filter(c => c.etat !== 'a_venir' || /(20|21|23|40)$/.test(c.id));
    db.courses.forEach(c => { const r = renomme[c.id.slice(-2)]; if (r) [c.course, c.statut] = r; });
    const pb = [];
    let { p, ctx, erreurs } = await ouvrir(nav, 'preferences.html', 1200, db);
    const q = (sel, f) => p.evaluate(([s, fn]) => new Function('x', 'return ' + fn)(document.querySelector(s)), [sel, f]);
    const menu = () => p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(t => t.textContent));
    // Attend la réponse de la base (vraie attente : la date du jour est figée).
    const attendre = async () => {
      for (let i = 0; i < 80; i++) {
        await p.waitForTimeout(25);
        if (!(await p.evaluate(() => [...document.querySelectorAll('.pref-msg')].some(m => m.textContent === 'Enregistrement…')))) return;
      }
    };
    const recharger = async () => { await p.reload(); await p.waitForSelector('.mrt-header'); await p.clock.runFor(1500); };
    pb.push(egal(true, await q('.mrt-gear', 'x.getAttribute("href").endsWith("preferences.html")'), 'engrenage vers les Préférences'));
    pb.push(egal(false, (await menu()).some(t => /Préférences/.test(t)), 'Préférences hors du menu'));
    pb.push(egal(['Compte', 'Cap', 'Thème', 'Menu', 'Partage'], await p.evaluate(() => [...document.querySelectorAll('main h2')].map(h => h.textContent)), 'ordre des blocs'));
    pb.push(egal(['Bleu et orange', 'Vert et rose', 'Violet et turquoise'], await p.evaluate(() => [...document.querySelectorAll('.pref-theme')].map(l => l.textContent)), 'thèmes, sans mention'));

    // Thème
    pb.push(egal('bleu-orange', await q('input[name=theme]:checked', 'x.value'), 'thème coché à l\'ouverture'));
    await p.click('input[value="vert-rose"]'); await attendre();
    pb.push(egal(true, await q('html', 'x.classList.contains("t-vert-rose")'), 'vert et rose appliqué aussitôt'));
    pb.push(egal('Enregistré.', await q('#bloc-theme .pref-msg', 'x.textContent'), 'thème, message'));
    await recharger();
    pb.push(egal('vert-rose', await q('input[name=theme]:checked', 'x.value'), 'thème après rechargement'));
    await p.goto(RACINE + 'index.html'); await p.waitForSelector('.mrt-header'); await p.clock.runFor(1500);
    pb.push(egal(true, await q('html', 'x.classList.contains("t-vert-rose")'), 'accueil en vert et rose'));
    await p.goto(RACINE + 'preferences.html?t=violet-turquoise'); await p.waitForSelector('.mrt-header'); await p.clock.runFor(1500);
    pb.push(egal(true, await q('html', 'x.classList.contains("t-vert-rose")'), '?t=… sans effet'));

    // Menu
    const catalogue = ['Cette semaine', 'Objectif', 'Nutrition', 'Palmarès', 'Profil', 'Guide'];
    pb.push(egal(catalogue, await menu(), 'menu par défaut'));
    pb.push(egal(6, await p.locator('.pref-modules input:checked').count(), 'tous les modules cochés'));
    pb.push(egal(4, await p.locator('.pref-modules .bientot').count(), 'modules non construits grisés'));
    await p.click('[aria-label="Monter Palmarès"]'); await attendre();
    const monte = ['Cette semaine', 'Objectif', 'Palmarès', 'Nutrition', 'Profil', 'Guide'];
    pb.push(egal(monte, await menu(), 'Palmarès monté, menu aussitôt'));
    await recharger();
    pb.push(egal(monte, await menu(), 'ordre conservé après rechargement'));
    await p.locator('.pref-modules label', { hasText: 'Guide' }).locator('input').uncheck(); await attendre();
    pb.push(egal(false, (await menu()).includes('Guide'), 'Guide décoché, absent du menu'));
    await p.click('.pref-defaut'); await attendre();
    pb.push(egal(catalogue, await menu(), 'ordre par défaut rétabli'));
    for (const n of catalogue.slice(1)) { await p.locator('.pref-modules label', { hasText: n }).locator('input').uncheck(); await attendre(); }
    pb.push(egal(['Cette semaine'], await menu(), 'un seul module affiché'));
    pb.push(egal(true, await q('.pref-modules input:checked', 'x.disabled'), 'dernière case non décochable'));
    await p.click('.pref-defaut'); await attendre();

    // Cap
    const options = await p.evaluate(() => [...document.querySelectorAll('#bloc-cap option')].map(o => o.textContent));
    pb.push(egal('Par défaut : la plus lointaine (Trail des Crêtes)', options[0], 'cap, premier choix'));
    pb.push(egal(['Trail du Lac', 'Course A', 'Trail des Crêtes'], options.slice(1).map(o => o.split(' · ')[0]), 'cap, courses proposées'));
    await p.selectOption('#bloc-cap select', { label: options[1] }); await attendre();
    pb.push(egal('Trail du Lac', await q('h1 em', 'x.textContent'), 'cap Trail du Lac dans l\'en-tête'));
    await recharger();
    pb.push(egal(options[1], await q('#bloc-cap select', 'x.selectedOptions[0].textContent'), 'cap après rechargement'));
    db.courses.find(c => c.course === 'Trail du Lac').etat = 'abandonnee';
    await recharger();
    pb.push(egal('Trail des Crêtes', await q('h1 em', 'x.textContent'), 'cap abandonné : retour au défaut'));
    pb.push(egal('', await q('#bloc-cap select', 'x.value'), 'cap abandonné : liste sur « Par défaut »'));
    db.courses.find(c => c.course === 'Trail du Lac').etat = 'a_venir';
    await recharger();
    await p.selectOption('#bloc-cap select', ''); await attendre();
    pb.push(egal('Trail des Crêtes', await q('h1 em', 'x.textContent'), 'cap par défaut'));

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
    await p.waitForSelector('.pc-titre');
    pb.push(egal('course.html?id=' + id(1), p.url().split('/').pop(), 'toucher la carte ouvre la page'));
    await p.goBack(); await p.waitForSelector('.ob-carte');
    pb.push(egal('objectif.html', p.url().split('/').pop(), 'retour du navigateur : feuille de route'));
    await toucher(p, '.ob-cand .ob-info');
    await p.waitForSelector('.pc-titre');
    pb.push(egal('course.html?id=' + id(4), p.url().split('/').pop(), 'toucher un candidat ouvre sa page'));
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
          retour: t(q('.pc-retour')), sur: t(q('.pc-sur')), titre: q('.pc-titre') ? t(q('.pc-titre').firstChild) : null, info: t(q('.pc-info')), groupe: t(q('.pc-groupe')),
          stats: [...document.querySelectorAll('.pc-stat')].map(s => t(s.children[0]) + ' | ' + t(s.children[1])), dossard: t(q('.pc-stats .ob-ins')),
          compteur: [...document.querySelectorAll('.pc-rebours .ob-cpt-case')].map(t).join(' '),
          cellules: [...document.querySelectorAll('.pc-cellule h3')].map(t), cellDossard: t(q('.pc-cellule')),
          liens: [...document.querySelectorAll('.pc-liens a')].map(t), nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.className + ' | ' + t(a.querySelector('b'))),
          vide: t(q('.ob-vide')), titreDoc: document.title
        };
      });
      await o.ctx.close();
      return [r, o.erreurs];
    };
    let [r, err] = await pageCourse(id(3));
    pb.push(egal({ retour: '← Feuille de route', sur: 'Objectif intermédiaire · Étape 3 sur 6', titre: 'Trail des Gorges', info: 'Mont-Clair · Trail long · dimanche 7 mars 2027, 7 h 30',
      stats: ['45 km / 2 100 m D+ | Distance', '2 100 m | D−', '06:30:00 | Objectif'], dossard: 'Inscrit · n° 1287', compteur: '137j 22h 30min 00s' },
      { retour: r.retour, sur: r.sur, titre: r.titre, info: r.info, stats: r.stats, dossard: r.dossard, compteur: r.compteur }, 'page Trail des Gorges, haut'));
    pb.push(egal(['Dossard', 'Rôle dans la préparation', 'Stratégie ou enchaînement', 'Logistique', 'Description', 'Liens'], r.cellules, 'page Trail des Gorges, cellules'));
    pb.push(egal(true, /Prix : 58 €/.test(r.cellDossard), 'page Trail des Gorges, prix'));
    pb.push(egal(['Site officiel ↗', 'Inscription ↗', 'Résultats en direct ↗'], r.liens, 'page Trail des Gorges, liens'));
    pb.push(egal(['is-precedente | Corrida de Noël', 'is-suivante | Trail des Cimes'], r.nav, 'page Trail des Gorges, navigation'));
    pb.push(egal('Trail des Gorges · MyRunTools', r.titreDoc, 'page Trail des Gorges, titre de l\'onglet'));
    pb.push(egal([], err, 'page d\'une course, erreurs JavaScript'));
    [r] = await pageCourse(id(2));
    pb.push(egal({ cellules: ['Dossard', 'Liens'], dossard: 'Ouvre le 01/11/2026', liens: ['Site officiel ↗'], dmoins: false },
      { cellules: r.cellules, dossard: r.dossard, liens: r.liens, dmoins: r.stats.some(x => /D−/.test(x)) }, 'page Corrida de Noël'));
    [r] = await pageCourse(id(4));
    pb.push(egal({ sur: 'Préparatoire · Étape 4 sur 6', groupe: 'Printemps 2027 · autre candidat : Ultra du Plateau · Le 55' }, { sur: r.sur, groupe: r.groupe }, 'page Trail des Cimes'));
    [r] = await pageCourse(id(1));
    pb.push(egal(['is-suivante | Corrida de Noël'], r.nav, 'page Trail du Lac, pas de course précédente'));
    [r] = await pageCourse(id(7));
    pb.push(egal(['is-precedente | Trail de la Forêt'], r.nav, 'page Trail des Crêtes, pas de course suivante'));
    for (const n of ['inconnue', id(99)]) {
      [r] = await pageCourse(n);
      pb.push(egal(['Course introuvable.', '← Feuille de route'], [r.vide, r.retour], 'course introuvable (' + n + ')'));
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

  // Objectif : saisie et édition d'une course à venir (module-objectif-specification.md, § 3.7 et § 10).
  async saisie(nav, db0) {
    const { db, id } = jeuObjectif(db0);
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
    pb.push(egal(1, await p.locator('[data-ob="ajouter"]').count(), 'bouton « + » sur la feuille de route'));
    await p.click('[data-ob="ajouter"]');
    const blocs = await p.evaluate(() => [...document.querySelectorAll('.fc-bloc')].map(b => b.querySelector('.fc-bloc-titre').textContent.trim() + (b.querySelector('.fc-grille').hidden ? ' (replié)' : '')));
    pb.push(egal(['Course', 'Place dans le plan', 'Préparation (replié)', 'Dossard (replié)', 'Logistique (replié)', 'Liens (replié)'], blocs, 'six blocs, quatre repliés'));
    pb.push(egal(['Ajouter une course', 'confirmee', 'preparatoire', true], [await p.textContent('#fc-titre'), await lire(p, '#fc-statut'), await lire(p, '#fc-role'), await p.locator('[data-champ="groupe_options"]').isHidden()], 'ajout : titre, statut et rôle proposés, groupe caché'));
    pb.push(egal('ex. 07:30', await p.getAttribute('#fc-heure', 'placeholder'), 'exemple dans l\'heure'));
    // Enregistrer sans rien : champs obligatoires
    await p.click('.fc-plein');
    pb.push(egal({ date: 'Champ obligatoire.', course: 'Champ obligatoire.', type: 'Choisis un type.', format: 'Champ obligatoire.' }, await erreursChamps(p), 'obligatoires : date, course, type, format'));
    pb.push(egal(0, o.copie.ecritures.length, 'rien d\'écrit tant qu\'une erreur demeure'));
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
    // Saisie valide
    await deplier(p);
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
    await p.waitForSelector('.fc-voile', { state: 'detached' });
    const w = o.copie.ecritures[0];
    pb.push(egal(['POST', 'courses'], [w.methode, w.table], 'enregistrement : une insertion'));
    pb.push(egal({ etat: 'a_venir', date: '2027-06-12', date_approx: false, heure: '07:30', course: 'Trail des Lacs', parcours: 'La Grande Boucle', lieu: 'Mont-Clair', format: 'trail_court',
      description: 'Boucle autour du lac.', distance: 28.5, dplus: 1200, dmoins: null, statut: 'confirmee', role: 'preparatoire', groupe_options: null, objectif: 'Sub 6h', pourquoi: null, strategie: null,
      inscrit: true, dossard: '77', prix: 45.5, ouverture_inscriptions: null, inscription: null, logistique: null, lien: 'https://example.org/lacs', lien_resultats: null }, w.corps, 'enregistrement : champs écrits'));
    await ctx.close();

    // Option : groupe d'options, existant ou nouveau ; jour inconnu
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]');
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
    await p.waitForSelector('.fc-voile', { state: 'detached' });
    const w2 = o.copie.ecritures[0].corps;
    pb.push(egal(['2027-10-01', true, null, 'option', 'Automne 2027'], [w2.date, w2.date_approx, w2.heure, w2.statut, w2.groupe_options], 'mois seul, option, nouveau groupe'));
    await ctx.close();

    // À surveiller : date facultative
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]');
    await p.selectOption('#fc-statut', 'a_surveiller');
    await p.fill('#fc-course', 'Trail des Sommets bis');
    await p.selectOption('#fc-type', 'trail');
    await p.selectOption('#fc-format', { index: 1 });
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-voile', { state: 'detached' });
    pb.push(egal([null, 'a_surveiller'], [o.copie.ecritures[0].corps.date, o.copie.ecritures[0].corps.statut], 'à surveiller sans date'));
    await ctx.close();

    // Modifier : formulaire rempli, tous les blocs ouverts
    o = await neuve(1200, COURSE(3)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]');
    pb.push(egal('Modifier la course', await p.textContent('#fc-titre'), 'modifier : titre'));
    pb.push(egal([], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')].filter(g => g.hidden).map(g => g.previousElementSibling.textContent)), 'modifier : aucun bloc replié'));
    const rempli = await p.evaluate(() => Object.fromEntries(['date', 'heure', 'course', 'lieu', 'format', 'dplus', 'dmoins', 'role', 'objectif', 'dossard', 'prix', 'logistique', 'lien', 'inscription', 'lien_resultats'].map(k => [k, document.getElementById('fc-' + k).value])));
    pb.push(egal({ date: '2027-03-07', heure: '07:30', course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'trail_long', dplus: '2100', dmoins: '2100', role: 'objectif_intermediaire', objectif: '06:30:00',
      dossard: '1287', prix: '58', logistique: 'Navette depuis le stade à 6 h 30.', lien: 'https://example.org/gorges', inscription: 'https://example.org/gorges/inscription', lien_resultats: 'https://example.org/gorges/resultats' }, rempli, 'modifier : valeurs de la course'));
    pb.push(egal(true, await p.locator('#fc-inscrit').isChecked(), 'modifier : inscrit coché'));
    await p.fill('#fc-objectif', 'Sub 6h30');
    await p.fill('#fc-date', '2027-03-08');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-voile', { state: 'detached' });
    const m = o.copie.ecritures[0];
    pb.push(egal(['PATCH', '?id=eq.' + id(3), 'Sub 6h30', '2027-03-08'], [m.methode, m.filtres, m.corps.objectif, m.corps.date], 'modifier : mise à jour de la course'));
    pb.push(egal(true, !m.corps.etat, 'modifier : l\'état n\'est pas touché'));
    // Pas de bouton « Retenir » ni « Marquer » sur une confirmée à venir
    pb.push(egal(0, await p.locator('[data-ob="retenir"], [data-ob="marquer"]').count(), 'confirmée à venir : ni Retenir ni Marquer'));
    await ctx.close();

    // Supprimer
    o = await neuve(1200, COURSE(2)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]');
    await p.click('.fc-supprimer');
    pb.push(egal('Supprimer cette course ? Cette action est définitive.', await p.textContent('.fc-confirmer p'), 'suppression : confirmation'));
    await p.click('[data-fc="garder"]');
    pb.push(egal(0, o.copie.ecritures.length, 'suppression annulée : rien d\'écrit'));
    await p.click('.fc-supprimer');
    await p.click('[data-fc="confirmer"]');
    await p.waitForURL(/objectif\.html$/);
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
    pb.push(egal(['Marquer comme courue', ['Course', 'Résultat', 'Classements', 'Montre'], 0], [await p.textContent('#fc-titre'),
      await p.locator('.fc-bloc-titre').allTextContents().then(t => t.map(x => x.trim())), await p.locator('.fc-supprimer').count()], 'marquer : formulaire du Palmarès, sans Supprimer'));
    pb.push(egal(['2026-10-20', 'Trail du Lac'], [await lire(p, '#fc-date'), await lire(p, '#fc-course')], 'marquer : pré-rempli'));
    await p.fill('#fc-temps', '2:40:00');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-voile', { state: 'detached' });
    pb.push(egal(['PATCH', 'courue', 9600], [o.copie.ecritures[0].methode, o.copie.ecritures[0].corps.etat, o.copie.ecritures[0].corps.temps], 'marquer : la course passe à l\'état Courue'));
    await ctx.close();

    // Panne d'enregistrement
    const panne = JSON.parse(JSON.stringify(db)); panne.panne = true;
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, panne, {}, PARIS));
    await p.click('[data-ob="ajouter"]');
    await p.fill('#fc-course', 'X'); await p.fill('#fc-date', '2027-06-12'); await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', { index: 1 });
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-msg:has-text("Enregistrement impossible")');
    pb.push(egal(1, await p.locator('.fc-voile').count(), 'panne : le formulaire reste ouvert'));
    await ctx.close();

    // Palmarès : formulaire inchangé
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, db));
    await p.click('[data-act="add"]');
    pb.push(egal(['Course', 'Résultat', 'Classements', 'Montre'], (await p.locator('.fc-bloc-titre').allTextContents()).map(x => x.trim()), 'Palmarès : quatre blocs'));
    await ctx.close();

    // Téléphone
    ({ p, ctx } = await ouvrir(nav, PAGE, 390, db, {}, PARIS));
    await p.click('[data-ob="ajouter"]');
    await p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(b => b.click()));
    pb.push(egal(false, await p.evaluate(() => document.querySelector('.fc-panneau').scrollWidth > document.querySelector('.fc-panneau').clientWidth), 'téléphone : le formulaire ne déborde pas'));
    if (CAPTURES) await p.screenshot({ path: path.join(__dirname, 'captures', 'objectif-formulaire-telephone.png') });
    await ctx.close();

    // Ordinateur : capture
    if (CAPTURES) {
      ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
      await p.click('[data-ob="ajouter"]');
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
    pb.push(egal(0, await p.locator('[data-ob]').count(), 'lecture seule : ni Modifier ni Retenir'));
    await ctx.close();
    return pb;
  },

  // Spécification générale : la page s'affiche d'un seul coup, en-tête compris.
  async affichage(nav, db) {
    const pb = [];
    for (const [nom, w] of Object.entries(LARGEURS))
      for (const page of ['index.html', 'palmares.html', 'preferences.html', 'objectif.html', 'course.html?id=00000000-0000-0000-0001-000000000020'])
        pb.push(...await sansSaut(nav, db, page, w, page.replace(/\.html.*/, '') + ' ' + nom));
    return pb;
  }
};
(async () => {
  if (CAPTURES) fs.mkdirSync(path.join(__dirname, 'captures'), { recursive: true });
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees-fictives.json'), 'utf8'));
  const nav = await chromium.launch();
  let echecs = 0;
  for (const [nom, f] of Object.entries(CONTROLES)) {
    const pb = (await f(nav, db)).filter(Boolean);
    echecs += pb.length;
    console.log((pb.length ? 'ÉCHEC ' : 'OK    ') + nom + pb.map(x => '\n      - ' + x).join(''));
  }
  await nav.close();
  process.exit(echecs ? 1 : 0);
})();
