-- Évolution 036 · 13 novembre 2026 · Sensations d'une séance (Mon plan, retour sur une séance)
-- Indépendantes de l'effort perçu : 1 (très bien) à 5 (très mal) ; la fatigue du jour reste à part.
alter table seances add column sensations smallint check (sensations between 1 and 5);
