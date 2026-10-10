// GET /api/tags
// 按分类聚合全部笔记的标签，供侧栏「标签树」使用。
// 返回: { [categoryId]: [{ tag, count }] }，每个分类按出现次数降序，最多 8 个。
import { json } from './lib';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.category AS cat, n.tags AS tags
     FROM notes n JOIN collections c ON n.collection_id = c.id
     WHERE n.tags IS NOT NULL AND n.tags != '' AND n.tags != '[]'`
  ).all();

  const tree: Record<string, Record<string, number>> = {};
  for (const row of results as any[]) {
    const cat = row.cat || 'uncategorized';
    let arr: string[] = [];
    try {
      arr = JSON.parse(row.tags);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    tree[cat] = tree[cat] || {};
    for (const t of arr) {
      if (!t) continue;
      tree[cat][t] = (tree[cat][t] || 0) + 1;
    }
  }

  const out: Record<string, { tag: string; count: number }[]> = {};
  for (const [cat, m] of Object.entries(tree)) {
    out[cat] = Object.entries(m)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  return json(out);
};
