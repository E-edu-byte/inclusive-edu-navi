import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import CategoryArticleList from '@/components/CategoryArticleList';
import { categories, getCategoryById } from '@/lib/types';

type Props = {
  params: { categoryId: string };
};

// 静的パラメータを生成（output: export に必要）
export function generateStaticParams() {
  return categories.map((category) => ({
    categoryId: category.id,
  }));
}

// メタデータを生成
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
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${category.color} mb-4`}>
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
        {/* メインコンテンツ - Client Component */}
        <div className="flex-1">
          <CategoryArticleList category={category} />
        </div>

        {/* サイドバー */}
        <div className="lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
