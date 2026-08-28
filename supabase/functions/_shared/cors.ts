// Browser-facing deletion routes use this explicit, source-controlled CORS
// contract. It permits only headers required by Supabase clients; authorization
// remains enforced inside each handler and is never weakened by preflight.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin, Access-Control-Request-Headers',
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}
