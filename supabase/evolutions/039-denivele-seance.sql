-- Évolution 039 · 19 novembre 2026 · Dénivelé d'une séance
-- Une séance de course peut porter son dénivelé positif (en mètres), à côté de la durée et de la distance.
alter table seances
  add column if not exists denivele_m integer check (denivele_m >= 1 and denivele_m < 10000);
