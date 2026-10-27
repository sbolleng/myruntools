# Calendrier · spécification fonctionnelle

Version 0.1 · 27 octobre 2026 · [Retour au sommaire](README.md) · Brouillon, à valider

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
- **Quatre couleurs** : deux familles, route et trail ; dans chacune, une nuance pleine pour une course **validée** et une nuance plus claire pour une course **non validée**. Les valeurs seront fixées dans le document de design.
- **Validée** : statut Confirmée. **Non validée** : statut Option. Les courses « À surveiller » et abandonnées ne s'affichent pas. Une course courue s'affiche grisée, sans trait de prépa.
- **Route ou trail** : le type de la course, déduit de son format. Tout ce qui n'est pas trail est dans la famille route.
- **Trait de prépa** : sur le seul premier jour de la prépa, un trait de la couleur de la course. Deux traits dans la même période signalent deux préparations qui se chevauchent, sans plus de dessin.
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

Téléphone : un jour par ligne dans chaque semaine, le trait vertical à gauche.

### 4.2 Règles

- **Séance** : un type (run ou renfo), un libellé libre, une case « faite ». Elle se saisit à la main (§ 7) ; l'import depuis une application viendra plus tard.
- **Phase d'une semaine** : un trait vertical coloré, avec le nom de la phase : Base, Développement, Affûtage ou Deload (§ 5.1). Une semaine sans préparation en cours affiche « Sans objectif clair ».
- **Semaine dans deux plans** : le plan de la course la plus proche l'emporte. Le Calendrier le signale discrètement.
- **Rendez-vous clés** : l'ouverture des inscriptions (`ouverture_inscriptions`) d'une course Confirmée ou Option.
- **Toucher une course** (jour de course ou rendez-vous clé) ouvre son plan.

## 5. Plan d'une course

### 5.1 Principe

Le plan d'une course reprend la vue 4 semaines, du premier jour du plan au jour J, une ligne par semaine. Il s'ouvre depuis la vue Année ou la vue 4 semaines, et la page de la course d'Objectif reçoit un lien « Voir le plan ». Les phases se calculent d'après la date de course par des **règles générales**, puis se modifient à la main.

**Durée** : un nombre de semaines complètes lundi-dimanche, la dernière étant la semaine du jour J. Valeur par défaut propre au **format** de la course ; une valeur propre à la course la remplace. Les valeurs par défaut sont à fixer (§ 9).

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

Seules les semaines modifiées à la main sont rangées ; les autres se recalculent à l'affichage. Le site partagé en lecture seule n'offre ni « Préparer », ni saisie.

## 6. Téléphone

Vue Année : trois colonnes de mois, quatre blocs ; cases plus petites ; pas d'infobulle, le toucher ouvre directement la vue 4 semaines. Vues 4 semaines et plan : un jour par ligne. Rien ne déborde de l'écran.

## 7. Données

| Donnée | Source | État |
| --- | --- | --- |
| Courses (date, format, statut, état, ouverture des inscriptions) | Table `courses` | Existe |
| Durée de prépa par défaut d'un format | Colonne de `formats` | À créer |
| Durée de prépa d'une course | Colonne de `courses` (vide : valeur du format) | À créer |
| Phases modifiées à la main | Table, une ligne par semaine modifiée (course, lundi, phase) | À créer |
| Séances : date, type (run, renfo), libellé, faite, course liée facultative | Table à créer | À créer |

Le modèle de données sera écrit au lot 2, après validation de cette spécification. Ce qui se calcule n'est jamais rangé : début du plan, phases non modifiées, semaines sans objectif, chevauchements.

## 8. Lots de construction

1. **Vue Année** : lecture seule, sans nouvelle donnée, avec une durée de prépa provisoire par format.
2. **Modèle de données** : durées, phases, séances.
3. **Vues 4 semaines et plan d'une course**, saisie des séances, rubrique « Préparer ».

Le prototype `composants/planning.js` est remplacé par la nouvelle vue Année.

## 9. Questions ouvertes

- [ ] **Durées de prépa par format** (en semaines) : Trail découverte, Trail court, Trail long, Ultra-trail, 5 km, 10 km, semi-marathon, marathon, ultra-marathon, et les autres formats. À fournir par l'utilisateur.
- [ ] **Semaine de récupération après la course** : une semaine de récupération après le jour J, comptée comme Deload ?
- [ ] **Vue Année sur « six mois »** : la vue affiche douze mois ; faut-il aussi une vue de six mois, comme dans l'idée de zoom ?
- [ ] **Couleurs** des quatre familles de course et des quatre phases : à fixer dans le document de design.
- [ ] **Semaine dans deux plans** : règle de la course la plus proche à confirmer.
- [ ] **Objectif principal** : plus marqué que les autres courses sur la vue Année ?
- [ ] **Séances** : durée, distance, D+ et ressenti facultatifs plus tard ?

## 10. Contrôles

Jeu d'essai, données fictives, au mardi 20 octobre 2026 à 10 h, heure de Paris, thème Bleu et orange. Les courses sont celles du [jeu d'essai d'Objectif](module-objectif-specification.md) (§ 10).

**Durées de prépa d'essai** (valeurs fictives pour l'essai, pas les durées retenues) : Trail court 6 semaines, 10 km 4 semaines, Trail long 10 semaines, Ultra-trail 12 semaines.

**Séances d'essai** : lundi 19 octobre, Renfo · Gainage 30 min (faite) ; mardi 20, Run · 8×400 m ; jeudi 22, Run · Footing 45 min ; samedi 24, Run · Sortie 1 h 30.

Résultats attendus, vue Année :

- Douze mois, d'octobre 2026 à septembre 2027 : premier bloc oct. à mars, second bloc avr. à sept. ; les 1 à 19 octobre sont atténués.
- Courses affichées : Semi de San Sebastián (4 oct., route, grisée, sans trait), Trail du Lac (15 nov.), Corrida de Noël (13 déc., route), Trail des Gorges (7 mars), Trail des Cimes (30 mai), Ultra du Plateau (26 juin), Trail de la Forêt (1er juillet), Trail des Crêtes (28 août). Ni Cross des Collines (abandonnée) ni Trail des Sommets (à surveiller).
- Couleurs : Corrida de Noël en route validée ; Trail du Lac, Trail des Gorges et Trail des Crêtes en trail validée ; Trail des Cimes, Ultra du Plateau et Trail de la Forêt en trail non validée.
- Traits de prépa : Trail du Lac le 5 oct., Corrida de Noël le 16 nov., Trail des Gorges le 28 déc., Trail des Cimes le 22 mars, Ultra du Plateau le 19 avr., Trail de la Forêt le 24 mai (case du 1er juillet), Trail des Crêtes le 7 juin.
- Chevauchements lisibles : Trail des Cimes, Ultra du Plateau, Trail de la Forêt et Trail des Crêtes se recouvrent de fin mai à fin juin ; Trail du Lac, Corrida de Noël et Trail des Gorges ne se recouvrent pas.
- Toucher le 22 oct. ouvre la vue 4 semaines à partir du lundi 19 octobre ; toucher Trail des Gorges ouvre son plan.
- Téléphone : trois colonnes de mois, quatre blocs ; rien ne déborde.

Résultats attendus, vue 4 semaines (du 19 octobre au 15 novembre 2026) :

- Quatre semaines : 19 oct., 26 oct., 2 nov., 9 nov.
- Phases : Développement, Deload, Affûtage, Affûtage (semaines 3 à 6 du plan du Trail du Lac, qui a commencé le 5 octobre).
- Séances d'essai à leurs jours ; seule la séance du lundi 19 est cochée « faite ».
- Rendez-vous clé : dimanche 1er novembre, ouverture des inscriptions · Corrida de Noël. Pas d'autre ouverture dans la période (celle de l'Ultra du Plateau est passée).
- Dimanche 15 novembre : jour de course, Trail du Lac.
- Fenêtre ouverte le 14 décembre 2026 : « Sans objectif clair » pour les semaines du 14 et du 21 décembre ; la semaine du 28 décembre est en Base (semaine 1 du plan du Trail des Gorges).

Résultats attendus, plan d'une course :

- Trail des Gorges : plan de 10 semaines, du lundi 28 décembre 2026 au dimanche 7 mars 2027 ; phases : Base (28 déc., 4 et 11 janv.), Deload (18 janv.), Développement (25 janv., 1er et 8 févr.), Deload (15 févr.), Affûtage (22 févr., 1er mars) ; jour J le 7 mars.
- Trail du Lac : 6 semaines, du 5 octobre au 15 novembre : Base, Développement, Développement, Deload, Affûtage, Affûtage.
- Corrida de Noël : 4 semaines, du 16 novembre au 13 décembre : Base, Développement, Affûtage, Affûtage.
- Trail des Crêtes : 12 semaines, du 7 juin au 28 août : Base ×3, Deload, Base, Développement ×2, Deload, Développement ×2, Affûtage ×2.
- « Préparer » sur Trail des Gorges, durée portée à 12 semaines : début du plan le 14 décembre ; les phases se recalculent. Mettre la semaine du 18 janvier en Base : seule cette semaine change ; « Recalculer selon les règles » (confirmé) la remet en Deload.
- Site partagé en lecture seule : le plan s'affiche, sans « Préparer » ni saisie de séance.
- Adresse d'une course inconnue, d'un autre utilisateur ou sans date : « Course introuvable. » et un lien de retour.
