-- PlayWise fair chess (Nov 2026). Run once in the Supabase SQL editor, before
-- deploying the matching code.
--
-- 1. Rooms remember both players' accounts, so the server can check an online
--    result: same account on both sides earns nothing, and a win needs the
--    loser's own resign/timeout or a real checkmate in the room.
-- 2. The chess ranking can no longer be written from the browser; the server
--    updates it after each game.
-- 3. Old open rooms are closed, so nobody can join a room whose host left.

ALTER TABLE public.chess_rooms ADD COLUMN IF NOT EXISTS white_email text;
ALTER TABLE public.chess_rooms ADD COLUMN IF NOT EXISTS black_email text;

DROP POLICY IF EXISTS pw_insert ON public.chess_scores;
DROP POLICY IF EXISTS pw_update ON public.chess_scores;

UPDATE public.chess_rooms SET status = 'expired'
 WHERE status IN ('waiting', 'playing') AND created_at < now() - interval '1 hour';
