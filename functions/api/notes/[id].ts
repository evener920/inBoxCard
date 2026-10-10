import { json, requireAdmin } from '../../lib';

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
