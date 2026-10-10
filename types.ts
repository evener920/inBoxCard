export interface Note {
  id: string;
  content: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  tags?: string[];
  translation?: string; // For bilingual support (parsed from content if available)
  source?: string; // New field for the origin/author/citation
}

export interface Collection {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: string; // 分类 id，对应 D1 categories 表
  author: string;
  coverColor: string;
  filePath: string; // Path to the .txt file in the cards directory
  count?: number; // Approximate number of cards for display
  notes?: Note[]; // Optional now, loaded async
}

export interface Category {
  id: string;
  label: string;
  labelEn?: string;
  iconName?: string; // lucide-react icon key in ICONS
}

export type Language = 'zh' | 'en';
export type Theme = 'light' | 'dark';


export interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  installPrompt: any; // Holds the beforeinstallprompt event
  handleInstallClick: () => void;
}