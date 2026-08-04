// Proxy do Agente IA usando a API do Google Gemini.
// POST /api/ai-chat  { system, context, question } -> { text }
//
// Exige a variável de ambiente GEMINI_API_KEY configurada no Netlify
// (Site configuration -> Environment variables). Sem ela, retorna erro claro
// em vez de vazar chave nenhuma para o navegador.

const CORS_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const MODEL = 'gemini-2.5-flash';

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada no Netlify (Site configuration → Environment variables).' }), { status: 500, headers: CORS_HEADERS });
  }

  try {
    const { system, context: dataContext, question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: 'missing_question' }), { status: 400, headers: CORS_HEADERS });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: system || 'Você é um assistente de análise industrial. Responda em português do Brasil.' }] },
      contents: [{ role: 'user', parts: [{ text: 'DADOS DO PERÍODO ATUAL:\n' + (dataContext || '') + '\n\nPERGUNTA: ' + question }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.4 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'gemini_error', message: data && data.error ? data.error.message : ('http ' + res.status) }), { status: 502, headers: CORS_HEADERS });
    }

    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map(p => p.text || '').join('')
      : '';

    if (!text) {
      return new Response(JSON.stringify({ error: 'empty_response' }), { status: 502, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ text }), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'server_error', message: String(err && err.message || err) }), { status: 500, headers: CORS_HEADERS });
  }
};

export const config = { path: '/api/ai-chat' };
