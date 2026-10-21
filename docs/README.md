# Documentation du projet

Ce dossier rassemble les spécifications de l'application : ce qu'elle fait, comment elle est organisée, et les décisions prises en chemin. Il est mis à jour en même temps que le code.

> Le dépôt est public : aucune donnée personnelle dans ces fichiers.

## Sommaire

| Document | Contenu | État |
| --- | --- | --- |
| [Spécification générale](specification-generale.md) | Structure commune, en-tête, menu, page de connexion, thèmes, modules, préférences utilisateur, partage en lecture seule, données | Version 0.5 |
| [Design](design.md) | Couleurs des thèmes, typographies, tailles et disposition de l'en-tête, de la page de connexion et du menu, formulaires, bandeau, barre du Palmarès | Version 0.5 |
| [Modèle de données](modele-donnees.md) | Tables Supabase, champs, liens, règles d'accès, partage, ce qui est calculé | Version 0.6 |
| [Module Objectif](module-objectif-specification.md) | Premier module : feuille de route, comptes à rebours, difficulté, suivi en course, météo | Brouillon v0.1 |
| [Module Palmarès](module-palmares-specification.md) | Courses courues : colonnes, types et formats, records, tri, filtres, regroupement par type, édition | Version 1.8 |

Une spécification est rédigée pour chaque module au moment de le construire, pas avant.

Maquettes : [maquettes/](maquettes/) (en-tête, connexion, calendrier). Site : en-tête, menu et Palmarès lus dans la base pour l'utilisateur connecté.

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

Todo globale du projet : tout ce qui reste à faire y est noté ; une ligne terminée disparaît (la trace reste dans le journal).

### Prochaines étapes

- [ ] Compte du pilote route : en attente de son adresse e-mail, puis création comme le premier.
- [ ] Supabase : désactiver « Allow new users to sign up » (comptes créés à la main seulement).
- [ ] E-mail du lien de connexion traduit en français (Supabase › Authentication › Emails) ; je fournis le texte.
- [ ] Service d'envoi d'e-mails (Brevo ou Resend, gratuit) branché en SMTP dans Supabase : lève la limite de 2 e-mails par heure de l'offre gratuite ; à faire avec la traduction (expéditeur, texte).
- [ ] Import de Rome : script fourni hors dépôt (37 courses : 9 courues, 7 à venir, 21 à surveiller), à lancer dans l'éditeur SQL.
- [ ] Socle, suite : profils et préférences lus dans la base.
- [ ] Essai à deux du partage : Rome partage, tu regardes son site.

### Préférences utilisateur (page à créer)

- [ ] Créer la page, ouverte par l'engrenage de l'en-tête.
- [ ] Choix du thème parmi ceux proposés.
- [ ] Changement de mot de passe.
- [ ] Choix de la course affichée dans le titre de l'en-tête (écrite en dur en attendant).
- [ ] Choix des modules affichés dans le menu, et de leur ordre.

### Profil et Matériel

- [ ] Profil : état civil, poids, taille, pointure.
- [ ] Matériel : chaussures et leur usure.

### Objectif

- [ ] Spécifier les blocs de la page Objectif : l'indicateur « D'ici là » de l'en-tête en compte le nombre.
- [ ] « Prochaine course » de l'en-tête reprise de la page Objectif (écrite en dur en attendant).
- [ ] Pouvoir marquer, sur la page Objectif, la course à afficher dans l'en-tête.

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

## Journal des décisions

La plus récente en haut.

| Date | Sujet | Décision |
| --- | --- | --- |
| 22 oct. 2026 | Téléphone | En-tête : « Cap sur » sur une ligne, prochaine course en bas à droite et nommée par sa course. Formulaire : tient dans l'écran, « × » toujours visible, case DNF sous le temps, virgule décimale. Regroupement inactif sur fond Surface 2. (Spécification générale 0.5, Palmarès 1.8, design 0.5.) |
| 22 oct. 2026 | Palmarès | « Sous-catégorie » devient « Format » (« Type » reste) ; le nom d'une course : « Course » (obligatoire) et « Parcours » (facultatif) ; exemples dans les champs ; boutons ronds (regroupement à droite de Filtres, ajout tout à droite), crayon au survol dans la nuance des flèches de tri, ligne touchée sur écran tactile (spécification 1.7, design 0.4). |
| 22 oct. 2026 | Modèle de données | Version 0.6 : `sous_categories` devient `formats`, `courses.sous_categorie` devient `format`, `evenement` et `nom` deviennent `course` et `parcours` (évolution 006). |
| 21 oct. 2026 | Partage | Partage en lecture seule (spécification générale § 9, modèle 0.5, évolution 005) : par l'e-mail d'un compte existant ; courses, circuits, préférences, prénom, nom et sexe ; jamais les données de santé ni l'équipement ; bandeau « Lecture seule » et retour à son site. |
| 21 oct. 2026 | Palmarès | Édition dans le site (spécification 1.6, § 10) : formulaire en quatre blocs (`composants/fiche-course.*`), durées en chiffres seuls acceptées, suppression dans le formulaire après confirmation ; rien d'éditable en lecture seule. |
| 21 oct. 2026 | Import | Rome : 9 courses courues, 7 à venir (Béret et Nocturne en Plaisir, Augerolloise en Objectif intermédiaire, Rome en Objectif), 21 à surveiller (une ligne par format, sans date : « À définir ») ; Tournefeuille dans le Challenge Levy. En-tête : la prochaine course affiche « Événement · Parcours ». |
| 21 oct. 2026 | Socle | En-tête, menu et Palmarès lus dans la base (`composants/donnees.js`) ; profil de démonstration et données écrites dans le code retirés du dépôt. Courses du profil trail importées (18). |
| 21 oct. 2026 | Modèle de données | Version 0.4 : circuits (UTMB, Challenge Levy…) dans une table à part, avec catégorie d'index et Running Stones par course ; course sans date affichée « À définir » (évolution 004). |
| 21 oct. 2026 | Palmarès | Sous-catégories de trail selon la distance officielle (usage FFA) : découverte < 21 km, court 21–41, long 42–79, ultra ≥ 80 (spécification 1.4). |
| 21 oct. 2026 | Import | Temps retenu : le temps puce. Terrain et tirage au sort rangés dans la description ; plan B, note dossard et meilleurs efforts Strava laissés de côté. |
| 21 oct. 2026 | Connexion | Limite de l'envoi intégré de Supabase : 2 e-mails par heure pour tout le projet ; un service d'envoi SMTP gratuit est prévu pour la lever. |
| 21 oct. 2026 | Confidentialité | Site privé : sans connexion, toute page renvoie vers la page de connexion sans montrer son contenu. Les données encore écrites dans le code restent lisibles dans le dépôt public jusqu'à leur import dans la base. |
| 21 oct. 2026 | Palmarès | Groupé par type par défaut (spécification 1.3, évolution de base 002). |
| 21 oct. 2026 | Connexion | Page de connexion sobre, sans en-tête ni menu (spécification générale 0.3, design 0.2). |
| 21 oct. 2026 | Confidentialité | Le pilote route est désigné « route » ou « Rome », jamais nommé, ni dans la discussion ni dans le dépôt. |
| 21 oct. 2026 | Connexion | Premier essai réel réussi : lien magique reçu, retour connecté, profil et thème lus dans la base. |
| 21 oct. 2026 | Connexion | Page « Se connecter » par lien magique, réservée aux comptes existants ; thème lu dans les préférences (un `?t=…` garde la priorité) ; bloc Compte et déconnexion dans les Préférences. Site encore public tant que la connexion n'a pas été essayée pour de vrai. |
| 21 oct. 2026 | Thèmes | Nommés par leurs couleurs : `bleu-orange`, `vert-rose`, `violet-turquoise` (au lieu de trail, route, test) ; un thème ne change que les couleurs. |
| 21 oct. 2026 | Supabase | Projet créé (région Europe du Nord), tables et règles par ligne en place (`supabase/schema.sql`), compte du pilote trail créé ; évolutions de la base dans `supabase/evolutions/`. |
| 20 oct. 2026 | Modèle de données | Version 0.3 : statut (À surveiller, Option, Confirmée), rôle (Préparatoire, Plaisir, Objectif intermédiaire, Objectif) et état (À venir, Abandonnée, Courue) séparés ; DNF dans le résultat ; groupes d'options à la place d'« À choisir » ; « Horizon » supprimé ; cap choisi dans les Préférences, par défaut la course la plus lointaine ; description (1 000 caractères) et lien d'inscription ; passages et chronos de référence en listes dans la course ; profil avec nom, FC repos et max, VMA, VO2 max, sans historique ; table `equipements`. |
| 20 oct. 2026 | Modèle de données | Version 0.2 validée : une seule table `courses` (prévue puis courue), profils, préférences, candidats, points de passage, repères, listes de référence ; règles par ligne. Statuts « Courue, non terminée » (DNF), « Abandonnée » et, plus tard, « À surveiller ». Chaussures, nutrition et séances viendront avec leur module. |
| 20 oct. 2026 | En-tête | L'indicateur « Objectif » reprend l'objectif de la course de l'en-tête ; plus de champ libre dans les Préférences. |
| 20 oct. 2026 | Palmarès | Course non terminée : « DNF » dans la colonne Temps, hors records (spécification 1.2). |
| 20 oct. 2026 | En-tête | Titre « Cap sur » ; l'indicateur « Objectif cible » devient « Objectif » ; en-tête remonté. |
| 20 oct. 2026 | Palmarès | Interrupteur « Grouper par type » (spécification 1.1) : un groupe par type avec intertitre repliable, tri dans chaque groupe, colonne Type masquée ; dernier choix retenu. |
| 20 oct. 2026 | Documentation | La section « À faire » du README devient la todo globale : tout ce qui reste à faire y est noté, ce qui est fait en disparaît. |
| 20 oct. 2026 | En-tête | « MyRunTools » aligné sur le haut de « Objectif », compte à rebours dessous ; Objectif cible avant D'ici là. |
| 20 oct. 2026 | Socle | En-tête et menu en composant partagé (`composants/en-tete.*`), thème par `?t=trail`, `?t=route` ou `?t=test` ; profil de démonstration en dur dans `donnees/demo.js` ; modules pas encore construits grisés dans le menu ; page Préférences en attente. |
| 20 oct. 2026 | Palmarès | Première place « 1re » pour une coureuse. |
| 20 oct. 2026 | Spécification générale | En-tête : « Objectif » et nom officiel de la course ; indicateurs Distance, D+ (trail), Date, D'ici là, Objectif cible ; « prochaine course » sous le compteur ; nom de l'application et engrenage des Préférences utilisateur. Une page par module, en-tête et menu partagés. Trois thèmes, dont un d'essai. Design dans un document séparé. |
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
