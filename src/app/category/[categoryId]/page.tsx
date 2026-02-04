import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import Sidebar from '@/components/Sidebar';
import { categories, getArticlesByCategory, getCategoryById } from '@/data/articles';
import Link from 'next/link';

type Props = {
  params: { categoryId: string };
};

export function generateStaticParams() {
  return categories.map((category) => ({
    categoryId: category.id,
  }));
}

export function generateMetadata({ params }: Props): Metadata {
  const category = getCategoryById(params.categoryId);

  if (!category) {
    return {
      title: 'カテゴリが見つかりません',
    };
  }

  return {
    title: `${category.name}の記事一覧`,
    description: category.description,
    openGraph: {
      title: `${category.name}の記事一覧 | インクルーシブ教育ナビ`,
      description: category.description,
    },
  };
}

export default function CategoryPage({ params }: Props) {
  const category = getCategoryById(params.categoryId);

  if (!category) {
    notFound();
  }

  const articles = getArticlesByCategory(params.categoryId);

  return (
    <div className="container-main py-8">
      {/* パンくずリスト */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-primary-600">ホーム</Link>
          </li>
          <li>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li className="text-gray-900 font-medium">{category.name}</li>
        </ol>
      </nav>

      {/* カテゴリヘッダー */}
      <section className="mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <span className={`category-badge ${category.color} mb-4`}>
            {category.name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {category.name}の記事一覧
          </h1>
          <p className="text-gray-600 leading-relaxed">
            {category.description}
          </p>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* メインコンテンツ */}
        <div className="flex-1">
          {articles.length > 0 ? (
            <div className="space-y-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">このカテゴリにはまだ記事がありません。</p>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
