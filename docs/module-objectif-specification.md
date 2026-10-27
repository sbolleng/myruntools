# Objectif · spécification fonctionnelle

Version 0.19 · 27 octobre 2026 · [Retour au sommaire](README.md) · Jalon 1 (octobre 2026) · preuve de concept

## 1. Rôle

La page Objectif montre tout le chemin jusqu'à la course objectif : les courses étapes, leur statut, ce qu'il faut savoir sur chacune, et des outils dynamiques qui s'activent d'eux-mêmes à l'approche et le jour de la course. C'est le premier module livré et la preuve de concept du projet : premier module branché sur la base de données Supabase. Il porte aussi le socle commun décrit dans la [spécification générale](specification-generale.md).

## 2. Ce qui existe aujourd'hui

Les deux profils pilotes ont chacun leur version de la page, écrite à la main. Le nouveau module les remplace par une seule page alimentée par une liste de courses par utilisateur.

| Élément | Profil trail | Profil route | Dans le module |
| --- | --- | --- | --- |
| Objectif final | Oui | Oui | Une course marquée « objectif » |
| Étapes | Confirmées, objectif intermédiaire, à choisir, horizon | Confirmées, objectif intermédiaire, à choisir (avec candidats) | Les mêmes statuts pour tous |
| Cellules d'une étape | Objectif, Dossard, Rôle, Stratégie, Logistique | Objectif, Dossard, Rôle, Enchaînement, Logistique | Champs communs, chacun affiché s'il est rempli |
| Comptes à rebours | Oui | Oui | Sur chaque course datée |
| Graphique de difficulté | Oui | Non | Calculé depuis la liste des courses |
| Badges UTMB | Oui | Non | Pour les courses qui en ont |
| Suivi en course | Non | Oui (un semi-marathon) | Pour toute course qui a une stratégie de passage |
| Météo du jour J | Non | Oui (un semi-marathon) | Pour toute course qui a des coordonnées |
| Courses à surveiller | Tableau de repli | Tableau de veille | Sort de la page : module séparé |

Aujourd'hui, côté trail, les courses du graphique de difficulté sont saisies une deuxième fois dans le code. Avec une seule liste de courses, ce double emploi disparaît.

## 3. Contenu de la page

Le module a deux pages :

- **Objectif** (`objectif.html`) : la vue d'ensemble. De haut en bas, le **graphique de difficulté** (§ 5.2), affiché pour tous, repliable, puis la **feuille de route** : une étape par course, dans l'ordre chronologique, la course objectif en dernier. Ni texte d'introduction, ni titre au-dessus, ni légende dessous.
- **Page d'une course** (`course.html?id=…`) : tout ce qu'il faut savoir sur une course, une page par course (§ 3.4). On l'ouvre en touchant son étape. Elle a sa propre adresse : on peut la garder en favori pour le jour J, et le bouton retour du téléphone ramène à la feuille de route.

**Construction en lots.** Premier lot : la feuille de route et la page d'une course (cellules, comptes à rebours). Ensuite, chacun dans son lot : graphique de difficulté, badges UTMB, météo du jour J, suivi en course. Chacun est un module qu'on décide d'ajouter ou non, le moment venu.

### 3.1 Une étape de la feuille de route (coup d'œil)

Une carte par étape, le long d'un trait vertical (pastille et trait selon le § 3.3). Maquette : `docs/maquettes/objectif.html?v=b`.

Plan de page d'une carte (ordinateur) :

```
(2)●  ┌──────────────────────────────────────────────────────────────────┐
 │    │ (4) PRÉPARATOIRE                  (5) [25 j][23 h][59 min][56 s] │
 │    │ (6) Trail du Lac · Le Tour du Lac (7)↗          (3) 15 NOV. 2026 │
(1)   │ (8) Mont-Clair · Trail court                                     │
 │    │ DISTANCE       24 km · 650 m D+                                  │
 │    │ (9) OBJECTIF   (10) 02:45:00                                     │
 │    │ (11) DOSSARD   (12)● (13) Inscrit · n° 412                       │
 │    └──────────────────────────────────────────────────────────────────┘
```

(1) trait du chemin, (2) pastille du chemin.

| N° | Élément | Exemple | Place sur ordinateur | Style |
| --- | --- | --- | --- | --- |
| 4 | Rôle | PRÉPARATOIRE | Ligne 1, à gauche | Libellé ; Texte discret, Accent 2 pour Objectif intermédiaire, Accent pour Objectif principal |
| 5 | Compteur | `25 j` `23 h` `00 min` `00 s` | Ligne 1, à droite | Libellé, dans quatre cases fines ; chiffres en Accent 2, unités en Texte discret (§ 5.1) |
| 6, 7 | Course · Parcours, lien officiel | Trail du Lac · Le Tour du Lac ↗ | Ligne 2, à gauche | Nom ; Texte (le jaune est réservé au titre de l'écran). L'icône ↗ ouvre le site officiel dans un nouvel onglet |
| 3 | Date | 15 NOV. 2026 | Ligne 2, à droite | Libellé ; Texte discret. Le mois seul si la date est approximative (« JUILLET 2027 ») |
| 8 | Lieu · format | Mont-Clair · Trail court | Ligne 3 | Texte ; Texte discret |
| — | Distance | DISTANCE `24 km · 650 m D+` | Ligne 4 | Libellé à gauche, valeur en Texte |
| 9, 10 | Objectif | OBJECTIF `02:45:00` | Ligne 5 | Libellé à gauche, valeur en Accent 2 ; ligne absente si l'objectif est vide |
| 11 à 13 | Dossard | DOSSARD ● Inscrit · n° 412 | Ligne 6 | Libellé à gauche, puis le point et l'état (§ 3.5) |

- **Trois styles de texte seulement**, un seul interligne (1,5), le même écart entre toutes les lignes : *Nom* (Space Grotesk 1 rem, 600), *Texte* (Space Grotesk 0,8 rem), *Libellé* (Space Mono 0,7 rem, capitales).
- **Distance** : la distance, puis le D+ s'il est connu ; ligne absente si les deux sont vides.
- **Objectif** : trois formes seulement, `hh:mm:ss` (« 02:45:00 »), « Finisher », ou « Sub » suivi d'une durée en heures et minutes (« Sub 3h », « Sub 1h30 », « Sub 45 min »). Les durées sont écrites `hh:mm:ss` sur tout le site.
- **Date approximative** (mois seul) : pour une course Confirmée, compteur jusqu'au 1er du mois, à minuit ; pour une option, pas de compteur.
- **Sans compteur** (option dont seul le mois est connu) : la date remonte en ligne 1, à droite, son haut aligné sur celui du rôle.
- **Course · Parcours** trop longs pour une ligne : le parcours passe à la ligne suivante, sans le point.
- **Téléphone**, de haut en bas : rôle à gauche, son haut aligné sur celui du compteur à droite (un rôle trop long passe sur deux lignes, à côté du compteur et de la date) ; date juste sous le compteur, à droite ; un interligne ; nom ; puis les autres lignes sur toute la largeur. Pour un candidat, sans rôle ni compteur : date, un interligne, nom.
- Toucher la carte (hors icône ↗ et lien d'inscription) ouvre la page de la course.
- Une option isolée ne porte pas le mot « Option » : son cadre et son trait en pointillé suffisent.

### 3.2 Lien avec l'en-tête

- **D'ici là** : nombre d'étapes de la feuille de route avant la course du cap. Les options d'un même groupe comptent pour une seule étape.
- **Prochaine course** : la première course Confirmée à venir de la feuille de route, hors course du cap.

### 3.3 Statut, rôle et état d'une étape

La page montre les courses au statut Option ou Confirmée, à l'état À venir ([modèle de données](modele-donnees.md), § 4.1), datées du jour ou plus tard : les mêmes que celles de l'en-tête. S'y ajoutent les courses Confirmées dont la date est passée sans qu'elles soient marquées courues : elles restent en tête de la feuille de route, compteur « Course courue », jusqu'à ce qu'on saisisse leur résultat (« Marquer comme courue ») ; elles ne comptent pas pour l'en-tête. Une course sans date, une Option passée ou une course À surveiller n'y figure pas.

| Cas | Signification | Rendu |
| --- | --- | --- |
| Confirmée | Course retenue (rôle Préparatoire ou Plaisir) | Trait plein, pastille pleine en Texte discret |
| Rôle Objectif intermédiaire | Course clé de la saison | Pastille en Accent 2 |
| Rôle Objectif (affiché « Objectif principal ») | Une course visée ; il peut y en avoir plusieurs | Pastille en Accent, cerclée ; cadre en Accent |
| Groupe d'options | Plusieurs courses au statut Option pour un même créneau | Trait et cadre en pointillé ; une seule étape (§ 3.6) |
| Option isolée | Course envisagée, pas encore retenue | Trait et cadre en pointillé, pastille vide |

### 3.4 Page d'une course

Sans en-tête : la barre fine (« Cap sur … » et l'engrenage), puis le menu du site (onglet Objectif en avant) ; l'en-tête ne ferait que concurrencer le titre de la page. Une seule colonne de lecture, sur ordinateur comme sur téléphone (40 rem de large au plus). Plan de page (numéros stables) :

```
┌─ barre fine : Cap sur L'OCC                                  ⚙ ─┐
│ menu : … Objectif …                                              │
├──────────────────────────────────────────────────────────────────┤
│ (1) ← Feuille de route                                           │
│ (2) RÔLE · ÉTAPE x SUR y                                         │
│ (3) Course · Parcours (4) ↗                               (5) ✎  │
│ (6) Lieu · Format · jour abrégé, date, heure                     │
│ (7) Groupe · autres candidats : …                                │
│ (8) [Retenir cette course]  [Marquer comme courue]               │
│ ┌─ (22) fiche ───────────────────────────────────────┐           │
│ │ (13) DÉPART DANS  [137 j][22 h][30 min][00 s]      │           │
│ │ (9)  DISTANCE     45 km · 2 100 m D+               │           │
│ │ (10) D−           2 100 m                          │           │
│ │ (11) OBJECTIF     06:30:00                         │           │
│ │ (12) DOSSARD      ● Inscrit · n° 1287              │           │
│ │ (14) PRIX         58 €                             │           │
│ └────────────────────────────────────────────────────┘           │
│ ─────────────────────────────────────────────────                │
│ (24) ⌄ Préparation                              [Préparer]       │
│      plan, frise, semaine en cours, toutes les semaines          │
│ ─────────────────────────────────────────────────                │
│ (15) ⌄ Rôle dans la préparation                                  │
│      texte                                                       │
│ ─────────────────────────────────────────────────                │
│ (16) › Stratégie ou enchaînement                                 │
│ (17) › Logistique   (18) › Description   (19) › Liens            │
│ (20) ← Course précédente                 Course suivante → (21)  │
└──────────────────────────────────────────────────────────────────┘
```

Téléphone : même ordre, même colonne. Les textes (15) à (19) sont repliés (le titre seul, précédé d'un chevron), sauf le premier ; un toucher sur un titre plie ou déplie. Sur ordinateur, ils sont tous ouverts et ne se replient pas.

| N° | Élément | Contenu | Règle et style |
| --- | --- | --- | --- |
| 1 | Retour | « ← Feuille de route » ; « ← Calendrier » quand on arrive du Calendrier (`?depuis=calendrier`) | Texte discret |
| 2 | Rôle et rang | « Objectif intermédiaire · Étape 3 sur 6 » | Libellé ; rôle dans sa couleur (§ 3.1) |
| 3 | Titre | Course · parcours | Seul titre de l'écran : Space Grotesk 700, Accent |
| 4 | Lien officiel | ↗ | Seulement si le site officiel est connu |
| 5 | Modifier | Crayon rond | Bouton rond ; absent en lecture seule |
| 6 | Infos | Lieu · format · jour abrégé, date, heure (« dim. 7 mars 2027, 7 h 30 ») | Texte discret ; un champ vide n'est pas affiché |
| 7 | Groupe d'options | Nom du groupe et liens vers les autres candidates | Candidate d'un groupe seulement |
| 8 | Actions | « Retenir cette course », « Marquer comme courue » | Boutons à contour (§ 3.7) |
| 22 | Fiche | Les lignes de la carte de la feuille de route, complétées : 13, 9, 10, 11, 23, 12, 14 | Encadrée comme une carte (un bloc de données garde son cadre) ; libellé à gauche, valeur à droite ; une ligne sans valeur n'est pas affichée |
| 13 | Départ dans | Compte à rebours (§ 5.1) | Les quatre cases de la carte ; pas pour une option au mois seul |
| 9, 10 | Distance, D− | « 45 km · 2 100 m D+ », « 2 100 m » | Valeur en Texte |
| 11 | Objectif | « 06:30:00 » | Valeur en Accent 2, comme sur la carte |
| 23 | Précisions | « Sous 6 h 45 dans tous les cas. » | Juste sous l'Objectif, valeur en Texte ; absente si vide ; ni sur la carte, ni dans l'en-tête |
| 12 | Dossard | Point et état (§ 3.5) | Le seul endroit de la page où l'état est écrit |
| 14 | Prix | « 58 € » | Seulement s'il est connu |
| 24 | Préparation | Plan de préparation de la course : durée, frise des phases, semaine en cours, séances (spécification du [Calendrier](module-calendrier-specification.md), § 5) | Premier texte de la liste, ouvert par défaut ; course à venir avec une date seulement ; ancre `#preparation` ; bouton « Préparer » absent en lecture seule |
| 15 à 19 | Textes | Dans l'ordre ci-dessous, identique pour tous ; un texte vide n'est pas affiché | Liste à filets, dans un cadre ; titre en Texte, 600, casse normale, chevron à gauche |
| 20, 21 | Navigation | « ← course précédente » et « course suivante → » dans la feuille de route | Libellé, puis le nom en Texte |

| Texte | Contenu |
| --- | --- |
| 15 Rôle dans la préparation | Pourquoi cette course figure dans le plan |
| 16 Stratégie ou enchaînement | Plan de course, allures, liaison avec la course suivante |
| 17 Logistique | Transport, horaires, retrait du dossard |
| 18 Description | Quelques infos sur la course |
| 19 Liens | Site officiel, inscription, résultats en direct |

**Cartes des modules à venir** : chacune a une place fixe, la même sur toutes les pages de course. Une carte sans données n'est pas affichée et ne laisse pas de trou.

| Carte | Place |
| --- | --- |
| Badges UTMB | Dans le titre, sous le nom de la course |
| Météo du jour J | Dans la fiche, sous le compte à rebours |
| Suivi en course | Sous la fiche, toute la largeur, avant les textes |

### 3.5 Dossard

Sur la feuille de route et sur la page de la course : un point, puis l'état. L'état se déduit des champs `inscrit`, `dossard` et `ouverture_inscriptions`, comparés à la date du jour :

| État | Condition | Rendu |
| --- | --- | --- |
| Inscrit | `inscrit` vrai | ● plein en Accent 2, « Inscrit · n° 412 » (« Inscrit » seul sans numéro) |
| Inscription ouverte | Pas inscrit, ouverture passée ou du jour | ● plein et texte en Alerte, souligné : « Inscription ouverte ↗ », lien vers le site d'inscription s'il est connu |
| Ouvre bientôt | Pas inscrit, date d'ouverture connue et pas encore atteinte | ○ vide en Accent 2 : « Ouvre le 10/01/2027 » |
| Ouverture à venir | Pas inscrit, date d'ouverture inconnue | ○ vide en Texte discret : « Ouverture à venir » |

### 3.6 Groupe d'options (course à choisir)

**Affichage** (maquette `docs/maquettes/objectif.html`) :

- Une seule carte par groupe, placée dans la feuille de route à la date de sa première candidate.
- En tête : le nom du groupe (« Printemps 2027 »), dans le style du nom d'une course, en couleur Texte ; dessous, le rôle et « • x candidats », x étant calculé : le nombre de courses du groupe au statut Option et à l'état À venir (« • 1 candidat » au singulier).
- Puis un bloc par candidate, dans l'ordre chronologique, séparé par un filet : nom ↗ et date, lieu · format, distance, dossard. Ni rôle, ni objectif, ni compteur.
- Toucher une candidate ouvre sa page.

- **Rôles différents** : si les candidats n'ont pas le même rôle, les rôles se suivent (« Préparatoire · Plaisir • 2 candidats »).
- **Un seul candidat** : le groupe reste un groupe (« • 1 candidat ») tant qu'il n'est pas retenu.

**Gestion** (§ 3.7) : un groupe se crée dans le formulaire d'une course, champ Groupe d'options ; un candidat se retient depuis sa page.

### 3.7 Saisie et édition

Chacun ajoute, modifie et supprime ses courses à venir dans la page, sans autre outil. Le formulaire est celui du Palmarès (mode « à venir » ; le mode « courue » est celui du Palmarès) ([spécification du Palmarès](module-palmares-specification.md), § 10), étendu aux champs d'une course à venir : même panneau, mêmes boutons, mêmes contrôles de saisie. Un seul formulaire pour tout le site, pas de copie : une évolution vaut pour le Palmarès comme pour l'Objectif.

**Accès**

| Bouton | Place | Effet |
| --- | --- | --- |
| « + Ajouter une course » (« + Course » sur téléphone) | Bouton principal, le même que celui du Palmarès, en haut à droite de la feuille de route, au-dessus de la première carte | Ouvre un formulaire vide ; statut Confirmée et rôle Préparatoire proposés |
| « Modifier » | Page d'une course, à droite du titre | Ouvre le formulaire rempli |
| « Retenir cette course » | Page d'un candidat d'un groupe d'options | Après confirmation, le candidat passe en Confirmée et quitte le groupe ; les autres candidats passent À surveiller et quittent la feuille de route, sans être supprimés |
| « Marquer comme courue » | Page d'une course Confirmée, à partir du jour de la course | Ouvre le formulaire du Palmarès, pré-rempli de ce que la course connaît ; à l'enregistrement, la course passe à l'état Courue, quitte la feuille de route et rejoint le Palmarès |

Site partagé en lecture seule : aucun de ces boutons.

**Formulaire**, en six blocs ; les quatre derniers sont repliés à l'ouverture d'un formulaire vide (tous ouverts pour une course existante). Plan de page : numéros stables, repris des échanges de validation.

```
┌──────────────────────────────────────────────────┐
│ Ajouter une course (1)                       × (2)│
├──────────────────────────────────────────────────┤
│ ▾ Course (3)                                      │
│  Course * (7)          Parcours (8)               │
│  Date * (4)            ☐ Jour inconnu (5)         │
│  Heure de départ (6)   Lieu (9)                   │
│  Type * (10)           Format * (11)              │
│  Description (34)                       0 / 1 000 │
│  Distance (12)         D+ (13)                    │
│  D− (14)                                          │
│ ▾ Place dans le plan (15)                         │
│  Statut (16)           Rôle (17)                  │
│  Groupe d'options (18)  [si statut Option]        │
│ ▸ Préparation (20)                                │
│  Objectif (30)                                    │
│  Rôle dans la préparation (31)                    │
│  Stratégie ou enchaînement (32)                   │
│ ▸ Dossard (19)                                    │
│  ☐ Inscrit (26)        N° de dossard (27)         │
│  Prix (28)             Ouverture des inscr. (29)  │
│  Site d'inscription (36)                          │
│ ▸ Logistique (38)                                 │
│  Logistique (33)                                  │
│ ▸ Liens (21)                                      │
│  Site officiel (35)                               │
│  Résultats en direct (37)                         │
│  message (22)                                     │
│  [Supprimer (23)]      [Annuler (24)] [Enregistrer (25)]
└──────────────────────────────────────────────────┘
```

Sur téléphone : le panneau passe en plein écran, une seule colonne, même ordre ; la date et « Jour inconnu » restent côte à côte.

| Bloc | Champs |
| --- | --- |
| Course | Course et parcours ; date, ou mois seul (case « Jour inconnu ») ; heure de départ ; lieu ; type et format ; description (1 000 caractères au plus) ; distance, D+ et D− |
| Place dans le plan | Statut (Confirmée, Option, À surveiller) ; rôle ; groupe d'options, seulement pour une Option : un groupe existant, ou « Nouveau groupe… » et son nom |
| Préparation | Objectif ; précisions (texte libre, 100 caractères au plus, compteur) ; rôle dans la préparation ; stratégie ou enchaînement |
| Dossard | Case « Inscrit » ; numéro ; prix ; date d'ouverture des inscriptions ; site d'inscription |
| Logistique | Logistique |
| Liens | Site officiel ; résultats en direct |

- **Boutons** : les boutons communs du site (design, § 1) ; « + Ajouter une course » est un bouton principal, le crayon « Modifier » un bouton rond ; « Retenir cette course » et « Marquer comme courue » des boutons à contour, comme « Annuler » ; « Enregistrer » est le bouton principal (plein).
- **Obligatoires** : course ; type et format ; date (ou mois) pour une course Confirmée ou Option. Une course À surveiller peut rester sans date.
- **Exemples** dans les champs vides : « ex. 07:30 », « ex. Mont-Clair », « ex. 02:45:00, Finisher ou Sub 3h », « ex. Partir prudemment, sous 4 h dans tous les cas », « ex. https://… ».
- **Objectif normé** : un temps `hh:mm:ss`, « Finisher », « Sub 3h » / « Sub 1h30 » ou « Sub 45 min » ; tout le reste (intention, fourchette, contexte) va dans Précisions.
- **Contrôles de saisie** :
  - date du jour ou à venir (une date passée déjà enregistrée reste modifiable) ; heure : `07:30`, `7h30`, `730` ;
  - objectif : une durée, écrite comme dans le Palmarès (`2:45:00`, `2h45`, chiffres seuls lus par la droite) et rangée au format `hh:mm:ss` (« 02:45:00 ») ; ou « Finisher » ; ou « Sub » suivi d'une durée en heures et minutes (« Sub 3h », « Sub 1h30 », « Sub 45 min »). Majuscules remises à l'enregistrement (« finisher » devient « Finisher »). Autre chose : « Format attendu : 02:45:00, Finisher ou Sub 3h » ;
  - nombres positifs ; liens commençant par `http://` ou `https://`.
- Un champ en erreur est signalé sous le champ ; « Enregistrer » reste sans effet tant qu'une erreur demeure.
- **Enregistrer** range la course et met à jour la page, en-tête compris ; **Annuler**, ou « × », ferme sans rien changer.
- **Supprimer** : seulement dans le formulaire d'une course existante, après confirmation (« Supprimer cette course ? Cette action est définitive. »). Depuis la page de la course supprimée, retour à la feuille de route.

## 4. Données d'une course

| Groupe | Champs | Sert à |
| --- | --- | --- |
| Identité | Course, parcours, lien officiel, lieu, coordonnées (latitude, longitude) | Affichage, météo |
| Date | Jour et heure de départ | Comptes à rebours, météo, ordre de la feuille de route |
| Profil | Distance, D+, D−, route ou trail, label et index UTMB | Graphique de difficulté, badges |
| Place dans le plan | Statut, rôle, état, groupe d'options ([modèle de données](modele-donnees.md), § 4.1) | Rendu de l'étape |
| Dossard | Inscrit, numéro, prix, ouverture des inscriptions | Cellule Dossard |
| Préparation | Temps cible, rôle, enchaînement, stratégie, logistique | Cellules de l'étape |
| Stratégie de course | Points de passage (distance, temps visé), objectifs chiffrés, lien des résultats en direct | Suivi en course |
| Résultat | Temps réalisé | Comparaison à l'objectif ; plus tard, Palmarès |

Cette liste vit dans Supabase, une par utilisateur ; elle ne contient ni réservation ni donnée personnelle de tiers.

## 5. Briques dynamiques

### 5.1 Comptes à rebours

- Quatre cases (jours, heures, minutes, secondes : `25 j` `23 h` `00 min` `00 s`), sur chaque étape de la feuille de route (sauf les candidates d'un groupe) et dans la fiche de la page de la course (§ 3.4) ; chiffres en Accent 2, unités en Texte discret. Heures, minutes et secondes sur deux chiffres. Mise à jour chaque seconde, un seul minuteur pour toute la page.
- Le temps restant est le temps réel jusqu'au départ : un changement d'heure (été, hiver) d'ici là est compté.
- Date approximative (mois seul) : jusqu'au 1er du mois, à minuit, pour une course Confirmée ; pas de compte à rebours pour une option.
- L'heure de départ est saisie en heure locale de la course, sans fuseau ; elle est lue dans le fuseau du navigateur. Correct tant que la course et le coureur sont dans le même fuseau (France, Espagne, Italie). Une course dans un autre fuseau demandera de préciser le fuseau (à traiter le moment venu).
- Après le départ, le compteur est remplacé par « Course courue », en Libellé.

### 5.2 Graphique de difficulté

- Chaque course est placée dans le temps et selon son **km-effort** : distance + D+/100 + D−/200. Le D+/100 est la règle standard du trail ; le D−/200 ajoute 1 km par tranche de 200 m de descente.
- Pour une course en boucle dont le D− n'est pas connu, D− = D+.
- Rendu selon le statut : étapes reliées par une ligne, candidats d'une course à choisir en cercles vides, course à définir en fourchette (trait pointillé), objectif mis en avant.
- Touche ou survol d'un point : détail de la course. Sous le graphique, un tableau repliable donne les chiffres.
- Affiché pour tous les utilisateurs, repliable.

### 5.3 Suivi en course

S'active pour toute course qui a une stratégie de passage. Il sert à suivre une course en direct, à partir des temps lus sur la page officielle des résultats.

- **Une carte par point de passage** : distance, temps visé, champ de saisie du temps réel.
- **Saisie** : formats `mm:ss` ou `h:mm:ss`, ou chiffres seuls de 3 à 6 caractères lus par la droite (`2629` = 26:29, `14425` = 1:44:25), car le clavier numérique des téléphones n'a pas de « : ». Le temps est remis au format horloge à la validation.
- **Pour chaque point saisi** : écart au temps visé (en avance ou en retard) et allure moyenne du tronçon.
- **Projection d'arrivée** : temps visé à l'arrivée + écart constaté au dernier point saisi. Une fois l'arrivée saisie, le temps réel remplace la projection.
- **Jauge** : barre de progression entre deux bornes, avec les objectifs chiffrés marqués dessus (par exemple cible, objectif phare, record personnel).
- **Message** : situe la projection par rapport aux objectifs.
- **Mémoire** : les temps saisis sont gardés dans le navigateur, sur l'appareil utilisé ; rien n'est envoyé ailleurs.
- **Lien** vers la page officielle des résultats en direct.

Aucune lecture automatique des résultats officiels : les sites de chronométrage n'offrent pas d'accès public connu, d'où la saisie manuelle.

### 5.4 Météo du jour J

S'active pour toute course qui a des coordonnées et une heure de départ.

- **Source** : Open-Meteo (gratuit, sans clé ; inclut le modèle européen ECMWF, référence à courte échéance).
- **Contenu** : ciel et température à l'heure du départ, vent, et la plus forte probabilité de pluie sur la durée prévue de la course. La date et l'heure de la prévision sont indiquées.
- **Disponibilité** : seulement quand la date de course entre dans l'horizon de prévision du service ; avant, la carte l'indique.
- **Mise en cache** : 15 minutes, pour ne pas interroger le service à chaque affichage.
- **Après la course** : « Course passée ».
- **Erreur** : « Météo indisponible pour l'instant ».

### 5.5 Badges UTMB

Pour les courses labellisées : catégorie et index UTMB, affichés dans le titre de la page de la course.

## 6. Téléphone

- Feuille de route : ordre des éléments au § 3.1.
- Page d'une course : plan du § 3.4 ; sans en-tête, la fiche dans le premier écran, les textes repliés sauf le premier.
- Les cartes du suivi en course passent sur deux colonnes ; les libellés secondaires de la jauge sont masqués pour éviter les chevauchements.
- Les champs de saisie ouvrent le clavier numérique.

## 7. Hors périmètre du module

- **Courses à surveiller** : module séparé (jalon 2).
- **Résultats et historique** : module Palmarès.

## 8. Critères d'acceptation (proposés, à valider)

- [ ] La page affiche la feuille de route et la page de chaque course des deux profils pilotes depuis leur liste de courses, sans contenu écrit en dur dans la page.
- [ ] Les cinq statuts sont rendus comme décrit au § 3.3.
- [ ] Le graphique de difficulté est calculé depuis la même liste de courses, pour les deux profils.
- [ ] Le suivi en course et la météo s'activent dès qu'une course a les données nécessaires.
- [ ] La page fonctionne sur ordinateur et sur iPhone, dans les deux thèmes.
- [ ] L'en-tête est conforme au chapitre 4 de la spécification générale.

## 9. Questions ouvertes

- [x] Ordre des cellules : identique pour tous, fixé par la page d'une course (§ 3.4) (décidé le 23 oct. 2026).
- [x] Course passée : elle quitte la feuille de route et rejoint le Palmarès (décidé le 19 oct. 2026).
- [x] Course à choisir : une liste dans l'étape, une ligne par candidate ; chacune ouvre sa page. Le comparatif viendra du graphique de difficulté (décidé le 23 oct. 2026).
- [x] Détail d'une course : une page dédiée par course plutôt qu'une étape dépliée ou une fenêtre ; icône ↗ pour le site officiel (décidé le 23 oct. 2026).
- [ ] Inscriptions fermées (ou complet) sans être inscrit : un cinquième état ? Il demanderait un champ de plus (date de clôture ou case « complet »).
- [x] Groupe d'options : créé dans le formulaire ; candidat retenu depuis sa page, les autres passent À surveiller ; rôles différents listés ; un seul candidat reste un groupe (décidé le 24 oct. 2026).
- [ ] Choix de la course de l'en-tête (cap) : seulement dans les Préférences, ou aussi depuis la page Objectif ? À revoir une fois la feuille de route construite.

## 10. Contrôles

Jeu d'essai, données fictives, à la date du 20 octobre 2026 à 10 h, heure de Paris. Thème Bleu et orange, aucun cap choisi. Ces courses :

| N° | Course · Parcours | Date, heure | Lieu · format | Distance, D+ | Statut, rôle, état | Groupe | Objectif | Dossard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Trail du Lac · Le Tour du Lac | 15 nov. 2026, 9 h | Mont-Clair · Trail court | 24 km, 650 m | Confirmée, Préparatoire, À venir | — | 02:45:00 | Inscrit, n° 412, 32 € |
| 2 | Corrida de Noël | 13 déc. 2026, 18 h 30 | Ville-Haute · 10 km | 10 km, 40 m | Confirmée, Plaisir, À venir | — | Sub 45 min | Pas inscrit, ouverture le 1er nov. 2026 |
| 3 | Trail des Gorges | 7 mars 2027, 7 h 30 | Mont-Clair · Trail long | 45 km, 2 100 m, D− 2 100 m | Confirmée, Objectif intermédiaire, À venir | — | 06:30:00 | Inscrit, n° 1287, 58 € |
| 4 | Trail des Cimes | 30 mai 2027 | Haut-Val · Trail long | 42 km, 2 500 m | Option, Préparatoire, À venir | Printemps 2027 | — | Pas inscrit, ouverture le 10 janv. 2027 |
| 5 | Ultra du Plateau · Le 55 | 26 juin 2027 | Plaine-Neuve · Trail long | 55 km, 2 800 m | Option, Préparatoire, À venir | Printemps 2027 | — | Pas inscrit, ouverture le 1er sept. 2026, site d'inscription connu |
| 6 | Trail de la Forêt | juillet 2027 (mois seul) | Bois-Joli · Trail court | 30 km, 1 200 m | Option, Préparatoire, À venir | — | — | Pas inscrit, ouverture inconnue |
| 7 | Trail des Crêtes | 28 août 2027, 5 h | Mont-Clair · Ultra-trail | 60 km, 3 500 m | Confirmée, Objectif, À venir | — | Finisher | Inscrit, n° 88 |
| 8 | Cross des Collines | 6 déc. 2026 | Ville-Haute · Trail découverte | 12 km, 300 m | Confirmée, Préparatoire, Abandonnée | — | — | — |
| 9 | Trail des Sommets | 10 sept. 2028 | Haut-Val · Ultra-trail | 80 km, 5 000 m | À surveiller | — | — | — |
| 10 | Semi de San Sebastián | 4 oct. 2026 | Semi-marathon | 21,1 km | Confirmée, Préparatoire, Courue | — | — | — |

Trail des Gorges a aussi : rôle dans la préparation « Répétition générale du matériel et de la nutrition. », stratégie « Partir prudemment jusqu'au premier ravitaillement. », logistique « Navette depuis le stade à 6 h 30. », description « Boucle par les crêtes et les gorges. », site officiel, site d'inscription et résultats en direct. Corrida de Noël n'a que son site officiel.

Résultats attendus, feuille de route :

- Six étapes, dans cet ordre : Trail du Lac, Corrida de Noël, Trail des Gorges, Printemps 2027, Trail de la Forêt, Trail des Crêtes. Ni Cross des Collines (abandonnée), ni Trail des Sommets (à surveiller), ni Semi de San Sebastián (courue).
- En-tête : « Cap sur Trail des Crêtes » (et non Trail des Sommets, à surveiller) ; « 5 courses » D'ici là ; « prochaine course · Trail du Lac · J-26 ».
- Trail du Lac : rôle PRÉPARATOIRE ; compteur `26 j` `00 h` `00 min` `00 s` (une heure de plus avec le passage à l'heure d'hiver, le 25 octobre) ; « Trail du Lac · Le Tour du Lac ↗ » ; date 15 NOV. 2026 ; « Mont-Clair · Trail court » ; DISTANCE 24 km · 650 m D+ ; OBJECTIF 02:45:00 ; DOSSARD ● Inscrit · n° 412.
- Corrida de Noël : rôle PLAISIR ; compteur `54 j` `09 h` `30 min` `00 s` ; DISTANCE 10 km · 40 m D+ ; OBJECTIF Sub 45 min ; DOSSARD ○ Ouvre le 01/11/2026.
- Trail des Gorges : rôle OBJECTIF INTERMÉDIAIRE en Accent 2, pastille en Accent 2 ; compteur `137 j` `22 h` `30 min` `00 s` ; OBJECTIF 06:30:00.
- Printemps 2027 : une seule carte, en pointillé ; « Printemps 2027 », puis « PRÉPARATOIRE • 2 CANDIDATS » ; Trail des Cimes (30 MAI 2027, DOSSARD ○ Ouvre le 10/01/2027), puis Ultra du Plateau · Le 55 (26 JUIN 2027, DOSSARD ● Inscription ouverte ↗, en Alerte) ; ni rôle, ni objectif, ni compteur pour les candidates.
- Trail des Cimes sorti du groupe (groupe vidé dans ses données) : la carte Printemps 2027 affiche « • 1 candidat », Trail des Cimes devient une option isolée, et l'en-tête affiche « 6 courses ».
- Trail de la Forêt : cadre en pointillé, pastille vide ; rôle PRÉPARATOIRE, sans le mot « Option » ; date JUILLET 2027 ; pas de compteur ; pas de ligne Objectif ; DOSSARD ○ Ouverture à venir.
- Trail des Crêtes : rôle OBJECTIF PRINCIPAL en Accent, cadre en Accent, pastille cerclée ; compteur `311 j` `19 h` `00 min` `00 s` ; OBJECTIF Finisher ; DOSSARD ● Inscrit · n° 88.
- Une seconde plus tard, les secondes de chaque compteur sont passées à 59 (`25 j 23 h 59 min 59 s` pour Trail du Lac).
- Au 15 novembre 2026 à 9 h, le compteur du Trail du Lac affiche « Course courue ».
- Toucher la carte du Trail du Lac ouvre sa page ; toucher ↗ ouvre son site officiel dans un nouvel onglet, sans ouvrir la page ; toucher « Inscription ouverte ↗ » ouvre le site d'inscription de l'Ultra du Plateau.
- Toucher Trail des Cimes, dans la carte du groupe, ouvre la page de Trail des Cimes.
- Téléphone : sur chaque carte, le rôle à gauche aligné sur le compteur à droite (OBJECTIF INTERMÉDIAIRE sur deux lignes), la date dessous à droite, un interligne, puis le nom ; rien ne dépasse de l'écran.
- Trail de la Forêt (sans compteur) : la date JUILLET 2027 en haut à droite, face au rôle.
- Trail du Lac avec le parcours « Le Grand Tour du Lac de Mont-Clair », sur téléphone : « Trail du Lac » puis, à la ligne, le parcours, sans le point.
- Trail de la Forêt passé en Confirmée : compteur `253 j` `14 h` `00 min` `00 s`, jusqu'au 1er juillet 2027 à minuit.
- Thème changé : seules les couleurs changent.

Résultats attendus, page d'une course :

- Trail des Gorges : pas d'en-tête, le menu en haut ; « ← Feuille de route » ; « Objectif intermédiaire · Étape 3 sur 6 » ; « Trail des Gorges ↗ » ; « Mont-Clair · Trail long · dim. 7 mars 2027, 7 h 30 ».
- Trail des Gorges, fiche encadrée : DÉPART DANS `137 j` `22 h` `30 min` `00 s` ; DISTANCE 45 km · 2 100 m D+ ; D− 2 100 m ; OBJECTIF 06:30:00 ; DOSSARD ● Inscrit · n° 1287 ; PRIX 58 €. L'état du dossard n'est écrit qu'une fois sur la page.
- Trail des Gorges, textes dans cet ordre : Préparation (plan de 16 semaines, durée par défaut du format Trail long ; spécification du Calendrier, § 5), Rôle dans la préparation, Stratégie ou enchaînement, Logistique, Description, Liens (Site officiel, Inscription, Résultats en direct).
- Trail des Gorges, navigation : « ← course précédente · Corrida de Noël », « course suivante · Trail des Cimes → ».
- Corrida de Noël : fiche DISTANCE 10 km · 40 m D+, OBJECTIF Sub 45 min, DOSSARD ○ Ouvre le 01/11/2026 ; ni ligne D−, ni ligne Prix ; seuls les textes Préparation (plan de 8 semaines du format 10 km) et Liens (Site officiel).
- Ordinateur : pleine largeur de page, comme les autres pages ; la fiche encadrée ; les six textes (Préparation comprise) ouverts, sans pouvoir les replier. Téléphone (390 px) : rien ne dépasse ; le compte à rebours tient sur une ligne ; la fiche commence dans le premier écran ; premier texte ouvert, les quatre autres repliés ; toucher un titre ouvre le texte.
- Trail des Cimes : « Préparatoire · Étape 4 sur 6 » ; « Printemps 2027 » et un lien vers l'autre candidate, Ultra du Plateau · Le 55.
- Trail du Lac : pas de course précédente. Trail des Crêtes : pas de course suivante.
- Adresse d'une course inconnue, d'un autre utilisateur, ou absente de la feuille de route : « Course introuvable. » et le lien « ← Feuille de route ».
- Bouton retour du navigateur, depuis une page de course : retour à la feuille de route.
- Site partagé en lecture seule : la feuille de route et les pages de course du propriétaire s'affichent à l'identique.
- Chargement de la feuille de route et d'une page de course (ordinateur, téléphone) : à l'instant où la page devient visible, le menu (et l'en-tête, sur la feuille de route) est en place et le contenu n'a plus à bouger.
- Feuille de route, thème Bleu et orange : nom de la course en Texte, date en Texte discret, chiffres du compteur et objectif en Accent 2 ; libellés à 0,7 rem ; indicateurs de l'en-tête en Texte.

Résultats attendus, saisie et édition (mêmes données, même date) :

- « + » ouvre un formulaire vide : statut Confirmée, rôle Préparatoire ; blocs Préparation, Dossard, Logistique et Liens repliés.
- Ajouter « Trail des Brumes », 18 avril 2027, 8 h, objectif saisi `15000` (lu 1:50:00) : il s'affiche « 01:50:00 » ; la carte prend place entre Trail des Gorges et Printemps 2027 ; l'en-tête affiche « 6 courses ».
- Objectif « vite » : « Format attendu : 02:45:00, Finisher ou Sub 3h » sous le champ ; « Enregistrer » reste sans effet. « finisher » est rangé « Finisher », « sub 3h » est rangé « Sub 3h ».
- Date du 1er octobre 2026 : erreur sous la date. Site officiel « example.org » : erreur sous le champ.
- Case « Jour inconnu », juillet 2027 : la carte affiche JUILLET 2027.
- Statut Option : le champ Groupe d'options apparaît et propose « Printemps 2027 » ; le choisir : la carte du groupe affiche « • 3 candidats ». Statut Confirmée : le champ disparaît.
- Page Trail des Gorges, « Modifier » : formulaire rempli ; objectif changé en `6:15:00` : la page affiche « 06:15:00 ».
- Supprimer Corrida de Noël, confirmation acceptée : elle disparaît ; l'en-tête affiche « 4 courses ».
- Page Trail des Cimes, « Retenir cette course », confirmation acceptée : Trail des Cimes devient une étape Confirmée au 30 mai 2027 ; Ultra du Plateau quitte la feuille de route (À surveiller) ; la carte Printemps 2027 disparaît ; l'en-tête affiche « 5 courses ».
- Page Trail du Lac le 20 octobre 2026 : pas de « Marquer comme courue ». Le 15 novembre 2026 à 14 h : le bouton est là ; il ouvre le formulaire du Palmarès rempli (15 novembre 2026, Trail du Lac, Le Tour du Lac, Trail, Trail court, 24 km, 650 m, Préparatoire) ; temps `24110` : à l'enregistrement, Trail du Lac quitte la feuille de route et rejoint le Palmarès, avec un temps de 2 h 41 min 10 s.
- Site partagé en lecture seule : ni « + », ni « Modifier », ni « Retenir cette course », ni « Marquer comme courue ».
- Téléphone : le formulaire occupe tout l'écran et défile, sans déborder sur les côtés.

Résultats attendus, formulaire en détail (écritures relues par le banc d'essai) :

- Sur la feuille de route, un bouton « + Ajouter une course » en haut à droite, au-dessus de la première carte ; il ouvre « Ajouter une course » : six blocs, Course et Place dans le plan ouverts, les quatre autres repliés ; statut Confirmée, rôle Préparatoire, groupe d'options caché.
- Enregistrer sans rien saisir : « Champ obligatoire. » sous Date, Course et Format, « Choisis un type. » sous Type ; rien n'est écrit.
- Date au 1er janvier 2026 : « La date d'une course à venir ne peut pas être dans le passé. » ; heure `25h` : « Heure illisible (ex. 07:30). » ; objectif `rapide` : « Format attendu : 02:45:00, Finisher ou Sub 3h » ; lien `www.exemple.org` : « Lien attendu : il commence par http:// ou https://. » ; prix −3 : « Le nombre doit être positif. » ; le bloc d'un champ en erreur se déplie.
- Objectif : `2:45:00`, `2h45` et `24500` sont rangés `02:45:00` ; `finisher` devient `Finisher` ; `sub 3h`, `Sub 1h30`, `sub1h5`, `SUB 45 min` et `sub 45` deviennent `Sub 3h`, `Sub 1h30`, `Sub 1h05`, `Sub 45 min` et `Sub 45 min`. Heure : `07:30`, `7h30`, `730` et `0730` donnent `07:30` ; `7h` donne `07:00`.
- Trail, distance 28,5 : format Trail court proposé. Description : compteur « 0 / 1 000 ».
- Saisie complète valide : une course est créée à l'état À venir, statut Confirmée, rôle Préparatoire, avec les valeurs saisies.
- Statut Option : le groupe d'options apparaît, avec « Printemps 2027 » et « Nouveau groupe… » ; un nouveau groupe sans nom : « Écris le nom du groupe. ».
- Case « Jour inconnu » cochée : la date devient un mois ; `2027-10` est rangé au 1er octobre 2027, sans heure, date approximative.
- Statut À surveiller : une course s'enregistre sans date.
- Page de Trail des Gorges, « Modifier » : formulaire rempli (objectif 06:30:00, heure 07:30, D− 2 100…), tous les blocs ouverts ; objectif `Sub 6h30` et date du 8 mars 2027 mis à jour sur la ligne de la course, sans toucher à son état ; ni « Retenir » ni « Marquer comme courue ».
- « Supprimer » : « Supprimer cette course ? Cette action est définitive. » ; Annuler n'écrit rien ; confirmer efface la ligne et ramène à la feuille de route.
- Page de Trail des Cimes (option d'un groupe), « Retenir cette course » : après confirmation, Ultra du Plateau passe À surveiller et quitte le groupe, Trail des Cimes devient Confirmée, hors groupe.
- Trail du Lac au jour de la course : « Marquer comme courue » ouvre le formulaire du Palmarès (Course, Résultat, Classements, Montre), pré-rempli, sans « Supprimer » ; à l'enregistrement, la course passe à l'état Courue.
- Panne d'enregistrement : « Enregistrement impossible pour l'instant. », le formulaire reste ouvert.
- Palmarès : le formulaire garde ses quatre blocs. Téléphone : le formulaire ne déborde pas.
- Site partagé en lecture seule : ni « + », ni « Modifier », ni « Retenir ».
- Trail du Lac passé (10 octobre 2026, Confirmée, À venir, jamais marquée courue) : première étape de la feuille de route, compteur « Course courue », bouton « Marquer comme courue » sur sa page ; l'en-tête garde « Cap sur Trail des Crêtes » et « 5 courses ». Une Option passée n'apparaît pas.
