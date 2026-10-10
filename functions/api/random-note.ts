import { json, parseTags } from './lib';

export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  const row = await env.DB.prepare(
    `SELECT n.id as noteId, n.timestamp, n.content, n.tags, n.source,
            c.id as collectionId, c.name, c.name_en as nameEn, c.cover_color as coverColor
     FROM notes n JOIN collections c ON n.collection_id = c.id
     ORDER BY RANDOM() LIMIT 1`
  ).first();

  if (!row) return json({ error: 'No notes available' }, 404);

  const note = {
    id: row.noteId,
    timestamp: row.timestamp,
    content: row.content,
    tags: parseTags(row.tags),
    source: row.source
  };
  const collection = {
    id: row.collectionId,
    name: row.name,
    nameEn: row.nameEn,
    coverColor: row.coverColor
  };
  return json({ note, collection });
}
