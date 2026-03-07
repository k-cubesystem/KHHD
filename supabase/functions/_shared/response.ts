const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function corsResponse() {
  return new Response('ok', { headers: CORS_HEADERS })
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ success: false, error: message }, status)
}

export function successResponse(data: unknown = {}) {
  return jsonResponse({ success: true, ...data })
}
