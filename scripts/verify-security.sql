-- Verificações de segurança e integridade (pod.md §12).
-- Execute como postgres no SQL Editor do Supabase ou via psql.
-- O script falha com exceção se alguma invariante for violada.

do $$
declare
  v_count integer;
  v_level integer;
begin
  -- 1. RLS habilitado em todas as tabelas public.
  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if v_count > 0 then
    raise exception 'RLS desabilitado em % tabela(s) public', v_count;
  end if;

  -- 2. Nenhuma policy para anon/authenticated.
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public';

  if v_count > 0 then
    raise exception 'Existem % policy(ies) em public; esperado deny-all', v_count;
  end if;

  -- 3. Sem SELECT direto nas tabelas do quiz.
  if has_table_privilege('anon', 'public.question_options', 'SELECT') then
    raise exception 'anon pode ler public.question_options';
  end if;
  if has_table_privilege('authenticated', 'public.quiz_sessions', 'SELECT') then
    raise exception 'authenticated pode ler public.quiz_sessions';
  end if;
  if has_table_privilege('authenticated', 'public.session_options', 'SELECT') then
    raise exception 'authenticated pode ler public.session_options';
  end if;

  -- 4. Grants de funções.
  if has_function_privilege('anon', 'public.rpc_start_session()', 'EXECUTE') then
    raise exception 'anon pode executar rpc_start_session';
  end if;
  if has_function_privilege('anon', 'public.rpc_public_ranking()', 'EXECUTE') is not true then
    raise exception 'anon não pode executar rpc_public_ranking';
  end if;
  if has_function_privilege('anon', 'public.rpc_check_nickname(text)', 'EXECUTE') is not true then
    raise exception 'anon não pode executar rpc_check_nickname';
  end if;
  if has_function_privilege('authenticated', 'public.rpc_start_session()', 'EXECUTE') is not true then
    raise exception 'authenticated não pode executar rpc_start_session';
  end if;
  if has_function_privilege('authenticated', 'public.rpc_submit_answer(uuid, text)', 'EXECUTE') is not true then
    raise exception 'authenticated não pode executar rpc_submit_answer';
  end if;
  if has_function_privilege('authenticated', 'public.select_session_questions(uuid, uuid)', 'EXECUTE') then
    raise exception 'authenticated pode executar função interna select_session_questions';
  end if;

  -- 5. Banco ativo: 200 questões, 40 por nível, 13/13/14 por assunto em cada nível.
  select count(*) into v_count from public.questions where is_active;
  if v_count <> 200 then
    raise exception 'Esperado 200 questões ativas; encontrado %', v_count;
  end if;

  for v_level in 1..5 loop
    select count(*) into v_count
    from public.questions
    where is_active and level_id = v_level;

    if v_count <> 40 then
      raise exception 'Nível % tem % questões ativas; esperado 40', v_level, v_count;
    end if;

    select count(*) into v_count
    from public.questions
    where is_active and level_id = v_level and subject_id = 1;
    if v_count <> 13 then
      raise exception 'Nível %/fundamentos tem % questões; esperado 13', v_level, v_count;
    end if;

    select count(*) into v_count
    from public.questions
    where is_active and level_id = v_level and subject_id = 2;
    if v_count <> 13 then
      raise exception 'Nível %/configuração tem % questões; esperado 13', v_level, v_count;
    end if;

    select count(*) into v_count
    from public.questions
    where is_active and level_id = v_level and subject_id = 3;
    if v_count <> 14 then
      raise exception 'Nível %/fluxo tem % questões; esperado 14', v_level, v_count;
    end if;
  end loop;

  -- 6. Cada questão ativa tem 9 opções e exatamente 1 correta.
  select count(*) into v_count
  from public.questions q
  where q.is_active
    and (
      (select count(*) from public.question_options o where o.question_id = q.id) <> 9
      or (select count(*) from public.question_options o where o.question_id = q.id and o.is_correct) <> 1
    );

  if v_count > 0 then
    raise exception '% questão(ões) ativa(s) com forma inválida', v_count;
  end if;

  -- 7. Toda função security definer tem search_path fixo.
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      p.proconfig is null
      or not exists (
        select 1 from unnest(p.proconfig) as config
        where config like 'search_path=%'
      )
    );

  if v_count > 0 then
    raise exception '% função(ões) security definer sem search_path fixo', v_count;
  end if;

  raise notice 'OK: RLS deny-all, grants e invariantes do banco validados.';
end;
$$;

-- Em produção, confirme também que não há usuários fictícios:
-- select count(*) as dev_users from auth.users where email like 'dev-%@example.com';
-- Esperado: 0.
