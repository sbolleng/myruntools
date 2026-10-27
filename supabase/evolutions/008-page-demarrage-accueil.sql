-- Évolution 008 · 27 octobre 2026 · Page de démarrage et blocs de l'Accueil
-- page_demarrage : la page qui s'ouvre en arrivant sur le site, la seule avec le grand en-tête
--   (vide : l'Accueil, index.html).
-- accueil_blocs : blocs affichés sur l'Accueil, dans l'ordre choisi
--   (prochaine, pensebete, nutrition, dicila, derniere ; vide : les blocs par défaut).
alter table preferences add column if not exists page_demarrage text
  check (page_demarrage ~ '^[a-z-]+\.html$');
alter table preferences add column if not exists accueil_blocs text[];
