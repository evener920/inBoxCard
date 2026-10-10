import { json, requireAdmin, parseTimestampNotes, ApiNote } from '../../lib';

export async function onRequestPost(context: any): Promise<Response> {
  const { params, request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const id = params.id;
  const col = await env.DB.prepare('SELECT id FROM collections WHERE id = ?').bind(id).first();
  if (!col) return json({ error: 'collection not found' }, 404);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const content = body.content || '';
  const notes: ApiNote[] = parseTimestampNotes(content);
  if (notes.length === 0) return json({ error: '未解析到任何语录' }, 400);

  const maxRow = await env.DB.prepare('SELECT COALESCE(MAX(seq), -1) as m FROM notes WHERE collection_id = ?').bind(id).first();
  let seq = (maxRow && maxRow.m != null ? maxRow.m : -1) + 1;

  const stmt = env.DB.prepare(
    'INSERT INTO notes (id, collection_id, timestamp, content, tags, source, seq) VALUES (?,?,?,?,?,?,?)'
  );
  const batch = notes.map((n) =>
    stmt.bind(n.id, id, n.timestamp, n.content, JSON.stringify(n.tags || []), n.source || '', seq++)
  );
  await env.DB.batch(batch);

  await env.DB.prepare(
    'UPDATE collections SET count = (SELECT COUNT(*) FROM notes WHERE collection_id = ?) WHERE id = ?'
  ).bind(id, id).run();

  return json({ ok: true, added: notes.length });
}
