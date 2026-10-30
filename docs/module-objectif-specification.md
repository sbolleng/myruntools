# Objectif · spécification fonctionnelle

Version 0.36 · 30 octobre 2026 · [Retour au sommaire](README.md) · Jalon 1 (octobre 2026) · preuve de concept

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
- **Page d'une course** : tout ce qu'il faut savoir sur une course (§ 3.4). C'est une **modale** : elle s'ouvre au-dessus de la page d'origine (feuille de route, Calendrier ou En un coup d'œil) quand on touche une course, sans changer de page. Elle garde son adresse (`course.html?id=…`) : on peut la mettre en favori pour le jour J ; ouverte ainsi, elle s'affiche au-dessus de la feuille de route. Le bouton retour du téléphone la ferme.

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

Une modale, comme le formulaire d'une course : au-dessus de la page d'origine, qui reste en place (position et vue conservées) et s'assombrit. Une seule colonne de lecture, du même gabarit que les pages du site sur ordinateur (contenu de 896 px, marges de 2 rem). Elle passe sous les fenêtres de saisie (formulaire d'une course, séance, plan), qui s'ouvrent par-dessus.

**Ouvrir** : toucher une course, où qu'elle soit (étape, candidat, jour ou case du Calendrier, rendez-vous clé, étape de « D'ici là »). Un clic avec Ctrl, Cmd ou Maj, ou le bouton du milieu, ouvre l'adresse dans un nouvel onglet.

**Fermer** : la croix (barre du haut, sans lien de retour), Échap, un toucher à côté de la modale, ou le retour du navigateur ou du téléphone. Fermer ramène exactement là où on était. Quand la course a été ouverte par son adresse, la feuille de route reste dessous. Une course supprimée, courue ou sortie de la feuille de route ferme la modale.

**Changer de course** : « course précédente » et « course suivante » changent la course dans la modale, sans la fermer ni ajouter d'entrée à l'historique ; l'adresse suit la course ouverte.

**Téléphone** : la modale prend tout l'écran, en montant du bas (animation courte, supprimée si l'appareil demande moins de mouvements) ; la croix la ferme. (Le bord transparent essayé d'abord a été abandonné : de la place perdue et des fermetures par erreur.)

Plan de page (numéros stables ; le (1) est dans la barre du haut, fixe, avec la croix) :

```
┌─ barre fine : Cap sur L'OCC                                  ⚙ ─┐
│ menu : … Objectif …                                              │
├──────────────────────────────────────────────────────────────────┤
│                                                  (5) ✎  (1) ×   │
│ (2) RÔLE · ÉTAPE x SUR y                                         │
│ (3) Course · Parcours (4) ↗                                      │
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
│ (24) ⌄ Préparation                              [Paramétrer le plan]│
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
| 1 | Fermer | Croix ronde, tout à droite de la barre du haut (fixe) ; pas de lien « ← Feuille de route » | Bouton rond ; ferme la modale |
| 2 | Rôle et rang | « Objectif intermédiaire · Étape 3 sur 6 » | Libellé ; rôle dans sa couleur (§ 3.1) |
| 3 | Titre | Course · parcours | Seul titre de l'écran : Space Grotesk 700, Accent |
| 4 | Lien officiel | ↗ | Seulement si le site officiel est connu |
| 5 | Modifier | Crayon rond | Bouton rond, dans la barre du haut, à gauche de la croix ; absent en lecture seule |
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
| 24 | Préparation | Plan de préparation de la course : durée, frise des phases, semaine en cours, séances (spécification du [Calendrier](module-calendrier-specification.md), § 5) | Premier texte de la liste, ouvert par défaut ; course à venir avec une date seulement ; date approximative : plan au 1er du mois, mentionné sous la ligne du plan ; ancre `#preparation` ; bouton « Paramétrer le plan » absent en lecture seule |
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

Chacun ajoute, modifie et supprime ses courses à venir dans la page, sans autre outil. La saisie se fait dans la **fiche d'une course** (§ 3.8) : une seule fiche de champs pour les courses à venir et courues (Objectif et Palmarès), dans la même feuille que la page d'une course, avec les mêmes contrôles de saisie.

**Accès**

| Bouton | Place | Effet |
| --- | --- | --- |
| « + Ajouter une course » (« + Course » sur téléphone) | Bouton principal, le même que celui du Palmarès, en haut à droite de la feuille de route, au-dessus de la première carte | Ouvre un formulaire vide ; statut Confirmée et rôle Préparatoire proposés |
| « Modifier » | Page d'une course, crayon de la barre du haut | Bascule la feuille en édition, fiche remplie (§ 3.8) |
| « Retenir cette course » | Page d'un candidat d'un groupe d'options | Après confirmation, le candidat passe en Confirmée et quitte le groupe ; les autres candidats passent À surveiller et quittent la feuille de route, sans être supprimés |
| « Marquer comme courue » | Page d'une course Confirmée, à partir du jour de la course | Bascule la feuille en édition, fiche d'une course courue, pré-remplie de ce que la course connaît ; à l'enregistrement, la course passe à l'état Courue, quitte la feuille de route et rejoint le Palmarès |

Site partagé en lecture seule : aucun de ces boutons.

**Champs d'une course à venir**, par bloc, dans l'ordre de la fiche (§ 3.8) ; pour une nouvelle course, Course et Place dans le plan sont ouverts, les autres repliés (tous ouverts pour une course existante). Numéros du formulaire : ceux du § 3.8 (F).

| Bloc | Champs |
| --- | --- |
| Course | Course et parcours ; date, ou mois seul (case « Date approximative (mois seulement) » : à cocher quand le jour n'est pas encore fixé ; on ne saisit alors qu'un mois) ; heure de départ ; lieu ; type et format ; distance, seule sur sa ligne ; D+ et D− côte à côte ; description (1 000 caractères au plus), dont l'exemple dit que c'est un texte libre : « Texte libre pour donner des détails sur la course : ex. boucle par les crêtes, 3 ravitaillements, barrière horaire au km 30, descente technique » |
| Place dans le plan | Statut (Confirmée, Option, À surveiller) ; rôle ; groupe d'options, seulement pour une Option : un groupe existant, ou « Nouveau groupe… » et son nom |
| Préparation | En tête, le plan de préparation, comme sur la page de la course (§ 3.4) : durée et dates (39), frise des phases (40), bouton principal « Paramétrer le plan » (41). Seulement pour une course Confirmée ou Option ; calculé sur la date, le format et le statut saisis, il suit leurs changements. Tant que la date ou le format manque, une ligne d'attente (42) remplace 39 et 40 et le bouton est grisé : « Choisis d'abord la date et le format. ». Date approximative : le plan vise le 1er du mois, avec sous 39 la mention « Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie. » ; case décochée, le plan se recalcule sur la date précise, selon les règles (Calendrier, § 5.1). Date précise changée : les phases réglées à la main suivent la course, au même numéro de semaine. Le bouton ouvre la fenêtre de réglage (Calendrier, § 5.3) par-dessus le formulaire, avec « Valider » : rien n'est rangé avant « Enregistrer » du formulaire, qui range la course, sa durée de prépa et ses phases modifiées ; « Annuler » abandonne le tout ; Échap ne ferme que la fenêtre du plan. Même comportement pour une nouvelle course et une course existante. Puis objectif ; précisions (texte libre, 100 caractères au plus, compteur) ; rôle dans la préparation ; stratégie ou enchaînement |
| Logistique | Logistique |
| Dossard | Date d'ouverture des inscriptions et case « Inscrit » ; site d'inscription ; numéro de dossard et prix. Le numéro ne se saisit qu'une fois « Inscrit » coché (grisé sinon ; non rangé sans inscription) |
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
- **Enregistrer** range la course et met à jour la page, en-tête compris ; **Annuler** revient sans rien changer (§ 3.8).
- **Supprimer** : seulement dans le formulaire d'une course existante, après confirmation (« Supprimer cette course ? Cette action est définitive. »). Depuis la page de la course supprimée, retour à la feuille de route.

### 3.8 Fiche d'une course : consultation et édition

**Principe** : consulter et modifier une course se font dans **une seule feuille à deux modes**, avec **une seule fiche de champs** pour les courses à venir (Objectif) et courues (Palmarès) : pas de fenêtres empilées, un champ toujours à la même place. (Essayée en version d'essai, `?essai=v2`, puis retenue le 29 oct. 2026.)

**Numéros** : ceux de la page d'une course (§ 3.4) précédés de C, ceux de la fiche précédés de F ; un élément nouveau prend le numéro suivant de sa série.

#### Deux modes, une feuille

| | Consultation | Édition |
| --- | --- | --- |
| Contenu | La page d'une course (§ 3.4) | La fiche de champs (ci-dessous) |
| Barre du haut, fixe | Crayon (C5) puis croix (C1), à droite | « Annuler » (F24) à gauche, « Enregistrer » (F25) à droite ; dessous, le mode (F1) en libellé : capitales discrètes, comme « Préparatoire · Étape 2 sur 14 » en consultation |
| Fermer | La croix, Échap, un toucher à côté, le retour du téléphone | Pas de croix : « Annuler » revient à la consultation (ou ferme, pour un ajout) ; s'il y a eu une saisie, « Abandonner les modifications ? » d'abord. Échap, un toucher à côté et le retour du téléphone font comme « Annuler » |
| Forme | Ordinateur : fenêtre au gabarit des pages (896 px de contenu) ; téléphone : plein écran, qui monte du bas (§ 3.4) | La même : on bascule dans la même feuille, sans nouvelle couche |

- **Le crayon (C5)** bascule la feuille en édition ; **Enregistrer (F25)** range la course et rebascule en consultation, mise à jour. Une course qui quitte la feuille de route (courue, à surveiller, supprimée) ferme la feuille.
- **« + Ajouter une course »** (Objectif et Palmarès) ouvre la feuille directement en édition (F1 « Ajouter une course ») ; après Enregistrer, la consultation de la nouvelle course si elle est sur la feuille de route, sinon la feuille se ferme (course courue ajoutée au Palmarès).
- **Toucher une ligne du Palmarès** : la feuille en consultation d'une course courue (ci-dessous). **Crayon d'une ligne** : la feuille directement en édition (F1 « Modifier la course ») ; Enregistrer ou Annuler la ferme.
- **« Marquer comme courue » (C8)** : la feuille bascule en édition, état Courue, pré-remplie ; « Supprimer » absent.
- **« Supprimer la course » (F23)** : bouton à contour rouge (Alerte) avec une poubelle, seul en bas de la fiche, loin d'« Enregistrer » ; après confirmation, la feuille se ferme.
- **« Paramétrer le plan » (F41)** reste la seule fenêtre par-dessus : réglage ponctuel, avec « Annuler » et « Valider », sans croix.

```
Téléphone · consultation (plein écran)  Téléphone · édition (même écran)
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│                   (C5) ✎ (C1) × │     │ (F24) Annuler   (F25) Enregistrer│
│ PRÉPARATOIRE · ÉTAPE 2 SUR 14   │     │ (F1) MODIFIER LA COURSE         │
│ (C3) Trail des 2 Baies ↗        │     │ ⌄ (F3) Course                   │
│ (C6) lieu · format · date       │     │   Course *  [                ]  │
│ ┌ (C22) fiche ───────────────┐  │     │   …                             │
│ └────────────────────────────┘  │     │ › (F15) Place dans le plan      │
│ (C24) ⌄ Préparation …           │     │ › …                             │
│ (C20) ← précédente suivante (C21)│     │ (F22) message                   │
│                                 │     │ [🗑 Supprimer la course] (F23)   │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

Ordinateur : mêmes deux modes, même barre du haut ; la fiche garde ses deux colonnes de champs.

#### Consultation d'une course courue

Ouverte en touchant une ligne du Palmarès. Même feuille et même barre du haut que la consultation d'une course à venir ; le crayon (C5) bascule en édition, et Annuler ramène à cette consultation. Le résultat passe en tête de la fiche, à la place du compte à rebours (décidé le 29 oct. 2026).

```
┌──────────────────────────────────────────────────────────────────┐
│                                                  (C5) ✎ (C1) ×  │
│ (C2) COURUE · TRAIL LONG                                         │
│ (C3) Trail des 2 Baies · 42 km (C4) ↗                            │
│ (C6) Haut-Val · Trail long · sam. 14 juin 2025, 7 h 00           │
│ ┌─ (C22) fiche ──────────────────────────────────────┐           │
│ │ (C25) TEMPS        06:12:40  (C26) 8:51 /km        │           │
│ │ (C27) CLASSEMENTS  Général 112e / 640 · Catégorie 18e / 96 · Sexe 95e / 510 │
│ │ (C9)  DISTANCE     42 km · 2 100 m D+ · 2 100 m D− │           │
│ │ (C11) OBJECTIF     06:30:00  (C29) (vs Temps +00:12:40) │       │
│ │ (C23) PRÉCISIONS   Sous 6 h 45 dans tous les cas.  │           │
│ │ (C12) DOSSARD      n° 1287                         │           │
│ │ (C14) PRIX         58 €                            │           │
│ └────────────────────────────────────────────────────┘           │
│ (C28) ⌄ Montre   (titre repliable ; une ligne de valeurs)        │
│ (C19) ⌄ Liens    Site officiel ↗   Résultats ↗                   │
│ (C20) ← Course précédente                 Course suivante → (C21)│
└──────────────────────────────────────────────────────────────────┘
```

| N° | Élément | Règle et style |
| --- | --- | --- |
| C2 | Libellé | « Courue · » et le type, en capitales discrètes ; remplace « rôle · étape x sur y » |
| C25 | Temps | Première ligne de la fiche ; valeur en Accent, plus grande ; « DNF » si non terminée |
| C26 | Allure moyenne | Même ligne que C25, juste après le temps, en Texte ; absente si DNF ou vide |
| C27 | Classements | Une seule ligne : général, catégorie, sexe, en rang ordinal puis effectif (« 14e / 174 », « 6e ») ; « 1er », ou « 1re » pour une coureuse (comme le Palmarès) ; chaque classement saisi s'affiche, les autres non ; la ligne entière disparaît s'il n'y en a aucun ; elle passe à la ligne si l'écran est étroit |
| C28 | Montre | Bloc sous la fiche ; replié (téléphone) ou ouvert (ordinateur) comme les autres ; absent si vide |
| C9, C10 | Distance, D+ et D− | Sur une seule ligne, à la suite : « 42 km · 2 100 m D+ · 2 100 m D− » (pas de ligne D− à part) |
| C11, C12, C14 | Objectif, Dossard, Prix | Comme à venir ; Dossard : le numéro seul, sans état d'inscription |
| C29 | Écart à l'objectif | Juste après l'Objectif, entre parenthèses, en Texte : « (vs Temps +00:06:05) » ; « + » si le temps officiel est plus lent, « − » s'il est plus rapide, en hh:mm:ss ; seulement pour un objectif chiffré (hh:mm:ss) et une course terminée |
| C19 | Liens | Sur une ligne, titre repliable comme les autres ; seul texte de la consultation (ni rôle dans la préparation, ni stratégie, ni logistique, ni description : ils restent saisis et modifiables en édition) ; le lien des résultats s'y appelle « Résultats » |
| C20, C21 | Navigation | Parcourt le Palmarès dans l'ordre du tableau (tri et filtres du moment) |

- **Retirés** : C7 (groupe d'options), C8 (actions), C13 (compte à rebours), C24 (plan de préparation), C15 à C18 (textes), C10 (D− à part).
- **Une ligne sans valeur n'est pas affichée**, comme à venir. **Fiche compacte** : espaces resserrés, 5 lignes au plus (temps, classements, parcours, objectif, précisions) avant Dossard et Prix éventuels.
- **Site partagé en lecture seule** : la feuille s'ouvre, sans crayon (C5).
- **Téléphone** : même ordre, plein écran ; C28 et C19 sont repliés, sauf le premier.

#### Une seule fiche de champs

Les mêmes blocs, **dans le même ordre**, pour une course à venir et une course courue ; chaque champ a toujours la même place. L'état de la course choisit seulement les blocs montrés et ceux qui sont ouverts : à venir, les blocs de la préparation ouverts ; courue, Course et Résultat ouverts, les blocs de la préparation repliés mais modifiables.

| Ordre | Bloc | À venir | Courue | Champs |
| --- | --- | --- | --- | --- |
| 1 | (F3) Course | ouvert | ouvert | Course, parcours ; date (+ « Date approximative » (F5), à venir seulement) ; heure, lieu ; type, format ; distance ; D+, D− ; description. **Le numéro de dossard n'y est plus** (il passe dans Dossard) |
| 2 | (F15) Place dans le plan | ouvert | replié | À venir : statut, rôle, groupe d'options ; courue : rôle seulement |
| 3 | (F20) Préparation | ouvert | replié | À venir : plan (F39 à F42), objectif, précisions, rôle dans la préparation, stratégie ; courue : les mêmes textes, sans plan |
| 4 | (F38) Logistique | ouvert | replié | Logistique |
| 5 | (F19) Dossard | ouvert | replié si vide | Numéro, prix ; à venir seulement : ouverture des inscriptions, « Inscrit » (le numéro ne se saisit qu'inscrit), site d'inscription |
| 6 | (F43) Résultat | — | ouvert | Dans l'ordre actuel : d'abord le résultat (temps, DNF, allure moyenne), puis les classements (général, catégorie, sexe : places et effectifs). Classements et Résultat ne font plus qu'un bloc (F44 n'est pas utilisé) |
| 7 | (F45) Montre | — | replié si vide | Temps, distance, D+, D−, allure, FC moyenne |
| 8 | (F21) Liens | ouvert | replié si vide | Site officiel, résultats en direct |

Pour une course courue : son objectif, sa stratégie, sa logistique, son prix et ses liens, gardés en base, redeviennent visibles et modifiables ; le lien des résultats s'ajoute après coup.

Contrôles de saisie, obligatoires et exemples : ceux du § 3.7 et du Palmarès (§ 10), inchangés.

**Questions ouvertes**

- [x] Consultation d'une course courue : oui, en touchant une ligne du Palmarès ; résultat en tête de la fiche, pas d'écart à l'objectif, crayon de la ligne gardé, ouverture aussi en lecture seule (décidé le 29 oct. 2026 ; construit).
- [x] Ordre des blocs : le même pour tous ; Résultat et Classements fusionnés (résultat d'abord) ; Place dans le plan, Préparation et Logistique avant Résultat, Dossard juste sous Logistique (décidé le 28 oct. 2026).

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
- Page d'une course : plan du § 3.4, en modale plein écran ; la fiche dans le premier écran, les textes repliés sauf le premier.
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
- [x] Inscriptions fermées (ou complet) sans être inscrit : pas de cinquième état, pas de champ de plus (décidé le 28 oct. 2026).
- [x] Groupe d'options : créé dans le formulaire ; candidat retenu depuis sa page, les autres passent À surveiller ; rôles différents listés ; un seul candidat reste un groupe (décidé le 24 oct. 2026).
- [x] Choix de la course de l'en-tête (cap) : dans les Préférences et depuis la page d'une course, pas depuis la feuille de route (décidé le 28 oct. 2026 ; à construire).

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
- Ordinateur : modale dont le contenu a la largeur des autres pages (896 px) ; la fiche encadrée ; les six textes (Préparation comprise) ouverts, sans pouvoir les replier. Téléphone (390 px) : rien ne dépasse ; le compte à rebours tient sur une ligne ; la fiche commence dans le premier écran ; premier texte ouvert, les quatre autres repliés ; toucher un titre ouvre le texte.
- Trail des Cimes : « Préparatoire · Étape 4 sur 6 » ; « Printemps 2027 » et un lien vers l'autre candidate, Ultra du Plateau · Le 55.
- Trail du Lac : pas de course précédente. Trail des Crêtes : pas de course suivante.
- Adresse d'une course inconnue, d'un autre utilisateur, ou absente de la feuille de route : « Course introuvable. » et le lien la croix seule dans la modale.
- Modale : toucher une étape l'ouvre au-dessus de la feuille de route, qui reste en place et ne défile plus ; « course suivante » puis « course précédente » changent la course sans fermer ni ajouter d'entrée à l'historique ; la croix, Échap, un clic à côté et le retour du navigateur la ferment, la feuille de route dessous. Adresse `course.html?id=…` ouverte directement : la feuille de route dessous, la modale dessus ; fermer laisse la feuille de route.
- Modale, téléphone (390 px) : plein écran (aucune marge), la croix ferme ; rien ne dépasse.
- Modale depuis le Calendrier (à la rubrique Préparation) et depuis En un coup d'œil. Barre du haut : le crayon puis la croix, à droite, sans lien de retour.
- Site partagé en lecture seule : la feuille de route et les pages de course du propriétaire s'affichent à l'identique.
- Chargement de la feuille de route et d'une page de course (ordinateur, téléphone) : à l'instant où la page devient visible, le menu (et l'en-tête, sur la feuille de route) est en place et le contenu n'a plus à bouger.
- Feuille de route, thème Bleu et orange : nom de la course en Texte, date en Texte discret, chiffres du compteur et objectif en Accent 2 ; libellés à 0,7 rem ; indicateurs de l'en-tête en Texte.

Résultats attendus, saisie et édition (mêmes données, même date) :

- « + » ouvre un formulaire vide : statut Confirmée, rôle Préparatoire ; blocs Préparation, Dossard, Logistique et Liens repliés.
- Ajouter « Trail des Brumes », 18 avril 2027, 8 h, objectif saisi `15000` (lu 1:50:00) : il s'affiche « 01:50:00 » ; la carte prend place entre Trail des Gorges et Printemps 2027 ; l'en-tête affiche « 6 courses ».
- Objectif « vite » : « Format attendu : 02:45:00, Finisher ou Sub 3h » sous le champ ; « Enregistrer » reste sans effet. « finisher » est rangé « Finisher », « sub 3h » est rangé « Sub 3h ».
- Date du 1er octobre 2026 : erreur sous la date. Site officiel « example.org » : erreur sous le champ.
- Case « Date approximative (mois seulement) », juillet 2027 : la carte affiche JUILLET 2027.
- Statut Option : le champ Groupe d'options apparaît et propose « Printemps 2027 » ; le choisir : la carte du groupe affiche « • 3 candidats ». Statut Confirmée : le champ disparaît.
- « + » : le bloc Préparation commence par « Choisis d'abord la date et le format. », « Paramétrer le plan » grisé. Trail des Lacs, 12 juin 2027, Trail court : « Plan de 12 semaines · début : lun. 22 mars 2027 → jour J : sam. 12 juin 2027 » ; case « Date approximative » cochée : « Plan de 12 semaines · début : lun. 15 mars 2027 → jour J : mar. 1 juin 2027 » et la mention de la date approximative ; décochée, retour au 12 juin. Première semaine passée en Développement, « Valider » : rien d'écrit ; « Enregistrer » : la course, puis sa semaine modifiée, rangées sous le même identifiant (durée du format, rien à ranger pour elle).
- Page Trail des Gorges, « Modifier » : formulaire rempli ; objectif changé en `6:15:00` : la page affiche « 06:15:00 ».
- Page Trail de la Forêt (juillet 2027, date approximative) : la rubrique Préparation porte la mention. « Modifier » : « … jour J : jeu. 1 juil. 2027 » ; case décochée, date du 4 juillet : « … jour J : dim. 4 juil. 2027 », sans mention ; « Enregistrer » : la course, puis ses phases remises aux règles.
- Trail des Gorges avec sa semaine 5 (14 décembre) réglée en Deload, date passée au 14 mars 2027 : « Plan de 16 semaines · début : lun. 23 nov. 2026 … » ; « Enregistrer » : la semaine réglée devient celle du 21 décembre, toujours la semaine 5.
- Page Trail des Gorges, « Modifier » : le bloc Préparation commence par « Plan de 16 semaines · début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027 », la frise et « Paramétrer le plan » ; ce bouton ouvre la fenêtre de réglage devant le formulaire, avec « Valider » ; Échap la ferme, le formulaire reste ouvert. Durée passée à 12 semaines, « Valider » : « Plan de 12 semaines · début : lun. 14 déc. 2026 … », rien d'écrit ; « Enregistrer » : la durée part avec la course, les phases modifiées sont remises à plat.
- Supprimer Corrida de Noël, confirmation acceptée : elle disparaît ; l'en-tête affiche « 4 courses ».
- Page Trail des Cimes, « Retenir cette course », confirmation acceptée : Trail des Cimes devient une étape Confirmée au 30 mai 2027 ; Ultra du Plateau quitte la feuille de route (À surveiller) ; la carte Printemps 2027 disparaît ; l'en-tête affiche « 5 courses ».
- Page Trail du Lac le 20 octobre 2026 : pas de « Marquer comme courue ». Le 15 novembre 2026 à 14 h : le bouton est là ; il bascule la feuille en édition, fiche d'une course courue remplie (15 novembre 2026, Trail du Lac, Le Tour du Lac, Trail, Trail court, 24 km, 650 m, Préparatoire) ; temps `24110` : à l'enregistrement, Trail du Lac quitte la feuille de route et rejoint le Palmarès, avec un temps de 2 h 41 min 10 s.
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
- Case « Date approximative (mois seulement) » cochée : la date devient un mois ; `2027-10` est rangé au 1er octobre 2027, sans heure, date approximative.
- Statut À surveiller : une course s'enregistre sans date.
- Page de Trail des Gorges, « Modifier » : formulaire rempli (objectif 06:30:00, heure 07:30, D− 2 100…), tous les blocs ouverts ; objectif `Sub 6h30` et date du 8 mars 2027 mis à jour sur la ligne de la course, sans toucher à son état ; ni « Retenir » ni « Marquer comme courue ».
- « Supprimer » : « Supprimer cette course ? Cette action est définitive. » ; Annuler n'écrit rien ; confirmer efface la ligne et ramène à la feuille de route.
- Page de Trail des Cimes (option d'un groupe), « Retenir cette course » : après confirmation, Ultra du Plateau passe À surveiller et quitte le groupe, Trail des Cimes devient Confirmée, hors groupe.
- Panne d'enregistrement : « Enregistrement impossible pour l'instant. », la fiche reste ouverte.
- Téléphone : la fiche ne déborde pas.
- Site partagé en lecture seule : ni « + », ni « Modifier », ni « Retenir ».
- Trail du Lac passé (10 octobre 2026, Confirmée, À venir, jamais marquée courue) : première étape de la feuille de route, compteur « Course courue », bouton « Marquer comme courue » sur sa page ; l'en-tête garde « Cap sur Trail des Crêtes » et « 5 courses ». Une Option passée n'apparaît pas.

Résultats attendus, fiche d'une course (§ 3.8) :

- Trail des Gorges, consultation puis crayon : la même feuille passe en édition, barre « Annuler · Modifier la course · Enregistrer », pas de croix, aucune autre fenêtre ouverte. Blocs dans l'ordre : Course, Place dans le plan, Préparation, Logistique, Dossard (n° 1287 dedans), Liens.
- « Annuler » sans saisie : retour à la consultation, sans question ; après une saisie : « Abandonner les modifications ? ». « Enregistrer » : retour à la consultation, mise à jour.
- « + Ajouter une course » (Objectif) : la feuille s'ouvre en édition, « Ajouter une course » ; Trail des Lacs enregistré (12 juin 2027, Confirmée) : la feuille montre sa consultation.
- Palmarès, Semi de San Sebastián, crayon : la même feuille en édition, blocs Course, Place dans le plan (rôle seul), Préparation (sans plan), Logistique, Dossard, Résultat (résultat puis classements), Montre, Liens ; Course et Résultat ouverts ; « Date approximative » absente.
- Trail du Lac au jour de la course, « Marquer comme courue » : bascule en édition, état Courue, pré-remplie, sans « Supprimer » ; enregistrée, la feuille se ferme et la course quitte la feuille de route.
- Palmarès, toucher la ligne du Semi de San Sebastián (valeurs du jeu fictif) : la feuille s'ouvre en consultation, libellé « Courue », fiche avec Temps et Allure (côte à côte) en première ligne, puis Classements saisis sur une seule ligne (« 112e / 640 », « 18e / 96 », « 95e / 510 »), Distance (D+ et D− à la suite), Objectif et son écart, Dossard, Prix, sans compte à rebours ni plan de préparation ni boutons « Retenir » et « Marquer comme courue » ; Montre, puis Liens seulement (« Résultats ») ; une valeur vide n'est pas affichée.
- Écart à l'objectif : temps 01:56:05 pour un objectif 01:50:00 → « (vs Temps +00:06:05) » ; pour 02:10:00 → « (vs Temps −00:13:55) » ; objectif « Sub 2h » ou course non terminée : aucun écart.
- Première place : « 1er » pour un coureur, « 1re » pour une coureuse ; la fiche reste compacte (temps et classements chacun sur une ligne).
- Course non terminée (DNF) : « DNF » à la place du temps, pas d'allure.
- Crayon de la feuille : bascule en édition ; Annuler sans saisie revient à la consultation. Crayon de la ligne du tableau : ouvre directement l'édition. « Course suivante » et « précédente » suivent l'ordre du tableau, tri et filtres compris.
- Site partagé en lecture seule : toucher une ligne ouvre la consultation, sans crayon.
- Téléphone (390 px) : édition en plein écran ; « Annuler » à gauche, « Enregistrer » à droite, visibles sans défiler ; « MODIFIER LA COURSE » en libellé dessous ; « Supprimer la course » à contour rouge, avec sa poubelle, sous le dernier bloc ; rien ne dépasse.

