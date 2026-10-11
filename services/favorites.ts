// 收藏功能：localStorage 持久化（无登录），跨组件通过自定义事件同步。
export interface FavCard {
  id: string;
  content: string;
  tags?: string[];
  source?: string;
  timestamp?: string;
  collectionId?: string;
  collectionName?: string;
  favoritedAt: number;
}

const KEY = 'inbox_favorites';
const EVT = 'inbox_fav_change';

export const getFavorites = (): FavCard[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const isFavorite = (id: string): boolean =>
  getFavorites().some((f) => f.id === id);

/** 切换收藏状态，返回切换后是否已收藏 */
export const toggleFavorite = (card: Omit<FavCard, 'favoritedAt'>): boolean => {
  const list = getFavorites();
  const idx = list.findIndex((f) => f.id === card.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem(KEY, JSON.stringify(list));
    emit();
    return false;
  }
  list.unshift({ ...card, favoritedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list));
  emit();
  return true;
};

export const removeFavorite = (id: string) => {
  localStorage.setItem(KEY, JSON.stringify(getFavorites().filter((f) => f.id !== id)));
  emit();
};

/** 订阅收藏变更（含其他标签页 storage 事件），返回取消函数 */
export const subscribeFavorites = (cb: () => void): (() => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener('storage', cb);
  };
};

const emit = () => window.dispatchEvent(new Event(EVT));

/** 卡片的有效标签：无标签时用合集名兜底（保证收藏筛选条能按合集聚合） */
export const favTagList = (f: FavCard): string[] => {
  const tags = (f.tags || []).filter(Boolean);
  if (tags.length > 0) return tags;
  return f.collectionName ? [f.collectionName] : [];
};

/** 从收藏列表聚合标签计数（无标签卡片按合集名兜底），降序 */
export const favoriteTagCounts = (): { tag: string; count: number }[] => {
  const m: Record<string, number> = {};
  for (const f of getFavorites()) {
    for (const t of favTagList(f)) {
      m[t] = (m[t] || 0) + 1;
    }
  }
  return Object.entries(m)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};
