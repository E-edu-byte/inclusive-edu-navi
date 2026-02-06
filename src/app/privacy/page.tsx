import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: 'インクルーシブ教育ナビのプライバシーポリシー',
};

export default function PrivacyPage() {
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
            <li className="text-gray-900 font-medium">プライバシーポリシー</li>
          </ol>
        </nav>

        <article className="prose prose-lg prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>

          <p className="text-gray-600 text-sm mb-8">最終更新日: 2026年2月1日</p>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. 個人情報の取り扱いについて</h2>
            <p className="text-gray-700 leading-relaxed">
              「インクルーシブ教育ナビ」（以下、「当サイト」）は、ユーザーの個人情報の重要性を認識し、
              適切な管理・保護に努めます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. 収集する情報</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当サイトでは、以下の情報を収集する場合があります：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>アクセスログ（IPアドレス、ブラウザ情報、閲覧ページ等）</li>
              <li>Cookie情報</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. 情報の利用目的</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              収集した情報は、以下の目的で利用します：
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>サイトの運営・改善</li>
              <li>アクセス解析</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. アクセス解析ツール</h2>
            <p className="text-gray-700 leading-relaxed">
              当サイトでは、Googleアナリティクスを使用してアクセス解析を行う場合があります。
              Googleアナリティクスはトラフィックデータ収集のためにCookieを使用しています。
              詳細はGoogleのプライバシーポリシーをご確認ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. 第三者への提供</h2>
            <p className="text-gray-700 leading-relaxed">
              当サイトは、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. ポリシーの変更</h2>
            <p className="text-gray-700 leading-relaxed">
              当サイトは、必要に応じて本ポリシーを変更することがあります。
              変更後のポリシーは、当サイトに掲載した時点で効力を生じるものとします。
            </p>
          </section>

        </article>
      </div>
    </div>
  );
}
