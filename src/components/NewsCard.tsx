'use client';

type NewsCardProps = {
  title: string;
  summary: string;
  imageUrl?: string;
  category: string;
  source?: string;
  date: string;
  url: string;
  // 編集部ピックアップ用
  isPickup?: boolean;
  pickupReason?: string;
};

export default function NewsCard({
  title,
  summary,
  imageUrl,
  category,
  source,
  date,
  url,
  isPickup = false,
  pickupReason,
}: NewsCardProps) {
  // カードの背景色
  const cardBgClass = isPickup
    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
    : 'bg-white border-gray-200';

  // ボタンの色
  const buttonClass = isPickup
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-primary-600 hover:bg-primary-700';

  // カテゴリバッジの色
  const categoryClass = isPickup
    ? 'bg-amber-100 text-amber-800'
    : 'bg-primary-100 text-primary-800';

  return (
    <article className={`rounded-xl border shadow-sm hover:shadow-md transition-shadow ${cardBgClass}`}>
      {/* モバイル: 縦並び / PC: 横並び */}
      <div className="flex flex-col sm:flex-row">
        {/* サムネイル画像エリア */}
        <div className="sm:flex-shrink-0 sm:w-24 md:w-28">
          <div className="h-40 sm:h-full sm:min-h-[140px] bg-gray-100 overflow-hidden rounded-t-xl sm:rounded-t-none sm:rounded-l-xl">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* テキストコンテンツエリア */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col min-w-0">
          {/* ピックアップ理由（編集部ピックアップの場合） */}
          {isPickup && pickupReason && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {pickupReason}
              </span>
            </div>
          )}

          {/* カテゴリとメタ情報 */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${categoryClass}`}>
              {category}
            </span>
            <span className="text-xs text-gray-500">
              {source && `${source} • `}{date}
            </span>
          </div>

          {/* タイトル */}
          <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">
            {title}
          </h3>

          {/* 要約 */}
          <p className="text-sm text-gray-600 leading-relaxed mb-3 flex-grow">
            {summary}
          </p>

          {/* 元記事を読むボタン */}
          <div className="mt-auto pt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors ${buttonClass}`}
            >
              元記事を読む
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
