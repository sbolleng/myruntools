-- Évolution 022 · 6 novembre 2026 · Sport du jour de Nutrition, rangé dans la base
-- Une ligne par sport et par jour (type : la clé du sport de la calculatrice, composants/besoin.js ; durée en heures).
-- Données de santé : règle par ligne, jamais lisibles par le site partagé.
create table sport_jour (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  date        date not null,
  type        text not null check (char_length(type) between 1 and 20),
  heures      numeric(4,2) not null check (heures > 0 and heures <= 24)
);
create index sport_jour_utilisateur_date on sport_jour (utilisateur, date);

alter table sport_jour enable row level security;
create policy "son sport" on sport_jour for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
