import { json, parseTags } from './lib';

// GET /api/search?q=<keyword>&limit=100
// Server-side full search over notes (content / tags / source / collection name).
// Replaces the old client-side "fetch every collection then filter" approach,
// which fired 1000+ HTTP requests per search now that collections exceed 1k.
export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 200);

  if (!q) return json({ results: [], total: 0 });
  // 太短的查询直接返回空，避免全表扫出垃圾结果
  if (q.length < 1) return json({ results: [], total: 0 });

  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

  const stmt = env.DB.prepare(
    `SELECT n.id as noteId, n.timestamp, n.content, n.tags, n.source,
            c.id as collectionId, c.name, c.name_en as nameEn
     FROM notes n JOIN collections c ON n.collection_id = c.id
     WHERE n.content LIKE ?1 ESCAPE '\\'
        OR n.tags LIKE ?1 ESCAPE '\\'
        OR n.source LIKE ?1 ESCAPE '\\'
        OR c.name LIKE ?1 ESCAPE '\\'
     ORDER BY c.name, n.seq
     LIMIT ?2`
  ).bind(like, limit);

  const { results } = await stmt.all();

  const notes = (results || []).map((row: any) => ({
    id: row.noteId,
    timestamp: row.timestamp,
    content: row.content,
    tags: parseTags(row.tags),
    source: row.source,
    collectionId: row.collectionId,
    collectionName: row.name || row.nameEn || ''
  }));

  return json({ results: notes, total: notes.length });
}
