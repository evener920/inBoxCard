import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { useApp } from '../context';
import { ICONS } from '../constants';
import { adminUpdateNote } from '../services/cardService';
import { isFavorite, toggleFavorite } from '../services/favorites';

interface SlideshowProps {
  notes: Note[];
  startIndex?: number;
  collectionId?: string;
  collectionName?: string;
  onClose: () => void;
  onNoteUpdated: (note: Note) => void;
}

const AUTO_MS = 6000;

const cleanSource = (source: string) => source.replace(/^[—\-\s]+/, '');

export const Slideshow: React.FC<SlideshowProps> = ({ notes, startIndex = 0, collectionId, collectionName, onClose, onNoteUpdated }) => {
  const { language } = useApp();
  const zh = (z: string, e: string) => (language === 'zh' ? z : e);

  const total = notes.length;
  const [idx, setIdx] = useState(startIndex);
  const [playing, setPlaying] = useState(total > 1);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState(localStorage.getItem('inbox_admin_key') || '');
  const [keyDraft, setKeyDraft] = useState('');
  const [noteForm, setNoteForm] = useState({ timestamp: '', content: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setFavTick] = useState(0); // 触发收藏状态重渲染

  const note = notes[idx];
  const fav = note ? isFavorite(note.id) : false;

  const doFavorite = useCallback(() => {
    if (!note) return;
    toggleFavorite({
      id: note.id,
      content: note.content,
      tags: note.tags,
      source: note.source,
      timestamp: note.timestamp,
      collectionId,
      collectionName
    });
    setFavTick((t) => t + 1);
    setMsg(isFavorite(note.id) ? zh('已收藏', 'Favorited') : zh('已取消收藏', 'Unfavorited'));
    setTimeout(() => setMsg(null), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, collectionId, collectionName]);

  const go = useCallback(
    (dir: number) => {
      if (total <= 1) return;
      setIdx((i) => (i + dir + total) % total);
      setEditing(false);
      setMsg(null);
    },
    [total]
  );

  // 自动轮播
  useEffect(() => {
    if (!playing || editing || total <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % total), AUTO_MS);
    return () => clearInterval(t);
  }, [playing, editing, total]);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === 'Escape') setEditing(false);
        return;
      }
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          go(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          go(-1);
          break;
        case 'p':
        case 'P':
          setPlaying((p) => !p);
          break;
        case 'e':
        case 'E':
          if (note) startEdit(note);
          break;
        case 'f':
        case 'F':
          doFavorite();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, editing, note, doFavorite]);

  const startEdit = (n: Note) => {
    let content = n.content;
    if (n.tags && n.tags.length) content += '\n' + n.tags.map((t) => '#' + t).join(' ');
    if (n.source) content += '\n——' + n.source;
    setNoteForm({ timestamp: n.timestamp, content });
    setEditing(true);
  };

  const saveNote = async () => {
    if (!note) return;
    if (!key.trim()) {
      setMsg(zh('请先输入管理口令', 'Enter admin key first'));
      return;
    }
    if (!noteForm.content.trim()) {
      setMsg(zh('内容不能为空', 'Content required'));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const payload: any = { content: noteForm.content.trim() };
      if (noteForm.timestamp.trim()) payload.timestamp = noteForm.timestamp.trim();
      const res: any = await adminUpdateNote(note.id, payload, key.trim());
      const updated: Note = {
        ...note,
        content: res.content,
        tags: res.tags || [],
        source: res.source || '',
        timestamp: noteForm.timestamp.trim() || note.timestamp,
        collectionId: res.collection_id || collectionId
      };
      onNoteUpdated(updated);
      setEditing(false);
      setMsg(zh('已保存', 'Saved'));
      setTimeout(() => setMsg(null), 2000);
    } catch (err: any) {
      setMsg(zh('保存失败: ', 'Save failed: ') + (err.message || err));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col text-slate-100">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-5 md:px-8 py-4 flex-shrink-0">
        <div className="text-sm font-mono text-slate-400">
          {idx + 1} / {total}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doFavorite}
            className={`p-2.5 rounded-full transition-colors ${
              fav ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={zh(fav ? '取消收藏 (F)' : '收藏 (F)', fav ? 'Unfavorite (F)' : 'Favorite (F)')}
          >
            <ICONS.Star size={18} fill={fav ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title={zh('轮播开关 (P)', 'Toggle auto-play (P)')}
          >
            {playing ? <ICONS.Pause size={18} /> : <ICONS.Play size={18} />}
          </button>
          <button
            onClick={() => note && startEdit(note)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title={zh('编辑当前卡片 (E)', 'Edit card (E)')}
          >
            <ICONS.Edit size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title={zh('退出 (Esc)', 'Exit (Esc)')}
          >
            <ICONS.X size={18} />
          </button>
        </div>
      </div>

      {/* 卡片区 */}
      <div className="flex-1 flex items-center justify-center px-6 md:px-16 pb-8 overflow-hidden">
        {editing ? (
          <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-700 p-6 animate-fadeIn">
            <div className="text-xs font-bold text-slate-400 mb-3">
              {zh(`编辑卡片：${note?.id}`, `Edit card: ${note?.id}`)}
            </div>
            {!key.trim() && (
              <input
                type="password"
                placeholder={zh('管理口令', 'Admin key')}
                value={keyDraft}
                onChange={(e) => {
                  setKeyDraft(e.target.value);
                  setKey(e.target.value);
                  if (e.target.value) localStorage.setItem('inbox_admin_key', e.target.value);
                }}
                className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm outline-none focus:border-blue-500"
              />
            )}
            <input
              className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm font-mono"
              value={noteForm.timestamp}
              onChange={(e) => setNoteForm({ ...noteForm, timestamp: e.target.value })}
              placeholder="2024-01-01 10:00:00"
            />
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-sm font-mono"
              rows={Math.min(14, Math.max(4, noteForm.content.split('\n').length + 1))}
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            />
            <p className="text-[11px] text-slate-500 mt-1 mb-3">
              {zh('正文尾部 #标签 与「——出处」行会被自动识别提取。', 'Trailing #tags and —source lines are auto-detected.')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                {zh('取消', 'Cancel')}
              </button>
              <button
                onClick={saveNote}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {busy ? zh('保存中…', 'Saving…') : zh('保存', 'Save')}
              </button>
            </div>
          </div>
        ) : (
          <div
            key={note?.id}
            className="relative w-full max-w-4xl bg-slate-900/70 rounded-3xl p-10 md:p-16 border border-slate-800 shadow-2xl animate-fadeIn"
          >
            {fav && (
              <span className="absolute top-5 right-6 text-amber-300" title={zh('已收藏', 'Favorited')}>
                <ICONS.Star size={22} fill="currentColor" />
              </span>
            )}
            <div className="text-slate-600 -ml-1 mb-6 select-none">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
              </svg>
            </div>
            <p className="text-slate-100 text-2xl md:text-3xl leading-[1.7] whitespace-pre-wrap font-serif tracking-wide">
              {note?.content}
            </p>
            {note?.source && (
              <div className="mt-10 text-right">
                <span className="text-base text-slate-400 font-medium italic">
                  <span className="opacity-30 mr-2">—</span>
                  {cleanSource(note.source)}
                </span>
              </div>
            )}
            {(note?.tags && note.tags.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                {note.tags.map((t) => (
                  <span key={t} className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底栏：进度 + 快捷键提示 */}
      <div className="flex-shrink-0 px-5 md:px-8 py-4 flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {notes.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
        <div className="text-[11px] text-slate-500 text-center">
          {zh('← → 切换 · 空格 下一张 · F 收藏 · P 轮播 · E 编辑 · Esc 退出', '← → navigate · Space next · F favorite · P auto-play · E edit · Esc exit')}
        </div>
        {msg && <div className="text-xs text-emerald-400">{msg}</div>}
      </div>
    </div>
  );
};
