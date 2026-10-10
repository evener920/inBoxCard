import { json, requireAdmin, parseTags } from '../lib';

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

export async function onRequestPut(context: any): Promise<Response> {
  const { params, request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const id = params.id;
  const col = await env.DB.prepare('SELECT id FROM collections WHERE id = ?').bind(id).first();
  if (!col) return json({ error: 'not found' }, 404);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  // 分类若提供，必须已存在
  if (body.category !== undefined) {
    if (!String(body.category || '').trim()) return json({ error: 'category required' }, 400);
    const cat = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(String(body.category).trim()).first();
    if (!cat) return json({ error: `分类 ${body.category} 不存在` }, 400);
  }

  const fields: string[] = [];
  const vals: any[] = [];
  const map: Record<string, string> = {
    name: 'name', nameEn: 'name_en', description: 'description',
    category: 'category', author: 'author', coverColor: 'cover_color'
  };
  for (const [k, colName] of Object.entries(map)) {
    if (body[k] !== undefined) {
      const v = String(body[k]).trim();
      if (k === 'name' && !v) return json({ error: 'name cannot be empty' }, 400);
      fields.push(`${colName} = ?`);
      vals.push(v);
    }
  }
  if (!fields.length) return json({ error: 'nothing to update' }, 400);

  vals.push(id);
  await env.DB.prepare(`UPDATE collections SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();

  const updated = await env.DB.prepare(`SELECT ${COLS} FROM collections WHERE id = ?`).bind(id).first();
  return json({ ok: true, collection: updated });
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
