-- Institutional Moral Trade system: exact-scope, exact-term, audit-first.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.institutional_set_updated_at()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin new.updated_at=timezone('utc',now()); return new; end $$;

create table public.institutional_organizations (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id) on delete restrict,
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'), display_name text not null, legal_name text,
 organization_type text not null check(organization_type in ('foundation','grantmaker','nonprofit','charity','research_organization','university','laboratory','for_profit','independent_funder','fiscally_sponsored_project','fund','donor_advised_fund','informal_initiative','other')),
 summary text not null default '', website_url text, official_domain text, jurisdiction text, registration_number text,
 verification_status text not null default 'unverified' check(verification_status in ('unverified','pending','partially_verified','verified','suspended')),
 status text not null default 'active' check(status in ('active','inactive','suspended','archived')), public_profile_enabled boolean not null default true,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create trigger institutional_organizations_updated_at before update on public.institutional_organizations for each row execute function public.institutional_set_updated_at();

-- Independent people opt in explicitly. Ordinary personal Moral Trade users are
-- not made discoverable in the institutional system merely because they have an
-- account.
create table public.institutional_individual_profiles (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 status text not null default 'active' check(status in ('active','paused','archived')),
 headline text not null default '', summary text not null default '', participation_roles text[] not null default '{}',
 visibility text not null default 'private' check(visibility in ('private','verified_only','public')),
 verification_status text not null default 'unverified' check(verification_status in ('unverified','pending','verified','rejected','expired','revoked')),
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create trigger institutional_individual_profiles_updated_at before update on public.institutional_individual_profiles for each row execute function public.institutional_set_updated_at();

create or replace function public.institutional_protect_individual_verification()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if auth.uid() is not null and auth.uid()=new.profile_id then
  if tg_op='INSERT' and new.verification_status<>'unverified' then
   raise exception 'An individual cannot self-verify institutional identity or qualifications.' using errcode='42501';
  elsif tg_op='UPDATE' and new.verification_status is distinct from old.verification_status then
   raise exception 'Individual verification status may be changed only by an authorized reviewer.' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger institutional_individual_verification_guard before insert or update on public.institutional_individual_profiles for each row execute function public.institutional_protect_individual_verification();

create table public.institutional_legal_entities (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 legal_name text not null, entity_type text not null, jurisdiction text, registration_number text, registered_address jsonb not null default '{}',
 fiscal_sponsor_organization_id uuid references public.institutional_organizations(id) on delete restrict,
 status text not null default 'active' check(status in ('active','inactive','pending_verification')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create trigger institutional_legal_entities_updated_at before update on public.institutional_legal_entities for each row execute function public.institutional_set_updated_at();

create table public.institutional_programs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 legal_entity_id uuid references public.institutional_legal_entities(id) on delete set null,
 slug text not null check(slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'), name text not null, summary text not null default '', mandate_summary text not null default '',
 status text not null default 'active' check(status in ('active','inactive','archived')), public_profile_enabled boolean not null default true,
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 unique(organization_id,slug), unique(id,organization_id)
);
create trigger institutional_programs_updated_at before update on public.institutional_programs for each row execute function public.institutional_set_updated_at();

create table public.institutional_memberships (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','administrator','deal_manager','approver','signatory','finance','reviewer','auditor','viewer','member')),
 permissions text[] not null default '{}', status text not null default 'invited' check(status in ('invited','active','suspended','revoked')),
 invited_by uuid references public.profiles(id) on delete set null, accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(organization_id,profile_id)
);
create trigger institutional_memberships_updated_at before update on public.institutional_memberships for each row execute function public.institutional_set_updated_at();

create table public.institutional_authority_grants (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 program_id uuid, profile_id uuid not null references public.profiles(id) on delete cascade, permissions text[] not null,
 amount_limit_cents bigint check(amount_limit_cents is null or amount_limit_cents>=0), currency text not null default 'usd' check(currency ~ '^[a-z]{3}$'),
 authority_basis text not null, evidence_references jsonb not null default '[]', valid_from timestamptz not null default timezone('utc',now()), valid_until timestamptz,
 revoked_at timestamptz, granted_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade,
 check(valid_until is null or valid_until>valid_from)
);
create trigger institutional_authority_grants_updated_at before update on public.institutional_authority_grants for each row execute function public.institutional_set_updated_at();

create table public.institutional_approval_policies (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid,
 name text not null, policy jsonb not null default '{}', status text not null default 'active' check(status in ('draft','active','retired')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade
);
create trigger institutional_approval_policies_updated_at before update on public.institutional_approval_policies for each row execute function public.institutional_set_updated_at();

create table public.institutional_verification_records (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 subject_type text not null check(subject_type in ('organization','legal_entity','program','representative','authority','payment_account')), subject_id uuid not null,
 facet text not null check(facet in ('domain_control','legal_entity','representative_identity','authority','payment_account','enhanced_review')), method text not null,
 status text not null default 'pending' check(status in ('pending','verified','rejected','expired','revoked')), evidence_references jsonb not null default '[]',
 requested_by uuid not null references public.profiles(id) on delete restrict, reviewed_by uuid references public.profiles(id) on delete set null,
 review_note text, decided_at timestamptz, expires_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create trigger institutional_verification_records_updated_at before update on public.institutional_verification_records for each row execute function public.institutional_set_updated_at();

create table public.institutional_mandates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid not null,
 version integer not null check(version>0), title text not null, public_summary text not null default '', confidential_constraints jsonb not null default '{}',
 cause_scope text[] not null default '{}', permissible_resources text[] not null default '{}', prohibited_activities text[] not null default '{}',
 minimum_commitment_cents bigint, maximum_commitment_cents bigint, effective_from timestamptz not null default timezone('utc',now()), effective_until timestamptz,
 status text not null default 'draft' check(status in ('draft','active','superseded','retired')), created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade, unique(program_id,version),
 check((minimum_commitment_cents is null or minimum_commitment_cents>=0) and (maximum_commitment_cents is null or maximum_commitment_cents>=0) and (minimum_commitment_cents is null or maximum_commitment_cents is null or minimum_commitment_cents<=maximum_commitment_cents))
);
create trigger institutional_mandates_updated_at before update on public.institutional_mandates for each row execute function public.institutional_set_updated_at();

create table public.institutional_resource_profiles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid not null,
 direction text not null check(direction in ('offer','seek')), resource_type text not null check(resource_type in ('funding','grantmaking_capacity','staff_time','staff_secondment','research','operations','data','compute','laboratory_capacity','office_capacity','distribution','communications','procurement','introductions','convening','legal_expertise','policy_expertise','intellectual_property','network_access','other')),
 title text not null, description text not null default '', quantity numeric, unit text, amount_min_cents bigint, amount_max_cents bigint, currency text,
 start_at timestamptz, end_at timestamptz, urgency text not null default 'normal' check(urgency in ('low','normal','high','critical')),
 confidentiality text not null default 'confidential_matching' check(confidentiality in ('public','verified_only','network_only','invited_only','confidential_matching','blind_matching')),
 reservation_terms jsonb not null default '{}', qualifications jsonb not null default '{}', constraints jsonb not null default '{}',
 status text not null default 'active' check(status in ('draft','active','matched','paused','closed')), created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade
);
create trigger institutional_resource_profiles_updated_at before update on public.institutional_resource_profiles for each row execute function public.institutional_set_updated_at();

create table public.institutional_opportunities (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid not null,
 mandate_id uuid references public.institutional_mandates(id) on delete restrict, title text not null, summary text not null default '',
 offer_resource_profile_id uuid references public.institutional_resource_profiles(id) on delete set null, seek_resource_profile_id uuid references public.institutional_resource_profiles(id) on delete set null,
 moral_difference_statement text not null default '', no_trade_summary text not null default '',
 visibility text not null default 'confidential_matching' check(visibility in ('public','verified_only','network_only','invited_only','confidential_matching','blind_matching')),
 status text not null default 'draft' check(status in ('draft','authorized','published','matched','closed','expired')), created_by uuid not null references public.profiles(id) on delete restrict,
 published_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade
);
create trigger institutional_opportunities_updated_at before update on public.institutional_opportunities for each row execute function public.institutional_set_updated_at();

create table public.institutional_matches (
 id uuid primary key default gen_random_uuid(), offer_resource_profile_id uuid not null references public.institutional_resource_profiles(id) on delete cascade,
 seek_resource_profile_id uuid not null references public.institutional_resource_profiles(id) on delete cascade,
 offer_organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 seek_organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 classification text not null default 'candidate', score numeric not null default 0 check(score between 0 and 1), score_components jsonb not null default '{}',
 bargaining_overlap boolean, explanation text not null default '', status text not null default 'candidate' check(status in ('candidate','mutual_interest','declined','converted','expired')),
 generated_by text not null default 'deterministic', created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 unique(offer_resource_profile_id,seek_resource_profile_id)
);
create trigger institutional_matches_updated_at before update on public.institutional_matches for each row execute function public.institutional_set_updated_at();

create table public.institutional_match_interests (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.institutional_matches(id) on delete cascade,
 organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid,
 profile_id uuid not null references public.profiles(id) on delete restrict,
 interest text not null check(interest in ('interested','declined','needs_information')), note text,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 unique(match_id,organization_id)
);
create trigger institutional_match_interests_updated_at before update on public.institutional_match_interests for each row execute function public.institutional_set_updated_at();

create or replace function public.institutional_validate_match_interest_scope()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare match_row public.institutional_matches; expected_program_id uuid;
begin
 select * into match_row from public.institutional_matches where id=new.match_id;
 if not found then raise exception 'Institutional match does not exist.' using errcode='23514'; end if;
 if new.organization_id=match_row.offer_organization_id then
  select program_id into expected_program_id from public.institutional_resource_profiles where id=match_row.offer_resource_profile_id;
 elsif new.organization_id=match_row.seek_organization_id then
  select program_id into expected_program_id from public.institutional_resource_profiles where id=match_row.seek_resource_profile_id;
 else
  raise exception 'Match interest organization must be one of the exact matched organizations.' using errcode='23514';
 end if;
 if new.program_id is distinct from expected_program_id then
  raise exception 'Match interest program must exactly match the organization resource profile.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger institutional_match_interest_scope_guard before insert or update on public.institutional_match_interests
 for each row execute function public.institutional_validate_match_interest_scope();

create table public.institutional_deals (
 id uuid primary key default gen_random_uuid(),
 lead_capacity text not null default 'organization' check(lead_capacity in ('organization','individual')),
 lead_profile_id uuid references public.profiles(id) on delete restrict,
 lead_organization_id uuid references public.institutional_organizations(id) on delete restrict, lead_program_id uuid,
 legal_counterparty_id uuid references public.institutional_legal_entities(id) on delete restrict, source_match_id uuid references public.institutional_matches(id) on delete set null,
 created_by uuid not null references public.profiles(id) on delete restrict, title text not null, summary text not null default '',
 deal_type text not null check(deal_type in ('bilateral_trade','multi_party_exchange','institutional_secondment','funding_redirect','consortium','moral_public_good_pool')),
 classification text not null default 'unclassified' check(classification in ('unclassified','pure_moral_trade','mixed_moral_trade','moral_public_goods_coordination','ordinary_mission_exchange','internal_portfolio_reallocation')),
 stage text not null default 'draft' check(stage in ('draft','exploratory','authorized_for_negotiation','proposed','term_sheet_agreed','pending_governance_approval','signed','execution','evidence_review','completed','amended','terminated','disputed','expired')),
 visibility text not null default 'parties_only' check(visibility in ('public','verified_only','network_only','invited_only','parties_only','operator_only')),
 selected_proposal_version_id uuid, selected_terms_hash text check(selected_terms_hash is null or selected_terms_hash ~ '^[0-9a-f]{64}$'), signed_at timestamptz,
 completed_at timestamptz, terminated_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(lead_program_id,lead_organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 check(
  (lead_capacity='organization' and lead_organization_id is not null and lead_profile_id is null)
  or
  (lead_capacity='individual' and lead_profile_id is not null and lead_organization_id is null and lead_program_id is null and legal_counterparty_id is null)
 )
);
create trigger institutional_deals_updated_at before update on public.institutional_deals for each row execute function public.institutional_set_updated_at();

create table public.institutional_deal_parties (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 party_capacity text not null default 'organization' check(party_capacity in ('organization','individual','service_provider','verifier')),
 profile_id uuid references public.profiles(id) on delete restrict,
 organization_id uuid references public.institutional_organizations(id) on delete restrict, program_id uuid,
 legal_entity_id uuid references public.institutional_legal_entities(id) on delete restrict, party_role text not null,
 representative_profile_id uuid references public.profiles(id) on delete set null,
 authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict,
 authority_status text not null default 'unverified' check(authority_status in ('unverified','pending','verified_for_scope','self_authorized','revoked')),
 approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected','withdrawn','not_required')),
 consent_status text not null default 'not_required' check(consent_status in ('pending','affirmed','declined','withdrawn','not_required')),
 joined_at timestamptz, left_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 check(
  (party_capacity='organization' and organization_id is not null and profile_id is null)
  or
  (party_capacity in ('individual','service_provider','verifier') and profile_id is not null and organization_id is null and program_id is null and legal_entity_id is null and authority_grant_id is null)
 ),
 check(representative_profile_id is null or party_capacity='organization' or representative_profile_id=profile_id),
 check(authority_status<>'verified_for_scope' or (party_capacity='organization' and representative_profile_id is not null and authority_grant_id is not null)),
 unique(id,deal_id)
);
create unique index institutional_deal_parties_org_program_unique on public.institutional_deal_parties(deal_id,organization_id,program_id)
 where party_capacity='organization' and program_id is not null;
create unique index institutional_deal_parties_org_wide_unique on public.institutional_deal_parties(deal_id,organization_id)
 where party_capacity='organization' and program_id is null;
create unique index institutional_deal_parties_profile_unique on public.institutional_deal_parties(deal_id,party_capacity,profile_id)
 where party_capacity in ('individual','service_provider','verifier');
create trigger institutional_deal_parties_updated_at before update on public.institutional_deal_parties for each row execute function public.institutional_set_updated_at();

create or replace function public.institutional_validate_party_capacity()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if new.party_capacity<>'organization' then
  if new.authority_grant_id is not null then
   raise exception 'Personal capacity cannot inherit a delegated organizational authority grant.' using errcode='23514';
  end if;
  if new.authority_status not in('self_authorized','revoked') then
   raise exception 'A personal-capacity party uses self authority, not delegated organizational authority.' using errcode='23514';
  end if;
  if new.approval_status<>'not_required' then
   raise exception 'Organizational approval cannot be required or substituted for a personal-capacity party.' using errcode='23514';
  end if;
 else
  if new.authority_grant_id is not null and not exists(
   select 1 from public.institutional_authority_grants g
   where g.id=new.authority_grant_id and g.profile_id=new.representative_profile_id
    and g.organization_id=new.organization_id and g.program_id is not distinct from new.program_id
    and g.revoked_at is null and g.valid_from<=timezone('utc',now())
    and (g.valid_until is null or g.valid_until>timezone('utc',now()))
    and ('deal:manage'=any(g.permissions) or 'deal:approve'=any(g.permissions))
  ) then
   raise exception 'Organization-party authority grant must exactly match the representative, organization, and program.' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
create trigger institutional_deal_party_capacity_guard before insert or update on public.institutional_deal_parties for each row execute function public.institutional_validate_party_capacity();

create table public.institutional_deal_room_members (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade, party_id uuid, organization_id uuid references public.institutional_organizations(id) on delete cascade,
 verifier_assignment_id uuid, access_scope text not null default 'all_parties' check(access_scope in ('all_parties','party_internal','finance','legal','risk','evidence','operator')),
 can_post boolean not null default true, added_by uuid not null references public.profiles(id) on delete restrict, revoked_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), foreign key(party_id,deal_id) references public.institutional_deal_parties(id,deal_id) on delete cascade,
 unique(deal_id,profile_id,access_scope)
);

create table public.institutional_deal_messages (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 sender_profile_id uuid not null references public.profiles(id) on delete restrict, visibility text not null default 'all_parties' check(visibility in ('all_parties','party_internal','operator_only')),
 organization_id uuid references public.institutional_organizations(id) on delete cascade, body text not null, created_at timestamptz not null default timezone('utc',now())
);

create table public.institutional_proposal_versions (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 version integer not null check(version>0), title text not null, summary text not null default '', terms jsonb not null, terms_hash text not null check(terms_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'draft' check(status in ('draft','proposed','selected','withdrawn','superseded','rejected')),
 created_by uuid not null references public.profiles(id) on delete restrict, proposed_at timestamptz, selected_at timestamptz, superseded_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 unique(deal_id,version), unique(id,deal_id), unique(id,deal_id,terms_hash)
);
create trigger institutional_proposal_versions_updated_at before update on public.institutional_proposal_versions for each row execute function public.institutional_set_updated_at();

create or replace function public.institutional_exact_terms_hash(value jsonb)
returns text language sql immutable set search_path=pg_catalog,extensions as $$
 select encode(extensions.digest(convert_to(value::text,'UTF8'),'sha256'),'hex')
$$;

create or replace function public.institutional_set_exact_terms_hash()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if tg_table_name='institutional_proposal_versions' then
  new.terms_hash:=public.institutional_exact_terms_hash(new.terms);
 elsif tg_table_name='institutional_framework_agreements' then
  new.terms_hash:=public.institutional_exact_terms_hash(new.terms);
 elsif tg_table_name='institutional_pool_terms' then
  new.terms_hash:=public.institutional_exact_terms_hash(jsonb_build_object(
   'threshold_amount_cents',new.threshold_amount_cents,'currency',new.currency,'minimum_contributors',new.minimum_contributors,
   'contribution_deadline',new.contribution_deadline,'activation_rule',new.activation_rule,'contribution_cap_cents',new.contribution_cap_cents,
   'excess_funds_rule',new.excess_funds_rule,'failure_rule',new.failure_rule,'withdrawal_rule',new.withdrawal_rule,
   'governance_rule',new.governance_rule,'governance_config',new.governance_config));
 end if;
 return new;
end $$;
create trigger institutional_proposal_exact_hash before insert or update on public.institutional_proposal_versions for each row execute function public.institutional_set_exact_terms_hash();
alter table public.institutional_deals add constraint institutional_deals_selected_proposal_fk
 foreign key(selected_proposal_version_id,id,selected_terms_hash) references public.institutional_proposal_versions(id,deal_id,terms_hash) deferrable initially deferred;

create table public.institutional_counterfactual_baselines (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade, proposal_version_id uuid,
 party_id uuid not null, profile_id uuid references public.profiles(id) on delete restrict,
 organization_id uuid references public.institutional_organizations(id) on delete restrict, program_id uuid,
 statement text not null, confidence text not null default 'moderate' check(confidence in ('low','moderate','high')), evidence_references jsonb not null default '[]',
 status text not null default 'draft' check(status in ('draft','locked','superseded','expired')), created_by uuid not null references public.profiles(id) on delete restrict,
 locked_at timestamptz, expires_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(party_id,deal_id) references public.institutional_deal_parties(id,deal_id) on delete cascade,
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 foreign key(proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict,
 check((profile_id is not null and organization_id is null and program_id is null) or (profile_id is null and organization_id is not null)),
 unique(deal_id,party_id,proposal_version_id)
);
create trigger institutional_counterfactual_baselines_updated_at before update on public.institutional_counterfactual_baselines for each row execute function public.institutional_set_updated_at();

create table public.institutional_obligations (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade, proposal_version_id uuid not null,
 obligor_party_id uuid not null, beneficiary_party_id uuid, resource_type text not null check(resource_type in ('funding','staff_time','staff_secondment','grantmaking_capacity','research','operations','data','compute','infrastructure','distribution','introductions','other')),
 title text not null, description text not null default '', amount_cents bigint check(amount_cents is null or amount_cents>=0), currency text, quantity numeric, unit text,
 start_at timestamptz, due_at timestamptz, end_at timestamptz,
 status text not null default 'pending' check(status in ('pending','active','blocked','completed','failed','waived','terminated')),
 individual_consent_required boolean not null default false, individual_profile_id uuid references public.profiles(id) on delete restrict,
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict,
 foreign key(obligor_party_id,deal_id) references public.institutional_deal_parties(id,deal_id) on delete restrict,
 foreign key(beneficiary_party_id,deal_id) references public.institutional_deal_parties(id,deal_id) on delete restrict,
 check((individual_consent_required and individual_profile_id is not null) or not individual_consent_required),
 unique(id,deal_id), unique(id,deal_id,proposal_version_id)
);
create trigger institutional_obligations_updated_at before update on public.institutional_obligations for each row execute function public.institutional_set_updated_at();

create table public.institutional_obligation_dependencies (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 obligation_id uuid not null, depends_on_obligation_id uuid not null, dependency_type text not null default 'must_complete_before' check(dependency_type in ('must_complete_before','activates','blocks','evidence_for')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()),
 foreign key(obligation_id,deal_id) references public.institutional_obligations(id,deal_id) on delete cascade,
 foreign key(depends_on_obligation_id,deal_id) references public.institutional_obligations(id,deal_id) on delete cascade,
 check(obligation_id<>depends_on_obligation_id), unique(obligation_id,depends_on_obligation_id,dependency_type)
);

create table public.institutional_approvals (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade, proposal_version_id uuid not null,
 organization_id uuid not null references public.institutional_organizations(id) on delete restrict, program_id uuid,
 approval_kind text not null check(approval_kind in ('program','finance','legal','human_resources','board','committee','pool_participation','risk','completion')),
 required_role text not null default 'approver', requested_from_profile_id uuid not null references public.profiles(id) on delete restrict,
 requested_by uuid not null references public.profiles(id) on delete restrict, authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict,
 decision text not null default 'pending' check(decision in ('pending','approve','reject','abstain','withdrawn')), decision_note text,
 decided_by uuid references public.profiles(id) on delete restrict, decided_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict,
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 unique(deal_id,proposal_version_id,organization_id,program_id,approval_kind,requested_from_profile_id)
);
create trigger institutional_approvals_updated_at before update on public.institutional_approvals for each row execute function public.institutional_set_updated_at();
create unique index institutional_approvals_orgwide_unique on public.institutional_approvals(deal_id,proposal_version_id,organization_id,approval_kind,requested_from_profile_id) where program_id is null;

create table public.institutional_individual_consents (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade, proposal_version_id uuid not null,
 obligation_id uuid not null, individual_profile_id uuid not null references public.profiles(id) on delete cascade,
 terms_hash text not null, decision text not null default 'pending' check(decision in ('pending','affirmed','declined','withdrawn','expired')),
 decision_note text, requested_by uuid not null references public.profiles(id) on delete restrict, requested_at timestamptz not null default timezone('utc',now()),
 decided_at timestamptz, withdrawn_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(proposal_version_id,deal_id,terms_hash) references public.institutional_proposal_versions(id,deal_id,terms_hash) on delete restrict,
 foreign key(obligation_id,deal_id,proposal_version_id) references public.institutional_obligations(id,deal_id,proposal_version_id) on delete cascade,
 unique(obligation_id,individual_profile_id,terms_hash)
);
create trigger institutional_individual_consents_updated_at before update on public.institutional_individual_consents for each row execute function public.institutional_set_updated_at();

create table public.institutional_signatures (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 proposal_version_id uuid not null, terms_hash text not null, party_id uuid not null,
 party_capacity text not null check(party_capacity in ('organization','individual','service_provider','verifier')),
 profile_id uuid references public.profiles(id) on delete restrict,
 organization_id uuid references public.institutional_organizations(id) on delete restrict, program_id uuid,
 signer_profile_id uuid not null references public.profiles(id) on delete restrict, authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict,
 signature_method text not null default 'authenticated_aal2', signed_at timestamptz not null default timezone('utc',now()), certificate jsonb not null default '{}',
 foreign key(proposal_version_id,deal_id,terms_hash) references public.institutional_proposal_versions(id,deal_id,terms_hash) on delete restrict,
 foreign key(party_id,deal_id) references public.institutional_deal_parties(id,deal_id) on delete restrict,
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 check(
  (party_capacity='organization' and organization_id is not null and profile_id is null and authority_grant_id is not null)
  or
  (party_capacity in ('individual','service_provider','verifier') and profile_id is not null and organization_id is null and program_id is null and authority_grant_id is null and signer_profile_id=profile_id)
 ),
 unique(deal_id,proposal_version_id,terms_hash,party_id)
);

create table public.institutional_budget_accounts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid,
 name text not null, currency text not null default 'usd' check(currency ~ '^[a-z]{3}$'), authorized_cents bigint not null default 0 check(authorized_cents>=0),
 status text not null default 'active' check(status in ('active','frozen','closed')), created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict
);
create trigger institutional_budget_accounts_updated_at before update on public.institutional_budget_accounts for each row execute function public.institutional_set_updated_at();

create table public.institutional_budget_reservations (
 id uuid primary key default gen_random_uuid(), budget_account_id uuid not null references public.institutional_budget_accounts(id) on delete cascade,
 deal_id uuid not null references public.institutional_deals(id) on delete cascade, proposal_version_id uuid, amount_cents bigint not null check(amount_cents>0),
 status text not null default 'tentative' check(status in ('tentative','approved','committed','released','expired','cancelled')),
 idempotency_key text not null, reserved_by uuid not null references public.profiles(id) on delete restrict, approved_by uuid references public.profiles(id) on delete restrict,
 finance_authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict, expires_at timestamptz, released_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict,
 unique(budget_account_id,idempotency_key)
);
create trigger institutional_budget_reservations_updated_at before update on public.institutional_budget_reservations for each row execute function public.institutional_set_updated_at();

create table public.institutional_milestones (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 proposal_version_id uuid not null, obligation_id uuid not null, title text not null, description text not null default '', due_at timestamptz,
 status text not null default 'pending' check(status in ('pending','in_progress','submitted','verified','completed','overdue','waived','failed')),
 created_by uuid not null references public.profiles(id) on delete restrict, completed_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(obligation_id,deal_id,proposal_version_id) references public.institutional_obligations(id,deal_id,proposal_version_id) on delete cascade,
 unique(id,deal_id,obligation_id,proposal_version_id)
);
create trigger institutional_milestones_updated_at before update on public.institutional_milestones for each row execute function public.institutional_set_updated_at();

create table public.institutional_verifier_assignments (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid references public.institutional_organizations(id) on delete set null, verifier_profile_id uuid not null references public.profiles(id) on delete cascade,
 scope text not null, status text not null default 'invited' check(status in ('invited','accepted','declined','revoked','completed')),
 conflict_declaration text, assigned_by uuid not null references public.profiles(id) on delete restrict,
 accepted_at timestamptz, declined_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(deal_id,verifier_profile_id)
);
create trigger institutional_verifier_assignments_updated_at before update on public.institutional_verifier_assignments for each row execute function public.institutional_set_updated_at();
alter table public.institutional_deal_room_members add constraint institutional_room_verifier_assignment_fk foreign key(verifier_assignment_id) references public.institutional_verifier_assignments(id) on delete cascade;

create or replace function public.institutional_validate_room_member_relationship()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare party_row public.institutional_deal_parties; assignment_row public.institutional_verifier_assignments;
begin
 if new.party_id is not null then
  select * into party_row from public.institutional_deal_parties where id=new.party_id and deal_id=new.deal_id;
  if not found then raise exception 'Deal-room party must belong to the same deal.' using errcode='23514'; end if;
  if party_row.party_capacity='organization' then
   if new.organization_id is distinct from party_row.organization_id then
    raise exception 'Deal-room organization must exactly match the organization party.' using errcode='23514';
   end if;
   if not exists(
    select 1 from public.institutional_memberships m
    where m.organization_id=party_row.organization_id and m.profile_id=new.profile_id
     and m.status='active' and m.revoked_at is null
   ) then raise exception 'Organization-scoped room access requires active membership in the exact organization party.' using errcode='23514'; end if;
  else
   if new.profile_id is distinct from party_row.profile_id or new.organization_id is not null then
    raise exception 'Personal-capacity room access must match the named party and cannot imply organization authority.' using errcode='23514';
   end if;
  end if;
 elsif new.organization_id is not null then
  if not exists(
   select 1 from public.institutional_deal_parties p
   where p.deal_id=new.deal_id and p.party_capacity='organization' and p.organization_id=new.organization_id
  ) then raise exception 'Deal-room organization must be an exact organization party to the same deal.' using errcode='23514'; end if;
  if not exists(
   select 1 from public.institutional_memberships m
   where m.organization_id=new.organization_id and m.profile_id=new.profile_id
    and m.status='active' and m.revoked_at is null
  ) then raise exception 'Organization-scoped room access requires active membership in that organization.' using errcode='23514'; end if;
 end if;

 if new.verifier_assignment_id is not null then
  select * into assignment_row from public.institutional_verifier_assignments
  where id=new.verifier_assignment_id and deal_id=new.deal_id;
  if not found or assignment_row.verifier_profile_id<>new.profile_id or assignment_row.status<>'accepted' then
   raise exception 'Independent verifier room access requires the accepted assignment for the same deal and profile.' using errcode='23514';
  end if;
  if new.party_id is not null or new.organization_id is not null or new.access_scope<>'evidence' then
   raise exception 'Independent verifier access is evidence-scoped and cannot imply party or organization authority.' using errcode='23514';
  end if;
 elsif new.party_id is null and new.organization_id is null and exists(
  select 1 from public.institutional_verifier_assignments a
  where a.deal_id=new.deal_id and a.verifier_profile_id=new.profile_id
 ) then
  raise exception 'Generic room access cannot substitute for acceptance of an independent verifier assignment.' using errcode='23514';
 end if;

 if new.access_scope='party_internal' and new.organization_id is null then
  raise exception 'Party-internal room access requires an exact represented organization.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger institutional_room_member_relationship_guard before insert or update on public.institutional_deal_room_members
 for each row execute function public.institutional_validate_room_member_relationship();

create table public.institutional_evidence_requirements (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 proposal_version_id uuid not null, obligation_id uuid not null, milestone_id uuid, title text not null, description text not null default '',
 evidence_type text not null default 'document', verifier_assignment_id uuid references public.institutional_verifier_assignments(id) on delete set null,
 visibility text not null default 'all_parties' check(visibility in ('public','all_parties','party_internal','verifier_only','operator_only')),
 status text not null default 'open' check(status in ('open','satisfied','waived','closed')), created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(obligation_id,deal_id,proposal_version_id) references public.institutional_obligations(id,deal_id,proposal_version_id) on delete cascade,
 foreign key(milestone_id,deal_id,obligation_id,proposal_version_id) references public.institutional_milestones(id,deal_id,obligation_id,proposal_version_id) on delete cascade,
 unique(id,deal_id,proposal_version_id,obligation_id,milestone_id)
);
create trigger institutional_evidence_requirements_updated_at before update on public.institutional_evidence_requirements for each row execute function public.institutional_set_updated_at();

create table public.institutional_evidence_submissions (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 proposal_version_id uuid not null, obligation_id uuid not null, milestone_id uuid, requirement_id uuid not null,
 submitted_by uuid not null references public.profiles(id) on delete restrict, evidence jsonb not null,
 status text not null default 'submitted' check(status in ('submitted','needs_revision','accepted','rejected','withdrawn')),
 reviewed_by uuid references public.profiles(id) on delete restrict, review_note text, reviewed_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(requirement_id,deal_id,proposal_version_id,obligation_id,milestone_id) references public.institutional_evidence_requirements(id,deal_id,proposal_version_id,obligation_id,milestone_id) on delete cascade
);
create trigger institutional_evidence_submissions_updated_at before update on public.institutional_evidence_submissions for each row execute function public.institutional_set_updated_at();

create table public.institutional_risk_reviews (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid references public.institutional_organizations(id) on delete set null, proposal_version_id uuid,
 category text not null check(category in ('authority','conflict_of_interest','legal_policy','externality','threat_or_coercion','manufactured_baseline','individual_autonomy','sanctions','privacy_security','research_integrity','financial','operational','other')),
 severity text not null check(severity in ('low','medium','high','critical')), finding text not null, mitigation text,
 status text not null default 'open' check(status in ('open','needs_information','mitigated','accepted','blocked','closed')),
 visibility text not null default 'operator_only' check(visibility in ('all_parties','party_internal','operator_only')), nonwaivable boolean not null default false,
 reviewer_profile_id uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict
);
create trigger institutional_risk_reviews_updated_at before update on public.institutional_risk_reviews for each row execute function public.institutional_set_updated_at();

create table public.institutional_amendments (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 from_proposal_version_id uuid not null, to_proposal_version_id uuid not null, reason text not null,
 status text not null default 'proposed' check(status in ('proposed','approved','rejected','withdrawn')),
 created_by uuid not null references public.profiles(id) on delete restrict, approved_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(from_proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict,
 foreign key(to_proposal_version_id,deal_id) references public.institutional_proposal_versions(id,deal_id) on delete restrict,
 check(from_proposal_version_id<>to_proposal_version_id)
);
create trigger institutional_amendments_updated_at before update on public.institutional_amendments for each row execute function public.institutional_set_updated_at();

create table public.institutional_disputes (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 opened_by_party_id uuid not null, summary text not null,
 stage text not null default 'concern_raised' check(stage in ('concern_raised','informal_resolution','formal_notice','cure_period','mediation','arbitration','litigation','resolved','terminated')),
 confidential boolean not null default true, opened_by uuid not null references public.profiles(id) on delete restrict, resolved_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(opened_by_party_id,deal_id) references public.institutional_deal_parties(id,deal_id) on delete restrict
);
create trigger institutional_disputes_updated_at before update on public.institutional_disputes for each row execute function public.institutional_set_updated_at();

create table public.institutional_dispute_events (
 id uuid primary key default gen_random_uuid(), dispute_id uuid not null references public.institutional_disputes(id) on delete cascade,
 actor_profile_id uuid not null references public.profiles(id) on delete restrict, event_type text not null, note text not null default '', attachments jsonb not null default '[]',
 created_at timestamptz not null default timezone('utc',now())
);

create table public.institutional_templates (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.institutional_organizations(id) on delete cascade, program_id uuid,
 template_type text not null, name text not null, content jsonb not null, status text not null default 'draft' check(status in ('draft','active','retired')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade
);
create trigger institutional_templates_updated_at before update on public.institutional_templates for each row execute function public.institutional_set_updated_at();

create table public.institutional_framework_agreements (
 id uuid primary key default gen_random_uuid(), organization_a_id uuid not null references public.institutional_organizations(id) on delete restrict,
 organization_b_id uuid not null references public.institutional_organizations(id) on delete restrict, title text not null, terms jsonb not null,
 terms_hash text not null check(terms_hash ~ '^[0-9a-f]{64}$'), status text not null default 'draft' check(status in ('draft','active','expired','terminated')),
 effective_from timestamptz, effective_until timestamptz, created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), check(organization_a_id<>organization_b_id)
);
create trigger institutional_framework_agreements_updated_at before update on public.institutional_framework_agreements for each row execute function public.institutional_set_updated_at();
create trigger institutional_framework_exact_hash before insert or update on public.institutional_framework_agreements for each row execute function public.institutional_set_exact_terms_hash();

create table public.institutional_attribution_claims (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid references public.institutional_organizations(id) on delete cascade, profile_id uuid references public.profiles(id) on delete cascade,
 claim_type text not null, claim_text text not null, qualification text, status text not null default 'proposed' check(status in ('proposed','approved','rejected','withdrawn')),
 visibility text not null default 'private' check(visibility in ('private','embargoed','public','anonymized')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 check(organization_id is not null or profile_id is not null)
);
create trigger institutional_attribution_claims_updated_at before update on public.institutional_attribution_claims for each row execute function public.institutional_set_updated_at();

create table public.institutional_report_snapshots (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 report_type text not null, snapshot jsonb not null, generated_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now())
);

create table public.institutional_command_drafts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid,
 profile_id uuid not null references public.profiles(id) on delete cascade, command_text text not null, interpreted_action text not null, payload jsonb not null default '{}',
 status text not null default 'draft' check(status in ('draft','confirmed','discarded','expired')), confirmed_at timestamptz, created_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade
);

create table public.institutional_pool_terms (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null unique references public.institutional_deals(id) on delete cascade,
 threshold_amount_cents bigint not null check(threshold_amount_cents>0), currency text not null default 'usd', minimum_contributors integer not null default 2 check(minimum_contributors>=2),
 contribution_deadline timestamptz not null, activation_rule text not null check(activation_rule in ('threshold_only','governance_vote_and_threshold','unanimous','operator_confirmed')),
 contribution_cap_cents bigint check(contribution_cap_cents is null or contribution_cap_cents>0), excess_funds_rule text not null, failure_rule text not null, withdrawal_rule text not null,
 governance_rule text not null check(governance_rule in ('one_organization_one_vote','contribution_weighted','unanimous','custom')), governance_config jsonb not null default '{}',
 terms_hash text not null check(terms_hash ~ '^[0-9a-f]{64}$'), status text not null default 'draft' check(status in ('draft','open','ready','active','failed','completed','cancelled')),
 activated_at timestamptz, created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create trigger institutional_pool_terms_updated_at before update on public.institutional_pool_terms for each row execute function public.institutional_set_updated_at();
create trigger institutional_pool_exact_hash before insert or update on public.institutional_pool_terms for each row execute function public.institutional_set_exact_terms_hash();

create table public.institutional_pool_contributions (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid not null references public.institutional_organizations(id) on delete restrict, program_id uuid, amount_cents bigint not null check(amount_cents>0),
 status text not null default 'pledged' check(status in ('pledged','committed','withdrawn','released','paid','refunded')),
 approval_status text not null default 'pending' check(approval_status in ('pending','approved','rejected','withdrawn')),
 terms_hash text not null check(terms_hash ~ '^[0-9a-f]{64}$'), budget_reservation_id uuid references public.institutional_budget_reservations(id) on delete restrict,
 finance_authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict,
 created_by uuid not null references public.profiles(id) on delete restrict, committed_by uuid references public.profiles(id) on delete restrict,
 committed_at timestamptz, withdrawn_at timestamptz, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 unique(deal_id,organization_id,program_id)
);
create trigger institutional_pool_contributions_updated_at before update on public.institutional_pool_contributions for each row execute function public.institutional_set_updated_at();
create unique index institutional_pool_contributions_orgwide_unique on public.institutional_pool_contributions(deal_id,organization_id) where program_id is null;

create table public.institutional_pool_anchors (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid not null references public.institutional_organizations(id) on delete restrict, program_id uuid,
 contribution_id uuid not null references public.institutional_pool_contributions(id) on delete cascade, amount_cents bigint not null check(amount_cents>0),
 status text not null default 'proposed' check(status in ('proposed','committed','released','fulfilled','cancelled')), terms_hash text not null,
 authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict, committed_by uuid references public.profiles(id) on delete restrict,
 committed_at timestamptz, created_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict
);
create unique index institutional_pool_anchors_program_unique on public.institutional_pool_anchors(deal_id,organization_id,program_id,contribution_id) where program_id is not null;
create unique index institutional_pool_anchors_orgwide_unique on public.institutional_pool_anchors(deal_id,organization_id,contribution_id) where program_id is null;

create table public.institutional_pool_underwritings (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid not null references public.institutional_organizations(id) on delete restrict, program_id uuid,
 maximum_amount_cents bigint not null check(maximum_amount_cents>0), status text not null default 'proposed' check(status in ('proposed','committed','drawn','released','fulfilled','cancelled')),
 terms_hash text not null, budget_reservation_id uuid references public.institutional_budget_reservations(id) on delete restrict,
 authority_grant_id uuid references public.institutional_authority_grants(id) on delete restrict, committed_by uuid references public.profiles(id) on delete restrict,
 committed_at timestamptz, created_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict
);
create unique index institutional_pool_underwritings_program_unique on public.institutional_pool_underwritings(deal_id,organization_id,program_id) where program_id is not null;
create unique index institutional_pool_underwritings_orgwide_unique on public.institutional_pool_underwritings(deal_id,organization_id) where program_id is null;

create table public.institutional_pool_votes (
 id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.institutional_deals(id) on delete cascade,
 organization_id uuid not null references public.institutional_organizations(id) on delete restrict, program_id uuid,
 proposal_key text not null check(proposal_key in ('activation','amendment','termination','dispute_resolution')),
 vote text not null check(vote in ('approve','reject','abstain')), terms_hash text not null,
 voter_profile_id uuid not null references public.profiles(id) on delete restrict, authority_grant_id uuid not null references public.institutional_authority_grants(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete restrict,
 unique(deal_id,organization_id,program_id,proposal_key)
);
create trigger institutional_pool_votes_updated_at before update on public.institutional_pool_votes for each row execute function public.institutional_set_updated_at();
create unique index institutional_pool_votes_orgwide_unique on public.institutional_pool_votes(deal_id,organization_id,proposal_key) where program_id is null;

create table public.institutional_integrations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade, program_id uuid,
 integration_type text not null check(integration_type in ('webhook','api','esignature','payment','registry','storage','other')), name text not null,
 configuration jsonb not null default '{}', credential_reference text, status text not null default 'draft' check(status in ('draft','active','disabled','revoked')),
 created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 foreign key(program_id,organization_id) references public.institutional_programs(id,organization_id) on delete cascade
);
create trigger institutional_integrations_updated_at before update on public.institutional_integrations for each row execute function public.institutional_set_updated_at();

create table public.institutional_webhooks (
 id uuid primary key default gen_random_uuid(), integration_id uuid not null references public.institutional_integrations(id) on delete cascade,
 endpoint_url text not null check(endpoint_url ~ '^https://'), supported_events text[] not null, secret_reference text not null,
 status text not null default 'draft' check(status in ('draft','active','disabled','revoked')), created_by uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create trigger institutional_webhooks_updated_at before update on public.institutional_webhooks for each row execute function public.institutional_set_updated_at();

create table public.institutional_webhook_deliveries (
 id uuid primary key default gen_random_uuid(), webhook_id uuid not null references public.institutional_webhooks(id) on delete cascade,
 event_type text not null, event_id uuid not null default gen_random_uuid(), payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','delivering','delivered','failed','dead_letter')), attempt_count integer not null default 0,
 next_attempt_at timestamptz, response_status integer, response_reference text, delivered_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(webhook_id,event_id)
);
create trigger institutional_webhook_deliveries_updated_at before update on public.institutional_webhook_deliveries for each row execute function public.institutional_set_updated_at();

create table public.institutional_one_time_secrets (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.institutional_organizations(id) on delete cascade,
 created_for_profile_id uuid not null references public.profiles(id) on delete cascade, secret_ciphertext text not null, purpose text not null,
 expires_at timestamptz not null, revealed_at timestamptz, created_at timestamptz not null default timezone('utc',now()), check(expires_at>created_at)
);

create table public.institutional_audit_events (
 id uuid primary key default gen_random_uuid(), deal_id uuid references public.institutional_deals(id) on delete cascade,
 actor_profile_id uuid references public.profiles(id) on delete set null, actor_type text not null default 'human' check(actor_type in ('human','service','operator','system')),
 represented_organization_id uuid references public.institutional_organizations(id) on delete set null, represented_program_id uuid references public.institutional_programs(id) on delete set null,
 event_type text not null, entity_type text not null, entity_id uuid, authority_basis text, trace_id text, previous_state jsonb, new_state jsonb,
 occurred_at timestamptz not null default timezone('utc',now())
);

-- Exact organization/program scope and relationship integrity.
create or replace function public.institutional_validate_exact_scope()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare party_row public.institutional_deal_parties;
begin
 if tg_table_name='institutional_counterfactual_baselines' then
  select * into party_row from public.institutional_deal_parties where id=new.party_id;
  if not found or party_row.deal_id<>new.deal_id then raise exception 'Baseline party must belong to the same deal.' using errcode='23514'; end if;
  if party_row.profile_id is distinct from new.profile_id
     or party_row.organization_id is distinct from new.organization_id
     or party_row.program_id is distinct from new.program_id then
   raise exception 'Baseline profile or organization/program scope must exactly match the deal party.' using errcode='23514';
  end if;
 elsif tg_table_name='institutional_approvals' then
  if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=new.deal_id and p.party_capacity='organization' and p.organization_id=new.organization_id and p.program_id is not distinct from new.program_id) then
   raise exception 'Approval organization/program scope must exactly match an organization deal party.' using errcode='23514';
  end if;
  if new.authority_grant_id is not null and not exists(
   select 1 from public.institutional_authority_grants g where g.id=new.authority_grant_id and g.organization_id=new.organization_id
    and g.program_id is not distinct from new.program_id and g.profile_id=coalesce(new.decided_by,new.requested_from_profile_id)
  ) then raise exception 'Approval authority grant must exactly match organization, program, and decision maker.' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create trigger institutional_baseline_exact_scope before insert or update on public.institutional_counterfactual_baselines for each row execute function public.institutional_validate_exact_scope();
create trigger institutional_approval_exact_scope before insert or update on public.institutional_approvals for each row execute function public.institutional_validate_exact_scope();

create or replace function public.institutional_lock_baseline()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='DELETE' and pg_trigger_depth()>1 then return old; end if;
 if old.status='locked' then raise exception 'Locked counterfactual baselines are immutable.' using errcode='55000'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger institutional_baseline_immutable before update or delete on public.institutional_counterfactual_baselines for each row execute function public.institutional_lock_baseline();

create or replace function public.institutional_lock_proposal()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='DELETE' and pg_trigger_depth()>1 then return old; end if;
 if old.status='selected' then
  if tg_op='DELETE' or new.deal_id<>old.deal_id or new.version<>old.version or new.title<>old.title or new.summary<>old.summary or new.terms<>old.terms or new.terms_hash<>old.terms_hash or new.created_by<>old.created_by or new.created_at<>old.created_at then
   raise exception 'Selected proposal versions are immutable.' using errcode='55000';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger institutional_proposal_immutable before update or delete on public.institutional_proposal_versions for each row execute function public.institutional_lock_proposal();

create or replace function public.institutional_lock_signature()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='DELETE' and pg_trigger_depth()>1 then return old; end if;
 raise exception 'Institutional signatures are immutable exact-term records.' using errcode='55000';
end $$;
create trigger institutional_signature_immutable before update or delete on public.institutional_signatures for each row execute function public.institutional_lock_signature();

create or replace function public.institutional_lock_signed_deal()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if (old.signed_at is not null or exists(select 1 from public.institutional_signatures s where s.deal_id=old.id)) and (
  new.lead_capacity<>old.lead_capacity or new.lead_profile_id is distinct from old.lead_profile_id or
  new.lead_organization_id is distinct from old.lead_organization_id or new.lead_program_id is distinct from old.lead_program_id or
  new.legal_counterparty_id is distinct from old.legal_counterparty_id or new.deal_type<>old.deal_type or new.classification<>old.classification or
  new.selected_proposal_version_id is distinct from old.selected_proposal_version_id or new.selected_terms_hash is distinct from old.selected_terms_hash or
  new.title<>old.title or new.summary<>old.summary
 ) then raise exception 'Signed deal records are immutable and exact-term-bound.' using errcode='55000'; end if;
 return new;
end $$;
create trigger institutional_signed_deal_immutable before update on public.institutional_deals for each row execute function public.institutional_lock_signed_deal();

create or replace function public.institutional_validate_room_member()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare party_row public.institutional_deal_parties;
begin
 if new.verifier_assignment_id is not null and not exists(
  select 1 from public.institutional_verifier_assignments a where a.id=new.verifier_assignment_id and a.deal_id=new.deal_id
   and a.verifier_profile_id=new.profile_id and a.status='accepted' and a.accepted_at is not null
 ) then raise exception 'Independent verifier must accept the assignment before confidential deal-room access.' using errcode='42501'; end if;
 if new.party_id is not null then
  select * into party_row from public.institutional_deal_parties where id=new.party_id and deal_id=new.deal_id;
  if not found then raise exception 'Deal-room party must belong to the same deal.' using errcode='23514'; end if;
  if party_row.party_capacity='organization' then
   if new.organization_id is distinct from party_row.organization_id then raise exception 'Organization deal-room membership must use the exact party organization.' using errcode='23514'; end if;
  elsif new.profile_id<>party_row.profile_id or new.organization_id is not null then
   raise exception 'Personal-capacity deal-room membership must belong to that exact person and cannot inherit an organization.' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
create trigger institutional_room_member_relationship before insert or update on public.institutional_deal_room_members for each row execute function public.institutional_validate_room_member();

create or replace function public.institutional_prevent_dependency_cycle()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if exists(
  with recursive walk(obligation_id,depends_on_obligation_id) as (
   select d.obligation_id,d.depends_on_obligation_id from public.institutional_obligation_dependencies d where d.deal_id=new.deal_id
   union
   select d.obligation_id,d.depends_on_obligation_id from public.institutional_obligation_dependencies d join walk w on d.obligation_id=w.depends_on_obligation_id where d.deal_id=new.deal_id
  ) select 1 from walk where obligation_id=new.depends_on_obligation_id and depends_on_obligation_id=new.obligation_id
 ) then raise exception 'Obligation dependency would create a circular dependency.' using errcode='23514'; end if;
 return new;
end $$;
create constraint trigger institutional_dependency_no_cycle after insert or update on public.institutional_obligation_dependencies deferrable initially immediate for each row execute function public.institutional_prevent_dependency_cycle();

create or replace function public.institutional_validate_obligation_party()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare obligor public.institutional_deal_parties;
begin
 select * into obligor from public.institutional_deal_parties where id=new.obligor_party_id and deal_id=new.deal_id;
 if not found then raise exception 'Obligor party must belong to the same deal.' using errcode='23514'; end if;
 if obligor.party_capacity in('individual','service_provider','verifier') then
  if new.individual_profile_id is null then new.individual_profile_id:=obligor.profile_id; end if;
  if new.individual_profile_id is distinct from obligor.profile_id then
   raise exception 'A personal-capacity obligation cannot name or bind a different individual.' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
create trigger institutional_obligation_party_relationship before insert or update on public.institutional_obligations for each row execute function public.institutional_validate_obligation_party();

create or replace function public.institutional_validate_signature_party()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare party_row public.institutional_deal_parties;
begin
 select * into party_row from public.institutional_deal_parties where id=new.party_id and deal_id=new.deal_id;
 if not found then raise exception 'Signature party must belong to the same deal.' using errcode='23514'; end if;
 if party_row.party_capacity is distinct from new.party_capacity
    or party_row.profile_id is distinct from new.profile_id
    or party_row.organization_id is distinct from new.organization_id
    or party_row.program_id is distinct from new.program_id then
  raise exception 'Signature capacity and scope must exactly match the signed deal party.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger institutional_signature_party_relationship before insert or update on public.institutional_signatures for each row execute function public.institutional_validate_signature_party();

create or replace function public.institutional_validate_consent()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.institutional_obligations o where o.id=new.obligation_id and o.deal_id=new.deal_id and o.proposal_version_id=new.proposal_version_id and o.individual_consent_required and o.individual_profile_id=new.individual_profile_id) then
  raise exception 'Named-person consent must match the exact consent-required obligation.' using errcode='23514';
 end if;
 return new;
end $$;
create trigger institutional_individual_consent_relationship before insert or update on public.institutional_individual_consents for each row execute function public.institutional_validate_consent();

create or replace function public.institutional_lock_pool_terms()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if old.status in('open','ready','active','completed') and (
  new.threshold_amount_cents<>old.threshold_amount_cents or new.currency<>old.currency or new.minimum_contributors<>old.minimum_contributors or
  new.contribution_deadline<>old.contribution_deadline or new.activation_rule<>old.activation_rule or new.contribution_cap_cents is distinct from old.contribution_cap_cents or
  new.excess_funds_rule<>old.excess_funds_rule or new.failure_rule<>old.failure_rule or new.withdrawal_rule<>old.withdrawal_rule or
  new.governance_rule<>old.governance_rule or new.governance_config<>old.governance_config or new.terms_hash<>old.terms_hash
 ) then raise exception 'Open institutional pool economic and governance terms are immutable.' using errcode='55000'; end if;
 return new;
end $$;
create trigger institutional_pool_terms_immutable before update on public.institutional_pool_terms for each row execute function public.institutional_lock_pool_terms();

create or replace function public.institutional_guard_pool_status_transition()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='INSERT' and new.status not in('draft','open','ready') then
  raise exception 'A pool may become active only through the atomic activation function.' using errcode='42501';
 end if;
 if tg_op='UPDATE' and old.status<>'active' and new.status='active'
    and current_setting('app.institutional_pool_activation_id',true) is distinct from new.id::text then
  raise exception 'A pool may become active only after the atomic threshold, vote, anchor, underwriting, and deadline checks.' using errcode='42501';
 end if;
 return new;
end $$;
create trigger institutional_pool_status_transition_guard before insert or update on public.institutional_pool_terms for each row execute function public.institutional_guard_pool_status_transition();

create or replace function public.institutional_lock_framework()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if old.status='active' and (new.organization_a_id<>old.organization_a_id or new.organization_b_id<>old.organization_b_id or new.terms<>old.terms or new.terms_hash<>old.terms_hash or new.title<>old.title) then
  raise exception 'Active framework agreement terms are immutable.' using errcode='55000';
 end if; return new;
end $$;
create trigger institutional_framework_terms_immutable before update on public.institutional_framework_agreements for each row execute function public.institutional_lock_framework();

create or replace function public.institutional_json_contains_secret(payload jsonb)
returns boolean language plpgsql immutable set search_path=pg_catalog,public as $$
declare item record; scalar text;
begin
 if payload is null then return false; end if;
 if jsonb_typeof(payload)='object' then
  for item in select entry.key,entry.value as nested from jsonb_each(payload) as entry(key,value) loop
   if lower(item.key) ~ '(secret|password|passwd|token|api[_-]?key|private[_-]?key|authorization|credential)' then return true; end if;
   if public.institutional_json_contains_secret(item.nested) then return true; end if;
  end loop;
 elsif jsonb_typeof(payload)='array' then
  for item in select element.value as nested from jsonb_array_elements(payload) as element(value) loop if public.institutional_json_contains_secret(item.nested) then return true; end if; end loop;
 elsif jsonb_typeof(payload)='string' then
  scalar:=trim(both '"' from payload::text);
  if scalar ~* '(^|[[:space:]])(bearer[[:space:]]+[a-z0-9._~-]{12,}|sk_(live|test)_[a-z0-9]{12,}|whsec_[a-z0-9]{12,}|-----begin [a-z ]*private key-----|gh[pousr]_[a-z0-9]{20,})' then return true; end if;
 end if;
 return false;
end $$;

create or replace function public.institutional_validate_integration_configuration()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if public.institutional_json_contains_secret(new.configuration) then raise exception 'Integration configuration must not embed secrets; use a credential reference.' using errcode='23514'; end if;
 if new.credential_reference is not null and length(trim(new.credential_reference))<3 then raise exception 'Credential reference is invalid.' using errcode='23514'; end if;
 return new;
end $$;
create trigger institutional_integration_no_embedded_secrets before insert or update on public.institutional_integrations for each row execute function public.institutional_validate_integration_configuration();

create or replace function public.institutional_supported_webhook_events()
returns text[] language sql immutable set search_path=pg_catalog as $$
 select array['deal.signed','deal.stage_changed','obligation.updated','milestone.due','evidence.submitted','pool.activated','pool.contribution.updated','dispute.opened']::text[]
$$;
create or replace function public.institutional_validate_webhook()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare event_name text;
begin
 if cardinality(new.supported_events)=0 then raise exception 'Webhook must subscribe to at least one supported event.' using errcode='23514'; end if;
 foreach event_name in array new.supported_events loop
  if not event_name=any(public.institutional_supported_webhook_events()) then raise exception 'Unsupported institutional webhook event: %',event_name using errcode='23514'; end if;
 end loop;
 if new.endpoint_url !~ '^https://[^/@:]+(:443)?(/|$)' then raise exception 'Webhook endpoint must be public HTTPS without embedded credentials or non-standard ports.' using errcode='23514'; end if;
 return new;
end $$;
create trigger institutional_webhook_supported_events before insert or update on public.institutional_webhooks for each row execute function public.institutional_validate_webhook();

create or replace function public.institutional_validate_pool_record()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare pool_row public.institutional_pool_terms; account_row public.institutional_budget_accounts; reservation_row public.institutional_budget_reservations;
begin
 select * into pool_row from public.institutional_pool_terms where deal_id=new.deal_id;
 if not found then raise exception 'Pool terms do not exist for the deal.' using errcode='23503'; end if;
 if new.terms_hash<>pool_row.terms_hash then raise exception 'Pool record is not bound to the current exact terms.' using errcode='23514'; end if;
 if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=new.deal_id and p.party_capacity='organization' and p.organization_id=new.organization_id and p.program_id is not distinct from new.program_id) then
  raise exception 'Pool organization/program is not an eligible exact-scope organization deal party.' using errcode='23514';
 end if;
 if tg_table_name='institutional_pool_contributions' and new.status in('committed','paid') then
  if new.budget_reservation_id is null or new.finance_authority_grant_id is null or new.committed_by is null then
   raise exception 'Committed pool contribution requires a financial reservation, finance authority, and committing actor.' using errcode='23514';
  end if;
  select * into reservation_row from public.institutional_budget_reservations where id=new.budget_reservation_id;
  if not found or reservation_row.deal_id<>new.deal_id or reservation_row.amount_cents<new.amount_cents or reservation_row.status not in('approved','committed') then
   raise exception 'Pool contribution financial reservation is invalid for this deal and amount.' using errcode='23514';
  end if;
  select * into account_row from public.institutional_budget_accounts where id=reservation_row.budget_account_id;
  if account_row.organization_id<>new.organization_id or account_row.program_id is distinct from new.program_id then
   raise exception 'Pool contribution reservation must belong to the exact organization/program.' using errcode='23514';
  end if;
  if not exists(select 1 from public.institutional_authority_grants g where g.id=new.finance_authority_grant_id and g.profile_id=new.committed_by
   and g.organization_id=new.organization_id and g.program_id is not distinct from new.program_id and 'finance:reserve'=any(g.permissions)
   and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
   and (g.amount_limit_cents is null or g.amount_limit_cents>=new.amount_cents)) then
   raise exception 'Pool contribution lacks valid exact-scope finance reservation authority.' using errcode='42501';
  end if;
  if not exists(select 1 from public.institutional_approvals a where a.deal_id=new.deal_id and a.organization_id=new.organization_id
   and a.program_id is not distinct from new.program_id and a.approval_kind='pool_participation' and a.decision='approve'
   and a.decided_by is not null and a.decided_by<>new.committed_by) then
   raise exception 'Financial reservation cannot substitute for independent pool participation approval.' using errcode='42501';
  end if;
 elsif tg_table_name='institutional_pool_anchors' and new.status='committed' then
  if not exists(select 1 from public.institutional_pool_contributions c where c.id=new.contribution_id and c.deal_id=new.deal_id
   and c.organization_id=new.organization_id and c.program_id is not distinct from new.program_id and c.status in('committed','paid') and c.amount_cents>=new.amount_cents) then
   raise exception 'Anchor commitment requires an eligible committed contribution for the same exact scope.' using errcode='23514';
  end if;
 elsif tg_table_name='institutional_pool_underwritings' and new.status='committed' then
  if new.budget_reservation_id is null or not exists(select 1 from public.institutional_budget_reservations r
   join public.institutional_budget_accounts a on a.id=r.budget_account_id where r.id=new.budget_reservation_id and r.deal_id=new.deal_id
   and r.amount_cents>=new.maximum_amount_cents and r.status in('approved','committed') and a.organization_id=new.organization_id and a.program_id is not distinct from new.program_id) then
   raise exception 'Committed underwriting requires a sufficient exact-scope financial reservation.' using errcode='23514';
  end if;
 elsif tg_table_name='institutional_pool_votes' then
  if not exists(select 1 from public.institutional_authority_grants g where g.id=new.authority_grant_id and g.profile_id=new.voter_profile_id
   and g.organization_id=new.organization_id and g.program_id is not distinct from new.program_id and 'pool:approve'=any(g.permissions)
   and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))) then
   raise exception 'Pool vote requires valid exact-scope pool approval authority.' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger institutional_pool_contribution_validate before insert or update on public.institutional_pool_contributions for each row execute function public.institutional_validate_pool_record();
create trigger institutional_pool_anchor_validate before insert or update on public.institutional_pool_anchors for each row execute function public.institutional_validate_pool_record();
create trigger institutional_pool_underwriting_validate before insert or update on public.institutional_pool_underwritings for each row execute function public.institutional_validate_pool_record();
create trigger institutional_pool_vote_validate before insert or update on public.institutional_pool_votes for each row execute function public.institutional_validate_pool_record();

-- Permission/access helpers require exact organization/program equality.
create or replace function public.has_institutional_permission(target_organization_id uuid,target_program_id uuid,target_permission text,target_amount_cents bigint default null)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(
  select 1 from public.institutional_memberships m join public.institutional_authority_grants g on g.organization_id=m.organization_id and g.profile_id=m.profile_id
  where m.profile_id=auth.uid() and m.organization_id=target_organization_id and m.status='active'
   and g.organization_id=target_organization_id and g.program_id is not distinct from target_program_id and target_permission=any(g.permissions)
   and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
   and (target_amount_cents is null or g.amount_limit_cents is null or g.amount_limit_cents>=target_amount_cents)
 )
$$;

create or replace function public.can_read_institutional_deal(target_deal_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (
  exists(select 1 from public.institutional_deal_room_members m where m.deal_id=target_deal_id and m.profile_id=auth.uid() and m.revoked_at is null)
  or exists(select 1 from public.institutional_deal_parties p where p.deal_id=target_deal_id and p.party_capacity in('individual','service_provider','verifier') and p.profile_id=auth.uid())
  or exists(select 1 from public.institutional_deals d where d.id=target_deal_id and d.visibility='public')
 )
$$;

create or replace function public.can_act_for_institutional_party(target_party_id uuid,target_permission text default 'deal:manage')
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(
  select 1 from public.institutional_deal_parties p
  where p.id=target_party_id and (
   (p.party_capacity in('individual','service_provider','verifier') and p.profile_id=auth.uid())
   or
   (p.party_capacity='organization' and public.has_institutional_permission(p.organization_id,p.program_id,target_permission,null))
  )
 )
$$;

create or replace function public.assert_institutional_aal2()
returns void language plpgsql stable security definer set search_path=pg_catalog,auth as $$
begin
 if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'AAL2 step-up authentication is required.' using errcode='42501'; end if;
end $$;

create or replace function public.generate_institutional_matches(target_organization_id uuid)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare generated_count integer;
begin
 perform public.assert_institutional_aal2();
 if not public.is_institutional_organization_member(target_organization_id) then
  raise exception 'Active organization membership is required to generate institutional matches.' using errcode='42501';
 end if;
 with candidate_pairs as (
  select offer.id offer_resource_profile_id,seek.id seek_resource_profile_id,
         offer.organization_id offer_organization_id,seek.organization_id seek_organization_id,
         case when offer.currency is not distinct from seek.currency then 0.9::numeric else 0.8::numeric end score,
         jsonb_build_object('resource_type',offer.resource_type,'offer_program_id',offer.program_id,'seek_program_id',seek.program_id) score_components,
         format('Offer of %s from %s complements a matching need from %s.',offer.resource_type,offer.organization_id,seek.organization_id) explanation
  from public.institutional_resource_profiles offer
  join public.institutional_resource_profiles seek
    on offer.direction='offer' and seek.direction='seek' and offer.resource_type=seek.resource_type
   and offer.organization_id<>seek.organization_id and offer.status='active' and seek.status='active'
  where (
    offer.organization_id=target_organization_id
    and (public.has_institutional_permission(target_organization_id,offer.program_id,'opportunity:manage',null)
      or public.has_institutional_permission(target_organization_id,offer.program_id,'deal:manage',null))
  ) or (
    seek.organization_id=target_organization_id
    and (public.has_institutional_permission(target_organization_id,seek.program_id,'opportunity:manage',null)
      or public.has_institutional_permission(target_organization_id,seek.program_id,'deal:manage',null))
  )
 ), inserted as (
  insert into public.institutional_matches(
   offer_resource_profile_id,seek_resource_profile_id,offer_organization_id,seek_organization_id,
   classification,score,score_components,bargaining_overlap,explanation,status,generated_by
  )
  select offer_resource_profile_id,seek_resource_profile_id,offer_organization_id,seek_organization_id,
         'resource_complementarity',score,score_components,true,explanation,'candidate','deterministic'
  from candidate_pairs
  on conflict(offer_resource_profile_id,seek_resource_profile_id) do update set
   score=excluded.score,score_components=excluded.score_components,bargaining_overlap=excluded.bargaining_overlap,
   explanation=excluded.explanation,generated_by=excluded.generated_by,updated_at=timezone('utc',now())
  returning id
 )
 select count(*) into generated_count from inserted;
 return generated_count;
end $$;

create or replace function public.record_institutional_match_interest(
 target_match_id uuid,
 target_organization_id uuid,
 target_interest text,
 target_note text default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare match_row public.institutional_matches; target_program_id uuid; offer_interest text; seek_interest text;
begin
 perform public.assert_institutional_aal2();
 if target_interest not in('interested','declined','needs_information') then
  raise exception 'Unsupported institutional match interest.' using errcode='23514';
 end if;
 select * into match_row from public.institutional_matches where id=target_match_id for update;
 if not found then raise exception 'Institutional match does not exist.' using errcode='23514'; end if;
 if target_organization_id=match_row.offer_organization_id then
  select program_id into target_program_id from public.institutional_resource_profiles where id=match_row.offer_resource_profile_id;
 elsif target_organization_id=match_row.seek_organization_id then
  select program_id into target_program_id from public.institutional_resource_profiles where id=match_row.seek_resource_profile_id;
 else
  raise exception 'Only an exact matched organization may record interest.' using errcode='42501';
 end if;
 if not public.has_institutional_permission(target_organization_id,target_program_id,'opportunity:manage',null)
    and not public.has_institutional_permission(target_organization_id,target_program_id,'deal:manage',null) then
  raise exception 'Exact-scope opportunity or deal authority is required to record match interest.' using errcode='42501';
 end if;
 insert into public.institutional_match_interests(match_id,organization_id,program_id,profile_id,interest,note)
 values(target_match_id,target_organization_id,target_program_id,auth.uid(),target_interest,nullif(trim(target_note),''))
 on conflict(match_id,organization_id) do update set
  program_id=excluded.program_id,profile_id=excluded.profile_id,interest=excluded.interest,note=excluded.note,updated_at=timezone('utc',now());
 select interest into offer_interest from public.institutional_match_interests where match_id=target_match_id and organization_id=match_row.offer_organization_id;
 select interest into seek_interest from public.institutional_match_interests where match_id=target_match_id and organization_id=match_row.seek_organization_id;
 update public.institutional_matches set status=case
  when offer_interest='declined' or seek_interest='declined' then 'declined'
  when offer_interest='interested' and seek_interest='interested' then 'mutual_interest'
  else 'candidate'
 end where id=target_match_id;
 insert into public.institutional_audit_events(actor_profile_id,represented_organization_id,represented_program_id,event_type,entity_type,entity_id,authority_basis,new_state)
 values(auth.uid(),target_organization_id,target_program_id,'match.interest_recorded','institutional_match',target_match_id,
        'Exact-scope opportunity or deal authority',jsonb_build_object('interest',target_interest));
 return target_match_id;
end $$;

create or replace function public.select_institutional_proposal_version(target_deal_id uuid,target_proposal_version_id uuid,target_organization_id uuid,target_program_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare proposal_row public.institutional_proposal_versions; authority_basis text;
begin
 perform public.assert_institutional_aal2();
 if target_organization_id is null then
  if target_program_id is not null then raise exception 'Personal capacity cannot inherit an organization program.' using errcode='23514'; end if;
  if not exists(
   select 1 from public.institutional_deals d
   where d.id=target_deal_id and d.lead_capacity='individual' and d.lead_profile_id=auth.uid()
  ) or not exists(
   select 1 from public.institutional_deal_parties p
   where p.deal_id=target_deal_id and p.party_capacity in('individual','service_provider','verifier') and p.profile_id=auth.uid()
  ) then raise exception 'Only the personal-capacity deal lead may select exact terms without organizational authority.' using errcode='42501'; end if;
  authority_basis:='Self authority in personal capacity';
 else
  if not public.has_institutional_permission(target_organization_id,target_program_id,'deal:manage',null)
     and not public.has_institutional_permission(target_organization_id,target_program_id,'deal:approve',null) then
   raise exception 'Exact-scope deal management or approval authority is required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=target_deal_id and p.party_capacity='organization' and p.organization_id=target_organization_id and p.program_id is not distinct from target_program_id) then
   raise exception 'Organization/program scope is not an exact organization party to this deal.' using errcode='42501';
  end if;
  authority_basis:='Exact-scope authority grant';
 end if;
 if exists(select 1 from public.institutional_signatures s where s.deal_id=target_deal_id) then
  raise exception 'Selected exact terms cannot change after any party has signed.' using errcode='55000';
 end if;
 select * into proposal_row from public.institutional_proposal_versions where id=target_proposal_version_id and deal_id=target_deal_id and status in('draft','proposed') for update;
 if not found then raise exception 'Proposal version does not belong to this deal or is not selectable.' using errcode='23514'; end if;
 update public.institutional_proposal_versions set status='superseded',superseded_at=timezone('utc',now()) where deal_id=target_deal_id and status='selected' and id<>target_proposal_version_id;
 update public.institutional_proposal_versions set status='selected',selected_at=timezone('utc',now()) where id=target_proposal_version_id;
 update public.institutional_deals set selected_proposal_version_id=target_proposal_version_id,selected_terms_hash=proposal_row.terms_hash,
  stage=case when stage in('draft','exploratory','authorized_for_negotiation') then 'proposed' else stage end where id=target_deal_id;
 insert into public.institutional_audit_events(deal_id,actor_profile_id,represented_organization_id,represented_program_id,event_type,entity_type,entity_id,authority_basis,new_state)
 values(target_deal_id,auth.uid(),target_organization_id,target_program_id,'proposal.selected','proposal_version',target_proposal_version_id,authority_basis,jsonb_build_object('terms_hash',proposal_row.terms_hash));
 return target_proposal_version_id;
end $$;

create or replace function public.accept_institutional_deal_party(target_party_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare party_row public.institutional_deal_parties;
begin
 perform public.assert_institutional_aal2();
 select * into party_row from public.institutional_deal_parties where id=target_party_id for update;
 if not found or party_row.party_capacity not in('individual','service_provider','verifier') or party_row.profile_id<>auth.uid() then
  raise exception 'Only the named personal-capacity participant may accept this deal-party invitation.' using errcode='42501';
 end if;
 insert into public.institutional_individual_profiles(profile_id,status)
 values(auth.uid(),'active') on conflict(profile_id) do update set status='active',updated_at=timezone('utc',now());
 update public.institutional_deal_parties set joined_at=coalesce(joined_at,timezone('utc',now())),left_at=null,
  authority_status='self_authorized',approval_status='not_required' where id=target_party_id;
 insert into public.institutional_deal_room_members(deal_id,profile_id,party_id,organization_id,access_scope,can_post,added_by)
 values(party_row.deal_id,auth.uid(),party_row.id,null,'all_parties',true,auth.uid())
 on conflict(deal_id,profile_id,access_scope) do update set party_id=excluded.party_id,organization_id=null,revoked_at=null,can_post=true;
 return target_party_id;
end $$;

create or replace function public.request_institutional_individual_consent(target_deal_id uuid,target_obligation_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare deal_row public.institutional_deals; obligation_row public.institutional_obligations; consent_id uuid;
begin
 perform public.assert_institutional_aal2();
 if not public.can_manage_institutional_deal(target_deal_id) then raise exception 'Exact-scope deal management or approval authority is required to request consent.' using errcode='42501'; end if;
 select * into deal_row from public.institutional_deals where id=target_deal_id;
 select * into obligation_row from public.institutional_obligations where id=target_obligation_id and deal_id=target_deal_id;
 if not found or not obligation_row.individual_consent_required or obligation_row.individual_profile_id is null then raise exception 'Obligation does not require named-person consent.' using errcode='23514'; end if;
 if deal_row.selected_proposal_version_id is null or obligation_row.proposal_version_id<>deal_row.selected_proposal_version_id then
  raise exception 'Consent must be requested for an obligation under the selected exact proposal.' using errcode='23514';
 end if;
 insert into public.institutional_individual_consents(deal_id,proposal_version_id,obligation_id,individual_profile_id,terms_hash,requested_by)
 values(target_deal_id,deal_row.selected_proposal_version_id,target_obligation_id,obligation_row.individual_profile_id,deal_row.selected_terms_hash,auth.uid())
 on conflict(obligation_id,individual_profile_id,terms_hash) do update set decision='pending',decision_note=null,decided_at=null,withdrawn_at=null,requested_by=excluded.requested_by,requested_at=timezone('utc',now())
 returning id into consent_id;
 return consent_id;
end $$;

create or replace function public.decide_institutional_individual_consent(target_consent_id uuid,target_decision text,target_decision_note text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare consent_row public.institutional_individual_consents;
begin
 perform public.assert_institutional_aal2();
 if target_decision not in('affirmed','declined','withdrawn') then raise exception 'Unsupported individual consent decision.' using errcode='23514'; end if;
 select * into consent_row from public.institutional_individual_consents where id=target_consent_id for update;
 if not found or consent_row.individual_profile_id<>auth.uid() then raise exception 'Only the named individual may decide this consent.' using errcode='42501'; end if;
 if not exists(select 1 from public.institutional_deals d where d.id=consent_row.deal_id and d.selected_proposal_version_id=consent_row.proposal_version_id and d.selected_terms_hash=consent_row.terms_hash) then
  raise exception 'Consent request is stale because selected exact terms changed.' using errcode='23514';
 end if;
 update public.institutional_individual_consents set decision=target_decision,decision_note=nullif(trim(target_decision_note),''),
  decided_at=case when target_decision in('affirmed','declined') then timezone('utc',now()) else decided_at end,
  withdrawn_at=case when target_decision='withdrawn' then timezone('utc',now()) else null end where id=target_consent_id;
 return target_consent_id;
end $$;

create or replace function public.accept_institutional_verifier_assignment(target_assignment_id uuid,target_decision text,target_conflict_declaration text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare assignment_row public.institutional_verifier_assignments;
begin
 perform public.assert_institutional_aal2();
 if target_decision not in('accepted','declined') then raise exception 'Unsupported verifier decision.' using errcode='23514'; end if;
 select * into assignment_row from public.institutional_verifier_assignments where id=target_assignment_id for update;
 if not found or assignment_row.verifier_profile_id<>auth.uid() then raise exception 'Only the invited verifier may decide this assignment.' using errcode='42501'; end if;
 if target_decision='accepted' and length(trim(coalesce(target_conflict_declaration,'')))<3 then raise exception 'Conflict declaration is required before verifier access.' using errcode='23514'; end if;
 update public.institutional_verifier_assignments set status=target_decision,conflict_declaration=nullif(trim(target_conflict_declaration),''),
  accepted_at=case when target_decision='accepted' then timezone('utc',now()) else null end,
  declined_at=case when target_decision='declined' then timezone('utc',now()) else null end where id=target_assignment_id;
 if target_decision='accepted' then
  insert into public.institutional_deal_room_members(deal_id,profile_id,verifier_assignment_id,access_scope,can_post,added_by)
  values(assignment_row.deal_id,assignment_row.verifier_profile_id,assignment_row.id,'evidence',true,assignment_row.verifier_profile_id)
  on conflict(deal_id,profile_id,access_scope) do update set verifier_assignment_id=excluded.verifier_assignment_id,revoked_at=null,can_post=true;
 else delete from public.institutional_deal_room_members where verifier_assignment_id=assignment_row.id;
 end if;
 return target_assignment_id;
end $$;

create or replace function public.sign_institutional_deal(target_deal_id uuid,target_party_id uuid,target_authority_grant_id uuid,target_expected_terms_hash text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare deal_row public.institutional_deals; party_row public.institutional_deal_parties; signature_id uuid; authority_basis text;
begin
 perform public.assert_institutional_aal2();
 select * into deal_row from public.institutional_deals where id=target_deal_id for update;
 if not found or deal_row.selected_proposal_version_id is null or deal_row.selected_terms_hash is null then raise exception 'Deal has no selected exact terms.' using errcode='23514'; end if;
 if target_expected_terms_hash is null or target_expected_terms_hash<>deal_row.selected_terms_hash then raise exception 'Signature request is stale because the selected exact terms changed.' using errcode='23514'; end if;
 select * into party_row from public.institutional_deal_parties where id=target_party_id and deal_id=target_deal_id;
 if not found then raise exception 'Signing party does not belong to the deal.' using errcode='23514'; end if;
 if party_row.joined_at is null or party_row.left_at is not null then raise exception 'The signing party has not accepted active participation in this deal.' using errcode='42501'; end if;
 if party_row.party_capacity='organization' then
  if target_authority_grant_id is null or not exists(select 1 from public.institutional_authority_grants g where g.id=target_authority_grant_id and g.profile_id=auth.uid()
   and g.organization_id=party_row.organization_id and g.program_id is not distinct from party_row.program_id and 'deal:sign'=any(g.permissions)
   and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))) then
   raise exception 'Exact-scope signing authority is required.' using errcode='42501';
  end if;
  if not exists(select 1 from public.institutional_approvals a where a.deal_id=target_deal_id and a.proposal_version_id=deal_row.selected_proposal_version_id
   and a.organization_id=party_row.organization_id and a.program_id is not distinct from party_row.program_id and a.decision='approve') then
   raise exception 'Required exact-scope organizational approval is incomplete.' using errcode='42501';
  end if;
  authority_basis:='Exact-scope delegated organizational signing authority';
 else
  if party_row.profile_id<>auth.uid() then raise exception 'A personal-capacity party may bind only themselves.' using errcode='42501'; end if;
  if party_row.authority_status<>'self_authorized' then raise exception 'Personal-capacity self authority is not active.' using errcode='42501'; end if;
  if target_authority_grant_id is not null then raise exception 'Personal capacity cannot inherit delegated organizational signing authority.' using errcode='23514'; end if;
  authority_basis:='Self authority in personal capacity';
 end if;
 if exists(select 1 from public.institutional_obligations o where o.deal_id=target_deal_id and o.proposal_version_id=deal_row.selected_proposal_version_id
  and o.individual_consent_required and not exists(select 1 from public.institutional_individual_consents c where c.obligation_id=o.id
   and c.individual_profile_id=o.individual_profile_id and c.proposal_version_id=deal_row.selected_proposal_version_id
   and c.terms_hash=deal_row.selected_terms_hash and c.decision='affirmed')) then
  raise exception 'Every named individual must affirmatively consent to the selected exact terms; generic approval cannot substitute.' using errcode='42501';
 end if;
 insert into public.institutional_signatures(deal_id,proposal_version_id,terms_hash,party_id,party_capacity,profile_id,organization_id,program_id,signer_profile_id,authority_grant_id,certificate)
 values(target_deal_id,deal_row.selected_proposal_version_id,deal_row.selected_terms_hash,target_party_id,party_row.party_capacity,party_row.profile_id,party_row.organization_id,party_row.program_id,auth.uid(),target_authority_grant_id,
  jsonb_build_object('aal','aal2','signed_at',timezone('utc',now()),'authority_basis',authority_basis))
 on conflict(deal_id,proposal_version_id,terms_hash,party_id) do nothing returning id into signature_id;
 if signature_id is null then select id into signature_id from public.institutional_signatures where deal_id=target_deal_id and proposal_version_id=deal_row.selected_proposal_version_id and terms_hash=deal_row.selected_terms_hash and party_id=target_party_id; end if;
 if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=target_deal_id and p.joined_at is not null and p.left_at is null and not exists(
  select 1 from public.institutional_signatures s where s.deal_id=target_deal_id and s.proposal_version_id=deal_row.selected_proposal_version_id and s.terms_hash=deal_row.selected_terms_hash and s.party_id=p.id
 )) then update public.institutional_deals set stage='signed',signed_at=coalesce(signed_at,timezone('utc',now())) where id=target_deal_id; end if;
 return signature_id;
end $$;

create or replace function public.record_institutional_pool_approval(target_deal_id uuid,target_organization_id uuid,target_program_id uuid,target_authority_grant_id uuid,target_decision text default 'approve')
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare approval_id uuid; proposal_id uuid; proposal_hash text; pool_row public.institutional_pool_terms;
begin
 perform public.assert_institutional_aal2();
 if target_decision not in('approve','reject','abstain','withdrawn') then raise exception 'Unsupported pool approval decision.' using errcode='23514'; end if;
 if not exists(select 1 from public.institutional_authority_grants g where g.id=target_authority_grant_id and g.profile_id=auth.uid() and g.organization_id=target_organization_id
  and g.program_id is not distinct from target_program_id and 'pool:approve'=any(g.permissions) and g.revoked_at is null
  and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))) then raise exception 'Exact-scope pool approval authority required.' using errcode='42501'; end if;
 if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=target_deal_id and p.organization_id=target_organization_id and p.program_id is not distinct from target_program_id) then raise exception 'Pool approval scope is not an eligible party.' using errcode='42501'; end if;
 select * into pool_row from public.institutional_pool_terms where deal_id=target_deal_id;
 if not found then raise exception 'Pool terms do not exist.' using errcode='23514'; end if;
 select selected_proposal_version_id into proposal_id from public.institutional_deals where id=target_deal_id for update;
 if proposal_id is null then
  insert into public.institutional_proposal_versions(deal_id,version,title,summary,terms,terms_hash,status,created_by,proposed_at,selected_at)
  values(target_deal_id,1,'Pool governing terms','Exact institutional pool terms',jsonb_build_object('pool_terms_hash',pool_row.terms_hash),repeat('0',64),'selected',auth.uid(),timezone('utc',now()),timezone('utc',now()))
  returning id,terms_hash into proposal_id,proposal_hash;
  update public.institutional_deals set selected_proposal_version_id=proposal_id,selected_terms_hash=proposal_hash where id=target_deal_id;
 elsif not exists(
  select 1 from public.institutional_proposal_versions p
  where p.id=proposal_id and p.deal_id=target_deal_id and p.status='selected'
    and p.terms->>'pool_terms_hash'=pool_row.terms_hash
 ) then
  raise exception 'Selected proposal is not bound to the current exact pool terms.' using errcode='23514';
 end if;
 select id into approval_id from public.institutional_approvals
 where deal_id=target_deal_id and proposal_version_id=proposal_id and organization_id=target_organization_id
   and program_id is not distinct from target_program_id and approval_kind='pool_participation'
   and requested_from_profile_id=auth.uid()
 for update;
 if approval_id is null then
  insert into public.institutional_approvals(deal_id,proposal_version_id,organization_id,program_id,approval_kind,requested_from_profile_id,requested_by,authority_grant_id,decision,decision_note,decided_by,decided_at)
  values(target_deal_id,proposal_id,target_organization_id,target_program_id,'pool_participation',auth.uid(),auth.uid(),target_authority_grant_id,target_decision,'Pool participation approval recorded separately from financial reservation.',auth.uid(),timezone('utc',now()))
  returning id into approval_id;
 else
  update public.institutional_approvals set
   decision=target_decision,decision_note='Pool participation approval recorded separately from financial reservation.',
   authority_grant_id=target_authority_grant_id,decided_by=auth.uid(),decided_at=timezone('utc',now())
  where id=approval_id;
 end if;
 return approval_id;
end $$;

create or replace function public.reserve_institutional_budget(target_budget_account_id uuid,target_deal_id uuid,target_amount_cents bigint,target_authority_grant_id uuid,target_idempotency_key text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare account_row public.institutional_budget_accounts; existing_row public.institutional_budget_reservations; available_cents bigint; reservation_id uuid;
begin
 perform public.assert_institutional_aal2();
 if target_amount_cents<=0 then raise exception 'Reservation amount must be positive.' using errcode='23514'; end if;
 if length(trim(coalesce(target_idempotency_key,'')))<8 then raise exception 'A stable reservation idempotency key is required.' using errcode='23514'; end if;
 select * into account_row from public.institutional_budget_accounts where id=target_budget_account_id for update;
 if not found or account_row.status<>'active' then raise exception 'Active budget account required.' using errcode='23514'; end if;
 if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=target_deal_id and p.organization_id=account_row.organization_id and p.program_id is not distinct from account_row.program_id) then
  raise exception 'Budget account organization/program must be an exact party to the deal.' using errcode='42501';
 end if;
 if not exists(select 1 from public.institutional_authority_grants g where g.id=target_authority_grant_id and g.profile_id=auth.uid()
  and g.organization_id=account_row.organization_id and g.program_id is not distinct from account_row.program_id
  and 'finance:reserve'=any(g.permissions) and (g.amount_limit_cents is null or g.amount_limit_cents>=target_amount_cents)
  and g.revoked_at is null and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))) then
  raise exception 'Exact-scope finance reservation authority required.' using errcode='42501';
 end if;
 select * into existing_row from public.institutional_budget_reservations
 where budget_account_id=target_budget_account_id and idempotency_key=target_idempotency_key for update;
 if found then
  if existing_row.deal_id<>target_deal_id or existing_row.amount_cents<>target_amount_cents
     or existing_row.finance_authority_grant_id is distinct from target_authority_grant_id
     or existing_row.reserved_by<>auth.uid() then
   raise exception 'Reservation idempotency key was already used with different exact terms or authority.' using errcode='23514';
  end if;
  return existing_row.id;
 end if;
 select account_row.authorized_cents-coalesce(sum(r.amount_cents) filter(where r.status in('tentative','approved','committed')),0)
 into available_cents from public.institutional_budget_reservations r where r.budget_account_id=target_budget_account_id;
 if available_cents<target_amount_cents then raise exception 'Insufficient unreserved budget.' using errcode='23514'; end if;
 insert into public.institutional_budget_reservations(budget_account_id,deal_id,amount_cents,status,idempotency_key,reserved_by,approved_by,finance_authority_grant_id)
 values(target_budget_account_id,target_deal_id,target_amount_cents,'approved',target_idempotency_key,auth.uid(),auth.uid(),target_authority_grant_id)
 returning id into reservation_id;
 return reservation_id;
end $$;

create or replace function public.save_institutional_pool_contribution(target_deal_id uuid,target_organization_id uuid,target_program_id uuid,target_amount_cents bigint,target_status text,target_budget_reservation_id uuid,target_finance_authority_grant_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare pool_row public.institutional_pool_terms; contribution_id uuid;
begin
 perform public.assert_institutional_aal2();
 if target_status not in('pledged','committed','withdrawn','released','paid','refunded') then raise exception 'Unsupported contribution status.' using errcode='23514'; end if;
 select * into pool_row from public.institutional_pool_terms where deal_id=target_deal_id for update;
 if not found or pool_row.status not in('open','ready','active') then raise exception 'Pool is not accepting contribution updates.' using errcode='23514'; end if;
 if target_amount_cents<=0 or (pool_row.contribution_cap_cents is not null and target_amount_cents>pool_row.contribution_cap_cents) then raise exception 'Contribution amount exceeds pool rules.' using errcode='23514'; end if;
 if target_status in('committed','paid','released','refunded') then
  if target_finance_authority_grant_id is null or not exists(
   select 1 from public.institutional_authority_grants g
   where g.id=target_finance_authority_grant_id and g.profile_id=auth.uid()
    and g.organization_id=target_organization_id and g.program_id is not distinct from target_program_id
    and 'finance:reserve'=any(g.permissions) and g.revoked_at is null
    and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
    and (g.amount_limit_cents is null or g.amount_limit_cents>=target_amount_cents)
  ) then raise exception 'Exact-scope finance authority is required for this contribution state.' using errcode='42501'; end if;
 elsif not public.has_institutional_permission(target_organization_id,target_program_id,'pool:approve',null)
       and not public.has_institutional_permission(target_organization_id,target_program_id,'deal:manage',null) then
  raise exception 'Exact-scope pool approval or deal management authority is required.' using errcode='42501';
 end if;
 select id into contribution_id from public.institutional_pool_contributions
 where deal_id=target_deal_id and organization_id=target_organization_id
   and program_id is not distinct from target_program_id
 for update;
 if contribution_id is null then
  insert into public.institutional_pool_contributions(deal_id,organization_id,program_id,amount_cents,status,approval_status,terms_hash,budget_reservation_id,finance_authority_grant_id,created_by,committed_by,committed_at,withdrawn_at)
  values(target_deal_id,target_organization_id,target_program_id,target_amount_cents,target_status,case when target_status in('committed','paid') then 'approved' when target_status='withdrawn' then 'withdrawn' else 'pending' end,pool_row.terms_hash,target_budget_reservation_id,target_finance_authority_grant_id,auth.uid(),case when target_status in('committed','paid') then auth.uid() else null end,case when target_status in('committed','paid') then timezone('utc',now()) else null end,case when target_status='withdrawn' then timezone('utc',now()) else null end)
  returning id into contribution_id;
 else
  update public.institutional_pool_contributions set
   amount_cents=target_amount_cents,status=target_status,
   approval_status=case when target_status in('committed','paid') then 'approved' when target_status='withdrawn' then 'withdrawn' else 'pending' end,
   terms_hash=pool_row.terms_hash,budget_reservation_id=target_budget_reservation_id,
   finance_authority_grant_id=target_finance_authority_grant_id,
   committed_by=case when target_status in('committed','paid') then auth.uid() else committed_by end,
   committed_at=case when target_status in('committed','paid') then timezone('utc',now()) else committed_at end,
   withdrawn_at=case when target_status='withdrawn' then timezone('utc',now()) else withdrawn_at end
  where id=contribution_id;
 end if;
 return contribution_id;
end $$;

create or replace function public.cast_institutional_pool_vote(target_deal_id uuid,target_organization_id uuid,target_program_id uuid,target_proposal_key text,target_vote text,target_authority_grant_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare pool_row public.institutional_pool_terms; vote_id uuid;
begin
 perform public.assert_institutional_aal2();
 select * into pool_row from public.institutional_pool_terms where deal_id=target_deal_id for update;
 if not found then raise exception 'Pool terms do not exist.' using errcode='23514'; end if;
 select id into vote_id from public.institutional_pool_votes
 where deal_id=target_deal_id and organization_id=target_organization_id
   and program_id is not distinct from target_program_id and proposal_key=target_proposal_key
 for update;
 if vote_id is null then
  insert into public.institutional_pool_votes(deal_id,organization_id,program_id,proposal_key,vote,terms_hash,voter_profile_id,authority_grant_id)
  values(target_deal_id,target_organization_id,target_program_id,target_proposal_key,target_vote,pool_row.terms_hash,auth.uid(),target_authority_grant_id)
  returning id into vote_id;
 else
  update public.institutional_pool_votes set vote=target_vote,terms_hash=pool_row.terms_hash,
   voter_profile_id=auth.uid(),authority_grant_id=target_authority_grant_id
  where id=vote_id;
 end if;
 return vote_id;
end $$;


create or replace function public.institutional_guard_obligation_status_transition()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare deal_row public.institutional_deals;
begin
 if new.status=old.status then return new; end if;
 if not(
  (old.status='pending' and new.status in('active','blocked','completed','failed','waived','terminated')) or
  (old.status='active' and new.status in('blocked','completed','failed','waived','terminated')) or
  (old.status='blocked' and new.status in('active','completed','failed','waived','terminated')) or
  (old.status='failed' and new.status in('active','waived','terminated'))
 ) then
  raise exception 'Invalid institutional obligation status transition.' using errcode='23514';
 end if;
 select * into deal_row from public.institutional_deals where id=new.deal_id;
 if not found then raise exception 'Obligation deal relationship is invalid.' using errcode='23514'; end if;
 if new.status in('active','completed') and deal_row.stage not in('signed','execution','evidence_review','disputed','amended') then
  raise exception 'An obligation cannot become active or complete before the deal is signed.' using errcode='23514';
 end if;
 if new.status='completed' then
  if exists(
   select 1 from public.institutional_obligation_dependencies dependency
   join public.institutional_obligations predecessor on predecessor.id=dependency.depends_on_obligation_id and predecessor.deal_id=new.deal_id
   where dependency.deal_id=new.deal_id and dependency.obligation_id=new.id
     and dependency.dependency_type in('must_complete_before','activates')
     and predecessor.status not in('completed','waived')
  ) then
   raise exception 'Required predecessor obligations must complete before this obligation.' using errcode='23514';
  end if;
  if exists(select 1 from public.institutional_milestones milestone where milestone.obligation_id=new.id and milestone.deal_id=new.deal_id and milestone.status not in('verified','completed','waived')) then
   raise exception 'All obligation milestones must be verified, completed, or waived before completion.' using errcode='23514';
  end if;
  if exists(select 1 from public.institutional_evidence_requirements requirement where requirement.obligation_id=new.id and requirement.deal_id=new.deal_id and requirement.status not in('satisfied','waived','closed')) then
   raise exception 'All obligation evidence requirements must be satisfied, waived, or closed before completion.' using errcode='23514';
  end if;
  if new.individual_consent_required and not exists(
   select 1 from public.institutional_individual_consents consent
   where consent.deal_id=new.deal_id and consent.obligation_id=new.id and consent.individual_profile_id=new.individual_profile_id
     and consent.proposal_version_id=new.proposal_version_id and consent.terms_hash=deal_row.selected_terms_hash and consent.decision='affirmed'
  ) then
   raise exception 'Exact-term named-person consent is required before obligation completion.' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
create trigger institutional_obligation_status_transition_guard before update of status on public.institutional_obligations
for each row execute function public.institutional_guard_obligation_status_transition();

create or replace function public.institutional_guard_milestone_status_transition()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare deal_stage text;
begin
 if new.status=old.status then return new; end if;
 if not(
  (old.status='pending' and new.status in('in_progress','submitted','verified','completed','overdue','waived','failed')) or
  (old.status='in_progress' and new.status in('submitted','verified','completed','overdue','waived','failed')) or
  (old.status='submitted' and new.status in('in_progress','verified','completed','overdue','waived','failed')) or
  (old.status='verified' and new.status in('completed','waived')) or
  (old.status='overdue' and new.status in('in_progress','submitted','verified','completed','waived','failed')) or
  (old.status='failed' and new.status in('in_progress','submitted','waived'))
 ) then
  raise exception 'Invalid institutional milestone status transition.' using errcode='23514';
 end if;
 select stage into deal_stage from public.institutional_deals where id=new.deal_id;
 if deal_stage is null then raise exception 'Milestone deal relationship is invalid.' using errcode='23514'; end if;
 if new.status in('in_progress','submitted','verified','completed') and deal_stage not in('signed','execution','evidence_review','disputed','amended') then
  raise exception 'A milestone cannot progress before the deal is signed.' using errcode='23514';
 end if;
 if new.status in('verified','completed') and exists(
  select 1 from public.institutional_evidence_requirements requirement
  where requirement.milestone_id=new.id and requirement.deal_id=new.deal_id
    and requirement.status not in('satisfied','waived','closed')
 ) then
  raise exception 'Milestone evidence requirements must be satisfied, waived, or closed before verification or completion.' using errcode='23514';
 end if;
 new.completed_at:=case when new.status='completed' then coalesce(new.completed_at,timezone('utc',now())) else new.completed_at end;
 return new;
end $$;
create trigger institutional_milestone_status_transition_guard before update of status on public.institutional_milestones
for each row execute function public.institutional_guard_milestone_status_transition();

create or replace function public.transition_institutional_deal_stage(target_deal_id uuid,target_stage text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare deal_row public.institutional_deals;
begin
 perform public.assert_institutional_aal2();
 select * into deal_row from public.institutional_deals where id=target_deal_id for update;
 if not found or not public.can_manage_institutional_deal(target_deal_id) then raise exception 'Exact-scope deal management or approval authority is required.' using errcode='42501'; end if;
 if target_stage='signed' then
  if deal_row.selected_proposal_version_id is null or deal_row.selected_terms_hash is null then
   raise exception 'A selected exact proposal is required before signing.' using errcode='23514';
  end if;
  if exists(
   select 1 from public.institutional_deal_parties p
   where p.deal_id=target_deal_id and p.joined_at is not null and not exists(
    select 1 from public.institutional_signatures s
    where s.deal_id=target_deal_id and s.proposal_version_id=deal_row.selected_proposal_version_id
      and s.terms_hash=deal_row.selected_terms_hash and s.party_id=p.id
   )
  ) then raise exception 'Every joined party must sign the selected exact terms before the signed stage.' using errcode='23514'; end if;
 end if;
 if not(
  (deal_row.stage='draft' and target_stage in('exploratory','terminated','expired')) or
  (deal_row.stage='exploratory' and target_stage in('authorized_for_negotiation','terminated','expired')) or
  (deal_row.stage='authorized_for_negotiation' and target_stage in('proposed','terminated','expired')) or
  (deal_row.stage='proposed' and target_stage in('term_sheet_agreed','terminated','expired')) or
  (deal_row.stage='term_sheet_agreed' and target_stage in('pending_governance_approval','amended','terminated')) or
  (deal_row.stage='pending_governance_approval' and target_stage in('signed','amended','terminated')) or
  (deal_row.stage='signed' and target_stage in('execution','amended','terminated','disputed')) or
  (deal_row.stage='execution' and target_stage in('evidence_review','amended','terminated','disputed')) or
  (deal_row.stage='evidence_review' and target_stage in('completed','amended','disputed')) or
  (deal_row.stage='disputed' and target_stage in('execution','terminated','completed')) or
  (deal_row.stage='amended' and target_stage in('pending_governance_approval','signed','execution','terminated'))
 ) then raise exception 'Invalid institutional deal stage transition.' using errcode='23514'; end if;
 update public.institutional_deals set stage=target_stage,completed_at=case when target_stage='completed' then timezone('utc',now()) else completed_at end,terminated_at=case when target_stage='terminated' then timezone('utc',now()) else terminated_at end where id=target_deal_id;
 return target_deal_id;
end $$;

create or replace function public.transition_institutional_obligation_status(target_deal_id uuid,target_obligation_id uuid,target_status text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare obligation_row public.institutional_obligations; represented_organization uuid; represented_program uuid;
begin
 perform public.assert_institutional_aal2();
 if target_status not in('pending','active','blocked','completed','failed','waived','terminated') then
  raise exception 'Unsupported institutional obligation status.' using errcode='23514';
 end if;
 select * into obligation_row from public.institutional_obligations where id=target_obligation_id and deal_id=target_deal_id for update;
 if not found then raise exception 'Obligation must belong to the same deal.' using errcode='23514'; end if;
 if not public.can_manage_institutional_deal(target_deal_id) then
  raise exception 'Exact-scope deal management or personal lead authority is required to transition an obligation.' using errcode='42501';
 end if;
 select organization_id,program_id into represented_organization,represented_program
 from public.institutional_deal_parties where id=obligation_row.obligor_party_id and deal_id=target_deal_id;
 update public.institutional_obligations set status=target_status where id=target_obligation_id and deal_id=target_deal_id;
 insert into public.institutional_audit_events(
  deal_id,actor_profile_id,represented_organization_id,represented_program_id,event_type,entity_type,entity_id,authority_basis,previous_state,new_state
 ) values(
  target_deal_id,auth.uid(),represented_organization,represented_program,'obligation.status_transitioned','obligation',target_obligation_id,
  'Exact-scope deal management or personal lead authority',jsonb_build_object('status',obligation_row.status),jsonb_build_object('status',target_status)
 );
 return target_obligation_id;
end $$;

create or replace function public.transition_institutional_milestone_status(target_deal_id uuid,target_milestone_id uuid,target_status text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare milestone_row public.institutional_milestones; obligation_row public.institutional_obligations; represented_organization uuid; represented_program uuid;
begin
 perform public.assert_institutional_aal2();
 if target_status not in('pending','in_progress','submitted','verified','completed','overdue','waived','failed') then
  raise exception 'Unsupported institutional milestone status.' using errcode='23514';
 end if;
 select * into milestone_row from public.institutional_milestones where id=target_milestone_id and deal_id=target_deal_id for update;
 if not found then raise exception 'Milestone must belong to the same deal.' using errcode='23514'; end if;
 if not public.can_manage_institutional_deal(target_deal_id) then
  raise exception 'Exact-scope deal management or personal lead authority is required to transition a milestone.' using errcode='42501';
 end if;
 select * into obligation_row from public.institutional_obligations where id=milestone_row.obligation_id and deal_id=target_deal_id;
 if not found then raise exception 'Milestone obligation relationship is invalid.' using errcode='23514'; end if;
 select organization_id,program_id into represented_organization,represented_program
 from public.institutional_deal_parties where id=obligation_row.obligor_party_id and deal_id=target_deal_id;
 update public.institutional_milestones set status=target_status where id=target_milestone_id and deal_id=target_deal_id;
 insert into public.institutional_audit_events(
  deal_id,actor_profile_id,represented_organization_id,represented_program_id,event_type,entity_type,entity_id,authority_basis,previous_state,new_state
 ) values(
  target_deal_id,auth.uid(),represented_organization,represented_program,'milestone.status_transitioned','milestone',target_milestone_id,
  'Exact-scope deal management or personal lead authority',jsonb_build_object('status',milestone_row.status),jsonb_build_object('status',target_status)
 );
 return target_milestone_id;
end $$;

create or replace view public.institutional_public_organizations with(security_invoker=true) as
 select id,slug,display_name,organization_type,summary,website_url,official_domain,jurisdiction,verification_status,created_at,updated_at
 from public.institutional_organizations where status='active' and public_profile_enabled;
create or replace view public.institutional_public_programs with(security_invoker=true) as
 select id,organization_id,slug,name,summary,mandate_summary,status,created_at,updated_at from public.institutional_programs where status='active' and public_profile_enabled;
create or replace view public.institutional_public_opportunities with(security_invoker=true) as
 select id,organization_id,program_id,title,summary,moral_difference_statement,no_trade_summary,status,published_at,created_at,updated_at
 from public.institutional_opportunities where visibility='public' and status='published';
create or replace view public.institutional_track_record with(security_invoker=true) as
 select o.id organization_id,count(distinct p.deal_id) filter(where d.stage='completed')::bigint completed_deals,
 count(distinct p.deal_id) filter(where d.stage='disputed')::bigint disputed_deals,count(distinct s.id)::bigint signatures,
 count(distinct e.id) filter(where e.status='accepted')::bigint accepted_evidence_submissions
 from public.institutional_organizations o left join public.institutional_deal_parties p on p.organization_id=o.id
 left join public.institutional_deals d on d.id=p.deal_id left join public.institutional_signatures s on s.organization_id=o.id
 left join public.institutional_evidence_submissions e on e.deal_id=d.id group by o.id;

-- Exact-scope access helpers used by row-level security. These functions are
-- SECURITY DEFINER so policy evaluation does not recurse through membership
-- and deal-room policies; they return only a boolean authorization decision.
create or replace function public.is_institutional_organization_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(
  select 1 from public.institutional_memberships m
  where m.organization_id=target_organization_id and m.profile_id=auth.uid()
    and m.status='active' and m.revoked_at is null
 )
$$;

create or replace function public.can_manage_institutional_organization(target_organization_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (
  exists(select 1 from public.institutional_organizations o where o.id=target_organization_id and o.created_by=auth.uid())
  or public.has_institutional_permission(target_organization_id,null,'organization:manage',null)
 )
$$;

create or replace function public.can_manage_institutional_deal(target_deal_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (
  exists(
   select 1 from public.institutional_deals d
   join public.institutional_individual_profiles i on i.profile_id=d.lead_profile_id and i.status='active'
   where d.id=target_deal_id and d.lead_capacity='individual' and d.lead_profile_id=auth.uid()
  )
  or exists(
   select 1 from public.institutional_deals d
   join public.institutional_deal_parties p on p.deal_id=d.id
   where d.id=target_deal_id and d.lead_capacity='organization' and p.party_capacity='organization'
     and (
       public.has_institutional_permission(p.organization_id,p.program_id,'deal:manage',null)
       or public.has_institutional_permission(p.organization_id,p.program_id,'deal:approve',null)
     )
  )
 )
$$;

-- A request-stable, database-owned authorization snapshot keeps the presentation
-- layer deterministic. It is advisory for rendering only: every mutation still
-- rechecks exact scope, time validity, AAL2, and authority in its own database
-- function, trigger, policy, or server action.
create or replace function public.get_institutional_deal_authorization_snapshot(
 target_deal_id uuid,
 target_organization_id uuid default null,
 target_party_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare
 snapshot_as_of timestamptz := now();
 viewer_profile_id uuid := auth.uid();
 deal_row public.institutional_deals;
 party_row public.institutional_deal_parties;
 matching_ids uuid[] := '{}'::uuid[];
 manage_ids uuid[] := '{}'::uuid[];
 approve_ids uuid[] := '{}'::uuid[];
 sign_ids uuid[] := '{}'::uuid[];
 reserve_ids uuid[] := '{}'::uuid[];
 review_ids uuid[] := '{}'::uuid[];
 party_joined boolean := false;
 personal_can_manage boolean := false;
 personal_can_sign boolean := false;
 personal_can_review boolean := false;
begin
 if viewer_profile_id is null then
  raise exception 'Authentication required.' using errcode='42501';
 end if;

 select * into deal_row from public.institutional_deals where id=target_deal_id;
 if not found then
  raise exception 'Institutional deal not found.' using errcode='P0002';
 end if;

 if target_organization_id is null then
  if target_party_id is not null then
   select * into party_row
   from public.institutional_deal_parties
   where id=target_party_id and deal_id=target_deal_id
     and party_capacity in('individual','service_provider','verifier')
     and profile_id=viewer_profile_id;
   if not found then
    raise exception 'Personal authorization snapshot requires the exact named personal party.' using errcode='42501';
   end if;
   party_joined:=party_row.joined_at is not null and party_row.left_at is null;
   personal_can_sign:=party_joined and party_row.authority_status='self_authorized';
  end if;

  personal_can_manage:=deal_row.lead_capacity='individual'
   and deal_row.lead_profile_id=viewer_profile_id
   and exists(select 1 from public.institutional_individual_profiles i where i.profile_id=viewer_profile_id and i.status='active');
  personal_can_review:=exists(
   select 1 from public.institutional_verifier_assignments a
   where a.deal_id=target_deal_id and a.verifier_profile_id=viewer_profile_id and a.status='accepted'
  );

  if not personal_can_manage and target_party_id is null and not personal_can_review then
   raise exception 'No personal-capacity authorization exists for this deal.' using errcode='42501';
  end if;

  return jsonb_build_object(
   'asOf',snapshot_as_of,
   'actingCapacity','individual',
   'organizationId',null,
   'programId',null,
   'partyId',case when target_party_id is null then null else party_row.id end,
   'organizationPartyId',null,
   'organizationPartyJoined',false,
   'canAcceptOrganizationParty',false,
   'canManageDeal',personal_can_manage,
   'canApprove',false,
   'canSign',personal_can_sign,
   'canReserveFunds',false,
   'canReviewEvidence',personal_can_review,
   'matchingAuthorityGrantIds',to_jsonb('{}'::uuid[]),
   'authorityGrantIdsByPermission',jsonb_build_object(
    'dealManage',to_jsonb('{}'::uuid[]),
    'dealApprove',to_jsonb('{}'::uuid[]),
    'dealSign',to_jsonb('{}'::uuid[]),
    'financeReserve',to_jsonb('{}'::uuid[]),
    'evidenceReview',to_jsonb('{}'::uuid[])
   )
  );
 end if;

 if target_party_id is null then
  raise exception 'Organization authorization snapshot requires an exact deal party.' using errcode='23514';
 end if;
 if not exists(
  select 1 from public.institutional_memberships m
  where m.organization_id=target_organization_id and m.profile_id=viewer_profile_id
    and m.status='active' and m.revoked_at is null
 ) then
  raise exception 'Active exact-organization membership is required.' using errcode='42501';
 end if;

 select * into party_row
 from public.institutional_deal_parties
 where id=target_party_id and deal_id=target_deal_id
   and party_capacity='organization' and organization_id=target_organization_id;
 if not found then
  raise exception 'Authorization snapshot organization and party scope must exactly match the deal.' using errcode='23514';
 end if;
 party_joined:=party_row.joined_at is not null and party_row.left_at is null;

 select
  coalesce(array_agg(g.id order by g.created_at) filter (where true),'{}'::uuid[]),
  coalesce(array_agg(g.id order by g.created_at) filter (where 'deal:manage'=any(g.permissions)),'{}'::uuid[]),
  coalesce(array_agg(g.id order by g.created_at) filter (where 'deal:approve'=any(g.permissions)),'{}'::uuid[]),
  coalesce(array_agg(g.id order by g.created_at) filter (where 'deal:sign'=any(g.permissions)),'{}'::uuid[]),
  coalesce(array_agg(g.id order by g.created_at) filter (where 'finance:reserve'=any(g.permissions)),'{}'::uuid[]),
  coalesce(array_agg(g.id order by g.created_at) filter (where 'evidence:review'=any(g.permissions) or 'deal:manage'=any(g.permissions)),'{}'::uuid[])
 into matching_ids,manage_ids,approve_ids,sign_ids,reserve_ids,review_ids
 from public.institutional_authority_grants g
 where g.profile_id=viewer_profile_id
   and g.organization_id=target_organization_id
   and g.program_id is not distinct from party_row.program_id
   and g.revoked_at is null
   and g.valid_from<=snapshot_as_of
   and (g.valid_until is null or g.valid_until>snapshot_as_of);

 return jsonb_build_object(
  'asOf',snapshot_as_of,
  'actingCapacity','organization',
  'organizationId',target_organization_id,
  'programId',party_row.program_id,
  'partyId',party_row.id,
  'organizationPartyId',party_row.id,
  'organizationPartyJoined',party_joined,
  'canAcceptOrganizationParty',(not party_joined and party_row.left_at is null and (cardinality(manage_ids)>0 or cardinality(approve_ids)>0)),
  'canManageDeal',(party_joined and (cardinality(manage_ids)>0 or cardinality(approve_ids)>0)),
  'canApprove',(party_joined and cardinality(approve_ids)>0),
  'canSign',(party_joined and cardinality(sign_ids)>0),
  'canReserveFunds',(party_joined and cardinality(reserve_ids)>0),
  'canReviewEvidence',(party_joined and cardinality(review_ids)>0),
  'matchingAuthorityGrantIds',to_jsonb(matching_ids),
  'authorityGrantIdsByPermission',jsonb_build_object(
   'dealManage',to_jsonb(manage_ids),
   'dealApprove',to_jsonb(approve_ids),
   'dealSign',to_jsonb(sign_ids),
   'financeReserve',to_jsonb(reserve_ids),
   'evidenceReview',to_jsonb(review_ids)
  )
 );
end $$;

create or replace function public.decide_institutional_approval(
 target_approval_id uuid,
 target_decision text,
 target_authority_grant_id uuid,
 target_decision_note text default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare approval_row public.institutional_approvals;
begin
 perform public.assert_institutional_aal2();
 if target_decision not in('approve','reject','abstain','withdrawn') then
  raise exception 'Unsupported approval decision.' using errcode='23514';
 end if;
 select * into approval_row from public.institutional_approvals where id=target_approval_id for update;
 if not found or approval_row.requested_from_profile_id<>auth.uid() then
  raise exception 'Only the named approval recipient may decide this approval.' using errcode='42501';
 end if;
 if not exists(
  select 1 from public.institutional_deals d
  where d.id=approval_row.deal_id
    and d.selected_proposal_version_id=approval_row.proposal_version_id
 ) then raise exception 'Approval request is stale because the selected exact proposal changed.' using errcode='23514'; end if;
 if not exists(
  select 1 from public.institutional_authority_grants g
  where g.id=target_authority_grant_id and g.profile_id=auth.uid()
    and g.organization_id=approval_row.organization_id
    and g.program_id is not distinct from approval_row.program_id
    and 'deal:approve'=any(g.permissions) and g.revoked_at is null
    and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
 ) then raise exception 'Exact-scope approval authority is required.' using errcode='42501'; end if;
 update public.institutional_approvals set
  decision=target_decision,decision_note=nullif(trim(target_decision_note),''),authority_grant_id=target_authority_grant_id,
  decided_by=auth.uid(),decided_at=timezone('utc',now())
 where id=target_approval_id;
 return target_approval_id;
end $$;

-- Anchor and underwriting commitments are made through atomic, exact-scope
-- functions so approval, reservation, authority, and terms checks share one
-- transaction and one row lock on the governing pool.
create or replace function public.save_institutional_pool_anchor(
 target_deal_id uuid,
 target_organization_id uuid,
 target_program_id uuid,
 target_contribution_id uuid,
 target_amount_cents bigint,
 target_status text,
 target_authority_grant_id uuid
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare pool_row public.institutional_pool_terms; anchor_id uuid;
begin
 perform public.assert_institutional_aal2();
 if target_status not in('proposed','committed','released','fulfilled','cancelled') then
  raise exception 'Unsupported anchor status.' using errcode='23514';
 end if;
 select * into pool_row from public.institutional_pool_terms where deal_id=target_deal_id for update;
 if not found or pool_row.status not in('open','ready','active') then
  raise exception 'Pool is not accepting anchor updates.' using errcode='23514';
 end if;
 if target_amount_cents<=0 then raise exception 'Anchor amount must be positive.' using errcode='23514'; end if;
 if not exists(
  select 1 from public.institutional_authority_grants g
  where g.id=target_authority_grant_id and g.profile_id=auth.uid()
    and g.organization_id=target_organization_id and g.program_id is not distinct from target_program_id
    and 'pool:approve'=any(g.permissions) and g.revoked_at is null
    and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
 ) then raise exception 'Exact-scope anchor authority is required.' using errcode='42501'; end if;
 select a.id into anchor_id
 from public.institutional_pool_anchors a
 where a.deal_id=target_deal_id and a.organization_id=target_organization_id
   and a.program_id is not distinct from target_program_id and a.contribution_id=target_contribution_id
 for update;
 if anchor_id is null then
  insert into public.institutional_pool_anchors(
   deal_id,organization_id,program_id,contribution_id,amount_cents,status,terms_hash,
   authority_grant_id,committed_by,committed_at
  ) values(
   target_deal_id,target_organization_id,target_program_id,target_contribution_id,target_amount_cents,target_status,pool_row.terms_hash,
   target_authority_grant_id,case when target_status='committed' then auth.uid() else null end,
   case when target_status='committed' then timezone('utc',now()) else null end
  ) returning id into anchor_id;
 else
  update public.institutional_pool_anchors set
   amount_cents=target_amount_cents,status=target_status,terms_hash=pool_row.terms_hash,
   authority_grant_id=target_authority_grant_id,
   committed_by=case when target_status='committed' then auth.uid() else committed_by end,
   committed_at=case when target_status='committed' then timezone('utc',now()) else committed_at end
  where id=anchor_id;
 end if;
 return anchor_id;
end $$;

create or replace function public.save_institutional_pool_underwriting(
 target_deal_id uuid,
 target_organization_id uuid,
 target_program_id uuid,
 target_maximum_amount_cents bigint,
 target_status text,
 target_budget_reservation_id uuid,
 target_authority_grant_id uuid
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare pool_row public.institutional_pool_terms; underwriting_id uuid;
begin
 perform public.assert_institutional_aal2();
 if target_status not in('proposed','committed','drawn','released','fulfilled','cancelled') then
  raise exception 'Unsupported underwriting status.' using errcode='23514';
 end if;
 select * into pool_row from public.institutional_pool_terms where deal_id=target_deal_id for update;
 if not found or pool_row.status not in('open','ready','active') then
  raise exception 'Pool is not accepting underwriting updates.' using errcode='23514';
 end if;
 if target_maximum_amount_cents<=0 then raise exception 'Underwriting maximum must be positive.' using errcode='23514'; end if;
 if not exists(
  select 1 from public.institutional_authority_grants g
  where g.id=target_authority_grant_id and g.profile_id=auth.uid()
    and g.organization_id=target_organization_id and g.program_id is not distinct from target_program_id
    and 'finance:reserve'=any(g.permissions) and g.revoked_at is null
    and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
    and (g.amount_limit_cents is null or g.amount_limit_cents>=target_maximum_amount_cents)
 ) then raise exception 'Exact-scope underwriting reservation authority is required.' using errcode='42501'; end if;
 select u.id into underwriting_id
 from public.institutional_pool_underwritings u
 where u.deal_id=target_deal_id and u.organization_id=target_organization_id
   and u.program_id is not distinct from target_program_id
 for update;
 if underwriting_id is null then
  insert into public.institutional_pool_underwritings(
   deal_id,organization_id,program_id,maximum_amount_cents,status,terms_hash,
   budget_reservation_id,authority_grant_id,committed_by,committed_at
  ) values(
   target_deal_id,target_organization_id,target_program_id,target_maximum_amount_cents,target_status,pool_row.terms_hash,
   target_budget_reservation_id,target_authority_grant_id,
   case when target_status='committed' then auth.uid() else null end,
   case when target_status='committed' then timezone('utc',now()) else null end
  ) returning id into underwriting_id;
 else
  update public.institutional_pool_underwritings set
   maximum_amount_cents=target_maximum_amount_cents,status=target_status,terms_hash=pool_row.terms_hash,
   budget_reservation_id=target_budget_reservation_id,authority_grant_id=target_authority_grant_id,
   committed_by=case when target_status='committed' then auth.uid() else committed_by end,
   committed_at=case when target_status='committed' then timezone('utc',now()) else committed_at end
  where id=underwriting_id;
 end if;
 return underwriting_id;
end $$;

-- Optional pool requirements encoded in governance_config are enforced during
-- activation. Invalid anchor and underwriting rows cannot be committed because
-- their table triggers validate them under the same pool lock.
create or replace function public.activate_institutional_pool(target_deal_id uuid,target_organization_id uuid,target_program_id uuid,target_authority_grant_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 pool_row public.institutional_pool_terms;
 total_cents bigint;
 contributor_count integer;
 anchor_total bigint;
 underwriting_total bigint;
 required_anchor_total bigint;
 required_underwriting_total bigint;
begin
 perform public.assert_institutional_aal2();
 if not exists(
  select 1 from public.institutional_authority_grants g
  where g.id=target_authority_grant_id and g.profile_id=auth.uid()
    and g.organization_id=target_organization_id and g.program_id is not distinct from target_program_id
    and 'pool:activate'=any(g.permissions) and g.revoked_at is null
    and g.valid_from<=timezone('utc',now()) and (g.valid_until is null or g.valid_until>timezone('utc',now()))
 ) then raise exception 'Exact-scope pool activation authority required.' using errcode='42501'; end if;
 select * into pool_row from public.institutional_pool_terms where deal_id=target_deal_id for update;
 if not found or pool_row.status not in('open','ready') then raise exception 'Pool is not activatable.' using errcode='23514'; end if;
 if pool_row.contribution_deadline<=timezone('utc',now()) then raise exception 'Pool contribution deadline has passed.' using errcode='23514'; end if;
 select coalesce(sum(amount_cents),0),count(*) into total_cents,contributor_count
 from public.institutional_pool_contributions
 where deal_id=target_deal_id and status in('committed','paid') and terms_hash=pool_row.terms_hash;
 if total_cents<pool_row.threshold_amount_cents or contributor_count<pool_row.minimum_contributors then
  raise exception 'Pool contribution threshold or contributor count is not satisfied.' using errcode='23514';
 end if;
 if pool_row.activation_rule='governance_vote_and_threshold' and exists(
  select 1 from public.institutional_deal_parties p
  where p.deal_id=target_deal_id and p.party_role='contributor'
    and not exists(
     select 1 from public.institutional_pool_votes v
     where v.deal_id=target_deal_id and v.organization_id=p.organization_id
       and v.program_id is not distinct from p.program_id and v.proposal_key='activation'
       and v.vote='approve' and v.terms_hash=pool_row.terms_hash
    )
 ) then raise exception 'Pool governance approvals are incomplete.' using errcode='23514'; end if;
 required_anchor_total:=coalesce((pool_row.governance_config->>'required_anchor_total_cents')::bigint,0);
 required_underwriting_total:=coalesce((pool_row.governance_config->>'required_underwriting_total_cents')::bigint,0);
 select coalesce(sum(amount_cents),0) into anchor_total from public.institutional_pool_anchors
 where deal_id=target_deal_id and status='committed' and terms_hash=pool_row.terms_hash;
 select coalesce(sum(maximum_amount_cents),0) into underwriting_total from public.institutional_pool_underwritings
 where deal_id=target_deal_id and status='committed' and terms_hash=pool_row.terms_hash;
 if anchor_total<required_anchor_total then raise exception 'Required anchor commitments are incomplete.' using errcode='23514'; end if;
 if underwriting_total<required_underwriting_total then raise exception 'Required underwriting commitments are incomplete.' using errcode='23514'; end if;
 perform set_config('app.institutional_pool_activation_id',pool_row.id::text,true);
 update public.institutional_pool_terms set status='active',activated_at=timezone('utc',now()) where id=pool_row.id;
 update public.institutional_deals set stage='execution' where id=target_deal_id;
 return pool_row.id;
end $$;


-- Atomic organization-party acceptance and revocation/review operations used by
-- the complete institutional interfaces. These functions preserve exact scope,
-- AAL2, immutable audit evidence, and the distinction between delegated
-- organizational authority and an accepted independent-verifier assignment.
create or replace function public.accept_institutional_organization_party(
 target_party_id uuid,
 target_organization_id uuid,
 target_program_id uuid,
 target_authority_grant_id uuid
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare party_row public.institutional_deal_parties; grant_row public.institutional_authority_grants;
begin
 perform public.assert_institutional_aal2();
 select * into party_row from public.institutional_deal_parties where id=target_party_id for update;
 if not found or party_row.party_capacity<>'organization' then
  raise exception 'Organization-party invitation does not exist.' using errcode='23514';
 end if;
 if party_row.organization_id<>target_organization_id or party_row.program_id is distinct from target_program_id then
  raise exception 'Organization-party acceptance must exactly match the invited organization and program.' using errcode='23514';
 end if;
 select * into grant_row from public.institutional_authority_grants
 where id=target_authority_grant_id and profile_id=auth.uid() and organization_id=target_organization_id
  and program_id is not distinct from target_program_id and revoked_at is null
  and valid_from<=timezone('utc',now()) and (valid_until is null or valid_until>timezone('utc',now()))
  and ('deal:manage'=any(permissions) or 'deal:approve'=any(permissions));
 if not found then raise exception 'Exact-scope organizational authority is required to accept this party invitation.' using errcode='42501'; end if;
 update public.institutional_deal_parties
 set representative_profile_id=auth.uid(), authority_grant_id=target_authority_grant_id,
     authority_status='verified_for_scope', joined_at=coalesce(joined_at,timezone('utc',now())), left_at=null
 where id=target_party_id;
 insert into public.institutional_deal_room_members(deal_id,profile_id,party_id,organization_id,access_scope,can_post,added_by)
 values(party_row.deal_id,auth.uid(),party_row.id,target_organization_id,'all_parties',true,auth.uid())
 on conflict(deal_id,profile_id,access_scope) do update set party_id=excluded.party_id,organization_id=excluded.organization_id,revoked_at=null,can_post=true;
 insert into public.institutional_audit_events(deal_id,actor_profile_id,represented_organization_id,represented_program_id,event_type,entity_type,entity_id,authority_basis,new_state)
 values(party_row.deal_id,auth.uid(),target_organization_id,target_program_id,'party.organization_accepted','deal_party',party_row.id,grant_row.authority_basis,jsonb_build_object('authority_grant_id',target_authority_grant_id));
 return target_party_id;
end $$;

create or replace function public.revoke_institutional_room_access(target_room_member_id uuid,target_deal_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare member_row public.institutional_deal_room_members;
begin
 perform public.assert_institutional_aal2();
 if not public.can_manage_institutional_deal(target_deal_id) then raise exception 'Deal-management authority is required to revoke room access.' using errcode='42501'; end if;
 select * into member_row from public.institutional_deal_room_members where id=target_room_member_id and deal_id=target_deal_id for update;
 if not found then raise exception 'Room membership must belong to the same deal.' using errcode='23514'; end if;
 update public.institutional_deal_room_members set revoked_at=timezone('utc',now()),can_post=false where id=target_room_member_id;
 insert into public.institutional_audit_events(deal_id,actor_profile_id,represented_organization_id,event_type,entity_type,entity_id,authority_basis,new_state)
 values(target_deal_id,auth.uid(),member_row.organization_id,'deal_room.access_revoked','deal_room_member',target_room_member_id,'Deal-management authority',jsonb_build_object('revoked_at',timezone('utc',now())));
 return target_room_member_id;
end $$;

create or replace function public.revoke_institutional_verifier_assignment(target_assignment_id uuid,target_deal_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare assignment_row public.institutional_verifier_assignments;
begin
 perform public.assert_institutional_aal2();
 if not public.can_manage_institutional_deal(target_deal_id) then raise exception 'Deal-management authority is required to revoke a verifier assignment.' using errcode='42501'; end if;
 select * into assignment_row from public.institutional_verifier_assignments where id=target_assignment_id and deal_id=target_deal_id for update;
 if not found then raise exception 'Verifier assignment must belong to the same deal.' using errcode='23514'; end if;
 update public.institutional_verifier_assignments set status='revoked',revoked_at=timezone('utc',now()) where id=target_assignment_id;
 update public.institutional_deal_room_members set revoked_at=timezone('utc',now()),can_post=false
 where verifier_assignment_id=target_assignment_id and deal_id=target_deal_id and revoked_at is null;
 insert into public.institutional_audit_events(deal_id,actor_profile_id,represented_organization_id,event_type,entity_type,entity_id,authority_basis,new_state)
 values(target_deal_id,auth.uid(),assignment_row.organization_id,'verifier.assignment_revoked','verifier_assignment',target_assignment_id,'Deal-management authority',jsonb_build_object('status','revoked'));
 return target_assignment_id;
end $$;

create or replace function public.review_institutional_evidence(
 target_submission_id uuid,
 target_deal_id uuid,
 target_status text,
 target_review_note text default null,
 target_organization_id uuid default null,
 target_program_id uuid default null,
 target_authority_grant_id uuid default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare submission_row public.institutional_evidence_submissions; requirement_row public.institutional_evidence_requirements; grant_row public.institutional_authority_grants; review_basis text;
begin
 perform public.assert_institutional_aal2();
 if target_status not in('accepted','needs_revision','rejected') then raise exception 'Unsupported evidence review status.' using errcode='23514'; end if;
 select * into submission_row from public.institutional_evidence_submissions where id=target_submission_id and deal_id=target_deal_id for update;
 if not found then raise exception 'Evidence submission must belong to the same deal.' using errcode='23514'; end if;
 select * into requirement_row from public.institutional_evidence_requirements where id=submission_row.requirement_id and deal_id=target_deal_id;
 if not found then raise exception 'Evidence requirement relationship is invalid.' using errcode='23514'; end if;
 if target_organization_id is not null then
  if target_authority_grant_id is null then raise exception 'Organization evidence review requires an exact authority grant.' using errcode='42501'; end if;
  if not exists(select 1 from public.institutional_deal_parties p where p.deal_id=target_deal_id and p.party_capacity='organization' and p.organization_id=target_organization_id and p.program_id is not distinct from target_program_id) then
   raise exception 'Evidence-review organization/program scope must exactly match a deal party.' using errcode='23514';
  end if;
  select * into grant_row from public.institutional_authority_grants
  where id=target_authority_grant_id and profile_id=auth.uid() and organization_id=target_organization_id
   and program_id is not distinct from target_program_id and revoked_at is null
   and valid_from<=timezone('utc',now()) and (valid_until is null or valid_until>timezone('utc',now()))
   and ('evidence:review'=any(permissions) or 'deal:manage'=any(permissions));
  if not found then raise exception 'Exact-scope evidence-review authority is required.' using errcode='42501'; end if;
  review_basis:=grant_row.authority_basis;
 else
  if target_program_id is not null or target_authority_grant_id is not null then raise exception 'Personal verifier review cannot inherit organization authority.' using errcode='23514'; end if;
  if not exists(
   select 1 from public.institutional_verifier_assignments a
   where a.deal_id=target_deal_id and a.verifier_profile_id=auth.uid() and a.status='accepted'
    and (requirement_row.verifier_assignment_id is null or requirement_row.verifier_assignment_id=a.id)
  ) then raise exception 'An accepted independent-verifier assignment is required to review this evidence.' using errcode='42501'; end if;
  review_basis:='Accepted independent-verifier assignment';
 end if;
 update public.institutional_evidence_submissions set status=target_status,reviewed_by=auth.uid(),review_note=target_review_note,reviewed_at=timezone('utc',now()) where id=target_submission_id;
 update public.institutional_evidence_requirements set status=case when target_status='accepted' then 'satisfied' else 'open' end where id=requirement_row.id;
 insert into public.institutional_audit_events(deal_id,actor_profile_id,represented_organization_id,represented_program_id,event_type,entity_type,entity_id,authority_basis,new_state)
 values(target_deal_id,auth.uid(),target_organization_id,target_program_id,'evidence.reviewed','evidence_submission',target_submission_id,review_basis,jsonb_build_object('status',target_status,'requirement_id',requirement_row.id));
 return target_submission_id;
end $$;

-- Row-level security is mandatory for every institutional relation. Operators
-- use a service-role client only after separate allowlist and AAL2 checks.
do $$
declare relation record;
begin
 for relation in
  select n.nspname as schema_name,c.relname as table_name
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in('r','p') and c.relname like 'institutional_%'
 loop
  execute format('alter table %I.%I enable row level security',relation.schema_name,relation.table_name);
  execute format('alter table %I.%I force row level security',relation.schema_name,relation.table_name);
 end loop;
end $$;

-- Independent participation is self-managed and opt-in. A public individual
-- profile may be read, but ordinary user profiles are never implicitly exposed.
create policy institutional_individual_profiles_select on public.institutional_individual_profiles for select to authenticated using(
 profile_id=(select auth.uid()) or (visibility='public' and status='active')
);
create policy institutional_individual_profiles_insert on public.institutional_individual_profiles for insert to authenticated with check(profile_id=(select auth.uid()));
create policy institutional_individual_profiles_update on public.institutional_individual_profiles for update to authenticated using(profile_id=(select auth.uid())) with check(profile_id=(select auth.uid()));
create policy institutional_individual_profiles_delete on public.institutional_individual_profiles for delete to authenticated using(profile_id=(select auth.uid()));

-- Public directory and member-scoped organization records.
create policy institutional_organizations_public_select on public.institutional_organizations
for select to anon using(status='active' and public_profile_enabled);
create policy institutional_organizations_member_select on public.institutional_organizations
for select to authenticated using(
 (status='active' and public_profile_enabled) or public.is_institutional_organization_member(id)
);
create policy institutional_organizations_insert on public.institutional_organizations for insert to authenticated with check(created_by=(select auth.uid()));
create policy institutional_organizations_update on public.institutional_organizations for update to authenticated using(public.can_manage_institutional_organization(id)) with check(public.can_manage_institutional_organization(id));

create policy institutional_memberships_select on public.institutional_memberships for select to authenticated using(profile_id=(select auth.uid()) or public.can_manage_institutional_organization(organization_id));
create policy institutional_memberships_insert on public.institutional_memberships for insert to authenticated with check(
 public.can_manage_institutional_organization(organization_id)
 or exists(select 1 from public.institutional_organizations o where o.id=organization_id and o.created_by=(select auth.uid()) and profile_id=(select auth.uid()))
);
create policy institutional_memberships_update on public.institutional_memberships for update to authenticated using(public.can_manage_institutional_organization(organization_id)) with check(public.can_manage_institutional_organization(organization_id));

create policy institutional_programs_public_select on public.institutional_programs
for select to anon using(
 status='active' and public_profile_enabled
 and exists(
  select 1 from public.institutional_organizations o
  where o.id=institutional_programs.organization_id and o.status='active' and o.public_profile_enabled
 )
);
create policy institutional_programs_member_select on public.institutional_programs
for select to authenticated using(
 (status='active' and public_profile_enabled and exists(select 1 from public.institutional_organizations o where o.id=institutional_programs.organization_id and o.status='active' and o.public_profile_enabled))
 or public.is_institutional_organization_member(organization_id)
);
create policy institutional_programs_write on public.institutional_programs for all to authenticated using(
 public.can_manage_institutional_organization(organization_id) or public.has_institutional_permission(organization_id,id,'program:manage',null)
) with check(
 public.can_manage_institutional_organization(organization_id) or public.has_institutional_permission(organization_id,id,'program:manage',null)
);

create policy institutional_legal_entities_select on public.institutional_legal_entities for select to authenticated using(public.is_institutional_organization_member(organization_id));
create policy institutional_legal_entities_write on public.institutional_legal_entities for all to authenticated using(public.can_manage_institutional_organization(organization_id)) with check(public.can_manage_institutional_organization(organization_id));
create policy institutional_authority_grants_select on public.institutional_authority_grants for select to authenticated using(profile_id=(select auth.uid()) or public.can_manage_institutional_organization(organization_id));
create policy institutional_authority_grants_write on public.institutional_authority_grants for all to authenticated using(public.can_manage_institutional_organization(organization_id)) with check(public.can_manage_institutional_organization(organization_id));
create policy institutional_approval_policies_select on public.institutional_approval_policies for select to authenticated using(public.is_institutional_organization_member(organization_id));
create policy institutional_approval_policies_write on public.institutional_approval_policies for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'program:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'program:manage',null));
create policy institutional_verification_records_select on public.institutional_verification_records for select to authenticated using(public.is_institutional_organization_member(organization_id));
create policy institutional_verification_records_insert on public.institutional_verification_records for insert to authenticated with check(requested_by=(select auth.uid()) and public.is_institutional_organization_member(organization_id));

create policy institutional_mandates_select on public.institutional_mandates for select using(
 (status='active' and exists(select 1 from public.institutional_programs p where p.id=program_id and p.public_profile_enabled))
 or public.is_institutional_organization_member(organization_id)
);
create policy institutional_mandates_write on public.institutional_mandates for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'mandate:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'mandate:manage',null));
create policy institutional_resource_profiles_select on public.institutional_resource_profiles for select to authenticated using(confidentiality='public' or public.is_institutional_organization_member(organization_id));
create policy institutional_resource_profiles_write on public.institutional_resource_profiles for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'opportunity:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'opportunity:manage',null));
create policy institutional_opportunities_public_select on public.institutional_opportunities
for select to anon using(visibility='public' and status='published');
create policy institutional_opportunities_member_select on public.institutional_opportunities
for select to authenticated using(
 (visibility='public' and status='published') or public.is_institutional_organization_member(organization_id)
);
create policy institutional_opportunities_write on public.institutional_opportunities for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'opportunity:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'opportunity:manage',null));
create policy institutional_matches_select on public.institutional_matches for select to authenticated using(
 public.is_institutional_organization_member(offer_organization_id) or public.is_institutional_organization_member(seek_organization_id)
);
create policy institutional_match_interests_select on public.institutional_match_interests for select to authenticated using(
 public.is_institutional_organization_member(organization_id)
);

-- Deal-room data is visible only through an explicit active room membership,
-- a public deal, or the named individual/verifier’s own pending record.
create policy institutional_deals_select on public.institutional_deals for select using(public.can_read_institutional_deal(id));
create policy institutional_deals_insert on public.institutional_deals for insert to authenticated with check(
 created_by=(select auth.uid()) and (
  (
   lead_capacity='individual' and lead_profile_id=(select auth.uid())
   and exists(select 1 from public.institutional_individual_profiles i where i.profile_id=(select auth.uid()) and i.status='active')
  )
  or
  (lead_capacity='organization' and public.has_institutional_permission(lead_organization_id,lead_program_id,'deal:manage',null))
 )
);
create policy institutional_deals_update on public.institutional_deals for update to authenticated using(public.can_manage_institutional_deal(id)) with check(public.can_manage_institutional_deal(id));

create policy institutional_deal_parties_select on public.institutional_deal_parties for select to authenticated using(public.can_read_institutional_deal(deal_id));
create policy institutional_deal_parties_insert on public.institutional_deal_parties for insert to authenticated with check(
 public.can_manage_institutional_deal(deal_id)
 or exists(
  select 1 from public.institutional_deals d
  where d.id=deal_id and d.created_by=(select auth.uid()) and (
   (d.lead_capacity='organization' and party_capacity='organization' and d.lead_organization_id=organization_id and d.lead_program_id is not distinct from program_id)
   or
   (d.lead_capacity='individual' and party_capacity='individual' and d.lead_profile_id=profile_id and profile_id=(select auth.uid()))
  )
 )
);
create policy institutional_deal_parties_update on public.institutional_deal_parties for update to authenticated
 using(public.can_manage_institutional_deal(deal_id))
 with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_deal_parties_delete on public.institutional_deal_parties for delete to authenticated
 using(public.can_manage_institutional_deal(deal_id));
create policy institutional_deal_room_members_select on public.institutional_deal_room_members for select to authenticated using(profile_id=(select auth.uid()) or public.can_read_institutional_deal(deal_id));
create policy institutional_deal_room_members_write on public.institutional_deal_room_members for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_deal_messages_select on public.institutional_deal_messages for select to authenticated using(
 (visibility='all_parties' and public.can_read_institutional_deal(deal_id))
 or
 (visibility='party_internal' and organization_id is not null and public.can_read_institutional_deal(deal_id)
  and public.is_institutional_organization_member(organization_id))
);
create policy institutional_deal_messages_insert on public.institutional_deal_messages for insert to authenticated with check(
 sender_profile_id=(select auth.uid()) and public.can_read_institutional_deal(deal_id) and (
  (visibility='all_parties' and organization_id is null)
  or
  (visibility='party_internal' and organization_id is not null
   and public.is_institutional_organization_member(organization_id)
   and exists(
 select 1 from public.institutional_deal_parties p
 where p.deal_id=institutional_deal_messages.deal_id
  and p.party_capacity='organization'
  and p.organization_id=institutional_deal_messages.organization_id
))
 )
);

-- Generate consistent read and manage policies for tables whose authorization
-- anchor is a deal_id column.
do $$
declare relation text;
begin
 foreach relation in array array[
  'institutional_proposal_versions','institutional_counterfactual_baselines','institutional_obligations',
  'institutional_obligation_dependencies','institutional_approvals','institutional_signatures',
  'institutional_budget_reservations','institutional_milestones','institutional_evidence_requirements',
  'institutional_evidence_submissions','institutional_risk_reviews','institutional_amendments',
  'institutional_disputes','institutional_attribution_claims',
  'institutional_report_snapshots','institutional_pool_terms','institutional_pool_contributions',
  'institutional_pool_anchors','institutional_pool_underwritings','institutional_pool_votes',
  'institutional_audit_events'
 ] loop
  execute format('create policy %I on public.%I for select to authenticated using (public.can_read_institutional_deal(deal_id))',relation||'_select',relation);
 end loop;
end $$;

create policy institutional_proposal_versions_write on public.institutional_proposal_versions for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_counterfactual_baselines_write on public.institutional_counterfactual_baselines for all to authenticated using(
 public.can_manage_institutional_deal(deal_id) or profile_id=(select auth.uid())
) with check(
 public.can_manage_institutional_deal(deal_id) or profile_id=(select auth.uid())
);
create policy institutional_obligations_write on public.institutional_obligations for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_obligation_dependencies_write on public.institutional_obligation_dependencies for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_approvals_insert on public.institutional_approvals for insert to authenticated with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_approvals_update on public.institutional_approvals for update to authenticated using(requested_from_profile_id=(select auth.uid()) or public.can_manage_institutional_deal(deal_id)) with check(requested_from_profile_id=(select auth.uid()) or public.can_manage_institutional_deal(deal_id));
create policy institutional_budget_reservations_write on public.institutional_budget_reservations for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_milestones_write on public.institutional_milestones for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_evidence_requirements_write on public.institutional_evidence_requirements for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_evidence_submissions_insert on public.institutional_evidence_submissions for insert to authenticated with check(submitted_by=(select auth.uid()) and public.can_read_institutional_deal(deal_id));
create policy institutional_evidence_submissions_update on public.institutional_evidence_submissions for update to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_risk_reviews_write on public.institutional_risk_reviews for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_amendments_write on public.institutional_amendments for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_disputes_write on public.institutional_disputes for all to authenticated using(public.can_read_institutional_deal(deal_id)) with check(public.can_read_institutional_deal(deal_id));
create policy institutional_dispute_events_select on public.institutional_dispute_events for select to authenticated using(
 exists(
  select 1 from public.institutional_disputes d
  where d.id=dispute_id and public.can_read_institutional_deal(d.deal_id)
 )
);
create policy institutional_dispute_events_write on public.institutional_dispute_events for insert to authenticated with check(
 actor_profile_id=(select auth.uid()) and exists(
  select 1 from public.institutional_disputes d
  where d.id=dispute_id and public.can_read_institutional_deal(d.deal_id)
 )
);
create policy institutional_attribution_claims_write on public.institutional_attribution_claims for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));
create policy institutional_report_snapshots_insert on public.institutional_report_snapshots for insert to authenticated with check(generated_by=(select auth.uid()) and public.can_manage_institutional_deal(deal_id));
create policy institutional_pool_terms_write on public.institutional_pool_terms for all to authenticated using(public.can_manage_institutional_deal(deal_id)) with check(public.can_manage_institutional_deal(deal_id));

create policy institutional_individual_consents_select on public.institutional_individual_consents for select to authenticated using(individual_profile_id=(select auth.uid()) or public.can_read_institutional_deal(deal_id));
create policy institutional_verifier_assignments_select on public.institutional_verifier_assignments for select to authenticated using(verifier_profile_id=(select auth.uid()) or public.can_read_institutional_deal(deal_id));
create policy institutional_verifier_assignments_insert on public.institutional_verifier_assignments for insert to authenticated with check(assigned_by=(select auth.uid()) and public.can_manage_institutional_deal(deal_id));

create policy institutional_budget_accounts_select on public.institutional_budget_accounts for select to authenticated using(public.is_institutional_organization_member(organization_id));
create policy institutional_budget_accounts_write on public.institutional_budget_accounts for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'finance:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'finance:manage',null));
create policy institutional_templates_select on public.institutional_templates for select to authenticated using(public.is_institutional_organization_member(organization_id));
create policy institutional_templates_write on public.institutional_templates for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'deal:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'deal:manage',null));
create policy institutional_framework_agreements_select on public.institutional_framework_agreements for select to authenticated using(public.is_institutional_organization_member(organization_a_id) or public.is_institutional_organization_member(organization_b_id));
create policy institutional_framework_agreements_write on public.institutional_framework_agreements for all to authenticated using(public.can_manage_institutional_organization(organization_a_id) or public.can_manage_institutional_organization(organization_b_id)) with check(public.can_manage_institutional_organization(organization_a_id) or public.can_manage_institutional_organization(organization_b_id));
create policy institutional_command_drafts_select on public.institutional_command_drafts for select to authenticated using(profile_id=(select auth.uid()));
create policy institutional_command_drafts_write on public.institutional_command_drafts for all to authenticated using(profile_id=(select auth.uid())) with check(profile_id=(select auth.uid()) and public.is_institutional_organization_member(organization_id));
create policy institutional_integrations_select on public.institutional_integrations for select to authenticated using(public.is_institutional_organization_member(organization_id));
create policy institutional_integrations_write on public.institutional_integrations for all to authenticated using(public.has_institutional_permission(organization_id,program_id,'integration:manage',null)) with check(public.has_institutional_permission(organization_id,program_id,'integration:manage',null));
create policy institutional_webhooks_select on public.institutional_webhooks for select to authenticated using(exists(select 1 from public.institutional_integrations i where i.id=integration_id and public.is_institutional_organization_member(i.organization_id)));
create policy institutional_webhooks_write on public.institutional_webhooks for all to authenticated using(exists(select 1 from public.institutional_integrations i where i.id=integration_id and public.has_institutional_permission(i.organization_id,i.program_id,'integration:manage',null))) with check(exists(select 1 from public.institutional_integrations i where i.id=integration_id and public.has_institutional_permission(i.organization_id,i.program_id,'integration:manage',null)));
create policy institutional_webhook_deliveries_select on public.institutional_webhook_deliveries for select to authenticated using(exists(select 1 from public.institutional_webhooks w join public.institutional_integrations i on i.id=w.integration_id where w.id=webhook_id and public.is_institutional_organization_member(i.organization_id)));
create policy institutional_one_time_secrets_select on public.institutional_one_time_secrets for select to authenticated using(created_for_profile_id=(select auth.uid()) and revealed_at is null and expires_at>timezone('utc',now()));

-- Every foreign-key column sequence receives a covering index. Composite FKs
-- are indexed in declared column order, avoiding advisor findings and delete/
-- update table scans as institutional data grows.
do $$
declare relation record; columns_sql text; index_name text;
begin
 for relation in
  select c.oid,c.conname,c.conrelid,n.nspname,c_rel.relname,c.conkey
  from pg_constraint c
  join pg_class c_rel on c_rel.oid=c.conrelid
  join pg_namespace n on n.oid=c_rel.relnamespace
  where c.contype='f' and n.nspname='public' and c_rel.relname like 'institutional_%'
 loop
  select string_agg(quote_ident(a.attname),', ' order by key_column.ordinality)
  into columns_sql
  from unnest(relation.conkey) with ordinality key_column(attnum,ordinality)
  join pg_attribute a on a.attrelid=relation.conrelid and a.attnum=key_column.attnum;
  index_name:=left(relation.relname||'_fk_'||substr(md5(relation.conname),1,12),63);
  execute format('create index if not exists %I on %I.%I (%s)',index_name,relation.nspname,relation.relname,columns_sql);
 end loop;
end $$;

create index institutional_authority_profile_scope_idx on public.institutional_authority_grants(profile_id,organization_id,program_id) where revoked_at is null;
create index institutional_room_profile_active_idx on public.institutional_deal_room_members(profile_id,deal_id) where revoked_at is null;
create index institutional_approvals_exact_scope_idx on public.institutional_approvals(deal_id,proposal_version_id,organization_id,program_id,decision);
create index institutional_consents_exact_terms_idx on public.institutional_individual_consents(deal_id,proposal_version_id,terms_hash,individual_profile_id,decision);
create index institutional_signatures_exact_terms_idx on public.institutional_signatures(deal_id,proposal_version_id,terms_hash,party_id);
create index institutional_reservations_active_idx on public.institutional_budget_reservations(budget_account_id,status) where status in('tentative','approved','committed');
create index institutional_pool_contributions_active_idx on public.institutional_pool_contributions(deal_id,terms_hash,status);
create index institutional_audit_deal_time_idx on public.institutional_audit_events(deal_id,occurred_at desc);

-- Restrict only institutional base tables to authenticated users and the
-- service role. Existing non-institutional grants are deliberately untouched.
do $$
declare relation record;
begin
 for relation in
  select n.nspname as schema_name,c.relname as relation_name
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in('r','p') and c.relname like 'institutional_%'
 loop
  execute format('revoke all on table %I.%I from anon',relation.schema_name,relation.relation_name);
  execute format('grant select,insert,update,delete on table %I.%I to authenticated',relation.schema_name,relation.relation_name);
  execute format('grant all on table %I.%I to service_role',relation.schema_name,relation.relation_name);
 end loop;
end $$;
-- The directory views are simple and therefore automatically updatable. Supabase
-- default privileges can otherwise expose INSERT/UPDATE/DELETE through the views,
-- bypassing the intended base-table action and policy boundaries. Make every
-- institutional view security-invoker and revoke all client privileges before
-- restoring SELECT only on the three deliberately public directory views.
alter view public.institutional_public_organizations set (security_invoker=true);
alter view public.institutional_public_programs set (security_invoker=true);
alter view public.institutional_public_opportunities set (security_invoker=true);
alter view public.institutional_track_record set (security_invoker=true);
revoke all on table public.institutional_public_organizations from public,anon,authenticated;
revoke all on table public.institutional_public_programs from public,anon,authenticated;
revoke all on table public.institutional_public_opportunities from public,anon,authenticated;
revoke all on table public.institutional_track_record from public,anon,authenticated;
grant select on table public.institutional_public_organizations,public.institutional_public_programs,public.institutional_public_opportunities to anon,authenticated;
-- Security-invoker views require caller privileges on their base relations.
-- Anonymous callers receive only view-visible columns plus the columns
-- required by the public-only RLS predicates; no private or write access.
grant select (
 id,slug,display_name,organization_type,summary,website_url,official_domain,
 jurisdiction,verification_status,created_at,updated_at,status,public_profile_enabled
) on table public.institutional_organizations to anon;
grant select (
 id,organization_id,slug,name,summary,mandate_summary,status,created_at,updated_at,
 public_profile_enabled
) on table public.institutional_programs to anon;
grant select (
 id,organization_id,program_id,title,summary,moral_difference_statement,
 no_trade_summary,status,published_at,created_at,updated_at,visibility
) on table public.institutional_opportunities to anon;

-- SECURITY DEFINER entry points are deny-by-default. PostgreSQL grants
-- EXECUTE to PUBLIC when a function is created, and Supabase may also retain
-- role-specific defaults. Revoke all client execution after every institutional
-- function exists, then restore only the exact authenticated allowlist below.
do $$
declare target record;
begin
 for target in
  select p.oid::regprocedure as function_identity
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and p.proname like '%institutional%'
 loop
  execute format('revoke all on function %s from public,anon,authenticated',target.function_identity);
 end loop;
end $$;

-- These five boolean helpers are required by forced-RLS policies. The two
-- internal assertion/party helpers remain private and are reachable only
-- through the allowlisted SECURITY DEFINER functions that call them.
grant execute on function public.is_institutional_organization_member(uuid) to authenticated;
grant execute on function public.has_institutional_permission(uuid,uuid,text,bigint) to authenticated;
grant execute on function public.can_manage_institutional_organization(uuid) to authenticated;
grant execute on function public.can_read_institutional_deal(uuid) to authenticated;
grant execute on function public.can_manage_institutional_deal(uuid) to authenticated;

revoke all on function public.get_institutional_deal_authorization_snapshot(uuid,uuid,uuid) from public;
revoke all on function public.generate_institutional_matches(uuid) from public;
revoke all on function public.record_institutional_match_interest(uuid,uuid,text,text) from public;
revoke all on function public.accept_institutional_organization_party(uuid,uuid,uuid,uuid) from public;
revoke all on function public.revoke_institutional_room_access(uuid,uuid) from public;
revoke all on function public.revoke_institutional_verifier_assignment(uuid,uuid) from public;
revoke all on function public.review_institutional_evidence(uuid,uuid,text,text,uuid,uuid,uuid) from public;
revoke all on function public.decide_institutional_approval(uuid,text,uuid,text) from public;
revoke all on function public.select_institutional_proposal_version(uuid,uuid,uuid,uuid) from public;
revoke all on function public.accept_institutional_deal_party(uuid) from public;
revoke all on function public.request_institutional_individual_consent(uuid,uuid) from public;
revoke all on function public.decide_institutional_individual_consent(uuid,text,text) from public;
revoke all on function public.accept_institutional_verifier_assignment(uuid,text,text) from public;
revoke all on function public.sign_institutional_deal(uuid,uuid,uuid,text) from public;
revoke all on function public.record_institutional_pool_approval(uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.reserve_institutional_budget(uuid,uuid,bigint,uuid,text) from public;
revoke all on function public.save_institutional_pool_contribution(uuid,uuid,uuid,bigint,text,uuid,uuid) from public;
revoke all on function public.save_institutional_pool_anchor(uuid,uuid,uuid,uuid,bigint,text,uuid) from public;
revoke all on function public.save_institutional_pool_underwriting(uuid,uuid,uuid,bigint,text,uuid,uuid) from public;
revoke all on function public.cast_institutional_pool_vote(uuid,uuid,uuid,text,text,uuid) from public;
revoke all on function public.activate_institutional_pool(uuid,uuid,uuid,uuid) from public;
revoke all on function public.transition_institutional_deal_stage(uuid,text) from public;
revoke all on function public.transition_institutional_obligation_status(uuid,uuid,text) from public;
revoke all on function public.transition_institutional_milestone_status(uuid,uuid,text) from public;

grant execute on function public.get_institutional_deal_authorization_snapshot(uuid,uuid,uuid) to authenticated;
grant execute on function public.generate_institutional_matches(uuid) to authenticated;
grant execute on function public.record_institutional_match_interest(uuid,uuid,text,text) to authenticated;
grant execute on function public.accept_institutional_organization_party(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.revoke_institutional_room_access(uuid,uuid) to authenticated;
grant execute on function public.revoke_institutional_verifier_assignment(uuid,uuid) to authenticated;
grant execute on function public.review_institutional_evidence(uuid,uuid,text,text,uuid,uuid,uuid) to authenticated;
grant execute on function public.decide_institutional_approval(uuid,text,uuid,text) to authenticated;
grant execute on function public.select_institutional_proposal_version(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.accept_institutional_deal_party(uuid) to authenticated;
grant execute on function public.request_institutional_individual_consent(uuid,uuid) to authenticated;
grant execute on function public.decide_institutional_individual_consent(uuid,text,text) to authenticated;
grant execute on function public.accept_institutional_verifier_assignment(uuid,text,text) to authenticated;
grant execute on function public.sign_institutional_deal(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.record_institutional_pool_approval(uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.reserve_institutional_budget(uuid,uuid,bigint,uuid,text) to authenticated;
grant execute on function public.save_institutional_pool_contribution(uuid,uuid,uuid,bigint,text,uuid,uuid) to authenticated;
grant execute on function public.save_institutional_pool_anchor(uuid,uuid,uuid,uuid,bigint,text,uuid) to authenticated;
grant execute on function public.save_institutional_pool_underwriting(uuid,uuid,uuid,bigint,text,uuid,uuid) to authenticated;
grant execute on function public.cast_institutional_pool_vote(uuid,uuid,uuid,text,text,uuid) to authenticated;
grant execute on function public.activate_institutional_pool(uuid,uuid,uuid,uuid) to authenticated;
grant execute on function public.transition_institutional_deal_stage(uuid,text) to authenticated;
grant execute on function public.transition_institutional_obligation_status(uuid,uuid,text) to authenticated;
grant execute on function public.transition_institutional_milestone_status(uuid,uuid,text) to authenticated;

comment on table public.institutional_individual_profiles is 'Explicit opt-in for independent institutional participation; it does not grant or imply authority over any organization.';
comment on table public.institutional_deal_parties is 'A party is either an exact organization/program scope or a named person acting only in personal capacity; the two authority paths do not inherit from each other.';
comment on table public.institutional_individual_consents is 'Named-person consent bound to one consent-required obligation and one immutable exact proposal hash; organizational approvals cannot satisfy this record.';
comment on table public.institutional_signatures is 'Immutable signatures bound to the selected proposal version and exact terms hash.';
comment on table public.institutional_pool_contributions is 'Pool contribution lifecycle; committed states require both independent pool approval and an exact-scope financial reservation.';
comment on table public.institutional_verifier_assignments is 'Independent verifier invitations; accepted assignment is required before confidential evidence-room membership.';
