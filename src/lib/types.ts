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
  mainKeyword?: string; // Amazon検索用キーワード（AI抽出）
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

// カテゴリ定義（新5カテゴリー）
export const categories: Category[] = [
  {
    id: 'support',
    name: '合理的配慮・支援',
    description: '学校や現場での具体的な支援方法、個別の配慮事例、ギフテッド・2eへの配慮',
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'diverse-learning',
    name: '不登校・多様な学び',
    description: '不登校支援、フリースクール、通信制高校、ギフテッド（特異な才能）支援',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'policy',
    name: '制度・行政',
    description: '文科省の通知、法律、自治体の施策、ガイドライン',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'ict',
    name: 'ICT・教材',
    description: '支援技術、デジタル教科書、学習アプリ、EdTech',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'events',
    name: 'イベント・研修',
    description: 'セミナー、ワークショップ、講演会、研修会情報',
    color: 'bg-pink-100 text-pink-800',
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
