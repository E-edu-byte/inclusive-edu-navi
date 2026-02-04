import ArticleCard from '@/components/ArticleCard';
import Sidebar from '@/components/Sidebar';
import { articles } from '@/data/articles';

export default function Home() {
  const latestArticles = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const featuredArticle = latestArticles[0];
  const otherArticles = latestArticles.slice(1);

  return (
    <div className="container-main py-8">
      {/* ヒーローセクション */}
      <section className="mb-12">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 sm:p-12 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            すべての子どもの学びを支える
          </h1>
          <p className="text-primary-100 text-base sm:text-lg leading-relaxed max-w-2xl">
            特別支援教育に関する最新のニュース、研究成果、実践事例を
            わかりやすくお届けします。教育現場で役立つ情報を厳選してご紹介。
          </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* メインコンテンツ */}
        <div className="flex-1">
          {/* 最新記事 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              最新記事
            </h2>

            {/* 注目記事（大きく表示） */}
            {featuredArticle && (
              <div className="mb-6">
                <ArticleCard article={featuredArticle} featured />
              </div>
            )}

            {/* その他の記事 */}
            <div className="space-y-4">
              {otherArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* 記事が少ない場合のメッセージ */}
            {articles.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>まだ記事がありません。</p>
              </div>
            )}
          </section>
        </div>

        {/* サイドバー */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
