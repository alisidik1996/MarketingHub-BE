/**
 * Supabase client — menggunakan service role key untuk server-side operations.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.warn('[Supabase] SUPABASE_URL atau SUPABASE_SERVICE_KEY belum di-set');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');
