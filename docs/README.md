# Documentation du projet

Ce dossier rassemble les spécifications de l'application : ce qu'elle fait, comment elle est organisée, et les décisions prises en chemin. Il est mis à jour en même temps que le code.

> Le dépôt est public : aucune donnée personnelle dans ces fichiers.

## Mode d'emploi des discussions

Chaque discussion lit d'abord `CLAUDE.md` (règles du projet), puis ce fichier. Mot d'ordre : économiser les jetons sans baisser la qualité.

Règles du projet : `CLAUDE.md` (toujours chargé, inutile de les répéter ici).

**Outils**

| Outil | Où | Usage |
| --- | --- | --- |
| Todo | Ce fichier, « Prochaines étapes » (en bref) ; [todo.md](todo.md) (en détail) | Prochaines étapes dans l'ordre ; détail, questions ouvertes et idées dans `todo.md`, à lire seulement pour l'étape traitée |
| Journal | [journal.md](journal.md) | Une ligne par décision, la plus récente en haut ; à lire seulement au besoin |
| Spécifications | Sommaire ci-dessous | Une par module, avec plan de page, jeu d'essai et résultats attendus |
| Banc d'essai | `outils/essais/` | `node essais.js` (dépendances installées au démarrage de la discussion) : rejoue tous les jeux d'essai (données fictives, date figée au 20 oct. 2026) ; `node essais.js repasse calendrier` : seulement les groupes nommés ; le Chromium de la session est pris d'office |
| Captures | `outils/essais/captures.js` | Images des pages, téléphone et ordinateur, données fictives : la façon économique de faire une maquette (avant/après avec une copie du site en ligne ; `THEME=vert-rose` pour un autre thème) |

**Modèle conseillé**

| Travail | Modèle | Effort |
| --- | --- | --- |
| Conception, critique, repasse sur plusieurs pages, choix de design | Opus | élevé |
| Lot bien cadré : spécification, construction d'après un plan validé, banc d'essai | Sonnet | moyen |
| Petite retouche (un libellé, une couleur, une ligne de spécification) | Sonnet ou Haiku | faible |

Une discussion par lot ; en ouvrir une nouvelle plutôt que de compacter une longue : tout le contexte utile est dans le dépôt.

## Sommaire

| Document | Contenu | État |
| --- | --- | --- |
| [Spécification générale](specification-generale.md) | Structure commune, en-tête, menu, page de connexion, thèmes, modules, préférences utilisateur, partage en lecture seule, données, e-mail de connexion, mesures communes (km-effort, allure-effort) | Version 0.45 |
| [Design](design.md) | Règles communes (un seul accent, capitales, cadres, boutons, pastilles, champ, fenêtres, titres repliables, confirmations, zones de toucher, formats), échelle de sept tailles, couleurs des thèmes, typographies, tailles et disposition de l'en-tête, de la page de connexion et du menu, formulaires, bandeau, barre du Palmarès, panneau des boutons | Version 0.56 |
| [Modèle de données](modele-donnees.md) | Tables Supabase, champs, liens, règles d'accès, partage, ce qui est calculé | Version 0.27 |
| [Module Objectif](module-objectif-specification.md) | Premier module : la saison (feuille de route des courses), page d'une course, comptes à rebours, difficulté, suivi en course, météo | Version 0.87 |
| [Préférences](module-preferences-specification.md) | Thème, modules du menu et leur ordre, cap de l'en-tête, partage, compte | Version 1.17 |
| [Module Palmarès](module-palmares-specification.md) | Courses courues : colonnes, types et formats, records, tri, filtres, regroupement par type, édition, téléphone, graphique de progression | Version 1.35 |
| [Réglages Supabase de la connexion](reglages-supabase-connexion.md) | Liste des réglages à faire dans le tableau de bord pour la connexion par mot de passe | Version 1.1 |
| [Outils et services](outils-et-services.md) | Tous les outils et services (GitHub, OVH, Supabase, Resend, Cloudflare Turnstile, API Anthropic, Open Food Facts, cartes, polices…) : adresse, rôle, état | Version 0.1 |
| [Module Courses à surveiller](module-courses-a-surveiller-specification.md) | Toutes les courses en cartes chronologiques regroupées par mois : toutes les courses au départ, filtres Statut (Confirmée, Option, Repérée, Courue), Ouvertes et Année ; tri par ouverture des inscriptions ; ouverture avec heure et mois seul ; bouton Finishers | Version 0.11, construit |
| [Module Nutrition](module-nutrition-specification.md) | Besoin du jour (calculatrice), jauges calories et macros, saisie rapide sur téléphone : favoris, récents, quantité | Version 1.47, construit (reste Ciqual) |
| [Module Calendrier](module-calendrier-specification.md) | Trois vues : semaine (par défaut ; un jour par ligne, liste continue), mois (grille du mois) et année (grille de 3, 6 ou 12 mois), au menu « Vue » ; bouton « Plan » (fond et liseré aux couleurs des phases) ; la préparation d'une course est sur sa page | Version 0.34, construit |
| [Mon profil](module-profil-specification.md) | Tout ce qui décrit le coureur, en une page et une feuille commune : Moi, Mon niveau, Ma semaine, Santé, Connexions ; repère d'allure tiré du Palmarès | Version 0.11, construit |
| [Guide](module-guide-specification.md) | Article de lecture, hors du menu : comment MyRunTools construit un plan de préparation et calcule la nutrition ; sources et limites | Version 0.2, construit |
| [Module Préparation](module-preparation-specification.md) | Un plan de préparation qui combine toutes les courses selon leur rôle (Objectif, Préparatoire, Plaisir) ; règles d'affûtage et de récupération sourcées ; séances proposées par une IA, validées par l'utilisateur | Version 3.14, lots 1 à 4 construits (lot 3 réservé aux pilotes ; lot 4 : un seul plan, page « Mon plan ») |
| [Mes stats](module-stats-specification.md) | Progression mois par mois (volume, D+, allure-effort, cadence, efficience cardiaque, écart de spécificité), meilleurs temps, temps estimés, allures, zones cardiaques ; analyse de l'IA ; import de l'export Strava | Version 0.4, construit (évolution 045 et fonction `analyser-stats` à passer dans Supabase) |

Une spécification est rédigée pour chaque module au moment de le construire, pas avant.

Décisions : [journal](journal.md), la plus récente en haut.

Maquettes : [maquettes/](maquettes/) (en-tête, connexion, calendrier). Pas de nouvelle maquette ni de mise à jour d'une maquette sans demande : la proposer d'abord, pour économiser du temps et des jetons. Site : en-tête, menu et Palmarès lus dans la base pour l'utilisateur connecté.

## Le projet en bref

Une application web modulaire pour les coureurs sur piste, sur route et en trail : un point d'entrée unique pour planifier ses courses, suivre sa préparation, sa nutrition, son matériel et sa logistique. Chaque coureur active les modules utiles à sa pratique. Deux profils pilotes au lancement : un profil trail et un profil route.

## Feuille de route

| Étape | Contenu |
| --- | --- |
| 1 | Spécification générale réécrite, sans référence aux anciens sites |
| 2 | Modèle de données |
| 3 | Supabase : deux comptes créés à la main, import des données des anciens sites |
| 4 | Socle : connexion, profils, thèmes, en-tête, navigation |
| 5 | Palmarès branché sur la base, en lecture puis en édition |
| 6 | Calendrier |
| 7 | Objectif |
| Ensuite | Nutrition, Guide, Profil, Cette semaine ; import Strava, bilan hebdomadaire |
| À positionner | Calculatrice, Logistique, Matériel |

Chaque module suit le même cycle : spécification, validation, modèle de données si besoin, construction, contrôles, mise en ligne. Maquette seulement à la demande.

## Prochaines étapes

En bref, dans l'ordre ; le détail de chaque ligne (et toutes les autres) : [todo.md](todo.md), même numéro.

1. **Préparation, refonte de Mon plan** : ajouter le renforcement (section Renforcement de Ma semaine dans le parcours, séances de renforcement dans le plan) ; voir aussi le n° 13.
2. **Objectif** : essai réel du GPX à plusieurs tracés ; cap de l'en-tête depuis la page d'une course ; « Proposer une stratégie » construit (0.83, § 3.10) : évolution 044 et fonction `proposer-strategie` à passer dans Supabase.
4. **Calendrier** : Mois V2 à comparer avec Mois, puis n'en garder qu'une.
6. **Ouverture à tous, suites** : plafond de l'IA à remettre, essai d'un compte non pilote, droits RGPD dans les Préférences, polices hébergées.
21. **Mes stats** : construit ([spécification 0.4](module-stats-specification.md)) ; passer l'évolution 045 et créer la fonction `analyser-stats` ; essai réel avec une archive Strava (colonnes, cadence).
15. **Nutrition** : vue Semaine ; choix de l'unité dans la feuille d'ajout (en attente de décision) ; Ciqual.
