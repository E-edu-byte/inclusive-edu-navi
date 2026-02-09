'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { trackError } from '@/hooks/useTracking';

export default function NotFound() {
  useEffect(() => {
    // 404エラーをトラッキング
    trackError(window.location.pathname, '404');
  }, []);

  return (
    <div className="container-main py-16 sm:py-24">
      <div className="max-w-xl mx-auto text-center">
        {/* やさしいイラスト風のアイコン */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-primary-50 rounded-full mb-4">
            <svg className="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-6xl sm:text-7xl font-bold text-primary-200">404</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
          お探しのページは見つかりませんでした
        </h1>

        <p className="text-gray-600 mb-3 leading-relaxed">
          申し訳ございません。お探しのページは存在しないか、<br className="hidden sm:inline" />
          別の場所に移動した可能性があります。
        </p>

        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          URLをお確かめいただくか、下のボタンからトップページへお戻りください。<br />
          一緒に、探している情報を見つけましょう。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            トップページへ戻る
          </Link>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 px-6 py-3 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            ニュース一覧を見る
          </Link>
        </div>

        {/* 励ましのメッセージ */}
        <div className="mt-12 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <p className="text-amber-800 text-sm leading-relaxed">
            すべての子どもたちの「学び」を支えるための情報を、<br className="hidden sm:inline" />
            これからも発信し続けてまいります。
          </p>
        </div>
      </div>
    </div>
  );
}
