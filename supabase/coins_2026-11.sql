-- PlayWise PlayBits on the server (Nov 2026). Run once in the Supabase SQL editor.
--
-- Until now the browser worked out every reward and wrote the balance straight
-- into player_wallets with the public key, so any student could set any balance.
-- After this script:
--   * only the PlayWise server (service key) can add or remove PlayBits, through
--     the pw_* functions below, each one atomic;
--   * game rewards stop at a daily ceiling per student (150, passed by the server);
--   * owned shop items are kept on the wallet (owned), not only on the device.
-- The browser can still read wallets and change appearance fields.
-- Days are UTC days, matching the existing daily counts in the app.

ALTER TABLE public.player_wallets ADD COLUMN IF NOT EXISTS owned JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS coin_transactions_student_day ON public.coin_transactions (student_name, created_at);
CREATE INDEX IF NOT EXISTS game_sessions_student_day ON public.game_sessions (student_name, game_id, created_at);

-- Award PlayBits for a game (source 'game_play', counted against p_daily_cap) or a
-- bonus such as the spin wheel (any other source, not counted, p_daily_cap NULL).
CREATE OR REPLACE FUNCTION public.pw_award(
  p_student text, p_display text, p_amount int, p_source text, p_game text,
  p_play_seconds int, p_count_session boolean, p_grade text, p_daily_cap int)
RETURNS TABLE (credited int, balance int, earned_today int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day    timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_earned int;
  v_credit int := greatest(0, coalesce(p_amount, 0));
  v_bal    int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pw:' || p_student));
  SELECT coalesce(sum(amount), 0) INTO v_earned FROM coin_transactions
   WHERE student_name = p_student AND source = 'game_play' AND created_at >= v_day;
  IF p_daily_cap IS NOT NULL THEN
    v_credit := least(v_credit, greatest(0, p_daily_cap - v_earned));
  END IF;

  INSERT INTO player_wallets AS w (student_name, display_name, coins, total_earned, total_redeemed,
                                   play_time_seconds, games_played, grade)
  VALUES (p_student, coalesce(p_display, ''), v_credit, v_credit, 0, coalesce(p_play_seconds, 0),
          CASE WHEN p_count_session THEN 1 ELSE 0 END, coalesce(p_grade, ''))
  ON CONFLICT (student_name) DO UPDATE SET
    display_name      = CASE WHEN coalesce(p_display, '') <> '' THEN p_display ELSE w.display_name END,
    coins             = coalesce(w.coins, 0) + v_credit,
    total_earned      = coalesce(w.total_earned, 0) + v_credit,
    play_time_seconds = coalesce(w.play_time_seconds, 0) + coalesce(p_play_seconds, 0),
    games_played      = coalesce(w.games_played, 0) + CASE WHEN p_count_session THEN 1 ELSE 0 END,
    grade             = CASE WHEN coalesce(p_grade, '') <> '' THEN p_grade ELSE w.grade END,
    updated_at        = now()
  RETURNING w.coins INTO v_bal;

  IF v_credit > 0 OR p_source = 'spin_wheel' THEN   -- a 0 spin is still recorded: one spin a day
    INSERT INTO coin_transactions (student_name, amount, source, game_id) VALUES (p_student, v_credit, p_source, p_game);
  END IF;
  IF p_count_session THEN
    INSERT INTO game_sessions (student_name, game_id, coins_earned, play_time_seconds)
    VALUES (p_student, p_game, v_credit, coalesce(p_play_seconds, 0));
  END IF;

  credited := v_credit; balance := v_bal;
  earned_today := v_earned + CASE WHEN p_source = 'game_play' THEN v_credit ELSE 0 END;
  RETURN NEXT;
END $$;

-- Buy a shop item: one atomic step. Already owned items are not charged again.
-- p_kind is the owned-list name ('accessories', 'clothing', 'characters'), or NULL.
CREATE OR REPLACE FUNCTION public.pw_spend(p_student text, p_amount int, p_reason text, p_kind text, p_item text)
RETURNS TABLE (ok boolean, balance int, already boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal int; v_owned jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pw:' || p_student));
  SELECT coins, owned INTO v_bal, v_owned FROM player_wallets WHERE student_name = p_student FOR UPDATE;
  IF NOT FOUND THEN ok := false; balance := 0; already := false; RETURN NEXT; RETURN; END IF;
  IF p_kind IS NOT NULL AND coalesce(v_owned -> p_kind, '[]'::jsonb) ? p_item THEN
    ok := true; balance := v_bal; already := true; RETURN NEXT; RETURN;
  END IF;
  IF coalesce(v_bal, 0) < p_amount THEN ok := false; balance := coalesce(v_bal, 0); already := false; RETURN NEXT; RETURN; END IF;

  UPDATE player_wallets SET
    coins = coins - p_amount,
    total_redeemed = coalesce(total_redeemed, 0) + p_amount,
    owned = CASE WHEN p_kind IS NULL THEN owned
                 ELSE jsonb_set(owned, ARRAY[p_kind], coalesce(owned -> p_kind, '[]'::jsonb) || to_jsonb(p_item)) END,
    updated_at = now()
  WHERE student_name = p_student RETURNING coins INTO v_bal;
  IF p_amount > 0 THEN
    INSERT INTO coin_transactions (student_name, amount, source, game_id) VALUES (p_student, -p_amount, 'shop', p_reason);
  END IF;
  ok := true; balance := v_bal; already := false; RETURN NEXT;
END $$;

-- Ask for a prize: the price comes from shop_items, not from the browser.
CREATE OR REPLACE FUNCTION public.pw_redeem(p_student text, p_item uuid)
RETURNS TABLE (ok boolean, balance int, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item shop_items%ROWTYPE; v_bal int;
BEGIN
  SELECT * INTO v_item FROM shop_items WHERE id = p_item AND available;
  IF NOT FOUND THEN ok := false; balance := NULL; error := 'This prize is not available'; RETURN NEXT; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('pw:' || p_student));
  UPDATE player_wallets SET coins = coins - v_item.cost,
         total_redeemed = coalesce(total_redeemed, 0) + v_item.cost, updated_at = now()
   WHERE student_name = p_student AND coins >= v_item.cost RETURNING coins INTO v_bal;
  IF NOT FOUND THEN
    SELECT coins INTO v_bal FROM player_wallets WHERE student_name = p_student;
    ok := false; balance := v_bal; error := 'Not enough PlayBits'; RETURN NEXT; RETURN;
  END IF;
  INSERT INTO redemptions (student_name, item_id, item_name, item_emoji, cost, status)
  VALUES (p_student, v_item.id, v_item.name, v_item.emoji, v_item.cost, 'pending');
  INSERT INTO coin_transactions (student_name, amount, source, game_id) VALUES (p_student, -v_item.cost, 'redeem', v_item.name);
  ok := true; balance := v_bal; error := NULL; RETURN NEXT;
END $$;

-- Approve or reject a prize request. Rejecting a pending request gives the PlayBits back.
CREATE OR REPLACE FUNCTION public.pw_resolve_redemption(p_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r redemptions%ROWTYPE;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN RETURN false; END IF;
  UPDATE redemptions SET status = p_status WHERE id = p_id AND status = 'pending' RETURNING * INTO r;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_status = 'rejected' THEN
    UPDATE player_wallets SET coins = coins + r.cost,
           total_redeemed = greatest(0, coalesce(total_redeemed, 0) - r.cost), updated_at = now()
     WHERE student_name = r.student_name;
    INSERT INTO coin_transactions (student_name, amount, source, game_id) VALUES (r.student_name, r.cost, 'refund', r.item_name);
  END IF;
  RETURN true;
END $$;

-- Merge a duplicate wallet into another (admin tool).
CREATE OR REPLACE FUNCTION public.pw_merge_wallets(p_keep text, p_drop text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d player_wallets%ROWTYPE;
BEGIN
  SELECT * INTO d FROM player_wallets WHERE student_name = p_drop FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM player_wallets WHERE student_name = p_keep) THEN RETURN false; END IF;
  UPDATE player_wallets k SET
    coins = coalesce(k.coins, 0) + coalesce(d.coins, 0),
    total_earned = coalesce(k.total_earned, 0) + coalesce(d.total_earned, 0),
    total_redeemed = coalesce(k.total_redeemed, 0) + coalesce(d.total_redeemed, 0),
    play_time_seconds = coalesce(k.play_time_seconds, 0) + coalesce(d.play_time_seconds, 0),
    games_played = coalesce(k.games_played, 0) + coalesce(d.games_played, 0),
    grade = coalesce(nullif(k.grade, ''), d.grade),
    owned = (SELECT coalesce(jsonb_object_agg(key, val), '{}'::jsonb) FROM (
      SELECT key, (SELECT jsonb_agg(DISTINCT e) FROM jsonb_array_elements(
        coalesce(k.owned -> key, '[]'::jsonb) || coalesce(d.owned -> key, '[]'::jsonb)) e) AS val
      FROM (SELECT jsonb_object_keys(k.owned || d.owned) AS key) ks) x),
    updated_at = now()
  WHERE k.student_name = p_keep;
  DELETE FROM player_wallets WHERE student_name = p_drop;
  RETURN true;
END $$;

-- Only the server may call these.
REVOKE ALL ON FUNCTION public.pw_award(text, text, int, text, text, int, boolean, text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pw_spend(text, int, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pw_redeem(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pw_resolve_redemption(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pw_merge_wallets(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pw_award(text, text, int, text, text, int, boolean, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.pw_spend(text, int, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pw_redeem(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pw_resolve_redemption(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pw_merge_wallets(text, text) TO service_role;

-- The browser keeps reading wallets, and may still create its row and change the
-- appearance, grade and ban fields, but never the PlayBits columns or owned items.
REVOKE INSERT, UPDATE ON public.player_wallets FROM anon, authenticated;
GRANT INSERT (student_name, display_name, character_id, color_id, equipped_id, equipped_clothing_id, grade, updated_at)
  ON public.player_wallets TO anon, authenticated;
GRANT UPDATE (display_name, character_id, color_id, equipped_id, equipped_clothing_id, grade, banned, ban_reason, updated_at)
  ON public.player_wallets TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coin_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.game_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.redemptions FROM anon, authenticated;

-- Check: which columns of player_wallets the browser key may still change.
SELECT privilege_type, column_name FROM information_schema.column_privileges
 WHERE table_schema = 'public' AND table_name = 'player_wallets' AND grantee = 'anon'
   AND privilege_type IN ('INSERT', 'UPDATE') ORDER BY 1, 2;
