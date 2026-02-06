'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 寄付ページのURL（仮）- 実際のURLに置き換えてください
const DONATION_URL = 'https://www.buymeacoffee.com/inclusive-edu';
const STORAGE_KEY = 'support_card_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7日間

export default function SupportCard() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // localStorage から非表示設定を確認
    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();
        // 7日以上経過していれば再表示
        if (now - dismissedTime > DISMISS_DURATION) {
          localStorage.removeItem(STORAGE_KEY);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } else {
        setIsVisible(true);
      }
    } catch {
      // localStorage が使えない場合は表示
      setIsVisible(true);
    }
  }, []);

  const handleDonationClick = () => {
    // 寄付リンクをクリックしたら7日間非表示
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage が使えなくても続行
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage が使えなくても続行
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-[#f8fafc] rounded-lg border border-slate-200 p-5 relative">
      {/* 閉じるボタン */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="閉じる"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* アイコンとタイトル */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" role="img" aria-label="コーヒー">☕️</span>
        <h3 className="text-base font-bold text-slate-800">
          活動を応援する
        </h3>
      </div>

      {/* メッセージ */}
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        広告を排除し、誠実な情報提供を続けるために。
        活動を応援してくださるサポーターを募集しています。
      </p>

      {/* リンク */}
      <div className="space-y-2">
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDonationClick}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>☕️</span>
          コーヒー1杯分から応援
        </a>
        <Link
          href="/about#support"
          className="flex items-center justify-center gap-1 w-full py-2 text-slate-500 hover:text-slate-700 text-xs transition-colors"
        >
          詳しく見る
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
