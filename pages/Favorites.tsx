import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { ICONS } from '../constants';
import { Card } from '../components/Card';
import { FavCard, favTagList, getFavorites, removeFavorite, subscribeFavorites } from '../services/favorites';
import { Note } from '../types';

export const Favorites: React.FC = () => {
  const { language } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const zh = (z: string, e: string) => (language === 'zh' ? z : e);

  const initialTag = (location.state as any)?.tag || '';
  const [favs, setFavs] = useState<FavCard[]>([]);
  const [activeTag, setActiveTag] = useState<string>(initialTag);

  useEffect(() => subscribeFavorites(() => setFavs(getFavorites())), []);
  useEffect(() => {
    setFavs(getFavorites());
    if ((location.state as any)?.tag) setActiveTag((location.state as any).tag);
  }, [location.state]);

  const tagCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of favs) for (const t of favTagList(f)) { m[t] = (m[t] || 0) + 1; }
    return Object.entries(m).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
  }, [favs]);

  const shown = activeTag ? favs.filter((f) => favTagList(f).includes(activeTag)) : favs;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <ICONS.Bookmark size={22} className="text-amber-500" />
          {zh('我的收藏', 'My Favorites')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          {zh(`共 ${favs.length} 张收藏卡片`, `${favs.length} favorite cards`)}
        </p>
      </div>

      {/* 标签筛选 */}
      {tagCounts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag('')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              !activeTag
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {zh('全部', 'All')}
          </button>
          {tagCounts.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                activeTag === tag
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              #{tag} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {shown.map((f) => (
            <div key={f.id} className="relative group">
              <Card
                note={{ id: f.id, content: f.content, tags: f.tags, source: f.source, timestamp: f.timestamp || '' } as Note}
                collectionName={f.collectionName || ''}
                collectionId={f.collectionId || ''}
              />
              <button
                onClick={() => removeFavorite(f.id)}
                title={zh('取消收藏', 'Remove favorite')}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-amber-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
              >
                <ICONS.X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <ICONS.Bookmark size={48} className="mx-auto mb-4 opacity-40" />
          <p>{favs.length === 0 ? zh('还没有收藏卡片。去轮播模式按 F 收藏吧。', 'No favorites yet. Press F in slideshow to save cards.') : zh('该标签下没有收藏', 'No favorites with this tag')}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-blue-500 hover:underline">
            {zh('去逛逛', 'Browse cards')}
          </button>
        </div>
      )}
    </div>
  );
};
