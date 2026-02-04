import Link from 'next/link';
import { categories } from '@/data/articles';

export default function Sidebar() {
  return (
    <aside className="space-y-8">
      {/* カテゴリ一覧 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          カテゴリ
        </h2>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/category/${category.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-gray-700 group-hover:text-primary-600 font-medium">
                  {category.name}
                </span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* お知らせ */}
      <div className="bg-primary-50 rounded-lg border border-primary-100 p-6">
        <h2 className="text-lg font-bold text-primary-900 mb-3">
          お知らせ
        </h2>
        <p className="text-sm text-primary-800 leading-relaxed">
          このサイトは特別支援教育に関する情報を自動的に収集・整理してお届けしています。
          最新情報はRSSフィードでも購読できます。
        </p>
        <a
          href="/feed.xml"
          className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.18 15.64a2.18 2.18 0 01 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z" />
          </svg>
          RSSで購読する
        </a>
      </div>
    </aside>
  );
}
