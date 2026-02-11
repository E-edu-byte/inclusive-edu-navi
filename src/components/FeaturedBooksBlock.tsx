'use client';

import { useState, useEffect } from 'react';
import { BASE_PATH, Article, isPublishableSummary } from '@/lib/types';
import { generateAmazonSearchUrl, generateRakutenSearchUrl } from '@/data/articles';
import { trackClick } from '@/hooks/useTracking';

// 書籍検索用のキーワード情報
type BookKeyword = {
  keyword: string;
  label: string;
  amazonUrl: string;
  rakutenUrl: string;
};

export default function FeaturedBooksBlock() {
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

  if (bookKeywords.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100 p-5">
      <h2 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        注目の関連書籍
      </h2>
      <p className="text-xs text-amber-700 mb-4 leading-relaxed">
        最新ニュースに関連する書籍をAmazon・楽天で探せます。サイト運営支援にもなります。
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
                onClick={() => trackClick('amazon')}
                className="text-gray-500 hover:text-amber-700 transition-colors"
              >
                → Amazon
              </a>
              <a
                href={item.rakutenUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('rakuten')}
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
            href={generateAmazonSearchUrl('インクルーシブ教育', '')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick('amazon')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Amazon
          </a>
          <a
            href={generateRakutenSearchUrl('インクルーシブ教育', '')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick('rakuten')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            楽天
          </a>
        </div>
        <p className="mt-2 text-xs text-amber-600 text-center">
          ※ 書籍購入でサイト運営を支援できます
        </p>
      </div>
    </div>
  );
}
