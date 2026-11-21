-- Évolution 044 · 21 novembre 2026 · Mon profil simplifié
-- Mon profil, simplifié : plus d'antécédents de blessures en quatre choix (les points fragiles, en texte libre, les disent)
-- ni de durée maximale d'une séance. À coller dans l'éditeur SQL de Supabase.
alter table profil_entrainement
  drop column if exists antecedents,
  drop column if exists seance_max_min;
