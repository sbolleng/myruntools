-- Évolution 017 · 1er novembre 2026 · Ouverture des inscriptions : heure et mois seul
-- Module Courses à surveiller : les dossards des grandes courses partent en quelques minutes, d'où l'heure d'ouverture ;
-- quand seul le mois est connu, la date est rangée au 1er du mois (comme date_approx pour la course).
alter table courses add column if not exists ouverture_heure time;
alter table courses add column if not exists ouverture_approx boolean not null default false;
