# Préparation · spécification fonctionnelle

Version 3.1 · 20 novembre 2026 · [Retour au sommaire](README.md) · **Ajouter une course préparatoire** (§ 5.1, n° 16, 26 à 28) : courses de la saison dans la carte de l'Objectif, ajout en deux écrans selon l'avis, feuille d'une course (Passer en Plaisir ou en Préparatoire, Retirer du plan) ; une course peut être sans rôle (hors plan, évolution 039) ; le rôle se donne dans Mon plan seulement ; « Ta saison a changé » · Avant (3.0) : **Vue d'ensemble** (§ 5.1) : carte de l'Objectif et trois réglages (Mon profil, Changer d'Objectif, Personnaliser), frise de tout le plan en cases semaine, bandeau toujours ouvert ; les séances de l'IA s'écrivent d'office (§ 6) ; durée minimum d'un plan par format (§ 5.0) · Avant (2.4) : Tes blessures : « Points fragiles », « Blessé en ce moment ? » Non ou Oui, la blessure datée du jour · Avant (2.3) : Mon profil changé après la dernière proposition : une ligne dans Mon plan (« Refaire la proposition ») et une dans Mon profil · Avant (2.2) : Début : « Plan de 16 semaines » et la date seule ; « Mon volume actuel », « Distance moyenne par semaine » ; une course dont seul le mois est connu ouvre sa fiche ; « Séances maximum par semaine » · Avant (2.1) : Parcours sur toute la largeur de la page ; écran du chevauchement en cartes avec deux boutons ; tuile choisie cerclée d'Accent · Avant (2.0) : **Refonte de Mon plan, étape 1 : le parcours « Construire mon plan »** (§ 5.0) : un écran par question, dans la page ; le choix de la course donne le rôle Objectif (Mon plan seulement) ; deux Objectifs qui se chevauchent : choisir, l'autre devient Préparatoire si les règles fixes le permettent, sinon Plaisir (§ 2) ; niveau, antécédents de blessures et repère sur marathon dans Mon profil ; « Cap sur » : le dernier Objectif par défaut · **Mon plan, page de pilotage** : titre « J-138 », place de la semaine (18), frise fine (repliée sur téléphone), bandeau de MyRunTools avec la proposition repliée, « Cette semaine » en cartes avec son total (19 à 21) et le lien vers le Calendrier (22) ; plus de grille du bloc (7) · Douleur en trois pastilles (Aucune d'office) ; repère « à noter » sur une séance faite sans effort noté ; en tête de la feuille, un bloc qui qualifie la séance, puis un espace avant la notation · Feuille « Effort et sensations » allégée : en tête type et jour, nom et détail de la séance ; « i » en petit picto ; douleur sur « + Signaler une douleur » ; plus de fatigue du jour, de « Ne pas noter » ni de « Plus tard » ; petite feuille sans barre de défilement ; ouverte aussi depuis En un coup d'œil et Nutrition · Effort au curseur, sensations en visages, rond « i », feuille « Effort et sensations » à la case « faite » (§ 5.5) · Échelle du ressenti (Borg modifiée, libellé par niveau) et charge de Foster (§ 5.5) · Lot 6b : un commentaire relance aussitôt une réadaptation, hors plafond ; l'IA reçoit les retours, les commentaires à venir et la blessure en cours ; historique des propositions (§ 6) · Lot 6a : retour sur une séance (faite, ressenti, douleur, fatigue, commentaire), déplacer librement avec un conseil, durée et distance dans les vues (§ 5.5) · Sources de la préparatoire conseillée vérifiées : Marathon Handbook et Laura Norris seulement ; trail de 21 à 30 km avant 42 à 59 km ; ultras 4 à 8 semaines ; fenêtre en semaines entières · **Un seul plan** : la page s'appelle « Mon plan » ; plus de plan par course ni de bloc « Plans des courses » ; les phases se règlent sur l'Objectif de la saison (rond « Régler les phases ») ; « Courses du plan » avec l'avis de chaque course (Conseillée, Possible, Déconseillée, sources) et « Passer en Plaisir » ; préparatoire conseillée avant l'Objectif visé (§ 3.5) ; la page d'une course et sa fiche montrent sa place dans la saison (§ 5.4) · Avant (1.2) : Titre sur deux lignes ; frise en segments avec dates, noms et dates des courses, liste verticale sur téléphone · Page allégée : plus d'état de la semaine (11) ni de titre de bloc (5) ; alertes en une ligne dans le bloc « Recommandation de MyRunTools » ; frise à deux niveaux, plus large, avec plein écran ; une nouvelle acceptation remplace les séances de l'IA non faites · « Ma semaine » en deux cadres, Course et Renforcement · Feuille du profil de taille fixe sur ordinateur, contenu qui glisse d'un écran à l'autre (§ 5.3) · Profil dans la feuille d'une course (règle de design, § 5.3) ; nombres de sorties et de renforcements saisis de 0 à 7 ; bloc affiché dans la grille du Mois du Calendrier ; une seule recommandation de l'IA pour le bloc ; plus de phrases d'aide ni de mention

## 1. Rôle

La Préparation construit **un seul plan pour toute la saison**, au lieu d'un plan par course. Le plan se cale sur les objectifs, et les autres courses s'y insèrent selon leur rôle. Le travail se fait en trois couches :

| Couche | Calculée par | Contenu |
|---|---|---|
| 1. Trame | Des règles fixes (§ 4) | Les phases de chaque semaine, saison après saison |
| 2. Insertion des courses | Des règles selon le rôle (§ 3) | Mini-affûtage, récupération, alertes |
| 3. Séances | L'IA, puis l'utilisateur, qui valide (§ 6) | Les séances du bloc, une recommandation, un réajustement |

- **Jamais d'IA pour les phases ni pour les règles** : elle propose seulement les séances, à l'intérieur de la trame, et les règles vérifient chaque proposition avant de l'afficher.
- **L'accord se donne une fois, à « Construire mon plan »** (19 novembre 2026) : ensuite, les séances proposées par l'IA s'écrivent d'office, vérifiées par les règles ; chacune reste modifiable (déplacer, modifier, supprimer), et « Refaire » en demande d'autres.
- **Le Calendrier lit cette trame** : la règle « la course confirmée la plus proche impose sa phase » ([Calendrier](module-calendrier-specification.md), § 2) a disparu.
- **Un seul plan, une seule page** (12 novembre 2026) : la page **Mon plan** (`preparation.html`) est le seul endroit où le plan se lit en entier et se règle. Une course n'a plus de plan à elle : la rubrique Préparation de sa page et sa fiche montrent sa **place dans la saison** (§ 5.4). Les phases réglées à la main ne valent que pour un Objectif, dont elles règlent la saison.
- **Hors périmètre** : l'import des séances depuis une montre ou une application ; le suivi de la charge (fatigue, forme) ; l'apparence détaillée ([design](design.md)).

## 2. Saisons

- **Une saison par Objectif** : du premier jour de sa préparation (durée de prépa de son format, [Calendrier](module-calendrier-specification.md), § 5.4) au jour de la course. Il peut y avoir plusieurs Objectifs dans l'année : les saisons se suivent.
- **Entre deux saisons** : la récupération de l'Objectif qui vient de se courir (§ 3.3), puis des semaines d'**Entretien** jusqu'au début de la saison suivante. Avant le premier Objectif, les semaines sont aussi en Entretien.
- **Deux Objectifs qui se chevauchent** (17 novembre 2026) : la saison d'un Objectif (durée conseillée de son format, ou celle réglée) commence avant la fin de la récupération de l'autre. Le choix se fait dans le parcours (§ 5.0, écran 2 bis) : un seul des deux reste Objectif ; l'autre devient **Préparatoire** s'il tombe avant et que les règles fixes le permettent (§ 3.5, « Préparatoire pertinente »), sinon **Plaisir** ; s'il tombe après, **Plaisir** aussi (sans affûtage ; le rôle ne peut pas être vide en base). Plusieurs Objectifs espacés restent possibles : chacun sa saison.
- **Données d'avant le parcours** : deux Objectifs trop proches (moins de 12 semaines) gardent l'alerte et la règle d'avant (la seconde saison commence au lendemain de la première course, raccourcie, § 4).
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

**Préparatoire conseillée** : environ la moitié de l'Objectif, ou un peu plus, sans en être trop proche (usages d'entraîneurs, pas des études ; sources vérifiées sur les pages entières le 12 novembre 2026) :

| Objectif | Préparatoire conseillée | Fenêtre | Sources |
|---|---|---|---|
| Route, du semi au marathon exclu (21 à 42 km) | Un 10 km ou un 15 km | 3 à 6 semaines avant (Marathon Handbook : 4 à 5) | [Laura Norris](https://lauranorrisrunning.com/tune-up-races/), [Marathon Handbook](https://marathonhandbook.com/tune-up-race/) |
| Route, marathon et plus (42 km ou plus) | Un semi-marathon (ou un 30 km) | 4 à 6 semaines avant (Laura Norris : 4 à 8) | [Marathon Handbook](https://marathonhandbook.com/tune-up-race/), [Laura Norris](https://lauranorrisrunning.com/tune-up-races/) |
| Trail de 42 à 59 km | Un trail de 21 à 30 km (la moitié, ou un peu plus), sur un terrain proche | 4 à 6 semaines avant (règle du marathon) | [Marathon Handbook](https://marathonhandbook.com/tune-up-race/), [Laura Norris](https://lauranorrisrunning.com/tune-up-races/) |
| Trail de 60 à 129 km (ultra) | Un trail d'environ 50 km, sur un terrain proche (exemple : un 50 km avant un 100 km) | 4 à 8 semaines avant (3 au moins) | [Laura Norris](https://lauranorrisrunning.com/tune-up-races/), [Marathon Handbook](https://marathonhandbook.com/tune-up-race/) |
| Trail de 130 km ou plus (ultra) | Un trail d'environ 80 km (la moitié), sur un terrain proche | 4 à 8 semaines avant | [Marathon Handbook](https://marathonhandbook.com/tune-up-race/), [Laura Norris](https://lauranorrisrunning.com/tune-up-races/) |
| Plus court (route sous 21 km, trail sous 42 km) | Pas de conseil (pour un 10 km, Laura Norris cite un 5 km, 2 à 5 semaines avant : à reprendre plus tard) | | |

**Préparatoire pertinente** (17 novembre 2026, règles fixes, sans jugement) : une course qui perd le rôle Objectif (§ 2) devient Préparatoire seulement si les quatre conditions sont réunies, sinon Plaisir :

1. elle tombe **avant** l'Objectif retenu ;
2. elle est **dans la fenêtre** du tableau ci-dessus (en semaines entières) ;
3. sa **distance** est dans la fourchette du tableau, et de la même famille (route ou trail) : 10 à 15 km avant une route du semi au marathon exclu ; 21 à 30 km avant un marathon ou plus ; 21 à 30 km (trail) avant un trail de 42 à 59 km ; **ultras** : pas encore de fourchette (« environ 50 km », « environ 80 km » ne sont pas des bornes) : Plaisir en attendant (todo) ;
4. elle ne déclenche **aucune alerte** du § 3.4 en Préparatoire.

Un Objectif plus court (route sous 21 km, trail sous 42 km) n'a pas de fenêtre : l'autre course passe toujours en Plaisir.

Écarts tranchés : la fenêtre se compte en **semaines entières**, comme elle s'affiche (« 8 semaines avant » est dans « 4 à 8 ») ; iRunFar (choisir une course qui a du sens pour soi, aussi grande que l'Objectif, qui pousse sans épuiser) ne donne ni distance ni délai : retiré des sources ; la page RunnersConnect reçue est un calculateur d'allure : retirée ; UltraRunning, non vérifiée : retirée. Le mini-affûtage de 3 jours rejoint Laura Norris (3 à 4 jours, volume et intensité réduits de 15 à 20 %).

La distance est celle de la course (les sources parlent en kilomètres réels, pas en km-effort). Sur la page Mon plan, la préparatoire conseillée de l'Objectif visé s'affiche tant que sa fenêtre n'est pas passée et qu'aucune Préparatoire Conseillée n'y est déjà ; elle reprend les courses **Repérées** qui tombent dans la fenêtre, à confirmer d'un toucher. MyRunTools n'invente jamais une course : il propose un type de course et une fenêtre.

## 4. Trame

- **Phases d'une saison** : les règles du [Calendrier](module-calendrier-specification.md), § 5.1, appliquées à la saison de l'Objectif : affûtage sur les 2 dernières semaines, deload toutes les 4 semaines, le reste réparti entre base et développement. Les phases modifiées à la main restent possibles (« Paramétrer le plan », sur l'Objectif).
- **Saison raccourcie** (Objectifs trop proches) : elle garde son affûtage, puis le deload, puis le développement ; la base est réduite en premier.
- **Phases hors saison** : **Récupération** (§ 3.3) et **Entretien** ; deux phases nouvelles, à côté de Base, Développement, Affûtage et Deload. Récupération a sa couleur (fond, liseré, légende du Calendrier) ; Entretien n'en a pas : pas de fond au Calendrier, nommée seulement dans la frise et les semaines de la page. Après le dernier Objectif et sa récupération, plus de phase.
- **Insertion des courses** : un mini-affûtage, un repos la veille ou une récupération ne changent pas la phase de la semaine ; ils s'appliquent aux jours concernés, et l'IA en tient compte (§ 6).

## 5. Page Mon plan

Une page à part, `preparation.html`, titrée et nommée au menu **Mon plan** (clé des préférences : « Préparation »). Son onglet se coche dans les Préférences, comme Nutrition : le menu par défaut garde cinq onglets, qui tiennent sur un téléphone. Tant qu'elle n'est pas au menu, la page En un coup d'œil la propose dans le bloc « Pour aller plus loin » (bouton « Ajouter au menu », [spécification générale](specification-generale.md), § 6).

### 5.0 Construire mon plan (parcours, 17 novembre 2026)

Sans Objectif à venir, la page Mon plan **est** le parcours ; avec un Objectif, le bouton **« + Objectif »** le relance (la croix ramène au plan). Il occupe la page elle-même, sur toute sa largeur, dans le cadre du plan (pas de feuille par-dessus), et reprend les écrans de question de Mon profil (§ 5.2 : libellé, une ligne par choix, coche Accent) : aucun style nouveau. Absent du site partagé.

```
(P1) (‹)  ━━━━━━━━━━━━──────────  (×)        progression fine
(P2) TA COURSE                                  question en libellé
(P3) …contenu de l'écran…
(P4)                              [Continuer]   seulement sur les écrans à plusieurs saisies
```

| N° | Élément | Contenu |
|---|---|---|
| P1 | Barre | « ‹ » (écran précédent ; absent sur le premier), la progression (filet Accent sur fond discret, part des écrans du parcours), la croix (absente sans Objectif à venir : la page n'a rien d'autre) |
| P2 | Question | Libellé de la feuille (comme M5) ; aucune phrase d'aide, aucun « ? » |
| P3 | Choix | Les lignes du profil (M6) ; une seconde ligne en Texte discret quand le choix se décrit ; la tuile choisie cerclée d'Accent (design § 1) |
| P4 | Continuer | `mrt-btn is-principal`, en bas à droite ; seulement sur les écrans à plusieurs saisies |

Un choix unique enregistre la réponse (dans Mon profil pour les questions du coureur) et passe aussitôt à l'écran suivant. Les questions du profil **déjà répondues sont sautées** ; le récapitulatif (9) ramène à chacune. La croix garde ce qui est enregistré ; le rôle et la durée ne s'écrivent qu'à « Construire mon plan ».

| Écran | Question | Contenu |
|---|---|---|
| 1 | Ton plan | « Une course ou un trail » ; « Me maintenir en forme », estompée, inactive, « Bientôt » à droite (todo) |
| 2 | Ta course | « + Ajouter une course » en tête (la fiche du site, Confirmée ; enregistrée, elle est choisie et le parcours continue) ; pastilles **Confirmées** (par défaut : confirmées à venir) et **Toutes** (plus les options et les Repérées) ; une ligne par course à venir : nom (600), dessous « dim. 7 mars 2027 · 45 km · 2 100 m D+ » ; une course dont seul le mois est connu : « date à préciser » ; la toucher ouvre sa fiche pour préciser la date, puis le parcours continue avec elle ; le rôle actuel « Objectif » à droite s'il l'est. Choisir une Repérée ou une option la passera Confirmée |
| 2 bis | Deux Objectifs se chevauchent | Seulement en cas de chevauchement (§ 2). Sans libellé : « ⚠ Attention : deux Objectifs se chevauchent » (Alerte, 600). Deux colonnes (une seule sur téléphone) : à gauche la carte de l'Objectif en cours (cadre Accent, « Objectif en cours »), à droite celle de la course choisie (« Nouvel Objectif ») ; chaque carte reprend celle de la page Courses : rôle et date complète, nom complet (et parcours), lieu et format, Distance avec le D+ ; sans lien ni inscription. Sous chacune, un bouton à contour Accent (`mrt-btn is-actif` : un seul bouton plein par écran, design § 1) : « Garder l'Objectif en cours », « Remplacer l'Objectif en cours » ; dessous, en Texte discret, ce que devient l'autre (« Trail des Crêtes devient Plaisir »). « Garder » range aussitôt le rôle de la course choisie et ramène au plan |
| 3 | Ton niveau | Débutant (« Tu cours depuis peu, jusqu'à 10 km. ») · Intermédiaire (« Tu cours chaque semaine, jusqu'au semi ou à un trail court. ») · Confirmé (« Marathon ou trails de plus de 40 km, entraînement suivi. ») · Expert (« Entraînement structuré depuis des années, tu vises la performance. ») |
| 4 | Tes blessures | Rarement ou jamais · Légères, ou une grave guérie (« Petites blessures de temps en temps, ou une grave aujourd'hui guérie. ») · Fréquentes ou récentes (« Blessures fréquentes, gêne qui dure, ou blessure grave récente. ») · Je préfère ne rien dire ; les deux du milieu déplient **Points fragiles** (faiblesses durables : l'IA prend des précautions ; facultatif) et **« Blessé en ce moment ? »** (pastilles Non, choisi d'office, et Oui) ; Oui ouvre « Quoi et où ? » (la blessure en cours : séances faciles seulement), obligatoire alors (« Décris la blessure, ou réponds « Non ». ») ; pas de date à saisir : celle du jour (gardée si la blessure ne change pas, modifiable dans Mon profil) ; « Continuer » |
| 5 | Mon volume actuel | Distance moyenne par semaine et Plus longue sortie récente, aujourd'hui, en pastilles (tranches du § 5.2) ; suite dès que les deux sont choisies (depuis le récapitulatif : un toucher range et y ramène) |
| 6 | Repère d'allure | VMA · 10 km · Semi · Marathon · Je ne sais pas ; le champ (« h:mm:ss ») ; un résultat du Palmarès de moins de 12 mois sur ces distances, prérempli ; dessous : « Ton niveau d'aujourd'hui, pas un ancien record. » ; « Continuer » |
| 7 | Ma semaine | L'écran de Mon profil, section Course seulement (« Séances maximum par semaine » : l'IA en propose au plus autant) (le renforcement viendra à l'étape « ajouter le renforcement ») ; « Continuer » à la place d'Annuler et Enregistrer ; moins de jours possibles que de séances : « Choisis au moins N jours. » ; au moins une séance |
| 8 | Début | Une tuile par départ : « **Plan de 16 semaines** » (« Recommandée » en Accent pour la durée conseillée), dessous la date seule, « à partir du lun. 16 nov. 2026 », rien de plus ; un départ dès le lundi qui vient quand il allonge le plan (« Plan de 19 semaines », à partir du lun. 26 oct. 2026) ; course trop proche : ce seul départ, plus court ; un Objectif juste avant : le départ au lundi qui suit sa récupération ; « **Personnaliser** » (« Régler les phases semaine par semaine » : la fenêtre « Régler les phases », une fois le plan construit). Sous la durée minimum du format, à la suite de la date : « plan court, 12 semaines au minimum ». Toujours un lundi, jamais en cours de semaine |
| 9 | Récapitulatif | Le nom de la course en titre, dessous « dim. 7 mars 2027 · 16 semaines · 45 km » ; une ligne par réponse (Niveau, Blessures, Volume, Repère d'allure, Ma semaine, Début), chacune ramène à son écran ; **« Construire mon plan »** |

**Durée minimum d'un plan** (19 novembre 2026, à vérifier sur les pages entières : seuls les extraits des recherches ont été lus) : le bas des fourchettes publiées pour un coureur qui court déjà régulièrement. Sous le minimum, le plan se construit quand même (la course a lieu), signalé à l'écran Début et dans la carte de l'Objectif (§ 5.1, n° 1).

| Format | Minimum | Sources (extraits) |
|---|---|---|
| 5 km | 4 semaines | [Trainingplan.dev](https://www.trainingplan.dev/tools/training-plan-length-calculator) (coureur expérimenté, objectif de finir ; valeur peu établie) |
| 10 km | 6 | [Campus Coach](https://www.campus.coach/blog/combien-de-temps-dure-un-programme-d-entrainement-pour-un-semi-marathon), Trainingplan.dev |
| 20 km | 8 | [Salomon](https://www.salomon.com/fr-fr/sg/a/20k-training-plan), [plan des 20 km de Paris](https://harmonie-mutuelle.20kmparis.com/wp-content/uploads/2023/08/plan-entrainement-20km.pdf) |
| Semi-marathon | 8 | [Marathon Handbook](https://marathonhandbook.com/how-long-does-it-take-to-train-for-a-half-marathon/) (après des 10 km), [Campus Coach](https://www.campus.coach/blog/plan-entrainement-8-semaines-preparer-semi-marathon) |
| Marathon | 12 | [Campus Coach](https://www.campus.coach/blog/preparation-marathon-en-12-semaines-les-pour-et-les-contre) (coureur régulier depuis six mois) |
| Ultra-marathon, 100 km | 12 | [Raidlight](https://raidlight.com/en/blogs/conseils-guides-plans-entrainement/plan-dentrainement-de-12-semaines-pour-un-ultra-trail), [Campus Coach](https://www.campus.coach/blog/bases-plan-entrainement-trail-100-km) |
| Trail court | 8 | [Salomon](https://www.salomon.com/fr-fr/sg/a/20k-training-plan) (trail de 20 km), [Campus Coach](https://www.campus.coach/blog/comment-preparer-un-10-km-trail) |
| Trail long | 12 | [Campus Coach](https://www.campus.coach/blog/trail-de-80-km-plan-d-entrainement) (12 à 20 semaines) |
| Ultra-trail | 12 | [Raidlight](https://raidlight.com/en/blogs/conseils-guides-plans-entrainement/plan-dentrainement-de-12-semaines-pour-un-ultra-trail) |

Les autres formats n'ont pas de minimum publié trouvé : pas de signal.

**Construire mon plan** : la course prend le rôle Objectif (Confirmée si elle ne l'était pas) ; l'autre course d'un chevauchement prend son rôle ; la durée choisie s'écrit sur l'Objectif (`prepa_semaines`, vide pour la durée conseillée) ; l'IA propose aussitôt le premier bloc, écrit d'office (compte pour une proposition du mois ; profil incomplet ou plus de proposition : le plan s'affiche sans, avec le message habituel) ; puis la vue d'ensemble (§ 5.1). « Personnaliser » ouvre ensuite « Régler les phases ».

**Mon profil changé, le plan construit** : les phases ne bougent pas (elles ne dépendent que des courses et de la durée) ; les séances déjà acceptées non plus ; seules la prochaine proposition et les conseils de déplacement tiennent compte du profil. Le profil reste modifiable partout (une seule source). Deux signaux, rien de bloqué :

- **Mon plan** : quand Mon profil (niveau, volume, repère d'allure, ma semaine, santé…) a changé après la dernière proposition en attente ou acceptée, le bandeau de MyRunTools porte : « Ton profil a changé depuis la dernière proposition. » et le lien **« Refaire la proposition »** (compte pour une ; grisé s'il n'en reste plus ce mois-ci).
- **Mon profil** (page et feuille) : après un tel changement, tant qu'un Objectif est à venir, en tête de la liste : « Mon plan : refais la proposition pour en tenir compte. »

**Objectif principal** (« Cap sur » de l'en-tête) : par défaut le **dernier Objectif à venir** (le plus lointain) ; sans Objectif, la course à venir la plus lointaine, comme avant. Les Préférences proposent « Par défaut (le dernier Objectif) » puis chaque Objectif à venir.

**Rôle Objectif** : il ne se donne plus que dans Mon plan (parcours) ; la fiche d'une course ne le propose plus (un Objectif y est affiché, sans choix), Préparatoire et Plaisir y restent en attendant l'étape « ajouter une course préparatoire ».

### 5.1 Plan de page : la vue d'ensemble (19 novembre 2026)

Jeu d'essai, au 20 octobre 2026 (§ 10). Les numéros sont stables ; les éléments retirés gardent leur numéro (plus bas).

```
(1) ┌───────────────────────────────────────────────────────────────────┐
    │ OBJECTIF                                                J-138     │
    │ Trail des Gorges · Le grand                                       │
    │ dim. 7 mars 2027 · 45 km · 2 100 m D+                             │
    │ (25) [👤 Mon profil]  [⚑ Changer d'Objectif]  [⚙ Personnaliser]    │
    └───────────────────────────────────────────────────────────────────┘
(3) ┌══════╤──────┬──────┬──────┬──────┬──────┬──────┬──────┐(›)
    │19 oct│26 oct│2 nov │9 nov │16 nov│23 nov│30 nov│7 déc │
    │      │      │      │▲ Lac │      │      │      │▲ Cor.│
    │Entr. │Entr. │Entr. │Entr. │ Base │ Base │ Base │Deload│
    └══════╧──────┴──────┴──────┴──────┴──────┴──────┴──────┘
(9) ┃ ⚠ Lac : récupération jusqu'au ven. 4 déc., sur l'affûtage de Gorges          (s'il y en a)
    ┃ Ton profil a changé depuis la dernière proposition.                          (s'il y a lieu)
    ┃ MyRunTools : Entretien sur deux semaines… Refaire · 3 restantes ce mois-ci
(19) CETTE SEMAINE                         (20) 2/4 séances · 18/32 km · 1 h 45/3 h 10
     19 lun. │ ● Footing · Course à pied · 45 min · 8 km     ☑ │ +
     20 mar. │ (21) Repos                                       │ +
(22) Voir les semaines dans le Calendrier →
```

Téléphone : même ordre ; la frise montre 4 semaines à la fois.

| N° | Élément | Contenu |
|---|---|---|
| 1 | Carte de l'Objectif | L'Objectif visé (le prochain) : « Objectif » en libellé, J-138 à droite ; le nom de la course et du parcours (lien vers sa page) ; la date complète, la distance et le D+. Sous le minimum du format (§ 5.0, écran 8) : « Plan court : 8 semaines (12 au minimum) » |
| 26 | Courses de la saison | Dans la carte, sous la date : « Courses de la saison », une puce par Préparatoire et par Plaisir confirmées entre aujourd'hui et l'Objectif (nom, date, rôle), puis l'Objectif ; une puce ouvre la feuille de sa course (28) ; « + Préparatoire » ouvre l'ajout (27) ; sur le site partagé, sans action |
| 25 | Réglages du plan | Trois boutons de même forme, chacun son picto : **Mon profil** (la feuille Mon profil : les réponses du parcours), **Changer d'Objectif** (le parcours, § 5.0), **Personnaliser** (la fenêtre « Régler les phases » : durée et phases semaine par semaine) ; absents du site partagé |
| 3 | Frise | Tout le plan, une case par semaine, de la semaine en cours (ou du début de la saison, s'il est passé) à la fin de la dernière récupération : le lundi (« 1er » pour le premier du mois), la course de la semaine (▲, par rôle ; une option en italique), la phase (fond de la phase) ; la semaine en cours cerclée d'Accent ; une case mène au Calendrier, sur sa semaine. La frise s'ouvre sur la semaine en cours ; « ‹ » et « › » font défiler de 4 semaines, seulement quand tout ne tient pas |
| 9 | Bandeau de MyRunTools | Toujours ouvert, sous la frise : les alertes (§ 3.4), la **préparatoire conseillée** (16 : « Préparatoire conseillée : un trail de 21 à 30 km, sur un terrain proche, du … au …. Ajouter », tant que sa fenêtre n'est pas passée et qu'aucune Préparatoire conseillée n'y est ; « Ajouter » ouvre l'ajout, la fenêtre d'abord), « Ta saison a changé depuis la dernière proposition. » (un rôle donné, une course ajoutée ou retirée après la dernière proposition ; date retenue dans les préférences, `plan_maj`), « Ton profil a changé depuis la dernière proposition. » (§ 5.0), la recommandation de l'IA (deux phrases au plus) et **« Refaire »** (confirmé : les séances proposées non faites sont remplacées, jamais celles saisies ni les faites ; compte pour une), les propositions restantes ce mois-ci ; un profil incomplet : « Pour que MyRunTools propose tes séances : Compléter mon profil » |
| 19 à 22 | Cette semaine | Une ligne par jour (mise en page de la vue Semaine du Calendrier), le total fait sur prévu, « Repos » un jour vide, le lien vers le Calendrier |

**Ajout d'une préparatoire (27)**, dans la page, comme le parcours (barre, progression, croix) :

1. **Ta course préparatoire** : pastilles Confirmées (par défaut) et Toutes, « + Ajouter une course » (la fiche ; enregistrée, elle est choisie) ; la fenêtre conseillée en une ligne ; une ligne par course à venir avant l'Objectif (pas un Objectif), la fenêtre conseillée d'abord quand l'ajout vient de 16, chacune avec son rôle actuel et son **avis en Préparatoire** (§ 3.5 : Conseillée en Accent, Possible en Texte discret, Déconseillée en Alerte). Une course dont seul le mois est connu ouvre sa fiche. Conseillée ou Possible : un toucher la met en Préparatoire (Confirmée ; une option quitte son groupe), retour au plan.
2. **Déconseillée** : l'alerte en Alerte (« Corrida de Noël : à 20 jours de Trail des Gorges (3 semaines conseillées) »), la carte de la course, « Ajouter quand même en Préparatoire » (contour) et **« Ajouter en Plaisir »** (principal, conseillé).

**Feuille d'une course de la saison (28)** : la petite feuille du site ; le rôle en libellé, le nom, la date et la distance, l'avis (§ 3.5, pas pour un Objectif) ; « Passer en Plaisir » (une Préparatoire) ou « Passer en Préparatoire » (une Plaisir), **« Retirer du plan »** (confirmé : le rôle se vide, la course reste dans Saison et n'agit plus sur le plan ; vaut aussi pour un Objectif), « Voir la course → ».

**Le rôle se donne dans Mon plan seulement** (20 novembre 2026) : la fiche d'une course l'affiche sans choix (« Préparatoire · réglé dans Mon plan », « Hors plan » s'il est vide) ; une course ajoutée depuis Saison n'a pas de rôle ; la page Saison montre alors son statut (« Confirmée »). Une course sans rôle n'agit pas sur le plan (ni repères, ni récupération, ni avis).

Retirés le 19 novembre 2026 : 2 et 12 (bouton Mon profil et état du profil : dans 25), 13 (plein écran), 17 (rond « Régler les phases » : « Personnaliser » de 25), 18 (place de la semaine), 23 (+ Objectif : « Changer d'Objectif »), les pastilles « En cours » et « Tout » de la frise (tout le plan d'office), 6 (Proposer les séances : l'IA propose d'office, § 6), 8 (proposition en attente : plus rien à accepter), 10 (historique des propositions), 15 (courses du plan) et 16 (préparatoire conseillée : à l'étape « ajouter une course préparatoire »). Avant (1.6) : 4, 5, 7, 11 et 14 déjà retirés.

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
| Niveau (17 nov. 2026, remplace « Je cours depuis ») | Débutant · Intermédiaire · Confirmé · Expert, chacun avec sa ligne (§ 5.0, écran 3) | Oui |
| Distance moyenne par semaine | Aucune idée · 0 à 20 km · 20 à 40 km · 40 à 60 km · 60 à 80 km · Plus de 80 km | Oui |
| Plus longue sortie récente | Moins de 1 h · 1 h à 1 h 30 · 1 h 30 à 2 h · 2 à 3 h · Plus de 3 h | Oui |
| Ma semaine | Sur un écran, cinq questions enregistrées à chaque toucher, « ‹ Retour » à la fin : jours possibles pour courir (plusieurs) ; nombre de sorties par semaine (champ texte, un chiffre de 0 à 7, sinon « Un chiffre de 0 à 7. ») ; jour à privilégier pour la sortie longue (un des jours de course, ou Peu importe) ; jours possibles pour le renforcement (plusieurs, un même jour que la course possible : le volume est adapté) ; nombre de renforcements par semaine (même champ, 0 à 7). Retirer un jour ramène la sortie longue à « Peu importe » si besoin. Complète avec au moins un jour pour courir et un nombre de sorties | Oui |
| Repère d'allure | VMA · Temps sur 10 km · Temps sur semi-marathon · Temps sur marathon · Je ne sais pas ; puis la valeur (VMA de 8 à 30 km/h ; 10 km de 20:00 à 2:00:00 ; semi de 50:00 à 4:00:00 ; marathon de 1:50:00 à 8:00:00), « Valider » | Oui |
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

### 5.5 Une séance : la déplacer, la commenter, son retour (lot 6a)

**Fenêtre d'une séance** ([Calendrier](module-calendrier-specification.md), § 4.4), sous les champs : une section « Retour sur la séance » :

```
(7) ☑ Faite
(8) EFFORT PERÇU                                     (14) ⓘ    seulement une fois faite
    ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  curseur de 1 à 10, du vert au rouge
(15) 3 · Endurance fondamentale : allure confortable, conversation complète. Charge : 135 UA.   [Ne pas noter]
(16) SENSATIONS                                       (17) ⓘ
    (😊)(🙂)(😐)(😕)(😣)        1 très bien … 5 très mal
(13) Fatigue du jour (de 1 à 5)  (1)…(5)
(11) Douleur  (Aucune)(Légère)(Forte)   (12) Où [genou droit]   « Où » pour Légère ou Forte
(9) Commentaire [Dur sur la fin]   14/300                 avant comme après la séance
```

- **Effort perçu** (8) : un curseur de 1 à 10 ; sans note tant qu'il n'a pas bougé (poignée estompée) ; « Ne pas noter » retire la note. **Sensations** (16) : cinq visages, indépendantes de l'effort (`sensations`, 1 très bien à 5 très mal, évolution 036) ; la fatigue du jour reste à part. Ronds « i » (14, 17) : une phrase d'explication dans la confirmation du site.
- Une pastille ou un visage par groupe ; un second toucher le retire ; décocher « Faite » efface effort, sensations, douleur et fatigue.
- **Feuille « Effort et sensations »** (allégée le 14 nov. 2026) : cocher « faite » dans une vue (Mois, Semaine, grille de Mon plan), dans le bloc « Aujourd'hui » d'En un coup d'œil ou dans Nutrition ouvre la petite feuille du site (hauteur du contenu, sans barre de défilement ; feuille du bas sur téléphone). En tête : le type et le jour en libellé (« Course à pied · ven. 13 nov. »), puis le nom de la séance (son libellé avant « : ») et, dessous, son détail (après « : »). Ce bloc (type et jour, nom, détail) est serré ; un espace le sépare de la notation. Puis l'effort (sa description seulement une fois noté), les sensations, la douleur (trois pastilles, « Aucune » choisie d'office ; « Où » pour Légère ou Forte), le commentaire ; « Enregistrer » collé en bas ; la croix ferme sans rien ranger de plus que la case : la séance reste faite (la notation n'est pas obligatoire : « faite » est un fait, utile à Nutrition et à l'IA). Une séance faite sans effort noté porte dans les vues (Mois, Semaine, grille de Mon plan) un repère « à noter » en Accent, qui rouvre la feuille ; jamais sur le site partagé. Le « i » est un petit picto sans cadre, collé au titre. **Plus de fatigue du jour** à saisir (la colonne reste en base) ; plus de « Ne pas noter » ni de « Plus tard ». La fenêtre d'une séance reprend les mêmes champs.
- **Ressenti** : effort perçu, échelle de Borg modifiée de 1 à 10 ([Runmotion](https://run-motion.com/rpe-mesure-perception-effort-ressenti-running/)) ; sous les pastilles, le libellé du niveau choisi, et avant tout choix « À noter 15 à 30 minutes après la séance. » :

  | Niveau | Libellé | Repère |
  |---|---|---|
  | 1 à 2 | Très facile | Marche active ou footing de récupération très lent ; respiration par le nez, sans effort |
  | 3 à 4 | Endurance fondamentale | Allure confortable, conversation complète sans essoufflement |
  | 5 à 6 | Endurance active, tempo | Respiration plus rapide ; des phrases courtes, la discussion devient hachée |
  | 7 à 8 | Seuil, allure semi-marathon ou 10 km | Effort soutenu et inconfortable ; quelques mots isolés |
  | 9 | VMA, fractionné court | Effort très difficile, proche du maximum ; impossible de parler |
  | 10 | Sprint maximal | Effort absolu, intenable plus de quelques secondes |

- **Charge** (méthode de Foster) : ressenti × durée en minutes, en unités arbitraires (UA) ; affichée avec le libellé quand la durée est connue (« Charge : 420 UA. ») et envoyée à l'IA avec le libellé du niveau (`charge_ua`, `ressenti`).
- **Déplacer** : librement, par la date de la fenêtre ou en glissant la séance d'une case à l'autre (ordinateur : Mois, Semaine, grille de Mon plan). Le jour d'origine est gardé (`date_prevue`), effacé si la séance y revient.
- **Conseil** (10) : après un déplacement qui enfreint une règle des garde-fous (§ 6 : jour de course ; veille d'une Plaisir ; jour de récupération, séance facile seulement ; jour non prévu dans Mon profil ; plus de séances dans la semaine que prévu), la confirmation du site : « Conseil : c'est la veille d'une course Plaisir : repos conseillé. », « Garder ce jour » ou « Revenir au jour d'avant ». Le déplacement est fait d'abord : rien n'est bloqué.
- **Vues** : sous le libellé, durée et distance (« 1 h · 11 km ») ; devant le type, un point à la couleur de l'intensité (facile, modérée, intense) ; un picto quand la séance a un commentaire. Le retour sur une séance n'est jamais montré sur le site partagé.
- **Données de santé** : ressenti, douleur, fatigue, commentaire et blessure en cours ([Mon profil](module-profil-specification.md)) ; la page des mentions dit ce qui est recueilli, pourquoi, qui y accède et ce qui est envoyé à l'IA.

## 6. Séances proposées par l'IA

- **Unité** : un bloc de 4 semaines. Proposer la saison entière d'un coup collerait moins à ce qui est vraiment fait, et chaque appel coûterait plus.
- **Ce qui est envoyé** : la trame du bloc (phases, jours de mini-affûtage, de repos et de récupération), les courses du bloc avec leur rôle, le profil, les séances des 4 semaines passées (faites ou non). Ni nom, ni adresse, ni nom de course ; les courses sont désignées par leur format, leur distance, leur D+ et leur rôle.
- **Ce qui revient** : dans un format imposé, une recommandation pour le bloc (deux phrases courtes au plus ; le site n'en montre jamais plus de deux) et la liste des séances (date, type, libellé, durée, distance, intensité).
- **Garde-fous** (des règles, vérifiées par le site avant d'afficher) :
  - dates dans le bloc, type connu, libellé de 1 à 100 caractères, durée de 1 à 1 440 minutes ;
  - une course seulement un jour possible pour courir, un renforcement seulement un jour possible pour le renforcement ; pas plus de sorties ni de renforcements par semaine que prévu ; aucune séance un jour de course ni la veille d'une Plaisir (repos) ;
  - durées maximales respectées (séance, semaine) ;
  - séances faciles seulement pendant une récupération ;
  - volume des semaines d'affûtage entre 40 et 59 % de la moyenne des 3 semaines d'avant (une réduction de 41 à 60 %), quand ces 3 semaines ont des durées connues.

  Les règles non respectées sont renvoyées à l'IA, en phrases courtes, pour qu'elle corrige.

  Une proposition qui ne passe pas est refaite une fois automatiquement ; si elle échoue encore, le message « Proposition impossible à vérifier, réessaie plus tard. » s'affiche, sans rien décompter.
- **Écrites d'office** (19 novembre 2026) : une proposition qui passe les garde-fous s'écrit aussitôt (origine IA), sans rien à accepter ; elle remplace les séances de l'IA non faites du bloc, jamais celles saisies ni les faites. L'IA propose : à « Construire mon plan », à l'arrivée sur Mon plan quand aucune proposition ne couvre la semaine en cours (une fois par visite, s'il en reste ce mois-ci et que le profil est complet), et sur « Refaire » (confirmé, compte pour une). Une proposition restée en attente d'avant s'écrit à l'arrivée.
- **Réajustement** : quand des séances passées n'ont pas été faites, « Refaire » refait le bloc à partir d'aujourd'hui, en en tenant compte.
- **Réadaptation** (lot 6b) : enregistrer un commentaire nouveau ou changé sur une séance (Mon plan, Calendrier, Nutrition) relance aussitôt une proposition pour le bloc de la semaine en cours, motif « Réadaptation » ; la proposition en attente de ce bloc est abandonnée ; sur Mon plan, « Réadaptation en cours… » puis la proposition ; ailleurs, le message « Commentaire pris en compte : une nouvelle proposition de MyRunTools attend dans Mon plan. ». Rien n'est enregistré sans « Tout accepter » ou « Choisir semaine par semaine ». Profil incomplet : « Commentaire enregistré. Pour que MyRunTools réadapte le plan, complète Mon profil. » ; compte non pilote : rien.
- **Ce que reçoit l'IA en plus** (lot 6b) : pour chaque séance des 4 semaines passées, ce qui est renseigné de son retour (ressenti sur 10, douleur et où, fatigue sur 5, commentaire, jour d'origine si déplacée) ; les commentaires des séances du bloc ; la blessure en cours (description, depuis). Consigne : ces retours priment ; douleur forte ou blessure : séances faciles, dit dans la recommandation, sans avis médical.
- *(Historique, élément 10 : retiré le 19 nov. 2026.)* Avant : « Historique des propositions (n) », replié, sous la grille : une ligne par proposition (la reprise d'une proposition refusée par les garde-fous n'en fait qu'une) : date, bloc, motif (Proposer, Refaire, Réadaptation), statut (En attente, Acceptée, Abandonnée, Impossible à vérifier).
- **Plafond** (levé pendant les essais des pilotes depuis le 13 nov. 2026 : réglage `plafondIA` du site à 0, secret `PLAFOND` de la fonction absent ; plus de compteur affiché) : 4 propositions par utilisateur et par mois civil (les réadaptations ne comptent pas, tant que seuls les pilotes y ont accès ; refaire compte pour une ; la reprise automatique après un garde-fou ne compte pas, dans la limite de 4 par mois). Le bouton affiche « 4 restantes ce mois-ci » et se grise à 0 ; au-delà, la fonction répond « Plus de proposition ce mois-ci : la prochaine le 1er … ».
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
6. **Adaptation**. 6a **construit** (12 novembre 2026) : retour sur une séance, déplacer avec un conseil, détail dans les vues (§ 5.5), blessure en cours dans Mon profil, mention des données de santé ; évolution `034-retour-seance.sql`. 6b **construit** (12 novembre 2026) : réadaptation et historique (§ 6) ; évolution `035-motif-proposition.sql` ; fonction `proposer-seances` à recoller (motif, plafond hors réadaptation, consigne des retours).
7. **Refonte de Mon plan, étape 1 : construire mon plan** (17 novembre 2026, construit) : parcours `composants/plan-parcours.js` (§ 5.0), niveau et antécédents dans Mon profil, repère sur marathon, rôle Objectif donné dans Mon plan seulement, « Cap sur » le dernier Objectif ; évolution `038-construire-mon-plan.sql`. Étapes suivantes : la vue d'ensemble du plan, ajouter une course préparatoire, ajouter le renforcement.

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
- [x] **Sources de la préparatoire conseillée** : vérifiées sur les pages entières (12 novembre 2026).
- [ ] **Préparatoire avant un ultra** : bornes de distance à fournir (« environ 50 km », « environ 80 km ») ; en attendant, Plaisir.
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

Résultats attendus, vue d'ensemble (§ 5.1, depuis le 19 nov. 2026 ; ils remplacent ceux de la page d'avant ci-dessous, gardés pour les règles) :

- Carte : « Trail des Gorges », « dim. 7 mars 2027 · 45 km · 2 100 m D+ », « J-138 », les boutons Mon profil, Changer d'Objectif, Personnaliser ; sur le site partagé, sans boutons ni « + ».
- Frise : du lun. 19 oct. 2026 au lun. 25 oct. 2027, la semaine du 19 octobre cerclée ; Entretien jusqu'au 9 novembre, Base dès le 16 novembre, Récupération du 8 mars au 12 avril, saison du Trail des Crêtes dès le 10 mai ; ▲ Trail du Lac dans la semaine du 9 novembre ; « 1er févr. », « 1er mars » ; seule la flèche « › » au départ, puis les deux ; une case mène à `calendrier.html#semaines=` sa semaine. Au 30 novembre : la frise part du 16 novembre.
- Ni état du profil, ni « En cours »/« Tout », ni plein écran, ni historique, ni courses du plan, ni « Proposer les séances ».
- Trail des Gorges en 8 semaines : « Plan court : 8 semaines (12 au minimum) ».
- IA : à l'arrivée sans proposition, 12 séances écrites d'office, proposition acceptée, 3 restantes ; recommandation de trois phrases : deux montrées, « Refaire » ; au retour, pas de nouvel appel ; « Refaire » confirmé remplace la séance de l'IA non faite, garde la saisie et la faite ; une proposition en attente d'avant s'écrit sans appel ; plafond atteint : rien d'office, « Refaire » grisé ; profil incomplet : « Compléter mon profil », aucun appel ; un commentaire : réadaptation écrite d'office, « Commentaire pris en compte : MyRunTools a réadapté tes séances. » dans le Calendrier.

Résultats attendus, page et profil :

- Titre « Trail des Gorges », dessous « dim. 7 mars 2027 · J-138 », puis « Entretien » (place de la semaine) ; ni état de la semaine ni titre « Bloc en cours » ; frise « Saison » par défaut, de la semaine du 19 octobre 2026 à celle du 1er mars 2027, nom de la phase écrit sur la barre ; « Tout » : de la semaine du 19 octobre 2026 à celle du 25 octobre 2027 (fin de la récupération du Trail des Crêtes, 59 jours) ; courses de la frise : Trail du Lac (Préparatoire), Corrida de Noël (Plaisir), Trail des Gorges (Objectif), Trail des Cimes, Ultra du Plateau et Trail de la Forêt (options), Trail des Crêtes (Objectif) ; aucune alerte : rien d'affiché. Plein écran : un rond sur ordinateur, aucun sur téléphone.
- Cette semaine : une ligne par jour du lun. 19 au dim. 25 octobre, « Repos » sur les sept (aucune séance), un « + » par jour, plus de grille du bloc ; dessous, « Voir les semaines dans le Calendrier → ». Au 9 novembre : « Allégé » sur les lignes du 12 au 14 novembre.
- Proposition en attente : le bandeau ouvert juste après « Proposer les séances » (12 séances dans la liste, les 3 de la semaine dans « Cette semaine ») ; au retour sur la page, replié sur une ligne avec « Voir ».
- Au 30 novembre : « Récupération » sur la ligne du ven. 4 décembre (pas le 5) ; place de la semaine « Semaine 3 sur 16 · Base ».
- Calendrier, mars 2027 : affûtage le 2 mars, Récupération le 9, d'une autre couleur.
- Sans Objectif à venir : le message, pas de frise. Site partagé en lecture seule : la saison s'affiche, sans « + ».
Résultats attendus, un seul plan (§ 3.5 et 5.4) :

- Courses du plan, dans l'ordre : Trail du Lac (Possible : 16 semaines avant Trail des Gorges, conseillé 4 à 6), Corrida de Noël (Possible), Trail des Gorges (Objectif, rond « Régler les phases »), Trail des Cimes (Possible, 12 semaines avant Trail des Crêtes, conseillé 4 à 8), Ultra du Plateau (Déconseillée : récupération jusqu'au mar. 17 août 2027, sur l'affûtage de Trail des Crêtes ; sources Trainingplan.dev et Bosquet ; pas de « Passer en Plaisir »), Trail de la Forêt (Conseillée : 8 semaines avant Trail des Crêtes), Trail des Crêtes (Objectif) ; ordre de la page : le bloc, les courses du plan, la préparatoire conseillée.
- Préparatoire conseillée : « avant Trail des Gorges : un trail de 21 à 30 km, sur un terrain proche, du dim. 24 janv. 2027 au dim. 7 févr. 2027. », sources Marathon Handbook et Laura Norris, aucune course repérée, « + Ajouter une course » (fiche : Confirmée, Préparatoire ; « + Course » sur téléphone).
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

Résultats attendus, construire mon plan (§ 5.0 ; jeu d'essai sans Objectif, profil vide, le semi du Palmarès du 4 oct. 2026 en 1:56:05) :

- Écran 1 : « Une course ou un trail », « Me maintenir en forme » inactive avec « Bientôt » ; ni retour ni croix.
- Écran 2 : Confirmées (par défaut) : Trail du Lac, Corrida de Noël, Trail des Gorges, Trail des Crêtes, chacune avec date, distance et D+ ; Toutes : plus Trail des Cimes, Ultra du Plateau, Trail de la Forêt (« date à préciser » : sa fiche s'ouvre) et Trail des Sommets ; « Ajouter une course » en tête.
- Trail des Gorges choisi : écran 3, quatre niveaux décrits, la progression à 25 %. Écran 4 : « Légères, ou une grave guérie » déplie « Où ? » et la blessure en cours ; « Points fragiles » et « Blessé en ce moment ? » (Non d'office), sans date ; Oui sans texte : « Décris la blessure, ou réponds « Non ». » (le texte tapé reste) ; entorse de la cheville droite : blessure datée du 20 oct. 2026
- Écran 5 : la suite dès que la distance et la plus longue sortie sont choisies. Écran 6 : Semi et 1:56:05 préremplis, « Palmarès · 4 oct. 2026 » ; marathon en 1:40:00 refusé (« Le temps sur marathon s'écrit 3:45:00 (entre 1:50:00 et 8:00:00). »), 3:45:00 accepté.
- Écran 7 : section Course seulement ; mardi et jeudi pour 3 séances : « Choisis au moins 3 jours. »
- Écran 8 : « Plan de 16 semaines » (Recommandée, à partir du lun. 16 nov. 2026), « Plan de 19 semaines » (à partir du lun. 26 oct. 2026), « Personnaliser ».
- Écran 9 : « Trail des Gorges », « dim. 7 mars 2027 · 16 semaines · 45 km », six lignes ; une ligne ramène à sa question puis au récapitulatif (volume : sans « Continuer », 40 à 60 km rangé d'un toucher). « Construire mon plan » : Trail des Gorges Objectif et Confirmée, durée conseillée (vide) ; la page du plan ; l'IA appelée pour le premier bloc ; les réponses rangées dans Mon profil.
- Trail des Crêtes avancé au 2 mai 2027, profil complet, « + Objectif » : la croix ; Crêtes choisi : « Attention : deux Objectifs se chevauchent », sans libellé ; carte « Objectif en cours · dim. 7 mars 2027 · Trail des Gorges · Mont-Clair · Trail long · 45 km · 2 100 m D+ », bouton « Garder l'Objectif en cours », « Trail des Crêtes devient Plaisir » ; carte « Nouvel Objectif · dim. 2 mai 2027 · Trail des Crêtes · Mont-Clair · Ultra-trail · 60 km · 3 500 m D+ », bouton « Remplacer l'Objectif en cours », « Trail des Gorges devient Plaisir » ; « Remplacer » mène au début (questions du profil sautées) ; « Garder » range le rôle Plaisir du Trail des Crêtes et ramène au plan.
- Préparatoire pertinente avant le Trail des Gorges : un trail de 25 km le 31 janv. 2027 : Préparatoire ; 11 semaines avant, 35 km, sur route ou après l'Objectif : Plaisir.
- Profil changé le 19 oct. 2026 à 12 h, après la proposition acceptée du 19 oct. à 10 h : « Ton profil a changé depuis la dernière proposition. Refaire la proposition » ; changé avant : rien. Dans Mon profil, niveau passé à Expert : « Mon plan : refais la proposition pour en tenir compte. »

Résultats attendus, ajouter une course préparatoire (§ 5.1, n° 16, 26 à 28) :

- Carte : « Trail du Lac 15 nov. · Préparatoire », « Corrida de Noël 13 déc. · Plaisir », « Trail des Gorges 7 mars · Objectif », « + Préparatoire » ; bandeau : « Préparatoire conseillée : un trail de 21 à 30 km, sur un terrain proche, du dim. 24 janv. 2027 au dim. 7 févr. 2027. Ajouter ».
- Un Trail de l'Hiver repéré le dim. 31 janv. 2027 (25 km) : « Ajouter », Toutes : en tête, Conseillée ; un toucher : Préparatoire et Confirmée, la saison a changé, sa puce dans la carte.
- La Corrida de Noël hors plan au lun. 15 févr. 2027 : Déconseillée ; l'écran de l'avis « Corrida de Noël : à 20 jours de Trail des Gorges (3 semaines conseillées) », « Ajouter en Plaisir » principal ; choisi : Plaisir et Confirmée.
- Feuille du Trail du Lac : « Préparatoire », son avis, « Passer en Plaisir », « Retirer du plan », « Voir la course → » ; « Retirer du plan » confirmé : rôle vide, la saison a changé, la puce disparaît.
- Saison changée le 19 oct. à 12 h, après la proposition du 19 oct. à 10 h : « Ta saison a changé depuis la dernière proposition. ».
- Fiche d'une course neuve : sans rôle (« Hors plan · réglé dans Mon plan »), écrite avec un rôle vide ; page Saison : une course sans rôle montre « Confirmée ».
