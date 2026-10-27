# Calendrier · spécification fonctionnelle

Version 0.4 · 27 octobre 2026 · [Retour au sommaire](README.md) · Lots 1 à 3 construits

## 1. Rôle

Le Calendrier montre la saison à trois échelles, comme un zoom : l'année, les quatre semaines à venir, le plan d'une course. Il répond à trois questions : quand courir, comment se prépare chaque course, et où sont les semaines sans objectif.

- **Hors périmètre** : la saisie des courses (elle reste dans [Objectif](module-objectif-specification.md)) ; l'apparence détaillée (couleurs, tailles : [design](design.md)) ; l'import des séances depuis une application et la génération d'un plan par intelligence artificielle (todo du [sommaire](README.md)).
- **Aucun calcul par intelligence artificielle** : les phases d'un plan se déduisent de règles générales de la course à pied et du trail (§ 5).

## 2. Les trois vues

| Vue | Échelle | Comment on l'ouvre |
| --- | --- | --- |
| **Année** | 12 mois, une case par jour | Bandeau déroulant (vue par défaut) |
| **4 semaines** | Quatre semaines, avec les séances | Bandeau déroulant, ou toucher un jour de la vue Année |
| **Plan d'une course** | Du début du plan au jour J | Toucher une course, dans la vue Année ou la vue 4 semaines |

Le bandeau déroulant propose Année et 4 semaines. Le plan d'une course n'y figure pas : il dépend d'une course choisie.

Les données viennent de la liste de courses de l'utilisateur, la même que pour Objectif ; les séances et les phases sont propres au Calendrier (§ 7).

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
| 1 | Bandeau déroulant de la vue | « Année » | En haut à gauche |
| 2 | Légende : quatre couleurs de course et trait de prépa | « Trail · validée » | En haut à droite |
| 3 | Nom du mois | « oct. » | Haut de chaque colonne |
| 4 | Numéro du jour, de 1 à 31 | « 15 » | Marge de gauche |
| 5 | Case d'un jour : la plus fine possible, une ligne par jour | | Grille |
| 6 | Jour de course, rempli de la couleur de la course | Trail validée | Case du jour |
| 7 | Trait de début de prépa, de la couleur de la course | Début de la prépa | Case du premier jour |
| 8 | Second bloc de six mois, sous le premier | avr. à sept. | Sous la grille |

### 3.2 Règles

- **Période** : douze mois à partir du mois en cours (le premier bloc commence par lui). Les jours passés du mois en cours sont atténués. Un mois qui n'a pas ce jour (le 30 ou le 31) laisse une case vide.
- **Quatre couleurs** : deux familles, route et trail ; dans chacune, une nuance pleine pour une course **validée** et une nuance atténuée, cadrée de la couleur pleine, pour une course **non validée**. Valeurs dans le [document de design](design.md) (§ 9).
- **Nom de la course** écrit dans sa case, sur une ligne, coupé s'il ne tient pas.
- **Validée** : statut Confirmée. **Non validée** : statut Option. Les courses « À surveiller » et abandonnées ne s'affichent pas. Une course courue s'affiche grisée, sans trait de prépa.
- **Route ou trail** : le type de la course, déduit de son format. Tout ce qui n'est pas trail est dans la famille route.
- **Trait de prépa** : sur le seul premier jour de la prépa, un trait de la couleur de la course. Si la prépa a commencé avant la période affichée, le trait se pose sur le premier jour affiché, et l'infobulle donne la vraie date de début. Deux traits dans la même période signalent deux préparations qui se chevauchent, sans plus de dessin.
- **Date au mois seulement** : la case est au 1er du mois, avec la nuance d'une course non validée.
- **Toucher un jour** ouvre la vue 4 semaines, à partir du lundi de la semaine de ce jour ; **toucher une course** ouvre son plan (§ 5.3). Sur ordinateur, une infobulle donne la date, la course et la phase.

## 4. Vue 4 semaines

Quatre semaines complètes, du lundi de la semaine en cours (ou de la semaine du jour touché dans la vue Année) au dimanche de la quatrième.

### 4.1 Plan de page

```
(1) [ 4 semaines ▾ ]                                (2) légende
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
| 1 | Bandeau déroulant de la vue | « 4 semaines » | En haut à gauche |
| 2 | Légende : phases et types de séance | « Base », « Run », « Renfo » | En haut à droite |
| 3 | Jours de la semaine | « lun. » à « dim. » | Haut de la grille |
| 4 | Début de la semaine | « Sem. du 19 oct. » | Marge de gauche |
| 5 | Trait vertical de la semaine : phase et nom, ou « Sans objectif clair » | « Développement » | Marge de gauche, sur la hauteur de la semaine |
| 6 | Séance de renforcement | « Renfo · Gainage 30 min » | Case du jour |
| 7 | Sortie course à pied, avec sa case « faite » | « Run · Footing 45 min » | Case du jour |
| 8 | Rendez-vous clé : ouverture des inscriptions | « Corrida de Noël » | Case du jour |
| 9 | Flèches : 4 semaines plus tôt, 4 semaines plus tard | ‹ › | Haut, à côté du bandeau |
| 10 | Bouton « + » : ajouter une séance ce jour-là | + | Bas de la case du jour |

Téléphone : un jour par ligne dans chaque semaine, le trait vertical à gauche.

### 4.2 Règles

- **Séance** : un type (run ou renfo), un libellé libre, une case « faite ». Elle se saisit à la main (§ 7) ; l'import depuis une application viendra plus tard.
- **Phase d'une semaine** : un trait vertical coloré, avec le nom de la phase : Base, Développement, Affûtage ou Deload (§ 5.1). Une semaine sans préparation en cours affiche « Sans objectif clair ».
- **Semaine dans deux plans** : le plan de la course confirmée la plus proche l'emporte ; la semaine indique discrètement « aussi : » suivi de l'autre course. Une option n'entre pas dans cette règle : elle a son plan, mais seule.
- **Rendez-vous clés** : l'ouverture des inscriptions (`ouverture_inscriptions`) d'une course Confirmée ou Option.
- **Toucher une course** (jour de course ou rendez-vous clé) ouvre son plan.
- **Saisie d'une séance** : le « + » d'un jour ouvre une fenêtre (date, type, libellé de 100 caractères au plus) ; toucher une séance la modifie ou la supprime (confirmation) ; sa case « faite » s'enregistre aussitôt. Une séance ajoutée depuis un plan est liée à sa course.
- **Flèches** : les 4 semaines suivantes ou précédentes, par pas de 4 semaines.

## 5. Plan d'une course

### 5.1 Principe

Le plan d'une course reprend la vue 4 semaines, du premier jour du plan au jour J, une ligne par semaine. Il s'ouvre depuis la vue Année ou la vue 4 semaines, et la page de la course d'Objectif reçoit un lien « Voir le plan ». Les phases se calculent d'après la date de course par des **règles générales**, puis se modifient à la main.

**Durée** : un nombre de semaines complètes lundi-dimanche, la dernière étant la semaine du jour J. Valeur par défaut propre au **format** de la course ; une valeur propre à la course la remplace. Valeurs par défaut proposées au § 5.4.

**Règles de phases**, appliquées dans cet ordre :

1. **Affûtage** : les deux dernières semaines (la semaine du jour J comprise).
2. **Deload** : toutes les quatre semaines (semaines 4, 8, 12…), sauf si la semaine est déjà en affûtage.
3. **Base** puis **Développement** : les semaines restantes sont réparties par moitié, la première moitié (arrondie à l'inférieur) en Base, le reste en Développement.

Exemple, plan de 10 semaines : Base ×3, Deload, Développement ×3, Deload, Affûtage ×2.

### 5.2 Plan de page

```
(1) ← Retour       Trail des Gorges · plan de 10 semaines
(2) Début : 28 déc. 2026 → jour J : 7 mars 2027      [Préparer]
(3) frise :  [Base ▓▓▓ | Deload | Dév. ▓▓▓ | Deload | Aff. ▓▓ ]
(4) semaine 1 · 28 déc. · Base          séances…
(4) semaine 2 · 4 janv. · Base          séances…
    …
(5) semaine 10 · 1er mars · Affûtage    … ◆ jour J
```

| N° | Élément | Exemple | Place |
| --- | --- | --- | --- |
| 1 | Retour et titre | « Trail des Gorges · plan de 10 semaines » | En haut |
| 2 | Dates du plan et bouton « Préparer » | « 28 déc. 2026 → 7 mars 2027 » | Sous le titre |
| 3 | Frise des phases, côte à côte | Base, Deload, Développement… | Sous les dates |
| 4 | Une semaine : numéro, début, phase, séances | « semaine 1 · 28 déc. · Base » | Liste |
| 5 | Jour J | « 7 mars » | Dernière semaine |

### 5.3 Rubrique « Préparer »

Le bouton « Préparer » ouvre le réglage complet de la prépa, depuis la page du plan (et la page de la course).

| N° | Élément | Rôle |
| --- | --- | --- |
| P1 | Durée en semaines | Valeur du format, modifiable pour cette course ; affiche le début du plan. |
| P2 | Frise graphique | Phases côte à côte, bords à glisser pour allonger ou réduire une phase. |
| P3 | Tableau, une ligne par semaine | Numéro, dates, phase à choisir dans une liste (Base, Développement, Affûtage, Deload). |
| P4 | « Recalculer selon les règles » | Revient aux règles générales du § 5.1, après confirmation. |
| P5 | « Enregistrer » | Range la durée et les phases modifiées. |

Le bouton « Préparer » ouvre une fenêtre ; « Recalculer selon les règles » (après confirmation) et les changements ne comptent qu'une fois « Enregistrer » pressé, « Annuler » ne range rien. Le bouton est aussi proposé sur la page d'une course sans durée de prépa, pour en choisir une. Seules les semaines modifiées à la main sont rangées ; les autres se recalculent à l'affichage. Le site partagé en lecture seule n'offre ni « Préparer », ni saisie.

### 5.4 Durées de prépa par défaut (à valider)

Propositions tirées de plans d'entraînement publiés (recherche du 27 octobre 2026), pour un coureur qui court déjà régulièrement. Elles ne servent que de point de départ : chaque course peut avoir sa propre durée (§ 5.3).

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

Sans valeur publiée trouvée, à fournir par l'utilisateur : Trail découverte, Course en heure, Marche (3 formats), Fast hiking (2 formats), Triathlon (7 formats). Ces formats n'ont pas de plan en attendant : le trait de prépa et les phases ne s'affichent pas, et la rubrique « Préparer » demande la durée.

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
3. **Vues 4 semaines et plan d'une course**, saisie des séances, rubrique « Préparer ». **Construit** (27 octobre 2026) : `calendrier.js` et `calendrier.css` étendus ; lien « Voir le plan » sur la page d'une course d'Objectif ; la vue active se lit dans l'adresse (`#annee`, `#semaines=AAAA-MM-JJ`, `#plan=identifiant`), le bouton retour du navigateur ramène à la vue précédente.

Le prototype `composants/planning.js` est remplacé par la nouvelle vue Année.

## 9. Questions ouvertes

- [ ] **Durées de prépa par format** : valeurs du § 5.4 à valider ; à fournir pour Trail découverte, Course en heure, Marche, Fast hiking et Triathlon.
- [ ] **Semaine de récupération après la course** : une semaine de récupération après le jour J, comptée comme Deload ?
- [ ] **Vue Année sur « six mois »** : la vue affiche douze mois ; faut-il aussi une vue de six mois, comme dans l'idée de zoom ?
- [x] **Couleurs** des quatre familles de course et des quatre phases : fixées dans le document de design (§ 10, 27 octobre 2026).
- [x] **Semaine dans deux plans** : le plan de la course confirmée la plus proche l'emporte (retenu le 27 octobre 2026).
- [ ] **Objectif principal** : plus marqué que les autres courses sur la vue Année ?
- [ ] **Séances** : durée, distance, D+ et ressenti facultatifs plus tard ?

## 10. Contrôles

Jeu d'essai, données fictives, au mardi 20 octobre 2026 à 10 h, heure de Paris, thème Bleu et orange. Les courses sont celles du [jeu d'essai d'Objectif](module-objectif-specification.md) (§ 10).

**Durées de prépa** : celles du § 5.4 (10 km 8 semaines, Trail court 12, Trail long 16, Ultra-trail 16).

**Séances d'essai** : lundi 19 octobre, Renfo · Gainage 30 min (faite) ; mardi 20, Run · 8×400 m ; jeudi 22, Run · Footing 45 min ; samedi 24, Run · Sortie 1 h 30.

Résultats attendus, vue Année :

- Douze mois, d'octobre 2026 à septembre 2027 : premier bloc oct. à mars, second bloc avr. à sept. ; les 1 à 19 octobre sont atténués.
- Courses affichées : Semi de San Sebastián (4 oct., route, grisée, sans trait), Trail du Lac (15 nov.), Corrida de Noël (13 déc., route), Trail des Gorges (7 mars), Trail des Cimes (30 mai), Ultra du Plateau (26 juin), Trail de la Forêt (1er juillet), Trail des Crêtes (28 août). Ni Cross des Collines (abandonnée) ni Trail des Sommets (à surveiller).
- Couleurs : Corrida de Noël en route validée ; Trail du Lac, Trail des Gorges et Trail des Crêtes en trail validée ; Trail des Cimes, Ultra du Plateau et Trail de la Forêt en trail non validée.
- Traits de prépa : Trail du Lac sur le 1er oct. (la prépa a commencé le 24 août, avant la période ; l'infobulle le dit), Corrida de Noël le 19 oct., Trail des Gorges le 16 nov., Trail des Cimes le 8 févr., Ultra du Plateau le 8 mars, Trail de la Forêt le 12 avr., Trail des Crêtes le 10 mai. Aucun trait sur le Semi de San Sebastián (courue).
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
- « Préparer » sur Trail des Gorges, durée portée à 20 semaines : début du plan le 19 octobre ; les phases se recalculent. Mettre la semaine du 7 décembre en Base : seule cette semaine change ; « Recalculer selon les règles » (confirmé) la remet en Deload.
- Site partagé en lecture seule : le plan s'affiche, sans « Préparer » ni saisie de séance.
- Adresse d'une course inconnue, d'un autre utilisateur ou sans date : « Course introuvable. » et un lien de retour.
Résultats attendus, durées de prépa (vue Année) :

- Durée de prépa : la durée propre à une course remplace celle de son format (Trail des Gorges à 20 semaines : trait le lundi 19 octobre 2026) ; un format sans durée (Triathlon S) : pas de trait.

Résultats attendus, vue 4 semaines, séances et plan (lot 3, séances d'essai ci-dessus, au 20 octobre 2026) :

- Bandeau sur « 4 semaines » ; les quatre semaines indiquent « aussi : Corrida de Noël » (leur plan couvre les mêmes semaines).
- Renfo · Gainage 30 min le lundi 19 est cochée « faite » (barrée), les trois autres séances ne le sont pas. Rendez-vous clé le dimanche 1er novembre ; Trail du Lac sur le dimanche 15 novembre, en trail validée.
- Cocher « 8×400 m » : écriture de `faite` ; ajouter « Footing 30 min » (Run) le mercredi 21 : elle apparaît ce jour-là ; un libellé vide : « Écris le libellé de la séance. » ; modifier le footing du jeudi 22 en Renfo « Gainage 20 min » ; le supprimer (confirmation).
- Flèche « 4 semaines plus tard » : la première semaine est celle du 16 novembre.
- Année : toucher le 22 octobre ouvre `#semaines=2026-10-19` ; toucher Trail des Gorges ouvre `#plan=…`, « Retour » ramène à `#annee` ; le bouton retour du navigateur aussi.
- Plan du Trail des Gorges : « Trail des Gorges · plan de 16 semaines », « Début : lun. 16 nov. 2026 → jour J : dim. 7 mars 2027 », phases dans l'ordre Base ×3, Deload, Base ×2, Développement, Deload, Développement ×3, Deload, Développement ×2, Affûtage ×2 ; la dernière semaine porte le jour J (et la Corrida de Noël le dimanche 13 décembre dans la quatrième).
- « Préparer », durée 20 : « Début : lun. 19 oct. 2026 » ; semaine du 7 décembre en Base puis « Enregistrer » : la durée de la course (20) et une seule semaine modifiée sont rangées, la semaine s'affiche « Base · modifiée » ; « Recalculer selon les règles » puis « Enregistrer » : plus de semaine modifiée, la semaine du 7 décembre est de nouveau en Deload. « Annuler » ne range rien.
- Frise : une poignée entre deux phases ; glisser la première d'une semaine vers la droite met la semaine 4 en Base dans le tableau.
- Course de format sans durée (Corrida de Noël en Triathlon S) : « Pas de plan » et « Préparer » ; durée 10 : « Corrida de Noël · plan de 10 semaines ». Adresse inconnue : « Course introuvable. » et « ← Retour ».
- Au 14 décembre 2026, sans le Trail des Gorges : les semaines du 14, du 21, du 28 décembre et du 4 janvier sont « Sans objectif clair ».
- Page d'une course d'Objectif : lien « Voir le plan → » vers `calendrier.html#plan=…`.
- Téléphone : un jour par ligne, rien ne déborde, pour les 4 semaines comme pour le plan.
- Site partagé en lecture seule : ni « + », ni modification de séance, cases « faite » grisées, ni « Préparer ».
