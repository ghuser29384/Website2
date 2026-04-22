# Supabase migrations

Use these files for production changes instead of copying partial SQL from chat. Apply migrations in timestamp order through the Supabase SQL editor or Supabase CLI, then keep `supabase/schema.sql` as the full rebuilt schema.

For Vercel deployments, apply database migrations before shipping code that reads the new tables or columns.
