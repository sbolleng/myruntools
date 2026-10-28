-- Évolution 012 · 28 octobre 2026 · Catégorie d'âge d'une course courue
-- Catégorie de la Fédération française d'athlétisme (CA, JU, ES, SE, M0 à M10), saisie dans le Palmarès
-- à côté de la place en catégorie.
alter table courses add column if not exists categorie text
  check (categorie in ('CA', 'JU', 'ES', 'SE', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10'));
