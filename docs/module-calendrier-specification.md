# Calendrier · spécification fonctionnelle

Version 0.12 · 30 octobre 2026 · [Retour au sommaire](README.md) · Durées de prépa validées, récupération facultative après la course, questions tranchées ; vue choisie par deux pastilles, « Aujourd'hui », courses courues touchables

## 1. Rôle

Le Calendrier montre la saison à deux échelles : l'année et les quatre semaines à venir. La troisième échelle, la préparation d'une course, vit sur la **page de la course** ([Objectif](module-objectif-specification.md), § 3.4) : toucher une course dans le Calendrier y mène directement. Il répond à trois questions : quand courir, comment se prépare chaque course, et où sont les semaines sans objectif.

- **Hors périmètre** : la saisie des courses (elle reste dans [Objectif](module-objectif-specification.md)) ; l'apparence détaillée (couleurs, tailles : [design](design.md)) ; l'import des séances depuis une application et la génération d'un plan par intelligence artificielle (todo du [sommaire](README.md)).
- **Aucun calcul par intelligence artificielle** : les phases d'un plan se déduisent de règles générales de la course à pied et du trail (§ 5).

## 2. Les deux vues

| Vue | Échelle | Comment on l'ouvre |
| --- | --- | --- |
| **Année** | 12 mois, une case par jour | Pastille « Année » (vue par défaut) |
| **4 semaines** | Quatre semaines, avec les séances | Pastille « 4 semaines », ou toucher un jour de la vue Année |

Le zoom « une course » n'est pas une vue du Calendrier : c'est la rubrique **Préparation** de la page de la course (§ 5). Toucher une course (case de la vue Année, jour de course ou rendez-vous clé de la vue 4 semaines) ouvre la page de cette course, en modale par-dessus le Calendrier, à la rubrique Préparation ; une course courue s'ouvre avec son résultat (Objectif, § 3.8). La croix de la page ramène au Calendrier, à la même vue.

**Choix de la vue** : deux pastilles côte à côte, « Année » et « 4 semaines », celle de la vue ouverte pleine (Accent) ; un seul toucher change de vue.

Les données viennent de la liste de courses de l'utilisateur, la même que pour Objectif ; les séances et les phases sont propres à la préparation (§ 7).

## 3. Vue Année

Épurée, pour voir un maximum d'information d'un coup d'œil.

### 3.1 Plan de page

```
(1) [ Année ▾ ]                                   (2) légende
         (3) oct.  nov.  déc.  janv.  févr.  mars
 (4)  1     ·     ━(7)   ·     ·      ·      ·
      2     ·      ·     ·     ·      ·      ·
      …
     15     ·    ■(6)    ·     ·      ·      ·
     …
     31     ·      –     ·     ·      –      ·
 (8) ───────────────────────────────────────────
         (3) avr.  mai   juin  juil.  août   sept.
      1 … 31
```

Téléphone : trois colonnes de mois au lieu de six, donc quatre blocs empilés, dans le même ordre (oct.-déc., janv.-mars, avr.-juin, juil.-sept.).

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1 | Pastilles de la vue : « Année », « 4 semaines » | « Année » pleine | En haut à gauche |
| 2 | Légende : quatre couleurs de course et trait de prépa | « Trail · validée » | En haut à droite |
| 3 | Nom du mois | « oct. » | Haut de chaque colonne |
| 4 | Numéro du jour, de 1 à 31 | « 15 » | Marge de gauche |
| 5 | Case d'un jour : la plus fine possible, une ligne par jour | | Grille |
| 6 | Jour de course, rempli de la couleur de la course | Trail validée | Case du jour |
| 7 | Trait de prépa : vertical, de la couleur de la course, du premier jour de la prépa jusqu'à la veille de la course | Préparation | À gauche des cases, d'un jour à l'autre et d'un mois au suivant |
| 8 | Second bloc de six mois, sous le premier | avr. à sept. | Sous la grille |

### 3.2 Règles

- **Période** : douze mois à partir du mois en cours (le premier bloc commence par lui). Les jours passés du mois en cours sont atténués. Un mois qui n'a pas ce jour (le 30 ou le 31) laisse une case vide.
- **Quatre couleurs** : deux familles, route et trail ; dans chacune, une nuance pleine pour une course **validée** et une nuance atténuée, cadrée de la couleur pleine, pour une course **non validée**. Valeurs dans le [document de design](design.md) (§ 9).
- **Nom de la course** écrit dans sa case, sur une ligne, coupé s'il ne tient pas.
- **Validée** : statut Confirmée. **Non validée** : statut Option. Les courses « À surveiller » et abandonnées ne s'affichent pas. Une course courue s'affiche grisée, sans trait de prépa ; la toucher ouvre son résultat.
- **Route ou trail** : le type de la course, déduit de son format. Tout ce qui n'est pas trail est dans la famille route.
- **Trait de prépa** : un trait vertical, de la couleur de la course, à gauche des cases ; il part du premier jour de la prépa et descend jour après jour, d'un mois au suivant, jusqu'à la case de la course. Deux prépas qui se chevauchent tracent deux traits côte à côte : le chevauchement se lit d'un coup d'œil. Une course non validée a un trait atténué. Si la prépa a commencé avant la période affichée, le trait part du premier jour affiché, et l'infobulle de ce jour donne la vraie date de début.
- **Jours** : un seul ton, nettement plus clair que le cadre ; un jour passé n'a plus de fond ; aucune nuance pour le week-end.
- **Date au mois seulement** : la case est au 1er du mois, avec la nuance d'une course non validée.
- **Toucher un jour** ouvre la vue 4 semaines, à partir du lundi de la semaine de ce jour ; **toucher une course** ouvre la rubrique Préparation de sa page (§ 5). Sur ordinateur, une infobulle donne la date, la course et la phase.

## 4. Vue 4 semaines

Quatre semaines complètes, du lundi de la semaine en cours (ou de la semaine du jour touché dans la vue Année) au dimanche de la quatrième.

### 4.1 Plan de page

```
(1) (Année) (4 semaines)  (9) ‹ [Aujourd'hui] ›     (2) légende
        (3) lun.    mar.    mer.    jeu.    ven.    sam.    dim.
 (4)│ Sem. du 19 oct.
 (5)│ Développement  (6) ☐ Renfo   (7) ☑ Run     …
 (4)│ Sem. du 26 oct.
 (5)│ Deload
 …
          (8) ◆ 1er nov. : ouverture des inscriptions · Corrida de Noël
```

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1 | Pastilles de la vue | « 4 semaines » pleine | En haut à gauche |
| 2 | Légende : phases et types de séance | « Base », « Run », « Renfo » | En haut à droite |
| 3 | Jours de la semaine | « lun. » à « dim. » | Haut de la grille |
| 4 | Début de la semaine | « Sem. du 19 oct. » | Marge de gauche |
| 5 | Trait vertical de la semaine : phase et nom, ou « Sans objectif clair » | « Développement » | Marge de gauche, sur la hauteur de la semaine |
| 6 | Séance de renforcement | « Renfo · Gainage 30 min » | Case du jour |
| 7 | Sortie course à pied, avec sa case « faite » | « Run · Footing 45 min » | Case du jour |
| 8 | Rendez-vous clé : ouverture des inscriptions | « Corrida de Noël » | Case du jour |
| 9 | Flèches : 4 semaines plus tôt, 4 semaines plus tard ; entre elles, « Aujourd'hui » (bouton à contour) | ‹ Aujourd'hui › | Haut, à côté des pastilles |
| 10 | Bouton « + » : ajouter une séance ce jour-là | + | Bas de la case du jour |

Téléphone : un jour par ligne dans chaque semaine, le trait vertical à gauche.

### 4.2 Règles

- **Séance** : un type (run ou renfo), un libellé libre, une case « faite ». Elle se saisit à la main (§ 7) ; l'import depuis une application viendra plus tard.
- **Phase d'une semaine** : un trait vertical coloré, avec le nom de la phase : Base, Développement, Affûtage ou Deload (§ 5.1). Une semaine sans préparation en cours affiche « Sans objectif clair ».
- **Semaine dans deux plans** : le plan de la course confirmée la plus proche l'emporte ; la semaine indique discrètement « aussi : » suivi de l'autre course. Une option n'entre pas dans cette règle : elle a son plan, mais seule.
- **Rendez-vous clés** : l'ouverture des inscriptions (`ouverture_inscriptions`) d'une course Confirmée ou Option.
- **Toucher une course** (jour de course ou rendez-vous clé) ouvre sa page, à la rubrique Préparation ; une course courue, son résultat.
- **Saisie d'une séance** : le « + » d'un jour ouvre une fenêtre (date, type, libellé de 100 caractères au plus), présentée comme la fiche d'une course : « Annuler » et « Enregistrer » en haut, le titre en libellé (« AJOUTER UNE SÉANCE »), les champs communs du site ; toucher une séance la modifie, ou la supprime par « Supprimer la séance » (à contour rouge, seul en bas, avec confirmation) ; sa case « faite » s'enregistre aussitôt. Une séance ajoutée depuis un plan est liée à sa course.
- **Flèches** : les 4 semaines suivantes ou précédentes, par pas de 4 semaines ; « Aujourd'hui » ramène aux quatre semaines qui commencent par la semaine en cours.

## 5. Préparation d'une course

### 5.1 Principe

La préparation d'une course est une **rubrique de la page de la course** (Objectif, § 3.4), pas une vue du Calendrier. Elle reprend le principe de la vue 4 semaines, du premier jour du plan au jour J. Les phases se calculent d'après la date de course par des **règles générales**, puis se modifient à la main.

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

La rubrique est le premier texte de la page de la course, juste sous la fiche, dans le même cadre que les autres textes ; elle est ouverte par défaut. Une semaine tient sur une ligne par jour, à toute largeur. Sur téléphone, comme les autres textes, elle se replie sous son titre.

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

Vue Année : trois colonnes de mois, quatre blocs ; cases plus petites ; pas d'infobulle, le toucher ouvre directement la vue 4 semaines. Vues 4 semaines et plan : un jour par ligne. Rien ne déborde de l'écran.

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

Le prototype `composants/planning.js` est remplacé par la nouvelle vue Année.

## 9. Questions ouvertes

- [x] **Durées de prépa par format** : valeurs du § 5.4 validées (28 octobre 2026), à ajuster ensuite.
- [ ] **Durées à fournir** pour Trail découverte, Course en heure, Marche, Fast hiking et Triathlon (aucune valeur publiée trouvée).
- [x] **Semaine de récupération après la course** : oui, facultative par course, une semaine Deload hors durée du plan (retenu le 28 octobre 2026 ; à construire, évolution de la base).
- [x] **Vue Année sur « six mois »** : non, douze mois suffisent (retenu le 28 octobre 2026).
- [x] **Couleurs** des quatre familles de course et des quatre phases : fixées dans le document de design (§ 10, 27 octobre 2026).
- [x] **Semaine dans deux plans** : le plan de la course confirmée la plus proche l'emporte (retenu le 27 octobre 2026).
- [x] **Objectif principal** : pas plus marqué que les autres courses sur la vue Année (retenu le 28 octobre 2026).
- [x] **Séances** : durée, distance, D+ et ressenti facultatifs, plus tard, avec l'import des séances depuis une application (retenu le 28 octobre 2026).

## 10. Contrôles

Jeu d'essai, données fictives, au mardi 20 octobre 2026 à 10 h, heure de Paris, thème Bleu et orange. Les courses sont celles du [jeu d'essai d'Objectif](module-objectif-specification.md) (§ 10).

**Durées de prépa** : celles du § 5.4 (10 km 8 semaines, Trail court 12, Trail long 16, Ultra-trail 16).

**Séances d'essai** : lundi 19 octobre, Renfo · Gainage 30 min (faite) ; mardi 20, Run · 8×400 m ; jeudi 22, Run · Footing 45 min ; samedi 24, Run · Sortie 1 h 30.

Résultats attendus, vue Année :

- Douze mois, d'octobre 2026 à septembre 2027 : premier bloc oct. à mars, second bloc avr. à sept. ; les 1 à 19 octobre sont atténués.
- Courses affichées : Semi de San Sebastián (4 oct., route, grisée, sans trait), Trail du Lac (15 nov.), Corrida de Noël (13 déc., route), Trail des Gorges (7 mars), Trail des Cimes (30 mai), Ultra du Plateau (26 juin), Trail de la Forêt (1er juillet), Trail des Crêtes (28 août). Ni Cross des Collines (abandonnée) ni Trail des Sommets (à surveiller).
- Couleurs : Corrida de Noël en route validée ; Trail du Lac, Trail des Gorges et Trail des Crêtes en trail validée ; Trail des Cimes, Ultra du Plateau et Trail de la Forêt en trail non validée.
- Traits de prépa, verticaux, du premier jour jusqu'à la veille de la course : Trail du Lac depuis le 1er oct. (la prépa a commencé le 24 août, avant la période ; l'infobulle du 1er oct. le dit), Corrida de Noël du 19 oct. au 12 déc. (55 jours, sans interruption, en deux colonnes), Trail des Gorges depuis le 16 nov., Trail des Cimes depuis le 8 févr., Ultra du Plateau depuis le 8 mars, Trail de la Forêt depuis le 12 avr., Trail des Crêtes depuis le 10 mai. Aucun trait pour le Semi de San Sebastián (courue). Là où deux prépas se chevauchent, deux traits côte à côte.
- Chevauchements lisibles : les prépas de la Corrida de Noël et du Trail du Lac (19 oct. au 15 nov.), de la Corrida de Noël et du Trail des Gorges (16 nov. au 13 déc.), puis, de février à août 2027, celles du Trail des Gorges, des Cimes, de l'Ultra du Plateau, de la Forêt et des Crêtes.
- Une option dont la date est passée (essai : 10 oct. 2026) n'apparaît pas.
- Lot 1 : aucun jour ni aucune course ne réagit au toucher ; l'option « 4 semaines » est grisée.
- Lot 3 : toucher le 22 oct. ouvre la vue 4 semaines à partir du lundi 19 octobre ; toucher Trail des Gorges ouvre son plan.
- Téléphone : trois colonnes de mois, quatre blocs ; rien ne déborde.

Résultats attendus, vue 4 semaines (du 19 octobre au 15 novembre 2026) :

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
Résultats attendus, durées de prépa (vue Année) :

- Durée de prépa : la durée propre à une course remplace celle de son format (Trail des Gorges à 20 semaines : trait le lundi 19 octobre 2026) ; un format sans durée (Triathlon S) : pas de trait.

Résultats attendus, vue 4 semaines et séances (au 20 octobre 2026, séances d'essai ci-dessus) :

- Pastille « 4 semaines » pleine ; les quatre semaines indiquent « aussi : Corrida de Noël » (leur plan couvre les mêmes semaines).
- Renfo · Gainage 30 min le lundi 19 est cochée « faite » (barrée), les trois autres séances ne le sont pas. Rendez-vous clé le dimanche 1er novembre ; Trail du Lac sur le dimanche 15 novembre, en trail validée.
- Cocher « 8×400 m » : écriture de `faite` ; ajouter « Footing 30 min » (Run) le mercredi 21 : elle apparaît ce jour-là ; un libellé vide : « Écris le libellé de la séance. » ; modifier le footing du jeudi 22 en Renfo « Gainage 20 min » ; le supprimer (confirmation).
- Flèche « 4 semaines plus tard » : la première semaine est celle du 16 novembre ; deux fois : celle du 14 décembre ; « Aujourd'hui » : de nouveau celle du 19 octobre.
- Vue Année : pastille « Année » pleine ; toucher « 4 semaines » change de vue d'un seul toucher.
- Toucher le Semi de San Sebastián (courue, 4 octobre) dans la vue Année : son résultat s'ouvre en modale (libellé « Courue »).
- Fenêtre d'une séance (ajout ou modification) et fenêtre « Paramétrer le plan » : « Annuler » à gauche, le bouton principal à droite, en haut ; titre en libellé (Space Mono, capitales) ; libellés de champ à 0,7 rem ; le voile de la feuille d'une course ; « Supprimer la séance » à contour rouge, avec sa poubelle, seul en bas.
- Année : toucher le 22 octobre ouvre `#semaines=2026-10-19` ; toucher Trail des Gorges ouvre sa page en modale, à la rubrique Préparation (`course.html?id=…#preparation`), la croix en haut ; la fermer ramène au Calendrier, à la même vue.
- Dans la vue 4 semaines, toucher le jour de course (Trail du Lac) ou le rendez-vous clé (Corrida de Noël) ouvre de même la page de la course.
- Au 14 décembre 2026, sans le Trail des Gorges : les semaines du 14, du 21, du 28 décembre et du 4 janvier sont « Sans objectif clair ».
- Téléphone : un jour par ligne, rien ne déborde.
- Site partagé en lecture seule : ni « + », ni modification de séance, cases « faite » grisées.

Résultats attendus, rubrique Préparation de la page d'une course :

- Page du Trail des Gorges, ouverte sur `#preparation` : la rubrique est ouverte et à l'écran ; « Plan de 16 semaines », « Début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027 » ; phases Base ×3, Deload, Base ×2, Développement, Deload, Développement ×3, Deload, Développement ×2, Affûtage ×2 ; la frise affiche neuf groupes ; la semaine mise en avant est la première (« Première semaine », semaine du 16 novembre, Base), le plan n'ayant pas commencé.
- Page du Trail du Lac (plan de 12 semaines commencé le 24 août) : « Semaine en cours », semaine 9 (19 octobre), Développement, avec ses séances ; « Toutes les semaines (12) » repliée ; dépliée, douze blocs.
- « Paramétrer le plan » : durée portée à 20 semaines, « Début : lun. 19 oct. 2026 » ; semaine du 7 décembre en Base puis « Enregistrer » : la durée de la course (20) et une seule semaine modifiée sont rangées, la semaine s'affiche « Base · modifiée » ; « Recalculer selon les règles » puis « Enregistrer » : plus de semaine modifiée, la semaine du 7 décembre est de nouveau en Deload ; « Annuler » ne range rien.
- Frise : une poignée entre deux phases ; glisser la première d'une semaine vers la droite met la semaine 4 en Base dans le tableau.
- Ajouter une séance depuis la rubrique : elle est liée à la course (`course` renseignée).
- Course de format sans durée (Corrida de Noël en Triathlon S) : « Pas encore de plan… » et « Paramétrer le plan » ; durée 10 : « Plan de 10 semaines ».
- Course courue, abandonnée ou à surveiller : pas de rubrique Préparation.
- Page ouverte sans `#preparation` : pas de défilement ; avec `#preparation` : la rubrique s'ouvre, même repliée.
- Site partagé en lecture seule : la rubrique s'affiche, sans « Paramétrer le plan », ni « + », ni modification de séance.
- Téléphone : la rubrique ne déborde pas.
