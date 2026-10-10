import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context';
import {
  ApiCollection,
  fetchCollections,
  adminCreateCollection,
  adminAppendNotes,
  adminDeleteCollection,
  adminDeleteNote
} from '../services/cardService';
import { Note } from '../types';

const inputCls =
  'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500';

const CATEGORY_OPTIONS = [
  { value: 'entrepreneur', label: '商业巨擘' },
  { value: 'philosophy', label: '哲学思想' },
  { value: 'literature', label: '文学经典' },
  { value: 'history', label: '历史智慧' }
];

const COLOR_OPTIONS = [
  'bg-slate-600', 'bg-stone-600', 'bg-red-600', 'bg-orange-600', 'bg-amber-600',
  'bg-yellow-600', 'bg-green-600', 'bg-emerald-600', 'bg-teal-600', 'bg-cyan-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-700', 'bg-fuchsia-800', 'bg-pink-600',
  'bg-zinc-800', 'bg-gray-700', 'bg-red-900'
];

export const Admin: React.FC = () => {
  const { language } = useApp();
  const zh = (z: string, e: string) => (language === 'zh' ? z : e);

  const [key, setKey] = useState(localStorage.getItem('inbox_admin_key') || '');
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 新建合集
  const [form, setForm] = useState({
    id: '', name: '', nameEn: '', description: '', category: 'philosophy', author: '', coverColor: 'bg-slate-600', content: ''
  });
  // 追加语录
  const [appendId, setAppendId] = useState('');
  const [appendText, setAppendText] = useState('');
  // 管理语录
  const [manageId, setManageId] = useState('');
  const [manageNotes, setManageNotes] = useState<Note[]>([]);

  const saveKey = (k: string) => {
    setKey(k);
    if (k) localStorage.setItem('inbox_admin_key', k);
    else localStorage.removeItem('inbox_admin_key');
  };

  const load = useCallback(async () => {
    try {
      setCollections(await fetchCollections());
    } catch (e: any) {
      setError(String(e.message || e));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const ensureKey = (): boolean => {
    if (!key) {
      setError(zh('请先填写管理口令', 'Enter admin key first'));
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreate = async () => {
    if (!ensureKey()) return;
    if (!form.id || !form.name || !form.content) {
      setError(zh('id、名称、语录内容必填', 'id, name and content are required'));
      return;
    }
    setBusy(true);
    try {
      const res: any = await adminCreateCollection({ ...form }, key);
      if (!res || res.error) throw new Error(res?.error || 'fail');
      setForm({ id: '', name: '', nameEn: '', description: '', category: 'philosophy', author: '', coverColor: 'bg-slate-600', content: '' });
      await load();
    } catch (e: any) {
      setError(zh('创建失败: ', 'Create failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  const handleAppend = async () => {
    if (!ensureKey()) return;
    if (!appendId || !appendText) {
      setError(zh('选择合集并填写语录', 'Select collection and enter notes'));
      return;
    }
    setBusy(true);
    try {
      await adminAppendNotes(appendId, appendText, key);
      setAppendText('');
      if (manageId === appendId) setManageNotes([]);
      await load();
    } catch (e: any) {
      setError(zh('追加失败: ', 'Append failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  const handleDeleteCollection = async (id: string) => {
    if (!ensureKey()) return;
    if (!confirm(zh(`确认删除合集 ${id}？`, `Delete collection ${id}?`))) return;
    setBusy(true);
    try {
      await adminDeleteCollection(id, key);
      await load();
      if (manageId === id) {
        setManageId('');
        setManageNotes([]);
      }
    } catch (e: any) {
      setError(zh('删除失败: ', 'Delete failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  const openManage = async (id: string) => {
    if (manageId === id) {
      setManageId('');
      setManageNotes([]);
      return;
    }
    setManageId(id);
    try {
      const r = await fetch(`/api/collections/${id}`);
      const d = await r.json();
      setManageNotes(d.notes || []);
    } catch {
      setManageNotes([]);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!ensureKey()) return;
    setBusy(true);
    try {
      await adminDeleteNote(noteId, key);
      setManageNotes((notes) => notes.filter((n) => n.id !== noteId));
      await load();
    } catch (e: any) {
      setError(zh('删除语录失败: ', 'Delete note failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen text-slate-900 dark:text-slate-100">
      <h1 className="text-3xl font-bold mb-1">{zh('知识录入后台', 'Knowledge Admin')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6">
        {zh('粘贴时间戳语录即可建合集 / 加卡片，可删除。', 'Paste timestamp notes to add collections/cards. Deletable.')}
      </p>

      <div className="mb-4">
        <input
          type="password"
          placeholder={zh('管理口令', 'Admin key')}
          value={key}
          onChange={(e) => saveKey(e.target.value)}
          className={inputCls + ' w-full sm:w-80'}
        />
      </div>
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>
      )}

      {/* 新建合集 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        <h2 className="font-bold mb-4">{zh('新建合集', 'New Collection')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input className={inputCls + ' w-full'} placeholder="id (英文, 唯一)" value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })} />
          <input className={inputCls + ' w-full'} placeholder={zh('名称', 'Name')} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls + ' w-full'} placeholder="Name (EN)" value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          <input className={inputCls + ' w-full'} placeholder={zh('作者', 'Author')} value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <select className={inputCls + ' w-full'} value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className={inputCls + ' w-full'} value={form.coverColor}
            onChange={(e) => setForm({ ...form, coverColor: e.target.value })}>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <input className={inputCls + ' w-full mb-3'} placeholder={zh('简介', 'Description')} value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className={inputCls + ' w-full mb-3 font-mono'} rows={8} placeholder={
          '2024-01-01 10:00:00\n语录内容 #标签\n——出处\n\n2024-01-01 10:05:00\n第二条语录'
        } value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <button onClick={handleCreate} disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-60">
          {zh('保存合集', 'Save Collection')}
        </button>
      </div>

      {/* 追加 / 管理 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        <h2 className="font-bold mb-4">{zh('追加语录 / 管理', 'Append / Manage')}</h2>
        <select className={inputCls + ' w-full mb-3'} value={appendId}
          onChange={(e) => { setAppendId(e.target.value); setManageId(''); setManageNotes([]); }}>
          <option value="">{zh('选择合集', 'Select collection')}</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
          ))}
        </select>
        <textarea className={inputCls + ' w-full mb-3 font-mono'} rows={4}
          placeholder={zh('追加的语录（时间戳格式）', 'Notes to append (timestamp format)')}
          value={appendText} onChange={(e) => setAppendText(e.target.value)} />
        <button onClick={handleAppend} disabled={busy || !appendId}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-60">
          {zh('追加', 'Append')}
        </button>

        <div className="mt-4">
          <button onClick={() => openManage(appendId)} disabled={!appendId}
            className="text-sm text-blue-600 hover:underline disabled:opacity-40">
            {zh('查看 / 删除该合集的语录', 'View / delete notes of this collection')}
          </button>
          {manageId && (
            <div className="mt-3 space-y-2">
              {manageNotes.length === 0 && <p className="text-slate-400 text-sm">（{zh('无语录', 'no notes')}）</p>}
              {manageNotes.map((n) => (
                <div key={n.id}
                  className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{n.content}</div>
                  <button onClick={() => handleDeleteNote(n.id)}
                    className="text-red-500 hover:text-red-700 text-xs flex-shrink-0">{zh('删除', 'Delete')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 列表 */}
      <div>
        <h2 className="font-bold mb-4">{zh('全部合集', 'All Collections')} ({collections.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collections.map((c) => (
            <div key={c.id}
              className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <div className="font-medium text-slate-800 dark:text-white truncate">{c.name}</div>
                <div className="text-xs text-slate-400">{c.id} · {c.count} cards</div>
              </div>
              <button onClick={() => handleDeleteCollection(c.id)}
                className="text-red-500 hover:text-red-700 text-xs flex-shrink-0 ml-2">{zh('删除', 'Delete')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
