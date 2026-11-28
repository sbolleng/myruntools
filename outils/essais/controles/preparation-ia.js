// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
