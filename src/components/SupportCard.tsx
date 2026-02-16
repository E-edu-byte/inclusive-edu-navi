'use client';

import { trackClick } from '@/hooks/useTracking';

// 寄付ページのURL
const DONATION_URL = 'https://ofuse.me/newsnavi';

export default function SupportCard() {
  const handleClick = () => {
    trackClick('buymeacoffee');
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-5">
      {/* アイコンとタイトル */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" role="img" aria-label="コーヒー">☕️</span>
        <h3 className="text-sm font-bold text-slate-700">
          応援・コメントする
        </h3>
      </div>

      {/* メッセージ */}
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        広告なしのサイト運営を続けるために、無理のない範囲の応援をお願いします。
      </p>

      {/* リンク */}
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex items-center justify-center gap-2 w-full py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        100円からサポート・コメントする
      </a>
    </div>
  );
}
