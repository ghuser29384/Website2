insert into public.registered_charities (
  id,
  name,
  cause_area,
  website_url,
  summary,
  is_active,
  is_political_campaign,
  selectable,
  is_moral_public_good,
  consensus_label,
  sort_order
)
values
  (
    'wild-animal-initiative',
    'Wild Animal Initiative',
    'Wild-animal welfare',
    'https://www.wildanimalinitiative.org/donate/',
    'Develops and supports research intended to improve wild-animal welfare and reduce wild-animal suffering responsibly.',
    true,
    false,
    true,
    true,
    'Wild-animal welfare science',
    41
  ),
  (
    'forethought',
    'Forethought',
    'Moral and future-focused research',
    'https://www.forethought.org/donate',
    'Researches how to navigate the transition to a world with superintelligent AI and investigates neglected questions affecting better futures.',
    true,
    false,
    true,
    true,
    'Moral inquiry and better futures',
    51
  )
on conflict (id) do update
set name = excluded.name,
    cause_area = excluded.cause_area,
    website_url = excluded.website_url,
    summary = excluded.summary,
    is_active = excluded.is_active,
    is_political_campaign = excluded.is_political_campaign,
    selectable = excluded.selectable,
    is_moral_public_good = excluded.is_moral_public_good,
    consensus_label = excluded.consensus_label,
    sort_order = excluded.sort_order;

create temporary table moral_trade_offer_bank_operator (
  owner_id uuid primary key,
  owner_alias text not null
) on commit drop;

insert into moral_trade_offer_bank_operator (owner_id, owner_alias)
select profile.id, 'Moral Trade operator — Ellen'
from public.profiles profile
where profile.id = coalesce(
  (
    select offer.owner_id
    from public.offers offer
    where offer.owner_alias = 'Moral Trade operator — Ellen'
      and offer.workflow_status = 'published'
    order by offer.created_at asc
    limit 1
  ),
  (
    select fallback.id
    from public.profiles fallback
    where fallback.display_name = 'Ellen'
    order by fallback.created_at asc
    limit 1
  )
)
limit 1;

do $$
begin
  if not exists (select 1 from moral_trade_offer_bank_operator) then
    raise notice 'The Moral Trade operator profile could not be resolved; offer-bank seed rows are skipped.';
  end if;
end;
$$;

insert into public.financial_commitment_pools (
  pool_key,
  owner_id,
  currency,
  total_cents,
  reserved_cents,
  spent_cents
)
select
  'moral-trade-shared-usd-500-v1',
  operator.owner_id,
  'USD',
  50000,
  0,
  0
from moral_trade_offer_bank_operator operator
on conflict (pool_key) do update
set owner_id = excluded.owner_id,
    currency = excluded.currency,
    total_cents = excluded.total_cents,
    updated_at = now();

create temporary table moral_trade_offer_atoms (
  code text not null,
  offer_number integer not null,
  effort_level text not null,
  action text not null,
  category text not null,
  offered_cause text not null,
  is_financial boolean not null,
  financial_maximum_cents integer,
  reserve_all_remaining boolean not null
) on commit drop;

with raw_atoms as (
  select
    split_part(line, E'\t', 1) as code,
    split_part(line, E'\t', 2) as effort_level,
    split_part(line, E'\t', 3) as action
  from regexp_split_to_table($offer_atoms$
O1	L1	Read up to 1,000 words selected by the counterparty and provide a 100-word summary.
O2	L2	Read up to 3,000 words and provide a 250-word summary.
O3	L3	Read one academic or technical paper and provide a one-page summary.
O4	L4	Read one paper and produce a summary, argument map, strongest objection, and response.
O5	L2	Read one book chapter of up to 40 pages and summarize it.
O6	L4	Read a short book of up to 200 pages and write a review.
O7	L1	Watch a video of up to 15 minutes and report three takeaways.
O8	L2	Watch a lecture or documentary of up to 60 minutes and provide notes.
O9	L2	Listen to a podcast of up to 90 minutes and summarize it.
O10	L2	Attend an online event of up to 60 minutes and provide notes.
O11	L3	Attend an online event of up to two hours and provide notes and questions.
O12	L2	Complete a one-hour course or learning module and provide evidence.
O13	L3	Complete a three-hour course and write a reflection.
O14	L3	Have a 60-minute structured discussion and write a fair summary of the counterparty’s position.
O15	L1	Eat one fully plant-based meal.
O16	L2	Eat fully plant-based for one day.
O17	L2	Eat vegetarian for three days.
O18	L2	Eat vegan for three days.
O19	L3	Eat vegetarian for seven days.
O20	L3	Eat vegan for seven days.
O21	L4	Eat vegetarian for 30 days.
O22	L4	Eat vegan for 30 days.
O23	L3	Abstain from beef for 30 days.
O24	L3	Abstain from chicken and fish for 30 days.
O25	L3	Abstain from eggs and dairy for 30 days.
O26	L3	Replace ten animal-product meals with plant-based meals.
O27	L2	Cook a new plant-based recipe and document the result.
O28	L3	Prepare and serve a plant-based meal to at least two other people.
O29	L1	Replace one car or ride-hail trip with walking, cycling, or public transport.
O30	L2	Make five low-carbon trip substitutions.
O31	L3	Make twenty low-carbon trip substitutions within 60 days.
O32	L1	Have one car-free day.
O33	L2	Have one car-free weekend.
O34	L3	Remain car-free for seven days.
O35	L2	Abstain from ride-hailing for 14 days.
O36	L4	Replace one eligible short flight with ground transportation.
O37	L4	Take no leisure flights for six months.
O38	L5	Take no leisure flights for 12 months.
O39	L2	Perform one hour of litter removal or environmental cleanup.
O40	L3	Perform three hours of habitat restoration, cleanup, or comparable work.
O41	L2	Complete a home energy-use audit and implement at least one change.
O42	L3	Compost eligible food waste for 30 days.
O43	L2	Repair, borrow, rent, or buy used instead of replacing one item with a new one.
O44	L1	Abstain from social media for 24 hours.
O45	L3	Abstain from social media for seven days.
O46	L4	Abstain from social media for 30 days.
O47	L2	Abstain from streaming entertainment for seven days.
O48	L3	Make no nonessential online purchases for 30 days.
O49	L3	Spend ten minutes on deliberate moral reflection daily for 14 days.
O50	L2	Perform and log one deliberate helpful action daily for seven days.
O51	L4	Volunteer one hour per week for four weeks for an approved cause.
O52	L2	Create three genuine, distinct Moral Trade offers.
O53	L3	Recruit and onboard one new user who creates or completes a verified trade.
O54	L1	Proofread up to 500 words.
O55	L2	Copyedit up to 1,000 words.
O56	L3	Substantively edit up to 2,000 words.
O57	L2	Summarize up to ten pages of supplied material.
O58	L3	Fact-check up to ten clearly specified claims.
O59	L3	Produce a ten-source annotated bibliography.
O60	L4	Produce a bounded three-hour research brief.
O61	L1	Perform 30 minutes of spreadsheet or data cleanup.
O62	L3	Perform two hours of spreadsheet or data cleanup.
O63	L2	Create one simple chart or table from supplied data.
O64	L2	Perform a 30-minute website or application user test and provide notes.
O65	L3	Perform a one-hour usability or accessibility review.
O66	L2	Perform a 30-minute code review, where qualified.
O67	L3	Debug one bounded technical issue for up to one hour, where qualified.
O68	L2	Draft up to 300 words of website copy.
O69	L2	Draft five factual social-media posts.
O70	L3	Produce a one-page FAQ or explainer.
O71	L3	Produce a five-slide mini-deck.
O72	L2	Write five personalized outreach messages.
O73	L2	Conduct a 30-minute interview and provide organized notes.
O74	L2	Transcribe up to 30 minutes of clear audio.
O75	L3	Tutor, mentor, or advise someone for one hour.
O76	L3	Review a proposal or application of up to 2,000 words.
O77	L3	Moderate an online event of up to 90 minutes.
O78	L3	Provide one hour of your highest-value applicable professional skill.
O79	L4	Provide five hours of professional work over one month.
O80	L5	Complete a bounded 20-hour pro bono project over three months.
O81	L1	Donate $5 to the counterparty’s selected approved cause.
O82	L1	Donate $10 to the counterparty’s selected approved cause.
O83	L2	Donate $20 to the counterparty’s selected approved cause.
O84	L3	Donate $50 to the counterparty’s selected approved cause.
O85	L4	Donate $100 to the counterparty’s selected approved cause.
O86	L5	Donate $250 to the counterparty’s selected approved cause.
O87	L5	Donate the full remaining pool, up to $500, to the counterparty’s selected approved cause.
O88	L4	Match eligible contributions to the counterparty’s selected approved cause, up to $100.
$offer_atoms$, E'\n') as line
  where line <> ''
),
numbered as (
  select
    code,
    substring(code from 2)::integer as offer_number,
    effort_level,
    action
  from raw_atoms
)
insert into moral_trade_offer_atoms
select
  code,
  offer_number,
  effort_level,
  action,
  case
    when offer_number <= 14 then 'Attention and learning'
    when offer_number <= 28 then 'Diet and consumption'
    when offer_number <= 43 then 'Transportation and environmental behavior'
    when offer_number <= 53 then 'Recurring habits, abstentions, and site growth'
    when offer_number <= 80 then 'Professional work and practical services'
    else 'Shared $500 financial pool'
  end,
  case
    when offer_number <= 14 then 'Counterparty-selected learning or attention'
    when offer_number <= 28 then 'Diet and consumption change'
    when offer_number <= 43 then 'Transportation or environmental behavior'
    when offer_number <= 53 then 'Habit, abstention, or Moral Trade growth'
    when offer_number <= 80 then 'Professional or practical service'
    else 'Financial support for the counterparty''s approved cause'
  end,
  offer_number >= 81,
  case offer_number
    when 81 then 500
    when 82 then 1000
    when 83 then 2000
    when 84 then 5000
    when 85 then 10000
    when 86 then 25000
    when 88 then 10000
    else null
  end,
  offer_number = 87
from numbered;

create temporary table moral_trade_request_atoms (
  code text not null,
  request_number integer not null,
  effort_level text not null,
  action_template text not null,
  category text not null,
  request_cause text,
  requires_priority boolean not null,
  is_donation boolean not null
) on commit drop;

with raw_atoms as (
  select
    split_part(line, E'\t', 1) as code,
    split_part(line, E'\t', 2) as effort_level,
    split_part(line, E'\t', 3) as action_template
  from regexp_split_to_table($request_atoms$
R1	L1	Donate $5 to {ORGANIZATION}.
R2	L1	Donate $10 to {ORGANIZATION}.
R3	L2	Donate $20 to {ORGANIZATION}.
R4	L3	Donate $50 to {ORGANIZATION}.
R5	L4	Donate $100 to {ORGANIZATION}.
R6	L5	Donate $250 to {ORGANIZATION}.
R7	L5	Donate $500 to {ORGANIZATION}.
R8	L3	Donate $10 per month for three months to {ORGANIZATION}.
R9	L4	Donate $25 per month for three months to {ORGANIZATION}.
R10	L1	Replace one animal-product meal with a plant-based meal.
R11	L2	Eat fully plant-based for one day.
R12	L2	Eat fully plant-based for three days.
R13	L3	Eat fully plant-based for seven days.
R14	L4	Eat fully plant-based for 30 days.
R15	L3	Abstain from chicken and fish for 30 days.
R16	L3	Replace ten animal-product meals.
R17	L1	Replace one car or ride-hail trip with a lower-carbon mode.
R18	L3	Make ten lower-carbon trip substitutions.
R19	L1	Complete one car-free day.
R20	L3	Complete one car-free week.
R21	L4	Replace one eligible short flight with ground transportation.
R22	L2	Perform one hour of environmental cleanup or restoration.
R23	L3	Make no nonessential purchases for 30 days.
R24	L1	Read a {CAUSE} introduction of up to 1,000 words and summarize it.
R25	L2	Watch a 30–60 minute {CAUSE} talk and provide five takeaways.
R26	L2	Complete a one-hour learning module related to {CAUSE}.
R27	L3	Read a paper related to {CAUSE} and provide a one-page summary.
R28	L3	Participate in a one-hour structured discussion about {CAUSE}.
R29	L4	Read a short book related to {CAUSE} and write a review.
R30	L2	Volunteer for one hour for an organization or project working on {CAUSE}.
R31	L3	Volunteer for three hours for an organization or project working on {CAUSE}.
R32	L5	Volunteer for ten hours for an organization or project working on {CAUSE}.
R33	L2	Send five personalized, accurate outreach messages for a project working on {CAUSE}.
R34	L3	Provide two hours of applicable professional work to a project working on {CAUSE}.
R35	L3	Produce a one-page research brief on a question concerning {CAUSE}.
R36	L2	Contact one relevant institution or representative with a factual message concerning {CAUSE}.
R37	L3	Host a substantive discussion about {CAUSE} with at least three participants.
R38	L3	Produce one accurate public explainer about an issue concerning {CAUSE}.
R39	L2	Create three genuine Moral Trade offers.
R40	L3	Recruit one new user who creates or completes a verified trade.
R41	L2	Complete one verified Moral Trade.
R42	L1	Verify another person’s completed trade.
R43	L1	Submit useful post-trade feedback about the site and mechanism.
$request_atoms$, E'\n') as line
  where line <> ''
),
numbered as (
  select
    code,
    substring(code from 2)::integer as request_number,
    effort_level,
    action_template
  from raw_atoms
)
insert into moral_trade_request_atoms
select
  code,
  request_number,
  effort_level,
  action_template,
  case
    when request_number <= 9 then 'Donation to a priority organization'
    when request_number <= 16 then 'Farmed-animal welfare behavior'
    when request_number <= 23 then 'Environmental behavior'
    when request_number <= 29 then 'Priority-cause attention and learning'
    when request_number <= 38 then 'Priority-cause time, skills, or outreach'
    else 'Moral Trade ecosystem and integrity'
  end,
  case
    when request_number between 10 and 16 then 'Farmed-animal welfare'
    when request_number between 17 and 23 then 'Environmental protection and climate'
    when request_number >= 39 then 'Moral Trade ecosystem'
    else null
  end,
  request_number <= 9 or request_number between 24 and 38,
  request_number <= 9
from numbered;

create temporary table moral_trade_priority_causes (
  priority_number integer primary key,
  priority_code text not null unique,
  cause_label text not null,
  organization_id text not null,
  organization_name text not null
) on commit drop;

insert into moral_trade_priority_causes values
  (1, 'C1', 'existential-risk reduction and a better long-term future', 'ea-long-term-future-fund', 'EA Long-Term Future Fund'),
  (2, 'C2', 'farmed-animal welfare', 'animal-charity-evaluators-fund', 'ACE Recommended Charity Fund'),
  (3, 'C3', 'wild-animal welfare and reducing wild-animal suffering', 'wild-animal-initiative', 'Wild Animal Initiative'),
  (4, 'C4', 'moral philosophy, moral uncertainty, and research into the correct moral view', 'forethought', 'Forethought'),
  (5, 'C5', 'environmental protection and climate', 'founders-pledge-climate-fund', 'Founders Pledge: Climate Fund');

create temporary table moral_trade_offer_bank_pairs on commit drop as
select
  md5('moral-trade-offer-bank:v1:' || offer_atom.code || ':' || request_atom.code)::uuid as offer_id,
  offer_atom.code as offer_code,
  request_atom.code as request_code,
  offer_atom.offer_number,
  request_atom.request_number,
  offer_atom.effort_level,
  offer_atom.category as offer_category,
  request_atom.category as request_category,
  offer_atom.offered_cause,
  case
    when request_atom.requires_priority then priority.cause_label
    else request_atom.request_cause
  end as requested_cause,
  offer_atom.action as offered_action,
  replace(
    replace(request_atom.action_template, '{CAUSE}', priority.cause_label),
    '{ORGANIZATION}',
    priority.organization_name
  ) as requested_action,
  case
    when request_atom.requires_priority then priority.priority_code
    else ''
  end as request_priority_code,
  offer_atom.is_financial,
  offer_atom.financial_maximum_cents,
  offer_atom.reserve_all_remaining,
  row_number() over (order by offer_atom.offer_number, request_atom.request_number) as pair_sequence
from moral_trade_offer_atoms offer_atom
join moral_trade_request_atoms request_atom
  on request_atom.effort_level = offer_atom.effort_level
join moral_trade_priority_causes priority
  on priority.priority_number = mod(offer_atom.offer_number + request_atom.request_number - 2, 5) + 1
where not (offer_atom.is_financial and request_atom.is_donation);

do $$
declare
  pair_count integer;
begin
  select count(*) into pair_count from moral_trade_offer_bank_pairs;
  if pair_count <> 979 then
    raise exception 'Expected 979 offer-bank pairings, generated %.', pair_count;
  end if;
end;
$$;

insert into public.offers (
  id,
  owner_id,
  owner_alias,
  mode,
  offered_cause,
  requested_cause,
  offer_action,
  request_action,
  compromise_cause,
  offer_impact,
  min_counterparty_impact,
  verification,
  duration,
  trust_level,
  notes,
  discount_note,
  status,
  workflow_status,
  moderation_reason,
  submission_key,
  fingerprint,
  no_trade_baseline,
  start_date,
  exit_conditions,
  maximum_burden,
  privacy_scope,
  evidence_due_date,
  submitted_at,
  published_at,
  terms_version,
  created_at,
  updated_at
)
select
  pair.offer_id,
  operator.owner_id,
  operator.owner_alias,
  case when pair.is_financial then 'payment'::public.offer_mode else 'pledge'::public.offer_mode end,
  pair.offered_cause,
  pair.requested_cause,
  pair.offer_code || ' — ' || pair.offered_action,
  pair.request_code || ' — ' || pair.requested_action,
  'Not needed',
  case pair.effort_level
    when 'L1' then 2
    when 'L2' then 4
    when 'L3' then 6
    when 'L4' then 8
    when 'L5' then 10
  end,
  case pair.effort_level
    when 'L1' then 2
    when 'L2' then 4
    when 'L3' then 6
    when 'L4' then 8
    when 'L5' then 10
  end,
  'Any mutually agreed public-safe evidence: redacted receipt, dated log, screenshot, photograph, completed work, public link, certificate, or third-party confirmation. Sensitive details may be removed.',
  'Normally complete within 30 days of acceptance; any explicit longer period in either action governs.',
  1,
  concat_ws(
    E'\n',
    'Catalog pairing ' || pair.offer_code || ':' || pair.request_code || ' · effort ' || pair.effort_level || '.',
    'Default terms v1:',
    'Shared financial cap: all offers in which the offer-maker pays or donates draw from one aggregate $500 pool. The maximum stated amount is reserved when both parties confirm an agreement.',
    'Additionality: both parties attest that their promised action was not already firmly planned.',
    'Repeatability: repeatable, but no more than one current instance of this exact offer per counterparty.',
    'Evidence: redacted receipts, dated logs, screenshots, photographs, completed work, public links, certificates, or third-party confirmation are accepted. Personal addresses, account numbers, health details, and unrelated communications may be removed.',
    'Completion: normally within 30 days, with the explicit longer period controlling for monthly or annual commitments.',
    'Basic screen: actions must be lawful, nonviolent, nondeceptive, non-harassing, within the person’s competence, and not materially harm uninvolved parties.',
    'No threats: no offer may demand payment or action in exchange for not starting, continuing, or intensifying harm.',
    'Health and feasibility: diet, transport, abstention, and physical commitments remain subject to medical, disability, religious, employment, caregiving, and safety constraints.',
    'Pairing rule: actions are paired at the same effort level. The parties may still negotiate different terms before confirmation.'
  ),
  case
    when pair.is_financial then
      case
        when pair.reserve_all_remaining then
          'This listing reserves the full uncommitted balance remaining in the shared $500 pool at activation.'
        else
          'This listing reserves up to $' ||
          to_char(pair.financial_maximum_cents / 100.0, 'FM999999990.00') ||
          ' from the shared $500 pool at activation.'
      end
    else
      'Effort-matched catalog pairing; subjective moral valuations may justify a different negotiated exchange.'
  end,
  'open'::public.offer_status,
  'published',
  '',
  'offer-bank-v1:' || pair.offer_code || ':' || pair.request_code,
  md5('offer-bank-v1:' || pair.offer_code || ':' || pair.request_code),
  'Without this agreement, the listed offer-maker action is not firmly planned and the counterparty action is not assumed to occur. Both parties must confirm additionality when accepting.',
  null,
  'Either party may decline before confirmation. After confirmation, pause or exit for safety, health, legal, disability, religious, employment, caregiving, or material-feasibility constraints. Missing evidence leaves the record unresolved and produces no completion badge.',
  case pair.effort_level
    when 'L1' then 'L1 — Up to 15 minutes, one very small behavior, or roughly $5–$10.'
    when 'L2' then 'L2 — 30–90 minutes, a one-day change, or roughly $10–$25.'
    when 'L3' then 'L3 — 2–5 hours, a one-week change, ten repetitions, or roughly $25–$60.'
    when 'L4' then 'L4 — 8–20 hours, a one-month change, or roughly $75–$150.'
    when 'L5' then 'L5 — More than 20 hours, a 3–12 month commitment, or roughly $200–$500.'
  end,
  'The listing is public. Agreement terms and public-safe evidence may be public; sensitive details remain limited to participants and the operator and may be redacted.',
  null,
  now(),
  now(),
  1,
  now() - (pair.pair_sequence * interval '1 millisecond'),
  now() - (pair.pair_sequence * interval '1 millisecond')
from moral_trade_offer_bank_pairs pair
cross join moral_trade_offer_bank_operator operator
on conflict (id) do nothing;

insert into public.offer_catalog_entries (
  offer_id,
  offer_code,
  request_code,
  effort_level,
  offer_category,
  request_category,
  request_priority_code,
  default_terms_version,
  repeatable,
  shared_financial_pool_key,
  financial_maximum_cents,
  reserve_all_remaining
)
select
  pair.offer_id,
  pair.offer_code,
  pair.request_code,
  pair.effort_level,
  pair.offer_category,
  pair.request_category,
  pair.request_priority_code,
  1,
  true,
  case when pair.is_financial then 'moral-trade-shared-usd-500-v1' else null end,
  pair.financial_maximum_cents,
  pair.reserve_all_remaining
from moral_trade_offer_bank_pairs pair
join public.offers offer on offer.id = pair.offer_id
on conflict (offer_id) do update
set offer_code = excluded.offer_code,
    request_code = excluded.request_code,
    effort_level = excluded.effort_level,
    offer_category = excluded.offer_category,
    request_category = excluded.request_category,
    request_priority_code = excluded.request_priority_code,
    default_terms_version = excluded.default_terms_version,
    repeatable = excluded.repeatable,
    shared_financial_pool_key = excluded.shared_financial_pool_key,
    financial_maximum_cents = excluded.financial_maximum_cents,
    reserve_all_remaining = excluded.reserve_all_remaining;

insert into public.trade_review_events (
  offer_id,
  reviewer_id,
  action,
  reason,
  metadata
)
select
  pair.offer_id,
  operator.owner_id,
  'approved',
  'Bulk publication explicitly requested by the offer owner. Same-effort pairings were generated under default terms v1; donation-for-donation pairings were excluded.',
  jsonb_build_object(
    'source', 'owner_authorized_offer_bank_v1',
    'offer_code', pair.offer_code,
    'request_code', pair.request_code,
    'effort_level', pair.effort_level
  )
from moral_trade_offer_bank_pairs pair
cross join moral_trade_offer_bank_operator operator
where not exists (
  select 1
  from public.trade_review_events review
  where review.offer_id = pair.offer_id
    and review.action = 'approved'
    and review.metadata ->> 'source' = 'owner_authorized_offer_bank_v1'
);

insert into public.core_loop_events (
  profile_id,
  event_type,
  entity_type,
  entity_id,
  idempotency_key,
  metadata
)
select
  operator.owner_id,
  'offer_published',
  'offer',
  pair.offer_id,
  'offer_published:' || operator.owner_id::text || ':offer:' || pair.offer_id::text,
  jsonb_build_object(
    'source', 'owner_authorized_offer_bank_v1',
    'offer_code', pair.offer_code,
    'request_code', pair.request_code,
    'effort_level', pair.effort_level
  )
from moral_trade_offer_bank_pairs pair
cross join moral_trade_offer_bank_operator operator
on conflict (idempotency_key) do nothing;

do $$
declare
  operator_count integer;
  catalog_count integer;
  live_count integer;
  financial_count integer;
  invalid_money_swap_count integer;
begin
  select count(*)
  into operator_count
  from moral_trade_offer_bank_operator;

  select count(*)
  into catalog_count
  from public.offer_catalog_entries catalog
  join public.offers offer on offer.id = catalog.offer_id
  where offer.submission_key like 'offer-bank-v1:%';

  select count(*)
  into live_count
  from public.offers offer
  where offer.submission_key like 'offer-bank-v1:%'
    and offer.status = 'open'::public.offer_status
    and offer.workflow_status = 'published';

  select count(*)
  into financial_count
  from public.offer_catalog_entries catalog
  join public.offers offer on offer.id = catalog.offer_id
  where offer.submission_key like 'offer-bank-v1:%'
    and catalog.shared_financial_pool_key = 'moral-trade-shared-usd-500-v1';

  select count(*)
  into invalid_money_swap_count
  from public.offer_catalog_entries catalog
  join public.offers offer on offer.id = catalog.offer_id
  where offer.submission_key like 'offer-bank-v1:%'
    and substring(catalog.offer_code from 2)::integer >= 81
    and substring(catalog.request_code from 2)::integer <= 9;

  if operator_count = 0 then
    if catalog_count <> 0 or live_count <> 0 or financial_count <> 0 then
      raise exception
        'Offer-bank seed rows were created without a resolved operator: catalog %, live %, financial %.',
        catalog_count,
        live_count,
        financial_count;
    end if;
  else
    if catalog_count <> 979 then
      raise exception 'Expected 979 catalog rows, found %.', catalog_count;
    end if;
    if live_count <> 979 then
      raise exception 'Expected 979 live catalog offers, found %.', live_count;
    end if;
    if financial_count <> 44 then
      raise exception 'Expected 44 shared-pool financial offers, found %.', financial_count;
    end if;
  end if;
  if invalid_money_swap_count <> 0 then
    raise exception 'Donation-for-donation pairings were generated unexpectedly: %.', invalid_money_swap_count;
  end if;
end;
$$;
