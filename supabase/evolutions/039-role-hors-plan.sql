-- Évolution 039 · 20 novembre 2026 · Courses hors plan (Préparation 3.1, § 5.1)
-- Le rôle d'une course se donne dans Mon plan seulement ; vide : la course n'agit pas sur le plan (« Retirer du plan »,
-- une course neuve ajoutée depuis Saison). Les courses existantes gardent leur rôle.
alter table courses alter column role drop not null;
alter table courses alter column role drop default;
-- Mon plan : date du dernier changement de la saison (rôles, ajouts, retraits), comparée à la dernière proposition de l'IA.
alter table preferences add column if not exists plan_maj timestamptz;
