
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ogdfhmnnhlmqwuhlikem.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_API_KEY || '';

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseKey;
};

// Create a single supabase client for interacting with your database
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const STORAGE_BUCKET = 'cartoons';
export const TABLE_NAME = 'cartoons';
