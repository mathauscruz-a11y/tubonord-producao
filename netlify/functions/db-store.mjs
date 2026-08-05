// Backend compartilhado do Sistema Tubonord usando Netlify Blobs.
// GET  /api/db  -> retorna { db, updatedAt, updatedBy } (db=null se nunca foi salvo)
// POST /api/db  -> recebe { db, updatedBy } e salva, sobrescrevendo a versão anterior (last-write-wins)
//
// Não há autenticação própria aqui: quem acessa a URL do site já passou pela tela de login do app.
// Este endpoint não deve ser exposto publicamente com dados sensíveis sem uma camada extra de proteção.

import { getStore } from '@netlify/blobs';

const CORS_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
};

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const store = getStore('tubonord-db');

  if (req.method === 'GET') {
    try {
      const [db, meta] = await Promise.all([
        store.get('db', { type: 'json' }),
        store.get('meta', { type: 'json' }),
      ]);
      return new Response(JSON.stringify({
        db: db || null,
        updatedAt: meta ? meta.updatedAt : null,
        updatedBy: meta ? meta.updatedBy : null,
      }), { status: 200, headers: CORS_HEADERS });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'read_failed', message: String(err && err.message || err) }), { status: 500, headers: CORS_HEADERS });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (!body || typeof body.db !== 'object' || body.db === null) {
        return new Response(JSON.stringify({ error: 'missing_db' }), { status: 400, headers: CORS_HEADERS });
      }
      const meta = { updatedAt: new Date().toISOString(), updatedBy: body.updatedBy || 'desconhecido' };
      await store.setJSON('db', body.db);
      await store.setJSON('meta', meta);
      return new Response(JSON.stringify({ ok: true, ...meta }), { status: 200, headers: CORS_HEADERS });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'write_failed', message: String(err && err.message || err) }), { status: 500, headers: CORS_HEADERS });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
};

export const config = { path: '/api/db' };
