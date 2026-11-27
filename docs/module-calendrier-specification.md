# Calendrier · spécification fonctionnelle

Version 0.41 · 27 novembre 2026 · [Retour au sommaire](README.md) · 3 et 6 mois : 1 px entre deux jours, initiale du jour à droite de chaque case, filet du dimanche plus marqué.

## 1. Rôle

Le Calendrier montre la saison à trois échelles : l'année, le mois et la semaine. C'est d'abord un calendrier classique (courses, séances, ouvertures d'inscriptions) ; un bouton « Plan » ajoute la préparation des courses, à la couleur de ses phases. La préparation détaillée d'une course vit sur la **page de la course** ([Objectif](module-objectif-specification.md), § 3.4) : toucher une course dans le Calendrier y mène directement. Il répond à trois questions : quoi faire cette semaine, quand courir, où sont les semaines sans objectif et à quelle phase on en est.

- **Hors périmètre** : la saisie des courses (elle reste dans [Objectif](module-objectif-specification.md)) ; l'apparence détaillée (couleurs, tailles : [design](design.md)) ; l'import des séances depuis une application et la génération d'un plan par intelligence artificielle ([todo](todo.md)).
- **Aucun calcul par intelligence artificielle** : les phases d'un plan se déduisent de règles générales de la course à pied et du trail (§ 5).

- **Nutrition** : la fenêtre de séance (ajouter, modifier, supprimer) est aussi ouverte depuis la page Nutrition, au jour de la page ; les séances de course à pied et de renforcement y font l'activité du jour ([Nutrition](module-nutrition-specification.md), § 4.6).

## 2. Les trois vues

| Vue | Échelle | Comment on l'ouvre |
| --- | --- | --- |
| **Semaine** | Un jour par ligne, une semaine après l'autre | Vue par défaut ; menu « Vue » ; toucher un jour de l'Année ou du Mois |
| **Mois** (adresse `#mois` ; l'ancienne `#mois2` y mène) | Le mois, une ligne par semaine, son libellé à gauche (§ 4.5) | Menu « Vue », sous Semaine |
| **3 mois**, **6 mois** | La grille de 3 ou 6 mois (6 par défaut) : jours en lignes, mois en colonnes (§ 3.1) | Menu « Vue » |
| **Année** | Les 12 mois en mini-grilles, vue d'ensemble (§ 3.3) | Menu « Vue » |

Le zoom « une course » n'est pas une vue du Calendrier : c'est la rubrique **Préparation** de la page de la course (§ 5). Toucher une course (case de l'Année, course ou rendez-vous clé du Mois et de la Semaine) ouvre la page de cette course, en modale par-dessus le Calendrier, à la rubrique Préparation ; une course courue s'ouvre avec son résultat (Objectif, § 3.8). La croix de la page ramène au Calendrier, à la même vue.

**Barre du haut**, la même sur les trois vues, sur une ligne (téléphone compris) :

- **Menu « Vue »** (25), à gauche : un bouton qui porte le nom de la vue ouverte (« Semaine ⌄ ») ; touché, il déroule la liste « Semaine », « Mois » (§ 4.5), « 3 mois », « 6 mois », « Année » (12 mois) sous le libellé « PÉRIODICITÉ », le choix en cours repéré. La liste se ferme au choix, en touchant ailleurs ou par Échap (la main revient au bouton) ; ouverte au clavier, la main va au choix en cours. Chaque choix change l'adresse : le retour du navigateur ramène à la vue d'avant. « 3 mois », « 6 mois » et « Année » ouvrent la grille de l'Année sur cette durée, retenue sur l'appareil, à partir du mois en cours (ou du premier mois déjà affiché).
- **Bouton « Plan »** (26) et bouton **« Aujourd'hui »** (22, à contour), à droite ; « Aujourd'hui » ramène au mois en cours (Année, Mois) ou à la semaine en cours (Semaine). À leur gauche, sur ordinateur seulement, le rond **« plein écran »** (élément commun, [design](design.md)) : le Calendrier prend tout l'écran avec sa barre ; Échap ou le même rond pour sortir.

**Adresse** : `#semaines=AAAA-MM-JJ` (cette semaine en tête de liste ; sans adresse, la semaine en cours), `#mois=AAAA-MM`, `#annee=AAAA-MM` (premier mois affiché ; sans date, le mois en cours). Le bouton retour du navigateur ramène à la vue d'avant.

**Bouton « Légende »** : le rond commun à « i », à droite de « Phases » ; éteint par défaut, retenu sur l'appareil (`mrt-calendrier-legende`), un seul réglage pour toutes les vues. Enfoncé, la légende s'affiche sous la période : types de séances (Sortie longue, Seuil, Fractionné, Côtes, Renforcement, Autre), Route et Trail (confirmée, option), Courue, Aujourd'hui. Éteint, aucune légende des séances ni des courses, nulle part ; la légende des phases suit le bouton « Phases ».

**Bouton « Phases »** : le rond commun à l'œil (bascule : œil barré éteint, œil ouvert et Accent enfoncé ; nom dans l'info-bulle, design § 11) ; éteint par défaut ; un toucher l'enfonce ou l'éteint ; un seul réglage pour les trois vues, retenu sur l'appareil (`mrt-calendrier-phases`). Éteint : un calendrier sans préparation. Enfoncé : le fond des jours à la couleur de la phase de leur semaine, le même pour tous ses jours (les trois vues), et la légende des phases. La phase d'une semaine est celle du **plan de préparation** ([Préparation](module-preparation-specification.md), § 4) : la phase de la saison de l'Objectif qui la couvre ; hors saison, **Récupération** après un Objectif (couleur à part) ou **Entretien**, sans fond. Seuls les Objectifs confirmés façonnent le plan ; une Préparatoire, une Plaisir ou une option ne change pas la phase d'une semaine.

Les données viennent de la liste de courses de l'utilisateur, la même que pour Objectif ; les séances et les phases sont propres à la préparation (§ 7).

## 3. Vue Année

La grille d'un calendrier mural : une colonne par mois, une ligne par jour ; une seule colonne de numéros à gauche, le fond de samedi et dimanche fait voir les fins de semaine. Plan enfoncé, chaque jour prend la couleur de la phase de sa semaine, avec un liseré à gauche : on voit les phases se succéder.

### 3.1 Plan de page

Jeu d'essai, au 20 octobre 2026, Plan enfoncé ; ┃ : le liseré de 3 px à gauche de la case, de la couleur pleine de la phase de la semaine (le fond de la case est de la même couleur, plus pâle).

```
(25) [6 mois ⌄]                                       (26) [Plan]   (22) [Aujourd'hui]
(14) ‹ avr.–sept. 26        (18) Octobre 2026 – mars 2027        avr.–sept. 27 ›
(2) ROUTE ■ confirmée ▣ option  TRAIL ■ confirmée ▣ option  ■ courue  ▢ aujourd'hui  PHASES ■ base ■ développement ■ affûtage ■ allègement ■ récupération
(3)  [ OCT. 26 ]   [ NOV. ]   [ DÉC. ]   [ JANV. 27 ]   [ FÉVR. ]   [ MARS ]      six colonnes de mois, détail d'une colonne :

         ┌────────── OCT. 26 ──────────┐ (3) onglet ; le mois en cours en Accent
(4) J  1 │┃                            │ (5)
    V  2 │┃                            │
    S  3 │┃░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ (28) samedi et dimanche
    D  4 │┃ Semi de San Sebastián      │ (6)
    ────────────────────────────────────── (29) filet de fin de semaine
    L  5 │┃                            │
    …
    L 19 │┃                           │ (7)
   (M 20)│┃                         ▢ │ (11)
```

Téléphone : trois mois par bloc (6 mois : deux blocs, octobre-décembre puis janvier-mars (8)) ; le numéro du jour sans son initiale ; les voisines de la période réduites à leurs flèches.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 25 | Menu « Vue » (§ 2) : la durée de l'Année est un de ses choix | « 6 mois ⌄ » | Barre du haut, à gauche |
| 26 | Bouton « Plan » (§ 2) | éteint | Barre du haut, à droite |
| 22 | « Aujourd'hui » : la période du mois en cours | | Barre du haut, à droite |
| 18 | Titre de la période | « Octobre 2026 – mars 2027 » | Au centre, entre deux filets |
| 14 | Flèches, avec la période voisine | « ‹ avr.–sept. 26 » | De chaque côté du titre |
| 2 | Légende : familles (route, trail : confirmée, option), courue, aujourd'hui ; Plan enfoncé, les phases | | Sous la période |
| 3 | Onglet du mois (l'année au premier mois et en janvier) ; le mois en cours en Accent | « oct. 26 » | Haut de chaque colonne |
| 4 | Initiale et numéro du jour (téléphone : le numéro seul) | « L 19 » | À gauche des cases de chaque mois |
| 5 | Case d'un jour | | Colonne du mois, cases jointives |
| 28 | Samedi et dimanche : fond plus marqué | | Colonne du mois |
| 29 | Filet de fin de semaine | | Sous chaque dimanche |
| 6 | Course : la case remplie de sa couleur, son nom écrit | « Trail du Lac » | Case du jour |
| 30 | Fond de phase (Plan) : la phase de la semaine dans le plan suivi (§ 2) ; une course garde sa couleur | développement | Case du jour |
| 7 | Liseré de phase (Plan) : 3 px à gauche de la case, couleur pleine de la phase ; il reste sur une case de course | | Bord gauche de chaque case |
| 8 | Bloc suivant | janv. à mars | Sous le premier (12 mois ; téléphone) |
| 11 | Aujourd'hui : case cerclée, numéro dans un rond Accent | « 20 » | Grille |

Retirés en 0.18 : les pastilles des vues (1), la case « Phases » (23) et la durée sous le titre (13), remplacées par le menu (25) et le bouton (26). Plan enfoncé, le fond des jours prend la phase de leur semaine (30), samedi et dimanche un cran plus marqués. Pas de numéro de semaine (« s45 ») : il se confondrait avec la semaine du plan (« semaine 9 sur 16 »).

### 3.2 Règles

- **Période** : 3, 6 ou 12 mois, choisie dans le menu « Vue » (6 par défaut, retenue sur l'appareil : `mrt-calendrier-mois`), du 1er du premier mois au dernier jour du dernier ; à partir du mois en cours, ou du mois de l'adresse. Flèches : une période plus tôt ou plus tard ; « Aujourd'hui » ramène au mois en cours. Blocs : six mois par bloc sur ordinateur (un bloc en 3 et 6 mois, deux en 12), trois sur téléphone.
- **Courses** : confirmées et options à venir (une option dont la date est passée disparaît), courues de la période ; ni « Repérée », ni abandonnées. La case de la course est remplie de la couleur de sa famille : pleine pour une course confirmée (statut Confirmée), atténuée et cadrée pour une option (statut Option), Texte discret pour une course courue ; son nom y est écrit, coupé s'il ne tient pas. Route ou trail : le type de la course, déduit de son format ; tout ce qui n'est pas trail est dans la famille route.
- **Séances** (3 et 6 mois) : dans la case du jour, un liseré de 3 px à la couleur du type de séance devant chaque nom ; le type de chaque séance en toutes lettres (« Course à pied · Renforcement », un type une seule fois), atténué et barré quand toutes sont faites ; la case d'une course garde son nom ; infobulle : le type et le libellé de chaque séance. Ni case à cocher ni « + » ici : un toucher ouvre la vue Semaine du jour.
- **Phase d'un jour** (Plan) : celle de sa semaine dans le plan de préparation (§ 2), phases modifiées à la main comprises ; fond de la couleur de la phase et liseré (7) ; une semaine en Entretien ou sans plan garde le fond ordinaire ; une case de course garde sa couleur, le liseré en plus. Pas de barres : les prépas qui se chevauchent ne sont pas montrées séparément (retiré le 6 novembre 2026, sur demande). Format sans durée de prépa : pas de plan.
- **Jours** (3 et 6 mois) : une seule colonne de numéros (1 à 31), à gauche du bloc, commune à ses mois ; dans chaque case, l'initiale du jour (« L », « M »…) à droite, en discret, le nom de la course ou de la séance s'arrêtant avant elle ; samedi et dimanche ont un fond plus marqué ; aujourd'hui : son numéro en pastille Accent et sa case encadrée. Les cases d'un mois sont jointives et d'un même fond, jour passé compris ; 1 px entre deux jours, un filet de 2 px sous chaque dimanche (la fin de semaine) ; un petit espace entre deux mois.
- **Toucher** une course ouvre sa page (rubrique Préparation ; une course courue, son résultat) ; un jour, la vue Semaine à partir du lundi de ce jour. Sur ordinateur, une infobulle donne la date, la course et la phase du jour (« Développement »).
- **Date au mois seulement** : la course est au 1er du mois (le plan vise ce jour, § 5.1).

### 3.3 Année (12 mois) : plan de page

Vue d'ensemble de l'année : les couleurs plutôt que les textes. Quatre mois par ligne sur ordinateur, trois sur tablette, deux sur téléphone.

```
 (1) OCT. 26              (1) NOV.            ...
 (5) 1/4 séances
 (6) L  M  M  J  V  S  D
     ┌──┬──┬──┬──┬──┬──┬──┐
     │  │  │  │ 1│ 2│ 3│ 4│      (3) numéro discret
     │ 5│ 6│ 7│ 8│ 9│10│11│      (4) course : case pleine
     │•19│(20)│21│ …        │      (7) point de séance · (8) aujourd'hui
     └──┴──┴──┴──┴──┴──┴──┘
```

| N° | Élément | Exemple | Style |
| --- | --- | --- | --- |
| 1 | Onglet du mois | « OCT. 26 » | Comme 3 et 6 mois : Space Mono, capitales, fond Bordure, le mois en cours en Accent |
| 2 | Case du jour | | Fond Case, espace de 1 px, coins de 4 px ; samedi et dimanche fond Bordure ; Plan : la couleur de la phase (un cran de plus le week-end) |
| 3 | Numéro | « 14 » | Très petit, gras, Texte discret à 50 % |
| 4 | Course | Case pleine | Route ou trail plein (confirmée), à 50 % (option), Texte discret (courue) ; numéro en encre |
| 5 | Total du mois | « 12 séances · 96 km » | Comme le total de Mois et Semaine : Texte discret, très petit |
| 6 | Initiales des jours | L M M J V S D | Libellé (Space Mono), Texte discret |
| 7 | Point de séance | • | Sous le numéro, un point par type de séance, à sa couleur |
| 8 | Aujourd'hui | (20) | Pastille Accent et cadre de 2 px, comme partout |

Toucher un jour ouvre la vue Semaine ; une course, sa page. L'infobulle donne la date, la course, les séances et la phase.

## 4. Vues Mois et Semaine

### 4.1 et 4.2 (retirées)

L'ancienne grille du mois (une case par jour) a été retirée le 27 novembre 2026 : la vue Mois est désormais la grille « une ligne par semaine » (§ 4.5).

### 4.3 Vue Semaine : plan de page

```
(25) [Semaine ⌄]                                          (26) [Plan]   (22) [Aujourd'hui]
──────────────────────────────────────────────────────────────────────────────────────────
                         (24) ↑ Afficher les semaines passées
(4) SEMAINE DU 19 AU 25 OCT.                                         (28) 1/4 séances · 8/32 km
    ┌──────┬────────────────────────────────────────────────────────────────┐
(3) │  19  │ (6, 27) ┌ Gainage 30 min ───────────────────────── ☑ ┐ (10) + │
    │ LUN. │         └ Renforcement · 30 min ─────────────────────┘        │
(15)│ (20) │ (7)     ┌ ● 8×400 m ────────────────────────────── ☐ ┐      + │  ← cerclée
    │ MAR. │         └ Course à pied · 1 h · 11 km ───────────────┘        │
    │  …   │                                                                  │
    └──────┴────────────────────────────────────────────────────────────────┘
    SEMAINE DU 26 OCT. AU 1ER NOV.
    … (8) ◆ Ouverture des inscriptions · Corrida de Noël …
    … les semaines suivantes arrivent au fil du défilement
```

Plan enfoncé : le fond des lignes à la couleur de la phase de la semaine, le même pour ses sept jours (passés compris), un filet de la couleur pleine à gauche (5), et la légende des phases (2) en tête de liste ; pas de nom de phase écrit.

Téléphone : même ordre ; la barre du haut sur une ligne.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 25, 26, 22 | Menu « Vue », bouton « Plan », « Aujourd'hui » (la semaine en cours, en tête) | « Semaine ⌄ » | Barre du haut |
| 24 | Lien « Afficher les semaines passées » | ↑ Afficher les semaines passées | Tête de liste |
| 2 | Légende des phases (Plan) | | Tête de liste |
| 4 | Titre de la semaine (la semaine en cours en Texte) | « Semaine du 19 au 25 oct. » | Au-dessus de ses sept jours |
| 3 | Numéro et nom du jour, centrés l'un sur l'autre | « 19 / lun. » | Début de la ligne |
| 15 | Aujourd'hui | numéro dans un rond Accent, ligne cerclée | Ligne du jour |
| 17 | Course du jour | « Trail du Lac » | Ligne du jour |
| 8 | Rendez-vous clé | « ◆ Ouverture des inscriptions · Corrida de Noël » | Ligne du jour |
| 6, 7, 27 | Séance en **carte** (fond de surface, contour, coins arrondis) : liseré de 4 px à gauche, couleur du type de séance (§ 4.5, n° 31) ; le nom en gras (le libellé jusqu'aux deux-points) avec les trois traits de l'intensité ; dessous, type, durée, distance (Texte discret) et le picto du commentaire ; la case « faite » à droite ; toucher la carte : sa fenêtre ; glisser sur ordinateur | « 8×400 m / Course à pied · 1 h · 11 km » | Ligne du jour |
| 28 | Total de la semaine | « 1/4 séances · 8/32 km · 1 h 45/3 h 10 » : fait sur prévu pour la semaine en cours et les passées, le prévu seul pour les suivantes ; séances proposées en attente non comptées ; rien sans séance | À droite du titre 4 |
| 29 | Place dans la préparation | « Semaine 3 sur 16 · Base » (la phase dans sa couleur), dates dessous ; seulement dans une préparation | À la place du titre 4 |
| 10 | « + » : ajouter une séance ce jour-là ; rond à contour Accent, plein au survol | (+) | Bout de la ligne |
| 5 | Fond de phase (Plan) | | Toute la ligne |

### 4.4 Vue Semaine : règles

Fenêtre d'une séance : depuis le 12 nov. 2026, une section « Ressenti » (faite, ressenti, douleur, fatigue, commentaire) et le déplacement avec un conseil ([Préparation](module-preparation-specification.md), § 5.5) ; durée et distance sous le libellé dans les vues, glisser une séance sur ordinateur.


- **Liste** : la semaine en cours (ou celle de l'adresse) en tête, puis les suivantes ; trois au départ, deux de plus chaque fois que le bas de la liste approche de l'écran. Pas de flèches.
- **Semaines passées** : le lien en ajoute quatre au-dessus à chaque toucher, sans que la semaine regardée ne bouge à l'écran. « Aujourd'hui » ramène à la semaine en cours et aux deux suivantes.
- **Jours** : une ligne par jour, un même fond pour tous (passé compris ; seul le numéro d'un jour passé est atténué) ; le total de la semaine (28) ; le nom de la phase seulement dans la place de la semaine (29).
- **Rendez-vous clés** : l'ouverture des inscriptions (`ouverture_inscriptions`) d'une course Confirmée ou Option.
- **Toucher une course** (jour de course, rendez-vous clé) ouvre sa page, à la rubrique Préparation ; une course courue, son résultat.
- **Séance** : un type (Course à pied, Renforcement, Vélo, Danse, Natation, Marche ou Crossfit, écrits en toutes lettres partout ; d'autres s'ajouteront à la liste des types et à la base ; Vélo et Marche : durée, distance et D+ ; Danse, Natation, Crossfit : durée seulement, comme le Renforcement ; l'intensité se demande aussi pour une séance Faite de Natation ou de Vélo : elle compte pour la dépense, [Nutrition](module-nutrition-specification.md), § 3), un libellé libre, une case « faite ». Elle se saisit à la main (§ 7) ; l'import depuis une application viendra plus tard.
- **Choix de séance en deux groupes** (27 nov. 2026) : « Course à pied » (Endurance, Décrassage, Sortie longue, Seuil, Fractionné, Côtes) puis « Autres sports » (Renforcement, Vélo, Danse, Natation, Marche, Crossfit), intitulés non sélectionnables.
- **Ajout d'une séance : Faite ou À faire** (27 nov. 2026). Le formulaire d'ajout s'ouvre sur une bascule à deux pastilles, **Faite** (séance passée) ou **À faire** (séance à venir), présélectionnée d'après la date du jour touché (avant aujourd'hui : Faite ; aujourd'hui et après : À faire) ; elle suit la date tant qu'on n'y a pas touché. **À faire** : date, séance, précisions, description, durée, distance, D+, intensité, sans « Ressenti ». **Faite** : date, séance, précisions, puis le réalisé (durée, distance, D+, FC moyenne et max), l'effort perçu, les sensations, la douleur, le commentaire : rien de prévu, rien saisi deux fois ; le réalisé est aussi le chiffre de la séance (comme une séance importée), sans intensité. Une séance Faite ne peut pas être datée dans le futur. La case « Faite » n'existe plus à l'ajout ; elle reste en modification d'une séance. Le bouton « + » reste dans la case du jour.
- **Saisie d'une séance** : le « + » d'un jour ouvre une fenêtre (date, type, libellé de 100 caractères au plus ; puis, facultatifs, durée en minutes, distance en km et intensité : Facile, Modérée ou Intense), présentée comme la fiche d'une course : « Annuler » et « Enregistrer » en haut, le titre en libellé (« AJOUTER UNE SÉANCE »), les champs communs du site ; toucher une séance la modifie, ou la supprime par « Supprimer la séance » (à contour rouge, seul en bas, avec confirmation) ; sa case « faite » s'enregistre aussitôt. Une séance ajoutée depuis un plan est liée à sa course.

### 4.5 Vue Mois : plan de page

Dans l'esprit d'un plan d'entraînement imprimé : une ligne par semaine, son libellé dans une colonne à gauche, une colonne par jour ; chaque séance en carte, un liseré à gauche de la couleur de son type de séance, l'intensité en trois traits comme dans le Mois. Les deux vues restent au menu jusqu'au choix.

```
(25) [Mois ⌄]                                   (34) [⤓] (26) [Phases] (22) [Aujourd'hui]
(9) ‹ sept.                    (18) Octobre 2026                        nov. ›
(2) PHASES … (Phases ; pas de légende des liserés)
(3)             LUN.       MAR.       MER.       JEU.       VEN.       SAM.       DIM.
(30) SEM. 3   ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
     30 nov.  │ 30 (19) │ 1       │ 2       │ 3       │ 4       │ 5       │ 6       │
     Base     │┃▂▄▆1 h ☐│         │┃ 7 km ☐ │         │         │┃12,5 km☐│▌ 24 km  │ (17)
     (28) 1/4 │┃Fraction│  (32)   │┃Enduranc│         │         │┃Sortie l│▌Trail du│
     séances  │┃8×400 m │         │         │         │         │         │  Lac    │
              │      (+)│      (+)│      (+)│      (+)│      (+)│      (+)│      (+)│ (10)
              └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
                (31) carte d'une séance : liseré (type), traits (intensité), mesure en gras, nom, détail, case « faite »
```

Téléphone : le libellé de la semaine (30) passe au-dessus de ses sept jours, sur une ligne (« 19 oct. · Entretien », le total à droite) ; dans les cases, le numéro et le nom abrégé de chaque séance avec son liseré, les traits de l'intensité au-dessus du nom, ni mesure, ni case, ni « + » ; toucher la case ouvre sa semaine.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 25, 26, 22, 9, 18 | Comme l'Année et la Semaine ; « Aujourd'hui » : le mois en cours | « Mois ⌄ » | Barre du haut, période |
| 34 | « Exporter » : rond à contour, picto de téléchargement (§ 4.6) | ⤓ | Barre du haut, à droite, avant le rond « Phases » |
| 33 | (retiré) Légende des liserés : aucune, à l'écran comme à l'export | | |
| 30 | Libellé de la semaine : place dans la préparation (« Sem. 3 », en libellé, seulement dans une préparation), date du lundi, nom de la phase dans sa couleur, total (28) | « SEM. 3 · 30 nov. · Base · 1/4 séances » | Colonne de gauche |
| 19 | Numéro du jour | « 20 » ; aujourd'hui dans un rond Accent | Coin haut gauche de la case |
| 31 | Carte d'une séance : liseré de 4 px à gauche, couleur du type de séance (nom de la liste) : Sortie longue bleu, Seuil jaune, Fractionné rouge, Côtes violet, Renforcement vert ; Endurance, Récupération et un nom libre en Bordure (neutre) ; les trois traits de l'intensité (comme le Mois, rien sans intensité) devant la mesure en gras (distance, sinon durée, sinon le nom), le nom dessous, le détail du libellé en discret ; case « faite » ; faite : barrée | « 7 km / Endurance » | Case du jour, une carte par séance |
| 17 | Course : carte au liseré et au contour de sa famille (fond teinté si confirmée), sa distance en gras, son nom | « 24 km / Trail du Lac » | Case du jour |
| 32 | (retiré le 27 nov. 2026 : plus de « Repos », un jour vide reste vide) | | |
| 21 | Jours des mois voisins : contenu atténué (proposition B, retenue le 20 nov. 2026) | 28, 29, 30 sept. | Ligne de la semaine |
| 10, 8 | « + », rendez-vous clé : comme le Mois | | Case du jour |
| 5 | Fond de phase (Phases) : toute la ligne, liseré de la phase sur le libellé | | Ligne de la semaine |

Règles : du lundi de la semaine du 1er au dimanche de la semaine du dernier jour ; adresse `#mois=AAAA-MM` (l'ancienne `#mois2=AAAA-MM` y mène) ; toucher : une séance ouvre sa fenêtre, une course sa page, ailleurs dans une case la vue Semaine de ce jour ; glisser une séance (ordinateur) : comme le Mois. Les propositions de l'IA en attente n'y figurent pas.

### 4.6 Exporter (Calendrier, Mon plan)

Le plan sur papier ou en PDF, à l'image d'un plan d'entraînement imprimé, dans le style de MyRunTools.

- **Où** : le rond « Exporter » (34) de la barre du Calendrier, dans toutes les vues ; le bouton « Exporter » de Mon plan, avec les réglages du plan (Préparation, § 5.1, n° 29 ; aussi sur le site partagé).
- **Quoi** : Calendrier, la période affichée (Semaine : les semaines de la liste ; Mois : les semaines du mois ; Année : sa période) ; Mon plan, de la semaine en cours à celle de l'Objectif.
- **Page** : A4 à l'horizontale, fond blanc (couleurs du thème Blanc et orange, quel que soit le thème) ; en haut, le titre (« Calendrier · Octobre 2026 », « Mon plan · Trail des Gorges »), sans légende, un filet Accent dessous ; la grille de Mois V2 (§ 4.5) sans « + » ni rendez-vous, la case « faite » dessinée (pleine si faite), le fond de phase (Calendrier : si Phases est enfoncé ; Mon plan : toujours) ; six semaines par page, l'en-tête répété ; en pied, « MyRunTools » et « Exporté le 20 oct. 2026 · page 1 sur 4 ».
- **Comment** : la fenêtre d'impression du navigateur s'ouvre ; « Enregistrer en PDF » donne le fichier. Seule la page exportée s'imprime ; rien ne change à l'écran.

### 4.7 Repères communs à toutes les vues

- **Jours de la semaine** (en-tête du Mois) : alignés à gauche, sur le numéro.
- **Numéro du jour** : police du texte, gras ; seule la taille change selon la vue ; aujourd'hui en pastille Accent, et la case (ou la ligne) encadrée de 2 px Texte.
- **Cases** : fond Case, coins de 4 px ; samedi et dimanche fond Bordure dans toutes les vues (Semaine, Mois, 3 et 6 mois, Année) ; Plan : la couleur de la phase, un cran de plus le week-end.
- **Courses** : pleines si confirmées (texte en encre), à 50 % si option, Texte discret si courue, dans toutes les vues.
- **Séances** : en carte (fond Surface, bord de 1 px, liseré de 4 px à la couleur de leur type) en Semaine et Mois ; liseré de 3 px en 3 et 6 mois, point dans l'Année, la même dans tous les thèmes (design, § 9).
- **Jour vide** : rien d'écrit (plus de « Repos »), seulement le « + ».
- **« + »** : une seule taille, le petit rond commun (1,5 rem).
- **Total** : séances et km de la période, Texte discret (semaine, mois ; chaque mois de l'Année).

## 5. Préparation d'une course

### 5.1 Principe

La préparation d'une course est une **rubrique de la page de la course** (Objectif, § 3.4), pas une vue du Calendrier. Elle reprend la présentation de la vue Semaine (une ligne par jour), du premier jour du plan au jour J. Les phases se calculent d'après la date de course par des **règles générales**, puis se modifient à la main.

**Durée** : un nombre de semaines complètes lundi-dimanche, la dernière étant la semaine du jour J. Valeur par défaut propre au **format** de la course ; une valeur propre à la course la remplace. Valeurs par défaut proposées au § 5.4.

**Date approximative** (mois seulement) : le plan vise le 1er du mois, et la rubrique le dit (« Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie. »). Quand la date précise est saisie (case décochée), le plan se recalcule sur elle : les phases réglées à la main sont oubliées, les règles générales s'appliquent ; la durée reste.

**Date précise changée** : les phases réglées à la main suivent la course et gardent leur numéro de semaine du plan (une semaine 5 en Allègement reste la semaine 5).

**Règles de phases**, appliquées dans cet ordre :

1. **Affûtage** : les deux dernières semaines (la semaine du jour J comprise).
2. **Allègement** : toutes les quatre semaines (semaines 4, 8, 12…), sauf si la semaine est déjà en affûtage.
3. **Base** puis **Développement** : les semaines restantes sont réparties par moitié, la première moitié (arrondie à l'inférieur) en Base, le reste en Développement.

Exemple, plan de 10 semaines : Base ×3, Allègement, Développement ×3, Allègement, Affûtage ×2.

**Récupération après la course** (facultative, réglée course par course, décochée par défaut) : une semaine Allègement de plus, la semaine qui suit celle du jour J. Elle n'entre pas dans la durée du plan (« 16 semaines » reste 16), apparaît à la suite de la frise et de la liste des semaines, et se modifie comme les autres semaines.

### 5.2 Rubrique Préparation d'une course

Depuis le 12 novembre 2026, une course n'a plus de plan à elle : la rubrique Préparation de sa page montre sa **place dans le plan** ([Préparation](module-preparation-specification.md), § 5.4), avec le lien « Voir dans Mon plan → ». L'ancien plan de page (durée, frise, semaine mise en avant, « Toutes les semaines ») est retiré ; les séances s'ajoutent dans Mon plan ou le Calendrier.

### 5.3 Fenêtre « Régler les phases »

Le bouton « Personnaliser » de la page Mon plan (fenêtre « Régler les phases ») (sur la frise, pour l'Objectif visé, et sur chaque Objectif de « Courses du plan ») ouvre le réglage complet de la saison de cet Objectif ([Préparation](module-preparation-specification.md), § 5.1, n° 17). C'est le seul lieu de réglage : la rubrique d'une course et le formulaire d'une course n'en ont pas, ils renvoient vers Mon plan. Seul un Objectif se règle (décidé le 12 novembre 2026).

| N° | Élément | Rôle |
| --- | --- | --- |
| P1 | Durée en semaines | Valeur du format, modifiable pour cette course ; affiche le début du plan. |
| P2 | Frise graphique | Phases côte à côte, bords à glisser pour allonger ou réduire une phase. |
| P3 | Tableau, une ligne par semaine | Numéro, dates, phase à choisir dans une liste (Base, Développement, Affûtage, Allègement). |
| P4 | « Revenir aux règles générales » | Revient aux règles générales du § 5.1, après confirmation. |
| P5 | « Enregistrer » | Range la durée, la récupération et les phases modifiées. |
| P6 | Case « Semaine de récupération après la course » | Ajoute ou retire la semaine Allègement qui suit le jour J (§ 5.1) ; décochée par défaut. |

Le bouton « Régler les phases » ouvre une fenêtre, présentée comme la fiche d'une course : « Annuler » à gauche et « Enregistrer » à droite en haut, le titre en libellé, « Revenir aux règles générales » seul en bas ; « Revenir aux règles générales » (après confirmation) et les changements ne comptent qu'une fois « Enregistrer » pressé, « Annuler » ne range rien. Pour une course sans durée de prépa, la rubrique propose le même bouton, pour en choisir une. Seules les semaines modifiées à la main sont rangées ; les autres se recalculent à l'affichage. Le site partagé en lecture seule n'offre ni « Régler les phases », ni saisie.

Dans le formulaire d'une course, le bloc Préparation montre sa place dans le plan, calculée sur ce qui est saisi, en lecture, avec la note « Les phases se règlent dans Mon plan, une fois la course enregistrée. » ; les phases réglées d'un Objectif suivent la date quand elle change (Objectif, § 3.7).

### 5.4 Durées de prépa par défaut (validées, ajustables)

Valeurs validées le 28 octobre 2026, tirées de plans d'entraînement publiés (recherche du 27 octobre 2026), pour un coureur qui court déjà régulièrement. Elles ne servent que de point de départ : chaque course peut avoir sa propre durée (§ 5.3). Des ajustements pourront suivre.

| Format | Semaines | Nature de la valeur |
| --- | --- | --- |
| 5 km | 8 | Plans publiés ([Salomon](https://www.salomon.com/fr-fr/sg/a/5k-training-plan), [Brooks](https://www.brooksrunning.com/fr_ca/blog/training-workouts/training-for-a-5k-plan.html)) : 8 semaines, pour débutants |
| 10 km | 8 | Plan publié ([Salomon](https://www.salomon.com/fr-be/sg/a/how-to-train-for-a-half-marathon)) ; minimum de 6 semaines selon [Campus Coach](https://www.campus.coach/blog/combien-de-temps-dure-un-programme-d-entrainement-pour-un-semi-marathon) |
| 20 km | 10 | Estimation entre le 10 km et le semi-marathon |
| Semi-marathon | 10 | Plans publiés ([MobileSport](https://assets01.sdd1.ch/assets/lbwp-cdn/mobilesport/files/1720621599/mobilesport-running--plan-de-10-semaines-preparation-du-semi-marathon.pdf), [Campus Coach](https://www.campus.coach/blog/preparation-pour-semi-marathon)) : 8 à 10 semaines |
| Marathon | 16 | [Brooks](https://www.brooksrunning.com/fr_lu/blog/training-workouts/how-long-does-it-take-to-train-for-a-marathon.html), [COROS](https://coros.com/fr/stories/coros-coaches/c/how-mnay-weeks-do-you-need-to-train-for-a-marathon) : 16 à 20 semaines le plus courant ; 12 pour un coureur confirmé |
| Ultra-marathon, 100 km | 16 | Estimation d'après la préparation d'un 100 km de trail (12 à 16 semaines selon [Campus Coach](https://www.campus.coach/blog/bases-plan-entrainement-trail-100-km)) |
| Trail court | 12 | [Raidlight](https://raidlight.com/en/blogs/conseils-guides-plans-entrainement/plan-dentra-nement-de-12-semaines-pour-un-trail-court) : plan de 12 semaines pour 14 à 30 km |
| Trail long | 16 | Estimation dans la fourchette publiée (12 à 20 semaines, [Campus Coach](https://www.campus.coach/blog/trail-de-80-km-plan-d-entrainement)) |
| Ultra-trail | 16 | [Raidlight](https://raidlight.com/en/blogs/conseils-guides-plans-entrainement/plan-dentrainement-de-12-semaines-pour-un-ultra-trail) : 12 semaines ; 12 à 16 selon [Campus Coach](https://www.campus.coach/blog/bases-plan-entrainement-trail-100-km) |

Sans valeur publiée trouvée, à fournir par l'utilisateur : Trail découverte, Course en heure, Marche (3 formats), Fast hiking (2 formats), Triathlon (7 formats). Ces formats n'ont pas de plan en attendant : le trait de prépa et les phases ne s'affichent pas, et la rubrique « Régler les phases » demande la durée.

Les sources donnent des fourchettes, souvent pour un public précis (débutant ou confirmé) : la valeur retenue ici est la plus prudente de la fourchette, sauf mention d'estimation.

## 6. Téléphone

Barre du haut sur une ligne : le menu « Vue », « Plan » et « Aujourd'hui », boutons resserrés ; les périodes voisines réduites à leurs flèches. Année : trois mois par bloc, le numéro du jour sans son initiale, barres de 10 px. Mois : le libellé de la semaine au-dessus de ses jours, le numéro et le nom abrégé dans chaque case (§ 4.5). Semaine et rubrique Préparation : un jour par ligne. Rien ne déborde de l'écran.

## 7. Données

| Donnée | Source | État |
| --- | --- | --- |
| Courses (date, format, statut, état, ouverture des inscriptions) | Table `courses` | Existe |
| Durée de prépa par défaut d'un format | `formats.prepa_semaines` | Créé (évolution 009) |
| Durée de prépa d'une course | `courses.prepa_semaines` (vide : valeur du format) | Créé (évolution 009) |
| Phases modifiées à la main | Table `plan_semaines`, une ligne par semaine modifiée (course, lundi, phase) | Créée (évolution 009) |
| Séances : date, type (run, renfo), libellé, faite, course liée facultative ; durée, distance, intensité, origine et état facultatifs | Table `seances` | Créée (évolution 009), enrichie (évolution 024) |

Le [modèle de données](modele-donnees.md) (§ 4.4) décrit ces champs et tables. Ce qui se calcule n'est jamais rangé : début du plan, phases non modifiées, semaines sans objectif, chevauchements.

## 8. Lots de construction

1. **Vue Année** : lecture seule, sans nouvelle donnée, avec la durée de prépa par défaut du format (§ 5.4). **Construit** (27 octobre 2026) : page `calendrier.html`, composant `composants/calendrier.js`.
2. **Modèle de données** : durées, phases, séances. **Construit** (27 octobre 2026) : évolution `supabase/evolutions/009-calendrier-preparation.sql`, `schema.sql` à jour ; la vue Année lit désormais la durée de la course, sinon celle de son format, dans la base ; plus rien n'est écrit en dur dans le composant.
3. **Vue 4 semaines et plan d'une course**, saisie des séances, rubrique « Régler les phases ». **Construit** (27 octobre 2026) : vue 4 semaines dans `calendrier.js` ; la vue active se lit dans l'adresse (`#annee`, `#semaines=AAAA-MM-JJ`), le bouton retour du navigateur ramène à la vue précédente.
4. **Préparation sur la page de la course** (27 octobre 2026) : le plan d'une course quitte le Calendrier pour devenir une rubrique de la page de la course (`composants/preparation.js`, partagé) ; toucher une course dans le Calendrier mène à `course.html?id=…#preparation`.
5. **Refonte en essai** (1er novembre 2026) : Année en frise, vue Semaine ouverte par défaut (la semaine en détail, trois à suivre, repère, bilan, consigne de phase), écarts entre courses, « Confirmée / Option » ; ancienne grille, ancienne vue 4 semaines et jours en colonnes gardés derrière des boutons violets, le temps de choisir (§ 2).
6. **Nouvelle grille en essai** (2 novembre 2026) : deuxième bouton violet ; période de 3, 6 ou 12 mois (6 par défaut) et flèches, aussi pour la frise ; prépas des courses d'après la période, commencées dedans, affichées (frise et grilles).
7. **Trois vues** (2 novembre 2026) : Année (la grille, 3, 6 ou 12 mois), Mois (la grille du mois) et Semaine (un jour par ligne, liste continue), d'après la maquette validée (`docs/maquettes/calendrier-vues.html`) ; case « Phases » commune aux trois ; la frise, les anciennes grilles, la vue 4 semaines, la semaine détaillée (repère, bilan, consigne, À suivre) et les boutons violets sont retirés.
10. **Plan de préparation** (8 novembre 2026) : le fond de phase des trois vues suit le plan de préparation du module Préparation (lot 1) ; phase Récupération ajoutée à la légende.
9. **Durée dans le menu, fond de phase dans l'Année** (6 novembre 2026) : « 3 mois », « 6 mois », « Année » rejoignent le menu ; Plan enfoncé, les jours de l'Année prennent le fond de leur phase.
8. **Menu « Vue » et bouton « Plan »** (5 novembre 2026), d'après un plan de page en texte (sans maquette) : les pastilles et la case laissent place au menu et au bouton ; Année : chaque mois a ses jours (initiale et numéro), samedi et dimanche marqués, filet de fin de semaine, onglet du mois en cours en Accent, jour passé avec son fond ; Mois : cases jointives d'un seul fond, « + » à contour Accent (aussi dans la Semaine) ; Mois et Semaine : un seul fond par phase.

12. **Harmonisation** (27 novembre 2026, 0.36 et 0.37) : une seule vue Mois, la grille « une ligne par semaine » (ex-Mois V2), l'ancienne grille du mois retirée ; bouton « Légende » ; Année en 12 mini-grilles (§ 3.3) ; repères communs (§ 4.7) ; couleurs uniques des courses et des séances.
11. **Mois V2 et export** (20 novembre 2026), d'après un plan de page en texte : vue Mois V2 au menu, à côté de Mois (§ 4.5) ; « Exporter » dans le Calendrier et Mon plan (§ 4.6, `composants/export-plan.js` et `.css`).

Le prototype `composants/planning.js` a été remplacé par la première vue Année (lot 1).

## 9. Questions ouvertes

- [x] **Vue Année** : retouchée le 5 novembre 2026 (§ 3), dans l'esprit d'un calendrier en colonnes : jours de chaque mois, fins de semaine marquées ; numéros de semaine non repris.
- [x] **Barre du haut** : menu « Vue » (Semaine, Mois, Année ; la durée de l'Année reste sous son titre) et bouton « Plan » à la place des pastilles et de la case (retenu le 5 novembre 2026).
- [x] **Durée de l'Année** et **fond de phase dans l'Année** : 3 mois, 6 mois et Année passent dans le menu ; Plan enfoncé, les jours de l'Année prennent le fond de leur phase, avec un liseré à gauche, sans barres (retenu le 6 novembre 2026, option B).
- [ ] **Fonds de phase** (Mois, Semaine, Année) : un seul fond par phase depuis le 5 novembre 2026 ; lisibilité à vérifier à l'usage, notamment sur le thème Blanc et orange.
- [x] **Essai** (frise, grilles, vue 4 semaines, jours en colonnes) : tranché le 2 novembre 2026 : trois vues (§ 2 à 4), case « Phases ».
- [x] **Prépa des courses préparatoires et plaisir** : réglée par le [module Préparation](module-preparation-specification.md) (8 novembre 2026) : un plan de préparation par Objectif, la Préparatoire en mini-affûtage, la Plaisir sans affûtage ; la règle « course confirmée la plus proche » disparaîtra avec son premier lot. Pour mémoire, la question posée : Aujourd'hui, toute course confirmée ou option a sa prépa (durée de son format) et la course confirmée la plus proche impose sa phase : d'où, dans le jeu d'essai, cinq prépas empilées de février à août, et une préparatoire qui peut imposer son affûtage en pleine prépa de l'objectif. Trois réponses possibles :
  - A. Garder ainsi (en place).
  - B. Une prépa par défaut pour les rôles Objectif principal et Objectif intermédiaire seulement ; une course préparatoire ou plaisir n'impose pas sa phase au Calendrier, sauf si on paramètre sa prépa. Recommandé : la phase suivie est celle de l'objectif.
  - C. Toutes gardent leur prépa, mais le rôle départage les chevauchements (objectif principal, puis intermédiaire, puis préparatoire, puis plaisir), puis la date la plus proche.
- [x] **Durées de prépa par format** : valeurs du § 5.4 validées (28 octobre 2026), à ajuster ensuite.
- [ ] **Durées à fournir** pour Trail découverte, Course en heure, Marche, Fast hiking et Triathlon (aucune valeur publiée trouvée).
- [x] **Semaine de récupération après la course** : oui, facultative par course, une semaine Allègement hors durée du plan (retenu le 28 octobre 2026 ; à construire, évolution de la base).
- [x] **Vue Année sur « six mois »** : non, douze mois suffisent (retenu le 28 octobre 2026) ; revu le 2 novembre 2026 : période au choix, 3, 6 ou 12 mois, 6 par défaut.
- [x] **Couleurs** des quatre familles de course et des quatre phases : fixées dans le document de design (§ 10, 27 octobre 2026).
- [x] **Semaine dans deux plans** : le plan de la course confirmée la plus proche l'emportait (27 octobre 2026) ; remplacé le 8 novembre 2026 par le plan de préparation (Préparation, § 4).
- [x] **Objectif principal** : pas plus marqué que les autres courses sur la vue Année (retenu le 28 octobre 2026).
- [x] **Séances** : durée, distance, D+ et ressenti facultatifs, plus tard, avec l'import des séances depuis une application (retenu le 28 octobre 2026).

## 10. Contrôles

Jeu d'essai, données fictives, au mardi 20 octobre 2026 à 10 h, heure de Paris, thème Bleu et orange. Les courses sont celles du [jeu d'essai d'Objectif](module-objectif-specification.md) (§ 10).

**Durées de prépa** : celles du § 5.4 (10 km 8 semaines, Trail court 12, Trail long 16, Ultra-trail 16).

**Séances d'essai** : lundi 19 octobre, Renforcement · Gainage 30 min (faite) ; mardi 20, Course à pied · 8×400 m ; jeudi 22, Course à pied · Footing 45 min ; samedi 24, Course à pied · Sortie 1 h 30.

Résultats attendus, vue Année (`calendrier.html#annee`) :

- Menu « Vue » sur « 6 mois » (choix : Semaine, Mois, 3 mois, 6 mois, Année) ; « Octobre 2026 – mars 2027 », voisines « avr.–sept. 26 » et « avr.–sept. 27 » ; un bloc de six mois (téléphone : deux de trois) ; mois « oct. 26 » … « janv. 27 » … « mars ».
- Courses dans leur case : Semi de San Sebastián (courue), Trail du Lac, Corrida de Noël (route), Trail des Gorges ; ni Cross des Collines (abandonnée), ni Trail des Sommets (repérée), ni l'option passée du 10 octobre ; aujourd'hui (20 octobre) cerclé, « M 20 » dans un rond.
- Jours d'octobre : « J 1 », « S 3 » et « D 4 » (samedi et dimanche marqués, filet sous le dimanche), « L 5 » ; onglet « oct. 26 » en Accent ; un jour passé (jeudi 15) a le fond d'un jour à venir (jeudi 22), un samedi un fond plus marqué.
- Bouton « Plan » éteint : ni fond de phase ni légende des phases ; légende « Route confirmée, option », « Trail confirmée, option », courue, aujourd'hui.
- Séances d'essai (Renforcement le 19, cochée ; Course à pied et Renforcement le 20) : « Renforcement » barré le 19, « Course à pied · Renforcement » le 20, rien le 21 ; infobulle du 20 : les deux séances avec leur libellé.
- Plan enfoncé (retenu sur l'appareil) : légende des phases (Récupération et Entretien, en gris, comprises), fond de phase de chaque jour, sans barres : 1er, 12 et 20 octobre en Entretien, sans fond (le Trail du Lac est une Préparatoire) ; 16 novembre, base (saison du Trail des Gorges) ; 8 février, développement. Liseré de 3 px à gauche de la case : allègement (8 décembre), développement (12 janvier), affûtage (7 mars) ; le Trail des Gorges (7 mars) garde sa couleur ; infobulle du 20 octobre : la date, « aujourd'hui » et les séances, sans phase.
- Période suivante : `#annee=2027-04`, « Avril – septembre 2027 » : Trail des Cimes, Ultra du Plateau, Trail de la Forêt (options), Trail des Crêtes ; pas d'aujourd'hui. « Aujourd'hui » : de nouveau octobre. Menu, « Année » : deux blocs de six, « Octobre 2026 – septembre 2027 », retenu ; « 3 mois » : « Octobre – décembre 2026 ».
- Toucher le 22 octobre : `#semaines=2026-10-19` ; toucher le Trail des Gorges : sa page en modale, rubrique Préparation ; toucher le Semi de San Sebastián : son résultat.
- Trail des Gorges à 20 semaines : son plan part le 19 octobre, la semaine 12 (4 janvier) est en allègement ; Corrida de Noël en Triathlon S (format sans durée) : plus de plan, le 1er décembre n'est plus en affûtage (base du Trail des Gorges).
- Téléphone : rien ne déborde.

Résultats attendus, vue Mois, navigation et saisie (`calendrier.html#mois`, séances d'essai) :

- `#mois2` (ancienne adresse) : la vue Mois, menu sans « 4 semaines ».
- Mois suivant : `#mois=2026-11`, « Novembre 2026 », voisins « oct. » et « déc. », le Trail du Lac le 15 ; janvier 2027 : voisins « déc. 26 » et « févr. » ; « Aujourd'hui » : `#mois`, « Octobre 2026 ».
- « + » du 21 : séance ajoutée ce jour-là ; séance touchée : sa fenêtre ; jour touché : `#semaines=2026-10-19` ; course touchée : sa page en modale. Lecture seule : ni « + » ni modification, cases « faite » désactivées.

Résultats attendus, vue Semaine (`calendrier.html`, vue par défaut, séances d'essai) :

- Menu « Vue » sur « Semaine », barre du haut sur une ligne (téléphone compris) ; lien « ↑ Afficher les semaines passées » ; semaines « Semaine du 19 au 25 oct. » (en cours), « Semaine du 26 oct. au 1er nov. », « Semaine du 2 au 8 nov. » ; jours « 19 lun. » à « 25 dim. » ; le mardi 20 mis en avant.
- Séances : Renforcement Gainage 30 min le 19 (cochée), Course à pied 8×400 m le 20, Course à pied Footing 45 min le 22, Course à pied Sortie 1 h 30 le 24 ; « ◆ Ouverture des inscriptions · Corrida de Noël » le 1er novembre ; un « + » par jour ; ni « Faites », ni nom de phase.
- Défilement : les semaines suivantes arrivent. Semaines passées : la première devient « Semaine du 21 au 27 sept. », la semaine du 19 octobre ne bouge pas à l'écran. « Aujourd'hui » : de nouveau trois semaines à partir du 19 octobre.
- Cocher 8×400 m : écriture ; « + » du 21 sans libellé : « Écris le libellé de la séance. » ; puis « Footing 30 min » ajouté le 21 ; Footing 45 min modifié en Renforcement « Gainage 20 min », puis supprimé (confirmation).
- Plan enfoncé : la semaine du 19 octobre sans fond (Entretien) ; la semaine du 30 novembre en base (préparation du Trail des Gorges), le même fond pour ses sept jours, la légende des phases, pas de nom de phase. Au 14 décembre, sans le Trail des Gorges : la semaine du 14 décembre sans fond de phase (Entretien avant le Trail des Crêtes).
- `#semaines=2026-11-09` : « Semaine du 9 au 15 nov. » en tête, le Trail du Lac le 15, qui ouvre sa page.
- Téléphone : un jour par ligne, rien ne déborde. Lecture seule : ni « + » ni modification, cases « faite » grisées.

Résultats attendus, barre du haut (repasse) :

- Au départ : menu fermé, son bouton « Semaine » ; un toucher l'ouvre (« Semaine », « Mois », « Année », Semaine repérée) ; Échap le ferme et rend la main au bouton ; ouvert au clavier, la main va à « Semaine » ; toucher ailleurs le ferme.
- Choisir « Année » : la vue Année sur 12 mois, `#annee`, le menu refermé, son bouton « Année ». « Plan » : enfoncé, les fonds de phase, `mrt-calendrier-phases` à 1 ; retouché : éteint.
- Menu, « Mois », deux mois plus loin (décembre 2026), « Aujourd'hui » : de nouveau octobre 2026.

Résultats attendus, plan d'une course :

- Trail des Gorges : plan de 16 semaines, du lundi 16 novembre 2026 au dimanche 7 mars 2027 ; phases : Base ×3 (16 nov., 23 nov., 30 nov.), Allègement (7 déc.), Base ×2 (14 et 21 déc.), Développement (28 déc.), Allègement (4 janv.), Développement ×3 (11, 18 et 25 janv.), Allègement (1er févr.), Développement ×2 (8 et 15 févr.), Affûtage ×2 (22 févr., 1er mars) ; jour J le 7 mars.
- Trail du Lac : 12 semaines, du 24 août au 15 novembre : Base ×3, Allègement, Base, Développement ×2, Allègement, Développement ×2, Affûtage ×2.
- Corrida de Noël : 8 semaines, du 19 octobre au 13 décembre : Base ×2, Développement, Allègement, Développement ×2, Affûtage ×2.
- Trail des Crêtes : 16 semaines, du 10 mai au 28 août : même enchaînement que Trail des Gorges.
- Depuis la page Mon plan (rond « Régler les phases »), sur Trail des Gorges, durée portée à 20 semaines : début du plan le 19 octobre ; les phases se recalculent. Mettre la semaine du 7 décembre en Base : seule cette semaine change ; « Revenir aux règles générales » (confirmé) la remet en Allègement.
- Site partagé en lecture seule : le plan s'affiche, sans lien de réglage ni saisie de séance.
- Adresse d'une course inconnue, d'un autre utilisateur ou sans date : « Course introuvable. » et un lien de retour.

Résultats attendus, durées de prépa (vue Année, Plan enfoncé) :

- Durée de prépa : la durée propre à une course remplace celle de son format (Trail des Gorges à 20 semaines : plan à partir du lundi 19 octobre 2026) ; un format sans durée (Triathlon S) : pas de plan.

Résultats attendus, fenêtres :

- Fenêtre d'une séance (ajout ou modification) et fenêtre « Régler les phases » : « Annuler » à gauche, le bouton principal à droite, en haut ; titre en libellé (Space Mono, capitales) ; libellés de champ à 0,7 rem ; le voile de la feuille d'une course ; « Supprimer la séance » à contour rouge, avec sa poubelle, seul en bas.

Résultats attendus, rubrique Préparation de la page d'une course :

- Page du Trail des Gorges, ouverte sur `#preparation` : la rubrique est ouverte et à l'écran ; « Plan de 16 semaines », « Début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027 » ; phases Base ×3, Allègement, Base ×2, Développement, Allègement, Développement ×3, Allègement, Développement ×2, Affûtage ×2 ; la frise affiche neuf groupes ; la semaine mise en avant est la première (« Première semaine », semaine du 16 novembre, Base), le plan n'ayant pas commencé.
- Page du Trail du Lac (plan de 12 semaines commencé le 24 août) : « Semaine en cours », semaine 9 (19 octobre), Développement, avec ses séances ; « Toutes les semaines (12) » repliée ; dépliée, douze blocs.
- « Régler les phases » : durée portée à 20 semaines, « Début : lun. 19 oct. 2026 » ; semaine du 7 décembre en Base puis « Enregistrer » : la durée de la course (20) et une seule semaine modifiée sont rangées, la semaine s'affiche « Base · modifiée » ; « Revenir aux règles générales » puis « Enregistrer » : plus de semaine modifiée, la semaine du 7 décembre est de nouveau en Allègement ; « Annuler » ne range rien.
- Frise : une poignée entre deux phases ; glisser la première d'une semaine vers la droite met la semaine 4 en Base dans le tableau.
- Ajouter une séance depuis la rubrique : elle est liée à la course (`course` renseignée) ; la rubrique reste ouverte (les textes ouverts de la page le restent quand elle se redessine).
- Course de format sans durée (Corrida de Noël en Triathlon S) : « Pas encore de plan… » et le lien vers Préparation ; durée 10 réglée dans Préparation : « Plan de 10 semaines ».
- Course courue, abandonnée ou repérée : pas de rubrique Préparation.
- Page ouverte sans `#preparation` : pas de défilement ; avec `#preparation` : la rubrique s'ouvre, même repliée.
- Site partagé en lecture seule : la rubrique s'affiche, sans lien de réglage, ni « + », ni modification de séance.
- Téléphone : la rubrique ne déborde pas.

Résultats attendus, vue Mois (rendu) et export (§ 4.5, 4.6), séances d'essai du Mois avec durée et distance (Fractionné 1 h, Endurance 7 km, Sortie longue 12,5 km Modérée) :

- `calendrier.html#mois` : menu « Mois » (choix : Semaine, Mois, 3 mois, 6 mois, Année) ; « Octobre 2026 » ; cinq lignes (lundis 28 sept. à 26 oct.) ; 28, 29, 30 sept. et 1er nov. atténués ; le numéro dans chaque case.
- Cartes : 19, Renforcement (liseré vert, sans traits, « Renforcement » en gras, « Gainage 30 min », barrée) ; 20, « 1 h / Fractionné / 8×400 m » (rouge, trois traits) ; 22, « 7 km / Endurance » (neutre, un trait) ; 24, « 12,5 km / Sortie longue » (bleu, deux traits). Pas de légende des liserés. les 21, 23 et 25 restent vides (plus de « Repos ») ; libellé de la semaine du 19 : « 19 oct. », Entretien, « 1/4 séances · 0/19,5 km ». Ordinateur : 4 cases « faite », 35 « + » ; téléphone : ni l'un ni l'autre, noms abrégés ; aucun débordement.
- `#mois=2026-12`, Phases enfoncé : chaque libellé commence par « Sem. n », la semaine du 7 déc. en Allègement (fond de phase) ; mois précédent : le Trail du Lac en carte le 15 nov. (« 24 km », trail) ; toucher le 18 nov. : `#semaines=2026-11-16`.
- Exporter (Calendrier, Mois d'octobre) : une page « Calendrier · Octobre 2026 », fond blanc, cinq semaines, ni case ni « + », la case du 19 dessinée pleine ; pied « MyRunTools » et « Exporté le 20 oct. 2026 » ; invisible à l'écran, seule à l'impression.
- Exporter (Mon plan) : « Mon plan · Trail des Gorges », 20 semaines du 19 oct. 2026 au 1er mars 2027, quatre pages, fond de phase.
- Ajout d'une séance au 21 oct. (à venir) : bascule « À faire », prévu seul, ni « Ressenti » ni case « Faite » ; date mise au 15 oct. : « Faite », réalisé seul ; un choix fait à la main n'est plus changé par la date. Faite, Vélo, 1 h 30, 31,5 km, FC 130 : séance de type vélo, faite, 90 min et 31,5 km, sans intensité, « Vitesse moyenne : 21 km/h ». Ajout au 22 oct., Danse, 60 min : ni distance ni D+ ; séance de type danse, à faire.
- Ajout d'une séance au 16 oct. (faite), Natation : l'intensité reste demandée avec le réalisé ; Crossfit : pas d'intensité.
