# Nutrition · spécification fonctionnelle

Version 0.8 · 8 novembre 2026 · [Retour au sommaire](README.md) · Calories et macros du jour, calculatrice du besoin, saisie rapide sur téléphone

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

Trois cartes : le besoin du jour (jour, besoin, jauges et sport réunis, retenu le 6 nov. 2026), l'ajout d'un aliment, le journal.

```
┌ Mon besoin du jour ──────────────────── (20) [Modifier] ┐
│ (32) (‹)  Vendredi 6 novembre  (›)   (33) Aujourd'hui   │
│ (5)  2 817  kcal                     ← comme un titre   │
│ (21) Homme · 40 ans · 70 kg · 175 cm · Peu actif        │
│ (22) Phase · Développement                              │
│ ─────────────────────────────────────────────────────── │
│      (26) CALORIES               PROTÉINES              │
│      (27)   ◯ 350                  ◯ 6 g                │
│      (28) Reste 2 467 kcal       Reste 92 g             │
│      (29) Besoin 2 817 kcal      Besoin 98–140 g        │
│           GLUCIDES               LIPIDES  (idem)        │
│ ─────────────────────────────────────────────────────── │
│ (23) SPORT DU JOUR                                      │
│ (34) Au calendrier : Gainage 30 min · Footing 1 h 15  Reprendre
│ (24) [ Jogging à 9,5 km/h     ▾ ] [ 1   ] h            │
│ (24) [ Sport…                 ▾ ] [     ] h            │
└─────────────────────────────────────────────────────────┘
┌ Ajouter un aliment ─────────────────────────────────────┐
│ (30) [ Rechercher un aliment…        ] [Chercher]       │
│ (35) MES ALIMENTS · Œuf · 1 pièce             140 kcal  │
│ (31) PRODUITS · Riz basmati · Marque A  350 kcal / 100 g│
│ (14) [Favoris] [Récents] [+ Aliment libre]              │
│ (15) Riz cuit   (−) [ 190 ] g (+)          ☆ Favori     │
│      [Petit-déj] [Midi] [Encas] [Soir]                  │
│ (16) [               Ajouter                ]           │
└─────────────────────────────────────────────────────────┘
┌ (17) Journal du jour ───────────────────────────────────┐
│ (18) MIDI                                     260 KCAL  │
│      Riz cuit · 200 g                     260 kcal  (×) │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Ordinateur

Les mêmes cartes, l'une sous l'autre ; les quatre anneaux sur une ligne (deux par ligne sur téléphone).

### 4.3 Tableau des éléments

Numéros stables : 1 à 19 ceux de la première version (6 à 13 et 2 retirés), 20 et suivants ceux du 6 nov. 2026.

| N° | Nom | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 32 | Sélecteur de jour | « (‹) Vendredi 6 novembre (›) » | Sous le titre de la carte 1 | `mrt-rond` et flèches dessinées ; pas de jour après aujourd'hui |
| 33 | Retour à aujourd'hui | « Aujourd'hui » | À droite du 32, sur un autre jour seulement | `mrt-lien` |
| 34 | Séances du Calendrier | « Au calendrier : Gainage 30 min · Footing 1 h 15 · Reprendre » | Sous le 23, s'il y a des séances ce jour-là | Texte discret, `mrt-lien` |
| 35 | Mes aliments | Aliments de l'utilisateur qui répondent à la recherche | Au-dessus des produits (31) | Comme une ligne d'aliment ; sous-titres « Mes aliments » et « Produits » en libellé |
| 20 | Modifier le profil | « Modifier » | En haut à droite de la carte 1 | `mrt-btn` ; ouvre la fenêtre du profil (§ 4.5) |
| 21 | Profil, en lecture | « Homme · 40 ans · 70 kg · 175 cm · Peu actif » | Sous le titre | Texte courant |
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
| 14 | Sources | Favoris, Récents, + Aliment libre | Sous les résultats | Pastilles |
| 15 | Quantité | « (−) 190 g (+) », « (−) 2 portions (+) » | Sous l'aliment choisi | `mrt-rond`, `mrt-champ` |
| 16 | Ajouter | « Ajouter » | Bas de la carte 3 | `mrt-btn is-principal`, toute la largeur |
| 17 | Journal du jour | « Journal du jour » | Carte 4 | Titre de cadre commun |
| 18 | Ligne du journal | « Riz cuit · 200 g · 260 kcal (×) » | Carte 4, par repas | × : `mrt-rond is-fermer`, croix dessinée ; − et + de la quantité dessinés aussi |

### 4.4 Options

Ajout en deux touches (option A, retenue le 5 nov. 2026) : choisir un aliment, régler la quantité, « Ajouter ».

### 4.5 Profil : encart et fenêtre

Un seul formulaire, à deux endroits ; le module Profil complet viendra plus tard (todo du [sommaire](README.md)).

- **Encart du premier usage** : tant que le profil est incomplet, une carte « POUR CALCULER TON BESOIN » remplace la page, avec **seulement les champs qui manquent** (sexe en deux pastilles, naissance, poids et taille avec leur unité, activité hors sport en liste) et « Enregistrer ».
- **Fenêtre « Mon profil »** (bouton 20) : les cinq champs, « Annuler » à gauche et « Enregistrer » à droite, en haut, comme les autres fenêtres du site.
- **Contrôles** : poids de 20 à 300 kg (virgule acceptée, un chiffre après la virgule), taille de 100 à 250 cm, âge de 10 à 110 ans, sexe femme ou homme, niveau d'activité choisi. Un champ refusé : message sous le titre, rien n'est écrit. Seuls les champs affichés sont rangés ; en cas d'échec, « Enregistrement impossible pour l'instant. », la fenêtre reste ouverte.
- **Site partagé en lecture seule** : la page n'affiche aucune donnée de nutrition.
- **Menu** : Nutrition se coche dans les Préférences (six onglets ne tiennent pas sur un téléphone de 375 px) ; l'évolution 020 l'ajoute aux menus déjà rangés.

### 4.6 Règles

- **Jour** (32, 33) : la page s'ouvre sur aujourd'hui ; (‹) et (›) changent de jour, jamais au-delà d'aujourd'hui. Le besoin (âge, phase, sport de ce jour), les jauges, le journal et le sport suivent le jour choisi ; un aliment ajouté va dans ce jour (repas oublié).
- **Sport du jour** (24) : liste des sports (MET du § 3) et durée en heures (virgule acceptée, de plus de 0 à 24 h ; une durée hors de ces bornes est ignorée). Il est **rangé dans la base** (`sport_jour`), jour par jour, peu après la dernière frappe ou au changement de jour ; le besoin (5) et les jauges se recalculent à chaque saisie. En cas d'échec : « Enregistrement impossible pour l'instant. » sous le sport.
- **Séances du Calendrier** (34) : les séances du jour sont rappelées ; « Reprendre » en fait des lignes de sport : Renfo devient Musculation, un Run laisse l'allure à choisir ; la durée vient du libellé quand il la donne clairement (« 30 min », « 1 h 15 », « 1h »), sinon elle reste à saisir. Seules les lignes complètes comptent.
- **Jauges** (26 à 29) : sous le minimum, « Reste … » (jusqu'au minimum) ; entre le minimum et le maximum, « Dans la cible » ; au-delà, « Dépassé de … » et anneau rouge. La cible des macros est la fourchette du besoin du jour ; celle des calories va du besoin à 110 % du besoin (tolérance de conception, ajustable). L'anneau est plein à 115 % du maximum.
- **Recherche** (30, 31, 35) : **pendant la frappe**, les aliments de l'utilisateur seulement, sans réseau (« Mes aliments », six au plus : chaque mot de la recherche commence un mot du nom, sans accent ni pluriel, « oeufs au plat » trouve « Œuf au plat ») ; **à la validation** (touche Entrée ou « Chercher »), les produits d'Open Food Facts, huit au plus, sans produit sans calories ni doublon, valeurs pour 100 g. Les produits passent par un **relais Supabase** (fonction `recherche-aliments`, `supabase/functions/`) : le téléphone ne peut pas interroger directement le moteur de recherche d'Open Food Facts, et l'ancien moteur est souvent saturé ; le relais interroge le nouveau moteur, puis l'ancien en cas d'échec. Si le relais ne répond pas (pas encore créé), la page interroge l'ancien moteur elle-même, avec un nouvel essai. Une recherche déjà faite est gardée pendant la visite (aucun nouvel appel). « Recherche… », « Aucun résultat. », ou « Open Food Facts est saturé, réessaie dans un instant. ». Source citée dans les crédits des mentions légales. Limite : Open Food Facts ne connaît que des produits du commerce (« oeufs au plat » ramène des bonbons) ; les plats simples viendront de Ciqual.
- **Produit choisi** : quantité en grammes, sa portion habituelle d'office (sinon 100 g) ; à « Ajouter », il devient un aliment de l'utilisateur (une seule fois, portion « 100 g ») et revient dans Récents ; « ☆ Favori » est rangé avec lui.
- **Quantité** (15) : en grammes pour un aliment donné pour 100 g (pas de 10 g, de 1 à 5 000 g), en portions pour les autres (pas de 0,5, de 0,1 à 50) ; le champ se saisit aussi au clavier. Hors bornes : message, rien n'est écrit.
- **Ajout rapide** (14 à 16) : Favoris, Récents (les 8 derniers aliments utilisés), « + Aliment libre » (nom, portion, calories obligatoires ; protéines, glucides, lipides à 0 si vides ; case Favori ; « Créer l'aliment »). Repas proposé d'après l'heure (avant 10 h petit-déj, avant 15 h midi, avant 18 h encas, sinon soir), changé en un toucher.
- **Journal** (17, 18) : un bloc par repas avec son total ; une ligne par aliment (« Riz cuit · 190 g », « Banane · 2 portions ») ; × supprime sans confirmation. Sans ligne : « Rien de noté. »
- **Écritures** : « Ajouter » range la ligne (valeurs figées) puis le dernier usage de l'aliment ; en cas d'échec : « Enregistrement impossible pour l'instant. », rien n'est ajouté.
- **Pas encore construit** : Ciqual (aliments génériques, § 8) ; Open Food Facts ne connaît que des produits de marque.

### 4.7 Bloc Nutrition d'En un coup d'œil

```
┌ Nutrition                                   Détail → ┐
│ (40) 350 / 2 117 kcal                               │
│      ▓▓▓▓░░░░░░░░░░░░                               │
│ (41) [★ Banane] [Riz cuit · 200 g]                  │
│ (42) Riz cuit ajouté · midi · Annuler               │
└─────────────────────────────────────────────────────┘
```

| N° | Élément | Règle |
| --- | --- | --- |
| 40 | Bilan du jour | Calories mangées / besoin du jour (sport du jour compris), avec une barre (rouge au-delà de 110 % du besoin). |
| 41 | Pastilles | Les favoris (★), puis les récents, six au plus, avec la dernière quantité utilisée (« Riz cuit · 200 g »). Une touche ajoute l'aliment au repas du moment, avec cette quantité. |
| 42 | Annonce | « … ajouté · midi · Annuler » pendant 6 s ; « Annuler » retire la ligne (« … retiré »). |

- Le bloc n'apparaît que si le module Nutrition est dans le menu de l'utilisateur ; il se range et se décoche dans les Préférences comme les autres blocs.
- Profil incomplet : « Complète ton profil sur la page Nutrition. » ; site partagé : « Les données de nutrition ne sont pas partagées. » ; ni favori ni récent : « Tes favoris et tes récents apparaîtront ici. »

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
| Récents, Favoris | Récents : « Banane · 1 pièce · 90 kcal », « Riz cuit · 130 kcal / 100 g » (sans l'œuf jamais utilisé) ; Favoris : banane |
| Banane, quantité portée à 2 (+, +, −, +), ajoutée à 10 h | Repas proposé : midi ; une ligne figée (180 kcal, 2 g, 40 g, 0,6 g) puis la mise à jour du dernier usage ; calories 530, Reste 1 587 kcal ; midi 440 kcal ; × la supprime |
| Riz cuit : 100 g d'office ; 0 g ; 200 g puis « − » | « La quantité doit être comprise entre 1 et 5 000 g. », rien d'écrit ; 190 g : ligne de 1,9 fois les valeurs (247 kcal, 5,1 g, 53,2 g, 0,6 g), « Riz cuit · 190 g » |
| Recherche « riz » (réponse : riz basmati Marque A à 350 kcal, un produit sans calories, une compote à 300 kJ) | Deux résultats : « Riz basmati · Marque A · 350 kcal / 100 g », « Compote · 72 kcal / 100 g » ; demande triée par popularité |
| Riz basmati choisi (portion habituelle 60 g), Favori, Ajouter | 60 g d'office ; rien d'écrit au Favori ; puis l'aliment créé (portion 100 g, favori), la ligne (0,6 portion : 210 kcal) et le dernier usage ; il revient en tête des Récents |
| Recherche sans résultat ; recherche refusée | « Aucun résultat. » ; « Recherche indisponible pour l'instant, réessaie dans une minute. » |
| Aliment libre sans nom, puis sans calories | « Écris le nom de l'aliment. », puis « Indique les calories pour une portion. » ; la saisie reste ; rien d'écrit |
| Aliment libre « Pain », 1 tranche, 80 kcal, 3,5 g, 15 g, favori | Aliment créé (lipides 0) et prêt à ajouter ; « Favori » retiré : mise à jour du favori |
| Écriture en panne, « Ajouter » | « Enregistrement impossible pour l'instant. », journal inchangé |
| Heure de la page : 7 h, 20 h | Repas proposé : petit-déj, soir |
| Journal à 2 200 kcal, 100 g, 300 g, 90 g de lipides ; puis 3 000 kcal, 150 g, 400 g, 60 g | « Dans la cible » ×3, lipides « Dépassé de 8 g » ; puis « Dépassé de 671 kcal », « de 10 g », « de 82 g », lipides « Dans la cible » |
| Aucun aliment ni ligne | « + Aliment libre » d'office ; « Rien de noté. » ; « Aucun favori. » ; « Aucun aliment récent. » |
| Sport : une ligne vide ; jogging à 9,5 km/h, 1 h | Une 2e ligne apparaît ; « 2 817 kcal aujourd'hui » ; anneau 350, Reste 2 467 kcal ; rien d'écrit dans la base |
| Sport : marche 30 h, puis 0,5 h ; rechargement ; jogging retiré | 30 h ignorées ; 2 922 kcal, trois lignes ; retenu après rechargement ; 2 222 kcal |
| Sélecteur : aujourd'hui (20 oct.), puis (‹) | Pas de jour suivant ni de lien « Aujourd'hui » ; « Lundi 19 octobre » : journal vide, calories 0, Reste 2 117 kcal, (›) et « Aujourd'hui » proposés ; banane ajoutée : ligne du 19 octobre ; « Aujourd'hui » : retour au journal du 20 |
| Sport 1 h de jogging, puis 0,5 h de marche | Rangé dans la base : effacement du sport du 20 octobre puis la ligne (j95, 1 h) ; puis les deux sports ; relus après rechargement |
| Recherche « oeufs » | « Mes aliments » : « Œuf · 1 pièce · 140 kcal » ; recherche « riz » : « Riz cuit » au-dessus des produits |
| Séances du 20 octobre : Renfo « Gainage 30 min », Run « Footing 1 h 15 » | « Au calendrier : Gainage 30 min · Footing 1 h 15 Reprendre » ; « Reprendre » : musculation 0,5 h (comptée : 2 222 kcal), footing 1,25 h sans allure (non compté) ; seule la musculation est rangée |
| Accueil, Nutrition au menu | Bloc « 350 / 2 117 kcal », pastilles « ★ Banane », « Riz cuit · 200 g » ; une touche sur le riz : ligne du 20 octobre au midi (2 portions, 260 kcal), « Riz cuit ajouté · midi · Annuler », 610 kcal ; « Annuler » : ligne effacée, 350 kcal ; l'annonce s'efface après 6 s |
| Accueil, Nutrition hors du menu ; profil sans poids | Pas de bloc Nutrition ; « Complète ton profil sur la page Nutrition. » |
| Recherche « oe » en cours de frappe | « Mes aliments » : « Œuf · 1 pièce · 140 kcal », sans aucun appel |
| Recherche « yaourt » validée, relais en service | Un appel au relais ({ q: « yaourt » }), aucun à l'ancien moteur ; « Yaourt nature · Marque C · 53 kcal / 100 g » ; choisi : 125 g d'office ; « yaourt » refait : aucun nouvel appel |
| Relais absent, ancien moteur saturé deux fois | Deux appels à l'ancien moteur, puis « Open Food Facts est saturé, réessaie dans un instant. » |
| Téléphone (375 et 390 px) | Pas de défilement horizontal ; le bouton « Ajouter » reste visible |
