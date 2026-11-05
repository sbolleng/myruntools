# Nutrition · spécification fonctionnelle

Version 0.3 · 5 novembre 2026 · [Retour au sommaire](README.md) · Calories et macros du jour, calculatrice du besoin, saisie rapide sur téléphone

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

- **La phase se déduit seule** de la date de la course cap (ou de la course confirmée la plus proche) ; elle peut être changée à la main pour la journée.
- **Le sport du jour est saisi à la main** (type de sport et durée) ; sans saisie, c'est un jour de repos. Les séances du Calendrier n'ont pas encore de durée : quand elles en auront une (import des séances, todo du [sommaire](README.md)), elles rempliront le sport du jour d'elles-mêmes. Les MET par type de sport sont repris de la calculette d'origine (jogging 8 km/h : 8 ; 9,5 km/h : 10 ; 13 km/h : 13,5 ; marche : 3 ; musculation : 3 ; vélo : 5 à 10 ; natation : 6 à 9, etc.).
- **Chevauchement** : la veille de course (J-1) l'emporte sur le carbo-loading (J-3 à J-1) ; la phase affichée est « Veille de course ».
- **Profil incomplet** : pas de calcul, l'encart du § 2 s'affiche. Le coefficient du métabolisme de base n'existe que pour « femme » et « homme » : un sexe « non précisé » compte comme manquant, et l'encart demande de choisir l'un des deux pour le calcul.
- Les valeurs sont des **repères**, pas un avis médical (mention affichée sous le résultat).

## 4. Plan de page

### 4.1 Téléphone (page principale, usage de tous les jours)

```
(1) Nutrition                                   (2) ⚙ profil
(3) ‹  Aujourd'hui · jeu. 5 nov.  ›

(4) BESOIN DU JOUR
    (5) 2 450 kcal      (6) Entraînement · J-12
    (7) Sport : 1 h de jogging      [modifier]

(8) JAUGES                       mangé / besoin
    Calories   (9) ████████░░░░  1 630 / 2 450
    Protéines  (10) ██████░░░░░░    62 / 98–140 g
    Glucides   (11) ███████░░░░░   190 / 306–367 g
    Lipides    (12) █████░░░░░░░    48 / 68–95 g

(13) AJOUT RAPIDE
    (14) [Favoris ▾]  [Récents ▾]  [+ Aliment libre]
    (15) Banane · 1 pièce            [ − ] 1 [ + ]   (16) [Ajouter]

(17) AUJOURD'HUI
    (18) Petit-déj   Flocons d'avoine · 60 g          212 kcal   ✕
    (18) Midi        Riz · 200 g                       260 kcal   ✕
    ...
(19) Menu de la page
```

### 4.2 Ordinateur

Même contenu sur deux colonnes : à gauche (4) à (12), à droite (13) à (18) ; le calendrier des jours passés (3) reste en haut.

### 4.3 Tableau des éléments

| N° | Nom | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 1 | Titre de la page | « Nutrition » | En haut à gauche | Titre commun du site ([design](design.md)) |
| 2 | Lien profil | « ⚙ profil » | En haut à droite | `mrt-lien` |
| 3 | Sélecteur de jour | « ‹ Aujourd'hui · jeu. 5 nov. › » | Sous le titre | Pastille commune ; les flèches changent de jour |
| 4 | Bloc besoin du jour | « BESOIN DU JOUR » | Premier cadre | `mrt-section`, libellé en capitales |
| 5 | Besoin en kcal | « 2 450 kcal » | Cadre 4, grand | Chiffre en Accent |
| 6 | Phase du jour | « Entraînement · J-12 » | À droite du 5 | Petit texte ; touchable pour changer |
| 7 | Sport du jour | « 1 h de jogging » | Sous le 5 | Texte courant + lien « modifier » |
| 8 | Bloc jauges | « JAUGES » | Deuxième cadre | `mrt-section` |
| 9 | Jauge calories | « 1 630 / 2 450 » | Cadre 8, première ligne | Barre en Accent |
| 10 | Jauge protéines | « 62 / 98–140 g » | Cadre 8 | Barre ; zone cible marquée |
| 11 | Jauge glucides | « 190 / 306–367 g » | Cadre 8 | Idem |
| 12 | Jauge lipides | « 48 / 68–95 g » | Cadre 8 | Idem |
| 13 | Bloc ajout rapide | « AJOUT RAPIDE » | Troisième cadre | `mrt-section` |
| 14 | Sources | Favoris, Récents, Aliment libre | Haut du cadre 13 | Trois pastilles |
| 15 | Quantité | « Banane · 1 pièce  − 1 + » | Cadre 13 | Boutons ronds `mrt-rond` |
| 16 | Ajouter | « Ajouter » | À droite du 15 | `mrt-btn is-principal` |
| 17 | Bloc journal du jour | « AUJOURD'HUI » | Dernier cadre | `mrt-section` |
| 18 | Ligne de repas | « Midi · Riz · 200 g · 260 kcal ✕ » | Cadre 17 | Une ligne par aliment, groupées par repas ; ✕ supprime |
| 19 | Menu de la page | — | Bas ou haut, comme les autres pages | Commun |

Une jauge est **verte-neutre sous le minimum, pleine dans la zone cible, et passe en alerte au-delà du maximum** (couleurs du thème, pas de couleur nouvelle).

### 4.4 Options à trancher

| Proposition | Rendu | Ce qu'on y gagne |
| --- | --- | --- |
| **A. Ajout en deux touches** (retenue le 5 nov. 2026) | Choisir un favori ou un récent, régler la quantité avec − et +, « Ajouter » | Aucune frappe au clavier pour les aliments habituels |
| B. Ajout en une touche | Un favori ajoute directement sa portion habituelle | Plus rapide, mais on corrige plus souvent après coup |
| C. Saisie libre d'abord | Un champ « quoi ? / combien de kcal ? » | Utile au premier jour, lourd à l'usage |

**Choix du repas** (petit-déj, midi, encas, soir) : proposé d'après l'heure, modifiable en un toucher.

## 5. Aliments : favoris, récents, saisie libre

- Un aliment : nom, portion habituelle (« 1 pièce », « 100 g »), calories, protéines, glucides, lipides **pour cette portion**.
- **Favoris** : épinglés par l'utilisateur ; **Récents** : les derniers utilisés, sans doublon.
- **Aliment libre** : nom + calories et macros saisis à la main ; peut être épinglé en favori.
- Rien n'est préchargé dans cette version : pas de donnée inventée, l'utilisateur crée ses aliments (la recherche dans une base viendra au lot 6).

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
| 5 | Page Nutrition : besoin, jauges, ajout rapide, journal du jour |
| 6 | Recherche d'aliments : Ciqual (ANSES, import unique), puis Open Food Facts (à la demande, attribution dans les crédits), puis code-barres |
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
| Course cap dans 12 jours | Phase « Avant-course » ; dans 2 jours : « Carbo-loading » ; la veille : « Veille de course » |
| Ajouter « Banane » (1 pièce) au midi | Une ligne au midi ; les jauges montent des valeurs de la banane |
| Supprimer la ligne (✕) | La ligne disparaît ; les jauges reviennent à l'état d'avant |
| Modifier l'aliment « Banane » après coup | Les jours passés gardent leurs valeurs d'origine |
| Site partagé en lecture seule | Aucune donnée de nutrition visible |
| Jour passé (flèche ‹) | Le journal du jour choisi ; le besoin recalculé avec le profil et les séances de ce jour |
| Téléphone (375 et 390 px) | Pas de défilement horizontal ; le bouton « Ajouter » reste visible |
