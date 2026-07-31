begin;

create table if not exists public.sommelier_knowledge (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  title text not null,
  content text not null,
  source_type text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    alter table public.sommelier_knowledge
      add column if not exists embedding vector(1536);
  end if;
end $$;

create table if not exists public.sommelier_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.sommelier_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sommelier_sessions(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  model text,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.sommelier_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  usage_date date not null,
  interaction_count integer not null default 0 check (interaction_count >= 0),
  token_count integer not null default 0 check (token_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, customer_id, usage_date)
);

create table if not exists public.sommelier_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.sommelier_messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating integer check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sommelier_knowledge_namespace on public.sommelier_knowledge(namespace);
create index if not exists idx_sommelier_knowledge_active on public.sommelier_knowledge(active);
create index if not exists idx_sommelier_sessions_user_id on public.sommelier_sessions(user_id);
create index if not exists idx_sommelier_sessions_customer_id on public.sommelier_sessions(customer_id);
create index if not exists idx_sommelier_messages_session_id on public.sommelier_messages(session_id);
create index if not exists idx_sommelier_usage_customer_date on public.sommelier_usage(customer_id, usage_date);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    create index if not exists idx_sommelier_knowledge_embedding
      on public.sommelier_knowledge using ivfflat (embedding vector_cosine_ops)
      with (lists = 64);
  end if;
end $$;

commit;
