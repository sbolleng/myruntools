# Design

Version 0.32 · 31 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit l'apparence commune à toute l'application : couleurs, typographies, tailles et disposition de l'en-tête et du menu. Le contenu et les règles sont dans la [spécification générale](specification-generale.md).

## 1. Principes

- Une seule mise en page pour tous ; seules les couleurs changent d'un thème à l'autre.
- Fond sombre, ou blanc pour la lecture claire (thème Blanc et orange) ; chiffres en police à chasse fixe, libellés en petites capitales.
- Toute couleur passe par un rôle (§ 2) : aucune couleur écrite en dur dans un module.
- Les effets de survol ne s'appliquent qu'aux appareils avec une souris : sur écran tactile, un toucher les laisserait « collés » (un bouton resterait en couleur d'accent).

**Règles communes**, les mêmes sur toutes les pages, pour un site sobre et homogène :

| Règle | En pratique |
| --- | --- |
| Peu de couleur | Un seul accent. L'Accent marque le titre de l'écran (le cap dans l'en-tête, le nom de la course sur sa page), l'objectif principal, les repères de données (compte à rebours des courses, objectif, point du dossard, objectif intermédiaire, temps et place au général d'une course courue) et ce qui est actif (onglet ou engrenage de la page ouverte, tri, filtre actif, pastille choisie, bouton principal, champ en cours de saisie). |
| Le reste en blanc et gris | Valeurs et noms en Texte ; libellés et informations secondaires en Texte discret ; liens dans le texte soulignés, en Texte. |
| Capitales pour les libellés seulement | Libellés de données (à gauche ou au-dessus d'une valeur, d'un champ, en-tête de colonne), toujours en Space Mono 0,7 rem, en-tête compris ; seule la grille de la vue Année du Calendrier est plus fine (§ 10). Onglets, boutons, titres de section en casse normale. |
| Tout dans un cadre | Chaque bloc de la page a son cadre (fond Surface, bordure fine, coins de 8 px) : tableau du Palmarès, carte d'une étape, fiche d'une course, liste des textes d'une course, Préférences (un cadre pour toute la page), panneaux. Dans un cadre, les sections sont séparées par un filet (Bordure). Jamais de cadre dans un cadre. |
| Trois sortes de boutons | Principal : Accent plein, un par écran au plus (Enregistrer, Partager, Recevoir le lien, Ajouter une course) ; au survol, l'Accent s'éclaircit (mêlé de Texte). À contour : bordure fine, texte en Texte (Annuler, Retenir cette course, Paramétrer le plan, Aujourd'hui) ; en Alerte, avec une poubelle, pour Supprimer (la course, la séance), plein Alerte au survol. Rond : une icône (filtres, crayon, regroupement, flèches, fermer) ; « × » pour fermer, la même croix partout (feuilles, panneaux). Et le lien d'action : souligné, Texte discret (Se déconnecter, Rétablir l'ordre, Effacer les filtres, Recalculer selon les règles). Tous en casse normale, Accent au survol. |
| Pastilles | Un choix parmi d'autres (filtres, tri et colonnes du Palmarès, vue du Calendrier) : arrondies, contour Bordure, texte en Texte, 0,8 rem ; choisie : fond Accent, texte Fond. |
| Un seul champ | Fiche, fenêtres, filtres, Préférences (changement du mot de passe compris), connexion et nouveau mot de passe : fond Champ (§ 2), bordure fine (Bordure), coins de 6 px, 0,85 rem, exemple en Texte discret dans le champ vide, bordure en Accent pendant la saisie, en Alerte sur une erreur ; listes avec un chevron dessiné. Seul le tableau des phases de « Paramétrer le plan » le prend en plus petit. |
| Fenêtres comme la fiche | Une fenêtre de saisie (séance, Paramétrer le plan) se présente comme la fiche d'une course (§ 6) : le voile de la feuille, « Annuler » à gauche et le bouton principal à droite en haut, le titre en libellé, une action à part (Supprimer, Recalculer) seule en bas. |
| Un seul titre repliable | Chevron à gauche, titre en Texte, 600, casse normale : textes d'une course, blocs du formulaire, groupes du Palmarès. |

Les boutons, liens d'action, pastilles, champs et sections sont des éléments communs de la feuille de style partagée (`mrt-btn`, avec `is-principal` et `is-danger` ; `mrt-rond`, avec `is-fermer` ; `mrt-lien`, `mrt-pastille`, `mrt-champ`, `mrt-section`) : un module les reprend, il ne les redessine pas.

## 2. Thèmes

| Rôle | Bleu et orange | Vert et rose | Violet et turquoise | Blanc et orange | Noir et orange |
| --- | --- | --- | --- | --- | --- |
| Fond | `#060b14` | `#0E1D19` | `#14101F` | `#ffffff` | `#000000` |
| Surface | `#122a4a` | `#18332E` | `#221A35` | `#f3f5f8` | `#121212` |
| Surface 2 | `#163a66` | `#21453D` | `#2D2347` | `#e7ecf2` | `#1c1c1c` |
| Bordure | `#1f4c80` | `#2F5A4E` | `#40335F` | `#d2dae4` | `#333333` |
| Accent | `#ffb700` | `#D07B87` | `#2EC4B6` | `#c2410c` | `#ffb700` |
| Texte | `#eef3fa` | `#EDF2E9` | `#F1EEF7` | `#132030` | `#f2f2f2` |
| Texte discret | `#8fa8c9` | `#8FA391` | `#A49BB8` | `#5a6a7e` | `#9b9b9b` |
| Alerte | `#e05c5c` | `#A56269` | `#E0607E` | `#c62828` | `#f0605d` |
| Champ (fond des champs) | Fond à 60 %, Surface à 40 % | idem | idem | idem | idem |

Identifiants : `bleu-orange`, `vert-rose`, `violet-turquoise`, `blanc-orange`, `noir-orange`, et `auto` (« Automatique ») : Blanc et orange quand l'appareil est en mode clair, Noir et orange en mode sombre, et il suit ce réglage s'il change pendant la visite. Dans les maquettes seulement, `?t=bleu-orange`, `?t=vert-rose` ou `?t=violet-turquoise` choisit le thème.

**Lecture claire et sombre** : Blanc et orange et Noir et orange sont faits pour lire, sur fond blanc ou noir. Sur fond blanc, l'orange du site (`#ffb700`) serait illisible (contraste 1,8) : l'Accent y est un orange foncé, `#c2410c` (5,2 sur blanc, texte blanc sur le bouton principal compris). Les contrôles du navigateur (dates, listes, barres de défilement) prennent la version claire ou sombre du thème. Le thème choisi est retenu sur l'appareil et posé dès le chargement de chaque page : jamais d'éclair d'un autre fond.

Le Champ n'a pas de valeur propre : il mêle le Fond et la Surface du thème, pour qu'un champ soit plus sombre que le cadre qui l'entoure et plus clair que la page, dans tous les thèmes.

Pas de second accent : l'Accent 2, presque identique à l'Accent, a été retiré le 30 octobre 2026. Une nuance, quand il en faut une, mêle l'Accent à une autre couleur du thème (bouton principal au survol, filet de l'en-tête).

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
| Libellé (donnée, champ, colonne, sous-titre dans un bloc, en-tête compris) | 0,7 rem | Space Mono, capitales, espacement 0,1 em, Texte discret ; le mode d'une fiche et le titre d'une fenêtre à 0,75 rem |

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
| Libellé d'indicateur | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Nombre de jours | Space Mono, interligne 1 | 3,1 rem ; 1,6 rem sur téléphone | 700 | Accent |
| « jours » | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Heures, minutes, secondes | Space Mono, chiffres à largeur fixe | 0,72 rem | Normale | Texte discret |
| Prochaine course | Space Grotesk | 0,65 rem | Normale | Texte discret |

### Disposition

- **Marges** : 1,5 rem en haut, 2 rem sur les côtés, 1,25 rem en bas ; indicateurs à 1,2 rem sous le titre, filet à 1,6 rem ; 1,25 rem en haut et sur les côtés, 1,1 rem en bas sur téléphone. Contenu centré, 960 px de large au plus.
- **Nom de l'application et engrenage** : en haut à droite, leur haut aligné sur le haut de « Cap sur », à toutes les largeurs d'écran. L'engrenage est dessiné en trait fin (1,05 rem), comme les autres icônes : Texte discret, Texte au survol, Accent sur la page des Préférences ; sa zone de toucher déborde sans changer la mise en page.
- **Ordinateur** : deux colonnes, 2 rem entre elles. À gauche le titre, puis les indicateurs, espacés de 2 rem, 1,5 rem sous le titre, qui passent à la ligne faute de place ; à droite, en haut le nom de l'application, en bas le compte à rebours et la prochaine course, alignés à droite, leur bas au niveau du bas des indicateurs.
- **Téléphone** (600 px et moins) : une seule colonne, serrée, pour que la page commence dans le premier écran (environ 300 px d'en-tête). Le titre à 1,65 rem, sur toute la largeur, le nom de l'application et l'engrenage en haut à droite face à « Cap sur » ; juste sous le nom de la course, le compte à rebours sur une ligne (nombre de jours à 1,6 rem, « jours », les heures), dont il fait partie ; les indicateurs sur deux colonnes, 1 rem plus bas ; enfin la prochaine course, à part, sous un filet (Bordure), 0,75 rem, alignée à gauche.
- **« Cap sur »** ne se coupe jamais : il tient sur une ligne, le nom de la course dessous.
- **Filet** : barre de 5 px, 1,6 rem sous le contenu (1,1 rem sur téléphone), d'un bord à l'autre de l'écran ; dégradé en bandes qui alterne Accent, Accent atténué (mêlé de Surface 2) et Surface 2, comme un profil de course.
- Le filet ferme l'en-tête : il touche le menu, sans vide ni ligne fine entre les deux.

## 5. Page de connexion

Sobre, sans en-tête ni menu, centrée dans la page, 22 rem de large au plus.

| Élément | Police | Taille | Couleur |
| --- | --- | --- | --- |
| « MyRunTools » | Space Grotesk, graisse 700, espacement −0,02 em | 2 rem | Texte |
| Accroche | Space Grotesk | 0,85 rem | Texte discret |
| Libellés « Adresse e-mail », « Mot de passe » | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Texte discret |
| Champs e-mail et mot de passe (œil en Texte discret à droite du mot de passe, Accent quand le mot de passe est visible) | Le champ commun (§ 1) : Space Grotesk | 0,85 rem | Texte ; fond Champ, bordure fine (Bordure), Accent au focus |
| Bouton « Se connecter » | Bouton principal (§ 1) : Space Grotesk 600, casse normale | 0,8 rem | Accent plein, coins arrondis, toute la largeur |
| Lien « Mot de passe oublié ? » | Space Grotesk, lien (§ 1) | 0,78 rem | Texte discret, sous le champ mot de passe, aligné à gauche |
| Ligne d'aide et messages | Space Grotesk | 0,75 rem | Texte discret ; Alerte pour une erreur |

## 6. Formulaires et bandeau

Ils reprennent le style du site : rien de nouveau, des éléments déjà présents.

- **Feuille d'une course** (consultation et fiche de saisie) : surface (Surface), bordure fine (Bordure), coins arrondis de 8 px, comme les cartes, à la largeur des pages sur ordinateur ; sur téléphone, elle occupe tout l'écran, monte du bas et défile, sans jamais déborder sur les côtés.
- **Champs sur écran tactile** : texte à 16 px au moins (tous les formulaires du site), sinon Safari sur iPhone zoome sur le champ touché et la page déborde. Sur iPhone et iPad, le site ajoute en plus `maximum-scale=1` à la balise viewport : plus de zoom automatique, le zoom à deux doigts reste possible.
- **Barre du haut de la fiche** : « Annuler » (à contour) à gauche, « Enregistrer » (principal) à droite, toujours visibles quand la fiche défile ; dessous, le mode (« Modifier la course », « Ajouter une course », « Marquer comme courue ») en libellé : Space Mono, capitales, 0,75 rem, Texte discret. En consultation : crayon et « × », boutons ronds, à droite.
- **Case « Non terminée (DNF) »** : juste sous le champ Temps, en texte discret, pour montrer qu'elle s'y rapporte.
- **Nombres** : virgule décimale (« 24,4 »).
- **Blocs** : titre repliable (§ 1 et § 3) : chevron à gauche, Space Grotesk 600, 0,85 rem, Texte, casse normale ; Accent au survol.
- **Champs** : le champ commun (§ 1), libellé au-dessus en petites capitales, exemple en Texte discret dans le champ vide ; deux colonnes sur ordinateur, une sur téléphone ; la date seule sur sa ligne.
- **Boutons** (§ 1) : « Enregistrer » bouton principal (Accent plein), le seul de la fiche ; « Annuler » et « Paramétrer le plan » à contour ; « Supprimer la course » bouton à contour en Alerte, avec une poubelle, seul en bas de la fiche (plein Alerte au survol).
- **Fenêtres** (séance, Paramétrer le plan) : présentées comme la fiche (§ 1), au-dessus d'elle ou de la page.
- **Retour du navigateur ou du téléphone** : comme « Annuler », pour toute fiche, ouverte dans la feuille d'une course ou seule (« Ajouter une course », crayon du Palmarès).
- **Message d'erreur** : 0,75 rem, couleur Alerte, sous le champ concerné.
- **Bandeau de lecture seule** : sous le menu, sur toute la largeur, fond Surface 2, texte 0,75 rem ; « Revenir à mon site » en lien souligné.

## 7. Barre et lignes du Palmarès

- **Barre** : boutons ronds espacés de 0,5 rem, le compteur à 0,85 rem. « Filtres », bouton rond (§ 1) à trois traits de plus en plus courts, en Accent quand un filtre est actif ou le panneau ouvert, le nombre de filtres actifs en petite pastille Accent en haut à droite ; puis le bouton rond « Grouper par type » (icône de couches), en Accent quand le regroupement est actif ; puis le bouton rond « Colonnes » (icône de colonnes), en Accent quand sa liste est ouverte ; tout à droite, « + Ajouter une course » (« + Course » sur téléphone), bouton principal.
- **Tableau** : dans son cadre (§ 1). Groupes : titre repliable (§ 1), filet en Bordure dessous.
- **Téléphone tenu en hauteur** : sous la barre, « ↻ Tourne ton téléphone pour voir toutes les colonnes. », 0,8 rem, Texte discret. **Tenu en largeur** : une ligne par course (pas de retour à la ligne dans les cellules), cadre resserré.
- **Compteur** « X courses sur Y » à droite des boutons, 0,8 rem, Texte discret, **seulement quand un filtre est actif** ; sur téléphone, il passe sous les boutons.
- **Fermer un panneau** (filtres, colonnes) : rond « × » (§ 1) en haut à droite du panneau, la même croix que celle des feuilles de course.
- **Pastilles** (panneau des filtres, tri, colonnes) : les pastilles communes (§ 1). Champs des filtres : le champ commun. Libellés de rubrique comme les légendes (Space Mono, capitales, Texte discret).
- **Intertitres du regroupement par type** : Space Grotesk 700, 0,95 rem, en Accent (orange dans le thème par défaut), chevron compris, pour repérer d'un coup d'œil Trail, Course sur route…
- **Largeur** : toutes les pages ont la même largeur de contenu sur ordinateur (960 px, marges de 2 rem), page d'une course (modale) comprise ; seule la connexion garde sa colonne étroite.
- **Crayon** : trait fin, Texte discret comme les flèches de tri, visible seulement au survol de la ligne (Accent sous le pointeur) ; la ligne survolée s'éclaire légèrement (Surface 2). Sur écran tactile, sans survol : le crayon reste visible au bout de la ligne ; toucher la ligne ouvre la consultation.

## 8. Menu

- Seuls les modules construits ont un onglet ; un module « bientôt » reste dans les Préférences.
- Onglets en Space Grotesk, casse normale, 0,8 rem, graisse 500 ; marges de 0,85 rem en haut et en bas, 1,1 rem sur les côtés (0,9 rem sur téléphone : les quatre modules construits tiennent dans un écran de 375 px).
- Onglet En un coup d'œil : « En un coup d' » suivi d'un picto d'œil (contour et pupille, couleur de l'onglet, 1,15 em de large) ; le nom complet en infobulle et pour les lecteurs d'écran.
- Onglet ordinaire en Texte discret, Texte au survol ; onglet de la page ouverte en Accent, souligné de 2 px en Accent.
- **Barre fine**, au-dessus du menu, sur les pages sans en-tête : « Cap sur » en Texte discret et le nom du cap en Accent, 600, comme le grand titre dont il prend le relais (0,8 rem, coupé par « … » s'il est trop long ; il mène à l'Accueil) à gauche ; l'engrenage à droite (§ 4 : dessiné, en Accent sur les Préférences). Marges de 0,55 rem en haut et en bas, filet (Bordure) dessous.
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
| Encre | `#0b1220` | Texte écrit sur la couleur pleine d'une course, lisible sur fond blanc comme sur fond sombre |

- **Course validée** : case pleine de la couleur de la famille, nom en Encre.
- **Course non validée** : couleur de la famille à 30 % sur Surface, cadre de 1 px de la couleur pleine, nom en Texte.
- **Course courue** : case en Texte discret, nom en Fond.
- **Trait de prépa** : vertical, 3 px de large, à gauche des cases, de la couleur pleine de la famille (à 60 % pour une course non validée) ; il franchit l'écart d'un pixel entre deux jours ; un couloir de 5 px par prépa qui en chevauche une autre ; le nom de la course est décalé d'autant.
- **Cadre** : toute la page dans un cadre (Surface), comme les autres pages ; page sans en-tête (barre fine « Cap sur … »).
- **Jours** : une ligne de 0,8 rem (0,72 rem sur téléphone), 1 px entre deux jours et 3 px entre deux mois ; un seul ton, Bordure, nettement plus clair que le cadre (Surface) ; jour passé sans fond ; aucune nuance pour le week-end ; aujourd'hui cerclé de 1 px de Texte. Course non validée : sa couleur à 35 % sur Bordure. Dans la vue 4 semaines, mêmes règles : jours d'un seul ton, jour passé sans fond, cerclé d'un filet.
- **Texte** : nom du mois en Space Mono 0,62 rem, Texte discret ; numéro du jour en Space Mono 0,5 rem, Texte discret ; nom de la course en Space Grotesk 0,58 rem (0,52 rem sur téléphone).

**Vue 4 semaines et rubrique Préparation (page d'une course)**

- **Phases** : Base `#5fb49c`, Développement `#e6b84d`, Affûtage `#b48ef0`, Deload `#8fa8c9`, dans les thèmes sombres ; sur fond blanc (Blanc et orange), plus foncées pour rester lisibles en texte : Base `#2f7d69`, Développement `#946200`, Affûtage `#7a4fc4`, Deload `#52698a`. Une semaine : trait vertical de 4 px à gauche dans la couleur de sa phase (pointillé en Bordure pour « Sans objectif clair »), nom de la phase en 0,85 rem, 600, dans cette couleur.
- **Semaine** : titre en Space Mono 0,7 rem capitales, Texte discret ; sept jours côte à côte (un par ligne sur téléphone), cases entre Fond et Surface, week-end plus clair, jour passé à 55 %, aujourd'hui cerclé de 1 px de Texte.
- **Séance** : case à cocher en Accent, type en Space Mono 0,7 rem capitales Texte discret (nom du jour de même), libellé en 0,72 rem ; barrée et en Texte discret quand elle est faite. Bouton « + » rond en bas à droite de la case du jour. Course du jour : pastille aux quatre couleurs du § 10 ; rendez-vous clé : « ◆ » et texte en 0,68 rem.
- **Frise** des phases : cases de la couleur de la phase, côte à côte, largeur proportionnelle à leur nombre de semaines ; poignées de 8 px en Texte, curseur de redimensionnement.
- **Rubrique Préparation** : premier texte de la liste des textes d'une course (même cadre, même titre repliable) ; une semaine tient sur une ligne par jour, à toute largeur ; légende « Semaine en cours » en Space Mono 0,7 rem capitales, Texte discret ; « Toutes les semaines » : titre repliable en 0,8 rem, Texte discret, chevron du site à gauche.
- **Bouton « Paramétrer le plan »** : bouton à contour, icône de curseurs de 0,9 rem (un seul bouton principal par écran).
- **Fenêtres** (séance, Paramétrer le plan) : comme la fiche (§ 1 et 6) : voile de la feuille d'une course (Fond à 75 %), panneau Surface avec cadre, 30 rem (44 rem pour Paramétrer le plan) ; barre du haut fixe, « Annuler » à gauche, « Enregistrer » ou « Valider » à droite ; titre en libellé (Space Mono 0,75 rem, capitales, Texte discret) ; libellés de champ à 0,7 rem, champs communs (à 16 px sur écran tactile) ; « Supprimer la séance » (à contour Alerte, poubelle) ou « Recalculer selon les règles » (lien) seul en bas.
- **Choix de la vue** : deux pastilles (§ 1), « Année » et « 4 semaines », en haut à gauche du cadre ; vue 4 semaines : ‹, « Aujourd'hui » (à contour), ›.


## 11. Panneau des boutons

Les boutons du site, à reprendre tels quels (feuille de style partagée, `composants/en-tete.css`) : un module n'en dessine pas d'autre. Tous en Space Grotesk, casse normale ; Accent au survol (souris seulement) ; contour Accent de 2 px au focus clavier ; estompés quand ils sont inactifs.

| Bouton | Classe | Apparence | Exemples sur le site |
| --- | --- | --- | --- |
| Principal | `mrt-btn is-principal` | Accent plein, texte Fond, 0,8 rem, 600, coins arrondis (20 px) ; au survol, l'Accent mêlé de Texte. Un par écran au plus | Enregistrer, Valider, Se connecter, Partager, + Ajouter une course |
| À contour | `mrt-btn` | Bordure fine (Bordure), texte en Texte, même taille que le principal ; icône facultative à gauche | Annuler, Retenir cette course, Marquer comme courue, Paramétrer le plan, Aujourd'hui, Changer le mot de passe |
| Actif | `mrt-btn is-actif` | À contour, texte et bordure en Accent | Bouton à contour dont l'état est en cours |
| Danger | `mrt-btn is-danger` | À contour en Alerte, avec une poubelle ; plein Alerte au survol | Supprimer la course, Supprimer la séance, Supprimer (confirmation) |
| Rond | `mrt-rond` | Cercle de 2 rem, bordure fine, icône en Texte discret ; en Accent quand il est actif ou enfoncé | Filtres, Grouper par type, Colonnes, crayon, ‹ et ›, ↑ et ↓ |
| Fermer | `mrt-rond is-fermer` | Rond avec « × » de 1,2 rem, la même croix partout | Fermer une feuille, un panneau |
| Lien d'action | `mrt-lien` | Souligné, Texte discret, 0,8 rem, sans cadre ; `is-danger` en Alerte | Se déconnecter, Mot de passe oublié ?, Retour à la connexion, Rétablir l'ordre par défaut, Effacer les filtres, Recalculer selon les règles, Retirer |
| Pastille | `mrt-pastille` | Arrondie, contour Bordure, texte en Texte, 0,8 rem ; choisie : fond Accent, texte Fond | Vue Année / 4 semaines, filtres, tri et colonnes du Palmarès |
