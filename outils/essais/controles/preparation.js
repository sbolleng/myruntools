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
};
