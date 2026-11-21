-- Évolution 041 · 20 novembre 2026 · Analyse d'une séance faite par l'IA
-- (la colonne se nomme analyse_ia : « analyse » est un mot réservé de PostgreSQL)
-- Le texte (1 000 caractères au plus) rendu après le retour de l'utilisateur sur sa séance ; relu à l'ouverture de la séance.
alter table seances
  add column if not exists analyse_ia text check (char_length(analyse_ia) <= 1500);
