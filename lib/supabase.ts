import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kyqnpyqicgxbfrzhuxbh.supabase.co"; 
const supabaseAnonKey = "sb_publishable_qq8WbA0sxJTr5rALEKTumw_udGRanJ6";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
