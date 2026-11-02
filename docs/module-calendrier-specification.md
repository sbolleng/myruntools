# Calendrier · spécification fonctionnelle

Version 0.16 · 2 novembre 2026 · [Retour au sommaire](README.md) · Trois vues d'un calendrier classique, Année, Mois et Semaine, et la case « Phases de prépa » ; fin de l'essai (frise, anciennes grilles, vue 4 semaines et boutons violets retirés)

## 1. Rôle

Le Calendrier montre la saison à trois échelles : l'année, le mois et la semaine. C'est d'abord un calendrier classique (courses, séances, ouvertures d'inscriptions) ; une case ajoute la préparation des courses, à la couleur de ses phases. La préparation détaillée d'une course vit sur la **page de la course** ([Objectif](module-objectif-specification.md), § 3.4) : toucher une course dans le Calendrier y mène directement. Il répond à quatre questions : quoi faire cette semaine, quand courir, comment les prépas s'enchaînent et se chevauchent, où sont les semaines sans objectif.

- **Hors périmètre** : la saisie des courses (elle reste dans [Objectif](module-objectif-specification.md)) ; l'apparence détaillée (couleurs, tailles : [design](design.md)) ; l'import des séances depuis une application et la génération d'un plan par intelligence artificielle (todo du [sommaire](README.md)).
- **Aucun calcul par intelligence artificielle** : les phases d'un plan se déduisent de règles générales de la course à pied et du trail (§ 5).

## 2. Les trois vues

| Vue | Échelle | Comment on l'ouvre |
| --- | --- | --- |
| **Semaine** | Un jour par ligne, une semaine après l'autre | Vue par défaut ; pastille « Semaine » ; toucher un jour de l'Année ou du Mois |
| **Mois** | La grille du mois, une case par jour | Pastille « Mois » |
| **Année** | La grille de 3, 6 ou 12 mois (6 par défaut) : jours en lignes, mois en colonnes | Pastille « Année » |

Le zoom « une course » n'est pas une vue du Calendrier : c'est la rubrique **Préparation** de la page de la course (§ 5). Toucher une course (case de l'Année, course ou rendez-vous clé du Mois et de la Semaine) ouvre la page de cette course, en modale par-dessus le Calendrier, à la rubrique Préparation ; une course courue s'ouvre avec son résultat (Objectif, § 3.8). La croix de la page ramène au Calendrier, à la même vue.

**Barre du haut**, la même sur les trois vues, sur deux niveaux : les trois pastilles « Année », « Mois », « Semaine » (celle de la vue ouverte pleine, Accent ; sur téléphone, à parts égales sur toute la largeur) ; dessous, la case « Phases de prépa » et le bouton « Aujourd'hui » (à contour), qui ramène au mois en cours (Année, Mois) ou à la semaine en cours (Semaine).

**Adresse** : `#semaines=AAAA-MM-JJ` (cette semaine en tête de liste ; sans adresse, la semaine en cours), `#mois=AAAA-MM`, `#annee=AAAA-MM` (premier mois affiché ; sans date, le mois en cours). Le bouton retour du navigateur ramène à la vue d'avant.

**Case « Phases de prépa »** : décochée par défaut ; un seul réglage pour les trois vues, retenu sur l'appareil (`mrt-calendrier-phases`). Décochée : un calendrier sans préparation. Cochée : les barres de prépa aux couleurs des phases (Année), le fond des jours à la couleur de la phase de leur semaine (Mois, Semaine), et la légende des phases. Quand deux prépas se chevauchent, le fond d'un jour prend la phase du plan de la course confirmée la plus proche (une option n'entre pas dans cette règle : elle a son plan, mais seule) ; l'Année, elle, montre chaque prépa sur sa barre.

Les données viennent de la liste de courses de l'utilisateur, la même que pour Objectif ; les séances et les phases sont propres à la préparation (§ 7).

## 3. Vue Année

La grille d'un calendrier mural : une colonne par mois, une ligne par jour. Case cochée, une barre par prépa montre comment les prépas s'enchaînent et se chevauchent.

### 3.1 Plan de page

Jeu d'essai, au 20 octobre 2026, case cochée ; ┃ : une barre de prépa, à la couleur de la phase de chaque semaine (à l'écran, 16 px de large).

```
(1) (Année) (Mois) (Semaine)                              (23) ☑ Phases de prépa   (22) [Aujourd'hui]
(14) ‹ avr.–sept. 26        (18) Octobre 2026 – mars 2027        avr.–sept. 27 ›
(13)                          3 mois · 6 mois · 12 mois
(2) ROUTE ■ confirmée ▣ option  TRAIL ■ confirmée ▣ option  ■ courue  ▢ aujourd'hui  PHASES ■ base ■ développement ■ affûtage ■ deload
(3)       OCT. 26          NOV.             DÉC.             JANV. 27         FÉVR.            MARS
(4)  1 (5)┃                ┃┃               ┃┃               ┃                ┃                ┃┃
     4    [Semi de San Se] ┃┃               ┃┃               ┃                ┃                ┃┃
     7    ┃                ┃┃               ┃┃               ┃                ┃                [Trail des Gorg] (6)
     8    ┃                ┃┃               ┃┃               ┃                ┃┃               ┃┃
    13    ┃                ┃┃               [Corrida de Noë] ┃                ┃┃               ┃┃
    15    ┃                [Trail du Lac]   ┃                ┃                ┃┃               ┃┃
    16    ┃                ┃┃ (7)           ┃                ┃                ┃┃               ┃┃
    20    ┃┃ ▢ (11)        ┃┃               ┃                ┃                ┃┃               ┃┃
    31    ┃┃                                ┃                ┃                                 ┃┃
```

Téléphone : la barre du haut sur deux lignes ; trois mois par bloc (6 mois : deux blocs, octobre-décembre puis janvier-mars (8)) ; les voisines de la période réduites à leurs flèches.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1 | Pastilles de la vue, « Année », « Mois », « Semaine » | « Année » pleine | Barre du haut |
| 23 | Case « Phases de prépa » (§ 2) | décochée | Barre du haut, second niveau |
| 22 | « Aujourd'hui » : la période du mois en cours | | Barre du haut, à droite |
| 18 | Titre de la période | « Octobre 2026 – mars 2027 » | Au centre, entre deux filets |
| 14 | Flèches, avec la période voisine | « ‹ avr.–sept. 26 » | De chaque côté du titre |
| 13 | Durée : « 3 mois · 6 mois · 12 mois », la choisie soulignée | « 6 mois » | Sous le titre |
| 2 | Légende : familles (route, trail : confirmée, option), courue, aujourd'hui ; case cochée, les phases | | Sous la période |
| 3 | Nom du mois (l'année au premier mois et en janvier) | « oct. 26 » | Haut de chaque colonne |
| 4 | Numéro du jour, de 1 à 31 | « 15 » | Marge de gauche |
| 5 | Case d'un jour | | Grille |
| 6 | Course : la case remplie de sa couleur, son nom écrit | « Trail du Lac » | Case du jour |
| 7 | Barre de prépa (case cochée) | | À gauche des cases, du premier jour de la prépa à la veille de la course |
| 8 | Bloc suivant | janv. à mars | Sous le premier (12 mois ; téléphone) |
| 11 | Aujourd'hui | case cerclée | Grille |

### 3.2 Règles

- **Période** : 3, 6 ou 12 mois (6 par défaut, retenue sur l'appareil : `mrt-calendrier-mois`), du 1er du premier mois au dernier jour du dernier ; à partir du mois en cours, ou du mois de l'adresse. Flèches : une période plus tôt ou plus tard ; « Aujourd'hui » ramène au mois en cours. Blocs : six mois par bloc sur ordinateur (un bloc en 3 et 6 mois, deux en 12), trois sur téléphone.
- **Courses** : confirmées et options à venir (une option dont la date est passée disparaît), courues de la période ; ni « À surveiller », ni abandonnées. La case de la course est remplie de la couleur de sa famille : pleine pour une course confirmée (statut Confirmée), atténuée et cadrée pour une option (statut Option), Texte discret pour une course courue ; son nom y est écrit, coupé s'il ne tient pas. Route ou trail : le type de la course, déduit de son format ; tout ce qui n'est pas trail est dans la famille route.
- **Barre de prépa** (case cochée) : une par course à venir qui a un plan (§ 5), confirmée ou option, y compris une course d'après la période dont la prépa commence dedans ; du premier jour du plan (ou du premier jour affiché) jusqu'à la veille de la course ; chaque semaine à la couleur de sa phase (phases modifiées à la main comprises) ; départ arrondi au vrai premier jour ; prépa d'une option atténuée. Deux prépas qui se chevauchent prennent deux couloirs côte à côte ; le nom d'une course est décalé des seules barres de son jour. Format sans durée de prépa : pas de barre.
- **Jours** : un seul ton ; un jour passé n'a plus de fond ; aujourd'hui cerclé.
- **Toucher** une course ouvre sa page (rubrique Préparation ; une course courue, son résultat) ; un jour, la vue Semaine à partir du lundi de ce jour. Sur ordinateur, une infobulle donne la date, la course, et pour chaque barre la course, la phase et le numéro de la semaine (« Trail des Gorges : Développement, semaine 9 sur 16 »).
- **Date au mois seulement** : la course est au 1er du mois (le plan vise ce jour, § 5.1).

## 4. Vues Mois et Semaine

### 4.1 Vue Mois : plan de page

La grille du mois, comme sur les calendriers du web.

```
(1) (Année) (Mois) (Semaine)                              (23) ☐ Phases de prépa   (22) [Aujourd'hui]
(9) ‹ sept.                    (18) Octobre 2026                        nov. ›
(3)  LUN.      MAR.      MER.      JEU.      VEN.      SAM.      DIM.
    ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
    │28  (21) │29       │30       │1   (19) │2        │3        │4        │
    │         │         │         │         │         │         │[Semi de…│ (17)
    │        +│        +│        +│        +│        +│        +│        +│ (10)
    ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
    │19       │20  (15) │21       │22       │23       │24       │25       │
    │☑ RENFO …│☐ RUN 8… │         │☐ RUN Fo…│         │☐ RUN So…│         │ (6, 7)
    │        +│        +│        +│        +│        +│        +│        +│
    ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
    │26  …    │         │         │         │         │         │1        │
    │         │         │         │         │         │         │◆ Inscr. │ (8)
    └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

Case cochée : le fond de chaque case à la couleur de la phase de sa semaine, un filet de la couleur pleine en haut (5), et la légende des phases (2) sous la période.

Téléphone : les cases sont trop étroites pour du texte : le numéro et des repères (une barre pour une course, un point par séance, plus pâle si elle est faite, un losange pour un rendez-vous), ni case à cocher ni « + » ; toucher la case ouvre sa semaine, où l'on coche et ajoute.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1, 23, 22 | Pastilles, case « Phases de prépa », « Aujourd'hui » (le mois en cours) | « Mois » pleine | Barre du haut |
| 18 | Titre du mois | « Octobre 2026 » | Au centre, entre deux filets |
| 9 | Flèches, avec le mois voisin (son année quand elle change) | « ‹ sept. », « nov. › » | De chaque côté du titre |
| 2 | Légende des phases (case cochée) | « PHASES base développement affûtage deload » | Sous la période |
| 3 | Jours de la semaine, une seule fois | « lun. » | Au-dessus de la grille |
| 19 | Numéro du jour | « 20 » | Coin haut gauche de la case |
| 15 | Aujourd'hui | le numéro dans un rond plein (Accent) | Case du jour |
| 17 | Course du jour, à sa couleur | « Trail du Lac » | Case du jour |
| 8 | Rendez-vous clé : ouverture des inscriptions | « ◆ Inscriptions · Corrida de Noël » | Case du jour |
| 6, 7 | Séance : case « faite », type, libellé (touché : sa fenêtre) | « ☐ Run 8×400 m » | Case du jour, une ligne par séance |
| 10 | « + » : ajouter une séance ce jour-là | + | Coin bas droit de la case |
| 21 | Jours des mois voisins | 28, 29, 30 sept. ; 1er nov. | Atténués, sur un fond plein |
| 5 | Fond de phase (case cochée) | développement | Toute la case |

### 4.2 Vue Mois : règles

- **Mois** : du lundi de la semaine du 1er au dimanche de la semaine du dernier jour ; flèches : le mois précédent ou suivant ; « Aujourd'hui » : le mois en cours.
- **Jours** : un même fond pour tous, passé compris (seul le numéro d'un jour passé est atténué) ; les jours des mois voisins, atténués, gardent un fond plein ; aujourd'hui : son numéro dans un rond Accent.
- **Contenu d'un jour** : les courses (confirmées, options à venir, courues ; pas « À surveiller » ni abandonnées), les rendez-vous clés (§ 4.4), les séances avec leur case « faite », le « + ».
- **Toucher** : une course ou un rendez-vous clé ouvre la page de la course ; une séance, sa fenêtre ; sa case, « faite » ; le « + », la fenêtre d'ajout ; ailleurs dans la case, la vue Semaine de ce jour.
- **Phases** (case cochée) : fond de la phase de la semaine (§ 2), plus pâle pour un jour passé, filet de la couleur pleine en haut ; une semaine sans plan garde le fond ordinaire.

### 4.3 Vue Semaine : plan de page

```
(1) (Année) (Mois) (Semaine)                              (23) ☐ Phases de prépa   (22) [Aujourd'hui]
──────────────────────────────────────────────────────────────────────────────────────────
                         (24) ↑ Afficher les semaines passées
(4) SEMAINE DU 19 AU 25 OCT.
    ┌──────┬────────────────────────────────────────────────────────────────┐
(3) │  19  │ (6) ☑ RENFO Gainage 30 min                                (10) + │
    │ LUN. │                                                                  │
(15)│ (20) │ (7) ☐ RUN 8×400 m                                             + │  ← cerclée
    │ MAR. │                                                                  │
    │  …   │                                                                  │
    └──────┴────────────────────────────────────────────────────────────────┘
    SEMAINE DU 26 OCT. AU 1ER NOV.
    … (8) ◆ Ouverture des inscriptions · Corrida de Noël …
    … les semaines suivantes arrivent au fil du défilement
```

Case cochée : le fond des lignes à la couleur de la phase de la semaine, un filet de la couleur pleine à gauche (5), et la légende des phases (2) en tête de liste ; pas de nom de phase écrit.

Téléphone : même ordre ; la barre du haut sur deux lignes.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1, 23, 22 | Pastilles, case « Phases de prépa », « Aujourd'hui » (la semaine en cours, en tête) | « Semaine » pleine | Barre du haut |
| 24 | Lien « Afficher les semaines passées » | ↑ Afficher les semaines passées | Tête de liste |
| 2 | Légende des phases (case cochée) | | Tête de liste |
| 4 | Titre de la semaine (la semaine en cours en Texte) | « Semaine du 19 au 25 oct. » | Au-dessus de ses sept jours |
| 3 | Numéro et nom du jour, centrés l'un sur l'autre | « 19 / lun. » | Début de la ligne |
| 15 | Aujourd'hui | numéro dans un rond Accent, ligne cerclée | Ligne du jour |
| 17 | Course du jour | « Trail du Lac » | Ligne du jour |
| 8 | Rendez-vous clé | « ◆ Ouverture des inscriptions · Corrida de Noël » | Ligne du jour |
| 6, 7 | Séance : case « faite », type, libellé | « ☐ Run 8×400 m » | Ligne du jour |
| 10 | « + » : ajouter une séance ce jour-là | + | Bout de la ligne |
| 5 | Fond de phase (case cochée) | | Toute la ligne |

### 4.4 Vue Semaine : règles

- **Liste** : la semaine en cours (ou celle de l'adresse) en tête, puis les suivantes ; trois au départ, deux de plus chaque fois que le bas de la liste approche de l'écran. Pas de flèches.
- **Semaines passées** : le lien en ajoute quatre au-dessus à chaque toucher, sans que la semaine regardée ne bouge à l'écran. « Aujourd'hui » ramène à la semaine en cours et aux deux suivantes.
- **Jours** : une ligne par jour, un même fond pour tous (passé compris ; seul le numéro d'un jour passé est atténué) ; pas de total de séances, pas de nom de phase.
- **Rendez-vous clés** : l'ouverture des inscriptions (`ouverture_inscriptions`) d'une course Confirmée ou Option.
- **Toucher une course** (jour de course, rendez-vous clé) ouvre sa page, à la rubrique Préparation ; une course courue, son résultat.
- **Séance** : un type (run ou renfo), un libellé libre, une case « faite ». Elle se saisit à la main (§ 7) ; l'import depuis une application viendra plus tard.
- **Saisie d'une séance** : le « + » d'un jour ouvre une fenêtre (date, type, libellé de 100 caractères au plus), présentée comme la fiche d'une course : « Annuler » et « Enregistrer » en haut, le titre en libellé (« AJOUTER UNE SÉANCE »), les champs communs du site ; toucher une séance la modifie, ou la supprime par « Supprimer la séance » (à contour rouge, seul en bas, avec confirmation) ; sa case « faite » s'enregistre aussitôt. Une séance ajoutée depuis un plan est liée à sa course.

## 5. Préparation d'une course

### 5.1 Principe

La préparation d'une course est une **rubrique de la page de la course** (Objectif, § 3.4), pas une vue du Calendrier. Elle reprend la présentation de la vue Semaine (une ligne par jour), du premier jour du plan au jour J. Les phases se calculent d'après la date de course par des **règles générales**, puis se modifient à la main.

**Durée** : un nombre de semaines complètes lundi-dimanche, la dernière étant la semaine du jour J. Valeur par défaut propre au **format** de la course ; une valeur propre à la course la remplace. Valeurs par défaut proposées au § 5.4.

**Date approximative** (mois seulement) : le plan vise le 1er du mois, et la rubrique le dit (« Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie. »). Quand la date précise est saisie (case décochée), le plan se recalcule sur elle : les phases réglées à la main sont oubliées, les règles générales s'appliquent ; la durée reste.

**Date précise changée** : les phases réglées à la main suivent la course et gardent leur numéro de semaine du plan (une semaine 5 en Deload reste la semaine 5).

**Règles de phases**, appliquées dans cet ordre :

1. **Affûtage** : les deux dernières semaines (la semaine du jour J comprise).
2. **Deload** : toutes les quatre semaines (semaines 4, 8, 12…), sauf si la semaine est déjà en affûtage.
3. **Base** puis **Développement** : les semaines restantes sont réparties par moitié, la première moitié (arrondie à l'inférieur) en Base, le reste en Développement.

Exemple, plan de 10 semaines : Base ×3, Deload, Développement ×3, Deload, Affûtage ×2.

**Récupération après la course** (facultative, réglée course par course, décochée par défaut) : une semaine Deload de plus, la semaine qui suit celle du jour J. Elle n'entre pas dans la durée du plan (« 16 semaines » reste 16), apparaît à la suite de la frise et de la liste des semaines, et se modifie comme les autres semaines. Elle ne compte pas dans les barres de la vue Année (la barre s'arrête à la veille de la course).

### 5.2 Plan de page

```
(1) ⌄ Préparation                        [⚙ Paramétrer le plan] (2)
    (3) Plan de 16 semaines · début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027
    (4) frise : [Base ▓▓▓ | Del | Base ▓▓ | Dév | … | Affûtage ▓▓]
    (5) SEMAINE EN COURS · Semaine 9 · Développement
        lun. 19 │ mar. 20 │ …   séances, rendez-vous clés, jour J
    (6) ▸ Toutes les semaines (16)
```

La rubrique est le premier texte de la page de la course, juste sous la fiche, dans le même cadre que les autres textes ; elle est ouverte par défaut. Une semaine tient sur une ligne par jour, à toute largeur. **Frise sur téléphone** : chaque semaine garde 2 rem au moins ; quand la frise ne tient pas dans la largeur, elle défile de gauche à droite (balayage horizontal). Sur téléphone, comme les autres textes, elle se replie sous son titre.

| N° | Élément | Contenu | Règle |
| --- | --- | --- | --- |
| 1 | Titre repliable | « Préparation » | Course à venir (confirmée ou option) avec une date seulement ; absente d'une course courue, abandonnée ou à surveiller |
| 2 | Bouton « Paramétrer le plan » | Fenêtre de réglage (§ 5.3) ; bouton à contour, icône de curseurs (un seul bouton principal par écran) | Absent en lecture seule |
| 3 | Durée et dates | « Plan de 16 semaines · début … → jour J … » | |
| 4 | Frise des phases | Cases côte à côte, largeur proportionnelle aux semaines | Lecture seule ici ; à glisser dans « Paramétrer le plan » |
| 5 | Semaine mise en avant | Sa phase, ses sept jours, ses séances (case « faite », « + »), rendez-vous clés, jour J | « Semaine en cours » ; avant le début du plan, « Première semaine » ; après le jour J (course non marquée courue), « Dernière semaine » |
| 6 | Toutes les semaines | Liste dépliable, une semaine par bloc comme (5) | Repliée par défaut |

Course sans durée de prépa (format sans valeur) : la rubrique affiche « Pas encore de plan : ce format n'a pas de durée de préparation par défaut. Paramètre le plan pour en choisir une. » et le bouton.

Un lien d'ancre mène à la rubrique : `course.html?id=…#preparation`. Une séance ajoutée depuis cette rubrique est liée à la course.

### 5.3 Fenêtre « Paramétrer le plan »

Le bouton « Paramétrer le plan » de la rubrique ouvre le réglage complet de la prépa.

| N° | Élément | Rôle |
| --- | --- | --- |
| P1 | Durée en semaines | Valeur du format, modifiable pour cette course ; affiche le début du plan. |
| P2 | Frise graphique | Phases côte à côte, bords à glisser pour allonger ou réduire une phase. |
| P3 | Tableau, une ligne par semaine | Numéro, dates, phase à choisir dans une liste (Base, Développement, Affûtage, Deload). |
| P4 | « Recalculer selon les règles » | Revient aux règles générales du § 5.1, après confirmation. |
| P5 | « Enregistrer » | Range la durée, la récupération et les phases modifiées. |
| P6 | Case « Semaine de récupération après la course » | Ajoute ou retire la semaine Deload qui suit le jour J (§ 5.1) ; décochée par défaut. |

Le bouton « Paramétrer le plan » ouvre une fenêtre, présentée comme la fiche d'une course : « Annuler » à gauche et « Enregistrer » à droite en haut, le titre en libellé, « Recalculer selon les règles » seul en bas ; « Recalculer selon les règles » (après confirmation) et les changements ne comptent qu'une fois « Enregistrer » pressé, « Annuler » ne range rien. Pour une course sans durée de prépa, la rubrique propose le même bouton, pour en choisir une. Seules les semaines modifiées à la main sont rangées ; les autres se recalculent à l'affichage. Le site partagé en lecture seule n'offre ni « Paramétrer le plan », ni saisie.

Ouverte depuis le formulaire d'une course (Objectif, § 3.7), la fenêtre se calcule sur la date et le format saisis et P5 devient « Valider » : rien n'est rangé tout de suite, la durée et les phases s'enregistrent avec la course (« Enregistrer » du formulaire) ; « Annuler » du formulaire les abandonne.

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

Sans valeur publiée trouvée, à fournir par l'utilisateur : Trail découverte, Course en heure, Marche (3 formats), Fast hiking (2 formats), Triathlon (7 formats). Ces formats n'ont pas de plan en attendant : le trait de prépa et les phases ne s'affichent pas, et la rubrique « Paramétrer le plan » demande la durée.

Les sources donnent des fourchettes, souvent pour un public précis (débutant ou confirmé) : la valeur retenue ici est la plus prudente de la fourchette, sauf mention d'estimation.

## 6. Téléphone

Barre du haut sur deux lignes : les trois vues à parts égales, puis la case « Phases de prépa » et « Aujourd'hui » ; les périodes voisines réduites à leurs flèches. Année : trois mois par bloc, barres de 10 px. Mois : le numéro et des repères dans chaque case (§ 4.1). Semaine et rubrique Préparation : un jour par ligne. Rien ne déborde de l'écran.

## 7. Données

| Donnée | Source | État |
| --- | --- | --- |
| Courses (date, format, statut, état, ouverture des inscriptions) | Table `courses` | Existe |
| Durée de prépa par défaut d'un format | `formats.prepa_semaines` | Créé (évolution 009) |
| Durée de prépa d'une course | `courses.prepa_semaines` (vide : valeur du format) | Créé (évolution 009) |
| Phases modifiées à la main | Table `plan_semaines`, une ligne par semaine modifiée (course, lundi, phase) | Créée (évolution 009) |
| Séances : date, type (run, renfo), libellé, faite, course liée facultative | Table `seances` | Créée (évolution 009) |

Le [modèle de données](modele-donnees.md) (§ 4.4) décrit ces champs et tables. Ce qui se calcule n'est jamais rangé : début du plan, phases non modifiées, semaines sans objectif, chevauchements.

## 8. Lots de construction

1. **Vue Année** : lecture seule, sans nouvelle donnée, avec la durée de prépa par défaut du format (§ 5.4). **Construit** (27 octobre 2026) : page `calendrier.html`, composant `composants/calendrier.js`.
2. **Modèle de données** : durées, phases, séances. **Construit** (27 octobre 2026) : évolution `supabase/evolutions/009-calendrier-preparation.sql`, `schema.sql` à jour ; la vue Année lit désormais la durée de la course, sinon celle de son format, dans la base ; plus rien n'est écrit en dur dans le composant.
3. **Vue 4 semaines et plan d'une course**, saisie des séances, rubrique « Paramétrer le plan ». **Construit** (27 octobre 2026) : vue 4 semaines dans `calendrier.js` ; la vue active se lit dans l'adresse (`#annee`, `#semaines=AAAA-MM-JJ`), le bouton retour du navigateur ramène à la vue précédente.
4. **Préparation sur la page de la course** (27 octobre 2026) : le plan d'une course quitte le Calendrier pour devenir une rubrique de la page de la course (`composants/preparation.js`, partagé) ; toucher une course dans le Calendrier mène à `course.html?id=…#preparation`.
5. **Refonte en essai** (1er novembre 2026) : Année en frise, vue Semaine ouverte par défaut (la semaine en détail, trois à suivre, repère, bilan, consigne de phase), écarts entre courses, « Confirmée / Option » ; ancienne grille, ancienne vue 4 semaines et jours en colonnes gardés derrière des boutons violets, le temps de choisir (§ 2).
6. **Nouvelle grille en essai** (2 novembre 2026) : deuxième bouton violet ; période de 3, 6 ou 12 mois (6 par défaut) et flèches, aussi pour la frise ; prépas des courses d'après la période, commencées dedans, affichées (frise et grilles).
7. **Trois vues** (2 novembre 2026) : Année (la grille, 3, 6 ou 12 mois), Mois (la grille du mois) et Semaine (un jour par ligne, liste continue), d'après la maquette validée (`docs/maquettes/calendrier-vues.html`) ; case « Phases de prépa » commune aux trois ; la frise, les anciennes grilles, la vue 4 semaines, la semaine détaillée (repère, bilan, consigne, À suivre) et les boutons violets sont retirés.

Le prototype `composants/planning.js` a été remplacé par la première vue Année (lot 1).

## 9. Questions ouvertes

- [ ] **Vue Année** : retouches à venir (annoncées le 2 novembre 2026).
- [ ] **Fonds de phase** (Mois, Semaine) : lisibilité à vérifier à l'usage, notamment sur le thème Blanc et orange.
- [x] **Essai** (frise, grilles, vue 4 semaines, jours en colonnes) : tranché le 2 novembre 2026 : trois vues (§ 2 à 4), case « Phases de prépa ».
- [ ] **Prépa des courses préparatoires et plaisir** (question à poser au bon moment). Aujourd'hui, toute course confirmée ou option a sa prépa (durée de son format) et la course confirmée la plus proche impose sa phase : d'où, dans le jeu d'essai, cinq prépas empilées de février à août, et une préparatoire qui peut imposer son affûtage en pleine prépa de l'objectif. Trois réponses possibles :
  - A. Garder ainsi (en place).
  - B. Une prépa par défaut pour les rôles Objectif principal et Objectif intermédiaire seulement ; une course préparatoire ou plaisir n'a pas de barre dans l'Année, sauf si on paramètre sa prépa. Recommandé : l'Année montre la vraie trame de la saison, et la phase suivie est celle de l'objectif.
  - C. Toutes gardent leur prépa, mais le rôle départage les chevauchements (objectif principal, puis intermédiaire, puis préparatoire, puis plaisir), puis la date la plus proche.
- [x] **Durées de prépa par format** : valeurs du § 5.4 validées (28 octobre 2026), à ajuster ensuite.
- [ ] **Durées à fournir** pour Trail découverte, Course en heure, Marche, Fast hiking et Triathlon (aucune valeur publiée trouvée).
- [x] **Semaine de récupération après la course** : oui, facultative par course, une semaine Deload hors durée du plan (retenu le 28 octobre 2026 ; à construire, évolution de la base).
- [x] **Vue Année sur « six mois »** : non, douze mois suffisent (retenu le 28 octobre 2026) ; revu le 2 novembre 2026 : période au choix, 3, 6 ou 12 mois, 6 par défaut.
- [x] **Couleurs** des quatre familles de course et des quatre phases : fixées dans le document de design (§ 10, 27 octobre 2026).
- [x] **Semaine dans deux plans** : le plan de la course confirmée la plus proche l'emporte (retenu le 27 octobre 2026).
- [x] **Objectif principal** : pas plus marqué que les autres courses sur la vue Année (retenu le 28 octobre 2026).
- [x] **Séances** : durée, distance, D+ et ressenti facultatifs, plus tard, avec l'import des séances depuis une application (retenu le 28 octobre 2026).

## 10. Contrôles

Jeu d'essai, données fictives, au mardi 20 octobre 2026 à 10 h, heure de Paris, thème Bleu et orange. Les courses sont celles du [jeu d'essai d'Objectif](module-objectif-specification.md) (§ 10).

**Durées de prépa** : celles du § 5.4 (10 km 8 semaines, Trail court 12, Trail long 16, Ultra-trail 16).

**Séances d'essai** : lundi 19 octobre, Renfo · Gainage 30 min (faite) ; mardi 20, Run · 8×400 m ; jeudi 22, Run · Footing 45 min ; samedi 24, Run · Sortie 1 h 30.

Résultats attendus, vue Année (`calendrier.html#annee`) :

- Pastille « Année » pleine ; « Octobre 2026 – mars 2027 », voisines « avr.–sept. 26 » et « avr.–sept. 27 » ; « 6 mois » choisi ; un bloc de six mois (téléphone : deux de trois) ; mois « oct. 26 » … « janv. 27 » … « mars ».
- Courses dans leur case : Semi de San Sebastián (courue), Trail du Lac, Corrida de Noël (route), Trail des Gorges ; ni Cross des Collines (abandonnée), ni Trail des Sommets (à surveiller), ni l'option passée du 10 octobre ; aujourd'hui (20 octobre) cerclé.
- Case « Phases de prépa » décochée : ni barre ni légende des phases ; légende « Route confirmée, option », « Trail confirmée, option », courue, aujourd'hui.
- Case cochée (retenue sur l'appareil) : barres et légende des phases. Phases des barres, couloir après couloir : 1er octobre, Trail du Lac en développement (prépa commencée le 24 août : pas de départ arrondi) ; 12 octobre, deload ; 19 octobre, Trail du Lac en développement, Corrida de Noël en base (départ) ; 16 novembre, Trail des Gorges en base (départ, couloir du Trail du Lac, libéré), Corrida de Noël en développement ; 8 février, Trail des Gorges en développement, Trail des Cimes en base (option, atténuée, départ).
- Période suivante : `#annee=2027-04`, « Avril – septembre 2027 » : Trail des Cimes, Ultra du Plateau, Trail de la Forêt (options), Trail des Crêtes ; pas d'aujourd'hui. « Aujourd'hui » : de nouveau octobre. « 12 mois » : deux blocs de six, « Octobre 2026 – septembre 2027 », retenu ; « 3 mois » : « Octobre – décembre 2026 ».
- Toucher le 22 octobre : `#semaines=2026-10-19` ; toucher le Trail des Gorges : sa page en modale, rubrique Préparation ; toucher le Semi de San Sebastián : son résultat.
- Trail des Gorges à 20 semaines : sa barre part le 19 octobre (« Trail des Gorges : Base, semaine 1 sur 20 ») ; Corrida de Noël en Triathlon S (format sans durée) : pas de barre.
- Téléphone : rien ne déborde.

Résultats attendus, vue Mois (`calendrier.html#mois`, séances d'essai) :

- Pastille « Mois » pleine ; « Octobre 2026 », voisins « sept. » et « nov. » ; jours « lun. » à « dim. » ; 35 cases, du 28 septembre au 1er novembre ; 28, 29, 30 septembre et 1er novembre atténués ; aujourd'hui, le 20.
- Semi de San Sebastián le 4 (courue) ; « ◆ Inscriptions · Corrida de Noël » le 1er novembre ; séances : Renfo Gainage 30 min le 19 (cochée), Run 8×400 m le 20, Run Footing 45 min le 22, Run Sortie 1 h 30 le 24 ; un « + » par case ; ni phases ni légende.
- Case cochée : les 35 cases à la couleur de leur phase (développement ; deload la semaine du 12 octobre) et la légende des phases.
- Mois suivant : `#mois=2026-11`, « Novembre 2026 », voisins « oct. » et « déc. », le Trail du Lac le 15 ; janvier : voisins « déc. 26 » et « févr. » ; « Aujourd'hui » : octobre.
- Cocher 8×400 m : écriture de `faite` ; « + » du 21 : « Footing 30 min » ajouté ce jour-là ; toucher Footing 45 min : sa fenêtre ; toucher le 23 : `#semaines=2026-10-19` ; en novembre, le rendez-vous clé mène à la page de la Corrida de Noël et le Trail du Lac ouvre sa page.
- Téléphone : des repères à la place du texte ; rien ne déborde. Lecture seule : ni « + » ni modification, cases « faite » grisées.

Résultats attendus, vue Semaine (`calendrier.html`, vue par défaut, séances d'essai) :

- Pastille « Semaine » pleine ; lien « ↑ Afficher les semaines passées » ; semaines « Semaine du 19 au 25 oct. » (en cours), « Semaine du 26 oct. au 1er nov. », « Semaine du 2 au 8 nov. » ; jours « 19 lun. » à « 25 dim. » ; le mardi 20 mis en avant.
- Séances : Renfo Gainage 30 min le 19 (cochée), Run 8×400 m le 20, Run Footing 45 min le 22, Run Sortie 1 h 30 le 24 ; « ◆ Ouverture des inscriptions · Corrida de Noël » le 1er novembre ; un « + » par jour ; ni « Faites », ni nom de phase.
- Défilement : les semaines suivantes arrivent. Semaines passées : la première devient « Semaine du 21 au 27 sept. », la semaine du 19 octobre ne bouge pas à l'écran. « Aujourd'hui » : de nouveau trois semaines à partir du 19 octobre.
- Cocher 8×400 m : écriture ; « + » du 21 sans libellé : « Écris le libellé de la séance. » ; puis « Footing 30 min » ajouté le 21 ; Footing 45 min modifié en Renfo « Gainage 20 min », puis supprimé (confirmation).
- Case cochée : les sept jours de la semaine du 19 octobre en développement, la légende des phases, pas de nom de phase. Au 14 décembre, sans le Trail des Gorges : la semaine du 14 décembre sans fond de phase.
- `#semaines=2026-11-09` : « Semaine du 9 au 15 nov. » en tête, le Trail du Lac le 15, qui ouvre sa page.
- Téléphone : un jour par ligne, rien ne déborde. Lecture seule : ni « + » ni modification, cases « faite » grisées.

Résultats attendus, plan d'une course :

- Trail des Gorges : plan de 16 semaines, du lundi 16 novembre 2026 au dimanche 7 mars 2027 ; phases : Base ×3 (16 nov., 23 nov., 30 nov.), Deload (7 déc.), Base ×2 (14 et 21 déc.), Développement (28 déc.), Deload (4 janv.), Développement ×3 (11, 18 et 25 janv.), Deload (1er févr.), Développement ×2 (8 et 15 févr.), Affûtage ×2 (22 févr., 1er mars) ; jour J le 7 mars.
- Trail du Lac : 12 semaines, du 24 août au 15 novembre : Base ×3, Deload, Base, Développement ×2, Deload, Développement ×2, Affûtage ×2.
- Corrida de Noël : 8 semaines, du 19 octobre au 13 décembre : Base ×2, Développement, Deload, Développement ×2, Affûtage ×2.
- Trail des Crêtes : 16 semaines, du 10 mai au 28 août : même enchaînement que Trail des Gorges.
- « Paramétrer le plan » sur Trail des Gorges, durée portée à 20 semaines : début du plan le 19 octobre ; les phases se recalculent. Mettre la semaine du 7 décembre en Base : seule cette semaine change ; « Recalculer selon les règles » (confirmé) la remet en Deload.
- Site partagé en lecture seule : le plan s'affiche, sans « Paramétrer le plan » ni saisie de séance.
- Adresse d'une course inconnue, d'un autre utilisateur ou sans date : « Course introuvable. » et un lien de retour.

Résultats attendus, durées de prépa (vue Année, case cochée) :

- Durée de prépa : la durée propre à une course remplace celle de son format (Trail des Gorges à 20 semaines : barre à partir du lundi 19 octobre 2026) ; un format sans durée (Triathlon S) : pas de barre.

Résultats attendus, fenêtres :

- Fenêtre d'une séance (ajout ou modification) et fenêtre « Paramétrer le plan » : « Annuler » à gauche, le bouton principal à droite, en haut ; titre en libellé (Space Mono, capitales) ; libellés de champ à 0,7 rem ; le voile de la feuille d'une course ; « Supprimer la séance » à contour rouge, avec sa poubelle, seul en bas.

Résultats attendus, rubrique Préparation de la page d'une course :

- Page du Trail des Gorges, ouverte sur `#preparation` : la rubrique est ouverte et à l'écran ; « Plan de 16 semaines », « Début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027 » ; phases Base ×3, Deload, Base ×2, Développement, Deload, Développement ×3, Deload, Développement ×2, Affûtage ×2 ; la frise affiche neuf groupes ; la semaine mise en avant est la première (« Première semaine », semaine du 16 novembre, Base), le plan n'ayant pas commencé.
- Page du Trail du Lac (plan de 12 semaines commencé le 24 août) : « Semaine en cours », semaine 9 (19 octobre), Développement, avec ses séances ; « Toutes les semaines (12) » repliée ; dépliée, douze blocs.
- « Paramétrer le plan » : durée portée à 20 semaines, « Début : lun. 19 oct. 2026 » ; semaine du 7 décembre en Base puis « Enregistrer » : la durée de la course (20) et une seule semaine modifiée sont rangées, la semaine s'affiche « Base · modifiée » ; « Recalculer selon les règles » puis « Enregistrer » : plus de semaine modifiée, la semaine du 7 décembre est de nouveau en Deload ; « Annuler » ne range rien.
- Frise : une poignée entre deux phases ; glisser la première d'une semaine vers la droite met la semaine 4 en Base dans le tableau.
- Ajouter une séance depuis la rubrique : elle est liée à la course (`course` renseignée) ; la rubrique reste ouverte (les textes ouverts de la page le restent quand elle se redessine).
- Course de format sans durée (Corrida de Noël en Triathlon S) : « Pas encore de plan… » et « Paramétrer le plan » ; durée 10 : « Plan de 10 semaines ».
- Course courue, abandonnée ou à surveiller : pas de rubrique Préparation.
- Page ouverte sans `#preparation` : pas de défilement ; avec `#preparation` : la rubrique s'ouvre, même repliée.
- Site partagé en lecture seule : la rubrique s'affiche, sans « Paramétrer le plan », ni « + », ni modification de séance.
- Téléphone : la rubrique ne déborde pas.
