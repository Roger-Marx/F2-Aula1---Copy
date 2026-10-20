-- RLS deny-all + privilégios mínimos (pod.md §5, D56).
-- O cliente nunca lê tabelas diretamente; só executa as RPCs listadas abaixo.

alter table public.levels enable row level security;
alter table public.subjects enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.profiles enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.session_options enable row level security;
alter table public.question_views enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Público (ranking e checagem de apelido no cadastro).
grant execute on function public.rpc_public_ranking() to anon, authenticated;
grant execute on function public.rpc_check_nickname(text) to anon, authenticated;

-- Autenticado.
grant execute on function public.rpc_my_profile() to authenticated;
grant execute on function public.rpc_start_session() to authenticated;
grant execute on function public.rpc_submit_answer(uuid, text) to authenticated;
grant execute on function public.rpc_advance() to authenticated;
grant execute on function public.rpc_get_summary(uuid) to authenticated;
