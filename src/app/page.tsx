'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import NewsCard from '@/components/NewsCard';
import RankingBlock from '@/components/RankingBlock';
import SupportCard from '@/components/SupportCard';
import FeaturedBooksBlock from '@/components/FeaturedBooksBlock';
import CommentSection from '@/components/CommentSection';
import { Article, ArticlesData, BASE_PATH, filterPublishableArticles, fetchTrashedUrls, filterOutTrashedArticles } from '@/lib/types';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { supabase, EditorMessage } from '@/lib/supabase';
import AddToHomeScreen from '@/components/AddToHomeScreen';

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [latestNews, setLatestNews] = useState<Article[]>([]);
  const [pickupNews, setPickupNews] = useState<Article[]>([]);
  const [editorMessages, setEditorMessages] = useState<EditorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDonorAuth, setIsDonorAuth] = useState(false);
  const { bookmarkCount, maxBookmarks } = useBookmarks();

  // 認証ロジック: ?key=... パラメータを検知してSupabaseと照合
  useEffect(() => {
    // まずlocalStorageから認証状態を復元
    const savedAuth = localStorage.getItem('donor_auth');
    if (savedAuth === 'true') {
      setIsDonorAuth(true);
    }

    // URLパラメータにkeyがあれば検証
    const urlParams = new URLSearchParams(window.location.search);
    const keyParam = urlParams.get('key');
    if (keyParam) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('access_keys')
            .select('key_string')
            .limit(1)
            .single();

          if (data && !error && data.key_string === keyParam) {
            // 認証成功
            localStorage.setItem('donor_auth', 'true');
            setIsDonorAuth(true);
            // URLをクリーンにリダイレクト（履歴を置き換え）
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (e) {
          console.error('認証エラー:', e);
        }
      })();
    }
  }, []);

  // コメントセクションへスムーズスクロール
  const scrollToComments = () => {
    const commentsSection = document.getElementById('comments');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Supabaseから編集長メッセージを取得 & Realtime購読
  useEffect(() => {
    // 初期データ取得
    async function fetchEditorMessages() {
      try {
        const { data, error } = await supabase
          .from('editor_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && !error && data.length > 0) {
          setEditorMessages(data);
          return;
        }
      } catch (e) {
        console.log('Supabase接続エラー、JSONフォールバックを使用');
      }

      // Supabaseが失敗またはデータがない場合、JSONファイルから読み込み
      try {
        const res = await fetch(`${BASE_PATH}/data/editor-message.json`);
        if (res.ok) {
          const jsonData = await res.json();
          if (jsonData.message) {
            setEditorMessages([{
              id: 0,
              message: jsonData.message,
              created_at: jsonData.lastUpdated || new Date().toISOString()
            }]);
          }
        }
      } catch (e) {
        console.log('JSONフォールバックも失敗');
      }
    }
    fetchEditorMessages();

    // Realtime購読
    const channel = supabase
      .channel('editor_messages_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'editor_messages' },
        (payload) => {
          // 新しいメッセージで置き換え（最新1件のみ）
          setEditorMessages([payload.new as EditorMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // 記事データとゴミ箱データを並列取得
        const [articlesRes, trashedUrls] = await Promise.all([
          fetch(`${BASE_PATH}/data/articles.json`),
          fetchTrashedUrls()
        ]);

        if (!articlesRes.ok) throw new Error('記事データの取得に失敗しました');
        const articlesData: ArticlesData = await articlesRes.json();
        const articlesArray = articlesData.articles || [];

        // 【公開フィルタ】AI要約が完了した記事のみを表示対象にする
        const publishableArticles = filterPublishableArticles(articlesArray);

        // 【ゴミ箱フィルタ】ゴミ箱に入っている記事を除外
        const visibleArticles = filterOutTrashedArticles(publishableArticles, trashedUrls);
        setArticles(visibleArticles);

        // 日付でソート（新しい順）
        const sortedAll = [...visibleArticles].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // ========================================
        // 【厳格なロジック】重複なしで確実に分離
        // ========================================

        // 1. 最新ニュース: 先頭から5件を正確に抽出
        const latest = sortedAll.slice(0, 5);
        setLatestNews(latest);

        // 2. 編集部ピックアップ: 6件目から5件（最新ニュースの次の5件）
        const pickup = sortedAll.slice(5, 10);
        setPickupNews(pickup);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-main py-8">
        <div className="text-center py-12 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* メインコンテンツ */}
        <div className="flex-1 min-w-0">
          {/* スマホ用：ホーム画面に追加の案内 */}
          <AddToHomeScreen />

          {/* ヒーローセクション + 編集長のひとりごと */}
          <section className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 左側：メインヒーロー */}
              <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-xl shadow-sm border border-sky-100/50 p-6 sm:p-8 lg:flex-1">
                {/* 装飾: 柔らかい幾何学模様 */}
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 opacity-20">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-sky-300">
                    <circle cx="80" cy="20" r="8" fill="currentColor" opacity="0.6" />
                    <circle cx="60" cy="40" r="5" fill="currentColor" opacity="0.4" />
                    <circle cx="90" cy="50" r="6" fill="currentColor" opacity="0.5" />
                    <circle cx="70" cy="70" r="4" fill="currentColor" opacity="0.3" />
                    <circle cx="50" cy="25" r="3" fill="currentColor" opacity="0.4" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 opacity-15">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-300">
                    <circle cx="20" cy="80" r="7" fill="currentColor" opacity="0.5" />
                    <circle cx="40" cy="60" r="4" fill="currentColor" opacity="0.4" />
                    <circle cx="10" cy="50" r="5" fill="currentColor" opacity="0.3" />
                    <circle cx="35" cy="85" r="3" fill="currentColor" opacity="0.4" />
                  </svg>
                </div>

                {/* コンテンツ */}
                <div className="relative z-10">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 tracking-tight">
                    すべての子どもの学びを支える
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    インクルーシブ教育に関する最新のニュース、研究成果、実践事例をわかりやすくお届けします。
                  </p>
                </div>

                {/* アクセントライン */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-200 via-indigo-200 to-purple-200 opacity-60"></div>
              </div>

              {/* 右側：編集長のひとりごと（PCのみ横並び） */}
              {editorMessages.length > 0 && (
                <div className="lg:w-64 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-100/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">&#128221;</span>
                    <h2 className="text-sm font-bold text-amber-800">編集長のひとりごと</h2>
                  </div>
                  <p className="text-sm text-amber-900/90 leading-relaxed">
                    {editorMessages[0].message}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* スマホ用：保存した記事へのショートカット */}
          <div className="lg:hidden mb-6">
            <Link
              href="/bookmarks"
              className="flex items-center justify-between w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-medium text-amber-800">保存した記事をみる</span>
                  <span className="ml-2 text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                    {bookmarkCount}/{maxBookmarks}
                  </span>
                </div>
              </div>
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* 最新ニュースセクション（常に5件表示） */}
          {latestNews.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                最新ニュース
              </h2>

              <div className="space-y-3">
                {latestNews.map((article, index) => (
                  <div key={article.id}>
                    <NewsCard
                      title={article.title}
                      summary={article.summary}
                      imageUrl={article.imageUrl}
                      category={article.category}
                      source={article.source}
                      date={article.date}
                      url={article.url}
                      id={article.id}
                      mainKeyword={article.mainKeyword}
                      isPickup={false}
                    />
                    {/* スマホ用：3番目の記事の下に「活動を応援する」カード */}
                    {index === 2 && (
                      <div className="lg:hidden mt-4 mb-1">
                        <SupportCard />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* スマホ用：人気記事ランキング（PCではサイドバーに表示） */}
          <div className="lg:hidden my-6">
            <RankingBlock />
          </div>

          {/* 編集部ピックアップセクション（6件目〜10件目を表示） */}
          {pickupNews.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                編集部ピックアップ
              </h2>
              <div className="space-y-3">
                {pickupNews.map((article) => (
                  <NewsCard
                    key={article.id}
                    title={article.title}
                    summary={article.summary}
                    imageUrl={article.imageUrl}
                    category={article.category}
                    source={article.source}
                    date={article.date}
                    url={article.url}
                    id={article.id}
                    mainKeyword={article.mainKeyword}
                    isPickup={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* すべてのニュースをみるボタン */}
          <div className="mt-8 text-center">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              すべてのニュースをみる
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* スマホ用：サイト応援カード */}
          <div className="lg:hidden mt-8">
            <SupportCard />
          </div>

          {/* スマホ用：注目の関連書籍 */}
          <div className="lg:hidden mt-6">
            <FeaturedBooksBlock />
          </div>

          {/* コメントセクション */}
          <div className="mt-8">
            <CommentSection isDonorAuth={isDonorAuth} />
          </div>

          {/* 記事がない場合 */}
          {articles.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">まだ記事がありません。</p>
            </div>
          )}
        </div>

        {/* サイドバー（PC専用） */}
        <div className="hidden lg:block lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>

      {/* スマホ用：右端固定バー（コメントへの導線） */}
      <button
        onClick={scrollToComments}
        className="lg:hidden fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-sky-600 hover:bg-sky-700 text-white py-4 px-1.5 rounded-l-lg shadow-lg transition-colors"
        aria-label="読者のコメントをみる"
      >
        <span className="text-xs font-medium tracking-wider" style={{ writingMode: 'vertical-rl' }}>
          コメントをみる
        </span>
      </button>
    </div>
  );
}
