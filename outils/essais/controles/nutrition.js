// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Nutrition : calculatrice du besoin du jour (module-nutrition-specification.md, § 3 et 10). Fonctions pures, sans navigateur.
  async besoin() {
    const B = require('../../../composants/besoin.js');
    const pb = [];
    const A = { sexe: 'homme', naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' };
    const F = { sexe: 'femme', naissance: '1990-08-02', poids: 58, taille: 165, activite: 'peu' };
    const r0 = x => Math.round(x);
    const resume = r => r && { mb: r0(r.mb), kcal: r0(r.kcal), p: r.proteines.map(r0), g: r.glucides.map(r0), l: r.lipides.map(r0), phase: r.phase };
    const jour = (sports, phase) => ({ date: '2026-10-20', sports, phase });
    pb.push(
      egal({ mb: 1628, kcal: 2117, p: [98, 140], g: [265, 318], l: [59, 82], phase: 'train' }, resume(B.calculer(A, jour([], 'train'))), 'A, repos, entraînement'),
      egal({ mb: 1628, kcal: 2817, p: [98, 140], g: [352, 423], l: [78, 110], phase: 'train' }, resume(B.calculer(A, jour([{ type: 'j95', heures: 1 }], 'train'))), 'A, 1 h de jogging à 9,5 km/h'),
      egal({ mb: 1628, kcal: 2117, p: [98, 140], g: [344, 397], l: [35, 59], phase: 'carbo' }, resume(B.calculer(A, jour([], 'carbo'))), 'A, repos, carbo-loading'),
      egal({ mb: 1302, kcal: 2563, p: [81, 116], g: [320, 384], l: [71, 100], phase: 'train' }, resume(B.calculer(F, jour([{ type: 'j95', heures: 1.5 }], 'train'))), 'B, 1 h 30 de jogging'),
      egal(40, B.calculer(A, jour([], 'train')).age, 'âge de A au 20 octobre 2026'),
      egal(36, B.calculer(F, jour([], 'train')).age, 'âge de B au 20 octobre 2026'),
      egal(['poids'], B.manquants({ ...A, poids: null }, '2026-10-20'), 'profil sans poids : seul le poids manque'),
      egal(null, B.calculer({ ...A, poids: null }, jour([], 'train')), 'profil sans poids : pas de calcul'),
      egal(['sexe', 'naissance', 'poids', 'taille', 'activite'], B.manquants({}, '2026-10-20'), 'profil vide : tout manque'),
      egal(['sexe'], B.manquants({ ...A, sexe: 'non_precise' }, '2026-10-20'), 'sexe non précisé : à compléter'),
      egal([], B.manquants(A, '2026-10-20'), 'profil complet'),
      egal(['train', 'prep', 'prep', 'prep', 'carbo', 'carbo', 'veille', 'train', 'train'], [null, 14, 12, 4, 3, 2, 1, 0, 15].map(B.phaseDuJour), 'phase d\'après le nombre de jours avant la course'),
      egal('Avant-course', B.PHASES[B.phaseDuJour(12)].libelle, 'J-12 : Avant-course'),
      egal('Carbo-loading', B.PHASES[B.phaseDuJour(2)].libelle, 'J-2 : Carbo-loading'),
      egal('Veille de course', B.PHASES[B.phaseDuJour(1)].libelle, 'J-1 : Veille de course'),
      egal(r0(B.calculer(A, jour([], 'train')).kcal), r0(B.calculer(A, jour([{ type: 'inconnu', heures: 2 }, { type: 'm', heures: 0 }], 'train')).kcal), 'sport inconnu ou de durée nulle : ignoré'),
      // Séances du Calendrier : équation de course de l'ACSM, la même pour tous.
      egal(['10.52', '12.43'], [B.metCourse(10).toFixed(2), B.metCourse(12).toFixed(2)], 'ACSM : 10,5 MET à 10 km/h, 12,4 à 12 km/h'),
      egal([10, 9.75, 9.5], [B.vitesseSeance({ duree_min: 60, distance_km: 10 }, 15), B.vitesseSeance({ duree_min: 45, intensite: 'facile' }, 15), B.vitesseSeance({ duree_min: 45, intensite: 'facile' }, null)], 'vitesse : distance ÷ durée ; sinon 65 % de la VMA (facile) ; sinon 9,5 km/h'),
      egal([{ met: 3, heures: 0.5 }, null], [B.activiteSeance({ type: 'renfo', duree_min: 30 }), B.activiteSeance({ type: 'run', distance_km: 10 })], 'renforcement : 3 MET ; séance sans durée : rien'),
      // Vélo et danse (27 nov. 2026) : vélo par palier de vitesse (5 / 7 / 10 MET) ou, sans distance, par l'intensité (7 sans rien) ; danse 5 MET.
      egal([5, 7, 10, 5, 10, 7, 5], [B.activiteSeance({ type: 'velo', duree_min: 60, distance_km: 15 }), B.activiteSeance({ type: 'velo', duree_min: 60, distance_km: 20 }), B.activiteSeance({ type: 'velo', duree_min: 60, distance_km: 25 }),
        B.activiteSeance({ type: 'velo', duree_min: 60, intensite: 'facile' }), B.activiteSeance({ type: 'velo', duree_min: 60, intensite: 'intense' }), B.activiteSeance({ type: 'velo', duree_min: 60 }), B.activiteSeance({ type: 'danse', duree_min: 60 })].map(x => x.met), 'vélo : MET selon la vitesse, sinon l\'intensité ; danse : 5 MET'),
      // Natation, marche, crossfit (27 nov. 2026, les anciens « autres sports » devenus séances).
      egal([6, 6, 9, 9, 3, 3, 4, 9], [B.activiteSeance({ type: 'natation', duree_min: 60 }), B.activiteSeance({ type: 'natation', duree_min: 60, intensite: 'facile' }), B.activiteSeance({ type: 'natation', duree_min: 60, intensite: 'moderee' }), B.activiteSeance({ type: 'natation', duree_min: 60, intensite: 'intense' }),
        B.activiteSeance({ type: 'marche', duree_min: 60 }), B.activiteSeance({ type: 'marche', duree_min: 60, distance_km: 5 }), B.activiteSeance({ type: 'marche', duree_min: 60, distance_km: 5.5 }), B.activiteSeance({ type: 'crossfit', duree_min: 60 })].map(x => x.met), 'natation 6 (facile) ou 9 ; marche 3 sous 5,5 km/h, 4 au-dessus ; crossfit 9'),
      egal(['a', 'c'], B.seancesQuiComptent([{ id: 'a', date: '2026-10-20', faite: false, etat: 'acceptee' }, { id: 'b', date: '2026-10-20', etat: 'proposee' }, { id: 'c', date: '2026-10-19', faite: true }, { id: 'd', date: '2026-10-19', faite: false }], '2026-10-20', '2026-10-20').map(x => x.id).concat(B.seancesQuiComptent([{ id: 'c', date: '2026-10-19', faite: true }, { id: 'd', date: '2026-10-19', faite: false }], '2026-10-19', '2026-10-20').map(x => x.id)), 'qui compte : aujourd\'hui, faite ou non, sans les propositions de l\'IA ; un jour passé, faite seulement'));
    return pb;
  },
  // Nutrition : profil minimal et besoin du jour (module-nutrition-specification.md, § 4.5 et 10).
  async profilNutrition(nav, db) {
    const pb = [];
    const copie = (profil, ecritures = true) => { const d = JSON.parse(JSON.stringify(db)); Object.assign(d.profils[0], profil); if (ecritures) d.ecritures = []; return d; };
    const txt = async (p, sel) => (await p.locator(sel).first().textContent()).replace(/\s+/g, ' ').trim();
    const COMPLET = { sexe: 'homme', naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' };

    // Profil incomplet (sexe seul) : l'encart ne demande que les champs qui manquent.
    let d = copie({});
    let { p, ctx, erreurs } = await ouvrir(nav, 'nutrition.html', 390, d);
    pb.push(egal(['naissance_j', 'poids', 'taille', 'activite'], await p.evaluate(() => [...document.querySelectorAll('.pf-encart .pf-champ')].map(c => (c.querySelector('[name]') || {}).name)), 'encart : seuls les champs manquants (naissance en trois champs)'),
      egal(0, await p.locator('.nu-besoin').count(), 'encart : pas de besoin calculé'));
    // Valeurs refusées : rien n'est écrit.
    const remplir = async (v) => {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'activite') await p.selectOption('[name="activite"]', x); else if (k === 'naissance') await dateTrois(p, '.pf-encart', 'naissance', x); else await p.fill('[name="' + k + '"]', x);
      }
      await p.click('.pf-encart [type="submit"]');
    };
    await remplir({ naissance: '1986-03-15', poids: '0', taille: '175', activite: 'peu' });
    pb.push(egal('Le poids doit être compris entre 20 et 300 kg.', await txt(p, '.pf-msg'), 'poids à 0 refusé'), egal(0, d.ecritures.length, 'poids refusé : rien d\'écrit'));
    await remplir({ poids: '70', taille: '17' });
    pb.push(egal('La taille doit être comprise entre 100 et 250 cm.', await txt(p, '.pf-msg'), 'taille trop petite refusée'), egal(0, d.ecritures.length, 'taille refusée : rien d\'écrit'));
    await remplir({ taille: '175' });
    await p.waitForSelector('.nu-besoin');
    pb.push(egal([['PATCH', 'profils', { naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'enregistrement : seuls les champs de l\'encart'),
      egal(0, await p.locator('.pf-encart').count(), 'encart disparu une fois le profil complet'),
      egal('2 117 kcal', await txt(p, '.nu-kcal'), 'profil A : besoin du jour'),
      egal('Phase · Entraînement', await txt(p, '.nu-phase'), 'hors saison : Entraînement (la phase du plan n\'est pas affichée)'),
      egal(['Besoin 2 117 kcal', 'Besoin 98–140 g', 'Besoin 265–318 g', 'Besoin 59–82 g'], await p.locator('.nu-jauge-besoin').allTextContents().then(l => l.map(x => x.replace(/\s+/g, ' ').trim())), 'besoin du jour sous chaque jauge'),
      egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement horizontal'),
      egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Sexe non précisé : l'encart demande le sexe.
    d = copie({ ...COMPLET, sexe: 'non_precise' });
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
    pb.push(egal(['sexe'], await p.evaluate(() => [...document.querySelectorAll('.pf-encart .pf-champ')].map(c => (c.querySelector('[name]') || {}).name)), 'sexe non précisé : l\'encart demande le sexe'));
    await p.click('.pf-encart [type="submit"]');
    pb.push(egal('Choisis ton sexe (femme ou homme) : il sert à la formule du calcul.', await txt(p, '.pf-msg'), 'sexe non choisi : message'), egal(0, d.ecritures.length, 'sexe non choisi : rien d\'écrit'));
    await p.click('.mrt-pastille:has(input[value="femme"])');
    await p.click('.pf-encart [type="submit"]');
    await p.waitForSelector('.nu-besoin');
    pb.push(egal([['PATCH', 'profils', { sexe: 'femme' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'sexe enregistré'));
    await ctx.close();

    // Profil complet : pas d'encart ; « Calculé pour … » ouvre la feuille Mon profil (composants/profil.js), mesures en tête.
    d = copie(COMPLET);
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
    pb.push(egal(0, await p.locator('.pf-encart').count(), 'profil complet : pas d\'encart'), egal('2 117 kcal', await txt(p, '.nu-kcal'), 'profil complet : besoin du jour'));
    const lignesMoi = () => p.evaluate(() => [...document.querySelectorAll('.ps-profil #moi .ps-ligne-q')].map(b => b.children[0].textContent + ' | ' + b.children[1].textContent));
    await p.click('.nu-profil-l'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    pb.push(egal(['Mon profil', ['Prénom | Essai', 'Nom | Fictif', 'Sexe | Homme', 'Date de naissance | 15 mars 1986', 'Poids | 70 kg', 'Taille | 175 cm', 'Activité hors sport | Peu actif', 'Pointure | —']], [await txt(p, '.ps-profil .fc-libelle'), await lignesMoi()], 'feuille Mon profil : les mesures du calcul, en tête'));
    await p.click('.ps-profil [data-fermer]');
    pb.push(egal([0, 0], [await p.locator('.ps-profil').count(), d.ecritures.length], 'croix : feuille fermée, rien d\'écrit'));
    await p.click('.nu-profil-l'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.click('.ps-profil [data-q="poids"]'); await p.fill('.ps-profil [name="valeur"]', '72,5'); await p.click('.ps-profil .ps-valeur [type="submit"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.click('.ps-profil [data-q="activite"]'); await p.click('.ps-profil [data-val="actif"]'); await p.waitForSelector('.ps-profil .ps-ligne-q');
    await p.waitForFunction(() => /2 401/.test((document.querySelector('.nu-kcal') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
    pb.push(egal([['PATCH', 'profils', { poids: 72.5 }], ['PATCH', 'profils', { activite: 'actif' }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'feuille : chaque mesure rangée, virgule acceptée'),
      egal('2 401 kcal', await txt(p, '.nu-kcal'), 'besoin recalculé avec 72,5 kg et activité « actif »'));
    // Échec d'écriture : message, la question reste ouverte.
    d.panne = true;
    await p.click('.ps-profil [data-q="taille"]'); await p.click('.ps-profil .ps-valeur [type="submit"]');
    await p.locator('.ps-profil .ps-msg:not(:empty)').waitFor();
    pb.push(egal('Enregistrement impossible pour l\'instant.', await txt(p, '.ps-profil .ps-msg'), 'panne : message d\'erreur'), egal(1, await p.locator('.ps-profil .ps-valeur').count(), 'panne : la question reste ouverte'));
    await ctx.close();

    // Phase d'après la course cap (choisie dans les préférences) : J-12, J-2, J-1, puis une course lointaine.
    // Phase : celle du plan de saison (spécification Préparation, § 4) ; Carbo-loading de J-3 à J-2 et Veille à J-1 avant la course confirmée la plus proche.
    for (const [date, attendu] of [['2026-11-01', 'Phase · Entraînement'], ['2026-10-22', 'Phase · Carbo-loading'], ['2026-10-21', 'Phase · Veille de course'], ['2026-12-20', 'Phase · Entraînement']]) {
      d = copie(COMPLET);
      const lac = d.courses.find(c => c.course === 'Trail du Lac');
      lac.date = date; lac.prepa_semaines = 12; lac.role = 'objectif'; d.preferences[0].course_cap = lac.id; // un Objectif : sa saison donne la phase
      ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d));
      pb.push(egal(attendu, await txt(p, '.nu-phase'), 'cap au ' + date + ' : phase'));
      await ctx.close();
    }

    // Nutrition n'est pas dans le menu par défaut ; une fois cochée dans les Préférences, elle a son onglet.
    d = copie(COMPLET); d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Nutrition'];
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 390, d));
    pb.push(egal(['En un coup d\'œil', 'Ma saison', 'Ma nutrition'], await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(x => x.getAttribute('aria-label') || x.textContent)), 'Nutrition cochée : onglet dans le menu'));
    await ctx.close();
    // Menu par défaut : pas d'onglet Nutrition ailleurs ; sur la page Nutrition, son onglet s'ajoute au bout, actif, le temps de la visite.
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, copie(COMPLET)));
    pb.push(egal(false, (await p.evaluate(() => [...document.querySelectorAll('.mrt-tab')].map(x => x.getAttribute('aria-label') || x.textContent))).includes('Ma nutrition'), 'menu par défaut : pas d\'onglet Nutrition'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 390, copie(COMPLET)));
    pb.push(egal(['Ma nutrition', true], await p.evaluate(() => { const t = [...document.querySelectorAll('.mrt-tab')], on = document.querySelector('.mrt-tab.is-on'); return [on && on.textContent, t[t.length - 1] === on]; }), 'page Nutrition hors du menu : son onglet, actif, au bout'));
    await ctx.close();

    // Site partagé en lecture seule : aucune donnée de nutrition.
    const autre = '00000000-0000-0000-0000-00000000000b';
    d = copie(COMPLET); d.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    ({ p, ctx } = await ouvrir(nav, 'nutrition.html', 1200, d, { 'mrt-vue': autre }));
    pb.push(egal([0, 0, 'Les données de nutrition ne sont pas partagées.'], [await p.locator('.nu-besoin').count(), await p.locator('.pf-encart').count(), await txt(p, '#nutrition')], 'site partagé : rien de nutrition'));
    await ctx.close();
    return pb;
  },
  // Relais de recherche d'aliments (supabase/functions/recherche-aliments) : rejoué dans Node, moteur simulé.
  async relais() {
    const pb = [];
    const m = await import(path.resolve(DOSSIER, '../../supabase/functions/recherche-aliments/index.ts'));
    const hit = (nom, marque, kcal) => ({ product_name: nom, brands: [marque], nutriments: { 'energy-kcal_100g': kcal, proteins_100g: 4, carbohydrates_100g: 5, fat_100g: 1.5 } });
    const appels = [];
    // Moteur simulé : « yaourt na » ramène des marques « NA » ; « yaourt » ramène des yaourts.
    const moteur = async url => {
      const u = new URL(url); appels.push(u.hostname + ' ' + (u.searchParams.get('q') || u.searchParams.get('search_terms')));
      if (u.hostname === 'world.openfoodfacts.org') return new Response('saturé', { status: 503 });
      const q = u.searchParams.get('q');
      const hits = q === 'yaourt na' ? [hit('NA', 'Borges', 900), hit('Swiss cheese', 'Na', 90)] : q === 'yaourt' ? [hit('Yaourt nature', 'Marque C', 53), hit('Yaourt fraise', 'Marque D', 90), hit('Yaourt nature', 'Marque C', 53), hit('Yaourt au lait entier nature', 'Marque E', 60)] : [];
      return new Response(JSON.stringify({ hits }), { status: 200 });
    };
    const demander = async (corps, f = moteur, methode = 'POST') => { const r = await m.repondre(new Request('https://x/', methode === 'POST' ? { method: 'POST', body: JSON.stringify(corps) } : { method: methode }), f); return [r.status, await r.json().catch(() => null)]; };
    let [st, d] = await demander({ q: 'yaourt na' });
    pb.push(egal([200, 'search', ['Yaourt nature · Marque C', 'Yaourt au lait entier nature · Marque E']], [st, d.source, d.produits.map(p => p.nom + ' · ' + p.marque)], '« yaourt na » : les marques « NA » écartées, puis sans le dernier mot, filtré sur « na »'),
      egal(['search.openfoodfacts.org yaourt na', 'search.openfoodfacts.org yaourt'], appels, 'deux demandes : ce qui est tapé, puis sans le mot commencé'));
    pb.push(egal({ nom: 'Yaourt nature', marque: 'Marque C', kcal: 53, proteines: 4, glucides: 5, lipides: 1.5, portionG: 100 }, d.produits[0], 'produit : valeurs pour 100 g, portion de 100 g sans portion habituelle'));
    pb.push(egal(true, m.correspond({ nom: 'Œufs au plat', marque: '' }, 'oeuf au pl'), 'sans accent ni pluriel, mot commencé'));
    const panne = async () => new Response('saturé', { status: 503 });
    [st, d] = await demander({ q: 'skyr' }, panne);
    pb.push(egal([503, 'Open Food Facts indisponible'], [st, d.erreur], 'les deux moteurs en panne : 503'));
    [st, d] = await demander({ q: 'a' });
    pb.push(egal(400, st, 'recherche trop courte : refusée'));
    const o = await m.repondre(new Request('https://x/', { method: 'OPTIONS' }), moteur);
    pb.push(egal([200, '*'], [o.status, o.headers.get('access-control-allow-origin')], 'pré-demande du navigateur acceptée'));
    return pb;
  },
  // Nutrition : besoin, sport en lignes, anneaux, recherche, ajout, journal (module-nutrition-specification.md, § 4 et 10).
  async nutritionJournal(nav, db) {
    const pb = [];
    const U = db.profils[0].id, norm = t => t.replace(/\s+/g, ' ').trim();
    const COMPLET = { sexe: 'homme', naissance: '1986-03-15', poids: 70, taille: 175, activite: 'peu' };
    const ID = n => '00000000-0000-0000-0002-00000000000' + n;
    const ALIMENTS = () => [
      { id: ID(1), utilisateur: U, nom: 'Banane', portion: '1 pièce', kcal: 90, proteines: 1, glucides: 20, lipides: 0.3, favori: true, dernier_usage: '2026-10-19T08:00:00Z' },
      { id: ID(2), utilisateur: U, nom: 'Riz cuit', portion: '100 g', kcal: 130, proteines: 2.7, glucides: 28, lipides: 0.3, favori: false, dernier_usage: '2026-10-18T12:00:00Z' },
      { id: ID(3), utilisateur: U, nom: 'Œuf', portion: '1 pièce', kcal: 140, proteines: 12, glucides: 1, lipides: 10, favori: false, dernier_usage: null }];
    const LIGNES = () => [
      { id: ID(4), utilisateur: U, date: '2026-10-20', repas: 'midi', aliment: ID(2), nom: 'Riz cuit', quantite: 2, kcal: 260, proteines: 5.4, glucides: 56, lipides: 0.6 },
      { id: ID(5), utilisateur: U, date: '2026-10-20', repas: 'petit_dej', aliment: ID(1), nom: 'Banane', quantite: 1, kcal: 90, proteines: 1, glucides: 20, lipides: 0.3 }];
    const base = (extra = {}) => { const d = JSON.parse(JSON.stringify(db)); Object.assign(d.profils[0], COMPLET); Object.assign(d.courses.find(c => c.course === 'Trail du Lac'), { prepa_semaines: 12, role: 'objectif' }); d.aliments = ALIMENTS(); d.repas_lignes = LIGNES(); d.ecritures = []; return Object.assign(d, extra); };
    const jauges = p => p.evaluate(() => [...document.querySelectorAll('.nu-jauge')].map(j => [j.dataset.jauge, j.dataset.etat, j.querySelector('.nu-anneau-v').textContent, j.querySelector('.nu-jauge-reste').textContent, j.querySelector('.nu-jauge-besoin').textContent].join(' | ').replace(/\s+/g, ' ')));
    const groupes = p => p.evaluate(() => [...document.querySelectorAll('.nu-repas')].filter(r => r.querySelector('li')).map(r => r.querySelector('.nu-repas-t').textContent.replace(/\s+/g, ' ').trim().replace(/^(Petit-déj|Midi|Encas|Soir)/, '$1 ')).map(x => x.replace(/\s+/g, ' ')));
    // Feuilles « Repas » et « Activité » : ouvertes par les cases (ou le « + » d'un repas), fermées par la croix.
    const ouvrirRepas = async (p, repas) => { await p.click(repas ? '.nu-journal [data-act="ajout-repas"][data-repas="' + repas + '"]' : '.nu-tuile[data-act="ajout-repas"]'); await p.waitForSelector('.nu-feuille .nu-sources'); };
    const ouvrirActivite = async p => { await p.click('.nu-tuile[data-act="activite"]'); await p.waitForSelector('.nu-feuille .cal-seance'); };
    const fermerF = async p => { await p.click('.nu-feuille [data-act="fermer"]'); await p.waitForSelector('.nu-feuille', { state: 'detached' }); };
    const lignes = p => p.evaluate(() => [...document.querySelectorAll('.nu-ligne-nom')].map(x => x.textContent.replace(/\s+/g, ' ')));
    const liste = p => p.evaluate(() => [...document.querySelectorAll('.nu-source .nu-aliment, .nu-resultats .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | ')));
    const sansId = e => { const c = { ...e.corps }; delete c.id; return c; };
    const ouvrirN = async (d, w = 390, opts = {}) => { const o = await ouvrir(nav, 'nutrition.html', w, d, {}, opts); await o.p.waitForSelector('.nu-jauge'); return o; };
    const kcal = async p => norm(await p.locator('.nu-kcal').textContent());
    // Attend qu'une écriture soit arrivée dans la base simulée (enregistrement différé du sport).
    const ecrit = async (d, f) => { for (let i = 0; i < 60 && !d.ecritures.some(f); i++) await new Promise(r => setTimeout(r, 50)); };

    // Carte 1 et jauges au départ.
    let d = base();
    let { p, ctx, erreurs } = await ouvrirN(d);
    pb.push(egal(['Calculé pour H · 70 kg · 175 cm · peu actif ›', 'Phase · Entraînement', '2 117 kcal'], [norm(await p.locator('.nu-profil-l').textContent()), norm(await p.locator('.nu-phase').textContent()), await kcal(p)], 'carte du besoin : profil en lecture, phase de Nutrition, besoin'),
      egal(['Mardi 20 octobre', true, 0], [norm(await p.locator('.nu-jour-t').textContent()), await p.locator('[data-act="lendemain"]').isDisabled(), await p.locator('[data-act="aujourdhui"]').count()], 'sélecteur : le jour, pas de jour suivant, pas de rond « » »'),
      egal(['kcal | sous | 350 | Reste 1 767 kcal | Besoin 2 117 kcal', 'p | sous | 6 g | Reste 92 g | Besoin 98–140 g', 'g | sous | 76 g | Reste 189 g | Besoin 265–318 g', 'l | sous | 1 g | Reste 58 g | Besoin 59–82 g'], await jauges(p), 'anneaux : nom, valeur, reste, besoin'),
      egal(['Petit-déj 90 kcal', 'Midi 260 kcal'], await groupes(p), 'journal : un bloc par repas'),
      egal(['Banane', 'Riz cuit · 200 g'], await lignes(p), 'journal : grammes pour un aliment donné pour 100 g'),
      egal(['Séance', 'Repas', 0], [norm(await p.locator('.nu-tuile[data-act="activite"]').textContent()), norm(await p.locator('.nu-tuile[data-act="ajout-repas"]').textContent()), await p.locator('.nu-sources, .cal-seance').count()], 'boutons Activité et Repas ; ajout et séance dans leurs feuilles'),
      egal([true, true, true, 'ajout-repas'], await p.evaluate(() => { const style = cl => { const ref = document.createElement('button'); ref.className = cl; document.body.append(ref); const r0 = getComputedStyle(ref), v = [r0.backgroundColor, r0.color, r0.borderRadius]; ref.remove(); return v; }; return [...document.querySelectorAll('.nu-tuile')].map(t => { const att = style(t.classList.contains('is-principal') ? 'mrt-btn is-principal' : 'mrt-btn'); const c = getComputedStyle(t), ico = t.querySelectorAll('svg'), l = t.querySelector('.nu-tuile-l').getBoundingClientRect(); return [c.backgroundColor, c.color, c.borderRadius].join() === att.join() && ico.length === 2 && ico[0].getBoundingClientRect().right <= l.left && ico[1].getBoundingClientRect().left >= l.right; }).concat([document.querySelectorAll('.nu-tuile').length === 2, (document.querySelector('.nu-tuile.is-principal') || {}).dataset.act]); }), 'boutons Repas et Séance : Repas seul principal (design, § 11), Séance en secondaire, « + » à gauche, picto à droite du libellé'),
      egal(0, await p.locator('.nu-mention, .nu-macros, .nu-editer').count(), 'page épurée : ni mention, ni fourchettes en texte, ni bouton « Modifier »'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'nutrition-telephone.png'), fullPage: true });
    await ouvrirRepas(p);
    if (CAPTURES) { await p.waitForTimeout(600); await p.screenshot({ path: path.join(DOSSIER, 'captures', 'nutrition-feuille.png') }); }
    pb.push(egal(['Ajouter un aliment', ['Banane · 1 pièce | 90 kcal', 'Riz cuit | 130 kcal / 100 g']], [norm(await p.locator('.nu-feuille .fc-libelle').textContent()), await liste(p)], 'feuille Repas : titre, Récents sans l\'aliment jamais utilisé'));
    await p.click('[data-source="favoris"]');
    pb.push(egal(['Banane · 1 pièce | 90 kcal'], await liste(p), 'Favoris'));
    pb.push(egal(true, await p.evaluate(() => document.querySelector('.nu-feuille .nu-recherche').getBoundingClientRect().height < 80), 'Favoris : la recherche garde sa hauteur (liste courte)'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'nutrition-favoris.png') });
    await p.click('[data-source="recents"]');
    // Banane : deux portions, au repas de l'heure (10 h : midi).
    pb.push(egal(['Récents', 'Favoris', '+ Aliment libre'], (await p.locator('.nu-sources button').allTextContents()).map(norm), 'sources : Récents, Favoris, Aliment libre'));
    await p.click('.nu-aliment >> nth=0');
    const qte = async () => p.inputValue('.nu-qte');
    pb.push(egal([0, 0, true, 'Banane · 1 pièce'], [await p.locator('.nu-feuille .nu-sources').count(), await p.locator('.nu-feuille .nu-recherche').count(), await p.locator('.nu-retour').isVisible(), norm(await p.locator('.nu-choix-nom').textContent())],
      'étape 2 : l\'aliment seul, sans la recherche ni les listes ; « ‹ » proposé'));
    await p.click('[data-act="retour"]');
    pb.push(egal([1, 0, false], [await p.locator('.nu-feuille .nu-sources').count(), await p.locator('.nu-choix').count(), await p.locator('.nu-retour').isVisible()], '« ‹ » : retour à la recherche et aux listes'));
    await p.click('.nu-aliment >> nth=0');
    pb.push(egal(['1', 'midi'], [await qte(), await p.locator('.nu-repas-choix [aria-pressed="true"]').getAttribute('data-repas')], 'choix : une portion, repas d\'après l\'heure'));
    await p.click('[data-act="plus"]'); await p.click('[data-act="plus"]'); await p.click('[data-act="moins"]'); await p.click('[data-act="plus"]');
    pb.push(egal(['2', '2 portions'], [await qte(), norm(await p.locator('.nu-quantite .nu-unite').textContent()).replace(/^/, '2 ')], 'quantité par pas de 0,5'));
    pb.push(egal(['180 kcal · P 2 g · G 40 g · L 1 g', 'Ajouter · 180 kcal', ['Quantité', 'Repas'], 1], [norm(await p.locator('.nu-apercu').textContent()), norm(await p.locator('.nu-ajouter').textContent()), (await p.locator('.nu-choix-l').allTextContents()).map(norm), await p.locator('.nu-choix-tete .nu-fav').count()],
      'étape 2 : aperçu de la quantité, total dans le bouton, libellés Quantité et Repas, Favori à côté du nom'));
    if (CAPTURES) { const vp = p.viewportSize(); await p.setViewportSize({ width: 390, height: 844 }); await p.screenshot({ path: path.join(DOSSIER, 'captures', 'nutrition-ajout-etape2.png') }); await p.setViewportSize(vp); }
    {
      const vp = p.viewportSize();
      await p.setViewportSize({ width: 1280, height: 800 });
      const mesure = () => p.evaluate(() => { const f = document.querySelector('.nu-feuille').getBoundingClientRect(), b = document.querySelector('.nu-feuille .mc-pied'); return [Math.round(f.width), Math.round(f.height), !!b && Math.abs(b.getBoundingClientRect().bottom - f.bottom) < 2]; });
      const e2 = await mesure();
      if (CAPTURES) { await p.waitForTimeout(400); await p.screenshot({ path: path.join(DOSSIER, 'captures', 'nutrition-ajout-ordinateur.png') }); }
      await p.click('[data-act="retour"]');
      const e1 = await mesure();
      pb.push(egal([[480, 640, true], [480, 640, false]], [e2, e1], 'ordinateur : feuille de 30 rem sur 40 rem aux deux étapes ; « Ajouter » collé en bas de l\'étape 2'));
      await p.click('.nu-aliment >> nth=0'); await p.fill('.nu-qte', '2');
      await p.setViewportSize(vp);
    }
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal([['POST', 'repas_lignes', { date: '2026-10-20', repas: 'midi', aliment: ID(1), nom: 'Banane', quantite: 2, kcal: 180, proteines: 2, glucides: 40, lipides: 0.6 }], ['PATCH', 'aliments', ['dernier_usage'], '?id=eq.' + ID(1)]],
      d.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, sansId(e)] : [e.methode, e.table, Object.keys(e.corps), e.filtres]), 'Ajouter : la ligne figée et le dernier usage de l\'aliment'),
      egal('kcal | sous | 530 | Reste 1 587 kcal | Besoin 2 117 kcal', (await jauges(p))[0], 'anneau des calories après l\'ajout'),
      egal(['Petit-déj 90 kcal', 'Midi 440 kcal'], await groupes(p), 'journal après l\'ajout'),
      egal([0, 1], [await p.locator('.nu-ok').count(), await p.locator('.nu-feuille').count()], 'feuille : plus de message « ajouté », la feuille reste ouverte'));
    d.ecritures.length = 0;
    await fermerF(p);
    pb.push(egal(0, await p.locator('.nu-journal li .mrt-rond').count(), 'journal : aucun rond au bout des lignes'));
    await p.locator('.nu-ligne:has-text("Banane")').last().click();
    await p.waitForSelector('.nu-modifier');
    await p.click('.nu-modifier [data-act="supprimer"]');
    pb.push(egal(['Supprimer cette ligne ?', 0], [norm(await p.locator('.mrt-dialogue p').textContent()), d.ecritures.length], 'Supprimer : la question du site, rien d\'écrit avant la réponse'));
    await p.click('.mrt-dialogue [data-r="oui"]');
    await p.waitForFunction(() => document.querySelectorAll('.nu-lignes li').length === 2);
    pb.push(egal([['DELETE', 'repas_lignes'], 0], [[d.ecritures[0].methode, d.ecritures[0].table], await p.locator('.nu-modifier').count()], 'toucher la ligne, Supprimer, Supprimer : la ligne est supprimée, la fenêtre fermée'));
    // Riz cuit, en grammes : 100 g d'office, saisie de 200 g puis « − » : 190 g.
    d.ecritures.length = 0;
    await ouvrirRepas(p);
    await p.click('.nu-aliment:has-text("Riz cuit")');
    pb.push(egal(['100', 'g'], [await qte(), norm(await p.locator('.nu-quantite .nu-unite').textContent())], 'aliment pour 100 g : quantité en grammes'));
    await p.fill('.nu-qte', '0'); await p.click('[data-act="ajouter"]');
    pb.push(egal(['La quantité doit être comprise entre 1 et 5 000 g.', 0], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), d.ecritures.length], 'quantité nulle refusée'));
    await p.fill('.nu-qte', '200'); await p.click('[data-act="moins"]');
    pb.push(egal('190', await qte(), '« − » : 10 g de moins'));
    pb.push(egal('247 kcal · P 5 g · G 53 g · L 1 g', norm(await p.locator('.nu-apercu').textContent()), 'aperçu de 190 g de riz'));
    await p.fill('.nu-qte', '200');
    pb.push(egal(['260 kcal · P 5 g · G 56 g · L 1 g', 'Ajouter · 260 kcal'], [norm(await p.locator('.nu-apercu').textContent()), norm(await p.locator('.nu-ajouter').textContent())], 'aperçu à la frappe, sans redessiner'));
    await p.fill('.nu-qte', '190');
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal({ date: '2026-10-20', repas: 'midi', aliment: ID(2), nom: 'Riz cuit', quantite: 1.9, kcal: 247, proteines: 5.1, glucides: 53.2, lipides: 0.6 }, sansId(d.ecritures[0]), '190 g de riz : 1,9 fois les valeurs pour 100 g'),
      egal(['Banane', 'Riz cuit · 200 g', 'Riz cuit · 190 g'], await lignes(p), 'journal : 190 g'));

    // Recherche dans Open Food Facts (réponses simulées : aucun appel réel pendant les essais).
    const demandes = [];
    let reponse = { status: 200, body: { products: [
      { code: '1', product_name: 'Riz basmati', brands: 'Marque A, Autre', serving_quantity: 60, nutriments: { 'energy-kcal_100g': 350, proteins_100g: 8, carbohydrates_100g: 78, fat_100g: 1 } },
      { code: '2', product_name: 'Sans calories', brands: 'Marque B', nutriments: {} },
      { code: '3', product_name: 'Rice pudding', product_name_fr: 'Riz au lait', brands: '', nutriments: { energy_100g: 300, carbohydrates_100g: 17 } },
      { code: '4', product_name: 'Compote', brands: '', nutriments: { 'energy-kcal_100g': 70 } }] } };
    await ctx.route('https://world.openfoodfacts.org/**', r => { demandes.push(r.request().url()); r.fulfill({ status: reponse.status, contentType: 'application/json', body: JSON.stringify(reponse.body) }); });
    await p.fill('.nu-recherche [name="q"]', 'riz');
    await p.clock.runFor(600); await p.waitForTimeout(300);
    pb.push(egal([0, ''], [demandes.length, norm(await p.locator('.nu-produits').textContent())], 'sans relais, pendant la frappe : l\'ancien moteur n\'est pas interrogé, rien d\'affiché'));
    await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForSelector('.nu-off .nu-aliment');
    pb.push(egal(['Riz cuit | 130 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-resultats .nu-liste:not(.nu-off) .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'recherche : mes aliments d\'abord'));
    pb.push(egal(['Riz basmati · Marque A | 350 kcal / 100 g', 'Riz au lait | 72 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'résultats : pour 100 g (kJ convertis), sans produit sans calories ni produit sans le mot « riz »'),
      egal(['riz', 'unique_scans_n'], [new URL(demandes[0]).searchParams.get('search_terms'), new URL(demandes[0]).searchParams.get('sort_by')], 'recherche : le texte saisi, les produits les plus courants d\'abord'));
    d.ecritures.length = 0;
    await p.click('.nu-off .nu-aliment >> nth=0');
    pb.push(egal(['Riz basmati · Marque A', '60'], [norm(await p.locator('.nu-choix-nom').textContent()), await qte()], 'produit choisi : sa portion habituelle en grammes'));
    await p.click('[data-act="favori"]');
    pb.push(egal(0, d.ecritures.length, 'favori d\'un produit pas encore ajouté : rien d\'écrit'));
    await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal([['POST', 'aliments', { nom: 'Riz basmati · Marque A', portion: '100 g', kcal: 350, proteines: 8, glucides: 78, lipides: 1, favori: true, dernier_usage: null }],
      ['POST', 'repas_lignes', { date: '2026-10-20', repas: 'midi', aliment: d.ecritures[0] && d.ecritures[0].corps.id, nom: 'Riz basmati · Marque A', quantite: 0.6, kcal: 210, proteines: 4.8, glucides: 46.8, lipides: 0.6 }], ['PATCH', 'aliments']],
      d.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, sansId(e)] : [e.methode, e.table]), 'produit ajouté : il devient un aliment (favori), puis une ligne de 60 g'));
    await p.click('[data-source="recents"]');
    pb.push(egal('Riz basmati · Marque A | 350 kcal / 100 g', (await p.evaluate(() => [...document.querySelectorAll('.nu-source .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))))[0], 'le produit revient en tête des Récents'));
    reponse = { status: 200, body: { products: [
      { product_name: 'NA', brands: 'Borges', nutriments: { 'energy-kcal_100g': 900 } },
      { product_name: 'Yaourt nature', brands: 'Marque F', nutriments: { 'energy-kcal_100g': 50, proteins_100g: 4 } }] } };
    await p.fill('.nu-recherche [name="q"]', 'yaourt na'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForSelector('.nu-off .nu-aliment');
    pb.push(egal(['Yaourt nature · Marque F | 50 kcal / 100 g'], await p.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'moteur de secours : « yaourt na » écarte la marque « NA »'));
    reponse = { status: 200, body: { products: [] } };
    await p.fill('.nu-recherche [name="q"]', 'introuvable'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForFunction(() => /Aucun résultat/.test(document.querySelector('.nu-resultats').textContent));
    pb.push(egal('Aucun résultat.', norm(await p.locator('.nu-resultats').textContent()), 'recherche sans résultat'));
    reponse = { status: 503, body: {} };
    const avant = demandes.length;
    await p.fill('.nu-recherche [name="q"]', 'pain'); await p.press('.nu-recherche [name="q"]', 'Enter');
    for (let i = 0; i < 20 && !/saturé/.test(await p.locator('.nu-resultats').textContent()); i++) await p.clock.runFor(500);
    pb.push(egal(['Open Food Facts est saturé, réessaie dans un instant.', 2], [norm(await p.locator('.nu-resultats').textContent()), demandes.length - avant], 'sans relais, ancien moteur saturé : un nouvel essai, puis le message'));

    // Relais Supabase « recherche-aliments » : la voie normale ; l'ancien moteur n'est pas appelé ; recherche gardée.
    {
      const d2 = base(), appels = [];
      d2.relais = c => { appels.push(c); return { status: 200, body: { source: 'search', produits: [{ nom: 'Yaourt nature', marque: 'Marque C', kcal: 53, proteines: 4, glucides: 5, lipides: 1.5, portionG: 125 }] } }; };
      const o2 = await ouvrirN(d2), p2 = o2.p, ancien = [];
      await o2.ctx.route('https://world.openfoodfacts.org/**', r => { ancien.push(1); r.fulfill({ status: 503, body: '' }); });
      await ouvrirRepas(p2);
      const mes = () => p2.evaluate(() => [...document.querySelectorAll('.nu-mes .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | ')));
      await p2.fill('.nu-recherche [name="q"]', 'oe');
      pb.push(egal([['Œuf · 1 pièce | 140 kcal'], 0, 0], [await mes(), appels.length, ancien.length], 'pendant la frappe : mes aliments, sans aucun appel'));
      await p2.fill('.nu-recherche [name="q"]', 'yaourt');
      await p2.clock.runFor(600);
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal([[{ q: 'yaourt' }], 'yaourt'], [appels.slice(), await p2.inputValue('.nu-recherche [name="q"]')], 'pendant la frappe, dès l\'arrivée sur la page : les produits par le relais, sans Entrée'));
      await p2.press('.nu-recherche [name="q"]', 'Enter');
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal([['Yaourt nature · Marque C | 53 kcal / 100 g'], [{ q: 'yaourt' }], 0], [await p2.evaluate(() => [...document.querySelectorAll('.nu-off .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), appels, ancien.length], 'relais : les produits, sans l\'ancien moteur'));
      await p2.click('.nu-off .nu-aliment >> nth=0');
      pb.push(egal('125', await p2.inputValue('.nu-qte'), 'relais : la portion habituelle du produit'));
      await p2.click('[data-act="retour"]');
      pb.push(egal(['yaourt', 1], [await p2.inputValue('.nu-recherche [name="q"]'), await p2.locator('.nu-off .nu-aliment').count()], '« ‹ » : la recherche et ses résultats retrouvés'));
      await p2.fill('.nu-recherche [name="q"]', 'skyr'); await p2.fill('.nu-recherche [name="q"]', 'yaourt'); await p2.press('.nu-recherche [name="q"]', 'Enter');
      await p2.waitForSelector('.nu-off .nu-aliment');
      pb.push(egal(1, appels.length, 'recherche déjà faite : gardée, aucun nouvel appel'));
      // Une recherche gardée par une version précédente du site n'est pas resservie.
      pb.push(egal(true, await p2.evaluate(() => { sessionStorage.setItem('mrt-nutri-recherches-ancienne', '{"yaourt":[]}'); return Object.keys(sessionStorage).some(k => /^mrt-nutri-recherches-/.test(k)); }), 'mémoire des recherches : sous la version du site'));
      // Le relais a répondu : les produits arrivent aussi pendant la frappe, une demi-seconde après la dernière lettre.
      await p2.fill('.nu-recherche [name="q"]', 'yaourt fr');
      pb.push(egal(1, appels.length, 'pendant la frappe : rien avant la pause'));
      await p2.clock.runFor(600);
      await p2.waitForFunction(() => document.querySelector('.nu-off .nu-aliment'));
      pb.push(egal([[{ q: 'yaourt' }, { q: 'yaourt fr' }], 'yaourt fr'], [appels, await p2.inputValue('.nu-recherche [name="q"]')], 'pendant la frappe : la recherche part après la pause, le champ reste en place'));
      await o2.ctx.close();
    }

    // Aliment libre : contrôles, puis création.
    d.ecritures.length = 0;
    await p.click('[data-source="libre"]');
    await p.click('.nu-feuille [form="nu-libre"]');
    pb.push(egal('Écris le nom de l\'aliment.', norm(await p.locator('.nu-ajout .nu-msg').textContent()), 'aliment libre : nom manquant'));
    await p.fill('.nu-libre [name="nom"]', 'Pain'); await p.fill('.nu-libre [name="portion"]', '1 tranche');
    await p.click('.nu-feuille [form="nu-libre"]');
    pb.push(egal(['Indique les calories pour une portion.', 'Pain', 0], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), await p.inputValue('.nu-libre [name="nom"]'), d.ecritures.length], 'aliment libre : calories manquantes, saisie gardée, rien d\'écrit'));
    await p.fill('.nu-libre [name="kcal"]', '80'); await p.fill('.nu-libre [name="proteines"]', '3,5'); await p.fill('.nu-libre [name="glucides"]', '15');
    pb.push(egal(true, await p.evaluate(() => { const n = document.querySelector('.nu-libre [name="nom"]').getBoundingClientRect(), f = document.querySelector('.nu-favori-case').getBoundingClientRect(); return f.left >= n.right && Math.abs((f.top + f.bottom) / 2 - (n.top + n.bottom) / 2) < 3; }), 'aliment libre : l\'étoile Favori à droite du nom'));
    await p.click('.nu-favori-case');
    pb.push(egal(['★', true], [norm(await p.locator('.nu-favori-case').innerText()), await p.isChecked('.nu-libre [name="favori"]')], 'étoile touchée : pleine, cochée'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'nutrition-libre.png') });
    await p.click('.nu-feuille [form="nu-libre"]');
    await p.waitForFunction(() => /Pain/.test((document.querySelector('.nu-choix-nom') || {}).textContent || ''));
    pb.push(egal([['POST', 'aliments', { nom: 'Pain', portion: '1 tranche', favori: true, dernier_usage: null, kcal: 80, proteines: 3.5, glucides: 15, lipides: 0 }]], d.ecritures.map(e => [e.methode, e.table, sansId(e)]), 'aliment libre : créé avec ses valeurs'),
      egal('Pain · 1 tranche', norm(await p.locator('.nu-choix-nom').textContent()), 'aliment libre : prêt à ajouter'));
    d.ecritures.length = 0;
    await p.click('[data-act="favori"]');
    await p.waitForFunction(() => document.querySelector('[data-act="favori"]').getAttribute('aria-pressed') === 'false');
    pb.push(egal([['PATCH', 'aliments', { favori: false }]], d.ecritures.map(e => [e.methode, e.table, e.corps]), 'Favori retiré'));
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'téléphone : pas de débordement horizontal'), egal([], erreurs, 'erreurs JavaScript'));
    await ctx.close();

    // Panne d'écriture : message, aucune ligne ajoutée.
    d = base({ panne: true });
    ({ p, ctx } = await ouvrirN(d));
    await ouvrirRepas(p);
    await p.click('.nu-aliment >> nth=0'); await p.click('[data-act="ajouter"]');
    await p.locator('.nu-ajout .nu-msg:not(:empty)').waitFor();
    pb.push(egal(['Enregistrement impossible pour l\'instant.', 2], [norm(await p.locator('.nu-ajout .nu-msg').textContent()), await p.locator('.nu-lignes li').count()], 'panne : message, journal inchangé'));
    await ctx.close();

    // Repas d'après l'heure : 7 h petit-déj, 20 h soir.
    for (const [h, attendu] of [['07:00', 'petit_dej'], ['20:00', 'soir']]) {
      ({ p, ctx } = await ouvrirN(base(), 390, { maintenant: new Date('2026-10-20T' + h + ':00') }));
      await ouvrirRepas(p);
      await p.click('.nu-aliment >> nth=0');
      pb.push(egal(attendu, await p.locator('.nu-repas-choix [aria-pressed="true"]').getAttribute('data-repas'), 'repas proposé à ' + h));
      await ctx.close();
    }

    // Jauges : cible et alerte.
    for (const [ligne, attendu, quoi] of [[{ kcal: 2200, proteines: 100, glucides: 300, lipides: 90 }, ['kcal cible Dans la cible', 'p cible Dans la cible', 'g cible Dans la cible', 'l alerte Dépassé de 8 g'], 'cible, puis lipides au-delà du maximum'],
      [{ kcal: 3000, proteines: 150, glucides: 400, lipides: 60 }, ['kcal alerte Dépassé de 671 kcal', 'p alerte Dépassé de 10 g', 'g alerte Dépassé de 82 g', 'l cible Dans la cible'], 'tout au-delà sauf les lipides']]) {
      d = base(); d.repas_lignes = [{ ...LIGNES()[0], ...ligne }];
      ({ p, ctx } = await ouvrirN(d));
      pb.push(egal(attendu, (await jauges(p)).map(x => { const c = x.split(' | '); return c[0] + ' ' + c[1] + ' ' + c[3]; }), 'jauges : ' + quoi));
      await ctx.close();
    }

    // Rien de saisi.
    d = base(); d.aliments = []; d.repas_lignes = [];
    ({ p, ctx } = await ouvrirN(d));
    pb.push(egal([['Petit-déj', 'Midi', 'Encas', 'Soir', 'Séances'], 0], [await p.locator('.nu-journal .nu-repas-t > span:first-child').allTextContents(), await p.locator('.nu-journal li').count()], 'journal vide : les quatre repas puis l\'activité, chacun avec son « + »'));
    await ouvrirRepas(p, 'soir');
    pb.push(egal('soir', await p.evaluate(() => document.querySelector('.nu-feuille .nu-sources') && 'soir'), '« + » du soir : la feuille s\'ouvre'));
    pb.push(egal(['+ Aliment libre', ''], [norm(await p.locator('.nu-sources [aria-pressed="true"]').textContent()), ''], 'sans aliment : formulaire libre, journal vide'));
    await p.click('[data-source="favoris"]');
    pb.push(egal('Aucun favori.', norm(await p.locator('.nu-source .nu-vide').textContent()), 'sans favori'));
    await p.click('[data-source="recents"]');
    pb.push(egal('Aucun aliment récent.', norm(await p.locator('.nu-source .nu-vide').textContent()), 'sans récent'));
    await ctx.close();

    // Activité : les séances seulement (plus d'« Autres sports », 27 nov. 2026) ; Natation, Marche, Crossfit, Vélo et Danse se saisissent comme une séance.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    await ouvrirActivite(p);
    pb.push(egal(['Ajouter une séance', 0, false], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.locator('.nu-sports, .nu-sport-l').count(), await p.locator('.nu-retour').isVisible()], 'bouton Séance : directement « Ajouter une séance » (plus de page-liste, plus d\'« Autres sports »)'));
    pb.push(egal(['Renforcement', 'Vélo', 'Danse', 'Natation', 'Marche', 'Crossfit'], await p.locator('.nu-feuille [name="nom"] option').allTextContents().then(l => l.slice(-6)), 'choix de séance : Renforcement, Vélo, Danse, Natation, Marche, Crossfit'));
    await p.selectOption('.nu-feuille [name="nom"]', 'Natation'); await p.fill('.nu-feuille [name="duree"]', '60');
    pb.push(egal([0, true], [await p.locator('.nu-feuille .cal-seul-course:visible').count(), await p.locator('.nu-feuille .cal-intensite').isVisible()], 'natation : durée et intensité, ni distance ni D+'));
    await p.click('.nu-feuille button[type="submit"]');
    await ecrit(d, e => e.table === 'seances' && e.methode === 'POST');
    const sn = d.ecritures.filter(e => e.table === 'seances' && e.methode === 'POST').pop().corps;
    pb.push(egal([{ type: 'natation', libelle: 'Natation', duree_min: 60, intensite: 'facile', faite: false }, '2 537 kcal'], [{ type: sn.type, libelle: sn.libelle, duree_min: sn.duree_min, intensite: sn.intensite, faite: sn.faite }, await kcal(p)], 'séance de natation : rangée dans le Calendrier, comptée dans le besoin (6 MET × 70 kg × 1 h)'));
    await ctx.close();

    // Toucher une ligne : Modifier (quantité, repas) ; Annuler ne range rien.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    await p.click('.nu-ligne:has-text("Riz cuit")');
    await p.waitForSelector('.nu-modifier');
    pb.push(egal(['Riz cuit', '200', 'midi', true, true, 0], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.inputValue('.nu-modifier .nu-qte'), await p.inputValue('.nu-modifier select[name="repas"]'),
      await p.evaluate(() => !!document.querySelector('.mc-panneau.mc-etroit.nu-feuille .nu-modifier .mc-pied [type="submit"]')), await p.evaluate(() => !!document.querySelector('.nu-modifier .cal-bas [data-act="supprimer"]')), await p.locator('.cal-voile').count()],
      'Modifier : la feuille de saisie rapide (titre = la ligne, « Enregistrer » collé en bas), repas en liste'));
    await p.click('.nu-feuille [data-act="fermer"]');
    pb.push(egal([0, 0], [await p.locator('.nu-modifier').count(), d.ecritures.length], 'croix : feuille fermée, rien d\'écrit'));
    await p.click('.nu-ligne:has-text("Riz cuit")');
    await p.fill('.nu-modifier .nu-qte', '100'); await p.selectOption('.nu-modifier select[name="repas"]', 'soir');
    await p.click('.nu-modifier .mc-pied [type="submit"]');
    await p.waitForSelector('.nu-modifier', { state: 'detached' });
    pb.push(egal([['PATCH', 'repas_lignes', { repas: 'soir', quantite: 1, kcal: 130, proteines: 2.7, glucides: 28, lipides: 0.3 }, '?id=eq.' + ID(4)]], d.ecritures.map(e => [e.methode, e.table, e.corps, e.filtres]), 'Enregistrer : 100 g au soir, valeurs figées à la nouvelle quantité'),
      egal(['Petit-déj 90 kcal', 'Soir 130 kcal'], await groupes(p), 'journal : la ligne passée au soir'));
    await ctx.close();
    // Anciens « autres sports » restés dans sport_jour : ignorés (l'évolution 053 les convertit en séances).
    d = base(); d.sport_jour = [{ id: ID(8), utilisateur: U, date: '2026-10-20', type: 'v2', heures: 1 }, { id: ID(9), utilisateur: U, date: '2026-10-20', type: 'm', heures: 0.5 }];
    ({ p, ctx } = await ouvrirN(d));
    pb.push(egal([ '2 117 kcal', 0 ], [await kcal(p), await p.locator('.nu-activites .nu-ligne').count()], 'sport_jour ignoré : ni besoin ni ligne du journal'));
    await ctx.close();

    // Sélecteur de jour : la veille, un repas oublié, puis retour à aujourd'hui.
    d = base();
    ({ p, ctx } = await ouvrirN(d));
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Lundi 19 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal([false, 1, 0, 'kcal | sous | 0 | Reste 2 117 kcal | Besoin 2 117 kcal'], [await p.locator('[data-act="lendemain"]').isDisabled(), await p.locator('[data-act="aujourdhui"]').count(), await p.locator('.nu-journal li').count(), (await jauges(p))[0]], 'veille : son journal (vide), jour suivant et « Aujourd\'hui » proposés'));
    pb.push(egal([true, true, 0], await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), j = r('.nu-jour'), t = r('.nu-jour-t'), d = r('[data-act="lendemain"]'), a = r('[data-act="aujourdhui"]');
      return [a.left >= d.right && Math.abs(a.top - d.top) < 2, Math.abs((t.left + t.right) / 2 - (j.left + j.right) / 2) < 2, document.querySelectorAll('.nu-auj, .mrt-lien[data-act="aujourdhui"]').length]; }), '« » » rond à droite de « › », jour centré, plus de lien « Aujourd\'hui »'));
    await ouvrirRepas(p);
    await p.click('.nu-aliment:has-text("Banane")'); await p.click('[data-act="ajouter"]');
    await p.waitForSelector('.nu-choix', { state: 'detached' });
    pb.push(egal('2026-10-19', d.ecritures.filter(e => e.table === 'repas_lignes').pop().corps.date, 'veille : l\'aliment ajouté va dans ce jour'));
    await fermerF(p);
    await p.click('[data-act="aujourdhui"]');
    await p.waitForFunction(() => /Mardi 20 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal(['Banane', 'Riz cuit · 200 g'], await lignes(p), 'retour à aujourd\'hui : son journal'));
    // Recherche dans mes aliments : sans accent ni pluriel.
    await ctx.route('https://world.openfoodfacts.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"products":[]}' }));
    await ouvrirRepas(p);
    await p.fill('.nu-recherche [name="q"]', 'oeufs'); await p.press('.nu-recherche [name="q"]', 'Enter');
    await p.waitForFunction(() => !/Recherche…/.test(document.querySelector('.nu-resultats').textContent));
    pb.push(egal(['Œuf · 1 pièce | 140 kcal'], await p.evaluate(() => [...document.querySelectorAll('.nu-resultats .nu-aliment')].map(x => [...x.children].map(c => c.textContent.replace(/\s+/g, ' ')).join(' | '))), 'recherche « oeufs » : mon aliment « Œuf »'));
    await ctx.close();

    // Séances du Calendrier : elles font l'activité (course à pied, renforcement) ; la fenêtre de séance du Calendrier pour les ajouter ou les modifier.
    const SEANCES = () => [
      { id: ID(6), utilisateur: U, date: '2026-10-20', type: 'run', libelle: 'Footing', duree_min: 60, distance_km: 10, intensite: null, faite: false, etat: 'acceptee', origine: 'saisie', course: null },
      { id: ID(7), utilisateur: U, date: '2026-10-20', type: 'renfo', libelle: 'Gainage', duree_min: 30, distance_km: null, intensite: null, faite: false, etat: 'acceptee', origine: 'saisie', course: null },
      { id: 'seance-ia', utilisateur: U, date: '2026-10-20', type: 'run', libelle: 'Proposition', duree_min: 60, distance_km: 12, intensite: null, faite: false, etat: 'proposee', origine: 'ia', course: null },
      { id: 'seance-19', utilisateur: U, date: '2026-10-19', type: 'run', libelle: 'Sortie oubliée', duree_min: 60, distance_km: 10, intensite: null, faite: false, etat: 'acceptee', origine: 'saisie', course: null },
      { id: 'seance-18', utilisateur: U, date: '2026-10-18', type: 'run', libelle: 'Footing de dimanche', duree_min: 45, distance_km: null, intensite: 'facile', faite: true, etat: 'acceptee', origine: 'saisie', course: null }];
    d = base(); d.seances = SEANCES();
    ({ p, ctx } = await ouvrirN(d));
    const activites = () => p.locator('.nu-activites .nu-ligne-nom').allTextContents().then(l => l.map(norm));
    pb.push(egal(['2 959 kcal', ['Footing · Course à pied · 1 h · 10 km', 'Gainage · Renforcement · 30 min']], [await kcal(p), await activites()], 'séances du jour : comptées (ACSM : 10 km en 1 h ; renforcement 3 MET), sans la proposition de l\'IA'));
    await ouvrirActivite(p);
    // Ajouter une séance : l'écran s'ouvre d'emblée (champs de la fenêtre du Calendrier), au jour de la page ; pas de page-liste (27 nov. 2026).
    d.ecritures.length = 0;
    pb.push(egal(['Ajouter une séance', false, '2026-10-20', 'Endurance', 0, 1], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.locator('.nu-feuille .nu-retour').isVisible(), await p.inputValue('.nu-feuille [name="date"]'), await p.inputValue('.nu-feuille [name="nom"]'), await p.locator('.cal-voile').count(), await p.locator('.mc-voile').count()],
      'Ajouter une séance : l\'écran de saisie d\'emblée dans la feuille, au jour de la page, sans fenêtre par-dessus'));
    // Même largeur et même hauteur d'un écran à l'autre ; le bouton qui valide en bas de la feuille.
    const cadre = () => p.evaluate(() => { const r = document.querySelector('.nu-feuille').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    const pied = () => p.evaluate(() => { const f = document.querySelector('.nu-feuille').getBoundingClientRect(), b = document.querySelector('.nu-feuille .mc-pied'); return !!b && Math.abs(b.getBoundingClientRect().bottom - f.bottom) < 2; });
    const vp0 = p.viewportSize();
    await p.setViewportSize({ width: 1280, height: 800 });
    const tailleSeance = await cadre();
    pb.push(egal([480, 640, true], [tailleSeance[0], tailleSeance[1], await pied()], 'ordinateur : feuille de 30 rem sur 40 rem, « Enregistrer » collé en bas'));
    await p.setViewportSize(vp0);
    {
      const vp = p.viewportSize();
      await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
      pb.push(egal([false, true, true, true], await p.evaluate(() => {
        const pan = document.querySelector('.nu-feuille').getBoundingClientRect(), champs = [...document.querySelector('.nu-feuille .cal-champs3').querySelectorAll('.mrt-champ')].map(c => Math.round(c.getBoundingClientRect().top));
        const b = document.querySelector('.nu-feuille .mc-pied').getBoundingClientRect();
        return [/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName), pan.width === innerWidth && pan.height === innerHeight, champs.length === 3 && champs.every(t => t === champs[0]), Math.abs(b.bottom - innerHeight) < 2];
      }), 'téléphone : aucun champ pris (pas de clavier), feuille plein écran, durée, distance et dénivelé alignés, « Enregistrer » en bas de l\'écran'));
      if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'seance-telephone.png') });
      await p.setViewportSize(vp);
    }
    await p.selectOption('.nu-feuille [name="nom"]', 'Fractionné'); await p.fill('.nu-feuille [name="duree"]', '40'); await p.fill('.nu-feuille [name="distance"]', '8');
    await p.click('.nu-feuille .mc-pied [type="submit"]');
    await p.waitForSelector('.nu-feuille .cal-seance', { state: 'detached' });
    await p.waitForFunction(() => /3\s539/.test(document.querySelector('.nu-kcal').textContent));
    await p.waitForFunction(() => /Fractionné/.test(document.querySelector('.nu-activites').textContent));
    pb.push(egal([['POST', 'seances', { course: null, date: '2026-10-20', type: 'run', libelle: 'Fractionné', duree_min: 40, distance_km: 8, intensite: 'intense', faite: false, ressenti: null, sensations: null, douleur: null, douleur_ou: null, commentaire: null }], '3 539 kcal', 0],
      [[d.ecritures[0].methode, d.ecritures[0].table, d.ecritures[0].corps], await kcal(p), await p.locator('.nu-feuille').count()], 'séance ajoutée : rangée dans le Calendrier, besoin recalculé (8 km en 40 min), feuille fermée, la séance au journal'));
    // Toucher une séance du journal : la feuille Activité s'ouvre sur cette séance ; Supprimer avec la question du site.
    d.ecritures.length = 0;
    await p.click('.nu-activites .nu-ligne:has-text("Gainage")');
    await p.waitForSelector('.nu-feuille .cal-seance');
    pb.push(egal(['Modifier la séance', 'Gainage'], [norm(await p.locator('#nu-feuille-titre').textContent()), await p.inputValue('.nu-feuille [name="nom"]')], 'toucher une séance : « Modifier la séance », dans la feuille'));
    await p.click('.nu-feuille [data-act="supprimer"]');
    await p.click('.mrt-dialogue [data-r="oui"]');
    await p.waitForSelector('.nu-feuille .cal-seance', { state: 'detached' });
    await p.waitForFunction(() => !/Gainage/.test(document.querySelector('.nu-activites').textContent));
    pb.push(egal(['DELETE', 'seances', '?id=eq.' + ID(7)], [d.ecritures[0].methode, d.ecritures[0].table, d.ecritures[0].filtres], 'séance supprimée dans le Calendrier depuis Nutrition'));
    // La veille : une séance non faite ne compte pas ; cochée « faite », elle compte.
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Lundi 19 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal(['2 117 kcal', ['Sortie oubliée · Course à pied · 1 h · 10 km'], 'non faite'], [await kcal(p), await activites(), norm(await p.locator('.nu-activites .nu-ligne-k').textContent())], 'la veille : la séance non faite ne compte pas'));
    d.ecritures.length = 0;
    await p.click('.nu-activites .nu-faite');
    await p.waitForSelector('.cal-feuille-retour'); await p.fill('.cal-feuille-retour .cal-curseur', '4'); await p.click('.cal-feuille-retour .mc-pied .is-principal');
    await p.waitForFunction(() => !document.querySelector('.cal-feuille-retour form'));
    if (await p.locator('.cal-feuille-retour').count()) { await p.click('.cal-feuille-retour [data-fermer]'); await p.waitForSelector('.cal-feuille-retour', { state: 'detached' }); }
    await p.waitForFunction(() => /2\s854/.test(document.querySelector('.nu-kcal').textContent));
    pb.push(egal([['PATCH', 'seances', { faite: true }, '?id=eq.seance-19'], '2 854 kcal'], [[d.ecritures[0].methode, d.ecritures[0].table, d.ecritures[0].corps, d.ecritures[0].filtres], await kcal(p)], 'cochée « faite » : rangée dans le Calendrier, elle compte'));
    // Sans distance : la vitesse vient de l'intensité et de la VMA ; sans VMA, 9,5 km/h.
    await p.click('[data-act="veille"]');
    await p.waitForFunction(() => /Dimanche 18 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal('2 645 kcal', await kcal(p), 'sans distance ni VMA : 9,5 km/h'));
    await ctx.close();
    d = base(); d.seances = SEANCES(); d.profil_entrainement = [{ utilisateur: d.profils[0].id, vma: 15 }]; // la VMA de Mon profil
    ({ p, ctx } = await ouvrirN(d));
    await p.click('[data-act="veille"]'); await p.waitForFunction(() => /Lundi/.test(document.querySelector('.nu-jour-t').textContent));
    await p.click('[data-act="veille"]'); await p.waitForFunction(() => /Dimanche 18 octobre/.test(document.querySelector('.nu-jour-t').textContent));
    pb.push(egal('2 657 kcal', await kcal(p), 'sans distance, VMA 15 : facile, 65 % de la VMA'));
    await ctx.close();

    // Bloc d'En un coup d'œil : deuxième, quand Nutrition est dans le menu ; bilan, trois jauges simplifiées sur une ligne, lien « Détail → ».
    d = base(); d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Nutrition'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    await p.waitForSelector('.nu-ac-bilan');
    if (CAPTURES) await p.locator('[data-bloc="nutrition"]').screenshot({ path: path.join(DOSSIER, 'captures', 'accueil-nutrition.png') });
    pb.push(egal('nutrition', await p.evaluate(() => document.querySelectorAll('[data-bloc]:not([data-bloc="premiers"])')[2].dataset.bloc), 'Accueil : le bloc Nutrition en deuxième position (après « Aujourd\'hui » et la prochaine course)'),
      egal(['350 / 2 117 kcal', ['p|sous|6 g|Reste 92 g', 'g|sous|76 g|Reste 189 g', 'l|sous|1 g|Reste 58 g']],
        [norm(await p.locator('.nu-ac-bilan').textContent()), await p.evaluate(() => [...document.querySelectorAll('.nu-ac-anneaux .nu-jauge')].map(j => [j.dataset.jauge, j.dataset.etat, j.querySelector('.nu-anneau-v').textContent, j.querySelector('.nu-jauge-reste').textContent].join('|').replace(/\s+/g, ' ')))], 'Accueil : bilan du jour, puis protéines, glucides, lipides en anneaux avec « Reste »'),
      egal([0, 1], await p.evaluate(() => { const t = [...document.querySelectorAll('.nu-ac-anneaux .nu-jauge')].map(j => Math.round(j.getBoundingClientRect().top)); return [t[2] - t[0], new Set(t).size]; }), 'Accueil : les trois anneaux sur une ligne, téléphone compris'),
      egal(0, await p.locator('[data-bloc="nutrition"] .mrt-pastille').count(), 'Accueil : plus d\'aliments en pastilles'),
      egal(['Détail', 'nutrition.html', false], await p.evaluate(() => { const a = document.querySelector('[data-bloc="nutrition"] .ac-titre a'); return [a.textContent, a.getAttribute('href'), a.classList.contains('mrt-btn')]; }), 'Accueil : « Détail → », lien de titre comme « Feuille de route → »'),
      egal(false, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Accueil : pas de débordement horizontal'));
    await ctx.close();
    d = base();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    pb.push(egal(0, await p.locator('[data-bloc="nutrition"]').count(), 'Accueil : pas de bloc Nutrition quand le module n\'est pas au menu'));
    await ctx.close();
    d = base(); d.preferences[0].modules = ['En un coup d\'œil', 'Nutrition']; d.profils[0].poids = null;
    ({ p, ctx } = await ouvrir(nav, 'index.html', 390, d));
    pb.push(egal('Complète ton profil sur la page Nutrition.', norm(await p.locator('[data-bloc="nutrition"] .ac-vide').textContent()), 'Accueil : profil incomplet'));
    await ctx.close();
    // Saisies rapides d'En un coup d'œil : ?ajout=repas ou ?ajout=activite ouvre la feuille d'emblée, l'adresse est nettoyée.
    for (const [q, sel] of [['repas', '.nu-feuille .nu-source, .nu-feuille .nu-recherche'], ['activite', '.nu-feuille .cal-seance']]) {
      const o = await ouvrir(nav, 'nutrition.html?ajout=' + q, 1200, base(), {}, {});
      await o.p.waitForSelector('.nu-feuille ' + (q === 'repas' ? '.nu-ajout' : '.cal-seance'));
      pb.push(egal([1, false], [await o.p.locator('.nu-feuille').count(), /ajout=/.test(o.p.url())], '?ajout=' + q + ' : la feuille s\'ouvre aussitôt, adresse nettoyée'));
      await o.ctx.close();
    }
    return pb;
  },
};
