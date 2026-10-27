# Design

Version 1.0 · 22 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit l'apparence commune à toute l'application : couleurs, typographies, tailles et disposition de l'en-tête et du menu. Le contenu et les règles sont dans la [spécification générale](specification-generale.md).

## 1. Principes

- Une seule mise en page pour tous ; seules les couleurs changent d'un thème à l'autre.
- Fond sombre, chiffres en police à chasse fixe, libellés en petites capitales.
- Toute couleur passe par un rôle (§ 2) : aucune couleur écrite en dur dans un module.
- Les effets de survol ne s'appliquent qu'aux appareils avec une souris : sur écran tactile, un toucher les laisserait « collés » (un bouton resterait en couleur d'accent).

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
| Textes, titres, onglets | Space Grotesk |
| Chiffres, libellés, compte à rebours | Space Mono |

Taille de base du texte : 19 px sur ordinateur, 17 px sur téléphone.

**Tailles dans les pages** (sous l'en-tête et le menu) : fixées une fois pour toutes, à reprendre telles quelles dans chaque nouvelle page ou module.

| Élément | Taille | Style |
| --- | --- | --- |
| Texte courant, tableaux, champs, listes | 0,85 rem | Space Grotesk, normal ; jamais en gras, sauf un nom mis en avant (600) |
| Texte secondaire (aide, explication) | 0,8 rem | Texte discret |
| Messages (« Enregistré », erreurs) | 0,75 rem | Texte discret, ou Alerte |
| Titre d'un bloc ou d'une carte | 0,7 rem | Space Mono, capitales, Accent |
| Libellé de champ, sous-titre dans un bloc | 0,62 rem | Space Mono, capitales, Texte discret |
| Boutons | 0,72 rem | Space Grotesk 600, capitales |

Le contenu des pages (`main`) est à 0,85 rem par défaut, dans la feuille de style commune : un texte sans taille précisée n'est jamais à la taille de base.

## 4. En-tête

### Tailles

| Élément | Police | Taille | Graisse | Couleur |
| --- | --- | --- | --- | --- |
| Nom de l'application | Space Mono, capitales, espacement 0,15 em | 0,7 rem | Normale | Texte discret |
| Engrenage ⚙️ | — | 0,9 rem | — | — |
| Titre, ligne « Cap sur » | Space Grotesk, interligne 1,05, espacement −0,02 em | 2 à 3,5 rem selon la largeur d'écran | 700 | Texte |
| Titre, nom de la course | Idem | Idem | 700 | Accent |
| Valeur d'indicateur (15 rem de large au plus, va à la ligne au-delà) | Space Mono | 1,1 rem | 700 | Accent 2 |
| Dénivelé dans Distance (« / 3 500 m D+ ») | Space Mono | 0,8 rem | Normale | Texte discret |
| Libellé d'indicateur | Space Grotesk, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Nombre de jours | Space Mono, interligne 1 | 3,5 rem | 700 | Accent |
| « jours » | Space Grotesk, capitales, espacement 0,12 em | 0,7 rem | Normale | Texte discret |
| Heures, minutes, secondes | Space Mono, chiffres à largeur fixe | 0,72 rem | Normale | Accent 2 |
| Prochaine course | Space Grotesk | 0,65 rem | Normale | Texte discret |

### Disposition

- **Marges** : 3 rem en haut, 2 rem sur les côtés et en bas ; 2 rem en haut, 1,25 rem sur les côtés et 1,5 rem en bas sur téléphone. Contenu centré, 960 px de large au plus.
- **Nom de l'application et engrenage** : en haut à droite, leur haut aligné sur le haut de « Cap sur », à toutes les largeurs d'écran.
- **Ordinateur** : deux colonnes, 2 rem entre elles. À gauche le titre, puis les indicateurs, espacés de 2 rem, 1,5 rem sous le titre, qui passent à la ligne faute de place ; à droite, en haut le nom de l'application, en bas le compte à rebours et la prochaine course, alignés à droite, leur bas au niveau du bas des indicateurs.
- **Téléphone** (600 px et moins) : une seule colonne. Le titre, avec le nom de l'application à sa droite ; les indicateurs dessous, espacés de 2 rem et qui passent à la ligne faute de place ; puis, 2 rem plus bas, le compte à rebours et la prochaine course, alignés à gauche, le nombre de jours à la même taille que sur ordinateur.
- **« Cap sur »** ne se coupe jamais : il tient sur une ligne, le nom de la course dessous.
- **Filet** : barre de 5 px, 2 rem sous le contenu, toute la largeur ; dégradé en bandes qui alterne Accent, Accent 2 et Surface 2, comme un profil de course.
- Une ligne fine (Bordure) sépare l'en-tête du menu.

## 5. Page de connexion

Sobre, sans en-tête ni menu, centrée dans la page, 22 rem de large au plus.

| Élément | Police | Taille | Couleur |
| --- | --- | --- | --- |
| « MyRunTools » | Space Grotesk, graisse 700, espacement −0,02 em | 2 rem | Texte |
| Accroche | Space Grotesk | 0,85 rem | Texte discret |
| Libellé « Adresse e-mail » | Space Mono, capitales, espacement 0,15 em | 0,62 rem | Texte discret |
| Champ e-mail | Space Grotesk | 0,85 rem | Texte ; fond transparent, bordure fine (Bordure), Accent au focus |
| Bouton | Space Grotesk, capitales, graisse 600, espacement 0,08 em | 0,72 rem | Contour et texte Accent, coins arrondis ; rempli d'Accent au survol |
| Ligne d'aide et messages | Space Grotesk | 0,75 rem | Texte discret ; Alerte pour une erreur |

## 6. Formulaires et bandeau

Ils reprennent le style du site : rien de nouveau, des éléments déjà présents.

- **Panneau de formulaire** : surface (Surface), bordure fine (Bordure), coins arrondis de 8 px, comme les cartes ; sur téléphone, il occupe tout l'écran et défile, sans jamais déborder sur les côtés.
- **Fermer** : bouton rond « × » en haut à droite, dans la nuance des flèches de tri, Accent au survol ; le titre et ce bouton restent visibles quand le formulaire défile. « Annuler », en bas, ferme aussi.
- **Case « Non terminée (DNF) »** : juste sous le champ Temps, en texte discret, pour montrer qu'elle s'y rapporte.
- **Nombres** : virgule décimale (« 24,4 »).
- **Blocs** : titre en Space Mono, capitales, 0,62 rem, Texte discret, comme les libellés de l'en-tête ; un chevron replie ou déplie le bloc, comme les groupes du Palmarès.
- **Champs** : ceux de la page de connexion (fond transparent, bordure fine, Accent au focus, 0,85 rem), libellé au-dessus en petites capitales, exemple en Texte discret dans le champ vide ; deux colonnes sur ordinateur, une sur téléphone ; la date seule sur sa ligne.
- **Boutons** : contour arrondi, en capitales ; « Enregistrer » en Accent plein, comme « Filtres » ; « Supprimer » en texte Alerte, souligné, à l'écart des autres.
- **Message d'erreur** : 0,75 rem, couleur Alerte, sous le champ concerné.
- **Bandeau de lecture seule** : sous le menu, sur toute la largeur, fond Surface 2, texte 0,75 rem ; « Revenir à mon site » en lien Accent.

## 7. Barre et lignes du Palmarès

- **Barre** : « Filtres » (Accent plein), puis un bouton rond de 2 rem « Grouper par type » (icône de couches) ; tout à droite, un bouton rond « + » pour ajouter une course. Boutons ronds en Texte discret avec une bordure fine (Bordure), comme les flèches de tri ; Accent au survol. Regroupement : fond Surface 2 (le bleu du thème bleu et orange) quand il est inactif, Accent quand il est actif.
- **Compteur** « X courses sur Y » à droite du regroupement ; sur téléphone, il passe sous les boutons.
- **Bouton des colonnes** (« + » en bout d'en-tête) : la taille et la couleur des flèches de tri, Accent quand la liste est ouverte.
- **Crayon** : trait fin, Texte discret comme les flèches de tri, visible seulement au survol de la ligne (Accent sous le pointeur) ; la ligne survolée s'éclaire légèrement (Surface 2). Sur écran tactile : pas de crayon, la ligne entière s'ouvre au toucher.

## 8. Menu

- Onglets en Space Grotesk, capitales, 0,75 rem, graisse 500, espacement 0,1 em ; marges de 0,9 rem en haut et en bas, 1,4 rem sur les côtés.
- Onglet ordinaire en Texte discret, Texte au survol ; onglet de la page ouverte en Accent, souligné de 2 px en Accent.
- Barre sur le Fond, ligne fine (Bordure) dessous ; elle reste collée en haut de l'écran au défilement ; défilement horizontal sans barre visible sur téléphone.

## 9. Calendrier (vue Année)

Les couleurs des courses ne changent pas d'un thème à l'autre : la même famille doit se reconnaître partout.

| Rôle | Valeur | Emploi |
| --- | --- | --- |
| Route | `#4db8ff` | Course sur route (tout ce qui n'est pas trail) |
| Trail | `#ff7a45` | Course de trail |

- **Course validée** : case pleine de la couleur de la famille, nom en Fond.
- **Course non validée** : couleur de la famille à 30 % sur Surface, cadre de 1 px de la couleur pleine, nom en Texte.
- **Course courue** : case en Texte discret, nom en Fond.
- **Trait de début de prépa** : 4 px de haut, 45 % de la largeur de la case, de la couleur pleine de la famille, cerclé de 1 px de Fond pour rester visible sur une case de course.
- **Jours** : une ligne de 0,8 rem (0,72 rem sur téléphone), 1 px entre deux jours et 3 px entre deux mois ; fond Surface, week-end entre Surface et Surface 2 ; jours passés à 45 % d'opacité ; aujourd'hui cerclé de 1 px de Texte.
- **Texte** : nom du mois en Space Mono 0,62 rem, Accent ; numéro du jour en Space Mono 0,5 rem, Texte discret ; nom de la course en Space Grotesk 0,58 rem (0,52 rem sur téléphone).

