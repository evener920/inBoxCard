import { json, requireAdmin, parseTags } from '../../lib';

const COLS = `id, name, name_en as nameEn, description, category, author, cover_color as coverColor, count`;

export async function onRequestGet(context: any): Promise<Response> {
  const { params, env } = context;
  const id = params.id;
  const col = await env.DB.prepare(`SELECT ${COLS} FROM collections WHERE id = ?`).bind(id).first();
  if (!col) return json({ error: 'not found' }, 404);

  const notes = await env.DB.prepare(
    `SELECT id, timestamp, content, tags, source, seq FROM notes WHERE collection_id = ? ORDER BY seq`
  ).bind(id).all();

  const clean = (notes.results || []).map((n: any) => ({
    id: n.id,
    timestamp: n.timestamp,
    content: n.content,
    tags: parseTags(n.tags),
    source: n.source
  }));

  return json({ ...col, notes: clean });
}

export async function onRequestDelete(context: any): Promise<Response> {
  const { params, request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const id = params.id;
  await env.DB.prepare('DELETE FROM notes WHERE collection_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
