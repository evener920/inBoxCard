import { json, requireAdmin } from '../lib';

export async function onRequestPut(context: any): Promise<Response> {
  const { params, request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const noteId = params.id;
  const note = await env.DB.prepare('SELECT collection_id FROM notes WHERE id = ?').bind(noteId).first();
  if (!note) return json({ error: 'note not found' }, 404);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  let content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return json({ error: 'content required' }, 400);

  let tags: string[] = Array.isArray(body.tags) ? body.tags.map(String) : [];
  let source: string = typeof body.source === 'string' ? body.source.trim() : '';

  // 先提出处行、再提 #标签（标签正则锚定文末，必须最后处理才不受出处行干扰）
  const lines = content.split('\n').filter((line: string) => line.trim() !== '');
  if (lines.length > 0 && !source) {
    const lastLine = lines[lines.length - 1].trim();
    const sourceMatch = lastLine.match(/^\s*(?:——|--|—)\s*(.+)$/);
    if (sourceMatch) {
      source = sourceMatch[1].trim();
      lines.pop();
      content = lines.join('\n').trim();
    }
  }

  const tagRegex = /(#[\p{L}\p{N}_\/-]+(\s+|$))+$/u;
  const tagMatch = content.match(tagRegex);
  if (tagMatch) {
    const tagString = tagMatch[0];
    content = content.substring(0, tagMatch.index as number).trim();
    const parsed = tagString.split(/\s+/).filter((t: string) => t.startsWith('#')).map((t: string) => t.slice(1));
    if (parsed.length) tags = parsed;
  }

  const timestamp =
    typeof body.timestamp === 'string' && /^\d{4}[-./]\d{2}[-./]\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(body.timestamp.trim())
      ? body.timestamp.trim()
      : null;
  if (body.timestamp !== undefined && !timestamp) {
    return json({ error: '时间格式无效，应为 2024-01-01 10:00:00' }, 400);
  }

  if (timestamp) {
    await env.DB.prepare('UPDATE notes SET content = ?, tags = ?, source = ?, timestamp = ? WHERE id = ?')
      .bind(content, JSON.stringify(tags), source, timestamp, noteId).run();
  } else {
    await env.DB.prepare('UPDATE notes SET content = ?, tags = ?, source = ? WHERE id = ?')
      .bind(content, JSON.stringify(tags), source, noteId).run();
  }

  return json({ ok: true, content, tags, source });
}

export async function onRequestDelete(context: any): Promise<Response> {
  const { params, request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const noteId = params.id;
  const note = await env.DB.prepare('SELECT collection_id FROM notes WHERE id = ?').bind(noteId).first();
  if (!note) return json({ error: 'note not found' }, 404);

  const cid = note.collection_id;
  await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run();
  await env.DB.prepare(
    'UPDATE collections SET count = (SELECT COUNT(*) FROM notes WHERE collection_id = ?) WHERE id = ?'
  ).bind(cid, cid).run();

  return json({ ok: true });
}
