import React, { useState } from 'react';
import { Note } from '../types';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { adminUpdateNote, fetchCollections } from '../services/cardService';

interface CardProps {
  note: Note;
  collectionName?: string;
  collectionId?: string;
  onNoteUpdated?: (note: Note) => void;
}

export const Card: React.FC<CardProps> = ({ note, collectionName, collectionId, onNoteUpdated }) => {
  const { language } = useApp();
  const navigate = useNavigate();
  const zh = (z: string, e: string) => (language === 'zh' ? z : e);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState('');
  const [key, setKey] = useState(localStorage.getItem('inbox_admin_key') || '');
  const [keyDraft, setKeyDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [targetCol, setTargetCol] = useState(collectionId || '');

  // Helper to clean up source string (remove leading dashes)
  const cleanSource = (source: string) => {
    return source.replace(/^[—\-\s]+/, '');
  };

  const startEdit = () => {
    let content = note.content;
    if (note.tags && note.tags.length) content += '\n' + note.tags.map((t) => '#' + t).join(' ');
    if (note.source) content += '\n——' + note.source;
    setForm(content);
    setMsg(null);
    setTargetCol(collectionId || '');
    setEditing(true);
    fetchCollections()
      .then((cols) => setCollections(cols.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  };

  const save = async () => {
    const k = key.trim() || keyDraft.trim();
    if (!k) {
      setMsg(zh('请输入管理口令', 'Enter admin key'));
      return;
    }
    if (!form.trim()) {
      setMsg(zh('内容不能为空', 'Content required'));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (keyDraft.trim()) {
        setKey(keyDraft.trim());
        localStorage.setItem('inbox_admin_key', keyDraft.trim());
      }
      const moving = !!targetCol && targetCol !== collectionId;
      let payloadContent = form.trim();
      let payload: any = { content: payloadContent };
      if (moving) {
        // 剥离正文行尾 #标签，标签由 body.tags 提供（已同步成目标合集名）
        payloadContent = form.replace(/\n#[\s\S]*$/, '').trim();
        const tName = collections.find((c) => c.id === targetCol)?.name;
        payload = {
          content: payloadContent,
          collection_id: targetCol,
          tags: tName ? [tName] : []
        };
      }
      const res: any = await adminUpdateNote(note.id, payload, k);
      onNoteUpdated?.({
        ...note,
        content: res.content,
        tags: res.tags || [],
        source: res.source || '',
        collectionId: res.collection_id
      });
      setEditing(false);
    } catch (err: any) {
      setMsg(zh('保存失败: ', 'Save failed: ') + (err.message || err));
    }
    setBusy(false);
  };

  if (editing) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border-2 border-blue-300 dark:border-blue-700 flex flex-col h-full">
        <div className="text-[11px] font-bold text-slate-400 mb-2 font-mono">{note.id}</div>
        {!key.trim() && (
          <input
            type="password"
            autoFocus
            placeholder={zh('管理口令', 'Admin key')}
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:border-blue-500"
          />
        )}
        <textarea
          autoFocus={!!key.trim()}
          className="w-full flex-1 min-h-[180px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm leading-relaxed outline-none focus:border-blue-500 resize-y"
          rows={Math.min(16, Math.max(5, form.split('\n').length + 1))}
          value={form}
          onChange={(e) => setForm(e.target.value)}
        />
        {collections.length > 1 && (
          <label className="block mt-3">
            <span className="text-[11px] font-bold text-slate-400">{zh('移入合集', 'Move to collection')}</span>
            <select
              value={targetCol}
              onChange={(e) => setTargetCol(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:border-blue-500"
            >
              {collections
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.id === collectionId ? ` (${zh('当前', 'current')})` : ''}
                  </option>
                ))}
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {zh('选择其他合集即把本卡移动过去，并自动把 #标签 改为该合集名。', 'Pick another collection to move this card; its #tag is auto-synced to the new name.')}
            </span>
          </label>
        )}
        <p className="text-[11px] text-slate-400 mt-1.5">
          {zh('正文尾部 #标签 与「——出处」行会被自动识别提取。', 'Trailing #tags and —source lines are auto-detected.')}
        </p>
        {msg && <p className="text-xs text-red-500 mt-1.5">{msg}</p>}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            {zh('取消', 'Cancel')}
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
          >
            {busy ? zh('保存中…', 'Saving…') : zh('保存', 'Save')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 flex flex-col h-full group relative hover:-translate-y-1">

      {/* Edit button (hover, top-right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          startEdit();
        }}
        title={zh('编辑此卡', 'Edit card')}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-600 dark:hover:text-blue-400 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
      >
        <ICONS.Edit size={15} />
      </button>

      {/* 1. Context Label (Search Results only) */}
      {collectionName && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if(collectionId) navigate(`/collection/${collectionId}`);
          }}
          className="mb-6 flex items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity w-fit"
        >
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
            <ICONS.BookOpen size={10} />
            {collectionName}
          </span>
        </div>
      )}

      {/* 2. Main Content & Source (The Core) */}
      <div className="flex-1 flex flex-col">
        {/* Decorative Quote Mark */}
        <div className="text-slate-200 dark:text-slate-700/50 -ml-1 mb-4 select-none">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
             <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
          </svg>
        </div>

        <div className="space-y-6">
          <p className="text-slate-800 dark:text-slate-100 text-[17px] leading-[1.8] whitespace-pre-wrap font-serif tracking-wide selection:bg-blue-100 dark:selection:bg-blue-900">
            {note.content}
          </p>

          {/* Translation */}
          {language === 'en' && note.translation && (
            <p className="text-slate-500 dark:text-slate-400 text-sm border-l-2 border-slate-200 dark:border-slate-700 pl-3 italic mt-4">
              {note.translation}
            </p>
          )}
        </div>

        {/* Source Signature - Now part of the content flow */}
        {note.source && (
          <div className="mt-8 text-right pl-4">
            <div className="text-sm text-slate-400 dark:text-slate-500 font-medium italic relative inline-block group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              <span className="opacity-30 mr-2">—</span>
              {cleanSource(note.source)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
