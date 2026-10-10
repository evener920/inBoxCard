import { json, requireAdmin } from '../lib';

export async function onRequestDelete(context: any): Promise<Response> {
  const { request, env, params } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const id = String(params.id || '');
  if (!id) return json({ error: '缺少分类 id' }, 400);

  try {
    const used = await env.DB.prepare(
      'SELECT COUNT(*) AS c FROM collections WHERE category = ?'
    ).bind(id).first();
    const count = used ? Number(used.c) : 0;
    if (count > 0) {
      return json({ error: `仍有 ${count} 个合集使用该分类，请先删除或移动这些合集` }, 409);
    }

    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
