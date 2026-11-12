# Préparation · spécification fonctionnelle

Version 1.3 · 12 novembre 2026 · [Retour au sommaire](README.md) · **Un seul plan** : la page s'appelle « Mon plan » ; plus de plan par course ni de bloc « Plans des courses » ; les phases se règlent sur l'Objectif de la saison (rond « Régler les phases ») ; « Courses du plan » avec l'avis de chaque course (Conseillée, Possible, Déconseillée, sources) et « Passer en Plaisir » ; préparatoire conseillée avant l'Objectif visé (§ 3.5) ; la page d'une course et sa fiche montrent sa place dans la saison (§ 5.4) · Avant (1.2) : Titre sur deux lignes ; frise en segments avec dates, noms et dates des courses, liste verticale sur téléphone · Page allégée : plus d'état de la semaine (11) ni de titre de bloc (5) ; alertes en une ligne dans le bloc « Recommandation de MyRunTools » ; frise à deux niveaux, plus large, avec plein écran ; une nouvelle acceptation remplace les séances de l'IA non faites · « Ma semaine » en deux cadres, Course et Renforcement · Feuille du profil de taille fixe sur ordinateur, contenu qui glisse d'un écran à l'autre (§ 5.3) · Profil dans la feuille d'une course (règle de design, § 5.3) ; nombres de sorties et de renforcements saisis de 0 à 7 ; bloc affiché dans la grille du Mois du Calendrier ; une seule recommandation de l'IA pour le bloc ; plus de phrases d'aide ni de mention

## 1. Rôle

La Préparation construit **un seul plan pour toute la saison**, au lieu d'un plan par course. Le plan se cale sur les objectifs, et les autres courses s'y insèrent selon leur rôle. Le travail se fait en trois couches :

| Couche | Calculée par | Contenu |
|---|---|---|
| 1. Trame | Des règles fixes (§ 4) | Les phases de chaque semaine, saison après saison |
| 2. Insertion des courses | Des règles selon le rôle (§ 3) | Mini-affûtage, récupération, alertes |
| 3. Séances | L'IA, puis l'utilisateur, qui valide (§ 6) | Les séances du bloc, une recommandation, un réajustement |

- **Jamais d'IA pour les phases ni pour les règles** : elle propose seulement les séances, à l'intérieur de la trame, et les règles vérifient chaque proposition avant de l'afficher.
- **Rien n'est enregistré sans l'accord de l'utilisateur.**
- **Le Calendrier lit cette trame** : la règle « la course confirmée la plus proche impose sa phase » ([Calendrier](module-calendrier-specification.md), § 2) a disparu.
- **Un seul plan, une seule page** (12 novembre 2026) : la page **Mon plan** (`preparation.html`) est le seul endroit où le plan se lit en entier et se règle. Une course n'a plus de plan à elle : la rubrique Préparation de sa page et sa fiche montrent sa **place dans la saison** (§ 5.4). Les phases réglées à la main ne valent que pour un Objectif, dont elles règlent la saison.
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

### 3.5 Avis sur une course et préparatoire conseillée

Chaque course à venir qui n'est pas un Objectif reçoit un **avis**, par rapport à l'Objectif de sa saison (ou au suivant). Une option est jugée comme si elle était confirmée : c'est ce qui aide à décider.

| Avis | Condition | Raison affichée |
|---|---|---|
| **Conseillée** | Préparatoire, dans la fenêtre conseillée (tableau ci-dessous), sans alerte | « 5 semaines avant Gorges : dans la fenêtre conseillée (4 à 6 semaines) » |
| **Possible** | Plaisir sans alerte, ou Préparatoire hors fenêtre sans alerte | « Sans affûtage ; récupération finie avant l'affûtage de Gorges » ; « 16 semaines avant Gorges (conseillé : 4 à 6 semaines) » |
| **Déconseillée** | Une alerte du § 3.4 la touche | Le texte de l'alerte |

- Chaque avis cite ses **sources** (liens), celles du § 3.2 ou du tableau ci-dessous.
- **Passer en Plaisir** : proposé pour une Préparatoire Déconseillée **seulement si le rôle Plaisir fait tomber ses alertes** (une Préparatoire trop proche) ; une récupération dans un affûtage reste la même en Plaisir : pas de bouton.
- Une course sans Objectif après elle n'a pas d'avis.

**Préparatoire conseillée** : environ la moitié de l'Objectif, quelques semaines avant (usages d'entraîneurs, pas des études ; sources lues dans des extraits de recherche, à vérifier sur les pages entières) :

| Objectif | Préparatoire conseillée | Fenêtre | Sources |
|---|---|---|---|
| Route, du semi au marathon exclu (21 à 42 km) | Un 10 km ou un 15 km | 3 à 6 semaines avant | [Laura Norris](https://lauranorrisrunning.com/tune-up-races/), [RunnersConnect](https://runnersconnect.net/?p=25480) |
| Route, marathon et plus (42 km ou plus) | Un semi-marathon | 4 à 6 semaines avant | [Marathon Handbook](https://marathonhandbook.com/tune-up-race/), [RunnersConnect](https://runnersconnect.net/?p=25480) |
| Trail de 42 à 59 km | Un trail de 21 à 42 km, sur un terrain proche | 4 à 6 semaines avant | [iRunFar](https://irunfar.com/how-to-choose-a-tune-up-race), [Laura Norris](https://lauranorrisrunning.com/tune-up-races/) |
| Trail de 60 à 129 km | Un trail d'environ 50 km, sur un terrain proche | 4 à 6 semaines avant | [iRunFar](https://irunfar.com/how-to-choose-a-tune-up-race), [UltraRunning](https://www.ultrarunning.com/featured/races-as-training-runs/) |
| Trail de 130 km ou plus | Un trail de 80 à 100 km, sur un terrain proche | 5 à 12 semaines avant | [iRunFar](https://www.irunfar.com/your-ultra-training-bag-of-tricks-using-races-to-prepare-for-your-goal-event) |
| Plus court (route sous 21 km, trail sous 42 km) | Aucune source trouvée : pas de conseil | | |

La distance est celle de la course (les sources parlent en kilomètres réels, pas en km-effort). Sur la page Mon plan, la préparatoire conseillée de l'Objectif visé s'affiche tant que sa fenêtre n'est pas passée et qu'aucune Préparatoire Conseillée n'y est déjà ; elle reprend les courses **Repérées** qui tombent dans la fenêtre, à confirmer d'un toucher. MyRunTools n'invente jamais une course : il propose un type de course et une fenêtre.

## 4. Trame

- **Phases d'une saison** : les règles du [Calendrier](module-calendrier-specification.md), § 5.1, appliquées à la saison de l'Objectif : affûtage sur les 2 dernières semaines, deload toutes les 4 semaines, le reste réparti entre base et développement. Les phases modifiées à la main restent possibles (« Paramétrer le plan », sur l'Objectif).
- **Saison raccourcie** (Objectifs trop proches) : elle garde son affûtage, puis le deload, puis le développement ; la base est réduite en premier.
- **Phases hors saison** : **Récupération** (§ 3.3) et **Entretien** ; deux phases nouvelles, à côté de Base, Développement, Affûtage et Deload. Récupération a sa couleur (fond, liseré, légende du Calendrier) ; Entretien n'en a pas : pas de fond au Calendrier, nommée seulement dans la frise et les semaines de la page. Après le dernier Objectif et sa récupération, plus de phase.
- **Insertion des courses** : un mini-affûtage, un repos la veille ou une récupération ne changent pas la phase de la semaine ; ils s'appliquent aux jours concernés, et l'IA en tient compte (§ 6).

## 5. Page Mon plan

Une page à part, `preparation.html`, titrée et nommée au menu **Mon plan** (clé des préférences : « Préparation »). Son onglet se coche dans les Préférences, comme Nutrition : le menu par défaut garde cinq onglets, qui tiennent sur un téléphone. Tant qu'elle n'est pas au menu, la page En un coup d'œil la propose dans le bloc « Pour aller plus loin » (bouton « Ajouter au menu », [spécification générale](specification-generale.md), § 6).

### 5.1 Plan de page

Jeu d'essai, au 20 octobre 2026 (§ 9).

```
(12) Profil à compléter…  (2) [Mon profil de coureur]
(1) Trail des Gorges
    dim. 7 mars 2027 · dans 20 sem.
(3) [En cours] [Tout]                                                                                    (17) [⚙] (13) [⤢]
    19 oct.   2 nov.   16 nov.   30 nov.   14 déc.   28 déc.   …   22 févr.
    [Entretien   ][Base      ][▒][Base    ][▒][▒][Développement][▒][Dév.][Aff.]
          ▲ Lac · 15 nov.                                        Gorges · 7 mars ▲
                         ▲ Corrida · 13 déc.
    légende : seulement les rôles et les phases présents
    (téléphone : une ligne par phase « Base · 16 nov. → 6 déc. · 3 sem. », la course dessous)
(9) ┌ RECOMMANDATION DE MYRUNTOOLS ───────────────────────────────────────────┐
    │ (4) ⚠ Gorges et Crêtes : 8 semaines d'écart (12 conseillées)            │  seulement s'il y en a
    │ (8) Entretien sur trois semaines : deux footings, une séance de seuil…   │  seulement avec une proposition
    │ [Tout accepter] [Choisir semaine par semaine] [Refaire] [Abandonner]     │
    └──────────────────────────────────────────────────────────────────────────┘
(6) [Proposer les séances] · 4 restantes ce mois-ci
(7)  LUN    MAR             MER   JEU          VEN   SAM              DIM
     19     20              21    22           23    24               25
            ┆Footing · 45 min┆    ┆Seuil…┆          ┆Sortie longue┆    +
     …  (4 semaines ; jeu. 12 à sam. 14 nov. : « Allégé »)
(15) COURSES DU PLAN
     Trail du Lac        dim. 15 nov. 2026 · Préparatoire
       ⚠ Possible  16 semaines avant Trail des Gorges (conseillé : 4 à 6 semaines)  Sources : iRunFar, Laura Norris
     Corrida de Noël     dim. 13 déc. 2026 · Plaisir
       ⚠ Possible  Sans affûtage ; récupération finie avant l'affûtage de Trail des Gorges  Sources : …
     Trail des Gorges    dim. 7 mars 2027 · Objectif                                   [⚙]
     Ultra du Plateau    sam. 26 juin 2027 · Préparatoire (option)
       ⛔ Déconseillée  Ultra du Plateau : récupération jusqu'au mar. 17 août 2027, sur l'affûtage de Trail des Crêtes
     …                   (« Passer en Plaisir » sous une Déconseillée que le rôle Plaisir tirerait d'affaire)
(16) ┆ Préparatoire conseillée avant Trail des Gorges : un trail de 21 à 42 km, sur un terrain proche, ┆
     ┆ du dim. 24 janv. 2027 au dim. 7 févr. 2027.                                                    ┆
     ┆ Dans tes courses repérées : …                                              [Confirmer]          ┆
     ┆ Sources : iRunFar, Laura Norris                                     [+ Ajouter une course]      ┆
(10) ▸ Blocs suivants · ▸ Historique des propositions
```

| N° | Élément | Contenu |
|---|---|---|
| 1 | Titre de saison | Sur deux lignes : le **nom** de la course visée (lien vers sa page), puis, petit et discret, sa date (l'année seulement si ce n'est pas l'année en cours) et le temps restant : « dim. 7 mars 2027 · dans 20 sem. » ; sans Objectif à venir, à la place de la page : « Aucun Objectif à venir : donne le rôle Objectif à une course confirmée (page Saison) pour construire ta saison. » |
| 11 | *(supprimé)* | L'état de la semaine (phase, semaine n sur N) n'est plus affiché : la frise et le fond des cases le disent. |
| 2 | Mon profil | Bouton à contour, en haut à droite : la feuille Mon profil ([Mon profil](module-profil-specification.md), § 2 ; depuis le 12 nov. 2026 : mesures, niveau, semaine, santé) ; aussi quand aucun Objectif n'est à venir ; absent du site partagé |
| 12 | État du profil | À gauche du bouton : « Profil à compléter : … » (les champs obligatoires qui manquent) ou « Profil complet. » |
| 13 | Plein écran | Sur ordinateur seulement : un rond « agrandir » à droite des pastilles de la frise ; la frise prend tout l'écran (4,5 rem de haut), Échap ou le même rond pour sortir ; le Calendrier a le même rond dans sa barre du haut (§ Calendrier) |
| 3 | Frise de saison | Deux niveaux, au choix par deux pastilles : **En cours** (par défaut ; de la semaine en cours à celle de l'Objectif visé) et **Tout** (jusqu'à la fin de la récupération du dernier Objectif). **Ordinateur** : trois rangées sur une grille d'une colonne par semaine (1,6 rem au moins) : les **dates** (le lundi, une semaine sur deux ou quatre si ça serre), les **phases** en un segment par suite de semaines de même phase (3 rem de haut, coins arrondis, nom écrit dedans ; deux semaines : nom abrégé si besoin ; une semaine : sans nom), les **courses** (▲ puis le nom et la date écrits dessous, repérées par leur rôle, options en pointillé ; celles des dernières semaines s'écrivent vers la gauche) ; légende limitée à ce que la frise montre. **Téléphone** : une liste verticale, une ligne par phase (couleur, nom, dates « 9 → 22 nov », durée), les courses sous leur phase. Chaque course mène à sa page |
| 4 | Alertes | **Dans le bloc de la recommandation (9), seulement s'il y en a** (ni compteur, ni titre à part) : une ligne chacune, le nom des courses en gras, chacune menant à sa course (§ 3.4) : « Gorges et Crêtes : 8 semaines d'écart (12 conseillées) » ; « Lac : récupération jusqu'au ven. 4 déc. 2026, sur l'affûtage de Gorges » ; « Cimes : à 14 jours de Crêtes (3 semaines conseillées) » ; « Plateau est plus longue que Gorges » |
| 5 | *(supprimé)* | Le titre « Bloc en cours » n'est plus affiché ; le bloc reste de 4 semaines à partir du lundi de la semaine en cours (l'unité de génération). |
| 6 | Proposer les séances | Appel à l'IA (§ 6) ; le nombre de propositions restantes ce mois-ci ; absent tant que le profil manque d'un champ obligatoire, avec le lien « Compléter mon profil » |
| 7 | Grille du bloc | La mise en page du Mois du Calendrier (vue Mois, mêmes cases, fond de la phase, courses, séances, « + ») sur les 4 semaines du bloc ; dans la case d'un jour, son repère en petit (« Allégé », « Repos », « Récupération ») et les séances proposées en attente (contour Accent en pointillé, détail au survol) |
| 8 | Recommandation | Un seul bloc de texte de l'IA pour l'ensemble du bloc, trois phrases au plus ; aucun commentaire par semaine |
| 9 | Recommandation de MyRunTools | Le cadre, titré « Recommandation de MyRunTools » (aucun état dans le titre), porte les alertes (4) puis le texte (8), en attente, à part des séances enregistrées : tout accepter, choisir semaine par semaine (les semaines en pastilles), refaire (une proposition de plus), abandonner ; sur téléphone, la liste des séances proposées s'y ajoute (la grille n'y montre que des points) |
| 14 | *(supprimé le 12 nov. 2026)* | « Plans des courses » : une course n'a plus de plan à elle (§ 1) ; remplacé par 15 et 17. |
| 15 | Courses du plan | Sous la grille du bloc, titre en libellé : une ligne par course à venir (confirmée ou option) qui a une date, dans l'ordre des dates : nom (lien vers sa page, 1 rem, 600), date et rôle (0,8 rem, Texte discret ; « (option) ») ; dessous, l'avis (§ 3.5) : picto commun et niveau (Accent, Texte discret ou Alerte, 0,8 rem, 600), raison (0,8 rem, Texte), « Sources : … » (0,75 rem, Texte discret, liens) ; un Objectif : pas d'avis, le rond « Régler les phases » (17) ; une Déconseillée que le rôle Plaisir tirerait d'affaire : « Passer en Plaisir » (`mrt-btn`, confirmation du site). Ancre `#courses` (le lien de la page d'une course). Aussi affiché quand aucun Objectif n'est à venir ; sur le site partagé, sans bouton |
| 16 | Préparatoire conseillée | Sous 15, pour l'Objectif visé (1), selon le § 3.5 : cadre en pointillé Accent (comme une séance proposée) ; « **Préparatoire conseillée** avant Gorges : un trail de 21 à 42 km, sur un terrain proche, du … au … » ; les courses Repérées de la fenêtre avec « Confirmer » (Confirmée, Préparatoire) ; les sources ; « + Ajouter une course » (le bouton de la page Saison, « + Course » sur téléphone ; la fiche du site, Confirmée et Préparatoire). Absent sur le site partagé |
| 17 | Régler les phases | Rond commun (`mrt-rond`, icône de curseurs) à gauche du plein écran (13), et sur chaque Objectif de 15 : la fenêtre « Paramétrer le plan » de l'Objectif (durée de sa saison, phases semaine par semaine, § 5.3) ; absent du site partagé |
| 10 | Suite | Les blocs suivants (phases et courses, sans séances tant qu'ils ne sont pas proposés) ; l'historique des propositions (date, bloc, acceptée ou non) |

Téléphone : même ordre ; la frise défile de gauche à droite ; la grille est celle du Mois sur téléphone.

Lot 1 : éléments 1, 3, 4, 7 (puis 5 et 11, supprimés) ; lot 2 : le profil (2) et son état (12) ; lot 3 : la proposition de séances (6, 8, 9) ; un seul plan (14 supprimé, 15, 16, 17) le 12 novembre 2026 ; la suite (10) au lot 5.

### 5.2 Profil d'entraînement

Depuis le 12 novembre 2026, ces questions font partie de [Mon profil](module-profil-specification.md) (sections Mon niveau, Ma semaine, Santé) : le bouton « Mon profil » ouvre la feuille commune, avec aussi les mesures. Ce qui suit reste la règle de chaque question.

Dans la feuille d'une course (§ 5.3). Une liste de questions courtes, une par ligne ; chaque ligne ouvre un écran avec une seule question. Un choix s'enregistre aussitôt et ramène à la liste : pas de bouton « Enregistrer ». Des tranches plutôt que des nombres, sauf pour le repère d'allure, qui doit rester précis. Aucune phrase d'aide.

```
(M1) MON PROFIL D'ENTRAÎNEMENT                                       (×)
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

(M5) (‹)                                                             (×)
     JE COURS DEPUIS
(M6) Je débute · 1 à 3 ans · 3 à 6 ans ✓ · 6 à 10 ans · Plus de 10 ans     (une ligne par choix)
```

| N° | Élément | Contenu |
|---|---|---|
| M1 | Barre de la liste | Le titre en libellé de la feuille ; la croix ronde en haut à droite |
| M2 | Section indispensable | Titre ; à droite « 4 sur 5 » (Accent tant qu'elle n'est pas complète) |
| M3 | Ligne | La question ; à droite la réponse résumée, ou « À renseigner » (Accent) pour une question indispensable sans réponse, « — » pour une facultative |
| M4 | Section facultative | Toujours visible |
| M5 | Barre d'une question | Le rond « ‹ » (retour à la liste) à gauche, la croix à droite ; la question en libellé |
| M6 | Choix | Une ligne par choix ; le choix en cours en Accent, coché |

| Question | Choix | Indispensable |
|---|---|---|
| Je cours depuis | Je débute · 1 à 3 ans · 3 à 6 ans · 6 à 10 ans · Plus de 10 ans | Oui |
| Distance par semaine | Aucune idée · 0 à 20 km · 20 à 40 km · 40 à 60 km · 60 à 80 km · Plus de 80 km | Oui |
| Plus longue sortie récente | Moins de 1 h · 1 h à 1 h 30 · 1 h 30 à 2 h · 2 à 3 h · Plus de 3 h | Oui |
| Ma semaine | Sur un écran, cinq questions enregistrées à chaque toucher, « ‹ Retour » à la fin : jours possibles pour courir (plusieurs) ; nombre de sorties par semaine (champ texte, un chiffre de 0 à 7, sinon « Un chiffre de 0 à 7. ») ; jour à privilégier pour la sortie longue (un des jours de course, ou Peu importe) ; jours possibles pour le renforcement (plusieurs, un même jour que la course possible : le volume est adapté) ; nombre de renforcements par semaine (même champ, 0 à 7). Retirer un jour ramène la sortie longue à « Peu importe » si besoin. Complète avec au moins un jour pour courir et un nombre de sorties | Oui |
| Repère d'allure | VMA · Temps sur 10 km · Temps sur semi-marathon · Je ne sais pas ; puis la valeur (VMA de 8 à 30 km/h ; 10 km de 20:00 à 2:00:00 ; semi de 50:00 à 4:00:00), « Valider » | Oui |
| Durée maximale d'une séance | 45 min · 1 h · 1 h 30 · 2 h · Sans limite | Non |
| Terrains d'entraînement | Pas de dénivelé · Petites côtes (moins de 50 m de D+) · Vallonné (50 à 500 m) · Montagne (plus de 500 m) | Non |
| Niveau en renforcement | Débutant · Intermédiaire · Confirmé · Expert | Non |
| FC max et points fragiles | FC max (100 à 230), points fragiles (300 caractères), « Valider » | Non |

Plan de « Ma semaine » : deux sections à titre commun, chacune dans un cadre (fond des lignes du profil, coins de 8 px, filet entre deux questions, 0,9 rem de marge intérieure) ; **Course** : jours possibles (pastilles), sorties par semaine (libellé à gauche, champ étroit à droite), sortie longue (pastilles des jours possibles et « Peu importe ») ; **Renforcement** : jours possibles (pastilles), séances par semaine (même ligne que les sorties) ; en haut, comme les autres fenêtres de saisie, « Annuler » à gauche (abandonne les changements) et « Enregistrer » à droite (range tout et revient à la liste).

Ma semaine dit aussi ce que l'IA respecte : au plus le nombre de sorties et de renforcements prévus, chacun seulement ses jours possibles. Hors du profil : les autres sports (tant que les séances ne sont que course et renforcement) et l'accès à une piste.

La FC max et les points fragiles sont des données de santé : le lot RGPD (sommaire, à faire) doit les couvrir avant l'ouverture de l'IA à tous.

### 5.3 Fenêtres et feuilles : celles du site

Toute fenêtre ou feuille du module (profil, et les suivantes) reprend la feuille d'une course ([design](design.md), § Fenêtres) ; elle n'invente aucun style :

- largeur de la page, plein écran sur téléphone, même voile ;
- en haut à droite, la croix ronde (`mrt-rond is-fermer`) ; jamais de bouton texte « Fermer » ; un retour éventuel en rond « ‹ » à gauche ;
- titre en libellé de la feuille, sections et titres de section communs, champs, pastilles et boutons communs, tailles de l'échelle du site ;
- Échap ou un clic sur le voile ferme ;
- sur ordinateur, la feuille à plusieurs écrans (le profil) garde la même taille d'un écran à l'autre (40 rem de haut au plus) ; le contenu glisse en 0,2 s, par la droite quand une question s'ouvre, par la gauche au retour ; pas de glissement sur téléphone ni si l'appareil demande moins de mouvement.

### 5.4 Une course dans la saison (page d'une course, fiche)

La rubrique Préparation de la page d'une course ([Objectif](module-objectif-specification.md), § 3.4, C24) et le bloc Préparation de sa fiche (F39 à F42) montrent sa **place dans la saison**, en lecture, au lieu d'un plan propre à la course :

- **Objectif** : « Objectif · saison de 16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027 » (« (raccourcie) » si elle l'est), puis la frise des phases de sa saison ; sans durée de format : « Objectif · pas encore de plan : ce format n'a pas de durée de préparation par défaut. » (une durée se choisit dans Mon plan, rond 17).
- **Préparatoire, Plaisir** : une ligne, « Préparatoire · semaine 9 sur 16 de la saison de Gorges · 3 jours allégés avant, 19 jours de récupération » (hors saison : « en Entretien, avant la saison de … » ou « en Récupération après … » ; Plaisir : « repos la veille ») ; puis l'avis (§ 3.5) ; une option : « (option) », jugée comme si elle était confirmée.
- Puis le lien d'action **« Voir dans Mon plan → »** (`preparation.html#courses`), absent en lecture seule ; la mention de la date approximative reste. Plus de semaines ni de séances dans la rubrique : elles sont dans Mon plan et le Calendrier.
- Dans la fiche, la place se recalcule à chaque changement de date, de format, de distance, de D+, de statut ou de rôle ; dessous : « Les phases se règlent dans Mon plan, une fois la course enregistrée. ».

## 6. Séances proposées par l'IA

- **Unité** : un bloc de 4 semaines. Proposer la saison entière d'un coup collerait moins à ce qui est vraiment fait, et chaque appel coûterait plus.
- **Ce qui est envoyé** : la trame du bloc (phases, jours de mini-affûtage, de repos et de récupération), les courses du bloc avec leur rôle, le profil, les séances des 4 semaines passées (faites ou non). Ni nom, ni adresse, ni nom de course ; les courses sont désignées par leur format, leur distance, leur D+ et leur rôle.
- **Ce qui revient** : dans un format imposé, une recommandation pour le bloc (trois phrases au plus) et la liste des séances (date, type, libellé, durée, distance, intensité).
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

1. **Trame de saison et règles de combinaison, sans IA**. **Construit** (8 novembre 2026) : calcul dans `composants/preparation.js` (`planSaison`, `phaseDe`, `reperesDuJour`), page `preparation.html` et composant `composants/plan-saison.js` ; rôles fusionnés (évolution `023-roles-objectif.sql`, à coller dans l'éditeur SQL) ; le Calendrier et Nutrition lisent la phase du plan de préparation. Reste pour plus tard : la rubrique Préparation de la page d'une course dans la saison.
2. **Profil d'entraînement et séances enrichies**. **Construit** (8 novembre 2026) : évolution `024-profil-entrainement.sql` (à coller dans l'éditeur SQL), fenêtre « Mon profil » et état du profil sur la page Préparation ; durée, distance et intensité facultatives dans la fenêtre d'une séance ([Calendrier](module-calendrier-specification.md), § 4.4). Leur affichage dans les vues viendra avec les séances proposées (lot 3).
3. **Fonction côté serveur et proposition d'un bloc**. **Construit** (9 novembre 2026), réservé aux pilotes : fonction `supabase/functions/proposer-seances/index.ts` (à créer dans le tableau de bord de Supabase, avec ses secrets `ANTHROPIC_API_KEY` et `PILOTES`), évolution `025-propositions.sql`, composant `composants/seances-ia.js` (contexte, garde-fous, essais) et affichage dans `plan-saison.js`. Ouverture à tous : après la mention de l'envoi à l'IA dans la politique de confidentialité (lot RGPD).
4. **Un seul plan** (12 novembre 2026, construit) : page « Mon plan », courses du plan et leur avis, préparatoire conseillée, place d'une course dans la saison (§ 3.5, 5.1, 5.4) ; sans évolution de la base.
5. **Profil du coureur** (page « Mon profil », un onglet de plus : mesures, niveau, ma semaine, santé, connexions ; temps de référence saisi ou tiré du Palmarès).
6. **Adaptation** : déplacer une séance (libre, avec un conseil), la commenter (la réadaptation se relance aussitôt), ressenti après séance (échelle de 1 à 10), réajustement et historique des propositions.

## 9. Questions ouvertes

- [x] **Rôles** : trois rôles, Objectif, Préparatoire et Plaisir ; l'intermédiaire passe en Objectif ; Plaisir compte pour la récupération et les alertes (retenu le 8 novembre 2026).
- [x] **Plusieurs Objectifs** : une saison par Objectif ; alerte sous 12 semaines d'écart (retenu le 8 novembre 2026).
- [x] **Valeurs des règles** : sources publiées (§ 3.2) ; km-effort pour le trail (retenu le 8 novembre 2026).
- [x] **Profil** : champs du § 5.2 (retenu le 8 novembre 2026).
- [x] **Plafond** : 4 propositions par mois (retenu le 8 novembre 2026).
- [x] **Phases Récupération et Entretien** : Récupération en rose, Entretien sans fond (retenu le 8 novembre 2026, [design](design.md), § 10).
- [x] **Place dans le menu** : à cocher dans les Préférences, comme Nutrition (retenu le 8 novembre 2026).
- [ ] **Progression du volume** d'une semaine à l'autre : pas de garde-fou chiffré tant qu'aucune source solide n'est trouvée (la règle des 10 % courante n'est pas établie).
- [x] **Un seul plan** : page « Mon plan », phases réglées sur l'Objectif, avis des courses, préparatoire conseillée, « Passer en Plaisir » (retenu le 12 novembre 2026).
- [ ] **Sources de la préparatoire conseillée** : lues dans des extraits de recherche ; à vérifier sur les pages entières (copier-coller proposé).
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

- Titre « Trail des Gorges », dessous « dim. 7 mars 2027 · dans 20 sem. » ; ni état de la semaine ni titre « Bloc en cours » ; frise « Saison » par défaut, de la semaine du 19 octobre 2026 à celle du 1er mars 2027, nom de la phase écrit sur la barre ; « Tout » : de la semaine du 19 octobre 2026 à celle du 25 octobre 2027 (fin de la récupération du Trail des Crêtes, 59 jours) ; courses de la frise : Trail du Lac (Préparatoire), Corrida de Noël (Plaisir), Trail des Gorges (Objectif), Trail des Cimes, Ultra du Plateau et Trail de la Forêt (options), Trail des Crêtes (Objectif) ; aucune alerte : rien d'affiché. Plein écran : un rond sur ordinateur, aucun sur téléphone.
- Bloc en cours : la grille du Mois, 28 cases du lun. 19 octobre au dim. 15 novembre, en Entretien ; « Allégé » dans les cases du 12 au 14 novembre, aucun autre repère ; un « + » par jour.
- Au 30 novembre : « Récupération » dans la case du ven. 4 décembre (pas le 5), « Repos » dans celle du sam. 12 décembre ; la case du 30 novembre au fond de la Base.
- Calendrier, mars 2027 : affûtage le 2 mars, Récupération le 9, d'une autre couleur.
- Sans Objectif à venir : le message, pas de frise. Site partagé en lecture seule : la saison s'affiche, sans « + ».
Résultats attendus, un seul plan (§ 3.5 et 5.4) :

- Courses du plan, dans l'ordre : Trail du Lac (Possible : 16 semaines avant Trail des Gorges, conseillé 4 à 6), Corrida de Noël (Possible), Trail des Gorges (Objectif, rond « Régler les phases »), Trail des Cimes (Possible, 12 semaines avant Trail des Crêtes), Ultra du Plateau (Déconseillée : récupération jusqu'au mar. 17 août 2027, sur l'affûtage de Trail des Crêtes ; sources Trainingplan.dev et Bosquet ; pas de « Passer en Plaisir »), Trail de la Forêt (Possible), Trail des Crêtes (Objectif) ; ordre de la page : le bloc, les courses du plan, la préparatoire conseillée.
- Préparatoire conseillée : « avant Trail des Gorges : un trail de 21 à 42 km, sur un terrain proche, du dim. 24 janv. 2027 au dim. 7 févr. 2027. », sources iRunFar et Laura Norris, aucune course repérée, « + Ajouter une course » (fiche : Confirmée, Préparatoire ; « + Course » sur téléphone).
- Une course repérée le dim. 31 janvier 2027 : proposée avec « Confirmer » ; confirmée, elle passe Préparatoire et Conseillée (« 5 semaines avant Trail des Gorges : dans la fenêtre conseillée (4 à 6 semaines) ») ; la préparatoire conseillée disparaît.
- La Corrida de Noël en Préparatoire le lun. 15 février 2027 : Déconseillée (« à 20 jours de Trail des Gorges (3 semaines conseillées) »), « Passer en Plaisir » ; après confirmation : rôle Plaisir écrit, Possible.
- Rond « Régler les phases » sur la frise (Trail des Gorges) et sur chaque Objectif des courses du plan, jamais sur une autre course ; 20 semaines et une semaine en Base : durée écrite sur l'Objectif, seule la semaine modifiée rangée ; « Revenir aux règles générales » : plus rien de rangé.
- Page du Trail des Gorges : « Objectif · saison de 16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027 », la frise de sa saison, « Voir dans Mon plan → » ; ni semaines ni réglage. Trail du Lac : « Préparatoire · en Entretien, avant la saison de Trail des Gorges · 3 jours allégés avant, 19 jours de récupération », Possible. Corrida de Noël : « Plaisir · semaine 4 sur 16 de la saison de Trail des Gorges · repos la veille, 6 jours de récupération ». Trail des Cimes : « Préparatoire (option) · semaine 3 sur 16 de la saison de Trail des Crêtes · 3 jours allégés avant, 42 jours de récupération ». Format sans durée : « pas encore de plan » ; 10 semaines choisies dans Mon plan : saison de 10 semaines.
- Fiche d'une course neuve (Trail, Trail court, sam. 12 juin 2027) : « Préparatoire · semaine 5 sur 16 de la saison de Trail des Crêtes · 3 jours allégés avant ».
- Onglet, titre de page et lien d'En un coup d'œil : « Mon plan ».

Résultats attendus, profil :

- Profil vide : « Profil à compléter : je cours depuis, distance par semaine, plus longue sortie récente, ma semaine, repère d'allure. » ; la liste : « Indispensable pour proposer tes séances » (« 0 sur 5 », cinq « À renseigner ») et « Pour affiner (facultatif) », 9 lignes ; ni astérisque ni phrase sur le site partagé.
- « Je cours depuis » : cinq tranches ; « 3 à 6 ans » s'enregistre aussitôt, retour à la liste, « 1 sur 5 ».
- La fenêtre est la feuille d'une course : croix ronde, aucun bouton « Fermer ». Sur ordinateur : même taille pour la liste et les neuf questions, glissement vers la droite à l'ouverture d'une question, vers la gauche au retour.
- Ma semaine : jours pour courir mardi, jeudi, samedi, dimanche ; « 8 » sorties refusé (« Un chiffre de 0 à 7. ») ; 3 sorties, sortie longue le dimanche, puis le dimanche retiré : sortie longue « peu importe » ; sortie longue le samedi, renforcement mardi et jeudi ; 7 renforcements, puis 1 ; rien n'est enregistré avant le bouton « Enregistrer » (en haut à droite, « Annuler » à gauche), qui range tout et revient à la liste ; « 8 » refusé, rien d'enregistré.
- Repère d'allure : VMA à 35 refusée (« La VMA doit être comprise entre 8 et 30 km/h. ») ; 10 km en 45:30 : 2 730 secondes. Puis « 5 sur 5 », résumés « 10 km en 45:30 », « 3 sorties, 1 renforcement », « Aucune idée ».
- Facultatif : 1 h 30, Vallonné ; FC max à 250 refusée, 186 acceptée. Sur la page : « Profil complet. ».
- Séance : distance à 0 refusée ; 45 min, 8,5 km, Facile enregistrés.
- Site partagé : ni bouton ni état du profil. Téléphone : liste et semaine type sans débordement.

Résultats attendus, IA (le banc d'essai remplace l'appel par une réponse fixe, sans coût ; profil : course le mardi et le samedi (2 sorties, la longue le samedi), renforcement le jeudi (1) ; séance de 2 h au plus) :

- Au départ : « Proposer les séances », « 4 restantes ce mois-ci », aucune mention.
- Proposition du bloc du 19 octobre : en attente, à part des séances enregistrées : une recommandation, aucun commentaire par semaine ; 12 séances dans la grille (mar. 20 : « Footing · 45 min ») ; boutons Tout accepter, Choisir semaine par semaine, Refaire, Abandonner.
- Ce qui est envoyé : le bloc du 19 octobre au 15 novembre, en Entretien, les jours disponibles (mardi, jeudi, samedi), le repère « allégé » du jeudi 12 novembre ; ni nom de course, ni prénom.
- « Tout accepter » : 12 séances écrites (origine IA, état acceptée ; distance vide pour le renforcement), proposition acceptée, « 3 restantes ce mois-ci ».
- Garde-fou : une course le mercredi 21 (jour non prévu pour courir) : la demande est refaite (essai 2, avec « mer. 21 oct. … : jour non prévu pour courir »), la première marquée invalide. « Choisir semaine par semaine » sans la semaine du 26 octobre : 9 séances écrites.
- Deux réponses fautives de suite : « Proposition impossible à vérifier, réessaie plus tard. », les deux appels en échec, toujours 4 restantes, rien d'écrit.
- « Abandonner » (confirmé) : rien d'écrit, la proposition compte (3 restantes).
- 4 propositions déjà faites ce mois-ci : bouton grisé, « 0 restante ce mois-ci ». Refus de la fonction : « Plus de proposition ce mois-ci : la prochaine le dim. 1er nov. 2026. » ; compte non pilote : « Réservé aux comptes pilotes pour l'instant. ».
- Profil incomplet : pas de bouton, « Compléter mon profil ».
- Seconde acceptation : « 1 séance déjà proposée par MyRunTools sur ces semaines sera remplacée (pas celles que tu as saisies, ni les faites). » ; après confirmation, la séance de l'IA non faite est remplacée, la séance saisie et la séance faite restent, 12 nouvelles séances.
- Garde-fous au 17 novembre : fractionné le 19 novembre (récupération du Trail du Lac) refusé, le 8 décembre accepté ; une séance le 12 décembre (veille de la Corrida de Noël) refusée.
- Site partagé en lecture seule : trame et séances visibles ; ni profil, ni proposition.
- Téléphone : rien ne déborde, la frise défile.
