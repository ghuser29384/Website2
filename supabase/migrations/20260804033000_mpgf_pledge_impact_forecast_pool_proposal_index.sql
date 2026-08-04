-- Add the supporting index for the pledge-impact snapshot foreign key.
--
-- This keeps proposal-reference checks and any proposal-scoped maintenance
-- efficient as immutable forecast history grows. It changes no rows, mappings,
-- forecasts, audit events, authorization, or payment behavior.

create index if not exists mpgf_pledge_impact_forecast_pool_proposal_idx
  on public.mpgf_pledge_impact_forecast_snapshots (pool_proposal_id);
