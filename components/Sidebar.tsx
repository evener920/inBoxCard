import React, { useEffect, useState } from 'react';
import { CATEGORIES, ICONS } from '../constants';
import { useApp } from '../context';
import { ApiCategory, fetchCategories } from '../services/cardService';
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

  // 动态加载分类（D1）
  useEffect(() => {
    fetchCategories()
      .then(setCats)
      .catch(() => {}); // 失败时保留静态兜底
  }, []);

  const handleRandomClick = () => {
    navigate('/review');
    onClose();
  };

  const handleDeveloperClick = () => {
    navigate('/developer');
    onClose();
  };

  const isReviewPage = location.pathname === '/review';
  const isDeveloperPage = location.pathname === '/developer';

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
            <img 
              src="/logo.svg" 
              alt="inBox Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold tracking-tight">inBox Card</h1>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
          <nav className="space-y-1 pb-4">
            <button
              onClick={() => { onSelectCategory('all'); onClose(); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                selectedCategory === 'all' && !isReviewPage && !isDeveloperPage
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

            {/* Developer API Button */}
            <button
              onClick={handleDeveloperClick}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                isDeveloperPage
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <ICONS.Terminal size={18} />
              </span>
              <span>{language === 'zh' ? '开放 API' : 'Open API'}</span>
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
            
            <div className="space-y-1">
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {language === 'zh' ? '分类' : 'Categories'}
              </p>
              {cats.map(category => {
                const Icon = ICONS[category.icon || 'BookOpen'] || ICONS.BookOpen;
                return (
                  <button
                    key={category.id}
                    onClick={() => { onSelectCategory(category.id); onClose(); }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                      selectedCategory === category.id && !isReviewPage && !isDeveloperPage
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{language === 'zh' ? category.name : (category.nameEn || category.name)}</span>
                  </button>
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
