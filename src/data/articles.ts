export type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  publishedAt: string;
  image: string;
  sources: { title: string; url: string }[];
  amazonLink?: string; // カスタムAmazonリンク（設定があればカテゴリー検索より優先）
};

// カテゴリー別のAmazon検索キーワード
export const categoryAmazonKeywords: Record<string, string> = {
  'policy': '特別支援教育 制度 法律 専門書',
  'research': '発達障害 学習支援 研究 専門書',
  'practice': '特別支援教育 実践 事例集',
  'tools': '特別支援 教材 ICT 教育',
  'events': '特別支援教育 研修 セミナー',
  'topics': 'インクルーシブ教育 入門書',
  // 新カテゴリー（lib/types.ts の定義に対応）
  'support': '合理的配慮 特別支援教育 専門書',
  'diverse-learning': '不登校 フリースクール オルタナティブ教育',
  'ict': 'EdTech 学習支援 デジタル教材',
};

// Amazon検索URLを生成
export function generateAmazonSearchUrl(categoryId: string): string {
  const keywords = categoryAmazonKeywords[categoryId] || 'インクルーシブ教育 入門書';
  const encodedKeywords = encodeURIComponent(keywords);
  return `https://www.amazon.co.jp/s?k=${encodedKeywords}&i=stripbooks`;
}

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

export const articles: Article[] = [
  {
    id: '1',
    title: '文部科学省、特別支援教育の新ガイドラインを発表 ― インクルーシブ教育の推進を強化',
    slug: 'mext-new-guidelines-2024',
    excerpt: '文部科学省は、2024年度からの特別支援教育に関する新たなガイドラインを発表しました。通常学級における合理的配慮の具体例や、個別の教育支援計画の作成ポイントなど、現場で活用できる実践的な内容が盛り込まれています。',
    content: `
## 新ガイドラインの概要

文部科学省は2024年4月より施行される特別支援教育の新ガイドラインを発表しました。このガイドラインは、2022年に改正された障害者差別解消法を踏まえ、すべての学校における合理的配慮の提供を義務化する内容となっています。

## 主なポイント

### 1. 通常学級における支援の強化

新ガイドラインでは、通常学級に在籍する発達障害のある児童生徒への支援を大幅に強化しています。具体的には：

- **座席配置の工夫**: 集中しやすい環境づくり
- **視覚支援の活用**: スケジュールの可視化、手順書の提示
- **個別の声かけ**: 指示の個別伝達、確認の徹底

### 2. 個別の教育支援計画の充実

すべての特別な支援を必要とする児童生徒に対して、個別の教育支援計画を作成することが求められます。計画には以下の項目を含めることが推奨されています：

1. 本人・保護者の願い
2. 現在の学習状況と課題
3. 長期目標と短期目標
4. 具体的な支援内容
5. 評価方法と時期

### 3. 校内支援体制の整備

特別支援教育コーディネーターを中心とした校内委員会の役割が明確化されました。月1回以上の定例会議の開催や、ケース会議の記録・共有が義務化されます。

## 今後の展望

文部科学省は、このガイドラインの普及に向けて、各都道府県での研修会の実施や、参考事例集の作成を予定しています。現場の教員が実践しやすい環境づくりを進めていく方針です。
    `,
    categoryId: 'policy',
    publishedAt: '2024-03-15',
    image: '/images/article-1.jpg',
    sources: [
      { title: '文部科学省 特別支援教育について', url: 'https://www.mext.go.jp/a_menu/shotou/tokubetu/' },
      { title: '障害者差別解消法', url: 'https://www8.cao.go.jp/shougai/suishin/sabekai.html' },
    ],
  },
  {
    id: '2',
    title: '発達障害児の学習支援に関する最新研究 ― エビデンスに基づく効果的なアプローチ',
    slug: 'latest-research-learning-support',
    excerpt: '国立特別支援教育総合研究所の最新研究により、発達障害のある児童の学習支援において、視覚的支援とスモールステップ指導の組み合わせが特に効果的であることが明らかになりました。',
    content: `
## 研究の背景

国立特別支援教育総合研究所は、過去5年間にわたり、全国200校以上の小中学校で発達障害のある児童生徒への学習支援に関する縦断研究を実施してきました。

## 研究結果のポイント

### 効果が確認された支援方法

研究の結果、以下の支援方法において統計的に有意な効果が確認されました：

**1. 視覚的支援**
- 学習内容の構造化（図解、マインドマップ）
- タイムタイマーの活用
- チェックリストの使用

効果測定では、視覚的支援を導入したグループで課題完遂率が平均32%向上しました。

**2. スモールステップ指導**
- 課題の細分化
- 即時フィードバック
- 成功体験の積み重ね

特に算数・数学において、スモールステップ指導を受けた児童の正答率が23%向上しました。

**3. ICTの活用**
- タブレット端末による個別学習
- 音声読み上げ機能
- 書字支援アプリ

読み書きに困難のある児童において、ICT活用により学習意欲が大幅に向上したことが報告されています。

### 支援の組み合わせの重要性

単一の支援方法よりも、複数の方法を組み合わせることで効果が高まることが示されました。特に「視覚的支援＋スモールステップ＋即時フィードバック」の組み合わせが最も効果的でした。

## 現場への示唆

研究チームは、この結果を踏まえ、現場の教員向けに実践ガイドブックを作成中です。2024年夏には全国の学校に配布される予定です。
    `,
    categoryId: 'research',
    publishedAt: '2024-03-10',
    image: '/images/article-2.jpg',
    sources: [
      { title: '国立特別支援教育総合研究所', url: 'https://www.nise.go.jp/' },
      { title: '発達障害情報・支援センター', url: 'http://www.rehab.go.jp/ddis/' },
    ],
  },
  {
    id: '3',
    title: '通級指導の実践例 ― A市立B小学校の取り組みから学ぶ',
    slug: 'tsukyu-practice-example',
    excerpt: 'A市立B小学校では、通級指導教室と通常学級の連携を強化し、児童の学びの連続性を確保する取り組みを行っています。その具体的な実践と成果を紹介します。',
    content: `
## 学校の概要

A市立B小学校は、児童数約500名の中規模校です。通級指導教室には、言語障害、自閉症・情緒障害、学習障害の3つの教室が設置されており、校内外から約60名の児童が通っています。

## 実践の特徴

### 1. 連携ノートの活用

通級指導教室と在籍学級の担任間で「連携ノート」を活用し、日々の情報共有を行っています。

**連携ノートに記載する内容：**
- 通級での学習内容と児童の様子
- 在籍学級で気づいた変化
- 家庭からの情報
- 次回の指導に向けた課題

この取り組みにより、支援の一貫性が保たれ、児童の成長を継続的に支えることができています。

### 2. 授業参観と相互理解

月に1回、通級指導担当者が在籍学級の授業を参観し、在籍学級担任が通級指導を参観する機会を設けています。

**参観のポイント：**
- 教室環境の確認
- 児童の行動観察
- 有効な支援方法の共有
- 課題の発見

### 3. 保護者との連携

学期に1回、通級指導担当者、在籍学級担任、保護者の三者で面談を実施しています。家庭での様子や課題を共有し、一貫した支援を行っています。

## 成果と課題

### 成果
- 児童の自己肯定感の向上
- 在籍学級での適応行動の増加
- 保護者の安心感の向上

### 今後の課題
- 中学校への引継ぎ体制の構築
- 通級指導担当者の専門性向上
- 校内研修の充実

## まとめ

B小学校の取り組みは、通級指導を「点」ではなく「線」として捉え、児童の学びの連続性を大切にしています。このような連携体制は、他校でも参考になる実践例と言えるでしょう。
    `,
    categoryId: 'practice',
    publishedAt: '2024-03-05',
    image: '/images/article-3.jpg',
    sources: [
      { title: '文部科学省 通級による指導', url: 'https://www.mext.go.jp/a_menu/shotou/tokubetu/main/006.htm' },
    ],
  },
];

export function getArticlesByCategory(categoryId: string): Article[] {
  return articles.filter(article => article.categoryId === categoryId);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(article => article.slug === slug);
}

export function getCategoryById(categoryId: string): Category | undefined {
  return categories.find(category => category.id === categoryId);
}

export function getRelatedArticles(currentArticleId: string, categoryId: string, limit: number = 3): Article[] {
  return articles
    .filter(article => article.id !== currentArticleId && article.categoryId === categoryId)
    .slice(0, limit);
}
