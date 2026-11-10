-- Prospector: extração pedida pela web e executada pelo app do computador.
-- A web grava um pedido; o Prospector aberto no PC pega, extrai e devolve o resultado.
-- Migration "prospector_comandos_remotos" do projeto growplus-shop (só tabelas prospector_*).

create table public.prospector_comandos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.prospector_empresas(id) on delete cascade,
  tipo text not null default 'extrair' check (tipo in ('extrair')),
  texto text not null default '' check (char_length(texto) <= 300),
  pedido jsonb not null default '{}'::jsonb
    check (jsonb_typeof(pedido) = 'object' and char_length(pedido::text) <= 20000),
  status text not null default 'pendente'
    check (status in ('pendente', 'rodando', 'concluido', 'erro', 'cancelado')),
  cancelar boolean not null default false,
  progresso smallint not null default 0 check (progresso between 0 and 100),
  resultado jsonb,
  pc_id text,
  pc_nome text,
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);
create index prospector_comandos_empresa_idx on public.prospector_comandos (empresa_id, criado_em desc);

-- Computadores com o Prospector aberto (batida a cada poucos segundos).
create table public.prospector_computadores (
  empresa_id uuid not null references public.prospector_empresas(id) on delete cascade,
  pc_id text not null check (char_length(pc_id) between 6 and 64),
  nome text not null default '',
  ocupado boolean not null default false,
  visto_em timestamptz not null default now(),
  primary key (empresa_id, pc_id)
);

alter table public.prospector_comandos enable row level security;
alter table public.prospector_computadores enable row level security;

create policy "membro ve os comandos" on public.prospector_comandos
  for select to authenticated using (public.prospector_sou_membro(empresa_id));
create policy "membro cria comando" on public.prospector_comandos
  for insert to authenticated
  with check (public.prospector_sou_membro(empresa_id) and criado_por = (select auth.uid()) and status = 'pendente');
create policy "membro atualiza comando" on public.prospector_comandos
  for update to authenticated
  using (public.prospector_sou_membro(empresa_id))
  with check (public.prospector_sou_membro(empresa_id));
create policy "membro ve os computadores" on public.prospector_computadores
  for select to authenticated using (public.prospector_sou_membro(empresa_id));

-- O PC bate aqui: marca presença, e se estiver livre pega o pedido mais antigo.
create or replace function public.prospector_comando_pegar(
  p_empresa uuid, p_pc text, p_nome text, p_livre boolean, p_progresso integer default null
) returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  v_cmd jsonb;
  v_cancelar jsonb;
begin
  if auth.uid() is null then raise exception 'Entre com seu login primeiro.'; end if;
  if not public.prospector_sou_membro(p_empresa) then raise exception 'Você não faz parte desta empresa.'; end if;
  if char_length(coalesce(p_pc, '')) not between 6 and 64 then raise exception 'Computador inválido.'; end if;

  insert into public.prospector_computadores (empresa_id, pc_id, nome, ocupado, visto_em)
    values (p_empresa, p_pc, left(coalesce(p_nome, ''), 80), not coalesce(p_livre, false), now())
    on conflict (empresa_id, pc_id) do update
      set nome = excluded.nome, ocupado = excluded.ocupado, visto_em = now();

  if p_progresso is not null then
    update public.prospector_comandos
      set progresso = greatest(0, least(100, p_progresso))
      where empresa_id = p_empresa and pc_id = p_pc and status = 'rodando';
  end if;

  if coalesce(p_livre, false) then
    -- Pedido que este PC deixou pela metade (o app foi fechado no meio).
    update public.prospector_comandos
      set status = 'erro', concluido_em = now(),
          resultado = jsonb_build_object('erro', 'O Prospector do computador foi fechado no meio da extração.')
      where empresa_id = p_empresa and pc_id = p_pc and status = 'rodando';
    -- Pedido parado há mais de 2 dias não roda de surpresa.
    update public.prospector_comandos
      set status = 'cancelado', concluido_em = now(),
          resultado = jsonb_build_object('erro', 'O pedido ficou mais de 2 dias sem um computador ligado.')
      where empresa_id = p_empresa and status = 'pendente' and criado_em < now() - interval '2 days';
    delete from public.prospector_comandos
      where empresa_id = p_empresa and status in ('concluido', 'erro', 'cancelado')
        and criado_em < now() - interval '30 days';

    update public.prospector_comandos c
      set status = 'rodando', pc_id = p_pc, pc_nome = left(coalesce(p_nome, ''), 80), iniciado_em = now(), progresso = 0
      where c.id = (
        select x.id from public.prospector_comandos x
        where x.empresa_id = p_empresa and x.status = 'pendente' and not x.cancelar
        order by x.criado_em
        limit 1
        for update skip locked
      )
      returning to_jsonb(c) into v_cmd;
    if v_cmd is not null then
      update public.prospector_computadores set ocupado = true where empresa_id = p_empresa and pc_id = p_pc;
    end if;
  end if;

  select coalesce(jsonb_agg(c.id), '[]'::jsonb) into v_cancelar
    from public.prospector_comandos c
    where c.empresa_id = p_empresa and c.pc_id = p_pc and c.status = 'rodando' and c.cancelar;

  return jsonb_build_object('comando', v_cmd, 'cancelar', v_cancelar);
end;
$$;

-- O PC encerra o pedido (ou devolve para a fila, com p_status = 'pendente').
create or replace function public.prospector_comando_concluir(
  p_id uuid, p_status text, p_resultado jsonb default null
) returns boolean
language plpgsql security definer set search_path to ''
as $$
declare
  v_empresa uuid;
begin
  if auth.uid() is null then raise exception 'Entre com seu login primeiro.'; end if;
  select empresa_id into v_empresa from public.prospector_comandos where id = p_id;
  if v_empresa is null or not public.prospector_sou_membro(v_empresa) then
    raise exception 'Pedido não encontrado.';
  end if;
  if p_status not in ('concluido', 'erro', 'cancelado', 'pendente') then raise exception 'Estado inválido.'; end if;
  if p_status = 'pendente' then
    update public.prospector_comandos
      set status = 'pendente', pc_id = null, pc_nome = null, iniciado_em = null, progresso = 0
      where id = p_id and status = 'rodando';
  else
    update public.prospector_comandos
      set status = p_status, resultado = p_resultado, concluido_em = now(),
          progresso = case when p_status = 'concluido' then 100 else progresso end
      where id = p_id and status = 'rodando';
  end if;
  return found;
end;
$$;

-- A web lê aqui: pedidos recentes e computadores, com "ligado" calculado no
-- relógio do servidor (o do navegador pode estar errado).
create or replace function public.prospector_comandos_estado(p_empresa uuid)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  v_pcs jsonb;
  v_cmds jsonb;
begin
  if auth.uid() is null then raise exception 'Entre com seu login primeiro.'; end if;
  if not public.prospector_sou_membro(p_empresa) then raise exception 'Você não faz parte desta empresa.'; end if;

  -- Extração em andamento num PC que sumiu: não fica "rodando" para sempre.
  update public.prospector_comandos c
    set status = 'erro', concluido_em = now(),
        resultado = jsonb_build_object('erro', 'O computador desligou ou perdeu a internet no meio da extração.')
    where c.empresa_id = p_empresa and c.status = 'rodando'
      and not exists (
        select 1 from public.prospector_computadores p
        where p.empresa_id = c.empresa_id and p.pc_id = c.pc_id and p.visto_em > now() - interval '3 minutes'
      );

  select coalesce(jsonb_agg(jsonb_build_object(
      'pc_id', p.pc_id, 'nome', p.nome, 'ocupado', p.ocupado, 'visto_em', p.visto_em,
      'ligado', p.visto_em > now() - interval '45 seconds') order by p.visto_em desc), '[]'::jsonb)
    into v_pcs
    from public.prospector_computadores p where p.empresa_id = p_empresa;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.criado_em desc), '[]'::jsonb) into v_cmds
    from (
      select c.id, c.texto, c.pedido, c.status, c.cancelar, c.progresso, c.resultado, c.pc_nome,
             c.criado_por, c.criado_em, c.iniciado_em, c.concluido_em
      from public.prospector_comandos c
      where c.empresa_id = p_empresa
      order by c.criado_em desc
      limit 10
    ) x;

  return jsonb_build_object('agora', now(), 'computadores', v_pcs, 'comandos', v_cmds);
end;
$$;

revoke all on function public.prospector_comando_pegar(uuid, text, text, boolean, integer) from public, anon;
revoke all on function public.prospector_comando_concluir(uuid, text, jsonb) from public, anon;
revoke all on function public.prospector_comandos_estado(uuid) from public, anon;
grant execute on function public.prospector_comando_pegar(uuid, text, text, boolean, integer) to authenticated;
grant execute on function public.prospector_comando_concluir(uuid, text, jsonb) to authenticated;
grant execute on function public.prospector_comandos_estado(uuid) to authenticated;

-- Migration "prospector_comandos_permissoes": este projeto não dá permissão
-- automática em tabela nova, então libera só o que a web usa.
revoke all on public.prospector_comandos from anon, authenticated;
revoke all on public.prospector_computadores from anon, authenticated;
grant select on public.prospector_comandos to authenticated;
grant insert (empresa_id, tipo, texto, pedido, criado_por) on public.prospector_comandos to authenticated;
-- A web só cancela: tira da fila ou avisa o computador para parar.
grant update (status, cancelar, concluido_em, resultado) on public.prospector_comandos to authenticated;
grant select on public.prospector_computadores to authenticated;
