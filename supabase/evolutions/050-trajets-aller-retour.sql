-- Évolution 050 · 27 novembre 2026 · Trajets : prix d'un aller-retour (docs/module-logistique-specification.md, § 3.4)
-- Un aller-retour s'enregistre en deux lignes (aller, retour) ; le prix, saisi une seule fois, est rangé sur l'aller,
-- et cette colonne dit qu'il couvre aussi le retour. À coller dans l'éditeur SQL de Supabase ; peut être recollée sans risque.
alter table trajets add column if not exists prix_aller_retour boolean not null default false;
