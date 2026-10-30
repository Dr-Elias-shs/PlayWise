-- PlayWise RLS lockdown (Oct 2026), run once in the Supabase SQL editor after
-- restoring the project.
--
-- 1. Turns RLS on for every table in public (clears the "RLS disabled" alerts).
-- 2. Drops every existing public policy (the old "all" USING (true) ones).
-- 3. Grants the browser key only the operations the app code actually performs
--    on each table. Anything not listed (the retired World tables, unknown
--    tables) stays fully closed. Server routes using the service_role key are
--    not affected by RLS.
--
-- Limits: students sign in with Microsoft (MSAL) in the browser, so Supabase
-- cannot tell one student from another. These policies stop operations the app
-- never does (e.g. deleting scores, reading the World tables) but cannot stop a
-- student from editing their own or another student's rows through the
-- browser key. Fixing that needs the writes moved behind server routes.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;

  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- allow_ops(table, ops): one permissive policy per operation for anon + authenticated.
CREATE OR REPLACE FUNCTION pg_temp.allow_ops(t text, ops text[]) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  op text;
BEGIN
  IF to_regclass('public.' || t) IS NULL THEN
    RAISE NOTICE 'skipping missing table %', t;
    RETURN;
  END IF;
  FOREACH op IN ARRAY ops LOOP
    IF op = 'select' THEN
      EXECUTE format('CREATE POLICY pw_select ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    ELSIF op = 'insert' THEN
      EXECUTE format('CREATE POLICY pw_insert ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', t);
    ELSIF op = 'update' THEN
      EXECUTE format('CREATE POLICY pw_update ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t);
    ELSIF op = 'delete' THEN
      EXECUTE format('CREATE POLICY pw_delete ON public.%I FOR DELETE TO anon, authenticated USING (true)', t);
    END IF;
  END LOOP;
END $$;

-- upsert = insert + update. Lists match the .from(...) calls in src/ as of Oct 2026.
SELECT pg_temp.allow_ops('active_sessions',       ARRAY['select','insert','update','delete']);
SELECT pg_temp.allow_ops('chess_rooms',           ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('chess_scores',          ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('coin_transactions',     ARRAY['select','insert']);
SELECT pg_temp.allow_ops('curriculum_questions',  ARRAY['select','insert','update','delete']);
SELECT pg_temp.allow_ops('curriculum_terms',      ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('game_performance',      ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('game_rooms',            ARRAY['select','insert','update','delete']);
SELECT pg_temp.allow_ops('game_sessions',         ARRAY['select','insert']);
SELECT pg_temp.allow_ops('global_config',         ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('grade_change_requests', ARRAY['select','insert','update','delete']);
SELECT pg_temp.allow_ops('learning_scores',       ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('player_wallets',        ARRAY['select','insert','update','delete']);
SELECT pg_temp.allow_ops('redemptions',           ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('scores',                ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('shop_items',            ARRAY['select','insert','update','delete']);
SELECT pg_temp.allow_ops('spelling_bee_words',    ARRAY['select','insert','delete']);
SELECT pg_temp.allow_ops('student_daily',         ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('table_progress',        ARRAY['select','insert','update']);
SELECT pg_temp.allow_ops('trivia_questions',      ARRAY['select','insert','update','delete']);

-- Retired World tables (world_rooms, world_players, world_answers, world_ratings)
-- get no policy: RLS on + no policy = closed. Data is kept.
-- They were also in the realtime publication; take them out.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['world_rooms','world_players','world_answers'] LOOP
    IF EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Check: every public table with its RLS flag and policy count.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 1;
