// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
    pb.push(egal({ cellules: ['À propos de la course', 'Parcours', 'Préparation', 'Logistique'], ouvertes: [], textes: ['Semi.', 'STRATÉGIE DE COURSE Partir prudemment.', 'POURQUOI CETTE COURSE Répétition.', 'Total 58 € Notes Train.'], sous: true, plan: 0 },
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
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'fiche-v2-telephone.png') });
    pb.push(egal([], erreurs, 'fiche, téléphone, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },
};
