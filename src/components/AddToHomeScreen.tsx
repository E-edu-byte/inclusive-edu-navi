'use client';

import { useState, useEffect } from 'react';

// beforeinstallpromptイベントの型定義
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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

    // iOS判定
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOSPrompt(true);
    }

    // Android/Chrome用のインストールプロンプト
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', new Date().toDateString());
    setDismissed(true);
  };

  // 表示条件: スマホ、まだ閉じていない、PWAでない、インストール可能またはiOS
  if (isStandalone || dismissed || (!deferredPrompt && !showIOSPrompt)) {
    return null;
  }

  return (
    <div className="lg:hidden mb-4">
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">📱</span>
          <p className="text-sm text-sky-800 truncate">
            ホーム画面に追加してアプリのように使えます
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              追加
            </button>
          ) : showIOSPrompt ? (
            <button
              onClick={() => alert('Safariのメニュー「共有」→「ホーム画面に追加」をタップしてください')}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              方法
            </button>
          ) : null}
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
  );
}
