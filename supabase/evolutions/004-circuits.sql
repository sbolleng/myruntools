-- Évolution 004 · 21 octobre 2026 · circuits (modèle de données 0.4)
-- Une course peut appartenir à plusieurs circuits (UTMB, Challenge Levy…),
-- avec sa catégorie et ses Running Stones ; les champs UTMB quittent courses.
create table circuits (
  id      text primary key,
  libelle text not null unique,
  lien    text,
  note    text,
  ordre   int  not null
);

create table courses_circuits (
  utilisateur uuid not null default auth.uid(),
  course      uuid not null,
  circuit     text not null references circuits (id),
  categorie   text,
  stones      int check (stones >= 0),
  primary key (course, circuit),
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete cascade
);

alter table circuits         enable row level security;
alter table courses_circuits enable row level security;
create policy "lecture" on circuits for select to authenticated using (true);
create policy "ses circuits" on courses_circuits for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));

insert into circuits (id, libelle, lien, note, ordre) values
  ('utmb', 'UTMB', 'https://utmb.world', 'Catégorie d''index (20K, 50K, 100K…) ; Running Stones sur les courses UTMB World Series', 1),
  ('levy', 'Challenge Levy', 'https://chrono-start.com/challenge-levy/', 'Autour de Toulouse, 12 à 15 courses par an ; classé à partir de 5 courses', 2);

alter table courses drop column label_utmb, drop column index_utmb;
