import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const saveScore = async (studentName: string, focusTable: number, score: number) => {
  // Try to find existing entry for this student and table
  const { data: existing } = await supabase
    .from('scores')
    .select('*')
    .eq('student_name', studentName)
    .eq('focus_table', focusTable)
    .single();

  if (existing) {
    if (score > existing.score) {
      return await supabase
        .from('scores')
        .update({ score, timestamp: new Date() })
        .eq('id', existing.id);
    }
    return { data: existing, error: null };
  }

  return await supabase
    .from('scores')
    .insert([
      { student_name: studentName, focus_table: focusTable, score, timestamp: new Date() }
    ]);
};

export const getLeaderboard = async (focusTable: number) => {
  const { data, error } = await supabase
    .from('scores')
    .select('student_name, score')
    .eq('focus_table', focusTable)
    .order('score', { ascending: false })
    .limit(5);
  
  return { data, error };
};

export const getGlobalLeaderboard = async () => {
  const { data, error } = await supabase
    .from('scores')
    .select('student_name, score')
    .order('score', { ascending: false })
    .limit(10);
  
  return { data, error };
};