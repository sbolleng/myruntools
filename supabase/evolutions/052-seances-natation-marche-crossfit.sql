-- Évolution 052 · 27 novembre 2026 · Trois types de séance de plus : Natation, Marche et Crossfit (les « autres sports » de Nutrition deviennent des séances)
-- À coller dans l'éditeur SQL de Supabase, SEULE (les nouvelles valeurs ne servent qu'une fois cette requête terminée), puis coller la 053.
-- Peut être recollée sans risque.

alter type seance_type add value if not exists 'natation';
alter type seance_type add value if not exists 'marche';
alter type seance_type add value if not exists 'crossfit';
