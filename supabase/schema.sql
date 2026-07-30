-- ============================================================
-- KRONOS — Postgres schema (Supabase-ready)
-- Rode no SQL Editor do Supabase. RLS liga isolamento por usuário.
-- No MVP o app usa localStorage; este schema é o destino da migração.
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- SNAPSHOT NA NUVEM (modo usado pelo app em lib/cloud.ts)
-- Um documento JSON por usuário, protegido por RLS. É o caminho mais
-- rápido para "dados em qualquer máquina": o app faz upsert do estado
-- inteiro e lê no login. As tabelas normalizadas abaixo ficam prontas
-- para quando você quiser migrar para consultas/relatórios no banco.
-- ----------------------------------------------------------------
create table if not exists public.kronos_snapshots (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.kronos_snapshots enable row level security;
drop policy if exists "snapshot_owner" on public.kronos_snapshots;
create policy "snapshot_owner" on public.kronos_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- USERS (perfil do negócio). Auth real via Supabase Auth (auth.users).
-- id referencia auth.uid() quando migrar.
-- ----------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  nome_negocio  text not null,
  documento     text not null,                 -- CPF ou CNPJ
  perfil        text not null default 'pf'     check (perfil in ('pf','pj','pequena','empresa')),
  regime        text not null default 'mei'    check (regime in ('mei','simples','presumido','real')),
  renda_mensal_centavos bigint not null default 0,  -- renda (PF) ou faturamento (PJ) mensal
  plano         text not null default 'free'   check (plano in ('free','pro','business')),
  logo_url      text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- CLIENTES
-- ----------------------------------------------------------------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  nome        text not null,
  cpf_cnpj    text,
  telefone    text,
  email       text,
  endereco    text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- CATEGORIAS (receita/despesa)
-- ----------------------------------------------------------------
create table if not exists public.categorias (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.users(id) on delete cascade,
  tipo     text not null check (tipo in ('receita','despesa')),
  nome     text not null,
  cor      text not null default '#2E86E6'
);

-- ----------------------------------------------------------------
-- TRANSACOES
-- ----------------------------------------------------------------
create table if not exists public.transacoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  tipo            text not null check (tipo in ('receita','despesa')),
  descricao       text not null,
  valor_centavos  bigint not null check (valor_centavos >= 0),
  data            date not null,
  categoria       text not null,
  cliente_id      uuid references public.clientes(id) on delete set null,
  recorrencia     text not null default 'unico' check (recorrencia in ('unico','mensal')),
  comprovante_url text,
  status          text not null default 'pago' check (status in ('pago','pendente')),
  tags            text[] not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists idx_transacoes_user_data on public.transacoes(user_id, data desc);

-- ----------------------------------------------------------------
-- NOTAS FISCAIS / RECIBOS
-- ----------------------------------------------------------------
create table if not exists public.notas_fiscais (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  numero            text not null,
  tipo              text not null default 'recibo' check (tipo in ('recibo','nfse')),
  data_emissao      date not null,
  cliente_nome      text not null,
  cliente_documento text,
  itens             jsonb not null default '[]',
  valor_centavos    bigint not null,
  iss_centavos      bigint not null default 0,
  irrf_centavos     bigint not null default 0,
  assinado_em       timestamptz,
  assinatura_ip     text,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- IMPOSTOS
-- ----------------------------------------------------------------
create table if not exists public.impostos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  tipo            text not null check (tipo in ('das','irpf','simples','irrf')),
  periodo         text not null,
  valor_centavos  bigint not null,
  vencimento      date not null,
  data_pagamento  date,
  status          text not null default 'pendente' check (status in ('pago','pendente')),
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- SIMULACOES
-- ----------------------------------------------------------------
create table if not exists public.simulacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  nome        text not null,
  tipo        text not null check (tipo in ('breakeven','cenario','viabilidade','investimento')),
  parametros  jsonb not null default '{}',
  resultado   jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- ANÁLISES AVANÇADAS (resultado persistido / histórico)
-- ----------------------------------------------------------------
create table if not exists public.analises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  tipo          text not null check (tipo in
                  ('previsao','benchmarking','estilo_vida','capital_giro','fuga',
                   'preco','mix','roi','variance','decisao','vies')),
  resultado     jsonb not null default '{}',
  recomendacoes text[] not null default '{}',
  criado_em     timestamptz not null default now()
);
create index if not exists idx_analises_user_tipo on public.analises(user_id, tipo, criado_em desc);

-- ----------------------------------------------------------------
-- DESPESAS PESSOAIS DO DONO (análise de estilo de vida)
-- ----------------------------------------------------------------
create table if not exists public.despesas_pessoais (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  categoria      text not null,
  valor_centavos bigint not null check (valor_centavos >= 0),
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- CENÁRIOS SALVOS (simulador estratégico)
-- ----------------------------------------------------------------
create table if not exists public.cenarios (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  nome               text not null,
  ajustes            jsonb not null default '[]',
  receita_base       bigint not null default 0,
  despesa_base       bigint not null default 0,
  receita_projetada  bigint not null default 0,
  despesa_projetada  bigint not null default 0,
  lucro_projetado    bigint not null default 0,
  created_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- DÍVIDAS (central de desendividamento — PF, PJ, pequena empresa, empresa)
-- ----------------------------------------------------------------
create table if not exists public.dividas (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.users(id) on delete cascade,
  credor                 text not null,
  tipo                   text not null check (tipo in
                           ('cartao','cheque_especial','emprestimo','consignado','financiamento',
                            'crediario','capital_giro','antecipacao','fornecedor','imposto',
                            'estruturada','outro')),
  saldo_devedor_centavos bigint not null check (saldo_devedor_centavos >= 0),
  taxa_am                numeric(6,3) not null default 0,   -- juros ao mês (%)
  parcela_centavos       bigint not null default 0,         -- 0 = rotativo
  parcelas_total         int not null default 0,
  parcelas_pagas         int not null default 0,
  vencimento_dia         int not null default 10 check (vencimento_dia between 1 and 28),
  garantia               text,
  status                 text not null default 'em_dia' check (status in ('em_dia','atrasada','renegociada','quitada')),
  created_at             timestamptz not null default now()
);
create index if not exists idx_dividas_user on public.dividas(user_id, status);

-- ============================================================
-- ROW LEVEL SECURITY — cada usuário só vê seus dados
-- ============================================================
alter table public.users             enable row level security;
alter table public.clientes          enable row level security;
alter table public.categorias        enable row level security;
alter table public.transacoes        enable row level security;
alter table public.notas_fiscais     enable row level security;
alter table public.impostos          enable row level security;
alter table public.simulacoes        enable row level security;
alter table public.analises          enable row level security;
alter table public.despesas_pessoais enable row level security;
alter table public.cenarios          enable row level security;
alter table public.dividas           enable row level security;

-- Perfil próprio
create policy "users_self" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Tabelas com user_id: dono acessa tudo
do $$
declare t text;
begin
  foreach t in array array['clientes','categorias','transacoes','notas_fiscais','impostos','simulacoes','analises','despesas_pessoais','cenarios','dividas']
  loop
    execute format($f$
      create policy "%1$s_owner" on public.%1$s
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- SEED de categorias padrão ao criar usuário (trigger opcional)
-- ============================================================
create or replace function public.seed_categorias()
returns trigger language plpgsql security definer as $$
begin
  insert into public.categorias (user_id, tipo, nome, cor) values
    (new.id, 'receita', 'Cabelo',    '#2E86E6'),
    (new.id, 'receita', 'Barba',     '#C9A24B'),
    (new.id, 'receita', 'Produto',   '#22C55E'),
    (new.id, 'despesa', 'Aluguel',   '#22C55E'),
    (new.id, 'despesa', 'Insumos',   '#2E86E6'),
    (new.id, 'despesa', 'Funcionário','#C9A24B'),
    (new.id, 'despesa', 'Energia',   '#8B5CF6');
  return new;
end $$;

drop trigger if exists trg_seed_categorias on public.users;
create trigger trg_seed_categorias
  after insert on public.users
  for each row execute function public.seed_categorias();
