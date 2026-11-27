# Logistique d'une course · spécification fonctionnelle

Version 0.1 · 27 novembre 2026 · [Retour au sommaire](README.md) · Première version : logement, transport, matos à cocher, total de la course, « Mon matériel » dans Mon profil.

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
│ (2) Détail du total (replié) :                              │
│     Dossard 95 € · Logement 180 € · Transport 137 €         │
│                                                             │
│ (3) LOGEMENT                              (4) [+ Ajouter]   │
│  (5) Gîte des Crêtes · (6) 12 rue … · (7) 180 € · (8) lien  │
│  (9) Arrivée ven. 12/03 17:00 → (10) Départ dim. 14/03 10:00│
│                                                             │
│ (11) TRANSPORT                            (12) [+ Ajouter]  │
│  (13) Aller · (14) Train · (15) Lyon 08:12 → Saint-É. 10:05 │
│  (16) 62 € · (17) lien de réservation                       │
│                                                             │
│ (18) MATOS  12 / 19 pris        (19) [Mode jour J] [Éditer] │
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
| 1 | Total | 412 € | Droite du titre du bloc, cliquable | Taille 5, accent |
| 2 | Détail du total | Dossard, Logement, Transport | Sous le titre, replié par défaut | Taille 3, gris |
| 3 | Titre Logement | LOGEMENT | Capitales, taille 3 | Règles du design § 1 |
| 4 | Ajouter un logement | + Ajouter | Droite du titre 3 | Bouton du panneau (§ 11) |
| 5 | Nom du logement | Gîte des Crêtes | Début de ligne | Taille 4 |
| 6 | Adresse | 12 rue … | Après le nom | Taille 3 |
| 7 | Prix | 180 € | Fin de ligne | Taille 4 |
| 8 | Lien du logement | Annonce | Fin de ligne | Lien |
| 9 | Arrivée | ven. 12/03 17:00 | Ligne dessous | Taille 3 |
| 10 | Départ | dim. 14/03 10:00 | Après le 9 | Taille 3 |
| 11 | Titre Transport | TRANSPORT | Comme le 3 | |
| 12 | Ajouter un trajet | + Ajouter | Comme le 4 | |
| 13 | Sens | Aller · Retour · Autre | Début de ligne | Pastille |
| 14 | Type | Avion, Train, Voiture, Bus, Autre | Après le 13 | Pastille |
| 15 | Départ → arrivée | Lyon 08:12 → Saint-Étienne 10:05 | Milieu de ligne | Taille 4 |
| 16 | Prix du trajet | 62 € | Fin de ligne | Taille 4 |
| 17 | Lien de réservation | Réservation | Fin de ligne | Lien |
| 18 | Titre Matos et compteur | MATOS · 12 / 19 pris | Comme le 3 | |
| 19 | Mode jour J / Éditer | | Droite du titre 18 | Boutons du panneau |
| 20 | Catégorie | Sécurité | Titre de groupe | Capitales, taille 3 |
| 21 | Article avec case | Frontale | Une ligne par article | Taille 4 ; case ≥ 44 px (zones de toucher) |
| 22 | Pastille « Imposé » | IMPOSÉ | Après le 21 | Pastille accent |
| 23 | Catégorie Porté | Porté | Comme le 20 | |
| 24 | Équipement lié | Chaussures · les rouges | Après l'article | Taille 3, gris |
| 25 | Notes | Retrait des dossards… | Dernier texte du bloc | Taille 4 |

Numéros stables : un nouvel élément prend le numéro suivant.

### 3.3 Mode jour J

Bouton (19) : la liste du matos s'affiche seule, plein écran, une ligne par article avec une grande case. Les articles imposés passent en tête de chaque catégorie. Cocher est enregistré aussitôt. Le compteur « x / n pris » reste en haut. Une croix referme.

### 3.4 Édition

- **Logement et trajet** : une feuille de saisie par élément (champs du tableau). Prix facultatif ; date et heure d'arrivée et de départ facultatives. Supprimer demande confirmation (design § 1).
- **Matos** : « Éditer » ouvre la liste. « Ajouter un article » propose d'abord les articles du catalogue de l'utilisateur (recherche à la frappe), sinon crée un nouvel article, mémorisé au catalogue dans la catégorie choisie. Chaque article de la course a une bascule **Imposé** et un bouton Retirer (retire de la course, pas du catalogue).
- **Équipement lié** : un article du catalogue peut être lié à un équipement de Mon matériel (chaussures, bâtons, sac, frontale, montre). Sur la course, l'équipement choisi s'affiche (24) ; pour les chaussures, ce choix remplace le champ « Chaussures » existant de la course.
- Le détail du total se calcule : dossard (prix de la course) + somme des prix des logements + somme des prix des trajets ; les prix vides comptent zéro et ne sont pas affichés.

### 3.5 Mon matériel (dans Mon profil)

Une section de la page Mon profil : la liste des équipements durables, groupée par type (Chaussures, Bâtons, Sac, Frontale, Montre). Une ligne : marque, modèle, surnom, actif ou retiré. **Kilomètres : seulement pour les chaussures** (`km_depart`, `km_limite`) ; le cumul calculé depuis le Palmarès et Strava vient plus tard. Les autres éléments du matos (veste, sifflet, chargeurs…) restent de simples articles du catalogue, sans fiche.

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

Évolution 048 (à écrire à la construction ; détail dans [modèle de données](modele-donnees.md), § 4 ter).

| Table | Contenu |
| --- | --- |
| `logements` | course, nom, adresse, url, prix, arrivée, départ |
| `trajets` | course, sens, type, lieu et heure de départ, lieu et heure d'arrivée, url, prix |
| `materiel_catalogue` | utilisateur, nom, catégorie, équipement lié (facultatif), ordre |
| `course_materiel` | course, article, imposé, pris |

Règles d'accès : chaque ligne appartient à l'utilisateur ; lecture et écriture réservées à lui. **Le partage en lecture seule ne montre jamais la Logistique** (adresses, liens de réservation, prix). Le champ texte `logistique` de la course devient les Notes (25).

## 6. Jeu d'essai et résultats attendus

Données fictives : la course « Trail des Gorges » avec dossard à 95 €.

1. Ajouter un logement « Gîte des Crêtes », 180 €, arrivée ven. 17:00, départ dim. 10:00 : la ligne s'affiche ; total 275 €.
2. Ajouter un trajet Train, Aller, Lyon 08:12 → Saint-Étienne 10:05, 62 € : total 337 €.
3. Cliquer sur le total : le détail (95 / 180 / 62) s'ouvre ; un second clic le referme.
4. Logement et trajet sans prix : le total ne change pas et aucun « 0 € » ne s'affiche.
5. Matos : « Ajouter un article », taper « Fron » : « Frontale » du catalogue est proposée ; l'ajouter ; il n'est pas créé en double.
6. Taper un article inconnu : il est créé, rangé dans la catégorie choisie, et proposé à la course suivante.
7. Basculer « Imposé » sur la frontale : la pastille apparaît ; en mode jour J elle passe en tête de sa catégorie.
8. Cocher trois articles : le compteur passe à « 3 / n pris » ; recharger la page : les cases restent cochées.
9. Retirer un article de la course : il disparaît de la course, reste au catalogue.
10. Lier « Chaussures » à une paire de Mon matériel : l'équipement s'affiche (24).
11. Mon profil, Mon matériel : les chaussures ont des kilomètres ; une montre ou une frontale n'en ont pas.
12. Lien de partage en lecture seule : le bloc Logistique est absent.
13. Un autre compte ne voit ni les logements, ni les trajets, ni le catalogue du premier.
14. Téléphone (375 px) : aucun débordement horizontal, cases d'au moins 44 px.

## 7. Questions ouvertes

- Message de recommandation nutrition (sur la base de la stratégie et des ravitaillements) : plus tard.
- Kilomètres des chaussures depuis le Palmarès et Strava : plus tard.
- Liste du règlement proposée par l'IA (lever la règle « jamais la logistique » pour ce seul cas) : plus tard.
- Retrait des dossards en champs propres (lieu, horaires, pièces) : aujourd'hui dans les Notes ; todo n° 2.
