begin;

alter table public.mpgf_public_goods_allocation_results
  add column if not exists formula_version text not null default 'cg_vqaf_capital_constrained_qf_v1',
  add column if not exists qf_allocation_policy text not null default 'capital_constrained_lambda_bisection_with_per_campaign_cap',
  add column if not exists qf_lambda numeric not null default 0 check (qf_lambda >= 0),
  add column if not exists locked_parameter_digest text not null default 'sha256:pending-parameter-proof',
  add column if not exists allocation_calculation_hash text not null default 'sha256:pending-calculation-proof',
  add column if not exists parameters_locked_before_round_open boolean not null default true;

alter table public.mpgf_public_goods_allocation_results
  add constraint mpgf_public_goods_allocation_formula_version
    check (formula_version = 'cg_vqaf_capital_constrained_qf_v1'),
  add constraint mpgf_public_goods_allocation_qf_policy
    check (qf_allocation_policy = 'capital_constrained_lambda_bisection_with_per_campaign_cap'),
  add constraint mpgf_public_goods_allocation_locked_parameter_hash
    check (locked_parameter_digest ~ '^sha256:[0-9a-f]{64}$' or locked_parameter_digest = 'sha256:pending-parameter-proof'),
  add constraint mpgf_public_goods_allocation_calculation_hash
    check (allocation_calculation_hash ~ '^sha256:[0-9a-f]{64}$' or allocation_calculation_hash = 'sha256:pending-calculation-proof'),
  add constraint mpgf_public_goods_allocation_parameters_locked
    check (parameters_locked_before_round_open = true);

create index if not exists mpgf_public_goods_allocation_calculation_hash_idx
  on public.mpgf_public_goods_allocation_results (round_id, allocation_calculation_hash);

comment on column public.mpgf_public_goods_allocation_results.formula_version is
  'Deterministic CG-VQAF formula version used to produce this allocation row.';

comment on column public.mpgf_public_goods_allocation_results.locked_parameter_digest is
  'Hash of the round, match-pool, budget, lambda, and formula parameters locked before donations opened.';

comment on column public.mpgf_public_goods_allocation_results.allocation_calculation_hash is
  'Hash of the locked parameters, source contribution proof, and row calculation output.';

comment on column public.mpgf_public_goods_allocation_results.parameters_locked_before_round_open is
  'Invariant: allocation rows are produced from parameters locked before donations open, not mid-round retuning.';

commit;
