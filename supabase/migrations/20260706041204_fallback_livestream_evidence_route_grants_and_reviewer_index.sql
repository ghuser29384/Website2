create index if not exists fallback_livestream_evidence_routes_reviewer_idx
  on public.fallback_livestream_evidence_routes (reviewer_id, reviewed_at desc);

revoke all on public.fallback_livestream_evidence_routes from anon;
revoke all on public.fallback_livestream_evidence_routes from authenticated;
grant select, insert, update on public.fallback_livestream_evidence_routes to authenticated;
grant all on public.fallback_livestream_evidence_routes to service_role;
