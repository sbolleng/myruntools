// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
    pb.push(egal(['Course à pied', 'Autres sports'], await p.locator('.cal-seance [name="nom"] optgroup').evaluateAll(l => l.map(g => g.label)), 'choix de séance : deux groupes, Course à pied puis Autres sports'));
    await p.click('.cal-quand [data-quand="avenir"]'); await p.fill('.cal-seance [name="date"]', '2026-10-14');
    pb.push(egal('À faire', (await etatAjout()).choix, 'ajout : un choix fait à la main n\'est plus changé par la date'));
    await p.click('.cal-quand [data-quand="passee"]');
    await p.selectOption('.cal-seance [name="nom"]', 'Vélo');
    await p.fill('.cal-seance [name="duree_reelle"]', '90'); await p.fill('.cal-seance [name="distance_reelle"]', '31,5'); await p.fill('.cal-seance [name="fc_moyenne"]', '130');
    pb.push(egal('Vitesse moyenne : 21 km/h', await p.textContent('.cal-allure'), 'vélo : vitesse moyenne du réalisé'));
    await p.click('.cal-seance button[type="submit"]');
    pb.push(egal('Note ton effort perçu pour marquer la séance faite.', await p.textContent('.cal-seance .cal-msg'), 'ajout d\'une séance faite : l\'effort est obligatoire'));
    await p.fill('.cal-seance .cal-curseur', '4'); await p.click('.cal-seance button[type="submit"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile'));
    const sv = d.seances[d.seances.length - 1];
    pb.push(egal({ type: 'velo', libelle: 'Vélo', faite: true, duree_min: 90, duree_reelle_min: 90, distance_km: 31.5, distance_reelle_km: 31.5, intensite: null, fc_moyenne: 130 },
      sv && { type: sv.type, libelle: sv.libelle, faite: sv.faite, duree_min: sv.duree_min, duree_reelle_min: sv.duree_reelle_min, distance_km: sv.distance_km, distance_reelle_km: sv.distance_reelle_km, intensite: sv.intensite, fc_moyenne: sv.fc_moyenne },
      'séance passée de vélo : le réalisé saisi une fois (faite, sans intensité prévue)'));
    // Natation faite : l'intensité se demande (elle compte pour la dépense) ; le crossfit fait : non.
    await p.click('[data-ajout="2026-10-22"]'); await p.waitForSelector('.cal-seance [data-quand]');
    await p.fill('.cal-seance [name="date"]', '2026-10-16');
    await p.selectOption('.cal-seance [name="nom"]', 'Natation');
    pb.push(egal([true, true], [await p.locator('.cal-seance .cal-intensite').isVisible(), await p.locator('.cal-seance .cal-retour').isVisible()], 'natation faite : l\'intensité reste demandée, avec le réalisé'));
    await p.selectOption('.cal-seance [name="nom"]', 'Crossfit');
    pb.push(egal(false, await p.locator('.cal-seance .cal-intensite').isVisible(), 'crossfit fait : pas d\'intensité'));
    await p.click('.cal-seance [data-act="annuler"]'); await p.click('.mrt-dialogue [data-r="oui"]');
    await p.waitForFunction(() => !document.querySelector('.cal-voile'));
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
    // Cocher « faite » dans la vue : la feuille « Effort et sensations » ; l'effort déjà noté, la croix laisse la séance faite ; puis effort et sensations enregistrés.
    await p.evaluate(() => { const c = document.querySelector('[data-fait="se-r"]'); if (c.checked) { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); } }); await pause();
    d.ecritures = [];
    await p.check('[data-fait="se-r"]'); await p.waitForSelector('.cal-feuille-retour');
    pb.push(egal(['Course à pied · ven. 23 oct.', '7 · Seuil, allure semi-marathon ou 10 km : effort soutenu et inconfortable ; quelques mots isolés. Charge : 420 UA.', 5, 1], [(await p.textContent('.cal-feuille-retour .fc-libelle')).replace(/\u00a0/g, ' '), await p.textContent('.cal-feuille-retour .cal-ressenti-lib'),
      await p.locator('.cal-feuille-retour .cal-visage-b').count(), await p.locator('.cal-feuille-retour .mc-pied .is-principal').count()], 'cocher « faite » : la feuille, l\'effort déjà noté repris, cinq visages, « Enregistrer » collé en bas'));
    pb.push(egal([0, 0, 5, 1], [await p.locator('.cal-feuille-retour .cal-plus-tard, .cal-feuille-retour .cal-sans-note').count(), await p.locator('.cal-feuille-retour [data-groupe="fatigue"]').count(),
      await p.locator('.cal-feuille-retour [name="duree_reelle"], .cal-feuille-retour [name="distance_reelle"], .cal-feuille-retour [name="denivele_reel"], .cal-feuille-retour [name="fc_moyenne"], .cal-feuille-retour [name="fc_max"]').count(), await p.evaluate(() => [...document.querySelectorAll('.cal-feuille-retour [data-groupe="douleur"] [aria-pressed="true"]')].map(b => b.textContent).join() === 'Légère' && !document.querySelector('.cal-feuille-retour .cal-douleur-ou').hidden ? 1 : 0)], 'feuille : ni « Plus tard », ni « Ne pas noter », ni fatigue ; le bloc « Réalisé » (durée, distance, D+, FC moyenne et max) comme dans la fenêtre de la séance ; douleur déjà notée reprise, avec « Où »'));
    await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); await pause();
    pb.push(egal([{ faite: true }], ecrit(), 'la croix, effort déjà noté : seule la case « faite » est rangée, la séance reste faite'));
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
    // Pas de séance faite sans effort noté : plus de « à noter » ; « Enregistrer » refusé sans effort ; la croix décoche la séance.
    {
      const dn = copie(x => { x.seances = [
        { id: 'se-n', utilisateur: x.profils[0].id, date: '2026-10-21', type: 'run', libelle: 'Footing', faite: true, ressenti: null, course: null, origine: 'saisie', etat: 'acceptee' },
        { id: 'se-p', utilisateur: x.profils[0].id, date: '2026-10-23', type: 'run', libelle: 'Côtes', faite: false, course: null, origine: 'saisie', etat: 'acceptee' }]; });
      const q = await ouvrir(nav, 'calendrier.html', 1200, dn, {}, PARIS);
      await q.p.waitForSelector('[data-drag="se-n"]');
      pb.push(egal(0, await q.p.locator('[data-noter], .cal-v-anoter').count(), 'plus de « à noter », même sur une séance faite sans effort noté'));
      await q.p.check('[data-fait="se-p"]'); await q.p.waitForSelector('.cal-feuille-retour');
      pb.push(egal([['Aujourd\'hui', 'Ven. 23 oct.'], 'Aujourd\'hui', true, 1, ['Effort perçu', 'Réalisé', 'Commentaire']],
        [await q.p.evaluate(() => [...document.querySelectorAll('[data-groupe="jour_fait"] [data-val]')].map(b => b.textContent.replace(/\u00a0/g, ' '))), await q.p.textContent('[data-groupe="jour_fait"] [aria-pressed="true"]'),
          await q.p.evaluate(() => document.querySelector('.cal-feuille-retour .cal-fc').hidden), await q.p.locator('.cal-feuille-retour [data-fc]').count(),
          await q.p.evaluate(() => [...document.querySelectorAll('.cal-feuille-retour .cal-bloc')].map(b => b.querySelector('.cal-titre-info, .cal-realise-titre, .cal-champ > span').textContent.trim()))],
        'feuille, séance à venir : « Faite » (Aujourd\'hui) (son jour), aujourd\'hui d\'office ; trois blocs (effort, réalisé, commentaire) ; FC repliée'));
      await q.p.click('.cal-feuille-retour [data-fc]');
      pb.push(egal([false, 0], [await q.p.evaluate(() => document.querySelector('.cal-feuille-retour .cal-fc').hidden), await q.p.locator('.cal-feuille-retour [data-fc]:visible').count()], '« + Fréquence cardiaque » déplie FC moyenne et FC max'));
      await q.p.click('.cal-feuille-retour .mc-pied .is-principal');
      pb.push(egal('Note ton effort perçu pour enregistrer la séance faite.', await q.p.textContent('.cal-feuille-retour .cal-msg'), 'feuille : « Enregistrer » refusé sans effort noté'));
      dn.ecritures = [];
      await q.p.click('.cal-feuille-retour [data-fermer]'); await q.p.waitForSelector('.cal-feuille-retour', { state: 'detached' });
      await q.p.waitForFunction(() => !document.querySelector('[data-fait="se-p"]').checked);
      pb.push(egal([{ faite: false }], dn.ecritures.filter(e => e.table === 'seances').map(e => e.corps), 'la croix sans effort noté : la séance est décochée'));
      await q.p.click('[data-edit="se-p"]'); await q.p.waitForSelector('.cal-seance');
      await q.p.check('.cal-seance [name="faite"]'); await q.p.click('.cal-seance button[type="submit"]');
      pb.push(egal('Note ton effort perçu pour marquer la séance faite.', await q.p.textContent('.cal-seance .cal-msg'), 'fenêtre : cocher « faite » sans effort noté, refusé'));
      await q.p.keyboard.press('Escape'); await q.p.waitForSelector('.cal-seance', { state: 'detached' });
      dn.ecritures = [];
      await q.p.check('[data-fait="se-p"]'); await q.p.waitForSelector('.cal-feuille-retour');
      await q.p.fill('.cal-feuille-retour .cal-curseur', '5'); await q.p.click('.cal-feuille-retour .mc-pied .is-principal');
      await q.p.waitForFunction(() => !document.querySelector('.cal-feuille-retour form'));
      const ep = (dn.ecritures.filter(e => e.table === 'seances' && 'ressenti' in (e.corps || {})).pop() || {}).corps || {};
      pb.push(egal(['2026-10-20', '2026-10-23', 5], [ep.date, ep.date_prevue, ep.ressenti], 'séance prise d\'avance : faite aujourd\'hui, son jour prévu gardé'));
      if (await q.p.locator('.cal-feuille-retour').count()) { await q.p.click('.cal-feuille-retour [data-fermer]'); await q.p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); }
      pb.push(egal([], q.erreurs, 'séance faite sans effort : erreurs JavaScript'));
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
};
