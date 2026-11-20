-- Évolution 042 · 20 novembre 2026 · Réalisé d'une séance faite
-- Le prévu (duree_min, distance_km, denivele_m) reste celui du plan ; une séance faite peut porter son réalisé :
-- durée, distance, dénivelé, fréquence cardiaque moyenne et maximale. Sans réalisé, le prévu compte.
alter table seances
  add column if not exists duree_reelle_min    integer  check (duree_reelle_min between 1 and 1440),
  add column if not exists distance_reelle_km  numeric(5,1) check (distance_reelle_km > 0 and distance_reelle_km < 1000),
  add column if not exists denivele_reel_m     integer  check (denivele_reel_m >= 1 and denivele_reel_m < 10000),
  add column if not exists fc_moyenne          smallint check (fc_moyenne between 30 and 250),
  add column if not exists fc_max              smallint check (fc_max between 30 and 250);
