-- Évolution 040 · 20 novembre 2026 · Analyse d'une séance faite par l'IA
-- Le texte (1 000 caractères au plus) rendu après le retour de l'utilisateur sur sa séance ; relu à l'ouverture de la séance.
alter table seances
  add column if not exists analyse text check (char_length(analyse) <= 1500);
