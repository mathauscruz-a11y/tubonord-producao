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

const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

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

    const body = {
      systemInstruction: { parts: [{ text: system || 'Você é um assistente de análise industrial. Responda em português do Brasil.' }] },
      contents: [{ role: 'user', parts: [{ text: 'IMPORTANTE: responda sempre em português do Brasil, nunca em inglês, independente do idioma dos dados abaixo.\n\nDADOS DO PERÍODO ATUAL:\n' + (dataContext || '') + '\n\nPERGUNTA: ' + question }] }],
      generationConfig: { maxOutputTokens: 1400 },
    };

    let data = null, lastErr = null;
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (res.ok) { data = json; break; }
        lastErr = model + ': ' + (json && json.error ? json.error.message : ('http ' + res.status));
        // tenta o próximo modelo da lista em qualquer erro (indisponibilidade, parâmetro não suportado, etc.) — só desiste se todos falharem
      } catch (e) {
        lastErr = model + ': ' + String(e && e.message || e);
      }
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'gemini_error', message: lastErr || 'falha desconhecida' }), { status: 502, headers: CORS_HEADERS });
    }

    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map(p => p.text || '').join('')
      : '';

    if (!text) {
      return new Response(JSON.stringify({ error: 'empty_response' }), { status: 502, headers: CORS_HEADERS });
    }

    const finishReason = data && data.candidates && data.candidates[0] ? data.candidates[0].finishReason : null;
    const trimmed = text.trim();
    const looksComplete = /[.!?…"'\)\]]\s*$/.test(trimmed); // termina com pontuação/fechamento típico de frase — trata como completo mesmo se a API sinalizar MAX_TOKENS
    const finalText = (finishReason === 'MAX_TOKENS' && !looksComplete) ? (text + '\n\n_(resposta truncada pelo limite de tamanho — peça um resumo mais curto ou uma parte específica)_') : text;

    return new Response(JSON.stringify({ text: finalText }), { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'server_error', message: String(err && err.message || err) }), { status: 500, headers: CORS_HEADERS });
  }
};

export const config = { path: '/api/ai-chat' };
