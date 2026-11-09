# Préparation · spécification fonctionnelle

Version 0.6 · 9 novembre 2026 · [Retour au sommaire](README.md) · Profil : « Ma semaine » (jours possibles pour courir et pour le renforcement, cumulables, nombre de sorties et de renforcements, jour de la sortie longue) à la place de la semaine type

## 1. Rôle

La Préparation construit **un seul plan pour toute la saison**, au lieu d'un plan par course. Le plan se cale sur les objectifs, et les autres courses s'y insèrent selon leur rôle. Le travail se fait en trois couches :

| Couche | Calculée par | Contenu |
|---|---|---|
| 1. Trame | Des règles fixes (§ 4) | Les phases de chaque semaine, saison après saison |
| 2. Insertion des courses | Des règles selon le rôle (§ 3) | Mini-affûtage, récupération, alertes |
| 3. Séances | L'IA, puis l'utilisateur, qui valide (§ 6) | Les séances de chaque semaine, une explication courte, un réajustement |

- **Jamais d'IA pour les phases ni pour les règles** : elle propose seulement les séances, à l'intérieur de la trame, et les règles vérifient chaque proposition avant de l'afficher.
- **Rien n'est enregistré sans l'accord de l'utilisateur.**
- **Le Calendrier lit cette trame** : la règle « la course confirmée la plus proche impose sa phase » ([Calendrier](module-calendrier-specification.md), § 2) a disparu. Plus tard, la rubrique Préparation de la page d'une course montrera la place de la course dans la saison (pour l'instant, elle garde le plan propre à la course).
- **Hors périmètre** : l'import des séances depuis une montre ou une application ; le suivi de la charge (fatigue, forme) ; l'apparence détaillée ([design](design.md)).

## 2. Saisons

- **Une saison par Objectif** : du premier jour de sa préparation (durée de prépa de son format, [Calendrier](module-calendrier-specification.md), § 5.4) au jour de la course. Il peut y avoir plusieurs Objectifs dans l'année : les saisons se suivent.
- **Entre deux saisons** : la récupération de l'Objectif qui vient de se courir (§ 3.3), puis des semaines d'**Entretien** jusqu'au début de la saison suivante. Avant le premier Objectif, les semaines sont aussi en Entretien.
- **Deux Objectifs trop proches** : sous **12 semaines** entre deux Objectifs, le plan affiche une alerte et suggère de passer l'un des deux en Préparatoire. Le plan ne bloque rien : si l'utilisateur garde les deux, la seconde saison commence au lendemain de la première course, raccourcie d'autant (§ 4).
- **Courses en option** : elles apparaissent dans la frise, mais aucune règle ne s'applique tant qu'elles ne sont pas confirmées. À la confirmation, le plan se recalcule.

## 3. Rôles et règles de combinaison

### 3.1 Trois rôles

Les entraîneurs classent les courses en trois niveaux, appelés A, B et C, selon l'affûtage qu'elles reçoivent. Les rôles reprennent ces niveaux :

| Rôle | Niveau | Dans le plan |
|---|---|---|
| **Objectif** | A | Façonne la trame : saison, phases, affûtage complet |
| **Préparatoire** | B | Mini-affûtage, puis récupération ; compte comme la séance de qualité de sa semaine |
| **Plaisir** | C | Pas d'affûtage ; repos la veille, récupération après la course, alertes |

Le rôle Objectif intermédiaire disparaît : les courses qui l'avaient passent en Objectif (évolution de la base, § 7).

### 3.2 Valeurs retenues et sources

| Règle | Valeur | Source |
|---|---|---|
| Affûtage d'un Objectif | Les 2 dernières semaines ; volume réduit progressivement de 41 à 60 % ; intensité et fréquence des séances maintenues | [Méta-analyse de Bosquet, 2007](https://pubmed.ncbi.nlm.nih.gov/17762369/) ; [méta-analyse de 2023 sur l'endurance](https://pubmed.ncbi.nlm.nih.gov/37163550/) (21 jours au plus) |
| Mini-affûtage d'une Préparatoire | Les 3 jours qui précèdent la course, allégés | [Roadman Cycling](https://roadmancycling.com/answers/planning-a-b-c-races), [Active.com](https://www.active.com/triathlon/articles/how-triathletes-taper-for-an-a-race?page=3) (2 à 3 jours ; 3 retenus) |
| Place d'une Préparatoire | 3 à 6 semaines avant l'Objectif pour un marathon ou plus, 2 semaines au moins jusqu'au semi-marathon ; plus près, alerte (plus loin, c'est une course d'entraînement comme une autre) | [Marathon Handbook](https://marathonhandbook.com/tune-up-race/), [Laura Norris](https://lauranorrisrunning.com/tune-up-races/) |
| Plaisir | Repos la veille | Choix du module (une course C se court sans affûtage) |
| Récupération après une course | Un jour sans séance intense par mile couru (1,609 km), arrondi au jour le plus proche, pour tous les rôles | [Trainingplan.dev](https://www.trainingplan.dev/blog/posts/post-race-recovery), [Marathon Handbook](https://marathonhandbook.com/how-many-days-to-take-off-after-a-half-marathon/) |
| Distance d'un trail | En **km-effort** : distance + D+ / 100 | Proposition du module, validée le 8 novembre 2026 (aucune règle publiée trouvée) |
| Espacement de deux Objectifs | 12 semaines au moins ; une à deux grandes courses par an (un à trois ultras) | [Coach Parry](https://blog.coachparry.com/how-many-marathons-should-you-run-in-a-year-the-truth/), [CTS Trainright](https://trainright.com/how-many-ultramarathons-should-your-race/) |

Seul l'affûtage repose sur des études scientifiques ; les autres valeurs viennent de sites d'entraîneurs. Ce sont des points de départ, à ajuster à l'usage.

### 3.3 Récupération

- **Jours de récupération** = arrondi(km-effort ÷ 1,609). Exemples : un 10 km sur route (10,4 km-effort avec 40 m de D+) donne 6 jours ; un trail de 45 km et 2 100 m de D+ (66 km-effort) en donne 41.
- **Pendant la récupération** : séances faciles seulement (ni fractionné, ni allure course, ni sortie longue), quelle que soit la phase de la semaine.
- **Après un Objectif** : la récupération ouvre l'inter-saison ; ses semaines s'affichent en **Récupération**.

### 3.4 Alertes

Le plan signale ces conflits, sans rien bloquer ; chacun mène à la course concernée.

| Alerte | Condition |
|---|---|
| Objectifs trop proches | Moins de 12 semaines entre deux Objectifs ; suggestion : passer l'un en Préparatoire |
| Récupération dans un affûtage | La récupération d'une Préparatoire ou d'une Plaisir finit pendant l'affûtage d'un Objectif |
| Préparatoire trop proche | Moins de 3 semaines avant un Objectif de la distance du marathon ou plus, moins de 2 semaines avant un Objectif plus court (§ 3.2) |
| Course plus longue que l'Objectif | Une Préparatoire ou une Plaisir de plus de km-effort que l'Objectif de sa saison |

## 4. Trame

- **Phases d'une saison** : les règles du [Calendrier](module-calendrier-specification.md), § 5.1, appliquées à la saison de l'Objectif : affûtage sur les 2 dernières semaines, deload toutes les 4 semaines, le reste réparti entre base et développement. Les phases modifiées à la main restent possibles (« Paramétrer le plan », sur l'Objectif).
- **Saison raccourcie** (Objectifs trop proches) : elle garde son affûtage, puis le deload, puis le développement ; la base est réduite en premier.
- **Phases hors saison** : **Récupération** (§ 3.3) et **Entretien** ; deux phases nouvelles, à côté de Base, Développement, Affûtage et Deload. Récupération a sa couleur (fond, liseré, légende du Calendrier) ; Entretien n'en a pas : pas de fond au Calendrier, nommée seulement dans la frise et les semaines de la page. Après le dernier Objectif et sa récupération, plus de phase.
- **Insertion des courses** : un mini-affûtage, un repos la veille ou une récupération ne changent pas la phase de la semaine ; ils s'appliquent aux jours concernés, et l'IA en tient compte (§ 6).

## 5. Page Préparation

Une page à part, `preparation.html`. Son onglet se coche dans les Préférences, comme Nutrition : le menu par défaut garde cinq onglets, qui tiennent sur un téléphone.

### 5.1 Plan de page

Jeu d'essai, au 20 octobre 2026 (§ 9).

```
(1) Saison : vers « Trail des Gorges » · dim. 7 mars 2027 (dans 20 sem.)          (2) [Mon profil]
(11) Cette semaine : Entretien, jusqu'au dim. 15 nov. 2026 ; la saison commence le lun. 16 nov. 2026.
(3) frise : [Entretien|Base ▓▓▓|Del|Base ▓▓|Dév|Del|Dév ▓▓▓|Del|Dév ▓▓|Aff ▓▓|Récup ▓▓▓▓▓▓|Entretien|Base …]
              ▲Lac (prépa) ▲Corrida (plaisir)                     ▲Gorges (objectif)        ▲Crêtes (objectif)
(4) ⚠ Alertes (0)
(5) BLOC EN COURS · 4 semaines à partir du 19 oct. · Entretien      (6) [Proposer les séances] · 4 restantes ce mois-ci
(7) Sem. du 19 oct.   lun. Repos · mar. Course à pied 8×400 m · jeu. Renforcement · sam. Course à pied 1 h 30
    (8) « Semaine d'entretien avant le Trail du Lac : deux séances de qualité, une sortie longue. »
(9) Proposition : [Tout accepter] [Choisir semaine par semaine] [Refaire] [Abandonner]
(10) ▸ Blocs suivants · ▸ Historique des propositions
```

| N° | Élément | Contenu |
|---|---|---|
| 1 | Titre de saison | Le prochain Objectif, sa date, le temps restant ; sans Objectif à venir, à la place de la page : « Aucun Objectif à venir : donne le rôle Objectif à une course confirmée (page Objectif & plan) pour construire ta saison. » |
| 11 | État de la semaine | En saison : « Cette semaine : Base, semaine 3 sur 16. » ; « Récupération de … jusqu'au … » ; « Entretien, jusqu'au … ; la saison commence le … » ; « Saison raccourcie : 8 semaines sur 16. » si besoin |
| 2 | Mon profil | Bouton à contour, en haut à droite : la fenêtre du profil d'entraînement (§ 5.2) ; aussi quand aucun Objectif n'est à venir ; absent du site partagé |
| 12 | État du profil | À gauche du bouton : « Profil à compléter : … » (les champs obligatoires qui manquent) ou « Profil complet. » |
| 3 | Frise de saison | De la semaine en cours à la fin de la récupération du dernier Objectif : une colonne par semaine à la couleur de sa phase, les courses dessous, repérées par leur rôle (les options en pointillé) ; chaque course mène à sa page ; légende des signes et des six phases |
| 4 | Alertes | Le nombre, puis la liste (§ 3.4) ; chacune mène à sa course |
| 5 | Bloc en cours | 4 semaines à partir du lundi de la semaine en cours : l'unité de génération |
| 6 | Proposer les séances | Appel à l'IA (§ 6) ; le nombre de propositions restantes ce mois-ci ; absent tant que le profil manque d'un champ obligatoire, avec le lien « Compléter mon profil » |
| 7 | Semaine | Comme dans la rubrique Préparation d'une course : sa phase, ses jours, ses séances (case « faite », « + ») ; au-dessus, ses repères : « Allégé du … au … : avant … (Préparatoire). », « Repos le … : veille de … (Plaisir). », « Récupération de … jusqu'au … : séances faciles seulement. » |
| 8 | Explication | Une phrase de l'IA par semaine |
| 9 | Proposition | Affichée en attente, à part des séances enregistrées : tout accepter, accepter semaine par semaine, refaire (une proposition de plus), abandonner |
| 10 | Suite | Les blocs suivants (phases et courses, sans séances tant qu'ils ne sont pas proposés) ; l'historique des propositions (date, bloc, acceptée ou non) |

Téléphone : même ordre ; la frise défile de gauche à droite.

Lot 1 : éléments 1, 3, 4, 5, 7 et 11 ; lot 2 : le profil (2) et son état (12) ; lot 3 : la proposition de séances (6, 8, 9) ; la suite (10) au lot 4.

### 5.2 Profil d'entraînement

Une liste de questions courtes, une par ligne ; chaque ligne ouvre un écran avec une seule question. Un choix s'enregistre aussitôt et ramène à la liste : pas de bouton « Enregistrer ». Des tranches plutôt que des nombres, sauf pour le repère d'allure, qui doit rester précis.

```
(M1) [Fermer]               MON PROFIL D'ENTRAÎNEMENT
(M2) INDISPENSABLE POUR PROPOSER TES SÉANCES                      4 sur 5
     (M3) Je cours depuis                    3 à 6 ans        ›
          Distance par semaine               Aucune idée      ›
          Plus longue sortie récente         À renseigner     ›   (Accent)
          Ma semaine                         3 sorties, 1 renforcement ›
          Repère d'allure                    10 km en 45:30   ›
(M4) POUR AFFINER (FACULTATIF)
          Durée maximale d'une séance        1 h 30           ›
          Terrains d'entraînement            Vallonné         ›
          Niveau en renforcement             —                ›
          FC max et points fragiles          FC max 186       ›

(M5) [‹ Retour]             JE COURS DEPUIS
(M6) Je débute · 1 à 3 ans · 3 à 6 ans ✓ · 6 à 10 ans · Plus de 10 ans     (une ligne par choix)
(M7) Une phrase d'aide, si besoin
```

| N° | Élément | Contenu |
|---|---|---|
| M1 | Barre de la liste | « Fermer » ; le titre en libellé |
| M2 | Section indispensable | Titre ; à droite « 4 sur 5 » (Accent tant qu'elle n'est pas complète) |
| M3 | Ligne | La question ; à droite la réponse résumée, ou « À renseigner » (Accent) pour une question indispensable sans réponse, « — » pour une facultative |
| M4 | Section facultative | Toujours visible |
| M5 | Barre d'une question | « ‹ Retour » ; la question en libellé |
| M6 | Choix | Une ligne par choix ; le choix en cours en Accent, coché |
| M7 | Aide | Distance : « Sur les 4 dernières semaines. « Aucune idée » : l'IA reste prudente. » ; semaine type, durée maximale, terrains : une phrase |

| Question | Choix | Indispensable |
|---|---|---|
| Je cours depuis | Je débute · 1 à 3 ans · 3 à 6 ans · 6 à 10 ans · Plus de 10 ans | Oui |
| Distance par semaine | Aucune idée · 0 à 20 km · 20 à 40 km · 40 à 60 km · 60 à 80 km · Plus de 80 km | Oui |
| Plus longue sortie récente | Moins de 1 h · 1 h à 1 h 30 · 1 h 30 à 2 h · 2 à 3 h · Plus de 3 h | Oui |
| Ma semaine | Sur un écran, cinq questions enregistrées à chaque toucher, « ‹ Retour » à la fin : jours possibles pour courir (plusieurs) ; nombre de sorties par semaine (1 au nombre de jours choisis) ; jour à privilégier pour la sortie longue (un des jours de course, ou Peu importe) ; jours possibles pour le renforcement (plusieurs, un même jour que la course possible : le volume est adapté) ; nombre de renforcements par semaine (0 à 3). Retirer un jour ramène le nombre de sorties et la sortie longue si besoin. Complète avec au moins un jour pour courir et un nombre de sorties | Oui |
| Repère d'allure | VMA · Temps sur 10 km · Temps sur semi-marathon · Je ne sais pas ; puis la valeur (VMA de 8 à 30 km/h ; 10 km de 20:00 à 2:00:00 ; semi de 50:00 à 4:00:00), « Valider » | Oui |
| Durée maximale d'une séance | 45 min · 1 h · 1 h 30 · 2 h · Sans limite | Non |
| Terrains d'entraînement | Pas de dénivelé · Petites côtes (moins de 50 m de D+) · Vallonné (50 à 500 m) · Montagne (plus de 500 m) | Non |
| Niveau en renforcement | Débutant · Intermédiaire · Confirmé · Expert | Non |
| FC max et points fragiles | FC max (100 à 230), points fragiles (300 caractères), « Valider » | Non |

Ma semaine dit aussi ce que l'IA respecte : au plus le nombre de sorties et de renforcements prévus, chacun seulement ses jours possibles. Hors du profil : les autres sports (tant que les séances ne sont que course et renforcement) et l'accès à une piste.

La FC max et les points fragiles sont des données de santé : le lot RGPD (sommaire, à faire) doit les couvrir avant l'ouverture de l'IA à tous.

## 6. Séances proposées par l'IA

- **Unité** : un bloc de 4 semaines. Proposer la saison entière d'un coup collerait moins à ce qui est vraiment fait, et chaque appel coûterait plus.
- **Ce qui est envoyé** : la trame du bloc (phases, jours de mini-affûtage, de repos et de récupération), les courses du bloc avec leur rôle, le profil, les séances des 4 semaines passées (faites ou non). Ni nom, ni adresse, ni nom de course ; les courses sont désignées par leur format, leur distance, leur D+ et leur rôle.
- **Ce qui revient** : une liste de séances dans un format imposé (date, type, libellé, durée, distance, intensité) et une explication par semaine.
- **Garde-fous** (des règles, vérifiées par le site avant d'afficher) :
  - dates dans le bloc, type connu, libellé de 1 à 100 caractères, durée de 1 à 1 440 minutes ;
  - une course seulement un jour possible pour courir, un renforcement seulement un jour possible pour le renforcement ; pas plus de sorties ni de renforcements par semaine que prévu ; aucune séance un jour de course ni la veille d'une Plaisir (repos) ;
  - durées maximales respectées (séance, semaine) ;
  - séances faciles seulement pendant une récupération ;
  - volume des semaines d'affûtage entre 40 et 59 % de la moyenne des 3 semaines d'avant (une réduction de 41 à 60 %), quand ces 3 semaines ont des durées connues.

  Les règles non respectées sont renvoyées à l'IA, en phrases courtes, pour qu'elle corrige.

  Une proposition qui ne passe pas est refaite une fois automatiquement ; si elle échoue encore, le message « Proposition impossible à vérifier, réessaie plus tard. » s'affiche, sans rien décompter.
- **Réajustement** : quand des séances passées n'ont pas été faites, « Proposer les séances » refait le bloc à partir d'aujourd'hui, en en tenant compte.
- **Plafond** : 4 propositions par utilisateur et par mois civil (refaire compte pour une ; la reprise automatique après un garde-fou ne compte pas, dans la limite de 4 par mois). Le bouton affiche « 4 restantes ce mois-ci » et se grise à 0 ; au-delà, la fonction répond « Plus de proposition ce mois-ci : la prochaine le 1er … ».
- **Modèle** : Claude Sonnet 5.5 (effort moyen, format de réponse imposé ; repli automatique d'Anthropic si le modèle décline), réglable sans toucher au site (secret `MODELE`). Coût estimé : quelques centimes par proposition ; chaque appel range ses jetons dans la table des propositions, pour le mesurer.
- **Sécurité** : la clé de l'API ne figure jamais sur le site ni dans le dépôt. La fonction `proposer-seances` (Supabase Edge Function, `supabase/functions/proposer-seances/index.ts`) la garde en secret, vérifie l'utilisateur connecté, la liste des pilotes et le plafond, appelle l'API et range l'appel (table `propositions`, avec le jeton de l'utilisateur).
- **Réservé aux pilotes** (lot 3) : tant que la mention de l'envoi à l'IA n'est pas dans la politique de confidentialité (lot RGPD), seuls les comptes de la liste `PILOTES` (secret de la fonction) peuvent proposer ; les autres lisent « Réservé aux comptes pilotes pour l'instant. ».
- **Statuts d'une proposition** : brute (en attente), invalide (refaite par la reprise), échec (deux essais refusés, non comptée), acceptée, abandonnée. Une proposition en attente reste affichée tant qu'elle n'est ni acceptée ni abandonnée, même après avoir quitté la page.
- **Mention**, sous le bouton : « Séances proposées par une IA, à titre indicatif : ce n'est pas un avis médical. »
- **Site partagé en lecture seule** : le plan et les séances s'affichent ; ni profil, ni proposition.

## 7. Données

| Donnée | Source | État |
|---|---|---|
| Rôle d'une course : objectif, préparatoire, plaisir | `courses.role` ; les `objectif_intermediaire` passent en `objectif` | Évolution à écrire |
| Durée de prépa, phases modifiées à la main | `formats.prepa_semaines`, `courses.prepa_semaines`, `plan_semaines` | Existe (évolution 009) |
| Profil d'entraînement (§ 5.2) | Table `profil_entrainement`, une ligne par utilisateur : tranches (`anciennete`, `volume_tranche`, `sortie_tranche`), `jours_course`, `jours_renfo`, `nb_sorties`, `nb_renfo`, `jour_long` (évolution 027 ; la semaine type de l'évolution 026 n'est plus employée), repère d'allure (`allure_type`, `vma` ou temps en secondes), `seance_max_min` (1 440 : sans limite), `terrain`, `renfo_niveau`, `fc_max`, `fragiles` | Créée (évolution 024), en tranches (évolution 026, avec conversion du profil déjà saisi) |
| Séance enrichie : durée (min), distance (km), intensité (facile, modérée, intense) ; origine (saisie, IA) ; état (proposée, acceptée) | Table `seances`, nouvelles colonnes (les séances existantes : saisies, acceptées) | Créée (évolution 024) |
| Propositions : date, bloc, essai, modèle, jetons, statut, réponse | Table `propositions`, écrite par la fonction, lue par le site et la fonction (plafond) | Créée (évolution 025) |

Ce qui se calcule n'est jamais rangé : saisons, phases non modifiées, jours de récupération, alertes.

## 8. Lots de construction

1. **Trame de saison et règles de combinaison, sans IA**. **Construit** (8 novembre 2026) : calcul dans `composants/preparation.js` (`planSaison`, `phaseDe`, `reperesDuJour`), page `preparation.html` et composant `composants/plan-saison.js` ; rôles fusionnés (évolution `023-roles-objectif.sql`, à coller dans l'éditeur SQL) ; le Calendrier et Nutrition lisent la phase du plan de saison. Reste pour plus tard : la rubrique Préparation de la page d'une course dans la saison.
2. **Profil d'entraînement et séances enrichies**. **Construit** (8 novembre 2026) : évolution `024-profil-entrainement.sql` (à coller dans l'éditeur SQL), fenêtre « Mon profil » et état du profil sur la page Préparation ; durée, distance et intensité facultatives dans la fenêtre d'une séance ([Calendrier](module-calendrier-specification.md), § 4.4). Leur affichage dans les vues viendra avec les séances proposées (lot 3).
3. **Fonction côté serveur et proposition d'un bloc**. **Construit** (9 novembre 2026), réservé aux pilotes : fonction `supabase/functions/proposer-seances/index.ts` (à créer dans le tableau de bord de Supabase, avec ses secrets `ANTHROPIC_API_KEY` et `PILOTES`), évolution `025-propositions.sql`, composant `composants/seances-ia.js` (contexte, garde-fous, essais) et affichage dans `plan-saison.js`. Ouverture à tous : après la mention de l'envoi à l'IA dans la politique de confidentialité (lot RGPD).
4. **Réajustement et historique des propositions.**

## 9. Questions ouvertes

- [x] **Rôles** : trois rôles, Objectif, Préparatoire et Plaisir ; l'intermédiaire passe en Objectif ; Plaisir compte pour la récupération et les alertes (retenu le 8 novembre 2026).
- [x] **Plusieurs Objectifs** : une saison par Objectif ; alerte sous 12 semaines d'écart (retenu le 8 novembre 2026).
- [x] **Valeurs des règles** : sources publiées (§ 3.2) ; km-effort pour le trail (retenu le 8 novembre 2026).
- [x] **Profil** : champs du § 5.2 (retenu le 8 novembre 2026).
- [x] **Plafond** : 4 propositions par mois (retenu le 8 novembre 2026).
- [x] **Phases Récupération et Entretien** : Récupération en rose, Entretien sans fond (retenu le 8 novembre 2026, [design](design.md), § 10).
- [x] **Place dans le menu** : à cocher dans les Préférences, comme Nutrition (retenu le 8 novembre 2026).
- [ ] **Progression du volume** d'une semaine à l'autre : pas de garde-fou chiffré tant qu'aucune source solide n'est trouvée (la règle des 10 % courante n'est pas établie).
- [ ] **Saison raccourcie** : faut-il une durée minimale sous laquelle la seconde saison n'a pas de base du tout ?

## 10. Contrôles

Jeu d'essai, données fictives, au mardi 20 octobre 2026, thème Bleu et orange : les courses du [jeu d'essai d'Objectif](module-objectif-specification.md) (§ 10), avec ces rôles et ces formats.

| Course | Date | Format, distance, D+ | Rôle | Statut |
|---|---|---|---|---|
| Trail du Lac | dim. 15 nov. 2026 | Trail court, 24 km, 650 m | Préparatoire | Confirmée |
| Corrida de Noël | dim. 13 déc. 2026 | 10 km route, 10 km, 40 m | Plaisir | Confirmée |
| Trail des Gorges | dim. 7 mars 2027 | Trail long, 45 km, 2 100 m | Objectif (ex-intermédiaire) | Confirmée |
| Trail des Cimes | dim. 30 mai 2027 | Trail long, 42 km, 2 500 m | Préparatoire | Option |
| Ultra du Plateau | sam. 26 juin 2027 | Trail long, 55 km, 2 800 m | Préparatoire | Option |
| Trail des Crêtes | sam. 28 août 2027 | Ultra-trail, 60 km, 3 500 m | Objectif | Confirmée |

Résultats attendus, trame :

- Deux saisons : vers le Trail des Gorges (16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027 ; phases du [Calendrier](module-calendrier-specification.md), § 10, plan du Trail des Gorges), puis vers le Trail des Crêtes (16 semaines, du lun. 10 mai au sam. 28 août 2027 ; affûtage les semaines du 16 et du 23 août).
- Avant la première saison : Entretien (semaines du 19 octobre au 9 novembre). Après le Trail des Gorges : Récupération jusqu'au sam. 17 avril 2027 (66 km-effort, 41 jours), puis Entretien jusqu'au dim. 9 mai.
- Trail du Lac (Préparatoire) : jours allégés du jeu. 12 au sam. 14 novembre ; récupération de 19 jours (30,5 km-effort), jusqu'au ven. 4 décembre.
- Corrida de Noël (Plaisir) : repos le sam. 12 décembre ; récupération de 6 jours, jusqu'au sam. 19 décembre ; la phase de ses semaines ne change pas.
- 25 semaines entre les deux Objectifs : pas d'alerte. Options (Cimes, Plateau) en pointillé, sans règle.
- Ultra du Plateau confirmé : 83 km-effort, récupération de 52 jours, jusqu'au mar. 17 août 2027 ; alerte « Récupération dans un affûtage » (affûtage du Trail des Crêtes dès le lun. 16 août) ; pas d'alerte « Préparatoire trop proche » (9 semaines avant).
- Trail des Cimes confirmé et avancé au sam. 14 août 2027 : alertes « Préparatoire trop proche » (14 jours avant un ultra-trail) et « Récupération dans un affûtage ».
- Trail des Crêtes avancé au dim. 2 mai 2027 : alerte « Objectifs trop proches » (8 semaines) avec la suggestion de passer l'un en Préparatoire ; la seconde saison commence le lun. 8 mars, raccourcie.
- Calendrier : le mardi 20 octobre sans fond (Entretien) ; le lun. 30 novembre en Base (saison du Trail des Gorges), plus en affûtage de la Corrida de Noël.

Résultats attendus, page et profil :

- Titre « Saison : vers « Trail des Gorges » · dim. 7 mars 2027 (dans 20 sem.) » ; état : Entretien jusqu'au 15 novembre, saison à partir du 16 ; frise de la semaine du 19 octobre 2026 à celle du 25 octobre 2027 (fin de la récupération du Trail des Crêtes, 59 jours) ; courses de la frise : Trail du Lac (Préparatoire), Corrida de Noël (Plaisir), Trail des Gorges (Objectif), Trail des Cimes, Ultra du Plateau et Trail de la Forêt (options), Trail des Crêtes (Objectif) ; « Alertes (0) ».
- Bloc en cours : les semaines du 19 et du 26 octobre, du 2 et du 9 novembre, en Entretien ; au-dessus de la semaine du 9 novembre, le seul repère « Allégé du jeu. 12 nov. 2026 au sam. 14 nov. 2026 : avant Trail du Lac (Préparatoire). » ; un « + » par jour.
- Au 30 novembre : « Cette semaine : Base, semaine 3 sur 16. » ; repères « Récupération de Trail du Lac jusqu'au ven. 4 déc. 2026 » et « Repos le sam. 12 déc. 2026 : veille de Corrida de Noël (Plaisir). ».
- Calendrier, mars 2027 : affûtage le 2 mars, Récupération le 9, d'une autre couleur.
- Sans Objectif à venir : le message, pas de frise. Site partagé en lecture seule : la saison s'affiche, sans « + ».
Résultats attendus, profil :

- Profil vide : « Profil à compléter : je cours depuis, distance par semaine, plus longue sortie récente, ma semaine, repère d'allure. » ; la liste : « Indispensable pour proposer tes séances » (« 0 sur 5 », cinq « À renseigner ») et « Pour affiner (facultatif) », 9 lignes ; ni astérisque ni phrase sur le site partagé.
- « Je cours depuis » : cinq tranches ; « 3 à 6 ans » s'enregistre aussitôt, retour à la liste, « 1 sur 5 ».
- Ma semaine : jours pour courir mardi, jeudi, samedi, dimanche : 1 à 4 sorties proposées ; 4 sorties, sortie longue le dimanche, puis le dimanche retiré : 3 sorties, sortie longue « peu importe » ; sortie longue le samedi, renforcement mardi et jeudi, 1 par semaine : enregistrés à chaque toucher.
- Repère d'allure : VMA à 35 refusée (« La VMA doit être comprise entre 8 et 30 km/h. ») ; 10 km en 45:30 : 2 730 secondes. Puis « 5 sur 5 », résumés « 10 km en 45:30 », « 3 sorties, 1 renforcement », « Aucune idée ».
- Facultatif : 1 h 30, Vallonné ; FC max à 250 refusée, 186 acceptée. Sur la page : « Profil complet. ».
- Séance : distance à 0 refusée ; 45 min, 8,5 km, Facile enregistrés.
- Site partagé : ni bouton ni état du profil. Téléphone : liste et semaine type sans débordement.

Résultats attendus, IA (le banc d'essai remplace l'appel par une réponse fixe, sans coût ; profil : course le mardi et le samedi (2 sorties, la longue le samedi), renforcement le jeudi (1) ; séance de 2 h au plus) :

- Au départ : « Proposer les séances », « 4 restantes ce mois-ci » et la mention.
- Proposition du bloc du 19 octobre : en attente, à part des séances enregistrées : 4 semaines, 12 séances (« mar. 20 · Course à pied Footing · 45 min · 8 km · Facile »), une explication par semaine ; boutons Tout accepter, Choisir semaine par semaine, Refaire, Abandonner.
- Ce qui est envoyé : le bloc du 19 octobre au 15 novembre, en Entretien, les jours disponibles (mardi, jeudi, samedi), le repère « allégé » du jeudi 12 novembre ; ni nom de course, ni prénom.
- « Tout accepter » : 12 séances écrites (origine IA, état acceptée ; distance vide pour le renforcement), proposition acceptée, « 3 restantes ce mois-ci ».
- Garde-fou : une course le mercredi 21 (jour non prévu pour courir) : la demande est refaite (essai 2, avec « mer. 21 oct. … : jour non prévu pour courir »), la première marquée invalide. « Choisir semaine par semaine » sans la semaine du 26 octobre : 9 séances écrites.
- Deux réponses fautives de suite : « Proposition impossible à vérifier, réessaie plus tard. », les deux appels en échec, toujours 4 restantes, rien d'écrit.
- « Abandonner » (confirmé) : rien d'écrit, la proposition compte (3 restantes).
- 4 propositions déjà faites ce mois-ci : bouton grisé, « 0 restante ce mois-ci ». Refus de la fonction : « Plus de proposition ce mois-ci : la prochaine le dim. 1er nov. 2026. » ; compte non pilote : « Réservé aux comptes pilotes pour l'instant. ».
- Profil incomplet : pas de bouton, « Compléter mon profil ».
- Garde-fous au 17 novembre : fractionné le 19 novembre (récupération du Trail du Lac) refusé, le 8 décembre accepté ; une séance le 12 décembre (veille de la Corrida de Noël) refusée.
- Site partagé en lecture seule : trame et séances visibles ; ni profil, ni proposition.
- Téléphone : rien ne déborde, la frise défile.
