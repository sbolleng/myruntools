-- Évolution 050 · 27 novembre 2026 · Deux types de séance de plus : Vélo et Danse (docs/module-preparation-specification.md)
-- À coller dans l'éditeur SQL de Supabase ; peut être recollée sans risque.

alter type seance_type add value if not exists 'velo';
alter type seance_type add value if not exists 'danse';
