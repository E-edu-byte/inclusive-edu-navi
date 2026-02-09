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
  importanceScore?: number; // AI重要度スコア（1-100）
};

// ランキング用の記事型
export type RankedArticle = Article & {
  totalScore: number; // 総合スコア（重要度 + 閲覧数 + しおり数）
  viewCount: number;
  bookmarkCount: number;
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

// カテゴリ定義（6カテゴリー）
export const categories: Category[] = [
  {
    id: 'support',
    name: '支援・合理的配慮',
    description: '学校や現場での具体的な支援方法、個別の配慮事例、ギフテッド・2eへの配慮',
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'diverse-learning',
    name: '多様な学び',
    description: '不登校支援、フリースクール、通信制高校、ギフテッド（特異な才能）支援',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'research',
    name: '研究',
    description: '脳科学、発達研究、教育心理学、学術論文、研究機関の成果発表',
    color: 'bg-cyan-100 text-cyan-800',
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

// 要約が公開可能（AI要約完了済み）かどうかを判定
export function isPublishableSummary(summary: string | undefined): boolean {
  if (!summary || summary.trim().length === 0) return false;

  // 準備中プレースホルダーを含む場合は非公開
  if (summary.includes('【要約準備中】')) return false;

  // 不完全な文末パターンを含む場合は非公開
  const incompleteEndings = ['...', '・・・', '…', '[&#8230;]', ' ['];
  for (const ending of incompleteEndings) {
    if (summary.trim().endsWith(ending)) return false;
  }

  // 20文字未満は非公開
  if (summary.trim().length < 20) return false;

  return true;
}

// 公開可能な記事のみをフィルタリング
export function filterPublishableArticles(articles: Article[]): Article[] {
  return articles.filter(article => isPublishableSummary(article.summary));
}
