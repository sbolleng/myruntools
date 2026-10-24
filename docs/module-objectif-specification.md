# Objectif · spécification fonctionnelle

Version 0.7 · 24 octobre 2026 · [Retour au sommaire](README.md) · Jalon 1 (octobre 2026) · preuve de concept

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

Le module a deux pages :

- **Objectif** (`objectif.html`) : la vue d'ensemble. De haut en bas, le **graphique de difficulté** (§ 5.2), affiché pour tous, repliable, puis la **feuille de route** : une étape par course, dans l'ordre chronologique, la course objectif en dernier. Pas de texte d'introduction.
- **Page d'une course** (`course.html?id=…`) : tout ce qu'il faut savoir sur une course, une page par course (§ 3.4). On l'ouvre en touchant son étape. Elle a sa propre adresse : on peut la garder en favori pour le jour J, et le bouton retour du téléphone ramène à la feuille de route.

**Construction en lots.** Premier lot : la feuille de route et la page d'une course (cellules, comptes à rebours). Ensuite, chacun dans son lot : graphique de difficulté, badges UTMB, météo du jour J, suivi en course. Chacun est un module qu'on décide d'ajouter ou non, le moment venu.

### 3.1 Une étape de la feuille de route (coup d'œil)

Une carte par étape, le long d'un trait vertical (pastille et trait selon le § 3.3). Maquette : `docs/maquettes/objectif.html?v=b`.

| N° | Élément | Exemple | Place sur ordinateur | Style |
| --- | --- | --- | --- | --- |
| 4 | Rôle | PRÉPARATOIRE | Ligne 1, à gauche | Libellé ; Texte discret, Accent 2 pour Objectif intermédiaire, Accent pour Objectif principal |
| 5 | Compteur | `25 j` `23 h` `00 min` `00 s` | Ligne 1, à droite | Libellé, dans quatre cases fines ; chiffres en Accent 2, unités en Texte discret (§ 5.1) |
| 6, 7 | Course · Parcours, lien officiel | Trail du Lac · Le Tour du Lac ↗ | Ligne 2, à gauche | Nom ; Accent. L'icône ↗ ouvre le site officiel dans un nouvel onglet |
| 3 | Date | 15 NOV. 2026 | Ligne 2, à droite | Libellé ; Accent 2. Le mois seul si la date est approximative (« JUILLET 2027 ») |
| 8 | Lieu · format | Mont-Clair · Trail court | Ligne 3 | Texte ; Texte discret |
| — | Distance | DISTANCE `24 km · 650 m D+` | Ligne 4 | Libellé à gauche, valeur en Texte |
| 9, 10 | Objectif | OBJECTIF `02:45:00` | Ligne 5 | Libellé à gauche, valeur en Accent 2 ; ligne absente si l'objectif est vide |
| 11 à 13 | Dossard | DOSSARD ● Inscrit · n° 412 | Ligne 6 | Libellé à gauche, puis le point et l'état (§ 3.5) |

- **Trois styles de texte seulement**, un seul interligne (1,5), le même écart entre toutes les lignes : *Nom* (Space Grotesk 1 rem, 600), *Texte* (Space Grotesk 0,8 rem), *Libellé* (Space Mono 0,62 rem, capitales).
- **Distance** : la distance, puis le D+ s'il est connu ; ligne absente si les deux sont vides.
- **Objectif** : trois formes seulement, `hh:mm:ss` (« 02:45:00 »), « Finisher », ou « Sub » suivi d'une durée en heures et minutes (« Sub 3h », « Sub 1h30 », « Sub 45 min »). Les durées sont écrites `hh:mm:ss` sur tout le site.
- **Date approximative** (mois seul) : pour une course Confirmée, compteur jusqu'au 1er du mois, à minuit ; pour une option, pas de compteur.
- **Téléphone**, de haut en bas : rôle à gauche, aligné sur le compteur à droite (un rôle trop long passe sur deux lignes) ; date, à droite ; un interligne ; nom ; puis les autres lignes sur toute la largeur. Pour un candidat, sans rôle ni compteur : date, un interligne, nom.
- Toucher la carte (hors icône ↗ et lien d'inscription) ouvre la page de la course.
- Une option isolée ne porte pas le mot « Option » : son cadre et son trait en pointillé suffisent.

### 3.2 Lien avec l'en-tête

- **D'ici là** : nombre d'étapes de la feuille de route avant la course du cap. Les options d'un même groupe comptent pour une seule étape.
- **Prochaine course** : la première course Confirmée à venir de la feuille de route, hors course du cap.

### 3.3 Statut, rôle et état d'une étape

La page montre les courses au statut Option ou Confirmée, à l'état À venir ([modèle de données](modele-donnees.md), § 4.1), datées du jour ou plus tard : les mêmes que celles de l'en-tête. Une course sans date, ou dont la date est passée sans qu'elle soit marquée courue, n'y figure pas.

| Cas | Signification | Rendu |
| --- | --- | --- |
| Confirmée | Course retenue (rôle Préparatoire ou Plaisir) | Trait plein, pastille pleine en Texte discret |
| Rôle Objectif intermédiaire | Course clé de la saison | Pastille en Accent 2 |
| Rôle Objectif (affiché « Objectif principal ») | Une course visée ; il peut y en avoir plusieurs | Pastille en Accent, cerclée ; cadre en Accent |
| Groupe d'options | Plusieurs courses au statut Option pour un même créneau | Trait et cadre en pointillé ; une seule étape (§ 3.6) |
| Option isolée | Course envisagée, pas encore retenue | Trait et cadre en pointillé, pastille vide |

### 3.4 Page d'une course

Sous l'en-tête et le menu du site (onglet Objectif en avant), de haut en bas :

1. **Retour** : « ← Feuille de route ».
2. **Titre** : rôle et rang de l'étape (« Objectif intermédiaire · Étape 3 sur 6 »), course · parcours en couleur d'accent avec l'icône ↗, puis lieu, format, date et heure de départ. Pour une candidate d'un groupe d'options : le nom du groupe et des liens vers les autres candidates.
3. **Chiffres** : Distance (avec le D+), D−, Objectif, présentés comme les indicateurs de l'en-tête, puis le dossard (§ 3.5).
4. **Compte à rebours** : jours, heures, minutes, secondes jusqu'au départ (§ 5.1).
5. **Cellules**, toujours dans cet ordre, identique pour tous ; une cellule vide n'est pas affichée :

| Cellule | Contenu |
| --- | --- |
| Dossard | Le dossard (§ 3.5), le prix, la date d'ouverture des inscriptions |
| Rôle dans la préparation | Pourquoi cette course figure dans le plan |
| Stratégie ou enchaînement | Plan de course, allures, liaison avec la course suivante |
| Logistique | Transport, horaires, retrait du dossard |
| Description | Quelques infos sur la course |
| Liens | Site officiel, inscription, résultats en direct |

6. **Navigation** : « ← course précédente » et « course suivante → » dans la feuille de route.

**Cartes des modules à venir** : chacune a une place fixe, la même sur toutes les pages de course. Une carte sans données n'est pas affichée et ne laisse pas de trou.

| Carte | Place |
| --- | --- |
| Badges UTMB | Dans le titre, sous le nom de la course |
| Météo du jour J | À côté du compte à rebours |
| Suivi en course | Sous le compte à rebours, toute la largeur, avant les cellules |

### 3.5 Dossard

Sur la feuille de route et sur la page de la course : un point, puis l'état. L'état se déduit des champs `inscrit`, `dossard` et `ouverture_inscriptions`, comparés à la date du jour :

| État | Condition | Rendu |
| --- | --- | --- |
| Inscrit | `inscrit` vrai | ● plein en Accent 2, « Inscrit · n° 412 » (« Inscrit » seul sans numéro) |
| Inscription ouverte | Pas inscrit, ouverture passée ou du jour | ● plein et texte en Alerte, souligné : « Inscription ouverte ↗ », lien vers le site d'inscription s'il est connu |
| Ouvre bientôt | Pas inscrit, ouverture à venir | ○ vide en Accent 2 : « Ouvre le 10/01/2027 » |
| Pas inscrit | Pas inscrit, ouverture inconnue | ○ vide en Texte discret : « Pas inscrit » |

### 3.6 Groupe d'options (course à choisir)

**Affichage** (maquette `docs/maquettes/objectif.html`) :

- Une seule carte par groupe, placée dans la feuille de route à la date de sa première candidate.
- En tête : le nom du groupe (« Printemps 2027 »), dans le style du nom d'une course, en couleur Texte ; dessous, le rôle et « • x candidats », x étant calculé : le nombre de courses du groupe au statut Option et à l'état À venir (« • 1 candidat » au singulier).
- Puis un bloc par candidate, dans l'ordre chronologique, séparé par un filet : nom ↗ et date, lieu · format, distance, dossard. Ni rôle, ni objectif, ni compteur.
- Toucher une candidate ouvre sa page.

- **Rôles différents** : si les candidats n'ont pas le même rôle, les rôles se suivent (« Préparatoire · Plaisir • 2 candidats »).
- **Un seul candidat** : le groupe reste un groupe (« • 1 candidat ») tant qu'il n'est pas retenu.

**Gestion** (§ 3.7) : un groupe se crée dans le formulaire d'une course, champ Groupe d'options ; un candidat se retient depuis sa page.

### 3.7 Saisie et édition

Chacun ajoute, modifie et supprime ses courses à venir dans la page, sans autre outil. Le formulaire est celui du Palmarès ([spécification du Palmarès](module-palmares-specification.md), § 10), étendu aux champs d'une course à venir : même panneau, mêmes boutons, mêmes contrôles de saisie.

**Accès**

| Bouton | Place | Effet |
| --- | --- | --- |
| « + » (« Ajouter une course » au survol) | Bouton rond, à droite du titre « Feuille de route » | Ouvre un formulaire vide ; statut Confirmée et rôle Préparatoire proposés |
| « Modifier » | Page d'une course, à droite du titre | Ouvre le formulaire rempli |
| « Retenir cette course » | Page d'un candidat d'un groupe d'options | Après confirmation, le candidat passe en Confirmée et quitte le groupe ; les autres candidats passent À surveiller et quittent la feuille de route, sans être supprimés |
| « Marquer comme courue » | Page d'une course Confirmée, à partir du jour de la course | Ouvre le formulaire du Palmarès, pré-rempli de ce que la course connaît ; à l'enregistrement, la course passe à l'état Courue, quitte la feuille de route et rejoint le Palmarès |

Site partagé en lecture seule : aucun de ces boutons.

**Formulaire**, en cinq blocs ; les trois derniers sont repliés à l'ouverture d'un formulaire vide :

| Bloc | Champs |
| --- | --- |
| Course | Date, ou mois seul (case « Jour inconnu ») ; heure de départ ; course et parcours ; lieu ; type et format ; distance, D+ et D− |
| Place dans le plan | Statut (Confirmée, Option, À surveiller) ; rôle ; groupe d'options, seulement pour une Option : un groupe existant, ou un nouveau nom |
| Dossard | Case « Inscrit » ; numéro ; prix ; date d'ouverture des inscriptions |
| Préparation | Objectif ; rôle dans la préparation ; stratégie ou enchaînement ; logistique ; description (1 000 caractères au plus) |
| Liens | Site officiel ; site d'inscription ; résultats en direct |

- **Obligatoires** : course ; date (ou mois) pour une course Confirmée ou Option. Une course À surveiller peut rester sans date.
- **Exemples** dans les champs vides : « ex. 07:30 », « ex. Mont-Clair », « ex. 02:45:00, Finisher ou Sub 3h », « ex. https://… ».
- **Contrôles de saisie** :
  - date du jour ou à venir ;
  - objectif : une durée, écrite comme dans le Palmarès (`2:45:00`, `2h45`, chiffres seuls lus par la droite) et rangée au format `hh:mm:ss` (« 02:45:00 ») ; ou « Finisher » ; ou « Sub » suivi d'une durée en heures et minutes (« Sub 3h », « Sub 1h30 », « Sub 45 min »). Majuscules remises à l'enregistrement (« finisher » devient « Finisher »). Autre chose : « Format attendu : 02:45:00, Finisher ou Sub 3h » ;
  - nombres positifs ; liens commençant par `http://` ou `https://`.
- Un champ en erreur est signalé sous le champ ; « Enregistrer » reste sans effet tant qu'une erreur demeure.
- **Enregistrer** range la course et met à jour la page, en-tête compris ; **Annuler**, ou « × », ferme sans rien changer.
- **Supprimer** : seulement dans le formulaire d'une course existante, après confirmation (« Supprimer cette course ? Cette action est définitive. »). Depuis la page de la course supprimée, retour à la feuille de route.

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

Cette liste vit dans Supabase, une par utilisateur ; elle ne contient ni réservation ni donnée personnelle de tiers.

## 5. Briques dynamiques

### 5.1 Comptes à rebours

- Quatre cases (jours, heures, minutes, secondes : `25 j` `23 h` `00 min` `00 s`), sur chaque étape de la feuille de route (sauf les candidates d'un groupe) et en plus grand sur la page de la course. Heures, minutes et secondes sur deux chiffres. Mise à jour chaque seconde, un seul minuteur pour toute la page.
- Le temps restant est le temps réel jusqu'au départ : un changement d'heure (été, hiver) d'ici là est compté.
- Date approximative (mois seul) : jusqu'au 1er du mois, à minuit, pour une course Confirmée ; pas de compte à rebours pour une option.
- L'heure de départ est saisie en heure locale de la course, sans fuseau ; elle est lue dans le fuseau du navigateur. Correct tant que la course et le coureur sont dans le même fuseau (France, Espagne, Italie). Une course dans un autre fuseau demandera de préciser le fuseau (à traiter le moment venu).
- Après le départ, le compteur est remplacé par « Course courue », en Libellé.

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

Pour les courses labellisées : catégorie et index UTMB, affichés dans le titre de la page de la course.

## 6. Téléphone

- Feuille de route : ordre des éléments au § 3.1.
- Page d'une course : les cellules et les chiffres passent sur une colonne.
- Les cartes du suivi en course passent sur deux colonnes ; les libellés secondaires de la jauge sont masqués pour éviter les chevauchements.
- Les champs de saisie ouvrent le clavier numérique.

## 7. Hors périmètre du module

- **Courses à surveiller** : module séparé (jalon 2).
- **Résultats et historique** : module Palmarès.

## 8. Critères d'acceptation (proposés, à valider)

- [ ] La page affiche la feuille de route et la page de chaque course des deux profils pilotes depuis leur liste de courses, sans contenu écrit en dur dans la page.
- [ ] Les cinq statuts sont rendus comme décrit au § 3.3.
- [ ] Le graphique de difficulté est calculé depuis la même liste de courses, pour les deux profils.
- [ ] Le suivi en course et la météo s'activent dès qu'une course a les données nécessaires.
- [ ] La page fonctionne sur ordinateur et sur iPhone, dans les deux thèmes.
- [ ] L'en-tête est conforme au chapitre 4 de la spécification générale.

## 9. Questions ouvertes

- [x] Ordre des cellules : identique pour tous, fixé par la page d'une course (§ 3.4) (décidé le 23 oct. 2026).
- [x] Course passée : elle quitte la feuille de route et rejoint le Palmarès (décidé le 19 oct. 2026).
- [x] Course à choisir : une liste dans l'étape, une ligne par candidate ; chacune ouvre sa page. Le comparatif viendra du graphique de difficulté (décidé le 23 oct. 2026).
- [x] Détail d'une course : une page dédiée par course plutôt qu'une étape dépliée ou une fenêtre ; icône ↗ pour le site officiel (décidé le 23 oct. 2026).
- [ ] Inscriptions fermées (ou complet) sans être inscrit : un cinquième état ? Il demanderait un champ de plus (date de clôture ou case « complet »).
- [x] Groupe d'options : créé dans le formulaire ; candidat retenu depuis sa page, les autres passent À surveiller ; rôles différents listés ; un seul candidat reste un groupe (décidé le 24 oct. 2026).
- [ ] Choix de la course de l'en-tête (cap) : seulement dans les Préférences, ou aussi depuis la page Objectif ? À revoir une fois la feuille de route construite.

## 10. Contrôles

Jeu d'essai, données fictives, à la date du 20 octobre 2026 à 10 h, heure de Paris. Thème Bleu et orange, aucun cap choisi. Ces courses :

| N° | Course · Parcours | Date, heure | Lieu · format | Distance, D+ | Statut, rôle, état | Groupe | Objectif | Dossard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Trail du Lac · Le Tour du Lac | 15 nov. 2026, 9 h | Mont-Clair · Trail court | 24 km, 650 m | Confirmée, Préparatoire, À venir | — | 02:45:00 | Inscrit, n° 412, 32 € |
| 2 | Corrida de Noël | 13 déc. 2026, 18 h 30 | Ville-Haute · 10 km | 10 km, 40 m | Confirmée, Plaisir, À venir | — | Sub 45 min | Pas inscrit, ouverture le 1er nov. 2026 |
| 3 | Trail des Gorges | 7 mars 2027, 7 h 30 | Mont-Clair · Trail long | 45 km, 2 100 m, D− 2 100 m | Confirmée, Objectif intermédiaire, À venir | — | 06:30:00 | Inscrit, n° 1287, 58 € |
| 4 | Trail des Cimes | 30 mai 2027 | Haut-Val · Trail long | 42 km, 2 500 m | Option, Préparatoire, À venir | Printemps 2027 | — | Pas inscrit, ouverture le 10 janv. 2027 |
| 5 | Ultra du Plateau · Le 55 | 26 juin 2027 | Plaine-Neuve · Trail long | 55 km, 2 800 m | Option, Préparatoire, À venir | Printemps 2027 | — | Pas inscrit, ouverture le 1er sept. 2026, site d'inscription connu |
| 6 | Trail de la Forêt | juillet 2027 (mois seul) | Bois-Joli · Trail court | 30 km, 1 200 m | Option, Préparatoire, À venir | — | — | Pas inscrit, ouverture inconnue |
| 7 | Trail des Crêtes | 28 août 2027, 5 h | Mont-Clair · Ultra-trail | 60 km, 3 500 m | Confirmée, Objectif, À venir | — | Finisher | Inscrit, n° 88 |
| 8 | Cross des Collines | 6 déc. 2026 | Ville-Haute · Trail découverte | 12 km, 300 m | Confirmée, Préparatoire, Abandonnée | — | — | — |
| 9 | Trail des Sommets | 10 sept. 2028 | Haut-Val · Ultra-trail | 80 km, 5 000 m | À surveiller | — | — | — |
| 10 | Semi de San Sebastián | 4 oct. 2026 | Semi-marathon | 21,1 km | Confirmée, Préparatoire, Courue | — | — | — |

Trail des Gorges a aussi : rôle dans la préparation « Répétition générale du matériel et de la nutrition. », stratégie « Partir prudemment jusqu'au premier ravitaillement. », logistique « Navette depuis le stade à 6 h 30. », description « Boucle par les crêtes et les gorges. », site officiel, site d'inscription et résultats en direct. Corrida de Noël n'a que son site officiel.

Résultats attendus, feuille de route :

- Six étapes, dans cet ordre : Trail du Lac, Corrida de Noël, Trail des Gorges, Printemps 2027, Trail de la Forêt, Trail des Crêtes. Ni Cross des Collines (abandonnée), ni Trail des Sommets (à surveiller), ni Semi de San Sebastián (courue).
- En-tête : « Cap sur Trail des Crêtes » (et non Trail des Sommets, à surveiller) ; « 5 courses » D'ici là ; « prochaine course · Trail du Lac · J-26 ».
- Trail du Lac : rôle PRÉPARATOIRE ; compteur `26 j` `00 h` `00 min` `00 s` (une heure de plus avec le passage à l'heure d'hiver, le 25 octobre) ; « Trail du Lac · Le Tour du Lac ↗ » ; date 15 NOV. 2026 ; « Mont-Clair · Trail court » ; DISTANCE 24 km · 650 m D+ ; OBJECTIF 02:45:00 ; DOSSARD ● Inscrit · n° 412.
- Corrida de Noël : rôle PLAISIR ; compteur `54 j` `09 h` `30 min` `00 s` ; DISTANCE 10 km · 40 m D+ ; OBJECTIF Sub 45 min ; DOSSARD ○ Ouvre le 01/11/2026.
- Trail des Gorges : rôle OBJECTIF INTERMÉDIAIRE en Accent 2, pastille en Accent 2 ; compteur `137 j` `22 h` `30 min` `00 s` ; OBJECTIF 06:30:00.
- Printemps 2027 : une seule carte, en pointillé ; « Printemps 2027 », puis « PRÉPARATOIRE • 2 CANDIDATS » ; Trail des Cimes (30 MAI 2027, DOSSARD ○ Ouvre le 10/01/2027), puis Ultra du Plateau · Le 55 (26 JUIN 2027, DOSSARD ● Inscription ouverte ↗, en Alerte) ; ni rôle, ni objectif, ni compteur pour les candidates.
- Trail des Cimes sorti du groupe (groupe vidé dans ses données) : la carte Printemps 2027 affiche « • 1 candidat », Trail des Cimes devient une option isolée, et l'en-tête affiche « 6 courses ».
- Trail de la Forêt : cadre en pointillé, pastille vide ; rôle PRÉPARATOIRE, sans le mot « Option » ; date JUILLET 2027 ; pas de compteur ; pas de ligne Objectif ; DOSSARD ○ Pas inscrit.
- Trail des Crêtes : rôle OBJECTIF PRINCIPAL en Accent, cadre en Accent, pastille cerclée ; compteur `311 j` `19 h` `00 min` `00 s` ; OBJECTIF Finisher ; DOSSARD ● Inscrit · n° 88.
- Une seconde plus tard, les secondes de chaque compteur sont passées à 59 (`25 j 23 h 59 min 59 s` pour Trail du Lac).
- Au 15 novembre 2026 à 9 h, le compteur du Trail du Lac affiche « Course courue ».
- Toucher la carte du Trail du Lac ouvre sa page ; toucher ↗ ouvre son site officiel dans un nouvel onglet, sans ouvrir la page ; toucher « Inscription ouverte ↗ » ouvre le site d'inscription de l'Ultra du Plateau.
- Toucher Trail des Cimes, dans la carte du groupe, ouvre la page de Trail des Cimes.
- Téléphone : sur chaque carte, le rôle à gauche aligné sur le compteur à droite (OBJECTIF INTERMÉDIAIRE sur deux lignes), la date dessous à droite, un interligne, puis le nom ; rien ne dépasse de l'écran.
- Trail de la Forêt passé en Confirmée : compteur `253 j` `14 h` `00 min` `00 s`, jusqu'au 1er juillet 2027 à minuit.
- Thème changé : seules les couleurs changent.

Résultats attendus, page d'une course :

- Trail des Gorges : « ← Feuille de route » ; « Objectif intermédiaire · Étape 3 sur 6 » ; « Trail des Gorges ↗ » ; « Mont-Clair · Trail long · dimanche 7 mars 2027, 7 h 30 » ; Distance 45 km / 2 100 m D+, D− 2 100 m, Objectif 06:30:00, puis ● Inscrit · n° 1287 ; compte à rebours `137 j` `22 h` `30 min` `00 s`.
- Trail des Gorges, cellules dans cet ordre : Dossard (prix 58 €), Rôle dans la préparation, Stratégie ou enchaînement, Logistique, Description, Liens (Site officiel, Inscription, Résultats en direct).
- Trail des Gorges, navigation : « ← course précédente · Corrida de Noël », « course suivante · Trail des Cimes → ».
- Corrida de Noël : seules les cellules Dossard (○ Ouvre le 01/11/2026) et Liens (Site officiel) ; pas de ligne D−.
- Trail des Cimes : « Préparatoire · Étape 4 sur 6 » ; « Printemps 2027 » et un lien vers l'autre candidate, Ultra du Plateau · Le 55.
- Trail du Lac : pas de course précédente. Trail des Crêtes : pas de course suivante.
- Adresse d'une course inconnue, d'un autre utilisateur, ou absente de la feuille de route : « Course introuvable. » et le lien « ← Feuille de route ».
- Bouton retour du navigateur, depuis une page de course : retour à la feuille de route.
- Site partagé en lecture seule : la feuille de route et les pages de course du propriétaire s'affichent à l'identique.
- Chargement de la feuille de route et d'une page de course (ordinateur, téléphone) : à l'instant où la page devient visible, l'en-tête est en place et le contenu n'a plus à bouger.

Résultats attendus, saisie et édition (mêmes données, même date) :

- « + » ouvre un formulaire vide : statut Confirmée, rôle Préparatoire ; blocs Dossard, Préparation et Liens repliés.
- Ajouter « Trail des Brumes », 18 avril 2027, 8 h, objectif saisi `15000` (lu 1:50:00) : il s'affiche « 01:50:00 » ; la carte prend place entre Trail des Gorges et Printemps 2027 ; l'en-tête affiche « 6 courses ».
- Objectif « vite » : « Format attendu : 02:45:00, Finisher ou Sub 3h » sous le champ ; « Enregistrer » reste sans effet. « finisher » est rangé « Finisher », « sub 3h » est rangé « Sub 3h ».
- Date du 1er octobre 2026 : erreur sous la date. Site officiel « example.org » : erreur sous le champ.
- Case « Jour inconnu », juillet 2027 : la carte affiche JUILLET 2027.
- Statut Option : le champ Groupe d'options apparaît et propose « Printemps 2027 » ; le choisir : la carte du groupe affiche « • 3 candidats ». Statut Confirmée : le champ disparaît.
- Page Trail des Gorges, « Modifier » : formulaire rempli ; objectif changé en `6:15:00` : la page affiche « 06:15:00 ».
- Supprimer Corrida de Noël, confirmation acceptée : elle disparaît ; l'en-tête affiche « 4 courses ».
- Page Trail des Cimes, « Retenir cette course », confirmation acceptée : Trail des Cimes devient une étape Confirmée au 30 mai 2027 ; Ultra du Plateau quitte la feuille de route (À surveiller) ; la carte Printemps 2027 disparaît ; l'en-tête affiche « 5 courses ».
- Page Trail du Lac le 20 octobre 2026 : pas de « Marquer comme courue ». Le 15 novembre 2026 à 14 h : le bouton est là ; il ouvre le formulaire du Palmarès rempli (15 novembre 2026, Trail du Lac, Le Tour du Lac, Trail, Trail court, 24 km, 650 m, Préparatoire) ; temps `24110` : à l'enregistrement, Trail du Lac quitte la feuille de route et rejoint le Palmarès, avec un temps de 2 h 41 min 10 s.
- Site partagé en lecture seule : ni « + », ni « Modifier », ni « Retenir cette course », ni « Marquer comme courue ».
- Téléphone : le formulaire occupe tout l'écran et défile, sans déborder sur les côtés.

