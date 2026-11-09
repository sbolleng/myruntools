// ===== Préparation : séances proposées par l'IA =====
//
// docs/module-preparation-specification.md, § 6. Prépare le contexte d'un bloc de 4 semaines (sans nom de course ni nom de
// personne), appelle la fonction Supabase « proposer-seances », vérifie la proposition par les garde-fous (des règles, jamais
// l'IA) et la refait une fois si besoin ; deux échecs de suite ne comptent pas dans le plafond. L'affichage est dans plan-saison.js.
//   mrtSeancesIA.contexte(ctx, lundi), .gardeFous(reponse, ctx, lundi), .proposer(ctx, lundi), .restantes(ctx), .enAttente(ctx, lundi)
(function () {
  const P = window.mrtPreparation;
  const { iso, parse, addDays, lundiDe, longue, TYPES, NOM_PHASE } = P;
  const PLAFOND = 4, BLOC = 4;
  const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const ROLES = { objectif: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' };
  const numJour = j => ((parse(j).getDay() + 6) % 7) + 1; // 1 lundi … 7 dimanche
  // Semaine type du profil : une activité par jour (lundi … dimanche) ; un jour est disponible s'il n'est pas au repos.
  const ACTIVITE = { repos: 'repos', course: 'course', longue: 'sortie longue', renfo: 'renforcement' };
  const semaineType = pr => (Array.isArray(pr && pr.semaine_type) && pr.semaine_type.length === 7 ? pr.semaine_type : ['repos', 'repos', 'repos', 'repos', 'repos', 'repos', 'repos']);
  const prevuLe = (pr, j) => semaineType(pr)[numJour(j) - 1];
  const disponible = (pr, j) => prevuLe(pr, j) !== 'repos';
  const LIBELLES = {
    anciennete: { debut: 'débute', '1-3': '1 à 3 ans', '3-6': '3 à 6 ans', '6-10': '6 à 10 ans', '10+': 'plus de 10 ans' },
    volume_tranche: { inconnu: 'inconnue (rester prudent)', '0-20': '0 à 20 km', '20-40': '20 à 40 km', '40-60': '40 à 60 km', '60-80': '60 à 80 km', '80+': 'plus de 80 km' },
    sortie_tranche: { '-1h': 'moins de 1 h', '1h-1h30': '1 h à 1 h 30', '1h30-2h': '1 h 30 à 2 h', '2-3h': '2 à 3 h', '3h+': 'plus de 3 h' },
    terrain: { plat: 'pas de dénivelé', cotes: 'petites côtes (moins de 50 m de D+)', vallonne: 'vallonné (50 à 500 m de D+)', montagne: 'montagne (plus de 500 m de D+)' }
  };
  const sb = () => window.mrtSupabase;
  const ceMois = () => iso(new Date()).slice(0, 7);

  // Courses confirmées à venir du bloc, et repères de chaque jour.
  const coursesDuJour = (ctx, j) => ctx.courses.filter(c => c.statut === 'confirmee' && c.etat === 'a_venir' && c.date === j);
  const temps = s => (s == null ? null : (s >= 3600 ? Math.floor(s / 3600) + ' h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'));

  // Contexte envoyé à l'IA : la trame du bloc, les repères, les courses (rôle, format, distance, D+ ; jamais leur nom), le profil,
  // les séances des 4 semaines passées.
  function contexte(ctx, lundi) {
    const ps = P.planSaison(ctx), pr = ctx.profil || {}, fin = addDays(lundi, 7 * BLOC - 1);
    const semaines = [];
    for (let i = 0; i < BLOC; i++) {
      const l = addDays(lundi, 7 * i), x = P.phaseDe(ps, l), jours = [];
      for (let k = 0; k < 7; k++) {
        const j = addDays(l, k), rep = P.reperesDuJour(ps, j).map(r => r.type === 'allege' ? 'allégé (avant une course Préparatoire)' : r.type === 'repos' ? 'repos (veille d\'une course Plaisir)' : 'récupération (séances faciles seulement)');
        const cs = coursesDuJour(ctx, j).map(c => ({ role: ROLES[P.roleDe(c)] || c.role, format: c.formatLibelle || c.format, distance_km: c.distance != null ? Number(c.distance) : null, dplus_m: c.dplus != null ? Number(c.dplus) : null }));
        jours.push(Object.assign({ date: j, jour: NOMS_JOURS[parse(j).getDay()], disponible: disponible(pr, j), prevu: ACTIVITE[prevuLe(pr, j)] }, rep.length ? { reperes: rep } : {}, cs.length ? { course: cs } : {}));
      }
      semaines.push({ lundi: l, phase: x ? NOM_PHASE[x.phase] : 'Entretien', semaine_de_saison: x && x.saison ? (x.saison.semaines.findIndex(w => w.lundi === l) + 1) + ' sur ' + x.saison.semaines.length : null, jours });
    }
    const sx = ps.saisons.find(s => s.jourJ >= lundi);
    const historique = ctx.seances.filter(s => s.date >= addDays(lundi, -28) && s.date < lundi).sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(s => ({ date: s.date, type: s.type, libelle: s.libelle, duree_min: s.duree_min == null ? null : s.duree_min, distance_km: s.distance_km == null ? null : Number(s.distance_km), intensite: s.intensite || null, faite: !!s.faite }));
    return {
      aujourd_hui: iso(new Date()), bloc: { debut: lundi, fin },
      objectif_de_saison: sx ? { date: sx.jourJ, format: sx.course.formatLibelle || sx.course.format, distance_km: Number(sx.course.distance) || null, dplus_m: Number(sx.course.dplus) || null } : null,
      semaines,
      profil: {
        je_cours_depuis: LIBELLES.anciennete[pr.anciennete] || null, distance_par_semaine: LIBELLES.volume_tranche[pr.volume_tranche] || null,
        plus_longue_sortie_recente: LIBELLES.sortie_tranche[pr.sortie_tranche] || null,
        semaine_type: semaineType(pr).map((a, n) => ({ jour: NOMS_JOURS[(n + 1) % 7], activite: ACTIVITE[a] })),
        jours_disponibles: semaineType(pr).map((a, n) => (a !== 'repos' ? NOMS_JOURS[(n + 1) % 7] : null)).filter(Boolean),
        jour_sortie_longue: semaineType(pr).indexOf('longue') >= 0 ? NOMS_JOURS[(semaineType(pr).indexOf('longue') + 1) % 7] : null,
        renforcement_par_semaine: semaineType(pr).filter(a => a === 'renfo').length,
        seance_max_min: pr.seance_max_min && pr.seance_max_min < 1440 ? pr.seance_max_min : null,
        repere_allure: pr.allure_type === 'vma' ? 'VMA ' + pr.vma + ' km/h' : pr.allure_type === '10km' ? '10 km en ' + temps(pr.temps_10km_s) : pr.allure_type === 'semi' ? 'semi-marathon en ' + temps(pr.temps_semi_s) : 'inconnu (rester prudent)',
        terrains: LIBELLES.terrain[pr.terrain] || null, niveau_renforcement: pr.renfo_niveau || null, fc_max: pr.fc_max == null ? null : pr.fc_max, points_fragiles: pr.fragiles || null
      },
      historique
    };
  }

  // Garde-fous (spécification, § 6) : rend la liste des règles non respectées, en phrases courtes (renvoyées à l'IA pour corriger).
  function gardeFous(reponse, ctx, lundi) {
    const err = [], pr = ctx.profil || {}, ps = P.planSaison(ctx), fin = addDays(lundi, 7 * BLOC - 1);
    const seances = ((reponse && reponse.semaines) || []).flatMap(w => w.seances || []);
    if (!seances.length) err.push('aucune séance proposée');
    const vol = {};
    seances.forEach(s => {
      const j = String(s.date || ''), quand = /^\d{4}-\d\d-\d\d$/.test(j) ? longue(j) : '« ' + j + ' »';
      if (!/^\d{4}-\d\d-\d\d$/.test(j) || j < lundi || j > fin) return err.push(quand + ' : date hors du bloc (' + lundi + ' au ' + fin + ')');
      if (!TYPES[s.type]) err.push(quand + ' : type inconnu');
      if (!String(s.libelle || '').trim() || String(s.libelle).length > 100) err.push(quand + ' : libellé vide ou de plus de 100 caractères');
      if (!Number.isInteger(s.duree_min) || s.duree_min < 1 || s.duree_min > 1440) err.push(quand + ' : durée invalide');
      if (!disponible(pr, j)) err.push(quand + ' : jour de repos dans la semaine type, aucune séance');
      if (coursesDuJour(ctx, j).length) err.push(quand + ' : jour de course, aucune séance');
      const reps = P.reperesDuJour(ps, j);
      if (reps.some(r => r.type === 'repos')) err.push(quand + ' : jour de repos (veille de course), aucune séance');
      if (reps.some(r => r.type === 'recup') && s.intensite !== 'facile') err.push(quand + ' : jour de récupération, séance facile seulement');
      if (pr.seance_max_min && pr.seance_max_min < 1440 && s.duree_min > pr.seance_max_min) err.push(quand + ' : séance de plus de ' + pr.seance_max_min + ' min');
      const l = lundiDe(j); vol[l] = (vol[l] || 0) + (Number(s.duree_min) || 0);
    });
    // Affûtage : volume réduit de 41 à 60 % par rapport aux 3 semaines d'avant (séances de la proposition, ou déjà saisies avec leur durée).
    const volume = l => (vol[l] != null && l >= lundi ? vol[l] : ctx.seances.filter(s => lundiDe(s.date) === l && s.duree_min).reduce((t, s) => t + s.duree_min, 0));
    const affutage = [];
    for (let i = 0; i < BLOC; i++) { const l = addDays(lundi, 7 * i), x = P.phaseDe(ps, l); if (x && x.phase === 'affutage') affutage.push(l); }
    if (affutage.length) {
      const avant = [1, 2, 3].map(k => volume(addDays(affutage[0], -7 * k)));
      if (avant.every(v => v > 0)) {
        const moy = avant.reduce((a, b) => a + b, 0) / 3;
        affutage.forEach(l => { const r = volume(l) / moy; if (r < 0.40 || r > 0.59) err.push('semaine d\'affûtage du ' + longue(l) + ' : volume à ' + Math.round(r * 100) + ' % des 3 semaines d\'avant, il faut entre 40 et 59 %'); });
      }
    }
    return err;
  }

  // Propositions du mois (essai 1, sauf les échecs) ; il en reste PLAFOND moins celles-là.
  const restantes = ctx => Math.max(0, PLAFOND - (ctx.propositions || []).filter(x => x.essai === 1 && x.statut !== 'echec' && String(x.cree).slice(0, 7) === ceMois()).length);
  // Proposition en attente de validation pour ce bloc : la dernière « brute ».
  const enAttente = (ctx, lundi) => (ctx.propositions || []).filter(x => x.bloc === lundi && x.statut === 'brute').sort((a, b) => (a.cree < b.cree ? 1 : -1))[0] || null;
  const statut = (id, s) => sb().from('propositions').update({ statut: s }).eq('id', id);

  // Appel de la fonction ; rend { data } ou { erreur : message pour l'utilisateur }.
  async function appel(corps) {
    const { data, error } = await sb().functions.invoke('proposer-seances', { body: corps });
    if (!error) return { data };
    let code = null, prochaine = null;
    try { const j = await error.context.json(); code = j.code; prochaine = j.prochaine; } catch (e) { /* réponse sans corps lisible */ }
    if (code === 'reserve') return { erreur: 'Réservé aux comptes pilotes pour l\'instant.' };
    if (code === 'plafond') return { erreur: 'Plus de proposition ce mois-ci : la prochaine le ' + (prochaine ? longue(prochaine) : '1er du mois prochain') + '.' };
    console.warn(error);
    return { erreur: 'Proposition impossible pour l\'instant, réessaie plus tard.' };
  }

  // Une proposition : essai 1, garde-fous, essai 2 avec les corrections si besoin ; deux échecs : rien n'est décompté.
  async function proposer(ctx, lundi) {
    const cx = contexte(ctx, lundi);
    const r1 = await appel({ bloc: lundi, essai: 1, contexte: cx });
    if (r1.erreur) return { message: r1.erreur };
    const e1 = gardeFous(r1.data.reponse, ctx, lundi);
    if (!e1.length) return { id: r1.data.id, reponse: r1.data.reponse };
    const r2 = await appel({ bloc: lundi, essai: 2, contexte: cx, corrections: e1 });
    if (r2.erreur) { await statut(r1.data.id, 'echec'); return { message: r2.erreur }; }
    const e2 = gardeFous(r2.data.reponse, ctx, lundi);
    if (!e2.length) { await statut(r1.data.id, 'invalide'); return { id: r2.data.id, reponse: r2.data.reponse }; }
    await statut(r1.data.id, 'echec'); await statut(r2.data.id, 'echec');
    console.warn('garde-fous', e2);
    return { message: 'Proposition impossible à vérifier, réessaie plus tard.' };
  }

  // Séances retenues : écrites avec leur origine (IA) ; la proposition passe en « acceptée ».
  async function accepter(ctx, prop, lundis) {
    const lignes = prop.reponse.semaines.filter(w => lundis.includes(w.lundi)).flatMap(w => w.seances).map(s => ({
      date: s.date, type: s.type, libelle: String(s.libelle).trim().slice(0, 100), duree_min: s.duree_min,
      distance_km: Number(s.distance_km) > 0 ? Math.round(Number(s.distance_km) * 10) / 10 : null, intensite: s.intensite, origine: 'ia', etat: 'acceptee', course: null }));
    if (lignes.length) { const { error } = await sb().from('seances').insert(lignes); if (error) return error; }
    const { error } = await statut(prop.id, 'acceptee');
    return error || null;
  }

  async function lirePropositions(ctx) {
    const { data, error } = await sb().from('propositions').select('id, cree, bloc, essai, statut, reponse');
    if (error) console.warn(error);
    ctx.propositions = data || [];
  }

  window.mrtSeancesIA = { PLAFOND, contexte, gardeFous, restantes, enAttente, proposer, accepter, abandonner: prop => statut(prop.id, 'abandonnee'), lirePropositions };
})();
