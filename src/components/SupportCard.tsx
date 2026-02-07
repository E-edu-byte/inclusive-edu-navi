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
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <span>☕️</span>
        コーヒー1杯分から
      </a>
    </div>
  );
}
