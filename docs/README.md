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
- Apparence : les règles communes du [design](design.md), § 1 (un seul accent, peu de couleur, capitales pour les libellés, tout dans un cadre, trois sortes de boutons, pastilles et champ communs, fenêtres comme la fiche, un seul titre repliable).
- Git : branche de la session, fusion dans `main` (`--no-ff`), vérifier que la publication a réussi avant d'annoncer la mise en ligne.

**Outils**

| Outil | Où | Usage |
| --- | --- | --- |
| Todo | Ce fichier, « À faire » | Prochaines étapes dans l'ordre, questions ouvertes, idées |
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
| [Spécification générale](specification-generale.md) | Structure commune, en-tête, menu, page de connexion, thèmes, modules, préférences utilisateur, partage en lecture seule, données, e-mail de connexion, mesures communes (km-effort, allure-effort) | Version 0.31 |
| [Design](design.md) | Règles communes (un seul accent, capitales, cadres, boutons, pastilles, champ, fenêtres, titres repliables), couleurs des thèmes, typographies, tailles et disposition de l'en-tête, de la page de connexion et du menu, formulaires, bandeau, barre du Palmarès, panneau des boutons | Version 0.38 |
| [Modèle de données](modele-donnees.md) | Tables Supabase, champs, liens, règles d'accès, partage, ce qui est calculé | Version 0.18 |
| [Module Objectif](module-objectif-specification.md) | Premier module : feuille de route, page d'une course, comptes à rebours, difficulté, suivi en course, météo | Version 0.63 |
| [Préférences utilisateur](module-preferences-specification.md) | Thème, modules du menu et leur ordre, cap de l'en-tête, partage, compte | Version 1.11 |
| [Module Palmarès](module-palmares-specification.md) | Courses courues : colonnes, types et formats, records, tri, filtres, regroupement par type, édition, téléphone, graphique de progression | Version 1.31 |
| [Réglages Supabase de la connexion](reglages-supabase-connexion.md) | Liste des réglages à faire dans le tableau de bord pour la connexion par mot de passe | Version 1.0 |
| [Module Courses à surveiller](module-courses-a-surveiller-specification.md) | Toutes les courses en cartes chronologiques regroupées par mois : vues À surveiller (par défaut), Déjà couru, À venir, Tout ; tri par ouverture des inscriptions ; ouverture avec heure et mois seul | Version 0.7, construit |
| [Module Nutrition](module-nutrition-specification.md) | Besoin du jour (calculatrice), jauges calories et macros, saisie rapide sur téléphone : favoris, récents, quantité | Version 0.6, construit (reste Ciqual et le sélecteur de jour) |
| [Module Calendrier](module-calendrier-specification.md) | Trois vues : semaine (par défaut ; un jour par ligne, liste continue), mois (grille du mois) et année (grille de 3, 6 ou 12 mois) ; case « Phases de prépa » (barres et fonds aux couleurs des phases) ; la préparation d'une course est sur sa page | Version 0.16, construit |

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

## À faire

Todo globale du projet : tout ce qui reste à faire y est noté ; une ligne terminée disparaît (la trace reste dans le [journal](journal.md)).

### Prochaines étapes

Dans l'ordre :

1. [ ] **Objectif** :
   - **À essayer en réel** : « Remplacer » le GPX du Rock'Angel (fichier à plusieurs tracés : choix du bon tracé), puis « ↓ GPX ».
   - Plus tard, chacun décidé à son tour (ajouter ou non, toujours à la même place) : badges UTMB, météo du jour J, suivi en course.
   - **Page d'une course** : pouvoir choisir cette course comme cap de l'en-tête (pas depuis la feuille de route ; aujourd'hui seulement dans les Préférences, `course_cap`).
   - **Section stratégie de course** : ravitaillement en course, repères de référence (glucides et eau par heure).
   - **Nombre de ravitaillements** : pouvoir l'indiquer sur la course (fiche d'édition et page), distinct de la stratégie de ravitaillement ci-dessus ; format de saisie et place à décider (ajouté le 1er nov. 2026).
   - **Règlement de la course** : pouvoir l'importer (fichier) et le consulter depuis la page de la course.
   - **Retrait des dossards** : infos de retrait (lieu, jours et horaires, pièces à présenter), sur la page de la course ; à situer par rapport à la Logistique (ajouté le 1er nov. 2026).
2. [ ] **Courses à surveiller** (spécification 0.7, en ligne) :
   - **Dupliquer une course pour l'année suivante** (à rediscuter) : une ligne par édition ; bouton sur la fiche d'une course courue qui crée une copie À surveiller, un an plus tard (mois seul), sans résultat, dossard ni ouverture ; question ouverte : recopier le tracé GPX ?
   - Index UTMB (plus tard).
3. [ ] **Calendrier** : [spécification 0.16](module-calendrier-specification.md) ; trois vues (Année, Mois, Semaine), case « Phases de prépa », modèle de données et séances en ligne ; la préparation d'une course est une rubrique de sa page (Objectif, § 3.4). Reste :
   - **Vue Année** : retouches à venir (annoncées le 2 nov. 2026) ; **fonds de phase** (Mois, Semaine) : lisibilité à vérifier à l'usage, notamment sur fond blanc.
   - **Question pour plus tard** : prépa propre aux courses préparatoires et plaisir (§ 9, réponses A, B, C).
   - **À essayer en conditions réelles** (Supabase) : ajout d'une séance, case « faite », « Paramétrer le plan » (durée, phases), aussi depuis le formulaire d'une course, nouvelle ou existante.
   - **Semaine de récupération après la course** (décidée, § 5.1) : case facultative par course dans « Paramétrer le plan » et le formulaire ; évolution de la base, frise, jeu d'essai.
   - **Durées de prépa par format** : valeurs du § 5.4 validées ; à fournir pour Trail découverte, Course en heure, Marche, Fast hiking, Triathlon.
   - **Plus tard** : import des séances depuis une application, avec durée, distance, D+ et ressenti facultatifs ; génération des séances d'un plan par IA (les phases restent calculées par les règles générales, jamais par IA).
4. [ ] **Refonte login et mot de passe** : en ligne le 30 oct. 2026 ; essais réels réussis (« Mot de passe oublié ? », « Changer le mot de passe »). Reste : premier mot de passe du compte test Rome.
5. [x] **Mentions légales et crédits** : en ligne le 1er nov. 2026 ([Spécification générale 0.29](specification-generale.md), § 11 bis) ; contact `contact@myruntools.fr` (redirection OVH, réponse depuis Gmail par Resend). Le lien « Confidentialité » viendra avec le lot RGPD.
6. [ ] **RGPD** : politique de confidentialité et droits des utilisateurs sur leurs données (consultation, suppression). À faire avant d'ouvrir les inscriptions (données de santé : poids, FC, VMA).
7. [ ] **Anti-robot** (Cloudflare Turnstile) : plus tard, mais avant d'ouvrir l'inscription. Code prêt (`mrtCaptcha`, inactif) ; étapes : créer le widget pour `myruntools.fr`, me donner la clé du site, je publie, puis activer CAPTCHA dans Supabase avec la clé secrète ([réglages](reglages-supabase-connexion.md), n° 6). À mentionner dans la politique de confidentialité.
8. [ ] **Inscription** (« Créer son compte ») : chacun crée son compte (décidé le 30 oct. 2026) : page « Créer un compte » (prénom et nom obligatoires, adresse, mot de passe et confirmation, anti-robot), confirmation de l'adresse par e-mail avant le premier accès, message neutre ; profil et préférences créés par la base (évolution 015). Préalables : connexion par mot de passe en ligne, mentions légales et RGPD, anti-robot actif, service d'envoi d'e-mails (SMTP).
9. [ ] **Changer son adresse e-mail** : dans les Préférences (bloc Compte), avec confirmation envoyée à la nouvelle adresse.
10. [ ] **Refonte des Préférences utilisateur** : s'inspirer d'Oleno et de Babelio ; plan de page d'abord.
11. [ ] **Catalogue des courses** : d'abord un catalogue partagé (une course saisie par un coureur sert aux suivants, recherche, doublons à gérer) ; ensuite, demander un partenariat d'accès aux données à Le Sportif (la plus large couverture), puis à Finishers. Pas de récupération automatique de leurs pages (conditions d'utilisation, droit des bases de données).
12. [ ] **Profil** : état civil, poids, taille, pointure.
13. [ ] **Matériel** (module) : chaussures et leur usure, inventaire, matériel obligatoire, listes de sac ; périmètre à définir.
14. [ ] **Logistique** (module) : transport, hébergement, retrait des dossards, horaires ; périmètre à définir.
15. [ ] **Renforcement musculaire** (module) : module dédié, ou intégré à Profil ou à Cette semaine ?
16. [ ] **Calculatrice** (module) : allure, vitesse, temps de passage, VMA, km-effort, pente ; liste des calculs à valider ; peut sortir tôt, car elle ne dépend d'aucune donnée.
17. [ ] **Nutrition** : [spécification 0.6](module-nutrition-specification.md) validée (5 nov. 2026) ; modèle de données 0.19 et évolution 019 écrits, évolution 019 passée dans Supabase (5 nov. 2026) ; `besoin.js`, profil minimal, sport du jour, jauges, ajout rapide et journal construits et testés (page `nutrition.html`, à cocher dans les Préférences ; évolution 020 pour l'ajouter aux menus rangés) ; mise en page en quatre cartes et recherche Open Food Facts (6 nov. 2026) ; reste : **Ciqual** (aliments génériques ; site de l'ANSES en maintenance le 6 nov., à réessayer), sélecteur de jour, Strava ; repères glucides et eau par heure partagés avec la stratégie de course d'Objectif.
18. [ ] **Partenariat nutrition** : contacter la nutritionniste pour un partenariat (en lien avec le module Nutrition).
19. [ ] **En un coup d'œil** :
   - Pense-bête : rappels tirés des courses et notes perso (table des notes, évolution à prévoir).
   - Bilan nutrition : avec le module Nutrition.
   - Repasse sur les blocs et leur ordre, une fois la page utilisée quelque temps.
20. [ ] **Prévoir un profil piste ?**
21. [ ] **Bouton « Laisser un avis »** : envoie un message à l'adresse contact@ du site, à mettre en place (lien avec les mentions légales, n° 5) ; place du bouton et forme (lien e-mail ou formulaire) à décider (ajouté le 1er nov. 2026).

## Questions ouvertes

Aucune question générale ouverte pour l'instant (les questions propres à un module sont dans sa spécification).

## Idées de modules

Idées notées pour plus tard, sans jalon.

### Calendrier annuel des courses (idée du 5 oct. 2026, devenue le [module Calendrier](module-calendrier-specification.md))

Une vue de l'année d'un seul tenant, pour voir le planning en un coup d'œil, pas un simple récapitulatif.

- Les 12 mois visibles ensemble, un petit carré par jour.
- Chaque course est un carré de couleur vive à sa date (par exemple rouge ; l'objectif plus marqué).
- Un liseré part de chaque course et remonte dans le temps sur la durée de sa préparation : deux liserés qui se superposent signalent deux préparations qui se chevauchent.
- Les jours sans course ni liseré font apparaître les plages libres pour la récupération et la préparation.
- Construit à partir de la même liste de courses que la page Objectif, sans double saisie.
- **Prototype en ligne** depuis le 13 oct. 2026 sur l'ancien site du profil route, onglet Planning (composant `composants/planning.js`), avec des durées provisoires et deux vues : 12 mois glissants, ou jusqu'à l'objectif.

Durée de prépa, période et module à part sont tranchés dans la spécification du module ; le liseré de récupération est remplacé par la phase Deload.
