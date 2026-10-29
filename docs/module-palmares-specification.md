# Palmarès · spécification fonctionnelle

Version 1.21 · 29 octobre 2026 · [Retour au sommaire](README.md) · Jalon 2

## 1. Objet

Le Palmarès liste les courses déjà courues par l'utilisateur, avec leurs résultats. Il sert à retrouver une course, à comparer ses résultats et à repérer ses records.

- **Deux temps** : d'abord la consultation (tri, filtres, regroupement par type, choix des colonnes) ; puis, quand la base de données sera en place, l'édition (§ 10).
- **Hors périmètre** : la présentation visuelle (document séparé) ; l'import automatique de données (montre, applications de sport).

## 2. Colonnes

Affichées par défaut, de gauche à droite :

| # | Colonne | Contenu | Saisie |
| --- | --- | --- | --- |
| 1 | Date | Jour de la course | Date |
| 2 | Course | Course et parcours (« Forez Trails · L'Olmetoise ») ; la course seule quand elle n'a pas de parcours (« Biscatrail ») | Texte |
| 3 | Type | Type de course (§ 3) | Choix |
| 4 | Format | Format de la course dans son type (§ 3) : 10 km, Trail court, Triathlon M… | Choix |
| 5 | Distance | Distance officielle, en km | Nombre |
| 6 | D+ | Dénivelé positif officiel, en m | Nombre |
| 7 | Temps | Temps réalisé | Durée |
| 8 | Allure moyenne | Allure moyenne, par km | Durée |

Facultatives, affichées à la demande depuis le bouton « Colonnes + » (§ 9) :

| # | Colonne | Contenu | Saisie |
| --- | --- | --- | --- |
| 9 | Vitesse | Vitesse moyenne, en km/h, tirée de l'allure moyenne | Nombre, calculé |
| 10 | Classement | Place au classement général | Nombre |
| 11 | Classement catégorie | Place dans sa catégorie d'âge | Nombre |
| 12 | Classement sexe | Place parmi les coureurs du même sexe | Nombre |
| 13 | Distance montre | Distance mesurée par la montre | Nombre |
| 14 | D+ montre | Dénivelé mesuré par la montre | Nombre |
| 15 | Temps montre | Durée enregistrée par la montre | Durée |
| 16 | Allure moyenne montre | Allure moyenne affichée par la montre | Durée |
| 17 | Vitesse montre | Tirée de l'allure moyenne montre | Nombre, calculé |
| 18 | FC moyenne | Fréquence cardiaque moyenne, en bpm | Nombre |

Chaque classement peut porter un effectif, facultatif : le nombre de classés, quand il est connu.

## 3. Types et formats

Liste fermée, commune à toute l'application : on choisit une valeur, on ne la tape pas. Le format se choisit à la main, parmi ceux du type choisi.

| Type | Formats |
| --- | --- |
| Course sur route | 5 km · 10 km · 20 km · Semi-marathon · Marathon · Ultra-marathon · 100 km · Course en heure |
| Trail | Trail découverte · Trail court · Trail long · Ultra-trail |
| Marche | Marche découverte · Marche longue · Marche ultra |
| Fast hiking | Ultra-randonnée · Randonnée rapide |
| Triathlon | Triathlon XS · Triathlon S · Triathlon M · Triathlon L · Ironman 70.3 · Triathlon XL · Ironman |

**Trail, selon la distance officielle** (usage de la FFA) : découverte moins de 21 km ; court de 21 à 41 km ; long de 42 à 79 km ; ultra-trail 80 km et plus.

## 4. Données de la course et données montre

- **Données de la course** : distance et D+ annoncés par l'organisateur ; temps, allure et place saisis par l'utilisateur.
- **Course sans classement officiel** : la colonne Classement reste vide.
- **Course non terminée** : « DNF » dans la colonne Temps ; elle n'entre pas dans les records ; au tri par temps, elle se range avec les valeurs vides, en fin de liste.
- **Données montre** : facultatives, elles servent d'information.
- **Allure et vitesse** : deux façons d'écrire la même donnée (vitesse en km/h = 3 600 ÷ allure en secondes par km). Quand une seule des deux est renseignée, la page calcule l'autre, en italique, avec la mention « calculée » au survol ; quand les deux le sont, chacune est affichée telle que saisie. Même règle pour l'allure et la vitesse montre. Arrondis : allure à la seconde, vitesse au dixième. Tri et filtres utilisent aussi les valeurs calculées.
- **Valeur absente** : « — ». En dehors de l'allure et de la vitesse, aucune valeur n'est estimée ni recalculée.

## 5. Records 🥇

- Dans un format à distance fixe, la course au meilleur temps porte 🥇.
- Distances fixes : 5 km, 10 km, 20 km, semi-marathon, marathon, 100 km et tous les formats de triathlon. Les autres formats (ultra-marathon, course en heure, trail, marche, fast hiking) n'ont pas de record : les épreuves n'y sont pas comparables d'une course à l'autre.
- **Calcul automatique** par la page (JavaScript), jamais saisi à la main. Il est refait à chaque affichage et après chaque ajout, modification ou suppression :
  1. écarter les courses sans temps et celles des formats sans record ;
  2. regrouper les courses restantes par format ;
  3. dans chaque groupe, retenir le temps le plus court, comparé en secondes ;
  4. marquer 🥇 la course qui a ce temps ; en cas d'égalité, toutes celles qui l'ont.

## 6. Tri

Toutes les colonnes affichées se trient. L'ordre dépend du type de donnée :

| Type de donnée | Colonnes | Ordre par défaut | Ordre inverse |
| --- | --- | --- | --- |
| Date | Date | Plus récente d'abord | Plus ancienne d'abord |
| Texte et choix | Course, Type, Format | A → Z | Z → A |
| Nombre | Distances, D+, vitesses, classements, FC | Croissant | Décroissant |
| Durée | Temps, allures | Plus court d'abord | Plus long d'abord |

- **Classements** : triés sur la place, pas sur l'effectif (476e / 873 se range comme 476).

- **À l'ouverture** : tri par date, la plus récente en haut.
- Toucher l'en-tête d'une colonne la trie dans son ordre par défaut ; le toucher à nouveau inverse l'ordre.
- **Indicateur de tri** : chaque en-tête porte deux petites flèches, haut et bas, pour signaler que la colonne se trie. Sur la colonne triée, la flèche du sens choisi est mise en avant.
- **Texte** : ordre alphabétique, sans tenir compte des majuscules ni des accents (« Épicurienne » se range avec les E) ; les nombres y sont rangés par valeur (« 5 km » avant « 10 km »).
- **Durées** : triées sur leur valeur, pas sur le texte (00:49:18 passe avant 01:04:24).
- **Valeurs vides** : toujours en fin de liste, dans les deux ordres.
- **Égalité** : départagée par la date, la plus récente d'abord.

## 7. Filtres

Toutes les colonnes affichées se filtrent, selon leur type de donnée :

| Type de donnée | Filtre | Exemple |
| --- | --- | --- |
| Date | Une année (pastilles « Toutes », 2026, 2025…), ou une période du … au … | Les courses de 2025 |
| Texte | Le champ contient le texte tapé, sans tenir compte des majuscules ni des accents | « sete » trouve « Sète » |
| Choix | Une ou plusieurs pastilles choisies, parmi les valeurs présentes dans le tableau | Trail découverte et Trail court |
| Nombre et durée | Minimum, maximum, ou les deux ; une durée s'écrit 2h, 1h30, 00:49:18… | Temps sous 2 h |

- **Panneau de filtres** : un bouton rond « Filtres » (trois traits), au-dessus du tableau, ouvre un panneau qui se déplie au-dessus du tableau : d'abord « Trier par » (une pastille par colonne affichée ; toucher celle du tri en cours inverse le sens, ↓ ou ↑), puis un réglage par colonne affichée. Les choix se font par pastilles (choisie : pleine) et s'appliquent aussitôt. Le bouton porte le nombre de filtres actifs en pastille. Le même bouton, ou « Réduire les filtres » en bas du panneau, le referme ; les filtres restent actifs.
- À côté du bouton : le nombre de courses affichées, par exemple « 4 courses sur 7 », et, dès qu'un filtre est actif, une action unique qui les efface tous.
- Les filtres de plusieurs colonnes se cumulent : une course doit les passer tous.
- Plusieurs valeurs cochées dans une même colonne : une seule suffit.
- Une course sans valeur dans une colonne filtrée est écartée.
- Le tri s'applique aux courses filtrées.
- Masquer une colonne retire son filtre.
- Tri et filtres ne sont pas gardés en mémoire : chaque ouverture revient à la vue par défaut (seul le regroupement est retenu, § 8).

## 8. Regroupement par type

Pour ceux qui veulent un tableau par pratique, sans perdre la vue globale.

- Un bouton rond « Grouper par type » (icône de couches), juste à droite du bouton « Filtres » ; il passe en couleur d'accent quand le regroupement est actif. **Activé par défaut** à la première visite. Désactivé : la vue globale, un seul tableau.
- Activé : le tableau est découpé en groupes, un par type présent, dans l'ordre de la liste de référence (§ 3). Chaque groupe s'ouvre par un intertitre sur toute la largeur, « Trail · 4 courses » ; le toucher replie ou déplie le groupe.
- Un seul tableau : les colonnes restent alignées d'un groupe à l'autre.
- **Tri** : à l'intérieur de chaque groupe ; les groupes gardent l'ordre de référence.
- **Filtres** : appliqués à tous les groupes ; un groupe vide est masqué ; le compteur reste global (« 4 courses sur 7 »).
- **Colonne Type** : masquée tant que le regroupement est actif, redondante avec les intertitres ; elle revient quand on le désactive. Son filtre reste disponible.
- **Records 🥇** : inchangés.
- **Mémoire** : le dernier choix (groupé ou non) est retenu d'une visite à l'autre, sur l'appareil en attendant la base de données, puis dans le compte.

## 9. Plus d'infos : choix des colonnes

- Un bouton à contour « Colonnes + » (infobulle « Ajouter ou retirer des colonnes »), en bout de ligne d'en-tête, ouvre la liste de toutes les colonnes (§ 2), chacune en pastille, pleine quand elle est affichée ; son signe devient « − » tant que la liste est ouverte.
- Au départ, les colonnes affichées par défaut sont cochées, les facultatives décochées.
- Date et Course restent toujours affichées.
- Cocher une colonne l'affiche, la décocher la masque. Masquer une colonne retire son filtre et, si elle était triée, ramène le tri par date.
- Avec la base de données, le choix de chaque utilisateur est retenu d'une visite à l'autre.

## 10. Édition

Chacun ajoute, modifie et supprime ses courses courues dans la page, sans autre outil.

- **Ajouter** : un bouton principal « + Ajouter une course » (« + Course » sur téléphone), tout à droite au-dessus du tableau, ouvre la fiche vide.
- **Consulter** : toucher une ligne (ou cliquer dessus) ouvre la consultation de la course courue, avec le résultat en tête ([spécification d'Objectif](module-objectif-specification.md), § 3.8) ; le crayon de la feuille passe en édition.
- **Modifier** : un crayon, au bout de la ligne, apparaît au survol de la ligne et ouvre directement la fiche, remplie. Sur un écran tactile, sans survol, le crayon reste visible au bout de la ligne.
- **Fiche** : la fiche d'une course, commune avec Objectif ([spécification d'Objectif](module-objectif-specification.md), § 3.8), dans la feuille d'une course (barre « Annuler · Enregistrer », le mode en libellé dessous ; plein écran sur téléphone). Mêmes blocs, dans le même ordre, pour une course courue et une course à venir : Course, Place dans le plan (rôle seul), Préparation (sans plan), Logistique, Dossard (numéro, prix), Résultat, Montre, Liens. Course et Résultat sont ouverts, les blocs de la préparation repliés ; Dossard, Montre et Liens ouverts quand ils ont une valeur. Le curseur est dans le champ Course.

| Bloc (propre à une course courue) | Champs |
| --- | --- |
| Résultat | Temps et, juste dessous, la case « Non terminée (DNF) » ; allure moyenne ; puis les classements : place et effectif au général, sur toute la largeur ; catégorie d'âge (liste de la Fédération française d'athlétisme : CA, JU, ES, SE, M0 à M10), place et effectif en catégorie, trois champs sur la ligne ; place et effectif par sexe, sur toute la largeur |
| Montre | Temps et distance ; D+ et D− ; allure moyenne et FC moyenne |

- **Données de préparation** (rôle, objectif, précisions, stratégie, logistique, liens) : visibles et modifiables, repliées ; une course marquée courue les garde.
- **Non terminée (DNF)** : cochée, elle vide et grise le temps et l'allure moyenne ; la course est rangée sans temps ni allure.
- **Vitesse** : plus saisie ; à l'enregistrement, elle est calculée depuis l'allure moyenne (3 600 ÷ allure, en km/h, deux décimales) et rangée. Même règle pour la vitesse montre. Une course qui n'avait qu'une vitesse reçoit son allure moyenne à l'ouverture du formulaire, pour ne rien perdre.

- **Obligatoires** : date, course, type et format. Les autres champs, parcours compris, peuvent rester vides.
- **Exemples** : chaque champ à saisir montre, en discret, un exemple du format attendu (« ex. Forez Trails », « ex. 24,4 », « ex. 49:18 ou 4918 ») ; il disparaît dès qu'on écrit.
- **Contrôles de saisie** :
  - seuls les formats du type choisi sont proposés ; pour un trail, celui qui correspond à la distance (§ 3) est choisi d'office, et reste modifiable ;
  - nombres positifs ; date du jour ou passée ;
  - durées : `49:18`, `1:56:05`, `01:56:05`, ou chiffres seuls lus par la droite (`4918` = 49:18, `15605` = 1:56:05), le clavier numérique des téléphones n'ayant pas de « : » ;
  - allure moyenne : la vitesse s'en déduit (§ 4).
- Un champ en erreur est signalé sous le champ ; « Enregistrer » reste sans effet tant qu'une erreur demeure.
- **Enregistrer** range la course et met à jour le tableau (tri, filtres, records) ; **Annuler** (barre du haut, toujours visible) ferme sans rien changer, après « Abandonner les modifications ? » s'il y a eu une saisie.
- **Supprimer la course** : seulement dans la fiche d'une course existante, bouton à contour rouge avec une poubelle, en bas, après une confirmation (« Supprimer cette course ? Cette action est définitive. »).
- **Course ajoutée ici** : statut Confirmée, état Courue, rôle Préparatoire par défaut (modifiable dans Place dans le plan).
- **Site partagé en lecture seule** : ni bouton d'ajout, ni crayon ; toucher une ligne ouvre la consultation, sans crayon.
- **Depuis la page Objectif** (avec ce module) : cocher une course comme faite ouvre la même fiche, pré-remplie de ce que la page Objectif connaît ; à l'enregistrement, la course passe à l'état Courue et rejoint le Palmarès.

## 11. Affichage des valeurs

| Donnée | Format | Exemple |
| --- | --- | --- |
| Valeur absente | Tiret | — |
| Course non terminée | Dans la colonne Temps | DNF |
| Date | Jour, mois abrégé, année | 4 oct. 2026 |
| Distance | Kilomètres, une décimale | 21,1 km |
| D+ | Mètres | 932 m |
| Temps | Toujours heures:minutes:secondes, sur deux chiffres chacune | 00:49:18 · 01:56:05 |
| Allure moyenne | Minutes:secondes par kilomètre | 5:24 /km |
| Vitesse | Kilomètres par heure, une décimale | 11,1 km/h |
| Classement | Place, suivie de l'effectif quand il est connu ; première place « 1re » pour une coureuse (sexe renseigné dans le Profil), « 1er » sinon | 1 951e · 476e / 873 · 1re |
| FC | Battements par minute | 150 bpm |

**Page et téléphone**

- La page n'a pas d'en-tête : elle commence par la barre fine et le menu, puis la barre (Filtres, regroupement, « + Ajouter une course ») et le tableau, qui garde son cadre (un bloc de données garde le sien, design § 1).
- Téléphone tenu en hauteur : le tableau défile sur le côté ; une ligne, sous la barre, invite à tourner le téléphone : « ↻ Tourne ton téléphone pour voir toutes les colonnes. » (un site ne peut pas tourner l'écran lui-même sur iPhone).
- Téléphone tenu en largeur : une ligne par course, sans retour à la ligne dans les cellules ; le tableau défile sur le côté s'il le faut. Ni invitation, ni sur ordinateur.

## 12. Contrôles

Jeu d'essai de sept courses :

| Date | Course | Type | Format | Distance | D+ | Temps | Allure moyenne |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 mars 2025 | 10 km de Montauban | Course sur route | 10 km | 10,1 km | 24 m | 00:51:46 | 5:08 /km |
| 13 sept. 2025 | Épicurienne Trail | Trail | Trail découverte | 10,7 km | 199 m | 01:04:24 | 6:00 /km |
| 5 oct. 2025 | Semi-marathon de Sète | Course sur route | Semi-marathon | 20,8 km | 56 m | 01:53:12 | 5:24 /km |
| 30 nov. 2025 | Biscatrail | Trail | Trail découverte | 18,3 km | 340 m | 02:02:30 | 6:35 /km |
| 8 mars 2026 | Forez Trail · L'Olmetoise | Trail | Trail court | 24,1 km | 932 m | 03:00:23 | 7:18 /km |
| 29 mars 2026 | 10 km de Montauban | Course sur route | 10 km | 10,0 km | 24 m | 00:49:18 | 4:55 /km |
| 4 oct. 2026 | Semi de San Sebastián | Course sur route | Semi-marathon | 21,1 km | — | 01:56:05 | 5:30 /km |

Classement (colonne facultative) : 1 951e pour le semi de San Sebastián, vide pour les six autres.

Résultats attendus (sauf mention contraire, regroupement désactivé) :

- À l'ouverture : le semi de San Sebastián en premier, le 10 km de Montauban du 30 mars 2025 en dernier.
- Tri par course, de A à Z : 10 km de Montauban (2026, puis 2025), Biscatrail, Épicurienne Trail, Forez Trail · L'Olmetoise, Semi de San Sebastián, Semi-marathon de Sète.
- Tri par temps : 10 km de Montauban 2026 (00:49:18) en premier, Forez Trail · L'Olmetoise (03:00:23) en dernier.
- Tri par D+, dans un sens comme dans l'autre : le semi de San Sebastián, sans D+, reste en dernier.
- Tri par classement, une fois la colonne affichée : le semi de San Sebastián en premier, puis les six courses sans classement.
- Filtre sur l'année 2025 : « 4 courses sur 7 ».
- Recherche « montauban » dans Course : « 2 courses sur 7 ». Recherche « sete » : « 1 course sur 7 », le semi-marathon de Sète.
- Records 🥇 : le 10 km de Montauban du 29 mars 2026 (00:49:18) et le semi-marathon de Sète (01:53:12). Aucun pour les trails.
- Si l'on supprime le 10 km de Montauban du 29 mars 2026, le 🥇 du 10 km passe à celui du 30 mars 2025 (00:51:46).
- À l'ouverture, aucune colonne facultative n'est affichée.
- Décocher D+ dans la liste des colonnes : la colonne disparaît ; la recocher : elle revient. Date et Course n'ont pas de case à décocher.
- Colonne Vitesse affichée : 11,1 km/h en italique pour le semi-marathon de Sète, calculée depuis 5:24 /km ; 12,2 km/h pour le 10 km de Montauban 2026, calculée depuis 4:55 /km.
- Un classement saisi 476 sur 873 s'affiche « 476e / 873 » et se trie comme 476.
- Première visite : le tableau s'ouvre groupé par type.
- « Grouper par type » activé : intertitre « Course sur route · 4 courses », puis « Trail · 3 courses » ; la colonne Type disparaît.
- Groupé, tri par temps : groupe route 00:49:18, 00:51:46, 01:53:12, 01:56:05 ; groupe trail 01:04:24, 02:02:30, 03:00:23.
- Groupé, filtre sur l'année 2025 : 2 courses dans chaque groupe, compteur « 4 courses sur 7 ».
- Toucher l'intertitre Trail : ses lignes disparaissent, l'intertitre reste ; le toucher à nouveau les fait revenir.
- Recharger la page : le regroupement est toujours actif. Le désactiver : retour à la vue globale, colonne Type comprise.
- Une course marquée non terminée affiche « DNF » dans Temps, sans 🥇, et se range en fin de liste au tri par temps.
- Ajouter une course « Test », 1er octobre 2026, Course sur route · 10 km, temps saisi `4500` : elle apparaît avec 00:45:00, et prend le 🥇 du 10 km.
- Formulaire sans parcours, ou avec une distance négative : « Enregistrer » reste sans effet, l'erreur est signalée sous le champ.
- Type Trail, distance 24 : le format proposé est Trail court.
- Modifier la course « Test » (temps `5200`) : 00:52:00, le 🥇 revient au 00:49:18.
- Supprimer la course « Test » : une confirmation est demandée ; après accord, elle disparaît.
- Site partagé en lecture seule : ni bouton « Ajouter une course » ni crayon ; toucher une ligne n'ouvre rien.
- Ordinateur : le crayon n'apparaît qu'au survol de sa ligne. Écran tactile : toucher la ligne ouvre sa fiche.
- Ouvrir les filtres : « Trier par » montre « Date↓ » ; la pastille Trail donne « 3 courses sur 7 » et un « 1 » sur le bouton Filtres ; la pastille 2025 filtre l'année, « Toutes » rétablit les 7 ; la pastille Temps trie du plus court au plus long (« Temps↑ »).
- Téléphone : « X courses sur Y » passe sous les boutons Filtres, regroupement et « + Course ».
- Téléphone tenu en hauteur : « ↻ Tourne ton téléphone pour voir toutes les colonnes. » sous la barre. Tenu en largeur (844 × 390) : pas d'invitation, une ligne par course. Ordinateur : pas d'invitation.
- Ajouter une course « Biscatrail » sans parcours : elle s'affiche « Biscatrail » ; avec le parcours « Le 18 km » : « Biscatrail · Le 18 km ».
- Téléphone : la fiche tient dans la largeur de l'écran ; « Annuler » et « Enregistrer » restent visibles quand on fait défiler.
