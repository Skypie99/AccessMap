// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service-role bypasses RLS
);

Deno.serve(async (req) => {
  const { record } = await req.json();

  // Only notify on verified or resolved
  if (!['verified', 'resolved'].includes(record.status)) {
    return new Response('ok', { status: 200 });
  }

  // Fetch token without logging it
  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.user_id)
    .single();

  if (!tokenRow) return new Response('no token', { status: 200 });

  // Send via Expo Push API
  const message = {
    to: tokenRow.token,
    title: 'AccessMap',
    body: `Your ${record.category} flag was ${record.status}.`,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  return new Response('sent', { status: 200 });
});
