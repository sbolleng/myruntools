// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
        egal([['2026-10-20'], '20'], [r.auj, r.aujN], nom + ', aujourd\'hui repéré : case cerclée, numéro dans un rond'),
        egal([[['1', false, false], ['3', true, false], ['4', true, true], ['5', false, false]], ['oct. 26'], [true, true]], [r.jours10, r.moisCourant, r.fonds],
          nom + ', une seule colonne de numéros pour le bloc, sans initiales, samedi et dimanche plus foncés, filet sous le dimanche, mois en cours repéré ; jour passé : même fond'),
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'calendrier-annee-' + nom.replace('é', 'e') + '.png'), fullPage: true });
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'calendrier-mois2-' + nom.replace('é', 'e') + '.png'), fullPage: true });
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'calendrier-mois2-phases.png'), fullPage: true });
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'export-calendrier.png'), fullPage: true });
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
      if (CAPTURES) { await p.emulateMedia({ media: 'print' }); await p.evaluate(() => document.documentElement.classList.add('xp-imprime')); await p.screenshot({ path: path.join(DOSSIER, 'captures', 'export-mon-plan.png'), fullPage: true }); }
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
      await o.p.fill('.cal-seance .cal-curseur', '5');
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'calendrier-semaine-' + nom.replace('é', 'e') + '.png'), fullPage: true });
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
    if (await p.locator('.cal-feuille-retour').count()) { await p.fill('.cal-feuille-retour .cal-curseur', '4'); await p.click('.cal-feuille-retour .mc-pied .is-principal'); for (let i = 0; i < 20 && (await p.locator('.cal-feuille-retour form').count()); i++) await p.clock.runFor(100); if (await p.locator('.cal-feuille-retour').count()) { await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); } }
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
      await p.screenshot({ path: path.join(DOSSIER, 'captures', 'course-preparation.png'), fullPage: true });
      await ctx.close();
      const o = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
      await o.p.waitForSelector('[data-reglages]'); await reglage(o.p, '[data-preparer]');
      await o.p.screenshot({ path: path.join(DOSSIER, 'captures', 'calendrier-preparer.png') });
      await o.ctx.close();
    }
    return pb;
  },
};
