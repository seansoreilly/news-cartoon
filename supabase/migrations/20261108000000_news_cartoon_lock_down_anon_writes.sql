-- MUST BE APPLIED MANUALLY BY THE PROJECT OWNER (Supabase SQL editor).
-- Do NOT apply this from an agent, CI, or an automated tool.
--
-- Target: shared Supabase project ogdfhmnnhlmqwuhlikem (backs several apps).
--
-- Why: anyone holding the public anon key can currently insert rows into
-- public.cartoons and upload arbitrary files to the public `cartoons` bucket.
-- Legitimate gallery writes go through the server (api/_shared/gallery.js)
-- with a service-role/secret key, which bypasses RLS, so the anon write
-- policies are unnecessary. Public SELECT policies are kept: the gallery is public.

-- 1. Remove anonymous write policies.
drop policy if exists "Anon insert access" on public.cartoons;
drop policy if exists "Anon Upload" on storage.objects;

-- 2. Constrain what the bucket accepts (matches IMAGE_SIGNATURES in api/_shared/gallery.js).
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'cartoons';
