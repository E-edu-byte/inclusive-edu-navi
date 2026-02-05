import Link from 'next/link';
import { categories, BASE_PATH } from '@/lib/types';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="container-main py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* サイト情報 */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              インクルーシブ教育ナビ
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              特別支援教育に関する最新のニュース、研究、実践事例をお届けします。
              すべての子どもたちの学びを支えるための情報プラットフォームです。
            </p>
          </div>

          {/* カテゴリ */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">カテゴリ</h3>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/category/${category.id}`}
                    className="text-sm text-gray-600 hover:text-primary-600"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* リンク */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-primary-600">
                  このサイトについて
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-primary-600">
                  お問い合わせ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 hover:text-primary-600">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <a
                  href={`${BASE_PATH}/feed.xml`}
                  className="text-sm text-gray-600 hover:text-primary-600"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  RSSフィード
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* コピーライト */}
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} インクルーシブ教育ナビ All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
