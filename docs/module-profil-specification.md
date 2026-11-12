# Mon profil · spécification fonctionnelle

Version 0.1 · 12 novembre 2026 · [Retour au sommaire](README.md)

## 1. Rôle

Une seule page rassemble tout ce qui décrit le coureur : ses mesures, son niveau, sa semaine type, sa santé. Chaque donnée se saisit **à un seul endroit** et sert à tous les modules : le besoin du jour (Nutrition), les séances proposées par l'IA (Mon plan), les vitesses des séances.

- La page **Mon profil** (`profil.html`) est au menu par défaut (sixième onglet, après Palmarès ; clé des préférences « Profil »).
- La **feuille Mon profil** reprend la même liste, au-dessus d'une autre page : le bouton « Mon profil » de Mon plan et le lien « Calculé pour … » de Nutrition l'ouvrent, pour compléter sans changer de page.
- L'encart du premier usage de Nutrition (les seules mesures qui manquent au calcul) reste : il range les mêmes données.
- **Hors périmètre** (lot de l'adaptation, avec la mention RGPD) : blessure en cours, ressenti, douleur, fatigue. Connexions (Strava, import d'un fichier) : avec l'import ; pas de section vide d'ici là.

## 2. Plan de page

Jeu d'essai, au 20 octobre 2026 (§ 5).

```
(1) Mon profil                                     (titre invisible)
(2) Profil à compléter : date de naissance, poids, …
(3) MOI                                              (4) 1 sur 5
    │ Sexe                               Homme    › │
    │ Date de naissance            À renseigner   › │
    │ Poids · Taille · Activité hors sport · Pointure │
(5) MON NIVEAU                                       0 sur 4
    │ Je cours depuis · Distance par semaine · Plus longue sortie récente │
    │ Repère d'allure                 À renseigner › │
    │ (6) ┆ Dans ton Palmarès : Semi en 1:56:05 · Semi de San Sebastián, dim. 4 oct. 2026  [Reprendre] ┆
    │ Durée maximale d'une séance · Terrains d'entraînement · Niveau en renforcement │
(7) MA SEMAINE                                       0 sur 1
    │ Course          mar., jeu., sam. · 3 séances, longue le samedi › │
    │ Renforcement                         mar., jeu. · 1 séance     › │
(8) SANTÉ
    │ FC max · FC de repos · Points fragiles │
```

| N° | Élément | Contenu |
|---|---|---|
| 1 | Titre | « Mon profil », invisible (lecteurs d'écran) |
| 2 | État | « Profil à compléter : … » (les questions obligatoires qui manquent, dans l'ordre de la page) ou « Profil complet. » |
| 3, 5, 7, 8 | Sections | Moi, Mon niveau, Ma semaine, Santé : une ligne par question (question à gauche, réponse à droite, « À renseigner » pour une obligatoire vide, « — » pour une facultative) |
| 4 | Compte | Les obligatoires remplies de la section, « 1 sur 5 » ; Santé n'en a pas |
| 6 | Repère du Palmarès | La dernière course **courue** sur 10 km ou semi-marathon (route), de moins de 12 mois, avec un temps (pas d'abandon) ; affiché tant qu'il diffère du repère d'allure saisi ; « Reprendre » en fait le repère d'allure |

Une ligne touchée ouvre sa question dans la feuille commune : sur la page, la question seule (croix, sans « ‹ »), fermée à l'enregistrement ; dans la feuille Mon profil, la liste puis la question (« ‹ » revient à la liste). Un choix s'enregistre au toucher ; un champ, par « Enregistrer » ; Ma semaine, par « Enregistrer » en haut (« Annuler » à gauche).

Site partagé en lecture seule : « Le profil n'est pas partagé. »

## 3. Questions

| Section | Question | Réponse | Obligatoire pour | Rangée dans |
|---|---|---|---|---|
| Moi | Sexe | Femme, Homme | Nutrition | `profils.sexe` |
| Moi | Date de naissance | Date (de 10 à 110 ans) | Nutrition | `profils.naissance` |
| Moi | Poids | 20 à 300 kg, au dixième | Nutrition | `profils.poids` |
| Moi | Taille | 100 à 250 cm | Nutrition | `profils.taille` |
| Moi | Activité hors sport | Sédentaire, Peu actif, Actif, Très actif | Nutrition | `profils.activite` |
| Moi | Pointure | 30 à 55, demi-pointures | — | `profils.pointure` |
| Mon niveau | Je cours depuis, Distance par semaine, Plus longue sortie récente | Tranches ([Préparation](module-preparation-specification.md), § 5.2) | Mon plan (IA) | `profil_entrainement` |
| Mon niveau | Repère d'allure | VMA (8 à 30 km/h), temps sur 10 km ou sur semi, ou « Je ne sais pas » | Mon plan (IA) | `profil_entrainement` |
| Mon niveau | Durée maximale d'une séance, Terrains d'entraînement, Niveau en renforcement | Listes | — | `profil_entrainement` |
| Ma semaine | Course | Jours possibles, nombre de séances (0 à 7), jour de la sortie longue | Mon plan (IA) | `profil_entrainement` |
| Ma semaine | Renforcement | Jours possibles, nombre de séances (0 à 7) | — | `profil_entrainement` |
| Santé | FC max | 100 à 230 bpm | — | `profil_entrainement.fc_max` |
| Santé | FC de repos | 30 à 120 bpm | — | `profils.fc_repos` |
| Santé | Points fragiles | Texte, 300 caractères au plus | — | `profil_entrainement.fragiles` |

**Une seule VMA, une seule FC max** : celles de `profil_entrainement` ; les colonnes en double de `profils` sont supprimées (évolution 033, qui reprend leurs valeurs quand elles manquent). Nutrition lit la VMA de Mon profil.

## 4. Données

Aucune table nouvelle. Évolution `033-mon-profil.sql` (à coller dans l'éditeur SQL) : VMA et FC max de `profils` reprises dans `profil_entrainement` puis supprimées ; « Profil » ajouté au menu enregistré de chacun.

## 5. Contrôles

Jeu d'essai : données fictives du banc d'essai au mardi 20 octobre 2026 ; profil : sexe Homme seulement ; Palmarès : 10 km de Montauban (29 mars 2026, 49:18) et Semi de San Sebastián (4 oct. 2026, 1:56:05).

- Mon plan : « Profil à compléter : je cours depuis, distance par semaine, plus longue sortie récente, ma semaine, repère d'allure. », bouton « Mon profil » ; la feuille : quatre sections, « Moi 1 sur 5 », « Mon niveau 0 sur 4 », « Ma semaine 0 sur 1 », Santé sans compte ; 18 lignes, 9 « À renseigner » ; Pointure et FC de repos en « — ».
- Repère du Palmarès : « Semi en 1:56:05 · Semi de San Sebastián, dim. 4 oct. 2026 » ; 10 km en 45:30 saisi, puis « Reprendre » : semi en 6 965 secondes, la suggestion disparaît.
- Même taille pour la liste et chaque question sur ordinateur, glissement à l'ouverture et au retour.
- Ma semaine : mardi, jeudi, samedi ; 3 séances, longue le samedi ; renforcement mardi et jeudi, 1 : « mar., jeu., sam. · 3 séances, longue le samedi », « mar., jeu. · 1 séance » ; 8 refusé.
- Refus : VMA 35, FC max 250, naissance en 2031, pointure 42,3 ; acceptés : FC max 186, FC de repos 52, pointure 42,5, poids 72,4 (virgule), taille 178, activité Peu actif ; mesures écrites dans `profils`, FC max et points fragiles avec le niveau ; « Moi 5 sur 5 » ; Mon plan : « Profil complet. ».
- Page Mon profil : état de toutes les obligatoires qui manquent (« date de naissance, poids, taille, activité hors sport, je cours depuis, distance par semaine, plus longue sortie récente, repère d'allure, ma semaine ») ; onglet et titre « Mon profil » ; Taille touchée : la question seule, sans « ‹ » ; 181 enregistré : feuille fermée, « Taille | 181 cm », « Moi 2 sur 5 ».
- Nutrition : « Calculé pour … » ouvre la feuille Mon profil, les mesures en tête ; poids 72,5 et activité Actif : deux écritures, besoin recalculé (2 401 kcal) ; panne : « Enregistrement impossible pour l'instant. », la question reste ouverte.
- Menu par défaut : six onglets, Mon profil en dernier ; téléphone sans débordement ; site partagé : « Le profil n'est pas partagé. ».
