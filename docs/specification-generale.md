# Spécification générale

Version 0.22 · 30 octobre 2026 · [Retour au sommaire](README.md)

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

1. **En-tête** (§ 4), sur la **page de démarrage** seulement : la page qui s'ouvre en arrivant sur le site : le premier module construit du menu (par défaut En un coup d'œil, § 5 bis).
2. **Menu** (§ 5), sur toutes les pages.
3. **Contenu du module**.

L'en-tête et le menu forment un bloc commun, écrit une seule fois et repris par chaque page. Chaque module a sa propre page : changer d'onglet, c'est ouvrir la page du module. Ailleurs que sur la page de démarrage (Palmarès, Préférences, page d'une course…), une barre fine remplace l'en-tête : « Cap sur » et le nom du cap (vers l'Accueil), et l'engrenage ; l'en-tête complet n'y ferait que repousser le contenu, ou concurrencer le titre de la page.

**Exception : la page de connexion.** Seule page visible sans être connecté, elle n'a ni en-tête ni menu. Connexion par **adresse e-mail et mot de passe** (décidé le 30 oct. 2026 ; plus de lien magique, pas de second facteur). Les comptes sont créés à la main : aucune inscription.

```
┌────────────────────────────┐
│ MyRunTools                 │
│ La boîte à outils du coureur│
│ (L1) Adresse e-mail        │
│ (L2) Mot de passe     (L3) 👁│
│ (L4) Mot de passe oublié ? │
│ (L5) [Se connecter]        │
│ (L6) message               │
└────────────────────────────┘
```

| N° | Élément | Règle |
| --- | --- | --- |
| L1, L2 | Adresse e-mail, mot de passe | Le navigateur peut les mémoriser ; le collage est permis |
| L3 | Œil | Affiche ou masque le mot de passe |
| L4 | « Mot de passe oublié ? » | Envoie le lien de réinitialisation à l'adresse saisie en L1 (message « Saisis ton adresse e-mail » si le champ est vide) ; la réponse est toujours « Si un compte existe pour cette adresse, un e-mail vient d'être envoyé. », que l'adresse existe ou non |
| L5 | « Se connecter » | Désactivé pendant l'envoi ; connecté, direction l'accueil |
| L6 | Message | Une seule erreur pour tout échec : « Adresse ou mot de passe incorrect. » (on ne dit jamais lequel) ; « Trop de tentatives, réessaie dans quelques minutes. » en cas de limitation |

**Règles du mot de passe** : 14 caractères au moins, aucune règle de composition (une phrase de passe longue protège mieux) ; refusé s'il est identique à l'adresse e-mail. Il est haché par Supabase ; il ne figure jamais dans le dépôt et n'est jamais affiché en dehors de l'œil (L3).

**Nouveau mot de passe** : le lien reçu par e-mail ouvre une page du même gabarit que la connexion, avec « Nouveau mot de passe » (L10), « Confirmation » (L11) et « Enregistrer » (L12) ; les deux saisies doivent être identiques. Enregistré, l'utilisateur est connecté et arrive sur l'accueil. Le lien ne sert qu'une fois et expire au bout d'une heure ; périmé ou déjà utilisé : « Lien expiré : demande-en un nouveau. » avec retour à la page de connexion.

**Premier accès** : les comptes existants n'ont pas encore de mot de passe ; on le choisit par « Mot de passe oublié ? ».

**Protection contre les essais** : limitation des demandes et des tentatives par Supabase, et contrôle anti-robot (Cloudflare Turnstile ou hCaptcha) sur la page de connexion. Après un changement de mot de passe, les autres appareils sont déconnectés.

**E-mail de réinitialisation**, en français, au vouvoiement. Objet : « Réinitialisation de votre mot de passe MyRunTools ». Texte : « Bonjour, cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe : Choisir un mot de passe. Ce lien ne sert qu'une fois et expire dans une heure. Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe reste inchangé. » **E-mail d'alerte** après chaque changement : « Le mot de passe de votre compte MyRunTools vient d'être modifié. Si ce n'est pas vous, répondez à ce message. » Expéditeur : une adresse du domaine de l'application, envoyée par un service d'envoi d'e-mails branché sur la base.

**Affichage d'une page.** Une page privée reste invisible tant que la session n'est pas vérifiée, que le menu (et l'en-tête, s'il y en a un) n'est pas dessiné et que son contenu n'est pas prêt, puis elle apparaît d'un seul coup : l'en-tête et le menu ne s'ajoutent jamais après coup en poussant le contenu vers le bas, sur ordinateur comme sur téléphone. Si un chargement échoue, la page apparaît quand même au bout de quelques secondes.

Règles transverses :

- **Priorité au téléphone** : la mise en page est conçue d'abord pour un écran de 390 px de large, puis élargie. Seuil de bascule téléphone / ordinateur : 600 px. Un téléphone tenu en largeur garde la taille de texte et les marges du téléphone.
- **Règles de style communes** : une seule apparence pour tout le site (couleurs, capitales, cadres, boutons, titres repliables), décrite dans le [document de design](design.md), § 1.
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
| Compte à rebours | Nombre de jours en grand, « jours » dessous, puis heures, minutes et secondes ; mis à jour chaque seconde. Sur ordinateur, en bas à droite de l'en-tête, son bas au niveau du bas des indicateurs ; sur téléphone, sur une ligne, juste sous le nom de la course, à gauche |
| Prochaine course | « prochaine course · nom de la course · J-n », sous le compte à rebours ; sur téléphone, à part, sous les indicateurs et un filet. Le nom est celui de la course, pas de son parcours (« L'Hivernale des Templiers », pas « Le Rock'Angel ») |
| Nom de l'application | « MyRunTools », en petites capitales, en haut à droite, à la hauteur du titre |
| Engrenage ⚙️ | À droite du nom de l'application ; ouvre les Préférences utilisateur (§ 8) |
| Filet | Barre fine aux couleurs du thème, sous l'en-tête |

**Barre fine**, sur les pages sans en-tête : « Cap sur » et le nom du cap à gauche, discrets, qui mènent à la page de démarrage ; l'engrenage à droite.

### Indicateurs

| Libellé | Valeur | Source |
| --- | --- | --- |
| Distance | Distance officielle de la course objectif, suivie de son dénivelé positif quand il est connu (« 60 km / 3 500 m D+ ») ; sinon la distance seule | Course objectif |
| Date | Date de la course objectif | Course objectif |
| Objectif | Temps visé ou intention (« Finisher », « Moins de 4 h »…) | Champ « objectif » de la course de l'en-tête, saisi sur la page Objectif |
| D'ici là | Nombre de courses prévues avant l'objectif | Calculé : nombre de blocs de course de la page Objectif |

### Formats

- **Distance** : kilomètres, virgule décimale, espace avant l'unité, autant de décimales que la distance officielle (« 60 km », « 42,195 km »). Dénivelé, s'il est connu : « / », puis les mètres avec une espace pour les milliers, puis « D+ » (« 60 km / 3 500 m D+ »).
- **Date** : jour, mois en toutes lettres, année (« 30 août 2029 »). Date approximative (seul le mois est connu) : mois et année seulement (« août 2029 »).
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

- **En un coup d'œil** (l'ancien Accueil) : un module comme les autres, le premier par défaut ; il se masque et se déplace. Son onglet s'écrit « En un coup d' » suivi d'un picto d'œil.

- Une barre d'onglets, sous l'en-tête quand il y en a un, sinon en haut de la page : un onglet par module choisi par l'utilisateur, dans l'ordre qu'il a choisi (§ 8). L'onglet de la page ouverte est mis en avant.
- Sur téléphone, la barre défile horizontalement ; l'onglet de la page ouverte y est ramené. Elle reste visible en haut de l'écran quand on fait défiler la page.

## 5 bis. En un coup d'œil et page de démarrage

- **Page de démarrage** : le premier module construit du menu, dans l'ordre choisi dans les Préférences ; rien d'autre à choisir. Par défaut En un coup d'œil. En arrivant sur le site (adresse tapée, nouvel onglet, retour du lien de connexion), on y arrive directement, avec le grand en-tête ; l'onglet En un coup d'œil, touché depuis le site, ouvre bien cette page.
- **Grand en-tête** sur la page de démarrage seulement ; partout ailleurs, la barre fine (« Cap sur … » et l'engrenage). La page d'une course a toujours la barre fine.
- **Passage** : en quittant la page de démarrage, le grand en-tête se réduit en barre fine (0,45 s) ; en y revenant, il se déplie. Rien au premier affichage, ni quand l'utilisateur a demandé à réduire les animations.
- **En un coup d'œil** : des blocs, deux colonnes sur ordinateur, une sur téléphone, choisis et rangés dans les Préférences :

| Bloc | Contenu | Par défaut |
| --- | --- | --- |
| Prochaine course | La carte de la prochaine course confirmée, comme sur la feuille de route ; lien vers la feuille de route | Affiché |
| Pense-bête | Rappels tirés des courses (inscriptions, objectifs à fixer…) et notes perso · bientôt, grisé | Affiché |
| Bilan nutrition | Plan de ravitaillement de la prochaine course, avec le module Nutrition · bientôt, grisé | Affiché |
| D'ici là | Les étapes de la feuille de route jusqu'au cap compris, le cap en Accent | Affiché |
| Dernière course | Nom, date, temps (hh:mm:ss) et allure de la dernière course courue ; lien vers le Palmarès | Masqué |

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

Page ouverte par l'engrenage de l'en-tête ou de la barre fine ; elle n'est pas un module du menu. Elle rassemble les réglages du site ; les données du coureur vont dans Profil, ses chaussures dans Matériel, pour qu'une donnée ne se saisisse qu'à un seul endroit. Détail : [spécification des Préférences](module-preferences-specification.md).

| Réglage | Effet |
| --- | --- |
| Thème | Couleurs du site (§ 6) |
| Modules | Modules affichés dans le menu, et leur ordre |
| Partage | Personnes avec qui je partage mon site, en lecture seule ; sites partagés avec moi (§ 9) |
| Cap | Course affichée dans le titre de l'en-tête, choisie parmi celles de la page Objectif (choix aussi possible depuis la page Objectif) ; par défaut la plus lointaine |
| Compte | Nom, adresse de connexion, déconnexion |

Changement de mot de passe : dans le bloc Compte (spécification des Préférences, § 6).

## 9. Partage en lecture seule

Un utilisateur peut montrer son site à un autre, par exemple pour avoir son avis : celui-ci le voit tel quel, sans rien pouvoir modifier. L'accord se retire à tout moment.

**Partager** (Préférences, bloc « Partage ») :

- « Partager mon site avec » : l'e-mail d'un compte existant, puis « Partager ». Adresse sans compte : « Aucun compte avec cette adresse ».
- Dessous, les personnes avec qui je partage, chacune avec « Retirer ».

**Voir un site partagé** (même bloc) :

- « Sites partagés avec moi » : les personnes qui me partagent leur site, chacune avec « Voir son site ».
- Dans ce mode, sur toutes les pages, un bandeau sous le menu : « Lecture seule · site de Prénom », avec « Revenir à mon site ».
- On voit son en-tête (cap, D'ici là, prochaine course), son menu, son thème et ses modules ; rien ne s'y ajoute, ne s'y modifie ni ne s'y supprime. Son thème s'applique sur toutes les pages, à la place de celui du visiteur, y compris en passant d'une page à l'autre.
- Pas d'engrenage (Préférences) dans l'en-tête ni dans la barre fine : on en sort par « Revenir à mon site ».
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
- Disposition : « MyRunTools » en haut à droite, à la hauteur de « Cap sur » ; sur ordinateur, compte à rebours et prochaine course alignés à droite, leur bas au niveau du bas des indicateurs ; sur téléphone, sous les indicateurs, alignés à gauche, le nombre de jours et les heures sur une ligne.
- Même objectif sans D+ (42,195 km) : Distance affiche « 42,195 km » seul ; l'en-tête garde 4 indicateurs.
- Date connue au jour près (30 août 2029) : Date affiche « 30 août 2029 », le compteur vise le 30 août.
- Une seule course avant l'objectif : « 1 course ».
- Sans objectif renseigné : l'indicateur Objectif affiche « — ».
- Thème changé : seules les couleurs changent, les positions et tailles restent identiques.
- L'engrenage (en-tête, ou barre fine) ouvre la page des Préférences utilisateur ; le menu ne montre que les modules choisis, dans l'ordre choisi.
- Par défaut, l'en-tête figure sur En un coup d'œil seulement ; la feuille de route, le Palmarès, les Préférences et la page d'une course ont la barre fine « Cap sur Trail des Crêtes » et l'engrenage.
- Téléphone : le compte à rebours juste sous le nom de la course, au-dessus des indicateurs ; la prochaine course à part, sous les indicateurs.
- Sans connexion, ouvrir l'accueil, le Palmarès ou les Préférences renvoie vers la page de connexion, sans afficher leur contenu.
- Page de connexion : ni en-tête ni menu ; adresse, mot de passe, œil, « Mot de passe oublié ? ».
- Bon mot de passe : connecté, direction l'accueil. Mauvais mot de passe ou adresse inconnue : le même message « Adresse ou mot de passe incorrect. ».
- « Mot de passe oublié ? » : même réponse pour une adresse connue et pour une inconnue ; champ vide : « Saisis ton adresse e-mail ».
- Nouveau mot de passe : 13 caractères refusés, deux saisies différentes refusées, 14 caractères identiques acceptés ; enregistré, connecté sur l'accueil ; lien périmé : « Lien expiré : demande-en un nouveau. ».
- L'œil affiche puis masque le mot de passe.
- A partage son site avec B : B voit A dans « Sites partagés avec moi » ; « Voir son site » affiche l'en-tête, le menu, le thème et le Palmarès de A, avec le bandeau « Lecture seule · site de A ».
- Dans ce mode, B ne peut rien ajouter, modifier ni supprimer, même en interrogeant directement la base ; il ne lit ni le poids ni la VMA de A.
- A retire le partage : à sa visite suivante, B revient sur son propre site et A disparaît de sa liste.
- Partager avec une adresse sans compte : « Aucun compte avec cette adresse ».
- Chargement d'une page (accueil, Palmarès, Préférences, feuille de route, page d'une course ; ordinateur, tablette, téléphone) : à l'instant où elle devient visible, le menu (et l'en-tête) est en place et le contenu n'a plus à bouger.
- En un coup d'œil par défaut : grand en-tête, son onglet en premier, « œil » en picto ; blocs Prochaine course (Trail du Lac), Pense-bête et Bilan nutrition grisés, D'ici là jusqu'au Trail des Crêtes en Accent.
- Blocs choisis « Dernière course, Prochaine course » : dans cet ordre ; la dernière course montre son temps en hh:mm:ss.
- Objectif en tête du menu : ouvrir le site mène à la feuille de route, avec le grand en-tête ; toucher Palmarès : barre fine, l'en-tête se réduit ; toucher En un coup d'œil : cette page, en barre fine ; revenir à Objectif : l'en-tête se déplie.
- En un coup d'œil masqué dans le menu (Cette semaine, Objectif, Palmarès) : ouvrir le site mène à Objectif, avec le grand en-tête ; le nom de l'application y mène aussi.
