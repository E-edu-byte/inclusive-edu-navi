/**
 * RSS フィード生成スクリプト
 * ビルド時に実行して静的なfeed.xmlを生成する
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// 記事データを直接インポートできないため、簡易版を使用
const SITE_URL = 'https://example.github.io/inclusive-edu-navi';
const SITE_TITLE = 'インクルーシブ教育ナビ';
const SITE_DESCRIPTION = 'すべての子どもの学びを支える最新情報。インクルーシブ教育に関するニュース、研究、実践事例をお届けします。';

// サンプル記事データ（実際は data/articles.ts から読み込む）
const articles = [
  {
    title: '文部科学省、特別支援教育の新ガイドラインを発表 ― インクルーシブ教育の推進を強化',
    slug: 'mext-new-guidelines-2024',
    excerpt: '文部科学省は、2024年度からの特別支援教育に関する新たなガイドラインを発表しました。',
    publishedAt: '2024-03-15',
    category: '制度・法改正',
  },
  {
    title: '発達障害児の学習支援に関する最新研究 ― エビデンスに基づく効果的なアプローチ',
    slug: 'latest-research-learning-support',
    excerpt: '国立特別支援教育総合研究所の最新研究により、発達障害のある児童の学習支援について新たな知見が得られました。',
    publishedAt: '2024-03-10',
    category: '研究・学術',
  },
  {
    title: '通級指導の実践例 ― A市立B小学校の取り組みから学ぶ',
    slug: 'tsukyu-practice-example',
    excerpt: 'A市立B小学校では、通級指導教室と通常学級の連携を強化し、児童の学びの連続性を確保する取り組みを行っています。',
    publishedAt: '2024-03-05',
    category: '実践・事例',
  },
];

function generateRss(): string {
  const items = articles
    .map(
      (article) => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${SITE_URL}/article/${article.slug}/</link>
      <guid>${SITE_URL}/article/${article.slug}/</guid>
      <description><![CDATA[${article.excerpt}]]></description>
      <category>${article.category}</category>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

// メイン処理
const rss = generateRss();
const outputPath = join(process.cwd(), 'public', 'feed.xml');
writeFileSync(outputPath, rss, 'utf-8');
console.log(`RSS feed generated: ${outputPath}`);
