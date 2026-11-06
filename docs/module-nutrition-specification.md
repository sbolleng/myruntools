# Nutrition · spécification fonctionnelle

Version 0.6 · 6 novembre 2026 · [Retour au sommaire](README.md) · Calories et macros du jour, calculatrice du besoin, saisie rapide sur téléphone

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

Quatre cartes, dans le cadre des blocs d'« En un coup d'œil » ([design](design.md), § 1). Page épurée : pas de texte d'explication. Retenu le 6 nov. 2026, d'après la carte « Mon besoin du jour » et les anneaux d'une première version de l'outil.

### 4.1 Téléphone

```
┌ MON BESOIN DU JOUR ─────────────────── (20) [Modifier] ┐
│ (21) Homme · 40 ans · 70 kg · 175 cm · Peu actif        │
│ (22) Phase · Développement                              │
│ (23) SPORT DU JOUR                                      │
│ (24) [ Jogging à 9,5 km/h     ▾ ] [ 1   ] h            │
│ (24) [ Sport…                 ▾ ] [     ] h            │
│ ─────────────────────────────────────────────────────── │
│ (5)  2 817  kcal aujourd'hui                            │
└─────────────────────────────────────────────────────────┘
┌ (25) MARDI 20 OCTOBRE ──────────────────────────────────┐
│      (26) CALORIES               PROTÉINES              │
│      (27)   ◯ 350                  ◯ 6 g                │
│      (28) Reste 1 767 kcal       Reste 92 g             │
│      (29) Besoin 2 817 kcal      Besoin 98–140 g        │
│           GLUCIDES               LIPIDES  (idem)        │
└─────────────────────────────────────────────────────────┘
┌ AJOUTER UN ALIMENT ─────────────────────────────────────┐
│ (30) [ Rechercher un aliment…        ] [Chercher]       │
│ (31) Riz basmati · Marque A          350 kcal / 100 g   │
│ (14) [Favoris] [Récents] [+ Aliment libre]              │
│      Banane · 1 pièce                          90 kcal  │
│ (15) Riz cuit   (−) [ 190 ] g (+)          ☆ Favori     │
│      [Petit-déj] [Midi] [Encas] [Soir]                  │
│ (16) [               Ajouter                ]           │
└─────────────────────────────────────────────────────────┘
┌ (17) JOURNAL DU JOUR ───────────────────────────────────┐
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
| 20 | Modifier le profil | « Modifier » | En haut à droite de la carte 1 | `mrt-btn` ; ouvre la fenêtre du profil (§ 4.5) |
| 21 | Profil, en lecture | « Homme · 40 ans · 70 kg · 175 cm · Peu actif » | Sous le titre | Texte courant |
| 22 | Phase | « Phase · Développement » | Sous le 21 | Texte discret |
| 23 | Titre « Sport du jour » | « SPORT DU JOUR » | Sous le 22 | Libellé en capitales (Space Mono) |
| 24 | Ligne de sport | Sport (liste) et durée en heures | Sous le 23 | `mrt-champ` ; remplir la dernière ligne en fait apparaître une autre (cinq au plus) |
| 5 | Besoin du jour | « 2 817 kcal aujourd'hui » | Bas de la carte 1, sous un filet | Chiffre en Space Mono, Accent, 1,9 rem |
| 25 | Titre des jauges | « MARDI 20 OCTOBRE » | Haut de la carte 2 | Libellé en capitales |
| 26 | Nom de la jauge | « PROTÉINES » | Au-dessus de l'anneau | Libellé en capitales |
| 27 | Anneau | Valeur mangée au centre ; zone cible marquée | Centre de la jauge | Anneau Accent (rouge au-delà du maximum), zone en Accent à 30 % |
| 28 | Reste | « Reste 92 g », « Dans la cible », « Dépassé de 8 g » | Sous l'anneau | Texte (rouge si dépassé) |
| 29 | Besoin journalier | « Besoin 98–140 g » | Sous le 28 | Texte discret |
| 30 | Recherche | « Rechercher un aliment… » + « Chercher » | Haut de la carte 3 | `mrt-champ`, `mrt-btn` |
| 31 | Résultat | « Riz basmati · Marque A · 350 kcal / 100 g » | Sous le 30 | Comme une ligne d'aliment |
| 14 | Sources | Favoris, Récents, + Aliment libre | Sous les résultats | Pastilles |
| 15 | Quantité | « (−) 190 g (+) », « (−) 2 portions (+) » | Sous l'aliment choisi | `mrt-rond`, `mrt-champ` |
| 16 | Ajouter | « Ajouter » | Bas de la carte 3 | `mrt-btn is-principal`, toute la largeur |
| 17 | Journal du jour | « JOURNAL DU JOUR » | Carte 4 | Libellé en capitales |
| 18 | Ligne du journal | « Riz cuit · 200 g · 260 kcal (×) » | Carte 4, par repas | × : `mrt-rond is-fermer` |

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

- **Sport du jour** (24) : liste des sports (MET du § 3) et durée en heures (virgule acceptée, de plus de 0 à 24 h ; une durée hors de ces bornes est ignorée). Il est **retenu sur l'appareil**, un jour à la fois, sans rien écrire dans la base ; le besoin (5) et les jauges se recalculent à chaque saisie.
- **Jauges** (26 à 29) : sous le minimum, « Reste … » (jusqu'au minimum) ; entre le minimum et le maximum, « Dans la cible » ; au-delà, « Dépassé de … » et anneau rouge. La cible des macros est la fourchette du besoin du jour ; celle des calories va du besoin à 110 % du besoin (tolérance de conception, ajustable). L'anneau est plein à 115 % du maximum.
- **Recherche** (30, 31) : dans Open Food Facts, à la validation (touche Entrée ou « Chercher »), pas à chaque lettre (le service limite les recherches à une dizaine par minute) ; les produits les plus courants d'abord ; huit résultats au plus, sans les produits sans calories ni les doublons ; valeurs pour 100 g. « Recherche… », « Aucun résultat. », ou en cas de refus « Recherche indisponible pour l'instant, réessaie dans une minute. ». Source citée dans les crédits des mentions légales.
- **Produit choisi** : quantité en grammes, sa portion habituelle d'office (sinon 100 g) ; à « Ajouter », il devient un aliment de l'utilisateur (une seule fois, portion « 100 g ») et revient dans Récents ; « ☆ Favori » est rangé avec lui.
- **Quantité** (15) : en grammes pour un aliment donné pour 100 g (pas de 10 g, de 1 à 5 000 g), en portions pour les autres (pas de 0,5, de 0,1 à 50) ; le champ se saisit aussi au clavier. Hors bornes : message, rien n'est écrit.
- **Ajout rapide** (14 à 16) : Favoris, Récents (les 8 derniers aliments utilisés), « + Aliment libre » (nom, portion, calories obligatoires ; protéines, glucides, lipides à 0 si vides ; case Favori ; « Créer l'aliment »). Repas proposé d'après l'heure (avant 10 h petit-déj, avant 15 h midi, avant 18 h encas, sinon soir), changé en un toucher.
- **Journal** (17, 18) : un bloc par repas avec son total ; une ligne par aliment (« Riz cuit · 190 g », « Banane · 2 portions ») ; × supprime sans confirmation. Sans ligne : « Rien de noté. »
- **Écritures** : « Ajouter » range la ligne (valeurs figées) puis le dernier usage de l'aliment ; en cas d'échec : « Enregistrement impossible pour l'instant. », rien n'est ajouté.
- **Pas encore construit** : le sélecteur de jour (jours passés) ; Ciqual (aliments génériques, § 8).

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
| 6 | Recherche d'aliments : Open Food Facts (construit le 6 nov. 2026, crédits dans les mentions légales) ; Ciqual (ANSES, aliments génériques, import unique, licence ouverte) dès que le site de l'ANSES sort de maintenance ; code-barres plus tard |
| 7 | Historique par mois, bloc « Bilan nutrition » d'En un coup d'œil, repères glucides et eau par heure partagés avec la stratégie de course d'[Objectif](module-objectif-specification.md) |
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
| Téléphone (375 et 390 px) | Pas de défilement horizontal ; le bouton « Ajouter » reste visible |
