-- Phase 1B: additive external-payment review, correction, appeal, and
-- agreement-completion lifecycle.
--
-- Moral Trade remains noncustodial. These records establish whether an
-- already-frozen amount was paid outside the platform; they never authorize
-- capture, transfer, release, refund, or custody.

alter table public.trade_milestone_payouts
  drop constraint if exists trade_milestone_payouts_status_check;
alter table public.trade_milestone_payouts
  add constraint trade_milestone_payouts_status_check check (status in (
    'provisional',
    'not_due',
    'due',
    'reported_paid',
    'payment_review_pending',
    'correction_due',
    'corrected_reported',
    'payment_decision_pending',
    'payment_appeal_pending',
    'confirmed',
    'adjudicated_paid',
    'still_due'
  ));

alter table public.trade_external_payment_receipts
  drop constraint if exists trade_external_payment_receipts_payout_id_key;
alter table public.trade_external_payment_receipts
  add column if not exists payment_cycle integer not null default 1,
  add column if not exists attempt_number smallint not null default 1,
  add column if not exists receipt_kind text not null default 'initial',
  add column if not exists supersedes_receipt_id uuid,
  add column if not exists response_deadline_at timestamptz,
  add column if not exists response_outcome text not null default 'none',
  add column if not exists updated_at timestamptz not null default now();

update public.trade_external_payment_receipts
set payment_cycle = 1,
    attempt_number = 1,
    receipt_kind = 'initial',
    response_deadline_at = coalesce(
      response_deadline_at,
      reported_at + interval '7 days'
    ),
    response_outcome = case status
      when 'confirmed' then 'confirmed'
      when 'disputed' then 'disputed'
      else 'none'
    end
where response_deadline_at is null
   or payment_cycle <> 1
   or receipt_kind <> 'initial'
   or attempt_number <> 1
   or response_outcome = 'none';

alter table public.trade_external_payment_receipts
  alter column response_deadline_at set default (now() + interval '7 days');
alter table public.trade_external_payment_receipts
  alter column response_deadline_at set not null;

alter table public.trade_external_payment_receipts
  drop constraint if exists trade_external_payment_receipts_status_check;
alter table public.trade_external_payment_receipts
  add constraint trade_external_payment_receipts_status_check check (status in (
    'reported',
    'confirmed',
    'under_review',
    'correction_requested',
    'superseded',
    'adjudicated_paid',
    'adjudicated_still_due'
  ));
alter table public.trade_external_payment_receipts
  drop constraint if exists trade_external_payment_receipts_attempt_check;
alter table public.trade_external_payment_receipts
  add constraint trade_external_payment_receipts_attempt_check check (
    payment_cycle >= 1
    and (
    (attempt_number = 1 and receipt_kind = 'initial'
      and supersedes_receipt_id is null)
    or
    (attempt_number = 2 and receipt_kind = 'correction'
      and supersedes_receipt_id is not null)
    )
  );
alter table public.trade_external_payment_receipts
  drop constraint if exists trade_external_payment_receipts_response_outcome_check;
alter table public.trade_external_payment_receipts
  add constraint trade_external_payment_receipts_response_outcome_check check (
    response_outcome in ('none', 'confirmed', 'disputed', 'unanswered')
  );
alter table public.trade_external_payment_receipts
  drop constraint if exists trade_external_payment_receipts_supersedes_fkey;
alter table public.trade_external_payment_receipts
  add constraint trade_external_payment_receipts_supersedes_fkey
  foreign key (supersedes_receipt_id)
  references public.trade_external_payment_receipts(id)
  on delete restrict;

create unique index if not exists trade_external_payment_receipts_cycle_attempt_uidx
  on public.trade_external_payment_receipts(
    payout_id, payment_cycle, attempt_number
  );
create unique index if not exists trade_external_payment_receipts_supersedes_uidx
  on public.trade_external_payment_receipts(supersedes_receipt_id)
  where supersedes_receipt_id is not null;

create table if not exists public.trade_payment_review_cases (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null
    references public.trade_milestone_payouts(id) on delete cascade,
  payment_cycle integer not null check (payment_cycle >= 1),
  initial_receipt_id uuid not null unique
    references public.trade_external_payment_receipts(id) on delete restrict,
  corrected_receipt_id uuid unique
    references public.trade_external_payment_receipts(id) on delete restrict,
  assigned_reviewer_id uuid
    references public.profiles(id) on delete set null,
  final_decision_id uuid,
  status text not null default 'reviewer_selection' check (status in (
    'reviewer_selection',
    'assigned',
    'correction_due',
    'corrected_response',
    'final_review',
    'decision_pending',
    'appeal_pending',
    'resolved'
  )),
  reviewer_selection_opened_at timestamptz not null,
  reviewer_selection_deadline_at timestamptz not null,
  correction_permitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_payment_review_cases_correction_check check (
    (corrected_receipt_id is null)
    or (correction_permitted_at is not null)
  ),
  unique (payout_id, payment_cycle)
);

create index if not exists trade_payment_review_cases_reviewer_idx
  on public.trade_payment_review_cases(assigned_reviewer_id, status)
  where assigned_reviewer_id is not null;

create table if not exists public.trade_payment_reviewer_nominations (
  case_id uuid not null
    references public.trade_payment_review_cases(id) on delete cascade,
  nominated_by uuid not null
    references public.profiles(id) on delete cascade,
  reviewer_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (case_id, nominated_by)
);

create index if not exists trade_payment_reviewer_nominations_reviewer_idx
  on public.trade_payment_reviewer_nominations(reviewer_id);

create table if not exists public.trade_payment_review_decisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null
    references public.trade_payment_review_cases(id) on delete cascade,
  receipt_id uuid not null
    references public.trade_external_payment_receipts(id) on delete restrict,
  reviewer_id uuid not null
    references public.profiles(id) on delete restrict,
  decision_kind text not null check (
    decision_kind in ('initial', 'final', 'appeal')
  ),
  base_decision_id uuid
    references public.trade_payment_review_decisions(id) on delete restrict,
  outcome text not null check (
    outcome in ('confirm_paid', 'still_due', 'allow_correction')
  ),
  private_reason text not null check (
    length(btrim(private_reason)) between 1 and 4000
  ),
  appeal_deadline_at timestamptz,
  is_final boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trade_payment_review_decisions_kind_check check (
    (decision_kind = 'appeal' and base_decision_id is not null)
    or (decision_kind <> 'appeal' and base_decision_id is null)
  ),
  constraint trade_payment_review_decisions_correction_check check (
    (
      outcome = 'allow_correction'
      and decision_kind = 'initial'
      and appeal_deadline_at is null
      and not is_final
      and finalized_at is null
    )
    or outcome <> 'allow_correction'
  ),
  constraint trade_payment_review_decisions_finality_check check (
    (is_final and finalized_at is not null)
    or (not is_final and finalized_at is null)
  )
);

create unique index if not exists trade_payment_review_decisions_initial_uidx
  on public.trade_payment_review_decisions(case_id)
  where decision_kind = 'initial';
create unique index if not exists trade_payment_review_decisions_final_uidx
  on public.trade_payment_review_decisions(case_id)
  where decision_kind = 'final';
create unique index if not exists trade_payment_review_decisions_appeal_uidx
  on public.trade_payment_review_decisions(case_id)
  where decision_kind = 'appeal';
create index if not exists trade_payment_review_decisions_reviewer_idx
  on public.trade_payment_review_decisions(reviewer_id, created_at desc);

alter table public.trade_payment_review_cases
  drop constraint if exists trade_payment_review_cases_final_decision_fkey;
alter table public.trade_payment_review_cases
  add constraint trade_payment_review_cases_final_decision_fkey
  foreign key (final_decision_id)
  references public.trade_payment_review_decisions(id)
  on delete set null;

create table if not exists public.trade_payment_appeals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique
    references public.trade_payment_review_cases(id) on delete cascade,
  base_decision_id uuid not null unique
    references public.trade_payment_review_decisions(id) on delete restrict,
  opened_by uuid not null
    references public.profiles(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 4000),
  status text not null default 'reviewer_selection' check (
    status in ('reviewer_selection', 'assigned', 'resolved')
  ),
  assigned_reviewer_id uuid
    references public.profiles(id) on delete set null,
  reviewer_selection_deadline_at timestamptz not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint trade_payment_appeals_resolution_check check (
    (status = 'resolved' and resolved_at is not null)
    or (status <> 'resolved' and resolved_at is null)
  )
);

create index if not exists trade_payment_appeals_reviewer_idx
  on public.trade_payment_appeals(assigned_reviewer_id, status)
  where assigned_reviewer_id is not null;

create table if not exists public.trade_payment_appeal_reviewer_nominations (
  appeal_id uuid not null
    references public.trade_payment_appeals(id) on delete cascade,
  nominated_by uuid not null
    references public.profiles(id) on delete cascade,
  reviewer_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (appeal_id, nominated_by)
);

create index if not exists trade_payment_appeal_nominations_reviewer_idx
  on public.trade_payment_appeal_reviewer_nominations(reviewer_id);

create or replace function moral_trade_private.is_trade_agreement_milestone_complete(
  p_agreement_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    agreement.current_version_id is not null
    and agreement.lifecycle_status not in ('draft', 'proposed', 'cancelled', 'expired')
    and exists (
      select 1
      from public.trade_agreement_milestones milestone
      where milestone.agreement_id = agreement.id
        and milestone.agreement_version_id = agreement.current_version_id
        and milestone.status <> 'cancelled'
    )
    and not exists (
      select 1
      from public.trade_agreement_milestones milestone
      where milestone.agreement_id = agreement.id
        and milestone.agreement_version_id = agreement.current_version_id
        and milestone.status <> 'cancelled'
        and (
          milestone.final_review_id is null
          or milestone.status not in ('graded', 'paid')
          or not exists (
            select 1
            from public.trade_milestone_payouts payout
            where payout.milestone_id = milestone.id
              and payout.is_final
              and payout.status in (
                'not_due', 'confirmed', 'adjudicated_paid'
              )
          )
        )
    )
  from public.agreements agreement
  where agreement.id = p_agreement_id;
$function$;

create or replace function moral_trade_private.recompute_trade_agreement_completion(
  p_agreement_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  agreement_row public.agreements%rowtype;
begin
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = p_agreement_id
  for update;

  if not found
     or agreement_row.lifecycle_status in ('draft', 'proposed', 'cancelled', 'expired')
     or not moral_trade_private.is_trade_agreement_milestone_complete(
       agreement_row.id
     ) then
    return false;
  end if;

  update public.agreements
  set lifecycle_status = 'completed',
      status = 'completed',
      completion_state = 'reviewed_complete',
      completed_at = coalesce(completed_at, now()),
      future_obligations_paused_at = null,
      future_obligations_pause_reason = '',
      updated_at = now()
  where id = agreement_row.id
    and lifecycle_status <> 'completed';

  return true;
end;
$function$;

create or replace function moral_trade_private.recompute_trade_completion_from_payout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  agreement_id_value uuid;
begin
  select milestone.agreement_id
  into agreement_id_value
  from public.trade_agreement_milestones milestone
  where milestone.id = new.milestone_id;

  if agreement_id_value is not null then
    perform moral_trade_private.recompute_trade_agreement_completion(
      agreement_id_value
    );
  end if;
  return new;
end;
$function$;

create or replace function moral_trade_private.recompute_trade_completion_from_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.recompute_trade_agreement_completion(
    new.agreement_id
  );
  return new;
end;
$function$;

drop trigger if exists recompute_trade_completion_from_payout
  on public.trade_milestone_payouts;
create trigger recompute_trade_completion_from_payout
after insert or update of status, is_final
on public.trade_milestone_payouts
for each row
execute function moral_trade_private.recompute_trade_completion_from_payout();

drop trigger if exists recompute_trade_completion_from_milestone
  on public.trade_agreement_milestones;
create trigger recompute_trade_completion_from_milestone
after update of status, final_review_id
on public.trade_agreement_milestones
for each row
execute function moral_trade_private.recompute_trade_completion_from_milestone();

-- Preserve the legacy two-party confirmation rule for legacy agreements while
-- permitting the approved mechanical completion rule for milestone agreements.
create or replace function public.guard_core_agreement_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_workflow_status text;
  confirmation_count integer;
  completion_count integer;
  authorized_exit_count integer;
begin
  select offer.workflow_status
  into offer_workflow_status
  from public.offers offer
  where offer.id = new.offer_id;

  if offer_workflow_status <> 'published' and old.current_version_id is null then
    return new;
  end if;

  if (
    (new.status::text = 'active' and old.status::text <> 'active')
    or
    (new.lifecycle_status = 'active' and old.lifecycle_status <> 'active')
  ) then
    if new.current_version_id is null then
      raise exception 'A frozen agreement version is required before activation.';
    end if;

    select count(*)
    into confirmation_count
    from public.trade_agreement_confirmations confirmation
    where confirmation.agreement_version_id = new.current_version_id
      and confirmation.user_id in (new.proposer_id, new.responder_id);

    if confirmation_count < 2 then
      raise exception 'Both participants must confirm the same frozen agreement version before activation.';
    end if;
  end if;

  if (
    (new.status::text = 'completed' and old.status::text <> 'completed')
    or
    (new.lifecycle_status = 'completed' and old.lifecycle_status <> 'completed')
  ) and not moral_trade_private.is_trade_agreement_milestone_complete(new.id) then
    select count(*)
    into completion_count
    from public.trade_completion_confirmations confirmation
    where confirmation.agreement_id = new.id
      and confirmation.user_id in (new.proposer_id, new.responder_id);

    if completion_count < 2 then
      raise exception 'Completion requires final milestone grading and payment or both participant confirmations.';
    end if;
  end if;

  if (
    (new.status::text = 'cancelled' and old.status::text <> 'cancelled')
    or
    (new.lifecycle_status = 'cancelled' and old.lifecycle_status <> 'cancelled')
  ) and old.lifecycle_status in (
    'active', 'evidence_due', 'disputed', 'confirmed'
  ) then
    select count(*)
    into authorized_exit_count
    from public.trade_exit_requests request
    where request.agreement_id = new.id
      and request.status in ('accepted', 'executed');

    if authorized_exit_count < 1 then
      raise exception 'Active agreements may be cancelled only through an accepted mutual cancellation or an executed unilateral exit.';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function moral_trade_private.ensure_trade_payment_review_case(
  p_payout_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  payout_row public.trade_milestone_payouts%rowtype;
  receipt_row public.trade_external_payment_receipts%rowtype;
  existing_case public.trade_payment_review_cases%rowtype;
  opened_at_value timestamptz;
  case_id_value uuid;
begin
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
  for update;

  select *
  into existing_case
  from public.trade_payment_review_cases review_case
  where review_case.payout_id = p_payout_id
    and review_case.status <> 'resolved'
  order by review_case.payment_cycle desc
  limit 1
  for update;
  if found then
    return existing_case.id;
  end if;

  select *
  into receipt_row
  from public.trade_external_payment_receipts receipt
  where receipt.payout_id = p_payout_id
    and receipt.attempt_number = 1
    and not exists (
      select 1
      from public.trade_payment_review_cases prior_case
      where prior_case.initial_receipt_id = receipt.id
    )
  order by receipt.payment_cycle desc
  limit 1
  for update;

  if payout_row.id is null
     or receipt_row.id is null
     or not (
       receipt_row.response_outcome = 'disputed'
       or (
         receipt_row.status = 'reported'
         and receipt_row.response_outcome = 'none'
         and receipt_row.response_deadline_at <= now()
       )
     ) then
    raise exception 'Neutral payment review is unavailable before a dispute or unanswered deadline.';
  end if;

  if receipt_row.response_outcome = 'none' then
    update public.trade_external_payment_receipts
    set status = 'under_review',
        response_outcome = 'unanswered',
        responded_at = coalesce(responded_at, response_deadline_at),
        updated_at = now()
    where id = receipt_row.id;
    opened_at_value := receipt_row.response_deadline_at;
  else
    update public.trade_external_payment_receipts
    set status = 'under_review',
        updated_at = now()
    where id = receipt_row.id;
    opened_at_value := coalesce(receipt_row.responded_at, now());
  end if;

  insert into public.trade_payment_review_cases (
    payout_id,
    payment_cycle,
    initial_receipt_id,
    reviewer_selection_opened_at,
    reviewer_selection_deadline_at
  ) values (
    payout_row.id,
    receipt_row.payment_cycle,
    receipt_row.id,
    opened_at_value,
    opened_at_value + interval '7 days'
  )
  returning id into case_id_value;

  update public.trade_milestone_payouts
  set status = 'payment_review_pending',
      updated_at = now()
  where id = payout_row.id;

  return case_id_value;
end;
$function$;

create or replace function public.report_trade_external_payment_v1(
  p_payout_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount_cents bigint,
  p_currency text,
  p_paid_on date,
  p_receipt_storage_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  payout_row public.trade_milestone_payouts%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  prior_receipt public.trade_external_payment_receipts%rowtype;
  existing_receipt public.trade_external_payment_receipts%rowtype;
  normalized_provider text := btrim(coalesce(p_provider, ''));
  normalized_reference text := btrim(coalesce(p_provider_reference, ''));
  normalized_currency text := upper(btrim(coalesce(p_currency, '')));
  normalized_path text := btrim(coalesce(p_receipt_storage_path, ''));
  fingerprint text;
  payment_cycle_value integer;
  attempt_value smallint;
  receipt_kind_value text;
  receipt_id_value uuid;
begin
  fingerprint := encode(
    extensions.digest(
      convert_to(
        lower(normalized_provider) || chr(31) || normalized_reference,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
  for update;

  select *
  into existing_receipt
  from public.trade_external_payment_receipts receipt
  where receipt.payout_id = p_payout_id
    and receipt.reference_fingerprint = fingerprint
  order by receipt.payment_cycle desc, receipt.attempt_number desc
  limit 1
  for update;

  if found then
    if existing_receipt.reported_by = actor_id
       and existing_receipt.provider = normalized_provider
       and existing_receipt.amount_cents = p_amount_cents
       and existing_receipt.currency = normalized_currency
       and existing_receipt.paid_on = p_paid_on
       and existing_receipt.receipt_storage_path = normalized_path
       and payout_row.status not in ('due', 'still_due', 'correction_due') then
      return existing_receipt.id;
    end if;
    raise exception 'That external transaction reference has already been used.';
  end if;

  if payout_row.status in ('due', 'still_due') then
    select coalesce(max(receipt.payment_cycle), 0) + 1
    into payment_cycle_value
    from public.trade_external_payment_receipts receipt
    where receipt.payout_id = p_payout_id;
    attempt_value := 1;
    receipt_kind_value := 'initial';
  elsif payout_row.status = 'correction_due' then
    select *
    into review_case
    from public.trade_payment_review_cases candidate
    where candidate.payout_id = payout_row.id
      and candidate.status = 'correction_due'
    order by candidate.payment_cycle desc
    limit 1
    for update;
    select *
    into prior_receipt
    from public.trade_external_payment_receipts receipt
    where receipt.id = review_case.initial_receipt_id
    for update;
    payment_cycle_value := review_case.payment_cycle;
    attempt_value := 2;
    receipt_kind_value := 'correction';
  else
    attempt_value := null;
  end if;

  if attempt_value is not null then
    select *
    into existing_receipt
    from public.trade_external_payment_receipts receipt
    where receipt.payout_id = p_payout_id
      and receipt.payment_cycle = payment_cycle_value
      and receipt.attempt_number = attempt_value
    for update;

    if found then
      if existing_receipt.reported_by = actor_id
         and existing_receipt.provider = normalized_provider
         and existing_receipt.reference_fingerprint = fingerprint
         and existing_receipt.amount_cents = p_amount_cents
         and existing_receipt.currency = normalized_currency
         and existing_receipt.paid_on = p_paid_on
         and existing_receipt.receipt_storage_path = normalized_path then
        return existing_receipt.id;
      end if;
      raise exception 'A different external payment report already exists for this attempt.';
    end if;
  end if;

  if actor_id is null
     or payout_row.id is null
     or attempt_value is null
     or payout_row.payer_id <> actor_id
     or not payout_row.is_final
     or p_amount_cents <> payout_row.amount_due_cents
     or normalized_currency <> payout_row.currency
     or p_paid_on is null
     or p_paid_on < payout_row.finalized_at::date
     or p_paid_on > current_date
     or length(normalized_provider) not between 1 and 120
     or length(normalized_reference) not between 1 and 500
     or length(normalized_path) > 1000
     or (
       normalized_path <> ''
       and normalized_path not like actor_id::text || '/%'
     ) then
    raise exception 'External payment must exactly match the final private amount due.';
  end if;

  if attempt_value = 2 then
    if review_case.id is null
       or review_case.status <> 'correction_due'
       or review_case.correction_permitted_at is null
       or review_case.corrected_receipt_id is not null
       or prior_receipt.id is null then
      raise exception 'The single corrected receipt is unavailable.';
    end if;
  end if;

  insert into public.trade_external_payment_receipts (
    payout_id,
    reported_by,
    provider,
    provider_reference,
    reference_fingerprint,
    amount_cents,
    currency,
    paid_on,
    receipt_storage_path,
    payment_cycle,
    attempt_number,
    receipt_kind,
    supersedes_receipt_id,
    response_deadline_at
  ) values (
    payout_row.id,
    actor_id,
    normalized_provider,
    normalized_reference,
    fingerprint,
    p_amount_cents,
    normalized_currency,
    p_paid_on,
    normalized_path,
    payment_cycle_value,
    attempt_value,
    receipt_kind_value,
    case when attempt_value = 2 then prior_receipt.id else null end,
    now() + interval '7 days'
  )
  returning id into receipt_id_value;

  if attempt_value = 2 then
    update public.trade_external_payment_receipts
    set status = 'superseded',
        updated_at = now()
    where id = prior_receipt.id;

    update public.trade_payment_review_cases
    set corrected_receipt_id = receipt_id_value,
        status = 'corrected_response',
        updated_at = now()
    where id = review_case.id;
  end if;

  update public.trade_milestone_payouts
  set status = case
        when attempt_value = 1 then 'reported_paid'
        else 'corrected_reported'
      end,
      updated_at = now()
  where id = payout_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    payout_row.payee_id,
    case
      when attempt_value = 1 then 'external_payment_reported'
      else 'external_payment_corrected'
    end,
    case
      when attempt_value = 1 then 'External payment reported'
      else 'Corrected payment receipt reported'
    end,
    'Review the private receipt within seven days and confirm or dispute it.',
    '/trade-agreements/' || milestone.agreement_id::text,
    'external_payment_reported:' || receipt_id_value::text,
    now()
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  on conflict (dedupe_key) do nothing;

  return receipt_id_value;
end;
$function$;

create or replace function public.respond_trade_external_payment_v1(
  p_receipt_id uuid,
  p_response text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  receipt_row public.trade_external_payment_receipts%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  case_id_value uuid;
  normalized_note text := btrim(coalesce(p_note, ''));
begin
  select *
  into receipt_row
  from public.trade_external_payment_receipts receipt
  where receipt.id = p_receipt_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = receipt_row.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;

  if actor_id is null
     or receipt_row.id is null
     or payout_row.payee_id <> actor_id
     or receipt_row.status <> 'reported'
     or receipt_row.response_outcome <> 'none'
     or receipt_row.response_deadline_at <= now()
     or (
       receipt_row.attempt_number = 1
       and payout_row.status <> 'reported_paid'
     )
     or (
       receipt_row.attempt_number = 2
       and payout_row.status <> 'corrected_reported'
     )
     or p_response not in ('confirm', 'dispute')
     or length(normalized_note) > 2000
     or (p_response = 'dispute' and normalized_note = '') then
    raise exception 'This external payment response is unavailable.';
  end if;

  if p_response = 'confirm' then
    update public.trade_external_payment_receipts
    set status = 'confirmed',
        response_outcome = 'confirmed',
        counterparty_note = normalized_note,
        responded_at = now(),
        updated_at = now()
    where id = receipt_row.id;

    update public.trade_milestone_payouts
    set status = 'confirmed',
        updated_at = now()
    where id = payout_row.id;

    update public.trade_agreement_milestones
    set status = 'paid',
        updated_at = now()
    where id = payout_row.milestone_id;

    update public.trade_payment_review_cases
    set status = 'resolved',
        updated_at = now()
    where payout_id = payout_row.id
      and status in ('correction_due', 'corrected_response', 'final_review');

    return jsonb_build_object(
      'receiptId', receipt_row.id,
      'payoutId', payout_row.id,
      'milestoneId', milestone_row.id,
      'status', 'confirmed'
    );
  end if;

  update public.trade_external_payment_receipts
  set status = 'under_review',
      response_outcome = 'disputed',
      counterparty_note = normalized_note,
      responded_at = now(),
      updated_at = now()
  where id = receipt_row.id;

  if receipt_row.attempt_number = 1 then
    case_id_value := moral_trade_private.ensure_trade_payment_review_case(
      payout_row.id
    );
  else
    select *
    into review_case
    from public.trade_payment_review_cases candidate
    where candidate.payout_id = payout_row.id
      and candidate.corrected_receipt_id = receipt_row.id
    for update;
    if review_case.id is null
       or review_case.corrected_receipt_id <> receipt_row.id
       or review_case.assigned_reviewer_id is null
       or review_case.status <> 'corrected_response' then
      raise exception 'The corrected receipt cannot enter final review.';
    end if;
    update public.trade_payment_review_cases
    set status = 'final_review',
        updated_at = now()
    where id = review_case.id;
    update public.trade_milestone_payouts
    set status = 'payment_review_pending',
        updated_at = now()
    where id = payout_row.id;
    case_id_value := review_case.id;
  end if;

  return jsonb_build_object(
    'receiptId', receipt_row.id,
    'payoutId', payout_row.id,
    'milestoneId', milestone_row.id,
    'paymentReviewCaseId', case_id_value,
    'status', 'payment_review_pending'
  );
end;
$function$;

create or replace function public.nominate_trade_payment_reviewer_v1(
  p_payout_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  agreed_reviewer uuid;
  case_id_value uuid;
begin
  case_id_value := moral_trade_private.ensure_trade_payment_review_case(
    p_payout_id
  );

  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = case_id_value
  for update;

  if actor_id is null
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or review_case.status <> 'reviewer_selection'
     or review_case.assigned_reviewer_id is not null
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Payment-reviewer nomination is unavailable.';
  end if;

  insert into public.trade_payment_reviewer_nominations (
    case_id, nominated_by, reviewer_id
  ) values (
    review_case.id, actor_id, p_reviewer_id
  )
  on conflict (case_id, nominated_by) do update
  set reviewer_id = excluded.reviewer_id,
      created_at = now();

  select nomination.reviewer_id
  into agreed_reviewer
  from public.trade_payment_reviewer_nominations nomination
  where nomination.case_id = review_case.id
    and nomination.nominated_by in (
      agreement_row.proposer_id, agreement_row.responder_id
    )
  group by nomination.reviewer_id
  having count(*) = 2
  limit 1;

  if agreed_reviewer is not null then
    update public.trade_payment_review_cases
    set assigned_reviewer_id = agreed_reviewer,
        status = 'assigned',
        updated_at = now()
    where id = review_case.id
      and assigned_reviewer_id is null;

    insert into public.trade_notifications (
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      agreed_reviewer,
      'payment_reviewer_assigned',
      'External payment review assigned',
      'The participants selected you to review a disputed or unanswered external payment receipt.',
      '/trade-review/' || milestone_row.id::text,
      'payment_reviewer_assignment:' || review_case.id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'paymentReviewCaseId', review_case.id,
    'assignedReviewerId', agreed_reviewer,
    'status', case
      when agreed_reviewer is null then 'awaiting_consensus'
      else 'assigned'
    end
  );
end;
$function$;

create or replace function public.admin_assign_trade_payment_reviewer_v1(
  p_payout_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  case_id_value uuid;
begin
  if not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Administrator assignment requires an active profile role and AAL2.';
  end if;

  case_id_value := moral_trade_private.ensure_trade_payment_review_case(
    p_payout_id
  );
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = case_id_value
  for update;

  if review_case.status <> 'reviewer_selection'
     or review_case.assigned_reviewer_id is not null
     or review_case.reviewer_selection_deadline_at > now()
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Payment-reviewer fallback is unavailable before the seven-day deadline.';
  end if;

  update public.trade_payment_review_cases
  set assigned_reviewer_id = p_reviewer_id,
      status = 'assigned',
      updated_at = now()
  where id = review_case.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values (
    p_reviewer_id,
    'payment_reviewer_assigned',
    'External payment review assigned',
    'An administrator assigned you after the participant selection deadline.',
    '/trade-review/' || milestone_row.id::text,
    'payment_reviewer_assignment:' || review_case.id::text,
    now()
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'paymentReviewCaseId', review_case.id,
    'assignedReviewerId', p_reviewer_id,
    'status', 'assigned'
  );
end;
$function$;

create or replace function public.resolve_trade_payment_review_v1(
  p_case_id uuid,
  p_outcome text,
  p_private_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  review_case public.trade_payment_review_cases%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  receipt_row public.trade_external_payment_receipts%rowtype;
  decision_kind_value text;
  decision_id_value uuid;
  normalized_reason text := btrim(coalesce(p_private_reason, ''));
begin
  if not moral_trade_private.current_actor_has_trade_role('reviewer') then
    raise exception 'Payment review requires an active profile role and AAL2.';
  end if;

  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = p_case_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = review_case.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;

  if review_case.corrected_receipt_id is not null then
    select *
    into receipt_row
    from public.trade_external_payment_receipts receipt
    where receipt.id = review_case.corrected_receipt_id
    for update;
    decision_kind_value := 'final';

    if review_case.status = 'corrected_response'
       and receipt_row.status = 'reported'
       and receipt_row.response_outcome = 'none'
       and receipt_row.response_deadline_at <= now() then
      update public.trade_external_payment_receipts
      set status = 'under_review',
          response_outcome = 'unanswered',
          responded_at = coalesce(responded_at, response_deadline_at),
          updated_at = now()
      where id = receipt_row.id;
      update public.trade_payment_review_cases
      set status = 'final_review',
          updated_at = now()
      where id = review_case.id;
      review_case.status := 'final_review';
      receipt_row.response_outcome := 'unanswered';
      receipt_row.status := 'under_review';
    end if;
  else
    select *
    into receipt_row
    from public.trade_external_payment_receipts receipt
    where receipt.id = review_case.initial_receipt_id
    for update;
    decision_kind_value := 'initial';
  end if;

  if review_case.assigned_reviewer_id <> actor_id
     or actor_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or length(normalized_reason) not between 1 and 4000
     or (
       review_case.corrected_receipt_id is null
       and review_case.status <> 'assigned'
     )
     or (
       review_case.corrected_receipt_id is not null
       and review_case.status <> 'final_review'
     )
     or (
       review_case.corrected_receipt_id is not null
       and p_outcome = 'allow_correction'
     )
     or p_outcome not in (
       'confirm_paid', 'still_due', 'allow_correction'
     ) then
    raise exception 'This payment review decision is unavailable.';
  end if;

  insert into public.trade_payment_review_decisions (
    case_id,
    receipt_id,
    reviewer_id,
    decision_kind,
    outcome,
    private_reason,
    appeal_deadline_at
  ) values (
    review_case.id,
    receipt_row.id,
    actor_id,
    decision_kind_value,
    p_outcome,
    normalized_reason,
    case
      when p_outcome = 'allow_correction' then null
      else now() + interval '7 days'
    end
  )
  returning id into decision_id_value;

  if p_outcome = 'allow_correction' then
    update public.trade_external_payment_receipts
    set status = 'correction_requested',
        updated_at = now()
    where id = receipt_row.id;
    update public.trade_payment_review_cases
    set status = 'correction_due',
        correction_permitted_at = now(),
        updated_at = now()
    where id = review_case.id;
    update public.trade_milestone_payouts
    set status = 'correction_due',
        updated_at = now()
    where id = payout_row.id;
  else
    update public.trade_payment_review_cases
    set status = 'decision_pending',
        final_decision_id = decision_id_value,
        updated_at = now()
    where id = review_case.id;
    update public.trade_milestone_payouts
    set status = 'payment_decision_pending',
        updated_at = now()
    where id = payout_row.id;
  end if;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    participant_id,
    'payment_review_decided',
    case
      when p_outcome = 'allow_correction'
        then 'One corrected payment receipt permitted'
      else 'External payment review decided'
    end,
    case
      when p_outcome = 'allow_correction'
        then 'The payer may submit one corrected receipt. This permission is not an appealable final decision.'
      else 'The decision has a seven-day appeal window before it becomes final.'
    end,
    '/trade-agreements/' || agreement_row.id::text,
    'payment_review_decided:' || decision_id_value::text || ':' || participant_id::text,
    now()
  from unnest(
    array[agreement_row.proposer_id, agreement_row.responder_id]
  ) as participants(participant_id)
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'paymentReviewCaseId', review_case.id,
    'decisionId', decision_id_value,
    'outcome', p_outcome,
    'status', case
      when p_outcome = 'allow_correction' then 'correction_due'
      else 'decision_pending'
    end
  );
end;
$function$;

create or replace function public.finalize_trade_payment_review_v1(
  p_case_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  review_case public.trade_payment_review_cases%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  decision_row public.trade_payment_review_decisions%rowtype;
  receipt_row public.trade_external_payment_receipts%rowtype;
  payout_status_value text;
begin
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = p_case_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = review_case.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select *
  into decision_row
  from public.trade_payment_review_decisions decision
  where decision.id = review_case.final_decision_id
  for update;
  select *
  into receipt_row
  from public.trade_external_payment_receipts receipt
  where receipt.id = decision_row.receipt_id
  for update;

  if actor_id is null
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or review_case.status <> 'decision_pending'
     or decision_row.is_final
     or decision_row.outcome not in ('confirm_paid', 'still_due')
     or decision_row.appeal_deadline_at is null
     or decision_row.appeal_deadline_at > now()
     or exists (
       select 1
       from public.trade_payment_appeals appeal
       where appeal.case_id = review_case.id
     ) then
    raise exception 'The payment decision is not ready for finality.';
  end if;

  payout_status_value := case
    when decision_row.outcome = 'confirm_paid' then 'adjudicated_paid'
    else 'still_due'
  end;

  update public.trade_payment_review_decisions
  set is_final = true,
      finalized_at = now()
  where id = decision_row.id;
  update public.trade_payment_review_cases
  set status = 'resolved',
      updated_at = now()
  where id = review_case.id;
  update public.trade_external_payment_receipts
  set status = case
        when decision_row.outcome = 'confirm_paid'
          then 'adjudicated_paid'
        else 'adjudicated_still_due'
      end,
      updated_at = now()
  where id = receipt_row.id;
  update public.trade_milestone_payouts
  set status = payout_status_value,
      updated_at = now()
  where id = payout_row.id;
  update public.trade_agreement_milestones
  set status = case
        when decision_row.outcome = 'confirm_paid' then 'paid'
        else 'graded'
      end,
      updated_at = now()
  where id = milestone_row.id;

  return jsonb_build_object(
    'paymentReviewCaseId', review_case.id,
    'decisionId', decision_row.id,
    'outcome', decision_row.outcome,
    'status', payout_status_value,
    'isFinal', true
  );
end;
$function$;

create or replace function public.open_trade_payment_appeal_v1(
  p_case_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  review_case public.trade_payment_review_cases%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  decision_row public.trade_payment_review_decisions%rowtype;
  existing_appeal public.trade_payment_appeals%rowtype;
  normalized_reason text := btrim(coalesce(p_reason, ''));
  appeal_id_value uuid;
begin
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = p_case_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = review_case.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select *
  into decision_row
  from public.trade_payment_review_decisions decision
  where decision.id = review_case.final_decision_id
  for update;
  select *
  into existing_appeal
  from public.trade_payment_appeals appeal
  where appeal.case_id = review_case.id
  for update;

  if existing_appeal.id is not null then
    if existing_appeal.opened_by = actor_id
       and existing_appeal.base_decision_id = decision_row.id
       and existing_appeal.reason = normalized_reason then
      return existing_appeal.id;
    end if;
    raise exception 'The single payment appeal has already been opened.';
  end if;

  if actor_id is null
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or review_case.status <> 'decision_pending'
     or payout_row.status <> 'payment_decision_pending'
     or decision_row.id is null
     or decision_row.is_final
     or decision_row.outcome not in ('confirm_paid', 'still_due')
     or decision_row.appeal_deadline_at is null
     or decision_row.appeal_deadline_at <= now()
     or length(normalized_reason) not between 1 and 4000 then
    raise exception 'The single payment appeal is unavailable or its seven-day window has closed.';
  end if;

  insert into public.trade_payment_appeals (
    case_id,
    base_decision_id,
    opened_by,
    reason,
    reviewer_selection_deadline_at
  ) values (
    review_case.id,
    decision_row.id,
    actor_id,
    normalized_reason,
    now() + interval '7 days'
  )
  returning id into appeal_id_value;

  update public.trade_payment_review_cases
  set status = 'appeal_pending',
      updated_at = now()
  where id = review_case.id;
  update public.trade_milestone_payouts
  set status = 'payment_appeal_pending',
      updated_at = now()
  where id = payout_row.id;

  return appeal_id_value;
end;
$function$;

create or replace function public.nominate_trade_payment_appeal_reviewer_v1(
  p_appeal_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  appeal_row public.trade_payment_appeals%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  base_decision public.trade_payment_review_decisions%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  agreed_reviewer uuid;
begin
  select *
  into appeal_row
  from public.trade_payment_appeals appeal
  where appeal.id = p_appeal_id
  for update;
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = appeal_row.case_id
  for update;
  select *
  into base_decision
  from public.trade_payment_review_decisions decision
  where decision.id = appeal_row.base_decision_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = review_case.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;

  if actor_id is null
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or appeal_row.status <> 'reviewer_selection'
     or review_case.status <> 'appeal_pending'
     or p_reviewer_id = base_decision.reviewer_id
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Choose a different active neutral payment-appeal reviewer.';
  end if;

  insert into public.trade_payment_appeal_reviewer_nominations (
    appeal_id, nominated_by, reviewer_id
  ) values (
    appeal_row.id, actor_id, p_reviewer_id
  )
  on conflict (appeal_id, nominated_by) do update
  set reviewer_id = excluded.reviewer_id,
      created_at = now();

  select nomination.reviewer_id
  into agreed_reviewer
  from public.trade_payment_appeal_reviewer_nominations nomination
  where nomination.appeal_id = appeal_row.id
    and nomination.nominated_by in (
      agreement_row.proposer_id, agreement_row.responder_id
    )
  group by nomination.reviewer_id
  having count(*) = 2
  limit 1;

  if agreed_reviewer is not null then
    update public.trade_payment_appeals
    set assigned_reviewer_id = agreed_reviewer,
        status = 'assigned'
    where id = appeal_row.id
      and assigned_reviewer_id is null;

    insert into public.trade_notifications (
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      agreed_reviewer,
      'payment_appeal_reviewer_assigned',
      'External payment appeal assigned',
      'The participants selected you to decide a final external-payment appeal.',
      '/trade-review/' || milestone_row.id::text,
      'payment_appeal_assignment:' || appeal_row.id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'paymentAppealId', appeal_row.id,
    'assignedReviewerId', agreed_reviewer,
    'status', case
      when agreed_reviewer is null then 'awaiting_consensus'
      else 'assigned'
    end
  );
end;
$function$;

create or replace function public.admin_assign_trade_payment_appeal_reviewer_v1(
  p_appeal_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  appeal_row public.trade_payment_appeals%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  base_decision public.trade_payment_review_decisions%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
begin
  if not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Administrator assignment requires an active profile role and AAL2.';
  end if;

  select *
  into appeal_row
  from public.trade_payment_appeals appeal
  where appeal.id = p_appeal_id
  for update;
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = appeal_row.case_id
  for update;
  select *
  into base_decision
  from public.trade_payment_review_decisions decision
  where decision.id = appeal_row.base_decision_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = review_case.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;

  if appeal_row.status <> 'reviewer_selection'
     or review_case.status <> 'appeal_pending'
     or appeal_row.reviewer_selection_deadline_at > now()
     or p_reviewer_id = base_decision.reviewer_id
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Payment-appeal reviewer fallback is unavailable before the seven-day deadline.';
  end if;

  update public.trade_payment_appeals
  set assigned_reviewer_id = p_reviewer_id,
      status = 'assigned'
  where id = appeal_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values (
    p_reviewer_id,
    'payment_appeal_reviewer_assigned',
    'External payment appeal assigned',
    'An administrator assigned you after the participant selection deadline.',
    '/trade-review/' || milestone_row.id::text,
    'payment_appeal_assignment:' || appeal_row.id::text,
    now()
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'paymentAppealId', appeal_row.id,
    'assignedReviewerId', p_reviewer_id,
    'status', 'assigned'
  );
end;
$function$;

create or replace function public.resolve_trade_payment_appeal_v1(
  p_appeal_id uuid,
  p_outcome text,
  p_private_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  appeal_row public.trade_payment_appeals%rowtype;
  review_case public.trade_payment_review_cases%rowtype;
  base_decision public.trade_payment_review_decisions%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  receipt_row public.trade_external_payment_receipts%rowtype;
  existing_decision public.trade_payment_review_decisions%rowtype;
  normalized_reason text := btrim(coalesce(p_private_reason, ''));
  appeal_decision_id uuid;
  payout_status_value text;
begin
  if not moral_trade_private.current_actor_has_trade_role('reviewer') then
    raise exception 'Payment appeal requires an active profile role and AAL2.';
  end if;

  select *
  into appeal_row
  from public.trade_payment_appeals appeal
  where appeal.id = p_appeal_id
  for update;
  select *
  into review_case
  from public.trade_payment_review_cases candidate
  where candidate.id = appeal_row.case_id
  for update;
  select *
  into base_decision
  from public.trade_payment_review_decisions decision
  where decision.id = appeal_row.base_decision_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = review_case.payout_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select *
  into receipt_row
  from public.trade_external_payment_receipts receipt
  where receipt.id = base_decision.receipt_id
  for update;
  select *
  into existing_decision
  from public.trade_payment_review_decisions decision
  where decision.case_id = review_case.id
    and decision.decision_kind = 'appeal'
  for update;

  if existing_decision.id is not null then
    if existing_decision.reviewer_id = actor_id
       and existing_decision.outcome = p_outcome
       and existing_decision.private_reason = normalized_reason then
      return jsonb_build_object(
        'paymentAppealId', appeal_row.id,
        'decisionId', existing_decision.id,
        'outcome', existing_decision.outcome,
        'status', case
          when existing_decision.outcome = 'confirm_paid'
            then 'adjudicated_paid'
          else 'still_due'
        end,
        'isFinal', true
      );
    end if;
    raise exception 'A different final payment-appeal decision already exists.';
  end if;

  if appeal_row.status <> 'assigned'
     or review_case.status <> 'appeal_pending'
     or appeal_row.assigned_reviewer_id <> actor_id
     or base_decision.reviewer_id = actor_id
     or actor_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or p_outcome not in ('confirm_paid', 'still_due')
     or length(normalized_reason) not between 1 and 4000 then
    raise exception 'This payment appeal cannot be resolved by the current reviewer.';
  end if;

  insert into public.trade_payment_review_decisions (
    case_id,
    receipt_id,
    reviewer_id,
    decision_kind,
    base_decision_id,
    outcome,
    private_reason,
    appeal_deadline_at,
    is_final,
    finalized_at
  ) values (
    review_case.id,
    receipt_row.id,
    actor_id,
    'appeal',
    base_decision.id,
    p_outcome,
    normalized_reason,
    null,
    true,
    now()
  )
  returning id into appeal_decision_id;

  payout_status_value := case
    when p_outcome = 'confirm_paid' then 'adjudicated_paid'
    else 'still_due'
  end;

  update public.trade_payment_appeals
  set status = 'resolved',
      resolved_at = now()
  where id = appeal_row.id;
  update public.trade_payment_review_cases
  set status = 'resolved',
      final_decision_id = appeal_decision_id,
      updated_at = now()
  where id = review_case.id;
  update public.trade_external_payment_receipts
  set status = case
        when p_outcome = 'confirm_paid'
          then 'adjudicated_paid'
        else 'adjudicated_still_due'
      end,
      updated_at = now()
  where id = receipt_row.id;
  update public.trade_milestone_payouts
  set status = payout_status_value,
      updated_at = now()
  where id = payout_row.id;
  update public.trade_agreement_milestones
  set status = case
        when p_outcome = 'confirm_paid' then 'paid'
        else 'graded'
      end,
      updated_at = now()
  where id = milestone_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    participant_id,
    'payment_appeal_resolved',
    'External payment appeal resolved',
    'A different neutral reviewer recorded the final external-payment decision.',
    '/trade-agreements/' || agreement_row.id::text,
    'payment_appeal_resolved:' || appeal_row.id::text || ':' || participant_id::text,
    now()
  from unnest(
    array[agreement_row.proposer_id, agreement_row.responder_id]
  ) as participants(participant_id)
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'paymentAppealId', appeal_row.id,
    'decisionId', appeal_decision_id,
    'outcome', p_outcome,
    'status', payout_status_value,
    'isFinal', true
  );
end;
$function$;

-- Keep the anonymous projection limited to the six approved metadata fields
-- while accurately representing the expanded private payment lifecycle.
create or replace function public.list_public_moral_trade_outcomes_v2(
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with eligible as (
    select
      milestone.action_category,
      case
        when payout.status in ('confirmed', 'adjudicated_paid') then 'paid'
        when payout.status = 'still_due' then 'payment_due'
        when payout.status in ('reported_paid', 'corrected_reported')
          then 'payment_reported'
        when payout.status in (
          'payment_review_pending',
          'correction_due',
          'payment_decision_pending',
          'payment_appeal_pending'
        ) then 'payment_review'
        when review.outcome = 'rejected' then 'evidence_due'
        else 'graded'
      end as lifecycle_status,
      review.confidence_band,
      round(review.completion_units / milestone.units_total, 6)
        as completion_fraction,
      (review.payout_basis_points::numeric / 100)::numeric(7, 2)
        as payout_percentage,
      review.finalized_at::date as outcome_date,
      review.finalized_at,
      milestone.id
    from public.trade_agreement_milestones milestone
    join public.trade_milestone_reviews review
      on review.id = milestone.final_review_id
     and review.is_final
     and review.finalized_at is not null
    join public.trade_milestone_payouts payout
      on payout.milestone_id = milestone.id
     and payout.review_id = review.id
     and payout.is_final
    where milestone.status in ('graded', 'paid', 'evidence_due')
       or (
         milestone.status = 'replacement_due'
         and milestone.replacement_deadline_at <= now()
       )
  ),
  outcome_page as (
    select *
    from eligible
    order by finalized_at desc, id desc
    limit least(greatest(coalesce(p_limit, 24), 1), 50)
    offset least(greatest(coalesce(p_offset, 0), 0), 100000)
  )
  select jsonb_build_object(
    'totalRecords', (select count(*) from eligible),
    'records', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'actionCategory', outcome_page.action_category,
            'lifecycleStatus', outcome_page.lifecycle_status,
            'confidenceBand', outcome_page.confidence_band,
            'completionFraction', outcome_page.completion_fraction,
            'payoutPercentage', outcome_page.payout_percentage,
            'date', outcome_page.outcome_date
          )
          order by outcome_page.finalized_at desc, outcome_page.id desc
        )
        from outcome_page
      ),
      '[]'::jsonb
    )
  );
$function$;

alter table public.trade_payment_review_cases enable row level security;
alter table public.trade_payment_reviewer_nominations enable row level security;
alter table public.trade_payment_review_decisions enable row level security;
alter table public.trade_payment_appeals enable row level security;
alter table public.trade_payment_appeal_reviewer_nominations
  enable row level security;

drop policy if exists "trade_agreement_milestones_authorized_select"
  on public.trade_agreement_milestones;
create policy "trade_agreement_milestones_authorized_select"
on public.trade_agreement_milestones
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements agreement
    where agreement.id = trade_agreement_milestones.agreement_id
      and (select auth.uid()) in (
        agreement.proposer_id, agreement.responder_id
      )
  )
  or assigned_reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_milestone_appeals appeal
    where appeal.milestone_id = trade_agreement_milestones.id
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.trade_milestone_payouts payout
    join public.trade_payment_review_cases review_case
      on review_case.payout_id = payout.id
    where payout.milestone_id = trade_agreement_milestones.id
      and review_case.assigned_reviewer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.trade_milestone_payouts payout
    join public.trade_payment_review_cases review_case
      on review_case.payout_id = payout.id
    join public.trade_payment_appeals appeal
      on appeal.case_id = review_case.id
    where payout.milestone_id = trade_agreement_milestones.id
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_milestone_payouts_authorized_select"
  on public.trade_milestone_payouts;
create policy "trade_milestone_payouts_authorized_select"
on public.trade_milestone_payouts
for select
to authenticated
using (
  (select auth.uid()) in (payer_id, payee_id)
  or exists (
    select 1
    from public.trade_agreement_milestones milestone
    where milestone.id = trade_milestone_payouts.milestone_id
      and (
        milestone.assigned_reviewer_id = (select auth.uid())
        or exists (
          select 1
          from public.trade_milestone_appeals appeal
          where appeal.milestone_id = milestone.id
            and appeal.assigned_reviewer_id = (select auth.uid())
        )
      )
  )
  or exists (
    select 1
    from public.trade_payment_review_cases review_case
    where review_case.payout_id = trade_milestone_payouts.id
      and review_case.assigned_reviewer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.trade_payment_review_cases review_case
    join public.trade_payment_appeals appeal
      on appeal.case_id = review_case.id
    where review_case.payout_id = trade_milestone_payouts.id
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_external_payment_receipts_participant_select"
  on public.trade_external_payment_receipts;
create policy "trade_external_payment_receipts_participant_select"
on public.trade_external_payment_receipts
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_milestone_payouts payout
    where payout.id = trade_external_payment_receipts.payout_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or exists (
    select 1
    from public.trade_payment_review_cases review_case
    where review_case.payout_id = trade_external_payment_receipts.payout_id
      and review_case.payment_cycle =
        trade_external_payment_receipts.payment_cycle
      and review_case.assigned_reviewer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.trade_payment_review_cases review_case
    join public.trade_payment_appeals appeal
      on appeal.case_id = review_case.id
    where review_case.payout_id = trade_external_payment_receipts.payout_id
      and review_case.payment_cycle =
        trade_external_payment_receipts.payment_cycle
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_payment_review_cases_authorized_select"
  on public.trade_payment_review_cases;
create policy "trade_payment_review_cases_authorized_select"
on public.trade_payment_review_cases
for select
to authenticated
using (
  assigned_reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_milestone_payouts payout
    where payout.id = trade_payment_review_cases.payout_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or exists (
    select 1
    from public.trade_payment_appeals appeal
    where appeal.case_id = trade_payment_review_cases.id
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_payment_reviewer_nominations_participant_select"
  on public.trade_payment_reviewer_nominations;
create policy "trade_payment_reviewer_nominations_participant_select"
on public.trade_payment_reviewer_nominations
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_payment_review_cases review_case
    join public.trade_milestone_payouts payout
      on payout.id = review_case.payout_id
    where review_case.id = trade_payment_reviewer_nominations.case_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_payment_review_decisions_authorized_select"
  on public.trade_payment_review_decisions;
create policy "trade_payment_review_decisions_authorized_select"
on public.trade_payment_review_decisions
for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_payment_review_cases review_case
    join public.trade_milestone_payouts payout
      on payout.id = review_case.payout_id
    where review_case.id = trade_payment_review_decisions.case_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or exists (
    select 1
    from public.trade_payment_appeals appeal
    where appeal.case_id = trade_payment_review_decisions.case_id
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_payment_appeals_authorized_select"
  on public.trade_payment_appeals;
create policy "trade_payment_appeals_authorized_select"
on public.trade_payment_appeals
for select
to authenticated
using (
  assigned_reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_payment_review_cases review_case
    join public.trade_milestone_payouts payout
      on payout.id = review_case.payout_id
    where review_case.id = trade_payment_appeals.case_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists
  "trade_payment_appeal_reviewer_nominations_participant_select"
  on public.trade_payment_appeal_reviewer_nominations;
create policy
  "trade_payment_appeal_reviewer_nominations_participant_select"
on public.trade_payment_appeal_reviewer_nominations
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_payment_appeals appeal
    join public.trade_payment_review_cases review_case
      on review_case.id = appeal.case_id
    join public.trade_milestone_payouts payout
      on payout.id = review_case.payout_id
    where appeal.id =
      trade_payment_appeal_reviewer_nominations.appeal_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

revoke all on table
  public.trade_payment_review_cases,
  public.trade_payment_reviewer_nominations,
  public.trade_payment_review_decisions,
  public.trade_payment_appeals,
  public.trade_payment_appeal_reviewer_nominations
from anon, authenticated;

grant select on table
  public.trade_payment_review_cases,
  public.trade_payment_reviewer_nominations,
  public.trade_payment_review_decisions,
  public.trade_payment_appeals,
  public.trade_payment_appeal_reviewer_nominations
to authenticated;

grant all on table
  public.trade_payment_review_cases,
  public.trade_payment_reviewer_nominations,
  public.trade_payment_review_decisions,
  public.trade_payment_appeals,
  public.trade_payment_appeal_reviewer_nominations
to service_role;

revoke all on function
  moral_trade_private.is_trade_agreement_milestone_complete(uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.recompute_trade_agreement_completion(uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.recompute_trade_completion_from_payout()
from public, anon, authenticated;
revoke all on function
  moral_trade_private.recompute_trade_completion_from_milestone()
from public, anon, authenticated;
revoke all on function
  moral_trade_private.ensure_trade_payment_review_case(uuid)
from public, anon, authenticated;
revoke all on function public.guard_core_agreement_transition()
from public, anon, authenticated;

revoke all on function public.report_trade_external_payment_v1(
  uuid, text, text, bigint, text, date, text
) from public, anon, authenticated;
grant execute on function public.report_trade_external_payment_v1(
  uuid, text, text, bigint, text, date, text
) to authenticated;

revoke all on function public.respond_trade_external_payment_v1(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.respond_trade_external_payment_v1(
  uuid, text, text
) to authenticated;

revoke all on function public.nominate_trade_payment_reviewer_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.nominate_trade_payment_reviewer_v1(uuid, uuid)
to authenticated;

revoke all on function
  public.admin_assign_trade_payment_reviewer_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.admin_assign_trade_payment_reviewer_v1(uuid, uuid)
to authenticated;

revoke all on function public.resolve_trade_payment_review_v1(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.resolve_trade_payment_review_v1(
  uuid, text, text
) to authenticated;

revoke all on function public.finalize_trade_payment_review_v1(uuid)
from public, anon, authenticated;
grant execute on function public.finalize_trade_payment_review_v1(uuid)
to authenticated;

revoke all on function public.open_trade_payment_appeal_v1(uuid, text)
from public, anon, authenticated;
grant execute on function public.open_trade_payment_appeal_v1(uuid, text)
to authenticated;

revoke all on function
  public.nominate_trade_payment_appeal_reviewer_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.nominate_trade_payment_appeal_reviewer_v1(uuid, uuid)
to authenticated;

revoke all on function
  public.admin_assign_trade_payment_appeal_reviewer_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  public.admin_assign_trade_payment_appeal_reviewer_v1(uuid, uuid)
to authenticated;

revoke all on function public.resolve_trade_payment_appeal_v1(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.resolve_trade_payment_appeal_v1(
  uuid, text, text
) to authenticated;

revoke all on function public.list_public_moral_trade_outcomes_v2(
  integer, integer
) from public, anon, authenticated;
grant execute on function public.list_public_moral_trade_outcomes_v2(
  integer, integer
) to anon, authenticated;

comment on table public.trade_payment_review_cases is
  'Append-only-per-cycle neutral review cases for disputed or unanswered external-payment reports.';
comment on table public.trade_payment_review_decisions is
  'Private reviewer decisions. Only paid/still-due decisions have a seven-day appeal window.';
comment on table public.trade_payment_appeals is
  'One final-decision appeal per external-payment review cycle, assigned to a different neutral reviewer.';
comment on table public.trade_external_payment_receipts is
  'Private noncustodial external-payment evidence. Each payment cycle permits one initial report and at most one correction.';

notify pgrst, 'reload schema';
