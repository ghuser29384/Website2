# Supabase migrations

Use these files for production changes instead of copying partial SQL from chat. Apply migrations in timestamp order through the Supabase SQL editor or Supabase CLI, then keep `supabase/schema.sql` as the full rebuilt schema.

For Vercel deployments, apply database migrations before shipping code that reads the new tables or columns.

Current MPGF production-control additions require applying:

- `20260516_mpgf_completion_control_plane.sql`

This adds explicit completion-gate, solver-certification, production-verification, and payout/compliance review evidence tables. It does not enable real money by itself.
