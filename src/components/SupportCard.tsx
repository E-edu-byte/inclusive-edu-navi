import Link from 'next/link';

// 寄付ページのURL（仮）- 実際のURLに置き換えてください
const DONATION_URL = 'https://www.buymeacoffee.com/inclusive-edu';

export default function SupportCard() {
  return (
    <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-5">
      {/* アイコンとタイトル */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" role="img" aria-label="コーヒー">☕️</span>
        <h3 className="text-sm font-bold text-slate-700">
          活動を応援する
        </h3>
      </div>

      {/* メッセージ */}
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        広告のない、誠実な情報提供を続けるために。
        サポーターを募集しています。
      </p>

      {/* リンク */}
      <div className="space-y-2">
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <span>☕️</span>
          コーヒー1杯分から
        </a>
        <Link
          href="/about#support"
          className="flex items-center justify-center gap-1 w-full py-1.5 text-slate-400 hover:text-slate-600 text-xs transition-colors"
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
