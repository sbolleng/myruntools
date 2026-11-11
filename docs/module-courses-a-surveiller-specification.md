# Courses à surveiller · spécification fonctionnelle

Version 0.9 · 11 novembre 2026 · [Retour au sommaire](README.md) · Jalon 2

## 1. Rôle

Toutes les courses de l'utilisateur sur une seule page : celles qu'il a repérées, celles de sa saison, celles qu'il a courues. Sa première fonction est la veille : repérer une course, savoir quand s'ouvrent ses inscriptions, aller voir son site officiel. La page s'ouvre sur **toutes les courses** ; les filtres, derrière un bouton, resserrent la liste.

Aucune saisie à part : la page lit la liste de courses commune ([modèle de données](modele-donnees.md), § 4). Une course change de statut ou d'état dans sa fiche, et suit.

## 2. Les filtres

Un rond « Filtres » (le même que le Palmarès) ouvre un panneau repliable au-dessus de la liste. Rien n'est filtré à l'ouverture : toutes les courses, sauf les abandonnées, qui n'apparaissent nulle part. Les filtres se combinent : au choix **dans** un groupe (plusieurs statuts cumulables), **ET** entre groupes.

| Groupe | Choix (avec le nombre de courses de chacun) | Effet |
| --- | --- | --- |
| **Statut** | Confirmée · Option · **Repérée** · Courue | Les courses du ou des statuts choisis ; une course courue n'a plus que le statut « Courue » |
| **Inscriptions** | Ouvertes | À venir, pas encore inscrit, dont l'ouverture des inscriptions est atteinte (date et heure) : ce qu'il y a à faire maintenant |
| **Année** | Toutes · 2028 · 2027… | Les courses de cette année ; seulement s'il y a plus d'une année |

**Statut « Repérée »** : une course repérée, pas encore décidée (valeur stockée `a_surveiller`, inchangée ; seul le libellé change). Les « À venir » d'avant sont les statuts Confirmée et Option réunis.

**Ordre** : ce qui est à venir du plus proche au plus lointain (sans date à la fin), puis les courues, les plus récentes d'abord ; seule « Courue » filtrée : les plus récentes d'abord.

L'adresse `courses-a-surveiller.html?vue=surveiller` (ou `venir`, `courue`, `ouvertes`) ouvre la page préfiltrée ; `tout` ou sans paramètre : aucun filtre. Les filtres ne sont pas retenus d'une visite à l'autre.

## 3. Plan de page

```
(30) [⚲ Filtres 2]  (25) VUE (▦)(☰)   (31) 7 sur 17 courses   (32) Réinitialiser les filtres      (22) [+ Ajouter une course]
┌ panneau, replié par défaut ─────────────────────────────────────────────────────────────┐
│ (33) STATUT  [Confirmée 5] [Option 2] [Repérée 3] [Courue 7]      INSCRIPTIONS [Ouvertes 1]   (35) ˄ │
│ (34) ANNÉE   [Toutes] [2028] [2027] [2026] [2025]                                         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
(17) NOVEMBRE 2026
┌────────────────────────────┐ ┌────────────────────────────┐ ┌──────────────────
│ (4) CONFIRMÉE   (3) 15 NOV.│ │ (4) REPÉRÉE       (3) 11 AV│ │ …
│ (6) Trail du Lac · Le Tour…│ │ (6) Marathon de la Baie    │ │
│ (8) Mont-Clair · Trail court│ │ (8) La Baie · Marathon     │ │
│ DISTANCE      24 km · 650 m D+│ │ DISTANCE      42,195 km    │ │
│ (11) INSCRIPTION (12)● (13) Ins│ │ (11) INSCRIPTION ○ Ouvre le 3 nov. │ │
│              (14) Site off.│ │              (14) Site off.│ │
└────────────────────────────┘ └────────────────────────────┘ └──────────────────
```

Sur téléphone, le panneau passe sous la barre, les groupes l'un sous l'autre ; « + Course » passe sur sa ligne.

Cartes les moins larges possibles (18 rem au moins), **toutes de la même hauteur** (13 rem ; le nom sur deux lignes au plus, le lieu sur une), **toujours regroupées par mois** (ni regroupement ni tri à choisir en cartes) : un titre de mois (17), puis les cartes de ce mois côte à côte, autant de colonnes que l'écran en permet, **une seule sur téléphone**. Les courses sans date forment le dernier groupe, « Date à définir ». Le nombre de courses (31) n'est écrit que lorsqu'un filtre est actif. 

| N° | Élément | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 3 | Date | 15 NOV. 2026 | Ligne 1, à droite | Libellé, Texte discret ; « À DÉFINIR » sans date |
| 4 | Statut | REPÉRÉE, OPTION · PRINTEMPS 2027, CONFIRMÉE, COURUE | Ligne 1, à gauche, sur la même ligne que la date | Libellé, Texte discret (remplace le rôle) ; passe à la ligne s'il est trop long |
| 6 | Course · Parcours | Trail du Lac · Le Tour du Lac | Ligne 2, sous le statut | Nom |
| 8 | Lieu · format | Mont-Clair · Trail court | Ligne 3 | Texte, Texte discret |
| — | Distance | 24 km · 650 m D+ | Ligne 4 | Comme Objectif |
| 11–13 | Inscription | ● Ouvre le 10 janv. 2027 à 12 h | Ligne 5 | Comme Objectif ([§ 3.5](module-objectif-specification.md)) ; absent pour une course courue ; jamais un lien ici |
| 14 | Site officiel ↗ | | Bas droite | Lien souligné en Texte ; **grisé, sans adresse, quand `lien` n'est pas renseigné** |
| 17 | Titre de mois | NOVEMBRE 2026, DATE À DÉFINIR | Au-dessus de chaque groupe, en cartes | Libellé, Texte discret, filet dessous |
| 22 | Ajouter | + Ajouter une course | Haut de page, à droite | Bouton principal ; absent en lecture seule |
| 25 | Vue | Libellé VUE, puis deux ronds : grille (cartes) et tableau | Après Filtres | Ronds `mrt-rond` du Palmarès ; le rond actif en Accent ; infobulles « Cartes » et « Tableau » ; choix gardé sur l'appareil (`mrt-courses-affichage`), cartes par défaut |
| 30 | Filtres | Rond à trois traits, badge « 2 » | Haut de page, à gauche | Rond `mrt-rond` du Palmarès ; en Accent, avec le nombre de groupes filtrés, quand un filtre est actif ou le panneau ouvert ; ouvre et ferme le panneau |
| 31 | Compte | 7 sur 17 courses | Après Vue | Texte discret ; seulement avec un filtre actif |
| 32 | Réinitialiser | Réinitialiser les filtres | Après le compte | Lien commun (`mrt-lien`) ; seulement avec un filtre actif |
| 33 | Statut, Inscriptions | Pastilles avec compteurs | Panneau | Pastilles communes (`mrt-pastille`), cumulables dans un groupe ; Libellé en tête de chaque groupe |
| 34 | Année | Toutes · 2028 · 2027 | Panneau | Pastilles à choix unique ; seulement avec plus d'une année |
| 35 | Réduire | Chevron vers le haut | Panneau, en haut à droite | Rond `mrt-rond`, comme le Palmarès |

Numéros repris d'Objectif ([§ 3.1](module-objectif-specification.md)) pour les éléments communs ; ni rôle, ni objectif, ni compteur. Retirés : le trait et les pastilles du chemin (1, 2), le rond Détails (15) et, depuis la version 0.9, la rangée de pastilles de vues (20) et le choix d'année (24), passés dans le panneau.

### 3.1 Affichage en tableau

Au choix (25), les mêmes courses, les mêmes filtres : un tableau dans un cadre, une ligne par course, avec **sans regroupement par mois** : les lignes se suivent, la date est dans sa colonne. Il défile sur le côté s'il est plus large que l'écran (téléphone). Colonnes, reprises de la veille de l'ancien suivi, sans l'index UTMB (idée « plus tard ») :

| Colonne | Contenu | Exemple |
| --- | --- | --- |
| Événement | La course, en gras ; lien vers le site officiel quand il est renseigné ; le lieu dessous | **Trail du Lac** · Mont-Clair |
| Course | Le parcours ; « — » sans parcours | Le Tour du Lac |
| Distance · D+ | Comme sur la carte ; « — » si inconnue | 24 km · 650 m D+ |
| Date | La date ; l'heure de départ dessous si elle est connue ; « À définir » sans date | 15 nov. 2026 · 9 h |
| Ouverture des inscriptions | L'état du dossard comme sur la carte (§ 5), sans lien ; « — » pour une course courue | ● Ouvre le 3 nov. 2026 à 12 h |

Toucher une ligne ouvre la fiche de modification (la page de la course en lecture seule) ; le lien du nom n'ouvre pas la fiche.

**Colonnes triables, comme le Palmarès** : en tableau, chaque titre de colonne est un bouton avec le double triangle du Palmarès. Premier toucher : croissant ; deuxième : décroissant ; troisième : retour à l'ordre d'origine (date croissante, ou décroissante pour la seule Courue). La colonne triée est en Accent. Tri par Événement et Course : alphabétique ; Distance : numérique ; Date : chronologique ; Ouverture : les inscriptions déjà ouvertes d'abord, puis les plus proches, les inscrits puis les courues à la fin. Une valeur vide passe toujours en dernier. 

## 4. La carte

- **Pas de tri ni de regroupement à choisir** en vue cartes : toujours par date, groupées par mois ; pour un autre ordre, le tableau (colonnes triables).

- **Fond** comme la carte d'Objectif ; cadre en pointillé pour une option ou une course repérée, plein pour une confirmée, atténuée pour une courue.
- **Toucher la carte ouvre la fiche de modification** (la même que depuis Objectif et le Palmarès) : une course à venir ou à surveiller dans sa fiche, une course courue dans sa fiche de résultat. En lecture seule (site partagé), la page de la course s'ouvre à la place, en consultation.
- **Site officiel (14)** est un lien à part, dans un nouvel onglet ; toucher le lien n'ouvre pas la fiche.
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
| Ouvre bientôt | Date future ; ou date du jour et heure à venir | Ouvre le 10 janv. 2027 à 12 h (sans heure : « Ouvre le 10 janv. 2027 ») |
| Mois seul | Mois en cours ou à venir | Ouverture : janvier 2027 |
| Ouverture à venir | Pas de date | Ouverture à venir |

## 6. Menu

Le module est dans le catalogue sous le nom « Courses à surveiller » (onglet « Courses » ; clé rangée inchangée), **affiché par défaut pour tous, juste après Calendrier** ; chacun peut le décocher dans les Préférences. Les profils qui avaient déjà rangé leurs modules le reçoivent par l'évolution 018. Cinq onglets tiennent dans l'écran d'un téléphone (375 px) grâce à des onglets resserrés sur téléphone (marges 0,3 rem, texte 0,72 rem).

## 7. Hors périmètre

- Index UTMB et récupération automatique de pages de courses (Catalogue des courses, todo globale).
- Rappel automatique à l'ouverture des inscriptions (le Calendrier montre déjà le rendez-vous clé).

## 8. Jeu d'essai et résultats attendus

Données fictives du banc d'essai (groupe `courses`), 20 octobre 2026, 10 h. Courses d'Objectif plus deux repérées : « Marathon de la Baie » (11 avril 2027, site officiel, ouverture le 3 nov. 2026 à 12:00) et « Ultra des Lacs » (sans date, ouverture : janvier 2027, mois seul).

| Essai | Résultat attendu |
| --- | --- |
| Ouverture de la page | 17 courses, à venir d'abord puis les courues ; aucun filtre : pas de badge, de compte ni de lien « Réinitialiser » ; panneau replié ; aucune pastille de vue |
| Panneau | Statuts Confirmée, Option, Repérée 3, Courue 7 ; Ouvertes 1 ; la flèche le replie |
| Repérée | Marathon de la Baie, Trail des Sommets, Ultra des Lacs ; titres avril 2027, septembre 2028, date à définir ; « Filtres · 1 actif », « 3 sur 17 courses » |
| Carte du Marathon | Fond ; statut « Repérée » et date sur la même ligne, nom dessous ; ni compteur ni objectif ; « Ouvre le 3 nov. 2026 à 12 h » ; lien « Site officiel » dans un nouvel onglet ; Ultra des Lacs : lien grisé sans adresse, date « À définir », « Ouverture : janvier 2027 » ; « INSCRIPTION » ne recouvre pas la pastille |
| Ouvertes | Seulement Ultra du Plateau (ouverture le 1er sept. 2026) ; le jour même, une ouverture à 08 h est comptée à 10 h, une ouverture à 14 h pas encore |
| Confirmée + Option | Trail du Lac, Corrida de Noël, Trail des Gorges, Trail des Cimes, Ultra du Plateau, Trail de la Forêt, Trail des Crêtes (7 courses) |
| Courue | 7 courses, la plus récente d'abord, sans ligne Inscription, pastille atténuée ; années du panneau 2028, 2027, 2026, 2025 ; 2025 : 4 courses |
| Aucun filtre | 17 courses, les courues à la fin |
| Toucher une carte | La fiche de modification s'ouvre (repérée, sans date, courue : fiche de résultat) ; le lien « Site officiel » ne l'ouvre pas |
| + Course | Repérée seule filtrée : statut préchoisi Repérée ; sinon Confirmée ; Courue seule : fiche de résultat |
| Fiche | Date et heure d'ouverture relues ; « Mois seulement » : la date devient un mois, l'heure se vide ; enregistré au 1er du mois, sans heure ; sans date d'ouverture, ni mois seul ni heure |
| Ouverture le jour même | Avant l'heure : « Ouvre le 20 oct. 2026 à 14 h » ; après : « Inscription ouverte » |
| Tableau | Choisi par le rond : colonnes Événement, Course, Distance · D+, Date, Ouverture des inscriptions ; sans titres de mois ; une ligne par course (Repérée : Marathon de la Baie, Trail des Sommets, Ultra des Lacs) ; l'heure sous la date (« 9 h ») ; « — » pour l'inscription d'une course courue ; le lien du nom n'ouvre pas la fiche, toucher une ligne l'ouvre ; le choix est gardé après rechargement, les filtres repartent à zéro ; tris des colonnes comme au § 3.1 |
| Ordinateur (1200 px) | Deux cartes du même mois côte à côte, moins de 420 px de large ; toutes les cartes de la même hauteur (aussi sur téléphone) |
| Téléphone (390 px) | Rien ne dépasse ; une colonne ; statut et date sur la même ligne, le nom dessous |
| Menu | Onglet « Courses » après Calendrier ; les cinq onglets tiennent à 375 et 390 px |
| `?vue=courue` | Préfiltre Courue (7 courses, « Filtres · 1 actif ») |
| Site partagé | Lecture seule, pas de bouton d'ajout ; toucher une carte ouvre la page de la course, pas la fiche |
