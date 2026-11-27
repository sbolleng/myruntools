# Logistique d'une course · spécification fonctionnelle

Version 0.5 · 28 novembre 2026 · [Retour au sommaire](README.md) · La saisie passe dans la fiche « Modifier la course » (cartes Option, Confirmé, Non retenu ; autocomplétion des adresses et du matos ; carte des logements) ; la page de la course ne fait qu'afficher ; « Ta course approche » dans En un coup d'œil à J-5.

## 1. Rôle

Le bloc **Logistique** rassemble ce qu'il faut organiser autour du jour de course : où dormir, comment s'y rendre, quoi emporter, et ce que cela coûte.

- On **saisit** dans la fiche « Modifier la course » (bloc Logistique) : on y garde toutes les pistes (logements et transports en option, confirmés, non retenus).
- On **consulte** sur la page de la course : ce qui est confirmé, les options en une ligne, la carte, le total ; on y coche le matos (« Pris ») et on ouvre le mode « Jour J ».
- **Cinq jours avant**, En un coup d'œil le rappelle (« Ta course approche »).

Hors périmètre (décidé le 27 nov. 2026) : message de recommandation nutrition, kilométrage des chaussures calculé depuis le Palmarès et Strava, liste du règlement proposée par l'IA, correspondances d'un trajet.

## 2. Notions

| Notion | Définition |
| --- | --- |
| Logement | Un lieu où dormir : nom, adresse (et ses coordonnées), lien, prix, arrivée, départ, état. Plusieurs par course. |
| Transport | Un déplacement : mode (Train, Avion, Voiture, Bus, Autre), aller simple ou aller-retour, lieux, jours et heures, prix, lien de réservation, état. Plusieurs par course. |
| État | **Option** (une piste), **Confirmé** (réservé), **Non retenu** (écarté, gardé pour mémoire). |
| Article | Un élément du **catalogue du matos** de l'utilisateur (« Frontale »), avec son **groupe** : En course, Avant-après course ou Autres (par défaut). Mémorisé une fois, proposé ensuite. |
| Matos d'une course | Les articles retenus pour une course, chacun avec **Imposé** (exigé par le règlement), **Pris** (case cochée) et, s'il y a lieu, l'équipement choisi. |
| Total de la course | Prix du dossard + logements confirmés + transports confirmés. Les options sont rappelées à part. |
| Mon matériel | Les équipements durables, dans Mon profil : chaussures, bâtons, sac, frontale, montre (kilomètres pour les chaussures seulement). |

## 3. Plan de page

Maquette : [`docs/maquettes/logistique.html`](maquettes/logistique.html) (A édition, B consultation, C En un coup d'œil).

### 3.1 Fiche « Modifier la course », bloc Logistique

Un seul « Annuler · Enregistrer », celui de la fiche : rien ne s'enregistre dans le bloc, tout part avec la course.

```
› LOGISTIQUE
  LOGEMENT                              (49) Confirmé : 180 € · en option : 95 €
  (50) ┌ carte : départ de la course, logements confirmés (●) et en option (○) ┐
  (27) ┌ Gîte des Crêtes            [CONFIRMÉ]   180 € ┐   carte enregistrée : repliée,
       │ 12 rue des Crêtes, Mont-Clair · à 1 km du départ │   un toucher la déplie
       └ ven. 5 mars · 17 h → dim. 7 mars · 10 h        ┘
  (27) ┌ (47) (Option) (Confirmé) (Non retenu)      (28) Supprimer ┐  carte dépliée
       │ (29) Nom [        ]           (34) Lien [https://… ]      │
       │ (30) Adresse [quai du La|                             ]   │
       │ (31) ┌ 4 Quai du Lac, 42000 Mont-Clair   à 1,8 km du départ ┐
       │ (32) Arrivée [jour][heure]     Départ [jour][heure]        │
       │ (33) Prix [  ] €                       (51) Replier         │
  (48) Non retenus (1)
  (35) [Ajouter un logement]

  TRANSPORT                             Confirmé : 100 €
  ┌ (47) (Option) (Confirmé) (Non retenu)              Supprimer ┐
  │ (36) (Train) (Avion) (Voiture) (Bus) (Autre)                  │
  │ (37) (Aller simple) (Aller-retour)                            │
  │ (38) ALLER   De [      ] Départ [jour][heure]                 │
  │              À  [      ] Arrivée [jour][heure]                │
  │ (39) RETOUR  De [présaisi] …   À [présaisi] …                 │
  │ (40) Prix de l'aller-retour [  ] €   Lien de réservation [  ] │
  (41) [Ajouter un transport]

  MATOS
  (42) [Ajouter un article : frontale, veste…         ]
       ┌ Frontale                    déjà dans ton matos ┐
       └ Ajouter « fron » comme nouvel article    Entrée ┘
  EN COURSE
   Frontale  (43) (En course)(Avant-après)(Autres)  (44) [x] Imposé  (45) [Petzl Actik ▾]  (46) Retirer
  AUTRES
   Gants        (Autres) …

  (25) NOTES [texte libre]
```

Sur téléphone : même ordre, une colonne ; les pastilles passent à la ligne.

| N° | Élément | Rôle |
| --- | --- | --- |
| 27 | Carte (logement ou transport) | Enregistrée : repliée à l'ouverture de la fiche (résumé : nom ou mode, état, prix, adresse et distance, dates) ; un toucher la déplie. Nouvelle : dépliée. Option : contour en tirets. |
| 28 | Supprimer | Lien en Alerte ; confirmation pour une carte enregistrée ; effectif à « Enregistrer ». |
| 29–34 | Champs du logement | Nom, adresse, arrivée et départ (jour et heure), prix, lien. |
| 30–31 | Adresse et autocomplétion | Propositions sous le champ pendant la frappe (dès 3 lettres) : Photon (OpenStreetMap), les plus proches du départ d'abord, avec la distance ; flèches, Entrée, Échap. Une adresse saisie à la main reçoit ses coordonnées à l'enregistrement (première proposition). |
| 35, 41 | Ajouter un logement, Ajouter un transport | Bouton secondaire, sous la dernière carte ; la nouvelle carte est en Option. |
| 36 | Mode | Pastilles. Voiture : De, À et prix seulement (pas de jours ni d'heures). |
| 37 | Aller simple / Aller-retour | Pastilles, pour tous les modes. Aller-retour : bloc Retour (39), lieux présaisis à l'envers, **un seul prix** (40). Une seule ligne en base. |
| 42 | Ajouter un article | Autocomplétion sur le catalogue de l'utilisateur ; « Ajouter « … » comme nouvel article » s'il n'existe pas. |
| 43 | Groupe | Pastilles En course, Avant-après, Autres ; le groupe est celui de l'article (catalogue), donc le même d'une course à l'autre. Aucun rangement imposé : Autres par défaut. |
| 44–46 | Imposé, équipement, retirer | L'équipement n'est proposé que si Mon matériel en a un du type évoqué par le nom (Chaussures, Frontale, Bâtons, Sac, Montre). |
| 47 | État | Pastilles Option, Confirmé, Non retenu. |
| 48 | Non retenus | Regroupés en une ligne « Non retenus (n) » ; un toucher les montre. |
| 49 | Sommes de la rubrique | Confirmé et en option, à part. |
| 50 | Carte des logements | Plan OpenStreetMap, centré sur le départ (ses coordonnées) ; repères : départ (Accent), confirmé (plein), option (vide) ; non retenus absents. Absente sans aucune coordonnée. |
| 51 | Replier | Referme une carte enregistrée dépliée. |

Contrôle avant d'enregistrer : chaque logement a un nom (« Indique le nom de chaque logement. », la fiche reste ouverte). Une carte neuve laissée vide est ignorée.

### 3.2 Page de la course (consultation)

```
⌄ Logistique                                          (1) 338 €
  (2) Total 338 € ▾ → Dossard 58 € / Logement 180 € / Transport 100 € / En option : 95 €
  LOGEMENT
  (50) carte
  (5) Gîte des Crêtes (8) ↗                              (7) 180 €
  (6) 12 rue des Crêtes, Mont-Clair → menu (26) · à 1 km du départ
  (9) Arrivée : ven. 5 mars · 17 h
  (10) Départ : dim. 7 mars · 10 h
  (52) 1 logement en option (Gîte du Lac, 95 €)
  TRANSPORT
  (14) Avion · aller-retour ↗                              100 €
  (15) Aller : Aéroport de Lyon 8 h 12 → Aéroport de Nice, sam. 6 mars
       Retour : Aéroport de Nice 18 h → Aéroport de Lyon, lun. 8 mars
  MATOS (18) 1 / 2 pris                                 (19) [Jour J]
  EN COURSE   [x] Frontale  IMPOSÉ  Petzl Actik
  AUTRES      [ ] Gants
  NOTES (25)
```

Aucun crayon, aucun « Ajouter » : on modifie par « Modifier la course ». Seuls les éléments confirmés sont détaillés ; les options tiennent en une ligne (52) ; les non retenus n'apparaissent pas. Rien de saisi : « Rien de prévu : « Modifier la course » pour ajouter logement, transport et matos. »

| N° | Élément | Rôle |
| --- | --- | --- |
| 1, 2 | Total et détail | Dossard + confirmés ; un clic sur « Total » donne le détail, une ligne par poste, les options à part. |
| 6, 26 | Adresse et menu d'itinéraires | Un toucher ouvre Google Maps, Waze et l'application de l'appareil (Plans sur iPhone et iPad, au choix sur Android, OpenStreetMap sur ordinateur). |
| 8 | Lien | Flèche juste à côté du nom (logement : l'annonce ; transport : la réservation). |
| 18, 19, 21 | Matos | Cases « Pris » enregistrées aussitôt, par groupe (imposés d'abord) ; « Jour J » : la liste seule, plein écran, grandes cases. |
| 52 | Options | « n logement(s) en option (nom, prix) », de même pour les transports. |

### 3.3 En un coup d'œil : « Ta course approche »

De J-5 au jour de la course, le bloc « Prochaine course » s'intitule **Ta course approche** et ajoute sous la carte de la course : le logement confirmé (nom, arrivée), le premier transport confirmé (mode, jour et heure, lieu de départ), la jauge du matos (« Matos : x / n pris ») et « Jour J ». Rien de saisi : rien n'est ajouté. Jamais sur un espace partagé.

### 3.4 Mon matériel (dans Mon profil)

Une section de la page Mon profil : chaussures, bâtons, sac, frontale, montre ; une ligne par équipement (marque, modèle, surnom, en service ou retiré). Kilomètres seulement pour les chaussures (`km_depart`, `km_limite`) ; le cumul depuis le Palmarès et Strava viendra plus tard.

## 4. Catalogue de départ

À la mise en service, le catalogue du compte a été chargé avec la première liste de l'utilisateur (19 articles), par une requête donnée dans la discussion, jamais enregistrée dans le dépôt. Les articles sont dans le groupe Autres : chacun les range comme il veut.

## 5. Données

Évolutions 049 (tables), 051 (prix d'un aller-retour) et 054 (états, coordonnées, retour sur la même ligne, groupes) ; détail dans le [modèle de données](modele-donnees.md), § 4 ter.

| Table | Contenu |
| --- | --- |
| `logements` | course, nom, adresse, latitude, longitude, url, prix, arrivée, départ, état |
| `trajets` | course, type (mode), sens, aller-retour (`prix_aller_retour`), lieux, jours et heures de l'aller et du retour (`retour_*`), url, prix, état |
| `materiel_catalogue` | utilisateur, nom (unique), groupe, ordre (la colonne `categorie` n'est plus utilisée) |
| `course_materiel` | course, article, imposé, pris, équipement choisi |

Règles d'accès : chaque ligne appartient à l'utilisateur. **Le partage en lecture seule ne montre jamais la Logistique.** Les lignes enregistrées avant l'évolution 054 sont confirmées ; un ancien aller-retour en deux lignes s'affiche en deux transports.

## 6. Jeu d'essai et résultats attendus

Banc d'essai, groupe `logistique` : course « Trail des Gorges » (dossard 58 €, départ connu), catalogue de cinq articles, deux équipements ; Photon et le plan OpenStreetMap simulés.

1. Page de la course : lecture seule, ni crayon ni « Ajouter » ; total 58 € et Notes.
2. Fiche « Modifier la course » : un seul bouton principal ; « Ajouter un logement » et « Ajouter un transport » sous leurs rubriques.
3. Nouveau logement : en Option ; taper « rue des Crê » : deux propositions, la plus proche d'abord, « à 1 km du départ » ; Entrée choisit la première.
4. Second logement en option, adresse saisie à la main : la rubrique affiche « Confirmé : 180 € · en option : 95 € » ; à l'enregistrement, ses coordonnées sont cherchées.
5. Transport Avion, aller-retour : retour présaisi à l'envers, « Prix de l'aller-retour » ; Voiture : De, À, prix, sans jours ni heures ; la carte Voiture laissée vide est ignorée.
6. Matos : « fron » propose « Frontale » (déjà dans ton matos) et « Ajouter « fron » comme nouvel article » ; « Gants » créé ; groupe Autres par défaut ; Frontale en En course, imposée, Petzl Actik.
7. Enregistrer la fiche : deux logements (confirmé, option, coordonnées), un transport aller-retour en une ligne, le matos rangé.
8. Page de la course : total 338 € ; détail Dossard 58 €, Logement 180 €, Transport 100 €, En option : 95 € ; « 1 logement en option (Gîte du Lac, 95 €) » ; aller et retour ; carte : trois repères ; menu d'itinéraires sur l'adresse, refermé au toucher ailleurs.
9. Matos par groupe ; « Jour J » : lignes d'au moins 44 px ; cocher : « 1 / 2 pris », enregistré.
10. Fiche rouverte : cartes repliées ; passer « Gîte du Lac » en Non retenu : « Non retenus (1) » ; un logement sans nom : « Indique le nom de chaque logement. », fiche ouverte ; supprimer le transport : « Supprimer ce transport ? » ; page : plus d'option affichée, total 238 €.
11. En un coup d'œil le 10 nov. (Trail du Lac le 15) : « Ta course approche », « Logement : Chalet du Lac · arrivée sam. 14 nov. · 18 h », « Matos : 0 / 1 pris », « Jour J » ouvre la liste ; le 20 oct. : « Prochaine course », rien de la logistique.
12. Téléphone : fiche, bloc Logistique ouvert, sans débordement.
13. Mon profil, Mon matériel : kilomètres sur les chaussures seulement ; ajout de bâtons.
14. Espace partagé : la page de la course s'affiche sans Logistique.
15. Un autre compte ne voit rien de ces tables (règles par ligne : à vérifier dans Supabase, la base simulée n'en a pas).

## 7. Questions ouvertes

- Message de recommandation nutrition, kilomètres des chaussures (Palmarès, Strava), liste du règlement par l'IA : plus tard.
- Retrait des dossards en champs propres : aujourd'hui dans les Notes ; todo n° 2.
