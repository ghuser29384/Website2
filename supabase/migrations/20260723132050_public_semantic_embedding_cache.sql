-- Public-only semantic cache for the reciprocal opportunity feed.
-- Private profile prose is never written here or sent to the embedding provider.
create table if not exists public.public_semantic_embeddings (
  content_hash text not null,
  model text not null,
  dimensions integer not null check (dimensions between 8 and 4096),
  embedding jsonb not null check (jsonb_typeof(embedding) = 'array'),
  public_text text not null check (char_length(public_text) between 1 and 2400),
  source_kind text not null check (source_kind in ('canonical', 'opportunity')),
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_hash, model)
);

comment on table public.public_semantic_embeddings is
  'Server-only cache for embeddings of public opportunity text and fixed public canonical concepts. Never store private profile prose.';
comment on column public.public_semantic_embeddings.public_text is
  'Public listing text or a fixed canonical concept description; never participant-private text.';

create index if not exists public_semantic_embeddings_source_idx
  on public.public_semantic_embeddings (source_kind, source_id);
create index if not exists public_semantic_embeddings_updated_idx
  on public.public_semantic_embeddings (updated_at desc);

alter table public.public_semantic_embeddings enable row level security;
revoke all on table public.public_semantic_embeddings from anon, authenticated;
grant all on table public.public_semantic_embeddings to service_role;
