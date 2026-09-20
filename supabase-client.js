// supabase-client.js
// راه‌اندازی Supabase Client

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = 'https://khxncgxrklrtmchssxnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeG5jZ3hya2xydG1jaHNzeG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODY5MDUsImV4cCI6MjEwNTQ2MjkwNX0.xMpQN1ikZmIRymQhvx8nlStFykY9tiO4TRicPJmdw0I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

console.log('✅ Supabase Client آماده است');
