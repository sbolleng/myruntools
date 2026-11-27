# Logistique d'une course · spécification fonctionnelle

Version 0.5 · 27 novembre 2026 · [Retour au sommaire](README.md) · Mon matériel : un crayon par équipement pour le modifier, « + Ajouter un équipement » à gauche sous la liste.

## 1. Rôle

Sur la page d'une course, le bloc **Logistique** rassemble tout ce qu'il faut organiser autour du jour de course : où dormir, comment s'y rendre, quoi emporter, et ce que cela coûte au total. Il remplace le champ texte libre « Logistique » actuel (conservé comme « Notes » : retrait des dossards, navette…).

Hors périmètre de cette version (décidé le 27 nov. 2026) : message de recommandation nutrition, kilométrage des chaussures calculé depuis le Palmarès et Strava, proposition par l'IA de la liste du règlement. Ils feront l'objet de versions suivantes.

## 2. Notions

| Notion | Définition |
| --- | --- |
| Logement | Un lieu où l'on dort pour la course : nom, adresse, lien, prix, arrivée, départ. Plusieurs par course possibles. |
| Trajet | Un déplacement : type, lieu et heure de départ, lieu et heure d'arrivée, lien de réservation, prix. Plusieurs par course (aller, retour, correspondance). |
| Article | Un élément du **catalogue du matos** de l'utilisateur (« Frontale », « Veste pluie »). Mémorisé une fois, proposé à chaque nouvelle course. |
| Matos d'une course | Les articles retenus pour une course, chacun avec deux repères : **Imposé** (exigé par le règlement) et **Pris** (case cochée). |
| Total de la course | Prix du dossard + logements + trajets. |
| Mon matériel | Les équipements durables de l'utilisateur, dans Mon profil : chaussures, bâtons, sac, frontale, montre. |

## 3. Plan de page

### 3.1 Bloc Logistique, consultation

```
┌─ LOGISTIQUE ───────────────────────────── (1) Total 412 € ▾ ┐
│ (2) Détail du total (replié), une ligne par poste :         │
│     Dossard 58 €                                            │
│     Logement 180 €                                          │
│     Transport 62 €                                          │
│                                                             │
│ (3) LOGEMENT                              (4) [crayon]      │
│  (5) Gîte des Crêtes (8) ↗                  (7) 180 €       │
│  (6) 12 rue … → (26) menu : Google Maps · Waze · appareil   │
│  (9) Arrivée : ven. 5 mars · 17 h                           │
│  (10) Départ : dim. 7 mars · 10 h                           │
│                                                             │
│ (11) TRANSPORT                            (12) [crayon]     │
│  (14) Train · (13) Aller              (16) 62 €             │
│  (15) Lyon 8 h 12 › Saint-Étienne 10 h 05                   │
│  (17) Réservation ↗                                         │
│                                                             │
│ (18) MATOS  12 / 19 pris        (19) [Jour J] [Modifier la liste] │
│  (20) Sécurité                                              │
│   [x] (21) Frontale  (22) IMPOSÉ                            │
│   [ ] Couverture de survie  IMPOSÉ                          │
│  (23) Porté                                                 │
│   [x] Chaussures  (24) Salomon Speedcross (les rouges)      │
│  …                                                          │
│ (25) NOTES : retrait des dossards vendredi 14 h–19 h        │
└─────────────────────────────────────────────────────────────┘
```

Sur téléphone, même ordre, une rubrique sous l'autre ; la ligne du logement et celle du trajet passent sur deux lignes (lieux d'abord, prix et lien dessous).

### 3.2 Tableau des éléments

| N° | Nom | Exemple | Place | Style |
| --- | --- | --- | --- | --- |
| 1 | Total | 300 € | Droite du titre du bloc replié (Space Mono, accent), et en tête du bloc ouvert, cliquable | Taille 4, accent |
| 2 | Détail du total | Dossard, Logement, Transport | Sous le titre, replié par défaut | Taille 3, gris |
| 3 | Titre Logement | LOGEMENT | Capitales, taille 3 | Règles du design § 1 |
| 4 | Modifier le logement | crayon | Droite du titre 3 | Rond (§ 11) ; ouvre la modification de la rubrique |
| 5 | Nom du logement | Gîte des Crêtes | Début de ligne | Taille 4 |
| 6 | Adresse | 12 rue … | Sous le nom ; cliquable (ouvre le menu 26) | Lien, taille 3 |
| 7 | Prix | 180 € | Fin de ligne | Taille 4 |
| 8 | Lien du logement | ↗ | Flèche juste à côté du nom (pas de texte « Annonce ») | Lien |
| 9 | Arrivée | Arrivée : ven. 5 mars · 17 h | Ligne dessous | Taille 3 |
| 10 | Départ | Départ : dim. 7 mars · 10 h | Sous le 9 | Taille 3 |
| 11 | Titre Transport | TRANSPORT | Comme le 3 | |
| 12 | Modifier le transport | crayon | Comme le 4 | |
| 14 | Type | Avion, Train, Voiture, Bus, Autre | Début de ligne (et premier champ du formulaire) | Taille 4 |
| 13 | Sens | Aller · Retour · Aller-retour (formulaire) · Autre | Après le 14 (et second champ du formulaire) | Taille 4 |
| 15 | Départ → arrivée | Lyon 08:12 → Saint-Étienne 10:05 | Milieu de ligne | Taille 4 |
| 16 | Prix du trajet | 62 € | Fin de ligne | Taille 4 |
| 17 | Lien de réservation | Réservation | Fin de ligne | Lien |
| 18 | Titre Matos et compteur | MATOS · 12 / 19 pris | Comme le 3 | |
| 19 | Jour J / Modifier la liste | | Droite du titre 18 | Boutons secondaires du panneau |
| 20 | Catégorie | Sécurité | Titre de groupe | Capitales, taille 3 |
| 21 | Article avec case | Frontale | Une ligne par article | Taille 4 ; case ≥ 44 px (zones de toucher) |
| 22 | Pastille « Imposé » | IMPOSÉ | Après le 21 | Pastille accent |
| 23 | Catégorie Porté | Porté | Comme le 20 | |
| 24 | Équipement lié | Chaussures · les rouges | Après l'article | Taille 3, gris |
| 25 | Notes | Retrait des dossards… | Dernier texte du bloc | Taille 4 |
| 26 | Menu d'itinéraires | Google Maps · Waze · Plans (iPhone, iPad) / Application de cartes (Android) / OpenStreetMap (ordinateur) | Sous l'adresse (6), au toucher ; se referme au toucher ailleurs | Menu (`mrt-menu`) |

Numéros stables : un nouvel élément prend le numéro suivant.

### 3.3 Mode jour J

Bouton « Jour J » (19) : la liste du matos s'affiche seule, plein écran, une ligne par article avec une grande case. Les articles imposés passent en tête de chaque catégorie. Cocher est enregistré aussitôt. Le compteur « x / n pris » reste en haut. Une croix referme.

### 3.4 Édition

- **Logement et trajet** : le crayon (4, 12) ouvre la modification de la rubrique, sur place : une fiche par élément, titrée « Logement 1 », « Logement 2 »… (« Trajet 1 »…), chacune avec les champs du tableau ; une rubrique vide s'ouvre avec une fiche vide. « Ajouter un logement » (ou « Ajouter un trajet ») ajoute une fiche. Chaque fiche a un lien « Supprimer » (confirmation) ; les suppressions et les ajouts ne valent qu'à « Enregistrer » ; « Annuler » ferme sans rien changer. Une fiche neuve restée vide est ignorée. Prix, dates et heures facultatifs.
- **Matos** : « Modifier la liste » ouvre la modification (le bouton devient « Terminer »). « Ajouter un article » propose d'abord les articles du catalogue de l'utilisateur (recherche à la frappe), sinon crée un nouvel article, mémorisé au catalogue dans la catégorie choisie. Chaque article de la course a une bascule **Imposé** et un bouton Retirer (retire de la course, pas du catalogue).
- **Équipement lié** : un article dont le nom évoque un type d'équipement (Chaussures, Frontale, Bâtons, Sac, Montre) peut recevoir, pour cette course, un équipement de Mon matériel (liste « Équipement… », visible en modification s'il en existe un de ce type). Il s'affiche sur la ligne (24). Le champ « Chaussures » de la course n'est pas touché : l'usure des chaussures viendra avec le calcul des kilomètres.
- **Adresse** : champ libre et bouton « Rechercher » (ou « Entrée »). La recherche interroge OpenStreetMap (Nominatim) et propose jusqu'à cinq adresses mises en forme (« 12 rue des Crêtes, 42000 Saint-Étienne ») ; un toucher en remplit le champ. Pas de recherche à chaque frappe (règle d'usage du service). Service indisponible : on saisit à la main. L'adresse affichée (6) est cliquable : elle ouvre le menu d'itinéraires (26), construit sur l'adresse écrite, avec l'application de cartes propre à l'appareil.
- **Trajet** : le type d'abord, puis le sens. Avec « Aller-retour » (formulaire d'un nouveau trajet seulement), un bloc « Retour » apparaît, ses lieux présaisis à l'envers (lieu d'arrivée de l'aller = départ du retour, et inversement ; modifiables) et **un seul prix**, celui de l'aller-retour. Deux lignes sont enregistrées (aller, retour) ; le prix est rangé sur l'aller, marqué « aller-retour », et compté une fois dans le total.
- Le détail du total se calcule : dossard (prix de la course) + somme des prix des logements + somme des prix des trajets ; les prix vides comptent zéro et ne sont pas affichés.

### 3.5 Mon matériel (dans Mon profil)

Une section de la page Mon profil : la liste des équipements durables, groupée par type (Chaussures, Bâtons, Sac, Frontale, Montre). Une ligne : marque, modèle, surnom, actif ou retiré. **Kilomètres : seulement pour les chaussures** (`km_depart`, `km_limite`). Chaque ligne a un crayon (rond) qui l'ouvre en modification ; sous la liste, à gauche, « + Ajouter un équipement » (bouton secondaire) ; le cumul calculé depuis le Palmarès et Strava vient plus tard. Les autres éléments du matos (veste, sifflet, chargeurs…) restent de simples articles du catalogue, sans fiche.

## 4. Catalogue de départ

À la mise en service, le catalogue du compte est chargé avec la première liste de l'utilisateur (19 articles) ; la requête est donnée dans la discussion, jamais enregistrée dans le dépôt.

| Catégorie | Articles |
| --- | --- |
| Papiers | Pièce d'identité, Porte dossard |
| Sécurité | Couverture de survie, Sifflet, Frontale |
| Vêtements | Veste pluie, Pantalon pluie, Manche longue, Tour de cou |
| Porté | Chaussures, Semelles |
| Nutrition | Ravitaillement, Eco tasse, Eco assiette |
| Électronique | Chargeur montre, Chargeur voiture (allume cigare), Save bank |
| Après-course | Serviette et trousse / douche, Lingette |

Aucun article n'est marqué « Imposé » au départ : l'utilisateur le pose course par course, d'après le règlement.

## 5. Données

Évolutions 049 (passée le 27 nov. 2026) et 051 (prix d'un aller-retour ; détail dans [modèle de données](modele-donnees.md), § 4 ter).

| Table | Contenu |
| --- | --- |
| `logements` | course, nom, adresse, url, prix, arrivée, départ |
| `trajets` | course, sens, type, lieu et heure de départ, lieu et heure d'arrivée, url, prix, prix couvrant l'aller-retour (évolution 051) |
| `materiel_catalogue` | utilisateur, nom (unique par utilisateur), catégorie, ordre |
| `course_materiel` | course, article, imposé, pris, équipement choisi (facultatif) |

Règles d'accès : chaque ligne appartient à l'utilisateur ; lecture et écriture réservées à lui. **Le partage en lecture seule ne montre jamais la Logistique** (adresses, liens de réservation, prix). Le champ texte `logistique` de la course devient les Notes (25).

## 6. Jeu d'essai et résultats attendus

Données fictives du banc d'essai : la course « Trail des Gorges » (dossard à 58 €) ; groupe `logistique`.

1. Crayon de Logement, puis fiche « Logement 1 » : « Gîte des Crêtes », 180 €, arrivée ven. 17:00, départ dim. 10:00 : la ligne s'affiche ; total 238 €.
2. Crayon de Transport, puis fiche « Trajet 1 » : Train, Aller, Lyon 08:12 → Saint-Étienne 10:05, 62 € : total 300 €.
3. Cliquer sur le total : le détail (58 / 180 / 62) s'ouvre ; un second clic le referme.
4. « Ajouter un logement » dans la modification ajoute « Logement 2 » ; un logement sans prix : le total ne change pas et aucun « 0 € » ne s'affiche.
5. Matos : « Ajouter un article », taper « Fron » : « Frontale » du catalogue est proposée ; l'ajouter ; il n'est pas créé en double.
6. Taper un article inconnu : il est créé, rangé dans la catégorie choisie, et proposé à la course suivante.
7. Basculer « Imposé » sur la frontale : la pastille apparaît ; en mode jour J elle passe en tête de sa catégorie.
8. Cocher deux articles en mode jour J : le compteur passe à « 2 / 3 pris » ; recharger la page : les cases restent cochées.
9. Retirer un article de la course : il disparaît de la course, reste au catalogue.
10. Choisir une frontale de Mon matériel pour l'article « Frontale » : l'équipement s'affiche (24).
11. Mon profil, Mon matériel : les chaussures ont des kilomètres ; une montre ou une frontale n'en ont pas.
12. Lien de partage en lecture seule : le bloc Logistique est absent.
13. Un autre compte ne voit ni les logements, ni les trajets, ni le catalogue du premier (règles par ligne de la base : à vérifier dans Supabase, la base simulée du banc n'en a pas).
14. Adresse du logement : saisir, « Entrée » : les propositions s'affichent mises en forme ; en choisir une remplit le champ ; sur la ligne du logement, l'adresse ouvre le menu Google Maps · Waze · appareil ; la flèche à côté du nom ouvre le lien du logement.
15. Supprimer un logement : confirmation ; « Annuler » le garde ; « Enregistrer » le retire et renumérote.
16. Aller-retour (avion) : lieux du retour présaisis à l'envers, un seul prix ; deux lignes enregistrées, total avec le prix compté une fois.
17. Téléphone : aucun débordement horizontal ; en mode jour J, lignes d'au moins 44 px.

## 7. Questions ouvertes

- Message de recommandation nutrition (sur la base de la stratégie et des ravitaillements) : plus tard.
- Kilomètres des chaussures depuis le Palmarès et Strava : plus tard.
- Liste du règlement proposée par l'IA (lever la règle « jamais la logistique » pour ce seul cas) : plus tard.
- Retrait des dossards en champs propres (lieu, horaires, pièces) : aujourd'hui dans les Notes ; todo n° 2.
