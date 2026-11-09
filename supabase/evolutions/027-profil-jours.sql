-- Évolution 027 · 9 novembre 2026 · Profil d'entraînement : jours possibles et nombre de séances (spécification Préparation, § 5.2)
-- La semaine type (une activité par jour) devient : les jours possibles pour courir et pour le renforcement (un même jour peut
-- avoir les deux), le nombre de sorties et de renforcements par semaine, le jour à privilégier pour la sortie longue
-- (jour_long, déjà là ; vide : peu importe). Jours : 1 (lundi) à 7 (dimanche). semaine_type reste, mais n'est plus employée.
alter table profil_entrainement
  add column jours_course smallint[] check (jours_course <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  add column jours_renfo  smallint[] check (jours_renfo <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  add column nb_sorties   smallint check (nb_sorties between 1 and 7),
  add column nb_renfo     smallint check (nb_renfo between 0 and 7);

-- Conversion de la semaine type déjà saisie.
update profil_entrainement set
  jours_course = array(select d::smallint from generate_series(1, 7) as d where semaine_type[d] in ('course', 'longue') order by d),
  jours_renfo  = array(select d::smallint from generate_series(1, 7) as d where semaine_type[d] = 'renfo' order by d),
  nb_sorties   = nullif((select count(*) from unnest(semaine_type) as a where a in ('course', 'longue')), 0),
  nb_renfo     = (select count(*) from unnest(semaine_type) as a where a = 'renfo'),
  jour_long    = (select d from generate_series(1, 7) as d where semaine_type[d] = 'longue' limit 1)
where semaine_type is not null;
