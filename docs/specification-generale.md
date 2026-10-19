# Spécification générale

Brouillon v0.1 · 5 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit ce qui est commun à toute l'application : sa structure, son en-tête, ses thèmes, le catalogue des modules, ce que l'utilisateur peut administrer lui-même, et la façon dont les données sont gérées. Chaque module a ensuite sa propre spécification.

## 1. Principe

L'application est une boîte à outils pour coureurs, organisée en **modules**. Un module correspond à un onglet ; il est développé une seule fois et partagé par tous les utilisateurs, tandis que le contenu reste propre à chacun. Chaque utilisateur active les modules utiles à sa pratique, et seuls ceux-ci apparaissent dans sa navigation.

## 2. Utilisateurs

| Profil | Pratique | Thème | Objectif final |
| --- | --- | --- | --- |
| Pilote trail | Trail | Bleu et orange | UTMB OCC, août 2028 |
| Pilote route | Route | Vert et rose | Marathon de Rome, mars 2028 |

L'application est conçue pour accueillir d'autres coureurs plus tard ; ajouter un utilisateur revient à créer sa configuration, sans toucher au code des modules.

## 3. Structure commune

Chaque page suit le même gabarit, de haut en bas :

1. **En-tête** (chapitre 4), identique sur toutes les pages.
2. **Navigation** : une barre d'onglets, un onglet par module activé, dans l'ordre choisi par l'utilisateur. L'onglet courant est souligné en couleur d'accent. Sur téléphone, la barre défile horizontalement.
3. **Contenu du module**.

Règles transverses :

- **Priorité au téléphone** : la mise en page est conçue d'abord pour un écran de 390 px de large, puis élargie. Seuil de bascule téléphone / ordinateur : 600 px.
- **Rechargement automatique** : quand une nouvelle version du site est en ligne, la page se recharge d'elle-même (utile sur iPhone, qui garde les pages en cache). Une seule fois par version.
- **Fonctions avancées actives par défaut** : une brique dynamique (suivi en course, météo, graphique) s'affiche dès que les données nécessaires existent, sans réglage.
- **Aucune donnée inventée** : un champ sans valeur n'est pas affiché, ou affiche « — ».

## 4. En-tête

### Contenu

| Élément | Règle |
| --- | --- |
| Type de course | « Objectif » suivi du type (Trail long, Marathon…), en couleur de texte |
| Nom de l'objectif | Nom de la course objectif, en couleur d'accent, sous le type |
| Quatre indicateurs | Distance, D+, Objectif (temps ou « Finisher »), Date. Valeur en couleur d'accent, libellé dessous en petites capitales |
| Prochaine étape | Ligne « prochaine étape · **nom de la course** · J-n », sous les indicateurs, en texte discret, le nom en couleur de texte |
| Compte à rebours | Nombre de jours en grand, « jours » dessous, puis heures, minutes et secondes ; mis à jour chaque seconde |
| Nom de l'application | En petites capitales, tout en haut à droite, suivi de l'engrenage qui ouvre les Réglages |
| Filet | Barre fine en dégradé des couleurs du thème, sous le contenu |

Formats :

- **Distance** : en km, virgule décimale (« 42,195 km ») ; fourchette autorisée (« 55–57 km »).
- **D+** : en km, arrondi au dixième (« 3,5 km ») ; « — » quand il est négligeable (route).
- **Date** : mois et année, ou approximation (« Mi-mars 2028 »).
- **J-n** : nombre de jours calendaires jusqu'à la prochaine course datée de la feuille de route.

### Disposition

- **Le compteur ne change jamais de place** : il est à droite du titre, son haut aligné sur la ligne « Objectif », quelle que soit la résolution.
- **Ordinateur** : titre et indicateurs à gauche, indicateurs sur une ligne, prochaine étape dessous ; compteur à droite.
- **Téléphone** : même alignement du compteur ; indicateurs en grille de deux colonnes ; prochaine étape alignée à gauche, sous la grille.

### Cas limites (à valider)

- Aucune course à venir dans la feuille de route : la ligne « prochaine étape » est masquée.
- Objectif passé : le compteur affiche « Course courue » jusqu'à la définition d'un nouvel objectif.

## 5. Thèmes

Un thème par pratique ; seules les couleurs changent, la mise en page est identique.

| Rôle | Trail | Route |
| --- | --- | --- |
| Fond | `#060b14` | `#0E1D19` |
| Surface | `#122a4a` | `#18332E` |
| Surface 2 | `#163a66` | `#21453D` |
| Bordure | `#1f4c80` | `#2F5A4E` |
| Accent | `#ffb700` | `#D07B87` |
| Accent 2 | `#ffd400` | `#B76E78` |
| Texte | `#eef3fa` | `#EDF2E9` |
| Texte discret | `#8fa8c9` | `#8FA391` |

Typographies : Space Grotesk pour les textes, Space Mono pour les chiffres et les libellés.

## 6. Catalogue des modules

| Module | Rôle | Jalon |
| --- | --- | --- |
| Objectif | Feuille de route jusqu'à la course objectif ([spécification](module-objectif-specification.md)) | 1 |
| Réglages | Activation des modules, thème, compte | 1 |
| Nutrition | Journal alimentaire, cibles du jour, calcul du besoin, conseils | 1 |
| Courses à surveiller | Veille des courses envisagées : dates, ouverture des inscriptions, index UTMB | 2 |
| Guide | Articles et fiches pratiques, publics ou privés | 2 |
| Profil | Données personnelles, zones d'entraînement, records | 2 |
| Palmarès | Historique des courses et des performances ([spécification](module-palmares-specification.md)) | 2 |
| Cette semaine | Synthèse des sept prochains jours, assemblée à partir des autres modules | 2 |
| Calculatrice | Allure, vitesse, temps de passage, VMA, km-effort, pente, ravitaillement | À positionner |
| Logistique | Transport, hébergement, retrait des dossards, horaires | À positionner |
| Matériel | Inventaire, usure des chaussures, matériel obligatoire, listes de sac | À positionner |

Pour que Cette semaine fonctionne, chaque module devra pouvoir dire ce qui compte dans les sept prochains jours.

## 7. Administration par l'utilisateur

L'administration se fait en deux temps : sans comptes au départ, avec comptes une fois Supabase en place.

| Fonction | V1 · fichiers de données | V2 · Supabase |
| --- | --- | --- |
| Activer ou désactiver un module | Configuration de l'utilisateur, modifiée dans le dépôt | Page Réglages |
| Choisir son thème | Configuration de l'utilisateur | Page Réglages |
| Saisir ou modifier le contenu (courses, repas…) | Fichiers de données modifiés via Claude (commande `/maj`) | Formulaires dans l'application, ou dictée à Claude |
| Importer ses séances | Saisie via Claude | Import automatique depuis Strava, après autorisation unique |
| Voir ses données | Visibles de tous | Visibles du seul utilisateur connecté |

Supabase est mis en place dès le jalon 1 : la page Objectif sert de preuve de concept, premier module branché sur la base. La V1 reste le point de départ des contenus existants, migrés au fil des modules.

## 8. Données et confidentialité

- **Trois couches** : les modules (affichage), le contenu et la configuration de chaque utilisateur, et entre les deux une couche d'accès aux données. Les modules ne savent pas d'où viennent les données : passer des fichiers à Supabase ne réécrit aucun module.
- **Protection du site** : par la connexion Supabase. Sans compte, on ne voit qu'un écran de connexion ; des règles par ligne garantissent que chacun n'accède qu'à ses propres données. Tant qu'un contenu n'a pas migré dans Supabase, il reste public.
- **Clés** : seule la clé publique de Supabase figure dans le code ; la clé de service et le secret Strava restent côté serveur (fonctions Supabase), jamais dans le dépôt.
- **Tiers** : aucun nom complet de tiers, aucune référence de réservation.
- **Ouverture à d'autres coureurs** : poids, repas et séances sont des données de santé au sens du RGPD ; l'ouverture suppose une politique de confidentialité, l'export et la suppression des données sur demande, et la validation de l'application par Strava.

## 9. Technique

| Sujet | Choix |
| --- | --- |
| Code | HTML, CSS et JavaScript natifs, sans framework ni étape de compilation |
| Hébergement | GitHub Pages, publication automatique à chaque mise à jour de `main` |
| Base de données | Supabase (PostgreSQL), offre gratuite |
| Météo | Open-Meteo : gratuit, sans clé, modèle européen ECMWF inclus |
| Bilan hebdomadaire | Routine Claude |
| Cache navigateur | Chaque fichier CSS ou JS modifié change de numéro de version dans son lien (`?v=AAAAMMJJx`) |
| Circuit de mise à jour | Branche de travail, fusion dans `main`, envoi sur GitHub, vérification de la publication |
