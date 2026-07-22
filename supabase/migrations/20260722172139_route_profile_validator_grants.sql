-- Validator helpers are part of authenticated profile writes, not the public API.
-- Supabase's default function grants include anon, so revoke that role explicitly.

revoke all on function public.route_profile_ciphertexts_valid(jsonb) from anon;
revoke all on function public.route_profile_pairwise_answers_valid(jsonb) from anon;
revoke all on function public.route_profile_interview_answers_valid(jsonb) from anon;
