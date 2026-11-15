-- MUST BE APPLIED MANUALLY BY THE PROJECT OWNER (Supabase SQL editor).
-- Do NOT apply this from an agent, CI, or an automated tool.
--
-- Target: shared Supabase project ogdfhmnnhlmqwuhlikem (backs several apps).
-- Follow-up to 20261108000000_news_cartoon_lock_down_anon_writes.sql, which only
-- dropped two policies by name ("Anon insert access", "Anon Upload"). It did not
-- confirm RLS is enabled on public.cartoons nor remove any OTHER write policy or
-- table grant (e.g. UPDATE/DELETE policies, or a differently named insert policy),
-- which this repo cannot see. All legitimate writes go through the server with the
-- service-role key (bypasses RLS), so anon/authenticated need read access only.
--
-- Review the SELECT output of the "audit" queries at the bottom first.

-- 1. RLS must be on for the gallery table.
alter table public.cartoons enable row level security;

-- 2. Drop every non-SELECT policy on public.cartoons, whatever it is called.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'cartoons' and cmd <> 'SELECT'
  loop
    execute format('drop policy %I on public.cartoons', p.policyname);
  end loop;
end $$;

-- 3. Belt and braces: no table-level write grants for client roles.
revoke insert, update, delete, truncate on public.cartoons from anon, authenticated;

-- 4. Same for storage.objects, but ONLY policies that mention the cartoons bucket
--    (the table is shared with other apps' buckets; leave theirs alone).
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd <> 'SELECT'
      and (coalesce(qual, '') like '%cartoons%' or coalesce(with_check, '') like '%cartoons%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Audit (read-only), run before/after:
--   select policyname, cmd, roles, qual, with_check from pg_policies
--     where (schemaname = 'public' and tablename = 'cartoons')
--        or (schemaname = 'storage' and tablename = 'objects');
--   select relrowsecurity from pg_class where oid = 'public.cartoons'::regclass;
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_schema = 'public' and table_name = 'cartoons';
