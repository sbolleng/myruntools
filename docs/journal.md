# Journal des décisions

[Retour au sommaire](README.md)

La plus récente en haut.

| Date | Sujet | Décision |
| --- | --- | --- |
| 23 oct. 2026 | Objectif | Spécification v0.2 : plus de texte d'introduction ; « D'ici là » = étapes avant le cap (un groupe d'options pour une) ; « Prochaine course » = première Confirmée à venir hors cap (spécification générale 0.12) ; construction en lots, feuille de route d'abord, puis graphique, badges UTMB, météo, suivi en course. Choix du cap depuis la page Objectif : à revoir plus tard. |
| 23 oct. 2026 | Partage | Essai à deux validé en conditions réelles avec le compte test Rome : le partage fonctionne. |
| 23 oct. 2026 | Todo | Nouvel ordre des prochaines étapes : essai à deux du partage, Objectif, Calendrier, mot de passe, Profil et Matériel. Les lignes terminées (authentification, affichage) sortent de la todo. |
| 23 oct. 2026 | Affichage | Cause du saut (aussi sur ordinateur) : la page était révélée dès la session vérifiée, avant la lecture des courses et le dessin de l'en-tête. Correctif : la page reste masquée jusqu'à ce que l'en-tête et le contenu soient dessinés, avec un filet de 6 s ; spécification générale 0.11 (§ 3, § 13) et contrôle « affichage » ajouté au banc d'essai. |
| 23 oct. 2026 | Connexion | Modèle d'e-mail A en place dans Supabase et testé sur `myruntools.fr` : authentification terminée. Prochain lot : correctif d'affichage (saut de l'en-tête au chargement, constaté aussi sur PC). |
| 23 oct. 2026 | Connexion | Modèle d'e-mail A retenu (carte claire, bouton marine à texte orange) : `docs/maquettes/email-connexion-a.html`, à coller dans le modèle « Magic Link » de Supabase. |
| 23 oct. 2026 | Domaine | `myruntools.fr` branché sur GitHub Pages : 4 entrées A (GitHub) sur la racine, CNAME `www` vers le compte GitHub, anciennes entrées d'OVH supprimées (courrier OVH et lignes Resend conservés), HTTPS activé. Adresses de retour de Supabase (Site URL, Redirect URLs) mises à jour ; l'ancienne adresse reste autorisée le temps des essais. |
| 23 oct. 2026 | Connexion | Essai réel de l'e-mail du lien validé (boîte de réception, lien qui connecte). Texte conservé avec « sur MyRunTools » (spécification générale § 3 corrigée). Trois maquettes d'e-mail sobres proposées dans `docs/maquettes/` (`email-connexion-a`, `-b`, `-c`), choix en attente. |
| 23 oct. 2026 | Connexion | SMTP personnalisé enregistré dans Supabase : Resend (`smtp.resend.com`, port 465), expéditeur « MyRunTools » `connexion@myruntools.fr` ; la clé n'est que dans Supabase. Étape 3 terminée. |
| 23 oct. 2026 | Connexion | Compte Resend créé, domaine `myruntools.fr` ajouté (région Europe), 4 lignes DNS (2 CNAME, 2 TXT dont DMARC) ajoutées chez OVH, domaine vérifié. Étape 2 terminée. |
| 23 oct. 2026 | Connexion | Domaine `myruntools.fr` acheté chez OVH (domaine seul, sans hébergement ni option e-mail), protection des données activée, zone DNS par défaut. Étape 1 terminée. |
| 23 oct. 2026 | Connexion | Supabase exige un service d'envoi (SMTP) pour modifier les e-mails : achat du domaine `myruntools`, envoi par Resend avec une adresse du domaine. |
| 22 oct. 2026 | Connexion | E-mail du lien de connexion en français, au vouvoiement, sobre : objet « Votre lien de connexion à MyRunTools », lien « Me connecter », lien à usage unique. |
| 22 oct. 2026 | Préférences | Essai réel de la page Préférences validé (thème, menu, cap). |
| 22 oct. 2026 | Comptes | Compte du pilote route créé, inscriptions libres désactivées dans Supabase, courses importées ; le pilote route est désormais désigné « le compte test Rome ». Page Calendrier ajoutée à la todo. |
| 21 oct. 2026 | Thèmes | Violet et turquoise n'est plus réservé aux essais : les trois thèmes sont proposés à tous. |
| 21 oct. 2026 | Préférences | Version 1.1 : blocs dans l'ordre Compte, Cap, Thème, Menu, Partage ; plus de mention « essais » ; texte du Partage plus neutre. Tailles de texte des pages fixées dans le design (§ 3), contenu à 0,85 rem par défaut. Maquettes : seulement à la demande. |
| 21 oct. 2026 | Préférences | Spécification 1.0 validée et page construite : thème (aperçu des couleurs), menu (cases, flèches, ordre par défaut, au moins un module), cap (par défaut la plus lointaine) ; enregistrement immédiat ; Thème, Menu et Cap non modifiables sur un site partagé. Mot de passe laissé dans la todo. Textes de la page à 0,85 rem, comme le Palmarès. |
| 21 oct. 2026 | Thèmes | `?t=…` retiré du site : le thème se choisit dans les Préférences seulement (maquettes exceptées). |
| 22 oct. 2026 | En-tête | Disposition reprise de l'ancien site trail, éléments inchangés : sur ordinateur, compte à rebours en bas à droite, aligné sur le bas des indicateurs ; sur téléphone, une colonne, compteur sous les indicateurs, à gauche, nombre de jours en pleine taille ; indicateurs qui passent à la ligne ; marges du haut agrandies (3 rem, 2 rem sur téléphone). (Spécification générale 0.9, design 0.9.) |
| 22 oct. 2026 | Méthode | Pour alléger chaque discussion : journal des décisions sorti du README (`docs/journal.md`) ; banc d'essai versionné (`outils/essais/`, données fictives) ; section « État en cours » dans `CLAUDE.md`. |
| 22 oct. 2026 | En-tête | Sur ordinateur, le nombre de jours du compte à rebours s'aligne sur le nom de la course ; sur téléphone, compteur inchangé, à droite sous les indicateurs. (Spécification générale 0.8, design 0.8.) |
| 22 oct. 2026 | En-tête | Distance et D+ fusionnés en un indicateur « Distance » (« 60 km / 3 500 m D+ »), dénivelé en texte discret ; distance seule sans D+. (Spécification générale 0.7, design 0.7.) |
| 22 oct. 2026 | En-tête | Compte à rebours et prochaine course reviennent en bas à droite (sous les indicateurs sur téléphone) ; « MyRunTools » et l'engrenage restent en haut à droite. (Spécification générale 0.6, design 0.6.) |
| 22 oct. 2026 | Design | Effets de survol réservés aux appareils avec souris : sur iPhone, le bouton de regroupement restait orange après un toucher. |
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
