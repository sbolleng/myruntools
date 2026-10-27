# Design

Version 0.24 · 27 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit l'apparence commune à toute l'application : couleurs, typographies, tailles et disposition de l'en-tête et du menu. Le contenu et les règles sont dans la [spécification générale](specification-generale.md).

## 1. Principes

- Une seule mise en page pour tous ; seules les couleurs changent d'un thème à l'autre.
- Fond sombre, chiffres en police à chasse fixe, libellés en petites capitales.
- Toute couleur passe par un rôle (§ 2) : aucune couleur écrite en dur dans un module.
- Les effets de survol ne s'appliquent qu'aux appareils avec une souris : sur écran tactile, un toucher les laisserait « collés » (un bouton resterait en couleur d'accent).

**Règles communes**, les mêmes sur toutes les pages, pour un site sobre et homogène :

| Règle | En pratique |
| --- | --- |
| Peu de couleur | L'Accent marque le titre de l'écran (le cap dans l'en-tête, le nom de la course sur sa page) et ce qui est actif (onglet ouvert, tri, filtre actif, bouton principal, champ en cours de saisie). L'Accent 2 marque les repères de données : compte à rebours des courses, objectif, point du dossard, rôle Objectif intermédiaire. |
| Le reste en blanc et gris | Valeurs et noms en Texte ; libellés et informations secondaires en Texte discret ; liens dans le texte soulignés, en Texte. |
| Capitales pour les libellés seulement | Libellés de données (à gauche ou au-dessus d'une valeur, d'un champ, en-tête de colonne). Onglets, boutons, titres de section en casse normale. |
| Tout dans un cadre | Chaque bloc de la page a son cadre (fond Surface, bordure fine, coins de 8 px) : tableau du Palmarès, carte d'une étape, fiche d'une course, liste des textes d'une course, Préférences (un cadre pour toute la page), panneaux. Dans un cadre, les sections sont séparées par un filet (Bordure). Jamais de cadre dans un cadre. |
| Trois sortes de boutons | Principal : Accent plein, un par écran au plus (Enregistrer, Partager, Recevoir le lien). À contour : bordure fine, texte en Texte (Annuler, Retenir cette course). Rond : une icône (filtres, crayon, regroupement, flèches, fermer). Et le lien d'action : souligné, Texte discret (Se déconnecter, Rétablir l'ordre, Effacer les filtres) ; Alerte pour Supprimer. Tous en casse normale, Accent au survol. |
| Un seul titre repliable | Chevron à gauche, titre en Texte, 600, casse normale : textes d'une course, blocs du formulaire, groupes du Palmarès. |

Les boutons, liens d'action et sections sont des éléments communs de la feuille de style partagée (`mrt-btn`, `mrt-rond`, `mrt-lien`, `mrt-section`) : un module les reprend, il ne les redessine pas.

## 2. Thèmes

| Rôle | Bleu et orange | Vert et rose | Violet et turquoise |
| --- | --- | --- | --- |
| Fond | `#060b14` | `#0E1D19` | `#14101F` |
| Surface | `#122a4a` | `#18332E` | `#221A35` |
| Surface 2 | `#163a66` | `#21453D` | `#2D2347` |
| Bordure | `#1f4c80` | `#2F5A4E` | `#40335F` |
| Accent | `#ffb700` | `#D07B87` | `#2EC4B6` |
| Accent 2 | `#ffd400` | `#B76E78` | `#5EDDD1` |
| Texte | `#eef3fa` | `#EDF2E9` | `#F1EEF7` |
| Texte discret | `#8fa8c9` | `#8FA391` | `#A49BB8` |
| Alerte | `#e05c5c` | `#A56269` | `#E0607E` |

Identifiants : `bleu-orange`, `vert-rose`, `violet-turquoise`. Dans les maquettes seulement, `?t=bleu-orange`, `?t=vert-rose` ou `?t=violet-turquoise` choisit le thème.

## 3. Typographies

| Usage | Police |
| --- | --- |
| Textes, titres, onglets, boutons, valeurs | Space Grotesk |
| Libellés, comptes à rebours, indicateurs de l'en-tête | Space Mono |

Taille de base du texte : 19 px sur ordinateur, 17 px sur téléphone.

**Tailles dans les pages** (sous l'en-tête et le menu) : fixées une fois pour toutes, à reprendre telles quelles dans chaque nouvelle page ou module.

| Élément | Taille | Style |
| --- | --- | --- |
| Titre de la page (nom de la course sur sa page) | 1,4 à 2 rem | Space Grotesk 700, Accent |
| Titre d'une section (Préférences) | 1 rem | Space Grotesk 600, Texte |
| Titre repliable (textes, blocs du formulaire, groupes) | 0,85 rem | Space Grotesk 600, Texte, chevron à gauche |
| Texte courant, tableaux, champs, listes | 0,85 rem | Space Grotesk, normal ; jamais en gras, sauf un nom mis en avant (600) |
| Texte secondaire (aide, explication) | 0,8 rem | Texte discret |
| Boutons | 0,8 rem | Space Grotesk 600, casse normale |
| Messages (« Enregistré », erreurs) | 0,75 rem | Texte discret, ou Alerte |
| Libellé (donnée, champ, colonne, sous-titre dans un bloc) | 0,7 rem | Space Mono, capitales, espacement 0,1 em, Texte discret |

Le contenu des pages (`main`) est à 0,85 rem par défaut, dans la feuille de style commune : un texte sans taille précisée n'est jamais à la taille de base.

## 4. En-tête

Sur la page de démarrage seulement (spécification générale, § 5 bis) ; les autres pages commencent par la barre fine et le menu.

### Tailles

| Élément | Police | Taille | Graisse | Couleur |
| --- | --- | --- | --- | --- |
| Nom de l'application | Space Mono, capitales, espacement 0,15 em | 0,7 rem | Normale | Texte discret |
| Titre, ligne « Cap sur » | Space Grotesk, interligne 1, espacement −0,02 em | 1,9 à 3,1 rem selon la largeur d'écran | 700 | Texte |
| Titre, nom de la course | Idem | Idem | 700 | Accent |
| Valeur d'indicateur (15 rem de large au plus, va à la ligne au-delà) | Space Mono | 1,1 rem ; 0,95 rem sur téléphone | 700 | Texte |
| Dénivelé dans Distance (« / 3 500 m D+ ») | Space Mono | 0,8 rem | Normale | Texte discret |
| Libellé d'indicateur | Space Grotesk, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Nombre de jours | Space Mono, interligne 1 | 3,1 rem ; 1,6 rem sur téléphone | 700 | Accent |
| « jours » | Space Grotesk, capitales, espacement 0,12 em | 0,7 rem | Normale | Texte discret |
| Heures, minutes, secondes | Space Mono, chiffres à largeur fixe | 0,72 rem | Normale | Texte discret |
| Prochaine course | Space Grotesk | 0,65 rem | Normale | Texte discret |

### Disposition

- **Marges** : 1,5 rem en haut, 2 rem sur les côtés, 1,25 rem en bas ; indicateurs à 1,2 rem sous le titre, filet à 1,6 rem ; 1,25 rem en haut et sur les côtés, 1,1 rem en bas sur téléphone. Contenu centré, 960 px de large au plus.
- **Nom de l'application et engrenage** : en haut à droite, leur haut aligné sur le haut de « Cap sur », à toutes les largeurs d'écran.
- **Ordinateur** : deux colonnes, 2 rem entre elles. À gauche le titre, puis les indicateurs, espacés de 2 rem, 1,5 rem sous le titre, qui passent à la ligne faute de place ; à droite, en haut le nom de l'application, en bas le compte à rebours et la prochaine course, alignés à droite, leur bas au niveau du bas des indicateurs.
- **Téléphone** (600 px et moins) : une seule colonne, serrée, pour que la page commence dans le premier écran (environ 300 px d'en-tête). Le titre à 1,65 rem, sur toute la largeur, le nom de l'application et l'engrenage en haut à droite face à « Cap sur » ; juste sous le nom de la course, le compte à rebours sur une ligne (nombre de jours à 1,6 rem, « jours », les heures), dont il fait partie ; les indicateurs sur deux colonnes, 1 rem plus bas ; enfin la prochaine course, à part, sous un filet (Bordure), 0,75 rem, alignée à gauche.
- **« Cap sur »** ne se coupe jamais : il tient sur une ligne, le nom de la course dessous.
- **Filet** : barre de 5 px, 1,6 rem sous le contenu (1,1 rem sur téléphone), d'un bord à l'autre de l'écran ; dégradé en bandes qui alterne Accent, Accent 2 et Surface 2, comme un profil de course.
- Le filet ferme l'en-tête : il touche le menu, sans vide ni ligne fine entre les deux.

## 5. Page de connexion

Sobre, sans en-tête ni menu, centrée dans la page, 22 rem de large au plus.

| Élément | Police | Taille | Couleur |
| --- | --- | --- | --- |
| « MyRunTools » | Space Grotesk, graisse 700, espacement −0,02 em | 2 rem | Texte |
| Accroche | Space Grotesk | 0,85 rem | Texte discret |
| Libellé « Adresse e-mail » | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Texte discret |
| Champ e-mail | Space Grotesk | 0,85 rem | Texte ; fond transparent, bordure fine (Bordure), Accent au focus |
| Bouton « Recevoir le lien de connexion » | Bouton principal (§ 1) : Space Grotesk 600, casse normale | 0,8 rem | Accent plein, coins arrondis, toute la largeur |
| Ligne d'aide et messages | Space Grotesk | 0,75 rem | Texte discret ; Alerte pour une erreur |

## 6. Formulaires et bandeau

Ils reprennent le style du site : rien de nouveau, des éléments déjà présents.

- **Panneau de formulaire** : surface (Surface), bordure fine (Bordure), coins arrondis de 8 px, comme les cartes ; sur téléphone, il occupe tout l'écran et défile, sans jamais déborder sur les côtés.
- **Champs sur écran tactile** : texte à 16 px au moins (tous les formulaires du site), sinon Safari sur iPhone zoome sur le champ touché et la page déborde. Sur iPhone et iPad, le site ajoute en plus `maximum-scale=1` à la balise viewport : plus de zoom automatique, le zoom à deux doigts reste possible.
- **Fermer** : bouton rond « × » en haut à droite (§ 1), Accent au survol ; le titre et ce bouton restent visibles quand le formulaire défile. « Annuler », en bas, ferme aussi.
- **Case « Non terminée (DNF) »** : juste sous le champ Temps, en texte discret, pour montrer qu'elle s'y rapporte.
- **Nombres** : virgule décimale (« 24,4 »).
- **Blocs** : titre repliable (§ 1 et § 3) : chevron à gauche, Space Grotesk 600, 0,85 rem, Texte, casse normale ; Accent au survol.
- **Champs** : ceux de la page de connexion (fond transparent, bordure fine, Accent au focus, 0,85 rem), libellé au-dessus en petites capitales, exemple en Texte discret dans le champ vide ; deux colonnes sur ordinateur, une sur téléphone ; la date seule sur sa ligne.
- **Boutons** (§ 1) : « Enregistrer » bouton principal (Accent plein) ; « Annuler » à contour ; « Supprimer » lien d'action en Alerte, à l'écart des autres.
- **Message d'erreur** : 0,75 rem, couleur Alerte, sous le champ concerné.
- **Bandeau de lecture seule** : sous le menu, sur toute la largeur, fond Surface 2, texte 0,75 rem ; « Revenir à mon site » en lien souligné.

## 7. Barre et lignes du Palmarès

- **Barre** : boutons ronds espacés de 0,5 rem, le compteur à 0,85 rem. « Filtres », bouton rond (§ 1) à trois traits de plus en plus courts, en Accent quand un filtre est actif ou le panneau ouvert, le nombre de filtres actifs en petite pastille Accent en haut à droite ; puis le bouton rond « Grouper par type » (icône de couches), en Accent quand le regroupement est actif ; tout à droite, « + Ajouter une course » (« + Course » sur téléphone), bouton principal.
- **Tableau** : dans son cadre (§ 1). Groupes : titre repliable (§ 1), filet en Bordure dessous.
- **Téléphone tenu en hauteur** : sous la barre, « ↻ Tourne ton téléphone pour voir toutes les colonnes. », 0,8 rem, Texte discret. **Tenu en largeur** : une ligne par course (pas de retour à la ligne dans les cellules), cadre resserré.
- **Compteur** « X courses sur Y » à droite du regroupement, 0,8 rem, Texte discret ; sur téléphone, il passe sous les boutons.
- **Bouton des colonnes** (« Colonnes + » en bout d'en-tête) : petit bouton à contour, libellé en capitales Space Mono 0,65 rem, Texte discret, Accent quand la liste est ouverte.
- **Pastilles** (panneau des filtres, tri, colonnes) : arrondies, contour Bordure, texte Texte 0,8 rem ; choisie : fond Accent, texte Fond. Libellés de rubrique comme les légendes (Space Mono, capitales, Texte discret).
- **Intertitres du regroupement par type** : Space Grotesk 700, 0,95 rem, en Accent (orange dans le thème par défaut), chevron compris, pour repérer d'un coup d'œil Trail, Course sur route…
- **Largeur** : toutes les pages ont la même largeur de contenu sur ordinateur (960 px, marges de 2 rem), page d'une course comprise ; seule la connexion garde sa colonne étroite.
- **Crayon** : trait fin, Texte discret comme les flèches de tri, visible seulement au survol de la ligne (Accent sous le pointeur) ; la ligne survolée s'éclaire légèrement (Surface 2). Sur écran tactile : pas de crayon, la ligne entière s'ouvre au toucher.

## 8. Menu

- Onglets en Space Grotesk, casse normale, 0,8 rem, graisse 500 ; marges de 0,85 rem en haut et en bas, 1,1 rem sur les côtés.
- Onglet En un coup d'œil : « En un coup d' » suivi d'un picto d'œil (contour et pupille, couleur de l'onglet, 1,15 em de large) ; le nom complet en infobulle et pour les lecteurs d'écran.
- Onglet ordinaire en Texte discret, Texte au survol ; onglet de la page ouverte en Accent, souligné de 2 px en Accent.
- **Barre fine**, au-dessus du menu, sur les pages sans en-tête : « Cap sur » en Texte discret et le nom du cap en Accent, 600, comme le grand titre dont il prend le relais (0,8 rem, coupé par « … » s'il est trop long ; il mène à l'Accueil) à gauche ; l'engrenage à droite. Marges de 0,55 rem en haut et en bas, filet (Bordure) dessous.
- Barre sur le Fond, ligne fine (Bordure) dessous ; elle reste collée en haut de l'écran au défilement ; défilement horizontal sans barre visible sur téléphone.

## 9. En un coup d'œil

- Blocs dans un cadre (Surface, Bordure, coins de 8 px, marges 1 rem × 1,15 rem), deux colonnes sur ordinateur (écart 1 rem), une sur téléphone.
- Titre de bloc en capitales Space Mono 0,7 rem, Texte discret ; à droite, un lien « … → » en Space Grotesk 0,75 rem.
- Bloc « bientôt » : contour pointillé, sans fond, à demi transparent.
- Prochaine course : la carte de la feuille de route, sans son propre cadre. D'ici là : une pastille par étape (contour Bordure), le cap en Accent.
- **Passage** grand en-tête ↔ barre fine : 0,45 s, ease-out ; la barre part de la hauteur de l'en-tête (5 rem de marge haute et basse), le nom du cap grossi 1,8 fois et en Accent, et se réduit ; l'en-tête part de la hauteur de la barre et se déplie. Aucun passage si l'utilisateur a demandé à réduire les animations.
- **Sans page blanche** : pendant la visite, l'en-tête et le menu de la page précédente sont gardés ; la page suivante les dessine aussitôt (le passage commence tout de suite), seul le contenu attend la base, puis arrive en fondu (0,2 s).

## 10. Calendrier (vue Année)

Les couleurs des courses ne changent pas d'un thème à l'autre : la même famille doit se reconnaître partout.

| Rôle | Valeur | Emploi |
| --- | --- | --- |
| Route | `#4db8ff` | Course sur route (tout ce qui n'est pas trail) |
| Trail | `#ff7a45` | Course de trail |

- **Course validée** : case pleine de la couleur de la famille, nom en Fond.
- **Course non validée** : couleur de la famille à 30 % sur Surface, cadre de 1 px de la couleur pleine, nom en Texte.
- **Course courue** : case en Texte discret, nom en Fond.
- **Trait de début de prépa** : 4 px de haut, 45 % de la largeur de la case, de la couleur pleine de la famille, cerclé de 1 px de Fond pour rester visible sur une case de course.
- **Cadre** : toute la page dans un cadre (Surface), comme les autres pages ; page sans en-tête (barre fine « Cap sur … »).
- **Jours** : une ligne de 0,8 rem (0,72 rem sur téléphone), 1 px entre deux jours et 3 px entre deux mois ; fond entre Fond et Surface, week-end plus clair ; jours passés à 45 % d'opacité ; aujourd'hui cerclé de 1 px de Texte.
- **Texte** : nom du mois en Space Mono 0,62 rem, Texte discret ; numéro du jour en Space Mono 0,5 rem, Texte discret ; nom de la course en Space Grotesk 0,58 rem (0,52 rem sur téléphone).

**Vue 4 semaines et rubrique Préparation (page d'une course)**

- **Phases** : Base `#5fb49c`, Développement `#e6b84d`, Affûtage `#b48ef0`, Deload `#8fa8c9` ; mêmes valeurs dans les trois thèmes. Une semaine : trait vertical de 4 px à gauche dans la couleur de sa phase (pointillé en Bordure pour « Sans objectif clair »), nom de la phase en 0,85 rem, 600, dans cette couleur.
- **Semaine** : titre en Space Mono 0,62 rem capitales, Texte discret ; sept jours côte à côte (un par ligne sur téléphone), cases entre Fond et Surface, week-end plus clair, jour passé à 55 %, aujourd'hui cerclé de 1 px de Texte.
- **Séance** : case à cocher en Accent, type en Space Mono 0,58 rem capitales Texte discret, libellé en 0,72 rem ; barrée et en Texte discret quand elle est faite. Bouton « + » rond en bas à droite de la case du jour. Course du jour : pastille aux quatre couleurs du § 10 ; rendez-vous clé : « ◆ » et texte en 0,68 rem.
- **Frise** des phases : cases de la couleur de la phase, côte à côte, largeur proportionnelle à leur nombre de semaines ; poignées de 8 px en Texte, curseur de redimensionnement.
- **Rubrique Préparation** : premier texte de la liste des textes d'une course (même cadre, même titre repliable) ; une semaine tient sur une ligne par jour, à toute largeur ; légende « Semaine en cours » en Space Mono 0,62 rem capitales, Texte discret ; « Toutes les semaines » : titre repliable en 0,8 rem, Texte discret.
- **Fenêtres** (séance, Préparer) : voile noir à 60 %, panneau Surface avec cadre, 30 rem (44 rem pour Préparer) ; champs à 16 px sur écran tactile.

