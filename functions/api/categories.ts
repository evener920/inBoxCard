import { json, requireAdmin, genId } from './lib';

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  const { results } = await env.DB.prepare(
    `SELECT id, name, name_en as nameEn, icon, sort FROM categories ORDER BY sort, id`
  ).all();
  return json(results || []);
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (auth) return auth;

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return json({ error: '分类名称必填' }, 400);

    let id = String(body.id || '').trim() || slugify(String(body.nameEn || '')) || genId('cat');
    const existing = await env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(id).first();
    if (existing) return json({ error: '该分类 id 已存在' }, 409);

    const icon = String(body.icon || 'BookOpen');
    const maxRow = await env.DB.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM categories').first();
    const sort = (maxRow && Number(maxRow.m) || 0) + 1;

    await env.DB.prepare(
      'INSERT INTO categories (id, name, name_en, icon, sort) VALUES (?,?,?,?,?)'
    ).bind(id, name, String(body.nameEn || ''), icon, sort).run();

    return json({ ok: true, id, name, icon });
  } catch (e: any) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
