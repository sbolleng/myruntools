# Courses à surveiller · spécification fonctionnelle

Version 0.1 · 1er novembre 2026 · [Retour au sommaire](README.md) · Jalon 2

## 1. Rôle

Toutes les courses de l'utilisateur sur une seule page : celles qu'il surveille, celles à venir, celles qu'il a courues. Sa première fonction est la veille : repérer une course, savoir quand s'ouvrent ses inscriptions, aller voir son site officiel. La page s'ouvre donc sur la vue **À surveiller**.

Aucune saisie à part : la page lit la liste de courses commune ([modèle de données](modele-donnees.md), § 4). Une course passe d'une vue à l'autre en changeant de statut ou d'état.

## 2. Les quatre vues

Un sélecteur en pastilles à choix unique, en haut de la page, avec le nombre de courses de chaque vue. Les abandonnées n'apparaissent nulle part.

| Vue | Courses | Ordre |
| --- | --- | --- |
| **À surveiller** (par défaut) | Statut À surveiller, état À venir, avec ou sans date | Date croissante, sans date à la fin |
| **Déjà couru** | État Courue (celles du Palmarès) | Les plus récentes d'abord |
| **À venir** | Option ou Confirmée à venir : la feuille de route d'Objectif ([§ 3.3](module-objectif-specification.md)) | Date croissante |
| **Tout** | À surveiller et À venir (date croissante, sans date à la fin), puis les courues (les plus récentes d'abord) | |

Une course est dans une seule vue. L'adresse `courses-a-surveiller.html?vue=courue` (ou `venir`, `tout`) ouvre une autre vue ; sans paramètre, À surveiller.

## 3. Plan de page

```
(20) [ À surveiller 12 ] [ Déjà couru 9 ] [ À venir 6 ] [ Tout 27 ]
(21) 12 COURSES   (23) [Par date] [Par ouverture]          (22) [+ Ajouter une course]
(24) [Toutes] [2026] [2025]                 (Déjà couru et Tout, s'il y a plusieurs années)

      (17) NOVEMBRE 2026
(2)●  ┌──────────────────────────────────────────────────────────────┐
 │    │ (4) À SURVEILLER                                             │
 │    │ (6) Trail du Lac · Le Tour du Lac            (3) 15 NOV. 2026│
(1)   │ (8) Mont-Clair · Trail court                                 │
 │    │ DISTANCE      24 km · 650 m D+                               │
 │    │ (11) DOSSARD  (12)● (13) Ouvre le 10/01/2027 à 12:00         │
 │    │                                         (15) ⓘ    (14) ↗     │
 │    └──────────────────────────────────────────────────────────────┘
```

Téléphone : même ordre ; le nom sur toute la largeur, la date juste dessous à droite ; les pastilles (20) défilent sur le côté ; « + Course » passe sur sa ligne.

| N° | Élément | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 1, 2 | Trait et pastille du chemin | | Rail à gauche | Comme Objectif ; pastille pleine : confirmée ; pointillé : option ; pointillé et pastille vide : à surveiller ; atténuée : courue |
| 3 | Date | 15 NOV. 2026 | Ligne 2, à droite | Libellé, Texte discret ; « À DÉFINIR » sans date |
| 4 | Statut | À SURVEILLER, OPTION · PRINTEMPS 2027, CONFIRMÉE, COURUE | Ligne 1 | Libellé, Texte discret (remplace le rôle) |
| 6 | Course · Parcours | Trail du Lac · Le Tour du Lac | Ligne 2, à gauche | Nom |
| 8 | Lieu · format | Mont-Clair · Trail court | Ligne 3 | Texte, Texte discret |
| — | Distance | 24 km · 650 m D+ | Ligne 4 | Comme Objectif |
| 11–13 | Dossard | ● Ouvre le 10/01/2027 à 12:00 | Ligne 5 | Comme Objectif ([§ 3.5](module-objectif-specification.md)) ; absent pour une course courue ; jamais un lien ici |
| 14 | Site officiel ↗ | | Bas droite | Flèche d'Objectif ; seulement si `lien` est renseigné |
| 15 | Détails ⓘ | | Bas droite | Rond discret ; ouvre la page de la course (modale) |
| 17 | Repère de mois | NOVEMBRE 2026, DATE À DÉFINIR | Entre les cartes | Libellé, Texte discret ; le trait continue à travers |
| 20 | Vues | À surveiller 12 | Haut de page | Pastilles communes (`mrt-pastille`), choix unique, compteur de la vue |
| 21 | Compte | 12 COURSES | Sous les vues | Libellé, Texte discret ; tient compte du filtre d'année |
| 22 | Ajouter | + Ajouter une course | Sous les vues, à droite | Bouton principal ; absent en lecture seule |
| 23 | Tri | Par date · Par ouverture | Sous les vues | Pastilles ; pas pour Déjà couru ; gardé en changeant de vue |
| 24 | Année | Toutes · 2026 · 2025 | Sous les vues | Pastilles ; seulement pour Déjà couru et Tout, avec plus d'une année |

Numéros repris d'Objectif ([§ 3.1](module-objectif-specification.md)) pour les éléments communs ; ni rôle, ni objectif, ni compteur.

## 4. La carte

- **La carte entière mène au site officiel** (nouvel onglet) quand `lien` est renseigné, sinon elle n'est pas cliquable et la flèche (14) est absente. À la différence d'Objectif, la ligne Dossard n'est jamais un lien : le seul autre point de contact est le rond Détails (15).
- **Détails (15)** ouvre la page de la course, en modale : modification, résultat d'une course courue, retenir, marquer comme courue. Une course sans date s'y affiche « À définir » ; hors feuille de route, elle n'a ni numéro d'étape ni voisines.
- **Tri par ouverture** (23) : les inscriptions déjà ouvertes d'abord, puis les plus proches, puis celles dont la date est inconnue ; les courses où l'on est inscrit à la fin ; les courues, à la fin. Sans repères de mois.
- **Groupe d'options** : pas de regroupement, une carte par course ; le nom du groupe suit le statut.

## 5. Ouverture des inscriptions

Le champ existait (`ouverture_inscriptions`, une date). Deux précisions s'y ajoutent ([modèle de données](modele-donnees.md), § 4 ; évolution 017) :

| Champ | Contenu | Saisie |
| --- | --- | --- |
| `ouverture_heure` | Heure locale d'ouverture (les dossards des grandes courses partent en quelques minutes) | Heure, facultative ; grisée en « mois seulement » |
| `ouverture_approx` | Vrai si seul le mois est connu ; la date est rangée au 1er du mois | Case « Mois seulement », à droite de la date : la date devient un mois |

Sans date d'ouverture, ni l'heure ni le mois seul ne sont rangés. États du dossard ([Objectif § 3.5](module-objectif-specification.md)), comparés à la date et à l'heure du jour :

| État | Condition | Texte |
| --- | --- | --- |
| Inscrit | `inscrit` | Inscrit · n° 412 |
| Inscription ouverte | Date passée ; ou date du jour et heure atteinte (ou sans heure) ; ou mois seul passé | Inscription ouverte |
| Ouvre bientôt | Date future ; ou date du jour et heure à venir | Ouvre le 10/01/2027 à 12:00 (sans heure : « Ouvre le 10/01/2027 ») |
| Mois seul | Mois en cours ou à venir | Ouverture : janvier 2027 |
| Ouverture à venir | Pas de date | Ouverture à venir |

## 6. Menu

Le module est dans le catalogue sous le nom « Courses à surveiller » (onglet « À surveiller »). **Hors du menu par défaut** : cinq onglets ne tiennent pas dans l'écran d'un téléphone ; la case est décochée dans les Préférences et se coche pour l'afficher.

## 7. Hors périmètre

- Index UTMB et récupération automatique de pages de courses (Catalogue des courses, todo globale).
- Rappel automatique à l'ouverture des inscriptions (le Calendrier montre déjà le rendez-vous clé).

## 8. Jeu d'essai et résultats attendus

Données fictives du banc d'essai (groupe `courses`), 20 octobre 2026, 10 h. Courses d'Objectif plus deux à surveiller : « Marathon de la Baie » (11 avril 2027, site officiel, ouverture le 3 nov. 2026 à 12:00) et « Ultra des Lacs » (sans date, ouverture : janvier 2027, mois seul).

| Essai | Résultat attendu |
| --- | --- |
| Ouverture de la page | Vue À surveiller ; pastilles : À surveiller 3, Déjà couru 7, À venir 7, Tout 17 |
| À surveiller | Marathon de la Baie, Trail des Sommets, Ultra des Lacs ; repères avril 2027, septembre 2028, date à définir |
| Carte du Marathon | Statut « À surveiller », ni compteur ni objectif, « Ouvre le 03/11/2026 à 12:00 », lien vers le site officiel dans un nouvel onglet ; Ultra des Lacs : sans lien, date « À définir », « Ouverture : janvier 2027 » |
| À venir, tri par ouverture | Ultra du Plateau, Corrida de Noël, Trail des Cimes, Trail de la Forêt, puis les trois inscrits ; pas de repères ; le tri est gardé en changeant de vue |
| Déjà couru | 7 courses, la plus récente d'abord, sans ligne Dossard, pastille atténuée ; années Toutes, 2026, 2025 ; 2025 : 4 courses, pas de tri |
| Tout | 17 courses, les courues à la fin |
| Détails | La page de la course s'ouvre, « Préparatoire · À surveiller », sans voisines ; sans date : « À définir », aucune erreur |
| + Course | Dans À surveiller : statut préchoisi ; dans À venir : Confirmée |
| Fiche | Date et heure d'ouverture relues ; « Mois seulement » : la date devient un mois, l'heure se vide ; enregistré au 1er du mois, sans heure ; sans date d'ouverture, ni mois seul ni heure |
| Ouverture le jour même | Avant l'heure : « Ouvre le 20/10/2026 à 14:00 » ; après : « Inscription ouverte » |
| Téléphone (390 px) | Rien ne dépasse ; la date sous le nom |
| `?vue=courue` | La vue Déjà couru |
| Site partagé | Lecture seule, pas de bouton d'ajout |
