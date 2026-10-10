import { json, requireAdmin, parseTimestampNotes, ApiNote } from './lib';

const COLS = `id, name, name_en as nameEn, description, category, author, cover_color as coverColor, count`;

export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT ${COLS} FROM collections ORDER BY created_at DESC, id`
  ).all();
  return json(results || []);
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  try {
    const body = await request.json();
    const { id, name, nameEn, description, category, author, coverColor, content } = body;
    if (!id || !name || !content) {
      return json({ error: 'id、name、content 必填' }, 400);
    }

    const existing = await env.DB.prepare('SELECT id FROM collections WHERE id = ?').bind(id).first();
    if (existing) return json({ error: '该 id 已存在' }, 409);

    const notes: ApiNote[] = parseTimestampNotes(content);
    if (notes.length === 0) return json({ error: '未解析到任何语录，请检查时间戳格式' }, 400);

    await env.DB.prepare(
      `INSERT INTO collections (id, name, name_en, description, category, author, cover_color, count, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
      .bind(id, name, nameEn || '', description || '', category || 'philosophy', author || '',
            coverColor || 'bg-slate-600', notes.length, Date.now())
      .run();

    const stmt = env.DB.prepare(
      'INSERT INTO notes (id, collection_id, timestamp, content, tags, source, seq) VALUES (?,?,?,?,?,?,?)'
    );
    const batch = notes.map((n, i) =>
      stmt.bind(n.id, id, n.timestamp, n.content, JSON.stringify(n.tags || []), n.source || '', i)
    );
    await env.DB.batch(batch);

    return json({ ok: true, id, count: notes.length });
  } catch (e: any) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
