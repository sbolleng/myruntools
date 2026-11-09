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
        jours.push(Object.assign({ date: j, jour: NOMS_JOURS[parse(j).getDay()], disponible: (pr.jours || []).includes(numJour(j)) }, rep.length ? { reperes: rep } : {}, cs.length ? { course: cs } : {}));
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
        annees_de_pratique: pr.annees, volume_hebdomadaire: pr.volume != null ? pr.volume + ' ' + (pr.volume_unite === 'h' ? 'h' : 'km') : null,
        plus_longue_sortie_recente: pr.sortie_longue != null ? pr.sortie_longue + ' ' + (pr.sortie_longue_unite === 'h' ? 'h' : 'km') : null,
        jours_disponibles: (pr.jours || []).map(n => NOMS_JOURS[n % 7]), jour_sortie_longue: pr.jour_long ? NOMS_JOURS[pr.jour_long % 7] : null,
        seance_max_min: pr.seance_max_min == null ? null : pr.seance_max_min, semaine_max_h: pr.semaine_max_h == null ? null : Number(pr.semaine_max_h),
        vma_kmh: pr.vma == null ? null : Number(pr.vma), temps_10km: temps(pr.temps_10km_s), temps_semi: temps(pr.temps_semi_s), fc_max: pr.fc_max == null ? null : pr.fc_max,
        renforcement_par_semaine: pr.renfo == null ? null : pr.renfo, moyens: pr.moyens || [], points_fragiles: pr.fragiles || null
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
      if (!(pr.jours || []).includes(numJour(j))) err.push(quand + ' : jour non disponible');
      if (coursesDuJour(ctx, j).length) err.push(quand + ' : jour de course, aucune séance');
      const reps = P.reperesDuJour(ps, j);
      if (reps.some(r => r.type === 'repos')) err.push(quand + ' : jour de repos (veille de course), aucune séance');
      if (reps.some(r => r.type === 'recup') && s.intensite !== 'facile') err.push(quand + ' : jour de récupération, séance facile seulement');
      if (pr.seance_max_min && s.duree_min > pr.seance_max_min) err.push(quand + ' : séance de plus de ' + pr.seance_max_min + ' min');
      const l = lundiDe(j); vol[l] = (vol[l] || 0) + (Number(s.duree_min) || 0);
    });
    if (pr.semaine_max_h) Object.keys(vol).forEach(l => { if (vol[l] > pr.semaine_max_h * 60) err.push('semaine du ' + longue(l) + ' : plus de ' + String(pr.semaine_max_h).replace('.', ',') + ' h'); });
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
