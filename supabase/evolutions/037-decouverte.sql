-- Évolution 037 · 13 novembre 2026 · Découvrir MyRunTools
-- Le bloc « Découvrir MyRunTools » d'En un coup d'œil reste affiché jusqu'à « J'ai compris » (decouverte_vue).
-- Les comptes qui ont déjà des courses le connaissent : vu ; un compte encore vide le verra.
alter table preferences add column if not exists decouverte_vue boolean not null default false;
update preferences set decouverte_vue = true
where exists (select 1 from courses c where c.utilisateur = preferences.utilisateur);
