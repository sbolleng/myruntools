# Documentation du projet

Ce dossier rassemble les spécifications de l'application : ce qu'elle fait, comment elle est organisée, et les décisions prises en chemin. Il est mis à jour en même temps que le code.

> Le dépôt est public : aucune donnée personnelle dans ces fichiers.

## Sommaire

| Document | Contenu | État |
| --- | --- | --- |
| [Spécification générale](specification-generale.md) | Structure commune, en-tête, thèmes, modules, administration par l'utilisateur, données | Brouillon v0.1 |
| [Module Objectif](module-objectif-specification.md) | Premier module : feuille de route, comptes à rebours, difficulté, suivi en course, météo | Brouillon v0.1 |
| [Module Palmarès](module-palmares-specification.md) | Courses courues : colonnes, types et sous-catégories, records, tri, filtres, édition | Version 1.0 |

Une spécification est rédigée pour chaque module au moment de le construire, pas avant.

Maquettes validées : [maquettes/](maquettes/) (en-tête, calendrier).

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
| Ensuite | Courses à surveiller, Nutrition, Guide, Profil, Cette semaine ; import Strava, bilan hebdomadaire |
| À positionner | Calculatrice, Logistique, Matériel |

Chaque module suit le même cycle : spécification, validation, modèle de données si besoin, construction, contrôles, mise en ligne. Maquette seulement à la demande.

## À faire

Points en attente, par sujet. Une ligne cochée quand c'est fait.

### Palmarès

- [ ] Valider le tableau récapitulatif des courses de test : noms officiels, distances et D+ officiels.
- [ ] Ekiden (30 mai 2026) et La Bressolaise (11 mai 2025) : réponses attendues (nom, ville, type, D+, données montre), puis ajout au jeu de test.
- [ ] Place 1 au classement : afficher « 1re » plutôt que « 1er » quand le classement concerne les femmes ?

### Préférences utilisateur (page à créer, plus tard)

- [ ] Créer la page, ouverte par l'engrenage de l'en-tête.
- [ ] Choix des couleurs parmi les thèmes proposés.
- [ ] État civil, poids, taille, pointure, chaussures.
- [ ] Changement de mot de passe.
- [ ] Choix de la course affichée dans le titre de l'en-tête (écrite en dur en attendant).
- [ ] Champ libre « objectif cible » de l'en-tête (écrit en dur en attendant).

### Objectif

- [ ] Spécifier les blocs de la page Objectif : l'indicateur « d'ici là » de l'en-tête en compte le nombre.
- [ ] « Prochaine course » de l'en-tête reprise de la page Objectif (écrite en dur en attendant).

## Journal des décisions

La plus récente en haut.

| Date | Sujet | Décision |
| --- | --- | --- |
| 20 oct. 2026 | Palmarès | Colonnes Vitesse, Vitesse montre, Classement catégorie et Classement sexe ; effectif facultatif pour chaque classement ; allure et vitesse converties l'une vers l'autre quand une seule est saisie ; toutes les colonnes masquables sauf Date et Course. |
| 19 oct. 2026 | Organisation | Nouveau dépôt `myruntools` pour l'outil : spécifications et code. Les anciens sites restent dans `plan-entrainement_Seb`, sans développement neuf. Une discussion par chantier : l'outil, l'ancien site du profil route, la mise à jour du plan du profil trail. |
| 19 oct. 2026 | Nom | MyRunTools. |
| 19 oct. 2026 | Données | Deux comptes créés à la main. Import initial depuis les anciens sites, puis saisie par chacun. |
| 19 oct. 2026 | Feuille de route | Spécification générale, modèle de données, Supabase, socle, Palmarès, Calendrier, Objectif. |
| 19 oct. 2026 | Méthode | Maquettes seulement à la demande. Numéros de version posés par l'action de publication. Publication vérifiée une fois par lot. |
| 19 oct. 2026 | Palmarès | Indicateur de tri (deux flèches) sur chaque en-tête de colonne. |
| 19 oct. 2026 | Palmarès | Une seule colonne Temps, saisie par l'utilisateur ; bouton « + » pour les colonnes facultatives ; panneau de filtres repliable. |
| 19 oct. 2026 | Palmarès | Filtres présentés dans un panneau ouvert par un bouton « Filtres » ; tri en touchant l'en-tête d'une colonne. Prototype de la V2 sur l'ancien site du profil route, onglet Palmarès V2, à côté de l'actuel. |
| 19 oct. 2026 | Documentation | Spécification du module Palmarès ajoutée (version 0.6). Les spécifications de module suivent le nom `module-<nom>-specification.md`. |
| 19 oct. 2026 | Objectif | Une course courue quitte la page Objectif et rejoint le Palmarès (appliqué sur l'ancien site du profil route). |
| 19 oct. 2026 | Courses à surveiller | Onglet à part sur l'ancien site du profil route, sorti de la page Objectif : il rassemble les envies pour après l'objectif (mars 2028). |
| 13 oct. 2026 | Calendrier | Jalon 1 en octobre 2026, conçu comme une preuve de concept : base de données Supabase dès le départ, page Objectif comme premier module branché dessus, puis Nutrition. Courses à surveiller passe au jalon suivant. |
| 5 oct. 2026 | Documentation | Les spécifications vivent en Markdown dans `docs/`, à côté du code ; une présentation sert à présenter le projet. La note de cadrage n'est plus tenue à jour. |
| 5 oct. 2026 | Confidentialité | Le site sera protégé par la connexion Supabase (comptes individuels), pas par un hébergement à accès restreint. Le dépôt reste public ; chaque module devient privé quand son contenu passe dans Supabase. |
| 5 oct. 2026 | En-tête | Décrit comme un chapitre de la spécification générale, pas dans un document séparé. |
| 4 oct. 2026 | Calendrier | Jalon 1 au 10 octobre 2026 : nom, socle et module Objectif, Courses à surveiller. |
| 4 oct. 2026 | En-tête | Compteur toujours aligné en haut du titre, à toutes les résolutions ; ligne « prochaine étape » sous les indicateurs ; type de course en blanc, nom de la course en couleur d'accent. |
| 4 oct. 2026 | Nom | « Ravito » écarté, déjà utilisé. |
| 4 oct. 2026 | Suivi en course | Temps saisis en chiffres seuls acceptés (2629 = 26:29), le clavier numérique des téléphones n'ayant pas de « : ». |
| 3 oct. 2026 | En-tête | Style éditorial ; quatre indicateurs : distance, D+ (en km, arrondi), objectif, date ; identique sur toutes les pages ; nom de l'application en haut à droite. |
| 3 oct. 2026 | Objectif | Suivi en course et météo actifs par défaut ; graphique de difficulté affiché pour tous, repliable. |
| 3 oct. 2026 | Modules | Ordre : Objectif, Courses à surveiller, Nutrition, Guide, Profil et Palmarès, Cette semaine. |
| 3 oct. 2026 | Thèmes | Trail en bleu et orange, route en vert et rose. |
| 3 oct. 2026 | Vision | Application modulaire, activation des modules par utilisateur ; deux profils pilotes, ouverture possible ; application web, sans installation. |
| Oct. 2026 | Données | Supabase retenu ; trois automatisations prioritaires : import Strava, bilan hebdomadaire, suivi du plan nutritionnel. |

## Idées de modules

Idées notées pour plus tard, sans jalon.

### Calendrier annuel des courses (idée du 5 oct. 2026)

Une vue de l'année d'un seul tenant, pour voir le planning en un coup d'œil, pas un simple récapitulatif.

- Les 12 mois visibles ensemble, un petit carré par jour.
- Chaque course est un carré de couleur vive à sa date (par exemple rouge ; l'objectif plus marqué).
- Un liseré part de chaque course et remonte dans le temps sur la durée de sa préparation : deux liserés qui se superposent signalent deux préparations qui se chevauchent.
- Les jours sans course ni liseré font apparaître les plages libres pour la récupération et la préparation.
- Construit à partir de la même liste de courses que la page Objectif, sans double saisie.
- **Prototype en ligne** depuis le 13 oct. 2026 sur l'ancien site du profil route, onglet Planning (composant `composants/planning.js`), avec des durées provisoires et deux vues : 12 mois glissants, ou jusqu'à l'objectif.

À trancher le moment venu :

- [ ] Durée de préparation : fixée par type de course, ou saisie course par course ?
- [ ] Liseré de récupération après chaque course, d'une autre couleur ?
- [ ] Période affichée : année civile, ou 12 mois glissants ?
- [ ] Module à part (« Calendrier »), ou bloc de la page Objectif ?

## Questions ouvertes

- [ ] **Piste** : couverte dès le lancement, ou plus tard faute de profil pilote ?
- [ ] **Calculatrice** : liste des calculs à valider ; livraison anticipée possible, car elle ne dépend d'aucune donnée.
- [ ] **Ravitaillement en course** : repères de référence (glucides et eau par heure).
- [ ] **Matériel** et **Logistique** : périmètre de chaque module.
- [ ] **Renforcement musculaire** : module dédié, ou intégré à Profil ou à Cette semaine ?
- [ ] **Types de course** proposés dans l'en-tête : Trail court, Trail, Trail long, Ultra, Marathon, Semi-marathon, 10 km, Piste. Liste complète ?
