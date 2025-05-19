import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const load: PageServerLoad = async ({ url }) => {
  const listId = url.searchParams.get('list');
  const taskId = url.searchParams.get('task');

  let task = null;

  if (listId && taskId) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('id', taskId)
      .eq('list_id', listId)
      .maybeSingle();

    if (!error && data) {
      task = data;
    }
  }

  return {
    task
  };
}; 