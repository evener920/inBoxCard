import React, { useEffect, useState } from 'react';
import { CATEGORIES, ICONS } from '../constants';
import { useApp } from '../context';
import { ApiCategory, fetchCategories, fetchTagTree, TagTree } from '../services/cardService';
import { favoriteTagCounts, getFavorites, subscribeFavorites } from '../services/favorites';
import { PineLogo } from './PineLogo';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  selectedCategory: string | 'all';
  onSelectCategory: (id: string | 'all') => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedCategory, onSelectCategory, isOpen, onClose }) => {
  const { language, handleInstallClick } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [cats, setCats] = useState<ApiCategory[]>(
    CATEGORIES.map((c) => ({ id: c.id, name: c.label, nameEn: c.labelEn, icon: c.iconName }))
  );
  const [tagTree, setTagTree] = useState<TagTree>({});
  const [favCount, setFavCount] = useState(0);
  const [favTags, setFavTags] = useState<{ tag: string; count: number }[]>([]);
  // 折叠状态（localStorage 记忆；false=展开）
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('inbox_sidebar_collapsed') || '{}'); } catch { return {}; }
  });

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('inbox_sidebar_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // 动态加载分类（D1）
  useEffect(() => {
    fetchCategories()
      .then(setCats)
      .catch(() => {}); // 失败时保留静态兜底
  }, []);

  // 标签树：按分类聚合（可折叠，箭头切换）
  useEffect(() => {
    fetchTagTree().then(setTagTree).catch(() => {});
  }, [location.pathname]); // 收藏/编辑后回到页面时刷新

  // 收藏（localStorage，跨组件同步）
  useEffect(() => {
    const sync = () => {
      setFavCount(getFavorites().length);
      setFavTags(favoriteTagCounts());
    };
    sync();
    return subscribeFavorites(sync);
  }, []);

  // 点击标签 → 全局搜索该标签（搜索已支持 tags 匹配）
  const handleTagClick = (tag: string) => {
    onSelectCategory('all');
    navigate('/', { state: { tag } });
    onClose();
  };

  const handleFavoritesClick = (tag?: string) => {
    navigate('/favorites', { state: tag ? { tag } : undefined });
    onClose();
  };

  const handleRandomClick = () => {
    navigate('/review');
    onClose();
  };

  const isReviewPage = location.pathname === '/review';

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <div className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transform transition-transform duration-300 ease-in-out z-30
        md:translate-x-0 md:static md:h-full flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Fixed Header */}
        <div className="p-6 pb-4 flex-shrink-0">
          <div 
            className="flex items-center space-x-2 text-slate-800 dark:text-white cursor-pointer"
            onClick={() => { onSelectCategory('all'); onClose(); }}
          >
            <PineLogo size={32} className="flex-shrink-0" />
            <h1 className="text-xl font-bold tracking-tight">inBox Card</h1>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
          <nav className="space-y-1 pb-4">
            <button
              onClick={() => { onSelectCategory('all'); onClose(); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                selectedCategory === 'all' && !isReviewPage
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <ICONS.Sparkles size={18} />
              </span>
              <span>{language === 'zh' ? '全部精选' : 'All Collections'}</span>
            </button>

            {/* Random Review Button */}
            <button
              onClick={handleRandomClick}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isReviewPage
                  ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 font-medium shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <ICONS.Dices size={18} />
              </span>
              <span>{language === 'zh' ? '随机漫步' : 'Serendipity'}</span>
            </button>

            <div className="my-4 border-t border-slate-100 dark:border-slate-800/50" />
            
            <button
              onClick={() => { navigate('/admin'); onClose(); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <ICONS.Terminal size={18} />
              </span>
              <span>{language === 'zh' ? '录入后台' : 'Admin'}</span>
            </button>

            <div className="my-4 border-t border-slate-100 dark:border-slate-800/50" />

            {/* 收藏文件夹 + 收藏标签树 */}
            <button
              onClick={() => handleFavoritesClick()}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === '/favorites'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 font-medium shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <ICONS.Bookmark size={18} />
              </span>
              <span>{language === 'zh' ? '我的收藏' : 'Favorites'}</span>
              {favCount > 0 && (
                <span className="ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                  {favCount}
                </span>
              )}
            </button>
            {favTags.length > 0 && (
              <div className="pl-11 pr-3 pb-2 flex flex-wrap gap-1">
                {favTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleFavoritesClick(tag)}
                    title={`${tag} × ${count}`}
                    className="text-[11px] leading-none px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 transition-colors"
                  >
                    #{tag}<span className="opacity-50 ml-0.5">{count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="my-4 border-t border-slate-100 dark:border-slate-800/50" />

            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {language === 'zh' ? '分类' : 'Categories'}
              </p>
              {cats.map(category => {
                const Icon = ICONS[category.icon || 'BookOpen'] || ICONS.BookOpen;
                const tags = tagTree[category.id] || [];
                const isCollapsed = !!collapsed[category.id];
                return (
                  <div key={category.id}>
                    <div className="relative">
                      <button
                        onClick={() => { onSelectCategory(category.id); onClose(); }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                          selectedCategory === category.id && !isReviewPage
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{language === 'zh' ? category.name : (category.nameEn || category.name)}</span>
                      </button>
                      {/* 折叠/展开箭头（独立于选中分类） */}
                      {tags.length > 0 && (
                        <button
                          onClick={() => toggleCollapsed(category.id)}
                          aria-label={isCollapsed ? '展开标签' : '折叠标签'}
                          aria-expanded={!isCollapsed}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                          <ICONS.ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </button>
                      )}
                    </div>
                    {/* 标签树：可折叠 */}
                    {tags.length > 0 && !isCollapsed && (
                      <div className="pl-11 pr-3 pb-2 flex flex-wrap gap-1">
                        {tags.map(({ tag, count }) => (
                          <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            title={`${tag} × ${count}`}
                            className="text-[11px] leading-none px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
                          >
                            #{tag}<span className="opacity-50 ml-0.5">{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
          </nav>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 z-10">

           {/* PWA Install Button - Mobile only */}
           <button
             onClick={handleInstallClick}
             className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 animate-pulse-slow md:hidden"
           >
             <ICONS.Download size={16} />
             <span>{language === 'zh' ? '安装到桌面' : 'Install App'}</span>
           </button>
        </div>
      </div>
    </>
  );
};
