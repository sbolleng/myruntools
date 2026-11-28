// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'en-tete-' + nom + '.png'), clip: { x: 0, y: 0, width: w, height: await p.evaluate(() => document.querySelector('.mrt-nav').getBoundingClientRect().bottom + 10) } });
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
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'premiers-naissance.png') });
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
    await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForFunction(() => !document.querySelector('[data-faite="se-a"]').checked);
    pb.push(egal({ faite: false }, (jourJ.ecritures[jourJ.ecritures.length - 1] || {}).corps, 'Aujourd\'hui : la croix sans effort noté décoche la séance'));
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
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'preferences.png'), fullPage: true });
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
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'preferences-telephone.png'), fullPage: true });
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
    const pages = fs.readdirSync(path.resolve(DOSSIER, '../..')).filter(f => f.endsWith('.html') && !['mentions-legales.html', 'confidentialite.html'].includes(f));
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
    const sans = fs.readdirSync(path.resolve(DOSSIER, '../..')).filter(f => f.endsWith('.html'))
      .filter(f => !/<meta name="robots" content="noindex">/.test(fs.readFileSync(path.resolve(DOSSIER, '../..', f), 'utf8')));
    pb.push(egal([], sans, 'chaque page porte noindex'));
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
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'guide-' + w + '.png'), fullPage: true });
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
};
