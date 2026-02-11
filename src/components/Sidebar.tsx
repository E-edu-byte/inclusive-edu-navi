'use client';

import Link from 'next/link';
import { categories } from '@/lib/types';
import SupportCard from './SupportCard';
import RankingBlock from './RankingBlock';
import FeaturedBooksBlock from './FeaturedBooksBlock';

export default function Sidebar() {

  return (
    <aside className="space-y-6">
      {/* 1位：カテゴリ一覧 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          カテゴリ
        </h2>
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/category/${category.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm text-gray-700 group-hover:text-primary-600 font-medium">
                  {category.name}
                </span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
        {/* すべてのニュースをみる */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href="/news"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
          >
            すべてのニュースをみる
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 2位：活動を応援する */}
      <SupportCard />

      {/* 3位：人気記事ランキング（PC専用 - スマホはメインコンテンツ内に表示） */}
      <div className="hidden lg:block">
        <RankingBlock />
      </div>

      {/* 注目の関連書籍（自動生成） */}
      <FeaturedBooksBlock />

      {/* サイトについて */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          サイトについて
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          インクルーシブ教育ナビは、すべての子どもの学びを支える情報を発信するメディアです。
        </p>
        <div className="space-y-2">
          <Link
            href="/about"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            運営方針・広告について
          </Link>
          <Link
            href="/privacy"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </aside>
  );
}
