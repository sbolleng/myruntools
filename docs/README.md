# Documentation du projet

Ce dossier rassemble les spécifications de l'application : ce qu'elle fait, comment elle est organisée, et les décisions prises en chemin. Il est mis à jour en même temps que le code.

> Le dépôt est public : aucune donnée personnelle dans ces fichiers.

## Mode d'emploi des discussions

Chaque discussion lit d'abord `CLAUDE.md` (règles du projet), puis ce fichier. Mot d'ordre : économiser les jetons sans baisser la qualité.

**Règles communes** (détail dans `CLAUDE.md`)

- Français, tutoiement, réponses courtes et factuelles ; ne jamais inventer de données : demander.
- Dépôt public : aucune donnée personnelle, aucun secret ; le pilote route est « le compte test Rome ».
- D'abord un plan de page en texte (schéma numéroté, tableau des éléments, options avec une recommandation) ; maquette en image seulement à la demande ou pour trancher, après accord.
- Cycle : spécification → validation → construction → banc d'essai → mise en ligne ; chaque décision : une ligne au journal.
- Apparence : les règles communes du [design](design.md), § 1 (peu de couleur, capitales pour les libellés, tout dans un cadre, trois sortes de boutons, un seul titre repliable).
- Git : branche de la session, fusion dans `main` (`--no-ff`), vérifier que la publication a réussi avant d'annoncer la mise en ligne.

**Outils**

| Outil | Où | Usage |
| --- | --- | --- |
| Todo | Ce fichier, « À faire » | Prochaines étapes dans l'ordre, questions ouvertes, idées |
| Journal | [journal.md](journal.md) | Une ligne par décision, la plus récente en haut ; à lire seulement au besoin |
| Spécifications | Sommaire ci-dessous | Une par module, avec plan de page, jeu d'essai et résultats attendus |
| Banc d'essai | `outils/essais/` | `node essais.js` (dépendances installées au démarrage de la discussion) : rejoue tous les jeux d'essai (données fictives, date figée au 20 oct. 2026) ; le Chromium de la session est pris d'office |
| Captures | `outils/essais/captures.js` | Images des pages, téléphone et ordinateur, données fictives : la façon économique de faire une maquette (avant/après avec une copie du site en ligne) |

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
| [Spécification générale](specification-generale.md) | Structure commune, en-tête, menu, page de connexion, thèmes, modules, préférences utilisateur, partage en lecture seule, données, e-mail de connexion | Version 0.16 |
| [Design](design.md) | Règles communes (couleurs, capitales, cadres, boutons, titres repliables), couleurs des thèmes, typographies, tailles et disposition de l'en-tête, de la page de connexion et du menu, formulaires, bandeau, barre du Palmarès | Version 0.12 |
| [Modèle de données](modele-donnees.md) | Tables Supabase, champs, liens, règles d'accès, partage, ce qui est calculé | Version 0.6 |
| [Module Objectif](module-objectif-specification.md) | Premier module : feuille de route, page d'une course, comptes à rebours, difficulté, suivi en course, météo | Version 0.15 |
| [Préférences utilisateur](module-preferences-specification.md) | Thème, modules du menu et leur ordre, cap de l'en-tête, partage, compte | Version 1.3 |
| [Module Palmarès](module-palmares-specification.md) | Courses courues : colonnes, types et formats, records, tri, filtres, regroupement par type, édition, téléphone | Version 1.9 |

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
| Ensuite | Courses à surveiller, Nutrition, Guide, Profil, Cette semaine ; import Strava, bilan hebdomadaire |
| À positionner | Calculatrice, Logistique, Matériel |

Chaque module suit le même cycle : spécification, validation, modèle de données si besoin, construction, contrôles, mise en ligne. Maquette seulement à la demande.

## À faire

Todo globale du projet : tout ce qui reste à faire y est noté ; une ligne terminée disparaît (la trace reste dans le [journal](journal.md)).

### Prochaines étapes

Dans l'ordre :

1. [ ] **Objectif** :
   - Plus tard, chacun décidé à son tour (ajouter ou non, toujours à la même place) : graphique de difficulté, badges UTMB, météo du jour J, suivi en course.
   - À revoir après le premier lot : pouvoir choisir la course de l'en-tête depuis la page Objectif, ou seulement dans les Préférences (`course_cap`).
2. [ ] **Palmarès** : temps au format hh:mm:ss, modèle unique du site (spécification, affichage, saisie, banc d'essai).
3. [ ] **Calendrier** : créer la page (voir l'idée « Calendrier annuel des courses » plus bas) : spécification, puis construction.
4. [ ] **Préférences** : changement de mot de passe (connexion par lien magique seulement pour l'instant).
5. [ ] **Profil et Matériel** :
   - Profil : état civil, poids, taille, pointure.
   - Matériel : chaussures et leur usure.
6. [ ] **Thèmes** : supprimer Accent 2, presque identique à l'Accent ; les repères (compte à rebours des courses, objectif, point du dossard, rôle Objectif intermédiaire) passent en Accent ou en neutre. Plan de page et maquette des trois thèmes d'abord.
7. [ ] **Nutrition** : créer la page : spécification (périmètre, repères glucides et eau par heure : voir la question ouverte « Ravitaillement en course »), puis construction.

## Questions ouvertes

- [ ] **Piste** : couverte dès le lancement, ou plus tard faute de profil pilote ?
- [ ] **Calculatrice** : liste des calculs à valider ; livraison anticipée possible, car elle ne dépend d'aucune donnée.
- [ ] **Ravitaillement en course** : repères de référence (glucides et eau par heure).
- [ ] **Matériel** et **Logistique** : périmètre de chaque module.
- [ ] **Renforcement musculaire** : module dédié, ou intégré à Profil ou à Cette semaine ?
- [ ] **Types de course** proposés dans l'en-tête : Trail court, Trail, Trail long, Ultra, Marathon, Semi-marathon, 10 km, Piste. Liste complète ?

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
