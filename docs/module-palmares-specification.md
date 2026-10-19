# Palmarès · spécification fonctionnelle

Version 0.9 · 19 octobre 2026 · [Retour au sommaire](README.md) · Jalon 2

## 1. Objet

Le Palmarès liste les courses déjà courues par l'utilisateur, avec leurs résultats. Il sert à retrouver une course, à comparer ses résultats et à repérer ses records.

- **Deux temps** : d'abord la consultation (tri, filtres, choix des colonnes) ; puis, quand la base de données sera en place, l'édition (§ 9).
- **Hors périmètre** : la présentation visuelle (document séparé) ; l'import automatique de données (montre, applications de sport).

## 2. Colonnes

Affichées par défaut, de gauche à droite :

| # | Colonne | Contenu | Saisie |
| --- | --- | --- | --- |
| 1 | Date | Jour de la course | Date |
| 2 | Course | Nom de la course | Texte |
| 3 | Type | Type de course (§ 3) | Choix |
| 4 | Sous-catégorie | Précision du type (§ 3) | Choix |
| 5 | Distance | Distance officielle, en km | Nombre |
| 6 | D+ | Dénivelé positif officiel, en m | Nombre |
| 7 | Temps | Temps réalisé | Durée |
| 8 | Allure | Allure moyenne, par km | Durée |

Facultatives, affichées à la demande depuis le bouton « + » (§ 8) :

| # | Colonne | Contenu | Saisie |
| --- | --- | --- | --- |
| 9 | Classement | Place au classement général | Nombre |
| 10 | Distance montre | Distance mesurée par la montre | Nombre |
| 11 | D+ montre | Dénivelé mesuré par la montre | Nombre |
| 12 | Temps montre | Durée enregistrée par la montre | Durée |
| 13 | Allure montre | Allure moyenne affichée par la montre | Durée |
| 14 | FC moyenne | Fréquence cardiaque moyenne, en bpm | Nombre |

## 3. Types et sous-catégories

Liste fermée, commune à toute l'application : on choisit une valeur, on ne la tape pas. La sous-catégorie se choisit à la main, parmi celles du type choisi.

| Type | Sous-catégories |
| --- | --- |
| Course sur route | 5 km · 10 km · 20 km · Semi-marathon · Marathon · Ultra-marathon · 100 km · Course en heure |
| Trail | Trail découverte · Trail court · Trail long · Ultra-trail |
| Marche | Marche découverte · Marche longue · Marche ultra |
| Fast hiking | Ultra-randonnée · Randonnée rapide |
| Triathlon | Triathlon XS · Triathlon S · Triathlon M · Triathlon L · Ironman 70.3 · Triathlon XL · Ironman |

## 4. Données de la course et données montre

- **Données de la course** : distance et D+ annoncés par l'organisateur ; temps, allure et place saisis par l'utilisateur.
- **Course sans classement officiel** : la colonne Classement reste vide.
- **Données montre** : facultatives, elles servent d'information.
- **Valeur absente** : « — ». Aucune valeur n'est estimée ni recalculée.

## 5. Records 🥇

- Dans une sous-catégorie à distance fixe, la course au meilleur temps porte 🥇.
- Distances fixes : 5 km, 10 km, 20 km, semi-marathon, marathon, 100 km et tous les formats de triathlon. Les autres sous-catégories (ultra-marathon, course en heure, trail, marche, fast hiking) n'ont pas de record : les épreuves n'y sont pas comparables d'une course à l'autre.
- **Calcul automatique** par la page (JavaScript), jamais saisi à la main. Il est refait à chaque affichage et après chaque ajout, modification ou suppression :
  1. écarter les courses sans temps et celles des sous-catégories sans record ;
  2. regrouper les courses restantes par sous-catégorie ;
  3. dans chaque groupe, retenir le temps le plus court, comparé en secondes ;
  4. marquer 🥇 la course qui a ce temps ; en cas d'égalité, toutes celles qui l'ont.

## 6. Tri

Toutes les colonnes affichées se trient. L'ordre dépend du type de donnée :

| Type de donnée | Colonnes | Ordre par défaut | Ordre inverse |
| --- | --- | --- | --- |
| Date | Date | Plus récente d'abord | Plus ancienne d'abord |
| Texte et choix | Course, Type, Sous-catégorie | A → Z | Z → A |
| Nombre | Distances, D+, Classement, FC | Croissant | Décroissant |
| Durée | Temps, allures | Plus court d'abord | Plus long d'abord |

- **À l'ouverture** : tri par date, la plus récente en haut.
- Toucher l'en-tête d'une colonne la trie dans son ordre par défaut ; le toucher à nouveau inverse l'ordre.
- **Indicateur de tri** : chaque en-tête porte deux petites flèches, haut et bas, pour signaler que la colonne se trie. Sur la colonne triée, la flèche du sens choisi est mise en avant.
- **Texte** : ordre alphabétique, sans tenir compte des majuscules ni des accents (« Épicurienne » se range avec les E) ; les nombres y sont rangés par valeur (« 5 km » avant « 10 km »).
- **Durées** : triées sur leur valeur, pas sur le texte (49'18 passe avant 1h04'24).
- **Valeurs vides** : toujours en fin de liste, dans les deux ordres.
- **Égalité** : départagée par la date, la plus récente d'abord.

## 7. Filtres

Toutes les colonnes affichées se filtrent, selon leur type de donnée :

| Type de donnée | Filtre | Exemple |
| --- | --- | --- |
| Date | Une année, ou une période du … au … | Les courses de 2025 |
| Texte | Le champ contient le texte tapé, sans tenir compte des majuscules ni des accents | « sete » trouve « Sète » |
| Choix | Une ou plusieurs valeurs cochées, parmi celles présentes dans le tableau | Trail découverte et Trail court |
| Nombre et durée | Minimum, maximum, ou les deux ; une durée s'écrit 2h, 1h30, 49'18… | Temps sous 2 h |

- **Panneau de filtres** : un bouton « Filtres », au-dessus du tableau, ouvre un panneau avec un réglage par colonne affichée. Le bouton indique le nombre de filtres actifs (« Filtres · 2 »). Le même bouton, ou « Réduire les filtres » en bas du panneau, le referme ; les filtres restent actifs.
- À côté du bouton : le nombre de courses affichées, par exemple « 4 courses sur 7 », et, dès qu'un filtre est actif, une action unique qui les efface tous.
- Les filtres de plusieurs colonnes se cumulent : une course doit les passer tous.
- Plusieurs valeurs cochées dans une même colonne : une seule suffit.
- Une course sans valeur dans une colonne filtrée est écartée.
- Le tri s'applique aux courses filtrées.
- Masquer une colonne retire son filtre.
- Tri et filtres ne sont pas gardés en mémoire : chaque ouverture revient à la vue par défaut.

## 8. Plus d'infos : choix des colonnes

- Un bouton « + », en bout de ligne d'en-tête, ouvre la liste des colonnes facultatives (§ 2), chacune avec une case à cocher ; il devient « − » tant que la liste est ouverte.
- Cocher une colonne l'affiche, la décocher la masque. Par défaut, toutes sont masquées.
- Avec la base de données, le choix de chaque utilisateur est retenu d'une visite à l'autre.

## 9. Édition (avec la base de données)

Les nouvelles entrées sont saisies à la main.

- **Ajouter une entrée** : un bouton ajoute une ligne vide en haut du tableau. Chaque champ s'y remplit avec un contrôle adapté à son type (date, texte, choix, nombre, durée). « Enregistrer » valide la ligne, « Annuler » la retire.
- **Modifier** : ✏️, en regard de chaque ligne, la rend modifiable avec les mêmes contrôles, puis « Enregistrer » ou « Annuler ».
- **Supprimer** : 🗑️, en regard de chaque ligne, la supprime après confirmation.
- **Champs obligatoires** : date, course, type et sous-catégorie. Les autres peuvent rester vides.
- **Contrôles de saisie** : seules les sous-catégories du type choisi sont proposées ; durées au format h:mm:ss ou mm:ss ; nombres positifs.
- **Depuis la page Objectif** : cocher une course comme faite ouvre une fenêtre qui invite à remplir sa fiche. Les champs que la page Objectif connaît déjà (date, nom, distance, D+…) sont pré-remplis. À l'enregistrement, la course rejoint le Palmarès et quitte la page Objectif.

## 10. Formats

| Donnée | Format | Exemple |
| --- | --- | --- |
| Valeur absente | Tiret | — |
| Date | Jour, mois abrégé, année | 4 oct. 2026 |
| Distance | Kilomètres, une décimale | 21,1 km |
| D+ | Mètres | 932 m |
| Temps | Minutes et secondes ; heures en plus au-delà d'une heure | 49'18 · 1h56'05 |
| Allure | Minutes:secondes par kilomètre | 5:24 /km |
| Classement | Place | 1 951e |
| FC | Battements par minute | 150 bpm |

## 11. Contrôles

Jeu d'essai de sept courses :

| Date | Course | Type | Sous-catégorie | Distance | D+ | Temps | Allure |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30 mars 2025 | 10 km de Montauban | Course sur route | 10 km | 10,1 km | 24 m | 51'46 | 5:08 /km |
| 13 sept. 2025 | Épicurienne Trail | Trail | Trail découverte | 10,7 km | 199 m | 1h04'24 | 6:00 /km |
| 5 oct. 2025 | Semi-marathon de Sète | Course sur route | Semi-marathon | 20,8 km | 56 m | 1h53'12 | 5:24 /km |
| 30 nov. 2025 | Biscatrail | Trail | Trail découverte | 18,3 km | 340 m | 2h02'30 | 6:35 /km |
| 8 mars 2026 | Forez Trail · L'Olmetoise | Trail | Trail court | 24,1 km | 932 m | 3h00'23 | 7:18 /km |
| 29 mars 2026 | 10 km de Montauban | Course sur route | 10 km | 10,0 km | 24 m | 49'18 | 4:55 /km |
| 4 oct. 2026 | Semi de San Sebastián | Course sur route | Semi-marathon | 21,1 km | — | 1h56'05 | 5:30 /km |

Classement (colonne facultative) : 1 951e pour le semi de San Sebastián, vide pour les six autres.

Résultats attendus :

- À l'ouverture : le semi de San Sebastián en premier, le 10 km de Montauban du 30 mars 2025 en dernier.
- Tri par course, de A à Z : 10 km de Montauban (2026, puis 2025), Biscatrail, Épicurienne Trail, Forez Trail · L'Olmetoise, Semi de San Sebastián, Semi-marathon de Sète.
- Tri par temps : 10 km de Montauban 2026 (49'18) en premier, Forez Trail · L'Olmetoise (3h00'23) en dernier.
- Tri par D+, dans un sens comme dans l'autre : le semi de San Sebastián, sans D+, reste en dernier.
- Tri par classement, une fois la colonne affichée : le semi de San Sebastián en premier, puis les six courses sans classement.
- Filtre sur l'année 2025 : « 4 courses sur 7 ».
- Recherche « montauban » dans Course : « 2 courses sur 7 ». Recherche « sete » : « 1 course sur 7 », le semi-marathon de Sète.
- Records 🥇 : le 10 km de Montauban du 29 mars 2026 (49'18) et le semi-marathon de Sète (1h53'12). Aucun pour les trails.
- Si l'on supprime le 10 km de Montauban du 29 mars 2026, le 🥇 du 10 km passe à celui du 30 mars 2025 (51'46).
- À l'ouverture, aucune colonne facultative n'est affichée.
