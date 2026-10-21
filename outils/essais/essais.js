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

// Base simulée : lecture filtrée par les « eq. » de l'adresse ; les écritures
// sont acceptées sans rien changer.
function simulerBase(ctx, db) {
  return ctx.route(PROJET + '/**', route => {
    const req = route.request(), u = new URL(req.url());
    if (u.pathname.startsWith('/rest/v1/rpc/')) return route.fulfill({ contentType: 'application/json', body: '[]' });
    if (req.method() !== 'GET') return route.fulfill({ contentType: 'application/json', body: '[]' });
    const table = u.pathname.split('/').pop();
    const filtres = [...u.searchParams].filter(([k]) => !['select', 'order'].includes(k));
    const lignes = (db[table] || []).filter(x => filtres.every(([k, v]) => String(x[k]) === v.replace(/^eq\./, '')));
    const une = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(une ? lignes[0] || null : lignes) });
  });
}

// Ouvre une page du site, connecté, à la largeur demandée.
async function ouvrir(navigateur, page, largeur, db) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
  await simulerBase(ctx, db);
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.clock.install({ time: AUJOURDHUI });
  await p.goto(RACINE + 'connexion.html');
  const t = Math.floor(AUJOURDHUI / 1000);
  // Palmarès sans regroupement, comme dans son jeu d'essai.
  await p.evaluate(() => localStorage.setItem('mrt-palmares-groupe', '0'));
  await p.evaluate(s => localStorage.setItem('sb-gifrpodrwesuhtgkxbuc-auth-token', s), JSON.stringify({
    access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai',
    user: { id: db.profils[0].id, email: 'essai@exemple.fr' } }));
  await p.goto(RACINE + page);
  await p.waitForSelector('.mrt-header');
  await p.clock.runFor(1500);
  return { p, ctx, erreurs };
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
          joursVsCourse: Math.round(box('.mrt-days').top - box('h1 em').top),
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
        egal(0, r.droite, nom + ', compteur aligné à droite'),
        tel ? egal(true, r.compteurSousIndicateurs, nom + ', compteur sous les indicateurs')
            : egal(0, r.joursVsCourse, nom + ', jours à la hauteur du nom de la course'),
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
