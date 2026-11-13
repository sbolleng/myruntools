# Guide · spécification fonctionnelle

Version 0.1 · 12 novembre 2026 · [Retour au sommaire](README.md)

## 1. Rôle

Un article de lecture qui explique comment MyRunTools construit un plan de préparation et calcule la nutrition : règles, valeurs, exemples chiffrés, sources et limites.

- Page `guide.html` (module « Guide » du catalogue, `composants/donnees.js`, avec `adresse` et sans `page`) : **hors du menu**, accessible seulement par son adresse ; connexion requise ; `noindex`.
- Ton impersonnel (ni « tu », ni « vous »), style article ; vocabulaire du glossaire ([design](design.md), § 12).
- **Rien d'inventé** : chaque règle, valeur ou source vient des spécifications [Préparation](module-preparation-specification.md) (§ 2 à 4, 3.5, 6), [Nutrition](module-nutrition-specification.md) (§ 2 et 3), [Mon profil](module-profil-specification.md) et [Calendrier](module-calendrier-specification.md) (§ 5.1, 5.4), ou du code (`preparation.js`, `besoin.js`). Une règle qui change là change ici.
- Design commun seulement : cadres, `mrt-section`, `details.mrt-deroule`, liens, tableaux, échelle, couleurs des phases (`preparation.css`) ; `composants/guide.css` ne fait que la mise en page.

## 2. Plan de page

```
(1) Guide                                           (h1 invisible)
(2) ┌ Du plan à l'assiette ─────────────────────────────────┐
    │ (3) chapeau                                           │
    │ (4) 1. Préparer une saison · 2. Bien manger… · 3. Nos sources… │
    └───────────────────────────────────────────────────────┘
(5) ┌ PARTIE 1 · Préparer une saison ───────────────────────┐
    │ (6) Une saison plutôt qu'une course (trois couches ;   │
    │     (7) frise d'une saison : Entretien, 16 sem., Récupération ; │
    │     (8) ▸ Durée de la préparation, format par format)  │
    │ Trois rôles · Les phases (frise de 16 semaines numérotées) │
    │ L'affûtage ((9) jauges 100 % / 40 à 59 %)              │
    │ La récupération ((10) exemples, un carré par jour)     │
    │ Quelle course avant l'Objectif ? (avis ; ▸ Préparatoire conseillée) │
    │ Les alertes · Ce que fait l'IA                          │
    └───────────────────────────────────────────────────────┘
(11) ┌ PARTIE 2 · Bien manger pour courir ──────────────────┐
     │ Le besoin du jour (exemple : 2 117 kcal)             │
     │ Ce que coûte une séance (exemple ACSM : 737 kcal ;   │
     │   (12) barre empilée 1 628 · 489 · 737)              │
     │ Protéines, glucides, lipides ((13) jauges par phase ; exemple) │
     │ Mention : des repères, pas un avis médical           │
     └──────────────────────────────────────────────────────┘
(14) ┌ PARTIE 3 · Nos sources et leurs limites ─────────────┐
     │ Études et usages d'entraîneurs ; liens ; ▸ Durées de préparation │
     └──────────────────────────────────────────────────────┘
```

| N° | Élément | Style |
|---|---|---|
| 1 | Titre de page « Guide » | `h1.mrt-sr` |
| 2 | Titre de l'article | Titre de page (`--t-titre`, 700, Accent) |
| 3 | Chapeau | `--t-texte`, Texte discret |
| 4 | Sommaire | Liens d'action (`mrt-lien`) vers les ancres `#saison`, `#nutrition`, `#sources` |
| 5, 11, 14 | Parties | Un cadre (`card`) chacune ; « PARTIE n » en libellé, titre en 1 rem, 600 ; sections `mrt-section` (filet), intertitres 0,85 rem, 600 |
| 6 | Texte | 0,85 rem, interligne 1,6, 42 rem de large au plus ; tableaux du site |
| 7 | Frise | Une case par semaine, couleur de sa phase, Entretien en couleur des jours ; case de l'Objectif cerclée ; légende du Calendrier |
| 8 | Déroulés | `details.mrt-deroule`, chevron commun, fermés au départ (trois) |
| 9, 13 | Jauges | Barre arrondie : le minimum en Accent, la marge jusqu'au maximum en Accent léger |
| 10 | Exemple chiffré | Filet Accent à gauche, libellé, calcul en Space Mono 0,8 rem, résultat en Accent |
| 12 | Besoin empilé | Trois parts côte à côte, valeurs écrites dedans, légende |

Téléphone : même ordre ; frises et jauges en largeur de l'écran, tableaux qui défilent dans leur zone si besoin.

## 3. Questions ouvertes

- [ ] Liens des sources de nutrition (Black et al., équation de course de l'ACSM) : **à fournir par l'utilisateur** (rappel dans la todo du sommaire) ; cités par leur nom en attendant.
- [x] Place du Guide dans les Préférences : plus annoncé « bientôt » (13 nov. 2026).

## 4. Contrôles

Banc d'essai, groupe `guide` (et `uniformite`, `vocabulaire`, `affichage`) :

- À 1 200 et 375 px : page affichée, sans erreur ; titre « Guide · MyRunTools » ; `noindex` ; un seul h1, « Guide », invisible ; titre visible « Du plan à l'assiette » ; trois parties dans l'ordre ; frises de 27 et 16 semaines ; 6 et 41 jours de récupération ; trois déroulés fermés ; ni « tu » ni « vous » ; liens des sources dans un nouvel onglet ; aucun débordement, déroulé ouvert compris (375 px).
- Menu présent, aucun onglet Guide ni onglet actif, même avec « Guide » dans le menu enregistré.
- Sans session : renvoi vers la connexion.
- Tailles de l'échelle seulement (titre de l'article hors échelle permis) ; aucun ancien mot du glossaire ; page affichée sans saut.
