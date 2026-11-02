# Calendrier · spécification fonctionnelle

Version 0.15 · 2 novembre 2026 · [Retour au sommaire](README.md) · Nouvelle grille en essai, derrière un deuxième bouton violet (lignes plus hautes, légende lisible, nom de la course au départ de son trait) ; période de 3, 6 ou 12 mois (6 par défaut, commune à la frise) et flèches ; refonte en essai depuis la 0.14 : Année en frise, vue Semaine ouverte par défaut

## 1. Rôle

Le Calendrier montre la saison à deux échelles : l'année et la semaine. La troisième échelle, la préparation d'une course, vit sur la **page de la course** ([Objectif](module-objectif-specification.md), § 3.4) : toucher une course dans le Calendrier y mène directement. Il répond à quatre questions : quand courir, comment les prépas s'enchaînent et se chevauchent, où sont les semaines sans objectif, et quoi faire cette semaine.

- **Hors périmètre** : la saisie des courses (elle reste dans [Objectif](module-objectif-specification.md)) ; l'apparence détaillée (couleurs, tailles : [design](design.md)) ; l'import des séances depuis une application et la génération d'un plan par intelligence artificielle (todo du [sommaire](README.md)).
- **Aucun calcul par intelligence artificielle** : les phases d'un plan se déduisent de règles générales de la course à pied et du trail (§ 5).

## 2. Les deux vues

| Vue | Échelle | Comment on l'ouvre |
| --- | --- | --- |
| **Semaine** | La semaine en détail, jour par jour, puis les trois suivantes en résumé | Vue par défaut ; pastille « Semaine » ; toucher les mois ou la ligne Saison de la vue Année |
| **Année** | 3, 6 ou 12 mois (6 par défaut) en frise : une ligne par course, sa prépa colorée par phase | Pastille « Année » |

Le zoom « une course » n'est pas une vue du Calendrier : c'est la rubrique **Préparation** de la page de la course (§ 5). Toucher une course (ligne de la frise, jour de course, rendez-vous clé ou repère de la vue Semaine) ouvre la page de cette course, en modale par-dessus le Calendrier, à la rubrique Préparation ; une course courue s'ouvre avec son résultat (Objectif, § 3.8). La croix de la page ramène au Calendrier, à la même vue.

**Choix de la vue** : deux pastilles côte à côte, « Année » et « Semaine », celle de la vue ouverte pleine (Accent) ; un seul toucher change de vue. Sans adresse (`calendrier.html`), la vue Semaine s'ouvre sur la semaine en cours ; `#annee` ouvre l'Année au mois en cours, `#annee=AAAA-MM` à partir de ce mois, `#semaines=AAAA-MM-JJ` la semaine de ce lundi.

**Période de la vue Année** (frise et nouvelle grille) : 3, 6 ou 12 mois, 6 par défaut, retenue sur l'appareil (`mrt-calendrier-mois`).

**Essai en cours** (1er novembre 2026) : des boutons violets, volontairement hors des règles communes pour qu'on les reconnaisse, basculent entre la nouvelle présentation et l'ancienne, le temps de choisir ; le choix est retenu sur l'appareil (`mrt-essai-annee`, `mrt-essai-semaine`, `mrt-essai-jours`).

| Bouton | Vue | Bascule entre |
| --- | --- | --- |
| « Essai · voir l'ancienne grille », « Essai · voir la nouvelle grille », « Essai · voir la frise » | Année | La frise (§ 3.1, par défaut), l'ancienne grille (§ 3.3) et la nouvelle grille (§ 3.4) : deux boutons, un par autre variante, chacun nomme celle où il mène |
| « Essai · voir l'ancienne vue 4 semaines » | Semaine | La nouvelle vue (§ 4.1) et l'ancienne vue 4 semaines (§ 4.5) ; la pastille devient « 4 semaines » |
| « Essai · jours en colonnes » | Semaine, ordinateur | Les jours en lignes (par défaut) et en sept colonnes (§ 4.4) |

Une fois le choix fait, les variantes écartées et les boutons disparaissent.

Les données viennent de la liste de courses de l'utilisateur, la même que pour Objectif ; les séances et les phases sont propres à la préparation (§ 7).

## 3. Vue Année

Une frise, pour voir d'un coup d'œil les prépas qui s'enchaînent et celles qui se chevauchent : le temps se lit de gauche à droite, une ligne par course. Deux barres l'une sous l'autre sur les mêmes semaines : deux prépas qui se chevauchent ; une barre qui finit où la suivante commence : un enchaînement.

### 3.1 Plan de page

Schéma (jeu d'essai, au 20 octobre 2026, période de 12 mois) : un caractère par semaine ; B Base, D Développement, A Affûtage, o Deload ; minuscules : course en option ; · : pas de prépa. À l'écran, des cases de couleur.

```
(1) (Année) (Semaine)                  [Essai · voir l'ancienne grille] [Essai · voir la nouvelle grille]
(13) PÉRIODE  3 mois · 6 mois · 12 mois     (14) ‹ Ce mois-ci ›
(3)                   O   N    D   J    F   M   A   M    J   J   A    S
                         ▼ (11) aujourd'hui
(9) SAISON            ■     ◆   ◆           ◆    (12)   ◇   ◇◇       ◆ (6)
                      DDoDDAADDAABBDoDDDoDDAA·········BBBoBBDoDDDoDDAA·····
(10) Trail du Lac    ◂DDoDDA◆
     15 nov.
     Corrida de Noël     BBDoDDA◆
     13 déc.
     Trail des Gorges        BBBoBBDoDDDoDDA◆ (7)
     7 mars
     Trail des Cimes                     bbbobbdodddodda◇
     30 mai · option
     Ultra du Plateau                        bbbobbdodddodda◇
     26 juin · option
     Trail de la Forêt                            bbbobddodda◇
     1er juil. · option
     Trail des Crêtes                                 BBBoBBDoDDDoDDA◆
     28 août
(2) ◆◆ Confirmée (route, trail) ◇ Option ◆ Courue ■ Base ■ Développement ■ Affûtage ■ Deload ▭ Sans objectif clair
```

Téléphone : le nom passe au-dessus de sa barre ; les mois en initiales sur 12 mois, en entier sur 3 et 6 mois ; toute la période tient dans la largeur, sans défilement de côté ; pas d'écarts.

```
(1)  (Année) (Semaine)
     [Essai · voir l'ancienne grille] [Essai · voir la nouvelle grille]
(13) PÉRIODE  3 · 6 · 12 mois     (14) ‹ Ce mois-ci ›
(3)  O   N    D   J    F   M   A   M    J   J   A    S
(9)  SAISON
     ■     ◆   ◆           ◆           ◇   ◇◇       ◆
     DDoDDAADDAABBDoDDDoDDAA·········BBBoBBDoDDDoDDAA·····
(10) Trail du Lac · 15 nov.
    ◂DDoDDA◆
     Corrida de Noël · 13 déc.
        BBDoDDA◆
     …
(2)  légende, sur trois lignes
```

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1 | Pastilles de la vue, « Année » et « Semaine » ; boutons violets d'essai | « Année » pleine | En haut |
| 2 | Légende : courses (confirmée, option, courue), phases, sans objectif clair | « Confirmée (route, trail) » | Sous la frise |
| 3 | Nom du mois, filet au début de chaque mois | « oct. 26 » ; téléphone : « O » | Au-dessus de la frise |
| 6 | Course : losange à son jour, de la couleur de sa famille | Trail du Lac | Au bout de sa barre, et sur la ligne Saison |
| 7 | Barre de prépa : une case par semaine, de la couleur de sa phase | 16 semaines | Ligne de la course, du premier lundi au jour J |
| 9 | Ligne Saison : la phase suivie chaque semaine, et toutes les courses | | Sous les mois |
| 10 | Nom et date de la course | « Trail du Lac », « 15 nov. » | Colonne de gauche (téléphone : au-dessus de la barre) |
| 11 | Aujourd'hui : trait vertical ; semaine en cours éclaircie | | Toute la hauteur de la frise |
| 12 | Écart entre deux courses qui se suivent | « 12 sem. », « 5 j » | Sous la ligne Saison, au milieu des deux courses ; ordinateur seulement |
| 13 | Période : libellé, puis les choix en texte, le choisi souligné (comme les réglages de Courses à surveiller) | « PÉRIODE 3 mois · 6 mois · 12 mois » | Sous les pastilles |
| 14 | Flèches : une période plus tôt, plus tard ; entre elles, « Ce mois-ci » (bouton à contour) | ‹ Ce mois-ci › | À côté de la période |

Les numéros 4, 5 et 8 (numéro du jour, case d'un jour, second bloc) n'existent que dans l'ancienne grille (§ 3.3).

### 3.2 Règles

- **Période** : 3, 6 ou 12 mois (6 par défaut), du 1er du premier mois au dernier jour du dernier ; à partir du mois en cours, ou du mois de l'adresse (`#annee=AAAA-MM`). Flèches : une période plus tôt ou plus tard ; « Ce mois-ci » ramène au mois en cours. Aujourd'hui hors de la période : ni trait ni semaine éclaircie.
- **Lignes** : une par course à venir, confirmée ou option (une option dont la date est passée disparaît), dans l'ordre des dates ; aussi les courses d'après la période dont la prépa commence dedans : leur barre est coupée au bord droit (coin droit), sans losange. Les courses « À surveiller » et abandonnées ne s'affichent pas. Une course courue de la période n'a pas de ligne : son losange gris est sur la ligne Saison, et le toucher ouvre son résultat.
- **Barre de prépa** : la durée de la course, sinon celle de son format (§ 5.4) ; une case par semaine lundi-dimanche, de la couleur de sa phase (§ 5.1, phases modifiées à la main comprises), la dernière s'arrête au jour J. Option : barre atténuée. Prépa commencée avant la période : la barre part du bord, coin droit, et l'infobulle de sa première case donne la vraie date de début. Format sans durée : la course, sans barre.
- **Ligne Saison** : pour chaque semaine, la phase du plan suivi, celui de la course confirmée la plus proche (§ 4.2) ; une semaine sans plan reste vide, en pointillé : « Sans objectif clair ». Toutes les courses de la période y figurent (losanges).
- **Écarts** : entre deux courses qui se suivent (celles de la ligne Saison), au milieu : en jours sous deux semaines (« 5 j »), sinon en semaines arrondies (« 12 sem. ») ; deux écarts qui se touchent : seul le plus court reste. Ordinateur seulement.
- **Couleurs** : losange de la couleur de la famille (route ou trail), plein pour une course **confirmée** (statut Confirmée), en contour pour une **option** (statut Option), gris (Texte discret) pour une course courue. Route ou trail : le type de la course, déduit de son format ; tout ce qui n'est pas trail est dans la famille route. Valeurs dans le [document de design](design.md) (§ 10).
- **Toucher** une ligne (nom ou barre) ouvre la page de la course, rubrique Préparation (§ 5) ; une course courue, son résultat. Toucher les mois ou la ligne Saison ouvre la vue Semaine de la semaine touchée. Sur ordinateur, une infobulle par case : « Trail des Gorges · semaine 9 sur 16 · Développement · 11-17 janv. ».
- **Date au mois seulement** : la course est au 1er du mois (le plan vise ce jour, § 5.1).

### 3.3 Ancienne grille (en essai)

Bouton violet « Essai · voir l'ancienne grille ». Douze mois en deux blocs de six colonnes (trois colonnes et quatre blocs sur téléphone), une ligne fine par jour : numéro du jour à gauche (4), une case par jour (5), le second bloc sous le premier (8). La course est écrite dans sa case, remplie de sa couleur (6) : pleine pour une course confirmée, atténuée et cadrée pour une option, grise pour une course courue. Le trait de prépa (7) est vertical, à gauche des cases, du premier jour de la prépa jusqu'à la veille de la course, d'un mois au suivant ; deux prépas qui se chevauchent tracent deux traits côte à côte ; commencée avant la période, il part du premier jour affiché (l'infobulle donne la vraie date). Jours passés du mois en cours sans fond. Toucher un jour ouvre la vue Semaine à son lundi ; toucher une course, sa page. Légende : « Route confirmée », « Route en option », « Trail confirmée », « Trail en option », Préparation, Courue, Aujourd'hui.

### 3.4 Nouvelle grille (en essai)

Bouton violet « Essai · voir la nouvelle grille » : le style de la grille (jours en lignes, mois en colonnes), plus lisible, sur la période choisie (6 mois par défaut).

```
(1) (Année) (Semaine)           [Essai · voir la frise] [Essai · voir l'ancienne grille]
(13) PÉRIODE  3 mois · 6 mois · 12 mois     (14) ‹ Ce mois-ci ›
(2) ROUTE ■ confirmée ▣ option   TRAIL ■ confirmée ▣ option   ■ courue   ┃ préparation   ▢ aujourd'hui
(3)       OCT. 26          NOV.             DÉC.             JANV. 27         FÉVR.            MARS
(4)  1 (5)┃▸ Trail du Lac  ┃┃               ┃┃               ┃                ┃                ┃┃
     …
     4    [Semi de San Se] ┃┃               ┃┃               ┃                ┃                ┃┃
     7    ┃                ┃┃               ┃┃               ┃                ┃                [Trail des Gorg] (6)
     8    ┃                ┃┃               ┃┃               ┃                ┃┃▸ Trail des Ci ┃┃▸ Ultra du Pla (15)
     …
    13    ┃                ┃┃               [Corrida de Noë] ┃                ┃┃               ┃┃
    15    ┃                [Trail du Lac]   ┃                ┃                ┃┃               ┃┃
    16    ┃                ┃┃▸ Trail des Go ┃                ┃                ┃┃               ┃┃
     …
    19    ┃┃▸ Corrida de N ┃┃               ┃                ┃                ┃┃               ┃┃
    20    ┃┃ ▢ (11)        ┃┃               ┃                ┃                ┃┃               ┃┃
     …
    31 (7)┃┃                                ┃                ┃                                 ┃┃
```

Téléphone : les boutons violets, puis la période et les flèches, passent sous les pastilles ; légende sur deux lignes ; trois mois par bloc (6 mois : deux blocs, oct.-déc. puis janv.-mars (8)).

| N° | Élément | Ce qui change par rapport à l'ancienne grille |
| --- | --- | --- |
| 2 | Légende | Sur sa ligne, sous la barre du haut, plus grande, en Texte ; regroupée par famille : « ROUTE confirmée · option », « TRAIL confirmée · option », puis courue, préparation, aujourd'hui |
| 3 | Mois | Plus grand |
| 4 | Numéro du jour | Plus grand |
| 5 | Ligne d'un jour | Plus haute (12 mois : un peu moins ; téléphone : entre les deux) |
| 6 | Nom de la course | Plus grand |
| 7 | Trait de prépa | Plus large, couloirs plus larges ; les prépas des courses d'après la période, commencées dedans, vont jusqu'au bord |
| 8 | Blocs | 3 et 6 mois : un seul bloc (téléphone : un bloc par trimestre) ; 12 mois : deux blocs de six |
| 11 | Aujourd'hui | Cerclé plus épais |
| 13, 14 | Période et flèches | Comme la frise (§ 3.1) ; réglage commun |
| 15 | Nom de la course au départ de son trait | Nouveau : « ▸ Trail des Gorges » dans la case du premier jour de la prépa (premier jour affiché si elle a commencé avant), en Texte, la flèche à la couleur de la course ; deux prépas qui partent le même jour : le second nom au jour suivant libre de la semaine |

Le reste ne change pas : couleurs, course écrite dans sa case, toucher un jour (vue Semaine) ou une course (sa page), infobulles.

## 4. Vue Semaine

La semaine en détail, pour voir d'abord ce qu'il y a à faire ; puis les trois suivantes en résumé, pour voir venir un affûtage, une course ou une ouverture d'inscriptions.

### 4.1 Plan de page

```
(1) (Année) (Semaine)  [Essai · …4 semaines] [Essai · jours en colonnes]  (9) ‹ [Cette semaine] ›
(4) SEMAINE DU 19 AU 25 OCT.                                       (13) FAITES 1 / 4
(11) Trail du Lac · semaine 9 sur 12 · J-26
(5)  ┃ Développement   (14) Place au spécifique : séances de qualité (…) et sortie longue.
(12) ┃ aussi : Corrida de Noël · semaine 1 sur 8 · Base
(3)  ┃ LUN. 19  (6) ☑ RENFO Gainage 30 min                             (10) +
(15) ┃ MAR. 20  (7) ☐ RUN 8×400 m                      AUJOURD'HUI         +
     ┃ MER. 21                                                           +
     ┃ JEU. 22      ☐ RUN Footing 45 min                                 +
     ┃ VEN. 23                                                           +
     ┃ SAM. 24      ☐ RUN Sortie 1 h 30                                  +
     ┃ DIM. 25                                                           +
(16) À SUIVRE
     › SEM. DU 26 OCT.  Développement  semaine 10  (8) ◆ dim. 1er : inscriptions · Corrida de Noël
     › SEM. DU 2 NOV.   Affûtage  semaine 11
     › SEM. DU 9 NOV.   Affûtage  semaine 12  (17) [Trail du Lac · dim. 15]
```

Téléphone : même ordre ; le bouton violet puis les flèches passent sous les pastilles (pas de bouton « jours en colonnes »), le bilan au bout du titre, la consigne sous la phase ; les résumés de « À suivre » passent à la ligne.

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1 | Pastilles de la vue ; boutons violets d'essai | « Semaine » pleine | En haut à gauche |
| 3 | Jour | « mar. 20 » | Début de la ligne du jour |
| 4 | Titre de la semaine | « Semaine du 19 au 25 oct. » | En haut |
| 5 | Phase de la semaine, trait vertical de sa couleur | « Développement » | Le long des sept jours |
| 6 | Séance de renforcement, avec sa case « faite » | « Renfo · Gainage 30 min » | Ligne du jour |
| 7 | Sortie course à pied, avec sa case « faite » | « Run · 8×400 m » | Ligne du jour |
| 8 | Rendez-vous clé : ouverture des inscriptions | « ◆ Ouverture des inscriptions · Corrida de Noël » | Ligne du jour ; résumé de 16 |
| 9 | Flèches : semaine précédente, semaine suivante ; entre elles, « Cette semaine » (bouton à contour) | ‹ Cette semaine › | En haut à droite |
| 10 | Bouton « + » : ajouter une séance ce jour-là | + | Bout de la ligne du jour |
| 11 | Repère de prépa : la course du plan suivi, le numéro de la semaine, le compte à rebours | « Trail du Lac · semaine 9 sur 12 · J-26 » | Sous le titre |
| 12 | Autres prépas de la semaine | « aussi : Corrida de Noël · semaine 1 sur 8 · Base » | Sous la phase |
| 13 | Bilan des séances de la semaine | « Faites 1 / 4 » | En haut à droite |
| 14 | Consigne de la phase (§ 4.3) | « Place au spécifique : … » | À côté de la phase (téléphone : dessous) |
| 15 | Aujourd'hui : ligne du jour plus claire, cerclée, le mot écrit | « aujourd'hui » | Bout de la ligne du jour |
| 16 | À suivre : les trois semaines suivantes, une ligne repliable chacune | « Sem. du 26 oct. · Développement · semaine 10 · ◆ dim. 1er : inscriptions · Corrida de Noël » | Sous la semaine |
| 17 | Course du jour, à sa couleur | « Trail du Lac » | Ligne du jour ; résumé de 16 |

La légende (2) disparaît : la phase et le type de séance sont écrits en toutes lettres.

### 4.2 Règles

- **Semaine** : du lundi au dimanche ; sans adresse, la semaine en cours. Flèches : une semaine plus tôt ou plus tard ; « Cette semaine » ramène à la semaine en cours.
- **Plan suivi** : quand une semaine est dans plusieurs plans, celui de la course confirmée la plus proche l'emporte ; les autres s'écrivent en « aussi : », avec leur numéro de semaine et leur phase. Une option n'entre pas dans cette règle : elle a son plan, mais seule.
- **Repère** (11) : le nom de la course du plan suivi (un lien vers sa page, rubrique Préparation), « semaine n sur N », puis le compte à rebours depuis aujourd'hui (« J-26 » ; « Jour J » le jour même ; rien une fois la course passée). Sans plan : « Sans objectif clair », trait en pointillé, ni phase ni consigne.
- **Bilan** (13) : séances cochées « faites » sur séances de la semaine ; absent sans séance.
- **Jours** : une ligne par jour, à toute largeur, comme la rubrique Préparation d'une course ; jour passé sans fond ; aujourd'hui mis en avant (15).
- **À suivre** (16) : les trois semaines suivantes, repliées ; chaque ligne garde la phase et le numéro de semaine, le nombre de séances prévues, les rendez-vous clés et les courses ; dépliée, la semaine jour par jour, avec ses « + ».
- **Séance** : un type (run ou renfo), un libellé libre, une case « faite ». Elle se saisit à la main (§ 7) ; l'import depuis une application viendra plus tard.
- **Rendez-vous clés** : l'ouverture des inscriptions (`ouverture_inscriptions`) d'une course Confirmée ou Option.
- **Toucher une course** (jour de course, rendez-vous clé, repère) ouvre sa page, à la rubrique Préparation ; une course courue, son résultat.
- **Saisie d'une séance** : le « + » d'un jour ouvre une fenêtre (date, type, libellé de 100 caractères au plus), présentée comme la fiche d'une course : « Annuler » et « Enregistrer » en haut, le titre en libellé (« AJOUTER UNE SÉANCE »), les champs communs du site ; toucher une séance la modifie, ou la supprime par « Supprimer la séance » (à contour rouge, seul en bas, avec confirmation) ; sa case « faite » s'enregistre aussitôt. Une séance ajoutée depuis un plan est liée à sa course.

### 4.3 Consignes de phase (proposées, à valider)

| Phase | Consigne |
| --- | --- |
| Base | Construire le socle : un volume qui augmente peu à peu, surtout en endurance fondamentale. |
| Développement | Place au spécifique : séances de qualité (seuil, VMA, côtes ou allure de course) et sortie longue. |
| Affûtage | Moins de volume, un peu d'intensité gardée : arriver frais au jour J. |
| Deload | Semaine allégée : moins de volume et d'intensité, pour assimiler le travail des semaines précédentes. |

### 4.4 Jours en colonnes (essai, ordinateur)

Bouton violet « Essai · jours en colonnes » : les sept jours côte à côte, une colonne par jour (comme l'ancienne vue), « aujourd'hui » sous le nom du jour ; les semaines dépliées de « À suivre » aussi. Sur téléphone, toujours un jour par ligne, et pas de bouton.

### 4.5 Ancienne vue 4 semaines (en essai)

Bouton violet « Essai · voir l'ancienne vue 4 semaines » ; la pastille devient « 4 semaines ». Quatre semaines complètes, du lundi de la semaine en cours (ou de la semaine touchée) au dimanche de la quatrième, au même poids : pour chacune, « Sem. du 19 oct. », sa phase en trait vertical (ou « Sans objectif clair »), « aussi : » suivi de l'autre course, puis les sept jours côte à côte (un par ligne sur téléphone) avec séances, rendez-vous clés, jour de course et « + ». Légende des phases en haut. Flèches par pas de quatre semaines ; entre elles, « Aujourd'hui ».

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

**Récupération après la course** (facultative, réglée course par course, décochée par défaut) : une semaine Deload de plus, la semaine qui suit celle du jour J. Elle n'entre pas dans la durée du plan (« 16 semaines » reste 16), apparaît à la suite de la frise et de la liste des semaines, et se modifie comme les autres semaines. Elle ne compte pas pour « Sans objectif clair » ni dans les traits de la vue Année (le trait s'arrête à la veille de la course).

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

Vue Année : la frise tient dans la largeur, nom au-dessus de sa barre, mois en initiales sur 12 mois, sans écarts ni infobulle ; grilles : trois colonnes de mois par bloc (nouvelle grille : lignes de 1,1 rem). Vue Semaine et rubrique Préparation : un jour par ligne. Rien ne déborde de l'écran.

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

6. **Nouvelle grille en essai** (2 novembre 2026) : deuxième bouton violet ; période de 3, 6 ou 12 mois (6 par défaut) et flèches, aussi pour la frise ; prépas des courses d'après la période, commencées dedans, affichées (frise et grilles).
5. **Refonte en essai** (1er novembre 2026) : Année en frise, vue Semaine ouverte par défaut (la semaine en détail, trois à suivre, repère, bilan, consigne de phase), écarts entre courses, « Confirmée / Option » ; ancienne grille, ancienne vue 4 semaines et jours en colonnes gardés derrière des boutons violets, le temps de choisir (§ 2).

Le prototype `composants/planning.js` est remplacé par la nouvelle vue Année.

## 9. Questions ouvertes

- [ ] **Essai en cours** (§ 2) : frise, ancienne grille ou nouvelle grille ; nouvelle vue Semaine ou 4 semaines ; jours en lignes ou en colonnes sur ordinateur. Une fois tranché : retirer les variantes écartées et les boutons violets.
- [ ] **Consignes de phase** (§ 4.3) : textes proposés, à valider ou à remplacer.
- [ ] **Prépa des courses préparatoires et plaisir** (question à poser au bon moment). Aujourd'hui, toute course confirmée ou option a sa prépa (durée de son format) et la course confirmée la plus proche impose sa phase : d'où, dans le jeu d'essai, cinq prépas empilées de février à août, et une préparatoire qui peut imposer son affûtage en pleine prépa de l'objectif. Trois réponses possibles :
  - A. Garder ainsi (en place).
  - B. Une prépa par défaut pour les rôles Objectif principal et Objectif intermédiaire seulement ; une course préparatoire ou plaisir est un losange sur la frise, sans barre, sauf si on paramètre sa prépa. Recommandé : la frise montre la vraie trame de la saison, et la phase suivie est celle de l'objectif.
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

Résultats attendus, vue Année en frise (`calendrier.html#annee`), période de 12 mois :

- Pastille « Année » pleine ; « 12 mois » choisi ; boutons violets « Essai · voir l'ancienne grille » et « Essai · voir la nouvelle grille ».
- Mois d'octobre 2026 à septembre 2027 (« oct. 26 » … « janv. 27 » … « sept. ») ; sur téléphone, leurs initiales.
- Ligne Saison, semaine par semaine (lettres du § 3.1) : DDoDDAA (Trail du Lac, semaines 6 à 12), DDAA (Corrida de Noël, semaines 5 à 8), BBDoDDDoDDAA (Trail des Gorges, semaines 5 à 16), neuf semaines sans objectif clair (du 8 mars au 9 mai), BBBoBBDoDDDoDDAA (Trail des Crêtes), cinq semaines sans prépa. Losanges : Semi de San Sebastián (courue, gris), Trail du Lac, Corrida de Noël (route), Trail des Gorges, Trail des Cimes, Ultra du Plateau et Trail de la Forêt (options, en contour), Trail des Crêtes.
- Sept lignes, dans l'ordre : Trail du Lac (15 nov., DDoDDAA, depuis le bord ; infobulle : prépa commencée le 24 août 2026), Corrida de Noël (13 déc., BBDoDDAA), Trail des Gorges (7 mars, BBBoBBDoDDDoDDAA), Trail des Cimes et Ultra du Plateau (30 mai · option, 26 juin · option : 16 semaines, atténuées), Trail de la Forêt (1er juil. · option, BBBoBDDoDDAA, atténuée), Trail des Crêtes (28 août, 16 semaines). Ni Cross des Collines (abandonnée), ni Trail des Sommets (à surveiller), ni l'option passée du 10 octobre ; pas de ligne pour la course courue.
- Écarts (ordinateur) : 6 sem., 4 sem., 12 sem., 12 sem., 4 sem., 5 j, 8 sem. ; masqués sur téléphone.
- Toucher les mois au 13 janvier : `#semaines=2027-01-11` ; toucher la ligne du Trail des Gorges : sa page en modale, rubrique Préparation ; toucher le losange du Semi de San Sebastián : son résultat.
- Bouton « voir l'ancienne grille » : l'ancienne grille, retenue sur l'appareil, avec les boutons « voir la frise » et « voir la nouvelle grille » ; « voir la frise » : de nouveau la frise.
- Trail des Gorges à 20 semaines : barre de 20 cases ; Corrida de Noël en Triathlon S (format sans durée) : sa ligne, sans barre.
- Téléphone : rien ne déborde.

Résultats attendus, période de la vue Année (frise) :

- Par défaut, 6 mois : d'octobre à mars ; ligne Saison DDoDDAADDAABBDoDDDoDDAA puis quatre semaines sans prépa ; lignes : Trail du Lac, Corrida de Noël, Trail des Gorges, puis Trail des Cimes (BBBoBBDo) et Ultra du Plateau (BBBo), courses d'après la période, barres coupées au bord droit, sans losange ; écarts : 6 sem., 4 sem., 12 sem.
- Période suivante : `#annee=2027-04`, d'avril à septembre ; ligne Saison : six semaines sans prépa, BBBoBBDoDDDoDDAA (Trail des Crêtes), cinq semaines sans prépa ; lignes : Trail des Cimes, Ultra du Plateau, Trail de la Forêt, Trail des Crêtes ; pas de trait d'aujourd'hui. « Ce mois-ci » : de nouveau octobre.
- « 3 mois » : octobre à décembre, retenu sur l'appareil.
- Téléphone, 6 mois : noms des mois en entier ; rien ne déborde.

Résultats attendus, nouvelle grille (essai, bouton « voir la nouvelle grille ») :

- 6 mois par défaut : un bloc de six colonnes, d'octobre à mars (téléphone : deux blocs de trois) ; lignes de 1,25 rem (téléphone : 1,1 rem) ; boutons « voir la frise » et « voir l'ancienne grille ».
- Courses écrites dans leur case : Semi de San Sebastián (courue), Trail du Lac, Corrida de Noël (route), Trail des Gorges.
- Nom au départ du trait : Trail du Lac le 1er octobre (prépa commencée le 24 août, avant la période), Corrida de Noël le 19 octobre, Trail des Gorges le 16 novembre, Trail des Cimes le 8 février, Ultra du Plateau le 8 mars.
- Légende : « ROUTE confirmée, option », « TRAIL confirmée, option », courue, préparation, aujourd'hui, à 0,8 rem ; aujourd'hui cerclé de 2 px.
- Période suivante : avril à septembre ; Trail des Cimes, Ultra du Plateau, Trail de la Forêt, Trail des Crêtes ; noms au départ : Trail des Cimes le 1er avril et Ultra du Plateau le 2 avril (prépas commencées avant la période), Trail de la Forêt le 12 avril, Trail des Crêtes le 10 mai.
- « 12 mois » : deux blocs de six, lignes de 1 rem. Toucher le 22 octobre : la semaine du lundi 19.
- Rien ne déborde, ni sur ordinateur ni sur téléphone.

Résultats attendus, vue Semaine (`calendrier.html`, vue par défaut, séances d'essai) :

- Pastille « Semaine » pleine ; boutons violets « Essai · voir l'ancienne vue 4 semaines » et, sur ordinateur, « Essai · jours en colonnes ».
- « Semaine du 19 au 25 oct. », « Faites 1 / 4 », « Trail du Lac · semaine 9 sur 12 · J-26 ».
- Développement, trait de sa couleur, sa consigne ; « aussi : Corrida de Noël · semaine 1 sur 8 · Base ».
- Sept jours, un par ligne, un « + » chacun ; mardi 20 mis en avant (« aujourd'hui ») ; séances : lundi 19 Renfo Gainage 30 min (faite), mardi 20 Run 8×400 m, jeudi 22 Run Footing 45 min, samedi 24 Run Sortie 1 h 30.
- À suivre : « Sem. du 26 oct. · Développement · semaine 10 · ◆ dim. 1er : inscriptions · Corrida de Noël » ; « Sem. du 2 nov. · Affûtage · semaine 11 » ; « Sem. du 9 nov. · Affûtage · semaine 12 · Trail du Lac · dim. 15 ».
- Cocher 8×400 m : « Faites 2 / 4 ». Semaine suivante : « Semaine du 26 oct. au 1er nov. », « Trail du Lac · semaine 10 sur 12 · J-26 », rendez-vous clé le dimanche ; encore une : Affûtage et sa consigne, pas de bilan (aucune séance) ; « Cette semaine » : retour au 19 octobre.
- Déplier la semaine du 9 novembre : le jour de course Trail du Lac, qui ouvre sa page ; le nom de la course du repère ouvre sa page, rubrique Préparation.
- Bouton « jours en colonnes » : sept colonnes, retenu sur l'appareil ; bouton « ancienne vue 4 semaines » : quatre semaines, pastille « 4 semaines » ; de nouveau : la nouvelle vue.
- Au 14 décembre 2026, sans le Trail des Gorges : « Semaine du 14 au 20 déc. », « Sans objectif clair », trait en pointillé, ni phase ni consigne.
- Site partagé en lecture seule : ni « + », ni modification, cases « faite » grisées.
- Téléphone : un jour par ligne, pas de bouton « jours en colonnes », rien ne déborde.

Résultats attendus, ancienne grille (essai) :

- Douze mois, d'octobre 2026 à septembre 2027 : premier bloc oct. à mars, second bloc avr. à sept. ; les 1 à 19 octobre sont atténués.
- Courses affichées : Semi de San Sebastián (4 oct., route, grisée, sans trait), Trail du Lac (15 nov.), Corrida de Noël (13 déc., route), Trail des Gorges (7 mars), Trail des Cimes (30 mai), Ultra du Plateau (26 juin), Trail de la Forêt (1er juillet), Trail des Crêtes (28 août). Ni Cross des Collines (abandonnée) ni Trail des Sommets (à surveiller).
- Couleurs : Corrida de Noël en route confirmée ; Trail du Lac, Trail des Gorges et Trail des Crêtes en trail confirmée ; Trail des Cimes, Ultra du Plateau et Trail de la Forêt en trail en option.
- Traits de prépa, verticaux, du premier jour jusqu'à la veille de la course : Trail du Lac depuis le 1er oct. (la prépa a commencé le 24 août, avant la période ; l'infobulle du 1er oct. le dit), Corrida de Noël du 19 oct. au 12 déc. (55 jours, sans interruption, en deux colonnes), Trail des Gorges depuis le 16 nov., Trail des Cimes depuis le 8 févr., Ultra du Plateau depuis le 8 mars, Trail de la Forêt depuis le 12 avr., Trail des Crêtes depuis le 10 mai. Aucun trait pour le Semi de San Sebastián (courue). Là où deux prépas se chevauchent, deux traits côte à côte.
- Chevauchements lisibles : les prépas de la Corrida de Noël et du Trail du Lac (19 oct. au 15 nov.), de la Corrida de Noël et du Trail des Gorges (16 nov. au 13 déc.), puis, de février à août 2027, celles du Trail des Gorges, des Cimes, de l'Ultra du Plateau, de la Forêt et des Crêtes.
- Une option dont la date est passée (essai : 10 oct. 2026) n'apparaît pas.
- Toucher le 22 oct. ouvre la semaine du lundi 19 octobre ; toucher Trail des Gorges ouvre sa page.
- Téléphone : trois colonnes de mois, quatre blocs ; rien ne déborde.

Résultats attendus, ancienne vue 4 semaines (essai), du 19 octobre au 15 novembre 2026 :

- Quatre semaines : 19 oct., 26 oct., 2 nov., 9 nov.
- Phases : Développement, Développement, Affûtage, Affûtage (semaines 9 à 12 du plan de 12 semaines du Trail du Lac, qui a commencé le 24 août) ; la semaine du 26 oct. est la semaine 10.
- Séances d'essai à leurs jours ; seule la séance du lundi 19 est cochée « faite ».
- Rendez-vous clé : dimanche 1er novembre, ouverture des inscriptions · Corrida de Noël. Pas d'autre ouverture dans la période (celle de l'Ultra du Plateau est passée).
- Dimanche 15 novembre : jour de course, Trail du Lac.
- Fenêtre ouverte le 14 décembre 2026 : aucune semaine sans objectif clair (le plan du Trail des Gorges est en cours depuis le 16 novembre). Pour voir « Sans objectif clair », un essai sans le Trail des Gorges : les semaines du 14 et du 21 décembre sont alors sans objectif.

Résultats attendus, plan d'une course :

- Trail des Gorges : plan de 16 semaines, du lundi 16 novembre 2026 au dimanche 7 mars 2027 ; phases : Base ×3 (16 nov., 23 nov., 30 nov.), Deload (7 déc.), Base ×2 (14 et 21 déc.), Développement (28 déc.), Deload (4 janv.), Développement ×3 (11, 18 et 25 janv.), Deload (1er févr.), Développement ×2 (8 et 15 févr.), Affûtage ×2 (22 févr., 1er mars) ; jour J le 7 mars.
- Trail du Lac : 12 semaines, du 24 août au 15 novembre : Base ×3, Deload, Base, Développement ×2, Deload, Développement ×2, Affûtage ×2.
- Corrida de Noël : 8 semaines, du 19 octobre au 13 décembre : Base ×2, Développement, Deload, Développement ×2, Affûtage ×2.
- Trail des Crêtes : 16 semaines, du 10 mai au 28 août : même enchaînement que Trail des Gorges.
- « Paramétrer le plan » sur Trail des Gorges, durée portée à 20 semaines : début du plan le 19 octobre ; les phases se recalculent. Mettre la semaine du 7 décembre en Base : seule cette semaine change ; « Recalculer selon les règles » (confirmé) la remet en Deload.
- Site partagé en lecture seule : le plan s'affiche, sans « Paramétrer le plan » ni saisie de séance.
- Adresse d'une course inconnue, d'un autre utilisateur ou sans date : « Course introuvable. » et un lien de retour.
Résultats attendus, durées de prépa (ancienne grille) :

- Durée de prépa : la durée propre à une course remplace celle de son format (Trail des Gorges à 20 semaines : trait le lundi 19 octobre 2026) ; un format sans durée (Triathlon S) : pas de trait.

Résultats attendus, ancienne vue 4 semaines et séances (essai ; au 20 octobre 2026, séances d'essai ci-dessus) :

- Pastille « 4 semaines » pleine ; les quatre semaines indiquent « aussi : Corrida de Noël » (leur plan couvre les mêmes semaines).
- Renfo · Gainage 30 min le lundi 19 est cochée « faite » (barrée), les trois autres séances ne le sont pas. Rendez-vous clé le dimanche 1er novembre ; Trail du Lac sur le dimanche 15 novembre, en trail confirmée.
- Cocher « 8×400 m » : écriture de `faite` ; ajouter « Footing 30 min » (Run) le mercredi 21 : elle apparaît ce jour-là ; un libellé vide : « Écris le libellé de la séance. » ; modifier le footing du jeudi 22 en Renfo « Gainage 20 min » ; le supprimer (confirmation).
- Flèche « 4 semaines plus tard » : la première semaine est celle du 16 novembre ; deux fois : celle du 14 décembre ; « Aujourd'hui » : de nouveau celle du 19 octobre.
- Pastilles : à l'ouverture, « Semaine » pleine (vue par défaut) ; un toucher sur « Année » ouvre la frise ; ancienne vue : « 4 semaines » pleine ; « Aujourd'hui » ramène à la semaine du 19 octobre.
- Toucher le Semi de San Sebastián (courue, 4 octobre) dans la vue Année : son résultat s'ouvre en modale (libellé « Courue »).
- Fenêtre d'une séance (ajout ou modification) et fenêtre « Paramétrer le plan » : « Annuler » à gauche, le bouton principal à droite, en haut ; titre en libellé (Space Mono, capitales) ; libellés de champ à 0,7 rem ; le voile de la feuille d'une course ; « Supprimer la séance » à contour rouge, avec sa poubelle, seul en bas.
- Année : toucher le 22 octobre ouvre `#semaines=2026-10-19` ; toucher Trail des Gorges ouvre sa page en modale, à la rubrique Préparation (`course.html?id=…#preparation`), la croix en haut ; la fermer ramène au Calendrier, à la même vue.
- Dans l'ancienne vue 4 semaines, toucher le jour de course (Trail du Lac) ou le rendez-vous clé (Corrida de Noël) ouvre de même la page de la course.
- Au 14 décembre 2026, sans le Trail des Gorges : les semaines du 14, du 21, du 28 décembre et du 4 janvier sont « Sans objectif clair ».
- Téléphone : un jour par ligne, rien ne déborde.
- Site partagé en lecture seule : ni « + », ni modification de séance, cases « faite » grisées.

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
