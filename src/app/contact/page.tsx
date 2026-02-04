import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'インクルーシブ教育ナビへのお問い合わせ',
};

export default function ContactPage() {
  return (
    <div className="container-main py-8">
      <div className="max-w-3xl mx-auto">
        {/* パンくずリスト */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-primary-600">ホーム</Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-gray-900 font-medium">お問い合わせ</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">お問い合わせ</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-gray-700 leading-relaxed mb-6">
            「インクルーシブ教育ナビ」に関するご意見、ご要望、情報提供などがございましたら、
            以下の方法でお問い合わせください。
          </p>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              メールでのお問い合わせ
            </h2>
            <p className="text-gray-600 mb-2">
              以下のメールアドレスまでお送りください。
            </p>
            <p className="text-primary-600 font-medium">
              contact@example.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              お問い合わせの種類
            </h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>サイトの内容に関するご質問</li>
              <li>記事の誤りや訂正のご指摘</li>
              <li>取り上げてほしい話題のご提案</li>
              <li>情報提供・プレスリリース</li>
              <li>その他のお問い合わせ</li>
            </ul>
          </section>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-yellow-800 mb-2">ご注意</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>・ お返事までにお時間をいただく場合がございます。</li>
              <li>・ すべてのお問い合わせにお返事できない場合がございます。</li>
              <li>・ 個別の相談対応は行っておりません。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
