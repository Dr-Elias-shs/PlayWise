-- PlayWise question review (Nov 2026). Run once in the Supabase SQL editor, after
-- coins_2026-11.sql.
--
-- Every Trivia question and Spelling Bee word gets a review status:
--   legacy    already in the game before this script: stays live, shown "to review"
--   pending   new or edited: hidden from students until approved
--   approved  checked by a coordinator or teacher in Wisely
--   rejected  hidden for good
-- Games serve only legacy and approved rows. Reviews happen in Wisely (PlayWise
-- Questions page), which writes with the service key. The browser key can read but
-- no longer write these tables; PlayWise's own admin tools write through its server.

-- status: existing rows become 'legacy', rows added later default to 'pending'.
ALTER TABLE public.trivia_questions   ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE public.spelling_bee_words ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE public.trivia_questions   ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.spelling_bee_words ALTER COLUMN status SET DEFAULT 'pending';

DO $$ BEGIN
  ALTER TABLE public.trivia_questions ADD CONSTRAINT trivia_status_chk
    CHECK (status IN ('legacy', 'pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.spelling_bee_words ADD CONSTRAINT spelling_status_chk
    CHECK (status IN ('legacy', 'pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.trivia_questions   ADD COLUMN IF NOT EXISTS explanation  TEXT;
ALTER TABLE public.trivia_questions   ADD COLUMN IF NOT EXISTS reviewed_by  TEXT;
ALTER TABLE public.trivia_questions   ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;
ALTER TABLE public.trivia_questions   ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.trivia_questions   ADD COLUMN IF NOT EXISTS review_note  TEXT;
ALTER TABLE public.spelling_bee_words ADD COLUMN IF NOT EXISTS reviewed_by  TEXT;
ALTER TABLE public.spelling_bee_words ADD COLUMN IF NOT EXISTS reviewed_at  TIMESTAMPTZ;
ALTER TABLE public.spelling_bee_words ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.spelling_bee_words ADD COLUMN IF NOT EXISTS review_note  TEXT;

CREATE INDEX IF NOT EXISTS trivia_pick ON public.trivia_questions (category, difficulty, status);
CREATE INDEX IF NOT EXISTS trivia_review ON public.trivia_questions (status, grade, category);
CREATE INDEX IF NOT EXISTS spelling_review ON public.spelling_bee_words (status, grade);

-- Questions for one round: live questions of this category and level, the student's
-- grade first (one grade either side), random order, skipping recently seen ones.
CREATE OR REPLACE FUNCTION public.pick_trivia(p_category text, p_difficulty text, p_grade int, p_n int, p_exclude uuid[])
RETURNS SETOF public.trivia_questions
LANGUAGE sql STABLE AS $$
  SELECT * FROM public.trivia_questions
   WHERE category = p_category AND difficulty = p_difficulty
     AND status IN ('legacy', 'approved')
     AND NOT (id = ANY (coalesce(p_exclude, '{}')))
   ORDER BY (CASE WHEN p_grade IS NULL OR grade !~ '^[0-9]+$' THEN true ELSE abs(grade::int - p_grade) <= 1 END) DESC, random()
   LIMIT least(greatest(p_n, 1), 50);
$$;
GRANT EXECUTE ON FUNCTION public.pick_trivia(text, text, int, int, uuid[]) TO anon, authenticated;

-- "Report this question": the only write a student can make. Three reports send a
-- live question back to review.
CREATE OR REPLACE FUNCTION public.report_question(p_bank text, p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_bank = 'trivia' THEN
    UPDATE trivia_questions SET report_count = report_count + 1,
           status = CASE WHEN report_count + 1 >= 3 AND status IN ('legacy', 'approved') THEN 'pending' ELSE status END
     WHERE id = p_id;
  ELSIF p_bank = 'spelling' THEN
    UPDATE spelling_bee_words SET report_count = report_count + 1,
           status = CASE WHEN report_count + 1 >= 3 AND status IN ('legacy', 'approved') THEN 'pending' ELSE status END
     WHERE id = p_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.report_question(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_question(text, uuid) TO anon, authenticated;

-- Browser key: read only.
REVOKE INSERT, UPDATE, DELETE ON public.trivia_questions   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.spelling_bee_words FROM anon, authenticated;

-- Check
SELECT 'trivia' AS bank, status, count(*) FROM public.trivia_questions GROUP BY status
UNION ALL
SELECT 'spelling', status, count(*) FROM public.spelling_bee_words GROUP BY status
ORDER BY 1, 2;
