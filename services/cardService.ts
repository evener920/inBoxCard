import { Note } from '../types';

const getJSON = async (url: string, opts?: RequestInit) => {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
};

export interface ApiCollection {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: string;
  author: string;
  coverColor: string;
  count: number;
}

export interface ApiCategory {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  sort?: number;
}

// ---------- categories（动态分类，带缓存） ----------
let categoryCache: ApiCategory[] | null = null;

export const fetchCategories = async (force = false): Promise<ApiCategory[]> => {
  if (categoryCache && !force) return categoryCache;
  const data: ApiCategory[] = await getJSON('/api/categories');
  categoryCache = data;
  return data;
};

export const invalidateCategories = () => { categoryCache = null; };

export const adminCreateCategory = (
  payload: { id?: string; name: string; nameEn?: string; icon?: string },
  key: string
) => getJSON('/api/categories', { method: 'POST', headers: adminHeaders(key), body: JSON.stringify(payload) });

export const adminDeleteCategory = (id: string, key: string, force = false) =>
  getJSON(`/api/categories/${id}${force ? '?force=1' : ''}`, { method: 'DELETE', headers: { 'x-admin-key': key } });

export const fetchCollections = (): Promise<ApiCollection[]> => getJSON('/api/collections');

// ---------- 标签树（按分类聚合，带缓存） ----------
export type TagTree = Record<string, { tag: string; count: number }[]>;
let tagTreeCache: TagTree | null = null;

export const fetchTagTree = async (force = false): Promise<TagTree> => {
  if (tagTreeCache && !force) return tagTreeCache;
  tagTreeCache = (await getJSON('/api/tags')) as TagTree;
  return tagTreeCache;
};

export const fetchCollection = (
  id: string
): Promise<ApiCollection & { notes: Note[] }> => getJSON(`/api/collections/${id}`);

export const fetchNotes = async (id: string): Promise<Note[]> => {
  const d = await getJSON(`/api/collections/${id}`);
  return d.notes || [];
};

export const fetchRandomNote = (): Promise<{ note: Note; collection: ApiCollection }> =>
  getJSON('/api/random-note');

// 服务端全文搜索（content / tags / source / collection name）
export interface SearchHit extends Note {
  collectionId: string;
  collectionName: string;
}

export const searchNotes = async (q: string, limit = 100): Promise<SearchHit[]> => {
  const d = (await getJSON(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`)) as {
    results: SearchHit[];
  };
  return d.results || [];
};

// ---------- admin ----------
const adminHeaders = (key: string): HeadersInit => ({
  'content-type': 'application/json',
  'x-admin-key': key
});

export const adminCreateCollection = (payload: any, key: string) =>
  getJSON('/api/collections', { method: 'POST', headers: adminHeaders(key), body: JSON.stringify(payload) });

export const adminAppendNotes = (id: string, content: string, key: string) =>
  getJSON(`/api/collections/${id}/notes`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ content })
  });

export const adminDeleteCollection = (id: string, key: string) =>
  getJSON(`/api/collections/${id}`, { method: 'DELETE', headers: { 'x-admin-key': key } });

export const adminDeleteNote = (noteId: string, key: string) =>
  getJSON(`/api/notes/${noteId}`, { method: 'DELETE', headers: { 'x-admin-key': key } });

export const adminUpdateNote = (
  noteId: string,
  payload: { content?: string; timestamp?: string; tags?: string[]; source?: string; collection_id?: string },
  key: string
) => getJSON(`/api/notes/${noteId}`, { method: 'PUT', headers: adminHeaders(key), body: JSON.stringify(payload) });

export const adminUpdateCollection = (id: string, payload: any, key: string) =>
  getJSON(`/api/collections/${id}`, { method: 'PUT', headers: adminHeaders(key), body: JSON.stringify(payload) });
