# Nutrition · spécification fonctionnelle

Version 1.43 · 11 novembre 2026 · [Retour au sommaire](README.md) · Calories et macros du jour, calculatrice du besoin, saisie rapide sur téléphone

## 1. Rôle

Le module Nutrition dit au coureur **combien il doit manger aujourd'hui** (calories, protéines, glucides, lipides) et lui permet de **noter ce qu'il mange en quelques secondes**, depuis son téléphone. Il répond à deux questions : quel est mon besoin du jour, où j'en suis.

- **Dans cette version** : calories et macros seulement (protéines, glucides, lipides). Retenu le 5 nov. 2026.
- **Hors périmètre, pour plus tard** : fibres, sel, eau, café, alcool ; conseils et propositions de repas ; recherche dans des bases d'aliments et scan de code-barres (§ 8, lot 6) ; import des séances depuis une application (todo du [sommaire](README.md)).
- **Aucun calcul par intelligence artificielle** : le besoin se calcule par une formule publiée (§ 3).

## 2. Principe : un profil, une calculatrice, une saisie

1. **Le profil** (module Profil) donne sexe, date de naissance, poids, taille et niveau d'activité hors sport. Une donnée ne se saisit qu'à un seul endroit.
2. **La calculatrice** transforme le profil, le sport du jour (saisi à la main) et la phase de préparation en besoin du jour.
3. **La saisie rapide** note les aliments et compare au besoin.

**Premier usage** : si une donnée du profil manque, la page affiche un encart « Pour calculer ton besoin, complète ton profil » avec seulement les champs manquants ; la validation les range dans le profil. Ensuite, un lien « Modifier mon profil » est affiché sous le résultat. À l'inscription, on ne demande rien de plus que le prénom et le nom.

## 3. La calculatrice du besoin du jour

Fonction pure, sans accès à la base : profil + jour → besoin. Elle est dans un composant partagé (`composants/besoin.js`), réutilisable par la future Calculatrice, et testée par le banc d'essai.

| Étape | Règle |
| --- | --- |
| Métabolisme de base (kcal) | Coefficient × poids^0,48 × (taille en m)^0,5 × âge^−0,13 × (1000 ÷ 4,1855). Coefficient : 1,083 homme, 0,963 femme (formule de Black et al.). |
| Activité hors sport | Sédentaire 1,2 · Peu actif 1,3 · Actif 1,45 · Très actif 1,6 (multiplie le métabolisme de base). |
| Sport du jour | Pour chaque séance : MET × poids × heures. |
| **Besoin du jour (kcal)** | Métabolisme de base × activité hors sport + sport. |
| Protéines | 1,4 à 2 g par kg de poids. |
| Glucides et lipides | Part des calories selon la phase (tableau ci-dessous) ; 4 kcal par g de glucide, 9 kcal par g de lipide. |

| Phase | Quand | Glucides | Lipides |
| --- | --- | --- | --- |
| Entraînement | Par défaut | 50 à 60 % | 25 à 35 % |
| Avant-course | J-14 à J-4 | 50 à 60 % | 25 à 35 % |
| Carbo-loading | J-3 à J-1 | 65 à 75 % | 15 à 25 % |
| Veille de course | J-1 | 55 à 65 % | 15 à 25 % |

- **La phase se déduit seule** : c'est celle du plan global, la semaine en cours dans le plan de la course confirmée la plus proche qui la couvre (Base, Développement, Affûtage, Deload : règles du [Calendrier](module-calendrier-specification.md), § 5) ; sans plan, « Entraînement ». De J-3 à J-2 avant la course confirmée la plus proche : « Carbo-loading » ; à J-1 : « Veille de course » ; ces deux phases changent les parts du tableau ci-dessus. Les phases du plan gardent les parts d'Entraînement.
- **Le sport du jour est saisi à la main** (type de sport et durée), retenu sur l'appareil ; sans saisie, c'est un jour de repos. Les séances du Calendrier n'ont pas encore de durée : quand elles en auront une (import des séances, todo du [sommaire](README.md)), elles rempliront le sport du jour d'elles-mêmes. Les MET par type de sport sont repris de la calculette d'origine (jogging 8 km/h : 8 ; 9,5 km/h : 10 ; 13 km/h : 13,5 ; marche : 3 ; musculation : 3 ; vélo : 5 à 10 ; natation : 6 à 9, etc.).
- **Chevauchement** : la veille de course (J-1) l'emporte sur le carbo-loading (J-3 à J-1) ; la phase affichée est « Veille de course ».
- **Profil incomplet** : pas de calcul, l'encart du § 2 s'affiche. Le coefficient du métabolisme de base n'existe que pour « femme » et « homme » : un sexe « non précisé » compte comme manquant, et l'encart demande de choisir l'un des deux pour le calcul.
- Les valeurs sont des **repères** : la page reste épurée, sans mention ni explication du calcul (choix du 6 nov. 2026).

## 4. Plan de page

Trois cartes, dans le cadre commun (`.card`) ; titres de cadre communs (0,85 rem, 600, Texte, casse normale ; [design](design.md), § 1), sous-titres en libellé ; tailles de l'échelle commune (§ 3), sauf le besoin (5), grand chiffre d'un résultat (1,5 rem). Page épurée : pas de texte d'explication. Retenu le 6 nov. 2026, d'après la carte « Mon besoin du jour » et les anneaux d'une première version de l'outil.

### 4.1 Téléphone

Deux cartes : le besoin du jour, le journal ; l'ajout d'un aliment et le sport du jour s'ouvrent dans des feuilles (revu le 10 nov. 2026 : le haut épuré, le jour et le besoin mis en avant).

```
┌─────────────────────────────────────────────────────────┐
│ (32)        (‹)   Lundi 9 novembre   (›) (33)(»)        │  centré ; 33 sur un autre jour seulement
│ (5)              1 701  kcal                            │  centré, Accent, 1,5 rem
│ (22)          Phase · Entretien                         │  discret
│ (21) Calculé pour F · 59 kg · 163 cm · sédentaire ›     │  lien d'action : la fenêtre du profil
│ ─────────────────────────────────────────────────────── │
│ (26–29)  quatre anneaux : nom, valeur, Reste, Besoin    │
│ ─────────────────────────────────────────────────────── │
│ (45) ┌ ACTIVITÉ        ┐  (46) ┌ REPAS           ┐       │
│      │ + Ajouter       │       │ + Ajouter       │       │
│      └─────────────────┘       └─────────────────┘       │
└─────────────────────────────────────────────────────────┘
┌ (17) Journal du jour ───────────────────────────────────┐
│ (18) PETIT-DÉJ                         90 KCAL   (48)(+) │
│      Banane                            90 kcal          │  ← toucher : Modifier (51)
│      MIDI · ENCAS · SOIR (idem, chacun avec son +)      │
│ (49) ACTIVITÉ                                      (+) │
│ (50) Jogging à 8 km/h · 1 h                             │  ← toucher : Modifier (51)
└─────────────────────────────────────────────────────────┘

(47) Feuille « Ajouter un aliment » (ou « Ajouter une activité »), sans la date (celle de la page) : la feuille d'une course,
     plein écran sur téléphone, croix ronde en haut à droite ; dessous, la recherche (30, 31, 35), les sources (14),
     l'aliment choisi (15), le repas, « Ajouter » (16) ; la feuille reste ouverte, sans message de confirmation.
```

### 4.2 Ordinateur

Les mêmes cartes, l'une sous l'autre ; les quatre anneaux sur une ligne (deux par ligne sur téléphone).

### 4.3 Tableau des éléments

Numéros stables : 1 à 19 ceux de la première version (6 à 13 et 2 retirés), 20 et suivants ceux du 6 nov. 2026.

| N° | Nom | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 32 | Sélecteur de jour | « (‹) Vendredi 6 novembre (›) » | Sous le titre de la carte 1 | `mrt-rond` et flèches dessinées ; pas de jour après aujourd'hui |
| 33 | Retour à aujourd'hui | Rond « » » | À droite de « › », sur un autre jour seulement (une cale à gauche garde le jour centré) | `mrt-rond` |
| 34 | Séances du Calendrier | « Au calendrier : Gainage 30 min · Footing 1 h 15 · Reprendre » | Sous le 23, s'il y a des séances ce jour-là | Texte discret, `mrt-lien` |
| 35 | Mes aliments | Aliments de l'utilisateur qui répondent à la recherche | Au-dessus des produits (31) | Comme une ligne d'aliment ; sous-titres « Mes aliments » et « Produits » en libellé |
| 45 | Bouton Activité | « + Activité » et l'haltère (toujours, comme le bouton Repas ; le sport saisi est dans le journal) | Sous les anneaux, à gauche | Le bouton « + Ajouter une course » (`mrt-btn is-principal`), marges serrées et contenu plus gros, picto à droite du libellé ; ouvre la feuille Activité |
| 46 | Bouton Repas | « + Repas » et l'assiette | À droite du 45 | Même bouton ; ouvre la feuille d'ajout, repas d'après l'heure |
| 47 | Feuilles | « Ajouter un aliment », « Ajouter une activité » | Par-dessus la page | La feuille d'une course (`mc-voile`, `mc-panneau`), croix ronde, titre en libellé ; jamais de bouton « Fermer » |
| 49 | Section Activité | « ACTIVITÉ » et son « + » | En fin de journal, après Soir, détachée des repas (un espace et un filet plein de 2 px avant elle) | Le « + » ouvre la feuille Activité |
| 50 | Ligne d'activité | « Jogging à 8 km/h · 1 h » | Section 49 | Sport et durée, sans dépense ; se touche (Modifier, 51) |
| 51 | Fenêtre Modifier | « Riz cuit » | Par-dessus la page | La fenêtre d'une séance du Calendrier (même taille, mêmes marges) : « Annuler », « Enregistrer » en haut, titre = nom de la ligne, sans « Modifier » ; quantité (−, champ, +) et repas en liste à choix unique (aliment) ou sport et durée (activité) ; « Supprimer » à contour Alerte, poubelle, seul en bas ; question « Supprimer cette ligne ? » (« … activité ? ») |
| 48 | « + » d'un repas | Rond à droite de PETIT-DÉJ, MIDI, ENCAS, SOIR | Journal | Petit rond commun ; ouvre la feuille d'ajout sur ce repas |
| 20 | Modifier le profil (retiré le 10 nov. 2026) | « Modifier » | En haut à droite de la carte 1 | `mrt-btn` ; ouvre la fenêtre du profil (§ 4.5) |
| 21 | Profil du calcul | « Calculé pour F · 59 kg · 163 cm · sédentaire › » (H pour un homme) | Sous la phase, centré | Lien d'action (0,8 rem) ; ouvre la fenêtre du profil (§ 4.5) |
| 22 | Phase | « Phase · Développement » | Sous le 21 | Texte discret |
| 23 | Titre « Sport du jour » | « SPORT DU JOUR » | Sous le 22 | Libellé en capitales (Space Mono) |
| 24 | Ligne de sport | Sport (liste) et durée en heures | Sous le 23 | `mrt-champ` ; remplir la dernière ligne en fait apparaître une autre (cinq au plus) |
| 5 | Besoin du jour | « 2 817 kcal » | Sous le sélecteur de jour, comme un titre | Chiffre en Space Mono, Accent, 1,5 rem |
| 26 | Nom de la jauge | « PROTÉINES » | Au-dessus de l'anneau | Libellé en capitales |
| 27 | Anneau | Valeur mangée au centre ; zone cible marquée | Centre de la jauge | Anneau Accent (rouge au-delà du maximum), zone en Accent à 30 % |
| 28 | Reste | « Reste 92 g », « Dans la cible », « Dépassé de 8 g » | Sous l'anneau | Texte (rouge si dépassé) |
| 29 | Besoin journalier | « Besoin 98–140 g » | Sous le 28 | Texte discret |
| 30 | Recherche | « Rechercher un aliment… » + « Chercher » | Haut de la carte 3 | `mrt-champ`, `mrt-btn` |
| 31 | Résultat | « Riz basmati · Marque A · 350 kcal / 100 g » | Sous le 30 | Comme une ligne d'aliment |
| 14 | Sources | Récents, Favoris, + Aliment libre | Sous les résultats | Pastilles |
| 15 | Quantité | « (−) 190 g (+) », « (−) 2 portions (+) » | Sous l'aliment choisi | `mrt-rond`, `mrt-champ` |
| 16 | Ajouter | « Ajouter » | Bas de la carte 3 | `mrt-btn is-principal`, toute la largeur |
| 17 | Journal du jour | « Journal du jour » | Carte 4 | Titre de cadre commun |
| 18 | Ligne du journal | « Riz cuit · 200 g · 260 kcal » | Carte 4, par repas | La ligne entière se touche (Modifier, 51) ; aucun rond au bout |

### 4.4 Options

Ajout en deux touches (option A, retenue le 5 nov. 2026) : choisir un aliment, régler la quantité, « Ajouter ».

### 4.5 Profil : encart et fenêtre

Un seul formulaire, à deux endroits ; le module Profil complet viendra plus tard (todo du [sommaire](README.md)).

- **Encart du premier usage** : tant que le profil est incomplet, une carte « POUR CALCULER TON BESOIN » remplace la page, avec **seulement les champs qui manquent** (sexe en deux pastilles, naissance, poids et taille avec leur unité, activité hors sport en liste) et « Enregistrer ».
- **Fenêtre « Mes mesures »** (bouton 20) : les cinq champs, « Annuler » à gauche et « Enregistrer » à droite, en haut, comme les autres fenêtres du site.
- **Contrôles** : poids de 20 à 300 kg (virgule acceptée, un chiffre après la virgule), taille de 100 à 250 cm, âge de 10 à 110 ans, sexe femme ou homme, niveau d'activité choisi. Un champ refusé : message sous le titre, rien n'est écrit. Seuls les champs affichés sont rangés ; en cas d'échec, « Enregistrement impossible pour l'instant. », la fenêtre reste ouverte.
- **Site partagé en lecture seule** : la page n'affiche aucune donnée de nutrition.
- **Menu** : Nutrition se coche dans les Préférences (six onglets ne tiennent pas sur un téléphone de 375 px) ; l'évolution 020 l'ajoute aux menus déjà rangés.

### 4.6 Règles

- **Jour** (32, 33) : la page s'ouvre sur aujourd'hui ; (‹) et (›) changent de jour, jamais au-delà d'aujourd'hui. Le besoin (âge, phase, sport de ce jour), les jauges, le journal et le sport suivent le jour choisi ; un aliment ajouté va dans ce jour (repas oublié).
- **Activité : le Calendrier en est la source** (10 nov. 2026). La course à pied et le renforcement sont les **séances du Calendrier** : celles du jour comptent dans le besoin, faites ou non ; un jour passé, seules les séances faites comptent ; les propositions de l'IA en attente ne comptent pas. Leur dépense suit une échelle normée, la même pour tous : course à pied, équation de course de l'ACSM, MET = (0,2 × vitesse en m/min + 3,5) ÷ 3,5, la vitesse étant celle de la séance (distance ÷ durée), sinon une part de la VMA selon l'intensité (facile 65 %, modérée 75 %, intense 85 % ; VMA du profil, sinon du profil de coureur), sinon 9,5 km/h ; renforcement, 3 MET ; une séance sans durée ne compte pas. Dans la feuille Activité, « Séances » liste celles du jour et « Ajouter une séance » ouvre **la fenêtre de séance du Calendrier** (au jour de la page, type Course à pied) ; toucher une séance (feuille ou journal) l'ouvre en « Modifier la séance », avec « Supprimer » et la question du site : ce qui change d'un côté se voit de l'autre. Dans le journal, chaque séance a sa case « faite », rangée dans le Calendrier ; un jour passé, une séance non faite est estompée, « non faite ». Noms alignés sur le Calendrier : Course à pied, Renforcement, Intensité ; une séance s'écrit « Footing · Course à pied · 1 h · 10 km ».
- **Autres sports** (24), dans la feuille Activité (45), sous les séances : vélo, natation, marche, crossfit (la course et le renforcement n'y sont plus) ; liste des sports (MET du § 3) et durée en heures (virgule acceptée, de plus de 0 à 24 h ; une durée hors de ces bornes est ignorée). Il est **rangé dans la base** (`sport_jour`), jour par jour, peu après la dernière frappe ou au changement de jour ; le besoin (5) et les jauges se recalculent à chaque saisie. En cas d'échec : « Enregistrement impossible pour l'instant. » sous le sport.
- **Séances du Calendrier** (34, retiré le 10 nov. 2026 : « Reprendre » n'a plus lieu d'être, les séances comptent d'elles-mêmes) ; avant : « Reprendre » en fait des lignes de sport : Renfo devient Musculation, un Run laisse l'allure à choisir ; la durée vient du libellé quand il la donne clairement (« 30 min », « 1 h 15 », « 1h »), sinon elle reste à saisir. Seules les lignes complètes comptent.
- **Jauges** (26 à 29) : sous le minimum, « Reste … » (jusqu'au minimum) ; entre le minimum et le maximum, « Dans la cible » ; au-delà, « Dépassé de … » et anneau rouge. La cible des macros est la fourchette du besoin du jour ; celle des calories va du besoin à 110 % du besoin (tolérance de conception, ajustable). L'anneau est plein à 115 % du maximum.
- **Recherche** (30, 31, 35) : **pendant la frappe**, les aliments de l'utilisateur seulement, sans réseau (« Mes aliments », six au plus : chaque mot de la recherche commence un mot du nom, sans accent ni pluriel, « oeufs au plat » trouve « Œuf au plat ») ; **à la validation** (touche Entrée ou « Chercher »), les produits d'Open Food Facts, huit au plus, sans produit sans calories ni doublon, valeurs pour 100 g ; ils arrivent aussi **pendant la frappe**, dès trois lettres, une demi-seconde après la dernière, par le relais seulement (l'ancien moteur limite les recherches) ; si le relais ne répond pas, la frappe ne montre plus que mes aliments, et les produits attendent la validation. Le moteur ne complète pas un mot commencé (« yaourt na » cherche « na », qui ramène des marques « NA ») : seuls restent les produits dont le nom ou la marque contient tous les mots tapés, même commencés, sans accent ni pluriel ; s'il en reste moins de trois, le relais recommence sans le dernier mot (« yaourt na » : les yaourts, gardés s'ils sont « nature »). Les produits passent par un **relais Supabase** (fonction `recherche-aliments`, `supabase/functions/`) : le téléphone ne peut pas interroger directement le moteur de recherche d'Open Food Facts, et l'ancien moteur est souvent saturé ; le relais interroge le nouveau moteur, puis l'ancien en cas d'échec. Si le relais ne répond pas (pas encore créé), la page interroge l'ancien moteur elle-même, avec un nouvel essai. Une recherche déjà faite est gardée pendant la visite (aucun nouvel appel), sous la version du site : une mise en ligne efface ce qui était gardé ; une recherche sans résultat n'est pas gardée. « Recherche… », « Aucun résultat. », ou « Open Food Facts est saturé, réessaie dans un instant. ». Source citée dans les crédits des mentions légales. Limite : Open Food Facts ne connaît que des produits du commerce (« oeufs au plat » ramène des bonbons) ; les plats simples viendront de Ciqual.
- **Produit choisi** : quantité en grammes, sa portion habituelle d'office (sinon 100 g) ; à « Ajouter », il devient un aliment de l'utilisateur (une seule fois, portion « 100 g ») et revient dans Récents ; « ☆ Favori » est rangé avec lui.
- **Quantité** (15) : en grammes pour un aliment donné pour 100 g (pas de 10 g, de 1 à 5 000 g), en portions pour les autres (pas de 0,5, de 0,1 à 50) ; le champ se saisit aussi au clavier. Hors bornes : message, rien n'est écrit.
- **Ajout rapide** (14 à 16) : Récents (les 8 derniers aliments utilisés), Favoris, « + Aliment libre » (nom, portion, calories obligatoires ; protéines, glucides, lipides à 0 si vides ; case Favori ; « Ajouter l'aliment »). Repas proposé d'après l'heure (avant 10 h petit-déj, avant 15 h midi, avant 18 h encas, sinon soir), changé en un toucher.
- **Ajout en deux étapes** (47) : étape 1, la recherche et les listes (Récents, Favoris, Aliment libre) ; toucher un aliment ouvre l'étape 2 à la place, en blocs aérés : nom et calories, avec le Favori en rond étoile à droite (Accent quand il est coché) ; sous le libellé « Quantité », −, champ et + (ronds de taille commune), puis l'aperçu de la quantité saisie (« 180 kcal · P 2 g · G 40 g · L 1 g »), recalculé à chaque toucher ou frappe ; sous le libellé « Repas », les quatre pastilles ; « Ajouter · 180 kcal », le total dans le bouton ; un rond « ‹ » en haut à gauche revient à l'étape 1, recherche et résultats gardés ; après « Ajouter », retour à l'étape 1.
- **Boutons Activité et Repas** (45, 46) : le bouton « + Ajouter une course » (Accent plein, coins ronds), marges serrées (0,3 rem en hauteur), texte à la taille Nom (1 rem), « + » de 1,1 rem à gauche, picto en trait de 1,5 rem à droite du libellé (haltère, assiette et couverts), dans la couleur du texte du bouton.
- **Ajout** (47) : la feuille s'ouvre par la case Repas (repas d'après l'heure) ou par le « + » d'un repas du journal (48, ce repas d'office) ; elle reste ouverte après « Ajouter » (aucun message de confirmation), les jauges et le journal se mettent à jour dessous ; la croix, Échap ou un toucher à côté la ferment.
- **Journal** (17, 18, 49, 50) : les quatre repas toujours affichés, puis l'activité du jour, chacun avec son « + » et, pour un repas qui a des lignes, son total ; une ligne par aliment (« Riz cuit · 190 g », « Banane · 2 portions »). Toucher une ligne ouvre « Modifier » (51) : la quantité (en grammes ou en portions, comme à l'ajout) et le repas d'un aliment, dont les valeurs figées sont recalculées à la nouvelle quantité ; le sport et la durée d'une activité ; « Supprimer » demande « Supprimer cette ligne ? ».
- **Écritures** : « Ajouter » range la ligne (valeurs figées) puis le dernier usage de l'aliment ; en cas d'échec : « Enregistrement impossible pour l'instant. », rien n'est ajouté.
- **Pas encore construit** : Ciqual (aliments génériques, § 8) ; Open Food Facts ne connaît que des produits de marque.

### 4.7 Bloc Nutrition d'En un coup d'œil

Deuxième bloc de la page (ordre par défaut ; évolution 029 pour les ordres déjà rangés). Revu le 10 nov. 2026 : protéines, glucides et lipides en petits anneaux, comme sur la page.

```
┌ Nutrition                               (43) Détail → ┐
│ (40) 350 / 2 117 kcal                                 │
│      ▓▓▓▓░░░░░░░░░░░░░░                               │
│ (44)  PROTÉINES      GLUCIDES       LIPIDES           │
│        ◯ 6 g          ◯ 76 g         ◯ 1 g            │
│      Reste 92 g     Reste 189 g    Reste 58 g         │
└───────────────────────────────────────────────────────┘
```

| N° | Élément | Règle |
| --- | --- | --- |
| 40 | Bilan du jour | Calories mangées / besoin du jour (sport du jour compris), avec une barre ; chiffre et barre en rouge au-delà de 110 % du besoin. |
| 43 | Détail → | Lien de titre commun, comme « Feuille de route → » (0,8 rem, Texte discret), vers la page Nutrition. |
| 44 | Anneaux | Protéines, glucides, lipides : les anneaux de la page en petit (64 px), nom, valeur, « Reste … » (ou « Dans la cible », « Dépassé de … ») ; les trois sur une ligne, téléphone compris. |

- Le bloc n'apparaît que si le module Nutrition est dans le menu de l'utilisateur ; il se range et se décoche dans les Préférences comme les autres blocs.
- Profil incomplet : « Complète ton profil sur la page Nutrition. » ; site partagé : « Les données de nutrition ne sont pas partagées. »
- Les éléments 41 et 42 (aliments en pastilles, ajout en une touche et « Annuler ») sont retirés : l'ajout se fait sur la page Nutrition.

## 5. Aliments : favoris, récents, saisie libre

- Un aliment : nom, portion habituelle (« 1 pièce », « 100 g »), calories, protéines, glucides, lipides **pour cette portion**.
- **Favoris** : épinglés par l'utilisateur ; **Récents** : les derniers utilisés, sans doublon.
- **Aliment libre** : nom + calories et macros saisis à la main ; peut être épinglé en favori.
- **Recherche** : un produit d'Open Food Facts (§ 4.6) devient un aliment de l'utilisateur à son premier ajout. Rien n'est préchargé : pas de donnée inventée.

## 6. Téléphone

Page pensée téléphone d'abord : cibles tactiles d'au moins 44 px, un seul défilement, bloc « Ajout rapide » atteignable sans défiler quand c'est possible (jauges compactes), clavier numérique pour les quantités, pas de déplacement horizontal.

## 7. Données

Tables créées par l'évolution 019 ([modèle de données](modele-donnees.md), § 5 bis) :

| Table | Contenu |
| --- | --- |
| `aliments` | Aliments de l'utilisateur : nom, portion, calories, protéines, glucides, lipides (pour une portion), favori (oui/non), dernier usage |
| `repas_lignes` | Une ligne par aliment mangé : jour, repas, aliment, nom et valeurs **figés à la saisie** (modifier un aliment ne réécrit pas le passé) |
| `sport_jour` | Le sport de chaque jour : date, sport (clé du § 3), durée en heures (évolution 022) |
| `profils.activite` | Niveau d'activité hors sport : sédentaire, peu actif, actif, très actif (ajouté le 5 nov. 2026) |

- Les besoins et cibles **ne sont pas stockés** : ils se calculent à la demande.
- Données de santé : règles par ligne comme le reste, **jamais** visibles par le site partagé en lecture seule ; concernées par le lot RGPD du [sommaire](README.md).

## 8. Lots de construction

| Lot | Contenu |
| --- | --- |
| 1 | Cette spécification, validée (5 nov. 2026) |
| 2 | Modèle de données : évolution 019 écrite, à coller dans l'éditeur SQL de Supabase |
| 3 | Composant `besoin.js` et ses essais |
| 4 | Profil minimal : champs utiles et encart de premier usage |
| 5 | Page Nutrition : besoin, sport du jour, jauges, ajout rapide, journal du jour (construit le 5 nov. 2026 ; reste le sélecteur de jour) |
| 6 | Recherche d'aliments : Open Food Facts (construit le 6 nov. 2026, crédits dans les mentions légales ; relais Supabase `recherche-aliments` le 8 nov., à créer dans le tableau de bord : Edge Functions, puis coller `supabase/functions/recherche-aliments/index.ts`) ; Ciqual (ANSES, aliments génériques, import unique, licence ouverte) dès que le site de l'ANSES sort de maintenance ; code-barres plus tard |
| 7 | Bloc Nutrition d'En un coup d'œil (construit le 6 nov. 2026, § 4.7) ; historique par mois, repères glucides et eau par heure partagés avec la stratégie de course d'[Objectif](module-objectif-specification.md) |
| 8 | Import Strava (après validation de l'application par Strava pour d'autres coureurs) |

## 9. Questions ouvertes

1. **Conseils et repas proposés** : reportés à une version ultérieure (choix de conception, 5 nov. 2026) ; à reprendre quand la saisie est utilisée.
2. **Repères** : la formule (Black et al.), les niveaux d'activité et les MET sont des références générales, valables pour tout coureur ; les parts de glucides et de lipides et les g/kg de protéines sont des repères courants de la nutrition du sportif. Les résultats sont donnés comme des repères, pas comme un avis médical (mention sous le résultat) ; une relecture par un professionnel reste facultative (todo « Partenariat nutrition »).

## 10. Jeu d'essai et résultats attendus

Date figée au 20 octobre 2026. Profils fictifs.

- Profil A : homme, né le 15 mars 1986 (40 ans), 70 kg, 175 cm, peu actif.
- Profil B : femme, née le 2 août 1990 (36 ans), 58 kg, 165 cm, peu active.

| Cas | Résultat attendu |
| --- | --- |
| A, repos, entraînement | Métabolisme de base 1 628 kcal ; besoin **2 117 kcal** ; protéines 98 à 140 g ; glucides 265 à 318 g ; lipides 59 à 82 g |
| A, 1 h de jogging à 9,5 km/h (MET 10), entraînement | Besoin **2 817 kcal** (sport 700 kcal) ; glucides 352 à 423 g ; lipides 78 à 110 g |
| A, repos, carbo-loading | Besoin 2 117 kcal ; glucides 344 à 397 g ; lipides 35 à 59 g |
| B, 1 h 30 de jogging à 9,5 km/h, entraînement | Métabolisme de base 1 302 kcal ; besoin **2 563 kcal** ; protéines 81 à 116 g ; glucides 320 à 384 g ; lipides 71 à 100 g |
| Profil sans poids | Pas de calcul ; l'encart ne demande que le poids |
| Sexe « non précisé » | Pas de calcul ; l'encart demande le sexe (femme ou homme) |
| Plan de 12 semaines de la course confirmée la plus proche (jour J au 1er nov.), puis J-2, J-1, puis jour J au 20 déc. ; sans plan | « Phase · Affûtage » ; « Phase · Carbo-loading » ; « Phase · Veille de course » ; « Phase · Deload » ; sans plan : « Phase · Entraînement » |
| Ajouter « Banane » (1 pièce) au midi | Une ligne au midi ; les jauges montent des valeurs de la banane |
| Supprimer la ligne (✕) | La ligne disparaît ; les jauges reviennent à l'état d'avant |
| Modifier l'aliment « Banane » après coup | Les jours passés gardent leurs valeurs d'origine |
| Site partagé en lecture seule | Aucune donnée de nutrition visible |
| Jour passé (flèche ‹) | Le journal du jour choisi ; le besoin recalculé avec le profil et les séances de ce jour |
| Profil A sans naissance, poids, taille ni activité (sexe seul) | L'encart ne montre que ces quatre champs |
| Encart : poids « 0 », puis taille « 17 » | Messages « Le poids doit être compris entre 20 et 300 kg. » puis « La taille doit être comprise entre 100 et 250 cm. » ; rien d'écrit |
| Encart rempli (15 mars 1986, 70 kg, 175 cm, peu actif) | Une écriture avec ces quatre champs ; l'encart disparaît ; « 2 117 kcal aujourd'hui », « Phase · Entraînement » (aucun plan), besoins 2 117 kcal, 98–140 g, 265–318 g, 59–82 g |
| Profil complet, « Modifier » (20) | Fenêtre avec les cinq champs remplis ; « Annuler » ne range rien ; poids « 72,5 » et activité « actif » : une écriture à cinq champs, besoin 2 401 kcal |
| Écriture en panne | « Enregistrement impossible pour l'instant. », fenêtre ouverte |
| Profil A, plan de 12 semaines du Trail du Lac | Carte 1 : « Homme · 40 ans · 70 kg · 175 cm · Peu actif », « Phase · Développement », « 2 117 kcal aujourd'hui » ; titre des jauges « Mardi 20 octobre » ; ni mention ni fourchettes en texte |
| Journal du jour : riz cuit 200 g au midi (260 kcal), banane au petit-déj (90 kcal) | Blocs « Petit-déj 90 kcal » et « Midi 260 kcal » ; « Riz cuit · 200 g » ; anneaux : 350, Reste 1 767 kcal, Besoin 2 117 kcal ; 6 g, Reste 92 g, Besoin 98–140 g ; 76 g, Reste 189 g, Besoin 265–318 g ; 1 g, Reste 58 g, Besoin 59–82 g |
| Banane à 2 portions (étape 2) | Aperçu « 180 kcal · P 2 g · G 40 g · L 1 g », bouton « Ajouter · 180 kcal » ; riz cuit à 200 g saisi au clavier : « 260 kcal · P 5 g · G 56 g · L 1 g » |
| Sources dans l'ordre Récents, Favoris, + Aliment libre ; toucher la banane, puis « ‹ » | Étape 2 : la banane seule, sans recherche ni listes, « ‹ » visible ; « ‹ » : retour aux listes |
| Récents, Favoris | Récents : « Banane · 1 pièce · 90 kcal », « Riz cuit · 130 kcal / 100 g » (sans l'œuf jamais utilisé) ; Favoris : banane |
| Banane, quantité portée à 2 (+, +, −, +), ajoutée à 10 h | Repas proposé : midi ; une ligne figée (180 kcal, 2 g, 40 g, 0,6 g) puis la mise à jour du dernier usage ; calories 530, Reste 1 587 kcal ; midi 440 kcal ; × la supprime |
| Riz cuit : 100 g d'office ; 0 g ; 200 g puis « − » | « La quantité doit être comprise entre 1 et 5 000 g. », rien d'écrit ; 190 g : ligne de 1,9 fois les valeurs (247 kcal, 5,1 g, 53,2 g, 0,6 g), « Riz cuit · 190 g » |
| Recherche « riz » (réponse : riz basmati Marque A à 350 kcal, un produit sans calories, un riz au lait à 300 kJ, une compote) | Deux résultats : « Riz basmati · Marque A · 350 kcal / 100 g », « Riz au lait · 72 kcal / 100 g » (ni le produit sans calories, ni la compote, sans le mot « riz ») |
| Riz basmati choisi (portion habituelle 60 g), Favori, Ajouter | 60 g d'office ; rien d'écrit au Favori ; puis l'aliment créé (portion 100 g, favori), la ligne (0,6 portion : 210 kcal) et le dernier usage ; il revient en tête des Récents |
| Recherche sans résultat ; recherche refusée | « Aucun résultat. » ; « Recherche indisponible pour l'instant, réessaie dans une minute. » |
| Aliment libre sans nom, puis sans calories | « Écris le nom de l'aliment. », puis « Indique les calories pour une portion. » ; la saisie reste ; rien d'écrit |
| Aliment libre « Pain », 1 tranche, 80 kcal, 3,5 g, 15 g, favori | Aliment créé (lipides 0) et prêt à ajouter ; « Favori » retiré : mise à jour du favori |
| Écriture en panne, « Ajouter » | « Enregistrement impossible pour l'instant. », journal inchangé |
| Heure de la page : 7 h, 20 h | Repas proposé : petit-déj, soir |
| Journal à 2 200 kcal, 100 g, 300 g, 90 g de lipides ; puis 3 000 kcal, 150 g, 400 g, 60 g | « Dans la cible » ×3, lipides « Dépassé de 8 g » ; puis « Dépassé de 671 kcal », « de 10 g », « de 82 g », lipides « Dans la cible » |
| Aucun aliment ni ligne | Feuille d'ajout : « + Aliment libre » d'office ; « Aucun favori. » ; « Aucun aliment récent. » |
| Sport : une ligne vide ; jogging à 9,5 km/h, 1 h | Une 2e ligne apparaît ; « 2 817 kcal aujourd'hui » ; anneau 350, Reste 2 467 kcal ; rien d'écrit dans la base |
| Sport : marche 30 h, puis 0,5 h ; rechargement ; jogging retiré | 30 h ignorées ; 2 922 kcal, trois lignes ; retenu après rechargement ; 2 222 kcal |
| Sélecteur : aujourd'hui (20 oct.), puis (‹) | Pas de jour suivant ni de rond « » » ; « Lundi 19 octobre » : journal vide, calories 0, Reste 2 117 kcal, (›) et « » » proposés ; banane ajoutée : ligne du 19 octobre ; « » » : retour au journal du 20 |
| Sport 1 h de jogging, puis 0,5 h de marche | Rangé dans la base : effacement du sport du 20 octobre puis la ligne (j95, 1 h) ; puis les deux sports ; relus après rechargement |
| Recherche « oeufs » | « Mes aliments » : « Œuf · 1 pièce · 140 kcal » ; recherche « riz » : « Riz cuit » au-dessus des produits |
| Séances du 20 octobre : Renfo « Gainage 30 min », Run « Footing 1 h 15 » | « Au calendrier : Gainage 30 min · Footing 1 h 15 Reprendre » ; « Reprendre » : musculation 0,5 h (comptée : 2 222 kcal), footing 1,25 h sans allure (non compté) ; seule la musculation est rangée |
| Accueil, Nutrition au menu | Deuxième bloc ; « 350 / 2 117 kcal » ; anneaux « 6 g · Reste 92 g », « 76 g · Reste 189 g », « 1 g · Reste 58 g », sur une ligne à 390 px ; « Détail → », lien de titre commun ; pas de débordement |
| Accueil, Nutrition hors du menu ; profil sans poids | Pas de bloc Nutrition ; « Complète ton profil sur la page Nutrition. » |
| Recherche « oe » en cours de frappe | « Mes aliments » : « Œuf · 1 pièce · 140 kcal », sans aucun appel |
| Recherche « yaourt » validée, relais en service | Un appel au relais ({ q: « yaourt » }), aucun à l'ancien moteur ; « Yaourt nature · Marque C · 53 kcal / 100 g » ; choisi : 125 g d'office ; « yaourt » refait : aucun nouvel appel |
| Relais : « yaourt na » (moteur : la marque « NA », un fromage « Na » ; puis, pour « yaourt », des yaourts) | Deux demandes au moteur (« yaourt na », puis « yaourt ») ; « Yaourt nature · Marque C », « Yaourt au lait entier nature · Marque E » ; pas de doublon, pas de yaourt à la fraise |
| Relais en service, frappe « yaourt fr » | Aucun appel avant la pause ; après une demi-seconde, un appel ({ q : « yaourt fr » }) ; le champ reste en place |
| Moteur de secours, « yaourt na » (réponse : « NA · Borges », « Yaourt nature · Marque F ») | Seul « Yaourt nature · Marque F » reste |
| Relais absent, ancien moteur saturé deux fois | Deux appels à l'ancien moteur, puis « Open Food Facts est saturé, réessaie dans un instant. » |
| Page, profil A | « Calculé pour H · 70 kg · 175 cm · peu actif › » ; boutons « + Activité » et « + Repas » ; ni recherche ni sport sur la page ; pas de bouton « Modifier » |
| Case Repas | Feuille « Ajouter un aliment · Mardi 20 octobre » ; banane ajoutée : la feuille reste ouverte, sans message |
| Journal vide ; « + » du soir | Les quatre repas, chacun avec son « + » ; la feuille d'ajout s'ouvre |
| Feuille Activité : 1 h de jogging et 0,5 h de marche, puis la croix | « Activité · Mardi 20 octobre » ; case « 1 h · Jogging à 9,5 km/h (6 min/km) ; 30 min · Marche » ; rien n'est réécrit à la fermeture quand rien n'a changé |
| Journal : toucher « Banane », Supprimer | Question « Supprimer cette ligne ? », rien d'écrit avant la réponse ; « Supprimer » : la ligne effacée, la fenêtre fermée ; aucun rond au bout des lignes |
| Toucher « Riz cuit · 200 g » (midi) | Fenêtre de séance du Calendrier « Riz cuit », 200, Midi en liste ; Annuler : rien d'écrit ; 100 g au soir puis Enregistrer : la ligne à 1 portion, 130 kcal, 2,7 g, 28 g, 0,3 g, au soir |
| Activités du jour : jogging 1 h, marche 0,5 h ; toucher la marche, Supprimer | 2 922 kcal ; « Supprimer cette activité ? » ; 2 817 kcal, la ligne du jogging seule, rangée dans la base |
| Journal vide | Petit-déj, Midi, Encas, Soir, Activité, chacun avec son « + » |
| Séances du 20 oct. : footing 10 km en 1 h, gainage 30 min, une proposition de l'IA | 2 959 kcal ; journal « Footing · Course à pied · 1 h · 10 km », « Gainage · Renforcement · 30 min » ; pas la proposition |
| Feuille Activité, « Ajouter une séance » : Fractionné, 40 min, 8 km | Fenêtre « Ajouter une séance » du Calendrier, au 20 octobre, Course à pied ; séance rangée ; 3 539 kcal |
| Toucher le gainage dans le journal, Supprimer | « Modifier la séance » du Calendrier ; question du site ; séance supprimée du Calendrier |
| La veille : séance non faite ; puis cochée « faite » | 2 117 kcal, « non faite » ; cochée : rangée dans le Calendrier, 2 854 kcal |
| Le 18 oct. : séance faite, facile, 45 min, sans distance ; sans VMA ; VMA 15 | 2 645 kcal (9,5 km/h) ; 2 657 kcal (65 % de 15 km/h) |
| Autres sports | Ni course ni renforcement dans la liste ; vélo 1 h : 2 607 kcal ; vélo et marche 0,5 h : 2 712 kcal |
| Téléphone (375 et 390 px) | Pas de défilement horizontal ; le bouton « Ajouter » reste visible |
