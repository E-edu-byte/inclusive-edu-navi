import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'このサイトについて・運営ポリシー',
  description: 'インクルーシブ教育ナビの運営方針と広告ポリシーについて',
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

        <article className="space-y-10">
          <h1 className="text-3xl font-bold text-gray-900">このサイトについて</h1>

          {/* サイトの目的 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-sky-500 rounded-full"></span>
              サイトの目的
            </h2>
            <p className="text-gray-700 leading-relaxed">
              「インクルーシブ教育ナビ」は、特別支援教育に関わるすべての方々に向けて、
              最新のニュース、研究成果、実践事例をわかりやすくお届けすることを目的としたニュースサイトです。
            </p>
            <p className="text-gray-700 leading-relaxed">
              教員、保護者、研究者、行政関係者など、特別支援教育に関心を持つ皆様にとって
              有益な情報源となることを目指しています。
            </p>
          </section>

          {/* 運営ポリシー */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
              運営ポリシー
            </h2>

            <div className="bg-gradient-to-br from-slate-50 to-sky-50 rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                信頼性の高い情報のみをお届けします
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                本サイトでは、文部科学省、国立特別支援教育総合研究所、各種学会、教育委員会などの
                公的機関や信頼性の高いメディアからの情報を厳選して掲載しています。
                不確かな情報や誇大な表現は避け、正確で実践的な情報提供を心がけています。
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                広告は最小限に抑えます
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                読者の皆様が快適に情報収集できるよう、広告の掲載は最小限に抑えています。
                サイトの運営維持に必要な範囲でのみ広告を掲載し、
                コンテンツの閲覧を妨げるような過度な広告は一切掲載しません。
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-purple-50 rounded-xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                読者への約束
              </h3>
              <ul className="text-slate-600 text-sm leading-relaxed space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>マンガ広告や不快な広告は一切掲載しません</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>教育現場にふさわしくない広告は排除します</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>おすすめ書籍・教材は編集部が厳選したものだけを紹介します</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>ポップアップ広告や自動再生動画広告は使用しません</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 取り扱う情報 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
              取り扱う情報
            </h2>
            <ul className="grid gap-3">
              {[
                { label: '合理的配慮・支援', desc: '学校現場での具体的な支援方法、個別の配慮事例' },
                { label: '不登校・多様な学び', desc: 'フリースクール、通信制高校、オルタナティブ教育' },
                { label: '制度・行政', desc: '文科省の通知、法律、自治体の施策、ガイドライン' },
                { label: 'ICT・教材', desc: '支援技術、デジタル教科書、学習アプリ、EdTech' },
                { label: 'イベント・研修', desc: 'セミナー、ワークショップ、講演会、研修会情報' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></span>
                  <div>
                    <span className="font-medium text-gray-900">{item.label}</span>
                    <span className="text-gray-500 text-sm ml-2">- {item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* アフィリエイトについて */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
              アフィリエイトリンクについて
            </h2>
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
              <p className="text-amber-900 text-sm leading-relaxed">
                本サイトでは、記事内容に関連する書籍や教材を紹介する際に、
                Amazonアソシエイトプログラム等のアフィリエイトリンクを使用する場合があります。
                これらのリンクを通じて商品を購入された場合、当サイトに紹介料が支払われますが、
                読者の皆様に追加の費用が発生することはありません。
              </p>
              <p className="text-amber-800 text-sm leading-relaxed mt-3">
                紹介する商品は、編集部が実際に内容を確認し、
                特別支援教育に携わる方々にとって有益と判断したものに限定しています。
              </p>
            </div>
          </section>

          {/* お問い合わせ */}
          <section className="bg-sky-50 rounded-xl p-6 border border-sky-100">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              お問い合わせ
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              サイトに関するご意見、ご要望、情報提供などがございましたら、
              お問い合わせページよりご連絡ください。
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
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
