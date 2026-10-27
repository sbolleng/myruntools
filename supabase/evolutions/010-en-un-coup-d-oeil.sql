-- Évolution 010 · 27 octobre 2026 · « En un coup d'œil », un module comme les autres
-- L'ancien Accueil devient le module « En un coup d'œil » : il se masque et se déplace comme les autres.
-- Un menu déjà enregistré l'affiche en premier, comme avant (rien d'enregistré : tout le catalogue, lui en tête).
update preferences
set modules = array_prepend('En un coup d''œil', modules)
where modules is not null and cardinality(modules) > 0
  and not ('En un coup d''œil' = any(modules));
