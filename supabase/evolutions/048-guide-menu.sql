-- Évolution 048 · 27 novembre 2026 · Guide au menu des comptes existants
-- Le Guide devient un module facultatif, en toute fin du menu (comme Mon plan, Ma nutrition, Mes stats).
-- Tous les comptes existants (aujourd'hui les deux comptes pilotes, les inscriptions étant fermées) le reçoivent au bout de leur menu :
-- un menu rangé reçoit « Guide » à la fin ; un menu jamais rangé (vide ou absent) reçoit le menu par défaut suivi de « Guide ».
-- Ceux qui l'ont déjà ne changent pas ; les autres préférences ne changent pas.
update preferences
set modules = case
  when modules is null or cardinality(modules) = 0 then
    array['En un coup d''œil', 'Courses à surveiller', 'Objectif', 'Calendrier', 'Palmarès', 'Profil', 'Guide']
  else array_append(modules, 'Guide')
end
where modules is null or not ('Guide' = any(modules));
