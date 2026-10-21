# Objectif · spécification fonctionnelle

Brouillon v0.1 · 5 octobre 2026 · [Retour au sommaire](README.md) · Jalon 1 (octobre 2026) · preuve de concept

## 1. Rôle

La page Objectif montre tout le chemin jusqu'à la course objectif : les courses étapes, leur statut, ce qu'il faut savoir sur chacune, et des outils dynamiques qui s'activent d'eux-mêmes à l'approche et le jour de la course. C'est le premier module livré et la preuve de concept du projet : premier module branché sur la base de données Supabase. Il porte aussi le socle commun décrit dans la [spécification générale](specification-generale.md).

## 2. Ce qui existe aujourd'hui

Les deux profils pilotes ont chacun leur version de la page, écrite à la main. Le nouveau module les remplace par une seule page alimentée par une liste de courses par utilisateur.

| Élément | Profil trail | Profil route | Dans le module |
| --- | --- | --- | --- |
| Objectif final | Oui | Oui | Une course marquée « objectif » |
| Étapes | Confirmées, objectif intermédiaire, à choisir, horizon | Confirmées, objectif intermédiaire, à choisir (avec candidats) | Les mêmes statuts pour tous |
| Cellules d'une étape | Objectif, Dossard, Rôle, Stratégie, Logistique | Objectif, Dossard, Rôle, Enchaînement, Logistique | Champs communs, chacun affiché s'il est rempli |
| Comptes à rebours | Oui | Oui | Sur chaque course datée |
| Graphique de difficulté | Oui | Non | Calculé depuis la liste des courses |
| Badges UTMB | Oui | Non | Pour les courses qui en ont |
| Suivi en course | Non | Oui (un semi-marathon) | Pour toute course qui a une stratégie de passage |
| Météo du jour J | Non | Oui (un semi-marathon) | Pour toute course qui a des coordonnées |
| Courses à surveiller | Tableau de repli | Tableau de veille | Sort de la page : module séparé |

Aujourd'hui, côté trail, les courses du graphique de difficulté sont saisies une deuxième fois dans le code. Avec une seule liste de courses, ce double emploi disparaît.

## 3. Contenu de la page

De haut en bas :

1. **Texte d'introduction** : l'objectif final et le chemin pour y arriver, en quelques phrases.
2. **Graphique de difficulté** (§ 5.2), affiché pour tous, repliable.
3. **Feuille de route** : une étape par course, dans l'ordre chronologique, la course objectif en dernier.

### Statut, rôle et état d'une étape

La page montre les courses au statut Option ou Confirmée, à l'état À venir ([modèle de données](modele-donnees.md), § 4.1).

| Cas | Signification | Rendu |
| --- | --- | --- |
| Confirmée | Course retenue (rôle Préparatoire ou Plaisir) | Trait plein, pastille standard |
| Rôle Objectif intermédiaire | Course clé de la saison | Trait et pastille en couleur d'accent |
| Rôle Objectif | Une course visée ; il peut y en avoir plusieurs | Mise en avant |
| Groupe d'options | Plusieurs courses au statut Option pour un même créneau | Trait pointillé ; les candidates listées dans l'étape |
| Option isolée | Course envisagée, pas encore retenue | Trait pointillé |

### Cellules d'une étape

Chaque cellule n'est affichée que si elle est remplie.

| Cellule | Contenu |
| --- | --- |
| Objectif | Temps cible ou intention (« Finisher ») |
| Dossard | Inscrit ou non, numéro, prix, date d'ouverture des inscriptions |
| Rôle dans la préparation | Pourquoi cette course figure dans le plan |
| Stratégie ou enchaînement | Plan de course, allures, liaison avec la course suivante |
| Logistique | Transport, horaires, retrait du dossard |
| Compte à rebours | Jours, heures, minutes, secondes jusqu'au départ |
| Liens | Site officiel, page des résultats en direct |

## 4. Données d'une course

| Groupe | Champs | Sert à |
| --- | --- | --- |
| Identité | Course, parcours, lien officiel, lieu, coordonnées (latitude, longitude) | Affichage, météo |
| Date | Jour et heure de départ | Comptes à rebours, météo, ordre de la feuille de route |
| Profil | Distance, D+, D−, route ou trail, label et index UTMB | Graphique de difficulté, badges |
| Place dans le plan | Statut, rôle, état, groupe d'options ([modèle de données](modele-donnees.md), § 4.1) | Rendu de l'étape |
| Dossard | Inscrit, numéro, prix, ouverture des inscriptions | Cellule Dossard |
| Préparation | Temps cible, rôle, enchaînement, stratégie, logistique | Cellules de l'étape |
| Stratégie de course | Points de passage (distance, temps visé), objectifs chiffrés, lien des résultats en direct | Suivi en course |
| Résultat | Temps réalisé | Comparaison à l'objectif ; plus tard, Palmarès |

En V1, cette liste vit dans un fichier de données par utilisateur ; en V2, dans Supabase. Tant qu'elle est publique, elle ne contient ni réservation ni donnée personnelle de tiers.

## 5. Briques dynamiques

### 5.1 Comptes à rebours

- Affichage en jours, heures, minutes et secondes ; mise à jour chaque seconde, un seul minuteur pour toute la page.
- L'heure de départ est saisie en heure locale de la course, sans fuseau ; elle est lue dans le fuseau du navigateur. Correct tant que la course et le coureur sont dans le même fuseau (France, Espagne, Italie). Une course dans un autre fuseau demandera de préciser le fuseau (à traiter le moment venu).
- Après le départ, le compteur est remplacé par « Course courue ».

### 5.2 Graphique de difficulté

- Chaque course est placée dans le temps et selon son **km-effort** : distance + D+/100 + D−/200. Le D+/100 est la règle standard du trail ; le D−/200 ajoute 1 km par tranche de 200 m de descente.
- Pour une course en boucle dont le D− n'est pas connu, D− = D+.
- Rendu selon le statut : étapes reliées par une ligne, candidats d'une course à choisir en cercles vides, course à définir en fourchette (trait pointillé), objectif mis en avant.
- Touche ou survol d'un point : détail de la course. Sous le graphique, un tableau repliable donne les chiffres.
- Affiché pour tous les utilisateurs, repliable.

### 5.3 Suivi en course

S'active pour toute course qui a une stratégie de passage. Il sert à suivre une course en direct, à partir des temps lus sur la page officielle des résultats.

- **Une carte par point de passage** : distance, temps visé, champ de saisie du temps réel.
- **Saisie** : formats `mm:ss` ou `h:mm:ss`, ou chiffres seuls de 3 à 6 caractères lus par la droite (`2629` = 26:29, `14425` = 1:44:25), car le clavier numérique des téléphones n'a pas de « : ». Le temps est remis au format horloge à la validation.
- **Pour chaque point saisi** : écart au temps visé (en avance ou en retard) et allure moyenne du tronçon.
- **Projection d'arrivée** : temps visé à l'arrivée + écart constaté au dernier point saisi. Une fois l'arrivée saisie, le temps réel remplace la projection.
- **Jauge** : barre de progression entre deux bornes, avec les objectifs chiffrés marqués dessus (par exemple cible, objectif phare, record personnel).
- **Message** : situe la projection par rapport aux objectifs.
- **Mémoire** : les temps saisis sont gardés dans le navigateur, sur l'appareil utilisé ; rien n'est envoyé ailleurs.
- **Lien** vers la page officielle des résultats en direct.

Aucune lecture automatique des résultats officiels : les sites de chronométrage n'offrent pas d'accès public connu, d'où la saisie manuelle.

### 5.4 Météo du jour J

S'active pour toute course qui a des coordonnées et une heure de départ.

- **Source** : Open-Meteo (gratuit, sans clé ; inclut le modèle européen ECMWF, référence à courte échéance).
- **Contenu** : ciel et température à l'heure du départ, vent, et la plus forte probabilité de pluie sur la durée prévue de la course. La date et l'heure de la prévision sont indiquées.
- **Disponibilité** : seulement quand la date de course entre dans l'horizon de prévision du service ; avant, la carte l'indique.
- **Mise en cache** : 15 minutes, pour ne pas interroger le service à chaque affichage.
- **Après la course** : « Course passée ».
- **Erreur** : « Météo indisponible pour l'instant ».

### 5.5 Badges UTMB

Pour les courses labellisées : catégorie et index UTMB, affichés dans l'étape.

## 6. Téléphone

- Les cellules d'une étape passent sur une colonne.
- Les cartes du suivi en course passent sur deux colonnes ; les libellés secondaires de la jauge sont masqués pour éviter les chevauchements.
- Les champs de saisie ouvrent le clavier numérique.

## 7. Hors périmètre du module

- **Courses à surveiller** : module séparé (jalon 2).
- **Formulaires de saisie** : V2, avec Supabase.
- **Résultats et historique** : module Palmarès.

## 8. Critères d'acceptation (proposés, à valider)

- [ ] La page affiche la feuille de route des deux profils pilotes depuis leur liste de courses, sans contenu écrit en dur dans la page.
- [ ] Les cinq statuts sont rendus comme décrit au § 3.
- [ ] Le graphique de difficulté est calculé depuis la même liste de courses, pour les deux profils.
- [ ] Le suivi en course et la météo s'activent dès qu'une course a les données nécessaires.
- [ ] La page fonctionne sur ordinateur et sur iPhone, dans les deux thèmes.
- [ ] L'en-tête est conforme au chapitre 4 de la spécification générale.

## 9. Questions ouvertes

- [ ] Ordre des cellules d'une étape : identique pour tous, ou propre à chaque utilisateur ?
- [x] Course passée : elle quitte la feuille de route et rejoint le Palmarès (décidé le 19 oct. 2026).
- [ ] Course à choisir : comment présenter les candidats (liste, comparatif) ?
