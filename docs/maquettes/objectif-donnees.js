// ===== Maquettes Objectif : données fictives et outils communs =====
// Courses inventées pour la maquette ; la vraie page lira la liste de l'utilisateur.
(function () {
  const COURSES = [
    { id: 1, course: 'Trail du Lac', parcours: 'Le Tour du Lac', lieu: 'Mont-Clair', format: 'Trail court', date: '2026-11-15', heure: '09:00',
      distance: 24, dplus: 650, dmoins: 650, statut: 'confirmee', role: 'preparatoire', objectif: '2:45', inscrit: true, dossard: '412', prix: 32,
      pourquoi: 'Reprise en compétition après la coupure, sur un format court.', logistique: 'Retrait du dossard sur place dès 7 h 30.', lien: '#' },
    { id: 2, course: 'Corrida de Noël', lieu: 'Ville-Haute', format: 'Route', date: '2026-12-13', heure: '18:30',
      distance: 10, dplus: 40, statut: 'confirmee', role: 'plaisir', inscrit: false, ouverture: '2026-11-01', lien: '#' },
    { id: 3, course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'Trail long', date: '2027-03-07', heure: '07:30',
      distance: 45, dplus: 2100, dmoins: 2100, statut: 'confirmee', role: 'objectif_intermediaire', objectif: '6:30', inscrit: true, dossard: '1287', prix: 58,
      pourquoi: 'Répétition générale du matériel et de la nutrition sur un format long, six mois avant l\'objectif.',
      strategie: 'Partir prudemment jusqu\'au premier ravitaillement (km 12). Marcher dans les montées raides, relancer dans la dernière descente.',
      logistique: 'Retrait des dossards la veille de 15 h à 19 h. Navette depuis le parking du stade à 6 h 30.',
      description: 'Boucle par les crêtes et les gorges, trois ravitaillements.', lien: '#', inscription: '#', lien_resultats: '#' },
    { id: 4, course: 'Trail des Cimes', lieu: 'Haut-Val', format: 'Trail long', date: '2027-05-30', distance: 42, dplus: 2500,
      statut: 'option', role: 'preparatoire', groupe: 'Printemps 2027', inscrit: false, ouverture: '2027-01-10', lien: '#' },
    { id: 5, course: 'Ultra du Plateau', parcours: 'Le 55', lieu: 'Plaine-Neuve', format: 'Trail long', date: '2027-06-26', distance: 55, dplus: 2800,
      statut: 'option', role: 'preparatoire', groupe: 'Printemps 2027', inscrit: false, lien: '#' },
    { id: 6, course: 'Trail de la Forêt', lieu: 'Bois-Joli', format: 'Trail court', date: '2027-07', approx: true, distance: 30, dplus: 1200,
      statut: 'option', role: 'preparatoire', inscrit: false },
    { id: 7, course: 'Trail des Crêtes', parcours: 'Le Grand Tour', lieu: 'Mont-Clair', format: 'Trail ultra', date: '2027-08-28', heure: '05:00',
      distance: 60, dplus: 3500, dmoins: 3500, statut: 'confirmee', role: 'objectif', objectif: 'Finisher', inscrit: true, dossard: '88', prix: 95,
      pourquoi: 'L\'objectif de la saison.', strategie: 'Rester sous 150 bpm jusqu\'au km 40.', lien: '#', inscription: '#' }
  ];
  const MAINTENANT = new Date(2026, 9, 20, 10, 0, 0); // date figée, comme le banc d'essai

  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const ROLES = { preparatoire: 'Préparatoire', plaisir: 'Plaisir', objectif_intermediaire: 'Objectif intermédiaire', objectif: 'Course objectif' };
  const nf = new Intl.NumberFormat('fr-FR');
  const parse = c => { const p = c.date.split('-').map(Number); const h = (c.heure || '00:00').split(':').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1, h[0], h[1]); };
  const jour = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  // Étapes : un groupe d'options compte pour une seule étape, à la date de sa première candidate.
  function etapes() {
    const res = [];
    COURSES.forEach(c => {
      if (c.groupe) {
        const g = res.find(e => e.groupe === c.groupe);
        if (g) { g.candidates.push(c); return; }
        res.push({ groupe: c.groupe, candidates: [c] });
      } else res.push({ course: c });
    });
    return res;
  }

  window.MQ = {
    COURSES, MAINTENANT, ROLES, nf, etapes,
    nom: c => c.course + (c.parcours ? ' · ' + c.parcours : ''),
    dateCourte: c => c.approx ? MOIS_LONG[+c.date.slice(5, 7) - 1] + ' ' + c.date.slice(0, 4) : +c.date.slice(8) + ' ' + MOIS[+c.date.slice(5, 7) - 1] + ' ' + c.date.slice(0, 4),
    dateLongue: c => {
      if (c.approx) return MOIS_LONG[+c.date.slice(5, 7) - 1] + ' ' + c.date.slice(0, 4) + ' (date à préciser)';
      const d = parse(c);
      return JOURS[d.getDay()] + ' ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS_LONG[d.getMonth()] + ' ' + d.getFullYear() + (c.heure ? ', ' + (+c.heure.slice(0, 2)) + ' h ' + c.heure.slice(3) : '');
    },
    jMoins: c => (c.approx ? null : Math.round((jour(parse(c)) - jour(MAINTENANT)) / 864e5)),
    rebours: c => {
      const ms = parse(c) - MAINTENANT, p = n => String(n).padStart(2, '0');
      return { j: Math.floor(ms / 864e5), hms: p(Math.floor(ms % 864e5 / 36e5)) + 'h ' + p(Math.floor(ms % 36e5 / 6e4)) + 'm ' + p(Math.floor(ms % 6e4 / 1e3)) + 's' };
    },
    // En-tête du site, dessiné par le vrai composant.
    entete: () => renderEnTete({
      racine: '../../',
      theme: new URLSearchParams(location.search).get('t'),
      maintenant: '2026-10-20',
      objectif: { nom: 'Trail des Crêtes', distance: 60, dplus: 3500, date: '2027-08-28', dIciLa: 5, cible: 'Finisher' },
      prochaine: { nom: 'Trail du Lac', date: '2026-11-15' },
      modules: [{ nom: 'Cette semaine' }, { nom: 'Objectif', page: 'docs/maquettes/objectif.html' }, { nom: 'Nutrition' }, { nom: 'Palmarès', page: 'palmares.html' }, { nom: 'Profil' }, { nom: 'Guide' }],
      courant: 'docs/maquettes/objectif.html'
    })
  };
})();
