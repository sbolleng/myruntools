# Documentation du projet

Ce dossier rassemble les spécifications de l'application : ce qu'elle fait, comment elle est organisée, et les décisions prises en chemin. Il est mis à jour en même temps que le code.

> Le dépôt est public : aucune donnée personnelle dans ces fichiers.

## Sommaire

| Document | Contenu | État |
| --- | --- | --- |
| [Spécification générale](specification-generale.md) | Structure commune, en-tête, menu, page de connexion, thèmes, modules, préférences utilisateur, partage en lecture seule, données | Version 0.8 |
| [Design](design.md) | Couleurs des thèmes, typographies, tailles et disposition de l'en-tête, de la page de connexion et du menu, formulaires, bandeau, barre du Palmarès | Version 0.8 |
| [Modèle de données](modele-donnees.md) | Tables Supabase, champs, liens, règles d'accès, partage, ce qui est calculé | Version 0.6 |
| [Module Objectif](module-objectif-specification.md) | Premier module : feuille de route, comptes à rebours, difficulté, suivi en course, météo | Brouillon v0.1 |
| [Module Palmarès](module-palmares-specification.md) | Courses courues : colonnes, types et formats, records, tri, filtres, regroupement par type, édition | Version 1.8 |

Une spécification est rédigée pour chaque module au moment de le construire, pas avant.

Décisions : [journal](journal.md), la plus récente en haut.

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

Todo globale du projet : tout ce qui reste à faire y est noté ; une ligne terminée disparaît (la trace reste dans le [journal](journal.md)).

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
