-- Tabelle: sessions
create table sessions (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now(),
  trainer_name  text not null,
  date_label    text not null,
  date_iso      text not null,
  kpis          jsonb not null,
  goal_ratings  jsonb,
  beobachtung   text default '',
  verbesserung  text default '',
  sonstiges     text default ''
);

-- Tabelle: goals
create table goals (
  id        bigint generated always as identity primary key,
  position  int not null,
  text      text not null
);

-- Öffentlicher Lesezugriff (kein Login nötig)
alter table sessions enable row level security;
alter table goals    enable row level security;

create policy "Alle können lesen" on sessions for select using (true);
create policy "Alle können schreiben" on sessions for insert with check (true);

create policy "Alle können lesen" on goals for select using (true);
create policy "Alle können schreiben" on goals for insert with check (true);
create policy "Alle können löschen" on goals for delete using (true);

-- Realtime aktivieren
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table goals;
