import Link from 'next/link';

// 寄付ページのURL（仮）- 実際のURLに置き換えてください
const DONATION_URL = 'https://www.buymeacoffee.com/inclusive-edu';

export default function SupportCard() {
  return (
    <div className="bg-slate-50/80 rounded-lg border border-slate-200/60 px-4 py-3">
      {/* ヘッダー: アイコン・タイトル・リンクを1行に */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base" role="img" aria-label="コーヒー">☕️</span>
          <h3 className="text-xs font-semibold text-slate-600">
            活動を応援する
          </h3>
        </div>
        <Link
          href="/about#support"
          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          詳細
        </Link>
      </div>

      {/* メッセージ（短縮版） */}
      <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
        広告を排除し、誠実な情報発信を続けています。
      </p>

      {/* コンパクトなボタン */}
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-[11px] font-medium rounded-md transition-colors"
      >
        <span className="text-xs">☕️</span>
        コーヒー1杯分から応援
      </a>
    </div>
  );
}
