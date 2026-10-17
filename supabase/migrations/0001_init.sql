-- JEC'UP — schéma initial (collège / lycée)
-- Toutes les tables sont privées par élève : Row Level Security activée partout.

create extension if not exists vector;

-- ───────────── Profil ─────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null,
  country text not null default 'France',
  school text,
  level text not null check (level in ('6e','5e','4e','3e','2nde','1re','tle','cap','2nde-pro','1re-pro','tle-pro')),
  voie text check (voie in ('generale','technologique','professionnelle')),
  serie_techno text,
  specialites text[] not null default '{}',
  eval_formats text[] not null default '{}',
  goals text[] not null default '{}',
  availability int[] not null default '{60,45,45,60,45,45,90}', -- minutes par jour, dimanche = index 0
  learning_mode boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────── Matières ─────────────
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  discipline text not null,
  color text not null,
  weight smallint not null default 3 check (weight between 1 and 5),
  folders text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────────── Documents et morceaux (RAG) ─────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  subject_id uuid not null references public.subjects on delete cascade,
  title text not null,
  folder text not null default 'Cours',
  source text not null check (source in ('texte','pdf','photo','demo')),
  storage_path text,                -- fichier original dans le bucket privé course-files
  raw_text text not null,
  doc_type text not null,
  discipline text not null,
  discipline_confidence real not null default 0,
  complexity smallint not null default 1,
  summary text,
  sections jsonb not null default '[]',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  document_id uuid not null references public.documents on delete cascade,
  index int not null,
  page int not null default 1,
  section text,
  text text not null,
  -- dimension à adapter au modèle d'embeddings retenu
  embedding vector(1024),
  fts tsvector generated always as (to_tsvector('french', coalesce(section,'') || ' ' || text)) stored
);
create index on public.document_chunks using hnsw (embedding vector_cosine_ops);
create index on public.document_chunks using gin (fts);

-- ───────────── Notions et contenus générés (toujours reliés à leur source) ─────────────
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  subject_id uuid not null references public.subjects on delete cascade,
  document_id uuid not null references public.documents on delete cascade,
  chunk_id uuid references public.document_chunks on delete set null,
  label text not null,
  detail text not null,
  kind text not null,
  bloom text[] not null,
  source_excerpt text not null,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  concept_id uuid not null references public.concepts on delete cascade,
  type text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  prompt text not null,
  choices jsonb,
  answer text not null,
  explanation text not null,
  generated_by text not null default 'heuristic', -- heuristic | claude
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  concept_id uuid not null references public.concepts on delete cascade,
  question_id uuid references public.questions on delete set null,
  correct boolean not null,
  difficulty smallint not null,
  response_ms int not null,
  at timestamptz not null default now()
);

create table public.mastery (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  concept_id uuid not null references public.concepts on delete cascade,
  score smallint not null default 0 check (score between 0 and 100),
  attempts int not null default 0,
  correct int not null default 0,
  streak int not null default 0,
  lapses int not null default 0,
  interval_days int not null default 0,
  ease real not null default 2.3,
  last_reviewed timestamptz,
  next_review date,
  primary key (user_id, concept_id)
);

-- ───────────── Organisation ─────────────
create table public.planner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  subject_id uuid references public.subjects on delete cascade,
  kind text not null check (kind in ('cours','controle','examen','revision','devoirs','projet','activite','rdv')),
  title text not null,
  date date not null,
  start_time time,
  duration_min int not null,
  status text not null default 'prevu' check (status in ('prevu','fait','manque')),
  concept_ids uuid[] not null default '{}',
  generated boolean not null default false,
  exam_format text
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  subject_id uuid references public.subjects on delete set null,
  title text not null,
  due date,
  kind text not null,
  estimated_min int not null default 30,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  role text not null check (role in ('user','assistant')),
  mode text not null,
  content text not null,
  sources jsonb,          -- [{document_id, chunk_id, page, excerpt}]
  general text,           -- explication générale, distincte des cours
  at timestamptz not null default now()
);

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
create policy "profil personnel" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['subjects','documents','document_chunks','concepts','questions','attempts','mastery','planner_events','tasks','chat_messages']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "données personnelles" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create index on public.%I (user_id)', t);
  end loop;
end $$;

-- ───────────── Recherche sémantique (RAG) ─────────────
-- security invoker : la RLS s'applique, un élève ne peut interroger que ses propres morceaux.
create or replace function public.match_chunks(query_embedding vector(1024), match_count int default 5, filter_subject uuid default null)
returns table (chunk_id uuid, document_id uuid, page int, section text, text text, similarity real)
language sql stable security invoker as $$
  select c.id, c.document_id, c.page, c.section, c.text, (1 - (c.embedding <=> query_embedding))::real
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.embedding is not null and (filter_subject is null or d.subject_id = filter_subject)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Recherche plein texte en français (secours sans embeddings)
create or replace function public.search_chunks(q text, match_count int default 5)
returns table (chunk_id uuid, document_id uuid, page int, section text, text text, rank real)
language sql stable security invoker as $$
  select c.id, c.document_id, c.page, c.section, c.text, ts_rank(c.fts, websearch_to_tsquery('french', q))
  from public.document_chunks c
  where c.fts @@ websearch_to_tsquery('french', q)
  order by 6 desc
  limit match_count;
$$;

-- ───────────── Stockage privé des fichiers originaux ─────────────
insert into storage.buckets (id, name, public) values ('course-files', 'course-files', false)
on conflict (id) do nothing;

-- chemin attendu : <user_id>/<document_id>/<nom du fichier>
create policy "fichiers personnels — lecture" on storage.objects for select
  using (bucket_id = 'course-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fichiers personnels — ajout" on storage.objects for insert
  with check (bucket_id = 'course-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fichiers personnels — suppression" on storage.objects for delete
  using (bucket_id = 'course-files' and (storage.foldername(name))[1] = auth.uid()::text);
