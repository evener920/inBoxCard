import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { Note } from '../types';
import { ICONS } from '../constants';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/Card';
import { ApiCollection, fetchCollections, searchNotes, SearchHit } from '../services/cardService';

interface HomeProps {
  selectedCategory: string | 'all';
}

interface SearchResult extends Note {
  collectionName: string;
  collectionId: string;
}

export const Home: React.FC<HomeProps> = ({ selectedCategory }) => {
  const { language, searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // Load collections from API (D1-backed)
  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch((e) => console.error('load collections failed', e))
      .finally(() => setCollectionsLoading(false));
  }, []);

  // Filter collections for the grid view
  const filteredCollections = useMemo(() => {
    if (searchQuery.trim()) return []; // Use search results view instead
    
    let result = collections;
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category === selectedCategory);
    }
    return result;
  }, [selectedCategory, searchQuery, collections]);

  // Server-side deep search: one API call (D1 SQL LIKE), debounced 300ms
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.trim();

    const timeoutId = setTimeout(() => {
      let cancelled = false;
      searchNotes(query)
        .then((hits: SearchHit[]) => {
          if (!cancelled) {
            setSearchResults(hits);
            setIsSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
            setIsSearching(false);
          }
        });
      return () => { cancelled = true; };
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Clear search state when category changes (ensure list view shows collections)
  useEffect(() => {
    if (searchQuery) {
      setSearchQuery('');
    }
    setSearchResults([]);
    setIsSearching(false);
  }, [selectedCategory]);

  // 侧栏标签树点击 → 以该标签进入搜索（须声明在上面的清空效果之后才能生效）
  const location = useLocation();
  useEffect(() => {
    const tag = (location.state as any)?.tag;
    if (tag) setSearchQuery(tag);
  }, [location.state]);

  // Render Search Results
  if (searchQuery.trim()) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <ICONS.Search size={24} className="text-blue-500" />
            {language === 'zh' ? '搜索结果' : 'Search Results'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {isSearching 
              ? (language === 'zh' ? '正在搜索...' : 'Searching...') 
              : (language === 'zh' ? `找到 ${searchResults.length} 条关于 "${searchQuery}" 的笔记` : `Found ${searchResults.length} notes for "${searchQuery}"`)}
          </p>
        </div>

        {searchResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {searchResults.map(note => (
              <Card 
                key={note.id} 
                note={note} 
                collectionName={note.collectionName}
                collectionId={note.collectionId}
              />
            ))}
          </div>
        ) : (
          !isSearching && (
            <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <ICONS.Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>{language === 'zh' ? '没有找到相关笔记' : 'No matching notes found'}</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-blue-500 hover:underline"
              >
                {language === 'zh' ? '清除搜索' : 'Clear search'}
              </button>
            </div>
          )
        )}
      </div>
    );
  }

  // Render Default Collection Grid
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {language === 'zh' ? '发现知识' : 'Discover Knowledge'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          {language === 'zh'
            ? '探索精粹，一键收纳。'
            : 'Curated knowledge, instantly captured.'}
        </p>
      </div>

      {/* FEATURE: Serendipity Entry Banner (Top, compact) */}
      {!searchQuery && selectedCategory === 'all' && (
        <div
          onClick={() => navigate('/review')}
          className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 px-5 py-4 text-white shadow-md hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer group"
        >
          {/* Background Decor */}
          <div className="absolute -right-6 -bottom-8 text-white/10 group-hover:text-white/20 transition-colors duration-500 rotate-12">
            <ICONS.Sparkles size={96} strokeWidth={1} />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1 text-indigo-100 font-medium text-[11px] uppercase tracking-wider">
                <ICONS.Dices size={12} />
                <span>{language === 'zh' ? '特色功能' : 'Featured'}</span>
              </div>
              <h3 className="text-base md:text-lg font-bold leading-tight mb-1">
                {language === 'zh' ? '随机漫步：与智慧不期而遇' : 'Serendipity: Stumble Upon Wisdom'}
              </h3>
              <p className="text-indigo-100/90 text-xs md:text-sm leading-snug max-w-lg truncate md:text-ellipsis">
                {language === 'zh'
                  ? '打破信息的茧房。随机抽取一张大师的智慧卡片，寻找当下的灵感与共鸣。'
                  : 'Break the echo chamber. Draw a random card of wisdom.'}
              </p>
            </div>
            <button className="flex-shrink-0 bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-md">
              {language === 'zh' ? '开始漫步' : 'Start Shuffling'}
              <ICONS.ArrowLeft className="rotate-180" size={14} />
            </button>
          </div>
        </div>
      )}

      {collectionsLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (filteredCollections.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCollections.map(collection => (
              <div 
                key={collection.id}
                onClick={() => navigate(`/collection/${collection.id}`)}
                className="group cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`h-32 ${collection.coverColor} relative p-6 flex flex-col justify-end`}>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <ICONS.BookOpen size={20} />
                  </div>
                  <h3 className="text-white font-bold text-xl drop-shadow-md">
                    {language === 'zh' ? collection.name : collection.nameEn}
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-4 h-10">
                    {collection.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <ICONS.Feather size={12} />
                      {collection.author}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-500 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                      {collection.count || 0} Cards
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <p>{language === 'zh' ? '没有找到相关分类' : 'No collections found'}</p>
        </div>
      ))}
    </div>
  );
};