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
// Pages : accueil, connexion, objectif, course, candidat, modale (téléphone), fiche (téléphone, édition), palmares, calendrier,
//         calendrier-semaines, filtres, preferences,
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
const PAGES = {
  accueil: { url: 'index.html' },
  connexion: { url: 'connexion.html', anonyme: true },
  objectif: { url: 'objectif.html' },
  course: { url: 'course.html?id=' + id(3) },
  candidat: { url: 'course.html?id=' + id(4) },
  fiche: { url: 'course.html?id=' + id(3), largeurs: { tel: [390, 844] }, action: async p => { await p.locator('[data-ob="modifier"]').click(); await p.waitForSelector('.fc-fiche'); } },
  modale: { url: 'objectif.html', largeurs: { tel: [390, 844] }, action: async p => { await p.locator('.ob-et:nth-child(3) .ob-nom a:not(.ob-ext)').click(); await p.waitForSelector('.mc-panneau .pc-titre'); } },
  palmares: { url: 'palmares.html' },
  calendrier: { url: 'calendrier.html' },
  'calendrier-semaines': { url: 'calendrier.html#semaines' },
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
      await ctx.route(PROJET + '/**', route => {
        const u = new URL(route.request().url());
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
        await p.evaluate(s => localStorage.setItem('sb-gifrpodrwesuhtgkxbuc-auth-token', s), JSON.stringify({
          access_token: 'essai', token_type: 'bearer', expires_in: 3600, expires_at: t + 3600, refresh_token: 'essai', user: { id: db.profils[0].id, email: 'essai@exemple.fr' } }));
        await p.goto('file://' + racine + cfg.url);
        await p.waitForSelector('.mrt-nav');
      }
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
