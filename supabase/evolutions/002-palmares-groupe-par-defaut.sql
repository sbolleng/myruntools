-- Évolution 002 · 21 octobre 2026 · Palmarès groupé par type par défaut
alter table preferences alter column palmares_groupe set default true;
update preferences set palmares_groupe = true;
