-- Catálogo fixo de níveis e assuntos (prd.md §3, pod.md §4).

insert into public.levels (id, slug, name_pt, sort_order)
values
  (1, 'facil', 'Fácil', 1),
  (2, 'basico', 'Média', 2),
  (3, 'intermediario', 'Desafiadora', 3),
  (4, 'avancado', 'Difícil', 4),
  (5, 'especialista', 'Expert', 5)
on conflict (id) do update
set slug = excluded.slug,
    name_pt = excluded.name_pt,
    sort_order = excluded.sort_order;

insert into public.subjects (id, slug, name_pt, sort_order)
values
  (1, 'fundamentos', 'Fundamentos OpenCode e CLI', 1),
  (2, 'configuracao', 'Features e Produtividade', 2),
  (3, 'fluxo', 'Boas práticas de uso', 3)
on conflict (id) do update
set slug = excluded.slug,
    name_pt = excluded.name_pt,
    sort_order = excluded.sort_order;
