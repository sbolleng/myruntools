# Composants partagés

Version 1.0 · 20 novembre 2026 · [Retour au sommaire](README.md)

Dossier `composants/` : chaque composant a son fichier `.js` et sa feuille de style. À lire au besoin seulement (la liste est sortie de `CLAUDE.md` pour l'alléger).

| Composant | Rôle |
| --- | --- |
| `accueil` | En un coup d'œil (page `index.html`) |
| `en-tete` | En-tête, menu, thèmes et éléments communs : boutons `mrt-btn` (`is-principal`, `is-danger`), `mrt-rond` (`is-fermer`), lien `mrt-lien`, pastille `mrt-pastille`, champ `mrt-champ` (`mrt-mdp` et son œil pour un mot de passe ; date en trois champs `mrtDateTrois`), section `mrt-section`, déroulé `mrtDeroule` et `details.mrt-deroule` |
| `session`, `donnees` | Session et site partagé ; `donnees.js` lit les données de l'utilisateur connecté (courses, en-tête, menu) |
| `palmares` | Palmarès |
| `fiche-course` | Fiche d'une course |
| `objectif`, `modale-course` | Page Saison et page d'une course en modale |
| `calendrier` | Vues Semaine (par défaut), Mois (une ligne par semaine), 3 mois, 6 mois et Année au menu « Vue » ; bouton « Légende » ; bouton « Phases » |
| `export-plan` | Export du plan en page à imprimer ou PDF (Calendrier et Mon plan) |
| `trace` | Tracé GPX d'une course : import, carte Leaflet, profil, téléchargement |
| `besoin`, `profil-champs`, `nutrition` | Besoin du jour de Nutrition |
| `preparation` | Préparation d'une course : plan, phases, séances, plan de préparation `planSaison` (partagé par le Calendrier, la page d'une course et Nutrition) ; avis des courses et préparatoire conseillée |
| `plan-saison` | Page Mon plan (`preparation.html`) |
| `plan-parcours` | Parcours « Construire mon plan » |
| `seances-ia` | Séances proposées par l'IA |
| `logistique` | Logistique d'une course : lecture sur la page de la course (`html`, `brancher`), saisie dans la fiche « Modifier la course » (`edition` : `valider`, `enregistrer`), « Ta course approche » d'En un coup d'œil (`approche`), « Mon matériel » de Mon profil (`materiel`) ; autocomplétion Photon, carte Leaflet |
| `strategie` | « Proposer une stratégie » sur la page d'une course (Objectif, § 3.10) : contexte envoyé à l'IA, tronçons du tracé, bouton, proposition et « OK » ; chargé partout où s'ouvre la page d'une course |
| `guide` | Guide (page `guide.html`, module facultatif en fin de menu : mise en page seulement) |
| `profil` | Mon profil (page `profil.html`) et feuille commune de Mon plan et Nutrition |
| `courses` | Cartes de toutes les courses avec filtres (Statut dont Repérée, Ouvertes, Année) |
| `graphique` | Graphiques dans le temps : difficulté d'Objectif, progression du Palmarès |
