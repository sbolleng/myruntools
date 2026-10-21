# Design

Version 0.1 · 20 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit l'apparence commune à toute l'application : couleurs, typographies, tailles et disposition de l'en-tête et du menu. Le contenu et les règles sont dans la [spécification générale](specification-generale.md).

## 1. Principes

- Une seule mise en page pour tous ; seules les couleurs changent d'un thème à l'autre.
- Fond sombre, chiffres en police à chasse fixe, libellés en petites capitales.
- Toute couleur passe par un rôle (§ 2) : aucune couleur écrite en dur dans un module.

## 2. Thèmes

| Rôle | Bleu et orange | Vert et rose | Violet et turquoise (essais) |
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

Identifiants : `bleu-orange`, `vert-rose`, `violet-turquoise`. Dans les maquettes et la page de démonstration, `?t=bleu-orange`, `?t=vert-rose` ou `?t=violet-turquoise` choisit le thème.

## 3. Typographies

| Usage | Police |
| --- | --- |
| Textes, titres, onglets | Space Grotesk |
| Chiffres, libellés, compte à rebours | Space Mono |

Taille de base du texte : 19 px sur ordinateur, 17 px sur téléphone.

## 4. En-tête

### Tailles

| Élément | Police | Taille | Graisse | Couleur |
| --- | --- | --- | --- | --- |
| Nom de l'application | Space Mono, capitales, espacement 0,15 em | 0,7 rem | Normale | Texte discret |
| Engrenage ⚙️ | — | 0,9 rem | — | — |
| Titre, ligne « Cap sur » | Space Grotesk, interligne 1,05, espacement −0,02 em | 2 à 3,5 rem selon la largeur d'écran | 700 | Texte |
| Titre, nom de la course | Idem | Idem | 700 | Accent |
| Valeur d'indicateur | Space Mono | 1,1 rem | 700 | Accent 2 |
| Libellé d'indicateur | Space Grotesk, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Nombre de jours | Space Mono, interligne 1 | 3,5 rem | 700 | Accent |
| « jours » | Space Grotesk, capitales, espacement 0,12 em | 0,7 rem | Normale | Texte discret |
| Heures, minutes, secondes | Space Mono, chiffres à largeur fixe | 0,72 rem | Normale | Accent 2 |
| Prochaine course | Space Grotesk | 0,65 rem | Normale | Texte discret |

### Disposition

- **Marges** : 1,5 rem en haut, 2 rem sur les côtés et en bas ; 1 rem en haut, 1,25 rem sur les côtés et 1,5 rem en bas sur téléphone. Contenu centré, 960 px de large au plus.
- **Colonne de droite, toujours à la même place** : le nom de l'application et l'engrenage, leur haut aligné sur le haut de « Cap sur », puis le compte à rebours dessous, le tout aligné à droite, à toutes les largeurs d'écran.
- **Ordinateur** : deux colonnes. À gauche le titre, puis les indicateurs sur une ligne, espacés de 2 rem, 1,5 rem sous le titre ; à droite le nom de l'application et le compte à rebours.
- **Téléphone** (600 px et moins) : mêmes deux colonnes, colonne de droite comprise ; les indicateurs passent en grille de deux colonnes, sous le titre et le compte à rebours.
- **Filet** : barre de 5 px, 2 rem sous le contenu, toute la largeur ; dégradé en bandes qui alterne Accent, Accent 2 et Surface 2, comme un profil de course.
- Une ligne fine (Bordure) sépare l'en-tête du menu.

## 5. Menu

- Onglets en Space Grotesk, capitales, 0,75 rem, graisse 500, espacement 0,1 em ; marges de 0,9 rem en haut et en bas, 1,4 rem sur les côtés.
- Onglet ordinaire en Texte discret, Texte au survol ; onglet de la page ouverte en Accent, souligné de 2 px en Accent.
- Barre sur le Fond, ligne fine (Bordure) dessous ; elle reste collée en haut de l'écran au défilement ; défilement horizontal sans barre visible sur téléphone.
