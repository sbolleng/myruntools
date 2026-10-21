-- Évolution 006 · 22 octobre 2026 · noms alignés sur le site
-- « Sous-catégorie » devient « Format » ; le nom d'une course est rangé en
-- « course » (obligatoire, ex. Forez Trails) et « parcours » (facultatif, ex. L'Olmetoise).
alter table sous_categories rename to formats;
alter table courses rename column sous_categorie to format;
alter table courses rename column evenement to course;
alter table courses rename column nom to parcours;
-- Une course qui n'avait qu'un nom : il devient la course, sans parcours.
alter table courses alter column parcours drop not null;
update courses set course = parcours, parcours = null where course is null;
alter table courses alter column course set not null;
