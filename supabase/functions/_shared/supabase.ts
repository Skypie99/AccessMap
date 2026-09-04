// Keep Edge Function dependencies deterministic and separate from the web
// bundle. The exact version is aligned with package.json/package-lock.json.
export { createClient } from 'npm:@supabase/supabase-js@2.106.2';
