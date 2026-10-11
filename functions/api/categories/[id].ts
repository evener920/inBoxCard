import { json, requireAdmin } from '../lib';

export async function onRequestDelete(context: any): Promise<Response> {
  const { request, env, params } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  const id = String(params.id || '');
  if (!id) return json({ error: '缺少分类 id' }, 400);
  const force = new URL(request.url).searchParams.get('force') === '1';

  try {
    const used = await env.DB.prepare(
      'SELECT COUNT(*) AS c FROM collections WHERE category = ?'
    ).bind(id).first();
    const count = used ? Number(used.c) : 0;
    if (count > 0 && !force) {
      return json({ error: `仍有 ${count} 个合集使用该分类，请先删除或移动这些合集` }, 409);
    }

    if (count > 0) {
      // 级联删除：先删该分类下所有合集的卡片，再删合集，最后删分类
      await env.DB.batch([
        env.DB.prepare(
          'DELETE FROM notes WHERE collection_id IN (SELECT id FROM collections WHERE category = ?)'
        ).bind(id),
        env.DB.prepare('DELETE FROM collections WHERE category = ?').bind(id),
      ]);
    }
    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
    return json({ ok: true, deletedCollections: count });
  } catch (e: any) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
