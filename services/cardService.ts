import { Note, CategoryId } from '../types';

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
  category: CategoryId;
  author: string;
  coverColor: string;
  count: number;
}

export const fetchCollections = (): Promise<ApiCollection[]> => getJSON('/api/collections');

export const fetchCollection = (
  id: string
): Promise<ApiCollection & { notes: Note[] }> => getJSON(`/api/collections/${id}`);

export const fetchNotes = async (id: string): Promise<Note[]> => {
  const d = await getJSON(`/api/collections/${id}`);
  return d.notes || [];
};

export const fetchRandomNote = (): Promise<{ note: Note; collection: ApiCollection }> =>
  getJSON('/api/random-note');

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
