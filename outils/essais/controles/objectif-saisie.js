// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  async saisie(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    db.preferences[0].modules = ['Objectif', 'En un coup d\'œil', 'Calendrier', 'Palmarès']; // Objectif en tête : la feuille de route porte le grand en-tête
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
    pb.push(egal(1, await p.locator('[data-ob="ajouter"]').count(), 'bouton « + Ajouter une course » sur la feuille de route'));
    pb.push(egal('Ajouter une course', await p.evaluate(() => document.querySelector('[data-ob="ajouter"]').innerText.trim()), 'même libellé que le Palmarès'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    const blocs = await p.evaluate(() => [...document.querySelectorAll('.fc-bloc')].map(b => b.querySelector('.fc-bloc-titre').textContent.trim() + (b.querySelector('.fc-grille').hidden ? ' (replié)' : '')));
    pb.push(egal(['Course', 'Place dans le plan', 'Inscription (replié)', 'Parcours (replié)', 'Préparation (replié)', 'Logistique (replié)', 'Résultat (replié)'], blocs, 'sept blocs, cinq repliés (ordre de lecture de la page : Dossard, Parcours, Préparation, Logistique, puis Résultat, qui ne porte que « Résultats en direct » avant la course)'));
    pb.push(egal([['Résultats en direct'], ['course', 'lien']], [await p.evaluate(() => [...document.querySelector('[data-bloc="resultat"]').nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.trim())),
      await p.evaluate(() => ['description', 'lien'].map(k => document.getElementById('fc-' + k)).map(e => e.closest('.fc-grille').previousElementSibling.dataset.bloc).slice(0, 1).concat('lien'))], 'à venir : « Résultats en direct » dans Résultat ; plus de bloc Liens'));
    pb.push(egal(true, await p.evaluate(() => document.getElementById('fc-lien').getBoundingClientRect().top >= document.getElementById('fc-description').getBoundingClientRect().bottom && document.getElementById('fc-lien').closest('.fc-grille').previousElementSibling.dataset.bloc === 'course'), '« Site officiel » dans Course, sous la description'));
    pb.push(egal(['Choisis d\'abord la date et le format.', 0], await p.evaluate(() => [document.querySelector('.fc-prep-note').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'nouvelle course : date et format d\'abord, aucun bouton de réglage du plan'));
    pb.push(egal(['Ajouter une course', 'confirmee', '', true], [await p.textContent('#fc-titre'), await lire(p, '#fc-statut'), await lire(p, '#fc-role'), await p.locator('[data-champ="groupe_options"]').isHidden()], 'ajout : titre, statut proposé, sans rôle (il se donne dans Mon plan), groupe caché'));
    pb.push(egal('ex. 07:30', await p.getAttribute('#fc-heure', 'placeholder'), 'exemple dans l\'heure'));
    // Enregistrer sans rien : champs obligatoires
    await p.click('.fc-plein');
    pb.push(egal({ course: 'Champ obligatoire.', date: 'Champ obligatoire.', type: 'Choisis un type.', format: 'Champ obligatoire.', distance: 'Champ obligatoire.' }, await erreursChamps(p), 'obligatoires : date, course, type, format, distance'));
    // Étoiles en Accent, légende ; une course à surveiller n'a besoin ni de date ni de distance (étoiles retirées)
    const etoiles = () => p.evaluate(() => ({ couleur: getComputedStyle(document.querySelector('.fc-oblig')).color !== getComputedStyle(document.querySelector('.fc-champ label')).color,
      legende: document.querySelectorAll('.fc-legende').length, enExposant: parseFloat(getComputedStyle(document.querySelector('.fc-oblig')).verticalAlign) > 0,
      visibles: ['course', 'date', 'type', 'format', 'distance'].map(k => !document.querySelector('label[for="fc-' + k + '"] .fc-oblig').hidden) }));
    pb.push(egal({ couleur: true, legende: 0, enExposant: true, visibles: [true, true, true, true, true] }, await etoiles(), 'étoile en Accent et en exposant, sans légende, sur les cinq champs obligatoires'));
    await p.selectOption('#fc-statut', 'a_surveiller');
    pb.push(egal([true, false, true, true, false], (await etoiles()).visibles, 'À surveiller : plus d\'étoile sur la date ni la distance'));
    await p.selectOption('#fc-statut', 'confirmee'); await p.click('.fc-plein');
    pb.push(egal(0, o.copie.ecritures.length, 'rien d\'écrit tant qu\'une erreur demeure'));
    // Ordre : course, parcours, date (avec « Date approximative »), heure
    pb.push(egal(['course', 'parcours', 'date', 'date_approx', 'heure', 'lieu'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')[0].querySelectorAll('[data-k]')].slice(0, 6).map(e => e.dataset.k)), 'ordre : course, parcours, date, jour inconnu, heure'));
    // Contrôles de saisie
    await p.fill('#fc-date', '2026-01-01');
    await p.fill('#fc-course', 'Trail des Lacs');
    await p.selectOption('#fc-type', 'trail');
    await p.fill('#fc-distance', '28,5');
    await p.fill('#fc-heure', '25h');
    await deplier(p); await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', 'rapide');
    await poser(p, 'lien', 'www.exemple.org');
    await poser(p, 'prix', '-3');
    await p.click('.fc-plein');
    const e1 = await erreursChamps(p);
    pb.push(egal({ date: 'La date d\'une course à venir ne peut pas être dans le passé.', heure: 'Heure illisible (ex. 07:30).', objectif: 'Durée illisible (ex. 3h, 1h30 ou 45 min).',
      lien: 'Lien attendu : il commence par http:// ou https://.', prix: 'Le nombre doit être positif.' }, { date: e1.date, heure: e1.heure, objectif: e1.objectif, lien: e1.lien, prix: e1.prix }, 'contrôles : date passée, heure, objectif, lien, prix'));
    pb.push(egal([true, true, true], await p.evaluate(() => ['objectif', 'lien', 'prix'].map(k => !document.getElementById('fc-' + k).closest('.fc-grille').hidden)), 'un champ en erreur déplie son bloc'));
    pb.push(egal('trail_court', await lire(p, '#fc-format'), 'trail : format proposé d\'après la distance'));
    // Description : 1 000 caractères
    await p.fill('#fc-description', 'x'.repeat(1000));
    pb.push(egal('1000 / 1 000', (await p.textContent('[data-compte="description"]')).replace(/[  ]/g, ' ').replace(/^1 000/, '1000'), 'compteur de description'));
    // Précisions : 100 caractères au plus, compteur
    await deplier(p);
    await p.fill('#fc-objectif_precisions', 'y'.repeat(120));
    pb.push(egal([100, '100 / 100', 'Précisions sur l\'objectif'], [(await lire(p, '#fc-objectif_precisions')).length, await p.textContent('[data-compte="objectif_precisions"]'),
      await p.evaluate(() => document.getElementById('fc-objectif').closest('.fc-champ').nextElementSibling.querySelector('label').textContent)], 'précisions : sous Objectif, limitées à 100 caractères'));
    // Saisie valide
    await p.fill('#fc-objectif_precisions', 'Partir prudemment.');
    await p.fill('#fc-description', 'Boucle autour du lac.');
    await p.fill('#fc-date', '2027-06-12');
    await p.fill('#fc-heure', '730');
    await p.fill('#fc-parcours', 'La Grande Boucle');
    await p.fill('#fc-lieu', 'Mont-Clair');
    await p.fill('#fc-dplus', '1200');
    await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', '6h');
    await p.fill('#fc-lien', 'https://example.org/lacs');
    await p.fill('#fc-prix', '45,5');
    await p.check('#fc-inscrit');
    await p.fill('#fc-dossard', '77');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w = o.copie.ecritures[0];
    pb.push(egal(['POST', 'courses'], [w.methode, w.table], 'enregistrement : une insertion'));
    pb.push(egal({ etat: 'a_venir', course: 'Trail des Lacs', parcours: 'La Grande Boucle', date: '2027-06-12', date_approx: false, heure: '07:30', lieu: 'Mont-Clair', format: 'trail_court',
      distance: 28.5, dplus: 1200, dmoins: null, objectif: 'Sub 6h', objectif_precisions: 'Partir prudemment.', description: 'Boucle autour du lac.', lien: 'https://example.org/lacs', statut: 'confirmee', role: null, groupe_options: null,
      ouverture_inscriptions: null, ouverture_heure: null, ouverture_approx: false, inscrit: true, inscription: null, dossard: '77', prix: 45.5, ravitaillements_km: null, strategie: null, pourquoi: null, logistique: null, lien_resultats: null, id: w.corps.id }, w.corps, 'enregistrement : champs écrits'));
    await ctx.close();

    // Nouvelle course : plan réglé avant d'enregistrer ; date approximative : pas de plan
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Trail des Lacs'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court');
    pb.push(egal(['Hors plan · semaine 5 sur 16 de la préparation de Trail des Crêtes', 0], await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'nouvelle course : place dans la saison tirée de la date, du format et du rôle saisis, sans bouton de réglage'));
    await p.check('#fc-date_approx');
    pb.push(egal(['Hors plan · semaine 4 sur 16 de la préparation de Trail des Crêtes', 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.', 0],
      await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelector('.fc-prep-note').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'date approximative : plan prévu pour le début du mois, mentionné'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(0, o.copie.ecritures.length, 'nouvelle course : rien d\'écrit avant « Enregistrer »'));
    await p.fill('#fc-distance', '30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    {
      const cw = o.copie.ecritures[0];
      pb.push(egal([1, ['POST', 'courses'], true, null], [o.copie.ecritures.length, [cw.methode, cw.table], /^[0-9a-f-]{36}$/.test(cw.corps.id), cw.corps.prepa_semaines],
        'nouvelle course : une seule écriture, la course ; durée du format (les phases se règlent ensuite dans Mon plan)'));
    }
    await ctx.close();

    // Date approximative décochée : le plan se recalcule sur la date précise, phases remises aux règles
    o = await neuve(1200, COURSE(6)); ({ p, ctx } = o);
    pb.push(egal(true, (await p.textContent('#preparation')).replace(/\u00a0/g, ' ').includes('Date approximative : préparation prévue pour le début du mois'), 'page d\'une course à date approximative : mention dans la rubrique Préparation'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Préparatoire (option) · semaine 8 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 26 jours de récupération', await p.textContent('.fc-prep .cal-plan-dates'), 'formulaire, date approximative : plan au 1er du mois'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-07-04'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(['Préparatoire (option) · semaine 8 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 26 jours de récupération', 0], [await p.textContent('.fc-prep .cal-plan-dates'), await p.locator('.fc-prep-note', { hasText: 'Date approximative' }).count()], 'case décochée : plan recalculé sur la date précise, sans mention'));
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([['PATCH', 'courses'], ['DELETE', 'plan_semaines', '?course=eq.' + id(6)]], o.copie.ecritures.slice(0, 2).map((e, i) => i ? [e.methode, e.table, e.filtres] : [e.methode, e.table]), 'enregistrement : date précise, phases du plan remises aux règles'));
    await ctx.close();

    // Date précise changée : les phases réglées à la main suivent la course (même numéro de semaine du plan)
    {
      const avecModif = JSON.parse(JSON.stringify(db));
      avecModif.plan_semaines = [{ id: 'ps1', utilisateur: db.profils[0].id, course: id(3), lundi: '2026-12-14', phase: 'deload' }]; // semaine 5 sur 16
      o = await neuve(1200, COURSE(3), avecModif); ({ p, ctx } = o);
      await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
      await p.fill('#fc-date', '2027-03-14'); await p.dispatchEvent('#fc-date', 'change');
      pb.push(egal('Objectif · préparation de 16 semaines, du lun. 23 nov. 2026 au dim. 14 mars 2027', await p.textContent('.fc-prep .cal-plan-dates'), 'date décalée d\'une semaine : saison décalée'));
      await p.click('.fc-plein');
      await p.waitForSelector('.fc-fiche', { state: 'detached' });
      pb.push(egal([['PATCH', 'courses'], ['DELETE', 'plan_semaines'], ['POST', 'plan_semaines', [{ course: id(3), lundi: '2026-12-21', phase: 'deload' }]]],
        o.copie.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, e.corps] : [e.methode, e.table]), 'enregistrement : la semaine 5 réglée à la main suit la course'));
      await ctx.close();
    }

    // Option : groupe d'options, existant ou nouveau ; jour inconnu
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
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
    pb.push(egal(true, await p.isDisabled('#fc-heure'), 'mois seul : l\'heure de départ est grisée'));
    await p.fill('#fc-distance', '42');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w2 = o.copie.ecritures[0].corps;
    pb.push(egal(['2027-10-01', true, null, 'option', 'Automne 2027'], [w2.date, w2.date_approx, w2.heure, w2.statut, w2.groupe_options], 'mois seul, option, nouveau groupe'));
    await ctx.close();

    // À surveiller : date facultative
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.selectOption('#fc-statut', 'a_surveiller');
    await p.fill('#fc-course', 'Trail des Sommets bis');
    await p.selectOption('#fc-type', 'trail');
    await p.selectOption('#fc-format', { index: 1 });
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([null, 'a_surveiller'], [o.copie.ecritures[0].corps.date, o.copie.ecritures[0].corps.statut], 'à surveiller sans date'));
    await ctx.close();

    // Modifier : formulaire rempli, tous les blocs ouverts
    o = await neuve(1200, COURSE(3)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Modifier la course', await p.textContent('#fc-titre'), 'modifier : titre'));
    pb.push(egal(['Inscription', 'Parcours', 'Préparation', 'Logistique', 'Résultat'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')].filter(g => g.hidden).map(g => g.previousElementSibling.textContent)), 'modifier : comme pour une nouvelle course, Course et Place dans le plan ouverts, les autres repliés'));
    // Bloc Préparation : résumé du plan et frise, sans réglage (le plan se règle dans la page Préparation)
    pb.push(egal(['Objectif · préparation de 16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027', 1, 0], await p.evaluate(() => {
      const z = document.querySelector('.fc-prep');
      return [z.querySelector('.cal-plan-dates').textContent, z.querySelectorAll('.cal-frise').length, z.querySelectorAll('button').length];
    }), 'modifier : place dans la saison (Objectif : sa saison et sa frise) en tête du bloc Préparation, en lecture'));
    await ouvrirBloc(p, 'preparation');
    const rempli = await p.evaluate(() => Object.fromEntries(['date', 'heure', 'course', 'lieu', 'format', 'dplus', 'dmoins', 'role', 'objectif', 'dossard', 'prix', 'logistique', 'lien', 'inscription', 'lien_resultats'].map(k => [k, document.getElementById('fc-' + k).value])));
    pb.push(egal({ date: '2027-03-07', heure: '07:30', course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'trail_long', dplus: '2100', dmoins: '2100', role: 'objectif', objectif: '06:30:00',
      dossard: '1287', prix: '58', logistique: 'Navette depuis le stade à 6 h 30.', lien: 'https://example.org/gorges', inscription: 'https://example.org/gorges/inscription', lien_resultats: 'https://example.org/gorges/resultats' }, rempli, 'modifier : valeurs de la course'));
    pb.push(egal(true, await p.locator('#fc-inscrit').isChecked(), 'modifier : inscrit coché'));
    await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', '6h30');
    await p.fill('#fc-date', '2027-03-08');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const m = o.copie.ecritures[0];
    pb.push(egal(['PATCH', '?id=eq.' + id(3), 'Sub 6h30', '2027-03-08'], [m.methode, m.filtres, m.corps.objectif, m.corps.date], 'modifier : mise à jour de la course'));
    pb.push(egal(true, !m.corps.etat, 'modifier : l\'état n\'est pas touché'));
    pb.push(egal([false, 1], [m.corps.prepa_semaines !== undefined, o.copie.ecritures.length], 'modifier : une seule écriture, durée et phases du plan non touchées'));
    // Pas de bouton « Retenir » ni « Marquer » sur une confirmée à venir
    pb.push(egal(0, await p.locator('[data-ob="retenir"], [data-ob="marquer"]').count(), 'confirmée à venir : ni Retenir ni Marquer'));
    await ctx.close();

    // Supprimer
    o = await neuve(1200, COURSE(2)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await p.click('[data-fc="supprimer"]');
    pb.push(egal([true, 'Supprimer'], await p.evaluate(() => [document.querySelector('.mrt-dialogue-cadre').classList.contains('is-danger'), document.querySelector('.mrt-dialogue [data-r="oui"]').textContent]),
      'suppression : confirmation du site, encadré d\'Alerte, action « Supprimer »'));
    pb.push(egal('Supprimer cette course ? Cette action est définitive.', await repondre(p, false), 'suppression : confirmation'));
    pb.push(egal(0, o.copie.ecritures.length, 'suppression annulée : rien d\'écrit'));
    await p.click('[data-fc="supprimer"]');
    await repondre(p, true);
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['DELETE', '?id=eq.' + id(2)], [o.copie.ecritures[0].methode, o.copie.ecritures[0].filtres], 'suppression : ligne effacée, retour à la feuille de route'));
    await ctx.close();

    // Retenir une course d'un groupe d'options
    o = await neuve(1200, COURSE(4)); ({ p, ctx } = o);
    await surDialogue(p, () => true);
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
    pb.push(egal(['Marquer comme courue', ['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], 0], [await p.textContent('#fc-titre'),
      await p.locator('.fc-bloc-titre').allTextContents().then(t => t.map(x => x.trim())), await p.locator('[data-fc="supprimer"]').count()], 'marquer : fiche d\'une course courue, sans Supprimer'));
    pb.push(egal(['2026-10-20', 'Trail du Lac'], [await lire(p, '#fc-date'), await lire(p, '#fc-course')], 'marquer : pré-rempli'));
    await p.fill('#fc-temps', '2:40:00');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal(['PATCH', 'courue', 9600], [o.copie.ecritures[0].methode, o.copie.ecritures[0].corps.etat, o.copie.ecritures[0].corps.temps], 'marquer : la course passe à l\'état Courue'));
    await ctx.close();

    // Course confirmée passée, pas encore courue : elle reste sur la feuille de route
    const passee = JSON.parse(JSON.stringify(db));
    passee.courses.find(c => c.id === id(1)).date = '2026-10-10';
    passee.courses.find(c => c.id === id(4)).date = '2026-10-11'; // option passée : absente du groupe
    o = await neuve(1200, PAGE, passee); ({ p, ctx } = o);
    const noms = await p.evaluate(() => [...document.querySelectorAll('.ob-et > .ob-carte > .ob-nom, .ob-et > .ob-carte > h3')].map(e => e.textContent.replace(/[  ]/g, ' ').replace(/\s*↗/, '').trim()));
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Printemps 2027', 'Trail de la Forêt', 'Trail des Crêtes'], noms, 'passée : en tête de la feuille de route'));
    pb.push(egal('Course courue', await p.locator('.ob-et').first().locator('.ob-cpt').textContent(), 'passée : compteur Course courue'));
    pb.push(egal('4 courses', (await p.locator('.mrt-stat-val').last().textContent()).trim(), 'passée : l\'en-tête ne la compte pas'));
    await ctx.close();
    o = await neuve(1200, COURSE(1), passee); ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="marquer"]').count(), 'passée : Marquer comme courue sur sa page'));
    await ctx.close();

    // Panne d'enregistrement
    const panne = JSON.parse(JSON.stringify(db)); panne.panne = true;
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, panne, {}, PARIS));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'X'); await p.fill('#fc-date', '2027-06-12'); await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', { index: 1 }); await p.fill('#fc-distance', '30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-msg:has-text("Enregistrement impossible")');
    pb.push(egal(1, await p.locator('.fc-fiche').count(), 'panne : le formulaire reste ouvert'));
    await ctx.close();

    // Palmarès : la fiche unique (§ 3.8), blocs d'une course courue ; classements dans Résultat ; ni Vitesse, ni Statut ; DNF vide le temps et l'allure
    const pal = JSON.parse(JSON.stringify(db)); pal.ecritures = [];
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, pal));
    await p.click('[data-act="add"]');
    const labels = sel => p.evaluate(s => [...document.querySelector(s).nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()), sel);
    pb.push(egal(['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], (await p.locator('.fc-bloc-titre').allTextContents()).map(x => x.trim()), 'Palmarès : blocs de la fiche unique'),
      egal(['Course', 'Parcours', 'Date', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions sur l\'objectif', 'Description', 'Site officiel'], await labels('[data-bloc="course"]'), 'Palmarès : bloc Course, dans l\'ordre'),
      egal([['Place au général', 2], ['Effectif du général', 2], ['Catégorie', 3], ['Place en catégorie', 3], ['Effectif de la catégorie', 3], ['Place par sexe', 2], ['Effectif par sexe', 2]],
        await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; g.hidden = false; const l = g.getBoundingClientRect().width;
          return [...g.children].slice(1, 8).map(e => [e.querySelector(':scope > label').textContent.trim(), Math.round(l / e.getBoundingClientRect().width)]); }),
        'Palmarès : classements dans Résultat, général et sexe sur toute la largeur (deux champs), catégorie à gauche de la place en catégorie (trois champs)'),
      egal(['Temps', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Allure moyenne (par km)', 'FC moyenne (bpm)'], await labels('[data-bloc="montre"]'), 'Palmarès : Montre, temps et distance, D+ et D−, allure et FC'),
      egal(['M0', 'M10', 15], await p.evaluate(() => { const o = [...document.querySelectorAll('#fc-categorie option')].map(x => x.value).filter(Boolean); return [o[4], o[14], o.length]; }), 'Palmarès : catégories FFA (CA, JU, ES, SE, M0 à M10)'),
      egal(['Temps', 'DNF', 'Allure moyenne (par km)', 'Place au général', 'Effectif du général', 'Catégorie', 'Place en catégorie', 'Effectif de la catégorie', 'Place par sexe', 'Effectif par sexe', 'Résultats en direct'],
        await labels('[data-bloc="resultat"]'), 'Palmarès : bloc Résultat (résultat puis classements), sans vitesse'),
      egal(0, await p.locator('#fc-vitesse, #fc-montre_vitesse, #fc-statut, #fc-date_approx, #fc-inscrit').count(), 'Palmarès : ni Vitesse, ni Statut, ni date approximative, ni Inscrit'),
      egal('fc-course', await p.evaluate(() => document.activeElement.id), 'Palmarès : curseur dans Course'));
    const pos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dossardDansDossard: document.getElementById('fc-dossard').closest('.fc-grille').previousElementSibling.dataset.bloc === 'dossard',
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2,
        description: r('fc-description').top > r('fc-dmoins').bottom }; });
    pb.push(egal({ dossardDansDossard: true, distanceSeule: true, dplusDmoins: true, description: true }, pos, 'Palmarès : dossard dans le bloc Dossard, distance seule, D+ et D− côte à côte, description dessous'));
    await p.fill('#fc-temps', '49:18'); await p.fill('#fc-allure', '4:56');
    pb.push(egal(true, await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return Math.abs(r('fc-temps').top - r('fc-allure').top) < 2 && r('fc-dnf').left > r('fc-temps').right && r('fc-allure').left > r('fc-dnf').right; }), 'Résultat : Temps, DNF et Allure moyenne sur la même ligne, dans cet ordre'));
    await p.check('#fc-dnf');
    pb.push(egal(['', '', true, true], [await p.inputValue('#fc-temps'), await p.inputValue('#fc-allure'), await p.isDisabled('#fc-temps'), await p.isDisabled('#fc-allure')], 'DNF coché : temps et allure vidés et grisés'));
    pb.push(egal(false, await p.evaluate(() => !document.querySelector('label[for="fc-temps"] .fc-oblig').hidden), 'DNF coché : l\'étoile du temps disparaît'));
    await p.uncheck('#fc-dnf');
    pb.push(egal(true, await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; return Math.abs(document.getElementById('fc-lien_resultats').getBoundingClientRect().width - g.getBoundingClientRect().width) < 2; }), '« Résultats en direct » : toute la largeur du bloc Résultat'));
    await p.fill('#fc-course', 'Course d\'essai DNF'); await p.fill('#fc-date', '2026-10-11'); await p.selectOption('#fc-type', 'route'); await p.selectOption('#fc-format', 'route_10km'); await p.fill('#fc-distance', '10');
    await p.fill('#fc-temps', '50:00'); await p.fill('#fc-allure', '5:00'); await p.click('.fc-plein');
    await p.waitForFunction(() => !document.querySelector('.fc-fiche'));
    const ins = pal.ecritures.find(e => e.methode === 'POST' && e.table === 'courses');
    pb.push(egal({ allure: 300, vitesse: 12, etat: 'courue', objectif: null }, ins && { allure: ins.corps.allure, vitesse: ins.corps.vitesse, etat: ins.corps.etat, objectif: ins.corps.objectif }, 'enregistrement : vitesse tirée de l\'allure moyenne (5:00 → 12 km/h), état Courue, objectif vide'));
    await ctx.close();

    // Objectif : la distance seule sur sa ligne, D+ et D− dessous côte à côte, puis la description avec son exemple
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    const ordre = await p.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      return { labels: [...document.querySelector('[data-bloc="course"]').nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()),
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2 && r('fc-dmoins').left > r('fc-dplus').right,
        descriptionDessous: r('fc-description').top > r('fc-dmoins').bottom, exemple: document.getElementById('fc-description').placeholder };
    });
    pb.push(egal(['Course', 'Parcours', 'Date', 'Seul le mois est connu', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions sur l\'objectif', 'Description', 'Site officiel'], ordre.labels, 'Objectif : ordre du bloc Course'),
      egal([true, true, true, true], [ordre.distanceSeule, ordre.dplusDmoins, ordre.descriptionDessous, /^Texte libre/.test(ordre.exemple)], 'Objectif : distance seule, D+ et D− côte à côte, description dessous avec un exemple de texte libre'));
    await p.click('[data-bloc="dossard"]');
    const dos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { ligne1: Math.abs(r('fc-ouverture_inscriptions').top - r('fc-ouverture_heure').top) < 6 && r('fc-ouverture_heure').left > r('fc-ouverture_inscriptions').right
          && r('fc-ouverture_approx').left > r('fc-ouverture_heure').right && Math.abs(r('fc-ouverture_approx').top - r('fc-ouverture_inscriptions').top) < r('fc-ouverture_inscriptions').height
          && r('fc-inscrit').top > r('fc-ouverture_inscriptions').bottom,
        ligne2: Math.abs(r('fc-dossard').top - r('fc-prix').top) < 2 && r('fc-dossard').top > r('fc-ouverture_inscriptions').bottom,
        site: r('fc-inscription').top > r('fc-ouverture_inscriptions').bottom && r('fc-dossard').top > r('fc-inscription').bottom, grise: document.getElementById('fc-dossard').disabled }; });
    pb.push(egal({ ligne1: true, ligne2: true, site: true, grise: true }, dos, 'Objectif : Dossard (ouverture, heure et « Seul le mois est connu » sur une ligne, puis Inscrit, site d\'inscription, numéro et prix) ; numéro grisé tant que non inscrit'));
    await ouvrirBloc(p, 'dossard');
    await p.check('#fc-inscrit');
    pb.push(egal(false, await p.isDisabled('#fc-dossard'), 'Inscrit coché : le numéro de dossard se saisit'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-formulaire.png') });
    await ctx.close();

    // Téléphone
    ({ p, ctx } = await ouvrir(nav, PAGE, 390, db, {}, { ...PARIS, mobile: true }));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(b => b.click()));
    // Écran tactile : champs à 16 px au moins, sinon l'iPhone zoome sur le champ touché et le formulaire est coupé.
    pb.push(egal([], await p.evaluate(() => [...document.querySelectorAll('.fc-fiche input:not([type="checkbox"]), .fc-fiche select, .fc-fiche textarea')]
      .filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id)), 'téléphone : aucun champ sous 16 px (pas de zoom de l\'iPhone)'));
    const ligne = await p.evaluate(() => { const d = document.getElementById('fc-date').getBoundingClientRect(), c = document.getElementById('fc-date_approx').getBoundingClientRect();
      return { memeLigne: Math.abs((d.top + d.bottom) / 2 - (c.top + c.bottom) / 2) < d.height, aDroite: c.left >= d.right }; });
    pb.push(egal({ memeLigne: true, aDroite: true }, ligne, 'téléphone : « Seul le mois est connu » à droite de la date'));
    // Téléphone : ouverture des inscriptions sur sa ligne, puis l'heure et la case ensemble dessous ; la liste de l'objectif au-dessus de sa durée
    await p.evaluate(() => { const g = document.getElementById('fc-ouverture_inscriptions').closest('.fc-grille'); if (g.hidden) document.querySelector('[data-bloc="dossard"]').click(); });
    const ouv = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dateSeule: r('fc-ouverture_heure').top > r('fc-ouverture_inscriptions').bottom, heureEtCase: r('fc-ouverture_approx').left > r('fc-ouverture_heure').right && Math.abs(r('fc-ouverture_approx').top - r('fc-ouverture_heure').top) < r('fc-ouverture_heure').height,
        rien: document.documentElement.scrollWidth <= innerWidth }; });
    pb.push(egal({ dateSeule: true, heureEtCase: true, rien: true }, ouv, 'téléphone : ouverture des inscriptions seule, puis l\'heure et « Seul le mois est connu » ensemble ; rien ne dépasse'));
    pb.push(egal(false, await p.evaluate(() => document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth), 'téléphone : le formulaire ne déborde pas'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-formulaire-telephone.png') });
    await ctx.close();

    // Ordinateur : capture
    if (CAPTURES) {
      ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
      await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
      await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-formulaire.png') });
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
    pb.push(egal(0, await p.locator('[data-ob]:not([data-ob="fermer"]):not([data-ob="agenda"])').count(), 'lecture seule : ni Modifier ni Retenir'));
    await ctx.close();
    return pb;
  },
};
