-- Évolution 029 · 10 novembre 2026 · Bloc Nutrition en deuxième position sur En un coup d'œil
-- Pour les profils qui ont rangé leurs blocs (preferences.accueil_blocs) : Nutrition est retiré de sa place et remis
-- juste après le premier bloc. Sans ordre rangé, le bloc est déjà deuxième (ordre par défaut).
update preferences
set accueil_blocs = accueil_blocs[1:1] || array['nutrition'] || array_remove(accueil_blocs[2:], 'nutrition')
where accueil_blocs is not null and cardinality(accueil_blocs) > 0;
