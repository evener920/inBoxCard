import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context';
import {
  ApiCollection,
  ApiCategory,
  fetchCollections,
  fetchNotes,
  fetchCategories,
  adminCreateCollection,
  adminAppendNotes,
  adminDeleteCollection,
  adminDeleteNote,
  adminCreateCategory,
  adminDeleteCategory
} from '../services/cardService';
import { Note } from '../types';
import { ICONS } from '../constants';

const inputCls =
  'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500';

const ICON_OPTIONS = ['BookOpen', 'Briefcase', 'Feather', 'History', 'Globe', 'Sparkles', 'Dices', 'Terminal', 'Search', 'Share2', 'Moon', 'Sun', 'Star', 'Heart', 'Flag', 'Bookmark'];
const FALLBACK_ICONS: Record<string, any> = { Star: '✦', Heart: '♥', Flag: '⚑', Bookmark: '⚓' };

const COLOR_OPTIONS = [
  'bg-slate-600', 'bg-stone-600', 'bg-red-600', 'bg-orange-600', 'bg-amber-600',
  'bg-yellow-600', 'bg-green-600', 'bg-emerald-600', 'bg-teal-600', 'bg-cyan-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-700', 'bg-fuchsia-800', 'bg-pink-600',
  'bg-zinc-800', 'bg-gray-700', 'bg-red-900'
];

const TS_LINE_RE = /^\d{4}[-./]\d{2}[-./]\d{2}([ T]\d{1,2}:\d{2}(:\d{2})?)?\s*$/;

/**
 * 智能归一化：把任意常见录入格式转成后端要求的时间戳格式。
 * 支持：一句一行 / 空行分段 / 完整时间戳格式（原样保留）。
 */
export function smartParseToTimestampFormat(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  // 已含时间戳行 → 认为是标准格式，原样交给后端
  if (trimmed.split('\n').some((l) => TS_LINE_RE.test(l.trim()))) return trimmed;

  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const now = Date.now();
  // 有空行 → 按段拆（支持多行语录）；否则一句一行
  const blocks = (trimmed.includes('\n\n') ? trimmed.split(/\n\s*\n+/) : trimmed.split('\n'))
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks
    .map((b, i) => `${fmt(new Date(now + i * 60000))}\n${b}`)
    .join('\n\n');
}

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const randomColor = () => COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];

export const Admin: React.FC = () => {
  const { language } = useApp();
  const zh = (z: string, e: string) => (language === 'zh' ? z : e);

  const [key, setKey] = useState(localStorage.getItem('inbox_admin_key') || '');
  const [keyLocked, setKeyLocked] = useState(!!localStorage.getItem('inbox_admin_key'));
  const [keyInput, setKeyInput] = useState('');
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 录入模式
  const [mode, setMode] = useState<'append' | 'new'>('append');
  const [targetId, setTargetId] = useState('');
  const [text, setText] = useState('');

  // 动态分类
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('BookOpen');

  // 新建合集的极简字段
  const [name, setName] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [more, setMore] = useState({ nameEn: '', author: '', category: 'philosophy', description: '' });

  // 管理
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

  const loadCats = useCallback(async () => {
    try {
      const list = await fetchCategories(true);
      setCats(list);
      // 保证默认选中项存在
      setMore((m) =>
        list.some((c) => c.id === m.category) || !list.length
          ? m
          : { ...m, category: list[0].id }
      );
    } catch {
      // 忽略，下拉留空可手输
    }
  }, []);
  useEffect(() => {
    loadCats();
  }, [loadCats]);

  const parsedCount = useMemo(() => {
    if (!text.trim()) return 0;
    const normalized = smartParseToTimestampFormat(text);
    return (normalized.match(/^\d{4}[-./]\d{2}[-./]\d{2}\s+\d{2}:\d{2}/gm) || []).length;
  }, [text]);

  const ensureKey = (): boolean => {
    if (!key) {
      setError(zh('请先填写管理口令', 'Enter admin key first'));
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = async () => {
    if (!ensureKey()) return;
    const content = smartParseToTimestampFormat(text);
    if (!content) {
      setError(zh('请填写语录内容', 'Enter notes first'));
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      if (mode === 'append') {
        if (!targetId) throw new Error(zh('请选择目标合集', 'Select a collection'));
        await adminAppendNotes(targetId, content, key);
        setOkMsg(zh(`已追加 ${parsedCount} 条到「${collections.find((c) => c.id === targetId)?.name || targetId}」`, `Appended ${parsedCount} notes`));
      } else {
        if (!name.trim()) throw new Error(zh('请填写合集名称', 'Collection name required'));
        const id = slugify(more.nameEn) || 'c' + Math.random().toString(36).slice(2, 8);
        await adminCreateCollection({
          id,
          name: name.trim(),
          nameEn: more.nameEn.trim() || name.trim(),
          description: more.description.trim(),
          category: more.category,
          author: more.author.trim() || name.trim(),
          coverColor: randomColor(),
          content
        }, key);
        setOkMsg(zh(`已创建「${name.trim()}」（${parsedCount} 条）`, `Created "${name.trim()}" (${parsedCount} notes)`));
        setName('');
        setMore({ nameEn: '', author: '', category: 'philosophy', description: '' });
        setShowMore(false);
        await load();
        setTargetId(id);
      }
      setText('');
    } catch (e: any) {
      setError(zh('保存失败: ', 'Save failed: ') + (e.message || e));
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
      setManageNotes(await fetchNotes(id));
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

  const handleDeleteCollection = async (id: string) => {
    if (!ensureKey()) return;
    if (!confirm(zh(`确认删除合集 ${id}？其下所有语录将一并删除。`, `Delete collection ${id} and all its notes?`))) return;
    setBusy(true);
    try {
      await adminDeleteCollection(id, key);
      await load();
      if (manageId === id) {
        setManageId('');
        setManageNotes([]);
      }
      if (targetId === id) setTargetId('');
    } catch (e: any) {
      setError(zh('删除失败: ', 'Delete failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  const handleCreateCategory = async () => {
    if (!ensureKey()) return;
    if (!newCatName.trim()) {
      setError(zh('请填写分类名称', 'Category name required'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res: any = await adminCreateCategory(
        { name: newCatName.trim(), nameEn: newCatEn.trim(), icon: newCatIcon },
        key
      );
      await loadCats();
      setMore((m) => ({ ...m, category: res.id }));
      setOkMsg(zh(`已创建分类「${newCatName.trim()}」`, `Category "${newCatName.trim()}" created`));
      setNewCatName('');
      setNewCatEn('');
      setNewCatIcon('BookOpen');
    } catch (e: any) {
      setError(zh('创建分类失败: ', 'Create category failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!ensureKey()) return;
    if (!confirm(zh(`确认删除分类 ${id}？`, `Delete category ${id}?`))) return;
    setBusy(true);
    try {
      await adminDeleteCategory(id, key);
      if (more.category === id) setMore((m) => ({ ...m, category: cats.find((c) => c.id !== id)?.id || '' }));
      await loadCats();
    } catch (e: any) {
      setError(zh('删除分类失败: ', 'Delete category failed: ') + (e.message || e));
    }
    setBusy(false);
  };

  // ---------- 口令未确认时，先只显示口令页 ----------
  if (!keyLocked) {
    return (
      <div className="p-6 max-w-sm mx-auto min-h-screen flex flex-col justify-center text-slate-900 dark:text-slate-100">
        <h1 className="text-2xl font-bold mb-4">{zh('知识录入', 'Knowledge Admin')}</h1>
        <input
          type="password"
          placeholder={zh('管理口令', 'Admin key')}
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && keyInput) { saveKey(keyInput); setKeyLocked(true); } }}
          className={inputCls + ' w-full mb-3'}
          autoFocus
        />
        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
        <button
          onClick={() => { if (keyInput) { saveKey(keyInput); setKeyLocked(true); setError(null); } else setError(zh('请输入口令', 'Key required')); }}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
        >
          {zh('进入', 'Enter')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto min-h-screen text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{zh('知识录入', 'Knowledge Admin')}</h1>
        <button onClick={() => { setKeyLocked(false); setKeyInput(''); }}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          {zh('退出', 'Sign out')}
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
      {okMsg && <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">{okMsg}</div>}

      {/* 录入主卡片：一切只需一个输入框 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
        {/* 模式切换 */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 mb-4">
          <button onClick={() => setMode('append')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'append' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            {zh('追加到已有合集', 'Append')}
          </button>
          <button onClick={() => setMode('new')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'new' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
            {zh('新建合集', 'New Collection')}
          </button>
        </div>

        {mode === 'append' ? (
          <select className={inputCls + ' w-full mb-3'} value={targetId}
            onChange={(e) => setTargetId(e.target.value)}>
            <option value="">{zh('选择合集…', 'Select collection…')}</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}（{c.count}）</option>
            ))}
          </select>
        ) : (
          <div className="mb-3">
            <input className={inputCls + ' w-full'} placeholder={zh('合集名称（必填，其余自动生成）', 'Collection name (required)')}
              value={name} onChange={(e) => setName(e.target.value)} />
            <button onClick={() => setShowMore(!showMore)}
              className="mt-2 text-xs text-blue-600 hover:underline">
              {showMore ? zh('收起可选信息 ▲', 'Hide options ▲') : zh('英文名 / 作者 / 分类 / 简介（可选）▼', 'Name EN / Author / Category / Description (optional) ▼')}
            </button>
            {showMore && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <input className={inputCls} placeholder="Name (EN) — 兼作 URL id" value={more.nameEn}
                  onChange={(e) => setMore({ ...more, nameEn: e.target.value })} />
                <input className={inputCls} placeholder={zh('作者', 'Author')} value={more.author}
                  onChange={(e) => setMore({ ...more, author: e.target.value })} />
                <select className={inputCls} value={more.category}
                  onChange={(e) => setMore({ ...more, category: e.target.value })}>
                  {cats.length === 0 && <option value={more.category}>{more.category || '（无分类）'}</option>}
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input className={inputCls} placeholder={zh('简介', 'Description')} value={more.description}
                  onChange={(e) => setMore({ ...more, description: e.target.value })} />
                {/* 内联新增分类 */}
                <div className="md:col-span-2 flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500">{zh('新增分类：', 'New category:')}</span>
                  <input className={inputCls + ' flex-1 min-w-[8rem]'} placeholder={zh('分类名称（如：国学经典）', 'Category name')}
                    value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                  <input className={inputCls + ' w-32'} placeholder="EN name（可选）" value={newCatEn}
                    onChange={(e) => setNewCatEn(e.target.value)} />
                  <select className={inputCls + ' w-auto'} value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}>
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>{FALLBACK_ICONS[ic] || ''} {ic}</option>
                    ))}
                  </select>
                  <button onClick={handleCreateCategory} disabled={busy || !newCatName.trim()}
                    className="px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold disabled:opacity-50">
                    {zh('＋建分类', '＋ Add')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 唯一的大输入框 */}
        <textarea className={inputCls + ' w-full font-mono'} rows={10} value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={zh(
            '直接粘贴语录，怎么贴都行：\n\n· 一句一行（每行一条）\n· 空行分段（一段一条，可多行）\n· 或标准时间戳格式（2024-01-01 10:00 开头的行）\n\n行尾 #标签 会自动识别，「——出处」单独成行会提取为出处。不写时间将自动记录为当前时间。',
            'Paste quotes freely: one per line, separated by blank lines, or standard timestamp format. #tags and —source are auto-detected.'
          )} />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">
            {text.trim() ? zh(`已识别 ${parsedCount} 条语录`, `${parsedCount} notes detected`) : ''}
          </span>
          <button onClick={handleSave} disabled={busy || !text.trim()}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50">
            {busy ? zh('保存中…', 'Saving…') : zh('保存', 'Save')}
          </button>
        </div>
      </div>

      {/* 分类管理（折叠） */}
      <details className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
        <summary className="px-5 py-4 cursor-pointer font-bold select-none">
          {zh('分类管理', 'Manage categories')}
        </summary>
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {cats.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  {(() => {
                    const Icon = (ICONS as any)[c.icon || 'BookOpen'] || ICONS.BookOpen;
                    return <Icon size={16} className="text-slate-400 flex-shrink-0" />;
                  })()}
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-800 dark:text-white truncate">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.id}{c.nameEn ? ` · ${c.nameEn}` : ''}</div>
                  </div>
                </div>
                <button onClick={() => handleDeleteCategory(c.id)}
                  className="text-red-500 hover:text-red-700 text-xs flex-shrink-0 ml-2">{zh('删除', 'Delete')}</button>
              </div>
            ))}
            {cats.length === 0 && <p className="text-slate-400 text-sm">{zh('暂无分类', 'No categories')}</p>}
          </div>
          {/* 新增分类表单 */}
          <div className="flex flex-wrap items-center gap-2">
            <input className={inputCls + ' flex-1 min-w-[10rem]'} placeholder={zh('分类名称（必填）', 'Category name (required)')}
              value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            <input className={inputCls + ' w-36'} placeholder="EN name（可选）" value={newCatEn}
              onChange={(e) => setNewCatEn(e.target.value)} />
            <select className={inputCls + ' w-auto'} value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}>
              {ICON_OPTIONS.map((ic) => (
                <option key={ic} value={ic}>{FALLBACK_ICONS[ic] || ''} {ic}</option>
              ))}
            </select>
            <button onClick={handleCreateCategory} disabled={busy || !newCatName.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50">
              {zh('＋新增分类', '＋ Add category')}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {zh('删除分类前需先删除或移动使用它的合集；新分类会立即出现在侧栏。', 'A category in use cannot be deleted. New categories appear in the sidebar immediately.')}
          </p>
        </div>
      </details>

      {/* 管理（折叠） */}
      <details className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
        <summary className="px-5 py-4 cursor-pointer font-bold select-none">
          {zh('管理合集与语录', 'Manage collections & notes')}
        </summary>
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {collections.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                <button onClick={() => openManage(c.id)} className="min-w-0 text-left flex-1">
                  <div className={`font-medium text-sm truncate ${manageId === c.id ? 'text-blue-600' : 'text-slate-800 dark:text-white'}`}>
                    {manageId === c.id ? '▾ ' : '▸ '}{c.name}
                  </div>
                  <div className="text-xs text-slate-400">{c.id} · {c.count} cards</div>
                </button>
                <button onClick={() => handleDeleteCollection(c.id)}
                  className="text-red-500 hover:text-red-700 text-xs flex-shrink-0 ml-2">{zh('删合集', 'Delete')}</button>
              </div>
            ))}
          </div>
          {manageId && (
            <div className="space-y-2">
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
      </details>
    </div>
  );
};
