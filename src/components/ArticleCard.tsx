import Link from 'next/link';
import { Article, getCategoryById } from '@/data/articles';

type Props = {
  article: Article;
  featured?: boolean;
};

export default function ArticleCard({ article, featured = false }: Props) {
  const category = getCategoryById(article.categoryId);

  if (featured) {
    return (
      <article className="card group">
        <Link href={`/article/${article.slug}`} className="block">
          <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-16 h-16 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="p-6">
            {category && (
              <span className={`category-badge ${category.color} mb-3`}>
                {category.name}
              </span>
            )}
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-3 line-clamp-2">
              {article.title}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
              {article.excerpt}
            </p>
            <time className="text-sm text-gray-500" dateTime={article.publishedAt}>
              {formatDate(article.publishedAt)}
            </time>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="card group">
      <Link href={`/article/${article.slug}`} className="flex flex-col sm:flex-row">
        <div className="sm:w-48 sm:flex-shrink-0 aspect-video sm:aspect-square bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>
        <div className="p-4 sm:p-5 flex-1">
          {category && (
            <span className={`category-badge ${category.color} mb-2 text-xs`}>
              {category.name}
            </span>
          )}
          <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2 line-clamp-2">
            {article.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-2">
            {article.excerpt}
          </p>
          <time className="text-xs text-gray-500" dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
        </div>
      </Link>
    </article>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
