-- Évolution 044 · 21 novembre 2026 · Ravitaillements d'une course
-- Les kilomètres des ravitaillements (Objectif, § 3.10, F57), dans l'ordre : affichés dans Parcours et envoyés à l'IA
-- qui propose la stratégie de course. Vide : inconnus.
alter table courses
  add column if not exists ravitaillements_km numeric[]
    check (ravitaillements_km is null or cardinality(ravitaillements_km) <= 50);
