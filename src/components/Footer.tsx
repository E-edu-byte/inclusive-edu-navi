import Link from 'next/link';
import { categories, BASE_PATH } from '@/lib/types';
import SupportCard from './SupportCard';
import SystemStatus from './SystemStatus';

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
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              インクルーシブ教育に関する最新のニュース、研究、実践事例をお届けします。
              すべての子どもたちの学びを支えるための情報プラットフォームです。
            </p>
            {/* 公式機関バナー（縦並び） */}
            <div className="flex flex-col gap-3">
              <a
                href="https://www.mext.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="block h-12 w-44 rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                title="文部科学省"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE_PATH}/images/banners/mext.jpg`}
                  alt="文部科学省"
                  className="w-full h-full object-contain"
                />
              </a>
              <a
                href="https://www.nise.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="block h-12 w-44 rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                title="国立特別支援教育総合研究所"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE_PATH}/images/banners/nise.png`}
                  alt="国立特別支援教育総合研究所"
                  className="w-full h-full object-contain"
                />
              </a>
            </div>
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

        {/* 活動を応援する */}
        <div className="mt-8 max-w-sm mx-auto md:mx-0">
          <SupportCard />
        </div>

        {/* システムステータス */}
        <SystemStatus />

        {/* コピーライト */}
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} インクルーシブ教育ナビ All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Amazonのアソシエイトとして、当メディアは適格販売により収入を得ています。
          </p>
        </div>
      </div>
    </footer>
  );
}
