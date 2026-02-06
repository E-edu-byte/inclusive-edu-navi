/**
 * RSS フィード自動生成スクリプト
 * articles.json から feed.xml を生成
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://e-edu-byte.github.io/inclusive-edu-navi';
const SITE_TITLE = 'インクルーシブ教育ナビ';
const SITE_DESCRIPTION = 'すべての子どもの学びを支える最新情報。インクルーシブ教育に関するニュース、研究、実践事例をお届けします。';

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toUTCString();
}

function generateRssFeed() {
  const articlesPath = join(__dirname, '..', 'public', 'data', 'articles.json');

  if (!existsSync(articlesPath)) {
    console.log('articles.json not found, skipping RSS generation');
    return;
  }

  const data = JSON.parse(readFileSync(articlesPath, 'utf-8'));
  const articles = data.articles || [];

  // 日付順にソート（新しい順）
  const sortedArticles = [...articles].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // 最新20件のみ
  const recentArticles = sortedArticles.slice(0, 20);

  const rssItems = recentArticles.map(article => `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${article.url}</link>
      <guid>${article.url}</guid>
      <description><![CDATA[${article.summary || ''}]]></description>
      <category>${escapeXml(article.category)}</category>
      <pubDate>${formatDate(article.date)}</pubDate>
      <source url="${SITE_URL}">${SITE_TITLE}</source>
    </item>`).join('\n\n');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>

${rssItems}

  </channel>
</rss>
`;

  const outputPath = join(__dirname, '..', 'public', 'feed.xml');
  writeFileSync(outputPath, rssFeed, 'utf-8');
  console.log(`RSS feed generated: ${outputPath}`);
  console.log(`Total articles: ${recentArticles.length}`);
}

generateRssFeed();
