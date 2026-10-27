# Spécification générale

Version 0.13 · 24 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit ce qui est commun à toute l'application : sa structure, son en-tête, son menu, ses thèmes, le catalogue des modules, les préférences de l'utilisateur et la façon dont les données sont gérées. Chaque module a ensuite sa propre spécification ; l'apparence (couleurs, typographies, tailles) est décrite dans le [document de design](design.md).

## 1. Principe

L'application est une boîte à outils pour coureurs, organisée en **modules**. Un module correspond à un onglet du menu et à une page ; il est développé une seule fois et partagé par tous les utilisateurs, tandis que le contenu reste propre à chacun. Chaque utilisateur choisit les modules utiles à sa pratique, et seuls ceux-ci apparaissent dans son menu.

## 2. Utilisateurs

Deux profils pilotes au lancement :

| Profil | Pratique | Thème |
| --- | --- | --- |
| Pilote trail | Trail | Bleu et orange |
| Pilote route | Route | Vert et rose |

- **Comptes créés par l'administrateur** : pas d'inscription libre. Ajouter un coureur revient à créer son compte, son profil et ses préférences dans la base, sans toucher au code des modules.
- Chaque utilisateur ne voit que ses propres données ; il peut montrer son site à un autre, en lecture seule (§ 9).
- La pratique ne fixe que le thème proposé au départ (§ 6) ; modules, cap et contenus sont propres à chacun.

## 3. Structure commune

Chaque page suit le même gabarit, de haut en bas :

1. **En-tête** (§ 4), identique sur toutes les pages.
2. **Menu** (§ 5).
3. **Contenu du module**.

L'en-tête et le menu forment un bloc commun, écrit une seule fois et repris par chaque page. Chaque module a sa propre page : changer d'onglet, c'est ouvrir la page du module.

**Exception : la page de connexion.** Seule page visible sans être connecté, elle n'a ni en-tête ni menu : le nom de l'application, une accroche (« La boîte à outils du coureur »), un champ « Adresse e-mail », un bouton « Recevoir le lien de connexion » et une ligne d'aide qui accueille aussi les messages (envoi, erreur). Le lien n'est envoyé qu'aux comptes existants ; au retour du lien, l'utilisateur arrive connecté sur l'accueil.

**E-mail du lien**, en français, au vouvoiement. Objet : « Votre lien de connexion à MyRunTools ». Texte : « Bonjour, cliquez sur le lien ci-dessous pour vous connecter sur MyRunTools : Me connecter. Ce lien ne sert qu'une fois. Si vous n'avez rien demandé, ignorez cet e-mail. » Expéditeur : une adresse du domaine de l'application, envoyée par un service d'envoi d'e-mails branché sur la base.

**Affichage d'une page.** Une page privée reste invisible tant que la session n'est pas vérifiée, que l'en-tête n'est pas dessiné et que son contenu n'est pas prêt, puis elle apparaît d'un seul coup : l'en-tête ne s'ajoute jamais après coup en poussant le contenu vers le bas, sur ordinateur comme sur téléphone. Si un chargement échoue, la page apparaît quand même au bout de quelques secondes.

Règles transverses :

- **Priorité au téléphone** : la mise en page est conçue d'abord pour un écran de 390 px de large, puis élargie. Seuil de bascule téléphone / ordinateur : 600 px.
- **Rechargement automatique** : quand une nouvelle version du site est en ligne, la page se recharge d'elle-même, une seule fois par version (utile sur iPhone, qui garde les pages en cache).
- **Affichage automatique** : un bloc qui dépend de données (météo, suivi en course, graphique) apparaît de lui-même dès que ces données existent ; l'utilisateur n'a rien à activer. Chaque bloc est décrit dans la spécification de son module.
- **Aucune donnée inventée** : un champ sans valeur n'est pas affiché, ou affiche « — ».

## 4. En-tête

L'en-tête présente le **cap** de l'utilisateur : une course choisie dans les Préférences utilisateur ou depuis la page Objectif, par défaut la dernière de la page Objectif (la plus lointaine à venir) ; ses chiffres clés et le temps qui reste. Si cette course est courue ou abandonnée, l'en-tête revient au cap par défaut.

### Contenu

| Élément | Règle |
| --- | --- |
| Titre | « Cap sur » sur une ligne, puis le nom officiel de la course objectif, en couleur d'accent, sur la ligne suivante |
| Indicateurs | Une valeur, avec son libellé dessous. Dans l'ordre : Distance, Date, Objectif, D'ici là |
| Compte à rebours | Nombre de jours en grand, « jours » dessous, puis heures, minutes et secondes ; mis à jour chaque seconde. Sur ordinateur, en bas à droite de l'en-tête, son bas au niveau du bas des indicateurs ; sur téléphone, sous les indicateurs, à gauche |
| Prochaine course | « prochaine course · nom de la course · J-n », sous le compte à rebours. Le nom est celui de la course, pas de son parcours (« L'Hivernale des Templiers », pas « Le Rock'Angel ») |
| Nom de l'application | « MyRunTools », en petites capitales, en haut à droite, à la hauteur du titre |
| Engrenage ⚙️ | À droite du nom de l'application ; ouvre les Préférences utilisateur (§ 8) |
| Filet | Barre fine aux couleurs du thème, sous l'en-tête |

### Indicateurs

| Libellé | Valeur | Source |
| --- | --- | --- |
| Distance | Distance officielle de la course objectif, suivie de son dénivelé positif quand il est connu (« 60 km / 3 500 m D+ ») ; sinon la distance seule | Course objectif |
| Date | Date de la course objectif | Course objectif |
| Objectif | Temps visé ou intention (« Finisher », « Moins de 4 h »…) | Champ « objectif » de la course de l'en-tête, saisi sur la page Objectif |
| D'ici là | Nombre de courses prévues avant l'objectif | Calculé : nombre de blocs de course de la page Objectif |

### Formats

- **Distance** : kilomètres, virgule décimale, espace avant l'unité, autant de décimales que la distance officielle (« 60 km », « 42,195 km »). Dénivelé, s'il est connu : « / », puis les mètres avec une espace pour les milliers, puis « D+ » (« 60 km / 3 500 m D+ »).
- **Date** : jour, mois en toutes lettres, année (« 30 août 2029 »). Jour inconnu : mois et année seulement (« août 2029 »).
- **D'ici là** : nombre suivi de « course » ou « courses » (« 1 course », « 12 courses »).
- **J-n** : nombre de jours calendaires jusqu'à la prochaine course.

### Règles

- **Compte à rebours** : jusqu'à l'heure de départ de la course objectif quand elle est connue (heure locale de la course, comme les comptes à rebours de la page Objectif) ; sinon jusqu'au jour de la course, à minuit. Si seul le mois est connu, jusqu'au premier jour du mois, à minuit.
- **Prochaine course** : la première course Confirmée à venir de la page Objectif, hors la course du cap. Une option non retenue ne compte pas.
- **En attendant les modules concernés** : course de l'en-tête, objectif et prochaine course sont écrits en dur dans la page de démonstration.

### Cas limites

- Aucune course à venir : la ligne « prochaine course » est masquée.
- Aucune course avant l'objectif : D'ici là affiche « — ».
- Objectif passé : le compteur affiche « Course courue » jusqu'à la définition d'un nouvel objectif.
- Valeur absente (pas d'objectif renseigné, distance inconnue) : l'indicateur affiche « — ».

## 5. Menu

- Une barre d'onglets sous l'en-tête, un onglet par module choisi par l'utilisateur, dans l'ordre qu'il a choisi (§ 8). L'onglet de la page ouverte est mis en avant.
- Sur téléphone, la barre défile horizontalement ; elle reste visible en haut de l'écran quand on fait défiler la page.

## 6. Thèmes

- Chaque utilisateur choisit un thème parmi ceux proposés ; un thème ne change que les couleurs, jamais la mise en page.
- Trois thèmes : **Bleu et orange**, **Vert et rose**, et **Violet et turquoise**, proposés à tous. Valeurs dans le [document de design](design.md).
- Aucune couleur libre : l'utilisateur choisit un thème, pas des couleurs une à une.

## 7. Catalogue des modules

| Module | Rôle | Jalon |
| --- | --- | --- |
| Objectif | Feuille de route jusqu'à la course objectif ([spécification](module-objectif-specification.md)) | 1 |
| Calendrier | Saison en trois vues : année, quatre semaines, plan d'une course ([spécification](module-calendrier-specification.md)) | 1 |
| Nutrition | Journal alimentaire, cibles du jour, calcul du besoin, conseils | 1 |
| Courses à surveiller | Veille des courses envisagées : dates, ouverture des inscriptions, index UTMB | 2 |
| Guide | Articles et fiches pratiques, publics ou privés | 2 |
| Profil | Données du coureur : état civil, poids, taille, pointure, zones d'entraînement, records | 2 |
| Palmarès | Historique des courses et des performances ([spécification](module-palmares-specification.md)) | 2 |
| Cette semaine | Synthèse des sept prochains jours, assemblée à partir des autres modules | 2 |
| Calculatrice | Allure, vitesse, temps de passage, VMA, km-effort, pente, ravitaillement | À positionner |
| Logistique | Transport, hébergement, retrait des dossards, horaires | À positionner |
| Matériel | Chaussures et leur usure, inventaire, matériel obligatoire, listes de sac | À positionner |

Pour que Cette semaine fonctionne, chaque module devra pouvoir dire ce qui compte dans les sept prochains jours.

## 8. Préférences utilisateur

Page ouverte par l'engrenage de l'en-tête, hors du menu. Elle rassemble les réglages du site ; les données du coureur vont dans Profil, ses chaussures dans Matériel, pour qu'une donnée ne se saisisse qu'à un seul endroit. Détail : [spécification des Préférences](module-preferences-specification.md).

| Réglage | Effet |
| --- | --- |
| Thème | Couleurs du site (§ 6) |
| Modules | Modules affichés dans le menu, et leur ordre |
| Partage | Personnes avec qui je partage mon site, en lecture seule ; sites partagés avec moi (§ 9) |
| Cap | Course affichée dans le titre de l'en-tête, choisie parmi celles de la page Objectif (choix aussi possible depuis la page Objectif) ; par défaut la plus lointaine |
| Compte | Nom, adresse de connexion, déconnexion |

Changement de mot de passe : plus tard (connexion par lien magique seulement pour l'instant).

## 9. Partage en lecture seule

Un utilisateur peut montrer son site à un autre, par exemple pour avoir son avis : celui-ci le voit tel quel, sans rien pouvoir modifier. L'accord se retire à tout moment.

**Partager** (Préférences, bloc « Partage ») :

- « Partager mon site avec » : l'e-mail d'un compte existant, puis « Partager ». Adresse sans compte : « Aucun compte avec cette adresse ».
- Dessous, les personnes avec qui je partage, chacune avec « Retirer ».

**Voir un site partagé** (même bloc) :

- « Sites partagés avec moi » : les personnes qui me partagent leur site, chacune avec « Voir son site ».
- Dans ce mode, sur toutes les pages, un bandeau sous le menu : « Lecture seule · site de Prénom », avec « Revenir à mon site ».
- On voit son en-tête (cap, D'ici là, prochaine course), son menu, son thème et ses modules ; rien ne s'y ajoute, ne s'y modifie ni ne s'y supprime.
- Le mode est retenu sur l'appareil jusqu'à « Revenir à mon site ». Si l'accord est retiré, le site partagé disparaît de la liste et l'on revient à son propre site.

**Ce qui est partagé** : les courses et leurs circuits, les préférences (thème, menu, cap) et, du profil, seulement le prénom, le nom et le sexe. Jamais les données de santé (poids, taille, pointure, fréquences cardiaques, VMA, VO2 max, date de naissance) ni l'équipement.

Le propriétaire du projet Supabase garde, lui, l'accès à toute la base depuis le tableau de bord : le partage ne concerne que le site.

## 10. Administration : deux temps

| Fonction | V1 · fichiers de données | V2 · Supabase |
| --- | --- | --- |
| Choisir ses modules et son thème | Configuration de l'utilisateur, modifiée dans le dépôt | Préférences utilisateur |
| Saisir ou modifier le contenu (courses, repas…) | Fichiers de données modifiés via Claude | Formulaires dans l'application, ou dictée à Claude |
| Importer ses séances | Saisie via Claude | Import automatique depuis Strava, après autorisation unique |
| Voir ses données | Visibles de tous | Visibles du seul utilisateur connecté |

## 11. Données et confidentialité

- **Trois couches** : les modules (affichage), le contenu et les préférences de chaque utilisateur, et entre les deux une couche d'accès aux données. Les modules ne savent pas d'où viennent les données : passer des fichiers à Supabase ne réécrit aucun module.
- **Protection du site** : par la connexion Supabase. Sans connexion, toute page renvoie vers la page de connexion, sans rien montrer de son contenu ; des règles par ligne garantissent que chacun n'accède qu'à ses propres données. Tant qu'un contenu est écrit dans le code plutôt que rangé dans Supabase, il reste lisible par qui consulte le dépôt public.
- **Clés** : seule la clé publique de Supabase figure dans le code ; la clé de service et le secret Strava restent côté serveur (fonctions Supabase), jamais dans le dépôt.
- **Tiers** : aucun nom complet de tiers, aucune référence de réservation.
- **Ouverture à d'autres coureurs** : poids, repas et séances sont des données de santé au sens du RGPD ; l'ouverture suppose une politique de confidentialité, l'export et la suppression des données sur demande, et la validation de l'application par Strava.

## 12. Technique

| Sujet | Choix |
| --- | --- |
| Code | HTML, CSS et JavaScript natifs, sans framework ni étape de compilation |
| Pages | Une page HTML par module ; en-tête et menu fournis par un composant partagé |
| Hébergement | GitHub Pages, publication automatique à chaque mise à jour de `main` |
| Base de données | Supabase (PostgreSQL), offre gratuite |
| Météo | Open-Meteo : gratuit, sans clé, modèle européen ECMWF inclus |
| Bilan hebdomadaire | Routine Claude |
| Cache navigateur | Numéro de version posé automatiquement dans les liens CSS et JS à chaque publication |

## 13. Contrôles

Jeu d'essai : un objectif de trail, « Trail des Crêtes », 60 km, 3 500 m D+, en août 2029, jour inconnu ; 12 courses avant lui ; objectif « Finisher » ; prochaine course « Trail du Lac » le 15 novembre 2026 ; date du jour : 20 octobre 2026.

Résultats attendus :

- Titre : « Cap sur » puis « Trail des Crêtes » en couleur d'accent.
- Indicateurs, dans l'ordre : « 60 km / 3 500 m D+ » Distance, « août 2029 » Date, « Finisher » Objectif, « 12 courses » D'ici là.
- Le compte à rebours vise le 1er août 2029 à minuit.
- Même objectif, départ connu le 30 août 2029 à 5 h : le compte à rebours vise le 30 août 2029 à 5 h.
- Ligne sous le compteur : « prochaine course · Trail du Lac · J-26 ».
- Disposition : « MyRunTools » en haut à droite, à la hauteur de « Cap sur » ; sur ordinateur, compte à rebours et prochaine course alignés à droite, leur bas au niveau du bas des indicateurs ; sur téléphone, sous les indicateurs, alignés à gauche.
- Même objectif sans D+ (42,195 km) : Distance affiche « 42,195 km » seul ; l'en-tête garde 4 indicateurs.
- Date connue au jour près (30 août 2029) : Date affiche « 30 août 2029 », le compteur vise le 30 août.
- Une seule course avant l'objectif : « 1 course ».
- Sans objectif renseigné : l'indicateur Objectif affiche « — ».
- Thème changé : seules les couleurs changent, les positions et tailles restent identiques.
- L'engrenage ouvre la page des Préférences utilisateur ; le menu ne montre que les modules choisis, dans l'ordre choisi.
- Sans connexion, ouvrir l'accueil, le Palmarès ou les Préférences renvoie vers la page de connexion, sans afficher leur contenu.
- Page de connexion : ni en-tête ni menu ; une adresse inconnue reçoit le message « Lien non envoyé » ; le lien reçu ramène sur l'accueil, connecté.
- A partage son site avec B : B voit A dans « Sites partagés avec moi » ; « Voir son site » affiche l'en-tête, le menu, le thème et le Palmarès de A, avec le bandeau « Lecture seule · site de A ».
- Dans ce mode, B ne peut rien ajouter, modifier ni supprimer, même en interrogeant directement la base ; il ne lit ni le poids ni la VMA de A.
- A retire le partage : à sa visite suivante, B revient sur son propre site et A disparaît de sa liste.
- Partager avec une adresse sans compte : « Aucun compte avec cette adresse ».
- Chargement d'une page (accueil, Palmarès, Préférences ; ordinateur, tablette, téléphone) : à l'instant où elle devient visible, l'en-tête est en place et le contenu n'a plus à bouger.
