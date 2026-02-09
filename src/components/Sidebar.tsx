'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { categories, BASE_PATH, Article, isPublishableSummary } from '@/lib/types';
import { generateAmazonSearchUrl, generateRakutenSearchUrl } from '@/data/articles';
import SupportCard from './SupportCard';
import RankingBlock from './RankingBlock';

// 書籍検索用のキーワード情報
type BookKeyword = {
  keyword: string;
  label: string;
  amazonUrl: string;
  rakutenUrl: string;
};

export default function Sidebar() {
  const [bookKeywords, setBookKeywords] = useState<BookKeyword[]>([]);

  useEffect(() => {
    // 記事データを取得してキーワードを抽出
    fetch(`${BASE_PATH}/data/articles.json`)
      .then(res => res.json())
      .then(data => {
        // 【公開フィルタ】AI要約が完了した記事のみをキーワード抽出対象にする
        const articles: Article[] = (data.articles || []).filter(
          (article: Article) => isPublishableSummary(article.summary)
        );

        // キーワードを抽出（重複を除去）
        const keywordSet = new Set<string>();
        const keywords: BookKeyword[] = [];

        // 最新5件の記事からキーワードを抽出
        for (const article of articles.slice(0, 5)) {
          // mainKeywordがあれば使用
          if (article.mainKeyword && article.mainKeyword.trim() && !keywordSet.has(article.mainKeyword)) {
            keywordSet.add(article.mainKeyword);
            keywords.push({
              keyword: article.mainKeyword,
              label: article.mainKeyword,
              amazonUrl: generateAmazonSearchUrl(article.mainKeyword, article.title),
              rakutenUrl: generateRakutenSearchUrl(article.mainKeyword, article.title),
            });
          }
        }

        // キーワードが少ない場合はカテゴリから補完
        const categoryKeywords: Record<string, string> = {
          '制度・行政': 'インクルーシブ教育',
          '合理的配慮・支援': '合理的配慮',
          '不登校・多様な学び': '不登校支援',
          'ICT・教材': 'EdTech',
          'イベント・研修': '特別支援教育',
        };

        if (keywords.length < 3) {
          for (const article of articles.slice(0, 5)) {
            const catKeyword = categoryKeywords[article.category];
            if (catKeyword && !keywordSet.has(catKeyword) && keywords.length < 4) {
              keywordSet.add(catKeyword);
              keywords.push({
                keyword: catKeyword,
                label: catKeyword,
                amazonUrl: generateAmazonSearchUrl(catKeyword, ''),
                rakutenUrl: generateRakutenSearchUrl(catKeyword, ''),
              });
            }
          }
        }

        // 最大4件まで表示
        setBookKeywords(keywords.slice(0, 4));
      })
      .catch(() => {
        // フォールバック: デフォルトのキーワード
        setBookKeywords([
          {
            keyword: 'インクルーシブ教育',
            label: 'インクルーシブ教育',
            amazonUrl: generateAmazonSearchUrl('インクルーシブ教育', ''),
            rakutenUrl: generateRakutenSearchUrl('インクルーシブ教育', ''),
          },
          {
            keyword: '特別支援教育',
            label: '特別支援教育',
            amazonUrl: generateAmazonSearchUrl('特別支援教育', ''),
            rakutenUrl: generateRakutenSearchUrl('特別支援教育', ''),
          },
        ]);
      });
  }, []);

  return (
    <aside className="space-y-6">
      {/* 1位：カテゴリ一覧 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          カテゴリ
        </h2>
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/category/${category.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm text-gray-700 group-hover:text-primary-600 font-medium">
                  {category.name}
                </span>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* 2位：活動を応援する */}
      <SupportCard />

      {/* 3位：人気記事ランキング（PC専用 - スマホはメインコンテンツ内に表示） */}
      <div className="hidden lg:block">
        <RankingBlock />
      </div>

      {/* 注目の関連書籍（自動生成） */}
      {bookKeywords.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100 p-5">
          <h2 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            注目の関連書籍
          </h2>
          <p className="text-xs text-amber-700 mb-4 leading-relaxed">
            最新ニュースに関連する書籍をAmazonで探せます
          </p>

          <div className="space-y-3">
            {bookKeywords.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-white/70 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    「{item.label}」の本
                  </span>
                </div>
                <div className="flex items-center gap-3 pl-8 text-xs">
                  <a
                    href={item.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-amber-700 transition-colors"
                  >
                    → Amazon
                  </a>
                  <a
                    href={item.rakutenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-red-600 transition-colors"
                  >
                    → 楽天ブックス
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* 書籍検索リンク（全体） */}
          <div className="mt-4 pt-4 border-t border-amber-200">
            <div className="flex gap-2">
              <a
                href="https://www.amazon.co.jp/s?k=インクルーシブ教育+本&i=stripbooks&tag=newsnavi02a-22"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Amazon
              </a>
              <a
                href="https://books.rakuten.co.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-400 text-white text-xs font-medium rounded-lg cursor-not-allowed"
                title="準備中"
              >
                楽天（準備中）
              </a>
            </div>
            <p className="mt-2 text-xs text-amber-600 text-center">
              ※ 書籍購入でサイト運営を支援できます
            </p>
          </div>
        </div>
      )}

      {/* お知らせ */}
      <div className="bg-primary-50 rounded-lg border border-primary-100 p-5">
        <h2 className="text-lg font-bold text-primary-900 mb-3">
          お知らせ
        </h2>
        <p className="text-sm text-primary-800 leading-relaxed">
          このサイトはインクルーシブ教育に関する情報を自動的に収集・整理してお届けしています。
          最新情報はRSSフィードでも購読できます。
        </p>
        <a
          href={`${BASE_PATH}/feed.xml`}
          className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.18 15.64a2.18 2.18 0 01 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z" />
          </svg>
          RSSで購読する
        </a>
      </div>

      {/* サイトについて */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          サイトについて
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          インクルーシブ教育ナビは、すべての子どもの学びを支える情報を発信するメディアです。
        </p>
        <div className="space-y-2">
          <Link
            href="/about"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            運営方針・広告について
          </Link>
          <Link
            href="/privacy"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </aside>
  );
}
