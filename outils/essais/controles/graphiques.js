// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
};
