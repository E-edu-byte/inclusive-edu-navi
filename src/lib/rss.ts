import { Feed } from 'feed';
import { articles, categories, getCategoryById } from '@/data/articles';

const SITE_URL = 'https://example.github.io/inclusive-edu-navi';
const SITE_TITLE = 'インクルーシブ教育ナビ';
const SITE_DESCRIPTION = 'すべての子どもの学びを支える最新情報。インクルーシブ教育に関するニュース、研究、実践事例をお届けします。';

export function generateRssFeed(): string {
  const feed = new Feed({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    id: SITE_URL,
    link: SITE_URL,
    language: 'ja',
    image: `${SITE_URL}/og-image.png`,
    favicon: `${SITE_URL}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${SITE_TITLE}`,
    updated: new Date(),
    feedLinks: {
      rss2: `${SITE_URL}/feed.xml`,
    },
    author: {
      name: 'インクルーシブ教育ナビ編集部',
      link: SITE_URL,
    },
  });

  // カテゴリを追加
  categories.forEach((category) => {
    feed.addCategory(category.name);
  });

  // 記事を日付順にソートして追加
  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  sortedArticles.forEach((article) => {
    const category = getCategoryById(article.categoryId);

    feed.addItem({
      title: article.title,
      id: `${SITE_URL}/article/${article.slug}`,
      link: `${SITE_URL}/article/${article.slug}`,
      description: article.excerpt,
      content: article.content,
      author: [
        {
          name: 'インクルーシブ教育ナビ編集部',
        },
      ],
      date: new Date(article.publishedAt),
      category: category
        ? [{ name: category.name }]
        : [],
    });
  });

  return feed.rss2();
}
