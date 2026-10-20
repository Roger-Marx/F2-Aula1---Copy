-- Helpers transacionais usados apenas por scripts locais com service role.
-- Não são RPCs de runtime e não recebem grant para anon/authenticated.

create or replace function public.seed_question(
  p_external_id text,
  p_level_id smallint,
  p_subject_id smallint,
  p_prompt text,
  p_explanation text,
  p_options jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_count integer;
  v_correct integer;
  v_distinct integer;
begin
  if pg_catalog.jsonb_typeof(p_options) <> 'array'
     or pg_catalog.jsonb_array_length(p_options) <> 9 then
    raise exception 'QUESTION_SHAPE_INVALID';
  end if;

  select
    count(*),
    count(*) filter (where option ->> 'correct' = 'true'),
    count(distinct pg_catalog.lower(pg_catalog.btrim(option ->> 'body')))
    into v_count, v_correct, v_distinct
  from pg_catalog.jsonb_array_elements(p_options) as t(option);

  if v_count <> 9 or v_correct <> 1 or v_distinct <> 9 then
    raise exception 'QUESTION_SHAPE_INVALID';
  end if;

  insert into public.questions (
    external_id, level_id, subject_id, prompt, explanation, is_active
  )
  values (
    p_external_id, p_level_id, p_subject_id, p_prompt, p_explanation, true
  )
  on conflict (external_id) do update
  set level_id = excluded.level_id,
      subject_id = excluded.subject_id,
      prompt = excluded.prompt,
      explanation = excluded.explanation,
      is_active = true
  returning id into v_question_id;

  delete from public.question_options
  where question_id = v_question_id;

  insert into public.question_options (
    question_id, body, is_correct, position
  )
  select
    v_question_id,
    option ->> 'body',
    (option ->> 'correct')::boolean,
    ordinality::smallint
  from pg_catalog.jsonb_array_elements(p_options) with ordinality
    as t(option, ordinality);

  return v_question_id;
end;
$$;

create or replace function public.seed_finalize(p_external_ids text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deactivated integer;
begin
  update public.questions
  set is_active = false
  where is_active
    and not (external_id = any (p_external_ids));

  get diagnostics v_deactivated = row_count;
  return v_deactivated;
end;
$$;

revoke all on function public.seed_question(text, smallint, smallint, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.seed_finalize(text[])
  from public, anon, authenticated;

grant execute on function public.seed_question(text, smallint, smallint, text, text, jsonb)
  to service_role;
grant execute on function public.seed_finalize(text[])
  to service_role;
