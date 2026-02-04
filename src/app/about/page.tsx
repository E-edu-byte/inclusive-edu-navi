import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'このサイトについて',
  description: 'インクルーシブ教育ナビについて - 特別支援教育の最新情報をお届けするニュースサイト',
};

export default function AboutPage() {
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
            <li className="text-gray-900 font-medium">このサイトについて</li>
          </ol>
        </nav>

        <article className="prose prose-lg prose-gray max-w-none">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">このサイトについて</h1>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">サイトの目的</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              「インクルーシブ教育ナビ」は、特別支援教育に関わるすべての方々に向けて、
              最新のニュース、研究成果、実践事例をわかりやすくお届けすることを目的としたニュースサイトです。
            </p>
            <p className="text-gray-700 leading-relaxed">
              教員、保護者、研究者、行政関係者など、特別支援教育に関心を持つ皆様にとって
              有益な情報源となることを目指しています。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">取り扱う情報</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>制度・法改正</strong> - 特別支援教育に関する法律、制度、ガイドラインの最新情報</li>
              <li><strong>研究・学術</strong> - 発達障害、学習支援に関する最新の研究成果</li>
              <li><strong>実践・事例</strong> - 学校現場での実践例、成功事例の紹介</li>
              <li><strong>教材・ツール</strong> - 特別支援教育に役立つ教材、ICTツールの紹介</li>
              <li><strong>イベント・研修</strong> - セミナー、研修会、学会情報</li>
              <li><strong>注目トピックス</strong> - 今注目の話題、トレンド情報</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">情報の収集について</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              本サイトでは、文部科学省、国立特別支援教育総合研究所、各種学会、
              教育委員会などの公開情報を収集・整理してお届けしています。
            </p>
            <p className="text-gray-700 leading-relaxed">
              各記事には出典を明記しておりますので、詳細は原典をご確認ください。
            </p>
          </section>

          <section className="bg-primary-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-primary-900 mb-4">お問い合わせ</h2>
            <p className="text-primary-800 leading-relaxed mb-4">
              サイトに関するご意見、ご要望、情報提供などがございましたら、
              お問い合わせページよりご連絡ください。
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium"
            >
              お問い合わせはこちら
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </section>
        </article>
      </div>
    </div>
  );
}
