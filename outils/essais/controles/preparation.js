// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Spécification générale, thèmes : chaque page prend le thème de l'utilisateur, cadres compris.
  // Connexion par adresse e-mail et mot de passe (specification-generale.md, § 3 ; module-preferences-specification.md, § 6).
  // Spécification Préparation, § 10 : plan de saison (saisons, phases hors saison, repères, alertes) et page Préparation.
  async preparationSaison(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const copie = f => { const d = JSON.parse(JSON.stringify(db)); if (f) f(d); return d; };
    const course = (d, n) => d.courses.find(c => c.id === id(n));
    // La vue d'ensemble (§ 5.1) : carte de l'Objectif, frise en cases semaine, bandeau, Cette semaine.
    const lire = p => p.evaluate(() => {
      const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const sem = [...document.querySelectorAll('.ps-sem')];
      const ph = l => { const e = sem.find(x => x.dataset.lundi === l); return e ? [...e.classList].find(c => c.startsWith('ph-')) : null; };
      return {
        titre: t('.ps-objectif .ps-titre'), sous: t('.ps-objectif .ps-sous'), j: t('.ps-objectif .ps-j'), court: t('.ps-court'),
        reglages: [...document.querySelectorAll('#ps-reglages-menu .mrt-menu-l')].map(b => b.textContent.trim()), menuBas: !!document.querySelector('.ps-semaine + .ps-reglages [data-reglages]'),
        semaines: sem.length ? [sem[0].dataset.lundi, sem[sem.length - 1].dataset.lundi] : [], courante: (document.querySelector('.ps-sem.is-courante') || {}).dataset ? document.querySelector('.ps-sem.is-courante').dataset.lundi : null,
        phases: ['2026-11-09', '2026-11-16', '2026-11-30', '2027-03-08', '2027-04-12', '2027-04-19', '2027-05-03', '2027-05-10', '2027-08-16', '2027-08-30'].map(ph),
        marques: [...document.querySelectorAll('.ps-sem-c')].map(e => e.closest('.ps-sem').dataset.lundi + ' ' + e.textContent + ' ' + [...e.classList].filter(c => c !== 'ps-sem-c').join(' ')),
        alertes: ['Alertes (' + document.querySelectorAll('.ps-alerte').length + ')', ...[...document.querySelectorAll('.ps-alerte')].map(e => e.dataset.alerte)],
        textesAlertes: [...document.querySelectorAll('.ps-alerte')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
        retires: document.querySelectorAll('.ps-courses, .ps-suggestion, .ps-historique, [data-frise], .mrt-plein, .ps-place, .ps-profil-etat, .ps-prop-repli, [data-ia="proposer"]').length,
        bloc: [...document.querySelectorAll('.ps-semaine .cal-s-ligne')].map(e => e.dataset.jourLigne),
        reperes: [...document.querySelectorAll('.ps-semaine .cal-v-rep')].map(e => e.closest('.cal-s-ligne').dataset.jourLigne + ' ' + e.textContent),
        repos: [...document.querySelectorAll('.ps-semaine .cal-repos')].map(e => e.closest('.cal-s-ligne').dataset.jourLigne),
        lien: (document.querySelector('.ps-semaine-tete a.ps-vers-cal') || { getAttribute: () => null }).getAttribute('href'),
        texteLien: t('.ps-semaine-tete a.ps-vers-cal'), guideBas: document.querySelectorAll('.mrt-guide').length,
        info: [...document.querySelectorAll('.ps-objectif .ps-droite > *, .ps-saison-droite > a')].map(e => (e.getAttribute('href') || e.textContent.trim()) + '|' + (e.getAttribute('aria-label') || '')),
        libelleObjectif: document.querySelectorAll('.ps-objectif .ob-role, .ps-saison .ob-lib').length,
        plus: document.querySelectorAll('.ps-semaine [data-ajout]').length,
        ordre: [...document.querySelectorAll('.ps-vue > *')].map(e => e.className.split(' ').find(c => c.startsWith('ps-'))),
        debordement: document.documentElement.scrollWidth > innerWidth
      };
    });
    const fleches = p => p.evaluate(() => [...document.querySelectorAll('.ps-fl')].map(b => !b.hidden));
    for (const [nom, w] of [['ordinateur', 1200], ['téléphone', 390]]) {
      const { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', w, copie(), {}, PARIS);
      await p.waitForSelector('.ps-objectif');
      const r = await lire(p);
      pb.push(
        egal(['Trail des Gorges', 'dim. 7 mars 2027 · 45 km · 2 100 m D+', '138 j', null, ['Changer d\'Objectif', 'Personnaliser', 'Exporter']], [r.titre, r.sous, r.j, r.court, r.reglages],
          nom + ', carte de l\'Objectif : nom, date complète, distance et D+, J-138 ; les trois réglages du plan'),
        egal(['2026-10-19', '2027-10-25', '2026-10-19'], [r.semaines[0], r.semaines[1], r.courante], nom + ', frise : tout le plan, de la semaine en cours à la fin de la dernière récupération ; la semaine en cours repérée'),
        egal(['ph-entretien', 'ph-base', 'ph-base', 'ph-recuperation', 'ph-recuperation', 'ph-entretien', 'ph-entretien', 'ph-base', 'ph-affutage', 'ph-recuperation'], r.phases,
          nom + ', phases : Entretien avant la saison, saison du Trail des Gorges dès le 16 novembre, Récupération jusqu\'au 17 avril, Entretien, saison du Trail des Crêtes dès le 10 mai, affûtage dès le 16 août'),
        egal(['2026-11-09 Trail du Lac r-preparatoire', '2026-12-07 Corrida de Noël r-plaisir', '2027-03-01 Trail des Gorges r-objectif', '2027-05-24 Trail des Cimes r-preparatoire is-option', '2027-06-21 Ultra du Plateau r-preparatoire is-option', '2027-06-28 Trail de la Forêt r-preparatoire is-option', '2027-08-23 Trail des Crêtes r-objectif'], r.marques,
          nom + ', courses dans leur semaine, repérées par leur rôle, options à part'),
        egal([['Alertes (0)'], 0, ['ps-objectif', 'ps-frise-z', 'ps-bandeau', 'ps-semaine']], [r.alertes, r.retires, r.ordre], nom + ', pas d\'alerte ; plus de frise « En cours », de courses du plan, d\'historique ni de « Proposer » ; l\'ordre de la page'),
        egal([false, true], await fleches(p), nom + ', flèches : seule « suivantes » au départ (la frise ne tient pas)'),
        egal(false, r.debordement, nom + ', débordement horizontal'),
        egal([], erreurs, nom + ', erreurs JavaScript'));
      await p.click('.ps-fl[data-fl="1"]'); await pause();
      pb.push(egal([true, true], await fleches(p), nom + ', flèche « suivantes » : la frise défile, « précédentes » apparaît'));
      pb.push(egal('calendrier.html#semaines=2026-11-16', await p.getAttribute('.ps-sem[data-lundi="2026-11-16"]', 'href'), nom + ', une semaine de la frise mène au Calendrier, sur elle'));
      if (CAPTURES) { await p.evaluate(() => { document.querySelector('.ps-frise-defile').scrollLeft = 0; }); await p.screenshot({ path: path.join(DOSSIER, 'captures', 'preparation-' + nom.replace('é', 'e') + '.png'), fullPage: true }); }
      await ctx.close();
    }
    // Cette semaine et ses repères.
    let { p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
    await p.waitForSelector('.ps-objectif');
    let r = await lire(p);
    pb.push(egal([7, '2026-10-19', '2026-10-25', 7, 'calendrier.html'], [r.bloc.length, r.bloc[0], r.bloc[6], r.plus, r.lien], 'cette semaine : une ligne par jour, du 19 au 25 octobre, un « + » par jour ; lien vers le Calendrier à côté du titre'),
        egal(['Calendrier', 0, 0, ['138 j|', 'guide.html#saison|Comment MyRunTools construit ton plan']], [r.texteLien, r.guideBas, r.libelleObjectif, r.info], 'carte : plus de libellé « Objectif » ni de titre des courses ; « 138 j » sur la ligne du nom, le rond « i » vers le Guide à droite de la ligne des courses ; plus de lien du Guide en bas ; « Calendrier › »'));
    pb.push(egal([], r.repos, 'jour sans séance : plus de « Repos », la ligne reste vide'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-09T10:00:00+01:00') }));
    await p.waitForSelector('.ps-objectif');
    pb.push(egal(['2026-11-12 Allégé', '2026-11-13 Allégé', '2026-11-14 Allégé'], (await lire(p)).reperes, 'repères dans les lignes : allégé du 12 au 14 novembre avant le Trail du Lac'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-30T10:00:00+01:00') }));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([true, false, '2026-11-30', '2026-11-16'], [r.reperes.includes('2026-12-04 Récupération'), r.reperes.includes('2026-12-05 Récupération'), r.courante, r.semaines[0]],
      'au 30 novembre : récupération du Trail du Lac jusqu\'au 4 décembre ; la frise part du début de la saison, la semaine en cours repérée'));
    await ctx.close();
    // Alertes, dans le bandeau de MyRunTools.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 5).statut = 'confirmee'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([['Alertes (1)', 'recup-affutage'], true, 1], [r.alertes, /^Ultra du Plateau : récupération jusqu'au .*17 août.*, sur l'affûtage de Trail des Crêtes$/.test(r.textesAlertes[0]), await p.locator('.ps-bandeau .ps-alerte').count()],
      'Ultra du Plateau confirmé : récupération dans l\'affûtage du Trail des Crêtes, l\'alerte dans le bandeau'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 7).date = '2027-05-02'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([['Alertes (1)', 'proches'], true, 'ph-developpement'], [r.alertes, r.textesAlertes[0] === 'Trail des Gorges et Trail des Crêtes : 8 semaines d\'écart (12 conseillées)', r.phases[3]],
      'données d\'avant le parcours, Trail des Crêtes au 2 mai : alerte Objectifs trop proches ; saison raccourcie, le 8 mars en développement'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 4).statut = 'confirmee'; course(d, 4).date = '2027-08-14'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([['Alertes (2)', 'recup-affutage', 'prepa-proche'], 'Trail des Cimes : à 14 jours de Trail des Crêtes (3 semaines conseillées)'], [r.alertes, r.textesAlertes[1]], 'Trail des Cimes au 14 août : Préparatoire trop proche et récupération dans l\'affûtage, en une ligne chacune'));
    await ctx.close();
    // Plan plus court que le minimum du format (trail long : 12 semaines) : dit dans la carte.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 3).prepa_semaines = 8; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif');
    pb.push(egal('Plan court : 8 semaines (12 au minimum)', (await lire(p)).court, 'plan de 8 semaines pour un trail long : « Plan court » dans la carte'));
    await ctx.close();
    // L'Objectif a un parcours : le titre se coupe sans erreur et l'IA propose (une erreur dans le dessin empêchait la proposition).
    let erreursP;
    ({ p, ctx, erreurs: erreursP } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { course(d, 3).parcours = 'Le grand'; }), {}, PARIS));
    await p.waitForSelector('.ps-objectif .ob-p');
    await p.waitForFunction(() => document.querySelector('.ps-bandeau'));
    pb.push(egal([[], true], [erreursP, (await p.textContent('.ps-titre')).includes('Le grand')], 'Objectif avec un parcours : aucune erreur JavaScript, le bandeau s\'affiche'));
    await ctx.close();
    // Sans Objectif : le parcours « Construire mon plan » (§ 5.0) à la place de la page.
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, copie(d => { d.courses.forEach(c => { if (c.role === 'objectif' || c.role === 'objectif_intermediaire') c.role = 'preparatoire'; }); }), {}, PARIS));
    await p.waitForSelector('.pp[data-ecran="plan"]');
    pb.push(egal([0, 'Ton plan'], [await p.locator('.ps-sem').count(), await p.textContent('.pp .fc-libelle')], 'sans Objectif : le parcours, pas de frise'));
    await ctx.close();
    // Calendrier : la récupération d'un Objectif en rose (semaine du 8 mars), l'Entretien sans fond.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#mois=2027-03', 1200, copie(), { 'mrt-calendrier-phases': '1' }, PARIS));
    await p.waitForSelector('.cal-m2');
    pb.push(egal(['ph-affutage', 'ph-recuperation', true], await p.evaluate(() => {
      const c = j => document.querySelector('.cal-m2-case[data-jour="' + j + '"]'), cl = j => [...c(j).closest('.cal-m2-ligne').classList].find(x => x.startsWith('ph-')) || null;
      return [cl('2027-03-02'), cl('2027-03-09'), getComputedStyle(c('2027-03-09')).backgroundColor !== getComputedStyle(c('2027-03-02')).backgroundColor];
    }), 'Calendrier, mars 2027 : affûtage puis Récupération du Trail des Gorges, d\'une autre couleur'));
    await ctx.close();
    // Lecture seule : la vue s'affiche, sans réglages ni « + ».
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = copie(d => {
      d.courses = d.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
      d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
      d.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    await p.waitForSelector('.ps-objectif');
    r = await lire(p);
    pb.push(egal([true, 0, ['Exporter']], [/Trail des Gorges/.test(r.titre || ''), r.plus, r.reglages], 'lecture seule : la vue s\'affiche, seul « Exporter » dans les réglages, pas de « + »'));
    await ctx.close();
    return pb;
  },

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

  // Spécification Préparation, § 6 (lot 3) : séances proposées par l'IA ; l'appel est remplacé par des réponses fixes, sans coût.
  // Construire mon plan (spécification Préparation, § 5.0) : le parcours, écran par écran ; le chevauchement de deux Objectifs ;
  // la préparatoire pertinente (règles fixes) ; les questions déjà répondues sautées.
  async preparationParcours(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const COMPLET = { utilisateur: moi, niveau: 'intermediaire', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 4, 6], nb_sorties: 3, jour_long: 6, allure_type: '10km', temps_10km_s: 2730 };
    const copie = f => {
      const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = []; d.reglages = { plafondIA: 4 }; d.appels = [];
      d.relais = corps => { d.appels.push(corps); return { status: 200, body: { id: 'prop-1', reponse: { recommandation: 'Entretien.', seances: [] } } }; };
      if (f) f(d);
      return d;
    };
    const sansObjectif = d => d.courses.forEach(c => { if (c.role === 'objectif' || c.role === 'objectif_intermediaire') c.role = 'preparatoire'; });
    const ecran = p => p.evaluate(() => { const e = document.querySelector('.pp'); return e ? e.dataset.ecran : null; });
    const vers = async (p, k) => { await p.waitForFunction(k => (document.querySelector('.pp') || {}).dataset && document.querySelector('.pp').dataset.ecran === k, k); };
    const choix = p => p.evaluate(() => [...document.querySelectorAll('.pp .ps-choix')].map(b => b.textContent.replace('✓', '').replace(/\s+/g, ' ').trim() + (b.disabled ? ' [inactif]' : '')));
    const msg = p => p.evaluate(() => document.querySelector('.pp .ps-msg').textContent);
    const prog = p => p.evaluate(() => Number(document.querySelector('.pp-prog').getAttribute('aria-valuenow')));
    // 1. Sans Objectif : la page est le parcours ; ni retour ni croix au premier écran.
    let d = copie(sansObjectif);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await vers(p, 'plan');
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-plan.png') });
    pb.push(egal([['Une course ou un trail', 'Me maintenir en formeBientôt [inactif]'], 0, 0, 0],
      [await choix(p), await p.locator('.pp [data-pp="retour"]').count(), await p.locator('.pp [data-pp="fermer"]').count(), await prog(p)], 'écran 1 : deux plans, « Me maintenir en forme » inactif ; ni retour ni croix'));
    pb.push(egal('Quel est ton objectif ?', (await p.textContent('.pp .pp-invite')).trim(), 'écran 1 : la phrase d\'invite sous le titre'));
    await p.click('[data-plan="course"]'); await vers(p, 'course');
    const confirmees = await choix(p);
    await p.click('[data-filtre="toutes"]'); await pause();
    const toutes = await choix(p);
    pb.push(egal([['Trail du Lacdim. 15 nov. 2026 · 24 km · 650 m D+', 'Corrida de Noëldim. 13 déc. 2026 · 10 km · 40 m D+', 'Trail des Gorgesdim. 7 mars 2027 · 45 km · 2 100 m D+', 'Trail des Crêtessam. 28 août 2027 · 60 km · 3 500 m D+'],
      ['Trail du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Trail des Cimes', 'Ultra du Plateau', 'Trail de la Forêtdate à préciser', 'Trail des Crêtes', 'Trail des Sommets'], 1],
      [confirmees, toutes.map(t => t.replace(/(dim|sam)\. .*?(?= \[|$)/, '').replace(/ · .*?(?= \[|$)/, '')), await p.locator('.pp [data-pp="ajouter"]').count()],
      'écran 2 : les confirmées à venir par défaut (date, distance, D+), « Toutes » ajoute options et Repérées ; mois seul : « date à préciser » ; « Ajouter une course » en tête'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-course.png') });
    await p.click('[data-filtre="confirmees"]'); await pause();
    await p.click('[data-course="' + id(3) + '"]'); await vers(p, 'niveau');
    pb.push(egal([['DébutantTu cours depuis peu, jusqu\'à 10 km.', 'IntermédiaireTu cours chaque semaine, jusqu\'au semi ou à un trail court.', 'ConfirméMarathon ou trails de plus de 40 km, entraînement suivi.', 'ExpertEntraînement structuré depuis des années, tu vises la performance.'], 1, 25],
      [await choix(p), await p.locator('.pp [data-pp="retour"]').count(), await prog(p)], 'écran 3 : quatre niveaux décrits ; retour présent ; progression'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-niveau.png') });
    await p.click('.pp [data-val="intermediaire"]'); await vers(p, 'blessures');
    await p.waitForSelector('.pp-form [name="fragiles"]');
    const champs4 = await p.evaluate(() => [...document.querySelectorAll('.pp-form .cal-champ > span')].map(e => e.textContent).concat([document.querySelector('[data-blesse][aria-pressed="true"]').textContent, document.querySelectorAll('.pp-form [name="blessure"], .pp-form [type="date"]').length]));
    await p.fill('.pp-form [name="fragiles"]', 'genou droit'); await p.click('.pp [data-blesse="oui"]'); await pause();
    await p.click('.pp [data-pp="continuer"]'); await pause();
    const m1 = await msg(p);
    const garde = await p.inputValue('.pp-form [name="fragiles"]');
    await p.fill('.pp-form [name="blessure"]', 'entorse de la cheville droite'); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'volume');
    pb.push(egal([['Points fragiles et blessures passées', 'Blessé en ce moment ?', 'Non', 0], 'Décris la blessure, ou réponds « Non ».', 'genou droit'], [champs4, m1, garde],
      'écran 4 : points fragiles, « Blessé en ce moment ? » Non d\'office, sans date ; Oui sans texte refusé, le texte tapé gardé'));
    await p.click('.pp [data-vol="volume_tranche|20-40"]'); await pause();
    const resteVolume = await ecran(p);
    const contGrise = await p.locator('.pp [data-pp="continuer"]').isDisabled();
    await p.click('.pp [data-vol="sortie_tranche|1h30-2h"]'); await pause();
    const contActif = !(await p.locator('.pp [data-pp="continuer"]').isDisabled());
    await p.click('.pp [data-pp="continuer"]'); await vers(p, 'allure');
    pb.push(egal([true, true], [contGrise, contActif], 'écran 5 : « Continuer » grisé tant qu\'une des deux n\'est pas choisie, actif ensuite ; aucun passage automatique'));
    const allure0 = await p.evaluate(() => [document.querySelector('.pp [data-allure][aria-pressed="true"]').textContent, document.querySelector('.pp-form [name="valeur"]').value, document.querySelector('.pp-form .pp-note').textContent]);
    pb.push(egal(['volume', ['Semi', '1:56:05', 'Palmarès · 4 oct. 2026']], [resteVolume, allure0], 'écran 5 : « Continuer » ; écran 6 : le semi du Palmarès prérempli'));
    await p.click('.pp [data-allure="marathon"]'); await pause();
    await p.fill('.pp-form [name="valeur"]', '1:40:00'); await p.click('.pp [data-pp="continuer"]'); await pause();
    const m2 = await msg(p);
    await p.fill('.pp-form [name="valeur"]', '3:45:00'); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'semaine');
    pb.push(egal('Le temps sur marathon s\'écrit 3:45:00 (entre 1:50:00 et 8:00:00).', m2, 'repère sur marathon : 1:40:00 refusé'));
    pb.push(egal([0, 'Course'], [await p.locator('.pp [name="nb_renfo"]').count(), await p.textContent('.pp .mrt-section-titre')], 'écran 7 : Ma semaine, section Course seulement'));
    await p.click('.pp [data-jc="2"]'); await p.click('.pp [data-jc="4"]'); await p.fill('.pp [name="nb_sorties"]', '3');
    await p.click('.pp [data-pp="continuer"]'); await pause();
    const m3 = await msg(p);
    await p.click('.pp [data-jc="7"]'); await p.click('.pp [data-long="7"]'); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'debut');
    pb.push(egal('Choisis au moins 3 jours.', m3, 'ma semaine : moins de jours que de séances refusé'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-semaine.png') });
    const debuts = await choix(p);
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-debut.png') });
    await p.click('.pp [data-debut="0"]'); await vers(p, 'recap');
    const recap = await p.evaluate(() => [document.querySelector('.pp .ps-titre').textContent, document.querySelector('.pp .ps-sous').textContent,
      [...document.querySelectorAll('.pp-recap .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent)]);
    pb.push(egal([['Plan de 16 semaines Recommandéeà partir du lun. 16 nov. 2026', 'Plan de 19 semainesà partir du lun. 26 oct. 2026', 'PersonnaliserRégler les phases semaine par semaine'],
      ['Trail des Gorges', 'dim. 7 mars 2027 · 16 semaines · 45 km', ['Niveau | Intermédiaire', 'Blessures | En ce moment : entorse de la cheville droite', 'Volume | 20 à 40 km · 1 h 30 à 2 h', 'Repère d\'allure | Marathon en 3:45:00', 'Ma semaine | mar., jeu., dim. · 3 séances, longue le dimanche', 'Début | lun. 16 nov. 2026 · 16 semaines']]],
      [debuts, recap], 'écran 8 : « Plan de 16 semaines » (recommandé), « Plan de 19 semaines » (dès lundi), personnaliser, la date seule dessous ; écran 9 : le récapitulatif'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-recap.png') });
    // Le récapitulatif ramène à une question, puis revient.
    await p.click('[data-recap="volume"]'); await vers(p, 'volume');
    const contVol = await p.locator('.pp [data-pp="continuer"]').count();
    await p.click('.pp [data-vol="volume_tranche|40-60"]'); await pause(); await p.click('.pp [data-pp="continuer"]'); await vers(p, 'recap');
    pb.push(egal([1, '40 à 60 km · 1 h 30 à 2 h', 'Mon volume actuel'], [contVol, await p.evaluate(() => document.querySelector('[data-recap="volume"] .ps-rep').textContent), 'Mon volume actuel'],
      'récapitulatif, volume : « Continuer » (deux questions), il range et ramène au récapitulatif'));
    await p.click('[data-recap="niveau"]'); await vers(p, 'niveau');
    await p.click('.pp [data-val="confirme"]'); await vers(p, 'recap');
    const niveau2 = await p.evaluate(() => document.querySelector('[data-recap="niveau"] .ps-rep').textContent);
    pb.push(egal('Confirmé', niveau2, 'récapitulatif : une ligne ramène à sa question, puis au récapitulatif'));
    d.ecritures = [];
    await p.click('.pp [data-pp="construire"]');
    await p.waitForSelector('.ps-objectif .ps-titre');
    await p.waitForFunction(() => document.querySelector('.ps-bandeau .ps-ia-msg, .ps-bandeau .ps-reco'));
    const maj = d.ecritures.filter(x => x.table === 'courses').map(x => x.filtres + ' ' + JSON.stringify(x.corps));
    const pr = d.profil_entrainement[0] || {};
    pb.push(egal([['?id=eq.' + id(3) + ' {"role":"objectif","statut":"confirmee","groupe_options":null,"prepa_semaines":null}'], 'Trail des Gorges', 1],
      [maj, (await p.textContent('.ps-objectif .ps-titre')).trim(), Math.min(d.appels.length, 1)], '« Construire mon plan » : Objectif confirmé, durée conseillée ; la page du plan ; l\'IA propose aussitôt le premier bloc'));
    pb.push(egal(['entorse de la cheville droite', '2026-10-20'], [pr.blessure, pr.blessure_debut], 'blessure en cours : datée du jour'));
    pb.push(egal({ niveau: 'confirme', fragiles: 'genou droit', volume_tranche: '40-60', sortie_tranche: '1h30-2h', allure_type: 'marathon', temps_marathon_s: 13500, jours_course: [2, 4, 7], nb_sorties: 3, jour_long: 7 },
      (({ niveau, fragiles, volume_tranche, sortie_tranche, allure_type, temps_marathon_s, jours_course, nb_sorties, jour_long }) => ({ niveau, fragiles, volume_tranche, sortie_tranche, allure_type, temps_marathon_s, jours_course, nb_sorties, jour_long }))(pr),
      'les réponses rangées dans Mon profil'));
    pb.push(egal([], erreurs, 'parcours, erreurs JavaScript'));
    await ctx.close();

    // 2. Deux Objectifs : le Trail des Crêtes avancé au 2 mai chevauche le Trail des Gorges (récupération jusqu'au 17 avril). Profil complet : sauté.
    d = copie(x => { x.courses.find(c => c.id === id(7)).date = '2027-05-02'; x.profil_entrainement = [Object.assign({}, COMPLET)]; });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 390, d, {}, PARIS));
    await p.waitForSelector('[data-reglages]'); await pause();
    await reglage(p, '[data-parcours]'); await vers(p, 'plan');
    pb.push(egal(1, await p.locator('.pp [data-pp="fermer"]').count(), '« + Objectif » : le parcours, avec la croix'));
    await p.click('[data-plan="course"]'); await vers(p, 'course');
    await p.click('[data-course="' + id(7) + '"]'); await vers(p, 'conflit');
    const conflit = await p.evaluate(() => [document.querySelector('.pp-alerte').textContent, document.querySelector('.pp .fc-libelle') ? 'libellé' : 'sans libellé',
      ...[...document.querySelectorAll('.pp-c-col')].map(c => [...c.querySelectorAll('.ob-role, .ob-date, .ob-nom, .ob-info, .ob-val, .mrt-btn.is-actif, .pp-note')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | '))]);
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'parcours-conflit-tel.png') });
    await p.click('[data-conflit="prendre"]'); await vers(p, 'debut');
    const sautes = await ecran(p);
    await p.click('.pp [data-pp="retour"]'); await vers(p, 'conflit');
    await p.click('[data-conflit="garder"]');
    await p.waitForFunction(() => !document.querySelector('.pp'));
    pb.push(egal([['Attention : deux Objectifs se chevauchent', 'sans libellé',
      'Objectif en cours | dim. 7 mars 2027 | Trail des Gorges | Mont-Clair · Trail long | 45 km · 2 100 m D+ | Garder l\'Objectif en cours | Trail des Crêtes devient Plaisir',
      'Nouvel Objectif | dim. 2 mai 2027 | Trail des Crêtes | Mont-Clair · Ultra-trail | 60 km · 3 500 m D+ | Remplacer l\'Objectif en cours | Trail des Gorges devient Plaisir'], 'debut', ['?id=eq.' + id(7) + ' {"role":"plaisir"}']],
      [conflit, sautes, d.ecritures.filter(x => x.table === 'courses').map(x => x.filtres + ' ' + JSON.stringify(x.corps))],
      'chevauchement : choisir ; l\'autre devient Plaisir (pas de règle de préparatoire avant un ultra) ; profil complet : du conflit au début ; « Garder » range le rôle et ramène au plan'));
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement'));
    pb.push(egal([], erreurs, 'chevauchement, erreurs JavaScript'));
    // 3. Préparatoire pertinente (règles fixes) : avant le Trail des Gorges (trail de 42 à 59 km : 21 à 30 km, 4 à 6 semaines).
    const role = (date, distance, format) => p.evaluate(([date, distance, format, idg]) => {
      const c = document.getElementById('saison').__ctx, w = c.courses.find(x => x.id === idg);
      return window.mrtParcours.rolePerdant(c, Object.assign({}, w, { id: 'essai', course: 'Essai', date, distance, dplus: 500, format, type: format.split('_')[0], role: 'objectif' }), w);
    }, [date, distance, format, id(3)]);
    pb.push(egal(['preparatoire', 'plaisir', 'plaisir', 'plaisir', 'plaisir'],
      [await role('2027-01-31', 25, 'trail_court'), await role('2026-12-20', 25, 'trail_court'), await role('2027-01-31', 35, 'trail_court'), await role('2027-01-31', 25, 'route_semi'), await role('2027-04-04', 25, 'trail_court')],
      'préparatoire pertinente : 25 km de trail 5 semaines avant ; sinon Plaisir (11 semaines, 35 km, route, après l\'Objectif)'));
    await ctx.close();
    // Le plan entier est déjà proposé après le premier bloc (blocs du 16 novembre au 8 février) : seule la mise à jour est à voir.
    const couvrirPlan = x => { ['2026-11-16', '2026-12-14', '2027-01-11', '2027-02-08'].forEach((b, i) => x.propositions.push({ id: 'plan-' + i, utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: b, essai: 1, statut: 'acceptee', motif: 'readaptation', reponse: { recommandation: 'Suite.', seances: [] } })); };
    // 4. Mon profil changé après la dernière proposition : le plan est mis à jour d'office à l'arrivée (rien avant) ; dans Mon profil, la ligne d'information.
    const relaisOk = d0 => { d0.appels = []; d0.relais = corps => { d0.appels.push(corps); const id = 'prop-' + d0.appels.length, r = { recommandation: 'Mise à jour.', seances: [] };
      d0.propositions.push({ id, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', motif: corps.motif, reponse: r }); return { status: 200, body: { id, reponse: r } }; }; return d0; };
    const avecProp = maj => relaisOk(copie(x => {
      x.profil_entrainement = [Object.assign({}, COMPLET, { maj })];
      x.propositions = [{ id: 'p1', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Entretien.', seances: [] } }];
      couvrirPlan(x);
    }));
    let dAvant = avecProp('2026-10-18T10:00:00Z');
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, dAvant, {}, PARIS));
    await p.waitForSelector('.ps-bandeau .ps-reco'); await pause();
    const avant = dAvant.appels.length;
    await ctx.close();
    d = avecProp('2026-10-19T12:00:00Z');
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    for (let k = 0; k < 60 && !d.appels.length; k++) await pause();
    await p.waitForSelector('.ps-bandeau .ps-reco');
    const miseAJour = [d.appels.length > 0, (d.appels[0] || {}).motif, (d.appels[0] || {}).bloc];
    await reglage(p, '[data-profil]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    const infoAvant = await p.locator('.ps-profil .ps-info').count();
    await p.click('.ps-profil [data-q="niveau"]'); await p.click('.ps-profil [data-val="expert"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal([0, [true, 'readaptation', '2026-10-19'], 0, 0],
      [avant, miseAJour, infoAvant, await p.locator('.ps-profil .ps-info').count()],
      'profil changé après la dernière proposition : aucun appel avant ; à l\'arrivée, le plan est mis à jour d\'office (réadaptation, de la semaine en cours) ; dans Mon profil, aucune ligne d\'information'));
    pb.push(egal([], erreurs, 'profil changé, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },
  // Ajouter une course préparatoire (Préparation, § 5.1, n° 16, 26 à 28) : courses de la saison, ajout et son avis, feuille d'une course.
  async preparationPrepa(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const copie = f => { const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = []; if (f) f(d); return d; };
    const hiver = x => x.courses.push(Object.assign({}, x.courses.find(k => k.id === id(1)), { id: id(40), course: 'Trail de l\'Hiver', parcours: null, date: '2027-01-31', statut: 'a_surveiller', inscrit: false, dossard: null, role: null }));
    const puces = p => p.evaluate(() => [...document.querySelectorAll('.ps-sc, .ps-sc-plus')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    const majCourses = d => d.ecritures.filter(x => x.table === 'courses').map(x => x.filtres + ' ' + JSON.stringify(x.corps));
    const planMaj = d => d.ecritures.some(x => x.table === 'preferences' && x.corps && x.corps.plan_maj);
    // Le plan entier est déjà proposé après le premier bloc : seule la mise à jour d'office est à voir ; le relais note les appels.
    const couvrirPlan = x => { ['2026-11-16', '2026-12-14', '2027-01-11', '2027-02-08'].forEach((b, i) => x.propositions.push({ id: 'plan-' + i, utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: b, essai: 1, statut: 'acceptee', motif: 'readaptation', reponse: { recommandation: 'Suite.', seances: [] } })); };
    const relaisOk = d0 => { d0.appels = []; d0.relais = corps => { d0.appels.push(corps); const id2 = 'prop-' + d0.appels.length, r = { recommandation: 'Mise à jour.', seances: [] };
      d0.propositions.push({ id: id2, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', motif: corps.motif, reponse: r }); return { status: 200, body: { id: id2, reponse: r } }; }; return d0; };
    // La carte : les courses de la saison ; le bandeau : la préparatoire conseillée.
    let d = copie(hiver);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await p.waitForSelector('.ps-saison');
    pb.push(egal([['Trail du Lac', 'Corrida de Noël', 'Préparatoire'], 1,
      'Préparatoire conseillée : un trail de 21 à 30 km, sur un terrain proche, du dim. 24 janv. 2027 au dim. 7 févr. 2027. Ajouter une course'],
      [await puces(p), await p.locator('.ps-saison [data-prepa]').count(), (await p.textContent('.ps-sg-ligne')).replace(/\s+/g, ' ').trim()],
      'carte : « Avant : » les Préparatoires et les Plaisirs avant l\'Objectif (sans lui), et « + Préparatoire » ; bandeau : la préparatoire conseillée'));
    // « Ajouter » : la fenêtre d'abord ; la course repérée, Conseillée, devient Préparatoire et Confirmée ; la saison a changé.
    await p.click('[data-prepa="fenetre"]'); await p.waitForSelector('.pp[data-ecran="prepa"]');
    await p.click('[data-filtre="toutes"]'); await pause();
    const liste = await p.evaluate(() => [...document.querySelectorAll('.pp [data-prepa-c]')].map(b => b.querySelector('b').textContent + ' ' + ((b.querySelector('.pp-avis') || {}).textContent || '')));
    await p.click('[data-prepa-c="' + id(40) + '"]');
    await p.waitForSelector('.ps-sc[data-sc="' + id(40) + '"]');
    pb.push(egal(['Trail de l\'Hiver Conseillée', ['?id=eq.' + id(40) + ' {"role":"preparatoire","statut":"confirmee"}'], true, true],
      [liste[0], majCourses(d), planMaj(d), (await puces(p)).includes('Trail de l\'Hiver')],
      'ajout : la course de la fenêtre en tête, Conseillée ; un toucher l\'ajoute en Préparatoire (Confirmée), la saison a changé'));
    pb.push(egal([], erreurs, 'ajout, erreurs JavaScript'));
    await ctx.close();
    // Déconseillée en Préparatoire : l'écran de l'avis ; « Ajouter en Plaisir ».
    d = copie(x => { Object.assign(x.courses.find(k => k.id === id(2)), { date: '2027-02-15', role: null }); });
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ps-saison [data-prepa]'); await p.click('.ps-saison [data-prepa]'); await p.waitForSelector('.pp[data-ecran="prepa"]');
    await p.click('[data-prepa-c="' + id(2) + '"]'); await p.waitForSelector('.pp[data-ecran="avis"]');
    const avis = await p.evaluate(() => [document.querySelector('.pp-alerte').textContent.trim(), [...document.querySelectorAll('.pp [data-avis]')].map(b => b.textContent + (b.classList.contains('is-principal') ? ' *' : ''))]);
    await p.click('[data-avis="plaisir"]'); await p.waitForSelector('.ps-saison');
    pb.push(egal([['Corrida de Noël : à 20 jours de Trail des Gorges (3 semaines conseillées)', ['Ajouter quand même en Préparatoire', 'Ajouter en Plaisir *']], ['?id=eq.' + id(2) + ' {"role":"plaisir","statut":"confirmee"}']],
      [avis, majCourses(d)], 'Déconseillée : la raison, « Ajouter en Plaisir » conseillé ; la course ajoutée en Plaisir'));
    await ctx.close();
    // La feuille d'une course : son rôle, son avis, « Passer en Plaisir », « Retirer du plan » (confirmé : rôle vide).
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ps-sc'); await p.click('[data-sc="' + id(1) + '"]'); await p.waitForSelector('.ps-feuille-c');
    const feuille = await p.evaluate(() => [document.querySelector('.ps-feuille-c .fc-libelle').textContent, document.querySelector('.ps-feuille-c .ps-fc-nom').textContent, !!document.querySelector('.ps-feuille-c .pr-avis'),
      [...document.querySelectorAll('.ps-fc-actions > *')].map(b => b.textContent.trim())]);
    const pourquoi = await p.evaluate(() => (document.querySelector('.ps-feuille-c .pr-avis-c') || {}).textContent || '');
    pb.push(egal([true, true, ['mrt-btn', 'mrt-btn', 'mrt-btn is-danger']], [pourquoi.length >= 40 && pourquoi.length <= 200, /semaines avant|Course plaisir|Trop proche|Plus longue|récupération/.test(pourquoi),
      await p.evaluate(() => [...document.querySelectorAll('.ps-fc-actions > *')].map(b => b.className))], 'feuille d\'une course : le pourquoi de l\'avis en 200 caractères au plus ; trois boutons de même forme, « Retirer du plan » en danger'));
    await surDialogue(p, () => true);
    await p.click('.ps-feuille-c [data-role="retirer"]');
    await p.waitForSelector('.ps-feuille-c', { state: 'detached' }); await pause();
    pb.push(egal([['Préparatoire', 'Trail du Lac', true, ['Passer en Plaisir', 'Voir la course', 'Retirer du plan']], ['?id=eq.' + id(1) + ' {"role":null}'], true, false],
      [feuille, majCourses(d), planMaj(d), (await puces(p)).includes('Trail du Lac')],
      'feuille : Préparatoire, son avis, ses actions ; « Retirer du plan » : rôle vide, la saison a changé, la course quitte la carte'));
    pb.push(egal([], erreurs, 'feuille d\'une course, erreurs JavaScript'));
    await ctx.close();
    // La saison a changé après la dernière proposition : le plan est mis à jour d'office à l'arrivée.
    d = relaisOk(copie(x => {
      x.profil_entrainement = [{ utilisateur: moi, niveau: 'intermediaire', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 4, 6], nb_sorties: 3, jour_long: 6, allure_type: '10km', temps_10km_s: 2730, maj: '2026-10-18T10:00:00Z' }];
      x.propositions = [{ id: 'p1', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Entretien.', seances: [] } }];
      x.preferences[0].plan_maj = '2026-10-19T12:00:00Z';
      couvrirPlan(x);
    }));
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    for (let k = 0; k < 60 && !d.appels.length; k++) await pause();
    await p.waitForSelector('.ps-bandeau .ps-reco');
    pb.push(egal([true, 'readaptation', 0], [d.appels.length > 0, (d.appels[0] || {}).motif, await p.locator('.ps-profil-change, [data-ia="refaire"]').count()], 'saison changée après la dernière proposition : le plan est mis à jour d\'office, sans « Refaire » ni ligne d\'avertissement'));
    await ctx.close();
    // Fiche d'une course : le rôle en lecture seule (« réglé dans Mon plan ») ; une course sans rôle : « Hors plan ».
    d = copie(x => { x.courses.find(k => k.id === id(2)).role = null; });
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, d, {}, PARIS));
    await p.waitForSelector('.ob-carte');
    const roles = await p.evaluate(() => [...document.querySelectorAll('.ob-carte .ob-role')].slice(0, 3).map(e => e.textContent));
    await ctx.close();
    pb.push(egal(['Confirmée · Préparatoire', 'Confirmée', 'Confirmée · Objectif'], roles, 'page Saison : le statut, puis le rôle de Mon plan s\'il y en a un (Préparation, § 5.1)'));
    return pb;
  },
  async preparationIA(nav, db0) {
    const pb = [];
    const { db } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    const PROFIL = { utilisateur: moi, niveau: 'intermediaire', volume_tranche: '20-40', sortie_tranche: '1h30-2h', jours_course: [2, 6], jours_renfo: [4], nb_sorties: 2, nb_renfo: 1, jour_long: 6, allure_type: '10km', temps_10km_s: 2730 };
    // Bloc du 19 octobre au 15 novembre : séances les mardis, jeudis et samedis (jours du profil).
    const LUNDIS = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'];
    const bonne = () => ({ recommandation: 'Entretien : deux footings et une sortie longue par semaine.', seances: LUNDIS.flatMap(l => [1, 3, 5].map(k => {
      const d = new Date(l + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); const j = d.toISOString().slice(0, 10);
      return { date: j, type: k === 3 ? 'renfo' : 'run', libelle: k === 5 ? 'Sortie longue' : k === 3 ? 'Renforcement : Gainage' : 'Endurance', duree_min: k === 5 ? 90 : 45, distance_km: k === 3 ? 0 : k === 5 ? 15 : 8, intensite: 'facile' };
    })) });
    // Le plan entier est déjà proposé (les 4 blocs après le premier) : seul le premier bloc reste à voir.
    const couvrir = x => { ['2026-11-16', '2026-12-14', '2027-01-11', '2027-02-08'].forEach((b, i) => x.propositions.push({ id: 'plan-' + i, utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: b, essai: 1, statut: 'acceptee', motif: 'readaptation', reponse: { recommandation: 'Suite.', seances: [] } })); return x; };
    const aPart = d => d.propositions.filter(x => !String(x.id).startsWith('plan-'));
    const mauvaise = () => { const r = bonne(); r.seances.push({ date: '2026-10-21', type: 'run', libelle: 'Fractionné', duree_min: 50, distance_km: 9, intensite: 'intense' }); return r; };
    // Base simulée : le relais range chaque appel dans « propositions », comme la fonction, et rend la réponse choisie.
    const copie = (reponses, f) => {
      const d = JSON.parse(JSON.stringify(db)); d.ecritures = []; d.seances = []; d.propositions = []; d.profil_entrainement = [Object.assign({}, PROFIL)];
      d.reglages = { plafondIA: 4 }; // le plafond se vérifie avec sa valeur d'ouverture ; le site est aujourd'hui sans limite (essais)
      d.appels = []; d.analyses = [];
      d.relais = corps => {
        // Analyse d'une séance faite : rangée à part, hors des appels de proposition.
        if (corps.mode === 'analyse') { d.analyses.push(corps); if (d.analyseReponse) return d.analyseReponse; return { status: 200, body: { analyse: 'Séance bien menée.', adapter: true } }; }
        d.appels.push(corps);
        let r = reponses[Math.min(d.appels.length - 1, reponses.length - 1)];
        if (r.status) return r;
        // Un autre bloc que le premier (2026-10-19) : les séances de la réponse sont décalées d'autant de jours.
        const decal = Math.round((Date.parse(corps.bloc) - Date.parse('2026-10-19')) / 864e5);
        if (decal && Array.isArray(r.seances)) {
          // Comme la vraie fonction : rien un jour de course, la veille d'une Plaisir ni un jour sans possibilité (le contexte les désigne).
          const interdits = new Set(((corps.contexte && corps.contexte.semaines) || []).flatMap(w => w.jours).filter(j => j.course || (j.reperes || []).some(x => /repos/.test(x))).map(j => j.date));
          // Semaines d'affûtage : durées réduites (le garde-fou veut 40 à 59 % des 3 semaines d'avant).
          const affutage = new Set(((corps.contexte && corps.contexte.semaines) || []).filter(w => w.phase === 'Affûtage').flatMap(w => w.jours.map(j => j.date)));
          r = Object.assign({}, r, { seances: r.seances.map(x => { const date = new Date(Date.parse(x.date) + decal * 864e5).toISOString().slice(0, 10); return Object.assign({}, x, { date }, affutage.has(date) ? { duree_min: Math.max(1, Math.round(x.duree_min * 0.45)) } : {}); }).filter(x => !interdits.has(x.date)) });
        }
        const id = 'prop-' + d.appels.length;
        d.propositions.push({ id, utilisateur: moi, cree: '2026-10-20T10:00:00Z', bloc: corps.bloc, essai: corps.essai, statut: 'brute', motif: corps.motif || 'proposer', reponse: r });
        return { status: 200, body: { id, reponse: r } };
      };
      if (f) f(d);
      return d;
    };
    const lire = p => p.evaluate(() => ({
      reste: (document.querySelector('.ps-ia-reste') || {}).textContent || null, msg: (document.querySelector('.ps-ia-msg') || {}).textContent || null,
      aide: (document.querySelector('.ps-ia-aide') || {}).textContent || null, reco: ((document.querySelector('.ps-reco') || {}).textContent || '').replace(/\s+/g, ' ').trim() || null,
      refaire: document.querySelectorAll('[data-ia="refaire"]').length, desactive: !!(document.querySelector('[data-ia="refaire"]') || {}).disabled,
      anciens: document.querySelectorAll('[data-ia="proposer"], [data-ia="tout"], [data-ia="choisir"], [data-ia="abandonner"], .ps-prop-repli, .cal-v-prop').length,
      semaine: [...document.querySelectorAll('.ps-semaine .cal-s-ligne[data-jour-ligne="2026-10-20"] .cal-v-lib, .ps-semaine .cal-s-ligne[data-jour-ligne="2026-10-20"] .cal-v-nom')].map(e => e.textContent.trim()).join(' ')
    }));
    // La page a fini : la recommandation et « Refaire », un message, ou le lien vers le profil.
    const fini = p => p.waitForFunction(() => document.querySelector('.ps-ia-msg, .ps-ia-aide, .ps-reco b'));

    // Profil complet, aucune proposition : l'IA propose d'office, les séances s'écrivent (§ 6) ; rien à accepter.
    let d = copie([Object.assign(bonne(), { recommandation: 'Entretien : deux footings et une sortie longue par semaine. Garde une allure facile. Hydrate-toi bien.' })]);
    let { p, ctx, erreurs } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS);
    await fini(p);
    let r = await lire(p);
    const envoi = d.appels[0];
    pb.push(egal([5, 59, 'ia', 'acceptee', 'acceptee', null, null, 0],
      [d.appels.length, d.seances.length, d.seances[0].origine, d.seances[0].etat, d.propositions[0].statut, d.seances.find(x => x.type === 'renfo').distance_km, r.reste, r.anciens],
      'à l\'arrivée : l\'IA propose d\'office tout le plan, bloc après bloc (5 blocs jusqu\'à l\'Objectif), 59 séances écrites (origine IA), propositions acceptées ; plus rien à accepter'));
    pb.push(egal('MyRunTools : Entretien : deux footings et une sortie longue par semaine. Garde une allure facile.', r.reco, 'bandeau : la recommandation en deux phrases au plus, sans « Refaire » ni compteur'));
    pb.push(egal([1, '2026-10-19', '2026-11-15', 'Entretien', false, false, [['mardi', 'samedi'], ['jeudi']], ['allégé (avant une course Préparatoire)']],
      [envoi.essai, envoi.contexte.bloc.debut, envoi.contexte.bloc.fin, envoi.contexte.semaines[0].phase, /Trail du Lac|Trail des Gorges|Corrida/.test(JSON.stringify(envoi)), JSON.stringify(envoi).includes(db.profils[0].prenom || '§§'),
        [envoi.contexte.profil.jours_possibles_course, envoi.contexte.profil.jours_possibles_renforcement], envoi.contexte.semaines[3].jours[3].reperes],
      'contexte envoyé : le bloc, ses phases et repères, le profil ; ni nom de course ni prénom'));
    await p.reload(); await fini(p);
    pb.push(egal(5, d.appels.length, 'retour sur la page : le plan est couvert, pas de nouvel appel'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Mise à jour d'office (la saison a changé) : remplace les séances de l'IA non faites, sans toucher aux séances saisies ni aux faites.
    d = copie([bonne()], x => {
      x.propositions.push({ id: 'p0', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } });
      couvrir(x);
      x.preferences[0].plan_maj = '2026-10-19T12:00:00Z';
      x.seances.push(
        { id: 'ia-a', utilisateur: moi, date: '2026-10-21', type: 'run', libelle: 'Ancien footing', duree_min: 30, origine: 'ia', etat: 'acceptee', faite: false },
        { id: 'ia-b', utilisateur: moi, date: '2026-10-22', type: 'run', libelle: 'Footing fait', duree_min: 30, origine: 'ia', etat: 'acceptee', faite: true },
        { id: 'main-c', utilisateur: moi, date: '2026-10-23', type: 'run', libelle: 'Ma séance', duree_min: 30, origine: 'saisie', etat: 'acceptee', faite: false });
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    for (let k = 0; k < 60 && d.appels.length < 5; k++) await pause();
    await p.waitForFunction(() => document.querySelector('.ps-reco b') && /deux footings/.test(document.querySelector('.ps-reco').textContent));
    pb.push(egal([5, 'readaptation', ['ia-b', 'main-c'], 0, 0], [d.appels.length, d.appels[0].motif, d.seances.filter(x => !String(x.id).startsWith('nouveau')).map(x => x.id), d.seances.filter(x => x.libelle === 'Ancien footing').length, await p.locator('[data-ia="refaire"]').count()],
      'saison changée : le plan est refait d\'office (5 blocs, hors plafond) ; la séance de l\'IA non faite est remplacée ; la saisie et la faite restent ; plus de « Refaire »'));
    await ctx.close();

    // Garde-fou : un jour non disponible ; la demande est refaite une fois, avec la correction, puis écrite.
    d = copie([mauvaise(), bonne()], couvrir);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    pb.push(egal([2, 2, true, 'invalide', 'acceptee', 12], [d.appels.length, d.appels[1].essai, (d.appels[1].corrections || []).some(x => /mer\. 21 oct.* : jour non prévu pour courir/.test(x)), aPart(d)[0].statut, aPart(d)[1].statut, d.seances.length],
      'garde-fou : jour non prévu pour courir, proposition refaite (essai 2, avec la correction) ; la première marquée invalide, la seconde écrite'));
    await ctx.close();

    // Deux réponses fautives de suite : message, plafond inchangé, rien d'écrit, pas de nouvel essai dans la visite.
    d = copie([mauvaise()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p); await pause();
    r = await lire(p);
    pb.push(egal(['Proposition impossible à vérifier, réessaie plus tard.', ['echec', 'echec'], null, 0, 2], [r.msg, d.propositions.map(x => x.statut), r.reste, d.seances.length, d.appels.length],
      'deux échecs : message, les deux appels en échec, rien de décompté ni d\'écrit, pas de nouvel essai'));
    await ctx.close();

    // Une proposition restée en attente (d'avant) pour la semaine : écrite à l'arrivée, sans appel.
    d = copie([bonne()], x => { x.propositions.push({ id: 'p-att', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'brute', motif: 'proposer', reponse: bonne() }); couvrir(x); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await p.waitForFunction(() => document.querySelector('.ps-reco b') && /Entretien/.test(document.querySelector('.ps-reco').textContent));
    for (let k = 0; k < 40 && d.propositions[0].statut !== 'acceptee'; k++) await pause(); // l'écriture du statut suit celle des séances
    pb.push(egal([0, 12, 'acceptee'], [d.appels.length, d.seances.length, d.propositions[0].statut], 'proposition en attente d\'avant : écrite à l\'arrivée, sans appel'));
    await ctx.close();

    // Page quittée en route : la proposition du bloc du 16 novembre est restée en attente ; à l'arrivée elle est écrite sans appel (les autres blocs sont couverts).
    d = copie([bonne()], x => {
      x.propositions.push({ id: 'p0', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } });
      couvrir(x);
      const nov = x.propositions.find(y => y.id === 'plan-0'); nov.id = 'att-nov'; nov.statut = 'brute';
      nov.reponse = { recommandation: 'Suite.', seances: bonne().seances.map(z => Object.assign({}, z, { date: new Date(Date.parse(z.date) + 28 * 864e5).toISOString().slice(0, 10) })) };
    });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    for (let k = 0; k < 40 && d.propositions.find(y => y.id === 'att-nov').statut !== 'acceptee'; k++) await pause();
    pb.push(egal([0, 'acceptee', 12], [d.appels.length, d.propositions.find(y => y.id === 'att-nov').statut, d.seances.length], 'bloc resté en attente (page quittée en route) : écrit à l\'arrivée, sans appel'));
    await ctx.close();

    // Revue : la proposition qui couvre la semaine date de plus de 4 semaines (15 septembre) : les 4 prochaines semaines sont refaites (hors plafond), à l'arrivée.
    d = copie([bonne()], x => { x.propositions.push({ id: 'p-vieille', utilisateur: moi, cree: '2026-09-15T10:00:00Z', bloc: '2026-09-28', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } }); couvrir(x); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    for (let k = 0; k < 40 && !d.appels.length; k++) await pause();
    await p.waitForFunction(() => document.querySelector('.ps-reco b'));
    pb.push(egal([1, 'readaptation', '2026-10-19'], [d.appels.length, d.appels[0] && d.appels[0].motif, d.appels[0] && d.appels[0].bloc], 'revue : une proposition de plus de 4 semaines est revue à l\'arrivée (un appel, hors plafond, bloc de la semaine en cours)'));
    await ctx.close();

    // Plafond atteint : rien d'office, « Refaire » grisé ; refus de la fonction (plafond, réservé aux pilotes) : son message.
    d = copie([bonne()], x => { for (let i = 0; i < 4; i++) x.propositions.push({ id: 'vieille-' + i, utilisateur: moi, cree: '2026-10-0' + (i + 1) + 'T10:00:00Z', bloc: '2026-09-28', essai: 1, statut: 'acceptee', reponse: null }); });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await pause(); await pause(); await pause();
    r = await lire(p);
    pb.push(egal([0, 0], [d.appels.length, r.refaire], 'plafond atteint (4 ce mois-ci) : rien d\'office, « Refaire » grisé'));
    await ctx.close();
    for (const [rep, attendu, nom] of [[{ status: 429, body: { code: 'plafond', prochaine: '2026-11-01' } }, /^Plus de proposition ce mois-ci\s:\sla prochaine le .*1er\snov\.\s2026\.$/, 'plafond de la fonction'],
      [{ status: 403, body: { code: 'reserve' } }, /^Réservé aux comptes pilotes pour l'instant\.$/, 'compte non pilote']]) {
      d = copie([rep]);
      ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
      await p.waitForSelector('.ps-ia-msg');
      r = await lire(p);
      pb.push(egal(true, attendu.test(r.msg || ''), nom + ' : « ' + r.msg + ' »'));
      await ctx.close();
    }

    // Profil incomplet : rien d'office, le lien vers le profil.
    d = copie([bonne()], x => { x.profil_entrainement = [Object.assign({}, PROFIL, { jours_course: [] })]; });
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, PARIS));
    await fini(p);
    r = await lire(p);
    pb.push(egal([0, true], [d.appels.length, /Compléter mon profil/.test(r.aide || '')], 'profil incomplet : rien d\'office, « Compléter mon profil »'));
    await ctx.close();

    // Garde-fous au 17 novembre : récupération du Trail du Lac (séance facile seulement), repos la veille de la Corrida de Noël.
    d = copie([bonne()]);
    ({ p, ctx } = await ouvrir(nav, 'preparation.html', 1200, d, {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-17T10:00:00+01:00') }));
    await fini(p);
    const gf = await p.evaluate(() => {
      const s = (date, intensite) => ({ date, type: 'run', libelle: 'Endurance', duree_min: 50, distance_km: 9, intensite });
      return window.mrtSeancesIA.gardeFous({ recommandation: '', seances: [s('2026-11-19', 'intense'), s('2026-12-08', 'intense'), s('2026-12-12', 'facile')] }, document.getElementById('saison').__ctx, '2026-11-16');
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
    // Lot 6b : un commentaire sur une séance relance aussitôt une réadaptation (hors plafond), avec les retours et la blessure en cours.
    {
      const d6 = copie([bonne()], x => {
        x.seances = [
          { id: 'se-p', utilisateur: moi, date: '2026-10-13', date_prevue: '2026-10-12', type: 'run', libelle: 'Seuil', faite: true, ressenti: 8, douleur: 'legere', douleur_ou: 'mollet', fatigue: 4, commentaire: 'Dur', duree_min: 50, distance_km: 9, intensite: 'intense', origine: 'saisie', etat: 'acceptee', course: null },
          { id: 'se-a', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Footing', faite: false, duree_min: 45, distance_km: 8, intensite: 'facile', origine: 'saisie', etat: 'acceptee', course: null }];
        x.profil_entrainement[0].blessure = 'tendinite'; x.profil_entrainement[0].blessure_debut = '2026-10-10';
        x.propositions.push({ id: 'p0', utilisateur: moi, cree: '2026-10-19T10:00:00Z', bloc: '2026-10-19', essai: 1, statut: 'acceptee', motif: 'proposer', reponse: { recommandation: 'Ancienne.', seances: [] } });
        couvrir(x);
      });
      const q = await ouvrir(nav, 'preparation.html', 1200, d6, {}, PARIS);
      await fini(q.p);
      await q.p.click('[data-edit="se-a"]'); await q.p.waitForSelector('.cal-seance');
      // Séance à venir : le commentaire est là, mais l'IA n'intervient pas (elle n'agit que sur une séance faite).
      const avant = d6.appels.length;
      pb.push(egal([false, true], [await q.p.locator('.cal-seance [name="commentaire"]').isVisible(), await (async () => { await q.p.check('.cal-seance [name="faite"]'); return q.p.locator('.cal-seance [name="commentaire"]').isVisible(); })()],
        'séance à venir : champ « Commentaire » caché, il apparaît avec « Faite »'));
      // « Faite » cochée puis « Annuler » : « Abandonner les modifications ? », comme la fiche d'une course ; on abandonne.
      await q.p.click('.cal-seance [data-act="annuler"]'); await q.p.waitForSelector('.mrt-dialogue');
      pb.push(egal(['Continuer', 'Abandonner'], await q.p.locator('.mrt-dialogue-boutons button').allTextContents(), 'séance modifiée puis « Annuler » : la confirmation d\'abandon'));
      await q.p.click('.mrt-dialogue-boutons button:last-child'); await q.p.waitForSelector('.cal-seance', { state: 'detached' }); await pause();
      pb.push(egal(avant, d6.appels.length, 'fenêtre fermée sans enregistrer : aucun appel à l\'IA'));
      // Séance faite, effort noté : l'IA l'analyse (animation puis texte, dans la feuille) ; adapter le plan ne se fait que sur demande.
      await q.p.click('[data-edit="se-a"]'); await q.p.waitForSelector('.cal-seance');
      await q.p.check('.cal-seance [name="faite"]');
      await q.p.evaluate(() => { const c = document.querySelector('.cal-seance [name="ressenti"]'); c.value = '6'; c.dispatchEvent(new Event('input', { bubbles: true })); });
      await q.p.fill('.cal-seance [name="commentaire"]', 'Jambes lourdes');
      await q.p.click('.cal-seance button[type="submit"]');
      await q.p.waitForSelector('.cal-analyse-texte');
      const an = d6.analyses[0] || {}, fiche = (an.contexte || {}).seance || {};
      pb.push(egal([1, 'Séance bien menée.', 'Jambes lourdes', 6, 'tendinite', 'Séance bien menée.', 0, 1],
        [d6.analyses.length, await q.p.textContent('.cal-analyse-texte'), fiche.commentaire, fiche.ressenti_sur_10, ((an.contexte || {}).blessure_en_cours || {}).description, (d6.seances.find(x => x.id === 'se-a') || {}).analyse_ia, d6.appels.length - avant, await q.p.locator('[data-adapter]').count()],
        'séance faite, effort noté : analyse demandée (fiche, commentaire, blessure), texte affiché et rangé sur la séance, aucune réadaptation sans accord ; « Adapter mon plan » proposé'));
      // « Adapter mon plan » : la réadaptation (hors plafond) s'écrit, sur l'accord de l'utilisateur.
      await q.p.click('[data-adapter]');
      for (let k = 0; k < 40 && !aPart(d6).some(x => x.motif === 'readaptation' && x.statut === 'acceptee'); k++) await pause();
      await fini(q.p);
      const ap = d6.appels[d6.appels.length - 1] || {}, cx = ap.contexte || {};
      pb.push(egal(['readaptation', '2026-10-19', [], { description: 'tendinite', depuis: '2026-10-10' }],
        [ap.motif, ap.bloc, cx.commentaires_a_venir, cx.blessure_en_cours], 'adaptation acceptée : réadaptation relancée, blessure envoyée, plus de commentaire à venir'));
      pb.push(egal({ ressenti_sur_10: 8, ressenti: 'Seuil, allure semi-marathon ou 10 km', charge_ua: 400, douleur: 'légère (mollet)', fatigue_sur_5: 4, commentaire: 'Dur', deplacee_du: '2026-10-12' }, (h => h && { ressenti_sur_10: h.ressenti_sur_10, ressenti: h.ressenti, charge_ua: h.charge_ua, douleur: h.douleur, fatigue_sur_5: h.fatigue_sur_5, commentaire: h.commentaire, deplacee_du: h.deplacee_du })((cx.historique || []).find(x => x.date === '2026-10-13')),
        'séances passées : ressenti, douleur, fatigue, commentaire et jour d\'origine envoyés'));
      pb.push(egal([3, 'acceptee', 14], [await q.p.evaluate(() => window.mrtSeancesIA.restantes(document.getElementById('saison').__ctx)), (aPart(d6).find(x => x.motif === 'readaptation') || {}).statut, d6.seances.length],
        'réadaptation hors plafond (seule la proposition du 19 octobre compte : 3 restantes), ses 12 séances écrites d\'office ; la séance saisie et la passée restent'));
      pb.push(egal([], q.erreurs, 'réadaptation : erreurs JavaScript'));
      await q.ctx.close();
      // Calendrier : la même analyse ; « Adapter mon plan » écrit la réadaptation et le dit dans la feuille.
      const d7 = copie([bonne()], x => { x.seances = [{ id: 'se-a', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Footing', faite: false, origine: 'saisie', etat: 'acceptee', course: null }]; });
      const c = await ouvrir(nav, 'calendrier.html', 1200, d7, {}, PARIS);
      await c.p.click('[data-edit="se-a"]'); await c.p.waitForSelector('.cal-seance');
      await c.p.check('.cal-seance [name="faite"]');
      await c.p.evaluate(() => { const r = document.querySelector('.cal-seance [name="ressenti"]'); r.value = '5'; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await c.p.fill('.cal-seance [name="commentaire"]', 'Genou sensible');
      await c.p.click('.cal-seance button[type="submit"]');
      await c.p.waitForSelector('[data-adapter]'); await c.p.click('[data-adapter]'); await c.p.waitForSelector('.cal-analyse-ok');
      pb.push(egal([1, 'readaptation', 'Plan adapté : les séances à venir sont à jour dans Mon plan.'], [d7.analyses.length, (d7.appels[0] || {}).motif, await c.p.textContent('.cal-analyse-ok')], 'Calendrier : analyse, puis adaptation sur demande'));
      // Rouvrir la séance : l'analyse est relue ; enregistrer sans rien changer ne relance pas l'IA.
      await c.p.click('[data-fermer]'); await c.p.waitForSelector('.cal-feuille-retour', { state: 'detached' });
      await c.p.click('[data-edit="se-a"]'); await c.p.waitForSelector('.cal-seance');
      const relue = await c.p.textContent('.cal-analyse-lue .cal-analyse-texte');
      await c.p.click('.cal-seance button[type="submit"]'); await c.p.waitForSelector('.cal-seance', { state: 'detached' }); await pause();
      pb.push(egal(['Séance bien menée.', 1, 0], [relue, d7.analyses.length, await c.p.locator('.cal-analyse-texte').count()], 'séance rouverte : analyse relue ; rien de changé, pas de nouvelle analyse'));
      await c.ctx.close();
      // Compte non pilote : l'IA répond « réservé » ; la feuille se referme sans rien dire.
      const d8 = copie([bonne()], x => { x.seances = [{ id: 'se-a', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Endurance', faite: false, origine: 'saisie', etat: 'acceptee', course: null }]; });
      d8.analyseReponse = { status: 403, body: { code: 'reserve' } };
      const c8 = await ouvrir(nav, 'calendrier.html', 1200, d8, {}, PARIS);
      await c8.p.click('[data-edit="se-a"]'); await c8.p.waitForSelector('.cal-seance');
      await c8.p.check('.cal-seance [name="faite"]');
      await c8.p.evaluate(() => { const r = document.querySelector('.cal-seance [name="ressenti"]'); r.value = '4'; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await c8.p.click('.cal-seance button[type="submit"]');
      await c8.p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); await pause();
      pb.push(egal([1, 0, []], [d8.analyses.length, await c8.p.locator('.cal-analyse-texte, .cal-msg:not(:empty)').count(), c8.erreurs], 'compte non pilote : analyse refusée, feuille refermée sans message'));
      await c8.ctx.close();
    }
    return pb;
  },
};
