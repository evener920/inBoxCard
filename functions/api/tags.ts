// GET /api/tags
// 按分类聚合全部笔记的标签，供侧栏「标签树」使用。
// 关键：按「合集（卡片）」均衡取样——每个合集先出自己按热度排序的 top 标签，
// 再轮询合并（round-robin），保证该分类下每张卡片都有标签入选，
// 而不是让大合集（如论语）的高频标签把其他卡片的标签全部挤掉。
// 返回: { [categoryId]: [{ tag, count }] }
import { json } from './lib';

interface Env {
  DB: D1Database;
}

const PER_COLLECTION = 3; // 每个合集最多贡献的标签数
const MAX_PER_CATEGORY = 12; // 每个分类最终展示上限

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.category AS cat, c.id AS colId, n.tags AS tags
     FROM notes n JOIN collections c ON n.collection_id = c.id
     WHERE n.tags IS NOT NULL AND n.tags != '' AND n.tags != '[]'`
  ).all();

  // tree[cat][colId][tag] = count
  const tree: Record<string, Record<string, Record<string, number>>> = {};
  for (const row of results as any[]) {
    const cat = row.cat || 'uncategorized';
    const colId = row.colId;
    let arr: string[] = [];
    try {
      arr = JSON.parse(row.tags);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    tree[cat] = tree[cat] || {};
    tree[cat][colId] = tree[cat][colId] || {};
    for (const t of arr) {
      if (!t) continue;
      tree[cat][colId][t] = (tree[cat][colId][t] || 0) + 1;
    }
  }

  const out: Record<string, { tag: string; count: number }[]> = {};
  for (const [cat, cols] of Object.entries(tree)) {
    // 每个合集先取自己的 top N
    const perColLists: { tag: string; count: number }[][] = Object.values(cols).map((m) =>
      Object.entries(m)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, PER_COLLECTION)
    );
    // 轮询合并：第 1 轮取每个合集的第 1 名，第 2 轮取第 2 名……（合集按其最高热度排序，大合集优先）
    perColLists.sort(
      (a, b) => (b[0]?.count || 0) - (a[0]?.count || 0)
    );
    const merged: { tag: string; count: number }[] = [];
    const seen = new Set<string>();
    const maxLen = Math.max(0, ...perColLists.map((l) => l.length));
    for (let round = 0; round < maxLen; round++) {
      for (const list of perColLists) {
        if (merged.length >= MAX_PER_CATEGORY) break;
        const item = list[round];
        if (item && !seen.has(item.tag)) {
          seen.add(item.tag);
          merged.push(item);
        }
      }
      if (merged.length >= MAX_PER_CATEGORY) break;
    }
    // 选完后按热度降序展示（成员已保证每张卡片都有代表）
    out[cat] = merged.sort((a, b) => b.count - a.count);
  }

  return json(out);
};
