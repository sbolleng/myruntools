# Spécification générale

Version 0.2 · 20 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit ce qui est commun à toute l'application : sa structure, son en-tête, son menu, ses thèmes, le catalogue des modules, les préférences de l'utilisateur et la façon dont les données sont gérées. Chaque module a ensuite sa propre spécification ; l'apparence (couleurs, typographies, tailles) est décrite dans le [document de design](design.md).

## 1. Principe

L'application est une boîte à outils pour coureurs, organisée en **modules**. Un module correspond à un onglet du menu et à une page ; il est développé une seule fois et partagé par tous les utilisateurs, tandis que le contenu reste propre à chacun. Chaque utilisateur choisit les modules utiles à sa pratique, et seuls ceux-ci apparaissent dans son menu.

## 2. Utilisateurs

Deux profils pilotes au lancement :

| Profil | Pratique | Thème par défaut |
| --- | --- | --- |
| Pilote trail | Trail | Bleu et orange |
| Pilote route | Route | Vert et rose |

L'application est conçue pour accueillir d'autres coureurs plus tard ; ajouter un utilisateur revient à créer son compte et ses préférences, sans toucher au code des modules.

## 3. Structure commune

Chaque page suit le même gabarit, de haut en bas :

1. **En-tête** (§ 4), identique sur toutes les pages.
2. **Menu** (§ 5).
3. **Contenu du module**.

L'en-tête et le menu forment un bloc commun, écrit une seule fois et repris par chaque page. Chaque module a sa propre page : changer d'onglet, c'est ouvrir la page du module.

Règles transverses :

- **Priorité au téléphone** : la mise en page est conçue d'abord pour un écran de 390 px de large, puis élargie. Seuil de bascule téléphone / ordinateur : 600 px.
- **Rechargement automatique** : quand une nouvelle version du site est en ligne, la page se recharge d'elle-même, une seule fois par version (utile sur iPhone, qui garde les pages en cache).
- **Affichage automatique** : un bloc qui dépend de données (météo, suivi en course, graphique) apparaît de lui-même dès que ces données existent ; l'utilisateur n'a rien à activer. Chaque bloc est décrit dans la spécification de son module.
- **Aucune donnée inventée** : un champ sans valeur n'est pas affiché, ou affiche « — ».

## 4. En-tête

L'en-tête présente l'objectif de l'utilisateur : la course qu'il a choisie pour l'en-tête, dans les Préférences utilisateur ou en la marquant sur la page Objectif ; ses chiffres clés et le temps qui reste.

### Contenu

| Élément | Règle |
| --- | --- |
| Titre | « Cap sur » sur une ligne, puis le nom officiel de la course objectif, en couleur d'accent, sur la ligne suivante |
| Indicateurs | Une valeur, avec son libellé dessous. Dans l'ordre : Distance, D+ (trail seulement), Date, Objectif, D'ici là |
| Compte à rebours | Nombre de jours en grand, « jours » dessous, puis heures, minutes et secondes ; mis à jour chaque seconde |
| Prochaine course | Sous le compte à rebours : « prochaine course · nom · J-n » |
| Nom de l'application | « MyRunTools », en petites capitales, en haut à droite, à la hauteur du titre |
| Engrenage ⚙️ | À droite du nom de l'application ; ouvre les Préférences utilisateur (§ 8) |
| Filet | Barre fine aux couleurs du thème, sous l'en-tête |

### Indicateurs

| Libellé | Valeur | Source |
| --- | --- | --- |
| Distance | Distance officielle de la course objectif | Course objectif |
| D+ | Dénivelé positif officiel ; indicateur affiché seulement pour un trail | Course objectif |
| Date | Date de la course objectif | Course objectif |
| Objectif | Texte libre (« Finisher », « Moins de 4 h »…) | Préférences utilisateur |
| D'ici là | Nombre de courses prévues avant l'objectif | Calculé : nombre de blocs de course de la page Objectif |

### Formats

- **Distance** : kilomètres, virgule décimale, espace avant l'unité, autant de décimales que la distance officielle (« 60 km », « 42,195 km »).
- **D+** : mètres, espace pour les milliers (« 3 500 m »).
- **Date** : jour, mois en toutes lettres, année (« 30 août 2029 »). Jour inconnu : mois et année seulement (« août 2029 »).
- **D'ici là** : nombre suivi de « course » ou « courses » (« 1 course », « 12 courses »).
- **J-n** : nombre de jours calendaires jusqu'à la prochaine course.

### Règles

- **Compte à rebours** : jusqu'au jour de la course objectif, à minuit. Si seul le mois est connu, jusqu'au premier jour du mois.
- **Prochaine course** : la première course à venir de la page Objectif.
- **En attendant les modules concernés** : course de l'en-tête, objectif et prochaine course sont écrits en dur dans la page de démonstration.

### Cas limites

- Aucune course à venir : la ligne « prochaine course » est masquée.
- Aucune course avant l'objectif : D'ici là affiche « — ».
- Objectif passé : le compteur affiche « Course courue » jusqu'à la définition d'un nouvel objectif.
- Valeur absente (pas d'objectif renseigné, distance inconnue) : l'indicateur affiche « — ».

## 5. Menu

- Une barre d'onglets sous l'en-tête, un onglet par module choisi par l'utilisateur, dans l'ordre qu'il a choisi (§ 8). L'onglet de la page ouverte est mis en avant.
- Sur téléphone, la barre défile horizontalement ; elle reste visible en haut de l'écran quand on fait défiler la page.

## 6. Thèmes

- Chaque utilisateur choisit un thème parmi ceux proposés ; un thème ne change que les couleurs, jamais la mise en page.
- Trois thèmes : **Bleu et orange**, **Vert et rose**, et **Violet et turquoise**, réservé aux essais. Valeurs dans le [document de design](design.md).
- Aucune couleur libre : l'utilisateur choisit un thème, pas des couleurs une à une.

## 7. Catalogue des modules

| Module | Rôle | Jalon |
| --- | --- | --- |
| Objectif | Feuille de route jusqu'à la course objectif ([spécification](module-objectif-specification.md)) | 1 |
| Nutrition | Journal alimentaire, cibles du jour, calcul du besoin, conseils | 1 |
| Courses à surveiller | Veille des courses envisagées : dates, ouverture des inscriptions, index UTMB | 2 |
| Guide | Articles et fiches pratiques, publics ou privés | 2 |
| Profil | Données du coureur : état civil, poids, taille, pointure, zones d'entraînement, records | 2 |
| Palmarès | Historique des courses et des performances ([spécification](module-palmares-specification.md)) | 2 |
| Cette semaine | Synthèse des sept prochains jours, assemblée à partir des autres modules | 2 |
| Calculatrice | Allure, vitesse, temps de passage, VMA, km-effort, pente, ravitaillement | À positionner |
| Logistique | Transport, hébergement, retrait des dossards, horaires | À positionner |
| Matériel | Chaussures et leur usure, inventaire, matériel obligatoire, listes de sac | À positionner |

Pour que Cette semaine fonctionne, chaque module devra pouvoir dire ce qui compte dans les sept prochains jours.

## 8. Préférences utilisateur

Page ouverte par l'engrenage de l'en-tête, hors du menu. Elle rassemble les réglages du site ; les données du coureur vont dans Profil, ses chaussures dans Matériel, pour qu'une donnée ne se saisisse qu'à un seul endroit.

| Réglage | Effet |
| --- | --- |
| Thème | Couleurs du site (§ 6) |
| Modules | Modules affichés dans le menu, et leur ordre |
| Course de l'en-tête | Course affichée dans le titre de l'en-tête, choisie parmi celles de la page Objectif (choix aussi possible depuis la page Objectif) |
| Objectif | Texte libre de l'indicateur « Objectif » |
| Mot de passe | Changement du mot de passe du compte |

La page sera construite avec la base de données ; d'ici là, ces réglages sont écrits en dur.

## 9. Administration : deux temps

| Fonction | V1 · fichiers de données | V2 · Supabase |
| --- | --- | --- |
| Choisir ses modules et son thème | Configuration de l'utilisateur, modifiée dans le dépôt | Préférences utilisateur |
| Saisir ou modifier le contenu (courses, repas…) | Fichiers de données modifiés via Claude | Formulaires dans l'application, ou dictée à Claude |
| Importer ses séances | Saisie via Claude | Import automatique depuis Strava, après autorisation unique |
| Voir ses données | Visibles de tous | Visibles du seul utilisateur connecté |

## 10. Données et confidentialité

- **Trois couches** : les modules (affichage), le contenu et les préférences de chaque utilisateur, et entre les deux une couche d'accès aux données. Les modules ne savent pas d'où viennent les données : passer des fichiers à Supabase ne réécrit aucun module.
- **Protection du site** : par la connexion Supabase. Sans compte, on ne voit qu'un écran de connexion ; des règles par ligne garantissent que chacun n'accède qu'à ses propres données. Tant qu'un contenu n'a pas migré dans Supabase, il reste public.
- **Clés** : seule la clé publique de Supabase figure dans le code ; la clé de service et le secret Strava restent côté serveur (fonctions Supabase), jamais dans le dépôt.
- **Tiers** : aucun nom complet de tiers, aucune référence de réservation.
- **Ouverture à d'autres coureurs** : poids, repas et séances sont des données de santé au sens du RGPD ; l'ouverture suppose une politique de confidentialité, l'export et la suppression des données sur demande, et la validation de l'application par Strava.

## 11. Technique

| Sujet | Choix |
| --- | --- |
| Code | HTML, CSS et JavaScript natifs, sans framework ni étape de compilation |
| Pages | Une page HTML par module ; en-tête et menu fournis par un composant partagé |
| Hébergement | GitHub Pages, publication automatique à chaque mise à jour de `main` |
| Base de données | Supabase (PostgreSQL), offre gratuite |
| Météo | Open-Meteo : gratuit, sans clé, modèle européen ECMWF inclus |
| Bilan hebdomadaire | Routine Claude |
| Cache navigateur | Numéro de version posé automatiquement dans les liens CSS et JS à chaque publication |

## 12. Contrôles

Jeu d'essai : un objectif de trail, « Trail des Crêtes », 60 km, 3 500 m D+, en août 2029, jour inconnu ; 12 courses avant lui ; objectif « Finisher » ; prochaine course « Trail du Lac » le 15 novembre 2026 ; date du jour : 20 octobre 2026.

Résultats attendus :

- Titre : « Cap sur » puis « Trail des Crêtes » en couleur d'accent.
- Indicateurs, dans l'ordre : « 60 km » Distance, « 3 500 m » D+, « août 2029 » Date, « Finisher » Objectif, « 12 courses » D'ici là.
- Le compte à rebours vise le 1er août 2029 à minuit.
- Ligne sous le compteur : « prochaine course · Trail du Lac · J-26 ».
- Même objectif passé en route (42,195 km, sans D+) : l'indicateur D+ disparaît, Distance affiche « 42,195 km ».
- Date connue au jour près (30 août 2029) : Date affiche « 30 août 2029 », le compteur vise le 30 août.
- Une seule course avant l'objectif : « 1 course ».
- Sans objectif renseigné : l'indicateur Objectif affiche « — ».
- Thème changé : seules les couleurs changent, les positions et tailles restent identiques.
- L'engrenage ouvre la page des Préférences utilisateur ; le menu ne montre que les modules choisis, dans l'ordre choisi.
