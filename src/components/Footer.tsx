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
            <p className="text-sm text-gray-600 leading-relaxed">
              インクルーシブ教育に関する最新のニュース、研究、実践事例をお届けします。
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

        {/* 公式・専門機関リンク */}
        <div className="mt-10 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-2">公式・専門機関リンク</h3>
          <p className="text-sm text-gray-500 mb-5">
            信頼性の高い公的機関・専門団体の最新情報に基づいています
          </p>
          <div className="flex flex-wrap gap-3">
            {/* 文部科学省 */}
            <a
              href="https://www.mext.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="block h-16 w-36 sm:w-40 rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              title="文部科学省"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE_PATH}/images/banners/mext.jpg`}
                alt="文部科学省"
                className="w-full h-full object-contain"
              />
            </a>
            {/* NISE */}
            <a
              href="https://www.nise.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="block h-16 w-36 sm:w-40 rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              title="国立特別支援教育総合研究所"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE_PATH}/images/banners/nise.png`}
                alt="国立特別支援教育総合研究所"
                className="w-full h-full object-contain"
              />
            </a>
            {/* S.E.N.S */}
            <a
              href="http://www.sens.or.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-16 w-36 sm:w-40 rounded-lg bg-white border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: '#2f855a' }}
              title="特別支援教育士資格認定協会"
            >
              <span className="text-xs sm:text-sm font-bold text-center px-2 leading-tight" style={{ color: '#2f855a' }}>
                特別支援教育士<br />資格認定協会
              </span>
            </a>
            {/* 臨床発達心理士認定運営機構 */}
            <a
              href="http://www.jcbcp.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-16 w-36 sm:w-40 rounded-lg bg-white border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: '#718096' }}
              title="臨床発達心理士認定運営機構"
            >
              <span className="text-xs sm:text-sm font-bold text-center px-2 leading-tight" style={{ color: '#718096' }}>
                臨床発達心理士<br />認定運営機構
              </span>
            </a>
            {/* 日本公認心理師協会 */}
            <a
              href="https://www.jacpp.or.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-16 w-36 sm:w-40 rounded-lg bg-white border-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              style={{ borderColor: '#805ad5' }}
              title="日本公認心理師協会"
            >
              <span className="text-xs sm:text-sm font-bold text-center px-2 leading-tight" style={{ color: '#805ad5' }}>
                日本公認心理師協会
              </span>
            </a>
          </div>
        </div>

        {/* システムステータス */}
        <SystemStatus />

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
