# Mes stats · spécification fonctionnelle

Version 0.3 · 21 novembre 2026 · [Retour au sommaire](README.md) · Axes des graphiques à `--t-libelle`, comme le reste du site

## 1. Rôle

Une page montre la progression du coureur, mois par mois, et une analyse écrite qui la commente. Elle se calcule à partir de trois sources :

- les **séances faites** (Calendrier, Mon plan), avec leur réalisé, ou leur prévu à défaut ;
- les **activités importées** de l'export Strava (§ 6), qui deviennent des séances ;
- **Mon profil** (VMA ou repère d'allure, FC max, FC de repos) et la **Saison** (courses au rôle Objectif).

Le renforcement n'entre pas dans les stats (pour l'instant). Aucun texte de la page ne cite un appareil, une application de montre ni la provenance d'un chiffre.

- Page **Mes stats** (`stats.html`, clé des préférences « Stats »), à cocher dans les Préférences, absente du menu par défaut.
- Site partagé en lecture seule : « Les stats ne sont pas partagées. »

## 2. Plan de page

**Ordinateur** (deux colonnes ; téléphone : une colonne, même ordre, (1) et (2) sur une ligne)

```
┌───────────────────────────────────────────────────────────┐
│ (1) Période : [12 mois ▾]                   (2) [Importer] │
├───────────────────────────────────────────────────────────┤
│ (3) ANALYSE · au 21 nov. 2026                [Actualiser]  │
│     Texte de l'IA, 1 500 caractères au plus                │
├────────────────────────────┬──────────────────────────────┤
│ (4) MEILLEURS TEMPS        │ (5) TEMPS ESTIMÉS            │
├────────────────────────────┼──────────────────────────────┤
│ (6) ALLURES D'ENTRAÎNEMENT │ (7) PROGRESSION              │
├────────────────────────────┼──────────────────────────────┤
│ (8) VOLUME MENSUEL         │ (9) D+ MENSUEL               │
├────────────────────────────┼──────────────────────────────┤
│ (10) ALLURE-EFFORT         │ (11) CADENCE                 │
├────────────────────────────┼──────────────────────────────┤
│ (12) EFFICIENCE CARDIAQUE  │ (13) ÉCART DE SPÉCIFICITÉ    │
├────────────────────────────┴──────────────────────────────┤
│ (14) ZONES CARDIAQUES                                      │
└───────────────────────────────────────────────────────────┘
Sous chaque graphique (8 à 13) : (18) une ligne d'aide fixe
```

| N° | Élément | Contenu | Style |
|---|---|---|---|
| 1 | Période | 12 mois (le mois en cours et les 11 précédents, par défaut), Année (civile en cours), Depuis le début ; retenue sur l'appareil | Champ commun |
| 2 | Importer | Ouvre la feuille d'import (§ 6) | Bouton commun |
| 3 | Analyse | Libellé « Analyse · au » + date ; texte de l'IA (§ 5) ; bouton « Actualiser » | Carte ; libellé `--t-libelle` ; texte `--t-texte` |
| 4 | Meilleurs temps | Distance, temps, allure, date, séance (libellé, km, D+) (§ 3.1) | Tableau |
| 5 | Temps estimés | 5 km, 10 km, semi-marathon, marathon : temps, allure ; une ligne d'aide dit la base du calcul (§ 3.2) | Tableau |
| 6 | Allures d'entraînement | Cinq plages : n°, type, allure (§ 3.3) | Tableau |
| 7 | Progression | Trois tuiles : volume total, D+ cumulé, cadence (écart) (§ 3.4) | Grand chiffre (1,5 rem), libellé `--t-libelle` |
| 8 | Volume mensuel | Barres, km par mois | Graphique |
| 9 | D+ mensuel | Barres, m par mois | Graphique |
| 10 | Allure-effort | Barres, min:s par km-effort ; barre plus haute = plus rapide ; droite de tendance | Graphique |
| 11 | Cadence | Courbe, pas/min ; repère horizontal à 170 | Graphique |
| 12 | Efficience cardiaque | Courbe, battements par km-effort | Graphique |
| 13 | Écart de spécificité | Courbe D+ par km, réel (Accent) et cible (trait discret, pointillé), une étiquette par Objectif (« Nom · 50 m/km ») ; masqué si aucun Objectif ne dépasse 10 m/km | Graphique |
| 14 | Zones cardiaques | Z1 à Z5, nom et plage en bpm (§ 3.5) | Tableau, pleine largeur |
| 18 | Aide | Une phrase fixe par graphique (§ 3.6) | Texte secondaire |

Graphiques : même dessin que le graphique de progression du Palmarès ([Palmarès](module-palmares-specification.md), § 12), SVG natif, axes à `--t-libelle` (comme les autres graphiques du site), un seul accent ; un point touché montre sa valeur. Un mois sans donnée n'a ni barre ni point.

Page vide (aucune séance faite) : « Aucune séance faite pour l'instant. Importe ton historique Strava ou note tes séances dans le Calendrier. », bouton « Importer ».

## 3. Calculs

**Séances comptées** : les séances de course faites de la période (type Course à pied), avec leur réalisé (durée, distance, D+, FC moyenne) ou, à défaut, leur prévu. Une séance importée porte en plus sa **pratique** (course, trail, tapis, marche, randonnée), sa cadence et ses meilleurs temps ; une séance saisie compte comme « course ».

- **Volume, D+, D+ par km** : toutes les pratiques.
- **Allure-effort, efficience cardiaque, cadence, meilleurs temps** : course, trail et tapis seulement (la marche fausserait l'allure).
- **km-effort, allure-effort** : définitions de la [spécification générale](specification-generale.md), § mesures communes. Une séance sans distance ou sans durée ne compte pas dans l'allure.

| Graphique | Valeur d'un mois |
|---|---|
| Volume | Somme des distances, km, une décimale |
| D+ | Somme des D+, m |
| Allure-effort | Somme des durées ÷ somme des km-effort, min:s par km-effort |
| Cadence | Moyenne des cadences pondérée par la durée, pas/min, arrondie à l'unité ; séances sans cadence ignorées |
| Efficience cardiaque | Somme des battements (FC moyenne × durée en min) ÷ somme des km-effort des mêmes séances, arrondie à l'unité ; séances sans FC ignorées ; plus bas = meilleur |
| Écart de spécificité | D+ du mois ÷ volume du mois, m/km, une décimale |

Tendance de l'allure-effort : droite des moindres carrés sur les mois de la période qui ont une valeur (trois au moins), en secondes par km-effort et par mois.

### 3.1 Meilleurs temps

Distances : 1 km, 5 km, 10 km, 15 km, 20 km, semi-marathon, 30 km, marathon. Pour chacune, le temps le plus court sur un tronçon continu de cette distance, dans les traces des séances importées de la période (course et trail ; pas le tapis, dont la distance n'est pas mesurée par le GPS). Une distance sans tronçon n'a pas de ligne. Les temps sont calculés à l'import (§ 6), les traces elles-mêmes ne sont pas gardées.

### 3.2 Temps estimés

- **Avec une course** : la dernière course **courue** du Palmarès sur route, de 5 km, 10 km, semi-marathon ou marathon, de moins de 12 mois, avec un temps. Formule de Riegel : T₂ = T₁ × (D₂ ÷ D₁)^1,06. Aide : « Estimés d'après : Semi en 1:56:05, 4 oct. 2026. »
- **Sinon, avec la VMA** de Mon profil : 5 km à 95 % de la VMA, 10 km à 90 %, semi à 85 %, marathon à 80 %. Aide : « Estimés d'après ta VMA (15,0 km/h). »
- Repère d'allure donné en temps (10 km ou semi) : il sert de course de référence.
- Ni course ni VMA : « Renseigne ta VMA dans Mon profil. », lien vers la feuille Mon profil.

Temps à la seconde, allure en min:s par km.

### 3.3 Allures d'entraînement

D'après la VMA de Mon profil (ou, à défaut, celle qu'on tire du repère d'allure : vitesse du 10 km ÷ 0,90, du semi ÷ 0,85).

| N° | Type | Plage |
|---|---|---|
| 1 | Endurance | moins de 75 % de la VMA |
| 2 | Marathon | 75 à 85 % |
| 3 | Seuil | 85 à 92 % |
| 4 | VMA | 95 à 105 % |
| 5 | Sprint | plus de 105 % |

Allures en min:s par km, à la seconde ; « plus lente que » pour la 1, « plus rapide que » pour la 5. Sans VMA ni repère : le même message qu'en § 3.2.

### 3.4 Progression

Trois tuiles sur la période : **Volume total** (km, arrondi à l'unité), **D+ cumulé** (m), **Cadence** : la cadence du dernier mois qui en a une, moins celle du premier (« +2 pas/min »). Une tuile sans donnée affiche « — ».

### 3.5 Zones cardiaques

Méthode de Karvonen, sur la réserve cardiaque (FC max − FC de repos de Mon profil) : Z1 Récupération 50 à 60 %, Z2 Endurance fondamentale 60 à 70 %, Z3 Tempo 70 à 80 %, Z4 Seuil 80 à 90 %, Z5 VMA 90 à 100 % ; borne = FC de repos + pourcentage × réserve, arrondie à l'unité. Sans FC max ou sans FC de repos : « Renseigne ta FC max et ta FC de repos dans Mon profil. », lien vers la feuille. La FC max et la FC de repos ne sont pas affichées sur la page.

### 3.6 Lignes d'aide (18)

| Graphique | Aide |
|---|---|
| Volume | « Distance courue chaque mois, toutes pratiques. » |
| D+ | « Dénivelé positif cumulé chaque mois. » |
| Allure-effort | « Barre plus haute = plus rapide. 100 m de D+ comptent comme 1 km à plat. » + tendance (« Tendance : −1,6 s par km-effort et par mois. ») |
| Cadence | « Pas par minute, moyenne du mois. La zone efficiente se situe autour de 170 à 180. » |
| Efficience cardiaque | « Battements de cœur pour 1 km-effort. La courbe descend = tu progresses. » |
| Écart de spécificité | « Mètres de D+ par km courus, comparés à ceux de tes Objectifs. » |

### 3.7 Cible de l'écart de spécificité

Pour chaque course au rôle Objectif à venir, la cible au mois de la course est son D+ par km (D+ ÷ distance). La cible monte en ligne droite, mois par mois, depuis la valeur réelle du premier mois de la période jusqu'au premier Objectif, puis d'un Objectif au suivant. Pas de cible après le dernier Objectif. Graphique masqué si aucun Objectif n'atteint 10 m/km (profil route).

## 4. Ce qui ne s'affiche pas

Ni FC de repos ni FC max (elles servent aux zones et restent dans Mon profil) ; ni renforcement ; ni nom d'appareil ni provenance des chiffres.

## 5. Analyse de l'IA

- Un seul bloc (3), en haut de la page, **1 500 caractères au plus** : un court paragraphe par graphique qui a quelque chose à dire (progression, recul, point faible), puis deux ou trois pistes d'amélioration. Tutoiement, phrases factuelles, chiffres tirés des données seulement ; ni appareil, ni provenance, ni renforcement ; vocabulaire du glossaire.
- Données envoyées : les valeurs mensuelles de la période, les meilleurs temps, les temps estimés, les allures, les zones, les Objectifs à venir (nom, date, distance, D+) et le niveau de Mon profil ; jamais le nom ni l'adresse.
- Refaite après chaque import, ou par « Actualiser » (au plus trois fois par jour : au-delà, le bouton est grisé, « Reviens demain. ») ; l'analyse est enregistrée et s'affiche telle quelle à la visite suivante, avec sa date.
- Réservée aux pilotes au début, comme les séances de l'IA (secret `PILOTES`) ; pour les autres, le bloc n'apparaît pas.
- Première visite avec des séances faites et sans analyse : une première analyse est demandée ; rien ne s'affiche avant la réponse, et une panne reste alors silencieuse.
- Par sécurité, une phrase qui citerait un appareil, une provenance ou le renforcement est retirée du texte affiché.
- Fonction Supabase `analyser-stats` (secret `ANTHROPIC_API_KEY`) ; panne : « Analyse impossible pour l'instant. », l'analyse précédente reste.
- Pendant le calcul : « Analyse en cours… » à la place du texte.

## 6. Import de l'export Strava

**Où** : bouton « Importer » de Mes stats, et section **Connexions** de Mon profil (ligne « Strava · dernier import le 20 oct. 2026 », ou « Jamais importé »). Les deux ouvrent la même feuille.

```
┌ (15) IMPORTER MES ACTIVITÉS ─────────────────────┐
│ Aide : sur strava.com, Paramètres › Mon compte ›   │
│ Télécharger ou supprimer votre compte › Demander   │
│ une archive ; Strava envoie un fichier ZIP.        │
│ [Choisir le fichier ZIP]                           │
│ (16) 6 activités : 4 nouvelles, 1 rattachée à une  │
│      séance du plan, 1 ignorée                     │
│                         [Annuler] (17) [Importer]  │
└───────────────────────────────────────────────────┘
```

| N° | Élément | Contenu |
|---|---|---|
| 15 | Feuille | Feuille commune, titre « Importer mes activités » ; aide en texte secondaire |
| 16 | Bilan | Après lecture du fichier, avant tout enregistrement : nombre d'activités, nouvelles, rattachées, déjà importées, ignorées ; barre d'avancement pendant la lecture |
| 17 | Importer | Enregistre ; puis « 4 séances ajoutées, 1 rattachée. », la feuille se ferme, la page se recalcule et l'analyse est refaite |

**Lecture**, dans le navigateur : le fichier ZIP n'est jamais envoyé ; seules les valeurs ci-dessous sont enregistrées.

- `activities.csv` : une ligne par activité (identifiant, date et heure, nom, pratique, temps de déplacement, distance, D+, FC moyenne et maximale, cadence moyenne, nom du fichier de trace). Les en-têtes sont lus en anglais ou en français.
- Les traces (`activities/`, FIT, GPX ou TCX, compressées ou non) : meilleurs temps (§ 3.1), et cadence quand la ligne n'en a pas.
- Une cadence lue sous 120 est celle d'une seule jambe : elle est doublée.
- **Pratiques** gardées : course, trail, tapis (course virtuelle), marche, randonnée ; toutes les autres (vélo, natation, renforcement…) sont **ignorées**.

**Doublons et rattachement**

- Une activité déjà importée (même identifiant) n'est pas reprise ; réimporter le même fichier ne change rien.
- Une activité qui tombe le même jour qu'une séance de course du plan **pas encore faite, ou faite sans réalisé**, la remplit : faite, réalisé (durée, distance, D+, FC) recopié. Plusieurs séances ce jour-là : celle dont la distance prévue est la plus proche.
- Une séance qui a déjà un réalisé saisi le garde (la saisie l'emporte) ; l'activité lui est seulement rattachée (cadence, meilleurs temps).
- Sinon, l'activité devient une **séance hors plan**, faite, de type Course à pied, au libellé du nom de l'activité (100 caractères au plus), avec son réalisé.

**Erreurs** : fichier qui n'est pas un ZIP, ou ZIP sans `activities.csv` : « Ce fichier n'est pas un export Strava. » ; panne d'enregistrement : « Import impossible pour l'instant. », rien n'est enregistré.

**À vérifier avant la construction** : sur une archive réelle d'un pilote (sans la verser au dépôt), les intitulés des colonnes et l'unité de la cadence.

## 7. Données

Évolution `045-mes-stats.sql` ([modèle de données](modele-donnees.md), § 5 ter) : tables **`activites`** et **`analyses_stats`**, valeur `import` pour l'origine d'une séance ; règles par ligne (chacun ne lit et n'écrit que ses lignes). Préférences : clé de menu « Stats ».

**À faire dans Supabase** : coller l'évolution 045 ; créer la fonction `analyser-stats` (`supabase/functions/analyser-stats/index.ts`), avec les secrets `ANTHROPIC_API_KEY` et `PILOTES` déjà en place.

## 8. Contrôles

Jeu d'essai : banc d'essai au mardi 20 octobre 2026, utilisateur fictif dédié, sans autre séance faite que celles-ci ; Mon profil : VMA 15 km/h, FC max 186, FC de repos 52 ; Palmarès : Semi de San Sebastián (4 oct. 2026, 1:56:05) ; un Objectif fictif à venir de 40 km et 2 000 m de D+ en avril 2027 (50 m/km) ; une séance du plan « Endurance », 10 km, le 15 octobre, pas faite ; une séance saisie faite le 18 octobre : 8,0 km, 45 min, 40 m de D+, FC 140.

Export fictif (`export-fictif.zip`, données fictives, traces à allure régulière) :

| Activité | Date | Pratique | Distance | Temps | D+ | FC moy. | Cadence lue |
|---|---|---|---|---|---|---|---|
| A1 | 15 août | Course | 10,0 km | 55:00 | 100 | 150 | 84 |
| A2 | 12 sept. | Trail | 20,0 km | 2:10:00 | 600 | 145 | 82 |
| A3 | 20 sept. | Tapis | 8,0 km | 40:00 | 0 | 148 | 86 |
| A4 | 3 oct. | Vélo | 40,0 km | 1:20:00 | 200 | 130 | — |
| A5 | 10 oct. | Randonnée | 12,0 km | 2:30:00 | 800 | 120 | — |
| A6 | 15 oct. | Course | 12,0 km | 1:00:00 | 60 | 152 | 85 |

Résultats attendus :

- **Import** : bilan « 6 activités : 4 nouvelles, 1 rattachée à une séance du plan, 1 ignorée » ; après « Importer » : « 4 séances ajoutées, 1 rattachée. » ; la séance du 15 octobre est faite, réalisé 12,0 km, 1:00:00, 60 m, FC 152 ; cadences enregistrées 168, 164, 172, 170. Second import du même fichier : « 6 activités : 0 nouvelle, 5 déjà importées, 1 ignorée », « Importer » grisé, rien d'écrit. Un fichier texte : « Ce fichier n'est pas un export Strava. »
- **Rattachement sans écraser** : avec un réalisé saisi (11,0 km) sur la séance du 15 octobre avant l'import, il reste à 11,0 km ; la cadence 170 lui est rattachée.
- **Volume** : août 10,0 ; sept. 28,0 ; oct. 32,0 km. **D+** : 100 ; 600 ; 900 m (le vélo n'y est pas).
- **Allure-effort** : août 5:00 ; sept. 5:00 ; oct. 5:00 /km-effort (la randonnée n'y entre pas).
- **Cadence** : août 168 ; sept. 166 ; oct. 170. **Efficience cardiaque** : août 750 ; sept. 729 ; oct. 734.
- **Écart de spécificité** : réel août 10,0 ; sept. 21,4 ; oct. 28,1 m/km ; cible sept. 15,0 ; oct. 20,0 ; nov. 25,0 … avril 2027 50,0 ; étiquette « · 50 m/km » ; sans cet Objectif, graphique masqué.
- **Progression** : 70 km ; 1 600 m ; +2 pas/min.
- **Meilleurs temps** : 1 km 5:00, 5 km 25:00, 10 km 50:00 (15 oct.) ; 15 km 1:37:30, 20 km 2:10:00 (12 sept.) ; pas de ligne pour le semi, le 30 km ni le marathon ; le tapis n'y est pas.
- **Temps estimés**, d'après le semi : 5 km 25:14 (5:03/km), 10 km 52:37 (5:16/km), semi 1:56:05 (5:30/km), marathon 4:02:02 (5:44/km). Sans le semi au Palmarès, d'après la VMA : 21:03, 44:27, 1:39:17, 3:30:59.
- **Allures** : 1 plus lente que 5:20 ; 2 de 5:20 à 4:42 ; 3 de 4:42 à 4:21 ; 4 de 4:13 à 3:49 ; 5 plus rapide que 3:49.
- **Zones** : Z1 119–132, Z2 132–146, Z3 146–159, Z4 159–173, Z5 173–186 bpm ; sans FC de repos : le message et le lien vers Mon profil.
- **Analyse** (réponse simulée) : au plus 1 500 caractères ; un texte de 1 600 est coupé à la dernière phrase entière ; aucun des mots « Huawei », « Garmin », « Strava », « montre », « renforcement » dans le texte affiché ; quatrième « Actualiser » du jour grisé ; panne : « Analyse impossible pour l'instant. », l'analyse précédente reste ; utilisateur non pilote : pas de bloc.
- **Période** : « Année » donne les mêmes mois (tous en 2026) ; « Depuis le début » commence en août.
- **Divers** : page absente du menu par défaut, présente une fois cochée ; site partagé : « Les stats ne sont pas partagées. » ; page vide : le message et le bouton « Importer » ; téléphone sans débordement ; contrôle « vocabulaire » sans écart.
