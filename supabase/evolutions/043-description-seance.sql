-- Évolution 043 · 20 novembre 2026 · Description d'une séance
-- Un texte libre (800 caractères au plus) qui décrit le déroulé de la séance, une étape par ligne (surtout pour un fractionné).
alter table seances
  add column if not exists description text check (char_length(description) <= 800);
