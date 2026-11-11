// ===== Besoin du jour : calculatrice de Nutrition =====
//
// Fonctions pures, sans accès à la base ni à la page : docs/module-nutrition-specification.md, § 3.
// Dans le navigateur : window.mrtBesoin ; dans Node (banc d'essai) : module.exports.
//   mrtBesoin.manquants(profil)           champs du profil qui manquent pour calculer
//   mrtBesoin.calculer(profil, jour)      besoin du jour, ou null si le profil est incomplet
//   mrtBesoin.phaseDuJour(joursAvant)     phase d'après le nombre de jours avant la course cap
//   profil : { sexe: 'femme'|'homme', naissance: 'AAAA-MM-JJ', poids (kg), taille (cm), activite }
//   jour   : { date: 'AAAA-MM-JJ', sports: [{ type, heures }], phase }
(function () {
  // Niveau d'activité hors sport : multiplie le métabolisme de base.
  const ACTIVITES = {
    sedentaire: { libelle: 'Sédentaire · majoritairement assis', coef: 1.2 },
    peu: { libelle: 'Peu actif · bureau avec déplacements', coef: 1.3 },
    actif: { libelle: 'Actif · majoritairement debout', coef: 1.45 },
    tres: { libelle: 'Très actif · en mouvement toute la journée', coef: 1.6 }
  };

  // Sports : dépense = MET × poids (kg) × heures. seance : course à pied ou renforcement, qui viennent des séances du
  // Calendrier (plus proposés dans Nutrition ; gardés pour relire un sport du jour saisi avant).
  const SPORTS = {
    j8: { libelle: 'Jogging à 8 km/h (7 min/km)', met: 8, seance: true },
    j95: { libelle: 'Jogging à 9,5 km/h (6 min/km)', met: 10, seance: true },
    j13: { libelle: 'Jogging à 13 km/h (4,5 min/km)', met: 13.5, seance: true },
    cross: { libelle: 'Jogging (cross)', met: 9, seance: true },
    jm: { libelle: 'Jogging / marche', met: 6, seance: true },
    m: { libelle: 'Marche', met: 3 },
    m55: { libelle: 'Marche (+5,5 km/h)', met: 4 },
    muscu: { libelle: 'Renforcement', met: 3, seance: true },
    crossfit: { libelle: 'Crossfit', met: 9 },
    v1: { libelle: 'Vélo (promenade)', met: 5 },
    v2: { libelle: 'Vélo (19 à 22 km/h)', met: 7 },
    v3: { libelle: 'Vélo (22 à 26 km/h)', met: 10 },
    n1: { libelle: 'Natation récréative', met: 6 },
    n2: { libelle: 'Natation (intensité modérée à élevée)', met: 9 }
  };

  // Phases : part des calories en glucides et en lipides (en %).
  const PHASES = {
    train: { libelle: 'Entraînement', g: [50, 60], l: [25, 35] },
    prep: { libelle: 'Avant-course', g: [50, 60], l: [25, 35] },
    carbo: { libelle: 'Carbo-loading', g: [65, 75], l: [15, 25] },
    veille: { libelle: 'Veille de course', g: [55, 65], l: [15, 25] }
  };

  const PROTEINES_PAR_KG = [1.4, 2];

  // ----- Séances du Calendrier : la même échelle pour tous -----
  // Course à pied : équation de course de l'ACSM, MET = (0,2 × vitesse en m/min + 3,5) ÷ 3,5. La vitesse est celle de la
  // séance (distance ÷ durée) ; sans distance, la part de la VMA selon l'intensité ; sans VMA, 9,5 km/h.
  // Renforcement : 3 MET.
  const PART_VMA = { facile: 0.65, moderee: 0.75, intense: 0.85 };
  const VITESSE_PAR_DEFAUT = 9.5;
  const MET_RENFO = 3;
  const metCourse = kmh => (0.2 * (kmh * 1000 / 60) + 3.5) / 3.5;
  function vitesseSeance(s, vma) {
    const h = Number(s.duree_min) / 60, d = Number(s.distance_km);
    if (h > 0 && d > 0) return d / h;
    if (vma > 0 && PART_VMA[s.intensite]) return vma * PART_VMA[s.intensite];
    return VITESSE_PAR_DEFAUT;
  }
  // Une séance → { met, heures } pour le calcul ; null sans durée.
  function activiteSeance(s, vma) {
    const heures = Number(s.duree_min) / 60;
    if (!(heures > 0)) return null;
    return { met: s.type === 'renfo' ? MET_RENFO : metCourse(vitesseSeance(s, vma)), heures };
  }
  // Séances qui comptent un jour donné : pas les propositions de l'IA en attente ; un jour passé, les séances faites seulement.
  const seancesQuiComptent = (seances, jour, aujourdhui) => (seances || []).filter(s => s.date === jour && s.etat !== 'proposee' && (jour >= aujourdhui || s.faite));

  // La veille (J-1) l'emporte sur le carbo-loading (J-3 à J-1).
  function phaseDuJour(joursAvant) {
    if (joursAvant === null || joursAvant === undefined || joursAvant < 1) return 'train';
    if (joursAvant === 1) return 'veille';
    if (joursAvant <= 3) return 'carbo';
    if (joursAvant <= 14) return 'prep';
    return 'train';
  }

  function age(naissance, ref) {
    if (!naissance) return null;
    const b = new Date(naissance + 'T12:00:00');
    const r = ref ? new Date(ref + 'T12:00:00') : new Date();
    let a = r.getFullYear() - b.getFullYear();
    if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) a--;
    return a > 0 ? a : null;
  }

  // Le sexe doit être « femme » ou « homme » : le coefficient de la formule n'existe que pour ces deux cas.
  function manquants(p, ref) {
    p = p || {};
    const m = [];
    if (p.sexe !== 'femme' && p.sexe !== 'homme') m.push('sexe');
    if (!age(p.naissance, ref)) m.push('naissance');
    if (!(parseFloat(p.poids) > 0)) m.push('poids');
    if (!(parseFloat(p.taille) > 0)) m.push('taille');
    if (!ACTIVITES[p.activite]) m.push('activite');
    return m;
  }

  function calculer(p, jour) {
    jour = jour || {};
    if (manquants(p, jour.date).length) return null;
    const poids = parseFloat(p.poids), taille = parseFloat(p.taille), a = age(p.naissance, jour.date);
    const coef = p.sexe === 'femme' ? 0.963 : 1.083;
    // Métabolisme de base (Black et al.), en kcal par jour.
    const mb = coef * Math.pow(poids, 0.48) * Math.pow(taille / 100, 0.5) * Math.pow(a, -0.13) * (1000 / 4.1855);
    let sport = 0, heures = 0;
    (jour.sports || []).forEach(s => {
      const met = s.met != null ? s.met : SPORTS[s.type] ? SPORTS[s.type].met : null, h = parseFloat(s.heures) || 0;
      if (met > 0 && h > 0) { sport += met * poids * h; heures += h; }
    });
    const kcal = mb * ACTIVITES[p.activite].coef + sport;
    const phase = PHASES[jour.phase] ? jour.phase : 'train';
    const ph = PHASES[phase];
    return {
      age: a, mb, sport, heures, kcal, phase, phaseLibelle: ph.libelle,
      proteines: PROTEINES_PAR_KG.map(k => k * poids),
      glucides: ph.g.map(x => kcal * x / 100 / 4),
      lipides: ph.l.map(x => kcal * x / 100 / 9)
    };
  }

  const api = { ACTIVITES, SPORTS, PHASES, phaseDuJour, age, manquants, calculer, metCourse, vitesseSeance, activiteSeance, seancesQuiComptent, PART_VMA, VITESSE_PAR_DEFAUT, MET_RENFO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.mrtBesoin = api;
})();
