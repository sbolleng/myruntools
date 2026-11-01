# Courses à surveiller · spécification fonctionnelle

Version 0.6 · 1er novembre 2026 · [Retour au sommaire](README.md) · Jalon 2

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
(25) VUE (▦)(☰)   (26) REGROUPER  Par mois · Aucun   (23) TRI  Date · Ouverture   (24) ANNÉE  Toutes · 2026 · 2025   (22) [+ Ajouter une course]

┌────────────────────────────┐ ┌────────────────────────────┐ ┌──────────────────
│ (4) CONFIRMÉE   (3) 15 NOV.│ │ (4) À SURVEILLER  (3) 11 AV│ │ …
│ (6) Trail du Lac · Le Tour…│ │ (6) Marathon de la Baie    │ │
│ (8) Mont-Clair · Trail court│ │ (8) La Baie · Marathon     │ │
│ DISTANCE  24 km · 650 m D+ │ │ DISTANCE  42,195 km        │ │
│ (11) DOSSARD (12)● (13) Ins│ │ (11) DOSSARD ○ Ouvre le 03/│ │
│              (14) Site off.│ │              (14) Site off.│ │
└────────────────────────────┘ └────────────────────────────┘ └──────────────────
```

Cartes les moins larges possibles (18 rem au moins), **toutes de la même hauteur** (13 rem ; le nom sur deux lignes au plus, le lieu sur une), **regroupées par mois** (au choix, § 4) : un titre de mois (17), puis les cartes de ce mois côte à côte, autant de colonnes que l'écran en permet, **une seule sur téléphone**. Les courses sans date forment le dernier groupe, « Date à définir ». Sans regroupement (choix « Aucun » ou tri par ouverture), les cartes se suivent sans titres. Le nombre de courses n'est pas écrit : les compteurs des pastilles suffisent. Les pastilles (20) défilent sur le côté sur téléphone ; « + Course » passe sur sa ligne.

| N° | Élément | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 3 | Date | 15 NOV. 2026 | Ligne 1, à droite | Libellé, Texte discret ; « À DÉFINIR » sans date |
| 4 | Statut | À SURVEILLER, OPTION · PRINTEMPS 2027, CONFIRMÉE, COURUE | Ligne 1, à gauche, sur la même ligne que la date | Libellé, Texte discret (remplace le rôle) ; passe à la ligne s'il est trop long |
| 6 | Course · Parcours | Trail du Lac · Le Tour du Lac | Ligne 2, sous le statut | Nom |
| 8 | Lieu · format | Mont-Clair · Trail court | Ligne 3 | Texte, Texte discret |
| — | Distance | 24 km · 650 m D+ | Ligne 4 | Comme Objectif |
| 11–13 | Dossard | ● Ouvre le 10/01/2027 à 12:00 | Ligne 5 | Comme Objectif ([§ 3.5](module-objectif-specification.md)) ; absent pour une course courue ; jamais un lien ici |
| 14 | Site officiel ↗ | | Bas droite | Lien souligné en Texte ; **grisé, sans adresse, quand `lien` n'est pas renseigné** |
| 17 | Titre de mois | NOVEMBRE 2026, DATE À DÉFINIR | Au-dessus de chaque groupe, en cartes | Libellé, Texte discret, filet dessous |
| 20 | Sélection | À surveiller 12 | Haut de page | Pastilles communes (`mrt-pastille`), choix unique, compteur de la vue ; seule rangée de pastilles de la page |
| 22 | Ajouter | + Ajouter une course | Sous les vues, à droite | Bouton principal ; absent en lecture seule |
| 25 | Vue | Libellé VUE, puis deux ronds : grille (cartes) et tableau | Sous la sélection, après le compte | Ronds `mrt-rond` du Palmarès ; le rond actif en Accent ; infobulles « Cartes » et « Tableau » ; choix gardé sur l'appareil (`mrt-courses-affichage`), cartes par défaut |
| 26 | Regroupement | Libellé REGROUPER, puis Par mois · Aucun | Après la vue | Choix en texte discret, comme le tri ; **cartes seulement**, absent avec le tri par ouverture ; « Par mois » par défaut, gardé sur l'appareil (`mrt-courses-groupe`) |
| 23 | Tri | Libellé TRI, puis Date · Ouverture | Après la vue | Choix en texte discret, le choix actif souligné en Accent ; **cartes seulement** (pas pour Déjà couru) ; gardé en changeant de vue |
| 24 | Année | Libellé ANNÉE, puis Toutes · 2026 · 2025 | Après le tri | Même style que le tri ; seulement pour Déjà couru et Tout, avec plus d'une année |

Numéros repris d'Objectif ([§ 3.1](module-objectif-specification.md)) pour les éléments communs ; ni rôle, ni objectif, ni compteur. Retirés par rapport à la version 0.1 : le trait et les pastilles du chemin (1, 2) et le rond Détails (15).

### 3.1 Affichage en tableau

Au choix (25), les mêmes courses, les mêmes vues, le même tri et le même filtre d'année : un tableau dans un cadre, une ligne par course, avec **sans regroupement par mois** : les lignes se suivent, la date est dans sa colonne. Il défile sur le côté s'il est plus large que l'écran (téléphone). Colonnes, reprises de la veille de l'ancien suivi, sans l'index UTMB (idée « plus tard ») :

| Colonne | Contenu | Exemple |
| --- | --- | --- |
| Événement | La course, en gras ; lien vers le site officiel quand il est renseigné ; le lieu dessous | **Trail du Lac** · Mont-Clair |
| Course | Le parcours ; « — » sans parcours | Le Tour du Lac |
| Distance · D+ | Comme sur la carte ; « — » si inconnue | 24 km · 650 m D+ |
| Date | La date ; l'heure de départ dessous si elle est connue ; « À définir » sans date | 15 nov. 2026 · 9 h |
| Ouverture des dossards | L'état du dossard comme sur la carte (§ 5), sans lien ; « — » pour une course courue | ● Ouvre le 03/11/2026 à 12:00 |

Toucher une ligne ouvre la fiche de modification (la page de la course en lecture seule) ; le lien du nom n'ouvre pas la fiche.

**Colonnes triables, comme le Palmarès** : en tableau, le choix « Tri » (23) disparaît ; chaque titre de colonne est un bouton avec le double triangle du Palmarès. Premier toucher : croissant ; deuxième : décroissant ; troisième : retour à l'ordre d'origine (date croissante, ou décroissante pour Déjà couru). La colonne triée est en Accent. Tri par Événement et Course : alphabétique ; Distance : numérique ; Date : chronologique ; Ouverture : les inscriptions déjà ouvertes d'abord, puis les plus proches, les inscrits puis les courues à la fin. Une valeur vide passe toujours en dernier. 

## 4. La carte

- **Regroupement par mois** (26) : proposé en vue cartes seulement ; jamais dans le tableau.

- **Fond** comme la carte d'Objectif ; cadre en pointillé pour une option ou une course à surveiller, plein pour une confirmée, atténuée pour une courue.
- **Toucher la carte ouvre la fiche de modification** (la même que depuis Objectif et le Palmarès) : une course à venir ou à surveiller dans sa fiche, une course courue dans sa fiche de résultat. En lecture seule (site partagé), la page de la course s'ouvre à la place, en consultation.
- **Site officiel (14)** est un lien à part, dans un nouvel onglet ; toucher le lien n'ouvre pas la fiche.
- **Tri par ouverture** (23) : les inscriptions déjà ouvertes d'abord, puis les plus proches, puis celles dont la date est inconnue ; les courses où l'on est inscrit à la fin ; les courues, à la fin.
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

Le module est dans le catalogue sous le nom « Courses à surveiller » (onglet « À surveiller »), **affiché par défaut pour tous, juste après Calendrier** ; chacun peut le décocher dans les Préférences. Les profils qui avaient déjà rangé leurs modules le reçoivent par l'évolution 018. Cinq onglets tiennent dans l'écran d'un téléphone (375 px) grâce à des onglets resserrés sur téléphone (marges 0,3 rem, texte 0,72 rem).

## 7. Hors périmètre

- Index UTMB et récupération automatique de pages de courses (Catalogue des courses, todo globale).
- Rappel automatique à l'ouverture des inscriptions (le Calendrier montre déjà le rendez-vous clé).

## 8. Jeu d'essai et résultats attendus

Données fictives du banc d'essai (groupe `courses`), 20 octobre 2026, 10 h. Courses d'Objectif plus deux à surveiller : « Marathon de la Baie » (11 avril 2027, site officiel, ouverture le 3 nov. 2026 à 12:00) et « Ultra des Lacs » (sans date, ouverture : janvier 2027, mois seul).

| Essai | Résultat attendu |
| --- | --- |
| Ouverture de la page | Vue À surveiller ; pastilles : À surveiller 3, Déjà couru 7, À venir 7, Tout 17 ; aucun texte « n courses » ; regroupement Par mois actif |
| Regroupement | « Aucun » retire les titres de mois, même cartes, choix gardé après rechargement ; absent en tableau et avec le tri par ouverture |
| À surveiller | Marathon de la Baie, Trail des Sommets, Ultra des Lacs ; titres avril 2027, septembre 2028, date à définir |
| Carte du Marathon | Fond ; statut « À surveiller » et date sur la même ligne, nom dessous ; ni compteur ni objectif ; « Ouvre le 03/11/2026 à 12:00 » ; lien « Site officiel » dans un nouvel onglet ; Ultra des Lacs : lien grisé sans adresse, date « À définir », « Ouverture : janvier 2027 » |
| À venir, tri par ouverture | Ultra du Plateau, Corrida de Noël, Trail des Cimes, Trail de la Forêt, puis les trois inscrits ; pas de repères ; le tri est gardé en changeant de vue |
| Déjà couru | 7 courses, la plus récente d'abord, sans ligne Dossard, pastille atténuée ; années Toutes, 2026, 2025 ; 2025 : 4 courses, pas de tri |
| Tout | 17 courses, les courues à la fin |
| Toucher une carte | La fiche de modification s'ouvre (à surveiller, sans date, courue : fiche de résultat) ; le lien « Site officiel » ne l'ouvre pas |
| + Course | Dans À surveiller : statut préchoisi ; dans À venir : Confirmée |
| Fiche | Date et heure d'ouverture relues ; « Mois seulement » : la date devient un mois, l'heure se vide ; enregistré au 1er du mois, sans heure ; sans date d'ouverture, ni mois seul ni heure |
| Ouverture le jour même | Avant l'heure : « Ouvre le 20/10/2026 à 14:00 » ; après : « Inscription ouverte » |
| Tableau | Choisi par le rond : colonnes Événement, Course, Distance · D+, Date, Ouverture des dossards ; sans titres de mois ; une ligne par course (À surveiller : Marathon de la Baie, Trail des Sommets, Ultra des Lacs) ; l'heure sous la date (« 9 h ») ; « — » pour le dossard d'une course courue ; le lien du nom n'ouvre pas la fiche, toucher une ligne l'ouvre ; le choix est gardé après rechargement ; pas de choix « Tri » ; Date croissante par défaut ; Distance : croissante puis décroissante, à plat (sans distance en dernier) ; Ouverture : les plus proches d'abord ; Événement : alphabétique ; troisième toucher : retour à l'ordre d'origine ; rien ne dépasse de la page sur téléphone |
| Ordinateur (1200 px) | Deux cartes du même mois côte à côte, moins de 420 px de large ; toutes les cartes de la même hauteur (aussi sur téléphone) |
| Téléphone (390 px) | Rien ne dépasse ; une colonne ; statut et date sur la même ligne, le nom dessous |
| Menu | Onglet « À surveiller » après Calendrier ; les cinq onglets tiennent à 375 et 390 px |
| `?vue=courue` | La vue Déjà couru |
| Site partagé | Lecture seule, pas de bouton d'ajout ; toucher une carte ouvre la page de la course, pas la fiche |
