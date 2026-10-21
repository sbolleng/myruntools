-- Évolution 003 · 21 octobre 2026 · conseil de sécurité de Supabase
-- La fonction de date de modification ne dépend plus du chemin de recherche.
alter function public.marquer_modification() set search_path = '';
