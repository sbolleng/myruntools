-- Évolution 007 · 27 octobre 2026 · Objectif normé et Précisions
-- L'objectif d'une course est normé : un temps hh:mm:ss (« 02:45:00 »), « Finisher »,
-- « Sub 3h », « Sub 1h30 » ou « Sub 45 min ». Le texte libre qui l'accompagne va dans
-- « objectif_precisions » (100 caractères au plus).
alter table courses add column if not exists objectif_precisions text
  check (char_length(objectif_precisions) <= 100);

-- Un objectif hors norme part tel quel dans Précisions ; l'objectif est vidé,
-- à compléter ensuite (formulaire, ou mises à jour ligne par ligne).
update courses
set objectif_precisions = left(objectif, 100), objectif = null
where objectif is not null
  and objectif !~ '^[0-9]{2}:[0-5][0-9]:[0-5][0-9]$'
  and objectif !~ '^Finisher$'
  and objectif !~ '^Sub [0-9]+h([0-5][0-9])?$'
  and objectif !~ '^Sub [0-9]+ min$';
