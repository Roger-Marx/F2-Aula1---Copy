-- Schema base do OpenCode Quiz (prd.md v1.2 / pod.md §4).
-- Todas as tabelas ficam com RLS deny-all; o acesso ocorre por RPCs security definer.

create table public.levels (
  id smallint primary key,
  slug text not null unique,
  name_pt text not null,
  sort_order smallint not null unique
);

create table public.subjects (
  id smallint primary key,
  slug text not null unique,
  name_pt text not null,
  sort_order smallint not null unique
);

create table public.questions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  external_id text not null unique,
  level_id smallint not null references public.levels (id),
  subject_id smallint not null references public.subjects (id),
  prompt text not null check (char_length(prompt) between 1 and 500),
  explanation text not null check (char_length(explanation) between 1 and 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create index questions_level_active_idx
  on public.questions (level_id, is_active);
create index questions_subject_idx
  on public.questions (subject_id);

create table public.question_options (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  is_correct boolean not null default false,
  position smallint not null check (position between 1 and 9)
);

create unique index question_options_one_correct
  on public.question_options (question_id)
  where is_correct;
create unique index question_options_position
  on public.question_options (question_id, position);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger questions_set_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

create function public.assert_question_shape()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_count integer;
  v_correct integer;
begin
  if tg_op = 'DELETE' then
    v_question_id := old.question_id;
  else
    v_question_id := new.question_id;
  end if;

  -- A cascade delete da questão remove as opções; não há o que validar.
  if not exists (select 1 from public.questions q where q.id = v_question_id) then
    return null;
  end if;

  select count(*), count(*) filter (where o.is_correct)
    into v_count, v_correct
  from public.question_options o
  where o.question_id = v_question_id;

  if v_count <> 9 or v_correct <> 1 then
    raise exception 'QUESTION_SHAPE_INVALID';
  end if;

  return null;
end;
$$;

create constraint trigger question_options_shape_check
after insert or update or delete on public.question_options
deferrable initially deferred
for each row
execute function public.assert_question_shape();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null
    check (char_length(nickname) between 3 and 20)
    check (nickname !~ '[[:cntrl:]]'),
  normalized_nickname text not null unique,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.quiz_sessions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default pg_catalog.now(),
  last_activity_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  score smallint check (score between 0 and 10)
);

create unique index quiz_sessions_one_in_progress
  on public.quiz_sessions (user_id)
  where status = 'in_progress';
create index quiz_sessions_user_started_idx
  on public.quiz_sessions (user_id, started_at desc);

create table public.session_questions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions (id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  question_id uuid not null references public.questions (id),
  level_id smallint not null references public.levels (id),
  subject_id smallint not null references public.subjects (id),
  prompt text not null,
  explanation text not null,
  presented_at timestamptz,
  answered_at timestamptz,
  selected_label char(1) check (selected_label in ('A', 'B', 'C', 'D')),
  is_correct boolean,
  timed_out boolean not null default false,
  unique (session_id, position),
  unique (session_id, question_id)
);

create index session_questions_session_idx
  on public.session_questions (session_id);

create table public.session_options (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  session_question_id uuid not null references public.session_questions (id) on delete cascade,
  option_id uuid references public.question_options (id) on delete set null,
  body text not null,
  label char(1) not null check (label in ('A', 'B', 'C', 'D')),
  position smallint not null check (position between 1 and 4),
  is_correct boolean not null default false,
  unique (session_question_id, label),
  unique (session_question_id, position)
);

create unique index session_options_one_correct
  on public.session_options (session_question_id)
  where is_correct;
create index session_options_session_question_idx
  on public.session_options (session_question_id);

create table public.question_views (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  level_id smallint not null references public.levels (id),
  first_seen_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, question_id)
);

create index question_views_user_level_idx
  on public.question_views (user_id, level_id);
