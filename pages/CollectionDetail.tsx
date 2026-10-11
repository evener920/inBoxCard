import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { ICONS } from '../constants';
import { Card } from '../components/Card';
import { Slideshow } from '../components/Slideshow';
import { Note } from '../types';
import { ApiCollection, fetchCollection } from '../services/cardService';

export const CollectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSlideshow, setShowSlideshow] = useState(false);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchCollection(id)
      .then((data) => {
        setCollection({
          id: data.id,
          name: data.name,
          nameEn: data.nameEn,
          description: data.description,
          category: data.category,
          author: data.author,
          coverColor: data.coverColor,
          count: data.count
        });
        setNotes(data.notes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(language === 'zh' ? '加载失败。' : 'Failed to load.');
        setLoading(false);
      });
  }, [id, language]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  if (error || !collection) {
    return <div className="p-10 text-center text-slate-500">{error || 'Collection not found'}</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen flex flex-col">
      {/* Header - Sticky & Hover Interaction */}
      <div className="sticky top-0 z-10 -mt-6 pt-6 pb-4 -mx-6 px-6 mb-6 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all shadow-sm group/header">
        <div className="flex items-center justify-between gap-2 md:gap-4 max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all gap-1.5 md:gap-2 px-2 md:px-3 py-2 -ml-2 md:-ml-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
            title={language === 'zh' ? '返回首页' : 'Back to Home'}
          >
            <ICONS.ArrowLeft size={20} className="md:group-hover/header:scale-110 transition-transform" />
            <span className="font-medium text-sm md:text-base">{language === 'zh' ? '返回' : 'Back'}</span>
          </button>

          <div className="flex-shrink-0"></div>

          <button
            onClick={() => setShowSlideshow(true)}
            disabled={notes.length === 0}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs md:text-sm font-semibold transition-all flex-shrink-0 shadow-sm"
            title={language === 'zh' ? '卡片轮播（快捷键：← → 切换，空格下一张，P 轮播，E 编辑，Esc 退出）' : 'Slideshow (keys: ← →, Space, P, E, Esc)'}
          >
            <ICONS.Play size={14} className="md:w-4 md:h-4" />
            <span>{language === 'zh' ? '轮播' : 'Play'}</span>
          </button>
        </div>
      </div>

      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {language === 'zh' ? collection.name : collection.nameEn}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          {collection.description}
        </p>
        <p className="text-xs font-mono text-slate-400 mt-2 bg-slate-100 dark:bg-slate-800/50 inline-block px-2 py-1 rounded">
          Source: {collection.id}
        </p>
      </div>

      {/* Content */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {notes.map((note) => (
              <Card
                key={note.id}
                note={note}
                onNoteUpdated={(updated) =>
                  setNotes((prev) => {
                    if (updated.collectionId && updated.collectionId !== id) {
                      return prev.filter((n) => n.id !== updated.id);
                    }
                    return prev.map((n) => (n.id === updated.id ? updated : n));
                  })
                }
              />
          ))}
        </div>
      ) : (
        <div className="text-center text-slate-400 py-20">No notes found in this file.</div>
      )}

      {showSlideshow && (
        <Slideshow
          notes={notes}
          startIndex={0}
          collectionId={id || undefined}
          collectionName={language === 'zh' ? collection?.name : collection?.nameEn}
          onClose={() => setShowSlideshow(false)}
          onNoteUpdated={(updated) =>
            setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
          }
        />
      )}
    </div>
  );
};
