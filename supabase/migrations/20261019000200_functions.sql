-- Funções internas e RPCs do quiz (pod.md §5–§6).
-- Regras: auth.uid() é o dono; timer de 20s no servidor; shuffle persistido.

create or replace function public.normalize_nickname(p_nickname text)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.lower(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g')
    )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text := pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'nickname', ''));
  v_normalized text;
begin
  if char_length(v_nickname) < 3
     or char_length(v_nickname) > 20
     or v_nickname ~ '[[:cntrl:]]' then
    raise exception 'INVALID_NICKNAME';
  end if;

  v_normalized := public.normalize_nickname(v_nickname);

  insert into public.profiles (id, nickname, normalized_nickname)
  values (new.id, v_nickname, v_normalized);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.abandon_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.quiz_sessions s
  set status = 'abandoned',
      completed_at = pg_catalog.now(),
      score = coalesce((
        select count(*) from public.session_questions q
        where q.session_id = s.id and q.is_correct
      ), 0)::smallint
  where s.id = p_session_id
    and s.status = 'in_progress';
end;
$$;

create or replace function public.complete_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.quiz_sessions s
  set status = 'completed',
      completed_at = pg_catalog.now(),
      score = coalesce((
        select count(*) from public.session_questions q
        where q.session_id = s.id and q.is_correct
      ), 0)::smallint
  where s.id = p_session_id
    and s.status = 'in_progress';
end;
$$;

create or replace function public.build_question_payload(p_session_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sessionQuestionId', sq.id,
    'position', sq.position,
    'total', 10,
    'prompt', sq.prompt,
    'options', (
      select jsonb_agg(
        jsonb_build_object('label', so.label, 'body', so.body)
        order by so.position
      )
      from public.session_options so
      where so.session_question_id = sq.id
    ),
    'deadlineAt', pg_catalog.to_char(
      (sq.presented_at + interval '20 seconds') at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    ),
    'serverNow', pg_catalog.to_char(
      pg_catalog.now() at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
  )
  from public.session_questions sq
  where sq.id = p_session_question_id;
$$;

create or replace function public.build_feedback(p_session_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'state', 'feedback',
    'position', sq.position,
    'isCorrect', coalesce(sq.is_correct, false),
    'timedOut', sq.timed_out,
    'selectedLabel', sq.selected_label,
    'correctOption', (
      select jsonb_build_object('label', so.label, 'body', so.body)
      from public.session_options so
      where so.session_question_id = sq.id and so.is_correct
    ),
    'explanation', sq.explanation,
    'score', (
      select count(*) from public.session_questions q
      where q.session_id = sq.session_id and q.is_correct
    )
  )
  from public.session_questions sq
  where sq.id = p_session_question_id;
$$;

create or replace function public.build_summary(p_session_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'sessionId', s.id,
    'status', s.status,
    'ranked', s.status = 'completed',
    'score', coalesce(s.score, 0),
    'total', 10,
    'completedAt', case
      when s.completed_at is null then null
      else pg_catalog.to_char(
        s.completed_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    end,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', sq.position,
          'prompt', sq.prompt,
          'options', (
            select jsonb_agg(
              jsonb_build_object('label', so.label, 'body', so.body)
              order by so.position
            )
            from public.session_options so
            where so.session_question_id = sq.id
          ),
          'selectedLabel', sq.selected_label,
          'correctLabel', (
            select so.label from public.session_options so
            where so.session_question_id = sq.id and so.is_correct
          ),
          'explanation', sq.explanation,
          'answered', sq.answered_at is not null,
          'isCorrect', coalesce(sq.is_correct, false),
          'timedOut', sq.timed_out
        )
        order by sq.position
      )
      from public.session_questions sq
      where sq.session_id = s.id
    ), '[]'::jsonb)
  )
  from public.quiz_sessions s
  where s.id = p_session_id;
$$;

create or replace function public.select_session_questions(
  p_user_id uuid,
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level smallint;
  v_unseen integer;
  v_count integer;
  v_c1 integer;
  v_c2 integer;
  v_c3 integer;
  v_attempt integer;
  v_over smallint;
  v_under smallint;
  v_qid uuid;
  v_level_over smallint;
  v_new uuid;
  v_new_subject smallint;
  v_new_level smallint;
begin
  drop table if exists pg_temp.selected_questions;
  create temp table pg_temp.selected_questions (
    question_id uuid primary key,
    level_id smallint not null,
    subject_id smallint not null,
    viewed boolean not null default false
  ) on commit drop;

  for v_level in 1..5 loop
    select count(*) into v_unseen
    from public.questions q
    where q.is_active
      and q.level_id = v_level
      and not exists (
        select 1 from public.question_views v
        where v.user_id = p_user_id and v.question_id = q.id
      );

    if v_unseen = 0 then
      delete from public.question_views
      where user_id = p_user_id and level_id = v_level;

      select count(*) into v_unseen
      from public.questions
      where is_active and level_id = v_level;
    end if;

    if v_unseen >= 2 then
      insert into pg_temp.selected_questions (question_id, level_id, subject_id, viewed)
      select q.id, q.level_id, q.subject_id, false
      from public.questions q
      where q.is_active
        and q.level_id = v_level
        and not exists (
          select 1 from public.question_views v
          where v.user_id = p_user_id and v.question_id = q.id
        )
      order by random()
      limit 2;
    elsif v_unseen = 1 then
      insert into pg_temp.selected_questions (question_id, level_id, subject_id, viewed)
      select q.id, q.level_id, q.subject_id, false
      from public.questions q
      where q.is_active
        and q.level_id = v_level
        and not exists (
          select 1 from public.question_views v
          where v.user_id = p_user_id and v.question_id = q.id
        )
      order by random()
      limit 1;

      insert into pg_temp.selected_questions (question_id, level_id, subject_id, viewed)
      select q.id, q.level_id, q.subject_id, true
      from public.questions q
      where q.is_active
        and q.level_id = v_level
        and exists (
          select 1 from public.question_views v
          where v.user_id = p_user_id and v.question_id = q.id
        )
        and not exists (
          select 1 from pg_temp.selected_questions s
          where s.question_id = q.id
        )
      order by random()
      limit 1;
    else
      insert into pg_temp.selected_questions (question_id, level_id, subject_id, viewed)
      select q.id, q.level_id, q.subject_id, false
      from public.questions q
      where q.is_active
        and q.level_id = v_level
        and not exists (
          select 1 from pg_temp.selected_questions s
          where s.question_id = q.id
        )
      order by random()
      limit 2;
    end if;

    select count(*) into v_count
    from pg_temp.selected_questions
    where level_id = v_level;

    if v_count <> 2 then
      raise exception 'BANK_INCOMPLETE';
    end if;
  end loop;

  -- Balanceamento de assuntos: alvo 3/3/4, melhor esforço (D27).
  for v_attempt in 1..20 loop
    select count(*) into v_c1 from pg_temp.selected_questions where subject_id = 1;
    select count(*) into v_c2 from pg_temp.selected_questions where subject_id = 2;
    select count(*) into v_c3 from pg_temp.selected_questions where subject_id = 3;

    exit when greatest(v_c1, v_c2, v_c3) <= 4
          and least(v_c1, v_c2, v_c3) >= 3;

    if v_c1 >= 4 then
      v_over := 1;
    elsif v_c2 >= 4 then
      v_over := 2;
    elsif v_c3 >= 4 then
      v_over := 3;
    else
      exit;
    end if;

    select s.question_id, s.level_id
      into v_qid, v_level_over
    from pg_temp.selected_questions s
    where s.subject_id = v_over
    order by s.viewed desc, random()
    limit 1;

    exit when v_qid is null;

    if v_over = 1 then
      if v_c2 <= v_c3 and v_c2 < 4 then
        v_under := 2;
      elsif v_c3 < 4 then
        v_under := 3;
      else
        exit;
      end if;
    elsif v_over = 2 then
      if v_c1 <= v_c3 and v_c1 < 4 then
        v_under := 1;
      elsif v_c3 < 4 then
        v_under := 3;
      else
        exit;
      end if;
    else
      if v_c1 <= v_c2 and v_c1 < 4 then
        v_under := 1;
      elsif v_c2 < 4 then
        v_under := 2;
      else
        exit;
      end if;
    end if;

    select q.id, q.subject_id, q.level_id
      into v_new, v_new_subject, v_new_level
    from public.questions q
    where q.is_active
      and q.level_id = v_level_over
      and q.subject_id = v_under
      and not exists (
        select 1 from pg_temp.selected_questions s
        where s.question_id = q.id
      )
    order by (
      exists (
        select 1 from public.question_views v
        where v.user_id = p_user_id and v.question_id = q.id
      )
    ) asc, random()
    limit 1;

    exit when v_new is null;

    delete from pg_temp.selected_questions where question_id = v_qid;
    insert into pg_temp.selected_questions (question_id, level_id, subject_id, viewed)
    values (
      v_new,
      v_new_level,
      v_new_subject,
      exists (
        select 1 from public.question_views v
        where v.user_id = p_user_id and v.question_id = v_new
      )
    );
  end loop;

  insert into public.session_questions (
    session_id, position, question_id, level_id, subject_id, prompt, explanation
  )
  select
    p_session_id,
    (row_number() over (order by s.level_id, random()))::smallint,
    q.id,
    q.level_id,
    q.subject_id,
    q.prompt,
    q.explanation
  from pg_temp.selected_questions s
  join public.questions q on q.id = s.question_id;

  with ranked as (
    select
      sq.id as session_question_id,
      o.id as option_id,
      o.body,
      o.is_correct,
      -- A correta entra primeiro; as 3 erradas são sorteadas.
      row_number() over (
        partition by sq.id
        order by o.is_correct desc, random()
      ) as pick
    from public.session_questions sq
    join public.question_options o on o.question_id = sq.question_id
    where sq.session_id = p_session_id
  ),
  chosen as (
    select * from ranked where pick <= 4
  ),
  shuffled as (
    select
      session_question_id,
      option_id,
      body,
      is_correct,
      -- Embaralha os rótulos A–D depois de escolher as 4 opções.
      row_number() over (
        partition by session_question_id
        order by random()
      ) as rn
    from chosen
  )
  insert into public.session_options (
    session_question_id, option_id, body, label, position, is_correct
  )
  select
    session_question_id,
    option_id,
    body,
    chr((64 + rn)::integer)::char(1),
    rn::smallint,
    is_correct
  from shuffled;

  select count(*) into v_count
  from public.session_options so
  join public.session_questions sq on sq.id = so.session_question_id
  where sq.session_id = p_session_id;

  if v_count <> 40 then
    raise exception 'BANK_INCOMPLETE';
  end if;

  insert into public.question_views (user_id, question_id, level_id)
  select p_user_id, s.question_id, s.level_id
  from pg_temp.selected_questions s
  on conflict (user_id, question_id) do nothing;
end;
$$;

create or replace function public.rpc_check_nickname(p_nickname text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_nickname text := pg_catalog.btrim(coalesce(p_nickname, ''));
  v_normalized text;
begin
  if char_length(v_nickname) < 3
     or char_length(v_nickname) > 20
     or v_nickname ~ '[[:cntrl:]]' then
    return jsonb_build_object(
      'valid', false,
      'available', false,
      'normalized', null
    );
  end if;

  v_normalized := public.normalize_nickname(v_nickname);

  return jsonb_build_object(
    'valid', true,
    'available', not exists (
      select 1 from public.profiles p
      where p.normalized_nickname = v_normalized
    ),
    'normalized', v_normalized
  );
end;
$$;

create or replace function public.rpc_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('nickname', p.nickname)
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.rpc_start_session()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
  v_first uuid;
  v_payload jsonb;
  v_old_session uuid;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user::text, 0)
  );

  if (
    select count(*) from public.quiz_sessions s
    where s.user_id = v_user
      and s.started_at > pg_catalog.now() - interval '1 hour'
  ) >= 20 then
    raise exception 'RATE_LIMITED';
  end if;

  for v_old_session in
    select id from public.quiz_sessions
    where user_id = v_user and status = 'in_progress'
  loop
    perform public.abandon_session(v_old_session);
  end loop;

  insert into public.quiz_sessions (user_id)
  values (v_user)
  returning id into v_session;

  perform public.select_session_questions(v_user, v_session);

  update public.session_questions
  set presented_at = pg_catalog.now()
  where session_id = v_session and position = 1;

  select id into v_first
  from public.session_questions
  where session_id = v_session and position = 1;

  v_payload := public.build_question_payload(v_first);

  return jsonb_build_object(
    'sessionId', v_session,
    'question', v_payload
  );
end;
$$;

create or replace function public.rpc_submit_answer(
  p_session_question_id uuid,
  p_label text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.quiz_sessions%rowtype;
  v_question public.session_questions%rowtype;
  v_answered integer;
  v_correct boolean;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_session
  from public.quiz_sessions
  where user_id = v_user and status = 'in_progress'
  for update;

  if not found then
    return jsonb_build_object('state', 'error', 'code', 'SESSION_CLOSED');
  end if;

  -- `raise exception` desfaria o abandon no mesmo transaction. Devolver o
  -- sentinela de erro preserva a sessão encerrada e o cliente trata o código.
  if v_session.last_activity_at < pg_catalog.now() - interval '2 hours' then
    perform public.abandon_session(v_session.id);
    return jsonb_build_object('state', 'error', 'code', 'SESSION_CLOSED');
  end if;

  select * into v_question
  from public.session_questions
  where id = p_session_question_id
    and session_id = v_session.id;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  select count(*) into v_answered
  from public.session_questions
  where session_id = v_session.id and answered_at is not null;

  -- Retry idempotente da mesma resposta. Se o servidor já marcou timeout,
  -- devolve o feedback para o cliente não perder a explicação.
  if v_question.position <= v_answered then
    if v_question.selected_label = p_label
       or (v_question.timed_out and v_question.selected_label is null) then
      return public.build_feedback(v_question.id);
    else
      raise exception 'ALREADY_ANSWERED';
    end if;
  end if;

  if v_question.position <> v_answered + 1 then
    raise exception 'QUESTION_OPEN';
  end if;

  if v_question.presented_at is null then
    raise exception 'QUESTION_OPEN';
  end if;

  -- O servidor decide o timeout, independentemente do relógio do cliente.
  if pg_catalog.now() > v_question.presented_at + interval '20 seconds' then
    update public.session_questions
    set timed_out = true,
        is_correct = false,
        answered_at = pg_catalog.now(),
        selected_label = null
    where id = v_question.id;

    update public.quiz_sessions
    set last_activity_at = pg_catalog.now()
    where id = v_session.id;

    return public.build_feedback(v_question.id);
  end if;

  if p_label is null or p_label not in ('A', 'B', 'C', 'D') then
    raise exception 'INVALID_INPUT';
  end if;

  select so.is_correct into v_correct
  from public.session_options so
  where so.session_question_id = v_question.id
    and so.label = p_label;

  if not found then
    raise exception 'INVALID_INPUT';
  end if;

  update public.session_questions
  set selected_label = p_label,
      is_correct = v_correct,
      answered_at = pg_catalog.now(),
      timed_out = false
  where id = v_question.id;

  update public.quiz_sessions
  set last_activity_at = pg_catalog.now()
  where id = v_session.id;

  return public.build_feedback(v_question.id);
end;
$$;

create or replace function public.rpc_advance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.quiz_sessions%rowtype;
  v_question public.session_questions%rowtype;
  v_answered integer;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_session
  from public.quiz_sessions
  where user_id = v_user and status = 'in_progress'
  for update;

  if not found then
    return jsonb_build_object('state', 'error', 'code', 'SESSION_CLOSED');
  end if;

  -- Mesmo motivo de rpc_submit_answer: preservar o abandon antes de sair.
  if v_session.last_activity_at < pg_catalog.now() - interval '2 hours' then
    perform public.abandon_session(v_session.id);
    return jsonb_build_object('state', 'error', 'code', 'SESSION_CLOSED');
  end if;

  select count(*) into v_answered
  from public.session_questions
  where session_id = v_session.id and answered_at is not null;

  if v_answered >= 10 then
    perform public.complete_session(v_session.id);
    return jsonb_build_object(
      'state', 'summary',
      'summary', public.build_summary(v_session.id)
    );
  end if;

  select * into v_question
  from public.session_questions
  where session_id = v_session.id
    and position = v_answered + 1;

  if not found then
    raise exception 'INTERNAL';
  end if;

  if v_question.presented_at is null then
    update public.session_questions
    set presented_at = pg_catalog.now()
    where id = v_question.id;

    update public.quiz_sessions
    set last_activity_at = pg_catalog.now()
    where id = v_session.id;

    return jsonb_build_object(
      'state', 'question',
      'question', public.build_question_payload(v_question.id)
    );
  end if;

  if pg_catalog.now() > v_question.presented_at + interval '20 seconds' then
    update public.session_questions
    set timed_out = true,
        is_correct = false,
        answered_at = pg_catalog.now(),
        selected_label = null
    where id = v_question.id;

    update public.quiz_sessions
    set last_activity_at = pg_catalog.now()
    where id = v_session.id;

    return public.build_feedback(v_question.id);
  end if;

  raise exception 'QUESTION_OPEN';
end;
$$;

create or replace function public.rpc_get_summary(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session public.quiz_sessions%rowtype;
begin
  if v_user is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select * into v_session
  from public.quiz_sessions
  where id = p_session_id and user_id = v_user;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.status = 'in_progress' then
    if v_session.last_activity_at < pg_catalog.now() - interval '2 hours' then
      perform public.abandon_session(v_session.id);

      select * into v_session
      from public.quiz_sessions
      where id = p_session_id;
    else
      raise exception 'SESSION_OPEN';
    end if;
  end if;

  return public.build_summary(v_session.id);
end;
$$;

create or replace function public.rpc_public_ranking()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select distinct on (s.user_id)
      s.user_id,
      s.score,
      s.completed_at
    from public.quiz_sessions s
    where s.status = 'completed'
    order by s.user_id, s.score desc, s.completed_at asc
  ),
  ranked as (
    select
      b.user_id,
      p.nickname,
      b.score,
      b.completed_at,
      row_number() over (
        order by b.score desc, b.completed_at asc, p.normalized_nickname asc
      ) as position
    from best b
    join public.profiles p on p.id = b.user_id
  )
  select jsonb_build_object(
    'top', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', r.position,
          'nickname', r.nickname,
          'score', r.score,
          'achievedAt', pg_catalog.to_char(
            r.completed_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          )
        )
        order by r.position
      )
      from ranked r
      where r.position <= 10
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object(
        'position', r.position,
        'nickname', r.nickname,
        'score', r.score,
        'achievedAt', pg_catalog.to_char(
          r.completed_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
        )
      )
      from ranked r
      where r.user_id = auth.uid()
    )
  );
$$;
