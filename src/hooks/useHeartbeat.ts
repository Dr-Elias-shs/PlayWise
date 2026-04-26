"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const INTERVAL_MS = 30_000; // ping every 30 s

/**
 * useHeartbeat
 *
 * Upserts a row in active_sessions every 30 s while the student is playing.
 * Deletes the row on unmount so the admin list stays clean.
 *
 * @param playerEmail - unique key (empty string = skip)
 * @param playerName  - display name
 * @param grade       - student's grade
 * @param game        - current activity label shown in admin
 */
export function useHeartbeat(
  playerEmail: string,
  playerName:  string,
  grade:       string,
  game:        string,
) {
  const gameRef  = useRef(game);
  const emailRef = useRef(playerEmail);
  gameRef.current  = game;
  emailRef.current = playerEmail;

  useEffect(() => {
    if (!playerEmail) return;

    async function ping() {
      await supabase.from('active_sessions').upsert({
        player_email: emailRef.current,
        player_name:  playerName,
        grade,
        current_game: gameRef.current,
        last_seen:    new Date().toISOString(),
      }, { onConflict: 'player_email' });
    }

    ping();
    const t = setInterval(ping, INTERVAL_MS);

    return () => {
      clearInterval(t);
      // Remove from active list when the student closes/navigates away
      supabase.from('active_sessions').delete().eq('player_email', emailRef.current);
    };
  }, [playerEmail]); // eslint-disable-line react-hooks/exhaustive-deps
}
