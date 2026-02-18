import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xdcfwggwoutumhkcpkej.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkY2Z3Z2d3b3V0dW1oa2Nwa2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTMwNTksImV4cCI6MjA3ODc4OTA1OX0.oepi42XDyj6btCQA77dnWoWmhksH6f1OvUHjjzFXB7w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

