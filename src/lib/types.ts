// JSONから読み込む記事の型
export type Article = {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  url: string;
  imageUrl: string;
  source: string;
};

// AIおすすめ記事の型
export type AIPick = {
  id: string;
  sourceArticleId: string;
  title: string;
  url: string;
  category: string;
  originalDate: string;
  reason: string;
  summary: string;
  generatedAt: string;
  model: string;
};

// カテゴリの型
export type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
};

// APIレスポンスの型
export type ArticlesData = {
  articles: Article[];
};

export type AIPicksData = {
  picks: AIPick[];
  lastUpdated: string;
  totalCount: number;
};

// basePath設定
export const BASE_PATH = '/inclusive-edu-navi';

// カテゴリ定義（静的）
export const categories: Category[] = [
  {
    id: 'policy',
    name: '制度・法改正',
    description: '特別支援教育に関する法律、制度、ガイドラインの最新情報',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'research',
    name: '研究・学術',
    description: '発達障害、学習支援に関する最新の研究成果',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'practice',
    name: '実践・事例',
    description: '学校現場での実践例、成功事例の紹介',
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'tools',
    name: '教材・ツール',
    description: '特別支援教育に役立つ教材、ICTツールの紹介',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'events',
    name: 'イベント・研修',
    description: 'セミナー、研修会、学会情報',
    color: 'bg-pink-100 text-pink-800',
  },
  {
    id: 'topics',
    name: '注目トピックス',
    description: '今注目の話題、トレンド情報',
    color: 'bg-yellow-100 text-yellow-800',
  },
];

// カテゴリをIDで取得
export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find(category => category.id === categoryId);
}

// カテゴリ名からカテゴリを取得
export function getCategoryByName(categoryName: string): Category | undefined {
  return categories.find(category => category.name === categoryName);
}
