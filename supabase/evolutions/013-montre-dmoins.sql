-- Évolution 013 · 28 octobre 2026 · D− mesuré par la montre
-- Palmarès, bloc Montre : D+ et D− côte à côte (le D− de la montre n'était pas rangé).
alter table courses add column if not exists montre_dmoins int check (montre_dmoins >= 0);
