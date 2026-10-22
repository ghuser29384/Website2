import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
export function syntheticSchema(app){
const migration = readFileSync(app + '/supabase/migrations/20260722223000_harden_trade_invitations.sql', 'utf8');
const schema = readFileSync(app + '/supabase/schema.sql', 'utf8');
const names = ['moral_trade_private.invitation_status_is_usable', 'public.claim_email_outbox_v2', 'public.complete_email_outbox_v2', 'public.retry_email_outbox_v2', 'public.suppress_email_outbox_v2'];
const functions = names.map(name => {
  const start = migration.indexOf('create or replace function ' + name + '('); assert.ok(start >= 0);
  const end = migration.indexOf('\n$$;', start); assert.ok(end > start);
  return migration.slice(start, end + 4);
});
return `create role service_role nologin bypassrls; create schema moral_trade_private;
create table public.profiles(id uuid primary key);
create table public.trade_invitations(id uuid primary key,status text,expires_at timestamptz);
${schema.match(/create table if not exists public\.email_outbox \([\s\S]*?\n\);/)[0]}
alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check check(status in ('queued','processing','retry','sent','failed','suppressed'));
alter table public.email_outbox add column available_at timestamptz default now(), add column locked_at timestamptz, add column lock_token uuid, add column idempotency_key text, add column provider_message_id text, add column suppressed_at timestamptz;
${functions.join('\n')}
revoke all on function public.claim_email_outbox_v2(uuid,integer),public.complete_email_outbox_v2(uuid,uuid,text),public.retry_email_outbox_v2(uuid,uuid,text),public.suppress_email_outbox_v2(uuid,uuid,text) from public;
grant execute on function public.claim_email_outbox_v2(uuid,integer),public.complete_email_outbox_v2(uuid,uuid,text),public.retry_email_outbox_v2(uuid,uuid,text),public.suppress_email_outbox_v2(uuid,uuid,text) to service_role;
alter table public.email_outbox enable row level security;`;
}
