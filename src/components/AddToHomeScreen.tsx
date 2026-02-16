'use client';

import { useState, useEffect } from 'react';

export default function AddToHomeScreen() {
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 既にPWAとして起動している場合は表示しない
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // 既に閉じた場合は今日は表示しない
    const dismissedDate = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedDate === new Date().toDateString()) {
      setDismissed(true);
    }

    // モバイル判定
    const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsMobile(mobile);

    // iOS判定
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', new Date().toDateString());
    setDismissed(true);
  };

  // 表示条件: スマホ、まだ閉じていない、PWAでない
  if (isStandalone || dismissed || !isMobile) {
    return null;
  }

  return (
    <div className="lg:hidden mb-4">
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-sky-800 leading-relaxed flex-1">
            ページをホーム画面に追加して、アプリ風に簡単にみられるようにする
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                if (isIOS) {
                  alert('Safariの「共有」ボタン → 「ホーム画面に追加」をタップしてください');
                } else {
                  alert('Chromeのメニュー（︙）→「ホーム画面に追加」をタップしてください');
                }
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              方法
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-sky-400 hover:text-sky-600 transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
