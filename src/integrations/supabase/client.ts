import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nelmmrqdiycmdhhslxfz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbG1tcnFkaXljbWRoaHNseGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzM2NTEsImV4cCI6MjA4NjA0OTY1MX0.JguIpjztfrbKMiHQq66ltc2ZviexKR3lUTJ3LUbmpsA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
