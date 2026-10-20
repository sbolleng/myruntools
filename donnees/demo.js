// ===== Profil de démonstration (trail), écrit en dur =====
// En attendant la base de données et les Préférences utilisateur : course de
// l'en-tête, objectif cible, prochaine course et modules du menu.
window.MRT_PROFIL = {
  theme: 'trail',
  objectif: {
    nom: 'La Boffi Fifty',
    distance: 46.5,
    dplus: 2005,
    date: '2027-10', // date estimée : mois seul
    dIciLa: 6,
    cible: null
  },
  prochaine: { nom: "Rock'Angel", date: '2026-12-05' },
  modules: [
    { nom: 'Cette semaine' },
    { nom: 'Objectif' },
    { nom: 'Nutrition' },
    { nom: 'Palmarès', page: 'palmares.html' },
    { nom: 'Profil' },
    { nom: 'Guide' }
  ]
};
