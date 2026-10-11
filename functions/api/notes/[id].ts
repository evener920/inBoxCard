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

  // 移动合集：target collection 必须存在
  let newCollectionId: string = note.collection_id;
  const bodyCol = typeof body.collection_id === 'string' ? body.collection_id.trim() : '';
  if (bodyCol && bodyCol !== note.collection_id) {
    const c = await env.DB.prepare('SELECT id FROM collections WHERE id = ?').bind(bodyCol).first();
    if (!c) return json({ error: 'target collection not found' }, 400);
    newCollectionId = bodyCol;
  }
  const moving = newCollectionId !== note.collection_id;

  let source: string = typeof body.source === 'string' ? body.source.trim() : '';

  // 先提出处行（移动与否都要提取）—— 标签正则锚定文末，最后处理
  const slines = content.split('\n').filter((line: string) => line.trim() !== '');
  if (slines.length > 0 && !source) {
    const lastLine = slines[slines.length - 1].trim();
    const sourceMatch = lastLine.match(/^\s*(?:——|--|—)\s*(.+)$/);
    if (sourceMatch) {
      source = sourceMatch[1].trim();
      slines.pop();
      content = slines.join('\n').trim();
    }
  }

  // 标签：非移动时从正文末行解析；移动时由 body.tags 提供（客户端已同步成目标合集名），并剥掉正文行尾 #标签
  let tags: string[] = [];
  const stripTagLine = () => {
    const cl = content.split('\n');
    const ll = cl[cl.length - 1].trim();
    if (ll.startsWith('#')) {
      cl.pop();
      content = cl.join('\n').trim();
    } else {
      const m = ll.match(/^(.*?)(?:^|\s)#(\S+)\s*$/u);
      if (m && m[1].trim()) {
        cl[cl.length - 1] = m[1].trim();
        content = cl.join('\n').trim();
      }
    }
  };
  if (!moving) {
    const contentLines = content.split('\n');
    const lastLine = contentLines[contentLines.length - 1].trim();
    if (lastLine.startsWith('#')) {
      const parsed: string[] = [];
      for (const tok of lastLine.split(/\s+/)) {
        if (tok.startsWith('#')) {
          const t = tok.slice(1);
          if (t) parsed.push(t);
        } else if (parsed.length) {
          parsed[parsed.length - 1] += tok;
        }
      }
      if (parsed.length) {
        tags = parsed;
        contentLines.pop();
        content = contentLines.join('\n').trim();
      }
    } else {
      const tMatch = lastLine.match(/^(.*?)(?:^|\s)#(\S+)\s*$/u);
      if (tMatch && tMatch[1].trim()) {
        tags = [tMatch[2]];
        contentLines[contentLines.length - 1] = tMatch[1].trim();
        content = contentLines.join('\n').trim();
      }
    }
  } else {
    tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
    if (tags.length === 0) {
      const cur = await env.DB.prepare('SELECT tags FROM notes WHERE id = ?').bind(noteId).first();
      tags = cur && cur.tags ? JSON.parse(cur.tags) : [];
    }
    stripTagLine();
  }

  const timestamp =
    typeof body.timestamp === 'string' && /^\d{4}[-./]\d{2}[-./]\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(body.timestamp.trim())
      ? body.timestamp.trim()
      : null;
  if (body.timestamp !== undefined && !timestamp) {
    return json({ error: '时间格式无效，应为 2024-01-01 10:00:00' }, 400);
  }

  if (timestamp) {
    await env.DB.prepare('UPDATE notes SET content = ?, tags = ?, source = ?, timestamp = ?, collection_id = ? WHERE id = ?')
      .bind(content, JSON.stringify(tags), source, timestamp, newCollectionId, noteId).run();
  } else {
    await env.DB.prepare('UPDATE notes SET content = ?, tags = ?, source = ?, collection_id = ? WHERE id = ?')
      .bind(content, JSON.stringify(tags), source, newCollectionId, noteId).run();
  }

  // 移动后同步两侧合集计数
  if (moving) {
    await env.DB.prepare(
      'UPDATE collections SET count = (SELECT COUNT(*) FROM notes WHERE collection_id = ?) WHERE id = ?'
    ).bind(note.collection_id, note.collection_id).run();
    await env.DB.prepare(
      'UPDATE collections SET count = (SELECT COUNT(*) FROM notes WHERE collection_id = ?) WHERE id = ?'
    ).bind(newCollectionId, newCollectionId).run();
  }

  return json({ ok: true, content, tags, source, collection_id: newCollectionId });
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
